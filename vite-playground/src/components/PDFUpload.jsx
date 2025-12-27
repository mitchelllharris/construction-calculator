import React, { useState, useRef, useEffect } from 'react';
import { MdCloudUpload, MdPictureAsPdf, MdClose, MdDownload } from 'react-icons/md';
import { getToken } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

export default function PDFUpload({ value, onChange, onUploadStart, onUploadComplete, onUploadError }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);

  // Update fileName when value changes externally
  useEffect(() => {
    if (value) {
      // Extract filename from path
      const pathParts = value.split('/');
      const filename = pathParts[pathParts.length - 1];
      setFileName(filename);
    } else {
      setFileName(null);
    }
  }, [value]);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      if (onUploadError) onUploadError('Please select a PDF file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      if (onUploadError) onUploadError('PDF size must be less than 10MB');
      return;
    }

    // Show filename immediately
    setFileName(file.name);

    // Upload file
    setUploading(true);
    if (onUploadStart) onUploadStart();

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(API_ENDPOINTS.USER.UPLOAD_CERTIFICATION_PDF, {
        method: 'POST',
        headers: {
          'x-access-token': token,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      
      // Update the pdfUrl field
      if (onChange) {
        onChange({ target: { value: result.pdfUrl } });
      }

      if (onUploadComplete) onUploadComplete(result.pdfUrl);
    } catch (error) {
      setFileName(null);
      if (onUploadError) {
        onUploadError(error.message || 'Failed to upload PDF');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
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

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setFileName(null);
    if (onChange) {
      onChange({ target: { value: '' } });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (value) {
      const pdfUrl = value.startsWith('http') 
        ? value 
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${value}`;
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="w-full">
      
      {fileName ? (
        <div className="relative">
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MdPictureAsPdf className="text-red-500" size={32} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{fileName}</p>
                  <p className="text-xs text-gray-500">PDF Document</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="View PDF"
                >
                  <MdDownload size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Remove PDF"
                >
                  <MdClose size={20} />
                </button>
              </div>
            </div>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
              <div className="bg-white rounded px-4 py-2">
                <p className="text-sm font-medium">Uploading...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={uploading}
          />
          
          {uploading ? (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Uploading PDF...</p>
            </div>
          ) : (
            <>
              <MdCloudUpload className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-sm font-medium text-gray-700 mb-1">
                {isDragging ? 'Drop PDF here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">
                PDF up to 10MB
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

