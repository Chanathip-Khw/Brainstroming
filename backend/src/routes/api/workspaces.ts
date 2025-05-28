import { FastifyInstance } from 'fastify'
import { workspaceController } from '../../controllers/workspaceController'
import { authenticateToken } from '../../middleware/auth'

export default async function (fastify: FastifyInstance) {
  // Get user's workspaces
  fastify.get('/api/workspaces', { preHandler: authenticateToken }, workspaceController.getUserWorkspaces)

  // Create workspace
  fastify.post('/api/workspaces', { preHandler: authenticateToken }, workspaceController.createWorkspace)
} 