import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AuthenticatedRequest } from '../types'
import { socketService } from '../services/socketService'

const prisma = new PrismaClient()

// Validation schema for creating a project
const createProjectSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  isTemplate: z.boolean().optional().default(false),
  templateType: z.string().optional()
})

export const projectController = {
  // Create a new project (board)
  async createProject(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        })
      }
      
      const userId = request.currentUser.userId
      const body = request.body as any
      
      // Validate request body
      const validation = createProjectSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          success: false,
          error: validation.error.format()
        })
      }
      
      const { workspaceId, name, description, isTemplate, templateType } = validation.data
      
      // Check if user is a member of the workspace
      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId,
          isActive: true
        }
      })
      
      if (!workspaceMember) {
        return reply.code(403).send({
          success: false,
          error: "You don't have permission to create a board in this workspace"
        })
      }
      
      // Create canvas data based on template type
      let canvasData = {}
      
      if (templateType) {
        switch (templateType) {
          case 'brainstorm':
            canvasData = {
              sections: [
                { id: 'ideas', title: 'Ideas', color: '#f0f9ff' },
                { id: 'actions', title: 'Action Items', color: '#ecfdf5' }
              ]
            }
            break
          case 'retrospective':
            canvasData = {
              sections: [
                { id: 'went-well', title: 'What Went Well', color: '#ecfdf5' },
                { id: 'improve', title: 'What Could Be Improved', color: '#fff1f2' },
                { id: 'actions', title: 'Action Items', color: '#f5f3ff' }
              ]
            }
            break
          case 'user-journey':
            canvasData = {
              sections: [
                { id: 'awareness', title: 'Awareness', color: '#f0f9ff' },
                { id: 'consideration', title: 'Consideration', color: '#f8fafc' },
                { id: 'decision', title: 'Decision', color: '#faf5ff' },
                { id: 'retention', title: 'Retention', color: '#ecfdf5' }
              ]
            }
            break
          default:
            canvasData = { sections: [] }
        }
      }
      
      // Create the project
      const project = await prisma.project.create({
        data: {
          workspaceId,
          name,
          description,
          isTemplate,
          canvasData,
          createdBy: userId
        }
      })
      
      // Log activity
      await prisma.activityLog.create({
        data: {
          workspaceId,
          userId,
          action: 'PROJECT_CREATE',
          entityType: 'PROJECT',
          entityId: project.id,
          metadata: {
            projectName: name,
            isTemplate
          }
        }
      })
      
      return reply.code(201).send({
        success: true,
        project
      })
    } catch (error) {
      console.error('Error creating project:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to create board'
      })
    }
  },
  
  // Get projects by workspace ID
  async getWorkspaceProjects(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        })
      }
      
      const userId = request.currentUser.userId
      const { workspaceId } = request.params as { workspaceId: string }
      
      // Check if user is a member of the workspace
      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId,
          isActive: true
        }
      })
      
      if (!workspaceMember) {
        return reply.code(403).send({
          success: false,
          error: "You don't have permission to view boards in this workspace"
        })
      }
      
      // Get all active projects for the workspace
      const projects = await prisma.project.findMany({
        where: {
          workspaceId,
          isActive: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })
      
      return reply.send({
        success: true,
        projects
      })
    } catch (error) {
      console.error('Error fetching workspace projects:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch boards'
      })
    }
  },
  
  // Update project (board)
  async updateProject(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }
      
      const userId = request.currentUser.userId;
      const { id } = request.params as { id: string };
      const body = request.body as any;
      
      // Find the project
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          workspace: {
            include: {
              members: {
                where: {
                  userId,
                  isActive: true
                }
              }
            }
          }
        }
      });
      
      if (!project) {
        return reply.code(404).send({
          success: false,
          error: "Board not found"
        });
      }
      
      // Check if user has permission to update the project
      const isMember = project.workspace.members.length > 0;
      
      if (!isMember) {
        return reply.code(403).send({
          success: false,
          error: "You don't have permission to update this board"
        });
      }
      
      // Update the project
      const updatedProject = await prisma.project.update({
        where: { id },
        data: {
          name: body.name !== undefined ? body.name : project.name,
          description: body.description !== undefined ? body.description : project.description,
          isTemplate: body.isTemplate !== undefined ? body.isTemplate : project.isTemplate,
          isPublic: body.isPublic !== undefined ? body.isPublic : project.isPublic
        }
      });
      
      // Log activity
      await prisma.activityLog.create({
        data: {
          workspaceId: project.workspaceId,
          userId,
          action: 'PROJECT_UPDATE',
          entityType: 'PROJECT',
          entityId: project.id,
          metadata: {
            projectName: updatedProject.name
          }
        }
      });
      
      return reply.send({
        success: true,
        project: updatedProject
      });
    } catch (error) {
      console.error('Error updating project:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update board'
      });
    }
  },
  
  // Delete project (board)
  async deleteProject(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }
      
      const userId = request.currentUser.userId;
      const { id } = request.params as { id: string };
      
      // Find the project
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          workspace: {
            include: {
              members: {
                where: {
                  userId,
                  isActive: true,
                  role: { in: ['OWNER', 'ADMIN'] } // Only owners and admins can delete
                }
              }
            }
          }
        }
      });
      
      if (!project) {
        return reply.code(404).send({
          success: false,
          error: "Board not found"
        });
      }
      
      // Check if user has permission to delete the project
      const hasPermission = project.workspace.members.length > 0;
      
      if (!hasPermission) {
        return reply.code(403).send({
          success: false,
          error: "You don't have permission to delete this board"
        });
      }
      
      // Store workspace ID for activity log
      const workspaceId = project.workspaceId;
      const projectName = project.name;
      
      // Delete the project
      await prisma.project.delete({
        where: { id }
      });
      
      // Log activity
      await prisma.activityLog.create({
        data: {
          workspaceId,
          userId,
          action: 'PROJECT_DELETE',
          entityType: 'PROJECT',
          entityId: id,
          metadata: {
            projectName
          }
        }
      });
      
      return reply.code(200).send({
        success: true,
        message: "Board deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete board'
      });
    }
  },

  // Get single project with canvas elements
  async getProject(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }

      const userId = request.currentUser.userId;
      const { id } = request.params as { id: string };

      // Find the project with workspace member check
      const project = await prisma.project.findFirst({
        where: {
          id,
          isActive: true,
          workspace: {
            members: {
              some: {
                userId,
                isActive: true
              }
            }
          }
        },
        include: {
          canvasElements: {
            orderBy: {
              createdAt: 'asc'
            }
          },
          workspace: {
            select: {
              id: true,
              name: true,
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
                      avatarUrl: true,
                      isActive: true,
                      lastLogin: true,
                      sessions: {
                        where: {
                          isActive: true,
                          expiresAt: { gt: new Date() }
                        },
                        select: {
                          id: true,
                          updatedAt: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!project) {
        return reply.code(404).send({
          success: false,
          error: "Board not found or you don't have access"
        });
      }

      return reply.send({
        success: true,
        project
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch board'
      });
    }
  },

  // Create canvas element
  async createElement(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }

      const userId = request.currentUser.userId;
      const { projectId } = request.params as { projectId: string };
      const { type, x, y, width, height, content, color, style } = request.body as any;

      // Verify user has access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          isActive: true,
          workspace: {
            members: {
              some: {
                userId,
                isActive: true
              }
            }
          }
        }
      });

      if (!project) {
        return reply.code(404).send({
          success: false,
          error: "Board not found or you don't have access"
        });
      }

      // Create the canvas element
      const element = await prisma.canvasElement.create({
        data: {
          projectId,
          type,
          positionX: x || 0,
          positionY: y || 0,
          width: width || 200,
          height: height || 100,
          content: content || '',
          styleData: { color: color || '#fbbf24', ...style },
          createdBy: userId
        }
      });

      // Update project's updatedAt timestamp
      await prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() }
      });

      // Emit real-time event
      socketService.emitToProject(projectId, 'collaboration_event', {
        type: 'element_created',
        data: element,
        userId,
        timestamp: Date.now()
      });

      return reply.code(201).send({
        success: true,
        element
      });
    } catch (error) {
      console.error('Error creating canvas element:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create element'
      });
    }
  },

  // Update canvas element
  async updateElement(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }

      const userId = request.currentUser.userId;
      const { projectId, elementId } = request.params as { projectId: string; elementId: string };
      const updateData = request.body as any;

      // Verify user has access and element exists
      const element = await prisma.canvasElement.findFirst({
        where: {
          id: elementId,
          projectId,
          project: {
            workspace: {
              members: {
                some: {
                  userId,
                  isActive: true
                }
              }
            }
          }
        }
      });

      if (!element) {
        return reply.code(404).send({
          success: false,
          error: "Element not found or you don't have access"
        });
      }

      // Update the element
      const updatedElement = await prisma.canvasElement.update({
        where: { id: elementId },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

      // Update project's updatedAt timestamp
      await prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() }
      });

      // Emit real-time event
      socketService.emitToProject(projectId, 'collaboration_event', {
        type: 'element_updated',
        data: updatedElement,
        userId,
        timestamp: Date.now()
      });

      return reply.send({
        success: true,
        element: updatedElement
      });
    } catch (error) {
      console.error('Error updating canvas element:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update element'
      });
    }
  },

  // Delete canvas element
  async deleteElement(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }

      const userId = request.currentUser.userId;
      const { projectId, elementId } = request.params as { projectId: string; elementId: string };

      // Verify user has access and element exists
      const element = await prisma.canvasElement.findFirst({
        where: {
          id: elementId,
          projectId,
          project: {
            workspace: {
              members: {
                some: {
                  userId,
                  isActive: true
                }
              }
            }
          }
        }
      });

      if (!element) {
        return reply.code(404).send({
          success: false,
          error: "Element not found or you don't have access"
        });
      }

      // Delete the element (this will cascade delete related votes)
      await prisma.canvasElement.delete({
        where: { id: elementId }
      });

      // Update project's updatedAt timestamp
      await prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() }
      });

      // Emit real-time event
      socketService.emitToProject(projectId, 'collaboration_event', {
        type: 'element_deleted',
        data: { id: elementId },
        userId,
        timestamp: Date.now()
      });

      return reply.send({
        success: true,
        message: "Element deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting canvas element:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete element'
      });
    }
  },

  // Get canvas elements with vote counts
  async getElements(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }

      const userId = request.currentUser.userId;
      const { projectId } = request.params as { projectId: string };

      // Verify user has access to the project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          isActive: true,
          workspace: {
            members: {
              some: {
                userId,
                isActive: true
              }
            }
          }
        }
      });

      if (!project) {
        return reply.code(404).send({
          success: false,
          error: "Project not found or you don't have access"
        });
      }

      // Get elements with vote counts
      const elements = await prisma.canvasElement.findMany({
        where: { projectId },
        include: {
          _count: {
            select: {
              votes: true
            }
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      return reply.send({
        success: true,
        elements
      });
    } catch (error) {
      console.error('Error fetching canvas elements:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch elements'
      });
    }
  },

  // Add vote to element
  async addVote(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }

      const userId = request.currentUser.userId;
      const { projectId, elementId } = request.params as { projectId: string; elementId: string };
      const { type = 'LIKE' } = request.body as { type?: string };

      // Verify user has access and element exists
      const element = await prisma.canvasElement.findFirst({
        where: {
          id: elementId,
          projectId,
          project: {
            workspace: {
              members: {
                some: {
                  userId,
                  isActive: true
                }
              }
            }
          }
        }
      });

      if (!element) {
        return reply.code(404).send({
          success: false,
          error: "Element not found or you don't have access"
        });
      }

      // Check if user already voted on this element
      const existingVote = await prisma.vote.findFirst({
        where: {
          elementId,
          userId
        }
      });

      if (existingVote) {
        return reply.code(400).send({
          success: false,
          error: "You have already voted on this element"
        });
      }

      // Create the vote
      const vote = await prisma.vote.create({
        data: {
          elementId,
          userId,
          type: type as any
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      });

      // Update project's updatedAt timestamp
      await prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() }
      });

      // Emit real-time event
      socketService.emitToProject(projectId, 'collaboration_event', {
        type: 'vote_added',
        data: { elementId, vote },
        userId,
        timestamp: Date.now()
      });

      return reply.code(201).send({
        success: true,
        vote
      });
    } catch (error) {
      console.error('Error adding vote:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to add vote'
      });
    }
  },

  // Remove vote from element
  async removeVote(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }

      const userId = request.currentUser.userId;
      const { projectId, elementId } = request.params as { projectId: string; elementId: string };

      // Verify user has access and element exists
      const element = await prisma.canvasElement.findFirst({
        where: {
          id: elementId,
          projectId,
          project: {
            workspace: {
              members: {
                some: {
                  userId,
                  isActive: true
                }
              }
            }
          }
        }
      });

      if (!element) {
        return reply.code(404).send({
          success: false,
          error: "Element not found or you don't have access"
        });
      }

      // Find and delete the vote
      const vote = await prisma.vote.findFirst({
        where: {
          elementId,
          userId
        }
      });

      if (!vote) {
        return reply.code(404).send({
          success: false,
          error: "Vote not found"
        });
      }

      await prisma.vote.delete({
        where: { id: vote.id }
      });

      // Update project's updatedAt timestamp
      await prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() }
      });

      // Emit real-time event
      socketService.emitToProject(projectId, 'collaboration_event', {
        type: 'vote_removed',
        data: { elementId, userId },
        userId,
        timestamp: Date.now()
      });

      return reply.send({
        success: true,
        message: "Vote removed successfully"
      });
    } catch (error) {
      console.error('Error removing vote:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to remove vote'
      });
    }
  },

  // Get votes for an element
  async getElementVotes(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      if (!request.currentUser) {
        return reply.code(401).send({
          success: false,
          error: "Authentication required"
        });
      }

      const userId = request.currentUser.userId;
      const { projectId, elementId } = request.params as { projectId: string; elementId: string };

      // Verify user has access and element exists
      const element = await prisma.canvasElement.findFirst({
        where: {
          id: elementId,
          projectId,
          project: {
            workspace: {
              members: {
                some: {
                  userId,
                  isActive: true
                }
              }
            }
          }
        }
      });

      if (!element) {
        return reply.code(404).send({
          success: false,
          error: "Element not found or you don't have access"
        });
      }

      // Get votes for the element
      const votes = await prisma.vote.findMany({
        where: { elementId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return reply.send({
        success: true,
        votes,
        totalVotes: votes.length,
        userVoted: votes.some(vote => vote.userId === userId)
      });
    } catch (error) {
      console.error('Error fetching element votes:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch votes'
      });
    }
  }
} 