/**
 * THE typed `ipcMain.handle` wrapper.
 *
 * The mirror of the one typed invoke in src/preload/index.ts: both are
 * generic over `GmuxInvokeChannelMap`, the single superset map in
 * src/shared/ipc.ts, so a channel's request and response types are stated
 * once and both ends are checked against them.
 *
 * Guardrail 3/4 (Phase 12 integration): four main-side modules had each
 * grown their own copy of this ten-line function — fs/ipc and git/ipc over
 * `ExtendedInvokeChannelMap`, git/depth-ipc and capture/ipc over
 * `GmuxInvokeChannelMap`. The two maps were never rivals: the Gmux map is
 * the transitive superset (…⊇ Complete ⊇ Full ⊇ All ⊇ Extended), so one
 * wrapper types every channel any of them registered. A registrar that needs
 * a channel imports THIS; it does not start a fifth generation.
 */

import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type {
  GmuxInvokeChannel,
  GmuxInvokeReq,
  GmuxInvokeRes
} from '@shared/ipc';
import { assertTrustedIpcSender } from './security/trusted-window';

export function handle<C extends GmuxInvokeChannel>(
  ipc: IpcMain,
  channel: C,
  fn: (
    event: IpcMainInvokeEvent,
    ...args: GmuxInvokeReq<C>
  ) => Promise<GmuxInvokeRes<C>> | GmuxInvokeRes<C>
): void {
  ipc.handle(channel, (event, ...args) => {
    // Phase 42 stage 1: every invoke channel answers only the windows Tortie
    // created (src/main/security/trusted-window.ts). One check here covers
    // all of them, because this wrapper is THE one invoke registrar
    // (guardrail: ipc-single-bridge.test.ts).
    assertTrustedIpcSender(event, channel);
    return fn(event, ...(args as GmuxInvokeReq<C>));
  });
}
