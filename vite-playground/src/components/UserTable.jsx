import React, { useState, useEffect } from 'react';
import { get, put, del, post } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import SkeletonTable from './SkeletonTable';
import Spinner from './Spinner';
import Button from './Button';

export default function UserTable({ searchTerm, roleFilter, verifiedFilter, onUserUpdate }) {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', firstName: '', lastName: '' });
  const [roleForm, setRoleForm] = useState({ roles: [] });

  useEffect(() => {
    fetchUsers();
  }, [page, searchTerm, roleFilter, verifiedFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter) params.append('role', roleFilter);
      if (verifiedFilter !== undefined) params.append('verified', verifiedFilter.toString());

      const response = await get(`${API_ENDPOINTS.ADMIN.USERS}?${params}`);
      setUsers(response.users || []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (error) {
      showError(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    });
    setRoleForm({
      roles: user.roles.map(r => r.replace('ROLE_', '').toLowerCase()),
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({ username: '', email: '', firstName: '', lastName: '' });
    setRoleForm({ roles: [] });
  };

  const handleSaveEdit = async (userId) => {
    try {
      setLoading(true);
      await put(API_ENDPOINTS.ADMIN.UPDATE_USER(userId), editForm);
      showSuccess('User updated successfully');
      setEditingUser(null);
      fetchUsers();
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      showError(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId) => {
    try {
      setLoading(true);
      await put(API_ENDPOINTS.ADMIN.ASSIGN_ROLE(userId), roleForm);
      showSuccess('Roles updated successfully');
      fetchUsers();
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      showError(error.message || 'Failed to update roles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setLoading(true);
      await del(API_ENDPOINTS.ADMIN.DELETE_USER(userId));
      showSuccess('User deleted successfully');
      fetchUsers();
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      showError(error.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (userId) => {
    try {
      setLoading(true);
      await post(API_ENDPOINTS.ADMIN.VERIFY_EMAIL(userId));
      showSuccess('Email verified successfully');
      fetchUsers();
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      showError(error.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return <SkeletonTable rows={5} cols={5} showHeader={true} />;
  }

  return (
    <div className="relative">
      {loading && users.length > 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded">
          <Spinner size="md" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    <div className="text-sm text-gray-500">{user.email}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.emailVerified ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Unverified
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser === user.id ? (
                    <div className="space-y-2">
                      {['user', 'moderator', 'admin'].map((role) => (
                        <label key={role} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={roleForm.roles.includes(role)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRoleForm({ roles: [...roleForm.roles, role] });
                              } else {
                                setRoleForm({ roles: roleForm.roles.filter((r) => r !== role) });
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="mr-1 px-2 py-1 text-xs rounded bg-blue-100 text-blue-800"
                        >
                          {role.replace('ROLE_', '')}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingUser === user.id ? (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleSaveEdit(user.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleRoleChange(user.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Save Roles
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      {!user.emailVerified && (
                        <button
                          onClick={() => handleVerifyEmail(user.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} users
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

