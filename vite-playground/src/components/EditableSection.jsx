import React, { useState } from 'react';
import { MdEdit, MdAdd } from 'react-icons/md';

export default function EditableSection({
  title,
  icon: Icon,
  isEmpty,
  isOwnProfile,
  onEdit,
  onAdd,
  children,
  emptyMessage = `Add your first ${title.toLowerCase()}`,
  className = ''
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (!isOwnProfile && isEmpty) {
    return null; // Don't show empty sections to non-owners
  }

  return (
    <div 
      className={`bg-white shadow rounded-lg p-6 relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Edit/Add Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="text-blue-600" size={24} />}
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        {isOwnProfile && (
          <button
            onClick={isEmpty ? onAdd : onEdit}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              isHovered || isEmpty
                ? 'text-blue-600 hover:bg-blue-50'
                : 'text-gray-400 hover:text-blue-600'
            }`}
          >
            {isEmpty ? (
              <>
                <MdAdd size={18} />
                Add
              </>
            ) : (
              <>
                <MdEdit size={18} />
                Edit
              </>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      {isEmpty ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">{emptyMessage}</p>
          {isOwnProfile && (
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Get Started
            </button>
          )}
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

