/**
 * The diagnostics report contract (Phase 163).
 *
 * One on demand capture that explains the app's own time, memory, processes
 * and disk. Nothing in this contract runs on a timer. A capture is two calls
 * from the renderer, `diagnostics:begin` and `diagnostics:finish`, because
 * every CPU number Electron and the OS can give is "since the last sample",
 * so a capture needs a window with a start and an end. The renderer opens the
 * window, gathers its own facts over it (heap, Blink memory, mounted terminal
 * surfaces, long tasks) and hands them to `finish`, which takes the second
 * sample, reads everything else on demand and answers with one report plus
 * its plain text. A `begin` that is never finished leaves nothing behind but
 * one boolean and two integers in main; the next `begin` replaces it.
 *
 * THE SPLIT THAT MAKES THIS SURFACE EARN ITS PLACE. `shell` is what Tortie
 * itself costs: main, renderers, GPU, utilities, the session server, the
 * clients Tortie runs against it, the ssh helpers, the short lived probes.
 * `sessions` is the work Tortie supervises: one row per session, the subtree
 * of the process the session was started with, which would exist in a plain
 * terminal too. The two totals are never added together, in the report or on
 * a surface, because a sum of them is the number every generic tool already
 * shows and it explains nothing.
 *
 * WHAT A REPORT NEVER CARRIES: a command line, an environment value, a file's
 * contents, a project path with the home directory in it. Shell rows name a
 * process by role and by the basename of what was launched. Session rows name
 * the agent and the session's display name and nothing about its argv.
 *
 * Heap snapshots are OPT IN and live on their own channel. They write a file
 * to a path a person chose in a dialog and never enter a report.
 */

// ---------------------------------------------------------------------------
// Memory, stated honestly
// ---------------------------------------------------------------------------

/**
 * How the private number was read. `electron` is `process.getProcessMemoryInfo`
 * in the process itself, which only a process running JavaScript can answer.
 * `footprint` is the OS's physical footprint for every other process, the
 * same number Activity Monitor's Memory column shows. `null` means neither
 * could read it and only RSS is known.
 */
export type DiagnosticsPrivateSource = 'electron' | 'footprint' | null;

export interface DiagnosticsMemory {
  /** Private or physical footprint bytes, the honest number. Null when unread. */
  privateBytes: number | null;
  privateSource: DiagnosticsPrivateSource;
  /** Resident set bytes from `ps`, the familiar number. RSS overstates. */
  rssBytes: number;
}

/**
 * Percent of one core. `sampled` is the rate over the capture window, which
 * is what Electron gives for its own processes. `lifetime` is the average
 * since the process started, which is what `ps` gives for everything else.
 * The two are labelled because they are not comparable.
 */
export type DiagnosticsCpuSource = 'sampled' | 'lifetime';

// ---------------------------------------------------------------------------
// The shell: what Tortie itself costs
// ---------------------------------------------------------------------------

export type DiagnosticsShellKind =
  /** The main process. */
  | 'main'
  /** A renderer, named by the window it draws when one matches. */
  | 'renderer'
  /** The GPU process. */
  | 'gpu'
  /** A Chromium utility process, named by its service. */
  | 'utility'
  /** Any other process Electron reports (zygote, sandbox helper, unknown). */
  | 'electron-other'
  /** The private session server. It outlives the app and is not a child. */
  | 'session-server'
  /** The event bus client Tortie runs against the session server. */
  | 'control-client'
  /** A client Tortie runs for one visible session. */
  | 'attach-client'
  /** An ssh process Tortie started for a machine, live or persisted. */
  | 'ssh-helper'
  /** A short lived question asking child (a PATH probe, a version probe). */
  | 'probe'
  /** Something else Tortie spawned, named by its binary (rg, zsh, git). */
  | 'helper'
  /** A client or probe an EARLIER Tortie left running. */
  | 'orphan';

export interface DiagnosticsShellProcess {
  pid: number;
  ppid: number;
  kind: DiagnosticsShellKind;
  /** Short label: 'main', 'renderer', 'GPU', 'Network Service', 'tmux', 'rg'. */
  name: string;
  /**
   * One line of detail: the window a renderer draws, the service a utility
   * runs, the machine an ssh helper reaches. Never a command line.
   */
  detail?: string;
  memory: DiagnosticsMemory;
  cpuPercent: number;
  cpuSource: DiagnosticsCpuSource;
  /** True when Electron's own metrics listed this pid. */
  electron: boolean;
}

