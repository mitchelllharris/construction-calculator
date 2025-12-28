import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { getToken } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import PostView from '../components/profile/PostView';
import CommentSection from '../components/profile/CommentSection';

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
);

export default function Post() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(null);
  const { user: currentUser } = useAuth();
  const { showError, showSuccess } = useToast();

  // Scroll to top when component mounts or postId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [postId]);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.POSTS.GET_THREAD(postId), {
        headers: {
          'x-access-token': token || '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPost(data.post);
      } else {
        showError('Failed to load post');
      }
      } catch {
        showError('Failed to load post');
      } finally {
      setLoading(false);
    }
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

  const getCurrentUserReaction = (post) => {
    if (!currentUser || !post.likes) return null;
    const currentUserId = currentUser.id?.toString() || currentUser._id?.toString();
    const reaction = post.likes.find(like => {
      const likeUserId = like.userId?._id?.toString() || like.userId?.toString();
      return likeUserId === currentUserId;
    });
    return reaction?.reactionType || null;
  };

  const getPollResults = (poll) => {
    if (!poll || !poll.votes) return [];
    const results = poll.options.map(() => ({ count: 0, percentage: 0 }));
    poll.votes.forEach(vote => {
      if (vote.optionIndex !== undefined && vote.optionIndex !== null) {
        results[vote.optionIndex].count++;
      }
    });
    const total = results.reduce((sum, r) => sum + r.count, 0);
    if (total > 0) {
      results.forEach(r => {
        r.percentage = (r.count / total) * 100;
      });
    }
    return results;
  };

  const getUserVote = (poll) => {
    if (!currentUser || !poll || !poll.votes) return null;
    const currentUserId = currentUser.id?.toString() || currentUser._id?.toString();
    const vote = poll.votes.find(v => {
      const voteUserId = v.userId?._id?.toString() || v.userId?.toString();
      return voteUserId === currentUserId;
    });
    return vote?.optionIndex !== undefined ? vote.optionIndex : null;
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

  const handleDeletePost = async (postIdToDelete) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        showError('Please log in to delete posts');
        return;
      }

      const response = await fetch(API_ENDPOINTS.POSTS.DELETE(postIdToDelete), {
        method: 'DELETE',
        headers: {
          'x-access-token': token,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete post' }));
        throw new Error(error.message || 'Failed to delete post');
      }

      showSuccess('Post deleted successfully');
      navigate(-1); // Go back to previous page
    } catch (error) {
      showError(error.message || 'Failed to delete post');
    }
  };

  const handleReaction = async (postIdToReact, reactionType) => {
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
      const currentPost = currentView?.post || post;
      
      // Update optimistically
      const updatedLikes = [...(currentPost.likes || [])];
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

      // Update state optimistically - preserve comments
      if (currentView && currentView.type === 'comment') {
        setCurrentView(prev => prev ? {
          ...prev,
          post: { 
            ...prev.post, 
            likes: updatedLikes,
            comments: prev.post.comments,
            replies: prev.post.replies
          }
        } : null);
      } else {
        setPost(prev => prev ? { 
          ...prev, 
          likes: updatedLikes,
          comments: prev.comments,
          replies: prev.replies
        } : null);
      }

      const response = await fetch(API_ENDPOINTS.POSTS.REACT(postIdToReact), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify({ reactionType }),
      });

      if (!response.ok) {
        // Revert on error
        fetchPost();
        const error = await response.json().catch(() => ({ message: 'Failed to react' }));
        throw new Error(error.message || 'Failed to react');
      }

      const data = await response.json();
      // Update with server response - fetch full thread to preserve comments
      const threadResponse = await fetch(API_ENDPOINTS.POSTS.GET_THREAD(postIdToReact), {
        headers: {
          'x-access-token': token,
        },
      });
      if (threadResponse.ok) {
        const threadData = await threadResponse.json();
        if (currentView && currentView.type === 'comment') {
          setCurrentView(prev => prev ? {
            ...prev,
            post: threadData.post
          } : null);
        } else {
          setPost(threadData.post);
        }
      } else {
        // Fallback to response data, preserving existing comments
        if (currentView && currentView.type === 'comment') {
          setCurrentView(prev => prev ? {
            ...prev,
            post: {
              ...data.post,
              comments: prev.post.comments || data.post.comments
            }
          } : null);
        } else {
          setPost(prev => ({
            ...data.post,
            comments: prev.comments || data.post.comments
          }));
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to react');
    }
  };

  const handleVote = async (postIdToVote, optionIndex) => {
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

      const response = await fetch(API_ENDPOINTS.POSTS.VOTE(postIdToVote), {
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

      const data = await response.json();
      if (currentView && currentView.type === 'comment') {
        setCurrentView(prev => prev ? {
          ...prev,
          post: data.post
        } : null);
      } else {
        setPost(data.post);
      }
    } catch (error) {
      showError(error.message || 'Failed to vote');
    }
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

  const handleBackFromComment = () => {
    setCurrentView(null);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    // If we have a previous location, go back to it
    // Otherwise, navigate to home or profile
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (post?.profileUserId) {
      // Try to get username from post
      const profileUsername = post.profileUserId?.username;
      if (profileUsername) {
        navigate(`/profile/${profileUsername}`);
      } else {
        navigate(-1);
      }
    } else {
      // Fallback: go back in history, but ensure we scroll to top
      navigate(-1);
    }
    // Scroll to top after navigation
    setTimeout(() => window.scrollTo(0, 0), 100);
  };

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

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-500 text-center py-8">Post not found</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser && (
    currentUser.id?.toString() === post.authorUserId?._id?.toString() ||
    currentUser.id?.toString() === post.authorUserId?.toString() ||
    currentUser._id?.toString() === post.authorUserId?._id?.toString() ||
    currentUser._id?.toString() === post.authorUserId?.toString()
  );

  // If viewing a comment, show it as the main post
  if (currentView && currentView.type === 'comment') {
    const viewPost = currentView.post;
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleBackFromComment}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MdArrowBack size={24} />
              </button>
              <h2 className="text-lg font-bold text-gray-900">Post</h2>
            </div>
            <PostView
              post={viewPost}
              currentUser={currentUser}
              isOwnProfile={isOwnProfile}
              onDelete={handleDeletePost}
              onReaction={handleReaction}
              onVote={handleVote}
              onUpdate={(updatedPost) => {
                setCurrentView(prev => prev ? { ...prev, post: updatedPost } : null);
                fetchPost(); // Refresh main post
              }}
              onNavigateToComment={handleNavigateToComment}
              onNavigateToPost={(postId) => {
                navigate(`/post/${postId}`, { 
                  state: { from: location.pathname } 
                });
              }}
              showComments={true}
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MdArrowBack size={24} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Post</h2>
          </div>
          <PostView
            post={post}
            currentUser={currentUser}
            isOwnProfile={isOwnProfile}
            onDelete={handleDeletePost}
            onReaction={handleReaction}
            onVote={handleVote}
            onUpdate={(updatedPost) => {
              setPost(updatedPost);
            }}
              onNavigateToComment={handleNavigateToComment}
              onNavigateToPost={(postId) => {
                navigate(`/post/${postId}`);
              }}
              showComments={true}
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
      </div>
    </div>
  );
}

