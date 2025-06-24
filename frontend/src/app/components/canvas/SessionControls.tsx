import React from 'react';
import { Clock, Users } from 'lucide-react';

interface SessionControlsProps {
  currentTemplate: any;
  onOpenTemplates: () => void;
  onOpenTimer: () => void;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  currentTemplate,
  onOpenTemplates,
  onOpenTimer,
}) => {
  return (
    <div>
      <h3 className='text-sm font-medium text-gray-700 mb-3'>Session</h3>
      <div className='space-y-3'>
        <button
          onClick={onOpenTemplates}
          className='w-full p-3 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center justify-center gap-2 shadow-sm'
          title='Session Templates'
        >
          <Users className='w-4 h-4' />
          <span className='text-sm font-medium'>Templates</span>
        </button>

        <button
          onClick={onOpenTimer}
          className={`w-full p-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
            currentTemplate
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
          }`}
          title='Session Timer'
        >
          <Clock className='w-4 h-4' />
          <span className='text-sm font-medium'>
            {currentTemplate ? 'Running Timer' : 'Timer'}
          </span>
        </button>

        {currentTemplate && (
          <div className='p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700'>
            <div className='font-medium mb-1'>Active Session</div>
            <div>{currentTemplate.name}</div>
          </div>
        )}
      </div>
    </div>
  );
};
