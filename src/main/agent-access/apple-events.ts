/**
 * Phase 363 — the Apple Events adapter over the existing agent API.
 *
 * A THIN LAYER. It loads the first-party addon (src/native/apple-events.mm),
 * hands each admitted request text to the ONE installed dispatcher the socket
 * also uses (`dispatchInstalledAgentAccess`), and publishes the unmodified
 * response for the addon to return from `request result`. It validates no
 * request, names no operation, reads no session and chooses no policy: the
 * switch, the caller checks and every handler are the dispatcher's. A result
 * read never reruns anything; one execution per submitted request.
 */
import { app } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  AGENT_ACCESS_MAX_RESPONSE_BYTES,
  type AgentAccessResponse
} from '@shared/agent-access';
import { getLog } from '../log';
import { dispatchInstalledAgentAccess } from './service';

const log = getLog('agent-access');

/** The addon's whole surface. Text and ids only. */
export interface AppleEventsNative {
  install(onRequest: (id: string, text: string) => void, ttlMs?: number): boolean;
  isLive(id: string): boolean;
  complete(id: string, responseText: string): boolean;
  shutdown(): void;
  jobCount(): number;
}

type Dispatch = (
  line: string,
  opts: { isLive: () => boolean }
) => Promise<AgentAccessResponse>;

const UNAVAILABLE: AgentAccessResponse = {
  version: 1,
  ok: false,
  error: { code: 'unavailable', message: 'Unavailable.' }
};

/** The response text the addon stores: the exact API response, one line. */
export function responseText(response: AgentAccessResponse): string {
  let text: string;
  try {
    text = JSON.stringify(response);
  } catch {
    text = JSON.stringify(UNAVAILABLE);
  }
  if (Buffer.byteLength(text, 'utf8') > AGENT_ACCESS_MAX_RESPONSE_BYTES) {
    text = JSON.stringify(UNAVAILABLE);
  }
  return text;
}

export interface AppleEventsAdapter {
  shutdown(): void;
}

/** Register the addon's callback and route each request to the dispatcher. */
export function startAppleEventsAdapter(
  native: AppleEventsNative,
  dispatch: Dispatch,
  ttlMs?: number
): AppleEventsAdapter {
  const run = (id: string, text: string): void => {
    void (async () => {
      let response: AgentAccessResponse;
      try {
        response = await dispatch(text, { isLive: () => native.isLive(id) });
      } catch {
        response = UNAVAILABLE;
      }
      // A job that expired or was shut down while this ran is refused here:
      // late completion is ignored by the addon.
      native.complete(id, responseText(response));
    })();
  };
  native.install((id, text) => {
    // Never act on a job the addon no longer holds.
    if (!native.isLive(id)) return;
    run(id, text);
  }, ttlMs);
  return { shutdown: () => native.shutdown() };
}

/** Where the signed addon sits: outside the asar in a package. */
export function appleEventsAddonPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'native', 'apple-events.node')
    : join(app.getAppPath(), 'out', 'native', 'apple-events.node');
}

let adapter: AppleEventsAdapter | null = null;

/** Install on macOS once the app is ready. A missing addon is logged and skipped. */
export function installAppleEvents(): void {
  if (process.platform !== 'darwin' || adapter !== null) return;
  const path = appleEventsAddonPath();
  if (!existsSync(path)) {
    log.info('apple events addon missing', { outcome: 'no-addon' });
    return;
  }
  try {
    const mod = { exports: {} as unknown } as NodeJS.Module;
    process.dlopen(mod, path);
    adapter = startAppleEventsAdapter(
      mod.exports as AppleEventsNative,
      dispatchInstalledAgentAccess
    );
    log.info('apple events adapter installed', { outcome: 'installed' });
  } catch {
    log.info('apple events adapter failed', { outcome: 'load-failed' });
  }
}

/** Synchronous: unregister handlers, refuse admission, clear jobs. */
export function shutdownAppleEvents(): void {
  const owned = adapter;
  adapter = null;
  owned?.shutdown();
}
