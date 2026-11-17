#!/usr/bin/env node
/**
 * probe:p360 — THE PHASE 360 APP RUN (build/p360/SPEC.md §8): a create whose
 * later step fails answers a failure for the session it started at the PARENT,
 * so the ⌘T sheet stays open and a second press starts a second session; at
 * HEAD the sheet closes on the session it started and the server holds one.
 *
 * ## The shape
 *
 * TWO LAUNCHES PER BUILD, THE PARENT'S FIRST, NEVER TWO ELECTRONS AT ONCE, each
 * through build/electron-run.mjs's `withElectron` on its OWN fresh scratch
 * profile, a scratch HOME (ZDOTDIR the same, HISTFILE=/dev/null, SHELL=/bin/sh,
 * no TERM_SESSION_ID, TERM_PROGRAM or SSH_AUTH_SOCK) and the socket
 * build/harness-socket.mjs hands this file (`gmux-p360…`), named as the
 * launch's `tmuxSocket` so the helper's census reads his session count before
 * and after (read only, `list-sessions`, by the helper alone). A latch ends a
 * launch's store, which is why there are six launches: launch 1 runs L3, R6, R5
 * and L1 (L1 latches, so it is last), launch 2 runs L2, and since his second
 * ruled round (2026-11-16) launches 3 to 6 run R7L, R7, RF and RN, one each,
 * and since his third (2026-11-17) launch 7 runs RFL.
 *
 * THE WORLD, before each launch: build/p3167/seed-sessions.mts --shape his
 * writes his recorded shape into that launch's scratch manifest (354 rows,
 * counts only; no manifest of his is read), then the window opens one scratch
 * project and creates three live shells; launch 1 also confirms and prepares
 * the loopback machine and opens one remote tab on it.
 *
 * THE FAULTS, every one made in scratch, and NO product seam is added (D17):
 *   - THIS MAC's tmux is build/p360/local-tmux.sh, copied beside an env file
 *     and named by GMUX_TMUX_BIN: it logs every command and can hold ONE (the
 *     create's `new-session -P` answer, or the `@gmux-agent` stamp) until a
 *     release file appears, capped at 4,000 ms. A hold puts the arm's fault
 *     strictly after the spawn (§0.1 item 6).
 *   - Phase 357's harness-only seam (GMUX_HARNESS_MANIFEST_FAULT,
 *     src/main/harness/manifest-fault.ts), armed DURING a hold, its armed line
 *     read on the app's own output before the hold is released.
 *   - A REAL held SQLite write lock: /usr/bin/sqlite3 on the scratch manifest
 *     holding `BEGIN IMMEDIATE` on its standard input, proved by a second
 *     sqlite3 with `.timeout 0` meeting "database is locked" (§0.1 item 5).
 *   - ANOTHER MACHINE is ONLY the loopback machine of build/scratch-machine.mjs
 *     (`scratchYard`/`scratchMachine` with SCRATCH_MACHINE_QUIET_SHELL=1,
 *     SCRATCH_MACHINE_SCRATCH_HOME=1 and SCRATCH_MACHINE_NO_OWN_KEYS=1, set by
 *     this file before the yard is built: no key of his is read), reached only
 *     through an ssh wrapper named by GMUX_SSH_BIN (`-F none`, the yard's port
 *     first, the yard's key always named), its tmux build/p326/far-tmux.sh
 *     beside its env and rules files, and a scratch far home whose `.zshenv`
 *     arm R5 writes. Never build/with-scratch-machine.mjs, whose isolated()
 *     reads ~/.ssh/config.
 *
 * Tailscale is a wrapper named by GMUX_TAILSCALE_BIN that answers nothing, so
 * no real Tailscale can run; no DNS, APNs or phone is touched (the pocket door
 * stays off). NO AGENT RUNS, not even for a version: every launch hides every
 * probed registry row (build/hidden-agents.mjs) and reads agents:list back, and
 * a launch whose answer is not ok is UNREADABLE. Every arm runs shells.
 *
 * ## The arms (P360_ARMS, a comma separated subset of L3,R6,R5,L1,L2,R7L,R7,RF,RN,RFL; all by default)
 *
 *   L3 (launch 1) a real busy write after the spawn: the parent's sheet shows
 *      the busy error and a second press makes a second session; HEAD's sheet
 *      closes on the session after the busy wait, the window draws it, ONE new
 *      session, one `sessions` warn for the record write naming SQLITE_BUSY.
 *   R6 (launch 1) another machine, not listed back: the far wrapper holds the
 *      `@gmux-id` stamp 1,500 ms and, during that hold, the next list 12,000 ms,
 *      past REMOTE_POLL_TIMEOUT_MS. The parent says "…could not find a session
 *      called … Nothing was changed." and a second press makes two over there;
 *      HEAD closes on the session, ONE over there, its row unreachable and then
 *      its own status.
 *   R5 (launch 1) another machine, a login file prints first: the yard's
 *      `.zshenv` echoes a line. The parent answers SPAWN_FAILED carrying that
 *      line in its detail (read off the bridge's own rejection line in the app's
 *      output), drops the row while the session runs, and a second press makes
 *      two; HEAD closes on the session bound by its id, ONE over there stamped
 *      `@gmux-id`, and no byte of the line in a sentence, a toast, app.log or a
 *      rejection (each rejection read whole). HEAD's arm needs D11's own line
 *      saying the answer was not one session id, or it is UNREADABLE: without
 *      it the line never reached the create.
 *   L1 (launch 1, last: it latches) the store stopped at the record write. BY
 *      HIS RULING OF 2026-11-14 ("360 a") both builds answer alike here: the
 *      stopped sentence, again on a second press with nothing spawned, ONE
 *      session. HEAD is told apart by app.log alone: one manifest.stopped
 *      naming updateSession and one `sessions` warn for each of record and
 *      read-back, where the parent's create wrote none.
 *   L2 (launch 2) the store stopped at the broadcast's read: both builds the
 *      stopped sentence, ONE session; HEAD's app.log holds one read-back warn
 *      and the parent's none. Which read took the throw is printed.
 *   L1 and L2, AT BOTH BUILDS (the fix round, from the attack lens's arm W, and
 *      since his ruled round IN A BUSY WINDOW): the window is put on the world's
 *      first shell before the press, its terminal drawn with nothing over it;
 *      that shell then prints without pause and the window runs one long task
 *      (SPIN_MS) across the release of the hold, so the create's answer and
 *      the stopped notice queue behind it together, which is how the fix
 *      round's reverify saw the answer overtake the notice and the window move
 *      in 7 of 7. After the create the window is still on that shell, its
 *      terminal drawn with nothing over it. Main opens no session on this Mac
 *      while the list is stopped, so a window that landed on the new session
 *      drew "Can't connect to this session" and had closed the one in use; the
 *      parent never moved. A reading in which the shell did not print, the
 *      long task did not span the release, or the notice and the create's
 *      answer did not both queue behind it is UNREADABLE, never a pass.
 *   R7L, R7, RF, RN (launches 3 to 6, HIS SECOND RULED ROUND, 2026-11-16): a
 *      create on ANOTHER MACHINE during which the session list stops after
 *      that machine answered. The far wrapper holds the create's own
 *      `@gmux-id` stamp, which the create sends only once it read the answer,
 *      and the seam is armed inside that hold. His first ruling's check made
 *      HEAD say "Restart Tortie, then try again" there for a session running
 *      over there, 7 of 7 in the last reverify, where the parent closed the
 *      sheet 7 of 7; his second ruling asks it of a create on this Mac alone.
 *        R7L  from a tab on this Mac, the sheet's Machine field set to the
 *             machine; the stop at the create's tab write
 *             (`clearProjectTabClosed`, after the far create returned). BOTH
 *             BUILDS, one grader: the sheet closes on the session, ONE over
 *             there stamped, the window stays on the session in use (this
 *             Mac's) or moves to the new session, the parent's own race run to
 *             run since real keys are typed first (R7L_GRADER says why), and
 *             where it stayed real keystrokes still reach it; a second Create
 *             is refused with the stopped sentence and nothing is started over
 *             there.
 *        R7   from the machine's own tab, the session in use a session on that
 *             machine; the same stop. BOTH BUILDS, one grader: the sheet
 *             closes, ONE over there stamped, the session in use opens again
 *             drawn with nothing over it, a second Create refused. Where the
 *             window landed and what it drew is printed (the parent landed on
 *             a row frozen at unknown 3 of 4 in the reverify).
 *        RF   from the machine's tab; the stop while the far create is out, by
 *             this probe's own read of the session list during the stamp hold
 *             standing in for a status tick, so the create's own list meets a
 *             stopped store (the feed's write) BEFORE that machine's create
 *             returned. BY HIS THIRD RULING (2026-11-17, "360 a then ship
 *             115.0") BOTH BUILDS, ONE GRADER, the parent's answer: the stopped
 *             sentence with the sheet open, ONE over there stamped, the window
 *             stays on the session in use and it still takes real keystrokes,
 *             and app.log holds no line that the list could not be started
 *             (D27: the feed lets the stopped refusal through first, as at the
 *             parent). His second ruled round's HEAD closed the sheet here and
 *             landed the window on the new session, drawn "Machine
 *             unreachable", which took 0 of 4 real keystrokes.
 *        RN   RF with R6's list hold, so no list shows the session. BOTH
 *             BUILDS, ONE GRADER, the parent's answer: the stopped sentence
 *             (the held list timed out and the feed's verdict write met the
 *             stopped store), ONE over there stamped, the window stays and
 *             takes real keystrokes, and no line of D12 or D13.
 *        RFL  (his third ruled round) RF's stop from a tab on THIS Mac holding
 *             two shells, the FIRST in use, the far create made through the
 *             sheet's Machine field. BOTH BUILDS, ONE GRADER, the parent's
 *             answer, as RF's. His second ruled round's HEAD closed the sheet
 *             and the window fell back to the tab's last shell, drawn "Can't
 *             connect", and the first shell was lost until a restart (3 of 3).
 *      In every one a second Create from a fresh sheet is refused with the
 *      stopped sentence and nothing is started over there, at both builds.
 *      R7L, R7, RF and RFL are creates a list of that machine HAS shown, and a
 *      run in which none had (D12's line in HEAD's app.log) is UNREADABLE,
 *      never a verdict: there D26 answers the stopped sentence, which is RN's
 *      arm (the probe review of his second ruled round).
 *
 *      REAL KEYSTROKES (his third ruled round). Every typing reading is made as
 *      a person types: a mouse press and release at the centre of the
 *      session's terminal, Shift pressed and let go (it sends nothing, and its
 *      key-up clears xterm's note of a key still down, under which xterm drops
 *      inserted text), the text through CDP's Input.insertText into what that
 *      click focused, and a real Enter key, read back by this probe's own
 *      capture-pane of that session's server (`typedReading`: the shell's
 *      answer to `echo <mark>-$((6*7))`, which only an Enter that reached the
 *      shell prints). Never the bridge's term.sendInput (`__gmuxP95.type`),
 *      which skips the pane's own input gate: the round before read "typing
 *      reached" through it for a pane that dropped every key a person typed.
 *      A sheet left open on an error is cancelled first, as a person closes
 *      it. Before the press the session in use must take them (a need: the
 *      typing itself is proved first, or the arm is UNREADABLE), and the
 *      window must then hear no session list for 4 s; once the create settled,
 *      RF, RN and RFL grade that the session in use still takes them, and R7L
 *      wherever the window stayed on it. In R7 both
 *      builds land on the new session, and whether it takes real keystrokes
 *      there is the parent's own behaviour run to run (0 of 2 in one of the
 *      last reverify's runs, 2 of 2 in another, at both builds), so it is
 *      printed, never graded.
 *   RUN the wrappers by sha256, /usr/bin/sqlite3, the hidden agents, the census,
 *      every pid ended, every scratch server gone, his history, crash reports.
 *
 * FOUR READINGS ARE PRINTED, NOT GRADED, and the reason is the product's, not
 * the probe's: whether the window and sessions:list hold the new session in L1
 * and L2. A status tick composing the list while the create is held writes the
 * new row into Phase 357's last clean list before the latch, so whether either
 * build's window draws it depends on that tick. The fix round graded HEAD's
 * (D14 added the session to that list); his ruled round took D14 out with the
 * answer it served, so both builds read as today.
 *
 * ## Three verdicts, and a missing reading is never a pass
 *
 * Each arm names the fields it reads (`reads`), the preconditions without which
 * nothing it says can be trusted (`needs`: the agents held, the hold took and
 * was released by the probe and not by its cap, the lock was proved, the seam
 * armed, the far rules took) and its clauses. A field that is absent, or a need
 * that does not hold, answers UNREADABLE (exit 2); only a clause answers FAIL.
 * Every reading derived from raw text (the wrapper logs, app.log, the app's own
 * output, a tmux list) is derived by ONE pure function exported below, and
 * `--grader-self-test` drives those same functions over recorded raw fixtures
 * (build/p360/fixtures/graders.json) as well as grading a parent-shaped and a
 * HEAD-shaped reading per arm and a broken one per clause. It starts nothing.
 *
 * VERIFIERS ONLY: it starts Electrons. Take the orchestrator's lock.
 *
 *   npm run build && P360_PARENT_CHECKOUT=<a BUILT 89b2a3cb> npm run -s probe:p360
 *   P360_ARMS=L3,L1           the arms to run (RUN is always read)
 *   P360_KEEP=1               keep the run folder (both wrapper logs, the far log,
 *                             each launch's app.log and manifest copies)
 *   P360_FAR_TMUX=<path>      the far side's real tmux (default: the checkout's
 *                             vendored 3.7b)
 *   P360_OUT_DIR=<dir>        where the report goes (default out/p360)
 *   node build/p360/probe-p360.mjs --grader-self-test   every grader on the fixtures; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed (even if another could not be
 * read), 2 when it could not run or an arm could not be READ.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { createServer } from 'node:net';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The one module of this repository imported statically: it defines constants
// and functions at load and reads no environment until a launch, and
// gate:electron counts a helper user by this static import. Every other module
// of this repository is loaded inside run(), after the sanitising below.
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';

// ===========================================================================
// 0. THE SANITISING, before any module of this repository runs code of ours.
// ===========================================================================

const SELF_TEST = process.argv.includes('--grader-self-test');
/** His real home, from the account record, used ONLY to stat two history files and list crash report names. */
const REAL_HOME = userInfo().homedir;
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
const SCRATCH_HOME = HARNESS_DIR === '' ? '/var/empty' : join(HARNESS_DIR, 'p360', 'home');
if (!SELF_TEST) {
  process.env['HOME'] = SCRATCH_HOME;
  process.env['ZDOTDIR'] = SCRATCH_HOME;
  process.env['HISTFILE'] = '/dev/null';
  process.env['SHELL'] = '/bin/sh';
  delete process.env['SSH_AUTH_SOCK'];
  delete process.env['TERM_SESSION_ID'];
  delete process.env['TERM_PROGRAM'];
  process.env['SCRATCH_MACHINE_NO_OWN_KEYS'] = '1';
  process.env['SCRATCH_MACHINE_QUIET_SHELL'] = '1';
  process.env['SCRATCH_MACHINE_SCRATCH_HOME'] = '1';
  if (process.env['SSH_AUTH_SOCK'] !== undefined) {
    process.stderr.write('[p360] REFUSED. SSH_AUTH_SOCK is still set after the sanitising, so the yard would ask his agent for his keys.\n');
    process.exit(2);
  }
}

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ===========================================================================
// 1. WHAT THIS RUN HOLDS THE APP AGAINST, BY VALUE. Nothing is imported from
//    the source it judges: a probe that read them from there would agree with
//    a wrong one.
// ===========================================================================

/** The parent this phase's delta sits on: origin/main the main session rebased it onto (2026-11-17, Phase 325.1's). */
export const SNAPSHOT = '89b2a3cb';
export const ALL_ARMS = Object.freeze(['L3', 'R6', 'R5', 'L1', 'L2', 'R7L', 'R7', 'RF', 'RN', 'RFL']);
export const LAUNCH_1 = Object.freeze(['L3', 'R6', 'R5', 'L1']);
export const LAUNCH_2 = Object.freeze(['L2']);
/**
 * HIS SECOND RULED ROUND (2026-11-16): the session list stopped during a create
 * on ANOTHER MACHINE, after that machine answered. Each latches its launch's
 * store, so each has a launch of its own (launches 3 to 6), the parent's four
 * first. R7L and R7 stop the list at the create's tab write, after the far
 * create returned (the last reverify's own arms, from a tab on this Mac with
 * the sheet's Machine field set and from the machine's own tab). RF and RN stop
 * it while the far create is out, by a read of the session list during the far
 * `@gmux-id` stamp hold, so the create's own list meets the stopped store (RF,
 * the feed's write) or never shows the session at all (RN, R6's list hold).
 */
export const REMOTE_STOP_ARMS = Object.freeze(['R7L', 'R7', 'RF', 'RN', 'RFL']);
/**
 * The arms whose two builds must answer alike, HEAD graded by the parent's own
 * clauses: R7L and R7 by his second ruling (2026-11-16), and RF, RN and RFL by
 * his third (2026-11-17, "360 a then ship 115.0"): a create on another machine
 * whose list stopped before that machine's create returned answers exactly as
 * the parent, the stopped sentence with the window kept on the session in use.
 */
export const SAME_AT_BOTH = Object.freeze(['R7L', 'R7', 'RF', 'RN', 'RFL']);
/**
 * What each remote stop arm drives: the tab the person is in, the operation
 * the seam fails, whether the far list is held, and, from a tab on this Mac,
 * which of that tab's shells is in use (`activeSession()` falls back to a tab's
 * LAST session, so R7L keeps the window on the last and his third ruled
 * round's RFL on the first of two, where the last round's HEAD moved it).
 */
export const REMOTE_STOP = Object.freeze({
  R7L: Object.freeze({ tab: 'local', stop: 'tab', op: 'clearProjectTabClosed', unlisted: false, inUse: 'last' }),
  R7: Object.freeze({ tab: 'remote', stop: 'tab', op: 'clearProjectTabClosed', unlisted: false, inUse: 'far' }),
  RF: Object.freeze({ tab: 'remote', stop: 'during', op: 'listSessions', unlisted: false, inUse: 'far' }),
  RN: Object.freeze({ tab: 'remote', stop: 'during', op: 'listSessions', unlisted: true, inUse: 'far' }),
  RFL: Object.freeze({ tab: 'local', stop: 'during', op: 'listSessions', unlisted: false, inUse: 'first' })
});
/** How long the probe waits, at most, for the shell's answer to keys it typed to reach the capture. */
export const TYPED_WAIT_MS = 6_000;
/** How long the window must hear no session list before a remote stop arm presses Create, and how long the probe waits for that at most. */
export const QUIET_BEFORE_PRESS_MS = 4_000;
export const QUIET_WAIT_MAX_MS = 30_000;
/** How long the far wrapper holds the create's `@gmux-id` stamp in the remote stop arms: the seam is armed inside it. */
export const REMOTE_STOP_STAMP_MS = 1_500;
export const BUILDS = Object.freeze(['parent', 'head']);
export const MACHINE_ID = 'p360far';
/** The three shells each launch's world holds, created from the window. */
export const SHELL_NAMES = Object.freeze(['p360-a', 'p360-b', 'p360-c']);
/** The refusal a create on a stopped store carries (src/shared/manifest-stopped-copy.ts). */
export const MANIFEST_STOPPED_REFUSAL = "Tortie's session list stopped reading correctly. Restart Tortie, then try again.";
/** The parent's item 5 and item 6 sentence, noRemoteRowFor (src/main/machines/remote-copy.ts), in two pieces. */
export const NO_ROW_PIECES = Object.freeze(['could not find a session called', 'Nothing was changed.']);
/** The line R5's far login file prints first. */
export const FAR_LOGIN_LINE = 'p360 far login file';
/** §5's step words, by value: the `msg` of each guard's one app.log line. */
export const AFTER_SPAWN_LOG = Object.freeze({
  record: 'the session started, and its tmux name and process id were not recorded',
  'login-notice': 'the session started, and the notice that it fell back to the default login was not sent',
  'env-notice': 'the session started, and the notice naming a shell variable it did not get was not sent',
  'id-capture': 'the session started, and its conversation id is not being watched for yet',
  'capture-notice': 'the session started, and the notice that capture was declined was not sent',
  broadcast: 'the session started, and the windows were not sent the new session list',
  'read-back': 'the session started, and its row could not be read back, so the create answers the row it wrote'
});
/** D12's log line, by its one fixed phrase. */
export const NO_LIST_SHOWN = /no list has shown it yet/;
/**
 * D11's line for a far answer that was not one session id, said by both of
 * its read arms (`its id was found there`, `the machine holds no session with
 * its id`) and by nothing else. R5 at HEAD needs one: without it the login
 * file's line never reached the create's answer, and the arm proved nothing
 * (the probe review, 2026-11-08).
 */
