import React from 'react';

/**
 * Skeleton loader for card components
 * @param {number} lines - Number of text lines to show
 * @param {boolean} showAvatar - Show avatar placeholder
 * @param {string} className - Additional CSS classes
 */
export default function SkeletonCard({ 
  lines = 2, 
  showAvatar = false,
  className = '' 
}) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow animate-pulse ${className}`}>
      {showAvatar && (
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`h-4 bg-gray-200 rounded ${
              index === lines - 1 ? 'w-5/6' : 'w-full'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}

