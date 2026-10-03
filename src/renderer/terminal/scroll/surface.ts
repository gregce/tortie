/**
 * The scroll surface of one session — Phase 12.3.
 *
 * MEASURED (2026-08-10, tmux 3.6a + @xterm/xterm 6):
 * `tmux attach` opens with `ESC[?1049h`, so xterm.js is in its ALTERNATE
 * buffer for every gmux pane and `buffer.hasScrollback` is false. xterm's own
 * wheel listener then takes its alternate-scroll branch and emits `ESC O A` /
 * `ESC O B` — which claude and codex read as prompt-history navigation ("it
 * thinks I'm focused in the input box") and a shell reads as command history.
 * No pane in gmux has ever had a working wheel; the shell only LOOKED better
 * because its cursor keys are harmless.
 *
 * The real scrollback is tmux's server-side history, 25,000 lines by default
 * and up to 100,000 by the Scrollback depth setting, so this
 * controller drives tmux copy-mode over IPC and reports the geometry the
 * scrollbar draws. Three wheel routes, decided from the state of the app
 * INSIDE the pane (never from the attach client's own alt-buffer flag, which
 * is always on):
 *
 *   innerMouse  the app asked for mouse reporting (a picker, `vim -c 'set
 *               mouse=a'`)              → let xterm send the SGR report
 *   innerAlt    alternate screen, no mouse (plain vim)  → let xterm send its
 *               cursor keys, which is what scrolls that app's own buffer.
 *               copy-mode there shows blank `~` rows — measured — because an
 *               alt screen never enters tmux history
 *   otherwise   normal buffer: shells, claude, codex → gmux scrolls tmux
 *               history and the wheel finally means "show me what scrolled by"
 *
 * The first two routes are `view.owned === false`, and the rule is the WHEEL's
 * only by accident of which gesture came first. ./drag-select.ts reads the
 * same flag for the same reason, so a drag held at the edge of a pane whose
 * program asked for the mouse scrolls nothing either.
 *
 * ONE EXCEPTION, Phase 292: A PANE THAT IS ALREADY SCROLLED BACK keeps its
 * wheel whatever the program inside it does next. What is on screen then is
 * the frame tmux froze when the reader scrolled, not the program's screen, so
 * the wheel scrolls that frame. MEASURED 2026-09-18: parked 100 back, the
 * program opened its alternate screen, the text held at "line 362", and one
 * wheel notch was handed to xterm, which sent `ESC O A`, which left copy mode
 * and gave the program an arrow key nobody pressed. `wheelFollowsProgram`
 * reads `inMode` for this, first, and main keeps reporting the frame's history
 * while the pane is parked (src/main/tmux/scroll.ts, `parseState`), so the
 * thumb stays.
 *
 * A FOURTH ROUTE, Phase 320: A PANE MAIN CANNOT READ. When main answers that
 * it has nothing to read for this row, none of the routes above can be decided
 * from tmux's state, and xterm's own mouse mode decides it instead. The far
 * tmux client asks this terminal for the mouse exactly while the far program
 * has asked for it, so a program that asked (Claude Code's full screen
 * renderer among them) gets the wheel as xterm's mouse report, on the attach,
 * like a keystroke. A program that did not ask keeps Phase 95's swallow,
 * because xterm would send it `ESC O A`. `wheelReachesProgram` carries this
 * side's measurement, and docs/research/130-remote-scrollback.md section 3.3
 * carries the far side's. Since Phase 320.1 this route is taken for a session
 * on another machine only when that machine has no live connection this run
 * (a tmux Tortie has not measured one on, or a missed greeting), and for as
 * long as its connection is down.
 *
 * PHASE 320.1: THE WHEEL FOLLOWS THE PROGRAM AS IT IS NOW, on every pane
 * (build/p3201/SPEC.md D1 and D2, `wheelFollowsProgram`). The three routes at
 * the top of this header used to be decided from main's read alone, and that
 * read is this surface's own poll, up to a second old. xterm's mouse mode is
 * the fresher reader: the attach carries a program's mouse request to this
 * terminal within a tenth of a millisecond of the program writing it
 * (measured on tmux 3.6a and 3.7b, the SPEC's section 4, M1). So a pane that
 * is NOT scrolled back asks xterm first, and a program that asked for a wheel
 * report gets the wheel at once whatever the read says. That was the
 * reporter's own case. A far full screen program that had just asked for the
 * mouse got 0 of 20 notches at the first build, where the parent gave it 20
 * of 20, because the stale read sent them to copy mode and Phase 292's
 * exception then kept every later notch there. The same race was on this Mac
 * at the parent (0 of 60), and it is closed here the same way, because
 * nothing in this file knows which machine a pane is on.
 *
 * The other direction is closed too. A read that says the program asked for
 * the mouse, over a terminal that says it no longer has, sends NOTHING and
 * asks main again, at most once per `LIVE_POLL_MS`. Handing that wheel to
 * xterm with no mouse mode types `ESC O A` into a program that has just let
 * go, which is Phase 95's defect. A read that says alternate screen with no
 * mouse (`less`, a vim with no mouse) keeps its route unchanged. A pane
 * already scrolled back keeps Phase 292's rule FIRST, because tmux takes the
 * mouse back from the terminal while a pane is in copy mode, so xterm reads
 * `none` over a parked pane whatever the program asked (M1).
 *
 * PHASE 320.1: A PANE ON ANOTHER MACHINE SCROLLS LIKE ONE ON THIS MAC. Main
 * answers the same four calls for it over that machine's own control
 * connection, through one runner that admits a closed table of command shapes
 * and nothing else (docs/research/130-remote-scrollback.md section 4, the
 * carriage door the operator approved on 2026-09-23, and on 2026-09-30 the
 * one shape that types the keys a person types over a scrolled-back session;
 * build/p3201/SPEC.md). What changed here is what the link makes visible, in
 * three parts.
 *
 *   THE DOOR HALF, which remote scrolling cannot do without.
 *   - A connection that is down is an ANSWER, `unreachable`, not a throw and
 *     not "no pane": its numbers are never applied, no listener is told, the
 *     wheel takes the fourth route while it lasts, and the poll asks again a
 *     second later (`noteUnreachable`). A throw would bring back Phase 95's
 *     stack trace a second; "no pane" would latch and stop scrolling for the
 *     rest of the mount, which is the launch path, where a restored pane
 *     mounts before its machine's connection has greeted.
 *   - Relative scrolls coalesce with one in flight and a drag is latest wins
 *     (P4, `sendTravel`, `sendLatestTo`). Research 130 section 6 item 8: a
 *     one second drag queued serially settled 19 s late at a 50 ms round trip.
 *
 *   KEYS TO A PANE ON ANOTHER MACHINE ARE ORDERED IN MAIN (D5 to D8,
 *   `keysGoStraight`). Every answer main gives for such a pane carries
 *   `keysOrderedInMain`. From the first one on, this surface holds no key,
 *   fences no scroll and starts no drain: every keystroke goes to main at
 *   once, and main decides key by key which of the two roads to the far pane
 *   it takes, the attach or the control connection behind a `cancel`, and
 *   never lets the two overlap (src/main/machines/scroll-order.ts). A
 *   renderer cannot order two roads. They reorder on one Mac with no network
 *   (the SPEC's M3). Over his Tailscale link, with round trips of 6 to 97 ms,
 *   a scroll written 32 ms after a key still landed first. And a held key
 *   died with the mount when the person chose another session at once (0 of
 *   20, where the parent delivered every one). Keys held before that first
 *   answer (a notch, then a key, before the surface has heard anything) go
 *   at once, in order, when it arrives.
 *
 *   THIS MAC'S TYPING HALF, kept as the first build made it because it
 *   measured better than the parent in the app: 0 of 440 characters lost
 *   typing through a flick, against 15 of 440. None of it runs for a pane
 *   whose answers carry `keysOrderedInMain`.
 *   - P1, a keystroke is never decided from an answer that a scroll still in
 *     flight will overturn (`mustHold`). Research 130 section 6 item 3: the
 *     notch's `copy-mode` lands after it is sent, so a key decided from the
 *     last answer went into copy mode and was eaten. Held keys are delivered
 *     on an answer that reached the pane, in order (`drainHeld`).
 *   - P2, a 32 ms fence after a keystroke in front of the next scroll
 *     (`awaitKeyFence`). It DELAYS travel and never drops or swallows any,
 *     because Phase 320's drop moved the re-entering scroll to the worst
 *     moment and lost 114 of 770 characters against 24 of 550 at its parent,
 *     and its swallow ate whole swipes.
 *   - P3, a held keystroke outlives a thrown call (`retryAfterThrow`) and the
 *     surface's own unmount (`settleHeldOnDispose`), where the parent's
 *     stranded them for the life of the mount or dropped them.
 */

