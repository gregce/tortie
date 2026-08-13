/**
 * session-ipc.ts — the one question the renderer may ask about a session's
 * launch context (Phase 22, research 29 §8.3).
 *
 * ONE CHANNEL, READ ONLY, AND THE SHORTNESS IS THE POINT.
 *
 * `context:sessionSnapshot` hands back the record of what one session's
 * configuration was when it launched, or null when there is none. It reads a
 * column. It walks no directory, spawns nothing, starts no server and writes
 * nothing. There is deliberately no channel that writes a snapshot, because
 * the snapshot is written once at launch by the launch paths, and a channel
 * the renderer could call would make "written once" a convention instead of a
 * property.
 *
 * ## Why the comparison is not done here
 *
 * The readout marks rows as changed, added or removed by comparing the
 * snapshot against the CURRENT resolved set. Main could do that and return the
 * answer. It does not, for one reason: the Context view has already resolved
 * the current set in order to draw itself, so doing it again in main would
 * walk every configuration root a second time to produce data the renderer is
 * already holding. `diffContextSnapshot` in `src/shared/context-snapshot.ts`
 * is a pure function over two lists, so the renderer calls it with the rows it
 * has and the snapshot this channel returned.
 *
 * That also keeps the comparison in one place. Two implementations of "did
 * this change" is how the panel and the detail card start disagreeing about
 * the same file.
 *
 * INTEGRATION SEAM. Research 29 §12 asks for ONE `context:*` registrar. If the
 * Context view's builder has added `registerContextIpc`, this function should
 * be called from inside it rather than separately from `src/main/index.ts`, so
 * the guardrail holds. It takes its store as an argument for exactly that
 * reason: it can be called from anywhere that has one.
 */

import type { IpcMain } from 'electron';
import { handle } from '../typed-ipc';
import type { ContextSnapshot } from '@shared/context-snapshot';

/** What this registrar needs. A reader, and nothing that can write. */
export interface ContextSnapshotReader {
  getSession(id: string): { contextSnapshot?: ContextSnapshot } | undefined;
}

/**
 * Register `context:sessionSnapshot`. Call once during main-process boot.
 *
 * `getStore` is a function rather than a store because the manifest is opened
 * during boot and the registrars are installed before it finishes, which is
 * the same shape every other registrar in this codebase uses. It returns null
 * before the store exists, and the channel then answers null, which the
 * readout renders as its unrecorded sentence rather than as an error.
 */
export function registerContextSnapshotIpc(
  ipc: IpcMain,
  getStore: () => Promise<ContextSnapshotReader | null>
): void {
  handle(ipc, 'context:sessionSnapshot', async (_e, sessionId) => {
    const store = await getStore();
    if (store === null) return null;
    // A missing row answers null, the same as a row with no snapshot. The two
    // states are the same sentence to the reader, which is that Tortie has no
    // record of what this session loaded, so distinguishing them would put a
    // difference on screen that means nothing to them.
    return store.getSession(sessionId)?.contextSnapshot ?? null;
  });
}
