import React, { useRef, useState, useCallback } from 'react';
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
import { useSessionManagement } from '../../hooks/useSessionManagement';
import { OptimizedCanvasElements } from './OptimizedCanvasElements';
import { ZoomControls } from './ZoomControls';
import { HelpTooltip } from './HelpTooltip';
import { ColorPicker } from './ColorPicker';
import { ToolPanel } from './ToolPanel';
import { SessionControls } from './SessionControls';
import { ShapeSelector } from './ShapeSelector';
import { ElementPropertiesPanel } from './ElementPropertiesPanel';
import LiveCursors from '../LiveCursors';
import type { CanvasElement } from '../../hooks/useElementData';
import {
  CANVAS_COLORS,
  CANVAS_SHAPES,
  CANVAS_TOOLS,
} from '../../constants/canvas';
import {
  getElementColor,
  getPlaceholderColor,
  getGroupColor,
} from '../../utils/elementStyles';
import {
  getElementsInGroup,
  getGroupVoteCount,
  findGroupAtPoint,
  createGroupStyleData,
  removeGroupStyleData,
} from '../../utils/groupUtils';
import { screenToCanvas } from '../../utils/canvasUtils';
import { useCollaborationCallbacks } from '../../hooks/useCollaborationCallbacks';
import { createNewElement } from '../../utils/elementCreation';
import { CREATABLE_ELEMENT_TYPES } from '../../constants/elements';

interface CanvasBoardProps {
  user: User;
  projectId: string;
}

