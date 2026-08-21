/**
 * Terminal-surface contract: the attach stream extras (acks, exit
 * notices), image/file drop, capture, tmux copy-mode scrolling, and the
 * scrollback limits surface. Moved verbatim from src/shared/ipc.ts
 * (Phase 42 stage 2).
 */

import type { Unsubscribe } from './base';

// ---------------------------------------------------------------------------
// APPENDED by the attach/terminal stream (new channels/types only — nothing
// above this line was modified).
// ---------------------------------------------------------------------------

/**
 * Per-session flow-control ack (renderer → main, fire-and-forget send).
 * Payload: number — bytes of term:data the renderer has finished writing
 * into xterm. The attach host pauses the PTY when > 256 KB are in flight
 * unacked and resumes once acks bring the window back under 64 KB. If no
 * ack ever arrives (bridge method not wired), the attach host disables flow
 * control for that client after a grace period rather than deadlock.
 */
export const termAckChannel = (sessionId: string): string =>
  `term:ack:${sessionId}`;

/**
 * Per-session attach-client exit notice (main → renderer).
 * Sent ONLY for unexpected exits — the tmux session was killed elsewhere or
 * the tmux server went away. A clean sessions:detach never fires this.
 */
export const termExitChannel = (sessionId: string): string =>
  `term:exit:${sessionId}`;

/** Payload of termExitChannel. */
export interface TermExitPayload {
  sessionId: string;
  /** Exit code of the `tmux attach` client process. */
  exitCode: number;
  /** Signal number when the client died from a signal. */
  signal?: number;
}

/**
 * Extensions to GmuxApi['term']. INTEGRATOR: add these two methods to the
 * `term` object in src/preload/index.ts:.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 *
 *   ack: (sessionId, bytes) =>
 *     ipcRenderer.send(termAckChannel(sessionId), bytes),
 *   onExit: (sessionId, cb) => {
 *     const ch = termExitChannel(sessionId);
 *     const l = (_e: IpcRendererEvent, p: TermExitPayload) => cb(p);
 *     ipcRenderer.on(ch, l);
 *     return () => ipcRenderer.removeListener(ch, l);
 *   }
 *
 * The renderer degrades gracefully when they are absent (no backpressure
 * acks → attach host's grace-period valve; exit notices → falls back to
 * sessions.onStatusChanged('exited')).
 */
export interface GmuxTermStreamExtras {
  /** Ack `bytes` of received term:data as consumed (flow control). */
  ack(sessionId: string, bytes: number): void;
  /** Subscribe to unexpected attach-client exits for a session. */
  onExit(
    sessionId: string,
    cb: (payload: TermExitPayload) => void
  ): Unsubscribe;
}

// ---------------------------------------------------------------------------
// APPENDED by the image-drop stream (Phase 12 item 8, research 16) — new
// channels/types only. The one existing line touched above is the
// GmuxInvokeChannelMap intersection, exactly as its own comment prescribes
// ("future streams intersect their appended map here").
//
// drop:strategies — the per-agent file-reference table, read straight off the
//   main-process agent registry (the table exists ONCE, guardrail 3). Static
//   per build; the renderer primes it at mount and caches it.
// drop:prepare    — stat + classify absolute paths the renderer resolved with
//   webUtils. Directories are branched HERE, not guessed in the renderer, and
//   a filename carrying a newline is copied to a safe name in the drop store.
// drop:persist    — write bytes that have no path of their own (⌘V of raw
//   image data, browser drags) to <userData>/gmux/dropped-images and hand
//   back the absolute path.
//
// PRELOAD (already wired in src/preload/index.ts, guardrail 1 — appended to
// the single typed bridge, no new wrapper generation):
//   pathForFile: (file) => webUtils.getPathForFile(file)   // '' when pathless
//   drop: { strategies, prepare, persist }
// `webUtils` is renderer-side only (it does not exist in main), so
// pathForFile MUST live in the preload. Renderers feature-detect
// `typeof window.gmux.pathForFile === 'function'`.
// ---------------------------------------------------------------------------

import type {
  DropPersistInput,
  DropPersistResult,
  DropPrepareResult,
  ImageDropTable
} from '../types';

export interface DropInvokeChannelMap {
  /** Per-agent image/file drop strategies from the agent registry. */
  'drop:strategies': { req: []; res: ImageDropTable };
  /** Classify dropped absolute paths (dir vs file, image sniff, safe copy). */
  'drop:prepare': { req: [paths: string[]]; res: DropPrepareResult };
  /** Persist pathless bytes to the drop store; resolves the absolute path. */
  'drop:persist': { req: [input: DropPersistInput]; res: DropPersistResult };
}

