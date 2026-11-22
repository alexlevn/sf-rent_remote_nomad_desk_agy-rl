/**
 * Strips NUL bytes (\0) that cause Postgres UTF-8 errors (22021), trims whitespace,
 * and caps length before interpolating into SQL queries.
 */
export function sanitizeSearchInput(input: string, maxLength: number = 200): string {
  return input.replace(/\0/g, '').trim().slice(0, maxLength);
}

/**
 * Escapes PostgreSQL LIKE/ILIKE wildcard characters (%, _, \) after stripping NUL bytes.
 */
export function escapeIlike(input: string, maxLength: number = 200): string {
  const safe = sanitizeSearchInput(input, maxLength);
  return safe.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Clamps page and pageSize to safe positive integer bounds for SQL LIMIT/OFFSET.
 */
export function normalizePagination(
  page?: number,
  pageSize?: number,
  options?: { defaultPageSize?: number; maxPageSize?: number }
): { page: number; pageSize: number; offset: number } {
  const defaultSize = options?.defaultPageSize ?? 20;
  const maxSize = options?.maxPageSize ?? 100;

  const safePage =
    typeof page === 'number' && Number.isFinite(page)
      ? Math.min(Math.max(1, Math.floor(page)), 1_000_000)
      : 1;
  const rawSize =
    typeof pageSize === 'number' && Number.isFinite(pageSize)
      ? Math.floor(pageSize)
      : defaultSize;
  const safePageSize = Math.min(Math.max(rawSize, 1), maxSize);

  return {
    page: safePage,
    pageSize: safePageSize,
    offset: (safePage - 1) * safePageSize,
  };
}

/**
 * Extracts PostgreSQL SQLSTATE error code from direct or Drizzle-wrapped errors.
 */
export function getPgErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const record = err as { code?: unknown; cause?: unknown };
  if (typeof record.code === 'string') return record.code;
  if (typeof record.cause === 'object' && record.cause !== null) {
    const causeCode = (record.cause as { code?: unknown }).code;
    if (typeof causeCode === 'string') return causeCode;
  }
  return undefined;
}

/**
 * Extracts PostgreSQL constraint name from direct or Drizzle-wrapped errors.
 */
export function getPgConstraintName(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const record = err as { constraint?: unknown; cause?: unknown };
  if (typeof record.constraint === 'string') return record.constraint;
  if (typeof record.cause === 'object' && record.cause !== null) {
    const causeConstraint = (record.cause as { constraint?: unknown }).constraint;
    if (typeof causeConstraint === 'string') return causeConstraint;
  }
  return undefined;
}
