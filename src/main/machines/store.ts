/**
 * When `machines.json` is read, and the only place it is read.
 *
 * Phase 68, and the shape is `../config/store.ts`'s shape on purpose. Three
 * moments and no others.
 *
 *  1. At boot, once, from `initMachines`.
 *  2. On an explicit reload the person asked for.
 *  3. On a file watcher, after a 300 ms debounce.
 *
 * **Never on a path that opens a session, and never on a path that connects to
 * anything.** Phase 68 builds no such path at all, and this module is written
 * so that the next phase cannot add one by accident: `currentMachines()` reads
 * memory and has no code that could touch the disk.
 *
 * ## Tortie writes this file, and that is the difference from agents.json
 *
 * `agents.json` is the user's file and Tortie never writes it. `machines.json`
 * is different: Tortie writes it when a person adds or removes a machine in
 * Settings, and a person may also edit it by hand. Either way a row does
 * nothing until a person confirms it, so an agent that writes this file gains
 * nothing at all. The Settings surface says so on screen.
 *
 * ## The failure direction
 *
 * A missing file is the ordinary case and produces no problem at all. A file
 * that cannot be read, is too large, or does not parse produces no machines and
 * one problem sentence. Nothing that was running is affected, because nothing in
 * this phase runs from this file.
 */

