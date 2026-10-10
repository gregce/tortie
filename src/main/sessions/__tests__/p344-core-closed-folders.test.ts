/**
 * Closing a tab for a folder on another machine records the folder, pushes the
 * list, and the list a window reads carries the record on the sessions in that
 * folder this Mac did not start (Phase 344, build/p344/SPEC.md §7.3, D9, D12).
 *
 * HOW IT IS DRIVEN. The real bodies of `removeProject`, `listSessions`,
 * `addRemoteProjectAdmitted` and `addProject` are taken off
 * `GmuxCore.prototype` and called against a small object holding the few things
 * they touch, the shape `./p93-remove-project.test.ts` set. The database is
 * real: a `ManifestStore` in a fresh temporary directory, behind a recorder.
 *
 * THE MACHINE FEED is replaced with ONE session on `macpro` in the folder,
 * which no manifest row covers: a session a Tortie on that machine, or on
 * another Mac, started. That is the session the defect hid the tab behind, and
 * the one the window needs the record on, or a create from a tab on the machine
 * in a folder held this way sits in no tab (SPEC §2.2 W2).
 *
 * Each title is a key `build/p344/ablation.mjs` looks up.
 *
 * Nothing here ends a session, and nothing is sent to any machine: the
 * machine's folder read and its pin are stand-ins.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.111.0' }
}));

/** The watcher is a local file system fact. Closing a tab must not need one. */
vi.mock('../../git', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../git')>();
  return { ...actual, unwatchGitRepo: (): Promise<void> => Promise.resolve() };
});

/** The machine layer, replaced with a machine that always answers. */
vi.mock('../../machines/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../machines/store')>();
  return {
    ...actual,
    machineRow: (id: string): unknown => (id === 'macpro' ? { id } : null)
  };
});

/**
 * The machine's feed: whatever `feed.rows` holds, which no manifest row covers.
 * Hoisted, because the mock factory below reads it.
 */
const feed = vi.hoisted(() => ({ rows: [] as Session[] }));

vi.mock('../../machines/remote-sessions', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-sessions')
  >();
  return {
    ...actual,
    readyRemoteContext: (): unknown => ({ id: 'macpro' }),
    remoteSessions: (): Session[] => feed.rows
  };
});

vi.mock('../../machines/dir-list', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../machines/dir-list')>();
  return {
    ...actual,
    listRemoteDir: (input: { path: string }): Promise<unknown> =>
      Promise.resolve({
        path: input.path,
        entries: [],
        folders: 0,
        truncated: false,
        refusal: null,
        refusalText: null
      })
  };
});

/** The Phase 336 pin of a folder opened by hand reads that machine; nothing here may. */
vi.mock('../../machines/write-folder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../machines/write-folder')>();
  return { ...actual, pinOpenedFolder: (): Promise<void> => Promise.resolve() };
});

const { GmuxCore } = await import('../core');
const { ManifestStore } = await import('../../manifest/store');

/** The real bodies, borrowed. No subclass, no cast of the whole class. */
const proto = GmuxCore.prototype as unknown as {
  addProject: (this: unknown, path: string) => { id: string; path: string };
  addRemoteProjectAdmitted: (
    this: unknown,
    input: { machineId: string; path: string }
  ) => Promise<{ ok: boolean }>;
  removeProject: (this: unknown, projectId: string) => void;
  listSessions: (this: unknown) => Session[];
};

const MACHINE = 'macpro';

let dir = '';
let store: InstanceType<typeof ManifestStore>;
/** The folder, a real directory so that the local add of C5 can open it too. */
let F = '';
/** Every manifest call the borrowed bodies made, in order. */
let order: string[];
/** How many times the borrowed bodies pushed the session list to the windows. */
let broadcasts: number;

function host(): unknown {
  const recorder = new Proxy(store, {
    get(target, prop, receiver): unknown {
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value !== 'function') return value;
      return (...args: unknown[]): unknown => {
        order.push(String(prop));
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    }
  });
  return {
    manifest: recorder,
    broadcastSessions(): void {
      broadcasts += 1;
    }
  };
}

/** The one session the machine lists in the folder, with no manifest row. */
function feedRow(id: string): Session {
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: F,
    cwd: F,
    agent: 'shell',
    status: 'running',
    createdAt: 1_787_000_000_000,
    machine: {
      id: MACHINE,
      label: 'Mac Pro',
      color: 'blue',
      answering: true,
      canRestore: false,
      restoreReason: null
    }
  };
}

/** A session this Mac recorded on the machine, in the folder. */
function recordedRow(id: string): void {
  store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: F,
    cwd: F,
    agent: 'shell',
    status: 'running',
    createdAt: 1_787_000_000_000,
    argv: ['/bin/zsh'],
    lastSeen: 1_787_000_000_000,
    machineId: MACHINE
  });
}

/** The folder opened as a tab on the machine, by hand. Answers the project id. */
function openOnMachine(): string {
  const project = store.upsertRemoteProject({ machineId: MACHINE, path: F, name: 'alpha' });
  return project.id;
}

