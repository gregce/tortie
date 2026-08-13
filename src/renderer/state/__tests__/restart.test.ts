/**
 * Restart, from the renderer's side (Phase 19 item 8).
 *
 * Two things are asserted, and the second one exists because the first one is
 * not enough on its own. The store must prefer the single main-side call,
 * because that is the only path that carries the launch flags. And when it is
 * running against an older preload that has no such call, its own fallback
 * must still create before it discards, because the whole defect was that
 * order.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Every bridge call the store made, in order. */
let calls: string[] = [];
let createFails: Error | null = null;
let hasRestart = true;

interface CreateArgs {
  name: string;
  projectPath: string;
  cwd?: string;
  agent: string;
  capture?: boolean;
}

const created: CreateArgs[] = [];

function installGlobals(): void {
  const sessions: Record<string, unknown> = {
    create: (input: CreateArgs) => {
      calls.push('create');
      created.push(input);
      if (createFails !== null) return Promise.reject(createFails);
      return Promise.resolve({ id: 'new-1', ...input });
    },
    discard: (_id: string) => {
      calls.push('discard');
      return Promise.resolve();
    },
    list: () => Promise.resolve([])
  };
  sessions['restart'] = (_id: string) => {
    calls.push('restart');
    if (!hasRestart) throw new Error('restart is not on this bridge');
    return Promise.resolve({ id: 'new-1', name: 'auth' });
  };
  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    gmux: { sessions }
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem() {},
    removeItem() {}
  });
  vi.stubGlobal('document', {
    body: { classList: { add() {}, remove() {}, contains: () => false } }
  });
}

installGlobals();

const { useApp } = await import('../store');

const SESSION = {
  id: 'sess-1',
  name: 'auth',
  tmuxName: 'auth',
  projectPath: '/repo',
  cwd: '/repo/api',
  agent: 'claude',
  status: 'exited',
  createdAt: 0
};

beforeEach(() => {
  calls = [];
  created.length = 0;
  createFails = null;
  hasRestart = true;
  useApp.setState({
    projects: [{ id: 'proj-1', name: 'repo', path: '/repo' }],
    activeProjectId: 'proj-1',
    sessions: [SESSION],
    toasts: []
  } as never);
});

describe('with the main-side restart on the bridge', () => {
  it('makes exactly one call and never discards from here', async () => {
    await useApp.getState().restartSession('sess-1');
    expect(calls).toEqual(['restart']);
  });
});

describe('the fallback, against a preload that has no restart', () => {
  beforeEach(() => {
    const gmux = (window as unknown as { gmux: { sessions: Record<string, unknown> } })
      .gmux;
    delete gmux.sessions['restart'];
  });

  it('creates the replacement BEFORE it discards the original', async () => {
    await useApp.getState().restartSession('sess-1');
    expect(calls).toEqual(['create', 'discard']);
  });

  it('discards nothing when the create fails', async () => {
    createFails = new Error('claude not found');
    await useApp.getState().restartSession('sess-1');
    expect(calls).toEqual(['create']);
    expect(useApp.getState().toasts[0]?.text).toContain('claude not found');
  });

  it('carries the capture choice, which is the one setting it can see', async () => {
    useApp.setState({
      sessions: [
        {
          ...SESSION,
          capture: {
            provider: 'claude',
            bin: '/opt/specstory',
            exitCodeApproximate: false
          }
        }
      ]
    } as never);
    await useApp.getState().restartSession('sess-1');
    expect(created[0]?.capture).toBe(true);
  });

  it('omits the capture key when the original was not captured', async () => {
    await useApp.getState().restartSession('sess-1');
    expect(created[0] && 'capture' in created[0]).toBe(false);
  });
});
