import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 20 }).default('guest').notNull(), // 'guest' | 'host' | 'admin'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Host Profiles
export const hostProfiles = pgTable('host_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 150 }).unique(),
  phone: varchar('phone', { length: 50 }).notNull(),
  website: varchar('website', { length: 255 }),
  cities: text('cities'),
  portfolioSize: integer('portfolio_size'),
  bio: text('bio'),
  avatar: varchar('avatar', { length: 255 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending' | 'approved' | 'rejected' | 'suspended'
  rejectionReason: text('rejection_reason'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Locations
export const locations = pgTable('locations', {
  id: integer('id').primaryKey(),
  city: varchar('city', { length: 100 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 150 }).unique(),
  country: varchar('country', { length: 100 }).notNull(),
  countryCode: varchar('country_code', { length: 10 }).notNull(),
  continent: varchar('continent', { length: 50 }),
  propertiesCount: integer('properties_count').default(0).notNull(),
  description: text('description'),
  image: varchar('image', { length: 255 }),
  center: jsonb('center').$type<[number, number]>(),
  isActive: boolean('is_active').default(true).notNull(),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Categories
export const categories = pgTable('categories', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique(),
  icon: varchar('icon', { length: 100 }),
  description: text('description'),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Properties
export const properties = pgTable('properties', {
  id: integer('id').primaryKey(),
  hostId: integer('host_id').references(() => hostProfiles.id),
  reference: varchar('reference', { length: 50 }).unique(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  description: text('description'),
  pricePerMonth: integer('price_per_month').notNull(), // in USD cents
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  locationId: integer('location_id').references(() => locations.id),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }),
  neighborhood: varchar('neighborhood', { length: 150 }),
  address: varchar('address', { length: 255 }),
  bedrooms: integer('bedrooms').default(1).notNull(),
  bathrooms: integer('bathrooms').default(1).notNull(),
  bedsCount: integer('beds_count').default(1).notNull(),
  totalSurface: integer('total_surface'),
  maxGuests: integer('max_guests').default(2).notNull(),
  kitchen: boolean('kitchen').default(true).notNull(),
  laundry: boolean('laundry').default(true).notNull(),
  balcony: boolean('balcony').default(false).notNull(),
  petFriendly: boolean('pet_friendly').default(false).notNull(),
  pool: boolean('pool').default(false).notNull(),
  gym: boolean('gym').default(false).notNull(),
  terrace: boolean('terrace').default(false).notNull(),
  workstation: jsonb('workstation').$type<Record<string, unknown>>(),
  houseRules: text('house_rules'),
  checkInStart: varchar('check_in_start', { length: 20 }).default('15:00').notNull(),
  checkOut: varchar('check_out', { length: 20 }).default('11:00').notNull(),
  minimumStayNights: integer('minimum_stay_nights').default(30).notNull(),
  isDirectBooking: boolean('is_direct_booking').default(false).notNull(),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  featuredPosition: integer('featured_position'),
  status: varchar('status', { length: 20 }).default('draft').notNull(), // 'draft'|'pending_review'|'published'|'rejected'|'hidden'
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Blocked Dates
export const blockedDates = pgTable('blocked_dates', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: varchar('reason', { length: 150 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Reservations
export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  propertyId: integer('property_id')
    .notNull()
    .references(() => properties.id),
  moveInDate: date('move_in_date').notNull(),
  moveOutDate: date('move_out_date').notNull(),
  nights: integer('nights').notNull(),
  monthlyRent: integer('monthly_rent').notNull(), // cents
  rentAmount: integer('rent_amount').notNull(), // cents
  workstationFee: integer('workstation_fee').default(0).notNull(), // cents
  totalAmount: integer('total_amount').notNull(), // cents
  commissionAmount: integer('commission_amount').notNull(), // cents
  hostPayout: integer('host_payout').notNull(), // cents
  workstationConfig: jsonb('workstation_config').$type<Record<string, unknown>>(),
  guestName: varchar('guest_name', { length: 150 }).notNull(),
  guestEmail: varchar('guest_email', { length: 150 }).notNull(),
  guestPhone: varchar('guest_phone', { length: 50 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending'|'confirmed'|'rejected'|'expired'|'cancelled'|'completed'
  respondBy: timestamp('respond_by', { withTimezone: true }),
  rejectionReason: varchar('rejection_reason', { length: 255 }),
  cancelledBy: varchar('cancelled_by', { length: 20 }),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull(), // 'authorized'|'captured'|'voided'|'refunded'
  paymentRef: varchar('payment_ref', { length: 100 }),
  commissionRate: integer('commission_rate'),
  respondHours: integer('respond_hours'),
  freeCancelDays: integer('free_cancel_days'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Favorites
export const favorites = pgTable(
  'favorites',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    propertyId: integer('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('favorites_user_property_idx').on(table.userId, table.propertyId),
  ]
);

// 9. Workstation Packages
export const workstationPackages = pgTable('workstation_packages', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  monthlyPriceEUR: integer('monthly_price_eur').default(0).notNull(), // cents
  isIncluded: boolean('is_included').default(false).notNull(),
  features: jsonb('features').$type<string[]>().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  position: integer('position').default(0).notNull(),
});

// 10. Workstation Components
export const workstationComponents = pgTable('workstation_components', {
  id: serial('id').primaryKey(),
  componentId: varchar('component_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'desk' | 'chair' | 'monitor' | 'keyboardMouse'
  monthlyPriceEUR: integer('monthly_price_eur').default(0).notNull(),
  options: jsonb('options').$type<unknown[]>().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  position: integer('position').default(0).notNull(),
});

// 11. Workstation Addons
export const workstationAddons = pgTable('workstation_addons', {
  id: serial('id').primaryKey(),
  addonId: varchar('addon_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 50 }),
  description: text('description'),
  monthlyPriceEUR: integer('monthly_price_eur').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  position: integer('position').default(0).notNull(),
});

// 12. Travel Guides
export const travelGuides = pgTable('travel_guides', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  category: varchar('category', { length: 100 }),
  excerpt: text('excerpt'),
  content: text('content'),
  coverImage: varchar('cover_image', { length: 255 }),
  isFeatured: boolean('is_featured').default(false).notNull(),
  status: varchar('status', { length: 20 }).default('published').notNull(), // 'draft' | 'published'
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: text('seo_description'),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Blog Posts
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  coverImage: varchar('cover_image', { length: 255 }),
  author: varchar('author', { length: 100 }),
  readTime: varchar('read_time', { length: 50 }),
  category: varchar('category', { length: 100 }),
  status: varchar('status', { length: 20 }).default('published').notNull(), // 'draft' | 'published'
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: text('seo_description'),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 14. Community Videos
export const communityVideos = pgTable('community_videos', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }),
  author: varchar('author', { length: 100 }),
  platform: varchar('platform', { length: 50 }).default('instagram').notNull(),
  videoUrl: varchar('video_url', { length: 255 }),
  embedUrl: varchar('embed_url', { length: 255 }),
  thumbnailUrl: varchar('thumbnail_url', { length: 255 }),
  aspect: varchar('aspect', { length: 20 }),
  isActive: boolean('is_active').default(true).notNull(),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 15. Settings
export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 16. Media
export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  url: varchar('url', { length: 255 }).notNull().unique(),
  storageKey: varchar('storage_key', { length: 255 }).notNull().unique(),
  mimeType: varchar('mime_type', { length: 50 }).default('image/webp').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  alt: varchar('alt', { length: 255 }),
  uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  hostProfile: one(hostProfiles, {
    fields: [users.id],
    references: [hostProfiles.userId],
  }),
  reservations: many(reservations),
  favorites: many(favorites),
  media: many(media),
}));

export const hostProfilesRelations = relations(hostProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [hostProfiles.userId],
    references: [users.id],
  }),
  properties: many(properties),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  host: one(hostProfiles, {
    fields: [properties.hostId],
    references: [hostProfiles.id],
  }),
  location: one(locations, {
    fields: [properties.locationId],
    references: [locations.id],
  }),
  blockedDates: many(blockedDates),
  reservations: many(reservations),
  favorites: many(favorites),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [reservations.propertyId],
    references: [properties.id],
  }),
}));

export const blockedDatesRelations = relations(blockedDates, ({ one }) => ({
  property: one(properties, {
    fields: [blockedDates.propertyId],
    references: [properties.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [favorites.propertyId],
    references: [properties.id],
  }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  uploader: one(users, {
    fields: [media.uploadedBy],
    references: [users.id],
  }),
}));
