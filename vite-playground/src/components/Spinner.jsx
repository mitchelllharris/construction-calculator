import React from 'react';

/**
 * Spinner component for loading states
 * @param {string} size - Size of spinner: 'sm', 'md', 'lg'
 * @param {string} color - Color of spinner: 'primary', 'white', 'gray'
 * @param {string} className - Additional CSS classes
 */
export default function Spinner({ 
  size = 'md', 
  color = 'primary',
  className = '' 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  const colorClasses = {
    primary: 'border-blue-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-400 border-t-transparent',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]} 
        rounded-full 
        animate-spin 
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

