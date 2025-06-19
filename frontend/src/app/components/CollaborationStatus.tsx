import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ProjectUser {
  id: string;
  userId: string;
  name: string;
  avatar: string;
}

interface CollaborationStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
  connectionError: string | null;
  projectUsers: ProjectUser[];
}

const CollaborationStatus: React.FC<CollaborationStatusProps> = ({
  isConnected,
  isConnecting = false,
  connectionError,
  projectUsers
}) => {


  return (
    <div className="fixed top-4 left-4 z-40 flex flex-col gap-2">
      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-200 ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : isConnecting
          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Live collaboration</span>
          </>
        ) : isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Connecting...</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              {connectionError ? 'Connection error' : 'Disconnected'}
            </span>
          </>
        )}
      </div>



      {/* Error Message */}
      {connectionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-[200px]">
          <p className="text-xs text-red-700">{connectionError}</p>
        </div>
      )}
    </div>
  );
};

export default CollaborationStatus; 