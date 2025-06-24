import React, { useMemo } from 'react';
import type { CanvasElement } from '../../hooks/useElementData';
import { StickyNoteRenderer } from './StickyNoteRenderer';
import { TextElementRenderer } from './TextElementRenderer';
import { ShapeRenderer } from './ShapeRenderer';
import { GroupRenderer } from './GroupRenderer';

interface OptimizedCanvasElementsProps {
  elements: CanvasElement[];
  selectedElement: string | null;
  editingElement: string | null;
  editingText: string;
  tool: string;
  hasUserVoted: (element: CanvasElement) => boolean;
  getElementColor: (element: CanvasElement) => string;
  getPlaceholderColor: (element: CanvasElement) => string;
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
  scale: number;
  panX: number;
  panY: number;
}

// Memoized individual element renderer
const MemoizedElementRenderer = React.memo<{
  element: CanvasElement;
  isSelected: boolean;
  isEditing: boolean;
  editingText: string;
  tool: string;
  hasUserVoted: (element: CanvasElement) => boolean;
  getElementColor: (element: CanvasElement) => string;
  getPlaceholderColor: (element: CanvasElement) => string;
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
}>(({
  element,
  isSelected,
  isEditing,
  editingText,
  tool,
  hasUserVoted,
  getElementColor,
  getPlaceholderColor,
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
  // Render appropriate component based on element type
  switch (element.type) {
    case 'STICKY_NOTE':
      return (
        <StickyNoteRenderer
          element={element}
          isSelected={isSelected}
          isEditing={isEditing}
          editingText={editingText}
          tool={tool}
          hasUserVoted={hasUserVoted}
          getElementColor={getElementColor}
          getPlaceholderColor={getPlaceholderColor}
          renderResizeHandles={renderResizeHandles}
          onElementClick={onElementClick}
          onElementDoubleClick={onElementDoubleClick}
          onElementMouseDown={onElementMouseDown}
          onEditingTextChange={onEditingTextChange}
          onTextSubmit={onTextSubmit}
        />
      );
    case 'TEXT':
      return (
        <TextElementRenderer
          element={element}
          isSelected={isSelected}
          isEditing={isEditing}
          editingText={editingText}
          getPlaceholderColor={getPlaceholderColor}
          renderResizeHandles={renderResizeHandles}
          onElementClick={onElementClick}
          onElementDoubleClick={onElementDoubleClick}
          onElementMouseDown={onElementMouseDown}
          onEditingTextChange={onEditingTextChange}
          onTextSubmit={onTextSubmit}
        />
      );
    case 'SHAPE':
      return (
        <ShapeRenderer
          element={element}
          isSelected={isSelected}
          renderResizeHandles={renderResizeHandles}
          onElementClick={onElementClick}
          onElementDoubleClick={onElementDoubleClick}
          onElementMouseDown={onElementMouseDown}
        />
      );
    case 'GROUP':
      return (
        <GroupRenderer
          element={element}
          isSelected={isSelected}
          isEditing={isEditing}
          editingText={editingText}
          getElementsInGroup={getElementsInGroup}
          getGroupVoteCount={getGroupVoteCount}
          getGroupColor={getGroupColor}
          renderResizeHandles={renderResizeHandles}
          onElementClick={onElementClick}
          onElementDoubleClick={onElementDoubleClick}
          onElementMouseDown={onElementMouseDown}
          onEditingTextChange={onEditingTextChange}
          onTextSubmit={onTextSubmit}
        />
      );
    default:
      return null;
  }
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  const element = nextProps.element;
  const prevElement = prevProps.element;
  
  // Compare element properties that affect rendering
  const elementChanged = 
    element.id !== prevElement.id ||
    element.positionX !== prevElement.positionX ||
    element.positionY !== prevElement.positionY ||
    element.width !== prevElement.width ||
    element.height !== prevElement.height ||
    element.content !== prevElement.content ||
    JSON.stringify(element.styleData) !== JSON.stringify(prevElement.styleData) ||
    element._count?.votes !== prevElement._count?.votes;
  
  // Compare other props that affect rendering
  const propsChanged = 
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.isEditing !== nextProps.isEditing ||
    prevProps.editingText !== nextProps.editingText ||
    prevProps.tool !== nextProps.tool;
  
  // 🔧 FIX: For GROUP elements, also check if any elements in the canvas changed
  // This ensures group counts update when sticky notes move or get voted on
  if (element.type === 'GROUP') {
    // Force re-render for groups - group counts depend on other elements
    // This is a small performance trade-off for correct group counting
    return false; // Always re-render groups
  }
    
  return !elementChanged && !propsChanged;
});

// Virtualized elements renderer for better performance with many elements
export const OptimizedCanvasElements = React.memo<OptimizedCanvasElementsProps>(({
  elements,
  selectedElement,
  editingElement,
  editingText,
  tool,
  hasUserVoted,
  getElementColor,
  getPlaceholderColor,
  getElementsInGroup,
  getGroupVoteCount,
  getGroupColor,
  renderResizeHandles,
  onElementClick,
  onElementDoubleClick,
  onElementMouseDown,
  onEditingTextChange,
  onTextSubmit,
  scale,
  panX,
  panY,
}) => {
  // Sort elements by type for rendering optimization (groups first, then others)
  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => {
      if (a.type === 'GROUP' && b.type !== 'GROUP') return -1;
      if (a.type !== 'GROUP' && b.type === 'GROUP') return 1;
      return 0;
    });
  }, [elements]);

  // Simple viewport culling for performance with large numbers of elements
  const visibleElements = useMemo(() => {
    // Calculate viewport bounds
    const viewportLeft = -panX / scale;
    const viewportTop = -panY / scale;
    const viewportWidth = window.innerWidth / scale;
    const viewportHeight = window.innerHeight / scale;
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;

    // Add buffer zone for smoother scrolling
    const buffer = Math.max(viewportWidth, viewportHeight) * 0.5;
    
    return sortedElements.filter(element => {
      const elementLeft = element.positionX - element.width / 2;
      const elementTop = element.positionY - element.height / 2;
      const elementRight = element.positionX + element.width / 2;
      const elementBottom = element.positionY + element.height / 2;
      
      // Check if element intersects with viewport (with buffer)
      return !(
        elementRight < viewportLeft - buffer ||
        elementLeft > viewportRight + buffer ||
        elementBottom < viewportTop - buffer ||
        elementTop > viewportBottom + buffer
      );
    });
  }, [sortedElements, scale, panX, panY]);

  return (
    <>
      {visibleElements.map((element) => (
        <MemoizedElementRenderer
          key={element.id}
          element={element}
          isSelected={selectedElement === element.id}
          isEditing={editingElement === element.id}
          editingText={editingText}
          tool={tool}
          hasUserVoted={hasUserVoted}
          getElementColor={getElementColor}
          getPlaceholderColor={getPlaceholderColor}
          getElementsInGroup={getElementsInGroup}
          getGroupVoteCount={getGroupVoteCount}
          getGroupColor={getGroupColor}
          renderResizeHandles={renderResizeHandles}
          onElementClick={onElementClick}
          onElementDoubleClick={onElementDoubleClick}
          onElementMouseDown={onElementMouseDown}
          onEditingTextChange={onEditingTextChange}
          onTextSubmit={onTextSubmit}
        />
      ))}
    </>
  );
}, (prevProps, nextProps) => {
  // Shallow comparison of elements array and key props
  return (
    prevProps.elements === nextProps.elements &&
    prevProps.selectedElement === nextProps.selectedElement &&
    prevProps.editingElement === nextProps.editingElement &&
    prevProps.editingText === nextProps.editingText &&
    prevProps.tool === nextProps.tool &&
    prevProps.scale === nextProps.scale &&
    prevProps.panX === nextProps.panX &&
    prevProps.panY === nextProps.panY
  );
}); 