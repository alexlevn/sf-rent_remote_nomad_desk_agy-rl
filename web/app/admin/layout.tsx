import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { auth } from '@/lib/auth/config';
import { getUserById } from '@/lib/api/users';
import { AdminShell } from '@/features/admin/admin-shell';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Check Auth.js session directly so unauthenticated requests do not fall back to demo guest user.
  const session = await auth();
  const rawUserId = session?.user?.id ? Number(session.user.id) : NaN;
  const freshUser =
    Number.isInteger(rawUserId) && rawUserId > 0 && rawUserId <= 2_147_483_647
      ? await getUserById(rawUserId)
      : null;

  // AC-AUTH-2: Unauthenticated state -> 403 Forbidden / Login prompt
  if (!freshUser) {
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
            <Link
              href="/login?callbackUrl=/admin"
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-brand)] text-white text-sm font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm"
            >
              Go to Login Page
            </Link>
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

  // AC-AUTH-2: Suspended/inactive account or non-admin role -> 403 Forbidden
  if (!freshUser.isActive || freshUser.role !== 'admin') {
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
            Logged in as <strong className="text-neutral-900">{freshUser.email}</strong> (Role:{' '}
            <span className="uppercase font-semibold">{freshUser.role}</span>).
          </p>
          <p className="text-xs text-neutral-500 mb-6">
            {!freshUser.isActive
              ? 'Your account is currently suspended or inactive. Contact a platform administrator for assistance.'
              : 'Only active users with the admin role are authorized to access the platform management portal.'}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login?callbackUrl=/admin"
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-brand)] text-white text-sm font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm"
            >
              Sign In with Another Account
            </Link>
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

  return (
    <AdminShell
      currentUser={{
        id: freshUser.id,
        email: freshUser.email,
        firstName: freshUser.firstName ?? null,
        lastName: freshUser.lastName ?? null,
        role: freshUser.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
