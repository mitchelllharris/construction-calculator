import { getToken } from './api';
import { API_ENDPOINTS } from '../config/api';

/**
 * Send a connection request to a user
 * @param {string} recipientId - The ID of the user to send the request to
 * @returns {Promise<Object>} The connection object
 */
export const sendConnectionRequest = async (recipientId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to send connection requests');
  }

  const response = await fetch(API_ENDPOINTS.CONNECTIONS.SEND_REQUEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify({ recipientId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to send connection request');
  }

  return data;
};

/**
 * Accept a connection request
 * @param {string} connectionId - The ID of the connection request
 * @param {string} recipientType - Type of recipient: 'User' or 'Business'
 * @param {string} businessId - Business ID if recipientType is 'Business'
 * @returns {Promise<Object>} The connection object
 */
export const acceptConnectionRequest = async (connectionId, recipientType = 'User', businessId = null) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to accept connection requests');
  }

  const body = { recipientType };
  if (businessId) {
    body.businessId = businessId;
  }

  const response = await fetch(API_ENDPOINTS.CONNECTIONS.ACCEPT(connectionId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to accept connection request');
  }

  return data;
};

/**
 * Reject a connection request
 * @param {string} connectionId - The ID of the connection request
 * @param {string} recipientType - Type of recipient: 'User' or 'Business'
 * @param {string} businessId - Business ID if recipientType is 'Business'
 * @returns {Promise<Object>} The connection object
 */
export const rejectConnectionRequest = async (connectionId, recipientType = 'User', businessId = null) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to reject connection requests');
  }

  const body = { recipientType };
  if (businessId) {
    body.businessId = businessId;
  }

  const response = await fetch(API_ENDPOINTS.CONNECTIONS.REJECT(connectionId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to reject connection request');
  }

  return data;
};

/**
 * Get connection status with a specific user or business
 * @param {string} userId - The ID of the user/business to check status with
 * @param {string} requesterType - Type of requester: 'User' or 'Business'
 * @param {string} recipientType - Type of recipient: 'User' or 'Business'
 * @param {string} businessId - Business ID if requesterType is 'Business'
 * @returns {Promise<Object>} Status object with status and connection info
 */
export const getConnectionStatus = async (userId, requesterType = 'User', recipientType = 'User', businessId = null) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to check connection status');
  }

  const params = new URLSearchParams();
  params.append('requesterType', requesterType);
  params.append('recipientType', recipientType);
  if (businessId) {
    params.append('businessId', businessId);
  }

  const response = await fetch(`${API_ENDPOINTS.CONNECTIONS.GET_STATUS(userId)}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to get connection status');
  }

  return data;
};

/**
 * Get all connections for the current user or business
 * @param {Object} options - Optional filters
 * @param {string} options.status - Filter by status (pending, accepted, rejected)
 * @param {string} options.type - Filter by type (sent, received)
 * @param {string} options.requesterType - Type of requester: 'User' or 'Business'
 * @param {string} options.businessId - Business ID if requesterType is 'Business'
 * @returns {Promise<Object>} Object with connections array and total count
 */
export const getConnections = async (options = {}) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to get connections');
  }

  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.type) params.append('type', options.type);
  if (options.requesterType) params.append('requesterType', options.requesterType);
  if (options.businessId) params.append('businessId', options.businessId);

  const url = `${API_ENDPOINTS.CONNECTIONS.GET_ALL}${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to get connections');
  }

  return data;
};

/**
 * Get pending connection requests (received)
 * @param {string} recipientType - Type of recipient: 'User' or 'Business'
 * @param {string} businessId - Business ID if recipientType is 'Business'
 * @returns {Promise<Object>} Object with requests array and total count
 */
export const getPendingRequests = async (recipientType = 'User', businessId = null) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to get pending requests');
  }

  const params = new URLSearchParams();
  params.append('recipientType', recipientType);
  if (businessId) {
    params.append('businessId', businessId);
  }

  const response = await fetch(`${API_ENDPOINTS.CONNECTIONS.GET_PENDING}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to get pending requests');
  }

  return data;
};

/**
 * Remove/Delete a connection
 * @param {string} connectionId - The ID of the connection to remove
 * @returns {Promise<Object>} Success message
 */
export const removeConnection = async (connectionId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to remove connections');
  }

  const response = await fetch(API_ENDPOINTS.CONNECTIONS.REMOVE(connectionId), {
    method: 'DELETE',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to remove connection');
  }

  return data;
};

/**
 * Follow a connection (set isFollowing to true)
 * @param {string} connectionId - The ID of the connection
 * @returns {Promise<Object>} The connection object
 */
export const followConnection = async (connectionId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to follow connections');
  }

  const response = await fetch(API_ENDPOINTS.CONNECTIONS.FOLLOW(connectionId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to follow connection');
  }

  return data;
};

/**
 * Unfollow a connection (set isFollowing to false)
 * @param {string} connectionId - The ID of the connection
 * @returns {Promise<Object>} The connection object
 */
export const unfollowConnection = async (connectionId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to unfollow connections');
  }

  const response = await fetch(API_ENDPOINTS.CONNECTIONS.UNFOLLOW(connectionId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to unfollow connection');
  }

  return data;
};

/**
 * Block a user
 * @param {string} userId - The ID of the user to block
 * @returns {Promise<Object>} Success message
 */
export const blockUser = async (userId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to block users');
  }

  const response = await fetch(API_ENDPOINTS.CONNECTIONS.BLOCK(userId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to block user');
  }

  return data;
};

/**
 * Unblock a user
 * @param {string} userId - The ID of the user to unblock
 * @returns {Promise<Object>} Success message
 */
export const unblockUser = async (userId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to unblock users');
  }

  const response = await fetch(API_ENDPOINTS.CONNECTIONS.UNBLOCK(userId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to unblock user');
  }

  return data;
};

/**
 * Get block status with a specific user
 * @param {string} userId - The ID of the user to check block status with
 * @returns {Promise<Object>} Block status object
 */
export const getBlockStatus = async (userId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to check block status');
  }

  const response = await fetch(API_ENDPOINTS.CONNECTIONS.GET_BLOCK_STATUS(userId), {
    method: 'GET',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to get block status');
  }

  return data;
};
