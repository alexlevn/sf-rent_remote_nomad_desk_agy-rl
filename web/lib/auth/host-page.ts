import { redirect } from 'next/navigation';
import { getStrictSessionUser } from '@/lib/auth/session';
import { getHostByUserId } from '@/lib/api/hosts';
import type { HostProfile, Reservation, User } from '@/lib/types';

export interface HostPortalContext {
  user: User;
  host: HostProfile;
  isReadOnly: boolean;
}

/**
 * Enforces real Auth.js session + host profile state for Host Portal pages.
 * Allows approved hosts (full access) and suspended hosts (read-only access).
 */
export async function getHostPortalContext(
  callbackPath: string
): Promise<HostPortalContext> {
  const user = await getStrictSessionUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const host = await getHostByUserId(user.id);
  if (!host || host.status === 'pending' || host.status === 'rejected') {
    redirect('/host/apply');
  }

  return {
    user,
    host,
    isReadOnly: host.status === 'suspended',
  };
}

/**
 * Strips guest direct contact details until a reservation is confirmed.
 */
export function redactUnconfirmedReservation(reservation: Reservation): Reservation {
  if (reservation.status === 'confirmed' || reservation.status === 'completed') {
    return reservation;
  }
  return {
    ...reservation,
    guestEmail: '',
    guestPhone: undefined,
  };
}
