import React from 'react';
import { AllReservationsTable } from '@/features/admin/all-reservations-table';

export default function AdminReservationsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
          <span>Admin Portal</span>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">Booking Monitor</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
          Global Reservation Audit
        </h1>
        <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
          Audit remote stay reservations, verify 10% platform revenue commissions, and execute admin intervention voids.
        </p>
      </div>

      <AllReservationsTable />
    </div>
  );
}
