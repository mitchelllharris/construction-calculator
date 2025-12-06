import { get, post, put, del, getToken } from './api';
import { API_ENDPOINTS } from '../config/api';
import API_BASE_URL from '../config/api';

/**
 * Get all contacts for the authenticated user with pagination
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=20] - Items per page
 * @param {string} [params.search] - Search term
 * @param {string} [params.type] - Filter by type
 * @param {string} [params.status] - Filter by status
 * @returns {Promise} Object with contacts array and pagination info
 */
export const getAllContacts = async (params = {}) => {
  try {
    const { page = 1, limit = 20, search, type, status } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) queryParams.append('search', search);
    if (type) queryParams.append('type', type);
    if (status) queryParams.append('status', status);
    
    const url = `${API_ENDPOINTS.CONTACTS.GET_ALL}?${queryParams.toString()}`;
    const response = await get(url);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single contact by ID
 * @param {string} id - Contact ID
 * @returns {Promise} Contact object
 */
export const getContactById = async (id) => {
  try {
    const contact = await get(API_ENDPOINTS.CONTACTS.GET_BY_ID(id));
    return contact;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new contact
 * @param {Object} contactData - Contact data
 * @param {string} contactData.firstName - First name (required)
 * @param {string} contactData.lastName - Last name (required)
 * @param {string} contactData.email - Email (required)
 * @param {string} [contactData.phone] - Phone number (optional)
 * @param {string} [contactData.type] - Contact type: 'client', 'business', 'supplier', 'contractor' (optional)
 * @param {string} [contactData.address] - Address (optional)
 * @param {string} [contactData.city] - City (optional)
 * @param {string} [contactData.state] - State (optional)
 * @param {string} [contactData.zip] - Zip code (optional)
 * @param {string} [contactData.country] - Country (optional)
 * @param {string} [contactData.notes] - Notes (optional)
 * @returns {Promise} Created contact object
 */
export const createContact = async (contactData) => {
  try {
    const contact = await post(API_ENDPOINTS.CONTACTS.CREATE, contactData);
    return contact;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing contact
 * @param {string} id - Contact ID
 * @param {Object} contactData - Updated contact data
 * @returns {Promise} Updated contact object
 */
export const updateContact = async (id, contactData) => {
  try {
    const contact = await put(API_ENDPOINTS.CONTACTS.UPDATE(id), contactData);
    return contact;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a contact
 * @param {string} id - Contact ID
 * @returns {Promise} Success message
 */
export const deleteContact = async (id) => {
  try {
    const result = await del(API_ENDPOINTS.CONTACTS.DELETE(id));
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Upload avatar for a contact
 * @param {string} id - Contact ID
 * @param {File} file - Image file
 * @returns {Promise} Updated contact with avatar URL
 */
export const uploadAvatar = async (id, file) => {
  try {
    const token = getToken();
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(API_ENDPOINTS.CONTACTS.UPLOAD_AVATAR(id), {
      method: 'POST',
      headers: {
        'x-access-token': token,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw { status: response.status, message: error.message || 'Upload failed' };
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Import contacts from CSV file
 * @param {File} file - CSV file
 * @returns {Promise} Import result with count
 */
export const importContacts = async (file) => {
  try {
    const token = getToken();
    const formData = new FormData();
    formData.append('csv', file);

    const response = await fetch(API_ENDPOINTS.CONTACTS.IMPORT, {
      method: 'POST',
      headers: {
        'x-access-token': token,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Import failed' }));
      throw { 
        status: response.status, 
        message: error.message || 'Import failed', 
        errors: error.errors,
        validCount: error.validCount,
        errorCount: error.errorCount
      };
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Export contacts to CSV
 * @param {Array<string>} [contactIds] - Optional array of contact IDs to export
 * @returns {Promise} Blob of CSV file
 */
export const exportContacts = async (contactIds = null) => {
  try {
    const token = getToken();
    let url = API_ENDPOINTS.CONTACTS.EXPORT;
    
    if (contactIds && contactIds.length > 0) {
      const params = new URLSearchParams();
      contactIds.forEach(id => params.append('contactIds', id));
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-access-token': token,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Export failed' }));
      throw { status: response.status, message: error.message || 'Export failed' };
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    throw error;
  }
};

/**
 * Bulk delete contacts
 * @param {Array<string>} contactIds - Array of contact IDs to delete
 * @returns {Promise} Delete result with count
 */
export const bulkDeleteContacts = async (contactIds) => {
  try {
    const result = await post(API_ENDPOINTS.CONTACTS.BULK_DELETE, { contactIds });
    return result;
  } catch (error) {
    throw error;
  }
};

export default {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  uploadAvatar,
  importContacts,
  exportContacts,
  bulkDeleteContacts,
};

