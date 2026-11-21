'use server';

import { updateReservationStatus } from '@/lib/api/reservations';
import { revalidatePath } from 'next/cache';

export async function cancelBookingAction(id: number, reason: string) {
  try {
    const updated = await updateReservationStatus(id, 'cancelled', reason, 'guest');
    revalidatePath('/guests/reservations');
    revalidatePath('/guests/dashboard');
    return { success: true, reservation: updated };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to cancel reservation.',
    };
  }
}
