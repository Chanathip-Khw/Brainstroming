export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  googleId?: string;
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

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
  votes: number;
  author: string;
}

export interface CanvasElement {
  id: string;
  type: 'sticky' | 'text' | 'shape' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  votes?: number;
  author: string;
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