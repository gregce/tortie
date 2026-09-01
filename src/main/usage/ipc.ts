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
import { defaultCredentialDeps } from './credentials';
import { createUsageService, type UsageService } from './service';
import { httpsTransport } from './transport';

/**
 * Scope "usage" (Phase 35 logging). Every line this domain writes is a
 * provider name and a fixed outcome word. No token, no header, no body and no
 * identifier is ever a field.
 */
const log = getLog('usage');

let service: UsageService | null = null;

/** The one service, built on first use. Building it starts nothing. */
export function usageService(): UsageService {
  if (service === null) {
    service = createUsageService({
      credentials: defaultCredentialDeps(),
      transport: httpsTransport,
      settings: () => getSettings().usage,
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
    // `off` is the expected drop and not an incident: a session launched
    // while the switch was on goes on running the script after it is turned
    // off, and every post it makes is dropped. Logging that at warn would
    // write a line every fifteen seconds per pane for a working refusal.
    if (outcome === 'off') log.debug('usage.tap.dropped', { reason: outcome });
    else log.warn('usage.tap.dropped', { reason: outcome });
  } catch {
    /* a tap is a convenience and may never be the thing that breaks a turn */
  }
}

export function registerUsageIpc(ipc: IpcMain): void {
  handle(ipc, 'usage:read', (): Promise<UsageSnapshot> => usageService().read());
  handle(ipc, 'usage:refresh', (): Promise<UsageSnapshot> =>
    usageService().refresh()
  );
}
