import { randomInt } from 'node:crypto';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { z } from 'zod';
import { getExchangeRates } from '@/lib/api/rates';
import { db } from '@/lib/db/client';
import {
  escapeIlike,
  getPgConstraintName,
  getPgErrorCode,
  normalizePagination,
  sanitizeSearchInput,
} from '@/lib/db/query-helpers';
import {
  blockedDates,
  hostProfiles,
  properties,
  reservations,
  users,
} from '@/lib/db/schema';
import {
  notifyBookingCancelled,
  notifyBookingConfirmed,
  notifyBookingDecision,
  notifyNewBookingRequest,
} from '@/lib/email/notifications';
import { getUtcOffsetDateString } from '@/lib/format';
import { getPaymentDriver } from '@/lib/payments/driver';
import { calculateBookingTotal } from '@/lib/pricing';
import { BOOKING_RULES } from '@/content/booking-rules';
import type {
  BlockedDate,
  CreateReservationInput,
  PaymentStatus,
  Reservation,
  ReservationFilters,
  ReservationStatus,
  WorkstationSelection,
} from '@/lib/types';
import {
  blockedDateInputSchema,
  hostInt4IdSchema,
  isoDateSchema,
} from '@/lib/validations/host';

const reservationStatusSchema = z.enum([
  'pending',
  'confirmed',
  'rejected',
  'expired',
  'cancelled',
  'completed',
]);

const cancelledBySchema = z.enum(['guest', 'host', 'admin']);

