/**
 * Sorting (Phase 170): pure, stable, and the default order stands until a
 * person clicks. A private figure that was not read sorts below every read
 * one rather than pretending to be zero.
 */

import { describe, expect, it } from 'vitest';
import type { DiagnosticsSessionWorkload, DiagnosticsShellProcess } from '@shared/ipc';
import {
  nextSort,
  shellRows,
  sortSessionRows,
  sortShellRows,
  type ShellRow
} from '../format';

function proc(over: Partial<DiagnosticsShellProcess>): DiagnosticsShellProcess {
  return {
    pid: 1,
    ppid: 1,
    kind: 'helper',
    name: 'helper',
    memory: { privateBytes: 1, privateSource: 'footprint', rssBytes: 1 },
    cpuPercent: 0,
    cpuSource: 'lifetime',
    electron: false,
    ...over
  };
}

function session(over: Partial<DiagnosticsSessionWorkload>): DiagnosticsSessionWorkload {
  return {
    sessionId: 'id',
    name: 'name',
    agent: 'claude',
    processCount: 1,
    memory: { privateBytes: 1, privateSource: 'footprint', rssBytes: 1 },
    cpuPercent: 0,
    projectName: null,
    projectPath: null,
    createdAt: null,
    lastSeen: null,
    ...over
  };
}

describe('nextSort', () => {
  it('starts a text column ascending and a number column descending', () => {
    expect(nextSort(null, 'process')).toEqual({ col: 'process', dir: 'asc' });
    expect(nextSort(null, 'session')).toEqual({ col: 'session', dir: 'asc' });
    expect(nextSort(null, 'agent')).toEqual({ col: 'agent', dir: 'asc' });
    expect(nextSort(null, 'private')).toEqual({ col: 'private', dir: 'desc' });
    expect(nextSort(null, 'memory')).toEqual({ col: 'memory', dir: 'desc' });
  });

  it('turns the same column around, and starts fresh on another', () => {
    const first = nextSort(null, 'cpu');
    expect(first).toEqual({ col: 'cpu', dir: 'desc' });
    expect(nextSort(first, 'cpu')).toEqual({ col: 'cpu', dir: 'asc' });
    expect(nextSort(first, 'pid')).toEqual({ col: 'pid', dir: 'desc' });
  });
});

describe('sortShellRows', () => {
  const rows: ShellRow[] = shellRows([
    proc({ pid: 10, kind: 'main', name: 'main', memory: { privateBytes: 300, privateSource: 'electron', rssBytes: 500 }, cpuPercent: 2 }),
    proc({ pid: 20, ppid: 10, kind: 'renderer', name: 'renderer', memory: { privateBytes: 100, privateSource: 'electron', rssBytes: 200 }, cpuPercent: 5 }),
    proc({ pid: 30, kind: 'session-server', name: 'server', memory: { privateBytes: null, privateSource: null, rssBytes: 50 }, cpuPercent: 1 })
  ]);

  it('leaves the default order alone with no sort', () => {
    expect(sortShellRows(rows, null).map((r) => r.process.pid)).toEqual([10, 20, 30]);
  });

  it('sorts private descending with the unread row last, never as zero above nothing', () => {
    const sorted = sortShellRows(rows, { col: 'private', dir: 'desc' });
    expect(sorted.map((r) => r.process.pid)).toEqual([10, 20, 30]);
    const asc = sortShellRows(rows, { col: 'private', dir: 'asc' });
    expect(asc.map((r) => r.process.pid)).toEqual([30, 20, 10]);
  });

  it('sorts by cpu and by pid both ways', () => {
    expect(sortShellRows(rows, { col: 'cpu', dir: 'desc' }).map((r) => r.process.pid)).toEqual([20, 10, 30]);
    expect(sortShellRows(rows, { col: 'pid', dir: 'asc' }).map((r) => r.process.pid)).toEqual([10, 20, 30]);
  });

  it('keeps arrival order for equal keys, which is what stable means', () => {
    const tied: ShellRow[] = shellRows([
      proc({ pid: 1, kind: 'helper', name: 'a', cpuPercent: 3 }),
      proc({ pid: 2, kind: 'helper', name: 'b', cpuPercent: 3 }),
      proc({ pid: 3, kind: 'helper', name: 'c', cpuPercent: 3 })
    ]);
    expect(sortShellRows(tied, { col: 'cpu', dir: 'desc' }).map((r) => r.process.pid)).toEqual([1, 2, 3]);
    expect(sortShellRows(tied, { col: 'cpu', dir: 'asc' }).map((r) => r.process.pid)).toEqual([1, 2, 3]);
  });
});

