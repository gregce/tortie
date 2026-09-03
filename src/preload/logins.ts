/**
 * The logins half of the bridge (Phase 202): four calls about which vendor
 * sign in a session runs under.
 *
 * All four go through the one typed invoke. NONE OF THEM CARRIES A PATH OR A
 * TOKEN in either direction: the renderer names a provider and a login NAME,
 * and main answers with names, whether each one has a credential, and which is
 * chosen. Where a credential lives is a main process fact and stays there.
 *
 * `add` starts nothing. It creates an empty directory and records a name. The
 * sign in that fills it is one ordinary session the person starts through
 * `sessions.create`, running the vendor's own command in their own terminal.
 */

import type { GmuxLoginsExtras } from '../shared/ipc';
import { EVT_LOGINS_CHANGED } from '../shared/ipc';
import { invoke, on } from './bridge';

export const logins: GmuxLoginsExtras['logins'] = {
  list: () => invoke('logins:list'),
  add: (provider, name) => invoke('logins:add', provider, name),
  choose: (provider, name) => invoke('logins:choose', provider, name),
  remove: (provider, name) => invoke('logins:remove', provider, name),
  // PHASE 211. The unasked-for change push. It carries no payload: a listener
  // that hears it re-reads the list. Same shape as usage.onChanged beside it.
  onChanged: (cb) => on(EVT_LOGINS_CHANGED, cb)
};
