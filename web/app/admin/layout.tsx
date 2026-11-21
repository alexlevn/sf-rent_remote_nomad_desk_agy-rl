'use client';

import React, { useState, useEffect, startTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserCheck,
  Building,
  BookmarkCheck,
  Users,
  MapPin,
  Monitor,
  BookOpen,
  FileText,
  Video,
  Settings,
  Menu,
  X,
  ShieldAlert,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Platform Dashboard', icon: LayoutDashboard },
  { href: '/admin/hosts', label: 'Host Approvals', icon: UserCheck },
  { href: '/admin/properties', label: 'Property Moderation', icon: Building },
  { href: '/admin/reservations', label: 'Booking Monitor', icon: BookmarkCheck },
  { href: '/admin/users', label: 'User Directory', icon: Users },
];

const CMS_NAV_ITEMS: NavItem[] = [
  { href: '/admin/locations', label: 'Destinations & Cities', icon: MapPin },
  { href: '/admin/workstations', label: 'Workstation Catalog', icon: Monitor },
  { href: '/admin/guides', label: 'Travel Guides', icon: BookOpen },
  { href: '/admin/blog', label: 'Blog Posts', icon: FileText },
  { href: '/admin/videos', label: 'Community Reels', icon: Video },
];

const SETTINGS_NAV_ITEMS: NavItem[] = [
  { href: '/admin/settings', label: 'FX & Platform Settings', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);

  // AC-AUTH-2: Auth Protection Check
  // Only accounts with role === 'admin' can access /admin routes.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nomaddesk_user');
      if (!stored) {
        startTransition(() => {
          setCurrentUser(null);
          setAuthChecked(true);
        });
        return;
      }
      const parsed = JSON.parse(stored);
      startTransition(() => {
        setCurrentUser(parsed);
        setAuthChecked(true);
      });
    } catch {
      startTransition(() => {
        setCurrentUser(null);
        setAuthChecked(true);
      });
    }
  }, [pathname]);

  // Quick switch to admin demo account
  const handleSwitchToAdmin = () => {
    const adminUser = {
      id: 3,
      email: 'admin@example.com',
      role: 'admin',
      firstName: 'Alex',
      lastName: 'Le',
      isActive: true,
    };
    try {
      localStorage.setItem('nomaddesk_user', JSON.stringify(adminUser));
      startTransition(() => {
        setCurrentUser(adminUser);
      });
    } catch {
      // Ignore localStorage write errors
    }
  };

  // Close mobile drawer on route change
  useEffect(() => {
    startTransition(() => {
      setIsMobileOpen(false);
    });
  }, [pathname]);

  // Loading state during auth check
  if (!authChecked) {
    return (
      <div className="fixed inset-0 z-[60] bg-[var(--color-bg-light)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--color-text-on-light-muted)]">Verifying administrative access...</p>
        </div>
      </div>
    );
  }

  // AC-AUTH-2: Unauthenticated State -> 403 / Login prompt
  if (!currentUser) {
    return (
      <div
        data-testid="admin-403"
        className="fixed inset-0 z-[60] bg-[var(--color-bg-light)] flex items-center justify-center p-4 text-[var(--color-text-on-light)]"
      >
        <div className="max-w-md w-full bg-white rounded-2xl border border-[var(--color-border-light)] p-8 shadow-xl text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
            403 Forbidden
          </span>
          <h1 className="text-2xl font-bold mb-2">Administrator Access Required</h1>
          <p className="text-sm text-[var(--color-text-on-light-muted)] mb-6">
            You must be signed in with an administrator account to view the NomadDesk Admin Portal.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSwitchToAdmin}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-brand)] text-white text-sm font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm"
            >
              Sign In with Demo Admin
            </button>
            <Link
              href="/login?callbackUrl=/admin"
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--color-border-light)] text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Go to Login Page
            </Link>
            <Link
              href="/"
              className="text-xs text-[var(--color-text-on-light-muted)] hover:underline mt-2"
            >
              Return to Public Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // AC-AUTH-2: Non-admin role (guest or host) -> 403 Forbidden
  if (currentUser.role !== 'admin') {
    return (
      <div
        data-testid="admin-403"
        className="fixed inset-0 z-[60] bg-[var(--color-bg-light)] flex items-center justify-center p-4 text-[var(--color-text-on-light)]"
      >
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 shadow-xl text-center">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
            403 Forbidden
          </span>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-sm text-[var(--color-text-on-light-muted)] mb-4">
            Logged in as <strong className="text-neutral-900">{currentUser.email}</strong> (Role:{' '}
            <span className="uppercase font-semibold">{currentUser.role}</span>).
          </p>
          <p className="text-xs text-neutral-500 mb-6">
            Only users with the <span className="font-semibold text-neutral-800">admin</span> role are authorized to access the platform management portal.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSwitchToAdmin}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-brand)] text-white text-sm font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm"
            >
              Switch to Admin Demo Account
            </button>
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--color-border-light)] text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Return to Public Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Derive topbar title from current route
  let pageTitle = 'Platform Executive Overview';
  if (pathname === '/admin/users') {
    pageTitle = 'User Account Directory';
  } else if (pathname === '/admin/settings') {
    pageTitle = 'FX & Platform Settings';
  } else if (pathname === '/admin/hosts') {
    pageTitle = 'Host Membership Approvals';
  } else if (pathname === '/admin/properties') {
    pageTitle = 'Property Moderation';
  } else if (pathname === '/admin/reservations') {
    pageTitle = 'Booking Monitor';
  } else if (pathname === '/admin/locations') {
    pageTitle = 'Destinations & Cities CMS';
  } else if (pathname === '/admin/workstations') {
    pageTitle = 'Workstation Catalog CMS';
  } else if (pathname === '/admin/guides') {
    pageTitle = 'Travel Guides CMS';
  } else if (pathname === '/admin/blog') {
    pageTitle = 'Blog Posts CMS';
  } else if (pathname === '/admin/videos') {
    pageTitle = 'Community Reels CMS';
  }

  const adminName =
    currentUser.firstName || currentUser.lastName
      ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
      : 'Alex Le (Admin)';

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
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white">
            Platform Admin
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex-1 flex flex-col gap-1 overflow-y-auto">
          {MAIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-[var(--color-text-on-dark-muted)] hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-brand)]' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Content Management
          </div>

          {CMS_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-[var(--color-text-on-dark-muted)] hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-brand)]' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Platform Settings
          </div>

          {SETTINGS_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-[var(--color-text-on-dark-muted)] hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-brand)]' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center font-bold text-xs text-[var(--color-text-on-dark)] shrink-0">
            AL
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {adminName}
            </div>
            <div className="text-[11px] text-[var(--color-text-on-dark-muted)] truncate">
              {currentUser.email}
            </div>
          </div>
          <Link
            href="/"
            title="Back to Public Site"
            className="text-[11px] text-[var(--color-text-on-dark-muted)] hover:text-white hover:underline shrink-0"
          >
            Exit
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Admin Topbar */}
        <header className="h-14 border-b border-[var(--color-border-light)] bg-white px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-1.5 -ml-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 md:hidden"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-sm md:text-base font-semibold text-[var(--color-text-on-light)]">
              {pageTitle}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>System Healthy</span>
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-light)] text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <span>Public Web</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto bg-[var(--color-bg-light)] p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