// ---------------------------------------------------------------------------
// The sessions: what Tortie supervises
// ---------------------------------------------------------------------------

export interface DiagnosticsSessionWorkload {
  /** The manifest id, or null when the session carries no `@gmux-id`. */
  sessionId: string | null;
  /** The display name from the manifest, else the server's own name. */
  name: string;
  /** The agent kind from the manifest, or 'unknown' with no row. */
  agent: string;
  /** The process the session was launched with plus every descendant. */
  processCount: number;
  memory: DiagnosticsMemory;
  /** Lifetime average, summed over the subtree. */
  cpuPercent: number;
}

// ---------------------------------------------------------------------------
// Every other fact, on demand
// ---------------------------------------------------------------------------

export interface DiagnosticsCounts {
  /** Rows the session list draws, local plus remote. */
  sessions: number;
  localSessions: number;
  remoteSessions: number;
  /** Windows Tortie has open right now. */
  windows: number;
  /** Repositories with a live file watcher. */
  watchers: number;
  /** Watcher closes issued and not yet answered by the kernel. */
  pendingWatcherCloses: number;
  /** Open connections to other machines, one per machine. */
  remoteFeeds: number;
  /** Terminal surfaces mounted in the renderer. Null when unreported. */
  mountedSurfaces: number | null;
  /** Things Tortie holds open, by name. Never a number that rises. */
  listeners: string[];
}

export interface DiagnosticsWatcherObservation {
  /** Repository basename, redacted of the home prefix. */
  repo: string;
  /** Event batches the kernel dropped. */
  drops: number;
  /** Re-reads scheduled because of a drop. */
  rescansScheduled: number;
  /** Re-reads that ran. */
  rescansCompleted: number;
}

export interface DiagnosticsDisk {
  /** Chromium's HTTP cache, from its own index. */
  httpCacheBytes: number | null;
  /** The JavaScript code cache directory. */
  codeCacheBytes: number | null;
  /** Tortie's durable data under the inner `gmux` directory. */
  durableBytes: number | null;
  /** The whole profile directory. */
  profileBytes: number | null;
  /** Free bytes on the volume holding the profile. */
  freeBytes: number | null;
  /** The profile path with the home prefix redacted. */
  profilePath: string;
  /**
   * Phase 166. The HTTP cache ceiling this launch applied through Chromium's
   * own switch, or null when Chromium's default stands. The default is
   * 1,280 MiB on a volume with room, and nothing Tortie serves in the
   * packaged app is stored under it, so null is the ordinary answer.
   */
  httpCacheCeilingBytes: number | null;
  /** Phase 166. Which cache policy this launch runs under, and why. */
  cachePolicy: DiagnosticsCachePolicy;
}

/**
 * Phase 166. `dev-ceiling` is the one shape that writes to the HTTP cache,
 * being a renderer served by the vite dev server over http, and it runs
 * under a ceiling. `chromium-default` is every other shape, where Chromium's
 * own ceiling stands and is never reached because file:, gmux-asset: and
 * gmux-preview: resources are never stored. Nothing in either mode deletes.
 */
export type DiagnosticsCachePolicyMode = 'dev-ceiling' | 'chromium-default';

export interface DiagnosticsCachePolicy {
  mode: DiagnosticsCachePolicyMode;
  /** One sentence from the policy itself, the same one the boot log carries. */
  reason: string;
}

/**
 * The startup milestones, in the order a healthy launch reaches them. Main
 * records each one once (src/main/diagnostics/milestones.ts) and the report
 * tab gives each one its label (src/renderer/diagnostics/format.ts), and both
 * read this one list, so a mark added on one side cannot go missing on the
 * other. Phase 164 measures its own work against these names.
 */
export const DIAGNOSTICS_MILESTONES = [
  'app-ready',
  'window-shown',
  'sessions-reconciled',
  'sessions-listed',
  'path-ready',
  'first-attach',
  'first-bytes'
] as const;

export type DiagnosticsMilestoneName = (typeof DIAGNOSTICS_MILESTONES)[number];

export interface DiagnosticsMilestone {
  name: DiagnosticsMilestoneName;
  /** Milliseconds after the main process's time origin. */
  atMs: number;
}

export interface DiagnosticsIpcSample {
  /** Renderer to main invokes counted over the window. */
  invokes: number;
  /**
   * Main to renderer pushes counted over the window: typed events, terminal
   * bytes and exits, search results and clone progress.
   */
  events: number;
  /** The window the counts cover. */
  windowMs: number;
}

