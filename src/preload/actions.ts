/**
 * The GitHub Actions half of the bridge (Phase 46). Four invoke channels and
 * one event, all read only: main spawns the gh CLI, and no channel here can
 * write anything to GitHub.
 *
 * `observe` and `release` are the lifetime pair. The renderer calls `observe`
 * the first time the user expands the Runs section, and `release` when the
 * project tab closes. Nothing spawns for a repository nobody has looked at.
 */

import type { ActionsUpdate } from '../shared/actions';
import type { GmuxActionsExtras } from '../shared/ipc';
import { EVT_ACTIONS_CHANGED } from '../shared/ipc';
import { invoke, on } from './bridge';

export const actions: NonNullable<GmuxActionsExtras['actions']> = {
  runs: (input) => invoke('actions:runs', input),
  jobs: (input) => invoke('actions:jobs', input),
  observe: (repoPath) => invoke('actions:observe', repoPath),
  release: (repoPath) => invoke('actions:release', repoPath),
  onChanged: (cb: (update: ActionsUpdate) => void) =>
    on(EVT_ACTIONS_CHANGED, cb)
};
