import { MS_PER_DAY, MS_PER_HOUR, parseUtcDate } from '@/lib/format';

/**
 * Formats move-in and move-out dates consistently in UTC (e.g. Dec 1 – Dec 31, 2026).
 */
export function formatDatesDisplay(inDate: string, outDate: string): string {
  const dIn = parseUtcDate(inDate);
  const dOut = parseUtcDate(outDate);
  if (!dIn || !dOut) return `${inDate} – ${outDate}`;

  const inMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(dIn);
  const inDay = dIn.getUTCDate();
  const inYear = dIn.getUTCFullYear();
  const outMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(dOut);
  const outDay = dOut.getUTCDate();
  const outYear = dOut.getUTCFullYear();

  if (inYear === outYear) {
    if (inMonth === outMonth) {
      return `${inMonth} ${inDay} – ${outDay}, ${inYear}`;
    }
    return `${inMonth} ${inDay} – ${outMonth} ${outDay}, ${inYear}`;
  }
  return `${inMonth} ${inDay}, ${inYear} – ${outMonth} ${outDay}, ${outYear}`;
}

/**
 * Calculates full days remaining until move-in date in UTC, matching server cancellation check.
 */
export function getDaysUntilMoveIn(moveInDate: string): number {
  const moveIn = parseUtcDate(moveInDate);
  if (!moveIn) return 0;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((moveIn.getTime() - todayUtc) / MS_PER_DAY);
}

/**
 * Computes human-friendly remaining response hours from a reservation's respondBy ISO timestamp.
 */
export function formatRespondByCountdown(respondBy?: string | null): string {
  if (!respondBy) return '';
  const deadlineMs = new Date(respondBy).getTime();
  if (Number.isNaN(deadlineMs)) return '';
  const diffMs = deadlineMs - Date.now();
  if (diffMs <= 0) return '(Expired)';
  const hours = Math.ceil(diffMs / MS_PER_HOUR);
  return `(${hours}h left)`;
}
