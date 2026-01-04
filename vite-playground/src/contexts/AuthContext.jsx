import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { post, get, put, getToken, setToken, removeToken } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user profile
   */
  const fetchUserProfile = useCallback(async () => {
    try {
      const profile = await get(API_ENDPOINTS.USER.PROFILE);
      setUser(profile);
      return { success: true, user: profile };
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return { success: false, message: error.message };
    }
  }, []);

  // Check if user is already logged in on mount and verify token
  useEffect(() => {
    const verifyToken = async () => {
      const token = getToken();
      if (token) {
        try {
          // Verify token with backend
          const response = await fetch(API_ENDPOINTS.AUTH.VERIFY, {
            headers: {
              'x-access-token': token,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setIsAuthenticated(true);
            // Fetch and set user profile
            await fetchUserProfile();
          } else {
            // Token is invalid, remove it
            removeToken();
            setIsAuthenticated(false);
          }
        } catch (error) {
          // Network error or invalid token
          removeToken();
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [fetchUserProfile]);

  /**
   * Register a new user
   */
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await post(API_ENDPOINTS.AUTH.SIGNUP, userData);
      
      // Registration successful
      return {
        success: true,
        message: response.message || 'Registration successful!',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Registration failed. Please try again.',
        error: error,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await post(API_ENDPOINTS.AUTH.SIGNIN, credentials);
      
      if (response.accessToken) {
        // Store token
        setToken(response.accessToken);
        
        // Store user data
        setUser({
          id: response.id,
          username: response.username,
          email: response.email,
          emailVerified: response.emailVerified || false,
          roles: response.roles || [],
        });
        
        setIsAuthenticated(true);
        
        // Fetch full user profile
        await fetchUserProfile();
        
        return {
          success: true,
          message: 'Login successful!',
          user: {
            id: response.id,
            username: response.username,
            email: response.email,
            emailVerified: response.emailVerified || false,
            roles: response.roles || [],
          },
        };
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed. Please check your credentials.',
        error: error,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    removeToken();
    setUser(null);
    setIsAuthenticated(false);
    // Navigation will be handled by the component calling logout
  };

  /**
   * Update user profile
   */
  const updateProfile = async (profileData, activeAccountId = null, activePageId = null) => {
    try {
      setLoading(true);
      
      // Add active account context headers if provided
      const headers = {};
      if (activeAccountId) {
        headers['x-active-account-id'] = activeAccountId.toString();
      }
      if (activePageId) {
        headers['x-active-page-id'] = activePageId;
      }
      
      const response = await put(API_ENDPOINTS.USER.UPDATE_PROFILE, profileData, { headers });
      
      if (response.user) {
        setUser(response.user);
        return {
          success: true,
          message: response.message || 'Profile updated successfully!',
          user: response.user,
        };
      }
      throw new Error('Invalid response from server');
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update profile. Please try again.',
        error: error,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Change password
   */
  const changePassword = async (passwordData) => {
    try {
      setLoading(true);
      const response = await put(API_ENDPOINTS.USER.CHANGE_PASSWORD, passwordData);
      
      return {
        success: true,
        message: response.message || 'Password changed successfully!',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to change password. Please try again.',
        error: error,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user has admin role
   */
  const isAdmin = () => {
    return user?.roles?.some(role => role === 'ROLE_ADMIN' || role.includes('ADMIN'));
  };

  /**
   * Check if user has moderator role
   */
  const isModerator = () => {
    return user?.roles?.some(role => role === 'ROLE_MODERATOR' || role.includes('MODERATOR'));
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    register,
    login,
    logout,
    fetchUserProfile,
    updateProfile,
    changePassword,
    isAdmin,
    isModerator,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

