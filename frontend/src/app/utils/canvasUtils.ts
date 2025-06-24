/**
 * Convert screen coordinates to canvas coordinates
 */
export const screenToCanvas = (
  screenX: number, 
  screenY: number, 
  canvasRect: DOMRect, 
  scale: number, 
  panX: number, 
  panY: number
): { x: number; y: number } => {
  const x = (screenX - canvasRect.left - panX) / scale;
  const y = (screenY - canvasRect.top - panY) / scale;
  return { x, y };
};

/**
 * Convert canvas coordinates to screen coordinates
 */
export const canvasToScreen = (
  canvasX: number, 
  canvasY: number, 
  scale: number, 
  panX: number, 
  panY: number
): { x: number; y: number } => {
  const x = canvasX * scale + panX;
  const y = canvasY * scale + panY;
  return { x, y };
};

/**
 * Constrain zoom level within reasonable bounds
 */
export const constrainZoom = (scale: number, minScale = 0.1, maxScale = 3): number => {
  return Math.min(Math.max(scale, minScale), maxScale);
};

/**
 * Calculate distance between two points
 */
export const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Check if a point is within a rectangular boundary
 */
export const isPointInBounds = (
  pointX: number, 
  pointY: number, 
  rectX: number, 
  rectY: number, 
  rectWidth: number, 
  rectHeight: number
): boolean => {
  const left = rectX - rectWidth / 2;
  const right = rectX + rectWidth / 2;
  const top = rectY - rectHeight / 2;
  const bottom = rectY + rectHeight / 2;
  
  return pointX >= left && pointX <= right && pointY >= top && pointY <= bottom;
}; 