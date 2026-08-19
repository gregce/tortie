/**
 * The re-home: putting a session that runs on another machine in the right tab
 * (Phase 90.3).
 *
 * ## What it proves
 *
 *  1. The pure rule, over every shape a pair of paths can take.
 *  2. A row an earlier build wrote with THIS MAC's project folder is corrected
 *     to the folder that machine reported, against a real manifest.
 *  3. The folder over there becomes a project tab.
 *  4. A row that already agrees is not written again, which is what keeps this
 *     to one write per row for the life of the row rather than one per poll.
 *  5. A session in a subfolder of its project keeps its project, so an ordinary
 *     working directory is not mistaken for a row that needs correcting.
 *  6. A folder that does not exist on that machine still gets its tab, which is
 *     the deliberate departure from research 56 section 4.4.
 *  7. Ten sessions in one folder are one project row.
 *  8. Nothing at all happens when no manifest store is installed.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.47.0' }
}));

const { ManifestStore } = await import('../../manifest/store');
const { setRemoteManifest } = await import('../../machines/remote-record');
const { rehomeRemoteSessions, remoteProjectPathFor } = await import(
  '../../machines/remote-rehome'
);

let root = '';
let store: InstanceType<typeof ManifestStore> | null = null;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p903-rehome-'));
  userData = root;
  store = new ManifestStore(join(root, 'manifest.db'));
  setRemoteManifest(store);
});

afterEach(() => {
  setRemoteManifest(null);
  store?.close();
  store = null;
  rmSync(root, { recursive: true, force: true });
});

/** One session as the machines feed projects it. */
function onMachine(input: {
  id: string;
  projectPath: string;
  cwd: string;
  machineId?: string;
}): Session {
  return {
    id: input.id,
    name: input.id,
    tmuxName: input.id,
    projectPath: input.projectPath,
    cwd: input.cwd,
    agent: 'shell',
    status: 'running',
    createdAt: 1_700_000_000_000,
    machine: {
      id: input.machineId ?? 'macpro',
      label: 'Mac Pro',
      color: 'blue',
      answering: true,
      canRestore: false,
      restoreReason: null
    }
  };
}

/** One manifest row for a session on a machine, written the way a create does. */
function writeRow(id: string, projectPath: string, cwd: string): void {
  store?.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath,
    cwd,
    agent: 'shell',
    status: 'running',
    createdAt: 1_700_000_000_000,
    argv: ['/bin/zsh'],
    lastSeen: 1_700_000_000_000,
    machineId: 'macpro'
  });
}

describe('the rule that decides the folder', () => {
  it('keeps a recorded folder that contains the reported one', () => {
    expect(remoteProjectPathFor('/w/repo', '/w/repo')).toBe('/w/repo');
    expect(remoteProjectPathFor('/w/repo', '/w/repo/src')).toBe('/w/repo');
    expect(remoteProjectPathFor('/w/repo', '/w/repo/src/deep')).toBe('/w/repo');
  });

  it('takes the reported folder when the two disagree', () => {
    expect(remoteProjectPathFor('/Users/gdc/gmux', '/home/gdc/work')).toBe(
      '/home/gdc/work'
    );
    // A prefix that is not a path boundary is not containment.
    expect(remoteProjectPathFor('/w/repo', '/w/repo-two')).toBe('/w/repo-two');
  });

  it('changes nothing when the machine reported no path', () => {
    expect(remoteProjectPathFor('/w/repo', '')).toBe('/w/repo');
    expect(remoteProjectPathFor('', '')).toBe('');
    expect(remoteProjectPathFor('/w/repo', 'relative')).toBe('/w/repo');
  });
});

