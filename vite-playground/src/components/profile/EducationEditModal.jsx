import React, { useState, useEffect } from 'react';
import { MdClose, MdDelete, MdAdd } from 'react-icons/md';
import Input from '../Input';
import Button from '../Button';

export default function EducationEditModal({ isOpen, onClose, initialEducation = [], onSave }) {
  const [educations, setEducations] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEducations(initialEducation.length > 0 
        ? initialEducation.map(edu => ({
            school: edu.school || '',
            degree: edu.degree || '',
            fieldOfStudy: edu.fieldOfStudy || '',
            startDate: edu.startDate ? new Date(edu.startDate).toISOString().slice(0, 10) : '',
            endDate: edu.endDate ? new Date(edu.endDate).toISOString().slice(0, 10) : '',
            isCurrent: edu.isCurrent || false,
            description: edu.description || '',
            grade: edu.grade || '',
          }))
        : [{ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', isCurrent: false, description: '', grade: '' }]
      );
    }
  }, [isOpen, initialEducation]);

  const handleAddEducation = () => {
    setEducations([...educations, {
      school: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: '',
      grade: '',
    }]);
  };

  const handleRemoveEducation = (index) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  const handleUpdateEducation = (index, field, value) => {
    const updated = [...educations];
    updated[index] = { ...updated[index], [field]: value };
    
    // If isCurrent is true, clear endDate
    if (field === 'isCurrent' && value === true) {
      updated[index].endDate = '';
    }
    
    setEducations(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = educations
        .filter(edu => edu.school.trim())
        .map(edu => ({
          school: edu.school.trim(),
          degree: edu.degree.trim() || null,
          fieldOfStudy: edu.fieldOfStudy.trim() || null,
          startDate: edu.startDate || null,
          endDate: edu.isCurrent ? null : (edu.endDate || null),
          isCurrent: edu.isCurrent || false,
          description: edu.description.trim() || null,
          grade: edu.grade.trim() || null,
        }));
      await onSave(cleaned);
      onClose();
    } catch (error) {
      console.error('Failed to save education:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Education</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {educations.map((edu, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900">Education #{index + 1}</h3>
                {educations.length > 1 && (
                  <button
                    onClick={() => handleRemoveEducation(index)}
                    className="text-red-600 hover:text-red-700 transition-colors"
                  >
                    <MdDelete size={20} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="School *"
                  value={edu.school}
                  onChange={(e) => handleUpdateEducation(index, 'school', e.target.value)}
                  placeholder="University or School name"
                />
                <Input
                  label="Degree"
                  value={edu.degree}
                  onChange={(e) => handleUpdateEducation(index, 'degree', e.target.value)}
                  placeholder="e.g., Bachelor's, Master's"
                />
                <Input
                  label="Field of Study"
                  value={edu.fieldOfStudy}
                  onChange={(e) => handleUpdateEducation(index, 'fieldOfStudy', e.target.value)}
                  placeholder="e.g., Computer Science, Business"
                />
                <Input
                  label="Grade"
                  value={edu.grade}
                  onChange={(e) => handleUpdateEducation(index, 'grade', e.target.value)}
                  placeholder="e.g., 3.8 GPA, First Class Honours"
                />
                <div className="md:col-span-2">
                  <Input
                    label="Start Date"
                    type="date"
                    value={edu.startDate}
                    onChange={(e) => handleUpdateEducation(index, 'startDate', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id={`current-${index}`}
                      checked={edu.isCurrent}
                      onChange={(e) => handleUpdateEducation(index, 'isCurrent', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`current-${index}`} className="text-sm text-gray-700">
                      Currently studying here
                    </label>
                  </div>
                  {!edu.isCurrent && (
                    <Input
                      label="End Date"
                      type="date"
                      value={edu.endDate}
                      onChange={(e) => handleUpdateEducation(index, 'endDate', e.target.value)}
                    />
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={edu.description}
                    onChange={(e) => handleUpdateEducation(index, 'description', e.target.value)}
                    placeholder="Describe your education, achievements, or relevant coursework..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={handleAddEducation}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <MdAdd size={20} />
            Add Another Education
          </button>
          <div className="flex gap-3">
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
    </div>
  );
}

