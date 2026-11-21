import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/features/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset Password | NomadDesk',
  description: 'Enter your registered email to receive a password recovery link via Mailpit.',
};

export default function PasswordResetPage() {
  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top back navigation */}
      <div className="max-w-[480px] mx-auto w-full flex items-center justify-between pb-4">
        <Link
          href="/login"
          className="text-xs sm:text-sm font-medium text-[var(--color-brand)] hover:underline flex items-center gap-1"
        >
          <span>← Back to Sign In</span>
        </Link>
        <span className="text-xs text-[var(--color-text-light-subtle)]">
          Password Recovery
        </span>
      </div>

      {/* Main Form Card (480px max-w measured from design/password-reset.html) */}
      <main className="flex-1 flex items-center justify-center my-4">
        <div className="w-full max-w-[480px] bg-white rounded-3xl border border-[var(--color-border-light)] shadow-[var(--shadow-lg)] overflow-hidden">
          <ResetPasswordForm />
        </div>
      </main>

      <div className="max-w-[480px] mx-auto w-full text-center py-4">
        <p className="text-[11px] text-[var(--color-text-light-subtle)]">
          Need urgent help? Contact{' '}
          <a
            href="mailto:support@nomaddesk.com"
            className="text-[var(--color-brand)] underline"
          >
            support@nomaddesk.com
          </a>
        </p>
      </div>
    </div>
  );
}
