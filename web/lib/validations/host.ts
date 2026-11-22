import { z } from 'zod';
import { INT4_MAX } from '@/lib/format';
import { optionalSafeImagePathSchema } from '@/lib/validations/media';

export const hostInt4IdSchema = z.number().int().min(1).max(INT4_MAX);

export const hostStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'suspended',
]);

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((val) => {
    const d = new Date(`${val}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
  }, 'Invalid calendar date');

// Separate schemas for create/apply vs update to avoid .default() overriding partial updates
export const hostApplicationSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(150),
  phone: z.string().trim().min(1, 'Phone number is required').max(50),
  website: z
    .string()
    .trim()
    .max(255)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  cities: z.string().trim().max(500).optional(),
  portfolioSize: z.number().int().min(1).max(100000).optional(),
  bio: z.string().trim().max(5000).optional(),
  termsAccepted: z.boolean().optional(),
  userId: hostInt4IdSchema,
});

// Excludes status/rejectionReason so profile edits can never mass-assign moderation state
export const updateHostProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(150).optional(),
  slug: z.string().trim().min(1).max(150).optional(),
  phone: z.string().trim().min(1, 'Phone number is required').max(50).optional(),
  website: z
    .string()
    .trim()
    .max(255)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null)),
  cities: z.string().trim().max(500).optional(),
  portfolioSize: z.number().int().min(1).max(100000).optional(),
  bio: z.string().trim().max(5000).optional(),
  avatar: optionalSafeImagePathSchema.optional(),
});

export const reviewHostApplicationSchema = z.object({
  id: hostInt4IdSchema,
  status: hostStatusSchema,
  reason: z.string().trim().max(2000).optional(),
});

export const blockedDateInputSchema = z
  .object({
    propertyId: hostInt4IdSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    reason: z.string().trim().max(150).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });
