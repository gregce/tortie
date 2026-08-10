/**
 * Settings surface barrel (S13, Phase 10 settings+hotkeys stream).
 *
 * MAIN-WINDOW consumers import from here:
 *  - useSettingsIntegration — mount once in App: warms the settings store
 *    and handles the per-agent hotkey menu actions (launch-agent:<id>).
 *  - useAgentPresetOptions / defaultLaunchArgsFor / defaultAgentId — the
 *    SHARED SELECTOR for the ⌘T modal's Options group and every no-modal
 *    create path (quick-create buttons, hotkeys). The modal builder renders
 *    toggles from useAgentPresetOptions(agentId) with `defaultOn`
 *    pre-checked and passes the user's final choice as extraArgs.
 *
 * The Settings WINDOW (own BrowserWindow) boots from ./main.tsx and never
 * imports the app store.
 */

export {
  agentPresetOptions,
  defaultAgentId,
  defaultLaunchArgsFor,
  useAgentPresetOptions,
  type AgentPresetOption
} from './presets';
export { useSettingsIntegration } from './integration';
export { useSettingsStore } from './settings-store';
export {
  acceleratorToDisplay,
  eventToAccelerator,
  normalizeAccelerator,
  validateChord
} from './chords';
