import { describe, it, expect, beforeEach } from 'vitest';
import {
  listReservations,
  getReservationByCode,
  createReservation,
  updateReservationStatus,
  listBlockedDates,
  addBlockedDate,
  deleteBlockedDate,
} from './reservations';
import { resetMockData } from './mock/seed-data';
import { switchRole, getCurrentUser } from '@/lib/auth/session';

describe('Reservations & Availability Mock API Layer', () => {
  beforeEach(() => {
    resetMockData();
  });

  it('lists seed reservations (ND-SEED1 to ND-SEED6)', async () => {
    const list = await listReservations();
    expect(list.length).toBeGreaterThanOrEqual(6);
    const codes = list.map((r) => r.code);
    expect(codes).toContain('ND-SEED1');
    expect(codes).toContain('ND-SEED2');
  });

  it('filters reservations by status and user', async () => {
    const pendingList = await listReservations({ status: 'pending' });
    expect(pendingList.some((r) => r.code === 'ND-SEED1')).toBe(true);

    const demoUserReservations = await listReservations({ userId: 1 });
    expect(demoUserReservations.length).toBeGreaterThanOrEqual(6);
  });

  it('creates an instant booking reservation (property 16061)', async () => {
    // 16061 is instant book (isDirectBooking = true)
    // Pick dates far in future to avoid seed collisions (T+200 to T+230)
    const d = new Date();
    d.setDate(d.getDate() + 200);
    const moveInDate = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() + 30);
    const moveOutDate = d.toISOString().slice(0, 10);

    const res = await createReservation({
      propertyId: 16061,
      moveInDate,
      moveOutDate,
      guestName: 'Alex Traveler',
      guestEmail: 'alex@example.com',
      userId: 1,
    });

    expect(res.code).toMatch(/^ND-\d{5}$/);
    expect(res.status).toBe('confirmed');
    expect(res.paymentStatus).toBe('captured');
    expect(res.nights).toBe(30);
    expect(res.rentAmount).toBe(285000);
    expect(res.totalAmount).toBe(285000);
    expect(res.commissionAmount).toBe(28500);
    expect(res.hostPayout).toBe(256500);
  });

  it('creates a request-to-book reservation (property 16060)', async () => {
    // 16060 is request-to-book (isDirectBooking = false)
    const d = new Date();
    d.setDate(d.getDate() + 200);
    const moveInDate = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() + 30);
    const moveOutDate = d.toISOString().slice(0, 10);

    const res = await createReservation({
      propertyId: 16060,
      moveInDate,
      moveOutDate,
      guestName: 'Request Nomad',
      guestEmail: 'nomad@example.com',
      workstationMonthlyEUR: 15000, // Pro upgrade €150/mo
    });

    expect(res.status).toBe('pending');
    expect(res.paymentStatus).toBe('authorized');
    expect(res.respondBy).not.toBeNull();
    // Rent: 1,200,000 + Workstation USD: 16,200 = 1,216,200 cents
    expect(res.rentAmount).toBe(1200000);
    expect(res.workstationFee).toBe(16200);
    expect(res.totalAmount).toBe(1216200);
    expect(res.commissionAmount).toBe(120000);
    expect(res.hostPayout).toBe(1080000);
  });

  it('rejects reservation shorter than minimum stay (30 nights)', async () => {
    const d = new Date();
    d.setDate(d.getDate() + 200);
    const moveInDate = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() + 15); // 15 nights
    const moveOutDate = d.toISOString().slice(0, 10);

    await expect(
      createReservation({
        propertyId: 16061,
        moveInDate,
        moveOutDate,
        guestName: 'Short Stay',
        guestEmail: 'short@example.com',
      })
    ).rejects.toThrow(/Minimum stay/);
  });

  it('rejects reservation overlapping blocked dates (property 16061 has T+55..T+60 blocked)', async () => {
    const d = new Date();
    d.setDate(d.getDate() + 50);
    const moveInDate = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() + 30); // T+80 -> overlaps T+55..T+60
    const moveOutDate = d.toISOString().slice(0, 10);

    await expect(
      createReservation({
        propertyId: 16061,
        moveInDate,
        moveOutDate,
        guestName: 'Overlap Stay',
        guestEmail: 'overlap@example.com',
      })
    ).rejects.toThrow(/blocked by host/);
  });

  it('updates reservation status lifecycle (accept, cancel, reject)', async () => {
    const seed1 = await getReservationByCode('ND-SEED1');
    expect(seed1).not.toBeNull();

    // Host accepts pending reservation
    const accepted = await updateReservationStatus(seed1!.id, 'confirmed');
    expect(accepted.status).toBe('confirmed');
    expect(accepted.paymentStatus).toBe('captured');

    // Guest cancels reservation
    const cancelled = await updateReservationStatus(seed1!.id, 'cancelled', undefined, 'guest');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelledBy).toBe('guest');
    expect(cancelled.paymentStatus).toBe('refunded');
  });

  it('manages blocked dates (list, add, delete)', async () => {
    const initBlocked = await listBlockedDates(16061);
    expect(initBlocked).toHaveLength(1);

    const d = new Date();
    d.setDate(d.getDate() + 300);
    const startDate = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() + 5);
    const endDate = d.toISOString().slice(0, 10);

    const created = await addBlockedDate({
      propertyId: 16061,
      startDate,
      endDate,
      reason: 'Deep Cleaning',
    });
    expect(created.id).toBeGreaterThan(2);

    const afterAdd = await listBlockedDates(16061);
    expect(afterAdd).toHaveLength(2);

    const deleted = await deleteBlockedDate(created.id);
    expect(deleted).toBe(true);

    const afterDel = await listBlockedDates(16061);
    expect(afterDel).toHaveLength(1);
  });

  it('rejects blocking dates that overlap existing pending or confirmed reservation (AC-HOST-6)', async () => {
    // 16060 has pending booking ND-SEED1 at T+40..T+70
    const d = new Date();
    d.setDate(d.getDate() + 45);
    const startDate = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() + 10);
    const endDate = d.toISOString().slice(0, 10);

    await expect(
      addBlockedDate({
        propertyId: 16060,
        startDate,
        endDate,
        reason: 'Maintenance',
      })
    ).rejects.toThrow('These dates overlap an existing booking');
  });

  it('switches user session roles cleanly', async () => {
    const guestUser = await switchRole('guest');
    expect(guestUser.role).toBe('guest');
    expect(guestUser.email).toBe('demo@example.com');

    const hostUser = await switchRole('host');
    expect(hostUser.role).toBe('host');
    expect(hostUser.email).toBe('host@example.com');

    const adminUser = await switchRole('admin');
    expect(adminUser.role).toBe('admin');
    expect(adminUser.email).toBe('admin@example.com');

    const curr = await getCurrentUser();
    expect(curr.id).toBe(adminUser.id);
  });
});
