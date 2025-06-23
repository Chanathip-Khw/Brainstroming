import React from 'react';
import type { CanvasElement } from '../../hooks/useElementData';

interface GroupRendererProps {
  element: CanvasElement;
  isSelected: boolean;
  isEditing: boolean;
  editingText: string;
  getElementsInGroup: (groupId: string) => CanvasElement[];
  getGroupVoteCount: (groupId: string) => number;
  getGroupColor: (element: CanvasElement) => {
    border: string;
    bg: string;
    selectedBorder: string;
    selectedBg: string;
    label: string;
  };
  renderResizeHandles: (element: CanvasElement) => React.ReactNode;
  onElementClick: (elementId: string, e: React.MouseEvent) => void;
  onElementDoubleClick: (elementId: string, e: React.MouseEvent) => void;
  onElementMouseDown: (elementId: string, e: React.MouseEvent) => void;
  onEditingTextChange: (text: string) => void;
  onTextSubmit: () => void;
}

export const GroupRenderer: React.FC<GroupRendererProps> = ({
  element,
  isSelected,
  isEditing,
  editingText,
  getElementsInGroup,
  getGroupVoteCount,
  getGroupColor,
  renderResizeHandles,
  onElementClick,
  onElementDoubleClick,
  onElementMouseDown,
  onEditingTextChange,
  onTextSubmit,
}) => {
  const groupColors = getGroupColor(element);

  return (
    <div
      className={`absolute cursor-pointer select-none border-2 border-dashed ${groupColors.border} ${groupColors.bg} ${
        isSelected ? `${groupColors.selectedBorder} ${groupColors.selectedBg}` : ''
      }`}
      style={{
        left: `${element.positionX}px`,
        top: `${element.positionY}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={e => onElementClick(element.id, e)}
      onDoubleClick={e => onElementDoubleClick(element.id, e)}
      onMouseDown={e => onElementMouseDown(element.id, e)}
    >
      {/* Group content */}
      <div className='w-full h-full relative'>
        {/* Group label */}
        <div
          className={`absolute -top-6 left-0 px-2 py-1 rounded text-xs font-medium ${groupColors.label}`}
        >
          {isEditing ? (
            <input
              type='text'
              value={editingText}
              onChange={e => onEditingTextChange(e.target.value)}
              onBlur={onTextSubmit}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onTextSubmit();
                }
              }}
              className='border-none outline-none bg-transparent text-inherit font-inherit'
              style={{ fontSize: 'inherit', width: '80px' }}
              autoFocus
            />
          ) : (
            element.content || 'Group Label'
          )}
        </div>

        {/* Group stats */}
        <div className='absolute -bottom-6 right-0 flex gap-2'>
          {/* Item count */}
          <div className='bg-gray-600 text-white px-2 py-1 rounded text-xs'>
            {getElementsInGroup(element.id).length} items
          </div>

          {/* Vote count (only show if there are votes) */}
          {getGroupVoteCount(element.id) > 0 && (
            <div className='bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold'>
              {getGroupVoteCount(element.id)} votes
            </div>
          )}
        </div>
      </div>

      {/* Resize handles */}
      {renderResizeHandles(element)}
    </div>
  );
}; 