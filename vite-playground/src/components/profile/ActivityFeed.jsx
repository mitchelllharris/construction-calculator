import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdDelete, MdThumbUp, MdComment, MdMoreVert, MdChevronRight, MdCheckCircle } from 'react-icons/md';
import { get, getToken } from '../../utils/api';
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
  const { showError, showSuccess } = useToast();
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
      const token = getToken();
      if (!token) {
        showError('Please log in to delete posts');
        return;
      }

      const response = await fetch(API_ENDPOINTS.POSTS.DELETE(postId), {
        method: 'DELETE',
        headers: {
          'x-access-token': token,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete post' }));
        throw new Error(error.message || 'Failed to delete post');
      }

      // Remove post from list - handle both _id and id formats
      setPosts(prev => prev.filter(post => {
        const postIdStr = post._id?.toString() || post.id?.toString();
        const deleteIdStr = postId.toString();
        return postIdStr !== deleteIdStr;
      }));
      
      if (showSuccess) {
        showSuccess('Post deleted successfully');
      }
    } catch (error) {
      showError(error.message || 'Failed to delete post');
    }
  };

  const handleVote = async (postId, optionIndex) => {
    if (!currentUser) {
      showError('Please log in to vote');
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        showError('Please log in to vote');
        return;
      }

      const response = await fetch(API_ENDPOINTS.POSTS.VOTE(postId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify({ optionIndex }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to vote' }));
        throw new Error(error.message || 'Failed to vote');
      }

      const result = await response.json();
      
      // Update the post in the list
      setPosts(prev => prev.map(post => 
        post._id === postId ? result.post : post
      ));
    } catch (error) {
      showError(error.message || 'Failed to vote');
    }
  };

  const getPollResults = (poll) => {
    if (!poll || !poll.votes) return {};
    
    const totalVotes = poll.votes.length;
    const results = {};
    
    poll.options.forEach((_, index) => {
      const votesForOption = poll.votes.filter(vote => vote.optionIndex === index).length;
      results[index] = {
        count: votesForOption,
        percentage: totalVotes > 0 ? (votesForOption / totalVotes) * 100 : 0
      };
    });
    
    return results;
  };

  const getUserVote = (poll) => {
    if (!poll || !poll.votes || !currentUser) return null;
    const vote = poll.votes.find(v => v.userId?._id?.toString() === currentUser.id?.toString() || v.userId?.toString() === currentUser.id?.toString());
    return vote ? vote.optionIndex : null;
  };

  const isPollEnded = (poll) => {
    if (!poll || !poll.endsAt) return false;
    return new Date() > new Date(poll.endsAt);
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
              const currentUserId = currentUser?.id?.toString() || currentUser?._id?.toString();
              const authorId = post.authorUserId?._id?.toString() || post.authorUserId?.toString();
              const postProfileId = post.profileUserId?._id?.toString() || post.profileUserId?.toString();
              const canDelete = isOwnProfile || (currentUserId && (currentUserId === authorId || currentUserId === postProfileId));
              
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

              {/* Poll */}
              {post.poll && post.poll.options && post.poll.options.length > 0 && (
                <div className="mb-3">
                  <div className="space-y-2">
                    {post.poll.options.map((option, index) => {
                      const results = getPollResults(post.poll);
                      const userVote = getUserVote(post.poll);
                      const pollEnded = isPollEnded(post.poll);
                      const isSelected = userVote === index;
                      const result = results[index] || { count: 0, percentage: 0 };
                      const totalVotes = post.poll.votes?.length || 0;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => !pollEnded && handleVote(post._id, index)}
                          disabled={pollEnded}
                          className={`w-full text-left p-2 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                          } ${pollEnded ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-900">{option}</span>
                            {isSelected && (
                              <MdCheckCircle className="text-blue-500" size={16} />
                            )}
                          </div>
                          {totalVotes > 0 && (
                            <div className="mt-1">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>{result.count}</span>
                                <span>{result.percentage.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                                  style={{ width: `${result.percentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {(() => {
                      const totalVotes = post.poll.votes?.length || 0;
                      const pollEnded = isPollEnded(post.poll);
                      if (pollEnded) {
                        return `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}`;
                      }
                      return `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}`;
                    })()}
                  </div>
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

                {/* Poll */}
                {post.poll && post.poll.options && post.poll.options.length > 0 && (
                  <div className="mb-3">
                    <div className="space-y-2">
                      {post.poll.options.map((option, index) => {
                        const results = getPollResults(post.poll);
                        const userVote = getUserVote(post.poll);
                        const pollEnded = isPollEnded(post.poll);
                        const isSelected = userVote === index;
                        const result = results[index] || { count: 0, percentage: 0 };
                        const totalVotes = post.poll.votes?.length || 0;

                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => !pollEnded && handleVote(post._id, index)}
                            disabled={pollEnded}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                            } ${pollEnded ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">{option}</span>
                              {isSelected && (
                                <MdCheckCircle className="text-blue-500" size={20} />
                              )}
                            </div>
                            {totalVotes > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                  <span>{result.count} {result.count === 1 ? 'vote' : 'votes'}</span>
                                  <span>{result.percentage.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${result.percentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {(() => {
                        const totalVotes = post.poll.votes?.length || 0;
                        const pollEnded = isPollEnded(post.poll);
                        if (pollEnded) {
                          return `Poll ended • ${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}`;
                        }
                        if (post.poll.endsAt) {
                          const endsAt = new Date(post.poll.endsAt);
                          const now = new Date();
                          const diffMs = endsAt - now;
                          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                          const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                          if (diffDays > 0) {
                            return `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'} • ${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`;
                          } else if (diffHours > 0) {
                            return `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'} • ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} left`;
                          } else {
                            return `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'} • Ending soon`;
                          }
                        }
                        return `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}`;
                      })()}
                    </div>
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

