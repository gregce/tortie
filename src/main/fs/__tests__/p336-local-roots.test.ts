/**
 * Phase 336, fault 5 of research 138 section 2.5: the local readers take LOCAL
 * project rows only (build/p336/SPEC.md D15, condition 119).
 *
 * A project row for a folder on another machine is a path on THAT machine. Four
 * readers on this Mac handed the whole project list to the local gate, so a row
 * for `/x` on another machine made `/x` HERE a folder the gate admitted: the
 * file operations and the guarded save, the drag out, Open With, and the
 * Redline baseline store, the fourth of which research 138 did not name.
 *
 * WHAT IS DRIVEN, AND WHY IT IS THE SHIPPING CODE. The core is the only thing
 * replaced: `getGmuxCore` answers a project list this file controls. Everything
 * between it and the refusal is the product:
 *
 *  - `fs:writeGuarded` and `fs:createFile` are the handlers `registerFsIpc`
 *    registers with NO deps passed, so they run `defaultFileOpsDeps`, which is
 *    what `fs:writeGuarded` shares.
 *  - `fs:startDrag` is the handler registered with no drag deps, so it runs
 *    `defaultDragOutDeps`.
 *  - `defaultOpenWithDeps` is the production export Open With is built from.
 *  - `baselineStore` is the production singleton; only `createBaselineStore`
 *    is caught, to read the deps it was handed.
 *
 * Each arm has its control: the SAME folder as a local row is admitted, so a
 * refusal here is the filter and not a broken fixture.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { Project } from '@shared/types';

const fake = vi.hoisted(() => ({
  projects: [] as Project[],
  dragged: [] as unknown[],
  baselineDeps: null as null | { listProjectRoots(): Promise<readonly string[]> }
}));

vi.mock('electron', () => ({
  app: {
    getPath: () => tmpdir(),
    getFileIcon: async () => ({ isEmpty: () => false })
  },
  shell: {
    trashItem: async () => undefined,
    showItemInFolder: () => undefined,
    openPath: async () => ''
  },
  nativeImage: { createFromDataURL: () => ({ isEmpty: () => false }) },
  BrowserWindow: { fromWebContents: () => null, getAllWindows: () => [] },
  dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) }
}));

// The one replaced dependency: the project list.
vi.mock('../../sessions', () => ({
  getGmuxCore: () => Promise.resolve({ listProjects: () => fake.projects })
}));

// The refusal log line is not this file's question, and the real one writes.
vi.mock('../../log', () => ({ logEvent: () => undefined }));

// Catch the deps the production singleton hands the store, and nothing else.
vi.mock('../../baselines/store', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../baselines/store')>();
  return {
    ...real,
    createBaselineStore: (deps: { listProjectRoots(): Promise<readonly string[]> }) => {
      fake.baselineDeps = deps;
      return {} as never;
    }
  };
});

const { localProjectRoots, localRootsOf } = await import('../project-roots');
const { registerFsIpc } = await import('../ipc');
const { defaultOpenWithDeps } = await import('../open-with');
const { fsPathRefusalOf } = await import('../paths');
const { baselineStore } = await import('../../baselines/ipc');
const { trustedInvokeEvent } = await import(
  '../../security/__tests__/trusted-test-sender'
);

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, Handler>();
const fakeIpc = {
  handle: (channel: string, fn: Handler) => {
    handlers.set(channel, fn);
  }
} as unknown as IpcMain;

function eventWithDrag(): IpcMainInvokeEvent {
  const event = trustedInvokeEvent();
  (event.sender as unknown as Record<string, unknown>)['startDrag'] = (item: unknown) => {
    fake.dragged.push(item);
  };
  return event;
}

async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const fn = handlers.get(channel);
  if (fn === undefined) throw new Error(`${channel} was never registered`);
  return (await fn(eventWithDrag(), ...args)) as T;
}

async function refusalWordOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    const word = fsPathRefusalOf(err);
    if (word === null) throw new Error(`the refusal carried no word: ${String(err)}`);
    return word;
  }
  throw new Error('expected a refusal, and the call was admitted');
}

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

let scratch = '';
let folder = '';

function remoteRow(path: string): Project {
  return { id: 'r-1', path, name: 'notes', machineId: 'macpro' };
}
function localRow(path: string): Project {
  return { id: 'l-1', path, name: 'notes' };
}

beforeEach(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), 'gmux-p336-local-roots-')));
  folder = join(scratch, 'notes');
  // A folder ON THIS MAC whose path a row on another machine also names.
  mkdirSync(folder);
  writeFileSync(join(folder, 'a.md'), 'old', 'utf8');
  fake.projects = [];
  fake.dragged.length = 0;
  handlers.clear();
  registerFsIpc(fakeIpc);
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('localRootsOf, the one filter', () => {
  it('keeps a row with no machine and a row on `local`, and nothing else', () => {
    expect(
      localRootsOf([
        { path: '/here/a' },
        { path: '/there/b', machineId: 'macpro' },
        { path: '/here/c', machineId: 'local' },
        { path: '/there/d', machineId: 'pop-os' },
        // A row nobody can place reads as another machine: the local gate
        // fails closed rather than open.
        { path: '/nowhere/e', machineId: '' }
      ])
    ).toEqual(['/here/a', '/here/c']);
  });

  it('keeps the order it was given, and answers nothing for nothing', () => {
    expect(localRootsOf([])).toEqual([]);
    expect(localRootsOf([{ path: '/z' }, { path: '/a' }])).toEqual(['/z', '/a']);
  });

  it('is what the production reader answers over the core list', async () => {
    fake.projects = [localRow('/here/a'), remoteRow('/there/b')];
    expect(await localProjectRoots()).toEqual(['/here/a']);
  });
});

describe('the guarded save and the file operations (defaultFileOpsDeps)', () => {
  it('refuses a folder on this Mac that only a row on another machine names, and writes nothing', async () => {
    fake.projects = [remoteRow(folder)];
    const result = await call<{ outcome: string; why?: string }>('fs:writeGuarded', {
      root: folder,
      path: join(folder, 'a.md'),
      expect: sha('old'),
      contents: 'new'
    });
    expect(result).toMatchObject({ outcome: 'refused', why: 'projectClosed' });
    expect(readFileSync(join(folder, 'a.md'), 'utf8')).toBe('old');
  });

  it('writes when the same folder is a local row (the control)', async () => {
    fake.projects = [localRow(folder)];
    const result = await call<{ outcome: string }>('fs:writeGuarded', {
      root: folder,
      path: join(folder, 'a.md'),
      expect: sha('old'),
      contents: 'new'
    });
    expect(result.outcome).toBe('wrote');
    expect(readFileSync(join(folder, 'a.md'), 'utf8')).toBe('new');
  });

  it('refuses a new file under a remote row and makes one under a local row', async () => {
    fake.projects = [remoteRow(folder)];
    expect(
      await refusalWordOf(call('fs:createFile', { root: folder, path: 'b.md' }))
    ).toBe('projectClosed');
    expect(existsSync(join(folder, 'b.md'))).toBe(false);
    fake.projects = [localRow(folder)];
    await call('fs:createFile', { root: folder, path: 'b.md' });
    expect(existsSync(join(folder, 'b.md'))).toBe(true);
  });
});

describe('the drag out (defaultDragOutDeps)', () => {
  it('refuses under a remote row and drags under a local row', async () => {
    fake.projects = [remoteRow(folder)];
    expect(
      await refusalWordOf(call('fs:startDrag', { root: folder, paths: [join(folder, 'a.md')] }))
    ).toBe('projectClosed');
    expect(fake.dragged).toHaveLength(0);
    fake.projects = [localRow(folder)];
    await call('fs:startDrag', { root: folder, paths: [join(folder, 'a.md')] });
    expect(fake.dragged).toHaveLength(1);
  });
});

describe('Open With (defaultOpenWithDeps)', () => {
  it('hands the local gate the folders on this Mac alone', async () => {
    fake.projects = [remoteRow(folder), localRow('/here/x')];
    expect(await defaultOpenWithDeps().listProjectRoots()).toEqual(['/here/x']);
    fake.projects = [localRow(folder)];
    expect(await defaultOpenWithDeps().listProjectRoots()).toEqual([folder]);
  });
});

describe('the Redline baseline store (baselineStore), the fourth reader', () => {
  it('hands the store the folders on this Mac alone', async () => {
    baselineStore();
    const deps = fake.baselineDeps;
    expect(deps).not.toBeNull();
    fake.projects = [remoteRow(folder), localRow('/here/x')];
    expect(await deps?.listProjectRoots()).toEqual(['/here/x']);
    fake.projects = [localRow(folder)];
    expect(await deps?.listProjectRoots()).toEqual([folder]);
  });
});
