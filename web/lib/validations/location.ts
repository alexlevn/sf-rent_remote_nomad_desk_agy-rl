import { z } from 'zod';
import { INT4_MAX } from '@/lib/format';
import { safeImagePathSchema } from '@/lib/validations/media';

export const DEFAULT_LOCATION_IMAGE = '/seed/location/2241.jpg';

const locationIdSchema = z.number().int().positive().max(INT4_MAX);
const coordinateTupleSchema = z.tuple([
  z.number().finite().min(-90).max(90),
  z.number().finite().min(-180).max(180),
]);

/**
 * Zod validation schema for creating a new Location.
 */
export const locationInputSchema = z.object({
  city: z.string().trim().min(1, 'City name is required').max(100),
  name: z.string().trim().min(1, 'Destination name is required').max(150),
  slug: z.string().trim().min(1, 'Slug is required').max(150).optional(),
  country: z.string().trim().min(1, 'Country is required').max(100),
  countryCode: z.string().trim().min(1, 'Country code is required').max(10),
  continent: z.string().trim().max(50).optional().default('Europe'),
  propertiesCount: z.number().int().nonnegative().max(INT4_MAX).optional().default(0),
  description: z.string().max(10000).optional().default(''),
  image: safeImagePathSchema.optional().default(DEFAULT_LOCATION_IMAGE),
  center: coordinateTupleSchema.optional().default([40.4168, -3.7038]),
  isActive: z.boolean().optional().default(true),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod validation schema for updating an existing Location (PATCH/partial update).
 * Does not contain defaults so undefined fields are not overwritten.
 */
export const updateLocationSchema = z.object({
  id: locationIdSchema.optional(),
  city: z.string().trim().min(1, 'City name cannot be empty').max(100).optional(),
  name: z.string().trim().min(1, 'Destination name cannot be empty').max(150).optional(),
  slug: z.string().trim().min(1, 'Slug cannot be empty').max(150).optional(),
  country: z.string().trim().min(1, 'Country cannot be empty').max(100).optional(),
  countryCode: z.string().trim().min(1, 'Country code cannot be empty').max(10).optional(),
  continent: z.string().trim().max(50).optional(),
  propertiesCount: z.number().int().nonnegative().max(INT4_MAX).optional(),
  description: z.string().max(10000).optional(),
  image: safeImagePathSchema.optional(),
  center: coordinateTupleSchema.optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Validation schema for reordering top cities.
 */
export const locationReorderSchema = z.array(locationIdSchema);

export { locationIdSchema };
export type LocationInput = z.infer<typeof locationInputSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
