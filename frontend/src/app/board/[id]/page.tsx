'use client';

import React, { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Download, Settings, Zap } from 'lucide-react';
import Link from 'next/link';
import { CanvasBoard } from '../../components/canvas/CanvasBoard';
import { BoardSettingsModal } from '../../components/boards/BoardSettingsModal';
import { BoardSettings, User } from '../../types';
import { useCollaboration } from '../../hooks/useCollaboration';
import { fetchApi } from '../../lib/api';

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [boardName, setBoardName] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);

  // Real-time collaboration for member presence
  const collaboration = useCollaboration({
    projectId: resolvedParams.id,
    onElementCreated: () => {},
    onElementUpdated: () => {},
    onElementDeleted: () => {},
    onVoteAdded: () => {},
    onVoteRemoved: () => {},
  });

  // Compute members with real-time collaboration status
  const membersWithCollaborationStatus = workspaceMembers.map(member => ({
    ...member,
    isInCollaboration: collaboration.projectUsers.some(
      user => user.userId === member.id
    ),
  }));

  // Debug logging for member status changes
  useEffect(() => {
    console.log('Member status update:', {
      collaborationUsers: collaboration.projectUsers.map(u => ({
        id: u.userId,
        name: u.name,
      })),
      workspaceMembers: workspaceMembers.map(m => ({ id: m.id, name: m.name })),
      membersWithStatus: membersWithCollaborationStatus.map(m => ({
        id: m.id,
        name: m.name,
        isInCollaboration: m.isInCollaboration,
      })),
    });
  }, [collaboration.projectUsers, workspaceMembers.length]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch board data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchApi(`/api/projects/${resolvedParams.id}`)
        .then(data => {
          if (data.success && data.project) {
            setBoardName(data.project.name);
            // Extract workspace members if available
            if (data.project.workspace?.members) {
              setWorkspaceMembers(
                data.project.workspace.members.map((member: any) => ({
                  id: member.user.id,
                  name: member.user.name,
                  email: member.user.email,
                  avatar: member.user.avatarUrl || '/api/placeholder/32/32',
                  isActive: member.user.isActive,
                  lastLogin: member.user.lastLogin,
                  activeSessions: member.user.sessions || [],
                }))
              );
            }
          } else {
            console.error('Failed to fetch board:', data.error);
            router.push('/dashboard');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching board:', err);
          router.push('/dashboard');
        });
    }
  }, [status, session, resolvedParams.id, router]);

  const handleSaveBoardSettings = (settings: BoardSettings) => {
    console.log('Board settings saved:', settings);
    setBoardName(settings.boardName);
  };

  // Helper function to determine if a member is considered active
  const isMemberActive = (member: any) => {
    console.log('Checking member active status:', {
      memberId: member.id,
      memberName: member.name,
      isInCollaboration: member.isInCollaboration,
      isInCollaborationType: typeof member.isInCollaboration,
    });

    // Real-time collaboration status takes absolute priority
    // If they're in collaboration, they're definitely active
    if (member.isInCollaboration) {
      console.log(`Member ${member.name} is ACTIVE (in collaboration)`);
      return true;
    }

    // If they're NOT in collaboration, they're considered inactive
    // (This ensures real-time accuracy over session-based fallbacks)
    if (member.isInCollaboration === false) {
      console.log(`Member ${member.name} is INACTIVE (not in collaboration)`);
      return false;
    }

    // Fallback logic only applies if collaboration status is undefined
    // (for cases where collaboration data hasn't loaded yet)
    if (member.isInCollaboration === undefined) {
      // Fallback to session-based logic
      if (!member.isActive) return false;

      // Check if user has any active sessions
      if (member.activeSessions && member.activeSessions.length > 0) {
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const hasRecentActivity = member.activeSessions.some((session: any) => {
          const sessionUpdateTime = new Date(session.updatedAt).getTime();
          return sessionUpdateTime > twoHoursAgo;
        });

        if (hasRecentActivity) return true;
      }

      // Final fallback: check last login time
      const lastLoginTime = new Date(member.lastLogin).getTime();
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

      return lastLoginTime > twentyFourHoursAgo;
    }

    return false;
  };

  if (status === 'loading' || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600'></div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  // Convert NextAuth user to our app User type
  const user: User = {
    id: session.user.id || '',
    name: session.user.name || 'User',
    email: session.user.email || '',
    avatar: session.user.image || '/api/placeholder/32/32',
    ...(session.user.googleId && { googleId: session.user.googleId }),
  };

  return (
    <div className='h-screen bg-gray-100 flex flex-col'>
      <header className='bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Link href='/dashboard' className='text-gray-500 hover:text-gray-700'>
            ← Back to Dashboard
          </Link>
          <h1 className='text-xl font-semibold text-gray-900'>{boardName}</h1>
        </div>

        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            {membersWithCollaborationStatus.slice(0, 5).map((member, index) => {
              const isActive = isMemberActive(member);
              const memberStatus = isActive ? 'Active' : 'Inactive';

              return (
                <div key={member.id} className='relative'>
                  <img
                    src={member.avatar}
                    alt={member.name}
                    title={`${member.name} (${memberStatus})`}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                      isActive ? 'border-green-400' : 'border-gray-300'
                    }`}
                    referrerPolicy='no-referrer'
                    onError={e => {
                      e.currentTarget.src = '/api/placeholder/32/32';
                    }}
                  />
                  {/* Status indicator dot */}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
                      isActive ? 'bg-green-400' : 'bg-gray-400'
                    }`}
                  ></div>
                </div>
              );
            })}
            {membersWithCollaborationStatus.length > 5 && (
              <div className='w-8 h-8 rounded-full border-2 border-gray-400 bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600'>
                +{membersWithCollaborationStatus.length - 5}
              </div>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <button className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg'>
              <Download className='w-5 h-5' />
            </button>
            <button
              onClick={() => setShowBoardSettings(true)}
              className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg'
            >
              <Settings className='w-5 h-5' />
            </button>
          </div>
        </div>
      </header>

      <CanvasBoard user={user} projectId={resolvedParams.id} />

      <BoardSettingsModal
        isOpen={showBoardSettings}
        onClose={() => setShowBoardSettings(false)}
        boardName={boardName}
        onSaveSettings={handleSaveBoardSettings}
      />
    </div>
  );
}
