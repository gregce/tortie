#!/usr/bin/env node
/**
 * probe-p292.mjs. THE PHASE 292 APP RUN: the reader's line stays where they put
 * it, and the scrollbar says how far from live they really are.
 *
 * GitHub issue 29 (John Berryman): scroll back in a session while it keeps
 * printing and the text slides away from you. This is the reproduction's
 * scratch probe adopted into the tree, with the four things pull request 30
 * left graded beside the one it fixed.
 *
 * ONE Electron on a scratch profile, a scratch HOME and the tmux socket
 * build/harness-socket.mjs hands it. One project, one plain shell session. The
 * issue's own loop is typed with REAL KEYS over the DevTools protocol and
 * Enter, a line every 50 ms; once P292_MIN_LINES lines have printed the pane is
 * scrolled back about P292_BACK_LINES lines with REAL mouse-wheel events; and
 * from there every arm reads three rulers at once.
 *
 * ## The three rulers, and why the first one is the SCREEN
 *
 *   1. THE SCREEN. The xterm.js Terminal the pane draws from, reached through
 *      the React fiber of `.gmux-terminal-mount` (a ref whose value has a
 *      buffer, a write, rows and cols), because no product file gains a hook
 *      for a probe and no window seam exposes the instance. Row 0 and row
 *      rows-1 of `buffer.active`, `translateToString(true)`. The renderer
 *      paints exactly this buffer, so it is what a person's eyes see; the
 *      reproduction checked it against two photographs, and this run writes
 *      the same two (the park and the end) beside its readings so anybody can
 *      check it again.
 *   2. tmux's own `#{scroll_position}` and `#{history_size}` for the pane, on
 *      the harness socket, read with the SAME binary the server runs.
 *   3. The scrollbar thumb's rectangle inside its lane.
 *
 * `capture-pane` is NOT the ruler for where the reader is, and that is the
 * lesson of this phase: it answers the LIVE screen the whole time a pane is
 * scrolled back, which is how Phase 12.3's founding measurement came to read a
 * held view as a sliding one. It is used here for the one thing it does
 * answer, the newest line printed, and once for the whole transcript, to learn
 * at which history index `line 1` sits.
 *
 * ## The honest number, computed from this probe's OWN readings
 *
 * `#{scroll_position}` counts from the bottom AS IT WAS FROZEN when the pane
 * entered copy mode, while `#{history_size}` is live. So the reader's distance
 * from live is
 *
 *     distance = position + (history - historyAtEntry)
 *
 * and an honest thumb sits at `(1 - distance / history)` of its travel. The
 * probe never asks the app for `historyAtEntry`. It reads it off the screen at
 * the first sample after the park: the top row shows `line T`, the transcript
 * dump says `line N` sits at history index N + c, and the top of a parked view
 * is index `historyAtEntry - position`, so `historyAtEntry = T + position + c`.
 * That is checked against tmux's own bracket (the history read just before
 * the first wheel notch and just after it); when the screen is moving at the
 * park, which is the parent's defect, the bracket's upper reading is used and
 * a note says so. The app reads the same number a millisecond or two after the
 * entry and may have heard one line more, so the expectation is held against
 * both and the closer one is printed.
 *
 * THE THUMB IS DRAWN FROM THE LAST POLL, up to a quarter of a second old, and
 * at 17 lines a second that is four or five lines and about 6 px of thumb. So
 * the history the app last heard is recovered from the thumb's own HEIGHT,
 * which this phase does not change (`rows / (history + rows)` of the lane),
 * and the thumb's TOP is held against the honest formula AT THAT HISTORY. How
 * old that history is against tmux's own is graded separately, so a poll that
 * stopped cannot hide behind the forgiveness.
 *
 * ## The arms, each one able to run alone (P292_ARMS)
 *
 *   a  THE HOLD. Nothing is touched for P292_WATCH_MS (8 s), sampled every
 *      250 ms. The top line must not move while at least 100 lines print. At
 *      origin/main it falls one line for every line printed (259 to 117, -1.0)
 *      and that is this arm's red; the sentence is a person's: "the text you
 *      scrolled back to slid N lines toward older text while M lines printed"
 *   b  THE THUMB, over the same samples. While parked it must move UP, away
 *      from live, as lines print, and sit within 2 px of the honest formula.
 *      At pull request 30's head before this phase it creeps DOWN (531 to
 *      601 px of an 810 px lane in 8 s), which is this arm's red
 *   c  A HELD DRAG. Real pointer events: press the thumb's centre, 100 px up in
 *      five steps, hold one second, release. Pressing without moving must not
 *      jump the text; the drag must move the text back; during the hold the
 *      top line holds, the thumb does not slide DOWN, toward live, under a
 *      pointer that is not moving (390.8 to 410.2 px before this phase), and
 *      it is within 2 px of the honest formula, which is the entry's own
 *      wording ("while parked and during a held drag"); letting go must not
 *      move the text; and one second later, parked again, the thumb is within
 *      2 px of the formula still.
 *      THE INTEGRATOR'S RULING, so no round reopens it by accident. While the
 *      button is down lines keep printing and the reader keeps getting
 *      further from live, so an honest thumb goes UP under a still pointer,
 *      measured at 7.4 to 16.4 px a second. The first draft of this arm
 *      graded any slide, which is a thumb PINNED under the pointer, and a
 *      pinned thumb is the lie this phase removes told for the length of a
 *      drag and corrected with a jump at the release. The upward slide is
 *      PRINTED and not graded. One more reading is printed and not graded:
 *      the held pointer moves ONE pixel more, and the lines the text jumps by
 *      (8 to 12 toward live, measured) is what a map from the POINTER's pixel
 *      costs once the thumb has left it. A drag that moved the thumb by the
 *      pointer's DELTA would not pay it; that is a different drag and not
 *      this phase
 *   d  A WINDOW RESIZE while parked, TWICE, through
 *      Emulation.setDeviceMetricsOverride, the seam probe:p288 and probe:p284
 *      use. Each is sampled at 150 ms and four times after; once it settles
 *      the top line equals the top line before it, give or take one, and the
 *      pane is still scrolled back. They are two because they were two
 *      defects:
 *        the FIRST, 1440 to 1340 px, is made at least 33 s after the attach,
 *        which is when a person makes one. tmux asks the terminal for its
 *        colours again on a resize once its own rate limit has passed; xterm
 *        answers on the event a keystroke arrives on; and a keystroke takes a
 *        scrolled pane to live ON PURPOSE. Measured with this probe at
 *        origin/main and on this branch before its integration round: the
 *        reader is thrown back to live output within 150 ms, with OSC 10 and
 *        OSC 11 recorded at +38 ms. The reproduction resized 26 s after its
 *        attach and so never saw it. The rate limit is tmux's
 *        TTY_REQUEST_LIMIT, 30 s. The integration round routes the two
 *        reports the way Phase 205 routes a focus report
 *        (src/renderer/terminal/keys/pane-report.ts), so this resize is red
 *        at the parent and green here
 *        the SECOND, 1340 to 1240 px, follows inside that rate limit, so
 *        nothing is asked and what is read is the resize alone: both builds
 *        before this phase jump FORWARD by rows - 1 (114 to 157), because a
 *        wheel scroll leaves tmux's copy cursor on the bottom row and tmux
 *        puts the cursor's line on top across a reflow. main now puts that
 *        cursor on the top row after every scroll that parks
 *        (`cursorToTopRow`, src/main/tmux/scroll.ts), so tmux keeps the
 *        reader's top line by itself and nothing in the app re-scrolls
 *      THE THUMB ACROSS A RESIZE is graded too (the fix round). A change of
 *      size can rewrap the history, so the app re-bases its entry across the
 *      one answer pair whose size differs, and the lines printed between
 *      those two answers are read as rewrap: the thumb may understate the
 *      distance by at most that, a poll interval's printing per change of
 *      size (`noteEntry`, src/renderer/terminal/scroll/surface.ts). The
 *      bound held is half a second's printing per change, in lines, and a
 *      thumb short by more is a finding. The rule it replaced lost 8 lines on
 *      one step and 16 on two, every run
 *      Every chunk xterm hands the app is recorded by a listener beside the
 *      product's own, so a pane found at live output names its own cause
 *   e  BACK TO LIVE. Wheel toward live until tmux says the pane has left copy
 *      mode: the newest line printed is on screen, the screen follows new
 *      output again, and the thumb is at the foot of its lane
 *   f  ANOTHER SESSION AND BACK (the fix round, the attack verifier's
 *      `switch`). Parked, a second session is made and shown for four
 *      seconds, and the first is shown again, which mounts its pane afresh
 *      and attaches a new client. tmux asks a terminal that attaches what it
 *      is, xterm answers DA1 and DA2 on the keystroke's event, and each alone
 *      threw the reader to live output about 100 ms after the return, on
 *      origin/main and on this branch before the fix round alike. Graded:
 *      still scrolled back, the same top line, and the thumb within 2 px of
 *      the honest formula, which counts every line printed while away,
 *      because the surface that unmounted hands its frame to the one that
 *      mounts (`leftParked`, surface.ts)
 *   g  SOFT-WRAPPED LINES ACROSS A WIDTH CHANGE (the fix round, the attack
 *      verifier's `wrapq`). The loop is stopped, 900 lines of about 290
 *      characters are printed at once into a quiet pane, the pane is parked
 *      about 720 rows back, and the window is widened, narrowed and widened.
 *      The top row's LOGICAL line (every row of line N carries ` wN`) must
 *      hold, give or take one. The hold this phase first added re-sent the
 *      pre-resize position 300 ms after a resize, a number that counts ROWS,
 *      and moved the reader 127 lines on every change of width where tmux
 *      alone had the line exactly right. Run last, because it stops the loop
 *
 * ## Another checkout, which is how the parent is measured
 *
 * `P292_CHECKOUT=<a BUILT worktree>` points THIS run at that checkout's `out/`
 * (its cwd and its build) with this file's rulers and graders, one Electron,
 * never beside another run: two builds are two invocations. At origin/main arm
 * a is expected to FAIL at about -1.0 lines per line printed; at pull request
 * 30's head before this phase a passes while b, c's thumb and d fail. The exit
 * code is the same rule everywhere: 0 with no finding, 1 with findings, 2 on a
 * refusal.
 *
 * ## What it refuses
 *
 *   - No `GMUX_TMUX_SOCKET`: it does not guess one, it says how to run it.
 *   - The socket `gmux` and the socket `default`, by name, and any socket that
 *     is not a `gmux-p292` harness socket.
 *   - No `GMUX_HARNESS_DIR`.
 *   - `out/main/index.js` missing in the checkout it is pointed at.
 *   - A STALE `out/` in that checkout: any source the readings depend on (the
 *     scroll directory, TerminalPane.tsx and the report files under
 *     keys/, main's scroll.ts and core.ts, the shared terminal contract)
 *     newer than the bundle built from it. "out/ is
 *     older than the scroll sources; build first", exit 2, before anything is
 *     launched. The script carries no `npm run build &&` on purpose, because
 *     a run against another checkout must not rebuild this one.
 *   - A `GMUX_TMUX_BIN` that is not an executable file.
 *   - Any byte outside `GMUX_HARNESS_DIR` and the readings directory.
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET   The scratch socket. build/harness-socket.mjs sets it.
 *   GMUX_HARNESS_DIR   The scratch directory. Set by the same wrapper.
 *   GMUX_TMUX_BIN      Optional, PASSED THROUGH to the app, whose development
 *                      build honours it (src/main/tmux/resolve.ts), and used by
 *                      this probe to read. The bundled 3.7b is
 *                      build/vendor/tmux/bin/tmux and is what a run with no
 *                      knob resolves; the system's 3.6a is what `npm run dev`
 *                      finds. The run PRINTS the version the server reports
 *                      and the server's own command line, and a server that is
 *                      not the binary asked for is a finding.
 *   P292_CHECKOUT      A BUILT worktree to measure instead of this one.
 *   P292_ARMS          A comma separated subset of a,b,c,d,e,f,g. All by default.
 *   P292_MIN_LINES     Lines printed before the scroll. Default 400, which
 *                      leaves the parent room to fall for the whole watch.
 *   P292_BACK_LINES    Lines to wheel back. Default 100.
 *   P292_WATCH_MS      How long arms a and b watch. Default 8000.
 *   P292_OUT_DIR       Where readings, the two photographs and the app's
 *                      own output go. Default `out/p292`. `out/` is gitignored
 *                      and electron-builder packs `out/**`, so remove the
 *                      directory before a package.
 *
 * ## Usage, from the worktree root. BUILD FIRST.
 *
 *   npm run build && npm run probe:p292                     HEAD, all arms, 3.7b
 *   GMUX_TMUX_BIN=/opt/homebrew/bin/tmux npm run -s probe:p292
 *                                                           the same on 3.6a
 *   P292_CHECKOUT=/path/to/parent P292_ARMS=a npm run -s probe:p292
 *                                                           the parent, built
 *   node build/p292/probe-p292.mjs --self-test              graders alone,
 *                                                           launches nothing
 *
 * All seven arms are one launch of about 65 s, most of it waiting for the loop
 * to print and for arm d's half minute.
 *
 * ## SAFETY
 *
 * The one Electron is started through build/electron-run.mjs's `withElectron`,
 * which ends the tree it started in a `finally` block whatever happened, and
 * ends the scratch tmux server it was handed in that same block; this file
 * ends that server once more in a `finally` of its own, by the socket's exact
 * name. The loop that prints is typed into the pane and belongs to the pane's
 * own shell, so it ends with the scratch server and is never a child of this
 * script. Every process this script starts itself is a tmux or a ps read that
 * has exited before the call returns. It spawns no agent, spends no token,
 * opens no keychain and never names `-L gmux` or the default server.
 */