import type { IModes, Terminal } from '@xterm/xterm';
import type { InstalledGmuxApi, TerminalScrollState } from '@shared/ipc';
import { measureCells, screenElement } from '../capture/metrics';
import { gmuxBridge } from '../../bridge';
import { growthSinceEntry } from './live-distance';

/** Poll cadence while the pane shows live output — keeps the thumb honest. */
const LIVE_POLL_MS = 1000;
/**
 * Poll cadence while the pane is scrolled back, and during a scrollbar drag.
 *
 * Phase 292. THIS POLL CORRECTS NOTHING. It used to be the tick that
 * re-scrolled a parked pane, and that correction was the defect: tmux holds a
 * parked view still by itself, so the text stays where the reader put it
 * whatever this number is. The top line read 261 at all 33 samples over eight
 * seconds with the correction gone, on tmux 3.6a and 3.7b.
 *
 * What the poll is for now is two things. It FEEDS THE THUMB: the live
 * history grows under a parked reader, and the scrollbar draws their distance
 * from live out of that growth (./live-distance.ts). And it NOTICES THE PANE
 * LEAVING COPY MODE by a road that did not pass through this surface, so the
 * thumb drops to the bottom and typing stops being held back for a cancel.
 *
 * A quarter of a second is a thumb that moves four times a second, which is
 * plenty for something nobody is reading closely, at one `display-message` a
 * tick. The 100 ms this briefly carried was tuned for the deleted correction,
 * where the interval was the wobble, and buys nothing a person can see.
 */
const SCROLLED_POLL_MS = 250;
/** Wheel deltas are batched over this window into ONE tmux scroll command. */
const WHEEL_COALESCE_MS = 16;

/**
 * Phase 320.1, P2, this Mac's typing half. How long a scroll waits behind the
 * last keystroke delivered, so the key's bytes reach the pane before the
 * scroll can put it back into copy mode.
 *
 * The key leaves on the attach and the scroll on another channel, so nothing
 * but time orders them. On this Mac both leave through one process to one
 * local server, the fence only has to outlast process scheduling, and it
 * measured better than the parent in the app (0 of 440 characters lost typing
 * through a flick, against 15 of 440). Two coalescing windows is the most it
 * may be. Anything longer starts to be a gesture detector, and a gesture
 * detector is what swallowed a new swipe whole in Phase 320.
 *
 * NEVER FOR A PANE ON ANOTHER MACHINE (`keysGoStraight`). The first build
 * said both roads to such a pane leave through one ssh connection in the
 * order they were written. They do not: build/p3201/SPEC.md section 4, M3,
 * reorders them on one Mac with no network at all, and over his Tailscale
 * link a scroll written 32 ms after a key still landed first. A fence only
 * shrinks that window. Main closes it, by never letting the roads overlap.
 *
 * It only ever DELAYS: travel that arrives during it accumulates and goes
 * after it. It is re-armed by a keystroke delivered and by nothing else,
 * never by a report the pane composed and never by the wheel's own timer.
 */
const KEY_FENCE_MS = 32;

/**
 * Phase 320.1. The wait before a held keystroke asks the pane again, doubling
 * from the first to the second. The drain uses it after an answer that says
 * the machine's connection is down; P3 uses the same wait after a call that
 * threw. Phase 320's removed P3 carried these numbers. Since the second build
 * a surface holds nothing once an answer carries `keysOrderedInMain`, and
 * every answer that says a machine is down carries it, so on a latched
 * surface no such wait starts.
 */
const HELD_RETRY_FIRST_MS = 100;
const HELD_RETRY_MAX_MS = 1000;

/**
 * Phase 320. Whether xterm, handed a wheel event, sends it to the program as a
 * mouse report, from the mouse mode the program asked for.
 *
 * NOT `mode !== 'none'`. MEASURED 2026-09-22 on this repository's
 * @xterm/xterm 6.0.0 through its own `CoreMouseService.triggerMouseEvent`,
 * which is what xterm calls when the wheel handler returns true: `vt200`,
 * `drag` and `any` each sent `ESC[<64;11;6M` for one wheel up, and `none` and
 * `x10` sent nothing. X10's protocol reports button presses only
 * (`CoreMouseService.ts`, `X10.events` is DOWN), so xterm never binds its own
 * wheel listener for it and a wheel handed over falls through to the
 * alternate-scroll branch (`CoreBrowserTerminal.ts`, the `!hasScrollback`
 * arm), which types `ESC O A`. That is Phase 95's defect by another mode, so
 * `x10` is swallowed like `none`.
 */
export function wheelReachesProgram(mode: IModes['mouseTrackingMode']): boolean {
  return mode === 'vt200' || mode === 'drag' || mode === 'any';
}

/** What the scrollbar and the wheel router need to know. */
export interface ScrollView {
  /**
   * tmux's `#{scroll_position}`; 0 = live output.
   *
   * Phase 292. While parked this counts from the bottom of the frame tmux
   * FROZE when the pane entered copy mode, not from the live bottom, so it
   * holds still while the agent writes. How far from live the reader really
   * is comes from `distanceFromLive` in ./live-distance.ts.
   */
  position: number;
  /** Scrollback lines above the LIVE screen. It grows under a parked reader. */
  history: number;
  /**
   * Phase 292. `history` as the first answer reported it when `position` went
   * from 0 to above 0, which is the frozen frame's own depth. Null while live,
   * and null again when the position returns to 0.
   */
  historyAtEntry: number | null;
  /** Visible rows. */
  rows: number;
  /** The pane is showing live output. */
  atLive: boolean;
  /** gmux owns this pane's wheel (normal buffer, no inner mouse tracking). */
  owned: boolean;
  /**
   * A running pane answered the last poll (Phase 95; on another machine too
   * since Phase 320.1, when its machine's live connection carries it).
   *
   * True before the first answer arrives, so nothing is disabled while the
   * first call is in flight. It goes false once and stays false for the life
   * of this surface, which is what stops the poll. An answer that says the
   * machine's connection is down is not applied, so it never makes this false.
   */
  hasPane: boolean;
}

