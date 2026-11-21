import { z } from 'zod';
import { safeImagePathSchema } from '@/lib/validations/media';

/**
 * Zod validation schema for creating a new Location.
 */
export const locationInputSchema = z.object({
  city: z.string().trim().min(1, 'City name is required'),
  name: z.string().trim().min(1, 'Destination name is required'),
  slug: z.string().trim().min(1, 'Slug is required').optional(),
  country: z.string().trim().min(1, 'Country is required'),
  countryCode: z.string().trim().min(1, 'Country code is required'),
  continent: z.string().trim().optional().default('Europe'),
  propertiesCount: z.number().int().nonnegative().optional().default(0),
  description: z.string().optional().default(''),
  image: safeImagePathSchema.optional().default('/seed/location/placeholder.jpg'),
  center: z.tuple([z.number(), z.number()]).optional().default([40.4168, -3.7038]),
  isActive: z.boolean().optional().default(true),
  position: z.number().int().nonnegative().optional(),
});

/**
 * Zod validation schema for updating an existing Location (PATCH/partial update).
 * Does not contain defaults so undefined fields are not overwritten.
 */
export const updateLocationSchema = z.object({
  id: z.number().int().positive().optional(),
  city: z.string().trim().min(1, 'City name cannot be empty').optional(),
  name: z.string().trim().min(1, 'Destination name cannot be empty').optional(),
  slug: z.string().trim().min(1, 'Slug cannot be empty').optional(),
  country: z.string().trim().min(1, 'Country cannot be empty').optional(),
  countryCode: z.string().trim().min(1, 'Country code cannot be empty').optional(),
  continent: z.string().trim().optional(),
  propertiesCount: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  image: safeImagePathSchema.optional(),
  center: z.tuple([z.number(), z.number()]).optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

/**
 * Validation schema for reordering top cities.
 */
export const locationReorderSchema = z.array(z.number().int().positive());

export type LocationInput = z.infer<typeof locationInputSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
