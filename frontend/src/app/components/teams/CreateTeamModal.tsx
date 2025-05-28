import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTeam: (teamName: string, inviteEmails: string[]) => void;
}

export const CreateTeamModal = ({ isOpen, onClose, onCreateTeam }: CreateTeamModalProps) => {
  const [teamName, setTeamName] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim()) {
      const emails = inviteEmails.split(',').map(email => email.trim()).filter(email => email);
      onCreateTeam(teamName.trim(), emails);
      setTeamName('');
      setInviteEmails('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Team">
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite Members (Email addresses)
            </label>
            <textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="john@example.com, jane@example.com"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
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
              Create Team
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}; 