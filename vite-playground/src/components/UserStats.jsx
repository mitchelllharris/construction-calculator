import React, { useState, useEffect } from 'react';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import SkeletonStats from './SkeletonStats';

export default function UserStats({ onStatsUpdate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    if (onStatsUpdate) {
      const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [onStatsUpdate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await get(API_ENDPOINTS.ADMIN.STATS);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonStats count={6} />;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500">Total Users</div>
        <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500">Verified</div>
        <div className="mt-2 text-3xl font-bold text-green-600">{stats.verified}</div>
        <div className="text-xs text-gray-500 mt-1">
          {stats.total > 0
            ? Math.round((stats.verified / stats.total) * 100)
            : 0}% verified
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500">Unverified</div>
        <div className="mt-2 text-3xl font-bold text-yellow-600">{stats.unverified}</div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500">Admins</div>
        <div className="mt-2 text-3xl font-bold text-blue-600">{stats.byRole?.admin || 0}</div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500">Moderators</div>
        <div className="mt-2 text-3xl font-bold text-purple-600">
          {stats.byRole?.moderator || 0}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-500">Regular Users</div>
        <div className="mt-2 text-3xl font-bold text-gray-600">{stats.byRole?.user || 0}</div>
      </div>
    </div>
  );
}

