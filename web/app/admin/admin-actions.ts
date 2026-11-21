'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import {
  createAdminProperty,
  listProperties,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
} from '@/lib/api/properties';
import { getHostProfile, listHosts, reviewHostApplication } from '@/lib/api/hosts';
import { getUserById, listUsers, updateUser } from '@/lib/api/users';
import {
  listReservations,
  updateReservationStatus,
} from '@/lib/api/reservations';
import { notifyListingModeration } from '@/lib/email/notifications';
import type { PropertyStatus, HostStatus, Property, User } from '@/lib/types';

const INT4_MAX = 2_147_483_647;
const adminUserIdSchema = z.number().int().positive().max(INT4_MAX);
const adminUpdateUserSchema = z.object({
  role: z.enum(['guest', 'host', 'admin']).optional(),
  isActive: z.boolean().optional(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

// Strip bcrypt hashes before serializing users across the Server Action boundary.
function stripUserSecret(user: User): User {
  return { ...user, passwordHash: '' };
}

async function dispatchListingModerationEmail(
  property: Property,
  status: PropertyStatus,
  reason?: string
) {
  if (status !== 'published' && status !== 'rejected') {
    return;
  }
  const host = await getHostProfile(property.hostId);
  if (!host) return;
  const hostUser = await getUserById(host.userId);
  if (!hostUser?.email) return;

  const action = status === 'published' ? 'approved' : 'rejected';
  await notifyListingModeration(
    {
      title: property.title,
      city: property.city,
      reference: property.reference,
    },
    action,
    hostUser.email,
    reason
  );
}

/**
 * Fetches properties and hosts for the Admin Property Moderation table from PostgreSQL.
 */
export async function fetchAdminPropertiesAction() {
  await requireAdmin();
  const [propList, hostList] = await Promise.all([
    listProperties({ status: 'all' }),
    listHosts(),
  ]);
  return { propList, hostList };
}

/**
 * Approves and publishes a property (AC-ADMIN-2).
 */
export async function approvePropertyAction(id: number) {
  await requireAdmin();
  const updated = await updatePropertyStatus(id, 'published', null);
  if (updated) {
    await dispatchListingModerationEmail(updated, 'published');
    revalidatePath(`/l/apartments/${updated.slug}`);
  }
  revalidatePath('/');
  revalidatePath('/admin/properties');
  revalidatePath('/c/[city]', 'page');
  return updated;
}

/**
 * Updates a property status (publish, hide, reject) from the admin portal.
 */
export async function updatePropertyStatusAction(
  id: number,
  status: PropertyStatus,
  reason?: string
) {
  await requireAdmin();
  const updated = await updatePropertyStatus(id, status, reason);
  if (updated) {
    await dispatchListingModerationEmail(updated, status, reason);
    revalidatePath(`/l/apartments/${updated.slug}`);
  }
  revalidatePath('/');
  revalidatePath('/admin/properties');
  revalidatePath('/c/[city]', 'page');
  return updated;
}

/**
 * Creates a new property directly from the Admin Portal (defaults to 'published').
 */
export async function createAdminPropertyAction(
  data: Partial<Property> & { hostId: number }
) {
  await requireAdmin();
  const created = await createAdminProperty(data);
  revalidatePath('/');
  revalidatePath('/admin/properties');
  revalidatePath('/c/[city]', 'page');
  revalidatePath(`/l/apartments/${created.slug}`);
  return created;
}

/**
 * Updates an existing property from the Admin Portal (supports reassigning hostId).
 */
export async function updateAdminPropertyAction(
  id: number,
  data: Partial<Property>
) {
  await requireAdmin();
  const updated = await updateProperty(id, data);
  if (updated) {
    revalidatePath(`/l/apartments/${updated.slug}`);
  }
  revalidatePath('/l/apartments/[slug]', 'page');
  revalidatePath('/');
  revalidatePath('/admin/properties');
  revalidatePath('/c/[city]', 'page');
  return updated;
}

/**
 * Deletes a property listing.
 */
export async function deletePropertyAction(id: number) {
  await requireAdmin();
  const res = await deleteProperty(id);
  revalidatePath('/');
  revalidatePath('/admin/properties');
  revalidatePath('/c/[city]', 'page');
  return res;
}

/**
 * Fetches host profiles and users for the Admin Host Applications table from PostgreSQL.
 */
export async function fetchAdminHostsAction() {
  await requireAdmin();
  const [hostList, userList] = await Promise.all([listHosts(), listUsers()]);
  return { hostList, userList: userList.map(stripUserSecret) };
}

/**
 * Reviews a host application: approve (AC-ADMIN-1), suspend (AC-ADMIN-3), or reject.
 */
export async function reviewHostAction(
  id: number,
  status: HostStatus,
  reason?: string
) {
  await requireAdmin();
  const updated = await reviewHostApplication(id, status, reason);
  revalidatePath('/');
  revalidatePath('/admin/hosts');
  revalidatePath('/host');
  revalidatePath('/c/[city]', 'page');
  return updated;
}

/**
 * Fetches all reservations, properties, and hosts for the Admin Booking Monitor table from PostgreSQL.
 */
export async function fetchAdminReservationsAction() {
  await requireAdmin();
  const [resList, propList, hostList] = await Promise.all([
    listReservations({ status: 'all' }),
    listProperties({ status: 'all' }),
    listHosts(),
  ]);
  return { resList, propList, hostList };
}

/**
 * Cancels a confirmed booking via Admin Intervention with refund (AC-ADMIN-4).
 */
export async function cancelReservationAdminAction(
  id: number,
  reason: string
) {
  await requireAdmin();
  const updated = await updateReservationStatus(
    id,
    'cancelled',
    reason,
    'admin'
  );
  revalidatePath('/');
  revalidatePath('/admin/reservations');
  revalidatePath('/guests/reservations');
  revalidatePath('/host/requests');
  return updated;
}

/**
 * Fetches all users for the Admin Directory table.
 */
export async function fetchAdminUsersAction() {
  await requireAdmin();
  const allUsers = await listUsers();
  return allUsers.map(stripUserSecret);
}

/**
 * Updates a user account (e.g. role, active status) from the admin portal.
 * Enforces last-admin and self-suspension protections server-side.
 */
export async function updateUserAction(
  id: number,
  data: Parameters<typeof updateUser>[1]
) {
  const currentAdmin = await requireAdmin();
  const validId = adminUserIdSchema.parse(id);
  const parsed = adminUpdateUserSchema.parse(data);

  if (currentAdmin.id === validId && parsed.isActive === false) {
    throw new Error('You cannot suspend your own active administrator account.');
  }

  const targetUser = await getUserById(validId);
  if (!targetUser) {
    throw new Error(`User ${validId} not found`);
  }

  if (Object.keys(parsed).length === 0) {
    return stripUserSecret(targetUser);
  }

  const isTargetActiveAdmin =
    targetUser.role === 'admin' && targetUser.isActive !== false;
  const wouldRemoveAdmin =
    (parsed.role !== undefined && parsed.role !== 'admin') ||
    parsed.isActive === false;

  if (isTargetActiveAdmin && wouldRemoveAdmin) {
    const allUsers = await listUsers();
    const activeAdminCount = allUsers.filter(
      (u) => u.role === 'admin' && u.isActive !== false
    ).length;
    if (activeAdminCount <= 1) {
      throw new Error(
        'Cannot demote or suspend the last remaining active administrator account.'
      );
    }
  }

  const updated = await updateUser(validId, parsed);
  revalidatePath('/admin');
  revalidatePath('/admin/users');
  return stripUserSecret(updated);
}
