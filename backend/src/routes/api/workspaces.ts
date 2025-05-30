import { FastifyInstance } from 'fastify'
import { workspaceController } from '../../controllers/workspaceController'
import { authenticateToken } from '../../middleware/auth'

export default async function (fastify: FastifyInstance) {
  // Get user's workspaces
  fastify.get('/api/workspaces', { preHandler: authenticateToken }, workspaceController.getUserWorkspaces)

  // Get single workspace with details
  fastify.get('/api/workspaces/:id', { preHandler: authenticateToken }, workspaceController.getWorkspaceDetails)

  // Create workspace
  fastify.post('/api/workspaces', { preHandler: authenticateToken }, workspaceController.createWorkspace)
  
  // Update workspace
  fastify.put('/api/workspaces/:id', { preHandler: authenticateToken }, workspaceController.updateWorkspace)
  
  // Delete workspace
  fastify.delete('/api/workspaces/:id', { preHandler: authenticateToken }, workspaceController.deleteWorkspace)
  
  // Update workspace member role
  fastify.put('/api/workspaces/:workspaceId/members/:memberId', { preHandler: authenticateToken }, workspaceController.updateWorkspaceMember)
  
  // Remove workspace member
  fastify.delete('/api/workspaces/:workspaceId/members/:memberId', { preHandler: authenticateToken }, workspaceController.removeWorkspaceMember)
  
  // Send workspace invites
  fastify.post('/api/workspaces/invites', { preHandler: authenticateToken }, workspaceController.sendWorkspaceInvites)
  
  // Get pending workspace invites for current user
  fastify.get('/api/workspaces/invites', { preHandler: authenticateToken }, workspaceController.getWorkspaceInvitesByEmail)
  
  // Accept workspace invite
  fastify.post('/api/workspaces/invites/accept', { preHandler: authenticateToken }, workspaceController.acceptWorkspaceInvite)
} 