#!/usr/bin/env node
/**
 * probe:p359 — THE PHASE 359 APP RUN (build/p359/SPEC.md §8): a second session
 * core boots while Tortie quits, measured door by door at the parent
 * (`7bd05d4e`, Phase 357.1, 362, 353 and 361.1 as landed) and at HEAD.
 *
 * At the parent `getGmuxCore()` refuses only while its own shutdown runs, so a
 * caller that asks after the slot emptied BOOTS A SECOND CORE inside the
 * quitting process: it passes its manifest gate, opens the session list,
 * starts a control client, rewrites the sessions table, takes a `launch` backup
 * generation, and on a damaged list quarantines the file and puts a backup back
 * where nobody is told (SPEC §0.1, §2.1). At HEAD nothing boots a core once the
 * quit has begun, a core already in the slot is still handed back, and a
 * harness that boots, shuts down and boots again in one process still does.
 *
 * ONE ELECTRON AT A TIME, THE PARENT FIRST IN EVERY PAIR, each through
 * build/electron-run.mjs's `withElectron` inside build/harness-socket.mjs
 * (`gmux-p359…`), each arm on its own scratch profile, HOME and ZDOTDIR with
 * HISTFILE=/dev/null and SHELL=/bin/sh. The parent is `P359_PARENT_CHECKOUT` (a
 * BUILT `7bd05d4e`); without it `--preflight` refuses and the run exits 2. An
 * arm whose first launch is read again by a relaunch (D2, D2n, NR) passes
 * `tmuxSocket: null` to it, so its scratch server outlives the quit, and the
 * relaunch names the socket, so its teardown ends that server and
 * build/electron-run.mjs's census reads around it; every arm's own `finally`
 * ends the server too. It never calls app.relaunch(), never holds main's
 * inspector across a quit, and never presses anything through macOS: a quit is
 * the bridge's (`window.gmux.quit()`), the native menu's own Quit row
 * (item.click() in MAIN), app.quit() from a whenReady callback, or the
 * harness's own app.exit; a door is the app's own event, emitted in MAIN
 * (`app.emit('browser-window-blur', …)`, `powerMonitor.emit(…)`), because a
 * harness app is never active and focusing a window would take his focus.
 *
 * THE WITNESS, A SCRATCH PRELOAD THIS FILE WRITES (never a file under src/),
 * loaded by NODE_OPTIONS into MAIN of every launch. It appends one JSON line per
 * event with appendFileSync (on disk before any SIGKILL): every before-quit
 * pass, will-quit, quit and the process's exit, every window's creation, close
 * and hide, the core's dispose (the hook server's closeIdleConnections), every
 * login-session line WITH ITS SYNCHRONOUS STACK (`fs.writeFileSync` wrapped:
 * the line is written inside GmuxCore.boot()'s synchronous prefix,
 * src/main/tmux/supervisor.ts, so the stack names the caller of getGmuxCore),
 * every better-sqlite3 open of the profile's manifest (`Module._load` wrapped
 * AT ONCE, before the bundle binds it) and every tmux spawn (`child_process
 * .spawn` wrapped at once). A `--require` preload cannot require('electron') on
 * its first turn, so the app hooks and the writeFileSync witness go in from
 * setImmediate. ONE door per launch (P359_MODE):
 *   blur-at-close   the app's browser-window-blur at the main window's close (B1, D2)
 *   live-top        Live Diagnostics' streaming top answered by `/bin/sleep 90`,
 *                   a sample that never comes, so a tick's finish is in flight
 *                   when the disposer stops the sampling (L1)
 *   power-at-close  powerMonitor's suspend at the window's close, resume 40 ms later (P1)
 *   quit-at-ready   app.quit() from a whenReady callback registered after the
 *                   app's own, before startup asks for the core (S1)
 *   late-drain      four FIFOs nobody writes opened on the uv pool's four
 *                   threads at the core's dispose, so the watcher unsubscribes
 *                   queue behind them (Phase 36's backed-up pool); the blur at
 *                   the late drain's first hide(), the FIFOs written 3 s later
 *                   (and at 12 s regardless) (H1)
 * The `/bin/sleep 90` stand-ins and the FIFOs are this run's to end and remove,
 * by pid after each command line is read again, in the arm's `finally`.
 *
 * THE ARMS (parent first in each pair; build/p359/SPEC.md §8's table):
 *   C0   control: three shells, the bridge quit
 *   B1   C0 plus the blur at the main window's close
 *   L1   Live Diagnostics on, its top answered late, 5.5 s, then the quit
 *   P1   a suspend at the window's close and a resume 40 ms later
 *   S1   a quit pressed before startup asks for the core
 *   H1   the late drain held by a backed-up pool, the blur at its hide
 *   D2   357's §2.2 run 2: the one sessions leaf damaged, the list read, B1's
 *        quit; a relaunch of the profile reads the DOM's toasts after 4 s
 *   D2n  D2 with no door (the control)
 *   HC   GMUX_SMOKE=shutdown-refusal: a harness launch still boots its REAL
 *        second core in one process
 *   NR   his recorded shape (build/p3167/seed-sessions.mts --shape his, counts
 *        only) plus 16 live shells of 4,000 coloured lines each, the first-quit
 *        flag written beforehand (his everyday quit), the native Quit row
 *        clicked in main, a relaunch that must keep every row, id and shell
 *   RUN  the preflights, the hidden agents, the census, every pid ended (the
 *        stand-in tops, the app's tree), every FIFO removed, the scratch server
 *        gone, his history unmoved, no macOS report since the run began
 *
 * NO AGENT RUNS, not even for a version: every launch hides every probed
 * registry row (`writeHiddenAgents(profile, 'p359', hiddenAgentsBesides([]))`)
 * and every launch with a window reads `agents:list` back
 * (`standInsOnlyVerdict(list, { standIns: [] })`); every arm runs shells. S1
 * and HC have no window to ask; HC is a harness launch, which version-probes no
 * agent (Phase 335). The Tailscale and DNS stand-ins are probe:p362's.
 *
 * THREE VERDICTS, AND A MISSING READING IS NEVER A PASS. Each grader names the
 * fields it reads (`reads`), the preconditions without which nothing it says
 * can be trusted (`needs`) and its `clauses`. An absent field or an unmet need
 * is UNREADABLE (exit 2); only a clause is FAIL. A door's NEED at HEAD is that
 * the same drive at the parent started a boot during the quit whose caller
 * names that door, so HEAD's zero is never read off a drive that did nothing.
 * Every reading taken from raw text (the witness's lines, app.log, the backup
 * index, the gmux folder's names, the DOM's toasts, the shim's output) comes
 * out of ONE pure function, `derive`, and `--grader-self-test` drives it over
 * recorded raw fixtures (build/p359/fixtures/raw/, seeded from the spec step's
 * parent and prototype runs) as well as grading recorded readings, every
 * clause shown red alone and every need shown unreadable alone.
 *
 * THE PROBE REVIEW (2026-11-09, docs/method/HOW-WE-BUILT-THIS.md rule 9), by
 * someone who did not write it. NR-head gained BOOTED_NEED: without it a
 * witness and an app.log that saw no boot at all read "no core during the
 * quit" as a pass. The self-test gained `applyRawOps`, so a broken run is a
 * recorded folder with the lines that break it planted beside it, and its
 * `REVIEW:` fixtures hold two recorded parent runs the builder did not commit
 * (B1 at batch b3, C0 at b4) and, per grader, a second boot in the quitting
 * process, a quarantine in it, a relaunch that said nothing of its own
 * quarantine and a harness cycle with no second boot.
 *
 * A BOOT START is a witness `ensure-server` line whose stack holds a
 * getGmuxCore frame; it is LATE when it came at or after before-quit's first
 * pass, and its CALLER is the frames after getGmuxCore. A boot logs a second
 * login-session line from its control client's precheck, and a reconnect one
 * more, so app.log is read by TIME, never by a count of lines: a late boot is
 * cross-read as a login-session line of the quitting pid at or after the
 * quit's start.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && P359_PARENT_CHECKOUT=<a BUILT 7bd05d4e> npm run -s probe:p359
 *   P359_ARMS=C0,B1,…    the arms (default C0,B1,L1,P1,S1,H1,D2,D2n,HC,NR; RUN is always read)
 *   P359_KEEP=1          keep every run folder, each arm's raw.json among them, for the re-derivation
 *   P359_OUT_DIR=<dir>   where the report goes (default out/p359)
 *   node build/p359/probe-p359.mjs --grader-self-test   every reader and grader on build/p359/fixtures/; starts nothing
 *   node build/p359/probe-p359.mjs --preflight          the parent, out/ and the helpers; starts nothing
 *   node build/p359/probe-p359.mjs --list-graders       every grader's reads, needs and clauses by name; starts nothing
 *   node build/p359/probe-p359.mjs --derive <dir|raw.json>   the one reader over a fixture folder or a kept raw.json; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, closeSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadavg, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The build helpers this run USES, imported statically so gate:electron counts
// this probe among build/electron-run.mjs's users (obligation 1). Each only
// DEFINES functions when imported, so --grader-self-test, --preflight,
// --list-graders and --derive below still start nothing.
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin } from '../p332/dns-standin.mjs';
import { tsxCli } from '../ts-runner.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// What this run holds the app against, by value
// ---------------------------------------------------------------------------

/** The parent this phase measures against: 7bd05d4e (357.1, 362, 353 and 361.1 landed). */
export const PARENT_SNAPSHOT = '7bd05d4e';
/** Every shell an arm creates is named with this, and its tmux session carries the same name. */
export const SHELL_PREFIX = 'p359-';
/** HEAD's startup line when the quit refused the boot (build/p359/SPEC.md D4, §9.2), word for word. */
export const STARTUP_REFUSAL_LINE = 'the session core was not started, because Tortie is quitting';
/** Startup's own error line for every other failure (src/main/index.ts). */
export const CORE_BOOT_FAILED = /^core boot failed/;
/** The supervisor's line at every ensureServer() (src/main/tmux/supervisor.ts), both spellings. */
export const LOGIN_SESSION_LINE = /^(?:macOS login session |no macOS login session number)/;
/** The will-quit handler's storage line (Phase 357.1), and the snapshot pass's line. */
export const STORAGE_LINE = /^the remembered settings (?:were on disk|could not be read on disk) after (\d+) ms; ending the quit/;
export const PASS_LINE = /^scrollback pass \(app-quit\) over (\d+) sessions: (\d+) written,/;
/** Phase 36's wedged-watcher escape, whose own SIGKILL is not the will-quit handler's. */
export const WEDGED_QUIT_LINE = /still pending after 15 s more; ending the process hard because environment teardown would abort/;
/** The Electron shim's line when the app it started ended by a signal. */
export const SHIM_SIGNAL_LINE = /exited with signal (SIG[A-Z0-9]+)/;
/** build/electron-run.mjs's census sentence, by its own words. */
export const CENSUS_WORDS = "is the private server the operator's live";
/** The quarantine notice's toast (src/renderer/state/subscriptions.ts) and its one action. */
export const REBUILT_TOAST = 'Session list damaged. It was rebuilt.';
export const DAMAGED_WORDS = 'Session list damaged.';
export const SHOW_FILE = 'Show the file';
/** The quarantined file's name beside the manifest (src/main/manifest/boot.ts). */
export const DAMAGED_NAME = /^manifest\.db\.damaged-\d{8}T\d{6}Z$/;
/** GMUX_SMOKE=shutdown-refusal's own lines (src/main/harness/shutdown-refusal.ts). */
export const HC_REBOOT_LINE = /\[gmux-smoke\] 7\/8 clean re-boot/;
export const HC_PASS_LINE = /\[gmux-smoke\] 8\/8 PASS \(shutdown-refusal\)/;
export const HC_FAIL_LINE = /\[gmux-smoke\] FAIL/;
/** The first-quit toast's one-time flag (src/renderer/app/one-time-tip.ts), '1' once shown. */
export const TIP_KEY = 'gmux.tipShown.quit-hold';
/** NR: his everyday quit's live shells, the coloured lines each prints, the scrollback each must hold. */
export const NR_SHELLS = 16;
export const NR_FILL = 4_000;
export const NR_HISTORY_FLOOR = 3_500;
/** NR at HEAD: the window closed no later than max(150 ms, 10 % of the parent's) after the parent's. */
export const CLOSE_FLOOR_MS = 150;
export const CLOSE_SHARE = 0.1;
/** C0 at HEAD (SPEC §10.4 R2): the storage line's wait no more than 100 ms longer than the parent's. */
export const STORAGE_SLACK_MS = 100;
/** L1: Live Diagnostics left on this long before the press. */
export const LIVE_WAIT_MS = 5_500;
/** H1: the pool released this long after the late drain's first hide, and at this ceiling regardless. */
export const POOL_RELEASE_MS = 3_000;
export const POOL_RELEASE_CEILING_MS = 12_000;
/** P1: the resume this long after the suspend. */
export const POWER_RESUME_MS = 40;
/** D2, D2n: the relaunch's toasts are read this long after its window is up. */
export const TOAST_WAIT_MS = 4_000;
/** L1's stand-in top's command line, which is read again before its signal. */
export const STANDIN_TOP_COMMAND = /^(?:\/bin\/)?sleep 90$/;
/** The statuses a listed session has once it is no longer live. */
const NOT_LIVE = new Set(['exited', 'restorable', 'discarded']);

/**
 * The doors, by the frames that name them in a boot start's stack (after
 * getGmuxCore), and the startup's ask, which is an UNNAMED frame of the main
 * bundle: the async arrow inside `app.whenReady().then(…)`
 * (src/main/index.ts), the bundle's `out/main/index.js:<line>:<col>`.
 */
export const DOOR_FRAMES = Object.freeze({
  cadence: Object.freeze(['syncPollCadence']),
  live: Object.freeze(['readSessionFacts', 'finishCapture', 'runTick']),
  power: Object.freeze(['captureAll', 'suspendWork', 'onSuspend', 'onResume'])
});
export const MAIN_BUNDLE_FRAME = /(?:^|\/)out\/main\/index\.js:\d+:\d+$/;
export const DOOR_WORDS = Object.freeze({
  cadence: 'names syncPollCadence (the focus and blur handler)',
  live: 'names readSessionFacts (Live Diagnostics’ tick)',
  power: 'names captureAll or suspendWork (the sleep handler)',
  startup: 'is startup’s own ask (an unnamed frame of the main bundle)'
});

