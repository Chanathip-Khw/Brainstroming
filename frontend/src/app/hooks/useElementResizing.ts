import { useState, useCallback } from 'react';
import type { CanvasElement } from './useElementData';
import { screenToCanvas } from '../utils/canvasUtils';

interface UseElementResizingProps {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  selectedElement: string | null;
  scale: number;
  panX: number;
  panY: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  updateElement: (
    elementId: string,
    updateData: Partial<CanvasElement>
  ) => Promise<void>;
}

export const useElementResizing = ({
  elements,
  setElements,
  selectedElement,
  scale,
  panX,
  panY,
  canvasRef,
  updateElement,
}: UseElementResizingProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Handle resize mouse down
  const handleResizeMouseDown = useCallback(
    (elementId: string, handle: string, e: React.MouseEvent, tool: string) => {
      if (tool !== 'select') return;

      e.stopPropagation();
      const element = elements.find(el => el.id === elementId);
      if (!element) return;

      setIsResizing(true);
      setResizeHandle(handle);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const { x, y } = screenToCanvas(
          e.clientX,
          e.clientY,
          rect,
          scale,
          panX,
          panY
        );

        setResizeStart({
          x,
          y,
          width: element.width,
          height: element.height,
        });
      }
    },
    [elements, canvasRef, panX, panY, scale]
  );

  // Handle mouse move for resizing
  const handleMouseMoveForResizing = useCallback(
    (e: React.MouseEvent, isPanning: boolean, isDragging: boolean) => {
      if (
        isResizing &&
        selectedElement &&
        resizeHandle &&
        !isPanning &&
        !isDragging
      ) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const { x: currentX, y: currentY } = screenToCanvas(
            e.clientX,
            e.clientY,
            rect,
            scale,
            panX,
            panY
          );

          const deltaX = currentX - resizeStart.x;
          const deltaY = currentY - resizeStart.y;

          let newWidth = resizeStart.width;
          let newHeight = resizeStart.height;
          let newX: number | undefined;
          let newY: number | undefined;

          const element = elements.find(el => el.id === selectedElement);
          if (!element) return;

          // Calculate the fixed anchor point based on resize handle
          // Elements are centered, so we need to calculate the absolute corners first
          const currentLeft = element.positionX - element.width / 2;
          const currentRight = element.positionX + element.width / 2;
          const currentTop = element.positionY - element.height / 2;
          const currentBottom = element.positionY + element.height / 2;

          let fixedLeft = currentLeft;
          let fixedRight = currentRight;
          let fixedTop = currentTop;
          let fixedBottom = currentBottom;

          // Determine which edges are fixed based on the resize handle
          switch (resizeHandle) {
            case 'se': // Southeast: fix NW corner (top-left)
              fixedLeft = currentLeft;
              fixedTop = currentTop;
              newWidth = Math.max(50, currentX - fixedLeft);
              newHeight = Math.max(30, currentY - fixedTop);
              break;
            case 'sw': // Southwest: fix NE corner (top-right)
              fixedRight = currentRight;
              fixedTop = currentTop;
              newWidth = Math.max(50, fixedRight - currentX);
              newHeight = Math.max(30, currentY - fixedTop);
              break;
            case 'ne': // Northeast: fix SW corner (bottom-left)
              fixedLeft = currentLeft;
              fixedBottom = currentBottom;
              newWidth = Math.max(50, currentX - fixedLeft);
              newHeight = Math.max(30, fixedBottom - currentY);
              break;
            case 'nw': // Northwest: fix SE corner (bottom-right)
              fixedRight = currentRight;
              fixedBottom = currentBottom;
              newWidth = Math.max(50, fixedRight - currentX);
              newHeight = Math.max(30, fixedBottom - currentY);
              break;
            case 'e': // East: fix left edge
              fixedLeft = currentLeft;
              newWidth = Math.max(50, currentX - fixedLeft);
              newHeight = element.height; // Keep height unchanged
              break;
            case 'w': // West: fix right edge
              fixedRight = currentRight;
              newWidth = Math.max(50, fixedRight - currentX);
              newHeight = element.height; // Keep height unchanged
              break;
            case 'n': // North: fix bottom edge
              fixedBottom = currentBottom;
              newWidth = element.width; // Keep width unchanged
              newHeight = Math.max(30, fixedBottom - currentY);
              break;
            case 's': // South: fix top edge
              fixedTop = currentTop;
              newWidth = element.width; // Keep width unchanged
              newHeight = Math.max(30, currentY - fixedTop);
              break;
          }

          // Calculate new center position based on fixed edges and new dimensions
          switch (resizeHandle) {
            case 'se': // Fixed top-left corner
              newX = fixedLeft + newWidth / 2;
              newY = fixedTop + newHeight / 2;
              break;
            case 'sw': // Fixed top-right corner
              newX = fixedRight - newWidth / 2;
              newY = fixedTop + newHeight / 2;
              break;
            case 'ne': // Fixed bottom-left corner
              newX = fixedLeft + newWidth / 2;
              newY = fixedBottom - newHeight / 2;
              break;
            case 'nw': // Fixed bottom-right corner
              newX = fixedRight - newWidth / 2;
              newY = fixedBottom - newHeight / 2;
              break;
            case 'e': // Fixed left edge
              newX = fixedLeft + newWidth / 2;
              newY = element.positionY; // Keep Y unchanged
              break;
            case 'w': // Fixed right edge
              newX = fixedRight - newWidth / 2;
              newY = element.positionY; // Keep Y unchanged
              break;
            case 'n': // Fixed bottom edge
              newX = element.positionX; // Keep X unchanged
              newY = fixedBottom - newHeight / 2;
              break;
            case 's': // Fixed top edge
              newX = element.positionX; // Keep X unchanged
              newY = fixedTop + newHeight / 2;
              break;
          }

          setElements(prev =>
            prev.map(el =>
              el.id === selectedElement
                ? {
                    ...el,
                    width: newWidth,
                    height: newHeight,
                    ...(newX !== undefined && { positionX: newX }),
                    ...(newY !== undefined && { positionY: newY }),
                  }
                : el
            )
          );
        }
      }
    },
    [
      isResizing,
      selectedElement,
      resizeHandle,
      canvasRef,
      panX,
      panY,
      scale,
      resizeStart,
      elements,
      setElements,
    ]
  );

  // Handle mouse up for ending resize
  const handleMouseUpForResizing = useCallback(() => {
    // Reset resize states immediately for responsive UI
    const wasResizing = isResizing;
    const resizedElementId = selectedElement;
    setIsResizing(false);
    setResizeHandle(null);

    // Handle backend updates asynchronously without blocking UI
    if (wasResizing && resizedElementId) {
      const element = elements.find(el => el.id === resizedElementId);
      if (element) {
        // Update backend with final size and position in background
        (async () => {
          try {
            await updateElement(resizedElementId, {
              width: element.width,
              height: element.height,
              positionX: element.positionX,
              positionY: element.positionY,
            });
          } catch (error) {
            console.error('Error updating element after resize:', error);
          }
        })();
      }
    }
  }, [isResizing, selectedElement, elements, updateElement]);

  // Get resize handles data for rendering
  const getResizeHandles = useCallback(
    (element: CanvasElement) => {
      if (selectedElement !== element.id) return [];

      // All elements get the same 8 resize handles
      const handles = [
        { id: 'nw', style: { top: '-4px', left: '-4px', cursor: 'nw-resize' } },
        {
          id: 'n',
          style: {
            top: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: 'n-resize',
          },
        },
        {
          id: 'ne',
          style: { top: '-4px', right: '-4px', cursor: 'ne-resize' },
        },
        {
          id: 'e',
          style: {
            top: '50%',
            right: '-4px',
            transform: 'translateY(-50%)',
            cursor: 'e-resize',
          },
        },
        {
          id: 'se',
          style: { bottom: '-4px', right: '-4px', cursor: 'se-resize' },
        },
        {
          id: 's',
          style: {
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: 's-resize',
          },
        },
        {
          id: 'sw',
          style: { bottom: '-4px', left: '-4px', cursor: 'sw-resize' },
        },
        {
          id: 'w',
          style: {
            top: '50%',
            left: '-4px',
            transform: 'translateY(-50%)',
            cursor: 'w-resize',
          },
        },
      ];

      return handles.map(handle => ({
        ...handle,
        onMouseDown: (e: React.MouseEvent) =>
          handleResizeMouseDown(element.id, handle.id, e, 'select'),
      }));
    },
    [selectedElement, handleResizeMouseDown]
  );

  return {
    // State
    isResizing,
    resizeHandle,
    resizeStart,

    // Setters
    setIsResizing,
    setResizeHandle,
    setResizeStart,

    // Event handlers
    handleResizeMouseDown,
    handleMouseMoveForResizing,
    handleMouseUpForResizing,

    // Utility functions
    getResizeHandles,
  };
};
