import type { User, UserRole } from '@/lib/types';
import { getUserById, getUserByEmail } from '@/lib/api/users';

const globalForAuth = globalThis as unknown as {
  __nomaddeskCurrentUserId?: number;
};

/**
 * Returns current authenticated mock user. Defaults to guest demo account.
 */
export async function getCurrentUser(): Promise<User> {
  const userId = globalForAuth.__nomaddeskCurrentUserId ?? 1;
  const user = await getUserById(userId);
  if (user) return user;

  // Fallback to demo user
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
 * Resets active mock session back to initial demo guest user.
 */
export function resetSession(): void {
  globalForAuth.__nomaddeskCurrentUserId = 1;
}
