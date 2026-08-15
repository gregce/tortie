/**
 * The log half of the bridge (Phase 35).
 *
 * Five calls, all invokes, no event channel. The renderer writes error
 * records over `append`, Settings reads and switches the runtime level, and
 * the two Diagnostics buttons reveal the logs folder and pull the plain-text
 * report. Nothing here streams: a log line travels one way, into main, and
 * main owns every bound (the scope allowlist, the 2048 character message
 * truncation, the 8 KiB field cap and the 200 line per sender cap).
 *
 * electron-log's own renderer transport, its preload injection and its
 * `__ELECTRON_LOG__` channel are never enabled. This file is the only way a
 * renderer line reaches the file, and it rides the same typed `invoke` as
 * every other domain.
 */

import type { GmuxLogExtras } from '../shared/ipc';
import { invoke } from './bridge';

export const log: NonNullable<GmuxLogExtras['log']> = {
  append: (line) => invoke('log:append', line),
  level: () => invoke('log:level'),
  setLevel: (level) => invoke('log:setLevel', level),
  openFolder: () => invoke('log:openFolder'),
  diagnostics: () => invoke('log:diagnostics')
};
