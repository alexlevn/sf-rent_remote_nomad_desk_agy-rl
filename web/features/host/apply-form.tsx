'use client';

import React, { useState, useRef } from 'react';
import {
  Building2,
  Phone,
  Globe,
  MapPin,
  Layers,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type { HostApplicationInput, HostProfile } from '@/lib/types';
import { BOOKING_RULES } from '@/content/booking-rules';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ApplyFormProps {
  initialData?: Partial<HostApplicationInput>;
  onSubmit: (data: HostApplicationInput) => Promise<{
    success: boolean;
    error?: string;
    host?: HostProfile;
  }>;
  isResubmission?: boolean;
  onCancelResubmit?: () => void;
  onSuccess?: (host: HostProfile) => void;
}

export const ApplyForm: React.FC<ApplyFormProps> = ({
  initialData,
  onSubmit,
  isResubmission = false,
  onCancelResubmit,
  onSuccess,
}) => {
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [cities, setCities] = useState(initialData?.cities || '');
  const [portfolioSize, setPortfolioSize] = useState<number>(initialData?.portfolioSize || 5);
  const [bio, setBio] = useState(
    initialData?.bio ||
      'Portfolio of modern furnished apartments with dedicated fiber optic internet (≥ 300 Mbps) and ergonomic standing desks.'
  );
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    // Basic validation
    if (!displayName.trim()) {
      setErrorMessage('Please enter your company or display name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter a valid contact phone number.');
      return;
    }
    if (!cities.trim()) {
      setErrorMessage('Please list the cities where your apartments operate.');
      return;
    }
    if (portfolioSize < 1) {
      setErrorMessage('Number of curated units must be at least 1.');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('You must agree to the NomadDesk Host Partner Terms to proceed.');
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await onSubmit({
        displayName: displayName.trim(),
        phone: phone.trim(),
        website: website.trim() ? website.trim() : null,
        cities: cities.trim(),
        portfolioSize: Number(portfolioSize) || 1,
        bio: bio.trim(),
        termsAccepted: true,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit application. Please check your information.');
        return;
      }

      if (res.host && onSuccess) {
        onSuccess(res.host);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while submitting.'
      );
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[var(--color-border-light)] p-8 sm:p-10 shadow-[var(--shadow-md)]">
      {/* Header Badge & Title */}
      <div className="mb-6">
        <Badge variant="accent" pill className="mb-3">
          Host Membership Application
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-on-light)] tracking-tight mb-2">
          {isResubmission ? 'Update & Resubmit Portfolio' : 'Tell Us About Your Apartment Portfolio'}
        </h1>
        <p className="text-sm text-[var(--color-text-on-light-muted)]">
          NomadDesk is a curated marketplace. All applications are reviewed by our operations team within 24 business hours.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 mb-6 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Application Error</span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Company Name */}
        <div>
          <label htmlFor="host-apply-display-name" className="block text-xs font-semibold text-[var(--color-text-on-light)] uppercase tracking-wider mb-2">
            Company / Display Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="host-apply-display-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Casa Urbana Stays"
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-light)] bg-white text-sm text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent transition-all"
            />
            <Building2 className="w-4 h-4 text-[var(--color-text-light-subtle)] absolute right-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Phone & Website (2 columns on sm+) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="host-apply-phone" className="block text-xs font-semibold text-[var(--color-text-on-light)] uppercase tracking-wider mb-2">
              Contact Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="host-apply-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 001"
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-light)] bg-white text-sm text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent transition-all"
              />
              <Phone className="w-4 h-4 text-[var(--color-text-light-subtle)] absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="host-apply-website" className="block text-xs font-semibold text-[var(--color-text-on-light)] uppercase tracking-wider mb-2">
              Website / Portfolio Link <span className="text-[var(--color-text-light-subtle)] font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                id="host-apply-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://casaurbana.example.com"
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-light)] bg-white text-sm text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent transition-all"
              />
              <Globe className="w-4 h-4 text-[var(--color-text-light-subtle)] absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Operating Cities & Units */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="host-apply-cities" className="block text-xs font-semibold text-[var(--color-text-on-light)] uppercase tracking-wider mb-2">
              Operating Cities <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="host-apply-cities"
                type="text"
                required
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                placeholder="Madrid, Barcelona"
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-light)] bg-white text-sm text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent transition-all"
              />
              <MapPin className="w-4 h-4 text-[var(--color-text-light-subtle)] absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="host-apply-portfolio-size" className="block text-xs font-semibold text-[var(--color-text-on-light)] uppercase tracking-wider mb-2">
              Number of Curated Units <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="host-apply-portfolio-size"
                type="number"
                min="1"
                required
                value={portfolioSize}
                onChange={(e) => setPortfolioSize(parseInt(e.target.value, 10) || 1)}
                placeholder="5"
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-light)] bg-white text-sm text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent transition-all"
              />
              <Layers className="w-4 h-4 text-[var(--color-text-light-subtle)] absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Bio / Description */}
        <div>
          <label htmlFor="host-apply-bio" className="block text-xs font-semibold text-[var(--color-text-on-light)] uppercase tracking-wider mb-2">
            Tell us about your furnished apartments and existing workspaces
          </label>
          <div className="relative">
            <textarea
              id="host-apply-bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Briefly describe your furnishings, interior style, and internet speeds..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-light)] bg-white text-sm text-[var(--color-text-on-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent transition-all resize-y"
            />
          </div>
          <p className="text-[11px] text-[var(--color-text-on-light-muted)] mt-1.5">
            Tip: Highlight fiber speeds (≥ 300 Mbps) and quiet work environments for faster approval.
          </p>
        </div>

        {/* Agreement Checkbox */}
        <div className="pt-2">
          <label htmlFor="agree" className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              id="agree"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-light)] text-[var(--color-brand)] focus:ring-[var(--color-brand)] cursor-pointer"
            />
            <span className="text-xs text-[var(--color-text-on-light-muted)] leading-relaxed">
              I agree to the <span className="font-semibold text-[var(--color-text-on-light)]">NomadDesk Host Partner Terms</span> ({BOOKING_RULES.commissionPercent}% platform commission, {BOOKING_RULES.respondHours}h booking response window, and verified high-speed internet standard).
            </span>
          </label>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="w-full sm:flex-1 py-3.5 text-sm font-semibold rounded-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Application...
              </>
            ) : isResubmission ? (
              <>
                <RotateCcw className="w-4 h-4" />
                Update &amp; Resubmit Application →
              </>
            ) : (
              <>
                Submit Application for Approval →
              </>
            )}
          </Button>

          {isResubmission && onCancelResubmit && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancelResubmit}
              className="w-full sm:w-auto py-3.5 rounded-full"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
