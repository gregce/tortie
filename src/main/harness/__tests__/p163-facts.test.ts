/**
 * Phase 163. The capture harness's arithmetic: every owned row lands in one
 * group, the two totals are never added, a warm launch creates only the
 * shortfall, and no command line survives past its first word's basename.
 */

import { describe, expect, it } from 'vitest';
import type { GmuxProcess, GmuxProcessRole } from '../../diagnostics/owned-processes';
import {
  groupOf,
  harnessSessionName,
  isHarnessSessionName,
  planCreates,
  summarizeOwned
} from '../p163-facts';

const row = (
  pid: number,
  role: GmuxProcessRole,
  rssBytes: number,
  sessionName?: string
): GmuxProcess => ({
  pid,
  ppid: 1,
  role,
  rssBytes,
  cpuPercent: 0,
  command: `/usr/bin/${role}`,
  ...(sessionName !== undefined ? { sessionName } : {})
});

const ROLES: GmuxProcessRole[] = [
  'app',
  'app-helper',
  'session-server',
  'attach-client',
  'control-client',
  'ssh-helper',
  'orphan-client',
  'session',
  'session-child',
  'probe',
  'orphan-probe'
];

describe('groupOf', () => {
  it('puts the app tree and its clients, helpers and probes under tortie', () => {
    expect(groupOf('app')).toBe('tortie');
    expect(groupOf('app-helper')).toBe('tortie');
    expect(groupOf('attach-client')).toBe('tortie');
    expect(groupOf('control-client')).toBe('tortie');
    expect(groupOf('ssh-helper')).toBe('tortie');
    expect(groupOf('probe')).toBe('tortie');
  });

  it('keeps the session server on its own line, never inside a session', () => {
    expect(groupOf('session-server')).toBe('sessionServer');
  });

  it('puts a pane process and everything under it in sessions', () => {
    expect(groupOf('session')).toBe('sessions');
    expect(groupOf('session-child')).toBe('sessions');
  });

  it('answers for every role the walk can produce', () => {
    for (const role of ROLES) expect(typeof groupOf(role)).toBe('string');
  });
});

describe('summarizeOwned', () => {
  it('counts every row exactly once across the four groups', () => {
    const rows = ROLES.map((role, i) => row(100 + i, role, 1000 * (i + 1)));
    const s = summarizeOwned(rows);
    const counted =
      s.tortie.processes +
      s.sessionServer.processes +
      s.sessions.processes +
      s.strays.processes;
    expect(counted).toBe(rows.length);
    expect(s.total).toBe(rows.length);
    const bytes =
      s.tortie.rssBytes + s.sessionServer.rssBytes + s.sessions.rssBytes + s.strays.rssBytes;
    expect(bytes).toBe(rows.reduce((a, r) => a + r.rssBytes, 0));
  });

  it('keeps session memory out of the tortie total and the other way round', () => {
    const rows = [
      row(1, 'app', 200),
      row(2, 'app-helper', 300),
      row(3, 'session', 5000, 'a'),
      row(4, 'session-child', 7000, 'a'),
      row(5, 'session', 11000, 'b')
    ];
    const s = summarizeOwned(rows);
    expect(s.tortie).toEqual({ processes: 2, rssBytes: 500 });
    expect(s.sessions.processes).toBe(3);
    expect(s.sessions.rssBytes).toBe(23000);
    expect(s.sessions.panes).toBe(2);
    expect(s.sessions.named).toBe(2);
    expect(s.sessionServer).toEqual({ processes: 0, rssBytes: 0 });
  });

  it('is empty totals over no rows', () => {
    const s = summarizeOwned([]);
    expect(s.total).toBe(0);
    expect(s.sessions.panes).toBe(0);
    expect(s.sessions.named).toBe(0);
  });

  it("folds Tortie's own control session pane into tortie, not sessions", () => {
    const rows = [
      row(1, 'app', 100),
      row(2, 'session', 3000, 'gmux-control'),
      row(3, 'session-child', 400, 'gmux-control'),
      row(4, 'session', 5000, 'p163-01')
    ];
    const s = summarizeOwned(rows, { controlSession: 'gmux-control' });
    expect(s.tortie).toEqual({ processes: 3, rssBytes: 3500 });
    expect(s.sessions.processes).toBe(1);
    expect(s.sessions.panes).toBe(1);
    expect(s.sessions.named).toBe(1);
    expect(s.total).toBe(4);
  });

  it('treats the control pane as a session when no control name is given', () => {
    const s = summarizeOwned([row(2, 'session', 3000, 'gmux-control')]);
    expect(s.sessions.panes).toBe(1);
    expect(s.tortie.processes).toBe(0);
  });

  it('does not count an empty session name as a named session', () => {
    const s = summarizeOwned([row(1, 'session', 1, '')]);
    expect(s.sessions.panes).toBe(1);
    expect(s.sessions.named).toBe(0);
  });
});

describe('planCreates', () => {
  it('creates everything on a cold launch', () => {
    expect(planCreates(25, 0)).toBe(25);
    expect(planCreates(0, 0)).toBe(0);
  });

  it('creates only the shortfall on a warm launch', () => {
    expect(planCreates(25, 25)).toBe(0);
    expect(planCreates(25, 20)).toBe(5);
  });

  it('never goes negative when more are alive than wanted', () => {
    expect(planCreates(0, 3)).toBe(0);
    expect(planCreates(2, 9)).toBe(0);
  });

  it('treats a nonsense want as nothing and a nonsense alive count as none alive', () => {
    expect(planCreates(-1, 0)).toBe(0);
    expect(planCreates(Number.NaN, 0)).toBe(0);
    expect(planCreates(3, Number.NaN)).toBe(3);
  });
});

describe('the harness session names', () => {
  it('zero pad so they sort, and round trip through the matcher', () => {
    expect(harnessSessionName(1)).toBe('p163-01');
    expect(harnessSessionName(25)).toBe('p163-25');
    expect(harnessSessionName(100)).toBe('p163-100');
    for (const i of [1, 9, 25, 100]) {
      expect(isHarnessSessionName(harnessSessionName(i))).toBe(true);
    }
  });

  it('do not match a person\'s session that merely starts with the prefix', () => {
    expect(isHarnessSessionName('p163-notes')).toBe(false);
    expect(isHarnessSessionName('p163')).toBe(false);
    expect(isHarnessSessionName('smoke-keeper')).toBe(false);
  });
});
