import React, { useState } from 'react';
import { Link, UserPlus, X, Crown, Shield, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { BoardSettings } from '../../types';

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardName: string;
  onSaveSettings: (settings: BoardSettings) => void;
}

export const BoardSettingsModal = ({
  isOpen,
  onClose,
  boardName,
  onSaveSettings,
}: BoardSettingsModalProps) => {
  const [settings, setSettings] = useState<BoardSettings>({
    boardName: boardName,
    isPublic: false,
    allowComments: true,
    allowVoting: true,
    allowExport: true,
    inviteLink: `https://brainstorm.app/board/${Math.random().toString(36).substring(2, 8)}`,
    members: [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'owner',
        avatar: '/api/placeholder/32/32',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'editor',
        avatar: '/api/placeholder/32/32',
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        role: 'viewer',
        avatar: '/api/placeholder/32/32',
      },
    ],
  });

  const [activeTab, setActiveTab] = useState('general');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'members', label: 'Members' },
    { id: 'permissions', label: 'Permissions' },
  ];

  const roles = [
    { id: 'owner', label: 'Owner', description: 'Full access and management' },
    { id: 'editor', label: 'Editor', description: 'Can edit and collaborate' },
    { id: 'viewer', label: 'Viewer', description: 'Can view and comment only' },
  ];

  const handleSave = () => {
    onSaveSettings(settings);
    onClose();
  };

  const handleInviteMember = () => {
    if (newMemberEmail.trim()) {
      const newMember = {
        id: Date.now().toString(),
        name: newMemberEmail.split('@')[0] || 'Unknown User',
        email: newMemberEmail.trim(),
        role: 'editor',
        avatar: '/api/placeholder/32/32',
      };
      setSettings({
        ...settings,
        members: [...settings.members, newMember],
      });
      setNewMemberEmail('');
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setSettings({
      ...settings,
      members: settings.members.filter(member => member.id !== memberId),
    });
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    setSettings({
      ...settings,
      members: settings.members.map(member =>
        member.id === memberId ? { ...member, role: newRole } : member
      ),
    });
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(settings.inviteLink);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className='p-0 w-full max-w-2xl'>
        <div className='flex items-center justify-between p-6 border-b border-gray-200'>
          <h2 className='text-xl font-semibold text-gray-900'>
            Board Settings
          </h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='flex border-b border-gray-200'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className='p-6 max-h-96 overflow-y-auto'>
          {activeTab === 'general' && (
            <div className='space-y-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Board Name
                </label>
                <input
                  type='text'
                  value={settings.boardName}
                  onChange={e =>
                    setSettings({ ...settings, boardName: e.target.value })
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-3'>
                  Board Visibility
                </label>
                <div className='space-y-3'>
                  <label className='flex items-center gap-3'>
                    <input
                      type='radio'
                      name='visibility'
                      checked={!settings.isPublic}
                      onChange={() =>
                        setSettings({ ...settings, isPublic: false })
                      }
                    />
                    <div className='flex items-center gap-2'>
                      <EyeOff className='w-4 h-4 text-gray-500' />
                      <span className='font-medium'>Private</span>
                    </div>
                    <span className='text-sm text-gray-500'>
                      Only invited members can access
                    </span>
                  </label>
                  <label className='flex items-center gap-3'>
                    <input
                      type='radio'
                      name='visibility'
                      checked={settings.isPublic}
                      onChange={() =>
                        setSettings({ ...settings, isPublic: true })
                      }
                    />
                    <div className='flex items-center gap-2'>
                      <Eye className='w-4 h-4 text-gray-500' />
                      <span className='font-medium'>Public</span>
                    </div>
                    <span className='text-sm text-gray-500'>
                      Anyone with the link can view
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-3'>
                  Invite Link
                </label>
                <div className='flex gap-2'>
                  <input
                    type='text'
                    value={settings.inviteLink}
                    readOnly
                    className='flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600'
                  />
                  <button
                    onClick={copyInviteLink}
                    className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2'
                  >
                    <Link className='w-4 h-4' />
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className='space-y-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-3'>
                  Invite New Member
                </label>
                <div className='flex gap-2'>
                  <input
                    type='email'
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    placeholder='Enter email address'
                    className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  />
                  <button
                    onClick={handleInviteMember}
                    className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2'
                  >
                    <UserPlus className='w-4 h-4' />
                    Invite
                  </button>
                </div>
              </div>

              <div>
                <h4 className='text-sm font-medium text-gray-700 mb-3'>
                  Current Members
                </h4>
                <div className='space-y-3'>
                  {settings.members.map(member => (
                    <div
                      key={member.id}
                      className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                    >
                      <div className='flex items-center gap-3'>
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className='w-8 h-8 rounded-full'
                        />
                        <div>
                          <div className='font-medium text-gray-900 flex items-center gap-2'>
                            {member.name}
                            {member.role === 'owner' && (
                              <Crown className='w-4 h-4 text-yellow-500' />
                            )}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <select
                          value={member.role}
                          onChange={e =>
                            handleRoleChange(member.id, e.target.value)
                          }
                          disabled={member.role === 'owner'}
                          className='text-sm border border-gray-300 rounded px-2 py-1'
                        >
                          {roles.map(role => (
                            <option key={role.id} value={role.id}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className='text-red-500 hover:text-red-700 p-1'
                          >
                            <X className='w-4 h-4' />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className='space-y-6'>
              <div>
                <h4 className='text-sm font-medium text-gray-700 mb-4'>
                  Board Permissions
                </h4>
                <div className='space-y-4'>
                  <label className='flex items-center justify-between'>
                    <div>
                      <div className='font-medium text-gray-900'>
                        Allow Comments
                      </div>
                      <div className='text-sm text-gray-500'>
                        Members can add comments to elements
                      </div>
                    </div>
                    <input
                      type='checkbox'
                      checked={settings.allowComments}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          allowComments: e.target.checked,
                        })
                      }
                      className='w-4 h-4 text-indigo-600'
                    />
                  </label>

                  <label className='flex items-center justify-between'>
                    <div>
                      <div className='font-medium text-gray-900'>
                        Allow Voting
                      </div>
                      <div className='text-sm text-gray-500'>
                        Members can vote on ideas
                      </div>
                    </div>
                    <input
                      type='checkbox'
                      checked={settings.allowVoting}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          allowVoting: e.target.checked,
                        })
                      }
                      className='w-4 h-4 text-indigo-600'
                    />
                  </label>

                  <label className='flex items-center justify-between'>
                    <div>
                      <div className='font-medium text-gray-900'>
                        Allow Export
                      </div>
                      <div className='text-sm text-gray-500'>
                        Members can export board content
                      </div>
                    </div>
                    <input
                      type='checkbox'
                      checked={settings.allowExport}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          allowExport: e.target.checked,
                        })
                      }
                      className='w-4 h-4 text-indigo-600'
                    />
                  </label>
                </div>
              </div>

              <div>
                <h4 className='text-sm font-medium text-gray-700 mb-3'>
                  Role Permissions
                </h4>
                <div className='space-y-3'>
                  {roles.map(role => (
                    <div
                      key={role.id}
                      className='p-3 border border-gray-200 rounded-lg'
                    >
                      <div className='flex items-center gap-2 mb-1'>
                        {role.id === 'owner' && (
                          <Crown className='w-4 h-4 text-yellow-500' />
                        )}
                        {role.id === 'editor' && (
                          <Shield className='w-4 h-4 text-blue-500' />
                        )}
                        {role.id === 'viewer' && (
                          <Eye className='w-4 h-4 text-gray-500' />
                        )}
                        <span className='font-medium text-gray-900'>
                          {role.label}
                        </span>
                      </div>
                      <div className='text-sm text-gray-500'>
                        {role.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className='flex justify-end gap-3 p-6 border-t border-gray-200'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
};
