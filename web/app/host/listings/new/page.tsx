import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireHost } from '@/lib/auth/guards';
import { getHostPortalContext } from '@/lib/auth/host-page';
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
  const { isReadOnly } = await getHostPortalContext('/host/listings/new');
  if (isReadOnly) {
    redirect('/host/listings');
  }

  const locations = await listLocations();

  async function createListingAction(
    data: Partial<Property>,
    intent: 'draft' | 'pending_review' | 'keep'
  ) {
    'use server';
    try {
      const { hostId } = await requireHost();
      const targetStatus = intent === 'pending_review' ? 'pending_review' : 'draft';

      const created = await saveHostListing(hostId, {
        ...data,
        status: targetStatus,
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
        onSaveAction={createListingAction}
      />
    </div>
  );
}
