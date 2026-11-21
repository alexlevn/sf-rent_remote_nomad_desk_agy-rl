import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hostProfiles, properties, reservations, users } from '@/lib/db/schema';
import { notifyBookingCancelled, notifyHostApplication } from '@/lib/email/notifications';
import type { EmailPropertyInfo, EmailReservationInfo } from '@/lib/email/templates';
import { getPaymentDriver } from '@/lib/payments/driver';
import type { HostApplicationInput, HostProfile, HostStatus } from '@/lib/types';
import {
  hostApplicationSchema,
  hostInt4IdSchema,
  reviewHostApplicationSchema,
  updateHostProfileSchema,
} from '@/lib/validations/host';

function mapHostRow(row: typeof hostProfiles.$inferSelect): HostProfile {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    slug: row.slug || `host-${row.id}`,
    phone: row.phone,
    website: row.website ?? null,
    cities: row.cities ?? '',
    portfolioSize: row.portfolioSize ?? 1,
    bio: row.bio ?? '',
    avatar: row.avatar ?? null,
    status: row.status as HostStatus,
    rejectionReason: row.rejectionReason ?? null,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : undefined,
  };
}

function slugifyHostName(name: string, fallbackSuffix: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
  return base || `host-${fallbackSuffix}`;
}

/**
 * Lists all registered host profiles.
 */
export async function listHosts(): Promise<HostProfile[]> {
  const rows = await db
    .select()
    .from(hostProfiles)
    .orderBy(asc(hostProfiles.id));
  return rows.map(mapHostRow);
}

/**
 * Retrieves a host profile by its ID.
 */
export async function getHostProfile(
  id: number
): Promise<HostProfile | null> {
  const parsed = hostInt4IdSchema.safeParse(id);
  if (!parsed.success) return null;

  const rows = await db
    .select()
    .from(hostProfiles)
    .where(eq(hostProfiles.id, parsed.data))
    .limit(1);

  return rows.length > 0 ? mapHostRow(rows[0]) : null;
}

/**
 * Retrieves a host profile specifically by associated userId.
 */
export async function getHostByUserId(
  userId: number
): Promise<HostProfile | null> {
  const parsed = hostInt4IdSchema.safeParse(userId);
  if (!parsed.success) return null;

  const rows = await db
    .select()
    .from(hostProfiles)
    .where(eq(hostProfiles.userId, parsed.data))
    .limit(1);

  return rows.length > 0 ? mapHostRow(rows[0]) : null;
}

/**
 * Retrieves a host profile by URL slug.
 */
export async function getHostBySlug(slug: string): Promise<HostProfile | null> {
  if (!slug || typeof slug !== 'string') return null;
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;

  const rows = await db
    .select()
    .from(hostProfiles)
    .where(eq(hostProfiles.slug, cleanSlug))
    .limit(1);

  return rows.length > 0 ? mapHostRow(rows[0]) : null;
}

/**
 * Submits a new host application (/host/apply, D10).
 * Creates a pending host profile in PostgreSQL and notifies admin via Mailpit.
 */
export async function applyHost(
  data: HostApplicationInput
): Promise<HostProfile> {
  const parsed = hostApplicationSchema.parse(data);
  const targetUserId = parsed.userId ?? 5;

  const existing = await db
    .select()
    .from(hostProfiles)
    .where(eq(hostProfiles.userId, targetUserId))
    .limit(1);

  let saved: HostProfile;

  if (existing.length > 0) {
    if (existing[0].status === 'suspended') {
      throw new Error('Suspended host accounts cannot reapply; please contact support');
    }
    if (existing[0].status === 'approved') {
      throw new Error('Host account is already approved');
    }
    const updatedRows = await db
      .update(hostProfiles)
      .set({
        displayName: parsed.displayName,
        phone: parsed.phone,
        website: parsed.website ?? null,
        cities: parsed.cities ?? '',
        portfolioSize: parsed.portfolioSize ?? 1,
        bio: parsed.bio ?? '',
        status: 'pending',
        rejectionReason: null,
      })
      .where(eq(hostProfiles.id, existing[0].id))
      .returning();

    saved = mapHostRow(updatedRows[0]);
  } else {
    let candidateSlug = slugifyHostName(parsed.displayName, targetUserId);
    const slugConflict = await db
      .select({ id: hostProfiles.id })
      .from(hostProfiles)
      .where(eq(hostProfiles.slug, candidateSlug))
      .limit(1);

    if (slugConflict.length > 0) {
      candidateSlug = `${candidateSlug}-${targetUserId}`;
    }

    const insertedRows = await db
      .insert(hostProfiles)
      .values({
        userId: targetUserId,
        displayName: parsed.displayName,
        slug: candidateSlug,
        phone: parsed.phone,
        website: parsed.website ?? null,
        cities: parsed.cities ?? '',
        portfolioSize: parsed.portfolioSize ?? 1,
        bio: parsed.bio ?? '',
        avatar: null,
        status: 'pending',
        rejectionReason: null,
        approvedAt: null,
      })
      .returning();

    saved = mapHostRow(insertedRows[0]);
  }

  await notifyHostApplication(
    {
      displayName: saved.displayName,
      cities: saved.cities,
      rejectionReason: saved.rejectionReason,
    },
    'submitted'
  );

  return saved;
}

