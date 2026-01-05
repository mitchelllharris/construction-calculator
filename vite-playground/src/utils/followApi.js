import { getToken } from './api';
import { API_ENDPOINTS } from '../config/api';

/**
 * Follow a user (or send follow request if they require approval)
 * @param {string} userId - The ID of the user to follow
 * @returns {Promise<Object>} The follow object
 */
export const followUser = async (userId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to follow users');
  }

  const response = await fetch(API_ENDPOINTS.FOLLOW.FOLLOW(userId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to follow user');
  }

  return data;
};

/**
 * Unfollow a user
 * @param {string} userId - The ID of the user to unfollow
 * @returns {Promise<Object>} Success message
 */
export const unfollowUser = async (userId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to unfollow users');
  }

  const response = await fetch(API_ENDPOINTS.FOLLOW.UNFOLLOW(userId), {
    method: 'DELETE',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to unfollow user');
  }

  return data;
};

/**
 * Accept a follow request
 * @param {string} followId - The ID of the follow request
 * @returns {Promise<Object>} The follow object
 */
export const acceptFollowRequest = async (followId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to accept follow requests');
  }

  const response = await fetch(API_ENDPOINTS.FOLLOW.ACCEPT(followId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to accept follow request');
  }

  return data;
};

/**
 * Reject a follow request
 * @param {string} followId - The ID of the follow request
 * @returns {Promise<Object>} Success message
 */
export const rejectFollowRequest = async (followId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to reject follow requests');
  }

  const response = await fetch(API_ENDPOINTS.FOLLOW.REJECT(followId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to reject follow request');
  }

  return data;
};

/**
 * Get follow status with a specific user
 * @param {string} userId - The ID of the user to check status with
 * @returns {Promise<Object>} Status object with status and follow info
 */
export const getFollowStatus = async (userId) => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to check follow status');
  }

  const response = await fetch(API_ENDPOINTS.FOLLOW.GET_STATUS(userId), {
    method: 'GET',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to get follow status');
  }

  return data;
};

/**
 * Get pending follow requests (received)
 * @returns {Promise<Object>} Object with requests array and total count
 */
export const getPendingFollowRequests = async () => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to get pending follow requests');
  }

  const response = await fetch(API_ENDPOINTS.FOLLOW.GET_PENDING, {
    method: 'GET',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to get pending follow requests');
  }

  return data;
};

/**
 * Get list of followers
 * @returns {Promise<Object>} Object with followers array and total count
 */
export const getFollowers = async () => {
  const token = getToken();
  if (!token) {
    throw new Error('You must be logged in to get followers');
  }

  const response = await fetch(API_ENDPOINTS.FOLLOW.GET_FOLLOWERS, {
    method: 'GET',
    headers: {
      'x-access-token': token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to get followers');
  }

  return data;
};
