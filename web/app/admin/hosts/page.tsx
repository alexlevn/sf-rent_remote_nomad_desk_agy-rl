import React from 'react';
import { HostApplicationsTable } from '@/features/admin/host-applications-table';

export default function AdminHostsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
          <span>Admin Portal</span>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">Host Approvals</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
          Host Partner Moderation
        </h1>
        <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
          Review, approve, and moderate host partner applications and monitor active host portfolios across all cities.
        </p>
      </div>

      <HostApplicationsTable />
    </div>
  );
}
