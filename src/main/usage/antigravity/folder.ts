/**
 * The Antigravity usage folder (Phase 374): `<userData>/gmux/antigravity-usage`.
 *
 * Four kinds of name live in it and nothing else is ever written there:
 *
 *   status.sh          0700  the generated script (./script.ts), with the salt
 *   <session id>.json  0600  one session's last numbers, or `{}` before any
 *   guard.json         0600  the one agy file a bad start was seen from
 *   *.tmp              0600  a write that has not been renamed yet
 *
 * THREE RULES A LATER ROUND MUST NOT UNDO.
 *
 *  1. ONLY NAMES THIS FILE COMPOSED OR MATCHED ARE EVER REMOVED, one at a
 *     time, and the folder itself goes by `rmdir`, which refuses a folder that
 *     holds anything else. A person's file put there stays, and so does the
 *     folder around it.
 *  2. THE FOLDER IS A FOLDER. A link standing where it should be is never
 *     followed: nothing is written through it, listed through it or removed
 *     through it. The same is asked of every file read here, with a cap on its
 *     size and on how many are read.
 *  3. NOTHING HERE THROWS. Every door answers false, null or an empty list, so
 *     a full disk costs the meter its numbers and never a session its start.
 *
 * WHICH SESSION IDS ARE KNOWN is a question main answers once, at boot
 * ({@link bootAntigravityUsage}), because an id the session list does not hold,
 * or holds only as a removed row, is not this meter's to draw. Before that
 * answer exists nothing is listed at all.
 */

import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  readdirSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import type { FileIdentity } from '../../agents/detection';
import { getLog } from '../../log';
import { getSettings } from '../../settings/store';
import { antigravityStatusScript, saltOf } from './script';

const log = getLog('usage');

const SCRIPT_NAME = 'status.sh';
const GUARD_NAME = 'guard.json';

/** A session id as Tortie makes them, and the only id a file is named for. */
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** A session's file, or a write of it that was never renamed. */
const SESSION_FILE = /^([0-9a-f-]{36})\.json(\.\d+\.tmp)?$/;
/** A script or a guard that was never renamed. */
const OWN_TMP = /^(status\.sh|guard\.json)\.\d+\.tmp$/;

/** The most names one listing looks at. */
const MAX_NAMES = 512;
/** The most bytes one session's file may hold to be read. The kept line is under 700. */
const MAX_FILE_BYTES = 4096;
/** The most bytes of a script read back for its salt. The generated one is under 5 KB. */
const MAX_SCRIPT_BYTES = 65_536;

/** `<userData>/gmux/antigravity-usage`, and never a path under the person's home. */
export function antigravityUsageDir(): string {
  return join(app.getPath('userData'), 'gmux', 'antigravity-usage');
}

/** Where the generated script stands. */
export function antigravityScriptPath(): string {
  return join(antigravityUsageDir(), SCRIPT_NAME);
}

/** One session's file. */
function sessionFile(dir: string, id: string): string {
  return join(dir, `${id}.json`);
}

/** TRUE when the folder is there, is a folder and not a link, and is this user's own. */
function folderStands(dir: string): boolean {
  try {
    const st = lstatSync(dir);
    return st.isDirectory() && (process.getuid === undefined || st.uid === process.getuid());
  } catch {
    return false;
  }
}

/** Make the folder, private, and say whether it can be used. */
function ensureFolder(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    if (!folderStands(dir)) return false;
    chmodSync(dir, 0o700);
    return true;
  } catch {
    return false;
  }
}

/** A small regular file's text, never through a link, or null. */
function readSmall(path: string, cap: number): string | null {
  let fd = -1;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    if (!fstatSync(fd).isFile()) return null;
    const buf = Buffer.alloc(cap + 1);
    let held = 0;
    for (;;) {
      const read = readSync(fd, buf, held, buf.length - held, null);
      if (read === 0) break;
      held += read;
      if (held > cap) return null;
    }
    return buf.toString('utf8', 0, held);
  } catch {
    return null;
  } finally {
    if (fd >= 0) {
      try {
        closeSync(fd);
      } catch {
        /* a descriptor that will not close is not this read's to report */
      }
    }
  }
}

/** Remove one name this file composed or matched. Never a folder, never through a link. */
function removeName(dir: string, name: string): void {
  try {
    unlinkSync(join(dir, name));
  } catch {
    /* gone already, or not removable now; the next sweep asks again */
  }
}

