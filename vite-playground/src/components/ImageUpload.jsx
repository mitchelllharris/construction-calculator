import React, { useState, useRef, useEffect } from 'react';
import { MdCloudUpload, MdImage, MdClose } from 'react-icons/md';
import { getToken } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

export default function ImageUpload({ value, onChange, onUploadStart, onUploadComplete, onUploadError }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const fileInputRef = useRef(null);

  // Update preview when value changes externally
  useEffect(() => {
    if (value) {
      const imageUrl = value.startsWith('http') 
        ? value 
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${value}`;
      setPreview(imageUrl);
    } else {
      setPreview(null);
    }
  }, [value]);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      if (onUploadError) onUploadError('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      if (onUploadError) onUploadError('Image size must be less than 10MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    if (onUploadStart) onUploadStart();

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
      
      // Update the imageUrl field
      if (onChange) {
        onChange({ target: { value: result.imageUrl } });
      }

      if (onUploadComplete) onUploadComplete(result.imageUrl);
    } catch (error) {
      setPreview(null);
      if (onUploadError) {
        onUploadError(error.message || 'Failed to upload image');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    if (onChange) {
      onChange({ target: { value: '' } });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">Project Image</label>
      
      {preview ? (
        <div className="relative">
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
            title="Remove image"
          >
            <MdClose size={18} />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded px-4 py-2">
                <p className="text-sm font-medium">Uploading...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={uploading}
          />
          
          {uploading ? (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Uploading image...</p>
            </div>
          ) : (
            <>
              <MdCloudUpload className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-sm font-medium text-gray-700 mb-1">
                {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF up to 10MB
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

