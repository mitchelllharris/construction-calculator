import React from 'react';
import Spinner from './Spinner';

/**
 * Loading overlay component for blocking UI during operations
 * @param {boolean} isLoading - Whether to show the overlay
 * @param {string} message - Loading message
 */
export default function LoadingOverlay({ isLoading, message = 'Loading...' }) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
}

