import React, { useState, useEffect, useRef } from 'react';
import { getAllContacts, deleteContact } from '../utils/contactApi';
import { useToast } from '../contexts/ToastContext';
import ContactCard from './ContactCard';
import SkeletonCard from './SkeletonCard';
import Input from './Input';
import { MdSearch, MdFilterList, MdChevronLeft, MdChevronRight, MdRefresh } from 'react-icons/md';

export default function ContactList({ onEdit, onView, onRefresh, onSelectedContactsChange }) {
  const { showSuccess, showError } = useToast();
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const prevRefreshRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const isInitialLoad = useRef(true);

  const fetchContacts = React.useCallback(async (page = pagination.page, limit = pageSize, isSearch = false) => {
    // Only show skeleton loader on initial load
    if (isInitialLoad.current) {
      setLoading(true);
    } else if (isSearch) {
      // Show subtle loading indicator during search
      setSearching(true);
    }
    // For other cases (page changes, page size changes), no loading indicator
    
    try {
      const params = {
        page,
        limit,
        search: searchTerm || undefined,
        type: typeFilter || undefined,
      };
      const response = await getAllContacts(params);
      setContacts(response.contacts || []);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      const newSet = new Set();
      setSelectedContacts(newSet); // Clear selection on new page
      isInitialLoad.current = false;
    } catch (error) {
      showError(error.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [searchTerm, typeFilter, pageSize, pagination.page, showError]);

  // Update parent when selected contacts change (separate effect to avoid render issues)
  useEffect(() => {
    if (onSelectedContactsChange) {
      onSelectedContactsChange(selectedContacts);
    }
  }, [selectedContacts, onSelectedContactsChange]);

  // Initial load
  useEffect(() => {
    if (isInitialLoad.current) {
      fetchContacts(1, pageSize, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Handle page size changes (after initial load)
  useEffect(() => {
    if (!isInitialLoad.current) {
      fetchContacts(1, pageSize, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // Refresh when onRefresh changes (triggered from parent)
  useEffect(() => {
    if (onRefresh !== undefined && onRefresh !== null && onRefresh !== prevRefreshRef.current) {
      prevRefreshRef.current = onRefresh;
      if (prevRefreshRef.current !== null) {
        fetchContacts(pagination.page, pageSize);
      }
    }
  }, [onRefresh, fetchContacts, pagination.page, pageSize]);

  // Debounced search
  useEffect(() => {
    // Skip debounce on initial mount
    if (isInitialLoad.current) {
      return;
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchContacts(1, pageSize, true);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, typeFilter, fetchContacts, pageSize]);


  const handleDelete = async (contact) => {
    if (deleteConfirmId === contact._id) {
      // Confirm delete
      try {
        await deleteContact(contact._id);
        showSuccess('Contact deleted successfully');
        setDeleteConfirmId(null);
        fetchContacts(pagination.page, pageSize); // Refresh list
      } catch (error) {
        showError(error.message || 'Failed to delete contact');
      }
    } else {
      // Show confirmation
      setDeleteConfirmId(contact._id);
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => {
        setDeleteConfirmId(null);
      }, 5000);
    }
  };

  const handleSelectContact = (contactId, isSelected) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(contactId);
      } else {
        newSet.delete(contactId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (isSelected) => {
    const newSet = isSelected ? new Set(contacts.map(c => c._id)) : new Set();
    setSelectedContacts(newSet);
  };

  const isAllSelected = contacts.length > 0 && contacts.every(c => selectedContacts.has(c._id));
  const isSomeSelected = selectedContacts.size > 0 && !isAllSelected;

  const handlePageChange = (newPage) => {
    fetchContacts(newPage, pageSize);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    fetchContacts(1, newSize);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} lines={4} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Contacts
              {searching && (
                <span className="ml-2 inline-flex items-center text-blue-500">
                  <MdRefresh className="animate-spin" size={16} />
                </span>
              )}
            </label>
            <Input
              type="text"
              placeholder="Search by name, email, phone, company, tags, suburb, street, state, country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={MdSearch}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <div className="relative">
              <MdFilterList className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-sm px-3 py-2 pl-10 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">All Types</option>
                <option value="client">Client</option>
                <option value="business">Business</option>
                <option value="supplier">Supplier</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results count and select all */}
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {contacts.length} of {pagination.total} contact{pagination.total !== 1 ? 's' : ''}
            {pagination.total > 0 && (
              <span className="ml-2">
                (Page {pagination.page} of {pagination.pages})
              </span>
            )}
          </div>
          {contacts.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) input.indeterminate = isSomeSelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span>Select All</span>
            </label>
          )}
        </div>
      </div>

      {/* Contacts Grid */}
      {contacts.length === 0 && !loading ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="text-gray-400 mb-4">
            <MdSearch size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {pagination.total === 0 ? 'No contacts yet' : 'No contacts found'}
          </h3>
          <p className="text-gray-500">
            {pagination.total === 0
              ? 'Get started by adding your first contact.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact) => (
              <div key={contact._id} className="relative">
                <ContactCard
                  contact={contact}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  onView={onView}
                  isSelected={selectedContacts.has(contact._id)}
                  onSelect={handleSelectContact}
                />
                {deleteConfirmId === contact._id && (
                  <div className="absolute inset-0 bg-red-50 border-2 border-red-500 rounded-lg p-4 flex flex-col items-center justify-center z-10">
                    <p className="text-red-700 font-medium mb-3 text-center">
                      Delete this contact?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(contact)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="mt-6 bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Page size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <MdChevronLeft size={24} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          pagination.page === pageNum
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <MdChevronRight size={24} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

