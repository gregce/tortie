/**
 * The post update self check (Phase 24, section 9 of the phase spec).
 *
 * WHAT THIS IS FOR. An update replaces the application bundle while the tmux
 * server and every session keep running. The one thing that can go wrong
 * silently is a swapped bundle that is missing a resource the app cannot work
 * without, e.g. the tmux config, which makes the server run at 2,000 lines of
 * scrollback instead of 25,000 and say nothing. So on the first boot after
 * app.getVersion() changes from the stored value, this module verifies that
 * every bundled resource still resolves on disk.
 *
 * THE RULES, restated from the phase spec so a later edit does not soften
 * them:
 *
 *  - Existence is the check. `existsSync` per file, no hashing, no spawning,
 *    no version reads. The bundle's signature is Squirrel's job, not ours.
 *  - Every path comes from the EXISTING resolver for that resource, never a
 *    hand built path. The resolver is what the app will actually use, so it
 *    is the only honest thing to check.
 *  - The check says its piece ONCE. `lastSeenVersion` is written whether or
 *    not anything was missing, so the notice cannot repeat on every boot.
 *  - On any missing resource there is ONE quiet failure covering all of
 *    them: one log line (pinned in build/assert-bundle-refusals.mjs) and one
 *    durability notice. This is the single thing in the whole update flow
 *    that is allowed to rise above the surface, and only because it is a
 *    failure.
 *  - `lastSeenVersion` lives in the app config (updates.json, Builder A's
 *    state module), never in the manifest.
 *
 * `runPostUpdateSelfCheck()` never rejects. It is called fire and forget from
 * normal startup and must never delay the window.
 */

import { existsSync } from 'node:fs';
import { app } from 'electron';
import { postDurabilityNotice } from '../notice';
import { resolveConfPath } from '../tmux';
import { bundledSpecstoryPath } from '../specstory/resolve';
import { rgBinaryPath } from '../search/resolve';
import { missingGrammars, runtimeWasmPath } from '../symbols/paths';
import { logUpdateEvent } from './log';
import { readUpdateState, writeUpdateState } from './state';

/** One named resource and the question "is it on disk right now". */
export interface ResourceProbe {
  /** Short label the log line and the notice carry, e.g. "tmux config". */
  label: string;
  /** True when every file this resource needs resolves on disk. */
  present: () => boolean;
}

/**
 * What the version comparison asks the check to do. Exported pure so the
 * unit test covers each branch without electron.
 *
 * - 'record-first-run': nothing stored yet. This is the first boot under
 *   this code, so nothing was updated. Record the version and stop.
 * - 'nothing': the version did not change.
 * - 'verify': the version changed, in either direction. A downgrade through
 *   the allowDowngrade escape hatch swaps the bundle the same way an upgrade
 *   does, so it gets the same check.
 */
export function selfCheckAction(
  stored: string | null,
  current: string
): 'record-first-run' | 'nothing' | 'verify' {
  if (stored === null) return 'record-first-run';
  if (stored === current) return 'nothing';
  return 'verify';
}

/**
 * The labels of every probe that fails, in the order the probes were given.
 * A probe that THROWS counts as missing: a resolver that cannot even produce
 * a path is a resource the app cannot reach, and this check must never turn a
 * broken bundle into an unhandled rejection.
 */
export function missingResourceLabels(
  probes: readonly ResourceProbe[]
): string[] {
  const missing: string[] = [];
  for (const probe of probes) {
    let ok = false;
    try {
      ok = probe.present();
    } catch {
      ok = false;
    }
    if (!ok) missing.push(probe.label);
  }
  return missing;
}

/**
 * The four resources, each through the resolver the app itself uses. The
 * paths were verified against release/mac-arm64/Tortie.app when the phase
 * spec was written:
 *
 *  - tmux config: `gmux-tmux.conf` under Contents/Resources.
 *  - specstory: `bin/specstory` under Contents/Resources.
 *  - ripgrep: the unpacked rg binary under app.asar.unpacked.
 *  - tree-sitter: the six grammar wasm files plus the runtime wasm, all under
 *    `tree-sitter/`. One label for all seven files, because the toast names
 *    what is broken, not a file listing.
 */
export function defaultResourceProbes(): ResourceProbe[] {
  return [
    { label: 'tmux config', present: () => existsSync(resolveConfPath()) },
    { label: 'specstory', present: () => existsSync(bundledSpecstoryPath()) },
    { label: 'ripgrep', present: () => existsSync(rgBinaryPath()) },
    {
      label: 'tree-sitter',
      present: () =>
        missingGrammars().length === 0 && existsSync(runtimeWasmPath())
    }
  ];
}

/**
 * Run the check. Never rejects, never delays the window.
 *
 * A no-op outside a packaged app: a dev build does not update itself, and its
 * resources resolve into the repo rather than a bundle, so there is nothing
 * for this check to say there.
 */
export async function runPostUpdateSelfCheck(): Promise<void> {
  try {
    if (!app.isPackaged) return;
    const stored = readUpdateState().lastSeenVersion;
    const current = app.getVersion();
    const action = selfCheckAction(stored, current);
    if (action === 'nothing') return;
    if (action === 'record-first-run') {
      writeUpdateState({ lastSeenVersion: current });
      return;
    }
    // The version changed. Verify, then record the version whether or not
    // anything was missing, so the check says its piece once and not on
    // every boot.
    const missing = missingResourceLabels(defaultResourceProbes());
    writeUpdateState({ lastSeenVersion: current });
    if (missing.length === 0) return;
    // The log line is pinned by build/assert-bundle-refusals.mjs. Reword it
    // there first or the build fails, which is the gate working. It goes
    // through logUpdateEvent (Phase 31) so packaged builds keep it on disk;
    // the console output is unchanged.
    logUpdateEvent(
      'error',
      `the update left resources missing: ${missing.join(', ')}`
    );
    postDurabilityNotice({
      kind: 'update-incomplete',
      missing,
      version: current
    });
  } catch (err) {
    // The check is about a broken bundle. It must never become the thing
    // that breaks a working boot.
    logUpdateEvent(
      'warn',
      `the post update self check did not finish: ${(err as Error).message}`
    );
  }
}
