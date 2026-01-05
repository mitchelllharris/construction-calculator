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
  const [activeProfile, setActiveProfile] = useState(null); // { type: 'user' | 'business', id: string, accountId: number, name: string, avatar?: string, pageId?: string }
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

    // Always default to user profile first to ensure we have a valid profile
    const defaultUserProfile = {
      type: 'user',
      id: user.id,
      accountId: user.accountId || null,
      name: user.username || `${user.firstName} ${user.lastName}`,
      avatar: user.avatar,
      pageId: user.pageId || null,
    };

    // Try to load from localStorage
    const savedProfile = localStorage.getItem('activeProfile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        // Verify the profile still exists and has required fields
        if (parsed.type === 'user' && parsed.id === user.id && parsed.id) {
          // Ensure all required fields are present
          const userProfile = {
            ...defaultUserProfile,
            ...parsed,
            id: parsed.id || user.id, // Ensure id is always set
          };
          setActiveProfile(userProfile);
          // Update localStorage to ensure it's current
          localStorage.setItem('activeProfile', JSON.stringify(userProfile));
        } else if (parsed.type === 'business' && parsed.id) {
          // For business profiles, we'll verify when businesses are loaded
          // But ensure id is set and save it
          const businessProfile = {
            ...parsed,
            id: parsed.id, // Ensure id is present
          };
          setActiveProfile(businessProfile);
          // Keep the saved profile, it will be validated when businesses load
        } else {
          // Default to user profile if saved profile is invalid
          setActiveProfile(defaultUserProfile);
          localStorage.setItem('activeProfile', JSON.stringify(defaultUserProfile));
        }
      } catch (error) {
        console.error('Failed to parse saved profile:', error);
        setActiveProfile(defaultUserProfile);
        localStorage.setItem('activeProfile', JSON.stringify(defaultUserProfile));
      }
    } else {
      // Default to user profile and save it
      setActiveProfile(defaultUserProfile);
      localStorage.setItem('activeProfile', JSON.stringify(defaultUserProfile));
    }

    fetchBusinesses();
  }, [isAuthenticated, user, fetchBusinesses]);

  // Verify saved business profile still exists when businesses are loaded
  useEffect(() => {
    if (activeProfile?.type === 'business' && businesses.length > 0 && user) {
      const businessId = String(activeProfile.id || '');
      const businessExists = businesses.find(b => {
        const bId = String(b._id || b.id || '');
        return bId === businessId;
      });
      
      if (!businessExists || !businessId) {
        // Business doesn't exist or id is missing, fall back to user profile
        const userProfile = {
          type: 'user',
          id: user.id,
          accountId: user.accountId || null,
          name: user.username || `${user.firstName} ${user.lastName}`,
          avatar: user.avatar,
          pageId: user.pageId || null,
        };
        setActiveProfile(userProfile);
        localStorage.setItem('activeProfile', JSON.stringify(userProfile));
      } else {
        const businessIdStr = String(businessExists._id || businessExists.id);
        const currentIdStr = String(activeProfile.id || '');
        
        // Ensure we always have a valid id
        if (!currentIdStr || currentIdStr !== businessIdStr) {
          const updatedProfile = {
            type: 'business',
            id: businessExists._id || businessExists.id,
            accountId: businessExists.accountId || null,
            name: businessExists.businessName,
            avatar: businessExists.avatar,
            slug: businessExists.businessSlug,
            pageId: businessExists.pageId || null,
          };
          setActiveProfile(updatedProfile);
          localStorage.setItem('activeProfile', JSON.stringify(updatedProfile));
        } else {
          // Check if other fields have changed
          const hasChanged = 
            activeProfile.name !== businessExists.businessName ||
            activeProfile.avatar !== businessExists.avatar ||
            activeProfile.slug !== businessExists.businessSlug ||
            activeProfile.accountId !== businessExists.accountId ||
            activeProfile.pageId !== businessExists.pageId;
          
          if (hasChanged) {
            const updatedProfile = {
              type: 'business',
              id: businessExists._id || businessExists.id,
              accountId: businessExists.accountId || null,
              name: businessExists.businessName,
              avatar: businessExists.avatar,
              slug: businessExists.businessSlug,
              pageId: businessExists.pageId || null,
            };
            setActiveProfile(updatedProfile);
            localStorage.setItem('activeProfile', JSON.stringify(updatedProfile));
          }
        }
      }
    } else if (activeProfile?.type === 'business' && !loading && businesses.length === 0 && user) {
      // Businesses loaded but none found, and we're on a business profile - fall back to user
      const userProfile = {
        type: 'user',
        id: user.id,
        accountId: user.accountId || null,
        name: user.username || `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        pageId: user.pageId || null,
      };
      setActiveProfile(userProfile);
      localStorage.setItem('activeProfile', JSON.stringify(userProfile));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses, loading]);

  // Switch to a profile
  const switchProfile = useCallback((profile) => {
    setActiveProfile(profile);
    localStorage.setItem('activeProfile', JSON.stringify(profile));
  }, []);

  // Switch to user profile
  const switchToUser = useCallback(() => {
    if (!user) return;
    const profile = {
      type: 'user',
      id: user.id,
      accountId: user.accountId || null,
      name: user.username || `${user.firstName} ${user.lastName}`,
      avatar: user.avatar,
      pageId: user.pageId || null,
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
      accountId: business.accountId || null,
      name: business.businessName || business.name || 'Business',
      avatar: business.avatar || null,
      slug: business.businessSlug || business.slug || null,
      pageId: business.pageId || null,
    };
    
    switchProfile(profile);
  }, [switchProfile]);

  // Refresh businesses list
  const refreshBusinesses = useCallback(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Computed: activeUserId is the accountId of the active profile
  const activeUserId = activeProfile?.accountId || null;

  const value = {
    activeProfile,
    activeUserId, // The accountId of the currently active profile
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

