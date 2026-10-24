import React from 'react';
import { cn } from '../../lib/utils';

export function Card({
  children,
  variant = 'default',
  className = '',
  ...props
}) {
  const variants = {
    default: 'bg-white border border-ivory-300/80 shadow-soft',
    interactive: 'bg-white border border-ivory-300/80 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 hover:border-ivory-400 transition-all duration-300 cursor-pointer',
    glass: 'glass-card shadow-soft',
    forest: 'bg-forest-900 text-ivory-100 border border-forest-800 shadow-soft-lg',
    subtle: 'bg-ivory-100/60 border border-ivory-200 shadow-soft-sm',
    none: '',
  };


  return (
    <div
      className={cn('rounded-2xl overflow-hidden', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={cn('p-6 pb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', as = 'h3', ...props }) {
  const Tag = as;
  return (
    <Tag className={cn('text-lg font-semibold tracking-tight text-charcoal-900', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={cn('text-xs text-charcoal-400 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={cn('p-6 pt-2', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={cn('p-6 pt-3 border-t border-ivory-200/80 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
