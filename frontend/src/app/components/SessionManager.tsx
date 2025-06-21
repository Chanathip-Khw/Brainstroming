import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

interface Session {
  id: string;
  browser: string;
  os: string;
  device: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export default function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetchApi<{ sessions: Session[] }>(
        '/api/auth/sessions'
      );
      setSessions(response.sessions);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Terminate a session
  const terminateSession = async (sessionId: string) => {
    try {
      await fetchApi(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      // Remove the terminated session from the list
      setSessions(sessions.filter(session => session.id !== sessionId));
    } catch (err: any) {
      setError(err.message || 'Failed to terminate session');
      console.error('Error terminating session:', err);
    }
  };

  // Load sessions on component mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className='bg-white shadow rounded-lg p-6'>
      <h2 className='text-xl font-semibold mb-4'>Active Sessions</h2>

      {loading && <p className='text-gray-500'>Loading sessions...</p>}

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4'>
          {error}
          <button className='ml-2 underline' onClick={fetchSessions}>
            Try again
          </button>
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <p className='text-gray-500'>No active sessions found.</p>
      )}

      {sessions.length > 0 && (
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Device
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Browser
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  IP Address
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Started
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Expires
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {sessions.map(session => (
                <tr
                  key={session.id}
                  className={session.isCurrent ? 'bg-blue-50' : ''}
                >
                  <td className='px-6 py-4 whitespace-nowrap text-sm'>
                    <div className='flex items-center'>
                      <span className='font-medium'>{session.device}</span>
                      {session.isCurrent && (
                        <span className='ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                          Current
                        </span>
                      )}
                    </div>
                    <div className='text-gray-500'>{session.os}</div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {session.browser}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {session.ipAddress}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {formatDate(session.createdAt)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {formatDate(session.expiresAt)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                    {!session.isCurrent ? (
                      <button
                        onClick={() => terminateSession(session.id)}
                        className='text-red-600 hover:text-red-900'
                      >
                        Terminate
                      </button>
                    ) : (
                      <span className='text-gray-400'>Current session</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