import { execFile, spawnSync } from 'node:child_process';
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';

const execFileP = promisify(execFile);
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p292]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The numbers this run holds the app against.
//
// BY VALUE, and on purpose: a build script cannot import TypeScript, and a
// probe that read the thumb's geometry out of TerminalScrollbar.tsx would
// agree with a wrong one. MIN_THUMB_PX is that file's floor on the thumb's
// height; below it the height no longer says anything about the history, and
// the probe falls back to the scrollbar's own aria-valuemax.
// ---------------------------------------------------------------------------
const MIN_THUMB_PX = 20;
/** The thumb is judged within this many CSS px of the lane. */
const THUMB_TOL_PX = 2;
/** An arm that watches asserts nothing unless this many lines printed. */
const MIN_PRINTED = 100;
/** The thumb must move at least this far UP over the watch to count as up. */
const MIN_UP_PX = 10;
/**
 * How many lines the history the thumb is drawn from may trail tmux's own.
 * The poll is a quarter of a second and the loop prints about 17 lines a
 * second, so four or five is ordinary; twenty is more than a second of
 * silence, which is a poll that is not running.
 */
const MAX_STALE_LINES = 20;
/**
 * How long after the attach arm d's first resize waits for. tmux limits how
 * often it asks a terminal for its colours again; every resize this probe made
 * 32 s or more after the attach was answered with OSC 10 and 11, and every one
 * at 28 s was not. 33 s is the first with a second to spare.
 */
const REASK_MS = 33_000;
const ALL_ARMS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const ARMS = [...ALL_ARMS, 'RUN'];

// ---------------------------------------------------------------------------
// The graders. Pure, exported, and proved both ways under --self-test.
// ---------------------------------------------------------------------------
const r1 = (n) => (typeof n === 'number' ? Math.round(n * 10) / 10 : n);
const r3 = (n) => (typeof n === 'number' ? Math.round(n * 1000) / 1000 : n);
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

/** `line 261` to 261, anything else to null. */
export function lineNo(text) {
  const m = /line (\d+)/.exec(text ?? '');
  return m ? Number(m[1]) : null;
}

/**
 * The phase's formula, restated here BY VALUE so the probe's expectation is
 * its own and not an import of the thing it judges: how many lines the reader
 * is from live. `position` is frozen at the entry, `history` is live.
 */
export function distanceFromLive(view) {
  if (view.position === 0) return 0;
  return view.position + Math.max(0, view.history - (view.historyAtEntry ?? view.history));
}

/**
 * At which history index `line 1` sits, less one: `line N` is at index N + c.
 * `dump` is every row of `capture-pane -S - -E -`, oldest first. Null when the
 * transcript holds no `line 1`, which the caller says out loud.
 */
export function lineOffset(dump) {
  const at = dump.findIndex((row) => row.trim() === 'line 1');
  return at < 0 ? null : at - 1;
}

/**
 * The history at the moment the pane entered copy mode, off the screen: the
 * top of a parked view is history index `historyAtEntry - position`, and the
 * top row shows `line T` at index T + c.
 */
export function entryFromScreen(top, position, offset) {
  if (!isNum(top) || !isNum(position) || !isNum(offset)) return null;
  return top + position + offset;
}

/**
 * Which entry history the run holds the thumb against. The screen's answer
 * when it sits inside tmux's own bracket (give or take the one line a read
 * can trail by), else the bracket's upper reading with the reason.
 */
export function chooseEntry(fromScreen, before, afterFirst) {
  if (isNum(fromScreen) && isNum(before) && isNum(afterFirst) && fromScreen >= before - 1 && fromScreen <= afterFirst + 1) {
    return { entry: fromScreen, source: 'screen', why: null };
  }
  if (isNum(afterFirst)) {
    return {
      entry: afterFirst,
      source: 'tmux',
      why: `the screen says the pane entered copy mode at history ${String(fromScreen)}, outside tmux's own bracket ${String(before)}..${String(afterFirst)}; the screen was moving at the park, so tmux's reading after the first notch is used`
    };
  }
  return { entry: null, source: 'none', why: 'no reading of the history at the entry exists' };
}

/**
 * The history the thumb was drawn from, off the thumb's own height:
 * thumbH = rows / (history + rows) * laneH. Null at the height floor, where
 * the height says nothing.
 */
export function historyFromThumb(thumbH, laneH, rows) {
  if (!isNum(thumbH) || !isNum(laneH) || !isNum(rows) || rows <= 0) return null;
  if (thumbH <= MIN_THUMB_PX + 0.01) return null;
  return Math.round((rows * laneH) / thumbH - rows);
}

/** Where an honest thumb's top sits, in px below the lane's top. */
export function honestThumbTop(distance, history, thumbH, laneH) {
  if (!(history > 0)) return Math.max(0, laneH - thumbH);
  const d = Math.min(history, Math.max(0, distance));
  return (1 - d / history) * Math.max(0, laneH - thumbH);
}

/**
 * One sample against the honest formula. Held against `entry` and against
 * `entry + 1`, the two numbers the app can honestly have heard, and the
 * closer one is reported. Null when the sample has no thumb to judge.
 */
export function thumbResidual(s, entry) {
  if (!isNum(s.thumbTop) || !isNum(s.thumbH) || !isNum(s.laneH) || !isNum(s.position) || !isNum(entry)) return null;
  const heard = historyFromThumb(s.thumbH, s.laneH, s.rows) ?? (isNum(s.ariaMax) ? s.ariaMax : null);
  if (heard === null || heard <= 0) return null;
  let best = null;
  for (const e of [entry, entry + 1]) {
    const distance = distanceFromLive({ position: s.position, history: heard, historyAtEntry: e });
    const expected = honestThumbTop(distance, heard, s.thumbH, s.laneH);
    const residual = Math.abs(s.thumbTop - expected);
    if (best === null || residual < best.residual) best = { residual, expected, distance, heard, entry: e };
  }
  return best;
}

/** The numbers arm a prints, so both builds are two columns of one table. */
export function holdSummary(samples) {
  const park = samples[0] ?? null;
  const end = samples[samples.length - 1] ?? null;
  if (park === null || end === null || samples.length < 2) return null;
  // The slope is read over the span before the view reached the top of the
  // transcript and stuck, because a view that cannot fall any further would
  // otherwise read as a gentler defect than it is.
  const pinnedAt = samples.findIndex((s, i) => i > 0 && isNum(s.position) && isNum(s.history) && s.position >= s.history);
  const span = pinnedAt > 0 ? samples[pinnedAt] : end;
  const printedSpan = (span.lastPrinted ?? 0) - (park.lastPrinted ?? 0);
  const movedSpan = (span.top ?? 0) - (park.top ?? 0);
  return {
    seconds: (end.ms - park.ms) / 1000,
    samples: samples.length,
    topAtPark: park.top,
    topAtEnd: end.top,
    moved: isNum(park.top) && isNum(end.top) ? end.top - park.top : null,
    printed: (end.lastPrinted ?? 0) - (park.lastPrinted ?? 0),
    movedPerPrinted: printedSpan > 0 ? r3(movedSpan / printedSpan) : null,
    pinnedAfterMs: pinnedAt > 0 ? samples[pinnedAt].ms : null,
    held: samples.filter((s) => s.top === park.top).length
  };
}

/** Arm a. Every sample's top line is the park's, while 100 lines print. */
export function holdFindings(samples) {
  const sum = holdSummary(samples);
  if (sum === null) return ['a no samples were taken, so the hold was not tested'];
  const out = [];
  if (!isNum(sum.topAtPark)) return [`a the top row at the park is not a numbered line (${J(samples[0].topText ?? null)}), so there is nothing to hold`];
  if (sum.printed < MIN_PRINTED) out.push(`a only ${String(sum.printed)} lines printed during the watch, want at least ${String(MIN_PRINTED)}, so the hold was not tested`);
  const left = samples.find((s) => s.inMode === false);
  if (left) out.push(`a the pane went back to live output by itself ${String(r1(left.ms / 1000))} s into the watch`);
  if (sum.held !== samples.length) {
    const moved = sum.moved ?? 0;
    const pinned = sum.pinnedAfterMs !== null ? `, and it reached the top of the transcript after ${String(r1(sum.pinnedAfterMs / 1000))} s and stuck` : '';
    out.push(
      `a the text you scrolled back to slid ${String(Math.abs(moved))} lines toward ${moved <= 0 ? 'older' : 'newer'} text while ${String(sum.printed)} lines printed ` +
        `(${String(sum.movedPerPrinted)} lines per line printed; top line ${String(sum.topAtPark)} -> ${String(sum.topAtEnd)}, held in ${String(sum.held)} of ${String(sum.samples)} samples${pinned})`
    );
  }
  return out;
}

/** Arm b. Up, away from live, and within 2 px of the honest formula. */
export function thumbFindings(samples, entry) {
  const drawn = samples.filter((s) => isNum(s.thumbTop));
  if (drawn.length < 2) return ['b no thumb is drawn while the pane is scrolled back'];
  const out = [];
  const first = drawn[0];
  const last = drawn[drawn.length - 1];
  const printed = (last.lastPrinted ?? 0) - (first.lastPrinted ?? 0);
  if (printed < MIN_PRINTED) out.push(`b only ${String(printed)} lines printed during the watch, want at least ${String(MIN_PRINTED)}, so the thumb was not tested`);
  const movedPx = last.thumbTop - first.thumbTop;
  if (!(movedPx <= -MIN_UP_PX)) {
    out.push(
      `b the scrollbar thumb moved ${String(r1(Math.abs(movedPx)))} px ${movedPx > 0 ? 'DOWN, toward live,' : 'and not up'} while ${String(printed)} lines printed and the reader got further from live ` +
        `(${String(r1(first.thumbTop))} -> ${String(r1(last.thumbTop))} px of a ${String(r1(last.laneH))} px lane); an honest thumb moves up`
    );
  }
  if (!isNum(entry)) {
    out.push('b the history at the entry could not be read, so the thumb has no honest position to be held against');
    return out;
  }
  let worst = null;
  let over = 0;
  let judged = 0;
  let stalest = null;
  for (const s of drawn) {
    const r = thumbResidual(s, entry);
    if (r === null) continue;
    judged += 1;
    if (r.residual > THUMB_TOL_PX) over += 1;
    if (worst === null || r.residual > worst.r.residual) worst = { s, r };
    const stale = isNum(s.history) ? s.history - r.heard : null;
    if (stale !== null && (stalest === null || stale > stalest.stale)) stalest = { s, stale, heard: r.heard };
  }
  if (judged === 0) out.push('b no sample carries a thumb height that says which history it was drawn from');
  if (worst !== null && over > 0) {
    out.push(
      `b the thumb is ${String(r1(worst.r.residual))} px from where the reader is ${String(r1(worst.s.ms / 1000))} s into the park: drawn at ${String(r1(worst.s.thumbTop))} px, honest ${String(r1(worst.r.expected))} px ` +
        `(${String(worst.r.distance)} lines from live over a history of ${String(worst.r.heard)}, entered at ${String(worst.r.entry)}, position ${String(worst.s.position)}); ${String(over)} of ${String(judged)} samples are more than ${String(THUMB_TOL_PX)} px off`
    );
  }
  // What a screen reader is told (aria-valuenow) is the thumb's own distance:
  // the history less how far from live the reader is. The fix round's pin,
  // because until then nothing read it.
  let aria = null;
  for (const s of drawn) {
    const r = thumbResidual(s, entry);
    if (r === null || !isNum(s.ariaNow) || !isNum(s.ariaMax)) continue;
    const want = Math.max(0, s.ariaMax - distanceFromLive({ position: s.position, history: s.ariaMax, historyAtEntry: r.entry }));
    const off = Math.abs(s.ariaNow - want);
    if (aria === null || off > aria.off) aria = { s, off, want };
  }
  if (aria !== null && aria.off > 1) {
    out.push(`b a screen reader is told the reader is at ${String(aria.s.ariaNow)} of ${String(aria.s.ariaMax)} where the thumb's own distance says ${String(aria.want)}, ${String(aria.off)} lines apart ${String(r1(aria.s.ms / 1000))} s into the park`);
  }
  if (stalest !== null && stalest.stale > MAX_STALE_LINES) {
    out.push(`b the thumb is drawn from a history of ${String(stalest.heard)} while tmux says ${String(stalest.s.history)}, ${String(stalest.stale)} lines old ${String(r1(stalest.s.ms / 1000))} s into the park; the poll that keeps the thumb is not running`);
  }
  return out;
}

