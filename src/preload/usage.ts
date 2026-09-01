/**
 * The usage half of the bridge (Phase 181): the meter's two reads.
 *
 * Both go through the one typed invoke. Neither can change anything: the
 * channels they name read a credential the person's own agent stored, call the
 * vendor that issued it, and answer with numbers. The renderer never sees a
 * token, an email address or an account id, because main never sends one.
 */

import type { GmuxUsageExtras } from '../shared/ipc';
import { EVT_USAGE_CHANGED } from '../shared/ipc';
import { invoke, on } from './bridge';

export const usage: GmuxUsageExtras['usage'] = {
  read: () => invoke('usage:read'),
  refresh: () => invoke('usage:refresh'),
  // Phase 182. The live tap arrives on the person's own turn, so the snapshot
  // is pushed rather than waited for. Same payload as the two reads.
  onChanged: (cb) => on(EVT_USAGE_CHANGED, cb)
};