const createReservationInputSchema = z
  .object({
    propertyId: hostInt4IdSchema,
    moveInDate: isoDateSchema,
    moveOutDate: isoDateSchema,
    guestName: z.string().trim().min(1, 'Guest name is required').max(150),
    guestEmail: z.string().trim().email('Valid guest email is required').max(150),
    guestPhone: z.string().trim().max(50).optional(),
    userId: hostInt4IdSchema.optional(),
    workstationMonthlyEUR: z.number().int().min(0).max(10000000).optional(),
    workstationConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((data) => data.moveOutDate > data.moveInDate, {
    message: 'Move-out date must be after move-in date',
    path: ['moveOutDate'],
  });

function mapReservationRow(row: typeof reservations.$inferSelect): Reservation {
  return {
    id: row.id,
    code: row.code,
    userId: row.userId,
    propertyId: row.propertyId,
    moveInDate: row.moveInDate,
    moveOutDate: row.moveOutDate,
    nights: row.nights,
    monthlyRent: row.monthlyRent,
    rentAmount: row.rentAmount,
    workstationFee: row.workstationFee,
    totalAmount: row.totalAmount,
    commissionAmount: row.commissionAmount,
    hostPayout: row.hostPayout,
    workstationConfig:
      (row.workstationConfig as unknown as WorkstationSelection | null) ?? null,
    guestName: row.guestName,
    guestEmail: row.guestEmail,
    guestPhone: row.guestPhone ?? '',
    status: row.status as ReservationStatus,
    respondBy: row.respondBy ? row.respondBy.toISOString() : null,
    rejectionReason: row.rejectionReason ?? null,
    cancelledBy: (row.cancelledBy as 'guest' | 'host' | 'admin' | null) ?? null,
    paymentStatus: row.paymentStatus as PaymentStatus,
    paymentRef: row.paymentRef ?? '',
    commissionRate: row.commissionRate ?? undefined,
    respondHours: row.respondHours ?? undefined,
    freeCancelDays: row.freeCancelDays ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapBlockedDateRow(row: typeof blockedDates.$inferSelect): BlockedDate {
  return {
    id: row.id,
    propertyId: row.propertyId,
    startDate: row.startDate,
    endDate: row.endDate,
    reason: row.reason ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Calculates number of nights between two YYYY-MM-DD date strings (UTC).
 */
function calculateNights(moveInDate: string, moveOutDate: string): number {
  const dIn = new Date(`${moveInDate}T00:00:00Z`);
  const dOut = new Date(`${moveOutDate}T00:00:00Z`);
  const diffMs = dOut.getTime() - dIn.getTime();
  return Math.round(diffMs / (1000 * 3600 * 24));
}

/**
 * Lazily expires pending reservations whose 48h respond_by window has elapsed (Risk #9).
 */
async function expireOverduePendingReservations(propertyId?: number): Promise<void> {
  const now = new Date();
  const conditions: SQL[] = [
    eq(reservations.status, 'pending'),
    isNotNull(reservations.respondBy),
    lt(reservations.respondBy, now),
  ];
  if (propertyId != null) {
    conditions.push(eq(reservations.propertyId, propertyId));
  }

  const expiredRows = await db
    .update(reservations)
    .set({
      status: 'expired',
      paymentStatus: 'voided',
      updatedAt: now,
    })
    .where(and(...conditions))
    .returning();

  if (expiredRows.length === 0) return;

  const paymentDriver = getPaymentDriver();
  for (const row of expiredRows) {
    if (row.paymentRef) {
      await paymentDriver.void(row.paymentRef).catch(() => undefined);
    }
  }
}

/**
 * Lists reservations matching given filters from PostgreSQL.
 */
export async function listReservations(
  filters?: ReservationFilters
): Promise<Reservation[]> {
  await expireOverduePendingReservations(filters?.propertyId);

  const conditions: SQL[] = [];

  if (filters?.userId != null) {
    const parsedUser = hostInt4IdSchema.safeParse(filters.userId);
    if (!parsedUser.success) return [];
    conditions.push(eq(reservations.userId, parsedUser.data));
  }

  if (filters?.propertyId != null) {
    const parsedProp = hostInt4IdSchema.safeParse(filters.propertyId);
    if (!parsedProp.success) return [];
    conditions.push(eq(reservations.propertyId, parsedProp.data));
  }

  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(reservations.status, filters.status));
  }

  if (filters?.hostId != null) {
    const parsedHost = hostInt4IdSchema.safeParse(filters.hostId);
    if (!parsedHost.success) return [];
    conditions.push(eq(properties.hostId, parsedHost.data));

    const rows = await db
      .select({ reservation: reservations })
      .from(reservations)
      .innerJoin(properties, eq(reservations.propertyId, properties.id))
      .where(and(...conditions))
      .orderBy(desc(reservations.createdAt), desc(reservations.id));

    return rows.map((r) => mapReservationRow(r.reservation));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = whereClause
    ? await db
        .select()
        .from(reservations)
        .where(whereClause)
        .orderBy(desc(reservations.createdAt), desc(reservations.id))
    : await db
        .select()
        .from(reservations)
        .orderBy(desc(reservations.createdAt), desc(reservations.id));

  return rows.map(mapReservationRow);
}

async function maybeExpireSingleRow(
  row: typeof reservations.$inferSelect
): Promise<typeof reservations.$inferSelect> {
  if (
    row.status !== 'pending' ||
    !row.respondBy ||
    row.respondBy.getTime() >= Date.now()
  ) {
    return row;
  }

  const now = new Date();
  const expiredRows = await db
    .update(reservations)
    .set({
      status: 'expired',
      paymentStatus: 'voided',
      updatedAt: now,
    })
    .where(and(eq(reservations.id, row.id), eq(reservations.status, 'pending')))
    .returning();

  if (expiredRows.length > 0) {
    if (row.paymentRef) {
      await getPaymentDriver().void(row.paymentRef).catch(() => undefined);
    }
    return expiredRows[0];
  }

  return row;
}

/**
 * Retrieves a reservation by unique booking code (e.g. 'ND-SEED1').
 */
export async function getReservationByCode(code: string): Promise<Reservation | null> {
  if (!code || typeof code !== 'string') return null;
  const cleanCode = sanitizeSearchInput(code, 20).toUpperCase();
  if (!cleanCode) return null;

  const rows = await db
    .select()
    .from(reservations)
    .where(eq(sql`upper(${reservations.code})`, cleanCode))
    .limit(1);

  if (rows.length === 0) return null;
  const freshRow = await maybeExpireSingleRow(rows[0]);
  return mapReservationRow(freshRow);
}

/**
 * Retrieves a reservation by ID.
 */
export async function getReservationById(id: number): Promise<Reservation | null> {
  const parsed = hostInt4IdSchema.safeParse(id);
  if (!parsed.success) return null;

  const rows = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, parsed.data))
    .limit(1);

  if (rows.length === 0) return null;
  const freshRow = await maybeExpireSingleRow(rows[0]);
  return mapReservationRow(freshRow);
}

/**
 * Creates a new reservation in a single DB transaction with row-level locking
 * (SELECT ... FOR UPDATE), lazy 48h expiry, server-side pricing, MockPaymentDriver,
 * Postgres exclusion constraint (23P01) fallback, and Mailpit notifications.
 */
export async function createReservation(
  data: CreateReservationInput
): Promise<Reservation> {
  const parsedResult = createReservationInputSchema.safeParse({
    ...data,
    workstationConfig: data.workstationConfig ?? null,
  });
  if (!parsedResult.success) {
    const firstMsg =
      parsedResult.error.issues[0]?.message || 'Invalid reservation input';
    throw new Error(firstMsg);
  }
  const valid = parsedResult.data;
  const todayUtc = getUtcOffsetDateString(0);
  if (valid.moveInDate < todayUtc) {
    throw new Error('Move-in date cannot be in the past');
  }
  const targetUserId = valid.userId ?? 1;

  const rates = await getExchangeRates();
  const paymentDriver = getPaymentDriver();

  let expiredPaymentRefs: string[] = [];
  let authorizedPaymentRef: string | null = null;
  let txResult: {
    reservation: Reservation;
    propertyInfo: {
      title: string;
      city: string;
      country: string;
      neighborhood: string;
      address: string;
    };
    hostId: number | null;
    isInstant: boolean;
  };

  try {
    txResult = await db.transaction(async (tx) => {
      // 1. Lock property row to serialize concurrent bookings for the same apartment (D28)
      const propRows = await tx
        .select({
          id: properties.id,
          hostId: properties.hostId,
          title: properties.title,
          city: properties.city,
          country: properties.country,
          neighborhood: properties.neighborhood,
          address: properties.address,
          pricePerMonth: properties.pricePerMonth,
          minimumStayNights: properties.minimumStayNights,
          isDirectBooking: properties.isDirectBooking,
          status: properties.status,
        })
        .from(properties)
        .where(eq(properties.id, valid.propertyId))
        .for('update')
        .limit(1);

      if (propRows.length === 0) {
        throw new Error(`Property ${valid.propertyId} not found`);
      }

      const property = propRows[0];
      if (property.status !== 'published') {
        throw new Error('This property is not currently available for booking');
      }

      // Ensure host account is approved and prevent hosts from booking their own apartment
      if (property.hostId != null) {
        const hostRows = await tx
          .select({ status: hostProfiles.status, userId: hostProfiles.userId })
          .from(hostProfiles)
          .where(eq(hostProfiles.id, property.hostId))
          .limit(1);
        if (hostRows.length > 0 && hostRows[0].status !== 'approved') {
          throw new Error('This property is not currently available for booking');
        }
        if (hostRows.length > 0 && hostRows[0].userId === targetUserId) {
          throw new Error('Hosts cannot book their own apartment');
        }
      }

      // Validate minimum stay requirement
      const nights = calculateNights(valid.moveInDate, valid.moveOutDate);
      const minStay = property.minimumStayNights || BOOKING_RULES.minimumStayNights;
      if (nights < minStay) {
        throw new Error(
          `Minimum stay requirement is ${minStay} nights (requested ${nights} nights)`
        );
      }

      // 2. Lazily expire overdue pending reservations for this property inside transaction (Risk #9)
      const now = new Date();
      const expiredRows = await tx
        .update(reservations)
        .set({
          status: 'expired',
          paymentStatus: 'voided',
          updatedAt: now,
        })
        .where(
          and(
            eq(reservations.propertyId, property.id),
            eq(reservations.status, 'pending'),
            isNotNull(reservations.respondBy),
            lt(reservations.respondBy, now)
          )
        )
        .returning({ paymentRef: reservations.paymentRef });

      expiredPaymentRefs = expiredRows
        .map((r) => r.paymentRef)
        .filter((ref): ref is string => Boolean(ref));

      // 3. Check availability against blocked_dates and active reservations
      const conflictingBlocks = await tx
        .select({ id: blockedDates.id })
        .from(blockedDates)
        .where(
          and(
            eq(blockedDates.propertyId, property.id),
            sql`${blockedDates.startDate} < ${valid.moveOutDate}::date`,
            sql`${blockedDates.endDate} > ${valid.moveInDate}::date`
          )
        )
        .limit(1);

      if (conflictingBlocks.length > 0) {
        throw new Error(
          'Selected dates are blocked by host and unavailable for booking'
        );
      }

      const conflictingBookings = await tx
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.propertyId, property.id),
            inArray(reservations.status, ['pending', 'confirmed']),
            sql`${reservations.moveInDate} < ${valid.moveOutDate}::date`,
            sql`${reservations.moveOutDate} > ${valid.moveInDate}::date`
          )
        )
        .limit(1);

      if (conflictingBookings.length > 0) {
        throw new Error(
          'These dates were just booked. Please choose different dates.'
        );
      }

      // 4. Recalculate full pricing server-side from DB property price & exchange rates (D18, Risk #5)
      const pricing = calculateBookingTotal(
        property.pricePerMonth,
        nights,
        valid.workstationMonthlyEUR ?? 0,
        rates
      );

      // 5. Authorize payment and insert reservation with savepoint retry on rare ND-XXXXX code collisions
      const authResult = await paymentDriver.authorize(
        pricing.totalAmountUSD,
        'USD',
        {
          cardNumber: '4242424242424242',
          cardholderName: valid.guestName,
        }
      );
      authorizedPaymentRef = authResult.paymentRef;

      // 6. Insert reservation (Instant -> confirmed + captured; Request -> pending + authorized + 48h respondBy)
      const isInstant = property.isDirectBooking;
      const initialStatus: ReservationStatus = isInstant ? 'confirmed' : 'pending';
      const initialPaymentStatus: PaymentStatus = isInstant
        ? 'captured'
        : 'authorized';
      const respondBy = isInstant
        ? null
        : new Date(now.getTime() + BOOKING_RULES.respondHours * 3600 * 1000);

      let insertedRow: typeof reservations.$inferSelect | undefined;
      for (let attempt = 0; attempt < 5; attempt++) {
        const bookingCode = `ND-${randomInt(10000, 100000)}`;
        await tx.execute(sql`SAVEPOINT insert_res_code`);
        try {
          const insertedRows = await tx
            .insert(reservations)
            .values({
              code: bookingCode,
              userId: targetUserId,
              propertyId: property.id,
              moveInDate: valid.moveInDate,
              moveOutDate: valid.moveOutDate,
              nights,
              monthlyRent: property.pricePerMonth,
              rentAmount: pricing.rentAmountUSD,
              workstationFee: pricing.workstationFeeUSD,
              totalAmount: pricing.totalAmountUSD,
              commissionAmount: pricing.commissionAmountUSD,
              hostPayout: pricing.hostPayoutUSD,
              workstationConfig: valid.workstationConfig ?? null,
              guestName: valid.guestName,
              guestEmail: valid.guestEmail,
              guestPhone: valid.guestPhone ?? '',
              status: initialStatus,
              respondBy,
              paymentStatus: initialPaymentStatus,
              paymentRef: authResult.paymentRef,
              commissionRate: BOOKING_RULES.commissionPercent,
              respondHours: BOOKING_RULES.respondHours,
              freeCancelDays: BOOKING_RULES.freeCancelDays,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          await tx.execute(sql`RELEASE SAVEPOINT insert_res_code`);
          insertedRow = insertedRows[0];
          break;
        } catch (insertErr) {
          await tx.execute(sql`ROLLBACK TO SAVEPOINT insert_res_code`);
          if (
            getPgErrorCode(insertErr) === '23505' &&
            getPgConstraintName(insertErr) === 'reservations_code_unique' &&
            attempt < 4
          ) {
            continue;
          }
          throw insertErr;
        }
      }

      if (!insertedRow) {
        throw new Error('Failed to generate a unique reservation code. Please try again.');
      }

      if (isInstant) {
        await paymentDriver.capture(authResult.paymentRef);
      }

      return {
        reservation: mapReservationRow(insertedRow),
        propertyInfo: {
          title: property.title,
          city: property.city,
          country: property.country ?? '',
          neighborhood: property.neighborhood ?? '',
          address: property.address ?? '',
        },
        hostId: property.hostId,
        isInstant,
      };
    });
  } catch (err: unknown) {
    // Void any payment authorization if the DB transaction rolled back
    if (authorizedPaymentRef) {
      await paymentDriver.void(authorizedPaymentRef).catch(() => undefined);
    }

    // 7. Convert Postgres btree_gist exclusion violation (23P01) to friendly collision message (Risk #7)
    if (getPgErrorCode(err) === '23P01') {
      throw new Error(
        'These dates were just booked. Please choose different dates.'
      );
    }
    throw err;
  }

  // Void payment holds for any lazily expired pending reservations outside the transaction
  for (const ref of expiredPaymentRefs) {
    await paymentDriver.void(ref).catch(() => undefined);
  }

  // 8. Dispatch transactional email notifications via Mailpit (errors swallowed inside notifier)
  let hostEmail: string | undefined;
  let hostDisplayName = 'NomadDesk Host';
  if (txResult.hostId != null) {
    const hostRows = await db
      .select({
        displayName: hostProfiles.displayName,
        email: users.email,
      })
      .from(hostProfiles)
      .innerJoin(users, eq(hostProfiles.userId, users.id))
      .where(eq(hostProfiles.id, txResult.hostId))
      .limit(1);
    hostEmail = hostRows[0]?.email;
    hostDisplayName = hostRows[0]?.displayName || hostDisplayName;
  }

  if (txResult.isInstant) {
    await notifyBookingConfirmed(
      txResult.reservation,
      txResult.propertyInfo,
      hostEmail
    );
  } else if (hostEmail) {
    await notifyNewBookingRequest(
      txResult.reservation,
      txResult.propertyInfo,
      { displayName: hostDisplayName },
      hostEmail
    );
  }

  return txResult.reservation;
}

/**
 * Updates reservation lifecycle status (Accept/Reject by host, Cancel by guest/admin).
 * Serializes transitions with SELECT ... FOR UPDATE inside a DB transaction to prevent
 * double-capture/double-refund races, then dispatches Mailpit notifications.
 */
export async function updateReservationStatus(
  id: number,
  status: ReservationStatus,
  reason?: string,
  cancelledBy?: 'guest' | 'host' | 'admin',
  options?: { hostId?: number }
): Promise<Reservation> {
  const validId = hostInt4IdSchema.parse(id);
  const validStatus = reservationStatusSchema.parse(status);
  const validCancelledBy =
    cancelledBy !== undefined ? cancelledBySchema.parse(cancelledBy) : undefined;
  const trimmedReason =
    typeof reason === 'string' ? sanitizeSearchInput(reason, 255) : '';

  const paymentDriver = getPaymentDriver();

  const txOutcome = await db.transaction(async (tx) => {
    const resRows = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, validId))
      .for('update')
      .limit(1);

    if (resRows.length === 0) {
      throw new Error(`Reservation ${validId} not found`);
    }

    const existing = resRows[0];
    const propRows = await tx
      .select()
      .from(properties)
      .where(eq(properties.id, existing.propertyId))
      .limit(1);

    if (propRows.length === 0) {
      throw new Error(`Property ${existing.propertyId} not found`);
    }
    const property = propRows[0];

    // Enforce host ownership when invoked from Host Portal (Risk #8)
    if (options?.hostId != null && property.hostId !== options.hostId) {
      throw new Error('Unauthorized: reservation does not belong to this host');
    }

    const paymentRef = existing.paymentRef || `mock_txn_res_${existing.id}`;

    // Guard against transitioning an expired 48h pending request (Risk #9)
    if (
      existing.status === 'pending' &&
      existing.respondBy &&
      existing.respondBy.getTime() < Date.now()
    ) {
      const expiredRows = await tx
        .update(reservations)
        .set({
          status: 'expired',
          paymentStatus: 'voided',
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, validId))
        .returning();

      return {
        expiredEarly: true as const,
        paymentAction: 'void' as const,
        paymentRef,
        reservation: mapReservationRow(expiredRows[0]),
        property,
      };
    }

    // Enforce valid reservation lifecycle transitions
    if (
      (validStatus === 'confirmed' || validStatus === 'rejected') &&
      existing.status !== 'pending'
    ) {
      throw new Error(
        `Cannot transition reservation from '${existing.status}' to '${validStatus}'`
      );
    }
    if (
      validStatus === 'cancelled' &&
      existing.status !== 'pending' &&
      existing.status !== 'confirmed'
    ) {
      throw new Error(`Cannot cancel reservation in '${existing.status}' status`);
    }
    // D12: Hosts cannot self-cancel confirmed reservations
    if (
      validStatus === 'cancelled' &&
      existing.status === 'confirmed' &&
      validCancelledBy === 'host'
    ) {
      throw new Error(
        'Hosts cannot cancel confirmed reservations; please contact NomadDesk support.'
      );
    }

    // Enforce 14-day free cancellation policy for guest cancelling a confirmed booking (AC-BOOK-4)
    if (
      validStatus === 'cancelled' &&
      existing.status === 'confirmed' &&
      validCancelledBy === 'guest'
    ) {
      const freeCancelDays = existing.freeCancelDays ?? BOOKING_RULES.freeCancelDays;
      const todayUtc = new Date();
      todayUtc.setUTCHours(0, 0, 0, 0);
      const moveInUtc = new Date(`${existing.moveInDate}T00:00:00Z`);
      const daysUntilMoveIn = Math.floor(
        (moveInUtc.getTime() - todayUtc.getTime()) / (1000 * 3600 * 24)
      );
      if (daysUntilMoveIn < freeCancelDays) {
        throw new Error(
          `Free cancellation is only available at least ${freeCancelDays} days before move-in`
        );
      }
    }

    if (validStatus === 'rejected' && trimmedReason.length === 0) {
      throw new Error('Rejection reason is required');
    }

    let paymentStatus: PaymentStatus = existing.paymentStatus as PaymentStatus;
    let paymentAction: 'capture' | 'void' | 'refund' | null = null;
    if (validStatus === 'confirmed') {
      paymentAction = 'capture';
      paymentStatus = 'captured';
    } else if (validStatus === 'rejected' || validStatus === 'expired') {
      paymentAction = 'void';
      paymentStatus = 'voided';
    } else if (validStatus === 'cancelled') {
      if (existing.status === 'pending') {
        paymentAction = 'void';
        paymentStatus = 'voided';
      } else {
        paymentAction = 'refund';
        paymentStatus = 'refunded';
      }
    } else if (validStatus === 'completed') {
      paymentStatus = 'captured';
    }

    const updatedRows = await tx
      .update(reservations)
      .set({
        status: validStatus,
        paymentStatus,
        rejectionReason: trimmedReason || existing.rejectionReason,
        cancelledBy: validCancelledBy || existing.cancelledBy,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, validId))
      .returning();

    return {
      expiredEarly: false as const,
      paymentAction,
      paymentRef,
      reservation: mapReservationRow(updatedRows[0]),
      property,
    };
  });

  if (txOutcome.expiredEarly) {
    await paymentDriver.void(txOutcome.paymentRef).catch(() => undefined);
    if (validStatus === 'expired') {
      return txOutcome.reservation;
    }
    throw new Error('Reservation request has expired (48h response window passed)');
  }

  if (txOutcome.paymentAction === 'capture') {
    await paymentDriver.capture(txOutcome.paymentRef);
  } else if (txOutcome.paymentAction === 'void') {
    await paymentDriver.void(txOutcome.paymentRef);
  } else if (txOutcome.paymentAction === 'refund') {
    await paymentDriver.refund(txOutcome.paymentRef);
  }

  const updated = txOutcome.reservation;
  const property = txOutcome.property;

  // Resolve host email for host-facing notifications when needed
  let hostEmail: string | undefined;
  if (property.hostId != null && (validStatus === 'cancelled' || validStatus === 'expired')) {
    const hostUserRows = await db
      .select({ email: users.email })
      .from(hostProfiles)
      .innerJoin(users, eq(hostProfiles.userId, users.id))
      .where(eq(hostProfiles.id, property.hostId))
      .limit(1);
    hostEmail = hostUserRows[0]?.email;
  }

  const propertyInfo = {
    title: property.title,
    city: property.city,
    country: property.country ?? '',
    neighborhood: property.neighborhood ?? '',
    address: property.address ?? '',
  };

  if (validStatus === 'confirmed') {
    await notifyBookingDecision(updated, propertyInfo, 'accepted');
  } else if (validStatus === 'rejected') {
    await notifyBookingDecision(updated, propertyInfo, 'rejected', trimmedReason);
  } else if (validStatus === 'expired') {
    await notifyBookingDecision(updated, propertyInfo, 'expired', undefined, hostEmail);
  } else if (validStatus === 'cancelled') {
    await notifyBookingCancelled(
      updated,
      propertyInfo,
      validCancelledBy || 'guest',
      hostEmail
    );
  }

  return updated;
}

