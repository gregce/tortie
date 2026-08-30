/**
 * The capture (Phase 163): one report, built when asked and never otherwise.
 *
 * A capture is a WINDOW with two ends, because every CPU number Electron and
 * the OS can give is "since the last sample". `beginCapture` takes the first
 * `app.getAppMetrics()` sample and arms the IPC counters. `finishCapture`
 * takes the second sample, reads every other fact on demand, joins them
 * through ./tree.ts and hands back the typed report with its text. The
 * renderer's own facts (heap, Blink memory, mounted surfaces, long tasks)
 * arrive with finish because only the renderer can read them and main never
 * asks a renderer to run code (src/main/menu.ts forbids it for state).
 *
 * WHAT A CAPTURE STARTS: `ps` once, `du` three times, and since Phase 168
 * `top` once for the energy score, the windowed CPU and (Phase 170) the
 * physical footprint of every process on the machine, all short lived, all
 * through the guarded runner that settles inside a deadline and reaps what
 * it started. The top spawn is started by `beginCapture` so its roughly two
 * seconds overlap the window the renderer is already waiting out. A LIVE
 * TICK spawns no top of its own: it takes one sample from the streaming
 * top in ./top-stream.ts that the subscription holds open, because top's
 * startup walk is 2.2 s of system time and paying it every two seconds was
 * a whole core for as long as the tab was visible.
 * `/usr/bin/footprint` is spawned ONLY when top failed: the batched call
 * over a capture shaped set of 155 pids measured 7.35 seconds on
 * 2026-08-30 against the runner's 5 second deadline, so on a machine with
 * many sessions it was killed with its output still in its own block
 * buffer and every row it was asked about said "not read". Top's MEM
 * column is the same kernel ledger (see ./power.ts for the per pid proof)
 * and covers every pid in the spawn the capture already pays for. It asks the session server for its pid and its pane list, read only.
 * It opens no listener, sets no interval and keeps no timer between the two
 * ends. An abandoned begin leaves one boolean and two integers armed in
 * ./ipc-sample.ts plus one already guarded top child that settles on its
 * own, all replaced by the next begin.
 *
 * THE SPLIT. `shell` is what Tortie itself costs and `sessions` is the work
 * it supervises. The two totals are computed separately in ./tree.ts and this
 * module never adds them, because their sum is the number Activity Monitor
 * already shows and it explains nothing.
 *
 * Heap snapshots are not here. ./heap.ts is imported by ./ipc.ts alone, and
 * a unit test reads this file to prove the ordinary capture never reaches it.
 */

import { app, BrowserWindow, session } from 'electron';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { basename } from 'node:path';
import type {
  DiagnosticsCaptureHandle,
  DiagnosticsMainMemory,
  DiagnosticsRendererFacts,
  DiagnosticsReport
} from '@shared/ipc';
import { hooksEnabled } from '../activity/hooks';
import { watchedRepoCount, watcherObservations } from '../git/ipc';
import { redactString } from '../log/redact';
import { machineExecutionHash } from '../machines/confirm';
import { openControlPlaneCount } from '../machines/control-plane';
import { controlPathLeaf } from '../machines/ssh';
import {
  currentMachines,
  machineFieldsOf,
  machineLabelOf
} from '../machines/store';
import { getGmuxCore } from '../sessions';
import { pendingWatcherCloseCount } from '../watcher/teardown';
import { readPsTable, type ProcRow } from '../proc/ps';
import { policyState, readDiskSizes } from './disk';
import { cachePolicyFor } from '../cache/policy';
import { readFootprints } from './footprint';
import { buildGlance } from './glance';
import { beginIpcSample, endIpcSample } from './ipc-sample';
import { buildMachineContext } from './machine';
import { readMilestones } from './milestones';
import { listGmuxProcesses } from './owned-processes';
import { readPowerSample, type PowerSample } from './power';
import { buildDiagnosticsReportText } from './report-text';
import {
  buildTree,
  type ElectronMetric,
  type SessionFact,
  type WindowFact
} from './tree';

const KB = 1024;

