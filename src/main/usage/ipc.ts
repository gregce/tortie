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
import { handle } from '../typed-ipc';
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
      log: (event, fields) => log.warn(event, fields)
    });
  }
  return service;
}

/** Test seam and teardown: forget the held snapshot. */
export function disposeUsageService(): void {
  service = null;
}

export function registerUsageIpc(ipc: IpcMain): void {
  handle(ipc, 'usage:read', (): Promise<UsageSnapshot> => usageService().read());
  handle(ipc, 'usage:refresh', (): Promise<UsageSnapshot> =>
    usageService().refresh()
  );
}