/**
 * Lists blocked dates for multiple properties in a single batched query.
 */
export async function listBlockedDatesForProperties(
  propertyIds: number[]
): Promise<BlockedDate[]> {
  const validIds = Array.from(
    new Set(propertyIds.filter((id) => hostInt4IdSchema.safeParse(id).success))
  );
  if (validIds.length === 0) return [];

  const rows = await db
    .select()
    .from(blockedDates)
    .where(inArray(blockedDates.propertyId, validIds))
    .orderBy(asc(blockedDates.startDate), asc(blockedDates.id));

  return rows.map(mapBlockedDateRow);
}

/**
 * Lists blocked dates for a specific property from PostgreSQL.
 */
export async function listBlockedDates(propertyId: number): Promise<BlockedDate[]> {
  const parsed = hostInt4IdSchema.safeParse(propertyId);
  if (!parsed.success) return [];

  const rows = await db
    .select()
    .from(blockedDates)
    .where(eq(blockedDates.propertyId, parsed.data))
    .orderBy(asc(blockedDates.startDate), asc(blockedDates.id));

  return rows.map(mapBlockedDateRow);
}

/**
 * Adds a new blocked date period for a property in PostgreSQL.
 * Rejects invalid ranges, overlapping blocked ranges, and overlapping active bookings (AC-HOST-6).
 */
