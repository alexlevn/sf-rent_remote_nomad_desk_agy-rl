import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import type { User, UserRole } from '@/lib/types';

function mapUserRow(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    role: row.role as UserRole,
    isActive: row.isActive,
    createdAt: row.createdAt ? row.createdAt.toISOString() : undefined,
  };
}

/**
 * Lists all registered users in the platform.
 */
export async function listUsers(): Promise<User[]> {
  const rows = await db.select().from(users).orderBy(users.id);
  return rows.map(mapUserRow);
}

/**
 * Retrieves a user by ID.
 */
export async function getUserById(id: number): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows.length > 0 ? mapUserRow(rows[0]) : null;
}

/**
 * Retrieves a user by email address.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, normalized))
    .limit(1);
  return rows.length > 0 ? mapUserRow(rows[0]) : null;
}

/**
 * Updates a user account (e.g. status, profile, role).
 */
export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const updateValues: Record<string, unknown> = {};
  if (data.email !== undefined) updateValues.email = data.email.trim().toLowerCase();
  if (data.passwordHash !== undefined) updateValues.passwordHash = data.passwordHash;
  if (data.firstName !== undefined) updateValues.firstName = data.firstName;
  if (data.lastName !== undefined) updateValues.lastName = data.lastName;
  if (data.role !== undefined) updateValues.role = data.role;
  if (data.isActive !== undefined) updateValues.isActive = data.isActive;

  const rows = await db
    .update(users)
    .set(updateValues)
    .where(eq(users.id, id))
    .returning();

  if (!rows.length) {
    throw new Error(`User ${id} not found`);
  }
  return mapUserRow(rows[0]);
}

/**
 * Creates a new user account (e.g. during register).
 */
export async function createUser(data: Omit<User, 'id'>): Promise<User> {
  const normalized = data.email.trim().toLowerCase();
  const existing = await getUserByEmail(normalized);
  if (existing) {
    throw new Error(`Email ${data.email} is already registered`);
  }

  const rows = await db
    .insert(users)
    .values({
      email: normalized,
      passwordHash: data.passwordHash,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      role: data.role || 'guest',
      isActive: data.isActive ?? true,
    })
    .returning();

  return mapUserRow(rows[0]);
}
