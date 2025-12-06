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
  TEST: {
    ALL: `${API_BASE_URL}/api/test/all`,
    USER: `${API_BASE_URL}/api/test/user`,
    MOD: `${API_BASE_URL}/api/test/mod`,
    ADMIN: `${API_BASE_URL}/api/test/admin`,
  },
};

export default API_BASE_URL;

