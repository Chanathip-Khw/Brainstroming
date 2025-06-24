import { useState, useCallback, useEffect } from 'react';
import { useProjectElementsQuery } from './useApiQueries';

interface CanvasElement {
  id: string;
  type: 'STICKY_NOTE' | 'TEXT' | 'SHAPE' | 'GROUP';
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  content: string;
  styleData: {
    color: string;
    shapeType?: string;
    groupId?: string;
    [key: string]: any;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    votes: number;
  };
  votes?: {
    id: string;
    userId: string;
    type: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string;
    };
  }[];
}

interface UseElementDataProps {
  projectId: string;
}

export const useElementData = ({ projectId }: UseElementDataProps) => {
  // Use React Query for data fetching with caching and background updates
  const { data: elements = [], isLoading: loading, refetch: fetchElements } = useProjectElementsQuery(projectId);
  
  // Local state for optimistic updates during real-time collaboration
  const [localElements, setLocalElements] = useState<CanvasElement[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ FIX: Only sync React Query data on initial load, never overwrite local changes
  useEffect(() => {
    console.log('📡 React Query data changed:', elements.length, 'elements');
    console.log('🔒 isInitialized:', isInitialized);
    
    // Only sync on initial load when we don't have local data yet
    if (!isInitialized && elements.length > 0) {
      console.log('🔄 Initial sync: Loading React Query data to local state');
      if (elements.length > 0) {
        console.log('📍 First element position from React Query:', elements[0] ? `${elements[0].positionX},${elements[0].positionY}` : 'none');
      }
      setLocalElements(elements);
      setIsInitialized(true);
    } else if (isInitialized) {
      console.log('⏸️ Skipping React Query sync - local state already initialized');
    }
  }, [elements, isInitialized]);

    // Sync React Query data with local state
  const setElements = useCallback((elementsOrUpdater: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[])) => {
    console.log('🔄 setElements called, type:', typeof elementsOrUpdater);
    console.log('📊 Current local elements count:', localElements.length);
    console.log('📊 React Query elements count:', elements.length);
    
    if (typeof elementsOrUpdater === 'function') {
      setLocalElements(prevLocal => {
        const currentElements = prevLocal.length > 0 ? prevLocal : elements;
        console.log('🔧 Function update - using elements:', currentElements.length, 'elements');
        const newElements = elementsOrUpdater(currentElements);
        console.log('✨ New elements after update:', newElements.length, 'elements');
        
        // Log specific element positions if we're updating positions
        const positionChanges = newElements.filter((newEl, i) => {
          const oldEl = currentElements[i];
          return oldEl && (oldEl.positionX !== newEl.positionX || oldEl.positionY !== newEl.positionY);
        });
        if (positionChanges.length > 0) {
          console.log('📍 Position changes detected:', positionChanges.map(el => {
            const oldEl = currentElements.find((old: CanvasElement) => old.id === el.id);
            return {
              id: el.id,
              oldPos: oldEl ? `${oldEl.positionX},${oldEl.positionY}` : 'unknown',
              newPos: `${el.positionX},${el.positionY}`
            };
          }));
        }
        
        return newElements;
      });
    } else {
      console.log('📝 Direct array update with', elementsOrUpdater.length, 'elements');
      setLocalElements(elementsOrUpdater);
    }
  }, [elements, localElements]);

  // Use local elements if available, otherwise use React Query data
  const currentElements = localElements.length > 0 ? localElements : elements;

  return {
    elements: currentElements,
    setElements,
    loading,
    fetchElements,
  };
};

export type { CanvasElement };
