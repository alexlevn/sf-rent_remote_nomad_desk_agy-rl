'use server';

import { signOut } from '@/lib/auth/config';
import { clearCurrentUserId } from '@/lib/auth/session';

/**
 * Signs out the current Auth.js session (clears HttpOnly JWT cookie) and resets mock session state.
 */
export async function signOutAction(): Promise<{ success: boolean }> {
  clearCurrentUserId();
  try {
    await signOut({ redirect: false });
  } catch {
    // Ignore if already signed out
  }
  return { success: true };
}
