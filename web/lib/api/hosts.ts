import type { HostApplicationInput, HostProfile, HostStatus } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists all registered host profiles.
 */
export async function listHosts(): Promise<HostProfile[]> {
  const store = getMockStore();
  return store.hosts.map((h) => ({ ...h }));
}

/**
 * Retrieves a host profile by its ID or associated userId.
 */
export async function getHostProfile(
  userIdOrId: number
): Promise<HostProfile | null> {
  const store = getMockStore();
  const host = store.hosts.find(
    (h) => h.id === userIdOrId || h.userId === userIdOrId
  );
  return host ? { ...host } : null;
}

/**
 * Retrieves a host profile by URL slug.
 */
export async function getHostBySlug(slug: string): Promise<HostProfile | null> {
  const store = getMockStore();
  const host = store.hosts.find((h) => h.slug === slug);
  return host ? { ...host } : null;
}

/**
 * Submits a new host application (/host/apply, D10).
 */
export async function applyHost(
  data: HostApplicationInput
): Promise<HostProfile> {
  const store = getMockStore();

  const maxId = store.hosts.reduce((max, h) => Math.max(max, h.id), 0);
  const newId = maxId + 1;
  const slug = data.displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const newProfile: HostProfile = {
    id: newId,
    userId: data.userId || 5, // Default applicant if unassigned
    displayName: data.displayName,
    slug: slug || `host-${newId}`,
    phone: data.phone,
    website: data.website || null,
    cities: data.cities,
    portfolioSize: data.portfolioSize,
    bio: data.bio,
    avatar: null,
    status: 'pending',
    rejectionReason: null,
    approvedAt: null,
    createdAt: new Date().toISOString(),
  };

  store.hosts.push(newProfile);
  return { ...newProfile };
}

/**
 * Lists host applications (admin review queue).
 */
export async function listHostApplications(): Promise<HostProfile[]> {
  const store = getMockStore();
  return store.hosts
    .filter((h) => h.status === 'pending')
    .map((h) => ({ ...h }));
}

/**
 * Reviews a host application: approve, reject, or suspend (admin portal).
 */
export async function reviewHostApplication(
  id: number,
  status: HostStatus,
  reason?: string
): Promise<HostProfile> {
  const store = getMockStore();
  const index = store.hosts.findIndex((h) => h.id === id);
  if (index === -1) {
    throw new Error(`Host profile ${id} not found`);
  }

  const existing = store.hosts[index];
  const updated: HostProfile = {
    ...existing,
    status,
    rejectionReason: reason || null,
    approvedAt: status === 'approved' ? new Date().toISOString() : existing.approvedAt,
  };

  // If approved, elevate associated user role to 'host'
  if (status === 'approved') {
    const user = store.users.find((u) => u.id === existing.userId);
    if (user) {
      user.role = 'host';
    }
  }

  store.hosts[index] = updated;
  return { ...updated };
}

/**
 * Updates an existing host profile.
 */
export async function updateHostProfile(
  id: number,
  data: Partial<HostProfile>
): Promise<HostProfile> {
  const store = getMockStore();
  const index = store.hosts.findIndex((h) => h.id === id);
  if (index === -1) {
    throw new Error(`Host profile ${id} not found`);
  }

  const updated: HostProfile = {
    ...store.hosts[index],
    ...data,
    id: store.hosts[index].id,
  };
  store.hosts[index] = updated;
  return { ...updated };
}
