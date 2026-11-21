/**
 * Formats move-in and move-out dates for display (e.g. Dec 1 – Dec 31, 2026).
 */
export function formatDatesDisplay(inDate: string, outDate: string): string {
  try {
    const dIn = new Date(inDate + 'T00:00:00');
    const dOut = new Date(outDate + 'T00:00:00');
    if (isNaN(dIn.getTime()) || isNaN(dOut.getTime())) return `${inDate} – ${outDate}`;
    const inMonth = dIn.toLocaleDateString('en-US', { month: 'short' });
    const inDay = dIn.getDate();
    const inYear = dIn.getFullYear();
    const outMonth = dOut.toLocaleDateString('en-US', { month: 'short' });
    const outDay = dOut.getDate();
    const outYear = dOut.getFullYear();

    if (inYear === outYear) {
      if (inMonth === outMonth) {
        return `${inMonth} ${inDay} – ${outDay}, ${inYear}`;
      }
      return `${inMonth} ${inDay} – ${outMonth} ${outDay}, ${inYear}`;
    }
    return `${inMonth} ${inDay}, ${inYear} – ${outMonth} ${outDay}, ${outYear}`;
  } catch {
    return `${inDate} – ${outDate}`;
  }
}

/**
 * Calculates number of full days remaining until move-in date.
 */
export function getDaysUntilMoveIn(moveInDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const moveIn = new Date(moveInDate + 'T00:00:00');
  const diffMs = moveIn.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 3600 * 24));
}