/** What the window is handed for one session. */
function drawn(id: string): Session | undefined {
  return proto.listSessions.call(host()).find((s) => s.id === id);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tortie-p344-core-'));
  userData = dir;
  F = join(dir, 'alpha');
  mkdirSync(F);
  store = new ManifestStore(join(dir, 'manifest.db'));
  order = [];
  broadcasts = 0;
  feed.rows = [feedRow('started-elsewhere')];
});

afterEach(() => {
  feed.rows = [];
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('closing a tab on a machine whose sessions this Mac did not start', () => {
  it('C1 closing a tab on a machine with no recorded session records the folder and pushes the list once', () => {
    const projectId = openOnMachine();
    expect(drawn('started-elsewhere')?.closedProject).toBeUndefined();

    proto.removeProject.call(host(), projectId);

    // The close stamped no session row and still recorded the folder, before
    // the tab's own row was deleted.
    expect(store.getRemoteProject(MACHINE, F)).toBeUndefined();
    expect(order.indexOf('markProjectTabClosed')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('markProjectTabClosed')).toBeLessThan(order.indexOf('deleteProject'));
    expect(store.closedRemoteFolder(MACHINE, F)).toEqual({
      machineId: MACHINE,
      path: F,
      projectName: 'alpha',
      closedAt: expect.any(Number) as unknown as number
    });
    expect(store.projectTabClosedFor({ path: F, machineId: MACHINE })).toBe(true);
    expect(broadcasts).toBe(1);
  });

  it('C2 the list a window reads carries the record on a session this Mac did not start', () => {
    proto.removeProject.call(host(), openOnMachine());
    const record = store.closedRemoteFolder(MACHINE, F);
    expect(record).toBeDefined();

    expect(drawn('started-elsewhere')?.closedProject).toEqual({
      name: 'alpha',
      path: F,
      closedAt: record?.closedAt
    });
    // A session on this Mac in a folder of the same path carries nothing.
    store.insertSession({
      id: 'here',
      name: 'here',
      tmuxName: 'here',
      projectPath: F,
      cwd: F,
      agent: 'shell',
      status: 'running',
      createdAt: 1_787_000_000_000,
      argv: ['/bin/zsh'],
      lastSeen: 1_787_000_000_000
    });
    expect(drawn('here')?.closedProject).toBeUndefined();
  });

  it("C3 the list keeps a session's own stamp over its folder's record", () => {
    recordedRow('mine');
    proto.removeProject.call(host(), openOnMachine());
    expect(store.closedRemoteFolder(MACHINE, F)?.projectName).toBe('alpha');
    // The recorded session's own stamp names the tab differently from the
    // folder's record: what Tortie knew about that session's own tab, written
    // here through a raw handle on the same file.
    const raw = new Database(join(dir, 'manifest.db'));
    try {
      raw
        .prepare('UPDATE sessions SET project_tombstone = ? WHERE id = ?')
        .run(
          JSON.stringify({ v: 1, projectId: 'p-then', projectName: 'alpha then', machineId: MACHINE, path: F, closedAt: 42 }),
          'mine'
        );
    } finally {
      raw.close();
    }
    expect(store.getSession('mine')?.projectTombstone?.projectName).toBe('alpha then');

    expect(drawn('mine')?.closedProject).toEqual({ name: 'alpha then', path: F, closedAt: 42 });
    // The session this Mac did not start carries the folder's record.
    expect(drawn('started-elsewhere')?.closedProject?.name).toBe('alpha');
  });

  it('C4 opening the folder on that machine again clears the record and the list carries none', async () => {
    proto.removeProject.call(host(), openOnMachine());
    expect(drawn('started-elsewhere')?.closedProject).toBeDefined();

    const opened = await proto.addRemoteProjectAdmitted.call(host(), { machineId: MACHINE, path: F });
    expect(opened.ok).toBe(true);

    expect(store.closedRemoteFolder(MACHINE, F)).toBeUndefined();
    expect(store.projectTabClosedFor({ path: F, machineId: MACHINE })).toBe(false);
    expect(drawn('started-elsewhere')?.closedProject).toBeUndefined();
  });

  it('C5 opening a folder on this Mac clears nothing on a machine', () => {
    proto.removeProject.call(host(), openOnMachine());
    expect(store.closedRemoteFolder(MACHINE, F)).toBeDefined();

    // The same path, opened as a tab on THIS Mac.
    proto.addProject.call(host(), F);
    expect(order).toContain('clearProjectTabClosed');

    expect(store.closedRemoteFolder(MACHINE, F)).toEqual({
      machineId: MACHINE,
      path: F,
      projectName: 'alpha',
      closedAt: expect.any(Number) as unknown as number
    });
    expect(store.projectTabClosedFor({ path: F, machineId: MACHINE })).toBe(true);
    expect(drawn('started-elsewhere')?.closedProject?.name).toBe('alpha');
  });
});
