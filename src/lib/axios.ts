import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Clerk token
apiClient.interceptors.request.use(
  async (config) => {
    // Get token from Clerk's client-side API
    if (typeof window !== 'undefined' && window.Clerk) {
      try {
        const token = await window.Clerk.session?.getToken();
        
        if (!token) {
          throw new Error('Authentication token unavailable');
        }
        
        config.headers.Authorization = `Bearer ${token}`;
      } catch {
        throw new Error('Authentication token unavailable');
      }
    } else {
      throw new Error('Authentication token unavailable');
    }
    
    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Trigger Clerk re-authentication
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in';
      }
    }
    
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
      return Promise.reject(new Error('An unexpected error occurred. Please try again.'));
    }
    
    return Promise.reject(error);
  }
);
