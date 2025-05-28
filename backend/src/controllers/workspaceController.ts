import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../config/database'
import { authService } from '../services/authService'
import { AuthenticatedRequest } from '../types'

export const workspaceController = {
  // Get user's workspaces
  getUserWorkspaces: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const workspaces = await prisma.workspace.findMany({
        where: {
          OR: [
            { ownerId: request.currentUser!.userId },
            { 
              members: { 
                some: { 
                  userId: request.currentUser!.userId, 
                  isActive: true 
                } 
              } 
            }
          ],
          isActive: true
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          },
          _count: {
            select: {
              members: true,
              projects: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      return { workspaces }
    } catch (error) {
      return { error: 'Failed to fetch workspaces' }
    }
  },

  // Create a new workspace
  createWorkspace: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { name, description } = request.body as any

      if (!name || name.trim().length === 0) {
        return reply.code(400).send({ error: 'Workspace name is required' })
      }

      // Create the workspace
      const workspace = await prisma.workspace.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          ownerId: request.currentUser!.userId,
          isActive: true
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      })

      // Add owner as member
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: request.currentUser!.userId,
          role: 'OWNER',
          isActive: true
        }
      })

      // Log activity with the new workspace ID
      await authService.logActivity(
        request.currentUser!.userId, 
        'WORKSPACE_CREATE', 
        {
          workspaceId: workspace.id,
          workspaceName: workspace.name
        },
        workspace.id // Pass the workspace ID explicitly
      )

      return { workspace }
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to create workspace' })
    }
  }
} 