/**
 * The one age formatter Tortie draws ages with (moved to shared in Phase 316).
 *
 * It lived in `src/renderer/format.ts` from the first session rows (S3) and the
 * ⌘J overlay (S7) onward, and every surface that draws "how long ago" in one
 * unit reads it: the session rail, the dock, ⌘J, the Catch Me Up views,
 * Settings' scan ages and Diagnostics. Phase 316 moved it here, unchanged, so
 * that main can compose the same age for the phone's door (`ageText` on
 * `PocketBlockedRow`, `lastMessageText` on `PocketSessionDetail`) and the phone
 * draws the word the Mac draws rather than a second formatter's.
 *
 * Every importer was re-pointed to this module; nothing re-exports it, so there
 * is one spelling of the rule and one path to it.
 *
 * Pure. The clock is an argument.
 */

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
