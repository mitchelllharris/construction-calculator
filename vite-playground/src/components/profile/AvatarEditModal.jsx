import React, { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { MdClose, MdCamera, MdCheck } from 'react-icons/md';
import Button from '../Button';
import { useToast } from '../../contexts/ToastContext';
import { getToken } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';

export default function AvatarEditModal({ isOpen, onClose, currentAvatar, onSave }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [isDataUrl, setIsDataUrl] = useState(false); // Track if image is from FileReader (data URL)
  const [crop, setCrop] = useState({ unit: '%', width: 90, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const { showError, showSuccess } = useToast();

  // Initialize with current avatar if available
  React.useEffect(() => {
    if (isOpen) {
      if (currentAvatar) {
        const fullUrl = currentAvatar.startsWith('http') 
          ? currentAvatar 
          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${currentAvatar}`;
        setImageSrc(fullUrl);
        setIsDataUrl(false); // URL-based image, not a data URL
        // Reset crop - will be set properly when image loads via onImageLoaded
        setCrop(null);
        setCompletedCrop(null);
      } else {
        // No current avatar, reset everything
        setImageSrc(null);
        setIsDataUrl(false);
        setCrop(null);
        setCompletedCrop(null);
      }
    } else {
      // Reset when modal closes
      setImageSrc(null);
      setIsDataUrl(false);
      setCrop(null);
      setCompletedCrop(null);
    }
  }, [isOpen, currentAvatar]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result);
      setIsDataUrl(true); // This is a data URL from FileReader, no CORS needed
      // Reset crop when new image is loaded - will be set properly when image loads via onImageLoaded
      setCrop(null);
      setCompletedCrop(null);
      // Clear the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
    reader.readAsDataURL(file);
  };

  const onImageLoaded = useCallback((img) => {
    imgRef.current = img;
    // Set initial crop to center of image (always use pixels for initial crop)
    const cropSize = Math.min(img.width, img.height) * 0.9;
    const initialCrop = {
      unit: 'px',
      width: cropSize,
      height: cropSize,
      x: (img.width - cropSize) / 2,
      y: (img.height - cropSize) / 2,
    };
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  }, []);

  const getCroppedImg = (image, crop) => {
    // Validate image is loaded
    if (!image || !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error('Image is not fully loaded');
    }
    
    // Check if image is from a data URL (no CORS issues) or if it's from same origin
    // If it's a URL and not a data URL, we need to ensure CORS is properly set
    const isDataUrl = image.src && image.src.startsWith('data:');
    
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Handle both percentage and pixel-based crops
    let cropX, cropY, cropWidth, cropHeight;
    if (crop.unit === '%') {
      // Convert percentage to pixels based on displayed image size
      cropWidth = (crop.width / 100) * image.width;
      cropHeight = (crop.height / 100) * image.height;
      cropX = ((crop.x || 0) / 100) * image.width;
      cropY = ((crop.y || 0) / 100) * image.height;
    } else {
      // Pixel-based crop
      cropWidth = crop.width;
      cropHeight = crop.height;
      cropX = crop.x || 0;
      cropY = crop.y || 0;
    }
    
    // Scale to natural image size
    const scaledWidth = cropWidth * scaleX;
    const scaledHeight = cropHeight * scaleY;
    const scaledX = cropX * scaleX;
    const scaledY = cropY * scaleY;
    
    // Ensure minimum dimensions
    if (scaledWidth <= 0 || scaledHeight <= 0) {
      throw new Error('Invalid crop dimensions');
    }
    
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    const ctx = canvas.getContext('2d');

    // Ensure we have a valid 2d context
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    try {
      ctx.drawImage(
        image,
        scaledX,
        scaledY,
        scaledWidth,
        scaledHeight,
        0,
        0,
        scaledWidth,
        scaledHeight
      );
    } catch (error) {
      // If drawImage fails, it's likely a CORS/tainted canvas issue
      if (error.message && error.message.includes('tainted')) {
        reject(new Error('Image cannot be processed due to CORS restrictions. Please upload a new image instead of using an existing one from the server.'));
      } else {
        reject(new Error(`Failed to draw image: ${error.message}`));
      }
      return;
    }

    // Test if canvas is tainted by trying to read a pixel
    try {
      ctx.getImageData(0, 0, 1, 1);
    } catch (error) {
      reject(new Error('Image cannot be exported due to CORS restrictions. Please upload a new image instead of using an existing one from the server.'));
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Check if toBlob is supported
        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback to toDataURL if toBlob returns null
                try {
                  const dataURL = canvas.toDataURL('image/jpeg', 0.95);
                  const byteString = atob(dataURL.split(',')[1]);
                  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
                  const ab = new ArrayBuffer(byteString.length);
                  const ia = new Uint8Array(ab);
                  for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                  }
                  const blob = new Blob([ab], { type: mimeString });
                  resolve(blob);
                } catch (fallbackError) {
                  reject(new Error('Failed to create image blob'));
                }
                return;
              }
              resolve(blob);
            },
            'image/jpeg',
            0.95
          );
        } else {
          // Fallback for browsers that don't support toBlob
          try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.95);
            const byteString = atob(dataURL.split(',')[1]);
            const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            resolve(blob);
          } catch (fallbackError) {
            reject(new Error(`Failed to convert canvas to blob: ${fallbackError.message}`));
          }
        }
      } catch (error) {
        reject(new Error(`Failed to process image: ${error.message}`));
      }
    });
  };

  const handleSave = async () => {
    if (!imgRef.current) {
      showError('No image loaded');
      return;
    }

    // Check if image is fully loaded
    if (!imgRef.current.complete || imgRef.current.naturalWidth === 0) {
      showError('Image is still loading. Please wait.');
      return;
    }

    // Use completedCrop if available, otherwise use current crop
    const cropToUse = completedCrop || crop;
    
    if (!cropToUse || !cropToUse.width || !cropToUse.height) {
      showError('Please select an area to crop');
      return;
    }

    setUploading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, cropToUse);
      
      // Create FormData and upload
      const formData = new FormData();
      formData.append('avatar', croppedImageBlob, 'avatar.jpg');

      const token = getToken();
      if (!token) {
        showError('You must be logged in to upload an avatar');
        return;
      }

      const response = await fetch(API_ENDPOINTS.USER.UPLOAD_AVATAR, {
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
      showSuccess('Profile image updated successfully');
      onSave(result.avatar);
      onClose();
    } catch (error) {
      showError(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop(null);
    setCompletedCrop(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Profile Image</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>
        
        <div className="p-6">
          {!imageSrc ? (
            <div className="text-center py-12">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mb-4">
                <MdCamera size={64} className="mx-auto text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">No image selected</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                text="Select Image"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                {imageSrc && (
                  <>
                    {crop && crop.width && crop.height ? (
                      <ReactCrop
                        crop={crop}
                        onChange={(newCrop) => {
                          if (newCrop && newCrop.width && newCrop.height) {
                            setCrop(newCrop);
                            // Also update completedCrop when crop changes
                            setCompletedCrop(newCrop);
                          }
                        }}
                        onComplete={(c) => {
                          if (c && c.width && c.height) {
                            setCompletedCrop(c);
                          }
                        }}
                        aspect={1}
                        minWidth={100}
                        minHeight={100}
                      >
                        <img
                          ref={imgRef}
                          src={imageSrc}
                          alt="Crop preview"
                          crossOrigin={!isDataUrl ? "anonymous" : undefined}
                          onLoad={(e) => {
                            if (!crop || !crop.width) {
                              onImageLoaded(e.currentTarget);
                            }
                          }}
                          onError={(e) => {
                            // If CORS fails, try without crossOrigin
                            if (!isDataUrl && e.currentTarget.crossOrigin) {
                              e.currentTarget.crossOrigin = undefined;
                              e.currentTarget.src = imageSrc;
                            } else {
                              showError('Failed to load image');
                            }
                          }}
                          style={{ maxWidth: '100%', maxHeight: '400px' }}
                        />
                      </ReactCrop>
                    ) : (
                      <div className="relative">
                        <img
                          ref={imgRef}
                          src={imageSrc}
                          alt="Crop preview"
                          crossOrigin={!isDataUrl ? "anonymous" : undefined}
                          onLoad={(e) => onImageLoaded(e.currentTarget)}
                          onError={(e) => {
                            // If CORS fails, try without crossOrigin
                            if (!isDataUrl && e.currentTarget.crossOrigin) {
                              e.currentTarget.crossOrigin = undefined;
                              e.currentTarget.src = imageSrc;
                            } else {
                              showError('Failed to load image');
                            }
                          }}
                          style={{ maxWidth: '100%', maxHeight: '400px', display: 'block' }}
                        />
                        {(!crop || !crop.width) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                            <p className="text-gray-500">Loading crop area...</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="flex gap-3 justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  text="Change Image"
                  className="bg-gray-500 hover:bg-gray-600"
                />
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            Cancel
          </button>
          {imageSrc && (
            <Button
              onClick={handleSave}
              disabled={uploading || !crop || !crop.width || !crop.height}
              text={uploading ? 'Uploading...' : 'Save'}
              className="flex items-center gap-2"
            >
              {!uploading && <MdCheck size={18} />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

