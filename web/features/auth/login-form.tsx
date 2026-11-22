'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeCallbackUrl } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface LoginResult {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    role: 'guest' | 'host' | 'admin';
  };
  error?: string;
  isSuspended?: boolean;
}

interface LoginFormProps {
  loginAction: (credentials: { email: string; password: string }) => Promise<LoginResult>;
  callbackUrl?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  loginAction,
  callbackUrl: propCallbackUrl,
}) => {
  const searchParams = useSearchParams();
  const rawCallbackUrl = propCallbackUrl || searchParams.get('callbackUrl') || undefined;
  const safeCallbackUrl = rawCallbackUrl ? sanitizeCallbackUrl(rawCallbackUrl, '/') : undefined;

  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo1234');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    setIsSuspended(false);

    let willRedirect = false;
    try {
      const loginResult = await loginAction({
        email: email.trim(),
        password,
      });

      if (!loginResult.success) {
        setErrorMessage(loginResult.error || 'Invalid email or password. Please try again.');
        setIsSuspended(Boolean(loginResult.isSuspended));
        return;
      }

      if (loginResult.user) {
        try {
          localStorage.setItem('nomaddesk_user', JSON.stringify(loginResult.user));
          window.dispatchEvent(new Event('storage'));
        } catch {
          // Ignore localStorage errors
        }

        willRedirect = true;
        window.location.href = safeCallbackUrl || '/';
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during sign in.'
      );
    } finally {
      if (!willRedirect) {
        setIsLoading(false);
        isSubmittingRef.current = false;
      }
    }
  };

  const handleQuickFill = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMessage(null);
    setIsSuspended(false);
  };

  return (
    <div className="p-8 sm:p-10">
      <h1 className="text-2xl font-bold text-[var(--color-text-on-light)] tracking-tight mb-2">
        Welcome back
      </h1>
      <p className="text-sm text-[var(--color-text-on-light-muted)] mb-6">
        Sign in to your NomadDesk guest, host, or admin account.
      </p>

      {/* Error / Suspended Alerts */}
      {errorMessage && (
        <div
          role="alert"
          className={cn(
            'mb-5 p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 transition-all border',
            isSuspended
              ? 'bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-[var(--color-warning-text)]'
              : 'bg-[var(--color-error-bg)] border-[var(--color-error-border)] text-[var(--color-error-text)]'
          )}
        >
          {isSuspended ? (
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-warning)]" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-error)]" />
          )}
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
          >
            Email Address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo@example.com"
            className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-[var(--color-text-on-light)]"
            >
              Password
            </label>
            <Link
              href="/password/reset"
              className="text-xs text-[var(--color-brand)] font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          pill
          isLoading={isLoading}
          className="w-full mt-2 font-semibold flex items-center justify-center gap-2"
        >
          <span>Sign In</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      {/* Social Login Buttons (P2 Coming Soon) */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          disabled
          className="flex-1 px-3 py-2 text-xs font-medium border border-[var(--color-border-light)] rounded-xl text-neutral-400 bg-neutral-50 flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
        >
          <span>Google</span>
          <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded-full">
            Coming Soon
          </span>
        </button>
        <button
          type="button"
          disabled
          className="flex-1 px-3 py-2 text-xs font-medium border border-[var(--color-border-light)] rounded-xl text-neutral-400 bg-neutral-50 flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
        >
          <span>LinkedIn</span>
          <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded-full">
            Coming Soon
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="my-5 text-center relative">
        <span className="bg-white px-3 text-[10px] font-semibold text-[var(--color-text-on-light-muted)] uppercase tracking-wider relative z-10">
          OR SEED ACCOUNTS
        </span>
        <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--color-border-light)]" />
      </div>

      {/* Quick Seed Accounts */}
      <div className="flex gap-2 text-[11px] flex-wrap justify-center">
        <button
          type="button"
          onClick={() => handleQuickFill('demo@example.com', 'demo1234')}
          className="px-2.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium transition-colors border border-neutral-200 cursor-pointer"
          title="Sign in as Guest Demo"
        >
          Guest: demo@example.com
        </button>
        <button
          type="button"
          onClick={() => handleQuickFill('host@example.com', 'host1234')}
          className="px-2.5 py-1.5 rounded-full bg-[var(--color-warning-bg)] hover:opacity-90 text-[var(--color-warning-text)] font-medium transition-colors border border-[var(--color-warning-border)] cursor-pointer"
          title="Sign in as Host"
        >
          Host: host@example.com
        </button>
        <button
          type="button"
          onClick={() => handleQuickFill('admin@example.com', 'admin1234')}
          className="px-2.5 py-1.5 rounded-full bg-[var(--color-info-bg)] hover:opacity-90 text-[var(--color-info)] font-medium transition-colors border border-[var(--color-info-border)] cursor-pointer"
          title="Sign in as Admin"
        >
          Admin: admin@example.com
        </button>
      </div>

      {/* Bottom Registration Link */}
      <div className="text-xs text-[var(--color-text-on-light-muted)] text-center mt-6">
        Don&apos;t have an account yet?{' '}
        <Link
          href={
            safeCallbackUrl
              ? `/register?callbackUrl=${encodeURIComponent(safeCallbackUrl)}`
              : '/register'
          }
          className="text-[var(--color-brand)] font-semibold hover:underline"
        >
          Create account
        </Link>
      </div>
    </div>
  );
};
