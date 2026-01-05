import React, { createContext, useState, useContext, useCallback } from 'react';
import { useProfileSwitcher } from './ProfileSwitcherContext';
import { useToast } from './ToastContext';
import {
  getConnectionStatus,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  getConnections,
  blockUser,
  unblockUser,
} from '../utils/connectionApi';
import { getFollowStatus, followUser, unfollowUser } from '../utils/followApi';

const ConnectionsContext = createContext(null);

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};

export const ConnectionsProvider = ({ children }) => {
  const { activeProfile, isBusinessProfile } = useProfileSwitcher();
  const { showError, showSuccess } = useToast();

  // Global state for connections, follows, and blocks
  const [connectionStatuses, setConnectionStatuses] = useState({}); // { userId: { status, connection, isBlocked } }
  const [followStatuses, setFollowStatuses] = useState({}); // { userId: { status, follow } }
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loadingOutgoing, setLoadingOutgoing] = useState(false);

  // Get requester context for API calls
  const getRequesterContext = useCallback(() => {
    const requesterType = isBusinessProfile && activeProfile?.type === 'business' ? 'Business' : 'User';
    const businessId = isBusinessProfile && activeProfile?.type === 'business' ? activeProfile?.id : null;
    return { requesterType, businessId };
  }, [activeProfile, isBusinessProfile]);

  // Fetch connection status for a specific user
  const fetchConnectionStatus = useCallback(async (userId, recipientType = 'User') => {
    if (!activeProfile || !userId) return null;

    try {
      const { requesterType, businessId } = getRequesterContext();
      const statusData = await getConnectionStatus(userId, requesterType, recipientType, businessId);
      
      setConnectionStatuses(prev => ({
        ...prev,
        [userId]: {
          status: statusData.status,
          connection: statusData.connection,
          isBlocked: statusData.isBlocked || false,
        },
      }));

      return statusData;
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
      return null;
    }
  }, [activeProfile, getRequesterContext]);

  // Fetch follow status for a specific user
  const fetchFollowStatus = useCallback(async (userId) => {
    if (!activeProfile || !userId) return null;

    try {
      const statusData = await getFollowStatus(userId);
      
      setFollowStatuses(prev => ({
        ...prev,
        [userId]: {
          status: statusData.status,
          follow: statusData.follow,
        },
      }));

      return statusData;
    } catch (error) {
      console.error('Failed to fetch follow status:', error);
      return null;
    }
  }, [activeProfile]);

  // Fetch connection statuses for multiple users
  const fetchConnectionStatuses = useCallback(async (users) => {
    if (!activeProfile) return;

    const userList = users.filter(user => !user.isBusiness && (user._id || user.id));
    if (userList.length === 0) return;

    const { requesterType, businessId } = getRequesterContext();
    const recipientType = 'User';

    const promises = userList.map(async (user) => {
      const userId = user._id || user.id;
      try {
        const statusData = await getConnectionStatus(userId, requesterType, recipientType, businessId);
        return {
          userId,
          status: statusData.status,
          connection: statusData.connection,
          isBlocked: statusData.isBlocked || false,
        };
      } catch {
        return {
          userId,
          status: 'none',
          connection: null,
          isBlocked: false,
        };
      }
    });

    const results = await Promise.all(promises);
    const statusMap = {};
    results.forEach(({ userId, status, connection, isBlocked }) => {
      statusMap[userId] = { status, connection, isBlocked };
    });

    setConnectionStatuses(prev => ({ ...prev, ...statusMap }));
  }, [activeProfile, getRequesterContext]);

  // Fetch follow statuses for multiple users
  const fetchFollowStatuses = useCallback(async (users) => {
    if (!activeProfile) return;

    const userList = users.filter(user => !user.isBusiness && (user._id || user.id));
    if (userList.length === 0) return;

    const promises = userList.map(async (user) => {
      const userId = user._id || user.id;
      try {
        const followData = await getFollowStatus(userId);
        return {
          userId,
          status: followData.status,
          follow: followData.follow,
        };
      } catch {
        return {
          userId,
          status: 'none',
          follow: null,
        };
      }
    });

    const results = await Promise.all(promises);
    const statusMap = {};
    results.forEach(({ userId, status, follow }) => {
      statusMap[userId] = { status, follow };
    });

    setFollowStatuses(prev => ({ ...prev, ...statusMap }));
  }, [activeProfile]);

  // Fetch outgoing connection requests
  const fetchOutgoingRequests = useCallback(async () => {
    if (!activeProfile) return;

    setLoadingOutgoing(true);
    try {
      const { requesterType, businessId } = getRequesterContext();
      const data = await getConnections({
        status: 'pending',
        type: 'sent',
        requesterType,
        businessId,
      });
      setOutgoingRequests(data.connections || []);
    } catch (error) {
      console.error('Failed to fetch outgoing requests:', error);
      setOutgoingRequests([]);
    } finally {
      setLoadingOutgoing(false);
    }
  }, [activeProfile, getRequesterContext]);

  // Handle connection action (send, accept, reject, remove)
  const handleConnectionAction = useCallback(async (action, userId, connectionId = null, recipientType = 'User') => {
    if (!activeProfile || !userId) {
      showError('Invalid user ID');
      return;
    }

    const { requesterType, businessId } = getRequesterContext();
    let result = null;

    try {
      switch (action) {
        case 'send':
          result = await sendConnectionRequest(userId, requesterType, recipientType, businessId);
          showSuccess('Connection request sent');
          // Refresh status immediately
          await fetchConnectionStatus(userId, recipientType);
          await fetchOutgoingRequests();
          break;

        case 'accept':
          result = await acceptConnectionRequest(connectionId);
          showSuccess('Connection request accepted');
          await fetchConnectionStatus(userId, recipientType);
          break;

        case 'reject':
          result = await rejectConnectionRequest(connectionId);
          showSuccess('Connection request rejected');
          await fetchConnectionStatus(userId, recipientType);
          break;

        case 'remove':
          await removeConnection(connectionId);
          const currentStatus = connectionStatuses[userId]?.status;
          if (currentStatus === 'pending' || currentStatus === 'pending_sent') {
            showSuccess('Connection request canceled');
          } else {
            showSuccess('Connection removed');
          }
          await fetchConnectionStatus(userId, recipientType);
          await fetchOutgoingRequests();
          break;

        default:
          throw new Error('Invalid connection action');
      }
    } catch (error) {
      showError(error.message || 'Failed to perform connection action');
      throw error;
    }

    return result;
  }, [activeProfile, getRequesterContext, connectionStatuses, showError, showSuccess, fetchConnectionStatus, fetchOutgoingRequests]);

  // Handle follow action (follow, unfollow)
  const handleFollowAction = useCallback(async (action, userId) => {
    if (!activeProfile || !userId) {
      showError('Invalid user ID');
      return;
    }

    try {
      let result = null;
      switch (action) {
        case 'follow':
          result = await followUser(userId);
          if (result.follow.status === 'accepted') {
            showSuccess('Now following this user');
          } else {
            showSuccess('Follow request sent');
          }
          await fetchFollowStatus(userId);
          break;

        case 'unfollow':
          await unfollowUser(userId);
          showSuccess('Unfollowed this user');
          await fetchFollowStatus(userId);
          break;

        default:
          throw new Error('Invalid follow action');
      }
      return result;
    } catch (error) {
      showError(error.message || 'Failed to perform follow action');
      throw error;
    }
  }, [activeProfile, showError, showSuccess, fetchFollowStatus]);

  // Handle block action (block, unblock)
  const handleBlockAction = useCallback(async (action, userId) => {
    if (!activeProfile || !userId) {
      showError('Invalid user ID');
      return;
    }

    try {
      switch (action) {
        case 'block':
          await blockUser(userId);
          showSuccess('User blocked');
          await fetchConnectionStatus(userId);
          break;

        case 'unblock':
          await unblockUser(userId);
          showSuccess('User unblocked');
          await fetchConnectionStatus(userId);
          break;

        default:
          throw new Error('Invalid block action');
      }
    } catch (error) {
      showError(error.message || 'Failed to perform block action');
      throw error;
    }
  }, [activeProfile, showError, showSuccess, fetchConnectionStatus]);

  // Get connection status for a user (from cache or fetch)
  const getConnectionStatusForUser = useCallback((userId) => {
    return connectionStatuses[userId] || { status: 'none', connection: null, isBlocked: false };
  }, [connectionStatuses]);

  // Get follow status for a user (from cache or fetch)
  const getFollowStatusForUser = useCallback((userId) => {
    return followStatuses[userId] || { status: 'none', follow: null };
  }, [followStatuses]);

  // Clear all cached statuses (useful when switching profiles)
  const clearStatuses = useCallback(() => {
    setConnectionStatuses({});
    setFollowStatuses({});
    setOutgoingRequests([]);
  }, []);

  const value = {
    // State
    connectionStatuses,
    followStatuses,
    outgoingRequests,
    loadingOutgoing,

    // Fetch methods
    fetchConnectionStatus,
    fetchFollowStatus,
    fetchConnectionStatuses,
    fetchFollowStatuses,
    fetchOutgoingRequests,

    // Action methods
    handleConnectionAction,
    handleFollowAction,
    handleBlockAction,

    // Getter methods
    getConnectionStatusForUser,
    getFollowStatusForUser,

    // Utility methods
    clearStatuses,
  };

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
};