describe('sortSessionRows', () => {
  const rows = [
    session({ sessionId: 'b', name: 'beta', agent: 'codex', processCount: 2, memory: { privateBytes: 100, privateSource: 'footprint', rssBytes: 100 }, cpuPercent: 3 }),
    session({ sessionId: 'a', name: 'alpha', agent: 'claude', processCount: 5, memory: { privateBytes: 400, privateSource: 'footprint', rssBytes: 400 }, cpuPercent: 12 })
  ];

  it('defaults to name order until a person clicks', () => {
    expect(sortSessionRows(rows, null).map((s) => s.name)).toEqual(['alpha', 'beta']);
  });

  it('sorts by memory, agent and processes', () => {
    expect(sortSessionRows(rows, { col: 'memory', dir: 'desc' }).map((s) => s.name)).toEqual(['alpha', 'beta']);
    expect(sortSessionRows(rows, { col: 'memory', dir: 'asc' }).map((s) => s.name)).toEqual(['beta', 'alpha']);
    expect(sortSessionRows(rows, { col: 'agent', dir: 'asc' }).map((s) => s.name)).toEqual(['alpha', 'beta']);
    expect(sortSessionRows(rows, { col: 'processes', dir: 'desc' }).map((s) => s.name)).toEqual(['alpha', 'beta']);
  });

  // PHASE 188. The three new columns, in both directions. The point of the
  // phase is a table of rows whose NAMES repeat, so these rows share one.
  const dated = [
    session({ sessionId: '1', name: 'claude-1', projectName: 'zebra', createdAt: 300, lastSeen: 900 }),
    session({ sessionId: '2', name: 'claude-1', projectName: 'apex', createdAt: 100, lastSeen: 700 }),
    session({ sessionId: '3', name: 'claude-1', projectName: 'mid', createdAt: 200, lastSeen: 800 })
  ];

  it('sorts by project in both directions', () => {
    expect(sortSessionRows(dated, { col: 'project', dir: 'asc' }).map((s) => s.projectName)).toEqual(['apex', 'mid', 'zebra']);
    expect(sortSessionRows(dated, { col: 'project', dir: 'desc' }).map((s) => s.projectName)).toEqual(['zebra', 'mid', 'apex']);
  });

  it('sorts by started and last seen in both directions', () => {
    expect(sortSessionRows(dated, { col: 'started', dir: 'desc' }).map((s) => s.createdAt)).toEqual([300, 200, 100]);
    expect(sortSessionRows(dated, { col: 'started', dir: 'asc' }).map((s) => s.createdAt)).toEqual([100, 200, 300]);
    expect(sortSessionRows(dated, { col: 'lastSeen', dir: 'desc' }).map((s) => s.lastSeen)).toEqual([900, 800, 700]);
    expect(sortSessionRows(dated, { col: 'lastSeen', dir: 'asc' }).map((s) => s.lastSeen)).toEqual([700, 800, 900]);
  });

  // Sorted on the epoch, never on the drawn age. '2h' sorts before '10m' as a
  // string, and this row set is the one that would prove it wrong.
  it('sorts time on the number and not on the drawn age', () => {
    const now = 10_000_000;
    const twoHours = session({ sessionId: 'h', name: 'h', createdAt: now - 2 * 3_600_000 });
    const tenMinutes = session({ sessionId: 'm', name: 'm', createdAt: now - 10 * 60_000 });
    expect(sortSessionRows([twoHours, tenMinutes], { col: 'started', dir: 'desc' }).map((s) => s.name)).toEqual(['m', 'h']);
  });

  // A row with no manifest match must not be treated as the oldest thing in
  // the table, nor as the newest. It sorts below every row that has a value,
  // which is the `?? -1` convention this file already uses for Memory.
  it('puts a row with no manifest match below every row that has one', () => {
    const mixed = [session({ sessionId: 'x', name: 'x', createdAt: null }), ...dated];
    expect(sortSessionRows(mixed, { col: 'started', dir: 'desc' }).map((s) => s.name)).toEqual(['claude-1', 'claude-1', 'claude-1', 'x']);
    expect(sortSessionRows(mixed, { col: 'project', dir: 'asc' }).map((s) => s.projectName)).toEqual([null, 'apex', 'mid', 'zebra']);
  });

  it('starts project ascending and the two time columns descending', () => {
    expect(nextSort(null, 'project')).toEqual({ col: 'project', dir: 'asc' });
    expect(nextSort(null, 'started')).toEqual({ col: 'started', dir: 'desc' });
    expect(nextSort(null, 'lastSeen')).toEqual({ col: 'lastSeen', dir: 'desc' });
    expect(nextSort({ col: 'lastSeen', dir: 'desc' }, 'lastSeen')).toEqual({ col: 'lastSeen', dir: 'asc' });
  });
});
