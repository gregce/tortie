/**
 * Argv acceptance for `tortie .` (Phase 51) — one pure function, used by all
 * three entry points in src/main/index.ts: the boot argv, the argv the
 * `second-instance` event delivers, and the path the `open-file` event hands
 * over (wrapped in a one-element array).
 *
 * THE CAP holds here mechanically: main accepts from launch argv exactly one
 * absolute path to an existing directory. Everything else is dropped, and
 * the caller logs one line naming what was dropped. No entry is ever
 * interpreted as a flag, an agent, or a command.
 */

import { statSync } from 'node:fs';
import { isAbsolute } from 'node:path';

export interface ShellOpenPick {
  /** The one accepted folder, or null when no entry qualified. */
  path: string | null;
  /**
   * Every payload entry that was not accepted, each with its reason
   * appended in parentheses. Dash entries are NOT here: they are launch
   * switches (Chromium noise, --user-data-dir, -psn_…), machinery rather
   * than payload, and are skipped silently.
   */
  dropped: string[];
}

/**
 * Pick the one folder a launch's arguments may open.
 *
 * `rawArgs` is argv with the executable stripped, and in a non-packaged app
 * the app-path argument stripped too — the caller passes
 * `argv.slice(app.isPackaged ? 1 : 2)`.
 */
export function pickShellOpenPath(rawArgs: readonly string[]): ShellOpenPick {
  let picked: string | null = null;
  const dropped: string[] = [];
  for (const arg of rawArgs) {
    if (arg.length === 0) continue;
    // Launch switches are machinery, not payload. Skipped silently.
    if (arg.startsWith('-')) continue;
    if (!isAbsolute(arg)) {
      dropped.push(`${arg} (not an absolute path)`);
      continue;
    }
    let isDirectory: boolean;
    try {
      isDirectory = statSync(arg).isDirectory();
    } catch {
      dropped.push(`${arg} (does not exist)`);
      continue;
    }
    if (!isDirectory) {
      dropped.push(`${arg} (not a folder)`);
      continue;
    }
    if (picked !== null) {
      dropped.push(`${arg} (a second folder)`);
      continue;
    }
    picked = arg;
  }
  return { path: picked, dropped };
}
