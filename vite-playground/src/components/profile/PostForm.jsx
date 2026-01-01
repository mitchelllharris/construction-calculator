import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  MdClose, MdSend, MdPeople, MdExpandMore, MdExpandLess,
  MdLocationOn, MdPoll, MdTag, MdEmojiEmotions, MdGif, MdPhotoLibrary, MdSearch
} from 'react-icons/md';
import EmojiPicker from 'emoji-picker-react';
import { Grid } from '@giphy/react-components';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { getToken } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import { useProfileSwitcher } from '../../contexts/ProfileSwitcherContext';
import { useAuth } from '../../contexts/AuthContext';
import LocationInput from '../LocationInput';
import Button from '../Button';

export default function PostForm({ pageId, profileUserId, businessId, onPostCreated, isOwnProfile = false, useActiveProfile = false }) {
  const { activeProfile, activeUserId, isUserProfile, isBusinessProfile } = useProfileSwitcher();
  const { user: currentUser } = useAuth();
  
  let finalProfileUserId = null;
  let finalBusinessId = null;
  
  finalProfileUserId = (useActiveProfile && isOwnProfile && isUserProfile) 
    ? activeProfile?.id 
    : (profileUserId || null);
  finalBusinessId = (useActiveProfile && isOwnProfile && isBusinessProfile) 
    ? activeProfile?.id 
    : (businessId || null);
  
  let finalPageId = null;
  
  if (!isOwnProfile) {
    finalPageId = pageId || null;
  } else {
    if (useActiveProfile && activeProfile?.pageId) {
      finalPageId = activeProfile.pageId;
    } else {
      finalPageId = pageId || null;
    }
  }
  
  if (!finalPageId && !finalBusinessId && !finalProfileUserId) {
    if (businessId) {
      finalBusinessId = businessId;
    }
    if (profileUserId) {
      finalProfileUserId = profileUserId;
    }
  }
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replySettings, setReplySettings] = useState('everyone');
  const [showReplySettings, setShowReplySettings] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(1); // days
  const [location, setLocation] = useState(null);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const fileInputRef = useRef(null);
  
  // Initialize GIPHY API
  const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY || '';
  const gf = useMemo(() => {
    return giphyApiKey ? new GiphyFetch(giphyApiKey) : null;
  }, [giphyApiKey]);
  const { showError, showSuccess } = useToast();

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

    // Upload files
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const hasPoll = showPollModal && pollOptions.filter(opt => opt.trim()).length >= 2;
    const hasContent = content.trim() || images.length > 0 || videos.length > 0;
    
    if (!hasContent && !hasPoll) {
      showError('Please add some content, image, video, or create a poll');
      return;
    }

    if (hasPoll && pollOptions.filter(opt => opt.trim()).length < 2) {
      showError('Poll must have at least 2 options');
      return;
    }

    setPosting(true);
    try {
      const token = getToken();
      
      let finalAuthorAccountId = activeUserId;
      if (!finalAuthorAccountId) {
        if (activeProfile?.accountId) {
          finalAuthorAccountId = activeProfile.accountId;
        } else if (currentUser?.accountId) {
          finalAuthorAccountId = currentUser.accountId;
        }
      }
      
      const postData = {
        ...(finalPageId ? { pageId: finalPageId } : {}),
        ...(finalAuthorAccountId ? { authorAccountId: finalAuthorAccountId } : {}),
        ...(finalBusinessId ? { businessId: finalBusinessId } : { profileUserId: finalProfileUserId }),
        content: content.trim() || '',
        images,
        videos,
        replySettings,
        poll: showPollModal && pollOptions.filter(opt => opt.trim()).length >= 2 ? {
          options: pollOptions.filter(opt => opt.trim()),
          duration: pollDuration
        } : null,
        location: location || null,
        taggedUsers: taggedUsers || [],
      };
      
      const response = await fetch(API_ENDPOINTS.POSTS.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create post' }));
        throw new Error(error.message || 'Failed to create post');
      }

      const result = await response.json();
      showSuccess('Post created successfully');
      
      // Reset form
      setContent('');
      setImages([]);
      setVideos([]);
      setReplySettings('everyone');
      setShowPollModal(false);
      setPollOptions(['', '']);
      setPollDuration(1);
      setLocation(null);
      setTaggedUsers([]);
      
      // Notify parent
      if (onPostCreated) {
        onPostCreated(result.post);
      }
    } catch (error) {
      showError(error.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const getImageUrl = (url) => {
    return url.startsWith('http') 
      ? url 
      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${url}`;
  };

  const replySettingsOptions = [
    { value: 'everyone', label: 'Everyone can reply' },
    { value: 'following', label: 'Accounts you follow' },
    { value: 'verified', label: 'Verified accounts' },
    { value: 'mentioned', label: 'Only accounts you mention' },
    { value: 'contacts_only', label: 'Only contacts' },
    { value: 'contacts_of_contacts', label: 'Contacts of contacts' },
    ...(isOwnProfile ? [] : [{ value: 'page_owner', label: 'Only page owner' }]),
  ];

  const getReplySettingsLabel = (value) => {
    const option = replySettingsOptions.find(opt => opt.value === value);
    return option ? option.label : 'Everyone can reply';
  };

  const insertEmoji = (emojiData) => {
    const emoji = emojiData.emoji || emojiData;
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
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
    // GIPHY returns GIF object with images property
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


  return (
    <div className="bg-white shadow rounded-lg p-4">
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
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
                disabled={uploading || posting}
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
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              title="Add location"
            >
              <MdLocationOn size={20} />
              <span className="text-sm">Location</span>
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
          <div className="flex items-center gap-2">
            {/* Reply Settings */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReplySettings(!showReplySettings)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-gray-100"
              >
                <MdPeople size={16} />
                <span>{getReplySettingsLabel(replySettings)}</span>
                {showReplySettings ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
              </button>
              
              {showReplySettings && (
                <>
                  <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowReplySettings(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[220px]">
                    {replySettingsOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setReplySettings(option.value);
                          setShowReplySettings(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                          replySettings === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        } ${option.value === replySettingsOptions[0].value ? 'rounded-t-lg' : ''} ${
                          option.value === replySettingsOptions[replySettingsOptions.length - 1].value ? 'rounded-b-lg' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              type="submit"
              disabled={posting || uploading || (!content.trim() && images.length === 0 && videos.length === 0 && !(showPollModal && pollOptions.filter(opt => opt.trim()).length >= 2))}
              text={posting ? 'Posting...' : 'Post'}
              icon={<MdSend size={18} />}
            />
          </div>
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

        {/* Location Modal */}
        {showLocationModal && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Add Location</h3>
              <button
                type="button"
                onClick={() => {
                  setShowLocationModal(false);
                  setLocation(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <MdClose size={20} />
              </button>
            </div>
            <div className="space-y-2">
              <LocationInput
                value={location}
                onChange={setLocation}
                placeholder="Search for a location..."
                format="full"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {location && (
                <div className="p-2 bg-white rounded border border-gray-200">
                  <p className="text-sm text-gray-700">{location.formattedAddress || location.name}</p>
                </div>
              )}
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
      </form>
    </div>
  );
}

