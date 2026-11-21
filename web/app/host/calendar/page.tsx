import React from 'react';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { requireHost } from '@/lib/auth/guards';
import { getHostProfile, getHostByUserId } from '@/lib/api/hosts';
import { listProperties } from '@/lib/api/properties';
import {
  listReservations,
  listBlockedDates,
  addBlockedDate,
  deleteBlockedDate,
} from '@/lib/api/reservations';
import type { BlockedDate } from '@/lib/types';
import { CalendarMonthGrid } from '@/features/host/calendar-month-grid';

export const metadata: Metadata = {
  title: 'Availability Calendar & Blocked Dates | NomadDesk Host Portal',
  description:
    'Manage your property availability, view active booking schedules, and block dates for personal use or scheduled maintenance.',
  robots: { index: false, follow: false },
};

export default async function HostCalendarPage() {
  const user = await getCurrentUser();
  const host =
    (user ? await getHostByUserId(user.id) : null) || (await getHostProfile(1));

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

  // Fetch blocked dates for all host properties
  const blockedDatesNested = await Promise.all(
    properties.map((p) => listBlockedDates(p.id))
  );
  const blockedDates: BlockedDate[] = blockedDatesNested.flat();

  // Server action to block dates (AC-HOST-6)
  async function blockDatesAction(data: {
    propertyId: number;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    'use server';
    try {
      const { hostId } = await requireHost();
      const created = await addBlockedDate(
        {
          propertyId: data.propertyId,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
        },
        { hostId }
      );

      revalidatePath('/host/calendar');
      return { success: true, data: created };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to block dates. Please try again.',
      };
    }
  }

  // Server action to unblock dates
  async function unblockDatesAction(blockedDateId: number) {
    'use server';
    try {
      const { hostId } = await requireHost();
      const removed = await deleteBlockedDate(blockedDateId, { hostId });
      if (!removed) {
        return { success: false, error: 'Blocked date record not found.' };
      }

      revalidatePath('/host/calendar');
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to unblock dates. Please try again.',
      };
    }
  }

  return (
    <CalendarMonthGrid
      properties={properties}
      reservations={reservations}
      blockedDates={blockedDates}
      initialPropertyId={properties[0]?.id}
      onBlockAction={blockDatesAction}
      onUnblockAction={unblockDatesAction}
    />
  );
}
