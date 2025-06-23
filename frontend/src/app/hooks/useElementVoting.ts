import { useCallback } from 'react';
import { fetchApi } from '../lib/api';
import type { CanvasElement } from './useElementData';

interface UseElementVotingProps {
  projectId: string;
  userId: string;
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  collaboration: any;
}

export const useElementVoting = ({
  projectId,
  userId,
  elements,
  setElements,
  collaboration,
}: UseElementVotingProps) => {
  // Add vote to element
  const addVote = useCallback(async (elementId: string) => {
    if (!projectId) return;

    console.log('Attempting to add vote for element:', elementId);

    try {
      const data = await fetchApi(
        `/api/projects/${projectId}/elements/${elementId}/votes`,
        {
          method: 'POST',
          body: JSON.stringify({ type: 'LIKE' }),
        }
      );
      console.log('Add vote response:', data);

      if (data.success) {
        // Update local UI immediately for the voting user (optimistic update)
        setElements(prev =>
          prev.map(el => {
            if (el.id === elementId) {
              // Check if vote already exists to prevent duplicates
              const existingVotes = el.votes || [];
              const voteExists = existingVotes.some(
                existingVote => existingVote.userId === data.vote.userId
              );

              if (voteExists) {
                console.log(
                  'Vote already exists locally, skipping optimistic update'
                );
                return el;
              }

              const updatedVotes = [...existingVotes, data.vote];
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
        console.log('Vote added successfully');

        // Emit real-time event (this will update other users' UI)
        collaboration.emitVoteAdded(elementId, data.vote);
      } else {
        console.error('Failed to add vote:', data.error);
        alert('Failed to add vote: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding vote:', error);
      alert('Error adding vote: ' + error);
    }
  }, [projectId, setElements, collaboration]);

  // Remove vote from element
  const removeVote = useCallback(async (elementId: string) => {
    if (!projectId) return;

    console.log('Attempting to remove vote for element:', elementId);

    try {
      const data = await fetchApi(
        `/api/projects/${projectId}/elements/${elementId}/votes`,
        {
          method: 'DELETE',
        }
      );
      console.log('Remove vote response:', data);

      if (data.success) {
        // Update local UI immediately for the voting user (optimistic update)
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
        console.log('Vote removed successfully');

        // Emit real-time event (this will update other users' UI)
        collaboration.emitVoteRemoved(elementId);
      } else {
        console.error('Failed to remove vote:', data.error);
        alert('Failed to remove vote: ' + data.error);
      }
    } catch (error) {
      console.error('Error removing vote:', error);
      alert('Error removing vote: ' + error);
    }
  }, [projectId, userId, setElements, collaboration]);

  // Check if user has voted on an element
  const hasUserVoted = useCallback((element: CanvasElement) => {
    console.log('Checking if user voted:', {
      elementId: element.id,
      userId: userId,
      userIdType: typeof userId,
      votes: element.votes,
      voteUserIds: element.votes?.map(vote => ({
        userId: vote.userId,
        type: typeof vote.userId,
      })),
      hasVotes: element.votes?.some(vote => {
        console.log(
          'Comparing:',
          vote.userId,
          'vs',
          userId,
          'equal:',
          vote.userId === userId
        );
        return vote.userId === userId;
      }),
    });
    return element.votes?.some(vote => vote.userId === userId) || false;
  }, [userId]);

  // Handle voting on element (only sticky notes)
  const handleElementVote = useCallback(async (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'STICKY_NOTE') return;

    // First, let's check the current backend state for this element
    try {
      const voteData = await fetchApi(
        `/api/projects/${projectId}/elements/${elementId}/votes`
      );
      console.log('Current backend vote state:', voteData);

      if (voteData.success) {
        // Check if user has voted based on backend data
        const userHasVoted = voteData.userVoted;
        console.log('Backend says user voted:', userHasVoted);

        if (userHasVoted) {
          await removeVote(elementId);
        } else {
          await addVote(elementId);
        }
      } else {
        console.error('Failed to get vote state:', voteData.error);
      }
    } catch (error) {
      console.error('Error checking vote state:', error);
      // Fallback to frontend state
      const userHasVoted = hasUserVoted(element);
      console.log('Fallback - frontend thinks user voted:', userHasVoted);

      if (userHasVoted) {
        removeVote(elementId);
      } else {
        addVote(elementId);
      }
    }
  }, [projectId, elements, hasUserVoted, removeVote, addVote]);

  return {
    addVote,
    removeVote,
    hasUserVoted,
    handleElementVote,
  };
}; 