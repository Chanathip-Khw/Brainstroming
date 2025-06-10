'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Zap, MoreHorizontal, Mail, Settings } from 'lucide-react';
import { CreateTeamModal } from '../components/teams/CreateTeamModal';
import { TeamSettingsModal } from '../components/teams/TeamSettingsModal';
import { CreateBoardModal } from '../components/boards/CreateBoardModal';
import { BoardOptionsModal } from '../components/boards/BoardOptionsModal';
import { RenameBoardModal } from '../components/boards/RenameBoardModal';
import { Toast } from '../components/ui/Toast';
import { Team, Board } from '../types';
import LogoutButton from '../components/LogoutButton';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<number>(0);

  // Fetch user's workspaces
  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      setLoading(true); // Ensure loading state is set
      
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.workspaces && Array.isArray(data.workspaces)) {
          // Map backend workspaces to frontend team structure
          const mappedTeams = data.workspaces.map((workspace: any) => ({
            id: workspace.id,
            name: workspace.name,
            members: workspace.members?.map((member: any) => ({
              id: member.user.id,
              name: member.user.name,
              email: member.user.email,
              avatar: member.user.avatarUrl || '/api/placeholder/40/40'
            })) || [],
            memberCount: workspace._count?.members || workspace.members?.length || 1,
            boards: [] // Boards will be fetched when needed
          }));
          setTeams(mappedTeams);
          
          // If there are teams, fetch boards for the first team
          if (mappedTeams.length > 0) {
            fetchWorkspaceProjects(mappedTeams[0].id);
          }
        } else {
          console.error("Invalid workspace data format:", data);
          setTeams([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching workspaces:", err);
        setTeams([]);
        setLoading(false);
      });

      // Fetch pending invites
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/invites`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.invites) {
          setPendingInvites(data.invites.length);
        }
      })
      .catch(err => {
        console.error("Error fetching invites:", err);
        setPendingInvites(0);
      });
    }
  }, [status, session]);

  // Fetch projects for a workspace
  const fetchWorkspaceProjects = async (workspaceId: string) => {
    if (!session?.accessToken) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/${workspaceId}/projects`, 
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success && data.projects) {
        // Map projects to board structure
        const boards = data.projects.map((project: any) => ({
          id: project.id,
          name: project.name,
          createdAt: new Date(project.createdAt).toISOString().split('T')[0],
          lastModified: formatLastModified(project.updatedAt)
        }));
        
        // Update the teams state with the fetched boards using functional update
        // to avoid stale state issues
        setTeams(prevTeams => 
          prevTeams.map(team => 
            team.id === workspaceId 
              ? { ...team, boards }
              : team
          )
        );
      } else {
        console.error(`Error fetching projects: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error fetching projects for workspace ${workspaceId}:`, error);
    }
  };
  
  // Helper function to format last modified date
  const formatLastModified = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  };

  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [showBoardOptionsModal, setShowBoardOptionsModal] = useState(false);
  const [showRenameBoardModal, setShowRenameBoardModal] = useState(false);
  const [showTeamSettingsModal, setShowTeamSettingsModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, visible: true });
  };

  // Hide toast notification
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleCreateTeam = async (teamName: string, inviteEmails: string[]) => {
    try {
      if (!session?.accessToken) return;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          name: teamName,
          description: `Workspace for ${teamName}`
        })
      });
      
      const data = await response.json();
      
      if (data.workspace) {
        const newTeam: Team = {
          id: data.workspace.id,
          name: data.workspace.name,
          members: [
            { 
              id: data.workspace.owner.id, 
              name: data.workspace.owner.name, 
              email: data.workspace.owner.email, 
              avatar: data.workspace.owner.avatarUrl || '/api/placeholder/40/40' 
            }
          ],
          boards: []
        };
        setTeams([...teams, newTeam]);
        
        // Send invites if there are any emails
        if (inviteEmails.length > 0) {
          const invites = inviteEmails.map(email => ({ email }));
          
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/invites`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.accessToken}`
            },
            body: JSON.stringify({
              workspaceId: data.workspace.id,
              invites
            })
          });
        }
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const handleCreateBoard = async (teamId: string, boardName: string, template: string) => {
    try {
      if (!session?.accessToken) return;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          workspaceId: teamId,
          name: boardName,
          description: `Board for ${boardName}`,
          isTemplate: false,
          templateType: template
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.project) {
        // Fetch the latest projects from the API instead of manually updating the state
        fetchWorkspaceProjects(teamId);
      } else {
        console.error('Error creating board:', data.error);
      }
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  const handleBoardOptions = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBoard(board);
    setShowBoardOptionsModal(true);
  };

  const handleEditBoard = (boardId: string) => {
    // Close options modal and open rename modal
    setShowBoardOptionsModal(false);
    setShowRenameBoardModal(true);
  };

  const handleRenameBoard = async (boardId: string, newName: string) => {
    try {
      if (!session?.accessToken) return;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${boardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          name: newName
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.project) {
        // Update the board name in the state
        setTeams(prevTeams => 
          prevTeams.map(team => ({
            ...team,
            boards: team.boards.map(board => 
              board.id === boardId 
                ? { ...board, name: newName }
                : board
            )
          }))
        );
      } else {
        console.error('Error renaming board:', data.error);
      }
    } catch (error) {
      console.error('Error renaming board:', error);
    }
  };

  const handleDuplicateBoard = async (boardId: string) => {
    const boardToDuplicate = teams.flatMap(team => team.boards).find(board => board.id === boardId);
    if (!boardToDuplicate || !session?.accessToken) return;
    
    // Find which team this board belongs to
    const teamWithBoard = teams.find(team => team.boards.some(board => board.id === boardId));
    if (!teamWithBoard) return;
    
    try {
      // Create a new board based on the duplicated one
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          workspaceId: teamWithBoard.id,
          name: `${boardToDuplicate.name} (Copy)`,
          description: `Copy of ${boardToDuplicate.name}`,
          isTemplate: false
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.project) {
        // Fetch the latest projects to include the new copy
        fetchWorkspaceProjects(teamWithBoard.id);
      } else {
        console.error('Error duplicating board:', data.error);
      }
    } catch (error) {
      console.error('Error duplicating board:', error);
    }
  };

  const handleShareBoard = (boardId: string) => {
    // Create the board URL
    const boardUrl = `${window.location.origin}/board/${boardId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(boardUrl)
      .then(() => {
        showToast(`Board link copied to clipboard`, 'success');
      })
      .catch(err => {
        console.error('Could not copy board link to clipboard:', err);
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = boardUrl;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          showToast(`Board link copied to clipboard`, 'success');
        } catch (err) {
          console.error('Fallback: Could not copy board link to clipboard:', err);
          showToast(`Please copy this link manually: ${boardUrl}`, 'error');
        }
        document.body.removeChild(textArea);
      });
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!session?.accessToken) return;
    
    // Find which team this board belongs to
    const teamWithBoard = teams.find(team => team.boards.some(board => board.id === boardId));
    if (!teamWithBoard) return;
    
    if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${boardId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.accessToken}`
          }
        });
        
        if (response.ok) {
          // Remove the board from the state
          setTeams(prevTeams => 
            prevTeams.map(team => ({
              ...team,
              boards: team.boards.filter(board => board.id !== boardId)
            }))
          );
        } else {
          const data = await response.json();
          console.error('Error deleting board:', data.error);
        }
      } catch (error) {
        console.error('Error deleting board:', error);
      }
    }
  };

  const handleJoinBoard = (boardId: string) => {
    router.push(`/board/${boardId}`);
  };

  const handleTeamSettings = (teamId: string) => {
    setSelectedTeamId(teamId);
    setShowTeamSettingsModal(true);
    // Fetch projects for the selected team
    fetchWorkspaceProjects(teamId);
  };

  const handleTeamUpdated = () => {
    // Refresh teams after update
    if (status === 'authenticated' && session?.accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.workspaces) {
          // Keep existing boards when updating teams
          const mappedTeams = data.workspaces.map((workspace: any) => {
            // Find existing team to preserve its boards
            const existingTeam = teams.find(team => team.id === workspace.id);
            
            return {
              id: workspace.id,
              name: workspace.name,
              members: [
                { 
                  id: workspace.owner.id, 
                  name: workspace.owner.name, 
                  email: workspace.owner.email, 
                  avatar: workspace.owner.avatarUrl || '/api/placeholder/40/40' 
                }
              ],
              // Preserve existing boards if the team exists
              boards: existingTeam ? existingTeam.boards : []
            };
          });
          setTeams(mappedTeams);
        }
      })
      .catch(err => {
        console.error("Error fetching workspaces:", err);
      });
    }
  };

  const handleTeamDeleted = () => {
    // Remove the deleted team from state
    setTeams(teams.filter(team => team.id !== selectedTeamId));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">BrainStorm</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {pendingInvites > 0 && (
              <button
                onClick={() => router.push('/invites')}
                className="relative bg-white text-indigo-600 px-4 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Invitations
                <span className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                  {pendingInvites}
                </span>
              </button>
            )}
            
            <button
              onClick={() => setShowCreateTeamModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Workspace
            </button>
            
            <div className="flex items-center gap-3">
              <img 
                src={session?.user?.image || '/api/placeholder/40/40'} 
                alt={session?.user?.name || 'User'} 
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = '/api/placeholder/40/40';
                }}
              />
              <span className="text-sm font-medium text-gray-700">{session?.user?.name}</span>
              <LogoutButton variant="text" className="text-gray-400 hover:text-gray-600" />
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Workspaces</h2>
          <p className="text-gray-600">Collaborate and brainstorm with your teams</p>
        </div>

        {teams.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Welcome to BrainStorm!</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              You don't have any workspaces yet. Create your first workspace to start collaborating with your team.
            </p>
            <button 
              onClick={() => setShowCreateTeamModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create Your First Workspace
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {teams.map((team) => (
              <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{team.name}</h3>
                      <p className="text-sm text-gray-500">{team.memberCount || team.members.length} members</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTeamSettings(team.id)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    
                    {team.members.slice(0, 3).map((member) => (
                      <img 
                        key={member.id} 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-8 h-8 rounded-full border-2 border-white"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/40/40';
                        }}
                      />
                    ))}
                    {(team.memberCount || team.members.length) > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        +{(team.memberCount || team.members.length) - 3}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3">
                  <h4 className="font-medium text-gray-900 mb-2">Recent Boards</h4>
                  {team.boards && team.boards.length > 0 ? (
                    team.boards.map((board) => (
                      <div key={board.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => handleJoinBoard(board.id)}>
                        <div>
                          <h5 className="font-medium text-gray-900">{board.name}</h5>
                          <p className="text-sm text-gray-500">Last modified {board.lastModified}</p>
                        </div>
                        <button 
                          onClick={(e) => handleBoardOptions(board, e)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No boards yet</p>
                  )}
                  
                  <button 
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setShowCreateBoardModal(true);
                    }}
                    className="p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Board
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateTeamModal
          isOpen={showCreateTeamModal}
          onClose={() => setShowCreateTeamModal(false)}
          onCreateTeam={handleCreateTeam}
        />

        <TeamSettingsModal
          isOpen={showTeamSettingsModal}
          onClose={() => setShowTeamSettingsModal(false)}
          teamId={selectedTeamId}
          onTeamUpdated={handleTeamUpdated}
          onTeamDeleted={handleTeamDeleted}
        />

        <CreateBoardModal
          isOpen={showCreateBoardModal}
          onClose={() => setShowCreateBoardModal(false)}
          onCreateBoard={handleCreateBoard}
          teamId={selectedTeamId}
        />

        <RenameBoardModal
          isOpen={showRenameBoardModal}
          onClose={() => setShowRenameBoardModal(false)}
          board={selectedBoard}
          onRename={handleRenameBoard}
        />

        <BoardOptionsModal
          isOpen={showBoardOptionsModal}
          onClose={() => setShowBoardOptionsModal(false)}
          board={selectedBoard}
          onEdit={handleEditBoard}
          onDuplicate={handleDuplicateBoard}
          onShare={handleShareBoard}
          onDelete={handleDeleteBoard}
        />

        {/* Toast notification */}
        {toast.visible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </main>
    </div>
  );
} 