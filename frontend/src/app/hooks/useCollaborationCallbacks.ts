import { useCallback } from 'react';
import type { CanvasElement } from './useElementData';

interface UseCollaborationCallbacksProps {
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
}

/**
 * Process element data to ensure numeric types
 */
const processElementData = (element: any): CanvasElement => ({
  ...element,
  positionX: typeof element.positionX === 'string' ? parseFloat(element.positionX) : Number(element.positionX),
  positionY: typeof element.positionY === 'string' ? parseFloat(element.positionY) : Number(element.positionY),
  width: typeof element.width === 'string' ? parseFloat(element.width) : Number(element.width),
  height: typeof element.height === 'string' ? parseFloat(element.height) : Number(element.height),
});

export const useCollaborationCallbacks = ({ setElements }: UseCollaborationCallbacksProps) => {
  const onElementCreated = useCallback((element: any) => {
    const processedElement = processElementData(element);
    setElements(prev => [...prev, processedElement]);
  }, [setElements]);

  const onElementUpdated = useCallback((element: any) => {
    const processedElement = processElementData(element);
    setElements(prev =>
      prev.map(el => (el.id === element.id ? processedElement : el))
    );
  }, [setElements]);

  const onElementDeleted = useCallback((elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
  }, [setElements]);

  const onVoteAdded = useCallback((elementId: string, vote: any) => {
    setElements(prev =>
      prev.map(el => {
        if (el.id === elementId) {
          // Check if vote already exists to prevent duplicates
          const existingVotes = el.votes || [];
          const voteExists = existingVotes.some(
            existingVote =>
              existingVote.userId === vote.userId &&
              existingVote.id === vote.id
          );

          if (voteExists) {
            console.log('Vote already exists, skipping duplicate:', vote);
            return el; // No change if vote already exists
          }

          const updatedVotes = [...existingVotes, vote];
          return {
            ...el,
            votes: updatedVotes,
            _count: {
              ...el._count,
              votes: updatedVotes.length,
            },
          };
        }
        return el;
      })
    );
  }, [setElements]);

  const onVoteRemoved = useCallback((elementId: string, userId: string) => {
    setElements(prev =>
      prev.map(el => {
        if (el.id === elementId) {
          const updatedVotes = (el.votes || []).filter(
            vote => vote.userId !== userId
          );
          return {
            ...el,
            votes: updatedVotes,
            _count: {
              ...el._count,
              votes: updatedVotes.length,
            },
          };
        }
        return el;
      })
    );
  }, [setElements]);

  return {
    onElementCreated,
    onElementUpdated,
    onElementDeleted,
    onVoteAdded,
    onVoteRemoved,
  };
}; 