/**
 * The logins contract (Phase 202): four channels, and what each of them is
 * allowed to do.
 *
 * WHAT A LOGIN IS AND WHY THESE CHANNELS ARE SO NARROW. A login is a directory
 * the vendor's own CLI signed into. Tortie's whole part is pointing one
 * environment variable at it when a session launches, and reading it when the
 * meter asks the vendor about the person's own plan. So these four channels
 * carry NAMES, they never carry a path, they never carry a token, and none of
 * them can sign anybody in or out.
 *
 * `logins:add` CREATES AN EMPTY DIRECTORY AND STARTS NOTHING. That is refusal
 * 8 exactly: a configuration change on its own may never cause a process to
 * start. The sign in that fills the directory is one ordinary session the
 * person starts through `sessions:create` and completes in their own terminal,
 * running the vendor's own flow, in the vendor's own browser.
 *
 * `logins:remove` DELETES ONLY A DIRECTORY TORTIE MADE, checked twice against
 * the owned root, and it can never name the person's own default location: the
 * default has no id, so there is no path to compose for it, and the store
 * refuses the name outright as well.
 *
 * `logins:choose` SENDS NOTHING TO ANY RUNNING PROCESS. It decides what the
 * NEXT session of that provider launches under and which directory the meter
 * reads. A running session keeps the login it started with for its whole life.
 *
 * THE CONFIRM HASH DOES NOT MOVE FOR ANY OF THESE. Choosing a login is
 * presentation of WHICH credential, not of WHAT runs: the argv is unchanged,
 * nothing on an agent entry can see a login, and the one variable a login sets
 * is composed at the spawn rather than through `launch.env`, which is a field
 * the hash must move for.
 *
 * MAIN: src/main/logins/ipc.ts, the one `logins:*` registrar.
 */

import type { LoginProviderId, LoginRefusalWhy, LoginsSnapshot } from '../logins';

/**
 * Main → renderers: a login set changed WITHOUT the renderer asking (Phase 211).
 *
 * A `/login` typed inside a session, or the vendor's own rotation, changes a
 * store, and `src/main/credentials/watch.ts` sees it and pushes this so the
 * menu, the card, the Settings list and the meter redraw unasked. It CARRIES
 * NO PAYLOAD: a credential, a digest and an address never cross this boundary,
 * and the gate proves the channel cannot compose one. A renderer that hears it
 * re-reads the list through `logins:list`, which is the same read every surface
 * already uses.
 */
export const EVT_LOGINS_CHANGED = 'logins:changed' as const;

/** Payload of EVT_LOGINS_CHANGED: nothing at all. */
export interface LoginsEventPayloadMap {
  'logins:changed': [];
}

/** What an add, a choose or a remove answered. */
export interface LoginActionResult {
  /** False when nothing changed. `reason` says why, in one sentence. */
  ok: boolean;
  /** Present when `ok` is false. A sentence a person can read. */
  reason?: string;
  /**
   * The named reason, when this change met one (Phase 287).
   *
   * It is on BOTH arms deliberately. A switch can meet the agent's own ceiling
   * and still stand: the login is chosen and its own keychain entry holds its
   * account, while the running session was left alone because the entry that
   * session reads could not take the sign in. `ok` says whether the choice
   * happened and this says what was met on the way, so a renderer can say the
   * one sentence that is true of that outcome instead of the switched one.
   * Since Phase 304 the only store that can refuse for size is the agent's,
   * because Tortie's own copy is a sealed file, so no ROW carries this: it is
   * the answer to one click and nothing else.
   */
  why?: LoginRefusalWhy;
  /** Every login after the change, or before it when nothing changed. */
  snapshot: LoginsSnapshot;
}

export interface LoginsInvokeChannelMap {
  /** Every login Tortie knows, default first. Opens no keychain, spawns nothing. */
  'logins:list': { req: []; res: LoginsSnapshot };
  /**
   * Create an empty directory for a new login of this provider and record its
   * name. Signs nobody in and starts no process.
   */
  'logins:add': {
    req: [provider: LoginProviderId, name: string];
    res: LoginActionResult;
  };
  /**
   * Choose which login this provider's NEXT sessions launch under, and which
   * one the meter reads. `null` chooses the person's own default.
   */
  'logins:choose': {
    req: [provider: LoginProviderId, name: string | null];
    res: LoginActionResult;
  };
  /**
   * Forget a login and delete the directory Tortie made for it. The default
   * login is refused; no path outside Tortie's own data can be composed.
   */
  'logins:remove': {
    req: [provider: LoginProviderId, name: string];
    res: LoginActionResult;
  };
}

export interface GmuxLoginsExtras {
  logins: {
    list(): Promise<LoginsSnapshot>;
    add(provider: LoginProviderId, name: string): Promise<LoginActionResult>;
    choose(
      provider: LoginProviderId,
      name: string | null
    ): Promise<LoginActionResult>;
    remove(provider: LoginProviderId, name: string): Promise<LoginActionResult>;
    /**
     * Subscribe to the unasked-for change push (Phase 211). Returns its own
     * unsubscribe.
     *
     * REQUIRED, like every installed bridge member: the one preload provides
     * the whole `logins` object or none of it, so feature detection is on the
     * object and not on this member. The renderer still reads it through
     * optional chaining, which is what protects a preload with no `logins` at
     * all rather than a `logins` missing one member.
     */
    onChanged(cb: () => void): () => void;
  };
}
