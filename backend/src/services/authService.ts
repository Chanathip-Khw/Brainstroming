import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export interface GoogleUserData {
  id: string
  email: string
  name: string
  picture?: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string
  createdAt: Date
}

export class AuthService {
  private jwtSecret: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
  }

  // Create or update user from Google OAuth
  async createOrUpdateGoogleUser(googleUser: GoogleUserData): Promise<AuthUser> {
    try {
      const user = await prisma.user.upsert({
        where: { googleId: googleUser.id },
        update: {
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          lastLogin: new Date(),
          emailVerified: true
        },
        create: {
          googleId: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          emailVerified: true,
          isActive: true
        }
      })

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? undefined,
        createdAt: user.createdAt
      }
    } catch (error) {
      throw new Error(`Failed to create/update user: ${error}`)
    }
  }

  // Generate JWT token
  generateToken(user: AuthUser): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    )
  }

  // Verify JWT token
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret)
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true
        }
      })

      return user ? {
        ...user,
        avatarUrl: user.avatarUrl ?? undefined
      } : null
    } catch (error) {
      return null
    }
  }

  // Create user session
  async createSession(userId: string, token: string, userAgent?: string, ipAddress?: string) {
    try {
      await prisma.userSession.create({
        data: {
          userId,
          accessToken: token,
          userAgent,
          ipAddress,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          isActive: true
        }
      })
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  // Log activity
  async logActivity(userId: string, action: string, metadata?: any) {
    try {
      // Get user's default workspace or create one
      let workspace = await prisma.workspace.findFirst({
        where: { ownerId: userId }
      })

      if (!workspace) {
        workspace = await prisma.workspace.create({
          data: {
            name: `${await this.getUserById(userId).then(u => u?.name)}'s Workspace`,
            description: 'Default workspace',
            ownerId: userId,
            isActive: true
          }
        })

        // Add user as owner to workspace members
        await prisma.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId,
            role: 'OWNER',
            isActive: true
          }
        })
      }

      await prisma.activityLog.create({
        data: {
          workspaceId: workspace.id,
          userId,
          entityType: 'WORKSPACE',
          entityId: workspace.id,
          action: action as any,
          metadata
        }
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }
}

export const authService = new AuthService()