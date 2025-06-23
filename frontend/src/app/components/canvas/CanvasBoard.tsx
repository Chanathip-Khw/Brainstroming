import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Hand,
  Square,
  Type,
  Circle,
  Minus,
  Move,
  Vote,
  Group,
} from 'lucide-react';
import { User } from '../../types';
import { SessionTimer } from '../SessionTimer';
import { SessionTemplates } from '../SessionTemplates';
import { useCollaboration } from '../../hooks/useCollaboration';
import { useElementData } from '../../hooks/useElementData';
import { useElementCRUD } from '../../hooks/useElementCRUD';
import { useElementVoting } from '../../hooks/useElementVoting';
import { useElementDragging } from '../../hooks/useElementDragging';
import { useElementResizing } from '../../hooks/useElementResizing';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { StickyNoteRenderer } from './StickyNoteRenderer';
import { TextElementRenderer } from './TextElementRenderer';
import { ShapeRenderer } from './ShapeRenderer';
import { GroupRenderer } from './GroupRenderer';
import { ElementRenderer } from './ElementRenderer';
import { ZoomControls } from './ZoomControls';
import { HelpTooltip } from './HelpTooltip';
import { ColorPicker } from './ColorPicker';
import { ToolPanel } from './ToolPanel';
import { SessionControls } from './SessionControls';
import { ShapeSelector } from './ShapeSelector';
import { ElementPropertiesPanel } from './ElementPropertiesPanel';
import LiveCursors from '../LiveCursors';
import { fetchApi } from '../../lib/api';
import type { CanvasElement } from '../../hooks/useElementData';

interface CanvasBoardProps {
  user: User;
  projectId: string;
}

