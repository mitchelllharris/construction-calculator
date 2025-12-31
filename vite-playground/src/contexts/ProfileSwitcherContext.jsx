import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from './AuthContext';

const ProfileSwitcherContext = createContext(null);

export const useProfileSwitcher = () => {
  const context = useContext(ProfileSwitcherContext);
  if (!context) {
    throw new Error('useProfileSwitcher must be used within a ProfileSwitcherProvider');
  }
  return context;
};

export const ProfileSwitcherProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeProfile, setActiveProfile] = useState(null); // { type: 'user' | 'business', id: string, name: string, avatar?: string }
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's businesses
  const fetchBusinesses = useCallback(async () => {
    if (!isAuthenticated) {
      setBusinesses([]);
      setLoading(false);
      return;
    }

    try {
      const data = await get(API_ENDPOINTS.BUSINESSES.GET_USER_BUSINESSES);
      setBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initialize active profile from localStorage or default to user
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setActiveProfile(null);
      setLoading(false);
      return;
    }

    // Try to load from localStorage
    const savedProfile = localStorage.getItem('activeProfile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        // Verify the profile still exists
        if (parsed.type === 'user' && parsed.id === user.id) {
          setActiveProfile(parsed);
        } else if (parsed.type === 'business') {
          // We'll verify this when businesses are loaded
          setActiveProfile(parsed);
        } else {
          // Default to user profile
          setActiveProfile({
            type: 'user',
            id: user.id,
            name: user.username || `${user.firstName} ${user.lastName}`,
            avatar: user.avatar,
          });
        }
      } catch (error) {
        console.error('Failed to parse saved profile:', error);
        setActiveProfile({
          type: 'user',
          id: user.id,
          name: user.username || `${user.firstName} ${user.lastName}`,
          avatar: user.avatar,
        });
      }
    } else {
      // Default to user profile
      setActiveProfile({
        type: 'user',
        id: user.id,
        name: user.username || `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
      });
    }

    fetchBusinesses();
  }, [isAuthenticated, user, fetchBusinesses]);

  // Verify saved business profile still exists when businesses are loaded
  useEffect(() => {
    if (activeProfile?.type === 'business' && businesses.length > 0 && user) {
      const businessId = String(activeProfile.id || '');
      console.log('Verifying business profile. Looking for ID:', businessId, 'Active profile:', activeProfile);
      
      // Compare IDs as strings to handle ObjectId vs string mismatch
      const businessExists = businesses.find(b => {
        const bId = String(b._id || b.id || '');
        const matches = bId === businessId;
        if (matches) {
          console.log('Found matching business:', b.businessName, 'ID:', bId);
        }
        return matches;
      });
      
      if (!businessExists) {
        // Business no longer exists, switch to user profile
        console.log('Business not found, switching to user profile. Looking for:', businessId, 'Available:', businesses.map(b => ({ name: b.businessName, id: String(b._id || b.id) })));
        setActiveProfile({
          type: 'user',
          id: user.id,
          name: user.username || `${user.firstName} ${user.lastName}`,
          avatar: user.avatar,
        });
      } else {
        // Always update with fresh business data to ensure consistency
        const businessIdStr = String(businessExists._id || businessExists.id);
        const currentIdStr = String(activeProfile.id || '');
        
        // Update if business info has changed or ID format differs
        const hasChanged = 
          currentIdStr !== businessIdStr ||
          activeProfile.name !== businessExists.businessName ||
          activeProfile.avatar !== businessExists.avatar ||
          activeProfile.slug !== businessExists.businessSlug;
        
        if (hasChanged) {
          console.log('Updating active business profile:', businessExists.businessName, 'New ID:', businessIdStr);
          setActiveProfile({
            type: 'business',
            id: businessExists._id || businessExists.id,
            name: businessExists.businessName,
            avatar: businessExists.avatar,
            slug: businessExists.businessSlug,
          });
        } else {
          console.log('Business profile is up to date:', businessExists.businessName);
        }
      }
    } else if (activeProfile?.type === 'business' && businesses.length === 0) {
      console.log('Businesses not loaded yet, waiting...');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses]);

  // Switch to a profile
  const switchProfile = useCallback((profile) => {
    console.log('switchProfile called with:', profile);
    setActiveProfile(profile);
    localStorage.setItem('activeProfile', JSON.stringify(profile));
    console.log('Active profile set to:', profile);
  }, []);

  // Switch to user profile
  const switchToUser = useCallback(() => {
    if (!user) return;
    const profile = {
      type: 'user',
      id: user.id,
      name: user.username || `${user.firstName} ${user.lastName}`,
      avatar: user.avatar,
    };
    switchProfile(profile);
  }, [user, switchProfile]);

  // Switch to business profile
  const switchToBusiness = useCallback((business) => {
    // Handle both _id and id formats
    const businessId = business._id || business.id;
    if (!businessId) {
      console.error('Business object missing ID:', business);
      return;
    }
    
    const profile = {
      type: 'business',
      id: businessId,
      name: business.businessName || business.name || 'Business',
      avatar: business.avatar || null,
      slug: business.businessSlug || business.slug || null,
    };
    
    console.log('Switching to business profile:', profile);
    switchProfile(profile);
  }, [switchProfile]);

  // Refresh businesses list
  const refreshBusinesses = useCallback(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const value = {
    activeProfile,
    businesses,
    loading,
    switchProfile,
    switchToUser,
    switchToBusiness,
    refreshBusinesses,
    isUserProfile: activeProfile?.type === 'user',
    isBusinessProfile: activeProfile?.type === 'business',
  };

  return (
    <ProfileSwitcherContext.Provider value={value}>
      {children}
    </ProfileSwitcherContext.Provider>
  );
};