export async function addBlockedDate(
  data: {
    propertyId: number;
    startDate: string;
    endDate: string;
    reason?: string;
  },
  options?: { hostId?: number }
): Promise<BlockedDate> {
  const parsedResult = blockedDateInputSchema.safeParse(data);
  if (!parsedResult.success) {
    const firstMsg = parsedResult.error.issues[0]?.message || 'Invalid blocked date input';
    throw new Error(firstMsg);
  }
  const parsed = parsedResult.data;

  // Lazily expire overdue pending bookings so expired holds do not block host calendar (Risk #9)
  await expireOverduePendingReservations(parsed.propertyId);

  // Serialize overlap check + insert per property inside a transaction to prevent race conditions
  const insertedRow = await db.transaction(async (tx) => {
    const propRows = await tx
      .select({ id: properties.id, hostId: properties.hostId })
      .from(properties)
      .where(eq(properties.id, parsed.propertyId))
      .for('update')
      .limit(1);

    if (propRows.length === 0) {
      throw new Error(`Property ${parsed.propertyId} not found`);
    }
    if (options?.hostId != null && propRows[0].hostId !== options.hostId) {
      throw new Error('Unauthorized: property does not belong to this host');
    }

    // Prevent overlapping blocked ranges for the same property
    const existingBlocks = await tx
      .select({ id: blockedDates.id })
      .from(blockedDates)
      .where(
        and(
          eq(blockedDates.propertyId, parsed.propertyId),
          sql`${blockedDates.startDate} < ${parsed.endDate}::date`,
          sql`${blockedDates.endDate} > ${parsed.startDate}::date`
        )
      )
      .limit(1);

    if (existingBlocks.length > 0) {
      throw new Error('This blocked period overlaps with an existing blocked date range');
    }

    // Prevent overlapping with existing active bookings (pending or confirmed) - AC-HOST-6
    const activeBookings = await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.propertyId, parsed.propertyId),
          inArray(reservations.status, ['pending', 'confirmed']),
          sql`${reservations.moveInDate} < ${parsed.endDate}::date`,
          sql`${reservations.moveOutDate} > ${parsed.startDate}::date`
        )
      )
      .limit(1);

    if (activeBookings.length > 0) {
      throw new Error('These dates overlap an existing booking');
    }

    const rows = await tx
      .insert(blockedDates)
      .values({
        propertyId: parsed.propertyId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        reason: parsed.reason || 'Owner Block',
      })
      .returning();

    return rows[0];
  });

  return mapBlockedDateRow(insertedRow);
}

