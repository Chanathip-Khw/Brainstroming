import {
  MousePointer2,
  StickyNote,
  Type,
  Hand,
  Circle,
  Square,
  Triangle,
  Move,
  Vote,
  Group,
} from 'lucide-react';

// Canvas color palette
export const CANVAS_COLORS = [
  '#fbbf24', // yellow
  '#3b82f6', // blue
  '#10b981', // green
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#f97316', // orange
  '#ef4444', // red
  '#6b7280', // gray
];

// Available shapes for shape tool
export const CANVAS_SHAPES = [
  { id: 'circle', name: 'Circle' },
  { id: 'square', name: 'Square' },
  { id: 'triangle', name: 'Triangle' },
  { id: 'diamond', name: 'Diamond' },
  { id: 'hexagon', name: 'Hexagon' },
  { id: 'star', name: 'Star' },
];

// Canvas tools configuration
export const CANVAS_TOOLS = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'STICKY_NOTE', label: 'Sticky Note', icon: StickyNote },
  { id: 'TEXT', label: 'Text', icon: Type },
  { id: 'SHAPE', label: 'Shape', icon: Circle },
  { id: 'GROUP', label: 'Group', icon: Group },
  { id: 'move', label: 'Pan', icon: Hand },
  { id: 'vote', label: 'Vote', icon: Vote },
]; 