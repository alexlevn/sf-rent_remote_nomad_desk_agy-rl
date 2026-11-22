import React from 'react';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireHost } from '@/lib/auth/guards';
import { getHostPortalContext } from '@/lib/auth/host-page';
import { getPropertyById, listProperties, updatePropertyStatus } from '@/lib/api/properties';
import { slugifySegment } from '@/lib/format';
import type { PropertyStatus } from '@/lib/types';
import { HostListingsTable } from '@/features/host/host-listings-table';

export const metadata: Metadata = {
  title: 'My Property Listings | NomadDesk Host Portal',
  description:
    'Manage your furnished apartments, publish status, dedicated workstation hardware, and monthly rates.',
  robots: { index: false, follow: false },
};

export default async function HostListingsPage() {
  const { host, isReadOnly } = await getHostPortalContext('/host/listings');
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
      if (target.status !== 'draft' && target.status !== 'rejected') {
        return {
          success: false,
          error: 'Only draft or rejected listings can be submitted for review.',
        };
      }
      const updated = await updatePropertyStatus(propertyId, 'pending_review');
      if (!updated) {
        return { success: false, error: 'Property not found.' };
      }
      revalidatePath('/host/listings');
      revalidatePath('/admin/properties');
      revalidatePath('/admin');
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
      revalidatePath('/host');
      revalidatePath('/');
      if (target.slug) {
        revalidatePath(`/l/apartments/${target.slug}`);
      }
      if (target.city) {
        revalidatePath(`/c/furnished-apartments-${slugifySegment(target.city)}`);
      }
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
      hostName={host.displayName}
      isReadOnly={isReadOnly}
      onSubmitForReview={submitForReviewAction}
      onToggleHide={toggleHidePropertyAction}
    />
  );
}
