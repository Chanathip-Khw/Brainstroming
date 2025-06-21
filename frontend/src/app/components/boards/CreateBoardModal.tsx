import React, { useState } from 'react';
import { Modal } from '../ui/Modal';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (teamId: string, boardName: string, template: string) => void;
  teamId: string;
}

export const CreateBoardModal = ({
  isOpen,
  onClose,
  onCreateBoard,
  teamId,
}: CreateBoardModalProps) => {
  const [boardName, setBoardName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');

  const templates = [
    {
      id: 'blank',
      name: 'Blank Canvas',
      description: 'Start with an empty canvas',
    },
    {
      id: 'brainstorm',
      name: 'Brainstorming',
      description: 'Sticky notes for idea generation',
    },
    {
      id: 'retrospective',
      name: 'Retrospective',
      description: 'What went well, what could improve',
    },
    {
      id: 'user-journey',
      name: 'User Journey',
      description: 'Map user experiences and touchpoints',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (boardName.trim()) {
      onCreateBoard(teamId, boardName.trim(), selectedTemplate);
      setBoardName('');
      setSelectedTemplate('blank');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Create New Board'>
      <div className='p-6'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Board Name
            </label>
            <input
              type='text'
              value={boardName}
              onChange={e => setBoardName(e.target.value)}
              placeholder='Enter board name'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Choose Template
            </label>
            <div className='space-y-2'>
              {templates.map(template => (
                <label
                  key={template.id}
                  className='flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'
                >
                  <input
                    type='radio'
                    name='template'
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={e => setSelectedTemplate(e.target.value)}
                    className='mt-1'
                  />
                  <div>
                    <div className='font-medium text-gray-900'>
                      {template.name}
                    </div>
                    <div className='text-sm text-gray-500'>
                      {template.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className='flex gap-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
            >
              Create Board
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
