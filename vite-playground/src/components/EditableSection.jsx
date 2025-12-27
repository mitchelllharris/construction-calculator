import React, { useState } from 'react';
import { MdAdd } from 'react-icons/md';

export default function EditableSection({
  title,
  icon: Icon,
  isEmpty,
  isOwnProfile,
  onEdit,
  onAdd,
  children,
  emptyMessage = `Add your first ${title.toLowerCase()}`,
  emptyDescription,
  emptyPlaceholder,
  className = '',
  onDismiss
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (!isOwnProfile && isEmpty) {
    return null; // Don't show empty sections to non-owners
  }

  return (
    <div 
      className={`bg-gray-50 rounded-lg p-6 relative border border-gray-200 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Dismiss Button */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {isOwnProfile && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Empty Description */}
      {isEmpty && emptyDescription && (
        <p className="text-sm text-gray-600 mb-4">{emptyDescription}</p>
      )}

      {/* Content */}
      {isEmpty ? (
        <div className="border-t border-dashed border-gray-300 pt-4">
          {emptyPlaceholder ? (
            <div className="flex items-start gap-4">
              {Icon && (
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="text-gray-600" size={24} />
                </div>
              )}
              <div className="flex-1">
                {emptyPlaceholder}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">{emptyMessage}</p>
            </div>
          )}
          {isOwnProfile && (
            <button
              onClick={onAdd}
              className="mt-4 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              Add {title.toLowerCase()}
            </button>
          )}
        </div>
      ) : (
        <div>
          {children}
          {isOwnProfile && (
            <button
              onClick={onAdd}
              className="mt-4 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <MdAdd size={18} />
              Add {title.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

