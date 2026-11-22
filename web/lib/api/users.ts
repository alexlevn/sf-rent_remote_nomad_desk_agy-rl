import { and, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import {
  escapeIlike,
  getPgErrorCode,
  normalizePagination,
  sanitizeSearchInput,
} from '@/lib/db/query-helpers';
import { createUserSchema, updateUserSchema, userIdSchema } from '@/lib/validations/user';
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
  const parsedId = userIdSchema.safeParse(id);
  if (!parsedId.success) return null;

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, parsedId.data))
    .limit(1);
  return rows.length > 0 ? mapUserRow(rows[0]) : null;
}

/**
 * Retrieves a user by email address (case-insensitive).
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  if (typeof email !== 'string') return null;
  const normalized = sanitizeSearchInput(email, 255).toLowerCase();
  if (!normalized) return null;

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
  const validId = userIdSchema.parse(id);
  const parsed = updateUserSchema.parse(data);

  const updateValues: Partial<typeof users.$inferInsert> = {};
  if (parsed.email !== undefined) updateValues.email = parsed.email;
  if (parsed.passwordHash !== undefined) updateValues.passwordHash = parsed.passwordHash;
  if (parsed.firstName !== undefined) updateValues.firstName = parsed.firstName;
  if (parsed.lastName !== undefined) updateValues.lastName = parsed.lastName;
  if (parsed.role !== undefined) updateValues.role = parsed.role;
  if (parsed.isActive !== undefined) updateValues.isActive = parsed.isActive;

  if (Object.keys(updateValues).length === 0) {
    const existing = await getUserById(validId);
    if (!existing) {
      throw new Error(`User ${validId} not found`);
    }
    return existing;
  }

  try {
    const rows = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, validId))
      .returning();

    if (!rows.length) {
      throw new Error(`User ${validId} not found`);
    }
    return mapUserRow(rows[0]);
  } catch (err) {
    if (getPgErrorCode(err) === '23505') {
      throw new Error('Email is already registered to another account.');
    }
    throw err;
  }
}

/**
 * Atomically updates a user account while enforcing self-suspension and
 * last-active-administrator guards under row locks inside a single transaction.
 */
export async function updateUserWithAdminGuards(
  targetUserId: number,
  data: Partial<User>,
  currentAdminId: number
): Promise<User> {
  const validId = userIdSchema.parse(targetUserId);
  const validAdminId = userIdSchema.parse(currentAdminId);
  const parsed = updateUserSchema.parse(data);

  if (validAdminId === validId && parsed.isActive === false) {
    throw new Error('You cannot suspend your own active administrator account.');
  }

  try {
    return await db.transaction(async (tx) => {
      const targetRows = await tx
        .select()
        .from(users)
        .where(eq(users.id, validId))
        .for('update')
        .limit(1);

      if (targetRows.length === 0) {
        throw new Error(`User ${validId} not found`);
      }

      const targetUser = targetRows[0];
      const updateValues: Partial<typeof users.$inferInsert> = {};
      if (parsed.email !== undefined) updateValues.email = parsed.email;
      if (parsed.passwordHash !== undefined) updateValues.passwordHash = parsed.passwordHash;
      if (parsed.firstName !== undefined) updateValues.firstName = parsed.firstName;
      if (parsed.lastName !== undefined) updateValues.lastName = parsed.lastName;
      if (parsed.role !== undefined) updateValues.role = parsed.role;
      if (parsed.isActive !== undefined) updateValues.isActive = parsed.isActive;

      if (Object.keys(updateValues).length === 0) {
        return mapUserRow(targetUser);
      }

      const isTargetActiveAdmin = targetUser.role === 'admin' && targetUser.isActive;
      const wouldRemoveAdmin =
        (parsed.role !== undefined && parsed.role !== 'admin') || parsed.isActive === false;

      if (isTargetActiveAdmin && wouldRemoveAdmin) {
        // Lock all active admin rows to prevent concurrent demotion leaving 0 active admins
        const activeAdminRows = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, 'admin'), eq(users.isActive, true)))
          .for('update');

        if (activeAdminRows.length <= 1) {
          throw new Error(
            'Cannot demote or suspend the last remaining active administrator account.'
          );
        }
      }

      const updatedRows = await tx
        .update(users)
        .set(updateValues)
        .where(eq(users.id, validId))
        .returning();

      return mapUserRow(updatedRows[0]);
    });
  } catch (err) {
    if (getPgErrorCode(err) === '23505') {
      throw new Error('Email is already registered to another account.');
    }
    throw err;
  }
}

/**
 * Creates a new user account (e.g. during register).
 */
export async function createUser(data: Omit<User, 'id'>): Promise<User> {
  const parsed = createUserSchema.parse(data);

  try {
    const rows = await db
      .insert(users)
      .values({
        email: parsed.email,
        passwordHash: parsed.passwordHash,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        role: parsed.role,
        isActive: parsed.isActive,
      })
      .returning();

    return mapUserRow(rows[0]);
  } catch (err) {
    if (getPgErrorCode(err) === '23505') {
      throw new Error(`Email ${parsed.email} is already registered`);
    }
    throw err;
  }
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
  activeAdmins: number;
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
      activeAdmins: sql<number>`count(*) filter (where ${users.role} = 'admin' and ${users.isActive} = true)::int`,
      active: sql<number>`count(*) filter (where ${users.isActive} = true)::int`,
      inactive: sql<number>`count(*) filter (where ${users.isActive} = false)::int`,
    })
    .from(users);

  const counts: AdminUsersCounts = {
    all: Number(aggRow?.all ?? 0),
    guest: Number(aggRow?.guest ?? 0),
    host: Number(aggRow?.host ?? 0),
    admin: Number(aggRow?.admin ?? 0),
    activeAdmins: Number(aggRow?.activeAdmins ?? 0),
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

  if (typeof params?.search === 'string') {
    const cleanSearch = sanitizeSearchInput(params.search, 200);
    if (cleanSearch) {
      const pattern = `%${escapeIlike(cleanSearch, 200)}%`;
      const searchCond = or(
        ilike(users.email, pattern),
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
        ilike(
          sql`coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')`,
          pattern
        )
      );
      if (searchCond) conditions.push(searchCond);
    }
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
