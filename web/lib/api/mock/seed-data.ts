import type {
  Property,
  Location,
  HostProfile,
  WorkstationData,
  User,
  TravelGuide,
  BlogPost,
  CommunityVideo,
  Category,
  Reservation,
  BlockedDate,
  ExchangeRates,
} from '@/lib/types';
import { calculateBookingTotal, DEFAULT_EXCHANGE_RATES } from '@/lib/pricing';
import { BOOKING_RULES } from '@/content/booking-rules';

// Import raw seed JSON files
import propertySeed from './data/property.json';
import locationSeed from './data/location.json';
import hostSeed from './data/host.json';
import workstationSeed from './data/workstation.json';
import userSeed from './data/user.json';
import travelGuideSeed from './data/travel_guide.json';
import blogPostSeed from './data/blog_post.json';
import videoSeed from './data/video.json';
import categorySeed from './data/category.json';

export interface MockDataStore {
  properties: Property[];
  locations: Location[];
  hosts: HostProfile[];
  workstations: WorkstationData;
  users: User[];
  guides: TravelGuide[];
  blogPosts: BlogPost[];
  videos: CommunityVideo[];
  categories: Category[];
  reservations: Reservation[];
  blockedDates: BlockedDate[];
  rates: ExchangeRates;
}

/**
 * Returns YYYY-MM-DD formatted date offset from current date (T = today).
 */
function getRelativeDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Creates fresh initial reservations snapshot
 */
function createInitialReservations(): Reservation[] {
  const now = new Date();

  // Reservation 1: ND-SEED1 (16060 Request, pending)
  const calc1 = calculateBookingTotal(308100, 30, 0);
  const res1: Reservation = {
    id: 1,
    code: 'ND-SEED1',
    userId: 1, // demo user
    propertyId: 16060,
    moveInDate: getRelativeDateStr(40),
    moveOutDate: getRelativeDateStr(70),
    nights: 30,
    monthlyRent: 308100,
    rentAmount: calc1.rentAmountUSD,
    workstationFee: calc1.workstationFeeUSD,
    totalAmount: calc1.totalAmountUSD,
    commissionAmount: calc1.commissionAmountUSD,
    hostPayout: calc1.hostPayoutUSD,
    workstationConfig: null,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    guestPhone: '+1 555 0100',
    status: 'pending',
    respondBy: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
    paymentStatus: 'authorized',
    paymentRef: 'mock_txn_seed_001',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
    createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
  };

  // Reservation 2: ND-SEED2 (16061 Instant, confirmed)
  const calc2 = calculateBookingTotal(235000, 30, 0);
  const res2: Reservation = {
    id: 2,
    code: 'ND-SEED2',
    userId: 1,
    propertyId: 16061,
    moveInDate: getRelativeDateStr(20),
    moveOutDate: getRelativeDateStr(50),
    nights: 30,
    monthlyRent: 235000,
    rentAmount: calc2.rentAmountUSD,
    workstationFee: calc2.workstationFeeUSD,
    totalAmount: calc2.totalAmountUSD,
    commissionAmount: calc2.commissionAmountUSD,
    hostPayout: calc2.hostPayoutUSD,
    workstationConfig: null,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    guestPhone: '+1 555 0100',
    status: 'confirmed',
    paymentStatus: 'captured',
    paymentRef: 'mock_txn_seed_002',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
    createdAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
  };

  // Reservation 3: ND-SEED3 (17001 Palermo, rejected)
  const calc3 = calculateBookingTotal(120000, 30, 0);
  const res3: Reservation = {
    id: 3,
    code: 'ND-SEED3',
    userId: 1,
    propertyId: 17001,
    moveInDate: getRelativeDateStr(60),
    moveOutDate: getRelativeDateStr(90),
    nights: 30,
    monthlyRent: 120000,
    rentAmount: calc3.rentAmountUSD,
    workstationFee: calc3.workstationFeeUSD,
    totalAmount: calc3.totalAmountUSD,
    commissionAmount: calc3.commissionAmountUSD,
    hostPayout: calc3.hostPayoutUSD,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    status: 'rejected',
    rejectionReason: 'Property undergoing scheduled maintenance during requested period.',
    paymentStatus: 'voided',
    paymentRef: 'mock_txn_seed_003',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
    createdAt: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000).toISOString(),
  };

  // Reservation 4: ND-SEED4 (18001 Miraflores, expired)
  const calc4 = calculateBookingTotal(145000, 30, 0);
  const res4: Reservation = {
    id: 4,
    code: 'ND-SEED4',
    userId: 1,
    propertyId: 18001,
    moveInDate: getRelativeDateStr(30),
    moveOutDate: getRelativeDateStr(60),
    nights: 30,
    monthlyRent: 145000,
    rentAmount: calc4.rentAmountUSD,
    workstationFee: calc4.workstationFeeUSD,
    totalAmount: calc4.totalAmountUSD,
    commissionAmount: calc4.commissionAmountUSD,
    hostPayout: calc4.hostPayoutUSD,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    status: 'expired',
    paymentStatus: 'voided',
    paymentRef: 'mock_txn_seed_004',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
    createdAt: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
  };

  // Reservation 5: ND-SEED5 (19001 Eixample, cancelled)
  const calc5 = calculateBookingTotal(280000, 30, 0);
  const res5: Reservation = {
    id: 5,
    code: 'ND-SEED5',
    userId: 1,
    propertyId: 19001,
    moveInDate: getRelativeDateStr(100),
    moveOutDate: getRelativeDateStr(130),
    nights: 30,
    monthlyRent: 280000,
    rentAmount: calc5.rentAmountUSD,
    workstationFee: calc5.workstationFeeUSD,
    totalAmount: calc5.totalAmountUSD,
    commissionAmount: calc5.commissionAmountUSD,
    hostPayout: calc5.hostPayoutUSD,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    status: 'cancelled',
    cancelledBy: 'guest',
    paymentStatus: 'refunded',
    paymentRef: 'mock_txn_seed_005',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
    createdAt: new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 8 * 24 * 3600 * 1000).toISOString(),
  };

  // Reservation 6: ND-SEED6 (19002 Gràcia, completed past booking)
  const calc6 = calculateBookingTotal(260000, 30, 0);
  const res6: Reservation = {
    id: 6,
    code: 'ND-SEED6',
    userId: 1,
    propertyId: 19002,
    moveInDate: getRelativeDateStr(-60),
    moveOutDate: getRelativeDateStr(-30),
    nights: 30,
    monthlyRent: 260000,
    rentAmount: calc6.rentAmountUSD,
    workstationFee: calc6.workstationFeeUSD,
    totalAmount: calc6.totalAmountUSD,
    commissionAmount: calc6.commissionAmountUSD,
    hostPayout: calc6.hostPayoutUSD,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    status: 'completed',
    paymentStatus: 'captured',
    paymentRef: 'mock_txn_seed_006',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
    createdAt: new Date(now.getTime() - 75 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString(),
  };

  return [res1, res2, res3, res4, res5, res6];
}