/**
 * Lists host applications awaiting admin review.
 */
export async function listHostApplications(): Promise<HostProfile[]> {
  const rows = await db
    .select()
    .from(hostProfiles)
    .where(eq(hostProfiles.status, 'pending'))
    .orderBy(desc(hostProfiles.createdAt), asc(hostProfiles.id));

  return rows.map(mapHostRow);
}

/**
 * Reviews a host application: approve, reject, or suspend (admin portal).
 * Elevates associated user role to 'host' on approval and notifies applicant.
 */
export async function reviewHostApplication(
  id: number,
  status: HostStatus,
  reason?: string
): Promise<HostProfile> {
  const parsed = reviewHostApplicationSchema.parse({ id, status, reason });

  const result = await db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(hostProfiles)
      .where(eq(hostProfiles.id, parsed.id))
      .limit(1);

    if (existingRows.length === 0) {
      throw new Error(`Host profile ${parsed.id} not found`);
    }

    const existing = existingRows[0];
    const updatedRows = await tx
      .update(hostProfiles)
      .set({
        status: parsed.status,
        rejectionReason: parsed.reason || null,
        approvedAt:
          parsed.status === 'approved' ? new Date() : existing.approvedAt,
      })
      .where(eq(hostProfiles.id, parsed.id))
      .returning();

    const userRows = await tx
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, existing.userId))
      .limit(1);

    const user = userRows[0];
    // Elevate guest role to 'host' upon approval without downgrading an admin
    if (parsed.status === 'approved' && user && user.role !== 'admin') {
      await tx
        .update(users)
        .set({ role: 'host' })
        .where(eq(users.id, user.id));
    }

    const cancelledPending: Array<{
      paymentRef: string | null;
      reservationInfo: EmailReservationInfo;
      propertyInfo: EmailPropertyInfo;
    }> = [];

    if (parsed.status === 'suspended') {
      const hostProps = await tx
        .select({
          id: properties.id,
          title: properties.title,
          city: properties.city,
          country: properties.country,
          neighborhood: properties.neighborhood,
          address: properties.address,
        })
        .from(properties)
        .where(eq(properties.hostId, parsed.id));

      if (hostProps.length > 0) {
        const propById = new Map(hostProps.map((p) => [p.id, p]));
        const propIds = hostProps.map((p) => p.id);
        const cancelReason = (parsed.reason || 'Host account suspended').slice(0, 255);

        const cancelledRows = await tx
          .update(reservations)
          .set({
            status: 'cancelled',
            cancelledBy: 'admin',
            paymentStatus: 'voided',
            rejectionReason: cancelReason,
            updatedAt: new Date(),
          })
          .where(
            and(
              inArray(reservations.propertyId, propIds),
              eq(reservations.status, 'pending')
            )
          )
          .returning();

        for (const row of cancelledRows) {
          const prop = propById.get(row.propertyId);
          cancelledPending.push({
            paymentRef: row.paymentRef,
            reservationInfo: {
              code: row.code,
              guestName: row.guestName,
              guestEmail: row.guestEmail,
              moveInDate: row.moveInDate,
              moveOutDate: row.moveOutDate,
              nights: row.nights,
              totalAmount: row.totalAmount,
              respondBy: row.respondBy ? row.respondBy.toISOString() : null,
            },
            propertyInfo: {
              title: prop?.title ?? 'Apartment',
              city: prop?.city ?? '',
              country: prop?.country ?? '',
              neighborhood: prop?.neighborhood ?? '',
              address: prop?.address ?? '',
            },
          });
        }
      }
    }

    return {
      profile: mapHostRow(updatedRows[0]),
      userEmail: user?.email,
      cancelledPending,
    };
  });

  if (result.cancelledPending.length > 0) {
    const paymentDriver = getPaymentDriver();
    for (const item of result.cancelledPending) {
      if (item.paymentRef) {
        try {
          await paymentDriver.void(item.paymentRef);
        } catch (err) {
          console.error('[hosts] Failed to void payment for cancelled pending reservation:', err);
        }
      }
      await notifyBookingCancelled(
        item.reservationInfo,
        item.propertyInfo,
        'admin',
        result.userEmail
      );
    }
  }

  if (
    result.userEmail &&
    (parsed.status === 'approved' ||
      parsed.status === 'rejected' ||
      parsed.status === 'suspended')
  ) {
    await notifyHostApplication(
      {
        displayName: result.profile.displayName,
        cities: result.profile.cities,
        rejectionReason: result.profile.rejectionReason,
      },
      parsed.status,
      result.userEmail
    );
  }

  return result.profile;
}

