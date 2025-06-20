import { PrismaClient } from '@prisma/client'
import { ActionType } from '@prisma/client'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

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

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export class AuthService {
  private jwtSecret: string
  private refreshSecret: string
  private accessTokenExpiry: string
  private refreshTokenExpiry: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    this.refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret'
    this.accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || '15m' // 15 minutes
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d' // 7 days
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
          emailVerified: true,
          isActive: true
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

  // Generate access token
  generateAccessToken(user: AuthUser): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        type: 'access'
      },
      this.jwtSecret,
      { expiresIn: this.accessTokenExpiry as any }
    )
  }
  
  // Generate refresh token
  generateRefreshToken(user: AuthUser): string {
    // Include a unique token ID to allow revocation
    const tokenId = crypto.randomBytes(16).toString('hex');
    
    return jwt.sign(
      {
        userId: user.id,
        tokenId,
        type: 'refresh'
      },
      this.refreshSecret,
      { expiresIn: this.refreshTokenExpiry as any }
    )
  }
  
  // Generate both access and refresh tokens
  generateTokenPair(user: AuthUser): TokenPair {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    // Calculate expiry time in seconds
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  // Verify access token
  verifyAccessToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Ensure it's an access token
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }
  
  // Verify refresh token
  verifyRefreshToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as any;
      
      // Ensure it's a refresh token
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
  
  // Backward compatibility for older code
  verifyToken(token: string): any {
    try {
      // Try as access token first
      return this.verifyAccessToken(token);
    } catch (error) {
      // Then try as refresh token
      try {
        return this.verifyRefreshToken(token);
      } catch (refreshError) {
        // If both fail, try legacy token format
        return jwt.verify(token, this.jwtSecret);
      }
    }
  }

  // Refresh tokens - exchange a valid refresh token for a new token pair
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify the refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Get the user
      const user = await this.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if the refresh token has been revoked
      const session = await prisma.userSession.findFirst({
        where: {
          userId: decoded.userId,
          refreshToken,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });
      
      if (!session) {
        throw new Error('Refresh token has been revoked or expired');
      }
      
      // Generate new token pair
      const tokenPair = this.generateTokenPair(user);
      
      // Update the session with the new refresh token
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      return tokenPair;
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error}`);
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

  // Get user by email
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true
        }
      });

      return user ? {
        ...user,
        avatarUrl: user.avatarUrl ?? undefined
      } : null;
    } catch (error) {
      return null;
    }
  }

  // Create user session with refresh token
  async createSession(userId: string, accessToken: string, refreshToken: string, userAgent?: string, ipAddress?: string) {
    try {
      // Invalidate any expired sessions for this user
      await prisma.userSession.updateMany({
        where: {
          userId,
          expiresAt: { lt: new Date() },
          isActive: true
        },
        data: { isActive: false }
      });
      
      // Get device information from user agent
      const deviceInfo = this.parseUserAgent(userAgent || '');
      
      // Update the user's lastLogin timestamp and ensure user is active
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lastLogin: new Date(),
          isActive: true // Ensure user is active when creating a session
        }
      });
      
      // Create new session
      const session = await prisma.userSession.create({
        data: {
          userId,
          accessToken,
          refreshToken,
          userAgent,
          ipAddress,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          isActive: true
        }
      });
      
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Failed to create user session');
    }
  }
  
  // Parse user agent to extract device information
  parseUserAgent(userAgent: string): { device: string; browser: string; os: string } {
    // Simple parsing logic - in production, consider using a library like ua-parser-js
    const lowerUA = userAgent.toLowerCase();
    
    // Detect browser
    let browser = 'Unknown';
    if (lowerUA.includes('firefox')) {
      browser = 'Firefox';
    } else if (lowerUA.includes('chrome') && !lowerUA.includes('edg')) {
      browser = 'Chrome';
    } else if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) {
      browser = 'Safari';
    } else if (lowerUA.includes('edg')) {
      browser = 'Edge';
    } else if (lowerUA.includes('opera') || lowerUA.includes('opr')) {
      browser = 'Opera';
    }
    
    // Detect OS
    let os = 'Unknown';
    if (lowerUA.includes('windows')) {
      os = 'Windows';
    } else if (lowerUA.includes('mac os')) {
      os = 'macOS';
    } else if (lowerUA.includes('android')) {
      os = 'Android';
    } else if (lowerUA.includes('ios') || lowerUA.includes('iphone') || lowerUA.includes('ipad')) {
      os = 'iOS';
    } else if (lowerUA.includes('linux')) {
      os = 'Linux';
    }
    
    // Detect device type
    let device = 'Desktop';
    if (lowerUA.includes('mobile') || lowerUA.includes('android') || lowerUA.includes('iphone')) {
      device = 'Mobile';
    } else if (lowerUA.includes('tablet') || lowerUA.includes('ipad')) {
      device = 'Tablet';
    }
    
    return { device, browser, os };
  }

  // Log activity
  async logActivity(userId: string, action: string, metadata?: any, workspaceId?: string) {
    try {     
      // Validate action is not empty
      if (!action || action.toString().trim() === '') {
        console.error('Cannot log activity: Empty action provided');
        return;
      }
      
      // Only log workspace-related actions when a workspaceId is provided
      if (workspaceId) {
        // Log the activity data for debugging
        console.log(`Logging activity: ${action} for user ${userId} in workspace ${workspaceId}`);
        
        // Debug log to see exactly what's being passed to Prisma
        const activityData = {
          workspaceId,
          userId,
          entityType: 'WORKSPACE',
          entityId: workspaceId,
          action: action.toString(), // Ensure it's a string
          metadata
        };
        console.log('Creating activity log with data:', JSON.stringify(activityData));
        
        // Create the activity log
        await prisma.activityLog.create({
          data: activityData
        });
        return;
      }
      
      // Skip activity logging when no workspace exists or for non-workspace actions
      console.log(`Activity logging skipped (no workspace or non-workspace action): ${action} for user ${userId}`);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}

export const authService = new AuthService()