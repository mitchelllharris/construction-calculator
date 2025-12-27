import React, { useState, useEffect } from 'react';
import { MdVisibility, MdTrendingUp, MdPeople, MdCalendarToday } from 'react-icons/md';
import { get } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
);

export default function AnalyticsSection({ profileId, isOwnProfile }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, all

  useEffect(() => {
    if (isOwnProfile && profileId) {
      fetchAnalytics();
    }
  }, [profileId, timeRange, isOwnProfile]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await get(API_ENDPOINTS.PROFILE.ANALYTICS(profileId, timeRange));
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOwnProfile) {
    return null;
  }

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-6 relative border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">Analytics</h2>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
            <MdVisibility size={14} />
            Only visible to you
          </span>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {timeRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Page Views */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <MdTrendingUp className="text-blue-600" size={20} />
              <h3 className="text-sm font-medium text-gray-600">Page Views</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.pageViews || 0}</p>
            {analytics.pageViewsChange !== undefined && (
              <p className={`text-xs mt-1 ${analytics.pageViewsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.pageViewsChange >= 0 ? '+' : ''}{analytics.pageViewsChange}% from previous period
              </p>
            )}
          </div>

          {/* Unique Visitors */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <MdPeople className="text-blue-600" size={20} />
              <h3 className="text-sm font-medium text-gray-600">Unique Visitors</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.uniqueVisitors || 0}</p>
            {analytics.uniqueVisitorsChange !== undefined && (
              <p className={`text-xs mt-1 ${analytics.uniqueVisitorsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.uniqueVisitorsChange >= 0 ? '+' : ''}{analytics.uniqueVisitorsChange}% from previous period
              </p>
            )}
          </div>

          {/* Profile Interactions */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <MdCalendarToday className="text-blue-600" size={20} />
              <h3 className="text-sm font-medium text-gray-600">Interactions</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.interactions || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Calls, emails, etc.</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No analytics data available yet</p>
        </div>
      )}
    </div>
  );
}

