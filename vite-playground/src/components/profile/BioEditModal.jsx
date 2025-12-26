import React, { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import Button from '../Button';
import { useToast } from '../../contexts/ToastContext';

export default function BioEditModal({ isOpen, onClose, initialBio = '', onSave }) {
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Strip any existing links from initial bio
      const cleanedBio = removeLinks(initialBio || '');
      setBio(cleanedBio);
    }
  }, [isOpen, initialBio]);

  // Function to detect and remove URLs/links
  const removeLinks = (text) => {
    if (!text) return '';
    
    // Remove URLs (http://, https://, www., etc.)
    let cleaned = text
      // Remove http:// and https:// URLs (most specific first)
      .replace(/https?:\/\/[^\s]+/gi, '')
      // Remove www. URLs
      .replace(/www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*/gi, '')
      // Remove email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned;
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Check if the input contains URLs (more specific patterns)
    const urlPattern = /(https?:\/\/|www\.|@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    if (urlPattern.test(inputValue)) {
      // Remove links and show warning
      const cleaned = removeLinks(inputValue);
      setBio(cleaned);
      showError('Links are not allowed in the about section. Please use text and emojis only.');
    } else {
      setBio(inputValue);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Check if pasted text contains URLs
    const urlPattern = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi;
    if (urlPattern.test(pastedText)) {
      const cleaned = removeLinks(pastedText);
      setBio(bio + cleaned);
      showError('Links were removed from pasted text. Only text and emojis are allowed.');
    } else {
      setBio(bio + pastedText);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Final cleanup before saving
      const cleanedBio = removeLinks(bio);
      await onSave(cleanedBio);
      onClose();
    } catch (error) {
      console.error('Failed to save bio:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit About</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              About Me
            </label>
            <textarea
              value={bio}
              onChange={handleChange}
              onPaste={handlePaste}
              rows={8}
              maxLength={2000}
              className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Tell potential clients about yourself, your experience, and what makes you unique... (Text and emojis only, no links)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Text and emojis only. Links will be automatically removed.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {bio.length} / 2000 characters
            </p>
          </div>
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

