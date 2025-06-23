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
  Trash2,
  Edit3,
  Group,
} from 'lucide-react';
import { User } from '../../types';
import { SessionTimer } from '../SessionTimer';
import { SessionTemplates } from '../SessionTemplates';
import { Clock, Users } from 'lucide-react';
import { useCollaboration } from '../../hooks/useCollaboration';
import { useElementData } from '../../hooks/useElementData';
import { useElementCRUD } from '../../hooks/useElementCRUD';
import { useElementVoting } from '../../hooks/useElementVoting';
import { useElementDragging } from '../../hooks/useElementDragging';
import { useElementResizing } from '../../hooks/useElementResizing';
import { useCanvasPanZoom } from '../../hooks/useCanvasPanZoom';
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

  // Canvas pan and zoom hook
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
    resetView,
    zoomIn,
    zoomOut,
    getCursorStyle,
  } = useCanvasPanZoom({
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
    if (tool === 'select') {
      setSelectedElement(null);
      return;
    }

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

    if (tool === 'select') {
      setSelectedElement(elementId);
    } else if (tool === 'vote') {
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

  const renderShape = (element: CanvasElement) => {
    const shapeType = element.styleData?.shapeType || 'circle';
    const color = element.styleData?.color || '#fbbf24';
    const width = element.width;
    const height = element.height;

    const commonProps = {
      fill: color,
      stroke: selectedElement === element.id ? '#6366f1' : color,
      strokeWidth: selectedElement === element.id ? 2 : 0,
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
        <div>
          <h3 className='text-sm font-medium text-gray-700 mb-3'>Tools</h3>
          <div className='grid grid-cols-2 gap-2'>
            {tools.map(toolItem => (
              <button
                key={toolItem.id}
                onClick={() => setTool(toolItem.id)}
                className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                  tool === toolItem.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <toolItem.icon className='w-5 h-5' />
                <span className='text-xs'>{toolItem.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className='text-sm font-medium text-gray-700 mb-3'>Colors</h3>
          <div className='grid grid-cols-4 gap-2'>
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-lg border-2 ${
                  selectedColor === color
                    ? 'border-gray-800'
                    : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className='text-sm font-medium text-gray-700 mb-3'>Session</h3>
          <div className='space-y-2'>
            <button
              onClick={() => setShowTemplatesModal(true)}
              className='w-full p-3 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2'
              title='Session Templates'
            >
              <Users className='w-5 h-5' />
              <span className='text-sm font-medium'>Templates</span>
            </button>

            <button
              onClick={() => setShowTimerModal(true)}
              className={`w-full p-3 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                currentTemplate
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title='Session Timer'
            >
              <Clock className='w-5 h-5' />
              <span className='text-sm font-medium'>
                {currentTemplate ? 'Running Timer' : 'Timer'}
              </span>
            </button>
          </div>
        </div>

        {tool === 'SHAPE' && (
          <div>
            <h3 className='text-sm font-medium text-gray-700 mb-3'>Shapes</h3>
            <div className='grid grid-cols-2 gap-2'>
              {shapes.map(shape => (
                <button
                  key={shape.id}
                  onClick={() => setSelectedShape(shape.id)}
                  className={`p-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                    selectedShape === shape.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {shape.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedElement && (
          <div>
            <h3 className='text-sm font-medium text-gray-700 mb-3'>
              Selected Element
            </h3>
            <div className='space-y-2'>
              {(() => {
                const element = elements.find(el => el.id === selectedElement);
                const hasEditableText =
                  element &&
                  (element.type === 'TEXT' ||
                    element.type === 'STICKY_NOTE' ||
                    element.type === 'GROUP');

                return (
                  <>
                    {hasEditableText && (
                      <button
                        onClick={() => {
                          if (element) {
                            setEditingElement(selectedElement);
                            setEditingText(element.content || '');
                          }
                        }}
                        className='w-full p-2 text-left text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2'
                      >
                        <Edit3 className='w-4 h-4' />
                        {element?.type === 'GROUP' ? 'Edit Label' : 'Edit Text'}
                      </button>
                    )}

                    {/* Color picker for selected group */}
                    {element?.type === 'GROUP' && (
                      <div>
                        <h4 className='text-xs font-medium text-gray-600 mb-2'>
                          Group Color
                        </h4>
                        <div className='grid grid-cols-4 gap-2'>
                          {colors.map(color => (
                            <button
                              key={color}
                              onClick={() =>
                                updateElementHook(selectedElement, {
                                  styleData: { ...element.styleData, color },
                                })
                              }
                              className={`w-6 h-6 rounded border-2 ${
                                element.styleData?.color === color
                                  ? 'border-gray-800'
                                  : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {element?.type === 'GROUP' && (
                      <div className='p-2 bg-blue-50 rounded text-sm'>
                        <div className='font-medium text-blue-800 mb-1'>
                          Group Info
                        </div>
                        <div className='text-blue-600 space-y-1'>
                          <div>
                            Contains{' '}
                            {getElementsInGroup(selectedElement).length} items
                          </div>
                          {getGroupVoteCount(selectedElement) > 0 && (
                            <div className='font-semibold text-red-600'>
                              Total votes: {getGroupVoteCount(selectedElement)}
                            </div>
                          )}
                        </div>
                        <div className='text-xs text-blue-500 mt-1'>
                          Drag sticky notes into this group to organize them
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => deleteElement(selectedElement)}
                      className='w-full p-2 text-left text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center gap-2'
                    >
                      <Trash2 className='w-4 h-4' />
                      Delete
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
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
            .map(element => (
              <div
                key={element.id}
                className={`absolute cursor-pointer select-none ${
                  element.type === 'TEXT'
                    ? `text-gray-800 ${selectedElement === element.id ? 'ring-2 ring-indigo-500 bg-white bg-opacity-20 rounded' : ''}`
                    : element.type === 'SHAPE'
                      ? `${selectedElement === element.id ? 'ring-2 ring-indigo-500 rounded' : ''}`
                      : element.type === 'GROUP'
                        ? `border-2 border-dashed ${getGroupColor(element).border} ${getGroupColor(element).bg} ${selectedElement === element.id ? `${getGroupColor(element).selectedBorder} ${getGroupColor(element).selectedBg}` : ''}`
                        : `${getElementColor(element)} p-3 rounded-lg shadow-sm flex flex-col justify-between ${selectedElement === element.id ? 'ring-2 ring-indigo-500' : ''}`
                }`}
                style={{
                  left: `${element.positionX}px`,
                  top: `${element.positionY}px`,
                  width: `${element.width}px`,
                  height: `${element.height}px`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: element.type === 'TEXT' ? '16px' : undefined,
                  fontWeight: element.type === 'TEXT' ? '500' : undefined,
                  color:
                    element.type === 'TEXT'
                      ? element.styleData?.color || '#374151'
                      : undefined,
                  minHeight: element.type === 'TEXT' ? '30px' : undefined,
                }}
                onClick={e => handleElementClick(element.id, e)}
                onDoubleClick={e => handleElementDoubleClick(element.id, e)}
                onMouseDown={e => handleElementMouseDown(element.id, e)}
              >
                {element.type === 'TEXT' ? (
                  // Text element rendering
                  editingElement === element.id ? (
                    <input
                      type='text'
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      onBlur={handleTextSubmit}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTextSubmit();
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
                  )
                ) : element.type === 'SHAPE' ? (
                  // Shape element rendering
                  renderShape(element)
                ) : element.type === 'GROUP' ? (
                  // Group element rendering
                  <div className='w-full h-full relative'>
                    {/* Group label */}
                    <div
                      className={`absolute -top-6 left-0 px-2 py-1 rounded text-xs font-medium ${getGroupColor(element).label}`}
                    >
                      {editingElement === element.id ? (
                        <input
                          type='text'
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onBlur={handleTextSubmit}
                          onKeyPress={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleTextSubmit();
                            }
                          }}
                          className='border-none outline-none bg-transparent text-inherit font-inherit'
                          style={{ fontSize: 'inherit', width: '80px' }}
                          autoFocus
                        />
                      ) : (
                        element.content || 'Group Label'
                      )}
                    </div>

                    {/* Group stats */}
                    <div className='absolute -bottom-6 right-0 flex gap-2'>
                      {/* Item count */}
                      <div className='bg-gray-600 text-white px-2 py-1 rounded text-xs'>
                        {getElementsInGroup(element.id).length} items
                      </div>

                      {/* Vote count (only show if there are votes) */}
                      {getGroupVoteCount(element.id) > 0 && (
                        <div className='bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold'>
                          {getGroupVoteCount(element.id)} votes
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Non-text element rendering (sticky notes, shapes)
                  <>
                    {/* Vote count indicator (only for sticky notes) */}
                    {element.type === 'STICKY_NOTE' &&
                      (element._count?.votes || 0) > 0 && (
                        <div className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10'>
                          {element._count?.votes}
                        </div>
                      )}

                    {/* Voting indicator when vote tool is selected (only for sticky notes) */}
                    {tool === 'vote' && element.type === 'STICKY_NOTE' && (
                      <div
                        className={`absolute -top-1 -left-1 w-3 h-3 rounded-full z-10 ${
                          hasUserVotedHook(element) ? 'bg-green-500' : 'bg-blue-500'
                        } opacity-70`}
                      />
                    )}

                    {editingElement === element.id ? (
                      <textarea
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onBlur={handleTextSubmit}
                        onKeyPress={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleTextSubmit();
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
                            {element.type === 'STICKY_NOTE'
                              ? 'Add your idea...'
                              : 'Click to edit...'}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
                {/* Resize handles */}
                {renderResizeHandles(element)}
              </div>
            ))}
        </div>

        <div className='absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2'>
          <button
            onClick={zoomOut}
            className='p-2 hover:bg-gray-100 rounded text-lg font-bold'
            title='Zoom out (Ctrl + -)'
          >
            -
          </button>
          <button
            onClick={resetView}
            className='text-sm font-medium w-16 text-center hover:bg-gray-100 rounded px-2 py-1'
            title='Reset zoom (Ctrl + 0)'
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            className='p-2 hover:bg-gray-100 rounded text-lg font-bold'
            title='Zoom in (Ctrl + +)'
          >
            +
          </button>
        </div>

        {/* Help tooltip */}
        {showHelp && (
          <div className='absolute top-4 right-4 bg-black bg-opacity-75 text-white text-xs rounded-lg p-3 max-w-xs z-30'>
            <div className='flex justify-between items-start mb-2'>
              <span className='font-medium'>Keyboard Shortcuts</span>
              <button
                onClick={() => setShowHelp(false)}
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
            onClick={() => setShowHelp(true)}
            className='absolute top-4 right-4 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 text-sm'
            title='Show keyboard shortcuts'
          >
            ?
          </button>
        )}

        {/* Live Cursors */}
        <LiveCursors cursors={collaboration.userCursors} />
      </div>
    </div>
  );
};
