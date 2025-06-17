import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Hand, Square, Type, Circle, Minus, Move, Vote, Trash2, Edit3 } from 'lucide-react';
import { User } from '../../types';

interface CanvasElement {
  id: string;
  type: 'STICKY_NOTE' | 'TEXT' | 'SHAPE';
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  content: string;
  styleData: {
    color: string;
    shapeType?: string;
    [key: string]: any;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CanvasBoardProps {
  user: User;
  projectId: string;
}

export const CanvasBoard = ({ user, projectId }: CanvasBoardProps) => {
  const { data: session } = useSession();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<string>('select');
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedColor, setSelectedColor] = useState('#fbbf24');
  const [isVoting, setIsVoting] = useState(false);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(true);
  const [selectedShape, setSelectedShape] = useState('circle');

  const colors = [
    '#fbbf24', '#3b82f6', '#10b981', '#ec4899', 
    '#8b5cf6', '#f97316', '#ef4444', '#6b7280'
  ];

  const shapes = [
    { id: 'circle', name: 'Circle' },
    { id: 'rectangle', name: 'Rectangle' },
    { id: 'triangle', name: 'Triangle' },
    { id: 'diamond', name: 'Diamond' },
    { id: 'star', name: 'Star' },
    { id: 'arrow', name: 'Arrow' }
  ];

  const tools = [
    { id: 'select', icon: Hand, label: 'Select' },
    { id: 'STICKY_NOTE', icon: Square, label: 'Sticky Note' },
    { id: 'TEXT', icon: Type, label: 'Text' },
    { id: 'SHAPE', icon: Circle, label: 'Shape' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'move', icon: Move, label: 'Pan' }
  ];

  // Fetch elements from backend
  const fetchElements = useCallback(async () => {
    if (!session?.accessToken || !projectId) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/elements`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        // Convert decimal positions to numbers
        const processedElements = data.elements.map((element: any) => ({
          ...element,
          positionX: typeof element.positionX === 'string' ? parseFloat(element.positionX) : Number(element.positionX),
          positionY: typeof element.positionY === 'string' ? parseFloat(element.positionY) : Number(element.positionY),
          width: typeof element.width === 'string' ? parseFloat(element.width) : Number(element.width),
          height: typeof element.height === 'string' ? parseFloat(element.height) : Number(element.height)
        }));
        setElements(processedElements);
        console.log('Loaded elements with positions:', processedElements);
      } else {
        console.error('Failed to fetch elements:', data.error);
      }
    } catch (error) {
      console.error('Error fetching elements:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, projectId]);

  // Create element with optimistic updates
  const createElement = async (elementData: Partial<CanvasElement>) => {
    if (!session?.accessToken || !projectId) return;
    
    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    
    // Create optimistic element (show immediately)
    const optimisticElement: CanvasElement = {
      id: tempId,
      type: elementData.type!,
      positionX: elementData.positionX!,
      positionY: elementData.positionY!,
      width: elementData.width!,
      height: elementData.height!,
      content: elementData.content || '',
      styleData: elementData.styleData!,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to UI immediately (optimistic update)
    setElements(prev => [...prev, optimisticElement]);
    
    try {
      // Send to backend in background
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/elements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`
          },
          body: JSON.stringify({
            type: elementData.type,
            x: elementData.positionX,
            y: elementData.positionY,
            width: elementData.width,
            height: elementData.height,
            content: elementData.content,
            color: elementData.styleData?.color,
            style: elementData.styleData
          })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        // Replace optimistic element with real element from backend
        const processedElement = {
          ...data.element,
          positionX: typeof data.element.positionX === 'string' ? parseFloat(data.element.positionX) : Number(data.element.positionX),
          positionY: typeof data.element.positionY === 'string' ? parseFloat(data.element.positionY) : Number(data.element.positionY),
          width: typeof data.element.width === 'string' ? parseFloat(data.element.width) : Number(data.element.width),
          height: typeof data.element.height === 'string' ? parseFloat(data.element.height) : Number(data.element.height)
        };
        
        setElements(prev => prev.map(el => 
          el.id === tempId ? processedElement : el
        ));
      } else {
        console.error('Failed to create element:', data.error);
        // Remove optimistic element on failure
        setElements(prev => prev.filter(el => el.id !== tempId));
      }
    } catch (error) {
      console.error('Error creating element:', error);
      // Remove optimistic element on error
      setElements(prev => prev.filter(el => el.id !== tempId));
    }
  };

  // Update element with optimistic updates
  const updateElement = async (elementId: string, updateData: Partial<CanvasElement>) => {
    if (!session?.accessToken || !projectId) return;
    
    // Store current state for potential rollback
    const currentElement = elements.find(el => el.id === elementId);
    if (!currentElement) return;
    
    // Apply optimistic update immediately
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updateData } : el
    ));
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/elements/${elementId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`
          },
          body: JSON.stringify(updateData)
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        // Sync with backend response (in case backend modified the data)
        const processedElement = {
          ...data.element,
          positionX: typeof data.element.positionX === 'string' ? parseFloat(data.element.positionX) : Number(data.element.positionX),
          positionY: typeof data.element.positionY === 'string' ? parseFloat(data.element.positionY) : Number(data.element.positionY),
          width: typeof data.element.width === 'string' ? parseFloat(data.element.width) : Number(data.element.width),
          height: typeof data.element.height === 'string' ? parseFloat(data.element.height) : Number(data.element.height)
        };
        setElements(prev => prev.map(el => 
          el.id === elementId ? { ...el, ...processedElement } : el
        ));
      } else {
        console.error('Failed to update element:', data.error);
        // Rollback on failure
        setElements(prev => prev.map(el => 
          el.id === elementId ? currentElement : el
        ));
      }
    } catch (error) {
      console.error('Error updating element:', error);
      // Rollback on error
      setElements(prev => prev.map(el => 
        el.id === elementId ? currentElement : el
      ));
    }
  };

  // Delete element with optimistic updates
  const deleteElement = async (elementId: string) => {
    if (!session?.accessToken || !projectId) return;
    
    // Store current element for potential restoration
    const elementToDelete = elements.find(el => el.id === elementId);
    if (!elementToDelete) return;
    
    // Remove element immediately (optimistic delete)
    setElements(prev => prev.filter(el => el.id !== elementId));
    setSelectedElement(null);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/elements/${elementId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.accessToken}`
          }
        }
      );
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('Failed to delete element:', data.error);
        // Restore element on failure
        setElements(prev => [...prev, elementToDelete]);
      }
      // If successful, element is already removed from UI
    } catch (error) {
      console.error('Error deleting element:', error);
      // Restore element on error
      setElements(prev => [...prev, elementToDelete]);
    }
  };

  // Load elements on component mount
  useEffect(() => {
    fetchElements();
  }, [fetchElements]);

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const zoomFactor = 0.1;
    const delta = -e.deltaY;
    
    setScale(prevScale => {
      const newScale = delta > 0 
        ? Math.min(3, prevScale + zoomFactor) 
        : Math.max(0.3, prevScale - zoomFactor);
      return newScale;
    });
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          setScale(prev => Math.min(3, prev + 0.1));
        } else if (e.key === '-') {
          e.preventDefault();
          setScale(prev => Math.max(0.3, prev - 0.1));
        } else if (e.key === '0') {
          e.preventDefault();
          setScale(1);
          setPanX(0);
          setPanY(0);
        }
      }
      
      // Pan with arrow keys
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!selectedElement) { // Only pan if no element is selected
          e.preventDefault();
          const panAmount = 50;
          
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
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElement, deleteElement]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool === 'select') {
      setSelectedElement(null);
      return;
    }

    if (tool === 'move') {
      // Pan tool doesn't create elements, just pans
      return;
    }

    if (['STICKY_NOTE', 'TEXT', 'SHAPE'].includes(tool)) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panX) / scale;
        const y = (e.clientY - rect.top - panY) / scale;
        
        const newElement: Partial<CanvasElement> = {
          type: tool as 'STICKY_NOTE' | 'TEXT' | 'SHAPE',
          positionX: x,
          positionY: y,
          width: tool === 'TEXT' ? 200 : 150,
          height: tool === 'TEXT' ? 30 : 150,
          content: tool === 'STICKY_NOTE' ? '' : tool === 'TEXT' ? '' : '',
          styleData: { 
            color: selectedColor,
            ...(tool === 'SHAPE' && { shapeType: selectedShape })
          }
        };
        
        createElement(newElement);
        // Automatically switch to select tool after placing an element
        setTool('select');
      }
    }
  };

  const handleElementClick = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (tool === 'select') {
      setSelectedElement(elementId);
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
      setElements(prev => prev.map(el => 
        el.id === editingElement ? { ...el, content: editingText } : el
      ));
      
      // Exit editing mode immediately
      setEditingElement(null);
      setEditingText('');
      
      // Sync with backend in background
      updateElement(editingElement, { content: editingText });
    }
  };

  const handleElementMouseDown = (elementId: string, e: React.MouseEvent) => {
    if (tool !== 'select') return;
    
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    setSelectedElement(elementId);
    setIsDragging(true);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left - panX) / scale;
      const y = (e.clientY - rect.top - panY) / scale;
      
      setDragOffset({
        x: x - element.positionX,
        y: y - element.positionY
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle element dragging
    if (isDragging && selectedElement && !isPanning) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panX) / scale - dragOffset.x;
        const y = (e.clientY - rect.top - panY) / scale - dragOffset.y;
        
        setElements(prev => prev.map(el => 
          el.id === selectedElement 
            ? { ...el, positionX: x, positionY: y }
            : el
        ));
      }
    }
    
    // Handle canvas panning
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      
      setPanX(prev => prev + deltaX);
      setPanY(prev => prev + deltaY);
      
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (isDragging && selectedElement) {
      const element = elements.find(el => el.id === selectedElement);
      if (element) {
        updateElement(selectedElement, {
          positionX: element.positionX,
          positionY: element.positionY
        });
      }
    }
    setIsDragging(false);
    setIsPanning(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
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
      '#6b7280': 'bg-gray-200'
    };
    
    return colorMap[color] || 'bg-yellow-200';
  };

  // Helper function to create placeholder color with opacity
  const getPlaceholderColor = (element: CanvasElement) => {
    const color = element.styleData?.color || '#fbbf24';
    return color + '80'; // Add 50% opacity (80 in hex)
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
          <svg width={width} height={height} className="pointer-events-none">
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
          <svg width={width} height={height} className="pointer-events-none">
            <rect
              x="2"
              y="2"
              width={width - 4}
              height={height - 4}
              rx="4"
              {...commonProps}
            />
          </svg>
        );
      
      case 'triangle':
        return (
          <svg width={width} height={height} className="pointer-events-none">
            <polygon
              points={`${width/2},4 ${width-4},${height-4} 4,${height-4}`}
              {...commonProps}
            />
          </svg>
        );
      
      case 'diamond':
        return (
          <svg width={width} height={height} className="pointer-events-none">
            <polygon
              points={`${width/2},4 ${width-4},${height/2} ${width/2},${height-4} 4,${height/2}`}
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
          <svg width={width} height={height} className="pointer-events-none">
            <polygon points={points.trim()} {...commonProps} />
          </svg>
        );
      
      case 'arrow':
        return (
          <svg width={width} height={height} className="pointer-events-none">
            <polygon
              points={`4,${height/2} ${width*0.7},4 ${width*0.7},${height*0.3} ${width-4},${height/2} ${width*0.7},${height*0.7} ${width*0.7},${height-4}`}
              {...commonProps}
            />
          </svg>
        );
      
      default:
        return (
          <svg width={width} height={height} className="pointer-events-none">
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
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="bg-white border-r border-gray-200 p-4 w-64 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            {tools.map((toolItem) => (
              <button
                key={toolItem.id}
                onClick={() => setTool(toolItem.id)}
                className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                  tool === toolItem.id 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <toolItem.icon className="w-5 h-5" />
                <span className="text-xs">{toolItem.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Colors</h3>
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-lg border-2 ${
                  selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {tool === 'SHAPE' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Shapes</h3>
            <div className="grid grid-cols-2 gap-2">
              {shapes.map((shape) => (
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
            <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Element</h3>
            <div className="space-y-2">
              {(() => {
                const element = elements.find(el => el.id === selectedElement);
                const hasEditableText = element && (element.type === 'TEXT' || element.type === 'STICKY_NOTE');
                
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
                        className="w-full p-2 text-left text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Text
                      </button>
                    )}
                    <button
                      onClick={() => deleteElement(selectedElement)}
                      className="w-full p-2 text-left text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className={`w-full h-full relative ${
            isPanning ? 'cursor-grabbing' :
            tool === 'select' ? 'cursor-default' :
            tool === 'move' ? 'cursor-grab' :
            'cursor-crosshair'
          }`}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
          style={{
            transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
            transformOrigin: '0 0'
          }}
        >
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, #000 1px, transparent 1px),
                linear-gradient(to bottom, #000 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />

          {elements.map((element) => (
            <div
              key={element.id}
              className={`absolute cursor-pointer select-none ${
                element.type === 'TEXT' 
                  ? `text-gray-800 ${selectedElement === element.id ? 'ring-2 ring-indigo-500 bg-white bg-opacity-20 rounded' : ''}` 
                  : element.type === 'SHAPE'
                  ? `${selectedElement === element.id ? 'ring-2 ring-indigo-500 rounded' : ''}`
                  : `${getElementColor(element)} p-3 rounded-lg shadow-sm flex flex-col justify-between ${selectedElement === element.id ? 'ring-2 ring-indigo-500' : ''}`
              }`}
              style={{
                left: `${element.positionX}px`,
                top: `${element.positionY}px`,
                width: element.type === 'TEXT' ? 'auto' : `${element.width}px`,
                height: element.type === 'TEXT' ? 'auto' : `${element.height}px`,
                transform: 'translate(-50%, -50%)',
                fontSize: element.type === 'TEXT' ? '16px' : undefined,
                fontWeight: element.type === 'TEXT' ? '500' : undefined,
                color: element.type === 'TEXT' ? element.styleData?.color || '#374151' : undefined,
                minWidth: element.type === 'TEXT' ? '100px' : undefined
              }}
              onClick={(e) => handleElementClick(element.id, e)}
              onDoubleClick={(e) => handleElementDoubleClick(element.id, e)}
              onMouseDown={(e) => handleElementMouseDown(element.id, e)}
            >
              {element.type === 'TEXT' ? (
                // Text element rendering
                editingElement === element.id ? (
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={handleTextSubmit}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTextSubmit();
                      }
                    }}
                    className="border-none outline-none bg-transparent text-inherit font-inherit"
                    style={{ 
                      fontSize: 'inherit',
                      fontWeight: 'inherit',
                      color: 'inherit',
                      width: '100%'
                    }}
                    autoFocus
                  />
                ) : (
                  <span>
                    {element.content || (
                      <span 
                        className="italic"
                        style={{ color: getPlaceholderColor(element) }}
                      >
                        Add your text...
                      </span>
                    )}
                  </span>
                )
              ) : element.type === 'SHAPE' ? (
                // Shape element rendering
                renderShape(element)
              ) : (
                // Non-text element rendering (sticky notes, shapes)
                <>
                  {editingElement === element.id ? (
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={handleTextSubmit}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleTextSubmit();
                        }
                      }}
                      className="w-full h-full resize-none border-none outline-none bg-transparent text-sm"
                      autoFocus
                    />
                  ) : (
                    <div className="text-sm text-gray-800 mb-2 flex-1 overflow-hidden">
                      {element.content || (
                        <span 
                          className="italic"
                          style={{ color: getPlaceholderColor(element) }}
                        >
                          {element.type === 'STICKY_NOTE' ? 'Add your idea...' : 'Click to edit...'}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2">
          <button 
            onClick={() => setScale(Math.max(0.3, scale - 0.1))}
            className="p-2 hover:bg-gray-100 rounded text-lg font-bold"
            title="Zoom out (Ctrl + -)"
          >
            -
          </button>
          <button
            onClick={() => setScale(1)}
            className="text-sm font-medium w-16 text-center hover:bg-gray-100 rounded px-2 py-1"
            title="Reset zoom (Ctrl + 0)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button 
            onClick={() => setScale(Math.min(3, scale + 0.1))}
            className="p-2 hover:bg-gray-100 rounded text-lg font-bold"
            title="Zoom in (Ctrl + +)"
          >
            +
          </button>
        </div>

        {/* Help tooltip */}
        {showHelp && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white text-xs rounded-lg p-3 max-w-xs">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium">Keyboard Shortcuts</span>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-white hover:text-gray-300 ml-2"
              >
                ×
              </button>
            </div>
            <div className="space-y-1">
              <div><strong>Scroll:</strong> Zoom in/out</div>
              <div><strong>Middle Click + Drag:</strong> Pan canvas</div>
              <div><strong>Delete:</strong> Remove selected element</div>
              <div><strong>Escape:</strong> Deselect element</div>
              <div><strong>+/- Keys:</strong> Zoom in/out</div>
              <div><strong>Arrow Keys:</strong> Pan canvas</div>
              <div><strong>Ctrl + 0:</strong> Reset zoom & center</div>
            </div>
          </div>
        )}

        {/* Show help button when help is hidden */}
        {!showHelp && (
          <button
            onClick={() => setShowHelp(true)}
            className="absolute top-4 right-4 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 text-sm"
            title="Show keyboard shortcuts"
          >
            ?
          </button>
        )}
      </div>
    </div>
  );
}; 