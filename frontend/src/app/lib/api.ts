import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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