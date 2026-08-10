/**
 * Agent CLI availability probe (Phase 8 — §6.5 / DESIGN-SPEC S6).
 *
 * The create-session UI must never offer an agent whose CLI is missing and
 * then fail with a spawn error: main probes for `claude` and `codex` ONCE
 * per boot (cached — install-while-running is picked up on next launch,
 * which the UI copy explains) and the renderer feature-detects
 * `window.gmux.agentAvailability` to render unavailable agents as disabled
 * options with the install command.
 *
 * Resolution itself lives in src/main/tmux/resolve.ts (growth guardrail 3:
 * ONE resolver — this probe, session create, and Phase 10's detection
 * service all share it): captured login-shell PATH + the usual macOS
 * install dirs a GUI-launched Electron app misses.
 */

import type { IpcMain } from 'electron';
import type { AgentAvailability } from '@shared/ipc';
import { getUserPath, resolveBinaryAgainst } from './tmux/resolve';

let cached: AgentAvailability | null = null;

/** Probe (once per boot) which agent CLIs exist on this machine. */
export async function getAgentAvailability(): Promise<AgentAvailability> {
  if (cached === null) {
    const userPath = await getUserPath();
    cached = {
      claude: resolveBinaryAgainst('claude', userPath) !== null,
      codex: resolveBinaryAgainst('codex', userPath) !== null
    };
    console.log(
      `[gmux] agent availability: claude=${cached.claude} codex=${cached.codex}`
    );
  }
  return cached;
}

/** Register the appended 'agents:availability' invoke channel. */
export function registerAgentsIpc(ipc: IpcMain): void {
  ipc.handle('agents:availability', () => getAgentAvailability());
}
