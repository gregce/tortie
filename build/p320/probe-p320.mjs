#!/usr/bin/env node
/**
 * probe-p320.mjs. THE PHASE 320 APP RUN, EXTENDED BY PHASE 320.1: the wheel
 * reaches a program on another machine that asked for it (Phase 320), and a
 * session on another machine scrolls like one on this Mac, typing included
 * (Phase 320.1, build/p3201/SPEC.md §7).
 *
 * GitHub issue 31 (Jake Levirne): "Expect it to scroll just like a local session
 * does. Instead, nothing scrolls." Phase 320 gave the wheel to a far program
 * that asked for the mouse. Phase 320.1 runs this Mac's own scroll over each
 * machine's control connection, through one closed door of six command shapes,
 * and rebuilds the typing half Phase 320 removed under the operator's
 * no-regression rule (P2 and P3), with the reverifier's fast-flick shape (M3) as
 * its ruler.
 *
 * ONE Electron through build/electron-run.mjs's `withElectron`, on a scratch
 * profile, a scratch HOME and the tmux socket build/harness-socket.mjs hands
 * it, over one local scratch project and ONE far machine: the LOOPBACK scratch
 * machine build/with-scratch-machine.mjs starts around this file (its own sshd
 * on 127.0.0.1, its own keys and agent, its own TMUX_TMPDIR), or, with
 * `P320_FAR=real`, the operator's own machine through
 * build/p3201/real-machine.mjs (verifiers only). REAL wheel events and REAL keys
 * go in over the DevTools protocol, and the rulers are the programs themselves.
 *
 * ## The stand-ins, and why the program is the ruler
 *
 * Both are in this directory and both are started by typing one line into a
 * session's shell, so neither is a child of this file.
 *
 *   build/p320/fullscreen.mjs  Claude Code's fullscreen renderer as research
 *                              130 §2.2 read it: the alternate screen, Claude's
 *                              own clear, 5,000 lines in its own memory, the
 *                              mouse asked for as `any` or not at all. It LOGS
 *                              every chunk it reads and the top line it draws.
 *   build/p320/recorder.mjs    A raw-mode program on the normal screen that
 *                              logs every byte typed into it; `--history <n>`
 *                              prints n numbered lines first so the pane has a
 *                              history to scroll back through.
 *
 * On the real machine with no node, the ruler is `stty raw -echo; cat > <the
 * run's directory>/logs/typed.txt`, and the report says so.
 *
 * ## PHASE 320.1's SECOND BUILD (build/p3201/SPEC.md §9, D13)
 *
 * The first attempt's reverify found this probe's own defects, and they are
 * repaired before its readings are believed: THE REMOTE ARMS RUN FIRST, before
 * any arm touches this Mac's project, because R3 after R3L found the local
 * project showing and could never start its stand-in; R3 re-opens the remote
 * project before it shows its session; and EVERY ARM AFTER A STAGE THAT THREW
 * PRINTS `not run`, never PASS (the old summary printed PASS for T1 to T5, C1
 * and A1 that never ran). T2 is graded against the lines the SAME flick moves
 * on this Mac in the same invocation (60 for 30 events at both builds, not the
 * 30 the old grader wanted), and C1 derives the rows a copy must hold with the
 * SHIPPING `clampHistoryRange` (build/p320/clamp.mts) from a PHYSICAL dump of
 * the far pane: the old grader indexed a `-J` dump, in which a wrapped command
 * line above the history is one row where the pane has two, which is the
 * reverify's unexplained one-row offset (measured for this build: `line 128`
 * sits at row 129 of the joined dump and row 130 of the physical one).
 *
 * The far machine's shell is QUIET (D12): the loopback machine runs with
 * SCRATCH_MACHINE_QUIET_SHELL=1 (its ZDOTDIR is proved before a session is
 * made), the real machine through build/p3201/real-machine.mjs's wrapper and
 * proof, and his three dotfiles, size and modified time only, are read before
 * and after on whichever computer the far shell ran on; a change fails the run.
 *
 * ## The arms (P320_ARMS, a comma separated subset; all but A2 by default)
 *
 * In the order they run: every remote arm, then every arm on this Mac.
 *
 *   R1  THE REPORTER'S CASE, AS A WAIT SWEEP (the second build): a REMOTE
 *       `--toggle` stand-in at rest takes the alternate screen and asks for the
 *       mouse on one byte the probe sends to its pane on the far scratch server
 *       (never through the app), and 10 wheel notches follow W ∈ {0, 100, 250,
 *       500, 1,000, 1,500} ms after, 5 runs each. Read: the reports that reached
 *       the program, and the far pane's `#{pane_in_mode}` after a 1 s settle
 *       with the program still holding the mouse. Graded in the run: 0 runs
 *       left in copy mode over a program that asked, and every notch at W ≥
 *       1,000 ms (Phase 320's own claim). Graded by `--compare`: the reports at
 *       every W at least the parent's, pooled. The first attempt read 0 of 20
 *       for about a second after the program asked, and a pane stuck in copy
 *       mode after it (loopback 3.6a and 3.7b, his Mac Pro on 3.7c).
 *   R7  THE PROGRAM LETS GO: the stand-in holds, the reads have caught up, then
 *       it gives the mouse back and leaves its alternate screen, and 10 notches
 *       follow W ∈ {0, 100, 250, 500} ms after, 5 runs each. Graded: 0 arrow-key
 *       bytes (`1b5b41`, `1b4f41`, `1b5b42`, `1b4f42`) reach it, and by
 *       `--compare` at most the parent's.
 *   R1L, R7L  The same two on THIS Mac, graded by `--compare` against the parent
 *       (D1 applies here too: the local race was 0 of 60 at both builds).
 *   R2  REGRADED BY 320.1. 20 notches over a REMOTE plain shell, then over the
 *       recorder in that session: the pane PARKS (the far tmux reads copy mode
 *       and a position above 0), 0 bytes reach the program, no scroll error
 *       line is printed, and the next key takes the pane back to live and is
 *       itself delivered. Red at 320.1's parent (nothing parks).
 *   R3  REGRADED BY 320.1's FIX ROUND. 20 notches over a REMOTE `--mouse
 *       none` alternate-screen stand-in (`less`, a vim with no mouse, and the
 *       shape of Codex 0.158's full screen view) deliver NOTHING to it, which
 *       is today's swallow. The second build graded it equal to R3L and typed
 *       one cursor key a notch into it, which walks Codex's prompt history and
 *       an approval's highlight (both verifiers: 25 of 25 notches against the
 *       parent's 0); that route is removed for a pane on another machine. Green
 *       at the parent: 0 bytes.
 *   R3L The control for R3: the same stand-in, on THIS Mac. It receives the
 *       alternate-scroll keys xterm sends for it, which is how it scrolls here,
 *       unchanged.
 *   R5  REGRADED BY 320.2: THE READ LAST LINES WINDOW IS GONE, everywhere (his
 *       ruling of 2026-09-30). The band above a remote session draws no
 *       read-back control in either orientation (320.1's clause, unchanged).
 *       Then the session's right-click menu is read AS MAIN BUILT IT: over
 *       main's inspector (`--inspect=0`), `Menu.prototype.popup` is replaced by
 *       a recorder that opens nothing and closes at once, and a REAL right-click
 *       goes in over DevTools, on the remote plain shell `p320-sh` in the remote
 *       group and on a session on this Mac in the FIRST block of this Mac's
 *       arms, so R5 has two parts. Graded once both are read: no row of either
 *       menu, nor of the application menu (`Open Recent`'s rows left out), says
 *       Read Last Lines; the remote rows are this Mac's less the two history
 *       presets with Clear disabled, every `Scrollback …` row and every Read
 *       Last Lines row left out of both first, because main draws the
 *       scrollback row for a session on this Mac alone; the old harness knob
 *       opens no window; the bridge has no `readSessionLines`; main has no
 *       invoke handler for `machines:readSessionLines`, asked through
 *       `ipcMain.handle` with `machines:listFiles` as the control; and the
 *       built `out/{renderer/assets,preload,main}` name none of
 *       `openRemoteLines`, `remote-lines-modal` and the channel, which is the
 *       store action's half, because the page exposes no store a probe can
 *       call. Each half opens and closes its own main inspector session. Red at
 *       320.2's parent on exactly its five window clauses.
 *   R6  The local fullscreen control, unchanged.
 *   T6  THE BYTES A KEY IS (the second build, D7), remote only: a recorder that
 *       asked for application cursor keys; a, é, 日本, 😀, Enter, Backspace,
 *       Tab, Escape, Ctrl-C and Alt-b each typed once over the LIVE pane (the
 *       attach carries them) and once over a PARKED one (at HEAD the control
 *       connection carries them, behind a cancel). Graded: the parked bytes are
 *       the live bytes, byte for byte. The Up arrow is printed beside them and
 *       not graded: typed as the first key over a program in application
 *       cursor mode it arrives as `ESC [ A` rather than `ESC O A`, D7's stated
 *       limit.
 *   T1  THE RULER, the reverifier's M3 shape: 50 one-line wheel events 16 ms
 *       apart, "fix the bug" typed from 100 ms at 35 ms a key, over the
 *       recorder. Read per run: characters lost (LCS against the typed text)
 *       and LEFT OPEN (a tmux prompt on the terminal's last row, a mode that is
 *       not copy mode, or stacked modes). `#{pane_in_mode}` after the settle is
 *       printed beside it and NOT graded, because the flick outlasts the typing
 *       by about 330 ms and parks the pane on both builds by design; the rig
 *       measured that on 3.6a and 3.7b (see the Phase 320.1 report). Remote:
 *       graded in the run, 0 lost and 0 left open. Local: a reading, graded
 *       against the parent by `--compare` (below), pooled with Fisher's exact
 *       test. P320_T1_RUNS runs (40 by default; 20 on the real machine). At
 *       HEAD a remote key typed into a moving flick takes the control
 *       connection (D6), so no fence is between it and the scroll.
 *   T2  A SWIPE BEGUN RIGHT AFTER A KEY: one key, then 30 one-line events 16
 *       ms apart starting G ∈ {0, 40, 100} ms after it, 10 runs each. Read: the
 *       key delivered, the lines moved (tmux's own position), and the delay to
 *       the first moved line (the terminal's top row, watched in the page).
 *       Remote, REGRADED by the second build: every key delivered; the lines
 *       within one of what the same flick moves on this Mac in this invocation
 *       (P320_WHERE=both; with remote alone the lines are printed); and the
 *       first moved line no later than ROAD_QUIET_MS (200) + 16 + twice the
 *       slowest carriage round trip read in the run + 50 ms, D6's bound (a
 *       scroll begun within 200 ms of a key on a remote session starts up to
 *       200 ms later). Local: compared with the parent.
 *   T3  A KEY OVER A PARKED SESSION, THEN THE SESSION LEFT: parked 100 back,
 *       `x` typed, another session selected δ ∈ {0, 0.5, 5, 25, 80} ms after
 *       the key comes up, 10 runs each. Read: delivered. Remote: graded, every
 *       key. Local: compared with the parent.
 *   T4  MODES: clock, tree and options mode entered by the probe on the
 *       scratch server, "bc" typed. Read: the bytes delivered, the time to each.
 *       Compared with the parent.
 *   T5  THE CARRIAGE DROPPED WHILE PARKED (remote only): parked, then the far
 *       scratch server's `detach-client -s gmux-control` (NEVER a SIGKILL of a
 *       `-C` client, research 131 §3.5), "fix" typed during the outage.
 *       REGRADED by the second build (§3 item 4): the first spec's claim of
 *       in-order delivery through an outage failed at BOTH builds and is
 *       struck, so this arm is graded against the parent only, by `--compare`
 *       (HEAD delivers at least what the parent did). One run with the outage
 *       held 15 s is printed and not graded.
 *   C1  THE COPY COMES FROM THE MACHINE (a hostile fixture): a LOCAL session
 *       on this Mac's harness server carrying the remote session's far name
 *       and different text; on the parked remote pane, a drag-select across
 *       the screen's top edge and ⌘C. The copy is read by patching the MAIN
 *       process's `clipboard.write` over its inspector for the length of the
 *       arm, so the person's own pasteboard is never read or written. Graded:
 *       byte equal to `capture-pane -p -J -S a -E b` read from the far scratch
 *       server for the rows it holds, and none of the local text.
 *   A1  `$N` REUSE: the far scratch server ended by its own pid under a parked
 *       remote pane, a new server started on the same scratch socket with
 *       foreign sessions (never Tortie's) up to that `$N`; 20 wheel notches
 *       and 60 s of polls over the old pane: no foreign session ever enters a
 *       mode. Run last among the remote arms, because it ends the far server.
 *   A2  AN UNMEASURED VERSION, and it runs ALONE: the machine's
 *       `remoteTmuxPath` is build/p3201/version-mask.sh reporting 3.5a and
 *       running the real tmux otherwise, accepted on the confirm sheet. The
 *       machine keeps NO_PANE_HERE (the drive's read says so), R1's
 *       fullscreen still scrolls, and a plain shell's wheel is swallowed and
 *       parks nothing: byte for byte as at the parent.
 *
 *   There is no R4 (removed with Phase 320's P2 and P3, and the name is not
 *   reused, so an old reading never passes for a new one).
 *
 * `P320_WHERE=local|remote|both` (both by default) chooses where T1 to T4 run.
 * The real machine allows R1 and R7 (node is found by path there), T1, T2, T3
 * and T6, beside any arm of this Mac, with P320_WHERE remote or both.
 *
 * THE SUMMARY names every arm: PASS or FAIL n when every part of it ran,
 * `not run` when any part did not (a stage threw first, or the far machine
 * could not run it), and `not asked` when P320_ARMS left it out.
 *
 * ## Another checkout, which is how the parent is measured
 *
 * `P320_CHECKOUT=<a BUILT worktree>` points THIS run at that checkout's `out/`
 * with this file's stand-ins and graders, one Electron, never beside another
 * run: two builds are two invocations. The local T1 blocks alternate builds,
 * 20 runs an invocation (`P320_T1_RUNS=20`), HEAD, parent, HEAD, parent.
 * Expected at 320.1's parent: R1, R3L, R6, A1 and A2 pass; R2, R3, R5, C1 and
 * the remote T2 fail (nothing on a machine parks, and the band still draws its
 * control); the remote T1, T3 and T5 read 0 lost, which is the bar HEAD must
 * equal (build/p3201/SPEC.md D18). Expected at 320.2's parent (`d9f98b54`), with
 * `P320_ARMS=R5,R2`: R5 FAILS on its five window clauses (the row in the remote
 * menu, the window the knob opens, the bridge member, main's handler and the
 * built bundle) and on nothing else, the menu equality included, and R2 passes
 * (build/p3202/SPEC.md §9.2). `--compare` then grades R5X: this Mac's menu byte
 * for byte, the remote menu the parent's less exactly its one Read Last Lines
 * row, no scrollback row on the remote menu at either build, the application
 * menus equal, and the bundle counts zero at HEAD and above zero at the parent.
 *
 *   node build/p320/probe-p320.mjs --compare --head <a.json,c.json> --parent <b.json,d.json>
 *
 * reads the readings of both builds and grades what spans them: local T1
 * pooled (HEAD's characters lost and left open each at most the parent's, with
 * Fisher's exact test one-sided and two-sided), local T2 (HEAD within one line
 * of the parent at every G), local T3 (HEAD delivers at least what the parent
 * did at every δ) and T4 (the same bytes); and since the second build R1 and
 * R1L (HEAD's reports at least the parent's at every W, pooled), R7 and R7L
 * (HEAD's arrow keys at most the parent's), the remote T3 and T4 (at least the
 * parent's) and T5 (HEAD delivers at least what the parent did). It says when
 * the pooled first 40 read HEAD above the parent, which is when the second 40
 * is owed.
 *
 * ## The five hidden agents (Phase 320.2, build/p3202/SPEC.md D9)
 *
 * This run launches with `GMUX_PROBES`, which version-probes every agent the
 * detection scan resolves, and gemini, qwen, agy, grok and droid are never
 * started. So before the launch the checkout's OWN overlay parser is asked
 * (`hiddenAgentsPrecheck`, build/hidden-agents.mjs) and a scratch
 * `<profile>/gmux/config/agents.json` renames the five; after the page load
 * and before any arm the app's own `agents:list` is read back, and a scan that
 * resolved any of them ends the run UNREADABLE, exit 2, before an arm runs.
 *
 * ## What it refuses
 *
 *   - No `GMUX_TMUX_SOCKET`, the sockets `gmux` and `default` by name, and any
 *     socket that is not a `gmux-p320` harness socket. No `GMUX_HARNESS_DIR`.
 *   - A remote arm with no carriage file from build/with-scratch-machine.mjs
 *     (loopback), or with a refusal from build/p3201/real-machine.mjs (real).
 *   - `out/main/index.js` missing, or a STALE `out/`.
 *   - A2 beside any other remote arm; on the real machine, any remote arm
 *     but R1, R7, T1, T2, T3 and T6, and P320_WHERE=local.
 *   - On the loopback machine, a far shell that is not the quiet one (its
 *     ZDOTDIR not the yard's own), before any session is made there.
 *   - A checkout whose own overlay parser does not hide the five agents, before
 *     the launch; and an app whose scan resolved one, before any arm (exit 2).
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET, GMUX_HARNESS_DIR, GMUX_CONFIG_ROOT, GMUX_TMUX_BIN as
 *   before. P320_FAR_TMUX, the loopback machine's tmux (3.6a by default, the
 *   vendored 3.7b by path). P320_FAR=loopback|real. The real machine reads
 *   P3201_REAL_HOST, P3201_REAL_USER, P3201_REAL_TMUX, P3201_REAL_ACK=p3201,
 *   SSH_AUTH_SOCK (a scratch agent holding his key, loaded BY PATH) and, where
 *   node is not beside that tmux, P3201_REAL_NODE (build/p3201/real-machine.mjs).
 *   SCRATCH_MACHINE_QUIET_SHELL=1, which the package script sets for the
 *   loopback machine. P320_CHECKOUT, P320_ARMS, P320_WHERE, P320_T1_RUNS,
 *   P320_OUT_DIR.
 *
 * ## Usage, from the worktree root. BUILD FIRST.
 *
 *   npm run build && npm run probe:p320                    HEAD, every arm but A2
 *   P320_ARMS=A2 npm run -s probe:p320                     the unmeasured version
 *   P320_FAR_TMUX=$PWD/build/vendor/tmux/bin/tmux npm run -s probe:p320
 *   P320_CHECKOUT=/path/to/parent npm run -s probe:p320    the parent, built
 *   node build/p320/probe-p320.mjs --self-test             the graders alone
 *
 * ## SAFETY
 *
 * The one Electron is started through `withElectron`, which ends the tree it
 * started and the local scratch tmux server it was handed in a `finally`. The
 * loopback machine's sshd, agent and tmux server belong to
 * build/with-scratch-machine.mjs; this file's `finally` and its `exit` handler
 * end the far tmux server once more by the pid it reports. On the real machine
 * build/p3201/real-machine.mjs's `close()` runs in the `finally`: both ssh
 * masters ended, the far scratch server ended by its pid, the run's directory
 * removed and his server's session count read a second time, which must equal
 * the first. The stand-ins are typed into panes and end with those servers.
 * Every process this file starts itself is a synchronous tmux read, an ssh
 * through build/ssh-run.mjs, or the one ssh-keyscan, each of which has exited
 * before the call returns. It spawns no agent, spends no token, never names `-L
 * gmux` (but for the real machine's one count, which is that file's), never the
 * default server, never pkill or kill-server, and NEVER signals a `-C` client.
 * A1 ends the far SCRATCH server by its pid, which is a server and not a client.
 */
