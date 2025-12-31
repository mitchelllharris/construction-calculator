import React, { useEffect, useState } from 'react';
import { useFormValidation } from '../hooks/useFormValidation';
import Input from './Input';
import LocationInput from './LocationInput';
import Button from './Button';
import { MdPerson, MdEmail, MdPhone, MdBusiness, MdLocationOn, MdNotes, MdTag, MdImage } from 'react-icons/md';
import { uploadAvatar } from '../utils/contactApi';

export default function ContactForm({ contact, onSubmit, onCancel, loading = false }) {
  const isEditMode = !!contact;
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const initialValues = {
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    type: contact?.type || 'client',
    address: contact?.address || '',
    city: contact?.city || '',
    state: contact?.state || '',
    zip: contact?.zip || '',
    country: contact?.country || '',
    notes: contact?.notes || '',
    tags: contact?.tags ? contact.tags.join(', ') : '',
  };

  const {
    values: formData,
    getFieldProps,
    handleSubmit: handleFormSubmit,
    setError,
    touched,
    setValue,
  } = useFormValidation(initialValues, {}, {
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Update form when contact prop changes (for edit mode)
  useEffect(() => {
    if (contact) {
      Object.keys(initialValues).forEach((key) => {
        // Handle tags specially - convert array to comma-separated string
        if (key === 'tags') {
          setValue(key, contact.tags && Array.isArray(contact.tags) ? contact.tags.join(', ') : '');
        } else {
          setValue(key, contact[key] || '');
        }
      });
      // Set avatar preview if contact has avatar
      if (contact.avatar) {
        const avatarUrl = contact.avatar.startsWith('http') 
          ? contact.avatar 
          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${contact.avatar}`;
        setAvatarPreview(avatarUrl);
      }
    }
  }, [contact]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Custom validation
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'firstName':
        if (!value || !value.trim()) return 'First name is required';
        if (value.trim().length > 50) return 'First name must be less than 50 characters';
        return null;
      case 'lastName':
        if (!value || !value.trim()) return 'Last name is required';
        if (value.trim().length > 50) return 'Last name must be less than 50 characters';
        return null;
      case 'email':
        if (!value || !value.trim()) return 'Email is required';
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
        if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
        return null;
      case 'phone':
        if (value && value.trim().length > 20) return 'Phone number must be less than 20 characters';
        return null;
      case 'address':
        if (value && value.trim().length > 200) return 'Address must be less than 200 characters';
        return null;
      case 'city':
        if (value && value.trim().length > 50) return 'City must be less than 50 characters';
        return null;
      case 'state':
        if (value && value.trim().length > 50) return 'State must be less than 50 characters';
        return null;
      case 'zip':
        if (value && value.trim().length > 10) return 'Zip code must be less than 10 characters';
        return null;
      case 'country':
        if (value && value.trim().length > 50) return 'Country must be less than 50 characters';
        return null;
      case 'notes':
        if (value && value.trim().length > 1000) return 'Notes must be less than 1000 characters';
        return null;
      default:
        return null;
    }
  };

  // Enhanced field props with custom validation
  const getFieldPropsWithValidation = (fieldName) => {
    const props = getFieldProps(fieldName);
    const originalOnBlur = props.onBlur;
    const originalOnChange = props.onChange;

    return {
      ...props,
      onBlur: (e) => {
        originalOnBlur(e);
        const error = validateField(fieldName, e.target.value);
        setError(fieldName, error);
      },
      onChange: (e) => {
        originalOnChange(e);
        if (touched[fieldName]) {
          const error = validateField(fieldName, e.target.value);
          setError(fieldName, error);
        }
      },
    };
  };

  const handleFormSubmission = async (values) => {
    // Validate all fields before submission
    const errors = {};
    Object.keys(values).forEach((fieldName) => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        errors[fieldName] = error;
        setError(fieldName, error);
      }
    });

    // If there are validation errors, don't submit
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.focus();
      }
      return;
    }

    // Clean up the data - remove empty optional fields
    let cleanedData = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone?.trim() || undefined,
      type: values.type || 'client',
      address: values.address?.trim() || undefined,
      city: values.city?.trim() || undefined,
      state: values.state?.trim() || undefined,
      zip: values.zip?.trim() || undefined,
      country: values.country?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      tags: (typeof values.tags === 'string' && values.tags.trim()) 
        ? values.tags.split(',').map(t => t.trim()).filter(Boolean)
        : (Array.isArray(values.tags) ? values.tags : []),
    };

    // Remove undefined values
    Object.keys(cleanedData).forEach((key) => {
      if (cleanedData[key] === undefined || cleanedData[key] === '' || (Array.isArray(cleanedData[key]) && cleanedData[key].length === 0)) {
        delete cleanedData[key];
      }
    });

    // Submit contact first (create or update)
    const result = await onSubmit(cleanedData);
    
    // Upload avatar if a new file was selected (after contact is created/updated)
    if (avatarFile && result?._id) {
      setUploadingAvatar(true);
      try {
        const uploadResult = await uploadAvatar(result._id, avatarFile);
        // Optionally update the contact again with avatar URL
        // This is handled by the backend, so we don't need to do anything
      } catch (error) {
        console.error('Avatar upload failed:', error);
        // Continue even if avatar upload fails
      } finally {
        setUploadingAvatar(false);
      }
    }
    
    // Reset avatar state after successful submission
    if (avatarFile) {
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}`;
  };

  return (
    <form onSubmit={handleFormSubmit(handleFormSubmission)} className="space-y-4">
      {/* Avatar Upload */}
      {isEditMode && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Photo
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : contact?.avatar ? (
                <img
                  src={contact.avatar.startsWith('http') 
                    ? contact.avatar 
                    : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${contact.avatar}`}
                  alt={`${contact.firstName} ${contact.lastName}`}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold border-2 border-gray-200">
                  {getInitials(formData.firstName, formData.lastName)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF or WebP. Max 5MB.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <Input
            {...getFieldPropsWithValidation('firstName')}
            placeholder="John"
            icon={MdPerson}
            error={touched.firstName ? getFieldProps('firstName').error : null}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <Input
            {...getFieldPropsWithValidation('lastName')}
            placeholder="Doe"
            icon={MdPerson}
            error={touched.lastName ? getFieldProps('lastName').error : null}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <Input
          {...getFieldPropsWithValidation('email')}
          type="email"
          placeholder="john.doe@example.com"
          icon={MdEmail}
          error={touched.email ? getFieldProps('email').error : null}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <Input
            {...getFieldPropsWithValidation('phone')}
            type="tel"
            placeholder="+1 (555) 123-4567"
            icon={MdPhone}
            error={touched.phone ? getFieldProps('phone').error : null}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <div className="relative">
            <MdBusiness className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <select
              name={getFieldProps('type').name}
              value={getFieldProps('type').value}
              onChange={getFieldProps('type').onChange}
              onBlur={getFieldProps('type').onBlur}
              className="w-full border border-gray-200 rounded-sm px-3 py-2 pl-10 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="client">Client</option>
              <option value="business">Business</option>
              <option value="supplier">Supplier</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <Input
          {...getFieldPropsWithValidation('address')}
          placeholder="123 Main Street"
          icon={MdLocationOn}
          error={touched.address ? getFieldProps('address').error : null}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <LocationInput
          value={formData.city || formData.state || formData.country ? {
            city: formData.city || '',
            state: formData.state || '',
            country: formData.country || '',
          } : null}
          onChange={(location) => {
            if (location) {
              setValue('city', location.city || '');
              setValue('state', location.state || '');
              setValue('country', location.country || '');
            } else {
              setValue('city', '');
              setValue('state', '');
              setValue('country', '');
            }
          }}
          placeholder="Search for city, state, country..."
          format="simple"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Zip Code
        </label>
        <Input
          {...getFieldPropsWithValidation('zip')}
          placeholder="10001"
          error={touched.zip ? getFieldProps('zip').error : null}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="relative">
          <MdTag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            {...getFieldPropsWithValidation('tags')}
            placeholder="important, vip, contractor (comma-separated)"
            icon={MdTag}
            error={touched.tags ? getFieldProps('tags').error : null}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <div className="relative">
          <MdNotes className="absolute left-3 top-3 text-gray-400" size={18} />
          <textarea
            name={getFieldProps('notes').name}
            value={getFieldProps('notes').value}
            onChange={getFieldProps('notes').onChange}
            onBlur={getFieldProps('notes').onBlur}
            rows={4}
            placeholder="Additional notes about this contact..."
            className={`w-full border rounded-sm px-3 py-2 pl-10 focus:outline-none focus:border-blue-500 transition-colors ${
              touched.notes && getFieldProps('notes').error
                ? 'border-red-500 bg-red-50'
                : touched.notes && !getFieldProps('notes').error && formData.notes
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          />
        </div>
        {touched.notes && getFieldProps('notes').error && (
          <p className="text-red-500 text-sm mt-1">{getFieldProps('notes').error}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading || uploadingAvatar}
          className="flex-1"
        >
          {loading || uploadingAvatar ? 'Saving...' : isEditMode ? 'Update Contact' : 'Create Contact'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-700"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

