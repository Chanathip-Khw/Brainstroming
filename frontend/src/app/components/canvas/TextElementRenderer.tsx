import React from 'react';
import type { CanvasElement } from '../../hooks/useElementData';

interface TextElementRendererProps {
  element: CanvasElement;
  isSelected: boolean;
  isEditing: boolean;
  editingText: string;
  getPlaceholderColor: (element: CanvasElement) => string;
  renderResizeHandles: (element: CanvasElement) => React.ReactNode;
  onElementClick: (elementId: string, e: React.MouseEvent) => void;
  onElementDoubleClick: (elementId: string, e: React.MouseEvent) => void;
  onElementMouseDown: (elementId: string, e: React.MouseEvent) => void;
  onEditingTextChange: (text: string) => void;
  onTextSubmit: () => void;
}

export const TextElementRenderer: React.FC<TextElementRendererProps> = ({
  element,
  isSelected,
  isEditing,
  editingText,
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
      className={`absolute cursor-pointer select-none text-gray-800 ${
        isSelected ? 'ring-2 ring-indigo-500 bg-white bg-opacity-20 rounded' : ''
      }`}
      style={{
        left: `${element.positionX}px`,
        top: `${element.positionY}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: 'translate(-50%, -50%)',
        fontSize: '16px',
        fontWeight: '500',
        color: element.styleData?.color || '#374151',
        minHeight: '30px',
      }}
      onClick={e => onElementClick(element.id, e)}
      onDoubleClick={e => onElementDoubleClick(element.id, e)}
      onMouseDown={e => onElementMouseDown(element.id, e)}
    >
      {/* Text content */}
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
          style={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            color: 'inherit',
            width: '100%',
            resize: 'none',
          }}
          autoFocus
        />
      ) : (
        <div
          className='w-full h-full flex items-center justify-center overflow-hidden p-2'
          style={{
            wordWrap: 'break-word',
            lineHeight: '1.4',
            textAlign: 'center',
          }}
        >
          {element.content || (
            <span
              className='italic'
              style={{ color: getPlaceholderColor(element) }}
            >
              Add your text...
            </span>
          )}
        </div>
      )}

      {/* Resize handles */}
      {renderResizeHandles(element)}
    </div>
  );
}; 