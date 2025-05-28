'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Plus, LogOut, Zap, MoreHorizontal } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { CreateTeamModal } from '../components/teams/CreateTeamModal';
import { CreateBoardModal } from '../components/boards/CreateBoardModal';
import { BoardOptionsModal } from '../components/boards/BoardOptionsModal';
import { Team, Board } from '../types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const [teams, setTeams] = useState<Team[]>([
    {
      id: '1',
      name: 'Design Team',
      members: [
        { id: '1', name: session?.user?.name || 'User', email: session?.user?.email || '', avatar: session?.user?.image || '/api/placeholder/40/40' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: '/api/placeholder/40/40' }
      ],
      boards: [
        { id: '1', name: 'Product Brainstorm', createdAt: '2024-01-15', lastModified: '2 hours ago' },
        { id: '2', name: 'User Journey Map', createdAt: '2024-01-10', lastModified: '1 day ago' }
      ]
    },
    {
      id: '2',
      name: 'Marketing Team',
      members: [
        { id: '1', name: session?.user?.name || 'User', email: session?.user?.email || '', avatar: session?.user?.image || '/api/placeholder/40/40' }
      ],
      boards: [
        { id: '3', name: 'Campaign Ideas', createdAt: '2024-01-12', lastModified: '3 hours ago' }
      ]
    }
  ]);

  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [showBoardOptionsModal, setShowBoardOptionsModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const handleCreateTeam = (teamName: string, inviteEmails: string[]) => {
    const newTeam: Team = {
      id: Date.now().toString(),
      name: teamName,
      members: [
        { id: '1', name: session?.user?.name || 'User', email: session?.user?.email || '', avatar: session?.user?.image || '/api/placeholder/40/40' }
      ],
      boards: []
    };
    setTeams([...teams, newTeam]);
    console.log('Team created:', teamName, 'Invites sent to:', inviteEmails);
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

  if (status === 'loading') {
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
              Create Team
            </button>
            
            <div className="flex items-center gap-3">
              <img src={session?.user?.image || '/api/placeholder/40/40'} alt={session?.user?.name || 'User'} className="w-8 h-8 rounded-full" />
              <span className="text-sm font-medium text-gray-700">{session?.user?.name}</span>
              <button onClick={() => signOut()} className="text-gray-400 hover:text-gray-600">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Teams</h2>
          <p className="text-gray-600">Collaborate and brainstorm with your teams</p>
        </div>

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
                {team.boards.map((board) => (
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
                ))}
                
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