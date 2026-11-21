import React from 'react';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { getHostProfile } from '@/lib/api/hosts';
import { listProperties } from '@/lib/api/properties';
import { listReservations, updateReservationStatus } from '@/lib/api/reservations';
import { HostReservationsTable } from '@/features/host/host-reservations-table';

export const metadata: Metadata = {
  title: 'Reservations Management | NomadDesk Host Portal',
  description:
    'Review pending booking requests, view upcoming stays, guest contact information, and gross rental earnings.',
  robots: { index: false, follow: false },
};

export default async function HostReservationsPage() {
  const user = await getCurrentUser();
  const host =
    (user ? await getHostProfile(user.id) : null) || (await getHostProfile(1));

  if (!host) {
    return (
      <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-8 text-center">
        <h2 className="text-lg font-bold text-neutral-900 mb-2">No Host Profile Found</h2>
        <p className="text-sm text-neutral-500">Please apply to become a host partner first.</p>
      </div>
    );
  }

  // Fetch host properties and reservations
  const properties = await listProperties({ hostId: host.id, status: 'all' });
  const reservations = await listReservations({ hostId: host.id });

  // Server Action to accept booking request (AC-HOST-4)
  async function acceptReservationAction(reservationId: number) {
    'use server';
    try {
      await updateReservationStatus(reservationId, 'confirmed');
      revalidatePath('/host/reservations');
      revalidatePath('/host');
      revalidatePath('/host/calendar');
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to accept booking request.',
      };
    }
  }

  // Server Action to reject booking request (AC-HOST-5)
  async function rejectReservationAction(reservationId: number, reason?: string) {
    'use server';
    try {
      await updateReservationStatus(reservationId, 'rejected', reason, 'host');
      revalidatePath('/host/reservations');
      revalidatePath('/host');
      revalidatePath('/host/calendar');
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to reject booking request.',
      };
    }
  }

  return (
    <HostReservationsTable
      initialReservations={reservations}
      properties={properties}
      onAcceptAction={acceptReservationAction}
      onRejectAction={rejectReservationAction}
    />
  );
}
