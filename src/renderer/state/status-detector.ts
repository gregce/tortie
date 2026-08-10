/**
 * Session status detector — day-one heuristics over raw terminal output.
 *
 * The frozen contract's main-side status only distinguishes running / exited /
 * restorable reliably; the finer WORKING / NEEDS_INPUT / IDLE glance is
 * derived here in the renderer from the same `term:data:<id>` byte stream the
 * visible terminal consumes.
 *
 * Heuristics (v1, deliberately simple — see UPGRADE PATH below):
 *  - BEL (0x07) in the stream        → NEEDS_INPUT immediately, but ONLY for
 *    agent sessions (agents ring the terminal bell when they block on a
 *    permission prompt; plain shells beep on tab-completion/ZLE noise and
 *    must never demand attention), and never within
 *    BEL_INPUT_IGNORE_MS of the user's own input to that session — with
 *    tmux `mouse on`, clicks become mouse reports, zsh beeps at the
 *    un-decodable bytes, and the echoed BEL is self-inflicted, not a
 *    request for attention.
 *  - any output                      → WORKING (and clears NEEDS_INPUT).
 *  - silence > 30s after a BURST     → NEEDS_INPUT for agent sessions: a
 *    burst of output followed by sustained silence usually means the agent
 *    printed a question and is waiting. Plain shells go IDLE instead
 *    (`cat file` then a quiet prompt is not a request for attention).
 *  - silence after a non-burst       → IDLE (echoed keystrokes / prompt).
 *
 * LIMITS (known, accepted for day one): bytes only flow for ATTACHED
 * sessions (the visible pane). A hidden session keeps its last observed
 * status until it is shown again or main flips it (exited/restorable).
 *
 * UPGRADE PATH: when OSC 133 prompt-marking (or agent hooks) lands, add a
 * parser that feeds `notepromptMark()` / `noteCommandStart()` and delete the
 * silence timers — the public surface (watch/unwatch/callbacks) stays.
 */

import type { AgentKind } from '@shared/types';

export type DetectedStatus = 'working' | 'needs_input' | 'idle';

export interface StatusDetectorCallbacks {
  /** A session's detected status changed. `at` is epoch ms. */
  onStatus(sessionId: string, status: DetectedStatus, at: number): void;
  /** Last non-empty terminal line changed (⌘J prompt excerpt). */
  onExcerpt(sessionId: string, line: string): void;
  /** Output activity heartbeat (for "age" columns). */
  onActivity(sessionId: string, at: number): void;
}

/** Tunables — exported for tests. */
export const BURST_BYTES = 512; // bytes within the window that count as a burst
export const BURST_WINDOW_MS = 2_000;
export const IDLE_AFTER_MS = 5_000; // quiet trickle → idle
export const NEEDS_INPUT_AFTER_BURST_MS = 30_000; // silence after burst → needs input
/**
 * A BEL arriving within this window after the user's own input (keystrokes
 * or mouse reports) to that session is self-inflicted — ignored for ALL
 * session kinds, agents included.
 */
export const BEL_INPUT_IGNORE_MS = 2_000;

const BEL = 0x07;
const EXCERPT_MAX = 120;
const TAIL_MAX = 4_096;

/** Strip ANSI escape sequences + control chars for the excerpt line. */
export function stripAnsi(text: string): string {
  return (
    text
      // OSC sequences: ESC ] ... (BEL | ESC \\)
      .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?/g, '')
      // CSI sequences: ESC [ params intermediates final
      .replace(/\u001b\[[0-9;?:]*[ -\/]*[@-~]/g, '')
      // remaining two-byte escapes: ESC + one char
      .replace(/\u001b[@-Z\\^_]?/g, '')
      // tabs become spaces; other stray C0 controls (not \n) are dropped
      .replace(/\t/g, ' ')
      .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
  );
}

interface WatchState {
  agent: AgentKind;
  unsubscribe: () => void;
  decoder: TextDecoder;
  /** Rolling output window for burst detection. */
  window: Array<{ at: number; bytes: number }>;
  windowBytes: number;
  lastDataAt: number;
  /** True when the most recent output activity qualified as a burst. */
  burstActive: boolean;
  /** Epoch ms of the user's last input to this session (-∞ = never). */
  lastUserInputAt: number;
  status: DetectedStatus | null;
  timer: ReturnType<typeof setTimeout> | null;
  /** Undecoded tail of the stream, for excerpt extraction. */
  tail: string;
  lastExcerpt: string;
}

/** Minimal slice of the bridge the detector needs (injectable for tests). */
export interface TermStreamSource {
  onData(sessionId: string, cb: (data: Uint8Array) => void): () => void;
}

export class StatusDetector {
  private readonly watches = new Map<string, WatchState>();

  constructor(
    private readonly source: TermStreamSource,
    private readonly cb: StatusDetectorCallbacks,
    private readonly now: () => number = () => Date.now()
  ) {}

