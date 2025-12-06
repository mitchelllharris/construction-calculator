import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import UserStats from '../components/UserStats';
import UserTable from '../components/UserTable';
import Input from '../components/Input';
import SkeletonCard from '../components/SkeletonCard';

export default function Dashboard() {
  const { user, isAdmin, isModerator } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState(undefined);
  const [statsKey, setStatsKey] = useState(0); // Force refresh

  const handleUserUpdate = () => {
    setStatsKey((k) => k + 1); // Trigger stats refresh
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <SkeletonCard lines={3} className="mb-6" />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  // Admin Dashboard
  if (isAdmin()) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and system settings</p>
        </div>

        {/* User Statistics */}
        <UserStats key={statsKey} onStatsUpdate={handleUserUpdate} />

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <Input
                type="text"
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Verification
              </label>
              <select
                value={verifiedFilter === undefined ? '' : verifiedFilter.toString()}
                onChange={(e) =>
                  setVerifiedFilter(
                    e.target.value === '' ? undefined : e.target.value === 'true'
                  )
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white shadow rounded-lg p-6">
          <UserTable
            searchTerm={searchTerm}
            roleFilter={roleFilter}
            verifiedFilter={verifiedFilter}
            onUserUpdate={handleUserUpdate}
          />
        </div>
      </div>
    );
  }

  // Moderator Dashboard
  if (isModerator()) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Moderator Dashboard</h1>
          <p className="text-gray-600">Welcome, {user.username}!</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Moderation Tools</h2>
          <p className="text-gray-600">
            Moderation features will be available here. Check back soon!
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="space-y-2">
            <Link
              to="/settings"
              className="block text-blue-600 hover:text-blue-800"
            >
              → Settings
            </Link>
            <Link
              to="/profile"
              className="block text-blue-600 hover:text-blue-800"
            >
              → Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Regular User Dashboard
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.username}!</p>
      </div>

      {/* Email Verification Reminder */}
      {!user.emailVerified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-1">
                Verify Your Email
              </h3>
              <p className="text-yellow-700">
                Please verify your email address to access all features.
              </p>
            </div>
            <Link
              to="/resend-verification"
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Verify Email
            </Link>
          </div>
        </div>
      )}

      {/* User Information */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Information</h2>
        <div className="space-y-2">
          <div>
            <span className="font-medium">Username:</span> {user.username}
          </div>
          <div>
            <span className="font-medium">Email:</span> {user.email}
            {user.emailVerified ? (
              <span className="ml-2 text-green-600">✓ Verified</span>
            ) : (
              <span className="ml-2 text-yellow-600">⚠ Unverified</span>
            )}
          </div>
          {user.firstName && (
            <div>
              <span className="font-medium">Name:</span> {user.firstName}{' '}
              {user.lastName}
            </div>
          )}
          <div>
            <span className="font-medium">Roles:</span>{' '}
            {user.roles?.map((role) => (
              <span
                key={role}
                className="ml-1 px-2 py-1 text-xs rounded bg-blue-100 text-blue-800"
              >
                {role.replace('ROLE_', '')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        <div className="space-y-2">
          <Link
            to="/settings"
            className="block text-blue-600 hover:text-blue-800"
          >
            → Settings
          </Link>
          {user.firstName && (
            <Link
              to="/profile"
              className="block text-blue-600 hover:text-blue-800"
            >
              → View Profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
