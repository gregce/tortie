/**
 * The reader the re-home asks before it opens a tab again (Phase 306, issue 35).
 *
 * ## What it proves
 *
 * `projectTabClosedFor` answers ONE question: did a person close the tab of
 * this folder on this machine, while a session they still have was in it? The
 * re-home in `../../machines/remote-rehome.ts` asks it on every completed
 * machine pass, so a gate one clause too wide stops Phase 90.3 from ever
 * opening a tab for a folder on a machine (research 54 finding 15), and a gate
 * one clause too narrow lets the tab come back by itself, which is the defect.
 *
 * The reader is the CONJUNCTION of two things, and each test below owns one
 * clause of it (build/p306/SPEC.md §4 M1, §7.1):
 *
 *  - the writers' WHERE clause on the row's own `project_path` and machine,
 *    the same spelling `markProjectTabClosed` and `clearProjectTabClosed` use,
 *    with `IS NOT NULL` and `status <> 'discarded'`;
 *  - the stamp's own `path` and `machineId`, decoded through the one codec,
 *    `parseClosedProjectTab`.
 *
 * Each title is a key `build/p306/ablation.mjs` looks up, so a title is
 * renamed here and there in the same commit or the ablation reads it as an
 * owner that stayed green.
 *
 * Every stamp below is written through `markProjectTabClosed`, the one writer
 * of the column. The mismatched stamps of R2a and R2b are written by handing
 * it a target and a tab that disagree, which no caller in the product does;
 * they stand for a row a hand edit or a future caller could leave behind.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClosedProjectTab } from '../codecs';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.110.0' }
}));

const { ManifestStore } = await import('../store');

let root = '';
let store: InstanceType<typeof ManifestStore> | null = null;

/** The live store, which every test below has. */
function db(): InstanceType<typeof ManifestStore> {
  if (store === null) throw new Error('no store');
  return store;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p306-reader-'));
  userData = root;
  store = new ManifestStore(join(root, 'manifest.db'));
});

afterEach(() => {
  store?.close();
  store = null;
  rmSync(root, { recursive: true, force: true });
});

const F = '/home/gdc/work/alpha';
const G = '/home/gdc/work/beta';

/** One session row, written the way a create writes it. Undefined machine is this Mac. */
function row(id: string, projectPath: string, machineId?: string): void {
  db().insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath,
    cwd: projectPath,
    agent: 'shell',
    status: 'running',
    createdAt: 1_700_000_000_000,
    argv: ['/bin/zsh'],
    lastSeen: 1_700_000_000_000,
    ...(machineId === undefined ? {} : { machineId })
  });
}

/** The record a close writes. Undefined machine is this Mac, as the codec reads it. */
function tab(path: string, machineId?: string): ClosedProjectTab {
  return {
    v: 1,
    projectId: `project-${path}`,
    projectName: path.slice(path.lastIndexOf('/') + 1),
    path,
    closedAt: 1_700_000_100_000,
    ...(machineId === undefined ? {} : { machineId })
  };
}

/** Close the tab of `path` on `machineId`, as `removeProject` does. */
function close(path: string, machineId?: string): number {
  const target = machineId === undefined ? { path } : { path, machineId };
  return db().markProjectTabClosed(target, tab(path, machineId));
}

/** The question the re-home asks. */
function held(path: string, machineId?: string): boolean {
  return db().projectTabClosedFor(
    machineId === undefined ? { path } : { path, machineId }
  );
}