export const CanvasBoard = ({ user, projectId }: CanvasBoardProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<string>('select');
  const [selectedColor, setSelectedColor] = useState('#fbbf24');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showHelp, setShowHelp] = useState(true);
  const [selectedShape, setSelectedShape] = useState('circle');
  // Session management hook
  const {
    currentTemplate,
    currentActivityIndex,
    templateSessionId,
    timerNotification,
    showTimerModal,
    showTemplatesModal,
    handleTimerComplete,
    handleStartTemplate,
    clearCurrentSession,
    setShowTimerModal,
    setShowTemplatesModal,
  } = useSessionManagement();

  // Canvas elements data hook
  const { elements, setElements, loading } = useElementData({
    projectId,
  });

  // Collaboration callbacks
  const collaborationCallbacks = useCollaborationCallbacks({ setElements });

  // Real-time collaboration
  const collaboration = useCollaboration({
    projectId,
    ...collaborationCallbacks,
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
    hasUserVoted: hasUserVotedHook,
    handleElementVote: handleElementVoteHook,
  } = useElementVoting({
    projectId,
    userId: user.id,
    elements,
    setElements,
    collaboration,
  });

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
    attachWheelListener,
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

  // Combined ref callback for canvas element
  const canvasRefCallback = useCallback((element: HTMLDivElement | null) => {
    // Set the existing ref
    if (canvasRef.current !== element) {
      canvasRef.current = element;
    }
    
    // Attach wheel listener
    if (element) {
      attachWheelListener(element);
    }
  }, [attachWheelListener]);

  // Element resizing hook
  const {
    isResizing,
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

  // Add element to group
  const addElementToGroup = async (elementId: string, groupId: string) => {
    const element = elements.find((el: CanvasElement) => el.id === elementId);
    if (!element) return;

    const updatedStyleData = createGroupStyleData(element, groupId);
    await updateElementHook(elementId, { styleData: updatedStyleData });
  };

  // Remove element from group
  const removeElementFromGroup = async (elementId: string) => {
    const element = elements.find((el: CanvasElement) => el.id === elementId);
    if (!element) return;

    const updatedStyleData = removeGroupStyleData(element);
    await updateElementHook(elementId, { styleData: updatedStyleData });
  };

  // Element dragging hook
  const {
    isDragging,
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
    findGroupAtPoint: (x: number, y: number) =>
      findGroupAtPoint(elements, x, y),
  });

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only handle left mouse button clicks (button 0) for canvas interactions
    if (e.button !== 0) return;
    
    // Use hook for basic interaction logic (selection/deselection)
    handleCanvasClickFromHook(tool);

    if (tool === 'move') {
      // Pan tool doesn't create elements, just pans
      return;
    }

    if (CREATABLE_ELEMENT_TYPES.includes(tool as any)) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const { x, y } = screenToCanvas(
          e.clientX,
          e.clientY,
          rect,
          scale,
          panX,
          panY
        );

        const newElement = createNewElement(
          tool as any,
          x,
          y,
          selectedColor,
          selectedShape
        );

        createElementHook(newElement);
        // Automatically switch to select tool after placing an element
        setTool('select');
      }
    }
  };

  const handleElementClick = (elementId: string, e: React.MouseEvent) => {
    // Only handle left mouse button clicks (button 0)
    if (e.button !== 0) return;
    
    e.stopPropagation();

    // Handle voting separately - don't select element when voting
    if (tool === 'vote') {
      const element = elements.find((el: CanvasElement) => el.id === elementId);
      // Only allow voting on sticky notes
      if (element?.type === 'STICKY_NOTE') {
        handleElementVoteHook(elementId, e);
      }
      return; // Exit early to prevent selection
    }

    // Use hook for basic interaction logic (selection) for all other tools
    handleElementClickFromHook(elementId, tool);
  };

  const handleElementDoubleClick = (elementId: string, e: React.MouseEvent) => {
    // Only handle left mouse button double-clicks (button 0)
    if (e.button !== 0) return;
    
    e.stopPropagation();
    const element = elements.find((el: CanvasElement) => el.id === elementId);
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
    // Only handle left mouse button presses (button 0)
    if (e.button !== 0) return;
    
    // Don't select element when using vote tool
    if (tool !== 'vote') {
      setSelectedElement(elementId);
    }
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
    <div className='flex flex-1 h-full'>
      {/* Timer and Templates modals */}
      <SessionTimer
        onTimerComplete={handleTimerComplete}
        onStopSession={clearCurrentSession}
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

      <div className='bg-white border-r border-gray-200 w-64 flex flex-col h-full'>
        <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-4'>
          {selectedElement ? (
            // Show Element Properties Panel when an element is selected
            <ElementPropertiesPanel
              selectedElement={selectedElement}
              elements={elements}
              colors={CANVAS_COLORS}
              onEditElement={(elementId, content) => {
                setEditingElement(elementId);
                setEditingText(content);
              }}
              onDeleteElement={deleteElement}
              onUpdateElement={updateElementHook}
              getElementsInGroup={(groupId: string) =>
                getElementsInGroup(elements, groupId)
              }
              getGroupVoteCount={(groupId: string) =>
                getGroupVoteCount(elements, groupId)
              }
            />
          ) : (
            // Show tools and controls when no element is selected
            <>
              <ToolPanel
                tools={CANVAS_TOOLS}
                selectedTool={tool}
                onToolSelect={setTool}
              />

              <ColorPicker
                colors={CANVAS_COLORS}
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
                title='Colors'
              />

              <SessionControls
                currentTemplate={currentTemplate}
                onOpenTemplates={() => setShowTemplatesModal(true)}
                onOpenTimer={() => setShowTimerModal(true)}
              />

              <ShapeSelector
                shapes={CANVAS_SHAPES}
                selectedShape={selectedShape}
                onShapeSelect={setSelectedShape}
                isVisible={tool === 'SHAPE'}
              />
            </>
          )}
        </div>
      </div>

      <div className='flex-1 relative overflow-hidden'>
        <div
          ref={canvasRefCallback}
          className={`w-full h-full relative ${getCursorStyle()}`}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDownForPanning}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
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

          <OptimizedCanvasElements
            elements={elements}
            selectedElement={selectedElement}
            editingElement={editingElement}
            editingText={editingText}
            tool={tool}
            hasUserVoted={hasUserVotedHook}
            getElementColor={getElementColor}
            getPlaceholderColor={getPlaceholderColor}
            getElementsInGroup={(groupId: string) =>
              getElementsInGroup(elements, groupId)
            }
            getGroupVoteCount={(groupId: string) =>
              getGroupVoteCount(elements, groupId)
            }
            getGroupColor={getGroupColor}
            renderResizeHandles={renderResizeHandles}
            onElementClick={handleElementClick}
            onElementDoubleClick={handleElementDoubleClick}
            onElementMouseDown={handleElementMouseDown}
            onEditingTextChange={setEditingText}
            onTextSubmit={handleTextSubmit}
            scale={scale}
            panX={panX}
            panY={panY}
          />
        </div>

        <ZoomControls
          scale={scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetView={resetView}
        />

        <HelpTooltip showHelp={showHelp} onToggleHelp={setShowHelp} />

        {/* Live Cursors */}
        <LiveCursors cursors={collaboration.userCursors} />
      </div>
    </div>
  );
};
