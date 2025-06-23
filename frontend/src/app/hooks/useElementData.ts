import { useState, useCallback, useEffect } from 'react';
import { fetchApi } from '../lib/api';

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
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch elements from backend
  const fetchElements = useCallback(async () => {
    if (!projectId) return;

    try {
      const data = await fetchApi(`/api/projects/${projectId}/elements`);

      if (data.success) {
        console.log('Raw elements data from backend:', data.elements);
        // Convert decimal positions to numbers
        const processedElements = data.elements.map((element: any) => ({
          ...element,
          positionX:
            typeof element.positionX === 'string'
              ? parseFloat(element.positionX)
              : Number(element.positionX),
          positionY:
            typeof element.positionY === 'string'
              ? parseFloat(element.positionY)
              : Number(element.positionY),
          width:
            typeof element.width === 'string'
              ? parseFloat(element.width)
              : Number(element.width),
          height:
            typeof element.height === 'string'
              ? parseFloat(element.height)
              : Number(element.height),
        }));
        setElements(processedElements);
        console.log('Loaded elements with votes data:', processedElements);
      } else {
        console.error('Failed to fetch elements:', data.error);
      }
    } catch (error) {
      console.error('Error fetching elements:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load elements on mount
  useEffect(() => {
    fetchElements();
  }, [fetchElements]);

  return {
    elements,
    setElements,
    loading,
    fetchElements,
  };
};

export type { CanvasElement }; 