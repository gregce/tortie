/**
 * GMUX_SMOKE=p163-capture, the diagnostics capture on a scratch profile with
 * N sessions (Phase 163).
 *
 * ## What one launch does
 *
 * 1. Refuses to run unless the profile is under GMUX_P163_ROOT and the tmux
 *    socket is not the real one, through the same guard the fault harness
 *    uses. Nothing below runs against anything the person owns.
 * 2. Boots the core, which lands the `sessions-reconciled` milestone.
 * 3. Creates the shortfall between GMUX_P163_SESSIONS and the harness sessions
 *    already alive on this profile. A cold launch creates all of them; a warm
 *    launch on the same profile and the same scratch server finds them
 *    reconciled and creates none. Every session is `shell` running the same
 *    date loop the T1 smoke uses, so nothing here spends a token.
 * 4. Opens the REAL window through the real factory, so `window-shown`,
 *    `sessions-listed` and `path-ready` land the way they land for a person.
 * 5. Attaches the first harness session to that window when the renderer has
 *    not done so itself, so `first-attach` and `first-bytes` land too.
 * 6. Reads the facts: the milestones, two `app.getAppMetrics()` samples one
 *    second apart because CPU is since the last call and zero on the first,
 *    this process's private memory and heap, every window with the pid that
 *    names its Tab row, the ownership walk folded into the two totals, and
 *    the diagnostics report itself when its module is present.
 * 7. Writes one JSON file to GMUX_P163_OUT and exits 0. The supervisor,
 *    build/probe-p163-report.mjs, grades it; this process never grades
 *    itself.
 *
 * ## What it refuses
 *
 * No heap snapshot unless GMUX_P163_HEAP=1, and then to a file beside the
 * output and nowhere under userData. No command line past the first word's
 * basename in anything it writes. No timer that outlives the capture: the one
 * second gap between the two metric samples is awaited and gone.
 */

import { app, BrowserWindow } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  MILESTONES,
  milestoneLanded,
  readMilestones,
  type Milestone
} from '../diagnostics/milestones';
import { listGmuxProcesses } from '../diagnostics/owned-processes';
import { captureDiagnostics } from '../diagnostics/report';
import type { DiagnosticsReport } from '@shared/ipc/diagnostics';
import { getGmuxCore } from '../sessions';
import type { GmuxCore } from '../sessions';
import { CONTROL_SESSION_NAME } from '../tmux/control-client';
import { installUserPath } from '../tmux/user-path';
import { drainWatcherCloses } from '../watcher/teardown';
import { assertHarnessIsolation } from './isolation';
import {
  harnessSessionName,
  isHarnessSessionName,
  planCreates,
  summarizeOwned,
  type OwnedSummary
} from './p163-facts';
import { armWatchdog, smokeFail, smokeLog } from './support';

/** One row of `app.getAppMetrics()`, with the KB units Electron uses. */
interface MetricRow {
  pid: number;
  type: string;
  name: string | null;
  serviceName: string | null;
  sandboxed: boolean | null;
  cpuPercent: number;
  idleWakeupsPerSecond: number;
  workingSetKb: number;
  peakWorkingSetKb: number;
}

/** One row of the ownership walk as the capture file keeps it. */
interface OwnedRow {
  pid: number;
  ppid: number;
  role: string;
  rssBytes: number;
  cpuPercent: number;
  /**
   * The walk's `binary`, the basename of argv[0] and never the command line
   * (owned-processes.ts `binaryOf`). A session's argv can carry a key, so a
   * whole command line is never written by this harness.
   */
  argv0: string;
  sessionName?: string;
}

export interface P163Capture {
  at: string;
  run: string;
  wantedSessions: number;
  userData: string;
  socket: string;
  mainPid: number;
  /** How many the harness created this launch and how long that took. */
  created: { count: number; ms: number };
  milestones: Milestone[];
  /** The renderer attached on its own before the harness stepped in. */
  attachedByRenderer: boolean;
  appMetrics: MetricRow[];
  mainMemory: {
    privateKb: number;
    sharedKb: number;
    heapUsedKb: number;
    heapTotalKb: number;
    heapLimitKb: number;
    mallocedKb: number;
  };
  windows: { id: number; pid: number; shown: boolean }[];
  sessions: { total: number; running: number; harness: number };
  owned: OwnedRow[];
  ownedSummary: OwnedSummary;
  /** The diagnostics report, or null when building it threw. */
  report: DiagnosticsReport | null;
  heapSnapshot: string | null;
}