export const UNREAD_ANSWER = /answered \d+ line\(s\), none of them a session/;
/** The hold the create's record write sits behind, measured at 5,416 ms in §2.1: the busy timeout is 5 s. */
export const BUSY_WAIT_FLOOR_MS = 4_000;
/** R6's stamp hold and its list hold (§8): the list hold outlives REMOTE_POLL_TIMEOUT_MS (10,000). */
export const R6_STAMP_MS = 1_500;
export const R6_LIST_MS = 12_000;
/** How far into the stamp hold R6 writes the list rule: late, so the lists the new session provoked have run. */
export const R6_RULE_AT_MS = 1_100;
/** Statuses a session's row reads once a list has bound it. */
export const LIVE_STATUSES = Object.freeze(['running', 'idle', 'needs_input']);
/** The arms' session names, by build, so a count never mixes two arms. */
export const armName = (arm, build) => `p360-${arm.toLowerCase()}${build === 'parent' ? 'p' : 'h'}`;
/** Electron's own line for a main handler that threw (lib/browser/ipc-main-impl), the bridge's record of a rejection. */
export const HANDLER_LINE = "Error occurred in handler for 'sessions:create':";
/**
 * HIS RULED ROUND (2026-11-14): THE BUSY WINDOW L1 and L2 make as the create
 * ends, from the fix round's reverify (its arm W in a busy window). The long
 * task runs in the window as ONE synchronous evaluation, sent before the hold
 * is released and never through a timer, because a window that is not in
 * front has its timers throttled to about one a second (the fix round's note
 * on its settle stamp). 600 ms, longer than the reverify's 400 and 100, so the
 * release can follow the task's start by SPIN_LEAD_MS and still leave the task
 * SPIN_COVER_MS past it, where the create answers and the stopped notice is
 * posted (the wrapper sees the release within 20 ms).
 */
export const SPIN_MS = 600;
/** How long after sending the long task the probe releases the hold. */
export const SPIN_LEAD_MS = 60;
/** How long the long task must still run after the release for the answer and the notice to queue behind it. */
export const SPIN_COVER_MS = 200;
/** How late after the long task ended the stopped notice may be handled and still have queued behind it. */
export const QUEUE_SLACK_MS = 150;
/** How many chunks of the session in use's output the window must receive between the press and the answer. */
export const PRINTED_FLOOR = 10;
/** L2 arms the seam this long into its hold, after the refresh the new session's own notice starts (the reverify's 1,200). */
export const L2_ARM_DELAY_MS = 1_200;
/** What the session in use runs while the create ends: a line every pass, with no pause, as an agent streaming its output does. */
export const PRINT_LOOP = 'i=0; while :; do i=$((i+1)); printf "p360 busy %s\\n" "$i"; done';
/** D13's line: the create's own list could not be started, by its one fixed phrase (scope config). */
export const FEED_NOT_STARTED = /^the session started on \S+, and its list could not be started: /;
/** The tab write's own guarded line (src/main/machines/remote-rehome.ts), at both builds. */
export const TAB_RECORD_NOT_CLEARED = /and the record of a tab closed in its folder could not be cleared/;
/** The helper's census and scratch sentences (build/electron-run.mjs), as it prints them. */
export const CENSUS_FAIL = /is the private server the operator's live|census could not be judged/;
export const SCRATCH_FAIL = /was not proven gone/;

// ===========================================================================
// 2. THE READERS: ONE pure function per reading the run derives from raw
//    text. The live arms call these and nothing else; --grader-self-test drives
//    them over recorded raw fixtures, so a reader that miscounts is shown to.
// ===========================================================================

/** One POSIX single-quoted word. */
export function shq(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/** Split a line of zsh `${(qq)@}` words back into the words. */
export function shellWords(text) {
  const words = [];
  let cur = '';
  let inWord = false;
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === "'") quoted = false;
      else cur += c;
      continue;
    }
    if (c === "'") {
      quoted = true;
      inWord = true;
      continue;
    }
    if (c === '\\' && i + 1 < text.length) {
      cur += text[i + 1];
      i += 1;
      inWord = true;
      continue;
    }
    if (c === ' ') {
      if (inWord) words.push(cur);
      cur = '';
      inWord = false;
      continue;
    }
    cur += c;
    inWord = true;
  }
  if (inWord) words.push(cur);
  return words;
}

/** The leading global options, the verb and the rest of one tmux argv. */
export function tmuxVerb(argv) {
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (['-L', '-S', '-f', '-T', '-c'].includes(a)) i += 2;
    else if (a === '--') {
      i += 1;
      break;
    } else if (a.startsWith('-')) i += 1;
    else break;
  }
  return { verb: argv[i] ?? '', rest: argv.slice(i + 1) };
}

/**
 * A wrapper log's lines (build/p360/local-tmux.sh and build/p326/far-tmux.sh
 * write the same shape) as `{ t, pid, argv, verb, rest }` for an invocation and
 * `{ t, pid, note }` for a note.
 */
export function parseWrapperLog(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const m = /^(\d+) (\d+) (.*)$/.exec(line);
    if (m === null) continue;
    const t = Number(m[1]);
    const pid = Number(m[2]);
    if (m[3].startsWith('# ')) out.push({ t, pid, note: m[3].slice(2).split(' ') });
    else {
      const argv = shellWords(m[3]);
      out.push({ t, pid, argv, ...tmuxVerb(argv) });
    }
  }
  return out;
}

/**
 * The local wrapper's hold of `rule` at or after `from`: held when a `held`
 * note names it and its `released` note says the probe's release file ended it,
 * never the cap. `{ held, by, ms }`.
 */
export function holdReading(records, rule, from = 0) {
  const held = records.find((r) => r.note !== undefined && r.t >= from && r.note[0] === 'held' && r.note[1] === rule);
  if (held === undefined) return { held: false, by: null, ms: null };
  const released = records.find((r) => r.note !== undefined && r.pid === held.pid && r.t >= held.t && r.note[0] === 'released' && r.note[1] === rule);
  if (released === undefined) return { held: false, by: 'never released', ms: null };
  return { held: released.note[3] === 'release', by: released.note[3] ?? null, ms: Number(released.note[2]) };
}

/**
 * R6's far rules, from the far log between `from` and `to`: the `@gmux-id`
 * stamp was held, a list was held for the long rule, and that list STARTED at
 * or after the create's last stamp (`@gmux-project`), so it was the create's
 * own list and not one the new session provoked earlier.
 */
export function farHoldReading(records, from = 0, to = Number.MAX_SAFE_INTEGER) {
  const win = records.filter((r) => r.t >= from && r.t <= to);
  const stampHeld = win.some((r) => r.note !== undefined && r.note[0] === 'held' && r.note[1] === 'stamp-delay-ms');
  const lastStamp = win.filter((r) => r.argv !== undefined && (r.verb === 'set-option' || r.verb === 'set') && r.rest.includes('@gmux-project')).at(-1);
  const listNote = win.find((r) => r.note !== undefined && r.note[0] === 'held' && r.note[1] === 'first-list-delay-ms');
  const listCall = listNote === undefined ? undefined : win.find((r) => r.argv !== undefined && r.pid === listNote.pid && (r.verb === 'list-sessions' || r.verb === 'ls'));
  return {
    stampHeld,
    listHeld: listNote !== undefined,
    listHeldAfterStamps: listCall !== undefined && lastStamp !== undefined && listCall.t >= lastStamp.t
  };
}

/**
 * app.log's lines, from its files' texts in order (the rotated file first),
 * with the empty string a trailing newline leaves after each file dropped.
 *
 * THE FIX ROUND (lens A, 2026-11-08). The run used to count an arm's starting
 * point with that empty string included, so the first line written during the
 * arm took its place at an index the slice had already passed, and
 * {@link appLogSinceTexts} dropped exactly that line. Which line came first
 * decided the verdict: L1 at HEAD read FAIL and L2 read UNREADABLE at both
 * builds while the kept app.logs held the graded record as the first line of
 * each arm, and a clause asking for the ABSENCE of a line (L3's "no
 * manifest.stopped") could pass over the one that broke it.
 */
export function appLogLinesOf(texts) {
  const out = [];
  for (const text of Array.isArray(texts) ? texts : []) {
    for (const line of String(text ?? '').split('\n')) if (line !== '') out.push(line);
  }
  return out;
}
/** The lines written after the files read `before` and before they read `after`: one arm's slice of app.log. */
export const appLogSinceTexts = (before, after) => appLogLinesOf(after).slice(appLogLinesOf(before).length);

/** app.log's lines as records; a line that does not parse is dropped. */
export function appLogRecords(lines) {
  const out = [];
  for (const l of Array.isArray(lines) ? lines : []) {
    if (typeof l !== 'string' || l.trim() === '') continue;
    try {
      const o = JSON.parse(l);
      if (o !== null && typeof o === 'object') out.push(o);
    } catch {
      /* not a record */
    }
  }
  return out;
}

/**
 * What one arm's slice of app.log says: the manifest.stopped records, each
 * guard's warn (by §5's words), D12's line, and how many lines carry a canary.
 */
export function appLogReading(lines, { canary = null } = {}) {
  const recs = appLogRecords(lines);
  const stepOf = (msg) => Object.entries(AFTER_SPAWN_LOG).find(([, words]) => words === msg)?.[0] ?? null;
  const warns = recs
    .filter((o) => o.scope === 'sessions' && typeof o.msg === 'string' && o.msg.startsWith('the session started, and '))
    .map((o) => ({
      step: stepOf(o.msg),
      code: typeof o.code === 'string' ? o.code : null,
      sessionId: typeof o.sessionId === 'string' ? o.sessionId : null,
      hasMessage: Object.prototype.hasOwnProperty.call(o, 'message') || Object.prototype.hasOwnProperty.call(o, 'stack')
    }));
  return {
    lines: recs.length,
    stopped: recs.filter((o) => o.event === 'manifest.stopped').map((o) => ({ operation: o.operation ?? null, code: o.code ?? null, file: o.file ?? null })),
    warns,
    noListShown: recs.filter((o) => typeof o.msg === 'string' && NO_LIST_SHOWN.test(o.msg)).length,
    unreadAnswers: recs.filter((o) => typeof o.msg === 'string' && UNREAD_ANSWER.test(o.msg)).length,
    canaryLines: canary === null ? 0 : (Array.isArray(lines) ? lines : []).filter((l) => typeof l === 'string' && l.includes(canary)).length
  };
}
/** The warns one guard step wrote. */
export const warnsOf = (al, step) => (al?.warns ?? []).filter((w) => w.step === step);

/**
 * HIS SECOND RULED ROUND. What one remote stop arm's slice of app.log says
 * beside {@link appLogReading}: how many lines say the create's own list could
 * not be started (D13, HEAD's alone) and how many say the tab write's record
 * could not be cleared (the guarded tab write, at both builds).
 */
export function remoteStopLog(lines) {
  const recs = appLogRecords(lines);
  return {
    feedNotStarted: recs.filter((o) => typeof o.msg === 'string' && FEED_NOT_STARTED.test(o.msg)).length,
    tabNotCleared: recs.filter((o) => typeof o.msg === 'string' && TAB_RECORD_NOT_CLEARED.test(o.msg)).length
  };
}

/**
 * The far wrapper's `new-session` invocations whose `-s` names `base` or a
 * name derived from it, at or after `from`: `{ t, name }` each. What a far
 * server was ASKED to start, which the second press of a remote stop arm must
 * leave at none.
 */
export function farCreatesOf(records, base, from = 0) {
  const out = [];
  for (const r of records ?? []) {
    if (r.argv === undefined || r.t < from || (r.verb !== 'new-session' && r.verb !== 'new')) continue;
    const at = r.rest.indexOf('-s');
    const name = at === -1 ? '' : (r.rest[at + 1] ?? '');
    if (name === base || name.startsWith(`${base}-`)) out.push({ t: r.t, name });
  }
  return out;
}

/**
 * Whether a remote stop arm's seam was armed AFTER that machine answered, from
 * the far log: the wrapper held a `@gmux-id` stamp at or after the press
 * (`stampHeld`), and the far `new-session` of this arm's name ran at or after
 * the press and that hold began, both at or before the seam was armed
 * (`answeredBeforeArm`). The stamp is sent only once the create read its
 * answer, so a seam armed inside its hold is armed after the answer.
 */
export function stampHoldReading(records, base, pressAt, armAt) {
  const held = (records ?? []).find((r) => r.note !== undefined && r.t >= pressAt && r.note[0] === 'held' && r.note[1] === 'stamp-delay-ms');
  const created = farCreatesOf(records, base, pressAt)[0];
  return {
    stampHeld: held !== undefined,
    answeredBeforeArm: held !== undefined && created !== undefined && Number.isFinite(armAt) && created.t <= held.t && held.t <= armAt
  };
}

/**
 * Every rejection of `sessions:create` in the app's own output, as the payload
 * the bridge carried: Electron prints the handler's error, whose message is
 * the JSON GmuxErrorPayload (src/main/errors.ts), on the line after
 * {@link HANDLER_LINE}. A line that does not parse answers `{ raw }`.
 */
export function handlerRejections(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const at = line.indexOf(HANDLER_LINE);
    if (at === -1) continue;
    const rest = line.slice(at + HANDLER_LINE.length);
    const json = jsonObjectIn(rest);
    if (json === null) {
      out.push({ raw: rest.trim().slice(0, 400) });
      continue;
    }
    try {
      const p = JSON.parse(json);
      out.push({ code: typeof p.code === 'string' ? p.code : null, message: typeof p.message === 'string' ? p.message : null, detail: typeof p.detail === 'string' ? p.detail : null, raw: rest.trim().slice(0, 400) });
    } catch {
      out.push({ raw: rest.trim().slice(0, 400) });
    }
  }
  return out;
}

/**
 * True when a rejection of `sessions:create` in the app's output carries
 * `canary`, read WHOLE: anywhere after {@link HANDLER_LINE} on the error's own
 * line, or in the payload's parsed message or detail. A reading's `raw` is cut
 * at 400 characters for display, and Phase 117's CREATE_ANSWER_LOST alone is
 * about 390, so a detail after it fell past the cut and a leak there read as
 * none (the probe review, 2026-11-08, on Node's own output of a real GmuxError).
 */
export function rejectionsCarry(text, canary) {
  const needle = String(canary);
  const lines = String(text ?? '').split('\n');
  if (lines.some((line) => line.includes(HANDLER_LINE) && line.slice(line.indexOf(HANDLER_LINE) + HANDLER_LINE.length).includes(needle))) return true;
  return handlerRejections(text).some((x) => String(x.message ?? '').includes(needle) || String(x.detail ?? '').includes(needle));
}

/**
 * The first whole JSON object in `text`, by matched braces with strings
 * respected, or null. Node may print a tag after an error's first line (its
 * own name, a `[class]`), so the object is cut out rather than read to the end.
 */
export function jsonObjectIn(text) {
  const s = String(text ?? '');
  const open = s.indexOf('{');
  if (open === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = open; i < s.length; i += 1) {
    const c = s[i];
    if (inString) {
      if (c === '\\') i += 1;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return s.slice(open, i + 1);
    }
  }
  return null;
}

/** A tmux list answered as `#{session_id} #{session_name} [#{@gmux-id}]`: `{ tmuxId, name, gmuxId }` rows. */
export function listRows(text) {
  return String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\$\d+ /.test(l))
    .map((l) => {
      const [tmuxId, name, gmuxId] = l.split(' ');
      return { tmuxId, name: name ?? '', gmuxId: gmuxId ?? '' };
    });
}
/** The rows of one arm: a name that is the arm's name, or the name with a dedupe suffix. */
export const rowsOfName = (rows, base) => (rows ?? []).filter((r) => r.name === base || r.name.startsWith(`${base}-`) || r.name.startsWith(`${base} `));

/** A settled sheet, from the page's reading: closed, or showing an error with the button idle. */
export function sheetSettled(s) {
  if (s === null || typeof s !== 'object') return false;
  if (s.open === false) return true;
  return typeof s.error === 'string' && s.error !== '' && s.creating === false;
}

/** p357's history rule, by value: unmoved, held, his terminal, or unread. */
export function historyHeld(history) {
  if (history?.before === history?.after) return 'unmoved';
  if (history?.quiet === null || history?.quiet === undefined || typeof history.quiet.again !== 'string') return 'unread';
  return history.quiet.again !== history.after ? 'his terminal' : 'held';
}

/**
 * HIS RULED ROUND. Whether L1's or L2's window was busy as the create ended,
 * from what the page recorded by its own clock and the probe's release:
 *   data        epoch ms of each chunk of the session in use's output the window received
 *   notices     epoch ms the window heard each `manifest-stopped` notice
 *   spin        the long task, `{ from, to }` epoch ms, or null when it never ran
 *   pressAt     epoch ms of the press, settledAt when the sheet settled (both the page's)
 *   releasedAt  epoch ms the probe released the hold
 * Answers `{ printed, spun, spanned, noticeQueued, answerQueued }`: how many
 * chunks reached the window between the press and the settle; whether the task
 * ran its whole length; whether it began before the release and ran
 * SPIN_COVER_MS past it; whether the stopped notice was heard no earlier than
 * the task began and no later than QUEUE_SLACK_MS after it ended, so it queued
 * behind the task; and whether the sheet settled on the create's answer in that
 * same span, so the answer queued behind the task beside the notice.
 *
 * THE PROBE REVIEW OF HIS RULED ROUND (2026-11-14) added `answerQueued`. The
 * need below said "queued with the create's answer" and read the notice alone.
 * In L1 the latch is the record write, and the create then awaits its tmux
 * option mirror before it answers, so under load the notice could queue behind
 * the task while the answer came after it: the window then hears the notice
 * first, the race the busy window exists to open stays shut, and the arm
 * passed with its premise unread.
 */
export function busyReading(raw) {
  const r = raw !== null && typeof raw === 'object' ? raw : {};
  const times = (xs) => (Array.isArray(xs) ? xs.filter((t) => Number.isFinite(t)) : []);
  const data = times(r.data);
  const notices = times(r.notices);
  const spin = r.spin !== null && typeof r.spin === 'object' && Number.isFinite(r.spin.from) && Number.isFinite(r.spin.to) ? r.spin : null;
  const spinMs = Number.isFinite(r.spinMs) ? r.spinMs : SPIN_MS;
  const timed = Number.isFinite(r.pressAt) && Number.isFinite(r.settledAt) && r.settledAt >= r.pressAt;
  return {
    printed: timed ? data.filter((t) => t >= r.pressAt && t <= r.settledAt).length : 0,
    spun: spin !== null && spin.to - spin.from >= spinMs - 5,
    spanned: spin !== null && Number.isFinite(r.releasedAt) && spin.from <= r.releasedAt && spin.to >= r.releasedAt + SPIN_COVER_MS,
    noticeQueued: spin !== null && notices.some((t) => t >= spin.from && t <= spin.to + QUEUE_SLACK_MS),
    answerQueued: spin !== null && Number.isFinite(r.settledAt) && r.settledAt >= spin.from && r.settledAt <= spin.to + QUEUE_SLACK_MS
  };
}

/**
 * HIS THIRD RULED ROUND (2026-11-17). Whether a session took the keys a person
 * typed into it, from its own server's capture of its pane: the shell's answer
 * to `echo <mark>-$((6*7))`, a line that is exactly `<mark>-42`, which only an
 * Enter that reached the shell prints (the typed command line holds
 * `$((6*7))`, never `-42`). A capture that could not be read, or no mark, is
 * no reading (null), never a "no".
 */
export function typedReading(capture, mark) {
  if (typeof capture !== 'string' || typeof mark !== 'string' || mark === '') return null;
  return capture.split('\n').some((line) => line.trim() === `${mark}-42`);
}

/** The first live status the window drew for an arm's row, after the first status it drew. */
export function rowReading(sequence) {
  const seq = (Array.isArray(sequence) ? sequence : []).filter((s) => typeof s === 'string');
  const first = seq[0] ?? null;
  const settled = seq.slice(1).find((s) => LIVE_STATUSES.includes(s)) ?? null;
  return { first, settled, sequence: seq.slice(0, 12) };
}

// ===========================================================================
// 3. THE GRADERS, pure over a reading: used live and in --grader-self-test.
// ===========================================================================

const AGENTS_NEED = ['the agents:list answer resolved nothing but the stand-ins (none)', (r) => r.agents.ok === true];
const HELD_NEED = ['the local wrapper held the create and the probe released it, not the cap', (r) => r.held === true];
const LOCK_NEEDS = [
  ['the write lock was held and proved: a second sqlite3 met "database is locked"', (r) => r.lock.proven === true],
  ['the create met the held lock: it settled after the busy wait, 4 s or more after the press', (r) => r.sheet.settleMs >= BUSY_WAIT_FLOOR_MS]
];
const ARMED_NEED = (operation) => [`the seam armed one fault on ${operation} during the hold, said on the app's output`, (r) => r.armed === true];
const MACHINE_NEED = ['the loopback machine was confirmed, prepared and usable, and its tab was the active one', (r) => r.machine.usable === true];
const FAR_RULES_NEED = ['the far wrapper held the @gmux-id stamp, then held for 12 s the list that started after the create’s last stamp', (r) => r.far.stampHeld === true && r.far.listHeldAfterStamps === true];
const LOGIN_NEED = ["the far login file was written and a zsh with the yard's ZDOTDIR printed its line", (r) => r.loginFile.written === true && r.loginFile.prints === true];
const closedClause = ['the first press closed the sheet on the session, with no error drawn', (r) => r.sheet.closed === true && r.sheet.error === null];
/**
 * THE FIX ROUND (the attack lens's arm W, 2026-11-08). Main opens no session
 * while the list is stopped, so a window that landed on the new session drew
 * "Can't connect to this session" and had closed the terminal the person was
 * working in. The parent never moved, because its create answered a failure,
 * so this clause is graded at both builds: no build may be worse than today.
 */
const WINDOW_NEED = ['before the press the window was on the world’s first shell, its terminal drawn with nothing over it', (r) => r.window.before === true];
const stayedClause = ['the window stayed on the session it was on, its terminal still drawn with nothing over it', (r) => r.window.stayed === true && r.window.connected === true];
const WINDOW_READS = ['window.before', 'window.stayed', 'window.connected'];
/**
 * HIS RULED ROUND (2026-11-14). The fix round's window clause only ever ran in
 * an idle window, where the stopped notice has a head start, and it passed
 * while the race its reverify measured was open. So L1 and L2 make the window
 * busy as the create ends, and an arm whose window was not busy in all three
 * ways is UNREADABLE: the clause above is only asked of a busy window.
 */
