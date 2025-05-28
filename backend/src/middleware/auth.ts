import { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/authService'
import jwt from 'jsonwebtoken'
import { AuthenticatedRequest } from '../types'

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

    // Try to verify as a backend access token first
    try {
      try {
        // Try to verify as an access token
        const decoded = authService.verifyAccessToken(token)
        const user = await authService.getUserById(decoded.userId)

        if (!user) {
          return reply.code(401).send({ 
            error: 'User not found',
            message: 'The user associated with this token no longer exists'
          })
        }

        (request as AuthenticatedRequest).currentUser = {
          userId: user.id,
          email: user.email,
          name: user.name,
          tokenSource: 'backend'
        }
        
        return // Successfully authenticated with backend token
      } catch (accessTokenError) {
        // If access token verification fails, try NextAuth token
        // This is for backward compatibility
        const decoded = jwt.decode(token) as any
        
        if (!decoded || !decoded.email) {
          throw new Error('Invalid token format')
        }
        
        // Find user by email (from NextAuth token)
        const user = await authService.getUserByEmail(decoded.email)
        
        if (!user) {
          return reply.code(401).send({ 
            error: 'User not found',
            message: 'The user associated with this token does not exist in our system'
          })
        }
        
        (request as AuthenticatedRequest).currentUser = {
          userId: user.id,
          email: user.email,
          name: user.name,
          tokenSource: 'nextauth'
        }
        
        return // Successfully authenticated with NextAuth token
      }
    } catch (error) {
      // Token verification failed
      return reply.code(401).send({ 
        error: 'Invalid token',
        message: 'The provided token is invalid or expired',
        code: 'TOKEN_EXPIRED'
      })
    }
  } catch (error) {
    return reply.code(403).send({ 
      error: 'Authentication failed',
      message: 'Failed to process authentication request'
    })
  }
}

export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      // Try NextAuth token first
      try {
        const decoded = jwt.decode(token) as any
        
        if (decoded && decoded.email) {
          const user = await authService.getUserByEmail(decoded.email)
          
          if (user) {
            (request as AuthenticatedRequest).currentUser = {
              userId: user.id,
              email: user.email,
              name: user.name,
              tokenSource: 'nextauth'
            }
            return
          }
        }
      } catch (nextAuthError) {
        // Try backend token
        try {
          const decoded = authService.verifyToken(token)
          const user = await authService.getUserById(decoded.userId)
          
          if (user) {
            (request as AuthenticatedRequest).currentUser = {
              userId: user.id,
              email: user.email,
              name: user.name,
              tokenSource: 'backend'
            }
          }
        } catch (backendError) {
          // Optional auth - continue without user
        }
      }
    }
  } catch (error) {
    // Optional auth - continue without user
  }
}