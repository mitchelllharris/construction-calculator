import React, { useState, useEffect, useRef } from 'react';
import { getAllContacts } from '../utils/contactApi';
import { getContactsForList } from '../utils/contactListApi';
import { useToast } from '../contexts/ToastContext';
import ContactCard from './ContactCard';
import SkeletonCard from './SkeletonCard';
import Input from './Input';
import { MdSearch, MdFilterList, MdChevronLeft, MdChevronRight, MdRefresh, MdSort } from 'react-icons/md';

export default function ContactList({ onEdit, onView, onRefresh, onSelectedContactsChange, businessId = null, listId = null }) {
  const { showSuccess, showError } = useToast();
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(20);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
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
      let response;
      if (listId) {
        // Fetch contacts from a specific list
        response = await getContactsForList(listId, {
          page,
          limit
        });
      } else {
        // Fetch all contacts with filters
        const params = {
          page,
          limit,
          search: searchTerm || undefined,
          type: typeFilter || undefined,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
          businessId: businessId !== undefined ? businessId : undefined,
          showAll: businessId === undefined ? 'true' : undefined, // Show all for personal users
        };
        response = await getAllContacts(params);
      }
      
      setContacts(response.contacts || []);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      const newSet = new Set();
      setSelectedContacts(newSet); // Clear selection on new page
      isInitialLoad.current = false;
    } catch (error) {
      console.error('[ContactList] Error fetching contacts:', error);
      showError(error.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [searchTerm, typeFilter, sortBy, sortOrder, pageSize, pagination.page, businessId, listId, showError]);

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
  }, [searchTerm, typeFilter, sortBy, sortOrder, fetchContacts, pageSize]);



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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <div className="relative">
              <MdSort className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-sm px-3 py-2 pl-10 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="updatedAt">Date Updated</option>
                  <option value="firstName">First Name</option>
                  <option value="lastName">Last Name</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="type">Type</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  title="Sort order"
                >
                  <option value="desc">↓ Desc</option>
                  <option value="asc">↑ Asc</option>
                </select>
              </div>
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
                  onView={onView}
                  isSelected={selectedContacts.has(contact._id)}
                  onSelect={handleSelectContact}
                />
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

