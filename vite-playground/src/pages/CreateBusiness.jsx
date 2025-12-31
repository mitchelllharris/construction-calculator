import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { post } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import Input from '../components/Input';
import PhoneInput from '../components/PhoneInput';
import LocationInput from '../components/LocationInput';
import Button from '../components/Button';
import { MdBusiness, MdArrowBack } from 'react-icons/md';

export default function CreateBusiness() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { refreshBusinesses, switchToBusiness } = useProfileSwitcher();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    trade: '',
    abn: '',
    phone: '',
    email: '',
    website: '',
    location: null,
    googleBusinessProfileUrl: '',
    serviceAreas: [],
    licenseNumbers: []
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.businessName.trim()) {
      showError('Business name is required');
      return;
    }
    if (!formData.abn.trim()) {
      showError('ABN (or equivalent) is required');
      return;
    }
    if (!formData.trade.trim()) {
      showError('Industry is required');
      return;
    }
    if (!formData.phone.trim()) {
      showError('Phone is required');
      return;
    }
    if (!formData.email.trim()) {
      showError('Email is required');
      return;
    }
    if (!formData.location || (!formData.location.city && !formData.location.formattedAddress)) {
      showError('Location is required');
      return;
    }

    setLoading(true);
    try {
      // Ensure googleBusinessProfileUrl is included in the request
      const submitData = {
        ...formData,
        googleBusinessProfileUrl: formData.googleBusinessProfileUrl || ''
      };
      console.log('DEBUG: Submitting business data:', submitData);
      console.log('DEBUG: googleBusinessProfileUrl in submit:', submitData.googleBusinessProfileUrl);
      const response = await post(API_ENDPOINTS.BUSINESSES.CREATE, submitData);
      console.log('DEBUG: Business created response:', response);
      console.log('DEBUG: googleBusinessProfileUrl in response:', response?.business?.googleBusinessProfileUrl);
      
      // Refresh businesses list and switch to the new business
      await refreshBusinesses();
      if (response.business) {
        switchToBusiness(response.business);
      }
      
      showSuccess('Business created successfully!');
      // Navigate to the business page
      navigate(`/business/${response.business.businessSlug || response.business._id}`);
    } catch (error) {
      showError(error.message || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <MdArrowBack size={20} />
          Back
        </button>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <MdBusiness size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Business</h1>
              <p className="text-gray-600">Set up your business page to access exclusive features</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                placeholder="e.g., Steve's Excavation Services"
                required
              />
            </div>

            {/* Trade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trade/Industry <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.trade}
                onChange={(e) => handleChange('trade', e.target.value)}
                placeholder="e.g., Excavator Operator, Plumber, Asphalt Contractor"
                required
              />
            </div>

            {/* ABN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ABN / Business Number <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.abn}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/[^\d]/g, '');
                  handleChange('abn', value);
                }}
                placeholder="e.g., 12345678901 (Australia) or equivalent for your country"
                required
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <p className="text-xs text-gray-500 mt-1">
                Australian Business Number (ABN) or equivalent business registration number (numbers only)
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Tell potential clients about your business..."
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length} / 2000 characters
              </p>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Phone number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="business@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>

            {/* Google Business Profile Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Business Profile Link (Optional)
              </label>
              <Input
                type="url"
                value={formData.googleBusinessProfileUrl}
                onChange={(e) => handleChange('googleBusinessProfileUrl', e.target.value)}
                placeholder="https://www.google.com/maps/place/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste your Google Business Profile URL. This will be used as the link when users click on your address.
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <LocationInput
                value={formData.location}
                onChange={(location) => handleChange('location', location)}
                placeholder="Search for your business location..."
                format="simple"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                onClick={() => navigate(-1)}
                className="bg-gray-500 hover:bg-gray-600"
                text="Cancel"
              />
              <Button
                type="submit"
                disabled={loading}
                text={loading ? 'Creating...' : 'Create Business'}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

