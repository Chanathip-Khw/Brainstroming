// Default dimensions for different element types
export const ELEMENT_DIMENSIONS = {
  STICKY_NOTE: { width: 150, height: 150 },
  TEXT: { width: 200, height: 30 },
  SHAPE: { width: 150, height: 150 },
  GROUP: { width: 300, height: 200 },
} as const;

// Default content for different element types
export const ELEMENT_DEFAULT_CONTENT = {
  STICKY_NOTE: '',
  TEXT: '',
  SHAPE: '',
  GROUP: 'Group Label',
} as const;

// Element types that can be created
export const CREATABLE_ELEMENT_TYPES = [
  'STICKY_NOTE',
  'TEXT', 
  'SHAPE',
  'GROUP'
] as const;

export type CreatableElementType = typeof CREATABLE_ELEMENT_TYPES[number]; 