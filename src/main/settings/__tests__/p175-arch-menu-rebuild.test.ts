/**
 * PHASE 175 — flipping the Architecture switch rebuilds the native menu.
 *
 * The CLAUDE.md menu rule says a phase that adds, renames or removes a user
 * facing surface updates the native menus in the same commit. This phase
 * makes three menu rows conditional, so the condition has to be re-read the
 * moment it changes or the menu bar states the world from before the flip
 * until something else happens to rebuild it, which used to be a hotkey edit
 * and nothing else.
 *
 * `settings:set` is the one door every write goes through, so this drives
 * that handler and counts rebuilds. The menu TEMPLATE itself is held by
 * src/main/__tests__/p175-arch-menu-flag.test.ts; this file is only about
 * whether the rebuild is asked for at all.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain } from 'electron';
import type { GmuxSettings, GmuxSettingsPatch } from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';

const rebuilds: number[] = [];
let settings: GmuxSettings = defaultGmuxSettings();

vi.mock('electron', () => ({}));
vi.mock('../../menu', () => ({
  rebuildAppMenu: () => {
    rebuilds.push(rebuilds.length + 1);
  }
}));
vi.mock('../store', () => ({
  getSettings: () => settings,
  updateSettings: (patch: GmuxSettingsPatch) => {
    settings = { ...settings, ...patch } as GmuxSettings;
    return settings;
  }
}));
vi.mock('../window', () => ({ openSettingsWindow: () => undefined }));
vi.mock('../../typed-events', () => ({ broadcastEvent: () => undefined }));
vi.mock('../../specstory', () => ({
  registerSpecStoryStatusIpc: () => undefined
}));
vi.mock('../../typed-ipc', () => ({
  handle: (
    ipc: { handlers: Map<string, unknown> },
    channel: string,
    fn: unknown
  ) => {
    ipc.handlers.set(channel, fn);
  }
}));

const { registerSettingsIpc } = await import('../ipc');

type SetHandler = (e: unknown, patch: GmuxSettingsPatch) => GmuxSettings;

/** Register against a fake ipcMain and hand back the settings:set body. */
function setHandler(): SetHandler {
  const handlers = new Map<string, unknown>();
  registerSettingsIpc({ handlers } as unknown as IpcMain);
  return handlers.get('settings:set') as SetHandler;
}

beforeEach(() => {
  rebuilds.length = 0;
  settings = defaultGmuxSettings();
});

describe('the Architecture switch rebuilds the menu', () => {
  it('rebuilds when the switch goes on', () => {
    const set = setHandler();
    set(null, { arch: { enabled: true, agentId: null, model: null } });
    expect(rebuilds).toHaveLength(1);
  });

  it('rebuilds when it goes off again', () => {
    settings = {
      ...settings,
      arch: { enabled: true, agentId: null, model: null }
    };
    const set = setHandler();
    set(null, { arch: { enabled: false, agentId: null, model: null } });
    expect(rebuilds).toHaveLength(1);
  });

  it('does NOT rebuild when only the harness pair moves', () => {
    const set = setHandler();
    set(null, { arch: { enabled: false, agentId: 'claude', model: 'm' } });
    expect(rebuilds).toHaveLength(0);
  });

  it('does NOT rebuild for a write that leaves arch alone', () => {
    const set = setHandler();
    set(null, { scrollbackLines: 12_000 });
    expect(rebuilds).toHaveLength(0);
  });

  it('still rebuilds for a hotkey edit, the Phase 10 trigger', () => {
    const set = setHandler();
    set(null, { hotkeys: { claude: 'Shift+Cmd+J' } });
    expect(rebuilds).toHaveLength(1);
  });

  it('rebuilds ONCE when a hotkey and the switch move together', () => {
    const set = setHandler();
    set(null, {
      hotkeys: { claude: 'Shift+Cmd+J' },
      arch: { enabled: true, agentId: null, model: null }
    });
    expect(rebuilds).toHaveLength(1);
  });
});
