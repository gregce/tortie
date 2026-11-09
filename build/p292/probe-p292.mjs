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
 * ## PHASE 320.1's SECOND BUILD (build/p3201/SPEC.md D12, D13)
 *
 * THE SUMMARY NAMES AN ARM PASS ONLY WHEN IT RAN TO ITS END. The first
 * attempt's reverify found this file printing PASS for arms a to g in runs
 * that had stopped at `type`, before any arm began; an arm that did not run
 * to its end now prints `not run`, and the run fails. On another machine the
 * far shell is QUIET: the loopback machine's ZDOTDIR is proved to be the
 * yard's empty one before the session is made (his oh-my-zsh prompt stopped
 * `type` in three of four 3.6a runs), and his three dotfiles are read, size
 * and modified time only, before and after on whichever computer the far
 * shell ran; a change fails the run. With P292_MACHINE unset nothing of this
 * paragraph runs but the summary rule.
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
 *   h  THE WAY BACK DOWN (Phase 294, build/p353/SPEC.md §4.5 step 5). Parked
 *      as arm a parks, eight seconds of printing, then gestures toward live
 *      one at a time, every row of the pane's xterm buffer read after each,
 *      until tmux says the pane has left copy mode and once 500 ms later.
 *      Variants, each from a fresh park: the WHEEL; ⇧PageDown; the
 *      SCROLLBAR DRAG through the band below the frozen frame; a QUIET pane
 *      with the loop stopped; a program that opens its ALTERNATE SCREEN while
 *      parked; and a HISTORY AT ITS LIMIT, a second session made under a
 *      1,000-line history-limit of its own (the global is set only while it
 *      is made and put back at once, because tmux 3.7b applies a global
 *      change to panes that already exist; Phase 353's fix round). Every
 *      wheel variant's notch is the lines its park measured a notch to move
 *      (`notchOfTrail`), and the alternate screen's variant is graded on its
 *      re-freezes alone, its end showing that screen. GRADED on a tmux
 *      that names the frame's depth (3.7b): every `line N` from the park's top
 *      row to the newest line on screen at the end was drawn on some row of
 *      some sample (wheel, ⇧PageDown, drag); no gesture moved row 0 by more
 *      than its own lines plus what printed between the two samples, nor the
 *      thumb toward live by more than that (wheel, ⇧PageDown); the quiet pane
 *      moves by exactly the notch every notch and is never re-frozen; the
 *      alternate screen and the history at its limit are never re-frozen,
 *      being the parent's jump, and a re-freeze is read off tmux's own
 *      `#{copy_position_limit}` growing. PRINTED, not graded: notches and
 *      seconds to live, and on 3.6a every reading, which keeps today's jump
 *      (his ruling, D294-6) and is compared with the parent's run
 *   h2 THE COPY FROM A BUSY HISTORY (Phase 295, §4.6 step 5). ASKED FOR BY
 *      NAME ONLY, because it presses ⌘C: a stream of `L<n>` at about 80 lines
 *      a second; 200 calls of the shipped channel
 *      `window.gmux.capture.pane({ tmuxName, historyLines: 0, range, join })`,
 *      each for exactly one line 200 above tmux's own reading, graded by the
 *      text it got (HEAD 0 off; the parent's count is its reading); then a
 *      real drag that scrolls and parks, and ⌘C twenty times while the pane
 *      prints, each pasteboard graded as the HELD RANGE (`pasteVerdict`, the
 *      fix round): one unbroken run of lines beginning with every highlighted
 *      row, which is the range's visible part, and the same range every time
 *      while the view is parked. The system pasteboard is saved with every
 *      flavour before and put back in a `finally`, by
 *      build/pasteboard-keep.swift compiled into the run directory, as
 *      probe:p209 does, and the flavours must agree
 *
 * ## No agent runs, not even for its version (Phase 353, D-P2)
 *
 * Every probed registry row is hidden in the profile's agents.json before the
 * launch (build/hidden-agents.mjs), and the app's own `agents:list` is read
 * back before any arm; a row that resolved stops the run as a finding. The
 * session measured is a plain shell, typed into.
 *
 * ## On another machine (Phase 320.1), and only when asked
 *
 * `P292_MACHINE=loopback` runs the SAME arms, graded by the SAME graders, on a
 * session on another machine: the loopback scratch machine
 * build/with-scratch-machine.mjs starts around this file (`npm run
 * probe:p292:remote` is that shape, probe:p320's), whose far tmux is
 * `P292_FAR_TMUX` or the carriage's own. `P292_MACHINE=real` is the operator's
 * own machine through build/p3201/real-machine.mjs, VERIFIERS ONLY, arms a, c,
 * d, e and f (build/p3201/SPEC.md §8), every refusal of that file asked first.
 * The session is opened the product's way (the machine confirmed and prepared,
 * the far folder opened, a shell session made on it), the far login shell is
 * replaced at once by a plain `/bin/sh` whose HOME is the far project, typed
 * as ONE space-led `exec` line through the bridge, and the rulers read the FAR
 * scratch server. At 320.1's parent nothing on a machine parks, and every
 * chosen arm then reads "could not park" rather than the run stopping.
 * UNSET, NOTHING OF THIS RUNS, and the probe behaves byte for byte as it did:
 * every line that reads `MACHINE` keeps the old expression when it is ''.
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
 *   - (Phase 366's probe review) A `P292_CHECKOUT` whose own Electron is
 *     another version than this checkout's: the shim is always this
 *     checkout's, so that checkout would be measured on the wrong runtime and
 *     a parent named that way would read as HEAD. Run the file from that
 *     checkout instead.
 *
 * Since Phase 366's probe review the run also reads, by name only, what
 * Crashpad left in its profile once the tree has ended: a dump there (a crash
 * of the GPU process, the network service or the watcher process, which no
 * arm's reading touches) or no database at all is a RUN finding, and the
 * dump is left for the verifier's own reader, which deletes it after.
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
 *   P292_ARMS          A comma separated subset of a,b,c,d,e,f,g,h,h2. Every
 *                      arm but h2 by default; h2 presses ⌘C, so it runs only
 *                      when named.
 *   P292_MIN_LINES     Lines printed before the scroll. Default 400, which
 *                      leaves the parent room to fall for the whole watch.
 *   P292_BACK_LINES    Lines to wheel back. Default 100.
 *   P292_WATCH_MS      How long arms a and b watch. Default 8000, and 15000
 *                      with P292_MACHINE=real (Phase 320.1's fix round).
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
 * Arms a to g are one launch of about 65 s, most of it waiting for the loop
 * to print and for arm d's half minute. Arm h adds six fresh parks of eight
 * seconds' printing each and the way down after each, a few minutes not yet
 * measured, and h2 its 200 copies and twenty ⌘C, about a minute.
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
 * has exited before the call returns, and under h2 a `swiftc` build of the
 * pasteboard keeper, that keeper, `pbcopy` and `pbpaste`, each synchronous.
 * It spawns no agent, spends no token, opens no keychain and never names
 * `-L gmux` or the default server.
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
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
// PHASE 320.1, read only when P292_MACHINE is set. Loading either starts nothing.
import { keyscanText } from '../ssh-run.mjs';
import {
  controlEntries,
  dotfilesMoved,
  dotfilesSentence,
  localCensus,
  machineRow,
  openRealMachine,
  realMachineFromEnv
} from '../p3201/real-machine.mjs';

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
const ALL_ARMS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'h2'];
/** What runs when P292_ARMS is unset: every arm but h2, which presses ⌘C. */
const DEFAULT_ARMS = ALL_ARMS.filter((a) => a !== 'h2');
const ARMS = [...ALL_ARMS, 'RUN'];
/**
 * Arm h's wheel notch, in lines, MEASURED (Phase 353's fix round, the terminal
 * lens): the step tmux's own position takes per notch of the park that started
 * the variant (`notchOfTrail`). It was a constant of 5, the cells a notch
 * spans, and the app moves 10 lines a notch of 90 px (the park's own log reads
 * 10, 20 … 100), so the quiet variant's exact grade and the wheel's jump grade
 * fired at both builds over a way down that moved exactly a notch a notch.
 */
export function notchOfTrail(trail) {
  if (!Array.isArray(trail) || trail.length === 0) return null;
  const steps = [];
  let prev = 0;
  for (const p of trail) {
    if (isNum(p) && p > prev) steps.push(p - prev);
    if (isNum(p)) prev = p;
  }
  if (steps.length === 0) return null;
  const sorted = [...steps].sort((x, y) => x - y);
  return sorted[Math.floor(sorted.length / 2)];
}
/** Arm h2's stream, and the gap above the last reading each copy asks for. */
const H2_CALLS = 200;
const H2_BACK = 200;
const H2_PASTES = 20;

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
  // PHASE 366'S PROBE REVIEW: no sample, or a pane still scrolled back with no
  // thumb drawn, read as no finding. A pane thrown back to live is
  // resizeFindings' to name.
  if (!s) return [`${label}: the pane was not read after the resize, so its thumb was not tested`];
  if (s.inMode !== true) return [];
  if (!isNum(s.thumbTop)) return [`${label}: after the resize the pane is still scrolled back and no thumb is drawn`];
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
 * Arm h's grader (Phase 294): one variant's way down. `r` is
 * `{ kind, notchLines, parkTop, newest, reachedLive, notches, refreezes,
 *    seen, samples }`, `seen` every line number drawn on any row of any
 * sample and `samples` the readings after each gesture, the last one 500 ms
 * after the pane left copy mode. `o` says what is graded: `coverage` (every
 * line from the park's top to the newest at the end was drawn), `jumps` (no
 * gesture moved row 0, nor the thumb toward live, by more than its own lines
 * plus what printed between the two samples), `exact` (every gesture inside
 * copy mode moved row 0 by exactly its lines, a quiet pane) and `noRefreeze`
 * (tmux's frame depth never grew, being the parent's path).
 */
export function wayDownFindings(r, o = {}) {
  const label = o.label ?? `h ${String(r?.kind)}`;
  // THE FIX ROUND (the terminal lens): the newest line on screen at the end is
  // asked only of a grade that reads lines. The alternate screen's variant is
  // graded on its re-freezes alone, and its end sample shows that screen, which
  // holds no `line N`, at both builds.
  const readsLines = o.coverage === true || o.reach === true;
  if (r === null || r === undefined || !isNum(r.parkTop) || (readsLines && !isNum(r.newest)) || !Array.isArray(r.samples)) {
    return [`${label}: the way down has no park or no end to read`];
  }
  if (o.jumps === true || o.exact === true) {
    if (!isNum(r.notchLines) || r.notchLines <= 0) return [`${label}: the gesture's lines were not measured, so no move can be graded against them`];
  }
  const out = [];
  if (r.reachedLive !== true) out.push(`${label}: after ${String(r.notches)} gesture(s) toward live the pane is still scrolled back`);
  if (o.coverage === true) {
    const seen = new Set(r.seen ?? []);
    const never = [];
    for (let n = r.parkTop; n <= r.newest; n += 1) if (!seen.has(n)) never.push(n);
    if (never.length > 0) {
      out.push(`${label}: ${String(never.length)} line(s) printed while you read were never on screen on the way back down (lines ${String(never[0])} to ${String(never[never.length - 1])}), parked at line ${String(r.parkTop)} and the newest ${String(r.newest)}`);
    }
  }
  for (let i = 1; i < r.samples.length; i += 1) {
    const a = r.samples[i - 1];
    const b = r.samples[i];
    if (!isNum(a.top) || !isNum(b.top)) continue;
    const printed = isNum(a.lastPrinted) && isNum(b.lastPrinted) ? Math.max(0, b.lastPrinted - a.lastPrinted) : 0;
    const allowed = r.notchLines + printed + 1;
    if (o.jumps === true && b.top - a.top > allowed) {
      out.push(`${label}: one gesture moved the top line from ${String(a.top)} to ${String(b.top)}, ${String(b.top - a.top)} lines toward live, where the gesture was ${String(r.notchLines)} lines and ${String(printed)} printed between the two readings`);
      break;
    }
    if (o.jumps === true && isNum(a.thumbTop) && isNum(b.thumbTop) && isNum(b.laneH) && isNum(b.thumbH) && isNum(b.history) && b.history > 0) {
      const travel = Math.max(1, b.laneH - b.thumbH);
      const fell = ((b.thumbTop - a.thumbTop) / travel) * b.history;
      if (fell > allowed + 6) {
        out.push(`${label}: the thumb fell ${String(r1(fell))} lines toward live in one gesture of ${String(r.notchLines)} lines with ${String(printed)} printed`);
        break;
      }
    }
    if (o.exact === true && a.inMode === true && b.inMode === true && b.top - a.top !== r.notchLines) {
      out.push(`${label}: on a quiet pane one notch moved the top line from ${String(a.top)} to ${String(b.top)}, not by the notch's ${String(r.notchLines)} lines`);
      break;
    }
  }
  if (o.noRefreeze === true && isNum(r.refreezes) && r.refreezes > 0) {
    out.push(`${label}: the frozen frame was re-frozen ${String(r.refreezes)} time(s), where nothing may change and the parent never re-freezes`);
  }
  // THE PROBE REVIEW (Phase 353). `reach`: the drag released in the band must
  // show at least one line printed after the park, past the bottom of the frame
  // frozen at the park (`frameBottom`, row 0's line plus the position plus the
  // rows, less one). At the parent the band shows that frame's bottom and the
  // thumb stops following the pointer, so its newest line IS the frame's bottom
  // and coverage up to it passes there; this is the half that tells them apart.
  if (o.reach === true) {
    if (!isNum(r.frameBottom)) out.push(`${label}: the frame frozen at the park was not read, so whether the drag reached past it is unknown`);
    else if (!(isNum(r.newest) && r.newest > r.frameBottom)) {
      out.push(`${label}: released in the band, the drag's newest line is ${String(r.newest)}, no further than line ${String(r.frameBottom)}, the bottom of the frame frozen at the park: nothing printed while you read was reached`);
    }
  }
  return out;
}

/**
 * Whether one ⌘C is the HELD RANGE (Phase 353's fix round, the terminal lens):
 * Phase 209's copy is the range held in history positions, which may run past
 * the screen (the anchor is pressed on a live screen that keeps printing), so
 * the pasteboard is graded against the range itself and not the visible
 * highlight alone. The highlighted rows are the range's visible part and begin
 * at its first line, so the paste begins with exactly those rows, its first
 * and last lines as cut as the selection cut them; past them it carries on
 * through the range, every whole line between its first and its last one
 * unbroken run of the stream's `L<n>`. Null when it is the range; a sentence
 * otherwise. (The fix round's first reading also asked the first and last
 * lines to be whole, and so refused the committed drag's own six rows, which
 * begin on an empty row and end on a cut `L`; that was the grader, not the
 * copy.)
 */
export function pasteVerdict(p) {
  if (!Array.isArray(p?.pasted)) return 'never landed on the pasteboard';
  if (!Array.isArray(p.highlighted) || p.highlighted.length === 0) return 'had no highlighted rows to compare with';
  const trim = (rows) => (rows.length > 0 && rows[rows.length - 1] === '' ? rows.slice(0, -1) : rows);
  const lines = trim(p.pasted);
  const hl = trim(p.highlighted);
  if (lines.length < hl.length) return `holds ${String(lines.length)} lines where ${String(hl.length)} rows are highlighted`;
  for (let i = 0; i < hl.length; i += 1) {
    if (lines[i] !== hl[i]) return `reads ${J(lines[i])} on its line ${String(i + 1)}, where the highlighted row, the held range's visible part, reads ${J(hl[i])}`;
  }
  const whole = lines.slice(1, -1).map((l) => streamNo(l));
  if (whole.some((n) => n === null)) return `holds a whole line that is not one of the stream's (${J(lines.slice(1, -1).find((l) => streamNo(l) === null))})`;
  for (let i = 1; i < whole.length; i += 1) {
    if (whole[i] !== whole[i - 1] + 1) return `is not one unbroken run of lines (L${String(whole[i - 1])} then L${String(whole[i])})`;
  }
  return null;
}

/**
 * Arm h2's grader (Phase 295). `calls` is `[{ want, got }]`, the line each call
 * asked for and the line its first row named; `pastes` is `[{ pasted,
 * highlighted }]`, the pasteboard's lines after each ⌘C and the highlighted
 * rows read off the screen at that moment. Each paste is the held range
 * (`pasteVerdict`), and, the view being parked while the pane prints, every
 * paste is the same range (the fix round: the parent's pastes drifted).
 */
export function copyFindings(calls, pastes, o = {}) {
  const out = [];
  if (o.calls !== false) {
    if (!Array.isArray(calls) || calls.length === 0) out.push('h2 no copy through the channel was made');
    else {
      const off = calls.filter((c) => c.got !== c.want);
      if (off.length > 0) {
        const worst = Math.max(...off.map((c) => (isNum(c.got) ? Math.abs(c.got - c.want) : Number.POSITIVE_INFINITY)));
        out.push(`h2 ${String(off.length)} of ${String(calls.length)} copies of one line came back as another line, by up to ${String(worst)}, while the pane printed`);
      }
    }
  }
  if (o.pastes !== false) {
    if (!Array.isArray(pastes) || pastes.length === 0) out.push('h2 no ⌘C was read back from the pasteboard');
    else {
      if (pastes.some((p) => !Array.isArray(p.highlighted) || p.highlighted.length < 6)) out.push('h2 the drag did not leave six or more rows highlighted, so the ⌘C compared nothing');
      // `heldRange: false` on a tmux that does not name the frame (3.6a): the
      // range the renderer holds is then its own estimate of the frame, a line
      // off when one printed between the park and its read (Phase 292's limit,
      // the twin of arm h's jump there, D294-6), so it is printed, not graded.
      const wrong = o.heldRange === false ? [] : pastes.map((p) => pasteVerdict(p)).filter((w) => w !== null);
      if (wrong.length > 0) {
        out.push(`h2 ${String(wrong.length)} of ${String(pastes.length)} ⌘C did not put the held range on the pasteboard (the first ${wrong[0]})`);
      }
      const ranges = new Set(pastes.filter((p) => Array.isArray(p.pasted)).map((p) => J(p.pasted)));
      if (ranges.size > 1) out.push(`h2 the ${String(pastes.length)} ⌘C over one parked selection put ${String(ranges.size)} different ranges on the pasteboard, where the held range does not move while the pane prints`);
    }
  }
  return out;
}

/** `L123` to 123, anything else to null: arm h2's numbered stream. */
export function streamNo(text) {
  const m = /^L(\d+)$/.exec(String(text ?? '').trim());
  return m ? Number(m[1]) : null;
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
// Phase 295: arm h2 reads the copy path, whose two files a checkout without
// history-lines.ts reads as mtime 0, so the parent can still be measured.
const MAIN_SOURCES = [
  join('src', 'main', 'tmux', 'scroll.ts'),
  join('src', 'main', 'sessions', 'core.ts'),
  join('src', 'main', 'capture', 'service.ts'),
  join('src', 'main', 'tmux', 'history-lines.ts')
];
// PHASE 320.1. A run on another machine also reads the carriage door, so its
// build is stale when any of these is newer. Read only when P292_MACHINE is set.
const MACHINE_SOURCES = [
  join('src', 'main', 'machines', 'scroll-shapes.ts'),
  join('src', 'main', 'machines', 'control-plane.ts'),
  join('src', 'main', 'machines', 'remote-sessions.ts'),
  // The second build's router, and the hook that asks it (the integrator's round).
  join('src', 'main', 'machines', 'scroll-order.ts'),
  join('src', 'main', 'attach', 'attach-host.ts')
];
// The report predicate both processes ask since the second build: arm d's
// resize and arm f's return are read through it on a remote session.
const SHARED_SOURCES = [join('src', 'shared', 'ipc', 'terminal.ts'), join('src', 'shared', 'pane-report.ts')];

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
    staleSentence([...MAIN_SOURCES, ...((process.env['P292_MACHINE'] ?? '').trim() === '' ? [] : MACHINE_SOURCES), ...SHARED_SOURCES].map(stat), main)
  );
}

/**
 * THE SUMMARY (Phase 320.1, D13): one row an arm. `not asked` when P292_ARMS
 * left it out; `not run` when it did not run to its end, never PASS (the first
 * attempt's reverify read PASS for a to g in runs stopped at `type`);
 * otherwise PASS or FAIL n. `done` is the set of arms that ran to their end.
 */
export function armSummary(chosen, done, arms) {
  return ARMS.map((arm) => {
    const n = (arms[arm] ?? []).length;
    if (arm === 'RUN') return [arm, n === 0 ? 'PASS' : `FAIL ${String(n)}`];
    if (!chosen.includes(arm)) return [arm, 'not asked'];
    if (!done.has(arm)) return [arm, `not run${n > 0 ? ` (and ${String(n)} finding(s) before it stopped)` : ''}`];
    return [arm, n === 0 ? 'PASS' : `FAIL ${String(n)}`];
  });
}

/**
 * The name of the warm-up session the remote run makes when a far session's
 * first attach drew nothing (Phase 326's defect, the same at the parent). It is
 * this run's own, and it is never the pane measured.
 */
export const WARM_SESSION = 'p292-warm';

/**
 * The panes of the ONE session this run measures: every `name<TAB>pane` line
 * whose session is one of this run's, less the warm-up session. Phase 320.1's
 * ruled round: the warm-up counted as a second pane of this run, so on every
 * 3.7b run, where it is always made, the run stopped at its own pane check and
 * arms a to g never ran (the reverifier, job 15a).
 */
export function panesOfThisRun(panes, sessions, warm = WARM_SESSION) {
  const measured = sessions.filter((s) => s.name !== warm && s.tmuxName !== warm);
  return panes.filter((line) => measured.some((s) => s.tmuxName === line.split('\t')[0]));
}

/** The P292_ARMS subset, or every arm; an unknown name is a refusal. */
export function chooseArms(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { arms: [...DEFAULT_ARMS], bad: [] };
  const names = text.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s !== '');
  const bad = names.filter((n) => !ALL_ARMS.includes(n));
  return { arms: ALL_ARMS.filter((a) => names.includes(a)), bad };
}

/**
 * PHASE 366'S PROBE REVIEW (Electron 43.3.0 to 43.8.7). The version of the
 * development Electron a checkout would launch: its
 * `node_modules/electron/dist/version`, else the package's declared version,
 * else null.
 */
export function electronVersionOf(checkoutDir) {
  for (const [file, read] of [
    [join(checkoutDir, 'node_modules', 'electron', 'dist', 'version'), (t) => t.trim()],
    [join(checkoutDir, 'node_modules', 'electron', 'package.json'), (t) => String(JSON.parse(t).version ?? '').trim()]
  ]) {
    try {
      const v = read(readFileSync(file, 'utf8'));
      if (v !== '') return v;
    } catch {
      /* the next source */
    }
  }
  return null;
}

/**
 * PHASE 366'S PROBE REVIEW. P292_CHECKOUT moves the APP FOLDER and never the
 * Electron: the shim this file launches is THIS checkout's, so another
 * checkout whose own Electron is another version would be measured on this
 * one's runtime, and a parent named that way reads as HEAD by construction.
 * Pure: null when the run measures what it says (no other checkout, the same
 * Electron, or a version that cannot be read on either side), else the
 * refusal's sentence.
 */
export function otherCheckoutRefusal({ named, own, ownVersion, namedVersion }) {
  if (named === own || ownVersion === null || namedVersion === null || ownVersion === namedVersion) return null;
  return (
    `P292_CHECKOUT names ${named}, whose Electron is ${namedVersion}, but this run launches it on this checkout's Electron ` +
    `${ownVersion} (the shim is always this checkout's), so that checkout would be measured on the wrong runtime. ` +
    'Run this file from that checkout instead.'
  );
}

/**
 * PHASE 366'S PROBE REVIEW. A crash of any of the app's processes the readings
 * never touch (the GPU process, the network service, the watcher process)
 * left the arms green: nothing here looked. `c` is what Crashpad left in this
 * run's profile, read by NAME only: `made` when its database is there, and
 * every dump file. No database, or a listing that was not taken, means a
 * crash could not be written down there, so none is ruled out.
 */
export function crashFindings(c) {
  if (c === null || c === undefined || typeof c !== 'object') return ["the profile's Crashpad folder was not read, so a crash of the app cannot be ruled out"];
  const out = [];
  if (c.made !== true) out.push("Crashpad's database was never made in this run's profile, so a crash of the app cannot be ruled out");
  if (!Array.isArray(c.dumps)) out.push("the dumps under this run's profile were not listed, so a crash of the app cannot be ruled out");
  else if (c.dumps.length > 0) {
    out.push(
      `Crashpad wrote ${String(c.dumps.length)} dump(s) under this run's profile (${c.dumps.join(', ')}): a process of the app crashed during the run. ` +
        "Read each with your own reader, then delete it: a dump holds the run's environment"
    );
  }
  return out;
}

/** What Crashpad left under a profile, by name only: its database and its dump files. */
function crashpadOf(profileDir) {
  const base = join(profileDir, 'Crashpad');
  const dumps = [];
  for (const sub of ['pending', 'completed', 'new']) {
    try {
      for (const n of readdirSync(join(base, sub))) if (n.endsWith('.dmp')) dumps.push(`${sub}/${n}`);
    } catch {
      /* no such folder: no dump there */
    }
  }
  return { dir: base, made: existsSync(join(base, 'settings.dat')), dumps };
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
  // PHASE 294. Arm h's readings, as each build draws the way down: parked at
  // line 300 over a 40-row screen, 3 lines printed between readings, a notch
  // of 5. HEAD re-freezes at the frame's bottom and passes through every line;
  // the parent leaves copy mode at the frozen bottom and jumps to live.
  const wd = (kind) => {
    const samples = [];
    const seen = new Set();
    let top = 300;
    let printed = 520;
    const at = (t, inMode) => {
      samples.push({ top: t, inMode, position: inMode ? 1 : 0, history: printed - 40, frame: inMode ? 480 : null, lastPrinted: printed, thumbTop: 100 + samples.length, thumbH: 40, laneH: LANE });
      for (let n = t; n < t + 40; n += 1) seen.add(n);
    };
    at(top, true);
    if (kind === 'head') {
      while (top + 40 <= printed) {
        top += 5;
        printed += 3;
        at(top, top + 40 <= printed);
      }
    } else {
      for (let k = 0; k < 28; k += 1) {
        top += 5;
        printed += 3;
        at(top, true);
      }
      printed += 3;
      at(printed - 39, false);
    }
    return { kind: 'wheel', notchLines: 5, parkTop: 300, newest: printed, reachedLive: true, notches: samples.length - 1, refreezes: kind === 'head' ? 6 : 0, seen: [...seen], samples };
  };
  const quiet = () => {
    const samples = [];
    const seen = new Set();
    for (let t = 300; t <= 400; t += 5) {
      samples.push({ top: t, inMode: t < 400, lastPrinted: 439 });
      for (let n = t; n < t + 40; n += 1) seen.add(n);
    }
    return { kind: 'quiet', notchLines: 5, parkTop: 300, newest: 439, reachedLive: true, notches: samples.length - 1, refreezes: 0, seen: [...seen], samples };
  };
  // THE PROBE REVIEW (Phase 353). A drag through the band, parked at line 302
  // with position 100 over 40 rows (the frame's bottom line 441, the entry's
  // own 3.7b reading), whose last held view ends at `newest`, every line from
  // the park to it drawn on the way.
  const dragAt = (newest) => {
    const seen = [];
    for (let n = 302; n <= newest; n += 1) seen.push(n);
    return { kind: 'drag', notchLines: null, parkTop: 302, newest, frameBottom: 302 + 100 + 40 - 1, reachedLive: true, notches: 60, refreezes: newest > 441 ? 3 : 0, seen, samples: [{ top: 302, inMode: true }, { top: newest - 39, inMode: true }] };
  };
  const copies = (offBy) => Array.from({ length: 200 }, (_, i) => ({ want: 1000 + i, got: 1000 + i + (i % 4 === 0 ? offBy : 0) }));
  const rows6 = ['L901', 'L902', 'L903', 'L904', 'L905', 'L906', 'L907'];
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
    ['the arms: empty means every arm but h2, which presses ⌘C', () => chooseArms(''), { arms: DEFAULT_ARMS, bad: [] }],
    ['the arms: h2 is asked for by name', () => chooseArms('h2'), { arms: ['h2'], bad: [] }],
    ['the pane measured: the one session of this run, the app\'s control session left out', () => panesOfThisRun(['gmux-control\t%0', 'p292-shell\t%1'], [{ id: 'a', name: 'p292-shell', tmuxName: 'p292-shell' }]), ['p292-shell\t%1']],
    ['the pane measured: the warm-up session is never it (the reverifier\'s 3.7b runs stopped here)', () => panesOfThisRun(['gmux-control\t%0', 'p292-shell\t%1', 'p292-warm\t%2'], [{ id: 'a', name: 'p292-shell', tmuxName: 'p292-shell' }, { id: 'b', name: 'p292-warm', tmuxName: 'p292-warm' }]), ['p292-shell\t%1']],
    ['the pane measured: two sessions of this run besides the warm-up are still two, and the run stops on them', () => panesOfThisRun(['p292-shell\t%1', 'other\t%3', 'p292-warm\t%2'], [{ id: 'a', name: 'p292-shell', tmuxName: 'p292-shell' }, { id: 'c', name: 'other', tmuxName: 'other' }, { id: 'b', name: 'p292-warm', tmuxName: 'p292-warm' }]).length, 2],
    ['the summary: a run stopped at type prints not run for every arm, never PASS (Phase 320.1)', () => armSummary(ALL_ARMS, new Set(), { ...Object.fromEntries(ALL_ARMS.map((a) => [a, []])), RUN: ['the run stopped during type'] }).map(([, v]) => v), [...ALL_ARMS.map(() => 'not run'), 'FAIL 1']],
    ['the summary: arms that ran are PASS or FAIL, an arm left out is not asked', () => armSummary(['a', 'c'], new Set(['a', 'c']), { ...Object.fromEntries(ALL_ARMS.map((x) => [x, []])), c: ['c x'], RUN: [] }).slice(0, 3), [['a', 'PASS'], ['b', 'not asked'], ['c', 'FAIL 1']]],
    ['the summary: an arm with findings that did not finish is still not run', () => armSummary(['d'], new Set(), { ...Object.fromEntries(ALL_ARMS.map((x) => [x, []])), d: ['d could not park'], RUN: [] })[3], ['d', 'not run (and 1 finding(s) before it stopped)']],
    ['the arms: a subset keeps the file\'s order', () => chooseArms('d, a'), { arms: ['a', 'd'], bad: [] }],
    ['the arms: an unknown name is named', () => chooseArms('a,z'), { arms: ['a'], bad: ['z'] }],
    ['stale: a build newer than every source is not stale', () => staleSentence([['a.ts', 1000], ['b.tsx', 2000]], ['out/main/index.js', 2000]), null],
    ['stale: a source newer than the build is refused and named', () => staleSentence([['a.ts', 3500], ['b.tsx', 2000]], ['out/main/index.js', 2000]), 'out/ is older than the scroll sources; build first (a.ts is 1.5 s newer than out/main/index.js).'],
    ['stale: no bundle at all is a refusal, not a pass', () => staleSentence([['a.ts', 1000]], null), 'out/ holds no bundle for the scroll sources; build first.'],
    ['h HEAD: the way down passes through every line, no gesture jumps', () => wayDownFindings(wd('head'), { coverage: true, jumps: true }), []],
    ['h the parent: lines never on screen, and the jump to live, are both caught', () => count(wayDownFindings(wd('parent'), { coverage: true, jumps: true })), 2],
    ['h the parent read on 3.6a, graded by never re-freezing, passes', () => wayDownFindings(wd('parent'), { noRefreeze: true }), []],
    ['h a re-freeze where none may happen is caught', () => count(wayDownFindings(wd('head'), { noRefreeze: true })), 1],
    ['h quiet: every notch moves by the notch, and nothing is never on screen', () => wayDownFindings(quiet(), { coverage: true, exact: true, noRefreeze: true }), []],
    ['h quiet: one notch that moved by more is caught', () => count(wayDownFindings({ ...quiet(), samples: quiet().samples.map((x, i) => (i === 4 ? { ...x, top: x.top + 2 } : x)) }, { exact: true })), 1],
    ['h a way down that never reached live is caught', () => count(wayDownFindings({ ...wd('head'), reachedLive: false }, {})), 1],
    ['h no park is a finding, not a pass', () => count(wayDownFindings(null, {})), 1],
    // THE PROBE REVIEW (Phase 353). The drag through the band: coverage up to
    // the newest line on screen passes at the parent too, whose band shows the
    // frame frozen at the park (bottom line 441 parked at 302, position 100, 40
    // rows), so `reach` is what reads the band at all.
    ['h drag review: HEAD reaches past the frozen frame', () => wayDownFindings(dragAt(470), { coverage: true, reach: true }), []],
    ['h drag review: the parent band, newest the frame bottom, passes coverage alone', () => wayDownFindings(dragAt(441), { coverage: true }), []],
    ['h drag review: and is caught by reach', () => count(wayDownFindings(dragAt(441), { coverage: true, reach: true })), 1],
    ['h drag review: a frame bottom never read is a finding, not a pass', () => count(wayDownFindings({ ...dragAt(470), frameBottom: null }, { reach: true })), 1],
    ['h2 streamNo reads L<n> and nothing else', () => [streamNo('L123'), streamNo('line 1'), streamNo(' L7 '), streamNo(null)], [123, null, 7, null]],
    ['h2 HEAD: every copy is its line, every paste the highlighted rows', () => copyFindings(copies(0), [{ pasted: rows6, highlighted: rows6 }]), []],
    ['h2 the parent: copies one line newer are caught', () => starts(copyFindings(copies(1), [{ pasted: rows6, highlighted: rows6 }])), ['h2 50 of 200 copies of one line came back as ano']],
    ['h2 a paste that is not the highlighted rows is caught', () => count(copyFindings(copies(0), [{ pasted: rows6.slice(1).concat(['L908']), highlighted: rows6 }])), 1],
    ['h2 a ⌘C that never landed is caught', () => count(copyFindings(copies(0), [{ pasted: null, highlighted: rows6 }])), 1],
    ['h2 a drag that highlighted too little compared nothing', () => count(copyFindings(copies(0), [{ pasted: ['L1'], highlighted: ['L1'] }])), 1],
    // THE FIX ROUND (the terminal lens): the held range, not the highlight alone.
    ['h2 fix round: a paste that runs past the screen to its anchor is the held range', () => copyFindings(copies(0), [{ pasted: [...rows6, 'L908', 'L909'], highlighted: rows6 }]), []],
    ['h2 fix round: a paste one line newer than the highlight is caught', () => count(copyFindings(copies(0), [{ pasted: ['L902', 'L903', 'L904', 'L905', 'L906', 'L907', 'L908'], highlighted: rows6 }])), 1],
    ['h2 fix round: a paste with a gap is caught', () => count(copyFindings(copies(0), [{ pasted: ['L901', 'L902', 'L903', 'L905', 'L906', 'L907', 'L908'], highlighted: rows6 }])), 1],
    ['h2 fix round: the committed drag\'s own shape, an empty first row and a cut last one, equal to the highlight, is the held range', () => copyFindings(copies(0), [{ pasted: ['', 'L1048', 'L1049', 'L1050', 'L1051', 'L'], highlighted: ['', 'L1048', 'L1049', 'L1050', 'L1051', 'L'] }]), []],
    ['h2 fix round: a range past the screen with a gap after the highlight is caught', () => count(copyFindings(copies(0), [{ pasted: [...rows6, 'L909', 'L910'], highlighted: rows6 }])), 1],
    ['h2 fix round: pastes of one parked selection that drift are caught', () => count(copyFindings(copies(0), [{ pasted: rows6, highlighted: rows6 }, { pasted: rows6.map((l) => `L${String(Number(l.slice(1)) + 100)}`), highlighted: rows6.map((l) => `L${String(Number(l.slice(1)) + 100)}`) }])), 1],
    ['h2 fix round: on a tmux that does not name the frame, a paste a line off the highlight is printed and one range passes', () => copyFindings(copies(0), [{ pasted: ['', 'L959', 'L960', 'L961', 'L962', 'L963', 'L964', 'L'], highlighted: ['', 'L958', 'L959', 'L960', 'L961', 'L962', 'L963', 'L'] }], { heldRange: false }), []],
    ['h2 fix round: and two ranges over one parked selection are still caught there', () => count(copyFindings(copies(0), [{ pasted: rows6, highlighted: rows6 }, { pasted: rows6.slice(1).concat(['L908']), highlighted: rows6 }], { heldRange: false })), 1],
    ['h fix round: the notch is the park\'s own step', () => [notchOfTrail([10, 20, 30, 40]), notchOfTrail([5, 10, 15]), notchOfTrail([10, 20, 20, 30]), notchOfTrail([]), notchOfTrail(null)], [10, 5, 10, null, null]],
    ['h fix round: the alternate screen\'s end holds no line, and its re-freezes are still graded', () => [wayDownFindings({ ...wd('head'), newest: null, refreezes: 0 }, { noRefreeze: true }), count(wayDownFindings({ ...wd('head'), newest: null, refreezes: 2 }, { noRefreeze: true })), count(wayDownFindings({ ...wd('head'), newest: null }, { coverage: true }))], [[], 1, 1]],
    ['h fix round: a notch never measured is a finding, not a pass', () => count(wayDownFindings({ ...quiet(), notchLines: null }, { exact: true })), 1],
    ['h2 no copies is a finding, not a pass', () => count(copyFindings([], [])), 2],
    // PHASE 366'S PROBE REVIEW. A crash of a process the readings never touch, and the
    // checkout knob that would run a parent on this checkout's Electron.
    ['d review: no sample after the resize is a finding, not a pass', () => count(resizeThumbFindings(null, ENTRY, { label: 'd' })), 1],
    ['d review: a parked pane with no thumb drawn after the resize is a finding, not a pass', () => count(resizeThumbFindings({ ...sample('head', 40), thumbTop: null }, ENTRY, { changes: 1, rate: 17.5 })), 1],
    ['d review: a pane thrown back to live is resizeFindings\' to name, not the thumb\'s', () => resizeThumbFindings({ ...sample('head', 40), inMode: false }, ENTRY, { changes: 1, rate: 17.5 }), []],
    ['RUN crash: the database made and no dump is no finding', () => crashFindings({ made: true, dumps: [] }), []],
    ['RUN crash: a dump under the profile is a finding', () => count(crashFindings({ made: true, dumps: ['pending/a.dmp'] })), 1],
    ['RUN crash: no database is a finding, not a pass', () => count(crashFindings({ made: false, dumps: [] })), 1],
    ['RUN crash: dumps never listed is a finding, not a pass', () => count(crashFindings({ made: true })), 1],
    ['RUN crash: a folder never read is a finding, not a pass', () => count(crashFindings(null)), 1],
    ['checkout: no other checkout named runs', () => otherCheckoutRefusal({ named: '/r/head', own: '/r/head', ownVersion: '43.8.7', namedVersion: '43.8.7' }), null],
    ['checkout: another checkout on the same Electron runs', () => otherCheckoutRefusal({ named: '/r/parent', own: '/r/head', ownVersion: '43.8.7', namedVersion: '43.8.7' }), null],
    ['checkout: the parent on 43.3.0 named from a checkout on 43.8.7 refuses', () => typeof otherCheckoutRefusal({ named: '/r/parent', own: '/r/head', ownVersion: '43.8.7', namedVersion: '43.3.0' }), 'string'],
    ['checkout: HEAD on 43.8.7 named from the parent on 43.3.0 refuses', () => typeof otherCheckoutRefusal({ named: '/r/head', own: '/r/parent', ownVersion: '43.3.0', namedVersion: '43.8.7' }), 'string'],
    ['checkout: a checkout whose Electron cannot be read runs', () => otherCheckoutRefusal({ named: '/r/copy', own: '/r/head', ownVersion: '43.8.7', namedVersion: null }), null]
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
// His ruling of 2026-10-02: nothing this run starts carries his Terminal tab's
// TERM_SESSION_ID. macOS's /etc/zshrc_Apple_Terminal gives an interactive zsh
// started with it an exit hook that appends that session's history to
// ${ZDOTDIR:-$HOME}/.zsh_history, so the app below also gets its scratch HOME
// as its ZDOTDIR, and a zsh it starts reads and writes nothing of his.
delete process.env['TERM_SESSION_ID'];

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
// PHASE 366'S PROBE REVIEW: the Electron every launch below runs is THIS checkout's.
const ownElectron = electronVersionOf(REPO);
const checkoutElectron = checkout === REPO ? ownElectron : electronVersionOf(checkout);
{
  const why = otherCheckoutRefusal({ named: checkout, own: REPO, ownVersion: ownElectron, namedVersion: checkoutElectron });
  if (why !== null) refuse(why);
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
// Phase 320.1's fix round: 15 s on his Mac Pro, where 8 s printed 87 lines,
// below arm a's own 100 line precondition (the parent verifier's nit).
const WATCH_MS = intOf('P292_WATCH_MS', (process.env['P292_MACHINE'] ?? '').trim() === 'real' ? 15000 : 8000);
const outDir = resolve(REPO, (process.env['P292_OUT_DIR'] ?? '').trim() || join('out', 'p292'));
mkdirSync(outDir, { recursive: true });

// PHASE 320.1. Another machine, when asked; '' is this Mac, exactly as before.
const MACHINE = (process.env['P292_MACHINE'] ?? '').trim();
if (MACHINE !== '' && MACHINE !== 'loopback' && MACHINE !== 'real') refuse(`P292_MACHINE is ${J(MACHINE)}; it is loopback, real, or unset for this Mac.`);
// PHASE 295. The copy a session on another machine makes is its own two-call
// reader (src/main/machines/remote-pane-history.ts), not this phase's, so h2 is
// this Mac's alone.
if (MACHINE !== '' && chosen.includes('h2')) refuse('arm h2 reads this Mac\'s history copy; a session on another machine copies through its own reader, which Phase 295 does not touch.');
if (MACHINE === 'real' && chosen.some((a) => !['a', 'c', 'd', 'e', 'f'].includes(a))) {
  refuse(`the real machine runs arms a, c, d, e and f (build/p3201/SPEC.md §8); ${chosen.filter((a) => !['a', 'c', 'd', 'e', 'f'].includes(a)).join(', ')} were asked for.`);
}
const MACHINE_ID = MACHINE === 'real' ? 'p292real' : 'p292far';
const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
let carriage = null;
let realFacts = null;
if (MACHINE === 'loopback') {
  try {
    carriage = JSON.parse(readFileSync(join(configRoot, 'p69-carriage.json'), 'utf8'));
  } catch {
    carriage = null;
  }
  if (configRoot === '' || carriage === null) refuse('P292_MACHINE=loopback and there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run `npm run probe:p292:remote`, which wraps this file in build/with-scratch-machine.mjs.');
  if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's own TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
}
if (MACHINE === 'real') {
  // A loopback carriage beside this run means the scratch machine's agent was
  // handed in place of his; the helper refuses that by value.
  let scratchAgent = null;
  try {
    scratchAgent = JSON.parse(readFileSync(join(configRoot, 'p69-carriage.json'), 'utf8')).authSock ?? null;
  } catch {
    scratchAgent = null;
  }
  realFacts = realMachineFromEnv(process.env, socket, { app: true, scratchAgent });
  if (realFacts.refusal !== null) refuse(`the real machine: ${realFacts.refusal}`);
}
const farTmuxBin = MACHINE === 'loopback' ? (process.env['P292_FAR_TMUX'] ?? '').trim() || carriage.remoteTmuxPath : MACHINE === 'real' ? realFacts.realTmux : null;
if (MACHINE === 'loopback') {
  try {
    accessSync(farTmuxBin, fsConstants.X_OK);
  } catch {
    refuse(`P292_FAR_TMUX ${farTmuxBin} is not an executable file.`);
  }
}

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
// PHASE 353 (D-P2). Every probed registry row hidden before the launch, so no
// agent is started, not even for its version; read back before any arm.
writeHiddenAgents(profile, 'p292', hiddenAgentsBesides([]));
writeFileSync(join(project, 'README.md'), '# Phase 292\n');
// Arm g: 900 lines of about 290 characters, all at once, then nothing.
writeFileSync(
  join(project, 'wrap.sh'),
  `awk 'BEGIN { for (i = 1; i <= 900; i++) { s = "line " i; for (k = 0; k < 55; k++) s = s " w" i; print s } }'` + '\n'
);

// PHASE 320.1. The far side's folder, the machine row and its host key, the
// far reader, and the one teardown. None of it runs when MACHINE is ''.
let real = null;
let farProject = null;
let farVersion = null;
let farTmuxSync = null;
let controlBefore = [];
if (MACHINE !== '') {
  const configDir = join(profile, 'gmux', 'config');
  mkdirSync(configDir, { recursive: true, mode: 0o700 });
  const knownMachines = join(profile, 'gmux', 'machines', 'known-machines');
  mkdirSync(dirname(knownMachines), { recursive: true });
  const wrapText = readFileSync(join(project, 'wrap.sh'));
  if (MACHINE === 'loopback') {
    farProject = join(root, 'far');
    rmSync(farProject, { recursive: true, force: true });
    mkdirSync(farProject, { recursive: true });
    writeFileSync(join(farProject, 'wrap.sh'), wrapText);
    writeFileSync(join(configDir, 'machines.json'), `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: 'p292 loopback', host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: farTmuxBin }] })}\n`, 'utf8');
    writeFileSync(knownMachines, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p292/probe-p292.mjs' }), 'utf8');
    const farEnv = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
    farTmuxSync = (args) => (spawnSync(farTmuxBin, ['-L', socket, '-f', '/dev/null', ...args], { encoding: 'utf8', env: farEnv, timeout: 10_000 }).stdout ?? '').trim();
    farVersion = (spawnSync(farTmuxBin, ['-V'], { encoding: 'utf8' }).stdout ?? '').trim().replace(/^tmux\s+/, '');
  } else {
    try {
      real = openRealMachine(realFacts, { runDir: harnessDir, say });
    } catch (err) {
      refuse(`the real machine did not open: ${err instanceof Error ? err.message : String(err)}`);
    }
    // THE TEARDOWN IS ARMED THE MOMENT THE DIRECTORY EXISTS THERE, before any
    // refusal below can exit: `close()` is synchronous and runs once, so this
    // and the run's own `finally` share it.
    process.on('exit', () => real?.close());
    farProject = `${realFacts.farDir}/far`;
    real.run(`cat > ${farProject}/wrap.sh`, { input: wrapText });
    writeFileSync(join(configDir, 'machines.json'), `${J({ schema: 1, machines: [machineRow({ id: MACHINE_ID, host: realFacts.host, user: realFacts.user, farDir: realFacts.farDir })] })}\n`, 'utf8');
    writeFileSync(knownMachines, readFileSync(real.knownHosts, 'utf8'), 'utf8');
    farTmuxSync = (args) => real.tmux(args, { allowFail: true }).trim();
    farVersion = ((real.first ?? '').split('\n').find((l) => /^tmux /.test(l)) ?? '').replace(/^tmux\s+/, '');
    controlBefore = controlEntries();
  }
}
let farEnded = false;
/** The far scratch server, ended by the pid it reports; on the real machine, everything real-machine.mjs put there. */
function endFar() {
  if (farEnded || MACHINE === '') return;
  farEnded = true;
  if (MACHINE === 'loopback') {
    const pid = Number(farTmuxSync(['display-message', '-p', '#{pid}']));
    if (Number.isInteger(pid) && pid > 1) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
  } else if (real !== null) {
    real.close();
    // `arms` is declared below this function; an exit before it exists has no
    // report to put the finding in, and the close above has already run.
    try {
      readings.realCounts = { before: real.countBefore, after: real.countAfter };
      readings.realTeardown = real.teardown;
      if (real.countBefore === null || real.countBefore !== real.countAfter) arms.RUN.push(`his own server held ${String(real.countBefore)} sessions before and ${String(real.countAfter)} after; the two counts must be read and equal`);
      if (real.teardown?.removed !== true) arms.RUN.push(`the run's directory ${realFacts.farDir} on the far machine was not confirmed removed; remove it by hand and say so`);
      readings.dotfiles = real.dotfiles;
      const moved = dotfilesSentence('the far machine', real.dotfiles.moved, real.dotfiles.before, real.dotfiles.after);
      if (moved !== null) arms.RUN.push(moved);
    } catch {
      /* before the report existed */
    }
  }
  if (censusHere !== null) {
    const after = localCensus();
    try {
      readings.dotfiles = { before: censusHere, after };
      const moved = dotfilesSentence('this Mac', dotfilesMoved(censusHere, after), censusHere, after);
      if (moved !== null) arms.RUN.push(moved);
    } catch {
      /* before the report existed */
    }
  }
}
if (MACHINE !== '') process.on('exit', endFar);
/** His three dotfiles on THIS Mac, when the far shell runs here (the loopback machine, D12). */
const censusHere = MACHINE === 'loopback' ? localCensus() : null;

say(`${tag}: measuring ${checkout}, arms ${chosen.join(',')}, socket ${socket}`);
say(`${tag}: reading with ${readerTmux} (${readerVersion}); GMUX_TMUX_BIN ${tmuxOverride === '' ? 'is not set, so the app resolves its own' : `hands the app ${tmuxOverride}`}`);
if (MACHINE !== '') say(`${tag}: ON ANOTHER MACHINE (${MACHINE}), whose tmux is ${String(farTmuxBin)} (${String(farVersion)})`);

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
  // Phase 294's arm h: every row's line number, not only the top and bottom.
  kit.lines = () => {
    if (!kit.term) return [];
    const b = kit.term.buffer.active;
    const out = [];
    for (let i = 0; i < kit.term.rows; i += 1) { const l = b.getLine(b.viewportY + i); const n = l ? num(l.translateToString(true)) : null; if (n !== null) out.push(n); }
    return out;
  };
  kit.lane = () => box(document.querySelector('.gmux-terminal-scrollbar'));
  // Phase 295's arm h2: the highlighted text as xterm itself reads it off the
  // screen, which is the rows the person sees highlighted.
  kit.highlighted = () => (kit.term && kit.term.hasSelection() ? kit.term.getSelection() : null);
  kit.focusTerm = () => { const t = document.querySelector('.xterm-helper-textarea'); if (t) t.focus(); return t !== null; };
  kit.wheels = 0;
  window.addEventListener('wheel', () => { kit.wheels += 1; }, true);
  kit.focusWhere = () => { const a = document.activeElement; return a ? a.tagName.toLowerCase() + '.' + String(a.className || '') : 'null'; };
  // Phase 320.1's fix round: how many rows of the pane hold anything, so a
  // far session whose first attach drew nothing (Phase 326) is seen and shown again.
  kit.nonEmpty = () => {
    if (!kit.term) return 0;
    const b = kit.term.buffer.active;
    let n = 0;
    for (let i = 0; i < kit.term.rows; i += 1) { const l = b.getLine(b.viewportY + i); if (l && l.translateToString(true).trim() !== '') n += 1; }
    return n;
  };
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
/** The arms that ran to their end. The summary prints `not run` for any other (Phase 320.1, D13). */
const armsDone = new Set();
const readings = { tag, checkout, electron: ownElectron, socket, arms: chosen, readerTmux, readerVersion, tmuxOverride, loop: ISSUE_LINES, notes: [], samples: [] };
say(`${tag}: Electron ${String(ownElectron)} (this checkout's) runs ${checkout}`);
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
        ZDOTDIR: home,
        TERM_SESSION_ID: undefined,
        GMUX_TMUX_SOCKET: socket,
        GMUX_PROBES: '1',
        ...(tmuxOverride !== '' ? { GMUX_TMUX_BIN: tmuxOverride } : {}),
        ...(MACHINE === 'loopback' ? { GMUX_CONFIG_ROOT: configRoot, SSH_AUTH_SOCK: carriage.authSock } : {}),
        ...(MACHINE === 'real' ? { SSH_AUTH_SOCK: process.env['SSH_AUTH_SOCK'] } : {})
      }),
      graceMs: 8_000,
      // Phase 353: arm h's six parks and ways down, and h2's copies and ⌘C,
      // each get their own room on top of arms a to g's.
      ceilingMs: (MACHINE === '' ? 80_000 : 300_000) + (chosen.includes('h') ? 420_000 : 0) + (chosen.includes('h2') ? 240_000 : 0)
    },
    async (handle) => {
      const { cdp, url } = await cdpForAppWindow(profile, 40_000);
      say(`${tag}: app window at ${url}, pid ${String(handle.appPid())}`);
      const tmux =
        MACHINE === ''
          ? async (...args) => (await execFileP(readerTmux, ['-L', socket, ...args], { encoding: 'utf8' })).stdout
          : async (...args) => `${farTmuxSync(args)}\n`;
      let stage = 'launch';
      /** Phase 326's retry for a far session, set when this run is on a machine. */
      let showAgain = null;
      /**
       * The arm a stage names ran to its end: called as the NEXT stage begins,
       * so an arm the run stopped inside is never marked (Phase 320.1, D13).
       */
      const armDone = (finished) => {
        if (finished === 'a/b') {
          for (const arm of ['a', 'b']) if (chosen.includes(arm)) armsDone.add(arm);
        } else if (ALL_ARMS.includes(finished)) {
          armsDone.add(finished);
        }
      };
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
        // PHASE 353 (D-P2). The app's own scan, read back before anything is
        // opened: nothing resolved, since this run has no stand-in.
        stage = 'agents';
        readings.agents = standInsOnlyVerdict(JSON.parse(await cdpEval(cdp, AGENTS_LIST_EXPR, 90_000)), { standIns: [] });
        say(`${tag}: agents ${readings.agents.ok ? 'ok' : 'NOT OK'}: ${readings.agents.said}`);
        if (!readings.agents.ok) throw new Error(`an agent resolved in the app's own scan: ${readings.agents.said}`);
        stage = 'open';
        if (MACHINE === '') {
          await cdpEval(cdp, `window.__gmuxShotDrive(${J({ projectPath: project, session: { agent: 'shell', name: 'p292-shell' } })}).then(() => true)`, 60_000);
        } else {
          // THE PRODUCT'S WAY ONTO A MACHINE: confirmed and prepared, the far
          // folder opened, a shell session made there and shown.
          const drive = (method, ...a) => cdpEval(cdp, `window.__gmuxP95.${method}(${a.map((x) => J(x)).join(', ')})`, 120_000);
          const up = await drive('machineUp', MACHINE_ID);
          if (!(up.rows ?? []).some((r) => r.id === MACHINE_ID && r.usable)) throw new Error(`the machine is not usable: ${J(up).slice(0, 400)}`);
          if (real !== null) {
            // The socket, and the quiet shell: default-shell /bin/sh and the
            // run's own ZDOTDIR, proved before the session is made (D12).
            const why = real.prove();
            if (why !== null) throw new Error(`the far socket is not this run's own: ${why}. Nothing was made there.`);
          } else {
            // THE QUIET SHELL on the loopback machine (D12): the far shell is
            // his own zsh on this Mac, so it must read the yard's empty ZDOTDIR.
            const zdot = farTmuxSync(['show-environment', '-g', 'ZDOTDIR']);
            const want = `ZDOTDIR=${join(configRoot, 'zdot')}`;
            if (zdot !== want) throw new Error(`the loopback machine's far shell is not the quiet one (ZDOTDIR reads ${J(zdot)}, not ${J(want)}); run it with SCRATCH_MACHINE_QUIET_SHELL=1, which npm run probe:p292:remote sets. Nothing was made there.`);
          }
          if (real !== null) {
            // The app's own ssh master, kept for the teardown only when it is
            // provably this run's: new since launch and naming this profile.
            const master = real.adoptAppControl(controlBefore, profile);
            if (master !== null) note(`real machine: ${master}`);
          }
          let opened = null;
          for (let attempt = 1; attempt <= 6; attempt += 1) {
            opened = await drive('openRemote', MACHINE_ID, farProject);
            if (opened?.result?.ok === true) break;
            await sleep(3000);
          }
          if (opened?.result?.ok !== true) throw new Error(`the far folder did not open: ${J(opened?.result ?? null).slice(0, 400)}`);
          const made = await drive('create', { name: 'p292-shell', agent: 'shell', machineId: MACHINE_ID });
          const row = (made.sessions ?? []).find((x) => x.name === 'p292-shell' && x.machineId === MACHINE_ID);
          if (row === undefined) throw new Error('the session did not start on the machine');
          await drive('select', row.id);
          showAgain = async () => {
            // PHASE 326's DEFECT, the same at the parent (the parent
            // verifier: every 3.7b run stopped at the type step with
            // `sessions:attach SESSION_NOT_FOUND`): a far session's first
            // attach can land before it reads as Tortie's, and its screen
            // never draws. Shown once more, by way of a warm-up session,
            // the way the parent verifier's ruler does.
            const warm = await drive('create', { name: WARM_SESSION, agent: 'shell', machineId: MACHINE_ID });
            const w = (warm.sessions ?? []).find((x) => x.name === WARM_SESSION && x.machineId === MACHINE_ID);
            if (w !== undefined) await drive('select', w.id);
            await sleep(1500);
            await drive('select', row.id);
          };
        }
        await cdpEval(cdp, PAGE_KIT);
        for (let i = 0; i < 40; i += 1) {
          if (await cdpEval(cdp, 'window.__p292.ready()')) break;
          await sleep(150);
        }
        if (!(await cdpEval(cdp, 'window.__p292.ready()'))) throw new Error('the xterm Terminal was not found through the fiber of .gmux-terminal-mount');
        if (showAgain !== null) {
          // The far shell's prompt has drawn, or the session is shown again once.
          const drawn = async () => (await cdpEval(cdp, 'window.__p292.rearm()')) && (await cdpEval(cdp, 'window.__p292.nonEmpty()')) > 0;
          let ok = false;
          for (const until = Date.now() + 20_000; Date.now() < until; ) {
            if (await drawn()) {
              ok = true;
              break;
            }
            await sleep(250);
          }
          if (!ok) {
            note('the far session drew nothing in 20 s and was shown again (Phase 326, the same at the parent)');
            await showAgain();
            for (const until = Date.now() + 40_000; Date.now() < until; ) {
              if (await drawn()) {
                ok = true;
                break;
              }
              await sleep(250);
            }
            if (!ok) throw new Error('the far session drew nothing in 20 s, nor in 40 s more after it was shown again (Phase 326)');
          }
        }
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
        if (MACHINE === '') {
          const serverPid = (await tmux('display-message', '-p', '#{pid}')).trim();
          readings.serverCommand = (spawnSync('ps', ['-p', serverPid, '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
          say(`${tag}: THE SERVER REPORTS tmux ${readings.serverVersion}; its process is: ${readings.serverCommand}`);
          say(`${tag}: the app said: ${String(readings.appSaid)}`);
          if (readings.serverVersion !== readerVersion) {
            arms.RUN.push(`the server reports tmux ${readings.serverVersion} and this probe reads with ${readerVersion} (${readerTmux})${tmuxOverride !== '' ? ', so GMUX_TMUX_BIN was not honoured' : ''}`);
          }
        } else {
          readings.machine = MACHINE;
          readings.farVersion = farVersion;
          say(`${tag}: THE FAR SCRATCH SERVER REPORTS tmux ${readings.serverVersion}, and its binary says ${String(farVersion)}`);
          if (readings.serverVersion !== farVersion) arms.RUN.push(`the far server reports tmux ${readings.serverVersion} and its binary says ${String(farVersion)}`);
          // The far login shell becomes a plain sh at once: ONE space-led exec
          // line, through the bridge, so nothing of the loop reaches a login
          // shell's history and HOME is the far project.
          const active = await cdpEval(cdp, `window.__gmuxP95.state().then((s) => s.activeSessionId)`, 5000);
          for (let i = 0; i < 60; i += 1) {
            if ((await cdpEval(cdp, 'window.__p292.read()'))?.top !== null) break;
            await sleep(250);
          }
          await sleep(1500);
          await cdpEval(cdp, `(window.gmux.term.sendInput(${J(active)}, ${J(` exec /usr/bin/env -i PATH=/usr/bin:/bin HOME=${farProject} TERM="$TERM" BASH_SILENCE_DEPRECATION_WARNING=1 PS1='p292 $ ' /bin/sh\r`)}), true)`);
          await sleep(2500);
        }

        // The app keeps a control session of its own on the server; the pane
        // measured is the one session this run created.
        const panes = (await tmux('list-panes', '-a', '-F', '#{session_name}\t#{pane_id}')).trim().split('\n').filter((l) => l !== '');
        const sessions =
          MACHINE === ''
            ? await cdpEval(cdp, `window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName })))`, 5000)
            : await cdpEval(cdp, `window.__gmuxP95.state().then((s) => s.sessions.map((x) => ({ id: x.id, name: x.name, tmuxName: x.tmuxName })))`, 5000);
        const mine = panesOfThisRun(panes, sessions);
        if (mine.length !== 1) throw new Error(`expected one pane of this run's session, found ${J(panes)} against ${J(sessions)}`);
        const paneId = mine[0].split('\t')[1];
        const mySid = sessions.find((s) => s.tmuxName === mine[0].split('\t')[0]).id;
        readings.pane = mine[0].replace('\t', ' ');

        /** tmux's own numbers for the pane, one call so they are one moment. */
        // Phase 294: the frame's depth, tmux's own (`#{copy_position_limit}`,
        // empty before 3.7 and outside copy mode), and the alternate screen,
        // read for arm h; every other arm ignores the two.
        const fmtNow = async (pane = paneId) => {
          const [pos, hist, inMode, ph, pw, frame, alt] = (await tmux('display-message', '-p', '-t', pane, '#{scroll_position}|#{history_size}|#{pane_in_mode}|#{pane_height}|#{pane_width}|#{copy_position_limit}|#{alternate_on}')).trim().split('|');
          return { position: pos === '' ? 0 : Number(pos), history: Number(hist), inMode: inMode === '1', paneH: Number(ph), paneW: Number(pw), frame: inMode === '1' && /^\d+$/.test(frame ?? '') ? Number(frame) : null, alt: alt === '1' };
        };
        /** The newest line printed: capture-pane answers the LIVE screen. */
        const newestPrinted = async (pane = paneId) => {
          const rows = (await tmux('capture-pane', '-p', '-t', pane)).split('\n').map(lineNo).filter((n) => n !== null);
          return rows.length > 0 ? Math.max(...rows) : null;
        };
        /** Arm h2's newest `L<n>`: capture-pane answers the LIVE screen. */
        const newestStream = async (pane = paneId) => {
          const rows = (await tmux('capture-pane', '-p', '-t', pane)).split('\n').map(streamNo).filter((n) => n !== null);
          return rows.length > 0 ? Math.max(...rows) : null;
        };
        /** All three rulers, asked together. */
        const sample = async (extra = {}, pane = paneId) => {
          const [screen, f, printed] = await Promise.all([cdpEval(cdp, 'window.__p292.read()', 5000), fmtNow(pane), newestPrinted(pane)]);
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
        /** The lines one wheel notch moved on the last park (`notchOfTrail`), or null before one. */
        let parkNotch = null;
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
          // THE FIX ROUND: the lines a notch moves, measured off this park.
          parkNotch = notchOfTrail(trail);
          readings.parks.push({ why, cellHeight: cell, notches, positionAfterEachNotch: trail, notchLines: parkNotch, historyBefore, historyAfterFirst, fromScreen, ...chosenEntry });
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
        // PHASE 320.1. On a machine where nothing parks (320.1's parent), every
        // chosen arm says so rather than the run stopping.
        const parkSample = await park('the park').catch((err) => {
          if (MACHINE === '') throw err;
          throw Object.assign(new Error(err instanceof Error ? err.message : String(err)), { couldNotPark: true });
        });
        const photographs = [];
        const photograph = (name) => {
          if (MACHINE !== '') return;
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
          armDone(stage);
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
          armDone(stage);
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
          armDone(stage);
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
          armDone(stage);
          stage = 'f';
          await parked('f');
          await sleep(1000);
          const before = await sample({ label: 'before leaving', ms: Date.now() - tPark });
          line('f before leaving', before, entry);
          await cdpEval(cdp, `window.__gmuxP95.create(${J(MACHINE === '' ? { name: 'p292-other', agent: 'shell' } : { name: 'p292-other', agent: 'shell', machineId: MACHINE_ID })}).then(() => true)`, 30_000);
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

        // ------------------------------------------------------------- h, h2
        // THE WAY BACK DOWN (Phase 294) and THE COPY FROM A BUSY HISTORY
        // (Phase 295). Each of h's variants starts from a fresh park. The
        // tmux commands this file sends itself (a cancel, an interrupt, a
        // clear-history, a history-limit on the scratch server) are the arms'
        // setting and never what they grade.
        const sendKeysToPane = (sid, text) => cdpEval(cdp, `(window.gmux.term.sendInput(${J(sid)}, ${J(text)}), true)`);
        const toLive = async (pane = paneId) => {
          await tmux('send-keys', '-t', pane, '-X', 'cancel').catch(() => undefined);
          await sleep(400);
        };
        /** Interrupt what the pane runs and wait until nothing more prints. */
        const stopLoop = async (sid, pane = paneId) => {
          await toLive(pane);
          for (let i = 0; i < 10; i += 1) {
            await sendKeysToPane(sid, String.fromCharCode(3));
            const a = (await fmtNow(pane)).history;
            await sleep(500);
            if ((await fmtNow(pane)).history === a) return true;
          }
          return false;
        };
        const wheelDown = () => cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: cell * perNotch });
        const pageDown = async () => {
          const k = { key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34, nativeVirtualKeyCode: 34, modifiers: 8 };
          await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...k }, 5000);
          await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...k }, 5000);
        };
        /** One reading of the way down, kept small. */
        const pick = (x) => ({ top: x.top, inMode: x.inMode, position: x.position, history: x.history, frame: x.frame, alt: x.alt, lastPrinted: x.lastPrinted, thumbTop: x.thumbTop, thumbH: x.thumbH, laneH: x.laneH });
        /**
         * Gestures toward live one at a time until tmux says the pane left copy
         * mode, every row of the pane's buffer read after each, and once 500 ms
         * later. A re-freeze is tmux's frame depth growing while in the mode.
         */
        const wayDown = async (kind, step, notchLines, pane = paneId) => {
          const first = await sample({}, pane);
          const seen = new Set(await cdpEval(cdp, 'window.__p292.lines()'));
          const samples = [pick(first)];
          let lastFrame = first.frame;
          let refreezes = 0;
          let notches = 0;
          let s = first;
          const t0w = Date.now();
          while (notches < 500 && s.inMode) {
            await step();
            notches += 1;
            await sleep(80);
            s = await sample({}, pane);
            for (const n of await cdpEval(cdp, 'window.__p292.lines()')) seen.add(n);
            if (s.inMode && isNum(s.frame) && isNum(lastFrame) && s.frame > lastFrame) refreezes += 1;
            if (s.inMode && isNum(s.frame)) lastFrame = s.frame;
            samples.push(pick(s));
          }
          const seconds = r1((Date.now() - t0w) / 1000);
          await sleep(500);
          const end = await sample({}, pane);
          for (const n of await cdpEval(cdp, 'window.__p292.lines()')) seen.add(n);
          samples.push(pick(end));
          return { kind, notchLines, parkTop: first.top, newest: end.screenMax, reachedLive: !end.inMode, notches, seconds, refreezes, namesFrame: isNum(first.frame), seen: [...seen].sort((x, y) => x - y), samples };
        };
        if (chosen.includes('h')) {
          armDone(stage);
          stage = 'h';
          readings.wayDown = {};
          const here = MACHINE === '';
          /** Print one variant, and grade it as its own rule says. */
          const report = (r, grade) => {
            readings.wayDown[r.kind] = r;
            const seen = new Set(r.seen);
            let never = 0;
            if (isNum(r.parkTop) && isNum(r.newest)) for (let n = r.parkTop; n <= r.newest; n += 1) if (!seen.has(n)) never += 1;
            say(`h ${r.kind}: parked at line ${String(r.parkTop)}, ${String(r.notches)} gesture(s) to live in ${String(r.seconds)} s, ${String(r.refreezes)} re-freeze(s), newest line ${String(r.newest)}, ${String(never)} line(s) never on screen (tmux ${r.namesFrame ? 'names' : 'does not name'} the frame's depth)`);
            arms.h.push(...wayDownFindings(r, { label: `h ${r.kind}`, ...grade(r) }));
          };
          // On THIS MAC and a tmux that names the frame, the way down passes
          // through what printed; anywhere else it is the parent's path, which
          // is graded by never re-freezing and printed for the side by side.
          const passesThrough = (r) => (here && r.namesFrame ? { coverage: true, jumps: true } : { noRefreeze: r.namesFrame });
          const parkPrintRead = async (why) => {
            await toLive();
            await park(why);
            await sleep(8000);
          };
          // h wheel: real wheel notches toward live.
          stage = 'h wheel';
          await parkPrintRead('h wheel parks');
          report(await wayDown('wheel', wheelDown, parkNotch), passesThrough);
          // h page: ⇧PageDown, a page of rows - 1.
          stage = 'h page';
          await parkPrintRead('h page parks');
          await cdpEval(cdp, 'window.__p292.focusTerm()');
          const pageLines = Math.max(1, (await fmtNow()).paneH - 1);
          report(await wayDown('page', pageDown, pageLines), passesThrough);
          // h drag: the scrollbar thumb pressed and dragged down through the
          // band below the frozen frame, three pixels at a time, released three
          // pixels above the lane's foot, which would send the pane live.
          stage = 'h drag';
          await parkPrintRead('h drag parks');
          {
            const first = await sample();
            const lane = await cdpEval(cdp, 'window.__p292.lane()');
            if (!isNum(first.thumbMidY) || lane === null) throw new Error('arm h drag found no thumb to press');
            const seen = new Set(await cdpEval(cdp, 'window.__p292.lines()'));
            const samples = [pick(first)];
            let lastFrame = first.frame;
            let refreezes = 0;
            let steps = 0;
            const x = first.thumbMidX;
            const startY = first.thumbMidY;
            const endY = lane.bottom - first.thumbH / 2 - 3;
            const t0d = Date.now();
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: startY });
            await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y: startY, button: 'left', buttons: 1, clickCount: 1 });
            for (let y = startY; y <= endY; y += 3) {
              await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
              steps += 1;
              await sleep(60);
              const s = await sample();
              for (const n of await cdpEval(cdp, 'window.__p292.lines()')) seen.add(n);
              if (s.inMode && isNum(s.frame) && isNum(lastFrame) && s.frame > lastFrame) refreezes += 1;
              if (s.inMode && isNum(s.frame)) lastFrame = s.frame;
              samples.push(pick(s));
            }
            await sleep(600);
            const held = await sample();
            for (const n of await cdpEval(cdp, 'window.__p292.lines()')) seen.add(n);
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y: endY, button: 'left', buttons: 0, clickCount: 1 });
            samples.push(pick(held));
            // Released in the band, so still parked: the end of the way is
            // that frame's newest line, and nothing is asked of reaching live.
            // The probe review: the frame frozen at the park ends at row 0's
            // line plus the position plus the rows, less one, and the drag must
            // reach past it (`reach`), which the parent's band never does.
            const frameBottom = isNum(first.top) && isNum(first.position) && first.inMode && isNum(first.paneH) ? first.top + first.position + first.paneH - 1 : null;
            report(
              { kind: 'drag', notchLines: null, parkTop: first.top, newest: held.screenMax, frameBottom, reachedLive: true, notches: steps, seconds: r1((Date.now() - t0d) / 1000), refreezes, namesFrame: isNum(first.frame), seen: [...seen].sort((p, q) => p - q), samples },
              (r) => (here && r.namesFrame ? { coverage: true, reach: true } : { noRefreeze: r.namesFrame })
            );
          }
          // h quiet: the loop stopped, so nothing prints while parked. Equal to
          // the parent notch for notch: every notch moves the top line by the
          // notch, and nothing is re-frozen.
          stage = 'h quiet';
          if (!(await stopLoop(mySid))) throw new Error('arm h quiet: the loop did not stop');
          await park('h quiet parks');
          await sleep(3000);
          report(await wayDown('quiet', wheelDown, parkNotch), (r) => ({ coverage: true, exact: true, noRefreeze: r.namesFrame }));
          // h alt: a program prints, the pane is parked, more prints, and the
          // program opens its alternate screen while the reader is parked.
          // Equal to the parent: a re-frozen frame would put that screen under
          // the transcript, so nothing is re-frozen.
          stage = 'h alt';
          await toLive();
          await tmux('clear-history', '-t', paneId).catch(() => undefined);
          await sendKeysToPane(
            mySid,
            ` clear; i=0; while [ $i -lt 400 ]; do i=$((i+1)); printf 'line %s\\n' "$i"; done; sleep 3; while [ $i -lt 520 ]; do i=$((i+1)); printf 'line %s\\n' "$i"; sleep 0.02; done; printf '\\033[?1049hALT SCREEN\\n'; sleep 30; printf '\\033[?1049l'\r`
          );
          for (let i = 0; i < 40; i += 1) {
            if (((await newestPrinted()) ?? 0) >= 400) break;
            await sleep(100);
          }
          await park('h alt parks');
          for (let i = 0; i < 80; i += 1) {
            if ((await fmtNow()).alt) break;
            await sleep(100);
          }
          readings.wayDownAltOpened = (await fmtNow()).alt;
          // The probe review: with no alternate screen open the history grows
          // beside a parked reader, where a re-freeze is RIGHT, so grading
          // `noRefreeze` there would accuse HEAD of exactly the repair. The
          // variant read nothing, and says so as a finding, never a pass.
          if (!readings.wayDownAltOpened) {
            note('h alt: the program had not opened its alternate screen within 8 s of the park');
            const r = await wayDown('alt', wheelDown, parkNotch);
            readings.wayDown.alt = r;
            arms.h.push('h alt: the program never opened its alternate screen while the pane was parked, so this variant read nothing about it');
          } else {
            report(await wayDown('alt', wheelDown, parkNotch), (r) => ({ noRefreeze: r.namesFrame }));
          }
          // The interrupt ends the program before it leaves its alternate
          // screen, so the pane is put back on the ordinary one by hand.
          await stopLoop(mySid);
          await sendKeysToPane(mySid, ` printf '\\033[?1049l'; clear\r`);
          await sleep(600);
          // h limit: a second session under a 1,000-line history-limit, set on
          // the scratch server before the session is made, printing past it,
          // so its history is inside tmux's trim band. Equal to the parent's
          // jump: nothing is re-frozen. This Mac only: the limit is set on the
          // server this file reads.
          if (here) {
            stage = 'h limit';
            // THE FIX ROUND (the terminal lens). The limit belongs to the second
            // session alone: tmux 3.7b applies a GLOBAL history-limit change to
            // panes that already exist (25000 became 1000 at once, measured),
            // so the global set here left arm h2 on a 1,000-line history that
            // trims every 100 lines. So the global is set only while the
            // session is made (3.6a reads it when a pane is made), the session
            // is given its own, and the global is put back before anything else.
            const globalLimit = (await tmux('show-options', '-gv', 'history-limit')).trim();
            await tmux('set-option', '-g', 'history-limit', '1000');
            await cdpEval(cdp, `window.__gmuxP95.create(${J({ name: 'p292-limit', agent: 'shell' })}).then(() => true)`, 30_000);
            {
              const made = await cdpEval(cdp, `window.gmux.sessions.list().then((l) => (l.find((x) => x.name === 'p292-limit') || {}).tmuxName || null)`, 5000);
              // `=name:`, the colon included: set-option's -t is a target pane,
              // and tmux 3.7b answers `no such session` to `=name` alone (measured).
              if (typeof made === 'string') await tmux('set-option', '-t', `=${made}:`, 'history-limit', '1000');
              await tmux('set-option', '-g', 'history-limit', /^\d+$/.test(globalLimit) ? globalLimit : '25000');
              readings.wayDownLimitGlobalBack = (await tmux('show-options', '-gv', 'history-limit')).trim();
              say(`h limit: the global history-limit put back to ${readings.wayDownLimitGlobalBack} (it read ${globalLimit}); the second session keeps 1000 of its own`);
            }
            for (let i = 0; i < 40; i += 1) {
              if (await cdpEval(cdp, 'window.__p292.rearm()')) break;
              await sleep(100);
            }
            await sleep(1500);
            const listed = await cdpEval(cdp, `window.gmux.sessions.list().then((l) => l.map((x) => ({ id: x.id, name: x.name, tmuxName: x.tmuxName })))`, 5000);
            const limitRow = listed.find((x) => x.name === 'p292-limit');
            if (limitRow === undefined) throw new Error('arm h limit: the second session was not made');
            const limitPane = ((await tmux('list-panes', '-a', '-F', '#{session_name}\t#{pane_id}')).trim().split('\n').find((l) => l.split('\t')[0] === limitRow.tmuxName) ?? '').split('\t')[1];
            if (limitPane === undefined) throw new Error('arm h limit: no pane for the second session');
            await sendKeysToPane(limitRow.id, ` i=0; while [ $i -lt 1200 ]; do i=$((i+1)); printf 'line %s\\n' "$i"; done; while :; do i=$((i+1)); printf 'line %s\\n' "$i"; sleep 0.05; done\r`);
            for (let i = 0; i < 100; i += 1) {
              if ((await fmtNow(limitPane)).history >= 950) break;
              await sleep(100);
            }
            const limit = Number((await tmux('display-message', '-p', '-t', limitPane, '#{history_limit}')).trim());
            readings.wayDownLimit = { limit, history: (await fmtNow(limitPane)).history };
            say(`h limit: the second session's history-limit is ${String(limit)}, its history ${String(readings.wayDownLimit.history)}`);
            // Park it the way arm a parks, through the pane the screen shows.
            let parkedAt = 0;
            for (let n = 0; n < 80 && parkedAt < BACK_LINES; n += 1) {
              await cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: -cell * perNotch });
              await sleep(40);
              parkedAt = (await fmtNow(limitPane)).position;
            }
            await sleep(4000);
            // The probe review: the trim band is `limit - ceil(limit / 10)`
            // and up (src/main/scrollback/watch.ts `isDiscarding`); a history
            // below it may be re-frozen ON PURPOSE, so `noRefreeze` is asked
            // only of a history inside the band, and a history that never got
            // there read nothing.
            const band = limit > 0 ? limit - Math.ceil(limit / 10) : null;
            const inBand = band !== null && readings.wayDownLimit.history >= band;
            if (inBand) {
              report(await wayDown('limit', wheelDown, parkNotch, limitPane), (r) => ({ noRefreeze: r.namesFrame }));
            } else {
              readings.wayDown.limit = await wayDown('limit', wheelDown, parkNotch, limitPane);
              arms.h.push(`h limit: the second session's history read ${String(readings.wayDownLimit.history)} under a limit of ${String(limit)}, below the trim band from ${String(band)}, so this variant read nothing about a history at its limit`);
            }
            if (!(limit > 0 && limit <= 1000)) arms.h.push(`h limit: the second session's history-limit read ${String(limit)}, not the 1,000 set, so it was never at its limit`);
            await stopLoop(limitRow.id, limitPane);
            await cdpEval(cdp, `(window.__gmuxP95.select(${J(mySid)}), true)`, 10_000);
            for (let i = 0; i < 40; i += 1) {
              if (await cdpEval(cdp, 'window.__p292.rearm()')) break;
              await sleep(100);
            }
            await sleep(1500);
          } else {
            note('h limit: not run on another machine; the limit is set on the server this file reads');
          }
          // Back to the loop, for the arms after this one.
          await sendKeysToPane(mySid, ` ${ISSUE_LINES}\r`);
          await sleep(1500);
          // Every variant ran to its end: the next arm's armDone marks h.
          stage = 'h';
        }
        if (chosen.includes('h2')) {
          armDone(stage);
          stage = 'h2';
          // The stream: `L<n>`, 600 at once and then about 80 a second, into a
          // cleared history so every number is the only one of its kind.
          if (!(await stopLoop(mySid))) throw new Error('arm h2: the loop did not stop');
          await tmux('clear-history', '-t', paneId).catch(() => undefined);
          await sendKeysToPane(mySid, ` clear; i=0; while [ $i -lt 600 ]; do i=$((i+1)); printf 'L%s\\n' "$i"; done; while :; do i=$((i+1)); printf 'L%s\\n' "$i"; sleep 0.0125; done\r`);
          await sleep(4000);
          // Where `L1` sits in the history, from the whole transcript once.
          const dump = (await tmux('capture-pane', '-p', '-S', '-', '-E', '-', '-t', paneId)).split('\n');
          const at1 = dump.findIndex((row) => row.trim() === 'L1');
          if (at1 < 0) throw new Error('arm h2: the transcript holds no L1');
          const c = at1 - 1;
          const listed = await cdpEval(cdp, `window.gmux.sessions.list().then((l) => l.map((x) => ({ id: x.id, tmuxName: x.tmuxName })))`, 5000);
          const tmuxName = listed.find((x) => x.id === mySid)?.tmuxName;
          if (typeof tmuxName !== 'string') throw new Error('arm h2: the session has no tmux name');
          const calls = [];
          const firstNewest = await newestStream();
          const tCalls = Date.now();
          for (let i = 0; i < H2_CALLS; i += 1) {
            const h = Number((await tmux('display-message', '-p', '-t', paneId, '#{history_size}')).trim());
            const want = h - H2_BACK;
            const res = await cdpEval(cdp, `window.gmux.capture.pane(${J({ tmuxName, sessionId: mySid, historyLines: 0, range: { start: want, end: want }, join: true })}).then((r) => r.ansi)`, 10_000);
            calls.push({ want: want - c, got: streamNo(String(res ?? '').split('\n')[0]) });
          }
          const rate = r1((((await newestStream()) ?? 0) - (firstNewest ?? 0)) / ((Date.now() - tCalls) / 1000));
          const off = calls.filter((x) => x.got !== x.want).length;
          say(`h2: ${String(H2_CALLS)} copies of one line through the channel while the pane printed about ${String(rate)} lines a second: ${String(off)} came back as another line`);
          readings.copy = { calls, rate };
          // The drag that scrolls and parks, then ⌘C twenty times while the
          // pane prints. The pasteboard is his: saved whole before, put back in
          // the finally, and its flavours must agree.
          const pbDir = join(root, 'pasteboard');
          mkdirSync(pbDir, { recursive: true });
          const PB = join(root, 'pb');
          const built = spawnSync('swiftc', ['-O', '-o', PB, join(REPO, 'build', 'pasteboard-keep.swift')], { encoding: 'utf8' });
          if (built.status !== 0) throw new Error(`arm h2: the pasteboard keeper did not compile: ${String(built.stderr).slice(0, 300)}`);
          const pb = (...a) => (spawnSync(PB, a, { encoding: 'utf8' }).stdout ?? '').trim();
          const pbFlavours = (info) => info.replace(/^changeCount=\d+\n?/, '');
          const pbBefore = pb('info');
          say(`h2: pasteboard saved: ${pb('save', pbDir)}`);
          const pastes = [];
          let h2NamesFrame = true;
          try {
            await cdpEval(cdp, 'window.__p292.focusTerm()');
            const g = await cdpEval(cdp, 'window.__p292.geometry()');
            const rowH = g.screen.height / g.rows;
            const colW = g.screen.width / g.cols;
            const anchorRow = g.rows - 6;
            const yOf = (row) => g.screen.top + (row + 0.5) * rowH;
            const xOf = (col) => g.screen.left + (col + 0.5) * colW;
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xOf(12), y: yOf(anchorRow) });
            await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: xOf(12), y: yOf(anchorRow), button: 'left', buttons: 1, clickCount: 1 });
            await sleep(60);
            for (let k = 1; k <= 6; k += 1) {
              await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xOf(0), y: yOf(anchorRow - k), button: 'left', buttons: 1 });
              await sleep(40);
            }
            // Six lines from the wheel path while the button is down: the
            // buffer moves, so the drag takes the selection over as history
            // positions (drag-select.ts), and the pane is parked.
            await cdpEval(cdp, `window.gmux.scroll.by({ sessionId: ${J(mySid)}, lines: 6 }).then(() => true)`, 10_000);
            await sleep(600);
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: xOf(0), y: yOf(anchorRow - 6), button: 'left', buttons: 0, clickCount: 1 });
            await sleep(400);
            // THE FIX ROUND: whether tmux names the frame the selection is held
            // against (3.7b does, 3.6a does not), read while it is parked.
            h2NamesFrame = isNum((await fmtNow()).frame);
            for (let k = 0; k < H2_PASTES; k += 1) {
              spawnSync('pbcopy', [], { input: 'p292 sentinel' });
              const key = { key: 'c', code: 'KeyC', modifiers: 4, windowsVirtualKeyCode: 67, nativeVirtualKeyCode: 67 };
              await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...key });
              await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
              let text = 'p292 sentinel';
              for (let w = 0; w < 60 && text === 'p292 sentinel'; w += 1) {
                await sleep(100);
                text = spawnSync('pbpaste', [], { encoding: 'utf8' }).stdout ?? '';
              }
              const highlighted = await cdpEval(cdp, 'window.__p292.highlighted()');
              pastes.push({ pasted: text === 'p292 sentinel' ? null : text.split('\n'), highlighted: typeof highlighted === 'string' ? highlighted.split('\n') : null });
              await sleep(300);
            }
          } finally {
            say(`h2: pasteboard restored: ${pb('restore', pbDir)}`);
            const pbAfter = pb('info');
            const same = pbFlavours(pbBefore) === pbFlavours(pbAfter);
            if (!same) arms.h2.push('h2 the pasteboard after the restore is not the pasteboard before');
          }
          readings.copy.pastes = pastes;
          readings.copy.namesFrame = h2NamesFrame;
          const wrong = pastes.filter((x) => pasteVerdict(x) !== null).length;
          say(`h2: ${String(pastes.length)} ⌘C while the pane printed: ${String(wrong)} put something other than the held range on the pasteboard (${String(new Set(pastes.map((x) => J(x.pasted))).size)} distinct)`);
          if (!h2NamesFrame) note(`h2: tmux does not name the frame's depth, so the range the renderer holds is its own estimate of the frame; the ⌘C reading above is printed and compared with the parent's, not graded (Phase 292's limit there, D294-6's twin)`);
          arms.h2.push(...copyFindings(calls, pastes, { heldRange: h2NamesFrame }));
          // Back to the issue's loop for the arms after this one.
          await stopLoop(mySid);
          await tmux('clear-history', '-t', paneId).catch(() => undefined);
          await sendKeysToPane(mySid, ` clear; ${ISSUE_LINES}\r`);
          await sleep(1500);
        }

        // --------------------------------------------------------------- g
        // SOFT-WRAPPED LINES ACROSS A WIDTH CHANGE, on a quiet pane, so the
        // resize is the only thing that can move the reader. Last, because it
        // stops the loop.
        if (chosen.includes('g')) {
          armDone(stage);
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
        armDone(stage);
        stage = 'done';
      } catch (err) {
        // A stage that threw is a finding of THIS run, named by its stage; the
        // finally below still ends the session the drive made and the helper
        // still ends the tree.
        if (MACHINE !== '' && err?.couldNotPark === true) {
          for (const arm of chosen) arms[arm].push(`${arm} could not park on another machine: ${err.message}`);
        } else {
          arms.RUN.push(`the run stopped during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        // What the app itself wrote, beside the readings: when an arm reads a
        // pane that left copy mode by itself, main's own log is where the
        // reason is, and it is gone once the helper ends the tree.
        try {
          writeFileSync(join(outDir, MACHINE === '' ? `app-${tag}-${readerVersion}.log` : `app-${tag}-${MACHINE}-${String(farVersion)}.log`), handle.text());
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
  if (MACHINE !== '') endFar();
}

// PHASE 366'S PROBE REVIEW: a crash of any of the app's processes is a finding of the run,
// read once the helper has ended the tree, by name only; no dump is opened here.
readings.crashpad = crashpadOf(profile);
arms.RUN.push(...crashFindings(readings.crashpad));

// -- the report -------------------------------------------------------------
const readingsPath = join(outDir, MACHINE === '' ? `readings-${tag}-${readerVersion}.json` : `readings-${tag}-${MACHINE}-${String(farVersion)}.json`);
writeFileSync(readingsPath, `${J({ arms, readings })}\n`);
say('');
say(`arm   ${tag.toUpperCase()} on tmux ${String(readings.serverVersion ?? readerVersion)}`);
const summary = armSummary(chosen, armsDone, arms);
for (const [arm, verdict] of summary) say(`${arm.padEnd(5)} ${verdict}`);
readings.summary = summary;
const notRun = summary.filter(([, v]) => v.startsWith('not run')).map(([a]) => a);
if (notRun.length > 0 && arms.RUN.length === 0) arms.RUN.push(`arm(s) ${notRun.join(', ')} did not run to their end, so nothing they would have graded was read`);
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
