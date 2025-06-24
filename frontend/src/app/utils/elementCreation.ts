import type { CanvasElement } from '../hooks/useElementData';
import { ELEMENT_DIMENSIONS, ELEMENT_DEFAULT_CONTENT, type CreatableElementType } from '../constants/elements';

/**
 * Create a new element with default properties based on type
 */
export const createNewElement = (
  type: CreatableElementType,
  x: number,
  y: number,
  selectedColor: string,
  selectedShape?: string
): Partial<CanvasElement> => {
  const dimensions = ELEMENT_DIMENSIONS[type];
  const content = ELEMENT_DEFAULT_CONTENT[type];

  return {
    type: type as 'STICKY_NOTE' | 'TEXT' | 'SHAPE' | 'GROUP',
    positionX: x,
    positionY: y,
    width: dimensions.width,
    height: dimensions.height,
    content,
    styleData: {
      color: selectedColor,
      ...(type === 'SHAPE' && selectedShape && { shapeType: selectedShape }),
    },
  };
}; 