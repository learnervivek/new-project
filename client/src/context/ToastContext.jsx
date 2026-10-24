import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, title, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (title, message, duration) => addToast({ title, message, type: 'success', duration }),
    error: (title, message, duration) => addToast({ title, message, type: 'error', duration }),
    warning: (title, message, duration) => addToast({ title, message, type: 'warning', duration }),
    info: (title, message, duration) => addToast({ title, message, type: 'info', duration }),
    custom: addToast,
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-forest-600 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-white',
    error: 'border-rose-200 bg-white',
    warning: 'border-amber-200 bg-white',
    info: 'border-forest-200 bg-white',
  };

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-soft-lg transition-all duration-300 transform translate-y-0 opacity-100 animate-slideUp',
        borders[toast.type] || borders.info
      )}
    >
      <div className="mt-0.5">{icons[toast.type] || icons.info}</div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="text-sm font-semibold text-charcoal-900 leading-tight">
            {toast.title}
          </h4>
        )}
        {toast.message && (
          <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss toast"
        className="text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-100 rounded-lg p-1 transition-colors -mr-1 -mt-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
