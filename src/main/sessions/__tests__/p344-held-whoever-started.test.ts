/**
 * A remote project tab a person closed stays closed, whoever started the
 * sessions in it (Phase 344, build/p344/SPEC.md §7.2).
 *
 * ## The defect
 *
 * Phase 306 kept a closed remote tab closed by the stamp on the folder's
 * recorded sessions. A folder none of whose sessions has a row on this Mac,
 * being one a Tortie on that machine or on another Mac started, carried no
 * stamp, so the re-home opened it again on the next pass (Phase 306's stated
 * limit, and the operator's report of 9 October 2026). A folder whose one
 * recorded session was removed came back the same way. The close is now
 * recorded for the folder itself.
 *
 * ## What it proves, against a real manifest and the shipping re-home
 *
 *  B1  A folder whose only session this Mac holds no row for stays closed.
 *  B2  A mixed folder stays closed after this Mac's own session is removed.
 *  B3  A closed folder holds itself and no folder under it: a subfolder with
 *      its own project opens its own tab.
 *  B4  A create in a folder held only by its record opens it and clears it.
 *  B5  A create that threw does the same.
 *  B6  A folder that never had a tab still opens (Phase 90.3), and this Mac's
 *      closed folder of the same path holds nothing on a machine.
 *  B7  A machine removed and added again under the same id keeps it closed.
 *  P1-P3  `withClosedFolderRecords`, the pure rule `listSessions` uses to carry
 *      the record on the sessions it lists.
 *
 * Each title is a key `build/p344/ablation.mjs` looks up, so a title is renamed
 * here and there in the same commit or the ablation reads it as an owner that
 * stayed green.
 *
 * Nothing here ends a session, and nothing is sent to any machine.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.111.0' }
}));

const { ManifestStore } = await import('../../manifest/store');
const { setRemoteManifest } = await import('../../machines/remote-record');
const {
  openTabsForRemoteCreate,
  rehomeRemoteSessions,
  releaseFoldersAfterFailedRemoteCreate,
  withClosedFolderRecords
} = await import('../../machines/remote-rehome');

type Store = InstanceType<typeof ManifestStore>;

let roots: string[] = [];
let stores: Store[] = [];
let store: Store | null = null;

/** A fresh manifest in a directory of its own, installed for the re-home. */
function freshStore(): Store {
  const root = mkdtempSync(join(tmpdir(), 'gmux-p344-held-'));
  roots.push(root);
  userData = root;
  const made = new ManifestStore(join(root, 'manifest.db'));
  stores.push(made);
  setRemoteManifest(made);
  return made;
}

function db(): Store {
  if (store === null) throw new Error('no store');
  return store;
}

beforeEach(() => {
  store = freshStore();
});

afterEach(() => {
  setRemoteManifest(null);
  for (const one of stores) one.close();
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  stores = [];
  roots = [];
  store = null;
});

const F = '/home/gdc/work/alpha';
const MACHINE = 'macpro';
const CLOSED_AT = 1_700_000_100_000;

/** One session as the machines feed projects it. */
function onMachine(input: {
  id: string;
  projectPath: string;
  cwd: string;
  machine?: string;
  closedProject?: Session['closedProject'];
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
      id: input.machine ?? MACHINE,
      label: 'Mac Pro',
      color: 'blue',
      answering: true,
      canRestore: false,
      restoreReason: null
    },
    ...(input.closedProject === undefined ? {} : { closedProject: input.closedProject })
  };
}

/** One session on this Mac, as `toSession` projects it. */
function onThisMac(id: string, projectPath: string): Session {
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath,
    cwd: projectPath,
    agent: 'shell',
    status: 'running',
    createdAt: 1_700_000_000_000
  };
}

