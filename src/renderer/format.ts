/** Small formatting helpers for the shell. */

import { useEffect, useState } from 'react';

/** Compact age: "now", "4m", "2h", "3d" (S3 session rows, S7 overlay). */
export function formatAge(sinceEpochMs: number, nowMs: number = Date.now()): string {
  const delta = Math.max(0, nowMs - sinceEpochMs);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

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

/**
 * Home-relative path for display ("~/src/webapp").
 *
 * PHASE 90.3 GAVE IT A SECOND ARGUMENT, and the reason is that a tilde is a
 * claim about whose home folder a path is in. `/Users/gdc/src` on THIS Mac is
 * this person's home folder. The same string on another machine is that
 * machine's account, which may be a different person, and rewriting it to `~`
 * says something Tortie does not know. So a path on another machine is drawn
 * exactly as that machine states it.
 *
 * The argument is optional and an omitted value means this Mac, so every caller
 * that has never heard of a machine reads exactly what it read before.
 */
export function displayPath(path: string, machineId?: string): string {
  if (machineId !== undefined && machineId !== '' && machineId !== 'local') {
    return path;
  }
  const m = /^\/Users\/[^/]+(\/.*)?$/.exec(path);
  if (m) return `~${m[1] ?? ''}`;
  return path;
}
