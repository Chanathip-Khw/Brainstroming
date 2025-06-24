import { useState, useCallback } from 'react';
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

  // Sync React Query data with local state
  const setElements = useCallback((elementsOrUpdater: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[])) => {
    if (typeof elementsOrUpdater === 'function') {
      setLocalElements(elementsOrUpdater(elements));
    } else {
      setLocalElements(elementsOrUpdater);
    }
  }, [elements]);

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