/**
 * Arm c. `snaps` is { before, pressed, moved, held, nudged?, released, after }
 * of one drag, each a sample. `entry` is the history at the entry, for the one
 * formula reading that is graded, a second after the release.
 */
export function dragFindings(snaps, entry) {
  const { before, pressed, moved, held, released, after } = snaps;
  if (!before || !isNum(before.thumbTop)) return ['c no thumb is drawn, so there is nothing to press'];
  if (!pressed || !moved || !held || !released || !after) return ['c the drag did not complete, so it was not tested'];
  const out = [];
  const tops = [before, pressed, moved, held, released, after].map((s) => s.top);
  if (tops.some((t) => !isNum(t))) return [`c a top row during the drag is not a numbered line (${J(tops)}), so the hold cannot be read`];
  if (Math.abs(pressed.top - before.top) > 1) out.push(`c pressing the thumb without moving it jumped the text ${String(Math.abs(pressed.top - before.top))} lines (top line ${String(before.top)} -> ${String(pressed.top)})`);
  if (!(moved.top < pressed.top)) out.push(`c dragging the thumb 100 px up did not move the text back (top line ${String(pressed.top)} -> ${String(moved.top)})`);
  if (held.top !== moved.top) {
    const d = held.top - moved.top;
    out.push(`c the text slid ${String(Math.abs(d))} lines toward ${d < 0 ? 'older' : 'newer'} text during a one second held drag (top line ${String(moved.top)} -> ${String(held.top)})`);
  }
  // Lines print while the button is down, so the reader is getting further
  // from live and an honest thumb goes UP under a still pointer. What it must
  // not do is what it did before this phase, creep DOWN toward live, and it is
  // held against the formula here exactly as it is while parked. A thumb
  // pinned under the pointer fails the second of these, on purpose: see the
  // integrator's ruling in this file's header.
  if (isNum(moved.thumbTop) && isNum(held.thumbTop) && held.thumbTop - moved.thumbTop > THUMB_TOL_PX) {
    out.push(`c the thumb slid ${String(r1(held.thumbTop - moved.thumbTop))} px down, toward live, under a pointer that did not move for one second (${String(r1(moved.thumbTop))} -> ${String(r1(held.thumbTop))} px)`);
  }
  const rh = thumbResidual(held, entry);
  if (rh === null) out.push('c one second into the held drag there is no thumb to hold against the honest formula');
  else if (rh.residual > THUMB_TOL_PX) {
    out.push(`c one second into the held drag the thumb is ${String(r1(rh.residual))} px from where the reader is: drawn at ${String(r1(held.thumbTop))} px, honest ${String(r1(rh.expected))} px (${String(rh.distance)} lines from live over a history of ${String(rh.heard)})`);
  }
  // The run moves the held pointer one pixel more before it lets go, a reading
  // that is printed and not graded, so the release is held against THAT top.
  const last = snaps.nudged && isNum(snaps.nudged.top) ? snaps.nudged : held;
  if (released.top !== last.top || after.top !== last.top) {
    out.push(`c letting go of the thumb moved the text (top line ${String(last.top)} held, ${String(released.top)} at the release, ${String(after.top)} a second later)`);
  }
  const r = thumbResidual(after, entry);
  if (r === null) out.push('c one second after the drag there is no thumb to hold against the honest formula');
  else if (r.residual > THUMB_TOL_PX) {
    out.push(`c one second after the drag the thumb is ${String(r1(r.residual))} px from where the reader is: drawn at ${String(r1(after.thumbTop))} px, honest ${String(r1(r.expected))} px (${String(r.distance)} lines from live over a history of ${String(r.heard)})`);
  }
  return out;
}

