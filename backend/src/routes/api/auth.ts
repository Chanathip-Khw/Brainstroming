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

  // Test protected route
  fastify.get('/api/test-auth', { preHandler: authenticateToken }, authController.testAuth)
} 