import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Tool {
  id: string;
  icon: LucideIcon;
  label: string;
}

interface ToolPanelProps {
  tools: Tool[];
  selectedTool: string;
  onToolSelect: (toolId: string) => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  tools,
  selectedTool,
  onToolSelect,
}) => {
  return (
    <div>
      <h3 className='text-sm font-medium text-gray-700 mb-3'>Tools</h3>
      <div className='grid grid-cols-2 gap-2'>
        {tools.map(toolItem => (
          <button
            key={toolItem.id}
            onClick={() => onToolSelect(toolItem.id)}
            className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
              selectedTool === toolItem.id
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
  );
};
