/**
 * The one `overview:*` registrar (Phase 137).
 *
 * Electron, the store and the service are faked at their seams, so these
 * tests prove the wiring: the two channels register exactly once, the store
 * opens lazily at `<userData>/gmux/overview.db` on the first read and is
 * shared by both channels, and the disposer closes it once, never throws,
 * and leaves a clean slate for a fresh open.
 */

import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { ManifestStore } from '../../manifest';
import type { OverviewServiceDeps } from '../service';

const seams = vi.hoisted(() => ({
  getPath: vi.fn(() => '/fake/userData'),
  openOverviewStore: vi.fn(),
  projectOverview: vi.fn(),
  sessionsOverview: vi.fn()
}));

vi.mock('electron', () => ({ app: { getPath: seams.getPath } }));
vi.mock('../store', () => ({ openOverviewStore: seams.openOverviewStore }));
vi.mock('../service', () => ({
  projectOverview: seams.projectOverview,
  sessionsOverview: seams.sessionsOverview
}));
vi.mock('../../security/trusted-window', () => ({
  assertTrustedIpcSender: () => undefined
}));

const { disposeOverviewIpc, registerOverviewIpc } = await import('../ipc');

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

function fakeIpc(): { ipc: IpcMain; handlers: Map<string, Handler> } {
  const handlers = new Map<string, Handler>();
  const ipc = {
    handle: (channel: string, fn: Handler) => {
      if (handlers.has(channel)) throw new Error(`${channel} registered twice`);
      handlers.set(channel, fn);
    }
  } as unknown as IpcMain;
  return { ipc, handlers };
}

const EVENT = {} as IpcMainInvokeEvent;

function fakeStore(): { close: ReturnType<typeof vi.fn> } {
  return { close: vi.fn() };
}

const manifestGetter = (): Promise<ManifestStore> =>
  Promise.resolve({} as ManifestStore);

/** The deps object the registrar handed the service on its last call. */
function lastDeps(): OverviewServiceDeps {
  const call = seams.projectOverview.mock.calls.at(-1);
  return call?.[0] as OverviewServiceDeps;
}

beforeEach(() => {
  disposeOverviewIpc();
  seams.getPath.mockClear();
  seams.openOverviewStore.mockReset();
  seams.projectOverview.mockReset();
  seams.projectOverview.mockResolvedValue({ sessions: [] });
  seams.sessionsOverview.mockReset();
  seams.sessionsOverview.mockResolvedValue({ sessions: [] });
});

describe('registerOverviewIpc', () => {
  it('registers exactly the six channels, and all six READ', () => {
    const { ipc, handlers } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter);
    expect([...handlers.keys()].sort()).toEqual([
      // Phase 138 added the fold option list. Answering it reads the agent
      // table and the confirm gate and starts nothing. Phase 143 added the
      // last two. They read the summary chain and the turns behind one row,
      // and they write nothing. Phase 158 added the arch option list, the
      // same join over the arch recipe table, and it reads too.
      'arch:options',
      'fold:options',
      'overview:project',
      'overview:sessions',
      'overview:timeline',
      'overview:timelineTurns'
    ]);
  });

  it('answers fold:options without opening the store', async () => {
    const { ipc, handlers } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter);
    const out = await handlers.get('fold:options')?.(EVENT);
    expect(out).toHaveProperty('harnesses');
    expect(seams.openOverviewStore).not.toHaveBeenCalled();
  });

  it('carries the suspension sentence the caller handed it', async () => {
    const { ipc, handlers } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter, () => 'Folding is paused.');
    const out = (await handlers.get('fold:options')?.(EVENT)) as {
      suspended: string | null;
    };
    expect(out.suspended).toBe('Folding is paused.');
  });

  // -------------------------------------------------------------------------
  // The person's choice reaches the READ path (Phase 138, the fix round)
  // -------------------------------------------------------------------------

  it('hands the service the choice getter it was given', async () => {
    let chosen = true;
    const { ipc, handlers } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter, () => null, () => chosen);
    await handlers.get('overview:project')?.(EVENT, { projectPath: '/p' });
    const deps = lastDeps();
    expect(deps.foldChosen?.()).toBe(true);
    // It is a function rather than a value, so a person who picks None while
    // the page is open is read on the next call rather than on the next launch.
    chosen = false;
    expect(deps.foldChosen?.()).toBe(false);
  });

  it('answers that nothing is chosen when the caller passes no getter', async () => {
    const { ipc, handlers } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter);
    await handlers.get('overview:project')?.(EVENT, { projectPath: '/p' });
    expect(lastDeps().foldChosen?.()).toBe(false);
  });

  it('opens no store at registration', () => {
    const { ipc } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter);
    expect(seams.openOverviewStore).not.toHaveBeenCalled();
  });

  it('routes each channel to its service call with the input intact', async () => {
    const { ipc, handlers } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter);
    await handlers.get('overview:project')?.(EVENT, { projectPath: '/p' });
    expect(seams.projectOverview).toHaveBeenCalledWith(expect.anything(), {
      projectPath: '/p'
    });
    await handlers.get('overview:sessions')?.(EVENT, {
      projectPath: '/p',
      sessionIds: ['S1']
    });
    expect(seams.sessionsOverview).toHaveBeenCalledWith(expect.anything(), {
      projectPath: '/p',
      sessionIds: ['S1']
    });
  });

  it('opens the store once, under the protected gmux directory, for both channels', async () => {
    const store = fakeStore();
    seams.openOverviewStore.mockReturnValue(store);
    const { ipc, handlers } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter);
    await handlers.get('overview:project')?.(EVENT, { projectPath: '/p' });
    const deps = lastDeps();
    const first = deps.store();
    const second = deps.store();
    expect(first).toBe(store);
    expect(second).toBe(store);
    expect(seams.openOverviewStore).toHaveBeenCalledTimes(1);
    expect(seams.openOverviewStore).toHaveBeenCalledWith(
      join('/fake/userData', 'gmux', 'overview.db')
    );
  });
});

describe('disposeOverviewIpc', () => {
  it('closes an open store once and is quiet the second time', async () => {
    const store = fakeStore();
    seams.openOverviewStore.mockReturnValue(store);
    const { ipc, handlers } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter);
    await handlers.get('overview:project')?.(EVENT, { projectPath: '/p' });
    lastDeps().store();
    disposeOverviewIpc();
    disposeOverviewIpc();
    expect(store.close).toHaveBeenCalledTimes(1);
  });

  it('does nothing before any open', () => {
    expect(() => disposeOverviewIpc()).not.toThrow();
    expect(seams.openOverviewStore).not.toHaveBeenCalled();
  });

  it('swallows a close that throws and still resets for a fresh open', async () => {
    const failing = { close: vi.fn(() => { throw new Error('busy'); }) };
    const replacement = fakeStore();
    seams.openOverviewStore
      .mockReturnValueOnce(failing)
      .mockReturnValueOnce(replacement);
    const { ipc, handlers } = fakeIpc();
    registerOverviewIpc(ipc, manifestGetter);
    await handlers.get('overview:project')?.(EVENT, { projectPath: '/p' });
    const deps = lastDeps();
    deps.store();
    expect(() => disposeOverviewIpc()).not.toThrow();
    expect(deps.store()).toBe(replacement);
    expect(seams.openOverviewStore).toHaveBeenCalledTimes(2);
  });
});
