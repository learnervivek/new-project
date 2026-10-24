import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({
  label,
  helperText,
  error,
  leftIcon = null,
  rightIcon = null,
  id,
  className = '',
  wrapperClassName = '',
  disabled = false,
  required = false,
  type = 'text',
  ...props
}, ref) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={cn('w-full flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 select-none flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-terracotta-500 ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-charcoal-400">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'w-full bg-white text-charcoal-900 placeholder:text-charcoal-300 text-sm rounded-xl border transition-all duration-200 outline-none',
            'h-10 px-3.5 py-2',
            leftIcon ? 'pl-10' : 'pl-3.5',
            rightIcon ? 'pr-10' : 'pr-3.5',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/20'
              : 'border-ivory-300 hover:border-ivory-400 focus:border-forest-600 focus:ring-2 focus:ring-forest-100/80',
            disabled && 'bg-ivory-100 opacity-60 cursor-not-allowed text-charcoal-400',
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-charcoal-400">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-red-600 font-medium flex items-center gap-1 animate-fadeIn">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-charcoal-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
