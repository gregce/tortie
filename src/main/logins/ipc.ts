/**
 * The ONE `logins:*` registrar (Phase 202), called once from main process
 * boot:
 *
 *     import { registerLoginsIpc } from './logins/ipc';
 *     registerLoginsIpc(ipcMain);
 *
 * FOUR CHANNELS, AND NONE OF THEM SIGNS ANYBODY IN. `list` reads a JSON file
 * and stats two paths. `add` creates one empty directory. `choose` writes one
 * name. `remove` deletes one directory Tortie made. None of them opens a
 * keychain, spawns a process, reaches a network, touches tmux, writes the
 * manifest or sets a session's status.
 *
 * REFUSAL 8 HOLDS THROUGH `add`, and this is the sentence to read before
 * changing it. Creating a directory is a configuration change, and a
 * configuration change may never cause a process to start. So `add` starts
 * nothing at all: the sign in that fills the directory is one ordinary session
 * the PERSON starts, through the create path every other session uses, running
 * the vendor's own command in their own terminal.
 *
 * THE PERSON'S OWN DEFAULT LOGIN IS NEVER A TARGET. It has no row and no id,
 * so no path can be composed for it, `remove` refuses its name outright, and
 * `../logins/dirs.ts` refuses any directory that is not a direct child of
 * Tortie's own logins root.
 */

import type { IpcMain } from 'electron';
import type { LoginProviderId, LoginsSnapshot } from '@shared/logins';
import { LOGIN_PROVIDERS } from '@shared/logins';
import type { LoginActionResult } from '@shared/ipc';
import { handle } from '../typed-ipc';
import { getLog } from '../log';
import { loginsRoot } from './paths';
import {
  addLogin,
  chooseLogin,
  listLogins,
  removeLogin,
  type LoginChange
} from './store';

/**
 * Scope "logins" (Phase 35 logging). Every line this domain writes is a
 * provider name, an action word and an outcome. NEVER a name a person typed,
 * never a directory, and there is no token anywhere in this domain to write.
 */
const log = getLog('logins');

/** A provider the caller may name, or null. The renderer is not trusted here. */
function providerOf(raw: unknown): LoginProviderId | null {
  return LOGIN_PROVIDERS.includes(raw as LoginProviderId)
    ? (raw as LoginProviderId)
    : null;
}

function answer(change: LoginChange, fallback: LoginsSnapshot): LoginActionResult {
  return change.ok
    ? { ok: true, snapshot: change.snapshot }
    : { ok: false, reason: change.reason, snapshot: fallback };
}

export function registerLoginsIpc(ipc: IpcMain): void {
  handle(ipc, 'logins:list', (): LoginsSnapshot => listLogins(loginsRoot()));

  handle(ipc, 'logins:add', (_e, provider, name): LoginActionResult => {
    const root = loginsRoot();
    const id = providerOf(provider);
    if (id === null) {
      return { ok: false, reason: 'Unknown provider.', snapshot: listLogins(root) };
    }
    const change = addLogin(root, id, name);
    log.info('logins.add', { provider: id, ok: change.ok });
    return answer(change, listLogins(root));
  });

  handle(ipc, 'logins:choose', (_e, provider, name): LoginActionResult => {
    const root = loginsRoot();
    const id = providerOf(provider);
    if (id === null) {
      return { ok: false, reason: 'Unknown provider.', snapshot: listLogins(root) };
    }
    const change = chooseLogin(root, id, name);
    log.info('logins.choose', { provider: id, ok: change.ok });
    return answer(change, listLogins(root));
  });

  handle(ipc, 'logins:remove', (_e, provider, name): LoginActionResult => {
    const root = loginsRoot();
    const id = providerOf(provider);
    if (id === null) {
      return { ok: false, reason: 'Unknown provider.', snapshot: listLogins(root) };
    }
    const change = removeLogin(root, id, name);
    log.info('logins.remove', { provider: id, ok: change.ok });
    return answer(change, listLogins(root));
  });
}
