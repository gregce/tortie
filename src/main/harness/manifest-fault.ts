/**
 * The manifest fault seam: a harness launch arms ONE broken connection error
 * at the next call of one session list operation, from a FILE (Phase 357).
 *
 * ## What it is for
 *
 * On 2026-11-05 every read of the session list in one running 0.114.0 threw
 * "database disk image is malformed" while the FILE passed the gate's full
 * integrity check at the next launch: the damage was in that connection's own
 * memory. Real page damage cannot make that case, because damaging a page
 * damages the file, and the fresh check the store's latch makes then says so
 * (build/p357/SPEC.md §2.1). So probe:p357 needs one more way to break the
 * connection, and this module is it: the next call of the named operation
 * throws a REAL better-sqlite3 `SqliteError` with SQLite's own code and words,
 * from inside the store's `through` (the hook is asked inside its `try`), so
 * the store's classifier reads it exactly as it reads real damage, and the
 * file is left fine.
 *
 * ## The shape
 *
 * `GMUX_HARNESS_MANIFEST_FAULT=<path>` names a JSON file. The file holds
 *
 *     { "seq": 1, "fail": { "operation": "listSessions", "code": "SQLITE_CORRUPT" } }
 *
 * The seam reads the file every 100 ms. Each `seq` newer than the last one it
 * took arms ONE throw at the NEXT call of `operation`, printing
 * `[gmux-harness] manifest fault armed: seq=<n> <operation> <code>`, and the
 * throw itself prints `[gmux-harness] manifest fault fired: …`, so a probe
 * waits on a line rather than a clock. A file that is not exactly that shape
 * is refused whole, with the reason printed, and nothing is armed from it: an
 * unknown key, a `seq` that is not a whole number at or above zero, an
 * operation `MANIFEST_OPERATIONS` does not name, a code other than
 * `SQLITE_CORRUPT` and `SQLITE_NOTADB`, and a `seq` that is not newer than the
 * last one taken, which is a replay and arms nothing again.
 *
 * `close` is refused by name although the list names it, because `close`
 * never asks the latch (it decides by it), so a fault armed there could never
 * fire and a probe would wait on nothing.
 *
 * ## The refusals, in `machineSeamPath`'s three terms
 *
 * It answers a path only on an isolated launch (GMUX_SMOKE or GMUX_SHOT) or
 * an armed probe run (GMUX_PROBES exactly `1`), only when GMUX_HARNESS_DIR is
 * set, and only when the profile sits inside that directory, compared by real
 * path, so `/var` and `/private/var` are one folder. A variable left in a
 * shell profile never reaches a person's real app. In every ordinary launch
 * this module does nothing at all, and the store's hook stays null.
 * build/conformance-stopped-list.mjs (rule S8) drives `manifestFaultPath`
 * over every environment shape and holds `installManifestFault` as the one
 * caller of `setManifestFaultHook`.
 *
 * ## What it does NOT do
 *
 * It writes nothing, opens nothing but the one file it is named, and starts
 * nothing. It never touches the database: the error it throws is constructed
 * here, and what happens next is the store's own latch.
 */

import Database from 'better-sqlite3';
import { readFileSync, statSync } from 'node:fs';
import { app } from 'electron';
import {
  MANIFEST_OPERATIONS,
  setManifestFaultHook,
  type ManifestOperation
} from '../manifest/store';
import { isInside } from './fold-stub';
import { isIsolatedLaunch } from './launch-gate';

/** The knob's own path, or null when this launch may not use it. */
export function manifestFaultPath(
  env: NodeJS.ProcessEnv,
  userDataDir: string
): string | null {
  const path = env['GMUX_HARNESS_MANIFEST_FAULT'] ?? '';
  if (path === '') return null;
  if (!isIsolatedLaunch(env) && env['GMUX_PROBES'] !== '1') return null;
  const harnessDir = env['GMUX_HARNESS_DIR'] ?? '';
  if (harnessDir === '') return null;
  if (!isInside(userDataDir, harnessDir)) return null;
  return path;
}

/**
 * The two codes the seam throws, each with SQLite's own words for it, which
 * are what better-sqlite3 hands a `SqliteError` for that code (measured over
 * real damage, build/p357/SPEC.md §2.1).
 */
export const MANIFEST_FAULT_CODES = Object.freeze({
  SQLITE_CORRUPT: 'database disk image is malformed',
  SQLITE_NOTADB: 'file is not a database'
} as const);

export type ManifestFaultCode = keyof typeof MANIFEST_FAULT_CODES;

/** One accepted file: its sequence, and the one call that will throw. */
export interface ManifestFaultFile {
  readonly seq: number;
  readonly fail: {
    readonly operation: ManifestOperation;
    readonly code: ManifestFaultCode;
  };
}

export type ManifestFaultRead =
  | { readonly file: ManifestFaultFile; readonly reason: null }
  | { readonly file: null; readonly reason: string };

const OPERATIONS: ReadonlySet<string> = new Set<string>(MANIFEST_OPERATIONS);
const CODES: ReadonlySet<string> = new Set<string>(Object.keys(MANIFEST_FAULT_CODES));
const TOP_KEYS: ReadonlySet<string> = new Set(['seq', 'fail']);
const FAIL_KEYS: ReadonlySet<string> = new Set(['operation', 'code']);

function plainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** A key named in a reason: quoted and short, so a hostile key is not a flood. */
function named(key: string): string {
  return JSON.stringify(key.length > 40 ? `${key.slice(0, 40)}…` : key);
}