export interface DiagnosticsMainMemory {
  privateBytes: number;
  sharedBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  heapLimitBytes: number;
  mallocedBytes: number;
}

/** Long tasks the renderer observed over the capture window. */
export interface DiagnosticsLongTasks {
  count: number;
  totalMs: number;
  maxMs: number;
  /** True when entries from before the observer existed were included. */
  buffered: boolean;
}

/**
 * The renderer's own facts. `memory` comes from the preload's
 * `rendererMemory()` and the rest from the renderer's view of itself.
 */
export interface DiagnosticsRendererMemory {
  privateBytes: number;
  sharedBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  heapLimitBytes: number;
  mallocedBytes: number;
  blinkAllocatedBytes: number;
  blinkTotalBytes: number;
}

export interface DiagnosticsRendererFacts {
  memory: DiagnosticsRendererMemory | null;
  mountedSurfaces: number | null;
  longTasks: DiagnosticsLongTasks | null;
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

export interface DiagnosticsTotals {
  privateBytes: number;
  rssBytes: number;
  processCount: number;
}

export interface DiagnosticsReport {
  /** ISO time the window closed. */
  generatedAt: string;
  appVersion: string;
  /** How long the sampling window was, in milliseconds. */
  windowMs: number;
  shell: DiagnosticsShellProcess[];
  /** What this app costs: every `shell` row except the `orphan` ones. */
  shellTotal: DiagnosticsTotals;
  /**
   * Clients and probes an EARLIER Tortie left running. They stay in `shell`
   * as `orphan` rows so a person can see them, and they are counted here and
   * never in `shellTotal`, because a stray is not what this app costs. On
   * the operator's Mac on 2026-08-29 there were twenty of them, and folded
   * into the total they would have made the app read three times its size.
   */
  leftoverTotal: DiagnosticsTotals;
  sessions: DiagnosticsSessionWorkload[];
  sessionsTotal: DiagnosticsTotals;
  /**
   * The proof for the audit's second item: every pid Electron's own metrics
   * listed, and whether each one appears in `shell`. Nothing is excluded;
   * a pid that could not be matched is still named by its type.
   */
  electronPids: { pid: number; type: string; named: boolean }[];
  main: DiagnosticsMainMemory;
  renderer: DiagnosticsRendererFacts;
  counts: DiagnosticsCounts;
  watchers: DiagnosticsWatcherObservation[];
  disk: DiagnosticsDisk;
  milestones: DiagnosticsMilestone[];
  ipc: DiagnosticsIpcSample;
  /** Plain text, one fact per line, the thing the Copy button carries. */
  text: string;
}

export interface DiagnosticsCaptureHandle {
  /** Names the open window. A second begin replaces the first. */
  id: string;
}

export type DiagnosticsHeapTarget = 'main' | 'window';

export interface DiagnosticsHeapSnapshotResult {
  /** 'saved' with the redacted path, 'cancelled' when the dialog was closed. */
  outcome: 'saved' | 'cancelled';
  path?: string;
}

export interface DiagnosticsInvokeChannelMap {
  /** Open a capture window: first CPU sample, IPC counting armed. */
  'diagnostics:begin': { req: []; res: DiagnosticsCaptureHandle };
  /**
   * Close the window and answer with the report. The renderer's facts are
   * merged in; pass nulls when a fact could not be gathered.
   */
  'diagnostics:finish': {
    req: [id: string, facts: DiagnosticsRendererFacts];
    res: DiagnosticsReport;
  };
  /**
   * OPT IN. Ask where to save, then write a heap snapshot there. Nothing is
   * written without a path the person chose. Never part of a report.
   */
  'diagnostics:saveHeapSnapshot': {
    req: [target: DiagnosticsHeapTarget];
    res: DiagnosticsHeapSnapshotResult;
  };
}

/** The `window.gmux.diagnostics` surface (src/preload/diagnostics.ts). */
export interface GmuxDiagnosticsExtras {
  diagnostics: {
    begin(): Promise<DiagnosticsCaptureHandle>;
    finish(
      id: string,
      facts: DiagnosticsRendererFacts
    ): Promise<DiagnosticsReport>;
    /**
     * The renderer's own private memory, V8 heap and Blink numbers, read in
     * the preload without an IPC round trip. Null when the process cannot
     * answer.
     */
    rendererMemory(): Promise<DiagnosticsRendererMemory | null>;
    saveHeapSnapshot(
      target: DiagnosticsHeapTarget
    ): Promise<DiagnosticsHeapSnapshotResult>;
  };
}
