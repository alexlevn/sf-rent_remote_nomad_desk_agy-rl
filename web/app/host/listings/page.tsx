import React from 'react';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { requireHost } from '@/lib/auth/guards';
import { getHostProfile, getHostByUserId } from '@/lib/api/hosts';
import { getPropertyById, listProperties, updatePropertyStatus } from '@/lib/api/properties';
import type { PropertyStatus } from '@/lib/types';
import { HostListingsTable } from '@/features/host/host-listings-table';

export const metadata: Metadata = {
  title: 'My Property Listings | NomadDesk Host Portal',
  description:
    'Manage your furnished apartments, publish status, dedicated workstation hardware, and monthly rates.',
  robots: { index: false, follow: false },
};

export default async function HostListingsPage() {
  const user = await getCurrentUser();
  const host =
    (user ? await getHostByUserId(user.id) : null) || (await getHostProfile(1));

  if (!host) {
    return (
      <div className="bg-white border border-[var(--color-border-light)] rounded-xl p-8 text-center">
        <h2 className="text-lg font-bold text-neutral-900 mb-2">
          No Host Profile Found
        </h2>
        <p className="text-sm text-neutral-500">
          Please apply to become a host partner first.
        </p>
      </div>
    );
  }

  const properties = await listProperties({ hostId: host.id, status: 'all' });

  // Server Action to submit property for admin review (AC-HOST-3)
  async function submitForReviewAction(propertyId: number) {
    'use server';
    try {
      const { hostId } = await requireHost();
      const target = await getPropertyById(propertyId);
      if (!target || target.hostId !== hostId) {
        return { success: false, error: 'Unauthorized: property does not belong to this host.' };
      }
      const updated = await updatePropertyStatus(propertyId, 'pending_review');
      if (!updated) {
        return { success: false, error: 'Property not found.' };
      }
      revalidatePath('/host/listings');
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to submit property for review.',
      };
    }
  }

  // Server Action to toggle property visibility (published <-> hidden)
  async function toggleHidePropertyAction(
    propertyId: number,
    _currentStatus: PropertyStatus
  ) {
    'use server';
    void _currentStatus;
    try {
      const { hostId } = await requireHost();
      const target = await getPropertyById(propertyId);
      if (!target || target.hostId !== hostId) {
        return { success: false, error: 'Unauthorized: property does not belong to this host.' };
      }
      if (target.status !== 'published' && target.status !== 'hidden') {
        return { success: false, error: 'Only published or hidden listings can toggle visibility.' };
      }
      const nextStatus: PropertyStatus =
        target.status === 'hidden' ? 'published' : 'hidden';
      const updated = await updatePropertyStatus(propertyId, nextStatus);
      if (!updated) {
        return { success: false, error: 'Property not found.' };
      }
      revalidatePath('/host/listings');
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to update property visibility.',
      };
    }
  }

  return (
    <HostListingsTable
      initialProperties={properties}
      hostId={host.id}
      hostName={host.displayName}
      onSubmitForReview={submitForReviewAction}
      onToggleHide={toggleHidePropertyAction}
    />
  );
}
