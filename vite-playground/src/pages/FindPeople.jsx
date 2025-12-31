import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { MdSearch, MdPerson, MdBusiness, MdLocationOn, MdWork } from 'react-icons/md';

export default function FindPeople() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();
  const { showError } = useToast();
  const { user } = useAuth();
  const { activeProfile, isBusinessProfile, isUserProfile, loading: profileLoading } = useProfileSwitcher();

  // Debounced search function
  const performSearch = useCallback(async (term, type) => {
    if (!term.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    // Wait for profile to load if still loading or if activeProfile is not set
    if (profileLoading || !activeProfile) {
      console.log('Profile not ready. profileLoading:', profileLoading, 'activeProfile:', activeProfile);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    
    try {
      const token = getToken();
      if (!token) {
        showError('Please log in to search');
        return;
      }

      // Get exclusion parameters
      // IMPORTANT: Only exclude the ACTIVE profile, not both
      
      // For business: exclude the active business ID ONLY if we're logged in as a business
      let excludeBusinessId = null;
      if (isBusinessProfile && activeProfile?.type === 'business' && activeProfile?.id) {
        excludeBusinessId = String(activeProfile.id);
        console.log('Excluding business ID:', excludeBusinessId, 'Active profile:', activeProfile);
      }
      
      // Get user ID (this is the logged-in user's personal profile ID)
      const userId = user?.id || user?._id || null;
      
      // Exclude personal profile ONLY if we're logged in as personal user (NOT as business)
      // When logged in as business: excludeUserId = null (don't exclude personal profile)
      // When logged in as personal: excludeUserId = userId (exclude personal profile)
      const excludeUserId = (userId && isUserProfile && activeProfile?.type === 'user') ? userId : null;
      const allowOwnProfile = isBusinessProfile && activeProfile?.type === 'business'; // Allow own profile if logged in as business
      
      // Debug logging
      console.log('FindPeople Search params:', {
        isBusinessProfile,
        isUserProfile,
        activeProfileType: activeProfile?.type,
        activeProfileId: activeProfile?.id,
        activeProfileName: activeProfile?.name,
        userId,
        excludeUserId,
        excludeBusinessId,
        allowOwnProfile,
        searchTerm: term,
        typeFilter: type
      });

      // Search based on type filter
      if (type === 'businesses') {
        // Only search businesses
        const searchUrl = new URL(API_ENDPOINTS.BUSINESSES.SEARCH(term, 1, 20));
        if (excludeBusinessId) {
          searchUrl.searchParams.set('excludeBusinessId', excludeBusinessId);
        }
        const response = await fetch(searchUrl.toString(), {
          headers: {
            'x-access-token': token,
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to search' }));
          throw new Error(error.message || 'Failed to search');
        }

        const data = await response.json();
        // Format businesses to match the display format and filter out active business
        const formattedBusinesses = (data.businesses || [])
          .filter(business => {
            // Exclude active business profile
            if (excludeBusinessId) {
              const businessId = String(business.id || business.businessId || business._id || '');
              const excludeId = String(excludeBusinessId);
              const shouldExclude = businessId === excludeId;
              if (shouldExclude) {
                console.log('Filtering out active business:', business.businessName, 'ID:', businessId);
              }
              return !shouldExclude;
            }
            return true;
          })
          .map(business => ({
            ...business,
            username: business.businessSlug || business.businessId,
            fullName: business.businessName,
            isBusiness: true
          }));
        setResults(formattedBusinesses);
      } else if (type === 'people') {
        // Only search people
        const searchUrl = new URL(API_ENDPOINTS.USER.SEARCH(term, 'people', 1, 20));
        if (excludeUserId) {
          searchUrl.searchParams.set('excludeUserId', excludeUserId);
        }
        if (allowOwnProfile) {
          searchUrl.searchParams.set('allowOwnProfile', 'true');
        }
        console.log('People search URL:', searchUrl.toString());
        console.log('People search params - excludeUserId:', excludeUserId, 'allowOwnProfile:', allowOwnProfile);
        const response = await fetch(searchUrl.toString(), {
          headers: {
            'x-access-token': token,
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to search' }));
          throw new Error(error.message || 'Failed to search');
        }

        const data = await response.json();
        const users = (data.users || []).map(user => ({ ...user, isBusiness: false }));
        console.log('People search results:', users.length, 'users found. Users:', users.map(u => ({ username: u.username, id: u.id })));
        setResults(users);
      } else {
        // Search both people and businesses
        const userSearchUrl = new URL(API_ENDPOINTS.USER.SEARCH(term, 'people', 1, 20));
        if (excludeUserId) {
          userSearchUrl.searchParams.set('excludeUserId', excludeUserId);
        }
        if (allowOwnProfile) {
          userSearchUrl.searchParams.set('allowOwnProfile', 'true');
        }
        
        const businessSearchUrl = new URL(API_ENDPOINTS.BUSINESSES.SEARCH(term, 1, 20));
        if (excludeBusinessId) {
          businessSearchUrl.searchParams.set('excludeBusinessId', excludeBusinessId);
        }
        
        console.log('Combined search - People URL:', userSearchUrl.toString());
        console.log('Combined search - People params - excludeUserId:', excludeUserId, 'allowOwnProfile:', allowOwnProfile);
        console.log('Combined search - Business URL:', businessSearchUrl.toString());
        console.log('Combined search - Business params - excludeBusinessId:', excludeBusinessId);
        
        const [usersResponse, businessesResponse] = await Promise.all([
          fetch(userSearchUrl.toString(), {
            headers: { 'x-access-token': token },
          }),
          fetch(businessSearchUrl.toString(), {
            headers: { 'x-access-token': token },
          })
        ]);

        if (!usersResponse.ok || !businessesResponse.ok) {
          const error = await (usersResponse.ok ? businessesResponse : usersResponse).json().catch(() => ({ message: 'Failed to search' }));
          throw new Error(error.message || 'Failed to search');
        }

        const usersData = await usersResponse.json();
        const businessesData = await businessesResponse.json();

        console.log('Combined search - People results:', (usersData.users || []).length, 'users. Users:', (usersData.users || []).map(u => ({ username: u.username, fullName: u.fullName, id: u.id })));
        console.log('Combined search - Business results:', (businessesData.businesses || []).length, 'businesses');

        // Combine and format results, filtering out active business
        const formattedUsers = (usersData.users || []).map(user => ({ ...user, isBusiness: false }));
        
        const formattedBusinesses = (businessesData.businesses || [])
          .filter(business => {
            // Exclude active business profile
            if (excludeBusinessId) {
              const businessId = String(business.id || business.businessId || business._id || '');
              const excludeId = String(excludeBusinessId);
              const shouldExclude = businessId === excludeId;
              if (shouldExclude) {
                console.log('Filtering out active business from combined results:', business.businessName, 'ID:', businessId);
              }
              return !shouldExclude;
            }
            return true;
          })
          .map(business => ({
            ...business,
            username: business.businessSlug || business.businessId,
            fullName: business.businessName,
            isBusiness: true
          }));

        const combinedResults = [...formattedUsers, ...formattedBusinesses];
        setResults(combinedResults);
      }
    } catch (error) {
      showError(error.message || 'Failed to search');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [showError, activeProfile, isBusinessProfile, isUserProfile, profileLoading, user]);

  // Debounce search input
  useEffect(() => {
    // Don't search if profile is still loading OR if activeProfile is not set yet
    if (profileLoading || !activeProfile) {
      console.log('Waiting for profile to load. profileLoading:', profileLoading, 'activeProfile:', activeProfile);
      return;
    }
    
    const timer = setTimeout(() => {
      performSearch(searchTerm, typeFilter);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, typeFilter, performSearch, profileLoading, activeProfile]);

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') 
      ? url 
      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${url}`;
  };

  const getInitials = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return '?';
  };

  const handleUserClick = (item) => {
    if (item.isBusiness) {
      // Navigate to business page
      const businessId = item.businessSlug || item.businessId || item.id;
      navigate(`/business/${businessId}`);
    } else {
      // Navigate to user profile
      navigate(`/profile/${item.username}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find People</h1>
        <p className="text-gray-600">Search for people and businesses on the platform</p>
      </div>

      {/* Search Input */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="relative mb-4">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
          <input
            type="text"
            placeholder="Search by name, username, business, trade, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              typeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MdSearch size={18} />
            All
          </button>
          <button
            onClick={() => setTypeFilter('people')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              typeFilter === 'people'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MdPerson size={18} />
            People
          </button>
          <button
            onClick={() => setTypeFilter('businesses')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              typeFilter === 'businesses'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MdBusiness size={18} />
            Businesses
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Searching...</p>
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && (
        <div>
          {results.length > 0 ? (
            <>
              <div className="mb-4 text-gray-600">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((item) => (
                  <div
                    key={item.id || item.businessId}
                    onClick={() => handleUserClick(item)}
                    className="bg-white shadow rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-500"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {getImageUrl(item.avatar) ? (
                        <img
                          src={getImageUrl(item.avatar)}
                          alt={item.fullName || item.businessName}
                          className="w-16 h-16 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-full ${item.isBusiness ? 'bg-green-500' : 'bg-blue-500'} flex items-center justify-center text-white font-semibold text-xl shrink-0`}>
                          {item.isBusiness ? (
                            <MdBusiness size={24} />
                          ) : (
                            getInitials(item)
                          )}
                        </div>
                      )}

                      {/* User/Business Info */}
                      <div className="flex-1 min-w-0">
                        {/* Name/Business Name */}
                        <h3 className="font-bold text-gray-900 truncate">{item.fullName || item.businessName}</h3>

                        {/* Username or Business Type */}
                        {item.isBusiness ? (
                          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                            <MdBusiness size={14} />
                            Business
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 truncate">@{item.username}</p>
                        )}

                        {/* Trade */}
                        {item.trade && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                            <MdWork size={16} />
                            <span className="truncate">{item.trade}</span>
                          </div>
                        )}

                        {/* Location */}
                        {item.locationString && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                            <MdLocationOn size={16} />
                            <span className="truncate">{item.locationString}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <MdSearch size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg mb-2">No results found</p>
              <p className="text-gray-500">Try adjusting your search terms or filters</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!loading && !hasSearched && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <MdSearch size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">Start typing to search for people and businesses</p>
        </div>
      )}
    </div>
  );
}

