'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { HostProfile } from '@/lib/types';
import { updateCurrentHostProfileAction } from '@/app/host/profile/actions';
import { ImagePickerField } from '@/features/media/image-picker-field';
import { isSafeImagePath } from '@/lib/validations/media';
import { cn } from '@/lib/utils';

interface HostProfileFormProps {
  initialProfile: HostProfile;
  isReadOnly?: boolean;
}

export function HostProfileForm({
  initialProfile,
  isReadOnly = false,
}: HostProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName || '');
  const [phone, setPhone] = useState(initialProfile.phone || '');
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [cities, setCities] = useState(initialProfile.cities || '');
  const [portfolioSize, setPortfolioSize] = useState<number>(initialProfile.portfolioSize || 1);
  const [website, setWebsite] = useState(initialProfile.website || '');
  const [avatar, setAvatar] = useState(initialProfile.avatar || '');
  const [failedPreviewAvatar, setFailedPreviewAvatar] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSaving(true);
    setFeedback(null);

    try {
      if (!displayName.trim()) {
        setFeedback({ type: 'error', message: 'Display name is required.' });
        return;
      }

      const trimmedAvatar = avatar.trim();
      if (trimmedAvatar.length > 0 && !isSafeImagePath(trimmedAvatar)) {
        setFeedback({
          type: 'error',
          message: 'Host avatar must be a valid /uploads/, /seed/, or https:// URL.',
        });
        return;
      }

      const updated = await updateCurrentHostProfileAction({
        displayName: displayName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        cities: cities.trim(),
        portfolioSize: Math.max(1, Number(portfolioSize) || 1),
        website: website.trim() || null,
        avatar: trimmedAvatar || null,
      });

      setAvatar(updated.avatar || '');
      setFailedPreviewAvatar(null);
      setFeedback({
        type: 'success',
        message: 'Host profile updated successfully! Changes are live on your listings.',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to update profile. Please check your network and try again.',
      });
    } finally {
      setIsSaving(false);
      isSubmittingRef.current = false;
    }
  };

  const trimmedAvatar = avatar.trim();
  const showAvatarImage =
    trimmedAvatar.length > 0 &&
    isSafeImagePath(trimmedAvatar) &&
    failedPreviewAvatar !== trimmedAvatar;
  const previewInitials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'HO';

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Host Public Profile
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Manage the public contact information and company story shown on your apartment listing pages and booking confirmations.
        </p>
      </div>

      {feedback && (
        <div
          role="alert"
          className={cn(
            'p-4 rounded-xl flex items-center justify-between text-sm shadow-xs',
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200',
          )}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          <ImagePickerField
            id="host-avatar"
            label="Host Logo / Avatar (Optional)"
            value={avatar}
            onChange={(nextUrl) => {
              setFailedPreviewAvatar(null);
              setAvatar(nextUrl);
            }}
            placeholder="/uploads/..., /seed/..., or https://..."
            helperText="Displayed next to 'Hosted by' on your public apartment pages. Leave empty to show your initials."
            allowClear={true}
            previewAspect="square"
            previewAlt={`${displayName || 'Host'} avatar`}
            modalTitle="Choose or Upload Host Avatar"
            testIdPrefix="host-avatar-picker"
            disabled={isReadOnly || isSaving}
          />

          <div>
            <label
              htmlFor="host-profile-display-name"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2"
            >
              Display Name (Visible on Property Pages)
            </label>
            <input
              id="host-profile-display-name"
              type="text"
              required
              disabled={isReadOnly}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Casa Urbana Stays"
              className="w-full text-sm border border-[var(--color-border-light)] rounded-lg px-3.5 py-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] transition-all font-medium text-neutral-900 disabled:opacity-60"
            />
            <p className="text-xs text-neutral-400 mt-1.5">
              This is the official brand name remote workers will see next to &quot;Hosted by&quot;.
            </p>
          </div>

          <div>
            <label
              htmlFor="host-profile-phone"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2"
            >
              Phone Number
            </label>
            <input
              id="host-profile-phone"
              type="tel"
              required
              disabled={isReadOnly}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 001"
              className="w-full text-sm border border-[var(--color-border-light)] rounded-lg px-3.5 py-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] transition-all font-medium text-neutral-900 disabled:opacity-60"
            />
            <p className="text-xs text-neutral-400 mt-1.5">
              Used strictly by operations and for urgent check-in day communication.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="host-profile-cities"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2"
              >
                Operating Cities
              </label>
              <input
                id="host-profile-cities"
                type="text"
                disabled={isReadOnly}
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                placeholder="Madrid, Barcelona"
                className="w-full text-sm border border-[var(--color-border-light)] rounded-lg px-3.5 py-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] transition-all text-neutral-900 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="host-profile-portfolio-size"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2"
              >
                Portfolio Size (Apartments)
              </label>
              <input
                id="host-profile-portfolio-size"
                type="number"
                min="1"
                disabled={isReadOnly}
                value={portfolioSize}
                onChange={(e) => setPortfolioSize(parseInt(e.target.value, 10) || 1)}
                className="w-full text-sm border border-[var(--color-border-light)] rounded-lg px-3.5 py-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] transition-all text-neutral-900 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="host-profile-website"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2"
            >
              Website / Company Link (Optional)
            </label>
            <input
              id="host-profile-website"
              type="url"
              disabled={isReadOnly}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://casaurbana.example.com"
              className="w-full text-sm border border-[var(--color-border-light)] rounded-lg px-3.5 py-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] transition-all text-neutral-900 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="host-profile-bio"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2"
            >
              Company Bio &amp; Hosting Philosophy
            </label>
            <textarea
              id="host-profile-bio"
              rows={4}
              disabled={isReadOnly}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell guests about your hospitality standards and property portfolio..."
              className="w-full text-sm border border-[var(--color-border-light)] rounded-lg px-3.5 py-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] transition-all text-neutral-900 leading-relaxed disabled:opacity-60"
            />
            <p className="text-xs text-neutral-400 mt-1.5">
              Highlight your focus on remote workers, high-speed fiber, and quiet residential neighborhoods.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[var(--color-border-light)]">
            <span className="text-xs text-neutral-400">
              {isReadOnly
                ? 'Editing disabled while account is suspended'
                : 'Changes update immediately on the marketplace'}
            </span>
            <button
              type="submit"
              disabled={isReadOnly || isSaving}
              className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isSaving ? 'Saving Profile...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Public Profile Preview Card */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Live Guest Preview</span>
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Partner</span>
          </span>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border-light)] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {showAvatarImage ? (
            <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[var(--color-border-light)] bg-neutral-100 shrink-0 shadow-inner">
              <Image
                src={trimmedAvatar}
                alt={`${displayName || 'Host'} avatar`}
                fill
                unoptimized
                sizes="56px"
                data-testid="host-profile-preview-avatar"
                className="object-cover"
                onError={() => setFailedPreviewAvatar(trimmedAvatar)}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-neutral-800 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-inner">
              {previewInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-base text-neutral-900">
                Hosted by {displayName}
              </span>
              {cities && <span className="text-xs text-neutral-400">• {cities}</span>}
            </div>
            <p className="text-xs text-neutral-600 mt-1 line-clamp-2 leading-relaxed">
              {bio}
            </p>
            <div className="mt-2.5 flex items-center gap-4 text-[11px] text-neutral-400">
              <span>{portfolioSize} managed units</span>
              <span>•</span>
              <span>Dedicated remote work support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