/**
 * Top-level extras on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxDropExtras {
  /**
   * Absolute path of a dropped/pasted File via Electron's webUtils; '' when
   * the File has no filesystem path (browser drag, synthesized File) or the
   * lookup throws. NEVER copy, wrap, or re-`new File()` a dropped File before
   * calling this — that is what breaks path resolution (research 16 §4.2).
   */
  pathForFile(file: File): string;
  drop: {
    strategies(): Promise<ImageDropTable>;
    prepare(paths: string[]): Promise<DropPrepareResult>;
    persist(input: DropPersistInput): Promise<DropPersistResult>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the terminal stream (Phase 12 items 1 + 2) — new channels/types
// only, nothing above was modified. Powers the terminal context menu's copy
// surface and CleanShot-style capture (docs/research/17-terminal-capture.md).
//
// Division of labour: the RENDERER owns pixels and markup (it is the only
// side that can measure xterm's real cell box and serialize a buffer); MAIN
// owns the clipboard, the save dialog and tmux. Bytes cross as `Uint8Array`,
// never as a data URL — a 2,000-line capture measured 47 MB of PNG and 79 MB
// as a data-URL string (research 17 §5.6).
//
// Main handlers: registerCaptureIpc() (src/main/capture/ipc.ts).
// INTEGRATOR wiring (preload; guardrail 1 — fold into the ONE typed bridge,
// no new wrapper generation):
//   capture: {
//     viewport: (input) => invoke('capture:viewport', input),
//     image:    (input) => invoke('capture:image', input),
//     saveLast: ()      => invoke('capture:saveLast'),
//     pane:     (input) => invoke('capture:pane', input),
//     writeRich:(input) => invoke('clipboard:writeRich', input),
//     clearHistory: (tmuxName) => invoke('terminal:clearHistory', tmuxName)
//   }
// Renderer feature-detects `window.gmux.capture` and hides the capture items
// when it is absent (older preload / non-Electron test environments).
// ---------------------------------------------------------------------------

/** A CSS-pixel rectangle in window/page coordinates (what capturePage takes). */
export interface CaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureViewportInput {
  /** Rect to grab — measured from the live `.xterm-screen` bounding box. */
  rect: CaptureRect;
  /** Basename without extension, proposed by a later Save… */
  suggestedName: string;
}

export interface CaptureImageInput {
  /** Already-rasterized PNG bytes from the renderer. */
  png: Uint8Array;
  suggestedName: string;
}

/** What landed on the clipboard (CSS-pixel size; the PNG itself is @2x). */
export interface CaptureResult {
  width: number;
  height: number;
  bytes: number;
}

export interface CaptureSaveResult {
  /** Absolute path written, or null when the user cancelled the dialog. */
  path: string | null;
}

export interface CapturePaneInput {
  /** tmux-side session name (`Session.tmuxName`); main resolves it to a $-id. */
  tmuxName: string;
  /**
   * Lines of HISTORY to take from above the visible screen. The capture always
   * runs to the bottom of the screen (no `-E`), so "last N lines" is
   * `Math.max(0, N - term.rows)` (research 17 §2.1: `-E -1` would *exclude*
   * the visible screen).
   */
  historyLines: number;
}

export interface CapturePaneResult {
  /** Raw pane text with SGR escapes intact (`capture-pane -e`, never `-J`). */
  ansi: string;
}

export interface ClipboardRichInput {
  /** Plain-text flavor (what a terminal or editor pastes). */
  text: string;
  /**
   * HTML flavor (what Notion/Slack/Word pastes). Empty string = text only —
   * plain Copy goes through this same channel rather than a second one, and
   * an empty flavor must never be written (it would blank the rich paste).
   */
  html: string;
}

/** New invoke channels appended by the terminal capture stream. */
export interface TerminalCaptureInvokeChannelMap {
  /** Grab a rect of the live window; writes a PNG to the clipboard. */
  'capture:viewport': { req: [input: CaptureViewportInput]; res: CaptureResult };
  /** Take renderer-rasterized PNG bytes; writes them to the clipboard. */
  'capture:image': { req: [input: CaptureImageInput]; res: CaptureResult };
  /** Save the most recent capture to disk (Save… action on the toast). */
  'capture:saveLast': { req: []; res: CaptureSaveResult };
  /** `tmux capture-pane -e` for scrollback beyond the visible screen. */
  'capture:pane': { req: [input: CapturePaneInput]; res: CapturePaneResult };
  /** Write text + HTML flavors together (Copy as HTML). */
  'clipboard:writeRich': { req: [input: ClipboardRichInput]; res: void };
  /**
   * Run the browser paste command in the calling window — the same path the
   * Edit menu's `role:'paste'` takes, so xterm's own paste handler applies
   * bracketed paste instead of us re-implementing it.
   */
  'clipboard:paste': { req: []; res: void };
  /** Drop a session's server-side history so Clear means cleared. */
  'terminal:clearHistory': { req: [tmuxName: string]; res: void };
}

/**
 * Top-level extra on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxCaptureExtras {
  capture: {
    viewport(input: CaptureViewportInput): Promise<CaptureResult>;
    image(input: CaptureImageInput): Promise<CaptureResult>;
    saveLast(): Promise<CaptureSaveResult>;
    pane(input: CapturePaneInput): Promise<CapturePaneResult>;
    writeRich(input: ClipboardRichInput): Promise<void>;
    paste(): Promise<void>;
    clearHistory(tmuxName: string): Promise<void>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by the scrollback stream (Phase 12.3) — new channels/types only,
// nothing above was modified.
//
// `tmux attach` puts the CLIENT in the alternate buffer, so xterm.js has no
// scrollback of its own for ANY gmux pane and its wheel handler degrades to
// emitting cursor keys. The real 50k-line history lives server-side, so the
// scroll surface is tmux copy-mode and the renderer drives it from here.
// Everything is by sessionId; main resolves the tmux target.
//
// Main handlers: registerScrollIpc-equivalent block in src/main/ipc.ts,
// backed by src/main/tmux/scroll.ts over the long-lived control client
// (~1 ms per command; a `tmux` process spawn would be ~20 ms).
// ---------------------------------------------------------------------------

/** Live scroll geometry for one pane; drives both the wheel and the bar. */
export interface TerminalScrollState {
  /**
   * A session on THIS Mac answered this call (Phase 95).
   *
   * False means Tortie has nothing here whose scroll it can read. That is the
   * ordinary and correct answer in two cases, being a session that runs on
   * another machine, and a session on this Mac that is not running. It is not
   * an error and main never throws for it, so a caller gets an answer rather
   * than a refusal it can only repeat.
   *
   * Every other field in this object is 0 or false when this is false, so a
   * caller that ignores the field still draws no bar. A caller that reads it
   * stops asking, which is the point: the poll that produced the same refusal
   * once a second for as long as the session was on screen is the fault this
   * field ends.
   */
  hasPane: boolean;
  /** Lines scrolled above the live bottom. 0 = live output. */
  position: number;
  /** Scrollback lines tmux holds above the screen. */
  history: number;
  /** Visible rows. */
  rows: number;
  /** tmux copy-mode is active on this pane. */
  inMode: boolean;
  /**
   * The app INSIDE the pane owns the alternate screen (vim, a picker). Its
   * drawing never enters tmux history, so `history` is reported as 0 and the
   * renderer must leave the wheel to the app.
   */
  innerAlt: boolean;
  /** The app INSIDE the pane asked for mouse reporting. */
  innerMouse: boolean;
}

export interface TerminalScrollPollInput {
  sessionId: string;
  /**
   * History the caller last rendered. New output pushes a scrolled pane
   * forward (`scroll_position` is relative to the LIVE bottom), so main adds
   * the growth back to the offset and the reader keeps their place.
   */
  anchorFrom?: number;
}

export interface TerminalScrollByInput {
  sessionId: string;
  /** Whole lines; positive scrolls back in time, negative toward live. */
  lines: number;
}

export interface TerminalScrollToInput {
  sessionId: string;
  /** Absolute offset above the live bottom; 0 returns to live output. */
  position: number;
}

/** New invoke channels appended by the scrollback stream. */
export interface TerminalScrollInvokeChannelMap {
  /** Read the pane's scroll geometry (optionally re-anchoring it). */
  'terminal:scrollState': {
    req: [input: TerminalScrollPollInput];
    res: TerminalScrollState;
  };
  /** Wheel / keyboard scrolling, in whole lines. */
  'terminal:scrollBy': {
    req: [input: TerminalScrollByInput];
    res: TerminalScrollState;
  };
  /** Scrollbar drag: scrub to an absolute offset. */
  'terminal:scrollTo': {
    req: [input: TerminalScrollToInput];
    res: TerminalScrollState;
  };
  /** Return to live output — what typing does. */
  'terminal:scrollLive': {
    req: [sessionId: string];
    res: TerminalScrollState;
  };
}

/**
 * Top-level extra on window.gmux. Without it the pane simply has no gmux
 * scroll surface — nothing else regresses.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxScrollExtras {
  scroll: {
    state(input: TerminalScrollPollInput): Promise<TerminalScrollState>;
    by(input: TerminalScrollByInput): Promise<TerminalScrollState>;
    to(input: TerminalScrollToInput): Promise<TerminalScrollState>;
    live(sessionId: string): Promise<TerminalScrollState>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 13.7 (scrollback limits + understated diagnostics) — new
// channels and one new event only; nothing above was edited except the
// GmuxInvokeChannelMap intersection and AllEventPayloadMap, exactly as their
// own comments prescribe.
//
// EVERY READ HERE IS ON DEMAND. There is deliberately no "scrollback:watch"
// subscription and no periodic payload: ZEN-OF-TORTIE forbids a number that
// rises on its own, so the only thing that travels unasked is the notice
// below, which fires on a crossed threshold and speaks once.
// ---------------------------------------------------------------------------

import type { ScrollbackStats, SessionScrollbackFacts } from '../scrollback';
import type { GmuxNotice } from '../notice';

/** Main → renderers: a scrollback threshold was crossed. Rare by design. */
export const EVT_SCROLLBACK_NOTICE = 'scrollback:notice' as const;

// WIDENED by Phase 19 item 9. The payload is now GmuxNotice, which is the
// three scrollback events plus one kind per degraded durability state
// (src/shared/notice.ts). ScrollbackNotice is a member of that union, so every
// existing emitter and every existing test still type-checks unchanged. The
// channel name is deliberately left alone: it is a live wire string, and the
// only thing renaming it would produce is churn.
export interface ScrollbackEventPayloadMap {
  'scrollback:notice': [notice: GmuxNotice];
}

/**
 * The newest saved output for one session, with the fact that decides how it
 * is read (Phase 72).
 *
 * `capturedAt` is the WHOLE reason this shape exists. Saved output looks
 * exactly like live output on a screen, so the panel that draws it always says
 * when it was taken. The instant is this Mac's own clock at the moment the
 * bytes finished arriving, never a clock on another machine, so it can be
 * compared against this Mac's now without any correction.
 */
export interface SavedSessionOutput {
  /** The body, exactly as it was saved. Rendered verbatim, never parsed. */
  text: string;
  /** Epoch ms on THIS Mac. 0 for a snapshot written before Phase 19. */
  capturedAt: number;
  /** The machine the output came from, or null when it is this Mac. */
  machineId: string | null;
  /** True when the bytes matched a recorded length and hash. */
  verified: boolean;
  /** Byte length of the body. */
  bytes: number;
  /** Newlines in the body, from the record. 0 when there is no record. */
  lines: number;
}

/** New invoke channels appended by the scrollback-limits stream. */
export interface ScrollbackInvokeChannelMap {
  /**
   * The evidence the Settings card shows: one `list-panes`, one directory
   * stat, one `statfs`. Called when Settings opens and after a depth change,
   * never on a timer.
   */
  'scrollback:stats': { req: []; res: ScrollbackStats };
  /**
   * What ONE session is holding. Read when its context menu is opened, so
   * the number exists in the renderer only while the menu that shows it does.
   * Null when the session is not running.
   */
  'scrollback:session': {
    req: [sessionId: string];
    res: SessionScrollbackFacts | null;
  };
  /** Copy details: a plain-text block for a bug report. */
  'scrollback:report': { req: []; res: string };
  /**
   * APPENDED by Phase 72. The newest saved output Tortie holds for one
   * session, with the moment it was captured.
   *
   * A PULL, like the three above, asked when a person opens the saved output
   * panel and at no other time. Null when nothing is saved for that session.
   *
   * It reads a file on this Mac and sends no command anywhere. For a session
   * on another machine the answer is a copy Tortie kept here, and the panel
   * says so in words: this is not live, and it is not put back on that
   * machine when the session is brought back.
   */
  'scrollback:saved': {
    req: [sessionId: string];
    res: SavedSessionOutput | null;
  };
}

/**
 * Top-level extra on window.gmux. Without it the Settings card renders its
 * controls with no estimate rather than dead rows, and the session menu
 * simply has no information item.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxScrollbackExtras {
  scrollback: {
    stats(): Promise<ScrollbackStats>;
    session(sessionId: string): Promise<SessionScrollbackFacts | null>;
    report(): Promise<string>;
    /**
     * APPENDED by Phase 72. The newest saved output for one session, read when
     * the panel opens. Optional, and the panel says it has nothing when an
     * older preload does not carry it.
     */
    saved(sessionId: string): Promise<SavedSessionOutput | null>;
    /**
     * WIDENED by Phase 19 item 9 — see ScrollbackEventPayloadMap above. The
     * renderer switches on `kind`, and `ScrollbackNotice` is still one of the
     * shapes that arrives.
     */
    onNotice(cb: (notice: GmuxNotice) => void): Unsubscribe;
  };
}
