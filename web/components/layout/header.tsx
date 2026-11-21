'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Globe, LogOut, ShieldCheck, Home, Briefcase } from 'lucide-react';
import { MAIN_NAV_ITEMS } from '@/content/nav';
import { SITE_CONFIG } from '@/content/site';
import { useCurrency } from '@/context/currency-context';
import { MobileNav } from './mobile-nav';
import { Dropdown } from '@/components/ui/dropdown';
import type { UserRole } from '@/lib/types';

interface AuthUserState {
  id?: number;
  name: string;
  email: string;
  role: UserRole;
}

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { currency, setCurrency, currencies } = useCurrency();
  const [authUser, setAuthUser] = useState<AuthUserState | null>(null);
  const [, startTransition] = useTransition();

  // Read auth state from localStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem('nomaddesk_user');
        if (stored) {
          startTransition(() => {
            setAuthUser(JSON.parse(stored));
          });
        } else {
          startTransition(() => {
            setAuthUser(null);
          });
        }
      } catch {
        // Ignore
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleSignOut = () => {
    try {
      localStorage.removeItem('nomaddesk_user');
    } catch {
      // Ignore
    }
    setAuthUser(null);
  };

  const handleRoleSwitch = (role: UserRole) => {
    let email = 'demo@example.com';
    let name = 'Demo User';
    if (role === 'host') {
      email = 'host@example.com';
      name = 'Sofia Rodriguez';
    } else if (role === 'admin') {
      email = 'admin@example.com';
      name = 'Admin Director';
    }

    const updatedUser: AuthUserState = {
      name,
      email,
      role,
    };
    try {
      localStorage.setItem('nomaddesk_user', JSON.stringify(updatedUser));
    } catch {
      // Ignore
    }
    setAuthUser(updatedUser);
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl backdrop-blur-md bg-neutral-900/90 text-white border border-[var(--color-border-dark)] rounded-[24px] px-5 h-[58px] flex items-center justify-between shadow-[var(--shadow-header)] transition-all">
      {/* Brand Wordmark Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-xl tracking-tight text-white hover:opacity-90 transition-opacity"
      >
        <span>{SITE_CONFIG.name}</span>
        <span className="text-[10px] bg-[var(--color-brand)] text-white font-bold px-1.5 py-0.5 rounded-full leading-none">
          {SITE_CONFIG.brandBadge}
        </span>
      </Link>

      {/* Desktop Main Navigation Links */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
        {MAIN_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors py-1 ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-[var(--color-text-on-dark-muted)] hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Header Right Actions */}
      <div className="flex items-center gap-3">
        {/* Currency Selector Dropdown */}
        <Dropdown
          trigger={
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[var(--color-border-dark)] bg-black/40 text-xs font-semibold text-[var(--color-text-on-dark)] hover:border-neutral-500 hover:text-white transition-all">
              <Globe className="h-3.5 w-3.5 text-[var(--color-brand)]" />
              <span>{currency}</span>
              <ChevronDown className="h-3 w-3 text-[var(--color-text-on-dark-muted)]" />
            </div>
          }
          align="right"
          menuClassName="w-36 bg-[var(--color-bg-dark-surface)] border-[var(--color-border-dark)] p-1.5"
        >
          <div className="text-[10px] font-semibold text-[var(--color-text-on-dark-muted)] uppercase tracking-wider px-2 py-1">
            Select Currency
          </div>
          {currencies.map((curr) => (
            <button
              key={curr.code}
              type="button"
              onClick={() => setCurrency(curr.code)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg text-left transition-colors cursor-pointer ${
                currency === curr.code
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'text-[var(--color-text-on-dark)] hover:bg-white/10'
              }`}
            >
              <span>{curr.label}</span>
              {currency === curr.code && <span>✓</span>}
            </button>
          ))}
        </Dropdown>

        {/* Auth State: Sign In Button OR Avatar Dropdown */}
        {authUser ? (
          <Dropdown
            trigger={
              <div
                className="flex items-center gap-2 p-1 pr-2.5 rounded-full border border-[var(--color-border-dark)] bg-black/40 hover:border-neutral-500 transition-all cursor-pointer"
                title={`${authUser.name || authUser.email} (${authUser.role})`}
              >
                <div className="h-7 w-7 rounded-full bg-[var(--color-brand)] flex items-center justify-center font-bold text-xs text-white">
                  {(authUser.name || authUser.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-white max-w-[90px] truncate">
                  {(authUser.name || authUser.email || 'User').split(' ')[0]}
                </span>
                <ChevronDown className="h-3 w-3 text-[var(--color-text-on-dark-muted)]" />
              </div>
            }
            align="right"
            menuClassName="w-56 bg-[var(--color-bg-dark-surface)] border-[var(--color-border-dark)] p-2 shadow-2xl"
          >
            <div className="px-3 py-2 border-b border-[var(--color-border-dark)] mb-2">
              <p className="text-sm font-semibold text-white truncate">
                {authUser.name}
              </p>
              <p className="text-xs text-[var(--color-text-on-dark-muted)] truncate">
                {authUser.email}
              </p>
              <div className="mt-1.5">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[var(--color-brand)]/20">
                  {authUser.role} mode
                </span>
              </div>
            </div>

            {/* Portal navigation links */}
            <div className="space-y-0.5 text-xs">
              <Link
                href="/guests/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-[var(--color-text-on-dark)] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Home className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                <span>Guest Dashboard</span>
              </Link>
              <Link
                href="/host/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-[var(--color-text-on-dark)] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Briefcase className="h-3.5 w-3.5 text-amber-500" />
                <span>Host Portal</span>
              </Link>
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-[var(--color-text-on-dark)] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                <span>Admin Portal</span>
              </Link>
            </div>

            {/* Switch Role demo shortcuts */}
            <div className="mt-2 pt-2 border-t border-[var(--color-border-dark)]">
              <div className="text-[10px] font-semibold text-[var(--color-text-on-dark-muted)] uppercase tracking-wider px-3 mb-1">
                Demo Switch Role
              </div>
              <div className="grid grid-cols-3 gap-1 px-1">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('guest')}
                  className={`px-1.5 py-1 text-[10px] font-semibold rounded border transition-colors ${
                    authUser.role === 'guest'
                      ? 'bg-neutral-700 text-white border-neutral-500'
                      : 'bg-black/20 text-neutral-400 border-transparent hover:text-white'
                  }`}
                >
                  Guest
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('host')}
                  className={`px-1.5 py-1 text-[10px] font-semibold rounded border transition-colors ${
                    authUser.role === 'host'
                      ? 'bg-neutral-700 text-white border-neutral-500'
                      : 'bg-black/20 text-neutral-400 border-transparent hover:text-white'
                  }`}
                >
                  Host
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('admin')}
                  className={`px-1.5 py-1 text-[10px] font-semibold rounded border transition-colors ${
                    authUser.role === 'admin'
                      ? 'bg-neutral-700 text-white border-neutral-500'
                      : 'bg-black/20 text-neutral-400 border-transparent hover:text-white'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

            {/* Sign Out */}
            <div className="mt-2 pt-2 border-t border-[var(--color-border-dark)]">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </Dropdown>
        ) : (
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 rounded-[6px] text-xs font-medium text-white border border-white/20 hover:bg-white/10 transition-colors"
          >
            Sign In
          </Link>
        )}

        {/* Primary CTA: Browse Apartments */}
        <Link
          href={SITE_CONFIG.links.browse}
          className="hidden md:inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] border border-[var(--color-brand)] shadow-sm transition-all"
        >
          Browse Apartments
        </Link>

        {/* Mobile Navigation Drawer Trigger */}
        <MobileNav />
      </div>
    </header>
  );
};
