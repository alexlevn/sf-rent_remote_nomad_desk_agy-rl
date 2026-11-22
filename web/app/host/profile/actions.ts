'use server';

import { revalidatePath } from 'next/cache';
import { getHostProfile, updateHostProfile } from '@/lib/api/hosts';
import { requireHost, requireHostReadOnly } from '@/lib/auth/guards';
import type { HostProfile } from '@/lib/types';

export async function fetchCurrentHostProfileAction(): Promise<HostProfile | null> {
  const { hostId } = await requireHostReadOnly();
  return getHostProfile(hostId);
}

export async function updateCurrentHostProfileAction(data: {
  displayName: string;
  phone: string;
  bio: string;
  cities: string;
  portfolioSize: number;
  website: string | null;
  avatar?: string | null;
}): Promise<HostProfile> {
  const { hostId } = await requireHost();
  const updated = await updateHostProfile(hostId, {
    displayName: data.displayName,
    phone: data.phone,
    bio: data.bio,
    cities: data.cities,
    portfolioSize: data.portfolioSize,
    website: data.website,
    ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
  });
  revalidatePath('/host/profile');
  revalidatePath('/host');
  revalidatePath('/l/apartments/[slug]', 'page');
  return updated;
}
