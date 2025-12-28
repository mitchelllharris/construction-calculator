// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: `${API_BASE_URL}/api/auth/signup`,
    SIGNIN: `${API_BASE_URL}/api/auth/signin`,
    VERIFY: `${API_BASE_URL}/api/auth/verify`,
    VERIFY_EMAIL: `${API_BASE_URL}/api/auth/verify-email`,
    RESEND_VERIFICATION: `${API_BASE_URL}/api/auth/resend-verification`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`,
  },
  USER: {
    PROFILE: `${API_BASE_URL}/api/user/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/user/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/user/change-password`,
    VERIFICATION_STATUS: `${API_BASE_URL}/api/user/verification-status`,
    UPLOAD_PORTFOLIO_IMAGE: `${API_BASE_URL}/api/user/portfolio/upload-image`,
    UPLOAD_CERTIFICATION_PDF: `${API_BASE_URL}/api/user/certifications/upload-pdf`,
    UPLOAD_AVATAR: `${API_BASE_URL}/api/user/avatar`,
  },
  PROFILE: {
    GET_BY_USERNAME: (username) => `${API_BASE_URL}/api/profile/${username}`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/profile/id/${id}`,
    ANALYTICS: (id, timeRange) => `${API_BASE_URL}/api/profile/${id}/analytics?timeRange=${timeRange}`,
    TRACK_VIEW: (id) => `${API_BASE_URL}/api/profile/${id}/track-view`,
    GET_POSTS: (id) => `${API_BASE_URL}/api/profile/${id}/posts`,
  },
  POSTS: {
    CREATE: `${API_BASE_URL}/api/posts`,
    DELETE: (id) => `${API_BASE_URL}/api/posts/${id}`,
    UPLOAD_MEDIA: `${API_BASE_URL}/api/posts/upload-media`,
    REACT: (postId) => `${API_BASE_URL}/api/posts/${postId}/react`,
    VOTE: (postId) => `${API_BASE_URL}/api/posts/${postId}/vote`,
    GET_THREAD: (postId) => `${API_BASE_URL}/api/posts/${postId}/thread`,
    ADD_COMMENT: (postId) => `${API_BASE_URL}/api/posts/${postId}/comments`,
    ADD_REPLY: (postId, commentId) => `${API_BASE_URL}/api/posts/${postId}/comments/${commentId}/replies`,
    REACT_TO_COMMENT: (commentId) => `${API_BASE_URL}/api/posts/${commentId}/react`,
  },
  ADMIN: {
    USERS: `${API_BASE_URL}/api/admin/users`,
    USER_BY_ID: (id) => `${API_BASE_URL}/api/admin/users/${id}`,
    UPDATE_USER: (id) => `${API_BASE_URL}/api/admin/users/${id}`,
    ASSIGN_ROLE: (id) => `${API_BASE_URL}/api/admin/users/${id}/role`,
    DELETE_USER: (id) => `${API_BASE_URL}/api/admin/users/${id}`,
    VERIFY_EMAIL: (id) => `${API_BASE_URL}/api/admin/users/${id}/verify-email`,
    STATS: `${API_BASE_URL}/api/admin/stats`,
    CONTACT_FORMS: `${API_BASE_URL}/api/admin/contact-forms`,
    CONTACT_FORM_BY_ID: (id) => `${API_BASE_URL}/api/admin/contact-forms/${id}`,
    UPDATE_CONTACT_FORM_STATUS: (id) => `${API_BASE_URL}/api/admin/contact-forms/${id}/status`,
    DELETE_CONTACT_FORM: (id) => `${API_BASE_URL}/api/admin/contact-forms/${id}`,
  },
    CONTACT_FORM: {
        SUBMIT: `${API_BASE_URL}/api/contact-form`,
    },
  CONTACTS: {
    GET_ALL: `${API_BASE_URL}/api/contacts`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/contacts/${id}`,
    CREATE: `${API_BASE_URL}/api/contacts`,
    UPDATE: (id) => `${API_BASE_URL}/api/contacts/${id}`,
    DELETE: (id) => `${API_BASE_URL}/api/contacts/${id}`,
    UPLOAD_AVATAR: (id) => `${API_BASE_URL}/api/contacts/upload-avatar/${id}`,
    IMPORT: `${API_BASE_URL}/api/contacts/import`,
    EXPORT: `${API_BASE_URL}/api/contacts/export`,
    BULK_DELETE: `${API_BASE_URL}/api/contacts/bulk-delete`,
  },
  INTERACTIONS: {
    GET_BY_CONTACT: (contactId) => `${API_BASE_URL}/api/contacts/${contactId}/interactions`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/interactions/${id}`,
    CREATE: `${API_BASE_URL}/api/interactions`,
    UPDATE: (id) => `${API_BASE_URL}/api/interactions/${id}`,
    DELETE: (id) => `${API_BASE_URL}/api/interactions/${id}`,
  },
  TEST: {
    ALL: `${API_BASE_URL}/api/test/all`,
    USER: `${API_BASE_URL}/api/test/user`,
    MOD: `${API_BASE_URL}/api/test/mod`,
    ADMIN: `${API_BASE_URL}/api/test/admin`,
  },
};

export default API_BASE_URL;

