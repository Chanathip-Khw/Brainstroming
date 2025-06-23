import React from 'react';
import type { CanvasElement } from '../../hooks/useElementData';

interface StickyNoteRendererProps {
  element: CanvasElement;
  isSelected: boolean;
  isEditing: boolean;
  editingText: string;
  tool: string;
  hasUserVoted: (element: CanvasElement) => boolean;
  getElementColor: (element: CanvasElement) => string;
  getPlaceholderColor: (element: CanvasElement) => string;
  renderResizeHandles: (element: CanvasElement) => React.ReactNode;
  onElementClick: (elementId: string, e: React.MouseEvent) => void;
  onElementDoubleClick: (elementId: string, e: React.MouseEvent) => void;
  onElementMouseDown: (elementId: string, e: React.MouseEvent) => void;
  onEditingTextChange: (text: string) => void;
  onTextSubmit: () => void;
}

export const StickyNoteRenderer: React.FC<StickyNoteRendererProps> = ({
  element,
  isSelected,
  isEditing,
  editingText,
  tool,
  hasUserVoted,
  getElementColor,
  getPlaceholderColor,
  renderResizeHandles,
  onElementClick,
  onElementDoubleClick,
  onElementMouseDown,
  onEditingTextChange,
  onTextSubmit,
}) => {
  return (
    <div
      className={`absolute cursor-pointer select-none ${getElementColor(element)} p-3 rounded-lg shadow-sm flex flex-col justify-between ${
        isSelected ? 'ring-2 ring-indigo-500' : ''
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
      {/* Vote count indicator */}
      {(element._count?.votes || 0) > 0 && (
        <div className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10'>
          {element._count?.votes}
        </div>
      )}

      {/* Voting indicator when vote tool is selected */}
      {tool === 'vote' && (
        <div
          className={`absolute -top-1 -left-1 w-3 h-3 rounded-full z-10 ${
            hasUserVoted(element) ? 'bg-green-500' : 'bg-blue-500'
          } opacity-70`}
        />
      )}

      {/* Content area */}
      {isEditing ? (
        <textarea
          value={editingText}
          onChange={e => onEditingTextChange(e.target.value)}
          onBlur={onTextSubmit}
          onKeyPress={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onTextSubmit();
            }
          }}
          className='w-full h-full resize-none border-none outline-none bg-transparent text-sm'
          autoFocus
        />
      ) : (
        <div className='text-sm text-gray-800 mb-2 flex-1 overflow-hidden'>
          {element.content || (
            <span
              className='italic'
              style={{ color: getPlaceholderColor(element) }}
            >
              Add your idea...
            </span>
          )}
        </div>
      )}

      {/* Resize handles */}
      {renderResizeHandles(element)}
    </div>
  );
}; 