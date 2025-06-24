import type { CanvasElement } from '../hooks/useElementData';

/**
 * Get elements that belong to a specific group
 */
export const getElementsInGroup = (
  elements: CanvasElement[],
  groupId: string
): CanvasElement[] => {
  const groupElements = elements.filter(el => el.styleData?.groupId === groupId);
  console.log(`📊 Group ${groupId} has ${groupElements.length} items:`, groupElements.map(el => el.id));
  return groupElements;
};

/**
 * Get total vote count for all sticky notes in a group
 */
export const getGroupVoteCount = (
  elements: CanvasElement[],
  groupId: string
): number => {
  const groupElements = getElementsInGroup(elements, groupId);
  const stickyNotes = groupElements.filter(el => el.type === 'STICKY_NOTE');
  const totalVotes = stickyNotes.reduce((total, stickyNote) => {
    const votes = stickyNote._count?.votes || 0;
    console.log(`🗳️ Sticky note ${stickyNote.id} has ${votes} votes`);
    return total + votes;
  }, 0);
  console.log(`🗳️ Group ${groupId} total votes: ${totalVotes}`);
  return totalVotes;
};

/**
 * Check if a point is inside a group boundary
 */
export const isPointInGroup = (
  x: number,
  y: number,
  group: CanvasElement
): boolean => {
  const groupLeft = group.positionX - group.width / 2;
  const groupRight = group.positionX + group.width / 2;
  const groupTop = group.positionY - group.height / 2;
  const groupBottom = group.positionY + group.height / 2;

  return x >= groupLeft && x <= groupRight && y >= groupTop && y <= groupBottom;
};

/**
 * Find which group contains a point (if any)
 */
export const findGroupAtPoint = (
  elements: CanvasElement[],
  x: number,
  y: number
): CanvasElement | undefined => {
  return elements.find(el => el.type === 'GROUP' && isPointInGroup(x, y, el));
};

/**
 * Add element to group by updating its styleData
 */
export const createGroupStyleData = (
  element: CanvasElement,
  groupId: string
) => {
  return {
    ...element.styleData,
    groupId: groupId,
  };
};

/**
 * Remove element from group by removing groupId from styleData
 */
export const removeGroupStyleData = (element: CanvasElement) => {
  if (!element.styleData) {
    return { color: '#fbbf24' }; // Return default color if no styleData
  }

  const { groupId, ...restStyleData } = element.styleData;
  return restStyleData;
};

/**
 * Check if an element belongs to any group
 */
export const isElementInGroup = (element: CanvasElement): boolean => {
  return Boolean(element.styleData?.groupId);
};

/**
 * Get all groups from elements array
 */
export const getGroups = (elements: CanvasElement[]): CanvasElement[] => {
  return elements.filter(el => el.type === 'GROUP');
};

/**
 * Get all elements that are not in any group
 */
export const getUngroupedElements = (
  elements: CanvasElement[]
): CanvasElement[] => {
  return elements.filter(el => el.type !== 'GROUP' && !isElementInGroup(el));
};
