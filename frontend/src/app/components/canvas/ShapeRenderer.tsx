import React from 'react';
import type { CanvasElement } from '../../hooks/useElementData';

interface ShapeRendererProps {
  element: CanvasElement;
  isSelected: boolean;
  renderResizeHandles: (element: CanvasElement) => React.ReactNode;
  onElementClick: (elementId: string, e: React.MouseEvent) => void;
  onElementDoubleClick: (elementId: string, e: React.MouseEvent) => void;
  onElementMouseDown: (elementId: string, e: React.MouseEvent) => void;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  element,
  isSelected,
  renderResizeHandles,
  onElementClick,
  onElementDoubleClick,
  onElementMouseDown,
}) => {
  const renderShape = () => {
    const shapeType = element.styleData?.shapeType || 'circle';
    const color = element.styleData?.color || '#fbbf24';
    const width = element.width;
    const height = element.height;

    const commonProps = {
      fill: color,
      stroke: isSelected ? '#6366f1' : color,
      strokeWidth: isSelected ? 2 : 0,
    };

    switch (shapeType) {
      case 'circle':
        return (
          <svg width={width} height={height} className='pointer-events-none'>
            <ellipse
              cx={width / 2}
              cy={height / 2}
              rx={width / 2 - 2}
              ry={height / 2 - 2}
              {...commonProps}
            />
          </svg>
        );

      case 'rectangle':
        return (
          <svg width={width} height={height} className='pointer-events-none'>
            <rect
              x='2'
              y='2'
              width={width - 4}
              height={height - 4}
              rx='4'
              {...commonProps}
            />
          </svg>
        );

      case 'triangle':
        return (
          <svg width={width} height={height} className='pointer-events-none'>
            <polygon
              points={`${width / 2},4 ${width - 4},${height - 4} 4,${height - 4}`}
              {...commonProps}
            />
          </svg>
        );

      case 'diamond':
        return (
          <svg width={width} height={height} className='pointer-events-none'>
            <polygon
              points={`${width / 2},4 ${width - 4},${height / 2} ${width / 2},${height - 4} 4,${height / 2}`}
              {...commonProps}
            />
          </svg>
        );

      case 'star':
        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.min(width, height) / 2 - 4;
        const innerRadius = outerRadius * 0.4;
        let points = '';

        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = centerX + radius * Math.cos(angle - Math.PI / 2);
          const y = centerY + radius * Math.sin(angle - Math.PI / 2);
          points += `${x},${y} `;
        }

        return (
          <svg width={width} height={height} className='pointer-events-none'>
            <polygon points={points.trim()} {...commonProps} />
          </svg>
        );

      case 'arrow':
        return (
          <svg width={width} height={height} className='pointer-events-none'>
            <polygon
              points={`4,${height / 2} ${width * 0.7},4 ${width * 0.7},${height * 0.3} ${width - 4},${height / 2} ${width * 0.7},${height * 0.7} ${width * 0.7},${height - 4}`}
              {...commonProps}
            />
          </svg>
        );

      default:
        return (
          <svg width={width} height={height} className='pointer-events-none'>
            <ellipse
              cx={width / 2}
              cy={height / 2}
              rx={width / 2 - 2}
              ry={height / 2 - 2}
              {...commonProps}
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`absolute cursor-pointer select-none ${
        isSelected ? 'ring-2 ring-indigo-500 rounded' : ''
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
      {/* Shape content */}
      {renderShape()}

      {/* Resize handles */}
      {renderResizeHandles(element)}
    </div>
  );
};
