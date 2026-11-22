import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getUserByEmail } from '@/lib/api/users';
import { signIn } from '@/lib/auth/config';
import { setCurrentUserId } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { SITE_CONFIG } from '@/content/site';
import { LoginForm, type LoginResult } from '@/features/auth/login-form';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Sign In | NomadDesk',
  description: 'Sign in to your NomadDesk guest, host, or admin account.',
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  async function loginAction(credentials: {
    email: string;
    password: string;
  }): Promise<LoginResult> {
    'use server';

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;
    const user = await getUserByEmail(email);

    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password. Please try again.',
      };
    }

    if (user.isActive === false) {
      return {
        success: false,
        error: `This account has been suspended by administration. Contact ${SITE_CONFIG.contactEmail}.`,
        isSuspended: true,
      };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid email or password. Please try again.',
      };
    }

    try {
      await signIn('credentials', {
        email: user.email,
        password,
        redirect: false,
      });
    } catch {
      return {
        success: false,
        error: 'Unable to establish an authenticated session. Please try again.',
      };
    }

    await setCurrentUserId(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
      },
    };
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-4">
        <Link
          href="/"
          className="text-xs sm:text-sm font-medium text-[var(--color-text-on-light-muted)] hover:text-[var(--color-brand)] transition-colors flex items-center gap-1"
        >
          <span>← Back to Explore</span>
        </Link>
        <span className="text-xs text-[var(--color-text-light-subtle)]">
          Secure Authentication
        </span>
      </div>

      <main className="flex-1 flex items-center justify-center my-4">
        <div className="w-full max-w-4xl bg-white rounded-3xl border border-[var(--color-border-light)] shadow-[var(--shadow-lg)] overflow-hidden grid grid-cols-1 md:grid-cols-2">
          <Suspense
            fallback={
              <div className="p-8 sm:p-10 animate-pulse space-y-4">
                <div className="h-8 bg-neutral-200 rounded w-1/2" />
                <div className="h-4 bg-neutral-100 rounded w-3/4" />
                <div className="h-10 bg-neutral-100 rounded mt-6" />
                <div className="h-10 bg-neutral-100 rounded" />
              </div>
            }
          >
            <LoginForm loginAction={loginAction} callbackUrl={params.callbackUrl} />
          </Suspense>

          <div className="relative hidden md:flex flex-col justify-between p-10 bg-[var(--color-text-on-light)] text-white overflow-hidden">
            <Image
              src="/seed/property/prop-madrid-1.webp"
              alt="NomadDesk Workstation Apartment"
              fill
              sizes="(min-width: 768px) 450px, 100vw"
              className="object-cover opacity-35"
              priority
            />
            <div className="relative z-10 space-y-3">
              <Badge variant="accent" pill>
                Verified Nomad Stays
              </Badge>
              <h3 className="text-2xl font-bold text-white tracking-tight leading-snug">
                Arrive, sit down at a 4K dual desk, and get to work.
              </h3>
            </div>
            <div className="relative z-10 pt-12">
              <p className="text-xs text-[var(--color-text-on-dark-subtle)] italic border-l-2 border-[var(--color-brand)] pl-3">
                &ldquo;The fastest move-in experience I&apos;ve had in 4 years of nomadic software engineering.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
