import React, { useState, useRef, useCallback, useMemo } from 'react';
import { getToken } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import ReactionPicker from './ReactionPicker';
import { MdArrowBack, MdShare, MdBookmarkBorder, MdReply, MdClose, MdPhotoLibrary, MdEmojiEmotions, MdGif, MdSend, MdTag, MdPoll, MdSearch } from 'react-icons/md';
import EmojiPicker from 'emoji-picker-react';
import { Grid } from '@giphy/react-components';
import { GiphyFetch } from '@giphy/js-fetch-api';

export default function CommentSection({ post, onUpdate, onNavigateToComment }) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(1);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const fileInputRef = useRef(null);
  const { user: currentUser } = useAuth();
  const { showError, showSuccess } = useToast();

  // Initialize GIPHY API
  const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY || '';
  const gf = useMemo(() => {
    return giphyApiKey ? new GiphyFetch(giphyApiKey) : null;
  }, [giphyApiKey]);

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

  const getCurrentUserReaction = (likes) => {
    if (!currentUser || !likes) return null;
    const currentUserId = currentUser.id?.toString() || currentUser._id?.toString();
    const reaction = likes.find(r => {
      const reactionUserId = r.userId?._id?.toString() || r.userId?.toString();
      return reactionUserId === currentUserId;
    });
    return reaction?.reactionType || null;
  };

  const handleFileSelect = async (files) => {
    const fileArray = Array.from(files);
    const newImages = [];
    const newVideos = [];

    // Validate files
    for (const file of fileArray) {
      if (file.type.startsWith('image/')) {
        if (file.size > 10 * 1024 * 1024) {
          showError(`Image ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }
        newImages.push(file);
      } else if (file.type.startsWith('video/')) {
        if (file.size > 50 * 1024 * 1024) {
          showError(`Video ${file.name} is too large. Maximum size is 50MB.`);
          continue;
        }
        newVideos.push(file);
      } else {
        showError(`${file.name} is not a valid image or video file.`);
      }
    }

    if (newImages.length === 0 && newVideos.length === 0) return;

    setUploading(true);
    try {
      const token = getToken();
      const formData = new FormData();
      
      [...newImages, ...newVideos].forEach(file => {
        formData.append('media', file);
      });

      const response = await fetch(API_ENDPOINTS.POSTS.UPLOAD_MEDIA, {
        method: 'POST',
        headers: {
          'x-access-token': token,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      
      setImages(prev => [...prev, ...result.images]);
      setVideos(prev => [...prev, ...result.videos]);
      showSuccess('Media uploaded successfully');
    } catch (error) {
      showError(error.message || 'Failed to upload media');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = (index) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emojiData) => {
    const emoji = emojiData.emoji || emojiData;
    setNewComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getImageUrl = (url) => {
    return url.startsWith('http') 
      ? url 
      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${url}`;
  };

  // GIPHY fetch functions
  const fetchTrendingGifs = useCallback((offset) => {
    if (!gf) return Promise.resolve({ data: [] });
    return gf.trending({ offset, limit: 20 });
  }, [gf]);

  const fetchSearchGifs = useCallback((offset) => {
    if (!gf || !gifSearchTerm.trim()) return fetchTrendingGifs(offset);
    return gf.search(gifSearchTerm, { offset, limit: 20 });
  }, [gf, gifSearchTerm, fetchTrendingGifs]);

  const handleGifSelect = (gif, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const gifUrl = gif.images?.original?.url || gif.images?.downsized_large?.url || gif.images?.fixed_height?.url;
    if (gifUrl) {
      setImages(prev => [...prev, gifUrl]);
      setShowGifPicker(false);
      setGifSearchTerm('');
      showSuccess('GIF added');
    } else {
      showError('Failed to get GIF URL');
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleAddComment = async () => {
    const hasPoll = showPollModal && pollOptions.filter(opt => opt.trim()).length >= 2;
    const hasContent = newComment.trim() || images.length > 0 || videos.length > 0;
    
    if (!hasContent && !hasPoll) {
      showError('Please add some content, image, video, or create a poll');
      return;
    }

    if (showPollModal && pollOptions.filter(opt => opt.trim()).length < 2) {
      showError('Poll must have at least 2 options');
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        showError('Please log in to comment');
        return;
      }

      const response = await fetch(API_ENDPOINTS.POSTS.ADD_COMMENT(post._id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify({ 
          content: newComment.trim(),
          images,
          videos,
          poll: showPollModal && pollOptions.filter(opt => opt.trim()).length >= 2 ? {
            options: pollOptions.filter(opt => opt.trim()),
            duration: pollDuration
          } : null,
          taggedUsers: taggedUsers || []
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to add comment' }));
        throw new Error(error.message || 'Failed to add comment');
      }

      const data = await response.json();
      setNewComment('');
      setImages([]);
      setVideos([]);
      setShowPollModal(false);
      setPollOptions(['', '']);
      setPollDuration(1);
      setTaggedUsers([]);
      if (onUpdate) onUpdate(data.post);
      showSuccess('Comment added');
    } catch (error) {
      showError(error.message || 'Failed to add comment');
    }
  };

  const handleAddReply = async (parentCommentId) => {
    if (!replyContent.trim()) return;

    try {
      const token = getToken();
      if (!token) {
        showError('Please log in to reply');
        return;
      }

      const response = await fetch(API_ENDPOINTS.POSTS.ADD_REPLY(post._id, parentCommentId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify({ 
          content: replyContent.trim()
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to add reply' }));
        throw new Error(error.message || 'Failed to add reply');
      }

      const data = await response.json();
      setReplyContent('');
      setReplyingTo(null);
      if (onUpdate) onUpdate(data.post);
      showSuccess('Reply added');
    } catch (error) {
      showError(error.message || 'Failed to add reply');
    }
  };

  const handleReactToComment = async (commentId, reactionType) => {
    try {
      const token = getToken();
      if (!token) {
        showError('Please log in to react');
        return;
      }

      // Optimistic update - create deep copy to avoid mutation issues
      const updateCommentReaction = (comments, targetId) => {
        return comments.map(comment => {
          if (comment._id?.toString() === targetId) {
            const currentUserId = currentUser?.id?.toString() || currentUser?._id?.toString();
            const updatedLikes = [...(comment.likes || [])];
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
            return {
              ...comment,
              likes: updatedLikes
            };
          }
          // Recursively update replies
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentReaction(comment.replies, targetId)
            };
          }
          return comment;
        });
      };

      // Optimistically update - create new post object with updated comments
      if (post.comments && post.comments.length > 0) {
        const updatedComments = updateCommentReaction(post.comments, commentId);
        const updatedPost = {
          ...post,
          comments: updatedComments
        };
        if (onUpdate) onUpdate(updatedPost);
      }

      const response = await fetch(API_ENDPOINTS.POSTS.REACT_TO_COMMENT(commentId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify({ reactionType }),
      });

      if (!response.ok) {
        // Revert on error
        if (onUpdate) {
          const threadResponse = await fetch(API_ENDPOINTS.POSTS.GET_THREAD(post._id), {
            headers: {
              'x-access-token': token,
            },
          });
          if (threadResponse.ok) {
            const threadData = await threadResponse.json();
            if (onUpdate) onUpdate(threadData.post);
          }
        }
        const error = await response.json().catch(() => ({ message: 'Failed to react' }));
        throw new Error(error.message || 'Failed to react');
      }

      // Update with server response - fetch full thread to get updated comment with reactions
      const threadResponse = await fetch(API_ENDPOINTS.POSTS.GET_THREAD(post._id), {
        headers: {
          'x-access-token': token,
        },
      });
      if (threadResponse.ok) {
        const threadData = await threadResponse.json();
        if (onUpdate) onUpdate(threadData.post);
      } else {
        // Fallback to just the response data
      const data = await response.json();
      if (onUpdate) onUpdate(data.post);
      }
    } catch (error) {
      showError(error.message || 'Failed to react');
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

  const getReplyCount = (replies) => {
    if (!replies || replies.length === 0) return 0;
    let count = replies.length;
    replies.forEach(reply => {
      if (reply.replies && reply.replies.length > 0) {
        count += getReplyCount(reply.replies);
      }
    });
    return count;
  };

  const handleNavigateToComment = (commentId) => {
    if (onNavigateToComment) {
      onNavigateToComment({ type: 'comment', commentId, postId: post._id });
    }
  };


  const renderCommentItem = (item) => {
    const reactions = item.likes || [];
    const currentReaction = getCurrentUserReaction(reactions);
    const replyCount = getReplyCount(item.replies);
    const isReplying = replyingTo?.commentId === item._id?.toString();

    return (
      <div 
        key={item._id}
        className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={(e) => {
          if (e.target.closest('button') || e.target.closest('input')) return;
          handleNavigateToComment(item._id);
        }}
      >
        <div className="p-4">
          <div className="flex gap-3">
            {getAuthorAvatar(item.userId) ? (
                  <img
                src={getAuthorAvatar(item.userId)}
                alt={getAuthorName(item.userId)}
                className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                {getAuthorName(item.userId).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-gray-900">{getAuthorName(item.authorUserId || item.userId)}</p>
                <p className="text-sm text-gray-500">@{(item.authorUserId || item.userId)?.username || 'user'}</p>
                <span className="text-gray-500">·</span>
                <p className="text-sm text-gray-500">{formatDate(item.createdAt || item.commentedAt || item.repliedAt)}</p>
                    </div>
              <p className="text-gray-900 mb-3 whitespace-pre-wrap wrap-break-word">{item.content}</p>
              
              <div className="flex items-center gap-6 text-gray-500">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyingTo({ commentId: item._id?.toString() });
                  }}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  <MdReply size={18} />
                  <span className="text-sm">{replyCount || ''}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="flex items-center gap-2 hover:text-green-600 transition-colors"
                >
                  <MdShare size={18} />
                  <span className="text-sm">0</span>
                </button>
                <div className="flex items-center gap-2">
                    <ReactionPicker
                    onReactionSelect={(reactionType) => {
                      handleReactToComment(item._id, reactionType);
                    }}
                      currentReaction={currentReaction}
                    className="text-sm"
                    />
                  <span className="text-sm">{reactions.length || ''}</span>
                </div>
                      <button
                  onClick={(e) => {
                    e.stopPropagation();
                        }}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      >
                  <MdBookmarkBorder size={18} />
                      </button>
                  </div>

              {isReplying && (
                <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                    placeholder="Post your reply"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                        handleAddReply(item._id);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                      setReplyContent('');
                        }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-full"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
      </div>
    );
  };


  return (
    <div className="border-t border-gray-200">
      {/* Comment Input - Matching PostForm Style */}
      <div className="bg-white shadow rounded-lg p-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="What's on your mind?"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        
        {/* Preview Images */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {images.map((imageUrl, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-200">
          <img
                  src={getImageUrl(imageUrl)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
          />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <MdClose size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Preview Videos */}
        {videos.length > 0 && (
          <div className="space-y-2 mt-3">
            {videos.map((videoUrl, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden bg-gray-200">
                <video
                  src={getImageUrl(videoUrl)}
                  controls
                  className="w-full max-h-64"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveVideo(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <MdClose size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
          <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                <MdPhotoLibrary size={20} />
                <span className="text-sm">Media</span>
              </div>
            </label>
            <button
              type="button"
              onClick={() => setShowTagModal(true)}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              title="Tag people"
            >
              <MdTag size={20} />
              <span className="text-sm">Tag</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPollModal(true)}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              title="Create poll"
            >
              <MdPoll size={20} />
              <span className="text-sm">Poll</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGifPicker(true)}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              title="Add GIF"
            >
              <MdGif size={20} />
              <span className="text-sm">GIF</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              title="Add emoji"
            >
              <MdEmojiEmotions size={20} />
              <span className="text-sm">Emoji</span>
            </button>
            {uploading && (
              <span className="text-sm text-gray-500">Uploading...</span>
            )}
        </div>
        <button
            type="button"
          onClick={handleAddComment}
            disabled={uploading || (!newComment.trim() && images.length === 0 && videos.length === 0 && !(showPollModal && pollOptions.filter(opt => opt.trim()).length >= 2))}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
        >
            <MdSend size={18} />
            <span>Post</span>
        </button>
      </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mt-2 relative">
            <div className="absolute bottom-full left-0 mb-2 z-20">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <EmojiPicker
                  onEmojiClick={(emojiData) => insertEmoji(emojiData)}
                  width={350}
                  height={400}
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                />
              </div>
            </div>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowEmojiPicker(false)}
            />
                    </div>
                  )}

        {/* Poll Modal */}
        {showPollModal && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Create Poll</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPollModal(false);
                  setPollOptions(['', '']);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <MdClose size={20} />
              </button>
                    </div>
            <div className="space-y-2 mb-3">
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handlePollOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {pollOptions.length > 2 && (
                      <button
                      type="button"
                      onClick={() => handleRemovePollOption(index)}
                      className="text-red-500 hover:text-red-700"
                      >
                      <MdClose size={20} />
                      </button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 4 && (
                        <button
                type="button"
                onClick={handleAddPollOption}
                className="text-sm text-blue-600 hover:text-blue-800 mb-3"
                        >
                + Add option
                        </button>
                      )}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Duration:</label>
              <select
                value={pollDuration}
                onChange={(e) => setPollDuration(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
              </select>
            </div>
          </div>
        )}

        {/* Tag Modal */}
        {showTagModal && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Tag People</h3>
              <button
                type="button"
                onClick={() => {
                  setShowTagModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <MdClose size={20} />
              </button>
                    </div>
                        <input
                          type="text"
              placeholder="Search for people to tag..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <p className="text-xs text-gray-500">Tag people feature coming soon</p>
          </div>
        )}

        {/* GIF Picker */}
        {showGifPicker && (
          <div className="mt-3 relative">
            <div className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Add GIF</h3>
                        <button
                  type="button"
                          onClick={() => {
                    setShowGifPicker(false);
                    setGifSearchTerm('');
                          }}
                  className="text-gray-400 hover:text-gray-600"
                        >
                  <MdClose size={20} />
                        </button>
                      </div>
              {!giphyApiKey ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="mb-2">GIPHY API key not configured</p>
                  <p className="text-sm">Please add VITE_GIPHY_API_KEY to your .env file</p>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b border-gray-200">
                    <div className="relative">
                      <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Search GIFs..."
                        value={gifSearchTerm}
                        onChange={(e) => setGifSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2">
                    <Grid
                      width={400}
                      columns={2}
                      fetchGifs={gifSearchTerm.trim() ? fetchSearchGifs : fetchTrendingGifs}
                      onGifClick={handleGifSelect}
                      key={gifSearchTerm}
                      noLink={true}
                    />
                  </div>
                  <div className="p-2 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500">
                      Powered by <span className="font-semibold">GIPHY</span>
                    </p>
                  </div>
                </>
              )}
                </div>
              </div>
        )}
      </div>

      {/* Comments List */}
      {post.comments && post.comments.length > 0 ? (
        <div>
          {post.comments.map((comment) => (
            <div key={comment._id}>
              {renderCommentItem(comment)}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          No comments yet
        </div>
      )}
    </div>
  );
}
