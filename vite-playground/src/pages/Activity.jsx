import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import ActivityFeed from '../components/profile/ActivityFeed';
import PostForm from '../components/profile/PostForm';

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
);

export default function Activity() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const { showError } = useToast();
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const profileData = await get(API_ENDPOINTS.PROFILE.GET_BY_USERNAME(username));
      setProfile(profileData);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      showError('Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    setPostsRefreshKey(prev => prev + 1);
  };

  const isOwnProfile = currentUser && profile && currentUser.id === profile.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">Profile not found</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/profile/${username}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <MdArrowBack size={20} />
          <span>Back to Profile</span>
        </button>

        {/* Profile Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            {profile.avatar ? (
              <img
                src={profile.avatar.startsWith('http') 
                  ? profile.avatar 
                  : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${profile.avatar}`}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
                {profile.firstName?.charAt(0) || profile.username?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.firstName && profile.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : profile.username}
              </h1>
              <p className="text-gray-500">Activity Feed</p>
            </div>
          </div>
        </div>

        {/* Post Form (only visible to owner) */}
        {isOwnProfile && (
          <div className="mb-6">
            <PostForm
              profileUserId={profile.id}
              onPostCreated={handlePostCreated}
              isOwnProfile={isOwnProfile}
            />
          </div>
        )}

        {/* Activity Feed */}
        <ActivityFeed
          key={postsRefreshKey}
          profileId={profile.id}
          isOwnProfile={isOwnProfile}
          username={username}
          showViewAll={false}
          limit={null}
        />
      </div>
    </div>
  );
}

