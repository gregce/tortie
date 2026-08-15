/**
 * The preload's ONLY door to Electron's IPC primitives (standing guardrail 1,
 * enforced by src/shared/__tests__/ipc-single-bridge.test.ts). The domain
 * modules beside this file compose their surfaces exclusively from these four
 * helpers; none of them touches `ipcRenderer` directly.
 */

import { ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  AllEventChannel,
  AllEventPayloadMap,
  GmuxInvokeChannel,
  GmuxInvokeReq,
  GmuxInvokeRes,
  Unsubscribe
} from '../shared/ipc';

/**
 * THE typed wrapper over ipcRenderer.invoke — spans every channel in
 * GmuxInvokeChannelMap (frozen + all appended extensions).
 */
export function invoke<C extends GmuxInvokeChannel>(
  channel: C,
  ...args: GmuxInvokeReq<C>
): Promise<GmuxInvokeRes<C>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<GmuxInvokeRes<C>>;
}

/**
 * THE typed wrapper over ipcRenderer.on — the event-half mirror of `invoke`
 * above, and the only place a static event channel is subscribed.
 *
 * Typed over `AllEventPayloadMap` (guardrail 1, Phase 16): it used to span
 * only the frozen `EventPayloadMap` three, so the other seven channels were
 * hand-written blocks here with the payload asserted by annotation. Every
 * static channel now states its payload once, in src/shared/ipc, and both
 * ends are checked against it.
 *
 * The per-session/per-search TEMPLATE channels (term:data/exit, the search
 * and clone streams) go through `onTemplateChannel` below: their channel name
 * is computed at call time, so there is no key for a map to hold.
 */
export function on<C extends AllEventChannel>(
  channel: C,
  cb: (...payload: AllEventPayloadMap[C]) => void
): Unsubscribe {
  const listener = (_e: IpcRendererEvent, ...payload: unknown[]): void => {
    cb(...(payload as AllEventPayloadMap[C]));
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

/**
 * Subscribe to a TEMPLATE channel — one whose name is computed per session,
 * per search or per clone (`term:data:<id>`, `search:results:<id>`, ...).
 * Every template payload is a single argument, which is what keeps this
 * signature honest. The caller names the payload type; the contract's channel
 * builders (termDataChannel, searchResultsChannel, ...) name the channel.
 */
export function onTemplateChannel<Payload>(
  channel: string,
  cb: (payload: Payload) => void
): Unsubscribe {
  const listener = (_e: IpcRendererEvent, payload: Payload): void => {
    cb(payload);
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

/**
 * Fire-and-forget send on a TEMPLATE channel (terminal input and the
 * flow-control acks). Static event channels are main → renderer only, so the
 * static half has no send counterpart.
 */
export function sendOnChannel(channel: string, payload: unknown): void {
  ipcRenderer.send(channel, payload);
}
