import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { createContact, updateContact, bulkDeleteContacts, exportContacts } from '../utils/contactApi';
import { getPendingRequests, acceptConnectionRequest, rejectConnectionRequest, blockUser } from '../utils/connectionApi';
import { getPendingFollowRequests, acceptFollowRequest, rejectFollowRequest } from '../utils/followApi';
import { getAllContactLists, createContactList, deleteContactList } from '../utils/contactListApi';
import ConnectionActionsMenu from '../components/ConnectionActionsMenu';
import ContactList from '../components/ContactList';
import ContactForm from '../components/ContactForm';
import BulkActionsBar from '../components/BulkActionsBar';
import ContactImportModal from '../components/ContactImportModal';
import Button from '../components/Button';
import { MdAdd, MdClose, MdFileDownload, MdFileUpload, MdPersonAdd, MdCheck, MdList, MdDelete, MdEdit } from 'react-icons/md';

export default function Contacts() {
  const { showSuccess, showError } = useToast();
  const { activeProfile, isUserProfile, isBusinessProfile, loading: profileLoading } = useProfileSwitcher();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [pendingFollowRequests, setPendingFollowRequests] = useState([]);
  const [loadingFollowRequests, setLoadingFollowRequests] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState({});
  const formRef = useRef(null);
  
  // Tab state: 'all' (for personal users), 'business', 'personal' (for business profiles), or list ID (for custom lists)
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize based on profile type, default to 'all' for personal users
    return isBusinessProfile ? 'business' : 'all';
  });
  
  // Update active tab when profile changes
  useEffect(() => {
    if (isBusinessProfile) {
      setActiveTab('business');
    } else if (isUserProfile) {
      setActiveTab('all');
    }
  }, [isBusinessProfile, isUserProfile]);
  
  // Get current businessId for business contacts tab
  const currentBusinessId = isBusinessProfile && activeProfile?.type === 'business' ? activeProfile?.id : null;
  
  // Contact lists state
  const [contactLists, setContactLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [showListForm, setShowListForm] = useState(false);
  const [listFormData, setListFormData] = useState({
    name: '',
    description: '',
    type: 'manual',
    filterCriteria: {}
  });

  // Check for edit query param on mount
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !editingContact) {
      // Fetch the contact and open edit mode
      const fetchContactForEdit = async () => {
        try {
          const { getContactById } = await import('../utils/contactApi');
          const contact = await getContactById(editId);
          handleEdit(contact);
          // Remove edit param from URL
          setSearchParams({});
        } catch (error) {
          console.error('[Contacts] Error fetching contact for edit:', error);
          showError('Failed to load contact for editing');
          setSearchParams({});
        }
      };
      fetchContactForEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, editingContact]);

  const handleCreate = () => {
    setEditingContact(null);
    setShowForm(true);
    // Scroll to form after a brief delay to ensure it's rendered
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setShowForm(true);
    // Scroll to form after a brief delay to ensure it's rendered
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingContact(null);
  };

  const handleSubmit = async (contactData) => {
    setLoading(true);
    try {
      let result;
      if (editingContact) {
        // Update existing contact
        result = await updateContact(editingContact._id, contactData);
        showSuccess('Contact updated successfully');
      } else {
        // Create new contact - include businessId if on business profile and in business tab
        const contactDataWithBusiness = {
          ...contactData,
          ...(isBusinessProfile && activeTab === 'business' && currentBusinessId ? { businessId: currentBusinessId } : {})
        };
        result = await createContact(contactDataWithBusiness);
        showSuccess('Contact created successfully');
      }
      setShowForm(false);
      setEditingContact(null);
      // Trigger refresh of contact list
      setRefreshTrigger((prev) => prev + 1);
      return result; // Return result so ContactForm can use it for avatar upload
    } catch (error) {
      showError(error.message || 'Failed to save contact');
      throw error; // Re-throw so ContactForm knows submission failed
    } finally {
      setLoading(false);
    }
  };

  const handleView = (contact) => {
    navigate(`/contacts/${contact._id}`);
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;

    setLoading(true);
    try {
      const contactIds = Array.from(selectedContacts);
      await bulkDeleteContacts(contactIds);
      showSuccess(`${contactIds.length} contact(s) deleted successfully`);
      setSelectedContacts(new Set());
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      showError(error.message || 'Failed to delete contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedContacts.size === 0) return;

    try {
      const contactIds = Array.from(selectedContacts);
      const blob = await exportContacts(contactIds);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Contacts exported successfully');
    } catch (error) {
      showError(error.message || 'Failed to export contacts');
    }
  };

  const handleExportAll = async () => {
    try {
      const blob = await exportContacts();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showSuccess('All contacts exported successfully');
    } catch (error) {
      showError(error.message || 'Failed to export contacts');
    }
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    setRefreshTrigger((prev) => prev + 1);
  };


  // Fetch incoming connection requests
  const fetchIncomingRequests = useCallback(async () => {
    setLoadingIncoming(true);
    try {
      const recipientType = isUserProfile && activeProfile?.type === 'user' ? 'User' : 'Business';
      const businessId = isBusinessProfile && activeProfile?.type === 'business' ? activeProfile?.id : null;
      const data = await getPendingRequests(recipientType, businessId);
      setIncomingRequests(data.requests || []);
    } catch (error) {
      showError(error.message || 'Failed to load incoming requests');
    } finally {
      setLoadingIncoming(false);
    }
  }, [isUserProfile, isBusinessProfile, activeProfile, showError]);

  // Fetch pending follow requests
  const fetchPendingFollowRequests = useCallback(async () => {
    if (!isUserProfile || activeProfile?.type !== 'user') {
      return;
    }

    setLoadingFollowRequests(true);
    try {
      const data = await getPendingFollowRequests();
      setPendingFollowRequests(data.requests || []);
    } catch (error) {
      showError(error.message || 'Failed to load pending follow requests');
    } finally {
      setLoadingFollowRequests(false);
    }
  }, [isUserProfile, activeProfile, showError]);

  // Fetch contact lists
  const fetchContactLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const data = await getAllContactLists(currentBusinessId);
      setContactLists(data.lists || []);
    } catch (error) {
      showError(error.message || 'Failed to load contact lists');
    } finally {
      setLoadingLists(false);
    }
  }, [currentBusinessId, showError]);

  // Create contact list
  const handleCreateList = async () => {
    setLoading(true);
    try {
      const listData = {
        ...listFormData,
        businessId: isBusinessProfile && activeTab === 'business' ? currentBusinessId : null
      };
      await createContactList(listData);
      showSuccess('Contact list created successfully');
      setShowListForm(false);
      setListFormData({ name: '', description: '', type: 'manual', filterCriteria: {} });
      await fetchContactLists();
    } catch (error) {
      showError(error.message || 'Failed to create contact list');
    } finally {
      setLoading(false);
    }
  };

  // Delete contact list
  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this contact list?')) {
      return;
    }
    setLoading(true);
    try {
      await deleteContactList(listId);
      showSuccess('Contact list deleted successfully');
      if (activeTab === listId) {
        setActiveTab(isBusinessProfile ? 'business' : 'all');
      }
      await fetchContactLists();
    } catch (error) {
      showError(error.message || 'Failed to delete contact list');
    } finally {
      setLoading(false);
    }
  };

  // Load incoming requests on mount
  useEffect(() => {
    if (!profileLoading && activeProfile && isUserProfile && activeProfile?.type === 'user') {
      fetchIncomingRequests();
      fetchPendingFollowRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, activeProfile?.type, isUserProfile]);

  // Fetch contact lists on mount
  useEffect(() => {
    fetchContactLists();
  }, [fetchContactLists]);

  // Handle accepting/rejecting connection requests
  const handleConnectionAction = async (action, connectionId, userId) => {
    setConnectionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      if (action === 'accept') {
        await acceptConnectionRequest(connectionId);
        showSuccess('Connection request accepted');
      } else {
        await rejectConnectionRequest(connectionId);
        showSuccess('Connection request rejected');
      }
      fetchIncomingRequests();
      // Refresh contact list and connections if we accepted (contact is automatically created)
      if (action === 'accept') {
        // Add a small delay to ensure backend has finished creating the contact
        setTimeout(() => {
          setRefreshTrigger((prev) => prev + 1);
        }, 500); // 500ms delay to allow backend to complete contact creation
      }
    } catch (error) {
      showError(error.message || `Failed to ${action} connection request`);
    } finally {
      setConnectionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };


  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') 
      ? url 
      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${url}`;
  };

  const getInitials = (user) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return '?';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Connections & Networking</h1>
          <p className="text-gray-600">
            Manage your connections and professional network
          </p>
        </div>
        {!showForm && (
          <div className="flex gap-2">
            <Button 
              onClick={handleExportAll} 
              className="flex items-center gap-2 border border-gray-300 bg-transparent hover:bg-gray-300 text-black"
            >
              <MdFileDownload size={20} />
              Export All
            </Button>
            <Button 
              onClick={() => setShowImportModal(true)} 
              className="flex items-center gap-2 border border-gray-300 bg-transparent hover:bg-gray-300 text-black"
            >
              <MdFileUpload size={20} />
              Import CSV
            </Button>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <MdAdd size={20} />
              Add Contact
            </Button>
          </div>
        )}
      </div>

      {/* Contact Form */}
      {showForm && (
        <div ref={formRef} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Close form"
            >
              <MdClose size={24} />
            </button>
          </div>
          <ContactForm
            contact={editingContact}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>
      )}

      {/* Incoming Connection Requests */}
      {(isUserProfile || isBusinessProfile) && incomingRequests.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MdPersonAdd size={24} />
            Connection Requests ({incomingRequests.length})
          </h2>
          {loadingIncoming ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomingRequests.map((conn) => {
                const requester = conn.requester;
                const userId = requester?._id || requester?.id;
                const isLoading = connectionLoading[userId];
                return (
                  <div
                    key={conn._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {getImageUrl(requester?.avatar) ? (
                        <img
                          src={getImageUrl(requester?.avatar)}
                          alt={requester?.firstName || requester?.username}
                          className="w-12 h-12 rounded-full object-cover shrink-0 cursor-pointer"
                          onClick={() => navigate(`/profile/${requester?.username}`)}
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0 cursor-pointer"
                          onClick={() => navigate(`/profile/${requester?.username}`)}
                        >
                          {getInitials(requester)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600"
                          onClick={() => navigate(`/profile/${requester?.username}`)}
                        >
                          {requester?.firstName && requester?.lastName
                            ? `${requester.firstName} ${requester.lastName}`
                            : requester?.username || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">@{requester?.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => handleConnectionAction('accept', conn._id, userId)}
                        disabled={isLoading}
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <MdCheck size={16} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleConnectionAction('reject', conn._id, userId)}
                        disabled={isLoading}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <MdClose size={16} />
                        Reject
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to block this user? This will prevent them from contacting you.')) {
                            setConnectionLoading(prev => ({ ...prev, [userId]: true }));
                            try {
                              await blockUser(userId);
                              showSuccess('User blocked');
                              fetchIncomingRequests();
                            } catch (error) {
                              showError(error.message || 'Failed to block user');
                            } finally {
                              setConnectionLoading(prev => ({ ...prev, [userId]: false }));
                            }
                          }
                        }}
                        disabled={isLoading}
                        className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center gap-1 disabled:opacity-50"
                        title="Block user"
                      >
                        <MdClose size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedContacts.size}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        onClear={() => setSelectedContacts(new Set())}
      />

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="border-b border-gray-200 flex-1">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {/* All Contacts tab (for personal users) */}
              {isUserProfile && (
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Contacts
                </button>
              )}
              
              {/* Business/Personal tabs for business profiles */}
              {isBusinessProfile && (
                <>
                  <button
                    onClick={() => setActiveTab('business')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'business'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Business Contacts
                  </button>
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'personal'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Personal Contacts
                  </button>
                </>
              )}

              {/* Custom contact lists */}
              {contactLists.map((list) => (
                <div key={list._id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => setActiveTab(list._id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === list._id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {list.name}
                  </button>
                  <button
                    onClick={() => handleDeleteList(list._id)}
                    className="text-red-500 hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete list"
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              ))}
            </nav>
          </div>
          <Button
            onClick={() => setShowListForm(!showListForm)}
            className="ml-4 flex items-center gap-2"
          >
            <MdList size={18} />
            Create List
          </Button>
        </div>

        {/* Create List Form */}
        {showListForm && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-3">Create New Contact List</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  List Name *
                </label>
                <input
                  type="text"
                  value={listFormData.name}
                  onChange={(e) => setListFormData({ ...listFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Businesses, Suppliers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={listFormData.description}
                  onChange={(e) => setListFormData({ ...listFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  List Type *
                </label>
                <select
                  value={listFormData.type}
                  onChange={(e) => setListFormData({ ...listFormData, type: e.target.value, filterCriteria: e.target.value === 'filter' ? {} : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">Manual (add contacts manually)</option>
                  <option value="filter">Filter (auto-populate by criteria)</option>
                </select>
              </div>
              {listFormData.type === 'filter' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Type
                  </label>
                  <select
                    value={listFormData.filterCriteria?.type || ''}
                    onChange={(e) => setListFormData({
                      ...listFormData,
                      filterCriteria: { ...listFormData.filterCriteria, type: e.target.value || undefined }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="client">Client</option>
                    <option value="business">Business</option>
                    <option value="supplier">Supplier</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateList}
                  disabled={!listFormData.name.trim() || loading}
                  className="flex items-center gap-2"
                >
                  Create List
                </Button>
                <Button
                  onClick={() => {
                    setShowListForm(false);
                    setListFormData({ name: '', description: '', type: 'manual', filterCriteria: {} });
                  }}
                  className="bg-gray-500 hover:bg-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact List */}
      <ContactList
        onEdit={handleEdit}
        onView={handleView}
        onRefresh={refreshTrigger}
        onSelectedContactsChange={setSelectedContacts}
        businessId={isBusinessProfile && activeTab === 'business' ? currentBusinessId : (isUserProfile && activeTab === 'all' ? undefined : null)}
        listId={typeof activeTab === 'string' && activeTab !== 'all' && activeTab !== 'business' && activeTab !== 'personal' ? activeTab : null}
      />

      {/* Import Modal */}
      {showImportModal && (
        <ContactImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