/**
 * Deletes a blocked date entry from PostgreSQL.
 */
export async function deleteBlockedDate(
  id: number,
  options?: { hostId?: number }
): Promise<boolean> {
  const parsed = hostInt4IdSchema.safeParse(id);
  if (!parsed.success) return false;

  if (options?.hostId != null) {
    const existingRows = await db
      .select({
        id: blockedDates.id,
        hostId: properties.hostId,
      })
      .from(blockedDates)
      .innerJoin(properties, eq(blockedDates.propertyId, properties.id))
      .where(eq(blockedDates.id, parsed.data))
      .limit(1);

    if (existingRows.length === 0) return false;
    if (existingRows[0].hostId !== options.hostId) {
      throw new Error('Unauthorized: blocked date does not belong to this host');
    }
  }

  const deleted = await db
    .delete(blockedDates)
    .where(eq(blockedDates.id, parsed.data))
    .returning({ id: blockedDates.id });

  return deleted.length > 0;
}

export type AdminDashboardPeriod = 'today' | '7d' | '30d' | 'all';

const adminDashboardPeriodSchema = z.enum(['today', '7d', '30d', 'all']);

const VALID_RESERVATION_STATUSES = new Set<ReservationStatus>([
  'pending',
  'confirmed',
  'rejected',
  'expired',
  'cancelled',
  'completed',
]);

