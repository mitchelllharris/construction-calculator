import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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

export default function Settings() {
  const { user, updateProfile, changePassword, fetchUserProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [emailPrivacy, setEmailPrivacy] = useState('private');
  const [privacySettings, setPrivacySettings] = useState({
    phone: 'private',
    website: 'private',
    bio: 'public',
    experience: 'public',
    skills: 'public',
    certifications: 'public',
    portfolio: 'public',
    serviceAreas: 'public',
    licenseNumbers: 'public',
    location: 'public',
    socialMedia: 'public',
    trade: 'public',
    businessName: 'public',
    yearsOfExperience: 'public',
  });
  const [tradieData, setTradieData] = useState({
    trade: '',
    businessName: '',
    bio: '',
    phone: '',
    website: '',
    location: { city: '', state: '', country: '' },
    yearsOfExperience: '',
    skills: [],
    serviceAreas: [],
    licenseNumbers: [],
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

  // Load user profile on mount
  useEffect(() => {
    if (user) {
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
        yearsOfExperience: user.yearsOfExperience || '',
        skills: user.skills || [],
        serviceAreas: user.serviceAreas || [],
        licenseNumbers: user.licenseNumbers || [],
      });
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
        yearsOfExperience: tradieData.yearsOfExperience ? parseInt(tradieData.yearsOfExperience) : null,
        skills: tradieData.skills || [],
        serviceAreas: tradieData.serviceAreas || [],
        licenseNumbers: tradieData.licenseNumbers || [],
        certifications: user?.certifications || [],
        portfolio: user?.portfolio || [],
        socialMedia: user?.socialMedia || {},
        emailPrivacy: emailPrivacy, // Include email privacy setting
      };
      
      const result = await updateProfile(profileData);
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
                onClick={() => setActiveTab('privacy')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'privacy'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Privacy
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

            {/* Tradie Profile Fields */}
            <div className="pt-6 border-t border-gray-200 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Profile</h3>
              <p className="text-gray-600 text-sm mb-6">
                Build your professional profile to showcase your skills and experience to potential clients.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trade / Specialty
                  </label>
                  <Input
                    type="text"
                    value={tradieData.trade || ''}
                    onChange={(e) => setTradieData({ ...tradieData, trade: e.target.value })}
                    placeholder="e.g., Electrician, Plumber, Carpenter"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <Input
                    type="text"
                    value={tradieData.businessName || ''}
                    onChange={(e) => setTradieData({ ...tradieData, businessName: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio / About
                </label>
                <textarea
                  value={tradieData.bio || ''}
                  onChange={(e) => setTradieData({ ...tradieData, bio: e.target.value })}
                  rows={6}
                  className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Tell potential clients about yourself, your experience, and what makes you unique..."
                  maxLength={2000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(tradieData.bio || '').length} / 2000 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <PhoneInput
                    value={tradieData.phone || ''}
                    onChange={(e) => setTradieData({ ...tradieData, phone: e.target.value })}
                    placeholder="4XX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <WebsiteInput
                    value={tradieData.website || ''}
                    onChange={(e) => setTradieData({ ...tradieData, website: e.target.value })}
                    placeholder="yourwebsite.com"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <LocationInput
                  value={tradieData.location}
                  onChange={(location) => setTradieData({ ...tradieData, location })}
                  placeholder="Search for your location..."
                  format="simple"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <Input
                  type="number"
                  value={tradieData.yearsOfExperience || ''}
                  onChange={(e) => setTradieData({ ...tradieData, yearsOfExperience: e.target.value })}
                  min="0"
                  max="100"
                  placeholder="0"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills
                </label>
                <TagInput
                  tags={tradieData.skills || []}
                  onChange={(newSkills) => setTradieData({ ...tradieData, skills: newSkills })}
                  placeholder="Type a skill and press Enter (e.g., Electrical Installation)"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Areas
                </label>
                <TagInput
                  tags={tradieData.serviceAreas || []}
                  onChange={(newAreas) => setTradieData({ ...tradieData, serviceAreas: newAreas })}
                  placeholder="Type a service area and press Enter (e.g., Sydney)"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Numbers
                </label>
                <TagInput
                  tags={tradieData.licenseNumbers || []}
                  onChange={(newLicenses) => setTradieData({ ...tradieData, licenseNumbers: newLicenses })}
                  placeholder="Type a license number and press Enter"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                  <select
                    value={privacySettings.yearsOfExperience}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, yearsOfExperience: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                  <select
                    value={privacySettings.skills}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, skills: e.target.value })}
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

            {/* Service Areas & Licenses */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Areas & Licenses</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Areas</label>
                  <select
                    value={privacySettings.serviceAreas}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, serviceAreas: e.target.value })}
                    className="w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="public">Everyone</option>
                    <option value="contacts_of_contacts">Contacts of Contacts</option>
                    <option value="contacts_only">Only Contacts</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Numbers</label>
                  <select
                    value={privacySettings.licenseNumbers}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, licenseNumbers: e.target.value })}
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

            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await updateProfile({ 
                      emailPrivacy,
                      privacySettings 
                    });
                    if (result.success) {
                      showSuccess('Privacy settings updated successfully');
                      await fetchUserProfile(); // Refresh user data
                    } else {
                      showError(result.message);
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