const refused = (reason: string): ManifestFaultRead => ({ file: null, reason });

/**
 * Read one file's text as a fault file, or answer the reason it is not one.
 *
 * DROPPED WHOLE: one bad field refuses the file and nothing is armed from it,
 * because a half read fault is a reading the verifier cannot name.
 */
export function parseManifestFaultFile(text: string): ManifestFaultRead {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // The parser's own message quotes its input, so it is not repeated.
    return refused('not JSON');
  }
  if (!plainObject(parsed)) return refused('the top level is not an object');
  const strayTop = Object.keys(parsed).find((k) => !TOP_KEYS.has(k));
  if (strayTop !== undefined) {
    return refused(`the top level names ${named(strayTop)}, which is neither seq nor fail`);
  }
  const { seq, fail } = parsed;
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 0) {
    return refused('seq is not a whole number at or above zero');
  }
  if (!plainObject(fail)) return refused('fail is not an object');
  const strayFail = Object.keys(fail).find((k) => !FAIL_KEYS.has(k));
  if (strayFail !== undefined) {
    return refused(`fail names ${named(strayFail)}, which is neither operation nor code`);
  }
  const { operation, code } = fail;
  if (typeof operation !== 'string' || !OPERATIONS.has(operation)) {
    return refused('fail.operation is not a session list operation (MANIFEST_OPERATIONS)');
  }
  if (operation === 'close') {
    return refused('fail.operation is close, which never asks the latch, so the fault could never fire');
  }
  if (typeof code !== 'string' || !CODES.has(code)) {
    return refused('fail.code is neither SQLITE_CORRUPT nor SQLITE_NOTADB');
  }
  return {
    file: {
      seq,
      fail: { operation: operation as ManifestOperation, code: code as ManifestFaultCode }
    },
    reason: null
  };
}

/** The faults armed and not yet fired, and the hook that fires them. */
export interface ArmedManifestFaults {
  /** Arm one throw at the next call of the file's operation. */
  arm(file: ManifestFaultFile): void;
  /**
   * The store's hook. Throws ONE armed fault for this operation, the oldest,
   * as a real `SqliteError`, or returns and the call goes on untouched.
   */
  fire(operation: ManifestOperation): void;
  /** What is armed and not yet fired, oldest first. For the test. */
  pending(): readonly ManifestFaultFile[];
}

/** The armed faults, empty. Pure but for the line it says on each change. */
export function armedManifestFaults(say: (line: string) => void): ArmedManifestFaults {
  const queue: ManifestFaultFile[] = [];
  const label = (file: ManifestFaultFile): string =>
    `seq=${String(file.seq)} ${file.fail.operation} ${file.fail.code}`;
  return {
    arm(file) {
      queue.push(file);
      say(`[gmux-harness] manifest fault armed: ${label(file)}`);
    },
    fire(operation) {
      const at = queue.findIndex((file) => file.fail.operation === operation);
      if (at === -1) return;
      const file = queue.splice(at, 1)[0];
      if (file === undefined) return;
      say(`[gmux-harness] manifest fault fired: ${label(file)}`);
      throw new Database.SqliteError(MANIFEST_FAULT_CODES[file.fail.code], file.fail.code);
    },
    pending: () => [...queue]
  };
}

/** How often the file is read. 100 ms, so a probe waits on a line, not a clock. */
export const MANIFEST_FAULT_POLL_MS = 100;

/**
 * Watch one file and arm each new sequence once. Returns the stop.
 *
 * The file is read again only when its inode, size or modified time moved, so
 * each write is read once, and every refusal is said once per write.
 * Exported for the test; production calls {@link installManifestFault}.
 */
export function watchManifestFaultFile(
  path: string,
  armed: ArmedManifestFaults,
  say: (line: string) => void
): () => void {
  let lastSeq = -1;
  let lastStamp = '';
  const tick = (): void => {
    let stamp: string;
    try {
      const st = statSync(path);
      stamp = `${String(st.ino)}:${String(st.size)}:${String(st.mtimeMs)}`;
    } catch {
      return;
    }
    if (stamp === lastStamp) return;
    lastStamp = stamp;
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      return;
    }
    const read = parseManifestFaultFile(text);
    if (read.file === null) {
      say(`[gmux-harness] manifest fault file refused whole: ${read.reason}`);
      return;
    }
    if (read.file.seq <= lastSeq) {
      say(
        `[gmux-harness] manifest fault file refused whole: seq ${String(read.file.seq)} ` +
          `is not newer than seq ${String(lastSeq)}, so nothing is armed again`
      );
      return;
    }
    lastSeq = read.file.seq;
    armed.arm(read.file);
  };
  const timer = setInterval(tick, MANIFEST_FAULT_POLL_MS);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}

/**
 * Install the seam. Called once from the boot, beside the push seam. The hook
 * is set here and nowhere else in the app, and only after the three refusals
 * above answered a path.
 */
export function installManifestFault(): void {
  const path = manifestFaultPath(process.env, app.getPath('userData'));
  if (path === null) return;
  const say = (line: string): void => {
    console.log(line);
  };
  const armed = armedManifestFaults(say);
  setManifestFaultHook((operation) => armed.fire(operation));
  // SAID OUT LOUD, so a probe can wait for it before it writes a sequence.
  say(`[gmux-harness] manifest fault seam installed: one broken connection error per new seq, read from ${path}`);
  watchManifestFaultFile(path, armed, say);
}
