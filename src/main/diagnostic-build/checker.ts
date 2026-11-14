/**
 * The diagnostic build's handshake with its page-cache checker (Phase 364,
 * build/p364/SPEC.md D7).
 *
 * The checker is C inside the diagnostic build's better-sqlite3
 * (build/diagnostic/sqlite-checker.c). It writes its own lines into app.log,
 * synchronously, because a damaged connection that opens and closes inside one
 * call (the ring's, the integrity check's) faults at that close, and only a
 * line written before the close survives it (§0.1 item 9). This module tells
 * it, once, where app.log is:
 *
 *  1. make `<userData>/logs`, so the C side's open finds the folder. The
 *     prototype's first build ran before the folder existed and lost its line
 *     to stderr (§0.1 item 7);
 *  2. set TORTIE_CHECKER to `<app.log path>\t<home folder>`;
 *  3. run `SELECT 1` on a `:memory:` connection. That is the C side's first
 *     entry, where it reads the variable, unsets it and writes its own
 *     `diagnostic.armed` line;
 *  4. read whether it did, delete the variable either way, and log ONE error
 *     line only when nothing answered.
 *
 * src/main/index.ts calls it once, right after initLogging(), inside
 * `if (DIAGNOSTIC_BUILD)`. That is module scope, before any child process is
 * spawned, so no session, shell or agent ever inherits the variable.
 *
 * It never throws. A diagnostic build whose checker cannot be armed is still
 * his app, and the line says so.
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getLog, getLogsDir, isFileLoggingOn } from '../log';
import { LOG_FILE_NAME } from '../log/transport';

/** The one variable the C side reads, at its first entry, and removes. */
const CHECKER_VARIABLE = 'TORTIE_CHECKER';

/**
 * The C side splits the variable at its first tab and copies the path into a
 * 1,024 byte buffer (`tchkArm`), so a path holding a tab, or longer than 1,023
 * bytes, would reach it cut, and a cut path names a different file. Such a
 * path is never handed over: the variable then names no file, and the C side
 * writes its lines to stderr, as it does for a run that writes no app.log.
 */
const MAX_PATH_BYTES = 1023;

/** The line when nothing answered (SPEC §5). */
const NO_CHECKER = 'this diagnostic build has no page-cache checker';

/** The slice of better-sqlite3 the handshake uses. */
interface MemoryDatabase {
  prepare(source: string): { get(): unknown };
  close(): unknown;
}

interface ArmCheckerDeps {
  /** better-sqlite3's constructor: the module this process maps either holds the checker or does not. */
  Database: new (filename: string) => MemoryDatabase;
  /** `<userData>/logs`. */
  logsDir: () => string;
  /** `<userData>/logs/app.log`, or '' when this run writes no app.log. */
  appLogPath: () => string;
  /** The home folder, which the C side shortens to `~` in what it writes. */
  home: () => string;
  /** The one error line. */
  log: (msg: string, fields?: Record<string, unknown>) => void;
}

function defaultDeps(): ArmCheckerDeps {
  return {
    Database,
    logsDir: () => getLogsDir(),
    // A run that writes no app.log (dev without GMUX_LOG_FILE=1) hands over
    // no path, so the checker's lines reach the console like every other one.
    appLogPath: () => (isFileLoggingOn() ? join(getLogsDir(), LOG_FILE_NAME) : ''),
    home: () => homedir(),
    log: (msg, fields) => getLog('diagnostic').error(msg, fields)
  };
}

/** The path as the C side will read it, or '' when it would read another one. */
function pathToHandOver(path: string): string {
  if (path.includes('\t')) return '';
  if (Buffer.byteLength(path, 'utf8') > MAX_PATH_BYTES) return '';
  return path;
}

/**
 * Arm the checker. True when the C side answered, that is, it read and removed
 * the variable during the one `SELECT 1`. Never throws.
 */
export function armChecker(deps: Partial<ArmCheckerDeps> = {}): boolean {
  const d: ArmCheckerDeps = { ...defaultDeps(), ...deps };
  let answered = false;
  let error: string | null = null;
  try {
    const path = pathToHandOver(d.appLogPath());
    if (path !== '') {
      try {
        mkdirSync(d.logsDir(), { recursive: true });
      } catch {
        // The C side's open then fails and it writes to stderr instead. The
        // log module cannot write app.log either, so there is nothing to add.
      }
    }
    process.env[CHECKER_VARIABLE] = `${path}\t${d.home()}`;
    try {
      const db = new d.Database(':memory:');
      try {
        db.prepare('SELECT 1').get();
      } finally {
        db.close();
      }
    } finally {
      answered = process.env[CHECKER_VARIABLE] === undefined;
      delete process.env[CHECKER_VARIABLE];
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  if (!answered) {
    try {
      d.log(NO_CHECKER, error === null ? undefined : { error });
    } catch {
      /* the handshake never throws into main's first lines */
    }
  }
  return answered;
}
