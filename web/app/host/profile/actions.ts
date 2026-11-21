'use server';

import { revalidatePath } from 'next/cache';
import { getHostProfile, updateHostProfile } from '@/lib/api/hosts';
import { requireHost } from '@/lib/auth/guards';
import type { HostProfile } from '@/lib/types';

export async function fetchCurrentHostProfileAction(): Promise<HostProfile | null> {
  const { hostId } = await requireHost();
  return getHostProfile(hostId);
}

export async function updateCurrentHostProfileAction(data: {
  displayName: string;
  phone: string;
  bio: string;
  cities: string;
  portfolioSize: number;
  website: string | null;
}): Promise<HostProfile> {
  const { hostId } = await requireHost();
  const updated = await updateHostProfile(hostId, {
    displayName: data.displayName,
    phone: data.phone,
    bio: data.bio,
    cities: data.cities,
    portfolioSize: data.portfolioSize,
    website: data.website,
  });
  revalidatePath('/host/profile');
  revalidatePath('/host');
  return updated;
}
