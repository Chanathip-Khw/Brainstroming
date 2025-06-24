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
export const constrainZoom = (
  scale: number,
  minScale = 0.1,
  maxScale = 3
): number => {
  return Math.min(Math.max(scale, minScale), maxScale);
};

/**
 * Calculate distance between two points
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

/**
 * Calculate the center point of a rectangle
 */
export const getRectCenter = (
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } => {
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
};

/**
 * Calculate the bounds of a rectangle (left, right, top, bottom)
 */
export const getRectBounds = (
  centerX: number,
  centerY: number,
  width: number,
  height: number
) => {
  return {
    left: centerX - width / 2,
    right: centerX + width / 2,
    top: centerY - height / 2,
    bottom: centerY + height / 2,
  };
};

/**
 * Clamp a value between minimum and maximum bounds
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