const EMPTY: TerminalScrollState = {
  // Phase 95. The state before the first answer. True, because the surface
  // must not disable itself while its first call is still in flight.
  hasPane: true,
  position: 0,
  history: 0,
  rows: 0,
  cols: 0,
  frameHistory: null,
  inMode: false,
  innerAlt: false,
  innerMouse: false
};

/**
 * The optional scroll bridge, or null on a preload that predates it (the
 * pane then simply has no gmux scroll surface). Exported because the
 * screenshot harness reads the same surface to assert the wheel moved
 * history — one accessor, not a second cast.
 */
export function scrollBridge(): NonNullable<InstalledGmuxApi['scroll']> | null {
  return gmuxBridge()?.scroll ?? null;
}

/**
 * The last ordinary answer about a parked pane: the numbers the NEXT answer is
 * compared with to tell lines printed from a rewrap. See `noteEntry`.
 */
interface SeenFrame {
  history: number;
  cols: number;
  rows: number;
}

/**
 * What a surface knew about a pane it left PARKED — Phase 292.
 *
 * A surface is built per mount, and going to another session and back unmounts
 * the pane while tmux keeps it scrolled back. The new surface never saw the
 * park, so it would take the first history it reads as the entry and draw the
 * reader closer to live than they are, by everything printed since the park
 * and while they were away. MEASURED 2026-09-18 with the pane printing 20
 * lines a second: five seconds away is a hundred lines the thumb never knew.
 *
 * Kept per session, written at `dispose` when the pane is parked, adopted by
 * the first parked answer the next surface hears, and dropped the moment an
 * answer says the pane is live. It is renderer memory and nothing else: it
 * does not survive a relaunch, where the limit in ./live-distance.ts stands.
 * All of this is for a tmux that does not say the frame's depth (3.6a): on
 * one that does, the first answer the new surface hears carries the frame and
 * nothing handed over is needed.
 */
const leftParked = new Map<string, { historyAtEntry: number; seen: SeenFrame }>();

/** Test seam: forget every pane a disposed surface left parked. */
export function forgetParkedFramesForTests(): void {
  leftParked.clear();
}

function viewOf(
  state: TerminalScrollState,
  historyAtEntry: number | null
): ScrollView {
  return {
    position: state.position,
    history: state.history,
    historyAtEntry,
    rows: state.rows,
    atLive: state.position === 0,
    owned: !state.innerAlt && !state.innerMouse,
    hasPane: state.hasPane
  };
}

export class ScrollSurface {
  private state: TerminalScrollState = EMPTY;
  /**
   * Phase 292. The depth of the frame tmux froze when this pane was parked,
   * which is the history at that moment. Null while live.
   *
   * On a tmux that says it (3.7 and later, the bundled 3.7b) it is tmux's own
   * number, `frameHistory` on every answer. On one that does not (3.6a) it is
   * inferred from the history the answers carry, with the limits `noteEntry`
   * states. `noteEntry` is the one place it is written, because every answer
   * there is, from the wheel, a drag or the poll, lands in `apply`.
   */
  private historyAtEntry: number | null = null;
  private readonly listeners = new Set<(view: ScrollView) => void>();
  /** Serializes IPC so two scrolls can never land out of order. */
  private chain: Promise<void> = Promise.resolve();
  /** Sub-line wheel travel carried between frames (trackpads are fractional). */
  private pendingLines = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pollMs = 0;
  /** Keystrokes held while copy-mode is being cancelled, in arrival order. */
  private readonly inputQueue: string[] = [];
  private dragging = false;
  private disposed = false;
  /**
   * Main answered that there is nothing it can read for this row (Phase 95).
   *
   * Three ordinary states produce that answer: a session on this Mac that is
   * not running, a session that has ended on its machine, and a session on a
   * machine with no live connection this run. None is an error and none
   * changes while this surface is mounted, so the answer is kept and the poll
   * stops. Before this field the surface asked again every second for as long
   * as the session was on screen, and main threw every time, which printed a
   * stack trace every second.
   *
   * A connection that is only down for now is NOT this: that answer carries
   * `unreachable` and is kept in the field below instead.
   *
   * A surface is built per mount, so a restore that brings a pane back builds
   * a new one and the poll starts again.
   */
  private noPane = false;
  /**
   * Phase 320.1. The last answer said the pane's machine is not reachable
   * right now: its connection is opening, reconnecting or dropped, or a
   * command failed. Nothing of that answer was applied. Cleared by the next
   * answer that reached the pane. While it is set the wheel takes the fourth
   * route and the scroll commands do nothing, which is exactly what this
   * surface did for such a pane before Phase 320.1.
   */
  private unreachable = false;
  /**
   * Phase 320.1, P1. Scrolls that may park the pane (a `by` of more than 0
   * lines, a `to` above position 0) handed to the chain and not yet settled.
   * Until one settles, the last answer says nothing about where the pane is.
   */
  private parking = 0;
  /**
   * Phase 320.1, P1. A scroll that may have parked the pane settled without an
   * answer that reached it (a call that threw, or took more than main's
   * deadline, or came back unreachable), so the pane may be parked whatever
   * the last answer said. Cleared by any answer that reached the pane.
   */
  private maybeParked = false;
  /**
   * Phase 320.1, P4. One scroll, relative or absolute, is on the chain at a
   * time. What arrives meanwhile waits below and goes when it settles.
   */
  private travelBusy = false;
  /** Relative travel that arrived while a scroll was on the chain. */
  private queuedLines = 0;
  /**
   * Phase 320.1's ruled round (the O row). Keystrokes sent straight on a pane
   * on another machine. Relative travel handed to the chain while it read one
   * number, and still not sent when it reads another, was made before a key the
   * person typed after it, and is dropped (`dispatchTravel`).
   */
  private keysSent = 0;
  /** The latest drag position that arrived while a scroll was on the chain. */
  private pendingTo: number | null = null;
  /** Phase 320.1, P2. No scroll may leave before this `performance.now()`. */
  private fenceUntil = 0;
  /** Phase 320.1. A drain of held keystrokes is on the chain. */
  private draining = false;
  /** Ends the drain's current wait at once. Set only while one is waiting. */
  private wakeDrain: (() => void) | null = null;
  /**
   * Phase 320.1 (D5). An answer said main orders this pane's keystrokes
   * against its scrolls, which it says for every pane on another machine and
   * never for one on this Mac. Latched: it is set by the first answer that
   * carries it and never cleared, because a surface is built per mount and a
   * pane does not change machines under it. See `keysGoStraight`.
   */
  private keysOrderedInMain = false;
  /**
   * Phase 320.1 (D5). A read asked for because a key went to a pane whose
   * last answer said parked is on the chain and not yet settled, so a burst
   * of keys asks once rather than once a key.
   */
  private keyReadAsked = false;
  /**
   * Phase 320.1 (D2). When the wheel last asked main for a read because the
   * read and xterm disagreed about the mouse. `performance.now()`.
   */
  private wheelAskedAt = Number.NEGATIVE_INFINITY;
  /**
   * Phase 292. The last ordinary answer heard while parked, null while live.
   * `noteEntry` compares the next answer's size with it.
   */
  private seen: SeenFrame | null = null;

