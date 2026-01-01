import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdDelete, MdCheckCircle } from 'react-icons/md';
import { useProfileSwitcher } from '../../contexts/ProfileSwitcherContext';
import ReactionPicker from './ReactionPicker';
import MediaGallery from './MediaGallery';
import CommentSection from './CommentSection';

export default function PostView({ 
  post, 
  currentUser, 
  isOwnProfile,
  onDelete,
  onReaction,
  onVote,
  onUpdate,
  onNavigateToComment,
  onNavigateToPost,
  showComments = false, // New prop to control comment visibility - default false to hide in feeds
  getAuthorName,
  getAuthorAvatar,
  getCurrentUserReaction,
  getPollResults,
  getUserVote,
  isPollEnded,
  formatDate
}) {
  const navigate = useNavigate();
  const { activeProfile, isUserProfile, isBusinessProfile } = useProfileSwitcher();
  
  const getAuthorProfileUrl = (post) => {
    if (post?.authorAccount) {
      if (post.authorAccount.type === 'business' && post.authorAccount.slug) {
        return `/business/${post.authorAccount.slug}`;
      } else if (post.authorAccount.type === 'user' && post.authorAccount.username) {
        return `/profile/${post.authorAccount.username}`;
      }
    }
    
    if (post?.postedAsBusinessId?.businessSlug) {
      return `/business/${post.postedAsBusinessId.businessSlug}`;
    }
    
    if (post?.authorUserId?.username) {
      return `/profile/${post.authorUserId.username}`;
    }
    
    return null;
  };

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    const profileUrl = getAuthorProfileUrl(post);
    if (profileUrl) {
      navigate(profileUrl);
    }
  };
  
  // Check if user is the author
  const isAuthor = currentUser && (
    currentUser.id?.toString() === post.authorUserId?._id?.toString() ||
    currentUser.id?.toString() === post.authorUserId?.toString() ||
    currentUser._id?.toString() === post.authorUserId?._id?.toString() ||
    currentUser._id?.toString() === post.authorUserId?.toString()
  );
  
  // Check if post belongs to active profile
  const postBusinessId = post.businessId?._id?.toString() || post.businessId?.toString();
  const postProfileUserId = post.profileUserId?._id?.toString() || post.profileUserId?.toString();
  const activeBusinessId = isBusinessProfile ? (activeProfile?.id?.toString()) : null;
  const activeProfileUserId = isUserProfile ? (activeProfile?.id?.toString() || currentUser?.id?.toString() || currentUser?._id?.toString()) : null;
  
  // Can delete if:
  // 1. User is the author (always allowed)
  // 2. Post is on a business profile AND active profile is that business AND isOwnProfile is true
  // 3. Post is on a user profile AND active profile is that user AND isOwnProfile is true
  const canDelete = isAuthor || (
    (postBusinessId && activeBusinessId === postBusinessId && isOwnProfile) ||
    (postProfileUserId && activeProfileUserId === postProfileUserId && isOwnProfile)
  );

  return (
    <div 
      className={`border border-gray-200 rounded-lg p-4 ${onNavigateToPost && !showComments ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
      onClick={(e) => {
        // Only navigate if:
        // 1. onNavigateToPost is provided
        // 2. We're NOT on the post page (showComments=false means we're in feed)
        // 3. Click wasn't on an interactive element
        if (onNavigateToPost && !showComments && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('[data-no-navigate]')) {
          onNavigateToPost(post._id);
        }
      }}
    >
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {getAuthorAvatar(post.authorUserId, post) ? (
            <img
              src={getAuthorAvatar(post.authorUserId, post)}
              alt={getAuthorName(post.authorUserId, post)}
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleAuthorClick}
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleAuthorClick}
            >
              {getAuthorName(post.authorUserId, post).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p 
              className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={handleAuthorClick}
            >
              {getAuthorName(post.authorUserId, post)}
            </p>
            <p className="text-xs text-gray-500">{formatDate(post.createdAt)}</p>
          </div>
        </div>
        {canDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(post._id);
            }}
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

      {/* Post Media (Images and Videos) */}
      <MediaGallery 
        images={post.images || []} 
        videos={post.videos || []} 
        isHorizontal={false}
      />

      {/* Poll */}
      {post.poll && post.poll.options && post.poll.options.length > 0 && (
        <div className="mb-3" data-no-navigate>
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
                  onClick={() => !pollEnded && onVote(post._id, index)}
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
      <div className="flex items-center gap-4 pt-3 border-t border-gray-200" data-no-navigate>
        <ReactionPicker
          onReactionSelect={(reactionType) => onReaction(post._id, reactionType)}
          currentReaction={getCurrentUserReaction(post)}
          className="text-sm"
        />
        <span className="text-sm text-gray-500">({post.likes?.length || 0})</span>
      </div>

      {/* Comment Section - Only show if showComments is true */}
      {showComments && (
        <div className="mt-4 border-t border-gray-200 pt-4" data-no-navigate>
          <CommentSection
            post={post}
            onUpdate={onUpdate}
            onNavigateToComment={onNavigateToComment}
          />
        </div>
      )}
    </div>
  );
}

