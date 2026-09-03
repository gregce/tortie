/**
 * The logins store (Phase 202): which vendor sign ins Tortie knows, and which
 * one each provider's next session runs under.
 *
 * ONE STORE FOR EVERY SURFACE, being the meter's hover card in this window and
 * the Settings window's own Agents page, which are two renderers and therefore
 * two copies of this. Neither polls. A login set changes only when a person
 * changes it, so the list is read when a surface is about to draw it and after
 * every change, and never on a timer.
 *
 * NOTHING HERE HOLDS A PATH. Main answers with names, whether each login has a
 * credential yet, and which one is chosen. Where a credential lives is a main
 * process fact and stays there, so nothing on this side can reach a screenshot
 * or a report.
 *
 * A BUILD WHOSE PRELOAD HAS NO `logins` MEMBER draws no login row anywhere.
 * That is the same feature detection every other bridge member gets, and it is
 * what keeps an older preload from throwing inside a hover card.
 */

import { create } from 'zustand';
import type { LoginProviderId, LoginsSnapshot } from '@shared/logins';
import { DEFAULT_LOGIN_NAME, LOGIN_PROVIDERS, defaultLoginRow, sameLoginName } from '@shared/logins';
import { gmuxBridge } from '../bridge';

/**
 * Who is told that a switch put a credential back (Phase 211, fix round).
 *
 * The sessions slice installs `./login-switch`'s `offerRestartNow` here at its
 * creation, so a choose made from ANY surface ends with the same sentence and
 * the same `Restart now`. It is a listener rather than an import because the
 * app store reaches this module through `./sign-in-watch`, and an import back
 * would close a runtime cycle. Nothing is said while none is installed, which
 * is the shape of a test that opens no window.
 */
let onSwitched: ((provider: LoginProviderId, chosen: string) => void) | null = null;

export function setLoginSwitchedListener(
  listener: ((provider: LoginProviderId, chosen: string) => void) | null
): void {
  onSwitched = listener;
}

/** Every install starts here: one default login per provider, chosen. */
export function seedLoginsSnapshot(): LoginsSnapshot {
  return {
    logins: LOGIN_PROVIDERS.map((p) => defaultLoginRow(p, true, true)),
    problems: [],
    at: 0
  };
}

export interface LoginsStoreState {
  snapshot: LoginsSnapshot;
  /** False on a build whose preload has no `logins` member. */
  available: boolean;
  /** A change is in flight. Controls draw disabled rather than double firing. */
  busy: boolean;
  /** The last refusal main answered, or null. One sentence, already written. */
  problem: string | null;
  /**
   * Read the list. Safe to call from every surface, as often as it likes:
   * callers that overlap share ONE read rather than issuing one each.
   */
  load(): Promise<void>;
  /** Choose which login this provider's NEXT sessions run under. */
  choose(provider: LoginProviderId, name: string | null): Promise<boolean>;
  /** Create an empty directory for a new login. Starts nothing. */
  add(provider: LoginProviderId, name: string): Promise<boolean>;
  /** Forget a login and delete the directory Tortie made for it. */
  remove(provider: LoginProviderId, name: string): Promise<boolean>;
}

/** The read in flight, shared by every caller that arrives while it runs. */
let loading: Promise<void> | null = null;

export const useLogins = create<LoginsStoreState>((set) => ({
  snapshot: seedLoginsSnapshot(),
  available: true,
  busy: false,
  problem: null,

  load(): Promise<void> {
    const api = gmuxBridge()?.logins;
    if (api === undefined) {
      set({ available: false });
      return Promise.resolve();
    }
    // ONE READ FOR EVERY CALLER THAT OVERLAPS. The Agents page draws a block
    // per provider and each loads on mount, and StrictMode mounts twice, so a
    // single visit issued four reads of the same thing. They are not free:
    // main reads every store behind each one.
    if (loading !== null) return loading;
    const run = api
      .list()
      .then((snapshot) => {
        set({ snapshot });
      })
      .catch(() => {
        // A read that failed leaves the last list on screen. There is nothing
        // a person can do about it here and flapping the card would be noise.
      })
      .finally(() => {
        if (loading === run) loading = null;
      });
    loading = run;
    return run;
  },

  async choose(provider, name): Promise<boolean> {
    const row =
      name === null
        ? undefined
        : useLogins
            .getState()
            .snapshot.logins.find((l) => l.provider === provider && sameLoginName(l.name, name));
    const ok = await act((api) => api.choose(provider, name));
    // A CREDENTIAL MOVED, so the sessions it reached are offered a restart.
    // Choosing the default moves nothing, and so does a row that restores
    // nothing, and a line about nothing is what the operator refused.
    if (ok && name !== null && row !== undefined && row.restores && onSwitched !== null) {
      onSwitched(provider, name);
    }
    return ok;
  },

  async add(provider, name): Promise<boolean> {
    return act((api) => api.add(provider, name));
  },

  async remove(provider, name): Promise<boolean> {
    return act((api) => api.remove(provider, name));
  }
}));

/**
 * One change, its answer and its refusal, written once.
 *
 * Main answers every change with the whole list, so there is no second read
 * and no window in which a surface draws a stale set. A refusal carries the
 * sentence main wrote and leaves the list exactly as it was.
 */
function act(
  run: (api: NonNullable<ReturnType<typeof gmuxBridge>>['logins']) => Promise<{
    ok: boolean;
    reason?: string;
    snapshot: LoginsSnapshot;
  }>
): Promise<boolean> {
  const api = gmuxBridge()?.logins;
  if (api === undefined) {
    useLogins.setState({ available: false });
    return Promise.resolve(false);
  }
  if (useLogins.getState().busy) return Promise.resolve(false);
  // A CHANGE DROPS THE READ IN FLIGHT. Main answers a change with the whole
  // list, and a read issued before the change landing after it would put the
  // world as it was back on the screen.
  loading = null;
  useLogins.setState({ busy: true, problem: null });
  return run(api)
    .then((result) => {
      useLogins.setState({
        snapshot: result.snapshot,
        problem: result.ok ? null : (result.reason ?? null)
      });
      return result.ok;
    })
    .catch(() => false)
    .finally(() => useLogins.setState({ busy: false }));
}

/**
 * The unasked-for change (Phase 211). A `/login` in a session, or the vendor's
 * own rotation, changes a store, and main pushes `logins:changed` so every
 * surface re-reads through this one store without a person doing anything.
 *
 * SUBSCRIBED ONCE, at module load, and only when the preload carries the member,
 * which is the same feature detection every other bridge member gets. The read
 * in flight is dropped first so a list issued before the change is not the one
 * that lands on the screen.
 */
const changePush = gmuxBridge()?.logins;
if (changePush?.onChanged !== undefined) {
  changePush.onChanged(() => {
    loading = null;
    void useLogins.getState().load();
  });
}

/** The chosen login's name for one provider, out of what is held. */
export function chosenOf(
  snapshot: LoginsSnapshot,
  provider: LoginProviderId
): string {
  return (
    snapshot.logins.find((l) => l.provider === provider && l.chosen)?.name ??
    DEFAULT_LOGIN_NAME
  );
}

/** Every login of one provider, default first. */
export function loginsOf(
  snapshot: LoginsSnapshot,
  provider: LoginProviderId
): LoginsSnapshot['logins'] {
  return snapshot.logins.filter((l) => l.provider === provider);
}

