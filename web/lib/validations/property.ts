import { z } from 'zod';
import { safeImagePathSchema } from '@/lib/validations/media';

const INT4_MAX = 2147483647;

export const int4IdSchema = z.number().int().min(1).max(INT4_MAX);

export const propertyStatusSchema = z.enum([
  'draft',
  'pending_review',
  'published',
  'rejected',
  'hidden',
]);

export const propertyWorkstationSchema = z.object({
  hasWorkstation: z.boolean(),
  desk: z.string().max(255),
  chair: z.string().max(255),
  monitors: z.string().max(255),
  keyboard: z.string().max(255),
  wifiSpeed: z.number().int().min(0).max(100000),
});

export const isoDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((val) => {
    const d = new Date(`${val}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
  }, 'Invalid calendar date');

export const nonNegativeInt4Schema = z.number().int().min(0).max(INT4_MAX);

// Separate create and update schemas to avoid .default() applying on partial updates
export const createPropertySchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  slug: z.string().trim().min(1).max(255).optional(),
  reference: z.string().trim().min(1).max(50).optional(),
  description: z.string().max(10000).optional(),
  pricePerMonth: z.number().int().min(0).max(INT4_MAX).optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  locationId: int4IdSchema.optional(),
  city: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().max(150).optional(),
  address: z.string().trim().max(255).optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  bedsCount: z.number().int().min(0).max(50).optional(),
  totalSurface: z.number().int().min(0).max(100000).optional(),
  maxGuests: z.number().int().min(1).max(50).optional(),
  kitchen: z.boolean().optional(),
  laundry: z.boolean().optional(),
  balcony: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
  pool: z.boolean().optional(),
  gym: z.boolean().optional(),
  terrace: z.boolean().optional(),
  workstation: propertyWorkstationSchema.optional(),
  houseRules: z.string().max(5000).optional(),
  checkInStart: z.string().trim().max(20).optional(),
  checkOut: z.string().trim().max(20).optional(),
  minimumStayNights: z.number().int().min(1).max(3650).optional(),
  isDirectBooking: z.boolean().optional(),
  images: z.array(safeImagePathSchema).max(50).optional(),
  featuredPosition: z.number().int().min(1).max(INT4_MAX).nullable().optional(),
  status: propertyStatusSchema.optional(),
  rejectionReason: z.string().max(2000).nullable().optional(),
});

export const updatePropertySchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  slug: z.string().trim().min(1).max(255).optional(),
  reference: z.string().trim().min(1).max(50).optional(),
  description: z.string().max(10000).optional(),
  pricePerMonth: z.number().int().min(0).max(INT4_MAX).optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  locationId: int4IdSchema.optional(),
  city: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().max(150).optional(),
  address: z.string().trim().max(255).optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  bedsCount: z.number().int().min(0).max(50).optional(),
  totalSurface: z.number().int().min(0).max(100000).optional(),
  maxGuests: z.number().int().min(1).max(50).optional(),
  kitchen: z.boolean().optional(),
  laundry: z.boolean().optional(),
  balcony: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
  pool: z.boolean().optional(),
  gym: z.boolean().optional(),
  terrace: z.boolean().optional(),
  workstation: propertyWorkstationSchema.optional(),
  houseRules: z.string().max(5000).optional(),
  checkInStart: z.string().trim().max(20).optional(),
  checkOut: z.string().trim().max(20).optional(),
  minimumStayNights: z.number().int().min(1).max(3650).optional(),
  isDirectBooking: z.boolean().optional(),
  images: z.array(safeImagePathSchema).max(50).optional(),
  featuredPosition: z.number().int().min(1).max(INT4_MAX).nullable().optional(),
  status: propertyStatusSchema.optional(),
  rejectionReason: z.string().max(2000).nullable().optional(),
});

export const adminCreatePropertySchema = createPropertySchema.extend({
  hostId: int4IdSchema,
  title: z.string().trim().min(1, 'Title is required').max(255),
  minimumStayNights: z
    .number()
    .int()
    .min(30, 'Minimum stay must be at least 30 nights')
    .max(3650)
    .optional()
    .default(30),
  status: propertyStatusSchema.optional().default('published'),
});

// Separate from updatePropertySchema so hosts cannot reassign property ownership
export const adminUpdatePropertySchema = updatePropertySchema.extend({
  hostId: int4IdSchema.optional(),
});

export const featuredReorderSchema = z.array(int4IdSchema);

export type AdminCreatePropertyInput = z.infer<typeof adminCreatePropertySchema>;
export type AdminUpdatePropertyInput = z.infer<typeof adminUpdatePropertySchema>;
