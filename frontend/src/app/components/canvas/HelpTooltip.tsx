import React from 'react';

interface HelpTooltipProps {
  showHelp: boolean;
  onToggleHelp: (show: boolean) => void;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  showHelp,
  onToggleHelp,
}) => {
  return (
    <>
      {/* Help tooltip */}
      {showHelp && (
        <div className='absolute top-4 right-4 bg-black bg-opacity-75 text-white text-xs rounded-lg p-3 max-w-xs z-30'>
          <div className='flex justify-between items-start mb-2'>
            <span className='font-medium'>Keyboard Shortcuts</span>
            <button
              onClick={() => onToggleHelp(false)}
              className='text-white hover:text-gray-300 ml-2'
            >
              ×
            </button>
          </div>
          <div className='space-y-1'>
            <div>
              <strong>Scroll:</strong> Zoom in/out
            </div>
            <div>
              <strong>Middle Click + Drag:</strong> Pan canvas
            </div>
            <div>
              <strong>Delete:</strong> Remove selected element
            </div>
            <div>
              <strong>Escape:</strong> Deselect element
            </div>
            <div>
              <strong>+/- Keys:</strong> Zoom in/out
            </div>
            <div>
              <strong>Arrow Keys:</strong> Pan canvas
            </div>
            <div>
              <strong>Ctrl + 0:</strong> Reset zoom & center
            </div>
            <div>
              <strong>Groups:</strong> Drag sticky notes into groups
            </div>
          </div>
        </div>
      )}

      {/* Show help button when help is hidden */}
      {!showHelp && (
        <button
          onClick={() => onToggleHelp(true)}
          className='absolute top-4 right-4 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 text-sm'
          title='Show keyboard shortcuts'
        >
          ?
        </button>
      )}
    </>
  );
};
