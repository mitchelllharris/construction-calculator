import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { useFormValidation } from '../hooks/useFormValidation';
import { post } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import Input from '../components/Input';
import PhoneInput from '../components/PhoneInput';
import WebsiteInput from '../components/WebsiteInput';
import TagInput from '../components/TagInput';
import LocationInput from '../components/LocationInput';
import Button from '../components/Button';
import SkeletonCard from '../components/SkeletonCard';
import Spinner from '../components/Spinner';
import { get, del, put } from '../utils/api';
import { MdBusiness, MdEdit, MdDelete, MdAdd } from 'react-icons/md';

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, fetchUserProfile } = useAuth();
  const { activeProfile, isUserProfile, isBusinessProfile, activeUserId } = useProfileSwitcher();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [emailPrivacy, setEmailPrivacy] = useState('private');
  const [privacySettings, setPrivacySettings] = useState({
    phone: 'private',
    website: 'private',
    bio: 'public',
    experience: 'public',
    certifications: 'public',
    portfolio: 'public',
    location: 'public',
    socialMedia: 'public',
    trade: 'public',
    businessName: 'public',
  });
  const [connectionRequestSettings, setConnectionRequestSettings] = useState({
    whoCanSend: 'everyone',
    requireManualAcceptance: true,
  });
  const [followRequestSettings, setFollowRequestSettings] = useState({
    whoCanSend: 'everyone',
    requireManualAcceptance: true,
  });
  const [tradieData, setTradieData] = useState({
    trade: '',
    businessName: '',
    bio: '',
    phone: '',
    website: '',
    location: { city: '', state: '', country: '' },
  });
  const [businessData, setBusinessData] = useState({
    businessName: '',
    description: '',
    trade: '',
    phone: '',
    email: '',
    website: '',
    location: { city: '', state: '', country: '' },
  });

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

  // Load business profile if active profile is a business
  useEffect(() => {
    if (isBusinessProfile && activeProfile?.id) {
      fetchBusinessProfile();
    } else if (isBusinessProfile) {
      // Reset business data if switching away from business profile
      setCurrentBusiness(null);
      setBusinessData({
        businessName: '',
        description: '',
        trade: '',
        phone: '',
        email: '',
        website: '',
        location: { city: '', state: '', country: '' },
      });
    }
  }, [isBusinessProfile, activeProfile?.id]);

  // If we're on user profile but user is null, try to fetch it
  useEffect(() => {
    if (!isBusinessProfile && !user) {
      fetchUserProfile();
    }
  }, [isBusinessProfile, user, fetchUserProfile]);

  // Load user profile on mount and when profile type changes
  useEffect(() => {
    // If we're not on a business profile, treat as user profile
    // This handles cases where activeProfile might not be set correctly
    const shouldLoadUserProfile = !isBusinessProfile && user;
    
    if (shouldLoadUserProfile) {
      profileForm.setValue('username', user.username || '');
      profileForm.setValue('email', user.email || '');
      profileForm.setValue('firstName', user.firstName || '');
      profileForm.setValue('lastName', user.lastName || '');
      
      // Load tradie data
      setTradieData({
        trade: user.trade || '',
        businessName: user.businessName || '',
        bio: user.bio || '',
        phone: user.phone || '',
        website: user.website || '',
        location: user.location || { city: '', state: '', country: '' },
      });

      // Load privacy settings
      if (user.emailPrivacy) {
        setEmailPrivacy(user.emailPrivacy);
      } else {
        setEmailPrivacy('private');
      }
      if (user.privacySettings) {
        setPrivacySettings(user.privacySettings);
      } else {
        setPrivacySettings({
          phone: 'private',
          website: 'private',
          bio: 'public',
          experience: 'public',
          certifications: 'public',
          portfolio: 'public',
          location: 'public',
          socialMedia: 'public',
          trade: 'public',
          businessName: 'public',
        });
      }

      // Load connection and follow request settings
      if (user.connectionRequestSettings) {
        setConnectionRequestSettings({
          whoCanSend: user.connectionRequestSettings.whoCanSend || 'everyone',
          requireManualAcceptance: user.connectionRequestSettings.requireManualAcceptance !== false,
        });
      } else {
        setConnectionRequestSettings({
          whoCanSend: 'everyone',
          requireManualAcceptance: true,
        });
      }
      if (user.followRequestSettings) {
        setFollowRequestSettings({
          whoCanSend: user.followRequestSettings.whoCanSend || 'everyone',
          requireManualAcceptance: user.followRequestSettings.requireManualAcceptance !== false,
        });
      } else {
        setFollowRequestSettings({
          whoCanSend: 'everyone',
          requireManualAcceptance: true,
        });
      }
    } else if (shouldLoadUserProfile && !user) {
      fetchUserProfile();
    } else if (isBusinessProfile) {
      // Reset user data if switching away from user profile
      profileForm.reset();
      setTradieData({
        trade: '',
        businessName: '',
        bio: '',
        phone: '',
        website: '',
        location: { city: '', state: '', country: '' },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isUserProfile, isBusinessProfile, activeProfile?.id]);

  const fetchBusinessProfile = async () => {
    if (!activeProfile?.id) return;
    
    setLoadingBusiness(true);
    try {
      const businessId = activeProfile.id;
      const url = API_ENDPOINTS.BUSINESSES.GET_BY_ID(businessId);
      const data = await get(url);
      setCurrentBusiness(data);
      
      // Load business data
      setBusinessData({
        businessName: data.businessName || '',
        description: data.description || '',
        trade: data.trade || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        location: data.location || { city: '', state: '', country: '' },
      });

      // Load privacy settings
      if (data.emailPrivacy) {
        setEmailPrivacy(data.emailPrivacy);
      }
      if (data.privacySettings) {
        setPrivacySettings(data.privacySettings);
      }

      // Load connection and follow request settings
      if (data.connectionRequestSettings) {
        setConnectionRequestSettings({
          whoCanSend: data.connectionRequestSettings.whoCanSend || 'everyone',
          requireManualAcceptance: data.connectionRequestSettings.requireManualAcceptance !== false,
        });
      }
      if (data.followRequestSettings) {
        setFollowRequestSettings({
          whoCanSend: data.followRequestSettings.whoCanSend || 'everyone',
          requireManualAcceptance: data.followRequestSettings.requireManualAcceptance !== false,
        });
      }
    } catch (error) {
      showError(error.message || 'Failed to load business profile');
    } finally {
      setLoadingBusiness(false);
    }
  };

  // Fetch businesses when businesses tab is active
  useEffect(() => {
    if (activeTab === 'businesses') {
      fetchBusinesses();
    }
  }, [activeTab]);

  const fetchBusinesses = async () => {
    setLoadingBusinesses(true);
    try {
      const data = await get(API_ENDPOINTS.BUSINESSES.GET_USER_BUSINESSES);
      setBusinesses(data.businesses || []);
    } catch (error) {
      showError(error.message || 'Failed to load businesses');
      setBusinesses([]);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    if (!window.confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
      return;
    }

    try {
      await del(API_ENDPOINTS.BUSINESSES.DELETE(businessId));
      showSuccess('Business deleted successfully');
      fetchBusinesses(); // Refresh list
    } catch (error) {
      showError(error.message || 'Failed to delete business');
    }
  };

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
    if (isBusinessProfile) {
      // Handle business profile update
      setLoading(true);
      try {
        const businessDataToUpdate = {
          businessName: businessData.businessName || '',
          description: businessData.description || '',
          trade: businessData.trade || '',
          phone: businessData.phone || '',
          email: businessData.email || '',
          website: businessData.website || '',
          location: businessData.location || {},
          emailPrivacy: emailPrivacy,
          privacySettings: privacySettings,
          connectionRequestSettings: connectionRequestSettings,
          followRequestSettings: followRequestSettings,
        };

        // Add active account context headers for business update
        const headers = {};
        if (activeUserId) {
          headers['x-active-account-id'] = activeUserId.toString();
        }
        if (activeProfile?.pageId) {
          headers['x-active-page-id'] = activeProfile.pageId;
        }
        
        const url = API_ENDPOINTS.BUSINESSES.UPDATE(activeProfile.id);
        const response = await put(url, businessDataToUpdate, { headers });
        
        if (response.business) {
          showSuccess('Business profile updated successfully');
          await fetchBusinessProfile(); // Refresh business data
        } else {
          showError(response.message || 'Failed to update business profile');
        }
      } catch (error) {
        showError(error.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle user profile update
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
      // Collect all profile data including tradie fields
      // Always include all fields to ensure nothing is lost
      const profileData = {
        ...values, // username, email, firstName, lastName from profile form
        trade: tradieData.trade || null,
        businessName: tradieData.businessName || null,
        bio: tradieData.bio || null,
        phone: tradieData.phone || null,
        website: tradieData.website || null,
        location: tradieData.location || {},
        certifications: user?.certifications || [],
        portfolio: user?.portfolio || [],
        socialMedia: user?.socialMedia || {},
        emailPrivacy: emailPrivacy, // Include email privacy setting
      };
      
      // Pass active account context to updateProfile
      const result = await updateProfile(
        profileData, 
        activeUserId || user?.accountId, 
        activeProfile?.pageId || user?.pageId
      );
      if (result.success) {
        showSuccess(result.message);
        // Refresh user data to get updated profile
        await fetchUserProfile();
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

  // If no active profile is set, default to user profile
  if (!activeProfile && user) {
    // This shouldn't happen, but if it does, we'll show user settings
    // The ProfileSwitcher should always have an activeProfile
  }

  // Show loading state while determining profile type or loading data
  if (isBusinessProfile && loadingBusiness) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8 animate-pulse"></div>
        <SkeletonCard lines={4} className="mb-6" />
        <SkeletonCard lines={3} />
      </div>
    );
  }
  
  if (!isBusinessProfile && !user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8 animate-pulse"></div>
        <SkeletonCard lines={4} className="mb-6" />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  // If we're on a business profile but haven't loaded the business yet
  if (isBusinessProfile && !currentBusiness && !loadingBusiness) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">Business profile not found.</p>
        </div>
      </div>
    );
  }

  // If we don't have a user and we're not on a business profile, show error
  if (!isBusinessProfile && !user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">Unable to load user profile. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        {isBusinessProfile && activeProfile?.name && (
          <p className="text-gray-600">Managing settings for: <span className="font-semibold">{activeProfile.name}</span></p>
        )}
        {!isBusinessProfile && user?.username && (
          <p className="text-gray-600">Managing settings for: <span className="font-semibold">{user.username}</span></p>
        )}
      </div>

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
                onClick={() => setActiveTab('privacy')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'privacy'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Privacy
              </button>
              {isUserProfile && (
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
              )}
              {!isBusinessProfile && (
                <button
                  onClick={() => setActiveTab('businesses')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'businesses'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Businesses
                </button>
              )}
            </nav>
          </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {isBusinessProfile ? 'Business Profile Information' : 'Profile Information'}
          </h2>

          {/* Email Verification Status - Only for user profiles */}
          {!isBusinessProfile && !user?.emailVerified && (
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
            {!isBusinessProfile ? (
              <>
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
                  {user?.emailVerified && (
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
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <Input
                    type="text"
                    value={businessData.businessName || ''}
                    onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={businessData.email || ''}
                    onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                    placeholder="business@example.com"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                {!isBusinessProfile ? (
                  <PhoneInput
                    value={tradieData.phone || ''}
                    onChange={(e) => setTradieData({ ...tradieData, phone: e.target.value })}
                    placeholder="4XX XXX XXX"
                  />
                ) : (
                  <PhoneInput
                    value={businessData.phone || ''}
                    onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                    placeholder="4XX XXX XXX"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                {!isBusinessProfile ? (
                  <WebsiteInput
                    value={tradieData.website || ''}
                    onChange={(e) => setTradieData({ ...tradieData, website: e.target.value })}
                    placeholder="yourwebsite.com"
                  />
                ) : (
                  <WebsiteInput
                    value={businessData.website || ''}
                    onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                    placeholder="yourwebsite.com"
                  />
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              {!isBusinessProfile ? (
                <LocationInput
                  value={tradieData.location}
                  onChange={(location) => setTradieData({ ...tradieData, location })}
                  placeholder="Search for your location..."
                  format="simple"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <LocationInput
                  value={businessData.location}
                  onChange={(location) => setBusinessData({ ...businessData, location })}
                  placeholder="Search for your location..."
                  format="simple"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
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

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
          <p className="text-gray-600 text-sm mb-6">
            Control who can see each section of your public profile. You can set different privacy levels for each field.
          </p>

          <div className="space-y-6">
            {/* Contact Information */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <select
                    value={emailPrivacy}
                    onChange={(e) => setEmailPrivacy(e.target.value)}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <select
                    value={privacySettings.phone}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <select
                    value={privacySettings.website}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, website: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <select
                    value={privacySettings.location}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, location: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Social Media</label>
                  <select
                    value={privacySettings.socialMedia}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, socialMedia: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trade / Specialty</label>
                  <select
                    value={privacySettings.trade}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, trade: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <select
                    value={privacySettings.businessName}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, businessName: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">About / Bio</label>
                  <select
                    value={privacySettings.bio}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, bio: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Experience & Skills */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Experience & Skills</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Experience</label>
                  <select
                    value={privacySettings.experience}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, experience: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
                  <select
                    value={privacySettings.certifications}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, certifications: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio</label>
                  <select
                    value={privacySettings.portfolio}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, portfolio: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Connection & Follow Requests */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection & Follow Requests</h3>
              
              {/* Connection Requests */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Connection Requests</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Who can send connection requests?</label>
                    <select
                      value={connectionRequestSettings.whoCanSend}
                      onChange={(e) => setConnectionRequestSettings({ ...connectionRequestSettings, whoCanSend: e.target.value })}
                      className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="everyone">Everyone can send a connection request</option>
                      <option value="connections_of_connections">Connections of connections can send</option>
                      <option value="no_one">No one can send a request</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Require manual acceptance</label>
                      <p className="text-xs text-gray-500">Connection requests must be accepted manually before connecting</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={connectionRequestSettings.requireManualAcceptance}
                        onChange={(e) => setConnectionRequestSettings({ ...connectionRequestSettings, requireManualAcceptance: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Follow Requests */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-3">Follow Requests</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Who can send follow requests?</label>
                    <select
                      value={followRequestSettings.whoCanSend}
                      onChange={(e) => setFollowRequestSettings({ ...followRequestSettings, whoCanSend: e.target.value })}
                      className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="everyone">Everyone can send a follow request</option>
                      <option value="connections_of_connections">Connections of connections can send</option>
                      <option value="no_one">No one can send a request</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Require manual acceptance</label>
                      <p className="text-xs text-gray-500">Follow requests must be accepted manually before following</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={followRequestSettings.requireManualAcceptance}
                        onChange={(e) => setFollowRequestSettings({ ...followRequestSettings, requireManualAcceptance: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>


            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    if (isBusinessProfile) {
                      // Add active account context headers for business update
                      const headers = {};
                      if (activeUserId) {
                        headers['x-active-account-id'] = activeUserId.toString();
                      }
                      if (activeProfile?.pageId) {
                        headers['x-active-page-id'] = activeProfile.pageId;
                      }
                      
                      const url = API_ENDPOINTS.BUSINESSES.UPDATE(activeProfile.id);
                      const response = await put(url, {
                        emailPrivacy,
                        privacySettings,
                        connectionRequestSettings,
                        followRequestSettings
                      }, { headers });
                      
                      if (response.business) {
                        showSuccess('Privacy settings updated successfully');
                        await fetchBusinessProfile(); // Refresh business data
                      } else {
                        showError(response.message || 'Failed to update privacy settings');
                      }
                    } else {
                      // Pass active account context to updateProfile
                      const result = await updateProfile(
                        { 
                          emailPrivacy,
                          privacySettings,
                          connectionRequestSettings,
                          followRequestSettings
                        },
                        activeUserId || user?.accountId,
                        activeProfile?.pageId || user?.pageId
                      );
                      if (result.success) {
                        showSuccess('Privacy settings updated successfully');
                        await fetchUserProfile(); // Refresh user data
                      } else {
                        showError(result.message);
                      }
                    }
                  } catch (error) {
                    showError(error.message || 'Failed to update privacy settings');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                text={loading ? 'Saving...' : 'Save Privacy Settings'}
              >
                {loading && <Spinner size="sm" color="white" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Businesses Tab */}
      {activeTab === 'businesses' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">My Businesses</h2>
            <Button
              onClick={() => navigate('/create-business')}
              className="flex items-center gap-2"
            >
              <MdAdd size={18} />
              Create Business
            </Button>
          </div>

          {loadingBusinesses ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12">
              <MdBusiness size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">You don't have any businesses yet.</p>
              <Button
                onClick={() => navigate('/create-business')}
                className="flex items-center gap-2 mx-auto"
              >
                <MdAdd size={18} />
                Create Your First Business
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {businesses.map((business) => (
                <div
                  key={business._id || business.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {business.businessName}
                      </h3>
                      {business.trade && (
                        <p className="text-gray-600 text-sm mb-2">{business.trade}</p>
                      )}
                      {business.description && (
                        <p className="text-gray-600 text-sm line-clamp-2">{business.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {business.location?.city && business.location?.state && (
                          <span>
                            {business.location.city}, {business.location.state}
                          </span>
                        )}
                        <span>
                          Created {new Date(business.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          const businessId = business.businessSlug || business._id || business.id;
                          navigate(`/business/${businessId}`);
                        }}
                        className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          const businessId = business.businessSlug || business._id || business.id;
                          navigate(`/business/${businessId}/edit`);
                        }}
                        className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center gap-1"
                      >
                        <MdEdit size={18} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBusiness(business._id || business.id)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
                      >
                        <MdDelete size={18} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
