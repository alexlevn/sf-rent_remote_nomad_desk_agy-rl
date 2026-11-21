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
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

export interface AdminShellUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface AdminShellProps {
  currentUser: AdminShellUser;
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

function resolvePageTitle(pathname: string): string {
  if (pathname.startsWith('/admin/users')) return 'User Account Directory';
  if (pathname.startsWith('/admin/settings')) return 'FX & Platform Settings';
  if (pathname.startsWith('/admin/hosts')) return 'Host Membership Approvals';
  if (pathname.startsWith('/admin/properties')) return 'Property Moderation';
  if (pathname.startsWith('/admin/reservations')) return 'Booking Monitor';
  if (pathname.startsWith('/admin/locations')) return 'Destinations & Cities CMS';
  if (pathname.startsWith('/admin/workstations')) return 'Workstation Catalog CMS';
  if (pathname.startsWith('/admin/guides')) return 'Travel Guides CMS';
  if (pathname.startsWith('/admin/blog')) return 'Blog Posts CMS';
  if (pathname.startsWith('/admin/videos')) return 'Community Reels CMS';
  return 'Platform Executive Overview';
}

function getInitials(user: AdminShellUser): string {
  const first = user.firstName?.trim()?.[0] ?? '';
  const last = user.lastName?.trim()?.[0] ?? '';
  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

export function AdminShell({ currentUser, children }: AdminShellProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    startTransition(() => {
      setIsMobileOpen(false);
    });
  }, [pathname]);

  const pageTitle = resolvePageTitle(pathname);
  const adminName =
    currentUser.firstName || currentUser.lastName
      ? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim()
      : currentUser.email;
  const initials = getInitials(currentUser);

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
            {initials}
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
