// Canvas constants
export const CANVAS_COLORS = [
  '#fbbf24', // amber-400
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#ef4444', // red-500
  '#6b7280', // gray-500
] as const;

export const CANVAS_SHAPES = [
  { id: 'circle', name: 'Circle' },
  { id: 'rectangle', name: 'Rectangle' },
  { id: 'triangle', name: 'Triangle' },
  { id: 'diamond', name: 'Diamond' },
  { id: 'star', name: 'Star' },
  { id: 'arrow', name: 'Arrow' },
] as const;

export const CANVAS_TOOLS = [
  { id: 'select', label: 'Select' },
  { id: 'STICKY_NOTE', label: 'Sticky Note' },
  { id: 'TEXT', label: 'Text' },
  { id: 'SHAPE', label: 'Shape' },
  { id: 'GROUP', label: 'Group' },
  { id: 'line', label: 'Line' },
  { id: 'move', label: 'Pan' },
  { id: 'vote', label: 'Vote' },
] as const;

// Canvas element types
export const ELEMENT_TYPES = {
  STICKY_NOTE: 'STICKY_NOTE',
  TEXT: 'TEXT',
  SHAPE: 'SHAPE',
  GROUP: 'GROUP',
  LINE: 'LINE',
} as const;

// Vote types
export const VOTE_TYPES = {
  LIKE: 'LIKE',
  DISLIKE: 'DISLIKE',
  STAR: 'STAR',
  PRIORITY_LOW: 'PRIORITY_LOW',
  PRIORITY_MEDIUM: 'PRIORITY_MEDIUM',
  PRIORITY_HIGH: 'PRIORITY_HIGH',
} as const;

// Default element dimensions
export const DEFAULT_ELEMENT_SIZE = {
  STICKY_NOTE: { width: 200, height: 200 },
  TEXT: { width: 200, height: 40 },
  SHAPE: { width: 100, height: 100 },
  GROUP: { width: 300, height: 300 },
  LINE: { width: 100, height: 2 },
} as const;

// Canvas interaction constants
export const CANVAS_ZOOM = {
  MIN: 0.1,
  MAX: 3,
  STEP: 0.1,
  DEFAULT: 1,
} as const;

// Animation durations (in ms)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Collaboration constants
export const COLLABORATION = {
  CURSOR_UPDATE_THROTTLE: 50, // ms
  RECONNECTION_ATTEMPTS: 3,
  RECONNECTION_DELAY: 1000, // ms
  PING_INTERVAL: 30000, // ms
} as const;

// API constants
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  PROJECTS: '/api/projects',
  WORKSPACES: '/api/workspaces',
  HEALTH: '/api/health',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Internal server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  ELEMENT_CREATED: 'Element created successfully',
  ELEMENT_UPDATED: 'Element updated successfully',
  ELEMENT_DELETED: 'Element deleted successfully',
  PROJECT_SAVED: 'Project saved successfully',
  VOTE_ADDED: 'Vote added successfully',
  VOTE_REMOVED: 'Vote removed successfully',
} as const;
