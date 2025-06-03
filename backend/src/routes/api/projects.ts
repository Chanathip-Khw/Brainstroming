import { FastifyInstance } from 'fastify'
import { projectController } from '../../controllers/projectController'
import { authenticateToken } from '../../middleware/auth'

export default async function (fastify: FastifyInstance) {
  // Create a new project (board)
  fastify.post('/api/projects', { preHandler: authenticateToken }, projectController.createProject)
  
  // Update a project (board)
  fastify.put('/api/projects/:id', { preHandler: authenticateToken }, projectController.updateProject)
  
  // Delete a project (board)
  fastify.delete('/api/projects/:id', { preHandler: authenticateToken }, projectController.deleteProject)
  
  // Get projects for a workspace
  fastify.get('/api/workspaces/:workspaceId/projects', { preHandler: authenticateToken }, projectController.getWorkspaceProjects)
} 