import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

/**
 * Custom hook for handling logout with backend session invalidation
 */
export function useLogout() {
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('Logging out...', { session });

      // If we have a backend session, revoke it first
      if (session?.accessToken) {
        try {
          console.log('Calling backend logout endpoint with token:', session.accessToken);
          
          // Call backend logout endpoint directly to invalidate the session
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              // Don't set Content-Type to avoid empty body error
            },
            // No body needed for logout
          });
          
          if (response.ok) {
            console.log('Backend logout successful');
          } else {
            const data = await response.json().catch(() => ({}));
            console.error('Backend logout failed:', data);
          }
        } catch (error) {
          console.error('Error logging out from backend:', error);
          // Continue with frontend logout even if backend logout fails
        }
      } else {
        console.warn('No access token available, skipping backend logout');
      }

      console.log('Signing out from NextAuth...');
      // Sign out from NextAuth
      await signOut({ redirect: true, callbackUrl: '/auth/signin' });
    } catch (error) {
      console.error('Error during logout:', error);
      // Force sign out from NextAuth even if there was an error
      await signOut({ redirect: true, callbackUrl: '/auth/signin' });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    logout,
    isLoggingOut
  };
} 