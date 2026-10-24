import React from 'react';
import { AlertTriangle, Trash2, Archive } from 'lucide-react';
import Dialog from './Dialog';
import Button from './Button';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  icon: Icon = AlertTriangle,
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
          variant === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs text-charcoal-600 leading-relaxed pt-1">
          {description}
        </p>
      </div>
    </Dialog>
  );
}

export default ConfirmDialog;
