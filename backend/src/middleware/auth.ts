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

    // First try to verify as a NextAuth token
    try {
      // Attempt to decode the NextAuth JWT
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
      
      (request as AuthenticatedRequest).currentUser = {
        userId: user.id,
        email: user.email,
        name: user.name,
        tokenSource: 'nextauth'
      }
      
      return // Successfully authenticated with NextAuth token
    } catch (nextAuthError) {
      // If NextAuth token verification fails, try backend token
      try {
        const decoded = authService.verifyToken(token)
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
      } catch (backendError) {
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