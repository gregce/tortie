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
 * WHAT A CAPTURE STARTS: `ps` once, `footprint` once, `du` three times, all
 * short lived, all through the guarded runner that settles inside a deadline
 * and reaps what it started. It asks the session server for its pid and its
 * pane list, read only. It opens no listener, sets no interval and keeps no
 * timer between the two ends. An abandoned begin leaves one boolean and two
 * integers armed in ./ipc-sample.ts, replaced by the next begin.
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
import { policyState, readDiskSizes } from './disk';
import { cachePolicyFor } from '../cache/policy';
import { readFootprints } from './footprint';
import { beginIpcSample, endIpcSample } from './ipc-sample';
import { readMilestones } from './milestones';
import { listGmuxProcesses } from './owned-processes';
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
}

let open: OpenCapture | null = null;

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

/**
 * Open a capture window. The first metrics sample primes Electron's per
 * process CPU counters, which report zero until a second call, and the IPC
 * counters are armed. A second begin replaces the first.
 */
export function beginCapture(now: number = Date.now()): DiagnosticsCaptureHandle {
  readElectronMetrics();
  process.getCPUUsage();
  beginIpcSample(now);
  open = { id: randomUUID(), startedAt: now };
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
  open = null;

  const metrics = readElectronMetrics();
  const ipc = endIpcSample(now);
  const windowMs = Math.max(ipc.windowMs, now - startedAt);

  const windows = readWindows();
  const rendererPid =
    options.rendererPid ??
    windows.find((w) => w.pid !== process.pid)?.pid ??
    null;

  // The walk's own `ps` is in the table it read. It has exited by the time
  // the table is parsed, so it would draw a row with no footprint and no
  // meaning; it is the one child of this capture and it is dropped by name.
  const owned = (await listGmuxProcesses({ sshLeafLabels: sshLeafLabels() })).filter(
    (p) => !(p.role === 'app-helper' && p.binary === 'ps' && p.ppid === process.pid)
  );
  const wantFootprint = new Set<number>();
  for (const p of owned) if (p.pid !== process.pid) wantFootprint.add(p.pid);
  for (const m of metrics) if (m.pid !== process.pid) wantFootprint.add(m.pid);
  if (rendererPid !== null && facts.memory !== null) {
    wantFootprint.delete(rendererPid);
  }

  const profileDir = app.getPath('userData');
  const [footprints, main, disk, sessions, watchers] = await Promise.all([
    readFootprints([...wantFootprint]),
    readMainMemory(),
    readDiskSizes(profileDir, {
      httpCache: () => session.defaultSession.getCacheSize(),
      // Phase 166: the same pure decision the boot made, read again here
      // rather than remembered, so the report cannot drift from the switch.
      policy: () => policyState(cachePolicyFor(process.env, app.isPackaged))
    }),
    readSessionFacts(),
    watcherObservations()
  ]);

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
