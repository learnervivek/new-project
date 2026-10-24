import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

export function Dialog({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && onClose) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-950/40 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Box */}
      <div
        className={cn(
          'relative w-full bg-white rounded-3xl border border-ivory-300 shadow-soft-xl overflow-hidden z-10 transition-all duration-300 transform',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-ivory-200">
          <div>
            {title && (
              <h2 id="dialog-title" className="text-xl font-bold text-charcoal-900 font-display">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-charcoal-400 mt-1">
                {description}
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-100 rounded-full p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 pt-4 border-t border-ivory-200 bg-ivory-50/50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dialog;
