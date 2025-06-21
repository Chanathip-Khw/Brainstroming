import { ELEMENT_TYPES, VOTE_TYPES } from '../constants';

export type ElementType = keyof typeof ELEMENT_TYPES;
export type VoteType = keyof typeof VOTE_TYPES;

export interface CanvasElement {
  id: string;
  type: ElementType;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  content: string;
  styleData: {
    color: string;
    shapeType?: string;
    groupId?: string;
    [key: string]: unknown;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    votes: number;
  };
  votes?: CanvasElementVote[];
}

export interface CanvasElementVote {
  id: string;
  userId: string;
  type: VoteType;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedElement: string | null;
  editingElement: string | null;
  tool: string;
  selectedColor: string;
  scale: number;
  panX: number;
  panY: number;
  isVoting: boolean;
  loading: boolean;
}

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasTransform {
  scale: number;
  panX: number;
  panY: number;
}

export interface DragState {
  isDragging: boolean;
  dragOffset: CanvasPosition;
  panStart: CanvasPosition;
}

export interface ResizeState {
  isResizing: boolean;
  resizeHandle: string | null;
  resizeStart: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CanvasInteractionState {
  selectedElement: string | null;
  editingElement: string | null;
  editingText: string;
  dragState: DragState;
  resizeState: ResizeState;
  isPanning: boolean;
}

export interface CanvasEventHandlers {
  onElementClick: (elementId: string, event: React.MouseEvent) => void;
  onElementDoubleClick: (elementId: string, event: React.MouseEvent) => void;
  onElementMouseDown: (elementId: string, event: React.MouseEvent) => void;
  onCanvasClick: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onWheel: (event: React.WheelEvent) => void;
}
