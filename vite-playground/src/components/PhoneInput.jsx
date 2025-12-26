import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdPhone, MdArrowDropDown } from 'react-icons/md';

// Common country codes
const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
];

export default function PhoneInput({ value = '', onChange, placeholder, className = '', error, ...restProps }) {
  const [selectedCountryCode, setSelectedCountryCode] = useState('+61'); // Default to Australia
  const [localNumber, setLocalNumber] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isInternalChange = useRef(false);

  // Parse existing phone number on mount or when value changes from external source
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (value) {
      // Try to find matching country code
      const matchedCode = COUNTRY_CODES.find(country => value.startsWith(country.code));
      if (matchedCode) {
        const newLocalNumber = value.substring(matchedCode.code.length).trim();
        setSelectedCountryCode(matchedCode.code);
        setLocalNumber(newLocalNumber);
      } else {
        // If no match, assume it's just a local number
        setLocalNumber(value);
      }
    } else {
      setLocalNumber('');
    }
  }, [value]);

  // Update parent when country code or local number changes
  const notifyParent = useCallback((countryCode, number) => {
    const fullNumber = number.trim() 
      ? `${countryCode} ${number.trim()}`
      : '';
    
    if (onChange) {
      isInternalChange.current = true;
      const syntheticEvent = {
        target: {
          value: fullNumber,
        },
      };
      onChange(syntheticEvent);
    }
  }, [onChange]);

  const handleCountryCodeChange = (code) => {
    setSelectedCountryCode(code);
    setIsDropdownOpen(false);
    // Notify parent immediately
    notifyParent(code, localNumber);
  };

  const handleLocalNumberChange = (e) => {
    // Only allow digits, spaces, dashes, and parentheses
    const cleaned = e.target.value.replace(/[^\d\s\-()]/g, '');
    setLocalNumber(cleaned);
    // Notify parent immediately
    notifyParent(selectedCountryCode, cleaned);
  };

  const selectedCountry = COUNTRY_CODES.find(c => c.code === selectedCountryCode);

  return (
    <div className="w-full">
      <div className={`items-center flex relative w-full border ${
        error 
          ? 'border-red-500 focus-within:border-red-600' 
          : 'border-gray-200 focus-within:border-blue-500'
      } px-3 py-2 rounded-sm transition-colors ${error ? 'bg-red-50' : 'bg-white'}`}>
        <MdPhone className="text-gray-500 mr-2" size={18} />
        
        {/* Country Code Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded focus:outline-none"
          >
            <span className="text-sm">{selectedCountry?.flag || '🇦🇺'}</span>
            <span className="text-sm font-medium">{selectedCountryCode}</span>
            <MdArrowDropDown size={16} className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 max-h-64 overflow-y-auto w-48">
                {COUNTRY_CODES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountryCodeChange(country.code)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                      selectedCountryCode === country.code ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span>{country.flag}</span>
                    <span className="font-medium">{country.code}</span>
                    <span className="text-sm text-gray-500 ml-auto">{country.country}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={localNumber}
          onChange={handleLocalNumberChange}
          placeholder={placeholder || "4XX XXX XXX"}
          className={`flex-1 ml-2 outline-none bg-transparent ${className}`}
          {...restProps}
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}

