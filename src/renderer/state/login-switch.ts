/**
 * What follows a login switch: the sentence, and `Restart now` beside it
 * (Phase 211, moved here by the fix round).
 *
 * WHY IT IS ITS OWN MODULE. Two surfaces choose a login, being the meter's
 * card and the Settings list, and the first build put the sentence in the
 * card's own menu handler, so a switch made in Settings got no sentence and no
 * control, and the harness drive, which chooses through the store, could never
 * see the toast at all. A switch is a switch wherever it was picked, so it
 * lives beside the store. It is not IN `./logins.ts` because that module is
 * imported by `./sign-in-watch.ts`, which the sessions slice imports, and a
 * store import from there would close a runtime cycle. The sessions slice
 * installs {@link offerRestartNow} into the logins store through
 * `setLoginSwitchedListener` instead.
 *
 * WHICH SESSIONS. The ones the switch reached, being every live session of the
 * provider under the DEFAULT login, which the default lift wrote, and every one
 * under the CHOSEN login, whose own store was written. A session on some other
 * login was not written and is left alone. "Live" is any session still there
 * to restart, so a session idle at its prompt, which is exactly the one a
 * person restarts, is included; the first build offered the control only to
 * sessions mid turn. A session on another machine is never restarted from
 * here, for the Phase 84 reason.
 *
 * WHAT THE CONTROL DOES. It restarts each of those under the CHOSEN login, so
 * the replacement's row carries the new name and the pane starts under the
 * chosen store. That is the Phase 202 model kept: a session leaves its login
 * only by being started again.
 */

import type { Session } from '@shared/types';
import type { CaptureChoice } from '@shared/ipc';
import type { ToastKind } from './notices-slice';
import type { LoginProviderId } from '@shared/logins';
import { DEFAULT_LOGIN_NAME, sameLoginName } from '@shared/logins';
import {
  LOGIN_RESTART_NOW,
  LOGIN_TOO_LARGE_RUNNING,
  LOGIN_TOO_LARGE_SENTENCE,
  loginSwitchTiming
} from '@shared/login-copy';
import type { LoginTooLargeOutcome } from './logins';

/** A session that is still there to be restarted: not ended, not saved away. */
const LIVE_STATUSES = new Set<Session['status']>(['running', 'idle', 'needs_input']);

/**
 * Is this a macOS build? The switch timing differs by platform: on macOS the
 * vendor caches its keychain read for about half a minute, and everywhere
 * else it re-reads the credential file at once.
 */
const IS_MAC =
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);

/** Did this session run under the default login? Absent, empty and the reserved name all mean yes. */
function onDefaultLogin(login: string | undefined): boolean {
  return login === undefined || login === '' || sameLoginName(login, DEFAULT_LOGIN_NAME);
}

/**
 * The sessions a switch to `chosen` reached, out of every session held.
 * Pure, so the rule can be pinned by a test that opens no window.
 */
export function sessionsReachedBySwitch(
  sessions: readonly Session[],
  provider: LoginProviderId,
  chosen: string
): Session[] {
  return sessions.filter(
    (s) =>
      s.agent === provider &&
      LIVE_STATUSES.has(s.status) &&
      s.machine === undefined &&
      (onDefaultLogin(s.login) || sameLoginName(s.login ?? '', chosen))
  );
}

/** The slice of the app store this needs, stated structurally. */
export interface SwitchNoticeHost {
  sessions: readonly Session[];
  toast(
    kind: ToastKind,
    text: string,
    opts?: { sticky?: boolean; action?: { label: string; run: () => void } }
  ): void;
  restartSession(sessionId: string, options?: CaptureChoice): Promise<void>;
}

/** The sentence a switch ends with, for the platform. */
export function switchedLine(chosen: string, isMac = IS_MAC): string {
  return `${chosen} is switched. ${loginSwitchTiming(isMac)}`;
}

/**
 * The one `Restart now`, built once and offered by both sentences below.
 *
 * It restarts each session under the CHOSEN login, which is the Phase 202 model
 * kept: a session leaves its login only by being started again.
 */
function restartAction(
  host: SwitchNoticeHost,
  reached: readonly Session[]
): { label: string; run: () => void } {
  return {
    label: LOGIN_RESTART_NOW,
    run: () => {
      for (const s of reached) {
        void host.restartSession(s.id, { underChosenLogin: true });
      }
    }
  };
}

/**
 * Say the switch landed, and offer to restart the sessions it reached under
 * the chosen login. Nothing is said when no session was reached.
 */
export function offerRestartNow(
  host: SwitchNoticeHost,
  provider: LoginProviderId,
  chosen: string
): void {
  const reached = sessionsReachedBySwitch(host.sessions, provider, chosen);
  if (reached.length === 0) return;
  host.toast('success', switchedLine(chosen), {
    sticky: true,
    action: restartAction(host, reached)
  });
}

/**
 * Say that a switch met a sign in the agent's own keychain entry cannot take,
 * in the one sentence that is true of what happened (Phase 287; since Phase
 * 304 that entry is the ONLY store that can refuse for size, because Tortie's
 * own copy is a sealed file).
 *
 * EXACTLY ONE TOAST, AND NEVER THE SWITCHED ONE BESIDE IT. The caller is the
 * logins store, which posts this INSTEAD of {@link offerRestartNow} whenever the
 * answer carried the named reason, because a person who clicked once is owed one
 * account of what that click did.
 *
 * `'refused'` moved nothing, so nothing is offered: there is no session to
 * restart into an entry that was not written. `'chosen'` DID switch, so the
 * control is the same one a switch always gets — restarting under the chosen
 * login works, because that login's own entry already holds its account — and
 * the sentence says the outcome before it says what was left undone. The
 * sentence is still posted when no session was reached, unlike the switched
 * one, because the refusal itself is news whether or not anything was running.
 */
export function sayLoginTooLarge(
  host: SwitchNoticeHost,
  provider: LoginProviderId,
  chosen: string,
  outcome: LoginTooLargeOutcome
): void {
  if (outcome === 'refused') {
    // STICKY BY THE SLICE'S OWN DEFAULT, which every error toast gets.
    host.toast('error', LOGIN_TOO_LARGE_SENTENCE);
    return;
  }
  const reached = sessionsReachedBySwitch(host.sessions, provider, chosen);
  host.toast('error', LOGIN_TOO_LARGE_RUNNING, {
    sticky: true,
    ...(reached.length === 0 ? {} : { action: restartAction(host, reached) })
  });
}
