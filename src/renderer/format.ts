/** Small formatting helpers for the shell. */

import { useEffect, useState } from 'react';

// `formatAge` moved to `src/shared/age.ts` in Phase 316, so main composes the
// phone's ages with the formatter the Mac draws them with. Every importer was
// re-pointed there; this module no longer names it.

/** Re-render on an interval so ages stay honest. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Middle-truncate a name keeping the suffix (S2 tab names). */
export function truncateMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const keep = max - 1;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${text.slice(0, head)}…${text.slice(text.length - tail)}`;
}

/**
 * The folder a path sits in, with no trailing slash and `/` at the root.
 *
 * Phase 18.6 dedup: this arrived a third time in the parallel build (the New
 * Project dialog, the clone store and the home screen's recent rows each wrote
 * it), and the home screen's copy returned '' rather than '/' for a path at
 * the filesystem root. One line, one behaviour.
 */
export function parentDir(path: string): string {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

// `displayPath` moved to `src/shared/display-path.ts` in Phase 316.7, so main
// draws the folder under a phone's group header with the rule the session
// manager draws it with. It is re-exported here so none of its importers moved.
export { displayPath } from '@shared/display-path';
