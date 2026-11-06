/**
 * Local crash capture (Phase 35, research 42 sections 6 and 10), and the two
 * process handlers that write every uncaught exception and unhandled
 * rejection in main to app.log (Phase 357).
 *
 * crashReporter.start({ uploadToServer: false }) runs before app ready and
 * costs 25 to 33 ms (measured). Dumps land under `<userData>/Crashpad` and
 * they STAY there: research 42's lab read a live token value out of a
 * minidump's environment block, so research 37's refusal of transmission is
 * confirmed by bytes. No code path here or anywhere may upload a dump.
 *
 * With uploads off, getLastCrashReport returns a stub (measured), so the
 * crash detection mechanism is a readdir of pending/ and completed/ diffed
 * against the run sentinel's recorded names. The sweep caps the directory
 * at the newest 5 dumps and 30 days, because Crashpad's own prune policy is
 * unverified against Electron 43 and Tortie owns its footprint budget.
 *
 * `startCrashCapture` is the one electron import in this file; the scan and
 * the sweep are pure over a directory for the unit tests.
 *
 * ## The two handlers (Phase 357, build/p357/SPEC.md §4.4, D16 to D18)
 *
 * Until Phase 357 main registered no `uncaughtException` and no
 * `unhandledRejection` listener. On his Mac 0.114.0's session list stopped
 * reading while it ran, every refresh threw from a timer, Electron drew one
 * dialog per throw, and app.log recorded nothing at all. Electron's own
 * handler is one line, read out of the shipped Electron Framework 43.3.0:
 *
 *     process.on("uncaughtException", function (e) {
 *       process.listenerCount("uncaughtException") > 1 ||
 *         dialog.showErrorBox("A JavaScript error occurred in the main process",
 *           "Uncaught Exception:\n" + (e.stack ? e.stack : `${e.name}: ${e.message}`)) })
 *
 * so ANY second listener silences it. The handler here therefore draws that
 * same dialog itself, in Electron's own words, once per distinct error.
 *
 * - THE RECORD (`crashRecordOf`): the error's name, its `code` when that is a
 *   string, and its frames, being the stack's `at` lines after the message is
 *   cut off the front, at most 12, each at most 300 characters (a stack whose
 *   message cannot be found keeps no frames, because a guessed frame could be
 *   that message's own text). The message
 *   is kept ONLY for a better-sqlite3 `SqliteError`, clipped to 120, because
 *   SQLite's text is its own fixed vocabulary. Any other message can hold a
 *   person's data (V8's JSON.parse error quotes its input), so only its length
 *   is kept, as `messageChars`. Every string is home-redacted before it is
 *   clipped, so a clip never leaves half a home path that redaction misses.
 * - THE KEY (`crashKeyOf`): the sha256 of the origin, the name, the code and
 *   the frames. The spec names the last three; the origin is added so an
 *   uncaught exception is never left undrawn because a rejection with the same
 *   frames came first. The message is not in it, so the same throw with a
 *   different path in its message is the same error.
 * - THE FIRST SIGHTING of a key writes one record at scope `crash`,
 *   `crash.uncaught` or `crash.rejection`, carrying the key, and one stderr
 *   line, `[gmux-crash] <uncaught exception|unhandled rejection>: <name>
 *   <code>`. For an uncaught exception it then draws Electron's dialog, except
 *   in a harness launch, where nobody is at the screen to answer it, and
 *   except for the session list's own refusal (`isStopped`, D18), whose notice
 *   has already told the person.
 * - A REPEAT draws nothing, writes nothing and is counted. `flushCrashRepeats`
 *   writes the counts once, at quit, as `crash.repeats`, each under its key.
 * - A REJECTION never draws (D17). Electron 43's main process printed Node's
 *   `UnhandledPromiseRejectionWarning` for one and drew nothing (measured by
 *   the spec step), and the stderr line keeps that terminal story.
 * - One run remembers at most `CRASH_KEYS_KEPT` distinct errors. Past that the
 *   one seen least recently is forgotten, so a new error is still written and
 *   drawn once, and an error that keeps repeating is never forgotten.
 * - NEITHER HANDLER MAY THROW. A throw inside an `uncaughtException` listener
 *   ends the process (Node exits 7), so every read of the error is guarded and
 *   the whole body sits in one try.
 *
 * The electron and log bindings are injected (`CrashHandlerDeps`), handed in
 * by src/main/index.ts. ./index.ts imports this file, so an import back would
 * close a runtime cycle (build/assert-no-runtime-cycles.mjs), and injection is
 * also what lets the unit tests drive both handlers in plain node through an
 * installer of their own. This file imports nothing from the manifest.
 */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { crashReporter } from 'electron';
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { redactString } from './redact';

