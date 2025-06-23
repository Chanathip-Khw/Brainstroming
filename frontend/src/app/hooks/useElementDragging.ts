import { useState, useCallback } from 'react';
import type { CanvasElement } from './useElementData';

interface UseElementDraggingProps {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  selectedElement: string | null;
  scale: number;
  panX: number;
  panY: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  updateElement: (elementId: string, updateData: Partial<CanvasElement>) => Promise<void>;
  addElementToGroup: (elementId: string, groupId: string) => Promise<void>;
  removeElementFromGroup: (elementId: string) => Promise<void>;
  findGroupAtPoint: (x: number, y: number) => CanvasElement | undefined;
}

export const useElementDragging = ({
  elements,
  setElements,
  selectedElement,
  scale,
  panX,
  panY,
  canvasRef,
  updateElement,
  addElementToGroup,
  removeElementFromGroup,
  findGroupAtPoint,
}: UseElementDraggingProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isDragReady, setIsDragReady] = useState(false);

  // Handle element mouse down for dragging
  const handleElementMouseDown = useCallback((elementId: string, e: React.MouseEvent, tool: string) => {
    if (tool !== 'select') return;

    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    // Don't start dragging immediately, just prepare for potential drag
    setIsDragReady(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left - panX) / scale;
      const y = (e.clientY - rect.top - panY) / scale;

      setDragOffset({
        x: x - element.positionX,
        y: y - element.positionY,
      });
    }
  }, [elements, canvasRef, panX, panY, scale]);

  // Handle mouse move for dragging
  const handleMouseMoveForDragging = useCallback((e: React.MouseEvent, isPanning: boolean, isResizing: boolean) => {
    // Check if we should start dragging (user moved mouse while holding down)
    if (isDragReady && selectedElement && !isPanning && !isResizing) {
      const moveThreshold = 5; // pixels
      const deltaX = Math.abs(e.clientX - dragStartPos.x);
      const deltaY = Math.abs(e.clientY - dragStartPos.y);
      
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        setIsDragging(true);
        setIsDragReady(false);
      }
    }

    // Handle element dragging
    if (isDragging && selectedElement && !isPanning && !isResizing) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panX) / scale - dragOffset.x;
        const y = (e.clientY - rect.top - panY) / scale - dragOffset.y;

        setElements(prev =>
          prev.map(el =>
            el.id === selectedElement
              ? { ...el, positionX: x, positionY: y }
              : el
          )
        );
      }
    }
  }, [isDragging, isDragReady, selectedElement, canvasRef, panX, panY, scale, dragOffset, dragStartPos, setElements]);

  // Handle mouse up for ending drag
  const handleMouseUpForDragging = useCallback(() => {
    // Reset drag states immediately for responsive UI
    const wasDragging = isDragging;
    const draggedElementId = selectedElement;
    setIsDragging(false);
    setIsDragReady(false);

    // Handle backend updates asynchronously without blocking UI
    if (wasDragging && draggedElementId) {
      const element = elements.find(el => el.id === draggedElementId);
      if (element) {
        // Handle async operations in the background
        (async () => {
          try {
            if (element.type === 'STICKY_NOTE') {
              // Check if sticky note was dropped into a group
              const targetGroup = findGroupAtPoint(
                element.positionX,
                element.positionY
              );

              if (targetGroup && targetGroup.id !== element.styleData?.groupId) {
                // Add to new group
                console.log('Adding sticky note to group:', targetGroup.id);
                await addElementToGroup(draggedElementId, targetGroup.id);
              } else if (!targetGroup && element.styleData?.groupId) {
                // Remove from current group if dropped outside any group
                console.log('Removing sticky note from group');
                await removeElementFromGroup(draggedElementId);
              }
            }

            // Update backend with final position
            await updateElement(draggedElementId, {
              positionX: element.positionX,
              positionY: element.positionY,
            });
          } catch (error) {
            console.error('Error updating element after drag:', error);
          }
        })();
      }
    }
  }, [isDragging, selectedElement, elements, findGroupAtPoint, addElementToGroup, removeElementFromGroup, updateElement]);

  return {
    // State
    isDragging,
    dragOffset,
    isDragReady,
    
    // Setters
    setIsDragging,
    setDragOffset,
    setIsDragReady,
    
    // Event handlers
    handleElementMouseDown,
    handleMouseMoveForDragging,
    handleMouseUpForDragging,
  };
}; 