const SHELL_BODY = ['-c', 'while true; do date; sleep 1; done'];

function envInt(name: string, fallback: number): number {
  const raw = (process.env[name] ?? '').trim();
  if (raw === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, ms));
}

/** Poll a milestone latch until it lands or the deadline passes. */
async function awaitMilestone(
  name: (typeof MILESTONES)[keyof typeof MILESTONES],
  deadlineMs: number
): Promise<boolean> {
  const until = Date.now() + deadlineMs;
  while (Date.now() < until) {
    if (milestoneLanded(name)) return true;
    await sleep(50);
  }
  return milestoneLanded(name);
}

function metricRows(): MetricRow[] {
  return app.getAppMetrics().map((m) => ({
    pid: m.pid,
    type: m.type,
    name: m.name ?? null,
    serviceName: m.serviceName ?? null,
    sandboxed: m.sandboxed ?? null,
    cpuPercent: m.cpu.percentCPUUsage,
    idleWakeupsPerSecond: m.cpu.idleWakeupsPerSecond,
    workingSetKb: m.memory.workingSetSize,
    peakWorkingSetKb: m.memory.peakWorkingSetSize
  }));
}

async function createShortfall(
  core: GmuxCore,
  wanted: number
): Promise<{ count: number; ms: number }> {
  const alive = core
    .listSessionRecords()
    .filter((r) => isHarnessSessionName(r.name) && r.status !== 'exited');
  const taken = new Set(alive.map((r) => r.name));
  const count = planCreates(wanted, alive.length);
  const home = homedir();
  const t0 = Date.now();
  let made = 0;
  for (let i = 1; made < count && i <= wanted + alive.length + 1; i += 1) {
    const name = harnessSessionName(i);
    if (taken.has(name)) continue;
    await core.createSession({
      name,
      projectPath: home,
      cwd: home,
      agent: 'shell',
      extraArgs: SHELL_BODY
    });
    taken.add(name);
    made += 1;
  }
  return { count: made, ms: Date.now() - t0 };
}

/**
 * The diagnostics report itself, through the one implementation the surface
 * uses. The contract in src/shared/ipc/diagnostics.ts is a window: begin
 * takes the first CPU sample and arms the IPC count, finish takes the second
 * and answers the report. The renderer's own facts are nulls here because
 * this capture runs in main, and the report says so rather than guessing.
 * A throw is recorded as null so the capture file still lands and the
 * supervisor can say which launch had no report.
 */
async function captureFullReport(rendererPid: number): Promise<DiagnosticsReport | null> {
  try {
    return await captureDiagnostics(undefined, 1_000, { rendererPid });
  } catch (err) {
    smokeLog(`the diagnostics report threw: ${(err as Error).message}`);
    return null;
  }
}

export interface P163CaptureDeps {
  /** The real app window factory, owned by the composition root. */
  createWindow(): BrowserWindow;
}

