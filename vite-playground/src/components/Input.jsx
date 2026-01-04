import React from 'react';
import { MdCheckCircle, MdError } from 'react-icons/md';

export default function Input({ 
  type = 'text', 
  placeholder = '', 
  value, 
  onChange,
  className = '',
  label,
  icon: IconComponent,
  iconPosition = 'left',
  iconColor,
  iconSize,
  error,
  success,
  showValidationIcon = true,
  disabled = false,
  ...restProps
}) {
  const paddingClass = IconComponent
    ? (iconPosition === 'left' ? 'pl-3' : 'pr-3')
    : '';

  // Determine border color based on validation state
  const getBorderColor = () => {
    if (disabled) return 'border-gray-300';
    if (error) return 'border-red-500 focus-within:border-red-600';
    if (success) return 'border-green-500 focus-within:border-green-600';
    return 'border-gray-200 focus-within:border-blue-500';
  };

  // Determine background color
  const getBackgroundColor = () => {
    if (disabled) return 'bg-gray-100';
    if (error) return 'bg-red-50';
    if (success) return 'bg-green-50';
    return 'bg-white';
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className={`items-center flex relative w-full border ${getBorderColor()} px-3 py-2 rounded-sm transition-colors ${getBackgroundColor()} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
        {IconComponent && iconPosition === 'left' && (
          <div className='mr-2'>
            <IconComponent 
              className={disabled ? "text-gray-400" : error ? "text-red-500" : success ? "text-green-500" : (iconColor || "text-gray-500")} 
              size={iconSize || 18}
            />
          </div>
        )}

        <input
          className={`w-full ${paddingClass} ${className} outline-none bg-transparent ${disabled ? 'cursor-not-allowed text-gray-500' : ''}`}
          type={type}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          {...restProps}
        />

        {showValidationIcon && (
          <>
            {error && (
              <div className="ml-2 flex-shrink-0">
                <MdError className="text-red-500" size={20} />
              </div>
            )}
            {success && !error && (
              <div className="ml-2 flex-shrink-0">
                <MdCheckCircle className="text-green-500" size={20} />
              </div>
            )}
          </>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
          <MdError size={14} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
