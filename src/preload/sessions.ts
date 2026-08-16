/**
 * The sessions half of the bridge, plus the durability notice drain that
 * ships with it. Moved verbatim from the single preload file (Phase 42
 * stage 2).
 */

import type { GmuxNoticeExtras, InstalledSessionsApi } from '../shared/ipc';
import { EVT_SESSIONS_CHANGED, EVT_STATUS_CHANGED } from '../shared/ipc';
import { invoke, on } from './bridge';

/**
 * sessions surface = frozen GmuxApi['sessions'] + the appended optional
 * extensions: discard (shell stream, §6.6 Remove) and restore (Phase 6,
 * §2.4 Step 3 armed restore). Both feature-detected by the renderer.
 */
export const sessions: InstalledSessionsApi = {
  create: (input) => invoke('sessions:create', input),
  list: () => invoke('sessions:list'),
  rename: (input) => invoke('sessions:rename', input),
  kill: (sessionId) => invoke('sessions:kill', sessionId),
  attach: (sessionId) => invoke('sessions:attach', sessionId),
  detach: (sessionId) => invoke('sessions:detach', sessionId),
  resize: (input) => invoke('sessions:resize', input),
  onChanged: (cb) => on(EVT_SESSIONS_CHANGED, cb),
  onStatusChanged: (cb) => on(EVT_STATUS_CHANGED, cb),
  discard: (sessionId) => invoke('sessions:discard', sessionId),
  restore: (sessionId) => invoke('sessions:restore', sessionId),
  // Phase 19 item 8. One call, because the ordering inside it is a durability
  // invariant: the replacement is created before anything is removed.
  restart: (sessionId) => invoke('sessions:restart', sessionId),
  // Phase 29. The Past Sessions panel's data: discarded rows, newest first.
  listRemoved: () => invoke('sessions:listRemoved'),
  // Phase 60. The ask before restoring into a project that is not open.
  askRestoreProject: (input) => invoke('sessions:askRestoreProject', input)
};

/**
 * notice surface (Phase 19 item 9). One call and no subscription: the notices
 * themselves arrive on `scrollback.onNotice`, and this exists only to collect
 * the ones main had to post before any window was open to hear them.
 */
export const notice: NonNullable<GmuxNoticeExtras['notice']> = {
  pending: () => invoke('notice:pending')
};
