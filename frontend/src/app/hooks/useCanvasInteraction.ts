import { useState, useEffect, useCallback } from 'react';

interface UseCanvasInteractionProps {
  tool: string;
  selectedElement: string | null;
  setSelectedElement: (id: string | null) => void;
  setEditingElement: (id: string | null) => void;
  deleteElement: (elementId: string) => Promise<void>;
}

export const useCanvasInteraction = ({
  tool,
  selectedElement,
  setSelectedElement,
  setEditingElement,
  deleteElement,
}: UseCanvasInteractionProps) => {
  // Canvas viewport state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const zoomFactor = 0.1;
    const delta = -e.deltaY;

    setScale(prevScale => {
      const newScale =
        delta > 0
          ? Math.min(3, prevScale + zoomFactor)
          : Math.max(0.3, prevScale - zoomFactor);
      return newScale;
    });
  }, []);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Pan with left click when move tool is selected
    if (tool === 'move' && e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Middle mouse button for panning (always available)
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [tool]);

  // Handle mouse move for panning
  const handleMouseMoveForPanning = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;

      setPanX(prev => prev + deltaX);
      setPanY(prev => prev + deltaY);

      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, panStart]);

  // Handle mouse up for ending pan
  const handleMouseUpForPanning = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Reset zoom and center view
  const resetView = useCallback(() => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  }, []);

  // Zoom in
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(3, prev + 0.1));
  }, []);

  // Zoom out
  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.3, prev - 0.1));
  }, []);

  // Get cursor style based on tool and state
  const getCursorStyle = useCallback(() => {
    if (isPanning) return 'cursor-grabbing';
    if (tool === 'select') return 'cursor-default';
    if (tool === 'move') return 'cursor-grab';
    return 'cursor-crosshair';
  }, [isPanning, tool]);

  // Handle keyboard shortcuts for zoom, pan, and delete
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Delete selected element when Delete or Backspace is pressed
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      e.preventDefault();
      deleteElement(selectedElement);
    }

    // Escape to deselect
    if (e.key === 'Escape') {
      setSelectedElement(null);
      setEditingElement(null);
    }

    // Zoom shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      }
    }

    // Pan with arrow keys
    if (
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight'
    ) {
      if (!selectedElement) {
        // Only pan if no element is selected
        e.preventDefault();
        const panAmount = e.shiftKey ? 200 : 100; // Faster panning with Shift

        switch (e.key) {
          case 'ArrowUp':
            setPanY(prev => prev + panAmount);
            break;
          case 'ArrowDown':
            setPanY(prev => prev - panAmount);
            break;
          case 'ArrowLeft':
            setPanX(prev => prev + panAmount);
            break;
          case 'ArrowRight':
            setPanX(prev => prev - panAmount);
            break;
        }
      }
    }
  }, [selectedElement, setSelectedElement, setEditingElement, deleteElement, zoomIn, zoomOut, resetView]);

  // Register keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle canvas click for selection/deselection
  const handleCanvasClick = useCallback((tool: string) => {
    if (tool === 'select') {
      setSelectedElement(null);
    }
    // For other tools, the click will be handled in the parent component
  }, [setSelectedElement]);

  // Handle element click for selection
  const handleElementClick = useCallback((elementId: string, tool: string) => {
    if (tool === 'select') {
      setSelectedElement(elementId);
    }
    // For other tools (like vote), the action will be handled by other hooks
  }, [setSelectedElement]);

  return {
    // Viewport state
    scale,
    panX,
    panY,
    isPanning,
    panStart,
    
    // Viewport state setters
    setScale,
    setPanX,
    setPanY,
    setIsPanning,
    setPanStart,
    
    // Mouse event handlers
    handleWheel,
    handleMouseDown,
    handleMouseMoveForPanning,
    handleMouseUpForPanning,
    
    // Click event handlers
    handleCanvasClick,
    handleElementClick,
    
    // Utility functions
    resetView,
    zoomIn,
    zoomOut,
    getCursorStyle,
  };
}; 