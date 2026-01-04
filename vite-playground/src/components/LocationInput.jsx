import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { MdLocationOn, MdMyLocation } from 'react-icons/md';

// Keep libraries array as a constant to prevent LoadScript reload
// For Places API (New), we use REST API, so we don't need the places library
const libraries = [];

export default function LocationInput({
  value = null,
  onChange,
  placeholder = 'Search for a location...',
  className = '',
  showCurrentLocation = true,
  format = 'full', // 'full' for full address object, 'simple' for city/state/country, 'string' for string
  required = false,
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const inputRef = useRef(null);
  const predictionsRef = useRef(null);
  const sessionTokenRef = useRef(null);

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Memoize the load script options to prevent unnecessary reloads
  const loadScriptOptions = useMemo(() => ({
    googleMapsApiKey: API_KEY,
    libraries,
    version: 'weekly',
  }), []);

  const { isLoaded, loadError } = useLoadScript(loadScriptOptions);

  useEffect(() => {
    if (value) {
      // Set input value based on format
      if (format === 'string') {
        setInputValue(value || '');
      } else if (format === 'simple' && typeof value === 'object') {
        const parts = [];
        if (value.city) parts.push(value.city);
        if (value.state) parts.push(value.state);
        if (value.country) parts.push(value.country);
        setInputValue(parts.join(', ') || '');
      } else if (format === 'full' && typeof value === 'object' && value.formattedAddress) {
        setInputValue(value.formattedAddress || '');
      } else if (format === 'full' && typeof value === 'object' && value.name) {
        setInputValue(value.name || '');
      }
    } else {
      setInputValue('');
    }
  }, [value, format]);

  // Memoize the onChange handler to prevent infinite loops
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Generate session token for Places API (New)
  const generateSessionToken = () => {
    // Simple session token generation (UUID-like)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Get autocomplete predictions using Places API (New) REST API
  const getAutocompletePredictions = async (input) => {
    if (!input.trim() || !API_KEY) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken();
    }

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places:autocomplete?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
          },
          body: JSON.stringify({
            input: input,
            includedRegionCodes: [],
            includedPrimaryTypes: ['establishment', 'geocode'],
            sessionToken: sessionTokenRef.current,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Places API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.suggestions) {
        setPredictions(data.suggestions);
        setShowPredictions(true);
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    } catch (error) {
      console.error('LocationInput: Error fetching autocomplete predictions:', error);
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  // Get place details using Places API (New) REST API
  const getPlaceDetails = async (placeId) => {
    if (!placeId || !API_KEY) return;

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?key=${API_KEY}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents,plusCode',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Places API error: ${response.status}`);
      }

      const place = await response.json();
      handlePlaceSelected(place);

      // Generate new session token for next search
      sessionTokenRef.current = generateSessionToken();
    } catch (error) {
      console.error('LocationInput: Error fetching place details:', error);
    }
  };

  // Handle place selection
  const handlePlaceSelected = (place) => {
    if (!place.location) {
      console.warn('LocationInput: Place has no location');
      return;
    }

    // Extract address components
    const addressComponents = place.addressComponents || [];
    const getComponent = (type) => {
      const component = addressComponents.find(c => c.types?.includes(type));
      return component ? component.longText : '';
    };

    const locationData = {
      formattedAddress: place.formattedAddress || '',
      name: place.displayName?.text || place.formattedAddress || '',
      coordinates: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
      city: getComponent('locality') || getComponent('administrative_area_level_2') || '',
      state: getComponent('administrative_area_level_1') || '',
      country: getComponent('country') || '',
      postalCode: getComponent('postal_code') || '',
      placeId: place.id || '',
      addressComponents: addressComponents,
    };

    // Format based on requested format
    let formattedValue;
    if (format === 'string') {
      formattedValue = locationData.formattedAddress;
    } else if (format === 'simple') {
      formattedValue = {
        city: locationData.city,
        state: locationData.state,
        country: locationData.country,
      };
    } else {
      formattedValue = locationData;
    }

    setInputValue(locationData.formattedAddress);
    onChangeRef.current(formattedValue);
    setShowPredictions(false);
    setPredictions([]);
  };

  // Debounce function for autocomplete
  const debounceRef = useRef(null);
  const handleInputChange = (e) => {
    if (disabled) return;
    const value = e.target.value;
    setInputValue(value);

    // Clear value if input is cleared
    if (!value && onChange) {
      if (format === 'string') {
        onChange('');
      } else if (format === 'simple') {
        onChange({ city: '', state: '', country: '' });
      } else {
        onChange(null);
      }
      setShowPredictions(false);
      setPredictions([]);
      return;
    }

    // Debounce autocomplete requests
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        getAutocompletePredictions(value);
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    }, 300);
  };

  // Handle input focus - show autocomplete dropdown
  const handleInputFocus = () => {
    if (disabled) return;
    if (inputValue.trim()) {
      getAutocompletePredictions(inputValue);
    }
  };

  // Handle clicking outside to close predictions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        predictionsRef.current &&
        !predictionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!isLoaded) return;

          const geocoder = new window.google.maps.Geocoder();
          const latlng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          geocoder.geocode({ location: latlng }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const place = results[0];
              const addressComponents = place.address_components || [];
              
              const getComponent = (type) => {
                const component = addressComponents.find(c => c.types.includes(type));
                return component ? component.long_name : '';
              };

              const locationData = {
                formattedAddress: place.formatted_address || '',
                name: 'Current Location',
                coordinates: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                },
                city: getComponent('locality') || getComponent('administrative_area_level_2') || '',
                state: getComponent('administrative_area_level_1') || '',
                country: getComponent('country') || '',
                postalCode: getComponent('postal_code') || '',
                placeId: place.place_id || '',
                addressComponents: addressComponents,
              };

              let formattedValue;
              if (format === 'string') {
                formattedValue = locationData.formattedAddress;
              } else if (format === 'simple') {
                formattedValue = {
                  city: locationData.city,
                  state: locationData.state,
                  country: locationData.country,
                };
              } else {
                formattedValue = locationData;
              }

              setInputValue(locationData.formattedAddress);
              onChange(formattedValue);
            }
          });
        },
        () => {
          // Error getting location
        }
      );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (loadError) {
    return (
      <div className="text-red-500 text-sm">
        Error loading Google Maps. Please check your API key configuration.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <MdLocationOn className={`absolute left-3 top-1/2 transform -translate-y-1/2 z-10 ${disabled ? 'text-gray-400' : 'text-gray-400'}`} size={20} />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`${className} pl-10 ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60' : ''}`}
          required={required}
          autoComplete="off"
          disabled={disabled}
          readOnly={disabled}
        />
      </div>
      {showPredictions && predictions.length > 0 && (
        <div
          ref={predictionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {predictions.map((suggestion, index) => {
            const prediction = suggestion.placePrediction;
            if (!prediction) return null;
            
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (prediction.placeId) {
                    getPlaceDetails(prediction.placeId);
                  }
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                <div className="text-sm text-gray-900">{prediction.text?.text || ''}</div>
              </button>
            );
          })}
        </div>
      )}
      {showCurrentLocation && isLoaded && !disabled && (
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="mt-2 w-full px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm flex items-center justify-center gap-2"
        >
          <MdMyLocation size={16} />
          Use Current Location
        </button>
      )}
    </div>
  );
}
