'use server';

import { revalidatePath } from 'next/cache';
import {
  listProperties,
  updatePropertyStatus,
  deleteProperty,
} from '@/lib/api/properties';
import { listHosts, reviewHostApplication } from '@/lib/api/hosts';
import { listUsers } from '@/lib/api/users';
import {
  listReservations,
  updateReservationStatus,
} from '@/lib/api/reservations';
import type { PropertyStatus, HostStatus } from '@/lib/types';

/**
 * Fetches properties and hosts for the Admin Property Moderation table from server store.
 */
export async function fetchAdminPropertiesAction() {
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
  const updated = await updatePropertyStatus(id, 'published');
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
  const updated = await updatePropertyStatus(id, status, reason);
  revalidatePath('/');
  revalidatePath('/admin/properties');
  revalidatePath('/c/[city]', 'page');
  return updated;
}

/**
 * Deletes a property listing.
 */
export async function deletePropertyAction(id: number) {
  const res = await deleteProperty(id);
  revalidatePath('/');
  revalidatePath('/admin/properties');
  return res;
}

/**
 * Fetches host profiles and users for the Admin Host Applications table from server store.
 */
export async function fetchAdminHostsAction() {
  const [hostList, userList] = await Promise.all([listHosts(), listUsers()]);
  return { hostList, userList };
}

/**
 * Reviews a host application: approve (AC-ADMIN-1), suspend (AC-ADMIN-3), or reject.
 */
export async function reviewHostAction(
  id: number,
  status: HostStatus,
  reason?: string
) {
  const updated = await reviewHostApplication(id, status, reason);
  revalidatePath('/');
  revalidatePath('/admin/hosts');
  revalidatePath('/host');
  revalidatePath('/c/[city]', 'page');
  return updated;
}

/**
 * Fetches all reservations, properties, and hosts for the Admin Booking Monitor table from server store.
 */
export async function fetchAdminReservationsAction() {
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
  const updated = await updateReservationStatus(
    id,
    'cancelled',
    reason,
    'admin'
  );
  revalidatePath('/');
  revalidatePath('/admin/reservations');
  revalidatePath('/guests/reservations');
  return updated;
}
