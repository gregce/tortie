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
 *
 * PHASE 204. THE LIST ALSO OBSERVES, AND THE CHOICE ALSO WRITES. This is the
 * phase that lifted Phase 202's rule that Tortie never writes a credential
 * byte, and these two channels are where the lift is wired:
 *
 *  - `list` runs one OBSERVE per provider first. An observe reads every store,
 *    keeps a copy of anything that changed in Tortie's OWN store, and when the
 *    ACCOUNT in a store changed rather than just the token, gives the account
 *    that was there a login of its own named from its address. That is the
 *    whole of `/login` being remembered. An observe writes NOTHING a vendor
 *    owns, so it cannot affect a session that is running, and it is held for
 *    five seconds so a pointer over the meter observes once rather than once a
 *    frame. There is no timer anywhere in this path.
 *  - `choose` runs an observe and then an ACTIVATION, which is the only write
 *    into a vendor's store in the whole product. It is refused while a session
 *    is running under that login, it can never name the person's own default
 *    location, and it is preceded by the capture above, so a switch is
 *    reversible in both directions.
 *
 * NO CREDENTIAL EVER CROSSES THIS BOUNDARY. The snapshot carries a name, an
 * address, and four booleans. There is no channel that answers a payload, and
 * none of these handlers can compose one.
 */

