import React from 'react';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireHost } from '@/lib/auth/guards';
import { getHostPortalContext, redactUnconfirmedReservation } from '@/lib/auth/host-page';
import { listProperties } from '@/lib/api/properties';
import { listReservations, updateReservationStatus } from '@/lib/api/reservations';
import { toUtcDateString } from '@/lib/format';
import { HostReservationsTable } from '@/features/host/host-reservations-table';

export const metadata: Metadata = {
  title: 'Reservations Management | NomadDesk Host Portal',
  description:
    'Review pending booking requests, view upcoming stays, guest contact information, and gross rental earnings.',
  robots: { index: false, follow: false },
};

export default async function HostReservationsPage() {
  const { host, isReadOnly } = await getHostPortalContext('/host/reservations');

  const [properties, rawReservations] = await Promise.all([
    listProperties({ hostId: host.id, status: 'all' }),
    listReservations({ hostId: host.id }),
  ]);

  const reservations = rawReservations.map(redactUnconfirmedReservation);
  const todayIso = toUtcDateString(new Date());

  async function acceptReservationAction(reservationId: number) {
    'use server';
    try {
      const { hostId } = await requireHost();
      const updated = await updateReservationStatus(
        reservationId,
        'confirmed',
        undefined,
        undefined,
        { hostId }
      );
      revalidatePath('/host/reservations');
      revalidatePath('/host');
      revalidatePath('/host/calendar');
      revalidatePath('/host/payouts');
      return { success: true, reservation: updated };
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

  async function rejectReservationAction(reservationId: number, reason?: string) {
    'use server';
    try {
      const { hostId } = await requireHost();
      const updated = await updateReservationStatus(
        reservationId,
        'rejected',
        reason,
        'host',
        { hostId }
      );
      revalidatePath('/host/reservations');
      revalidatePath('/host');
      revalidatePath('/host/calendar');
      revalidatePath('/host/payouts');
      return { success: true, reservation: redactUnconfirmedReservation(updated) };
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
      todayIso={todayIso}
      isReadOnly={isReadOnly}
      onAcceptAction={acceptReservationAction}
      onRejectAction={rejectReservationAction}
    />
  );
}
