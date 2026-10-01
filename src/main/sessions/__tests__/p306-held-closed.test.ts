/**
 * A remote project tab a person closed stays closed (Phase 306, GitHub issue
 * 35, "Tortie remote project always comes back").
 *
 * ## The defect
 *
 * The re-home in `../../machines/remote-rehome.ts` runs at the end of every
 * completed machine pass. It opened a tab for every folder on a machine whose
 * `remote_projects` row was absent, and it never asked why the row was absent.
 * A person who closed the tab had deleted that row, so the next pass put it
 * back with a new id: at once on the first close, and at the next relaunch on
 * a second one.
 *
 * ## What it proves, against a real manifest (build/p306/SPEC.md §7.2)
 *
 *  H1  A folder whose tab a person closed is not opened again, pass after pass.
 *  H2  A folder that never had a tab still gets one on the first pass, which is
 *      Phase 90.3 and research 54 finding 15, the reason the re-home exists.
 *  H2b This Mac's folder of the same path, closed, holds nothing on a machine.
 *  H3  A held folder's rows are still MOVED to it, so the session manager
 *      lists them under the folder's own name with the tab shut.
 *  H4  The decision is per folder: ten sessions are one count.
 *  H5  The line is written when the count moves, and only then.
 *  H6  A machine that stopped answering still reads held.
 *  H7  The stated limit: a folder no recorded session is in comes back.
 *  C1-C5  A create on a machine opens, and clears the stamp on, every folder
 *      it places a session in: the folder it was given, and the folder the
 *      re-home's own rule puts the new session in.
 *  C6-C7  (the fix round) A create that THREW clears the stamps on the folders
 *      it would have placed its session in, being the folder it was given and
 *      the Directory it sent, so a session started with its answer lost is not
 *      held in no tab, and the next pass decides the tab as it did before
 *      Phase 306.
 *
 * Each title is a key `build/p306/ablation.mjs` looks up, so a title is
 * renamed here and there in the same commit or the ablation reads it as an
 * owner that stayed green.
 *
 * Nothing here ends a session, and nothing is sent to any machine.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.110.0' }
}));

/**
 * Every info line written under the scope `config`, and every warning under
 * any scope, as the re-home wrote them. `remote-rehome.ts` binds its loggers
 * when it is imported, so this capture is hoisted above that import.
 */
const logged = vi.hoisted(() => ({
  info: [] as { msg: string; fields: Record<string, unknown> | null }[],
  warn: [] as { scope: string; msg: string }[]
}));

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  return {
    ...real,
    getLog: (scope: string) => {
      const inner = real.getLog(scope);
      return {
        ...inner,
        info: (msg: string, fields?: Record<string, unknown>) => {
          if (scope === 'config') logged.info.push({ msg, fields: fields ?? null });
          inner.info(msg, fields);
        },
        warn: (msg: string, fields?: Record<string, unknown>) => {
          logged.warn.push({ scope, msg });
          inner.warn(msg, fields);
        }
      };
    }
  };
});

const { ManifestStore } = await import('../../manifest/store');
const { setRemoteManifest } = await import('../../machines/remote-record');
const {
  openTabsForRemoteCreate,
  rehomeRemoteSessions,
  releaseFoldersAfterFailedRemoteCreate
} = await import('../../machines/remote-rehome');

type Store = InstanceType<typeof ManifestStore>;

/** The line the re-home writes when the held count moves (SPEC §4 M3). */
const HELD_LINE = 'folders on machines whose tab a person closed are kept closed';

let roots: string[] = [];
let stores: Store[] = [];
let store: Store | null = null;

