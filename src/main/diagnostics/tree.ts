/**
 * The attribution (Phase 163): every owned process becomes either a SHELL row
 * or part of one SESSION workload, and the two are never added together.
 *
 * Inputs are facts other modules read: the ownership walk from
 * ./owned-processes.ts, Electron's own metrics, the physical footprints from
 * ./footprint.ts, the main process's own private number, the windows and
 * their renderer pids, and the session list from the manifest. This module
 * only joins them, so it is pure and the unit test drives every branch.
 *
 * What a row carries is chosen here and it is deliberately less than what
 * the walk knows. The walk holds a full command line per process; a shell row
 * keeps the basename and a session row keeps nothing about the argv at all.
 * An agent's argv can carry a key. That is why the report type in
 * src/shared/ipc/diagnostics.ts has no `command` field anywhere.
 */

import type {
  DiagnosticsCpuSource,
  DiagnosticsMemory,
  DiagnosticsSessionWorkload,
  DiagnosticsShellKind,
  DiagnosticsShellProcess,
  DiagnosticsTotals
} from '@shared/ipc';
import type { GmuxProcess } from './owned-processes';

/** The slice of Electron's `ProcessMetric` this module reads. */
export interface ElectronMetric {
  pid: number;
  type: string;
  name?: string;
  serviceName?: string;
  /** Percent of one core since the previous sample. */
  cpuPercent: number;
  /** Working set in bytes. */
  workingSetBytes: number;
}

export interface WindowFact {
  /** The renderer pid drawing this window. */
  pid: number;
  /** The window's title, which is user facing already. */
  title: string;
}

export interface SessionFact {
  id: string;
  name: string;
  agent: string;
  /** True for a session on another machine, which has no local pane. */
  remote: boolean;
}

export interface TreeInput {
  owned: readonly GmuxProcess[];
  metrics: readonly ElectronMetric[];
  /** pid to physical footprint bytes, from `footprint`. */
  footprints: ReadonlyMap<number, number>;
  /** The main process's own private bytes, from `getProcessMemoryInfo`. */
  mainPrivateBytes: number | null;
  /** Renderer private bytes when the main window's renderer reported them. */
  rendererPrivateBytes: number | null;
  /** The main window's renderer pid, so `rendererPrivateBytes` lands on it. */
  mainWindowPid: number | null;
  windows: readonly WindowFact[];
  sessions: readonly SessionFact[];
  appPid: number;
}

export interface TreeOutput {
  shell: DiagnosticsShellProcess[];
  /** Every shell row except the strays. */
  shellTotal: DiagnosticsTotals;
  /** The strays alone, never folded into `shellTotal`. */
  leftoverTotal: DiagnosticsTotals;
  sessions: DiagnosticsSessionWorkload[];
  sessionsTotal: DiagnosticsTotals;
  electronPids: { pid: number; type: string; named: boolean }[];
}

/** Electron's `ProcessMetric.type` to the row kind and its label. */
function electronKind(m: ElectronMetric): {
  kind: DiagnosticsShellKind;
  name: string;
} {
  switch (m.type) {
    case 'Browser':
      return { kind: 'main', name: 'main' };
    case 'Tab':
      return { kind: 'renderer', name: 'renderer' };
    case 'GPU':
      return { kind: 'gpu', name: 'GPU' };
    case 'Utility':
      return {
        kind: 'utility',
        name: m.name ?? m.serviceName ?? 'utility'
      };
    default:
      return { kind: 'electron-other', name: m.type.toLowerCase() };
  }
}

