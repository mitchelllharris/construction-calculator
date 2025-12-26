import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';

export default function TagInput({ 
  tags = [], 
  onChange, 
  placeholder = "Type and press Enter to add",
  maxTags,
  className = '',
  tagClassName = '',
  disabled = false
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (disabled) return;

    // Add tag on Enter
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      
      // Check if tag already exists (case-insensitive)
      if (tags.some(tag => tag.toLowerCase() === newTag.toLowerCase())) {
        setInputValue('');
        return;
      }

      // Check max tags limit
      if (maxTags && tags.length >= maxTags) {
        return;
      }

      // Add new tag
      const newTags = [...tags, newTag];
      onChange(newTags);
      setInputValue('');
    }
    
    // Remove last tag on Backspace if input is empty
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      const newTags = tags.slice(0, -1);
      onChange(newTags);
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    if (disabled) return;
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    onChange(newTags);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Input Field */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || (maxTags && tags.length >= maxTags)}
        className={`w-full border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors ${
          disabled || (maxTags && tags.length >= maxTags) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        }`}
      />
      
      {/* Tags Display - Under the input */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className={`group relative inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium transition-colors ${tagClassName}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(index)}
                disabled={disabled}
                className="ml-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 hover:bg-blue-200 rounded-full p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove tag"
                aria-label="Remove tag"
              >
                <MdClose size={14} className="text-black" />
              </button>
            </span>
          ))}
        </div>
      )}
      
      {maxTags && (
        <p className="text-xs text-gray-500 mt-1">
          {tags.length} / {maxTags} tags
        </p>
      )}
    </div>
  );
}

