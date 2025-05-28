import { FastifyInstance } from 'fastify'
import { authController } from '../../controllers/authController'
import { authenticateToken } from '../../middleware/auth'

export default async function (fastify: FastifyInstance) {
  // Get current user (protected route)
  fastify.get('/api/auth/me', { preHandler: authenticateToken }, authController.getCurrentUser)

  // Logout (invalidate session)
  fastify.post('/api/auth/logout', { preHandler: authenticateToken }, authController.logout)

  // API endpoint for NextAuth to sync users with backend
  fastify.post('/api/auth/sync', authController.syncUser)

  // Refresh access token using refresh token
  fastify.post('/api/auth/refresh', authController.refreshToken)

  // Get user's active sessions
  fastify.get('/api/auth/sessions', { preHandler: authenticateToken }, authController.getUserSessions)

  // Terminate a specific session
  fastify.delete('/api/auth/sessions/:sessionId', { preHandler: authenticateToken }, authController.terminateSession)

  // Get user's activity logs
  fastify.get('/api/auth/activity', { preHandler: authenticateToken }, authController.getUserActivityLogs)

  // Test protected route
  fastify.get('/api/test-auth', { preHandler: authenticateToken }, authController.testAuth)
} 