/** The walk's role to a shell kind. Session roles never reach this. */
function roleKind(p: GmuxProcess): { kind: DiagnosticsShellKind; name: string } {
  const binary = p.binary ?? '';
  // The only app-helper rows that carry a session name are the event bus
  // session's own pane and its children (owned-processes.ts step 3).
  if (p.role === 'app-helper' && p.sessionName !== undefined) {
    return { kind: 'control-client', name: 'event bus session' };
  }
  switch (p.role) {
    case 'session-server':
      return { kind: 'session-server', name: 'session server' };
    case 'control-client':
      return { kind: 'control-client', name: 'event bus client' };
    case 'attach-client':
      return { kind: 'attach-client', name: 'session client' };
    case 'ssh-helper':
      return { kind: 'ssh-helper', name: 'ssh helper' };
    case 'probe':
      return { kind: 'probe', name: `probe (${binary})` };
    case 'orphan-client':
    case 'orphan-probe':
      return { kind: 'orphan', name: `left behind (${binary})` };
    default:
      return { kind: 'helper', name: binary === '' ? 'helper' : binary };
  }
}

function memoryOf(
  privateBytes: number | null,
  source: DiagnosticsMemory['privateSource'],
  rssBytes: number
): DiagnosticsMemory {
  return privateBytes === null
    ? { privateBytes: null, privateSource: null, rssBytes }
    : { privateBytes, privateSource: source, rssBytes };
}

function totalsOf(
  rows: readonly { memory: DiagnosticsMemory }[],
  processCount: number
): DiagnosticsTotals {
  let privateBytes = 0;
  let rssBytes = 0;
  for (const row of rows) {
    privateBytes += row.memory.privateBytes ?? 0;
    rssBytes += row.memory.rssBytes;
  }
  return { privateBytes, rssBytes, processCount };
}

/**
 * Build the two groups. Every Electron pid becomes a shell row whether or
 * not `ps` saw it, so nothing Electron reports is ever silently absent; a
 * pid `ps` did not list carries zero RSS and Electron's working set as its
 * only number. Every owned process outside a session becomes a shell row.
 * Every session's subtree becomes one workload row.
 */
