/**
 * The pure helpers behind the diagnostics report surface (Phase 163).
 *
 * Words, orders and indentation, pinned without an Electron. The one claim
 * that matters most here is the table order and the parent indentation,
 * because a table that re-sorts between two captures reads as churn, which
 * is the thing the dashboard refusal exists to keep off this surface.
 */

import { describe, expect, it } from 'vitest';
import type { DiagnosticsShellProcess } from '@shared/ipc';
import {
  bytesLabel,
  capturedAtLabel,
  cpuLabel,
  kindLabel,
  MILESTONE_ORDER,
  milestoneKey,
  milestoneLabel,
  msLabel,
  shellRows
} from '../format';
import { NOT_READ } from '../copy';

function proc(over: Partial<DiagnosticsShellProcess>): DiagnosticsShellProcess {
  return {
    pid: 1,
    ppid: 0,
    kind: 'helper',
    name: 'x',
    memory: { privateBytes: 0, privateSource: 'footprint', rssBytes: 0 },
    cpuPercent: 0,
    cpuSource: 'lifetime',
    electron: false,
    ...over
  };
}

describe('labels', () => {
  it('says not read for a private number nobody could read', () => {
    expect(bytesLabel(null)).toBe(NOT_READ);
    expect(bytesLabel(241 * 1024 * 1024)).toBe('241 MB');
  });

  it('shows milliseconds under a second and seconds above', () => {
    expect(msLabel(312)).toBe('312 ms');
    expect(msLabel(1440)).toBe('1.4 s');
    expect(msLabel(-1)).toBe(NOT_READ);
  });

  it('shows one decimal under ten percent and none above', () => {
    expect(cpuLabel(0)).toBe('0%');
    expect(cpuLabel(3.24)).toBe('3.2%');
    expect(cpuLabel(42.6)).toBe('43%');
  });

  it('prints the capture time as a clock reading', () => {
    const iso = new Date(2026, 7, 29, 14, 2, 11).toISOString();
    expect(capturedAtLabel(iso)).toBe('14:02:11');
    expect(capturedAtLabel('garbage')).toBe('garbage');
  });
});

describe('milestones', () => {
  it('names every mark main records, in launch order, with no tmux vocabulary', () => {
    expect(MILESTONE_ORDER).toEqual([
      'app-ready',
      'window-shown',
      'sessions-reconciled',
      'sessions-listed',
      'path-ready',
      'first-attach',
      'first-bytes'
    ]);
    for (const name of MILESTONE_ORDER) {
      const label = milestoneLabel(name);
      expect(label).not.toBe(name);
      expect(label.toLowerCase()).not.toMatch(/attach|pane|tmux|prefix/);
    }
  });

  it('shows an unknown mark as it was recorded rather than hiding it', () => {
    expect(milestoneLabel('new-mark')).toBe('new-mark');
  });

  it('reads a mark with or without the tortie: prefix as one milestone', () => {
    expect(milestoneKey('tortie:app-ready')).toBe('app-ready');
    expect(milestoneLabel('tortie:app-ready')).toBe(milestoneLabel('app-ready'));
  });
});

describe('the Tortie table', () => {
  it('names every kind without tmux vocabulary', () => {
    const kinds = [
      'main', 'renderer', 'gpu', 'utility', 'electron-other', 'session-server',
      'control-client', 'attach-client', 'ssh-helper', 'probe', 'helper', 'orphan'
    ] as const;
    for (const k of kinds) {
      expect(kindLabel(k).toLowerCase()).not.toMatch(/attach|pane|tmux|prefix/);
    }
  });

  it('sorts main first, then by kind, then by pid, and indents a child of a row', () => {
    const rows = shellRows([
      proc({ pid: 900, kind: 'helper', ppid: 100 }),
      proc({ pid: 300, kind: 'gpu', ppid: 100 }),
      proc({ pid: 100, kind: 'main', ppid: 1 }),
      proc({ pid: 200, kind: 'renderer', ppid: 100 }),
      proc({ pid: 5000, kind: 'session-server', ppid: 1 }),
      proc({ pid: 250, kind: 'renderer', ppid: 100 })
    ]);
    expect(rows.map((r) => r.process.pid)).toEqual([100, 200, 250, 300, 5000, 900]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 1, 1, 0, 1]);
  });

  it('draws the same order for the same processes handed in any order', () => {
    const a = [proc({ pid: 3, kind: 'probe' }), proc({ pid: 1, kind: 'main' }), proc({ pid: 2, kind: 'gpu' })];
    const b = [...a].reverse();
    expect(shellRows(a).map((r) => r.process.pid)).toEqual(shellRows(b).map((r) => r.process.pid));
  });
});
