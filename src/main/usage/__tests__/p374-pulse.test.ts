/**
 * The received row's one clock, in the registrar (Phase 374 D17).
 *
 * It is armed by a read that finds the switch on, it stops by itself, and the
 * disposal clears it. Everything below it is a fake: no Electron, no folder, no
 * network and no keychain.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  usage: { claude: false, codex: false, antigravity: true, bar: 'five-hour' },
  files: [] as { id: string; text: string; mtimeMs: number }[],
  mtime: 1 as number | null,
  listed: 0,
  cleared: 0,
  guards: 0,
  windows: [] as { isDestroyed(): boolean; isFocused(): boolean }[],
  told: [] as unknown[]
};

vi.mock('electron', () => ({
  app: { getPath: () => '/nowhere', setPath: () => undefined },
  BrowserWindow: { getAllWindows: () => state.windows }
}));
vi.mock('../../log', () => {
  const no = (): undefined => undefined;
  return { getLog: () => ({ error: no, warn: no, info: no, debug: no }) };
});
vi.mock('../../typed-events', () => ({
  broadcastEvent: (_channel: string, snapshot: unknown) => state.told.push(snapshot)
}));
vi.mock('../../typed-ipc', () => ({
  handle: (
    ipc: { handlers: Map<string, () => unknown> },
    channel: string,
    fn: () => unknown
  ) => ipc.handlers.set(channel, fn)
}));
vi.mock('../../settings/store', () => ({ getSettings: () => ({ usage: state.usage }) }));
vi.mock('../../activity/hooks', () => ({ claudeStatusLineState: () => 'off' }));
vi.mock('../../logins', () => ({
  loginsRoot: () => '/nowhere',
  effectiveLogin: () => ({ name: null, dir: null, fellBack: false, asked: null })
}));
vi.mock('../credentials', () => ({
  defaultCredentialDeps: () => ({
    keychain: async () => {
      throw new Error('a keychain was opened');
    },
    readText: async () => {
      throw new Error('a file was opened');
    },
    env: {},
    home: '/nowhere'
  }),
  readClaudeCredential: async () => {
    throw new Error('a credential was read');
  },
  readCodexCredential: async () => {
    throw new Error('a credential was read');
  }
}));
vi.mock('../transport', () => ({
  httpsTransport: async () => {
    throw new Error('a request was sent');
  }
}));
vi.mock('../antigravity/folder', () => ({
  listAntigravityFiles: () => {
    state.listed += 1;
    return state.files;
  },
  antigravityFolderMtime: () => state.mtime,
  antigravitySlotOpened: () => false,
  clearAntigravityUsage: () => {
    state.cleared += 1;
  }
}));
vi.mock('../antigravity/launch', () => ({ antigravityWaiting: () => 'session', clearAntigravityGuard: () => {
  state.guards += 1;
} }));

import {
  USAGE_PULSE_MS,
  disposeUsageService,
  registerUsageIpc,
  resetUsageServiceForTests,
  setUsageHarnessOverride,
  usagePulseArmed
} from '../ipc';
import { line } from './p374-receiver';

const START = Date.UTC(2031, 0, 10, 12, 0, 0);

function ask(channel: 'usage:read' | 'usage:refresh'): Promise<unknown> {
  const ipc = { handlers: new Map<string, () => unknown>() };
  registerUsageIpc(ipc as never);
  return ipc.handlers.get(channel)?.() as Promise<unknown>;
}

const focused = { isDestroyed: () => false, isFocused: () => true };
const behind = { isDestroyed: () => false, isFocused: () => false };
const gone = {
  isDestroyed: () => true,
  isFocused: () => {
    throw new Error('a destroyed window was asked');
  }
};

beforeEach(() => {
  vi.useFakeTimers({ now: START });
  resetUsageServiceForTests();
  state.usage = { claude: false, codex: false, antigravity: true, bar: 'five-hour' };
  state.files = [{ id: 's', text: line({ 'gemini-5h': { f: 0.75 } }), mtimeMs: START }];
  state.mtime = START;
  state.listed = 0;
  state.cleared = 0;
  state.guards = 0;
  state.windows = [gone, behind, focused];
  state.told = [];
});

afterEach(() => {
  resetUsageServiceForTests();
  vi.useRealTimers();
});

describe('the clock', () => {
  for (const channel of ['usage:read', 'usage:refresh'] as const) {
    it(`is armed by ${channel} while the switch is on, and once`, async () => {
      expect(usagePulseArmed()).toBe(false);
      await ask(channel);
      await ask(channel);
      expect(usagePulseArmed()).toBe(true);
      expect(vi.getTimerCount()).toBe(1);
    });
  }

  it('is not armed while the switch is off, and nothing is opened', async () => {
    state.usage.antigravity = false;
    await ask('usage:read');
    await ask('usage:refresh');
    expect(usagePulseArmed()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(state.listed + state.cleared).toBe(0);
  });

  it('tells the windows when a file moved, and only then', async () => {
    await ask('usage:read');
    vi.advanceTimersByTime(USAGE_PULSE_MS * 3);
    expect(state.told).toEqual([]);
    state.files = [
      { id: 's', text: line({ 'gemini-5h': { f: 0.5 } }), mtimeMs: START + 16_000 }
    ];
    state.mtime = START + 16_000;
    vi.advanceTimersByTime(USAGE_PULSE_MS);
    expect(state.told.length).toBe(1);
    expect(JSON.stringify(state.told[0])).toContain('"percent":50');
  });

  it('looks at nothing while no window is in front', async () => {
    await ask('usage:read');
    const listed = state.listed;
    state.windows = [gone, behind];
    vi.advanceTimersByTime(10 * 60_000);
    expect(state.listed).toBe(listed);
    expect(usagePulseArmed()).toBe(true);
  });

  it('stops by itself when the switch goes off, and clears the folder once', async () => {
    await ask('usage:read');
    state.usage = { ...state.usage, antigravity: false };
    vi.advanceTimersByTime(USAGE_PULSE_MS * 4);
    expect(usagePulseArmed()).toBe(false);
    expect(state.cleared).toBe(1);
  });

  it('forgets a bad start with the folder, and only then', async () => {
    await ask('usage:read');
    vi.advanceTimersByTime(USAGE_PULSE_MS);
    expect(state.guards).toBe(0);
    state.usage = { ...state.usage, antigravity: false };
    vi.advanceTimersByTime(USAGE_PULSE_MS * 4);
    expect([state.cleared, state.guards]).toEqual([1, 1]);
  });

  it('is cleared by the disposal, and a read after it is refused and arms nothing', async () => {
    await ask('usage:read');
    const listed = state.listed;
    await disposeUsageService();
    expect(usagePulseArmed()).toBe(false);
    await expect(ask('usage:read')).rejects.toThrow();
    expect(usagePulseArmed()).toBe(false);
    vi.advanceTimersByTime(10 * 60_000);
    expect(state.listed).toBe(listed);
  });

  it('does not outlive the service it looks at', async () => {
    await ask('usage:read');
    setUsageHarnessOverride(null);
    expect(usagePulseArmed()).toBe(false);
  });
});
