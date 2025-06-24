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
    setElements(prev => {
      // 🔧 DUPLICATE FIX: Check if element already exists to prevent duplicate keys
      const elementExists = prev.some(el => el.id === processedElement.id);
      if (elementExists) {
        console.log('Element already exists, skipping duplicate:', processedElement.id);
        return prev; // No change if element already exists
      }
      return [...prev, processedElement];
    });
  }, [setElements]);

  const onElementUpdated = useCallback((element: any) => {
    console.log('🌐 Collaboration: Element updated received', element.id, `pos: ${element.positionX},${element.positionY}`);
    const processedElement = processElementData(element);
    setElements(prev => {
      // 🔧 VOTING BUG FIX: Preserve local vote state when receiving position updates
      const result = prev.map(el => {
        if (el.id === element.id) {
          // Preserve local vote state if it exists, otherwise use server state
          const preservedVotes = el.votes && el.votes.length > 0 ? el.votes : processedElement.votes;
          const preservedCount = el._count?.votes !== undefined ? el._count : processedElement._count;
          
          return {
            ...processedElement, // Use updated data for position, content, etc.
            votes: preservedVotes, // 🔧 FIX: Preserve local vote state
            _count: preservedCount, // 🔧 FIX: Preserve local vote counts
          } as CanvasElement;
        }
        return el;
      });
      console.log('🌐 Collaboration: Applied element update', processedElement.id, `new pos: ${processedElement.positionX},${processedElement.positionY}`);
      return result;
    });
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