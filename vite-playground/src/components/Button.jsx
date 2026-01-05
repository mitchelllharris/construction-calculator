import React from 'react';

export default function Button({ text, onClick, type = "button", disabled, children, className = '' }) {
    const content = children || text;
    
    // Check if className contains a text color class
    const hasTextColor = /text-(black|white|gray|red|blue|green|yellow|purple|pink|indigo)/.test(className);
    
    return (
        <button 
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
                bg-blue-500 
                cursor-pointer 
                font-medium 
                rounded-sm 
                ${!hasTextColor ? 'text-white' : ''}
                px-4 
                py-2 
                hover:bg-blue-700 
                disabled:opacity-50 
                disabled:cursor-not-allowed
                flex items-center justify-center gap-2
                ${className}
            `}
        >
            {content}
        </button>
    );
}