/** Every arm's world. `door` is the door its drive opens, null for a control. */
export const ARM_SPECS = Object.freeze({
  C0: { mode: 'none', door: null, shells: 3 },
  B1: { mode: 'blur-at-close', door: 'cadence', shells: 3 },
  L1: { mode: 'live-top', door: 'live', shells: 3, live: true },
  P1: { mode: 'power-at-close', door: 'power', shells: 3 },
  S1: { mode: 'quit-at-ready', door: 'startup', windowless: true },
  H1: { mode: 'late-drain', door: 'cadence', shells: 3, pool: true },
  D2: { mode: 'blur-at-close', door: 'cadence', shells: 3, damage: true, relaunch: true },
  D2n: { mode: 'none', door: null, shells: 3, damage: true, relaunch: true },
  HC: { mode: 'none', door: null, harness: true },
  NR: { mode: 'none', door: null, shells: NR_SHELLS, seed: true, fill: true, menu: true, relaunch: true }
});
export const DEFAULT_ARMS = Object.freeze(['C0', 'B1', 'L1', 'P1', 'S1', 'H1', 'D2', 'D2n', 'HC', 'NR']);

// ---------------------------------------------------------------------------
// THE ONE READER. Every reading this run takes from raw text comes out of
// `derive` and the small pure helpers it calls, and nothing else. The live arms
// hand it what they read off disk, the DOM and the pipe; --grader-self-test
// hands it the recorded raw fixtures, so a reader that miscounts is shown to.
// ---------------------------------------------------------------------------

const num = (x) => typeof x === 'number' && Number.isFinite(x);

/** One JSON object per line; a line that does not parse is kept as `{ unparsed: true }`, so it cannot pass as nothing. */
export function jsonLines(lines) {
  return (Array.isArray(lines) ? lines : [])
    .filter((l) => typeof l === 'string' && l.trim() !== '')
    .map((l) => {
      try {
        const o = JSON.parse(l);
        return o !== null && typeof o === 'object' ? o : { unparsed: true };
      } catch {
        return { unparsed: true };
      }
    });
}

/** The witness's events, in the order written, each with a numeric `t` and a string `ev`. */
export function eventsOf(lines) {
  return jsonLines(lines).filter((o) => num(o.t) && typeof o.ev === 'string');
}

/** A record's time on main's clock, from its ISO `ts`. */
export const tsOf = (o) => {
  const n = Date.parse(String(o?.ts ?? ''));
  return Number.isFinite(n) ? n : null;
};

/**
 * A stack frame's function name, or null for an unnamed frame (a bare
 * location). `async `, `new ` and a trailing `[as …]` are not part of the name.
 */
export function frameName(frame) {
  const s = String(frame ?? '').trim().replace(/^at\s+/, '');
  const m = s.match(/^(.*?)\s+\((.+)\)$/);
  if (m === null) return null;
  return m[1].replace(/^(?:async|new)\s+/, '').replace(/\s+\[as [^\]]+\]$/, '').trim() || null;
}
const nameIs = (name, wanted) => name !== null && (name === wanted || name.endsWith(`.${wanted}`));

/** Where getGmuxCore's frame is in a stack, or -1. */
export function getGmuxCoreAt(stack) {
  return (Array.isArray(stack) ? stack : []).findIndex((f) => nameIs(frameName(f), 'getGmuxCore'));
}

/** The frames after getGmuxCore: who asked for the core. */
export function callerOf(stack) {
  const i = getGmuxCoreAt(stack);
  return i === -1 ? null : stack.slice(i + 1);
}

/** Which door a boot start's caller is: cadence, live, power, startup, other, or unknown when nothing follows getGmuxCore. */
export function doorOf(caller) {
  if (!Array.isArray(caller) || caller.length === 0) return 'unknown';
  const names = caller.map(frameName);
  const has = (list) => names.some((n) => list.some((w) => nameIs(n, w)));
  if (has(DOOR_FRAMES.cadence)) return 'cadence';
  if (has(DOOR_FRAMES.live)) return 'live';
  if (has(DOOR_FRAMES.power)) return 'power';
  if (names[0] === null && MAIN_BUNDLE_FRAME.test(String(caller[0]).trim())) return 'startup';
  return 'other';
}

/** Every boot start the witness saw: an ensure-server line whose stack holds getGmuxCore. */
export function bootStartsOf(events, began) {
  return (Array.isArray(events) ? events : [])
    .filter((e) => e.ev === 'ensure-server' && getGmuxCoreAt(e.stack) !== -1)
    .map((e) => {
      const caller = callerOf(e.stack);
      return { t: e.t, pid: Number.isInteger(e.pid) ? e.pid : null, caller, door: doorOf(caller), late: num(began) && e.t >= began };
    });
}

/**
 * The backup index after the quit, before any relaunch: the generations oldest
 * first, whether a `quit` generation was captured at or after the quit's
 * start, how many generations of another reason were captured at or after it
 * (`spent`: what a second core takes), how many came after the quit
 * generation, and the first `launch` after the quit generation with whether
 * its `sessions` digest is the quit generation's.
 */
export function ringOf(text, began) {
  const none = { read: false, reasons: null, quitGen: null, spent: null, afterQuitGen: null, launchAfterQuitMs: null, launchAfterSameSessions: null };
  if (typeof text !== 'string') return none;
  let caps;
  try {
    caps = JSON.parse(text)?.capsules;
  } catch {
    return none;
  }
  if (!Array.isArray(caps)) return none;
  const list = caps
    .filter((c) => c !== null && typeof c === 'object' && typeof c.reason === 'string' && num(Number(c.capturedAt)))
    .map((c) => ({ reason: c.reason, at: Number(c.capturedAt), sessions: typeof c.digests?.sessions === 'string' ? c.digests.sessions : null }))
    .sort((a, b) => a.at - b.at);
  const quitGen = num(began) ? (list.find((c) => c.reason === 'quit' && c.at >= began) ?? null) : null;
  const after = quitGen === null ? [] : list.filter((c) => c.at > quitGen.at);
  const launchAfter = after.find((c) => c.reason === 'launch');
  return {
    read: true,
    reasons: list.map((c) => c.reason),
    quitGen: quitGen !== null,
    spent: num(began) ? list.filter((c) => c.at >= began && c.reason !== 'quit').length : null,
    afterQuitGen: quitGen === null ? null : after.length,
    launchAfterQuitMs: launchAfter === undefined || quitGen === null ? null : launchAfter.at - quitGen.at,
    launchAfterSameSessions: launchAfter === undefined || quitGen === null || quitGen.sessions === null ? null : launchAfter.sessions === quitGen.sessions
  };
}

/** The gmux folder's names: how many are a quarantined manifest (its own name, never its -wal or -shm). Null when unread. */
export function damagedCount(names) {
  return Array.isArray(names) ? names.filter((n) => DAMAGED_NAME.test(String(n))).length : null;
}

/** The DOM's toasts, as read: whether the rebuilt toast with its action is there, and how many say the list was damaged. */
export function toastsOf(list) {
  if (!Array.isArray(list)) return { read: false, count: null, rebuilt: null, damaged: null };
  const toasts = list.map((t) => ({ text: String(t?.text ?? '').trim(), buttons: Array.isArray(t?.buttons) ? t.buttons.map((b) => String(b ?? '').trim()) : [] }));
  return {
    read: true,
    count: toasts.length,
    rebuilt: toasts.some((t) => t.text === REBUILT_TOAST && t.buttons.includes(SHOW_FILE)),
    damaged: toasts.filter((t) => t.text.startsWith(DAMAGED_WORDS)).length
  };
}

/** What the shim's output and the exit code say about how the process ended. */
export function exitOf(text, code) {
  const t = typeof text === 'string' ? text : '';
  const sig = t.match(SHIM_SIGNAL_LINE);
  return { ended: Number.isInteger(code), code: Number.isInteger(code) ? code : null, signal: sig === null ? null : sig[1], wedged: WEDGED_QUIT_LINE.test(t) };
}

/** GMUX_SMOKE=shutdown-refusal's verdict from its own output. */
export function harnessOf(text, code) {
  const t = typeof text === 'string' ? text : '';
  return { code: Number.isInteger(code) ? code : null, reboot: HC_REBOOT_LINE.test(t), pass: HC_PASS_LINE.test(t), failLine: HC_FAIL_LINE.test(t) };
}

/** Two id lists as sets: every id of one is in the other, and neither is empty. */
export function sameIdSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0) return false;
  const A = new Set(a);
  const B = new Set(b);
  return A.size === B.size && [...A].every((x) => B.has(x));
}

/**
 * THE ONE READER (SPEC §8). `raw` holds whatever the arm read; each part of
 * the reading is derived only when its raw input is present, so a recorded raw
 * fixture can drive one part of it alone:
 *   events, relaunchEvents: the witness's lines (the arm's launch, its relaunch)
 *   appLog: app.log.1 then app.log, every launch of the profile
 *   backups: the backup index's text, read after the quit and before any relaunch
 *   gmuxAfterQuit, gmuxAfterRelaunch: the gmux folder's names
 *   toasts: the relaunch's DOM toasts; shim: { text, code }; press: the bridge's press
 *   world: the live answers before the press; relaunch: the relaunch's answers
 * Times are milliseconds after before-quit's first pass on main's clock.
 */
export function derive(raw) {
  const r = {};
  const events = raw.events === undefined ? null : eventsOf(raw.events);
  const loaded = events === null ? undefined : events.find((e) => e.ev === 'loaded');
  const pid = loaded !== undefined && Number.isInteger(loaded.pid) ? loaded.pid : null;
  const pass1 = events === null ? undefined : events.find((e) => e.ev === 'before-quit' && e.pass === 1);
  const began = pass1 !== undefined && num(pass1.t) ? pass1.t : null;
  const rel = (t) => (num(t) && began !== null ? t - began : null);
  const during = (e) => began !== null && num(e.t) && e.t >= began;
  if (events !== null) {
    r.witness = {
      loaded: loaded !== undefined,
      hooked: events.some((e) => e.ev === 'hooked') && !events.some((e) => e.ev === 'hook-failed'),
      pid,
      began,
      passes: events.filter((e) => e.ev === 'before-quit').length,
      mode: typeof loaded?.mode === 'string' ? loaded.mode : null
    };
    const starts = bootStartsOf(events, began);
    const late = starts.filter((s) => s.late);
    const hides = events.filter((e) => e.ev === 'window-hidden' && during(e));
    const firstHide = hides.length === 0 ? null : hides[0].t;
    r.boots = {
      starts: starts.length,
      pids: new Set(starts.map((s) => s.pid)).size,
      early: starts.length - late.length,
      late: late.length,
      lateDoors: late.map((s) => s.door),
      lateAt: late.map((s) => rel(s.t)),
      // H1: the boots that came at or after the late drain's first hide.
      lateDoorsAfterHide: firstHide === null ? [] : late.filter((s) => s.t >= firstHide).map((s) => s.door),
      // PRINTED: the first four frames of each late caller, for the report.
      lateCallers: late.map((s) => (s.caller ?? []).slice(0, 4).map((f) => frameName(f) ?? String(f).trim().split('/').pop()))
    };
    const quitOpens = events.filter((e) => e.ev === 'db-open' && during(e));
    // The quit generation's own read opens the list read only through the backup's capture.
    const genRead = quitOpens.find((e) => (Array.isArray(e.stack) ? e.stack : []).some((f) => ['snapshotDatabase', 'captureLocked'].some((w) => nameIs(frameName(f), w))));
    const closed = events.find((e) => e.ev === 'window-closed' && during(e));
    const exitEv = events.find((e) => e.ev === 'process-exit');
    r.quit = {
      dispose: rel(events.find((e) => e.ev === 'dispose' && during(e))?.t),
      willQuit: rel(events.find((e) => e.ev === 'will-quit')?.t),
      closed: rel(closed?.t),
      opens: quitOpens.length,
      opensBeyondGeneration: quitOpens.filter((e) => e !== genRead).length,
      storeOpens: quitOpens.filter((e) => e.readonly === false).length,
      tmuxSpawns: events.filter((e) => e.ev === 'tmux-spawn' && during(e)).length,
      windowsCreated: events.filter((e) => e.ev === 'window-created' && during(e)).length,
      processExit: exitEv === undefined ? null : Number.isInteger(exitEv.code) ? exitEv.code : null
    };
    r.doors = {
      blur: events.filter((e) => e.ev === 'blur-emitted' && during(e)).length,
      blurAtHide: events.filter((e) => e.ev === 'blur-emitted' && e.at === 'hide' && during(e)).length,
      firstHide: rel(firstHide),
      suspend: events.filter((e) => e.ev === 'suspend-emitted' && during(e)).length,
      resume: events.filter((e) => e.ev === 'resume-emitted' && during(e)).length,
      quitAtReady: events.some((e) => e.ev === 'quit-at-ready'),
      topHeld: events.filter((e) => e.ev === 'top-spawn' && e.held === true && Number.isInteger(e.child)).length,
      poolHeld: events.some((e) => e.ev === 'pool-held' && num(e.n) && e.n > 0),
      poolReleased: events.some((e) => e.ev === 'pool-released' && num(e.n) && e.n > 0)
    };
    // The press: the native Quit row clicked in main (NR), or the probe's own (the bridge).
    const menu = events.find((e) => e.ev === 'menu-quit');
    const pressAt = menu !== undefined ? menu.t : num(raw.press?.at) ? raw.press.at : null;
    const mainClosed = pressAt === null ? undefined : events.find((e) => e.ev === 'window-closed' && e.t >= pressAt && (e.kind === undefined || e.kind === 'main' || e.kind === 'unknown'));
    r.press = {
      how: menu !== undefined ? 'menu' : typeof raw.press?.how === 'string' ? raw.press.how : null,
      ok: menu !== undefined ? menu.ok === true : raw.press?.ok === true,
      closedAfter: mainClosed === undefined || pressAt === null ? null : mainClosed.t - pressAt
    };
  }
  if (raw.shim !== undefined) {
    r.exit = exitOf(raw.shim?.text, raw.shim?.code);
    r.hc = harnessOf(raw.shim?.text, raw.shim?.code);
  }
  if (raw.appLog !== undefined) {
    const al = jsonLines(raw.appLog).filter((o) => o.unparsed !== true);
    const mine = pid === null ? [] : al.filter((o) => o.proctype === 'main' && o.pid === pid);
    const at = (o) => tsOf(o);
    const inQuit = (o) => began !== null && at(o) !== null && at(o) >= began;
    const beforeQuit = (o) => began === null || (at(o) !== null && at(o) < began);
    const login = mine.filter((o) => o.scope === 'tmux' && typeof o.msg === 'string' && LOGIN_SESSION_LINE.test(o.msg));
    const storage = mine.find((o) => inQuit(o) && o.scope === 'quit' && typeof o.msg === 'string' && STORAGE_LINE.test(o.msg));
    const pass = mine.find((o) => inQuit(o) && typeof o.msg === 'string' && PASS_LINE.test(o.msg));
    const passParts = pass === undefined ? null : pass.msg.match(PASS_LINE);
    const suspendWarns = mine.filter((o) => inQuit(o) && o.scope === 'power' && o.level === 'warn' && typeof o.msg === 'string' && o.msg.startsWith('suspend'));
    r.log = {
      records: mine.length,
      loginBefore: login.filter(beforeQuit).length,
      loginAfter: login.filter(inQuit).length,
      startupRefused: mine.filter((o) => o.msg === STARTUP_REFUSAL_LINE).length,
      coreBootFailed: mine.filter((o) => typeof o.msg === 'string' && CORE_BOOT_FAILED.test(o.msg)).length,
      suspendWarns: suspendWarns.length,
      suspendWarnsRefused: suspendWarns.filter((o) => o.msg.includes('SHUTTING_DOWN')).length,
      lateDrain: mine.some((o) => o.event === 'quit.late_drain'),
      lateSettled: mine.some((o) => o.event === 'quit.late_settled'),
      storageLine: storage !== undefined,
      storageWaitedMs: storage === undefined ? null : Number(storage.msg.match(STORAGE_LINE)[1]),
      passLine: passParts === null ? null : { over: Number(passParts[1]), written: Number(passParts[2]) },
      stoppedBeforeQuit: mine.filter((o) => o.event === 'manifest.stopped' && began !== null && beforeQuit(o)).length,
      quarantinedByQuitter: mine.filter((o) => o.event === 'notice.shown' && o.notice === 'manifest-quarantined').length
    };
    if (raw.relaunchEvents !== undefined) {
      const rl = eventsOf(raw.relaunchEvents).find((e) => e.ev === 'loaded');
      const rpid = rl !== undefined && Number.isInteger(rl.pid) ? rl.pid : null;
      const theirs = rpid === null ? [] : al.filter((o) => o.proctype === 'main' && o.pid === rpid);
      r.relaunchLog = { pid: rpid, records: theirs.length, quarantined: theirs.filter((o) => o.event === 'notice.shown' && o.notice === 'manifest-quarantined').length };
    }
  }
  if (raw.backups !== undefined) r.ring = ringOf(raw.backups, began);
  if (raw.gmuxAfterQuit !== undefined || raw.gmuxAfterRelaunch !== undefined) {
    r.gmux = {
      afterQuitRead: Array.isArray(raw.gmuxAfterQuit),
      damagedAfterQuit: damagedCount(raw.gmuxAfterQuit),
      afterRelaunchRead: Array.isArray(raw.gmuxAfterRelaunch),
      damagedAfterRelaunch: damagedCount(raw.gmuxAfterRelaunch)
    };
  }
  if (raw.toasts !== undefined) r.toasts = toastsOf(raw.toasts);
  if (raw.world !== undefined) {
    const w = raw.world ?? {};
    const sizes = (Array.isArray(w.historySizes) ? w.historySizes : []).filter(num);
    r.agents = w.agents ?? { ok: false, said: 'not read' };
    r.loadAtPress = Array.isArray(w.loadAtPress) ? w.loadAtPress : null;
    r.world = {
      created: num(w.created) ? w.created : 0,
      seeded: w.seeded === true,
      liveShells: (Array.isArray(w.serverNames) ? w.serverNames : []).filter((x) => String(x).startsWith(SHELL_PREFIX)).length,
      historyMin: sizes.length === 0 ? 0 : Math.min(...sizes),
      flagBefore: typeof w.flagBefore === 'string' ? w.flagBefore : null,
      damageChanged: w.damage !== null && typeof w.damage === 'object' && w.damage.ok === true && w.damage.before !== w.damage.after,
      liveStarted: w.liveStart !== null && typeof w.liveStart === 'object' && w.liveStart.started === true,
      listedBefore: w.listBefore?.ok === true && Array.isArray(w.listBefore.ids) ? w.listBefore.ids.length : null
    };
  }
  if (raw.relaunch !== undefined) {
    const rl = raw.relaunch ?? {};
    const list = rl.list ?? {};
    const names = Array.isArray(list.names) ? list.names : [];
    const statuses = Array.isArray(list.statuses) ? list.statuses : [];
    const onServer = new Set(Array.isArray(rl.serverNames) ? rl.serverNames : []);
    const before = raw.world?.listBefore?.ok === true && Array.isArray(raw.world.listBefore.ids) ? raw.world.listBefore.ids : null;
    // A list or a server listing that did not answer is left UNREAD (undefined),
    // never read as a lost row or no shell live (probe:p362's review).
    r.relaunch = {
      ran: rl.ran === true,
      listed: list.ok === true,
      sameIds: list.ok === true && Array.isArray(list.ids) && before !== null && before.length > 0 ? sameIdSet(before, list.ids) : undefined,
      shellsLive: list.ok === true && Array.isArray(rl.serverNames) ? names.filter((n, i) => String(n).startsWith(SHELL_PREFIX) && !NOT_LIVE.has(String(statuses[i])) && onServer.has(n)).length : undefined
    };
  }
  return r;
}

