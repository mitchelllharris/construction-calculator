import React, { useEffect } from 'react';
import { MdClose, MdCheckCircle, MdError, MdInfo, MdWarning } from 'react-icons/md';

export default function Toast({ toast, onDismiss }) {
  const { id, message, type, duration = 5000 } = toast;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <MdCheckCircle className="text-white" size={20} />;
      case 'error':
        return <MdError className="text-white" size={20} />;
      case 'info':
        return <MdInfo className="text-white" size={20} />;
      case 'warning':
        return <MdWarning className="text-white" size={20} />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`
        ${getBgColor()} 
        text-white 
        px-4 
        py-3 
        rounded-lg 
        shadow-lg 
        mb-2 
        flex 
        items-center 
        gap-3 
        min-w-[300px] 
        max-w-[500px]
        animate-slide-in
      `}
      role="alert"
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
        aria-label="Dismiss notification"
      >
        <MdClose className="text-white" size={18} />
      </button>
    </div>
  );
}

