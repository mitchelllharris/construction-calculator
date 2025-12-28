// API Service Utility
import API_BASE_URL from '../config/api.js';

const TOKEN_KEY = 'accessToken';

/**
 * Get stored authentication token
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Set authentication token
 */
export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Remove authentication token
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Make API request with automatic token handling
 */
const apiRequest = async (url, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to headers if available
  if (token) {
    headers['x-access-token'] = token;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const data = contentType && contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      // Handle specific HTTP status codes
      let errorMessage = data?.message || data?.error || 'An error occurred';
      
      // Check if this is a login/signup endpoint - don't override messages for these
      const isAuthEndpoint = url.includes('/api/auth/signin') || url.includes('/api/auth/signup');
      
      if (response.status === 401) {
        // For auth endpoints, use server message; for others, it's session expiration
        if (!isAuthEndpoint) {
          errorMessage = 'Your session has expired. Please log in again.';
          // Only clear token for non-auth endpoints (actual session expiration)
          removeToken();
        }
        // For auth endpoints, keep the server's message (e.g., "Invalid username or password")
      } else if (response.status === 403) {
        errorMessage = data?.message || 'You do not have permission to perform this action.';
      } else if (response.status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (response.status === 423) {
        // Account locked
        errorMessage = data?.message || 'Account is locked. Please try again later.';
      } else if (response.status === 429) {
        errorMessage = data?.message || 'Too many requests. Please try again later.';
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      const error = {
        status: response.status,
        message: errorMessage,
        data: data,
      };
      throw error;
    }

    return data;
  } catch (error) {
    // Handle network errors, timeouts, or other exceptions
    if (error.status) {
      // Already formatted error from above
      throw error;
    }

    // Handle AbortError (timeout)
    if (error.name === 'AbortError') {
      throw {
        status: 0,
        message: 'Request timed out. Please check your connection and try again.',
        data: null,
      };
    }

    // Handle network errors
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      throw {
        status: 0,
        message: 'Network error. Please check your internet connection and try again.',
        data: null,
      };
    }

    // Generic error fallback
    throw {
      status: 0,
      message: error.message || 'An unexpected error occurred. Please try again.',
      data: null,
    };
  }
};

/**
 * GET request
 */
export const get = (url, options = {}) => {
  return apiRequest(url, {
    ...options,
    method: 'GET',
  });
};

/**
 * POST request
 */
export const post = (url, data, options = {}) => {
  return apiRequest(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * PUT request
 */
export const put = (url, data, options = {}) => {
  return apiRequest(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * DELETE request
 */
export const del = (url, options = {}) => {
  return apiRequest(url, {
    ...options,
    method: 'DELETE',
  });
};

export default {
  get,
  post,
  put,
  delete: del,
  getToken,
  setToken,
  removeToken,
};

