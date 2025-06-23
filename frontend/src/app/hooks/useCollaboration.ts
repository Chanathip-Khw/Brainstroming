import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import io, { Socket } from 'socket.io-client';

interface CollaborationEvent {
  type:
    | 'element_created'
    | 'element_updated'
    | 'element_deleted'
    | 'vote_added'
    | 'vote_removed';
  data: any;
  userId: string;
  timestamp: number;
}

interface UserCursor {
  userId: string;
  name: string;
  cursor: {
    x: number;
    y: number;
  };
}

interface ProjectUser {
  id: string;
  userId: string;
  name: string;
  avatar: string;
}

interface UseCollaborationProps {
  projectId: string;
  onElementCreated?: (element: any) => void;
  onElementUpdated?: (element: any) => void;
  onElementDeleted?: (elementId: string) => void;
  onVoteAdded?: (elementId: string, vote: any) => void;
  onVoteRemoved?: (elementId: string, userId: string) => void;
}

export const useCollaboration = ({
  projectId,
  onElementCreated,
  onElementUpdated,
  onElementDeleted,
  onVoteAdded,
  onVoteRemoved,
}: UseCollaborationProps) => {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [userCursors, setUserCursors] = useState<Map<string, UserCursor>>(
    new Map()
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (!session?.accessToken || !projectId) {
      console.log('Missing requirements for socket connection:', {
        hasToken: !!session?.accessToken,
        hasProjectId: !!projectId,
      });
      return;
    }

    console.log(
      'Initializing socket connection with token:',
      session.accessToken?.substring(0, 20) + '...'
    );
    setIsConnecting(true);
    setConnectionError(null);

    const socket = io(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      {
        auth: {
          token: session.accessToken,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      }
    );

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);

      // Join the project room after a small delay to ensure connection is stable
      setTimeout(() => {
        if (socket.connected) {
          console.log('Joining project room:', projectId);
          socket.emit('join_project', projectId);
        }
      }, 100);
    });

    socket.on('connect_error', error => {
      console.error('Socket connection error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error);
      setConnectionError(`Failed to connect: ${error.message}`);
      setIsConnected(false);
      setIsConnecting(false);
    });

    socket.on('disconnect', reason => {
      console.log('Disconnected from collaboration server:', reason);
      setIsConnected(false);

      // Only set error if it's not a client-initiated disconnect
      if (reason !== 'io client disconnect') {
        setConnectionError(`Connection lost: ${reason}`);
      }
    });

    // Handle collaboration events
    socket.on('collaboration_event', (event: CollaborationEvent) => {
      console.log('Received collaboration event:', event);

      // Don't process events from current user
      if (event.userId === session.user?.id) return;

      switch (event.type) {
        case 'element_created':
          onElementCreated?.(event.data);
          break;
        case 'element_updated':
          onElementUpdated?.(event.data);
          break;
        case 'element_deleted':
          onElementDeleted?.(event.data.id);
          break;
        case 'vote_added':
          onVoteAdded?.(event.data.elementId, event.data.vote);
          break;
        case 'vote_removed':
          onVoteRemoved?.(event.data.elementId, event.data.userId);
          break;
      }
    });

    // Handle user presence
    socket.on(
      'user_joined',
      (user: { userId: string; name: string; avatar: string }) => {
        console.log('User joined:', user);
        setProjectUsers(prev => [
          ...prev.filter(u => u.userId !== user.userId),
          {
            id: user.userId,
            userId: user.userId,
            name: user.name,
            avatar: user.avatar,
          },
        ]);
      }
    );

    socket.on('user_left', (data: { userId: string }) => {
      console.log('User left:', data);
      setProjectUsers(prev => prev.filter(u => u.userId !== data.userId));
      setUserCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(data.userId);
        return newCursors;
      });
    });

    socket.on('project_users', (users: ProjectUser[]) => {
      console.log('Current project users:', users);
      setProjectUsers(users.filter(u => u.userId !== session.user?.id));
    });

    // Handle cursor movements
    socket.on('cursor_moved', (data: UserCursor) => {
      setUserCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(data.userId, data);
        return newCursors;
      });
    });

    return () => {
      console.log('Cleaning up socket connection');
      if (socket.connected) {
        socket.emit('leave_project', projectId);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.accessToken, projectId]);

  // Send cursor position
  const sendCursorPosition = useCallback(
    (x: number, y: number) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('cursor_move', { x, y, projectId });
      }
    },
    [isConnected, projectId]
  );

  // Emit element events
  const emitElementCreated = useCallback(
    (element: any) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('element_created', element);
      }
    },
    [isConnected]
  );

  const emitElementUpdated = useCallback(
    (element: any) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('element_updated', element);
      }
    },
    [isConnected]
  );

  const emitElementDeleted = useCallback(
    (elementId: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('element_deleted', { id: elementId });
      }
    },
    [isConnected]
  );

  const emitVoteAdded = useCallback(
    (elementId: string, vote: any) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('vote_added', { elementId, vote });
      }
    },
    [isConnected]
  );

  const emitVoteRemoved = useCallback(
    (elementId: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('vote_removed', { elementId });
      }
    },
    [isConnected]
  );

  return {
    isConnected,
    isConnecting,
    connectionError,
    projectUsers,
    userCursors: Array.from(userCursors.values()),
    sendCursorPosition,
    emitElementCreated,
    emitElementUpdated,
    emitElementDeleted,
    emitVoteAdded,
    emitVoteRemoved,
  };
};