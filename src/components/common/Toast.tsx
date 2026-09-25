import React from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onClose }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type}`}>
          <span>{toast.message}</span>
          <button 
            style={{ color: 'rgba(255,255,255,0.7)', marginLeft: '8px' }} 
            onClick={() => onClose(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
