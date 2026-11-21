'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GuestSubnavProps {
  activeCount?: {
    bookings?: number;
    favorites?: number;
  };
  className?: string;
}

export const GuestSubnav: React.FC<GuestSubnavProps> = ({
  activeCount,
  className,
}) => {
  const pathname = usePathname();

  const links = [
    {
      label: 'Dashboard',
      href: '/guests/dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/guests/dashboard',
    },
    {
      label: 'My Bookings',
      href: '/guests/reservations',
      icon: CalendarDays,
      isActive: pathname.startsWith('/guests/reservations'),
      count: activeCount?.bookings,
    },
    {
      label: 'Saved Apartments',
      href: '/guests/favorites',
      icon: Heart,
      isActive: pathname.startsWith('/guests/favorites'),
      count: activeCount?.favorites,
    },
  ];

  return (
    <nav
      aria-label="Guest portal navigation"
      className={cn(
        'flex items-center gap-2 sm:gap-4 border-b border-[var(--color-border-light)] mb-8 overflow-x-auto scrollbar-none',
        className
      )}
    >
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-2 py-3 px-1 sm:px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors transition-border',
              link.isActive
                ? 'border-[var(--color-brand)] text-[var(--color-brand)] font-semibold'
                : 'border-transparent text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] hover:border-neutral-300'
            )}
          >
            <Icon
              className={cn(
                'w-4 h-4',
                link.isActive ? 'text-[var(--color-brand)]' : 'text-neutral-400'
              )}
            />
            <span>{link.label}</span>
            {link.count !== undefined && (
              <span
                className={cn(
                  'ml-1 text-xs px-2 py-0.5 rounded-full font-semibold',
                  link.isActive
                    ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
                    : 'bg-neutral-100 text-neutral-600'
                )}
              >
                {link.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};
