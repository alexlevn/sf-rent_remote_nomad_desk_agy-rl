import React from 'react';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireHost } from '@/lib/auth/guards';
import { getHostPortalContext, redactUnconfirmedReservation } from '@/lib/auth/host-page';
import { getPropertyById, listProperties } from '@/lib/api/properties';
import {
  listReservations,
  listBlockedDates,
  addBlockedDate,
  deleteBlockedDate,
} from '@/lib/api/reservations';
import { slugifySegment } from '@/lib/format';
import type { BlockedDate } from '@/lib/types';
import { CalendarMonthGrid } from '@/features/host/calendar-month-grid';

export const metadata: Metadata = {
  title: 'Availability Calendar & Blocked Dates | NomadDesk Host Portal',
  description:
    'Manage your property availability, view active booking schedules, and block dates for personal use or scheduled maintenance.',
  robots: { index: false, follow: false },
};

export default async function HostCalendarPage() {
  const { host, isReadOnly } = await getHostPortalContext('/host/calendar');

  const [properties, rawReservations] = await Promise.all([
    listProperties({ hostId: host.id, status: 'all' }),
    listReservations({ hostId: host.id }),
  ]);

  const reservations = rawReservations.map(redactUnconfirmedReservation);

  const blockedDatesNested = await Promise.all(
    properties.map((p) => listBlockedDates(p.id))
  );
  const blockedDates: BlockedDate[] = blockedDatesNested.flat();

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
      const prop = await getPropertyById(data.propertyId);
      if (prop?.slug) {
        revalidatePath(`/l/apartments/${prop.slug}`);
      }
      if (prop?.city) {
        revalidatePath(`/c/furnished-apartments-${slugifySegment(prop.city)}`);
      }
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

  async function unblockDatesAction(blockedDateId: number, propertyId?: number) {
    'use server';
    try {
      const { hostId } = await requireHost();
      const removed = await deleteBlockedDate(blockedDateId, { hostId });
      if (!removed) {
        return { success: false, error: 'Blocked date record not found.' };
      }

      revalidatePath('/host/calendar');
      if (propertyId) {
        const prop = await getPropertyById(propertyId);
        if (prop?.slug) {
          revalidatePath(`/l/apartments/${prop.slug}`);
        }
        if (prop?.city) {
          revalidatePath(`/c/furnished-apartments-${slugifySegment(prop.city)}`);
        }
      }
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
      isReadOnly={isReadOnly}
      onBlockAction={blockDatesAction}
      onUnblockAction={unblockDatesAction}
    />
  );
}
