/**
 * context-snapshot.ts — how the launch context snapshot is WRITTEN TO and READ
 * BACK FROM the sessions table (Phase 22, migration 009).
 *
 * The split follows ./contract.ts exactly. The SHAPE lives in
 * `src/shared/context-snapshot.ts`, because both processes need it and the
 * renderer is what compares it. This module owns the one JSON column it
 * travels in, and nothing else.
 *
 * ## The rule these codecs follow, inherited from ./contract.ts
 *
 * Parse the gate, pass the rest through. `updateSession` reads a row, merges a
 * patch and writes every column back, so a parser that rebuilt the snapshot
 * from the fields it happened to know about would silently erase any field a
 * newer build had added, the first time an older build renamed the session.
 * The object is returned as it was.
 *
 * ## Where this one differs, and why
 *
 * ./contract.ts checks the top level only. This one also filters the `entries`
 * array, because those entries are RENDERED. An element with no `id` would
 * reach `diffContextSnapshot`, which matches on `id`, and would corrupt the
 * comparison rather than produce a bad-looking row. So each element must carry
 * the six fields as strings, and an element that does not is dropped. The
 * elements that survive are passed through whole, so a field a newer build
 * added to an entry survives a round trip the same way a top-level field does.
 *
 * The `category` string is NOT checked against the union, for the reason
 * ./contract.ts gives for `source` and `confidence`. A newer build may add a
 * sixth category, and turning a string this build does not recognise into
 * "nothing was recorded" is a stronger and falser claim than "recorded as
 * something I do not know".
 *
 * ## What an unreadable value becomes
 *
 * Undefined, and the row then reads as a session with no snapshot. The readout
 * has a sentence for exactly that state, naming both reasons it can happen.
 * There is no halfway result, because half a snapshot would show a user a list
 * of what their session loaded that is missing the rows the parser choked on,
 * with nothing on screen to say so.
 *
 * ## What a row written before migration 009 gets
 *
 * NULL, and nothing is backfilled. A session created before Tortie kept a
 * snapshot has no snapshot, and building one from today's files would record
 * today's configuration under a timestamp from last week. That is precisely
 * the lie rule 3 of research 29 §8.2 exists to prevent.
 */

import {
  CONTEXT_SNAPSHOT_MAX_BYTES,
  CONTEXT_SNAPSHOT_MAX_ENTRIES,
  type ContextSnapshot,
  type ContextSnapshotEntry
} from '../../shared/context-snapshot';
import { parseObject } from './json-column';

/**
 * Parse the `context_snapshot` column.
 *
 * THREE FIELDS ARE REQUIRED and none is defaulted. `v` has to be a number so a
 * reader can tell which shape it is holding. `at` has to be a number because
 * the header line is "Started 3h ago" and an invented timestamp would put a
 * confident age on a record that has none. `entries` has to be an array
 * because an absent one and an empty one mean different things, being "this
 * did not parse" and "this agent loads nothing", and only one of those is
 * worth showing.
 */
export function parseContextSnapshot(
  text: string | null
): ContextSnapshot | undefined {
  const o = parseObject(text);
  if (o === undefined) return undefined;
  if (typeof o['v'] !== 'number') return undefined;
  if (typeof o['at'] !== 'number' || !Number.isFinite(o['at'])) return undefined;
  const raw = o['entries'];
  if (!Array.isArray(raw)) return undefined;

  const entries: ContextSnapshotEntry[] = [];
  let dropped = 0;
  for (const element of raw as unknown[]) {
    const entry = asEntry(element);
    if (entry === undefined) {
      dropped += 1;
      continue;
    }
    entries.push(entry);
  }

  // A record whose entries did not survive is not a record. Reporting an empty
  // list would tell the user their session loaded nothing, which is a
  // different and much stronger claim than "this could not be read".
  if (entries.length === 0 && dropped > 0) return undefined;

  const snapshot = { ...o, entries } as unknown as ContextSnapshot;
  // A drop is silent to the user by design, because the row is advisory and a
  // notice about it would be the product performing attentiveness. It is not
  // silent to a person debugging.
  if (dropped > 0) {
    console.warn(
      `[gmux] context snapshot: dropped ${String(dropped)} unreadable ` +
        'entries from a session row'
    );
  }
  return snapshot;
}

/**
 * Serialize for the column, applying both caps.
 *
 * Undefined in, NULL out. A snapshot that would exceed either cap is TRIMMED
 * and marked, never refused: a short honest list beats no list, and the
 * `truncated` flag is what makes it honest. The entry cap is applied first
 * because it is cheap, and the byte cap then removes entries from the end
 * until the JSON fits, so the result is always writable.
 *
 * WHY THERE ARE CAPS AT ALL. This blob lives in the manifest, which is the one
 * database whose loss costs the user their sessions. The measured resolved set
 * is 33 rows, so neither cap binds on any ordinary machine. They exist because
 * an unbounded advisory value inside a durability-critical file is a hazard
 * whatever its typical size.
 */
export function serializeContextSnapshot(
  snapshot: ContextSnapshot | undefined
): string | null {
  if (snapshot === undefined) return null;

  let working: ContextSnapshot =
    snapshot.entries.length > CONTEXT_SNAPSHOT_MAX_ENTRIES
      ? {
          ...snapshot,
          entries: snapshot.entries.slice(0, CONTEXT_SNAPSHOT_MAX_ENTRIES),
          truncated: true
        }
      : snapshot;

  let text = JSON.stringify(working);
  // Byte length, not string length: a source path can hold characters outside
  // the basic plane, and `text.length` would under-count them.
  while (
    Buffer.byteLength(text, 'utf8') > CONTEXT_SNAPSHOT_MAX_BYTES &&
    working.entries.length > 0
  ) {
    // Drop a tenth at a time rather than one at a time. A pathological blob is
    // the only case that reaches here, and walking it down one entry per
    // `JSON.stringify` would be quadratic on exactly the input that is
    // already too big.
    const keep = Math.max(0, working.entries.length - Math.ceil(working.entries.length / 10));
    working = {
      ...working,
      entries: working.entries.slice(0, keep),
      truncated: true
    };
    text = JSON.stringify(working);
  }

  return text;
}

/**
 * One entry, checked and passed through.
 *
 * Every field is checked as a string because every one of them is either
 * matched on or drawn. `hash` may be empty, and an empty hash is the recorded
 * way of saying the resolver could not hash the file; the comparison treats it
 * as "cannot tell" rather than as "unchanged".
 */
function asEntry(value: unknown): ContextSnapshotEntry | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const o = value as Record<string, unknown>;
  if (typeof o['id'] !== 'string' || o['id'].length === 0) return undefined;
  if (typeof o['category'] !== 'string') return undefined;
  if (typeof o['name'] !== 'string') return undefined;
  if (typeof o['scope'] !== 'string') return undefined;
  if (typeof o['sourcePath'] !== 'string') return undefined;
  if (typeof o['hash'] !== 'string') return undefined;
  return o as unknown as ContextSnapshotEntry;
}

