import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getUserByEmail, createUser } from '@/lib/api/users';
import { setCurrentUserId } from '@/lib/auth/session';
import { RegisterForm, type RegisterResult } from '@/features/auth/register-form';

export const metadata: Metadata = {
  title: 'Create Account | NomadDesk',
  description:
    'Join thousands of remote professionals and digital nomads booking monthly stays.',
};

interface RegisterPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  // Server Action for registering a new guest user
  async function registerAction(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<RegisterResult> {
    'use server';

    try {
      const email = data.email.trim().toLowerCase();
      const existing = await getUserByEmail(email);

      if (existing) {
        return {
          success: false,
          error: 'Email is already registered. Please sign in instead.',
        };
      }

      const newUser = await createUser({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        passwordHash: data.password,
        role: 'guest',
        isActive: true,
      });

      await setCurrentUserId(newUser.id);

      return {
        success: true,
        user: {
          id: newUser.id,
          name: `${newUser.firstName} ${newUser.lastName}`.trim(),
          email: newUser.email,
          role: newUser.role,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Registration failed. Please try again.',
      };
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top back navigation */}
      <div className="max-w-[600px] mx-auto w-full flex items-center justify-between pb-4">
        <Link
          href="/"
          className="text-xs sm:text-sm font-medium text-[var(--color-text-on-light-muted)] hover:text-[var(--color-brand)] transition-colors flex items-center gap-1"
        >
          <span>← Back to Explore</span>
        </Link>
        <Link
          href="/login"
          className="text-xs font-semibold text-[var(--color-brand)] hover:underline"
        >
          Already registered? Sign In →
        </Link>
      </div>

      {/* Main Form Card (600px max-w measured from design/register.html) */}
      <main className="flex-1 flex items-center justify-center my-4">
        <div className="w-full max-w-[600px] bg-white rounded-3xl border border-[var(--color-border-light)] shadow-[var(--shadow-lg)] overflow-hidden">
          <Suspense
            fallback={
              <div className="p-8 sm:p-10 animate-pulse space-y-4">
                <div className="h-8 bg-neutral-200 rounded w-2/3" />
                <div className="h-4 bg-neutral-100 rounded w-3/4" />
                <div className="h-10 bg-neutral-100 rounded mt-6" />
                <div className="h-10 bg-neutral-100 rounded" />
              </div>
            }
          >
            <RegisterForm
              registerAction={registerAction}
              callbackUrl={params.callbackUrl}
            />
          </Suspense>
        </div>
      </main>

      <div className="max-w-[600px] mx-auto w-full text-center py-4">
        <p className="text-[11px] text-[var(--color-text-light-subtle)]">
          Protected by NomadDesk Verified Remote Work Guarantee.
        </p>
      </div>
    </div>
  );
}
