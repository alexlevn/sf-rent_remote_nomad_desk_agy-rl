import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'outline-white'
    | 'dark'
    | 'white'
    | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  pill?: boolean;
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      pill = false,
      isLoading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

    const sizeStyles = {
      sm: 'px-3.5 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3.5 text-base',
    }[size];

    const radiusStyles = pill
      ? 'rounded-full'
      : size === 'sm'
        ? 'rounded-[6px]'
        : 'rounded-[10px]';

    const variantStyles = {
      primary:
        'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] border border-[var(--color-brand)] shadow-sm active:translate-y-px',
      secondary:
        'bg-[var(--color-bg-light-alt)] text-[var(--color-text-on-light)] border border-[var(--color-border-light)] hover:bg-[var(--color-bg-light-alt-hover)] active:translate-y-px',
      outline:
        'bg-transparent text-[var(--color-text-on-light)] border border-[var(--color-border-light)] hover:bg-[var(--color-bg-light-alt)] active:translate-y-px',
      'outline-white':
        'bg-transparent text-white border border-white/20 hover:bg-white/10 active:translate-y-px',
      dark:
        'bg-[var(--color-bg-dark)] text-white border border-[var(--color-border-dark)] hover:bg-[var(--color-border-dark)] active:translate-y-px',
      white:
        'bg-white text-[var(--color-text-on-light)] border border-[var(--color-border-light)] hover:bg-[var(--color-bg-light-hover)] active:translate-y-px',
      ghost:
        'bg-transparent text-current hover:bg-black/5 active:translate-y-px',
    }[variant];

    const combinedClassName = cn(
      baseStyles,
      sizeStyles,
      radiusStyles,
      variantStyles,
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>;
      return React.cloneElement(child, {
        ...props,
        className: cn(combinedClassName, child.props.className as string | undefined),
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={combinedClassName}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
