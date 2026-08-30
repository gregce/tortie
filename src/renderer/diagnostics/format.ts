/**
 * Pure helpers for the diagnostics report surface (Phase 163).
 *
 * Nothing here touches the bridge, the DOM or a store. Every function takes
 * the report's own numbers and returns a string or a sorted list, so the
 * unit suite can pin the words and the order without an Electron.
 */

import {
  DIAGNOSTICS_MILESTONES,
  type DiagnosticsMachineContext,
  type DiagnosticsMilestoneName,
  type DiagnosticsSessionWorkload,
  type DiagnosticsShellKind,
  type DiagnosticsShellProcess
} from '@shared/ipc';
import { formatBytes } from '../editor/image/zoom';
import { NOT_READ } from './copy';

/** Bytes as a person reads them, or the honest word when nothing was read. */
export function bytesLabel(bytes: number | null): string {
  if (bytes === null) return NOT_READ;
  return formatBytes(bytes);
}

/** Milliseconds under a second, seconds with one decimal above. */
export function msLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return NOT_READ;
  if (ms < 1000) return `${String(Math.round(ms))} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/** Percent of one core with one decimal, and a bare 0 for nothing. */
export function cpuLabel(percent: number): string {
  if (!Number.isFinite(percent) || percent <= 0) return '0%';
  return `${percent < 10 ? percent.toFixed(1) : String(Math.round(percent))}%`;
}

/**
 * The milestone names main records (src/main/diagnostics/milestones.ts), as
 * the short labels a person reads. Nothing here says attach, pane or server.
 * The table is typed over the contract's own list, so a mark added in main
 * does not compile here until it has a word.
 */
const MILESTONE_LABELS: Readonly<Record<DiagnosticsMilestoneName, string>> = {
  'app-ready': 'App ready',
  'window-shown': 'Window shown',
  'sessions-reconciled': 'Sessions checked',
  'sessions-listed': 'Sessions listed',
  'path-ready': 'Shell path ready',
  'first-attach': 'First session opened',
  'first-bytes': 'First output'
};

/** Launch order, so a report's milestones draw left to right in time. */
export const MILESTONE_ORDER: readonly string[] = DIAGNOSTICS_MILESTONES;

/**
 * The mark name as main's milestone module names it. Marks are recorded with
 * a `tortie:` prefix so a foreign mark can never be read as ours, and a
 * report may carry the name with or without it. Both read as one milestone.
 */
export function milestoneKey(name: string): string {
  return name.startsWith('tortie:') ? name.slice('tortie:'.length) : name;
}

export function milestoneLabel(name: string): string {
  const key = milestoneKey(name);
  const labels: Readonly<Record<string, string | undefined>> = MILESTONE_LABELS;
  return labels[key] ?? key;
}

/**
 * The kind labels for the Tortie table. None of them is tmux vocabulary: the
 * server is the session server, the control client is the event feed, and a
 * client that draws one session is that session's view.
 */
const KIND_LABELS: Readonly<Record<DiagnosticsShellKind, string>> = {
  main: 'Main',
  renderer: 'Window',
  gpu: 'GPU',
  utility: 'Utility',
  'electron-other': 'Other',
  'session-server': 'Session server',
  'control-client': 'Event feed',
  'attach-client': 'Session view',
  'ssh-helper': 'Machine link',
  probe: 'Probe',
  helper: 'Helper',
  orphan: 'Left over'
};

export function kindLabel(kind: DiagnosticsShellKind): string {
  return KIND_LABELS[kind] ?? kind;
}

/** The order the Tortie table lists kinds in: the app first, then what it runs. */
const KIND_ORDER: readonly DiagnosticsShellKind[] = [
  'main',
  'renderer',
  'gpu',
  'utility',
  'electron-other',
  'session-server',
  'control-client',
  'attach-client',
  'ssh-helper',
  'helper',
  'probe',
  'orphan'
];

export interface ShellRow {
  process: DiagnosticsShellProcess;
  /** 0 for a root, 1 for a child of another row in the table. */
  depth: number;
}

/**
 * The Tortie rows in table order with one level of parent indentation, the
 * Process Explorer shape without its refresh timer or its kill action. A row
 * whose parent is another row in the table is a child; everything else is a
 * root. Sorted by kind, then by pid, so two captures of the same processes
 * draw in the same order.
 */
export function shellRows(processes: readonly DiagnosticsShellProcess[]): ShellRow[] {
  const pids = new Set(processes.map((p) => p.pid));
  const rank = (k: DiagnosticsShellKind): number => {
    const i = KIND_ORDER.indexOf(k);
    return i === -1 ? KIND_ORDER.length : i;
  };
  return [...processes]
    .sort((a, b) => rank(a.kind) - rank(b.kind) || a.pid - b.pid)
    .map((process) => ({
      process,
      depth: pids.has(process.ppid) && process.ppid !== process.pid ? 1 : 0
    }));
}

/** The time of a capture, as the header states it. */
export function capturedAtLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Phase 168. 1st, 2nd, 3rd, 4th, with the 11 to 13 exception. */
export function ordinalLabel(n: number): string {
  const tail = n % 100;
  if (tail >= 11 && tail <= 13) return `${String(n)}th`;
  switch (n % 10) {
    case 1:
      return `${String(n)}st`;
    case 2:
      return `${String(n)}nd`;
    case 3:
      return `${String(n)}rd`;
    default:
      return `${String(n)}th`;
  }
}

/**
 * Phase 168. The machine context as one sentence for the face. The app
 * names in it are the face's alone; the copied report carries the rank and
 * never the names, which src/main/diagnostics/report-text.ts keeps.
 */
export function machineSentence(m: DiagnosticsMachineContext | null): string | null {
  if (m === null) return null;
  if (m.rank === 1 || m.above.length === 0) {
    return `Tortie is the largest of the ${String(m.appCount)} apps on this Mac by memory.`;
  }
  const names = m.above.map((a) => a.name);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const others = m.rank - 1 > names.length ? ' and others' : '';
  return `Tortie is ${ordinalLabel(m.rank)} of ${String(m.appCount)} apps on this Mac by memory, behind ${list}${others}.`;
}

// ---------------------------------------------------------------------------
// Sorting (Phase 170): every process table sorts by a clicked column
// ---------------------------------------------------------------------------

export type SortDir = 'asc' | 'desc';

export interface SortSpec<C extends string> {
  col: C;
  dir: SortDir;
}

export type ShellSortCol = 'process' | 'pid' | 'cpu' | 'private' | 'resident';
export type SessionSortCol = 'session' | 'agent' | 'processes' | 'cpu' | 'memory';

/** The columns that read as words. A first click sorts them ascending. */
const TEXT_COLS: ReadonlySet<string> = new Set(['process', 'session', 'agent']);

/**
 * The next sort after a click on a column head. A first click on a text
 * column reads A to Z; a first click on a number column puts the biggest
 * first, because that is the question a person clicking Memory is asking.
 * A second click on the same column turns it around. The default order
 * stands until the first click, which is the charter's rule.
 */
export function nextSort<C extends string>(
  current: SortSpec<C> | null,
  col: C
): SortSpec<C> {
  if (current !== null && current.col === col) {
    return { col, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { col, dir: TEXT_COLS.has(col) ? 'asc' : 'desc' };
}

/** A stable sort: equal keys keep the order they arrived in. */
function stableBy<T>(
  rows: readonly T[],
  key: (row: T) => number | string,
  dir: SortDir
): T[] {
  const decorated = rows.map((row, i) => ({ row, i, k: key(row) }));
  decorated.sort((a, b) => {
    const c =
      typeof a.k === 'string' && typeof b.k === 'string'
        ? a.k.localeCompare(b.k)
        : (a.k as number) - (b.k as number);
    if (c === 0) return a.i - b.i;
    return dir === 'asc' ? c : -c;
  });
  return decorated.map((d) => d.row);
}

/**
 * The Tortie rows under a sort, or the default order untouched when no
 * column has been clicked. A row whose private figure was not read sorts
 * below every read one, never as zero.
 */
export function sortShellRows(
  rows: readonly ShellRow[],
  sort: SortSpec<ShellSortCol> | null
): ShellRow[] {
  if (sort === null) return [...rows];
  const key = (row: ShellRow): number | string => {
    const p = row.process;
    switch (sort.col) {
      case 'process':
        return `${kindLabel(p.kind)} ${p.name}`.toLowerCase();
      case 'pid':
        return p.pid;
      case 'cpu':
        return p.cpuPercent;
      case 'private':
        return p.memory.privateBytes ?? -1;
      case 'resident':
        return p.memory.rssBytes;
    }
  };
  return stableBy(rows, key, sort.dir);
}

/**
 * The session rows under a sort. The default order is by name, as the table
 * has always drawn it, and it stands until a person clicks.
 */
export function sortSessionRows(
  rows: readonly DiagnosticsSessionWorkload[],
  sort: SortSpec<SessionSortCol> | null
): DiagnosticsSessionWorkload[] {
  const base = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === null) return base;
  const key = (s: DiagnosticsSessionWorkload): number | string => {
    switch (sort.col) {
      case 'session':
        return s.name.toLowerCase();
      case 'agent':
        return s.agent.toLowerCase();
      case 'processes':
        return s.processCount;
      case 'cpu':
        return s.cpuPercent;
      case 'memory':
        return s.memory.privateBytes ?? -1;
    }
  };
  return stableBy(base, key, sort.dir);
}
