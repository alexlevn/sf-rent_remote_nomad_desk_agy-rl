import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { getHostByUserId } from '@/lib/api/hosts';
import { listLocations } from '@/lib/api/locations';
import { getPropertyById, saveHostListing } from '@/lib/api/properties';
import type { Property } from '@/lib/types';
import { ListingFormSections } from '@/features/host/listing-form-sections';

interface EditListingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: EditListingPageProps): Promise<Metadata> {
  const { id } = await params;
  const propertyId = Number(id);
  if (isNaN(propertyId)) {
    return { title: 'Listing Not Found | NomadDesk' };
  }
  const property = await getPropertyById(propertyId);
  if (!property) {
    return { title: 'Listing Not Found | NomadDesk' };
  }
  return {
    title: `Edit Listing #${property.id} | NomadDesk Host Portal`,
    description: `Update details and workstation hardware for ${property.title}.`,
    robots: { index: false, follow: false },
  };
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params;
  const propertyId = Number(id);

  if (isNaN(propertyId)) {
    notFound();
  }

  const property = await getPropertyById(propertyId);
  if (!property) {
    notFound();
  }

  // Current authenticated user & host
  const user = await getCurrentUser();
  const host = user ? await getHostByUserId(user.id) : null;

  // AC-HOST-7: Isolation check - editing another host's property returns 404
  if (!host || property.hostId !== host.id) {
    notFound();
  }

  const locations = await listLocations();

  // Server Action to update listing
  async function updateListingAction(
    data: Partial<Property>,
    intent: 'draft' | 'pending_review'
  ) {
    'use server';
    try {
      if (!host) {
        return { success: false, error: 'Host not authenticated.' };
      }

      const updated = await saveHostListing(host.id, {
        ...data,
        id: propertyId,
        status: intent,
      });

      revalidatePath('/host/listings');
      revalidatePath(`/host/listings/${propertyId}/edit`);
      if (property?.slug) {
        revalidatePath(`/l/apartments/${property.slug}`);
      }
      return { success: true, property: updated };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to update listing.',
      };
    }
  }

  return (
    <div className="space-y-6">
      <ListingFormSections
        initialData={property}
        locations={locations}
        hostId={host.id}
        onSaveAction={updateListingAction}
      />
    </div>
  );
}
