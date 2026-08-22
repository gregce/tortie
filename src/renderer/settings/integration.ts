/**
 * Main-window integration for the settings stream (S13 Hotkeys):
 *
 *  - keeps the shared settings store warm (⌘T modal defaults, presets);
 *  - handles `launch-agent:<id>` menu actions — the native Session-menu
 *    items whose accelerators the user recorded in Settings → Hotkeys.
 *    Pressing one creates `<agent>-<n>` in the ACTIVE project's root with
 *    the agent's Settings launch-default flags applied, and focuses it
 *    (§6.2 quick-create path, DESIGN-SPEC S13).
 *
 * Mounted once from App (useSettingsIntegration). The Settings window never
 * mounts this — it has no app store.
 *
 * PHASE 123. `launchAgent` itself moved to launch-agent.ts. The drive below
 * needs that function and this file needs the drive registered, and those are
 * two different needs. Splitting them ended a runtime import cycle. The
 * registration call still runs at module scope from this file, on the same
 * line, so nothing starts at a different moment than it did.
 */

import { useEffect } from 'react';
import type { MenuActionWithFind } from '@shared/ipc';
import { launchAgent } from './launch-agent';
import { registerP94CreateDrive } from './p94-create-drive';
import { useSettingsStore } from './settings-store';
import { gmuxBridge } from '../bridge';

const LAUNCH_PREFIX = 'launch-agent:';

// PHASE 94 FIX ROUND. One function on `window` and nothing else, so the harness
// can drive this surface in the real app. It is registered here rather than in
// the shell because this is the file the drive is about. See the drive's own
// header for what it measures and for what it does not.
registerP94CreateDrive();

/** Mounted once by the app shell. */
export function useSettingsIntegration(): void {
  const init = useSettingsStore((s) => s.init);
  useEffect(() => init(), [init]);

  useEffect(() => {
    const bridge = gmuxBridge();
    if (typeof bridge?.onMenuAction !== 'function') return;
    // Second EVT_MENU_ACTION subscription (the shell owns the first) —
    // each handles disjoint action ids, so there is no double-handling.
    return bridge.onMenuAction((action: MenuActionWithFind) => {
      const raw = action as string;
      if (!raw.startsWith(LAUNCH_PREFIX)) return;
      void launchAgent(raw.slice(LAUNCH_PREFIX.length));
    });
  }, []);
}
