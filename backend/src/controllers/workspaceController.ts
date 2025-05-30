import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../config/database'
import { authService } from '../services/authService'
import { AuthenticatedRequest } from '../types'
import { randomBytes } from 'crypto'
import { WorkspaceInvite } from '@prisma/client'

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

  // Get single workspace with details
  getWorkspaceDetails: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }

      if (!id) {
        return reply.code(400).send({ error: 'Workspace ID is required' })
      }

      // Find workspace and check if user has access
      const workspace = await prisma.workspace.findFirst({
        where: {
          id,
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
          members: {
            where: {
              isActive: true
            },
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
          },
          projects: {
            where: {
              isActive: true
            },
            select: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      })

      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found or you do not have access' })
      }

      return { workspace }
    } catch (error) {
      console.error('Error fetching workspace details:', error)
      return reply.code(500).send({ error: 'Failed to fetch workspace details' })
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
  },

  // Update workspace
  updateWorkspace: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { name, description } = request.body as { name?: string, description?: string }

      if (!id) {
        return reply.code(400).send({ error: 'Workspace ID is required' })
      }

      // Check if workspace exists and user has permission
      const workspace = await prisma.workspace.findFirst({
        where: {
          id,
          OR: [
            { ownerId: request.currentUser!.userId },
            {
              members: {
                some: {
                  userId: request.currentUser!.userId,
                  role: { in: ['OWNER', 'ADMIN'] },
                  isActive: true
                }
              }
            }
          ],
          isActive: true
        }
      })

      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found or you do not have permission' })
      }

      // Update workspace
      const updatedWorkspace = await prisma.workspace.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description.trim() }),
          updatedAt: new Date()
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

      // Log activity
      await authService.logActivity(
        request.currentUser!.userId,
        'WORKSPACE_UPDATE',
        {
          workspaceId: id,
          workspaceName: updatedWorkspace.name,
          changes: {
            ...(name && { name }),
            ...(description !== undefined && { description })
          }
        },
        id
      )

      return { workspace: updatedWorkspace }
    } catch (error) {
      console.error('Error updating workspace:', error)
      return reply.code(500).send({ error: 'Failed to update workspace' })
    }
  },

  // Delete workspace (soft delete)
  deleteWorkspace: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }

      if (!id) {
        return reply.code(400).send({ error: 'Workspace ID is required' })
      }

      // Check if workspace exists and user is the owner
      const workspace = await prisma.workspace.findFirst({
        where: {
          id,
          ownerId: request.currentUser!.userId,
          isActive: true
        }
      })

      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found or you are not the owner' })
      }

      // Soft delete the workspace
      await prisma.workspace.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })

      // Log activity
      await authService.logActivity(
        request.currentUser!.userId,
        'WORKSPACE_DELETE',
        {
          workspaceId: id,
          workspaceName: workspace.name
        },
        id
      )

      return { success: true, message: 'Workspace deleted successfully' }
    } catch (error) {
      console.error('Error deleting workspace:', error)
      return reply.code(500).send({ error: 'Failed to delete workspace' })
    }
  },

  // Update workspace member role
  updateWorkspaceMember: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { workspaceId, memberId } = request.params as { workspaceId: string, memberId: string }
      const { role } = request.body as { role: 'ADMIN' | 'MEMBER' }

      if (!workspaceId || !memberId) {
        return reply.code(400).send({ error: 'Workspace ID and member ID are required' })
      }

      if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
        return reply.code(400).send({ error: 'Valid role is required (ADMIN or MEMBER)' })
      }

      // Check if workspace exists and user has permission
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          OR: [
            { ownerId: request.currentUser!.userId },
            {
              members: {
                some: {
                  userId: request.currentUser!.userId,
                  role: 'OWNER',
                  isActive: true
                }
              }
            }
          ],
          isActive: true
        }
      })

      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found or you do not have permission' })
      }

      // Get the member to update
      const member = await prisma.workspaceMember.findFirst({
        where: {
          id: memberId,
          workspaceId,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      if (!member) {
        return reply.code(404).send({ error: 'Member not found' })
      }

      // Cannot change role of workspace owner
      if (member.user.id === workspace.ownerId) {
        return reply.code(400).send({ error: 'Cannot change role of workspace owner' })
      }

      // Update member role
      const updatedMember = await prisma.workspaceMember.update({
        where: { id: memberId },
        data: {
          role,
          updatedAt: new Date()
        },
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
      })

      // Log activity
      await authService.logActivity(
        request.currentUser!.userId,
        'WORKSPACE_MEMBER_UPDATE',
        {
          workspaceId,
          workspaceName: workspace.name,
          memberId: member.user.id,
          memberName: member.user.name,
          memberEmail: member.user.email,
          role
        },
        workspaceId
      )

      return { member: updatedMember }
    } catch (error) {
      console.error('Error updating workspace member:', error)
      return reply.code(500).send({ error: 'Failed to update workspace member' })
    }
  },

  // Remove workspace member
  removeWorkspaceMember: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { workspaceId, memberId } = request.params as { workspaceId: string, memberId: string }

      if (!workspaceId || !memberId) {
        return reply.code(400).send({ error: 'Workspace ID and member ID are required' })
      }

      // Check if workspace exists and user has permission
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          OR: [
            { ownerId: request.currentUser!.userId },
            {
              members: {
                some: {
                  userId: request.currentUser!.userId,
                  role: { in: ['OWNER', 'ADMIN'] },
                  isActive: true
                }
              }
            }
          ],
          isActive: true
        }
      })

      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found or you do not have permission' })
      }

      // Get the member to remove
      const member = await prisma.workspaceMember.findFirst({
        where: {
          id: memberId,
          workspaceId,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      if (!member) {
        return reply.code(404).send({ error: 'Member not found' })
      }

      // Cannot remove workspace owner
      if (member.user.id === workspace.ownerId) {
        return reply.code(400).send({ error: 'Cannot remove workspace owner' })
      }

      // Check if admin is trying to remove another admin
      const requestUserMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: request.currentUser!.userId,
          isActive: true
        }
      })

      if (requestUserMember?.role === 'ADMIN' && member.role === 'ADMIN' && member.user.id !== request.currentUser!.userId) {
        return reply.code(403).send({ error: 'Admins cannot remove other admins' })
      }

      // Soft delete the member (set isActive to false)
      await prisma.workspaceMember.update({
        where: { id: memberId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })

      // Log activity
      await authService.logActivity(
        request.currentUser!.userId,
        'WORKSPACE_MEMBER_REMOVE',
        {
          workspaceId,
          workspaceName: workspace.name,
          memberId: member.user.id,
          memberName: member.user.name,
          memberEmail: member.user.email
        },
        workspaceId
      )

      return { success: true, message: 'Member removed successfully' }
    } catch (error) {
      console.error('Error removing workspace member:', error)
      return reply.code(500).send({ error: 'Failed to remove workspace member' })
    }
  },

  // Send workspace invites
  sendWorkspaceInvites: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { workspaceId, invites } = request.body as { 
        workspaceId: string, 
        invites: { email: string, role?: 'MEMBER' | 'ADMIN' }[] 
      }

      if (!workspaceId) {
        return reply.code(400).send({ error: 'Workspace ID is required' })
      }

      if (!invites || !Array.isArray(invites) || invites.length === 0) {
        return reply.code(400).send({ error: 'At least one invite is required' })
      }

      // Check if workspace exists and user has permission
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          OR: [
            { ownerId: request.currentUser!.userId },
            {
              members: {
                some: {
                  userId: request.currentUser!.userId,
                  role: { in: ['OWNER', 'ADMIN'] },
                  isActive: true
                }
              }
            }
          ],
          isActive: true
        }
      })

      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found or you do not have permission' })
      }

      // Create invites
      const createdInvites: WorkspaceInvite[] = []
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + 7) // 7 days expiration

      for (const invite of invites) {
        // Check if invite already exists and is pending
        const existingInvite = await prisma.workspaceInvite.findFirst({
          where: {
            workspaceId,
            email: invite.email,
            status: 'PENDING'
          }
        })

        if (existingInvite) {
          createdInvites.push(existingInvite)
          continue
        }

        // Create new invite
        const token = randomBytes(32).toString('hex')
        const newInvite = await prisma.workspaceInvite.create({
          data: {
            workspaceId,
            email: invite.email,
            role: invite.role || 'MEMBER',
            token,
            status: 'PENDING',
            invitedBy: request.currentUser!.userId,
            expiresAt: expirationDate
          }
        })

        createdInvites.push(newInvite)

        // TODO: Send email notification (would be implemented in a real app)
        console.log(`Invite sent to ${invite.email} with token ${token}`)
      }

      // Log activity
      await authService.logActivity(
        request.currentUser!.userId,
        'WORKSPACE_INVITE_SEND',
        {
          workspaceId,
          workspaceName: workspace.name,
          inviteCount: createdInvites.length
        },
        workspaceId
      )

      return { invites: createdInvites }
    } catch (error) {
      console.error('Error sending workspace invites:', error)
      return reply.code(500).send({ error: 'Failed to send workspace invites' })
    }
  },

  // Accept workspace invite
  acceptWorkspaceInvite: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { token } = request.body as { token: string }

      if (!token) {
        return reply.code(400).send({ error: 'Invite token is required' })
      }

      // Find the invite
      const invite = await prisma.workspaceInvite.findFirst({
        where: {
          token,
          status: 'PENDING',
          expiresAt: { gt: new Date() } // Not expired
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              ownerId: true
            }
          }
        }
      })

      if (!invite) {
        return reply.code(404).send({ error: 'Invite not found, expired, or already processed' })
      }

      // Check if the current user's email matches the invite email
      if (request.currentUser!.email !== invite.email) {
        return reply.code(403).send({ 
          error: 'This invite is for a different email address',
          inviteEmail: invite.email,
          userEmail: request.currentUser!.email
        })
      }

      // Check if user is already a member of the workspace
      const existingMembership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: invite.workspaceId,
          userId: request.currentUser!.userId
        }
      })

      if (existingMembership) {
        if (existingMembership.isActive) {
          // Update invite status to accepted
          await prisma.workspaceInvite.update({
            where: { id: invite.id },
            data: {
              status: 'ACCEPTED',
              acceptedAt: new Date()
            }
          })
          
          return reply.code(200).send({ 
            message: 'You are already a member of this workspace',
            workspace: invite.workspace
          })
        } else {
          // Reactivate the membership
          await prisma.workspaceMember.update({
            where: { id: existingMembership.id },
            data: { isActive: true }
          })
        }
      } else {
        // Add user as a member
        await prisma.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: request.currentUser!.userId,
            role: invite.role,
            isActive: true
          }
        })
      }

      // Update invite status to accepted
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      })

      // Log activity
      await authService.logActivity(
        request.currentUser!.userId,
        'WORKSPACE_JOIN',
        {
          workspaceId: invite.workspaceId,
          workspaceName: invite.workspace.name,
          role: invite.role
        },
        invite.workspaceId
      )

      return { 
        message: 'Workspace invite accepted successfully',
        workspace: invite.workspace
      }
    } catch (error) {
      console.error('Error accepting workspace invite:', error)
      return reply.code(500).send({ error: 'Failed to accept workspace invite' })
    }
  },
  
  // Get workspace invites by email
  getWorkspaceInvitesByEmail: async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const invites = await prisma.workspaceInvite.findMany({
        where: {
          email: request.currentUser!.email,
          status: 'PENDING',
          expiresAt: { gt: new Date() } // Not expired
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return { invites }
    } catch (error) {
      console.error('Error fetching workspace invites:', error)
      return reply.code(500).send({ error: 'Failed to fetch workspace invites' })
    }
  }
} 