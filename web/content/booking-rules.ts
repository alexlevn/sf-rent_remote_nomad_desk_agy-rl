/**
 * Booking business policy constants.
 * Snapshot stored in every reservation at creation time.
 */
export const BOOKING_RULES = {
  // Platform commission fee on apartment rent
  commissionRate: 0.1,
  commissionPercent: 10,

  // Host response deadline for 'Request to book' reservations
  respondHours: 48,

  // Free cancellation policy deadline (days before move-in date)
  freeCancelDays: 14,

  // Minimum stay requirement across all properties
  minimumStayNights: 30,
} as const;
