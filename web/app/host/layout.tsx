'use client';

import React, { useState, useEffect, startTransition } from 'react';
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
} from 'lucide-react';

interface HostNavProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/host', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/host/listings', label: 'My Listings', icon: Building },
  { href: '/host/calendar', label: 'Availability Calendar', icon: CalendarDays },
  { href: '/host/reservations', label: 'Reservations', icon: BookmarkCheck },
  { href: '/host/profile', label: 'Host Profile (P1)', icon: UserCheck },
  { href: '/host/payouts', label: 'Earnings & Payouts (P1)', icon: DollarSign },
];

export default function HostLayout({ children }: HostNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hostUser, setHostUser] = useState<{ displayName: string; email: string } | null>(null);

  // AC-HOST-2: Auth Protection Check
  // Unauthenticated -> /login; Guest -> /host/apply
  useEffect(() => {
    if (pathname === '/host/apply') return;

    try {
      const stored = localStorage.getItem('nomaddesk_user');
      if (!stored) {
        router.replace('/login');
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed.role === 'guest') {
        router.replace('/host/apply');
        return;
      }

      const name =
        parsed.firstName || parsed.lastName
          ? `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim()
          : parsed.name || (parsed.email === 'host2@example.com' ? 'Andes Living Co.' : 'Casa Urbana Stays');

      startTransition(() => {
        setHostUser({
          displayName: name || 'Casa Urbana Stays',
          email: parsed.email || 'host@example.com',
        });
      });
    } catch {
      router.replace('/login');
    }
  }, [pathname, router]);

  // If visiting /host/apply (public onboarding page), render children directly without admin shell
  if (pathname === '/host/apply') {
    return <>{children}</>;
  }

  // Derive topbar title from current route
  let pageTitle = 'Host Dashboard & Operations';
  if (pathname === '/host/profile') {
    pageTitle = 'Host Profile (P1)';
  } else if (pathname === '/host/payouts') {
    pageTitle = 'Earnings & Disbursements (P1)';
  } else if (pathname.startsWith('/host/listings')) {
    pageTitle = 'My Listings';
  } else if (pathname.startsWith('/host/calendar')) {
    pageTitle = 'Availability Calendar';
  } else if (pathname.startsWith('/host/reservations')) {
    pageTitle = 'Reservations';
  }

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

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[80] w-[264px] bg-[var(--color-bg-dark)] text-[var(--color-text-on-dark)] flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-[var(--color-border-dark)] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg text-white hover:opacity-90 transition-opacity"
          >
            <span>NomadDesk</span>
          </Link>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-brand)] text-white">
            Host Partner
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-bg-dark-surface)] text-white font-semibold shadow-sm'
                    : 'text-[var(--color-text-on-dark-muted)] hover:bg-[var(--color-bg-dark-surface)] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--color-brand)]' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-[var(--color-border-dark)] flex items-center gap-3 bg-[var(--color-bg-dark)]">
          <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0 uppercase">
            {hostUser?.displayName ? hostUser.displayName.slice(0, 2) : 'CU'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {hostUser?.displayName || 'Casa Urbana Stays'}
            </div>
            <div className="text-[11px] text-[var(--color-text-on-dark-muted)] truncate">
              {hostUser?.email || 'host@example.com'}
            </div>
          </div>
          <Link
            href="/"
            title="Back to Public Site"
            className="text-[11px] text-[var(--color-text-on-dark-muted)] hover:text-white transition-colors flex items-center gap-0.5"
          >
            <span>Exit</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[var(--color-border-light)] px-4 sm:px-6 md:px-8 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-2 -ml-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-border-light)] bg-white text-neutral-700 hover:bg-neutral-50 transition-colors shadow-xs"
            >
              Public Web
            </Link>
            <Link
              href="/host/listings/new"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-colors shadow-xs"
            >
              + Add Listing
            </Link>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