import { spawnSync } from 'node:child_process';
import {
  accessSync,
  chmodSync,
  copyFileSync,
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
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { tsxCli } from '../ts-runner.mjs';
// Phase 320.2 (D9): the five agents a GMUX_PROBES launch must never start.
import * as hidden from '../hidden-agents.mjs';
import {
  controlEntries,
  dotfilesMoved,
  dotfilesSentence,
  localCensus,
  machineRow,
  openRealMachine,
  realMachineFromEnv
} from '../p3201/real-machine.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HERE = dirname(fileURLToPath(import.meta.url));
const TAG = '[p320]';
const CALLER = 'build/p320/probe-p320.mjs';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The numbers this run holds the app against, BY VALUE.
// ---------------------------------------------------------------------------
/** Wheel notches per remote arm, the entry's 20. */
export const NOTCHES = 20;
/** Lines of travel in one notch, which is what a mouse notch is on this Mac. */
const NOTCH_LINES = 3;
/**
 * One notch in CSS pixels: three lines, and NEVER under 60 px. xterm 6.0.0
 * reads a pixel delta under 50 as a trackpad and scales it by 0.3 before it
 * counts lines (`CoreMouseService.consumeWheelEvent`), so a small notch would
 * send a report only some of the time and R1's "every notch arrives" would
 * read a ruler's rounding as a defect. At 60 px and over, one event is at least
 * one line and xterm sends exactly one report for it.
 */
export function notchPx(cell) {
  return Math.max(60, Math.round(cell * NOTCH_LINES));
}
/** Between two notches. More than the 16 ms coalescing window, less than a person's pause. */
const NOTCH_GAP_MS = 60;
/**
 * The band's control Phase 320.1 deleted, by value, so a build that kept it is
 * named. Not imported: a probe that read it from the source it judges would
 * agree with a wrong one. (Phase 320's deleted sentence went with the window
 * Phase 320.2 removed, and so did this file's reading of it.)
 */
export const REMOTE_ONLY_TOOLTIP = 'cannot scroll back';
/** The reverifier's M3 text (build/p320/SPEC.md item 22). */
export const TYPED = 'fix the bug';
/** M3: 50 one-line events 16 ms apart, typing from 100 ms at 35 ms a key. */
export const M3 = { events: 50, gapMs: 16, typeFromMs: 100, keyGapMs: 35, settleMs: 1000 };
/** T2's swipe: one key, then 30 one-line events 16 ms apart, G ms after it. */
export const T2_GAPS = [0, 40, 100];
export const T2_LINES = 30;
/** Longer than the run's Electron ceiling (60 minutes), so no recorder ends itself mid-arm. */
const RECORDER_MAX_MS = 90 * 60 * 1000;
/** T3's δ: from the key coming up to the other session selected. */
export const T3_DELTAS = [0, 0.5, 5, 25, 80];

/**
 * Every arm, IN THE ORDER THEY RUN (the second build, D13): every remote arm
 * first, A1 last among them because it ends the far server, then this Mac's.
 */
export const ALL_ARMS = ['R1', 'R7', 'R5', 'R3', 'R2', 'T1', 'T2', 'T3', 'T4', 'T6', 'C1', 'T5', 'A1', 'A2', 'R3L', 'R6', 'R1L', 'R7L'];
/** Every arm run by default: all but A2, which needs its own machine row and runs alone. */
export const DEFAULT_ARMS = ALL_ARMS.filter((a) => a !== 'A2');
const REMOTE_ONLY = ['R1', 'R7', 'R2', 'R3', 'R5', 'T5', 'T6', 'C1', 'A1', 'A2'];
/** The arms that run on this Mac alone, beside any far machine. */
const LOCAL_ONLY = ['R3L', 'R6', 'R1L', 'R7L'];
const TYPING = ['T1', 'T2', 'T3', 'T4'];
/**
 * What the real machine may run (build/p3201/SPEC.md §9, §16): R1 and R7 (node
 * is found by path there since the second build), T1, T2, T3 and T6, and any
 * arm of this Mac beside them.
 */
export const REAL_ARMS = ['R1', 'R7', 'T1', 'T2', 'T3', 'T6', ...LOCAL_ONLY];

/** R1's waits, from the program asking for the mouse to the first notch (§9). */
export const R1_WAITS = [0, 100, 250, 500, 1000, 1500];
/** R7's waits, from the program letting go to the first notch. */
export const R7_WAITS = [0, 100, 250, 500];
/** Runs at each wait, and notches in each run. */
export const SWEEP_RUNS = 5;
export const SWEEP_NOTCHES = 10;
/** From the last notch to the far server's reading of the pane (§9: "after a 1 s settle"). */
export const SWEEP_SETTLE_MS = 1000;
/** The wait from which every notch must reach a program that asked, Phase 320's own claim. */
export const SWEEP_EVERY_NOTCH_FROM_MS = 1000;
/** The arrow keys a wheel handed to xterm over a program that let go would type. */
export const ARROW_KEYS = ['\x1b[A', '\x1bOA', '\x1b[B', '\x1bOB'];
/** D6's quiet window, by value: a scroll begun this soon after a remote key starts later. */
export const ROAD_QUIET_MS = 200;
/**
 * T6's keys (§9): what each is and how it is typed. `text` goes in as typed
 * text (xterm's input event), `key` as a real key with its code and modifiers
 * (1 Alt, 2 Control). `graded: false` is D7's stated limit, printed.
 */
export const T6_KEYS = [
  { name: 'a', key: 'a', code: 'KeyA', vk: 65, text: 'a', graded: true },
  { name: 'é', insert: 'é', graded: true },
  { name: '日本', insert: '日本', graded: true },
  { name: '😀', insert: '😀', graded: true },
  { name: 'Enter', key: 'Enter', code: 'Enter', vk: 13, text: '\r', graded: true },
  { name: 'Backspace', key: 'Backspace', code: 'Backspace', vk: 8, graded: true },
  { name: 'Tab', key: 'Tab', code: 'Tab', vk: 9, graded: true },
  { name: 'Escape', key: 'Escape', code: 'Escape', vk: 27, graded: true },
  { name: 'Ctrl-C', key: 'c', code: 'KeyC', vk: 67, modifiers: 2, graded: true },
  // The fix round: ESC b, the bytes a meta key sends. A CDP key event with Alt
  // on this Mac composes nothing (xterm leaves Option to the OS), so the live
  // reference read empty at both builds and the row graded nothing.
  { name: 'Alt-b (ESC b)', insert: '\u001bb', graded: true },
  { name: 'Up, application cursor keys', key: 'ArrowUp', code: 'ArrowUp', vk: 38, graded: false }
];

// ---------------------------------------------------------------------------
// The graders. Pure, exported, and proved both ways under --self-test.
// ---------------------------------------------------------------------------

/**
 * Bytes a person can read: printable ASCII as is, everything else escaped.
 * DEL is escaped too (the fix round): JSON leaves it bare, so the second
 * build's T6 reading printed Backspace's `\u007f` as what looked like an empty
 * string, and the parent verifier read Backspace as empty at both builds.
 */
export function shown(text) {
  return JSON.stringify(String(text)).slice(1, -1).replace(/\x7f/g, '\\u007f');
}

/**
 * What a stand-in's log says happened AFTER `offset` records: the wheel reports
 * it read, the bytes that were not a report, and the last top line it drew.
 */
export function tally(records, offset = 0) {
  const out = { up: 0, down: 0, reports: 0, other: '', bytes: '', top: null };
  for (const r of records.slice(offset)) {
    if (r.kind === 'input') {
      out.bytes += Buffer.from(r.hex ?? '', 'hex').toString('latin1');
      for (const one of r.reports ?? []) {
        out.reports += 1;
        const base = one.b & ~(4 | 8 | 16 | 32);
        if (base === 64) out.up += 1;
        else if (base === 65) out.down += 1;
      }
      if (typeof r.other === 'string' && r.other !== '') out.other += Buffer.from(r.other, 'hex').toString('latin1');
    }
    if ((r.kind === 'state' || r.kind === 'ready') && typeof r.top === 'number') out.top = r.top;
  }
  return out;
}

/** The top line a stand-in last drew at or before `offset` records. */
export function topAt(records, offset) {
  let top = null;
  for (const r of records.slice(0, offset)) {
    if ((r.kind === 'state' || r.kind === 'ready') && typeof r.top === 'number') top = r.top;
  }
  return top;
}

/**
 * R1, and R6 as its control on this Mac. `r` is { mode, notches, topBefore,
 * after: tally }. R1's sentences say "on another machine" and "the far
 * program"; R6's say "on this Mac" and "the program".
 */
export function wheelFindings(r, arm = 'R1') {
  const out = [];
  const far = arm === 'R1' || arm === 'A2';
  const where = far ? 'on another machine' : 'on this Mac';
  const prog = far ? 'the far program' : 'the program';
  const after = r.after ?? { up: 0, down: 0, other: '', top: null };
  if (r.mode !== 'any') {
    out.push(`${arm} xterm's mouse mode over the full-screen program ${where} reads ${J(r.mode)}, not "any", so the program's request for the mouse never reached xterm`);
  }
  if (after.up === 0) {
    out.push(
      `${arm} ${String(r.notches)} wheel notches over a full-screen program ${where} reached it as 0 wheel reports and its view did not move ` +
        `(top line ${String(r.topBefore)} -> ${String(after.top)})${arm === 'R1' ? ': nothing scrolls, which is issue 31' : ''}`
    );
    return out;
  }
  if (after.up < r.notches) {
    out.push(`${arm} ${String(r.notches)} wheel notches reached ${prog} as ${String(after.up)} wheel reports, so ${String(r.notches - after.up)} were eaten on the way`);
  }
  if (!(typeof after.top === 'number' && typeof r.topBefore === 'number' && after.top < r.topBefore)) {
    out.push(`${arm} ${prog} read ${String(after.up)} wheel reports and its view did not move toward older lines (top line ${String(r.topBefore)} -> ${String(after.top)})`);
  }
  if (after.down > 0) out.push(`${arm} the wheel turned only toward older lines and ${prog} read ${String(after.down)} wheel-down reports`);
  if (after.other.length > 0) {
    out.push(`${arm} ${prog} received ${String(after.other.length)} bytes that are not mouse reports ("${shown(after.other)}"), which is the wheel typed as keys`);
  }
  return out;
}

/** A program that did not ask for the mouse receives nothing from the wheel (A2's shell, and R2's recorder). */
export function swallowFindings(arm, r) {
  const out = [];
  const bytes = r.after?.bytes ?? '';
  if (bytes.length > 0) {
    out.push(`${arm} ${String(r.notches)} wheel notches over ${r.what} reached it as ${String(bytes.length)} bytes ("${shown(bytes)}"); a program that did not ask for the mouse must receive nothing, because claude and codex read the arrow keys as history`);
  }
  if (r.mode !== undefined && r.mode !== 'none') {
    out.push(`${arm} xterm's mouse mode over ${r.what} reads ${J(r.mode)}, not "none", so this arm did not test a program that asked for nothing`);
  }
  if (r.checkTop === true && typeof r.topBefore === 'number' && typeof r.after?.top === 'number' && r.after.top !== r.topBefore) {
    out.push(`${arm} the view of ${r.what} moved (top line ${String(r.topBefore)} -> ${String(r.after.top)})`);
  }
  if (typeof r.errors === 'number' && r.errors > 0) out.push(`${arm} the wheel printed ${String(r.errors)} scroll error line(s) in the app's log`);
  return out;
}

/**
 * R2, regraded by Phase 320.1. `r` is { what, parked: { inMode, position },
 * wheelBytes, errors, key: { live, delivered, expected } }: the wheel parks the
 * pane on another machine, types nothing, prints no error, and the next key
 * takes the pane back to live and is itself delivered.
 */
export function parkFindings(r) {
  const out = [];
  const p = r.parked ?? { inMode: 0, position: 0 };
  if (!(p.inMode > 0 && p.position > 0)) {
    out.push(`R2 ${String(NOTCHES)} wheel notches over ${r.what} on another machine did not scroll it back (the far tmux reads mode ${String(p.inMode)}, position ${String(p.position)}): nothing scrolls, which is issue 31`);
  }
  if ((r.wheelBytes ?? '').length > 0) {
    out.push(`R2 the wheel over ${r.what} reached it as ${String(r.wheelBytes.length)} bytes ("${shown(r.wheelBytes)}"), which is the wheel typed as keys`);
  }
  if (typeof r.errors === 'number' && r.errors > 0) out.push(`R2 the wheel printed ${String(r.errors)} scroll error line(s) in the app's log`);
  if (r.key !== undefined && r.key !== null) {
    if (r.key.live !== true) out.push(`R2 the next key did not take ${r.what} back to live output`);
    if (r.key.delivered !== r.key.expected) out.push(`R2 the next key reached ${r.what} as ${J(r.key.delivered)}, not ${J(r.key.expected)}`);
  }
  return out;
}

/**
 * R3, the fix round: an alternate-screen program on another machine that did
 * not ask for the mouse receives NOTHING from the wheel, which is what it
 * received before this phase. One cursor key a notch is the Codex hazard.
 */
export function remoteAltFindings(remote) {
  const out = [];
  if ((remote ?? '').length > 0) {
    out.push(`R3 an alternate-screen program on another machine that did not ask for the mouse received "${shown(remote).slice(0, 120)}" (${String(remote.length)} bytes, ${String(arrowCount(remote))} cursor keys) from the wheel; today it receives nothing, and a cursor key walks Codex's prompt history`);
  }
  return out;
}

/**
 * R5, regraded by Phase 320.2 (build/p3202/SPEC.md §5.3). The two history
 * presets Phase 96 withholds from a session on another machine, the row the
 * window had, and a menu row of main's: a separator is `—`, an item its label
 * with ` [off]` when disabled, and a scrollback row is normalised to
 * `Scrollback …` because its numbers are whatever the session printed.
 */
export const R5_PRESETS = ['Capture Last 250 Lines', 'Capture Last 1,000 Lines'];
export const READ_ROW = /read last lines/i;
export const SCROLLBACK_ROW = /^Scrollback /;
/** The window's three names the built bundle is read for (the store action, the class, the channel). */
export const BUNDLE_NAMES = ['openRemoteLines', 'remote-lines-modal', 'machines:readSessionLines'];

/** Runs of separators collapsed to one. */
export function collapseSeparators(rows) {
  const out = [];
  for (const r of rows) {
    if (r === '—' && out[out.length - 1] === '—') continue;
    out.push(r);
  }
  return out;
}
/** A menu as the equality reads it: every scrollback row and every Read Last Lines row left out (§Attack A2). */
export function menuForEquality(rows) {
  return collapseSeparators(rows.filter((r) => !SCROLLBACK_ROW.test(r) && !READ_ROW.test(r)));
}
/** What a remote session's menu must read, from this Mac's: less the two presets, Clear disabled. */
export function remoteMenuWanted(localRows) {
  return collapseSeparators(menuForEquality(localRows).filter((r) => !R5_PRESETS.includes(r)).map((r) => (r === 'Clear' ? 'Clear [off]' : r)));
}

/**
 * R5's grade, once both menus are read. `r` is { notes: [top, right], menus:
 * { remote, local }, appMenu, opened, bridge, handler: { control, removed },
 * bundle: { name: count } }. At HEAD it answers nothing; at 320.2's parent it
 * answers exactly five, one per window clause, and none from the equality.
 */
export function windowFindings(r) {
  const out = [];
  for (const [which, note] of [['top', r.notes?.[0]], ['right', r.notes?.[1]]]) {
    if (note !== null && note !== undefined) {
      out.push(`R5 the band above a session on another machine still draws a read-back control in the ${which} orientation (${J(note)}); it scrolls like a session on this Mac now`);
    }
  }
  const remote = r.menus?.remote;
  const local = r.menus?.local;
  const read = Array.isArray(remote) && Array.isArray(local);
  if (!read) out.push('R5 the right-click menu was not read, so nothing about its rows is known');
  const offered = [];
  if (Array.isArray(remote) && remote.some((row) => READ_ROW.test(row))) offered.push("a remote session's right-click menu");
  if (Array.isArray(local) && local.some((row) => READ_ROW.test(row))) offered.push("this Mac's session's right-click menu");
  if (Array.isArray(r.appMenu) && r.appMenu.some((row) => READ_ROW.test(row))) offered.push('the application menu');
  if (offered.length > 0) out.push(`R5 ${offered.join(' and ')} still offers Read Last Lines, which Phase 320.2 removed everywhere`);
  if (read) {
    const want = remoteMenuWanted(local);
    const got = menuForEquality(remote);
    if (J(got) !== J(want)) {
      out.push(`R5 a remote session's right-click menu reads ${J(got)}, not this Mac's ${J(want)} (less the two history presets, Clear disabled, every Scrollback and Read Last Lines row left out of both)`);
    }
  }
  if (r.opened === true) out.push('R5 the Read Last Lines window opened through the harness knob');
  if (r.bridge === 'function') out.push('R5 the bridge still carries window.gmux.machines.readSessionLines');
  if (r.handler?.control !== true) {
    out.push(`R5 UNREADABLE: main's invoke handlers could not be asked, the control machines:listFiles read ${J(r.handler?.control ?? null)}, so the channel's absence is not proved`);
  } else if (r.handler.removed === true) {
    out.push('R5 main still registers an invoke handler for machines:readSessionLines');
  }
  const named = Object.entries(r.bundle ?? {}).filter(([, n]) => typeof n === 'number' && n > 0);
  if (r.bundle === null || r.bundle === undefined) out.push('R5 the built bundle was not read, so whether it carries the window is not known');
  else if (named.length > 0) out.push(`R5 the built bundle still names ${named.map(([k, n]) => `${k} ${String(n)} time(s)`).join(', ')}`);
  return out;
}

/** R2's shell half: the prompt row before and after the notches. */
export function promptFindings(before, after, prompt) {
  if (typeof before !== 'string' || before.trim() !== prompt) {
    return [`R2 the plain shell's line read ${J(before)} before the wheel and not the bare prompt ${J(prompt)}, so there was nothing to hold`];
  }
  if (after !== before) {
    return [`R2 ${String(NOTCHES)} wheel notches over a plain shell on another machine changed its line from ${J(before)} to ${J(after)}: the wheel was typed as keys`];
  }
  return [];
}

/** Length of the longest common subsequence of two strings. */
export function lcsLength(a, b) {
  const row = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = 0;
    for (let j = 1; j <= b.length; j += 1) {
      const up = row[j];
      row[j] = a[i - 1] === b[j - 1] ? diag + 1 : Math.max(up, row[j - 1]);
      diag = up;
    }
  }
  return row[b.length];
}

/** Characters of `typed` that did not arrive, by LCS against what did. */
export function charsLost(typed, got) {
  return typed.length - lcsLength(typed, String(got ?? ''));
}

/** A tmux prompt drawn at the start of a row: copy mode's jump, search and goto prompts, and their kin. */
export function promptOnRow(text) {
  return /^\((?:jump|search|goto|go to|copy|command|[a-z][a-z -]{1,30})\)\s?/i.test(String(text ?? '').trimStart());
}

/**
 * LEFT OPEN, as T1 grades it: a tmux prompt on the terminal's last row, a
 * mode that is not copy mode, or stacked modes. A pane merely parked in copy
 * mode by the tail of the flick is NOT left open: the flick outlasts the typing
 * by about 330 ms, so it parks the pane on both builds by design, and the next
 * key takes it back to live on both.
 */
export function leftOpen(r) {
  if (promptOnRow(r.lastRow)) return true;
  if (typeof r.paneMode === 'string' && r.paneMode !== '' && r.paneMode !== 'copy-mode') return true;
  return typeof r.inMode === 'number' && r.inMode > 1;
}

/** One T1 run as read, and the pool of many. */
export function t1Pool(rows) {
  const pool = { runs: 0, typed: 0, lost: 0, leftOpen: 0, inModeAfter: 0 };
  for (const r of rows) {
    pool.runs += 1;
    pool.typed += TYPED.length;
    pool.lost += charsLost(TYPED, r.got);
    if (leftOpen(r)) pool.leftOpen += 1;
    if ((r.inMode ?? 0) > 0) pool.inModeAfter += 1;
  }
  return pool;
}

/** The remote typing grade: the parent's reading, which is nothing lost, nothing left open. */
export function remoteTypingFindings(arm, rows, expectKey) {
  const out = [];
  for (const [i, r] of rows.entries()) {
    const typed = r.typed ?? TYPED;
    const lost = charsLost(typed, r.got);
    if (lost > 0) out.push(`${arm} run ${String(i + 1)} lost ${String(lost)} of ${String(typed.length)} characters on another machine (typed ${J(typed)}, received ${J(r.got)}); a remote session lost none at the parent, because it never parked`);
    else if (expectKey !== false && r.got !== typed) out.push(`${arm} run ${String(i + 1)} received ${J(r.got)} where ${J(typed)} was typed`);
    if (arm === 'T1' && leftOpen(r)) out.push(`${arm} run ${String(i + 1)} left a prompt or a mode open on another machine (${J(r.lastRow)}, mode ${J(r.paneMode)})`);
  }
  return out;
}

/** The mean of the lines one list of T2 rows moved at one G, or null. */
function linesAt(rows, gap) {
  const g = (rows ?? []).filter((r) => r.gap === gap);
  return g.length === 0 ? null : g.reduce((n, r) => n + r.lines, 0) / g.length;
}

/** D6's bound on T2's first moved line, from the slowest carriage round trip read in the run. */
export function firstMoveBoundMs(slowestRttMs) {
  return ROAD_QUIET_MS + 16 + 2 * slowestRttMs + 50;
}

/**
 * T2 on another machine, REGRADED by the second build (D13): every key
 * delivered; the lines within one of what the SAME flick moved on this Mac in
 * this invocation (`localRows`; null when this Mac's was not read, and then
 * the lines are printed, not graded); and the first moved line within D6's
 * bound. The first attempt graded 30 lines where the flick moves 60 on both
 * builds, and read its own ruler as 30 findings a run.
 */
export function swipeFindings(rows, localRows, slowestRttMs) {
  const out = [];
  for (const [i, r] of rows.entries()) {
    const at = `T2 run ${String(i + 1)}, a swipe begun ${String(r.gap)} ms after a key on another machine`;
    if (r.delivered !== true) out.push(`${at}: the key arrived as ${J(r.got ?? null)}, not "x"`);
    const here = localRows === null ? null : linesAt(localRows, r.gap);
    if (here !== null && Math.abs(r.lines - here) > 1) out.push(`${at}: moved ${String(r.lines)} lines where the same flick moved ${here.toFixed(1)} on this Mac`);
    const bound = typeof slowestRttMs === 'number' ? firstMoveBoundMs(slowestRttMs) : null;
    if (r.firstMovedMs === null || r.firstMovedMs === undefined) out.push(`${at}: the terminal's top row never moved`);
    else if (bound !== null && r.firstMovedMs > bound) out.push(`${at}: its first line moved after ${String(r.firstMovedMs)} ms, past D6's bound of ${String(Math.round(bound))} ms`);
  }
  return out;
}

/**
 * T5, REGRADED by the second build (§3 item 4): the first spec's in-order
 * claim failed at both builds and is struck, so nothing is graded in the run;
 * `--compare` holds HEAD's deliveries at least the parent's. This names only
 * a run that could not be read at all.
 */
export function outageFindings(r) {
  const out = [];
  if (r.parked === true && !(r.backAt > 0)) out.push('T5 the connection never came back within the wait, so the run read nothing');
  return out;
}

/**
 * The rows a copy must hold, derived as the shipping code derives them
 * (the second build, D13). `physical` is the far pane's history and screen
 * dumped WITHOUT `-J`, one row per terminal row, which is the buffer's own
 * line numbering; `rows` the copied rows. Answers the range in that numbering,
 * or null when the first copied row is not a row of the pane. A `-J` dump
 * joins a wrapped row with the next, so an index into it is one short per
 * wrapped row above (the reverify's unexplained offset).
 */
export function copiedRange(physical, rows) {
  if (rows.length === 0) return null;
  const at = physical.findIndex((l) => l.trimEnd() === rows[0]);
  return at < 0 ? null : { start: at, end: at + rows.length - 1 };
}

/**
 * C1, the fix round: where the copied rows sit among the far pane's OWN rows,
 * read in one `capture-pane -p -J -S - -E -` (the join the shipping copy uses),
 * as the index of the first of a CONTIGUOUS run equal to them, or null. The
 * second build's grader mapped a physical index to a tmux line through a
 * separately read `#{history_size}` and landed one row early at BOTH builds
 * (the parent verifier: the copy `line 128..201`, its capture `line 127..200`;
 * at the parent `line 259` against `line 258`), so the grade no longer rests on
 * that arithmetic: it asks the far pane's own text whether the copy is a run of
 * its rows. The shipping clamp's answer is still printed beside it.
 */