export function buildTree(input: TreeInput): TreeOutput {
  const byPid = new Map<number, GmuxProcess>();
  for (const p of input.owned) byPid.set(p.pid, p);
  const metricByPid = new Map<number, ElectronMetric>();
  for (const m of input.metrics) metricByPid.set(m.pid, m);
  const windowByPid = new Map<number, WindowFact>();
  for (const w of input.windows) windowByPid.set(w.pid, w);

  const shell: DiagnosticsShellProcess[] = [];
  const claimed = new Set<number>();

  // 1. Electron's own processes, in Electron's order, named by type. The
  //    honest private number is the process's own where one exists, the
  //    footprint otherwise, and the working set from Electron last.
  for (const m of input.metrics) {
    const { kind, name } = electronKind(m);
    const owned = byPid.get(m.pid);
    let privateBytes: number | null = null;
    let source: DiagnosticsMemory['privateSource'] = null;
    if (m.pid === input.appPid && input.mainPrivateBytes !== null) {
      privateBytes = input.mainPrivateBytes;
      source = 'electron';
    } else if (
      m.pid === input.mainWindowPid &&
      input.rendererPrivateBytes !== null
    ) {
      privateBytes = input.rendererPrivateBytes;
      source = 'electron';
    } else {
      const fp = input.footprints.get(m.pid);
      if (fp !== undefined) {
        privateBytes = fp;
        source = 'footprint';
      }
    }
    const rssBytes = owned?.rssBytes ?? m.workingSetBytes;
    const win = windowByPid.get(m.pid);
    const detail =
      kind === 'renderer'
        ? (win?.title ?? 'no window')
        : kind === 'utility' && m.serviceName !== undefined && m.serviceName !== name
          ? m.serviceName
          : undefined;
    shell.push({
      pid: m.pid,
      ppid: owned?.ppid ?? input.appPid,
      kind,
      name,
      ...(detail !== undefined ? { detail } : {}),
      memory: memoryOf(privateBytes, source, rssBytes),
      cpuPercent: m.cpuPercent,
      cpuSource: 'sampled',
      electron: true
    });
    claimed.add(m.pid);
  }

  // 2. Everything else Tortie owns that is not a session's: helpers by
  //    binary, the session server, the clients, the ssh masters, the strays.
  //    `ps` gives a lifetime CPU average for these and the row says so.
  const lifetime: DiagnosticsCpuSource = 'lifetime';
  for (const p of input.owned) {
    if (claimed.has(p.pid)) continue;
    if (p.role === 'session' || p.role === 'session-child') continue;
    if (p.role === 'app') {
      // Electron did not list main, which cannot happen in production but a
      // fixture may say so; keep the row rather than lose the app.
      shell.push({
        pid: p.pid,
        ppid: p.ppid,
        kind: 'main',
        name: 'main',
        memory: memoryOf(input.mainPrivateBytes, 'electron', p.rssBytes),
        cpuPercent: p.cpuPercent,
        cpuSource: lifetime,
        electron: false
      });
      claimed.add(p.pid);
      continue;
    }
    const { kind, name } = roleKind(p);
    const fp = input.footprints.get(p.pid);
    shell.push({
      pid: p.pid,
      ppid: p.ppid,
      kind,
      name,
      ...(p.machineLabel !== undefined ? { detail: p.machineLabel } : {}),
      memory: memoryOf(fp ?? null, 'footprint', p.rssBytes),
      cpuPercent: p.cpuPercent,
      cpuSource: lifetime,
      electron: false
    });
    claimed.add(p.pid);
  }

  // 3. One row per session. The key is the manifest id when the pane carries
  //    one and the server's name otherwise, so two panes of one session (a
  //    split) fold into the same row. A session in the manifest with no pane
  //    on this Mac is a remote one or a stopped one, and it draws no row.
  const sessionById = new Map<string, SessionFact>();
  for (const s of input.sessions) sessionById.set(s.id, s);
  const groups = new Map<
    string,
    { row: DiagnosticsSessionWorkload; members: GmuxProcess[] }
  >();
  for (const p of input.owned) {
    if (p.role !== 'session' && p.role !== 'session-child') continue;
    if (claimed.has(p.pid)) continue;
    const key = p.sessionId ?? `name:${p.sessionName ?? ''}`;
    let group = groups.get(key);
    if (group === undefined) {
      const fact = p.sessionId === undefined ? undefined : sessionById.get(p.sessionId);
      group = {
        row: {
          sessionId: p.sessionId ?? null,
          name: fact?.name ?? p.sessionName ?? '',
          agent: fact?.agent ?? 'unknown',
          processCount: 0,
          memory: { privateBytes: null, privateSource: null, rssBytes: 0 },
          cpuPercent: 0
        },
        members: []
      };
      groups.set(key, group);
    }
    group.members.push(p);
    claimed.add(p.pid);
  }
  const sessions: DiagnosticsSessionWorkload[] = [];
  for (const { row, members } of groups.values()) {
    let priv: number | null = null;
    let rss = 0;
    let cpu = 0;
    for (const m of members) {
      rss += m.rssBytes;
      cpu += m.cpuPercent;
      const fp = input.footprints.get(m.pid);
      if (fp !== undefined) priv = (priv ?? 0) + fp;
    }
    sessions.push({
      ...row,
      processCount: members.length,
      memory: memoryOf(priv, 'footprint', rss),
      cpuPercent: Math.round(cpu * 10) / 10
    });
  }
  sessions.sort((a, b) => (b.memory.privateBytes ?? b.memory.rssBytes) - (a.memory.privateBytes ?? a.memory.rssBytes));

  const electronPids = input.metrics.map((m) => ({
    pid: m.pid,
    type: m.type,
    named: shell.some((row) => row.pid === m.pid)
  }));

  // A client or probe an earlier launch left running is drawn so a person
  // can see it and counted apart, because it is not what this app costs.
  const own = shell.filter((row) => row.kind !== 'orphan');
  const leftover = shell.filter((row) => row.kind === 'orphan');
  return {
    shell,
    shellTotal: totalsOf(own, own.length),
    leftoverTotal: totalsOf(leftover, leftover.length),
    sessions,
    sessionsTotal: totalsOf(
      sessions,
      sessions.reduce((n, s) => n + s.processCount, 0)
    ),
    electronPids
  };
}
