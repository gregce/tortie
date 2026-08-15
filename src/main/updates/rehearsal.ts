/**
 * The rehearsal gate (Phase 43), one pure predicate and nothing else.
 *
 * WHY IT EXISTS AS ITS OWN MODULE. Two environment variables now change what
 * the updater touches. `TORTIE_UPDATE_FEED` moves where a check looks, and
 * `GMUX_UPDATE_STATE_ROOT` moves which Squirrel state directory the recovery
 * reads and clears. Both are honoured under the same three conditions, and a
 * rule written twice is a rule that drifts. So the rule lives here, and
 * `feedOverrideDecision` in ./updater and `resolveUpdaterPaths` in
 * ./shipit-state both call it.
 *
 * THE THREE CONDITIONS. A launch is a confirmed rehearsal only when all of
 * them hold:
 *
 * 1. `GMUX_UPDATE_REHEARSAL=1` is set, the explicit flag a person types.
 * 2. The tmux socket is not `gmux`, which itself can only happen when the
 *    supervisor's harness gate accepted an override.
 * 3. The userData path does not end with `/Tortie`, that is, the launch
 *    carries an isolated `--user-data-dir`.
 *
 * Any one of them failing means the launch is an ordinary one, and an
 * ordinary launch reads the real feed and the real Squirrel state. There is
 * no fourth condition and no way to add one from configuration.
 *
 * Pure, no electron import, so the unit tests cover all eight combinations
 * without an Electron process.
 *
 * Ownership: src/main/updates/rehearsal.ts (Phase 43).
 */

import { TMUX_SOCKET } from '../tmux/supervisor';

/**
 * True only when this launch is a confirmed update rehearsal. The three
 * conditions are in the module header and none of them is optional.
 */
export function isConfirmedRehearsal(
  env: NodeJS.ProcessEnv,
  socketName: string,
  userDataPath: string
): boolean {
  const flagged = env['GMUX_UPDATE_REHEARSAL'] === '1';
  const isolatedSocket = socketName !== TMUX_SOCKET;
  const isolatedProfile = !userDataPath.endsWith('/Tortie');
  return flagged && isolatedSocket && isolatedProfile;
}
