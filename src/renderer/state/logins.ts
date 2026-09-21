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
import type {
  LoginProviderId,
  LoginRefusalWhy,
  LoginsSnapshot
} from '@shared/logins';
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

/**
 * Which of the two things a too-large switch did (Phase 287).
 *
 * `'refused'` is a switch that did not happen: the agent's keychain entry for
 * the chosen login cannot take the sign in Tortie kept, so nothing was put
 * back. `'chosen'` is a switch that STOOD, with the running default session
 * deliberately left where it was, because the entry that session reads cannot
 * take the sign in either. Since Phase 304 Tortie's own copy is a sealed file
 * that refuses nothing for size, so the one store either outcome is about is
 * the agent's.
 */
export type LoginTooLargeOutcome = 'refused' | 'chosen';

/**
 * Who is told that a switch met the too-large refusal (Phase 287).
 *
 * IT IS A SECOND LISTENER RATHER THAN A FLAG ON THE FIRST, because the two say
 * different sentences and only one of them may be said for one click. The
 * sessions slice installs `./login-switch`'s `sayLoginTooLarge` here, beside
 * `offerRestartNow`, for the same reason that one is installed rather than
 * imported: this module is reached from the app store and an import back would
 * close a runtime cycle.
 */
let onTooLarge:
  | ((
      provider: LoginProviderId,
      chosen: string,
      outcome: LoginTooLargeOutcome
    ) => void)
  | null = null;

export function setLoginTooLargeListener(
  listener:
    | ((
        provider: LoginProviderId,
        chosen: string,
        outcome: LoginTooLargeOutcome
      ) => void)
    | null
): void {
  onTooLarge = listener;
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
    const { ok, why } = await act((api) => api.choose(provider, name));
    // PHASE 287. ONE SWITCH SAYS ONE THING. A choose that met the too-large
    // refusal has its own sentence for each of its two outcomes, and the
    // switched sentence is not either of them: a refused switch moved nothing,
    // and a switch that stood left the running session alone on purpose. Saying
    // both would be two toasts that disagree about the same click.
    // The reason is named rather than merely present, so a reason added later
    // gets its own arm instead of inheriting this sentence.
    if (why === 'too-large' && name !== null) {
      if (onTooLarge !== null) onTooLarge(provider, name, ok ? 'chosen' : 'refused');
      return ok;
    }
    // A CREDENTIAL MOVED, so the sessions it reached are offered a restart.
    // Choosing the default moves nothing, and so does a row that restores
    // nothing, and a line about nothing is what the operator refused.
    if (ok && name !== null && row !== undefined && row.restores && onSwitched !== null) {
      onSwitched(provider, name);
    }
    return ok;
  },

  async add(provider, name): Promise<boolean> {
    return (await act((api) => api.add(provider, name))).ok;
  },

  async remove(provider, name): Promise<boolean> {
    return (await act((api) => api.remove(provider, name))).ok;
  }
}));

/**
 * One change, its answer and its refusal, written once.
 *
 * Main answers every change with the whole list, so there is no second read
 * and no window in which a surface draws a stale set. A refusal carries the
 * sentence main wrote and leaves the list exactly as it was.
 *
 * PHASE 287. IT HANDS BACK THE NAMED REASON BESIDE THE ANSWER, and `problem` is
 * left exactly as it was: `result.ok` decides it, whatever `why` says. A switch
 * that STOOD is not a refusal, and leaving its sentence in `problem` would park
 * it under the Add login dialog's name field, which that dialog does not clear
 * when it opens.
 */
function act(
  run: (api: NonNullable<ReturnType<typeof gmuxBridge>>['logins']) => Promise<{
    ok: boolean;
    reason?: string;
    why?: LoginRefusalWhy;
    snapshot: LoginsSnapshot;
  }>
): Promise<{ ok: boolean; why?: LoginRefusalWhy }> {
  const api = gmuxBridge()?.logins;
  if (api === undefined) {
    useLogins.setState({ available: false });
    return Promise.resolve({ ok: false });
  }
  if (useLogins.getState().busy) return Promise.resolve({ ok: false });
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
      return result.why === undefined
        ? { ok: result.ok }
        : { ok: result.ok, why: result.why };
    })
    .catch(() => ({ ok: false }))
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

