/**
 * The two clock formatters for the Catch Me Up page (Phase 137).
 *
 * These two functions and formatAge in ../format.ts are the only sources of
 * digits on the page. The views wrap their output in spans that carry
 * data-clock, data-date or data-age, and the probe reads those attributes to
 * prove no other digit is drawn.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

function two(value: number): string {
  return String(value).padStart(2, '0');
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The clock over one turn. A turn from today shows the time alone. An older
 * turn shows its date as well, because a bare time on a turn from last week
 * would claim a today that is not true. Null in means null out, which is how
 * a provider with no per turn clock draws no clock at all.
 */
export function formatTurnClock(
  at: string | number | null,
  nowMs: number
): string | null {
  if (at === null) return null;
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return null;
  const clock = `${two(when.getHours())}:${two(when.getMinutes())}`;
  if (sameDay(when, new Date(nowMs))) return clock;
  return `${MONTHS[when.getMonth()]} ${when.getDate()}, ${clock}`;
}

/** The header's read time, e.g. the clock in "read 13:31". */
export function formatReadClock(readAtMs: number): string {
  const when = new Date(readAtMs);
  return `${two(when.getHours())}:${two(when.getMinutes())}`;
}