/**
 * Updates an existing host profile.
 */
export async function updateHostProfile(
  id: number,
  data: Partial<HostProfile>
): Promise<HostProfile> {
  const validId = hostInt4IdSchema.parse(id);
  const parsed = updateHostProfileSchema.parse(data);

  const existingRows = await db
    .select()
    .from(hostProfiles)
    .where(eq(hostProfiles.id, validId))
    .limit(1);

  if (existingRows.length === 0) {
    throw new Error(`Host profile ${validId} not found`);
  }

  const updatePayload: Partial<typeof hostProfiles.$inferInsert> = {};
  if (parsed.displayName !== undefined) updatePayload.displayName = parsed.displayName;
  if (parsed.slug !== undefined) updatePayload.slug = parsed.slug;
  if (parsed.phone !== undefined) updatePayload.phone = parsed.phone;
  if (parsed.website !== undefined) updatePayload.website = parsed.website;
  if (parsed.cities !== undefined) updatePayload.cities = parsed.cities;
  if (parsed.portfolioSize !== undefined) updatePayload.portfolioSize = parsed.portfolioSize;
  if (parsed.bio !== undefined) updatePayload.bio = parsed.bio;
  if (parsed.avatar !== undefined) updatePayload.avatar = parsed.avatar;
  if (parsed.status !== undefined) updatePayload.status = parsed.status;
  if (parsed.rejectionReason !== undefined) {
    updatePayload.rejectionReason = parsed.rejectionReason;
  }

  if (Object.keys(updatePayload).length === 0) {
    return mapHostRow(existingRows[0]);
  }

  const updatedRows = await db
    .update(hostProfiles)
    .set(updatePayload)
    .where(eq(hostProfiles.id, validId))
    .returning();

  return mapHostRow(updatedRows[0]);
}

export interface AdminHostsPaginatedParams {
  page?: number;
  pageSize?: number;
  status?: HostStatus | 'all';
  search?: string;
}

export interface AdminHostsStatusCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
}

export interface AdminHostsPaginatedResult {
  items: HostProfile[];
  total: number;
  page: number;
  pageSize: number;
  counts: AdminHostsStatusCounts;
}

const VALID_HOST_STATUSES = new Set<HostStatus>([
  'pending',
  'approved',
  'rejected',
  'suspended',
]);

function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function normalizePagination(page?: number, pageSize?: number) {
  const safePage =
    typeof page === 'number' && Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
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
 * Lists host profiles for the Admin Portal using SQL LIMIT/OFFSET pagination,
 * filtered COUNT(*), and global per-status counts.
 */
export async function listAdminHostsPaginated(
  params?: AdminHostsPaginatedParams
): Promise<AdminHostsPaginatedResult> {
  const { page, pageSize, offset } = normalizePagination(params?.page, params?.pageSize);

  const statusCountRows = await db
    .select({
      status: hostProfiles.status,
      count: sql<number>`count(*)::int`,
    })
    .from(hostProfiles)
    .groupBy(hostProfiles.status);

  const counts: AdminHostsStatusCounts = {
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  };
  for (const row of statusCountRows) {
    const c = Number(row.count ?? 0);
    counts.all += c;
    if (row.status in counts && row.status !== 'all') {
      counts[row.status as keyof Omit<AdminHostsStatusCounts, 'all'>] = c;
    }
  }

  const conditions: SQL[] = [];

  if (params?.status && params.status !== 'all') {
    if (!VALID_HOST_STATUSES.has(params.status)) {
      return { items: [], total: 0, page, pageSize, counts };
    }
    conditions.push(eq(hostProfiles.status, params.status));
  }

  if (params?.search && params.search.trim()) {
    const pattern = `%${escapeIlike(params.search.trim())}%`;
    const searchCond = or(
      ilike(hostProfiles.displayName, pattern),
      ilike(hostProfiles.cities, pattern),
      ilike(hostProfiles.phone, pattern),
      ilike(users.email, pattern)
    );
    if (searchCond) conditions.push(searchCond);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRows, itemRows] = await Promise.all([
    whereClause
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(hostProfiles)
          .leftJoin(users, eq(hostProfiles.userId, users.id))
          .where(whereClause)
      : db.select({ count: sql<number>`count(*)::int` }).from(hostProfiles),
    whereClause
      ? db
          .select({ host: hostProfiles })
          .from(hostProfiles)
          .leftJoin(users, eq(hostProfiles.userId, users.id))
          .where(whereClause)
          .orderBy(desc(hostProfiles.createdAt), desc(hostProfiles.id))
          .limit(pageSize)
          .offset(offset)
      : db
          .select({ host: hostProfiles })
          .from(hostProfiles)
          .orderBy(desc(hostProfiles.createdAt), desc(hostProfiles.id))
          .limit(pageSize)
          .offset(offset),
  ]);

  return {
    items: itemRows.map((r) => mapHostRow(r.host)),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
    counts,
  };
}
