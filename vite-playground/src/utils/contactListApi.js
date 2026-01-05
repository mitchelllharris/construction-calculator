import { get, post, put, del } from './api';
import { API_ENDPOINTS } from '../config/api';

/**
 * Get all contact lists for the authenticated user
 * @param {string} [businessId] - Optional business ID to filter lists
 * @returns {Promise} Object with lists array
 */
export const getAllContactLists = async (businessId = null) => {
  try {
    const url = businessId 
      ? `${API_ENDPOINTS.CONTACT_LISTS.GET_ALL}?businessId=${businessId}`
      : API_ENDPOINTS.CONTACT_LISTS.GET_ALL;
    const response = await get(url);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single contact list by ID
 * @param {string} id - Contact list ID
 * @returns {Promise} Contact list object
 */
export const getContactListById = async (id) => {
  try {
    const response = await get(API_ENDPOINTS.CONTACT_LISTS.GET_BY_ID(id));
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get contacts for a contact list
 * @param {string} id - Contact list ID
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=20] - Items per page
 * @returns {Promise} Object with contacts array and pagination info
 */
export const getContactsForList = async (id, params = {}) => {
  try {
    const { page = 1, limit = 20 } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const url = `${API_ENDPOINTS.CONTACT_LISTS.GET_CONTACTS(id)}?${queryParams.toString()}`;
    const response = await get(url);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new contact list
 * @param {Object} listData - Contact list data
 * @param {string} listData.name - List name (required)
 * @param {string} [listData.description] - List description
 * @param {string} listData.type - List type: 'manual' or 'filter' (required)
 * @param {Object} [listData.filterCriteria] - Filter criteria for filter-based lists
 * @param {string} [listData.businessId] - Business ID for business-specific lists
 * @returns {Promise} Created contact list object
 */
export const createContactList = async (listData) => {
  try {
    const response = await post(API_ENDPOINTS.CONTACT_LISTS.CREATE, listData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update a contact list
 * @param {string} id - Contact list ID
 * @param {Object} listData - Updated contact list data
 * @returns {Promise} Updated contact list object
 */
export const updateContactList = async (id, listData) => {
  try {
    const response = await put(API_ENDPOINTS.CONTACT_LISTS.UPDATE(id), listData);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a contact list
 * @param {string} id - Contact list ID
 * @returns {Promise} Success message
 */
export const deleteContactList = async (id) => {
  try {
    const response = await del(API_ENDPOINTS.CONTACT_LISTS.DELETE(id));
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Add a contact to a manual list
 * @param {string} listId - Contact list ID
 * @param {string} contactId - Contact ID
 * @returns {Promise} Updated contact list object
 */
export const addContactToList = async (listId, contactId) => {
  try {
    const response = await post(API_ENDPOINTS.CONTACT_LISTS.ADD_CONTACT(listId, contactId));
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Remove a contact from a manual list
 * @param {string} listId - Contact list ID
 * @param {string} contactId - Contact ID
 * @returns {Promise} Updated contact list object
 */
export const removeContactFromList = async (listId, contactId) => {
  try {
    const response = await del(API_ENDPOINTS.CONTACT_LISTS.REMOVE_CONTACT(listId, contactId));
    return response;
  } catch (error) {
    throw error;
  }
};
