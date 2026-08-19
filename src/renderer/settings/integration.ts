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
 */

import { useEffect } from 'react';
import type { GmuxMenuExtras, MenuActionWithFind } from '@shared/ipc';
import type { LaunchableAgentKind } from '@shared/types';
import { errorPayload, errorText, nextOrdinal, useApp } from '../state/store';
import { keyDisplay } from '@shared/keymap';
import { defaultLaunchArgsFor } from './presets';
import { registerP94CreateDrive } from './p94-create-drive';
import { useSettingsStore } from './settings-store';

const LAUNCH_PREFIX = 'launch-agent:';

// PHASE 94 FIX ROUND. One function on `window` and nothing else, so the harness
// can drive this surface in the real app. It is registered here rather than in
// the shell because this is the file the drive is about. See the drive's own
// header for what it measures and for what it does not.
registerP94CreateDrive();

/** Hand the keyboard to the visible terminal (same gesture as the shell). */
function focusTerminal(): void {
  document
    .querySelector<HTMLTextAreaElement>('.gmux-terminal-mount textarea')
    ?.focus();
}

/**
 * One per-agent hotkey press (Phase 94, item 2: exported so it can be driven).
 *
 * The hook below is the only caller in the product. It is exported because the
 * hook cannot be run outside React, and this surface is the one that composed
 * its own create payload and started a session on this Mac from a tab whose
 * files are on another computer. A test that only drives the store proves the
 * rule and not the surface, so `src/renderer/settings/__tests__/
 * p94-hotkey-create.test.ts` drives this function and reads what crossed the
 * bridge.
 */
export async function launchAgent(agentId: string): Promise<void> {
  const s = useApp.getState();
  const project = s.activeProject();
  if (!project) {
    s.toast('info', `Open a project first (${keyDisplay('project.open')})`);
    return;
  }
  if (s.bootBlock !== null || !window.gmux) return;

  const name = `${agentId}-${nextOrdinal(s.projectSessions(), agentId)}`;
  const extraArgs = defaultLaunchArgsFor(agentId);
  try {
    // PHASE 94, ITEM 2. THIS GOES THROUGH THE STORE'S OWN `createSession`.
    //
    // It used to call the bridge directly and compose its own payload. That
    // payload named no machine and did not say which machine the tab's folder
    // is on, so a hotkey pressed inside a tab whose files are on another
    // computer started a process on THIS Mac, in a folder only that computer
    // has. Neither the store's tab machine rule nor main's own backstop could
    // read anything, because neither field was sent.
    //
    // `createSession` is the one composer every other create surface uses. It
    // sends the tab's machine, it sends `projectMachineId`, it refuses with a
    // sentence when that machine cannot hold a session, and it sets the active
    // session. So this function now decides only the two things that are its
    // own, being the name and the Settings launch flags.
    //
    // The store's `agent` field takes any launchable registry id. The narrower
    // v1 cast this call used to carry is gone with the payload it belonged to.
    const created = await s.createSession({
      name,
      agent: agentId as LaunchableAgentKind,
      ...(extraArgs.length > 0 ? { extraArgs } : {})
    });
    // A refused create started nothing and has already said why, so the
    // keyboard stays where the person left it.
    if (!created) return;
    requestAnimationFrame(focusTerminal);
  } catch (err) {
    const payload = errorPayload(err);
    if (payload?.code === 'AGENT_NOT_FOUND') {
      s.toast(
        'error',
        `${payload.message} Check Settings → Agents (${keyDisplay('app.settings')}).`,
        { sticky: true }
      );
    } else {
      s.toast('error', errorText(err), { sticky: true });
    }
  }
}

/** Mounted once by the app shell. */
export function useSettingsIntegration(): void {
  const init = useSettingsStore((s) => s.init);
  useEffect(() => init(), [init]);

  useEffect(() => {
    const bridge = window.gmux as
      | (typeof window.gmux & GmuxMenuExtras)
      | undefined;
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
