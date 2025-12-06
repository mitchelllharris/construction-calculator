import React, { useState, useEffect } from 'react';
import { MdClose, MdUpload, MdFileDownload, MdCheckCircle, MdError } from 'react-icons/md';
import { importContacts } from '../utils/contactApi';
import { useToast } from '../contexts/ToastContext';
import Button from './Button';

export default function ContactImportModal({ onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return false;
    
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      showError('Please select a CSV file');
      return false;
    }
    setFile(selectedFile);
    setImportResult(null);
    return true;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      validateAndSetFile(droppedFiles[0]);
    }
  };

  // Prevent default drag behavior on the modal to avoid page refresh
  useEffect(() => {
    const handleDragOver = (e) => {
      // Only prevent default if dragging over the modal area
      if (e.target.closest('.contact-import-modal')) {
        e.preventDefault();
      }
    };
    const handleDrop = (e) => {
      // Only prevent default if dropping on the modal area
      if (e.target.closest('.contact-import-modal')) {
        e.preventDefault();
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleImport = async () => {
    if (!file) {
      showError('Please select a CSV file');
      return;
    }

    setLoading(true);
    try {
      const result = await importContacts(file);
      setImportResult(result);
      showSuccess(result.message || `Successfully imported ${result.importedCount} contact(s)`);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Import error:', error);
      console.error('Error details:', {
        message: error.message,
        errors: error.errors,
        status: error.status
      });
      // Log each error individually for easier debugging
      if (error.errors && Array.isArray(error.errors)) {
        console.error('Validation errors:');
        error.errors.forEach((err, idx) => {
          console.error(`  ${idx + 1}. ${err}`);
        });
      }
      
      // Show first error in toast, all errors in modal
      const errorMessage = error.message || (error.errors && error.errors.length > 0 ? error.errors[0] : 'Failed to import contacts');
      showError(errorMessage);
      
      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        setImportResult({ 
          errors: error.errors,
          validCount: error.validCount,
          errorCount: error.errorCount
        });
      } else if (error.message) {
        setImportResult({ errors: [error.message] });
      } else {
        setImportResult({ errors: ['Failed to import contacts. Please check the CSV format.'] });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Generate CSV template
    const headers = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'type',
      'address',
      'city',
      'state',
      'zip',
      'country',
      'notes',
      'tags'
    ];
    
    const sampleRow = [
      'John',
      'Doe',
      'john.doe@example.com',
      '+1 (555) 123-4567',
      'client',
      '123 Main St',
      'New York',
      'NY',
      '10001',
      'United States',
      'Sample contact notes',
      'important;vip'
    ];

    // Properly escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      sampleRow.map(escapeCSV).join(','),
      ''
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="contact-import-modal bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Import Contacts from CSV</h2>
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
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>CSV must include headers: firstName, lastName, email, phone, type, address, city, state, zip, country, notes, tags</li>
              <li>Required fields: firstName, lastName, email</li>
              <li>Type must be one of: client, business, supplier, contractor</li>
              <li>Tags should be semicolon-separated (e.g., "important;vip")</li>
            </ul>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <MdUpload className={isDragging ? "text-blue-500" : "text-gray-400"} size={48} />
                <span className={isDragging ? "text-blue-600 font-medium" : "text-gray-600"}>
                  {file ? file.name : isDragging ? 'Drop CSV file here' : 'Click to select CSV file'}
                </span>
                <span className="text-sm text-gray-500">
                  {isDragging ? '' : 'or drag and drop'}
                </span>
              </label>
            </div>
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          {/* Download Template */}
          <div className="mb-6">
            <button
              onClick={handleDownloadTemplate}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm"
            >
              <MdFileDownload size={18} />
              Download CSV Template
            </button>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`mb-6 p-4 rounded-lg ${
              importResult.errors ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
            }`}>
              {importResult.errors ? (
                <div>
                  <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                    <MdError size={20} />
                    <span>Import Errors ({importResult.errors.length})</span>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto list-disc list-inside">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  {importResult.validCount !== undefined && (
                    <div className="mt-2 text-xs text-red-600">
                      {importResult.validCount} valid contact(s), {importResult.errorCount} error(s)
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-800">
                  <MdCheckCircle size={20} />
                  <span className="font-medium">
                    {importResult.message || `Successfully imported ${importResult.importedCount} contact(s)`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={!file || loading}
              className="flex-1"
            >
              {loading ? 'Importing...' : 'Import Contacts'}
            </Button>
            <Button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-500 hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