/** The gap a finish with no open window waits, so CPU has a denominator. */
export const FALLBACK_WINDOW_MS = 250;

interface OpenCapture {
  id: string;
  startedAt: number;
  /** Phase 168: the top read, started here so it overlaps the window. */
  power: Promise<PowerSample | null>;
}

let open: OpenCapture | null = null;

/**
 * The last disk read, reused by a light finish (Phase 170). Live mode
 * closes a capture window every two seconds, and three `du` walks per tick
 * would be steady IO nobody asked for; the sizes move on the scale of
 * minutes. A full capture always reads and refreshes this.
 */
let lastDiskSizes: Awaited<ReturnType<typeof readDiskSizes>> | null = null;

/** Electron's metrics in the narrow shape ./tree.ts reads. */
function readElectronMetrics(): ElectronMetric[] {
  return app.getAppMetrics().map((m) => ({
    pid: m.pid,
    type: m.type,
    ...(m.name !== undefined ? { name: m.name } : {}),
    ...(m.serviceName !== undefined ? { serviceName: m.serviceName } : {}),
    cpuPercent: Math.round((m.cpu?.percentCPUUsage ?? 0) * 10) / 10,
    workingSetBytes: (m.memory?.workingSetSize ?? 0) * KB
  }));
}

export interface BeginOptions {
  /**
   * Phase 170 fix round: where this window's top sample comes from. A
   * manual capture leaves it unset and spawns the one shot read in
   * ./power.ts; a live tick passes the streaming instrument's `take`, so a
   * tick costs a sample and never a fresh top startup walk.
   */
  power?(): Promise<PowerSample | null>;
}

/**
 * Open a capture window. The first metrics sample primes Electron's per
 * process CPU counters, which report zero until a second call, and the IPC
 * counters are armed. A second begin replaces the first.
 */
export function beginCapture(
  now: number = Date.now(),
  options: BeginOptions = {}
): DiagnosticsCaptureHandle {
  readElectronMetrics();
  process.getCPUUsage();
  beginIpcSample(now);
  const power = options.power !== undefined ? options.power() : readPowerSample();
  open = { id: randomUUID(), startedAt: now, power };
  return { id: open.id };
}

/** True while a window is open. Diagnostics and the harness only. */
export function captureOpen(): boolean {
  return open !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Every live window and the renderer pid drawing it. */
function readWindows(): WindowFact[] {
  const out: WindowFact[] = [];
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      out.push({ pid: win.webContents.getOSProcessId(), title: win.getTitle() });
    } catch {
      /* a window mid teardown answers nothing and draws no row */
    }
  }
  return out;
}

/** Control socket leaf to machine label, so an ssh master is named. */
function sshLeafLabels(): Map<string, string> {
  const out = new Map<string, string>();
  const uid = typeof process.getuid === 'function' ? process.getuid() : 0;
  for (const row of currentMachines().rows) {
    try {
      const leaf = controlPathLeaf({
        executionHash: machineExecutionHash(row.id, machineFieldsOf(row)),
        uid
      });
      out.set(leaf, machineLabelOf(row));
    } catch {
      /* a row that cannot be hashed names no master */
    }
  }
  return out;
}

async function readMainMemory(): Promise<DiagnosticsMainMemory> {
  const heap = process.getHeapStatistics();
  let privateBytes = 0;
  let sharedBytes = 0;
  try {
    const info = await process.getProcessMemoryInfo();
    privateBytes = info.private * KB;
    sharedBytes = info.shared * KB;
  } catch {
    /* the number stays zero and the row's source says footprint or null */
  }
  return {
    privateBytes,
    sharedBytes,
    heapUsedBytes: heap.usedHeapSize * KB,
    heapTotalBytes: heap.totalHeapSize * KB,
    heapLimitBytes: heap.heapSizeLimit * KB,
    mallocedBytes: heap.mallocedMemory * KB
  };
}

async function readSessionFacts(): Promise<SessionFact[]> {
  try {
    const core = await getGmuxCore();
    return core.listSessions().map((s) => ({
      id: s.id,
      name: s.name,
      agent: s.agent,
      remote: s.machine !== undefined
    }));
  } catch {
    return [];
  }
}

