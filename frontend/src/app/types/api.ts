export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  workspace?: {
    id: string;
    name: string;
    members: WorkspaceMember[];
  };
}

export interface WorkspaceMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    isActive: boolean;
    lastLogin: string;
    sessions?: UserSession[];
  };
}

export interface UserSession {
  id: string;
  updatedAt: string;
  expiresAt: string;
}

export interface ElementResponse {
  id: string;
  type: string;
  positionX: string | number;
  positionY: string | number;
  width: string | number;
  height: string | number;
  content: string;
  styleData: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    votes: number;
  };
  votes?: VoteResponse[];
}

export interface VoteResponse {
  id: string;
  userId: string;
  type: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
