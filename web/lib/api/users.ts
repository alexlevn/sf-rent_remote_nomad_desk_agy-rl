import { and, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
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

export interface AdminUsersPaginatedParams {
  page?: number;
  pageSize?: number;
  role?: UserRole | 'all';
  status?: 'active' | 'inactive' | 'suspended' | 'all';
  search?: string;
}

export interface AdminUsersCounts {
  all: number;
  guest: number;
  host: number;
  admin: number;
  active: number;
  inactive: number;
}

export interface AdminUsersPaginatedResult {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
  counts: AdminUsersCounts;
}

const VALID_USER_ROLES = new Set<UserRole>(['guest', 'host', 'admin']);

function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function normalizePagination(page?: number, pageSize?: number) {
  const safePage =
    typeof page === 'number' && Number.isFinite(page)
      ? Math.min(Math.max(1, Math.floor(page)), 1_000_000)
      : 1;
  const rawSize =
    typeof pageSize === 'number' && Number.isFinite(pageSize) ? Math.floor(pageSize) : 20;
  const safePageSize = Math.min(Math.max(rawSize, 1), 100);
  return {
    page: safePage,
    pageSize: safePageSize,
    offset: (safePage - 1) * safePageSize,
  };
}

/**
 * Lists users for the Admin Portal using SQL LIMIT/OFFSET pagination,
 * filtered COUNT(*), and global role/status counts.
 * Callers crossing the client boundary must strip passwordHash.
 */
export async function listAdminUsersPaginated(
  params?: AdminUsersPaginatedParams
): Promise<AdminUsersPaginatedResult> {
  const { page, pageSize, offset } = normalizePagination(params?.page, params?.pageSize);

  const [aggRow] = await db
    .select({
      all: sql<number>`count(*)::int`,
      guest: sql<number>`count(*) filter (where ${users.role} = 'guest')::int`,
      host: sql<number>`count(*) filter (where ${users.role} = 'host')::int`,
      admin: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
      active: sql<number>`count(*) filter (where ${users.isActive} = true)::int`,
      inactive: sql<number>`count(*) filter (where ${users.isActive} = false)::int`,
    })
    .from(users);

  const counts: AdminUsersCounts = {
    all: Number(aggRow?.all ?? 0),
    guest: Number(aggRow?.guest ?? 0),
    host: Number(aggRow?.host ?? 0),
    admin: Number(aggRow?.admin ?? 0),
    active: Number(aggRow?.active ?? 0),
    inactive: Number(aggRow?.inactive ?? 0),
  };

  const conditions: SQL[] = [];

  if (params?.role && params.role !== 'all') {
    if (!VALID_USER_ROLES.has(params.role)) {
      return { items: [], total: 0, page, pageSize, counts };
    }
    conditions.push(eq(users.role, params.role));
  }

  if (params?.status && params.status !== 'all') {
    if (params.status === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (params.status === 'inactive' || params.status === 'suspended') {
      conditions.push(eq(users.isActive, false));
    } else {
      return { items: [], total: 0, page, pageSize, counts };
    }
  }

  if (typeof params?.search === 'string' && params.search.trim()) {
    const pattern = `%${escapeIlike(params.search.trim().slice(0, 200))}%`;
    const searchCond = or(
      ilike(users.email, pattern),
      ilike(users.firstName, pattern),
      ilike(users.lastName, pattern),
      ilike(sql`coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')`, pattern)
    );
    if (searchCond) conditions.push(searchCond);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRows, itemRows] = await Promise.all([
    whereClause
      ? db.select({ count: sql<number>`count(*)::int` }).from(users).where(whereClause)
      : db.select({ count: sql<number>`count(*)::int` }).from(users),
    whereClause
      ? db
          .select()
          .from(users)
          .where(whereClause)
          .orderBy(asc(users.id))
          .limit(pageSize)
          .offset(offset)
      : db.select().from(users).orderBy(asc(users.id)).limit(pageSize).offset(offset),
  ]);

  return {
    items: itemRows.map(mapUserRow),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
    counts,
  };
}
