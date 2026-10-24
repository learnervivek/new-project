import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({
  children,
  variant = 'forest',
  size = 'md',
  withDot = false,
  className = '',
  ...props
}) {
  const variants = {
    forest: 'bg-forest-50 text-forest-700 border border-forest-200/60',
    terracotta: 'bg-terracotta-50 text-terracotta-700 border border-terracotta-200/60',
    neutral: 'bg-ivory-200/70 text-charcoal-700 border border-ivory-300',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    outline: 'bg-transparent text-charcoal-700 border border-ivory-400',
    dark: 'bg-forest-900 text-ivory-100 border border-forest-800',
  };

  const dotColors = {
    forest: 'bg-forest-600',
    terracotta: 'bg-terracotta-500',
    neutral: 'bg-charcoal-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    outline: 'bg-charcoal-600',
    dark: 'bg-forest-400',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full tracking-wide select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {withDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
