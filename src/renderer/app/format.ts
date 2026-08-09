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

/** Home-relative path for display ("~/src/webapp"). */
export function displayPath(path: string): string {
  const m = /^\/Users\/[^/]+(\/.*)?$/.exec(path);
  if (m) return `~${m[1] ?? ''}`;
  return path;
}
