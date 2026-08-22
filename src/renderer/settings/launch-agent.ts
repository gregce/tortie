/**
 * One per-agent hotkey press, being the function the `launch-agent:<id>` menu
 * action calls.
 *
 * PHASE 123. This lived in integration.ts, and p94-create-drive.ts imported it
 * back from there while integration.ts imported the drive's registration. That
 * was a runtime import cycle of two modules, and the new graph gate refuses it.
 * Two callers want two different things from that file. The menu handler wants
 * the drive registered at module scope, and the drive wants this one function.
 * Each need has its own module now, and no load order changed: integration.ts
 * still calls `registerP94CreateDrive()` at module scope, from the same line it
 * always did.
 *
 * The body below is the body that was there. Nothing about what it does moved.
 */

import type { LaunchableAgentKind } from '@shared/types';
import { keyDisplay } from '@shared/keymap';
import { errorPayload, errorText, nextOrdinal, useApp } from '../state/store';
import { defaultLaunchArgsFor } from './presets';

/** Hand the keyboard to the visible terminal (same gesture as the shell). */
function focusTerminal(): void {
  document
    .querySelector<HTMLTextAreaElement>('.gmux-terminal-mount textarea')
    ?.focus();
}

/**
 * One per-agent hotkey press (Phase 94, item 2: exported so it can be driven).
 *
 * The hook in integration.ts is the only caller in the product. It is exported
 * because the hook cannot be run outside React, and this surface is the one that
 * composed its own create payload and started a session on this Mac from a tab
 * whose files are on another computer. A test that only drives the store proves
 * the rule and not the surface, so `src/renderer/settings/__tests__/
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