/**
 * Creates fresh initial blocked dates snapshot
 */
function createInitialBlockedDates(): BlockedDate[] {
  return [
    {
      id: 1,
      propertyId: 16061,
      startDate: getRelativeDateStr(55),
      endDate: getRelativeDateStr(60),
      reason: 'Maintenance',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      propertyId: 17002,
      startDate: getRelativeDateStr(10),
      endDate: getRelativeDateStr(20),
      reason: 'Owner use',
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Generates fresh initial state cloning all 9 seed data files.
 */
function createFreshStore(): MockDataStore {
  return {
    properties: JSON.parse(JSON.stringify(propertySeed)) as Property[],
    locations: JSON.parse(JSON.stringify(locationSeed)) as Location[],
    hosts: JSON.parse(JSON.stringify(hostSeed)) as HostProfile[],
    workstations: JSON.parse(JSON.stringify(workstationSeed)) as WorkstationData,
    users: JSON.parse(JSON.stringify(userSeed)) as User[],
    guides: JSON.parse(JSON.stringify(travelGuideSeed)) as TravelGuide[],
    blogPosts: JSON.parse(JSON.stringify(blogPostSeed)) as BlogPost[],
    videos: JSON.parse(JSON.stringify(videoSeed)) as CommunityVideo[],
    categories: JSON.parse(JSON.stringify(categorySeed)) as Category[],
    reservations: createInitialReservations(),
    blockedDates: createInitialBlockedDates(),
    rates: { ...DEFAULT_EXCHANGE_RATES },
  };
}

// Global persistence across Next.js dev server reloads
const globalForMock = globalThis as unknown as {
  __nomaddeskMockStore?: MockDataStore;
};

/**
 * Retrieves the singleton in-memory mock store.
 */
export function getMockStore(): MockDataStore {
  if (!globalForMock.__nomaddeskMockStore) {
    globalForMock.__nomaddeskMockStore = createFreshStore();
  }
  return globalForMock.__nomaddeskMockStore;
}

/**
 * Resets the in-memory store back to initial pristine snapshot (for E2E tests).
 */
export function resetMockData(): MockDataStore {
  globalForMock.__nomaddeskMockStore = createFreshStore();
  return globalForMock.__nomaddeskMockStore;
}
