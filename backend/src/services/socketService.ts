import { Server as SocketIOServer } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { AuthService } from './authService';

interface UserSocket {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  avatar: string;
  cursor?: {
    x: number;
    y: number;
  };
}

interface CollaborationEvent {
  type: 'element_created' | 'element_updated' | 'element_deleted' | 'cursor_moved' | 'vote_added' | 'vote_removed';
  data: any;
  userId: string;
  timestamp: number;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, UserSocket> = new Map();
  private projectRooms: Map<string, Set<string>> = new Map();
  private authService: AuthService;

  initialize(server: any) {
    this.authService = new AuthService();
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.io.use(async (socket, next) => {
      try {
        console.log('Socket authentication attempt:', socket.handshake.auth);
        const token = socket.handshake.auth.token;
        if (!token) {
          console.log('No token provided in socket auth');
          return next(new Error('Authentication error: No token provided'));
        }

        console.log('Token preview:', token.substring(0, 30) + '...');
        const decoded = this.authService.verifyAccessToken(token);
        console.log('Decoded token:', decoded);

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });

        if (!user) {
          console.log('User not found in database:', decoded.userId);
          return next(new Error('User not found'));
        }

        console.log('Socket authenticated for user:', user.name);
        socket.data.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: ' + error.message));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User ${socket.data.user.name} connected`);

      socket.on('join_project', (projectId: string) => {
        this.handleJoinProject(socket, projectId);
      });

      socket.on('leave_project', (projectId: string) => {
        this.handleLeaveProject(socket, projectId);
      });

      socket.on('cursor_move', (data) => {
        this.handleCursorMove(socket, data);
      });

      socket.on('element_created', (data) => {
        this.handleElementCreated(socket, data);
      });

      socket.on('element_updated', (data) => {
        this.handleElementUpdated(socket, data);
      });

      socket.on('element_deleted', (data) => {
        this.handleElementDeleted(socket, data);
      });

      socket.on('vote_added', (data) => {
        this.handleVoteAdded(socket, data);
      });

      socket.on('vote_removed', (data) => {
        this.handleVoteRemoved(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinProject(socket: any, projectId: string) {
    const userSocket: UserSocket = {
      id: socket.id,
      userId: socket.data.user.id,
      projectId,
      name: socket.data.user.name,
      avatar: socket.data.user.avatarUrl || ''
    };

    this.userSockets.set(socket.id, userSocket);
    socket.join(projectId);

    // Add to project room
    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set());
    }
    this.projectRooms.get(projectId)!.add(socket.id);

    // Notify others about new user
    socket.to(projectId).emit('user_joined', {
      userId: userSocket.userId,
      name: userSocket.name,
      avatar: userSocket.avatar
    });

    // Send current users to new user
    const projectUsers = this.getProjectUsers(projectId);
    socket.emit('project_users', projectUsers);

    console.log(`User ${userSocket.name} joined project ${projectId}`);
  }

  private handleLeaveProject(socket: any, projectId: string) {
    const userSocket = this.userSockets.get(socket.id);
    if (!userSocket) return;

    socket.leave(projectId);
    this.projectRooms.get(projectId)?.delete(socket.id);

    // Notify others about user leaving
    socket.to(projectId).emit('user_left', {
      userId: userSocket.userId
    });

    console.log(`User ${userSocket.name} left project ${projectId}`);
  }

  private handleCursorMove(socket: any, data: { x: number; y: number; projectId: string }) {
    const userSocket = this.userSockets.get(socket.id);
    if (!userSocket) return;

    userSocket.cursor = { x: data.x, y: data.y };
    
    socket.to(data.projectId).emit('cursor_moved', {
      userId: userSocket.userId,
      name: userSocket.name,
      cursor: userSocket.cursor
    });
  }

  private handleElementCreated(socket: any, data: any) {
    const userSocket = this.userSockets.get(socket.id);
    if (!userSocket) return;

    const event: CollaborationEvent = {
      type: 'element_created',
      data,
      userId: userSocket.userId,
      timestamp: Date.now()
    };

    socket.to(userSocket.projectId).emit('collaboration_event', event);
  }

  private handleElementUpdated(socket: any, data: any) {
    const userSocket = this.userSockets.get(socket.id);
    if (!userSocket) return;

    const event: CollaborationEvent = {
      type: 'element_updated',
      data,
      userId: userSocket.userId,
      timestamp: Date.now()
    };

    socket.to(userSocket.projectId).emit('collaboration_event', event);
  }

  private handleElementDeleted(socket: any, data: any) {
    const userSocket = this.userSockets.get(socket.id);
    if (!userSocket) return;

    const event: CollaborationEvent = {
      type: 'element_deleted',
      data,
      userId: userSocket.userId,
      timestamp: Date.now()
    };

    socket.to(userSocket.projectId).emit('collaboration_event', event);
  }

  private handleVoteAdded(socket: any, data: any) {
    const userSocket = this.userSockets.get(socket.id);
    if (!userSocket) return;

    const event: CollaborationEvent = {
      type: 'vote_added',
      data,
      userId: userSocket.userId,
      timestamp: Date.now()
    };

    socket.to(userSocket.projectId).emit('collaboration_event', event);
  }

  private handleVoteRemoved(socket: any, data: any) {
    const userSocket = this.userSockets.get(socket.id);
    if (!userSocket) return;

    const event: CollaborationEvent = {
      type: 'vote_removed',
      data,
      userId: userSocket.userId,
      timestamp: Date.now()
    };

    socket.to(userSocket.projectId).emit('collaboration_event', event);
  }

  private handleDisconnect(socket: any) {
    const userSocket = this.userSockets.get(socket.id);
    if (!userSocket) return;

    this.projectRooms.get(userSocket.projectId)?.delete(socket.id);
    this.userSockets.delete(socket.id);

    // Notify others about user leaving
    socket.to(userSocket.projectId).emit('user_left', {
      userId: userSocket.userId
    });

    console.log(`User ${userSocket.name} disconnected`);
  }

  private getProjectUsers(projectId: string): UserSocket[] {
    const socketIds = this.projectRooms.get(projectId) || new Set();
    return Array.from(socketIds)
      .map(socketId => this.userSockets.get(socketId))
      .filter(Boolean) as UserSocket[];
  }

  // Public method to emit events from HTTP endpoints
  public emitToProject(projectId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(projectId).emit(event, data);
    }
  }
}

export const socketService = new SocketService(); 