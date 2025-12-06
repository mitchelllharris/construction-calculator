import { useState, useCallback, useEffect } from 'react';
import { validateField, validateForm } from '../utils/validation';

/**
 * Custom hook for form validation with real-time feedback
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationRules - Validation rules for each field
 * @param {Object} options - Options for validation behavior
 * @param {boolean} options.validateOnChange - Validate on field change (default: true)
 * @param {boolean} options.validateOnBlur - Validate on field blur (default: true)
 * @param {boolean} options.showErrorsOnSubmit - Show all errors on submit (default: true)
 * 
 * @returns {Object} Form state and handlers
 */
export const useFormValidation = (initialValues, validationRules = {}, options = {}) => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    showErrorsOnSubmit = true,
  } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateSingleField = useCallback((fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules || rules.length === 0) {
      return null;
    }
    // Pass full form values for cross-field validation
    return validateField(value, rules.map(rule => 
      typeof rule === 'function' ? (val) => rule(val, values) : rule
    ));
  }, [validationRules, values]);

  // Validate all fields
  const validateAllFields = useCallback(() => {
    const newErrors = validateForm(values, validationRules);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules]);

  // Handle field change
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null,
      }));
    }

    // Real-time validation on change
    if (validateOnChange && touched[name]) {
      const error = validateSingleField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error,
      }));
    }
  }, [errors, touched, validateOnChange, validateSingleField]);

  // Handle field blur
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));

    // Validate on blur
    if (validateOnBlur) {
      const error = validateSingleField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error,
      }));
    }
  }, [validateOnBlur, validateSingleField]);

  // Handle form submit
  const handleSubmit = useCallback((onSubmit) => {
    return async (e) => {
      e.preventDefault();
      
      // Mark all fields as touched
      const allTouched = Object.keys(values).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
      setTouched(allTouched);

      // Validate all fields
      const isValid = validateAllFields();

      if (!isValid && showErrorsOnSubmit) {
        // Focus on first error field
        const firstErrorField = Object.keys(errors).find(key => errors[key]);
        if (firstErrorField) {
          const element = document.querySelector(`[name="${firstErrorField}"]`);
          if (element) {
            element.focus();
          }
        }
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [values, errors, validateAllFields, showErrorsOnSubmit]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set field value programmatically
  const setValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Set field error programmatically
  const setError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  // Get field props for easy integration
  const getFieldProps = useCallback((name) => {
    return {
      name,
      value: values[name] || '',
      onChange: handleChange,
      onBlur: handleBlur,
      error: touched[name] ? errors[name] : null,
      success: touched[name] && !errors[name] && values[name] ? true : false,
    };
  }, [values, errors, touched, handleChange, handleBlur]);

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0 || 
    Object.values(errors).every(error => error === null);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValue,
    setError,
    getFieldProps,
    validateAllFields,
  };
};

