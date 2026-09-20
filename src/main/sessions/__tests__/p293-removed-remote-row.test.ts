/**
 * Phase 293, finding F1. A removed session on ANOTHER machine says which
 * machine it is on.
 *
 * WHAT WAS WRONG AT THE PARENT. `listRemovedSessions` mapped every tombstone
 * through `toSession`, and `toSession` never sets `Session.machine`. So a
 * removed session on a machine that is STILL registered carried neither
 * `machine` nor `machineGone`. `targetOfSession` reads exactly those two
 * fields, so it answered this Mac: the row grouped under this Mac, and a
 * restore from it would have asked to open a LOCAL folder with another
 * machine's path, which is the Phase 90.3 defect again. The old Past Sessions
 * modal drew one flat list and never grouped, so nothing showed it. The
 * session manager groups by folder AND machine, and is the first surface that
 * would.
 *
 * HOW IT IS DRIVEN. The shape of ./session-history-core.test.ts, for its
 * reason: `listRemovedSessions` reads only `this.manifest`, so the REAL method
 * comes off `GmuxCore.prototype` and runs against a REAL `ManifestStore` on
 * disk. The machine layer is real, feed maps and restore gate included, with
 * ONE seam: what the machines FILE holds in memory. Most cases leave it empty,
 * which is the honest floor, because the stamp must name the machine whether
 * or not anything is answering for it. One describe puts a single machine in
 * it, because that is the only case in which the machine layer has an opinion
 * about the status, and so the only case that can show the row keeping the
 * tombstone's (the shape ./p93-remove-project.test.ts uses for the same seam).
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineRowV1 } from '@shared/machines';
import { targetOfSession } from '@shared/workspace-target';
import { ManifestStore, type ManifestSessionRecord } from '../../manifest';
import { setRemoteManifest } from '../../machines/remote-record';
import { resetRemoteSessionsForTests } from '../../machines/remote-sessions';
import { GmuxCore } from '../core';

/** The machines file, as memory holds it. Empty unless a case fills it. */
const machinesInFile = vi.hoisted(() => new Map<string, MachineRowV1>());

vi.mock('../../machines/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../machines/store')>();
  return {
    ...actual,
    machineRow: (id: string): MachineRowV1 | null =>
      machinesInFile.get(id) ?? actual.machineRow(id)
  };
});

let dir: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tortie-p293-removed-'));
  store = new ManifestStore(join(dir, 'manifest.db'));
  // The restore gate the stamped row carries reads the record through this
  // handle, exactly as it does in the running app.
  setRemoteManifest(store);
});

