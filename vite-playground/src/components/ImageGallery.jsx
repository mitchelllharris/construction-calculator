import React, { useState, useRef } from 'react';
import { MdCloudUpload, MdImage, MdClose, MdDelete } from 'react-icons/md';
import { getToken } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';

export default function ImageGallery({ images = [], onChange, maxSizeMB = 5 }) {
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const fileInputRef = useRef(null);
  const { showError, showSuccess } = useToast();

  const handleFileSelect = async (files) => {
    const fileArray = Array.from(files);
    
    // Validate all files
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        showError('Please select only image files');
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        showError(`Image size must be less than ${maxSizeMB}MB: ${file.name}`);
        return;
      }
    }

    // Upload files one by one
    const newImages = [...images];
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploading(true);
      setUploadingIndex(i);

      try {
        const token = getToken();
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(API_ENDPOINTS.USER.UPLOAD_PORTFOLIO_IMAGE, {
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
        newImages.push(result.imageUrl);
      } catch (error) {
        showError(error.message || `Failed to upload ${file.name}`);
        setUploading(false);
        setUploadingIndex(null);
        return;
      }
    }

    setUploading(false);
    setUploadingIndex(null);
    onChange(newImages);
    showSuccess(`Successfully uploaded ${fileArray.length} image(s)`);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  return (
    <div className="w-full">
      
      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {images.map((imageUrl, index) => {
            const fullUrl = imageUrl.startsWith('http') 
              ? imageUrl 
              : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${imageUrl}`;
            
            return (
              <div key={index} className="relative group">
                <div className="aspect-square border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={fullUrl}
                    alt={`Project image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove image"
                >
                  <MdClose size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          uploading
            ? 'border-blue-500 bg-blue-50 opacity-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploading}
        />
        
        {uploading ? (
          <div>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Uploading image{uploadingIndex !== null ? ` ${uploadingIndex + 1}` : ''}...</p>
          </div>
        ) : (
          <>
            <MdCloudUpload className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-sm font-medium text-gray-700 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF up to {maxSizeMB}MB each (multiple images allowed)
            </p>
          </>
        )}
      </div>
    </div>
  );
}