import watcher from '@parcel/watcher';
import {
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { app } from 'electron';
import type { MachineColor, MachineProblem, MachineRowV1 } from '@shared/machines';
import {
  MACHINES_FILENAME,
  MACHINE_DEFAULT_COLOR,
  MACHINE_LIMITS
} from '@shared/machines';
import { configDir, ensureConfigDir } from '../config/paths';
import { trackWatcherClose } from '../watcher/teardown';
import type { MachineExecutionFields } from './confirm';
import { whileReadingMachines } from './confirm';
import { parseMachines, serializeMachines } from './schema';

import { getLog } from '../log';

const machinesLog = getLog('config');

/** Why a load happened. It reaches the log line and nothing else. */
export type MachinesLoadReason = 'boot' | 'reload' | 'watch' | 'write';

/** The machines file as it stands, and everything Tortie refused in it. */
export interface MachinesSnapshot {
  /** The file this snapshot came from, whether or not it exists. */
  path: string;
  /** True when the file was there and could be read. */
  present: boolean;
  /** Epoch ms of the read. */
  loadedAt: number;
  /** Why the read happened. */
  reason: MachinesLoadReason;
  /** The rows that survived validation. */
  rows: readonly MachineRowV1[];
  /** One entry per row Tortie dropped, plus any problem with the file. */
  problems: readonly MachineProblem[];
}

type Listener = (snapshot: MachinesSnapshot) => void;

const WATCH_DEBOUNCE_MS = 300;

let snapshot: MachinesSnapshot | null = null;
let listeners: Listener[] = [];
let diskReads = 0;
let watchStop: (() => Promise<void>) | null = null;
let watchTimer: NodeJS.Timeout | null = null;

/** `<userData>/gmux/config/machines.json`. */
export function machinesPath(userDataOverride?: string): string {
  return join(configDir(userDataOverride), MACHINES_FILENAME);
}

/**
 * `<userData>/gmux/machines/`, the directory Tortie keeps its own record of
 * machine identities in.
 *
 * It is deliberately NOT inside the configuration directory. That directory is
 * the person's to edit and Tortie writes a guide, a schema and examples into it
 * for exactly that reason. This record is Tortie's own bookkeeping, nobody
 * should hand edit it, and putting it beside the confirmation record is where
 * it belongs.
 */
export function machineRecordDir(userDataOverride?: string): string {
  const root = userDataOverride ?? app.getPath('userData');
  return join(root, 'gmux', 'machines');
}

/**
 * The file the connection test records a machine's identity in.
 *
 * It is the FIRST file named on the command, which is what makes it the only
 * one the client ever adds a line to. The person's own file is second and read
 * only. See the header of ./connection-test.ts for the measurements.
 */
export function machineHostKeysPath(userDataOverride?: string): string {
  return join(machineRecordDir(userDataOverride), 'known-machines');
}

/**
 * Create the record directory when it is not there, and answer with the path
 * either way.
 *
 * It never throws. A directory Tortie cannot create means the client will say
 * it could not add the machine's identity, in its own words, in the transcript
 * the person is already reading.
 */
export function ensureMachineHostKeysPath(userDataOverride?: string): string {
  const path = machineHostKeysPath(userDataOverride);
  try {
    mkdirSync(dirname(path), { recursive: true });
  } catch {
    /* the client says so itself, in the transcript, in its own words */
  }
  return path;
}

/** An empty snapshot, which is what a machine with no file has. */
function emptySnapshot(reason: MachinesLoadReason): MachinesSnapshot {
  return {
    path: '',
    present: false,
    loadedAt: 0,
    reason,
    rows: [],
    problems: []
  };
}

/**
 * The machines as they stand, from memory.
 *
 * It never reads the disk, so it is safe to call from anywhere, including the
 * paths this phase forbids a read on.
 */
export function currentMachines(): MachinesSnapshot {
  return snapshot ?? emptySnapshot('boot');
}

/** One machine by id. Null when nothing carries that id. */
export function machineRow(id: string): MachineRowV1 | null {
  return currentMachines().rows.find((row) => row.id === id) ?? null;
}

/** The five execution bearing fields of one row, in the gate's flat shape. */
export function machineFieldsOf(row: MachineRowV1): MachineExecutionFields {
  return {
    host: row.host,
    user: row.user ?? null,
    port: row.port ?? null,
    remoteTmuxPath: row.remoteTmuxPath ?? null,
    // Phase 83. Absent reads as null, which is a machine nobody accepted a
    // version for, and that is what every row in every file says today.
    acceptedTmuxVersion: row.acceptedTmuxVersion ?? null
  };
}

/** The row's label, or its host when it has none. */
export function machineLabelOf(row: MachineRowV1): string {
  return row.label !== undefined && row.label.length > 0 ? row.label : row.host;
}

/** The row's colour, or the default. */
export function machineColorOf(row: MachineRowV1): MachineColor {
  return row.color ?? MACHINE_DEFAULT_COLOR;
}

/** How many times this process has read `machines.json` from disk. */
export function machinesDiskReads(): number {
  return diskReads;
}

/** Called after every load whose result differs from the one before it. */
export function onMachinesChanged(cb: Listener): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

/** A short text that changes when the result changes. */
function signatureOf(snap: MachinesSnapshot): string {
  return JSON.stringify([
    snap.present,
    snap.rows,
    snap.problems.map((p) => [p.index, p.field, p.message])
  ]);
}

/**
 * Read and check the file. The only function in Tortie that opens it.
 *
 * A read that fails for any reason still returns a usable snapshot, because a
 * failure only removes machines and this phase has nothing that depends on one
 * being there.
 */
export function loadMachines(
  reason: MachinesLoadReason = 'boot'
): MachinesSnapshot {
  const path = machinesPath();
  const problems: MachineProblem[] = [];
  let rows: readonly MachineRowV1[] = [];
  let present = false;

  diskReads += 1;
  let text: string | null = null;
  try {
    const stat = statSync(path);
    if (!stat.isFile()) {
      problems.push({
        index: -1,
        id: null,
        field: 'file',
        message: `${path} is not a file, so Tortie read no machines.`
      });
    } else if (stat.size > MACHINE_LIMITS.maxFileBytes) {
      problems.push({
        index: -1,
        id: null,
        field: 'file',
        message:
          `${MACHINES_FILENAME} is ${stat.size} bytes and Tortie reads at ` +
          `most ${MACHINE_LIMITS.maxFileBytes}. None of it was used.`
      });
    } else {
      text = readFileSync(path, 'utf8');
      present = true;
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ENOTDIR') {
      // A missing file is the ordinary case and says nothing. Anything else is
      // worth one sentence, because the person may have written a file Tortie
      // is silently not reading.
      problems.push({
        index: -1,
        id: null,
        field: 'file',
        message: `Tortie could not read ${path}: ${(err as Error).message}`
      });
    }
  }

  // The bytes are read first, then everything that turns them into rows runs
  // inside the gate's read scope. While that scope is open no machine reports
  // as confirmed, so a build that later tries to connect on a file change fails
  // at once and says why. The body is synchronous, which is what the scope
  // requires.
  whileReadingMachines(() => {
    if (text !== null) {
      const parsed = parseMachines(text);
      rows = parsed.rows;
      problems.push(...parsed.problems);
    }
  });

  const next: MachinesSnapshot = {
    path,
    present,
    loadedAt: Date.now(),
    reason,
    rows,
    problems
  };

  const changed = snapshot === null || signatureOf(snapshot) !== signatureOf(next);
  snapshot = next;
  if (problems.length > 0) {
    machinesLog.warn(
      `machines.json (${reason}): ${problems.length} problem(s). ` +
        problems.map((p) => p.message).join(' ')
    );
  }
  if (changed) {
    for (const listener of [...listeners]) {
      try {
        listener(next);
      } catch (err) {
        machinesLog.warn(`machines.json listener failed: ${(err as Error).message}`);
      }
    }
  }
  return next;
}

/** The reload the person asked for. */
export function reloadMachines(): MachinesSnapshot {
  return loadMachines('reload');
}

// ---------------------------------------------------------------------------
// The two writes
// ---------------------------------------------------------------------------

/** Write the whole file, atomically, then read it back into the snapshot. */
function writeMachines(rows: readonly MachineRowV1[]): MachinesSnapshot {
  const path = machinesPath();
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, serializeMachines(rows), 'utf8');
  renameSync(tmp, path); // atomic on the same volume
  return loadMachines('write');
}

