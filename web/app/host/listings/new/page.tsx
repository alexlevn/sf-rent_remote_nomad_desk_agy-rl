import React from 'react';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { getHostProfile } from '@/lib/api/hosts';
import { listLocations } from '@/lib/api/locations';
import { saveHostListing } from '@/lib/api/properties';
import type { Property } from '@/lib/types';
import { ListingFormSections } from '@/features/host/listing-form-sections';

export const metadata: Metadata = {
  title: 'New Listing | NomadDesk Host Portal',
  description:
    'List a new furnished apartment with dedicated high-speed workstation setup on NomadDesk.',
  robots: { index: false, follow: false },
};

export default async function NewListingPage() {
  const user = await getCurrentUser();
  const host =
    (user ? await getHostProfile(user.id) : null) || (await getHostProfile(1));

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

  const locations = await listLocations();

  // Server Action to create listing as draft or submit for review (AC-HOST-3)
  async function createListingAction(
    data: Partial<Property>,
    intent: 'draft' | 'pending_review'
  ) {
    'use server';
    try {
      if (!host) {
        return { success: false, error: 'Host not authenticated.' };
      }

      const created = await saveHostListing(host.id, {
        ...data,
        status: intent,
      });

      revalidatePath('/host/listings');
      revalidatePath('/host');
      return { success: true, property: created };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to create listing.',
      };
    }
  }

  return (
    <div className="space-y-6">
      <ListingFormSections
        locations={locations}
        hostId={host.id}
        onSaveAction={createListingAction}
      />
    </div>
  );
}
