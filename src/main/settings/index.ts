/**
 * Settings domain barrel (Phase 10 S13) — userData JSON store, the
 * single-instance Settings window, and the one IPC registration point.
 *
 * NOTE for importers inside main: src/main/menu.ts must import from
 * './settings/store' and './settings/window' DIRECTLY (not this barrel) —
 * the barrel re-exports ./ipc which imports menu.ts (rebuildAppMenu), and
 * going through the barrel would close that cycle.
 */

export {
  applySettingsPatch,
  getSettings,
  getSettingsWindowBounds,
  isValidHotkeyAccelerator,
  onSettingsUpdated,
  sanitizeSettings,
  saveSettingsWindowBounds,
  updateSettings,
  type SettingsWindowBounds
} from './store';
export {
  closeSettingsWindowIfFocused,
  isSettingsWindow,
  openSettingsWindow
} from './window';
export { getFlagCatalogViews, registerSettingsIpc } from './ipc';
