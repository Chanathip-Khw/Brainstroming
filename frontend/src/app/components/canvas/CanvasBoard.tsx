import React, { useRef, useState } from 'react';
import { Hand, Square, Type, Circle, Minus, Move, Vote } from 'lucide-react';
import { User, CanvasElement } from '../../types';

interface CanvasBoardProps {
  user: User;
}

export const CanvasBoard = ({ user }: CanvasBoardProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<string>('select');
  const [elements, setElements] = useState<CanvasElement[]>([
    { id: '1', type: 'sticky', x: 200, y: 150, content: 'User needs better onboarding', color: 'bg-yellow-200', votes: 3, author: 'John' },
    { id: '2', type: 'sticky', x: 400, y: 200, content: 'Mobile app integration', color: 'bg-blue-200', votes: 1, author: 'Jane' },
    { id: '3', type: 'sticky', x: 300, y: 350, content: 'Improve search functionality', color: 'bg-green-200', votes: 5, author: 'Mike' }
  ]);
  const [selectedColor, setSelectedColor] = useState('bg-yellow-200');
  const [isVoting, setIsVoting] = useState(false);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const colors = [
    'bg-yellow-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200', 
    'bg-purple-200', 'bg-orange-200', 'bg-red-200', 'bg-gray-200'
  ];

  const tools = [
    { id: 'select', icon: Hand, label: 'Select' },
    { id: 'sticky', icon: Square, label: 'Sticky Note' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'shape', icon: Circle, label: 'Shape' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'move', icon: Move, label: 'Pan' }
  ];

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool === 'sticky') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - panX) / scale;
        const y = (e.clientY - rect.top - panY) / scale;
        
        const newElement: CanvasElement = {
          id: Date.now().toString(),
          type: 'sticky',
          x,
          y,
          content: 'New idea...',
          color: selectedColor,
          votes: 0,
          author: user.name
        };
        
        setElements([...elements, newElement]);
      }
    }
  };

  const handleVote = (elementId: string) => {
    if (isVoting) {
      setElements(elements.map(el => 
        el.id === elementId 
          ? { ...el, votes: (el.votes || 0) + 1 }
          : el
      ));
    }
  };

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
                className={`w-8 h-8 rounded-lg ${color} border-2 ${
                  selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
          <button
            onClick={() => setIsVoting(!isVoting)}
            className={`w-full p-3 rounded-lg flex items-center gap-2 transition-colors ${
              isVoting 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Vote className="w-4 h-4" />
            {isVoting ? 'Stop Voting' : 'Start Voting'}
          </button>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Templates</h3>
          <div className="space-y-2">
            <button className="w-full p-2 text-left text-sm text-gray-600 hover:bg-gray-100 rounded">
              Brainstorming
            </button>
            <button className="w-full p-2 text-left text-sm text-gray-600 hover:bg-gray-100 rounded">
              Retrospective
            </button>
            <button className="w-full p-2 text-left text-sm text-gray-600 hover:bg-gray-100 rounded">
              User Journey
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className="w-full h-full cursor-crosshair relative"
          onClick={handleCanvasClick}
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
              className={`absolute cursor-pointer select-none ${element.color} p-3 rounded-lg shadow-sm min-w-32 min-h-20 flex flex-col justify-between`}
              style={{
                left: element.x,
                top: element.y,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleVote(element.id);
              }}
            >
              <div className="text-sm text-gray-800 mb-2">{element.content}</div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{element.author}</span>
                {(element.votes || 0) > 0 && (
                  <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1">
                    <Vote className="w-3 h-3" />
                    {element.votes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2">
          <button 
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            -
          </button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(Math.min(2, scale + 0.1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}; 