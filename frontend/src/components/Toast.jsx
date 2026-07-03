import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, title, message = '', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" id="toast-container">
        {toasts.map((toast) => {
          let icon = 'ℹ️';
          let toastClass = 'toast-info';
          if (toast.type === 'success') {
            icon = '✅';
            toastClass = 'toast-success';
          } else if (toast.type === 'error' || toast.type === 'danger') {
            icon = '❌';
            toastClass = 'toast-error';
          } else if (toast.type === 'warning') {
            icon = '⚠️';
            toastClass = 'toast-warning';
          }

          return (
            <div 
              key={toast.id} 
              className={`toast ${toastClass}`}
              onClick={() => removeToast(toast.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="toast-icon">{icon}</div>
              <div>
                <div className="toast-title">{toast.title}</div>
                {toast.message && <div className="toast-msg">{toast.message}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
