import { FastifyInstance } from 'fastify'
import { projectController } from '../../controllers/projectController'
import { authenticateToken } from '../../middleware/auth'

export default async function (fastify: FastifyInstance) {
  // Create a new project (board)
  fastify.post('/api/projects', { preHandler: authenticateToken }, projectController.createProject)
  
  // Get single project details with canvas elements
  fastify.get('/api/projects/:id', { preHandler: authenticateToken }, projectController.getProject)
  
  // Update a project (board)
  fastify.put('/api/projects/:id', { preHandler: authenticateToken }, projectController.updateProject)
  
  // Delete a project (board)
  fastify.delete('/api/projects/:id', { preHandler: authenticateToken }, projectController.deleteProject)
  
  // Get projects for a workspace
  fastify.get('/api/workspaces/:workspaceId/projects', { preHandler: authenticateToken }, projectController.getWorkspaceProjects)
  
  // Canvas element operations
  fastify.post('/api/projects/:projectId/elements', { preHandler: authenticateToken }, projectController.createElement)
  fastify.put('/api/projects/:projectId/elements/:elementId', { preHandler: authenticateToken }, projectController.updateElement)
  fastify.delete('/api/projects/:projectId/elements/:elementId', { preHandler: authenticateToken }, projectController.deleteElement)
  fastify.get('/api/projects/:projectId/elements', { preHandler: authenticateToken }, projectController.getElements)
  
  // Voting operations
  fastify.post('/api/projects/:projectId/elements/:elementId/votes', { preHandler: authenticateToken }, projectController.addVote)
  fastify.delete('/api/projects/:projectId/elements/:elementId/votes', { preHandler: authenticateToken }, projectController.removeVote)
  fastify.get('/api/projects/:projectId/elements/:elementId/votes', { preHandler: authenticateToken }, projectController.getElementVotes)
} 