/** What one chunk xterm handed the app is, in words a person can check. */
export function chunkKind(d) {
  if (/^\x1b\]10;/.test(d)) return 'a foreground colour report (OSC 10)';
  if (/^\x1b\]11;/.test(d)) return 'a background colour report (OSC 11)';
  if (/^\x1b\[[IO]$/.test(d)) return 'a focus report';
  if (/^\x1b\[\?[0-9;]*c$/.test(d)) return 'a primary device attributes answer (DA1)';
  if (/^\x1b\[>[0-9;]*c$/.test(d)) return 'a secondary device attributes answer (DA2)';
  return J(d);
}

/**
 * Arm d, one resize. `before` and the samples after the window narrowed,
 * oldest first; `o.label` names which resize; `o.sent` is what xterm handed
 * the app across it, so a pane thrown back to live names its own cause.
 */
export function resizeFindings(before, afters, o = {}) {
  const label = o.label ?? 'd';
  const sent = o.sent ?? [];
  if (!before || !isNum(before.top)) return [`${label}: the top row before the resize is not a numbered line, so there is nothing to hold`];
  if (before.inMode !== true) return [`${label}: the pane is not scrolled back before the resize, so no parked view was resized`];
  if (afters.length < 2) return [`${label}: the resize was not sampled, so it was not tested`];
  const out = [];
  const settled = afters.slice(-2);
  const last = settled[settled.length - 1];
  if (last.paneW === before.paneW) out.push(`${label}: the window went narrower and the pane stayed ${String(before.paneW)} columns wide, so no resize was tested`);
  const rows = isNum(before.paneH) ? before.paneH : null;
  const gone = afters.find((s) => s.inMode === false);
  if (gone) {
    // ONE finding for one event. A pane at live output is hundreds of lines
    // from the reader's place, and saying that as a second finding would count
    // the same defect twice.
    const cause =
      sent.length > 0
        ? `; nobody typed, and xterm handed the app ${sent.map((e) => `${chunkKind(e.d)} at +${String(e.ms)} ms`).join(' and ')}, which the app sends the way it sends a keystroke, and a keystroke takes a scrolled pane to live on purpose`
        : '; nobody typed and xterm handed the app nothing, so the pane left copy mode by another road';
    out.push(`${label}: narrowing the window threw the reader back to live output within ${String(r1(gone.ms / 1000))} s (top line ${String(before.top)} -> ${String(last.top)})${cause}`);
    return out;
  }
  for (const s of settled) {
    if (!isNum(s.top)) {
      out.push(`${label}: the top row ${String(r1(s.ms / 1000))} s after the resize is not a numbered line (${J(s.topText ?? null)})`);
      break;
    }
    const d = s.top - before.top;
    if (Math.abs(d) > 1) {
      out.push(
        `${label}: narrowing the window moved the text you were reading ${String(Math.abs(d))} lines toward ${d > 0 ? 'live' : 'older text'} (top line ${String(before.top)} -> ${String(s.top)}, ${String(r1(s.ms / 1000))} s after` +
          `${rows !== null ? `; rows - 1 is ${String(rows - 1)}` : ''})`
      );
      break;
    }
  }
  return out;
}

/**
 * A row's logical line. A soft-wrapped line of arm g carries ` wN` on every
 * row it wraps onto, so a row that begins in the middle of line N still says
 * N; any other row is read as `line N`.
 */
export function tokenOf(text) {
  const w = /(?:^| )w(\d+)(?: |$)/.exec(text ?? '');
  return w ? Number(w[1]) : lineNo(text);
}

/**
 * Arm d's THUMB after a resize (the fix round). On a tmux that says how deep
 * the frozen frame is (3.7b) the thumb stays exact. On one that does not
 * (3.6a) the app re-bases its inferred entry across the one answer pair whose
 * size differs, and whatever printed between those two answers is read as
 * rewrap: at most a poll interval's printing per change of size. The bound
 * held is half a second's printing per change, plus the one line the entry
 * may be late by. `o.changes` is how many changes of size this park has been
 * through, `o.rate` the lines printed a second.
 */
export function resizeThumbFindings(s, entry, o = {}) {
  const label = o.label ?? 'd';
  if (!s || !isNum(s.thumbTop) || s.inMode !== true) return [];
  const r = thumbResidual(s, entry);
  if (r === null) return [`${label}: after the resize there is no thumb that says which history it was drawn from`];
  const travel = Math.max(0, s.laneH - s.thumbH);
  if (!(travel > 0)) return [];
  const drawn = Math.round((1 - s.thumbTop / travel) * r.heard);
  const short = r.distance - drawn;
  const changes = o.changes ?? 1;
  const rate = isNum(o.rate) ? o.rate : 20;
  const bound = changes * Math.ceil(rate * 0.5) + 1;
  if (Math.abs(short) <= bound) return [];
  return [
    `${label}: after the resize the thumb says ${String(drawn)} lines from live and the reader is ${String(r.distance)}, ${String(Math.abs(short))} lines ${short > 0 ? 'short' : 'over'}, ` +
      `where ${String(bound)} is the most ${String(changes)} change(s) of size may cost at ${String(rate)} lines a second`
  ];
}

/**
 * Arm f. `before` is the parked sample taken before another session was
 * shown, `back` the one taken after this session was shown again; `o.entry`
 * is the history at the park, `o.sent` what xterm handed the app at the
 * return, so a reader thrown to live names the cause.
 */
export function switchFindings(before, back, o = {}) {
  if (!before || before.inMode !== true || !isNum(before.top)) return ['f the pane was not scrolled back on a numbered line before leaving, so nothing was left parked'];
  if (!back) return ['f the pane was not read after coming back'];
  if (back.inMode !== true) {
    const sent = o.sent ?? [];
    const cause =
      sent.length > 0
        ? `; nobody typed, and xterm handed the app ${sent.map((e) => `${chunkKind(e.d)} at +${String(e.ms)} ms`).join(', ')}`
        : '';
    return [`f going to another session and back threw the reader to live output (top line ${String(before.top)} -> ${String(back.top)})${cause}`];
  }
  const out = [];
  if (back.top !== before.top) {
    out.push(`f going to another session and back moved the text you were reading ${String(Math.abs((back.top ?? 0) - before.top))} lines (top line ${String(before.top)} -> ${String(back.top)})`);
  }
  const r = thumbResidual(back, o.entry);
  if (r === null) out.push('f back again there is no thumb to hold against the honest formula');
  else if (r.residual > THUMB_TOL_PX) {
    out.push(
      `f back again the thumb is ${String(r1(r.residual))} px from where the reader is: drawn at ${String(r1(back.thumbTop))} px, honest ${String(r1(r.expected))} px ` +
        `(${String(r.distance)} lines from live over a history of ${String(r.heard)}); every line printed while away is distance too`
    );
  }
  return out;
}

/**
 * Arm g, one resize over soft-wrapped lines. `before` and the samples after,
 * oldest first, each carrying `token`, the top row's logical line.
 */
export function wrapFindings(before, afters, o = {}) {
  const label = o.label ?? 'g';
  const verb = o.verb ?? 'resizing';
  if (!before || !isNum(before.token)) return [`${label}: the top row before the resize carries no line number, so there is nothing to hold`];
  if (before.inMode !== true) return [`${label}: the pane is not scrolled back before the resize, so no parked view was resized`];
  if (afters.length < 2) return [`${label}: the resize was not sampled, so it was not tested`];
  const last = afters[afters.length - 1];
  if (last.paneW === before.paneW) return [`${label}: the pane stayed ${String(before.paneW)} columns wide, so no rewrap was tested`];
  const gone = afters.find((s) => s.inMode === false);
  if (gone) return [`${label}: ${verb} the window threw the reader back to live output within ${String(r1(gone.ms / 1000))} s (line ${String(before.token)} -> ${String(last.token)})`];
  for (const s of afters.slice(-2)) {
    if (!isNum(s.token)) return [`${label}: the top row ${String(r1(s.ms / 1000))} s after the resize carries no line number (${J(s.topText ?? null)})`];
    const d = s.token - before.token;
    if (Math.abs(d) > 1) {
      return [
        `${label}: ${verb} the window moved the text you were reading ${String(Math.abs(d))} lines toward ${d > 0 ? 'live' : 'older text'} over soft-wrapped lines ` +
          `(line ${String(before.token)} -> ${String(s.token)}, ${String(before.paneW)} -> ${String(s.paneW)} columns, ${String(r1(s.ms / 1000))} s after; ${String(r1(afters[0].ms / 1000))} s after it the top row was line ${String(afters[0].token)})`
      ];
    }
  }
  return [];
}

/** Arm e. Out of copy mode, the newest line on screen, the screen following. */
export function liveFindings(r) {
  const out = [];
  if (r.inMode !== false || (isNum(r.position) && r.position > 0)) {
    out.push(`e after ${String(r.notches)} wheel notches toward live the pane is still scrolled back ${String(r.position)} lines`);
    return out;
  }
  if (!isNum(r.screenMax) || !isNum(r.printedMax) || r.printedMax - r.screenMax > 12) out.push(`e the newest line printed is ${String(r.printedMax)} and the last line on screen is ${String(r.screenMax)}`);
  if (!(isNum(r.screenMaxLater) && isNum(r.screenMax) && r.screenMaxLater > r.screenMax)) out.push(`e the screen did not follow new output once back at live (last line ${String(r.screenMax)}, then ${String(r.screenMaxLater)} half a second later)`);
  if (isNum(r.thumbTop) && isNum(r.thumbH) && isNum(r.laneH) && Math.abs(r.thumbTop - (r.laneH - r.thumbH)) > THUMB_TOL_PX) {
    out.push(`e back at live the thumb sits ${String(r1(r.laneH - r.thumbH - r.thumbTop))} px above the foot of its lane`);
  }
  return out;
}

/**
 * The staleness grader. `sources` is `[path, mtimeMs]` per source and `bundle`
 * is `[path, mtimeMs]` of the bundle built from them, or null when there is
 * none. Answers the refusal sentence, or null when the build is at least as
 * new as everything it was built from.
 */
export function staleSentence(sources, bundle) {
  if (bundle === null) return 'out/ holds no bundle for the scroll sources; build first.';
  const newer = sources
    .filter(([, mtime]) => mtime > bundle[1])
    .map(([path, mtime]) => `${path} is ${((mtime - bundle[1]) / 1000).toFixed(1)} s newer than ${bundle[0]}`);
  if (newer.length === 0) return null;
  return `out/ is older than the scroll sources; build first (${newer.join('; ')}).`;
}

/** The sources the three rulers' readings are made of, per bundle. */
const SCROLL_DIR = join('src', 'renderer', 'terminal', 'scroll');
// The report files decide whether a resize (arm d's first) or a return to a
// session (arm f) throws the reader to live. A checkout that has no such file
// reads mtime 0 and is never stale for it, which is what lets the parent be
// measured.
const RENDERER_SOURCES = [
  join('src', 'renderer', 'terminal', 'TerminalPane.tsx'),
  join('src', 'renderer', 'terminal', 'keys', 'color-report.ts'),
  join('src', 'renderer', 'terminal', 'keys', 'device-report.ts'),
  join('src', 'renderer', 'terminal', 'keys', 'focus-report.ts'),
  join('src', 'renderer', 'terminal', 'keys', 'pane-report.ts')
];
const MAIN_SOURCES = [join('src', 'main', 'tmux', 'scroll.ts'), join('src', 'main', 'sessions', 'core.ts')];
const SHARED_SOURCES = [join('src', 'shared', 'ipc', 'terminal.ts')];

/** The mtimes the grader is asked about, read from one checkout. */
function readStaleness(checkoutDir) {
  const stat = (rel) => {
    const path = join(checkoutDir, rel);
    return [rel, existsSync(path) ? statSync(path).mtimeMs : 0];
  };
  // The scroll directory is DERIVED, so a helper this phase adds beside
  // surface.ts is watched without anybody listing it. Tests are not built.
  const scrollDir = join(checkoutDir, SCROLL_DIR);
  const scroll = existsSync(scrollDir)
    ? readdirSync(scrollDir).filter((n) => /\.(?:ts|tsx|css)$/.test(n) && !/\.test\./.test(n)).map((n) => join(SCROLL_DIR, n))
    : [];
  const assets = join(checkoutDir, 'out', 'renderer', 'assets');
  let renderer = null;
  if (existsSync(assets)) {
    for (const name of readdirSync(assets)) {
      if (!/^index-[^.]+\.(?:css|js)$/.test(name)) continue;
      const mtime = statSync(join(assets, name)).mtimeMs;
      if (renderer === null || mtime > renderer[1]) renderer = [join('out', 'renderer', 'assets', name), mtime];
    }
  }
  const mainPath = join(checkoutDir, 'out', 'main', 'index.js');
  const main = existsSync(mainPath) ? [join('out', 'main', 'index.js'), statSync(mainPath).mtimeMs] : null;
  return (
    staleSentence([...scroll, ...RENDERER_SOURCES, ...SHARED_SOURCES].map(stat), renderer) ??
    staleSentence([...MAIN_SOURCES, ...SHARED_SOURCES].map(stat), main)
  );
}

/** The P292_ARMS subset, or every arm; an unknown name is a refusal. */
export function chooseArms(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { arms: [...ALL_ARMS], bad: [] };
  const names = text.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s !== '');
  const bad = names.filter((n) => !ALL_ARMS.includes(n));
  return { arms: ALL_ARMS.filter((a) => names.includes(a)), bad };
}

// ---------------------------------------------------------------------------
// --self-test. Every grader on a HEAD shaped fixture, on a fixture shaped like
// pull request 30's head before this phase, and on one shaped like origin/main.
// The numbers are the reproduction's own: a 152x44 pane, an 810 px lane, the
// pane entered copy mode at history 363 and was parked 100 lines back, and 140
// lines printed in 8 s.
// ---------------------------------------------------------------------------
function selfTest() {
  const LANE = 810;
  const ROWS = 44;
  const ENTRY = 363;
  const thumbH = (heard) => Math.max(MIN_THUMB_PX, (ROWS / (heard + ROWS)) * LANE);
  /** A sample as one build draws it. `lag` is how old the thumb's history is. */
  const sample = (kind, k, o = {}) => {
    const printed = 415 + Math.round(k * 4.375);
    const history = 375 + Math.round(k * 4.375);
    const heard = history - (o.lag ?? 1);
    const slid = kind === 'main' ? history - 375 : 0;
    const position = (o.position ?? 100) + slid;
    const h = thumbH(heard);
    const travel = LANE - h;
    const entryHeard = ENTRY + (o.entryLate ?? 0);
    const drawnDistance = kind === 'head' ? distanceFromLive({ position, history: heard, historyAtEntry: entryHeard }) : position;
    return {
      k, ms: k * 250, top: (o.top ?? 261) - slid, topText: `line ${String((o.top ?? 261) - slid)}`, bottom: (o.top ?? 261) - slid + 43,
      position, history, inMode: true, paneH: ROWS, paneW: 152, rows: ROWS, lastPrinted: printed,
      thumbTop: (1 - drawnDistance / heard) * travel, thumbH: h, laneH: LANE, ariaMax: heard,
      // What each build tells a screen reader: the history less the distance
      // its thumb is drawn from.
      ariaNow: Math.max(0, heard - drawnDistance)
    };
  };
  const watch = (kind, o) => Array.from({ length: 33 }, (_, k) => sample(kind, k, o));
  const head = watch('head');
  const pr30 = watch('pr30');
  const main = watch('main');
  const count = (l) => l.length;
  const starts = (l) => l.map((f) => f.slice(0, 48));
  // One drag, as each build draws it. The pointer goes 100 px up and the text
  // goes back 48 lines; before this phase the thumb then creeps down under it.
  const drag = (kind, o = {}) => {
    const at = (k, position, top, extra = {}) => ({ ...sample(kind === 'pinned' ? 'head' : kind, k, { position, top }), ...extra });
    const before = at(33, 100, 261);
    const pressed = at(34, 100, 261 + (o.pressJump ?? 0));
    const moved = at(37, 148, 213);
    const heldRaw = at(41, 148, 213 + (o.holdSlide ?? 0));
    // HEAD tracks the growing distance through the hold. `pinned` is the
    // thumb the first draft of arm c asked for, kept under the still pointer.
    const held = kind === 'pinned' ? { ...heldRaw, thumbTop: moved.thumbTop } : heldRaw;
    const released = at(42, 148, 213 + (o.releaseJump ?? 0));
    const after = at(46, 148, 213 + (o.releaseJump ?? 0));
    return { before, pressed, moved, held, released, after };
  };
  const rs = (top, ms, o = {}) => ({ top, topText: `line ${String(top)}`, ms, paneW: o.paneW ?? 124, paneH: ROWS, inMode: o.inMode ?? true });
  const rBefore = { top: 114, topText: 'line 114', ms: 0, paneW: 152, paneH: ROWS, inMode: true };
  const ws = (token, ms, o = {}) => ({ token, topText: ` w${String(token)} w${String(token)}`, ms, paneW: o.paneW ?? 152, inMode: o.inMode ?? true });
  const wBefore = { token: 646, topText: 'line 646 w646', ms: 0, paneW: 124, inMode: true };
  const live = { notches: 30, inMode: false, position: 0, screenMax: 900, printedMax: 903, screenMaxLater: 909, thumbTop: LANE - thumbH(860), thumbH: thumbH(860), laneH: LANE };
  const fixtures = [
    ['lineNo reads the number and nothing else', () => [lineNo('line 261'), lineNo('p292 % '), lineNo(null)], [261, null, null]],
    ['distanceFromLive: live is 0 whatever the history did', () => distanceFromLive({ position: 0, history: 900, historyAtEntry: 363 }), 0],
    ['distanceFromLive: the frozen position plus the growth since the entry', () => distanceFromLive({ position: 100, history: 515, historyAtEntry: 363 }), 252],
    ['distanceFromLive: no entry recorded yet is the position alone', () => distanceFromLive({ position: 100, history: 515, historyAtEntry: null }), 100],
    ['distanceFromLive: a history that shrank never makes the reader closer than the position', () => distanceFromLive({ position: 100, history: 300, historyAtEntry: 363 }), 100],
    ['lineOffset: a blank row, the prompt and the typed loop put line 1 at index 3', () => lineOffset(['', 'p292 % ', 'p292 % i=0; ...', 'line 1', 'line 2']), 2],
    ['lineOffset: no line 1 is null, not a guess', () => lineOffset(['p292 % ']), null],
    ['entryFromScreen: the reproduction\'s own relation, top = entry - position - 2', () => entryFromScreen(261, 100, 2), 363],
    ['chooseEntry: the screen inside tmux\'s bracket is taken', () => chooseEntry(363, 362, 364).source, 'screen'],
    ['chooseEntry: a moving screen falls back to tmux and says why', () => [chooseEntry(340, 362, 364).entry, chooseEntry(340, 362, 364).source], [364, 'tmux']],
    ['historyFromThumb: the height says which history the thumb was drawn from', () => historyFromThumb(thumbH(375), LANE, ROWS), 375],
    ['historyFromThumb: at the height floor it says nothing', () => historyFromThumb(MIN_THUMB_PX, LANE, ROWS), null],
    ['honestThumbTop: live is the foot of the lane', () => r1(honestThumbTop(0, 375, thumbH(375), LANE)), r1(LANE - thumbH(375))],
    ['honestThumbTop: the top of the transcript is 0', () => honestThumbTop(375, 375, thumbH(375), LANE), 0],
    ['a HEAD: the top line holds in all 33 samples', () => holdFindings(head), []],
    ['a pull request 30: the top line holds there too', () => holdFindings(pr30), []],
    ['a origin/main: one line per line printed, in a person\'s words', () => holdFindings(main), ['a the text you scrolled back to slid 140 lines toward older text while 140 lines printed (-1 lines per line printed; top line 261 -> 121, held in 1 of 33 samples)']],
    ['a a view that reached the top and stuck is said so, and the slope is read before it stuck', () => starts(holdFindings(main.map((s) => (s.k >= 16 ? { ...s, top: 191, position: s.history } : s)))), ['a the text you scrolled back to slid 70 lines to']],
    ['a the slope of a view that stuck is still one for one', () => holdSummary(main.map((s) => (s.k >= 16 ? { ...s, top: 191, position: s.history } : s))).movedPerPrinted, -1],
    ['a too few lines printed asserts nothing and says so', () => count(holdFindings(head.slice(0, 9))), 1],
    ['a a pane that went back to live by itself is caught', () => count(holdFindings(head.map((s) => (s.k === 20 ? { ...s, inMode: false } : s)))), 1],
    ['a a single sample that moved by one line is caught', () => count(holdFindings(head.map((s) => (s.k === 12 ? { ...s, top: 260 } : s)))), 1],
    ['a no samples is a finding, not a pass', () => count(holdFindings([])), 1],
    ['b HEAD: up, and on the formula', () => thumbFindings(head, ENTRY), []],
    ['b HEAD with a thumb five lines old is still on the formula AT THAT HISTORY', () => thumbFindings(watch('head', { lag: 5 }), ENTRY), []],
    ['b HEAD whose app heard the entry one line late is honest too', () => thumbFindings(watch('head', { entryLate: 1 }), ENTRY), []],
    ['b HEAD whose app heard the entry three lines late is not, on the thumb and on what a screen reader is told', () => count(thumbFindings(watch('head', { entryLate: 3 }), ENTRY)), 2],
    ['b pull request 30: the thumb creeps DOWN and is off the formula', () => starts(thumbFindings(pr30, ENTRY)), ['b the scrollbar thumb moved 70 px DOWN, toward l', 'b the thumb is 217.7 px from where the reader is', 'b a screen reader is told the reader is at 414 o']],
    ['b origin/main: the thumb goes up but not to where the reader is', () => starts(thumbFindings(main, ENTRY)), ['b the thumb is 217.7 px from where the reader is', 'b a screen reader is told the reader is at 274 o']],
    ['b a thumb drawn from a history a second and a half old is caught', () => count(thumbFindings(watch('head', { lag: 26 }), ENTRY)), 1],
    ['b no thumb drawn is a finding, not a pass', () => count(thumbFindings(head.map((s) => ({ ...s, thumbTop: null })), ENTRY)), 1],
    ['b no entry history is a finding, not a pass', () => count(thumbFindings(head, null)), 1],
    ['c HEAD: the text holds under a held pointer and the thumb stays on the formula, going UP', () => [dragFindings(drag('head'), ENTRY), drag('head').held.thumbTop < drag('head').moved.thumbTop], [[], true]],
    ['c pull request 30: the thumb slides down under a still pointer, off the formula then and afterwards', () => starts(dragFindings(drag('pr30'), ENTRY)), ['c the thumb slid 7.6 px down, toward live, under', 'c one second into the held drag the thumb is 256', 'c one second after the drag the thumb is 276.1 p']],
    ['c a thumb PINNED under the held pointer has left the formula, and is named', () => starts(dragFindings(drag('pinned'), ENTRY)), ['c one second into the held drag the thumb is 7.2']],
    ['c a held drag with no thumb to read is a finding, not a pass', () => starts(dragFindings({ ...drag('head'), held: { ...drag('head').held, thumbTop: null } }, ENTRY)), ['c one second into the held drag there is no thum']],
    ['c text that slid during the hold is caught', () => count(dragFindings(drag('head', { holdSlide: -18 }), ENTRY)), 2],
    ['c a press that jumps the text is caught', () => count(dragFindings(drag('head', { pressJump: -12 }), ENTRY)), 1],
    ['c a release that moves the text is caught', () => count(dragFindings(drag('head', { releaseJump: 5 }), ENTRY)), 1],
    ['c a release is held against the nudged top when the run nudged', () => [count(dragFindings({ ...drag('head'), nudged: sample('head', 42, { position: 149, top: 212 }), released: sample('head', 43, { position: 149, top: 212 }), after: sample('head', 47, { position: 149, top: 212 }) }, ENTRY)), count(dragFindings({ ...drag('head'), nudged: sample('head', 42, { position: 149, top: 212 }) }, ENTRY))], [0, 1]],
    ['c a drag that moved nothing is caught', () => count(dragFindings({ ...drag('head'), moved: drag('head').pressed, held: drag('head').pressed, released: drag('head').pressed, after: sample('head', 46) }, ENTRY)), 1],
    ['c no thumb to press is a finding, not a pass', () => count(dragFindings({ before: { thumbTop: null } }, ENTRY)), 1],
    ['d HEAD: the top line is the one before the resize', () => resizeFindings(rBefore, [rs(157, 150), rs(114, 450), rs(114, 1300), rs(114, 2000)]), []],
    ['d a rewrap of one line is allowed', () => resizeFindings(rBefore, [rs(115, 1300), rs(115, 2000)]), []],
    ['d both builds before this phase: forward by rows - 1', () => resizeFindings(rBefore, [rs(157, 150), rs(157, 450), rs(157, 1300), rs(157, 2000)], { label: 'd second resize' }), ['d second resize: narrowing the window moved the text you were reading 43 lines toward live (top line 114 -> 157, 1.3 s after; rows - 1 is 43)']],
    ['d a pane that did not change width tested nothing', () => count(resizeFindings(rBefore, [rs(114, 1300, { paneW: 152 }), rs(114, 2000, { paneW: 152 })])), 1],
    ['d a pane thrown back to live names the colour reports that did it, once', () => resizeFindings(rBefore, [rs(515, 150, { inMode: false }), rs(535, 1300, { inMode: false }), rs(547, 2000, { inMode: false })], { label: 'd first resize', sent: [{ ms: 38, d: '\x1b]10;rgb:d8d8/dbdb/e2e2\x1b\\' }, { ms: 38, d: '\x1b]11;rgb:1313/1414/1717\x1b\\' }] }), ['d first resize: narrowing the window threw the reader back to live output within 0.2 s (top line 114 -> 547); nobody typed, and xterm handed the app a foreground colour report (OSC 10) at +38 ms and a background colour report (OSC 11) at +38 ms, which the app sends the way it sends a keystroke, and a keystroke takes a scrolled pane to live on purpose']],
    ['d a pane thrown back to live with nothing sent says so', () => starts(resizeFindings(rBefore, [rs(515, 150, { inMode: false }), rs(547, 2000, { inMode: false })])), ['d: narrowing the window threw the reader back to']],
    ['d a view that was not parked before the resize tested nothing', () => count(resizeFindings({ ...rBefore, inMode: false }, [rs(114, 1300), rs(114, 2000)])), 1],
    ['chunkKind names a focus report and leaves a keystroke as its bytes', () => [chunkKind('\x1b[I'), chunkKind('a')], ['a focus report', '"a"']],
    ['e back at live: no findings', () => liveFindings(live), []],
    ['e still scrolled back is caught', () => count(liveFindings({ ...live, inMode: true, position: 40 })), 1],
    ['e a screen that is not at the newest line is caught', () => count(liveFindings({ ...live, screenMax: 700, screenMaxLater: 700 })), 2],
    ['e a thumb that is not at the foot is caught', () => count(liveFindings({ ...live, thumbTop: 600 })), 1],
    ['b a screen reader told the old number is caught', () => starts(thumbFindings(head.map((s) => ({ ...s, ariaNow: s.ariaMax - s.position })), ENTRY)), ['b a screen reader is told the reader is at 414 o']],
    ['tokenOf reads a wrapped row by its w token and a plain row by its line', () => [tokenOf(' w646 w646 w646'), tokenOf('line 646 w646 w646'), tokenOf('line 12'), tokenOf('p292 % ')], [646, 646, 12, null]],
    ['chunkKind names the two device attribute answers', () => [chunkKind('\x1b[?1;2c'), chunkKind('\x1b[>0;276;0c')], ['a primary device attributes answer (DA1)', 'a secondary device attributes answer (DA2)']],
    ['d HEAD: the thumb after a resize is within what a change of size may cost', () => resizeThumbFindings(sample('head', 40), ENTRY, { changes: 1, rate: 17.5 }), []],
    ['d a thumb short by more than a change of size may cost is named in lines', () => resizeThumbFindings(sample('head', 40, { entryLate: 30 }), ENTRY, { label: 'd first resize', changes: 1, rate: 17.5 }), ['d first resize: after the resize the thumb says 256 lines from live and the reader is 285, 29 lines short, where 10 is the most 1 change(s) of size may cost at 17.5 lines a second']],
    ['d the bound grows with each change of size in one park', () => resizeThumbFindings(sample('head', 40, { entryLate: 15 }), ENTRY, { changes: 2, rate: 17.5 }), []],
    ['f HEAD: back on the same line, still parked, the thumb honest', () => switchFindings(sample('head', 30), sample('head', 60), { entry: ENTRY }), []],
    ['f thrown to live names what xterm said at the return', () => switchFindings(sample('head', 30), { ...sample('head', 60), inMode: false, top: 900 }, { entry: ENTRY, sent: [{ ms: 45, d: '\x1b[?1;2c' }, { ms: 45, d: '\x1b[>0;276;0c' }] }), ['f going to another session and back threw the reader to live output (top line 261 -> 900); nobody typed, and xterm handed the app a primary device attributes answer (DA1) at +45 ms, a secondary device attributes answer (DA2) at +45 ms']],
    ['f a moved line is caught', () => count(switchFindings(sample('head', 30), { ...sample('head', 60), top: 250 }, { entry: ENTRY })), 1],
    ['f a thumb that forgot what printed while away is caught', () => count(switchFindings(sample('head', 30), sample('head', 60, { entryLate: 40 }), { entry: ENTRY })), 1],
    ['f nothing parked before leaving tested nothing', () => count(switchFindings({ ...sample('head', 30), inMode: false }, sample('head', 60), { entry: ENTRY })), 1],
    ['g HEAD: the line holds across a widening', () => wrapFindings(wBefore, [ws(646, 150), ws(646, 450), ws(646, 900), ws(646, 1600)], { label: 'g widen', verb: 'widening' }), []],
    ['g the deleted hold\'s re-send is caught, in lines', () => wrapFindings(wBefore, [ws(646, 150), ws(519, 450), ws(519, 900), ws(519, 1600)], { label: 'g widen', verb: 'widening' }), ['g widen: widening the window moved the text you were reading 127 lines toward older text over soft-wrapped lines (line 646 -> 519, 124 -> 152 columns, 0.9 s after; 0.2 s after it the top row was line 646)']],
    ['g tmux\'s own rows - 1 jump is caught too', () => count(wrapFindings(wBefore, [ws(661, 150), ws(661, 900), ws(661, 1600)])), 1],
    ['g a pane that did not change width tested nothing', () => count(wrapFindings(wBefore, [ws(646, 900, { paneW: 124 }), ws(646, 1600, { paneW: 124 })])), 1],
    ['g thrown to live is caught', () => count(wrapFindings(wBefore, [ws(646, 150, { inMode: false }), ws(900, 1600, { inMode: false })])), 1],
    ['the arms: empty means all', () => chooseArms(''), { arms: ALL_ARMS, bad: [] }],
    ['the arms: a subset keeps the file\'s order', () => chooseArms('d, a'), { arms: ['a', 'd'], bad: [] }],
    ['the arms: an unknown name is named', () => chooseArms('a,z'), { arms: ['a'], bad: ['z'] }],
    ['stale: a build newer than every source is not stale', () => staleSentence([['a.ts', 1000], ['b.tsx', 2000]], ['out/main/index.js', 2000]), null],
    ['stale: a source newer than the build is refused and named', () => staleSentence([['a.ts', 3500], ['b.tsx', 2000]], ['out/main/index.js', 2000]), 'out/ is older than the scroll sources; build first (a.ts is 1.5 s newer than out/main/index.js).'],
    ['stale: no bundle at all is a refusal, not a pass', () => staleSentence([['a.ts', 1000]], null), 'out/ holds no bundle for the scroll sources; build first.']
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    let got;
    try {
      got = run();
    } catch (err) {
      got = `THREW ${err instanceof Error ? err.message : String(err)}`;
    }
    const good = J(got) === J(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)} want ${J(want)}`);
  }
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved` : 'self-test FAIL');
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked.
// ---------------------------------------------------------------------------
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p292`, which wraps this file in build/harness-socket.mjs.');
if (socket === 'gmux' || socket === 'default') refuse(`"${socket}" is not a harness socket.`);
if (!socket.startsWith('gmux-p292')) refuse(`"${socket}" is not a gmux-p292 harness socket.`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
const otherCheckout = (process.env['P292_CHECKOUT'] ?? '').trim();
const checkout = otherCheckout !== '' ? resolve(otherCheckout) : REPO;
const tag = otherCheckout !== '' ? 'checkout' : 'head';
if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) {
  refuse(`${join(checkout, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);
}
// THE BUILD IS THE THING MEASURED, and this script carries no build of its
// own, so an out/ older than the scroll sources would be measured in silence
// and report on the previous surface. Read in the checkout being measured.
{
  const stale = readStaleness(checkout);
  if (stale !== null) refuse(`${tag} ${checkout}: ${stale}`);
}
const { arms: chosen, bad: badArms } = chooseArms(process.env['P292_ARMS']);
if (badArms.length > 0) refuse(`P292_ARMS names ${badArms.join(', ')}; the arms are ${ALL_ARMS.join(', ')}.`);
if (chosen.length === 0) refuse('P292_ARMS chose nothing.');
const tmuxOverride = (process.env['GMUX_TMUX_BIN'] ?? '').trim();
if (tmuxOverride !== '') {
  try {
    accessSync(tmuxOverride, fsConstants.X_OK);
    if (!statSync(tmuxOverride).isFile()) throw new Error('not a file');
  } catch {
    refuse(`GMUX_TMUX_BIN ${tmuxOverride} is not an executable file.`);
  }
}
const intOf = (name, fallback) => {
  const n = Number((process.env[name] ?? '').trim() || fallback);
  if (!Number.isFinite(n) || n <= 0) refuse(`${name} must be a positive number.`);
  return n;
};
const MIN_LINES = intOf('P292_MIN_LINES', 400);
const BACK_LINES = intOf('P292_BACK_LINES', 100);
const WATCH_MS = intOf('P292_WATCH_MS', 8000);
const outDir = resolve(REPO, (process.env['P292_OUT_DIR'] ?? '').trim() || join('out', 'p292'));
mkdirSync(outDir, { recursive: true });

// THE TMUX THIS PROBE READS WITH is the one the app will resolve, so the
// reader and the server are one version: GMUX_TMUX_BIN first, then the copy
// the measured checkout carries, then the machine (src/main/tmux/resolve.ts).
const vendored = join(checkout, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const readerTmux = tmuxOverride !== '' ? tmuxOverride : existsSync(vendored) ? vendored : 'tmux';
const readerVersion = (spawnSync(readerTmux, ['-V'], { encoding: 'utf8' }).stdout ?? '').trim().replace(/^tmux\s+/, '');
if (readerVersion === '') refuse(`${readerTmux} -V answered nothing.`);

// ---------------------------------------------------------------------------
// The scratch world: one project, one HOME, one profile.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p292'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p292'));
const home = join(root, 'h');
const project = join(root, 'alpha');
const profile = join(root, `p-${tag}`);
for (const d of [home, project, profile]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
// A scratch HOME with no .zshrc makes zsh open its new-user questionnaire in
// the pane instead of a prompt, and the loop would be typed into that.
writeFileSync(join(home, '.zshrc'), "PS1='p292 %# '\n");
writeFileSync(join(home, '.hushlogin'), '');
writeFileSync(join(project, 'README.md'), '# Phase 292\n');
// Arm g: 900 lines of about 290 characters, all at once, then nothing.
writeFileSync(
  join(project, 'wrap.sh'),
  `awk 'BEGIN { for (i = 1; i <= 900; i++) { s = "line " i; for (k = 0; k < 55; k++) s = s " w" i; print s } }'` + '\n'
);

say(`${tag}: measuring ${checkout}, arms ${chosen.join(',')}, socket ${socket}`);
say(`${tag}: reading with ${readerTmux} (${readerVersion}); GMUX_TMUX_BIN ${tmuxOverride === '' ? 'is not set, so the app resolves its own' : `hands the app ${tmuxOverride}`}`);

// ---------------------------------------------------------------------------
// The page kit. One expression, evaluated once, that puts this probe's readers
// on window.__p292. It is the same text at HEAD and at any other checkout,
// which is what makes two runs one measurement. No product file gains a hook.
// ---------------------------------------------------------------------------
const PAGE_KIT = String.raw`
(() => {
  const findTerm = () => {
    const mount = document.querySelector('.gmux-terminal-mount');
    if (!mount) return null;
    const key = Object.keys(mount).find((k) => k.startsWith('__reactFiber$'));
    if (!key) return null;
    let f = mount[key];
    for (let depth = 0; f && depth < 60; depth += 1, f = f.return) {
      let h = f.memoizedState;
      let n = 0;
      while (h && typeof h === 'object' && n < 300) {
        const ms = h.memoizedState;
        if (ms && typeof ms === 'object' && 'current' in ms) {
          const c = ms.current;
          if (c && typeof c === 'object' && c.buffer && typeof c.write === 'function' && typeof c.rows === 'number' && typeof c.cols === 'number') return c;
        }
        h = h.next;
        n += 1;
      }
    }
    return null;
  };
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { left: b.left, top: b.top, width: b.width, height: b.height, bottom: b.bottom, right: b.right };
  };
  const num = (s) => { const m = /line (\d+)/.exec(s || ''); return m ? Number(m[1]) : null; };
  const kit = { term: null };
  // Every chunk xterm hands the app, with its time. A listener beside the
  // product's own, which xterm allows; it changes nothing the app receives.
  // It is here because a KEYSTROKE takes a scrolled pane back to live on
  // purpose (ScrollSurface.sendInput), and so does anything xterm sends that
  // the app reads as one. When an arm finds the pane at live output and
  // nobody typed, this list is where the reason is.
  kit.sent = [];
  kit.heard = new WeakSet();
  kit.ready = () => {
    if (kit.term === null) {
      kit.term = findTerm();
      // Once per terminal: arm f finds the same one again after a remount.
      const t = kit.term;
      if (t !== null && !kit.heard.has(t)) {
        kit.heard.add(t);
        t.onData((d) => { if (kit.sent.length < 2000) kit.sent.push({ t: Math.round(performance.now()), d }); });
      }
    }
    return kit.term !== null;
  };
  // Arm f mounts the pane afresh. What xterm says in its first milliseconds
  // is the thing to read, so a new mount is armed the moment it exists.
  kit.rearm = () => { kit.term = null; return kit.ready(); };
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && (n.matches?.('.gmux-terminal-mount') || n.querySelector?.('.gmux-terminal-mount'))) {
        for (const ms of [0, 5, 15, 30, 60, 120]) setTimeout(() => { const t = findTerm(); if (t !== null && t !== kit.term) kit.rearm(); }, ms);
        return;
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
  kit.now = () => Math.round(performance.now());
  kit.sentSince = (t) => kit.sent.filter((e) => e.t >= t).map((e) => ({ ms: e.t - t, d: e.d }));
  kit.geometry = () => ({
    screen: box(document.querySelector('.xterm-screen')),
    rows: kit.term ? kit.term.rows : null,
    cols: kit.term ? kit.term.cols : null,
    mounts: document.querySelectorAll('.gmux-terminal-mount').length
  });
  kit.read = () => {
    const term = kit.term;
    if (!term) return null;
    const b = term.buffer.active;
    const row = (i) => { const l = b.getLine(b.viewportY + i); return l ? l.translateToString(true) : null; };
    let max = null;
    for (let i = 0; i < term.rows; i += 1) { const n = num(row(i)); if (n !== null && (max === null || n > max)) max = n; }
    const lane = document.querySelector('.gmux-terminal-scrollbar');
    const thumb = document.querySelector('.gmux-terminal-scrollbar-thumb');
    const aria = (name) => { const v = lane ? Number(lane.getAttribute(name)) : NaN; return Number.isFinite(v) ? v : null; };
    return {
      rows: term.rows, cols: term.cols,
      top: row(0), bottom: row(term.rows - 1), max,
      lane: box(lane), laneClient: lane ? lane.clientHeight : null, thumb: box(thumb),
      ariaMax: aria('aria-valuemax'), ariaNow: aria('aria-valuenow'),
      away: lane ? lane.hasAttribute('data-away') : null
    };
  };
  kit.wheels = 0;
  window.addEventListener('wheel', () => { kit.wheels += 1; }, true);
  kit.focusWhere = () => { const a = document.activeElement; return a ? a.tagName.toLowerCase() + '.' + String(a.className || '') : 'null'; };
  window.__p292 = kit;
  return true;
})()
`;

// ---------------------------------------------------------------------------
// The DevTools side: finding the window, real keys.
// ---------------------------------------------------------------------------
async function cdpForAppWindow(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          if (cdp) {
            try {
              cdp.close();
            } catch {
              /* already closed */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

// US-layout virtual key codes for the characters of the issue's loop.
const PUNCT = {
  ' ': [32, 'Space', 0], ';': [186, 'Semicolon', 0], ':': [186, 'Semicolon', 8], '=': [187, 'Equal', 0], '+': [187, 'Equal', 8],
  ',': [188, 'Comma', 0], '-': [189, 'Minus', 0], '.': [190, 'Period', 0], '/': [191, 'Slash', 0], '\\': [220, 'Backslash', 0],
  "'": [222, 'Quote', 0], '"': [222, 'Quote', 8], '$': [52, 'Digit4', 8], '%': [53, 'Digit5', 8], '(': [57, 'Digit9', 8], ')': [48, 'Digit0', 8]
};
function keyOf(ch) {
  if (/[a-z]/.test(ch)) return { vk: ch.toUpperCase().charCodeAt(0), code: `Key${ch.toUpperCase()}`, modifiers: 0 };
  if (/[0-9]/.test(ch)) return { vk: ch.charCodeAt(0), code: `Digit${ch}`, modifiers: 0 };
  const p = PUNCT[ch];
  if (!p) throw new Error(`no key for ${J(ch)}`);
  return { vk: p[0], code: p[1], modifiers: p[2] };
}

/** The issue's own loop, to the character. It is TYPED, never spawned. */
const ISSUE_LINES = `i=0; while :; do i=$((i+1)); printf 'line %s\\n' "$i"; sleep 0.05; done`;

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
const arms = Object.fromEntries(ARMS.map((a) => [a, []]));
const readings = { tag, checkout, socket, arms: chosen, readerTmux, readerVersion, tmuxOverride, loop: ISSUE_LINES, notes: [], samples: [] };
const note = (l) => {
  readings.notes.push(l);
  say(`note: ${l}`);
};

try {
  await withElectron(
    {
      label: `p292-${tag}`,
      userDataDir: profile,
      tmuxSocket: socket,
      cwd: checkout,
      args: [
        '--remote-debugging-port=0',
        '--use-mock-keychain',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling'
      ],
      env: withoutDevRenderer({
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        GMUX_PROBES: '1',
        ...(tmuxOverride !== '' ? { GMUX_TMUX_BIN: tmuxOverride } : {})
      }),
      graceMs: 8_000,
      ceilingMs: 80_000
    },
    async (handle) => {
      const { cdp, url } = await cdpForAppWindow(profile, 40_000);
      say(`${tag}: app window at ${url}, pid ${String(handle.appPid())}`);
      const tmux = async (...args) => (await execFileP(readerTmux, ['-L', socket, ...args], { encoding: 'utf8' })).stdout;
      let stage = 'launch';
      try {
        await cdp.call('Runtime.enable');
        // The window is never in front during a probe run, and a page Chromium
        // believes is unfocused hands the keyboard to nothing.
        await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
        for (;;) {
          if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
          await sleep(50);
        }
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(600);
        stage = 'open';
        await cdpEval(cdp, `window.__gmuxShotDrive(${J({ projectPath: project, session: { agent: 'shell', name: 'p292-shell' } })}).then(() => true)`, 60_000);
        await cdpEval(cdp, PAGE_KIT);
        for (let i = 0; i < 40; i += 1) {
          if (await cdpEval(cdp, 'window.__p292.ready()')) break;
          await sleep(150);
        }
        if (!(await cdpEval(cdp, 'window.__p292.ready()'))) throw new Error('the xterm Terminal was not found through the fiber of .gmux-terminal-mount');
        // The latest moment the pane's client can have attached to tmux: the
        // Terminal exists and is drawn. Arm d counts its wait from here.
        const tAttached = Date.now();
        let geo = await cdpEval(cdp, 'window.__p292.geometry()');
        readings.geometry = geo;
        if (geo.mounts !== 1) throw new Error(`${String(geo.mounts)} terminal mounts are drawn, want the one session`);
        say(`${tag}: terminal ${String(geo.cols)}x${String(geo.rows)}, screen ${String(Math.round(geo.screen.width))}x${String(Math.round(geo.screen.height))} px`);

        // WHICH TMUX, in the app's own words and in the server's.
        const devLine = /This development build (?:runs|found)[^\n]*/.exec(handle.text());
        readings.appSaid = devLine ? devLine[0] : null;
        readings.serverVersion = (await tmux('display-message', '-p', '#{version}')).trim();
        const serverPid = (await tmux('display-message', '-p', '#{pid}')).trim();
        readings.serverCommand = (spawnSync('ps', ['-p', serverPid, '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
        say(`${tag}: THE SERVER REPORTS tmux ${readings.serverVersion}; its process is: ${readings.serverCommand}`);
        say(`${tag}: the app said: ${String(readings.appSaid)}`);
        if (readings.serverVersion !== readerVersion) {
          arms.RUN.push(`the server reports tmux ${readings.serverVersion} and this probe reads with ${readerVersion} (${readerTmux})${tmuxOverride !== '' ? ', so GMUX_TMUX_BIN was not honoured' : ''}`);
        }

        // The app keeps a control session of its own on the server; the pane
        // measured is the one session this run created.
        const panes = (await tmux('list-panes', '-a', '-F', '#{session_name}\t#{pane_id}')).trim().split('\n').filter((l) => l !== '');
        const sessions = await cdpEval(cdp, `window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName })))`, 5000);
        const mine = panes.filter((l) => sessions.some((s) => s.tmuxName === l.split('\t')[0]));
        if (mine.length !== 1) throw new Error(`expected one pane of this run's session, found ${J(panes)} against ${J(sessions)}`);
        const paneId = mine[0].split('\t')[1];
        const mySid = sessions.find((s) => s.tmuxName === mine[0].split('\t')[0]).id;
        readings.pane = mine[0].replace('\t', ' ');

        /** tmux's own numbers for the pane, one call so they are one moment. */
        const fmtNow = async () => {
          const [pos, hist, inMode, ph, pw] = (await tmux('display-message', '-p', '-t', paneId, '#{scroll_position}|#{history_size}|#{pane_in_mode}|#{pane_height}|#{pane_width}')).trim().split('|');
          return { position: pos === '' ? 0 : Number(pos), history: Number(hist), inMode: inMode === '1', paneH: Number(ph), paneW: Number(pw) };
        };
        /** The newest line printed: capture-pane answers the LIVE screen. */
        const newestPrinted = async () => {
          const rows = (await tmux('capture-pane', '-p', '-t', paneId)).split('\n').map(lineNo).filter((n) => n !== null);
          return rows.length > 0 ? Math.max(...rows) : null;
        };
        /** All three rulers, asked together. */
        const sample = async (extra = {}) => {
          const [screen, f, printed] = await Promise.all([cdpEval(cdp, 'window.__p292.read()', 5000), fmtNow(), newestPrinted()]);
          return {
            ...extra,
            topText: screen.top, top: lineNo(screen.top), bottom: lineNo(screen.bottom), screenMax: screen.max,
            ...f, rows: f.paneH, lastPrinted: printed,
            thumbTop: screen.thumb && screen.lane ? screen.thumb.top - screen.lane.top : null,
            thumbH: screen.thumb ? screen.thumb.height : null,
            thumbMidY: screen.thumb ? screen.thumb.top + screen.thumb.height / 2 : null,
            thumbMidX: screen.thumb ? screen.thumb.left + screen.thumb.width / 2 : null,
            laneH: screen.laneClient ?? (screen.lane ? screen.lane.height : null),
            ariaMax: screen.ariaMax, ariaNow: screen.ariaNow, away: screen.away
          };
        };
        const line = (label, s, entry) => {
          const r = isNum(entry) ? thumbResidual(s, entry) : null;
          say(
            `${label}: SCREEN top=${String(s.top)} bottom=${String(s.bottom)} | tmux pos=${String(s.position)} hist=${String(s.history)} mode=${String(s.inMode)} pane=${String(s.paneW)}x${String(s.paneH)} | printed=${String(s.lastPrinted)} | ` +
              `thumb top=${String(r1(s.thumbTop))} h=${String(r1(s.thumbH))} lane=${String(r1(s.laneH))}` +
              (r !== null ? ` | honest top=${String(r1(r.expected))} (${String(r.distance)} from live over ${String(r.heard)}), off by ${String(r1(r.residual))} px` : '')
          );
        };

        // A REAL click into the terminal, then the loop with real keys.
        stage = 'type';
        let cx = Math.round(geo.screen.left + geo.screen.width / 2);
        let cy = Math.round(geo.screen.top + geo.screen.height / 2);
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
        await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
        await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
        await sleep(250);
        readings.keyboardOn = await cdpEval(cdp, 'window.__p292.focusWhere()');
        for (const ch of ISSUE_LINES) {
          const k = keyOf(ch);
          const b = { key: ch, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk, modifiers: k.modifiers };
          await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, ...b }, 5000);
          await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...b }, 5000);
        }
        await sleep(300);
        const typed = (await tmux('capture-pane', '-p', '-J', '-t', paneId)).split('\n').filter((l) => l.trim() !== '');
        readings.typedLine = typed[typed.length - 1] ?? null;
        if (!(readings.typedLine ?? '').includes(ISSUE_LINES)) throw new Error(`the typed loop did not arrive in the pane byte for byte (the pane holds ${J(readings.typedLine)}, the keyboard was on ${String(readings.keyboardOn)})`);
        const enter = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
        await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', text: '\r', unmodifiedText: '\r', ...enter }, 5000);
        await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...enter }, 5000);
        const tLoop = Date.now();

        // Wait for MIN_LINES, read off the screen.
        stage = 'print';
        let liveMax = null;
        for (;;) {
          liveMax = (await cdpEval(cdp, 'window.__p292.read()')).max;
          if (liveMax !== null && liveMax >= MIN_LINES) break;
          if (Date.now() - tLoop > 45_000) throw new Error(`only ${String(liveMax)} lines after 45 s, want ${String(MIN_LINES)}`);
          await sleep(200);
        }
        readings.printRate = r1(liveMax / ((Date.now() - tLoop) / 1000));
        say(`${tag}: ${String(liveMax)} lines on screen after ${((Date.now() - tLoop) / 1000).toFixed(1)} s (${String(readings.printRate)} lines a second)`);
        // Where `line 1` sits in the history, from the whole transcript in one
        // tmux call, so the screen's top row can be turned into a history index.
        const offset = lineOffset((await tmux('capture-pane', '-p', '-S', '-', '-E', '-', '-t', paneId)).split('\n'));
        readings.lineOffset = offset;
        if (offset === null) note('the transcript holds no `line 1`, so the entry history is tmux\'s own reading and not the screen\'s');

        // THE WHEEL. Real mouseWheel events over the terminal, negative deltaY,
        // notch by notch until tmux says the pane is about BACK_LINES back,
        // which is what a person does: wheel until the place is on screen.
        // A FUNCTION, because an arm that finds the pane back at live output
        // (an earlier arm's defect, or arm e run alone after it) parks again
        // rather than grade a view nobody scrolled.
        stage = 'park';
        const cell = geo.screen.height / geo.rows;
        const perNotch = 5;
        let entry = null;
        // How many changes of size the current park has been through, which
        // is what bounds the thumb's loss on a tmux that does not say the
        // frame's depth (arm d).
        let sizeChanges = 0;
        let tPark = Date.now();
        readings.parks = [];
        const park = async (why) => {
          const historyBefore = (await fmtNow()).history;
          let historyAfterFirst = null;
          const trail = [];
          let notches = 0;
          while (notches < 80) {
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: -cell * perNotch });
            notches += 1;
            await sleep(40);
            const f = await fmtNow();
            trail.push(f.position);
            if (historyAfterFirst === null && f.position > 0) historyAfterFirst = f.history;
            if (f.position >= BACK_LINES) break;
          }
          await sleep(150);
          say(`${tag}: ${why}: wheeled ${String(notches)} notches of ${String(Math.round(cell * perNotch))} px; the page has seen ${String(await cdpEval(cdp, 'window.__p292.wheels'))} wheel events; tmux position after each ${J(trail)}`);
          if (!(trail[trail.length - 1] >= BACK_LINES)) throw new Error(`the wheel reached ${String(trail[trail.length - 1] ?? 0)} lines back and not ${String(BACK_LINES)}, so nothing is parked`);
          // THE FIRST SAMPLE AFTER THE PARK, and the entry history read off it.
          tPark = Date.now();
          sizeChanges = 0;
          const first = await sample({ k: 0, ms: 0 });
          const fromScreen = entryFromScreen(first.top, first.position, offset);
          const chosenEntry = chooseEntry(fromScreen, historyBefore, historyAfterFirst);
          entry = chosenEntry.entry;
          readings.parks.push({ why, cellHeight: cell, notches, positionAfterEachNotch: trail, historyBefore, historyAfterFirst, fromScreen, ...chosenEntry });
          if (chosenEntry.why !== null) note(chosenEntry.why);
          say(`${tag}: the pane entered copy mode at history ${String(entry)} (${chosenEntry.source}; tmux read ${String(historyBefore)} before the first notch and ${String(historyAfterFirst)} after it; line N sits at history index N + ${String(offset)})`);
          return first;
        };
        /** An arm's precondition: a parked view. Parks again when it is not. */
        const parked = async (arm) => {
          const f = await fmtNow();
          if (f.inMode && f.position > 0) return;
          note(`${arm}: the pane was at live output when this arm began, so it was scrolled back again`);
          await park(`${arm} parks again`);
        };
        const parkSample = await park('the park');
        const photographs = [];
        const photograph = (name) => {
          photographs.push(
            cdp.call('Page.captureScreenshot', { format: 'png' }, 20_000).then(
              (shot) => {
                if (shot?.result?.data) writeFileSync(join(outDir, `shot-${tag}-${readerVersion}-${name}.png`), Buffer.from(shot.result.data, 'base64'));
              },
              () => undefined
            )
          );
        };

        // ------------------------------------------------------------ a, b
        // THE WATCH. Nothing is touched from here until it ends.
        if (chosen.includes('a') || chosen.includes('b')) {
          stage = 'a/b';
          const total = Math.round(WATCH_MS / 250);
          readings.samples.push(parkSample);
          line(`t+0.00s`, parkSample, entry);
          photograph('park');
          for (let k = 1; k <= total; k += 1) {
            const waitMs = tPark + k * 250 - Date.now();
            if (waitMs > 0) await sleep(waitMs);
            const s = await sample({ k, ms: Date.now() - tPark });
            readings.samples.push(s);
            if (k % 4 === 0 || k === total) line(`t+${(s.ms / 1000).toFixed(2)}s`, s, entry);
          }
          const sum = holdSummary(readings.samples);
          readings.hold = sum;
          say(`${tag}: HOLD top line ${String(sum.topAtPark)} -> ${String(sum.topAtEnd)} (${String(sum.moved)}) while ${String(sum.printed)} lines printed in ${String(sum.seconds)} s: ${String(sum.movedPerPrinted)} lines per line printed; held in ${String(sum.held)} of ${String(sum.samples)} samples`);
          const drawn = readings.samples.filter((s) => isNum(s.thumbTop));
          if (drawn.length > 1) {
            const residuals = drawn.map((s) => thumbResidual(s, entry)).filter((r) => r !== null).map((r) => r.residual);
            readings.thumb = { topAtPark: r1(drawn[0].thumbTop), topAtEnd: r1(drawn[drawn.length - 1].thumbTop), movedPx: r1(drawn[drawn.length - 1].thumbTop - drawn[0].thumbTop), worstResidualPx: residuals.length > 0 ? r1(Math.max(...residuals)) : null };
            say(`${tag}: THUMB top ${String(readings.thumb.topAtPark)} -> ${String(readings.thumb.topAtEnd)} px (${String(readings.thumb.movedPx)}; up is negative, away from live); worst distance from the honest formula ${String(readings.thumb.worstResidualPx)} px`);
          }
          if (chosen.includes('a')) arms.a.push(...holdFindings(readings.samples));
          if (chosen.includes('b')) arms.b.push(...thumbFindings(readings.samples, entry));
        }

        // --------------------------------------------------------------- c
        if (chosen.includes('c')) {
          stage = 'c';
          await parked('c');
          const snaps = {};
          const snap = async (name, label) => {
            snaps[name] = await sample({ label, ms: Date.now() - tPark });
            line(`c ${label}`, snaps[name], entry);
          };
          await snap('before', 'before the press');
          if (isNum(snaps.before.thumbMidY)) {
            const tx = Math.round(snaps.before.thumbMidX);
            let ty = Math.round(snaps.before.thumbMidY);
            let down = false;
            try {
              await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tx, y: ty });
              await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: tx, y: ty, button: 'left', buttons: 1, clickCount: 1 });
              down = true;
              await sleep(300);
              await snap('pressed', 'pressed, not moved');
              for (let i = 0; i < 5; i += 1) {
                ty -= 20;
                await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tx, y: ty, button: 'left', buttons: 1 });
                await sleep(80);
              }
              await sleep(300);
              await snap('moved', 'moved 100 px up, still held');
              await sleep(1000);
              await snap('held', 'held one second more without moving');
              // PRINTED, NOT GRADED: what the next pixel of the drag does to
              // the text after a second of holding still. A thumb that left
              // the pointer in either direction makes this a jump, because
              // the drag maps the POINTER's pixel and not the thumb's. The
              // integrator's ruling in the header keeps the thumb honest and
              // prints this cost rather than pinning the thumb to hide it.
              ty -= 1;
              await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tx, y: ty, button: 'left', buttons: 1 });
              await sleep(250);
              await snap('nudged', 'moved 1 px more, still held');
            } finally {
              // The button comes up whatever a snap threw, so a later arm is
              // never driven with a drag still in progress.
              if (down) await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: tx, y: ty, button: 'left', buttons: 0, clickCount: 1 }).catch(() => undefined);
            }
            await sleep(250);
            await snap('released', 'released');
            await sleep(1000);
            await snap('after', 'one second after the release');
            readings.pointerHeldAtY = ty;
          }
          readings.drag = snaps;
          arms.c.push(...dragFindings(snaps, entry));
          // PRINTED, NOT GRADED: how far the thumb went under the still
          // pointer, and what the one pixel after it cost in lines.
          if (snaps.moved && snaps.held && isNum(snaps.moved.thumbTop) && isNum(snaps.held.thumbTop)) {
            const slide = r1(snaps.held.thumbTop - snaps.moved.thumbTop);
            const printedHeld = (snaps.held.lastPrinted ?? 0) - (snaps.moved.lastPrinted ?? 0);
            const nudge = snaps.nudged && isNum(snaps.nudged.top) && isNum(snaps.held.top) ? snaps.nudged.top - snaps.held.top : null;
            readings.dragHold = { thumbMovedPx: slide, printed: printedHeld, nudgeMovedLines: nudge };
            say(`c: under the still pointer the thumb moved ${String(slide)} px (up is negative, away from live) while ${String(printedHeld)} lines printed; one pixel more then moved the text ${String(nudge)} lines (positive is toward live)`);
          }
        }

        // --------------------------------------------------------------- d
        if (chosen.includes('d')) {
          stage = 'd';
          readings.resize = {};
          const resizeOnce = async (name, width) => {
            const label = `d ${name} resize`;
            await parked(label);
            const before = await sample({ label: 'before', ms: 0 });
            line(`${label}, before`, before, entry);
            const pageResize = await cdpEval(cdp, 'window.__p292.now()');
            const tResize = Date.now();
            await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
            const afters = [];
            // The first reading is BEFORE the app's 300 ms settle can have
            // fired, so tmux's own move and the app's re-issue are two rows.
            for (const at of [150, 450, 800, 1300, 2000]) {
              const waitMs = tResize + at - Date.now();
              if (waitMs > 0) await sleep(waitMs);
              const s = await sample({ label: `+${String(at)} ms`, ms: Date.now() - tResize });
              afters.push(s);
              line(`${label}, +${String(at)} ms`, s, entry);
            }
            // What xterm handed the app across the resize. Nobody typed, so a
            // pane found at live output went there on one of these or by itself.
            const sent = await cdpEval(cdp, `window.__p292.sentSince(${String(pageResize)})`);
            say(`${label}: ${String(Math.round((tResize - tAttached) / 1000))} s after the attach, to ${String(width)} px; xterm handed the app ${String(sent.length)} chunk(s)${sent.length > 0 ? `: ${sent.map((e) => `+${String(e.ms)} ms ${chunkKind(e.d)} ${J(e.d)}`).join(', ')}` : ''}`);
            readings.resize[name] = { width, secondsSinceAttach: (tResize - tAttached) / 1000, before, afters, sent };
            arms.d.push(...resizeFindings(before, afters, { label, sent }));
            sizeChanges += 1;
            arms.d.push(...resizeThumbFindings(afters[afters.length - 1], entry, { label, changes: sizeChanges, rate: readings.printRate }));
            return sent;
          };
          // THE FIRST RESIZE IS THE ONE A PERSON MAKES: long after the attach.
          // tmux asks the terminal for its colours when a client attaches and
          // asks AGAIN on a resize once its own rate limit has passed, xterm
          // answers on the same event a keystroke arrives on, and an app that
          // sends that answer the way it sends a keystroke takes the reader to
          // live. Measured here on both builds: every resize 32 s or more after
          // the attach threw the pane to live with OSC 10 and 11 at +38 ms, and
          // every one at 28 s did not, which is why the reproduction saw only
          // the rows - 1 jump. So the run WAITS until REASK_MS after the
          // attach rather than let the clock decide which defect it reads.
          const early = tAttached + REASK_MS - Date.now();
          if (early > 0) {
            say(`d waits ${String(r1(early / 1000))} s, so the first resize lands ${String(REASK_MS / 1000)} s after the attach, where tmux asks for the colours again`);
            await sleep(early);
          }
          const sentFirst = await resizeOnce('first', 1340);
          if (!sentFirst.some((e) => /^\x1b\]1[01];/.test(e.d))) note('d: tmux did not ask for the colours again at the first resize, so the report road was not driven in this run');
          // THE SECOND IS THE REPRODUCTION'S: moments after the first, inside
          // tmux's rate limit, so nothing is asked and what is read is tmux's
          // own rows - 1 move and the app's hold alone.
          await resizeOnce('second', 1240);
          geo = await cdpEval(cdp, 'window.__p292.geometry()');
          cx = Math.round(geo.screen.left + geo.screen.width / 2);
          cy = Math.round(geo.screen.top + geo.screen.height / 2);
        }
        photograph('end');

        // --------------------------------------------------------------- e
        if (chosen.includes('e')) {
          stage = 'e';
          await parked('e');
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
          let down = 0;
          let f = await fmtNow();
          const startedAt = f.position;
          while (down < 160 && f.inMode) {
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: cell * perNotch });
            down += 1;
            await sleep(40);
            f = await fmtNow();
          }
          await sleep(400);
          const at = await sample({ label: 'back at live' });
          await sleep(500);
          const later = await sample({ label: 'half a second later' });
          line(`e after ${String(down)} notches toward live from ${String(startedAt)} back`, at, null);
          readings.live = { notches: down, startedAt, at, later };
          arms.e.push(...liveFindings({ notches: down, inMode: at.inMode, position: at.position, screenMax: at.screenMax, printedMax: at.lastPrinted, screenMaxLater: later.screenMax, thumbTop: at.thumbTop, thumbH: at.thumbH, laneH: at.laneH }));
        }
        // --------------------------------------------------------------- f
        // ANOTHER SESSION AND BACK. The pane unmounts while tmux keeps it
        // parked, and the return mounts it afresh and attaches a new client.
        if (chosen.includes('f')) {
          stage = 'f';
          await parked('f');
          await sleep(1000);
          const before = await sample({ label: 'before leaving', ms: Date.now() - tPark });
          line('f before leaving', before, entry);
          await cdpEval(cdp, `window.__gmuxP95.create(${J({ name: 'p292-other', agent: 'shell' })}).then(() => true)`, 30_000);
          const away = await cdpEval(cdp, `window.__gmuxP95.state().then((s) => ({ active: s.activeSessionId, n: s.sessions.length }))`, 5000);
          if (away.active === mySid) throw new Error(`the second session was not the one shown (${J(away)}), so nothing was left`);
          await sleep(4000);
          const whileAway = await fmtNow();
          const pageSelect = await cdpEval(cdp, 'window.__p292.now()');
          await cdpEval(cdp, `(window.__gmuxP95.select(${J(mySid)}), true)`, 10_000);
          for (let i = 0; i < 40; i += 1) {
            if (await cdpEval(cdp, 'window.__p292.rearm()')) break;
            await sleep(100);
          }
          await sleep(1500);
          const back = await sample({ label: 'back again', ms: Date.now() - tPark });
          const sent = await cdpEval(cdp, `window.__p292.sentSince(${String(pageSelect)})`);
          line('f back again', back, entry);
          say(
            `f: while away tmux read position ${String(whileAway.position)}, in copy mode ${String(whileAway.inMode)}; at the return xterm handed the app ${String(sent.length)} chunk(s)` +
              (sent.length > 0 ? `: ${sent.map((e) => `+${String(e.ms)} ms ${chunkKind(e.d)}`).join(', ')}` : '')
          );
          readings.switch = { before, whileAway, back, sent };
          arms.f.push(...switchFindings(before, back, { entry, sent }));
        }

        // --------------------------------------------------------------- g
        // SOFT-WRAPPED LINES ACROSS A WIDTH CHANGE, on a quiet pane, so the
        // resize is the only thing that can move the reader. Last, because it
        // stops the loop.
        if (chosen.includes('g')) {
          stage = 'g';
          await tmux('send-keys', '-t', paneId, '-X', 'cancel').catch(() => undefined);
          await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1240, height: 900, deviceScaleFactor: 1, mobile: false });
          await sleep(800);
          // Straight to the pane, the way the loop's own keys are not: this
          // is the arm's setting and not what it grades.
          await cdpEval(cdp, `(window.gmux.term.sendInput(${J(mySid)}, String.fromCharCode(3)), true)`);
          await sleep(400);
          await cdpEval(cdp, `(window.gmux.term.sendInput(${J(mySid)}, 'sh wrap.sh' + String.fromCharCode(13)), true)`);
          const tWrap = Date.now();
          for (;;) {
            const rows = (await tmux('capture-pane', '-p', '-t', paneId)).split('\n').map(tokenOf).filter((n) => n !== null);
            if (rows.length > 0 && Math.max(...rows) >= 900) break;
            if (Date.now() - tWrap > 15_000) throw new Error('the 900 soft-wrapped lines did not arrive in 15 s');
            await sleep(150);
          }
          await sleep(400);
          geo = await cdpEval(cdp, 'window.__p292.geometry()');
          cx = Math.round(geo.screen.left + geo.screen.width / 2);
          cy = Math.round(geo.screen.top + geo.screen.height / 2);
          const cellG = geo.screen.height / geo.rows;
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
          let f = await fmtNow();
          let notches = 0;
          while (notches < 60 && !(f.inMode && f.position >= 700)) {
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: -cellG * 40 });
            notches += 1;
            await sleep(40);
            f = await fmtNow();
          }
          await sleep(300);
          if (!(f.inMode && f.position >= 700)) throw new Error(`the wheel parked the wrapped pane ${String(f.position)} rows back and not 700`);
          const wrapSample = async (label, ms) => {
            const s = await sample({ label, ms });
            return { ...s, token: tokenOf(s.topText) };
          };
          readings.wrap = { notches, resizes: [] };
          for (const [name, width, verb] of [
            ['widen', 1440, 'widening'],
            ['narrow', 1240, 'narrowing'],
            ['widen again', 1440, 'widening']
          ]) {
            const label = `g ${name}`;
            const before = await wrapSample('before', 0);
            const pageResize = await cdpEval(cdp, 'window.__p292.now()');
            const tR = Date.now();
            await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
            const afters = [];
            for (const at of [150, 450, 900, 1600]) {
              const waitMs = tR + at - Date.now();
              if (waitMs > 0) await sleep(waitMs);
              afters.push(await wrapSample(`+${String(at)} ms`, Date.now() - tR));
            }
            const sent = await cdpEval(cdp, `window.__p292.sentSince(${String(pageResize)})`);
            say(
              `${label}: line ${String(before.token)} (${String(before.paneW)} columns, position ${String(before.position)}) -> ` +
                afters.map((s) => `+${String(s.ms)} ms line ${String(s.token)} position ${String(s.position)}${s.inMode ? '' : ' LIVE'}`).join(', ') +
                (sent.length > 0 ? `; xterm handed the app ${sent.map((e) => chunkKind(e.d)).join(', ')}` : '')
            );
            readings.wrap.resizes.push({ name, width, before, afters, sent });
            arms.g.push(...wrapFindings(before, afters, { label, verb }));
          }
        }
        await Promise.all(photographs);
        stage = 'done';
      } catch (err) {
        // A stage that threw is a finding of THIS run, named by its stage; the
        // finally below still ends the session the drive made and the helper
        // still ends the tree.
        arms.RUN.push(`the run stopped during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        // What the app itself wrote, beside the readings: when an arm reads a
        // pane that left copy mode by itself, main's own log is where the
        // reason is, and it is gone once the helper ends the tree.
        try {
          writeFileSync(join(outDir, `app-${tag}-${readerVersion}.log`), handle.text());
        } catch {
          /* the readings are the evidence; this is the footnote */
        }
        try {
          await cdpEval(cdp, `window.__gmuxShotCleanup ? window.__gmuxShotCleanup().then(() => true) : true`, 10_000);
        } catch {
          /* best effort; withElectron ends the tree and the scratch server anyway */
        }
        cdp.close();
      }
    }
  );
} catch (err) {
  arms.RUN.push(`the launch did not complete: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  // The helper has ended the scratch server by here. Once more by its exact
  // name, because the loop typed into the pane lives exactly as long as that
  // server does and nothing else in this file would end it.
  spawnSync(readerTmux, ['-L', socket, 'kill-server'], { stdio: 'ignore' });
}

// -- the report -------------------------------------------------------------
const readingsPath = join(outDir, `readings-${tag}-${readerVersion}.json`);
writeFileSync(readingsPath, `${J({ arms, readings })}\n`);
say('');
say(`arm   ${tag.toUpperCase()} on tmux ${String(readings.serverVersion ?? readerVersion)}`);
for (const arm of ARMS) {
  const n = arms[arm].length;
  const chosenHere = arm === 'RUN' || chosen.includes(arm);
  say(`${arm.padEnd(5)} ${!chosenHere ? 'not run' : n === 0 ? 'PASS' : `FAIL ${String(n)}`}`);
}
const failures = [];
// Every finding already begins with its arm's letter, so the arm is not
// repeated here.
for (const arm of ARMS) for (const f of arms[arm]) failures.push(`${tag.toUpperCase()} ${f}`);
say('');
say(`readings: ${readingsPath}`);
if (tag === 'checkout') {
  say('this run measured ANOTHER checkout. At origin/main arm a is expected to FAIL at about -1.0 lines per line printed; at pull request 30\'s head before this phase a passes while b, c\'s thumb and d fail; f and g fail at both.');
}
if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${TAG}   ${f}\n`);
  process.stderr.write(`${TAG} ${tag === 'checkout' ? `${checkout} FAILED` : 'FAILED'}: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say(`PASS: ${tag} has 0 findings on ${chosen.join(', ')}.`);
process.exit(0);
