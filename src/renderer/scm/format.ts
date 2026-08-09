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
