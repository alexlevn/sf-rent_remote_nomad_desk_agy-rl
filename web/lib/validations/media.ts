import { z } from 'zod';

const INT4_MAX = 2_147_483_647;
const MAX_IMAGE_PATH_LENGTH = 255;

const SAFE_LOCAL_PREFIXES = ['/uploads/', '/seed/'] as const;
const SAFE_LOCAL_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

/**
 * Validates that an image reference is either a safe local /uploads/ or /seed/ path
 * without traversal segments, or a valid https:// URL.
 */
export function isSafeImagePath(url: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_IMAGE_PATH_LENGTH) {
    return false;
  }

  // Reject whitespace, ASCII control chars, backslashes, angle brackets, quotes, and '..'
  if (
    /\s/.test(trimmed) ||
    /[\u0000-\u001f\u007f]/.test(trimmed) ||
    trimmed.includes('\\') ||
    trimmed.includes('..') ||
    /[<>"'`]/.test(trimmed)
  ) {
    return false;
  }

  for (const prefix of SAFE_LOCAL_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length);
      if (rest.length === 0 || trimmed.includes('//')) {
        return false;
      }

      let decoded: string;
      try {
        decoded = decodeURIComponent(rest);
      } catch {
        return false;
      }

      if (
        decoded.includes('..') ||
        decoded.includes('\\') ||
        /[\u0000-\u001f\u007f]/.test(decoded)
      ) {
        return false;
      }

      const segments = decoded.split('/');
      return segments.every(
        (seg) =>
          seg.length > 0 &&
          seg !== '.' &&
          seg !== '..' &&
          SAFE_LOCAL_SEGMENT_RE.test(seg),
      );
    }
  }

  if (trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' || parsed.hostname.length === 0) {
        return false;
      }
      const decodedPath = decodeURIComponent(parsed.pathname);
      if (
        decodedPath.includes('..') ||
        decodedPath.includes('\\') ||
        /[\u0000-\u001f\u007f]/.test(decodedPath)
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export const safeImagePathSchema = z
  .string()
  .trim()
  .min(1, 'Image path is required')
  .max(
    MAX_IMAGE_PATH_LENGTH,
    `Image path must be ${MAX_IMAGE_PATH_LENGTH} characters or fewer`,
  )
  .refine(
    isSafeImagePath,
    'Image path must be a valid /uploads/, /seed/, or https:// URL',
  );

export const optionalSafeImagePathSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine(
    (value) =>
      value === null ||
      (value.length <= MAX_IMAGE_PATH_LENGTH && isSafeImagePath(value)),
    'Image path must be a valid /uploads/, /seed/, or https:// URL',
  );

// Block empty string and null from coercing to 0 in numeric query params
function parseOptionalQueryInt(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    if (!/^-?\d+$/.test(trimmed)) return Number.NaN;
    return Number(trimmed);
  }
  return value;
}

function parseRequiredInt(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return Number.NaN;
    return Number(trimmed);
  }
  return value;
}

export const mediaListQuerySchema = z.object({
  page: z.preprocess(
    parseOptionalQueryInt,
    z.number().int().min(1).max(1_000_000).default(1),
  ),
  pageSize: z.preprocess(
    parseOptionalQueryInt,
    z.number().int().min(1).max(60).default(24),
  ),
  search: z.string().trim().max(100).optional(),
});

export const mediaIdSchema = z.preprocess(
  parseRequiredInt,
  z.number().int().positive().max(INT4_MAX),
);

export type MediaListQueryInput = z.infer<typeof mediaListQuerySchema>;
