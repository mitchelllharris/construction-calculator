import React, { useState } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

export default function MediaGallery({ images = [], videos = [], isHorizontal = false }) {
  // Combine images and videos into a single media array
  const media = [
    ...images.map(url => ({ type: 'image', url })),
    ...videos.map(url => ({ type: 'video', url }))
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  if (media.length === 0) return null;

  const getImageUrl = (url) => {
    return url.startsWith('http') 
      ? url 
      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${url}`;
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // 1 item: 1x1 grid
  if (media.length === 1) {
    const item = media[0];
    return (
      <div className="mb-3">
        {item.type === 'image' ? (
          <img
            src={getImageUrl(item.url)}
            alt="Post media"
            className={`w-full rounded-lg object-cover ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
          />
        ) : (
          <video
            src={getImageUrl(item.url)}
            controls
            className={`w-full rounded-lg ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
          />
        )}
      </div>
    );
  }

  // 2 items: 2x1 grid (side by side)
  if (media.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 mb-3">
        {media.map((item, index) => (
          <div key={index}>
            {item.type === 'image' ? (
              <img
                src={getImageUrl(item.url)}
                alt={`Post media ${index + 1}`}
                className={`w-full rounded-lg object-cover ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
              />
            ) : (
              <video
                src={getImageUrl(item.url)}
                controls
                className={`w-full rounded-lg ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // 4 items: 2x2 grid
  if (media.length === 4) {
    return (
      <div className="grid grid-cols-2 gap-2 mb-3">
        {media.map((item, index) => (
          <div key={index}>
            {item.type === 'image' ? (
              <img
                src={getImageUrl(item.url)}
                alt={`Post media ${index + 1}`}
                className={`w-full rounded-lg object-cover ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
              />
            ) : (
              <video
                src={getImageUrl(item.url)}
                controls
                className={`w-full rounded-lg ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // 3 or 5+ items: Slider
  return (
    <div className="relative mb-3">
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {media.map((item, index) => (
            <div key={index} className="w-full shrink-0">
              {item.type === 'image' ? (
                <img
                  src={getImageUrl(item.url)}
                  alt={`Post media ${index + 1}`}
                  className={`w-full rounded-lg object-cover ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
                />
              ) : (
                <video
                  src={getImageUrl(item.url)}
                  controls
                  className={`w-full rounded-lg ${isHorizontal ? 'max-h-48' : 'max-h-96'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-1 transition-all"
              aria-label="Previous"
            >
              <MdChevronLeft size={24} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-1 transition-all"
              aria-label="Next"
            >
              <MdChevronRight size={24} />
            </button>
          </>
        )}

        {/* Dots indicator */}
        {media.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {media.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

