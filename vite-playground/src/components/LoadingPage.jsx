import React from 'react';
import Spinner from './Spinner';

/**
 * Full page loading component
 * @param {string} message - Loading message to display
 */
export default function LoadingPage({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}

