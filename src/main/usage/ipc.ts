/**
 * The ONE `usage:*` registrar (Phase 181), called once from main process boot:
 *
 *     import { registerUsageIpc } from './usage/ipc';
 *     registerUsageIpc(ipcMain);
 *
 * Two channels, and both READ. Neither spawns a process, writes the manifest,
 * touches tmux or sets a session's status. Registering them opens nothing:
 * the service is built on the first call, and while both provider switches
 * are off that first call still opens no keychain, reads no credentials file
 * and makes no request.
 *
 * The payload is numbers, timestamps and a state code. The Codex usage body
 * carries the person's email address, user id and account id at its top level
 * and none of that crosses this pair, because the parser never reads those
 * fields at all.
 */

import type { IpcMain } from 'electron';
import type { UsageSnapshot } from '@shared/usage';
import { EVT_USAGE_CHANGED } from '@shared/ipc';
import { handle } from '../typed-ipc';
import { broadcastEvent } from '../typed-events';
import { getLog } from '../log';
import { getSettings } from '../settings/store';
// PHASE 202. The chosen login per provider. Two pure file reads under
// `<userData>/gmux/logins`; it opens no keychain and spawns nothing.
import { effectiveLogin, loginsRoot } from '../logins';
import { defaultCredentialDeps } from './credentials';
import { createUsageService, type UsageService } from './service';
import { httpsTransport, type UsageTransport } from './transport';

/**
 * Scope "usage" (Phase 35 logging). Every line this domain writes is a
 * provider name and a fixed outcome word. No token, no header, no body and no
 * identifier is ever a field.
 */
const log = getLog('usage');

let service: UsageService | null = null;

/**
 * The harness override (Phase 202), or null in every ordinary launch.
 *
 * It replaces the two things a probe cannot have, being the vendor and the
 * person's keychain, and it replaces nothing else: the poll interval, the
 * stale policy, the ingest rules, the login resolution and every word on the
 * face are the shipped ones. `src/main/harness/usage-fixture.ts` is the only
 * caller, it refuses unless the launch is an isolated harness launch on a
 * harness profile, and it is installed before the first read.
 */
let harness: { transport: UsageTransport; keychain: () => Promise<null> } | null =
  null;

/** Harness only. Called before the service is built; never in a real launch. */
export function setUsageHarnessOverride(
  over: { transport: UsageTransport; keychain: () => Promise<null> } | null
): void {
  harness = over;
  service = null;
}

/** The one service, built on first use. Building it starts nothing. */
export function usageService(): UsageService {
  if (service === null) {
    const credentials = defaultCredentialDeps();
    service = createUsageService({
      credentials:
        harness === null ? credentials : { ...credentials, keychain: harness.keychain },
      transport: harness === null ? httpsTransport : harness.transport,
      settings: () => getSettings().usage,
      // PHASE 202. Which login each meter reads, resolved on every call so a
      // choice made in the hover card is followed within one poll. A build
      // with no logins file answers the default for both providers, which is
      // exactly what Phase 181 read.
      logins: (provider) => {
        try {
          const login = effectiveLogin(loginsRoot(), provider);
          return { name: login.name, dir: login.dir };
        } catch {
          // A userData directory Tortie cannot read is a problem for the whole
          // application rather than one the meter should fail on, and the
          // honest answer here is the person's own default sign in, which is
          // what every install has.
          return { name: null, dir: null };
        }
      },
      now: () => Date.now(),
      log: (event, fields) => log.warn(event, fields),
      // Phase 182. A live tap moved the numbers and nobody asked, so every
      // window is told. The payload is the same one the two reads answer
      // with, being numbers, timestamps and a state code.
      onChanged: (snapshot) => broadcastEvent(EVT_USAGE_CHANGED, snapshot)
    });
  }
  return service;
}

/** Test seam and teardown: forget the held snapshot. */
export function disposeUsageService(): void {
  service = null;
}

/**
 * One form encoded post from a Tortie launched claude session's managed
 * status line (Phase 182).
 *
 * It is called from the loopback server the activity hooks already own, and
 * the `sessionId` it is handed is the one the TOKEN belongs to. Every drop is
 * one log line naming a fixed reason and NEVER a body, a number or a token.
 * Building the service to answer this starts nothing.
 */
export function applyUsageTap(sessionId: string, body: string): void {
  try {
    const outcome = usageService().applyTap(sessionId, body);
    if (outcome === 'applied') return;
    // `off` and `duplicate` are EXPECTED drops rather than incidents, and a
    // by design outcome is logged at debug.
    //
    // `off` is a session that was launched while the switch was on and goes
    // on running the script after it is turned off, so every post it makes is
    // dropped by a refusal that is working.
    //
    // `duplicate` is the one rule 5 describes in its own comment, being a long
    // turn and two panes on one login. It is ROUTINE rather than rare, because
    // the script throttles to one post per pane per fifteen seconds while the
    // dedupe window is thirty, so an idle pane whose numbers have not moved
    // duplicates every second post for as long as it is open. Measured at the
    // shipped cadence on 2026-09-01: 120 lines an hour from ONE pane.
    if (outcome === 'off' || outcome === 'duplicate') {
      log.debug('usage.tap.dropped', { reason: outcome });
      return;
    }
    // The rest are worth seeing, and worth seeing ONCE.
    if (loggedTapOutcomes.has(outcome)) return;
    loggedTapOutcomes.add(outcome);
    log.warn('usage.tap.dropped', { reason: outcome });
  } catch {
    /* a tap is a convenience and may never be the thing that breaks a turn */
  }
}

/**
 * One line per reason per process, for the drops that reach this far.
 *
 * The bound `hooks.ts` put on the PRE token path does not cover this one. A
 * post carrying a real token is not refused by the route at all: it is
 * answered, and it is the SERVICE that drops it, here. Two of those outcomes
 * repeat for the life of the session rather than happening once, and neither
 * needs an attacker.
 *
 * Measured on 2026-09-01 at the shipped cadence of one post per pane per
 * fifteen seconds: a session logged in under a second `CLAUDE_CONFIG_DIR`
 * wrote 240 `account` lines an hour and never stopped. The real line through
 * the real envelope builder is 142 bytes, so 29,538 of them evict `app.log`
 * and `app.log.1` both, which is about five days for that one pane. A claude
 * release that changed the payload's shape would do the same through `shape`.
 * Bounded, this path's whole lifetime cost is three lines.
 */
const loggedTapOutcomes = new Set<string>();

/** Test seam: forget which outcomes have been logged. */
export function resetUsageTapLog(): void {
  loggedTapOutcomes.clear();
}

export function registerUsageIpc(ipc: IpcMain): void {
  handle(ipc, 'usage:read', (): Promise<UsageSnapshot> => usageService().read());
  handle(ipc, 'usage:refresh', (): Promise<UsageSnapshot> =>
    usageService().refresh()
  );
}
