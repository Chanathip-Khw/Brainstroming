import { useCallback } from 'react';
import { fetchApi } from '../lib/api';
import type { CanvasElement } from './useElementData';

interface UseElementCRUDProps {
  projectId: string;
  userId: string;
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  collaboration: any;
}

export const useElementCRUD = ({
  projectId,
  userId,
  elements,
  setElements,
  collaboration,
}: UseElementCRUDProps) => {
  // Create element with optimistic updates
  const createElement = useCallback(
    async (elementData: Partial<CanvasElement>) => {
      if (!projectId) return;

      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      // Create optimistic element (show immediately)
      const optimisticElement: CanvasElement = {
        id: tempId,
        type: elementData.type!,
        positionX: elementData.positionX!,
        positionY: elementData.positionY!,
        width: elementData.width!,
        height: elementData.height!,
        content: elementData.content || '',
        styleData: elementData.styleData!,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to UI immediately (optimistic update)
      setElements(prev => [...prev, optimisticElement]);

      try {
        // Send to backend in background
        const data = await fetchApi(`/api/projects/${projectId}/elements`, {
          method: 'POST',
          body: JSON.stringify({
            type: elementData.type,
            x: elementData.positionX,
            y: elementData.positionY,
            width: elementData.width,
            height: elementData.height,
            content: elementData.content,
            color: elementData.styleData?.color,
            style: elementData.styleData,
          }),
        });

        if (data.success) {
          // Replace optimistic element with real element from backend
          const processedElement = {
            ...data.element,
            positionX:
              typeof data.element.positionX === 'string'
                ? parseFloat(data.element.positionX)
                : Number(data.element.positionX),
            positionY:
              typeof data.element.positionY === 'string'
                ? parseFloat(data.element.positionY)
                : Number(data.element.positionY),
            width:
              typeof data.element.width === 'string'
                ? parseFloat(data.element.width)
                : Number(data.element.width),
            height:
              typeof data.element.height === 'string'
                ? parseFloat(data.element.height)
                : Number(data.element.height),
          };

          setElements(prev =>
            prev.map(el => (el.id === tempId ? processedElement : el))
          );

          // Emit real-time event
          collaboration.emitElementCreated(processedElement);
        } else {
          console.error('Failed to create element:', data.error);
          // Remove optimistic element on failure
          setElements(prev => prev.filter(el => el.id !== tempId));
        }
      } catch (error) {
        console.error('Error creating element:', error);
        // Remove optimistic element on error
        setElements(prev => prev.filter(el => el.id !== tempId));
      }
    },
    [projectId, userId, setElements, collaboration]
  );

  // Update element with optimistic updates
  const updateElement = useCallback(
    async (elementId: string, updateData: Partial<CanvasElement>) => {
      if (!projectId) return;

      // Store current state for potential rollback
      const currentElement = elements.find(el => el.id === elementId);
      if (!currentElement) return;

      // Apply optimistic update immediately
      setElements(prev =>
        prev.map(el => (el.id === elementId ? { ...el, ...updateData } : el))
      );

      try {
        const data = await fetchApi(
          `/api/projects/${projectId}/elements/${elementId}`,
          {
            method: 'PUT',
            body: JSON.stringify(updateData),
          }
        );

        if (data.success) {
          // Sync with backend response (in case backend modified the data)
          const processedElement = {
            ...data.element,
            positionX:
              typeof data.element.positionX === 'string'
                ? parseFloat(data.element.positionX)
                : Number(data.element.positionX),
            positionY:
              typeof data.element.positionY === 'string'
                ? parseFloat(data.element.positionY)
                : Number(data.element.positionY),
            width:
              typeof data.element.width === 'string'
                ? parseFloat(data.element.width)
                : Number(data.element.width),
            height:
              typeof data.element.height === 'string'
                ? parseFloat(data.element.height)
                : Number(data.element.height),
          };
          setElements(prev =>
            prev.map(el =>
              el.id === elementId ? { ...el, ...processedElement } : el
            )
          );

          // Emit real-time event
          collaboration.emitElementUpdated({
            ...currentElement,
            ...processedElement,
          });
        } else {
          console.error('Failed to update element:', data.error);
          // Rollback on failure
          setElements(prev =>
            prev.map(el => (el.id === elementId ? currentElement : el))
          );
        }
      } catch (error) {
        console.error('Error updating element:', error);
        // Rollback on error
        setElements(prev =>
          prev.map(el => (el.id === elementId ? currentElement : el))
        );
      }
    },
    [projectId, elements, setElements, collaboration]
  );

  // Delete element with optimistic updates
  const deleteElement = useCallback(
    async (elementId: string) => {
      if (!projectId) return;

      // Store current element for potential restoration
      const elementToDelete = elements.find(el => el.id === elementId);
      if (!elementToDelete) return;

      // Remove element immediately (optimistic delete)
      setElements(prev => prev.filter(el => el.id !== elementId));

      try {
        const data = await fetchApi(
          `/api/projects/${projectId}/elements/${elementId}`,
          {
            method: 'DELETE',
          }
        );

        if (!data.success) {
          console.error('Failed to delete element:', data.error);
          // Restore element on failure
          setElements(prev => [...prev, elementToDelete]);
        } else {
          // Emit real-time event
          collaboration.emitElementDeleted(elementId);
        }
        // If successful, element is already removed from UI
      } catch (error) {
        console.error('Error deleting element:', error);
        // Restore element on error
        setElements(prev => [...prev, elementToDelete]);
      }
    },
    [projectId, elements, setElements, collaboration]
  );

  return {
    createElement,
    updateElement,
    deleteElement,
  };
};
