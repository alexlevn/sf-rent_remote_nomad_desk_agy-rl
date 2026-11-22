'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, Globe, User as UserIcon, LogOut } from 'lucide-react';
import { MAIN_NAV_ITEMS } from '@/content/nav';
import { SITE_CONFIG } from '@/content/site';
import { useCurrency } from '@/context/currency-context';
import { cn } from '@/lib/utils';
import type { HeaderUser } from './header';

interface MobileNavProps {
  authUser: HeaderUser | null;
  onSignOut: () => Promise<void> | void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ authUser, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { currency, setCurrency, currencies } = useCurrency();

  // Lock body scroll and close on Escape when mobile drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleSignOutClick = async () => {
    setIsOpen(false);
    await onSignOut();
  };

  const displayName = authUser ? authUser.name || authUser.email || 'User' : '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="lg:hidden">
      {/* Hamburger Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Menu"
        aria-expanded={isOpen}
        className="inline-flex items-center justify-center min-h-10 min-w-10 p-2 rounded-lg text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] cursor-pointer"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[60] transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'fixed top-0 right-0 bottom-0 w-[85%] max-w-xs bg-[var(--color-bg-dark)] border-l border-[var(--color-border-dark)] text-[var(--color-text-on-dark)] z-[70] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full invisible pointer-events-none'
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border-dark)]">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 font-bold text-lg text-white"
          >
            <span>{SITE_CONFIG.name}</span>
            <span className="text-[9px] bg-[var(--color-brand)] text-white font-bold px-1.5 py-0.5 rounded-full">
              {SITE_CONFIG.brandBadge}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="inline-flex items-center justify-center min-h-10 min-w-10 p-2 rounded-lg text-[var(--color-text-on-dark-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Navigation Links */}
          <nav aria-label="Mobile navigation" className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-dark-muted)] mb-2 px-3">
              Explore
            </p>
            {MAIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-medium text-[var(--color-text-on-dark)] hover:bg-white/5 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Currency Selection */}
          <div className="pt-4 border-t border-[var(--color-border-dark)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-on-dark-muted)] mb-3 px-3">
              <Globe className="h-3.5 w-3.5" />
              <span>Currency</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-2">
              {currencies.map((curr) => (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => setCurrency(curr.code)}
                  className={cn(
                    'min-h-10 py-2 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer',
                    currency === curr.code
                      ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)] shadow-sm'
                      : 'bg-[var(--color-bg-dark-surface)] text-[var(--color-text-on-dark-muted)] border-[var(--color-border-dark)] hover:text-white'
                  )}
                >
                  {curr.symbol} {curr.code}
                </button>
              ))}
            </div>
          </div>

          {/* User Account / Role Section */}
          <div className="pt-4 border-t border-[var(--color-border-dark)] px-2">
            {authUser ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-dark-surface)] border border-[var(--color-border-dark)]">
                  <div className="h-9 w-9 rounded-full bg-[var(--color-brand)] flex items-center justify-center font-bold text-sm text-white shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                    <p className="text-xs text-[var(--color-text-on-dark-muted)] truncate">
                      Role: <span className="capitalize text-[var(--color-brand)]">{authUser.role}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Link
                    href="/guests/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2.5 text-sm text-[var(--color-text-on-dark-muted)] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Guest Dashboard
                  </Link>
                  {authUser.role === 'host' && (
                    <Link
                      href="/host"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2.5 text-sm text-[var(--color-text-on-dark-muted)] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Switch to Hosting
                    </Link>
                  )}
                  {authUser.role === 'guest' && (
                    <Link
                      href="/partner-network"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2.5 text-sm text-[var(--color-text-on-dark-muted)] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Become a Host
                    </Link>
                  )}
                  {authUser.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2.5 text-sm text-[var(--color-text-on-dark-muted)] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Admin Portal
                    </Link>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSignOutClick}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-colors text-sm"
              >
                <UserIcon className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>

        {/* Drawer Footer CTA */}
        <div className="p-5 border-t border-[var(--color-border-dark)] bg-[var(--color-bg-dark)]">
          <Link
            href={SITE_CONFIG.links.browse}
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center w-full py-3 px-4 rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
          >
            Browse Apartments
          </Link>
        </div>
      </div>
    </div>
  );
};
