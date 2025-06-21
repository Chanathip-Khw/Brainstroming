'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Mail, Check, X, Loader2, AlertCircle } from 'lucide-react';

interface Invite {
  id: string;
  email: string;
  token: string;
  status: string;
  role: string;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  };
}

export default function InvitesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvites, setProcessingInvites] = useState<
    Record<string, boolean>
  >({});
  const [notifications, setNotifications] = useState<
    {
      id: string;
      type: 'success' | 'error';
      message: string;
    }[]
  >([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch invites
  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      fetchInvites();
    }
  }, [status, session]);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/invites`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (data.invites) {
        setInvites(data.invites);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
      addNotification('error', 'Failed to load invites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async (token: string, inviteId: string) => {
    try {
      setProcessingInvites(prev => ({ ...prev, [inviteId]: true }));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workspaces/invites/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ token }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        addNotification(
          'success',
          data.message || 'Invite accepted successfully'
        );
        // Remove the accepted invite from the list
        setInvites(invites.filter(invite => invite.id !== inviteId));
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        addNotification('error', data.error || 'Failed to accept invite');
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      addNotification('error', 'Failed to accept invite. Please try again.');
    } finally {
      setProcessingInvites(prev => ({ ...prev, [inviteId]: false }));
    }
  };

  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600'></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b border-gray-200 px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-bold text-gray-900'>
              Workspace Invitations
            </h1>
          </div>

          <div className='flex items-center gap-4'>
            <button
              onClick={() => router.push('/dashboard')}
              className='text-gray-600 hover:text-gray-900'
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className='p-6 max-w-4xl mx-auto'>
        <div className='mb-8'>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Your Invitations
          </h2>
          <p className='text-gray-600'>
            Accept or decline workspace invitations
          </p>
        </div>

        {/* Notifications */}
        <div className='fixed top-4 right-4 z-50 space-y-2'>
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-md flex items-center gap-2 ${
                notification.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {notification.type === 'success' ? (
                <Check className='w-5 h-5' />
              ) : (
                <AlertCircle className='w-5 h-5' />
              )}
              <span>{notification.message}</span>
            </div>
          ))}
        </div>

        {invites.length === 0 ? (
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center'>
            <div className='mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4'>
              <Mail className='w-8 h-8 text-indigo-600' />
            </div>
            <h3 className='text-xl font-semibold mb-2'>
              No Pending Invitations
            </h3>
            <p className='text-gray-600 mb-6 max-w-md mx-auto'>
              You don't have any pending workspace invitations at the moment.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className='bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors'
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className='grid gap-4'>
            {invites.map(invite => (
              <div
                key={invite.id}
                className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-xl font-semibold text-gray-900'>
                      {invite.workspace.name}
                    </h3>
                    <p className='text-sm text-gray-500 mt-1'>
                      Invited by {invite.workspace.owner.name} (
                      {invite.workspace.owner.email})
                    </p>
                    <div className='mt-2 flex items-center gap-2'>
                      <span className='px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded'>
                        {invite.role.charAt(0) +
                          invite.role.slice(1).toLowerCase()}{' '}
                        Role
                      </span>
                      <span className='text-xs text-gray-500'>
                        Expires on {formatDate(invite.expiresAt)}
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center gap-3'>
                    <button
                      onClick={() => acceptInvite(invite.token, invite.id)}
                      disabled={processingInvites[invite.id]}
                      className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2'
                    >
                      {processingInvites[invite.id] ? (
                        <>
                          <Loader2 className='w-4 h-4 animate-spin' />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className='w-4 h-4' />
                          Accept
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
