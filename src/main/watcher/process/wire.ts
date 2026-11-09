/**
 * What crosses between Electron main and the watcher process, and nothing else
 * (Phase 365, build/p365/SPEC.md §4.1).
 *
 * The watcher moved out of main because `@parcel/watcher` 2.6.0 races itself
 * when its subscribes and unsubscribes overlap, and the spec step measured the
 * result as damage to main's own heap, the allocator the session list's page
 * cache lives in (research 143 §2.5, §7; the spec's §2). Main now holds no
 * native watcher state at all: it asks, and the process answers. This module
 * is the one seam between the two, and it is TYPES AND VALIDATORS ONLY, in the
 * shape of the door's (`src/main/pocket/door/wire.ts`): it opens nothing,
 * imports nothing, and both sides run every message through the validator for
 * its direction. A message that does not validate is DROPPED WHOLE and counted
 * by the caller, never half read.
 *
 * A PATH CROSSES AS IT WAS WRITTEN. Nothing here folds case, normalises or
 * resolves a path (`conformance:samefolder` rule 23): the folder a site asked
 * for is the folder the process watches, and an event's path is the path
 * FSEvents reported.
 *
 * An ignore entry crosses as a plain path or as the SOURCE of a flagless
 * RegExp, and the process builds the RegExp again on its side. A RegExp with a
 * flag is refused in main before it is sent, exactly as
 * `node_modules/@parcel/watcher/wrapper.js` refuses it.
 */

// ---------------------------------------------------------------------------
// The bounds, checked by BOTH validators. They are generous on purpose: both
// sides are Tortie's own code, main checks its own message with the process's
// validator before it sends one (so the process never drops a message main
// meant), and a bound that dropped a real batch of events would lose an edit.
// ---------------------------------------------------------------------------

/** A watched folder's path, in characters. */
export const WIRE_DIR_MAX_CHARS = 4096;
/** One ignore entry (a plain path, or a RegExp's source), in characters. */
export const WIRE_IGNORE_ENTRY_MAX_CHARS = 32_768;
/** Ignore entries of one kind in one watch. Far more than any plan makes. */
export const WIRE_IGNORE_ENTRIES_MAX = 100_000;
/** One event's path, in characters. */
export const WIRE_EVENT_PATH_MAX_CHARS = 65_536;
/** An error's message, in characters. The process clips to this before it posts. */
export const WIRE_ERROR_MAX_CHARS = 4096;

// ---------------------------------------------------------------------------
// The shapes
// ---------------------------------------------------------------------------

export type WatcherEventType = 'create' | 'update' | 'delete';

/** One event, as `@parcel/watcher` reports it, and nothing more. */
export interface WatcherEvent {
  readonly type: WatcherEventType;
  readonly path: string;
}

/** Main to the process. */
export type ToWatcher =
  | {
      readonly kind: 'watch';
      readonly req: number;
      readonly dir: string;
      /** Plain ignore entries, as written. */
      readonly ignorePaths: readonly string[];
      /** The sources of flagless RegExp ignore entries. */
      readonly ignorePatterns: readonly string[];
    }
  | { readonly kind: 'close'; readonly req: number; readonly sub: number };

/** The process to main. */
export type FromWatcher =
  /** The process's message handler is installed. */
  | { readonly kind: 'ready' }
  /** A watch's answer: `sub` null is "nothing to watch" (the folder was not there). */
  | { readonly kind: 'watching'; readonly req: number; readonly sub: number | null; readonly waitedMs: number }
  /** The native subscribe threw; `error` is its message. */
  | { readonly kind: 'refused'; readonly req: number; readonly error: string }
  | { readonly kind: 'closed'; readonly req: number }
  | {
      readonly kind: 'events';
      readonly sub: number;
      readonly error: string | null;
      readonly events: readonly WatcherEvent[];
    }
  /** A turn waited past the queue's bound; main writes it as one line. */
  | {
      readonly kind: 'note';
      readonly what: 'turn-wait';
      readonly op: 'watch' | 'close';
      readonly waitedMs: number;
      /** How many operations were on the chain ahead of it when it joined. */
      readonly behind: number;
    };

// ---------------------------------------------------------------------------
// The validators. Both answer the message, re-built from exactly the fields
// the type names, or null; nothing else on the object survives.
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

