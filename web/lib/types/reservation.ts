import type { WorkstationSelection } from './workstation';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'completed';

export type PaymentStatus = 'authorized' | 'captured' | 'voided' | 'refunded';

export interface Reservation {
  id: number;
  code: string;
  userId: number;
  propertyId: number;
  moveInDate: string; // YYYY-MM-DD
  moveOutDate: string; // YYYY-MM-DD
  nights: number;
  monthlyRent: number; // USD cents
  rentAmount: number; // USD cents
  workstationFee: number; // USD cents
  totalAmount: number; // USD cents
  commissionAmount: number; // USD cents
  hostPayout: number; // USD cents
  workstationConfig?: WorkstationSelection | null;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  status: ReservationStatus;
  respondBy?: string | null;
  rejectionReason?: string | null;
  cancelledBy?: 'guest' | 'host' | 'admin' | null;
  paymentStatus: PaymentStatus;
  paymentRef: string;
  commissionRate?: number;
  respondHours?: number;
  freeCancelDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlockedDate {
  id: number;
  propertyId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (exclusive)
  reason?: string;
  createdAt?: string;
}

export interface CreateReservationInput {
  propertyId: number;
  moveInDate: string;
  moveOutDate: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  userId?: number;
  workstationMonthlyEUR?: number;
  workstationConfig?: WorkstationSelection;
}

export interface ReservationFilters {
  userId?: number;
  hostId?: number;
  status?: ReservationStatus | 'all';
  propertyId?: number;
}
