import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { unfollowUser } from '../utils/followApi';
import LoadingPage from '../components/LoadingPage';
import { MdArrowBack, MdPersonRemove, MdPerson } from 'react-icons/md';
import Button from '../components/Button';

export default function Following() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { isUserProfile, isBusinessProfile, activeProfile } = useProfileSwitcher();
  
  const [following, setFollowing] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unfollowing, setUnfollowing] = useState({});

  useEffect(() => {
    if (!activeProfile) {
      return;
    }
    fetchFollowing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  const fetchFollowing = async () => {
    setLoading(true);
    try {
      const data = await get(API_ENDPOINTS.FOLLOW.GET_FOLLOWING);
      setFollowing(data.following || []);
      setPendingRequests(data.pending || []);
    } catch (error) {
      showError(error.message || 'Failed to load following list');
    } finally {
      setLoading(false);
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
    return <LoadingPage message="Loading following list..." />;
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
          <h1 className="text-3xl font-bold mb-2">Following</h1>
          <p className="text-gray-600">
            {isBusinessProfile ? 'Business' : 'Users'} you are following ({following.length})
            {pendingRequests.length > 0 && ` • ${pendingRequests.length} pending request${pendingRequests.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Pending Follow Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
              <p className="text-sm text-gray-500">Follow requests waiting for approval</p>
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
                    <button
                      onClick={() => handleUnfollow(item._id)}
                      disabled={unfollowing[item._id]}
                      className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      <MdPersonRemove size={18} />
                      {unfollowing[item._id] ? 'Cancelling...' : 'Cancel Request'}
                    </button>
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
                    <button
                      onClick={() => handleUnfollow(item._id)}
                      disabled={unfollowing[item._id]}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      <MdPersonRemove size={18} />
                      {unfollowing[item._id] ? 'Unfollowing...' : 'Unfollow'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
