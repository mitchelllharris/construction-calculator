import React, { useState, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { createContact, updateContact, bulkDeleteContacts, exportContacts, deleteContact } from '../utils/contactApi';
import ContactList from '../components/ContactList';
import ContactForm from '../components/ContactForm';
import ContactDetailModal from '../components/ContactDetailModal';
import BulkActionsBar from '../components/BulkActionsBar';
import ContactImportModal from '../components/ContactImportModal';
import Button from '../components/Button';
import { MdAdd, MdClose, MdFileDownload, MdFileUpload } from 'react-icons/md';

export default function Contacts() {
  const { showSuccess, showError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [viewingContact, setViewingContact] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const formRef = useRef(null);

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
        // Create new contact
        result = await createContact(contactData);
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
    setViewingContact(contact);
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

  const handleDelete = async (contact) => {
    try {
      await deleteContact(contact._id);
      showSuccess('Contact deleted successfully');
      setRefreshTrigger((prev) => prev + 1);
      if (viewingContact && viewingContact._id === contact._id) {
        setViewingContact(null);
      }
    } catch (error) {
      showError(error.message || 'Failed to delete contact');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Contacts</h1>
          <p className="text-gray-600">
            Manage your contacts - clients, suppliers, contractors, and more
          </p>
        </div>
        {!showForm && (
          <div className="flex gap-2">
            <Button 
              onClick={handleExportAll} 
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
            >
              <MdFileDownload size={20} />
              Export All
            </Button>
            <Button 
              onClick={() => setShowImportModal(true)} 
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600"
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

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedContacts.size}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        onClear={() => setSelectedContacts(new Set())}
      />

      {/* Contact List */}
      <ContactList
        onEdit={handleEdit}
        onView={handleView}
        onRefresh={refreshTrigger}
        onSelectedContactsChange={setSelectedContacts}
      />

      {/* Contact Detail Modal */}
      {viewingContact && (
        <ContactDetailModal
          contact={viewingContact}
          onClose={() => setViewingContact(null)}
          onEdit={(contact) => {
            setViewingContact(null);
            handleEdit(contact);
          }}
          onDelete={handleDelete}
        />
      )}

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
