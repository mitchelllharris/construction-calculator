import React, { useState, useEffect } from 'react';
import { MdClose, MdDelete } from 'react-icons/md';
import Input from '../Input';
import Button from '../Button';
import ImageGallery from '../ImageGallery';
import { useToast } from '../../contexts/ToastContext';

export default function PortfolioEntryModal({ 
  isOpen, 
  onClose, 
  initialPortfolio = null, 
  onSave,
  onDelete 
}) {
  const [portfolio, setPortfolio] = useState({
    title: '',
    description: '',
    images: [],
    date: '',
    location: '',
  });
  const [saving, setSaving] = useState(false);
  const isNew = !initialPortfolio;
  const { showError } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (initialPortfolio) {
        setPortfolio({
          title: initialPortfolio.title || '',
          description: initialPortfolio.description || '',
          images: initialPortfolio.images || [],
          date: initialPortfolio.date ? new Date(initialPortfolio.date).toISOString().slice(0, 10) : '',
          location: initialPortfolio.location || '',
        });
      } else {
        setPortfolio({
          title: '',
          description: '',
          images: [],
          date: '',
          location: '',
        });
      }
    }
  }, [isOpen, initialPortfolio]);

  const handleUpdate = (field, value) => {
    setPortfolio(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!portfolio.title.trim()) {
      showError('Please provide a project title');
      return;
    }
    setSaving(true);
    try {
      const cleaned = {
        title: portfolio.title.trim(),
        description: portfolio.description.trim() || null,
        images: Array.isArray(portfolio.images) ? portfolio.images.filter(img => img && img.trim()) : [],
        date: portfolio.date || null,
        location: portfolio.location.trim() || null,
      };
      await onSave(cleaned);
      onClose();
    } catch (error) {
      console.error('Failed to save portfolio:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this portfolio project?')) {
      setSaving(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Failed to delete portfolio:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isNew ? 'Add Portfolio Project' : 'Edit Portfolio Project'}
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
            label="Project Title *"
            value={portfolio.title}
            onChange={(e) => handleUpdate('title', e.target.value)}
            placeholder="Project Title"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={portfolio.description}
              onChange={(e) => handleUpdate('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Project Description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Images (Gallery)
            </label>
            <ImageGallery
              images={portfolio.images || []}
              onChange={(images) => handleUpdate('images', images)}
              maxSizeMB={5}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Project Date"
              type="date"
              value={portfolio.date}
              onChange={(e) => handleUpdate('date', e.target.value)}
            />
            <Input
              label="Location"
              value={portfolio.location}
              onChange={(e) => handleUpdate('location', e.target.value)}
              placeholder="Project Location"
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
              disabled={saving || !portfolio.title.trim()}
              text={saving ? 'Saving...' : 'Save'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

