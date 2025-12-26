import React, { useState, useEffect } from 'react';
import { MdClose, MdDelete, MdAdd } from 'react-icons/md';
import Input from '../Input';
import Button from '../Button';
import ImageUpload from '../ImageUpload';
import { useToast } from '../../contexts/ToastContext';

export default function PortfolioEditModal({ isOpen, onClose, initialPortfolio = [], onSave }) {
  const [portfolio, setPortfolio] = useState([]);
  const [saving, setSaving] = useState(false);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPortfolio(initialPortfolio.length > 0 
        ? initialPortfolio.map(item => ({
            title: item.title || '',
            description: item.description || '',
            imageUrl: item.imageUrl || '',
            projectDate: item.projectDate ? new Date(item.projectDate).toISOString().slice(0, 10) : '',
            projectLocation: item.projectLocation || '',
          }))
        : [{ title: '', description: '', imageUrl: '', projectDate: '', projectLocation: '' }]
      );
    }
  }, [isOpen, initialPortfolio]);

  const handleAddItem = () => {
    setPortfolio([...portfolio, {
      title: '',
      description: '',
      imageUrl: '',
      projectDate: '',
      projectLocation: '',
    }]);
  };

  const handleRemoveItem = (index) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...portfolio];
    updated[index] = { ...updated[index], [field]: value };
    setPortfolio(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = portfolio
        .filter(item => item.title.trim())
        .map(item => ({
          title: item.title.trim(),
          description: item.description.trim() || null,
          imageUrl: item.imageUrl.trim() || null,
          projectDate: item.projectDate || null,
          projectLocation: item.projectLocation.trim() || null,
        }));
      await onSave(cleaned);
      onClose();
    } catch (error) {
      console.error('Failed to save portfolio:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Portfolio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {portfolio.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900">Project {index + 1}</h3>
                {portfolio.length > 1 && (
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <MdDelete size={20} />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <Input
                    value={item.title}
                    onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
                    placeholder="Project Title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Project Description"
                  />
                </div>
                <ImageUpload
                  value={item.imageUrl}
                  onChange={(e) => handleUpdateItem(index, 'imageUrl', e.target.value)}
                  onUploadComplete={(imageUrl) => {
                    handleUpdateItem(index, 'imageUrl', imageUrl);
                    showSuccess('Image uploaded successfully');
                  }}
                  onUploadError={(error) => {
                    showError(error);
                  }}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Date</label>
                  <Input
                    type="date"
                    value={item.projectDate}
                    onChange={(e) => handleUpdateItem(index, 'projectDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <Input
                    value={item.projectLocation}
                    onChange={(e) => handleUpdateItem(index, 'projectLocation', e.target.value)}
                    placeholder="Project Location"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={handleAddItem}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <MdAdd size={20} />
            Add Another Project
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

