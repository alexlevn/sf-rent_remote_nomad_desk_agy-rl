import React from 'react';
import type { Metadata } from 'next';
import { getStrictSessionUser } from '@/lib/auth/session';
import { listHosts } from '@/lib/api/hosts';
import { listLocations } from '@/lib/api/locations';
import { AdminPropertyForm } from '@/features/admin/admin-property-form';

export const metadata: Metadata = {
  title: 'Add New Property | NomadDesk Admin',
  robots: { index: false, follow: false },
};

export default async function AdminNewPropertyPage() {
  const freshUser = await getStrictSessionUser();

  // Layout renders 403 for unauthorized users; guard here too since layouts and pages render in parallel.
  if (!freshUser || freshUser.role !== 'admin') {
    return null;
  }

  const [hosts, locations] = await Promise.all([
    listHosts(),
    listLocations({ includeInactive: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
          <span>Admin Portal</span>
          <span>/</span>
          <span>Properties</span>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">
            New Property
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
          Add New Property
        </h1>
        <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
          Create a new apartment listing on behalf of a host and publish it directly to NomadDesk.
        </p>
      </div>

      <AdminPropertyForm hosts={hosts} locations={locations} />
    </div>
  );
}
