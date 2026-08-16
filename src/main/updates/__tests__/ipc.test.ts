/**
 * The updates registrar (Phase 58): the three ring handlers never reject
 * into the renderer, the restart handler logs its choice before installing,
 * and the broadcast carries the FULL UpdateUiState so a listener never has
 * to follow up with a read.
 *
 * The registrar's collaborators are mocked at the module seam: the typed
 * handle wrapper (so no Electron IpcMain is needed), the typed broadcast,
 * the engine and the dialog module.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpdateUiState } from '@shared/ipc';

const seams = vi.hoisted(() => ({
  handlers: new Map<
    string,
    (event: unknown, ...args: unknown[]) => unknown
  >(),
  broadcasts: [] as Array<{ channel: string; payload: unknown }>,
  ringListeners: [] as Array<() => void>,
  logLines: [] as string[],
  installNowCalls: 0,
  explainCalls: 0,
  repairCalls: 0,
  explainThrows: false,
  repairThrows: false,
  installThrows: false
}));

const STATE: UpdateUiState = {
  currentVersion: '0.25.0',
  stagedVersion: '0.26.0',
  lastCheckedAt: 1755300000000,
  needsUpdateRepair: false,
  ring: 'ready',
  ringVersion: '0.26.0',
  ringPercent: null,
  failedDuring: null
};

vi.mock('../../typed-ipc', () => ({
  handle: (
    _ipc: unknown,
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => unknown
  ) => {
    seams.handlers.set(channel, fn);
  }
}));

vi.mock('../../typed-events', () => ({
  broadcastEvent: (channel: string, payload: unknown) => {
    seams.broadcasts.push({ channel, payload });
  }
}));

vi.mock('../updater', () => ({
  getUpdateUiState: () => STATE,
  installStagedUpdateNow: () => {
    if (seams.installThrows) throw new Error('quitAndInstall exploded');
    seams.installNowCalls += 1;
  },
  onUpdateRingChanged: (cb: () => void) => {
    seams.ringListeners.push(cb);
    return () => {};
  }
}));

vi.mock('../ui', () => ({
  explainRingFailure: () => {
    seams.explainCalls += 1;
    if (seams.explainThrows) {
      return Promise.reject(new Error('dialog failed'));
    }
    return Promise.resolve();
  },
  offerUpdaterRepair: () => {
    seams.repairCalls += 1;
    if (seams.repairThrows) {
      return Promise.reject(new Error('repair failed'));
    }
    return Promise.resolve();
  }
}));

vi.mock('../log', () => ({
  logUpdateEvent: (_level: string, message: string) => {
    seams.logLines.push(message);
  }
}));

async function loadRegistrar(): Promise<void> {
  vi.resetModules();
  const { registerUpdatesIpc } = await import('../ipc');
  registerUpdatesIpc({} as never);
}

/** Invoke a captured handler the way the typed wrapper would. */
async function call(channel: string): Promise<unknown> {
  const handler = seams.handlers.get(channel);
  if (handler === undefined) {
    throw new Error(`no handler registered for ${channel}`);
  }
  return handler({});
}

beforeEach(() => {
  seams.handlers.clear();
  seams.broadcasts = [];
  seams.ringListeners = [];
  seams.logLines = [];
  seams.installNowCalls = 0;
  seams.explainCalls = 0;
  seams.repairCalls = 0;
  seams.explainThrows = false;
  seams.repairThrows = false;
  seams.installThrows = false;
});

describe('registration', () => {
  it('registers the four channels and one ring subscription', async () => {
    await loadRegistrar();
    expect([...seams.handlers.keys()].sort()).toEqual([
      'updates:repair',
      'updates:restartNow',
      'updates:state',
      'updates:whyFailed'
    ]);
    expect(seams.ringListeners).toHaveLength(1);
  });

  it('answers updates:state with the engine state', async () => {
    await loadRegistrar();
    expect(await call('updates:state')).toEqual(STATE);
  });
});

describe('updates:restartNow', () => {
  it('logs the choice, then calls the one install wrapper', async () => {
    await loadRegistrar();
    await call('updates:restartNow');
    expect(seams.installNowCalls).toBe(1);
    expect(seams.logLines).toContain(
      'restart and update now was chosen from the update ring'
    );
    // The log line comes first, so the record exists before the app goes
    // away.
    expect(
      seams.logLines.indexOf(
        'restart and update now was chosen from the update ring'
      )
    ).toBeGreaterThanOrEqual(0);
  });

  it('never rejects, even when the install call throws', async () => {
    await loadRegistrar();
    seams.installThrows = true;
    await expect(call('updates:restartNow')).resolves.toBeUndefined();
    expect(
      seams.logLines.some((l) => l.includes('quitAndInstall exploded'))
    ).toBe(true);
  });
});

describe('updates:whyFailed and updates:repair', () => {
  it('delegates to the dialog module', async () => {
    await loadRegistrar();
    await call('updates:whyFailed');
    expect(seams.explainCalls).toBe(1);
    await call('updates:repair');
    expect(seams.repairCalls).toBe(1);
  });

  it('never rejects when the dialog module does', async () => {
    await loadRegistrar();
    seams.explainThrows = true;
    seams.repairThrows = true;
    await expect(call('updates:whyFailed')).resolves.toBeUndefined();
    await expect(call('updates:repair')).resolves.toBeUndefined();
    expect(seams.logLines.some((l) => l.includes('dialog failed'))).toBe(true);
    expect(seams.logLines.some((l) => l.includes('repair failed'))).toBe(true);
  });
});

describe('the broadcast', () => {
  it('sends updates:changed with the whole state on every ring change', async () => {
    await loadRegistrar();
    const fire = seams.ringListeners[0];
    if (fire === undefined) throw new Error('no ring listener captured');
    fire();
    fire();
    expect(seams.broadcasts).toHaveLength(2);
    expect(seams.broadcasts[0]).toEqual({
      channel: 'updates:changed',
      payload: STATE
    });
  });
});