export function farRunOf(joined, rows) {
  if (rows.length === 0) return null;
  const want = rows.map((l) => l.trimEnd());
  const have = joined.map((l) => l.trimEnd());
  for (let i = 0; i + want.length <= have.length; i += 1) {
    let ok = true;
    for (let k = 0; k < want.length; k += 1) {
      if (have[i + k] !== want[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return { start: i, text: want.join('\n') };
  }
  return null;
}

/** C1: the copy is a run of the machine's own rows, byte for byte, and none of this Mac's same-named session. */
export function copyFindings(r) {
  const out = [];
  if (typeof r.copied !== 'string' || r.copied.length === 0) return ['C1 the copy wrote nothing, so where it came from was not read'];
  if (r.copied.includes(r.localMarker)) out.push(`C1 the copy of a session on another machine holds this Mac's same-named session's text (${J(r.localMarker)}): it was read from the wrong server`);
  if (r.far === null || r.far === undefined) out.push('C1 the copied rows are not a run of the far pane\'s own rows');
  else if (r.copied !== r.far) out.push(`C1 the copy (${String(r.copied.length)} bytes) is not byte equal to the run of the far pane's own rows it was found at (${String(r.far.length)} bytes)`);
  if (!(r.rows > r.screenRows)) out.push(`C1 the selection held ${String(r.rows)} rows, not more than the ${String(r.screenRows)} on screen, so it did not reach across the edge into the history`);
  return out;
}

/** How many arrow keys a byte string holds. */
export function arrowCount(bytes) {
  let n = 0;
  for (const arrow of ARROW_KEYS) n += String(bytes ?? '').split(arrow).length - 1;
  return n;
}

/**
 * R1 and R1L (the wait sweep): a pane never left in copy mode over a program
 * that asked for the mouse, and every notch at W >= 1,000 ms. `arm` is R1 or
 * R1L. A run whose stand-in never took the mouse measured nothing and says so.
 */
export function sweepFindings(arm, rows) {
  const out = [];
  const where = arm === 'R1' ? 'on another machine' : 'on this Mac';
  for (const r of rows) {
    const at = `${arm} W ${String(r.wait)} ms run ${String(r.run)}`;
    if (r.took !== true) {
      out.push(`${at}: the stand-in ${where} never took the mouse, so the run measured nothing`);
      continue;
    }
    if (r.parkedAfter === true) {
      out.push(`${at}: the pane was left in copy mode over a program ${where} that had asked for the mouse, so its wheel is stuck in tmux (${String(r.reports)} of ${String(r.notches)} notches reached it)`);
    }
    if (r.wait >= SWEEP_EVERY_NOTCH_FROM_MS && r.reports < r.notches) {
      out.push(`${at}: ${String(r.reports)} of ${String(r.notches)} notches reached a program ${where} that asked for the mouse ${String(r.wait)} ms before`);
    }
  }
  if (rows.length === 0) out.push(`${arm} read no run`);
  return out;
}

/** R7 and R7L: no arrow key reaches a program that let go of the mouse. */
export function letGoFindings(arm, rows) {
  const out = [];
  const where = arm === 'R7' ? 'on another machine' : 'on this Mac';
  for (const r of rows) {
    const at = `${arm} W ${String(r.wait)} ms run ${String(r.run)}`;
    if (r.gave !== true) out.push(`${at}: the stand-in ${where} never gave the mouse back, so the run measured nothing`);
    else if (r.arrows > 0) out.push(`${at}: ${String(r.arrows)} arrow key(s) reached a program ${where} that had just let go of the mouse ("${shown(r.bytes ?? '').slice(0, 80)}"), which is the wheel typed as keys`);
  }
  if (rows.length === 0) out.push(`${arm} read no run`);
  return out;
}

/** T6: every graded key reaches a parked pane as the bytes it reaches a live one. */
export function keysFindings(rows) {
  const out = [];
  for (const r of rows) {
    if (r.graded !== true) continue;
    if ((r.live ?? '') === '') out.push(`T6 ${r.name} reached the live pane as nothing, so there is nothing to compare`);
    else if (r.parked !== r.live) out.push(`T6 ${r.name} reached a scrolled-back pane on another machine as "${shown(r.parked ?? '')}" where the live pane receives "${shown(r.live)}"`);
  }
  if (rows.length === 0) out.push('T6 read no key');
  return out;
}

/**
 * The parts each chosen arm is made of: a typing arm runs once per place,
 * every other arm once, where it runs. An arm is PASS or FAIL only when
 * every part of it ran.
 */
export function planParts(chosen, { local, remote }) {
  const plan = {};
  for (const arm of chosen) {
    if (TYPING.includes(arm)) plan[arm] = [...(remote ? ['remote'] : []), ...(local ? ['local'] : [])];
    // Phase 320.2: R5 reads a remote session's menu in the remote group and a
    // session on this Mac's after it, which needs no flag (this Mac is always there).
    else if (arm === 'R5') plan[arm] = ['remote', 'local'];
    else if (LOCAL_ONLY.includes(arm)) plan[arm] = ['local'];
    else plan[arm] = ['remote'];
  }
  return plan;
}

/**
 * THE SUMMARY (D13): one line an arm. `not asked` for an arm P320_ARMS left
 * out; `not run` for an arm any part of which did not finish, a stage that
 * threw first among the causes, and never PASS; otherwise PASS or FAIL n.
 */
export function summaryRows(plan, done, findings) {
  return [...ALL_ARMS, 'RUN'].map((arm) => {
    const n = (findings[arm] ?? []).length;
    if (arm === 'RUN') return [arm, n === 0 ? 'PASS' : `FAIL ${String(n)}`];
    const parts = plan[arm];
    if (parts === undefined) return [arm, 'not asked'];
    const finished = parts.every((part) => done.has(`${arm}:${part}`));
    if (!finished) return [arm, `not run${n > 0 ? ` (and ${String(n)} finding(s) before it stopped)` : ''}`];
    return [arm, n === 0 ? 'PASS' : `FAIL ${String(n)}`];
  });
}

/** A1: no foreign session on the restarted far server ever entered a mode. */
export function reuseFindings(r) {
  const out = [];
  if (!(r.foreign > 0)) out.push('A1 no foreign session was made on the restarted server, so the reuse was not tested');
  if (r.reused !== true) out.push(`A1 the old pane's ${String(r.oldId)} was not reused by a foreign session, so the reuse was not tested`);
  for (const hit of r.inMode ?? []) out.push(`A1 the foreign session ${hit.id} entered a mode ${String(hit.afterMs)} ms in: a scroll meant for the old pane reached somebody else's`);
  return out;
}

/** A2: the machine answers NO_PANE_HERE, its fullscreen scrolls, and a plain shell's wheel is swallowed. */
export function unmeasuredFindings(r) {
  const out = [];
  const s = r.read ?? {};
  if (s.hasPane !== false || s.unreachable === true) out.push(`A2 a machine on an unmeasured tmux answered ${J({ hasPane: s.hasPane, unreachable: s.unreachable })}, not NO_PANE_HERE: it must have no live connection this run`);
  out.push(...wheelFindings(r.fullscreen, 'A2'));
  out.push(...swallowFindings('A2', r.shell));
  if ((r.shell?.parked?.inMode ?? 0) > 0) out.push('A2 the plain shell on an unmeasured tmux entered copy mode under the wheel');
  return out;
}

/** The P320_ARMS subset, or every default arm; an unknown name is a refusal. */
export function chooseArms(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { arms: [...DEFAULT_ARMS], bad: [] };
  const names = text.split(',').map((s) => s.trim().toUpperCase()).filter((s) => s !== '');
  const bad = names.filter((n) => !ALL_ARMS.includes(n));
  return { arms: ALL_ARMS.filter((a) => names.includes(a)), bad };
}

/** The refusal for a combination of arms, or null. */
export function armsRefusal(arms, far) {
  if (arms.includes('A2') && arms.some((a) => a !== 'A2' && (REMOTE_ONLY.includes(a) || TYPING.includes(a)))) {
    return 'A2 gives the machine a tmux that reports an unmeasured version, so it runs ALONE; run it as its own invocation.';
  }
  if (far === 'real') {
    const other = arms.filter((a) => !REAL_ARMS.includes(a));
    if (other.length > 0) return `the real machine runs ${REAL_ARMS.join(', ')} and nothing else; ${other.join(', ')} were asked for.`;
  }
  return null;
}

/**
 * The staleness grader, p292's by value. `sources` is `[path, mtimeMs]` per
 * source and `bundle` is `[path, mtimeMs]` of the bundle built from them, or
 * null. Answers the refusal sentence, or null.
 */
export function staleSentence(sources, bundle) {
  if (bundle === null) return 'out/ holds no bundle for the sources this run reads; build first.';
  const newer = sources
    .filter(([, mtime]) => mtime > bundle[1])
    .map(([path, mtime]) => `${path} is ${((mtime - bundle[1]) / 1000).toFixed(1)} s newer than ${bundle[0]}`);
  if (newer.length === 0) return null;
  return `out/ is older than the sources this run reads; build first (${newer.join('; ')}).`;
}

// ---------------------------------------------------------------------------
// Fisher's exact test, computed here and never imported
// ---------------------------------------------------------------------------

/** ln(n!) by summing logs, exact enough for the few thousand this ever sees. */
function lnFactorial(n) {
  let s = 0;
  for (let i = 2; i <= n; i += 1) s += Math.log(i);
  return s;
}

/**
 * Fisher's exact test on characters lost: HEAD lost `a` of `n1`, the parent
 * `b` of `n2`. `oneSided` is the probability of HEAD losing `a` or MORE under
 * the hypothesis that both builds lose at one rate (small = HEAD worse);
 * `twoSided` sums every table no more likely than the one observed.
 */
export function fisherExact(a, n1, b, n2) {
  const N = n1 + n2;
  const K = a + b;
  const lnC = (n, k) => lnFactorial(n) - lnFactorial(k) - lnFactorial(n - k);
  const lnTotal = lnC(N, n1);
  const p = (x) => Math.exp(lnC(K, x) + lnC(N - K, n1 - x) - lnTotal);
  const lo = Math.max(0, n1 - (N - K));
  const hi = Math.min(K, n1);
  const observed = p(a);
  let oneSided = 0;
  let twoSided = 0;
  for (let x = lo; x <= hi; x += 1) {
    const px = p(x);
    if (x >= a) oneSided += px;
    if (px <= observed * (1 + 1e-7)) twoSided += px;
  }
  return { oneSided: Math.min(1, oneSided), twoSided: Math.min(1, twoSided) };
}

// ---------------------------------------------------------------------------
// --compare: the grades that span two builds (§7.2)
// ---------------------------------------------------------------------------

/** The rows of one kind out of a list of readings, local unless told. */
function rowsOf(list, arm, where = 'local') {
  return list.flatMap((one) => one?.readings?.[arm]?.[where] ?? []);
}

/** Every finding that spans HEAD and the parent, and the lines to print. */
export function compareBuilds(heads, parents) {
  const findings = [];
  const lines = [];
  // T1, pooled.
  const h1 = t1Pool(rowsOf(heads, 'T1'));
  const p1 = t1Pool(rowsOf(parents, 'T1'));
  if (h1.runs > 0 && p1.runs > 0) {
    const f = fisherExact(h1.lost, h1.typed, p1.lost, p1.typed);
    lines.push(
      `T1 local: HEAD lost ${String(h1.lost)} of ${String(h1.typed)} over ${String(h1.runs)} runs and left ${String(h1.leftOpen)} open; the parent lost ${String(p1.lost)} of ${String(p1.typed)} over ${String(p1.runs)} runs and left ${String(p1.leftOpen)} open. ` +
        `Fisher one-sided (HEAD worse) p = ${f.oneSided.toExponential(2)}, two-sided p = ${f.twoSided.toExponential(2)}. In copy mode after the settle, not graded: ${String(h1.inModeAfter)} and ${String(p1.inModeAfter)}.`
    );
    const rate = (p) => p.lost / Math.max(1, p.typed);
    if (rate(h1) > rate(p1)) findings.push(`T1 local HEAD lost characters at ${(100 * rate(h1)).toFixed(1)}% against the parent's ${(100 * rate(p1)).toFixed(1)}%`);
    if (h1.leftOpen / h1.runs > p1.leftOpen / p1.runs) findings.push(`T1 local HEAD left ${String(h1.leftOpen)} of ${String(h1.runs)} open against the parent's ${String(p1.leftOpen)} of ${String(p1.runs)}`);
    if (h1.runs < 80 && rate(h1) > rate(p1)) lines.push('T1: HEAD read above the parent in the first runs, so the second 40 a build is owed before this is a verdict.');
    if (h1.lost > 0) lines.push(`T1: the design claims 0 at HEAD and it lost ${String(h1.lost)}; at or under the parent's rate that is a finding against the claim, not a regression.`);
  } else {
    lines.push('T1 local: not read on both builds.');
  }
  // T2, per G.
  for (const g of T2_GAPS) {
    const mean = (rows) => (rows.length === 0 ? null : rows.reduce((n, r) => n + r.lines, 0) / rows.length);
    const h = mean(rowsOf(heads, 'T2').filter((r) => r.gap === g));
    const p = mean(rowsOf(parents, 'T2').filter((r) => r.gap === g));
    if (h === null || p === null) continue;
    lines.push(`T2 local G ${String(g)}: HEAD moved ${h.toFixed(1)} lines on average, the parent ${p.toFixed(1)}`);
    if (Math.abs(h - p) > 1) findings.push(`T2 local G ${String(g)} HEAD moved ${h.toFixed(1)} lines where the parent moved ${p.toFixed(1)}`);
  }
  // T3, per δ.
  for (const d of T3_DELTAS) {
    const count = (rows) => rows.filter((r) => r.delta === d && r.got === 'x').length;
    const hRows = rowsOf(heads, 'T3').filter((r) => r.delta === d);
    const pRows = rowsOf(parents, 'T3').filter((r) => r.delta === d);
    if (hRows.length === 0 || pRows.length === 0) continue;
    lines.push(`T3 local δ ${String(d)}: HEAD delivered ${String(count(hRows))} of ${String(hRows.length)}, the parent ${String(count(pRows))} of ${String(pRows.length)}`);
    if (count(hRows) / hRows.length < count(pRows) / pRows.length) findings.push(`T3 local δ ${String(d)} HEAD delivered ${String(count(hRows))} of ${String(hRows.length)} against the parent's ${String(count(pRows))} of ${String(pRows.length)}`);
  }
  // THE SECOND BUILD'S. R1 and R1L, per wait, pooled: HEAD's reports at least
  // the parent's. R7 and R7L: HEAD's arrow keys at most the parent's.
  const sweepRows = (list, arm) => list.flatMap((one) => (Array.isArray(one?.readings?.[arm]) ? one.readings[arm] : []));
  for (const arm of ['R1', 'R1L']) {
    const h = sweepRows(heads, arm);
    const p = sweepRows(parents, arm);
    if (h.length === 0 || p.length === 0) continue;
    for (const wait of R1_WAITS) {
      const sum = (rows) => rows.filter((r) => r.wait === wait).reduce((n, r) => [n[0] + r.reports, n[1] + r.notches], [0, 0]);
      const [hr, hn] = sum(h);
      const [pr, pn] = sum(p);
      if (hn === 0 || pn === 0) continue;
      lines.push(`${arm} W ${String(wait)} ms: HEAD reached the program ${String(hr)} of ${String(hn)}, the parent ${String(pr)} of ${String(pn)}`);
      if (hr / hn < pr / pn) findings.push(`${arm} W ${String(wait)} ms HEAD reached the program ${String(hr)} of ${String(hn)} against the parent's ${String(pr)} of ${String(pn)}`);
    }
    const stuck = (rows) => rows.filter((r) => r.parkedAfter === true).length;
    lines.push(`${arm}: left in copy mode over a program that asked, HEAD ${String(stuck(h))} of ${String(h.length)}, the parent ${String(stuck(p))} of ${String(p.length)}`);
    if (stuck(h) > stuck(p)) findings.push(`${arm} HEAD left ${String(stuck(h))} runs in copy mode over a program that asked against the parent's ${String(stuck(p))}`);
  }
  for (const arm of ['R7', 'R7L']) {
    const h = sweepRows(heads, arm);
    const p = sweepRows(parents, arm);
    if (h.length === 0 || p.length === 0) continue;
    const arrows = (rows) => rows.reduce((n, r) => n + (r.arrows ?? 0), 0);
    lines.push(`${arm}: arrow keys reaching a program that let go, HEAD ${String(arrows(h))} over ${String(h.length)} runs, the parent ${String(arrows(p))} over ${String(p.length)}`);
    if (arrows(h) > arrows(p)) findings.push(`${arm} HEAD typed ${String(arrows(h))} arrow key(s) into a program that let go against the parent's ${String(arrows(p))}`);
  }
  // The remote T3: HEAD delivers at least what the parent did at every δ.
  for (const d of T3_DELTAS) {
    const count = (rows) => rows.filter((r) => r.delta === d && r.got === 'x').length;
    const hRows = rowsOf(heads, 'T3', 'remote').filter((r) => r.delta === d);
    const pRows = rowsOf(parents, 'T3', 'remote').filter((r) => r.delta === d);
    if (hRows.length === 0 || pRows.length === 0) continue;
    lines.push(`T3 remote δ ${String(d)}: HEAD delivered ${String(count(hRows))} of ${String(hRows.length)}, the parent ${String(count(pRows))} of ${String(pRows.length)}`);
    if (count(hRows) / hRows.length < count(pRows) / pRows.length) findings.push(`T3 remote δ ${String(d)} HEAD delivered ${String(count(hRows))} of ${String(hRows.length)} against the parent's ${String(count(pRows))} of ${String(pRows.length)}`);
  }
  // T5, against the parent only: HEAD delivers at least what the parent did.
  {
    const t5 = (list) => list.flatMap((one) => (Array.isArray(one?.readings?.T5) ? one.readings.T5.filter((r) => r.label === 'outage') : []));
    const h = t5(heads);
    const p = t5(parents);
    if (h.length > 0 && p.length > 0) {
      const got = (rows) => rows.reduce((n, r) => n + (r.typed.length - charsLost(r.typed, r.got)), 0);
      const typed = (rows) => rows.reduce((n, r) => n + r.typed.length, 0);
      lines.push(`T5: HEAD delivered ${String(got(h))} of ${String(typed(h))} typed through an outage, the parent ${String(got(p))} of ${String(typed(p))}`);
      if (got(h) / typed(h) < got(p) / typed(p)) findings.push(`T5 HEAD delivered ${String(got(h))} of ${String(typed(h))} through an outage against the parent's ${String(got(p))} of ${String(typed(p))}`);
    }
  }
  // T4, per mode, on this Mac and on the machine.
  for (const where of ['local', 'remote']) {
    for (const mode of ['clock', 'tree', 'options']) {
      const h = [...new Set(rowsOf(heads, 'T4', where).filter((r) => r.mode === mode).map((r) => r.got))];
      const p = [...new Set(rowsOf(parents, 'T4', where).filter((r) => r.mode === mode).map((r) => r.got))];
      if (h.length === 0 || p.length === 0) continue;
      lines.push(`T4 ${where} ${mode}: HEAD delivered ${J(h)}, the parent ${J(p)}`);
      // This Mac: the same bytes (graded). The machine: at least as many of
      // "bc" delivered as the parent did (§9: a key over a remote mode now goes
      // behind a cancel, so what the mode eats may differ, and less is worse).
      if (where === 'local' && h.some((one) => !p.includes(one))) findings.push(`T4 ${where} ${mode} HEAD delivered ${J(h)} where the parent delivered ${J(p)}`);
      const kept = (list) => Math.min(...list.map((one) => 2 - charsLost('bc', one)));
      if (where === 'remote' && kept(h) < kept(p)) findings.push(`T4 ${where} ${mode} HEAD delivered ${J(h)} where the parent delivered ${J(p)}: fewer of "bc"`);
    }
  }
  // R5X (Phase 320.2, build/p3202/SPEC.md §5.3 item 6): the menus across the
  // builds, and the parent measurement of the bundle.
  {
    const r5 = (list) => list.map((one) => one?.readings?.R5).find((r) => r !== null && typeof r === 'object') ?? null;
    const h = r5(heads);
    const p = r5(parents);
    if (h === null || p === null) {
      lines.push('R5X: R5 was not read on both builds.');
    } else {
      const hl = h.menus?.local;
      const pl = p.menus?.local;
      if (!Array.isArray(hl) || !Array.isArray(pl)) findings.push('R5X this Mac\'s right-click menu was not read at both builds');
      else {
        lines.push(`R5X this Mac's menu: HEAD ${J(hl)}, the parent ${J(pl)}`);
        if (J(hl) !== J(pl)) findings.push(`R5X this Mac's right-click menu moved: HEAD ${J(hl)}, the parent ${J(pl)}`);
      }
      const hr = h.menus?.remote;
      const pr = p.menus?.remote;
      if (!Array.isArray(hr) || !Array.isArray(pr)) findings.push('R5X a remote session\'s right-click menu was not read at both builds');
      else {
        const rows = pr.filter((row) => READ_ROW.test(row));
        lines.push(`R5X a remote session's menu: HEAD ${J(hr)}, the parent ${J(pr)}`);
        if (rows.length !== 1) {
          findings.push(`R5X the parent's remote menu holds ${String(rows.length)} Read Last Lines row(s), not one, so the parent was not measured`);
        } else {
          const at = pr.findIndex((row) => READ_ROW.test(row));
          const less = [...pr.slice(0, at), ...pr.slice(at + 1)];
          if (J(hr) !== J(less)) findings.push(`R5X a remote session's menu at HEAD is ${J(hr)}, not the parent's less its one Read Last Lines row (${J(less)})`);
        }
      }
      for (const [build, r] of [['HEAD', h], ['the parent', p]]) {
        if (r.scrollbackRows?.remote !== false) findings.push(`R5X a remote session's menu at ${build} read ${J(r.scrollbackRows?.remote ?? null)} for a scrollback row; it draws none at either build`);
      }
      if (!Array.isArray(h.appMenu) || !Array.isArray(p.appMenu)) findings.push('R5X the application menu was not read at both builds');
      else if (J(h.appMenu) !== J(p.appMenu)) {
        const gone = p.appMenu.filter((l) => !h.appMenu.includes(l));
        const added = h.appMenu.filter((l) => !p.appMenu.includes(l));
        findings.push(`R5X the application menu moved between the builds: gone ${J(gone)}, added ${J(added)}`);
      } else lines.push(`R5X the application menu: ${String(h.appMenu.length)} labels, equal at both builds`);
      const counts = (r) => BUNDLE_NAMES.map((name) => (typeof r.bundle?.[name] === 'number' ? r.bundle[name] : null));
      const hc = counts(h);
      const pc = counts(p);
      lines.push(`R5X the built bundle names ${BUNDLE_NAMES.join(', ')}: HEAD ${J(hc)}, the parent ${J(pc)}`);
      if (hc.some((n) => n !== 0)) findings.push(`R5X HEAD's built bundle names the window: ${J(hc)} for ${J(BUNDLE_NAMES)}`);
      if (pc.some((n) => !(typeof n === 'number' && n > 0))) findings.push(`R5X the parent's built bundle reads ${J(pc)} for ${J(BUNDLE_NAMES)}, so the parent was not measured`);
    }
  }
  return { findings, lines };
}

/**
 * Which part of the build a `--compare` finding belongs to under SPEC §9's
 * removal rule, so the summary names the part to remove (the parent verifier's
 * nit of the second build: it named this Mac's P2 and P3 for a T5 finding,
 * whose owner is the remote key road).
 */
export function ownerOfFinding(finding) {
  const f = String(finding);
  if (/^(?:T1|T2|T3|T4) local\b/.test(f)) return "this Mac's typing half, P1 to P4 (§9: D1 and D2 stay; the typing half comes out whole)";
  if (/^(?:R1L|R7L)\b/.test(f)) return 'D1 and D2 on this Mac (§9: a local flag takes them out here)';
  if (/^(?:R1|R7)\b/.test(f)) return "D1 and D2's arms for a pane on another machine (§9: Phase 320's pass-through while not parked)";
  if (/^(?:T3 remote|T4 remote|T5)\b/.test(f)) return 'the remote key road, D6 to D9 and the fix round\'s F1 and F4 (§9: remote parking does not land, and it goes to him)';
  if (/^R5X\b/.test(f)) return "Phase 320.2's removal of the Read Last Lines window (build/p3202/SPEC.md §5.3)";
  return 'the part that owns it (read SPEC §9)';
}

// ---------------------------------------------------------------------------
// --self-test. Every grader on a HEAD shaped reading and on a parent shaped one.
// ---------------------------------------------------------------------------
function selfTest() {
  const input = (hex, reports = [], other = '') => ({ kind: 'input', hex, reports, other });
  const up = { b: 64, x: 20, y: 10, release: false };
  const sgrUp = Buffer.from('\x1b[<64;20;10M', 'latin1').toString('hex');
  const headLog = [{ kind: 'ready', top: 4971 }, ...Array.from({ length: 20 }, (_, k) => [input(sgrUp, [up]), { kind: 'state', top: 4971 - 3 * (k + 1) }]).flat()];
  const t1 = (got, o = {}) => ({ got, lastRow: o.lastRow ?? '', paneMode: o.paneMode ?? 'copy-mode', inMode: o.inMode ?? 1 });
  const fisher = fisherExact(114, 770, 24, 550);
  // R5's readings (Phase 320.2): a HEAD shape and a 320.2-parent shape. The
  // menus are the rows terminal-menu.ts draws with nothing selected.
  const R5_REMOTE_ROWS = ['New Session…', 'Split Session', '—', 'Copy [off]', 'Copy as HTML [off]', 'Paste', 'Select All', '—', 'Capture Screen', 'Capture Selection [off]', '—', 'Clear [off]'];
  const R5_LOCAL_ROWS = ['New Session…', 'Split Session', '—', 'Copy [off]', 'Copy as HTML [off]', 'Paste', 'Select All', '—', 'Capture Screen', 'Capture Selection [off]', ...R5_PRESETS, '—', 'Clear'];
  const R5_LOCAL_ROWS_LIVE = [...R5_LOCAL_ROWS.slice(0, -1), 'Scrollback … [off]', 'Clear'];
  const r5Head = (o = {}) => ({
    notes: [null, null],
    menus: { remote: o.remote ?? R5_REMOTE_ROWS, local: o.local ?? R5_LOCAL_ROWS },
    scrollbackRows: { remote: false, local: (o.local ?? R5_LOCAL_ROWS).some((r) => SCROLLBACK_ROW.test(r)) },
    appMenu: ['Tortie > About Tortie', 'File > Open Recent', 'Session > End Session'],
    opened: false,
    bridge: 'undefined',
    handler: { control: true, removed: false },
    bundle: Object.fromEntries(BUNDLE_NAMES.map((n) => [n, 0]))
  });
  const r5Parent = (o = {}) => ({
    ...r5Head(o),
    menus: { remote: [...R5_REMOTE_ROWS.slice(0, 10), 'Read Last Lines…', ...R5_REMOTE_ROWS.slice(10)], local: o.local ?? R5_LOCAL_ROWS },
    opened: true,
    bridge: 'function',
    handler: { control: true, removed: true },
    bundle: { openRemoteLines: 2, 'remote-lines-modal': 2, 'machines:readSessionLines': 2 }
  });
  const fixtures = [
    ['tally reads reports, other bytes and the last top', () => tally(headLog, 1), { up: 20, down: 0, reports: 20, other: '', bytes: '\x1b[<64;20;10M'.repeat(20), top: 4911 }],
    ['tally counts a report with a modifier bit as the wheel', () => tally([input('', [{ b: 64 | 16, x: 1, y: 1 }])]).up, 1],
    ['topAt reads the top before an offset', () => topAt(headLog, 1), 4971],
    ['R1 HEAD: every notch a report, the view older, mode any', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally(headLog, 1) }), []],
    ['R1 the parent of 320: nothing arrives, in the reporter\'s words', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally([], 0) }), ['R1 20 wheel notches over a full-screen program on another machine reached it as 0 wheel reports and its view did not move (top line 4971 -> null): nothing scrolls, which is issue 31']],
    ['R1 a mode that never reached xterm is named', () => wheelFindings({ mode: 'none', notches: 20, topBefore: 4971, after: tally(headLog, 1) }).length, 1],
    ['R1 half the notches eaten is named', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally(headLog.slice(0, 21), 1) }), ['R1 20 wheel notches reached the far program as 10 wheel reports, so 10 were eaten on the way']],
    ['R6 the local control names this Mac and not issue 31', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally([], 0) }, 'R6'), ['R6 20 wheel notches over a full-screen program on this Mac reached it as 0 wheel reports and its view did not move (top line 4971 -> null)']],
    ['R6 HEAD and the parent: every notch arrives on this Mac', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: tally(headLog, 1) }, 'R6'), []],
    ['R1 arrow keys beside the reports are named', () => wheelFindings({ mode: 'any', notches: 20, topBefore: 4971, after: { ...tally(headLog, 1), other: '\x1bOA' } }), ['R1 the far program received 3 bytes that are not mouse reports ("\\u001bOA"), which is the wheel typed as keys']],
    ['A2 a swallowed shell: nothing typed', () => swallowFindings('A2', { notches: 20, what: 'x', after: tally([], 0), mode: 'none', errors: 0 }), []],
    ['A2 arrow keys reaching a plain program are named', () => swallowFindings('A2', { notches: 20, what: 'a plain program on another machine', after: tally([input('1b4f41')], 0), mode: 'none' }), ['A2 20 wheel notches over a plain program on another machine reached it as 3 bytes ("\\u001bOA"); a program that did not ask for the mouse must receive nothing, because claude and codex read the arrow keys as history']],
    ['R2 HEAD: parked, nothing typed, the next key live and delivered', () => parkFindings({ what: 'a plain shell', parked: { inMode: 1, position: 60 }, wheelBytes: '', errors: 0, key: { live: true, delivered: 'x', expected: 'x' } }), []],
    ['R2 the parent of 320.1: nothing parks, in the reporter\'s words', () => parkFindings({ what: 'a plain shell', parked: { inMode: 0, position: 0 }, wheelBytes: '', errors: 0, key: { live: true, delivered: 'x', expected: 'x' } }), ['R2 20 wheel notches over a plain shell on another machine did not scroll it back (the far tmux reads mode 0, position 0): nothing scrolls, which is issue 31']],
    ['R2 a key eaten by copy mode is named', () => parkFindings({ what: 'the recorder', parked: { inMode: 1, position: 60 }, wheelBytes: '', errors: 0, key: { live: false, delivered: '', expected: 'x' } }).length, 2],
    ['R2 the prompt recalled from history is named', () => promptFindings('p320$', 'p320$ echo p320-marker', 'p320$'), ['R2 20 wheel notches over a plain shell on another machine changed its line from "p320$" to "p320$ echo p320-marker": the wheel was typed as keys']],
    ['R3 HEAD and the parent alike: the far stand-in receives nothing', () => remoteAltFindings(''), []],
    ['R3 the fix round: nothing reaching the remote stand-in passes', () => remoteAltFindings(''), []],
    ['R3 the fix round: a cursor key reaching it is named', () => remoteAltFindings('\x1bOA\x1bOA').length, 1],
    // Phase 320.2: R5 is the window's absence, graded once both menus are read.
    ['R5 HEAD: no row, menus equal, no window, no member, no handler, no name in the bundle', () => windowFindings(r5Head()), []],
    ['R5 HEAD, the live shape: this Mac\'s menu carries a scrollback row and the remote one does not', () => windowFindings(r5Head({ local: R5_LOCAL_ROWS_LIVE })), []],
    ['R5 320.2\'s parent: exactly five, one per window clause, and none from the equality', () => windowFindings(r5Parent()).length, 5],
    ['R5 320.2\'s parent: the five are the row, the window, the member, the handler and the bundle', () => windowFindings(r5Parent()).map((f) => f.slice(0, 28)), ['R5 a remote session\'s right-', 'R5 the Read Last Lines windo', 'R5 the bridge still carries ', 'R5 main still registers an i', 'R5 the built bundle still na']],
    ['R5 a control that reads false is one finding, never a pass', () => windowFindings({ ...r5Head(), handler: { control: false, removed: false } }).length, 1],
    ['R5 menus not read are one finding, not a pass', () => windowFindings({ ...r5Head(), menus: { remote: null, local: null } }), ['R5 the right-click menu was not read, so nothing about its rows is known']],
    ['R5 the band control 320.1 deleted is still named in each orientation', () => windowFindings({ ...r5Head(), notes: [{ text: 'x' }, { text: 'x' }] }).length, 2],
    ['R5 a remote menu that lost a row this Mac\'s has is named by the equality', () => windowFindings(r5Head({ remote: R5_REMOTE_ROWS.filter((r) => r !== 'Paste') })).length, 1],
    ['R5 the row in the application menu is named', () => windowFindings({ ...r5Head(), appMenu: ['Session > Read Last Lines…'] }).length, 1],
    ['R5 runs of separators collapse to one', () => collapseSeparators(['a', '—', '—', 'b', '—']), ['a', '—', 'b', '—']],
    ['R5X HEAD against 320.2\'s parent: nothing to find', () => compareBuilds([{ readings: { R5: r5Head({ local: R5_LOCAL_ROWS_LIVE }) } }], [{ readings: { R5: r5Parent({ local: R5_LOCAL_ROWS_LIVE }) } }]).findings, []],
    ['R5X a parent reading with no Read Last Lines row was not measured', () => compareBuilds([{ readings: { R5: r5Head() } }], [{ readings: { R5: r5Head() } }]).findings.filter((f) => /not measured/.test(f)).length, 2],
    ['R5X this Mac\'s menu moving between the builds is a finding', () => compareBuilds([{ readings: { R5: r5Head() } }], [{ readings: { R5: r5Parent({ local: R5_LOCAL_ROWS_LIVE }) } }]).findings.filter((f) => /this Mac's right-click menu moved/.test(f)).length, 1],
    ['R5X a remote menu that grew a scrollback row is a finding', () => compareBuilds([{ readings: { R5: { ...r5Head(), scrollbackRows: { remote: true, local: true } } } }], [{ readings: { R5: r5Parent() } }]).findings.filter((f) => /scrollback row/.test(f)).length, 1],
    ['R5X a finding names Phase 320.2\'s removal', () => /Phase 320\.2/.test(ownerOfFinding('R5X HEAD\'s built bundle names the window')), true],
    // Phase 320.2 (D9): p326's four hidden-agent fixtures, build/p326/probe-p326.mjs:951-954.
    ['hidden agents: a clean scan passes', () => hidden.hiddenAgentsScanVerdict([{ id: 'claude', installed: true, binPath: '/x' }, { id: 'gemini', installed: false, binPath: null, version: null }]).ok, true],
    ['hidden agents: a resolved gemini stops the run', () => hidden.hiddenAgentsScanVerdict([{ id: 'gemini', installed: true, binPath: '/opt/homebrew/bin/gemini' }]).ok, false],
    ['hidden agents: a version alone stops the run', () => hidden.hiddenAgentsScanVerdict([{ id: 'grok', installed: false, binPath: null, version: '1.0' }]).ok, false],
    ['hidden agents: no list is not a pass', () => hidden.hiddenAgentsScanVerdict(null).ok, false],
    ['lcs of equal texts is their length', () => lcsLength(TYPED, TYPED), 11],
    ['M3 loss is counted by LCS', () => charsLost(TYPED, 'fx th bg'), 3],
    ['a stray byte is not a loss', () => charsLost(TYPED, `${TYPED}\u001b`), 0],
    ['a jump prompt on the last row is left open', () => leftOpen(t1(TYPED, { lastRow: '(jump forward) ' })), true],
    ['a pane parked by the flick tail is NOT left open', () => leftOpen(t1(TYPED, { paneMode: 'copy-mode', inMode: 1 })), false],
    ['clock mode is left open', () => leftOpen(t1(TYPED, { paneMode: 'clock-mode', inMode: 1 })), true],
    ['stacked modes are left open', () => leftOpen(t1(TYPED, { paneMode: 'copy-mode', inMode: 2 })), true],
    ['T1 pooled: characters, runs, open, parked', () => t1Pool([t1(TYPED), t1('fx the bug', { lastRow: '(jump forward) ' })]), { runs: 2, typed: 22, lost: 1, leftOpen: 1, inModeAfter: 2 }],
    ['T1 remote: the parent\'s reading passes', () => remoteTypingFindings('T1', [t1(TYPED, { paneMode: '', inMode: 0 })]), []],
    ['T1 remote: a loss is named as a loss', () => remoteTypingFindings('T1', [t1('fx the bug', { paneMode: '', inMode: 0 })]).map((f) => f.slice(0, 22)), ['T1 run 1 lost 1 of 11 ']],
    ['T3 remote: a key not delivered is named', () => remoteTypingFindings('T3', [{ typed: 'x', got: '' }]).length, 1],
    ['T2 remote: the key, this Mac\'s 60 lines within one, and a first line inside D6\'s bound pass', () => swipeFindings([{ gap: 0, lines: 60, delivered: true, got: 'x', firstMovedMs: 290 }], [{ gap: 0, lines: 60 }], 20), []],
    ['T2 remote: the FIRST ATTEMPT\'s grade is gone: 60 lines are not a finding against 30', () => swipeFindings([{ gap: 40, lines: 60, delivered: true, got: 'x', firstMovedMs: 250 }], [{ gap: 40, lines: 60 }], 20), []],
    ['T2 remote: the parent\'s swallowed swipe is named against this Mac\'s 60', () => swipeFindings([{ gap: 40, lines: 0, delivered: true, got: 'x', firstMovedMs: null }], [{ gap: 40, lines: 60 }], 20).length, 2],
    ['T2 remote: a key the swipe ate is named', () => swipeFindings([{ gap: 0, lines: 60, delivered: false, got: '', firstMovedMs: 250 }], [{ gap: 0, lines: 60 }], 20)[0], 'T2 run 1, a swipe begun 0 ms after a key on another machine: the key arrived as "", not "x"'],
    ['T2 remote: a first line past D6\'s bound is named (200 + 16 + 2 x 20 + 50 = 306)', () => [firstMoveBoundMs(20), swipeFindings([{ gap: 0, lines: 60, delivered: true, got: 'x', firstMovedMs: 307 }], [{ gap: 0, lines: 60 }], 20).length], [306, 1]],
    ['T2 remote: with no reading of this Mac the lines are printed, not graded', () => swipeFindings([{ gap: 0, lines: 13, delivered: true, got: 'x', firstMovedMs: 250 }], null, 20), []],
    ['T5 is graded against the parent only now: a key through the outage is not an in-run finding', () => outageFindings({ parked: true, before: 'f', got: 'fix', typed: 'fix', live: false, backAt: 5 }), []],
    ['T5 a connection that never came back read nothing, and says so', () => outageFindings({ parked: true, before: '', got: '', typed: 'fix', live: false, backAt: 0 }).length, 1],
    ['compare: T5 HEAD delivering less through an outage than the parent is a finding', () => compareBuilds([{ readings: { T5: [{ label: 'outage', typed: 'fix', got: 'ix' }] } }], [{ readings: { T5: [{ label: 'outage', typed: 'fix', got: 'fix' }] } }]).findings.length, 1],
    ['compare: T5 HEAD delivering more passes', () => compareBuilds([{ readings: { T5: [{ label: 'outage', typed: 'fix', got: 'fix' }] } }], [{ readings: { T5: [{ label: 'outage', typed: 'fix', got: 'f' }] } }]).findings, []],
    ['C1 HEAD: the machine\'s rows, byte for byte', () => copyFindings({ copied: 'line 5\nline 6', far: 'line 5\nline 6', a: -10, b: -9, localMarker: 'LOCAL-ONLY', rows: 50, screenRows: 40 }), []],
    ['C1 the parent: this Mac\'s same-named session', () => copyFindings({ copied: 'LOCAL-ONLY-5\nLOCAL-ONLY-6', far: null, a: null, b: null, localMarker: 'LOCAL-ONLY', rows: 50, screenRows: 40 }).length, 2],
    ['C1 nothing copied is a finding, not a pass', () => copyFindings({ copied: '' }).length, 1],
    ['A1 HEAD: the reused id never entered a mode', () => reuseFindings({ foreign: 4, reused: true, oldId: '$3', inMode: [] }), []],
    ['A1 a scroll reaching somebody else\'s pane is named', () => reuseFindings({ foreign: 4, reused: true, oldId: '$3', inMode: [{ id: '$3', afterMs: 250 }] }).length, 1],
    ['A2: NO_PANE_HERE, fullscreen scrolls, shell swallowed', () => unmeasuredFindings({ read: { hasPane: false }, fullscreen: { mode: 'any', notches: 20, topBefore: 4971, after: tally(headLog, 1) }, shell: { notches: 20, what: 'x', after: tally([], 0), mode: 'none', parked: { inMode: 0 } } }), []],
    ['A2: a connection opened on an unmeasured tmux is named', () => unmeasuredFindings({ read: { hasPane: true }, fullscreen: { mode: 'any', notches: 20, topBefore: 4971, after: tally(headLog, 1) }, shell: { notches: 20, what: 'x', after: tally([], 0), mode: 'none', parked: { inMode: 1 } } }).length, 2],
    ['Fisher: the reverifier\'s own pool (114 of 770 against 24 of 550) reads one-sided p < 1e-8', () => fisher.oneSided < 1e-8, true],
    ['Fisher: the same pool two-sided is small too', () => fisher.twoSided < 1e-8, true],
    ['Fisher: the reverifier\'s pool reads one-sided 1.37e-10 to three figures', () => Number(fisher.oneSided.toPrecision(3)), 1.37e-10],
    ['Fisher: the one-sided sum holds the observed table (1 of 2 against 0 of 2 is one half)', () => Number(fisherExact(1, 2, 0, 2).oneSided.toFixed(6)), 0.5],
    ['Fisher: equal rates read p near 1 two-sided', () => fisherExact(10, 100, 10, 100).twoSided > 0.99, true],
    ['Fisher: HEAD better reads a one-sided p above one half', () => fisherExact(2, 440, 17, 440).oneSided > 0.5, true],
    ['compare: HEAD worse on T1 is a finding', () => compareBuilds([{ readings: { T1: { local: [t1('fx th bg')] } } }], [{ readings: { T1: { local: [t1(TYPED)] } } }]).findings.length, 1],
    ['compare: HEAD no worse passes', () => compareBuilds([{ readings: { T1: { local: [t1(TYPED)] }, T3: { local: [{ delta: 0, got: 'x' }] } } }], [{ readings: { T1: { local: [t1('fx th bg')] }, T3: { local: [{ delta: 0, got: '' }] } } }]).findings, []],
    ['compare: T2 more than a line apart is a finding', () => compareBuilds([{ readings: { T2: { local: [{ gap: 40, lines: 0 }] } } }], [{ readings: { T2: { local: [{ gap: 40, lines: 30 }] } } }]).findings.length, 1],
    ['compare: T4 other bytes is a finding', () => compareBuilds([{ readings: { T4: { local: [{ mode: 'clock', got: 'c' }] } } }], [{ readings: { T4: { local: [{ mode: 'clock', got: 'bc' }] } } }]).findings.length, 1],
    ['compare: T4 on the machine delivering less than the parent is a finding', () => compareBuilds([{ readings: { T4: { remote: [{ mode: 'tree', got: '' }] } } }], [{ readings: { T4: { remote: [{ mode: 'tree', got: 'b' }] } } }]).findings, ['T4 remote tree HEAD delivered [""] where the parent delivered ["b"]: fewer of "bc"']],
    ['compare: T4 on the machine delivering more than the parent passes', () => compareBuilds([{ readings: { T4: { remote: [{ mode: 'tree', got: 'bc' }] } } }], [{ readings: { T4: { remote: [{ mode: 'tree', got: 'b' }] } } }]).findings, []],
    ['compare: R1 HEAD reaching the program less than the parent at a wait is a finding', () => compareBuilds([{ readings: { R1: [{ wait: 0, run: 1, reports: 0, notches: 10, parkedAfter: true }] } }], [{ readings: { R1: [{ wait: 0, run: 1, reports: 10, notches: 10, parkedAfter: false }] } }]).findings.length, 2],
    ['compare: R1 HEAD at least the parent passes', () => compareBuilds([{ readings: { R1: [{ wait: 0, run: 1, reports: 10, notches: 10, parkedAfter: false }] } }], [{ readings: { R1: [{ wait: 0, run: 1, reports: 10, notches: 10, parkedAfter: false }] } }]).findings, []],
    ['compare: R7L HEAD typing more arrows than the parent is a finding', () => compareBuilds([{ readings: { R7L: [{ wait: 0, run: 1, arrows: 2 }] } }], [{ readings: { R7L: [{ wait: 0, run: 1, arrows: 0 }] } }]).findings.length, 1],
    ['compare: the remote T3 delivering less than the parent is a finding', () => compareBuilds([{ readings: { T3: { remote: [{ delta: 0, got: '' }] } } }], [{ readings: { T3: { remote: [{ delta: 0, got: 'x' }] } } }]).findings.length, 1],
    ['the arms: empty means every arm but A2', () => chooseArms(''), { arms: DEFAULT_ARMS, bad: [] }],
    ['the arms: R4 was removed with P2 and P3 and is refused by name', () => chooseArms('R4'), { arms: [], bad: ['R4'] }],
    ['the arms: a subset keeps the file\'s order, which is the order they run, remote first, any case', () => chooseArms('t1, R1, r3l, r7l'), { arms: ['R1', 'T1', 'R3L', 'R7L'], bad: [] }],
    ['the arms: every remote arm runs before any arm of this Mac (D13)', () => ALL_ARMS.findIndex((a) => LOCAL_ONLY.includes(a)) > Math.max(...ALL_ARMS.filter((a) => REMOTE_ONLY.includes(a)).map((a) => ALL_ARMS.indexOf(a))), true],
    ['the arms: R3 runs before R3L, the order the first attempt\'s default run could never finish', () => ALL_ARMS.indexOf('R3') < ALL_ARMS.indexOf('R3L'), true],
    ['the arms: A2 beside a remote arm is refused', () => armsRefusal(['R1', 'A2'], 'loopback') !== null, true],
    ['the arms: A2 alone is accepted', () => armsRefusal(['A2'], 'loopback'), null],
    ['the arms: the real machine runs R1, R7, T1, T2, T3 and T6 beside this Mac\'s arms, and nothing else', () => [armsRefusal(['R1', 'R7', 'T1', 'T2', 'T3', 'T6', 'R1L', 'R6'], 'real'), armsRefusal(['C1'], 'real') !== null, armsRefusal(['A1'], 'real') !== null], [null, true, true]],
    ['the parts: a typing arm runs remote then here, a remote arm once, R5 remote then here, a local arm once', () => planParts(['R1', 'R5', 'T1', 'R1L'], { local: true, remote: true }), { R1: ['remote'], R5: ['remote', 'local'], T1: ['remote', 'local'], R1L: ['local'] }],
    ['the parts: R5 has its two parts whatever the typing flags say, so a remote half that threw prints not run', () => [planParts(['R5'], { local: false, remote: false }), summaryRows(planParts(['R5'], { local: true, remote: true }), new Set(['R5:remote']), { ...Object.fromEntries(ALL_ARMS.map((a) => [a, []])), RUN: [] }).find(([a]) => a === 'R5')], [{ R5: ['remote', 'local'] }, ['R5', 'not run']]],
    ['the summary: an arm after the stage that threw prints not run, never PASS (the first attempt printed PASS)', () => summaryRows(planParts(['R3', 'T1', 'C1'], { local: true, remote: true }), new Set(['T1:remote']), { ...Object.fromEntries(ALL_ARMS.map((a) => [a, []])), RUN: ['stopped during R3'] }).filter(([a]) => ['R3', 'T1', 'C1', 'R1', 'RUN'].includes(a)), [['R1', 'not asked'], ['R3', 'not run'], ['T1', 'not run'], ['C1', 'not run'], ['RUN', 'FAIL 1']]],
    ['the summary: an arm whose every part ran is PASS or FAIL', () => summaryRows({ T6: ['remote'], C1: ['remote'] }, new Set(['T6:remote', 'C1:remote']), { ...Object.fromEntries(ALL_ARMS.map((a) => [a, []])), C1: ['x'], RUN: [] }).filter(([a]) => ['T6', 'C1'].includes(a)), [['T6', 'PASS'], ['C1', 'FAIL 1']]],
    ['R1: every notch, nothing parked, passes', () => sweepFindings('R1', [{ wait: 0, run: 1, reports: 10, notches: 10, parkedAfter: false, took: true }, { wait: 1500, run: 1, reports: 10, notches: 10, parkedAfter: false, took: true }]), []],
    ['R1: the first attempt\'s stuck pane is named', () => sweepFindings('R1', [{ wait: 0, run: 1, reports: 0, notches: 10, parkedAfter: true, took: true }]).length, 1],
    ['R1: a notch missed at 1,000 ms is named, and at 0 ms only the stuck pane is', () => [sweepFindings('R1', [{ wait: 1000, run: 1, reports: 9, notches: 10, parkedAfter: false, took: true }]).length, sweepFindings('R1', [{ wait: 0, run: 1, reports: 3, notches: 10, parkedAfter: false, took: true }]).length], [1, 0]],
    ['R1L says this Mac', () => sweepFindings('R1L', [{ wait: 0, run: 1, reports: 0, notches: 10, parkedAfter: true, took: true }])[0].includes('on this Mac'), true],
    ['R1: a stand-in that never took the mouse measured nothing', () => sweepFindings('R1', [{ wait: 0, run: 1, reports: 0, notches: 10, parkedAfter: false, took: false }]).length, 1],
    ['R1: no run read is a finding, not a pass', () => sweepFindings('R1', []).length, 1],
    ['arrow keys are counted in both spellings, both ways', () => arrowCount('\x1bOA\x1b[Bx\x1b[A'), 3],
    ['R7: arrows into a program that let go are named', () => letGoFindings('R7', [{ wait: 0, run: 1, gave: true, arrows: 2, bytes: '\x1bOA\x1bOA' }]).length, 1],
    ['R7: no arrow passes', () => letGoFindings('R7', [{ wait: 0, run: 1, gave: true, arrows: 0, bytes: '' }]), []],
    ['T6: the same bytes parked and live pass, and the application-cursor Up is printed only', () => keysFindings([{ name: 'é', graded: true, live: 'é', parked: 'é' }, { name: 'Up', graded: false, live: '\x1bOA', parked: '\x1b[A' }]), []],
    ['T6: a key that differs parked is named', () => keysFindings([{ name: 'Tab', graded: true, live: '\t', parked: '' }]).length, 1],
    ['T6: nothing live is a finding, not a pass', () => keysFindings([{ name: 'a', graded: true, live: '', parked: '' }]).length, 1],
    ['T6: Backspace\'s DEL is shown as an escape, never as a byte that prints as nothing', () => shown('\x7f'), '\\u007f'],
    ['C1: the range is read from the PHYSICAL dump, where a wrapped line above is two rows (the reverify\'s one-row offset)', () => copiedRange(['p320$ exec /a/very/long/command/that', 'wrapped', 'line 1', 'line 2', 'line 3'], ['line 2', 'line 3']), { start: 3, end: 4 }],
    ['C1: a first row the pane does not hold names no range', () => copiedRange(['line 1'], ['LOCAL-ONLY-5']), null],
    ['compare: a T5 finding names the remote key road, not this Mac\'s typing half', () => /remote key road/.test(ownerOfFinding('T5 HEAD delivered 0 of 9 through an outage against the parent\'s 3 of 9')), true],
    ['compare: a local T1 finding names this Mac\'s typing half', () => /this Mac's typing half/.test(ownerOfFinding('T1 local HEAD lost 3')), true],
    ['compare: an R1 finding names the remote wheel arms', () => [/another machine/.test(ownerOfFinding('R1 W 0 ms HEAD reached')), /on this Mac/.test(ownerOfFinding('R1L W 0 ms HEAD reached'))], [true, true]],
    // The fix round: the grade is the far pane's own run of rows.
    ['C1: the copy found as a run of the far rows, whatever a separate extent read says', () => farRunOf(['line 126', 'line 127', 'line 128', 'line 129', 'line 130'], ['line 128', 'line 129']), { start: 2, text: 'line 128\nline 129' }],
    ['C1: rows that are not contiguous there are no run', () => farRunOf(['line 1', 'line 2', 'line 3'], ['line 1', 'line 3']), null],
    ['C1: this Mac\'s same-named rows are no run of the far pane', () => farRunOf(['line 1', 'line 2'], ['LOCAL-ONLY-1']), null],
    ['a notch is three lines and never under 60 px, so xterm never reads it as a trackpad', () => [notchPx(17), notchPx(25), notchPx(0)], [60, 75, 60]],
    ['stale: a build newer than every source is not stale', () => staleSentence([['a.ts', 1000]], ['out/main/index.js', 2000]), null],
    ['stale: no bundle at all is a refusal, not a pass', () => staleSentence([['a.ts', 1000]], null), 'out/ holds no bundle for the sources this run reads; build first.'],
    ['A2\'s wrapper answers the two version questions and runs tmux for the rest', () => versionMaskSelfTest(), ['tmux 3.5a', '3.5a', 'ran: -L p320 -f /dev/null list-sessions']]
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
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)}${good ? '' : ` want ${J(want)}`}`);
  }
  say(`Fisher on the reverifier's pool: one-sided p = ${fisher.oneSided.toExponential(3)}, two-sided p = ${fisher.twoSided.toExponential(3)}`);
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved` : 'self-test FAIL');
  return ok;
}

/**
 * A2's wrapper, driven over a stand-in "real" tmux that only echoes its argv,
 * in a scratch directory under the system's temporary one removed at once.
 * Proves the mask answers `-V` and `display-message -p '#{version}'` and passes
 * everything else through unchanged.
 */
function versionMaskSelfTest() {
  const dir = join(process.env['TMPDIR'] ?? '/tmp', `p320-vm-${String(process.pid)}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  try {
    copyFileSync(join(REPO, 'build', 'p3201', 'version-mask.sh'), join(dir, 'tmux'));
    chmodSync(join(dir, 'tmux'), 0o755);
    writeFileSync(join(dir, 'fake'), '#!/bin/sh\necho "ran: $*"\n', { mode: 0o755 });
    writeFileSync(join(dir, 'version-mask.conf'), `P3201_MASK_REAL=${join(dir, 'fake')}\nP3201_MASK_VERSION=3.5a\n`);
    const run = (args) => (spawnSync(join(dir, 'tmux'), args, { encoding: 'utf8' }).stdout ?? '').trim();
    return [run(['-V']), run(['-L', 'p320', '-f', '/dev/null', 'display-message', '-p', '#{version}']), run(['-L', 'p320', '-f', '/dev/null', 'list-sessions'])];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
// His ruling of 2026-10-02: nothing this run starts carries his Terminal tab's
// TERM_SESSION_ID. macOS's /etc/zshrc_Apple_Terminal gives an interactive zsh
// started with it an exit hook that appends that session's history to
// ${ZDOTDIR:-$HOME}/.zsh_history, so the app below also gets its scratch HOME
// as its ZDOTDIR, and a zsh it starts reads and writes nothing of his.
delete process.env['TERM_SESSION_ID'];

if (process.argv.includes('--compare')) {
  const at = (flag) => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? String(process.argv[i + 1] ?? '').split(',').filter((s) => s !== '') : [];
  };
  const read = (paths) => paths.map((p) => JSON.parse(readFileSync(resolve(p), 'utf8')));
  const heads = read(at('--head'));
  const parents = read(at('--parent'));
  if (heads.length === 0 || parents.length === 0) {
    console.error(`${TAG} REFUSED. --compare needs --head <readings,…> and --parent <readings,…>.`);
    process.exit(2);
  }
  const { findings, lines } = compareBuilds(heads, parents);
  for (const l of lines) say(l);
  if (findings.length > 0) {
    for (const f of findings) process.stderr.write(`${TAG}   ${f}\n${TAG}     owner: ${ownerOfFinding(f)}\n`);
    process.stderr.write(`${TAG} HEAD reads WORSE than the parent: ${String(findings.length)} finding(s). Under his rule the part that owns each comes out (build/p3201/SPEC.md §9), named above.\n`);
    process.exit(1);
  }
  say('PASS: HEAD reads no worse than the parent on every graded comparison.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked.
// ---------------------------------------------------------------------------
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p320`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (socket === 'gmux' || socket === 'default') refuse(`"${socket}" is not a harness socket.`);
if (!socket.startsWith('gmux-p320')) refuse(`"${socket}" is not a gmux-p320 harness socket.`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
const FAR = (process.env['P320_FAR'] ?? '').trim() || 'loopback';
if (FAR !== 'loopback' && FAR !== 'real') refuse(`P320_FAR is ${J(FAR)}; it is loopback or real.`);
const { arms: chosen, bad: badArms } = chooseArms(process.env['P320_ARMS']);
if (badArms.length > 0) refuse(`P320_ARMS names ${badArms.join(', ')}; the arms are ${ALL_ARMS.join(', ')}.`);
if (chosen.length === 0) refuse('P320_ARMS chose nothing.');
{
  const r = armsRefusal(chosen, FAR);
  if (r !== null) refuse(r);
}
const WHERE = (process.env['P320_WHERE'] ?? '').trim() || (FAR === 'real' ? 'remote' : 'both');
if (!['local', 'remote', 'both'].includes(WHERE)) refuse(`P320_WHERE is ${J(WHERE)}; it is local, remote or both.`);
// The real machine's typing arms run there, and with P320_WHERE=both on this
// Mac too, which is what grades its T2 against this Mac's flick (D13).
if (FAR === 'real' && WHERE === 'local') refuse('on the real machine the typing arms run on the machine (P320_WHERE=remote, or both).');
const on = (arm) => chosen.includes(arm);
const typingLocal = WHERE !== 'remote';
const typingRemote = WHERE !== 'local';
const wantsMachine = chosen.some((a) => REMOTE_ONLY.includes(a)) || (typingRemote && chosen.some((a) => TYPING.includes(a)));
const intOf = (name, fallback) => {
  const n = Number((process.env[name] ?? '').trim() || fallback);
  if (!Number.isInteger(n) || n <= 0 || n > 500) refuse(`${name} must be a whole number from 1 to 500.`);
  return n;
};
const T1_RUNS = intOf('P320_T1_RUNS', FAR === 'real' ? 20 : 40);

const otherCheckout = (process.env['P320_CHECKOUT'] ?? '').trim();
const checkout = otherCheckout !== '' ? resolve(otherCheckout) : REPO;
const tag = otherCheckout !== '' ? 'checkout' : 'head';
if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) {
  refuse(`${join(checkout, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);
}

/** The sources the readings are made of, per bundle. A file the checkout lacks reads mtime 0. */
const SCROLL_DIR = join('src', 'renderer', 'terminal', 'scroll');
// Phase 320.2: the window's two files left this list with the window, and the
// files where its row, its store action and its knob lived joined it, so a
// build older than any of them is refused as stale rather than read.
const RENDERER_SOURCES = [
  join('src', 'renderer', 'terminal', 'TerminalPane.tsx'),
  join('src', 'renderer', 'terminal', 'terminal-menu.ts'),
  join('src', 'renderer', 'state', 'sessions-slice.ts'),
  join('src', 'renderer', 'app', 'probe-registry.ts'),
  join('src', 'renderer', 'app', 'session-actions.tsx'),
  join('src', 'renderer', 'terminal', 'capture', 'history-copy.ts'),
  join('src', 'renderer', 'terminal', 'capture', 'index.ts')
];
const MAIN_SOURCES = [
  join('src', 'main', 'tmux', 'control-client.ts'),
  join('src', 'main', 'tmux', 'scroll.ts'),
  join('src', 'main', 'sessions', 'core.ts'),
  join('src', 'main', 'machines', 'scroll-shapes.ts'),
  join('src', 'main', 'machines', 'control-plane.ts'),
  join('src', 'main', 'machines', 'remote-sessions.ts'),
  join('src', 'main', 'machines', 'remote-pane-history.ts'),
  join('src', 'main', 'machines', 'scroll-order.ts'),
  join('src', 'main', 'attach', 'attach-host.ts'),
  join('src', 'main', 'capture', 'ipc.ts'),
  join('src', 'main', 'capture', 'service.ts'),
  // Phase 320.2: where the channel's handler was registered.
  join('src', 'main', 'machines', 'ipc.ts')
];
// The integrator's round of the second build: the report predicate both processes ask.
const SHARED_SOURCES = [join('src', 'shared', 'ipc', 'terminal.ts'), join('src', 'shared', 'pane-report.ts')];
function readStaleness(dir) {
  const stat = (rel) => [rel, existsSync(join(dir, rel)) ? statSync(join(dir, rel)).mtimeMs : 0];
  const scrollDir = join(dir, SCROLL_DIR);
  const scroll = existsSync(scrollDir)
    ? readdirSync(scrollDir).filter((n) => /\.(?:ts|tsx|css)$/.test(n) && !/\.test\./.test(n)).map((n) => join(SCROLL_DIR, n))
    : [];
  const assets = join(dir, 'out', 'renderer', 'assets');
  let renderer = null;
  if (existsSync(assets)) {
    for (const name of readdirSync(assets)) {
      if (!/^index-[^.]+\.(?:css|js)$/.test(name)) continue;
      const mtime = statSync(join(assets, name)).mtimeMs;
      if (renderer === null || mtime > renderer[1]) renderer = [join('out', 'renderer', 'assets', name), mtime];
    }
  }
  const mainPath = join(dir, 'out', 'main', 'index.js');
  const main = existsSync(mainPath) ? [join('out', 'main', 'index.js'), statSync(mainPath).mtimeMs] : null;
  return (
    staleSentence([...scroll, ...RENDERER_SOURCES, ...SHARED_SOURCES].map(stat), renderer) ??
    staleSentence([...MAIN_SOURCES, ...SHARED_SOURCES].map(stat), main)
  );
}
{
  const stale = readStaleness(checkout);
  if (stale !== null) refuse(`${tag} ${checkout}: ${stale}`);
}
const executable = (name, path) => {
  try {
    accessSync(path, fsConstants.X_OK);
    if (!statSync(path).isFile()) throw new Error('not a file');
  } catch {
    refuse(`${name} ${path} is not an executable file.`);
  }
};
const tmuxOverride = (process.env['GMUX_TMUX_BIN'] ?? '').trim();
if (tmuxOverride !== '') executable('GMUX_TMUX_BIN', tmuxOverride);
/** THIS Mac's tmux the probe reads the local sessions with: the one the app resolves. */
const vendored = join(checkout, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const localTmuxBin = tmuxOverride !== '' ? tmuxOverride : existsSync(vendored) ? vendored : 'tmux';

/** What build/with-scratch-machine.mjs wrote for this run, on the loopback row. */
let carriage = null;
const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
if (wantsMachine && FAR === 'loopback') {
  try {
    carriage = JSON.parse(readFileSync(join(configRoot, 'p69-carriage.json'), 'utf8'));
  } catch {
    carriage = null;
  }
  if (configRoot === '' || carriage === null) {
    refuse('a remote arm was chosen and there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs, which `npm run probe:p320` does.');
  }
  if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) {
    refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's own TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
  }
}
/** The real machine's facts, when that is the far side. */
let realFacts = null;
if (wantsMachine && FAR === 'real') {
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
const farTmux = FAR === 'loopback' ? (process.env['P320_FAR_TMUX'] ?? '').trim() || (carriage?.remoteTmuxPath ?? '') : realFacts?.realTmux ?? '';
if (wantsMachine && FAR === 'loopback') executable('P320_FAR_TMUX', farTmux);
const outDir = resolve(REPO, (process.env['P320_OUT_DIR'] ?? '').trim() || join('out', 'p320'));
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// The scratch world: one local project, one far folder, one HOME, one profile.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p320'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p320'));
const home = join(root, 'h');
const shHome = join(root, 'sh-home');
const project = join(root, 'alpha');
const farProjectLocal = join(root, 'far');
const logs = join(root, 'logs');
const profile = join(root, `p-${tag}`);
for (const d of [home, shHome, project, farProjectLocal, logs, profile]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
writeFileSync(join(home, '.zshrc'), "PS1='p320 %# '\n");
writeFileSync(join(home, '.hushlogin'), '');
// THE FIVE HIDDEN AGENTS (Phase 320.2, D9), before anything starts: this
// checkout's own overlay parser must hide them, and the overlay is the
// profile's agents.json before the launch, so the boot warm runs none of them.
const hiddenPre = hidden.hiddenAgentsPrecheck({ checkout, prefix: 'p320', home, userPath: process.env['PATH'] ?? '' });
if (!hiddenPre.ok) refuse(`${checkout}'s own overlay parser does not hide the five agents (exit ${String(hiddenPre.exit)}): ${hiddenPre.said}`);
hidden.writeHiddenAgents(profile, 'p320');
writeFileSync(join(project, 'README.md'), '# Phase 320, this Mac\n');
writeFileSync(join(farProjectLocal, 'README.md'), '# Phase 320, the loopback machine\n');
const NODE = process.execPath;
const FULLSCREEN = join(HERE, 'fullscreen.mjs');
const RECORDER = join(HERE, 'recorder.mjs');
for (const p of [NODE, FULLSCREEN, RECORDER, farProjectLocal, logs, shHome]) {
  if (/['\s]/.test(p)) refuse(`${p} holds a quote or a space, and it is typed into a shell as one word.`);
}

// ---------------------------------------------------------------------------
// The far side, one shape for both machines
// ---------------------------------------------------------------------------
/**
 * `tmux(args)` reads or acts on the FAR SCRATCH server (never his, never
 * `-L gmux`); `text(path)` reads a stand-in's log; `node` and `standIn(name)`
 * say what can run there; `logs` and `project` are where the far files go.
 */
let far = null;
let real = null;
const MACHINE_ID = FAR === 'real' ? 'p320real' : 'p320far';

function localTmux(args) {
  const r = spawnSync(localTmuxBin, ['-L', socket, ...args], { encoding: 'utf8', timeout: 10_000 });
  return (r.stdout ?? '').trim();
}

/** A2's mask, copied into this run's directory beside its conf. */
function writeMask() {
  const dir = join(root, 'mask');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  copyFileSync(join(REPO, 'build', 'p3201', 'version-mask.sh'), join(dir, 'tmux'));
  chmodSync(join(dir, 'tmux'), 0o755);
  writeFileSync(join(dir, 'version-mask.conf'), `P3201_MASK_REAL=${farTmux}\nP3201_MASK_VERSION=3.5a\n`);
  return join(dir, 'tmux');
}

const knownMachinesPath = join(profile, 'gmux', 'machines', 'known-machines');
let controlBefore = [];
if (wantsMachine) {
  const configDir = join(profile, 'gmux', 'config');
  mkdirSync(configDir, { recursive: true, mode: 0o700 });
  mkdirSync(dirname(knownMachinesPath), { recursive: true });
  if (FAR === 'loopback') {
    const remoteTmuxPath = on('A2') ? writeMask() : farTmux;
    writeFileSync(
      join(configDir, 'machines.json'),
      `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: 'p320 loopback', host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath }] })}\n`,
      'utf8'
    );
    writeFileSync(knownMachinesPath, keyscanText({ host: carriage.host, port: carriage.port, caller: CALLER }), 'utf8');
    const env = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
    far = {
      kind: 'loopback',
      tmux: (args) => (spawnSync(farTmux, ['-L', socket, '-f', '/dev/null', ...args], { encoding: 'utf8', env, timeout: 10_000 }).stdout ?? '').trim(),
      text: (path) => {
        try {
          return readFileSync(path, 'utf8');
        } catch {
          return '';
        }
      },
      node: NODE,
      standIn: (name) => join(HERE, name),
      logs,
      project: farProjectLocal,
      version: (spawnSync(farTmux, ['-V'], { encoding: 'utf8' }).stdout ?? '').trim()
    };
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
    writeFileSync(join(configDir, 'machines.json'), `${J({ schema: 1, machines: [machineRow({ id: MACHINE_ID, host: realFacts.host, user: realFacts.user, farDir: realFacts.farDir })] })}\n`, 'utf8');
    writeFileSync(knownMachinesPath, readFileSync(real.knownHosts, 'utf8'), 'utf8');
    far = {
      kind: 'real',
      tmux: (args) => real.tmux(args, { allowFail: true }).trim(),
      text: (path) => real.cat(path),
      node: real.node,
      standIn: (name) => real.standIns.find((p) => p.endsWith(`/${name}`)) ?? null,
      logs: `${realFacts.farDir}/logs`,
      project: `${realFacts.farDir}/far`,
      version: (real.first ?? '').split('\n').find((l) => /^tmux /.test(l)) ?? null
    };
    controlBefore = controlEntries();
  }
}
for (const p of [far?.logs, far?.project]) {
  if (typeof p === 'string' && /['\s]/.test(p)) refuse(`${p} holds a quote or a space, and it is typed into a shell as one word.`);
}

say(`${tag}: measuring ${checkout}, arms ${chosen.join(',')}, typing ${WHERE}, socket ${socket}`);
if (far !== null) say(`${tag}: the ${far.kind} machine runs ${far.kind === 'loopback' ? farTmux : realFacts.realTmux} (${String(far.version)})${far.kind === 'real' ? `, node ${far.node === null ? 'absent' : 'present'}` : `, sessions under ${String(carriage.tmuxTmp)}`}`);

// ---------------------------------------------------------------------------
// The page kit. One expression, evaluated once, that puts this probe's readers
// on window.__p320. The same text at HEAD and at any other checkout. No
// product file gains a hook: the Terminal is found through the React fiber of
// `.gmux-terminal-mount`, as probe:p292 finds it.
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
    return { left: b.left, top: b.top, width: b.width, height: b.height };
  };
  const kit = { term: null };
  kit.ready = () => {
    if (kit.term === null || !kit.term.element || !kit.term.element.isConnected) kit.term = findTerm();
    return kit.term !== null;
  };
  kit.rearm = () => { kit.term = null; return kit.ready(); };
  kit.mode = () => (kit.ready() ? String(kit.term.modes.mouseTrackingMode) : null);
  kit.row = (i) => {
    if (!kit.ready()) return null;
    const b = kit.term.buffer.active;
    const l = b.getLine(b.viewportY + (i < 0 ? kit.term.rows + i : i));
    return l ? l.translateToString(true) : null;
  };
  kit.lastRow = () => kit.row(-1);
  kit.screen = () => {
    if (!kit.ready()) return null;
    const b = kit.term.buffer.active;
    const rows = [];
    for (let i = 0; i < kit.term.rows; i += 1) {
      const l = b.getLine(b.viewportY + i);
      rows.push(l ? l.translateToString(true) : '');
    }
    const cur = b.getLine(b.baseY + b.cursorY);
    return { rows, cursorRow: cur ? cur.translateToString(true) : null, type: b.type };
  };
  kit.geometry = () => ({
    screen: box(document.querySelector('.xterm-screen')),
    rows: kit.term ? kit.term.rows : null,
    cols: kit.term ? kit.term.cols : null,
    mounts: document.querySelectorAll('.gmux-terminal-mount').length
  });
  kit.button = () => {
    const el = document.querySelector('.strip-readback');
    return el ? { box: box(el), title: el.getAttribute('title'), text: (el.textContent || '').trim() } : null;
  };
  // R5 (Phase 320.2): whether the Read Last Lines window is drawn. Its class,
  // by value, because a probe that read it from the source would agree with it.
  kit.linesWindow = () => document.querySelector('.remote-lines-modal') !== null;
  // R5: the bottom-right cell of the terminal, where the right-click goes.
  kit.lastCell = () => {
    const g = kit.geometry();
    if (!g.screen || !(g.rows > 0) || !(g.cols > 0)) return null;
    const w = g.screen.width / g.cols;
    const h = g.screen.height / g.rows;
    return { x: Math.round(g.screen.left + g.screen.width - w / 2), y: Math.round(g.screen.top + g.screen.height - h / 2) };
  };
  // T2: when the terminal's top row first changes after the swipe began.
  kit.watchTop = () => {
    const first = kit.row(0);
    const started = performance.now();
    kit.topMovedMs = null;
    if (kit.topTimer) clearInterval(kit.topTimer);
    kit.topTimer = setInterval(() => {
      if (kit.row(0) !== first) {
        kit.topMovedMs = Math.round(performance.now() - started);
        clearInterval(kit.topTimer);
        kit.topTimer = null;
      }
    }, 4);
    setTimeout(() => { if (kit.topTimer) { clearInterval(kit.topTimer); kit.topTimer = null; } }, 5000);
    return true;
  };
  // T3: leave for another session delta ms after the named key comes up.
  kit.leaveAfterKey = (key, delta, otherId) => {
    const h = (e) => {
      if (e.key !== key) return;
      document.removeEventListener('keyup', h, false);
      const go = () => { window.__gmuxP95.select(otherId); };
      if (delta >= 1) setTimeout(go, delta);
      else setTimeout(() => { const t = performance.now(); while (performance.now() - t < delta) { /* spin */ } go(); }, 0);
    };
    document.addEventListener('keyup', h, false);
    return true;
  };
  window.__p320 = kit;
  return true;
})()
`;

// ---------------------------------------------------------------------------
// The DevTools side.
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
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxP95 === 'object' ? location.href : null`, 5000);
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
    if (Date.now() - started > timeoutMs) throw new Error('no app window carrying the Phase 95 drive');
    await sleep(250);
  }
}

/** The MAIN process, over the node inspector `--inspect=0` opened (C1 and R5). */
async function cdpForMain(handle, timeoutMs) {
  const started = Date.now();
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) {
      try {
        return await wsConnect(m[1]);
      } catch {
        /* not up yet */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('the main process inspector never appeared');
    await sleep(300);
  }
}
async function mainEval(cdp, expression, ms = 20_000) {
  const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, ms);
  if (r.result?.exceptionDetails) throw new Error(`main threw: ${J(r.result.exceptionDetails).slice(0, 300)}`);
  return r.result?.result?.value;
}
/**
 * C1 reads the copy WITHOUT the person's pasteboard: `clipboard.write` in main
 * is replaced by a recorder for the length of the arm, and put back after.
 * When it cannot be replaced, the arm says so and runs nothing that would write
 * the real pasteboard.
 */
const CLIP_PATCH = `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { clipboard } = load('electron');
  if (globalThis.__p320Clip) return true;
  const original = clipboard.write;
  const rec = { original, writes: [] };
  const patched = (data) => { rec.writes.push(data); };
  try { clipboard.write = patched; } catch { return false; }
  if (clipboard.write !== patched) return false;
  globalThis.__p320Clip = rec;
  return true;
})()`;
const CLIP_READ = `JSON.stringify(globalThis.__p320Clip ? globalThis.__p320Clip.writes : null)`;
const CLIP_RESTORE = `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { clipboard } = load('electron');
  if (globalThis.__p320Clip) { clipboard.write = globalThis.__p320Clip.original; delete globalThis.__p320Clip; }
  return true;
})()`;

/**
 * R5 (Phase 320.2, D8) reads a right-click menu AS MAIN BUILT IT, without
 * raising it: `Menu.prototype.popup` is replaced by a recorder that keeps the
 * menu's rows and calls the popup's own close callback on the next turn,
 * opening nothing. A row is `—` for a separator, else its label with ` [off]`
 * when disabled; a scrollback row's numbers are whatever the session printed,
 * so its label is normalised to `Scrollback …`. The patch is proved to have
 * taken on a fresh menu, or the menu clause is unreadable. Why not the Phase
 * 198 knob: it answers only under GMUX_SHOT, which dispatches the screenshot
 * harness, and this round takes no screenshot.
 */
const MENU_PATCH = `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { Menu } = load('electron');
  if (globalThis.__p320Menu) return Menu.prototype.popup === globalThis.__p320Menu.patched;
  const original = Menu.prototype.popup;
  const rec = { original, patched: null, menus: [] };
  const rowOf = (item) => {
    if (item.type === 'separator') return '—';
    const label = String(item.label ?? '');
    return (label.startsWith('Scrollback ') ? 'Scrollback …' : label) + (item.enabled === false ? ' [off]' : '');
  };
  rec.patched = function (options) {
    rec.menus.push(this.items.map(rowOf));
    const done = options && typeof options.callback === 'function' ? options.callback : null;
    if (done !== null) setImmediate(() => done());
  };
  Menu.prototype.popup = rec.patched;
  globalThis.__p320Menu = rec;
  return Menu.buildFromTemplate([{ label: 'x' }]).popup === rec.patched;
})()`;
const MENU_COUNT = `(globalThis.__p320Menu ? globalThis.__p320Menu.menus.length : -1)`;
const MENU_READ = `JSON.stringify(globalThis.__p320Menu ? globalThis.__p320Menu.menus : null)`;
const MENU_RESTORE = `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { Menu } = load('electron');
  if (globalThis.__p320Menu) { Menu.prototype.popup = globalThis.__p320Menu.original; delete globalThis.__p320Menu; }
  return true;
})()`;
/** Every label of the application menu, submenus included, as `A > B`; `Open Recent`'s rows are what this run opened. */
const APP_MENU_READ = `JSON.stringify((() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { Menu } = load('electron');
  const top = Menu.getApplicationMenu();
  if (!top) return null;
  const out = [];
  const walk = (menu, path) => {
    for (const item of menu.items) {
      if (item.type === 'separator') continue;
      const label = String(item.label ?? '');
      const here = path === '' ? label : path + ' > ' + label;
      out.push(here);
      if (item.submenu && label !== 'Open Recent') walk(item.submenu, here);
    }
  };
  walk(top, '');
  return out;
})())`;
/**
 * R5's handler read (D11), through public Electron API: `ipcMain.handle`
 * throws "Attempted to register a second handler" exactly when a handler
 * exists, and when it does not throw the dummy is removed in the same turn.
 * `machines:listFiles` is the control and must read present.
 */
const HANDLER_READ = `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { ipcMain } = load('electron');
  const has = (channel) => {
    try { ipcMain.handle(channel, () => null); }
    catch (err) { return /second handler/i.test(String(err && err.message)); }
    ipcMain.removeHandler(channel);
    return false;
  };
  return { control: has('machines:listFiles'), removed: has('machines:readSessionLines') };
})()`;

/**
 * R5's store half, read as an artifact (§Attack A12): how often each of the
 * window's three names occurs in the checkout's built renderer chunks, preload
 * and main. Never `out/` whole: `out/p320/` holds readings that quote the
 * parent's menu. A store action whose name is in no shipped chunk cannot be
 * called by anything.
 */
function bundleCounts(dir) {
  const counts = Object.fromEntries(BUNDLE_NAMES.map((n) => [n, 0]));
  const files = [];
  const walk = (at) => {
    let entries = [];
    try {
      entries = readdirSync(at);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(at, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(?:js|cjs|mjs)$/.test(name)) files.push(full);
    }
  };
  for (const sub of [['out', 'renderer', 'assets'], ['out', 'preload'], ['out', 'main']]) walk(join(dir, ...sub));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const name of BUNDLE_NAMES) counts[name] += text.split(name).length - 1;
  }
  return files.length === 0 ? null : counts;
}

