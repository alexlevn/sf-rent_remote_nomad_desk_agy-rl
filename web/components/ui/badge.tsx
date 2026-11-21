import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'accent' | 'success' | 'warning' | 'error' | 'neutral' | 'outline';
  pill?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'accent',
  pill = true,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold leading-normal select-none';

  const radiusStyles = pill ? 'rounded-full' : 'rounded-[4px]';

  const variantStyles = {
    accent: 'bg-[var(--color-brand-light)] text-[var(--color-brand)]',
    success:
      'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]',
    warning:
      'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)]',
    error:
      'bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error-border)]',
    neutral:
      'bg-[var(--color-bg-dark-surface)] text-[var(--color-text-on-dark)] border border-[var(--color-border-dark)]',
    outline: 'bg-transparent border border-current text-current',
  }[variant];

  return (
    <span
      className={cn(baseStyles, radiusStyles, variantStyles, className)}
      {...props}
    >
      {children}
    </span>
  );
};