/** How many dumps the sweep keeps. Worst case 5 x 1.6 MB = 8 MB. */
export const CRASH_DUMPS_KEPT = 5;
/** Dumps older than this go regardless of the count. */
export const CRASH_DUMP_MAX_AGE_DAYS = 30;

/**
 * Start local crash capture, then the two process handlers. Must run before
 * app ready. uploadToServer is false and nothing may ever flip it: the
 * fragment below is pinned into the shipped bundle by
 * build/assert-bundle-refusals.mjs.
 */
export function startCrashCapture(deps: CrashHandlerDeps): void {
  try {
    crashReporter.start({ uploadToServer: false });
  } catch (err) {
    // A run without crash capture is degraded, not broken.
    console.warn(
      `[gmux-log] crash capture did not start: ${(err as Error).message}`
    );
  }
  installCrashHandlers(deps);
}

export interface CrashDumpInfo {
  /** File name, e.g. "7f3a....dmp". */
  name: string;
  /** Bytes on disk. */
  bytes: number;
  /** mtime, epoch milliseconds. */
  mtimeMs: number;
  /** Absolute path, for the sweep. */
  path: string;
}

/** The two Crashpad directories dumps can sit in with uploads off. */
const DUMP_DIRS = ['pending', 'completed', 'new'] as const;

/**
 * Inventory every .dmp under the Crashpad directory's pending/, completed/
 * and new/ subdirectories. Missing directories read as empty.
 */
export function scanCrashDumps(crashpadDir: string): CrashDumpInfo[] {
  const dumps: CrashDumpInfo[] = [];
  for (const sub of DUMP_DIRS) {
    const dir = join(crashpadDir, sub);
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.dmp')) continue;
      const path = join(dir, name);
      try {
        const stat = statSync(path);
        if (!stat.isFile()) continue;
        dumps.push({ name, bytes: stat.size, mtimeMs: stat.mtimeMs, path });
      } catch {
        /* a dump that vanished mid-scan is simply not in the inventory */
      }
    }
  }
  return dumps;
}

/**
 * Cap the dump set: keep the newest `keep`, and of those only the ones
 * younger than `maxAgeDays`. Everything else is deleted. Returns the names
 * removed. Never throws.
 */
export function sweepCrashDumps(
  crashpadDir: string,
  keep: number = CRASH_DUMPS_KEPT,
  maxAgeDays: number = CRASH_DUMP_MAX_AGE_DAYS,
  now: number = Date.now()
): string[] {
  const removed: string[] = [];
  const cutoff = now - maxAgeDays * 24 * 60 * 60 * 1000;
  const dumps = scanCrashDumps(crashpadDir).sort(
    (a, b) => b.mtimeMs - a.mtimeMs
  );
  dumps.forEach((dump, index) => {
    if (index < keep && dump.mtimeMs >= cutoff) return;
    try {
      unlinkSync(dump.path);
      removed.push(dump.name);
    } catch {
      /* an undeletable dump is left for the next boot's sweep */
    }
  });
  return removed;
}

// ---------------------------------------------------------------------------
// The two process handlers (Phase 357)
// ---------------------------------------------------------------------------

/** How many `at` lines a record keeps (D16). */
const CRASH_FRAMES_KEPT = 12;
/** How long one kept `at` line may be (D16). */
const CRASH_FRAME_CHARS = 300;
/** How much of a SqliteError's own message a record keeps (D16). */
const CRASH_SQLITE_MESSAGE_CHARS = 120;
/**
 * How long a name or a code may be. Both are constants in every error this
 * tree throws; the clip only bounds a thrown object whose name is not one.
 */
const CRASH_LABEL_CHARS = 120;
/** How many distinct errors one run remembers before it forgets the stalest. */
const CRASH_KEYS_KEPT = 1_000;
/** How many keys the quit's `crash.repeats` record lists, most counted first. */
const CRASH_REPEATS_LISTED = 100;

/** Electron's own title, byte for byte (Electron Framework 43.3.0). */
const ELECTRON_DIALOG_TITLE = 'A JavaScript error occurred in the main process';

/** Where an error came from: `uncaughtException` or `unhandledRejection`. */
export type CrashOrigin = 'uncaught' | 'rejection';

