import React, { useState, useEffect } from 'react';
import { MdClose, MdDelete } from 'react-icons/md';
import Input from '../Input';
import Button from '../Button';

export default function EducationEntryModal({ 
  isOpen, 
  onClose, 
  initialEducation = null, 
  onSave,
  onDelete 
}) {
  const [education, setEducation] = useState({
    school: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
    grade: '',
  });
  const [saving, setSaving] = useState(false);
  const isNew = !initialEducation;

  useEffect(() => {
    if (isOpen) {
      if (initialEducation) {
        setEducation({
          school: initialEducation.school || '',
          degree: initialEducation.degree || '',
          fieldOfStudy: initialEducation.fieldOfStudy || '',
          startDate: initialEducation.startDate ? new Date(initialEducation.startDate).toISOString().slice(0, 10) : '',
          endDate: initialEducation.endDate ? new Date(initialEducation.endDate).toISOString().slice(0, 10) : '',
          isCurrent: initialEducation.isCurrent || false,
          description: initialEducation.description || '',
          grade: initialEducation.grade || '',
        });
      } else {
        setEducation({
          school: '',
          degree: '',
          fieldOfStudy: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          description: '',
          grade: '',
        });
      }
    }
  }, [isOpen, initialEducation]);

  const handleUpdate = (field, value) => {
    setEducation(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'isCurrent' && value === true) {
        updated.endDate = '';
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!education.school.trim()) {
      return;
    }
    setSaving(true);
    try {
      const cleaned = {
        school: education.school.trim(),
        degree: education.degree.trim() || null,
        fieldOfStudy: education.fieldOfStudy.trim() || null,
        startDate: education.startDate || null,
        endDate: education.isCurrent ? null : (education.endDate || null),
        isCurrent: education.isCurrent || false,
        description: education.description.trim() || null,
        grade: education.grade.trim() || null,
      };
      await onSave(cleaned);
      onClose();
    } catch (error) {
      console.error('Failed to save education:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this education entry?')) {
      setSaving(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Failed to delete education:', error);
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
            {isNew ? 'Add Education' : 'Edit Education'}
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
            label="School *"
            value={education.school}
            onChange={(e) => handleUpdate('school', e.target.value)}
            placeholder="University or School name"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Degree"
              value={education.degree}
              onChange={(e) => handleUpdate('degree', e.target.value)}
              placeholder="e.g., Bachelor's, Master's"
            />
            <Input
              label="Field of Study"
              value={education.fieldOfStudy}
              onChange={(e) => handleUpdate('fieldOfStudy', e.target.value)}
              placeholder="e.g., Computer Science"
            />
          </div>
          <Input
            label="Grade"
            value={education.grade}
            onChange={(e) => handleUpdate('grade', e.target.value)}
            placeholder="e.g., 3.8 GPA, First Class Honours"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={education.startDate}
              onChange={(e) => handleUpdate('startDate', e.target.value)}
            />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={education.isCurrent}
                  onChange={(e) => handleUpdate('isCurrent', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isCurrent" className="text-sm text-gray-700">
                  Currently studying here
                </label>
              </div>
              {!education.isCurrent && (
                <Input
                  label="End Date"
                  type="date"
                  value={education.endDate}
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
              value={education.description}
              onChange={(e) => handleUpdate('description', e.target.value)}
              placeholder="Describe your education, achievements, or relevant coursework..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              disabled={saving || !education.school.trim()}
              text={saving ? 'Saving...' : 'Save'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

