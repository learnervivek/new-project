import React from 'react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon = null,
  rightIcon = null,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

  const variants = {
    primary: 'bg-forest-600 hover:bg-forest-700 text-ivory-50 shadow-soft hover:shadow-soft-lg active:scale-[0.98] focus-visible:ring-forest-600 focus-visible:ring-offset-ivory-100',
    secondary: 'bg-white hover:bg-ivory-50 text-charcoal-800 border border-ivory-300 shadow-soft-sm hover:border-ivory-400 active:scale-[0.98] focus-visible:ring-forest-600 focus-visible:ring-offset-ivory-100',
    outline: 'border border-forest-600/30 text-forest-700 hover:bg-forest-50 hover:border-forest-600/60 active:scale-[0.98] focus-visible:ring-forest-600 focus-visible:ring-offset-ivory-100',
    accent: 'bg-terracotta-500 hover:bg-terracotta-600 text-white shadow-soft hover:shadow-soft-lg active:scale-[0.98] focus-visible:ring-terracotta-500 focus-visible:ring-offset-ivory-100',
    ghost: 'text-charcoal-700 hover:text-forest-700 hover:bg-ivory-200/70 active:bg-ivory-200 focus-visible:ring-forest-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-soft active:scale-[0.98] focus-visible:ring-red-600 focus-visible:ring-offset-ivory-100',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-4 py-2 gap-2 h-10',
    lg: 'text-base px-6 py-3 gap-2.5 h-12',
    icon: 'h-10 w-10 p-0',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
