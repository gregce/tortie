/**
 * The usage contract (Phase 181): the meter's ONE channel pair.
 *
 * `usage:read` answers with whatever main already holds and starts a fetch
 * only when the poll interval has elapsed and the provider is switched on.
 * `usage:refresh` is the refresh control: it skips the interval but never the
 * floor and never a `Retry-After` main is still honouring.
 *
 * Both channels READ. Neither spawns a process, writes the manifest, touches
 * tmux or sets a session's status, and neither can name a destination: the two
 * vendor hosts are compiled in and no field of either request reaches them.
 * While a provider's switch is off, `usage:read` opens no keychain, opens no
 * credentials file and makes no request.
 *
 * The payload carries numbers, timestamps and a state code. The Codex usage
 * body carries the person's email address, user id and account id; none of
 * that is in `UsageSnapshot` and none of it crosses this pair.
 *
 * PHASE 182 ADDED ONE EVENT and no invoke. The live tap arrives when a
 * person's own turn ends rather than when a window asks, so there is nothing
 * for a renderer to poll: main broadcasts the snapshot it already holds. The
 * event carries the SAME payload the two reads answer with, so a window that
 * ignores it is fifteen minutes behind and never wrong.
 *
 * MAIN: src/main/usage/ipc.ts, the one `usage:*` registrar.
 */

import type { UsageSnapshot } from '../usage';

/** Main → renderers (ALL windows): the held usage snapshot changed. */
export const EVT_USAGE_CHANGED = 'usage:changed' as const;

/**
 * Payload of EVT_USAGE_CHANGED (broadcast to EVERY window).
 *
 * Broadcast ONLY when something changed that nobody asked for, which today is
 * exactly one thing: a live post from a Tortie launched claude session's
 * managed status line. The answer to a read is not broadcast, because the
 * window that asked already has it.
 */
export interface UsageEventPayloadMap {
  'usage:changed': [snapshot: UsageSnapshot];
}

export interface UsageInvokeChannelMap {
  /** The held snapshot; fetches only when a switched on provider is due. */
  'usage:read': { req: []; res: UsageSnapshot };
  /** The refresh control. Skips the interval, honours the floor and Retry-After. */
  'usage:refresh': { req: []; res: UsageSnapshot };
}

export interface GmuxUsageExtras {
  usage: {
    read(): Promise<UsageSnapshot>;
    refresh(): Promise<UsageSnapshot>;
    /** Subscribe to the live snapshot. Returns its own unsubscribe. */
    onChanged(cb: (snapshot: UsageSnapshot) => void): () => void;
  };
}