const BUSY_NEEDS = [
  ['the session in use printed while the create ran: the window received its output between the press and the answer', (r) => r.busy.printed >= PRINTED_FLOOR],
  ['the window ran one long task across the release of the hold, its whole length', (r) => r.busy.spun === true && r.busy.spanned === true],
  // The probe review of his ruled round: the answer's half of "queued with the create's answer" is read too (busyReading).
  ['the stopped notice reached the window behind that long task, queued with the create’s answer', (r) => r.busy.noticeQueued === true && r.busy.answerQueued === true]
];
const BUSY_READS = ['busy.printed', 'busy.spun', 'busy.spanned', 'busy.noticeQueued', 'busy.answerQueued'];
/** Both builds' answer in L1 and L2 since his ruling, and the parent's always. */
const stoppedClause = ['the first press answered the stopped sentence and the sheet stayed open', (r) => r.sheet.closed === false && r.sheet.error === MANIFEST_STOPPED_REFUSAL];
const secondPressClause = ['the second press answered the stopped sentence again and spawned nothing', (r) => r.press2.pressed === true && r.press2.error === MANIFEST_STOPPED_REFUSAL && r.press2.spawned === false];
const oneSessionClause = ['ONE new session on the scratch server', (r) => r.server.created === 1];
/** What tells the builds apart in L1 and L2 since his ruling: the parent's create stopped at its first step that met the stop and logged nothing. */
const noStepLinesClause = ['app.log holds no line of a step after the spawn: the create stopped at the first step that met the stop', (r) => Array.isArray(r.appLog.warns) && r.appLog.warns.length === 0];

/**
 * HIS SECOND RULED ROUND (2026-11-16): the session list stopped during a create
 * on another machine, after that machine answered. Every remote stop arm needs
 * the far create to have answered before the seam was armed (the far wrapper
 * held the create's own `@gmux-id` stamp, which is sent after the answer, and
 * the seam armed inside that hold) and the store to have latched once, on the
 * arm's operation.
 */
const FIELD_MACHINE_NEED = ['the loopback machine was confirmed, prepared and usable, and the sheet’s Machine field named it from a tab on this Mac', (r) => r.machine.usable === true && r.machine.fieldSet === true];
const STAMP_HELD_NEED = ['the far wrapper held the create’s @gmux-id stamp after that machine answered its new-session, and the seam armed during that hold', (r) => r.far.stampHeld === true && r.far.answeredBeforeArm === true && r.armed === true];
const LATCH_NEED = (operation) => [`the store latched once, on ${operation}, after that machine answered`, (r) => r.appLog.stopped.length === 1 && r.appLog.stopped[0].operation === operation];
const FAR_WORK_NEED = ['before the press the window was on a session on that machine, its terminal drawn with nothing over it, and had heard no session list for 4 s', (r) => r.window.before === true];
/**
 * R7L's: the tab's last shell, where `activeSession()` falls back to (see
 * armRemoteStop). Every remote stop arm's window need also asks that the
 * window heard no session list for QUIET_BEFORE_PRESS_MS before the press (his
 * third ruled round): the control keys typed just before made the session in
 * use print, a list main sent for that while the create was out can carry the
 * far tab, and R7L landed on the new session at BOTH builds (1 of 1 each),
 * where every earlier run stayed (6 of 6); with the window let go quiet each
 * build stayed 4 of 5, the race narrowed and not closed (R7L_GRADER).
 */
const LAST_SHELL_NEED = ['before the press the window was on the world’s last shell, its terminal drawn with nothing over it, and had heard no session list for 4 s', (r) => r.window.before === true];
const RN_LIST_NEED = ['the far wrapper held for 12 s the list that started after the create’s last stamp', (r) => r.far.listHeldAfterStamps === true];
/**
 * THE PROBE REVIEW OF HIS SECOND RULED ROUND (2026-11-16). R7L, R7 and RF are
 * creates a list of that machine HAS shown, and nothing in their setup holds
 * that list, so they assumed it. When none had, HEAD answers the stopped
 * sentence by D26, which is right, and these graders read it as a FAILURE of
 * HEAD's ("the first press closed the sheet"); and a build without D26 lands on
 * a session main does not open and PASSED RF@head's clauses, which never look
 * at typing. Both shown on RECORDED readings: RN@head's, which no list had
 * shown, read FAIL (D26 built) and PASS (D25 alone) through RF@head's grader.
 * HEAD writes D12's line exactly when no list had shown the session, so its
 * absence is the premise; the parent writes none, and its R7L and R7 premise is
 * the latch at the tab write, which its create reaches only once a list showed
 * the session (item 6 throws before it otherwise).
 */
const LISTED_NEED = ['a list of that machine had shown the session when the create answered: no line says it was answered from what it sent (D12)', (r) => r.appLog.noListShown === 0];
const farOneStampedClause = ['ONE session of that name on the far server, carrying the @gmux-id of the row the create wrote', (r) => r.farServer.created === 1 && r.farServer.stamped === true];
const backClause = ['going back to the session in use draws its terminal with nothing over it', (r) => r.back.connected === true];
/**
 * A second Create from a fresh sheet starts nothing over there: pressed and
 * refused with the stopped sentence, or not pressable at all (from the
 * machine's own tab both builds draw Create off once the list stopped).
 */
const refusedAgainClause = ['a second Create started nothing over there: refused with the stopped sentence, or Create drawn off', (r) => r.press2.farStarted === 0 && ((r.press2.pressed === true && r.press2.error === MANIFEST_STOPPED_REFUSAL) || (r.press2.pressed === false && r.press2.disabled === true))];
const REMOTE_STOP_READS = ['agents.ok', 'machine.usable', 'far.stampHeld', 'far.answeredBeforeArm', 'armed', 'appLog.stopped', 'sheet.closed', 'sheet.error', 'farServer.created', 'press2.pressed', 'press2.disabled', 'press2.error', 'press2.farStarted'];
/**
 * HIS THIRD RULED ROUND (2026-11-17, "360 a then ship 115.0"): REAL KEYSTROKES.
 * A click into the session's terminal, the text and a real Enter, read back
 * from that session's own server (`typedReading`), never the bridge, which
 * skips the pane's input gate. The need proves the typing itself works on the
 * session in use before the press, so a "no" afterwards is never the probe's.
 */
const TYPED_BEFORE_NEED = ['before the press, real keystrokes into the session in use reached it: a click into its terminal, the text and Enter, read back from its own server', (r) => r.typed.before === true];
const typedAfterClause = ['once the create settled, real keystrokes into the session in use still reached it, read back from its own server', (r) => r.typed.after === true];
/**
 * THE PROBE REVIEW OF HIS THIRD RULED ROUND (2026-11-17). A capture of the
 * session in use that was never read is no reading (`typedReading` answers
 * null, "never a no"), so the arm is UNREADABLE there. The clause above read
 * that null as the keys not reaching the session, a FAIL charged to the
 * build for a server the probe could not read (a far list that never
 * answered within TYPED_WAIT_MS, say). A window that is not on the session in
 * use reads false, a reading, and is graded.
 */
const TYPED_AFTER_READ_NEED = ['once the create settled, the session in use’s own server answered the capture its keys are read back from (a reading, not null)', (r) => r.typed.after !== null];
const TYPED_READS = ['typed.before', 'typed.after'];
/** RFL's: the FIRST of two shells in a tab on this Mac, so a window that falls back to the tab's last session has moved off it. */
const FIRST_OF_TWO_NEED = ['before the press the window was on the first of the two shells of a tab on this Mac, its terminal drawn with nothing over it, and had heard no session list for 4 s', (r) => r.window.before === true];
/** D27: the stopped list's refusal went through the feed's catch before it logged, as at the parent, which has no such line. */
const noFeedLineClause = ['app.log holds no line saying the create’s own list could not be started: the stopped list’s refusal went through first, as at the parent', (r) => r.appLog.feedNotStarted === 0];
/** RN's: the refusal went through before the create could answer a session no list had shown (D12); the parent has no such line. */
const noListLineClause = ['app.log holds no line saying the create answered a session no list had shown (D12): the stopped list’s refusal went through before', (r) => r.appLog.noListShown === 0];
/** R7L and R7 at either build: HEAD answers what the parent answers (his second ruling), so both builds share one grader's clauses. */
/**
 * HIS THIRD RULED ROUND (2026-11-17): R7L's window, measured with real
 * keystrokes typed into the session in use before the press, is the PARENT'S
 * OWN RACE, the same renderer code at both builds: the create answers its
 * session, the window asks main for its tabs (`projects.list()`, the last
 * clean list once the store stopped), and it moves to the far tab and the new
 * session exactly when a list read after the far folder's tab was written got
 * in before the stop. This round read the parent and HEAD each stay 4 of 6
 * and land on the new session 2 of 6 (4 of 5 each once the window was let go
 * quiet before the press); every earlier run, with no keys typed first, stayed
 * (6 of 6). So the clause takes the two places the parent goes and no third,
 * and asks the keys only of the window that stayed; which one it was is
 * printed.
 *
 * CORRECTED BY THE PROBE REVIEW OF HIS THIRD RULED ROUND (2026-11-17), the
 * clause unchanged. `window.stayed` and `window.onNew` read the window's
 * per-tab SELECTION (p95's `activeSessionId`), not the session it draws:
 * after a create from this Mac's tab whose list did not yet hold the far tab,
 * the renderer selects the new session in THIS tab, and `activeSession()`
 * then draws the tab's last shell, which in R7L is the session in use. The
 * parent's two "landings" (whole1, dev1) were that: no terminal drawn for the
 * new session, the second sheet opened on this Mac's tab, the session in use
 * drawn again at once. In what the window drew the parent stayed 6 of 6; the
 * one real landing recorded is HEAD's (whole4: the far tab active, the new
 * session's terminal drawn and taking keys, and the probe's select, which
 * cannot change tabs, not drawing the session in use again in 15 s). The
 * code after the answer is the same at both builds, which is what this
 * clause rests on, not a recorded parent landing.
 */
const r7lLandingClause = ['the window stayed on the session in use with its terminal drawn and nothing over it, or moved to the new session, the two places the parent goes, and nowhere else', (r) => (r.window.stayed === true && r.window.connected === true) || r.window.onNew === true];
const typedIfStayedClause = ['where the window stayed on the session in use, real keystrokes into it still reached it once the create settled, read back from its own server', (r) => r.window.stayed !== true || r.typed.after === true];
const R7L_GRADER = (build) => ({
  title: `${build === 'parent' ? 'the parent' : 'HEAD, by his second ruling as the parent'}, a create on another machine from a tab on this Mac with the Machine field set, the list stopped at its tab write after that machine answered: the sheet closes on the session, ONE over there stamped, the window stays on the session in use (and still takes real keystrokes) or moves to the new session as the parent's does, and a second Create is refused with nothing started`,
  reads: [...REMOTE_STOP_READS, 'machine.fieldSet', 'farServer.stamped', ...WINDOW_READS, 'window.onNew', ...TYPED_READS, 'appLog.noListShown'],
  needs: [AGENTS_NEED, FIELD_MACHINE_NEED, STAMP_HELD_NEED, LATCH_NEED('clearProjectTabClosed'), LAST_SHELL_NEED, TYPED_BEFORE_NEED, TYPED_AFTER_READ_NEED, LISTED_NEED],
  clauses: [closedClause, farOneStampedClause, r7lLandingClause, typedIfStayedClause, refusedAgainClause]
});
const R7_GRADER = (build) => ({
  title: `${build === 'parent' ? 'the parent' : 'HEAD, by his second ruling as the parent'}, a create from the machine’s own tab, the list stopped at its tab write after that machine answered: the sheet closes on the session, ONE over there stamped, the session in use opens again, and a second Create is refused with nothing started`,
  reads: [...REMOTE_STOP_READS, 'farServer.stamped', 'window.before', 'typed.before', 'back.connected', 'appLog.noListShown'],
  needs: [AGENTS_NEED, MACHINE_NEED, STAMP_HELD_NEED, LATCH_NEED('clearProjectTabClosed'), FAR_WORK_NEED, TYPED_BEFORE_NEED, LISTED_NEED],
  clauses: [closedClause, farOneStampedClause, backClause, refusedAgainClause]
});
/**
 * HIS THIRD RULED ROUND (2026-11-17, "360 a then ship 115.0"): RF, RN and RFL
 * at either build, ONE grader each, the parent's: a create on another machine
 * whose session list stopped BEFORE that machine's create returned answers
 * exactly as the parent, the stopped sentence with the sheet open and the
 * window kept on the session in use, which keeps taking real keystrokes. His
 * second ruled round's HEAD answered the session here (D13 caught the stop),
 * and the last reverify read the window land on the new session, drawn
 * "Machine unreachable" and taking 0 of 4 real keystrokes (RF), or fall back
 * to the tab's last shell, drawn "Can't connect", the first shell lost until
 * a restart (RFL), 3 of 3 each.
 */
const STOPPED_BEFORE_RETURN_CLAUSES = [stoppedClause, farOneStampedClause, stayedClause, typedAfterClause, noFeedLineClause];
const RF_GRADER = (build) => ({
  title: `${build === 'parent' ? 'the parent' : 'HEAD, by his third ruling as the parent'}, a create from the machine’s own tab during which the list stopped before that machine’s create returned, so its own list met the stopped store: the stopped sentence with the sheet open, ONE over there stamped, the window stays on the session in use and it still takes real keystrokes, no line that the list could not be started, and a second Create starts nothing over there`,
  reads: [...REMOTE_STOP_READS, 'farServer.stamped', ...WINDOW_READS, ...TYPED_READS, 'appLog.noListShown', 'appLog.feedNotStarted'],
  needs: [AGENTS_NEED, MACHINE_NEED, STAMP_HELD_NEED, LATCH_NEED('listSessions'), FAR_WORK_NEED, TYPED_BEFORE_NEED, TYPED_AFTER_READ_NEED, LISTED_NEED],
  clauses: [...STOPPED_BEFORE_RETURN_CLAUSES, refusedAgainClause]
});
const RN_GRADER = (build) => ({
  title: `${build === 'parent' ? 'the parent' : 'HEAD, by his third ruling as the parent'}, RF with the create’s own list held past its deadline, so no list shows the session: the stopped sentence with the sheet open, ONE over there stamped, the window stays on the session in use and it still takes real keystrokes, no line of D12 or D13, and a second Create starts nothing over there`,
  reads: [...REMOTE_STOP_READS, 'far.listHeldAfterStamps', 'farServer.stamped', ...WINDOW_READS, ...TYPED_READS, 'appLog.noListShown', 'appLog.feedNotStarted'],
  needs: [AGENTS_NEED, MACHINE_NEED, STAMP_HELD_NEED, RN_LIST_NEED, LATCH_NEED('listSessions'), FAR_WORK_NEED, TYPED_BEFORE_NEED, TYPED_AFTER_READ_NEED],
  clauses: [...STOPPED_BEFORE_RETURN_CLAUSES, noListLineClause, refusedAgainClause]
});
const RFL_GRADER = (build) => ({
  title: `${build === 'parent' ? 'the parent' : 'HEAD, by his third ruling as the parent'}, RF’s stop from a tab on this Mac holding two shells, the first in use, the far create made through the sheet’s Machine field: the stopped sentence with the sheet open, ONE over there stamped, the window stays on the first shell and it still takes real keystrokes, no line that the list could not be started, and a second Create starts nothing over there`,
  reads: [...REMOTE_STOP_READS, 'machine.fieldSet', 'farServer.stamped', ...WINDOW_READS, ...TYPED_READS, 'appLog.noListShown', 'appLog.feedNotStarted'],
  needs: [AGENTS_NEED, FIELD_MACHINE_NEED, STAMP_HELD_NEED, LATCH_NEED('listSessions'), FIRST_OF_TWO_NEED, TYPED_BEFORE_NEED, TYPED_AFTER_READ_NEED, LISTED_NEED],
  clauses: [...STOPPED_BEFORE_RETURN_CLAUSES, refusedAgainClause]
});

