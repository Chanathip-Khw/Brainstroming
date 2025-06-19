import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Hand, Square, Type, Circle, Minus, Move, Vote, Trash2, Edit3, Group } from 'lucide-react';
import { User } from '../../types';
import { SessionTimer } from '../SessionTimer';
import { SessionTemplates } from '../SessionTemplates';
import { Clock, Users } from 'lucide-react';
import { useCollaboration } from '../../hooks/useCollaboration';
import LiveCursors from '../LiveCursors';
import { fetchApi } from '../../lib/api';

interface CanvasElement {
  id: string;
  type: 'STICKY_NOTE' | 'TEXT' | 'SHAPE' | 'GROUP';
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  content: string;
  styleData: {
    color: string;
    shapeType?: string;
    groupId?: string;
    [key: string]: any;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    votes: number;
  };
  votes?: {
    id: string;
    userId: string;
    type: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string;
    };
  }[];
}

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
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [timerNotification, setTimerNotification] = useState<string | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [templateSessionId, setTemplateSessionId] = useState<string | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Real-time collaboration
  const collaboration = useCollaboration({
    projectId,
    onElementCreated: (element) => {
      const processedElement = {
        ...element,
        positionX: typeof element.positionX === 'string' ? parseFloat(element.positionX) : Number(element.positionX),
        positionY: typeof element.positionY === 'string' ? parseFloat(element.positionY) : Number(element.positionY),
        width: typeof element.width === 'string' ? parseFloat(element.width) : Number(element.width),
        height: typeof element.height === 'string' ? parseFloat(element.height) : Number(element.height)
      };
      setElements(prev => [...prev, processedElement]);
    },
    onElementUpdated: (element) => {
      const processedElement = {
        ...element,
        positionX: typeof element.positionX === 'string' ? parseFloat(element.positionX) : Number(element.positionX),
        positionY: typeof element.positionY === 'string' ? parseFloat(element.positionY) : Number(element.positionY),
        width: typeof element.width === 'string' ? parseFloat(element.width) : Number(element.width),
        height: typeof element.height === 'string' ? parseFloat(element.height) : Number(element.height)
      };
      setElements(prev => prev.map(el => el.id === element.id ? processedElement : el));
    },
    onElementDeleted: (elementId) => {
      setElements(prev => prev.filter(el => el.id !== elementId));
    },
    onVoteAdded: (elementId, vote) => {
      setElements(prev => prev.map(el => {
        if (el.id === elementId) {
          // Check if vote already exists to prevent duplicates
          const existingVotes = el.votes || [];
          const voteExists = existingVotes.some(existingVote => 
            existingVote.userId === vote.userId && existingVote.id === vote.id
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
              votes: updatedVotes.length
            }
          };
        }
        return el;
      }));
    },
    onVoteRemoved: (elementId, userId) => {
      setElements(prev => prev.map(el => {
        if (el.id === elementId) {
          const updatedVotes = (el.votes || []).filter(vote => vote.userId !== userId);
          return {
            ...el,
            votes: updatedVotes,
            _count: {
              ...el._count,
              votes: updatedVotes.length
            }
          };
        }
        return el;
      }));
    }
  });

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
    { id: 'GROUP', icon: Group, label: 'Group' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'move', icon: Move, label: 'Pan' },
    { id: 'vote', icon: Vote, label: 'Vote' }
  ];

  // Fetch elements from backend
  const fetchElements = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const data = await fetchApi(`/api/projects/${projectId}/elements`);
      
      if (data.success) {
        console.log('Raw elements data from backend:', data.elements);
        // Convert decimal positions to numbers
        const processedElements = data.elements.map((element: any) => ({
          ...element,
          positionX: typeof element.positionX === 'string' ? parseFloat(element.positionX) : Number(element.positionX),
          positionY: typeof element.positionY === 'string' ? parseFloat(element.positionY) : Number(element.positionY),
          width: typeof element.width === 'string' ? parseFloat(element.width) : Number(element.width),
          height: typeof element.height === 'string' ? parseFloat(element.height) : Number(element.height)
        }));
        setElements(processedElements);
        console.log('Loaded elements with votes data:', processedElements);
      } else {
        console.error('Failed to fetch elements:', data.error);
      }
    } catch (error) {
      console.error('Error fetching elements:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Create element with optimistic updates
  const createElement = async (elementData: Partial<CanvasElement>) => {
    if (!projectId) return;
    
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
      const data = await fetchApi(`/api/projects/${projectId}/elements`, {
        method: 'POST',
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
      });
      
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
        
        // Emit real-time event
        collaboration.emitElementCreated(processedElement);
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
    if (!projectId) return;
    
    // Store current state for potential rollback
    const currentElement = elements.find(el => el.id === elementId);
    if (!currentElement) return;
    
    // Apply optimistic update immediately
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updateData } : el
    ));
    
    try {
      const data = await fetchApi(`/api/projects/${projectId}/elements/${elementId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
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
        
        // Emit real-time event
        collaboration.emitElementUpdated({ ...currentElement, ...processedElement });
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
    if (!projectId) return;
    
    // Store current element for potential restoration
    const elementToDelete = elements.find(el => el.id === elementId);
    if (!elementToDelete) return;
    
    // Remove element immediately (optimistic delete)
    setElements(prev => prev.filter(el => el.id !== elementId));
    setSelectedElement(null);
    
    try {
      const data = await fetchApi(`/api/projects/${projectId}/elements/${elementId}`, {
        method: 'DELETE'
      });
      
      if (!data.success) {
        console.error('Failed to delete element:', data.error);
        // Restore element on failure
        setElements(prev => [...prev, elementToDelete]);
      } else {
        // Emit real-time event
        collaboration.emitElementDeleted(elementId);
      }
      // If successful, element is already removed from UI
    } catch (error) {
      console.error('Error deleting element:', error);
      // Restore element on error
      setElements(prev => [...prev, elementToDelete]);
    }
  };

  // Add vote to element
  const addVote = async (elementId: string) => {
    if (!projectId) return;
    
    console.log('Attempting to add vote for element:', elementId);
    
    try {
      const data = await fetchApi(`/api/projects/${projectId}/elements/${elementId}/votes`, {
        method: 'POST',
        body: JSON.stringify({ type: 'LIKE' })
      });
      console.log('Add vote response:', data);
      
      if (data.success) {
        // Update local UI immediately for the voting user (optimistic update)
        setElements(prev => prev.map(el => {
          if (el.id === elementId) {
            // Check if vote already exists to prevent duplicates
            const existingVotes = el.votes || [];
            const voteExists = existingVotes.some(existingVote => 
              existingVote.userId === data.vote.userId
            );
            
            if (voteExists) {
              console.log('Vote already exists locally, skipping optimistic update');
              return el;
            }
            
            const updatedVotes = [...existingVotes, data.vote];
            return {
              ...el,
              votes: updatedVotes,
              _count: {
                ...el._count,
                votes: updatedVotes.length
              }
            };
          }
          return el;
        }));
        console.log('Vote added successfully');
        
        // Emit real-time event (this will update other users' UI)
        collaboration.emitVoteAdded(elementId, data.vote);
      } else {
        console.error('Failed to add vote:', data.error);
        alert('Failed to add vote: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding vote:', error);
      alert('Error adding vote: ' + error);
    }
  };

  // Remove vote from element
  const removeVote = async (elementId: string) => {
    if (!projectId) return;
    
    console.log('Attempting to remove vote for element:', elementId);
    
    try {
      const data = await fetchApi(`/api/projects/${projectId}/elements/${elementId}/votes`, {
        method: 'DELETE'
      });
      console.log('Remove vote response:', data);
      
      if (data.success) {
        // Update local UI immediately for the voting user (optimistic update)
        setElements(prev => prev.map(el => {
          if (el.id === elementId) {
            const updatedVotes = (el.votes || []).filter(vote => vote.userId !== user.id);
            return {
              ...el,
              votes: updatedVotes,
              _count: {
                ...el._count,
                votes: updatedVotes.length
              }
            };
          }
          return el;
        }));
        console.log('Vote removed successfully');
        
        // Emit real-time event (this will update other users' UI)
        collaboration.emitVoteRemoved(elementId);
      } else {
        console.error('Failed to remove vote:', data.error);
        alert('Failed to remove vote: ' + data.error);
      }
    } catch (error) {
      console.error('Error removing vote:', error);
      alert('Error removing vote: ' + error);
    }
  };

  // Check if user has voted on an element
  const hasUserVoted = (element: CanvasElement) => {
    console.log('Checking if user voted:', {
      elementId: element.id,
      userId: user.id,
      userIdType: typeof user.id,
      votes: element.votes,
      voteUserIds: element.votes?.map(vote => ({ userId: vote.userId, type: typeof vote.userId })),
      hasVotes: element.votes?.some(vote => {
        console.log('Comparing:', vote.userId, 'vs', user.id, 'equal:', vote.userId === user.id);
        return vote.userId === user.id;
      })
    });
    return element.votes?.some(vote => vote.userId === user.id) || false;
  };

  // Handle voting on element (only sticky notes)
  const handleElementVote = async (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'STICKY_NOTE') return;

    // First, let's check the current backend state for this element
    try {
      const voteData = await fetchApi(`/api/projects/${projectId}/elements/${elementId}/votes`);
      console.log('Current backend vote state:', voteData);
      
      if (voteData.success) {
        // Check if user has voted based on backend data
        const userHasVoted = voteData.userVoted;
        console.log('Backend says user voted:', userHasVoted);
        
        if (userHasVoted) {
          await removeVote(elementId);
        } else {
          await addVote(elementId);
        }
      } else {
        console.error('Failed to get vote state:', voteData.error);
      }
    } catch (error) {
      console.error('Error checking vote state:', error);
      // Fallback to frontend state
      const userHasVoted = hasUserVoted(element);
      console.log('Fallback - frontend thinks user voted:', userHasVoted);
      
      if (userHasVoted) {
        removeVote(elementId);
      } else {
        addVote(elementId);
      }
    }
  };

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
    
    return x >= groupLeft && x <= groupRight && y >= groupTop && y <= groupBottom;
  };

  // Find which group contains a point (if any)
  const findGroupAtPoint = (x: number, y: number) => {
    return elements.find(el => 
      el.type === 'GROUP' && isPointInGroup(x, y, el)
    );
  };

  // Add element to group
  const addElementToGroup = async (elementId: string, groupId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const updatedStyleData = {
      ...element.styleData,
      groupId: groupId
    };

    await updateElement(elementId, { styleData: updatedStyleData });
  };

  // Remove element from group
  const removeElementFromGroup = async (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const { groupId, ...restStyleData } = element.styleData;
    await updateElement(elementId, { styleData: restStyleData });
  };

  // Handle timer completion
  const handleTimerComplete = (activityName: string) => {
    setTimerNotification(activityName);
    
    // If running a template, advance to next activity
    if (currentTemplate && currentActivityIndex < currentTemplate.activities.length - 1) {
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
          content: tool === 'GROUP' ? 'Group Label' : tool === 'STICKY_NOTE' ? '' : tool === 'TEXT' ? '' : '',
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
    } else if (tool === 'vote') {
      const element = elements.find(el => el.id === elementId);
      // Only allow voting on sticky notes
      if (element?.type === 'STICKY_NOTE') {
        handleElementVote(elementId, e);
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

  const handleResizeMouseDown = (elementId: string, handle: string, e: React.MouseEvent) => {
    if (tool !== 'select') return;
    
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    setSelectedElement(elementId);
    setIsResizing(true);
    setResizeHandle(handle);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left - panX) / scale;
      const y = (e.clientY - rect.top - panY) / scale;
      
      setResizeStart({
        x,
        y,
        width: element.width,
        height: element.height
      });
    }
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
    if (isResizing && selectedElement && resizeHandle) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const currentX = (e.clientX - rect.left - panX) / scale;
        const currentY = (e.clientY - rect.top - panY) / scale;
        
        const deltaX = currentX - resizeStart.x;
        const deltaY = currentY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX: number | undefined;
        let newY: number | undefined;
        
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        
        // Calculate the fixed anchor point based on resize handle
        // Elements are centered, so we need to calculate the absolute corners first
        const currentLeft = element.positionX - element.width / 2;
        const currentRight = element.positionX + element.width / 2;
        const currentTop = element.positionY - element.height / 2;
        const currentBottom = element.positionY + element.height / 2;
        
        let fixedLeft = currentLeft;
        let fixedRight = currentRight;
        let fixedTop = currentTop;
        let fixedBottom = currentBottom;
        
        // Determine which edges are fixed based on the resize handle
        switch (resizeHandle) {
          case 'se': // Southeast: fix NW corner (top-left)
            fixedLeft = currentLeft;
            fixedTop = currentTop;
            newWidth = Math.max(50, currentX - fixedLeft);
            newHeight = Math.max(30, currentY - fixedTop);
            break;
          case 'sw': // Southwest: fix NE corner (top-right)
            fixedRight = currentRight;
            fixedTop = currentTop;
            newWidth = Math.max(50, fixedRight - currentX);
            newHeight = Math.max(30, currentY - fixedTop);
            break;
          case 'ne': // Northeast: fix SW corner (bottom-left)
            fixedLeft = currentLeft;
            fixedBottom = currentBottom;
            newWidth = Math.max(50, currentX - fixedLeft);
            newHeight = Math.max(30, fixedBottom - currentY);
            break;
          case 'nw': // Northwest: fix SE corner (bottom-right)
            fixedRight = currentRight;
            fixedBottom = currentBottom;
            newWidth = Math.max(50, fixedRight - currentX);
            newHeight = Math.max(30, fixedBottom - currentY);
            break;
          case 'e': // East: fix left edge
            fixedLeft = currentLeft;
            newWidth = Math.max(50, currentX - fixedLeft);
            newHeight = element.height; // Keep height unchanged
            break;
          case 'w': // West: fix right edge
            fixedRight = currentRight;
            newWidth = Math.max(50, fixedRight - currentX);
            newHeight = element.height; // Keep height unchanged
            break;
          case 'n': // North: fix bottom edge
            fixedBottom = currentBottom;
            newWidth = element.width; // Keep width unchanged
            newHeight = Math.max(30, fixedBottom - currentY);
            break;
          case 's': // South: fix top edge
            fixedTop = currentTop;
            newWidth = element.width; // Keep width unchanged
            newHeight = Math.max(30, currentY - fixedTop);
            break;
        }
        
        // Calculate new center position based on fixed edges and new dimensions
        switch (resizeHandle) {
          case 'se': // Fixed top-left corner
            newX = fixedLeft + newWidth / 2;
            newY = fixedTop + newHeight / 2;
            break;
          case 'sw': // Fixed top-right corner
            newX = fixedRight - newWidth / 2;
            newY = fixedTop + newHeight / 2;
            break;
          case 'ne': // Fixed bottom-left corner
            newX = fixedLeft + newWidth / 2;
            newY = fixedBottom - newHeight / 2;
            break;
          case 'nw': // Fixed bottom-right corner
            newX = fixedRight - newWidth / 2;
            newY = fixedBottom - newHeight / 2;
            break;
          case 'e': // Fixed left edge
            newX = fixedLeft + newWidth / 2;
            newY = element.positionY; // Keep Y unchanged
            break;
          case 'w': // Fixed right edge
            newX = fixedRight - newWidth / 2;
            newY = element.positionY; // Keep Y unchanged
            break;
          case 'n': // Fixed bottom edge
            newX = element.positionX; // Keep X unchanged
            newY = fixedBottom - newHeight / 2;
            break;
          case 's': // Fixed top edge
            newX = element.positionX; // Keep X unchanged
            newY = fixedTop + newHeight / 2;
            break;
        }
        
        setElements(prev => prev.map(el => 
          el.id === selectedElement 
            ? { 
                ...el, 
                width: newWidth, 
                height: newHeight,
                ...(newX !== undefined && { positionX: newX }),
                ...(newY !== undefined && { positionY: newY })
              }
            : el
        ));
      }
    }
    // Handle element dragging
    else if (isDragging && selectedElement && !isPanning && !isResizing) {
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
    if (isResizing && selectedElement) {
      const element = elements.find(el => el.id === selectedElement);
      if (element) {
        updateElement(selectedElement, {
          width: element.width,
          height: element.height,
          positionX: element.positionX,
          positionY: element.positionY
        });
      }
    } else if (isDragging && selectedElement) {
      const element = elements.find(el => el.id === selectedElement);
      if (element && element.type === 'STICKY_NOTE') {
        // Check if sticky note was dropped into a group
        const targetGroup = findGroupAtPoint(element.positionX, element.positionY);
        
        if (targetGroup && targetGroup.id !== element.styleData?.groupId) {
          // Add to new group
          console.log('Adding sticky note to group:', targetGroup.id);
          addElementToGroup(selectedElement, targetGroup.id);
        } else if (!targetGroup && element.styleData?.groupId) {
          // Remove from current group if dropped outside any group
          console.log('Removing sticky note from group');
          removeElementFromGroup(selectedElement);
        }
        
        // Update backend with final position
        updateElement(selectedElement, {
          positionX: element.positionX,
          positionY: element.positionY
        });
      } else if (element) {
        // Update backend with final position for non-sticky elements
        updateElement(selectedElement, {
          positionX: element.positionX,
          positionY: element.positionY
        });
      }
    }
    setIsDragging(false);
    setIsPanning(false);
    setIsResizing(false);
    setResizeHandle(null);
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

  // Helper function to get group color classes
  const getGroupColor = (element: CanvasElement) => {
    if (element.type !== 'GROUP') {
      return {
        border: 'border-gray-400',
        bg: 'bg-gray-50 bg-opacity-30',
        selectedBorder: 'border-indigo-500',
        selectedBg: 'bg-indigo-50',
        label: 'bg-gray-200 text-gray-700'
      };
    }

    const color = element.styleData?.color || '#6b7280';
    
    const colorMap: { [key: string]: any } = {
      '#fbbf24': { // yellow
        border: 'border-yellow-400',
        bg: 'bg-yellow-50 bg-opacity-40',
        selectedBorder: 'border-yellow-600',
        selectedBg: 'bg-yellow-100',
        label: 'bg-yellow-200 text-yellow-800'
      },
      '#3b82f6': { // blue
        border: 'border-blue-400',
        bg: 'bg-blue-50 bg-opacity-40',
        selectedBorder: 'border-blue-600',
        selectedBg: 'bg-blue-100',
        label: 'bg-blue-200 text-blue-800'
      },
      '#10b981': { // green
        border: 'border-green-400',
        bg: 'bg-green-50 bg-opacity-40',
        selectedBorder: 'border-green-600',
        selectedBg: 'bg-green-100',
        label: 'bg-green-200 text-green-800'
      },
      '#ec4899': { // pink
        border: 'border-pink-400',
        bg: 'bg-pink-50 bg-opacity-40',
        selectedBorder: 'border-pink-600',
        selectedBg: 'bg-pink-100',
        label: 'bg-pink-200 text-pink-800'
      },
      '#8b5cf6': { // purple
        border: 'border-purple-400',
        bg: 'bg-purple-50 bg-opacity-40',
        selectedBorder: 'border-purple-600',
        selectedBg: 'bg-purple-100',
        label: 'bg-purple-200 text-purple-800'
      },
      '#f97316': { // orange
        border: 'border-orange-400',
        bg: 'bg-orange-50 bg-opacity-40',
        selectedBorder: 'border-orange-600',
        selectedBg: 'bg-orange-100',
        label: 'bg-orange-200 text-orange-800'
      },
      '#ef4444': { // red
        border: 'border-red-400',
        bg: 'bg-red-50 bg-opacity-40',
        selectedBorder: 'border-red-600',
        selectedBg: 'bg-red-100',
        label: 'bg-red-200 text-red-800'
      },
      '#6b7280': { // gray (default)
        border: 'border-gray-400',
        bg: 'bg-gray-50 bg-opacity-30',
        selectedBorder: 'border-indigo-500',
        selectedBg: 'bg-indigo-50',
        label: 'bg-gray-200 text-gray-700'
      }
    };

    return colorMap[color] || colorMap['#6b7280'];
  };

  // Render resize handles for selected element
  const renderResizeHandles = (element: CanvasElement) => {
    if (selectedElement !== element.id) return null;
    
    // All elements get the same 8 resize handles
    const handles = [
      { id: 'nw', style: { top: '-4px', left: '-4px', cursor: 'nw-resize' } },
      { id: 'n', style: { top: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
      { id: 'ne', style: { top: '-4px', right: '-4px', cursor: 'ne-resize' } },
      { id: 'e', style: { top: '50%', right: '-4px', transform: 'translateY(-50%)', cursor: 'e-resize' } },
      { id: 'se', style: { bottom: '-4px', right: '-4px', cursor: 'se-resize' } },
      { id: 's', style: { bottom: '-4px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
      { id: 'sw', style: { bottom: '-4px', left: '-4px', cursor: 'sw-resize' } },
      { id: 'w', style: { top: '50%', left: '-4px', transform: 'translateY(-50%)', cursor: 'w-resize' } }
    ];

    return handles.map(handle => (
      <div
        key={handle.id}
        className="absolute w-2 h-2 bg-indigo-500 border border-white rounded-sm hover:bg-indigo-600 transition-colors"
        style={handle.style}
        onMouseDown={(e) => handleResizeMouseDown(element.id, handle.id, e)}
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
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-green-500 text-white px-8 py-4 rounded-lg shadow-xl animate-pulse">
          <div className="text-center">
            <div className="text-xl font-bold mb-1">Time's Up!</div>
            <div className="text-sm">{timerNotification} completed</div>
            <div className="text-xs mt-1 opacity-75">Great work! Ready for the next phase?</div>
          </div>
        </div>
      )}

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

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Session</h3>
          <div className="space-y-2">
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="w-full p-3 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center gap-2"
              title="Session Templates"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Templates</span>
            </button>
            
            <button
              onClick={() => setShowTimerModal(true)}
              className={`w-full p-3 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                currentTemplate 
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Session Timer"
            >
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">
                {currentTemplate ? 'Running Timer' : 'Timer'}
              </span>
            </button>
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
                const hasEditableText = element && (element.type === 'TEXT' || element.type === 'STICKY_NOTE' || element.type === 'GROUP');
                
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
                        {element?.type === 'GROUP' ? 'Edit Label' : 'Edit Text'}
                      </button>
                    )}

                    {/* Color picker for selected group */}
                    {element?.type === 'GROUP' && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 mb-2">Group Color</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {colors.map((color) => (
                            <button
                              key={color}
                              onClick={() => updateElement(selectedElement, { styleData: { ...element.styleData, color } })}
                              className={`w-6 h-6 rounded border-2 ${
                                element.styleData?.color === color ? 'border-gray-800' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {element?.type === 'GROUP' && (
                      <div className="p-2 bg-blue-50 rounded text-sm">
                        <div className="font-medium text-blue-800 mb-1">Group Info</div>
                        <div className="text-blue-600 space-y-1">
                          <div>Contains {getElementsInGroup(selectedElement).length} items</div>
                          {getGroupVoteCount(selectedElement) > 0 && (
                            <div className="font-semibold text-red-600">
                              Total votes: {getGroupVoteCount(selectedElement)}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-blue-500 mt-1">
                          Drag sticky notes into this group to organize them
                        </div>
                      </div>
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
            className="absolute opacity-10"
            style={{
              left: '-50000px',
              top: '-50000px',
              width: '100000px',
              height: '100000px',
              backgroundImage: `
                linear-gradient(to right, #000 1px, transparent 1px),
                linear-gradient(to bottom, #000 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />

          {elements
            .sort((a, b) => {
              // Groups should render first (behind other elements)
              if (a.type === 'GROUP' && b.type !== 'GROUP') return -1;
              if (b.type === 'GROUP' && a.type !== 'GROUP') return 1;
              return 0;
            })
            .map((element) => (
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
                color: element.type === 'TEXT' ? element.styleData?.color || '#374151' : undefined,
                minHeight: element.type === 'TEXT' ? '30px' : undefined
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
                      width: '100%',
                      resize: 'none'
                    }}
                    autoFocus
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center overflow-hidden p-2"
                    style={{ 
                      wordWrap: 'break-word',
                      lineHeight: '1.4',
                      textAlign: 'center'
                    }}
                  >
                    {element.content || (
                      <span 
                        className="italic"
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
                <div className="w-full h-full relative">
                  {/* Group label */}
                  <div className={`absolute -top-6 left-0 px-2 py-1 rounded text-xs font-medium ${getGroupColor(element).label}`}>
                    {editingElement === element.id ? (
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
                        style={{ fontSize: 'inherit', width: '80px' }}
                        autoFocus
                      />
                    ) : (
                      element.content || 'Group Label'
                    )}
                  </div>
                  
                  {/* Group stats */}
                  <div className="absolute -bottom-6 right-0 flex gap-2">
                    {/* Item count */}
                    <div className="bg-gray-600 text-white px-2 py-1 rounded text-xs">
                      {getElementsInGroup(element.id).length} items
                    </div>
                    
                    {/* Vote count (only show if there are votes) */}
                    {getGroupVoteCount(element.id) > 0 && (
                      <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        {getGroupVoteCount(element.id)} votes
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Non-text element rendering (sticky notes, shapes)
                <>
                  {/* Vote count indicator (only for sticky notes) */}
                  {element.type === 'STICKY_NOTE' && (element._count?.votes || 0) > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
                      {element._count?.votes}
                    </div>
                  )}
                  
                  {/* Voting indicator when vote tool is selected (only for sticky notes) */}
                  {tool === 'vote' && element.type === 'STICKY_NOTE' && (
                    <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full z-10 ${
                      hasUserVoted(element) ? 'bg-green-500' : 'bg-blue-500'
                    } opacity-70`} />
                  )}
                  
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
              {/* Resize handles */}
              {renderResizeHandles(element)}
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
          <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white text-xs rounded-lg p-3 max-w-xs z-30">
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
              <div><strong>Groups:</strong> Drag sticky notes into groups</div>
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

        {/* Live Cursors */}
        <LiveCursors
          cursors={collaboration.userCursors}
        />


      </div>
    </div>
  );
}; 