/** A list of bounded strings, copied, or null. */
function stringsOf(value: unknown, entryMax: number): string[] | null {
  if (!Array.isArray(value) || value.length > WIRE_IGNORE_ENTRIES_MAX) return null;
  const out: string[] = [];
  for (const entry of value as unknown[]) {
    if (!boundedString(entry, 1, entryMax)) return null;
    out.push(entry);
  }
  return out;
}

/** A RegExp source list, each one a pattern the engine accepts, or null. */
function patternsOf(value: unknown): string[] | null {
  const sources = stringsOf(value, WIRE_IGNORE_ENTRY_MAX_CHARS);
  if (sources === null) return null;
  for (const source of sources) {
    try {
      new RegExp(source);
    } catch {
      return null;
    }
  }
  return sources;
}

function isEventType(value: unknown): value is WatcherEventType {
  return value === 'create' || value === 'update' || value === 'delete';
}

/** An event list, every event copied to its two fields, or null. */
function eventsOf(value: unknown): WatcherEvent[] | null {
  if (!Array.isArray(value)) return null;
  const out: WatcherEvent[] = [];
  for (const row of value as unknown[]) {
    if (!isObject(row)) return null;
    const type = row['type'];
    const path = row['path'];
    if (!isEventType(type) || !boundedString(path, 1, WIRE_EVENT_PATH_MAX_CHARS)) return null;
    out.push({ type, path });
  }
  return out;
}

/** A message main sent the process, or null. Run by the process, and by main before it sends. */
export function toWatcherOf(value: unknown): ToWatcher | null {
  if (!isObject(value)) return null;
  switch (value['kind']) {
    case 'watch': {
      const req = value['req'];
      const dir = value['dir'];
      if (!isCount(req) || !boundedString(dir, 1, WIRE_DIR_MAX_CHARS)) return null;
      const ignorePaths = stringsOf(value['ignorePaths'], WIRE_IGNORE_ENTRY_MAX_CHARS);
      if (ignorePaths === null) return null;
      const ignorePatterns = patternsOf(value['ignorePatterns']);
      if (ignorePatterns === null) return null;
      return { kind: 'watch', req, dir, ignorePaths, ignorePatterns };
    }
    case 'close': {
      const req = value['req'];
      const sub = value['sub'];
      if (!isCount(req) || !isCount(sub)) return null;
      return { kind: 'close', req, sub };
    }
    default:
      return null;
  }
}

/** A message the process sent main, or null. Run by main. */
export function fromWatcherOf(value: unknown): FromWatcher | null {
  if (!isObject(value)) return null;
  switch (value['kind']) {
    case 'ready':
      return { kind: 'ready' };
    case 'watching': {
      const req = value['req'];
      const sub = value['sub'];
      const waitedMs = value['waitedMs'];
      if (!isCount(req) || !isCount(waitedMs)) return null;
      if (sub !== null && !isCount(sub)) return null;
      return { kind: 'watching', req, sub, waitedMs };
    }
    case 'refused': {
      const req = value['req'];
      const error = value['error'];
      if (!isCount(req) || !boundedString(error, 0, WIRE_ERROR_MAX_CHARS)) return null;
      return { kind: 'refused', req, error };
    }
    case 'closed': {
      const req = value['req'];
      return isCount(req) ? { kind: 'closed', req } : null;
    }
    case 'events': {
      const sub = value['sub'];
      const error = value['error'];
      if (!isCount(sub)) return null;
      if (error !== null && !boundedString(error, 0, WIRE_ERROR_MAX_CHARS)) return null;
      const events = eventsOf(value['events']);
      if (events === null) return null;
      return { kind: 'events', sub, error, events };
    }
    case 'note': {
      const op = value['op'];
      const waitedMs = value['waitedMs'];
      const behind = value['behind'];
      if (value['what'] !== 'turn-wait') return null;
      if (op !== 'watch' && op !== 'close') return null;
      if (!isCount(waitedMs) || !isCount(behind)) return null;
      return { kind: 'note', what: 'turn-wait', op, waitedMs, behind };
    }
    default:
      return null;
  }
}

/** An error's message, clipped to the wire's bound. Never throws. */
export function errorText(err: unknown): string {
  let text: string;
  try {
    text = err instanceof Error ? err.message : String(err);
  } catch {
    text = 'unknown error';
  }
  return text.length > WIRE_ERROR_MAX_CHARS ? text.slice(0, WIRE_ERROR_MAX_CHARS) : text;
}