export const GRADERS = {
  'L3@parent': {
    title: 'the parent, a real busy write after the spawn: the sheet shows the busy error, and a second press makes a second session',
    reads: ['agents.ok', 'held', 'lock.proven', 'sheet.closed', 'sheet.error', 'sheet.settleMs', 'press2.pressed', 'server.created'],
    needs: [AGENTS_NEED, HELD_NEED, ...LOCK_NEEDS],
    clauses: [
      ['the first press answered the busy error and the sheet stayed open', (r) => r.sheet.closed === false && /locked|busy/i.test(String(r.sheet.error))],
      ['a second press made a second session: two new sessions on the scratch server', (r) => r.press2.pressed === true && r.server.created === 2]
    ]
  },
  'L3@head': {
    title: 'HEAD, a real busy write after the spawn: the sheet closes on the session after the busy wait, the window draws it, ONE session, one record warn naming SQLITE_BUSY',
    reads: ['agents.ok', 'held', 'lock.proven', 'sheet.closed', 'sheet.error', 'sheet.settleMs', 'server.created', 'drawn', 'appLog.warns', 'appLog.stopped'],
    needs: [AGENTS_NEED, HELD_NEED, ...LOCK_NEEDS],
    clauses: [
      closedClause,
      ['the window draws the session', (r) => r.drawn === true],
      ['ONE new session on the scratch server', (r) => r.server.created === 1],
      ['app.log holds one sessions warn for the record write naming SQLITE_BUSY and no message, and no manifest.stopped', (r) => warnsOf(r.appLog, 'record').length === 1 && warnsOf(r.appLog, 'record')[0].code === 'SQLITE_BUSY' && r.appLog.warns.every((w) => w.hasMessage === false) && r.appLog.stopped.length === 0]
    ]
  },
  'R6@parent': {
    title: 'the parent, a session not listed back: the sheet says nothing was changed, and a second press makes two on the far server',
    reads: ['agents.ok', 'machine.usable', 'far.stampHeld', 'far.listHeldAfterStamps', 'sheet.closed', 'sheet.error', 'press2.pressed', 'farServer.created'],
    needs: [AGENTS_NEED, MACHINE_NEED, FAR_RULES_NEED],
    clauses: [
      ['the first press answered "…could not find a session called … Nothing was changed." and the sheet stayed open', (r) => r.sheet.closed === false && NO_ROW_PIECES.every((p) => String(r.sheet.error).includes(p))],
      ['a second press: the far server holds two sessions of that name', (r) => r.press2.pressed === true && r.farServer.created === 2]
    ]
  },
  'R6@head': {
    title: 'HEAD, a session not listed back: the sheet closes on the session, ONE on the far server, its row unreachable and then its own status',
    reads: ['agents.ok', 'machine.usable', 'far.stampHeld', 'far.listHeldAfterStamps', 'appLog.noListShown', 'sheet.closed', 'sheet.error', 'farServer.created', 'row.first', 'row.settled'],
    needs: [AGENTS_NEED, MACHINE_NEED, FAR_RULES_NEED, ['the create reached the step no list had shown, its own log line says so (D12)', (r) => r.appLog.noListShown >= 1]],
    clauses: [
      closedClause,
      ['ONE session of that name on the far server', (r) => r.farServer.created === 1],
      ['the window’s row read unreachable first, then the session’s own status once a list completed', (r) => r.row.first === 'unknown' && LIVE_STATUSES.includes(r.row.settled)]
    ]
  },
  'R5@parent': {
    title: 'the parent, a login file prints first: SPAWN_FAILED carrying the printed line, the row gone while the session runs, and a second press makes two',
    reads: ['agents.ok', 'machine.usable', 'loginFile.written', 'loginFile.prints', 'sheet.closed', 'sheet.error', 'rejection.code', 'rejection.detail', 'rowGone', 'farServer.afterFirst', 'press2.pressed', 'farServer.created'],
    needs: [AGENTS_NEED, MACHINE_NEED, LOGIN_NEED],
    clauses: [
      ['the first press answered SPAWN_FAILED and the sheet stayed open', (r) => r.sheet.closed === false && r.rejection.code === 'SPAWN_FAILED'],
      ['the rejection’s detail carries the far login file’s line', (r) => String(r.rejection.detail).includes(FAR_LOGIN_LINE)],
      ['the row is gone while the far server holds the session', (r) => r.rowGone === true && r.farServer.afterFirst >= 1],
      ['a second press made two sessions on the far server', (r) => r.press2.pressed === true && r.farServer.created === 2]
    ]
  },
  'R5@head': {
    title: 'HEAD, a login file prints first: the sheet closes on the session bound by its id, ONE on the far server stamped @gmux-id, no byte of the line anywhere',
    reads: ['agents.ok', 'machine.usable', 'loginFile.written', 'loginFile.prints', 'appLog.unreadAnswers', 'sheet.closed', 'sheet.error', 'farServer.created', 'farServer.stamped', 'leak.sheet', 'leak.toasts', 'leak.appLog', 'leak.rejections'],
    // The probe review (2026-11-08): LOGIN_NEED proves a local zsh prints the
    // line, not that the far `new-session` answer carried it. Without D11's own
    // line this arm passed with the fault never reached. Both read arms say it,
    // so a create that wrongly reads the session as absent still FAILS here.
    needs: [AGENTS_NEED, MACHINE_NEED, LOGIN_NEED, ['the far login file’s line reached the create’s answer: HEAD’s own line says the answer was not one session id (D11)', (r) => r.appLog.unreadAnswers >= 1]],
    clauses: [
      closedClause,
      ['ONE session of that name on the far server, carrying the @gmux-id of the row the create wrote', (r) => r.farServer.created === 1 && r.farServer.stamped === true],
      ['no byte of the printed line in the sheet, a toast, app.log or a rejection', (r) => r.leak.sheet === false && r.leak.toasts === false && r.leak.appLog === false && r.leak.rejections === false]
    ]
  },
  'L1@parent': {
    title: 'the parent, stopped at the record, in a busy window: the stopped sentence, again on a second press with nothing spawned, ONE session on the server, no line of a step after the spawn, and the window stays on the session in use',
    reads: ['agents.ok', 'held', 'armed', 'appLog.stopped', 'sheet.closed', 'sheet.error', 'press2.pressed', 'press2.error', 'press2.spawned', 'server.created', 'appLog.warns', ...WINDOW_READS, ...BUSY_READS],
    // THE PROBE REVIEW OF HIS RULED ROUND (2026-11-14): the run reads an app.log
    // that is not there as empty, so "no line of a step after the spawn" passed
    // over an arm whose log was never read. The latch's own line, which the
    // parent writes too (357), is the proof that it was, as L2's need is.
    needs: [AGENTS_NEED, HELD_NEED, ARMED_NEED('updateSession'), ['the latch came after the spawn: one manifest.stopped naming updateSession', (r) => r.appLog.stopped.length === 1 && r.appLog.stopped[0].operation === 'updateSession'], WINDOW_NEED, ...BUSY_NEEDS],
    clauses: [stoppedClause, secondPressClause, oneSessionClause, noStepLinesClause, stayedClause]
  },
  'L1@head': {
    title: 'HEAD, stopped at the record, in a busy window: by his ruling the parent’s answer (the stopped sentence, again on a second press with nothing spawned, ONE session), one manifest.stopped naming updateSession, one warn each for record and read-back, and the window stays on the session in use',
    reads: ['agents.ok', 'held', 'armed', 'sheet.closed', 'sheet.error', 'press2.pressed', 'press2.error', 'press2.spawned', 'server.created', 'appLog.stopped', 'appLog.warns', ...WINDOW_READS, ...BUSY_READS],
    needs: [AGENTS_NEED, HELD_NEED, ARMED_NEED('updateSession'), WINDOW_NEED, ...BUSY_NEEDS],
    clauses: [
      stoppedClause,
      secondPressClause,
      oneSessionClause,
      ['app.log holds one manifest.stopped, naming updateSession', (r) => r.appLog.stopped.length === 1 && r.appLog.stopped[0].operation === 'updateSession'],
      ['app.log holds one sessions warn for record and one for read-back, each naming a code and no message', (r) => warnsOf(r.appLog, 'record').length === 1 && warnsOf(r.appLog, 'read-back').length === 1 && r.appLog.warns.every((w) => typeof w.code === 'string' && w.code !== '' && w.hasMessage === false)],
      stayedClause
    ]
  },
  'L2@parent': {
    title: 'the parent, stopped at the broadcast’s read, in a busy window: the stopped sentence, ONE session on the server, no line of a step after the spawn, and the window stays on the session in use',
    reads: ['agents.ok', 'held', 'armed', 'appLog.stopped', 'appLog.warns', 'sheet.closed', 'sheet.error', 'server.created', ...WINDOW_READS, ...BUSY_READS],
    needs: [AGENTS_NEED, HELD_NEED, ARMED_NEED('listSessions'), ['the latch came after the spawn: one manifest.stopped naming listSessions', (r) => r.appLog.stopped.length === 1 && r.appLog.stopped[0].operation === 'listSessions'], WINDOW_NEED, ...BUSY_NEEDS],
    clauses: [stoppedClause, oneSessionClause, noStepLinesClause, stayedClause]
  },
  'L2@head': {
    title: 'HEAD, stopped at the broadcast’s read, in a busy window: by his ruling the parent’s answer (the stopped sentence, ONE session), one read-back warn and no other step’s, and the window stays on the session in use',
    reads: ['agents.ok', 'held', 'armed', 'appLog.stopped', 'appLog.warns', 'sheet.closed', 'sheet.error', 'server.created', ...WINDOW_READS, ...BUSY_READS],
    needs: [AGENTS_NEED, HELD_NEED, ARMED_NEED('listSessions'), ['the latch came after the spawn: one manifest.stopped naming listSessions', (r) => r.appLog.stopped.length === 1 && r.appLog.stopped[0].operation === 'listSessions'], WINDOW_NEED, ...BUSY_NEEDS],
    clauses: [
      stoppedClause,
      oneSessionClause,
      ['app.log holds one sessions warn, for read-back, naming a code and no message, and no other step’s', (r) => r.appLog.warns.length === 1 && warnsOf(r.appLog, 'read-back').length === 1 && typeof r.appLog.warns[0].code === 'string' && r.appLog.warns[0].code !== '' && r.appLog.warns[0].hasMessage === false],
      stayedClause
    ]
  },
  'R7L@parent': R7L_GRADER('parent'),
  'R7L@head': R7L_GRADER('head'),
  'R7@parent': R7_GRADER('parent'),
  'R7@head': R7_GRADER('head'),
  'RF@parent': RF_GRADER('parent'),
  'RF@head': RF_GRADER('head'),
  'RN@parent': RN_GRADER('parent'),
  'RN@head': RN_GRADER('head'),
  'RFL@parent': RFL_GRADER('parent'),
  'RFL@head': RFL_GRADER('head'),
  RUN: {
    title: 'the wrappers held, /usr/bin/sqlite3 present, the hidden agents held, the census held, every pid ended, every scratch server gone, his history unmoved',
    reads: ['preflights', 'sqlite3', 'agentsHeld', 'census', 'violations', 'samplerReads', 'pidsLeft', 'localServerGone', 'farServerGone', 'history.before', 'history.after', 'crashReports'],
    needs: [
      ['at least one launch reached its window', (r) => Array.isArray(r.agentsHeld) && r.agentsHeld.length > 0],
      // The probe review (2026-11-08): with no sample read, "no violation" was a missing reading.
      ['the sampler read the process table during the launches', (r) => r.samplerReads > 0]
    ],
    clauses: [
      ['every wrapper matched its sha256 before every launch', (r) => r.preflights.length > 0 && r.preflights.every((x) => x === true)],
      ['/usr/bin/sqlite3 was there', (r) => r.sqlite3 === true],
      ['every launch’s agents:list resolved nothing but the stand-ins (none)', (r) => r.agentsHeld.every((x) => x === true)],
      ['every launch’s census held (no finding about his server)', (r) => r.census.length > 0 && r.census.every((x) => x === true)],
      ['the sampler saw no ssh without -F none and no real Tailscale', (r) => r.violations === 0],
      ['every pid this run started is gone', (r) => Array.isArray(r.pidsLeft) && r.pidsLeft.length === 0],
      ['every scratch tmux server is gone, this Mac’s and the far one', (r) => r.localServerGone === true && r.farServerGone === true],
      ['his shell history did not move across the run', (r) => historyHeld(r.history) === 'unmoved' || historyHeld(r.history) === 'his terminal'],
      ['no Electron, Tortie or tmux crash report appeared during the run', (r) => Array.isArray(r.crashReports) && r.crashReports.length === 0]
    ]
  }
};

/** True when `path` (dots) names a value that is not undefined. */
function present(reading, path) {
  let o = reading;
  for (const k of String(path).split('.')) {
    if (o === null || o === undefined || typeof o !== 'object') return false;
    o = o[k];
  }
  return o !== undefined;
}
const holds = (predicate, reading) => {
  try {
    return predicate(reading) === true;
  } catch {
    return false;
  }
};
/** The words a missing field is named by in a verdict. */
export const missingField = (path) => `the reading has no ${path}`;

/**
 * One arm's verdict: `{ verdict: 'pass'|'fail'|'unreadable', ok, failed, missing }`.
 * A field the arm reads that is absent, or a need that does not hold, is
 * UNREADABLE and no clause is asked; a clause that throws is a failed clause.
 */
export function grade(id, reading) {
  const g = GRADERS[id];
  const missing = g.reads.filter((path) => !present(reading, path)).map(missingField);
  if (missing.length === 0) for (const [name, predicate] of g.needs) if (!holds(predicate, reading)) missing.push(name);
  if (missing.length > 0) return { verdict: 'unreadable', ok: null, failed: [], missing };
  const failed = g.clauses.filter(([, predicate]) => !holds(predicate, reading)).map(([name]) => name);
  return { verdict: failed.length === 0 ? 'pass' : 'fail', ok: failed.length === 0, failed, missing: [] };
}

// ===========================================================================
// 4. --grader-self-test: every grader and every reader on the fixtures.
// ===========================================================================

export const GRADER_FIXTURES = join(ROOT, 'build', 'p360', 'fixtures', 'graders.json');

function at(obj, path) {
  const keys = String(path).split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) ? Number(k) : k];
  const last = keys[keys.length - 1];
  return { o, k: /^\d+$/.test(last) ? Number(last) : last };
}
export function applyOps(reading, ops) {
  for (const op of ops) {
    if (op.set !== undefined) {
      const { o, k } = at(reading, op.set);
      o[k] = structuredClone(op.value);
    } else if (op.delete !== undefined) {
      const { o, k } = at(reading, op.delete);
      if (Array.isArray(o)) o.splice(k, 1);
      else delete o[k];
    } else if (op.push !== undefined) {
      const { o, k } = at(reading, op.push);
      o[k].push(structuredClone(op.value));
    } else throw new Error(`an op this reader does not know: ${J(op)}`);
  }
  return reading;
}

/**
 * A raw fixture's reading: the honest reading of its arm with each sub-reading
 * named in `derive` REPLACED by what the live run's own reader makes of the
 * raw input. The arms below call exactly these functions on the same inputs.
 */
export function deriveReading(base, derive) {
  const reading = structuredClone(base);
  const d = derive ?? {};
  if (d.localLog !== undefined) reading.held = holdReading(parseWrapperLog(d.localLog), d.rule ?? 'hold-new-session-answer', d.from ?? 0).held;
  if (d.farLog !== undefined) {
    const f = farHoldReading(parseWrapperLog(d.farLog), d.from ?? 0, d.to ?? Number.MAX_SAFE_INTEGER);
    reading.far = { ...reading.far, stampHeld: f.stampHeld, listHeldAfterStamps: f.listHeldAfterStamps };
  }
  // The fix round: app.log as the run reads it, the files' texts before the arm
  // and after it, sliced by the one reader the run uses.
  const appLogLinesIn = d.appLogTexts !== undefined ? appLogSinceTexts(d.appLogTexts.before, d.appLogTexts.after) : d.appLog;
  if (appLogLinesIn !== undefined) {
    const al = appLogReading(appLogLinesIn, { canary: d.canary ?? null });
    reading.appLog = { ...reading.appLog, stopped: al.stopped, warns: al.warns, noListShown: al.noListShown, unreadAnswers: al.unreadAnswers };
    if (d.canary !== undefined && reading.leak !== undefined) reading.leak = { ...reading.leak, appLog: al.canaryLines > 0 };
    // His second ruled round: D13's line, as the remote stop arms read it.
    if (reading.appLog.feedNotStarted !== undefined) reading.appLog.feedNotStarted = remoteStopLog(appLogLinesIn).feedNotStarted;
  }
  // His second ruled round: the far log as the remote stop arms read it.
  // (One spread: gate:background's value reader read a `const` of this call
  // followed by a `reading.far = { … }` as a start at the far log's reader.)
  if (d.stampLog !== undefined) reading.far = { ...reading.far, ...stampHoldReading(parseWrapperLog(d.stampLog.text), d.stampLog.base, d.stampLog.pressAt, d.stampLog.armAt) };
  if (d.press2FarLog !== undefined && reading.press2 !== undefined) {
    reading.press2 = { ...reading.press2, farStarted: farCreatesOf(parseWrapperLog(d.press2FarLog.text), d.press2FarLog.base, d.press2FarLog.from ?? 0).length };
  }
  if (d.appText !== undefined) {
    const rej = handlerRejections(d.appText);
    const last = rej.filter((x) => typeof x.code === 'string').at(-1) ?? null;
    if (reading.rejection !== undefined) {
      // As the live arm reads it: a rejection that does not parse is no reading.
      if (last !== null) reading.rejection = { code: last.code, detail: last.detail };
      else delete reading.rejection;
    }
    if (reading.leak !== undefined) reading.leak = { ...reading.leak, rejections: rejectionsCarry(d.appText, FAR_LOGIN_LINE) };
  }
  if (d.list !== undefined) {
    const before = rowsOfName(listRows(d.list.before), d.list.base).length;
    const after = rowsOfName(listRows(d.list.after), d.list.base).length;
    const key = d.list.far === true ? 'farServer' : 'server';
    reading[key] = { ...reading[key], created: after - before };
  }
  if (d.statuses !== undefined) reading.row = rowReading(d.statuses);
  if (d.sheet !== undefined) reading.sheetSettled = sheetSettled(d.sheet);
  // His ruled round: the busy window, from what the page recorded by its own clock.
  if (d.busy !== undefined) reading.busy = busyReading(d.busy);
  // His third ruled round: real keystrokes, read back from the session's own server's capture.
  if (d.typed !== undefined) {
    const t = { ...reading.typed };
    if (d.typed.before !== undefined) t.before = typedReading(d.typed.before.capture, d.typed.before.mark);
    if (d.typed.after !== undefined) t.after = typedReading(d.typed.after.capture, d.typed.after.mark);
    reading.typed = t;
  }
  return reading;
}

