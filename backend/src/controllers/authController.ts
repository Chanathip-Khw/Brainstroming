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
      // Get the current session token
      const authHeader = request.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
      
      if (!token) {
        return reply.code(400).send({ error: 'No active session found' });
      }
      
      // Find the specific session to log out
      const session = await prisma.userSession.findFirst({
        where: { 
          userId: request.currentUser!.userId,
          accessToken: token,
          isActive: true
        }
      });
      
      if (session) {
        // Mark only this specific session as inactive
        await prisma.userSession.update({
          where: { id: session.id },
          data: { isActive: false }
        });
        
        // Log logout activity with session details
        await authService.logActivity(request.currentUser!.userId, 'USER_LOGOUT', {
          sessionId: session.id,
          logoutTime: new Date().toISOString(),
          sessionDuration: session.createdAt 
            ? Math.floor((Date.now() - session.createdAt.getTime()) / 1000) // Duration in seconds
            : null
        });
      } else {
        // If specific session not found, log out all sessions (fallback)
        await prisma.userSession.updateMany({
          where: { userId: request.currentUser!.userId, isActive: true },
          data: { isActive: false }
        });
        
        // Log a general logout
        await authService.logActivity(request.currentUser!.userId, 'USER_LOGOUT_ALL', {
          logoutTime: new Date().toISOString(),
          reason: 'Session not found, all sessions terminated'
        });
      }
      
      return { message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      return reply.code(500).send({ error: 'Logout failed' });
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
      
      // Generate token pair for the user
      const tokenPair = authService.generateTokenPair(user);
      
      // Get client information
      const userAgent = request.headers['user-agent'] || '';
      const ipAddress = request.ip || request.socket.remoteAddress || '';
      
      // Create a new session
      const session = await authService.createSession(
        user.id, 
        tokenPair.accessToken,
        tokenPair.refreshToken,
        userAgent as string, 
        ipAddress as string
      );
      
      // Return session information
      return {
        success: true,
        userId: user.id,
        message: 'User synchronized successfully',
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        session: {
          id: session.id,
          expiresAt: session.expiresAt
        }
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
  },

  // Get user's active sessions
  getUserSessions: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const sessions = await prisma.userSession.findMany({
        where: {
          userId: request.currentUser!.userId,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true,
          // Don't include tokens for security reasons
        }
      });
      
      // Enhance session data with device information
      const enhancedSessions = sessions.map(session => {
        const deviceInfo = authService.parseUserAgent(session.userAgent || '');
        const isCurrent = request.headers.authorization?.includes(session.id);
        
        return {
          ...session,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          isCurrent
        };
      });
      
      return { sessions: enhancedSessions };
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return reply.code(500).send({ error: 'Failed to fetch user sessions' });
    }
  },
  
  // Terminate a specific session
  terminateSession: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      
      // Check if session exists and belongs to user
      const session = await prisma.userSession.findFirst({
        where: {
          id: sessionId,
          userId: request.currentUser!.userId
        }
      });
      
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      
      // Terminate the session
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isActive: false }
      });
      
      // Log session termination
      await authService.logActivity(request.currentUser!.userId, 'SESSION_TERMINATED', {
        sessionId,
        terminationTime: new Date().toISOString()
      });
      
      return { success: true, message: 'Session terminated successfully' };
    } catch (error) {
      console.error('Error terminating session:', error);
      return reply.code(500).send({ error: 'Failed to terminate session' });
    }
  },

  // Get user's activity logs
  getUserActivityLogs: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { limit = 20, page = 1, type } = request.query as any;
      
      // Build the query
      const where: any = { userId: request.currentUser!.userId };
      
      // Filter by activity type if provided
      if (type) {
        where.action = type;
      }
      
      // Get total count for pagination
      const totalCount = await prisma.activityLog.count({ where });
      
      // Get paginated activity logs
      const activityLogs = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      });
      
      // Format the activity logs for display
      const formattedLogs = activityLogs.map(log => {
        return {
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          timestamp: log.createdAt,
          metadata: log.metadata,
          user: {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            avatarUrl: log.user.avatarUrl
          }
        };
      });
      
      return { 
        logs: formattedLogs,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return reply.code(500).send({ error: 'Failed to fetch activity logs' });
    }
  },

  // Refresh access token using refresh token
  refreshToken: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };
      
      if (!refreshToken) {
        return reply.code(400).send({ error: 'Refresh token is required' });
      }
      
      // Get client information for logging
      const userAgent = request.headers['user-agent'] || '';
      const ipAddress = request.ip || request.socket.remoteAddress || '';
      
      // Attempt to refresh tokens
      const tokenPair = await authService.refreshTokens(refreshToken);
      
      return {
        success: true,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      // Determine the appropriate error response
      if (error.message.includes('revoked') || error.message.includes('expired')) {
        return reply.code(401).send({ error: 'Invalid refresh token', message: 'Please log in again' });
      }
      
      return reply.code(500).send({ error: 'Failed to refresh token' });
    }
  },
} 