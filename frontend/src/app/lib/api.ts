import { getSession, signOut } from 'next-auth/react';

export interface ApiError {
  error: string;
  message?: string;
  code?: string;
  status?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch API wrapper that handles authentication and token refreshing
 */
export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Get the current session
  const session = await getSession();
  
  if (!session?.accessToken) {
    throw new Error('No access token available');
  }
  
  // Set up headers with authentication
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': `Bearer ${session.accessToken}`
  };
  
  // Make the API request
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  // Handle successful responses
  if (response.ok) {
    // For 204 No Content responses, return empty object
    if (response.status === 204) {
      return {} as T;
    }
    
    // Parse JSON response
    return response.json();
  }
  
  // Handle error responses
  const errorData = await response.json().catch(() => ({}));
  const apiError: ApiError = {
    error: errorData.error || 'Unknown error',
    message: errorData.message || 'An unexpected error occurred',
    code: errorData.code,
    status: response.status
  };
  
  // Handle token expiration
  if (response.status === 401 && apiError.code === 'TOKEN_EXPIRED') {
    // If we have a session error, the token refresh failed
    // Force sign out to clear invalid tokens
    if ('error' in session && session.error === 'RefreshAccessTokenError') {
      console.error('Session expired. Signing out...');
      await signOut({ redirect: true, callbackUrl: '/auth/signin' });
      throw new Error('Session expired');
    }
    
    // Otherwise, the token should have been refreshed automatically
    // Try the request again (but only once to avoid infinite loops)
    console.log('Token expired. Retrying request after refresh...');
    
    // Get fresh session after token refresh
    const freshSession = await getSession();
    
    if (!freshSession?.accessToken) {
      throw new Error('Failed to refresh token');
    }
    
    // Retry with new token
    const retryResponse = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${freshSession.accessToken}`
      }
    });
    
    if (retryResponse.ok) {
      return retryResponse.json();
    }
    
    // If retry fails, throw the error
    const retryErrorData = await retryResponse.json().catch(() => ({}));
    throw {
      error: retryErrorData.error || 'Request failed',
      message: retryErrorData.message || 'Request failed after token refresh',
      status: retryResponse.status
    };
  }
  
  // For other errors, throw the error object
  throw apiError;
}

/**
 * Make authenticated API calls to the backend
 */
export const api = {
  /**
   * Make a GET request to the backend API
   */
  async get(endpoint: string) {
    const session = await getSession();
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session?.accessToken ? `Bearer ${session.accessToken}` : '',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * Make a POST request to the backend API
   */
  async post(endpoint: string, data: any) {
    const session = await getSession();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session?.accessToken ? `Bearer ${session.accessToken}` : '',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * Make a PUT request to the backend API
   */
  async put(endpoint: string, data: any) {
    const session = await getSession();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session?.accessToken ? `Bearer ${session.accessToken}` : '',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * Make a DELETE request to the backend API
   */
  async delete(endpoint: string) {
    const session = await getSession();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session?.accessToken ? `Bearer ${session.accessToken}` : '',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  }
}; 