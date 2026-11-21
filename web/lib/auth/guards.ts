import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hostProfiles } from '@/lib/db/schema';
import { getUserById } from '@/lib/api/users';
import { getCurrentUser } from '@/lib/auth/session';
import type { User } from '@/lib/types';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Ensures user is authenticated and active.
 * Throws AuthError 401 if unauthenticated or inactive.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError('Unauthorized: Authentication required', 401);
  }

  // Refresh active status directly from DB (Risk #10)
  const freshUser = await getUserById(user.id);
  if (!freshUser || !freshUser.isActive) {
    throw new AuthError('Unauthorized: Account is suspended or inactive', 401);
  }

  return freshUser;
}

/**
 * Ensures user is an approved host.
 * Throws AuthError 403 if user is not a host or host profile is not approved / is suspended.
 * Returns both the user and their unique hostId.
 */
export async function requireHost(): Promise<{ user: User; hostId: number }> {
  const user = await requireUser();

  // Fresh role check from DB
  if (user.role !== 'host') {
    throw new AuthError('Forbidden: Host role required', 403);
  }

  // Query host_profiles directly from DB
  const [profile] = await db
    .select()
    .from(hostProfiles)
    .where(eq(hostProfiles.userId, user.id))
    .limit(1);

  if (!profile) {
    throw new AuthError('Forbidden: No host profile found for user', 403);
  }

  if (profile.status === 'suspended') {
    throw new AuthError('Forbidden: Host account has been suspended', 403);
  }

  if (profile.status !== 'approved') {
    throw new AuthError(`Forbidden: Host profile status is ${profile.status}`, 403);
  }

  return {
    user,
    hostId: profile.id,
  };
}

/**
 * Ensures user is an active system administrator.
 * Throws AuthError 403 if user is not an admin.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();

  if (user.role !== 'admin') {
    throw new AuthError('Forbidden: Administrator role required', 403);
  }

  return user;
}