export const CanvasBoard = ({ user, projectId }: CanvasBoardProps) => {
  const { data: session } = useSession();
  const canvasRef = useRef<HTMLDivElement>(null);
  const sessionTimerRef = useRef<any>(null);
  const sessionTemplatesRef = useRef<any>(null);
  const [tool, setTool] = useState<string>('select');
  const [selectedColor, setSelectedColor] = useState('#fbbf24');
  const [isVoting, setIsVoting] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showHelp, setShowHelp] = useState(true);
  const [selectedShape, setSelectedShape] = useState('circle');
  const [timerNotification, setTimerNotification] = useState<string | null>(
    null
  );
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [templateSessionId, setTemplateSessionId] = useState<string | null>(
    null
  );
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Real-time collaboration
  const collaboration = useCollaboration({
    projectId,
    onElementCreated: element => {
      const processedElement = {
        ...element,
        positionX:
          typeof element.positionX === 'string'
            ? parseFloat(element.positionX)
            : Number(element.positionX),
        positionY:
          typeof element.positionY === 'string'
            ? parseFloat(element.positionY)
            : Number(element.positionY),
        width:
          typeof element.width === 'string'
            ? parseFloat(element.width)
            : Number(element.width),
        height:
          typeof element.height === 'string'
            ? parseFloat(element.height)
            : Number(element.height),
      };
      setElements(prev => [...prev, processedElement]);
    },
    onElementUpdated: element => {
      const processedElement = {
        ...element,
        positionX:
          typeof element.positionX === 'string'
            ? parseFloat(element.positionX)
            : Number(element.positionX),
        positionY:
          typeof element.positionY === 'string'
            ? parseFloat(element.positionY)
            : Number(element.positionY),
        width:
          typeof element.width === 'string'
            ? parseFloat(element.width)
            : Number(element.width),
        height:
          typeof element.height === 'string'
            ? parseFloat(element.height)
            : Number(element.height),
      };
      setElements(prev =>
        prev.map(el => (el.id === element.id ? processedElement : el))
      );
    },
    onElementDeleted: elementId => {
      setElements(prev => prev.filter(el => el.id !== elementId));
    },
    onVoteAdded: (elementId, vote) => {
      setElements(prev =>
        prev.map(el => {
          if (el.id === elementId) {
            // Check if vote already exists to prevent duplicates
            const existingVotes = el.votes || [];
            const voteExists = existingVotes.some(
              existingVote =>
                existingVote.userId === vote.userId &&
                existingVote.id === vote.id
            );

            if (voteExists) {
              console.log('Vote already exists, skipping duplicate:', vote);
              return el; // No change if vote already exists
            }

            const updatedVotes = [...existingVotes, vote];
            return {
              ...el,
              votes: updatedVotes,
              _count: {
                ...el._count,
                votes: updatedVotes.length,
              },
            };
          }
          return el;
        })
      );
    },
    onVoteRemoved: (elementId, userId) => {
      setElements(prev =>
        prev.map(el => {
          if (el.id === elementId) {
            const updatedVotes = (el.votes || []).filter(
              vote => vote.userId !== userId
            );
            return {
              ...el,
              votes: updatedVotes,
              _count: {
                ...el._count,
                votes: updatedVotes.length,
              },
            };
          }
          return el;
        })
      );
    },
  });

  // Canvas elements data hook
  const {
    elements,
    setElements,
    loading,
    fetchElements: refetchElements,
  } = useElementData({
    projectId,
  });

  // Canvas elements CRUD operations hook
  const {
    createElement: createElementHook,
    updateElement: updateElementHook,
    deleteElement: deleteElementHook,
  } = useElementCRUD({
    projectId,
    userId: user.id,
    elements,
    setElements,
    collaboration,
  });

  // Canvas elements voting operations hook
  const {
    addVote: addVoteHook,
    removeVote: removeVoteHook,
    hasUserVoted: hasUserVotedHook,
    handleElementVote: handleElementVoteHook,
  } = useElementVoting({
    projectId,
    userId: user.id,
    elements,
    setElements,
    collaboration,
  });

  const colors = [
    '#fbbf24',
    '#3b82f6',
    '#10b981',
    '#ec4899',
    '#8b5cf6',
    '#f97316',
    '#ef4444',
    '#6b7280',
  ];

  const shapes = [
    { id: 'circle', name: 'Circle' },
    { id: 'rectangle', name: 'Rectangle' },
    { id: 'triangle', name: 'Triangle' },
    { id: 'diamond', name: 'Diamond' },
    { id: 'star', name: 'Star' },
    { id: 'arrow', name: 'Arrow' },
  ];

  const tools = [
    { id: 'select', icon: Hand, label: 'Select' },
    { id: 'STICKY_NOTE', icon: Square, label: 'Sticky Note' },
    { id: 'TEXT', icon: Type, label: 'Text' },
    { id: 'SHAPE', icon: Circle, label: 'Shape' },
    { id: 'GROUP', icon: Group, label: 'Group' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'move', icon: Move, label: 'Pan' },
    { id: 'vote', icon: Vote, label: 'Vote' },
  ];

  // Wrapper for deleteElement that also clears selection
  const deleteElement = async (elementId: string) => {
    setSelectedElement(null);
    await deleteElementHook(elementId);
  };

  // Canvas interaction hook (mouse, keyboard, viewport)
  const {
    scale,
    panX,
    panY,
    isPanning,
    panStart,
    setScale,
    setPanX,
    setPanY,
    setIsPanning,
    setPanStart,
    handleWheel: handleWheelHook,
    handleMouseDown: handleMouseDownForPanning,
    handleMouseMoveForPanning,
    handleMouseUpForPanning,
    handleCanvasClick: handleCanvasClickFromHook,
    handleElementClick: handleElementClickFromHook,
    resetView,
    zoomIn,
    zoomOut,
    getCursorStyle,
  } = useCanvasInteraction({
    tool,
    selectedElement,
    setSelectedElement,
    setEditingElement,
    deleteElement,
  });

  // Element resizing hook
  const {
    isResizing,
    resizeHandle,
    resizeStart,
    setIsResizing,
    setResizeHandle,
    setResizeStart,
    handleResizeMouseDown: handleResizeMouseDownHook,
    handleMouseMoveForResizing,
    handleMouseUpForResizing,
    getResizeHandles,
  } = useElementResizing({
    elements,
    setElements,
    selectedElement,
    scale,
    panX,
    panY,
    canvasRef,
    updateElement: updateElementHook,
  });

  // Get elements that belong to a specific group
  const getElementsInGroup = (groupId: string) => {
    return elements.filter(el => el.styleData?.groupId === groupId);
  };

  // Get total vote count for all sticky notes in a group
  const getGroupVoteCount = (groupId: string) => {
    const groupElements = getElementsInGroup(groupId);
    const stickyNotes = groupElements.filter(el => el.type === 'STICKY_NOTE');
    return stickyNotes.reduce((total, stickyNote) => {
      return total + (stickyNote._count?.votes || 0);
    }, 0);
  };

  // Check if a point is inside a group boundary
  const isPointInGroup = (x: number, y: number, group: CanvasElement) => {
    const groupLeft = group.positionX - group.width / 2;
    const groupRight = group.positionX + group.width / 2;
    const groupTop = group.positionY - group.height / 2;
    const groupBottom = group.positionY + group.height / 2;

    return (
      x >= groupLeft && x <= groupRight && y >= groupTop && y <= groupBottom
    );
  };

  // Find which group contains a point (if any)
  const findGroupAtPoint = (x: number, y: number) => {
    return elements.find(el => el.type === 'GROUP' && isPointInGroup(x, y, el));
  };

  // Add element to group
  const addElementToGroup = async (elementId: string, groupId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const updatedStyleData = {
      ...element.styleData,
      groupId: groupId,
    };

    await updateElementHook(elementId, { styleData: updatedStyleData });
  };

  // Remove element from group
  const removeElementFromGroup = async (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const { groupId, ...restStyleData } = element.styleData;
    await updateElementHook(elementId, { styleData: restStyleData });
  };

  // Handle timer completion
  const handleTimerComplete = (activityName: string) => {
    setTimerNotification(activityName);

    // If running a template, advance to next activity
    if (
      currentTemplate &&
      currentActivityIndex < currentTemplate.activities.length - 1
    ) {
      setTimeout(() => {
        setCurrentActivityIndex(prev => prev + 1);
        setTimerNotification(null);
      }, 3000);
    } else {
      // Template completed or single timer
      setTimeout(() => {
        setTimerNotification(null);
        setCurrentTemplate(null);
        setCurrentActivityIndex(0);
        setTemplateSessionId(null);
      }, 5000);
    }
  };

  // Handle starting a session template
  const handleStartTemplate = (template: any) => {
    // Generate unique session ID to force restart even for same template
    const sessionId = `${template.id}-${Date.now()}`;
    setTemplateSessionId(sessionId);
    setCurrentTemplate(template);
    setCurrentActivityIndex(0);
    // The SessionTimer will automatically start the first activity
  };

  // Elements are now automatically loaded by the useElementData hook

  // Element dragging hook
  const {
    isDragging,
    dragOffset,
    isDragReady,
    setIsDragging,
    setDragOffset,
    setIsDragReady,
    handleElementMouseDown: handleElementMouseDownHook,
    handleMouseMoveForDragging,
    handleMouseUpForDragging,
  } = useElementDragging({
    elements,
    setElements,
    selectedElement,
    scale,
    panX,
    panY,
    canvasRef,
    updateElement: updateElementHook,
    addElementToGroup,
    removeElementFromGroup,
    findGroupAtPoint,
  });





  const handleCanvasClick = (e: React.MouseEvent) => {
    // Use hook for basic interaction logic (selection/deselection)
    handleCanvasClickFromHook(tool);

    if (tool === 'move') {
      // Pan tool doesn't create elements, just pans
      return;
    }

    if (['STICKY_NOTE', 'TEXT', 'SHAPE', 'GROUP'].includes(tool)) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panX) / scale;
        const y = (e.clientY - rect.top - panY) / scale;

        const newElement: Partial<CanvasElement> = {
          type: tool as 'STICKY_NOTE' | 'TEXT' | 'SHAPE' | 'GROUP',
          positionX: x,
          positionY: y,
          width: tool === 'TEXT' ? 200 : tool === 'GROUP' ? 300 : 150,
          height: tool === 'TEXT' ? 30 : tool === 'GROUP' ? 200 : 150,
          content:
            tool === 'GROUP'
              ? 'Group Label'
              : tool === 'STICKY_NOTE'
                ? ''
                : tool === 'TEXT'
                  ? ''
                  : '',
          styleData: {
            color: selectedColor,
            ...(tool === 'SHAPE' && { shapeType: selectedShape }),
          },
        };

        createElementHook(newElement);
        // Automatically switch to select tool after placing an element
        setTool('select');
      }
    }
  };

  const handleElementClick = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Use hook for basic interaction logic (selection)
    handleElementClickFromHook(elementId, tool);

    // Handle voting separately as it's not part of basic interaction
    if (tool === 'vote') {
      const element = elements.find(el => el.id === elementId);
      // Only allow voting on sticky notes
      if (element?.type === 'STICKY_NOTE') {
        handleElementVoteHook(elementId, e);
      }
    }
  };

  const handleElementDoubleClick = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (element) {
      setEditingElement(elementId);
      setEditingText(element.content || '');
    }
  };

  const handleTextSubmit = () => {
    if (editingElement) {
      // Apply text change immediately to UI
      setElements(prev =>
        prev.map(el =>
          el.id === editingElement ? { ...el, content: editingText } : el
        )
      );

      // Exit editing mode immediately
      setEditingElement(null);
      setEditingText('');

      // Sync with backend in background
      updateElementHook(editingElement, { content: editingText });
    }
  };

  const handleElementMouseDown = (elementId: string, e: React.MouseEvent) => {
    setSelectedElement(elementId);
    handleElementMouseDownHook(elementId, e, tool);
  };

  const handleResizeMouseDown = (
    elementId: string,
    handle: string,
    e: React.MouseEvent
  ) => {
    setSelectedElement(elementId);
    handleResizeMouseDownHook(elementId, handle, e, tool);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Send cursor position for collaboration - just the viewport position
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      collaboration.sendCursorPosition(x, y);
    }

    // Handle element resizing
    handleMouseMoveForResizing(e, isPanning, isDragging);

    // Handle element dragging
    handleMouseMoveForDragging(e, isPanning, isResizing);

    // Handle canvas panning
    handleMouseMoveForPanning(e);
  };

  const handleMouseUp = async (e?: React.MouseEvent) => {
    // Handle element resizing end
    handleMouseUpForResizing();
    
    // Handle element dragging end
    handleMouseUpForDragging();
    
    // Handle panning end
    handleMouseUpForPanning();
  };



  const getElementColor = (element: CanvasElement) => {
    const color = element.styleData?.color || '#fbbf24';

    // Convert hex to Tailwind-like classes or use inline styles
    const colorMap: { [key: string]: string } = {
      '#fbbf24': 'bg-yellow-200',
      '#3b82f6': 'bg-blue-200',
      '#10b981': 'bg-green-200',
      '#ec4899': 'bg-pink-200',
      '#8b5cf6': 'bg-purple-200',
      '#f97316': 'bg-orange-200',
      '#ef4444': 'bg-red-200',
      '#6b7280': 'bg-gray-200',
    };

    return colorMap[color] || 'bg-yellow-200';
  };

  // Helper function to create placeholder color with opacity
  const getPlaceholderColor = (element: CanvasElement) => {
    const color = element.styleData?.color || '#fbbf24';
    return color + '80'; // Add 50% opacity (80 in hex)
  };

  // Helper function to get group color classes
  const getGroupColor = (element: CanvasElement) => {
    if (element.type !== 'GROUP') {
      return {
        border: 'border-gray-400',
        bg: 'bg-gray-50 bg-opacity-30',
        selectedBorder: 'border-indigo-500',
        selectedBg: 'bg-indigo-50',
        label: 'bg-gray-200 text-gray-700',
      };
    }

    const color = element.styleData?.color || '#6b7280';

    const colorMap: { [key: string]: any } = {
      '#fbbf24': {
        // yellow
        border: 'border-yellow-400',
        bg: 'bg-yellow-50 bg-opacity-40',
        selectedBorder: 'border-yellow-600',
        selectedBg: 'bg-yellow-100',
        label: 'bg-yellow-200 text-yellow-800',
      },
      '#3b82f6': {
        // blue
        border: 'border-blue-400',
        bg: 'bg-blue-50 bg-opacity-40',
        selectedBorder: 'border-blue-600',
        selectedBg: 'bg-blue-100',
        label: 'bg-blue-200 text-blue-800',
      },
      '#10b981': {
        // green
        border: 'border-green-400',
        bg: 'bg-green-50 bg-opacity-40',
        selectedBorder: 'border-green-600',
        selectedBg: 'bg-green-100',
        label: 'bg-green-200 text-green-800',
      },
      '#ec4899': {
        // pink
        border: 'border-pink-400',
        bg: 'bg-pink-50 bg-opacity-40',
        selectedBorder: 'border-pink-600',
        selectedBg: 'bg-pink-100',
        label: 'bg-pink-200 text-pink-800',
      },
      '#8b5cf6': {
        // purple
        border: 'border-purple-400',
        bg: 'bg-purple-50 bg-opacity-40',
        selectedBorder: 'border-purple-600',
        selectedBg: 'bg-purple-100',
        label: 'bg-purple-200 text-purple-800',
      },
      '#f97316': {
        // orange
        border: 'border-orange-400',
        bg: 'bg-orange-50 bg-opacity-40',
        selectedBorder: 'border-orange-600',
        selectedBg: 'bg-orange-100',
        label: 'bg-orange-200 text-orange-800',
      },
      '#ef4444': {
        // red
        border: 'border-red-400',
        bg: 'bg-red-50 bg-opacity-40',
        selectedBorder: 'border-red-600',
        selectedBg: 'bg-red-100',
        label: 'bg-red-200 text-red-800',
      },
      '#6b7280': {
        // gray (default)
        border: 'border-gray-400',
        bg: 'bg-gray-50 bg-opacity-30',
        selectedBorder: 'border-indigo-500',
        selectedBg: 'bg-indigo-50',
        label: 'bg-gray-200 text-gray-700',
      },
    };

    return colorMap[color] || colorMap['#6b7280'];
  };

  // Render resize handles for selected element
  const renderResizeHandles = (element: CanvasElement) => {
    const handles = getResizeHandles(element);
    if (handles.length === 0) return null;

    return handles.map(handle => (
      <div
        key={handle.id}
        className='absolute w-2 h-2 bg-indigo-500 border border-white rounded-sm hover:bg-indigo-600 transition-colors'
        style={handle.style}
        onMouseDown={handle.onMouseDown}
      />
    ));
  };



  if (loading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600'></div>
      </div>
    );
  }

  return (
    <div className='flex flex-1'>
      {/* Timer and Templates modals */}
      <SessionTimer
        onTimerComplete={handleTimerComplete}
        currentTemplate={currentTemplate}
        currentActivityIndex={currentActivityIndex}
        templateSessionId={templateSessionId}
        isOpen={showTimerModal}
        onOpenChange={setShowTimerModal}
      />
      <SessionTemplates
        onStartTemplate={handleStartTemplate}
        isOpen={showTemplatesModal}
        onOpenChange={setShowTemplatesModal}
      />

      {/* Timer Completion Notification */}
      {timerNotification && (
        <div className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-green-500 text-white px-8 py-4 rounded-lg shadow-xl animate-pulse'>
          <div className='text-center'>
            <div className='text-xl font-bold mb-1'>Time's Up!</div>
            <div className='text-sm'>{timerNotification} completed</div>
            <div className='text-xs mt-1 opacity-75'>
              Great work! Ready for the next phase?
            </div>
          </div>
        </div>
      )}

      <div className='bg-white border-r border-gray-200 p-4 w-64 flex flex-col gap-4'>
        <ToolPanel
          tools={tools}
          selectedTool={tool}
          onToolSelect={setTool}
        />

        <ColorPicker
          colors={colors}
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
          title="Colors"
        />

        <SessionControls
          currentTemplate={currentTemplate}
          onOpenTemplates={() => setShowTemplatesModal(true)}
          onOpenTimer={() => setShowTimerModal(true)}
        />

        <ShapeSelector
          shapes={shapes}
          selectedShape={selectedShape}
          onShapeSelect={setSelectedShape}
          isVisible={tool === 'SHAPE'}
        />

        <ElementPropertiesPanel
          selectedElement={selectedElement}
          elements={elements}
          colors={colors}
          onEditElement={(elementId, content) => {
            setEditingElement(elementId);
            setEditingText(content);
          }}
          onDeleteElement={deleteElement}
          onUpdateElement={updateElementHook}
          getElementsInGroup={getElementsInGroup}
          getGroupVoteCount={getGroupVoteCount}
        />
      </div>

      <div className='flex-1 relative overflow-hidden'>
        <div
          ref={canvasRef}
          className={`w-full h-full relative ${getCursorStyle()}`}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDownForPanning}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheelHook}
          onContextMenu={e => e.preventDefault()} // Prevent right-click menu
          style={{
            transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
            transformOrigin: '0 0',
          }}
        >
          <div
            className='absolute opacity-10'
            style={{
              left: '-50000px',
              top: '-50000px',
              width: '100000px',
              height: '100000px',
              backgroundImage: `
                linear-gradient(to right, #000 1px, transparent 1px),
                linear-gradient(to bottom, #000 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {elements
            .sort((a, b) => {
              // Groups should render first (behind other elements)
              if (a.type === 'GROUP' && b.type !== 'GROUP') return -1;
              if (b.type === 'GROUP' && a.type !== 'GROUP') return 1;
              return 0;
            })
            .map(element => {
              // Handle sticky notes with dedicated component
              if (element.type === 'STICKY_NOTE') {
                return (
                  <StickyNoteRenderer
                    key={element.id}
                    element={element}
                    isSelected={selectedElement === element.id}
                    isEditing={editingElement === element.id}
                    editingText={editingText}
                    tool={tool}
                    hasUserVoted={hasUserVotedHook}
                    getElementColor={getElementColor}
                    getPlaceholderColor={getPlaceholderColor}
                    renderResizeHandles={renderResizeHandles}
                    onElementClick={handleElementClick}
                    onElementDoubleClick={handleElementDoubleClick}
                    onElementMouseDown={handleElementMouseDown}
                    onEditingTextChange={setEditingText}
                    onTextSubmit={handleTextSubmit}
                  />
                );
              }

              // Handle text elements with dedicated component
              if (element.type === 'TEXT') {
                return (
                  <TextElementRenderer
                    key={element.id}
                    element={element}
                    isSelected={selectedElement === element.id}
                    isEditing={editingElement === element.id}
                    editingText={editingText}
                    getPlaceholderColor={getPlaceholderColor}
                    renderResizeHandles={renderResizeHandles}
                    onElementClick={handleElementClick}
                    onElementDoubleClick={handleElementDoubleClick}
                    onElementMouseDown={handleElementMouseDown}
                    onEditingTextChange={setEditingText}
                    onTextSubmit={handleTextSubmit}
                  />
                );
              }

              // Handle group elements with dedicated component
              if (element.type === 'GROUP') {
                return (
                  <GroupRenderer
                    key={element.id}
                    element={element}
                    isSelected={selectedElement === element.id}
                    isEditing={editingElement === element.id}
                    editingText={editingText}
                    getElementsInGroup={getElementsInGroup}
                    getGroupVoteCount={getGroupVoteCount}
                    getGroupColor={getGroupColor}
                    renderResizeHandles={renderResizeHandles}
                    onElementClick={handleElementClick}
                    onElementDoubleClick={handleElementDoubleClick}
                    onElementMouseDown={handleElementMouseDown}
                    onEditingTextChange={setEditingText}
                    onTextSubmit={handleTextSubmit}
                  />
                );
              }

              // Handle shape elements with dedicated component
              if (element.type === 'SHAPE') {
                return (
                  <ShapeRenderer
                    key={element.id}
                    element={element}
                    isSelected={selectedElement === element.id}
                    renderResizeHandles={renderResizeHandles}
                    onElementClick={handleElementClick}
                    onElementDoubleClick={handleElementDoubleClick}
                    onElementMouseDown={handleElementMouseDown}
                  />
                );
              }

              // Handle all other element types with the ElementRenderer
              return (
                <ElementRenderer
                  key={element.id}
                  element={element}
                  isSelected={selectedElement === element.id}
                  isEditing={editingElement === element.id}
                  editingText={editingText}
                  getElementColor={getElementColor}
                  getPlaceholderColor={getPlaceholderColor}
                  renderResizeHandles={renderResizeHandles}
                  onElementClick={handleElementClick}
                  onElementDoubleClick={handleElementDoubleClick}
                  onElementMouseDown={handleElementMouseDown}
                  onEditingTextChange={setEditingText}
                  onTextSubmit={handleTextSubmit}
                />
              );
            })}
        </div>

        <ZoomControls
          scale={scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetView={resetView}
        />

        <HelpTooltip
          showHelp={showHelp}
          onToggleHelp={setShowHelp}
        />

        {/* Live Cursors */}
        <LiveCursors cursors={collaboration.userCursors} />
      </div>
    </div>
  );
};
