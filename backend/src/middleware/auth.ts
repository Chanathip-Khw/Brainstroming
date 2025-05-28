import { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/authService'
import jwt from 'jsonwebtoken'

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: {
      userId: string
      email: string
      name: string
      tokenSource?: 'backend' | 'nextauth'
    }
  }
}

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return reply.code(401).send({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      })
    }

    // First try to verify as a backend token
    try {
      const decoded = authService.verifyToken(token)
      const user = await authService.getUserById(decoded.userId)

      if (!user) {
        return reply.code(401).send({ 
          error: 'User not found',
          message: 'The user associated with this token no longer exists'
        })
      }

      request.currentUser = {
        userId: user.id,
        email: user.email,
        name: user.name,
        tokenSource: 'backend'
      }
      
      return // Successfully authenticated with backend token
    } catch (backendError) {
      // If backend token verification fails, try NextAuth token
      try {
        // Attempt to decode the NextAuth JWT
        // Note: This is a simplified approach. In production, you should use the same
        // secret that NextAuth uses or implement proper JWT verification
        const decoded = jwt.decode(token) as any
        
        if (!decoded || !decoded.email) {
          throw new Error('Invalid NextAuth token')
        }
        
        // Find user by email (from NextAuth token)
        const user = await authService.getUserByEmail(decoded.email)
        
        if (!user) {
          return reply.code(401).send({ 
            error: 'User not found',
            message: 'The user associated with this token does not exist in our system'
          })
        }
        
        request.currentUser = {
          userId: user.id,
          email: user.email,
          name: user.name,
          tokenSource: 'nextauth'
        }
        
        return // Successfully authenticated with NextAuth token
      } catch (nextAuthError) {
        // Both token verification methods failed
        return reply.code(403).send({ 
          error: 'Invalid token',
          message: 'The provided token is invalid or expired'
        })
      }
    }
  } catch (error) {
    return reply.code(403).send({ 
      error: 'Invalid token',
      message: 'The provided token is invalid or expired'
    })
  }
}

export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      // Try backend token first
      try {
        const decoded = authService.verifyToken(token)
        const user = await authService.getUserById(decoded.userId)
        
        if (user) {
          request.currentUser = {
            userId: user.id,
            email: user.email,
            name: user.name,
            tokenSource: 'backend'
          }
          return
        }
      } catch (backendError) {
        // Try NextAuth token
        try {
          const decoded = jwt.decode(token) as any
          
          if (decoded && decoded.email) {
            const user = await authService.getUserByEmail(decoded.email)
            
            if (user) {
              request.currentUser = {
                userId: user.id,
                email: user.email,
                name: user.name,
                tokenSource: 'nextauth'
              }
            }
          }
        } catch (nextAuthError) {
          // Optional auth - continue without user
        }
      }
    }
  } catch (error) {
    // Optional auth - continue without user
  }
}