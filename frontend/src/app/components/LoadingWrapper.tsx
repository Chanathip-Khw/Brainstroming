import React from 'react';

interface LoadingWrapperProps {
  isLoading: boolean;
  error?: string | null;
  children: React.ReactNode;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  error,
  children,
}) => {
  if (isLoading) {
    return (
      <div className='flex-1 flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4'></div>
          <p className='text-gray-600 text-lg font-medium'>
            Loading your canvas...
          </p>
          <p className='text-gray-400 text-sm mt-2'>
            Setting up the collaborative workspace
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex-1 flex items-center justify-center bg-gray-50'>
        <div className='text-center max-w-md'>
          <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-8 h-8 text-red-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </div>
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Something went wrong
          </h3>
          <p className='text-gray-600 mb-4'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LoadingWrapper;
