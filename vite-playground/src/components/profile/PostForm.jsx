import React, { useState, useRef } from 'react';
import { MdImage, MdVideoLibrary, MdClose, MdSend } from 'react-icons/md';
import { getToken } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import Button from '../Button';

export default function PostForm({ profileUserId, onPostCreated }) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);
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
    
    if (!content.trim() && images.length === 0 && videos.length === 0) {
      showError('Please add some content, image, or video');
      return;
    }

    setPosting(true);
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.POSTS.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify({
          profileUserId,
          content: content.trim() || '', // Send empty string if no content
          images,
          videos,
        }),
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
                <MdImage size={20} />
                <span className="text-sm">Photo</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={uploading || posting}
              />
              <div className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                <MdVideoLibrary size={20} />
                <span className="text-sm">Video</span>
              </div>
            </label>
            {uploading && (
              <span className="text-sm text-gray-500">Uploading...</span>
            )}
          </div>
          <Button
            type="submit"
            disabled={posting || uploading || (!content.trim() && images.length === 0 && videos.length === 0)}
            text={posting ? 'Posting...' : 'Post'}
            icon={<MdSend size={18} />}
          />
        </div>
      </form>
    </div>
  );
}

