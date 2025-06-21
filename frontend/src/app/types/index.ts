// Re-export all types
export * from './api';
export * from './canvas';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  googleId?: string;
  backendId?: string;
}

export interface Team {
  id: string;
  name: string;
  members: User[];
  memberCount?: number;
  boards: Board[];
}

export interface Board {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
}

export interface Vote {
  id: string;
  elementId: string;
  userId: string;
  type:
    | 'LIKE'
    | 'DISLIKE'
    | 'STAR'
    | 'PRIORITY_LOW'
    | 'PRIORITY_MEDIUM'
    | 'PRIORITY_HIGH';
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
  votes: number;
  author: string;
  voteData?: {
    totalVotes: number;
    userVoted: boolean;
    votes: Vote[];
  };
}

export interface BoardSettings {
  boardName: string;
  isPublic: boolean;
  allowComments: boolean;
  allowVoting: boolean;
  allowExport: boolean;
  inviteLink: string;
  members: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
  }[];
}