/** A stand-in's log, one record per line; a half written last line is skipped. */
function recordsOf(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    if (line.trim() === '') continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* the line being appended right now */
    }
  }
  return out;
}
const localRecords = (path) => {
  try {
    return recordsOf(readFileSync(path, 'utf8'));
  } catch {
    return [];
  }
};

async function waitFor(what, test, ms, every = 200) {
  const started = Date.now();
  for (;;) {
    const got = await test();
    if (got) return got;
    if (Date.now() - started > ms) throw new Error(`${what} did not happen within ${String(ms / 1000)} s`);
    await sleep(every);
  }
}

// US-layout virtual key codes for the characters these arms type.
function keyOf(ch) {
  if (/[a-z]/.test(ch)) return { vk: ch.toUpperCase().charCodeAt(0), code: `Key${ch.toUpperCase()}`, modifiers: 0 };
  if (/[0-9]/.test(ch)) return { vk: ch.charCodeAt(0), code: `Digit${ch}`, modifiers: 0 };
  if (ch === ' ') return { vk: 32, code: 'Space', modifiers: 0 };
  throw new Error(`no key for ${J(ch)}`);
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
const findings = Object.fromEntries([...ALL_ARMS, 'RUN'].map((a) => [a, []]));
/** Every `<arm>:<part>` that ran to its end; the summary prints `not run` for any other (D13). */
const partsDone = new Set();
const partsPlan = planParts(chosen, { local: typingLocal, remote: typingRemote && far !== null });
/** His three dotfiles on THIS Mac, when the far shell runs here (the loopback machine). */
const censusHere = far?.kind === 'loopback' ? localCensus() : null;

/**
 * The rows a copy must hold, from the SHIPPING clampHistoryRange, asked
 * through build/p320/clamp.mts under the pinned tsx (this file is plain node
 * and cannot import TypeScript). Answers `{ firstLine, paneRange }` or null.
 */
function shippingClamp(range, extent) {
  const out = spawnSync(process.execPath, [tsxCli(), '--tsconfig', join(REPO, 'tsconfig.node.json'), join(HERE, 'clamp.mts')], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, P320_CLAMP_IN: J({ range, extent }) },
    timeout: 60_000
  });
  try {
    return JSON.parse(String(out.stdout ?? '').trim());
  } catch {
    note(`C1: the shipping clamp did not answer (exit ${String(out.status)}): ${String(out.stderr ?? '').trim().slice(0, 200)}`);
    return null;
  }
}
const readings = { tag, checkout, socket, arms: chosen, where: WHERE, far: far === null ? null : { kind: far.kind, version: far.version, tmux: far.kind === 'loopback' ? farTmux : realFacts?.realTmux }, notes: [] };
const note = (l) => {
  readings.notes.push(l);
  say(`note: ${l}`);
};
readings.hiddenPrecheck = hiddenPre;
/** A reading that cannot be believed, which ends the run at exit 2 rather than as a finding (D9). */
let unreadable = null;