  /** Start observing a session's output stream (call for attached panes). */
  watch(sessionId: string, agent: AgentKind): void {
    if (this.watches.has(sessionId)) return;
    const state: WatchState = {
      agent,
      unsubscribe: () => undefined,
      decoder: new TextDecoder('utf-8', { fatal: false }),
      window: [],
      windowBytes: 0,
      lastDataAt: 0,
      burstActive: false,
      lastUserInputAt: Number.NEGATIVE_INFINITY,
      status: null,
      timer: null,
      tail: '',
      lastExcerpt: ''
    };
    state.unsubscribe = this.source.onData(sessionId, (chunk) =>
      this.ingest(sessionId, state, chunk)
    );
    this.watches.set(sessionId, state);
  }

  /** Stop observing. The last emitted status stands until re-watched. */
  unwatch(sessionId: string): void {
    const state = this.watches.get(sessionId);
    if (!state) return;
    if (state.timer !== null) clearTimeout(state.timer);
    state.unsubscribe();
    this.watches.delete(sessionId);
  }

  /**
   * The user sent keystrokes/mouse reports to this session — whatever it was
   * waiting for, it has an answer now. Clears NEEDS_INPUT without waiting
   * for echo, and opens a BEL_INPUT_IGNORE_MS window during which echoed
   * BELs are treated as self-inflicted rather than as attention requests.
   */
  noteUserInput(sessionId: string): void {
    const state = this.watches.get(sessionId);
    if (!state) return;
    state.lastUserInputAt = this.now();
    if (state.status !== 'needs_input') return;
    this.setStatus(sessionId, state, 'working');
    this.schedule(sessionId, state);
  }

  dispose(): void {
    for (const id of [...this.watches.keys()]) this.unwatch(id);
  }

  // -- internals -------------------------------------------------------------

  private ingest(sessionId: string, state: WatchState, chunk: Uint8Array): void {
    const at = this.now();
    state.lastDataAt = at;
    this.cb.onActivity(sessionId, at);

    // Burst bookkeeping (rolling byte count).
    state.window.push({ at, bytes: chunk.byteLength });
    state.windowBytes += chunk.byteLength;
    while (state.window.length > 0) {
      const head = state.window[0];
      if (head === undefined || at - head.at <= BURST_WINDOW_MS) break;
      state.windowBytes -= head.bytes;
      state.window.shift();
    }
    if (state.windowBytes >= BURST_BYTES) state.burstActive = true;

    // BEL → the loudest, most direct "needs you" signal we have today —
    // but only when an AGENT rings it unprovoked. Shell beeps
    // (tab-completion, ZLE rejecting mouse reports) never demand attention,
    // and any BEL within BEL_INPUT_IGNORE_MS of the user's own input is a
    // self-inflicted echo for every session kind.
    let sawBel = false;
    for (let i = 0; i < chunk.byteLength; i++) {
      if (chunk[i] === BEL) {
        sawBel = true;
        break;
      }
    }

    this.extractExcerpt(sessionId, state, chunk);

    const belNeedsInput =
      sawBel &&
      state.agent !== 'shell' &&
      at - state.lastUserInputAt > BEL_INPUT_IGNORE_MS;

    if (belNeedsInput) {
      this.setStatus(sessionId, state, 'needs_input');
    } else {
      this.setStatus(sessionId, state, 'working');
    }
    this.schedule(sessionId, state);
  }

  private schedule(sessionId: string, state: WatchState): void {
    if (state.timer !== null) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = null;
      this.onSilence(sessionId, state);
    }, IDLE_AFTER_MS);
  }

  /** No output for IDLE_AFTER_MS — decide idle now or needs-input later. */
  private onSilence(sessionId: string, state: WatchState): void {
    if (state.status === 'needs_input') return; // BEL verdict stands
    const agentSession = state.agent !== 'shell';
    if (state.burstActive && agentSession) {
      // Burst then silence: hold WORKING until the 30s mark, then flag.
      const elapsed = this.now() - state.lastDataAt;
      const remaining = NEEDS_INPUT_AFTER_BURST_MS - elapsed;
      if (remaining <= 0) {
        state.burstActive = false;
        this.setStatus(sessionId, state, 'needs_input');
      } else {
        state.timer = setTimeout(() => {
          state.timer = null;
          this.onSilence(sessionId, state);
        }, remaining);
      }
      return;
    }
    state.burstActive = false;
    this.setStatus(sessionId, state, 'idle');
  }

  private setStatus(
    sessionId: string,
    state: WatchState,
    status: DetectedStatus
  ): void {
    if (state.status === status) return;
    state.status = status;
    this.cb.onStatus(sessionId, status, this.now());
  }

  private extractExcerpt(
    sessionId: string,
    state: WatchState,
    chunk: Uint8Array
  ): void {
    state.tail += state.decoder.decode(chunk, { stream: true });
    if (state.tail.length > TAIL_MAX) {
      state.tail = state.tail.slice(-TAIL_MAX);
    }
    const clean = stripAnsi(state.tail.replace(/\r/g, '\n'));
    const lines = clean.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = (lines[i] ?? '').trim();
      if (line.length === 0) continue;
      const excerpt = line.slice(0, EXCERPT_MAX);
      if (excerpt !== state.lastExcerpt) {
        state.lastExcerpt = excerpt;
        this.cb.onExcerpt(sessionId, excerpt);
      }
      return;
    }
  }
}
