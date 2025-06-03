import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 3000,
  onClose
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-md border ${getBackgroundColor()} animate-fade-in`}>
      <div className="flex items-center">
        {getIcon()}
        <p className="ml-2 text-sm font-medium text-gray-800">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Toast Container to manage multiple toasts
interface ToastContainerProps {
  children: React.ReactNode;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {children}
    </div>
  );
};

// Add animation to tailwind.config.js
// extend: {
//   animation: {
//     'fade-in': 'fadeIn 0.3s ease-in-out',
//     'fade-out': 'fadeOut 0.3s ease-in-out'
//   },
//   keyframes: {
//     fadeIn: {
//       '0%': { opacity: '0', transform: 'translateY(10px)' },
//       '100%': { opacity: '1', transform: 'translateY(0)' }
//     },
//     fadeOut: {
//       '0%': { opacity: '1', transform: 'translateY(0)' },
//       '100%': { opacity: '0', transform: 'translateY(10px)' }
//     }
//   }
// } 