/** One manifest row, written the way a create writes it. A null machine is this Mac. */
function writeRow(id: string, projectPath: string, machine: string | null = MACHINE): void {
  const machineId = machine ?? undefined;
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

/**
 * Close the tab of `path`, as `removeProject` does: the stamp on every
 * recorded session in the folder and, for a folder on a machine, the folder's
 * own record, in one durable write; then the row deleted. A null machine is
 * this Mac. Answers how many session rows were stamped.
 */
function closeTab(path: string, machine: string | null = MACHINE): number {
  const machineId = machine ?? undefined;
  const stamped = db().markProjectTabClosed(
    machineId === undefined ? { path } : { path, machineId },
    {
      v: 1,
      projectId: `project-${path}`,
      projectName: path.slice(path.lastIndexOf('/') + 1),
      path,
      closedAt: CLOSED_AT,
      ...(machineId === undefined ? {} : { machineId })
    }
  );
  if (machineId === undefined) {
    const row = db().getProjectByPath(path);
    if (row !== undefined) db().deleteProject(row.id);
  } else {
    const row = db().getRemoteProject(machineId, path);
    if (row !== undefined) db().deleteProject(row.id);
  }
  return stamped;
}

/** A tab a person opened by hand for a folder on the machine, then closed. */
function openThenClose(path: string): number {
  db().upsertRemoteProject({ machineId: MACHINE, path, name: path.slice(path.lastIndexOf('/') + 1) });
  return closeTab(path);
}

describe('a closed folder on a machine stays closed whoever started its sessions', () => {
  it('B1 a folder whose only session this Mac holds no row for stays closed, pass after pass', () => {
    expect(openThenClose(F)).toBe(0);
    expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
    const feed = [onMachine({ id: 'started-elsewhere', projectPath: F, cwd: F })];
    for (let pass = 0; pass < 3; pass += 1) {
      const result = rehomeRemoteSessions(feed);
      expect(result.projectsAdded).toBe(0);
      expect(result.tabsHeldClosed).toBe(1);
      expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
    }
    // A feed row is not written into the manifest by holding its folder.
    expect(db().getSession('started-elsewhere')).toBeUndefined();
  });

  it("B2 a mixed folder stays closed after this Mac's own session in it is removed", () => {
    writeRow('mine', F);
    expect(openThenClose(F)).toBe(1);
    const both = [
      onMachine({ id: 'mine', projectPath: F, cwd: F }),
      onMachine({ id: 'theirs', projectPath: F, cwd: F })
    ];
    const first = rehomeRemoteSessions(both);
    expect(first.projectsAdded).toBe(0);
    expect(first.tabsHeldClosed).toBe(1);
    // The one session this Mac recorded is Removed. Its stamp now sits on a
    // discarded row, which holds nothing; the folder's own record still does.
    db().markSessionRemoved('mine');
    expect(db().getSession('mine')?.status).toBe('discarded');
    const theirs = [onMachine({ id: 'theirs', projectPath: F, cwd: F })];
    for (let pass = 0; pass < 2; pass += 1) {
      const result = rehomeRemoteSessions(theirs);
      expect(result.projectsAdded).toBe(0);
      expect(result.tabsHeldClosed).toBe(1);
      expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
    }
  });

  it('B3 a subfolder with its own project opens its own tab, and a session under the closed folder is held with it', () => {
    const SUB = `${F}/sub`;
    const OTHER = `${F}/other`;
    writeRow('mine', F);
    expect(openThenClose(F)).toBe(1);
    const result = rehomeRemoteSessions([
      // Its project is F, so it is grouped under F and held with it, wherever
      // its working directory is.
      onMachine({ id: 'mine', projectPath: F, cwd: SUB }),
      // Its own project is the subfolder: a tab he never closed.
      onMachine({ id: 'in-sub', projectPath: SUB, cwd: SUB }),
      // No project at all, placed in another subfolder by its directory.
      onMachine({ id: 'in-other', projectPath: '', cwd: OTHER })
    ]);
    expect(result.tabsHeldClosed).toBe(1);
    expect(result.projectsAdded).toBe(2);
    expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
    expect(
      db()
        .listRemoteProjects()
        .map((p) => p.path)
        .sort()
    ).toEqual([OTHER, SUB]);
  });

  it('B4 a create in a folder held only by its record opens it and clears the record', () => {
    expect(openThenClose(F)).toBe(0);
    expect(db().closedRemoteFolder(MACHINE, F)).toBeDefined();
    expect(openTabsForRemoteCreate(db(), MACHINE, F, { projectPath: F, cwd: F })).toEqual([F]);
    expect(db().getRemoteProject(MACHINE, F)).toBeDefined();
    expect(db().closedRemoteFolder(MACHINE, F)).toBeUndefined();
    expect(db().projectTabClosedFor({ path: F, machineId: MACHINE })).toBe(false);
  });

  it('B5 a create that threw opens a folder held only by its record and clears it', () => {
    expect(openThenClose(F)).toBe(0);
    expect(releaseFoldersAfterFailedRemoteCreate(db(), MACHINE, F, F)).toEqual([F]);
    expect(db().getRemoteProject(MACHINE, F)).toBeDefined();
    expect(db().closedRemoteFolder(MACHINE, F)).toBeUndefined();
    expect(db().projectTabClosedFor({ path: F, machineId: MACHINE })).toBe(false);
    // The next pass finds the folder open and holds nothing.
    const result = rehomeRemoteSessions([onMachine({ id: 'lost-answer', projectPath: F, cwd: F })]);
    expect(result.projectsAdded).toBe(0);
    expect(result.tabsHeldClosed).toBe(0);
  });

  it("B6 a folder that never had a tab still opens, and this Mac's closed folder of the same path holds nothing there", () => {
    // Phase 90.3: the first pass that lists a session in a folder opens it.
    const NEVER = '/home/gdc/work/never';
    const first = rehomeRemoteSessions([onMachine({ id: 'n1', projectPath: NEVER, cwd: NEVER })]);
    expect(first.projectsAdded).toBe(1);
    expect(first.tabsHeldClosed).toBe(0);
    expect(db().getRemoteProject(MACHINE, NEVER)).toBeDefined();
    // A tab on this Mac with F's path, closed, with and without a session in it.
    db().upsertProject({ id: 'p-local', path: F, name: 'alpha' });
    writeRow('here', F, null);
    expect(closeTab(F, null)).toBe(1);
    expect(db().projectTabClosedFor({ path: F })).toBe(true);
    const result = rehomeRemoteSessions([onMachine({ id: 'far', projectPath: F, cwd: F })]);
    expect(result.projectsAdded).toBe(1);
    expect(result.tabsHeldClosed).toBe(0);
    expect(db().getRemoteProject(MACHINE, F)).toBeDefined();
  });

  it('B7 a machine removed and added again under the same id keeps the folder closed', () => {
    writeRow('mine', F);
    expect(openThenClose(F)).toBe(1);
    // The machine's removal: its one durable transaction over its rows.
    expect(
      db().markMachinesForgotten([
        {
          sessionId: 'mine',
          tombstone: {
            v: 1,
            machineId: MACHINE,
            machineLabel: 'Mac Pro',
            lastStatus: 'running',
            lastSeenAt: 0,
            forgottenAt: 1_700_000_200_000
          }
        }
      ])
    ).toBe(1);
    // Added again under the same id, and its sessions listed again.
    const result = rehomeRemoteSessions([
      onMachine({ id: 'mine', projectPath: F, cwd: F }),
      onMachine({ id: 'theirs', projectPath: F, cwd: F })
    ]);
    expect(result.projectsAdded).toBe(0);
    expect(result.tabsHeldClosed).toBe(1);
    expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
  });
});

describe('withClosedFolderRecords, the record carried on the sessions main lists', () => {
  const RECORD = { projectName: 'alpha', closedAt: CLOSED_AT };

  it('P1 a session on a machine with no stamp of its own carries its folder\'s record', () => {
    const asked: string[] = [];
    const session = onMachine({ id: 'started-elsewhere', projectPath: F, cwd: `${F}/deeper` });
    const [out] = withClosedFolderRecords([session], (machineId, path) => {
      asked.push(`${machineId}:${path}`);
      return machineId === MACHINE && path === F ? RECORD : undefined;
    });
    expect(asked).toEqual([`${MACHINE}:${F}`]);
    expect(out?.closedProject).toEqual({ name: 'alpha', path: F, closedAt: CLOSED_AT });
    // Every other field is the session's own.
    expect({ ...out, closedProject: undefined }).toEqual({ ...session, closedProject: undefined });
    // The input is not written.
    expect(session.closedProject).toBeUndefined();
  });

  it("P2 a session's own stamp wins over its folder's record", () => {
    const own = { name: 'alpha before', path: F, closedAt: 42 };
    const session = onMachine({ id: 'mine', projectPath: F, cwd: F, closedProject: own });
    const [out] = withClosedFolderRecords([session], () => RECORD);
    expect(out).toBe(session);
    expect(out?.closedProject).toEqual(own);
  });

  it('P3 a session on this Mac, and one in a folder with no record, carry nothing', () => {
    // A lookup that answers a record for EVERY machine and every path: a
    // session on this Mac is still never touched. The session on the machine
    // beside it shows the lookup does answer.
    const local = onThisMac('here', F);
    const far = onMachine({ id: 'far', projectPath: F, cwd: F });
    const [outLocal, outFar] = withClosedFolderRecords([local, far], () => RECORD);
    expect(outLocal).toBe(local);
    expect(outLocal?.closedProject).toBeUndefined();
    expect(outFar?.closedProject).toEqual({ name: 'alpha', path: F, closedAt: CLOSED_AT });
    // A session on a machine in a folder with no record comes back as itself.
    const elsewhere = onMachine({ id: 'elsewhere', projectPath: '/home/gdc/work/beta', cwd: '/home/gdc/work/beta' });
    const [outElsewhere] = withClosedFolderRecords([elsewhere], (machineId, path) =>
      machineId === MACHINE && path === F ? RECORD : undefined
    );
    expect(outElsewhere).toBe(elsewhere);
    expect(outElsewhere?.closedProject).toBeUndefined();
  });
});
