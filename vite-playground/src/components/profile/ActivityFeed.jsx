import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdDelete, MdThumbUp, MdComment, MdMoreVert, MdChevronRight, MdCheckCircle, MdChevronLeft, MdArrowBack } from 'react-icons/md';
import { get, getToken } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileSwitcher } from '../../contexts/ProfileSwitcherContext';
import { usePermissions } from '../../hooks/usePermissions';
import ReactionPicker from './ReactionPicker';
import MediaGallery from './MediaGallery';
import CommentSection from './CommentSection';
import PostView from './PostView';

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
);

export default function ActivityFeed({ pageId, profileId, businessId, isOwnProfile, username, showViewAll = true, limit = null }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(null); // { type: 'post' | 'comment', postId, commentId?, post: {...} }
  const { user: currentUser } = useAuth();
  const { showError, showSuccess } = useToast();
  const { activeProfile, activeUserId } = useProfileSwitcher();
  const { canDeletePost } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (pageId || profileId || businessId) {
      fetchPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, profileId, businessId]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let data;
      if (pageId) {
        // New format: Fetch posts for page
        data = await get(API_ENDPOINTS.PAGES.GET_POSTS(pageId));
      } else if (businessId) {
        // Legacy format: Fetch posts for business
        data = await get(API_ENDPOINTS.BUSINESSES.GET_POSTS(businessId));
      } else if (profileId) {
        // Legacy format: Fetch posts for user profile
        data = await get(API_ENDPOINTS.PROFILE.GET_POSTS(profileId));
      } else {
        setPosts([]);
        setLoading(false);
        return;
      }
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
    const post = posts.find(p => (p._id?.toString() || p.id?.toString()) === postId.toString());
    
    if (post) {
      const permission = canDeletePost(post);
      if (!permission.allowed) {
        showError(permission.reason || 'You do not have permission to delete this post');
        return;
      }
    }

    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        showError('Please log in to delete posts');
        return;
      }

      const headers = {
        'x-access-token': token,
      };

      // Send active account context
      if (activeUserId) {
        headers['x-active-account-id'] = activeUserId.toString();
      }
      if (activeProfile?.pageId) {
        headers['x-active-page-id'] = activeProfile.pageId;
      }

      const response = await fetch(API_ENDPOINTS.POSTS.DELETE(postId), {
        method: 'DELETE',
        headers,
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

  const handleReaction = async (postId, reactionType) => {
    if (!currentUser) {
      showError('Please log in to react');
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        showError('Please log in to react');
        return;
      }

      // Optimistic update
      const currentUserId = currentUser.id?.toString() || currentUser._id?.toString();
      const postToUpdate = posts.find(p => {
        const postIdStr = p._id?.toString() || p.id?.toString();
        return postIdStr === postId.toString();
      });

      if (postToUpdate) {
        const updatedLikes = [...(postToUpdate.likes || [])];
        const existingReactionIndex = updatedLikes.findIndex(like => {
          const likeUserId = like.userId?._id?.toString() || like.userId?.toString();
          return likeUserId === currentUserId;
        });

        if (existingReactionIndex !== -1) {
          const existingReaction = updatedLikes[existingReactionIndex];
          if (existingReaction.reactionType === reactionType) {
            // Remove reaction if clicking the same reaction
            updatedLikes.splice(existingReactionIndex, 1);
          } else {
            // Update reaction type
            updatedLikes[existingReactionIndex] = {
              ...existingReaction,
              reactionType
            };
          }
        } else {
          // Add new reaction
          updatedLikes.push({
            userId: currentUser,
            reactionType,
            reactedAt: new Date()
          });
        }

        // Update state optimistically - preserve all post properties including comments
        setPosts(prev => prev.map(post => {
          const postIdStr = post._id?.toString() || post.id?.toString();
          const updateIdStr = postId.toString();
          if (postIdStr === updateIdStr) {
            return { 
              ...post, 
              likes: updatedLikes,
              // Preserve comments and all other properties
              comments: post.comments,
              replies: post.replies,
              images: post.images,
              videos: post.videos,
              poll: post.poll
            };
          }
          return post;
        }));
      }

      const response = await fetch(API_ENDPOINTS.POSTS.REACT(postId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify({ reactionType }),
      });

      if (!response.ok) {
        // Revert on error
        fetchPosts();
        const error = await response.json().catch(() => ({ message: 'Failed to react' }));
        throw new Error(error.message || 'Failed to react');
      }

      const data = await response.json();
      
      // Update with server response - merge to preserve existing comments if server doesn't return them
      setPosts(prev => prev.map(post => {
        const postIdStr = post._id?.toString() || post.id?.toString();
        const updateIdStr = postId.toString();
        if (postIdStr === updateIdStr) {
          return {
            ...data.post,
            // Preserve comments if server response doesn't include them
            comments: data.post.comments || post.comments
          };
        }
        return post;
      }));
    } catch (error) {
      showError(error.message || 'Failed to react');
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

  const getAuthorName = (author, post) => {
    // New format: Use authorAccount if available
    if (post?.authorAccount) {
      return post.authorAccount.name || 'Unknown';
    }
    
    // Legacy format: Check postedAsBusinessId first
    if (post?.postedAsBusinessId) {
      const business = post.postedAsBusinessId;
      if (business.businessName) {
        return business.businessName;
      }
    }
    
    // Fallback: If post has a businessId and author owns that business, show business name
    if (post?.businessId) {
      const business = post.businessId;
      const authorIdStr = author?._id?.toString() || author?.id?.toString() || author?.toString();
      const ownerIdStr = business.ownerId?._id?.toString() || business.ownerId?.id?.toString() || business.ownerId?.toString();
      
      // Only show business name if author owns the business (posted AS the business)
      if (ownerIdStr === authorIdStr && business.businessName) {
        return business.businessName;
      }
    }
    
    // Default to user name
    if (author?.firstName && author?.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }
    return author?.username || 'Unknown';
  };

  const getAuthorAvatar = (author, post) => {
    // New format: Use authorAccount if available (even if avatar is null, don't fall back)
    if (post?.authorAccount) {
      // If authorAccount exists, use its avatar (even if null) - don't fall back to legacy
      if (post.authorAccount.avatar) {
        const avatarUrl = post.authorAccount.avatar.startsWith('http') 
          ? post.authorAccount.avatar 
          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${post.authorAccount.avatar}`;
        return avatarUrl;
      }
      // If authorAccount exists but avatar is null, return null (don't fall back)
      return null;
    }
    
    // Legacy format: Only use if authorAccount doesn't exist
    // Check postedAsBusinessId first
    if (post?.postedAsBusinessId) {
      const business = post.postedAsBusinessId;
      if (business.avatar) {
        const avatarUrl = business.avatar.startsWith('http') 
          ? business.avatar 
          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${business.avatar}`;
        return avatarUrl;
      }
    }
    
    // Fallback: If post has a businessId and author owns that business, show business avatar
    if (post?.businessId) {
      const business = post.businessId;
      const authorIdStr = author?._id?.toString() || author?.id?.toString() || author?.toString();
      const ownerIdStr = business.ownerId?._id?.toString() || business.ownerId?.id?.toString() || business.ownerId?.toString();
      
      // Only show business avatar if author owns the business (posted AS the business)
      if (ownerIdStr === authorIdStr && business.avatar) {
        const avatarUrl = business.avatar.startsWith('http') 
          ? business.avatar 
          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${business.avatar}`;
        return avatarUrl;
      }
    }
    
    // Default to user avatar (only if no authorAccount)
    if (author?.avatar) {
      const avatarUrl = author.avatar.startsWith('http') 
        ? author.avatar 
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${author.avatar}`;
      return avatarUrl;
    }
    return null;
  };

  const getCurrentUserReaction = (post) => {
    if (!currentUser || !post.likes) return null;
    const currentUserId = currentUser.id?.toString() || currentUser._id?.toString();
    const reaction = post.likes.find(like => {
      const likeUserId = like.userId?._id?.toString() || like.userId?.toString();
      return likeUserId === currentUserId;
    });
    return reaction?.reactionType || null;
  };

  const handleNavigateToComment = async (action) => {
    if (action.type === 'back') {
      setCurrentView(null);
    } else if (action.type === 'comment') {
      try {
        const token = getToken();
        const response = await fetch(API_ENDPOINTS.POSTS.GET_THREAD(action.commentId), {
          headers: {
            'x-access-token': token || '',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentView({
            type: 'comment',
            postId: action.postId,
            commentId: action.commentId,
            post: data.post
          });
        } else {
          showError('Failed to load comment');
        }
      } catch {
        showError('Failed to load comment');
      }
    }
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

  // If viewing a comment, navigate to post page instead of showing inline
  if (currentView && currentView.type === 'comment') {
    navigate(`/post/${currentView.commentId}`);
    return null;
  }

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
            {posts.map((post) => (
              <div key={post._id} className="shrink-0 w-80">
                <PostView
                  post={post}
                  currentUser={currentUser}
                  isOwnProfile={isOwnProfile}
                  onDelete={handleDeletePost}
                  onReaction={handleReaction}
                  onVote={handleVote}
                  onUpdate={(updatedPost) => {
                    setPosts(prev => prev.map(p => {
                      const postIdStr = p._id?.toString() || p.id?.toString();
                      const updateIdStr = updatedPost._id?.toString() || updatedPost.id?.toString();
                      return postIdStr === updateIdStr ? updatedPost : p;
                    }));
                  }}
                  onNavigateToComment={(action) => {
                    handleNavigateToComment({ ...action, postId: post._id });
                  }}
                  onNavigateToPost={(postId) => {
                    navigate(`/post/${postId}`, { 
                      state: { from: location.pathname } 
                    });
                  }}
                  showComments={false}
                  navigationStack={[]}
                  getAuthorName={getAuthorName}
                  getAuthorAvatar={getAuthorAvatar}
                  getCurrentUserReaction={getCurrentUserReaction}
                  getPollResults={getPollResults}
                  getUserVote={getUserVote}
                  isPollEnded={isPollEnded}
                  formatDate={formatDate}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostView
                key={post._id} 
              post={post}
              currentUser={currentUser}
              isOwnProfile={isOwnProfile}
              onDelete={handleDeletePost}
              onReaction={handleReaction}
              onVote={handleVote}
              onUpdate={(updatedPost) => {
            setPosts(prev => prev.map(p => {
              const postIdStr = p._id?.toString() || p.id?.toString();
              const updateIdStr = updatedPost._id?.toString() || updatedPost.id?.toString();
              return postIdStr === updateIdStr ? updatedPost : p;
            }));
          }}
              onNavigateToComment={(action) => {
                handleNavigateToComment({ ...action, postId: post._id });
              }}
                  onNavigateToPost={(postId) => {
                    navigate(`/post/${postId}`, { 
                      state: { from: location.pathname } 
                    });
                  }}
                  showComments={false}
                  navigationStack={[]}
                  getAuthorName={getAuthorName}
              getAuthorAvatar={getAuthorAvatar}
              getCurrentUserReaction={getCurrentUserReaction}
              getPollResults={getPollResults}
              getUserVote={getUserVote}
              isPollEnded={isPollEnded}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
