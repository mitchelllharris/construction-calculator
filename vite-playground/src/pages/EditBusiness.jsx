import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { get, put, del } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import Input from '../components/Input';
import PhoneInput from '../components/PhoneInput';
import LocationInput from '../components/LocationInput';
import Button from '../components/Button';
import LoadingPage from '../components/LoadingPage';
import { MdBusiness, MdArrowBack, MdDelete } from 'react-icons/md';

export default function EditBusiness() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [business, setBusiness] = useState(null);
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

  useEffect(() => {
    fetchBusiness();
  }, [slug, id]);

  const fetchBusiness = async () => {
    try {
      let url;
      if (id) {
        url = API_ENDPOINTS.BUSINESSES.GET_BY_ID(id);
      } else if (slug) {
        url = API_ENDPOINTS.BUSINESSES.GET_BY_SLUG(slug);
      } else {
        showError('Invalid business identifier');
        navigate('/');
        return;
      }

      const businessData = await get(url);
      setBusiness(businessData);
      
      // Populate form with existing data
      setFormData({
        businessName: businessData.businessName || '',
        description: businessData.description || '',
        trade: businessData.trade || '',
        abn: businessData.abn || '',
        phone: businessData.phone || '',
        email: businessData.email || '',
        website: businessData.website || '',
        location: businessData.location || null,
        googleBusinessProfileUrl: businessData.googleBusinessProfileUrl || '',
        serviceAreas: businessData.serviceAreas || [],
        licenseNumbers: businessData.licenseNumbers || []
      });
    } catch (error) {
      showError(error.message || 'Failed to load business');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.businessName.trim()) {
      showError('Business name is required');
      return;
    }

    setSaving(true);
    try {
      const businessId = business._id || business.id;
      // Ensure googleBusinessProfileUrl is included in the request
      const submitData = {
        ...formData,
        googleBusinessProfileUrl: formData.googleBusinessProfileUrl || ''
      };
      console.log('DEBUG: Updating business data:', submitData);
      console.log('DEBUG: googleBusinessProfileUrl in update:', submitData.googleBusinessProfileUrl);
      const response = await put(API_ENDPOINTS.BUSINESSES.UPDATE(businessId), submitData);
      console.log('DEBUG: Business updated response:', response);
      showSuccess('Business updated successfully!');
      // Navigate back to the business page
      navigate(`/business/${business.businessSlug || businessId}`);
    } catch (error) {
      showError(error.message || 'Failed to update business');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const businessId = business._id || business.id;
      await del(API_ENDPOINTS.BUSINESSES.DELETE(businessId));
      showSuccess('Business deleted successfully');
      // Navigate to user's profile or dashboard
      navigate('/dashboard');
    } catch (error) {
      showError(error.message || 'Failed to delete business');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingPage message="Loading business..." />;
  }

  if (!business) {
    return null;
  }

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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <MdBusiness size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Business</h1>
                <p className="text-gray-600">Update your business information</p>
              </div>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <MdDelete size={18} />
              {deleting ? 'Deleting...' : 'Delete Business'}
            </button>
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
                disabled={saving}
                text={saving ? 'Saving...' : 'Save Changes'}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

