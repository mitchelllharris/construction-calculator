import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { unfollowUser, getFollowers, getPendingFollowRequests, acceptFollowRequest, rejectFollowRequest, followUser, getFollowStatus } from '../utils/followApi';
import { blockUser, sendConnectionRequest, getConnectionStatus, removeConnection, acceptConnectionRequest, rejectConnectionRequest } from '../utils/connectionApi';
import LoadingPage from '../components/LoadingPage';
import { MdArrowBack, MdPersonRemove, MdPerson, MdCheck, MdClose, MdMoreVert, MdVisibility, MdBlock, MdPersonAdd } from 'react-icons/md';
import Button from '../components/Button';

export default function Following() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { isUserProfile, isBusinessProfile, activeProfile } = useProfileSwitcher();
  
  const [activeTab, setActiveTab] = useState('following'); // 'following' or 'followers'
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unfollowing, setUnfollowing] = useState({});
  const [processingRequest, setProcessingRequest] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});
  const [followerConnectionStatuses, setFollowerConnectionStatuses] = useState({});
  const [followerFollowStatuses, setFollowerFollowStatuses] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!activeProfile) {
      return;
    }
    setLoading(true);
    Promise.all([fetchFollowing(), fetchFollowers(), fetchIncomingRequests()]).finally(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  const fetchFollowing = async () => {
    try {
      const data = await get(API_ENDPOINTS.FOLLOW.GET_FOLLOWING);
      setFollowing(data.following || []);
      setPendingRequests(data.pending || []);
    } catch (error) {
      showError(error.message || 'Failed to load following list');
    }
  };

  const fetchFollowers = async () => {
    try {
      const data = await getFollowers();
      setFollowers(data.followers || []);
      
      // Fetch connection and follow statuses for followers
      if (data.followers && data.followers.length > 0) {
        await fetchFollowerStatuses(data.followers);
      }
    } catch (error) {
      showError(error.message || 'Failed to load followers list');
    }
  };

  const fetchFollowerStatuses = async (followerList) => {
    if (!activeProfile) return;
    
    const requesterType = isBusinessProfile ? 'Business' : 'User';
    const businessId = isBusinessProfile ? activeProfile?.id : null;
    
    const statusPromises = followerList
      .filter(f => !f.isBusiness) // Only fetch for users
      .map(async (follower) => {
        try {
          const [connectionStatus, followStatus] = await Promise.all([
            getConnectionStatus(follower._id, requesterType, 'User', businessId),
            getFollowStatus(follower._id)
          ]);
          
          return {
            userId: follower._id,
            connectionStatus: connectionStatus?.status || 'none',
            connection: connectionStatus?.connection,
            followStatus: followStatus?.status || 'none',
            follow: followStatus?.follow
          };
        } catch (error) {
          return {
            userId: follower._id,
            connectionStatus: 'none',
            connection: null,
            followStatus: 'none',
            follow: null
          };
        }
      });
    
    const results = await Promise.all(statusPromises);
    const connectionMap = {};
    const followMap = {};
    
    results.forEach(({ userId, connectionStatus, connection, followStatus, follow }) => {
      connectionMap[userId] = { status: connectionStatus, connection };
      followMap[userId] = { status: followStatus, follow };
    });
    
    setFollowerConnectionStatuses(connectionMap);
    setFollowerFollowStatuses(followMap);
  };

  const fetchIncomingRequests = async () => {
    try {
      const data = await getPendingFollowRequests();
      setIncomingRequests(data.requests || []);
    } catch (error) {
      showError(error.message || 'Failed to load incoming follow requests');
    }
  };

  const handleUnfollow = async (userId) => {
    setUnfollowing(prev => ({ ...prev, [userId]: true }));
    try {
      await unfollowUser(userId);
      showSuccess('Unfollowed user');
      setFollowing(prev => prev.filter(u => u._id !== userId));
      setPendingRequests(prev => prev.filter(u => u._id !== userId));
    } catch (error) {
      showError(error.message || 'Failed to unfollow user');
    } finally {
      setUnfollowing(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAcceptRequest = async (followId, userId) => {
    setProcessingRequest(prev => ({ ...prev, [followId]: true }));
    try {
      await acceptFollowRequest(followId);
      showSuccess('Follow request accepted');
      setIncomingRequests(prev => prev.filter(r => r._id !== followId));
      await fetchFollowers();
    } catch (error) {
      showError(error.message || 'Failed to accept follow request');
    } finally {
      setProcessingRequest(prev => ({ ...prev, [followId]: false }));
    }
  };

  const handleRejectRequest = async (followId) => {
    setProcessingRequest(prev => ({ ...prev, [followId]: true }));
    try {
      await rejectFollowRequest(followId);
      showSuccess('Follow request rejected');
      setIncomingRequests(prev => prev.filter(r => r._id !== followId));
    } catch (error) {
      showError(error.message || 'Failed to reject follow request');
    } finally {
      setProcessingRequest(prev => ({ ...prev, [followId]: false }));
    }
  };

  const handleBlockUser = async (userId) => {
    if (!window.confirm('Are you sure you want to block this user? This will remove your connection and prevent them from contacting you.')) {
      return;
    }
    try {
      await blockUser(userId);
      showSuccess('User blocked');
      // Remove from lists
      setFollowing(prev => prev.filter(u => u._id !== userId));
      setFollowers(prev => prev.filter(u => u._id !== userId));
      setPendingRequests(prev => prev.filter(u => u._id !== userId));
      setOpenMenuId(null);
    } catch (error) {
      showError(error.message || 'Failed to block user');
    }
  };

  const handleViewProfile = (item) => {
    navigate(item.isBusiness ? `/business/${item.username}` : `/profile/${item.username}`);
    setOpenMenuId(null);
  };

  const handleConnect = async (userId) => {
    setActionLoading(prev => ({ ...prev, [`connect-${userId}`]: true }));
    try {
      const requesterType = isBusinessProfile ? 'Business' : 'User';
      const businessId = isBusinessProfile ? activeProfile?.id : null;
      await sendConnectionRequest(userId, requesterType, 'User', businessId);
      showSuccess('Connection request sent');
      
      // Update connection status
      const connectionStatus = await getConnectionStatus(userId, requesterType, 'User', businessId);
      setFollowerConnectionStatuses(prev => ({
        ...prev,
        [userId]: { status: connectionStatus?.status || 'pending_sent', connection: connectionStatus?.connection }
      }));
    } catch (error) {
      showError(error.message || 'Failed to send connection request');
    } finally {
      setActionLoading(prev => ({ ...prev, [`connect-${userId}`]: false }));
      setOpenMenuId(null);
    }
  };

  const handleFollow = async (userId) => {
    setActionLoading(prev => ({ ...prev, [`follow-${userId}`]: true }));
    try {
      await followUser(userId);
      showSuccess('Follow request sent');
      
      // Update follow status
      const followStatus = await getFollowStatus(userId);
      setFollowerFollowStatuses(prev => ({
        ...prev,
        [userId]: { status: followStatus?.status || 'pending', follow: followStatus?.follow }
      }));
    } catch (error) {
      showError(error.message || 'Failed to follow user');
    } finally {
      setActionLoading(prev => ({ ...prev, [`follow-${userId}`]: false }));
      setOpenMenuId(null);
    }
  };

  const handleCancelConnection = async (userId, connectionId) => {
    setActionLoading(prev => ({ ...prev, [`cancel-connect-${userId}`]: true }));
    try {
      await removeConnection(connectionId);
      showSuccess('Connection request canceled');
      
      // Update connection status
      const requesterType = isBusinessProfile ? 'Business' : 'User';
      const businessId = isBusinessProfile ? activeProfile?.id : null;
      const connectionStatus = await getConnectionStatus(userId, requesterType, 'User', businessId);
      setFollowerConnectionStatuses(prev => ({
        ...prev,
        [userId]: { status: connectionStatus?.status || 'none', connection: connectionStatus?.connection }
      }));
    } catch (error) {
      showError(error.message || 'Failed to cancel connection request');
    } finally {
      setActionLoading(prev => ({ ...prev, [`cancel-connect-${userId}`]: false }));
      setOpenMenuId(null);
    }
  };

  const handleRemoveConnection = async (userId, connectionId) => {
    if (!window.confirm('Are you sure you want to remove this connection?')) {
      return;
    }
    setActionLoading(prev => ({ ...prev, [`remove-connect-${userId}`]: true }));
    try {
      await removeConnection(connectionId);
      showSuccess('Connection removed');
      
      // Update connection status
      const requesterType = isBusinessProfile ? 'Business' : 'User';
      const businessId = isBusinessProfile ? activeProfile?.id : null;
      const connectionStatus = await getConnectionStatus(userId, requesterType, 'User', businessId);
      setFollowerConnectionStatuses(prev => ({
        ...prev,
        [userId]: { status: connectionStatus?.status || 'none', connection: connectionStatus?.connection }
      }));
    } catch (error) {
      showError(error.message || 'Failed to remove connection');
    } finally {
      setActionLoading(prev => ({ ...prev, [`remove-connect-${userId}`]: false }));
      setOpenMenuId(null);
    }
  };

  const handleAcceptConnection = async (userId, connectionId) => {
    setActionLoading(prev => ({ ...prev, [`accept-connect-${userId}`]: true }));
    try {
      const recipientType = isBusinessProfile ? 'Business' : 'User';
      const businessId = isBusinessProfile ? activeProfile?.id : null;
      await acceptConnectionRequest(connectionId, recipientType, businessId);
      showSuccess('Connection request accepted');
      
      // Update connection status
      const requesterType = isBusinessProfile ? 'Business' : 'User';
      const connectionStatus = await getConnectionStatus(userId, requesterType, 'User', businessId);
      setFollowerConnectionStatuses(prev => ({
        ...prev,
        [userId]: { status: connectionStatus?.status || 'accepted', connection: connectionStatus?.connection }
      }));
    } catch (error) {
      showError(error.message || 'Failed to accept connection request');
    } finally {
      setActionLoading(prev => ({ ...prev, [`accept-connect-${userId}`]: false }));
      setOpenMenuId(null);
    }
  };

  const handleRejectConnection = async (userId, connectionId) => {
    setActionLoading(prev => ({ ...prev, [`reject-connect-${userId}`]: true }));
    try {
      const recipientType = isBusinessProfile ? 'Business' : 'User';
      const businessId = isBusinessProfile ? activeProfile?.id : null;
      await rejectConnectionRequest(connectionId, recipientType, businessId);
      showSuccess('Connection request rejected');
      
      // Update connection status
      const requesterType = isBusinessProfile ? 'Business' : 'User';
      const connectionStatus = await getConnectionStatus(userId, requesterType, 'User', businessId);
      setFollowerConnectionStatuses(prev => ({
        ...prev,
        [userId]: { status: connectionStatus?.status || 'none', connection: connectionStatus?.connection }
      }));
    } catch (error) {
      showError(error.message || 'Failed to reject connection request');
    } finally {
      setActionLoading(prev => ({ ...prev, [`reject-connect-${userId}`]: false }));
      setOpenMenuId(null);
    }
  };

  const handleCancelFollow = async (userId) => {
    setActionLoading(prev => ({ ...prev, [`cancel-follow-${userId}`]: true }));
    try {
      await unfollowUser(userId);
      showSuccess('Follow request canceled');
      
      // Update follow status
      const followStatus = await getFollowStatus(userId);
      setFollowerFollowStatuses(prev => ({
        ...prev,
        [userId]: { status: followStatus?.status || 'none', follow: followStatus?.follow }
      }));
    } catch (error) {
      showError(error.message || 'Failed to cancel follow request');
    } finally {
      setActionLoading(prev => ({ ...prev, [`cancel-follow-${userId}`]: false }));
      setOpenMenuId(null);
    }
  };

  const handleUnfollowFollower = async (userId) => {
    setActionLoading(prev => ({ ...prev, [`unfollow-${userId}`]: true }));
    try {
      await unfollowUser(userId);
      showSuccess('Unfollowed user');
      
      // Update follow status
      const followStatus = await getFollowStatus(userId);
      setFollowerFollowStatuses(prev => ({
        ...prev,
        [userId]: { status: followStatus?.status || 'none', follow: followStatus?.follow }
      }));
    } catch (error) {
      showError(error.message || 'Failed to unfollow user');
    } finally {
      setActionLoading(prev => ({ ...prev, [`unfollow-${userId}`]: false }));
      setOpenMenuId(null);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const getImageUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${avatar}`;
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

  if (loading) {
    return <LoadingPage message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            <MdArrowBack size={20} />
            Back
          </button>
          <h1 className="text-3xl font-bold mb-2">Following & Followers</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'following'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Following ({following.length})
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'followers'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Followers ({followers.length})
            </button>
          </div>
        </div>

        {/* Incoming Follow Requests Section - Show at top for both tabs */}
        {incomingRequests.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Incoming Follow Requests</h2>
              <p className="text-sm text-gray-500">Follow requests waiting for your approval</p>
            </div>
            <div className="divide-y divide-gray-200">
              {incomingRequests.map((request) => {
                const follower = request.follower || request;
                return (
                  <div
                    key={request._id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => navigate(follower.isBusiness ? `/business/${follower.username}` : `/profile/${follower.username}`)}
                      >
                        {getImageUrl(follower.avatar) ? (
                          <img
                            src={getImageUrl(follower.avatar)}
                            alt={follower.isBusiness ? follower.businessName : (follower.firstName || follower.username)}
                            className="w-12 h-12 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                            {follower.isBusiness ? follower.businessName?.charAt(0)?.toUpperCase() || 'B' : getInitials(follower)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {follower.isBusiness 
                              ? follower.businessName || 'Unknown Business'
                              : (follower.firstName && follower.lastName
                                  ? `${follower.firstName} ${follower.lastName}`
                                  : follower.username || 'Unknown User')}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">@{follower.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request._id, follower._id)}
                          disabled={processingRequest[request._id]}
                          className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2 disabled:opacity-50"
                        >
                          <MdCheck size={18} />
                          {processingRequest[request._id] ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request._id)}
                          disabled={processingRequest[request._id]}
                          className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2 disabled:opacity-50"
                        >
                          <MdClose size={18} />
                          {processingRequest[request._id] ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'following' ? (
          <>
            {/* Pending Follow Requests Section (Outgoing) */}
            {pendingRequests.length > 0 && (
              <div className="bg-white shadow rounded-lg mb-6">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
                  <p className="text-sm text-gray-500">Follow requests you've sent waiting for approval</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {pendingRequests.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => navigate(item.isBusiness ? `/business/${item.username}` : `/profile/${item.username}`)}
                        >
                          {getImageUrl(item.avatar) ? (
                            <img
                              src={getImageUrl(item.avatar)}
                              alt={item.isBusiness ? item.businessName : (item.firstName || item.username)}
                              className="w-12 h-12 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                              {item.isBusiness ? item.businessName?.charAt(0)?.toUpperCase() || 'B' : getInitials(item)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {item.isBusiness 
                                ? item.businessName || 'Unknown Business'
                                : (item.firstName && item.lastName
                                    ? `${item.firstName} ${item.lastName}`
                                    : item.username || 'Unknown User')}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">@{item.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUnfollow(item._id)}
                            disabled={unfollowing[item._id]}
                            className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center gap-2 disabled:opacity-50"
                          >
                            <MdPersonRemove size={18} />
                            {unfollowing[item._id] ? 'Cancelling...' : 'Cancel Request'}
                          </button>
                          {/* More Menu */}
                          <div 
                            className="relative" 
                            ref={el => menuRefs.current[`pending-${item._id}`] = el}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === `pending-${item._id}` ? null : `pending-${item._id}`);
                              }}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                            >
                              <MdMoreVert size={20} />
                            </button>
                            {openMenuId === `pending-${item._id}` && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                <div className="py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewProfile(item);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <MdVisibility size={18} />
                                    View Profile
                                  </button>
                                  <div className="border-t border-gray-200 my-1"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBlockUser(item._id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <MdBlock size={18} />
                                    Block User
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Following Section */}
            {following.length === 0 && pendingRequests.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <MdPerson size={64} className="mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Not following anyone yet</h2>
                <p className="text-gray-500 mb-4">
                  Start following users to see their posts in your feed
                </p>
                <Button onClick={() => navigate('/find-people')}>
                  Find People
                </Button>
              </div>
            ) : following.length > 0 ? (
              <div className="bg-white shadow rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Following</h2>
                  <p className="text-sm text-gray-500">People you are currently following</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {following.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => navigate(item.isBusiness ? `/business/${item.username}` : `/profile/${item.username}`)}
                        >
                          {getImageUrl(item.avatar) ? (
                            <img
                              src={getImageUrl(item.avatar)}
                              alt={item.isBusiness ? item.businessName : (item.firstName || item.username)}
                              className="w-12 h-12 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                              {item.isBusiness ? item.businessName?.charAt(0)?.toUpperCase() || 'B' : getInitials(item)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {item.isBusiness 
                                ? item.businessName || 'Unknown Business'
                                : (item.firstName && item.lastName
                                    ? `${item.firstName} ${item.lastName}`
                                    : item.username || 'Unknown User')}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">@{item.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUnfollow(item._id)}
                            disabled={unfollowing[item._id]}
                            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
                          >
                            <MdPersonRemove size={18} />
                            {unfollowing[item._id] ? 'Unfollowing...' : 'Unfollow'}
                          </button>
                          {/* More Menu */}
                          <div 
                            className="relative" 
                            ref={el => menuRefs.current[`following-${item._id}`] = el}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === `following-${item._id}` ? null : `following-${item._id}`);
                              }}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                            >
                              <MdMoreVert size={20} />
                            </button>
                            {openMenuId === `following-${item._id}` && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                <div className="py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewProfile(item);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <MdVisibility size={18} />
                                    View Profile
                                  </button>
                                  <div className="border-t border-gray-200 my-1"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBlockUser(item._id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <MdBlock size={18} />
                                    Block User
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          /* Followers Tab */
          followers.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <MdPerson size={64} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No followers yet</h2>
              <p className="text-gray-500 mb-4">
                Users who follow you will appear here
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Followers</h2>
                <p className="text-sm text-gray-500">People who are following you</p>
              </div>
              <div className="divide-y divide-gray-200">
                {followers.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => navigate(item.isBusiness ? `/business/${item.username}` : `/profile/${item.username}`)}
                      >
                        {getImageUrl(item.avatar) ? (
                          <img
                            src={getImageUrl(item.avatar)}
                            alt={item.isBusiness ? item.businessName : (item.firstName || item.username)}
                            className="w-12 h-12 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                            {item.isBusiness ? item.businessName?.charAt(0)?.toUpperCase() || 'B' : getInitials(item)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {item.isBusiness 
                              ? item.businessName || 'Unknown Business'
                              : (item.firstName && item.lastName
                                  ? `${item.firstName} ${item.lastName}`
                                  : item.username || 'Unknown User')}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">@{item.username}</p>
                        </div>
                      </div>
                      {/* More Menu */}
                      <div 
                        className="relative" 
                        ref={el => menuRefs.current[`follower-${item._id}`] = el}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === `follower-${item._id}` ? null : `follower-${item._id}`);
                          }}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        >
                          <MdMoreVert size={20} />
                        </button>
                        {openMenuId === `follower-${item._id}` && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewProfile(item);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <MdVisibility size={18} />
                                View Profile
                              </button>
                              <div className="border-t border-gray-200 my-1"></div>
                              {/* Connection actions */}
                              {(() => {
                                const connectionStatus = followerConnectionStatuses[item._id]?.status || 'none';
                                const connection = followerConnectionStatuses[item._id]?.connection;
                                const connectionId = connection?._id;
                                const isConnected = connectionStatus === 'accepted';
                                const isPendingSent = connectionStatus === 'pending_sent' || connectionStatus === 'pending';
                                const isPendingReceived = connectionStatus === 'pending_received';
                                
                                if (isConnected) {
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveConnection(item._id, connectionId);
                                      }}
                                      disabled={actionLoading[`remove-connect-${item._id}`]}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <MdPersonRemove size={18} />
                                      {actionLoading[`remove-connect-${item._id}`] ? 'Removing...' : 'Remove Connection'}
                                    </button>
                                  );
                                } else if (isPendingSent) {
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelConnection(item._id, connectionId);
                                      }}
                                      disabled={actionLoading[`cancel-connect-${item._id}`]}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <MdPersonRemove size={18} />
                                      {actionLoading[`cancel-connect-${item._id}`] ? 'Canceling...' : 'Cancel Request'}
                                    </button>
                                  );
                                } else if (isPendingReceived) {
                                  return (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAcceptConnection(item._id, connectionId);
                                        }}
                                        disabled={actionLoading[`accept-connect-${item._id}`]}
                                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50"
                                      >
                                        <MdCheck size={18} />
                                        {actionLoading[`accept-connect-${item._id}`] ? 'Accepting...' : 'Accept Request'}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRejectConnection(item._id, connectionId);
                                        }}
                                        disabled={actionLoading[`reject-connect-${item._id}`]}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                                      >
                                        <MdClose size={18} />
                                        {actionLoading[`reject-connect-${item._id}`] ? 'Rejecting...' : 'Reject Request'}
                                      </button>
                                    </>
                                  );
                                } else {
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConnect(item._id);
                                      }}
                                      disabled={actionLoading[`connect-${item._id}`]}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <MdPersonAdd size={18} />
                                      {actionLoading[`connect-${item._id}`] ? 'Connecting...' : 'Connect'}
                                    </button>
                                  );
                                }
                              })()}
                              {/* Follow actions */}
                              {(() => {
                                const followStatus = followerFollowStatuses[item._id]?.status || 'none';
                                const follow = followerFollowStatuses[item._id]?.follow;
                                const followId = follow?._id;
                                const isFollowing = followStatus === 'accepted';
                                const isPending = followStatus === 'pending';
                                
                                if (isFollowing) {
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnfollowFollower(item._id);
                                      }}
                                      disabled={actionLoading[`unfollow-${item._id}`]}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <MdPersonRemove size={18} />
                                      {actionLoading[`unfollow-${item._id}`] ? 'Unfollowing...' : 'Unfollow'}
                                    </button>
                                  );
                                } else if (isPending) {
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelFollow(item._id);
                                      }}
                                      disabled={actionLoading[`cancel-follow-${item._id}`]}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <MdPersonRemove size={18} />
                                      {actionLoading[`cancel-follow-${item._id}`] ? 'Canceling...' : 'Cancel Follow Request'}
                                    </button>
                                  );
                                } else {
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFollow(item._id);
                                      }}
                                      disabled={actionLoading[`follow-${item._id}`]}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <MdPersonAdd size={18} />
                                      {actionLoading[`follow-${item._id}`] ? 'Following...' : 'Follow'}
                                    </button>
                                  );
                                }
                              })()}
                              <div className="border-t border-gray-200 my-1"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBlockUser(item._id);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <MdBlock size={18} />
                                Block User
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