/** A fresh manifest in a directory of its own, installed for the re-home. */
function freshStore(): Store {
  const root = mkdtempSync(join(tmpdir(), 'gmux-p306-held-'));
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
  logged.info.length = 0;
  logged.warn.length = 0;
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

/** One session as the machines feed projects it. */
function onMachine(input: {
  id: string;
  projectPath: string;
  cwd: string;
  status?: Session['status'];
  answering?: boolean;
}): Session {
  return {
    id: input.id,
    name: input.id,
    tmuxName: input.id,
    projectPath: input.projectPath,
    cwd: input.cwd,
    agent: 'shell',
    status: input.status ?? 'running',
    createdAt: 1_700_000_000_000,
    machine: {
      id: MACHINE,
      label: 'Mac Pro',
      color: 'blue',
      answering: input.answering ?? true,
      canRestore: false,
      restoreReason: null
    }
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
 * recorded session in the folder on that machine, then the row deleted.
 * A null machine is this Mac. Answers how many rows were stamped.
 */
function closeTab(target: Store, path: string, machine: string | null = MACHINE): number {
  const machineId = machine ?? undefined;
  const stamped = target.markProjectTabClosed(
    machineId === undefined ? { path } : { path, machineId },
    {
      v: 1,
      projectId: `project-${path}`,
      projectName: path.slice(path.lastIndexOf('/') + 1),
      path,
      closedAt: 1_700_000_100_000,
      ...(machineId === undefined ? {} : { machineId })
    }
  );
  if (machineId !== undefined) {
    const row = target.getRemoteProject(machineId, path);
    if (row !== undefined) target.deleteProject(row.id);
  }
  return stamped;
}

const heldLines = (): { msg: string; fields: Record<string, unknown> | null }[] =>
  logged.info.filter((line) => line.fields !== null && 'held' in line.fields);

describe('the re-home leaves a folder whose tab a person closed without one', () => {
  it('H1 a folder whose tab a person closed is not opened again, pass after pass', () => {
    writeRow('s1', F);
    db().upsertRemoteProject({ machineId: MACHINE, path: F, name: 'alpha' });
    expect(closeTab(db(), F)).toBe(1);
    expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
    const feed = [onMachine({ id: 's1', projectPath: F, cwd: F })];
    for (let pass = 0; pass < 3; pass += 1) {
      const result = rehomeRemoteSessions(feed);
      expect(result.projectsAdded).toBe(0);
      expect(result.tabsHeldClosed).toBe(1);
      expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
    }
    // The session itself is untouched: still running, still in F, still stamped.
    expect(db().getSession('s1')).toMatchObject({ status: 'running', projectPath: F });
    expect(db().getSession('s1')?.projectTombstone?.path).toBe(F);
  });

  it('H2 a folder that never had a tab still gets one on the first pass', () => {
    writeRow('s1', F);
    const result = rehomeRemoteSessions([onMachine({ id: 's1', projectPath: F, cwd: F })]);
    expect(result.projectsAdded).toBe(1);
    expect(result.tabsHeldClosed).toBe(0);
    expect(db().getRemoteProject(MACHINE, F)).toMatchObject({ machineId: MACHINE, path: F });
  });

  it("H2b a folder on this Mac with the same path closed does not hold the machine's folder", () => {
    writeRow('here', F, null);
    expect(closeTab(db(), F, null)).toBe(1);
    expect(db().getSession('here')?.machineId).toBe('local');
    expect(db().projectTabClosedFor({ path: F })).toBe(true);
    const result = rehomeRemoteSessions([onMachine({ id: 'far', projectPath: F, cwd: F })]);
    expect(result.projectsAdded).toBe(1);
    expect(result.tabsHeldClosed).toBe(0);
    expect(db().getRemoteProject(MACHINE, F)).toBeDefined();
  });

  it("H3 a held folder's rows are still moved to it", () => {
    writeRow('s1', F);
    expect(closeTab(db(), F)).toBe(1);
    writeRow('s2', '/Users/gdc/legacy');
    const result = rehomeRemoteSessions([
      onMachine({ id: 's1', projectPath: F, cwd: F }),
      onMachine({ id: 's2', projectPath: '/Users/gdc/legacy', cwd: F })
    ]);
    expect(result.rowsMoved).toBe(1);
    expect(db().getSession('s2')?.projectPath).toBe(F);
    expect(result.projectsAdded).toBe(0);
    expect(result.tabsHeldClosed).toBe(1);
    expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
  });

  it('H4 ten sessions in a held folder are one decision', () => {
    const feed: Session[] = [];
    for (let n = 0; n < 10; n += 1) {
      writeRow(`m${String(n)}`, F);
      feed.push(onMachine({ id: `m${String(n)}`, projectPath: F, cwd: F }));
    }
    expect(closeTab(db(), F)).toBe(10);
    const result = rehomeRemoteSessions(feed);
    expect(result.tabsHeldClosed).toBe(1);
    expect(result.projectsAdded).toBe(0);
  });

  it('H5 the line is written when the count moves and only then', () => {
    writeRow('s1', F);
    expect(closeTab(db(), F)).toBe(1);
    const feed = [onMachine({ id: 's1', projectPath: F, cwd: F })];
    for (let pass = 0; pass < 3; pass += 1) {
      expect(rehomeRemoteSessions(feed).tabsHeldClosed).toBe(1);
    }
    // The person re-opens the folder: the add's clear, then its upsert.
    db().clearProjectTabClosed({ path: F, machineId: MACHINE });
    expect(rehomeRemoteSessions(feed).tabsHeldClosed).toBe(0);
    expect(heldLines()).toEqual([
      { msg: HELD_LINE, fields: { held: 1 } },
      { msg: HELD_LINE, fields: { held: 0 } }
    ]);
    // A pass with the count unchanged at zero writes nothing more.
    rehomeRemoteSessions(feed);
    expect(heldLines()).toHaveLength(2);
    // The line names no folder and no machine.
    for (const line of heldLines()) {
      expect(line.msg).not.toContain(F);
      expect(line.msg).not.toContain(MACHINE);
      expect(Object.keys(line.fields ?? {})).toEqual(['held']);
    }
    // Held again on this store, so the last count it wrote is 1.
    const project = db().getRemoteProject(MACHINE, F);
    expect(project).toBeDefined();
    if (project !== undefined) db().deleteProject(project.id);
    expect(closeTab(db(), F)).toBe(1);
    expect(rehomeRemoteSessions(feed).tabsHeldClosed).toBe(1);
    expect(heldLines()).toHaveLength(3);
    // A fresh store, being a new run, starts again from zero: its first held
    // pass is a move from zero and is written, though the last count written
    // against the old store was also 1.
    store = freshStore();
    writeRow('s1', F);
    expect(closeTab(db(), F)).toBe(1);
    expect(rehomeRemoteSessions(feed).tabsHeldClosed).toBe(1);
    expect(heldLines().map((line) => line.fields)).toEqual([
      { held: 1 },
      { held: 0 },
      { held: 1 },
      { held: 1 }
    ]);
  });

  it('H6 a machine that stopped answering still reads held', () => {
    writeRow('s1', F);
    writeRow('s2', F);
    expect(closeTab(db(), F)).toBe(2);
    const result = rehomeRemoteSessions([
      onMachine({ id: 's1', projectPath: F, cwd: F, status: 'unknown', answering: false }),
      onMachine({ id: 's2', projectPath: F, cwd: '', status: 'restorable', answering: false })
    ]);
    expect(result.tabsHeldClosed).toBe(1);
    expect(result.projectsAdded).toBe(0);
    expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
  });

  it('H7 the stated limit: a folder with no recorded session comes back', () => {
    // A tab opened and closed over a folder whose only session a Tortie on
    // that machine, or on another Mac, started: no row here, so the close
    // stamps nothing and the next pass opens the folder again. Pinned, so a
    // round that changes the limit says so.
    db().upsertRemoteProject({ machineId: MACHINE, path: F, name: 'alpha' });
    expect(closeTab(db(), F)).toBe(0);
    expect(db().getRemoteProject(MACHINE, F)).toBeUndefined();
    const result = rehomeRemoteSessions([
      onMachine({ id: 'started-elsewhere', projectPath: F, cwd: F })
    ]);
    expect(result.projectsAdded).toBe(1);
    expect(result.tabsHeldClosed).toBe(0);
    expect(db().getRemoteProject(MACHINE, F)).toBeDefined();
  });
});

describe('a create on a machine opens and clears every folder it places a session in', () => {
  it('C1 a create in a folder whose tab was closed opens it and clears the stamp', () => {
    writeRow('s1', F);
    expect(closeTab(db(), F)).toBe(1);
    const opened = openTabsForRemoteCreate(db(), MACHINE, F, { projectPath: F, cwd: F });
    expect(opened).toEqual([F]);
    expect(db().getRemoteProject(MACHINE, F)).toBeDefined();
    expect(db().projectTabClosedFor({ path: F, machineId: MACHINE })).toBe(false);
    expect(db().getSession('s1')?.projectTombstone).toBeUndefined();
  });

  it('C2 a create with no folder opens and clears the folder the machine put it in', () => {
    const H = '/home/gdc';
    writeRow('earlier', H);
    expect(closeTab(db(), H)).toBe(1);
    const opened = openTabsForRemoteCreate(db(), MACHINE, '', { projectPath: '', cwd: H });
    expect(opened).toEqual([H]);
    expect(db().getRemoteProject(MACHINE, H)).toBeDefined();
    expect(db().projectTabClosedFor({ path: H, machineId: MACHINE })).toBe(false);
    // The next pass finds the folder open and nothing to hold.
    const result = rehomeRemoteSessions([
      onMachine({ id: 'earlier', projectPath: H, cwd: H }),
      onMachine({ id: 'new', projectPath: '', cwd: H })
    ]);
    expect(result.projectsAdded).toBe(0);
    expect(result.tabsHeldClosed).toBe(0);
  });

  it('C3 a create placed outside its given folder opens both, once each', () => {
    const P = '/home/gdc/work/given';
    const Y = '/home/gdc/elsewhere';
    writeRow('in-p', P);
    writeRow('in-y', Y);
    expect(closeTab(db(), P)).toBe(1);
    expect(closeTab(db(), Y)).toBe(1);
    const opened = openTabsForRemoteCreate(db(), MACHINE, P, { projectPath: P, cwd: Y });
    expect(opened).toEqual([P, Y]);
    for (const path of [P, Y]) {
      expect(db().getRemoteProject(MACHINE, path)).toBeDefined();
      expect(db().projectTabClosedFor({ path, machineId: MACHINE })).toBe(false);
    }
    expect(db().listRemoteProjects()).toHaveLength(2);
  });

  it('C4 an upsert that fails still clears, so the next pass opens the folder', () => {
    writeRow('s1', F);
    expect(closeTab(db(), F)).toBe(1);
    const real = db();
    const cleared: { path: string; machineId?: string }[] = [];
    const failing: Parameters<typeof openTabsForRemoteCreate>[0] = {
      upsertRemoteProject: () => {
        throw new Error('the disk is full');
      },
      clearProjectTabClosed: (target) => {
        cleared.push(target);
        return real.clearProjectTabClosed(target);
      }
    };
    openTabsForRemoteCreate(failing, MACHINE, F, { projectPath: F, cwd: F });
    expect(cleared).toEqual([{ path: F, machineId: MACHINE }]);
    expect(real.getRemoteProject(MACHINE, F)).toBeUndefined();
    expect(real.projectTabClosedFor({ path: F, machineId: MACHINE })).toBe(false);
    // The failure is said, in the create's own sentence.
    expect(
      logged.warn.some((line) =>
        line.msg.startsWith(
          `the session started on ${MACHINE} and its folder could not be opened as a tab: `
        )
      )
    ).toBe(true);
    // With the stamp gone the next completed pass opens the folder.
    const result = rehomeRemoteSessions([onMachine({ id: 's1', projectPath: F, cwd: F })]);
    expect(result.projectsAdded).toBe(1);
    expect(result.tabsHeldClosed).toBe(0);
    expect(real.getRemoteProject(MACHINE, F)).toBeDefined();
  });

  it('C5 a create with no folder and no reported folder opens nothing and clears nothing', () => {
    const calls: string[] = [];
    const watching: Parameters<typeof openTabsForRemoteCreate>[0] = {
      upsertRemoteProject: (input) => {
        calls.push(`upsert ${input.path}`);
        return db().upsertRemoteProject(input);
      },
      clearProjectTabClosed: (target) => {
        calls.push(`clear ${target.path}`);
        return db().clearProjectTabClosed(target);
      }
    };
    expect(openTabsForRemoteCreate(watching, MACHINE, '', { projectPath: '', cwd: '' })).toEqual([]);
    expect(calls).toEqual([]);
    expect(db().listRemoteProjects()).toEqual([]);
  });
});

describe('a create on a machine that threw (the fix round)', () => {
  it('C6 a create that threw opens the closed folders it named, and only those', () => {
    writeRow('s1', F);
    expect(closeTab(db(), F)).toBe(1);
    expect(releaseFoldersAfterFailedRemoteCreate(db(), MACHINE, F, F)).toEqual([F]);
    // Opened and cleared, as a create that worked does it.
    expect(db().getRemoteProject(MACHINE, F)).toBeDefined();
    expect(db().projectTabClosedFor({ path: F, machineId: MACHINE })).toBe(false);
    // The session the lost answer started is listed by the next pass, which
    // finds the folder open and holds nothing.
    const result = rehomeRemoteSessions([
      onMachine({ id: 's1', projectPath: F, cwd: F }),
      onMachine({ id: 'lost-answer', projectPath: F, cwd: F })
    ]);
    expect(result.projectsAdded).toBe(0);
    expect(result.tabsHeldClosed).toBe(0);

    // A create from a tab on the machine with the Directory set to a closed
    // folder: the tab's folder is SENT as the project and the Directory is
    // where the session lands. Only the closed one is opened.
    const C = '/home/gdc/work/charlie';
    const D = '/home/gdc/work/delta';
    writeRow('d1', D);
    expect(closeTab(db(), D)).toBe(1);
    expect(releaseFoldersAfterFailedRemoteCreate(db(), MACHINE, C, D)).toEqual([D]);
    expect(db().getRemoteProject(MACHINE, D)).toBeDefined();
    expect(db().projectTabClosedFor({ path: D, machineId: MACHINE })).toBe(false);
    expect(db().getRemoteProject(MACHINE, C)).toBeUndefined();

    // A folder that never had a tab gets none from a failed create.
    const N = '/home/gdc/work/november';
    expect(releaseFoldersAfterFailedRemoteCreate(db(), MACHINE, N, N)).toEqual([]);
    expect(db().getRemoteProject(MACHINE, N)).toBeUndefined();

    // A create with no folder named asks nothing.
    const calls: string[] = [];
    const watching: Parameters<typeof releaseFoldersAfterFailedRemoteCreate>[0] = {
      projectTabClosedFor: (t) => {
        calls.push(`ask ${t.path}`);
        return true;
      },
      upsertRemoteProject: (input) => {
        calls.push(`upsert ${input.path}`);
        return db().upsertRemoteProject(input);
      },
      clearProjectTabClosed: (t) => {
        calls.push(`clear ${t.path}`);
        return 0;
      }
    };
    expect(releaseFoldersAfterFailedRemoteCreate(watching, MACHINE, '', '')).toEqual([]);
    expect(calls).toEqual([]);

    // An open that fails still clears, so the next pass opens the folder, and
    // nothing throws out of the create's own failure.
    const G = '/home/gdc/work/golf';
    writeRow('g1', G);
    expect(closeTab(db(), G)).toBe(1);
    const real = db();
    const failing: Parameters<typeof releaseFoldersAfterFailedRemoteCreate>[0] = {
      projectTabClosedFor: (t) => real.projectTabClosedFor(t),
      upsertRemoteProject: () => {
        throw new Error('the disk is full');
      },
      clearProjectTabClosed: (t) => real.clearProjectTabClosed(t)
    };
    expect(releaseFoldersAfterFailedRemoteCreate(failing, MACHINE, G, G)).toEqual([G]);
    expect(real.projectTabClosedFor({ path: G, machineId: MACHINE })).toBe(false);
    expect(
      logged.warn.some((line) =>
        line.msg.startsWith(
          `the create on ${MACHINE} did not finish and a folder whose tab was closed could not be opened again: `
        )
      )
    ).toBe(true);
  });

  it("C7 the create's failure path releases the folders it sent before it rethrows", () => {
    // Read as text, because the remote create cannot be driven without a
    // machine. The release is chained onto the one call that can throw after
    // a session started, it names the folder and the Directory sent to the
    // machine, and the failure is thrown on to the person unchanged.
    const source = readFileSync(resolve(import.meta.dirname, '../create-local.ts'), 'utf8');
    const start = source.indexOf('const session = await remoteCreate({');
    const end = source.indexOf('openTabsForRemoteCreate(deps.manifest', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const span = source.slice(start, end);
    const caught = span.indexOf('}).catch((err: unknown) => {');
    const release = span.indexOf(
      "releaseFoldersAfterFailedRemoteCreate(deps.manifest, machineId, farProjectPath, folders.cwd ?? '');"
    );
    const rethrow = span.indexOf('throw err;');
    expect(caught).toBeGreaterThan(-1);
    expect(release).toBeGreaterThan(caught);
    expect(rethrow).toBeGreaterThan(release);
    expect(source.split('releaseFoldersAfterFailedRemoteCreate(').length - 1).toBe(1);
  });
});
