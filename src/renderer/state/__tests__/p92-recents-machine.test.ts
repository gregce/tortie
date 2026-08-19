/**
 * A recent row that names a machine, on the renderer side (Phase 92).
 *
 * Two rules are pinned. A row's React key is the PAIR, so two machines holding
 * the same path are two rows rather than one. A row on another machine is never
 * marked missing, whatever the missing set happens to contain, because this Mac
 * has no standing to say whether a folder exists on another computer.
 *
 * The third rule is the split of the menu payload. It is at the FIRST colon,
 * which is exact for a machine id and wrong for nothing, and it is proven with
 * a folder whose own name holds a colon.
 *
 * Nothing here renders a component, touches a bridge or opens a window.
 */

import { describe, expect, it } from 'vitest';
import type { AddRemoteProjectResult, RecentProject } from '@shared/ipc';
import { homeRecentRows } from '../recents';
import {
  openRecentOnMachine,
  splitRecentOnMachine
} from '../../app/open-recent-on-machine';

const NOTHING_MISSING: ReadonlySet<string> = new Set<string>();

function row(
  path: string,
  machineId?: string,
  name = 'p'
): RecentProject {
  return machineId === undefined
    ? { path, name, lastOpenedAt: 1 }
    : { path, name, lastOpenedAt: 1, machineId };
}

describe('the rows the home screen draws', () => {
  it('gives two machines holding the same path two different keys', () => {
    const rows = homeRecentRows(
      [row('/Users/gdc/dev'), row('/Users/gdc/dev', 'mac-pro')],
      NOTHING_MISSING
    );
    expect(rows.map((r) => r.key)).toEqual([
      '/Users/gdc/dev',
      'mac-pro:/Users/gdc/dev'
    ]);
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });

  it('never marks a remote row missing, even when the set holds its path', () => {
    const missing = new Set(['/Users/gdc/dev']);
    const rows = homeRecentRows(
      [row('/Users/gdc/dev'), row('/Users/gdc/dev', 'mac-pro')],
      missing
    );
    expect(rows[0]).toMatchObject({ remote: false, missing: true });
    expect(rows[1]).toMatchObject({ remote: true, missing: false });
  });

  it('reads an omitted machine and the string `local` as this Mac', () => {
    const rows = homeRecentRows(
      [row('/a'), row('/b', 'local')],
      NOTHING_MISSING
    );
    expect(rows.map((r) => r.machineId)).toEqual(['local', 'local']);
    expect(rows.map((r) => r.remote)).toEqual([false, false]);
    expect(rows.map((r) => r.key)).toEqual(['/a', '/b']);
  });
});

describe('opening a recent row from the native menu', () => {
  function deps(result: AddRemoteProjectResult): {
    calls: [string, string][];
    toasts: [string, string][];
    canAddRemoteProject(): boolean;
    addRemoteProject(m: string, p: string): Promise<AddRemoteProjectResult>;
    toast(kind: 'info' | 'error', text: string): void;
    machineStates: { id: string; label: string }[];
  } {
    const calls: [string, string][] = [];
    const toasts: [string, string][] = [];
    return {
      calls,
      toasts,
      canAddRemoteProject: () => true,
      addRemoteProject: (m, p) => {
        calls.push([m, p]);
        return Promise.resolve(result);
      },
      toast: (kind, text) => toasts.push([kind, text]),
      machineStates: [{ id: 'mac-pro', label: 'Mac Pro' }]
    };
  }

  it('splits at the first colon, so a path may hold as many as it likes', () => {
    expect(splitRecentOnMachine('mac-pro:/srv/10:30 recording')).toEqual({
      machineId: 'mac-pro',
      path: '/srv/10:30 recording'
    });
    expect(splitRecentOnMachine('/no/machine')).toBeNull();
    expect(splitRecentOnMachine('mac-pro:')).toBeNull();
  });

  it('calls addRemoteProject with the two halves', async () => {
    const d = deps({
      ok: true,
      project: { id: 'x', path: '/srv/10:30 recording', name: 'rec' },
      alreadyOpen: false
    });
    await openRecentOnMachine('mac-pro:/srv/10:30 recording', d as never);
    expect(d.calls).toEqual([['mac-pro', '/srv/10:30 recording']]);
    expect(d.toasts).toEqual([]);
  });

  it('says why, in the words Tortie already writes, when the machine is asleep', async () => {
    const d = deps({ ok: false, reason: 'notConnected' });
    await openRecentOnMachine('mac-pro:/srv/there', d as never);
    expect(d.toasts).toEqual([
      ['error', 'Tortie is not connected to Mac Pro.']
    ]);
  });

  it('falls back to the id when the machine is not in the states list', async () => {
    const d = deps({ ok: false, reason: 'noSuchMachine' });
    await openRecentOnMachine('gone:/srv/there', d as never);
    expect(d.toasts).toEqual([
      ['error', 'Tortie has no machine with that name any more.']
    ]);
  });

  it('does nothing but say so when the build cannot open a remote folder', async () => {
    const d = deps({ ok: false, reason: 'notConnected' });
    d.canAddRemoteProject = () => false;
    await openRecentOnMachine('mac-pro:/srv/there', d as never);
    expect(d.calls).toEqual([]);
    expect(d.toasts).toEqual([
      ['info', 'This build cannot open a folder on a machine.']
    ]);
  });
});
