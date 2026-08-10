/** SCM-local formatting helpers (kept here so the stream is self-contained). */

/**
 * Compact relative time for history rows: "now", "4m", "2h", "3d", "2w",
 * "5mo", "1y" — wider range than session ages (commits get old).
 */
export function formatRelative(epochMs: number, nowMs: number): string {
  const delta = Math.max(0, nowMs - epochMs);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

/** Split a repo-relative path into { dir, base } for the two-tone row. */
export function splitPath(path: string): { dir: string; base: string } {
  const i = path.lastIndexOf('/');
  if (i === -1) return { dir: '', base: path };
  return { dir: path.slice(0, i), base: path.slice(i + 1) };
}

/** Short SHA for display/copy (7 chars, git's default abbreviation floor). */
export function shortSha(hash: string): string {
  return hash.slice(0, 7);
}

/**
 * Long relative time for the hover card header ("2 days ago"), matching the
 * VS Code reference card. Compact row ages keep formatRelative.
 */
export function formatRelativeLong(epochMs: number, nowMs: number): string {
  const delta = Math.max(0, nowMs - epochMs);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'just now';
  const unit = (n: number, word: string): string =>
    `${n} ${word}${n === 1 ? '' : 's'} ago`;
  if (minutes < 60) return unit(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return unit(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return unit(days, 'day');
  if (days < 30) return unit(Math.floor(days / 7), 'week');
  if (days < 365) return unit(Math.floor(days / 30), 'month');
  return unit(Math.floor(days / 365), 'year');
}

/**
 * Absolute date for the hover card header — user locale, long form:
 * "August 7, 2026 at 12:05 PM".
 */
export function formatAbsolute(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short'
  });
}

/** Reassemble the full commit message from git's subject/body split. */
export function fullMessage(subject: string, body: string): string {
  const rest = body.replace(/\s+$/, '');
  return rest.length > 0 ? `${subject}\n\n${rest}` : subject;
}
