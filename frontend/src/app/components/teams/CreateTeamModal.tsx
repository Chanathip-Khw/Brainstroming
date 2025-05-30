import React, { useState } from 'react';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTeam: (teamName: string, inviteEmails: string[]) => void;
}

export const CreateTeamModal = ({ isOpen, onClose, onCreateTeam }: CreateTeamModalProps) => {
  const [teamName, setTeamName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim()) {
      try {
        setIsSubmitting(true);
        setSubmitStatus('idle');
        setSubmitMessage('');
        
        await onCreateTeam(teamName.trim(), emails);
        
        setSubmitStatus('success');
        setSubmitMessage(`Team "${teamName}" created successfully${emails.length > 0 ? ' and invites sent!' : '!'}`);
        
        // Reset form after successful submission
        setTimeout(() => {
          setTeamName('');
          setCurrentEmail('');
          setEmails([]);
          setSubmitStatus('idle');
          setSubmitMessage('');
          onClose();
        }, 1500);
      } catch (error) {
        setSubmitStatus('error');
        setSubmitMessage('Failed to create team. Please try again.');
        console.error('Error creating team:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const addEmail = () => {
    if (currentEmail.trim() && isValidEmail(currentEmail.trim())) {
      setEmails([...emails, currentEmail.trim()]);
      setCurrentEmail('');
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
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
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite Members
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={addEmail}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                disabled={isSubmitting || !currentEmail.trim() || !isValidEmail(currentEmail.trim())}
              >
                Add
              </button>
            </div>
            {!isValidEmail(currentEmail) && currentEmail.trim() !== '' && (
              <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
            )}
          </div>

          {emails.length > 0 && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invited Members
              </label>
              <div className="flex flex-wrap gap-2">
                {emails.map((email, index) => (
                  <div 
                    key={index} 
                    className="flex items-center bg-gray-100 px-3 py-1 rounded-full"
                  >
                    <span className="text-sm">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                      disabled={isSubmitting}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded">
              <Check size={16} />
              <span className="text-sm">{submitMessage}</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle size={16} />
              <span className="text-sm">{submitMessage}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center"
              disabled={isSubmitting || !teamName.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}; 