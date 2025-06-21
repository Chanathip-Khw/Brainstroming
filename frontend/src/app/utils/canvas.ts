import { CANVAS_ZOOM, DEFAULT_ELEMENT_SIZE, ELEMENT_TYPES } from '../constants';

/**
 * Clamps a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Clamps zoom level within allowed bounds
 */
export const clampZoom = (zoom: number): number => {
  return clamp(zoom, CANVAS_ZOOM.MIN, CANVAS_ZOOM.MAX);
};

/**
 * Converts screen coordinates to canvas coordinates
 */
export const screenToCanvas = (
  screenX: number,
  screenY: number,
  panX: number,
  panY: number,
  scale: number
): { x: number; y: number } => {
  return {
    x: (screenX - panX) / scale,
    y: (screenY - panY) / scale,
  };
};

/**
 * Converts canvas coordinates to screen coordinates
 */
export const canvasToScreen = (
  canvasX: number,
  canvasY: number,
  panX: number,
  panY: number,
  scale: number
): { x: number; y: number } => {
  return {
    x: canvasX * scale + panX,
    y: canvasY * scale + panY,
  };
};

/**
 * Checks if a point is within a rectangle
 */
export const isPointInRect = (
  pointX: number,
  pointY: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean => {
  return (
    pointX >= rectX &&
    pointX <= rectX + rectWidth &&
    pointY >= rectY &&
    pointY <= rectY + rectHeight
  );
};

/**
 * Gets default size for element type
 */
export const getDefaultElementSize = (
  elementType: keyof typeof ELEMENT_TYPES
): { width: number; height: number } => {
  return DEFAULT_ELEMENT_SIZE[elementType] || DEFAULT_ELEMENT_SIZE.STICKY_NOTE;
};

/**
 * Calculates distance between two points
 */
export const getDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Generates a unique ID for elements
 */
export const generateElementId = (): string => {
  return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Snaps value to grid
 */
export const snapToGrid = (value: number, gridSize: number = 10): number => {
  return Math.round(value / gridSize) * gridSize;
};

/**
 * Gets the bounding box of multiple elements
 */
export const getBoundingBox = (
  elements: Array<{
    positionX: number;
    positionY: number;
    width: number;
    height: number;
  }>
): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null => {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(element => {
    minX = Math.min(minX, element.positionX);
    minY = Math.min(minY, element.positionY);
    maxX = Math.max(maxX, element.positionX + element.width);
    maxY = Math.max(maxY, element.positionY + element.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/**
 * Checks if two rectangles overlap
 */
export const doRectsOverlap = (
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean => {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
};
