import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Settings, Users, Trash2, Save, X, AlertTriangle, 
  UserPlus, Shield, ShieldAlert, LogOut, Loader2 
} from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Member {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  }
}

interface Team {
  id: string;
  name: string;
  description?: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  members: Member[];
}

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onTeamUpdated: () => void;
  onTeamDeleted: () => void;
}

export const TeamSettingsModal = ({ 
  isOpen, 
  onClose, 
  teamId, 
  onTeamUpdated, 
  onTeamDeleted 
}: TeamSettingsModalProps) => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('general');
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [invitingMember, setInvitingMember] = useState(false);
  const [processingMembers, setProcessingMembers] = useState<Record<string, boolean>>({});

  // Add effect to track showDeleteConfirm changes
  useEffect(() => {
    console.log("showDeleteConfirm state:", showDeleteConfirm);
  }, [showDeleteConfirm]);

  // Check if user is owner when team data is loaded
  useEffect(() => {
    if (team && session) {
      const isOwner = isCurrentUserOwner();
      console.log("Initial owner check:", isOwner);
    }
  }, [team, session]);

  // Fetch team details
  useEffect(() => {
    if (isOpen && teamId && session?.accessToken) {
      fetchTeamDetails();
      
      // Debug session data
      console.log("Full session data:", session);
    }
  }, [isOpen, teamId, session?.accessToken]);

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/${teamId}`, 
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch team details');
      }
      
      const data = await response.json();
      
      if (data.workspace) {
        setTeam(data.workspace);
        setTeamName(data.workspace.name);
        setTeamDescription(data.workspace.description || '');
        
        // Debug team data
        console.log("Full team data:", data.workspace);
      }
    } catch (error) {
      console.error('Error fetching team details:', error);
      setError('Failed to load team details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/${teamId}`, 
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`
          },
          body: JSON.stringify({
            name: teamName,
            description: teamDescription
          })
        }
      );
      
      if (!response.ok) {
        // Handle different error cases based on status code
        if (response.status === 403) {
          throw new Error('You do not have permission to update this team. Only owners and admins can make changes.');
        } else if (response.status === 404) {
          throw new Error('Team not found. It may have been deleted.');
        } else {
          // Try to get error message from response
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update team');
          } catch (jsonError) {
            throw new Error('Failed to update team');
          }
        }
      }
      
      const data = await response.json();
      
      if (data.workspace) {
        setTeam(data.workspace);
        setSuccess('Team updated successfully');
        onTeamUpdated();
      }
    } catch (error) {
      console.error('Error updating team:', error);
      setError(error instanceof Error ? error.message : 'Failed to update team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      setDeleting(true);
      setError(null);
      
      console.log(`Deleting team ${teamId}`);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/${teamId}`, 
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session?.accessToken}`
          }
        }
      );
      
      console.log('Delete response status:', response.status);
      
      if (!response.ok) {
        // Handle different error cases based on status code
        if (response.status === 403) {
          throw new Error('You do not have permission to delete this team. Only the team owner can delete it.');
        } else if (response.status === 404) {
          throw new Error('Team not found. It may have been deleted already.');
        } else {
          // Try to get error message from response
          try {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.error || 'Failed to delete team');
          } catch (jsonError) {
            throw new Error('Failed to delete team');
          }
        }
      }
      
      console.log('Team deleted successfully');
      setShowDeleteConfirm(false);
      onTeamDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting team:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete team. Please try again.');
      setDeleting(false);
    }
  };

  const handleInviteMember = async () => {
    if (!newMemberEmail.trim()) return;
    
    try {
      setInvitingMember(true);
      setError(null);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/invites`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`
          },
          body: JSON.stringify({
            workspaceId: teamId,
            invites: [{ email: newMemberEmail }]
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to invite member');
      }
      
      setNewMemberEmail('');
      setSuccess('Invitation sent successfully');
    } catch (error) {
      console.error('Error inviting member:', error);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setInvitingMember(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: 'ADMIN' | 'MEMBER') => {
    try {
      setProcessingMembers(prev => ({ ...prev, [memberId]: true }));
      setError(null);
      
      console.log(`Updating member ${memberId} to role ${role}`);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/${teamId}/members/${memberId}`, 
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`
          },
          body: JSON.stringify({ role })
        }
      );
      
      if (!response.ok) {
        // Handle different error cases based on status code
        if (response.status === 403) {
          throw new Error('You do not have permission to change member roles. Only the team owner can change roles.');
        } else if (response.status === 404) {
          throw new Error('Member not found. They may have been removed from the team.');
        } else {
          // Try to get error message from response
          try {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.error || 'Failed to update member role');
          } catch (jsonError) {
            throw new Error('Failed to update member role');
          }
        }
      }
      
      // Refresh team details
      await fetchTeamDetails();
      setSuccess('Member role updated successfully');
    } catch (error) {
      console.error('Error updating member role:', error);
      setError(error instanceof Error ? error.message : 'Failed to update member role. Please try again.');
    } finally {
      setProcessingMembers(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setProcessingMembers(prev => ({ ...prev, [memberId]: true }));
      setError(null);
      
      console.log(`Removing member ${memberId}`);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/${teamId}/members/${memberId}`, 
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session?.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        // Handle different error cases based on status code
        if (response.status === 403) {
          throw new Error('You do not have permission to remove members. Only owners and admins can remove members.');
        } else if (response.status === 404) {
          throw new Error('Member not found. They may have already been removed from the team.');
        } else {
          // Try to get error message from response
          try {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.error || 'Failed to remove member');
          } catch (jsonError) {
            throw new Error('Failed to remove member');
          }
        }
      }
      
      // Refresh team details
      await fetchTeamDetails();
      setSuccess('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove member. Please try again.');
    } finally {
      setProcessingMembers(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const isCurrentUserOwner = () => {
    // First, log all possible IDs from the session for debugging
    console.log("All session IDs:", {
      id: session?.user?.id,
      backendId: session?.user?.backendId,
      googleId: session?.user?.googleId,
      email: session?.user?.email
    });
    
    if (!session?.user || !team?.owner) {
      console.log("Missing user or owner data");
      return false;
    }
    
    // Try to match using backendId (which should match the database ID)
    if (session.user.backendId && team.owner.id) {
      const isOwner = session.user.backendId === team.owner.id;
      console.log("Owner check using backendId:", { 
        userBackendId: session.user.backendId, 
        teamOwnerId: team.owner.id, 
        isOwner 
      });
      return isOwner;
    }
    
    // If we can't find a direct ID match, try to match by email
    if (session.user.email && team.owner.email) {
      const isOwnerByEmail = session.user.email === team.owner.email;
      console.log("Owner check using email:", {
        userEmail: session.user.email,
        ownerEmail: team.owner.email,
        isOwnerByEmail
      });
      return isOwnerByEmail;
    }
    
    console.log("No matching IDs found between session and team owner");
    return false;
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> }
  ];

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
            <ShieldAlert className="w-3 h-3" />
            Owner
          </div>
        );
      case 'ADMIN':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
            <Shield className="w-3 h-3" />
            Admin
          </div>
        );
      default:
        return (
          <div className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
            Member
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Team Settings">
        <div className="p-6 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${team?.name || 'Team'} Settings`}>
      <div className="p-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <Save className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="space-y-4">
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
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Enter team description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={saving}
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => {
                  console.log("Delete button clicked, showing confirm dialog");
                  console.log("Is current user owner:", isCurrentUserOwner());
                  setShowDeleteConfirm(true);
                }}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                disabled={saving || !isCurrentUserOwner()}
                title={isCurrentUserOwner() ? "Delete this team" : "Only the team owner can delete the team"}
              >
                <Trash2 className="w-4 h-4" />
                Delete Team
              </button>

              <button
                onClick={handleSaveTeam}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Invite New Member */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite New Member
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={invitingMember}
                />
                <button
                  onClick={handleInviteMember}
                  disabled={invitingMember || !newMemberEmail.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {invitingMember ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Invite
                </button>
              </div>
            </div>

            {/* Members List */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Team Members</h3>
              <div className="space-y-3">
                {team?.members?.map((member) => {
                  // Check if this member is the owner by comparing with team owner ID
                  const isOwnerMember = member.user.id === team.owner.id || member.role === 'OWNER';
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.user.avatarUrl || '/api/placeholder/40/40'}
                          alt={member.user.name}
                          className="w-10 h-10 rounded-full"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // Fallback if the image fails to load
                            e.currentTarget.src = '/api/placeholder/40/40';
                          }}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{member.user.name}</p>
                          <p className="text-sm text-gray-500">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderRoleBadge(member.role)}
                        
                        {/* Role and Remove options - Only show for non-owner members if current user is owner */}
                        {isCurrentUserOwner() && !isOwnerMember && (
                          <div className="flex gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as 'ADMIN' | 'MEMBER')}
                              disabled={processingMembers[member.id]}
                              className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="MEMBER">Member</option>
                            </select>
                            
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={processingMembers[member.id]}
                              className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-50"
                              title="Remove member"
                            >
                              {processingMembers[member.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <LogOut className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Delete Team</h3>
              </div>
              
              <p className="mb-6 text-gray-700">
                Are you sure you want to delete <strong>{team?.name}</strong>? This action cannot be undone and all associated data will be lost.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    console.log("Cancel delete clicked");
                    setShowDeleteConfirm(false);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log("Confirm delete clicked");
                    handleDeleteTeam();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Team
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}; 