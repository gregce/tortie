/**
 * The usage half of the bridge (Phase 181): the meter's reads.
 *
 * Both go through the one typed invoke. Neither can change anything: the
 * channels they name read a credential the person's own agent stored, call the
 * vendor that issued it, and answer with numbers. The renderer never sees a
 * token, an email address or an account id, because main never sends one.
 *
 * PHASE 219 ADDED `statusLine`, which reads three files under the person's own
 * `.claude` and answers one word. It is what lets Settings say why the meter
 * is polling instead of moving when a turn ends.
 */

import type { GmuxUsageExtras } from '../shared/ipc';
import { EVT_USAGE_CHANGED } from '../shared/ipc';
import { invoke, on } from './bridge';

export const usage: GmuxUsageExtras['usage'] = {
  read: () => invoke('usage:read'),
  refresh: () => invoke('usage:refresh'),
  statusLine: () => invoke('usage:statusLine'),
  // Phase 182. The live tap arrives on the person's own turn, so the snapshot
  // is pushed rather than waited for. Same payload as the two reads.
  onChanged: (cb) => on(EVT_USAGE_CHANGED, cb)
};
