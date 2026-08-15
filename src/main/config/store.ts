/**
 * When `agents.json` is read, and the only place it is read.
 *
 * Phase 23, research 31 section 6.1. Three moments and no others.
 *
 *  1. At boot, once, from `initAgentOverlay`.
 *  2. On an explicit reload the user asked for.
 *  3. On a file watcher, after a 300 ms debounce.
 *
 * **Never on the path that creates a session, and never on the path that
 * restores one.** That sentence is the reason this module is separate from
 * overlay.ts, and the reason the only accessor a caller reaches for returns
 * memory. `currentAgentTable()` cannot touch the disk. It has no code that
 * could. `agentOverlayDiskReads()` counts the reads that did happen, so a test
 * can drive a session create and assert the count did not move, which is the
 * difference between a rule and a promise.
 *
 * ## What restore does, and does not, do here
 *
 * Restore reads the manifest row. Phase 21 moved it there and this module must
 * not pull it back. A session created by a configured agent and a session
 * created by a compiled one are the same shape in the manifest, and restore
 * cannot tell them apart. That is what makes deleting `agents.json` safe:
 * removing a row changes what you can create, never what comes back.
 *
 * ## The failure direction
 *
 * A missing file is the ordinary case and produces no problem at all. A file
 * that cannot be read, is too large, or does not parse produces the compiled
 * table plus one problem sentence. The compiled twelve always survive, so a
 * broken configuration file can never cost a user the agents the build ships.
 */

import watcher from '@parcel/watcher';
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import type { AgentOverlayProblem, AgentOverlayV1 } from '@shared/agent-overlay';
import { AGENT_OVERLAY_FILENAME, OVERLAY_LIMITS } from '@shared/agent-overlay';
import { setAgentTableSource } from '../agents/detection';
import type { AgentLaunchInfo } from '../agents/registry';
import { AGENT_REGISTRY } from '../agents/registry';
import type { ConfigConfirmState } from './confirm';
import { configRowStatus, whileReadingConfig } from './confirm';
import { ensureConfigDirSeeded } from './guide';
import type { ConfigRowSource, ConfigSourceError, ConfigSourceRow } from './ipc';
import { setConfigRowSource } from './ipc';
import type { AgentOverlayMerge, MergedAgentEntry } from './overlay';
import { executionFieldsOf, mergeAgentOverlay, parseAgentOverlay } from './overlay';
import { agentOverlayPath, configDir, ensureConfigDir } from './paths';
import { trackWatcherClose } from '../watcher/teardown';

/** Why a load happened. It reaches the log line and nothing else. */
export type AgentOverlayLoadReason = 'boot' | 'reload' | 'watch';

/** The merged agent table, and everything Tortie refused to merge into it. */
export interface AgentOverlaySnapshot {
  /** The file this snapshot came from, whether or not it exists. */
  path: string;
  /** True when the file was there and could be read. */
  present: boolean;
  /** Epoch ms of the read. */
  loadedAt: number;
  /** Why the read happened. */
  reason: AgentOverlayLoadReason;
  /** The rows that survived validation. */
  rows: readonly AgentOverlayV1[];
  /** The compiled registry with those rows merged over it. */
  agents: readonly MergedAgentEntry[];
  /** One entry per row Tortie dropped, plus any problem with the file. */
  problems: readonly AgentOverlayProblem[];
}

type Listener = (snapshot: AgentOverlaySnapshot) => void;

const WATCH_DEBOUNCE_MS = 300;

let snapshot: AgentOverlaySnapshot | null = null;
let listeners: Listener[] = [];
let diskReads = 0;
let watchStop: (() => Promise<void>) | null = null;
let watchTimer: NodeJS.Timeout | null = null;

/** The compiled table on its own, which is what a build with no file has. */
function compiledOnly(reason: AgentOverlayLoadReason): AgentOverlaySnapshot {
  const merge: AgentOverlayMerge = mergeAgentOverlay([], AGENT_REGISTRY);
  return {
    path: '',
    present: false,
    loadedAt: 0,
    reason,
    rows: [],
    agents: merge.agents,
    problems: []
  };
}

/**
 * The merged agent table as it stands, from memory.
 *
 * Before the boot load, and for the whole life of a build whose user has no
 * configuration file, this is exactly the twelve compiled rows. It never reads
 * the disk, so it is safe to call from anywhere, including the paths this
 * phase forbids a read on.
 */
export function currentAgentTable(): readonly MergedAgentEntry[] {
  return snapshot?.agents ?? compiledOnly('boot').agents;
}

/** The whole snapshot, from memory. Same guarantee as `currentAgentTable`. */
export function currentAgentOverlay(): AgentOverlaySnapshot {
  return snapshot ?? compiledOnly('boot');
}

/** One agent by id, compiled or configured. Null when nothing carries that id. */
export function agentEntry(id: string): MergedAgentEntry | null {
  return currentAgentTable().find((entry) => entry.id === id) ?? null;
}

