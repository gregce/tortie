/**
 * The door's half of the bridge (Phase 313, installed in Phase 316): fifteen
 * reads and presses that only Settings then Phone reaches, and one
 * subscription (Phase 330 added `openApproval`, Phase 316.5 the Apple push
 * key's `choosePushKey` and `forgetPushKey`, Phase 333.1 `recheck`, the window
 * coming back to the front, and `setupAction`, one setup press by its word).
 *
 * NOTHING HERE IS THE DOOR. These channels are the renderer asking main about
 * the door on this Mac — what it publishes, whether a pairing window is open,
 * which phones a person has allowed. The door's own route table lives in main
 * and is read only; nothing a phone sends arrives through this file, and
 * nothing in this file can be reached from the internet the door answers on.
 *
 * Seven of them do change state — `setDoor`, `setPushAlerts`, `removePhone`,
 * `confirmDoor`, `forgetDoor`, `choosePushKey`, `forgetPushKey` — and
 * `openApproval` opens one page in the
 * browser (`setupAction` opens Tailscale's download page or the Tailscale app,
 * or copies the admin's approval link, each only when main lists it), and
 * that is not a contradiction of "no write route": they are a
 * person pressing a button in Tortie on this Mac, which is the only place the
 * door's agreement may be given or withdrawn. `recheck` is no press: it is the
 * window coming back to the front, and main reads Tailscale for it only where
 * a press already would, and starts only a door the person allowed, as launch
 * does.
 */

import type { GmuxPocketExtras } from '../shared/ipc';
import { EVT_POCKET_CHANGED } from '../shared/ipc';
import { invoke, on } from './bridge';

export const pocket: GmuxPocketExtras['pocket'] = {
  status: () => invoke('pocket:status'),
  setDoor: (input) => invoke('pocket:setDoor', input),
  setPushAlerts: (input) => invoke('pocket:setPushAlerts', input),
  // It takes nothing (Phase 330): there is no key to paste.
  beginPairing: () => invoke('pocket:beginPairing'),
  cancelPairing: () => invoke('pocket:cancelPairing'),
  pairingState: () => invoke('pocket:pairingState'),
  allowPhone: (input) => invoke('pocket:allowPhone', input),
  removePhone: (phoneId) => invoke('pocket:removePhone', phoneId),
  confirmDoor: (input) => invoke('pocket:confirmDoor', input),
  forgetDoor: () => invoke('pocket:forgetDoor'),
  // Main opens only the approval URL it holds, checked again before it opens.
  openApproval: () => invoke('pocket:openApproval'),
  // Main opens the file panel and reads the key; nothing of the key comes back
  // across this bridge, only whether it was kept (Phase 316.5).
  choosePushKey: () => invoke('pocket:choosePushKey'),
  forgetPushKey: () => invoke('pocket:forgetPushKey'),
  // A return to the window (Phase 333.1): main reads Tailscale only while its
  // own predicate says a return would re-check, and counts no press.
  recheck: () => invoke('pocket:recheck'),
  // One setup press, by its closed word and never a URL or a path (Phase
  // 333.1): main acts only on a word its status lists.
  setupAction: (action) => invoke('pocket:setupAction', action),
  // Main pushes the whole status whenever anything about the door moves, so the
  // sheet never polls and a window that closed on its own deadline is drawn shut
  // without anybody asking.
  onChanged: (cb) => on(EVT_POCKET_CHANGED, cb)
};