/**
 * The loopback machine's own tmux server, ended by the pid it reports through
 * the far binary this run used. build/with-scratch-machine.mjs ends it too; a
 * P320_FAR_TMUX of another version would not answer that reading, which is why
 * this one is here. On the real machine its `close()` does this and more.
 */
let farEnded = false;
function endFar() {
  if (farEnded) return;
  farEnded = true;
  if (far?.kind === 'loopback') {
    const pid = Number(far.tmux(['display-message', '-p', '#{pid}']));
    if (!Number.isInteger(pid) || pid <= 1) return;
    try {
      process.kill(pid, 'SIGKILL');
      say(`ended the loopback machine's tmux server, pid ${String(pid)}`);
    } catch {
      /* already gone */
    }
  } else if (real !== null) {
    real.close();
    readings.realCounts = { before: real.countBefore, after: real.countAfter };
    readings.realTeardown = real.teardown;
    readings.dotfiles = real.dotfiles;
    if (real.countBefore === null || real.countBefore !== real.countAfter) findings.RUN.push(`his own server held ${String(real.countBefore)} sessions before and ${String(real.countAfter)} after; the two counts must be read and equal`);
    if (real.teardown?.removed !== true) findings.RUN.push(`the run's directory ${realFacts.farDir} on the far machine was not confirmed removed; remove it by hand and say so`);
    const moved = dotfilesSentence('the far machine', real.dotfiles.moved, real.dotfiles.before, real.dotfiles.after);
    if (moved !== null) findings.RUN.push(moved);
  }
  // THIS MAC'S CENSUS (D12): the loopback machine's far shell is his own zsh
  // on this Mac, so its three dotfiles are read before and after the same way.
  if (censusHere !== null) {
    const after = localCensus();
    readings.dotfiles = { before: censusHere, after };
    const moved = dotfilesSentence('this Mac', dotfilesMoved(censusHere, after), censusHere, after);
    if (moved !== null) findings.RUN.push(moved);
  }
}
process.on('exit', endFar);

