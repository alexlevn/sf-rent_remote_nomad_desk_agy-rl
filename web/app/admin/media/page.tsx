import React from 'react';
import type { Metadata } from 'next';
import { getStrictSessionUser } from '@/lib/auth/session';
import { MediaLibraryManager } from '@/features/admin/media-library-manager';

export const metadata: Metadata = {
  title: 'Media Library | NomadDesk Admin',
  robots: { index: false, follow: false },
};

export default async function AdminMediaPage() {
  const freshUser = await getStrictSessionUser();

  // Layout renders 403 for unauthorized users; guard here too since layouts and pages render in parallel.
  if (!freshUser || freshUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
          <span>Admin Portal</span>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">
            Media Library
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
          Media Library
        </h1>
        <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
          Upload, search, copy URLs, and clean up unused images stored across NomadDesk.
        </p>
      </div>

      <MediaLibraryManager />
    </div>
  );
}
