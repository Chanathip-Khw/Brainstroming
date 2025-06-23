import React from 'react';

interface ColorPickerProps {
  colors: string[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  colors,
  selectedColor,
  onColorSelect,
  title,
  size = 'medium',
  className = '',
}) => {
  const sizeClasses = {
    small: 'grid-cols-4 gap-2',
    medium: 'grid-cols-4 gap-3',
    large: 'grid-cols-3 gap-3',
  };

  const buttonSizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-10 h-10',
  };

  return (
    <div className={className}>
      {title && (
        <h3 className='text-sm font-medium text-gray-700 mb-3'>{title}</h3>
      )}
      <div className={`grid ${sizeClasses[size]}`}>
        {colors.map(color => (
          <button
            key={color}
            onClick={() => onColorSelect(color)}
            className={`${buttonSizeClasses[size]} rounded-lg border-2 transition-all hover:scale-105 ${
              selectedColor === color
                ? 'border-gray-800 ring-2 ring-gray-400'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={`Select color: ${color}`}
          />
        ))}
      </div>
    </div>
  );
}; 