  /**
   * `onAnotherMachine` (Phase 320.1's fix round): the session runs on another
   * machine, as its row says when the pane mounts. Main orders such a pane's
   * keystrokes, so the latch below is taken at once instead of from the first
   * answer: a key typed after a notch on a freshly mounted remote pane, before
   * any answer has come back, goes straight to main like every other key there,
   * and is never held (the attack verifier's EARLY cell: a key held behind that
   * first answer was lost when the person chose another session at once, 0 of
   * 14 over a 50 ms link, against 13 of 14 at the parent). And the wheel takes
   * the remote route from the first notch.
   */
  constructor(
    private readonly sessionId: string,
    private readonly term: Terminal,
    options: { readonly onAnotherMachine?: boolean } = {}
  ) {
    this.keysOrderedInMain = options.onAnotherMachine === true;
  }

  get view(): ScrollView {
    return viewOf(this.state, this.historyAtEntry);
  }

  subscribe(listener: (view: ScrollView) => void): () => void {
    this.listeners.add(listener);
    listener(this.view);
    return () => this.listeners.delete(listener);
  }

  /** Begin polling. Safe to call once per mount. */
  start(): void {
    if (this.disposed) return;
    this.refresh();
    this.schedule();
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    // Phase 320.1. A drain waiting to ask again stops waiting now; what it
    // does then is `drainHeld`'s, and no new wait starts.
    this.wakeDrain?.();
    // Phase 292. The pane stays scrolled back in tmux while this surface is
    // gone; the next one picks the frame up from here. See `leftParked`.
    if (this.historyAtEntry !== null && this.seen !== null) {
      leftParked.set(this.sessionId, {
        historyAtEntry: this.historyAtEntry,
        seen: this.seen
      });
    }
  }

  // -- wheel ----------------------------------------------------------------