/**
 * One agent that can actually be started, with its launch block narrowed.
 *
 * Null covers three cases that are all the same answer to the caller: no such
 * id, an editor Tortie only watches, and a row with no launch command.
 *
 * This does NOT consider the confirm gate. The gate is a separate module and
 * it is what a launch path must ask before it spawns anything.
 */
export function launchableAgentEntry(
  id: string
): (MergedAgentEntry & { launch: AgentLaunchInfo }) | null {
  const entry = agentEntry(id);
  if (entry === null || !entry.launchable || entry.launch === null) return null;
  return entry as MergedAgentEntry & { launch: AgentLaunchInfo };
}

/**
 * What the confirm gate says about one agent id, for a caller that is drawing
 * a list rather than starting anything.
 *
 * Null means "there is nothing to confirm here", which covers every compiled
 * agent and every configuration row that only renames one. On the ordinary
 * machine, which has no configuration file, this returns null for all twelve
 * without reading anything.
 *
 * This is NOT the launch decision. `assertConfigRowMayLaunch` is, and it is
 * asked on the create path. This exists so a picker can say a row is not
 * confirmed BEFORE a person fills in a name and presses Create.
 */
export function configStateOf(id: string): ConfigConfirmState | null {
  const entry = agentEntry(id);
  if (entry === null || entry.executionHash === null) return null;
  return configRowStatus(id, executionFieldsOf(entry)).state;
}

/**
 * Stamp a detection scan's rows with their confirm state.
 *
 * The scan itself is pure Node and knows nothing about the OS keychain, so the
 * stamp is applied here, on the Electron side, by the `agents:*` registrar.
 * A machine with no configuration file gets its rows back unchanged and reads
 * no file at all, because every row's `configStateOf` answers null first.
 */
export function withConfigState<T extends { id: string }>(
  rows: readonly T[]
): T[] {
  return rows.map((row) => {
    const state = configStateOf(row.id);
    return state === null ? row : { ...row, configState: state };
  });
}

/** How many times this process has read `agents.json` from disk. */
export function agentOverlayDiskReads(): number {
  return diskReads;
}

/** Called after every load whose result differs from the one before it. */
export function onAgentOverlayChanged(cb: Listener): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

/** A short text that changes when the merged result changes. */
function signatureOf(snap: AgentOverlaySnapshot): string {
  return JSON.stringify([
    snap.present,
    snap.rows,
    snap.problems.map((p) => [p.index, p.field, p.message])
  ]);
}

/**
 * Read, validate and merge. The only function in Tortie that opens this file.
 *
 * A read that fails for any reason still returns a usable table, because the
 * compiled rows are merged first and a failure only removes the overlay.
 */
export function loadAgentOverlay(
  reason: AgentOverlayLoadReason = 'boot'
): AgentOverlaySnapshot {
  const path = agentOverlayPath();
  const problems: AgentOverlayProblem[] = [];
  let rows: readonly AgentOverlayV1[] = [];
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
        message: `${path} is not a file, so Tortie read no configured agents.`
      });
    } else if (stat.size > OVERLAY_LIMITS.maxFileBytes) {
      problems.push({
        index: -1,
        id: null,
        field: 'file',
        message:
          `${AGENT_OVERLAY_FILENAME} is ${stat.size} bytes and Tortie reads ` +
          `at most ${OVERLAY_LIMITS.maxFileBytes}. None of it was used.`
      });
    } else {
      text = readFileSync(path, 'utf8');
      present = true;
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ENOTDIR') {
      // A missing file is the ordinary case and says nothing. Anything else is
      // worth one sentence, because the user may have written a file Tortie is
      // silently not reading.
      problems.push({
        index: -1,
        id: null,
        field: 'file',
        message: `Tortie could not read ${path}: ${(err as Error).message}`
      });
    }
  }

  // The bytes are read first, then everything that turns them into rows runs
  // inside the gate's read scope. While that scope is open no row reports as
  // confirmed, so a build that later tries to relaunch on a file change fails
  // at once and says why, rather than appearing to work on a machine where the
  // row happens to be confirmed already. The body is synchronous, which is what
  // the scope requires.
  const merge: AgentOverlayMerge = whileReadingConfig(() => {
    if (text !== null) {
      const parsed = parseAgentOverlay(text);
      rows = parsed.rows;
      problems.push(...parsed.problems);
    }
    return mergeAgentOverlay(rows, AGENT_REGISTRY);
  });
  problems.push(...merge.problems);
  const merged = merge.agents;
  const kept = new Set(merge.agents.map((a) => a.id));
  const survivingRows = rows.filter((r) => kept.has(r.id));

  const next: AgentOverlaySnapshot = {
    path,
    present,
    loadedAt: Date.now(),
    reason,
    rows: survivingRows,
    agents: merged,
    problems
  };

  const changed = snapshot === null || signatureOf(snapshot) !== signatureOf(next);
  snapshot = next;
  if (problems.length > 0) {
    console.warn(
      `[gmux] agents.json (${reason}): ${problems.length} problem(s). ` +
        problems.map((p) => p.message).join(' ')
    );
  }
  if (changed) {
    for (const listener of [...listeners]) {
      try {
        listener(next);
      } catch (err) {
        console.warn(`[gmux] agents.json listener failed: ${(err as Error).message}`);
      }
    }
  }
  return next;
}

