import React from 'react';
import { MdImage } from 'react-icons/md';

export default function PhotosGallery({ allImages = [], onImageClick }) {
  // Get the 4 most recent images (already sorted by date, most recent first)
  const recentImages = allImages.slice(0, 4);

  if (recentImages.length === 0) {
    return null; // Don't show if no images
  }

  const getImageUrl = (imageUrl) => {
    return imageUrl.startsWith('http') 
      ? imageUrl 
      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${imageUrl}`;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MdImage size={20} />
          Photos
        </h3>
        {allImages.length > 4 && (
          <button
            onClick={() => onImageClick(0)} // Open gallery at first image (index 0)
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            View all
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {recentImages.map((image, index) => {
          const fullUrl = getImageUrl(image.url);
          return (
            <div
              key={index}
              className="aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick(index)}
            >
              <img
                src={fullUrl}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

