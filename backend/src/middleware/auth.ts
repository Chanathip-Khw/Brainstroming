import { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/authService'

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: {
      userId: string
      email: string
      name: string
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
      name: user.name
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
      const decoded = authService.verifyToken(token)
      const user = await authService.getUserById(decoded.userId)
      
      if (user) {
        request.currentUser = {
          userId: user.id,
          email: user.email,
          name: user.name
        }
      }
    }
  } catch (error) {
    // Optional auth - continue without user
  }
}