/** Write text under a temporary name, then rename it into place. Throws. */
function writeWhole(path: string, text: string, mode: number): void {
  const tmp = `${path}.${String(process.pid)}.tmp`;
  // A temporary name left by a crash would keep its old mode through a write,
  // and a link planted at that name would be written through.
  try {
    unlinkSync(tmp);
  } catch {
    /* there was none */
  }
  writeFileSync(tmp, text, { encoding: 'utf8', mode, flag: 'wx' });
  try {
    chmodSync(tmp, mode);
    renameSync(tmp, path);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      /* the sweep takes it */
    }
    throw err;
  }
}

/** Write the script when its bytes or its mode differ, keeping the salt it already carries. */
function ensureScript(dir: string): boolean {
  const path = join(dir, SCRIPT_NAME);
  try {
    const held = readSmall(path, MAX_SCRIPT_BYTES);
    const salt = (held === null ? null : saltOf(held)) ?? randomBytes(16).toString('hex');
    const text = antigravityStatusScript({ dir, salt });
    if (held === text && (lstatSync(path).mode & 0o777) === 0o700) return true;
    writeWhole(path, text, 0o700);
    return true;
  } catch {
    return false;
  }
}

/**
 * Make the place one new session may write, and the script beside it.
 *
 * Answers the script's path, or null when anything at all could not be made,
 * and then the caller starts the session exactly as it would have without this
 * phase. The place holds `{}`, which parses as no reading.
 */
export function openAntigravitySlot(id: string): string | null {
  if (!SESSION_ID.test(id)) return null;
  const dir = antigravityUsageDir();
  if (!ensureFolder(dir) || !ensureScript(dir)) return null;
  try {
    writeFileSync(sessionFile(dir, id), '{}\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  } catch {
    return null;
  }
  slotOpened = true;
  return join(dir, SCRIPT_NAME);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** One session's file as it stands. */
export interface AntigravityFile {
  readonly id: string;
  readonly text: string;
  readonly mtimeMs: number;
}

/** What answers which session ids are known. Null until boot hands it over. */
let knownIds: (() => Iterable<string>) | null = null;
/** One line per process for an id nobody knows, with how many the first listing met. */
let unknownLogged = false;

/** True once this process made a place for a session. */
let slotOpened = false;

/** Has this process made a place, and not removed the folder since? Memory alone. */
export function antigravitySlotOpened(): boolean {
  return slotOpened;
}

/** Test seam: back to a process that has not booted. */
export function resetAntigravityFolderForTests(): void {
  knownIds = null;
  slotOpened = false;
  unknownLogged = false;
}

/** The known ids now, or null when the session list cannot be read. */
function knownNow(): ReadonlySet<string> | null {
  if (knownIds === null) return null;
  try {
    return new Set(knownIds());
  } catch {
    // A session list that stopped reading says nothing about any id. Nothing
    // is drawn from it and nothing is removed because of it.
    return null;
  }
}

/**
 * Every known session's file, at most {@link MAX_NAMES} of them, each a regular
 * file of at most {@link MAX_FILE_BYTES}. The text is whatever is there; what it
 * means is ./receive.ts's.
 */
export function listAntigravityFiles(): AntigravityFile[] {
  const dir = antigravityUsageDir();
  if (!folderStands(dir)) return [];
  let names: string[];
  try {
    names = readdirSync(dir).filter((name) => SESSION_ID.test(name.slice(0, -'.json'.length)) && name.endsWith('.json'));
  } catch {
    return [];
  }
  if (names.length === 0) return [];
  const known = knownNow();
  if (known === null) return [];
  const out: AntigravityFile[] = [];
  let unknown = 0;
  for (const name of names.slice(0, MAX_NAMES)) {
    const id = name.slice(0, -'.json'.length);
    if (!known.has(id)) {
      unknown += 1;
      continue;
    }
    try {
      const path = join(dir, name);
      // The time is asked of the name first, so a file replaced between the two
      // reads is dated by the older one, and the next listing dates it right.
      const { mtimeMs } = lstatSync(path);
      const text = readSmall(path, MAX_FILE_BYTES);
      if (text !== null) out.push({ id, text, mtimeMs });
    } catch {
      /* replaced or removed as it was read; the next listing reads it */
    }
  }
  if (unknown > 0 && !unknownLogged) {
    unknownLogged = true;
    log.info('usage.antigravity.unknown-session', { files: unknown });
  }
  return out;
}

/** When the folder itself last moved, or null when there is none. One stat. */
export function antigravityFolderMtime(): number | null {
  const dir = antigravityUsageDir();
  try {
    const st = lstatSync(dir);
    return st.isDirectory() ? st.mtimeMs : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lifetimes
// ---------------------------------------------------------------------------

/** A removed session's own file and its unrenamed writes go with it. */
export function forgetAntigravitySession(id: string): void {
  if (!SESSION_ID.test(id)) return;
  const dir = antigravityUsageDir();
  if (!folderStands(dir)) return;
  removeName(dir, `${id}.json`);
  try {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(`${id}.json.`) && SESSION_FILE.test(name)) removeName(dir, name);
    }
  } catch {
    /* the boot sweep takes what is left */
  }
}

/** TRUE when the third switch is on. Any failure to read it is off. */
export function antigravityMeterOn(): boolean {
  try {
    return getSettings().usage.antigravity === true;
  } catch {
    return false;
  }
}

/**
 * The boot's one call. It keeps the question of which ids are known, and then
 * either sweeps the folder or, with the switch off, removes what Tortie put
 * there. `ids` answers the sessions a person has, a removed one counting as
 * none, and it is asked again at every listing.
 */
export function bootAntigravityUsage(ids: () => Iterable<string>): void {
  knownIds = ids;
  if (!antigravityMeterOn()) {
    clearAntigravityUsage();
    return;
  }
  const dir = antigravityUsageDir();
  if (!folderStands(dir)) return;
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  const known = knownNow();
  for (const name of names) {
    if (OWN_TMP.test(name)) {
      removeName(dir, name);
      continue;
    }
    const found = name.match(SESSION_FILE);
    if (found === null) continue;
    const unrenamed = found[2] !== undefined;
    if (unrenamed || (known !== null && !known.has(found[1] ?? ''))) removeName(dir, name);
  }
}

/**
 * Off deletes. Every name that is this file's to remove goes, and the folder
 * with it when nothing else is in it. A session still running then finds no
 * script and answers 0.
 */
export function clearAntigravityUsage(): void {
  slotOpened = false;
  const dir = antigravityUsageDir();
  if (!folderStands(dir)) return;
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === SCRIPT_NAME || name === GUARD_NAME || OWN_TMP.test(name) || SESSION_FILE.test(name)) {
      removeName(dir, name);
    }
  }
  try {
    rmdirSync(dir);
  } catch {
    /* something that is not Tortie's is in it, so it stays */
  }
}

