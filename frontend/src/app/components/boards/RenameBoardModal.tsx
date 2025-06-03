import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Board } from '../../types';

interface RenameBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board | null;
  onRename: (boardId: string, newName: string) => void;
}

export const RenameBoardModal = ({ isOpen, onClose, board, onRename }: RenameBoardModalProps) => {
  const [boardName, setBoardName] = useState('');

  // Update board name when board changes
  useEffect(() => {
    if (board) {
      setBoardName(board.name);
    }
  }, [board]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (board && boardName.trim()) {
      onRename(board.id, boardName.trim());
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rename Board">
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Board Name
            </label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Enter board name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}; 