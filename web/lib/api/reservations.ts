import type {
  BlockedDate,
  CreateReservationInput,
  Reservation,
  ReservationFilters,
  ReservationStatus,
} from '@/lib/types';
import { calculateBookingTotal } from '@/lib/pricing';
import { BOOKING_RULES } from '@/content/booking-rules';
import { getMockStore } from './mock/seed-data';

/**
 * Checks if two date intervals [startA, endA) and [startB, endB) overlap.
 */
function datesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

/**
 * Calculates number of nights between two YYYY-MM-DD date strings.
 */
function calculateNights(moveInDate: string, moveOutDate: string): number {
  const dIn = new Date(moveInDate);
  const dOut = new Date(moveOutDate);
  const diffMs = dOut.getTime() - dIn.getTime();
  return Math.round(diffMs / (1000 * 3600 * 24));
}

/**
 * Lists reservations matching given filters.
 */
export async function listReservations(
  filters?: ReservationFilters
): Promise<Reservation[]> {
  const store = getMockStore();
  let result = [...store.reservations];

  if (filters?.userId != null) {
    result = result.filter((r) => r.userId === filters.userId);
  }

  if (filters?.hostId != null) {
    const hostPropertyIds = new Set(
      store.properties.filter((p) => p.hostId === filters.hostId).map((p) => p.id)
    );
    result = result.filter((r) => hostPropertyIds.has(r.propertyId));
  }

  if (filters?.propertyId != null) {
    result = result.filter((r) => r.propertyId === filters.propertyId);
  }

  if (filters?.status && filters.status !== 'all') {
    result = result.filter((r) => r.status === filters.status);
  }

  // Sort descending by creation date
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return result.map((r) => ({ ...r }));
}

/**
 * Retrieves a reservation by unique booking code (e.g. 'ND-SEED1').
 */
export async function getReservationByCode(code: string): Promise<Reservation | null> {
  const store = getMockStore();
  const res = store.reservations.find((r) => r.code.toUpperCase() === code.toUpperCase());
  return res ? { ...res } : null;
}

/**
 * Retrieves a reservation by ID.
 */
export async function getReservationById(id: number): Promise<Reservation | null> {
  const store = getMockStore();
  const res = store.reservations.find((r) => r.id === id);
  return res ? { ...res } : null;
}

/**
 * Creates a new reservation with instant booking or request-to-book workflow.
 */