import type { IpcMain } from 'electron';
import type { LoginProviderId, LoginsSnapshot } from '@shared/logins';
import { LOGIN_PROVIDERS } from '@shared/logins';
import type { LoginActionResult } from '@shared/ipc';
import { handle } from '../typed-ipc';
import { getLog } from '../log';
import { forgetLoginAccounts, loginFacts } from '../usage/login-accounts';
import {
  activateLogin,
  finishStrayLogins,
  forgetLogin,
  observeProvider,
  readyKeepDeps,
  securityCallCount,
  vaultMigrationResult,
  NO_KEPT_FACTS,
  type KeptFacts
} from '../credentials';
import { loginsRoot } from './paths';
import {
  addLogin,
  chooseLogin,
  listLoginsAsking,
  readLoginsFile,
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
/**
 * How long one observe stands before the stores are read again.
 *
 * The same five seconds `loginFacts` holds its answer for, and for the same
 * reason: a pointer moving over the meter must not read every store on every
 * frame. It is far shorter than any sign in flow, so a finished sign in is
 * never hidden behind it, and every change a person makes drops it.
 */
const OBSERVE_TTL_MS = 5_000;

let observedAt = 0;
let observedFacts = new Map<string, KeptFacts>();

/**
 * The observe that is running right now, so two overlapping lists do ONE.
 *
 * A MOUNT ISSUES MORE THAN ONE LIST. `../../renderer/settings/UsageGroup.tsx`
 * draws a block per provider and each loads on mount, and StrictMode doubles
 * that again, so four `logins:list` calls can be in flight at once with the
 * hold below covering none of them: it stamps its clock AFTER its awaits.
 *
 * The correctness of that overlap is settled in `../credentials/keep.ts`,
 * which serialises every observe on one root. THIS is the cost half: without
 * it the four calls do four full passes over every store, which on macOS is
 * four rounds of `security` per claude login, one after another, in front of
 * a card that is about to draw.
 */
let observeInFlight: Promise<Map<string, KeptFacts>> | null = null;

/** Drop the held observation. Called after any change a person made. */
function forgetObservation(): void {
  observedAt = 0;
  observedFacts = new Map();
  // A CHANGE ALSO DROPS THE PASS IN FLIGHT, so a list issued after the change
  // starts a new one rather than joining a pass that read the old world.
  observeInFlight = null;
}

/**
 * One observe per provider, held for five seconds.
 *
 * A THROW HERE IS NOT A FAILED LIST. Keeping a copy of an account is worth
 * nothing if it can stop a person seeing which logins they have, so a refusal
 * anywhere below leaves the last facts in place and the list is composed
 * exactly as Phase 203 composed it.
 */
function observeAll(): Promise<Map<string, KeptFacts>> {
  if (Date.now() - observedAt < OBSERVE_TTL_MS) {
    return Promise.resolve(observedFacts);
  }
  // A SECOND CALLER JOINS THE ONE ALREADY RUNNING rather than starting a
  // second pass. Both get the same answer, which is also what stops the two
  // provider blocks drawing from two different readings of the same moment.
  if (observeInFlight !== null) return observeInFlight;
  const run = (async (): Promise<Map<string, KeptFacts>> => {
    const facts = new Map<string, KeptFacts>();
    for (const provider of LOGIN_PROVIDERS) {
      try {
        // PHASE 208. `readyKeepDeps` rather than `keepDeps`: the seams come
        // back only after the item a tree before that phase wrote under the
        // unscoped keychain name has been moved under this profile's own, once
        // per process, and only in the person's own profile.
        const seen = await observeProvider(await readyKeepDeps(), provider);
        for (const [id, row] of seen.facts) facts.set(`${provider} ${id}`, row);
        for (const event of seen.events) {
          log.info('logins.observe', { provider, kind: event.kind });
        }
      } catch {
        // Nothing a person can do, and the list is still worth drawing.
      }
    }
    // THE CLOCK IS STAMPED HERE, at the end, where the answer exists. Stamping
    // it at the start would hide a pass that has not finished behind a hold.
    observedAt = Date.now();
    observedFacts = facts;
    return facts;
  })();
  observeInFlight = run;
  return run.finally(() => {
    if (observeInFlight === run) observeInFlight = null;
  });
}

/**
 * The one observe at boot (Phase 208).
 *
 * Called once from the boot after the manifest is open, and never awaited by
 * anything that draws. It is the same `observeAll` the list runs, so the stray
 * sweep and the staged sweep of Phase 206 now happen on every launch rather
 * than on the first list a surface happens to ask for, and the Phase 208
 * migration runs in front of it through `readyKeepDeps`. It is held for the
 * same five seconds, so a list issued right after it draws from the same
 * reading rather than reading every store twice.
 *
 * THE COST IS SAID OUT LOUD in one line, being the wall time and the number of
 * `security` runs this process made between its start and its end, so a probe
 * and a person reading a log can both see what a cold start paid. The line
 * carries the migration's four counts and nothing that names an item.
 */
export async function observeLoginsAtBoot(): Promise<void> {
  const started = Date.now();
  const callsBefore = securityCallCount();
  let observed = 0;
  try {
    observed = (await observeAll()).size;
  } catch {
    // A refusal below leaves the last facts in place; the list still draws.
  }
  const migration = (await vaultMigrationResult()) ?? null;
  log.info('logins.boot', {
    ms: Date.now() - started,
    securityCalls: securityCallCount() - callsBefore,
    rows: observed,
    migration
  });
}

function wholeList(): Promise<LoginsSnapshot> {
  const root = loginsRoot();
  return observeAll().then((keptFacts) =>
    listLoginsAsking(root, async (provider, dir, id) => {
      const facts = await loginFacts(provider, dir);
      const kept = keptFacts.get(`${provider} ${id ?? ''}`) ?? NO_KEPT_FACTS;
      return {
        present: facts.present,
        // THE VENDOR'S OWN ANSWER LEADS, and Tortie's record is the fallback.
        // A login whose account Tortie put back has no `.claude.json` of its
        // own until the account takes a turn there, and drawing nothing for it
        // would be the Phase 203 defect in a new shape.
        email:
          facts.account.kind === 'known' ? facts.account.email : kept.email,
        kept: kept.kept,
        restores: kept.restores
      };
    })
  );
}

async function answer(change: LoginChange): Promise<LoginActionResult> {
  // A CHANGE DROPS EVERY HELD READING. Adding, choosing or removing a login
  // is the one moment the answers can all move at once, and a held reading
  // outliving a change is how a removed login goes on saying it is signed in.
  forgetLoginAccounts();
  forgetObservation();
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
    // PHASE 204. THE ACCOUNT GOES BACK FIRST, then the name is recorded.
    // The order is what makes a refused write leave the choice alone: a login
    // whose account could not be put back would launch every new session
    // signed out, so nothing is chosen at all and the person reads why.
    let activation: string | null = null;
    try {
      const put = await activateLogin(await readyKeepDeps(), id, name);
      if (!put.ok) {
        forgetObservation();
        log.info('logins.activate', { provider: id, ok: false });
        return { ok: false, reason: put.reason, snapshot: await wholeList() };
      }
      activation = put.wrote ? put.says : null;
      log.info('logins.activate', { provider: id, ok: true, wrote: put.wrote });
    } catch {
      // A store Tortie could not reach leaves the choice to the person: the
      // name is still recorded and the login runs on whatever is in it.
      log.info('logins.activate', { provider: id, ok: false });
    }
    const change = chooseLogin(loginsRoot(), id, name);
    log.info('logins.choose', { provider: id, ok: change.ok });
    const result = await answer(change);
    return activation === null || !result.ok
      ? result
      : { ...result, reason: activation };
  });

  handle(ipc, 'logins:remove', async (_e, provider, name): Promise<LoginActionResult> => {
    const id = providerOf(provider);
    if (id === null) {
      return { ok: false, reason: 'Unknown provider.', snapshot: await wholeList() };
    }
    // PHASE 204. THE KEPT COPY GOES WITH THE LOGIN. The id is read before the
    // remove, because the remove is what forgets the row it lives on.
    const row = readLoginsFile(loginsRoot()).file.logins.find(
      (l) => l.provider === id && l.name.toLowerCase() === String(name).toLowerCase()
    );
    // PHASE 206. THE CREDENTIALS GO FIRST, AND THE ORDER IS THE WHOLE FIX.
    // Before this the row was forgotten first, so a crash between the two
    // halves stranded the vendor's keychain item, Tortie's own slot and the
    // record row together, with the one id that names all three already gone
    // from the file. Clearing them first cannot strand a credential: the worst
    // an interrupted remove now leaves is a login the person can see and
    // remove again, and the sweep below finishes it anyway.
    if (row !== undefined) {
      try {
        await forgetLogin(await readyKeepDeps(), id, row.id);
      } catch {
        // A store that will not answer is not a reason to refuse a remove.
      }
    }
    const change = removeLogin(loginsRoot(), id, name);
    log.info('logins.remove', { provider: id, ok: change.ok });
    // PHASE 206. AND ANY EARLIER REMOVE THAT DID NOT FINISH IS FINISHED HERE,
    // so a stray can never outlive the next Remove the person presses.
    try {
      const finished = await finishStrayLogins(await readyKeepDeps(), id);
      if (finished.length > 0) {
        log.info('logins.strays', { provider: id, finished: finished.length });
      }
    } catch {
      // A stray that will not go is finished by the next run's first observe.
    }
    return answer(change);
  });
}
