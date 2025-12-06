import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useFormValidation } from '../hooks/useFormValidation';
import { post } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import Input from '../components/Input';
import Button from '../components/Button';
import SkeletonCard from '../components/SkeletonCard';
import Spinner from '../components/Spinner';

export default function Settings() {
  const { user, updateProfile, changePassword, fetchUserProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  // Profile form validation
  const profileForm = useFormValidation(
    {
      username: user?.username || '',
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
    {},
    {
      validateOnChange: true,
      validateOnBlur: true,
    }
  );

  // Password form validation
  const passwordForm = useFormValidation(
    {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    {},
    {
      validateOnChange: true,
      validateOnBlur: true,
    }
  );

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      profileForm.setValue('username', user.username || '');
      profileForm.setValue('email', user.email || '');
      profileForm.setValue('firstName', user.firstName || '');
      profileForm.setValue('lastName', user.lastName || '');
    } else {
      fetchUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Validation functions
  const validateProfileField = (fieldName, value) => {
    switch (fieldName) {
      case 'username':
        if (!value || !value.trim()) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (value.length > 30) return 'Username must be no more than 30 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        return null;
      case 'email':
        if (!value || !value.trim()) return 'Email is required';
        // Stricter email validation: requires at least 1 char before @, domain with at least 1 char, and TLD with at least 3 chars (.com, .org, .net, etc.)
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
        if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
        return null;
      case 'firstName':
        if (!value || !value.trim()) return 'First name is required';
        if (value.trim().length > 50) return 'First name must be less than 50 characters';
        return null;
      case 'lastName':
        if (!value || !value.trim()) return 'Last name is required';
        if (value.trim().length > 50) return 'Last name must be less than 50 characters';
        return null;
      default:
        return null;
    }
  };

  const validatePasswordField = (fieldName, value, formValues) => {
    switch (fieldName) {
      case 'currentPassword':
        if (!value) return 'Current password is required';
        return null;
      case 'newPassword':
        if (!value) return 'New password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/\d/.test(value)) return 'Password must contain at least one number';
        if (!/[@$!%*?&]/.test(value)) return 'Password must contain at least one special character (@$!%*?&)';
        return null;
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formValues.newPassword) return 'Passwords do not match';
        return null;
      default:
        return null;
    }
  };

  // Enhanced field props for profile form
  const getProfileFieldProps = (fieldName) => {
    const props = profileForm.getFieldProps(fieldName);
    const originalOnBlur = props.onBlur;
    const originalOnChange = props.onChange;

    return {
      ...props,
      onBlur: (e) => {
        originalOnBlur(e);
        const error = validateProfileField(fieldName, e.target.value);
        profileForm.setError(fieldName, error);
      },
      onChange: (e) => {
        originalOnChange(e);
        if (profileForm.touched[fieldName]) {
          const error = validateProfileField(fieldName, e.target.value);
          profileForm.setError(fieldName, error);
        }
      },
    };
  };

  // Enhanced field props for password form
  const getPasswordFieldProps = (fieldName) => {
    const props = passwordForm.getFieldProps(fieldName);
    const originalOnBlur = props.onBlur;
    const originalOnChange = props.onChange;

    return {
      ...props,
      onBlur: (e) => {
        originalOnBlur(e);
        const error = validatePasswordField(fieldName, e.target.value, passwordForm.values);
        passwordForm.setError(fieldName, error);
      },
      onChange: (e) => {
        originalOnChange(e);
        if (passwordForm.touched[fieldName]) {
          const error = validatePasswordField(fieldName, e.target.value, passwordForm.values);
          passwordForm.setError(fieldName, error);
        }
        // Re-validate confirmPassword when newPassword changes
        if (fieldName === 'newPassword' && passwordForm.values.confirmPassword) {
          const confirmError = validatePasswordField('confirmPassword', passwordForm.values.confirmPassword, {
            ...passwordForm.values,
            newPassword: e.target.value,
          });
          passwordForm.setError('confirmPassword', confirmError);
        }
      },
    };
  };

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    // Validate all fields before submission
    const errors = {};
    Object.keys(values).forEach((fieldName) => {
      const error = validateProfileField(fieldName, values[fieldName]);
      if (error) {
        errors[fieldName] = error;
        profileForm.setError(fieldName, error);
      }
    });

    // If there are validation errors, don't submit
    if (Object.keys(errors).length > 0) {
      // Focus on first error field
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.focus();
      }
      return;
    }

    setLoading(true);
    try {
      const result = await updateProfile(values);
      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  });

  const handlePasswordSubmit = passwordForm.handleSubmit(async (values) => {
    setLoading(true);
    try {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (result.success) {
        showSuccess(result.message);
        passwordForm.reset();
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  });

  const handleResendVerification = async () => {
    setLoading(true);

    try {
      const response = await post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, {
        email: user?.email,
      });

      if (response.message) {
        showSuccess(response.message);
      } else {
        showError('Failed to resend verification email');
      }
    } catch (error) {
      showError(error.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8 animate-pulse"></div>
        <SkeletonCard lines={4} className="mb-6" />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Password
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>

          {/* Email Verification Status */}
          {!user.emailVerified && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-800 font-medium">Email not verified</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please verify your email address to access all features.
                  </p>
                </div>
                <button
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  Resend Verification
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <Input
                type="text"
                {...getProfileFieldProps('username')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                {...getProfileFieldProps('email')}
              />
              {user.emailVerified && (
                <p className="text-sm text-green-600 mt-1">✓ Email verified</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <Input
                  type="text"
                  {...getProfileFieldProps('firstName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <Input
                  type="text"
                  {...getProfileFieldProps('lastName')}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                text={loading ? 'Saving...' : 'Save Changes'}
              >
                {loading && <Spinner size="sm" color="white" />}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <Input
                type="password"
                {...getPasswordFieldProps('currentPassword')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <Input
                type="password"
                {...getPasswordFieldProps('newPassword')}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <Input
                type="password"
                {...getPasswordFieldProps('confirmPassword')}
              />
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                text={loading ? 'Changing...' : 'Change Password'}
              >
                {loading && <Spinner size="sm" color="white" />}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