function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  let fixtures = null;
  try {
    fixtures = JSON.parse(readFileSync(GRADER_FIXTURES, 'utf8'));
  } catch (err) {
    say(false, `${GRADER_FIXTURES.slice(ROOT.length + 1)} does not read: ${String(err?.message ?? err)}`);
    process.stdout.write('[p360] grader self-test FAIL.\n');
    return false;
  }
  const honest = fixtures.honest ?? {};
  const broken = Array.isArray(fixtures.broken) ? fixtures.broken : [];
  const unread = Array.isArray(fixtures.unreadable) ? fixtures.unreadable : [];
  const raw = Array.isArray(fixtures.raw) ? fixtures.raw : [];
  const readers = Array.isArray(fixtures.readers) ? fixtures.readers : [];
  const count = Object.keys(honest).length + broken.length + unread.length + raw.length + readers.length;
  say(count === fixtures.readings, `the fixtures hold ${String(count)} readings, as their own count says (${String(fixtures.readings)})`);
  const sole = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const soleMiss = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const known = (arm, names, kind) => {
    const list = kind === 'clause' ? GRADERS[arm].clauses.map(([n]) => n) : [...GRADERS[arm].needs.map(([n]) => n), ...GRADERS[arm].reads.map(missingField)];
    return (names ?? []).filter((n) => !list.includes(n));
  };
  const judge = (c, reading) => {
    if (GRADERS[c.arm] === undefined) {
      say(false, `the fixture "${String(c.name)}" names ${J(c.arm)}, which is no arm`);
      return;
    }
    const expect = c.expect ?? (c.mustMiss !== undefined ? 'unreadable' : c.mustFail !== undefined ? 'fail' : 'pass');
    const unknown = [...known(c.arm, c.mustFail, 'clause'), ...known(c.arm, c.mustMiss, 'need')];
    if (unknown.length > 0) {
      say(false, `${c.arm} "${c.name}" names ${J(unknown)}, which its grader does not`);
      return;
    }
    let g;
    try {
      g = grade(c.arm, reading());
    } catch (err) {
      say(false, `${c.arm} "${c.name}" could not be read: ${String(err?.message ?? err)}`);
      return;
    }
    if (expect === 'pass') {
      say(g.verdict === 'pass', `${c.arm} passes: ${c.name}${g.verdict === 'pass' ? '' : ` (${g.verdict}: ${J(g.verdict === 'fail' ? g.failed : g.missing)})`}`);
      return;
    }
    const want = J([...(expect === 'fail' ? c.mustFail : c.mustMiss)].sort());
    const got = J([...(expect === 'fail' ? g.failed : g.missing)].sort());
    const right = g.verdict === expect && want === got;
    say(right, `${c.arm} answers ${expect.toUpperCase()} on exactly ${want} for: ${c.name}${right ? '' : ` (answered ${g.verdict}: ${J(g.verdict === 'fail' ? g.failed : g.missing)})`}`);
    if (right && expect === 'fail' && c.mustFail.length === 1) sole.get(c.arm).add(c.mustFail[0]);
    if (right && expect === 'unreadable' && c.mustMiss.length === 1) soleMiss.get(c.arm).add(c.mustMiss[0]);
  };
  // 1. Every grader's honest reading passes: a parent-shaped and a HEAD-shaped record per arm, and RUN.
  for (const id of Object.keys(GRADERS)) {
    if (honest[id] === undefined) say(false, `${id} has no honest reading`);
    else judge({ arm: id, name: 'its honest reading', expect: 'pass' }, () => structuredClone(honest[id]));
  }
  // 1b. Each arm's parent-shaped reading FAILS HEAD's grader and HEAD's fails the parent's: the two builds are told apart.
  //     His second ruling's R7L and R7 are the other way round: HEAD answers what the parent answers, so each
  //     build's honest reading passes the other build's grader too, and the two graders hold the same clauses.
  for (const arm of ALL_ARMS) {
    const p = honest[`${arm}@parent`];
    const h = honest[`${arm}@head`];
    if (p === undefined || h === undefined) continue;
    const ph = grade(`${arm}@head`, structuredClone(p));
    const hp = grade(`${arm}@parent`, structuredClone(h));
    if (SAME_AT_BOTH.includes(arm)) {
      const names = (id) => J([...GRADERS[id].clauses.map(([n]) => n), ...GRADERS[id].needs.map(([n]) => n), ...GRADERS[id].reads]);
      say(names(`${arm}@parent`) === names(`${arm}@head`), `${arm}: the two builds are graded by the same reads, needs and clauses (his second ruling)`);
      say(ph.verdict === 'pass', `${arm}: the parent's honest reading passes HEAD's grader (${ph.verdict})`);
      say(hp.verdict === 'pass', `${arm}: HEAD's honest reading passes the parent's grader (${hp.verdict})`);
      continue;
    }
    say(ph.verdict !== 'pass', `${arm}: the parent's honest reading does not pass HEAD's grader (${ph.verdict})`);
    say(hp.verdict !== 'pass', `${arm}: HEAD's honest reading does not pass the parent's grader (${hp.verdict})`);
  }
  // 2. Every broken reading FAILS exactly the clauses it names.
  for (const c of broken) judge({ ...c, expect: 'fail' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 3. Every unreadable reading answers UNREADABLE on exactly the needs it names.
  for (const c of unread) judge({ ...c, expect: 'unreadable' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 4. Every raw fixture, through the live run's own readers.
  for (const c of raw) judge(c, () => applyOps(deriveReading(honest[c.arm], c.derive), c.ops ?? []));
  // 5. The readers alone, each against the answer its fixture says.
  for (const c of readers) {
    let got;
    try {
      got = READER_FNS[c.reader](...(c.args ?? []));
    } catch (err) {
      got = { threw: String(err?.message ?? err) };
    }
    const pick = c.path === undefined ? got : String(c.path).split('.').reduce((o, k) => (o === null || o === undefined ? o : o[k]), got);
    say(J(pick) === J(c.want), `reader ${c.reader}: ${c.name}${J(pick) === J(c.want) ? '' : ` (answered ${J(pick)}, wanted ${J(c.want)})`}`);
  }
  // 6. A MISSING READING IS NEVER A PASS: every field an arm reads, deleted alone, answers UNREADABLE naming it.
  let swept = 0;
  for (const [id, g] of Object.entries(GRADERS)) {
    if (honest[id] === undefined) continue;
    for (const path of g.reads) {
      swept += 1;
      const r = structuredClone(honest[id]);
      const parts = path.split('.');
      let o = r;
      for (const k of parts.slice(0, -1)) o = o?.[k];
      if (o !== null && typeof o === 'object') delete o[parts[parts.length - 1]];
      const v = grade(id, r);
      if (!(v.verdict === 'unreadable' && v.missing.includes(missingField(path)))) say(false, `${id} without ${path} answered ${v.verdict}${v.verdict === 'unreadable' ? ` without naming the field (${J(v.missing)})` : ', not UNREADABLE'}`);
    }
  }
  say(swept > 0, `a missing reading is never a pass: ${String(swept)} fields, each deleted alone, each answered UNREADABLE`);
  // 7. Every clause shown red alone, and every need shown unreadable alone.
  let clauses = 0;
  let needs = 0;
  for (const [id, g] of Object.entries(GRADERS)) {
    for (const [name] of g.clauses) {
      clauses += 1;
      say(sole.get(id).has(name), `${id} clause shown red alone: ${name}`);
    }
    for (const [name] of g.needs) {
      needs += 1;
      say(soleMiss.get(id).has(name), `${id} need shown unreadable alone: ${name}`);
    }
  }
  process.stdout.write(
    failures === 0
      ? `[p360] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses each shown red alone, ${String(needs)} needs each shown unreadable alone, ${String(swept)} fields that answer UNREADABLE when missing, ${String(raw.length)} raw fixtures through the run's own readers, ${String(readers.length)} reader checks. Nothing was started.\n`
      : `[p360] grader self-test FAIL: ${String(failures)}.\n`
  );
  return failures === 0;
}

/** The readers the fixtures call by name. */
export const READER_FNS = Object.freeze({
  shellWords,
  tmuxVerb,
  parseWrapperLog,
  holdReading: (text, rule, from) => holdReading(parseWrapperLog(text), rule, from),
  farHoldReading: (text, from, to) => farHoldReading(parseWrapperLog(text), from, to),
  appLogLinesOf,
  appLogSinceTexts,
  appLogReading,
  handlerRejections,
  rejectionsCarry,
  jsonObjectIn,
  listRows,
  rowsOfName: (text, base) => rowsOfName(listRows(text), base).map((r) => r.name),
  sheetSettled,
  rowReading,
  historyHeld,
  armName,
  busyReading,
  remoteStopLog,
  farCreatesOf: (text, base, from) => farCreatesOf(parseWrapperLog(text), base, from),
  stampHoldReading: (text, base, pressAt, armAt) => stampHoldReading(parseWrapperLog(text), base, pressAt, armAt),
  typedReading
});

/** A reading that could not be taken: the arm answers UNREADABLE, never a pass and never a failure. */
class Unreadable extends Error {}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain && SELF_TEST) process.exit(graderSelfTest() ? 0 : 1);
if (isMain) await run();

// ===========================================================================
// 5. THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

async function run() {
  const TAG = '[p360]';
  const t0 = Date.now();
  const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
  const refuse = (why) => {
    console.error(`${TAG} REFUSED. ${why}`);
    process.exit(2);
  };

  // ---- the refusals, in the order they are asked ------------------------------
  const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p360`, which wraps this file in build/harness-socket.mjs.');
  if (SOCKET === 'gmux' || SOCKET === 'default' || !/^gmux-p360[a-z0-9-]*-\d+$/.test(SOCKET)) refuse(`"${SOCKET}" is not a gmux-p360 harness socket ending in its pid.`);
  if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME, the yard and the profiles.');
  const PARENT = (process.env['P360_PARENT_CHECKOUT'] ?? '').trim();
  if (PARENT === '') refuse(`P360_PARENT_CHECKOUT is not set. The parent (${SNAPSHOT}, built) runs first and is required.`);
  for (const checkout of [ROOT, resolve(PARENT)]) {
    if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) refuse(`${join(checkout, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);
  }
  // The fix round added the three files it changed: the snapshot write and the
  // window's landing. They stay listed after his ruled round put them back to
  // the parent's bytes, so a bundle built before that is refused, not read.
  const SOURCES =['src/main/sessions/create-local.ts', 'src/main/sessions/core.ts', 'src/main/machines/remote-sessions.ts', 'src/main/machines/create-confirmation.ts', 'src/main/machines/remote-copy.ts', 'src/main/context/snapshot.ts', 'src/renderer/state/sessions-slice.ts', 'src/renderer/state/subscriptions.ts'];
  const bundleAt = statSync(join(ROOT, 'out', 'main', 'index.js')).mtimeMs;
  const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > bundleAt);
  if (newer.length > 0) refuse(`out/ is older than ${newer.join(', ')}; build first.`);
  const KEEP = process.env['P360_KEEP'] === '1';
  const ARMS = (process.env['P360_ARMS'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const a of ARMS) if (!ALL_ARMS.includes(a)) refuse(`P360_ARMS names ${J(a)}, which is no arm (${ALL_ARMS.join(', ')}).`);
  const wants = (id) => ARMS.length === 0 || ARMS.includes(id);
  const TMUX = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
  const FAR_TMUX = (process.env['P360_FAR_TMUX'] ?? '').trim() || TMUX;
  for (const [name, path] of [['the vendored tmux', TMUX], ['P360_FAR_TMUX', FAR_TMUX]]) {
    try {
      if (!statSync(path).isFile()) throw new Error('not a file');
    } catch {
      refuse(`${name} ${path} is not a file.`);
    }
  }
  const SQLITE3 = '/usr/bin/sqlite3';
  const sqlite3Present = existsSync(SQLITE3);
  if (!sqlite3Present && (wants('L3'))) refuse(`${SQLITE3} is missing, which holds L3's write lock.`);
  for (const f of ['build/p360/local-tmux.sh', 'build/p326/far-tmux.sh', 'build/p3167/seed-sessions.mts']) if (!existsSync(join(ROOT, f))) refuse(`${f} is missing.`);

  // His history, size and modified time only, read from the account record's home.
  const historyStat = () =>
    ['.zsh_history', '.bash_history']
      .map((name) => {
        try {
          const s = statSync(join(REAL_HOME, name));
          return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
        } catch {
          return 'absent';
        }
      })
      .join('|');
  const historyBefore = historyStat();
  say(`his history (size, mtime): ${historyBefore}`);
  /** Crash reports by NAME and modified time only, never their content. */
  const DIAG = join(REAL_HOME, 'Library', 'Logs', 'DiagnosticReports');
  const crashNames = (sinceMs) => {
    try {
      return readdirSync(DIAG).filter((n) => /^(Electron|Tortie|tmux)/i.test(n)).filter((n) => {
        try {
          return statSync(join(DIAG, n)).mtimeMs >= sinceMs;
        } catch {
          return false;
        }
      });
    } catch {
      // A folder that could not be listed is no reading (UNREADABLE), never
      // "no crash report" (the probe review, 2026-11-08).
      return undefined;
    }
  };
  const runStartedAt = Date.now();

  // ---- the modules, loaded only now ------------------------------------------
  const { cdpEval, wsConnect } = await import('../cdp-client.mjs');
  const { pickRendererTarget } = await import('../cdp-target.mjs');
  const { AGENTS_LIST_EXPR, hiddenAgentsBesides, hiddenAgentsPrecheck, standInsOnlyVerdict, writeHiddenAgents } = await import('../hidden-agents.mjs');
  const { scratchYard, scratchMachine, refuseRealSockets } = await import('../scratch-machine.mjs');
  const { keyscanText } = await import('../ssh-run.mjs');
  const { tsxCli } = await import('../ts-runner.mjs');
  refuseRealSockets(SOCKET, 'p360');

  // ---- the scratch world ------------------------------------------------------
  mkdirSync(join(HARNESS_DIR, 'p360'), { recursive: true, mode: 0o700 });
  const RUN = realpathSync(join(HARNESS_DIR, 'p360'));
  if (/['"\s$`\\]/.test(RUN)) refuse(`${RUN} holds a quote, a space or a shell character, and it is written into wrappers and env files.`);
  mkdirSync(SCRATCH_HOME, { recursive: true, mode: 0o700 });
  const OUT = resolve(ROOT, (process.env['P360_OUT_DIR'] ?? '').trim() || join('out', 'p360'));
  const BIN = join(RUN, 'bin');
  const LOCAL = join(RUN, 'local');
  const FAR = join(RUN, 'far');
  for (const d of [BIN, LOCAL, FAR]) mkdirSync(d, { recursive: true, mode: 0o700 });

  const report = { checkout: ROOT, parent: resolve(PARENT), socket: SOCKET, arms: [], readings: {}, printed: {} };
  let failures = 0;
  let unreadable = 0;
  const cannotRead = (id, why) => {
    unreadable += 1;
    report.arms.push({ id, ok: null, said: why });
    say(`UNREADABLE ${id}: ${why}`);
  };
  const arm = (id, reading) => {
    report.readings[id] = reading;
    const g = grade(id, reading);
    if (g.verdict === 'unreadable') {
      cannotRead(id, `${GRADERS[id].title}; could not read ${J(g.missing)}${reading?.error ? `; ${reading.error}` : ''}`);
      return;
    }
    report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
    if (!g.ok) failures += 1;
    say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
  };

  // ---- what this run starts, so its finally can end exactly that ---------------
  const started = { shims: new Set(), apps: new Set(), sqlite: new Set(), yard: [], farServers: new Set() };
  const record = (pid) => {
    if (Number.isInteger(pid) && pid > 0) started.yard.push(pid);
  };
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return err?.code === 'EPERM';
    }
  };
  /** A pid's own command line, read again right before any signal. */
  const commandOf = (pid) => (spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 5_000 }).stdout ?? '').trim();
  const endPid = (pid, mustName, signal = 'SIGTERM') => {
    if (!alive(pid)) return true;
    const cmd = commandOf(pid);
    if (cmd === '' || !mustName.every((m) => cmd.includes(m))) return !alive(pid);
    try {
      process.kill(pid, signal);
    } catch {
      /* already gone */
    }
    return true;
  };

  // ---- the wrappers -------------------------------------------------------------
  const wrappers = {};
  const pinWrapper = (key, path) => {
    chmodSync(path, 0o755);
    wrappers[key] = { path, sha: sha256(readFileSync(path)) };
    return path;
  };
  const LOCAL_WRAPPER = join(LOCAL, 'local-tmux.sh');
  const LOCAL_LOG = join(LOCAL, 'local.log');
  const LOCAL_RULES = join(LOCAL, 'rules');
  copyFileSync(join(ROOT, 'build', 'p360', 'local-tmux.sh'), LOCAL_WRAPPER);
  writeFileSync(join(LOCAL, 'local-tmux.env'), `REAL=${shq(TMUX)}\nLOG=${shq(LOCAL_LOG)}\nRULES=${shq(LOCAL_RULES)}\n`);
  writeFileSync(LOCAL_LOG, '');
  pinWrapper('local-tmux', LOCAL_WRAPPER);
  const FAR_WRAPPER = join(FAR, 'far-tmux.sh');
  const FAR_LOG = join(FAR, 'far.log');
  const FAR_RULES = join(FAR, 'rules');
  const FAR_HOME = join(FAR, 'far-home');
  mkdirSync(FAR_HOME, { recursive: true, mode: 0o700 });
  writeFileSync(join(FAR_HOME, '.zshrc'), "PS1='p360 %# '\nunset HISTFILE\n");
  writeFileSync(join(FAR_HOME, '.hushlogin'), '');
  copyFileSync(join(ROOT, 'build', 'p326', 'far-tmux.sh'), FAR_WRAPPER);
  writeFileSync(join(FAR, 'far-tmux.env'), `REAL=${shq(FAR_TMUX)}\nLOG=${shq(FAR_LOG)}\nRULES=${shq(FAR_RULES)}\nFARHOME=${shq(FAR_HOME)}\n`);
  writeFileSync(FAR_LOG, '');
  pinWrapper('far-tmux', FAR_WRAPPER);
  /** Rewrite a rules file atomically, and clear the one-shot and release marks beside it. */
  const writeRules = (rules, lines) => {
    writeFileSync(`${rules}.tmp`, lines.length === 0 ? '' : `${lines.join('\n')}\n`);
    renameSync(`${rules}.tmp`, rules);
    for (const mark of ['taken', 'first-list']) rmSync(`${rules}.${mark}`, { recursive: true, force: true });
    rmSync(`${rules}.release`, { force: true });
  };
  writeRules(LOCAL_RULES, []);
  writeRules(FAR_RULES, []);
  const release = () => writeFileSync(`${LOCAL_RULES}.release`, `${String(Date.now())}\n`);
  const localRecords = () => parseWrapperLog(readFileSync(LOCAL_LOG, 'utf8'));
  const farRecords = () => parseWrapperLog(existsSync(FAR_LOG) ? readFileSync(FAR_LOG, 'utf8') : '');
  writeFileSync(join(SCRATCH_HOME, '.zshrc'), "PS1='p360 %# '\nunset HISTFILE\n");
  writeFileSync(join(SCRATCH_HOME, '.hushlogin'), '');

  // ---- the yard, the loopback machine, the ssh and tailscale wrappers ----------
  let yard = null;
  let machine = null;
  const wantsMachine = wants('R6') || wants('R5') || REMOTE_STOP_ARMS.some(wants);
  const freePort = () =>
    new Promise((done, fail) => {
      const server = createServer();
      server.once('error', fail);
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        server.close(() => done(port));
      });
    });
  const farEnv = () => ({ PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: machine?.scratchHome ?? SCRATCH_HOME, TMUX_TMPDIR: machine?.tmuxTmp ?? '/nonexistent', LC_ALL: 'C' });
  /** The far server, read with its REAL binary, never the wrapper, so it never enters the far log. */
  const farTmux = (args) => spawnSync(FAR_TMUX, ['-L', SOCKET, '-f', '/dev/null', ...args], { encoding: 'utf8', timeout: 10_000, env: farEnv() });
  const farRows = () => (machine === null ? [] : listRows(farTmux(['list-sessions', '-F', '#{session_id} #{session_name} #{@gmux-id}']).stdout));
  /** End the far server by the pid it reports, read again by ps first (probe:p326's way). */
  const endFarServer = () => {
    if (machine === null) return;
    refuseRealSockets(SOCKET, 'p360');
    const pid = Number((farTmux(['display-message', '-p', '#{pid}']).stdout ?? '').trim());
    if (!Number.isInteger(pid) || pid <= 1) return;
    started.farServers.add(pid);
    endPid(pid, ['tmux', SOCKET], 'SIGKILL');
  };
  const farServerAnswers = () => machine !== null && farTmux(['list-sessions']).status === 0;
  const zdot = () => join(yard.root, 'zdot');
  const setZshenv = (text) => {
    const path = join(zdot(), '.zshenv');
    if (text === null) rmSync(path, { force: true });
    else writeFileSync(path, text, { mode: 0o600 });
  };

  const TS_WRAPPER = join(BIN, 'tailscale');
  writeFileSync(TS_WRAPPER, '#!/bin/sh\n# Phase 360 probe: no Tailscale here. It answers nothing and starts nothing.\necho "p360: no tailscale in this run" >&2\nexit 1\n', { mode: 0o755 });
  pinWrapper('tailscale', TS_WRAPPER);
  let SSH_WRAPPER = null;

  /** Every wrapper byte for byte as written, before a launch. */
  const preflights = [];
  const preflight = () => {
    const problems = [];
    for (const w of Object.values(wrappers)) {
      try {
        const st = statSync(w.path);
        if (!st.isFile() || (st.mode & 0o111) === 0) problems.push(`${w.path} is not an executable file`);
        if (sha256(readFileSync(w.path)) !== w.sha) problems.push(`${w.path} changed since it was written`);
      } catch {
        problems.push(`${w.path} is gone`);
      }
    }
    preflights.push(problems.length === 0);
    return problems;
  };

  // ---- the sampler: no ssh of this run without -F none, no real Tailscale ------
  let samplerAbort = null;
  let violations = 0;
  /** How many samples read a process table at all: a sampler that never read one saw nothing, which is no reading. */
  let samplerReads = 0;
  const violationLines = [];
  const startSampler = (shimPid) => {
    const timer = setInterval(() => {
      const ps = spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,args='], { encoding: 'utf8', timeout: 5_000, maxBuffer: 32 * 1024 * 1024 });
      const rows = String(ps.stdout ?? '').split('\n').map((l) => /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(l)).filter((m) => m !== null).map((m) => ({ pid: Number(m[1]), ppid: Number(m[2]), args: m[3] }));
      if (rows.length > 0) samplerReads += 1;
      const kids = new Map();
      for (const r of rows) kids.set(r.ppid, [...(kids.get(r.ppid) ?? []), r.pid]);
      const mine = new Set();
      const walk = (p) => {
        for (const c of kids.get(p) ?? []) if (!mine.has(c)) (mine.add(c), walk(c));
      };
      walk(shimPid);
      for (const r of rows) {
        const ours = mine.has(r.pid) || r.args.includes(RUN);
        if (!ours) continue;
        if (/^\/usr\/bin\/ssh\s/.test(r.args) && !r.args.startsWith('/usr/bin/ssh -F none ')) {
          violations += 1;
          violationLines.push(r.args.slice(0, 200));
          samplerAbort = `an ssh of this run without -F none first: ${r.args.slice(0, 120)}`;
        }
        if (/(^|\/)tailscale(d)?(\s|$)/.test(r.args) && !r.args.includes(TS_WRAPPER)) {
          violations += 1;
          violationLines.push(r.args.slice(0, 200));
          samplerAbort = `a real Tailscale under the run: ${r.args.slice(0, 120)}`;
        }
      }
    }, 1_000);
    return () => clearInterval(timer);
  };
  const guard = () => {
    if (samplerAbort !== null) throw new Unreadable(`the sampler stopped the run: ${samplerAbort}`);
  };

  // ---- the census and the scratch verdict, as the helper prints them -----------
  const helperLines = [];
  const consoleError = console.error;
  console.error = (...args) => {
    helperLines.push(args.map((a) => String(a)).join(' '));
    consoleError(...args);
  };

  // ---- the app, over its renderer ------------------------------------------------
  const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));
  const paths = (build, n) => {
    const base = join(RUN, `${build}-${String(n)}`);
    return {
      base,
      profile: join(base, 'profile'),
      home: join(base, 'home'),
      proj: join(base, 'proj'),
      seam: join(base, 'manifest-fault.json'),
      manifest: join(base, 'profile', 'gmux', 'manifest.db'),
      appLog: join(base, 'profile', 'logs', 'app.log'),
      appLogOld: join(base, 'profile', 'logs', 'app.log.1')
    };
  };
  /** Both app.log files' texts, the rotated one first; a file that is not there reads empty. */
  const appLogTexts = (p) =>
    [p.appLogOld, p.appLog].map((f) => {
      try {
        return readFileSync(f, 'utf8');
      } catch {
        return '';
      }
    });
  /** Every line, by the one reader the self-test drives (`appLogLinesOf`), so an arm's start count holds no empty string. */
  const appLogLines = (p) => appLogLinesOf(appLogTexts(p));
  const devtoolsPort = (p) => {
    try {
      return Number(readFileSync(join(p.profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      return 0;
    }
  };
  async function attachWindow(p, timeoutMs = 150_000) {
    const startedAt = Date.now();
    for (;;) {
      guard();
      const port = devtoolsPort(p);
      if (port > 0) {
        try {
          const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
          const picked = pickRendererTarget(list);
          if (picked.target !== null) {
            const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
            await cdp.call('Runtime.enable');
            for (let i = 0; i < 300; i += 1) {
              if ((await cdpEval(cdp, "typeof window.gmux === 'object' && typeof window.gmux.sessions === 'object' && typeof window.__gmuxP95 === 'object'")) === true) return cdp;
              await sleep(300);
            }
          }
        } catch {
          /* not up yet */
        }
      }
      if (Date.now() - startedAt > timeoutMs) throw new Unreadable('no app window with the bridge and the probe drives');
      await sleep(300);
    }
  }
  /** One expression in a window: `{ ok, value }` or `{ ok: false, error }`. */
  const bridge = async (cdp, expr, ms = 120_000) =>
    JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e).slice(0, 4000) }); } })()`, ms));
  const p95 = async (cdp, method, ...args) => bridge(cdp, `window.__gmuxP95.${method}(${args.map((a) => J(a)).join(', ')})`, 180_000);

  /** The page kit: the sheet's state, a typed field, a press, the store's rows, the toasts. Injected as a function's own source. */
  function pageKit() {
    if (window.__p360 !== undefined) return true;
    const q = (s) => document.querySelector(s);
    const SHEET = '.modal[aria-label="New session"]';
    window.__p360 = {
      sheet: () => {
        const modal = q(SHEET);
        const name = document.getElementById('session-name');
        if (modal === null || name === null) return { open: false, creating: false, error: null, name: null, text: null };
        const button = modal.querySelector('.modal-actions .btn-primary');
        const err = modal.querySelector('.modal-error');
        return {
          open: true,
          creating: button !== null && (button.disabled === true || String(button.textContent ?? '').includes('Creating')),
          error: err === null ? null : String(err.textContent ?? '').trim(),
          name: name.value,
          text: String(modal.textContent ?? '')
        };
      },
      pickShell: () => {
        const tiles = Array.from(document.querySelectorAll(`${SHEET} .agent-grid [aria-pressed]`));
        const shell = tiles.find((t) => String(t.querySelector('.agent-tile-name')?.textContent ?? '').trim() === 'Shell');
        if (shell === undefined) return 'missing';
        if (shell.getAttribute('aria-pressed') === 'true') return 'already';
        shell.click();
        return 'pressed';
      },
      typeName: (value) => {
        const el = document.getElementById('session-name');
        if (el === null) return 'missing';
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return 'typed';
      },
      pressCreate: () => {
        const b = q(`${SHEET} .modal-actions .btn-primary`);
        if (b === null) return 'missing';
        if (b.disabled === true) return 'disabled';
        // The fix round: the window stamps, by its own clock, the moment the
        // sheet settles. The probe's reads pass through main's thread, so a
        // write that holds that thread delays the READ, not the window; this
        // stamp is when the person saw it (printed beside settleMs, not graded).
        // A DOM observer, not a timer: a window that is not in front has its
        // timers throttled to about one a second, which read null at the parent.
        window.__p360settle?.obs?.disconnect();
        const st = { pressAt: Date.now(), at: null, obs: null };
        st.obs = new MutationObserver(() => {
          if (st.at !== null) return;
          const s = window.__p360.sheet();
          if (s.open === false || (typeof s.error === 'string' && s.error !== '' && s.creating === false)) {
            st.at = Date.now();
            st.obs.disconnect();
          }
        });
        st.obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
        window.__p360settle = st;
        b.click();
        return 'pressed';
      },
      settledByWindow: () => (window.__p360settle?.at == null ? null : window.__p360settle.at - window.__p360settle.pressAt),
      // His second ruled round (R7L): the sheet's Machine field, set the way a person picks it.
      pickMachine: (id) => {
        const sel = document.getElementById('session-machine');
        if (sel === null) return 'no field';
        if (sel.disabled === true) return 'disabled';
        if (!Array.from(sel.options).some((o) => o.value === id)) return 'no option';
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, id);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return 'picked';
      },
      machineField: () => {
        const sel = document.getElementById('session-machine');
        return sel === null ? null : sel.value;
      },
      // R7L: the folder over there, typed into the sheet's Directory field, so the session runs in the run's scratch folder.
      typeDir: (value) => {
        const el = document.getElementById('session-dir');
        if (el === null) return 'missing';
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return 'typed';
      },
      dirField: () => document.getElementById('session-dir')?.value ?? null,
      pressCancel: () => {
        const b = Array.from(document.querySelectorAll(`${SHEET} .modal-actions button`)).find((x) => String(x.textContent ?? '').trim() === 'Cancel');
        if (b === undefined) return 'missing';
        b.click();
        return 'pressed';
      },
      toasts: () => Array.from(document.querySelectorAll('.toast-text')).map((t) => String(t.textContent ?? '').trim()),
      // The fix round: every terminal drawn, by its session, and the title of what is drawn over it (null when nothing is).
      panes: () =>
        Array.from(document.querySelectorAll('.gmux-terminal-pane')).map((p) => ({
          id: p.getAttribute('data-session-id'),
          overlay: p.querySelector('.gmux-terminal-overlay-title')?.textContent?.trim() ?? null
        })),
      record: (base) => {
        if (window.__p360rec?.timer) clearInterval(window.__p360rec.timer);
        const rec = { base, seq: [], timer: null };
        rec.timer = setInterval(async () => {
          try {
            const st = await window.__gmuxP95.state();
            const row = st.sessions.find((s) => s.name === base || s.name.startsWith(`${base}-`) || s.name.startsWith(`${base} `));
            if (row !== undefined && rec.seq[rec.seq.length - 1] !== row.status) rec.seq.push(row.status);
          } catch {
            /* the next tick reads again */
          }
        }, 200);
        window.__p360rec = rec;
        return true;
      },
      recorded: () => (window.__p360rec?.seq ?? []).slice(),
      stopRecord: () => {
        if (window.__p360rec?.timer) clearInterval(window.__p360rec.timer);
        return true;
      }
    };
    return true;
  }
  const PAGE_KIT = `(${pageKit.toString()})()`;
  const page = async (cdp, call) => {
    await cdpEval(cdp, PAGE_KIT);
    return cdpEval(cdp, `window.__p360.${call}`);
  };
  // CDP modifier bits: Alt 1, Ctrl 2, Meta 4, Shift 8. ⌘T is a renderer keydown (src/renderer/app/keyboard.ts), so CDP reaches it.
  const pressKey = async (cdp, { key, code, vk, modifiers }) => {
    const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
    await cdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  };
  const until = async (fn, ms, what) => {
    const deadline = Date.now() + ms;
    for (;;) {
      guard();
      let v = null;
      try {
        v = await fn();
      } catch {
        v = null;
      }
      if (v) return v;
      if (Date.now() > deadline) throw new Unreadable(`timed out after ${String(ms)} ms waiting for ${what}`);
      await sleep(150);
    }
  };
  /** Open the ⌘T sheet on the active tab, pick Shell, and type the arm's name. */
  const openSheet = async (cdp, name) => {
    const now = await page(cdp, 'sheet()');
    if (now?.open === true) {
      await page(cdp, 'pressCancel()');
      await until(async () => (await page(cdp, 'sheet()'))?.open === false, 10_000, 'the sheet to close before the arm');
    }
    await pressKey(cdp, { key: 't', code: 'KeyT', vk: 84, modifiers: 4 });
    await until(async () => (await page(cdp, 'sheet()'))?.open === true, 15_000, 'the ⌘T sheet to open');
    await sleep(600);
    const picked = await page(cdp, 'pickShell()');
    if (picked === 'missing') throw new Unreadable('the sheet drew no Shell tile');
    await sleep(300);
    if ((await page(cdp, `typeName(${J(name)})`)) !== 'typed') throw new Unreadable('the name field was not there to type into');
    await until(async () => (await page(cdp, 'sheet()'))?.name === name, 5_000, 'the typed name');
  };
  /**
   * His second ruled round (R7L): the ⌘T sheet on a tab on THIS Mac, its
   * Machine field set to the loopback machine the way a person picks it, its
   * Directory field the run's scratch folder over there (with no folder the
   * session would start in the far account's own home directory), then Shell
   * and the arm's name. Answers whether the field still names that machine
   * once the name is typed. With `optional`, a sheet that no longer offers the
   * machine (it is not usable once the list stopped) is typed into all the
   * same, as a person would, and answers false: that Create runs on this Mac.
   */
  const openSheetOn = async (cdp, name, machineId, dir, optional = false) => {
    const now = await page(cdp, 'sheet()');
    if (now?.open === true) {
      await page(cdp, 'pressCancel()');
      await until(async () => (await page(cdp, 'sheet()'))?.open === false, 10_000, 'the sheet to close before the arm');
    }
    await pressKey(cdp, { key: 't', code: 'KeyT', vk: 84, modifiers: 4 });
    await until(async () => (await page(cdp, 'sheet()'))?.open === true, 15_000, 'the ⌘T sheet to open');
    await sleep(600);
    const picked = await page(cdp, `pickMachine(${J(machineId)})`);
    if (picked !== 'picked' && !optional) throw new Unreadable(`the sheet's Machine field could not name ${machineId}: ${String(picked)}`);
    if (picked === 'picked') {
      // The sheet reads that machine's agents and folder once the field moves (the reverify waited the same).
      await sleep(2_000);
      if ((await page(cdp, `typeDir(${J(dir)})`)) !== 'typed') throw new Unreadable('the Directory field was not there to type into');
      await until(async () => (await page(cdp, 'dirField()')) === dir, 5_000, 'the typed folder');
    }
    if ((await page(cdp, 'pickShell()')) === 'missing') throw new Unreadable('the sheet drew no Shell tile');
    await sleep(300);
    if ((await page(cdp, `typeName(${J(name)})`)) !== 'typed') throw new Unreadable('the name field was not there to type into');
    await until(async () => (await page(cdp, 'sheet()'))?.name === name, 5_000, 'the typed name');
    return picked === 'picked' && (await page(cdp, 'machineField()')) === machineId;
  };
  const pressCreate = async (cdp) => {
    const got = await page(cdp, 'pressCreate()');
    if (got !== 'pressed') throw new Unreadable(`Create could not be pressed: ${String(got)}`);
    return Date.now();
  };
  /**
   * Wait for the sheet to settle: closed, or an error drawn with the button
   * idle. A second press first waits, at most 3 s, for the sheet to leave the
   * state the first press left (closed, creating, or another error), so the
   * first press's error is never read as the second's answer.
   */
  const waitSettle = async (cdp, pressAt, ms, priorError = null) => {
    const leftAt = Date.now() + 3_000;
    while (Date.now() < leftAt) {
      guard();
      const one = await page(cdp, 'sheet()').catch(() => null);
      if (one !== null && (one.open === false || one.creating === true || one.error !== priorError)) break;
      await sleep(50);
    }
    const s = await until(async () => {
      const one = await page(cdp, 'sheet()');
      return sheetSettled(one) ? one : null;
    }, ms, 'the sheet to settle after Create');
    return { closed: s.open === false, error: s.open === false ? null : s.error, settleMs: Date.now() - pressAt, text: s.text };
  };
  const listNames = async (cdp) => {
    const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => s.name))');
    return got.ok ? got.value : null;
  };
  const storeNames = async (cdp) => {
    const got = await p95(cdp, 'state');
    return got.ok ? got.value.sessions.map((s) => s.name) : null;
  };
  const hasName = (names, base) => Array.isArray(names) && names.some((n) => n === base || n.startsWith(`${base}-`) || n.startsWith(`${base} `));
  /** This Mac's scratch server, read with the vendored tmux directly, never the wrapper. */
  const localRows = () => listRows(spawnSync(TMUX, ['-L', SOCKET, 'list-sessions', '-F', '#{session_id} #{session_name}'], { encoding: 'utf8', timeout: 10_000 }).stdout);
  const localCount = (base) => rowsOfName(localRows(), base).length;
  const farCount = (base) => rowsOfName(farRows(), base).length;
  /** The session rows a launch's manifest holds for a name, WHILE THE APP RUNS, through a read only connection of the checkout's own better-sqlite3. */
  const manifestRowsLive = (p, req, base) => {
    let db = null;
    try {
      const Database = req('better-sqlite3');
      db = new Database(p.manifest, { readonly: true, fileMustExist: true });
      return { read: true, rows: db.prepare("select id, name, tmux_name, pane_pid, status from sessions where status != 'discarded'").all().filter((r) => r.name === base || String(r.name).startsWith(`${base}-`) || String(r.name).startsWith(`${base} `)) };
    } catch (err) {
      return { read: false, why: String(err?.message ?? err).slice(0, 160), rows: [] };
    } finally {
      try {
        db?.close();
      } catch {
        /* nothing of ours is left open */
      }
    }
  };

  // ---- L3's lock: a REAL held write lock on the scratch manifest ------------------
  const startLock = (manifest) => {
    const child = spawn(SQLITE3, [manifest], { stdio: ['pipe', 'pipe', 'pipe'] });
    started.sqlite.add(child.pid);
    let out = '';
    child.stdout.on('data', (b) => (out += b.toString()));
    child.stderr.on('data', (b) => (out += b.toString()));
    const exited = new Promise((done) => child.on('exit', (code) => done(code)));
    child.stdin.write('BEGIN IMMEDIATE;\n');
    return { child, exited, out: () => out };
  };
  const proveLock = (manifest) => {
    const r = spawnSync(SQLITE3, ['-cmd', '.timeout 0', manifest, 'BEGIN IMMEDIATE; ROLLBACK;'], { encoding: 'utf8', timeout: 10_000 });
    return /database is locked/i.test(`${r.stdout ?? ''}${r.stderr ?? ''}`);
  };
  const endLock = async (lock) => {
    if (lock === null) return;
    try {
      lock.child.stdin.write('ROLLBACK;\n.quit\n');
      lock.child.stdin.end();
    } catch {
      /* already closed */
    }
    const code = await Promise.race([lock.exited, sleep(5_000).then(() => 'still running')]);
    if (code === 'still running') endPid(lock.child.pid, [SQLITE3]);
  };

  // ---- one launch ------------------------------------------------------------------
  const agentsHeld = [];
  const census = [];
  const precheckDone = new Set();
  const launchEnv = (p) =>
    withoutDevRenderer({
      ...INHERITED_CLAUDE,
      HOME: p.home,
      ZDOTDIR: p.home,
      HISTFILE: '/dev/null',
      SHELL: '/bin/sh',
      TERM_SESSION_ID: undefined,
      TERM_PROGRAM: undefined,
      SSH_AUTH_SOCK: undefined,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_HARNESS_DIR: HARNESS_DIR,
      GMUX_TMUX_BIN: LOCAL_WRAPPER,
      GMUX_TAILSCALE_BIN: TS_WRAPPER,
      ...(SSH_WRAPPER === null ? {} : { GMUX_SSH_BIN: SSH_WRAPPER }),
      GMUX_HARNESS_MANIFEST_FAULT: p.seam
    });
  const seed = (p) => {
    mkdirSync(join(p.profile, 'gmux'), { recursive: true });
    const r = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', join(ROOT, 'tsconfig.node.json'), join(ROOT, 'build', 'p3167', 'seed-sessions.mts'), '--manifest', p.manifest, '--shape', 'his', '--root', join(p.base, 'seed-folders')],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, HOME: p.home, TMPDIR: HARNESS_DIR }, timeout: 120_000 }
    );
    return { status: r.status, out: (r.stdout ?? '').trim().slice(0, 400), err: (r.stderr ?? '').trim().slice(0, 400) };
  };
  const writeMachineRow = (p) => {
    const configDir = join(p.profile, 'gmux', 'config');
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
    writeFileSync(join(configDir, 'machines.json'), `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: 'p360 loopback', host: machine.host, user: machine.user, port: machine.port, remoteTmuxPath: FAR_WRAPPER }] })}\n`, 'utf8');
    const known = join(p.profile, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(known), { recursive: true });
    writeFileSync(known, keyscanText({ host: machine.host, port: machine.port, caller: 'build/p360/probe-p360.mjs' }), 'utf8');
  };

  /**
   * One launch: the world, the hidden agents, the census, then `body`. Answers
   * what `body` answers; a launch that never reached its window throws.
   */
  const launch = async (build, n, withMachine, body) => {
    const checkout = build === 'parent' ? resolve(PARENT) : ROOT;
    const p = paths(build, n);
    rmSync(p.base, { recursive: true, force: true });
    for (const d of [p.home, p.proj]) mkdirSync(d, { recursive: true, mode: 0o700 });
    writeFileSync(join(p.home, '.zshrc'), "PS1='p360 %# '\nunset HISTFILE\n");
    writeFileSync(join(p.home, '.hushlogin'), '');
    const seeded = seed(p);
    report.printed[`${build}-${String(n)}-seed`] = seeded;
    if (seeded.status !== 0) throw new Unreadable(`the seed failed: ${J(seeded)}`);
    if (withMachine) writeMachineRow(p);
    writeHiddenAgents(p.profile, 'p360', hiddenAgentsBesides([]));
    if (!precheckDone.has(checkout)) {
      precheckDone.add(checkout);
      const pre = hiddenAgentsPrecheck({ checkout, prefix: 'p360', home: p.home, userPath: process.env['PATH'] ?? '', standIns: [] });
      report.printed[`${build}-hidden-precheck`] = { ok: pre.ok, said: pre.said };
      if (!pre.ok) throw new Unreadable(`${checkout}'s own overlay parser does not hide every probed row: ${pre.said}`);
    }
    const problems = preflight();
    if (problems.length > 0) throw new Unreadable(`the preflight refused the launch: ${problems.join('; ')}`);
    writeRules(LOCAL_RULES, []);
    writeRules(FAR_RULES, []);
    rmSync(p.seam, { force: true });
    const helperFrom = helperLines.length;
    const label = `p360-${build}-${String(n)}`;
    say(`launch ${label} (${checkout})`);
    let result;
    // A census or scratch finding is THROWN by the helper when the body returned
    // and PRINTED when the body threw, so both are read: the printed lines and
    // the thrown message.
    let thrown = null;
    try {
      result = await withElectron(
        {
          label,
          userDataDir: p.profile,
          cwd: checkout,
          tmuxSocket: SOCKET,
          args: ['--remote-debugging-port=0', '--use-mock-keychain'],
          env: launchEnv(p),
          graceMs: 8_000
        },
        async (handle) => {
          started.shims.add(handle.pid);
          const stopSampler = startSampler(handle.pid);
          let cdp = null;
          try {
            cdp = await attachWindow(p);
            try {
              const a = handle.appPid();
              if (a > 0) started.apps.add(a);
            } catch {
              /* not up yet */
            }
            const agents = standInsOnlyVerdict(JSON.parse(await cdpEval(cdp, AGENTS_LIST_EXPR, 120_000)), { standIns: [] });
            agentsHeld.push(agents.ok);
            if (!agents.ok) throw new Unreadable(`an agent resolved: ${agents.said}`);
            // The world: one project, three live shells, created from the window.
            const opened = await p95(cdp, 'openLocal', p.proj);
            if (!opened.ok) throw new Unreadable(`the project did not open: ${opened.error}`);
            for (const name of SHELL_NAMES) {
              const made = await bridge(cdp, `window.gmux.sessions.create({ name: ${J(name)}, projectPath: ${J(p.proj)}, agent: 'shell' }).then((s) => s.id)`, 60_000);
              if (!made.ok) throw new Unreadable(`the world's shell ${name} was not created: ${made.error}`);
            }
            await sleep(3_000);
            const listed = await listNames(cdp);
            if (!SHELL_NAMES.every((nm) => hasName(listed, nm))) throw new Unreadable(`the world's three shells are not all listed: ${J(listed)}`);
            return await body({ cdp, handle, p, checkout, agents, req: createRequire(join(checkout, 'package.json')) });
          } finally {
            stopSampler();
            try {
              const a = handle.appPid();
              if (a > 0) started.apps.add(a);
            } catch {
              /* already recorded */
            }
            cdp?.close();
          }
        }
      );
    } catch (err) {
      thrown = err;
    } finally {
      const said = [...helperLines.slice(helperFrom).filter((l) => l.includes(label)), ...(thrown === null ? [] : [String(thrown?.message ?? thrown)])];
      census.push(!said.some((l) => CENSUS_FAIL.test(l) || SCRATCH_FAIL.test(l)));
      report.printed[`${label}-helper`] = said.slice(0, 20).map((l) => l.slice(0, 400));
      if (existsSync(p.appLog) || existsSync(p.appLogOld)) {
        const lines = appLogLines(p);
        report.printed[`${label}-override-warnings`] = lines.filter((l) => /GMUX_(SSH|TAILSCALE)_BIN does not name/.test(l)).length;
      }
    }
    if (thrown !== null) throw thrown;
    return result;
  };

  // ---- the arms ----------------------------------------------------------------------
  /** The app.log lines appended since `fromLines` lines were there, counted as `appLogLinesOf` counts them. */
  const appLogSince = (p, fromLines) => appLogLines(p).slice(fromLines);

  /**
   * THE FIX ROUND (the attack lens's arm W, 2026-11-08). The window's active
   * session and the terminal drawn for it: `{ activeId, pane }`, the pane being
   * `{ id, overlay }` with the title of whatever is drawn over it, or null when
   * no terminal is drawn for that session.
   */
  const windowNow = async (cdp) => {
    const st = await p95(cdp, 'state');
    const activeId = st.ok ? (st.value?.activeSessionId ?? null) : null;
    const panes = await page(cdp, 'panes()');
    const pane = Array.isArray(panes) ? (panes.find((x) => x.id === activeId) ?? null) : null;
    return { activeId, pane };
  };
  /**
   * Put the window on the world's first shell and wait, at most 15 s, until its
   * terminal is drawn with nothing over it, then read that again a second
   * later: `{ id, before }`. A window that never got there is the arm's
   * missing need, never a pass.
   */
  const settleOnWorking = async (cdp, shellName = SHELL_NAMES[0]) => {
    const st = await p95(cdp, 'state');
    const work = st.ok ? (st.value?.sessions ?? []).find((s) => s.name === shellName) : undefined;
    if (work === undefined) return { id: null, before: false };
    await p95(cdp, 'select', work.id);
    const connected = (w) => w.activeId === work.id && w.pane !== null && w.pane.overlay === null;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      guard();
      if (connected(await windowNow(cdp))) {
        await sleep(1_000);
        return { id: work.id, before: connected(await windowNow(cdp)) };
      }
      await sleep(250);
    }
    return { id: work.id, before: false };
  };
  /** Where the window is once an arm's create has settled, against the session it was on before the press. */
  const windowAfter = async (cdp, workId) => {
    const w = await windowNow(cdp);
    return { stayed: workId !== null && w.activeId === workId, connected: workId !== null && w.activeId === workId && w.pane !== null && w.pane.overlay === null, activeId: w.activeId, overlay: w.pane?.overlay ?? null };
  };

  /**
   * HIS RULED ROUND (2026-11-14): THE BUSY WINDOW. The page starts counting,
   * by its own clock, the output it receives from the session in use and the
   * stopped notice; then that session runs PRINT_LOOP on this run's scratch
   * server (the vendored tmux, never the wrapper) and the arm waits 1.5 s for
   * the output to flow. Answers the session's `$`-id, or null when the
   * scratch server lists no session carrying that id.
   */
  const startPrinting = async (cdp, workId) => {
    const row = listRows(spawnSync(TMUX, ['-L', SOCKET, 'list-sessions', '-F', '#{session_id} #{session_name} #{@gmux-id}'], { encoding: 'utf8', timeout: 10_000 }).stdout).find((x) => x.gmuxId === workId);
    if (row === undefined) return null;
    await cdpEval(
      cdp,
      `(() => {
        window.__p360busy?.off?.();
        const rec = { data: [], notices: [], spin: null, offs: [] };
        rec.offs.push(window.gmux.term.onData(${J(workId)}, () => { if (rec.data.length < 100000) rec.data.push(Date.now()); }));
        rec.offs.push(window.gmux.scrollback.onNotice((n) => { if (n && n.kind === 'manifest-stopped') rec.notices.push(Date.now()); }));
        rec.off = () => { for (const off of rec.offs) { try { if (typeof off === 'function') off(); } catch { /* gone */ } } };
        window.__p360busy = rec;
        return true;
      })()`
    );
    spawnSync(TMUX, ['-L', SOCKET, 'send-keys', '-t', row.tmuxId, '-l', PRINT_LOOP], { encoding: 'utf8', timeout: 10_000 });
    spawnSync(TMUX, ['-L', SOCKET, 'send-keys', '-t', row.tmuxId, 'Enter'], { encoding: 'utf8', timeout: 10_000 });
    await sleep(1_500);
    return row.tmuxId;
  };
  /** The session in use stops printing, and the page stops counting. */
  const stopPrinting = async (cdp, tmuxId) => {
    if (tmuxId !== null) spawnSync(TMUX, ['-L', SOCKET, 'send-keys', '-t', tmuxId, 'C-c'], { encoding: 'utf8', timeout: 10_000 });
    await cdpEval(cdp, '(() => { window.__p360busy?.off?.(); return true; })()').catch(() => undefined);
  };
  /**
   * The long task, then the release: ONE synchronous evaluation of SPIN_MS in
   * the page, sent and not awaited, the hold released SPIN_LEAD_MS later while
   * it runs, so the create finishes, answers and posts the stopped notice while
   * the window is busy. Answers the release's time.
   */
  const spinThenRelease = async (cdp) => {
    const spinning = cdpEval(cdp, `(() => { const from = Date.now(); const end = performance.now() + ${String(SPIN_MS)}; while (performance.now() < end) { /* the long task */ } if (window.__p360busy) window.__p360busy.spin = { from, to: Date.now() }; return true; })()`, 30_000);
    await sleep(SPIN_LEAD_MS);
    const releasedAt = Date.now();
    release();
    await spinning.catch(() => undefined);
    return releasedAt;
  };
  /** What the page recorded for the busy window, read once the sheet settled, beside the probe's release. */
  const busyRaw = async (cdp, releasedAt) => {
    const got = JSON.parse(await cdpEval(cdp, 'JSON.stringify({ busy: window.__p360busy ? { data: window.__p360busy.data, notices: window.__p360busy.notices, spin: window.__p360busy.spin } : null, settle: window.__p360settle ? { pressAt: window.__p360settle.pressAt, at: window.__p360settle.at } : null })'));
    return {
      data: got.busy?.data ?? [],
      notices: got.busy?.notices ?? [],
      spin: got.busy?.spin ?? null,
      pressAt: got.settle?.pressAt ?? null,
      settledAt: got.settle?.at ?? null,
      releasedAt,
      spinMs: SPIN_MS
    };
  };
  /** The busy window's raw record, cut to what a verifier re-derives from. */
  const busyPrinted = (raw) => ({ ...raw, data: { count: raw.data.length, first: raw.data[0] ?? null, last: raw.data.at(-1) ?? null } });

  const armL3 = async ({ cdp, p, agents, req }, build) => {
    const base = armName('L3', build);
    const r = { agents: { ok: agents.ok } };
    const logFrom = appLogLines(p).length;
    const before = localCount(base);
    writeRules(LOCAL_RULES, ['hold-new-session-answer']);
    await openSheet(cdp, base);
    let lock = null;
    try {
      const pressAt = await pressCreate(cdp);
      await until(() => localRecords().some((x) => x.note !== undefined && x.t >= pressAt - 50 && x.note[0] === 'held' && x.note[1] === 'hold-new-session-answer'), 10_000, 'the wrapper to hold the create');
      lock = startLock(p.manifest);
      await sleep(300);
      r.lock = { proven: proveLock(p.manifest) };
      release();
      const settled = await waitSettle(cdp, pressAt, 90_000);
      r.sheet = { closed: settled.closed, error: settled.error, settleMs: settled.settleMs };
      // The fix round: when the window itself settled, by its own clock, beside
      // when this probe could read it (lens A's minor, the 5 s HEAD took more).
      report.printed[`L3@${build}-settled`] = { byProbeMs: settled.settleMs, byWindowMs: await page(cdp, 'settledByWindow()') };
      await endLock(lock);
      lock = null;
      r.held = holdReading(localRecords(), 'hold-new-session-answer', pressAt - 50).held;
      const afterFirst = localCount(base);
      writeRules(LOCAL_RULES, []);
      if (!settled.closed) {
        const press2At = await pressCreate(cdp);
        const second = await waitSettle(cdp, press2At, 60_000, settled.error);
        r.press2 = { pressed: true, closed: second.closed, error: second.error };
      } else r.press2 = { pressed: false, closed: null, error: null };
      await sleep(3_000);
      const after = localCount(base);
      r.server = { before, afterFirst, after, created: after - before };
      r.drawn = hasName(await storeNames(cdp), base);
      const al = appLogReading(appLogSince(p, logFrom));
      r.appLog = { warns: al.warns, stopped: al.stopped };
      report.printed[`L3@${build}-row`] = manifestRowsLive(p, req, base);
    } finally {
      await endLock(lock);
      writeRules(LOCAL_RULES, []);
    }
    return r;
  };

  const focusRemote = async (cdp, farFolder) => {
    const opened = await p95(cdp, 'openRemote', MACHINE_ID, farFolder);
    const st = opened.ok ? opened.value?.state : null;
    const active = st?.projects?.find((x) => x.id === st.activeProjectId) ?? null;
    return opened.ok && opened.value?.result?.ok === true && active !== null && active.machineId === MACHINE_ID;
  };

  const armR6 = async ({ cdp, p, agents }, build, machineUp, farFolder) => {
    const base = armName('R6', build);
    const r = { agents: { ok: agents.ok }, machine: { usable: machineUp && (await focusRemote(cdp, farFolder)) } };
    if (!r.machine.usable) return { ...r, error: 'the remote tab is not the active one' };
    const logFrom = appLogLines(p).length;
    const farFrom = Date.now();
    const before = farCount(base);
    writeRules(FAR_RULES, [`stamp-delay-ms ${String(R6_STAMP_MS)}`]);
    try {
      await openSheet(cdp, base);
      await page(cdp, `record(${J(base)})`);
      const pressAt = await pressCreate(cdp);
      const held = await until(() => farRecords().find((x) => x.note !== undefined && x.t >= pressAt - 50 && x.note[0] === 'held' && x.note[1] === 'stamp-delay-ms'), 30_000, "the far wrapper to hold the create's @gmux-id stamp");
      const waitFor = held.t + R6_RULE_AT_MS - Date.now();
      if (waitFor > 0) await sleep(waitFor);
      writeRules(FAR_RULES, [`first-list-delay-ms ${String(R6_LIST_MS)}`]);
      const settled = await waitSettle(cdp, pressAt, 90_000);
      r.sheet = { closed: settled.closed, error: settled.error, settleMs: settled.settleMs };
      writeRules(FAR_RULES, []);
      const afterFirst = farCount(base);
      let press2At = Number.MAX_SAFE_INTEGER;
      if (!settled.closed) {
        press2At = await pressCreate(cdp);
        const second = await waitSettle(cdp, press2At, 90_000, settled.error);
        r.press2 = { pressed: true, closed: second.closed, error: second.error };
      } else r.press2 = { pressed: false, closed: null, error: null };
      // HEAD: the row reads unreachable, then its own status once a list completes.
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        const seq = await page(cdp, 'recorded()');
        if (Array.isArray(seq) && seq.slice(1).some((s) => LIVE_STATUSES.includes(s))) break;
        await sleep(500);
      }
      r.row = rowReading(await page(cdp, 'recorded()'));
      await page(cdp, 'stopRecord()');
      const after = farCount(base);
      r.farServer = { before, afterFirst, after, created: after - before };
      const far = farHoldReading(farRecords(), farFrom, press2At);
      r.far = { stampHeld: far.stampHeld, listHeld: far.listHeld, listHeldAfterStamps: far.listHeldAfterStamps };
      const al = appLogReading(appLogSince(p, logFrom));
      r.appLog = { noListShown: al.noListShown, warns: al.warns, stopped: al.stopped };
    } finally {
      writeRules(FAR_RULES, []);
    }
    return r;
  };

  const armR5 = async ({ cdp, p, agents, handle, req }, build, machineUp, farFolder) => {
    const base = armName('R5', build);
    const r = { agents: { ok: agents.ok }, machine: { usable: machineUp && (await focusRemote(cdp, farFolder)) } };
    if (!r.machine.usable) return { ...r, error: 'the remote tab is not the active one' };
    const logFrom = appLogLines(p).length;
    const before = farCount(base);
    writeRules(FAR_RULES, []);
    try {
      await openSheet(cdp, base);
      setZshenv(`echo "${FAR_LOGIN_LINE}"\n`);
      // The yard's ZDOTDIR is read by zsh alone, so the far account's login shell (its account record's) must be zsh, as §2.3 B1 measured.
      const loginShell = String(userInfo().shell ?? '');
      const proof = spawnSync('/bin/zsh', ['-c', 'true'], { encoding: 'utf8', timeout: 10_000, env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: machine.scratchHome ?? SCRATCH_HOME, ZDOTDIR: zdot(), HISTFILE: '/dev/null' } });
      r.loginFile = { written: existsSync(join(zdot(), '.zshenv')), prints: /\/zsh$/.test(loginShell) && String(proof.stdout ?? '').split('\n')[0] === FAR_LOGIN_LINE };
      report.printed[`R5@${build}-login-shell`] = loginShell;
      const textFrom = handle.text().length;
      const pressAt = await pressCreate(cdp);
      const settled = await waitSettle(cdp, pressAt, 90_000);
      setZshenv(null);
      r.sheet = { closed: settled.closed, error: settled.error, settleMs: settled.settleMs };
      await sleep(1_500);
      const rejections = handlerRejections(handle.text().slice(textFrom));
      const last = rejections.filter((x) => typeof x.code === 'string').at(-1) ?? null;
      // A rejection the bridge's own line did not carry, or carried in a shape this file cannot read, is no reading: UNREADABLE, never a failure.
      if (last !== null) r.rejection = { code: last.code, detail: last.detail };
      else if (settled.closed) r.rejection = { code: null, detail: null };
      const rowsNow = manifestRowsLive(p, req, base);
      r.rowGone = rowsNow.read === true && rowsNow.rows.length === 0;
      const afterFirst = farCount(base);
      if (!settled.closed) {
        const press2At = await pressCreate(cdp);
        const second = await waitSettle(cdp, press2At, 90_000, settled.error);
        r.press2 = { pressed: true, closed: second.closed, error: second.error };
      } else r.press2 = { pressed: false, closed: null, error: null };
      await sleep(2_000);
      const farNow = rowsOfName(farRows(), base);
      const rowsEnd = manifestRowsLive(p, req, base);
      r.farServer = { before, afterFirst, after: farNow.length, created: farNow.length - before, stamped: farNow.length > 0 && farNow.every((f) => rowsEnd.rows.some((m) => m.id === f.gmuxId)) };
      const toasts = await page(cdp, 'toasts()');
      const allText = handle.text().slice(textFrom);
      const al = appLogReading(appLogSince(p, logFrom), { canary: FAR_LOGIN_LINE });
      r.appLog = { unreadAnswers: al.unreadAnswers };
      const leakLines = appLogLines(p).filter((l) => l.includes(FAR_LOGIN_LINE));
      r.leak = {
        sheet: String(settled.text ?? '').includes(FAR_LOGIN_LINE) || String(settled.error ?? '').includes(FAR_LOGIN_LINE),
        toasts: Array.isArray(toasts) && toasts.some((t) => t.includes(FAR_LOGIN_LINE)),
        appLog: leakLines.length > 0,
        rejections: rejectionsCarry(allText, FAR_LOGIN_LINE)
      };
      report.printed[`R5@${build}-rejections`] = rejections.map((x) => ({ code: x.code ?? null, message: x.message ?? null, detail: x.detail ?? null }));
      report.printed[`R5@${build}-appLog`] = al;
      // Printed, not graded: which app.log lines carried the probe's own canary, so a leak can be placed (the create's path or another) at both builds.
      report.printed[`R5@${build}-leak-lines`] = leakLines.slice(0, 5).map((l) => l.slice(0, 300));
    } finally {
      setZshenv(null);
    }
    return r;
  };

  /** Arm the seam during a hold: one fault at the next call of `operation`, its armed line read on the app's own output. */
  const armSeam = async (handle, p, operation) => {
    writeFileSync(p.seam, `${J({ seq: 1, fail: { operation, code: 'SQLITE_CORRUPT' } })}\n`);
    try {
      await handle.waitForLine(new RegExp(`manifest fault armed: seq=1 ${operation} SQLITE_CORRUPT`), 3_000);
      return true;
    } catch {
      return false;
    }
  };

  const armL1 = async ({ cdp, p, agents, handle }, build) => {
    const base = armName('L1', build);
    const r = { agents: { ok: agents.ok } };
    const work = await settleOnWorking(cdp);
    const logFrom = appLogLines(p).length;
    const before = localCount(base);
    writeRules(LOCAL_RULES, ['hold-new-session-answer']);
    let printing = null;
    try {
      // His ruled round: the session in use prints from before the press until the window is read.
      printing = work.id === null ? null : await startPrinting(cdp, work.id);
      await openSheet(cdp, base);
      const pressAt = await pressCreate(cdp);
      await until(() => localRecords().some((x) => x.note !== undefined && x.t >= pressAt - 50 && x.note[0] === 'held' && x.note[1] === 'hold-new-session-answer'), 10_000, 'the wrapper to hold the create');
      r.armed = await armSeam(handle, p, 'updateSession');
      const releasedAt = await spinThenRelease(cdp);
      const settled = await waitSettle(cdp, pressAt, 60_000);
      r.sheet = { closed: settled.closed, error: settled.error, settleMs: settled.settleMs };
      const busy = await busyRaw(cdp, releasedAt);
      r.busy = busyReading(busy);
      report.printed[`L1@${build}-busy`] = busyPrinted(busy);
      r.held = holdReading(localRecords(), 'hold-new-session-answer', pressAt - 50).held;
      writeRules(LOCAL_RULES, []);
      const afterFirst = localCount(base);
      if (!settled.closed) {
        const press2At = await pressCreate(cdp);
        const second = await waitSettle(cdp, press2At, 60_000, settled.error);
        await sleep(2_000);
        r.press2 = { pressed: true, closed: second.closed, error: second.error, spawned: localCount(base) > afterFirst };
      } else r.press2 = { pressed: false, closed: null, error: null, spawned: null };
      await sleep(2_000);
      const after = localCount(base);
      r.server = { before, afterFirst, after, created: after - before };
      r.listed = hasName(await listNames(cdp), base);
      r.drawn = hasName(await storeNames(cdp), base);
      const at = await windowAfter(cdp, work.id);
      r.window = { before: work.before, stayed: at.stayed, connected: at.connected };
      const al = appLogReading(appLogSince(p, logFrom));
      r.appLog = { stopped: al.stopped, warns: al.warns };
      report.printed[`L1@${build}-window`] = { listed: r.listed, drawn: r.drawn, workingId: work.id, activeId: at.activeId, overlay: at.overlay };
    } finally {
      writeRules(LOCAL_RULES, []);
      await stopPrinting(cdp, printing);
    }
    return r;
  };

  const armL2 = async ({ cdp, p, agents, handle }, build) => {
    const base = armName('L2', build);
    const r = { agents: { ok: agents.ok } };
    const work = await settleOnWorking(cdp);
    const logFrom = appLogLines(p).length;
    const before = localCount(base);
    writeRules(LOCAL_RULES, ['hold-stamp @gmux-agent']);
    let printing = null;
    try {
      // His ruled round: the session in use prints from before the press until the window is read.
      printing = work.id === null ? null : await startPrinting(cdp, work.id);
      await openSheet(cdp, base);
      const pressAt = await pressCreate(cdp);
      await until(() => localRecords().some((x) => x.note !== undefined && x.t >= pressAt - 50 && x.note[0] === 'held' && x.note[1] === 'hold-stamp-@gmux-agent'), 10_000, "the wrapper to hold the create's @gmux-agent stamp");
      // His ruled round: armed once the refresh the new session's own notice
      // starts has run (the fix round's reverify waited the same), so the read
      // that takes the fault is the create's own broadcast after the release,
      // while the window is busy, and not a read during the hold.
      await sleep(L2_ARM_DELAY_MS);
      r.armed = await armSeam(handle, p, 'listSessions');
      const textAtRelease = handle.text().length;
      const releasedAt = await spinThenRelease(cdp);
      const settled = await waitSettle(cdp, pressAt, 60_000);
      r.sheet = { closed: settled.closed, error: settled.error, settleMs: settled.settleMs };
      const busy = await busyRaw(cdp, releasedAt);
      r.busy = busyReading(busy);
      report.printed[`L2@${build}-busy`] = busyPrinted(busy);
      r.held = holdReading(localRecords(), 'hold-stamp-@gmux-agent', pressAt - 50).held;
      writeRules(LOCAL_RULES, []);
      await sleep(2_000);
      const after = localCount(base);
      r.server = { before, after, created: after - before };
      r.drawn = hasName(await storeNames(cdp), base);
      const at = await windowAfter(cdp, work.id);
      r.window = { before: work.before, stayed: at.stayed, connected: at.connected };
      const al = appLogReading(appLogSince(p, logFrom));
      r.appLog = { stopped: al.stopped, warns: al.warns };
      const fired = handle.text().indexOf('manifest fault fired: seq=1 listSessions');
      report.printed[`L2@${build}-which-read`] = fired === -1 ? 'the fault never fired' : fired < textAtRelease ? 'a tick took the throw during the hold, after the spawn' : "the create's own broadcast or a tick after the release took the throw";
      report.printed[`L2@${build}-window`] = { drawn: r.drawn, workingId: work.id, activeId: at.activeId, overlay: at.overlay };
    } finally {
      writeRules(LOCAL_RULES, []);
      await stopPrinting(cdp, printing);
    }
    return r;
  };

  /**
   * HIS SECOND RULED ROUND (2026-11-16): put the window on a session ON THE
   * LOOPBACK MACHINE, made from its tab the way the window makes one, and wait,
   * at most 20 s, until its terminal is drawn with nothing over it: `{ id, before }`.
   */
  const settleOnFar = async (cdp, name) => {
    const made = await p95(cdp, 'create', { name, agent: 'shell', machineId: MACHINE_ID });
    const work = made.ok ? (made.value?.sessions ?? []).find((s) => s.name === name) : undefined;
    if (work === undefined) return { id: null, before: false };
    await p95(cdp, 'select', work.id);
    const connected = (w) => w.activeId === work.id && w.pane !== null && w.pane.overlay === null;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      guard();
      if (connected(await windowNow(cdp))) {
        await sleep(1_000);
        return { id: work.id, before: connected(await windowNow(cdp)) };
      }
      await sleep(250);
    }
    return { id: work.id, before: false };
  };
  /**
   * HIS THIRD RULED ROUND (2026-11-17): REAL KEYSTROKES, as a person types them
   * (the last reverify's rv3.mjs). A mouse press and release at the centre of
   * the session's terminal, so the click puts the focus in its xterm; the text
   * through CDP's Input.insertText into what that click focused; then a real
   * Enter key. They pass the pane's own input gate (TerminalPane's
   * `paneRefusesInput`), which the bridge's term.sendInput skips: his second
   * ruled round's probe read "typing reached" through it for a pane that
   * dropped every key a person typed. A click that did not focus the terminal
   * types nothing: `how` says so and the reading is false, never forced.
   * Answers `{ how }`: 'click', or why nothing was typed.
   */
  const realType = async (cdp, sessionId, text) => {
    const sel = `.gmux-terminal-pane[data-session-id=${J(J(sessionId)).slice(1, -1)}]`;
    const box = JSON.parse(await cdpEval(cdp, `(() => { const p = document.querySelector('${sel}'); if (p === null) return 'null'; const r = p.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }); })()`));
    if (box === null) return { how: 'no terminal drawn for that session' };
    await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', buttons: 1, clickCount: 1 });
    await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(250);
    const focused = await cdpEval(cdp, `(() => { const ta = document.querySelector('${sel} .xterm-helper-textarea'); if (ta === null) return 'no terminal'; return document.activeElement === ta ? 'click' : 'the click did not focus its terminal: ' + String(document.activeElement && (document.activeElement.className || document.activeElement.tagName)).slice(0, 80); })()`);
    if (focused !== 'click') return { how: String(focused) };
    // Shift pressed and let go first, as a hand starting to type does: it
    // sends nothing, and its key-up clears xterm's note that a key is still
    // down. xterm drops an inserted text while that note stands (its
    // `_inputEvent` asks `!composed || !_keyDownSeen`), and it stands whenever
    // the last key-down it saw had its key-up land elsewhere: ⌘T's, once the
    // sheet took the focus. A real keyboard's next key-down clears it; the
    // final run's RN at the parent lost its text that way and kept its Enter.
    await cdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16, nativeVirtualKeyCode: 16, modifiers: 8 });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16, nativeVirtualKeyCode: 16, modifiers: 0 });
    await sleep(50);
    await cdp.call('Input.insertText', { text });
    await sleep(150);
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    return { how: 'click' };
  };
  /** One session's pane, captured by its own server (this Mac's scratch one, or the far one), never through the wrapper: its text, or null. */
  const captureOfSession = (sessionId, where) => {
    if (where === 'far') {
      const row = farRows().find((x) => x.gmuxId === sessionId);
      return row === undefined ? null : String(farTmux(['capture-pane', '-p', '-t', row.tmuxId]).stdout ?? '');
    }
    const row = listRows(spawnSync(TMUX, ['-L', SOCKET, 'list-sessions', '-F', '#{session_id} #{session_name} #{@gmux-id}'], { encoding: 'utf8', timeout: 10_000 }).stdout).find((x) => x.gmuxId === sessionId);
    return row === undefined ? null : String(spawnSync(TMUX, ['-L', SOCKET, 'capture-pane', '-p', '-t', row.tmuxId], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '');
  };
  /**
   * Type `echo <mark>-$((6*7))` into `sessionId` with real keystrokes and read,
   * for at most TYPED_WAIT_MS, whether its own server's capture holds the
   * shell's answer (`typedReading`). Answers `{ reached, how }`; `reached` is
   * false when nothing could be typed, and null when the capture never read.
   */
  const typedInto = async (cdp, sessionId, where, mark) => {
    const typed = await realType(cdp, sessionId, `echo ${mark}-$((6*7))`);
    if (typed.how !== 'click') return { reached: false, how: typed.how, mark, capture: null };
    const deadline = Date.now() + TYPED_WAIT_MS;
    let reached = null;
    let capture = null;
    while (Date.now() < deadline) {
      capture = captureOfSession(sessionId, where);
      reached = typedReading(capture, mark);
      if (reached === true) break;
      await sleep(250);
    }
    // The capture's last non-blank lines, kept so a verifier re-reads the answer by its own reader.
    const tail = capture === null ? null : capture.split('\n').filter((l) => l.trim() !== '').slice(-8).join('\n');
    return { reached, how: typed.how, mark, capture: tail };
  };

  /**
   * Wait, at most QUIET_WAIT_MAX_MS, until the window has heard no session list
   * for QUIET_BEFORE_PRESS_MS, counted by the window's own clock from a
   * listener this sets: `{ quiet, quietFor, lists }`, `quiet` false when the
   * lists never stopped (the arm's window need then fails: UNREADABLE).
   */
  const quietLists = async (cdp) => {
    await cdpEval(cdp, `(() => { try { window.__p360lists?.off?.(); } catch { /* gone */ } const rec = { last: Date.now(), n: 0, off: null }; rec.off = window.gmux.sessions.onChanged(() => { rec.last = Date.now(); rec.n += 1; }); window.__p360lists = rec; return true; })()`);
    const deadline = Date.now() + QUIET_WAIT_MAX_MS;
    let got = { quietFor: 0, n: 0 };
    for (;;) {
      guard();
      got = JSON.parse(await cdpEval(cdp, 'JSON.stringify({ quietFor: Date.now() - window.__p360lists.last, n: window.__p360lists.n })'));
      if (got.quietFor >= QUIET_BEFORE_PRESS_MS) break;
      if (Date.now() > deadline) break;
      await sleep(250);
    }
    await cdpEval(cdp, '(() => { try { window.__p360lists?.off?.(); } catch { /* gone */ } return true; })()').catch(() => undefined);
    return { quiet: got.quietFor >= QUIET_BEFORE_PRESS_MS, quietFor: got.quietFor, lists: got.n };
  };

  /** The person goes back to `id` by selecting it, and the probe reads, at most 15 s, whether its terminal is drawn with nothing over it. */
  const backTo = async (cdp, id) => {
    if (id === null) return { connected: false, overlay: null, activeId: null };
    await p95(cdp, 'select', id);
    const deadline = Date.now() + 15_000;
    let w = await windowNow(cdp);
    while (Date.now() < deadline) {
      guard();
      if (w.activeId === id && w.pane !== null && w.pane.overlay === null) return { connected: true, overlay: null, activeId: id };
      await sleep(250);
      w = await windowNow(cdp);
    }
    return { connected: false, overlay: w.pane?.overlay ?? null, activeId: w.activeId };
  };

  /**
   * HIS SECOND RULED ROUND: one remote stop arm (R7L, R7, RF, RN, and since his
   * third RFL; see REMOTE_STOP). The far wrapper holds the create's own
   * `@gmux-id` stamp, which the create sends only once it read that machine's
   * answer, and the seam is armed inside that hold, so the store latches after
   * that machine answered: at the create's tab write (`clearProjectTabClosed`,
   * R7L and R7, after that machine's create returned), or at once, by this
   * probe's own read of the session list standing in for a status tick
   * (`listSessions`, RF, RN and RFL, before it returned), so the create's own
   * list meets a stopped store. RN also holds that list past the poll's
   * deadline, as R6 does, so no list shows the session. Then: the sheet, the
   * far server, where the window is and what it draws, real keystrokes into the
   * session in use (and, printed, into the new session where the window
   * landed), the session in use again, and a second Create from a fresh sheet.
   */
  const armRemoteStop = async ({ cdp, handle, p, agents, req }, build, id, machineUp, farFolder) => {
    const spec = REMOTE_STOP[id];
    const base = armName(id, build);
    const r = { agents: { ok: agents.ok } };
    let work;
    if (spec.tab === 'local' && spec.inUse === 'first') {
      // HIS THIRD RULED ROUND (RFL): a tab on this Mac holding TWO shells, made
      // from the window, the FIRST in use, the last reverify's world: a create
      // that answers a session the window's list does not hold leaves the
      // window on the tab's LAST session, which main does not open while the
      // list is stopped, so a build that answered here moved the window off
      // the session in use (his second ruled round's HEAD, 3 of 3).
      const proj = join(p.base, 'proj-rfl');
      mkdirSync(proj, { recursive: true, mode: 0o700 });
      const opened = await p95(cdp, 'openLocal', proj);
      if (!opened.ok) throw new Unreadable(`the second tab on this Mac did not open: ${opened.error}`);
      for (const name of [`${base}a`, `${base}b`]) {
        const made = await bridge(cdp, `window.gmux.sessions.create({ name: ${J(name)}, projectPath: ${J(proj)}, agent: 'shell' }).then((s) => s.id)`, 60_000);
        if (!made.ok) throw new Unreadable(`the tab's shell ${name} was not created: ${made.error}`);
      }
      await sleep(2_000);
      work = await settleOnWorking(cdp, `${base}a`);
      r.machine = { usable: machineUp, fieldSet: false };
    } else if (spec.tab === 'local') {
      await p95(cdp, 'openLocal', p.proj);
      // The tab's LAST shell, as in the reverify's world, whose tab held one: a
      // create that answers a session the window's list does not hold leaves
      // the window on the tab's last session (`activeSession()`'s fallback), so
      // with any other in use BOTH builds move the window to the last one,
      // which main does not open while the list is stopped (this round's first
      // R7L run measured that at the parent and at HEAD alike).
      work = await settleOnWorking(cdp, SHELL_NAMES[SHELL_NAMES.length - 1]);
      r.machine = { usable: machineUp, fieldSet: false };
    } else {
      const usable = machineUp && (await focusRemote(cdp, farFolder));
      r.machine = { usable };
      if (!usable) return { ...r, error: 'the remote tab is not the active one' };
      work = await settleOnFar(cdp, `${base}w`);
    }
    // HIS THIRD RULED ROUND: where the session in use lives, so its keys are read back from its own server.
    const inUseOn = spec.tab === 'local' ? 'local' : 'far';
    r.typed = {};
    // The control: real keystrokes into the session in use reach it before anything is armed.
    const typedBefore = work.id === null ? { reached: false, how: 'no session in use' } : await typedInto(cdp, work.id, inUseOn, 'p360t-before');
    r.typed.before = typedBefore.reached;
    // Then the window is let go quiet before the press: no session list may
    // arrive for QUIET_BEFORE_PRESS_MS. The keys above made the session in use
    // print, and a list main sends for that while the create is out can carry
    // a project list read in the very moment the far tab was written: this
    // round's first run measured R7L landing on the new session at BOTH builds
    // with the control typed just before the press, where every earlier run
    // (6 of 6) stayed. And the window is read again: still on the session in
    // use, drawn with nothing over it, or the arm's premise is not there.
    const quiet = await quietLists(cdp);
    report.printed[`${id}@${build}-quiet-before-press`] = quiet;
    if (work.id !== null) {
      const w0 = await windowNow(cdp);
      work = { ...work, before: work.before && quiet.quiet && w0.activeId === work.id && w0.pane !== null && w0.pane.overlay === null };
    }
    const logFrom = appLogLines(p).length;
    const textFrom = handle.text().length;
    const before = farCount(base);
    writeRules(FAR_RULES, [`stamp-delay-ms ${String(REMOTE_STOP_STAMP_MS)}`]);
    try {
      if (spec.tab === 'local') r.machine.fieldSet = await openSheetOn(cdp, base, MACHINE_ID, farFolder);
      else await openSheet(cdp, base);
      const pressAt = await pressCreate(cdp);
      const held = await until(() => farRecords().find((x) => x.note !== undefined && x.t >= pressAt - 50 && x.note[0] === 'held' && x.note[1] === 'stamp-delay-ms'), 30_000, "the far wrapper to hold the create's @gmux-id stamp");
      const armAt = Date.now();
      r.armed = await armSeam(handle, p, spec.op);
      if (spec.stop === 'during') {
        // A read of the session list while the far create is out, as a status tick makes one: it takes the fault and the store latches.
        const took = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.length)');
        report.printed[`${id}@${build}-list-read`] = took.ok ? `answered ${String(took.value)} sessions` : String(took.error).slice(0, 200);
      }
      // RN: the list rule only once the stamp hold has RELEASED, read off the
      // far log every 10 ms, so the list held is the create's own (sent about
      // 80 ms later, after the three other stamps) and not a list sent during
      // the hold: this round's first whole run lost the hold to one 1,181 ms
      // into it at both builds, and the next to one 1,246 ms in at HEAD, with
      // the rule written at R6's 1,100 ms. The need reads which list was held.
      if (spec.unlisted) {
        const until10 = Date.now() + REMOTE_STOP_STAMP_MS + 3_000;
        while (Date.now() < until10 && !farRecords().some((x) => x.note !== undefined && x.t >= held.t && x.note[0] === 'released' && x.note[1] === 'stamp-delay-ms')) await sleep(10);
        writeRules(FAR_RULES, [`first-list-delay-ms ${String(R6_LIST_MS)}`]);
      }
      const settled = await waitSettle(cdp, pressAt, 90_000);
      r.sheet = { closed: settled.closed, error: settled.error, settleMs: settled.settleMs };
      report.printed[`${id}@${build}-settled`] = { byProbeMs: settled.settleMs, byWindowMs: await page(cdp, 'settledByWindow()') };
      writeRules(FAR_RULES, []);
      const hold = stampHoldReading(farRecords(), base, pressAt - 50, armAt);
      r.far = { stampHeld: hold.stampHeld, answeredBeforeArm: hold.answeredBeforeArm };
      if (spec.unlisted) r.far.listHeldAfterStamps = farHoldReading(farRecords(), pressAt - 50).listHeldAfterStamps;
      await sleep(2_000);
      // Where the window is once the create settled, and some 8 to 10 s on (printed: the parent landed on a drawn but frozen row 3 of 4 in the reverify's R7).
      const newId = rowsOfName(farRows(), base)[0]?.gmuxId || null;
      const w1 = await windowNow(cdp);
      r.window = { before: work.before, stayed: work.id !== null && w1.activeId === work.id, connected: work.id !== null && w1.activeId === work.id && w1.pane !== null && w1.pane.overlay === null, onNew: newId !== null && w1.activeId === newId };
      // HIS THIRD RULED ROUND: real keystrokes into the session in use once the
      // create settled, the person first closing a sheet left open on an error,
      // as they would. Only where the window still is: a window that moved off
      // it took no key the person typed into it.
      if (settled.closed === false) {
        await page(cdp, 'pressCancel()').catch(() => undefined);
        await until(async () => (await page(cdp, 'sheet()'))?.open === false, 10_000, 'the sheet left open on its error to close').catch(() => undefined);
        await sleep(300);
      }
      const wType = await windowNow(cdp);
      const typedAfter = work.id !== null && wType.activeId === work.id ? await typedInto(cdp, work.id, inUseOn, 'p360t-after') : { reached: false, how: `the window was on ${String(wType.activeId)}, not the session in use` };
      r.typed.after = typedAfter.reached;
      await sleep(4_000);
      const w2 = await windowNow(cdp);
      // Where the window landed on the new session (R7 at both builds): do real
      // keystrokes typed there reach it over there? PRINTED, never graded: at
      // the parent it took them 0 of 2 in one of the last reverify's runs and 2
      // of 2 in another, the same at both builds.
      let typedLanded = null;
      let typedLater = null;
      const farNew = rowsOfName(farRows(), base)[0];
      if (newId !== null && w2.activeId === newId && farNew !== undefined) {
        typedLanded = await typedInto(cdp, newId, 'far', 'p360t-landed');
        if (typedLanded.reached !== true) {
          // The person clicks it again later, once a list of that machine has shown it: does it open then?
          await sleep(12_000);
          await p95(cdp, 'select', newId);
          await sleep(3_000);
          typedLater = await typedInto(cdp, newId, 'far', 'p360t-later');
        }
      }
      report.printed[`${id}@${build}-window`] = {
        workingId: work.id,
        newId,
        atSettle: { activeId: w1.activeId, onNew: newId !== null && w1.activeId === newId, overlay: w1.pane?.overlay ?? null },
        later: { activeId: w2.activeId, onNew: newId !== null && w2.activeId === newId, overlay: w2.pane?.overlay ?? null },
        typedBefore,
        typedAfter,
        typedLanded,
        typedLater,
        toasts: await page(cdp, 'toasts()')
      };
      // The person goes back to the session they were working in.
      r.back = await backTo(cdp, work.id);
      // Printed, never graded: real keystrokes into the session in use once
      // more, after the far tab and the new session were visited; the last
      // reverify read them refused at the PARENT too in RF and R7 here.
      report.printed[`${id}@${build}-typed-back`] = work.id === null ? null : await typedInto(cdp, work.id, inUseOn, 'p360t-back');
      // A second Create, from a fresh sheet: refused before anything starts over there.
      const second = `${base}x`;
      let offered = true;
      if (spec.tab === 'local') offered = await openSheetOn(cdp, second, MACHINE_ID, farFolder, true);
      else await openSheet(cdp, second);
      // From the machine's own tab both builds draw Create off once the list
      // stopped (this round's first R7 run), which refuses before anything
      // starts too: read, never pressed through.
      const press2At = Date.now();
      const got = await page(cdp, 'pressCreate()');
      if (got === 'pressed') {
        const s2 = await waitSettle(cdp, press2At, 90_000);
        await sleep(2_000);
        r.press2 = { pressed: true, disabled: false, closed: s2.closed, error: s2.error, farStarted: farCreatesOf(farRecords(), second, press2At - 50).length };
      } else if (got === 'disabled') {
        await sleep(2_000);
        const s2 = await page(cdp, 'sheet()');
        r.press2 = { pressed: false, disabled: true, closed: s2?.open === false, error: s2?.error ?? null, farStarted: farCreatesOf(farRecords(), second, press2At - 50).length };
        report.printed[`${id}@${build}-press2-sheet`] = String(s2?.text ?? '').slice(0, 600);
      } else throw new Unreadable(`the second Create could not be found: ${String(got)}`);
      report.printed[`${id}@${build}-press2`] = { machineOffered: offered, ...r.press2 };
      await page(cdp, 'pressCancel()').catch(() => undefined);
      const farEnd = rowsOfName(farRows(), base);
      const rowsEnd = manifestRowsLive(p, req, base);
      r.farServer = { before, after: farEnd.length, created: farEnd.length - before, stamped: farEnd.length > 0 && farEnd.every((f) => rowsEnd.rows.some((m) => m.id === f.gmuxId)) };
      const lines = appLogSince(p, logFrom);
      const al = appLogReading(lines);
      const rs = remoteStopLog(lines);
      r.appLog = { stopped: al.stopped, noListShown: al.noListShown, feedNotStarted: rs.feedNotStarted, tabNotCleared: rs.tabNotCleared };
      report.printed[`${id}@${build}-fired`] = new RegExp(`manifest fault fired: seq=1 ${spec.op}`).test(handle.text().slice(textFrom));
      report.printed[`${id}@${build}-row`] = rowsEnd;
      report.printed[`${id}@${build}-back`] = r.back;
    } finally {
      writeRules(FAR_RULES, []);
    }
    return r;
  };

  // ---- the run itself -------------------------------------------------------------------
  const launch1 = LAUNCH_1.filter(wants);
  const launch2 = LAUNCH_2.filter(wants);
  const remoteStops = REMOTE_STOP_ARMS.filter(wants);
  try {
    if (wantsMachine && (launch1.some((a) => a.startsWith('R')) || remoteStops.length > 0)) {
      yard = scratchYard({ root: join(RUN, 'yard'), prefix: 'p360', record });
      const port = await freePort();
      machine = scratchMachine(yard, { id: 'loop', port });
      if (machine.scratchHome === null || !machine.scratchHome.startsWith(`${RUN}/`)) throw new Unreadable("the far HOME is not the yard's own (SCRATCH_MACHINE_SCRATCH_HOME)");
      if (!machine.start()) throw new Unreadable('the loopback machine did not start');
      const userKey = join(yard.root, 'p360-userkey');
      SSH_WRAPPER = join(BIN, 'ssh');
      writeFileSync(SSH_WRAPPER, `#!/bin/sh\n# Phase 360 probe: the loopback machine only. -F none first, the yard's port first, the yard's key only.\nexec /usr/bin/ssh -F none -p ${String(port)} -o IdentitiesOnly=yes -o IdentityFile=${userKey} "$@"\n`, { mode: 0o755 });
      pinWrapper('ssh', SSH_WRAPPER);
      say(`the loopback machine on 127.0.0.1:${String(port)}, its tmux ${FAR_TMUX} behind ${FAR_WRAPPER}`);
    }
    for (const build of BUILDS) {
      if (launch1.length > 0) {
        const withMachine = machine !== null && launch1.some((a) => a.startsWith('R'));
        endFarServer();
        const farFolder = machine === null ? null : join(machine.scratchHome, `p360-${build}`);
        if (farFolder !== null) mkdirSync(farFolder, { recursive: true, mode: 0o700 });
        try {
          await launch(build, 1, withMachine, async (ctx) => {
            let machineUp = false;
            if (withMachine) {
              const up = await p95(ctx.cdp, 'machineUp', MACHINE_ID);
              machineUp = up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable === true);
              report.printed[`${build}-machineUp`] = up.ok ? { rows: up.value.rows, prepare: J(up.value.prepare).slice(0, 300) } : up.error;
            }
            const runs = { L3: () => armL3(ctx, build), R6: () => armR6(ctx, build, machineUp, farFolder), R5: () => armR5(ctx, build, machineUp, farFolder), L1: () => armL1(ctx, build) };
            for (const id of launch1) {
              try {
                if (id.startsWith('L')) await p95(ctx.cdp, 'openLocal', ctx.p.proj);
                arm(`${id}@${build}`, await runs[id]());
              } catch (err) {
                cannotRead(`${id}@${build}`, String(err?.message ?? err));
              }
            }
          });
        } catch (err) {
          for (const id of launch1) if (!report.arms.some((a) => a.id === `${id}@${build}`)) cannotRead(`${id}@${build}`, `the launch did not finish: ${String(err?.message ?? err)}`);
        }
      }
      if (launch2.length > 0) {
        try {
          await launch(build, 2, false, async (ctx) => {
            try {
              await p95(ctx.cdp, 'openLocal', ctx.p.proj);
              arm(`L2@${build}`, await armL2(ctx, build));
            } catch (err) {
              cannotRead(`L2@${build}`, String(err?.message ?? err));
            }
          });
        } catch (err) {
          if (!report.arms.some((a) => a.id === `L2@${build}`)) cannotRead(`L2@${build}`, `the launch did not finish: ${String(err?.message ?? err)}`);
        }
      }
      // His second ruled round: one launch per remote stop arm, because each latches its store.
      for (const id of remoteStops) {
        const n = 3 + REMOTE_STOP_ARMS.indexOf(id);
        if (machine === null) {
          cannotRead(`${id}@${build}`, 'the loopback machine was not built');
          continue;
        }
        endFarServer();
        const farFolder = join(machine.scratchHome, `p360-${id.toLowerCase()}-${build}`);
        mkdirSync(farFolder, { recursive: true, mode: 0o700 });
        try {
          await launch(build, n, true, async (ctx) => {
            const up = await p95(ctx.cdp, 'machineUp', MACHINE_ID);
            const machineUp = up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable === true);
            report.printed[`${build}-${String(n)}-machineUp`] = up.ok ? { rows: up.value.rows, prepare: J(up.value.prepare).slice(0, 300) } : up.error;
            try {
              arm(`${id}@${build}`, await armRemoteStop(ctx, build, id, machineUp, farFolder));
            } catch (err) {
              cannotRead(`${id}@${build}`, String(err?.message ?? err));
            }
          });
        } catch (err) {
          if (!report.arms.some((a) => a.id === `${id}@${build}`)) cannotRead(`${id}@${build}`, `the launch did not finish: ${String(err?.message ?? err)}`);
        }
      }
    }
  } catch (err) {
    say(`the run stopped: ${String(err?.message ?? err)}`);
    unreadable += 1;
  } finally {
    console.error = consoleError;
    for (const pid of started.sqlite) endPid(pid, [SQLITE3]);
    endFarServer();
    if (machine !== null) {
      try {
        machine.stop();
      } catch {
        /* its pids are read again below */
      }
    }
    // The yard's agent and sshd, each by its own pid and only when ps still names it.
    for (const pid of started.yard) {
      const cmd = alive(pid) ? commandOf(pid) : '';
      if (cmd.includes('ssh-agent')) endPid(pid, ['ssh-agent']);
      else if (cmd.includes('sshd')) endPid(pid, ['sshd'], 'SIGKILL');
    }
    // The RUN reading, once everything this run started was asked to end.
    await sleep(1_000);
    const localGone = spawnSync(TMUX, ['-L', SOCKET, 'list-sessions'], { encoding: 'utf8', timeout: 10_000 }).status !== 0;
    const farGone = !farServerAnswers();
    if (machine !== null) {
      try {
        machine.cleanup();
      } catch {
        /* outside the run's root, named by the machine itself */
      }
    }
    // The yard's own pids (its ssh-agent and sshd) are asked too: the clause
    // says every pid this run started, and they were left out (the probe review).
    const pidsLeft = [...new Set([...started.shims, ...started.apps, ...started.sqlite, ...started.farServers, ...started.yard, ...(machine?.pid ? [machine.pid] : [])])].filter((pid) => alive(pid));
    let historyAfter = historyStat();
    const history = { before: historyBefore, after: historyAfter, quiet: null };
    if (historyAfter !== historyBefore) {
      say(`his history moved (${historyBefore} -> ${historyAfter}); starting nothing for 3 minutes and reading it again`);
      await sleep(180_000);
      history.quiet = { again: historyStat() };
      historyAfter = history.quiet.again;
    }
    const runReading = {
      preflights,
      sqlite3: sqlite3Present,
      agentsHeld,
      census,
      violations,
      samplerReads,
      pidsLeft,
      localServerGone: localGone,
      farServerGone: farGone,
      history,
      crashReports: crashNames(runStartedAt)
    };
    report.printed.violationLines = violationLines.slice(0, 20);
    arm('RUN', runReading);
    mkdirSync(OUT, { recursive: true });
    const reportPath = join(OUT, `p360-report-${String(process.pid)}.json`);
    writeFileSync(reportPath, `${J(report, null, 1)}\n`);
    if (KEEP) say(`kept the run folder ${RUN} (the wrapper logs, the far log, each launch's profile with its app.log and manifest)`);
    else rmSync(RUN, { recursive: true, force: true });
    say(`report: ${reportPath}`);
    say(`${failures === 0 && unreadable === 0 ? 'PASS' : failures > 0 ? 'FAIL' : 'UNREADABLE'}: ${String(report.arms.filter((a) => a.ok === true).length)} passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
    process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
  }
}
