import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-fade-in-up">
      <div className="bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-800">
        <div className="bg-green-500/20 p-1.5 rounded-full">
          <Check size={16} className="text-green-500" />
        </div>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};