/** A derived reading laid over a recorded one, part by part: each derived part replaces the recorded part's fields it names. */
export function overlay(base, derived) {
  const out = structuredClone(base ?? {});
  for (const [k, v] of Object.entries(derived ?? {})) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && out[k] !== null && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = { ...out[k], ...v };
    else out[k] = structuredClone(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The graders (pure, over a reading): used live and in --grader-self-test
// ---------------------------------------------------------------------------

const AGENTS_NEED = ['the agents:list answer resolved nothing but the stand-ins (none)', (r) => r.agents.ok === true];
const WITNESS_NEED = ['the witness loaded in main and hooked the app, so its events and stacks can be read', (r) => r.witness.loaded === true && r.witness.hooked === true && Number.isInteger(r.witness.pid)];
const QUIT_NEED = ['the quit began: the witness saw before-quit’s first pass', (r) => num(r.witness.began)];
const SHELLS_NEED = ['the window created the arm’s three shells before the quit', (r) => r.world.created === 3];
const BOOTED_NEED = ['the first core booted before the quit, in the witness and in app.log, so the readers read this process', (r) => r.boots.early >= 1 && r.log.loginBefore >= 1];
const LOG_RECORDS_NEED = ['app.log holds records of the quitting process, so its lines can be read', (r) => r.log.records >= 1];
const RING_NEED = ['the backup index was read after the quit, before any relaunch', (r) => r.ring.read === true];
const NOT_WEDGED_NEED = ['the quit did not take Phase 36’s wedged-watcher escape, so a SIGKILL is the will-quit handler’s', (r) => r.exit.wedged === false];
const BLUR_NEED = ['the app’s own browser-window-blur was emitted at the main window’s close, during the quit', (r) => r.doors.blur >= 1];
const LIVE_NEED = ['Live Diagnostics started and its streaming top was answered by the stand-in that prints nothing', (r) => r.world.liveStarted === true && r.doors.topHeld >= 1];
const POWER_NEED = ['a suspend and a resume were emitted from powerMonitor at the window’s close, during the quit', (r) => r.doors.suspend >= 1 && r.doors.resume >= 1];
const S1_NEED = ['the quit was pressed from a whenReady callback before startup asked for the core: no core began to boot before the quit', (r) => r.doors.quitAtReady === true && r.boots.early === 0];
const POOL_NEED = [
  'the uv pool was held from the core’s dispose and released, the late drain began and settled (quit.late_drain, quit.late_settled), and the blur was emitted at its first hide',
  (r) => r.doors.poolHeld === true && r.doors.poolReleased === true && r.doors.blurAtHide >= 1 && r.log.lateDrain === true && r.log.lateSettled === true
];
const DAMAGE_NEED = ['the damage changed a byte of the scratch session list', (r) => r.world.damageChanged === true];
const STOPPED_NEED = ['the session list stopped reading before the quit (its own manifest.stopped record)', (r) => r.log.stoppedBeforeQuit >= 1];
// Not spelled GMUX_…: build/contract-inventory.mjs reads every GMUX_[A-Z0-9_]+
// token under build/ as an environment name, and this is a need, not one.
const FOLDER_READ_NEED = ['the gmux folder’s names were read after the quit, before the relaunch', (r) => r.gmux.afterQuitRead === true];
const RELAUNCH_NEED = ['the relaunch on that profile ran, its window’s toasts were read, and its own process was named', (r) => r.relaunch.ran === true && r.toasts.read === true && Number.isInteger(r.relaunchLog.pid)];
const parentDoorNeed = (door) => [`the same drive at the parent started a boot during the quit whose caller ${DOOR_WORDS[door]}`, (r) => Array.isArray(r.parent.lateDoors) && r.parent.lateDoors.includes(door)];
const PARENT_HIDE_NEED = ['the same drive at the parent started a boot at the late drain’s hide whose caller names syncPollCadence', (r) => Array.isArray(r.parent.lateDoorsAfterHide) && r.parent.lateDoorsAfterHide.includes('cadence')];
const PARENT_STORAGE_NEED = ['the parent’s C0 storage line was read, the parent having run first', (r) => num(r.parent.storageWaitedMs)];
const NR_WORLD_NEED = [
  `his recorded shape was seeded and the world held ${String(NR_SHELLS)} live shells, each with at least ${String(NR_HISTORY_FLOOR)} lines of scrollback`,
  (r) => r.world.seeded === true && r.world.liveShells >= NR_SHELLS && r.world.historyMin >= NR_HISTORY_FLOOR
];
const FLAG_NEED = ['the first-quit flag was written before the press, so the press is his everyday quit (no toast)', (r) => r.world.flagBefore === '1'];
const MENU_PRESS_NEED = ['the native menu’s Quit row was found and clicked in main', (r) => r.press.how === 'menu' && r.press.ok === true];
const NR_RELAUNCH_NEED = ['the relaunch on that profile ran and listed its sessions', (r) => r.relaunch.ran === true && r.relaunch.listed === true];
const PARENT_CLOSE_NEED = ['the parent’s press-to-close time was read, the parent having run first', (r) => num(r.parent.closedAfterPress)];

const NO_LATE_BOOT = ['no session core began to boot during the quit, read from the witness’s stacks', (r) => r.boots.late === 0];
const NO_LATE_LOGIN = ['app.log holds no login-session line of the quitting process during the quit', (r) => r.log.loginAfter === 0];
const lateBootBy = (door) => [
  `a session core began to boot during the quit, its caller ${DOOR_WORDS[door]}, and app.log holds the quitting process’s login-session line during the quit`,
  (r) => r.boots.lateDoors.includes(door) && r.log.loginAfter >= 1
];
const LATE_AT_HIDE = [
  'a session core began to boot at the late drain’s hide, its caller names syncPollCadence, and app.log holds the quitting process’s login-session line during the quit',
  (r) => r.boots.lateDoorsAfterHide.includes('cadence') && r.log.loginAfter >= 1
];
const SPENT_PARENT = ['a launch generation was taken after the quit’s, its session rows unlike the quit’s', (r) => num(r.ring.launchAfterQuitMs) && r.ring.launchAfterSameSessions === false];
const RING_CLEAN = [
  'the backups hold the launch generation and the quit’s, the quit’s newest: none spent during or after the quit',
  (r) => J(r.ring.reasons) === J(['launch', 'quit']) && r.ring.quitGen === true && r.ring.spent === 0 && r.ring.afterQuitGen === 0
];
const SIGKILL_END = ['the quit ended by the will-quit SIGKILL with its storage line', (r) => r.exit.signal === 'SIGKILL' && r.log.storageLine === true];
const STORAGE_NEAR = [`the storage line’s wait no more than ${String(STORAGE_SLACK_MS)} ms longer than the parent’s (SPEC §10.4 R2)`, (r) => num(r.log.storageWaitedMs) && r.log.storageWaitedMs <= r.parent.storageWaitedMs + STORAGE_SLACK_MS];
const NO_OPENS = ['no session list was opened during the quit but by the quit generation’s own read', (r) => r.quit.opensBeyondGeneration === 0];
const NO_TMUX = ['no tmux was started during the quit (no control client)', (r) => r.quit.tmuxSpawns === 0];
const SUSPEND_REFUSED = ['app.log’s suspend warnings during the quit each carry the SHUTTING_DOWN refusal', (r) => r.log.suspendWarns >= 1 && r.log.suspendWarnsRefused === r.log.suspendWarns];
const NO_BOOT_AT_ALL = ['no session core began to boot at all: no boot start in the witness', (r) => r.boots.starts === 0];
const STARTUP_LINE_ONCE = [`app.log says once “${STARTUP_REFUSAL_LINE}”`, (r) => r.log.startupRefused === 1];
const NO_BOOT_FAILED = ['app.log holds no “core boot failed” line', (r) => r.log.coreBootFailed === 0];
const QUARANTINED_BY_QUITTER = ['the quitting process quarantined the file: its own manifest-quarantined notice, and a manifest.db.damaged-* after the quit', (r) => r.log.quarantinedByQuitter >= 1 && r.gmux.damagedAfterQuit >= 1];
const NO_TOAST_AT_RELAUNCH = ['the relaunch’s window holds no “Session list damaged.” toast', (r) => r.toasts.damaged === 0];
const NOTHING_QUARANTINED_AT_QUIT = ['no manifest.db.damaged-* after the quit, and no quarantine notice from the quitting process', (r) => r.gmux.damagedAfterQuit === 0 && r.log.quarantinedByQuitter === 0];
const REBUILT_TOAST_CLAUSE = [`the relaunch’s window holds “${REBUILT_TOAST}” with “${SHOW_FILE}”`, (r) => r.toasts.rebuilt === true];
const RELAUNCH_SAID_IT = ['the relaunch’s own process logged the manifest-quarantined notice', (r) => r.relaunchLog.quarantined >= 1];
const HC_PASS_CLAUSE = ['the harness printed 7/8 clean re-boot and 8/8 PASS, no FAIL line, and exited 0', (r) => r.hc.reboot === true && r.hc.pass === true && r.hc.failLine === false && r.hc.code === 0];
const HC_SECOND_BOOT = ['the witness saw two boot starts in one process and no quit began: the harness’s second core is real', (r) => r.boots.starts === 2 && r.boots.pids === 1 && r.witness.began === null];
const PASS_WROTE = [`the quit’s scrollback pass wrote ${String(NR_SHELLS)}`, (r) => r.log.passLine !== null && r.log.passLine.written === NR_SHELLS];
const QUIT_GEN = ['a quit generation was taken after the quit began', (r) => r.ring.quitGen === true];
const KEEPS = [`the relaunch keeps every row and id, and ${String(NR_SHELLS)} shells live`, (r) => r.relaunch.sameIds === true && r.relaunch.shellsLive === NR_SHELLS];
const CLOSE_WITHIN = [
  `the window closed no later than max(${String(CLOSE_FLOOR_MS)} ms, ${String(CLOSE_SHARE * 100)} % of the parent’s) after the parent’s`,
  (r) => num(r.press.closedAfter) && r.press.closedAfter <= r.parent.closedAfterPress + Math.max(CLOSE_FLOOR_MS, CLOSE_SHARE * r.parent.closedAfterPress)
];

const WITNESS_READS = ['witness.loaded', 'witness.hooked', 'witness.pid', 'witness.began'];
const WINDOW_READS = ['agents.ok', ...WITNESS_READS];
const BOOT_READS = ['boots.early', 'boots.late', 'boots.lateDoors', 'log.loginBefore', 'log.loginAfter'];
const RING_READS = ['ring.read', 'ring.reasons', 'ring.quitGen', 'ring.spent', 'ring.afterQuitGen'];
const END_READS = ['exit.signal', 'exit.wedged', 'log.storageLine'];
/** The needs every three-shell quit arm shares, in the order they are asked. */
const shellNeeds = () => [AGENTS_NEED, WITNESS_NEED, QUIT_NEED, SHELLS_NEED, BOOTED_NEED];
const shellReads = () => [...WINDOW_READS, 'world.created', ...BOOT_READS];

/** A door arm (B1, L1, P1): the parent boots during the quit; HEAD boots nothing, spends no backup and ends as it did. */
function doorArm(door, doorNeed, doorReads, { head, parentClauses = [], headClauses = [], headReads = [] }) {
  if (!head) {
    return { reads: [...shellReads(), ...doorReads, ...(parentClauses.includes(SPENT_PARENT) ? [...RING_READS, 'ring.launchAfterQuitMs', 'ring.launchAfterSameSessions'] : [])], needs: [...shellNeeds(), doorNeed, ...(parentClauses.includes(SPENT_PARENT) ? [RING_NEED] : [])], clauses: [lateBootBy(door), ...parentClauses] };
  }
  return {
    reads: [...shellReads(), ...doorReads, 'parent.lateDoors', ...RING_READS, ...END_READS, ...headReads],
    needs: [...shellNeeds(), doorNeed, parentDoorNeed(door), RING_NEED, NOT_WEDGED_NEED],
    clauses: [NO_LATE_BOOT, NO_LATE_LOGIN, ...headClauses, RING_CLEAN, SIGKILL_END]
  };
}

/** D2 and D2n: the damaged list at the quit, then the relaunch's toasts. */
function damageArm({ head, door }) {
  const reads = [...shellReads(), 'world.damageChanged', 'log.stoppedBeforeQuit', 'log.quarantinedByQuitter', 'gmux.afterQuitRead', 'gmux.damagedAfterQuit', 'relaunch.ran', 'toasts.read', 'toasts.rebuilt', 'toasts.damaged', 'relaunchLog.pid', 'relaunchLog.quarantined'];
  const needs = [...shellNeeds(), DAMAGE_NEED, STOPPED_NEED];
  if (door) {
    reads.push('doors.blur');
    needs.push(BLUR_NEED);
    if (head) {
      reads.push('parent.lateDoors');
      needs.push(parentDoorNeed('cadence'));
    }
  }
  needs.push(FOLDER_READ_NEED, RELAUNCH_NEED);
  if (door && !head) return { reads, needs, clauses: [lateBootBy('cadence'), QUARANTINED_BY_QUITTER, NO_TOAST_AT_RELAUNCH] };
  return { reads, needs, clauses: [NO_LATE_BOOT, NO_LATE_LOGIN, NOTHING_QUARANTINED_AT_QUIT, REBUILT_TOAST_CLAUSE, RELAUNCH_SAID_IT] };
}

const HC_GRADER = {
  reads: [...WITNESS_READS, 'boots.starts', 'boots.pids', 'hc.code', 'hc.reboot', 'hc.pass', 'hc.failLine'],
  needs: [WITNESS_NEED],
  clauses: [HC_PASS_CLAUSE, HC_SECOND_BOOT]
};

const NR_READS = [...WINDOW_READS, 'world.seeded', 'world.liveShells', 'world.historyMin', 'world.flagBefore', 'press.how', 'press.ok', 'press.closedAfter', 'log.passLine', 'ring.read', 'ring.quitGen', 'exit.signal', 'exit.wedged', 'log.storageLine', 'loadAtPress'];

export const GRADERS = {
  'C0-parent': {
    title: 'the parent, the control (three shells, the bridge quit): no core boots during the quit, and the backups hold the launch and the quit',
    reads: [...shellReads(), ...RING_READS],
    needs: [...shellNeeds(), RING_NEED],
    clauses: [NO_LATE_BOOT, NO_LATE_LOGIN, RING_CLEAN]
  },
  'C0-head': {
    title: 'HEAD, the control: as the parent, the quit ended by the will-quit SIGKILL with its storage line, its wait beside the parent’s',
    reads: [...shellReads(), ...RING_READS, ...END_READS, 'log.storageWaitedMs', 'parent.storageWaitedMs'],
    needs: [...shellNeeds(), RING_NEED, NOT_WEDGED_NEED, PARENT_STORAGE_NEED],
    clauses: [NO_LATE_BOOT, NO_LATE_LOGIN, RING_CLEAN, SIGKILL_END, STORAGE_NEAR]
  },
  'B1-parent': { title: 'the parent, the window’s blur at its close: a second core boots during the quit and spends a backup on rows written after the quit generation', ...doorArm('cadence', BLUR_NEED, ['doors.blur'], { head: false, parentClauses: [SPENT_PARENT] }) },
  'B1-head': {
    title: 'HEAD, the window’s blur at its close: no core boots, no list opens and no tmux starts during the quit, no backup spent, the will-quit SIGKILL',
    ...doorArm('cadence', BLUR_NEED, ['doors.blur'], { head: true, headClauses: [NO_OPENS, NO_TMUX], headReads: ['quit.opensBeyondGeneration', 'quit.tmuxSpawns'] })
  },
  'L1-parent': { title: 'the parent, Live Diagnostics live through the quit, its top late: a second core boots from the tick’s finish', ...doorArm('live', LIVE_NEED, ['world.liveStarted', 'doors.topHeld'], { head: false }) },
  'L1-head': { title: 'HEAD, Live Diagnostics live through the quit: no core boots, no backup spent, the will-quit SIGKILL', ...doorArm('live', LIVE_NEED, ['world.liveStarted', 'doors.topHeld'], { head: true }) },
  'P1-parent': { title: 'the parent, a sleep and a wake at the window’s close: a second core boots from the suspend’s capture', ...doorArm('power', POWER_NEED, ['doors.suspend', 'doors.resume'], { head: false }) },
  'P1-head': {
    title: 'HEAD, a sleep and a wake at the window’s close: no core boots, the suspend’s lines carry the refusal, no backup spent, the will-quit SIGKILL',
    ...doorArm('power', POWER_NEED, ['doors.suspend', 'doors.resume'], { head: true, headClauses: [SUSPEND_REFUSED], headReads: ['log.suspendWarns', 'log.suspendWarnsRefused'] })
  },
  'S1-parent': {
    title: 'the parent, a quit pressed before startup asked for the core: startup boots one into the quit',
    reads: [...WITNESS_READS, 'doors.quitAtReady', 'boots.early', 'boots.late', 'boots.lateDoors', 'log.records', 'log.loginAfter', 'quit.windowsCreated'],
    needs: [WITNESS_NEED, QUIT_NEED, S1_NEED, LOG_RECORDS_NEED],
    clauses: [lateBootBy('startup')]
  },
  'S1-head': {
    title: 'HEAD, a quit pressed before startup asked for the core: no core at all, and startup says the quit refused it, once',
    reads: [...WITNESS_READS, 'doors.quitAtReady', 'boots.early', 'boots.starts', 'log.records', 'log.loginAfter', 'log.startupRefused', 'log.coreBootFailed', 'quit.windowsCreated', 'parent.lateDoors'],
    needs: [WITNESS_NEED, QUIT_NEED, S1_NEED, LOG_RECORDS_NEED, parentDoorNeed('startup')],
    clauses: [NO_BOOT_AT_ALL, NO_LATE_LOGIN, STARTUP_LINE_ONCE, NO_BOOT_FAILED]
  },
  'H1-parent': {
    title: 'the parent, the late drain held by a backed-up pool, the blur at its hide: a second core boots at the hide',
    reads: [...shellReads(), 'doors.poolHeld', 'doors.poolReleased', 'doors.blurAtHide', 'log.lateDrain', 'log.lateSettled', 'boots.lateDoorsAfterHide'],
    needs: [...shellNeeds(), POOL_NEED],
    clauses: [LATE_AT_HIDE]
  },
  'H1-head': {
    title: 'HEAD, the late drain held, the blur at its hide: no core boots, no backup spent, the will-quit SIGKILL after the drain settles',
    reads: [...shellReads(), 'doors.poolHeld', 'doors.poolReleased', 'doors.blurAtHide', 'log.lateDrain', 'log.lateSettled', 'parent.lateDoorsAfterHide', ...RING_READS, ...END_READS],
    needs: [...shellNeeds(), POOL_NEED, PARENT_HIDE_NEED, RING_NEED, NOT_WEDGED_NEED],
    clauses: [NO_LATE_BOOT, NO_LATE_LOGIN, RING_CLEAN, SIGKILL_END]
  },
  'D2-parent': { title: 'the parent, a damaged list at the quit with the blur at close: the quitting process quarantines it, and the relaunch says nothing', ...damageArm({ head: false, door: true }) },
  'D2-head': { title: 'HEAD, a damaged list at the quit with the blur at close: the quit boots nothing, and the relaunch quarantines it and says so', ...damageArm({ head: true, door: true }) },
  'D2n-parent': { title: 'the parent, a damaged list at a quit with no door (the control): the relaunch quarantines it and says so', ...damageArm({ head: false, door: false }) },
  'D2n-head': { title: 'HEAD, a damaged list at a quit with no door: the same as the parent', ...damageArm({ head: true, door: false }) },
  'HC-parent': { title: 'the parent, GMUX_SMOKE=shutdown-refusal: a harness boots, shuts down and boots a REAL second core in one process', ...HC_GRADER },
  'HC-head': { title: 'HEAD, GMUX_SMOKE=shutdown-refusal: a harness still boots its REAL second core in one process', ...HC_GRADER },
  'NR-parent': {
    title: 'the parent, his everyday quit over his recorded shape and 16 live shells, the native Quit row: printed (press to close, the pass, the quit generation, the end)',
    reads: NR_READS,
    needs: [AGENTS_NEED, WITNESS_NEED, NR_WORLD_NEED, FLAG_NEED, MENU_PRESS_NEED, QUIT_NEED],
    clauses: []
  },
  'NR-head': {
    title: 'HEAD, his everyday quit: no core boots, the pass wrote 16, a quit generation, the will-quit SIGKILL, the relaunch keeps everything, the window closed as the parent’s did',
    // THE PROBE REVIEW (rule 9): BOOTED_NEED, as every other HEAD arm that
    // grades NO_LATE_BOOT has it. Without it a witness that saw no boot at all
    // read "no core began to boot during the quit" as a pass.
    reads: [...NR_READS, 'boots.early', 'boots.late', 'log.loginBefore', 'log.loginAfter', 'relaunch.ran', 'relaunch.listed', 'relaunch.sameIds', 'relaunch.shellsLive', 'parent.closedAfterPress'],
    needs: [AGENTS_NEED, WITNESS_NEED, NR_WORLD_NEED, FLAG_NEED, MENU_PRESS_NEED, QUIT_NEED, BOOTED_NEED, RING_NEED, NOT_WEDGED_NEED, NR_RELAUNCH_NEED, PARENT_CLOSE_NEED],
    clauses: [NO_LATE_BOOT, NO_LATE_LOGIN, PASS_WROTE, QUIT_GEN, SIGKILL_END, KEEPS, CLOSE_WITHIN]
  },
  RUN: {
    title: 'the preflights held, the hidden agents held, the census held, every pid ended (the stand-in tops, the app’s tree), every FIFO removed, the scratch server gone, his history unmoved, no macOS report of the run',
    reads: ['tailscalePreflights', 'realTailscale', 'dnsPreflights', 'agentsHeld', 'censusFailures', 'serverRead', 'serverGone', 'socketsRead', 'socketsLeft', 'processTableRead', 'electronsLeft', 'topsLeft', 'fifosLeft', 'reportsRead', 'newReports', 'history.before', 'history.after'],
    needs: [
      ['the process table and the scratch server were read at the end', (r) => r.processTableRead === true && r.serverRead === true],
      ['at least one launch reached its window', (r) => r.agentsHeld.length > 0],
      ['the socket directory tmux and the harness use was read', (r) => r.socketsRead === true],
      ['his reports folder was read before the run and after it (names and times only)', (r) => r.reportsRead === true]
    ],
    clauses: [
      ['the Tailscale preflight passed at every launch and no real Tailscale was ever seen', (r) => r.tailscalePreflights.length > 0 && r.tailscalePreflights.every((x) => x === true) && r.realTailscale === 0],
      ['the DNS preflight passed at every launch and named loopback only', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every((x) => x === true)],
      ['every launch’s agents:list resolved nothing but the stand-ins (none)', (r) => r.agentsHeld.every((x) => x === true)],
      ['no launch’s census found a session of his touched', (r) => r.censusFailures.length === 0],
      ['the scratch tmux server is gone and no server answers on this run’s socket (its file and its .run marker are the harness’s)', (r) => r.serverGone === true && r.socketsLeft === 0],
      ['every Electron this run started is gone', (r) => r.electronsLeft === 0],
      ['every stand-in top this run’s apps started is gone', (r) => r.topsLeft === 0],
      ['every FIFO this run made is removed', (r) => r.fifosLeft === 0],
      ['no macOS report named Electron or Tortie appeared since the run began', (r) => r.newReports.length === 0],
      ['his shell history did not move across the run', (r) => historyHeld(r.history) === 'unmoved' || historyHeld(r.history) === 'his terminal']
    ]
  }
};

/** p349's history rule, by value: unmoved, held, his terminal, or unread. */
export function historyHeld(history) {
  if (history?.before === history?.after) return 'unmoved';
  if (history?.quiet === null || history?.quiet === undefined || typeof history.quiet.again !== 'string') return 'unread';
  return history.quiet.again !== history.after ? 'his terminal' : 'held';
}

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
 * One grader's verdict: `{ verdict: 'pass'|'fail'|'unreadable', ok, failed, missing }`.
 * A field the grader reads that is absent, or a need that does not hold, is
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

// ---------------------------------------------------------------------------
// --grader-self-test: every grader and the one reader on build/p359/fixtures/
// ---------------------------------------------------------------------------

export const FIXTURES_DIR = join(ROOT, 'build', 'p359', 'fixtures');
export const GRADER_FIXTURES = join(FIXTURES_DIR, 'graders.json');

function at(obj, path) {
  const keys = String(path).split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) ? Number(k) : k];
  const last = keys[keys.length - 1];
  return { o, k: /^\d+$/.test(last) ? Number(last) : last };
}
export function applyOps(reading, ops) {
  for (const op of ops ?? []) {
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

/** Every raw part a fixture folder or a kept raw.json can hold. */
export const RAW_PARTS = Object.freeze(['events', 'relaunchEvents', 'appLog', 'backups', 'gmuxAfterQuit', 'gmuxAfterRelaunch', 'toasts', 'shim', 'press', 'world', 'relaunch']);

/**
 * One raw folder's raw input: its recorded files, each read only when asked
 * for (events.jsonl, relaunch-events.jsonl, app.log, backups.json,
 * gmux-after-quit.txt, gmux-after-relaunch.txt, toasts.json), plus the folder's
 * bundle.json (the parts that were not files: the shim's output and code, the
 * press, the world, the relaunch's answers, each marked so in that file).
 */
export function rawOf(base, parts = RAW_PARTS) {
  const text = (name) => {
    try {
      return readFileSync(join(base, name), 'utf8');
    } catch {
      return null;
    }
  };
  const lines = (name) => {
    const t = text(name);
    return t === null ? undefined : t.split('\n');
  };
  const names = (name) => {
    const t = text(name);
    return t === null ? undefined : t.split('\n').map((x) => x.trim()).filter((x) => x !== '');
  };
  let bundle = {};
  try {
    bundle = JSON.parse(text('bundle.json') ?? '{}');
  } catch {
    bundle = {};
  }
  const want = new Set(parts);
  const raw = {};
  const put = (k, v) => {
    if (want.has(k) && v !== undefined) raw[k] = v;
  };
  put('events', lines('events.jsonl'));
  put('relaunchEvents', lines('relaunch-events.jsonl'));
  put('appLog', lines('app.log'));
  put('backups', text('backups.json') ?? undefined);
  put('gmuxAfterQuit', names('gmux-after-quit.txt'));
  put('gmuxAfterRelaunch', names('gmux-after-relaunch.txt'));
  const toasts = text('toasts.json');
  put('toasts', toasts === null ? undefined : JSON.parse(toasts));
  for (const k of ['shim', 'press', 'world', 'relaunch']) put(k, bundle[k]);
  return raw;
}

/**
 * THE PROBE REVIEW (docs/method/HOW-WE-BUILT-THIS.md rule 9): a raw fixture may
 * plant edits on a recorded folder's raw input before THE ONE READER reads it,
 * so a broken run is a recorded run with the lines that break it written beside
 * it and nothing else different. Each op names a raw part (RAW_PARTS), or a
 * dotted path inside one (`shim.text`):
 *   { append: part, lines: [...] }   lines added at the end of an array part (an object is written as its JSON line)
 *   { drop: part, matching: text }   every line holding the text removed
 *   { edit: part, from, to }         every `from` replaced, in each line of an array part or in a string part
 *   { set: part, value }             the part replaced whole (null: a part that was read and answered nothing)
 *   { unset: part }                  the part gone, as if never read
 * An op that changes nothing throws, so a fixture cannot drift into testing nothing.
 */
export function applyRawOps(raw, ops) {
  const out = structuredClone(raw);
  for (const op of ops ?? []) {
    const path = op.append ?? op.drop ?? op.edit ?? op.set ?? op.unset;
    const keys = String(path).split('.');
    if (!RAW_PARTS.includes(keys[0])) throw new Error(`a raw op names ${J(path)}, which is no raw part`);
    let o = out;
    for (const k of keys.slice(0, -1)) {
      if (o[k] === null || typeof o[k] !== 'object') throw new Error(`a raw op names ${J(path)}, which this raw does not hold`);
      o = o[k];
    }
    const k = keys[keys.length - 1];
    const v = o[k];
    if (op.set !== undefined) o[k] = structuredClone(op.value);
    else if (op.unset !== undefined) {
      if (v === undefined) throw new Error(`a raw op unsets ${J(path)}, which this raw does not hold`);
      delete o[k];
    } else if (op.append !== undefined) {
      if (!Array.isArray(v) || !Array.isArray(op.lines) || op.lines.length === 0) throw new Error(`a raw op appends nothing to ${J(path)}`);
      o[k] = [...v, ...op.lines.map((l) => (typeof l === 'string' ? l : J(l)))];
    } else if (op.drop !== undefined) {
      if (!Array.isArray(v)) throw new Error(`a raw op drops from ${J(path)}, which is not a list`);
      const kept = v.filter((l) => !String(l).includes(String(op.matching)));
      if (kept.length === v.length) throw new Error(`a raw op drops nothing from ${J(path)}: no line holds ${J(op.matching)}`);
      o[k] = kept;
    } else if (op.edit !== undefined) {
      const swap = (s) => String(s).split(String(op.from)).join(String(op.to));
      if (!Array.isArray(v) && typeof v !== 'string') throw new Error(`a raw op edits ${J(path)}, which is neither a list nor a text`);
      const next = Array.isArray(v) ? v.map(swap) : swap(v);
      if (J(next) === J(v)) throw new Error(`a raw op edits nothing in ${J(path)}: ${J(op.from)} is not there`);
      o[k] = next;
    } else throw new Error(`a raw op this reader does not know: ${J(op)}`);
  }
  return out;
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
    process.stdout.write('[p359] grader self-test FAIL.\n');
    return false;
  }
  const honest = fixtures.honest ?? {};
  const broken = Array.isArray(fixtures.broken) ? fixtures.broken : [];
  const unread = Array.isArray(fixtures.unreadable) ? fixtures.unreadable : [];
  const raw = Array.isArray(fixtures.raw) ? fixtures.raw : [];
  const reads = Array.isArray(fixtures.rawReads) ? fixtures.rawReads : [];
  const variants = Array.isArray(fixtures.variants) ? fixtures.variants : [];
  const count = Object.keys(honest).length + broken.length + unread.length + raw.length + reads.length + variants.length;
  say(count === fixtures.readings, `the fixtures hold ${String(count)} readings, as their own count says (${String(fixtures.readings)})`);
  // The witness this run loads into main is the one the readers read: its own spellings.
  for (const [what, needle] of [
    ['the login-session line, either spelling', "data.indexOf('login session') !== -1"],
    ['the tmux scope', `data.indexOf('"scope":"tmux"') !== -1`],
    ['every event stamped with its pid', 'pid: process.pid'],
    ['the main bundle never required on the first turn', 'setImmediate(() => {'],
    ['a stand-in top for live-top only', "if (MODE === 'live-top' && isTop) { f = '/bin/sleep'; a = ['90']; }"]
  ]) {
    say(WITNESS.includes(needle), `the witness carries ${what}`);
  }
  // No committed fixture names his home.
  const homeIn = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\/Users\/[^/\s"]+/.test(readFileSync(p, 'utf8'))) homeIn.push(p.slice(ROOT.length + 1));
    }
  };
  try {
    walk(FIXTURES_DIR);
  } catch (err) {
    homeIn.push(`unreadable: ${String(err?.message ?? err)}`);
  }
  say(homeIn.length === 0, `no fixture names a home folder${homeIn.length === 0 ? '' : `: ${J(homeIn)}`}`);
  const sole = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const soleMiss = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const known = (arm, names, kind) => {
    const list = kind === 'clause' ? GRADERS[arm].clauses.map(([n]) => n) : [...GRADERS[arm].needs.map(([n]) => n), ...GRADERS[arm].reads.map(missingField)];
    return (names ?? []).filter((n) => !list.includes(n));
  };
  /** One fixture's verdict against what it says it must answer. */
  const judge = (c, reading) => {
    if (GRADERS[c.arm] === undefined) {
      say(false, `the fixture "${String(c.name)}" names ${J(c.arm)}, which is no grader`);
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
  // 1. Every grader's honest reading passes.
  for (const id of Object.keys(GRADERS)) {
    if (honest[id] === undefined) say(false, `${id} has no honest reading`);
    else judge({ arm: id, name: 'its honest reading', expect: 'pass' }, () => structuredClone(honest[id]));
  }
  // 2. Every broken reading FAILS exactly the clauses it names.
  for (const c of broken) judge({ ...c, expect: 'fail' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 3. Every unreadable reading answers UNREADABLE on exactly the needs it names.
  for (const c of unread) judge({ ...c, expect: 'unreadable' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 3b. Every variant of an honest reading that must still pass.
  for (const c of variants) judge({ ...c, expect: 'pass' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 4. Every raw fixture, through THE ONE READER, laid over its grader's honest reading
  //    (a raw fixture may plant edits on its recorded folder first: applyRawOps).
  for (const c of raw) judge(c, () => applyOps(overlay(honest[c.arm], derive(applyRawOps(rawOf(join(FIXTURES_DIR, 'raw', c.dir), c.parts ?? RAW_PARTS), c.rawOps))), c.ops ?? []));
  // 5. The one reader's own numbers over the recorded raw, against what the spec step's tables say.
  for (const c of reads) {
    let got;
    try {
      got = derive(applyRawOps(rawOf(join(FIXTURES_DIR, 'raw', c.dir), c.parts ?? RAW_PARTS), c.rawOps));
    } catch (err) {
      say(false, `the reader over ${c.dir} threw: ${String(err?.message ?? err)}`);
      continue;
    }
    const valueAt = (path) => {
      try {
        const { o, k } = at(got, path);
        return o?.[k];
      } catch {
        return undefined;
      }
    };
    const wrong = Object.entries(c.expect ?? {}).filter(([path, want]) => J(valueAt(path)) !== J(want));
    say(wrong.length === 0, `the reader over ${c.dir} (${c.name}) reads ${String(Object.keys(c.expect ?? {}).length)} values as recorded${wrong.length === 0 ? '' : `: wrong ${J(wrong.map(([p, w]) => ({ path: p, want: w, got: valueAt(p) })))}`}`);
  }
  // 6. A MISSING READING IS NEVER A PASS: every field a grader reads, deleted alone, answers UNREADABLE naming it.
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
      ? `[p359] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses each shown red alone, ${String(needs)} needs each shown unreadable alone, ${String(swept)} fields that answer UNREADABLE when missing, ${String(variants.length)} variants that still pass, ${String(raw.length)} raw fixtures graded and ${String(reads.length)} read through the one reader.\n`
      : `[p359] grader self-test FAIL: ${String(failures)}.\n`
  );
  return failures === 0;
}

// ---------------------------------------------------------------------------
// The witness (a scratch preload, written per launch; never a file under src/)
// ---------------------------------------------------------------------------

export const WITNESS = `'use strict';
// Phase 359's quit witness (build/p359/SPEC.md §8). SCRATCH ONLY: generated by
// build/p359/probe-p359.mjs and loaded by NODE_OPTIONS into MAIN of one launch.
// It records the quit with appendFileSync (on disk before any SIGKILL), every
// login-session line with its SYNCHRONOUS stack, every better-sqlite3 open of
// the profile's manifest and every tmux spawn, and drives ONE door (P359_MODE).
// It changes nothing Tortie decides.
if (process.type !== 'browser') return;
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const cp = require('node:child_process');
const OUT = process.env.P359_EVENTS || '';
const MODE = process.env.P359_MODE || 'none';
const MANIFEST = process.env.P359_MANIFEST || '';
const TRIGGER = process.env.P359_TRIGGER || '';
const FIFOS = (process.env.P359_FIFOS || '').split(',').filter((x) => x !== '');
const RELEASE_MS = ${String(POOL_RELEASE_MS)};
const RELEASE_CEILING_MS = ${String(POOL_RELEASE_CEILING_MS)};
const RESUME_MS = ${String(POWER_RESUME_MS)};
const origAppend = fs.appendFileSync;
const write = (o) => { if (OUT === '') return; try { origAppend(OUT, JSON.stringify(Object.assign({ t: Date.now(), pid: process.pid }, o)) + '\\n'); } catch { /* never break the app */ } };
const frames = (stack, n) => String(stack).split('\\n').slice(1).map((l) => l.trim().replace(/^at /, '')).slice(0, n);
const deep = () => { const lim = Error.stackTraceLimit; Error.stackTraceLimit = 60; const s = new Error().stack; Error.stackTraceLimit = lim; return frames(s, 50); };
let quitBegan = 0;
let pass = 0;
let hideSeen = false;
let held = false;
let released = false;
// H1: four reads of FIFOs nobody writes occupy the uv pool's four threads, so the watcher
// unsubscribes the disposer issues after the core's shutdown wait behind them (Phase 36's
// backed-up pool). Released RELEASE_MS after the late drain's first hide, and at the ceiling regardless.
const releasePool = () => {
  if (!held || released) return;
  released = true;
  let n = 0;
  for (const f of FIFOS) { try { const w = fs.openSync(f, fs.constants.O_WRONLY | fs.constants.O_NONBLOCK); fs.closeSync(w); n += 1; } catch (err) { write({ ev: 'release-failed', why: String(err && err.code) }); } }
  write({ ev: 'pool-released', n });
};
const holdPool = () => {
  if (held || FIFOS.length === 0) return;
  held = true;
  for (const f of FIFOS) fs.open(f, 'r', (err, fd) => { write({ ev: 'fifo-read-open', ok: !err }); if (!err) fs.close(fd, () => undefined); });
  write({ ev: 'pool-held', n: FIFOS.length });
  setTimeout(releasePool, RELEASE_CEILING_MS);
};
// 1. Every better-sqlite3 open of the manifest file (the gate's read-only checks and the store), at once.
const origLoad = Module._load;
const wrapped = new Map();
const wrapDb = (Database) => {
  if (typeof Database !== 'function') return Database;
  if (wrapped.has(Database)) return wrapped.get(Database);
  const P = new Proxy(Database, {
    construct(target, args) {
      const db = Reflect.construct(target, args);
      try {
        const given = typeof args[0] === 'string' ? path.resolve(args[0]) : '';
        if (given !== '' && (given === MANIFEST || path.basename(given) === 'manifest.db')) {
          const opts = args[1] && typeof args[1] === 'object' ? args[1] : {};
          write({ ev: 'db-open', file: given, readonly: opts.readonly === true, quitting: quitBegan > 0, stack: deep() });
        }
      } catch { /* never break the app */ }
      return db;
    },
    apply(target, _self, args) { return this.construct(target, args); }
  });
  wrapped.set(Database, P);
  return P;
};
Module._load = function p359Load(request) {
  const m = origLoad.apply(this, arguments);
  return request === 'better-sqlite3' ? wrapDb(m) : m;
};
// 2. tmux spawns (the control client), and in live-top the streaming top answered by a stand-in, at once.
const origSpawn = cp.spawn;
cp.spawn = function p359Spawn(file, args, opts) {
  const argv = Array.isArray(args) ? args.map(String) : [];
  let f = file;
  let a = args;
  const isTop = String(file) === '/usr/bin/top' || String(file) === 'top';
  if (MODE === 'live-top' && isTop) { f = '/bin/sleep'; a = ['90']; }
  const child = origSpawn.call(this, f, a, opts);
  try {
    if (isTop) write({ ev: 'top-spawn', held: MODE === 'live-top', child: child && child.pid });
    if (/tmux$/.test(String(file))) write({ ev: 'tmux-spawn', argv: argv.slice(-6), child: child && child.pid, quitting: quitBegan > 0, stack: quitBegan > 0 ? deep() : undefined });
  } catch { /* never break the app */ }
  return child;
};
write({ ev: 'loaded', mode: MODE });
setImmediate(() => {
  let electron;
  try { electron = require('electron'); } catch (err) { write({ ev: 'hook-failed', why: String(err && err.message).slice(0, 200) }); return; }
  const { app, BrowserWindow, Menu } = electron;
  // 3. The login-session line, witnessed with its synchronous stack (it is written inside boot's sync prefix).
  const origWrite = fs.writeFileSync;
  fs.writeFileSync = function p359WriteFileSync(p, data) {
    try {
      if (typeof data === 'string' && data.indexOf('login session') !== -1 && data.indexOf('"scope":"tmux"') !== -1) write({ ev: 'ensure-server', quitting: quitBegan > 0, stack: deep() });
      if (typeof data === 'string' && data.indexOf('notice.shown') !== -1) { const m = data.match(/"notice":"([a-z-]+)"/); write({ ev: 'notice', kind: m ? m[1] : null, quitting: quitBegan > 0 }); }
    } catch { /* never break the app */ }
    return origWrite.apply(this, arguments);
  };
  // 4. The core's dispose: the hook server's closeIdleConnections, its one caller in main.
  try {
    const http = require('node:http');
    const orig = http.Server.prototype.closeIdleConnections;
    if (typeof orig === 'function') http.Server.prototype.closeIdleConnections = function p359Dispose() { write({ ev: 'dispose' }); if (MODE === 'late-drain' && quitBegan > 0) holdPool(); return orig.apply(this, arguments); };
  } catch (err) { write({ ev: 'dispose-hook-failed', why: String(err && err.message).slice(0, 200) }); }
  if (MODE === 'late-drain') {
    const origHide = BrowserWindow.prototype.hide;
    BrowserWindow.prototype.hide = function p359Hide() {
      const r = origHide.apply(this, arguments);
      if (quitBegan > 0) {
        write({ ev: 'window-hidden', id: this.id });
        try { app.emit('browser-window-blur', { preventDefault() {} }, this); write({ ev: 'blur-emitted', id: this.id, at: 'hide' }); } catch (err) { write({ ev: 'blur-failed', why: String(err && err.message).slice(0, 200) }); }
        if (!hideSeen) { hideSeen = true; setTimeout(releasePool, RELEASE_MS); }
      }
      return r;
    };
  }
  const kinds = new Map();
  const kindOf = (w) => { try { const u = String(w.webContents.getURL()); return u.includes('/settings/index.html') ? 'settings' : u.includes('/index.html') ? 'main' : 'other'; } catch { return 'unknown'; } };
  const track = (w) => {
    const id = w.id;
    write({ ev: 'window-created', id, quitting: quitBegan > 0 });
    try { w.webContents.on('did-finish-load', () => kinds.set(id, kindOf(w))); } catch { /* the kind is a nicety */ }
    w.on('close', () => {
      write({ ev: 'window-close', id, kind: kinds.get(id) || 'unknown', quitting: quitBegan > 0 });
      if (MODE === 'power-at-close' && quitBegan > 0) {
        try { electron.powerMonitor.emit('suspend'); write({ ev: 'suspend-emitted', id }); setTimeout(() => { try { electron.powerMonitor.emit('resume'); write({ ev: 'resume-emitted', id }); } catch (err) { write({ ev: 'power-failed', why: String(err && err.message).slice(0, 200) }); } }, RESUME_MS); } catch (err) { write({ ev: 'power-failed', why: String(err && err.message).slice(0, 200) }); }
      }
      if (MODE === 'blur-at-close' && quitBegan > 0) {
        try { app.emit('browser-window-blur', { preventDefault() {} }, w); write({ ev: 'blur-emitted', id }); } catch (err) { write({ ev: 'blur-failed', why: String(err && err.message).slice(0, 200) }); }
      }
    });
    w.on('closed', () => write({ ev: 'window-closed', id, kind: kinds.get(id) || 'unknown' }));
  };
  for (const w of BrowserWindow.getAllWindows()) track(w);
  app.on('browser-window-created', (_e, w) => track(w));
  app.prependListener('before-quit', () => {
    pass += 1;
    if (pass === 1) quitBegan = Date.now();
    write({ ev: 'before-quit', pass, windows: BrowserWindow.getAllWindows().length });
  });
  app.prependListener('will-quit', () => write({ ev: 'will-quit', windows: BrowserWindow.getAllWindows().length }));
  app.prependListener('quit', () => write({ ev: 'quit' }));
  if (MODE === 'quit-at-ready') {
    app.whenReady().then(() => { write({ ev: 'quit-at-ready', windows: BrowserWindow.getAllWindows().length }); app.quit(); });
  }
  // NR: the native menu's own Quit row, clicked in main when the probe asks (a trigger file).
  const findItem = (items, test) => { for (const item of items) { if (test(String(item.label))) return item; if (item.submenu) { const inner = findItem(item.submenu.items, test); if (inner) return inner; } } return null; };
  let seen = 0;
  const poll = setInterval(() => {
    if (TRIGGER === '') return;
    let req = null;
    try { req = JSON.parse(fs.readFileSync(TRIGGER, 'utf8')); } catch { return; }
    if (!req || typeof req.seq !== 'number' || req.seq <= seen) return;
    seen = req.seq;
    try {
      if (req.action === 'menu-quit') { const menu = Menu.getApplicationMenu(); const item = menu ? findItem(menu.items, (l) => l.startsWith('Quit ')) : null; write({ ev: 'menu-quit', ok: item !== null, label: item ? String(item.label) : null, windows: BrowserWindow.getAllWindows().length }); if (item) item.click(); }
    } catch (err) { write({ ev: 'trigger-failed', action: String(req.action), why: String(err && err.message).slice(0, 200) }); }
  }, 50);
  poll.unref();
  write({ ev: 'hooked' });
});
process.on('exit', (code) => write({ ev: 'process-exit', code }));
`;

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
// Every grader's reads, needs and clauses by name, as JSON: what a fixture may name. Starts nothing.
if (process.argv.includes('--list-graders')) {
  process.stdout.write(`${J(Object.fromEntries(Object.entries(GRADERS).map(([id, g]) => [id, { title: g.title, reads: g.reads, needs: g.needs.map(([n]) => n), clauses: g.clauses.map(([n]) => n) }])), null, 1)}\n`);
  process.exit(0);
}
// The one reader over a fixture folder or a kept raw.json (P359_KEEP=1): what a re-derivation compares against. Starts nothing.
if (process.argv.includes('--derive')) {
  const target = process.argv[process.argv.indexOf('--derive') + 1];
  if (typeof target !== 'string' || target === '' || !existsSync(target)) {
    process.stderr.write('[p359] --derive takes a fixture folder or a kept raw.json\n');
    process.exit(2);
  }
  const raw = statSync(target).isDirectory() ? rawOf(resolve(target)) : JSON.parse(readFileSync(target, 'utf8'));
  process.stdout.write(`${J(derive(raw), null, 1)}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// --preflight
// ---------------------------------------------------------------------------

const PARENT = (process.env['P359_PARENT_CHECKOUT'] ?? '').trim();

/** The newest modification time under `dir` of a file `test` accepts, or 0. */
function newestUnder(dir, test) {
  let newest = 0;
  const walk = (where) => {
    let entries = [];
    try {
      entries = readdirSync(where, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(where, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '__tests__') walk(p);
      } else if (test(e.name)) {
        try {
          newest = Math.max(newest, statSync(p).mtimeMs);
        } catch {
          /* gone */
        }
      }
    }
  };
  walk(dir);
  return newest;
}

/** Each check the run makes before it starts anything, as `{ ok, said }`. */
function preflightChecks() {
  const out = [];
  const check = (ok, yes, no) => out.push({ ok, said: ok ? yes : no });
  const bundle = (checkout) => join(checkout, 'out', 'main', 'index.js');
  const textOf = (f) => {
    try {
      return readFileSync(f, 'utf8');
    } catch {
      return '';
    }
  };
  if (PARENT === '') check(false, '', `P359_PARENT_CHECKOUT is not set. Every arm runs at the parent first (${PARENT_SNAPSHOT}, built)`);
  else {
    const parent = resolve(PARENT);
    const text = textOf(bundle(parent));
    check(text !== '', `the parent ${parent} is built`, `${bundle(parent)} is missing: build the parent checkout first`);
    check(text !== '' && !text.includes(STARTUP_REFUSAL_LINE), 'the parent’s bundle carries no Phase 359 startup line (it is the parent, not HEAD)', `the parent’s bundle carries the Phase 359 startup line, so it is not ${PARENT_SNAPSHOT}`);
    check(text.includes('smoke === "shutdown-refusal"'), 'the parent dispatches GMUX_SMOKE=shutdown-refusal (HC)', 'the parent’s bundle has no GMUX_SMOKE=shutdown-refusal, so HC cannot run there');
    check(existsSync(join(parent, 'build', 'vendor', 'tmux', 'bin', 'tmux')), 'the parent carries its vendored tmux', 'the parent has no build/vendor/tmux/bin/tmux: copy build/vendor into it with cp -Rc');
    check(existsSync(join(parent, 'build', 'p3167', 'seed-sessions.mts')), 'the parent carries its own seed script (NR seeds each build with its own)', 'the parent has no build/p3167/seed-sessions.mts');
    check(existsSync(join(parent, 'node_modules', 'better-sqlite3')), 'the parent carries its own better-sqlite3 (D2’s damage at the parent)', 'the parent has no node_modules/better-sqlite3');
  }
  const head = bundle(ROOT);
  const headText = textOf(head);
  check(headText !== '', 'HEAD is built', `${head} is missing: npm run build first`);
  if (headText !== '') {
    const built = statSync(head).mtimeMs;
    const src = Math.max(newestUnder(join(ROOT, 'src', 'main'), (n) => n.endsWith('.ts')), newestUnder(join(ROOT, 'src', 'shared'), (n) => n.endsWith('.ts')), newestUnder(join(ROOT, 'src', 'preload'), (n) => n.endsWith('.ts')));
    check(built >= src, 'HEAD’s out/main/index.js is newer than every file under src/main, src/shared and src/preload, so the run measures this tree', 'HEAD’s out/main/index.js is older than a file under src/main, src/shared or src/preload: npm run build again, or the run measures a tree that is gone');
    check(headText.includes(STARTUP_REFUSAL_LINE), 'HEAD’s bundle carries the Phase 359 startup line', 'HEAD’s bundle does not carry the Phase 359 startup line: is the phase’s src/main/index.ts built?');
    check(headText.includes('smoke === "shutdown-refusal"'), 'HEAD dispatches GMUX_SMOKE=shutdown-refusal (HC)', 'HEAD’s bundle has no GMUX_SMOKE=shutdown-refusal, so HC cannot run');
  }
  for (const f of ['build/p3167/seed-sessions.mts', 'build/p330/tailscale-standin.mjs', 'build/p332/dns-standin.mjs', 'build/hidden-agents.mjs', 'build/electron-run.mjs', 'build/vendor/tmux/bin/tmux', 'node_modules/better-sqlite3']) check(existsSync(join(ROOT, f)), `${f} is here`, `${f} is missing`);
  for (const f of ['/usr/bin/mkfifo', '/bin/sleep', '/bin/ps']) check(existsSync(f), `${f} is here`, `${f} is missing`);
  return out;
}

if (process.argv.includes('--preflight')) {
  const checks = preflightChecks();
  for (const c of checks) process.stdout.write(`[p359] ${c.ok ? 'ok     ' : 'REFUSED'} ${c.said}\n`);
  const bad = checks.filter((c) => !c.ok).length;
  process.stdout.write(bad === 0 ? `[p359] preflight PASS: ${String(checks.length)} checks\n` : `[p359] preflight REFUSED: ${String(bad)} of ${String(checks.length)} checks\n`);
  process.exit(bad === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The run: the refusals, the scratch world
// ---------------------------------------------------------------------------

const TAG = '[p359]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '' || !SOCKET.startsWith('gmux-p359')) refuse(`"${SOCKET}" is not a gmux-p359 harness socket. Run \`npm run probe:p359\`, which wraps this file in build/harness-socket.mjs.`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
{
  const bad = preflightChecks().filter((c) => !c.ok);
  if (bad.length > 0) refuse(bad.map((c) => c.said).join('; '));
}

const KEEP = (process.env['P359_KEEP'] ?? '') === '1';
const ARMS = (process.env['P359_ARMS'] ?? '').trim() === '' ? [...DEFAULT_ARMS] : (process.env['P359_ARMS'] ?? '').split(',').map((x) => x.trim()).filter((x) => x !== '');
for (const a of ARMS) if (ARM_SPECS[a] === undefined) refuse(`P359_ARMS names ${J(a)}, which is no arm (${Object.keys(ARM_SPECS).join(', ')})`);
const PARENT_DIR = resolve(PARENT);
const parentRequire = createRequire(join(PARENT_DIR, 'package.json'));
const headRequire = createRequire(join(ROOT, 'package.json'));

mkdirSync(join(HARNESS_DIR, 'p359'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p359'));
/**
 * The harness root as the app is handed it: the REAL path, because every
 * profile below is a real path and GMUX_SMOKE's isolation check
 * (src/main/harness/isolation.ts) asks whether the profile starts with the root
 * as given. A TMPDIR under a symlink (/var is /private/var) would otherwise
 * refuse HC with no fault of the app's.
 */
const HARNESS_REAL = realpathSync(HARNESS_DIR);
const OUT = (process.env['P359_OUT_DIR'] ?? '').trim() || join(ROOT, 'out', 'p359');
/** The vendored tmux the development app runs (3.7b), so its client and server agree. */
const TMUX = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
/** NR's fill: 4,000 coloured lines per shell, wrapped at the detached width. */
const FILL_COMMAND = `for i in $(seq 1 ${String(NR_FILL)}); do printf '\\033[3%dm%06d %s\\033[0m\\n' $((i%7)) $i abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz; done`;

const report = { checkout: ROOT, parent: PARENT_DIR, socket: SOCKET, arms: [], readings: {}, printed: {} };
let failures = 0;
let unreadable = 0;
function cannotRead(id, why) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  say(`UNREADABLE ${id}: ${why}`);
}
function arm(id, reading) {
  report.readings[id] = reading;
  const g = grade(id, reading);
  if (g.verdict === 'unreadable') {
    cannotRead(id, `${GRADERS[id].title}; could not read ${J(g.missing)}`);
    return g;
  }
  report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
  if (!g.ok) failures += 1;
  say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
  return g;
}

// ---------------------------------------------------------------------------
// The stand-ins, the bookkeeping, his history and his reports folder
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
let watch = null;
const tailscalePreflights = [];
const dnsPreflights = [];
const agentsHeld = [];
const censusFailures = [];
const shims = new Set();
const apps = new Set();
/** The `/bin/sleep 90` stand-in tops this run's apps started (L1), by pid. */
const topPids = new Set();
/** Every FIFO this run made (H1). */
const fifosMade = new Set();

const HISTORY_FILES = ['.zsh_history', '.bash_history'];
const historyStat = () =>
  HISTORY_FILES.map((n) => {
    try {
      const s = statSync(join(userInfo().homedir, n));
      return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
    } catch {
      return 'none';
    }
  }).join('|');
const HISTORY_BEFORE = historyStat();
/** How long a moved history is waited on, starting nothing, before it is read again (his rule). */
const HISTORY_QUIET_MS = 180_000;
let historyDuring = 'the run starting';
let historySeen = HISTORY_BEFORE;
const historyMoves = [];
function noteHistory() {
  const now = historyStat();
  if (now === historySeen) return;
  historyMoves.push({ at: new Date().toISOString(), from: historySeen, to: now, during: historyDuring });
  historySeen = now;
}

/** His crash reports, by NAME and modification time only, through the account's own home (HOME is scratch here). Null when unread. */
function reportNames() {
  const dir = join(userInfo().homedir, 'Library', 'Logs', 'DiagnosticReports');
  try {
    return readdirSync(dir).map((n) => {
      try {
        return `${n}@${String(Math.floor(statSync(join(dir, n)).mtimeMs))}`;
      } catch {
        return n;
      }
    });
  } catch {
    return null;
  }
}
const REPORTS_BEFORE = reportNames();

/** tmux on THIS run's scratch socket only, ever. */
function tmux(...args) {
  if (!SOCKET.startsWith('gmux-p359')) throw new Error('refusing a socket that is not this run');
  const r = spawnSync(TMUX, ['-L', SOCKET, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return { status: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}
const serverNames = () => (tmux('list-sessions', '-F', '#{session_name}').out || '').split('\n').filter((x) => x !== '');
const shellIds = () =>
  (tmux('list-sessions', '-F', '#{session_id} #{session_name}').out || '')
    .split('\n')
    .map((l) => l.split(' '))
    .filter((p) => p.length >= 2 && p.slice(1).join(' ').startsWith(SHELL_PREFIX))
    .map((p) => p[0]);
function endServer() {
  try {
    tmux('kill-server');
  } catch {
    /* no server, or this run's socket refused: nothing of ours to end */
  }
}

function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const rows = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (m !== null) rows.set(Number(m[1]), { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}
/** One pid's command line, read again right before a signal; '' when it is gone. */
const commandOf = (pid) => String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();

/**
 * End every stand-in top an arm's app started (L1's `/bin/sleep 90`, which the
 * app's SIGKILL leaves reparented to launchd), each by its pid after its
 * command line is read again. Never a pattern and never a group.
 */
function endStandinTops(eventsFile) {
  for (const e of eventsOf(readLines(eventsFile))) {
    if (e.ev !== 'top-spawn' || e.held !== true || !Number.isInteger(e.child) || e.child <= 1) continue;
    topPids.add(e.child);
  }
  for (const pid of topPids) {
    if (!STANDIN_TOP_COMMAND.test(commandOf(pid))) continue;
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

/** H1's four FIFOs, made with mkfifo under the arm's folder and recorded for RUN. */
function makeFifos(p) {
  const list = [0, 1, 2, 3].map((i) => join(p.base, `pool-${String(i)}.fifo`));
  for (const f of list) {
    if (!existsSync(f)) spawnSync('/usr/bin/mkfifo', [f]);
    fifosMade.add(f);
  }
  return list;
}
function removeFifos() {
  for (const f of fifosMade) rmSync(f, { force: true });
}

// ---------------------------------------------------------------------------
// The app, over its renderer
// ---------------------------------------------------------------------------

function paths(label) {
  const base = join(RUN, label);
  return {
    base,
    profile: join(base, 'profile'),
    home: join(base, 'home'),
    proj: join(base, 'proj'),
    manifest: join(base, 'profile', 'gmux', 'manifest.db'),
    gmuxDir: join(base, 'profile', 'gmux'),
    backups: join(base, 'profile', 'gmux', 'backups', 'manifest.backups.json'),
    appLog: join(base, 'profile', 'logs', 'app.log'),
    appLogOld: join(base, 'profile', 'logs', 'app.log.1'),
    events: join(base, 'events.jsonl'),
    relaunchEvents: join(base, 'relaunch-events.jsonl'),
    trigger: join(base, 'trigger.json'),
    witness: join(base, 'witness.cjs')
  };
}

const readLines = (f) => {
  try {
    return readFileSync(f, 'utf8').split('\n').filter((l) => l !== '');
  } catch {
    return [];
  }
};
const readText = (f) => {
  try {
    return readFileSync(f, 'utf8');
  } catch {
    return null;
  }
};
/** app.log.1 then app.log: what one rotation leaves (src/main/log/transport.ts). */
const appLogLines = (p) => [...readLines(p.appLogOld), ...readLines(p.appLog)];
/** The gmux folder's names, or null when it does not read. */
const gmuxNames = (p) => {
  try {
    return readdirSync(p.gmuxDir);
  } catch {
    return null;
  }
};

/** His recorded shape (counts only), written by the BUILD'S OWN seed script through its own shipping insertSession, so each build opens a manifest of its own schema. */
function seed(p, checkout) {
  mkdirSync(join(p.profile, 'gmux'), { recursive: true });
  mkdirSync(p.home, { recursive: true });
  const r = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', join(checkout, 'tsconfig.node.json'), join(checkout, 'build', 'p3167', 'seed-sessions.mts'), '--manifest', p.manifest, '--shape', 'his', '--root', join(p.profile, 'seed-folders')],
    { cwd: checkout, encoding: 'utf8', env: { ...process.env, HOME: p.home, ZDOTDIR: p.home, HISTFILE: '/dev/null' }, timeout: 120_000 }
  );
  return { status: r.status, out: (r.stdout ?? '').trim().slice(0, 400), err: (r.stderr ?? '').trim().slice(0, 400) };
}

/**
 * D2's damage, 357's method: ONE sessions leaf's type byte written over on
 * disk after a checkpoint, and a second connection's write so the app's own
 * connection reads again. The build's own better-sqlite3, through a SECOND
 * connection, which never touches the app's; the SCRATCH profile's file only.
 */
function damageSessionsLeaf(manifest, req) {
  const readAt = (offset) => {
    const fd = openSync(manifest, 'r');
    try {
      const b = Buffer.alloc(1);
      readSync(fd, b, 0, 1, offset);
      return b[0];
    } finally {
      closeSync(fd);
    }
  };
  const Database = req('better-sqlite3');
  const w = new Database(manifest);
  try {
    w.pragma('wal_checkpoint(TRUNCATE)');
    const pageSize = w.pragma('page_size', { simple: true });
    const leaves = w.prepare("SELECT pageno FROM dbstat WHERE name = 'sessions' AND pagetype = 'leaf' ORDER BY path").all();
    const target = leaves[0];
    if (target === undefined) return { ok: false, why: 'no sessions leaf page' };
    const off = (target.pageno - 1) * pageSize + (target.pageno === 1 ? 100 : 0);
    const before = readAt(off);
    const fd = openSync(manifest, 'r+');
    try {
      writeSync(fd, Buffer.from([0x00]), 0, 1, off);
    } finally {
      closeSync(fd);
    }
    const after = readAt(off);
    const poked = w.prepare('UPDATE projects SET name = name').run().changes;
    return { ok: true, pageno: target.pageno, leaves: leaves.length, before, after, poked };
  } finally {
    w.close();
  }
}

/** The environment every launch of an arm gets: scratch everything, the stand-ins, and the witness. */
function launchEnv(p, mode, eventsFile, { fifos = [], trigger = '', smoke = null } = {}) {
  return withoutDevRenderer({
    HOME: p.home,
    ZDOTDIR: p.home,
    HISTFILE: '/dev/null',
    SHELL: '/bin/sh',
    TERM_SESSION_ID: undefined,
    TERM_PROGRAM: undefined,
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_LOG_FILE: '1',
    GMUX_SPECSTORY_NO_CLOUD: '1',
    GMUX_HARNESS_DIR: HARNESS_REAL,
    ...(smoke === null ? { GMUX_PROBES: '1', GMUX_TAILSCALE_BIN: standin.binPath, [NAME_SERVERS_VAR]: dns.servers } : { GMUX_SMOKE: smoke }),
    NODE_OPTIONS: `--require=${p.witness}`,
    P359_EVENTS: eventsFile,
    P359_MODE: mode,
    P359_MANIFEST: p.manifest,
    P359_FIFOS: fifos.join(','),
    P359_TRIGGER: trigger
  });
}

const devtoolsPort = (p) => {
  try {
    return Number(readFileSync(join(p.profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
/** The main window's renderer over CDP, once the bridge is up. */
async function attachWindow(p, timeoutMs = 120_000) {
  const started = Date.now();
  for (;;) {
    const port = devtoolsPort(p);
    if (port > 0) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) {
          const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
          await cdp.call('Runtime.enable');
          for (let i = 0; i < 200; i += 1) {
            if ((await cdpEval(cdp, "typeof window.gmux === 'object' && typeof window.gmux.sessions === 'object'")) === true) return cdp;
            await sleep(300);
          }
        }
      } catch {
        /* not up yet */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(300);
  }
}
const LIST_EXPR = 'window.gmux.sessions.list().then((l) => ({ ok: true, ids: l.map((s) => s.id), names: l.map((s) => s.name), statuses: l.map((s) => s.status) }), (e) => ({ ok: false, error: String(e && e.message).slice(0, 200) }))';
const QUIT_EXPR = 'window.gmux.quit().then(() => true, () => false)';
const LIVE_START_EXPR = 'window.gmux.diagnostics.liveStart(true).then((v) => v, (e) => ({ error: String(e && e.message).slice(0, 200) }))';
const TOASTS_EXPR = "JSON.stringify([...document.querySelectorAll('.toast')].map((t) => ({ text: (t.querySelector('.toast-text') || t).textContent, buttons: [...t.querySelectorAll('button')].map((b) => b.textContent) })))";
const createExpr = (name, proj) => `window.gmux.sessions.create({ name: ${J(name)}, projectPath: ${J(proj)}, agent: 'shell' }).then((s) => ({ ok: true, id: s.id }), (e) => ({ ok: false, error: String(e && e.message).slice(0, 300) }))`;

/** The reports folder around one launch: a launch whose report count moved is said, and RUN grades the run as a whole. */
function noteReports(label, before) {
  const after = reportNames();
  if (before === null || after === null) return;
  const fresh = after.filter((n) => !before.includes(n));
  if (fresh.length > 0) (report.printed.reports ??= []).push({ launch: label, names: fresh });
}

/** One launch's preflights and hidden agents, before its Electron. */
async function beforeLaunch(p, { standins = true } = {}) {
  mkdirSync(p.home, { recursive: true });
  mkdirSync(p.proj, { recursive: true });
  mkdirSync(p.profile, { recursive: true });
  writeFileSync(p.witness, WITNESS, { mode: 0o600 });
  writeHiddenAgents(p.profile, 'p359', hiddenAgentsBesides([]));
  if (!standins) return;
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflights.push(pre.ok);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused: ${dnsPre.problems.join('; ')}`);
}

/** One launch through the helper, the census's refusal recorded, the reports noted around it. */
async function launch(label, checkout, p, env, { window = true, keepServer = false, args = ['--remote-debugging-port=0', '--use-mock-keychain'] }, body) {
  const before = reportNames();
  try {
    return await withElectron(
      { label, userDataDir: p.profile, cwd: checkout, tmuxSocket: keepServer ? null : SOCKET, args, env, graceMs: 8_000, ceilingMs: 600_000 },
      async (handle) => {
        shims.add(handle.pid);
        const appTimer = setInterval(() => {
          try {
            const a = handle.appPid();
            if (a > 0) apps.add(a);
          } catch {
            /* not up yet */
          }
        }, 200);
        try {
          if (!window) return await body(null, handle, null);
          const win = await attachWindow(p);
          await sleep(2_000);
          const agents = standInsOnlyVerdict(JSON.parse(await cdpEval(win, AGENTS_LIST_EXPR, 120_000)), { standIns: [] });
          agentsHeld.push(agents.ok);
          if (!agents.ok) throw new Error(`an agent resolved: ${agents.said}`);
          try {
            return await body(win, handle, { agents });
          } finally {
            try {
              win.close();
            } catch {
              /* already closed with the window */
            }
          }
        } finally {
          clearInterval(appTimer);
        }
      }
    );
  } catch (err) {
    const why = String(err?.message ?? err);
    if (why.includes(CENSUS_WORDS)) censusFailures.push(`${label}: ${why.slice(0, 300)}`);
    throw err;
  } finally {
    noteReports(label, before);
  }
}

/** Wait for the launch's process to end; the shim's signal line can follow its exit on the pipe. */
async function waitEnd(handle, ms, settleMs = 2_500) {
  const code = await Promise.race([handle.exited, sleep(ms).then(() => `still running after ${String(ms / 1000)} s`)]);
  await sleep(settleMs);
  return { text: handle.text().slice(-20_000), code: Number.isInteger(code) ? code : null };
}

/** The relaunch on the arm's profile (D2, D2n, NR): what a person has afterwards. It names the socket, so its teardown ends the server. */
async function relaunchRead(label, checkout, p, { toasts }) {
  const out = { ran: false };
  try {
    await beforeLaunch(p);
    rmSync(p.relaunchEvents, { force: true });
    await launch(label, checkout, p, launchEnv(p, 'none', p.relaunchEvents), {}, async (win, handle, pre) => {
      out.agents = pre.agents;
      if (toasts) {
        await sleep(TOAST_WAIT_MS);
        out.toasts = JSON.parse(await cdpEval(win, TOASTS_EXPR, 30_000));
      }
      out.list = await cdpEval(win, LIST_EXPR, 60_000);
      out.serverNames = serverNames();
      const quitAt = Date.now();
      void cdpEval(win, QUIT_EXPR, 10_000).catch(() => null);
      const end = await waitEnd(handle, 90_000, 500);
      out.quitMs = Date.now() - quitAt;
      out.quit = exitOf(end.text, end.code);
      out.ran = true;
    });
  } catch (err) {
    out.why = String(err?.message ?? err).slice(0, 300);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The arms
// ---------------------------------------------------------------------------

/**
 * One windowed quit arm at one build (C0, B1, L1, P1, H1, D2, D2n, NR): build
 * the world, press, read how the quit ended and what it left on disk, then
 * (D2, D2n, NR) relaunch and read what a person has. Returns the raw input; the
 * reading is `derive`'s.
 */
async function quitRun(id, build) {
  const spec = ARM_SPECS[id];
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const req = build === 'parent' ? parentRequire : headRequire;
  const p = paths(`${id}-${build}`);
  const world = { agents: null, created: 0, seeded: null, serverNames: [], historySizes: [], flagBefore: null, damage: null, listAfterDamage: null, liveStart: null, loadAtPress: null, listBefore: null };
  const raw = { world };
  try {
    mkdirSync(p.base, { recursive: true });
    if (spec.seed) {
      const s = seed(p, checkout);
      report.printed[`${id}-${build}-seed`] = s.out;
      world.seeded = s.status === 0;
      if (s.status !== 0) throw new Error(`the seed failed: ${J(s)}`);
    }
    for (const f of [p.events, p.relaunchEvents, p.trigger]) rmSync(f, { force: true });
    await beforeLaunch(p);
    const fifos = spec.pool ? makeFifos(p) : [];
    let seq = 0;
    const ask = (action) => {
      seq += 1;
      writeFileSync(`${p.trigger}.tmp`, J({ seq, action }));
      renameSync(`${p.trigger}.tmp`, p.trigger);
    };
    const waitEvent = async (pred, ms) => {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        const e = eventsOf(readLines(p.events)).find(pred);
        if (e !== undefined) return e;
        await sleep(100);
      }
      return null;
    };
    const keepServer = spec.relaunch === true;
    await launch(`${id}-${build}-app`, checkout, p, launchEnv(p, spec.mode, p.events, { fifos, trigger: spec.menu ? p.trigger : '' }), { keepServer }, async (win, handle, pre) => {
      world.agents = pre.agents;
      await waitEvent((e) => e.ev === 'hooked', 10_000);
      if (spec.fill) await cdpEval(win, `window.gmux.projects.add(${J(p.proj)}).then((x) => x && x.path, () => null)`);
      for (let i = 0; i < spec.shells; i += 1) {
        const made = await cdpEval(win, createExpr(`${SHELL_PREFIX}${String(i).padStart(2, '0')}`, p.proj), 60_000);
        if (made?.ok === true) world.created += 1;
      }
      await sleep(1_500);
      if (spec.fill) {
        const ids = shellIds();
        for (const sid of ids) tmux('send-keys', '-t', sid, FILL_COMMAND, 'Enter');
        const until = Date.now() + 300_000;
        for (;;) {
          world.historySizes = ids.map((sid) => Number(tmux('display-message', '-p', '-t', sid, '#{history_size}').out || '0'));
          if (world.historySizes.every((n) => n >= NR_HISTORY_FLOOR) || Date.now() > until) break;
          await sleep(1_000);
        }
        await sleep(2_000);
        world.historySizes = ids.map((sid) => Number(tmux('display-message', '-p', '-t', sid, '#{history_size}').out || '0'));
      }
      if (spec.damage) {
        world.damage = damageSessionsLeaf(p.manifest, req);
        report.printed[`${id}-${build}-damage`] = world.damage;
        await sleep(800);
        world.listAfterDamage = await cdpEval(win, LIST_EXPR, 30_000);
        await sleep(1_000);
      }
      if (spec.live) {
        world.liveStart = await cdpEval(win, LIVE_START_EXPR, 30_000);
        await sleep(LIVE_WAIT_MS);
      }
      world.serverNames = serverNames();
      if (spec.menu) {
        // His everyday quit: the first-quit flag written beforehand, so the renderer quits at once.
        await cdpEval(win, `(localStorage.setItem(${J(TIP_KEY)}, '1'), true)`);
        world.flagBefore = await cdpEval(win, `localStorage.getItem(${J(TIP_KEY)})`);
        world.listBefore = await cdpEval(win, LIST_EXPR, 60_000);
      }
      world.loadAtPress = loadavg();
      if (spec.menu) {
        ask('menu-quit');
        await waitEvent((e) => e.ev === 'menu-quit', 10_000);
      } else {
        raw.press = { how: 'bridge', at: Date.now(), ok: true };
        void cdpEval(win, QUIT_EXPR, 10_000).catch(() => null);
      }
      raw.shim = await waitEnd(handle, 120_000);
    });
    raw.events = readLines(p.events);
    raw.backups = readText(p.backups);
    raw.gmuxAfterQuit = gmuxNames(p);
    if (spec.relaunch) {
      raw.relaunch = await relaunchRead(`${id}-${build}-relaunch`, checkout, p, { toasts: spec.damage === true });
      raw.relaunchEvents = readLines(p.relaunchEvents);
      raw.gmuxAfterRelaunch = gmuxNames(p);
      if (spec.damage) raw.toasts = raw.relaunch.toasts ?? null;
    }
    raw.appLog = appLogLines(p);
    if (KEEP) writeFileSync(join(p.base, 'raw.json'), `${J(raw, null, 1)}\n`, { mode: 0o600 });
    return raw;
  } finally {
    endStandinTops(p.events);
    removeFifos();
    endServer();
  }
}

/** S1: a quit pressed from a whenReady callback before startup asks for the core. No window is asked anything; the launch quits by itself. */
async function startupRun(id, build) {
  const spec = ARM_SPECS[id];
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const p = paths(`${id}-${build}`);
  const raw = {};
  try {
    mkdirSync(p.base, { recursive: true });
    rmSync(p.events, { force: true });
    await beforeLaunch(p);
    await launch(`${id}-${build}-app`, checkout, p, launchEnv(p, spec.mode, p.events), { window: false }, async (_win, handle) => {
      raw.world = { loadAtPress: loadavg() };
      raw.shim = await waitEnd(handle, 120_000, 1_000);
    });
    raw.events = readLines(p.events);
    raw.appLog = appLogLines(p);
    raw.gmuxAfterQuit = gmuxNames(p);
    if (KEEP) writeFileSync(join(p.base, 'raw.json'), `${J(raw, null, 1)}\n`, { mode: 0o600 });
    return raw;
  } finally {
    endServer();
  }
}

/** HC: GMUX_SMOKE=shutdown-refusal, a harness launch with no window that boots, shuts down and boots again in one process. */
async function harnessRun(id, build) {
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const p = paths(`${id}-${build}`);
  const raw = {};
  try {
    mkdirSync(p.base, { recursive: true });
    rmSync(p.events, { force: true });
    await beforeLaunch(p, { standins: false });
    await launch(`${id}-${build}-harness`, checkout, p, launchEnv(p, 'none', p.events, { smoke: 'shutdown-refusal' }), { window: false, args: [] }, async (_win, handle) => {
      raw.shim = await waitEnd(handle, 90_000, 500);
    });
    raw.events = readLines(p.events);
    raw.appLog = appLogLines(p);
    if (KEEP) writeFileSync(join(p.base, 'raw.json'), `${J(raw, null, 1)}\n`, { mode: 0o600 });
    return raw;
  } finally {
    endServer();
  }
}

/** The reading of one run: the one reader over its raw input, with what grading needs beside it. */
function readingOf(id, build, raw, parentReading = null) {
  const reading = derive(raw);
  reading.arm = id;
  reading.build = build;
  if (build === 'head') {
    reading.parent = {
      lateDoors: parentReading?.boots?.lateDoors ?? null,
      lateDoorsAfterHide: parentReading?.boots?.lateDoorsAfterHide ?? null,
      storageWaitedMs: parentReading?.log?.storageWaitedMs ?? null,
      closedAfterPress: parentReading?.press?.closedAfter ?? null
    };
  }
  return reading;
}

/** What each build did, printed for each pair: the boots during the quit and who started them, the backups, the quit's end. */
function printPair(id, parentR, headR) {
  const line = (r) =>
    r === null || r === undefined
      ? 'not read'
      : `boot starts ${String(r.boots?.starts ?? '—')} (during the quit ${String(r.boots?.late ?? '—')}: ${J(r.boots?.lateDoors ?? null)} at ${J(r.boots?.lateAt ?? null)} ms, callers ${J(r.boots?.lateCallers ?? null)}), login lines during the quit ${String(r.log?.loginAfter ?? '—')}, list opens beyond the generation ${String(r.quit?.opensBeyondGeneration ?? '—')}, tmux spawns ${String(r.quit?.tmuxSpawns ?? '—')}, windows made during the quit ${String(r.quit?.windowsCreated ?? '—')}, backups ${J(r.ring?.reasons ?? null)} (spent ${String(r.ring?.spent ?? '—')}, a launch ${String(r.ring?.launchAfterQuitMs ?? '—')} ms after the quit's), dispose ${String(r.quit?.dispose ?? '—')}, will-quit ${String(r.quit?.willQuit ?? '—')}, closed ${String(r.press?.closedAfter ?? r.quit?.closed ?? '—')} ms, pass ${J(r.log?.passLine ?? null)}, ended ${r.exit?.signal ?? `code ${String(r.exit?.code ?? '—')}`}, storage ${String(r.log?.storageWaitedMs ?? '—')} ms, load ${J(r.loadAtPress ?? null)}`;
  report.printed[`${id}-pair`] = { parent: line(parentR), head: line(headR) };
  say(`${id} parent: ${line(parentR)}`);
  say(`${id} head:   ${line(headR)}`);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
watch = watchForRealTailscale({ roots: () => [...shims, ...apps].filter((x) => x > 0), everyMs: 1_000 });
const historyPoll = setInterval(noteHistory, 1_000);
historyPoll.unref();
say(`measuring ${ROOT} against the parent ${PARENT_DIR}; arms ${J(ARMS)}; socket ${SOCKET}`);

try {
  for (const id of ARMS) {
    const spec = ARM_SPECS[id];
    const readings = {};
    for (const build of ['parent', 'head']) {
      say(`ARM ${id} at the ${build}`);
      noteHistory();
      historyDuring = `arm ${id} at the ${build}`;
      try {
        const raw = spec.harness ? await harnessRun(id, build) : spec.windowless ? await startupRun(id, build) : await quitRun(id, build);
        readings[build] = readingOf(id, build, raw, readings.parent ?? null);
        arm(`${id}-${build}`, readings[build]);
      } catch (err) {
        cannotRead(`${id}-${build}`, `the arm stopped: ${String(err?.message ?? err).slice(0, 400)}`);
      }
      endServer();
      noteHistory();
      historyDuring = `between arms, after ${id} at the ${build}`;
      await sleep(1_000);
    }
    printPair(id, readings.parent ?? null, readings.head ?? null);
  }
} catch (err) {
  report.error = String(err?.stack ?? err);
  say(`the run stopped: ${report.error.slice(0, 300)}`);
} finally {
  noteHistory();
  historyDuring = 'ending the run';
  const safely = (label, fn, fallback = null) => {
    try {
      return fn();
    } catch (err) {
      (report.ending ??= []).push(`${label}: ${String(err?.message ?? err)}`);
      return fallback;
    }
  };
  const leaked = watch === null ? [] : safely('the Tailscale watcher', () => watch.stop(), []);
  if (standin !== null) safely('the Tailscale stand-in', () => endStandinProcesses(standin.dir, 1_500));
  if (dns !== null) await dns.close().catch((err) => (report.ending ??= []).push(`the DNS stand-in: ${String(err?.message ?? err)}`));
  // Every stand-in top still running, by pid after its command line is read again; every FIFO; the scratch server.
  safely('the stand-in tops', () => endStandinTops(''));
  safely('the FIFOs', () => removeFifos());
  endServer();
  await sleep(500);
  const after = processTable();
  const electronsLeft = [...after.values()].filter((r) => [...shims, ...apps].includes(r.pid) && /[Ee]lectron|Tortie/.test(r.command)).length;
  const topsLeft = [...after.values()].filter((r) => topPids.has(r.pid) && STANDIN_TOP_COMMAND.test(r.command.trim())).length;
  const fifosLeft = [...fifosMade].filter((f) => existsSync(f)).length;
  const serverNow = tmux('list-sessions');
  const serverRead = serverNow.status !== null;
  const serverGone = serverRead && serverNow.status !== 0 && /no server running|error connecting|No such file or directory/i.test(serverNow.err);
  // THIS run's socket, in the directory tmux and build/harness-socket.mjs both use, never
  // another run's, never the harness's own `<socket>.run` marker, and never the socket FILE
  // alone, which tmux keeps after kill-server: a socket is left when a server still answers.
  const socketDir = join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid())}`);
  let socketNames = null;
  try {
    socketNames = readdirSync(socketDir);
  } catch {
    socketNames = null;
  }
  const socketsRead = Array.isArray(socketNames);
  const socketsLeft = socketsRead ? socketNames.filter((n) => n === SOCKET).filter(() => tmux('list-sessions').status === 0).length : null;
  report.printed['RUN-sockets'] = { dir: socketDir, files: socketsRead ? socketNames.filter((n) => n === SOCKET) : null, marker: socketsRead ? socketNames.includes(`${SOCKET}.run`) : null, left: socketsLeft };
  const reportsAfter = reportNames();
  const reportsRead = REPORTS_BEFORE !== null && reportsAfter !== null;
  const newReports = reportsRead ? reportsAfter.filter((n) => !REPORTS_BEFORE.includes(n)).filter((n) => /^(Electron|Tortie)/.test(n)) : null;
  report.printed['RUN-reports'] = { before: REPORTS_BEFORE?.length ?? null, after: reportsAfter?.length ?? null, newAll: reportsRead ? reportsAfter.filter((n) => !REPORTS_BEFORE.includes(n)) : null };
  // His history: read now, and again after a quiet wait if it moved.
  noteHistory();
  const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null, moves: historyMoves };
  if (history.after !== history.before) {
    say(`his shell history moved (${history.before} to ${history.after}); starting nothing for ${String(HISTORY_QUIET_MS / 1000)} s and reading it again`);
    historyDuring = `the ${String(HISTORY_QUIET_MS / 1000)} s quiet wait, nothing of the run running`;
    await sleep(HISTORY_QUIET_MS);
    history.quiet = { again: historyStat(), waitedMs: HISTORY_QUIET_MS };
  }
  noteHistory();
  clearInterval(historyPoll);
  for (const m of historyMoves) say(`his shell history moved at ${m.at} (${m.from} to ${m.to}), during ${m.during}`);
  arm('RUN', {
    tailscalePreflights,
    realTailscale: leaked.length,
    dnsPreflights,
    agentsHeld,
    censusFailures,
    serverRead,
    serverGone,
    socketsRead,
    socketsLeft,
    processTableRead: after.size > 0,
    electronsLeft,
    topsLeft,
    fifosLeft,
    reportsRead,
    newReports,
    history
  });
  safely('the report', () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p359.json'), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  });
  if (!KEEP) safely('the scratch world', () => rmSync(RUN, { recursive: true, force: true }));
  else say(`kept ${RUN} (P359_KEEP=1); every reading in ${OUT}`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} verdict(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
// Every launch, stand-in and server above has ended; a CDP call's long timer must not hold the run (or its lock slot) open.
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
