/**
 * The session manager's own formats (Phase 293).
 *
 * Four small functions and no state. They are here, and not in
 * `../format.ts`, because each one answers a question only the sheet asks:
 *
 *  - `ageTwoUnits` draws an age in TWO units (`5h 14m`, `2d 1h`). The sheet's
 *    Created and Last message columns sit side by side and are sorted against
 *    each other, and `formatAge` rounds both of `5h 14m` and `5h 58m` to `5h`.
 *    `formatAge` is NOT edited: the dock and the ⌘J list want one unit, and it
 *    says `now` under a minute, which a column a person sorts by cannot.
 *  - `dayLabel` answers by the LOCAL calendar day, because a person reads
 *    `Yesterday` against their own clock and not against 24 hours ago.
 *  - `exactTime` is the hover title behind both, with no zone suffix. The
 *    study's `ET` was its fixture's zone and is not copied.
 *  - `removedDate` is the Past tab's date. It replaces `removedDateLabel` in
 *    the modal this phase deletes, and it lost that function's leading word,
 *    which moved into the slot's own sentence in ./copy.ts.
 *
 * Nothing here is a colour, a path or a status. Every function is pure: the
 * clock is an argument, so the tests hold the answers and `useNow` owns the
 * re-render.
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
] as const;

/**
 * An age in two units: under a minute `Ns`, under an hour `Nm`, under a day
 * `Nh Mm`, and from then on `Nd Nh`. Never `now`. A time in the future, which
 * is what a clock set back looks like, reads `0s` rather than a negative age.
 */
export function ageTwoUnits(thenMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - thenMs) / 1000));
  if (seconds < 60) return `${String(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${String(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}h ${String(minutes % 60)}m`;
  const days = Math.floor(hours / 24);
  return `${String(days)}d ${String(hours % 24)}h`;
}

/** `Sep 16`, or `Sep 16, 2025` when the year is not the clock's year. */
function monthDay(then: Date, now: Date): string {
  const month = MONTHS[then.getMonth()] ?? '';
  const suffix =
    then.getFullYear() === now.getFullYear()
      ? ''
      : `, ${String(then.getFullYear())}`;
  return `${month} ${String(then.getDate())}${suffix}`;
}

/** Whether two instants fall on one local calendar day. */
function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * `Today`, `Yesterday`, `Sep 16`, or `Sep 16, 2025` for another year, by the
 * LOCAL calendar day.
 *
 * Yesterday is found by asking the calendar for the day before today, never by
 * subtracting 24 hours: on the two days a year the clock changes, a day is 23
 * or 25 hours long and the subtraction names the wrong one.
 *
 * It is never handed a `createdAt` of 0. The caller draws a dash for that
 * (./ManagedGrid.tsx), because `Dec 31, 1969` is a lie about a row whose far
 * side could not say when it was made.
 */
export function dayLabel(ms: number, nowMs: number): string {
  const then = new Date(ms);
  const now = new Date(nowMs);
  if (sameLocalDay(then, now)) return 'Today';
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  );
  if (sameLocalDay(then, yesterday)) return 'Yesterday';
  return monthDay(then, now);
}

/**
 * The full moment, to the second, in the person's own locale and zone. It is a
 * hover title and a Details fact, so it carries no zone suffix: the clock it is
 * read against is the one on their wall.
 */
export function exactTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
}

/** The day a session was removed: `Aug 12`, or `Aug 12, 2025` for another year. */
export function removedDate(removedAtMs: number, nowMs: number): string {
  return monthDay(new Date(removedAtMs), new Date(nowMs));
}
