import React, { useState, useRef, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { MdLocationOn, MdMyLocation } from 'react-icons/md';

const libraries = ['places'];

export default function LocationInput({
  value = null,
  onChange,
  placeholder = 'Search for a location...',
  className = '',
  showCurrentLocation = true,
  format = 'full', // 'full' for full address object, 'simple' for city/state/country, 'string' for string
  required = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

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

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocomplete) {
      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['geocode', 'establishment'],
          fields: ['formatted_address', 'geometry', 'address_components', 'name', 'place_id'],
        }
      );

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        
        if (!place.geometry) {
          return;
        }

        // Extract address components
        const addressComponents = place.address_components || [];
        const getComponent = (type) => {
          const component = addressComponents.find(c => c.types.includes(type));
          return component ? component.long_name : '';
        };

        const locationData = {
          formattedAddress: place.formatted_address || '',
          name: place.name || place.formatted_address || '',
          coordinates: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
          city: getComponent('locality') || getComponent('administrative_area_level_2') || '',
          state: getComponent('administrative_area_level_1') || '',
          country: getComponent('country') || '',
          postalCode: getComponent('postal_code') || '',
          placeId: place.place_id || '',
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
        onChange(formattedValue);
      });

      setAutocomplete(autocompleteInstance);
      autocompleteRef.current = autocompleteInstance;
    }

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, autocomplete, format, onChange]);

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

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    // Clear value if input is cleared
    if (!e.target.value && onChange) {
      if (format === 'string') {
        onChange('');
      } else if (format === 'simple') {
        onChange({ city: '', state: '', country: '' });
      } else {
        onChange(null);
      }
    }
  };

  if (loadError) {
    return (
      <div className="text-red-500 text-sm">
        Error loading Google Maps. Please check your API key configuration.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        required={required}
        disabled
      />
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <MdLocationOn className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`${className} pl-10`}
          required={required}
        />
      </div>
      {showCurrentLocation && (
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

