export const INT4_MAX = 2_147_483_647;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Normalizes an image path so local relative paths start with '/', while keeping
 * valid http(s):// URLs intact and falling back when empty.
 */
export function normalizeImageSrc(
  src: string | null | undefined,
  fallback: string = '/seed/property/prop-madrid-1.webp'
): string {
  const trimmed = (src ?? '').trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `/${trimmed}`;
}

/**
 * Converts a display city/category string into a URL-safe kebab-case slug.
 */
export function slugifySegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds the canonical Travel Guide detail URL matching /travel-guide/[city]/[category]/[slug].
 */
export function getTravelGuideHref(guide: {
  city: string;
  category: string;
  slug: string;
}): string {
  const citySlug = slugifySegment(guide.city) || 'global';
  const categorySlug = slugifySegment(guide.category) || 'guide';
  return `/travel-guide/${encodeURIComponent(citySlug)}/${encodeURIComponent(categorySlug)}/${encodeURIComponent(guide.slug)}`;
}

/**
 * Validates that a post-auth redirect target stays within this origin.
 */
export function sanitizeCallbackUrl(
  rawUrl: string | null | undefined,
  fallback: string = '/'
): string {
  if (!rawUrl) return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }
  return trimmed;
}

/**
 * Parses a YYYY-MM-DD date string strictly in UTC midnight to avoid local TZ off-by-one shifts.
 */
export function parseUtcDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt;
}

/**
 * Formats a Date in UTC as YYYY-MM-DD.
 */
export function toUtcDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date in UTC as YYYY-MM-DD plus offsetDays.
 */
export function getUtcOffsetDateString(offsetDays: number, baseDate: Date = new Date()): string {
  const dt = new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate() + offsetDays)
  );
  return toUtcDateString(dt);
}

/**
 * Computes nights between two YYYY-MM-DD dates in UTC.
 */
export function diffUtcNights(moveIn: string, moveOut: string): number {
  const start = parseUtcDate(moveIn);
  const end = parseUtcDate(moveOut);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Formats an ISO date or YYYY-MM-DD string consistently in UTC.
 */
export function formatUtcDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!value) return '—';
  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? parseUtcDate(value)
        : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);
}

/**
 * Formats a move-in / move-out YYYY-MM-DD range in UTC.
 */
export function formatUtcDateRange(moveIn: string, moveOut: string): string {
  const start = parseUtcDate(moveIn);
  const end = parseUtcDate(moveOut);
  if (!start || !end) return `${moveIn} – ${moveOut}`;
  const startStr = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(start);
  const endStr = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(end);
  return `${startStr} – ${endStr}`;
}

/**
 * Deterministic smart-lock code for confirmed reservations.
 */
export function getSmartLockPasscode(reservationId: number): string {
  return `${8400 + ((reservationId * 92) % 1000)}#`;
}

/**
 * Formats byte size into human-readable KB/MB.
 */
export function formatFileSize(bytes: number): string {
  const KB = 1024;
  if (bytes < KB) return `${bytes} B`;
  if (bytes < KB * KB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / (KB * KB)).toFixed(2)} MB`;
}

/**
 * Formats a saved timestamp for admin/host editor sticky bars.
 */
export function formatLastSaved(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