export async function runP163CaptureSmoke(deps: P163CaptureDeps): Promise<void> {
  armWatchdog(180_000);
  try {
    const isolation = assertHarnessIsolation('GMUX_P163_ROOT');
    const outPath = (process.env['GMUX_P163_OUT'] ?? '').trim();
    if (outPath === '') throw new Error('GMUX_P163_OUT is not set. Refusing to run.');
    const wanted = envInt('GMUX_P163_SESSIONS', 0);
    const run = (process.env['GMUX_P163_RUN'] ?? 'cold').trim() || 'cold';
    smokeLog(
      `1/7 isolated: profile under ${isolation.root}, socket ${isolation.socket}, ${String(wanted)} sessions wanted (${run})`
    );

    const core = await getGmuxCore();
    smokeLog('2/7 core booted and reconciled');

    const created = await createShortfall(core, wanted);
    smokeLog(`3/7 created ${String(created.count)} sessions in ${String(created.ms)} ms`);

    const win = deps.createWindow();
    await new Promise<void>((resolve, reject) => {
      win.webContents.once('did-finish-load', () => resolve());
      win.webContents.once('did-fail-load', (_e, code, desc) =>
        reject(new Error(`renderer failed to load: ${String(code)} ${desc}`))
      );
    });
    await awaitMilestone(MILESTONES.windowShown, 10_000);
    smokeLog('4/7 real window loaded and shown');

    // The renderer asks for both of these during hydration. Awaiting them
    // here does not move the marks, which land when the work lands.
    await installUserPath();
    await awaitMilestone(MILESTONES.sessionsListed, 20_000);

    // A fresh profile selects nothing, so the renderer mounts no terminal on
    // its own and the harness attaches the first session itself. The wait is
    // short because it is added straight onto the first-attach number, and
    // the JSON says which of the two did the attaching.
    let attachedByRenderer = false;
    if (wanted > 0) {
      attachedByRenderer = await awaitMilestone(MILESTONES.firstAttach, 1_000);
      if (!attachedByRenderer) {
        const first = core
          .listSessionRecords()
          .find((r) => isHarnessSessionName(r.name) && r.status !== 'exited');
        if (first === undefined) throw new Error('no harness session to attach');
        await core.attachSession(first.id, win.webContents);
      }
      const bytes = await awaitMilestone(MILESTONES.firstBytes, 15_000);
      if (!bytes) throw new Error('no terminal bytes reached main within 15 s');
    }
    smokeLog(
      `5/7 milestones: ${readMilestones()
        .map((m) => `${m.name}=${String(m.atMs)}`)
        .join(' ')}`
    );

    // Let the renderer paint the list before reading, then two samples.
    await sleep(1_500);
    metricRows();
    await sleep(1_000);
    const appMetrics = metricRows();
    const mem = await process.getProcessMemoryInfo();
    const heap = process.getHeapStatistics();
    const ownedRaw = await listGmuxProcesses();
    const owned: OwnedRow[] = ownedRaw.map((r) => ({
      pid: r.pid,
      ppid: r.ppid,
      role: r.role,
      rssBytes: r.rssBytes,
      cpuPercent: r.cpuPercent,
      argv0: r.binary ?? '',
      ...(r.sessionName !== undefined ? { sessionName: r.sessionName } : {})
    }));
    const report = await captureFullReport(win.webContents.getOSProcessId());
    const records = core.listSessionRecords();
    smokeLog(
      `6/7 read ${String(appMetrics.length)} Electron rows, ${String(owned.length)} owned rows, report ${report === null ? 'absent' : 'present'}`
    );

    let heapSnapshot: string | null = null;
    if (process.env['GMUX_P163_HEAP'] === '1') {
      heapSnapshot = join(dirname(outPath), `main-${run}-${String(wanted)}.heapsnapshot`);
      if (!process.takeHeapSnapshot(heapSnapshot)) heapSnapshot = null;
    }

    const capture: P163Capture = {
      at: new Date().toISOString(),
      run,
      wantedSessions: wanted,
      userData: isolation.userData,
      socket: isolation.socket,
      mainPid: process.pid,
      created,
      milestones: readMilestones(),
      attachedByRenderer,
      appMetrics,
      mainMemory: {
        privateKb: mem.private,
        sharedKb: mem.shared,
        heapUsedKb: heap.usedHeapSize,
        heapTotalKb: heap.totalHeapSize,
        heapLimitKb: heap.heapSizeLimit,
        mallocedKb: heap.mallocedMemory
      },
      windows: BrowserWindow.getAllWindows().map((w) => ({
        id: w.id,
        pid: w.webContents.getOSProcessId(),
        shown: w.isVisible()
      })),
      sessions: {
        total: records.length,
        running: records.filter((r) => r.status === 'running').length,
        harness: records.filter(
          (r) => isHarnessSessionName(r.name) && r.status !== 'exited'
        ).length
      },
      owned,
      ownedSummary: summarizeOwned(ownedRaw, {
        controlSession: CONTROL_SESSION_NAME
      }),
      report,
      heapSnapshot
    };
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(capture, null, 2)}\n`);
    smokeLog(`7/7 wrote ${outPath}`);

    // Sessions are left RUNNING on the scratch server on purpose: the warm
    // launch on this profile needs them, and the supervisor ends the server.
    await drainWatcherCloses(8_000);
    app.exit(0);
  } catch (err) {
    smokeFail(err);
  }
}
