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

  const colors = [
    '#fbbf24', '#3b82f6', '#10b981', '#ec4899', 
    '#8b5cf6', '#f97316', '#ef4444', '#6b7280'
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

  // Create element on backend
  const createElement = async (elementData: Partial<CanvasElement>) => {
    if (!session?.accessToken || !projectId) return;
    
    try {
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
        // Convert decimal positions to numbers for the new element
        const processedElement = {
          ...data.element,
          positionX: typeof data.element.positionX === 'string' ? parseFloat(data.element.positionX) : Number(data.element.positionX),
          positionY: typeof data.element.positionY === 'string' ? parseFloat(data.element.positionY) : Number(data.element.positionY),
          width: typeof data.element.width === 'string' ? parseFloat(data.element.width) : Number(data.element.width),
          height: typeof data.element.height === 'string' ? parseFloat(data.element.height) : Number(data.element.height)
        };
        setElements(prev => [...prev, processedElement]);
      } else {
        console.error('Failed to create element:', data.error);
      }
    } catch (error) {
      console.error('Error creating element:', error);
    }
  };

  // Update element on backend
  const updateElement = async (elementId: string, updateData: Partial<CanvasElement>) => {
    if (!session?.accessToken || !projectId) return;
    
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
        // Convert decimal positions to numbers for the updated element
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
      }
    } catch (error) {
      console.error('Error updating element:', error);
    }
  };

  // Delete element on backend
  const deleteElement = async (elementId: string) => {
    if (!session?.accessToken || !projectId) return;
    
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
      
      if (data.success) {
        setElements(prev => prev.filter(el => el.id !== elementId));
        setSelectedElement(null);
      } else {
        console.error('Failed to delete element:', data.error);
      }
    } catch (error) {
      console.error('Error deleting element:', error);
    }
  };

  // Load elements on component mount
  useEffect(() => {
    fetchElements();
  }, [fetchElements]);

  // Handle mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const zoomFactor = 0.1;
      const delta = -e.deltaY;
      const newScale = delta > 0 
        ? Math.min(3, scale + zoomFactor) 
        : Math.max(0.3, scale - zoomFactor);
      
      setScale(newScale);
    };

    const canvasElement = canvasRef.current;
    if (canvasElement) {
      canvasElement.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        canvasElement.removeEventListener('wheel', handleWheel);
      };
    }
  }, [scale]);

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
      
      // Alternative zoom shortcuts without Ctrl
      if (e.key === '=' || e.key === '+') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setScale(prev => Math.min(3, prev + 0.1));
        }
      } else if (e.key === '-') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setScale(prev => Math.max(0.3, prev - 0.1));
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

    if (['STICKY_NOTE', 'TEXT', 'SHAPE'].includes(tool)) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panX) / scale;
        const y = (e.clientY - rect.top - panY) / scale;
        
        const newElement: Partial<CanvasElement> = {
          type: tool as 'STICKY_NOTE' | 'TEXT' | 'SHAPE',
          positionX: x,
          positionY: y,
          width: tool === 'TEXT' ? 300 : 200,
          height: tool === 'TEXT' ? 50 : 150,
          content: tool === 'STICKY_NOTE' ? 'New idea...' : tool === 'TEXT' ? 'Type here...' : '',
          styleData: { color: selectedColor }
        };
        
        createElement(newElement);
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
      updateElement(editingElement, { content: editingText });
      setEditingElement(null);
      setEditingText('');
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
    // Middle mouse button for panning
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

        {selectedElement && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Element</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const element = elements.find(el => el.id === selectedElement);
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
              <button
                onClick={() => deleteElement(selectedElement)}
                className="w-full p-2 text-left text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
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
            tool === 'move' ? 'cursor-move' :
            'cursor-crosshair'
          }`}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
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
              className={`absolute cursor-pointer select-none ${getElementColor(element)} p-3 rounded-lg shadow-sm flex flex-col justify-between ${
                selectedElement === element.id ? 'ring-2 ring-indigo-500' : ''
              }`}
              style={{
                left: `${element.positionX}px`,
                top: `${element.positionY}px`,
                width: `${element.width}px`,
                height: `${element.height}px`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={(e) => handleElementClick(element.id, e)}
              onDoubleClick={(e) => handleElementDoubleClick(element.id, e)}
              onMouseDown={(e) => handleElementMouseDown(element.id, e)}
            >
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
                  {element.content || 'Click to edit...'}
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-600 mt-auto">
                <span className="truncate">
                  {element.createdBy === user.id ? 'You' : 'User'}
                </span>
                <span>{new Date(element.createdAt).toLocaleDateString()}</span>
              </div>
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