  /**
   * xterm's `attachCustomWheelEventHandler`. Returning false cancels xterm's
   * own handling — including the alternate-scroll cursor keys that are the
   * whole bug; returning true hands the event to the app inside the pane.
   */
  handleWheel(event: WheelEvent): boolean {
    // Main has nothing it can read for this row (Phase 95), or the machine it
    // runs on is not reachable right now (Phase 320.1), so the program at the
    // other end of the attach decides (Phase 320).
    //
    // A program that asked for the mouse gets the wheel as xterm's own mouse
    // report, sent on the attach like a keystroke. That is how Claude Code's
    // full screen renderer scrolls on a machine with no live connection, the
    // same way it does on this Mac, and no tmux command is involved.
    //
    // A program that did not ask keeps Phase 95's swallow. True would hand
    // the event to xterm's alternate-scroll branch, which emits `ESC O A` and
    // `ESC O B`, and claude and codex read those as prompt-history
    // navigation. Doing nothing is honest. Sending the wrong keys is not.
    if (this.noPane || this.unreachable) {
      return wheelReachesProgram(this.term.modes.mouseTrackingMode);
    }
    if (scrollBridge() === null) return true;
    // Phase 320.1 (D1, D2). The program as it is at this moment decides,
    // and a scrolled-back pane stays ours. See `wheelFollowsProgram`.
    const route = this.wheelFollowsProgram();
    if (route === 'program') return true;
    if (route === 'nothing') return false;
    if (event.deltaY === 0) return false;
    this.pendingLines -= this.wheelLines(event);
    if (this.flushTimer === null) {
      // A TIMER, not requestAnimationFrame. The visible result of a scroll is
      // painted by tmux redrawing the pane over the PTY, not by us, so frame
      // alignment buys nothing — and MEASURED in the screenshot harness, rAF
      // callbacks do not run at all while the window is not producing frames:
      // 22 wheel notches accumulated and fired as one 142-line jump after the
      // run finished. A wheel that silently does nothing is the bug we are
      // here to fix, so it must not depend on the compositor.
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        const whole = Math.trunc(this.pendingLines);
        if (whole === 0) return;
        this.pendingLines -= whole;
        this.scrollBy(whole);
      }, WHEEL_COALESCE_MS);
    }
    return false;
  }

  /**
   * Phase 320.1 (D1, D2). Where one wheel event goes on a pane main can
   * read: to the program at the other end of the attach, to NOTHING, or to
   * tmux's history (ours). Asked in this order, and the order is the rule.
   *
   *   1. Scrolled back (`inMode`): ours. Phase 292's exception, first. The
   *      screen is tmux's frozen frame, and xterm reads `none` over it
   *      whatever the program asked, because tmux takes the mouse back from
   *      the terminal while the pane is in copy mode (SPEC M1).
   *   2. xterm says the program asked for a wheel report: the program's. The
   *      attach mirrors the request onto this terminal within about 0.1 ms of
   *      the program making it, where main's read can be a second old. This
   *      is the reporter's case, and it is what stops a stale read parking a
   *      pane over a program that has just asked for the mouse.
   *   3. The read says the program asked for the mouse and xterm says it no
   *      longer has: nothing, and main is asked again (`askAgainForWheel`).
   *      One of the two is stale. Handing the event to xterm here would type
   *      `ESC O A` into a program that has let go (Phase 95's defect), and
   *      taking it as ours would park a pane whose program may still want the
   *      wheel. The next notch after the read answers is decided afresh.
   *   4. The read says alternate screen with no mouse: on THIS Mac the
   *      program's, as before (xterm's cursor keys scroll `less` and a vim
   *      with no mouse). On ANOTHER MACHINE nothing, which is Phase 320's
   *      swallow and what that pane did before this phase (the fix round).
   *      Both verifiers of the second build measured the program's route
   *      there typing one `ESC O A` per notch into Codex 0.158's full screen
   *      view (alternate screen, application cursor keys, no mouse), which
   *      walks its prompt history and, over an approval, moves the
   *      highlighted answer (docs/research/133 section 1.4): 25 of 25 notches
   *      on 3.6a and 3.7b and 15 of 15 on his Mac Pro, where the parent typed
   *      none. A pane that is worse than today on another machine loses the
   *      part that made it so, and `less` there keeps today's wheel.
   *   5. Otherwise: ours.
   */
  private wheelFollowsProgram(): 'program' | 'nothing' | 'ours' {
    if (this.state.inMode) return 'ours';
    const mode = this.term.modes.mouseTrackingMode;
    if (wheelReachesProgram(mode)) return 'program';
    if (this.state.innerMouse) {
      this.askAgainForWheel();
      return 'nothing';
    }
    if (this.state.innerAlt) return this.onAnotherMachine() ? 'nothing' : 'program';
    return 'ours';
  }

  /**
   * Whether this pane's session runs on another machine. The same latch as
   * `keysGoStraight`, because main says so on every answer for such a pane and
   * never for one on this Mac, and the pane's row said so at mount.
   */
  private onAnotherMachine(): boolean {
    return this.keysOrderedInMain;
  }

  /**
   * Phase 320.1 (D2). One read, when the read and xterm disagree about the
   * mouse, at most once per `LIVE_POLL_MS`. A fling is sixty events a second
   * and must not become sixty reads.
   */
  private askAgainForWheel(): void {
    const now = performance.now();
    if (now - this.wheelAskedAt < LIVE_POLL_MS) return;
    this.wheelAskedAt = now;
    this.refresh();
  }

  /** Wheel travel in terminal lines. Read the cell box, never compute it. */
  private wheelLines(event: WheelEvent): number {
    if (event.deltaMode === 1) return event.deltaY;
    if (event.deltaMode === 2) {
      return event.deltaY * Math.max(1, this.state.rows || this.term.rows);
    }
    const screen = screenElement(this.sessionId);
    const cell =
      screen === null ? 0 : measureCells(this.term, screen).cellHeight;
    return event.deltaY / (cell > 0 ? cell : 18);
  }

  // -- commands -------------------------------------------------------------

  /**
   * Positive scrolls back in time; negative toward live output.
   *
   * Phase 320.1. Nothing is sent while the pane's machine is unreachable: the
   * answer would be that nothing ran, and a scroll that may park the pane and
   * comes back without an answer holds every keystroke after it until the
   * connection is back (`maybeParked`). Before Phase 320.1 this surface sent
   * nothing for such a pane either.
   */
  scrollBy(lines: number): void {
    if (this.noPane || this.unreachable) return;
    const api = scrollBridge();
    if (api === null || lines === 0) return;
    this.sendTravel(api, lines);
  }

  /** One screen, the ⇧PageUp/⇧PageDown step. */
  scrollPages(pages: number): void {
    if (this.noPane || this.unreachable) return;
    const rows = Math.max(1, this.state.rows || this.term.rows);
    this.scrollBy(Math.round(pages * Math.max(1, rows - 1)));
  }

  /**
   * Scrollbar drag: scrub to an absolute tmux position, which counts from the
   * bottom of the frozen frame (Phase 292). The scrollbar turns the reader's
   * distance from live into that number in ./live-distance.ts before it calls.
   */
  scrollTo(position: number): void {
    if (this.noPane || this.unreachable) return;
    const api = scrollBridge();
    if (api === null) return;
    this.sendLatestTo(api, position);
  }

  /**
   * Whether a scrollbar drag is in progress.
   *
   * Phase 292. It used to suspend the poll's correction. There is no
   * correction now, and what is left is the cadence: a drag that starts from
   * live polls at the scrolled rate from the press rather than from the first
   * answer, and the release re-reads at once so the thumb settles where the
   * pane is.
   */
  setDragging(dragging: boolean): void {
    this.dragging = dragging;
    if (!dragging) this.refresh();
  }

  /**
   * Send a keystroke, returning to live output first when the pane is
   * scrolled. tmux copy-mode has its OWN key table: without this, the first
   * character the user types after scrolling would be eaten by it instead of
   * reaching the agent. Held keystrokes flush in arrival order.
   *
   * Phase 320.1 (D5, D8). On a pane on another machine none of that is done
   * here: the key goes to main at once and main returns the pane to live on
   * the same connection that parked it, in order. Nothing is held, so nothing
   * is left for a drain that the person's next choice of session would
   * strand: the key is written to the far pane inside main's own input
   * listener, before this surface's unmount can reach main.
   */
  sendInput(data: string): void {
    const api = scrollBridge();
    const gmux = window.gmux;
    if (gmux === undefined) return;
    if (this.keysGoStraight()) {
      // THE RULED ROUND (the O row). A key wins over wheel travel the person
      // made BEFORE it that has not left yet: the travel coalescing in
      // `pendingLines`, the travel queued behind a scroll on the chain, and
      // (through `keysSent`) a scroll handed to the chain that has not been
      // sent. Main counts a scroll's keys from the moment it RECEIVES it, so a
      // scroll made before a key and sent after it was counted as made after
      // it, and parked the pane a fifth of a second after the typing stopped:
      // the view jumped 2 to 4 lines back and stayed, 4 of 20 runs on his Mac
      // Pro, against 0 of 20 today. Travel made after the key is kept. A drag's
      // latest place (`pendingTo`) is left alone: the thumb is still under the
      // pointer, and the next move sends it again anyway.
      this.keysSent += 1;
      this.pendingLines = 0;
      this.queuedLines = 0;
      this.sendStraight(gmux, data);
      this.followKey();
      return;
    }
    // Phase 95. `this.noPane` first: there is no copy-mode Tortie can leave,
    // so the keystroke goes straight through. Typing into a session main
    // cannot read has to keep working, and this is the line that decides it.
    // Phase 320.1: past that, a key goes straight only when nothing says the
    // pane is, or may be about to be, in copy mode (`mustHold`).
    if (this.noPane || api === null || !this.mustHold()) {
      this.deliver(gmux, data);
      return;
    }
    this.inputQueue.push(data);
    if (this.draining) return;
    this.draining = true;
    // Not through `enqueue`: a drain must still run when this surface has
    // been disposed behind it, which is what `drainHeld` then decides.
    this.chain = this.chain.then(() => this.drainHeld(api, gmux));
  }

  /**
   * Send bytes the PANE composed about itself, leaving the reader's place
   * alone — Phase 205 item 1.
   *
   * `sendInput` above returns a scrolled pane to live output first, because a
   * keystroke would otherwise be eaten by tmux copy-mode's own key table.
   * That is right for a keystroke and wrong for a report: the DECSET 1004
   * focus reports arrive on the same `onData` event, nobody typed them, and
   * cancelling copy-mode for one threw away where the reader was every time
   * the window lost or regained focus. See ../keys/focus-report.ts for the
   * measurement and for the control that isolated the cause. Phase 292 found
   * two more of the class, the colour reports a late resize draws and the
   * device-attribute answers every return to a session draws;
   * ../keys/pane-report.ts is the one question that names all three.
   *
   * The bytes still go, because tmux asked for them. NOTHING ELSE MAY HAPPEN
   * HERE: no `live`, no queue, no read. A report that reaches `sendInput` by
   * any road leaves copy mode, which is the whole defect. And no key fence
   * (Phase 320.1): a report is not a keystroke, and a focus report fired by
   * every change of window would otherwise hold the next scroll back.
   */
  sendReport(data: string): void {
    window.gmux?.term.sendInput(this.sessionId, data);
  }

  /**
   * Re-read the pane. NOTHING IS RE-SCROLLED HERE, AND THAT IS THE WHOLE FIX.
   *
   * A parked copy-mode view holds the reader's content by itself as the agent
   * writes; the correcting scroll this used to run was the only thing moving
   * it. src/main/tmux/scroll.ts's `scrollPaneTo` carries the measurement,
   * including how the founding one came to say otherwise.
   *
   * It is still polled while the pane is scrolled, because the scrollbar's
   * thumb is drawn from the same read and tmux's history grows under it.
   *
   * Phase 320.1. While held keystrokes are draining nothing is added to the
   * chain, because the drain is asking the pane itself and a read queued
   * behind a drain that is waiting out a dropped connection would only pile
   * up. The poll is kept alive all the same.
   */
  refresh(): void {
    if (this.noPane) return;
    const api = scrollBridge();
    if (api === null) return;
    if (this.draining) {
      this.schedule();
      return;
    }
    this.enqueue(() => api.state({ sessionId: this.sessionId }));
  }

  // -- internals ------------------------------------------------------------

  /**
   * One call on the chain. `settled` is told, once, whether an answer that
   * reached the pane came back (Phase 320.1), including when the call never
   * ran because this surface was disposed first.
   */
  private enqueue(
    op: () => Promise<TerminalScrollState | null>,
    settled?: (reachable: boolean) => void
  ): void {
    this.chain = this.chain.then(async () => {
      if (this.disposed) {
        settled?.(false);
        return;
      }
      let reachable = false;
      try {
        const state = await op();
        if (state !== null) {
          reachable = state.unreachable !== true;
          this.apply(state);
        }
      } catch {
        // Pane died, session ended, tmux hiccup — the next tick retries.
        // Rescheduling here (not only on success) is what keeps the poll
        // alive across a transient failure.
        this.schedule();
      }
      settled?.(reachable);
    });
  }

  // -- Phase 320.1: scrolls and keystrokes over a link -----------------------

  /**
   * Phase 320.1 (D5). Whether this pane's keystrokes go straight to main,
   * unheld and unfenced, because main orders them against its scrolls. True
   * once any answer has carried `keysOrderedInMain`, which main sets on every
   * answer for a pane on another machine (a live one and the not-reachable-now
   * value alike) and never for one on this Mac.
   */
  private keysGoStraight(): boolean {
    return this.keysOrderedInMain;
  }

  /** Phase 320.1 (D5). One keystroke to main with no fence and no hold. */
  private sendStraight(gmux: InstalledGmuxApi, data: string): void {
    gmux.term.sendInput(this.sessionId, data);
  }

  /**
   * Phase 320.1 (D5). Take the latch from an answer that carries it. Keys
   * held before it (a notch and then a key, both before the first answer)
   * go at once, in the order typed, and a drain that was waiting on them
   * starts no further wait (`waitBeforeAskingAgain`). Runs before any other
   * reading of the answer, a disposed surface's included, so a key held
   * behind the first answer is never left behind by the unmount.
   */
  private noteKeysOrderedInMain(state: TerminalScrollState): void {
    if (state.keysOrderedInMain !== true || this.keysOrderedInMain) return;
    this.keysOrderedInMain = true;
    const gmux = window.gmux;
    if (gmux === undefined) return;
    while (this.inputQueue.length > 0) {
      this.sendStraight(gmux, this.inputQueue.shift() ?? '');
    }
  }

  /**
   * Phase 320.1 (D5). After a key sent straight to a pane whose last answer
   * said parked, one read, so the thumb follows the pane main has just
   * returned to live. Also when a scroll that may park it is still
   * unanswered: that answer is read before the key's `cancel` and will say
   * parked, and the read queued behind it is what corrects it. One read on
   * the chain at a time, however many keys.
   */
  private followKey(): void {
    if (this.disposed || this.noPane || this.keyReadAsked) return;
    if (!this.state.inMode && this.parking === 0) return;
    const api = scrollBridge();
    if (api === null) return;
    this.keyReadAsked = true;
    this.enqueue(
      () => api.state({ sessionId: this.sessionId }),
      () => {
        this.keyReadAsked = false;
      }
    );
  }

  /**
   * P1, this Mac's typing half. Whether a keystroke must wait for the pane
   * to be returned to live output rather than go straight. Never asked for a
   * pane whose answers carry `keysOrderedInMain` (`keysGoStraight`).
   *
   * It waits behind a key already waiting (so keys keep their order), behind
   * a scroll that may park the pane and has not been answered, behind one that
   * settled without an answer, and while the last answer says the pane is
   * scrolled back or in any mode. The two scroll terms are what the parent
   * lacked: it decided from the last answer alone, and a key typed in the half
   * round trip before a notch's `copy-mode` landed went into copy mode and was
   * eaten (docs/research/130-remote-scrollback.md section 6 item 3).
   *
   * Wheel travel not yet sent does NOT hold a key. It goes after the key, and
   * the fence (`awaitKeyFence`) orders the two.
   */
  private mustHold(): boolean {
    return (
      this.inputQueue.length > 0 ||
      this.parking > 0 ||
      this.maybeParked ||
      this.state.position > 0 ||
      this.state.inMode
    );
  }

  /**
   * P2, this Mac's typing half. Resolves when a scroll may leave: at once
   * (null) when no keystroke was delivered in the last `KEY_FENCE_MS`,
   * otherwise when that time is up. The scroll waits and then goes, whole; see
   * `KEY_FENCE_MS` for why that is the whole of it.
   */
  private awaitKeyFence(): Promise<void> | null {
    const wait = Math.min(KEY_FENCE_MS, this.fenceUntil - performance.now());
    if (wait <= 0) return null;
    return new Promise((resolve) => {
      setTimeout(resolve, wait);
    });
  }

  /** One keystroke to the pane. The fence is P2's, this Mac's typing half. */
  private deliver(gmux: InstalledGmuxApi, data: string): void {
    gmux.term.sendInput(this.sessionId, data);
    this.fenceUntil = performance.now() + KEY_FENCE_MS;
  }

  /** Every held keystroke to the pane, in the order it was typed. */
  private deliverHeld(gmux: InstalledGmuxApi): void {
    while (this.inputQueue.length > 0) {
      this.deliver(gmux, this.inputQueue.shift() ?? '');
    }
  }

  /**
   * P4, the door half. Relative travel coalesces behind the scroll already on
   * the chain and goes as ONE call when it settles, so a flick over a slow
   * link costs a call per round trip rather than a call per wheel frame. The
   * total is unchanged: nothing is dropped.
   */
  private sendTravel(
    api: NonNullable<InstalledGmuxApi['scroll']>,
    lines: number
  ): void {
    if (this.travelBusy) {
      this.queuedLines += lines;
      return;
    }
    this.dispatchTravel(api, { kind: 'by', lines });
  }

  /**
   * P4, the door half. A drag is latest wins: while a scroll is on the chain
   * a newer position replaces the one waiting, which goes when it settles.
   * Research 130 section 6 item 8: every pointermove queued serially arrived
   * 19 s after the pointer stopped at a 50 ms round trip, with the final
   * position right. An absolute position also replaces relative travel that
   * arrived before it, whose effect it would overwrite anyway; travel that
   * arrives after it goes after it.
   */
  private sendLatestTo(
    api: NonNullable<InstalledGmuxApi['scroll']>,
    position: number
  ): void {
    if (this.travelBusy) {
      this.pendingTo = position;
      this.queuedLines = 0;
      return;
    }
    this.dispatchTravel(api, { kind: 'to', position });
  }

  /**
   * Hand one scroll to the chain. A scroll that may park the pane is counted
   * until it settles (P1), and on this Mac it waits behind the key fence
   * first (P2). On a pane on another machine it never waits for a key
   * (`keysGoStraight`): main orders the two, and a fence there only delayed
   * the scroll without ordering it.
   */
  private dispatchTravel(
    api: NonNullable<InstalledGmuxApi['scroll']>,
    move: { kind: 'by'; lines: number } | { kind: 'to'; position: number }
  ): void {
    this.travelBusy = true;
    const parks = move.kind === 'by' ? move.lines > 0 : move.position > 0;
    if (parks) this.parking += 1;
    // The ruled round (the O row): a key sent while this waits on the chain
    // was typed after this travel was made, and wins over it. Nothing is sent,
    // so nothing can have parked the pane.
    const keysAtHandOver = this.keysSent;
    let overtaken = false;
    const send = (): Promise<TerminalScrollState | null> => {
      if (this.disposed) return Promise.resolve(null);
      if (move.kind === 'by' && this.keysSent !== keysAtHandOver) {
        overtaken = true;
        return Promise.resolve(null);
      }
      return move.kind === 'by'
        ? api.by({ sessionId: this.sessionId, lines: move.lines })
        : api.to({ sessionId: this.sessionId, position: move.position });
    };
    this.enqueue(
      () => {
        // Asked when the scroll leaves, not when it was handed over, so a
        // latch taken from an answer in between counts.
        const fence = this.keysGoStraight() ? null : this.awaitKeyFence();
        return fence === null ? send() : fence.then(send);
      },
      (reachable) => {
        this.travelBusy = false;
        if (parks) {
          this.parking -= 1;
          if (!reachable && !overtaken) this.maybeParked = true;
        }
        this.sendWaitingTravel(api);
      }
    );
  }

  /** What arrived while the last scroll was on the chain, now it has settled. */
  private sendWaitingTravel(
    api: NonNullable<InstalledGmuxApi['scroll']>
  ): void {
    if (this.disposed || this.noPane || this.unreachable) {
      this.pendingTo = null;
      this.queuedLines = 0;
      return;
    }
    if (this.pendingTo !== null) {
      const position = this.pendingTo;
      this.pendingTo = null;
      this.dispatchTravel(api, { kind: 'to', position });
      return;
    }
    if (this.queuedLines !== 0) {
      const lines = this.queuedLines;
      this.queuedLines = 0;
      this.dispatchTravel(api, { kind: 'by', lines });
    }
  }

  /**
   * P1's drain, with P3's two clauses marked. Deliver the held keystrokes
   * once an answer that REACHED the pane says it is at the bottom, and never
   * wedge. An answer carrying `keysOrderedInMain` ends it: the keys go at
   * once, whatever the answer says (`noteKeysOrderedInMain`).
   *
   * - When the last answer already says live and nothing may have parked the
   *   pane since, they go without a call.
   * - Otherwise one `live` (a cancel, then a read). At position 0 they go, in
   *   any mode, because the parent delivered there after one answer and clock,
   *   tree and options mode must cost what they cost there. Above 0, ask once
   *   more at once, then wait.
   * - An answer that says the machine is unreachable is never a delivery:
   *   wait, doubling from `HELD_RETRY_FIRST_MS` to `HELD_RETRY_MAX_MS`, and ask
   *   again for as long as this surface is mounted. (The first build said
   *   keys typed through an outage arrive in order when it ends; the app said
   *   otherwise at both builds, and the claim is struck, SPEC section 3.)
   * - A call that THREW is P3's (`retryAfterThrow`). Without it the drain ends
   *   and the keys wait for the next keystroke, which is the parent's stranding
   *   less its wedge.
   * - After dispose no new wait starts. A call already in flight still
   *   delivers on an answer at position 0, which is what the parent did; with
   *   none in flight the last word is P3's (`settleHeldOnDispose`). Nothing is
   *   delivered on an unreachable or a thrown answer after dispose.
   */
  private async drainHeld(
    api: NonNullable<InstalledGmuxApi['scroll']>,
    gmux: InstalledGmuxApi
  ): Promise<void> {
    let wait = HELD_RETRY_FIRST_MS;
    const waited = (): void => {
      wait = Math.min(wait * 2, HELD_RETRY_MAX_MS);
    };
    let askedAgain = false;
    try {
      for (;;) {
        if (this.inputQueue.length === 0) return;
        if (this.noPane || this.knownLive()) {
          this.deliverHeld(gmux);
          return;
        }
        if (this.disposed) {
          await this.settleHeldOnDispose(api, gmux);
          return;
        }
        let answer: TerminalScrollState;
        try {
          answer = await api.live(this.sessionId);
        } catch {
          if (this.disposed) return;
          if (!(await this.retryAfterThrow(wait))) return;
          waited();
          continue;
        }
        if (answer.unreachable === true) {
          this.apply(answer);
          if (this.disposed) return;
          await this.waitBeforeAskingAgain(wait);
          waited();
          continue;
        }
        this.apply(answer);
        if (answer.position === 0) {
          this.deliverHeld(gmux);
          return;
        }
        if (this.disposed) return;
        if (!askedAgain) {
          askedAgain = true;
          continue;
        }
        await this.waitBeforeAskingAgain(wait);
        waited();
      }
    } catch {
      // Nothing above throws on purpose. If a listener did, the poll goes on.
      this.schedule();
    } finally {
      this.draining = false;
    }
  }

  /** The last answer says live and nothing may have parked the pane since. */
  private knownLive(): boolean {
    return (
      this.parking === 0 &&
      !this.maybeParked &&
      this.state.position === 0 &&
      !this.state.inMode
    );
  }

  /**
   * P3, this Mac's typing half. A `live` call that THREW is asked again
   * after the same wait an unreachable answer gets. Resolves whether to ask
   * again. The parent had no answer here: the keys stayed held and every
   * later key queued behind them for the life of the mount (research 130
   * section 6 item 5).
   */
  private async retryAfterThrow(wait: number): Promise<boolean> {
    if (this.disposed) return false;
    await this.waitBeforeAskingAgain(wait);
    return true;
  }

  /**
   * P3, this Mac's typing half. The surface has been disposed with
   * keystrokes held and no call in flight: exactly ONE final `live`, and the
   * keys go on an answer that reached the pane at position 0. No retry,
   * whatever it says.
   * The parent dropped these, and Phase 320's first P3 dropped even the ones
   * the parent delivered (0 of 10 against 10 of 10), which is why this asks
   * rather than decides from the last answer.
   */
  private async settleHeldOnDispose(
    api: NonNullable<InstalledGmuxApi['scroll']>,
    gmux: InstalledGmuxApi
  ): Promise<void> {
    let answer: TerminalScrollState;
    try {
      answer = await api.live(this.sessionId);
    } catch {
      return;
    }
    // Phase 320.1 (D5). An answer that says main orders this pane's keys
    // sends them whatever else it says (`noteKeysOrderedInMain`).
    this.noteKeysOrderedInMain(answer);
    if (answer.unreachable !== true && answer.position === 0) {
      this.deliverHeld(gmux);
    }
  }

  /**
   * A wait `dispose` ends at once. None starts once disposed, nor once an
   * answer has said main orders this pane's keys, because nothing is held
   * after that (`noteKeysOrderedInMain`).
   */
  private waitBeforeAskingAgain(ms: number): Promise<void> {
    if (this.disposed || this.keysOrderedInMain) return Promise.resolve();
    return new Promise((resolve) => {
      const done = (): void => {
        clearTimeout(timer);
        if (this.wakeDrain === done) this.wakeDrain = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.wakeDrain = done;
    });
  }

  /**
   * Phase 320.1, the door half. An answer that says the pane's machine is
   * not reachable right now is NOT a state of the pane: every number in it is
   * NO_PANE_HERE's, and applying them would draw the reader at live and latch
   * "no pane" for the rest of the mount. So it is kept as a fact, nothing is
   * applied, no listener is told, and the poll asks again at the live cadence.
   * Answers true when it took the answer. Any answer that reached the pane
   * clears both what this notes and `maybeParked`.
   */
  private noteUnreachable(state: TerminalScrollState): boolean {
    if (state.unreachable === true) {
      this.unreachable = true;
      this.schedule();
      return true;
    }
    this.unreachable = false;
    this.maybeParked = false;
    return false;
  }

  /**
   * Keep `historyAtEntry` true to the answer that just arrived — Phase 292.
   *
   * WHEN tmux SAYS, IT IS TAKEN AND NOTHING BELOW RUNS. tmux 3.7 and later
   * answer the depth of the frame copy mode froze (`frameHistory`, read from
   * `#{copy_position_limit}`), re-counted by tmux across a rewrap, so the
   * entry is exact on the park, across a resize, across a remount and across
   * a relaunch. It is what the bundled tmux answers. The rules below are the
   * INFERENCE for a tmux that does not say (3.6a, what `npm run dev` finds),
   * and each of their limits is a limit of that tmux alone.
   *
   *   position 0, out of copy mode   live, so there is no frozen frame: null
   *   0 → above 0                    the pane was just parked: this history
   *   above 0, and staying           the frame is the same frame: leave it
   *
   * THE INFERENCE'S FIRST LIMIT is the park itself. The first parked answer is
   * read after copy mode was entered and the view scrolled, so every line
   * printed in between is counted into the frame: measured on a scratch
   * server printing in bursts of 50, that was 50 lines in 4 of 6 parks, and
   * in the app at 20 lines a second it put a scrolled selection one line off.
   *
   * Three exceptions, each measured or read from a real path.
   *
   * A CHANGE OF SIZE. A different width rewraps the history and a different
   * height moves rows between the screen and the history, so `history` moves
   * without a line being printed. Every answer carries the size it was taken
   * at, and when it differs from the last answer's the entry is re-based to
   * keep the growth what it was. NOTHING ELSE HAPPENS ON A RESIZE. This file
   * used to re-send the position 300 ms after one (`holdPositionAcrossResize`,
   * Phase 12.11), and that is deleted: `#{scroll_position}` counts ROWS, a
   * rewrap changes how many rows lie below the reader, and re-sending the old
   * number threw a reader parked 720 rows back over soft-wrapped lines 127
   * lines on every change of width, where tmux by itself had the line exactly
   * right. tmux holds the line now, because main keeps its copy cursor on the
   * top row (`cursorToTopRow` in src/main/tmux/scroll.ts carries the
   * measurement).
   * THE LIMIT, stated: lines printed between two answers of different sizes
   * are read as rewrap, so the thumb understates the distance by what printed
   * across that one pair, about a poll interval's worth, per change of size,
   * for the rest of that park. MEASURED 2026-09-19 with probe:p292 arm d on
   * 3.6a at 17 lines a second: 4 lines short after one resize and 9 after two
   * (on 3.7b, which says the frame's depth, 0 and 0). It adds up for as long
   * as a window edge is held and dragged. The rule it replaces re-based on
   * EVERY answer until 300 ms after the last resize and lost 8 lines to a
   * single step, 16 to two, and 84 to a five second drag.
   *
   * POSITION 0 STILL IN COPY MODE. tmux's own resize can walk a view parked
   * near the bottom to position 0 without leaving copy mode, and the frame is
   * still the frame, so the entry is kept until copy mode is really left.
   *
   * AN ALTERNATE-SCREEN ANSWER with no history. Main reports `history: 0` for
   * a pane that is not parked over one, and an entry of 0 would turn the whole
   * transcript into growth; the entry waits for the next ordinary answer.
   *
   * AND A SURFACE THAT MOUNTS OVER A PANE LEFT PARKED adopts what the last one
   * knew (`leftParked` above), then falls under the rules here like any other
   * answer, a change of size while it was away included.
   */
  private noteEntry(state: TerminalScrollState): void {
    if (state.inMode && state.frameHistory !== null) {
      this.historyAtEntry = state.frameHistory;
      this.seen = { history: state.history, cols: state.cols, rows: state.rows };
      return;
    }
    if (state.position === 0) {
      if (!state.inMode) {
        this.historyAtEntry = null;
        this.seen = null;
        leftParked.delete(this.sessionId);
      }
      return;
    }
    if (state.innerAlt && state.history === 0) return;
    if (this.historyAtEntry === null) {
      const left = leftParked.get(this.sessionId);
      if (left !== undefined) {
        this.historyAtEntry = left.historyAtEntry;
        this.seen = left.seen;
      }
    }
    const seen = this.seen;
    if (this.historyAtEntry === null || seen === null) {
      this.historyAtEntry = state.history;
    } else if (seen.cols !== state.cols || seen.rows !== state.rows) {
      const growth = growthSinceEntry({
        position: state.position,
        history: seen.history,
        historyAtEntry: this.historyAtEntry
      });
      this.historyAtEntry = Math.max(0, state.history - growth);
    }
    this.seen = { history: state.history, cols: state.cols, rows: state.rows };
  }

  private apply(state: TerminalScrollState): void {
    // Phase 320.1 (D5). First of all, before the disposed test and before an
    // unreachable answer returns: main ordering this pane's keys is true of
    // every answer it gives for the pane, the not-reachable-now one included.
    this.noteKeysOrderedInMain(state);
    if (this.disposed) return;
    // Phase 320.1. Before anything below reads it, and before the latch: an
    // answer that says the machine is unreachable is not "no pane".
    if (this.noteUnreachable(state)) return;
    const entryBefore = this.historyAtEntry;
    this.noteEntry(state);
    const changed =
      state.hasPane !== this.state.hasPane ||
      state.position !== this.state.position ||
      state.history !== this.state.history ||
      state.rows !== this.state.rows ||
      state.innerAlt !== this.state.innerAlt ||
      state.innerMouse !== this.state.innerMouse ||
      this.historyAtEntry !== entryBefore;
    this.state = state;
    // Phase 95. Main says there is nothing it can read for this row. That is
    // a fact rather than a failure and it does not change under this surface,
    // so the answer is kept, the armed timer is dropped, the subscribers are
    // told once, and no new timer is armed.
    if (!state.hasPane) {
      this.noPane = true;
      if (this.timer !== null) {
        clearTimeout(this.timer);
        this.timer = null;
        this.pollMs = 0;
      }
      // Phase 320.1. Keys held for a scroll that will never be answered go
      // now, in order, as every key to such a pane goes from here on.
      const gmux = window.gmux;
      if (gmux !== undefined) this.deliverHeld(gmux);
    }
    if (changed) {
      const view = this.view;
      for (const listener of this.listeners) listener(view);
    }
    if (this.noPane) return;
    this.schedule();
  }

  private schedule(): void {
    // Phase 95. The brace to the belt in `apply` above. Every path that could
    // arm a timer runs through here, so one test makes the stop permanent.
    if (this.disposed || this.noPane) return;
    // Phase 320.1. While the machine is unreachable the last numbers are old,
    // so a parked cadence would only ask four times a second for nothing.
    const wanted =
      !this.unreachable && (this.state.position > 0 || this.dragging)
        ? SCROLLED_POLL_MS
        : LIVE_POLL_MS;
    if (this.timer !== null && this.pollMs === wanted) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.pollMs = wanted;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.refresh();
    }, wanted);
  }
}