/** What app.log may hold about one error. Never a message but SQLite's. */
export interface CrashRecord {
  readonly origin: CrashOrigin;
  readonly name: string;
  /** Present when the error's `code` is a string. */
  readonly code?: string;
  /** The stack's `at` lines after the message, at most 12 of 300 characters. */
  readonly frames: readonly string[];
  /** SQLite's own text, clipped to 120: a better-sqlite3 SqliteError alone. */
  readonly message?: string;
  /** The message's length, for every other error. Its text is never kept. */
  readonly messageChars?: number;
}

/** The message half of a record: one of the two, never both. */
export type CrashMessage =
  | { readonly message: string }
  | { readonly messageChars: number };

/** The records this module writes. */
export type CrashEvent = 'crash.uncaught' | 'crash.rejection' | 'crash.repeats';

/**
 * The slice of ./index.ts's `logEvent` this module writes through. The
 * shipping `logEvent` is assignable to it, and src/main/index.ts hands it in.
 */
export type CrashLogEvent = (
  scope: 'crash',
  level: 'error' | 'warn',
  event: CrashEvent,
  msg: string,
  fields: Record<string, unknown>,
  options: { console: boolean }
) => void;

/** What the handlers are handed, all of it by src/main/index.ts. */
export interface CrashHandlerDeps {
  /** `logEvent`. */
  readonly log: CrashLogEvent;
  /** `dialog.showErrorBox`. */
  readonly showErrorBox: (title: string, content: string) => void;
  /** `isHarnessLaunch(process.env)`: a harness launch is never shown a dialog. */
  readonly harness: boolean;
  /** `isManifestStopped`: the session list's own refusal is never drawn (D18). */
  readonly isStopped: (err: unknown) => boolean;
}

/** The two listeners, handed to whatever registers them. */
export interface CrashListeners {
  readonly uncaught: (err: unknown) => void;
  readonly rejection: (reason: unknown) => void;
}

/** Registers the two listeners: `process.on` in the app, a recorder in a test. */
export type CrashListenerInstaller = (listeners: CrashListeners) => void;

/** One run's memory of what it has written. */
interface CrashMemory {
  readonly deps: CrashHandlerDeps;
  /** key → how many times it was seen, least recently seen first. */
  readonly counts: Map<string, number>;
  /** How many keys were forgotten to stay inside `CRASH_KEYS_KEPT`. */
  forgotten: number;
  /** True once the quit's record is written. */
  flushed: boolean;
}

/** The memory `flushCrashRepeats` reads: the last install's. */
let memory: CrashMemory | null = null;
/** True once the two listeners are on the process, so they go on it once. */
let onProcess = false;

