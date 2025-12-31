import React, { useState, useEffect, useCallback } from 'react';
import { MdClose, MdChevronLeft, MdChevronRight } from 'react-icons/md';

export default function PhotoGalleryModal({ isOpen, onClose, images = [], initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const getImageUrl = (imageUrl) => {
    return imageUrl.startsWith('http') 
      ? imageUrl 
      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${imageUrl}`;
  };

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const fullUrl = getImageUrl(currentImage.url);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
        aria-label="Close gallery"
      >
        <MdClose size={24} />
      </button>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={goToPrevious}
          className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-3"
          aria-label="Previous image"
        >
          <MdChevronLeft size={32} />
        </button>
      )}

      {/* Media Container */}
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
        {currentImage.isVideo ? (
          <video
            src={fullUrl}
            controls
            className="max-w-full max-h-full"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={fullUrl}
            alt={`Photo ${currentIndex + 1} of ${images.length}`}
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-3"
          aria-label="Next image"
        >
          <MdChevronRight size={32} />
        </button>
      )}

      {/* Image Info */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
        {/* Image Counter */}
        {images.length > 1 && (
          <div className="text-white bg-black bg-opacity-50 rounded-full px-4 py-2 text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
        
        {/* Upload Info */}
        {currentImage.uploadedByUser && (
          <div className="text-white bg-black bg-opacity-50 rounded-full px-4 py-2 text-sm">
            by {currentImage.uploadedByUser.username || currentImage.uploadedByUser.firstName || 'User'}
          </div>
        )}
        {currentImage.uploadedBy === 'owner' && !currentImage.uploadedByUser && (
          <div className="text-white bg-black bg-opacity-50 rounded-full px-4 py-2 text-sm">
            by owner
          </div>
        )}
      </div>

      {/* Thumbnail Strip (optional, can be added later) */}
    </div>
  );
}