/**
 * Add one machine, and read the file back.
 *
 * The row is checked BEFORE it reaches here, by the registrar in `./ipc.ts`,
 * which owns the sentence a person reads when a row is refused. This function
 * writes what it is given. The read back is what proves the file Tortie just
 * wrote is a file Tortie can read: if a write ever produced something the
 * schema drops, the snapshot says so at once rather than at the next boot.
 */
export function addMachineRow(row: MachineRowV1): MachinesSnapshot {
  const rows = [...currentMachines().rows, row];
  return writeMachines(rows);
}

/** Remove one machine. Writing the file is all this does. */
export function removeMachineRow(id: string): MachinesSnapshot {
  const rows = currentMachines().rows.filter((row) => row.id !== id);
  return writeMachines(rows);
}

/**
 * Write the version a person accepted for one machine, or clear it (Phase 83).
 *
 * It writes one field of one row and nothing else. It starts nothing, contacts
 * no machine and does not record an agreement: `machines:acceptVersion` in
 * `./ipc.ts` is the one caller, it checks the hash a person read BEFORE this
 * runs, and it records the agreement after. A machine this id does not name
 * leaves the file untouched.
 */
export function setMachineAcceptedVersion(
  id: string,
  version: string | null
): MachinesSnapshot {
  const rows = currentMachines().rows;
  if (!rows.some((row) => row.id === id)) return currentMachines();
  const next = rows.map((row) => {
    if (row.id !== id) return row;
    const copy: MachineRowV1 = { ...row };
    if (version === null) delete copy.acceptedTmuxVersion;
    else copy.acceptedTmuxVersion = version;
    return copy;
  });
  return writeMachines(next);
}

// ---------------------------------------------------------------------------
// Boot and the watcher
// ---------------------------------------------------------------------------

/**
 * Boot: make sure the directory is there, read once, then watch.
 *
 * It writes no file. A person with no machines has no `machines.json`, and
 * Tortie creating an empty one would put a file in their configuration
 * directory that says nothing.
 *
 * Watching is best effort. A watcher that cannot start leaves the boot read in
 * place and the explicit reload still works, so the feature degrades to "reload
 * it yourself" rather than to nothing.
 */
export async function initMachines(): Promise<MachinesSnapshot> {
  ensureConfigDir();
  const loaded = loadMachines('boot');
  await startMachinesWatch();
  return loaded;
}

/**
 * Watch the configuration directory for changes to `machines.json`.
 *
 * The debounce window does not reset on new events. The first event schedules
 * the flush, so an editor that writes, renames and touches the file in quick
 * succession produces one reload rather than three. This is the recipe the
 * agents.json watcher already uses.
 */
export async function startMachinesWatch(): Promise<boolean> {
  if (watchStop !== null) return true;
  const dir = configDir();
  try {
    const sub = await watcher.subscribe(dir, (err, events) => {
      if (err !== null && err !== undefined) return;
      const relevant = events.some(
        (event) => basename(event.path) === MACHINES_FILENAME
      );
      if (!relevant || watchTimer !== null) return;
      watchTimer = setTimeout(() => {
        watchTimer = null;
        try {
          loadMachines('watch');
        } catch (loadErr) {
          machinesLog.warn(
            `machines.json reload failed: ${(loadErr as Error).message}`
          );
        }
      }, WATCH_DEBOUNCE_MS);
      watchTimer.unref?.();
    });
    // Tracked AND awaited, exactly as the agents.json watcher is. An
    // unsubscribe still queued at FreeEnvironment is the Phase 36 crash, and
    // the tracked set is what lets the quit path see one that outlives its
    // bound.
    watchStop = () => trackWatcherClose(sub.unsubscribe());
    return true;
  } catch (err) {
    machinesLog.warn(
      `not watching ${dir} for machine changes: ${(err as Error).message}. ` +
        `Tortie will still re-read machines.json when you ask it to.`
    );
    return false;
  }
}

/** Stop watching. Called on quit and by the tests. */
export async function stopMachinesWatch(): Promise<void> {
  if (watchTimer !== null) {
    clearTimeout(watchTimer);
    watchTimer = null;
  }
  const stop = watchStop;
  watchStop = null;
  if (stop === null) return;
  try {
    await stop();
  } catch {
    /* a watcher that is already gone is the state we wanted */
  }
}

/** Drop every piece of module state. Tests only. */
export function resetMachinesStoreForTests(): void {
  snapshot = null;
  listeners = [];
  diskReads = 0;
  if (watchTimer !== null) {
    clearTimeout(watchTimer);
    watchTimer = null;
  }
  watchStop = null;
}
