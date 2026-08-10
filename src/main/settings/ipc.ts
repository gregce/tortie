/**
 * Settings IPC (Phase 10 S13) — settings:get / settings:set /
 * settings:openWindow / agents:flagPresets.
 *
 * settings:set persists the patch, rebuilds the native menu when hotkeys
 * changed (accelerators live on Session-menu items — src/main/menu.ts), and
 * broadcasts EVT_SETTINGS_CHANGED to EVERY window so the main window's
 * ⌘T-modal defaults and the Settings window stay in lockstep.
 */

import { BrowserWindow } from 'electron';
import type { IpcMain } from 'electron';
import { EVT_SETTINGS_CHANGED } from '@shared/ipc';
import type {
  AgentFlagCatalogs,
  AgentFlagCatalogView,
  GmuxSettings,
  GmuxSettingsPatch
} from '@shared/settings';
import type { LaunchableAgentId } from '@shared/types';
import { AGENT_FLAG_PRESETS } from '../agents/flags';
import { rebuildAppMenu } from '../menu';
import { getSettings, updateSettings } from './store';
import { openSettingsWindow } from './window';

// ---------------------------------------------------------------------------
// Flag catalogs → renderer-safe views (static per build; renderers cache)
// ---------------------------------------------------------------------------

let catalogViews: AgentFlagCatalogs | null = null;

/** The flag catalogs (src/main/agents/flags.ts) as wire views. */
export function getFlagCatalogViews(): AgentFlagCatalogs {
  if (catalogViews !== null) return catalogViews;
  const views: AgentFlagCatalogs = {};
  for (const [id, catalog] of Object.entries(AGENT_FLAG_PRESETS)) {
    const agentId = id as LaunchableAgentId;
    const view: AgentFlagCatalogView = {
      agentId,
      binary: catalog.binary,
      helpVerifiedVersion: catalog.helpVerifiedVersion,
      presets: catalog.presets.map((p) => ({
        flag: p.flag,
        label: p.label,
        description: p.description,
        danger: p.danger,
        verified: p.provenance === 'VERIFIED'
      }))
    };
    views[agentId] = view;
  }
  catalogViews = views;
  return views;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

function broadcastSettings(settings: GmuxSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(EVT_SETTINGS_CHANGED, settings);
    }
  }
}

/** Did the patch change the persisted hotkey map? (menu rebuild trigger) */
function hotkeysChanged(before: GmuxSettings, after: GmuxSettings): boolean {
  return JSON.stringify(before.hotkeys) !== JSON.stringify(after.hotkeys);
}

export function registerSettingsIpc(ipc: IpcMain): void {
  ipc.handle('settings:get', () => getSettings());

  ipc.handle('settings:set', (_e, patch: GmuxSettingsPatch) => {
    const before = getSettings();
    const next = updateSettings(patch);
    if (hotkeysChanged(before, next)) {
      // Accelerators are Session-menu items — the menu is the source of
      // nativeness (S13 Hotkeys). Rebuild picks up the new chord map.
      rebuildAppMenu();
    }
    broadcastSettings(next);
    return next;
  });

  ipc.handle('settings:openWindow', () => {
    openSettingsWindow();
  });

  ipc.handle('agents:flagPresets', () => getFlagCatalogViews());
}
