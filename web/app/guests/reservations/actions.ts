'use server';

import { revalidatePath } from 'next/cache';
import { getReservationById, updateReservationStatus } from '@/lib/api/reservations';
import { requireStrictUser } from '@/lib/auth/guards';

export async function cancelBookingAction(id: number, reason: string) {
  try {
    const user = await requireStrictUser();
    const existing = await getReservationById(id);
    if (!existing) {
      return { success: false, error: 'Reservation not found.' };
    }
    if (existing.userId !== user.id) {
      return { success: false, error: 'You are not authorized to cancel this reservation.' };
    }

    const updated = await updateReservationStatus(id, 'cancelled', reason, 'guest');
    revalidatePath('/guests/reservations');
    revalidatePath('/guests/dashboard');
    revalidatePath('/host');
    revalidatePath('/host/reservations');
    revalidatePath('/host/calendar');
    return { success: true, reservation: updated };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to cancel reservation.',
    };
  }
}
