import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { getUserByEmail } from '@/lib/api/users';
import { notifyPasswordReset } from '@/lib/email/notifications';
import { SITE_CONFIG, getSiteUrl } from '@/content/site';
import { ResetPasswordForm, type ResetPasswordResult } from '@/features/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset Password | NomadDesk',
  description: 'Enter your registered email to receive a password recovery link.',
  robots: { index: false, follow: false },
};

const resetEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address.')
  .max(255);

export default function PasswordResetPage() {
  async function requestPasswordResetAction(email: string): Promise<ResetPasswordResult> {
    'use server';

    const parsed = resetEmailSchema.safeParse(email);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Please enter a valid email address.',
      };
    }

    try {
      const normalizedEmail = parsed.data;
      const existingUser = await getUserByEmail(normalizedEmail);
      // Dispatch email for registered accounts; return generic success to avoid email enumeration
      if (existingUser && existingUser.isActive) {
        const resetUrl = `${getSiteUrl()}/login?reset=requested`;
        await notifyPasswordReset(normalizedEmail, resetUrl);
      }
      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Unable to send reset instructions right now. Please try again shortly.',
      };
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col justify-between py-6 px-4 sm:px-6">
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

      <main className="flex-1 flex items-center justify-center my-4">
        <div className="w-full max-w-[480px] bg-white rounded-3xl border border-[var(--color-border-light)] shadow-[var(--shadow-lg)] overflow-hidden">
          <ResetPasswordForm requestResetAction={requestPasswordResetAction} />
        </div>
      </main>

      <div className="max-w-[480px] mx-auto w-full text-center py-4">
        <p className="text-[11px] text-[var(--color-text-light-subtle)]">
          Need urgent help? Contact{' '}
          <a
            href={`mailto:${SITE_CONFIG.contactEmail}`}
            className="text-[var(--color-brand)] underline"
          >
            {SITE_CONFIG.contactEmail}
          </a>
        </p>
      </div>
    </div>
  );
}
