import React, { useState, useEffect } from 'react';
import { MdClose, MdDelete } from 'react-icons/md';
import Input from '../Input';
import Button from '../Button';
import PDFUpload from '../PDFUpload';
import { useToast } from '../../contexts/ToastContext';

export default function CertificationEntryModal({ 
  isOpen, 
  onClose, 
  initialCertification = null, 
  onSave,
  onDelete 
}) {
  const [certification, setCertification] = useState({
    name: '',
    issuer: '',
    issueDate: '',
    expirationDate: '',
    credentialId: '',
    credentialUrl: '',
    pdfUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const isNew = !initialCertification;
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (initialCertification) {
        setCertification({
          name: initialCertification.name || '',
          issuer: initialCertification.issuer || '',
          issueDate: initialCertification.issueDate ? new Date(initialCertification.issueDate).toISOString().slice(0, 10) : '',
          expirationDate: initialCertification.expirationDate || initialCertification.expiryDate ? new Date(initialCertification.expirationDate || initialCertification.expiryDate).toISOString().slice(0, 10) : '',
          credentialId: initialCertification.credentialId || '',
          credentialUrl: initialCertification.credentialUrl || '',
          pdfUrl: initialCertification.pdfUrl || '',
        });
      } else {
        setCertification({
          name: '',
          issuer: '',
          issueDate: '',
          expirationDate: '',
          credentialId: '',
          credentialUrl: '',
          pdfUrl: '',
        });
      }
    }
  }, [isOpen, initialCertification]);

  const handleUpdate = (field, value) => {
    setCertification(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!certification.name.trim() && !certification.issuer.trim()) {
      showError('Please provide at least a name or issuer');
      return;
    }
    setSaving(true);
    try {
      const cleaned = {
        name: certification.name.trim(),
        issuer: certification.issuer.trim(),
        issueDate: certification.issueDate || null,
        expirationDate: certification.expirationDate || null,
        expiryDate: certification.expirationDate || null,
        credentialId: certification.credentialId.trim() || null,
        credentialUrl: certification.credentialUrl.trim() || null,
        pdfUrl: certification.pdfUrl.trim() || null,
      };
      await onSave(cleaned);
      onClose();
    } catch (error) {
      console.error('Failed to save certification:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this certification?')) {
      setSaving(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Failed to delete certification:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isNew ? 'Add Certification' : 'Edit Certification'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <Input
            label="Certification Name"
            value={certification.name}
            onChange={(e) => handleUpdate('name', e.target.value)}
            placeholder="e.g., Licensed Electrician"
          />
          <Input
            label="Issuing Organization"
            value={certification.issuer}
            onChange={(e) => handleUpdate('issuer', e.target.value)}
            placeholder="Organization name"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Issue Date"
              type="date"
              value={certification.issueDate}
              onChange={(e) => handleUpdate('issueDate', e.target.value)}
            />
            <Input
              label="Expiration Date"
              type="date"
              value={certification.expirationDate}
              onChange={(e) => handleUpdate('expirationDate', e.target.value)}
            />
          </div>
          <Input
            label="Credential ID"
            value={certification.credentialId}
            onChange={(e) => handleUpdate('credentialId', e.target.value)}
            placeholder="License or credential number"
          />
          <Input
            label="Credential URL"
            value={certification.credentialUrl}
            onChange={(e) => handleUpdate('credentialUrl', e.target.value)}
            placeholder="https://..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certification PDF
            </label>
            <PDFUpload
              value={certification.pdfUrl}
              onChange={(e) => handleUpdate('pdfUrl', e.target.value)}
              onUploadComplete={(pdfUrl) => {
                handleUpdate('pdfUrl', pdfUrl);
                showSuccess('PDF uploaded successfully');
              }}
              onUploadError={(error) => {
                showError(error);
              }}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <MdDelete size={18} />
              Delete
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <Button
              onClick={handleSave}
              disabled={saving || (!certification.name.trim() && !certification.issuer.trim())}
              text={saving ? 'Saving...' : 'Save'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

