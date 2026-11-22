import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getStrictSessionUser } from '@/lib/auth/session';
import { requireHost } from '@/lib/auth/guards';
import { getHostPortalContext } from '@/lib/auth/host-page';
import { getHostByUserId } from '@/lib/api/hosts';
import { listLocations } from '@/lib/api/locations';
import { getPropertyById, saveHostListing } from '@/lib/api/properties';
import { slugifySegment } from '@/lib/format';
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
  if (!Number.isInteger(propertyId) || propertyId <= 0) {
    return { title: 'Listing Not Found | NomadDesk', robots: { index: false, follow: false } };
  }
  const user = await getStrictSessionUser();
  const host = user ? await getHostByUserId(user.id) : null;
  if (!host) {
    return { title: 'Edit Listing | NomadDesk Host Portal', robots: { index: false, follow: false } };
  }
  const property = await getPropertyById(propertyId);
  if (!property || property.hostId !== host.id) {
    return { title: 'Listing Not Found | NomadDesk', robots: { index: false, follow: false } };
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

  if (!Number.isInteger(propertyId) || propertyId <= 0) {
    notFound();
  }

  const { host, isReadOnly } = await getHostPortalContext(`/host/listings/${propertyId}/edit`);

  const property = await getPropertyById(propertyId);
  // AC-HOST-7: Isolation check - editing another host's property returns 404
  if (!property || property.hostId !== host.id) {
    notFound();
  }

  const locations = await listLocations();

  async function updateListingAction(
    data: Partial<Property>,
    intent: 'draft' | 'pending_review' | 'keep'
  ) {
    'use server';
    try {
      const { hostId } = await requireHost();
      const existing = await getPropertyById(propertyId);
      if (!existing || existing.hostId !== hostId) {
        return { success: false, error: 'Unauthorized: property does not belong to this host.' };
      }

      const payload: Partial<Property> = {
        ...data,
        id: propertyId,
      };
      // Preserve live/hidden status on 'keep', otherwise transition to requested status
      if (intent === 'keep') {
        delete payload.status;
      } else {
        payload.status = intent;
      }

      const updated = await saveHostListing(hostId, payload);

      revalidatePath('/host/listings');
      revalidatePath(`/host/listings/${propertyId}/edit`);
      if (existing.slug) {
        revalidatePath(`/l/apartments/${existing.slug}`);
      }
      if (updated.city) {
        revalidatePath(`/c/furnished-apartments-${slugifySegment(updated.city)}`);
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
        isReadOnly={isReadOnly}
        onSaveAction={updateListingAction}
      />
    </div>
  );
}