export interface AdminReservationsPaginatedParams {
  page?: number;
  pageSize?: number;
  status?: ReservationStatus | 'all';
  hostId?: number;
  search?: string;
}

export interface AdminReservationsStatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  rejected: number;
  expired: number;
}

export interface AdminReservationsSummary {
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  cancelledCount: number;
  rejectedCount: number;
  expiredCount: number;
  gmvCents: number;
  commissionCents: number;
  hostPayoutCents: number;
}

export interface AdminReservationsPaginatedResult {
  items: Reservation[];
  total: number;
  page: number;
  pageSize: number;
  counts: AdminReservationsStatusCounts;
  summary: AdminReservationsSummary;
}

export interface AdminDashboardStats {
  period: AdminDashboardPeriod;
  publishedProperties: number;
  totalProperties: number;
  pendingProperties: number;
  activeHosts: number;
  pendingHosts: number;
  totalUsers: number;
  totalReservations: number;
  confirmedReservations: number;
  pendingReservations: number;
  cancelledReservations: number;
  newUsers: number;
  newProperties: number;
  gmvCents: number;
  commissionCents: number;
  estimatedGmvUSD: number;
  netCommissionUSD: number;
}

/**
 * Lists reservations for the Admin Portal using SQL LIMIT/OFFSET pagination,
 * filtered COUNT(*), global status counts, and SQL-aggregated financial KPIs.
 */
