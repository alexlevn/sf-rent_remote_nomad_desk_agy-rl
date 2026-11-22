'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ResetPasswordResult {
  success: boolean;
  error?: string;
}

interface ResetPasswordFormProps {
  requestResetAction: (email: string) => Promise<ResetPasswordResult>;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  requestResetAction,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await requestResetAction(email.trim());
      if (!result.success) {
        setErrorMessage(result.error || 'Could not send reset email. Please try again.');
        return;
      }
      setIsSubmitted(true);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not send reset email. Please try again.'
      );
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="p-8 sm:p-10">
      <h1 className="text-2xl font-bold text-[var(--color-text-on-light)] tracking-tight mb-2">
        Reset your password
      </h1>
      <p className="text-sm text-[var(--color-text-on-light-muted)] mb-6">
        Enter your registered email address and we&apos;ll send a password recovery link.
      </p>

      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-[var(--color-error-text)]"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-error)]" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSubmitted ? (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)] text-sm text-[var(--color-success)] flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-[var(--color-success)]" />
            <div className="space-y-1">
              <p className="font-semibold text-[var(--color-text-on-light)]">
                Password recovery link dispatched!
              </p>
              <p className="text-xs text-[var(--color-text-on-light-muted)] leading-relaxed">
                If an account exists for{' '}
                <strong className="font-semibold text-[var(--color-text-on-light)]">{email}</strong>,
                a recovery link has been sent to your inbox.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              pill
              onClick={() => {
                setIsSubmitted(false);
                setEmail('');
                setErrorMessage(null);
              }}
              className="flex-1"
            >
              Send another link
            </Button>
            <Link
              href="/login"
              className="flex-1 inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-full bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reset-email"
              className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <input
                id="reset-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-light-subtle)] pointer-events-none" />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            pill
            isLoading={isLoading}
            className="w-full mt-2 font-semibold flex items-center justify-center gap-2"
          >
            <span>Send Reset Link</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-xs text-[var(--color-text-on-light-muted)] hover:text-[var(--color-brand)] transition-colors"
            >
              Remember your password?{' '}
              <span className="font-semibold text-[var(--color-brand)]">Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};
