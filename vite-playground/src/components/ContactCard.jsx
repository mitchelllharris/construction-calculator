import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdEmail, MdPhone, MdLocationOn, MdBusiness, MdTag, MdPerson } from 'react-icons/md';

export default function ContactCard({ contact, onView, isSelected, onSelect }) {
  const navigate = useNavigate();
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

  // Use platform user's avatar if available, otherwise use contact's avatar
  const avatarUrl = contact.platformUserId?.avatar
    ? (contact.platformUserId.avatar.startsWith('http') 
        ? contact.platformUserId.avatar 
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${contact.platformUserId.avatar}`)
    : (contact.avatar 
        ? (contact.avatar.startsWith('http') 
            ? contact.avatar 
            : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${contact.avatar}`)
        : null);

  const handleCardClick = () => {
    navigate(`/contacts/${contact._id}`);
  };

  return (
    <div 
      className={`bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox */}
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(contact._id, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          )}
          
          {/* Avatar */}
          <div className="shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${contact.firstName} ${contact.lastName}`}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold border-2 border-gray-200">
                {getInitials(contact.firstName, contact.lastName)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-xl font-semibold text-gray-900">
                {contact.firstName} {contact.lastName}
              </h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(
                  contact.type
                )}`}
              >
                {getTypeLabel(contact.type)}
              </span>
              {/* Business associations - show all businesses this contact is associated with */}
              {contact.associatedBusinesses && contact.associatedBusinesses.length > 0 && (
                <>
                  {contact.associatedBusinesses.map((business, idx) => (
                    <span
                      key={business._id || idx}
                      className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-800 flex items-center gap-1"
                      title={`Contact in ${business.businessName}`}
                    >
                      <MdBusiness size={12} />
                      {business.businessName}
                    </span>
                  ))}
                </>
              )}
              {/* Also show if this contact has a businessId (single business association) */}
              {contact.businessId && typeof contact.businessId === 'object' && contact.businessId.businessName && 
               (!contact.associatedBusinesses || !contact.associatedBusinesses.some(b => b._id?.toString() === contact.businessId._id?.toString())) && (
                <span
                  className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-800 flex items-center gap-1"
                  title={`Contact in ${contact.businessId.businessName}`}
                >
                  <MdBusiness size={12} />
                  {contact.businessId.businessName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {contact.email && (
          <div className="flex items-center gap-2 text-gray-700">
            <MdEmail className="text-gray-400" size={18} />
            <a
              href={`mailto:${contact.email}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-blue-600 transition-colors"
            >
              {contact.email}
            </a>
          </div>
        )}

        {contact.phone && (
          <div className="flex items-center gap-2 text-gray-700">
            <MdPhone className="text-gray-400" size={18} />
            <a
              href={`tel:${contact.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-blue-600 transition-colors"
            >
              {contact.phone}
            </a>
          </div>
        )}

        {fullAddress && (
          <div className="flex items-start gap-2 text-gray-700">
            <MdLocationOn className="text-gray-400 mt-0.5" size={18} />
            <span>{fullAddress}</span>
          </div>
        )}

        {contact.notes && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600 line-clamp-2">{contact.notes}</p>
          </div>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <MdTag className="text-gray-400" size={16} />
              {contact.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
              {contact.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{contact.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

