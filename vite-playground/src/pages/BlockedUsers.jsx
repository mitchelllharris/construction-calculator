import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { unblockUser } from '../utils/connectionApi';
import LoadingPage from '../components/LoadingPage';
import { MdArrowBack, MdBlock, MdPerson } from 'react-icons/md';
import Button from '../components/Button';

export default function BlockedUsers() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { isUserProfile, isBusinessProfile, activeProfile } = useProfileSwitcher();
  
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState({});

  useEffect(() => {
    if (!activeProfile) {
      return;
    }
    fetchBlockedUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      const data = await get(API_ENDPOINTS.CONNECTIONS.GET_BLOCKED);
      setBlockedUsers(data.blockedUsers || []);
    } catch (error) {
      showError(error.message || 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId) => {
    if (!window.confirm('Are you sure you want to unblock this user?')) {
      return;
    }

    setUnblocking(prev => ({ ...prev, [userId]: true }));
    try {
      await unblockUser(userId);
      showSuccess('User unblocked');
      setBlockedUsers(prev => prev.filter(u => u._id !== userId));
    } catch (error) {
      showError(error.message || 'Failed to unblock user');
    } finally {
      setUnblocking(prev => ({ ...prev, [userId]: false }));
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
    return <LoadingPage message="Loading blocked users..." />;
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
          <h1 className="text-3xl font-bold mb-2">Blocked Users</h1>
          <p className="text-gray-600">
            {isBusinessProfile ? 'Business' : 'Users'} you have blocked ({blockedUsers.length})
          </p>
        </div>

        {blockedUsers.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <MdBlock size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No blocked users</h2>
            <p className="text-gray-500">
              You haven't blocked any users yet
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <div className="divide-y divide-gray-200">
              {blockedUsers.map((user) => (
                <div
                  key={user._id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getImageUrl(user.avatar) ? (
                        <img
                          src={getImageUrl(user.avatar)}
                          alt={user.firstName || user.username}
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold shrink-0">
                          {getInitials(user)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.username || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(user._id)}
                      disabled={unblocking[user._id]}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      <MdBlock size={18} />
                      {unblocking[user._id] ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
