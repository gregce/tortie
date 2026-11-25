/**
 * Phase 375, `usage:account` (build/p375/SPEC.md §7.1 row B5, D10): the
 * address Settings draws, answered from what main already holds.
 *
 * The service is a COUNTING FAKE, so the row can say that answering built
 * nothing and asked nothing: no read, no refresh, no pulse, no folder, no
 * keychain, no request. Every address is invented.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsageProviderSnapshot, UsageSnapshot } from '@shared/usage';
import { emptyUsageProvider } from '@shared/usage';

const state = vi.hoisted(() => ({
  usage: { claude: false, codex: false, antigravity: true, bar: 'five-hour' } as Record<string, unknown>,
  built: 0,
  calls: [] as string[],
  row: null as Record<string, unknown> | null
}));

vi.mock('electron', () => ({
  app: { getPath: () => '/nowhere', setPath: () => undefined },
  BrowserWindow: { getAllWindows: () => [] }
}));
vi.mock('../../log', () => {
  const no = (): undefined => undefined;
  return { getLog: () => ({ error: no, warn: no, info: no, debug: no }) };
});
vi.mock('../../typed-events', () => ({ broadcastEvent: () => undefined }));
vi.mock('../../typed-ipc', () => ({
  handle: (ipc: { handlers: Map<string, () => unknown> }, channel: string, fn: () => unknown) => ipc.handlers.set(channel, fn)
}));
vi.mock('../../settings/store', () => ({ getSettings: () => ({ usage: state.usage }) }));
vi.mock('../../activity/hooks', () => ({ claudeStatusLineState: () => 'off' }));
vi.mock('../../logins', () => ({
  loginsRoot: () => {
    state.calls.push('logins');
    return '/nowhere';
  },
  effectiveLogin: () => {
    state.calls.push('logins');
    return { name: null, dir: null, fellBack: false, asked: null };
  }
}));
vi.mock('../credentials', () => ({ defaultCredentialDeps: () => ({ env: {}, home: '/nowhere' }) }));
vi.mock('../transport', () => ({ httpsTransport: async () => { throw new Error('a request was sent'); } }));
vi.mock('../antigravity/folder', () => {
  const no = (what: string) => (): never => {
    state.calls.push(what);
    throw new Error(`the folder was asked to ${what}`);
  };
  return { listAntigravityFiles: no('list'), antigravityFolderMtime: no('mtime'), antigravitySlotOpened: () => false, clearAntigravityUsage: no('clear') };
});
vi.mock('../antigravity/launch', () => ({ antigravityWaiting: () => 'session', clearAntigravityGuard: () => undefined }));
vi.mock('../service', () => ({
  createUsageService: () => {
    state.built += 1;
    const snapshot = (): UsageSnapshot => ({
      at: 1,
      providers: [
        { ...emptyUsageProvider('claude'), email: 'claude.p375@example.invalid' } as UsageProviderSnapshot,
        emptyUsageProvider('codex'),
        (state.row ?? emptyUsageProvider('antigravity')) as unknown as UsageProviderSnapshot
      ]
    });
    return {
      read: async () => {
        state.calls.push('read');
        return snapshot();
      },
      refresh: async () => {
        state.calls.push('refresh');
        return snapshot();
      },
      current: () => {
        state.calls.push('current');
        return snapshot();
      },
      pulse: () => {
        state.calls.push('pulse');
        return false;
      },
      applyTap: () => 'applied',
      shutdown: async () => ({ cancelled: 0, children: 0, joined: true, waitedMs: 0 })
    };
  }
}));

const { disposeUsageService, registerUsageIpc, resetUsageServiceForTests, usagePulseArmed } = await import('../ipc');

const ipc = { handlers: new Map<string, () => unknown>() };
registerUsageIpc(ipc as never);
const ask = (channel: string): Promise<unknown> => ipc.handlers.get(channel)?.() as Promise<unknown>;

const A = 'held.p375@example.invalid';

beforeEach(() => {
  resetUsageServiceForTests();
  state.usage = { claude: false, codex: false, antigravity: true, bar: 'five-hour' };
  state.built = 0;
  state.calls = [];
  state.row = { ...emptyUsageProvider('antigravity', 'ok'), email: A };
});

describe('B5: usage:account', () => {
  it('B5: is registered beside the other three', () => {
    expect([...ipc.handlers.keys()].sort()).toEqual(['usage:account', 'usage:read', 'usage:refresh', 'usage:statusLine']);
  });

  it('B5: answers null before any service, and building one is not how it answers', async () => {
    expect(await ask('usage:account')).toBeNull();
    expect([state.built, state.calls]).toEqual([0, []]);
  });

  it('B5: answers the held address once a read built the service, and asks it nothing but current()', async () => {
    await ask('usage:read');
    state.calls = [];
    expect(await ask('usage:account')).toBe(A);
    expect(await ask('usage:account')).toBe(A);
    expect([state.built, state.calls]).toEqual([1, ['current', 'current']]);
  });

  it('B5: never answers another row’s field, and never an address that does not pass the shape', async () => {
    await ask('usage:read');
    state.row = { ...emptyUsageProvider('antigravity', 'ok') };
    expect(await ask('usage:account')).toBeNull();
    for (const bad of ['a"b@example.invalid', 'pérson@example.invalid', 7, `a@${'d'.repeat(237)}.example.invalid`]) {
      state.row = { ...emptyUsageProvider('antigravity', 'ok'), email: bad };
      expect([bad, await ask('usage:account')]).toEqual([bad, null]);
    }
  });

  it('B5: answers null while the switch is off, whatever is still held', async () => {
    await ask('usage:read');
    state.usage = { claude: false, codex: false, antigravity: false, bar: 'five-hour' };
    state.calls = [];
    expect(await ask('usage:account')).toBeNull();
    for (const off of [undefined, 1, 'true']) {
      state.usage = { claude: false, codex: false, antigravity: off, bar: 'five-hour' };
      expect(await ask('usage:account')).toBeNull();
    }
    expect(state.calls).toEqual([]);
  });

  it('B5: answers null after shutdown admission, and builds nothing to say so', async () => {
    await ask('usage:read');
    await disposeUsageService();
    state.calls = [];
    expect(await ask('usage:account')).toBeNull();
    expect([state.built, state.calls]).toEqual([1, []]);
  });

  it('B5: arms no clock and lists no folder', async () => {
    state.usage = { claude: false, codex: false, antigravity: true, bar: 'five-hour' };
    for (let i = 0; i < 3; i += 1) await ask('usage:account');
    expect(usagePulseArmed()).toBe(false);
    expect(state.calls.filter((c) => ['list', 'mtime', 'clear', 'logins', 'read', 'refresh', 'pulse'].includes(c))).toEqual([]);
  });
});
