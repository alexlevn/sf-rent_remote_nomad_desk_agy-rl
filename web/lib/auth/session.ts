import type { User, UserRole } from '@/lib/types';
import { getUserById, getUserByEmail } from '@/lib/api/users';
import { auth } from '@/lib/auth/config';

const INT4_MAX = 2_147_483_647;

const globalForAuth = globalThis as unknown as {
  __nomaddeskCurrentUserId?: number | null;
};

/**
 * Returns the authenticated user strictly from the Auth.js HttpOnly JWT cookie
 * refreshed from Postgres. Never reads globalForAuth or falls back to demo user.
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

  return getUserById(userId);
}

/**
 * Returns current authenticated user.
 * 1. Checks NextAuth session via auth()
 * 2. Checks explicit global test/mock session
 * 3. Falls back to demo user (id 1) if present in DB
 */
export async function getCurrentUser(): Promise<User> {
  // 1. Try to get user from Auth.js session
  try {
    const session = await auth();
    if (session?.user?.id) {
      const user = await getUserById(Number(session.user.id));
      if (user) return user;
    }
  } catch {
    // Outside request context / headers not available
  }

  // 2. Global session for dev / mock testing
  if (globalForAuth.__nomaddeskCurrentUserId !== undefined && globalForAuth.__nomaddeskCurrentUserId !== null) {
    const user = await getUserById(globalForAuth.__nomaddeskCurrentUserId);
    if (user) return user;
  }

  // 3. Fallback to demo user
  const fallback = await getUserByEmail('demo@example.com');
  if (fallback) return fallback;

  return {
    id: 1,
    email: 'demo@example.com',
    passwordHash: '',
    firstName: 'Demo',
    lastName: 'User',
    role: 'guest',
    isActive: true,
  };
}

/**
 * Sets current session user by ID.
 */
export async function setCurrentUserId(userId: number): Promise<User> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error(`User with id ${userId} not found`);
  }
  globalForAuth.__nomaddeskCurrentUserId = userId;
  return user;
}

/**
 * Switches current active role for dev & test exploration (guest | host | admin).
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
  globalForAuth.__nomaddeskCurrentUserId = user.id;
  return user;
}

/**
 * Retrieves the current session object.
 */
export async function getSession(): Promise<{ user: User; role: UserRole }> {
  const user = await getCurrentUser();
  return {
    user,
    role: user.role,
  };
}

/**
 * Clears the in-memory mock session user ID.
 */
export function clearCurrentUserId(): void {
  globalForAuth.__nomaddeskCurrentUserId = null;
}

/**
 * Resets active mock session back to initial demo guest user.
 */
export function resetSession(): void {
  globalForAuth.__nomaddeskCurrentUserId = 1;
}
