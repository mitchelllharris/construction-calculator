import React from 'react';
import { MdClose, MdEdit, MdDelete, MdEmail, MdPhone, MdLocationOn, MdBusiness, MdNotes, MdTag } from 'react-icons/md';

export default function ContactDetailModal({ contact, onClose, onEdit, onDelete }) {
  if (!contact) return null;

  const getTypeColor = (type) => {
    const colors = {
      client: 'bg-blue-100 text-blue-800',
      business: 'bg-purple-100 text-purple-800',
      supplier: 'bg-green-100 text-green-800',
      contractor: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type) => {
    return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Client';
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}`;
  };

  const fullAddress = [
    contact.address,
    contact.city,
    contact.state,
    contact.zip,
    contact.country,
  ]
    .filter(Boolean)
    .join(', ');

  const avatarUrl = contact.avatar 
    ? (contact.avatar.startsWith('http') ? contact.avatar : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${contact.avatar}`)
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Contact Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Avatar and Name Section */}
          <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-200">
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${contact.firstName} ${contact.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-semibold border-4 border-gray-200">
                  {getInitials(contact.firstName, contact.lastName)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-3xl font-bold text-gray-900">
                  {contact.firstName} {contact.lastName}
                </h3>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded ${getTypeColor(
                    contact.type
                  )}`}
                >
                  {getTypeLabel(contact.type)}
                </span>
              </div>
              {contact.status && (
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  contact.status === 'active' ? 'bg-green-100 text-green-800' :
                  contact.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h4>
            
            {contact.email && (
              <div className="flex items-center gap-3 text-gray-700">
                <MdEmail className="text-gray-400 flex-shrink-0" size={20} />
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-blue-600 transition-colors break-all"
                >
                  {contact.email}
                </a>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-center gap-3 text-gray-700">
                <MdPhone className="text-gray-400 flex-shrink-0" size={20} />
                <a
                  href={`tel:${contact.phone}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {contact.phone}
                </a>
              </div>
            )}

            {fullAddress && (
              <div className="flex items-start gap-3 text-gray-700">
                <MdLocationOn className="text-gray-400 mt-0.5 flex-shrink-0" size={20} />
                <span>{fullAddress}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {(contact.tags && contact.tags.length > 0) && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MdTag className="text-gray-400" size={20} />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MdNotes className="text-gray-400" size={20} />
                Notes
              </h4>
              <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {contact.notes}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>Created: {new Date(contact.createdAt).toLocaleDateString()}</p>
            {contact.updatedAt && contact.updatedAt !== contact.createdAt && (
              <p>Last updated: {new Date(contact.updatedAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              onEdit(contact);
              onClose();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <MdEdit size={18} />
            Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`)) {
                onDelete(contact);
                onClose();
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <MdDelete size={18} />
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

