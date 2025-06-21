import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  metadata: any;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  // Fetch activity logs
  const fetchLogs = async (page = 1, limit = 10, type = '') => {
    try {
      setLoading(true);

      let endpoint = `/api/auth/activity?page=${page}&limit=${limit}`;
      if (type) {
        endpoint += `&type=${type}`;
      }

      const response = await fetchApi<{
        logs: ActivityLog[];
        pagination: Pagination;
      }>(endpoint);

      setLogs(response.logs);
      setPagination(response.pagination);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load activity logs');
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load logs on component mount and when filters change
  useEffect(() => {
    fetchLogs(pagination.page, pagination.limit, filterType);
  }, [pagination.page, filterType]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  // Format activity type for display
  const formatActivityType = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get activity icon based on action
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '➕';
      case 'UPDATE':
        return '✏️';
      case 'DELETE':
        return '🗑️';
      case 'MOVE':
        return '↔️';
      case 'RESIZE':
        return '⤧';
      case 'ROTATE':
        return '🔄';
      case 'LOCK':
        return '🔒';
      case 'UNLOCK':
        return '🔓';
      case 'COMMENT':
        return '💬';
      case 'VOTE':
        return '👍';
      case 'JOIN':
      case 'WORKSPACE_JOIN':
        return '🚪';
      case 'LEAVE':
      case 'WORKSPACE_LEAVE':
        return '👋';
      case 'WORKSPACE_CREATE':
        return '🏢';
      case 'WORKSPACE_UPDATE':
        return '✏️';
      case 'WORKSPACE_DELETE':
        return '🗑️';
      case 'WORKSPACE_INVITE_SEND':
        return '📨';
      case 'WORKSPACE_INVITE_ACCEPT':
        return '✅';
      case 'WORKSPACE_MEMBER_UPDATE':
        return '👤';
      case 'WORKSPACE_MEMBER_REMOVE':
        return '🚫';
      case 'PROJECT_CREATE':
        return '📋';
      case 'PROJECT_UPDATE':
        return '📝';
      case 'PROJECT_DELETE':
        return '🗑️';
      case 'PROJECT_SHARE':
        return '🔗';
      default:
        return '📝';
    }
  };

  // Get description for activity
  const getActivityDescription = (log: ActivityLog) => {
    const action = log.action.toLowerCase();
    const entityType = log.entityType.toLowerCase();

    // Workspace-specific descriptions
    if (action.includes('workspace')) {
      switch (log.action) {
        case 'WORKSPACE_CREATE':
          return `created workspace "${log.metadata?.workspaceName || 'Unknown'}"`;
        case 'WORKSPACE_UPDATE':
          return `updated workspace "${log.metadata?.workspaceName || 'Unknown'}"`;
        case 'WORKSPACE_DELETE':
          return `deleted workspace "${log.metadata?.workspaceName || 'Unknown'}"`;
        case 'WORKSPACE_JOIN':
          return `joined workspace "${log.metadata?.workspaceName || 'Unknown'}" as ${log.metadata?.role?.toLowerCase() || 'member'}`;
        case 'WORKSPACE_INVITE_SEND':
          return `sent ${log.metadata?.inviteCount || 'an'} invitation${log.metadata?.inviteCount > 1 ? 's' : ''} to workspace "${log.metadata?.workspaceName || 'Unknown'}"`;
        case 'WORKSPACE_INVITE_ACCEPT':
          return `accepted invitation to workspace "${log.metadata?.workspaceName || 'Unknown'}"`;
        case 'WORKSPACE_MEMBER_UPDATE':
          return `updated ${log.metadata?.memberName || 'a member'}'s role to ${log.metadata?.role?.toLowerCase() || 'unknown'} in "${log.metadata?.workspaceName || 'Unknown'}"`;
        case 'WORKSPACE_MEMBER_REMOVE':
          return `removed ${log.metadata?.memberName || 'a member'} from workspace "${log.metadata?.workspaceName || 'Unknown'}"`;
        default:
          return `${formatActivityType(log.action).toLowerCase()} ${entityType}`;
      }
    }

    // Default description
    return `${formatActivityType(log.action).toLowerCase()} ${entityType}`;
  };

  return (
    <div className='bg-white shadow rounded-lg p-6'>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold'>Workspace Activity</h2>

        <div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className='block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md'
          >
            <option value=''>All Activities</option>
            <option value='WORKSPACE_CREATE'>Workspace Creation</option>
            <option value='WORKSPACE_UPDATE'>Workspace Update</option>
            <option value='WORKSPACE_DELETE'>Workspace Deletion</option>
            <option value='WORKSPACE_JOIN'>Workspace Join</option>
            <option value='WORKSPACE_MEMBER_UPDATE'>Member Role Update</option>
            <option value='WORKSPACE_MEMBER_REMOVE'>Member Removal</option>
            <option value='WORKSPACE_INVITE_SEND'>Invitation Sent</option>
            <option value='WORKSPACE_INVITE_ACCEPT'>Invitation Accepted</option>
          </select>
        </div>
      </div>

      {loading && (
        <p className='text-gray-500'>Loading workspace activities...</p>
      )}

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4'>
          {error}
          <button
            className='ml-2 underline'
            onClick={() =>
              fetchLogs(pagination.page, pagination.limit, filterType)
            }
          >
            Try again
          </button>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <p className='text-gray-500'>No workspace activities found.</p>
      )}

      {logs.length > 0 && (
        <>
          <div className='space-y-4'>
            {logs.map(log => (
              <div key={log.id} className='border-b border-gray-200 pb-4'>
                <div className='flex items-start'>
                  <div className='mr-4 text-2xl'>
                    {getActivityIcon(log.action)}
                  </div>
                  <div className='flex-1'>
                    <div className='flex justify-between'>
                      <h3 className='font-medium'>
                        {formatActivityType(log.action)}
                      </h3>
                      <span className='text-sm text-gray-500'>
                        {formatDate(log.timestamp)}
                      </span>
                    </div>

                    <div className='mt-1 text-sm text-gray-600'>
                      <span>
                        {log.user.name} {getActivityDescription(log)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className='flex items-center justify-between mt-6'>
              <div>
                <p className='text-sm text-gray-700'>
                  Showing{' '}
                  <span className='font-medium'>
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className='font-medium'>
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
                  </span>{' '}
                  of <span className='font-medium'>{pagination.total}</span>{' '}
                  results
                </p>
              </div>
              <div className='flex-1 flex justify-end'>
                <nav
                  className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px'
                  aria-label='Pagination'
                >
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.page === 1
                        ? 'text-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>

                  {Array.from(
                    { length: pagination.pages },
                    (_, i) => i + 1
                  ).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                        page === pagination.page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.page === pagination.pages
                        ? 'text-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
