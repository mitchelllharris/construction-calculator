import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import LoadingPage from '../components/LoadingPage';
import EditableSection from '../components/EditableSection';
import PostForm from '../components/profile/PostForm';
import ActivityFeed from '../components/profile/ActivityFeed';
import PhotosGallery from '../components/profile/PhotosGallery';
import PhotoGalleryModal from '../components/profile/PhotoGalleryModal';
import { 
  MdEmail, MdPhone, MdLocationOn, 
  MdLink, MdEdit, MdArrowBack, MdCheckCircle, MdCalendarToday,
  MdImage, MdBusiness
} from 'react-icons/md';
import Button from '../components/Button';

export default function Business() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showError } = useToast();
  
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);
  const [posts, setPosts] = useState([]);
  const [showPhotoGalleryModal, setShowPhotoGalleryModal] = useState(false);
  const [photoGalleryIndex, setPhotoGalleryIndex] = useState(0);

  // Calculate isOwner
  const ownerId = business?.ownerId?._id?.toString() || business?.ownerId?.id?.toString() || business?.ownerId?.toString();
  const isOwner = currentUser && business && ownerId === currentUser.id?.toString();

  useEffect(() => {
    fetchBusiness();
  }, [slug, id]);

  // Refresh when page becomes visible (user returns from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && business?._id) {
        fetchBusiness();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [business?._id]);

  useEffect(() => {
    if (business?._id) {
      fetchPostsForGallery();
    }
  }, [business?._id, postsRefreshKey]);

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
      console.log('DEBUG: Fetched business data:', businessData);
      console.log('DEBUG: googleBusinessProfileUrl in fetched data:', businessData?.googleBusinessProfileUrl);
      setBusiness(businessData);
    } catch (error) {
      showError(error.message || 'Failed to load business');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchPostsForGallery = async () => {
    if (!business?._id) return;
    try {
      // Fetch posts made ON the business profile, not posts by the owner
      const data = await get(API_ENDPOINTS.BUSINESSES.GET_POSTS(business._id));
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch posts for gallery:', error);
      setPosts([]);
    }
  };

  const getGoogleMapsUrl = () => {
    // DEBUG: Log business data
    console.log('DEBUG: Business data:', business);
    console.log('DEBUG: googleBusinessProfileUrl:', business?.googleBusinessProfileUrl);
    
    // For businesses, prioritize Google Business Profile URL if provided
    // Check this first before any location-based URLs
    const googleBusinessUrl = business?.googleBusinessProfileUrl?.trim();
    console.log('DEBUG: Trimmed googleBusinessUrl:', googleBusinessUrl);
    
    if (googleBusinessUrl && googleBusinessUrl.length > 0) {
      // Ensure it's a valid URL (starts with http:// or https://)
      if (googleBusinessUrl.startsWith('http://') || googleBusinessUrl.startsWith('https://')) {
        console.log('DEBUG: Returning Google Business Profile URL:', googleBusinessUrl);
        return googleBusinessUrl;
      }
      // If it doesn't have a protocol, add https://
      const urlWithProtocol = `https://${googleBusinessUrl}`;
      console.log('DEBUG: Returning Google Business Profile URL with protocol:', urlWithProtocol);
      return urlWithProtocol;
    }
    
    console.log('DEBUG: No Google Business Profile URL, using location-based URL');
    
    // Check if they have Google Business listing place ID
    if (business?.location?.googleBusinessPlaceId) {
      return `https://www.google.com/maps/place/?q=place_id:${business.location.googleBusinessPlaceId}`;
    }
    
    // If we have coordinates, use them for precise location
    if (business?.location?.coordinates?.lat && business?.location?.coordinates?.lng) {
      return `https://www.google.com/maps?q=${business.location.coordinates.lat},${business.location.coordinates.lng}`;
    }
    
    // If we have a placeId, use it
    if (business?.location?.placeId) {
      return `https://www.google.com/maps/place/?q=place_id:${business.location.placeId}`;
    }
    
    // If we have formatted address, use it
    if (business?.location?.formattedAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location.formattedAddress)}`;
    }
    
    // Fall back to city/state/country
    const locationString = [
      business?.location?.city,
      business?.location?.state,
      business?.location?.country
    ].filter(Boolean).join(', ');
    
    if (locationString) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationString)}`;
    }
    
    return null;
  };

  const locationString = [
    business?.location?.city,
    business?.location?.state,
    business?.location?.country
  ].filter(Boolean).join(', ');

  // Extract all images from portfolio and posts for photo gallery
  const getAllPortfolioImages = () => {
    const images = [];
    
    // Add portfolio images
    business?.portfolio?.forEach((item) => {
      if (item.images && Array.isArray(item.images)) {
        item.images.forEach((imageUrl) => {
          images.push({
            url: imageUrl,
            date: item.date ? new Date(item.date) : new Date(0),
            projectTitle: item.title || 'Untitled Project',
            uploadedBy: 'owner',
            uploadedByUser: null,
          });
        });
      }
    });
    
    // Add post images and videos
    posts.forEach((post) => {
      if (post.parentPostId || post.parentCommentId || post.isDeleted) return;
      
      const postDate = post.createdAt ? new Date(post.createdAt) : new Date();
      const authorId = post.authorUserId?.id || post.authorUserId?._id?.toString() || post.authorUserId?.toString();
      const businessOwnerId = business?.ownerId?._id?.toString() || business?.ownerId?.id?.toString() || business?.ownerId?.toString();
      const isOwner = authorId === businessOwnerId;
      
      if (post.images && Array.isArray(post.images) && post.images.length > 0) {
        post.images.forEach((imageUrl) => {
          images.push({
            url: imageUrl,
            date: postDate,
            projectTitle: post.content ? (post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content) : 'Post',
            uploadedBy: isOwner ? 'owner' : 'user',
            uploadedByUser: isOwner ? null : (post.authorUserId || null),
          });
        });
      }
      
      if (post.videos && Array.isArray(post.videos) && post.videos.length > 0) {
        post.videos.forEach((videoUrl) => {
          images.push({
            url: videoUrl,
            date: postDate,
            projectTitle: post.content ? (post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content) : 'Post',
            uploadedBy: isOwner ? 'owner' : 'user',
            uploadedByUser: isOwner ? null : (post.authorUserId || null),
            isVideo: true,
          });
        });
      }
    });
    
    return images.sort((a, b) => b.date - a.date);
  };

  const allPortfolioImages = getAllPortfolioImages();

  const handlePhotoClick = (index) => {
    setPhotoGalleryIndex(index);
    setShowPhotoGalleryModal(true);
  };

  if (loading) {
    return <LoadingPage message="Loading business..." />;
  }

  if (!business) {
    return null;
  }

  const avatarUrl = business.avatar 
    ? (business.avatar.startsWith('http') ? business.avatar : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${business.avatar}`)
    : null;


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 h-48 relative">
        {business.coverImage && (
          <img
            src={business.coverImage.startsWith('http') 
              ? business.coverImage 
              : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${business.coverImage}`}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="container mx-auto px-4 pt-8">
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200 mb-4 flex items-center gap-2"
          >
            <MdArrowBack size={20} />
            Back
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Business Header Card */}
        <div className="bg-white shadow-lg rounded-lg -mt-24 mb-6 relative">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-blue-500 flex items-center justify-center text-white text-4xl font-semibold">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={business.businessName} className="w-full h-full object-cover" />
                  ) : (
                    <MdBusiness size={48} />
                  )}
                </div>
              </div>

              {/* Business Info */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900">
                        {business.businessName}
                      </h1>
                      {business.isVerified && (
                        <MdCheckCircle className="text-blue-600" size={24} />
                      )}
                    </div>
                    {business.trade && (
                      <p className="text-xl text-gray-600 mb-2">{business.trade}</p>
                    )}
                    {locationString && (
                      <a
                        href={getGoogleMapsUrl() || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-600 mt-2 hover:text-blue-600 transition-colors cursor-pointer"
                        onClick={(e) => {
                          const url = getGoogleMapsUrl();
                          if (!url) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <MdLocationOn size={18} />
                        <span>{locationString}</span>
                      </a>
                    )}
                  </div>
                  {isOwner && (
                    <Button
                      onClick={() => {
                        const businessId = business.businessSlug || business._id;
                        navigate(`/business/${businessId}/edit`);
                      }}
                      className="flex items-center gap-2"
                    >
                      <MdEdit size={18} />
                      Edit Business
                    </Button>
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-gray-600">
                  {business.phone && (
                    <a
                      href={`tel:${business.phone}`}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdPhone size={18} />
                      <span>{business.phone}</span>
                    </a>
                  )}
                  {business.email && (
                    <a
                      href={`mailto:${business.email}`}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdEmail size={18} />
                      <span>{business.email}</span>
                    </a>
                  )}
                  {business.website && (
                    <a
                      href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdLink size={18} />
                      <span>Website</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post Form - Visible to owner */}
            {isOwner && business?._id && (
              <PostForm
                businessId={business._id}
                onPostCreated={() => {
                  setPostsRefreshKey(prev => prev + 1);
                }}
                isOwnProfile={isOwner}
              />
            )}

            {/* Description */}
            {business.description && (
              <EditableSection
                title="About"
                isEmpty={!business.description}
                isOwnProfile={isOwner}
                onEdit={() => {}}
                onAdd={() => {}}
                emptyMessage="Add business description"
              >
                <p className="text-gray-700 whitespace-pre-wrap break-words">{business.description}</p>
              </EditableSection>
            )}


            {/* Activity Feed */}
            {business?._id && (
              <ActivityFeed
                key={postsRefreshKey}
                businessId={business._id}
                isOwnProfile={isOwner}
                username={business?.businessName}
                showViewAll={true}
                limit={3}
              />
            )}

            {/* Portfolio */}
            {business.portfolio && business.portfolio.length > 0 && (
              <EditableSection
                title="Portfolio"
                icon={MdImage}
                isEmpty={false}
                isOwnProfile={isOwner}
                onEdit={() => {}}
                onAdd={() => {}}
                emptyMessage="Add portfolio projects"
              >
                <div className="space-y-6">
                  {business.portfolio.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {item.images && item.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-50">
                          {item.images.map((imageUrl, imgIndex) => {
                            const fullUrl = imageUrl.startsWith('http') 
                              ? imageUrl 
                              : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${imageUrl}`;
                            return (
                              <div key={imgIndex} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                                <img
                                  src={fullUrl}
                                  alt={`${item.title} - Image ${imgIndex + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          {item.location && (
                            <p className="flex items-center gap-1">
                              <MdLocationOn size={16} />
                              {item.location}
                            </p>
                          )}
                          {item.date && (
                            <p className="flex items-center gap-1">
                              <MdCalendarToday size={16} />
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </EditableSection>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Photos Gallery */}
            <PhotosGallery
              allImages={allPortfolioImages}
              onImageClick={handlePhotoClick}
            />

            {/* Service Areas */}
            {business.serviceAreas && business.serviceAreas.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Service Areas</h3>
                <div className="space-y-2">
                  {business.serviceAreas.map((area, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-700">
                      <MdCheckCircle className="text-green-500" size={16} />
                      <span>{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Licenses */}
            {business.licenseNumbers && business.licenseNumbers.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Licenses</h3>
                <div className="space-y-2">
                  {business.licenseNumbers.map((license, index) => (
                    <div key={index} className="text-gray-700 text-sm">
                      {license}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PhotoGalleryModal
        isOpen={showPhotoGalleryModal}
        onClose={() => setShowPhotoGalleryModal(false)}
        images={allPortfolioImages}
        initialIndex={photoGalleryIndex}
      />
    </div>
  );
}

