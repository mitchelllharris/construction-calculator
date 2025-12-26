import React, { useState, useEffect } from 'react';
import { MdClose, MdDelete, MdAdd } from 'react-icons/md';
import Input from '../Input';
import Button from '../Button';
import PDFUpload from '../PDFUpload';
import { useToast } from '../../contexts/ToastContext';

export default function CertificationEditModal({ isOpen, onClose, initialCertifications = [], onSave }) {
  const [certifications, setCertifications] = useState([]);
  const [saving, setSaving] = useState(false);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCertifications(initialCertifications.length > 0 
        ? initialCertifications.map(cert => ({
            name: cert.name || '',
            issuer: cert.issuer || '',
            issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString().slice(0, 10) : '',
            expirationDate: cert.expirationDate || cert.expiryDate ? new Date(cert.expirationDate || cert.expiryDate).toISOString().slice(0, 10) : '',
            credentialId: cert.credentialId || '',
            credentialUrl: cert.credentialUrl || '',
            pdfUrl: cert.pdfUrl || '',
          }))
        : [{ name: '', issuer: '', issueDate: '', expirationDate: '', credentialId: '', credentialUrl: '', pdfUrl: '' }]
      );
    }
  }, [isOpen, initialCertifications]);

  const handleAddCertification = () => {
    setCertifications([...certifications, {
      name: '',
      issuer: '',
      issueDate: '',
      expirationDate: '',
      credentialId: '',
      credentialUrl: '',
      pdfUrl: '',
    }]);
  };

  const handleRemoveCertification = (index) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const handleUpdateCertification = (index, field, value) => {
    const updated = [...certifications];
    updated[index] = { ...updated[index], [field]: value };
    setCertifications(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = certifications
        .filter(cert => cert.name.trim() || cert.issuer.trim())
        .map(cert => ({
          name: cert.name.trim(),
          issuer: cert.issuer.trim(),
          issueDate: cert.issueDate || null,
          expirationDate: cert.expirationDate || null,
          expiryDate: cert.expirationDate || null, // Also set expiryDate for backend compatibility
          credentialId: cert.credentialId.trim() || null,
          credentialUrl: cert.credentialUrl.trim() || null,
          pdfUrl: cert.pdfUrl.trim() || null,
        }));
      await onSave(cleaned);
      onClose();
    } catch (error) {
      console.error('Failed to save certifications:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Certifications</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {certifications.map((cert, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900">Certification {index + 1}</h3>
                {certifications.length > 1 && (
                  <button
                    onClick={() => handleRemoveCertification(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <MdDelete size={20} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <Input
                    value={cert.name}
                    onChange={(e) => handleUpdateCertification(index, 'name', e.target.value)}
                    placeholder="Certification Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuer</label>
                  <Input
                    value={cert.issuer}
                    onChange={(e) => handleUpdateCertification(index, 'issuer', e.target.value)}
                    placeholder="Issuing Organization"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <Input
                    type="date"
                    value={cert.issueDate}
                    onChange={(e) => handleUpdateCertification(index, 'issueDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                  <Input
                    type="date"
                    value={cert.expirationDate}
                    onChange={(e) => handleUpdateCertification(index, 'expirationDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID</label>
                  <Input
                    value={cert.credentialId}
                    onChange={(e) => handleUpdateCertification(index, 'credentialId', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credential URL</label>
                  <Input
                    type="url"
                    value={cert.credentialUrl}
                    onChange={(e) => handleUpdateCertification(index, 'credentialUrl', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="mt-4">
                <PDFUpload
                  value={cert.pdfUrl}
                  onChange={(e) => handleUpdateCertification(index, 'pdfUrl', e.target.value)}
                  onUploadComplete={(pdfUrl) => {
                    handleUpdateCertification(index, 'pdfUrl', pdfUrl);
                    showSuccess('PDF uploaded successfully');
                  }}
                  onUploadError={(error) => {
                    showError(error);
                  }}
                />
              </div>
            </div>
          ))}
          <button
            onClick={handleAddCertification}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <MdAdd size={20} />
            Add Another Certification
          </button>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            Cancel
          </button>
          <Button
            onClick={handleSave}
            disabled={saving}
            text={saving ? 'Saving...' : 'Save'}
          />
        </div>
      </div>
    </div>
  );
}

