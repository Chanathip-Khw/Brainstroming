'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Download, Settings, Zap } from 'lucide-react';
import Link from 'next/link';
import { CanvasBoard } from '../../components/canvas/CanvasBoard';
import { BoardSettingsModal } from '../../components/boards/BoardSettingsModal';
import { BoardSettings, User } from '../../types';

export default function BoardPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [boardName, setBoardName] = useState('Product Brainstorm');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const handleSaveBoardSettings = (settings: BoardSettings) => {
    console.log('Board settings saved:', settings);
    setBoardName(settings.boardName);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
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
    googleId: session.user.googleId
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{boardName}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/api/placeholder/32/32" alt="Member" className="w-8 h-8 rounded-full border-2 border-green-400" />
            <img src="/api/placeholder/32/32" alt="Member" className="w-8 h-8 rounded-full border-2 border-blue-400" />
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-8 h-8 rounded-full border-2 border-yellow-400" 
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowBoardSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <CanvasBoard user={user} />

      <BoardSettingsModal
        isOpen={showBoardSettings}
        onClose={() => setShowBoardSettings(false)}
        boardName={boardName}
        onSaveSettings={handleSaveBoardSettings}
      />
    </div>
  );
} 