import './load-env';
import * as fs from 'node:fs';
import * as path from 'node:path';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db, pool } from './client';
import * as schema from './schema';
import { calculateBookingTotal, DEFAULT_EXCHANGE_RATES } from '../pricing';
import { getUtcOffsetDateString } from '../format';
import { BOOKING_RULES } from '../../content/booking-rules';

const repoRoot = path.resolve(__dirname, '../../..');
const SEED_DIR = path.resolve(repoRoot, 'docs/seed');

function readSeedJson<T>(filename: string): T {
  const filePath = path.join(SEED_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function getRelativeDateStr(offsetDays: number): string {
  return getUtcOffsetDateString(offsetDays);
}

const SEED_PASSWORDS: Record<string, string> = {
  'demo@example.com': 'demo1234',
  'admin@example.com': 'admin1234',
  'host@example.com': 'host1234',
  'host2@example.com': 'host1234',
  'applicant@example.com': 'applicant1234',
};

export async function runSeed() {
  console.log('--- Starting DB Seeder (Idempotent) ---');

  // 1. Users
  console.log('Seeding users...');
  const usersData = readSeedJson<
    Array<{
      id: number;
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      role: 'guest' | 'host' | 'admin';
    }>
  >('user.json');

  for (const u of usersData) {
    const rawPass = SEED_PASSWORDS[u.email] || 'password1234';
    const passwordHash = bcrypt.hashSync(rawPass, 10);

    await db
      .insert(schema.users)
      .values({
        id: u.id,
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: true,
      })
      .onConflictDoNothing({ target: schema.users.id });
  }

  // 2. Host Profiles
  console.log('Seeding host_profiles...');
  const hostData = readSeedJson<
    Array<{
      id: number;
      userId: number;
      displayName: string;
      slug: string;
      phone: string;
      website: string | null;
      cities: string | null;
      portfolioSize: number | null;
      bio: string | null;
      avatar: string | null;
      status: string;
      approvedAt: string | null;
    }>
  >('host.json');

  for (const h of hostData) {
    await db
      .insert(schema.hostProfiles)
      .values({
        id: h.id,
        userId: h.userId,
        displayName: h.displayName,
        slug: h.slug,
        phone: h.phone,
        website: h.website ?? null,
        cities: h.cities ?? null,
        portfolioSize: h.portfolioSize ?? null,
        bio: h.bio ?? null,
        avatar: h.avatar ?? null,
        status: h.status,
        approvedAt: h.approvedAt ? new Date(h.approvedAt) : null,
      })
      .onConflictDoNothing({ target: schema.hostProfiles.id });
  }

  // 3. Categories
  console.log('Seeding categories...');
  const categoryData = readSeedJson<
    Array<{
      id: number;
      name: string;
      slug: string;
      icon: string | null;
      description: string | null;
    }>
  >('category.json');

  for (let idx = 0; idx < categoryData.length; idx++) {
    const c = categoryData[idx];
    await db
      .insert(schema.categories)
      .values({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon ?? null,
        description: c.description ?? null,
        position: idx + 1,
      })
      .onConflictDoNothing({ target: schema.categories.id });
  }

  // 4. Locations
  console.log('Seeding locations...');
  const locationData = readSeedJson<
    Array<{
      id: number;
      city: string;
      name: string;
      slug: string;
      country: string;
      countryCode: string;
      continent: string | null;
      propertiesCount: number;
      description: string | null;
      image: string | null;
      center: [number, number];
    }>
  >('location.json');

  for (let idx = 0; idx < locationData.length; idx++) {
    const l = locationData[idx];
    await db
      .insert(schema.locations)
      .values({
        id: l.id,
        city: l.city,
        name: l.name,
        slug: l.slug,
        country: l.country,
        countryCode: l.countryCode,
        continent: l.continent ?? null,
        propertiesCount: l.propertiesCount ?? 0,
        description: l.description ?? null,
        image: l.image ?? null,
        center: l.center ?? [0, 0],
        isActive: true,
        position: idx + 1,
      })
      .onConflictDoNothing({ target: schema.locations.id });
  }

  // 5. Properties
  console.log('Seeding properties...');
  const propertyData = readSeedJson<
    Array<{
      id: number;
      reference: string;
      title: string;
      slug: string;
      pricePerMonth: number;
      currency?: string;
      locationId: number;
      city: string;
      country?: string | null;
      neighborhood?: string | null;
      address?: string | null;
      bedrooms?: number;
      bathrooms?: number;
      bedsCount?: number;
      totalSurface?: number | null;
      maxGuests?: number;
      kitchen?: boolean;
      laundry?: boolean;
      balcony?: boolean;
      petFriendly?: boolean;
      pool?: boolean;
      gym?: boolean;
      terrace?: boolean;
      workstation?: Record<string, unknown> | null;
      houseRules?: string | null;
      checkInStart?: string;
      checkOut?: string;
      minimumStayNights?: number;
      isFeatured?: boolean;
      isDirectBooking?: boolean;
      images?: string[];
      description?: string | null;
      hostId: number;
      status?: string;
    }>
  >('property.json');

  for (let idx = 0; idx < propertyData.length; idx++) {
    const p = propertyData[idx];
    const locByCity = locationData.find(
      (loc) => loc.id === p.locationId || loc.city.toLowerCase() === p.city.toLowerCase()
    );
    const resolvedLocationId = locByCity ? locByCity.id : p.locationId;

    await db
      .insert(schema.properties)
      .values({
        id: p.id,
        hostId: p.hostId,
        reference: p.reference,
        title: p.title,
        slug: p.slug,
        description: p.description ?? null,
        pricePerMonth: p.pricePerMonth,
        currency: p.currency ?? 'USD',
        locationId: resolvedLocationId,
        city: p.city,
        country: p.country ?? null,
        neighborhood: p.neighborhood ?? null,
        address: p.address ?? null,
        bedrooms: p.bedrooms ?? 1,
        bathrooms: p.bathrooms ?? 1,
        bedsCount: p.bedsCount ?? 1,
        totalSurface: p.totalSurface ?? null,
        maxGuests: p.maxGuests ?? 2,
        kitchen: p.kitchen ?? true,
        laundry: p.laundry ?? true,
        balcony: p.balcony ?? false,
        petFriendly: p.petFriendly ?? false,
        pool: p.pool ?? false,
        gym: p.gym ?? false,
        terrace: p.terrace ?? false,
        workstation: p.workstation ?? null,
        houseRules: p.houseRules ?? null,
        checkInStart: p.checkInStart ?? '15:00',
        checkOut: p.checkOut ?? '11:00',
        minimumStayNights: p.minimumStayNights ?? 30,
        isDirectBooking: p.isDirectBooking ?? false,
        images: p.images ?? [],
        featuredPosition: p.isFeatured ? idx + 1 : null,
        status: p.status ?? 'published',
      })
      .onConflictDoNothing({ target: schema.properties.id });
  }

  // 6. Workstation Packages, Components & Addons
  console.log('Seeding workstations...');
  const workstationData = readSeedJson<{
    packages: Array<{
      id: string;
      name: string;
      slug: string;
      pricePerMonth: number;
      isIncluded: boolean;
      description?: string;
      features?: string[];
    }>;
    components: Record<
      string,
      Array<{
        id: string;
        name: string;
        pricePerMonth: number;
        isIncluded: boolean;
        description?: string;
      }>
    >;
    addons: Array<{
      id: string;
      name: string;
      pricePerMonth: number;
      description?: string;
    }>;
  }>('workstation.json');

  for (let idx = 0; idx < workstationData.packages.length; idx++) {
    const pkg = workstationData.packages[idx];
    await db
      .insert(schema.workstationPackages)
      .values({
        slug: pkg.slug,
        name: pkg.name,
        description: pkg.description ?? null,
        monthlyPriceEUR: pkg.pricePerMonth ?? 0,
        isIncluded: pkg.isIncluded ?? false,
        features: pkg.features ?? [],
        isActive: true,
        position: idx + 1,
      })
      .onConflictDoNothing({ target: schema.workstationPackages.slug });
  }

  let compPos = 1;
  for (const [category, items] of Object.entries(workstationData.components)) {
    for (const item of items) {
      await db
        .insert(schema.workstationComponents)
        .values({
          componentId: item.id,
          name: item.name,
          category,
          monthlyPriceEUR: item.pricePerMonth ?? 0,
          options: [item],
          isActive: true,
          position: compPos++,
        })
        .onConflictDoNothing({ target: schema.workstationComponents.componentId });
    }
  }

  for (let idx = 0; idx < workstationData.addons.length; idx++) {
    const addon = workstationData.addons[idx];
    await db
      .insert(schema.workstationAddons)
      .values({
        addonId: addon.id,
        name: addon.name,
        category: 'addon',
        description: addon.description ?? null,
        monthlyPriceEUR: addon.pricePerMonth ?? 0,
        isActive: true,
        position: idx + 1,
      })
      .onConflictDoNothing({ target: schema.workstationAddons.addonId });
  }

  // 7. Travel Guides
  console.log('Seeding travel_guides...');
  const guideData = readSeedJson<
    Array<{
      id: number;
      title: string;
      slug: string;
      city: string;
      category?: string | null;
      publishDate?: string | null;
      featured?: boolean;
      image?: string | null;
      excerpt?: string | null;
      content?: string | null;
    }>
  >('travel_guide.json');

  for (let idx = 0; idx < guideData.length; idx++) {
    const g = guideData[idx];
    await db
      .insert(schema.travelGuides)
      .values({
        id: g.id,
        slug: g.slug,
        title: g.title,
        city: g.city,
        category: g.category ?? null,
        excerpt: g.excerpt ?? null,
        content: g.content ?? null,
        coverImage: g.image ?? null,
        isFeatured: g.featured ?? false,
        status: 'published',
        seoTitle: g.title,
        seoDescription: g.excerpt ?? null,
        position: idx + 1,
        createdAt: g.publishDate ? new Date(g.publishDate) : new Date(),
      })
      .onConflictDoNothing({ target: schema.travelGuides.id });
  }

  // 8. Blog Posts
  console.log('Seeding blog_posts...');
  const blogData = readSeedJson<
    Array<{
      id: number;
      title: string;
      slug: string;
      category?: string | null;
      readTime?: string | null;
      publishDate?: string | null;
      author?: string | null;
      image?: string | null;
      excerpt?: string | null;
      content?: string | null;
    }>
  >('blog_post.json');

  for (let idx = 0; idx < blogData.length; idx++) {
    const b = blogData[idx];
    await db
      .insert(schema.blogPosts)
      .values({
        id: b.id,
        slug: b.slug,
        title: b.title,
        excerpt: b.excerpt ?? null,
        content: b.content ?? null,
        coverImage: b.image ?? null,
        author: b.author ?? null,
        readTime: b.readTime ?? null,
        category: b.category ?? null,
        status: 'published',
        seoTitle: b.title,
        seoDescription: b.excerpt ?? null,
        position: idx + 1,
        createdAt: b.publishDate ? new Date(b.publishDate) : new Date(),
      })
      .onConflictDoNothing({ target: schema.blogPosts.id });
  }

  // 9. Community Videos
  console.log('Seeding community_videos...');
  const videoData = readSeedJson<
    Array<{
      id: number;
      platform?: string;
      url?: string;
      embedSrc?: string;
      aspect?: number;
      authorName?: string;
      avatar?: string;
    }>
  >('video.json');

  for (let idx = 0; idx < videoData.length; idx++) {
    const v = videoData[idx];
    await db
      .insert(schema.communityVideos)
      .values({
        id: v.id,
        title: v.authorName ? `Reel by ${v.authorName}` : 'Community Reel',
        author: v.authorName ?? null,
        platform: v.platform ?? 'instagram',
        videoUrl: v.url ?? null,
        embedUrl: v.embedSrc ?? null,
        thumbnailUrl: v.avatar ?? null,
        aspect: v.aspect != null ? String(v.aspect) : null,
        isActive: true,
        position: idx + 1,
      })
      .onConflictDoNothing({ target: schema.communityVideos.id });
  }

  // 10. Settings (Currency Rates D18, D20)
  console.log('Seeding settings (currency_rates)...');
  await db
    .insert(schema.settings)
    .values({
      key: 'currency_rates',
      value: DEFAULT_EXCHANGE_RATES,
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: schema.settings.key });

  // 11. Reservations
  console.log('Seeding reservations (ND-SEED1..6)...');
  const now = new Date();

  // ND-SEED1
  const calc1 = calculateBookingTotal(308100, 30, 0);
  const res1 = {
    id: 1,
    code: 'ND-SEED1',
    userId: 1,
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
    respondBy: new Date(now.getTime() + 24 * 3600 * 1000),
    paymentStatus: 'authorized',
    paymentRef: 'mock_txn_seed_001',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
  };

  // ND-SEED2
  const calc2 = calculateBookingTotal(235000, 30, 0);
  const res2 = {
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
    respondBy: null,
    paymentStatus: 'captured',
    paymentRef: 'mock_txn_seed_002',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
  };

  // ND-SEED3
  const calc3 = calculateBookingTotal(120000, 30, 0);
  const res3 = {
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
    workstationConfig: null,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    guestPhone: null,
    status: 'rejected',
    rejectionReason: 'Property undergoing scheduled maintenance during requested period.',
    respondBy: null,
    paymentStatus: 'voided',
    paymentRef: 'mock_txn_seed_003',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
  };

  // ND-SEED4
  const calc4 = calculateBookingTotal(145000, 30, 0);
  const res4 = {
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
    workstationConfig: null,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    guestPhone: null,
    status: 'expired',
    respondBy: null,
    paymentStatus: 'voided',
    paymentRef: 'mock_txn_seed_004',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
  };

  // ND-SEED5
  const calc5 = calculateBookingTotal(280000, 30, 0);
  const res5 = {
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
    workstationConfig: null,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    guestPhone: null,
    status: 'cancelled',
    cancelledBy: 'guest',
    respondBy: null,
    paymentStatus: 'refunded',
    paymentRef: 'mock_txn_seed_005',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
  };

  // ND-SEED6
  const calc6 = calculateBookingTotal(260000, 30, 0);
  const res6 = {
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
    workstationConfig: null,
    guestName: 'Demo User',
    guestEmail: 'demo@example.com',
    guestPhone: null,
    status: 'completed',
    respondBy: null,
    paymentStatus: 'captured',
    paymentRef: 'mock_txn_seed_006',
    commissionRate: BOOKING_RULES.commissionPercent,
    respondHours: BOOKING_RULES.respondHours,
    freeCancelDays: BOOKING_RULES.freeCancelDays,
  };

  const seedReservations = [res1, res2, res3, res4, res5, res6];
  for (const r of seedReservations) {
    await db
      .insert(schema.reservations)
      .values(r)
      .onConflictDoNothing({ target: schema.reservations.id });
  }

  // 12. Blocked Dates
  console.log('Seeding blocked_dates...');
  const blockedList = [
    {
      id: 1,
      propertyId: 16061,
      startDate: getRelativeDateStr(55),
      endDate: getRelativeDateStr(60),
      reason: 'Maintenance',
    },
    {
      id: 2,
      propertyId: 17002,
      startDate: getRelativeDateStr(10),
      endDate: getRelativeDateStr(20),
      reason: 'Owner use',
    },
  ];

  for (const b of blockedList) {
    await db
      .insert(schema.blockedDates)
      .values(b)
      .onConflictDoNothing({ target: schema.blockedDates.id });
  }

  // 13. Sequence setval for all serial columns
  console.log('Resetting Postgres sequences to max(id)...');
  await db.execute(sql`
    DO $$
    DECLARE
      seq text;
      tbl text;
      max_id bigint;
      tables text[] := ARRAY[
        'users', 'host_profiles', 'categories', 'locations', 'properties',
        'workstation_packages', 'workstation_components', 'workstation_addons',
        'travel_guides', 'blog_posts', 'community_videos',
        'reservations', 'blocked_dates', 'favorites', 'media'
      ];
    BEGIN
      FOREACH tbl IN ARRAY tables
      LOOP
        seq := pg_get_serial_sequence(tbl, 'id');
        IF seq IS NOT NULL THEN
          EXECUTE format('SELECT max(id) FROM %I', tbl) INTO max_id;
          IF max_id IS NULL THEN
            PERFORM setval(seq, 1, false);
          ELSE
            PERFORM setval(seq, max_id, true);
          END IF;
        END IF;
      END LOOP;
    END $$;
  `);

  console.log('--- DB Seeder Completed Successfully ---');
}

// Auto-run if executed directly
async function main() {
  try {
    await runSeed();
  } catch (err) {
    console.error('Seed script failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module || process.argv[1]?.endsWith('seed.ts')) {
  void main();
}
