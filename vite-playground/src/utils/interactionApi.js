import { get, post, put, del } from './api';
import { API_ENDPOINTS } from '../config/api';

/**
 * Get all interactions for a contact
 * @param {string} contactId - Contact ID
 * @returns {Promise} Array of interactions
 */
export const getContactInteractions = async (contactId) => {
  try {
    const interactions = await get(API_ENDPOINTS.INTERACTIONS.GET_BY_CONTACT(contactId));
    return interactions;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single interaction by ID
 * @param {string} id - Interaction ID
 * @returns {Promise} Interaction object
 */
export const getInteractionById = async (id) => {
  try {
    const interaction = await get(API_ENDPOINTS.INTERACTIONS.GET_BY_ID(id));
    return interaction;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new interaction
 * @param {Object} interactionData - Interaction data
 * @param {string} interactionData.contactId - Contact ID (required)
 * @param {string} interactionData.type - Type: 'call', 'email', 'meeting', 'note', 'task' (required)
 * @param {string} [interactionData.direction] - Direction: 'inbound' or 'outbound' (required for call/email)
 * @param {string} [interactionData.subject] - Subject (optional)
 * @param {string} [interactionData.description] - Description (optional)
 * @param {number} [interactionData.duration] - Duration in minutes (optional)
 * @param {Date|string} [interactionData.date] - Date (optional, defaults to now)
 * @param {string} [interactionData.status] - Status: 'completed', 'scheduled', 'pending', 'cancelled' (optional)
 * @returns {Promise} Created interaction object
 */
export const createInteraction = async (interactionData) => {
  try {
    const interaction = await post(API_ENDPOINTS.INTERACTIONS.CREATE, interactionData);
    return interaction;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing interaction
 * @param {string} id - Interaction ID
 * @param {Object} interactionData - Updated interaction data
 * @returns {Promise} Updated interaction object
 */
export const updateInteraction = async (id, interactionData) => {
  try {
    const interaction = await put(API_ENDPOINTS.INTERACTIONS.UPDATE(id), interactionData);
    return interaction;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an interaction
 * @param {string} id - Interaction ID
 * @returns {Promise} Success message
 */
export const deleteInteraction = async (id) => {
  try {
    const result = await del(API_ENDPOINTS.INTERACTIONS.DELETE(id));
    return result;
  } catch (error) {
    throw error;
  }
};

export default {
  getContactInteractions,
  getInteractionById,
  createInteraction,
  updateInteraction,
  deleteInteraction,
};

