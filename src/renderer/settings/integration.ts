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
import type { AgentKind, CreateSessionInput } from '@shared/types';
import { errorPayload, errorText, nextOrdinal, useApp } from '../state/store';
import { keyDisplay } from '@shared/keymap';
import { defaultLaunchArgsFor } from './presets';
import { useSettingsStore } from './settings-store';

const LAUNCH_PREFIX = 'launch-agent:';

/** Hand the keyboard to the visible terminal (same gesture as the shell). */
function focusTerminal(): void {
  document
    .querySelector<HTMLTextAreaElement>('.gmux-terminal-mount textarea')
    ?.focus();
}

async function launchAgent(agentId: string): Promise<void> {
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
    const session = await window.gmux.sessions.create({
      name,
      projectPath: project.path,
      // The frozen CreateSessionInput still types `agent` as the v1
      // AgentKind union; main's create path already resolves every
      // registry id (binary via agentBinaryName, spec via buildLaunchSpec).
      agent: agentId as AgentKind,
      ...(extraArgs.length > 0 ? { extraArgs } : {})
    } satisfies CreateSessionInput);
    s.setActiveSession(session.id);
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
