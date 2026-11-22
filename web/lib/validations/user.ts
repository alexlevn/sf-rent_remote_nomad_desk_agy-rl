import { z } from 'zod';
import { INT4_MAX } from '@/lib/format';

export const userIdSchema = z.number().int().positive().max(INT4_MAX);
export const userRoleSchema = z.enum(['guest', 'host', 'admin']);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email address is required').max(255),
  passwordHash: z.string().min(1, 'Password hash is required').max(255),
  firstName: z.string().trim().max(100).optional().default(''),
  lastName: z.string().trim().max(100).optional().default(''),
  role: userRoleSchema.optional().default('guest'),
  isActive: z.boolean().optional().default(true),
});

// Separate update schema with no defaults so partial updates never overwrite omitted fields
export const updateUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email address is required').max(255).optional(),
  passwordHash: z.string().min(1).max(255).optional(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
});
