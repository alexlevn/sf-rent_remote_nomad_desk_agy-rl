import { z } from 'zod';

const INT4_MAX = 2_147_483_647;

export const workstationCategorySchema = z.enum([
  'desk',
  'chair',
  'monitor',
  'keyboardMouse',
]);

/**
 * Zod schema for creating a new WorkstationPackage.
 */
export const createWorkstationPackageSchema = z.object({
  id: z.string().trim().min(1, 'Package ID is required').max(100),
  slug: z.string().trim().min(1, 'Package slug is required').max(100).optional(),
  name: z.string().trim().min(1, 'Package name is required').max(150),
  pricePerMonth: z.number().int().nonnegative().max(INT4_MAX).optional().default(0),
  isIncluded: z.boolean().optional().default(false),
  description: z.string().optional().default(''),
  features: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for updating an existing WorkstationPackage (no defaults).
 */
export const updateWorkstationPackageSchema = z.object({
  id: z.string().trim().min(1, 'Package ID is required').max(100),
  slug: z.string().trim().min(1, 'Package slug cannot be empty').max(100).optional(),
  name: z.string().trim().min(1, 'Package name cannot be empty').max(150).optional(),
  pricePerMonth: z.number().int().nonnegative().max(INT4_MAX).optional(),
  isIncluded: z.boolean().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for creating a new WorkstationComponentOption.
 */
export const createWorkstationComponentSchema = z.object({
  id: z.string().trim().min(1, 'Component ID is required').max(50),
  name: z.string().trim().min(1, 'Component name is required').max(150),
  pricePerMonth: z.number().int().nonnegative().max(INT4_MAX).optional().default(0),
  isIncluded: z.boolean().optional().default(false),
  description: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for updating an existing WorkstationComponentOption (no defaults).
 */
export const updateWorkstationComponentSchema = z.object({
  id: z.string().trim().min(1, 'Component ID is required').max(50),
  name: z.string().trim().min(1, 'Component name cannot be empty').max(150).optional(),
  pricePerMonth: z.number().int().nonnegative().max(INT4_MAX).optional(),
  isIncluded: z.boolean().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for creating a new WorkstationAddon.
 */
export const createWorkstationAddonSchema = z.object({
  id: z.string().trim().min(1, 'Add-on ID is required').max(50),
  name: z.string().trim().min(1, 'Add-on name is required').max(150),
  pricePerMonth: z.number().int().nonnegative().max(INT4_MAX).optional().default(0),
  description: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

/**
 * Zod schema for updating an existing WorkstationAddon (no defaults).
 */
export const updateWorkstationAddonSchema = z.object({
  id: z.string().trim().min(1, 'Add-on ID is required').max(50),
  name: z.string().trim().min(1, 'Add-on name cannot be empty').max(150).optional(),
  pricePerMonth: z.number().int().nonnegative().max(INT4_MAX).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().nonnegative().max(INT4_MAX).optional(),
});

export const workstationItemTypeSchema = z.enum(['package', 'component', 'addon']);

export const reorderWorkstationSchema = z.object({
  type: workstationItemTypeSchema,
  orderedIds: z.array(z.string().trim().min(1).max(100)),
});

export type WorkstationCategoryInput = z.infer<typeof workstationCategorySchema>;
export type CreateWorkstationPackageInput = z.infer<typeof createWorkstationPackageSchema>;
export type UpdateWorkstationPackageInput = z.infer<typeof updateWorkstationPackageSchema>;
export type CreateWorkstationComponentInput = z.infer<typeof createWorkstationComponentSchema>;
export type UpdateWorkstationComponentInput = z.infer<typeof updateWorkstationComponentSchema>;
export type CreateWorkstationAddonInput = z.infer<typeof createWorkstationAddonSchema>;
export type UpdateWorkstationAddonInput = z.infer<typeof updateWorkstationAddonSchema>;
export type WorkstationItemType = z.infer<typeof workstationItemTypeSchema>;
export type ReorderWorkstationInput = z.infer<typeof reorderWorkstationSchema>;
