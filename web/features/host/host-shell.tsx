'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building,
  CalendarDays,
  BookmarkCheck,
  UserCheck,
  DollarSign,
  Menu,
  X,
  ExternalLink,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import type { HostProfile, User } from '@/lib/types';
import { SITE_CONFIG } from '@/content/site';
import { signOutAction } from '@/app/actions/auth-actions';
import { cn } from '@/lib/utils';

interface HostShellProps {
  children: React.ReactNode;
  user: User | null;
  host: HostProfile | null;
}

const NAV_ITEMS = [
  { href: '/host', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/host/listings', label: 'My Listings', icon: Building },
  { href: '/host/calendar', label: 'Availability Calendar', icon: CalendarDays },
  { href: '/host/reservations', label: 'Reservations', icon: BookmarkCheck },
  { href: '/host/profile', label: 'Host Profile', icon: UserCheck },
  { href: '/host/payouts', label: 'Earnings & Payouts', icon: DollarSign },
];

export function HostShell({ children, user, host }: HostShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  // Public onboarding route renders without the host operations shell
  if (pathname === '/host/apply') {
    return <>{children}</>;
  }

  const isSuspended = host?.status === 'suspended';

  let pageTitle = 'Host Dashboard & Operations';
  if (pathname === '/host/profile') {
    pageTitle = 'Host Profile';
  } else if (pathname === '/host/payouts') {
    pageTitle = 'Earnings & Payouts';
  } else if (pathname.startsWith('/host/listings')) {
    pageTitle = 'My Listings';
  } else if (pathname.startsWith('/host/calendar')) {
    pageTitle = 'Availability Calendar';
  } else if (pathname.startsWith('/host/reservations')) {
    pageTitle = 'Reservations';
  }

  const displayName =
    host?.displayName ||
    (user ? `${user.firstName} ${user.lastName}`.trim() : 'Host Partner');
  const displayEmail = user?.email || '';
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'HP';

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOutAction();
      try {
        localStorage.removeItem('nomaddesk_user');
      } catch {
        // Ignore storage errors
      }
      router.push('/');
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[var(--color-bg-light)] flex flex-col md:flex-row text-[var(--color-text-on-light)] overflow-hidden">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Host Sidebar */}
      <aside
        role={isMobileOpen ? 'dialog' : undefined}
        aria-modal={isMobileOpen ? true : undefined}
        aria-label="Host portal navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-[80] w-[var(--sidebar-admin-w)] bg-[var(--color-bg-dark)] text-[var(--color-text-on-dark)] flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 shrink-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-[var(--color-border-dark)] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg text-white hover:opacity-90 transition-opacity"
          >
            <span>{SITE_CONFIG.name}</span>
          </Link>
          <span
            className={cn(
              'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full text-white',
              isSuspended ? 'bg-amber-600' : 'bg-[var(--color-brand)]',
            )}
          >
            {isSuspended ? 'Suspended' : 'Host Partner'}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex-1 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/host'
                ? pathname === '/host'
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-bg-dark-surface)] text-white font-semibold shadow-sm'
                    : 'text-[var(--color-text-on-dark-muted)] hover:bg-[var(--color-bg-dark-surface)] hover:text-white',
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-[var(--color-brand)]' : 'text-neutral-400',
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-[var(--color-border-dark)] space-y-3 bg-[var(--color-bg-dark)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0 uppercase">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {displayName}
              </div>
              {displayEmail && (
                <div className="text-[11px] text-[var(--color-text-on-dark-muted)] truncate">
                  {displayEmail}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-dark)]">
            <Link
              href="/"
              className="text-xs text-[var(--color-text-on-dark-muted)] hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-xs text-[var(--color-text-on-dark-muted)] hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[var(--color-border-light)] px-4 sm:px-6 md:px-8 flex items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="md:hidden min-h-10 min-w-10 inline-flex items-center justify-center -ml-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none cursor-pointer"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--color-border-light)] bg-white text-neutral-700 hover:bg-neutral-50 transition-colors shadow-xs"
            >
              Public Web
            </Link>
            {!isSuspended && (
              <Link
                href="/host/listings/new"
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-colors shadow-xs"
              >
                + Add Listing
              </Link>
            )}
          </div>
        </header>

        {/* Suspended Read-Only Banner */}
        {isSuspended && (
          <div
            role="alert"
            className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 md:px-8 py-3 text-xs sm:text-sm text-amber-900 flex items-start gap-2.5 shrink-0"
          >
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Account suspended (Read-Only Mode):</strong>{' '}
              Your listings are hidden from public search and write actions are disabled. Existing confirmed bookings remain visible. Contact{' '}
              <a
                href={`mailto:${SITE_CONFIG.partnersEmail}`}
                className="underline font-medium"
              >
                {SITE_CONFIG.partnersEmail}
              </a>{' '}
              for reinstatement.
            </div>
          </div>
        )}

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
