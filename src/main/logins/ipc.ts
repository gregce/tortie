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
 *
 * PHASE 203. `list` NOW ASKS THE WHOLE QUESTION, which is the first defect the
 * operator reported. On macOS a claude login's credential is a keychain item
 * named for the login's own directory, and this file is where the keychain
 * half and the account address are joined to the names: `../usage/
 * login-accounts.ts` answers both, and this domain never names a vendor
 * location itself, because `npm run conformance:logins` rule 1 forbids it and
 * that forbidding is what keeps the person's own sign in out of reach of a
 * delete.
 *
 * SO `list` NOW SPAWNS ONE THING, AND ONLY ONE. `security
 * find-generic-password -s <service>` per claude login, with NO `-w`, which
 * reads the item's attributes and never its payload. It is asked when a
 * surface is about to draw and after every change, never on a timer and never
 * on a keystroke, and the answer is held for five seconds so a pointer moving
 * over the meter asks once rather than once a frame. The identity half spawns
 * nothing at all: it is two file reads.
 */

import type { IpcMain } from 'electron';
import type { LoginProviderId, LoginsSnapshot } from '@shared/logins';
import { LOGIN_PROVIDERS } from '@shared/logins';
import type { LoginActionResult } from '@shared/ipc';
import { handle } from '../typed-ipc';
import { getLog } from '../log';
import { forgetLoginAccounts, loginFacts } from '../usage/login-accounts';
import { loginsRoot } from './paths';
import {
  addLogin,
  chooseLogin,
  listLoginsAsking,
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

/**
 * The whole list, presence and account included (Phase 203).
 *
 * EVERY ANSWER THIS FILE GIVES GOES THROUGH HERE, including the snapshot a
 * refused change carries, so no surface anywhere ever draws the cheap file
 * only half. That half still exists in `./store.ts` for the paths that must
 * start no process, and nothing on a face reads it.
 */
function wholeList(): Promise<LoginsSnapshot> {
  return listLoginsAsking(loginsRoot(), async (provider, dir) => {
    const facts = await loginFacts(provider, dir);
    return {
      present: facts.present,
      email: facts.account.kind === 'known' ? facts.account.email : null
    };
  });
}

async function answer(change: LoginChange): Promise<LoginActionResult> {
  // A CHANGE DROPS EVERY HELD READING. Adding, choosing or removing a login
  // is the one moment the answers can all move at once, and a held reading
  // outliving a change is how a removed login goes on saying it is signed in.
  forgetLoginAccounts();
  const snapshot = await wholeList();
  return change.ok
    ? { ok: true, snapshot }
    : { ok: false, reason: change.reason, snapshot };
}

export function registerLoginsIpc(ipc: IpcMain): void {
  handle(ipc, 'logins:list', (): Promise<LoginsSnapshot> => wholeList());

  handle(ipc, 'logins:add', async (_e, provider, name): Promise<LoginActionResult> => {
    const id = providerOf(provider);
    if (id === null) {
      return { ok: false, reason: 'Unknown provider.', snapshot: await wholeList() };
    }
    const change = addLogin(loginsRoot(), id, name);
    log.info('logins.add', { provider: id, ok: change.ok });
    return answer(change);
  });

  handle(ipc, 'logins:choose', async (_e, provider, name): Promise<LoginActionResult> => {
    const id = providerOf(provider);
    if (id === null) {
      return { ok: false, reason: 'Unknown provider.', snapshot: await wholeList() };
    }
    const change = chooseLogin(loginsRoot(), id, name);
    log.info('logins.choose', { provider: id, ok: change.ok });
    return answer(change);
  });

  handle(ipc, 'logins:remove', async (_e, provider, name): Promise<LoginActionResult> => {
    const id = providerOf(provider);
    if (id === null) {
      return { ok: false, reason: 'Unknown provider.', snapshot: await wholeList() };
    }
    const change = removeLogin(loginsRoot(), id, name);
    log.info('logins.remove', { provider: id, ok: change.ok });
    return answer(change);
  });
}
