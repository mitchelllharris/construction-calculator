import React, { useState, useEffect } from 'react';
import { MdClose, MdDelete, MdAdd } from 'react-icons/md';
import Input from '../Input';
import Button from '../Button';
import TagInput from '../TagInput';

export default function ExperienceEditModal({ isOpen, onClose, initialExperience = [], onSave }) {
  const [experiences, setExperiences] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExperiences(initialExperience.length > 0 
        ? initialExperience.map(exp => ({
            position: exp.position || '',
            company: exp.company || '',
            location: exp.location || '',
            startDate: exp.startDate ? new Date(exp.startDate).toISOString().slice(0, 10) : '',
            endDate: exp.endDate ? new Date(exp.endDate).toISOString().slice(0, 10) : '',
            isCurrent: exp.isCurrent || false,
            description: exp.description || '',
            duties: exp.duties || [],
          }))
        : [{ position: '', company: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '', duties: [] }]
      );
    }
  }, [isOpen, initialExperience]);

  const handleAddExperience = () => {
    setExperiences([...experiences, {
      position: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: '',
      duties: [],
    }]);
  };

  const handleRemoveExperience = (index) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const handleUpdateExperience = (index, field, value) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    
    // If isCurrent is true, clear endDate
    if (field === 'isCurrent' && value === true) {
      updated[index].endDate = '';
    }
    
    setExperiences(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = experiences
        .filter(exp => exp.position.trim())
        .map(exp => ({
          position: exp.position.trim(),
          company: exp.company.trim() || null,
          location: exp.location.trim() || null,
          startDate: exp.startDate || null,
          endDate: exp.isCurrent ? null : (exp.endDate || null),
          isCurrent: exp.isCurrent || false,
          description: exp.description.trim() || null,
          duties: Array.isArray(exp.duties) ? exp.duties.filter(d => d.trim()) : [],
        }));
      await onSave(cleaned);
      onClose();
    } catch (error) {
      console.error('Failed to save experience:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Experience</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {experiences.map((exp, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900">Experience {index + 1}</h3>
                {experiences.length > 1 && (
                  <button
                    onClick={() => handleRemoveExperience(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <MdDelete size={20} />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position/Title *</label>
                    <Input
                      value={exp.position}
                      onChange={(e) => handleUpdateExperience(index, 'position', e.target.value)}
                      placeholder="e.g., Electrician, Senior Plumber"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <Input
                      value={exp.company}
                      onChange={(e) => handleUpdateExperience(index, 'company', e.target.value)}
                      placeholder="Company Name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <Input
                    value={exp.location}
                    onChange={(e) => handleUpdateExperience(index, 'location', e.target.value)}
                    placeholder="e.g., Sydney, NSW, Australia"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <Input
                      type="date"
                      value={exp.startDate}
                      onChange={(e) => handleUpdateExperience(index, 'startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={exp.endDate}
                        onChange={(e) => handleUpdateExperience(index, 'endDate', e.target.value)}
                        disabled={exp.isCurrent}
                      />
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={exp.isCurrent}
                          onChange={(e) => handleUpdateExperience(index, 'isCurrent', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>I currently work here</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={exp.description}
                    onChange={(e) => handleUpdateExperience(index, 'description', e.target.value)}
                    rows={4}
                    className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Describe your role and responsibilities..."
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {exp.description.length} / 2000 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Duties & Responsibilities</label>
                  <TagInput
                    tags={exp.duties || []}
                    onChange={(duties) => handleUpdateExperience(index, 'duties', duties)}
                    placeholder="Type a duty and press Enter (e.g., Electrical Installation)"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={handleAddExperience}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <MdAdd size={20} />
            Add Another Experience
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
