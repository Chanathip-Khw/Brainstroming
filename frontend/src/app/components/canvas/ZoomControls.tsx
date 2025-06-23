import React from 'react';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  return (
    <div className='absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2'>
      <button
        onClick={onZoomOut}
        className='p-2 hover:bg-gray-100 rounded text-lg font-bold'
        title='Zoom out (Ctrl + -)'
      >
        -
      </button>
      <button
        onClick={onResetView}
        className='text-sm font-medium w-16 text-center hover:bg-gray-100 rounded px-2 py-1'
        title='Reset zoom (Ctrl + 0)'
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className='p-2 hover:bg-gray-100 rounded text-lg font-bold'
        title='Zoom in (Ctrl + +)'
      >
        +
      </button>
    </div>
  );
}; 