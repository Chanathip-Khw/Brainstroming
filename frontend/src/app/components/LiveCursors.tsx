import React from 'react';

interface UserCursor {
  userId: string;
  name: string;
  cursor: {
    x: number;
    y: number;
  };
}

interface LiveCursorsProps {
  cursors: UserCursor[];
}

const LiveCursors: React.FC<LiveCursorsProps> = ({ cursors }) => {
  const getColorForUser = (userId: string) => {
    // Generate a consistent color for each user based on their ID
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#f97316',
      '#ec4899',
      '#06b6d4',
    ];
    const hash = userId.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getAnonymousName = (userId: string) => {
    // Generate a consistent anonymous name based on user ID
    const animals = [
      'Cat',
      'Dog',
      'Fox',
      'Bear',
      'Wolf',
      'Lion',
      'Tiger',
      'Eagle',
      'Owl',
      'Deer',
      'Rabbit',
      'Panda',
      'Koala',
      'Dolphin',
      'Whale',
      'Shark',
    ];
    const hash = userId.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    const animalIndex = Math.abs(hash) % animals.length;
    return `Anonymous-${animals[animalIndex]}`;
  };

  return (
    <div className='absolute inset-0 pointer-events-none z-50 overflow-hidden'>
      {cursors.map(cursor => {
        // Use direct viewport coordinates (no transformation needed)
        const screenX = cursor.cursor.x;
        const screenY = cursor.cursor.y;

        return (
          <div
            key={cursor.userId}
            className='absolute transition-all duration-100 ease-out'
            style={{
              left: screenX,
              top: screenY,
              transform: 'translate(-2px, -2px)',
              pointerEvents: 'none',
            }}
          >
            {/* Cursor */}
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              className='drop-shadow-md'
            >
              <path
                d='M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.85c-.32-.31-.85-.09-.85.36Z'
                fill={getColorForUser(cursor.userId)}
                stroke='white'
                strokeWidth='1'
              />
            </svg>

            {/* Anonymous user name label */}
            <div
              className='absolute top-5 left-3 px-2 py-1 text-xs text-white rounded-md shadow-lg whitespace-nowrap font-medium'
              style={{
                backgroundColor: getColorForUser(cursor.userId),
              }}
            >
              {getAnonymousName(cursor.userId)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LiveCursors;