describe('projectTabClosedFor, clause by clause', () => {
  it('R1 a close answers for its own folder on its own machine', () => {
    row('s1', F, 'm1');
    expect(close(F, 'm1')).toBe(1);
    expect(held(F, 'm1')).toBe(true);
  });

  it('R2a a stamp naming a machine on a row recorded on this Mac answers for neither', () => {
    row('s1', F);
    // The target names this Mac and the record names m1: a stamp whose
    // machine disagrees with its own row.
    expect(db().markProjectTabClosed({ path: F }, tab(F, 'm1'))).toBe(1);
    expect(db().getSession('s1')?.projectTombstone?.machineId).toBe('m1');
    expect(held(F, 'm1')).toBe(false);
    expect(held(F)).toBe(false);
  });

  it('R2b a stamp naming this Mac on a row recorded on a machine answers for neither', () => {
    row('s1', F, 'm1');
    // The target names m1 and the record names no machine, which the codec
    // reads as this Mac.
    expect(db().markProjectTabClosed({ path: F, machineId: 'm1' }, tab(F))).toBe(1);
    expect(db().getSession('s1')?.projectTombstone?.machineId).toBeUndefined();
    expect(held(F, 'm1')).toBe(false);
    expect(held(F)).toBe(false);
  });

  it('R2c the same path on two machines and on this Mac are three folders', () => {
    row('on-m1', F, 'm1');
    row('on-m2', F, 'm2');
    row('here', F);
    expect(close(F, 'm1')).toBe(1);
    expect(held(F, 'm1')).toBe(true);
    expect(held(F, 'm2')).toBe(false);
    expect(held(F)).toBe(false);
  });

  it('R3 a row moved out of a folder holds neither folder', () => {
    row('s1', F, 'm1');
    expect(close(F, 'm1')).toBe(1);
    // The re-home's MOVE. The stamp is not a column the patch names, so it
    // stays on the row and still names F.
    db().updateSession('s1', { projectPath: G });
    expect(db().getSession('s1')?.projectTombstone?.path).toBe(F);
    // The stamp-only form would answer true here, and hold a folder the row
    // has left.
    expect(held(F, 'm1')).toBe(false);
    expect(held(G, 'm1')).toBe(false);
  });

  it("R4 a row moved into a folder carrying another folder's stamp does not hold it", () => {
    row('s1', G, 'm1');
    expect(close(G, 'm1')).toBe(1);
    db().updateSession('s1', { projectPath: F });
    expect(db().getSession('s1')?.projectTombstone?.path).toBe(G);
    expect(held(F, 'm1')).toBe(false);
  });

  it("R5 a removed session's stamp holds nothing", () => {
    row('s1', F, 'm1');
    expect(close(F, 'm1')).toBe(1);
    expect(held(F, 'm1')).toBe(true);
    db().markSessionRemoved('s1');
    expect(db().getSession('s1')?.status).toBe('discarded');
    // The stamp is still on the row, and a removed session is in no folder.
    expect(db().getSession('s1')?.projectTombstone?.path).toBe(F);
    expect(held(F, 'm1')).toBe(false);
  });

  it("R6 an ended session's stamp still holds", () => {
    row('s1', F, 'm1');
    expect(close(F, 'm1')).toBe(1);
    db().setStatus('s1', 'exited');
    expect(db().getSession('s1')?.status).toBe('exited');
    // An ended session is still in the folder whose tab was closed, and the
    // sheet still lists it there. Pinned, so a round that changes it says so.
    expect(held(F, 'm1')).toBe(true);
  });

  it('R7 a stamp the codec drops whole holds nothing', () => {
    row('s1', F, 'm1');
    // An empty project id is a record `parseClosedProjectTab` drops WHOLE.
    expect(
      db().markProjectTabClosed(
        { path: F, machineId: 'm1' },
        { ...tab(F, 'm1'), projectId: '' }
      )
    ).toBe(1);
    expect(db().getSession('s1')?.projectTombstone).toBeUndefined();
    expect(held(F, 'm1')).toBe(false);
  });

  it('R8 clearing a folder clears what the reader reads', () => {
    row('stays', F, 'm1');
    row('moves', F, 'm1');
    expect(close(F, 'm1')).toBe(2);
    // One row leaves F carrying F's stamp. The clear matches on the row's own
    // folder, so it cannot reach it.
    db().updateSession('moves', { projectPath: G });
    expect(held(F, 'm1')).toBe(true);
    expect(db().clearProjectTabClosed({ path: F, machineId: 'm1' })).toBe(1);
    expect(db().getSession('moves')?.projectTombstone?.path).toBe(F);
    expect(held(F, 'm1')).toBe(false);
    expect(held(G, 'm1')).toBe(false);
  });

  it('R9 the reader writes nothing', () => {
    row('s1', F, 'm1');
    row('s2', G, 'm1');
    row('s3', F);
    expect(close(F, 'm1')).toBe(1);
    db().updateSession('s2', { projectPath: F });
    const before = JSON.stringify(db().listSessions());
    const projectsBefore = JSON.stringify(db().listRemoteProjects());
    for (let n = 0; n < 100; n += 1) {
      held(F, 'm1');
      held(G, 'm1');
      held(F);
      held(F, 'm2');
    }
    expect(JSON.stringify(db().listSessions())).toBe(before);
    expect(JSON.stringify(db().listRemoteProjects())).toBe(projectsBefore);
  });
});
