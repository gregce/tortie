/**
 * The door's half of the bridge (Phase 313, installed in Phase 316): ten reads
 * and presses that only Settings then Phone reaches, and one subscription.
 *
 * NOTHING HERE IS THE DOOR. These channels are the renderer asking main about
 * the door on this Mac — what it is bound to, whether a pairing window is open,
 * which phones a person has allowed. The tailnet door's own route table lives in
 * main and is read only; nothing a phone sends arrives through this file, and
 * nothing in this file can be reached from the tailnet.
 *
 * Five of them do change state — `setDoor`, `setPushAlerts`, `removePhone`,
 * `confirmDoor`, `forgetDoor` — and that is not a contradiction of "no write
 * route": they are a person pressing a button in Tortie on this Mac, which is
 * the only place the door's agreement may be given or withdrawn.
 */

import type { GmuxPocketExtras } from '../shared/ipc';
import { EVT_POCKET_CHANGED } from '../shared/ipc';
import { invoke, on } from './bridge';

export const pocket: GmuxPocketExtras['pocket'] = {
  status: () => invoke('pocket:status'),
  setDoor: (input) => invoke('pocket:setDoor', input),
  setPushAlerts: (input) => invoke('pocket:setPushAlerts', input),
  // The tailnet key the person pasted crosses here once, into main, and main
  // holds it only inside the pairing window it opens.
  beginPairing: (input) => invoke('pocket:beginPairing', input),
  cancelPairing: () => invoke('pocket:cancelPairing'),
  pairingState: () => invoke('pocket:pairingState'),
  allowPhone: (input) => invoke('pocket:allowPhone', input),
  removePhone: (phoneId) => invoke('pocket:removePhone', phoneId),
  confirmDoor: (input) => invoke('pocket:confirmDoor', input),
  forgetDoor: () => invoke('pocket:forgetDoor'),
  // Main pushes the whole status whenever anything about the door moves, so the
  // sheet never polls and a window that closed on its own deadline is drawn shut
  // without anybody asking.
  onChanged: (cb) => on(EVT_POCKET_CHANGED, cb)
};