// ---------------------------------------------------------------------------
// The launch guard's one file (the rule is ./launch.ts's)
// ---------------------------------------------------------------------------

/** The agy file a bad start was seen from, or null. */
export function readAntigravityGuard(): FileIdentity | null {
  const dir = antigravityUsageDir();
  if (!folderStands(dir)) return null;
  const text = readSmall(join(dir, GUARD_NAME), MAX_FILE_BYTES);
  if (text === null) return null;
  try {
    const raw: unknown = JSON.parse(text);
    if (raw === null || typeof raw !== 'object') return null;
    const { real, dev, ino, size, mtimeMs, ctimeMs } = raw as Record<string, unknown>;
    if (typeof real !== 'string') return null;
    const numbers = [dev, ino, size, mtimeMs, ctimeMs];
    if (!numbers.every((x) => typeof x === 'number' && Number.isFinite(x))) return null;
    return { real, dev, ino, size, mtimeMs, ctimeMs } as FileIdentity;
  } catch {
    return null;
  }
}

/** Keep the agy file a bad start was seen from. False when it could not be kept. */
export function writeAntigravityGuard(identity: FileIdentity): boolean {
  const dir = antigravityUsageDir();
  if (!folderStands(dir)) return false;
  const { real, dev, ino, size, mtimeMs, ctimeMs } = identity;
  try {
    writeWhole(join(dir, GUARD_NAME), `${JSON.stringify({ real, dev, ino, size, mtimeMs, ctimeMs })}\n`, 0o600);
    return true;
  } catch {
    return false;
  }
}

/** The held file changed, so the guard has nothing left to say. */
export function removeAntigravityGuard(): void {
  const dir = antigravityUsageDir();
  if (folderStands(dir)) removeName(dir, GUARD_NAME);
}
