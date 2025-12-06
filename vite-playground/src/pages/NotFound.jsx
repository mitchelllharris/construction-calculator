import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or the URL might be incorrect.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            What would you like to do?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-sm transition-colors"
            >
              Go Back
            </button>
            <Link
              to="/"
              className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-sm transition-colors inline-block"
            >
              Go to Homepage
            </Link>
          </div>
        </div>

        <div className="text-left bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Popular Pages
          </h3>
          <ul className="space-y-2">
            <li>
              <Link
                to="/"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                → Home
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                → About
              </Link>
            </li>
            <li>
              <Link
                to="/pricing"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                → Pricing
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                → Contact
              </Link>
            </li>
            <li>
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                → Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

