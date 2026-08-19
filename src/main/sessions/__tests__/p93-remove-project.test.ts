/**
 * Closing a project tab records what Tortie knew about the tab, and opening the
 * same folder again clears the record (Phase 93, item 3).
 *
 * WHAT WAS WRONG. `removeProject` called `deleteProject` under the comment
 * "sessions keep their history" and wrote nothing else. So closing a tab was an
 * unrecorded event, and every session in that folder was left pointing at a
 * `project_path` no row held, with nothing anywhere saying the tab had existed.
 * The operator's three unreachable rows on 2026-08-19 were exactly that state.
 *
 * HOW IT IS DRIVEN. The real methods are taken off `GmuxCore.prototype` and
 * called against a small object holding the few things their bodies touch. That
 * is the shape `./remote-lifecycle.test.ts` set and it is deliberate. Booting a
 * core needs a tmux server, an attach host and a control client, so a functional
 * boot here would prove the mocks rather than the methods. What is under test is
 * a small body with a real database behind it, so the database is real: a
 * `ManifestStore` in a fresh temporary directory.
 *
 * THE LAST SECTION IS SOURCE SHAPE, and it says why in place. Whether End and
 * Remove can reach a session whose tab is gone is decided by whether their
 * bodies ever ask the projects table anything. A live tmux server cannot be
 * started here, and the phase's driven probe is the live evidence for those two
 * verbs, so what this file pins is the property the probe cannot: that no
 * project lookup stands between a person and their own session.
 */

import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.48.0' }
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

