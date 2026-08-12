/**
 * THE typed main→renderer event senders — the send-half mirror of the one
 * typed `handle` in ./typed-ipc and the one typed `on` in src/preload/index.ts.
 *
 * Guardrail 1, event half (Phase 16). Two things were wrong before this file
 * existed. First, seven of the ten static event channels had no payload type
 * at all, so `webContents.send(EVT_X, whatever)` was checked against nothing
 * at either end. Second, the "send to every window that still exists" loop had
 * been written out four times — in sessions/core.ts, git/ipc.ts,
 * symbols/ipc.ts and settings/ipc.ts — which is the shape a rule about
 * lifetimes takes when it has no home (a destroyed window's webContents throws
 * on send, and only the loop's own `isDestroyed()` guard stops it).
 *
 * Both halves are fixed here: every static channel's payload is stated once in
 * `AllEventPayloadMap` (src/shared/ipc.ts), and every broadcast goes through
 * one function. A registrar that needs to push an event imports THIS; it does
 * not write the loop again.
 *
 * NOT here, deliberately: the four TEMPLATE channels (`term:data:<id>`,
 * `term:exit:<id>`, the per-search results stream). Their channel name is
 * computed per session or per search, so there is no key for a payload map to
 * hold, and they are point-to-point sends to one known `WebContents` rather
 * than broadcasts. They stay where they are, typed by their own call sites.
 */

import { BrowserWindow } from 'electron';
import type { WebContents } from 'electron';
import type { AllEventChannel, AllEventPayloadMap } from '@shared/ipc';

/** Send one static event to one renderer. */
export function sendEvent<C extends AllEventChannel>(
  target: WebContents,
  channel: C,
  ...payload: AllEventPayloadMap[C]
): void {
  target.send(channel, ...payload);
}

/**
 * Send one static event to EVERY live window.
 *
 * gmux is a single-window app, but a reload, a detached devtools window or the
 * Settings window can all mean more than one at a time — and the Settings
 * window is the reason `settings:changed` must reach all of them, not just the
 * sender.
 */
export function broadcastEvent<C extends AllEventChannel>(
  channel: C,
  ...payload: AllEventPayloadMap[C]
): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...payload);
    }
  }
}
