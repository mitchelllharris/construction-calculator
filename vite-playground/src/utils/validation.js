/**
 * Validation utility functions for form fields
 */

export const validators = {
  required: (value, message = 'This field is required') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message;
    }
    return null;
  },

  minLength: (min, message) => (value) => {
    if (value && value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max, message) => (value) => {
    if (value && value.length > max) {
      return message || `Must be no more than ${max} characters`;
    }
    return null;
  },

  email: (value, message = 'Please enter a valid email address') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return message;
    }
    return null;
  },

  password: (value, message) => {
    if (!value) return null; // Let required handle empty
    const hasMinLength = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[@$!%*?&]/.test(value);

    if (!hasMinLength) {
      return message?.minLength || 'Password must be at least 8 characters';
    }
    if (!hasUpperCase) {
      return message?.uppercase || 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return message?.lowercase || 'Password must contain at least one lowercase letter';
    }
    if (!hasNumber) {
      return message?.number || 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return message?.special || 'Password must contain at least one special character (@$!%*?&)';
    }
    return null;
  },

  passwordMatch: (password, message = 'Passwords do not match') => (value) => {
    if (value && value !== password) {
      return message;
    }
    return null;
  },

  username: (value, message) => {
    if (!value) return null; // Let required handle empty
    if (value.length < 3) {
      return message?.minLength || 'Username must be at least 3 characters';
    }
    if (value.length > 30) {
      return message?.maxLength || 'Username must be no more than 30 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return message?.format || 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  },

  custom: (validatorFn, message) => (value) => {
    if (!validatorFn(value)) {
      return message || 'Invalid value';
    }
    return null;
  },
};

/**
 * Validate a single field with multiple validators
 */
export const validateField = (value, fieldValidators) => {
  for (const validator of fieldValidators) {
    const error = typeof validator === 'function' 
      ? validator(value)
      : validator(value);
    if (error) {
      return error;
    }
  }
  return null;
};

/**
 * Validate entire form
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  Object.keys(validationRules).forEach((fieldName) => {
    const value = formData[fieldName];
    const rules = validationRules[fieldName];
    const error = validateField(value, rules);
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
};

