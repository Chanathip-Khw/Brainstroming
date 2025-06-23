import React from 'react';

interface Shape {
  id: string;
  name: string;
}

interface ShapeSelectorProps {
  shapes: Shape[];
  selectedShape: string;
  onShapeSelect: (shapeId: string) => void;
  isVisible: boolean;
}

export const ShapeSelector: React.FC<ShapeSelectorProps> = ({
  shapes,
  selectedShape,
  onShapeSelect,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div>
      <h3 className='text-sm font-medium text-gray-700 mb-3'>Shapes</h3>
      <div className='grid grid-cols-2 gap-2'>
        {shapes.map(shape => (
          <button
            key={shape.id}
            onClick={() => onShapeSelect(shape.id)}
            className={`p-2.5 rounded-lg border-2 text-xs font-medium transition-all duration-200 ${
              selectedShape === shape.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {shape.name}
          </button>
        ))}
      </div>
    </div>
  );
}; 