/** The reload the user asked for. */
export function reloadAgentOverlay(): AgentOverlaySnapshot {
  return loadAgentOverlay('reload');
}

/**
 * What the `config:*` channels read, taken from memory.
 *
 * Only rows that arm the confirm gate appear. A row that renames a compiled
 * agent has nothing to confirm, so listing it with a "never confirmed" state
 * would tell the user their working agent is blocked when it is not.
 *
 * `read` never touches the disk, which is the contract the registrar states and
 * the reason the whole store is built around a snapshot.
 */
export function agentOverlayRowSource(): ConfigRowSource {
  return {
    directory: () => configDir(),
    read: (): { rows: readonly ConfigSourceRow[]; errors: readonly ConfigSourceError[] } => {
      const snap = currentAgentOverlay();
      const rows: ConfigSourceRow[] = [];
      for (const entry of snap.agents) {
        if (entry.executionHash === null) continue;
        rows.push({
          id: entry.id,
          displayName: entry.displayName,
          fields: executionFieldsOf(entry)
        });
      }
      const errors: ConfigSourceError[] = snap.problems.map((problem) => ({
        id: problem.id ?? problem.field,
        field: problem.field,
        reason: problem.message
      }));
      return { rows, errors };
    }
  };
}

/**
 * Boot: create and seed the directory, read once, hand the gate its source,
 * then watch.
 *
 * The order matters. The source is registered after the first read, so the
 * first draw of the list shows what the file says rather than nothing.
 *
 * Seeding writes the guide, the schema and the examples. It never writes
 * `agents.json`, so it cannot change what this function then reads. It runs
 * here rather than only behind the menu item so a person who goes looking for
 * the folder finds it already explained. A seed that fails is not fatal: the
 * folder is still there and the read still happens, so the worst case is a
 * folder with no guide in it.
 *
 * Watching is best effort. A watcher that cannot start leaves the snapshot
 * from the boot read in place and the explicit reload still works, so the
 * feature degrades to "reload it yourself" rather than to nothing.
 */
export async function initAgentOverlay(): Promise<AgentOverlaySnapshot> {
  ensureConfigDir();
  try {
    ensureConfigDirSeeded();
  } catch (err) {
    console.warn(
      `[gmux] could not write the configuration guide: ${(err as Error).message}`
    );
  }
  const loaded = loadAgentOverlay('boot');
  setConfigRowSource(agentOverlayRowSource());
  // Detection scans the merged table from here on. It is handed a function
  // rather than a table so a later reload is picked up by the next scan
  // without anything having to re-register. The function returns memory, so a
  // scan still cannot reach the disk for the configuration file.
  setAgentTableSource(currentAgentTable);
  await startAgentOverlayWatch();
  return loaded;
}

/**
 * Watch the configuration directory.
 *
 * The debounce window does not reset on new events. The first event schedules
 * the flush, so an editor that writes, renames and touches the file in quick
 * succession produces one reload rather than three, and a file being written
 * continuously still reloads about every 300 ms instead of never. This is the
 * same recipe the repository watcher already uses.
 */
export async function startAgentOverlayWatch(): Promise<boolean> {
  if (watchStop !== null) return true;
  const dir = configDir();
  try {
    const sub = await watcher.subscribe(dir, (err, events) => {
      if (err !== null && err !== undefined) return;
      const relevant = events.some(
        (event) => basename(event.path) === AGENT_OVERLAY_FILENAME
      );
      if (!relevant || watchTimer !== null) return;
      watchTimer = setTimeout(() => {
        watchTimer = null;
        try {
          loadAgentOverlay('watch');
        } catch (loadErr) {
          console.warn(
            `[gmux] agents.json reload failed: ${(loadErr as Error).message}`
          );
        }
      }, WATCH_DEBOUNCE_MS);
      watchTimer.unref?.();
    });
    // Tracked AND awaited (Phase 36 fix round). stopAgentOverlayWatch awaits
    // this, but the quit path bounds that await with a race; the tracked set
    // is what lets `pendingWatcherCloseCount()` see an unsubscribe that
    // outlives the bound, so the quit drains again instead of running
    // node::FreeEnvironment into the queued napi completion.
    watchStop = () => trackWatcherClose(sub.unsubscribe());
    return true;
  } catch (err) {
    console.warn(
      `[gmux] not watching ${dir} for changes: ${(err as Error).message}. ` +
        `Tortie will still re-read agents.json when you ask it to.`
    );
    return false;
  }
}

/** Stop watching. Called on quit and by the tests. */
export async function stopAgentOverlayWatch(): Promise<void> {
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
export function resetAgentOverlayStoreForTests(): void {
  snapshot = null;
  listeners = [];
  diskReads = 0;
  if (watchTimer !== null) {
    clearTimeout(watchTimer);
    watchTimer = null;
  }
  watchStop = null;
}
