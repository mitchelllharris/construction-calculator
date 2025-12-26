import React, { useState, useEffect, useRef } from 'react';
import { MdLink } from 'react-icons/md';

export default function WebsiteInput({ value = '', onChange, placeholder, className = '', error, ...restProps }) {
  const [localValue, setLocalValue] = useState('');
  const isInternalChange = useRef(false);

  // Parse existing value on mount or when value changes from external source
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (value) {
      // Remove https:// or http:// if present
      const cleaned = value.replace(/^https?:\/\//, '');
      setLocalValue(cleaned);
    } else {
      setLocalValue('');
    }
  }, [value]);

  const notifyParent = (urlValue) => {
    const fullUrl = urlValue.trim() 
      ? (urlValue.trim().startsWith('http://') || urlValue.trim().startsWith('https://')
          ? urlValue.trim()
          : `https://${urlValue.trim()}`)
      : '';
    
    if (onChange) {
      isInternalChange.current = true;
      const syntheticEvent = {
        target: {
          value: fullUrl,
        },
      };
      onChange(syntheticEvent);
    }
  };

  const handleChange = (e) => {
    let inputValue = e.target.value;
    
    // Remove https:// or http:// if user tries to type it
    inputValue = inputValue.replace(/^https?:\/\//, '');
    
    setLocalValue(inputValue);
    notifyParent(inputValue);
  };

  const handleBlur = (e) => {
    // Ensure https:// is added when user leaves the field (if there's a value)
    const trimmed = localValue.trim();
    if (trimmed) {
      setLocalValue(trimmed);
      notifyParent(trimmed);
    }
    if (restProps.onBlur) {
      restProps.onBlur(e);
    }
  };

  return (
    <div className="w-full">
      <div className={`items-center flex relative w-full border ${
        error 
          ? 'border-red-500 focus-within:border-red-600' 
          : 'border-gray-200 focus-within:border-blue-500'
      } px-3 py-2 rounded-sm transition-colors ${error ? 'bg-red-50' : 'bg-white'}`}>
        <div className="flex items-center mr-2 text-gray-500">
          <span className="text-sm font-medium">https://</span>
        </div>
        <MdLink className="text-gray-500 mr-2" size={18} />
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder || "yourwebsite.com"}
          className={`flex-1 outline-none bg-transparent ${className}`}
          {...restProps}
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}

