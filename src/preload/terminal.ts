/**
 * The terminal half of the bridge: the attach byte stream, image/file drop,
 * capture, tmux copy-mode scrolling, and the scrollback limits surface.
 * Moved verbatim from the single preload file (Phase 42 stage 2).
 */

import { webUtils } from 'electron';
import type {
  GmuxCaptureExtras,
  GmuxDropExtras,
  GmuxScrollbackExtras,
  GmuxScrollExtras,
  InstalledTermApi,
  TermExitPayload
} from '../shared/ipc';
import {
  EVT_SCROLLBACK_NOTICE,
  termAckChannel,
  termDataChannel,
  termExitChannel,
  termInputChannel
} from '../shared/ipc';
import { invoke, on, onTemplateChannel, sendOnChannel } from './bridge';

/**
 * term surface = frozen GmuxApi['term'] + the appended optional stream
 * extras (flow-control acks, unexpected-exit notices) that the terminal
 * renderer feature-detects.
 */
export const term: InstalledTermApi = {
  onData: (sessionId, cb) =>
    onTemplateChannel<Uint8Array>(termDataChannel(sessionId), cb),
  sendInput: (sessionId, data) => {
    sendOnChannel(termInputChannel(sessionId), data);
  },
  ack: (sessionId, bytes) => {
    sendOnChannel(termAckChannel(sessionId), bytes);
  },
  onExit: (sessionId, cb) =>
    onTemplateChannel<TermExitPayload>(termExitChannel(sessionId), cb)
};

/**
 * drop surface (Phase 12 item 8) — file/image drop + ⌘V.
 *
 * `pathForFile` MUST live in the preload: `webUtils` is a renderer-side
 * module and does not exist in main. It returns '' (never throws) for a File
 * with no filesystem path — a browser drag or a synthesized File — which is
 * exactly the discriminator the renderer's acquisition ladder branches on.
 * Never copy/wrap/re-`new File()` a dropped File before calling this.
 */
export const drop: NonNullable<GmuxDropExtras['drop']> = {
  strategies: () => invoke('drop:strategies'),
  prepare: (paths) => invoke('drop:prepare', paths),
  persist: (input) => invoke('drop:persist', input)
};

/** See `drop` above — the webUtils path lookup that rides beside it. */
export function pathForFile(file: File): string {
  try {
    return webUtils.getPathForFile(file);
  } catch {
    return '';
  }
}

/**
 * capture surface (Phase 12 items 1 + 2) — terminal screenshots, the rich
 * clipboard behind Copy as HTML, and the server-side half of Clear. Pixels
 * cross as `Uint8Array`; a data URL of a long capture measured 79 MB.
 */
export const capture: NonNullable<GmuxCaptureExtras['capture']> = {
  viewport: (input) => invoke('capture:viewport', input),
  image: (input) => invoke('capture:image', input),
  saveLast: () => invoke('capture:saveLast'),
  pane: (input) => invoke('capture:pane', input),
  writeRich: (input) => invoke('clipboard:writeRich', input),
  paste: () => invoke('clipboard:paste'),
  clearHistory: (tmuxName) => invoke('terminal:clearHistory', tmuxName)
};

/**
 * scroll surface (Phase 12.3) — tmux copy-mode over the session's real
 * history. `tmux attach` parks xterm.js in its alternate buffer, where it has
 * no scrollback of its own, so this is the ONLY scroll surface a pane has.
 */
export const scroll: NonNullable<GmuxScrollExtras['scroll']> = {
  state: (input) => invoke('terminal:scrollState', input),
  by: (input) => invoke('terminal:scrollBy', input),
  to: (input) => invoke('terminal:scrollTo', input),
  live: (sessionId) => invoke('terminal:scrollLive', sessionId)
};

/**
 * scrollback surface (Phase 13.7). Three PULLS and one rare event — there is
 * no poll and no subscription to a figure, because ZEN-OF-TORTIE forbids a
 * number that rises on its own. `onNotice` carries only crossed thresholds.
 */
export const scrollback: NonNullable<GmuxScrollbackExtras['scrollback']> = {
  stats: () => invoke('scrollback:stats'),
  session: (sessionId) => invoke('scrollback:session', sessionId),
  report: () => invoke('scrollback:report'),
  onNotice: (cb) => on(EVT_SCROLLBACK_NOTICE, cb)
};
