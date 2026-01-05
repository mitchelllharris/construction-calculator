import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import LoadingPage from '../components/LoadingPage';
import Button from '../components/Button';
import { MdBusiness, MdAdd, MdLocationOn, MdPhone, MdEmail, MdLink, MdArrowBack } from 'react-icons/md';

export default function MyBusinesses() {
  const navigate = useNavigate();
  const { showError } = useToast();
  const { isBusinessProfile } = useProfileSwitcher();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const data = await get(API_ENDPOINTS.BUSINESSES.GET_USER_BUSINESSES);
      setBusinesses(data.businesses || []);
    } catch (error) {
      showError(error.message || 'Failed to load businesses');
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const getGoogleMapsUrl = (business) => {
    if (business.googleBusinessProfileUrl) {
      return business.googleBusinessProfileUrl;
    }
    
    if (business.location?.googleBusinessPlaceId) {
      return `https://www.google.com/maps/place/?q=place_id:${business.location.googleBusinessPlaceId}`;
    }
    
    if (business.location?.coordinates?.lat && business.location?.coordinates?.lng) {
      return `https://www.google.com/maps?q=${business.location.coordinates.lat},${business.location.coordinates.lng}`;
    }
    
    if (business.location?.placeId) {
      return `https://www.google.com/maps/place/?q=place_id:${business.location.placeId}`;
    }
    
    if (business.location?.formattedAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location.formattedAddress)}`;
    }
    
    const locationString = [
      business.location?.city,
      business.location?.state,
      business.location?.country
    ].filter(Boolean).join(', ');
    
    if (locationString) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationString)}`;
    }
    
    return null;
  };

  if (loading) {
    return <LoadingPage message="Loading your businesses..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <MdArrowBack size={20} />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Businesses</h1>
              <p className="text-gray-600">Manage and view all your business profiles</p>
            </div>
            {!isBusinessProfile && (
              <Button
                onClick={() => navigate('/create-business')}
                className="flex items-center gap-2"
              >
                <MdAdd size={18} />
                Create Business
              </Button>
            )}
          </div>
        </div>

        {businesses.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <MdBusiness size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Businesses Yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first business profile to get started
            </p>
            {!isBusinessProfile && (
              <Button
                onClick={() => navigate('/create-business')}
                className="flex items-center gap-2 mx-auto"
              >
                <MdAdd size={18} />
                Create Your First Business
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business) => {
              const businessId = business.businessSlug || business._id || business.id;
              const mapsUrl = getGoogleMapsUrl(business);
              
              return (
                <div
                  key={business._id || business.id}
                  className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Business Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {business.businessName}
                        </h3>
                        {business.trade && (
                          <p className="text-gray-600 text-sm">{business.trade}</p>
                        )}
                      </div>
                      {business.isVerified && (
                        <div className="ml-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Verified
                          </span>
                        </div>
                      )}
                    </div>
                    {business.description && (
                      <p className="text-gray-700 text-sm line-clamp-2 mt-2">
                        {business.description}
                      </p>
                    )}
                  </div>

                  {/* Business Details */}
                  <div className="p-6 space-y-3">
                    {business.location && (
                      <div className="flex items-start gap-2 text-sm">
                        <MdLocationOn className="text-gray-400 mt-0.5 shrink-0" size={18} />
                        <div className="flex-1 min-w-0">
                          {business.location.formattedAddress ? (
                            <a
                              href={mapsUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-700 hover:text-blue-600 break-words"
                            >
                              {business.location.formattedAddress}
                            </a>
                          ) : (
                            <span className="text-gray-700">
                              {[
                                business.location.city,
                                business.location.state,
                                business.location.country
                              ].filter(Boolean).join(', ') || 'Location not set'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {business.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MdPhone className="text-gray-400 shrink-0" size={18} />
                        <span>{business.phone}</span>
                      </div>
                    )}

                    {business.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MdEmail className="text-gray-400 shrink-0" size={18} />
                        <a
                          href={`mailto:${business.email}`}
                          className="hover:text-blue-600 break-all"
                        >
                          {business.email}
                        </a>
                      </div>
                    )}

                    {business.website && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MdLink className="text-gray-400 shrink-0" size={18} />
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 break-all"
                        >
                          {business.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                    <Link
                      to={`/business/${businessId}`}
                      className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Profile
                    </Link>
                    <Link
                      to={`/business/${businessId}/edit`}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

