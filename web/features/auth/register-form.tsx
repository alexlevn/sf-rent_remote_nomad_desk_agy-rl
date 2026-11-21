'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RegisterResult {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    role: 'guest' | 'host' | 'admin';
  };
  error?: string;
}

interface RegisterFormProps {
  registerAction: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<RegisterResult>;
  callbackUrl?: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  registerAction,
  callbackUrl: propCallbackUrl,
}) => {
  const searchParams = useSearchParams();
  const callbackUrl = propCallbackUrl || searchParams.get('callbackUrl') || undefined;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setErrorMessage(null);

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please provide both first and last name.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('You must agree to NomadDesk Terms of Service and Privacy Policy.');
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const res = await registerAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account. Please try again.');
        return;
      }

      if (res.user) {
        try {
          localStorage.setItem('nomaddesk_user', JSON.stringify(res.user));
          window.dispatchEvent(new Event('storage'));
        } catch {
          // Ignore localStorage errors
        }

        // Redirect to callbackUrl if present, otherwise guests dashboard or home
        const targetUrl = callbackUrl || '/guests/dashboard';
        window.location.href = targetUrl;
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during registration.'
      );
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="p-8 sm:p-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-on-light)] tracking-tight mb-2">
        Create your NomadDesk account
      </h1>
      <p className="text-sm text-[var(--color-text-on-light-muted)] mb-6">
        Join thousands of remote professionals and digital nomads booking monthly stays.
      </p>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] transition-all"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#b91c1c]" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="register-firstname"
              className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
            >
              First Name
            </label>
            <input
              id="register-firstname"
              name="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
            />
          </div>
          <div>
            <label
              htmlFor="register-lastname"
              className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
            >
              Last Name
            </label>
            <input
              id="register-lastname"
              name="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Le"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
          >
            Email Address
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
            className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
          >
            Password (Min 8 characters)
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="register-confirm-password"
            className="block text-xs font-semibold text-[var(--color-text-on-light)] mb-1.5"
          >
            Confirm Password
          </label>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 text-sm bg-white border border-[var(--color-border-light)] rounded-xl placeholder:text-[var(--color-text-light-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all"
          />
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            id="register-terms"
            name="terms"
            type="checkbox"
            required
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="h-4 w-4 mt-0.5 rounded border-[var(--color-border-light)] text-[var(--color-brand)] focus:ring-[var(--color-brand)] cursor-pointer"
          />
          <label
            htmlFor="register-terms"
            className="text-xs text-[var(--color-text-on-light-muted)] cursor-pointer select-none leading-relaxed"
          >
            I agree to NomadDesk{' '}
            <Link href="/terms" className="text-[var(--color-brand)] hover:underline font-medium">
              Terms of Service
            </Link>{' '}
            and Privacy Policy
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          pill
          isLoading={isLoading}
          className="w-full mt-2 font-semibold flex items-center justify-center gap-2"
        >
          <span>Create Account & Continue</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      {/* Social Register Buttons (Disabled Mock) */}
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

      {/* Host callout */}
      <div className="text-xs text-[var(--color-text-on-light-muted)] text-center mt-6">
        Are you a property manager?{' '}
        <Link
          href="/partner-network"
          className="text-[var(--color-brand)] font-semibold hover:underline"
        >
          Apply to become a Host partner
        </Link>
      </div>
    </div>
  );
};