describe('one pass over what a machine reported', () => {
  it("corrects a row that carries this Mac's folder", () => {
    writeRow('s1', '/Users/gdc/gmux', '/home/gdc/gmux');
    const result = rehomeRemoteSessions([
      onMachine({ id: 's1', projectPath: '/Users/gdc/gmux', cwd: '/home/gdc/gmux' })
    ]);
    expect(result.rowsMoved).toBe(1);
    expect(result.projectsAdded).toBe(1);
    expect(store?.getSession('s1')?.projectPath).toBe('/home/gdc/gmux');
    expect(store?.getRemoteProject('macpro', '/home/gdc/gmux')).toMatchObject({
      path: '/home/gdc/gmux',
      name: 'gmux',
      machineId: 'macpro'
    });
  });

  it('writes once and not once per pass', () => {
    writeRow('s1', '/Users/gdc/gmux', '/home/gdc/gmux');
    const sessions = [
      onMachine({ id: 's1', projectPath: '/Users/gdc/gmux', cwd: '/home/gdc/gmux' })
    ];
    expect(rehomeRemoteSessions(sessions).rowsMoved).toBe(1);
    // The feed still reports the old stamp, because the option on that machine
    // is not rewritten. The row now agrees with the reported folder, so nothing
    // more is written.
    expect(rehomeRemoteSessions(sessions).rowsMoved).toBe(0);
    expect(rehomeRemoteSessions(sessions).projectsAdded).toBe(0);
  });

  it('leaves a session that is in a subfolder of its project alone', () => {
    writeRow('s2', '/home/gdc/repo', '/home/gdc/repo/src');
    const result = rehomeRemoteSessions([
      onMachine({
        id: 's2',
        projectPath: '/home/gdc/repo',
        cwd: '/home/gdc/repo/src'
      })
    ]);
    expect(result.rowsMoved).toBe(0);
    expect(store?.getSession('s2')?.projectPath).toBe('/home/gdc/repo');
    expect(store?.getRemoteProject('macpro', '/home/gdc/repo')).toBeDefined();
    expect(store?.getRemoteProject('macpro', '/home/gdc/repo/src')).toBeUndefined();
  });

  it('opens a tab for a folder even when nothing is known about it', () => {
    // The departure from research 56 section 4.4. The tab is created at the
    // reported folder rather than at that machine's home directory, and the
    // Explorer is what says the folder is not there.
    writeRow('s3', '/Users/gdc/gone', '/home/gdc/gone');
    rehomeRemoteSessions([
      onMachine({ id: 's3', projectPath: '/Users/gdc/gone', cwd: '/home/gdc/gone' })
    ]);
    expect(store?.getRemoteProject('macpro', '/home/gdc/gone')).toBeDefined();
    expect(store?.listRemoteProjects()).toHaveLength(1);
  });

  it('makes one project row for ten sessions in one folder', () => {
    const sessions: Session[] = [];
    for (let n = 0; n < 10; n++) {
      writeRow(`m${String(n)}`, '/Users/gdc/gmux', '/home/gdc/gmux');
      sessions.push(
        onMachine({
          id: `m${String(n)}`,
          projectPath: '/Users/gdc/gmux',
          cwd: '/home/gdc/gmux'
        })
      );
    }
    const result = rehomeRemoteSessions(sessions);
    expect(result.rowsMoved).toBe(10);
    expect(result.projectsAdded).toBe(1);
  });

  it('opens a tab for a session that has no manifest row at all', () => {
    // Every remote session an 0.34 or 0.35 build created. There is nothing to
    // correct and the folder still gets its tab, so the session appears.
    const result = rehomeRemoteSessions([
      onMachine({ id: 'feed-only', projectPath: '', cwd: '/home/gdc/old' })
    ]);
    expect(result.rowsMoved).toBe(0);
    expect(result.projectsAdded).toBe(1);
  });

  it('ignores every session on this Mac', () => {
    const local: Session = {
      id: 'here',
      name: 'here',
      tmuxName: 'here',
      projectPath: '/Users/gdc/gmux',
      cwd: '/Users/gdc/gmux/src',
      agent: 'shell',
      status: 'running',
      createdAt: 1
    };
    const result = rehomeRemoteSessions([local]);
    expect(result).toEqual({ rowsMoved: 0, projectsAdded: 0 });
    expect(store?.listRemoteProjects()).toEqual([]);
  });

  it('does nothing at all when no store is installed', () => {
    setRemoteManifest(null);
    expect(
      rehomeRemoteSessions([
        onMachine({ id: 's1', projectPath: '/a', cwd: '/b' })
      ])
    ).toEqual({ rowsMoved: 0, projectsAdded: 0 });
  });
});