/** A property read that cannot throw, whatever the thrown value is. */
function read(value: unknown, key: string): unknown {
  if (value === null) return undefined;
  if (typeof value !== 'object' && typeof value !== 'function') return undefined;
  try {
    return (value as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

/** String() that cannot throw (a symbol, or an object whose toString throws). */
function text(value: unknown): string {
  try {
    return String(value);
  } catch {
    return '';
  }
}

/**
 * Cut `value` to at most `max` UTF-16 units without splitting a surrogate
 * pair, so a clipped string is still well formed.
 */
function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  const end = /[\uD800-\uDBFF]/.test(value.charAt(max - 1)) ? max - 1 : max;
  return value.slice(0, end);
}

/** The home directory, or the empty string redaction leaves alone. */
function homeNow(): string {
  try {
    return homedir();
  } catch {
    return '';
  }
}

/**
 * The text a value would show as its message: an error's `message`, or a
 * thrown string itself. Read for three things only: cutting the message off
 * the stack, the length a record keeps, and Electron's dialog.
 */
function messageTextOf(value: unknown): string {
  if (typeof value === 'string') return value;
  const message = read(value, 'message');
  return typeof message === 'string' ? message : '';
}

/** better-sqlite3's own class. A prototype walk that throws is not one. */
function isSqliteError(err: unknown): boolean {
  try {
    return err instanceof Database.SqliteError;
  } catch {
    return false;
  }
}

/**
 * The message half of a record (D16). A better-sqlite3 SqliteError keeps
 * SQLite's own text, redacted and clipped to 120 characters; any other value
 * keeps the length of its message and none of its text. By class, never by
 * name, so an object that calls itself `SqliteError` keeps nothing.
 */
export function crashMessageOf(
  err: unknown,
  homeDir: string = homeNow()
): CrashMessage {
  const message = messageTextOf(err);
  if (isSqliteError(err)) {
    return {
      message: clip(redactString(message, homeDir), CRASH_SQLITE_MESSAGE_CHARS)
    };
  }
  return { messageChars: message.length };
}

/** A V8 frame line: indented, then `at `. */
const FRAME_LINE = /^\s+at\s/;

/**
 * The stack's lines with the message cut off the front.
 *
 * V8 writes a stack as its header, `<name>: <message>` (or whichever of the
 * two is not empty, with a missing name read as `Error`), then a line break
 * and one indented `at` line per frame. A message is free text, and a message
 * holding a newline and an indented `at` looks exactly like a frame, so the
 * header is cut by what it IS, and only where a line break follows it:
 *
 * 1. the header V8 writes, when the stack starts with it. V8 formats a stack
 *    lazily, at its first read, so a message or a name changed before that
 *    read is already in it (measured on Node 22's V8);
 * 2. else up to the message where it ends the stack's first line and follows
 *    a `: `, which is a name changed after the stack was read, or Node's own
 *    `TypeError [ERR_X]: <message>` header. Both conditions are required, so a
 *    message changed to a few words that happen to end one of the old
 *    message's later lines is not taken for the header;
 * 3. else nothing at all. A message changed after the stack was read, or a
 *    stack written by hand, leaves no way to tell where the old message ends,
 *    and a frame guessed from it could be that message's text.
 */
function stackLinesAfterMessage(err: unknown, stack: string): string[] {
  const rawName = read(err, 'name');
  const rawMessage = read(err, 'message');
  const name = rawName === undefined ? 'Error' : text(rawName);
  const message = rawMessage === undefined ? '' : text(rawMessage);
  const header =
    name !== '' && message !== '' ? `${name}: ${message}` : name !== '' ? name : message;
  if (header !== '' && (stack === header || stack.startsWith(`${header}\n`))) {
    return stack.slice(header.length).split('\n');
  }
  if (message !== '') {
    const at = stack.indexOf(`${message}\n`);
    const before = at >= 0 ? stack.slice(0, at) : '\n';
    if (!before.includes('\n') && (before === '' || before.endsWith(': '))) {
      return stack.slice(at + message.length).split('\n');
    }
  }
  return [];
}

/** The kept frames: at most 12 `at` lines, each redacted and then clipped. */
function framesOf(err: unknown, homeDir: string): string[] {
  const stack = read(err, 'stack');
  if (typeof stack !== 'string') return [];
  return stackLinesAfterMessage(err, stack)
    .filter((line) => FRAME_LINE.test(line))
    .slice(0, CRASH_FRAMES_KEPT)
    .map((line) => clip(redactString(line.trim(), homeDir), CRASH_FRAME_CHARS));
}

/** The name a record keeps: the error's own, or what the thrown value is. */
function nameOf(err: unknown, homeDir: string): string {
  const name = read(err, 'name');
  if (typeof name === 'string' && name !== '') {
    return clip(redactString(name, homeDir), CRASH_LABEL_CHARS);
  }
  return err === null ? 'null' : typeof err;
}

/**
 * Everything app.log may hold about one error (D16). Pure but for the home
 * directory, which is an argument for the tests. Never throws.
 */
export function crashRecordOf(
  err: unknown,
  origin: CrashOrigin,
  homeDir: string = homeNow()
): CrashRecord {
  const code = read(err, 'code');
  return {
    origin,
    name: nameOf(err, homeDir),
    ...(typeof code === 'string'
      ? { code: clip(redactString(code, homeDir), CRASH_LABEL_CHARS) }
      : {}),
    frames: framesOf(err, homeDir),
    ...crashMessageOf(err, homeDir)
  };
}

/**
 * The key one error is remembered under: the sha256, in hex, of its origin,
 * name, code and frames. Its message is not in it.
 */
export function crashKeyOf(record: CrashRecord): string {
  return createHash('sha256')
    .update(
      JSON.stringify([record.origin, record.name, record.code ?? null, record.frames])
    )
    .digest('hex');
}

/** Electron's own dialog text for an uncaught exception, byte for byte. */
function electronDialogText(err: unknown): string {
  const stack = read(err, 'stack');
  return (
    'Uncaught Exception:\n' +
    (stack ? text(stack) : `${text(read(err, 'name'))}: ${text(read(err, 'message'))}`)
  );
}

/** The one-line summary the record's `msg` and the stderr line both carry. */
function summaryOf(record: CrashRecord): string {
  const what = record.origin === 'uncaught' ? 'uncaught exception' : 'unhandled rejection';
  return `${what}: ${record.name}${record.code !== undefined && record.code !== '' ? ` ${record.code}` : ''}`;
}

/** The session list's refusal (D18). A check that throws is not a refusal. */
function isStoppedRefusal(deps: CrashHandlerDeps, err: unknown): boolean {
  try {
    return deps.isStopped(err) === true;
  } catch {
    return false;
  }
}

/**
 * Count one sighting. True when the key was not in memory, which makes this
 * the first sighting; the key moves to the most recent end either way, and
 * the stalest key is forgotten when memory is full.
 */
function firstSighting(mem: CrashMemory, key: string): boolean {
  const seen = mem.counts.get(key);
  if (seen !== undefined) {
    mem.counts.delete(key);
    mem.counts.set(key, seen + 1);
    return false;
  }
  if (mem.counts.size >= CRASH_KEYS_KEPT) {
    const stalest = mem.counts.keys().next();
    if (stalest.done !== true) {
      mem.counts.delete(stalest.value);
      mem.forgotten += 1;
    }
  }
  mem.counts.set(key, 1);
  return true;
}

/** Run one step of a first sighting, so a step that throws costs only itself. */
function step(run: () => void): void {
  try {
    run();
  } catch {
    /* the next step still runs: a record that could not be written must not cost the dialog */
  }
}

/** One uncaught exception or one unhandled rejection. Never throws. */
function noteCrash(mem: CrashMemory, err: unknown, origin: CrashOrigin): void {
  try {
    const record = crashRecordOf(err, origin);
    const key = crashKeyOf(record);
    // A repeat only counts: no record, no stderr line, no dialog.
    if (!firstSighting(mem, key)) return;
    const summary = summaryOf(record);
    step(() =>
      mem.deps.log(
        'crash',
        'error',
        origin === 'uncaught' ? 'crash.uncaught' : 'crash.rejection',
        summary,
        { key, ...record },
        { console: false }
      )
    );
    step(() => console.error(`[gmux-crash] ${summary}`));
    // A rejection draws nothing, as today (D17).
    if (origin !== 'uncaught') return;
    // Nobody is at the screen of a harness launch to answer a dialog.
    if (mem.deps.harness) return;
    // The session list's refusal already said so in its notice (D18).
    if (isStoppedRefusal(mem.deps, err)) return;
    mem.deps.showErrorBox(ELECTRON_DIALOG_TITLE, electronDialogText(err));
  } catch {
    /* a throw here would end the process: Node exits 7 when a listener throws */
  }
}

/** The app's installer: the two listeners on the process itself. */
function installOnProcess(listeners: CrashListeners): void {
  process.on('uncaughtException', listeners.uncaught);
  process.on('unhandledRejection', listeners.rejection);
}

/**
 * Install the two handlers. In the app the listeners go on the process, once
 * however often this is called, because a second pair would write every
 * error twice; a test hands an installer of its own and gets a fresh memory
 * each time.
 */
export function installCrashHandlers(
  deps: CrashHandlerDeps,
  install: CrashListenerInstaller = installOnProcess
): void {
  if (install === installOnProcess) {
    if (onProcess) return;
    onProcess = true;
  }
  const mem: CrashMemory = { deps, counts: new Map(), forgotten: 0, flushed: false };
  memory = mem;
  install({
    uncaught: (err) => noteCrash(mem, err, 'uncaught'),
    rejection: (reason) => noteCrash(mem, reason, 'rejection')
  });
}

/**
 * The quit's one record of the repeats: every key seen more than once, with
 * its count, most counted first, and how many keys were forgotten. Written
 * once (a second call writes nothing) and only when there is something to
 * say. Called from the ordered quit disposer's first synchronous lines.
 * Never throws.
 */
export function flushCrashRepeats(): void {
  const mem = memory;
  if (mem === null || mem.flushed) return;
  mem.flushed = true;
  try {
    const repeated = [...mem.counts]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);
    if (repeated.length === 0 && mem.forgotten === 0) return;
    mem.deps.log(
      'crash',
      'warn',
      'crash.repeats',
      'errors seen more than once this run',
      {
        repeats: repeated
          .slice(0, CRASH_REPEATS_LISTED)
          .map(([key, count]) => ({ key, count })),
        ...(repeated.length > CRASH_REPEATS_LISTED
          ? { more: repeated.length - CRASH_REPEATS_LISTED }
          : {}),
        ...(mem.forgotten > 0 ? { forgotten: mem.forgotten } : {})
      },
      { console: true }
    );
  } catch {
    /* never throw into the quit path */
  }
}
