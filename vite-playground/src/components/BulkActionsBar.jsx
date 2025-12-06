import React, { useState } from 'react';
import { MdDelete, MdFileDownload, MdClose } from 'react-icons/md';
import Button from './Button';

export default function BulkActionsBar({ selectedCount, onDelete, onExport, onClear }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedCount === 0) return null;

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      {!showDeleteConfirm ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-800 font-medium">
              {selectedCount} contact{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
            >
              <MdFileDownload size={18} />
              Export Selected
            </button>
            <button
              onClick={handleDeleteClick}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
            >
              <MdDelete size={18} />
              Delete Selected
            </button>
            <button
              onClick={onClear}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
            >
              <MdClose size={18} />
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-red-700 font-medium">
            Are you sure you want to delete {selectedCount} contact{selectedCount !== 1 ? 's' : ''}? This action cannot be undone.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              Confirm Delete
            </button>
            <button
              onClick={handleCancelDelete}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

