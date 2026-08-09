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
 * Probe strategy: walk PATH like `which` would, then the usual macOS install
 * directories a GUI-launched Electron app may not have on its PATH
 * (homebrew, npm-global, ~/.local/bin, and claude's self-managed location).
 */

import type { IpcMain } from 'electron';
import { accessSync, constants } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import type { AgentAvailability } from '@shared/ipc';

/** Install dirs probed IN ADDITION to PATH (GUI apps get a minimal PATH). */
function extraBinDirs(): string[] {
  const home = homedir();
  return [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    join(home, '.local', 'bin'),
    join(home, 'bin'),
    // `claude install` (native build) symlinks here.
    join(home, '.claude', 'local'),
    // Default npm-global prefix locations.
    join(home, '.npm-global', 'bin')
  ];
}

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** `which`-alike over PATH + the extra dirs. Synchronous, cheap, no shell. */
export function findExecutable(bin: string): string | null {
  const pathDirs = (process.env['PATH'] ?? '').split(delimiter);
  for (const dir of [...pathDirs, ...extraBinDirs()]) {
    if (dir.length === 0) continue;
    const candidate = join(dir, bin);
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

let cached: AgentAvailability | null = null;

/** Probe (once per boot) which agent CLIs exist on this machine. */
export function getAgentAvailability(): AgentAvailability {
  if (cached === null) {
    cached = {
      claude: findExecutable('claude') !== null,
      codex: findExecutable('codex') !== null
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
