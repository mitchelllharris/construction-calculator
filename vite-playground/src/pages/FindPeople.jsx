import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import { MdSearch, MdPerson, MdBusiness, MdLocationOn, MdWork } from 'react-icons/md';

export default function FindPeople() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();
  const { showError } = useToast();

  // Debounced search function
  const performSearch = useCallback(async (term, type) => {
    if (!term.trim()) {
      setResults([]);
      setHasSearched(false);
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

      const response = await fetch(API_ENDPOINTS.USER.SEARCH(term, type, 1, 20), {
        headers: {
          'x-access-token': token,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to search' }));
        throw new Error(error.message || 'Failed to search');
      }

      const data = await response.json();
      setResults(data.users || []);
    } catch (error) {
      showError(error.message || 'Failed to search users');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchTerm, typeFilter);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, typeFilter, performSearch]);

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

  const handleUserClick = (username) => {
    navigate(`/profile/${username}`);
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
                {results.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user.username)}
                    className="bg-white shadow rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-500"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {getImageUrl(user.avatar) ? (
                        <img
                          src={getImageUrl(user.avatar)}
                          alt={user.fullName}
                          className="w-16 h-16 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xl shrink-0">
                          {getInitials(user)}
                        </div>
                      )}

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        {/* Name/Business Name */}
                        {user.businessName ? (
                          <h3 className="font-bold text-gray-900 truncate">{user.businessName}</h3>
                        ) : (
                          <h3 className="font-bold text-gray-900 truncate">{user.fullName}</h3>
                        )}

                        {/* Username */}
                        <p className="text-sm text-gray-500 truncate">@{user.username}</p>

                        {/* Trade */}
                        {user.trade && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                            <MdWork size={16} />
                            <span className="truncate">{user.trade}</span>
                          </div>
                        )}

                        {/* Location */}
                        {user.locationString && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                            <MdLocationOn size={16} />
                            <span className="truncate">{user.locationString}</span>
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

