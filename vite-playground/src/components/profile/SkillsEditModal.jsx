import React, { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import TagInput from '../TagInput';
import Button from '../Button';

export default function SkillsEditModal({ isOpen, onClose, initialSkills = [], onSave }) {
  const [skills, setSkills] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSkills(initialSkills || []);
    }
  }, [isOpen, initialSkills]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(skills);
      onClose();
    } catch (error) {
      console.error('Failed to save skills:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Skills</h2>
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
              Skills
            </label>
            <TagInput
              tags={skills}
              onChange={setSkills}
              placeholder="Type a skill and press Enter (e.g., Electrical Installation)"
            />
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

