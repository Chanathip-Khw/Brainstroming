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

  // Google OAuth callback
  fastify.get('/auth/google/callback', async (request, reply) => {
    try {
      const { token } = await reply.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)
      
      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` }
      })
      
      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google')
      }
      
      const googleUser = await userInfoResponse.json()
      
      // Create or update user in database
      const user = await authService.createOrUpdateGoogleUser({
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture
      })
      
      // Generate JWT token
      const jwtToken = authService.generateToken(user)
      
      // Create session
      const userAgent = request.headers['user-agent']
      const ipAddress = request.ip
      await authService.createSession(user.id, jwtToken, userAgent, ipAddress)
      
      // Log activity
      await authService.logActivity(user.id, 'USER_LOGIN', {
        method: 'google_oauth',
        userAgent,
        ipAddress
      })
      
      // Redirect to frontend with token
      const frontendUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`
      return reply.redirect(frontendUrl)
      
    } catch (error) {
      fastify.log.error('OAuth callback error:', error)
      const errorUrl = `${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`
      return reply.redirect(errorUrl)
    }
  })

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
    await registerPlugins()
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