export async function listAdminReservationsPaginated(
  params?: AdminReservationsPaginatedParams
): Promise<AdminReservationsPaginatedResult> {
  await expireOverduePendingReservations();

  const { page, pageSize, offset } = normalizePagination(params?.page, params?.pageSize);

  const [aggRow] = await db
    .select({
      all: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${reservations.status} = 'pending')::int`,
      confirmed: sql<number>`count(*) filter (where ${reservations.status} = 'confirmed')::int`,
      completed: sql<number>`count(*) filter (where ${reservations.status} = 'completed')::int`,
      cancelled: sql<number>`count(*) filter (where ${reservations.status} = 'cancelled')::int`,
      rejected: sql<number>`count(*) filter (where ${reservations.status} = 'rejected')::int`,
      expired: sql<number>`count(*) filter (where ${reservations.status} = 'expired')::int`,
      gmvCents: sql<string>`coalesce(sum(${reservations.totalAmount}) filter (where ${reservations.status} in ('confirmed', 'completed')), 0)::bigint`,
      commissionCents: sql<string>`coalesce(sum(${reservations.commissionAmount}) filter (where ${reservations.status} in ('confirmed', 'completed')), 0)::bigint`,
      hostPayoutCents: sql<string>`coalesce(sum(${reservations.hostPayout}) filter (where ${reservations.status} in ('confirmed', 'completed')), 0)::bigint`,
    })
    .from(reservations);

  const counts: AdminReservationsStatusCounts = {
    all: Number(aggRow?.all ?? 0),
    pending: Number(aggRow?.pending ?? 0),
    confirmed: Number(aggRow?.confirmed ?? 0),
    completed: Number(aggRow?.completed ?? 0),
    cancelled: Number(aggRow?.cancelled ?? 0),
    rejected: Number(aggRow?.rejected ?? 0),
    expired: Number(aggRow?.expired ?? 0),
  };

  const summary: AdminReservationsSummary = {
    totalCount: counts.all,
    pendingCount: counts.pending,
    confirmedCount: counts.confirmed,
    completedCount: counts.completed,
    cancelledCount: counts.cancelled,
    rejectedCount: counts.rejected,
    expiredCount: counts.expired,
    gmvCents: Number(aggRow?.gmvCents ?? 0),
    commissionCents: Number(aggRow?.commissionCents ?? 0),
    hostPayoutCents: Number(aggRow?.hostPayoutCents ?? 0),
  };

  const conditions: SQL[] = [];

  if (params?.status && params.status !== 'all') {
    if (!VALID_RESERVATION_STATUSES.has(params.status)) {
      return { items: [], total: 0, page, pageSize, counts, summary };
    }
    conditions.push(eq(reservations.status, params.status));
  }

  if (params?.hostId != null) {
    const validHostId = hostInt4IdSchema.safeParse(params.hostId);
    if (!validHostId.success) {
      return { items: [], total: 0, page, pageSize, counts, summary };
    }
    conditions.push(eq(properties.hostId, validHostId.data));
  }

  if (typeof params?.search === 'string') {
    const cleanSearch = sanitizeSearchInput(params.search, 200);
    if (cleanSearch) {
      const pattern = `%${escapeIlike(cleanSearch, 200)}%`;
      const searchCond = or(
        ilike(reservations.code, pattern),
        ilike(reservations.guestName, pattern),
        ilike(reservations.guestEmail, pattern),
        ilike(properties.title, pattern),
        ilike(properties.city, pattern)
      );
      if (searchCond) conditions.push(searchCond);
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRows, itemRows] = await Promise.all([
    whereClause
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(reservations)
          .innerJoin(properties, eq(reservations.propertyId, properties.id))
          .where(whereClause)
      : db.select({ count: sql<number>`count(*)::int` }).from(reservations),
    whereClause
      ? db
          .select({ reservation: reservations })
          .from(reservations)
          .innerJoin(properties, eq(reservations.propertyId, properties.id))
          .where(whereClause)
          .orderBy(desc(reservations.createdAt), desc(reservations.id))
          .limit(pageSize)
          .offset(offset)
      : db
          .select({ reservation: reservations })
          .from(reservations)
          .orderBy(desc(reservations.createdAt), desc(reservations.id))
          .limit(pageSize)
          .offset(offset),
  ]);

  return {
    items: itemRows.map((r) => mapReservationRow(r.reservation)),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
    counts,
    summary,
  };
}

function resolvePeriodCutoff(period: AdminDashboardPeriod): Date | null {
  const now = new Date();
  if (period === 'today') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  if (period === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

/**
 * Computes real-time Admin Dashboard KPIs from PostgreSQL using SQL aggregations,
 * scoped by period ('today' | '7d' | '30d' | 'all') for activity metrics.
 */
export async function getAdminDashboardStats(
  period: AdminDashboardPeriod = 'all'
): Promise<AdminDashboardStats> {
  const validPeriod = adminDashboardPeriodSchema.parse(period);
  await expireOverduePendingReservations();

  const cutoff = resolvePeriodCutoff(validPeriod);

  const [propRows, hostRows, userRows, resRows] = await Promise.all([
    db
      .select({
        totalProperties: sql<number>`count(*)::int`,
        publishedProperties: sql<number>`count(*) filter (where ${properties.status} = 'published')::int`,
        pendingProperties: sql<number>`count(*) filter (where ${properties.status} = 'pending_review')::int`,
        newProperties: cutoff
          ? sql<number>`count(*) filter (where ${properties.createdAt} >= ${cutoff})::int`
          : sql<number>`count(*)::int`,
      })
      .from(properties),
    db
      .select({
        activeHosts: sql<number>`count(*) filter (where ${hostProfiles.status} = 'approved')::int`,
        pendingHosts: sql<number>`count(*) filter (where ${hostProfiles.status} = 'pending')::int`,
      })
      .from(hostProfiles),
    db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        newUsers: cutoff
          ? sql<number>`count(*) filter (where ${users.createdAt} >= ${cutoff})::int`
          : sql<number>`count(*)::int`,
      })
      .from(users),
    cutoff
      ? db
          .select({
            totalReservations: sql<number>`count(*)::int`,
            confirmedReservations: sql<number>`count(*) filter (where ${reservations.status} in ('confirmed', 'completed'))::int`,
            pendingReservations: sql<number>`count(*) filter (where ${reservations.status} = 'pending')::int`,
            cancelledReservations: sql<number>`count(*) filter (where ${reservations.status} = 'cancelled')::int`,
            gmvCents: sql<string>`coalesce(sum(${reservations.totalAmount}) filter (where ${reservations.status} in ('confirmed', 'completed')), 0)::bigint`,
            commissionCents: sql<string>`coalesce(sum(${reservations.commissionAmount}) filter (where ${reservations.status} in ('confirmed', 'completed')), 0)::bigint`,
          })
          .from(reservations)
          .where(gte(reservations.createdAt, cutoff))
      : db
          .select({
            totalReservations: sql<number>`count(*)::int`,
            confirmedReservations: sql<number>`count(*) filter (where ${reservations.status} in ('confirmed', 'completed'))::int`,
            pendingReservations: sql<number>`count(*) filter (where ${reservations.status} = 'pending')::int`,
            cancelledReservations: sql<number>`count(*) filter (where ${reservations.status} = 'cancelled')::int`,
            gmvCents: sql<string>`coalesce(sum(${reservations.totalAmount}) filter (where ${reservations.status} in ('confirmed', 'completed')), 0)::bigint`,
            commissionCents: sql<string>`coalesce(sum(${reservations.commissionAmount}) filter (where ${reservations.status} in ('confirmed', 'completed')), 0)::bigint`,
          })
          .from(reservations),
  ]);

  const gmvCents = Number(resRows[0]?.gmvCents ?? 0);
  const commissionCents = Number(resRows[0]?.commissionCents ?? 0);

  return {
    period: validPeriod,
    publishedProperties: Number(propRows[0]?.publishedProperties ?? 0),
    totalProperties: Number(propRows[0]?.totalProperties ?? 0),
    pendingProperties: Number(propRows[0]?.pendingProperties ?? 0),
    activeHosts: Number(hostRows[0]?.activeHosts ?? 0),
    pendingHosts: Number(hostRows[0]?.pendingHosts ?? 0),
    totalUsers: Number(userRows[0]?.totalUsers ?? 0),
    totalReservations: Number(resRows[0]?.totalReservations ?? 0),
    confirmedReservations: Number(resRows[0]?.confirmedReservations ?? 0),
    pendingReservations: Number(resRows[0]?.pendingReservations ?? 0),
    cancelledReservations: Number(resRows[0]?.cancelledReservations ?? 0),
    newUsers: Number(userRows[0]?.newUsers ?? 0),
    newProperties: Number(propRows[0]?.newProperties ?? 0),
    gmvCents,
    commissionCents,
    estimatedGmvUSD: gmvCents / 100,
    netCommissionUSD: commissionCents / 100,
  };
}
