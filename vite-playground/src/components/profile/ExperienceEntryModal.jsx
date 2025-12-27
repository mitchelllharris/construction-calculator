import React, { useState, useEffect } from 'react';
import { MdClose, MdDelete } from 'react-icons/md';
import Input from '../Input';
import Button from '../Button';
import TagInput from '../TagInput';

export default function ExperienceEntryModal({ 
  isOpen, 
  onClose, 
  initialExperience = null, 
  onSave,
  onDelete 
}) {
  const [experience, setExperience] = useState({
    position: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
    duties: [],
  });
  const [saving, setSaving] = useState(false);
  const isNew = !initialExperience;

  useEffect(() => {
    if (isOpen) {
      if (initialExperience) {
        setExperience({
          position: initialExperience.position || '',
          company: initialExperience.company || '',
          location: initialExperience.location || '',
          startDate: initialExperience.startDate ? new Date(initialExperience.startDate).toISOString().slice(0, 10) : '',
          endDate: initialExperience.endDate ? new Date(initialExperience.endDate).toISOString().slice(0, 10) : '',
          isCurrent: initialExperience.isCurrent || false,
          description: initialExperience.description || '',
          duties: initialExperience.duties || [],
        });
      } else {
        setExperience({
          position: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          description: '',
          duties: [],
        });
      }
    }
  }, [isOpen, initialExperience]);

  const handleUpdate = (field, value) => {
    setExperience(prev => {
      const updated = { ...prev, [field]: value };
      // If isCurrent is true, clear endDate
      if (field === 'isCurrent' && value === true) {
        updated.endDate = '';
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!experience.position.trim()) {
      return;
    }
    setSaving(true);
    try {
      const cleaned = {
        position: experience.position.trim(),
        company: experience.company.trim() || null,
        location: experience.location.trim() || null,
        startDate: experience.startDate || null,
        endDate: experience.isCurrent ? null : (experience.endDate || null),
        isCurrent: experience.isCurrent || false,
        description: experience.description.trim() || null,
        duties: Array.isArray(experience.duties) ? experience.duties.filter(d => d.trim()) : [],
      };
      await onSave(cleaned);
      onClose();
    } catch (error) {
      console.error('Failed to save experience:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this experience entry?')) {
      setSaving(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Failed to delete experience:', error);
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
            {isNew ? 'Add Experience' : 'Edit Experience'}
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
            label="Position *"
            value={experience.position}
            onChange={(e) => handleUpdate('position', e.target.value)}
            placeholder="e.g., Senior Electrician"
          />
          <Input
            label="Company"
            value={experience.company}
            onChange={(e) => handleUpdate('company', e.target.value)}
            placeholder="Company name"
          />
          <Input
            label="Location"
            value={experience.location}
            onChange={(e) => handleUpdate('location', e.target.value)}
            placeholder="City, State"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={experience.startDate}
              onChange={(e) => handleUpdate('startDate', e.target.value)}
            />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={experience.isCurrent}
                  onChange={(e) => handleUpdate('isCurrent', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isCurrent" className="text-sm text-gray-700">
                  I currently work here
                </label>
              </div>
              {!experience.isCurrent && (
                <Input
                  label="End Date"
                  type="date"
                  value={experience.endDate}
                  onChange={(e) => handleUpdate('endDate', e.target.value)}
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={experience.description}
              onChange={(e) => handleUpdate('description', e.target.value)}
              placeholder="Describe your role and responsibilities..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Duties
            </label>
            <TagInput
              tags={experience.duties}
              onChange={(duties) => handleUpdate('duties', duties)}
              placeholder="Type a duty and press Enter"
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
              disabled={saving || !experience.position.trim()}
              text={saving ? 'Saving...' : 'Save'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

