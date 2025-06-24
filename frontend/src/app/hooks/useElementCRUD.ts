import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  
  // 🔧 DEBOUNCE: Prevent rapid duplicate creations
  const creationInProgress = useRef<Set<string>>(new Set());
  
  // Create element with optimistic updates
  const createElement = useCallback(
    async (elementData: Partial<CanvasElement>) => {
      if (!projectId) return;

      // 🔧 DUPLICATE KEY BUG FIXES: This function now prevents React duplicate key errors by:
      // 1. Removing aggressive cache invalidation that caused race conditions
      // 2. Adding robust replacement logic for optimistic updates
      // 3. Adding duplicate prevention in collaboration callbacks
      // The combination prevents the same element from being added multiple times

      // 🔧 DEBOUNCE: Prevent rapid duplicate creations based on position
      const positionKey = `${elementData.positionX}_${elementData.positionY}_${elementData.type}`;
      if (creationInProgress.current.has(positionKey)) {
        console.log('🚫 Creation already in progress for position:', positionKey);
        return;
      }
      creationInProgress.current.add(positionKey);

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

          setElements(prev => {
            // 🔧 ROBUST REPLACEMENT: Handle edge cases in optimistic update replacement
            const tempExists = prev.some(el => el.id === tempId);
            const realExists = prev.some(el => el.id === processedElement.id);
            
            if (realExists) {
              // Real element already exists somehow
              if (tempExists) {
                // Remove temp element since real element is already there
                console.log('Real element already exists, removing temp element:', tempId);
                return prev.filter(el => el.id !== tempId);
              } else {
                // Real element exists but temp doesn't, just return current state
                console.log('Real element already exists, no temp to remove:', processedElement.id);
                return prev;
              }
            }
            
            if (tempExists) {
              // Normal case: replace temp with real element
              console.log('Replacing temp element with real element:', tempId, '->', processedElement.id);
              return prev.map(el => (el.id === tempId ? processedElement : el));
            } else {
              // Edge case: temp element missing, add real element
              console.log('Temp element missing, adding real element:', processedElement.id);
              return [...prev, processedElement];
            }
          });

          // Emit real-time event
          collaboration.emitElementCreated(processedElement);
          
          // 🔧 DUPLICATE ELEMENT FIX: Don't immediately invalidate cache after creation
          // This was causing race conditions where both React Query refetch and real-time
          // collaboration events would add the same element, causing duplicate key errors
          // queryClient.invalidateQueries({ 
          //   queryKey: ['projectElements', projectId] 
          // });
          
          // 🔧 CLEANUP: Remove any orphaned temp elements after successful creation
          setTimeout(() => {
            setElements(prev => {
              const hasOrphanedTemp = prev.some(el => el.id.startsWith('temp-'));
              if (hasOrphanedTemp) {
                console.log('🧹 Cleaning up orphaned temp elements');
                return prev.filter(el => !el.id.startsWith('temp-'));
              }
              return prev;
            });
          }, 1000);
          
          // 🔧 DEBOUNCE CLEANUP: Clear creation lock
          creationInProgress.current.delete(positionKey);
        } else {
          console.error('Failed to create element:', data.error);
          // Remove optimistic element on failure
          setElements(prev => prev.filter(el => el.id !== tempId));
          // 🔧 DEBOUNCE CLEANUP: Clear creation lock on failure
          creationInProgress.current.delete(positionKey);
        }
      } catch (error) {
        console.error('Error creating element:', error);
        // Remove optimistic element on error
        setElements(prev => prev.filter(el => el.id !== tempId));
        // 🔧 DEBOUNCE CLEANUP: Clear creation lock on error
        creationInProgress.current.delete(positionKey);
      }
    },
    [projectId, userId, setElements, collaboration, queryClient]
  );

  // Update element with optimistic updates
  const updateElement = useCallback(
    async (elementId: string, updateData: Partial<CanvasElement>) => {
      if (!projectId) return;

      // 🔧 VOTING BUG FIX: This function now preserves local vote state during position updates.
      // Previously, cache invalidation after dragging would immediately refetch server data,
      // overwriting local optimistic vote updates. Now we rely on real-time collaboration 
      // events to sync data across users instead of aggressive cache invalidation.

      // Store current state for potential rollback
      const currentElement = elements.find(el => el.id === elementId);
      if (!currentElement) {
        console.warn('⚠️ Element not found for update:', elementId);
        console.log('📋 Current elements:', elements.map(el => ({ id: el.id, type: el.type })));
        return;
      }
      
      console.log('📝 Updating element:', elementId, 'type:', currentElement.type, 'data:', updateData);

      // Apply optimistic update immediately
      setElements(prev =>
        prev.map(el => (el.id === elementId ? { ...el, ...updateData } : el))
      );

      try {
        console.log('🔄 Updating element:', elementId, 'with data:', updateData);
        console.log('🌐 API URL:', `/api/projects/${projectId}/elements/${elementId}`);
        
        const data = await fetchApi(
          `/api/projects/${projectId}/elements/${elementId}`,
          {
            method: 'PUT',
            body: JSON.stringify(updateData),
          }
        );

        console.log('📡 Backend response:', data);

        if (data.success) {
          console.log('✅ Update successful, emitting to collaborators');
          // Only emit real-time event for other users - don't update local state again
          // The optimistic update is already applied and working correctly
          collaboration.emitElementUpdated(data.element);
          
          // 🔧 VOTING BUG FIX: Don't immediately invalidate cache after position updates
          // This was causing fresh server data to overwrite local vote state during dragging
          // The cache will be updated naturally through real-time collaboration events
          // queryClient.invalidateQueries({ 
          //   queryKey: ['projectElements', projectId] 
          // });
        } else {
          console.error('❌ Failed to update element:', data.error);
          console.error('📊 Full error response:', data);
          
          // 🔧 PHANTOM ELEMENT FIX: If element not found, remove from frontend
          if (data.error === "Element not found or you don't have access") {
            console.log('🗑️ Removing phantom element from frontend state:', elementId);
            setElements(prev => prev.filter(el => el.id !== elementId));
            return; // Don't rollback since element doesn't exist
          }
          
          // Rollback on other failures
          setElements(prev =>
            prev.map(el => (el.id === elementId ? currentElement : el))
          );
        }
      } catch (error) {
        console.error('💥 Error updating element:', error);
        console.error('🔍 Error details:', error instanceof Error ? error.message : JSON.stringify(error, null, 2));
        // Rollback on error
        setElements(prev =>
          prev.map(el => (el.id === elementId ? currentElement : el))
        );
      }
    },
    [projectId, elements, setElements, collaboration, queryClient]
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
          
          // Invalidate React Query cache
          queryClient.invalidateQueries({ 
            queryKey: ['projectElements', projectId] 
          });
        }
        // If successful, element is already removed from UI
      } catch (error) {
        console.error('Error deleting element:', error);
        // Restore element on error
        setElements(prev => [...prev, elementToDelete]);
      }
    },
    [projectId, elements, setElements, collaboration, queryClient]
  );

  return {
    createElement,
    updateElement,
    deleteElement,
  };
};
