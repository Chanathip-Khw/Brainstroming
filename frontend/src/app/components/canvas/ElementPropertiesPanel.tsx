import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import type { CanvasElement } from '../../hooks/useElementData';

interface ElementPropertiesPanelProps {
  selectedElement: string | null;
  elements: CanvasElement[];
  colors: string[];
  onEditElement: (elementId: string, content: string) => void;
  onDeleteElement: (elementId: string) => void;
  onUpdateElement: (
    elementId: string,
    updateData: Partial<CanvasElement>
  ) => void;
  getElementsInGroup: (groupId: string) => CanvasElement[];
  getGroupVoteCount: (groupId: string) => number;
}

export const ElementPropertiesPanel: React.FC<ElementPropertiesPanelProps> = ({
  selectedElement,
  elements,
  colors,
  onEditElement,
  onDeleteElement,
  onUpdateElement,
  getElementsInGroup,
  getGroupVoteCount,
}) => {
  if (!selectedElement) return null;

  const element = elements.find(el => el.id === selectedElement);
  if (!element) return null;

  const hasEditableText =
    element.type === 'TEXT' ||
    element.type === 'STICKY_NOTE' ||
    element.type === 'GROUP';

  return (
    <div>
      <h3 className='text-sm font-medium text-gray-700 mb-3'>
        Selected Element
      </h3>
      <div className='space-y-3'>
        {hasEditableText && (
          <button
            onClick={() =>
              onEditElement(selectedElement, element.content || '')
            }
            className='w-full p-2.5 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors border border-gray-200'
          >
            <Edit3 className='w-4 h-4 text-gray-500' />
            <span>{element.type === 'GROUP' ? 'Edit Label' : 'Edit Text'}</span>
          </button>
        )}

        {element.type === 'GROUP' && (
          <ColorPicker
            colors={colors}
            selectedColor={element.styleData?.color || '#6b7280'}
            onColorSelect={color =>
              onUpdateElement(selectedElement, {
                styleData: { ...element.styleData, color },
              })
            }
            title='Group Color'
            size='small'
          />
        )}

        {element.type === 'GROUP' && (
          <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm'>
            <div className='font-medium text-blue-800 mb-2'>Group Info</div>
            <div className='text-blue-600 space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span>Items:</span>
                <span className='font-medium'>
                  {getElementsInGroup(selectedElement).length}
                </span>
              </div>
              {getGroupVoteCount(selectedElement) > 0 && (
                <div className='flex items-center justify-between'>
                  <span>Total votes:</span>
                  <span className='font-semibold text-red-600'>
                    {getGroupVoteCount(selectedElement)}
                  </span>
                </div>
              )}
            </div>
            <div className='text-xs text-blue-500 mt-2 pt-2 border-t border-blue-200'>
              💡 Drag sticky notes into this group to organize them
            </div>
          </div>
        )}

        <button
          onClick={() => onDeleteElement(selectedElement)}
          className='w-full p-2.5 text-left text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg flex items-center gap-2 transition-colors border border-red-200'
        >
          <Trash2 className='w-4 h-4' />
          <span>Delete Element</span>
        </button>
      </div>
    </div>
  );
};