vi.mock('../../machines/remote-sessions', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-sessions')
  >();
  return { ...actual, readyRemoteContext: (): unknown => ({ id: 'macpro' }) };
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

const { GmuxCore } = await import('../core');
const { ManifestStore } = await import('../../manifest/store');
import type { ManifestSessionRecord } from '../../manifest/store';

/** The real bodies, borrowed. No subclass, no cast of the whole class. */
const proto = GmuxCore.prototype as unknown as {
  addProject: (this: unknown, path: string) => { id: string; path: string };
  addRemoteProject: (
    this: unknown,
    input: { machineId: string; path: string }
  ) => Promise<{ ok: boolean }>;
  removeProject: (this: unknown, projectId: string) => void;
  listSessions: (this: unknown) => { id: string; closedProject?: unknown }[];
};

let dir = '';
let dbPath = '';
let store: InstanceType<typeof ManifestStore>;
/** Every manifest call the borrowed body made, in order. */
let order: string[];
/**
 * How many times the borrowed body pushed the session list to the windows.
 *
 * FIX ROUND. The stamp is a fact about a SESSION and closing a tab pushes the
 * project list, so without a push here the rows in the window still read as
 * sessions whose folder never had a tab. It was MEASURED that way on
 * 2026-08-19, 700 ms after a real close in build/probe-p93-attention.mjs.
 */
let broadcasts: number;

/**
 * The object the borrowed bodies run against.
 *
 * `manifest` is the real store behind a recorder, so the ordering claim is read
 * off the real writes rather than off a stub that could be ordered any way the
 * test liked.
 */
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

function row(over: Partial<ManifestSessionRecord>): ManifestSessionRecord {
  return store.insertSession({
    id: 'seed',
    name: 'claude-1',
    tmuxName: 'claude-1',
    projectPath: '/Users/gdc/gmux',
    cwd: '/Users/gdc/gmux',
    agent: 'claude',
    status: 'running',
    createdAt: 1_787_000_000_000,
    argv: ['/usr/local/bin/claude'],
    lastSeen: 1_787_000_000_000,
    ...over
  } as ManifestSessionRecord);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tortie-p93-remove-project-'));
  userData = dir;
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
  order = [];
  broadcasts = 0;
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('closing a project tab on this Mac', () => {
  it('stamps the sessions BEFORE it deletes the project row', () => {
    store.upsertProject({ id: 'p-gmux', path: '/Users/gdc/gmux', name: 'gmux' });
    row({ id: 'live-a' });

    proto.removeProject.call(host(), 'p-gmux');

    const stamp = order.indexOf('markProjectTabClosed');
    const del = order.indexOf('deleteProject');
    expect(stamp).toBeGreaterThanOrEqual(0);
    expect(del).toBeGreaterThanOrEqual(0);
    expect(stamp).toBeLessThan(del);
  });

  it('writes the tab name, the path and the project id onto every session', () => {
    store.upsertProject({ id: 'p-gmux', path: '/Users/gdc/gmux', name: 'gmux' });
    row({ id: 'live-a' });
    row({ id: 'live-b', name: 'claude-2', tmuxName: 'claude-2' });

    proto.removeProject.call(host(), 'p-gmux');

    for (const id of ['live-a', 'live-b']) {
      const tab = store.getSession(id)?.projectTombstone;
      expect(tab?.projectId).toBe('p-gmux');
      expect(tab?.projectName).toBe('gmux');
      expect(tab?.path).toBe('/Users/gdc/gmux');
      expect(tab?.machineId).toBeUndefined();
      expect(typeof tab?.closedAt).toBe('number');
    }
  });

  it('leaves the session running, with its folder and its machine intact', () => {
    store.upsertProject({ id: 'p-gmux', path: '/Users/gdc/gmux', name: 'gmux' });
    row({ id: 'live-a' });

    proto.removeProject.call(host(), 'p-gmux');

    const record = store.getSession('live-a');
    expect(record?.status).toBe('running');
    expect(record?.projectPath).toBe('/Users/gdc/gmux');
    expect(record?.machineId).toBe('local');
    expect(store.listProjects()).toEqual([]);
  });

  it('lets Remove reach the session afterwards, by id alone', () => {
    store.upsertProject({ id: 'p-gmux', path: '/Users/gdc/gmux', name: 'gmux' });
    row({ id: 'live-a' });
    proto.removeProject.call(host(), 'p-gmux');

    store.markSessionRemoved('live-a');

    expect(store.getSession('live-a')?.status).toBe('discarded');
  });

  it('pushes the session list to the windows when it stamps', () => {
    // FIX ROUND, and it was found by driving the app rather than by reading it.
    // The window keeps its own copy of the session list, and closing a tab used
    // to push the project list alone. `jumpToSession` reads the tab record off
    // the session row to decide whether a tab coming back needs a sentence, so
    // a person who closed a tab themselves was told the folder never had one.
    store.upsertProject({ id: 'p-gmux', path: '/Users/gdc/gmux', name: 'gmux' });
    row({ id: 'live-a' });

    proto.removeProject.call(host(), 'p-gmux');

    expect(broadcasts).toBe(1);
  });

  it('pushes nothing when the tab held no sessions', () => {
    // Nothing about any session changed, so nothing is sent. A push per closed
    // tab would send the whole list to every window for no reason.
    store.upsertProject({ id: 'p-empty', path: '/Users/gdc/empty', name: 'empty' });

    proto.removeProject.call(host(), 'p-empty');

    expect(broadcasts).toBe(0);
  });

  it('opening the same folder again clears the record', () => {
    const folder = join(dir, 'gmux');
    mkdirSync(folder);
    store.upsertProject({ id: 'p-gmux', path: folder, name: 'gmux' });
    row({ id: 'live-a', projectPath: folder, cwd: folder });

    proto.removeProject.call(host(), 'p-gmux');
    expect(store.getSession('live-a')?.projectTombstone).toBeDefined();

    proto.addProject.call(host(), folder);
    expect(store.getSession('live-a')?.projectTombstone).toBeUndefined();
  });
});

describe('closing a project tab on another machine', () => {
  it('stamps the machine as well as the folder', () => {
    store.upsertRemoteProject({
      machineId: 'macpro',
      path: '/Users/gdc/gmux',
      name: 'gmux'
    });
    const project = store.getRemoteProject('macpro', '/Users/gdc/gmux');
    row({ id: 'remote-a', machineId: 'macpro' });
    row({ id: 'local-a', machineId: 'local' });

    proto.removeProject.call(host(), project?.id ?? '');

    const tab = store.getSession('remote-a')?.projectTombstone;
    expect(tab?.machineId).toBe('macpro');
    expect(tab?.path).toBe('/Users/gdc/gmux');
    expect(store.getSession('local-a')?.projectTombstone).toBeUndefined();
  });

  it('draws the record on the row a window reads, for a session on a machine', () => {
    // FIX ROUND, and the live gate npm run smoke:p93remote is what caught it.
    // `projectRemoteRecord` builds a session from eight named fields and the
    // record's tab stamp is not one of them, so a remote row reached the window
    // with no record of the tab a person had closed. `listSessions` is the one
    // place the manifest list and the machine feed are merged, so it is where
    // the field is put back.
    store.upsertRemoteProject({
      machineId: 'macpro',
      path: '/Users/gdc/gmux',
      name: 'gmux'
    });
    const project = store.getRemoteProject('macpro', '/Users/gdc/gmux');
    row({ id: 'remote-a', machineId: 'macpro' });

    proto.removeProject.call(host(), project?.id ?? '');
    const drawn = proto.listSessions
      .call(host())
      .find((x) => x.id === 'remote-a');

    expect(drawn?.closedProject).toEqual({
      name: 'gmux',
      path: '/Users/gdc/gmux',
      closedAt: expect.any(Number) as unknown as number
    });
  });

  it('opening the folder on that machine again clears only that machine', async () => {
    store.upsertRemoteProject({
      machineId: 'macpro',
      path: '/Users/gdc/gmux',
      name: 'gmux'
    });
    store.upsertProject({
      id: 'p-local',
      path: '/Users/gdc/gmux',
      name: 'gmux'
    });
    const remote = store.getRemoteProject('macpro', '/Users/gdc/gmux');
    row({ id: 'remote-a', machineId: 'macpro' });
    row({ id: 'local-a', machineId: 'local' });

    proto.removeProject.call(host(), remote?.id ?? '');
    proto.removeProject.call(host(), 'p-local');
    expect(store.getSession('remote-a')?.projectTombstone).toBeDefined();
    expect(store.getSession('local-a')?.projectTombstone).toBeDefined();

    await proto.addRemoteProject.call(host(), {
      machineId: 'macpro',
      path: '/Users/gdc/gmux'
    });

    expect(store.getSession('remote-a')?.projectTombstone).toBeUndefined();
    expect(store.getSession('local-a')?.projectTombstone).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Source shape: End and Remove never ask the projects table anything
// ---------------------------------------------------------------------------

/**
 * The body of one method of `GmuxCore`, read out of the file.
 *
 * It counts braces from the opening line, which is enough for these two bodies
 * and is why the assertion below names the exact method rather than scanning
 * the file. A brace inside a string would break it, and neither body has one.
 */
function bodyOf(source: string, name: string): string {
  const start = source.search(
    new RegExp(`\\n  (?:async )?${name}\\(sessionId: string\\)`)
  );
  if (start < 0) throw new Error(`No method ${name} in core.ts`);
  let depth = 0;
  let started = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') {
      depth += 1;
      started = true;
    } else if (ch === '}') {
      depth -= 1;
      if (started && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unbalanced braces reading ${name}`);
}

describe('the two verbs a person presses on a session they cannot reach', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'core.ts'),
    'utf8'
  );

  it.each(['killSession', 'removeSession'])(
    '%s resolves the session by id and never reads the projects table',
    (name) => {
      const body = bodyOf(source, name);
      expect(body).not.toContain('listProjects');
      expect(body).not.toContain('upsertProject');
      expect(body).not.toContain('getRemoteProject');
      expect(body).not.toContain('deleteProject');
    }
  );
});
