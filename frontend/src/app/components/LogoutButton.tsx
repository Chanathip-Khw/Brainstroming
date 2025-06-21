import { LogOut } from 'lucide-react';
import { useLogout } from '../hooks/useLogout';

interface LogoutButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'text';
  onLogout?: () => void;
}

export default function LogoutButton({
  className = '',
  variant = 'primary',
  onLogout,
}: LogoutButtonProps) {
  const { logout, isLoggingOut } = useLogout();

  const handleLogout = async () => {
    // Call the onLogout callback if provided
    if (onLogout) {
      onLogout();
    }

    // Use our custom logout hook
    await logout();
  };

  // Button styles based on variant
  const getButtonClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md';
      case 'secondary':
        return 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md';
      case 'text':
        return 'text-gray-700 hover:text-gray-900';
      default:
        return 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md';
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`${getButtonClasses()} ${className} ${isLoggingOut ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {variant === 'text' ? (
        <LogOut className='w-4 h-4' />
      ) : isLoggingOut ? (
        'Logging out...'
      ) : (
        'Log out'
      )}
    </button>
  );
}