try {
  await withElectron(
    {
      label: `p320-${tag}`,
      userDataDir: profile,
      tmuxSocket: socket,
      cwd: checkout,
      args: [
        '--remote-debugging-port=0',
        ...(on('C1') || on('R5') ? ['--inspect=0'] : []),
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
        GMUX_SPECSTORY_NO_CLOUD: '1',
        ...(configRoot !== '' ? { GMUX_CONFIG_ROOT: configRoot } : {}),
        ...(FAR === 'loopback' && carriage !== null && typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {}),
        ...(FAR === 'real' && typeof process.env['SSH_AUTH_SOCK'] === 'string' ? { SSH_AUTH_SOCK: process.env['SSH_AUTH_SOCK'] } : {}),
        ...(tmuxOverride !== '' ? { GMUX_TMUX_BIN: tmuxOverride } : {})
      }),
      graceMs: 8_000,
      ceilingMs: 60 * 60 * 1000
    },
    async (handle) => {
      const { cdp, url } = await cdpForAppWindow(profile, 90_000);
      say(`${tag}: app window at ${url}, pid ${String(handle.appPid())}`);
      /** The scroll refusals the app printed, the operator's own symptom from Phase 95. */
      const scrollErrors = () => handle.text().split('\n').filter((l) => l.includes("handler for 'terminal:scroll")).length;
      const d = (method, ...args) =>
        cdpEval(
          cdp,
          `(async () => { const d = window.__gmuxP95; if (d === undefined) return { missing: true }; return await d.${method}(${args.map((a) => J(a)).join(', ')}); })()`,
          120_000
        );
      const kit = (expr, ms = 5000) => cdpEval(cdp, `window.__p320.${expr}`, ms);
      let stage = 'launch';
      try {
        await cdp.call('Runtime.enable');
        await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
        await waitFor('the page load', async () => (await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0, 30_000, 50);
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(600);
        await cdpEval(cdp, PAGE_KIT);

        // THE FIVE HIDDEN AGENTS (D9), read back from the app's own scan before
        // any arm. A scan that resolved one of them is UNREADABLE: the run ends
        // at exit 2 and no arm runs.
        stage = 'the hidden agents';
        {
          let scan = null;
          try {
            scan = JSON.parse(await cdpEval(cdp, hidden.AGENTS_LIST_EXPR, 90_000));
          } catch {
            scan = null;
          }
          const verdict = hidden.hiddenAgentsScanVerdict(scan);
          readings.hiddenScan = verdict;
          if (!verdict.ok) {
            unreadable = `UNREADABLE: the five hidden agents were not hidden in the app's own scan: ${verdict.said}`;
            throw new Error(unreadable);
          }
          say(`${tag}: ${verdict.said}`);
        }

        /** Show a session and wait until its terminal is the one mounted. */
        const show = async (id) => {
          await d('select', id);
          await waitFor(`the terminal of ${id}`, async () => (await kit('rearm()')) && (await kit('geometry()')).mounts === 1, 20_000);
          return kit('geometry()');
        };
        /** The terminal's centre and one line's height, for the wheel. */
        const centre = async () => {
          const g = await kit('geometry()');
          if (g.screen === null || !(g.rows > 0)) throw new Error('the terminal has no screen to point at');
          return { x: Math.round(g.screen.left + g.screen.width / 2), y: Math.round(g.screen.top + g.screen.height / 2), cell: g.screen.height / g.rows, g };
        };
        /** `n` real wheel notches toward older lines over the terminal. */
        const wheel = async (n) => {
          const c = await centre();
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
          for (let i = 0; i < n; i += 1) {
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: c.x, y: c.y, deltaX: 0, deltaY: -notchPx(c.cell) });
            await sleep(NOTCH_GAP_MS);
          }
          await sleep(1500);
        };
        /** One wheel event of `lines` lines (negative is toward live), at once. */
        const wheelLines = (c, lines) => cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: c.x, y: c.y, deltaX: 0, deltaY: -c.cell * lines });
        /** One real key, down and up, on the element xterm listens on. */
        const key = async (ch) => {
          const k = keyOf(ch);
          const b = { key: ch, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk, modifiers: k.modifiers };
          await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, ...b }, 5000);
          await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...b }, 5000);
        };
        /** A real click in the terminal, which is where the keyboard goes. */
        const focusTerminal = async () => {
          const c = await centre();
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
          await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: c.x, y: c.y, button: 'left', buttons: 1, clickCount: 1 });
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c.x, y: c.y, button: 'left', buttons: 0, clickCount: 1 });
          await sleep(200);
        };
        /** Wait for the shell to draw something, then type one line into it through the bridge. */
        const typeLine = async (line) => {
          await waitFor('a prompt', async () => ((await kit('screen()'))?.rows ?? []).some((r) => r.trim() !== ''), 30_000);
          if (!(await d('type', `${line}\r`))) throw new Error('the drive had no session to type into');
        };

        // ------------------------------------------------ where things run
        /** One place's tools: its tmux reader, its logs and its node. */
        const placeOf = (where) =>
          where === 'local'
            ? { where, tmux: localTmux, text: (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } }, node: NODE, standIn: (n) => join(HERE, n), logs }
            : { where, tmux: far.tmux, text: far.text, node: far.node, standIn: far.standIn, logs: far.logs };
        /** The pane of a session this run made, found on its own server by its tmux name. */
        const paneOf = (place, tmuxName) => {
          const line = place.tmux(['list-panes', '-a', '-F', '#{session_name}\t#{pane_id}\t#{session_id}']).split('\n').find((l) => l.split('\t')[0] === tmuxName);
          if (line === undefined) throw new Error(`no pane of ${tmuxName} on the ${place.where} server`);
          const [, pane, sid] = line.split('\t');
          return { pane, sid };
        };
        const factsOf = (place, pane) => {
          const [m, p, mode] = place.tmux(['display-message', '-p', '-t', pane, '#{pane_in_mode}\t#{scroll_position}\t#{pane_mode}']).split('\t');
          return { inMode: Number(m) || 0, position: Number(p) || 0, paneMode: mode ?? '' };
        };
        /** A ruler: the recorder when node is there, else raw cat into a file. */
        const launchRuler = async (place, name, history, extra = '') => {
          if (place.node !== null && place.standIn('recorder.mjs') !== null) {
            const log = `${place.logs}/recorder-${name}.jsonl`;
            // `--max-ms` past the Electron's own ceiling: the recorder ends
            // ITSELF after 15 minutes by default, and one recorder session
            // carries T1 to T5, C1 and A1, which together run longer.
            await typeLine(` exec ${place.node} ${place.standIn('recorder.mjs')} --log ${log} --history ${String(history)} --max-ms ${String(RECORDER_MAX_MS)}${extra}`);
            await waitFor(`the ${name} recorder to start`, async () => place.text(log).includes('"ready"'), 30_000);
            const offset = () => recordsOf(place.text(log)).length;
            const bytesSince = (o) => {
              let bytes = '';
              for (const r of recordsOf(place.text(log)).slice(o)) if (r.kind === 'input') bytes += Buffer.from(r.hex ?? '', 'hex').toString('latin1');
              return bytes;
            };
            const chunksSince = (o) => recordsOf(place.text(log)).slice(o).filter((r) => r.kind === 'input').map((r) => ({ t: r.t, bytes: Buffer.from(r.hex ?? '', 'hex').toString('latin1') }));
            return { kind: 'recorder', log, offset, bytesSince, chunksSince };
          }
          const file = `${place.logs}/typed-${name}.txt`;
          await typeLine(` exec /bin/sh -c 'seq 1 ${String(history)}; stty raw -echo; exec cat > ${file}'`);
          await sleep(1500);
          const offset = () => place.text(file).length;
          return { kind: 'cat', log: file, offset, bytesSince: (o) => place.text(file).slice(o), chunksSince: () => [] };
        };
        /** Back to live output with no prompt and no mode, then settle. */
        const reset = async (place, pane, sessionId) => {
          for (let i = 0; i < 8; i += 1) {
            if (promptOnRow(await kit('lastRow()'))) await cdpEval(cdp, `(window.gmux.term.sendInput(${J(sessionId)}, String.fromCharCode(27)), true)`);
            place.tmux(['send-keys', '-t', pane, '-X', 'cancel']);
            // Every mode, not only copy mode: T4 leaves clock, tree and options
            // mode behind, and `copy-mode -q` leaves each of them on 3.6a and
            // 3.7b (measured for this probe).
            place.tmux(['copy-mode', '-q', '-t', pane]);
            await sleep(120);
            const f = factsOf(place, pane);
            if (f.inMode === 0 && !promptOnRow(await kit('lastRow()'))) break;
          }
          await sleep(700);
        };

        const ids = {};
        const panes = {};
        const sessionRow = async (id) => ((await d('state')).sessions ?? []).find((s) => s.id === id);

        // ------------------------------------------------ the far machine
        if (wantsMachine) {
          stage = 'machine';
          const up = await d('machineUp', MACHINE_ID);
          readings.machine = up;
          if (!(up.rows ?? []).some((r) => r.id === MACHINE_ID && r.usable)) throw new Error(`the ${far.kind} machine is not usable: ${J(up).slice(0, 600)}`);
          if (far.kind === 'real') {
            // PROVE THE SOCKET AND THE QUIET SHELL before any session is made
            // there: the socket is this run's own, the server's default-shell
            // is /bin/sh and its ZDOTDIR the run's empty zdot (D12).
            const why = real.prove();
            if (why !== null) throw new Error(`the far socket is not this run's own: ${why}. Nothing was made there.`);
            say('real machine: the socket is this run\'s own, inside its directory, its shell /bin/sh with the run\'s own ZDOTDIR, and nothing else is there');
            // The app's own ssh master, kept for the teardown only when it is
            // provably this run's: new since launch and naming this profile.
            const master = real.adoptAppControl(controlBefore, profile);
            if (master !== null) note(`real machine: ${master}`);
          } else {
            // THE QUIET SHELL on the loopback machine (D12), proved before any
            // session of this run is made: the far shell is his own zsh on this
            // Mac, so its rc files and history must be the yard's empty ones.
            const zdot = far.tmux(['show-environment', '-g', 'ZDOTDIR']);
            const want = `ZDOTDIR=${join(configRoot, 'zdot')}`;
            if (zdot !== want) throw new Error(`the loopback machine's far shell is not the quiet one (ZDOTDIR reads ${J(zdot)}, not ${J(want)}); run it with SCRATCH_MACHINE_QUIET_SHELL=1, which npm run probe:p320 sets. Nothing was made there.`);
            say('loopback machine: its far shell reads the yard\'s own empty ZDOTDIR, so it writes none of his history');
          }
          let opened = null;
          for (let attempt = 1; attempt <= 6; attempt += 1) {
            opened = await d('openRemote', MACHINE_ID, far.project);
            if (opened?.result?.ok === true) break;
            await sleep(3000);
          }
          if (opened?.result?.ok !== true) throw new Error(`the far folder did not open: ${J(opened?.result ?? null).slice(0, 400)}`);
          const needs = [
            ['fs', on('R1') || on('R7') || on('R5') || on('A2')],
            ['alt', on('R3')],
            // R5 reads the right-click menu on the remote plain shell R2
            // scrolls: the full-screen stand-in asks for the mouse and takes a
            // right-click as a report (Phase 320.2).
            ['sh', on('R2') || on('A2') || on('R5')],
            ['rec', typingRemote && (on('T1') || on('T2') || on('T3') || on('T4')) || on('T5') || on('C1') || on('A1')],
            ['other', typingRemote && on('T3')],
            ['keys', on('T6')]
          ];
          for (const [k, needed] of needs) {
            if (!needed) continue;
            const name = `p320-${k}`;
            const state = await d('create', { name, agent: 'shell', machineId: MACHINE_ID });
            const row = (state.sessions ?? []).find((s) => s.name === name);
            if (row === undefined || row.machineId !== MACHINE_ID) throw new Error(`${name} did not start on the machine: ${J(state.sessions ?? null).slice(0, 400)}`);
            ids[k] = row.id;
          }
          say(`${tag}: remote sessions ${J(ids)}`);
        }
        let localOpen = false;
        const createLocal = async (name) => {
          if (!localOpen) {
            await d('openLocal', project);
            localOpen = true;
          }
          const state = await d('create', { name, agent: 'shell' });
          const row = (state.sessions ?? []).find((s) => s.name === name && s.machineId === null);
          if (row === undefined) throw new Error(`the local session ${name} did not start: ${J(state.sessions ?? null).slice(0, 400)}`);
          return row;
        };

        const launchFullscreen = async (place, log, mouse, extra = '') => {
          await typeLine(` exec ${place.node} ${place.standIn('fullscreen.mjs')} --log ${log} --mouse ${mouse}${extra}`);
          await waitFor(`the ${mouse} stand-in to start`, async () => recordsOf(place.text(log)).some((r) => r.kind === 'ready'), 30_000);
        };
        const farPlace = far === null ? null : placeOf('remote');
        const herePlace = placeOf('local');
        /** A part of an arm ran to its end (the summary's `not run` is every part that did not). */
        const finish = (arm, part) => partsDone.add(`${arm}:${part}`);

        // ------------------------------------------------ the toggle stand-in (R1, R7, R1L, R7L)
        /** Whether a toggle stand-in holds the screen and the mouse, by its own records. */
        const holdingOf = (records) => {
          let held = false;
          for (const r of records) {
            if (r.kind === 'took') held = true;
            else if (r.kind === 'gave') held = false;
          }
          return held;
        };
        /** Every mode left, so a byte the probe sends reaches the program and not copy mode. */
        const toLive = async (place, pane) => {
          for (let i = 0; i < 8; i += 1) {
            place.tmux(['send-keys', '-t', pane, '-X', 'cancel']);
            place.tmux(['copy-mode', '-q', '-t', pane]);
            await sleep(100);
            if (factsOf(place, pane).inMode === 0) return;
          }
        };
        /** Make the stand-in hold, or let go, by its one byte, sent to its pane on its own server. */
        const holdTo = async (place, pane, log, hold) => {
          await toLive(place, pane);
          if (holdingOf(recordsOf(place.text(log))) === hold) return;
          place.tmux(['send-keys', '-t', pane, '-H', hold ? '0e' : '0f']);
          await waitFor(`the stand-in to ${hold ? 'take' : 'give back'} the mouse`, async () => holdingOf(recordsOf(place.text(log))) === hold, 10_000, 50);
        };
        /** `n` real notches, NOTCH_GAP_MS apart, and no settle after. */
        const notchesNow = async (n) => {
          const c = await centre();
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
          for (let i = 0; i < n; i += 1) {
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: c.x, y: c.y, deltaX: 0, deltaY: -notchPx(c.cell) });
            await sleep(NOTCH_GAP_MS);
          }
        };
        /**
         * R1 and R1L, THE WAIT SWEEP. The stand-in rests long enough for main's
         * poll to read it at rest (so the renderer holds exactly the stale read
         * the first attempt trusted), asks for the mouse on its byte, and the
         * notches follow `wait` ms after. The far server's own reading of the
         * pane after a 1 s settle, with the program still holding the mouse, is
         * the grade.
         */
        const sweep = async (arm, place, sessionId, log) => {
          await show(sessionId);
          const row = await sessionRow(sessionId);
          const pane = paneOf(place, row.tmuxName).pane;
          const rows = [];
          for (const wait of R1_WAITS) {
            for (let run = 1; run <= SWEEP_RUNS; run += 1) {
              await holdTo(place, pane, log, false);
              await sleep(1500);
              const offset = recordsOf(place.text(log)).length;
              place.tmux(['send-keys', '-t', pane, '-H', '0e']);
              const askedAt = Date.now();
              await sleep(Math.max(0, askedAt + wait - Date.now()));
              const mode = await kit('mode()');
              await notchesNow(SWEEP_NOTCHES);
              await sleep(SWEEP_SETTLE_MS);
              const f = factsOf(place, pane);
              const recs = recordsOf(place.text(log)).slice(offset);
              const after = tally(recs, 0);
              rows.push({ wait, run, reports: after.up, notches: SWEEP_NOTCHES, parkedAfter: f.inMode > 0, took: recs.some((r) => r.kind === 'took'), mode });
            }
            const g = rows.filter((r) => r.wait === wait);
            say(`${arm} W ${String(wait)} ms: reports ${J(g.map((r) => r.reports))} of ${String(SWEEP_NOTCHES)} each, left in copy mode ${String(g.filter((r) => r.parkedAfter).length)} of ${String(g.length)}, xterm read ${J([...new Set(g.map((r) => r.mode))])} at the first notch`);
          }
          await holdTo(place, pane, log, false);
          return rows;
        };
        /** R7 and R7L: the stand-in holds and the reads know it, then it lets go and the notches follow. */
        const letGo = async (arm, place, sessionId, log) => {
          await show(sessionId);
          const row = await sessionRow(sessionId);
          const pane = paneOf(place, row.tmuxName).pane;
          const rows = [];
          for (const wait of R7_WAITS) {
            for (let run = 1; run <= SWEEP_RUNS; run += 1) {
              await holdTo(place, pane, log, true);
              await sleep(1500);
              const offset = recordsOf(place.text(log)).length;
              place.tmux(['send-keys', '-t', pane, '-H', '0f']);
              const letAt = Date.now();
              await sleep(Math.max(0, letAt + wait - Date.now()));
              await notchesNow(SWEEP_NOTCHES);
              await sleep(SWEEP_SETTLE_MS);
              const recs = recordsOf(place.text(log)).slice(offset);
              const bytes = tally(recs, 0).bytes;
              const f = factsOf(place, pane);
              rows.push({ wait, run, gave: recs.some((r) => r.kind === 'gave'), arrows: arrowCount(bytes), bytes: shown(bytes).slice(0, 200), parkedAfter: f.inMode > 0 });
            }
            const g = rows.filter((r) => r.wait === wait);
            say(`${arm} W ${String(wait)} ms: arrow keys ${J(g.map((r) => r.arrows))}; parked by the wheel afterwards, printed only, ${String(g.filter((r) => r.parkedAfter).length)} of ${String(g.length)}`);
          }
          await holdTo(place, pane, log, false);
          return rows;
        };

        // ------------------------------------------------ R3 and R3L's shared run
        const altRun = async (place, sessionId, name) => {
          const log = `${place.logs}/fullscreen-none-${name}.jsonl`;
          await show(sessionId);
          await launchFullscreen(place, log, 'none');
          await sleep(800);
          const mode = await kit('mode()');
          const offset = recordsOf(place.text(log)).length;
          const errs = scrollErrors();
          await wheel(NOTCHES);
          const after = tally(recordsOf(place.text(log)), offset);
          return { mode, bytes: after.bytes, errors: scrollErrors() - errs };
        };

        // ------------------------------------------------ the typing arms, per place
        /** A recorder session at `where`, set up once, with its pane and ruler. */
        const typingSessions = {};
        const typingSession = async (where) => {
          if (typingSessions[where] !== undefined) return typingSessions[where];
          const place = placeOf(where);
          const id = where === 'local' ? (await createLocal('p320-rec-local')).id : ids.rec;
          await show(id);
          const ruler = await launchRuler(place, where, 300);
          const row = await sessionRow(id);
          const { pane, sid } = paneOf(place, row.tmuxName);
          typingSessions[where] = { where, place, id, ruler, pane, sid, tmuxName: row.tmuxName };
          return typingSessions[where];
        };
        const otherOf = async (where) => (where === 'local' ? (await createLocal('p320-other-local')).id : ids.other);
        /** Park the pane about `lines` back through real wheel events; false when it will not park. */
        const parkWith = async (s, lines) => {
          const c = await centre();
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
          for (let i = 0; i < 40; i += 1) {
            await wheelLines(c, 10);
            await sleep(60);
            if (factsOf(s.place, s.pane).position >= lines) break;
          }
          await sleep(700);
          return factsOf(s.place, s.pane).position > 0;
        };
        const perWhere = (arm) => {
          readings[arm] = readings[arm] ?? {};
          return readings[arm];
        };
        /** One carriage round trip as the app makes it, timed: a read of a remote session through the drive. */
        const rtt = async (sessionId) => {
          const started = performance.now();
          await d('read', sessionId);
          return performance.now() - started;
        };

        const t1 = async (where) => {
          stage = `T1 ${where}`;
          const s = await typingSession(where);
          await show(s.id);
          await focusTerminal();
          const rows = [];
          for (let run = 0; run < T1_RUNS; run += 1) {
            await reset(s.place, s.pane, s.id);
            const o = s.ruler.offset();
            const c = await centre();
            await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
            const start = Date.now() + 30;
            const at = (ms, fn) => new Promise((done) => setTimeout(() => fn().then(done, done), Math.max(0, start + ms - Date.now())));
            const jobs = [];
            for (let k = 0; k < M3.events; k += 1) jobs.push(at(k * M3.gapMs, () => wheelLines(c, 1)));
            [...TYPED].forEach((ch, k) => jobs.push(at(M3.typeFromMs + k * M3.keyGapMs, () => key(ch))));
            await Promise.all(jobs);
            await sleep(M3.settleMs);
            const f = factsOf(s.place, s.pane);
            const lastRow = await kit('lastRow()');
            await sleep(far?.kind === 'real' ? 1500 : 300);
            const got = s.ruler.bytesSince(o);
            rows.push({ got, lastRow, paneMode: f.paneMode, inMode: f.inMode, position: f.position });
          }
          const pool = t1Pool(rows);
          perWhere('T1')[where] = rows;
          say(`T1 ${where}: lost ${String(pool.lost)} of ${String(pool.typed)} over ${String(pool.runs)} runs, left open ${String(pool.leftOpen)}, in copy mode after the settle ${String(pool.inModeAfter)} (not graded)`);
          if (where === 'remote') findings.T1.push(...remoteTypingFindings('T1', rows));
          finish('T1', where);
        };

        const t2 = async (where) => {
          stage = `T2 ${where}`;
          const s = await typingSession(where);
          await show(s.id);
          await focusTerminal();
          const rows = [];
          const rtts = [];
          for (const gap of T2_GAPS) {
            if (where === 'remote') for (let i = 0; i < 5; i += 1) rtts.push(await rtt(s.id));
            for (let run = 0; run < 10; run += 1) {
              await reset(s.place, s.pane, s.id);
              const c = await centre();
              await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y });
              const o = s.ruler.offset();
              await key('x');
              const swipeAt = Date.now() + gap;
              await sleep(Math.max(0, swipeAt - Date.now()));
              await kit('watchTop()');
              for (let k = 0; k < T2_LINES; k += 1) {
                await wheelLines(c, 1);
                await sleep(Math.max(0, swipeAt + (k + 1) * 16 - Date.now()));
              }
              await sleep(1200);
              const f = factsOf(s.place, s.pane);
              const moved = await kit('topMovedMs');
              await sleep(far?.kind === 'real' && where === 'remote' ? 800 : 200);
              const got = s.ruler.bytesSince(o);
              rows.push({ gap, lines: f.inMode > 0 ? f.position : 0, firstMovedMs: moved, got, delivered: got === 'x' });
            }
          }
          if (where === 'remote') for (let i = 0; i < 5; i += 1) rtts.push(await rtt(s.id));
          perWhere('T2')[where] = rows;
          if (where === 'remote') {
            readings.T2rtt = { samples: rtts.map((ms) => Math.round(ms * 10) / 10), slowest: Math.max(...rtts) };
            say(`T2 remote: carriage round trips read through the app ${J(readings.T2rtt.samples)} ms, the slowest ${readings.T2rtt.slowest.toFixed(1)}; D6's bound on the first moved line is ${Math.round(firstMoveBoundMs(readings.T2rtt.slowest))} ms`);
          }
          for (const gap of T2_GAPS) {
            const g = rows.filter((r) => r.gap === gap);
            say(`T2 ${where} G ${String(gap)}: key delivered ${String(g.filter((r) => r.delivered).length)} of ${String(g.length)}, lines moved ${J(g.map((r) => r.lines))}, first moved after ${J(g.map((r) => r.firstMovedMs))} ms`);
          }
          // The remote rows are graded against this Mac's, after this Mac's run
          // (below), and the remote part is finished there.
          if (where === 'local') finish('T2', 'local');
        };

        const t3 = async (where) => {
          stage = `T3 ${where}`;
          const s = await typingSession(where);
          const other = await otherOf(where);
          const rows = [];
          for (const delta of T3_DELTAS) {
            for (let run = 0; run < 10; run += 1) {
              await show(s.id);
              await reset(s.place, s.pane, s.id);
              await focusTerminal();
              const parked = await parkWith(s, 100);
              const o = s.ruler.offset();
              await kit(`leaveAfterKey('x', ${String(delta)}, ${J(other)})`);
              await key('x');
              await sleep(3000);
              const got = s.ruler.bytesSince(o);
              rows.push({ delta, parked, got, typed: 'x' });
            }
          }
          await show(s.id);
          perWhere('T3')[where] = rows;
          for (const delta of T3_DELTAS) {
            const g = rows.filter((r) => r.delta === delta);
            say(`T3 ${where} δ ${String(delta)}: delivered ${String(g.filter((r) => r.got === 'x').length)} of ${String(g.length)} (parked ${String(g.filter((r) => r.parked).length)})`);
          }
          if (where === 'remote') findings.T3.push(...remoteTypingFindings('T3', rows));
          finish('T3', where);
        };

        const t4 = async (where) => {
          stage = `T4 ${where}`;
          const s = await typingSession(where);
          await show(s.id);
          const rows = [];
          for (const [mode, verb] of [['clock', 'clock-mode'], ['tree', 'choose-tree'], ['options', 'customize-mode']]) {
            await reset(s.place, s.pane, s.id);
            await focusTerminal();
            s.place.tmux([verb, '-t', s.pane]);
            await sleep(1500);
            const o = s.ruler.offset();
            const sentAt = Date.now();
            await key('b');
            await sleep(35);
            await key('c');
            await sleep(2500);
            const got = s.ruler.bytesSince(o);
            const chunks = s.ruler.chunksSince(o).map((c) => ({ bytes: c.bytes, afterMs: c.t - sentAt }));
            s.place.tmux(['copy-mode', '-q', '-t', s.pane]);
            rows.push({ mode, got, chunks });
            say(`T4 ${where} ${mode}: delivered ${J(got)}, ${J(chunks)}`);
          }
          perWhere('T4')[where] = rows;
          if (where === 'remote') {
            // A key in a mode goes to the mode at the parent too: printed here,
            // graded against the parent by --compare (delivered at least as much).
            note(`T4 remote readings are printed beside the parent's: ${J(rows.map((r) => [r.mode, r.got]))}`);
          }
          finish('T4', where);
        };

        /** One T6 key, typed as a person types it: text through xterm's input, or a real key with its modifiers. */
        const typeOne = async (k) => {
          if (typeof k.insert === 'string') {
            await cdp.call('Input.insertText', { text: k.insert }, 5000);
            return;
          }
          const b = { key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk, modifiers: k.modifiers ?? 0 };
          await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...(typeof k.text === 'string' ? { text: k.text, unmodifiedText: k.text } : {}), ...b }, 5000);
          await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...b }, 5000);
        };

        // ------------------------------------------------ R5's menu reader (Phase 320.2)
        /**
         * One half of R5: a FRESH main inspector session, the recorder put in and
         * proved, `body(main, took)` run, then the recorder taken out and the
         * session closed whatever happened, so C1, which runs after R5, finds
         * the inspector free (§Attack A4).
         */
        const withMenuRecorder = async (body) => {
          let main = null;
          try {
            main = await cdpForMain(handle, 30_000);
            const took = (await mainEval(main, MENU_PATCH)) === true;
            return await body(main, took);
          } finally {
            if (main !== null) {
              await mainEval(main, MENU_RESTORE).catch(() => undefined);
              try {
                main.close();
              } catch {
                /* closed */
              }
            }
          }
        };
        /**
         * Show a session, clear its selection, put a REAL right-click on its
         * bottom-right cell, and answer the rows of the one menu main built for
         * it within 3 s, or null when the recorder did not take or no menu came.
         */
        const rightClickMenu = async (main, took, sessionId) => {
          await show(sessionId);
          await cdpEval(cdp, '(window.__p320.term && window.__p320.term.clearSelection(), true)');
          if (!took) return null;
          const before = Number(await mainEval(main, MENU_COUNT));
          const cell = await kit('lastCell()');
          if (cell === null) return null;
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cell.x, y: cell.y });
          await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: cell.x, y: cell.y, button: 'right', buttons: 2, clickCount: 1 });
          await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cell.x, y: cell.y, button: 'right', buttons: 0, clickCount: 1 });
          const deadline = Date.now() + 3000;
          while (Date.now() < deadline && Number(await mainEval(main, MENU_COUNT)) <= before) await sleep(100);
          const menus = JSON.parse((await mainEval(main, MENU_READ)) ?? 'null') ?? [];
          return menus.length > before ? menus[menus.length - 1] : null;
        };

        // ================================================ THE REMOTE ARMS, FIRST (D13)
        let r3 = null;
        if (far !== null) {
          // ------------------------------------------------------------- R1 and R7
          if ((on('R1') || on('R7')) && ids.fs !== undefined) {
            if (far.node === null || far.standIn('fullscreen.mjs') === null) {
              note('R1 and R7: the far machine\'s node did not answer, so the stand-in cannot run there; both print not run (set P3201_REAL_NODE)');
            } else {
              stage = on('R1') ? 'R1' : 'R7';
              const fsLog = `${far.logs}/fullscreen-toggle.jsonl`;
              await show(ids.fs);
              await launchFullscreen(farPlace, fsLog, 'any', ' --toggle --history 200');
              if (on('R1')) {
                stage = 'R1';
                const rows = await sweep('R1', farPlace, ids.fs, fsLog);
                readings.R1 = rows;
                findings.R1.push(...sweepFindings('R1', rows));
                finish('R1', 'remote');
              }
              if (on('R7')) {
                stage = 'R7';
                const rows = await letGo('R7', farPlace, ids.fs, fsLog);
                readings.R7 = rows;
                findings.R7.push(...letGoFindings('R7', rows));
                finish('R7', 'remote');
              }
            }
          }

          // ------------------------------------------------------------- A2's full-screen program
          if (on('A2') && ids.fs !== undefined) {
            stage = 'A2';
            if (far.node === null) {
              note('A2: the far machine has no node, so the fullscreen stand-in cannot run there');
            } else {
              const log = `${far.logs}/fullscreen-any.jsonl`;
              await show(ids.fs);
              await launchFullscreen(farPlace, log, 'any');
              const mode = await waitFor('xterm to read the far program\'s mouse mode', async () => ((await kit('mode()')) === 'any' ? 'any' : null), 10_000).catch(async () => kit('mode()'));
              const offset = recordsOf(far.text(log)).length;
              const topBefore = topAt(recordsOf(far.text(log)), offset);
              await wheel(NOTCHES);
              const after = tally(recordsOf(far.text(log)), offset);
              readings.A2fullscreen = { mode, notches: NOTCHES, topBefore, after };
              say(`A2: xterm mode ${String(mode)}; ${String(NOTCHES)} notches -> ${String(after.up)} up reports; top line ${String(topBefore)} -> ${String(after.top)}`);
            }
          }

          // ------------------------------------------------------------- R5, the remote half
          // Phase 320.2: the window is gone. The band, a remote session's
          // right-click menu as main built it, the application menu, the old
          // harness knob, the bridge member, main's handler and the built
          // bundle, all in this half; this Mac's menu is read FIRST under "THEN
          // THIS MAC" below, and only then is R5 graded (§Attack A3).
          if (on('R5')) {
            stage = 'R5';
            const r5 = { notes: [], menus: { remote: null, local: null }, scrollbackRows: { remote: null, local: null }, appMenu: null, opened: null, bridge: null, handler: null, bundle: null };
            readings.R5 = r5;
            await withMenuRecorder(async (main, took) => {
              // The band, unchanged (320.1): read on the full-screen session.
              await show(ids.fs);
              for (const o of ['top', 'right']) {
                const st = await d('orientation', o);
                r5.notes.push(st.note ?? null);
              }
              await d('orientation', 'top');
              // A remote session's menu, on the plain shell.
              if (!took) note('R5: Menu.prototype.popup could not be replaced in main, so the remote menu was not read');
              r5.menus.remote = await rightClickMenu(main, took, ids.sh);
              r5.scrollbackRows.remote = r5.menus.remote === null ? null : r5.menus.remote.some((row) => SCROLLBACK_ROW.test(row));
              // The application menu, Open Recent's rows left out.
              r5.appMenu = JSON.parse((await mainEval(main, APP_MENU_READ)) ?? 'null');
              // The window, through the old harness knob: at HEAD the knob is
              // gone and nothing opens; at the parent it opens.
              const shName = (await sessionRow(ids.sh))?.name ?? 'p320-sh';
              const drive = await cdpEval(
                cdp,
                `(async () => { try { await window.__gmuxShotDrive(${J({ remoteLines: { session: shName, waitMs: 30_000 } })}); return true; } catch (err) { return String(err); } })()`,
                60_000
              );
              if (drive !== true) note(`R5: the harness drive answered ${J(drive)}`);
              r5.opened = await waitFor('the Read Last Lines window', async () => (await kit('linesWindow()')) === true, 5000, 100).then(
                () => true,
                () => false
              );
              if (r5.opened) {
                await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
                await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
                await waitFor('the window to close', async () => (await kit('linesWindow()')) === false, 3000, 100).catch(() => note('R5: the Read Last Lines window did not close on Escape'));
              }
              // The bridge member, from the page, and main's handler (D11).
              r5.bridge = await cdpEval(cdp, 'typeof window.gmux?.machines?.readSessionLines');
              r5.handler = await mainEval(main, HANDLER_READ);
            });
            // The store's half, read as an artifact of the build this run measures.
            r5.bundle = bundleCounts(checkout);
            say(`R5 remote: band ${J(r5.notes)}; menu ${J(r5.menus.remote)}; window opened ${String(r5.opened)}; bridge ${String(r5.bridge)}; handler ${J(r5.handler)}; bundle ${J(r5.bundle)}`);
            finish('R5', 'remote');
          }

          // ------------------------------------------------------------- R3, graded against R3L below
          if (on('R3')) {
            stage = 'R3';
            // THE REMOTE PROJECT RE-OPENED before its session is shown (D13): the
            // first attempt ran R3L first, left this Mac's project showing, and
            // R3's stand-in never started at either build.
            await d('openRemote', MACHINE_ID, far.project);
            r3 = await altRun(farPlace, ids.alt, 'remote');
            readings.R3 = { ...r3, bytes: shown(r3.bytes) };
            say(`R3: the stand-in on the machine received ${String(r3.bytes.length)} bytes`);
          }

          // ------------------------------------------------------------- R2 and A2's shell
          if ((on('R2') || on('A2')) && ids.sh !== undefined) {
            stage = on('A2') ? 'A2' : 'R2';
            await show(ids.sh);
            const PROMPT = 'p320$';
            await typeLine(` exec /usr/bin/env -i PATH=/usr/bin:/bin HOME=${far.kind === 'loopback' ? shHome : far.project} HISTFILE=/dev/null TERM="$TERM" BASH_SILENCE_DEPRECATION_WARNING=1 PS1='${PROMPT} ' /bin/sh`);
            await waitFor('the plain shell\'s prompt', async () => ((await kit('screen()'))?.cursorRow ?? '').trim() === PROMPT, 20_000);
            await d('type', 'seq 1 200; echo p320-marker\r');
            await waitFor('the marker to print and the prompt to return', async () => {
              const sc = await kit('screen()');
              return (sc?.rows ?? []).some((r) => r.trim() === 'p320-marker') && (sc?.cursorRow ?? '').trim() === PROMPT;
            }, 10_000);
            const shRow = await sessionRow(ids.sh);
            const shPane = paneOf(farPlace, shRow.tmuxName).pane;
            const modeShell = await kit('mode()');
            const errs = scrollErrors();
            await wheel(NOTCHES);
            const parkedShell = factsOf(farPlace, shPane);
            const shellErrors = scrollErrors() - errs;
            await focusTerminal();
            await key('x');
            await sleep(1500);
            const afterKey = factsOf(farPlace, shPane);
            const cursor = ((await kit('screen()'))?.cursorRow ?? '').trimEnd();
            await d('type', '\u007f');
            say(`${stage}: the plain shell (xterm mode ${String(modeShell)}) under ${String(NOTCHES)} notches: mode ${String(parkedShell.inMode)}, position ${String(parkedShell.position)}; after one key: mode ${String(afterKey.inMode)}, line ${J(cursor)}`);
            if (on('R2')) {
              findings.R2.push(...parkFindings({ what: 'a plain shell', parked: parkedShell, wheelBytes: '', errors: shellErrors, key: { live: afterKey.inMode === 0, delivered: cursor.endsWith(`${PROMPT} x`) ? 'x' : cursor, expected: 'x' } }));
            }
            // The recorder, exec'd from that shell, is the byte-exact ruler.
            const ruler = await launchRuler(farPlace, 'r2', 200);
            await sleep(500);
            const modeRec = await kit('mode()');
            const o = ruler.offset();
            const errs2 = scrollErrors();
            await wheel(NOTCHES);
            const parkedRec = factsOf(farPlace, shPane);
            const wheelBytes = ruler.bytesSince(o);
            const o2 = ruler.offset();
            await focusTerminal();
            await key('x');
            await sleep(1500);
            const recAfter = factsOf(farPlace, shPane);
            const delivered = ruler.bytesSince(o2);
            readings.R2 = { shell: { mode: modeShell, parked: parkedShell, afterKey, cursor, errors: shellErrors }, recorder: { mode: modeRec, parked: parkedRec, wheelBytes: shown(wheelBytes), delivered: shown(delivered), live: recAfter.inMode === 0, errors: scrollErrors() - errs2 }, ruler: ruler.kind };
            say(`${stage}: the recorder under ${String(NOTCHES)} notches: mode ${String(parkedRec.inMode)}, position ${String(parkedRec.position)}, ${String(wheelBytes.length)} bytes from the wheel; the next key arrived as ${J(delivered)}`);
            if (on('R2')) {
              findings.R2.push(...parkFindings({ what: 'the recorder', parked: parkedRec, wheelBytes, errors: scrollErrors() - errs2, key: { live: recAfter.inMode === 0, delivered, expected: 'x' } }));
              finish('R2', 'remote');
            }
            if (on('A2')) {
              const read = (await d('read', ids.sh))?.state ?? null;
              readings.A2 = { read, parkedShell, parkedRec, wheelBytes: shown(wheelBytes) };
              findings.A2.push(
                ...unmeasuredFindings({
                  read,
                  fullscreen: readings.A2fullscreen ?? { mode: null, notches: NOTCHES, topBefore: null, after: tally([], 0) },
                  shell: { notches: NOTCHES, what: 'a plain program on a machine with an unmeasured tmux', after: { bytes: wheelBytes }, mode: modeRec, parked: parkedRec, errors: scrollErrors() - errs2 }
                })
              );
              finish('A2', 'remote');
            }
          }

          // ------------------------------------------------------------- T1 to T4 on the machine
          if (typingRemote) {
            if (on('T1')) await t1('remote');
            if (on('T2')) await t2('remote');
            if (on('T3')) await t3('remote');
            if (on('T4')) await t4('remote');
          }

          // ------------------------------------------------------------- T6
          if (on('T6') && ids.keys !== undefined) {
            stage = 'T6';
            await show(ids.keys);
            const keyRuler = await launchRuler(farPlace, 'keys', 300, ' --app-cursor');
            const keyRow = await sessionRow(ids.keys);
            const k6 = { place: farPlace, pane: paneOf(farPlace, keyRow.tmuxName).pane, id: ids.keys };
            const rows = [];
            for (const k of T6_KEYS) {
              await reset(k6.place, k6.pane, k6.id);
              await focusTerminal();
              const o1 = keyRuler.offset();
              await typeOne(k);
              await sleep(far.kind === 'real' ? 1500 : 900);
              const live = keyRuler.bytesSince(o1);
              await reset(k6.place, k6.pane, k6.id);
              await focusTerminal();
              const parked = await parkWith(k6, 30);
              const o2 = keyRuler.offset();
              await typeOne(k);
              await sleep(far.kind === 'real' ? 2000 : 1200);
              const got = keyRuler.bytesSince(o2);
              const after = factsOf(k6.place, k6.pane);
              rows.push({ name: k.name, graded: k.graded, live, parked: got, wasParked: parked, liveAfter: after.inMode === 0 });
              say(`T6 ${k.name}: live ${J(shown(live))}, over a parked pane (${parked ? 'parked' : 'DID NOT PARK'}) ${J(shown(got))}${k.graded ? '' : ', printed only (D7\'s stated limit)'}`);
            }
            readings.T6 = rows.map((r) => ({ ...r, live: shown(r.live), parked: shown(r.parked) }));
            findings.T6.push(...keysFindings(rows));
            for (const r of rows.filter((x) => x.graded && x.wasParked !== true)) findings.T6.push(`T6 ${r.name}: the pane did not park before the key, so the parked half was not measured`);
            finish('T6', 'remote');
          }

          // ------------------------------------------------------------- C1
          if (on('C1')) {
            stage = 'C1';
            const s = await typingSession('remote');
            await show(s.id);
            const marker = 'LOCAL-ONLY-';
            // THE HOSTILE FIXTURE: a session on THIS Mac's harness server with the
            // far session's name and other text. Never Tortie's: it carries no id.
            localTmux(['new-session', '-d', '-s', s.tmuxName, '-x', '150', '-y', '40', `/bin/sh -c 'i=1; while [ $i -le 400 ]; do echo ${marker}$i; i=$((i+1)); done; exec /bin/cat'`]);
            let main = null;
            let patched = false;
            try {
              main = await cdpForMain(handle, 30_000);
              patched = (await mainEval(main, CLIP_PATCH)) === true;
            } catch (err) {
              note(`C1: the main process could not be reached (${err instanceof Error ? err.message : String(err)})`);
            }
            if (!patched) {
              findings.C1.push('C1 the copy could not be read without writing the person\'s own pasteboard, so it was not made');
            } else {
              try {
                await reset(s.place, s.pane, s.id);
                await focusTerminal();
                await parkWith(s, 100);
                const c = await centre();
                const g = c.g;
                const pressX = Math.round(g.screen.left + g.screen.width - 3);
                const pressY = Math.round(g.screen.top + g.screen.height - c.cell * 2);
                await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pressX, y: pressY });
                await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: pressX, y: pressY, button: 'left', buttons: 1, clickCount: 1 });
                const edgeX = Math.round(g.screen.left + 1);
                const edgeY = Math.round(g.screen.top - 12);
                for (let i = 1; i <= 6; i += 1) {
                  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(pressX + ((edgeX - pressX) * i) / 6), y: Math.round(pressY + ((edgeY - pressY) * i) / 6), button: 'left', buttons: 1 });
                  await sleep(60);
                }
                await sleep(1500);
                await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: edgeX, y: edgeY, button: 'left', buttons: 0, clickCount: 1 });
                await sleep(300);
                const cmdC = { key: 'c', code: 'KeyC', windowsVirtualKeyCode: 67, nativeVirtualKeyCode: 67, modifiers: 4 };
                await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...cmdC });
                await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...cmdC });
                await sleep(3000);
                const writes = JSON.parse((await mainEval(main, CLIP_READ)) ?? 'null') ?? [];
                const copied = String(writes[writes.length - 1]?.text ?? '');
                // THE ROWS THE SHIPPING CLAMP NAMES (D13). The extent the far
                // server reports now, and a PHYSICAL dump (no -J) for the
                // buffer's own line numbering: a -J dump joins a wrapped row
                // with the next, which is the reverify's one-row offset.
                const history = Number(s.place.tmux(['display-message', '-p', '-t', s.pane, '#{history_size}'])) || 0;
                const paneRows = Number(s.place.tmux(['display-message', '-p', '-t', s.pane, '#{pane_height}'])) || 0;
                const physical = s.place.tmux(['capture-pane', '-p', '-S', '-', '-E', '-', '-t', s.pane]).split('\n');
                // THE FIX ROUND: the grade is the far pane's own text, read
                // in ONE joined dump, never an index mapped through a second
                // read (that mapping was one row early at both builds).
                const joined = s.place.tmux(['capture-pane', '-p', '-J', '-S', '-', '-E', '-', '-t', s.pane]).split('\n');
                const rows = copied.split('\n').map((l) => l.trimEnd());
                const range = copiedRange(physical, rows);
                const clamp = range === null ? null : shippingClamp(range, { history, rows: paneRows });
                const run = farRunOf(joined, rows);
                const farText = run === null ? null : run.text;
                const a = clamp?.paneRange?.start ?? null;
                const b = clamp?.paneRange?.end ?? null;
                const copiedTrim = rows.join('\n');
                readings.C1 = { copied: copiedTrim.slice(0, 4000), far: farText === null ? null : farText.slice(0, 4000), writes: writes.length, range, extent: { history, rows: paneRows }, clamp, a, b, farRunStart: run?.start ?? null, joinedRows: joined.length, farBytes: farText?.length ?? null, rows: rows.length };
                say(`C1: the copy held ${String(rows.length)} rows (${String(copiedTrim.length)} bytes), first ${J(rows[0] ?? null)}; it is ${run === null ? 'NOT a run of' : `the run at joined row ${String(run.start)} of`} the far pane's own ${String(joined.length)} rows; printed, not graded: the shipping clamp names ${J(clamp)} over history ${String(history)} and ${String(paneRows)} rows`);
                findings.C1.push(...copyFindings({ copied: copiedTrim, far: farText, a, b, localMarker: marker, rows: rows.length, screenRows: g.rows }));
              } finally {
                if (main !== null) {
                  await mainEval(main, CLIP_RESTORE).catch(() => undefined);
                }
              }
            }
            try {
              main?.close();
            } catch {
              /* closed */
            }
            localTmux(['kill-session', '-t', `=${s.tmuxName}`]);
            finish('C1', 'remote');
          }

          // ------------------------------------------------------------- T5
          if (on('T5')) {
            stage = 'T5';
            const s = await typingSession('remote');
            await show(s.id);
            const controls = () => far.tmux(['list-clients', '-F', '#{client_control_mode}']).split('\n').filter((l) => l.trim() === '1').length;
            const runs = [];
            for (const [label, holdMs] of [['outage', 0], ['outage', 0], ['outage', 0], ['outage held 15 s, printed', 15_000]]) {
              await reset(s.place, s.pane, s.id);
              await focusTerminal();
              const parked = await parkWith(s, 100);
              const o = s.ruler.offset();
              // THE DROP: the far scratch server detaches Tortie's control client.
              // Never a signal to a `-C` client (research 131 §3.5).
              far.tmux(['detach-client', '-s', 'gmux-control']);
              const dropAt = Date.now();
              for (const ch of 'fix') {
                await key(ch);
                await sleep(35);
              }
              const holdUntil = Date.now() + holdMs;
              while (Date.now() < holdUntil) {
                if (controls() > 0) far.tmux(['detach-client', '-s', 'gmux-control']);
                await sleep(100);
              }
              let backAt = 0;
              const deadline = Date.now() + 40_000;
              while (Date.now() < deadline) {
                if (controls() > 0) {
                  backAt = Date.now();
                  break;
                }
                await sleep(25);
              }
              await sleep(4000);
              const got = s.ruler.bytesSince(o);
              const before = s.ruler.chunksSince(o).filter((c) => c.t < backAt).map((c) => c.bytes).join('');
              const f = factsOf(s.place, s.pane);
              const r = { label, parked, typed: 'fix', got, before, live: f.inMode === 0, backAt: backAt > 0 ? backAt - dropAt : 0 };
              runs.push(r);
              say(`T5 ${label}: parked ${String(parked)}, the connection back ${String(r.backAt)} ms after the drop, ${J(got)} delivered, ${J(before)} before it was back, live ${String(r.live)} (graded against the parent only)`);
              if (label === 'outage') findings.T5.push(...outageFindings(r));
            }
            readings.T5 = runs;
            finish('T5', 'remote');
          }

          // ------------------------------------------------------------- A1, LAST: it ends the far server
          if (on('A1')) {
            stage = 'A1';
            const s = await typingSession('remote');
            await show(s.id);
            await reset(s.place, s.pane, s.id);
            await focusTerminal();
            await parkWith(s, 100);
            const oldId = s.sid;
            const n = Number(oldId.slice(1));
            const pid = Number(far.tmux(['display-message', '-p', '#{pid}']));
            if (far.kind !== 'loopback' || !Number.isInteger(pid) || pid <= 1) throw new Error('A1 runs on the loopback machine and needs the far scratch server\'s pid');
            // SIGTERM, then SIGKILL after five seconds: a tmux server on SIGTERM
            // waits for every client to leave, and it is a SERVER, the scratch
            // one, so a SIGKILL is safe where one to a `-C` client never is.
            process.kill(pid, 'SIGTERM');
            const gone = async () => far.tmux(['display-message', '-p', '#{pid}']) === '';
            await waitFor('the far scratch server to end', gone, 5_000, 50).catch(async () => {
              note(`A1: the far scratch server ${String(pid)} outlived SIGTERM by five seconds, so it was sent SIGKILL`);
              try {
                process.kill(pid, 'SIGKILL');
              } catch {
                /* gone in between */
              }
              await waitFor('the far scratch server to end after SIGKILL', gone, 5_000, 50);
            });
            // A NEW server on the SAME scratch socket, with foreign sessions up to
            // the old $N, in one invocation so they take the ids before anything
            // else can. They are this probe's, never Tortie's: they carry no id.
            const chain = [];
            for (let k = 0; k <= n; k += 1) chain.push(...(k === 0 ? [] : [';']), 'new-session', '-d', '-s', `p320-foreign-${String(k)}`, '/bin/cat');
            far.tmux(chain);
            const listed = () => far.tmux(['list-panes', '-a', '-F', '#{session_id}\t#{session_name}\t#{pane_in_mode}']).split('\n').filter((l) => l.trim() !== '').map((l) => l.split('\t'));
            const foreign = listed().filter((r) => (r[1] ?? '').startsWith('p320-foreign-'));
            const reused = foreign.some((r) => r[0] === oldId);
            const inMode = [];
            const started = Date.now();
            // The old pane's attach died with its server, so the pane may no
            // longer be drawn; the wheel then goes nowhere, which is said.
            await wheel(NOTCHES).catch((err) => note(`A1: the wheel over the old pane went nowhere (${err instanceof Error ? err.message : String(err)})`));
            while (Date.now() - started < 60_000) {
              for (const r of listed()) {
                if ((r[1] ?? '').startsWith('p320-foreign-') && Number(r[2]) > 0 && !inMode.some((h) => h.id === r[0])) inMode.push({ id: r[0], afterMs: Date.now() - started });
              }
              await sleep(500);
            }
            readings.A1 = { oldId, foreign: foreign.length, reused, inMode };
            say(`A1: the far server restarted; ${String(foreign.length)} foreign sessions, ${oldId} reused ${String(reused)}; entered a mode: ${J(inMode)}`);
            findings.A1.push(...reuseFindings({ oldId, foreign: foreign.length, reused, inMode }));
            finish('A1', 'remote');
          }
        }

        // ================================================ THEN THIS MAC
        // ------------------------------------------------------------- R5, this Mac's half, FIRST
        // A session on this Mac's right-click menu, read the same way in a
        // fresh main session of its own, BEFORE R3L: R5's remote half ran in the
        // remote group, and every remote arm runs before any arm touches this
        // Mac (§Attack A3). Then R5 is graded, once both menus are read.
        if (on('R5') && readings.R5 !== undefined) {
          stage = 'R5 local';
          const row = await createLocal('p320-r5l');
          await withMenuRecorder(async (main, took) => {
            if (!took) note('R5: Menu.prototype.popup could not be replaced in main, so this Mac\'s menu was not read');
            readings.R5.menus.local = await rightClickMenu(main, took, row.id);
            readings.R5.scrollbackRows.local = readings.R5.menus.local === null ? null : readings.R5.menus.local.some((r) => SCROLLBACK_ROW.test(r));
          });
          say(`R5 local: menu ${J(readings.R5.menus.local)}`);
          finish('R5', 'local');
          findings.R5.push(...windowFindings(readings.R5));
        }

        // ------------------------------------------------------------- R3L, and R3 graded against it
        if (on('R3L') || (on('R3') && r3 !== null)) {
          stage = 'R3L';
          const row = await createLocal('p320-alt-local');
          const r3l = await altRun(herePlace, row.id, 'local');
          readings.R3L = { ...r3l, bytes: shown(r3l.bytes) };
          say(`R3L: the stand-in on this Mac (xterm mode ${String(r3l.mode)}) received ${String(r3l.bytes.length)} bytes from ${String(NOTCHES)} notches`);
          if (on('R3L')) {
            if (r3l.bytes.length === 0) findings.R3L.push('R3L the alternate-screen stand-in on this Mac received 0 bytes under the notches; on this Mac it scrolls through xterm\'s alternate-scroll keys');
            finish('R3L', 'local');
          }
          if (on('R3') && r3 !== null) {
            findings.R3.push(...remoteAltFindings(r3.bytes));
            if (r3.errors > 0) findings.R3.push(`R3 the wheel printed ${String(r3.errors)} scroll error line(s) in the app's log`);
            finish('R3', 'remote');
          }
        }

        // ------------------------------------------------------------- R6
        if (on('R6')) {
          stage = 'R6';
          const row = await createLocal('p320-fs-local');
          const log = join(logs, 'fullscreen-local.jsonl');
          await show(row.id);
          await launchFullscreen(herePlace, log, 'any');
          const mode = await waitFor('xterm to read the local program\'s mouse mode', async () => ((await kit('mode()')) === 'any' ? 'any' : null), 10_000).catch(async () => kit('mode()'));
          const offset = localRecords(log).length;
          const topBefore = topAt(localRecords(log), offset);
          await wheel(NOTCHES);
          const after = tally(localRecords(log), offset);
          readings.R6 = { mode, notches: NOTCHES, topBefore, after: { ...after, bytes: shown(after.bytes).slice(0, 400), other: shown(after.other) } };
          say(`R6: xterm mode ${String(mode)}; ${String(NOTCHES)} notches -> ${String(after.up)} up reports; top line ${String(topBefore)} -> ${String(after.top)}`);
          findings.R6.push(...wheelFindings({ mode, notches: NOTCHES, topBefore, after }, 'R6'));
          finish('R6', 'local');
        }

        // ------------------------------------------------------------- R1L and R7L
        if (on('R1L') || on('R7L')) {
          stage = on('R1L') ? 'R1L' : 'R7L';
          const row = await createLocal('p320-fs-toggle-local');
          const log = join(logs, 'fullscreen-toggle-local.jsonl');
          await show(row.id);
          await launchFullscreen(herePlace, log, 'any', ' --toggle --history 200');
          if (on('R1L')) {
            stage = 'R1L';
            const rows = await sweep('R1L', herePlace, row.id, log);
            readings.R1L = rows;
            // Graded against the parent by --compare (§9); in the run only a
            // run that measured nothing is a finding.
            findings.R1L.push(...sweepFindings('R1L', rows).filter((f) => /measured nothing|read no run/.test(f)));
            finish('R1L', 'local');
          }
          if (on('R7L')) {
            stage = 'R7L';
            const rows = await letGo('R7L', herePlace, row.id, log);
            readings.R7L = rows;
            findings.R7L.push(...letGoFindings('R7L', rows).filter((f) => /measured nothing|read no run/.test(f)));
            finish('R7L', 'local');
          }
        }

        // ------------------------------------------------------------- T1 to T4 on this Mac
        if (typingLocal) {
          if (on('T1')) await t1('local');
          if (on('T2')) await t2('local');
          if (on('T3')) await t3('local');
          if (on('T4')) await t4('local');
        }

        // ------------------------------------------------------------- T2 remote, graded against this Mac's
        if (on('T2') && Array.isArray(readings.T2?.remote)) {
          stage = 'T2 remote grade';
          const localRows = Array.isArray(readings.T2?.local) ? readings.T2.local : null;
          if (localRows === null) note('T2 remote: this Mac\'s T2 was not read in this invocation (P320_WHERE=remote), so the lines moved are printed and not graded; the key and D6\'s bound are graded');
          findings.T2.push(...swipeFindings(readings.T2.remote, localRows, readings.T2rtt?.slowest ?? null));
          finish('T2', 'remote');
        }

        readings.scrollErrorsTotal = scrollErrors();
        stage = 'done';
      } catch (err) {
        findings.RUN.push(`the run stopped during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        try {
          writeFileSync(join(outDir, `app-${tag}.log`), handle.text());
        } catch {
          /* the readings are the evidence; this is the footnote */
        }
        cdp.close();
      }
    }
  );
} catch (err) {
  findings.RUN.push(`the launch did not complete: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  endFar();
}

// -- the report ---------------------------------------------------------------
const readingsPath = join(outDir, `readings-${tag}-${far?.kind ?? 'local'}-${String(Date.now())}.json`);
writeFileSync(readingsPath, `${J({ findings, readings })}\n`);
say('');
say(`arm   ${tag.toUpperCase()}${far !== null ? `, the ${far.kind} machine on ${String(far.version)}` : ''}`);
// EVERY ARM AFTER A STAGE THAT THREW PRINTS `not run`, never PASS (D13).
for (const [arm, verdict] of summaryRows(partsPlan, partsDone, findings)) say(`${arm.padEnd(5)} ${verdict}`);
readings.summary = summaryRows(partsPlan, partsDone, findings);
const notRun = readings.summary.filter(([, v]) => v.startsWith('not run')).map(([a]) => a);
if (notRun.length > 0 && findings.RUN.length === 0) findings.RUN.push(`${notRun.join(', ')} did not run to their end, so nothing they would have graded was read`);
say(`readings: ${readingsPath}`);
if (tag === 'checkout') {
  say('this run measured ANOTHER checkout. At 320.1\'s parent R2, R5, C1, T6 and the remote T2 are expected to FAIL (nothing on a machine parks), and R1, R3, R7, R3L, R6, A1, A2 and the remote T1 and T3 to pass; R1L, R7L and T5 are graded against HEAD by --compare. At 320.2\'s parent (d9f98b54) R5 is expected to FAIL on exactly its five window clauses (the row, the window, the member, the handler and the bundle) and on nothing else, and R2 to pass; R5X grades the menus across the builds. Grade what spans the two builds with --compare.');
}
// THE HIDDEN AGENTS (D9): a scan that resolved one of the five is not a
// finding about the build, it is a run that cannot be believed. Exit 2.
if (unreadable !== null) {
  process.stderr.write(`${TAG} ${unreadable}\n`);
  process.exit(2);
}
const failures = [...ALL_ARMS, 'RUN'].flatMap((arm) => findings[arm].map((f) => `${tag.toUpperCase()} ${f}`));
if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${TAG}   ${f}\n`);
  process.stderr.write(`${TAG} ${tag === 'checkout' ? `${checkout} FAILED` : 'FAILED'}: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say(`PASS: ${tag} has 0 findings on ${chosen.join(', ')}.`);
process.exit(0);
