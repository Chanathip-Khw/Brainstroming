import { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/authService'
import jwt from 'jsonwebtoken'
import { AuthenticatedRequest } from '../types'
import { prisma } from '../config/database'

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
      // Try to verify as an access token
      const decoded = authService.verifyAccessToken(token)
      const user = await authService.getUserById(decoded.userId)

      if (!user) {
        return reply.code(401).send({ 
          error: 'User not found',
          message: 'The user associated with this token no longer exists'
        })
      }

      // Check if this token is associated with an active session
      const session = await prisma.userSession.findFirst({
        where: {
          userId: user.id,
          accessToken: token,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      if (!session) {
        return reply.code(401).send({
          error: 'Session expired',
          message: 'Your session has expired or been terminated',
          code: 'SESSION_EXPIRED'
        });
      }

      (request as AuthenticatedRequest).currentUser = {
        userId: user.id,
        email: user.email,
        name: user.name,
        tokenSource: 'backend',
        sessionId: session.id
      }
      
      return // Successfully authenticated with backend token
    } catch (accessTokenError) {
      console.log('Backend token verification failed:', accessTokenError.message);
      
      // If access token verification fails, try NextAuth token
      // This is for backward compatibility with NextAuth
      try {
        // Get NextAuth secret from environment
        const nextAuthSecret = process.env.NEXTAUTH_SECRET;
        if (!nextAuthSecret) {
          throw new Error('NEXTAUTH_SECRET not configured');
        }
        
        // Properly verify the NextAuth token, not just decode it
        const decoded = jwt.verify(token, nextAuthSecret) as any;
        
        if (!decoded || !decoded.email) {
          throw new Error('Invalid NextAuth token format');
        }
        
        // Find user by email (from NextAuth token)
        const user = await authService.getUserByEmail(decoded.email);
        
        if (!user) {
          return reply.code(401).send({ 
            error: 'User not found',
            message: 'The user associated with this token does not exist in our system'
          });
        }
        
        // Check if user has any active sessions
        const hasActiveSession = await prisma.userSession.findFirst({
          where: {
            userId: user.id,
            isActive: true,
            expiresAt: { gt: new Date() }
          }
        });
        
        if (!hasActiveSession) {
          return reply.code(401).send({
            error: 'No active session',
            message: 'You have no active sessions, please log in again',
            code: 'SESSION_EXPIRED'
          });
        }
        
        (request as AuthenticatedRequest).currentUser = {
          userId: user.id,
          email: user.email,
          name: user.name,
          tokenSource: 'nextauth'
        }
        
        return // Successfully authenticated with NextAuth token
      } catch (nextAuthError) {
        console.log('NextAuth token verification failed:', nextAuthError.message);
        // Token verification failed
        return reply.code(401).send({ 
          error: 'Invalid token',
          message: 'The provided token is invalid or expired',
          code: 'TOKEN_EXPIRED'
        });
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
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
        const nextAuthSecret = process.env.NEXTAUTH_SECRET;
        if (nextAuthSecret) {
          // Properly verify the NextAuth token
          const decoded = jwt.verify(token, nextAuthSecret) as any;
          
          if (decoded && decoded.email) {
            const user = await authService.getUserByEmail(decoded.email);
            
            if (user) {
              (request as AuthenticatedRequest).currentUser = {
                userId: user.id,
                email: user.email,
                name: user.name,
                tokenSource: 'nextauth'
              }
              return;
            }
          }
        }
      } catch (nextAuthError) {
        // Try backend token
        try {
          const decoded = authService.verifyToken(token);
          const user = await authService.getUserById(decoded.userId);
          
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