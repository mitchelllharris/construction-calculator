import React from 'react';
import { MdCheckCircle, MdError } from 'react-icons/md';

export default function Input({ 
  type = 'text', 
  placeholder = '', 
  value, 
  onChange,
  className = '',
  icon: IconComponent,
  iconPosition = 'left',
  iconColor,
  iconSize,
  error,
  success,
  showValidationIcon = true,
  ...restProps
}) {
  const paddingClass = IconComponent
    ? (iconPosition === 'left' ? 'pl-3' : 'pr-3')
    : '';

  // Determine border color based on validation state
  const getBorderColor = () => {
    if (error) return 'border-red-500 focus-within:border-red-600';
    if (success) return 'border-green-500 focus-within:border-green-600';
    return 'border-gray-200 focus-within:border-blue-500';
  };

  return (
    <div className="w-full">
      <div className={`items-center flex relative w-full border ${getBorderColor()} px-3 py-2 rounded-sm transition-colors ${error ? 'bg-red-50' : success ? 'bg-green-50' : 'bg-white'}`}>
        {IconComponent && iconPosition === 'left' && (
          <div className='mr-2'>
            <IconComponent 
              className={error ? "text-red-500" : success ? "text-green-500" : (iconColor || "text-gray-500")} 
              size={iconSize || 18}
            />
          </div>
        )}

        <input
          className={`w-full ${paddingClass} ${className} outline-none bg-transparent`}
          type={type}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={onChange}
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
