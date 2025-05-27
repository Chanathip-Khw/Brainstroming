import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import oauth2 from '@fastify/oauth2'
import { PrismaClient } from '@prisma/client'
import { authService } from './services/authService'
import { authenticateToken, optionalAuth } from './middleware/auth'
import 'dotenv/config'

declare module 'fastify' {
  interface FastifyReply {
    googleOAuth2: {
      generateAuthorizationUri: (request: any) => string
      getAccessTokenFromAuthorizationCodeFlow: (request: any) => Promise<{ token: any }>
    }
  }
  
  interface FastifyRequest {
    currentUser?: {
      userId: string
      email: string
      name: string
    }
  }

  interface FastifyInstance {
    googleOAuth2: {
      generateAuthorizationUri: (request: any) => string
      getAccessTokenFromAuthorizationCodeFlow: (request: any) => Promise<{ token: any }>
    }
  }
}

const prisma = new PrismaClient()
const fastify: FastifyInstance = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
})

async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret'
  })

  // Google OAuth
  await fastify.register(oauth2, {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!
      },
      auth: oauth2.GOOGLE_CONFIGURATION
    },
    startRedirectPath: '/auth/google',
    callbackUri: `${process.env.BASE_URL}/auth/google/callback`,
    scope: ['openid', 'email', 'profile']
  })
}

