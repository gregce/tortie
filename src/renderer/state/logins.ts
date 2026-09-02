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
import { DEFAULT_LOGIN_NAME, LOGIN_PROVIDERS, defaultLoginRow } from '@shared/logins';
import { gmuxBridge } from '../bridge';

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
  /** Read the list. Safe to call from every surface, as often as it likes. */
  load(): Promise<void>;
  /** Choose which login this provider's NEXT sessions run under. */
  choose(provider: LoginProviderId, name: string | null): Promise<boolean>;
  /** Create an empty directory for a new login. Starts nothing. */
  add(provider: LoginProviderId, name: string): Promise<boolean>;
  /** Forget a login and delete the directory Tortie made for it. */
  remove(provider: LoginProviderId, name: string): Promise<boolean>;
}

export const useLogins = create<LoginsStoreState>((set) => ({
  snapshot: seedLoginsSnapshot(),
  available: true,
  busy: false,
  problem: null,

  async load(): Promise<void> {
    const api = gmuxBridge()?.logins;
    if (api === undefined) {
      set({ available: false });
      return;
    }
    try {
      set({ snapshot: await api.list() });
    } catch {
      // A read that failed leaves the last list on screen. There is nothing a
      // person can do about it here and flapping the card would be noise.
    }
  },

  async choose(provider, name): Promise<boolean> {
    return act((api) => api.choose(provider, name));
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
