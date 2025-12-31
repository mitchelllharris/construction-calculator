import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdPhone, MdArrowDropDown } from 'react-icons/md';

// Common country codes
// Countries marked with removeLeadingZero: true use '0' as a trunk prefix that should be removed in international format
// Countries marked with removeLeadingZero: false either don't use '0' or have it integrated into the number
const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸', removeLeadingZero: false }, // Uses '1' as prefix, not '0'
  { code: '+61', country: 'Australia', flag: '🇦🇺', removeLeadingZero: true },
  { code: '+44', country: 'UK', flag: '🇬🇧', removeLeadingZero: true },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿', removeLeadingZero: true },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', removeLeadingZero: true },
  { code: '+33', country: 'France', flag: '🇫🇷', removeLeadingZero: true },
  { code: '+49', country: 'Germany', flag: '🇩🇪', removeLeadingZero: true },
  { code: '+39', country: 'Italy', flag: '🇮🇹', removeLeadingZero: false }, // '0' is part of the number
  { code: '+34', country: 'Spain', flag: '🇪🇸', removeLeadingZero: true },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱', removeLeadingZero: true },
  { code: '+32', country: 'Belgium', flag: '🇧🇪', removeLeadingZero: true },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭', removeLeadingZero: true },
  { code: '+46', country: 'Sweden', flag: '🇸🇪', removeLeadingZero: true },
  { code: '+47', country: 'Norway', flag: '🇳🇴', removeLeadingZero: true },
  { code: '+45', country: 'Denmark', flag: '🇩🇰', removeLeadingZero: true },
  { code: '+358', country: 'Finland', flag: '🇫🇮', removeLeadingZero: true },
  { code: '+353', country: 'Ireland', flag: '🇮🇪', removeLeadingZero: true },
  { code: '+351', country: 'Portugal', flag: '🇵🇹', removeLeadingZero: true },
  { code: '+30', country: 'Greece', flag: '🇬🇷', removeLeadingZero: true },
  { code: '+48', country: 'Poland', flag: '🇵🇱', removeLeadingZero: true },
  { code: '+81', country: 'Japan', flag: '🇯🇵', removeLeadingZero: true },
  { code: '+82', country: 'South Korea', flag: '🇰🇷', removeLeadingZero: true },
  { code: '+86', country: 'China', flag: '🇨🇳', removeLeadingZero: true }, // Landlines only
  { code: '+91', country: 'India', flag: '🇮🇳', removeLeadingZero: true }, // Landlines only
  { code: '+65', country: 'Singapore', flag: '🇸🇬', removeLeadingZero: false }, // No trunk prefix
  { code: '+60', country: 'Malaysia', flag: '🇲🇾', removeLeadingZero: true },
  { code: '+66', country: 'Thailand', flag: '🇹🇭', removeLeadingZero: true },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩', removeLeadingZero: true },
  { code: '+63', country: 'Philippines', flag: '🇵🇭', removeLeadingZero: true },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳', removeLeadingZero: true },
  { code: '+971', country: 'UAE', flag: '🇦🇪', removeLeadingZero: false }, // No trunk prefix
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', removeLeadingZero: false }, // No trunk prefix
  { code: '+55', country: 'Brazil', flag: '🇧🇷', removeLeadingZero: true },
  { code: '+52', country: 'Mexico', flag: '🇲🇽', removeLeadingZero: true },
  { code: '+54', country: 'Argentina', flag: '🇦🇷', removeLeadingZero: true },
  { code: '+56', country: 'Chile', flag: '🇨🇱', removeLeadingZero: true },
  { code: '+57', country: 'Colombia', flag: '🇨🇴', removeLeadingZero: true },
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
        let newLocalNumber = value.substring(matchedCode.code.length).trim();
        // Remove leading 0 only if this country uses it as a trunk prefix
        // In international format, leading zeros from area codes are omitted for these countries
        // Example: +61 02 1234 5678 should become +61 2 1234 5678
        if (matchedCode.removeLeadingZero && newLocalNumber.startsWith('0')) {
          newLocalNumber = newLocalNumber.substring(1);
        }
        setSelectedCountryCode(matchedCode.code);
        setLocalNumber(newLocalNumber);
      } else {
        // If no match, assume it's just a local number
        // If a country code is already selected and number starts with 0, remove it only if that country uses 0 as trunk prefix
        let localValue = value;
        const selectedCountry = COUNTRY_CODES.find(c => c.code === selectedCountryCode);
        if (selectedCountry?.removeLeadingZero && localValue.startsWith('0')) {
          localValue = localValue.substring(1);
        }
        setLocalNumber(localValue);
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
    let cleaned = e.target.value.replace(/[^\d\s\-()]/g, '');
    
    // Remove leading 0 only for countries that use it as a trunk prefix
    // In international format, leading zeros from area codes are omitted for these countries
    // Example: Australian (02 1234 5678) becomes +61 2 1234 5678 (0 removed)
    // But for countries like Italy or US/Canada, the 0 should be kept or doesn't exist
    const selectedCountry = COUNTRY_CODES.find(c => c.code === selectedCountryCode);
    if (selectedCountry?.removeLeadingZero && cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
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