async function registerRoutes() {
  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      authentication: 'Google OAuth 2.0',
      database: 'AWS RDS MySQL'
    }
  })

  // ================================
  // AUTHENTICATION ROUTES
  // ================================

  // Create a separate instance for the callback route with its own OAuth2 plugin
  const callbackHandler = async (request, reply) => {
    try {
      console.log('=== OAUTH CALLBACK START ===')
      console.log('Request query:', request.query)
      
      // Use fastify.googleOAuth2 instead of reply.googleOAuth2
      const result = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)
      console.log('✅ Access token received')
      
      if (!result.token || !result.token.access_token) {
        throw new Error('No access token received from Google')
      }
      
      // Step 2: Get user info from Google
      console.log('Step 2: Fetching user info from Google...')
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${result.token.access_token}` }
      })
      
      console.log('Google API response status:', userInfoResponse.status)
      
      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text()
        console.error('Google API error response:', errorText)
        throw new Error(`Google API returned ${userInfoResponse.status}: ${errorText}`)
      }
      
      const googleUser = await userInfoResponse.json()
      console.log('✅ Google user data received:', {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: !!googleUser.picture
      })
      
      // Step 3: Test database connection
      console.log('Step 3: Testing database connection...')
      await prisma.$connect()
      console.log('✅ Database connected')
      
      // Step 4: Create/update user
      console.log('Step 4: Creating/updating user...')
      const user = await authService.createOrUpdateGoogleUser({
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture
      })
      console.log('✅ User created/updated:', {
        id: user.id,
        email: user.email,
        name: user.name
      })
      
      // Step 5: Generate JWT
      console.log('Step 5: Generating JWT token...')
      const jwtToken = authService.generateToken(user)
      console.log('✅ JWT token generated')
      
      console.log('=== OAUTH CALLBACK SUCCESS ===')
      
      // Return success page
      return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>🎉 Authentication Success</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .success { color: #16a34a; }
            .token-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            textarea { width: 100%; height: 100px; font-family: monospace; font-size: 12px; }
            pre { background: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>🎉 <span class="success">Authentication Successful!</span></h1>
          
          <h2>User Information:</h2>
          <pre>${JSON.stringify(user, null, 2)}</pre>
          
          <h2>JWT Token:</h2>
          <div class="token-box">
            <textarea readonly>${jwtToken}</textarea>
          </div>
          
          <h2>✅ Next Steps:</h2>
          <ul>
            <li>✅ User created in database</li>
            <li>✅ JWT token generated</li>
            <li>🔄 Check Prisma Studio: <a href="http://localhost:5555" target="_blank">http://localhost:5555</a></li>
            <li>🚀 Ready to build frontend!</li>
          </ul>
          
          <h3>Test API with this token:</h3>
          <code style="background: #f3f4f6; padding: 10px; display: block; margin: 10px 0;">
            curl -H "Authorization: Bearer ${jwtToken}" http://localhost:3001/api/auth/me
          </code>
        </body>
        </html>
      `)
      
    } catch (error) {
      console.error('=== OAUTH CALLBACK ERROR ===')
      console.error('Error type:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>❌ Authentication Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .error { color: #dc2626; }
            .error-box { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>❌ <span class="error">Authentication Error</span></h1>
          
          <div class="error-box">
            <h3>Error Details:</h3>
            <p><strong>Type:</strong> ${error.constructor.name}</p>
            <p><strong>Message:</strong> ${error.message}</p>
          </div>
          
          <h3>🔧 Check these things:</h3>
          <ul>
            <li>Google OAuth credentials in .env file</li>
            <li>Database connection (DATABASE_URL)</li>
            <li>Run: npx prisma generate</li>
            <li>Backend console logs</li>
          </ul>
        </body>
        </html>
      `)
    }
  }

  // Register the callback route
  fastify.get('/auth/google/callback', callbackHandler)

  // Get current user (protected route)
  fastify.get('/api/auth/me', { preHandler: authenticateToken }, async (request) => {
    const user = await authService.getUserById(request.currentUser!.userId)
    return {
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        avatarUrl: user!.avatarUrl,
        createdAt: user!.createdAt
      }
    }
  })

  // Logout
  fastify.post('/api/auth/logout', { preHandler: authenticateToken }, async (request) => {
    try {
      // Deactivate user sessions
      await prisma.userSession.updateMany({
        where: { userId: request.currentUser!.userId, isActive: true },
        data: { isActive: false }
      })
      
      // Log activity
      await authService.logActivity(request.currentUser!.userId, 'USER_LOGOUT')
      
      return { message: 'Logged out successfully' }
    } catch (error) {
      return { error: 'Logout failed' }
    }
  })

  // ================================
  // API ROUTES (Protected)
  // ================================

  // Get user's workspaces
  fastify.get('/api/workspaces', { preHandler: authenticateToken }, async (request) => {
    try {
      const workspaces = await prisma.workspace.findMany({
        where: {
          OR: [
            { ownerId: request.currentUser!.userId },
            { 
              members: { 
                some: { 
                  userId: request.currentUser!.userId, 
                  isActive: true 
                } 
              } 
            }
          ],
          isActive: true
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          },
          _count: {
            select: {
              members: true,
              projects: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      return { workspaces }
    } catch (error) {
      return { error: 'Failed to fetch workspaces' }
    }
  })

  // Create workspace
  fastify.post<{Body: {name: string, description?: string}}>('/api/workspaces', 
    { preHandler: authenticateToken }, 
    async (request, reply) => {
      try {
        const { name, description } = request.body

        if (!name || name.trim().length === 0) {
          return reply.code(400).send({ error: 'Workspace name is required' })
        }

        const workspace = await prisma.workspace.create({
          data: {
            name: name.trim(),
            description: description?.trim(),
            ownerId: request.currentUser!.userId,
            isActive: true
          },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        })

        // Add owner as member
        await prisma.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: request.currentUser!.userId,
            role: 'OWNER',
            isActive: true
          }
        })

        // Log activity
        await authService.logActivity(request.currentUser!.userId, 'WORKSPACE_CREATE', {
          workspaceId: workspace.id,
          workspaceName: workspace.name
        })

        return { workspace }
      } catch (error) {
        return reply.code(500).send({ error: 'Failed to create workspace' })
      }
    }
  )

  // Test protected route
  fastify.get('/api/test-auth', { preHandler: authenticateToken }, async (request) => {
    return {
      message: 'Authentication working!',
      user: request.currentUser,
      timestamp: new Date().toISOString()
    }
  })

  // Public routes (no auth required)
  fastify.get('/api/health', async () => {
    try {
      await prisma.$connect()
      const userCount = await prisma.user.count()
      
      return {
        status: 'OK',
        message: 'Backend API with authentication is running!',
        database: {
          status: 'connected',
          userCount
        },
        authentication: 'Google OAuth 2.0',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'ERROR',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, closing server...`)
  try {
    await prisma.$disconnect()
    await fastify.close()
    process.exit(0)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

// Start server
async function start() {
  try {
    // Register plugins first
    await registerPlugins()
    
    // Wait a moment to ensure plugins are fully registered
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Then register routes
    await registerRoutes()
    
    const port = parseInt(process.env.PORT || '3001')
    const host = '0.0.0.0'
    
    await fastify.listen({ port, host })
    
    console.log(`
🚀 Backend server with authentication running!
📍 URL: http://localhost:${port}
🏥 Health: http://localhost:${port}/health
🔐 Google OAuth: http://localhost:${port}/auth/google
🔒 Protected API: http://localhost:${port}/api/auth/me
🗄️ Database: AWS RDS MySQL
🌍 Environment: ${process.env.NODE_ENV || 'development'}
    `)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

start()