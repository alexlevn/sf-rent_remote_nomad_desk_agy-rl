import type { User, UserRole } from '@/lib/types';
import { getUserById, getUserByEmail } from '@/lib/api/users';
import { auth } from '@/lib/auth/config';
import { INT4_MAX } from '@/lib/format';

const globalForAuth = globalThis as unknown as {
  __nomaddeskCurrentUserId?: number | null;
};

function parseSessionUserId(rawId: unknown): number | null {
  if (rawId === undefined || rawId === null) {
    return null;
  }
  const normalizedId = typeof rawId === 'string' ? rawId.trim() : String(rawId);
  if (!/^\d+$/.test(normalizedId)) {
    return null;
  }
  const userId = Number(normalizedId);
  if (!Number.isInteger(userId) || userId <= 0 || userId > INT4_MAX) {
    return null;
  }
  return userId;
}

/**
 * Returns the authenticated active user strictly from the Auth.js HttpOnly JWT cookie
 * refreshed from Postgres. Returns null if unauthenticated, deleted, or suspended.
 */
export async function getStrictSessionUser(): Promise<User | null> {
  let rawId: unknown;
  try {
    const session = await auth();
    rawId = session?.user?.id;
  } catch {
    // Outside request context / headers not available
    return null;
  }

  const userId = parseSessionUserId(rawId);
  if (userId === null) {
    return null;
  }

  const user = await getUserById(userId);
  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

/**
 * Returns the current authenticated user from the Auth.js JWT cookie refreshed from DB.
 * In-memory globalForAuth override is restricted strictly to Vitest unit tests so
 * runtime requests can never inherit another user's session or fall back to demo user.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await auth();
    const userId = parseSessionUserId(session?.user?.id);
    if (userId !== null) {
      return getUserById(userId);
    }
  } catch {
    // Outside request context / headers not available
  }

  // Test-only in-memory session shim for Vitest suites running outside HTTP request context
  if (
    process.env.VITEST === 'true' &&
    globalForAuth.__nomaddeskCurrentUserId !== undefined &&
    globalForAuth.__nomaddeskCurrentUserId !== null
  ) {
    return getUserById(globalForAuth.__nomaddeskCurrentUserId);
  }

  return null;
}

/**
 * Sets in-memory session user by ID (Vitest unit tests only).
 */
export async function setCurrentUserId(userId: number): Promise<User> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error(`User with id ${userId} not found`);
  }
  if (process.env.VITEST === 'true') {
    globalForAuth.__nomaddeskCurrentUserId = userId;
  }
  return user;
}

/**
 * Switches active in-memory test role (Vitest unit tests only).
 */
export async function switchRole(role: UserRole): Promise<User> {
  let targetEmail = 'demo@example.com';
  if (role === 'admin') targetEmail = 'admin@example.com';
  if (role === 'host') targetEmail = 'host@example.com';
  if (role === 'guest') targetEmail = 'demo@example.com';

  const user = await getUserByEmail(targetEmail);
  if (!user) {
    throw new Error(`User for role ${role} (${targetEmail}) not found`);
  }
  if (process.env.VITEST === 'true') {
    globalForAuth.__nomaddeskCurrentUserId = user.id;
  }
  return user;
}

/**
 * Retrieves the current session object, or null when unauthenticated.
 */
export async function getSession(): Promise<{ user: User; role: UserRole } | null> {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    return null;
  }
  return {
    user,
    role: user.role,
  };
}

/**
 * Clears the in-memory test session user ID.
 */
export function clearCurrentUserId(): void {
  globalForAuth.__nomaddeskCurrentUserId = null;
}

/**
 * Resets in-memory test session back to initial demo guest user (Vitest only).
 */
export function resetSession(): void {
  globalForAuth.__nomaddeskCurrentUserId = process.env.VITEST === 'true' ? 1 : null;
}