afterEach(() => {
  machinesInFile.clear();
  // Asking the restore gate about a machine the file holds gives that machine a
  // feed state in module memory, and the next case must not inherit it.
  resetRemoteSessionsForTests();
  setRemoteManifest(null);
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function insert(over: Partial<ManifestSessionRecord> & { id: string }): void {
  store.insertSession({
    name: over.id,
    tmuxName: over.id,
    projectPath: '/w',
    cwd: '/w',
    agent: 'shell',
    status: 'exited',
    createdAt: 1_000,
    argv: ['/bin/zsh'],
    lastSeen: 1_000,
    ...over
  } as ManifestSessionRecord);
}

/** The real method, bound to a core that holds only the manifest. */
function removed(): ReturnType<GmuxCore['listRemovedSessions']> {
  return GmuxCore.prototype.listRemovedSessions.call({
    manifest: store
  } as unknown as GmuxCore);
}

describe('a removed session on a machine that is still registered', () => {
  it('carries the machine, so it groups and restores on THAT machine', () => {
    insert({ id: 'far-1', machineId: 'm1', projectPath: '/srv/api', cwd: '/srv/api' });
    store.markSessionRemoved('far-1', 5_000);

    const [session] = removed();

    // RED AT THE PARENT, where `machine` was undefined.
    expect(session?.machine?.id).toBe('m1');
    expect(session?.machineGone).toBeUndefined();
    // What the stamp is FOR: the one function every surface composes a target
    // with now answers the machine, not this Mac.
    expect(session === undefined ? null : targetOfSession(session)).toEqual({
      machineId: 'm1',
      path: '/srv/api'
    });
  });

  it('is drawn against the folder it is really in on that machine', () => {
    // The shape every row written before Phase 90.3 has: this Mac's project
    // folder in `projectPath`, and the machine's own answer in `cwd`.
    insert({
      id: 'far-old',
      machineId: 'm1',
      projectPath: '/Users/me/api',
      cwd: '/home/dev/api'
    });
    store.markSessionRemoved('far-old', 5_000);

    const [session] = removed();

    // RED AT THE PARENT, where this read `/Users/me/api`.
    expect(session?.projectPath).toBe('/home/dev/api');
    expect(session?.cwd).toBe('/home/dev/api');
  });

  it('stays a REMOVED row, and keeps when it was removed', () => {
    // With no machine in the file the machine layer hands back the recorded
    // status anyway, so this case alone cannot tell the two projections apart.
    // The describe below, with the machine in the file, is the one that does.
    insert({ id: 'far-2', machineId: 'm1', status: 'running' });
    store.markSessionRemoved('far-2', 6_000);

    const [session] = removed();

    expect(session?.status).toBe('discarded');
    expect(session?.removedAt).toBe(6_000);
  });

  it('carries the restore gate main’s own restore asks, as a verdict with its sentence', () => {
    insert({ id: 'far-3', machineId: 'm1' });
    store.markSessionRemoved('far-3', 6_000);

    const [session] = removed();

    // No machine is registered here, so the honest verdict is a refusal that
    // says why. What is pinned is that the row CARRIES a verdict at all, so the
    // button and the verb cannot disagree.
    expect(session?.machine?.canRestore).toBe(false);
    expect(session?.machine?.restoreReason).toBeTypeOf('string');
    expect(session?.machine?.restoreReason).not.toBe('');
  });

  it('keeps everything toSession projects, the closed tab included', () => {
    insert({
      id: 'far-4',
      machineId: 'm1',
      agentSessionId: 'conv-1',
      projectTombstone: {
        v: 1,
        projectId: 'proj-1',
        projectName: 'api',
        path: '/srv/api',
        machineId: 'm1',
        closedAt: 4_000
      }
    });
    store.markSessionRemoved('far-4', 6_000);

    const [session] = removed();

    expect(session?.agentSessionId).toBe('conv-1');
    expect(session?.closedProject?.name).toBe('api');
    expect(session?.machine?.id).toBe('m1');
  });
});

describe('a removed session on a machine the machines file holds', () => {
  // Nobody has signed in to it in this run, which is what every machine looks
  // like for the first moments after a launch. The feed then reads it as a
  // machine Tortie cannot see, and every MANAGED row on it reads `unknown`.
  beforeEach(() => {
    machinesInFile.set('studio', {
      id: 'studio',
      label: 'Studio',
      color: 'green',
      host: '192.0.2.7'
    });
  });

  it('keeps the tombstone’s status where the machine layer would give its own', () => {
    insert({ id: 'far-5', machineId: 'studio', status: 'running' });
    store.markSessionRemoved('far-5', 7_000);

    const [session] = removed();

    // RED UNDER `projectRemoteRecord`, which asks the machine layer for the
    // status and would draw this removed row as `unknown`, a MANAGED status:
    // the row would leave the Past tab it belongs on.
    expect(session?.status).toBe('discarded');
    expect(session?.removedAt).toBe(7_000);
  });

  it('carries the machine as the file names it, with the restore verdict main asks', () => {
    insert({ id: 'far-6', machineId: 'studio' });
    store.markSessionRemoved('far-6', 7_000);

    const [session] = removed();

    expect(session?.machine).toMatchObject({
      id: 'studio',
      label: 'Studio',
      color: 'green',
      canRestore: false
    });
    // Refused because nobody has signed in, and the sentence says so rather
    // than leaving a disabled button with no reason.
    expect(session?.machine?.restoreReason).toBeTypeOf('string');
    expect(session?.machine?.restoreReason).not.toBe('');
  });
});

describe('a removed session whose machine a person removed', () => {
  it('carries machineGone and NO machine, exactly as before', () => {
    insert({ id: 'orphan-1', machineId: 'm2', status: 'running' });
    store.markMachinesForgotten([
      {
        sessionId: 'orphan-1',
        tombstone: {
          v: 1,
          machineId: 'm2',
          machineLabel: 'studio',
          lastStatus: 'running',
          lastSeenAt: 3_000,
          forgottenAt: 8_000
        }
      }
    ]);

    const [session] = removed();

    expect(session?.id).toBe('orphan-1');
    expect(session?.machineGone?.label).toBe('studio');
    // A renderer that had the machine could look it up and find nothing. The
    // label is the answer to that question already (../../manifest/codecs.ts).
    expect(session?.machine).toBeUndefined();
    expect(session?.projectPath).toBe('/w');
  });
});

describe('a removed session on this Mac', () => {
  it.each([
    ['with the machine written out', { machineId: 'local' }],
    ['written before machines existed', {}]
  ])('%s carries neither field', (_label, over) => {
    insert({ id: 'near-1', ...over });
    store.markSessionRemoved('near-1', 5_000);

    const [session] = removed();

    expect(session?.id).toBe('near-1');
    expect(session?.machine).toBeUndefined();
    expect(session?.machineGone).toBeUndefined();
    expect(session === undefined ? null : targetOfSession(session)).toEqual({
      machineId: 'local',
      path: '/w'
    });
  });
});

describe('the order', () => {
  it('is still newest removal first, whatever machine each row is on', () => {
    insert({ id: 'a', createdAt: 1_000 });
    insert({ id: 'b', createdAt: 2_000, machineId: 'm1' });
    insert({ id: 'c', createdAt: 3_000 });
    insert({ id: 'd', createdAt: 4_000, machineId: 'm2' });
    insert({ id: 'kept', createdAt: 5_000, machineId: 'm1' });
    store.markSessionRemoved('b', 50_000);
    store.markSessionRemoved('a', 70_000);
    store.markSessionRemoved('c', 60_000);
    store.markMachinesForgotten([
      {
        sessionId: 'd',
        tombstone: {
          v: 1,
          machineId: 'm2',
          machineLabel: 'studio',
          lastStatus: 'exited',
          lastSeenAt: 0,
          forgottenAt: 65_000
        }
      }
    ]);

    expect(removed().map((s) => s.id)).toEqual(['a', 'd', 'c', 'b']);
  });

  it('a hand edited tombstone with no stamp still sorts last', () => {
    insert({ id: 'stamped', machineId: 'm1' });
    insert({ id: 'unstamped', machineId: 'm1' });
    store.markSessionRemoved('stamped', 9_000);
    store.updateSession('unstamped', { status: 'discarded' });

    expect(removed().map((s) => s.id)).toEqual(['stamped', 'unstamped']);
  });
});
