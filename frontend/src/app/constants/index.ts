// Element types for canvas
export const ELEMENT_TYPES = {
  STICKY_NOTE: 'STICKY_NOTE',
  TEXT: 'TEXT',
  SHAPE: 'SHAPE',
  GROUP: 'GROUP'
} as const;

// Vote types for voting functionality
export const VOTE_TYPES = {
  UPVOTE: 'UPVOTE',
  DOWNVOTE: 'DOWNVOTE'
} as const;

// Error messages for API utilities
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
  SERVER_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation failed'
} as const;

// Canvas zoom settings
export const CANVAS_ZOOM = {
  MIN: 0.1,
  MAX: 3.0,
  STEP: 0.1,
  DEFAULT: 1.0
} as const;

// Default element size settings
export const DEFAULT_ELEMENT_SIZE = {
  STICKY_NOTE: { width: 200, height: 200 },
  TEXT: { width: 200, height: 50 },
  SHAPE: { width: 100, height: 100 },
  GROUP: { width: 200, height: 100 }
} as const; 