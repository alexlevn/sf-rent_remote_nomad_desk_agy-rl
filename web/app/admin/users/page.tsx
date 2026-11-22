import React from 'react';
import { getStrictSessionUser } from '@/lib/auth/session';
import { UserTable } from '@/features/admin/user-table';

export default async function AdminUsersPage() {
  const freshUser = await getStrictSessionUser();

  // Layout renders 403 for unauthorized users; guard here too since layouts and pages render in parallel.
  if (!freshUser || freshUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
          <span>Admin Portal</span>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">User Directory</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
          User Account Directory
        </h1>
        <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
          Manage user accounts, assign administrative privileges, and control account suspension status.
        </p>
      </div>

      <UserTable currentAdminId={freshUser.id} currentAdminEmail={freshUser.email} />
    </div>
  );
}
