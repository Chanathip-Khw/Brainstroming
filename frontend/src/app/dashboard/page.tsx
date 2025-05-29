'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Zap, MoreHorizontal } from 'lucide-react';
import { CreateTeamModal } from '../components/teams/CreateTeamModal';
import { CreateBoardModal } from '../components/boards/CreateBoardModal';
import { BoardOptionsModal } from '../components/boards/BoardOptionsModal';
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

  // Fetch user's workspaces
  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.workspaces) {
          // Map backend workspaces to frontend team structure
          const mappedTeams = data.workspaces.map((workspace: any) => ({
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
            boards: [] // You might want to fetch boards separately or include them in the workspace response
          }));
          setTeams(mappedTeams);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching workspaces:", err);
        setLoading(false);
      });
    }
  }, [status, session]);

  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [showBoardOptionsModal, setShowBoardOptionsModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

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
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const handleCreateBoard = (teamId: string, boardName: string, template: string) => {
    const newBoard: Board = {
      id: Date.now().toString(),
      name: boardName,
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: 'Just now'
    };

    setTeams(teams.map(team => 
      team.id === teamId 
        ? { ...team, boards: [...team.boards, newBoard] }
        : team
    ));
    console.log('Board created:', boardName, 'Template:', template);
  };

  const handleBoardOptions = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBoard(board);
    setShowBoardOptionsModal(true);
  };

  const handleEditBoard = (boardId: string) => {
    console.log('Edit board:', boardId);
  };

  const handleDuplicateBoard = (boardId: string) => {
    const boardToDuplicate = teams.flatMap(team => team.boards).find(board => board.id === boardId);
    if (boardToDuplicate) {
      const duplicatedBoard: Board = {
        ...boardToDuplicate,
        id: Date.now().toString(),
        name: `${boardToDuplicate.name} (Copy)`,
        lastModified: 'Just now'
      };
      
      setTeams(teams.map(team => ({
        ...team,
        boards: team.boards.find(board => board.id === boardId) 
          ? [...team.boards, duplicatedBoard]
          : team.boards
      })));
    }
  };

  const handleShareBoard = (boardId: string) => {
    console.log('Share board:', boardId);
  };

  const handleDeleteBoard = (boardId: string) => {
    setTeams(teams.map(team => ({
      ...team,
      boards: team.boards.filter(board => board.id !== boardId)
    })));
  };

  const handleJoinBoard = (boardId: string) => {
    router.push(`/board/${boardId}`);
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
            <button
              onClick={() => setShowCreateTeamModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Workspace
            </button>
            
            <div className="flex items-center gap-3">
              <img src={session?.user?.image || '/api/placeholder/40/40'} alt={session?.user?.name || 'User'} className="w-8 h-8 rounded-full" />
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
                      <p className="text-sm text-gray-500">{team.members.length} members</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {team.members.slice(0, 3).map((member) => (
                      <img key={member.id} src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border-2 border-white" />
                    ))}
                    {team.members.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        +{team.members.length - 3}
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

        <CreateBoardModal
          isOpen={showCreateBoardModal}
          onClose={() => setShowCreateBoardModal(false)}
          onCreateBoard={handleCreateBoard}
          teamId={selectedTeamId}
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
      </main>
    </div>
  );
} 