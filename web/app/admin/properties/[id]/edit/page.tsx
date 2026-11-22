import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStrictSessionUser } from '@/lib/auth/session';
import { getPropertyById } from '@/lib/api/properties';
import { listHosts } from '@/lib/api/hosts';
import { listLocations } from '@/lib/api/locations';
import { INT4_MAX } from '@/lib/format';
import { AdminPropertyForm } from '@/features/admin/admin-property-form';

interface AdminEditPropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Edit Property | NomadDesk Admin',
  robots: { index: false, follow: false },
};

export default async function AdminEditPropertyPage({
  params,
}: AdminEditPropertyPageProps) {
  const freshUser = await getStrictSessionUser();

  // Layout renders 403 for unauthorized users; guard here too since layouts and pages render in parallel.
  if (!freshUser || freshUser.role !== 'admin') {
    return null;
  }

  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId) || propertyId <= 0 || propertyId > INT4_MAX) {
    notFound();
  }

  const [property, hosts, locations] = await Promise.all([
    getPropertyById(propertyId),
    listHosts(),
    listLocations({ includeInactive: true }),
  ]);

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
          <span>Admin Portal</span>
          <span>/</span>
          <span>Properties</span>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">
            Edit #{property.id}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
          Edit Property: {property.title}
        </h1>
        <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
          Update listing details, host assignment, pricing, workstation specs, gallery order, and publication status.
        </p>
      </div>

      <AdminPropertyForm
        initialData={property}
        hosts={hosts}
        locations={locations}
      />
    </div>
  );
}
