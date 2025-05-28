import { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '../services/authService'
import { prisma } from '../config/database'
import { AuthenticatedRequest } from '../types'

export const authController = {
  // Get current user info
  getCurrentUser: async (request: AuthenticatedRequest, reply: FastifyReply) => {
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
  },

  // Logout user
  logout: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      // Mark all user sessions as inactive
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
  },

  // Sync user from NextAuth
  syncUser: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { googleId, email, name, picture } = request.body as any;
      
      if (!googleId || !email) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }
      
      // Use existing authService to create/update user
      const user = await authService.createOrUpdateGoogleUser({
        id: googleId,
        email,
        name,
        picture
      });
      
      // Log activity
      await authService.logActivity(user.id, 'AUTH_SYNC');
      
      return {
        success: true,
        userId: user.id,
        message: 'User synchronized successfully'
      };
    } catch (error) {
      console.error('Error syncing user:', error);
      return reply.code(500).send({ error: 'Failed to sync user' });
    }
  },

  // Test auth endpoint
  testAuth: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    return {
      message: 'Authentication working!',
      user: request.currentUser,
      timestamp: new Date().toISOString()
    }
  }
} 