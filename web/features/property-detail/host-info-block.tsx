import React from 'react';
import type { HostProfile, Property } from '@/lib/types';

interface HostInfoBlockProps {
  host: HostProfile | null;
  property: Property;
}

export function HostInfoBlock({ host, property }: HostInfoBlockProps) {
  const displayName = host?.displayName || 'Casa Urbana Stays';
  const cities = host?.cities || property.city;
  const portfolioSize = host?.portfolioSize || 12;
  const memberSince = host?.createdAt
    ? new Date(host.createdAt).getFullYear()
    : 2024;
  const bio =
    host?.bio ||
    'Design-led furnished apartments in central Madrid and Barcelona, set up for long stays and focused work.';

  // Generate initials for avatar
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      data-testid="host-info-block"
      className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 mb-8 shadow-xs"
    >
      <div className="flex items-center gap-4">
        {/* Host Avatar */}
        <div className="w-14 h-14 rounded-full bg-[var(--color-text-on-light)] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs">
          {initials}
        </div>

        {/* Host Meta */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)]">
              Hosted by {displayName}
            </h3>
            <span
              data-testid="verified-host-badge"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
            >
              ✓ Verified host
            </span>
          </div>
          <div className="text-xs text-[var(--color-text-on-light-muted)] mt-1">
            Operating in {cities} · {portfolioSize} curated properties · Member since {memberSince}
          </div>
        </div>
      </div>

      {/* Host Bio */}
      <p className="text-sm text-[var(--color-text-on-light-muted)] mt-4 leading-relaxed">
        {bio}
      </p>

      {/* Message Host button (P2 feature mờ nhãn) */}
      <div className="mt-4">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="btn btn-outline btn-sm opacity-50 cursor-not-allowed inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md border border-[var(--color-border-light)] text-[var(--color-text-on-light)] bg-white"
          title="Messaging available upon confirmation"
        >
          Message Host (Soon)
        </button>
      </div>
    </div>
  );
}
