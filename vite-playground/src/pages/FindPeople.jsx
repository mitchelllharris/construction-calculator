import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getToken } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { 
  sendConnectionRequest, 
  acceptConnectionRequest, 
  rejectConnectionRequest,
  getConnectionStatus,
  getConnections,
  removeConnection,
  blockUser,
  unblockUser,
  getSuggestedConnections
} from '../utils/connectionApi';
import { getFollowStatus, followUser, unfollowUser } from '../utils/followApi';
import ConnectionActionsMenu from '../components/ConnectionActionsMenu';
import { MdSearch, MdPerson, MdBusiness, MdLocationOn, MdWork, MdPersonAdd, MdCheck, MdClose, MdHourglassEmpty } from 'react-icons/md';

export default function FindPeople() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState({});
  const [followStatuses, setFollowStatuses] = useState({});
  const [connectionLoading, setConnectionLoading] = useState({});
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loadingOutgoing, setLoadingOutgoing] = useState(false);
  const [suggestedConnections, setSuggestedConnections] = useState([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { user } = useAuth();
  const { activeProfile, isBusinessProfile, isUserProfile, loading: profileLoading } = useProfileSwitcher();

  // Fetch connection statuses for multiple users
  const fetchConnectionStatuses = useCallback(async (users) => {
    if (!activeProfile) return;
    
    const userList = users.filter(user => !user.isBusiness && user._id);
    
    // Fetch connection statuses
    const requesterType = isBusinessProfile && activeProfile?.type === 'business' ? 'Business' : 'User';
    const recipientType = 'User'; // FindPeople shows users, not businesses
    const businessId = isBusinessProfile && activeProfile?.type === 'business' ? activeProfile?.id : null;
    
    const connectionPromises = userList.map(async (user) => {
      try {
        const statusData = await getConnectionStatus(user._id, requesterType, recipientType, businessId);
        return { 
          userId: user._id, 
          status: statusData.status, 
          connection: statusData.connection,
          isBlocked: statusData.isBlocked || false
        };
      } catch {
        return { userId: user._id, status: 'none', connection: null, isBlocked: false };
      }
    });
    
    // Fetch follow statuses
    const followPromises = userList.map(async (user) => {
      try {
        const followData = await getFollowStatus(user._id);
        return { 
          userId: user._id, 
          followStatus: followData.status, 
          follow: followData.follow
        };
      } catch {
        return { userId: user._id, followStatus: 'none', follow: null };
      }
    });
    
    const [connectionStatuses, followStatuses] = await Promise.all([
      Promise.all(connectionPromises),
      Promise.all(followPromises)
    ]);
    
    const connectionMap = {};
    connectionStatuses.forEach(({ userId, status, connection, isBlocked }) => {
      connectionMap[userId] = { status, connection, isBlocked };
    });
    
    const followMap = {};
    followStatuses.forEach(({ userId, followStatus, follow }) => {
      followMap[userId] = { status: followStatus, follow };
    });
    
    setConnectionStatuses(prev => ({ ...prev, ...connectionMap }));
    setFollowStatuses(prev => ({ ...prev, ...followMap }));
  }, [isUserProfile, activeProfile]);

  // Debounced search function
  const performSearch = useCallback(async (term, type) => {
    if (!term.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    // Wait for profile to load if still loading or if activeProfile is not set
    if (profileLoading || !activeProfile) {
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
      }
      
      const userId = user?.id || user?._id || null;
      const excludeUserId = (userId && isUserProfile && activeProfile?.type === 'user') ? userId : null;
      const allowOwnProfile = isBusinessProfile && activeProfile?.type === 'business';

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
            if (excludeBusinessId) {
              const businessId = String(business.id || business.businessId || business._id || '');
              const excludeId = String(excludeBusinessId);
              return businessId !== excludeId;
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
        setResults(users);
        
        // Fetch connection statuses for users (only if logged in as a user)
        if (isUserProfile && activeProfile?.type === 'user') {
          fetchConnectionStatuses(users);
        }
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

        const formattedUsers = (usersData.users || []).map(user => ({ ...user, isBusiness: false }));
        const formattedBusinesses = (businessesData.businesses || [])
          .filter(business => {
            if (excludeBusinessId) {
              const businessId = String(business.id || business.businessId || business._id || '');
              const excludeId = String(excludeBusinessId);
              return businessId !== excludeId;
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
        
        // Fetch connection statuses for users (works for both user and business profiles)
        if (activeProfile) {
          fetchConnectionStatuses(formattedUsers);
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to search');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [showError, activeProfile, isBusinessProfile, isUserProfile, profileLoading, user, fetchConnectionStatuses]);

  // Fetch outgoing connection requests
  const fetchOutgoingRequests = useCallback(async () => {
    if (!activeProfile) {
      return;
    }

    setLoadingOutgoing(true);
    try {
      const requesterType = isBusinessProfile && activeProfile?.type === 'business' ? 'Business' : 'User';
      const businessId = isBusinessProfile && activeProfile?.type === 'business' ? activeProfile?.id : null;
      const data = await getConnections({ 
        status: 'pending', 
        type: 'sent',
        requesterType,
        businessId
      });
      const connections = data.connections || [];
      setOutgoingRequests(connections);
      
      // Update connection statuses for users in search results who have pending requests
      if (connections.length > 0 && results.length > 0) {
        const pendingUserIds = connections.map(conn => conn.otherUser?._id || conn.otherUser?.id);
        const usersToUpdate = results.filter(user => 
          pendingUserIds.some(id => id && (user._id === id || user.id === id))
        );
        if (usersToUpdate.length > 0) {
          // Update statuses for these users to pending_sent
          setConnectionStatuses(prev => {
            const updated = { ...prev };
            connections.forEach(conn => {
              const userId = conn.otherUser?._id || conn.otherUser?.id;
              if (userId) {
                updated[userId] = {
                  status: 'pending_sent',
                  connection: { _id: conn._id },
                  isBlocked: false
                };
              }
            });
            return updated;
          });
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to load outgoing requests');
    } finally {
      setLoadingOutgoing(false);
    }
  }, [activeProfile, isBusinessProfile, showError, results]);

  // Fetch suggested connections
  const fetchSuggestedConnections = useCallback(async () => {
    if (!activeProfile) {
      return;
    }

    setLoadingSuggested(true);
    try {
      const data = await getSuggestedConnections(20);
      const suggestions = (data.suggestions || []).map(item => ({
        ...item,
        id: item._id || item.id,
        businessId: item.businessId || item._id
      }));
      setSuggestedConnections(suggestions);
      
      // Fetch connection statuses for suggested connections
      if (suggestions.length > 0) {
        fetchConnectionStatuses(suggestions);
      }
    } catch (error) {
      // Silently fail for suggestions - not critical
    } finally {
      setLoadingSuggested(false);
    }
  }, [activeProfile, fetchConnectionStatuses]);

  // Load outgoing requests and suggested connections on mount and when navigating to this page
  useEffect(() => {
    if (!profileLoading && activeProfile && location.pathname === '/find-people') {
      fetchOutgoingRequests();
      fetchSuggestedConnections();
      // Also refresh connection statuses for existing search results when navigating to this page
      if (results.length > 0) {
        fetchConnectionStatuses(results);
      }
    }
  }, [profileLoading, activeProfile, location.pathname, fetchOutgoingRequests, fetchSuggestedConnections]);

  // Debounce search input
  useEffect(() => {
    if (profileLoading || !activeProfile) {
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

  // Handle connection actions
  const handleConnectionAction = async (action, userId, connectionId = null) => {
    setConnectionLoading(prev => ({ ...prev, [userId]: true }));

    try {
      const requesterType = isUserProfile && activeProfile?.type === 'user' ? 'User' : 'Business';
      const recipientType = 'User'; // FindPeople shows users, not businesses
      const businessId = isBusinessProfile && activeProfile?.type === 'business' ? activeProfile?.id : null;

      let result;
      switch (action) {
        case 'send':
          result = await sendConnectionRequest(userId, requesterType, recipientType, businessId);
          showSuccess('Connection request sent');
          break;
        case 'accept':
          result = await acceptConnectionRequest(connectionId);
          showSuccess('Connection request accepted');
          break;
        case 'reject':
          result = await rejectConnectionRequest(connectionId);
          showSuccess('Connection request rejected');
          break;
        case 'follow':
          result = await followUser(userId);
          if (result.follow.status === 'accepted') {
            showSuccess('Now following this user');
          } else {
            showSuccess('Follow request sent');
          }
          break;
        case 'unfollow':
          await unfollowUser(userId);
          showSuccess('Unfollowed this user');
          break;
        case 'remove':
          await removeConnection(connectionId);
          // Check if it was a pending request or accepted connection
          const currentStatus = connectionStatuses[userId]?.status;
          if (currentStatus === 'pending' || currentStatus === 'pending_sent') {
            showSuccess('Connection request canceled');
          } else {
            showSuccess('Connection removed');
          }
          break;
        case 'block':
          await blockUser(userId);
          showSuccess('User blocked');
          break;
        case 'unblock':
          await unblockUser(userId);
          showSuccess('User unblocked');
          break;
        default:
          throw new Error('Invalid action');
      }

      // Update connection status
      if (action === 'block' || action === 'remove') {
        setConnectionStatuses(prev => ({
          ...prev,
          [userId]: { status: action === 'block' ? 'blocked' : 'none', connection: null, isBlocked: action === 'block' }
        }));
        if (action === 'block') {
          setFollowStatuses(prev => ({
            ...prev,
            [userId]: { status: 'none', follow: null }
          }));
        }
      } else if (action === 'unblock') {
        setConnectionStatuses(prev => ({
          ...prev,
          [userId]: { status: 'none', connection: null, isBlocked: false }
        }));
      } else if (action === 'follow' || action === 'unfollow') {
        // Update follow status
        if (action === 'follow') {
          setFollowStatuses(prev => ({
            ...prev,
            [userId]: { status: result?.follow?.status || 'pending', follow: result?.follow || null }
          }));
        } else {
          setFollowStatuses(prev => ({
            ...prev,
            [userId]: { status: 'none', follow: null }
          }));
        }
      } else {
        // For 'send' action, refresh the status from the server to get the correct pending_sent status
        if (action === 'send') {
          // Refresh the connection status for this specific user
          try {
            const requesterType = isBusinessProfile && activeProfile?.type === 'business' ? 'Business' : 'User';
            const recipientType = 'User';
            const businessId = isBusinessProfile && activeProfile?.type === 'business' ? activeProfile?.id : null;
            const statusData = await getConnectionStatus(userId, requesterType, recipientType, businessId);
            setConnectionStatuses(prev => ({
              ...prev,
              [userId]: { status: statusData.status, connection: statusData.connection || result?.connection, isBlocked: false }
            }));
          } catch {
            // Fallback to pending_sent if refresh fails
            setConnectionStatuses(prev => ({
              ...prev,
              [userId]: { status: 'pending_sent', connection: result?.connection || null, isBlocked: false }
            }));
          }
        } else {
          const newStatus = action === 'accept' ? 'accepted' : 'rejected';
          setConnectionStatuses(prev => ({
            ...prev,
            [userId]: { status: newStatus, connection: result?.connection || null, isBlocked: false }
          }));
        }
      }

      // Refresh outgoing requests if we sent a request
      if (action === 'send') {
        // Wait for outgoing requests to refresh so the list updates
        await fetchOutgoingRequests();
        // Also refresh connection statuses for search results to update the button
        if (results && results.length > 0) {
          await fetchConnectionStatuses(results);
        }
        if (suggestedConnections && suggestedConnections.length > 0) {
          await fetchConnectionStatuses(suggestedConnections);
        }
      }

      // Refresh connection statuses after actions
      if (['accept', 'reject', 'remove', 'block', 'unblock'].includes(action)) {
        if (results && results.length > 0) {
          fetchConnectionStatuses(results);
        }
        if (suggestedConnections && suggestedConnections.length > 0) {
          fetchConnectionStatuses(suggestedConnections);
        }
      }
      
      // For remove action, also refresh the specific user's status and outgoing requests
      if (action === 'remove') {
        try {
          const requesterType = isBusinessProfile && activeProfile?.type === 'business' ? 'Business' : 'User';
          const recipientType = 'User';
          const businessId = isBusinessProfile && activeProfile?.type === 'business' ? activeProfile?.id : null;
          const statusData = await getConnectionStatus(userId, requesterType, recipientType, businessId);
          setConnectionStatuses(prev => ({
            ...prev,
            [userId]: { status: statusData.status, connection: statusData.connection, isBlocked: false }
          }));
        } catch {
          setConnectionStatuses(prev => ({
            ...prev,
            [userId]: { status: 'none', connection: null, isBlocked: false }
          }));
        }
        // Refresh outgoing requests list after removing a connection
        await fetchOutgoingRequests();
      }
    } catch (error) {
      showError(error.message || 'Failed to perform connection action');
    } finally {
      setConnectionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Handle canceling/removing an outgoing request
  const handleCancelRequest = async (connectionId, userId) => {
    setConnectionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      await removeConnection(connectionId);
      showSuccess('Connection request canceled');
      setConnectionStatuses(prev => ({
        ...prev,
        [userId]: { status: 'none', connection: null, isBlocked: false }
      }));
      // Remove from outgoing requests list
      setOutgoingRequests(prev => prev.filter(conn => conn._id !== connectionId));
    } catch (error) {
      showError(error.message || 'Failed to cancel request');
    } finally {
      setConnectionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUserClick = (item, e) => {
    // Don't navigate if clicking on connection buttons
    if (e.target.closest('.connection-button')) {
      return;
    }
    
    if (item.isBusiness) {
      // Navigate to business page
      const businessId = item.businessSlug || item.businessId || item.id;
      navigate(`/business/${businessId}`);
    } else {
      // Navigate to user profile
      navigate(`/profile/${item.username}`);
    }
  };

  // Render connection button based on status
  const renderConnectionButton = (item) => {
    // Only show for users, not businesses
    if (item.isBusiness || !isUserProfile || activeProfile?.type !== 'user') {
      return null;
    }

    // Don't show for own profile
    const userId = user?.id || user?._id;
    if (item._id === userId || item.id === userId) {
      return null;
    }

    const userIdKey = item._id || item.id;
    const connectionInfo = connectionStatuses[userIdKey];
    const followInfo = followStatuses[userIdKey];
    const isLoading = connectionLoading[userIdKey];
    const status = connectionInfo?.status || 'none';
    const connection = connectionInfo?.connection;
    const followStatus = followInfo?.status || 'none';
    const isBlocked = connectionInfo?.isBlocked || false;

    if (isLoading) {
      return (
        <button
          className="connection-button px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed flex items-center gap-1"
          disabled
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          <span>Loading...</span>
        </button>
      );
    }

    if (isBlocked) {
      return (
        <div className="connection-button flex items-center gap-2">
          <span className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg">
            Blocked
          </span>
          <ConnectionActionsMenu
            connectionStatus={status}
            followStatus={followStatus}
            isFollowing={false}
            connectionId={connection?._id}
            userId={userIdKey}
            onAction={handleConnectionAction}
          />
        </div>
      );
    }

    switch (status) {
      case 'accepted':
        return (
          <div className="connection-button flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
              disabled
            >
              <MdCheck size={16} />
              <span>Connected</span>
            </button>
            {followStatus === 'accepted' && (
              <span className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg">
                Following
              </span>
            )}
            <ConnectionActionsMenu
              connectionStatus={status}
              followStatus={followStatus}
              isFollowing={followStatus === 'accepted'}
              connectionId={connection?._id}
              userId={userIdKey}
              onAction={handleConnectionAction}
            />
          </div>
        );
      case 'pending_sent':
      case 'pending':
        return (
          <div className="connection-button flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConnectionAction('remove', userIdKey, connection?._id);
              }}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center gap-1"
            >
              <MdClose size={16} />
              <span>Cancel Request</span>
            </button>
            <ConnectionActionsMenu
              connectionStatus={status}
              followStatus={followStatus}
              isFollowing={followStatus === 'accepted'}
              connectionId={connection?._id}
              userId={userIdKey}
              onAction={handleConnectionAction}
            />
          </div>
        );
      case 'pending_received':
        return (
          <div className="connection-button flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConnectionAction('accept', userIdKey, connection?._id);
              }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <MdCheck size={16} />
              <span>Accept</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConnectionAction('reject', userIdKey, connection?._id);
              }}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
            >
              <MdClose size={16} />
              <span>Reject</span>
            </button>
          </div>
        );
      case 'rejected':
      case 'none':
      default:
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleConnectionAction('send', userIdKey);
            }}
            className="connection-button px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
          >
            <MdPersonAdd size={16} />
            <span>Connect</span>
          </button>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Connections & Networking</h1>
        <p className="text-gray-600">Search for people and businesses, and build your professional network</p>
      </div>

      {/* Outgoing Connection Requests */}
      {activeProfile && (activeProfile?.type === 'user' || activeProfile?.type === 'business') && outgoingRequests.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MdHourglassEmpty size={24} />
            Pending Connection Requests ({outgoingRequests.length})
          </h2>
          {loadingOutgoing ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outgoingRequests.map((conn) => {
                const otherUser = conn.otherUser;
                return (
                  <div
                    key={conn._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      {getImageUrl(otherUser?.avatar) ? (
                        <img
                          src={getImageUrl(otherUser?.avatar)}
                          alt={otherUser?.firstName || otherUser?.username}
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                          {getInitials(otherUser)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {otherUser?.firstName && otherUser?.lastName
                            ? `${otherUser.firstName} ${otherUser.lastName}`
                            : otherUser?.username || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">@{otherUser?.username}</p>
                        <button
                          onClick={() => handleCancelRequest(conn._id, otherUser?._id || otherUser?.id)}
                          disabled={connectionLoading[otherUser?._id || otherUser?.id]}
                          className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                        >
                          <MdClose size={14} />
                          Cancel Request
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
                    onClick={(e) => handleUserClick(item, e)}
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

                        {/* Connection Button */}
                        <div className="mt-3">
                          {renderConnectionButton(item)}
                        </div>
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

      {/* Suggested Connections */}
      {!loading && isUserProfile && activeProfile?.type === 'user' && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Suggested Connections</h2>
          {loadingSuggested ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading suggestions...</p>
            </div>
          ) : suggestedConnections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedConnections.map((item) => (
                <div
                  key={item.id || item.businessId}
                  onClick={(e) => handleUserClick(item, e)}
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

                      {/* Suggestion Reason */}
                      {item.suggestionReason && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          {item.suggestionReason}
                        </p>
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

                      {/* Connection Button */}
                      <div className="mt-3">
                        {renderConnectionButton(item)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <p className="text-gray-600">No suggestions available at this time</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

