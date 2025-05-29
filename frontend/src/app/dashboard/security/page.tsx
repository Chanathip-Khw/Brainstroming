'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SessionManager from '../../components/SessionManager';
import ActivityLogs from '../../components/ActivityLogs';
import LogoutButton from '../../components/LogoutButton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  
  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="spinner h-12 w-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading security settings...</p>
        </div>
      </div>
    );
  }
  
  // Show security settings if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={session?.user?.image || '/api/placeholder/40/40'} alt={session?.user?.name || 'User'} className="w-8 h-8 rounded-full" />
              <span className="text-sm font-medium text-gray-700">{session?.user?.name}</span>
              <LogoutButton variant="text" className="text-gray-400 hover:text-gray-600" />
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-2xl font-bold mb-6">Security Settings</h1>
        
        <div className="space-y-8">
          {/* Session Management */}
          <section>
            <SessionManager />
          </section>
          
          {/* Activity Logs */}
          <section>
            <ActivityLogs />
          </section>
        </div>
      </div>
    </div>
  );
} 