export async function createReservation(
  data: CreateReservationInput
): Promise<Reservation> {
  const store = getMockStore();
  const property = store.properties.find((p) => p.id === data.propertyId);
  if (!property) {
    throw new Error(`Property ${data.propertyId} not found`);
  }

  // Validate minimum stay requirement
  const nights = calculateNights(data.moveInDate, data.moveOutDate);
  const minStay = property.minimumStayNights || BOOKING_RULES.minimumStayNights;
  if (nights < minStay) {
    throw new Error(`Minimum stay requirement is ${minStay} nights (requested ${nights} nights)`);
  }

  // Availability collision check: blocked dates
  const isBlocked = store.blockedDates.some(
    (b) =>
      b.propertyId === property.id &&
      datesOverlap(b.startDate, b.endDate, data.moveInDate, data.moveOutDate)
  );
  if (isBlocked) {
    throw new Error('Selected dates are blocked by host and unavailable for booking');
  }

  // Availability collision check: active reservations (pending or confirmed)
  const isConflict = store.reservations.some(
    (r) =>
      r.propertyId === property.id &&
      (r.status === 'pending' || r.status === 'confirmed') &&
      datesOverlap(r.moveInDate, r.moveOutDate, data.moveInDate, data.moveOutDate)
  );
  if (isConflict) {
    throw new Error('Selected dates are already booked by another reservation');
  }

  // Calculate pricing
  const pricing = calculateBookingTotal(
    property.pricePerMonth,
    nights,
    data.workstationMonthlyEUR || 0,
    store.rates
  );

  const now = new Date();
  const maxId = store.reservations.reduce((max, r) => Math.max(max, r.id), 0);
  const newId = maxId + 1;
  const bookingCode = `ND-${Math.floor(10000 + Math.random() * 90000)}`;

  // Instant booking vs Request-to-book (D12, D13)
  const isInstant = property.isDirectBooking;
  const initialStatus: ReservationStatus = isInstant ? 'confirmed' : 'pending';
  const initialPaymentStatus = isInstant ? 'captured' : 'authorized';
  const respondBy = isInstant
    ? null
    : new Date(now.getTime() + BOOKING_RULES.respondHours * 3600 * 1000).toISOString();

  const newReservation: Reservation = {
    id: newId,
    code: bookingCode,
    userId: data.userId || 1, // Default to guest demo user if not logged in
    propertyId: property.id,
    moveInDate: data.moveInDate,
    moveOutDate: data.moveOutDate,
    nights,
    monthlyRent: property.pricePerMonth,
    rentAmount: pricing.rentAmountUSD,
    workstationFee: pricing.workstationFeeUSD,
    totalAmount: pricing.totalAmountUSD,
    commissionAmount: pricing.commissionAmountUSD,
    hostPayout: pricing.hostPayoutUSD,
    workstationConfig: data.workstationConfig || null,
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone || '',
    status: initialStatus,
    respondBy,
    paymentStatus: initialPaymentStatus,
    paymentRef: `mock_txn_${Date.now()}`,
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  store.reservations.unshift(newReservation);
  return { ...newReservation };
}

/**
 * Updates reservation lifecycle status (Accept/Reject by host, Cancel by guest/admin).
 */
export async function updateReservationStatus(
  id: number,
  status: ReservationStatus,
  reason?: string,
  cancelledBy?: 'guest' | 'host' | 'admin'
): Promise<Reservation> {
  const store = getMockStore();
  const index = store.reservations.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error(`Reservation ${id} not found`);
  }

  const existing = store.reservations[index];
  const now = new Date().toISOString();

  let paymentStatus = existing.paymentStatus;
  if (status === 'confirmed') paymentStatus = 'captured';
  if (status === 'cancelled') paymentStatus = 'refunded';
  if (status === 'rejected' || status === 'expired') paymentStatus = 'voided';
  if (status === 'completed') paymentStatus = 'captured';

  const updated: Reservation = {
    ...existing,
    status,
    paymentStatus,
    rejectionReason: reason || existing.rejectionReason,
    cancelledBy: cancelledBy || existing.cancelledBy,
    updatedAt: now,
  };

  store.reservations[index] = updated;
  return { ...updated };
}

/**
 * Lists blocked dates for a specific property.
 */
export async function listBlockedDates(propertyId: number): Promise<BlockedDate[]> {
  const store = getMockStore();
  return store.blockedDates
    .filter((b) => b.propertyId === propertyId)
    .map((b) => ({ ...b }));
}

/**
 * Adds a new blocked date period for a property.
 */
export async function addBlockedDate(data: {
  propertyId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<BlockedDate> {
  const store = getMockStore();
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    throw new Error('End date must be after start date');
  }

  // Prevent overlapping blocked ranges for the same property
  const collision = store.blockedDates.some(
    (b) =>
      b.propertyId === data.propertyId &&
      datesOverlap(b.startDate, b.endDate, data.startDate, data.endDate)
  );
  if (collision) {
    throw new Error('This blocked period overlaps with an existing blocked date range');
  }

  const maxId = store.blockedDates.reduce((max, b) => Math.max(max, b.id), 0);
  const newBlocked: BlockedDate = {
    id: maxId + 1,
    propertyId: data.propertyId,
    startDate: data.startDate,
    endDate: data.endDate,
    reason: data.reason || 'Owner Block',
    createdAt: new Date().toISOString(),
  };

  store.blockedDates.push(newBlocked);
  return { ...newBlocked };
}

/**
 * Deletes a blocked date entry.
 */
export async function deleteBlockedDate(id: number): Promise<boolean> {
  const store = getMockStore();
  const initLen = store.blockedDates.length;
  store.blockedDates = store.blockedDates.filter((b) => b.id !== id);
  return store.blockedDates.length < initLen;
}