export interface FinishOptions {
  /** The renderer pid that asked, so its facts land on its own row. */
  rendererPid?: number;
  now?: number;
  /**
   * Phase 170, live mode's ticks: reuse the last disk read instead of
   * walking the profile again. The first finish on a fresh launch still
   * reads, so a light report never carries an invented disk section.
   */
  light?: boolean;
}

/**
 * Close the window and build the report. When `id` names no open window
 * (a stale handle, or the harness calling without a begin) a fresh window
 * of {@link FALLBACK_WINDOW_MS} is opened and waited out first, so the CPU
 * numbers are still a rate over a known span rather than zero.
 */
export async function finishCapture(
  id: string,
  facts: DiagnosticsRendererFacts,
  options: FinishOptions = {}
): Promise<DiagnosticsReport> {
  let fellBack = false;
  if (open === null || open.id !== id) {
    beginCapture();
    await sleep(FALLBACK_WINDOW_MS);
    fellBack = true;
  }
  const now = fellBack || options.now === undefined ? Date.now() : options.now;
  const startedAt = open?.startedAt ?? now;
  const powerPromise = open?.power ?? Promise.resolve(null);
  open = null;

  const metrics = readElectronMetrics();
  const ipc = endIpcSample(now);
  const windowMs = Math.max(ipc.windowMs, now - startedAt);

  const windows = readWindows();
  const rendererPid =
    options.rendererPid ??
    windows.find((w) => w.pid !== process.pid)?.pid ??
    null;

  // Phase 168: ONE machine wide ps per capture. The ownership walk and the
  // machine context read the same table, so the strip buys no second spawn.
  let psRows: Map<number, ProcRow>;
  try {
    psRows = await readPsTable();
  } catch {
    psRows = new Map();
  }
  // The walk's own `ps` is in the table it read. It has exited by the time
  // the table is parsed, so it would draw a row with no footprint and no
  // meaning; it is the one child of this capture and it is dropped by name.
  const owned = (
    await listGmuxProcesses({
      sshLeafLabels: sshLeafLabels(),
      psTable: () => Promise.resolve(psRows)
    })
  ).filter(
    (p) => !(p.role === 'app-helper' && p.binary === 'ps' && p.ppid === process.pid)
  );
  const wantFootprint = new Set<number>();
  for (const p of owned) if (p.pid !== process.pid) wantFootprint.add(p.pid);
  for (const m of metrics) if (m.pid !== process.pid) wantFootprint.add(m.pid);
  if (rendererPid !== null && facts.memory !== null) {
    wantFootprint.delete(rendererPid);
  }

  const profileDir = app.getPath('userData');

  // Phase 170: the footprint of every pid comes from the top sample the
  // window already paid for (see the module note and ./power.ts). The
  // /usr/bin/footprint spawn is the fallback for a machine where top gave
  // nothing, and there it keeps its 5 second deadline.
  const power = await powerPromise;
  const topMem = power?.memBytesByPid ?? null;
  let footprintsPromise: Promise<Map<number, number>>;
  if (topMem !== null) {
    const filtered = new Map<number, number>();
    for (const pid of wantFootprint) {
      const bytes = topMem.get(pid);
      if (bytes !== undefined) filtered.set(pid, bytes);
    }
    footprintsPromise = Promise.resolve(filtered);
  } else if (options.light === true) {
    // A live tick without a top sample says "not read" for one interval
    // and the next tick tries again. Spawning footprint every two seconds
    // would be the exact drain the deadline kill made pointless at scale.
    footprintsPromise = Promise.resolve(new Map());
  } else {
    footprintsPromise = readFootprints([...wantFootprint]);
  }

  const diskPromise =
    options.light === true && lastDiskSizes !== null
      ? Promise.resolve(lastDiskSizes)
      : readDiskSizes(profileDir, {
          httpCache: () => session.defaultSession.getCacheSize(),
          // Phase 166: the same pure decision the boot made, read again here
          // rather than remembered, so the report cannot drift from the switch.
          policy: () => policyState(cachePolicyFor(process.env, app.isPackaged))
        });

  const [footprints, main, disk, sessions, watchers] = await Promise.all([
    footprintsPromise,
    readMainMemory(),
    diskPromise,
    readSessionFacts(),
    watcherObservations()
  ]);
  lastDiskSizes = disk;

  const tree = buildTree({
    owned,
    metrics,
    footprints,
    mainPrivateBytes: main.privateBytes > 0 ? main.privateBytes : null,
    rendererPrivateBytes: facts.memory?.privateBytes ?? null,
    mainWindowPid: rendererPid,
    windows,
    sessions,
    appPid: process.pid
  });

  // Phase 168: the glance strip and the machine context. The top read was
  // started at begin and awaited above; a top that failed leaves the CPU
  // and energy figures null rather than zero.
  const shellPids = tree.shell
    .filter((row) => row.kind !== 'orphan')
    .map((row) => row.pid);
  const agentPids = owned
    .filter((p) => p.role === 'session' || p.role === 'session-child')
    .map((p) => p.pid);
  const glance = buildGlance({
    shellTotal: tree.shellTotal,
    sessionsTotal: tree.sessionsTotal,
    shellPids,
    agentPids,
    cpuByPid: power?.cpuByPid ?? null,
    powerByPid: power?.powerByPid ?? null
  });
  const machine = buildMachineContext({
    rows: psRows.values(),
    ownedPids: new Set(owned.map((p) => p.pid)),
    tortieRssBytes: tree.shellTotal.rssBytes
  });

  const home = homedir();
  const listeners: string[] = [];
  if (hooksEnabled()) listeners.push('hook channel on this Mac');
  if (owned.some((p) => p.role === 'control-client')) listeners.push('event bus');
  if (openControlPlaneCount() > 0) listeners.push('machine feeds');

  const body: Omit<DiagnosticsReport, 'text'> = {
    generatedAt: new Date(now).toISOString(),
    appVersion: app.getVersion(),
    windowMs,
    shell: tree.shell,
    shellTotal: tree.shellTotal,
    leftoverTotal: tree.leftoverTotal,
    sessions: tree.sessions,
    sessionsTotal: tree.sessionsTotal,
    glance,
    machine,
    electronPids: tree.electronPids,
    main,
    renderer: facts,
    counts: {
      sessions: sessions.length,
      localSessions: sessions.filter((s) => !s.remote).length,
      remoteSessions: sessions.filter((s) => s.remote).length,
      windows: windows.length,
      watchers: watchedRepoCount(),
      pendingWatcherCloses: pendingWatcherCloseCount(),
      remoteFeeds: openControlPlaneCount(),
      mountedSurfaces: facts.mountedSurfaces,
      listeners
    },
    watchers: watchers.map((w) => ({
      repo: basename(w.repoPath),
      drops: w.drops,
      rescansScheduled: w.rescansScheduled,
      rescansCompleted: w.rescansCompleted
    })),
    disk: { ...disk, profilePath: redactString(profileDir, home) },
    milestones: readMilestones(),
    ipc: { invokes: ipc.invokes, events: ipc.events, windowMs }
  };
  return { ...body, text: buildDiagnosticsReportText(body, home) };
}

/**
 * The whole capture in one call, for the harness and for a caller with no
 * renderer: begin, wait the window out, finish. The renderer facts are the
 * caller's to supply, and nulls are an honest answer.
 */
export async function captureDiagnostics(
  facts: DiagnosticsRendererFacts = {
    memory: null,
    mountedSurfaces: null,
    longTasks: null
  },
  windowMs: number = 1_000,
  options: FinishOptions = {}
): Promise<DiagnosticsReport> {
  const handle = beginCapture();
  await sleep(windowMs);
  return finishCapture(handle.id, facts, options);
}

/**
 * The names the capture harness (src/main/harness/p163-capture.ts) looks up
 * by string, so the harness and the surface share one implementation.
 */
export const beginDiagnosticsCapture = beginCapture;
export const finishDiagnosticsCapture = finishCapture;
export const captureDiagnosticsReport = captureDiagnostics;
