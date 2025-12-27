import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdDelete, MdThumbUp, MdComment, MdMoreVert, MdChevronRight } from 'react-icons/md';
import { get } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
);

export default function ActivityFeed({ profileId, isOwnProfile, username, showViewAll = true, limit = null }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (profileId) {
      fetchPosts();
    }
  }, [profileId]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await get(API_ENDPOINTS.PROFILE.GET_POSTS(profileId));
      const allPosts = data.posts || [];
      // If limit is specified, only show that many posts
      setPosts(limit ? allPosts.slice(0, limit) : allPosts);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.POSTS.DELETE(postId), {
        method: 'DELETE',
        headers: {
          'x-access-token': token,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      setPosts(prev => prev.filter(post => post._id !== postId));
    } catch (error) {
      showError(error.message || 'Failed to delete post');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const getImageUrl = (url) => {
    return url.startsWith('http') 
      ? url 
      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${url}`;
  };

  const getAuthorName = (author) => {
    if (!author) return 'Unknown';
    if (author.firstName && author.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }
    return author.username || 'Unknown';
  };

  const getAuthorAvatar = (author) => {
    if (author?.avatar) {
      const avatarUrl = author.avatar.startsWith('http') 
        ? author.avatar 
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${author.avatar}`;
      return avatarUrl;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Activity</h2>
          {showViewAll && username && (
            <button
              onClick={() => navigate(`/profile/${username}/activity`)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1"
            >
              View all
              <MdChevronRight size={18} />
            </button>
          )}
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Activity</h2>
          {showViewAll && username && (
            <button
              onClick={() => navigate(`/profile/${username}/activity`)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1"
            >
              View all
              <MdChevronRight size={18} />
            </button>
          )}
        </div>
        <p className="text-gray-500 text-center py-8">No posts yet</p>
      </div>
    );
  }

  // Determine if we should show horizontal scroll (when limit is set)
  const isHorizontal = limit !== null;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Activity</h2>
        {showViewAll && username && (
          <button
            onClick={() => navigate(`/profile/${username}/activity`)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1"
          >
            View all
            <MdChevronRight size={18} />
          </button>
        )}
      </div>
      {isHorizontal ? (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="flex gap-4 pb-4">
            {posts.map((post) => {
              const canDelete = isOwnProfile || (currentUser && currentUser.id === post.authorUserId?._id);
              
              return (
                <div 
                  key={post._id} 
                  className="border border-gray-200 rounded-lg p-4 flex-shrink-0 w-80"
                >
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getAuthorAvatar(post.authorUserId) ? (
                    <img
                      src={getAuthorAvatar(post.authorUserId)}
                      alt={getAuthorName(post.authorUserId)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {getAuthorName(post.authorUserId).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{getAuthorName(post.authorUserId)}</p>
                    <p className="text-xs text-gray-500">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDeletePost(post._id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete post"
                  >
                    <MdDelete size={20} />
                  </button>
                )}
              </div>

              {/* Post Content */}
              {post.content && (
                <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>
              )}

              {/* Post Images */}
              {post.images && post.images.length > 0 && (
                <div className={`grid gap-2 mb-3 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.images.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={getImageUrl(imageUrl)}
                      alt={`Post image ${index + 1}`}
                      className={`w-full rounded-lg object-cover ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
                    />
                  ))}
                </div>
              )}

              {/* Post Videos */}
              {post.videos && post.videos.length > 0 && (
                <div className="space-y-2 mb-3">
                  {post.videos.map((videoUrl, index) => (
                    <video
                      key={index}
                      src={getImageUrl(videoUrl)}
                      controls
                      className={`w-full rounded-lg ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
                    />
                  ))}
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <MdThumbUp size={20} />
                  <span className="text-sm">Like ({post.likes?.length || 0})</span>
                </button>
                <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <MdComment size={20} />
                  <span className="text-sm">Comment ({post.comments?.length || 0})</span>
                </button>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const canDelete = isOwnProfile || (currentUser && currentUser.id === post.authorUserId?._id);
            
            return (
              <div key={post._id} className="border border-gray-200 rounded-lg p-4">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getAuthorAvatar(post.authorUserId) ? (
                      <img
                        src={getAuthorAvatar(post.authorUserId)}
                        alt={getAuthorName(post.authorUserId)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {getAuthorName(post.authorUserId).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{getAuthorName(post.authorUserId)}</p>
                      <p className="text-xs text-gray-500">{formatDate(post.createdAt)}</p>
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post._id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete post"
                    >
                      <MdDelete size={20} />
                    </button>
                  )}
                </div>

                {/* Post Content */}
                {post.content && (
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>
                )}

                {/* Post Images */}
                {post.images && post.images.length > 0 && (
                  <div className={`grid gap-2 mb-3 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {post.images.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={getImageUrl(imageUrl)}
                        alt={`Post image ${index + 1}`}
                        className="w-full rounded-lg object-cover max-h-96"
                      />
                    ))}
                  </div>
                )}

                {/* Post Videos */}
                {post.videos && post.videos.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {post.videos.map((videoUrl, index) => (
                      <video
                        key={index}
                        src={getImageUrl(videoUrl)}
                        controls
                        className="w-full rounded-lg max-h-96"
                      />
                    ))}
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                    <MdThumbUp size={20} />
                    <span className="text-sm">Like ({post.likes?.length || 0})</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                    <MdComment size={20} />
                    <span className="text-sm">Comment ({post.comments?.length || 0})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

