import React from 'react';
import { Compass, MapPin, Receipt, Users, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

export function EmptyState({
  icon: Icon = Compass,
  title = 'No items found',
  description = 'Get started by creating your first entry.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl border border-dashed border-ivory-300 bg-white/60 shadow-soft-sm max-w-lg mx-auto',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-600 mb-4 shadow-soft-sm animate-pulse-subtle">
        <Icon className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-bold text-charcoal-900 font-display">
        {title}
      </h3>

      <p className="text-sm text-charcoal-400 mt-1.5 max-w-sm">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
