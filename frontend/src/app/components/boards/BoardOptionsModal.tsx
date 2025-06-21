import React from 'react';
import { Edit, Copy, Share, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Board } from '../../types';

interface BoardOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board | null;
  onEdit: (boardId: string) => void;
  onDuplicate: (boardId: string) => void;
  onShare: (boardId: string) => void;
  onDelete: (boardId: string) => void;
}

export const BoardOptionsModal = ({
  isOpen,
  onClose,
  board,
  onEdit,
  onDuplicate,
  onShare,
  onDelete,
}: BoardOptionsModalProps) => {
  if (!board) return null;

  const options = [
    {
      icon: Edit,
      label: 'Rename Board',
      action: () => onEdit(board.id),
      color: 'text-gray-700',
    },
    {
      icon: Copy,
      label: 'Duplicate Board',
      action: () => onDuplicate(board.id),
      color: 'text-gray-700',
    },
    {
      icon: Share,
      label: 'Share Board',
      action: () => onShare(board.id),
      color: 'text-gray-700',
    },
    {
      icon: Trash2,
      label: 'Delete Board',
      action: () => onDelete(board.id),
      color: 'text-red-600',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={board.name}>
      <div className='p-4'>
        <div className='space-y-1'>
          {options.map(option => (
            <button
              key={option.label}
              onClick={() => {
                option.action();
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-100 transition-colors ${option.color}`}
            >
              <option.icon className='w-4 h-4' />
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
