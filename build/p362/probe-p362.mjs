#!/usr/bin/env node
/**
 * probe:p362 — THE PHASE 362 APP RUN (build/p362/SPEC.md §8): his long ⌘Q,
 * measured at the parent (`795f5a14`, Phase 357.1 as landed) and at HEAD.
 *
 * At the parent, requestQuit()'s 3 s fallback app.quit() (src/main/menu.ts)
 * fires while his long quit is still in its snapshot pass, so it is
 * before-quit's SECOND pass: the windows close, will-quit runs before the
 * core's dispose, and the saving is cut (copies left as `.part` files, no quit
 * generation, the session list closed by Node's teardown). At HEAD the
 * fallback quits only when no quit has begun, so the quit's own bounded
 * disposer runs to its end and 357.1's hard exit at will-quit ends it.
 *
 * ONE ELECTRON AT A TIME, THE PARENT FIRST IN EVERY PAIR, each through
 * build/electron-run.mjs's `withElectron` inside build/harness-socket.mjs
 * (`gmux-p362…`), each arm on its own scratch profile, HOME and ZDOTDIR with
 * HISTFILE=/dev/null and SHELL=/bin/sh. The parent is `P362_PARENT_CHECKOUT`
 * (a BUILT `795f5a14`); without it `--preflight` refuses and the run exits 2.
 * The app launch of an arm passes `tmuxSocket: null`, so its scratch server
 * outlives the quit and the relaunch finds the shells live; the relaunch names
 * the socket, so its teardown ends that server and build/electron-run.mjs's
 * census reads around it; the arm's own `finally` ends the server too. It
 * never calls app.relaunch(), never holds main's inspector across a quit, and
 * never presses anything through macOS: a quit is the native menu's own Quit
 * row or the status item's Quit row (item.click() in MAIN), the bridge, the
 * last window's close, or the stopped notice's Restart in the DOM.
 *
 * WHAT IS REAL. His recorded shape, seeded by `build/p3167/seed-sessions.mts
 * --shape his` (counts only, no manifest of his is read), then N live shells
 * created through the window on this run's own scratch server, each given
 * 12,000 lines of coloured output (the quit saves the last 10,000 of each),
 * three `gmux.*` localStorage keys written in turn before the press, and the
 * Settings window opened, moved and (unless the arm leaves it open) closed
 * through its own close. A busy arm (M64L) starts `P362_LOOPS` loops of its
 * own a second before the press; each ends itself after 15 s and is ended by
 * pid in the arm's `finally` after its command line is read again.
 *
 * THE INSTRUMENTS, TWO SCRATCH PRELOADS THIS FILE WRITES (never a file under
 * src/), loaded by NODE_OPTIONS into MAIN of the arm's first launch:
 *   the quit recorder   appends one JSON line per event with appendFileSync (on
 *                       disk before any SIGKILL): every app.quit() and who
 *                       called it (the menu's 3 s fallback is told apart by
 *                       tagging the 3,000 ms timer the Quit row's click arms;
 *                       the renderer's quit by wrapping the `app:quit` invoke),
 *                       which window the quit event was SENT to (each window's
 *                       own webContents.send), before-quit with every window's
 *                       isVisible() and the same read on the next turn (a
 *                       harness window's `hide` event never fires, so the
 *                       windows are READ, never heard), will-quit and quit
 *                       with the run sentinel's state, every window's
 *                       creation and close, and the core's dispose (the hook
 *                       server's closeIdleConnections, its one caller in main).
 *                       It presses the menu's Quit row, the status item's Quit
 *                       row (Tray.prototype.setContextMenu wrapped to keep the
 *                       menu) and the last window's close when the probe asks,
 *                       and moves and closes Settings. Everything that needs
 *                       the app's own objects is installed from setImmediate,
 *                       because a `--require` preload cannot require('electron')
 *                       on its first turn.
 *   the tracker (D11)   wraps better-sqlite3's Database through Module._load AT
 *                       ONCE, before the bundle first requires it, and records
 *                       every connection opened (its file, read only or not,
 *                       a short stack), every close() that reaches it, and
 *                       which are open at will-quit, at quit and at the
 *                       process's exit. The session list connection is the
 *                       writable one on the arm's manifest opened by
 *                       ManifestStore. Each hook proves it took before a
 *                       grader reads what it did not see (the probe review):
 *                       the integrity gate's own close() at every boot proves
 *                       the close wrap, and a `state-hooked` line, written once
 *                       both quit listeners are in, proves those.
 * The fault trace (GMUX_FAULT_TRACE) times the snapshot pass and the quit
 * generation; app.log carries the pass's line, the hold line and the
 * will-quit storage line. A deliberate crash (QD) is `exit 139` from the
 * recorder at the `quit` event after writing a stand-in dump into the scratch
 * profile's Crashpad/pending, never a signal macOS reports.
 *
 * NO AGENT RUNS, not even for a version: every launch hides every probed
 * registry row (`writeHiddenAgents(profile, 'p362', hiddenAgentsBesides([]))`)
 * and reads `agents:list` back (`standInsOnlyVerdict(list, { standIns: [] })`);
 * every arm runs shells. The Tailscale and DNS stand-ins are probe:p357's.
 *
 * THREE VERDICTS, AND A MISSING READING IS NEVER A PASS. Each grader names the
 * fields it reads (`reads`), the preconditions without which nothing it says
 * can be trusted (`needs`) and its `clauses`. An absent field or an unmet need
 * is UNREADABLE (exit 2); only a clause is FAIL. Every reading taken from raw
 * text (the recorder's events, the fault trace, app.log, the tracker's lines,
 * the snapshot folder's names and records, the backup index, the run
 * sentinel, the shim's output) comes out of ONE pure function, `derive`, and
 * `--grader-self-test` drives that function over recorded raw fixtures
 * (build/p362/fixtures/raw/, seeded from the spec step's runs) as well as
 * grading recorded readings, every clause shown red alone and every need shown
 * unreadable alone.
 *
 * THE ARMS (parent first in each): M64, M64n, M64L, M48 (his long quit at 64
 * and 48 shells, first and everyday, quiet and busy), QS (⌘Q with Settings in
 * front), QR (a renderer that never answers: paused through the debugger), QT
 * (⌘Q twice, the second a second after the quit's first pass, while it saves),
 * QY (the status item's Quit), QW (Settings…, activate and
 * open-file during the saving), QD and QD0 (a crash in Node's teardown, and a
 * clean one), R2, R4, R5, R6 (357.1's quit table: the bridge quit, the last
 * window closed, Restart on the stopped notice, a quit with nothing opened).
 * TX (the tracker's verdict) rides in M64, M64L and QT. CM (F1's crash-state
 * arms, ported) is opt-in and needs a checking better-sqlite3 named by
 * P3571_BS3, which the tracker loads by path for the app (research 143's
 * hook-bs3.cjs is gone); without one both CM arms are UNREADABLE. RUN reads
 * the preflights, the census, every pid ended, the scratch server, his
 * history (its size and time, read once a second so a move is reported with
 * when it came and which arm was running) and his reports folder (names and
 * times only).
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && P362_PARENT_CHECKOUT=<a BUILT 795f5a14> npm run -s probe:p362
 *   P362_ARMS=M64,QS,…   the arms (default M64,M64n,M64L,M48,QS,QR,QT,QY,QW,QD,QD0,R2,R4,R5,R6;
 *                        CM only when named; RUN is always read)
 *   P362_KEEP=1          keep every run folder and every raw file for the re-derivation
 *   P362_LOOPS=<n>       M64L's busy loops (default 24)
 *   P362_OUT_DIR=<dir>   where the report goes (default out/p362)
 *   P3571_BS3=<dir>      a built checking better-sqlite3, for CM
 *   node build/p362/probe-p362.mjs --grader-self-test   every reader and grader on build/p362/fixtures/; starts nothing
 *   node build/p362/probe-p362.mjs --preflight          the parent, out/ and the helpers; starts nothing
 *   node build/p362/probe-p362.mjs --list-graders       every grader's reads, needs and clauses by name; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { loadavg, userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The build helpers this run USES, imported statically so gate:electron counts
// this probe among build/electron-run.mjs's users (obligation 1). Each only
// DEFINES functions when imported, so --grader-self-test and --preflight below
// still start nothing.
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

/** The parent this phase measures against: Phase 357.1 as landed. */
export const PARENT_SNAPSHOT = '795f5a14';
/** Every shell an arm creates is named with this, and the tmux sessions carry the same names. */
export const SHELL_PREFIX = 'p362-';
/** The lines each shell prints before the quit, and the floor its history must reach (the quit saves 10,000). */
export const FILL = 12_000;
export const HISTORY_FLOOR = 10_000;
/** The three gmux.* localStorage keys written in turn before the press, the last immediately before it. */
export const LS_KEYS = Object.freeze(['gmux.p362.early', 'gmux.p362.mid', 'gmux.p362.late']);
/** The first-quit toast's one-time flag (src/renderer/app/one-time-tip.ts), '1' once shown. */
export const TIP_KEY = 'gmux.tipShown.quit-hold';
/** Where the recorder moves the Settings window, so the relaunch can read the bounds back. */
export const SETTINGS_MOVED_BOUNDS = Object.freeze({ x: 233, y: 141, width: 802, height: 611 });
/** requestQuit()'s fallback delay, and how far from it a reading may land. */
export const FALLBACK_MS = 3_000;
export const FALLBACK_SLACK_MS = 100;
/** The first-quit toast's hold (src/renderer/app/quit.ts QUIT_TOAST_MS). */
export const TOAST_MS = 1_500;
/** M64L at HEAD: the process gone within this of its window closing. */
export const LINGER_MS = 1_000;
/** The R rows at HEAD: the window closed no later than the parent's by more than this. */
export const CLOSE_SLACK_MS = 100;
/** The snapshot pass's own race (shutdownGmuxCore, src/main/sessions/core.ts). */
export const SNAPSHOT_BOUND_MS = 8_000;
/** QD's stand-in dump (SPEC §9.3): 4,096 zero bytes. */
export const STANDIN_DUMP = 'p362-standin.dmp';
export const STANDIN_DUMP_BYTES = 4_096;
/** QR resumes the paused renderer this long after the press; QT presses again this long after the quit's first pass; QW acts this long after the first pass. */
export const QR_RESUME_MS = 4_000;
export const QT_SECOND_PRESS_MS = 1_000;
export const QW_DELAY_MS = 300;
/** M64L's busy loops: how many by default, and how long each lives on its own. */
export const DEFAULT_LOOPS = 24;
export const LOOP_SECONDS = 15;
/**
 * One busy loop's mark: its command line carries it, so the finally can read the
 * pid again before its signal. startLoops' spawn writes the loop's source whole,
 * as a literal, ON PURPOSE: gate:background reads a constant's value only up to
 * its first `;` (build/scan-source.mjs, assignedValues), so a loop held in a
 * constant walked past that gate (measured: endLoops taken out of the finally,
 * the gate still green). --grader-self-test checks the literal carries the mark.
 */
export const LOOP_MARK = `Date.now() + ${String(LOOP_SECONDS * 1000)}`;
/** app.log's lines this run reads, by their own words. */
export const PASS_LINE = /^scrollback pass \(app-quit\) over (\d+) sessions: (\d+) written,.*?(\d+) could not be written/;
export const STORAGE_LINE = /^the remembered settings (were on disk|could not be read on disk) after (\d+) ms; ending the quit/;
export const HOLD_LINE = 'the session list connection is left open at quit, so no close walks its cache';
export const NOT_RELAUNCHED_LINE = /restart asked: a harness launch is not relaunched/;
/** Phase 36's wedged-watcher escape, whose own SIGKILL is not the will-quit handler's. */
export const WEDGED_QUIT_LINE = /still pending after 15 s more; ending the process hard because environment teardown would abort/;
/** The Electron shim's line when the app it started ended by a signal. */
export const SHIM_SIGNAL_LINE = /exited with signal (SIG[A-Z0-9]+)/;
/** build/electron-run.mjs's census sentence, by its own words. */
export const CENSUS_WORDS = "is the private server the operator's live";
/** The stopped notice's words (src/shared/manifest-stopped-copy.ts), found in R5's toast. */
export const STOPPED_WORDS = 'session list stopped reading';
/** CM (F1's checker, research 143): its SIGSEGV line, its plant line, its violation lines. */
export const CRASH_FRAME = 'pcache1EnforceMaxPage';
export const CRASH_ADDRESS = '0x34';
export const CRASH_SEGV_LINE = /\[p358adv-SEGV\]/;
export const CRASH_SEGV_PARTS = /\[p358adv-SEGV\] signal (\d+) at address (0x[0-9a-f]+), pc 0x[0-9a-f]+ = ([^+\s]+)\+0x([0-9a-f]+) in /;
export const PLANT_LINE = /\[p358adv-PLANT\] crash-state at check \d+ op=\S+ cache=(0x[0-9a-f]+)/;
export const VIOLATION_LINE = /\[p358adv-VIOLATION\] [^\n]* file=(\S+) cache=(0x[0-9a-f]+)/g;
/** The statuses a listed session has once it is no longer live. */
const NOT_LIVE = new Set(['exited', 'restorable', 'discarded']);

/** Every arm's world. `n` shells; `toast` the first quit; `settings` closed, left open or never opened. */
export const ARM_SPECS = Object.freeze({
  M64: { n: 64, toast: true, settings: 'close', press: 'menu', long: true },
  M64n: { n: 64, toast: false, settings: 'close', press: 'menu', long: true },
  M64L: { n: 64, toast: true, settings: 'close', press: 'menu', long: true, loops: true },
  M48: { n: 48, toast: true, settings: 'close', press: 'menu', long: true },
  QS: { n: 8, toast: true, settings: 'open', press: 'menu' },
  QR: { n: 8, toast: true, settings: 'close', press: 'menu', pause: true },
  QT: { n: 64, toast: true, settings: 'close', press: 'menu', long: true, twice: true },
  QY: { n: 8, toast: true, settings: 'close', press: 'tray' },
  QW: { n: 64, toast: true, settings: 'close', press: 'menu', long: true, qw: true },
  QD: { teardown: true, crash: true },
  QD0: { teardown: true, crash: false },
  R2: { n: 3, toast: true, settings: 'close', press: 'bridge' },
  R4: { n: 3, toast: true, settings: 'close', press: 'close' },
  R5: { n: 3, toast: true, settings: 'close', press: 'restart', seam: true },
  R6: { n: 0, toast: true, settings: 'none', press: 'bridge', nothing: true },
  CM: { n: 64, toast: true, settings: 'close', press: 'menu', long: true, crashState: true }
});
export const DEFAULT_ARMS = Object.freeze(['M64', 'M64n', 'M64L', 'M48', 'QS', 'QR', 'QT', 'QY', 'QW', 'QD', 'QD0', 'R2', 'R4', 'R5', 'R6']);
/** The arms TX rides in. */
export const TX_HOSTS = Object.freeze(['M64', 'M64L', 'QT']);

// ---------------------------------------------------------------------------
// THE ONE READER. Every reading this run takes from raw text comes out of
// `derive` and the small pure helpers it calls, and nothing else. The live arms
// hand it what they read off disk and the pipe; --grader-self-test hands it the
// recorded raw fixtures, so a reader that miscounts is shown to.
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

/** The recorder's events, in the order written, each with a numeric `t` and a string `ev`. */
export function eventsOf(lines) {
  return jsonLines(lines).filter((o) => num(o.t) && typeof o.ev === 'string');
}

/** The fault trace: `<point>\t<ordinal>\t<ms>` per line. */
export function traceOf(lines) {
  return (Array.isArray(lines) ? lines : [])
    .map((l) => String(l).split('\t'))
    .filter((p) => p.length >= 3)
    .map(([point, ordinal, ms]) => ({ point, ordinal: Number(ordinal), t: Number(ms) }))
    .filter((x) => num(x.t));
}

/** A record's time on main's clock, from its ISO `ts`. */
export const tsOf = (o) => {
  const n = Date.parse(String(o?.ts ?? ''));
  return Number.isFinite(n) ? n : null;
};

/** True when a window's bounds are the probe's moved size (macOS may nudge the origin, never the size it was given). */
export const boundsMatch = (b) => b !== null && typeof b === 'object' && b.width === SETTINGS_MOVED_BOUNDS.width && b.height === SETTINGS_MOVED_BOUNDS.height;

/** Two id lists as sets: every id of one is in the other, and neither is empty. */
export function sameIdSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0) return false;
  const A = new Set(a);
  const B = new Set(b);
  return A.size === B.size && [...A].every((x) => B.has(x));
}

/** How many of the three keys' values read back as the run's nonce; null when unread. */
export function localStorageKept(values, nonce) {
  if (!Array.isArray(values) || typeof nonce !== 'string' || nonce === '') return null;
  return values.slice(0, LS_KEYS.length).filter((v) => v === nonce).length;
}

/**
 * The quit's copies on disk, read BEFORE any relaunch: for each live shell, a
 * completion record of reason `app-quit` captured after the press (`records`),
 * and that record's body still in the folder (`kept`, a usable copy: a body
 * AND its record); bodies written after the press (`bodies`); and the staged
 * writes left behind (`parts`). `snap.names` is the folder's names,
 * `snap.records` each live id's `<id>.capsules.json` text, `snap.mtimes` each
 * body's modification time, and (since the fix round) `snap.sizes` and
 * `snap.sha256` each live body's size and hash.
 *
 * THE FIX ROUND (lens 1), TWO READINGS THAT WERE WRONG. (1) A folder that did
 * not read came back null, so a quit cut before any write began (the parent
 * on a busy Mac, M64L) read UNREADABLE although its answer is known: the app
 * makes the snapshot folder at its first write, so a folder that is not there
 * under the gmux folder it lives in is 0 copies of N (`folder: 'never made'`).
 * snapshotListing hands the error over as data (`{ error, gmuxDir }`) and this
 * reader decides: ENOENT with the gmux folder there is that answer, anything
 * else (another error, or no gmux folder, which is a wrong path) stays unread.
 * READ_NEED still asks for the backup index as well, which is what proves the
 * app kept its files in that gmux folder. (2) A copy counted as kept when its
 * body's NAME was in the folder; it now also needs the body's size and sha256
 * to be the record's `bytes` and `sha256`, which is what resolveSnapshot asks
 * before it reads one (src/main/restore/snapshots.ts, bodyVerifies). A listing
 * recorded before the fix round carries neither map and reads by name, as it
 * did (`checked` says which).
 */
export function copiesOf(snap, pressAt, liveIds) {
  const unread = { read: false, of: null, kept: null, records: null, bodies: null, parts: null, folder: null, checked: null };
  if (snap === null || typeof snap !== 'object' || !Array.isArray(liveIds) || !num(pressAt)) return unread;
  if (snap.error !== undefined) {
    return snap.error === 'ENOENT' && snap.gmuxDir === true ? { read: true, of: liveIds.length, kept: 0, records: 0, bodies: 0, parts: 0, folder: 'never made', checked: null } : unread;
  }
  if (!Array.isArray(snap.names)) return unread;
  const names = new Set(snap.names);
  const checked = snap.sizes !== undefined || snap.sha256 !== undefined;
  /** The record's body is in the folder and, where the listing read them, its size and hash are the record's. */
  const bodyIsTheRecords = (c) => {
    if (typeof c.path !== 'string') return false;
    const b = basename(c.path);
    if (!names.has(b)) return false;
    if (snap.sizes !== undefined && snap.sizes?.[b] !== c.bytes) return false;
    if (snap.sha256 !== undefined && snap.sha256?.[b] !== c.sha256) return false;
    return true;
  };
  let kept = 0;
  let records = 0;
  let bodies = 0;
  for (const id of liveIds) {
    let capsules = [];
    try {
      capsules = JSON.parse(snap.records?.[id] ?? 'null')?.capsules ?? [];
    } catch {
      capsules = [];
    }
    const quitOnes = (Array.isArray(capsules) ? capsules : []).filter((c) => c !== null && typeof c === 'object' && c.reason === 'app-quit' && Number(c.capturedAt) >= pressAt);
    if (quitOnes.length > 0) records += 1;
    if (quitOnes.some(bodyIsTheRecords)) kept += 1;
    if (snap.names.some((n) => n.startsWith(`${id}.txt.`) && Number(snap.mtimes?.[n]) >= pressAt)) bodies += 1;
  }
  return { read: true, of: liveIds.length, kept, records, bodies, parts: snap.names.filter((n) => n.endsWith('.part')).length, folder: 'read', checked: checked ? 'bytes and sha256' : 'name only' };
}

/** The backup index: whether a generation of reason `quit` was captured after the press. */
export function generationOf(text, pressAt) {
  const none = { read: false, quit: null, count: null, newestReason: null };
  if (typeof text !== 'string' || !num(pressAt)) return none;
  try {
    const caps = JSON.parse(text)?.capsules;
    if (!Array.isArray(caps)) return none;
    return {
      read: true,
      quit: caps.some((c) => c !== null && typeof c === 'object' && c.reason === 'quit' && Number(c.capturedAt) >= pressAt),
      count: caps.length,
      newestReason: typeof caps[0]?.reason === 'string' ? caps[0].reason : null
    };
  } catch {
    return none;
  }
}

/** The run sentinel's text: there or not, and its `quitAt` mark (D4). */
export function sentinelOf(text) {
  if (typeof text !== 'string') return { exists: false, quitAt: null, dumpNames: null };
  try {
    const o = JSON.parse(text);
    return { exists: true, quitAt: typeof o?.quitAt === 'string' ? o.quitAt : null, dumpNames: Array.isArray(o?.dumpNames) ? o.dumpNames : null };
  } catch {
    return { exists: true, quitAt: null, dumpNames: null };
  }
}

/** What the shim's output and the exit code say about how the process ended. */
export function exitOf(text, code) {
  const t = typeof text === 'string' ? text : '';
  const sig = t.match(SHIM_SIGNAL_LINE);
  const parts = t.match(CRASH_SEGV_PARTS);
  return {
    ended: Number.isInteger(code),
    code: Number.isInteger(code) ? code : null,
    signal: sig === null ? null : sig[1],
    wedged: WEDGED_QUIT_LINE.test(t),
    notRelaunchedLine: NOT_RELAUNCHED_LINE.test(t),
    segv: CRASH_SEGV_LINE.test(t),
    crashFrame: parts !== null && parts[3] === CRASH_FRAME && parts[2] === CRASH_ADDRESS
  };
}

/** Whether F1's checker said it planted, and WHICH connection, from its own lines (probe:p357's reader, ported). */
export function plantOf(text, { sessionList, preloadDir } = {}) {
  const t = typeof text === 'string' ? text : '';
  const planted = /\[p358adv-PLANT\] crash-state/.test(t);
  const plant = t.match(PLANT_LINE);
  if (plant === null) return { planted, plantedIn: null };
  const after = t.slice(plant.index);
  let file = null;
  for (const m of after.matchAll(VIOLATION_LINE)) {
    if (m[2] === plant[1]) {
      file = m[1];
      break;
    }
  }
  if (file === null) return { planted, plantedIn: null };
  if (typeof sessionList === 'string' && sessionList !== '' && file === sessionList) return { planted, plantedIn: 'session-list' };
  if (typeof preloadDir === 'string' && preloadDir !== '' && file.startsWith(`${preloadDir}/`)) return { planted, plantedIn: 'preload' };
  return { planted, plantedIn: 'other' };
}

/**
 * The tracker's lines (D11). The session list connection is a writable
 * connection on the arm's manifest (`manifest`, its spellings) whose open
 * stack names ManifestStore or openGmuxDatabase. For it: how many close()
 * calls reached better-sqlite3, and whether it was open at will-quit, at quit
 * and at the process's exit (null where that moment never came).
 */
export function trackerOf(lines, manifest) {
  const all = jsonLines(lines);
  const read = all.some((o) => o.ev === 'installed');
  const files = new Set((Array.isArray(manifest) ? manifest : [manifest]).filter((x) => typeof x === 'string' && x !== ''));
  const opens = all.filter((o) => o.ev === 'open');
  const ids = opens
    .filter((o) => files.has(o.file) && o.readonly !== true && (o.stack ?? []).some((f) => /ManifestStore|openGmuxDatabase/.test(String(f))))
    .map((o) => o.id);
  const stateAt = (at) => {
    const s = all.find((o) => o.ev === 'state' && o.at === at);
    if (s === undefined) return { seen: false, open: null };
    const row = (s.open ?? []).find((x) => ids.includes(x.id));
    return { seen: true, open: row === undefined ? null : row.open === true };
  };
  const willQuit = stateAt('will-quit');
  const quit = stateAt('quit');
  const exit = stateAt('exit');
  return {
    read,
    opens: opens.length,
    sessionLists: ids.length,
    closesReached: all.filter((o) => o.ev === 'close' && ids.includes(o.id)).length,
    // THE PROBE REVIEW: every close() the wrap saw, of any connection. The
    // integrity gate opens and closes a read only connection at every boot, so
    // none means the wrap never took, and "no close() reached it" means nothing.
    closesAny: all.filter((o) => o.ev === 'close').length,
    // THE PROBE REVIEW: the will-quit and quit listeners went in (the tracker says
    // so once both are registered); without them "no quit event" means nothing.
    hooked: all.some((o) => o.ev === 'state-hooked') && !all.some((o) => o.ev === 'state-hook-failed'),
    willQuitSeen: willQuit.seen,
    openAtWillQuit: willQuit.open,
    quitSeen: quit.seen,
    openAtQuit: quit.open,
    exitSeen: exit.seen,
    openAtExit: exit.open
  };
}

/**
 * The quit's timeline, every time in milliseconds after the press on main's
 * clock (null where it never came): who asked the quit and when, the passes,
 * the snapshot pass and its line, the generation, the dispose, will-quit,
 * quit, the process's exit, the main window's close, and the windows read at
 * the first pass and on the next turn.
 */
export function timelineOf(events, trace, records, pressAt, exitAt) {
  const rel = (t) => (num(t) && num(pressAt) ? t - pressAt : null);
  const after = num(pressAt) ? events.filter((e) => e.t >= pressAt) : [];
  const firstEv = (pred) => after.find(pred);
  const first = (pred) => {
    const e = firstEv(pred);
    return e === undefined ? null : rel(e.t);
  };
  const count = (pred) => after.filter(pred).length;
  const tr = num(pressAt) ? trace.filter((x) => x.t >= pressAt) : [];
  const tfirst = (pt) => {
    const e = tr.find((x) => x.point === pt);
    return e === undefined ? null : rel(e.t);
  };
  const quits = after.filter((e) => e.ev === 'app.quit');
  const pass1 = firstEv((e) => e.ev === 'before-quit' && e.pass === 1);
  const starter = pass1 === undefined ? undefined : [...quits].reverse().find((q) => q.t <= pass1.t);
  const recs = num(pressAt) ? records.filter((o) => (tsOf(o) ?? 0) >= pressAt) : [];
  const passRec = recs.find((o) => typeof o.msg === 'string' && PASS_LINE.test(o.msg));
  const passParts = passRec === undefined ? null : passRec.msg.match(PASS_LINE);
  const mainVisible = (windows) => {
    if (!Array.isArray(windows)) return null;
    const w = windows.find((x) => x?.kind === 'main');
    return w === undefined ? null : w.visible === true;
  };
  const willQuit = first((e) => e.ev === 'will-quit');
  const dispose = first((e) => e.ev === 'dispose');
  const timerQuit = first((e) => e.ev === 'app.quit' && e.from === 'timer');
  const snapshotsBegin = tfirst('quit.before-snapshots');
  const snapshotsEnd = tfirst('quit.after-snapshots');
  const passLine = passRec === undefined ? null : { at: rel(tsOf(passRec)), written: Number(passParts[2]), failed: Number(passParts[3]) };
  const mainClosed = first((e) => e.ev === 'window-closed' && e.kind === 'main');
  const processEnd = rel(exitAt);
  const afterFirst = pass1 === undefined ? undefined : after.find((e) => e.ev === 'after-first-pass' && e.t >= pass1.t);
  return {
    requestedTo: firstEv((e) => e.ev === 'quit-requested')?.kind ?? null,
    requests: count((e) => e.ev === 'quit-requested'),
    rendererQuit: first((e) => e.ev === 'app.quit' && e.from === 'ipc'),
    ipcQuits: count((e) => e.ev === 'app.quit' && e.from === 'ipc'),
    timerQuit,
    timerQuits: count((e) => e.ev === 'app.quit' && e.from === 'timer'),
    // THE PROBE REVIEW: how many 3 s timers the recorder tagged as the fallback.
    // "No fallback quit" (timerQuits 0) means nothing unless the fallback was
    // armed and tagged; an untagged one quits as 'timer-other' and reads 0.
    fallbackArmed: count((e) => e.ev === 'fallback-armed'),
    fallbackFired: first((e) => e.ev === 'fallback-fired'),
    beforeQuit1: pass1 === undefined ? null : rel(pass1.t),
    beforeQuit2: first((e) => e.ev === 'before-quit' && e.pass === 2),
    beforeQuitCount: count((e) => e.ev === 'before-quit'),
    firstPassBy: starter === undefined ? null : String(starter.from ?? 'other'),
    snapshotsBegin,
    snapshotsEnd,
    passLine,
    // The pass ran past its own 8 s race: its end point came at the bound and its line after it, or never.
    passBoundHit: num(snapshotsBegin) && num(snapshotsEnd) && snapshotsEnd - snapshotsBegin >= SNAPSHOT_BOUND_MS - 50 && (passLine === null || !num(passLine.at) || passLine.at > snapshotsEnd),
    generationRecord: tfirst('backup.after-record'),
    dispose,
    willQuit,
    quitEvent: first((e) => e.ev === 'quit'),
    exitEvent: first((e) => e.ev === 'process-exit'),
    mainClosed,
    processEnd,
    linger: num(processEnd) && num(mainClosed) ? processEnd - mainClosed : null,
    visibleAtFirstPass: pass1 === undefined ? null : mainVisible(pass1.windows),
    visibleNextTurn: afterFirst === undefined ? null : mainVisible(afterFirst.windows),
    // Every window made after the quit's first pass, to the process's end (THE
    // PROBE REVIEW: bounded at will-quit it missed a window made during the
    // will-quit wait, or one made 400 ms after an ask that will-quit overtook).
    windowsCreatedDuringQuit: pass1 === undefined ? 0 : after.filter((e) => e.ev === 'window-created' && e.t > pass1.t).length,
    // F1's race: the fallback's quit, and will-quit with it, before the core's dispose.
    timerFirst: num(timerQuit) && num(willQuit) && timerQuit <= willQuit && (dispose === null || willQuit < dispose)
  };
}

/** The press: the recorder's own (menu, status item, last window) or the probe's (bridge, Restart). */
export function pressOf(events, given) {
  const kinds = { 'menu-quit': 'menu', 'tray-quit': 'tray', 'close-main': 'close' };
  const presses = events.filter((e) => kinds[e.ev] !== undefined);
  if (presses.length > 0) {
    const p = presses[0];
    const second = presses.find((e, i) => i > 0 && e.ev === p.ev);
    return {
      how: kinds[p.ev],
      ok: p.ok === true,
      at: p.t,
      newest: typeof p.target === 'string' ? p.target : null,
      second: second === undefined ? null : { ok: second.ok === true, after: second.t - p.t }
    };
  }
  if (given !== null && typeof given === 'object' && num(given.at)) return { how: String(given.how), ok: given.ok === true, at: given.at, newest: null, second: null };
  return { how: null, ok: false, at: null, newest: null, second: null };
}

/** Records of one main process, read from app.log's records. */
const mainRecords = (records, pid) => records.filter((o) => o.proctype === 'main' && o.pid === pid);

/**
 * THE ONE READER (SPEC §8). `raw` holds whatever the arm read; each part of
 * the reading is derived only when its raw input is present, so a recorded
 * raw fixture can drive one part of it alone:
 *   events, trace, appLog, tracker: the files' lines
 *   press: a press the recorder cannot see ({ how, at, ok }), the bridge or Restart
 *   exitAt: when the probe heard the process end; shim: { text, code }
 *   snapshots: { names, records, mtimes, sizes, sha256 } read before any
 *     relaunch, or { error, gmuxDir } when the folder did not read; liveIds
 *   backups: the backup index's text; sentinelAfter: run.json's text after the quit
 *   manifest: the arm's manifest path's spellings
 *   world: the live answers before the press; relaunch: the relaunch's answers
 *   dumpsBefore, dumpsAfter, standin: Crashpad's dumps around a teardown quit
 *   cm: { bs3Built, markerText, sessionList, preloadDir }
 * A fixture names the parts it derives; the rest of its reading is recorded.
 */
export function derive(raw) {
  const r = {};
  const events = raw.events === undefined ? null : eventsOf(raw.events);
  const trace = traceOf(raw.trace ?? []);
  const al = raw.appLog === undefined ? null : jsonLines(raw.appLog).filter((o) => o.unparsed !== true);
  const loaded = events === null ? undefined : events.find((e) => e.ev === 'loaded');
  const pid = loaded !== undefined && Number.isInteger(loaded.pid) ? loaded.pid : null;
  const press = pressOf(events ?? [], raw.press ?? null);
  const quitRecords = al === null || pid === null ? [] : mainRecords(al, pid);
  if (events !== null) {
    r.recorder = {
      loaded: loaded !== undefined,
      hooked: events.some((e) => e.ev === 'hooked'),
      ipcWrapped: events.some((e) => e.ev === 'ipc-wrapped' && e.channel === 'app:quit'),
      pid
    };
    r.press = { how: press.how, ok: press.ok, newest: press.newest, second: press.second };
    r.timeline = timelineOf(events, trace, quitRecords, press.at, raw.exitAt ?? null);
    const qw = events.find((e) => e.ev === 'qw');
    // When the three asks ran: the recorder's own stamp, or (the spec step's recorder) 400 ms before its count.
    const actedAt = qw === undefined ? null : num(qw.actedAt) ? qw.actedAt - (press.at ?? 0) : qw.t - 400 - (press.at ?? 0);
    // THE PROBE REVIEW: the after-count is taken 400 ms after the asks; taken once
    // the quit had closed the main window, "the main window's count unchanged"
    // cannot be asked of it.
    const mainClosedAbs = num(press.at) ? events.find((e) => e.ev === 'window-closed' && e.kind === 'main' && e.t >= press.at)?.t : undefined;
    r.qw = {
      armed: events.some((e) => e.ev === 'armed' && e.what === 'qw'),
      clicked: qw?.clicked === true,
      activated: qw?.activated === true,
      openFile: qw?.openFile === true,
      during: actedAt !== null && num(r.timeline.beforeQuit1) && actedAt >= r.timeline.beforeQuit1 && (r.timeline.willQuit === null || actedAt < r.timeline.willQuit),
      created: r.timeline.windowsCreatedDuringQuit,
      before: qw?.before ?? null,
      after: qw?.after ?? null,
      countedBeforeClose: qw !== undefined && (mainClosedAbs === undefined || qw.t < mainClosedAbs)
    };
    const wrap = events.find((e) => e.ev === 'tray-wrap');
    const trayMenu = [...events].reverse().find((e) => e.ev === 'tray-menu');
    r.qy = { wrapTook: wrap?.ok === true, menuSeen: trayMenu !== undefined, quitRow: (trayMenu?.items ?? []).some((l) => String(l).startsWith('Quit ')) };
    const wq = events.find((e) => e.ev === 'will-quit');
    const qe = events.find((e) => e.ev === 'quit');
    const crashNow = events.find((e) => e.ev === 'crash-now');
    r.qd = {
      sentinelAtWillQuit: wq === undefined ? null : wq.sentinel === true,
      // The spec step's recorder wrote the sentinel's state on its crash line; this one on `quit`.
      sentinelAtQuit: qe !== undefined && qe.sentinel !== undefined ? qe.sentinel === true : crashNow !== undefined && crashNow.sentinel !== undefined ? crashNow.sentinel === true : null,
      quitAtAtQuit: typeof qe?.quitAt === 'string' ? qe.quitAt : null,
      crashWrote: crashNow?.wrote === true
    };
  }
  if (raw.shim !== undefined) {
    r.exit = exitOf(raw.shim?.text, raw.shim?.code);
  }
  if (al !== null) {
    const storage = quitRecords.filter((o) => (tsOf(o) ?? 0) >= (press.at ?? 0)).find((o) => o.scope === 'quit' && typeof o.msg === 'string' && STORAGE_LINE.test(o.msg));
    r.log = {
      storageLine: storage !== undefined,
      storage: storage === undefined ? null : { landing: storage.landing ?? null, waitedMs: storage.waitedMs ?? null, moved: storage.moved ?? null },
      holdLine: quitRecords.some((o) => o.msg === HOLD_LINE && (tsOf(o) ?? 0) >= (press.at ?? 0)),
      notRelaunched: quitRecords.some((o) => typeof o.msg === 'string' && NOT_RELAUNCHED_LINE.test(o.msg)) || (raw.shim !== undefined && r.exit.notRelaunchedLine === true),
      stopped: quitRecords.filter((o) => o.event === 'manifest.stopped').length
    };
    const later = al.filter((o) => o.proctype === 'main' && Number.isInteger(o.pid) && o.pid !== pid);
    const unclean = later.filter((o) => o.event === 'boot.unclean_exit');
    const u = unclean[0];
    r.relaunch = {
      unclean: unclean.length,
      uncleanFirst: u === undefined ? null : { newCount: u.dumps?.newCount ?? null, names: Array.isArray(u.dumps?.names) ? u.dumps.names : [], quitAt: typeof u.prev?.quitAt === 'string' ? u.prev.quitAt : null },
      notices: later.filter((o) => o.event === 'notice.shown' && o.notice === 'unclean-exit').length,
      bootsLogged: new Set(al.filter((o) => o.proctype === 'main' && Number.isInteger(o.pid)).map((o) => o.pid)).size
    };
  }
  if (raw.snapshots !== undefined) r.copies = copiesOf(raw.snapshots, press.at, raw.liveIds ?? null);
  if (raw.backups !== undefined) r.generation = generationOf(raw.backups, press.at);
  if (raw.tracker !== undefined) r.tracker = trackerOf(raw.tracker, raw.manifest ?? []);
  if (raw.world !== undefined) {
    const w = raw.world ?? {};
    const sizes = (Array.isArray(w.historySizes) ? w.historySizes : []).filter(num);
    const prefix = typeof w.prefix === 'string' ? w.prefix : SHELL_PREFIX;
    r.agents = w.agents ?? { ok: false, said: 'not read' };
    r.loadAtPress = Array.isArray(w.loadAtPress) ? w.loadAtPress : null;
    r.world = {
      shells: num(w.shellsWanted) ? w.shellsWanted : null,
      created: num(w.created) ? w.created : 0,
      liveShells: (Array.isArray(w.serverNames) ? w.serverNames : []).filter((x) => String(x).startsWith(prefix)).length,
      historyMin: sizes.length === 0 ? 0 : Math.min(...sizes),
      listedBefore: w.listBefore?.ok === true ? (w.listBefore.ids ?? []).length : null,
      settingsMoved: boundsMatch(w.settingsMovedBounds ?? null),
      settingsClosed: w.settingsClosed === true,
      flagBefore: typeof w.flagBefore === 'string' ? w.flagBefore : null,
      loopsWanted: num(w.loopsWanted) ? w.loopsWanted : 0,
      loopsStarted: num(w.loopsStarted) ? w.loopsStarted : 0
    };
    if (w.qr !== undefined && w.qr !== null) {
      r.qr = { paused: w.qr.paused === true, pausedAt: num(w.qr.pausedAt) && num(press.at) ? w.qr.pausedAt - press.at : null, resumed: w.qr.resumed === true };
    }
    if (w.seam !== undefined && w.seam !== null) {
      r.seam = { installed: w.seam.installed === true, armed: w.seam.armed === true, toast: w.seam.toast !== null && typeof w.seam.toast === 'object' && String(w.seam.toast.text ?? '').includes(STOPPED_WORDS) && w.seam.toast.button === 'Restart', clicked: w.seam.clicked === true };
    }
  }
  if (raw.relaunch !== undefined) {
    const rl = raw.relaunch ?? {};
    const list = rl.list ?? {};
    const names = Array.isArray(list.names) ? list.names : [];
    const statuses = Array.isArray(list.statuses) ? list.statuses : [];
    const onServer = new Set(Array.isArray(rl.serverNames) ? rl.serverNames : []);
    const prefix = typeof rl.prefix === 'string' ? rl.prefix : SHELL_PREFIX;
    let settings = null;
    try {
      settings = typeof rl.settingsText === 'string' ? JSON.parse(rl.settingsText) : null;
    } catch {
      settings = null;
    }
    // THE PROBE REVIEW: a list, a server listing or a localStorage read that did
    // not answer is left UNREAD (undefined, so the grader names it missing),
    // never read as a lost row (false), no shell live (0) or a flag never
    // written (null): those are FAILs, and "the first-quit flag was never
    // written" (QS at the parent) was a PASS on a read that never came.
    const before = raw.world?.listBefore?.ok === true && Array.isArray(raw.world.listBefore.ids) ? raw.world.listBefore.ids : Array.isArray(rl.idsBefore) ? rl.idsBefore : null;
    const valuesRead = Array.isArray(rl.values);
    const flagValue = valuesRead && rl.values.length > LS_KEYS.length ? rl.values[LS_KEYS.length] : undefined;
    const kept = localStorageKept(rl.values ?? null, rl.nonce ?? '');
    r.relaunch = {
      ...(r.relaunch ?? {}),
      ran: rl.ran === true,
      sameIds: list.ok === true && Array.isArray(list.ids) && before !== null && before.length > 0 ? sameIdSet(before, list.ids) : undefined,
      shellsLive: list.ok === true && Array.isArray(rl.serverNames) ? names.filter((n, i) => String(n).startsWith(prefix) && !NOT_LIVE.has(String(statuses[i])) && onServer.has(n)).length : undefined,
      keys: kept === null ? undefined : kept,
      flag: typeof flagValue === 'string' || flagValue === null ? flagValue : undefined,
      bounds: boundsMatch(settings?.settingsWindowBounds ?? null)
    };
  }
  if (raw.sentinelAfter !== undefined || raw.dumpsAfter !== undefined) {
    const standin = typeof raw.standin === 'string' ? raw.standin : STANDIN_DUMP;
    const s = sentinelOf(raw.sentinelAfter ?? null);
    const before = new Set(Array.isArray(raw.dumpsBefore) ? raw.dumpsBefore : []);
    const afterDumps = Array.isArray(raw.dumpsAfter) ? raw.dumpsAfter : [];
    const want = `pending/${standin}`;
    r.qd = {
      ...(r.qd ?? {}),
      code: raw.shim !== undefined ? r.exit.code : null,
      standin,
      dumpWritten: afterDumps.includes(want) || r.qd?.crashWrote === true,
      dumpNew: afterDumps.includes(want) && !before.has(want),
      sentinelLeft: s.exists,
      sentinelQuitAt: s.quitAt
    };
  }
  if (raw.cm !== undefined) {
    const cm = raw.cm ?? {};
    let marker = null;
    try {
      marker = typeof cm.markerText === 'string' ? JSON.parse(cm.markerText) : null;
    } catch {
      marker = null;
    }
    const plant = plantOf(raw.shim?.text ?? '', { sessionList: cm.sessionList, preloadDir: cm.preloadDir });
    r.cm = {
      bs3: cm.bs3Built === true,
      planted: plant.planted,
      plantedIn: plant.plantedIn,
      readsOk: marker?.readsOk === true,
      stopped: r.log?.stopped ?? null,
      segv: raw.shim !== undefined ? r.exit.segv : null,
      crashFrame: raw.shim !== undefined ? r.exit.crashFrame : null
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

const firstPassByTimerAt3s = (r) => r.timeline.firstPassBy === 'timer' && num(r.timeline.timerQuit) && Math.abs(r.timeline.timerQuit - FALLBACK_MS) <= FALLBACK_SLACK_MS;

const AGENTS_NEED = ['the agents:list answer resolved nothing but the stand-ins (none)', (r) => r.agents.ok === true];
const RECORDER_NEED = ['the quit recorder loaded in main and hooked the app, the renderer’s quit among it', (r) => r.recorder.loaded === true && r.recorder.hooked === true && r.recorder.ipcWrapped === true];
const SMOKE_RECORDER_NEED = ['the quit recorder loaded in the teardown quit’s main and hooked the app', (r) => r.recorder.loaded === true && r.recorder.hooked === true];
const worldNeed = (n) =>
  n === 0
    ? ['nothing was opened: no project, no session and no Settings window', (r) => r.world.created === 0 && r.world.liveShells === 0 && r.world.settingsMoved === false]
    : [`the world held ${String(n)} live shells, each with at least ${String(HISTORY_FLOOR)} lines of scrollback`, (r) => r.world.liveShells >= n && r.world.historyMin >= HISTORY_FLOOR];
const SETTINGS_CLOSED_NEED = ['the Settings window was moved and then closed through its own close before the press, so the event could reach the main window', (r) => r.world.settingsMoved === true && r.world.settingsClosed === true];
const SETTINGS_OPEN_NEED = ['the Settings window was moved and left open as the newest window, which the parent’s own rule picks: Settings in front', (r) => r.world.settingsMoved === true && r.world.settingsClosed === false && r.press.newest === 'settings'];
const toastNeed = (toast) =>
  toast
    ? ['the first-quit flag was not yet written, so the press is his first quit (the toast)', (r) => r.world.flagBefore === null]
    : ['the first-quit flag was written before the press, so the press is his everyday quit (no toast)', (r) => r.world.flagBefore === '1'];
const MENU_PRESS_NEED = ['the native menu’s Quit row was found and clicked in main', (r) => r.press.how === 'menu' && r.press.ok === true];
// THE PROBE REVIEW: the second press is pressed a second after the quit's
// first pass, so it lands while the quit saves (SPEC §14 Q3, D1's "a second ⌘Q
// no longer cuts a quit that is saving"). Pressed a second after the FIRST
// press, it landed inside the first quit's 1.5 s message, its renderer quit at
// once (the flag already written) and began the quit itself, a second early:
// the parent's pass then often ended before its fallback (64 shells take 1.65
// to 2.1 s on a quiet Mac, SPEC §2.1), so QT-parent's cut was a coin toss.
const TWICE_NEED = [
  'the native menu’s Quit row was clicked in main twice, the second a second after the quit’s first pass, while it was saving',
  (r) =>
    r.press.how === 'menu' &&
    r.press.ok === true &&
    r.press.second !== null &&
    r.press.second.ok === true &&
    num(r.press.second.after) &&
    num(r.timeline.beforeQuit1) &&
    r.press.second.after >= r.timeline.beforeQuit1 + QT_SECOND_PRESS_MS - 100 &&
    (r.timeline.willQuit === null || r.press.second.after < r.timeline.willQuit)
];
// THE PROBE REVIEW: "no fallback quit" is asked only of a fallback the recorder
// saw armed and tagged; one it missed quits as 'timer-other' and reads as none.
const FALLBACK_TAGGED_NEED = ['the press armed requestQuit’s 3 s fallback and the recorder tagged it, so a quit it made would read as the fallback’s', (r) => r.timeline.fallbackArmed >= 1];
const FALLBACK_TAGGED_TWICE_NEED = ['each of the two presses armed requestQuit’s 3 s fallback and the recorder tagged both', (r) => r.timeline.fallbackArmed >= 2];
const TO_MAIN_NEED = ['the menu’s event reached the main window, read from the window’s own send', (r) => r.timeline.requestedTo === 'main'];
const READ_NEED = ['the snapshot folder and the backup index were read after the quit, before any relaunch', (r) => r.copies.read === true && r.generation.read === true];
const TRACKER_NEED = ['the tracker was installed before the bundle first required better-sqlite3 and saw one session list connection', (r) => r.tracker.read === true && r.tracker.sessionLists === 1];
// THE PROBE REVIEW: the tracker's two hooks, each with a reading that proves it
// took, so "no close() reached it" and "no quit event" are never read off a
// wrap or a listener that was never installed.
const TRACKER_CLOSE_NEED = ['the tracker’s close() wrap took: it saw a connection closed in the run (the integrity gate closes its own at every boot)', (r) => r.tracker.closesAny >= 1];
// Asked whether or not the quit reached will-quit, so a quit that hangs before it still FAILs.
const TRACKER_HOOKS_NEED = ['the tracker’s will-quit and quit listeners went in (it said so once both were registered)', (r) => r.tracker.hooked === true];
const TRACKER_WILLQUIT_NEED = ['the quit reached will-quit, where the tracker read the connection', (r) => r.tracker.willQuitSeen === true];
const NOT_WEDGED_NEED = ['the quit did not take Phase 36’s wedged-watcher escape, so a SIGKILL is the will-quit handler’s', (r) => r.exit.wedged === false];
const RELAUNCH_NEED = ['the relaunch on that profile ran and app.log recorded both launches’ boots', (r) => r.relaunch.ran === true && r.relaunch.bootsLogged >= 2];
const BOUND_NEED = ['the snapshot pass ended inside its own 8 s bound, so “everything saved” can be asked', (r) => r.timeline.passBoundHit === false];
const LOAD_NEED = ['the run’s own busy loops were started before the press and the load was read at it', (r) => r.world.loopsWanted > 0 && r.world.loopsStarted === r.world.loopsWanted && Array.isArray(r.loadAtPress)];
const PARENT_CLOSE_NEED = ['the parent’s close time was read, the parent having run first', (r) => num(r.parent.mainClosed)];

const NO_FALLBACK_CLAUSE = ['no fallback quit: the 3 s timer quit nothing', (r) => r.timeline.timerQuits === 0];
const orderClause = (n) => [
  `the pass’s line (${String(n)} written) before backup.after-record before the dispose before will-quit`,
  (r) => {
    const t = r.timeline;
    return t.passLine !== null && t.passLine.written === n && num(t.passLine.at) && num(t.generationRecord) && num(t.dispose) && num(t.willQuit) && t.passLine.at <= t.generationRecord && t.generationRecord <= t.dispose && t.dispose <= t.willQuit;
  }
];
const copiesClause = (n) => [`${String(n)} of ${String(n)} copies kept, no .part left, and a quit generation`, (r) => r.copies.of === n && r.copies.kept === n && r.copies.parts === 0 && r.generation.quit === true];
const SIGKILL_CLAUSE = ['ended by the will-quit SIGKILL with its storage line', (r) => r.exit.signal === 'SIGKILL' && r.log.storageLine === true];
const TRACKER_HEAD_CLAUSE = ['the tracker: no quit event and no close() of the session list', (r) => r.tracker.quitSeen === false && r.tracker.closesReached === 0];
const keepsClause = (n, { flag = true, bounds = true } = {}) => [
  `the relaunch keeps every row and id, ${String(n)} shells live, 3 of 3 keys${flag ? ', the first-quit flag' : ''}${bounds ? ' and the Settings bounds' : ''}`,
  (r) => r.relaunch.sameIds === true && r.relaunch.shellsLive === n && r.relaunch.keys === 3 && (!flag || r.relaunch.flag === '1') && (!bounds || r.relaunch.bounds === true)
];
const NO_NOTICE_CLAUSE = ['the relaunch wrote no unclean-exit record and posted no notice', (r) => r.relaunch.unclean === 0 && r.relaunch.notices === 0];
const RENDERER_AFTER_TOAST_CLAUSE = ['the event went to the main window and the renderer quit after the toast’s 1.5 s', (r) => r.timeline.requestedTo === 'main' && num(r.timeline.rendererQuit) && r.timeline.rendererQuit >= TOAST_MS - 100 && r.timeline.rendererQuit < FALLBACK_MS];
const CLOSE_CLAUSE = ['the window closed no later than 100 ms after the parent’s', (r) => num(r.timeline.mainClosed) && r.timeline.mainClosed <= r.parent.mainClosed + CLOSE_SLACK_MS];
const NOT_RELAUNCHED_CLAUSE = ['Restart quit the harness launch without relaunching it', (r) => r.log.notRelaunched === true];

const BASE_READS = ['agents.ok', 'recorder.loaded', 'recorder.hooked', 'recorder.ipcWrapped', 'world.liveShells', 'world.historyMin', 'world.created', 'world.settingsMoved', 'world.settingsClosed', 'world.flagBefore', 'press.how', 'press.ok'];
const END_READS = ['timeline.timerQuits', 'timeline.passLine', 'timeline.generationRecord', 'timeline.dispose', 'timeline.willQuit', 'timeline.passBoundHit', 'copies.read', 'copies.of', 'copies.kept', 'copies.parts', 'generation.read', 'generation.quit', 'exit.signal', 'exit.wedged', 'log.storageLine'];
const RELAUNCH_READS = ['relaunch.ran', 'relaunch.bootsLogged', 'relaunch.sameIds', 'relaunch.shellsLive', 'relaunch.keys', 'relaunch.flag', 'relaunch.bounds', 'relaunch.unclean', 'relaunch.notices'];
const TRACKER_READS = ['tracker.read', 'tracker.sessionLists', 'tracker.quitSeen', 'tracker.closesReached', 'tracker.closesAny', 'tracker.hooked'];

/** A long quit at the parent, its cut counted (M64; QT shares the press needs). */
function longParent(n, toast, { tracker = false, printedOnly = false, loops = false } = {}) {
  const reads = [...BASE_READS, 'timeline.requestedTo', 'copies.read', 'generation.read'];
  const needs = [AGENTS_NEED, RECORDER_NEED, worldNeed(n), SETTINGS_CLOSED_NEED, toastNeed(toast), MENU_PRESS_NEED, TO_MAIN_NEED, READ_NEED];
  if (loops) {
    reads.push('world.loopsWanted', 'world.loopsStarted', 'loadAtPress', 'timeline.mainClosed', 'timeline.processEnd');
    needs.push(LOAD_NEED);
  }
  if (printedOnly) return { reads, needs, clauses: [] };
  reads.push('timeline.timerFirst', 'copies.of', 'copies.kept', 'generation.quit', 'log.holdLine');
  const clauses = [
    ['the fallback’s quit came before the core’s dispose and before will-quit (timerFirst)', (r) => r.timeline.timerFirst === true],
    [`the saving was cut: fewer than ${String(n)} copies kept, or no quit generation`, (r) => r.copies.kept < r.copies.of || r.generation.quit === false]
  ];
  if (tracker) {
    reads.push(...TRACKER_READS, 'tracker.openAtQuit');
    needs.push(TRACKER_NEED);
    clauses.push(['the tracker shows the session list open at quit, never held (no hold line)', (r) => r.tracker.openAtQuit === true && r.log.holdLine === false]);
  }
  return { reads, needs, clauses };
}

/** A long quit at HEAD: no fallback quit, the saving runs to its end, the hard exit, and the relaunch keeps everything. */
function longHead(n, toast, { tracker = false, loops = false, pressNeed = MENU_PRESS_NEED, clauses: extraClauses = [] } = {}) {
  const twice = pressNeed === TWICE_NEED;
  const reads = [...BASE_READS, 'timeline.requestedTo', 'timeline.fallbackArmed', ...END_READS, ...RELAUNCH_READS, ...(twice ? ['press.second', 'timeline.beforeQuit1', 'timeline.beforeQuitCount', 'timeline.beforeQuit2'] : [])];
  const needs = [AGENTS_NEED, RECORDER_NEED, worldNeed(n), SETTINGS_CLOSED_NEED, toastNeed(toast), pressNeed, twice ? FALLBACK_TAGGED_TWICE_NEED : FALLBACK_TAGGED_NEED, TO_MAIN_NEED, READ_NEED, NOT_WEDGED_NEED, BOUND_NEED, RELAUNCH_NEED];
  const clauses = [NO_FALLBACK_CLAUSE, ...extraClauses, orderClause(n), copiesClause(n), SIGKILL_CLAUSE];
  if (tracker) {
    reads.push(...TRACKER_READS);
    needs.push(TRACKER_NEED, TRACKER_CLOSE_NEED, TRACKER_HOOKS_NEED);
    clauses.push(TRACKER_HEAD_CLAUSE);
  }
  if (loops) {
    reads.push('world.loopsWanted', 'world.loopsStarted', 'loadAtPress', 'timeline.mainClosed', 'timeline.processEnd');
    needs.push(LOAD_NEED);
    clauses.push(['the process was gone within 1 s of its window (the linger under 1 s)', (r) => num(r.timeline.mainClosed) && num(r.timeline.processEnd) && r.timeline.processEnd - r.timeline.mainClosed < LINGER_MS]);
  }
  clauses.push(keepsClause(n), NO_NOTICE_CLAUSE);
  return { reads, needs, clauses };
}

/** 357.1's quit table at 3 shells (R2, R4, R5) and with nothing opened (R6). */
function rRow(n, pressNeed, { head = false, seam = false } = {}) {
  const reads = [...BASE_READS, 'exit.signal', 'exit.wedged', 'log.storageLine', 'timeline.mainClosed'];
  const needs = [AGENTS_NEED, RECORDER_NEED, worldNeed(n), ...(n === 0 ? [] : [SETTINGS_CLOSED_NEED]), pressNeed, NOT_WEDGED_NEED];
  const clauses = [SIGKILL_CLAUSE];
  if (seam) {
    reads.push('seam.installed', 'seam.armed', 'seam.toast', 'seam.clicked', 'log.notRelaunched');
    needs.push(['the harness-only manifest fault seam armed one fault, the notice was drawn with its Restart, and Restart was pressed', (r) => r.seam.installed === true && r.seam.armed === true && r.seam.toast === true && r.seam.clicked === true]);
    clauses.push(NOT_RELAUNCHED_CLAUSE);
  }
  if (head) {
    reads.push('parent.mainClosed', ...RELAUNCH_READS);
    needs.push(PARENT_CLOSE_NEED, RELAUNCH_NEED);
    clauses.push(CLOSE_CLAUSE, keepsClause(n, { flag: false, bounds: n > 0 }), NO_NOTICE_CLAUSE);
  }
  return { reads, needs, clauses };
}

const BRIDGE_NEED = ['the bridge quit was asked of the window', (r) => r.press.how === 'bridge' && r.press.ok === true];
const CLOSE_NEED = ['the last window was closed in main, the Settings window having closed first', (r) => r.press.how === 'close' && r.press.ok === true];
const RESTART_NEED = ['the stopped notice’s Restart was clicked in the window', (r) => r.press.how === 'restart' && r.press.ok === true];

const QD_READS = ['agents.ok', 'recorder.loaded', 'recorder.hooked', 'qd.code', 'qd.dumpWritten', 'qd.sentinelAtWillQuit', 'qd.dumpNew', 'qd.standin', 'relaunch.ran', 'relaunch.bootsLogged', 'relaunch.unclean', 'relaunch.notices'];
const QD_NEEDS = (crash) => [
  AGENTS_NEED,
  SMOKE_RECORDER_NEED,
  crash
    ? ['the teardown quit ran (nothing held) and the recorder ended it with exit 139 at quit, after writing the stand-in dump', (r) => r.qd.code === 139 && r.qd.dumpWritten === true]
    : ['the teardown quit ran (nothing held) and exited 0 through Node’s teardown', (r) => r.qd.code === 0],
  ['the run sentinel was there at will-quit (the log armed it at boot)', (r) => r.qd.sentinelAtWillQuit === true],
  ...(crash ? [['the stand-in dump was new to the relaunch', (r) => r.qd.dumpNew === true]] : []),
  RELAUNCH_NEED
];

/** CM (F1's arms, ported): the crash's own state quit by the menu. */
const CM_BS3_NEED = ['a checking better-sqlite3 was named by P3571_BS3 and loaded by path (never a checkout’s node_modules)', (r) => r.cm.bs3 === true];
const CM_PLANT_NEED = ['the checker planted the crash state and no read failed before the quit', (r) => r.cm.planted === true && r.cm.readsOk === true];
const CM_TARGET_NEED = ['the checker planted the session list’s own connection or the preload’s manifest-shaped one, read from its own lines', (r) => r.cm.plantedIn === 'session-list' || r.cm.plantedIn === 'preload'];
const CM_NO_LATCH_NEED = ['the session list never stopped (no manifest.stopped record), so the crash state raised no error', (r) => r.cm.stopped === 0];
const CM_READS = ['cm.bs3', 'cm.planted', 'cm.plantedIn', 'cm.readsOk', 'cm.stopped', 'cm.segv', 'cm.crashFrame'];

export const GRADERS = {
  'M64-parent': { title: 'the parent, his long first quit (64 shells, the toast): the fallback quits before the dispose and the saving is cut', ...longParent(64, true, { tracker: true }) },
  'M64-head': { title: 'HEAD, his long first quit: no fallback quit, the saving runs to its end, the will-quit SIGKILL, and the relaunch keeps everything', ...longHead(64, true, { tracker: true }) },
  'M64n-parent': { title: 'the parent, his everyday long quit (no toast): printed, cut or not, with its copies', ...longParent(64, false, { printedOnly: true }) },
  'M64n-head': { title: 'HEAD, his everyday long quit: as M64', ...longHead(64, false) },
  'M64L-parent': { title: 'the parent, his long first quit on a busy Mac: printed, with the process’s linger after its window', ...longParent(64, true, { printedOnly: true, loops: true }) },
  'M64L-head': { title: 'HEAD, his long first quit on a busy Mac: as M64 within its own bounds, gone within 1 s of its window', ...longHead(64, true, { tracker: true, loops: true }) },
  'M48-parent': { title: 'the parent, his first quit at 48 shells: printed', ...longParent(48, true, { printedOnly: true }) },
  'M48-head': { title: 'HEAD, his first quit at 48 shells: as M64 for 48', ...longHead(48, true) },
  'QS-parent': {
    title: 'the parent, ⌘Q with Settings in front: no renderer quit, the fallback’s first pass at 3 s, the flag never written',
    reads: [...BASE_READS, 'press.newest', 'timeline.rendererQuit', 'timeline.timerQuit', 'timeline.firstPassBy', 'relaunch.ran', 'relaunch.bootsLogged', 'relaunch.flag'],
    needs: [AGENTS_NEED, RECORDER_NEED, worldNeed(8), SETTINGS_OPEN_NEED, toastNeed(true), MENU_PRESS_NEED, RELAUNCH_NEED],
    clauses: [
      ['no renderer quit', (r) => r.timeline.rendererQuit === null],
      ['the fallback’s quit at 3,000 ± 100 ms is the first pass', firstPassByTimerAt3s],
      ['the first-quit flag was never written', (r) => r.relaunch.flag === null]
    ]
  },
  'QS-head': {
    title: 'HEAD, ⌘Q with Settings in front: the event reaches the main window, its toast and quit, no fallback quit, and the quit’s end as M64',
    reads: [...BASE_READS, 'press.newest', 'timeline.requestedTo', 'timeline.rendererQuit', 'timeline.fallbackArmed', ...END_READS, ...RELAUNCH_READS],
    needs: [AGENTS_NEED, RECORDER_NEED, worldNeed(8), SETTINGS_OPEN_NEED, toastNeed(true), MENU_PRESS_NEED, FALLBACK_TAGGED_NEED, READ_NEED, NOT_WEDGED_NEED, BOUND_NEED, RELAUNCH_NEED],
    clauses: [
      ['the menu’s event went to the main window, not to Settings', (r) => r.timeline.requestedTo === 'main'],
      ['the renderer quit after the toast’s 1.5 s, and the first-quit flag was written', (r) => num(r.timeline.rendererQuit) && r.timeline.rendererQuit >= TOAST_MS - 100 && r.timeline.rendererQuit < FALLBACK_MS && r.relaunch.flag === '1'],
      NO_FALLBACK_CLAUSE,
      orderClause(8),
      copiesClause(8),
      SIGKILL_CLAUSE,
      keepsClause(8, { flag: false }),
      NO_NOTICE_CLAUSE
    ]
  },
  ...Object.fromEntries(
    ['parent', 'head'].map((build) => [
      `QR-${build}`,
      {
        title: `${build === 'parent' ? 'the parent' : 'HEAD'}, a renderer that never answers: the fallback’s quit at 3 s is the first pass, and the quit ends`,
        reads: ['agents.ok', 'recorder.loaded', 'recorder.hooked', 'recorder.ipcWrapped', 'world.liveShells', 'world.historyMin', 'world.created', 'world.settingsMoved', 'world.settingsClosed', 'press.how', 'press.ok', 'qr.paused', 'qr.pausedAt', 'timeline.timerQuit', 'timeline.firstPassBy', 'timeline.rendererQuit', 'exit.ended'],
        needs: [
          AGENTS_NEED,
          RECORDER_NEED,
          worldNeed(8),
          SETTINGS_CLOSED_NEED,
          MENU_PRESS_NEED,
          ['the main renderer was paused through the debugger before the fallback could fire', (r) => r.qr.paused === true && num(r.qr.pausedAt) && r.qr.pausedAt < FALLBACK_MS - FALLBACK_SLACK_MS]
        ],
        clauses: [
          ['the fallback’s quit at 3,000 ± 100 ms is the first pass, and no renderer quit came before it', (r) => firstPassByTimerAt3s(r) && (r.timeline.rendererQuit === null || r.timeline.rendererQuit > r.timeline.timerQuit)],
          ['the quit ended', (r) => r.exit.ended === true]
        ]
      }
    ])
  ),
  'QT-parent': {
    title: 'the parent, ⌘Q twice on his long quit: the first fallback cuts the saving at 3 s',
    reads: [...BASE_READS, 'press.second', 'timeline.beforeQuit1', 'timeline.willQuit', 'timeline.requestedTo', 'timeline.timerQuit', 'timeline.timerFirst'],
    needs: [AGENTS_NEED, RECORDER_NEED, worldNeed(64), SETTINGS_CLOSED_NEED, toastNeed(true), TWICE_NEED, TO_MAIN_NEED],
    clauses: [['the first fallback cut at 3,000 ± 100 ms, before the dispose and before will-quit', (r) => r.timeline.timerFirst === true && num(r.timeline.timerQuit) && Math.abs(r.timeline.timerQuit - FALLBACK_MS) <= FALLBACK_SLACK_MS]]
  },
  'QT-head': {
    title: 'HEAD, ⌘Q twice on his long quit: no fallback quit at all, one disposer, and the quit’s end as M64',
    ...longHead(64, true, {
      tracker: true,
      pressNeed: TWICE_NEED,
      clauses: [['one disposer: two before-quit passes, the second the disposer’s own end after the dispose', (r) => r.timeline.beforeQuitCount === 2 && num(r.timeline.beforeQuit2) && num(r.timeline.dispose) && r.timeline.beforeQuit2 >= r.timeline.dispose]]
    })
  },
  'QY-parent': {
    title: 'the parent, the status item’s Quit (8 shells): as the menu’s Quit',
    reads: [...BASE_READS, 'qy.wrapTook', 'qy.quitRow', 'timeline.requestedTo', 'timeline.rendererQuit', 'exit.signal', 'exit.wedged', 'log.storageLine'],
    needs: [
      AGENTS_NEED,
      RECORDER_NEED,
      worldNeed(8),
      SETTINGS_CLOSED_NEED,
      toastNeed(true),
      ['the status item’s menu was kept by the wrap and its Quit row clicked in main', (r) => r.qy.wrapTook === true && r.qy.quitRow === true && r.press.how === 'tray' && r.press.ok === true],
      NOT_WEDGED_NEED
    ],
    clauses: [RENDERER_AFTER_TOAST_CLAUSE, SIGKILL_CLAUSE]
  },
  'QY-head': {
    title: 'HEAD, the status item’s Quit (8 shells): as the menu’s Quit',
    reads: [...BASE_READS, 'qy.wrapTook', 'qy.quitRow', 'timeline.requestedTo', 'timeline.rendererQuit', 'timeline.fallbackArmed', ...END_READS, ...RELAUNCH_READS],
    needs: [
      AGENTS_NEED,
      RECORDER_NEED,
      worldNeed(8),
      SETTINGS_CLOSED_NEED,
      toastNeed(true),
      ['the status item’s menu was kept by the wrap and its Quit row clicked in main', (r) => r.qy.wrapTook === true && r.qy.quitRow === true && r.press.how === 'tray' && r.press.ok === true],
      FALLBACK_TAGGED_NEED,
      READ_NEED,
      NOT_WEDGED_NEED,
      BOUND_NEED,
      RELAUNCH_NEED
    ],
    clauses: [RENDERER_AFTER_TOAST_CLAUSE, NO_FALLBACK_CLAUSE, orderClause(8), copiesClause(8), SIGKILL_CLAUSE, keepsClause(8), NO_NOTICE_CLAUSE]
  },
  ...Object.fromEntries(
    ['parent', 'head'].map((build) => [
      `QW-${build}`,
      {
        title: build === 'parent' ? 'the parent, Settings…, activate and open-file during the saving: printed, whether a window opened into the quitting app' : 'HEAD, Settings…, activate and open-file during the saving: no new window of either kind, the main window’s count unchanged',
        reads: [...BASE_READS, 'timeline.requestedTo', 'qw.armed', 'qw.clicked', 'qw.activated', 'qw.openFile', 'qw.during', 'qw.created', 'qw.before', 'qw.after', 'qw.countedBeforeClose'],
        needs: [
          AGENTS_NEED,
          RECORDER_NEED,
          worldNeed(64),
          SETTINGS_CLOSED_NEED,
          toastNeed(true),
          MENU_PRESS_NEED,
          TO_MAIN_NEED,
          // THE PROBE REVIEW: the counts are numbers, and the after-count was
          // taken while the main window still stood; a count that is missing
          // read `undefined === undefined` as unchanged, and one taken after
          // the quit closed the window read as a window lost.
          [
            'the Settings… row was clicked and activate and open-file emitted while the quit was saving, and the windows were counted around them, the second count while the main window still stood',
            (r) =>
              r.qw.armed === true &&
              r.qw.clicked === true &&
              r.qw.activated === true &&
              r.qw.openFile === true &&
              r.qw.during === true &&
              r.qw.before !== null &&
              r.qw.after !== null &&
              num(r.qw.before.main) &&
              num(r.qw.after.main) &&
              r.qw.countedBeforeClose === true
          ]
        ],
        clauses:
          build === 'parent'
            ? []
            : [
                ['no new window of either kind while the quit ran', (r) => r.qw.created === 0],
                ['the main window’s count unchanged', (r) => r.qw.before.main === r.qw.after.main]
              ]
      }
    ])
  ),
  'QD-parent': {
    title: 'the parent, a crash in Node’s teardown (exit 139 with a stand-in dump at quit): the next launch says nothing',
    reads: QD_READS,
    needs: QD_NEEDS(true),
    clauses: [['the relaunch wrote no boot.unclean_exit and posted no notice although the dump is new', (r) => r.relaunch.unclean === 0 && r.relaunch.notices === 0]]
  },
  'QD-head': {
    title: 'HEAD, a crash in Node’s teardown: the next launch records it, naming the dump and the quit’s time, and says so once',
    reads: [...QD_READS, 'relaunch.uncleanFirst'],
    needs: QD_NEEDS(true),
    clauses: [
      ['one boot.unclean_exit naming one new dump, the stand-in, and quitAt', (r) => r.relaunch.unclean === 1 && r.relaunch.uncleanFirst !== null && r.relaunch.uncleanFirst.newCount === 1 && r.relaunch.uncleanFirst.names.includes(r.qd.standin) && typeof r.relaunch.uncleanFirst.quitAt === 'string'],
      ['the unclean-exit notice posted once', (r) => r.relaunch.notices === 1]
    ]
  },
  'QD0-parent': {
    title: 'the parent, a clean teardown quit: no record and no notice',
    reads: QD_READS.filter((p) => p !== 'qd.dumpWritten' && p !== 'qd.dumpNew'),
    needs: QD_NEEDS(false),
    clauses: [['no unclean-exit record and no notice', (r) => r.relaunch.unclean === 0 && r.relaunch.notices === 0]]
  },
  'QD0-head': {
    title: 'HEAD, a clean teardown quit: no record and no notice, the run sentinel left marked',
    reads: [...QD_READS.filter((p) => p !== 'qd.dumpWritten' && p !== 'qd.dumpNew'), 'qd.sentinelLeft', 'qd.sentinelQuitAt'],
    needs: QD_NEEDS(false),
    clauses: [
      ['no unclean-exit record and no notice', (r) => r.relaunch.unclean === 0 && r.relaunch.notices === 0],
      ['the run sentinel was left marked with the quit’s time', (r) => r.qd.sentinelLeft === true && typeof r.qd.sentinelQuitAt === 'string']
    ]
  },
  'R2-parent': { title: 'the parent, the bridge quit (3 shells): the will-quit SIGKILL with its storage line', ...rRow(3, BRIDGE_NEED) },
  'R2-head': { title: 'HEAD, the bridge quit: the same, the window’s close time beside the parent’s, nothing a person keeps lost', ...rRow(3, BRIDGE_NEED, { head: true }) },
  'R4-parent': { title: 'the parent, the last window closed (3 shells): the will-quit SIGKILL with its storage line', ...rRow(3, CLOSE_NEED) },
  'R4-head': { title: 'HEAD, the last window closed: the same, the window’s close time beside the parent’s, nothing a person keeps lost', ...rRow(3, CLOSE_NEED, { head: true }) },
  'R5-parent': { title: 'the parent, Restart on the stopped notice (3 shells): not relaunched, the will-quit SIGKILL with its storage line', ...rRow(3, RESTART_NEED, { seam: true }) },
  'R5-head': { title: 'HEAD, Restart on the stopped notice: the same, the window’s close time beside the parent’s, nothing a person keeps lost', ...rRow(3, RESTART_NEED, { head: true, seam: true }) },
  'R6-parent': { title: 'the parent, a quit with nothing opened: the will-quit SIGKILL with its storage line', ...rRow(0, BRIDGE_NEED) },
  'R6-head': { title: 'HEAD, a quit with nothing opened: the same, the window’s close time beside the parent’s, nothing a person keeps lost', ...rRow(0, BRIDGE_NEED, { head: true }) },
  'TX-parent': {
    title: 'the session list connection on the parent’s cut: open at quit and at exit, never closed by Tortie',
    reads: ['tracker.read', 'tracker.sessionLists', 'tracker.quitSeen', 'tracker.openAtQuit', 'tracker.exitSeen', 'tracker.openAtExit', 'tracker.closesReached', 'tracker.closesAny', 'tracker.hooked'],
    needs: [TRACKER_NEED, TRACKER_CLOSE_NEED, TRACKER_HOOKS_NEED],
    clauses: [
      ['open at quit and at the process’s exit, where Node’s teardown closes it', (r) => r.tracker.openAtQuit === true && r.tracker.openAtExit === true],
      ['never closed by Tortie: no close() reached better-sqlite3 for it', (r) => r.tracker.closesReached === 0]
    ]
  },
  'TX-head': {
    title: 'the session list connection at HEAD: held by dispose, open at will-quit, and no quit or exit before the SIGKILL',
    reads: ['tracker.read', 'tracker.sessionLists', 'tracker.willQuitSeen', 'tracker.openAtWillQuit', 'tracker.quitSeen', 'tracker.exitSeen', 'tracker.closesReached', 'tracker.closesAny', 'log.holdLine'],
    needs: [TRACKER_NEED, TRACKER_CLOSE_NEED, TRACKER_WILLQUIT_NEED],
    clauses: [
      ['held by dispose: the store said it held the connection, and no close() reached better-sqlite3', (r) => r.log.holdLine === true && r.tracker.closesReached === 0],
      ['open at will-quit', (r) => r.tracker.openAtWillQuit === true],
      ['no quit or exit event before the SIGKILL', (r) => r.tracker.quitSeen === false && r.tracker.exitSeen === false]
    ]
  },
  'CM-parent': {
    title: 'the parent, the crash’s own state quit by the menu: the fallback reaches will-quit before the dispose, and Node’s teardown crashes in pcache1EnforceMaxPage',
    reads: [...BASE_READS, ...CM_READS, 'timeline.requestedTo', 'timeline.timerFirst', 'exit.code', 'exit.wedged'],
    needs: [CM_BS3_NEED, AGENTS_NEED, RECORDER_NEED, CM_PLANT_NEED, CM_TARGET_NEED, CM_NO_LATCH_NEED, NOT_WEDGED_NEED, worldNeed(64), SETTINGS_CLOSED_NEED, MENU_PRESS_NEED, TO_MAIN_NEED, ['the menu’s 3 s fallback quit reached will-quit before the core’s dispose (the race this arm exists for)', (r) => r.timeline.timerFirst === true]],
    clauses: [
      ['the quit faulted with SIGSEGV in pcache1EnforceMaxPage reading through 0x34 (the checker’s own report)', (r) => r.cm.segv === true && r.cm.crashFrame === true],
      ['the faulting process exited 139, not cleanly', (r) => r.exit.code === 139]
    ]
  },
  'CM-head': {
    title: 'HEAD, the crash’s own state quit by the menu: the dispose before will-quit, no crash, the will-quit SIGKILL, and the relaunch keeps everything',
    reads: [...BASE_READS, ...CM_READS, 'timeline.requestedTo', 'timeline.timerFirst', 'timeline.dispose', 'timeline.willQuit', 'exit.signal', 'exit.wedged', 'world.listedBefore', ...RELAUNCH_READS],
    needs: [CM_BS3_NEED, AGENTS_NEED, RECORDER_NEED, CM_PLANT_NEED, CM_TARGET_NEED, CM_NO_LATCH_NEED, NOT_WEDGED_NEED, worldNeed(64), SETTINGS_CLOSED_NEED, MENU_PRESS_NEED, TO_MAIN_NEED, ['the window listed the sessions before the quit', (r) => num(r.world.listedBefore) && r.world.listedBefore > 0], RELAUNCH_NEED],
    clauses: [
      ['the dispose came before will-quit, so the fallback never raced it (F1’s race need, inverted for HEAD)', (r) => r.timeline.timerFirst === false && num(r.timeline.dispose) && num(r.timeline.willQuit) && r.timeline.dispose <= r.timeline.willQuit],
      ['the quit did NOT crash: no SIGSEGV, and the will-quit SIGKILL ended it', (r) => r.cm.segv === false && r.exit.signal === 'SIGKILL'],
      NO_NOTICE_CLAUSE,
      ['the relaunch listed every session listed before the quit, his 64 shells live among them', (r) => r.relaunch.sameIds === true && r.relaunch.shellsLive === 64],
      ['localStorage survived, 3 of 3', (r) => r.relaunch.keys === 3],
      ['the Settings window’s bounds, saved as it closed before the press, survived the hard exit', (r) => r.relaunch.bounds === true]
    ]
  },
  RUN: {
    title: 'the preflights held, the hidden agents held, the census held, every pid ended, the scratch server gone, his history unmoved, no macOS report of the run',
    reads: ['tailscalePreflights', 'realTailscale', 'dnsPreflights', 'agentsHeld', 'censusFailures', 'serverRead', 'serverGone', 'socketsRead', 'socketsLeft', 'processTableRead', 'electronsLeft', 'loopsLeft', 'reportsRead', 'newReports', 'history.before', 'history.after'],
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
      ['the scratch tmux server is gone and no server answers on this run’s socket (its file is the harness’s to unlink)', (r) => r.serverGone === true && r.socketsLeft === 0],
      ['every Electron this run started is gone', (r) => r.electronsLeft === 0],
      ['every busy loop this run started is gone', (r) => r.loopsLeft === 0],
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
// --grader-self-test: every grader and the one reader on build/p362/fixtures/
// ---------------------------------------------------------------------------

export const FIXTURES_DIR = join(ROOT, 'build', 'p362', 'fixtures');
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

/**
 * One raw fixture's raw input: its folder's recorded files (events.jsonl,
 * fault-trace.tsv, app.log, tracker.jsonl), each read only when the fixture
 * names it, plus the folder's bundle.json (the parts that were not files: the
 * shim's output and code, the snapshot folder's listing, the backup index,
 * and any constructed lines, each marked so in that file).
 */
export function rawOf(dir, parts) {
  const base = join(FIXTURES_DIR, 'raw', dir);
  const lines = (name) => readFileSync(join(base, name), 'utf8').split('\n');
  let bundle = {};
  try {
    bundle = JSON.parse(readFileSync(join(base, 'bundle.json'), 'utf8'));
  } catch {
    bundle = {};
  }
  const want = new Set(parts ?? []);
  const raw = {};
  if (want.has('events')) raw.events = [...lines('events.jsonl'), ...(bundle.addEvents ?? []).map((e) => J(e))];
  if (want.has('trace')) raw.trace = lines('fault-trace.tsv');
  if (want.has('appLog')) raw.appLog = [...lines('app.log'), ...(bundle.addAppLog ?? []).map((e) => J(e))];
  if (want.has('tracker')) raw.tracker = bundle.tracker ?? lines('tracker.jsonl');
  for (const k of ['exitAt', 'press', 'shim', 'snapshots', 'liveIds', 'backups', 'manifest', 'sentinelAfter', 'dumpsBefore', 'dumpsAfter', 'standin', 'world', 'relaunch', 'cm']) {
    if (want.has(k) && bundle[k] !== undefined) raw[k] = bundle[k];
  }
  return raw;
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
    process.stdout.write('[p362] grader self-test FAIL.\n');
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
  // The busy loop's literal (startLoops) carries the mark the finally reads before its signal.
  say(readFileSync(HERE, 'utf8').includes(`'-e', 'const e = ${LOOP_MARK}; let x = 0; while (Date.now() < e) x += 1;'`), `the busy loop's spawn carries its mark (${LOOP_MARK}), so endLoops and RUN can read its pid again`);
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
  // 3b. Every variant of an honest reading that must still pass (a shape a grader must not mistake for a failure).
  for (const c of variants) judge({ ...c, expect: 'pass' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 4. Every raw fixture, through THE ONE READER, laid over its grader's honest reading.
  for (const c of raw) judge(c, () => applyOps(overlay(honest[c.arm], derive(rawOf(c.dir, c.parts))), c.ops ?? []));
  // 5. The one reader's own numbers over the recorded raw, against what the spec step's tables say.
  for (const c of reads) {
    let got;
    try {
      got = derive(rawOf(c.dir, c.parts));
    } catch (err) {
      say(false, `the reader over ${c.dir} threw: ${String(err?.message ?? err)}`);
      continue;
    }
    const wrong = Object.entries(c.expect ?? {}).filter(([path, want]) => {
      const { o, k } = (() => {
        try {
          return at(got, path);
        } catch {
          return { o: {}, k: '' };
        }
      })();
      return J(o?.[k]) !== J(want);
    });
    say(wrong.length === 0, `the reader over ${c.dir} (${c.name}) reads ${String(Object.keys(c.expect ?? {}).length)} values as recorded${wrong.length === 0 ? '' : `: wrong ${J(wrong.map(([p, w]) => ({ path: p, want: w, got: (() => { try { const { o, k } = at(got, p); return o?.[k]; } catch { return undefined; } })() })))}`}`);
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
      ? `[p362] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses each shown red alone, ${String(needs)} needs each shown unreadable alone, ${String(swept)} fields that answer UNREADABLE when missing, ${String(variants.length)} variants that still pass, ${String(raw.length)} raw fixtures graded and ${String(reads.length)} read through the one reader.\n`
      : `[p362] grader self-test FAIL: ${String(failures)}.\n`
  );
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
// Every grader's reads, needs and clauses by name, as JSON: what a fixture may name. Starts nothing.
if (process.argv.includes('--list-graders')) {
  process.stdout.write(`${J(Object.fromEntries(Object.entries(GRADERS).map(([id, g]) => [id, { title: g.title, reads: g.reads, needs: g.needs.map(([n]) => n), clauses: g.clauses.map(([n]) => n) }])), null, 1)}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// --preflight
// ---------------------------------------------------------------------------

const PARENT = (process.env['P362_PARENT_CHECKOUT'] ?? '').trim();

/** The newest modification time under `dir` of a file `test` accepts, or 0. */
function newestUnder(dir, test) {
  let newest = 0;
  const walk = (at) => {
    let entries = [];
    try {
      entries = readdirSync(at, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(at, e.name);
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

/**
 * Each check the run makes before it starts anything, as `{ ok, said, info }`:
 * `said` is the check's own words when it holds and what is wrong when it does
 * not. An `info` check is printed and never refuses the run (CM without a
 * checking build reads UNREADABLE, the rest of the run goes on).
 */
function preflightChecks() {
  const out = [];
  const check = (ok, yes, no, info = false) => out.push({ ok, said: ok ? yes : no, info });
  const bundle = (checkout) => join(checkout, 'out', 'main', 'index.js');
  const textOf = (f) => {
    try {
      return readFileSync(f, 'utf8');
    } catch {
      return '';
    }
  };
  if (PARENT === '') check(false, '', `P362_PARENT_CHECKOUT is not set. Every arm runs at the parent first (${PARENT_SNAPSHOT}, Phase 357.1 as landed, built)`);
  else {
    const parent = resolve(PARENT);
    check(existsSync(bundle(parent)), `the parent ${parent} is built`, `${bundle(parent)} is missing: build the parent checkout first`);
    check(textOf(bundle(parent)).includes('smoke === "quit-teardown"'), 'the parent dispatches GMUX_SMOKE=quit-teardown (QD, QD0)', `the parent's bundle has no GMUX_SMOKE=quit-teardown, so QD and QD0 cannot run there (is it ${PARENT_SNAPSHOT}?)`);
    check(existsSync(join(parent, 'build', 'vendor', 'tmux', 'bin', 'tmux')), 'the parent carries its vendored tmux', `the parent has no build/vendor/tmux/bin/tmux: copy build/vendor into it with cp -Rc`);
  }
  const head = bundle(ROOT);
  check(existsSync(head), 'HEAD is built', `${head} is missing: npm run build first`);
  if (existsSync(head)) {
    const built = statSync(head).mtimeMs;
    const src = Math.max(newestUnder(join(ROOT, 'src', 'main'), (n) => n.endsWith('.ts')), newestUnder(join(ROOT, 'src', 'shared'), (n) => n.endsWith('.ts')), newestUnder(join(ROOT, 'src', 'preload'), (n) => n.endsWith('.ts')));
    check(built >= src, 'HEAD’s out/main/index.js is newer than every file under src/main, src/shared and src/preload, so the run measures this tree', 'HEAD’s out/main/index.js is older than a file under src/main, src/shared or src/preload: npm run build again, or the run measures a tree that is gone');
    check(textOf(head).includes('smoke === "quit-teardown"'), 'HEAD dispatches GMUX_SMOKE=quit-teardown (QD, QD0)', 'HEAD’s bundle has no GMUX_SMOKE=quit-teardown, so QD and QD0 cannot run');
  }
  for (const f of ['build/p3167/seed-sessions.mts', 'build/p330/tailscale-standin.mjs', 'build/p332/dns-standin.mjs', 'build/hidden-agents.mjs', 'build/electron-run.mjs', 'build/vendor/tmux/bin/tmux']) check(existsSync(join(ROOT, f)), `${f} is here`, `${f} is missing`);
  const bs3 = (process.env['P3571_BS3'] ?? '').trim();
  const cmAsked = (process.env['P362_ARMS'] ?? '').split(',').map((x) => x.trim()).includes('CM');
  if (cmAsked) check(checkingBs3Ok(bs3), `P3571_BS3 names a built checking better-sqlite3 for CM (${bs3})`, `P3571_BS3 is ${bs3 === '' ? 'not set' : `${bs3}, which holds no build/Release/better_sqlite3.node and lib/index.js`}, so CM-parent and CM-head will read UNREADABLE (the rest of the run goes on)`, true);
  return out;
}

/** A built checking better-sqlite3 directory: its JS entry and its native module. */
function checkingBs3Ok(dir) {
  return typeof dir === 'string' && dir !== '' && existsSync(join(dir, 'build', 'Release', 'better_sqlite3.node')) && existsSync(join(dir, 'lib', 'index.js'));
}

if (process.argv.includes('--preflight')) {
  const checks = preflightChecks();
  for (const c of checks) process.stdout.write(`[p362] ${c.ok ? 'ok     ' : c.info ? 'NOTE   ' : 'REFUSED'} ${c.said}\n`);
  const bad = checks.filter((c) => !c.ok && !c.info).length;
  process.stdout.write(bad === 0 ? `[p362] preflight PASS: ${String(checks.length)} checks\n` : `[p362] preflight REFUSED: ${String(bad)} of ${String(checks.length)} checks\n`);
  process.exit(bad === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The run: the refusals, the scratch world
// ---------------------------------------------------------------------------

const TAG = '[p362]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '' || !SOCKET.startsWith('gmux-p362')) refuse(`"${SOCKET}" is not a gmux-p362 harness socket. Run \`npm run probe:p362\`, which wraps this file in build/harness-socket.mjs.`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
{
  const bad = preflightChecks().filter((c) => !c.ok && !c.info);
  if (bad.length > 0) refuse(bad.map((c) => c.said).join('; '));
}

const KEEP = (process.env['P362_KEEP'] ?? '') === '1';
const LOOPS = Number.parseInt(process.env['P362_LOOPS'] ?? '', 10) > 0 ? Number.parseInt(process.env['P362_LOOPS'], 10) : DEFAULT_LOOPS;
const ARMS = ((process.env['P362_ARMS'] ?? '').trim() === '' ? [...DEFAULT_ARMS] : (process.env['P362_ARMS'] ?? '').split(',').map((x) => x.trim()).filter((x) => x !== ''));
for (const a of ARMS) if (ARM_SPECS[a] === undefined) refuse(`P362_ARMS names ${J(a)}, which is no arm (${Object.keys(ARM_SPECS).join(', ')})`);
const PARENT_DIR = resolve(PARENT);
const BS3 = (process.env['P3571_BS3'] ?? '').trim();

mkdirSync(join(HARNESS_DIR, 'p362'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p362'));
const OUT = (process.env['P362_OUT_DIR'] ?? '').trim() || join(ROOT, 'out', 'p362');
/** The vendored tmux the development app runs (3.7b), so its client and server agree. */
const TMUX = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
/** The fill each shell runs: 12,000 coloured lines, wrapped at the detached width. */
const FILL_COMMAND = `for i in $(seq 1 ${String(FILL)}); do printf '\\033[3%dm%06d %s\\033[0m\\n' $((i%7)) $i abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz; done`;

const report = { checkout: ROOT, parent: PARENT_DIR, socket: SOCKET, arms: [], readings: {}, printed: {} };
let failures = 0;
let unreadable = 0;
function cannotRead(id, why) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  say(`UNREADABLE ${id}: ${why}`);
}
function arm(id, reading, host = null) {
  const key = host === null ? id : `${id}@${host}`;
  report.readings[key] = reading;
  const g = grade(id, reading);
  if (g.verdict === 'unreadable') {
    cannotRead(key, `${GRADERS[id].title}; could not read ${J(g.missing)}`);
    return g;
  }
  report.arms.push({ id: key, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
  if (!g.ok) failures += 1;
  say(`${g.ok ? 'PASS' : 'FAIL'} ${key}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
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
const loopPids = new Set();

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
/**
 * THE FIX ROUND (lens 2): his history is read once a second for the whole run
 * (its size and time, never a byte of it), so a move is reported with the time
 * it came and what the run was doing then (`history.moves`). His rule is
 * unchanged and RUN still grades it: a move across the run is waited on for
 * HISTORY_QUIET_MS with nothing running, moved again is his, and still moved
 * FAILS (stop and report). The times are for whoever reads that report.
 */
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
  if (!SOCKET.startsWith('gmux-p362')) throw new Error('refusing a socket that is not this run');
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

/** M64L's busy loops, started a second before the press. Each ends itself after LOOP_SECONDS (15 s, LOOP_MARK's literal). */
function startLoops(loops, count) {
  for (let i = 0; i < count; i += 1) {
    const loop = spawn(process.execPath, ['-e', 'const e = Date.now() + 15000; let x = 0; while (Date.now() < e) x += 1;'], { stdio: 'ignore' });
    loops.push(loop);
    if (Number.isInteger(loop.pid)) loopPids.add(loop.pid);
  }
}
/** End every loop of this arm that still runs, by pid, after reading its command line again. */
function endLoops(loops) {
  for (const loop of loops) {
    try {
      if (loop.exitCode === null && loop.signalCode === null && commandOf(loop.pid).includes(LOOP_MARK)) loop.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

// ---------------------------------------------------------------------------
// The two scratch preloads (never a file under src/)
// ---------------------------------------------------------------------------

/** The session list tracker (D11). Installed AT ONCE: Module._load is wrapped before the bundle first requires better-sqlite3. */
const TRACKER = `'use strict';
// Phase 362's session list tracker (build/p362/SPEC.md D11). SCRATCH ONLY. Generated by
// build/p362/probe-p362.mjs and loaded by NODE_OPTIONS into MAIN of a harness launch.
// It records every better-sqlite3 connection, every close() that reaches one, and which
// are open at will-quit, at quit and at the process's exit. It changes nothing Tortie
// decides; with P362_BS3 set (CM only) it loads that checking build by path instead.
if (process.type !== 'browser') return;
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const OUT = process.env.P362_TRACKER;
const BS3 = process.env.P362_BS3 || '';
const BS3_ENTRY = BS3 === '' ? '' : path.join(BS3, 'lib', 'index.js');
const BS3_NATIVE = BS3 === '' ? '' : path.join(BS3, 'build', 'Release', 'better_sqlite3.node');
const write = (o) => { try { fs.appendFileSync(OUT, JSON.stringify(Object.assign({ t: Date.now() }, o)) + '\\n'); } catch { /* never break the app */ } };
const frames = (stack) => String(stack).split('\\n').slice(1).map((l) => l.trim().replace(/^at /, '').replace(/ \\(.*\\)$/, '')).slice(0, 16);
const conns = [];
const wrapped = new Map();
const wrap = (Database) => {
  if (typeof Database !== 'function') return Database;
  if (wrapped.has(Database)) return wrapped.get(Database);
  const origClose = Database.prototype.close;
  Database.prototype.close = function p362Close() {
    const c = conns.find((x) => x.db === this);
    if (c) write({ ev: 'close', id: c.id, open: this.open === true, stack: frames(new Error().stack) });
    return origClose.apply(this, arguments);
  };
  const argsFor = (args) => {
    if (BS3_NATIVE === '') return args;
    const opts = args[1] && typeof args[1] === 'object' ? args[1] : {};
    return 'nativeBinding' in opts ? args : [args[0], Object.assign({}, opts, { nativeBinding: BS3_NATIVE })];
  };
  const note = (db, args) => {
    const given = typeof args[0] === 'string' ? args[0] : '';
    const file = given === '' || given === ':memory:' ? given : path.resolve(given);
    const opts = args[1] && typeof args[1] === 'object' ? args[1] : {};
    const id = conns.length + 1;
    conns.push({ id, db });
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 30;
    const stack = frames(new Error().stack);
    Error.stackTraceLimit = limit;
    write({ ev: 'open', id, file, readonly: opts.readonly === true, stack });
  };
  const P = new Proxy(Database, {
    construct(target, args) { const a = argsFor(args); const db = Reflect.construct(target, a); note(db, a); return db; },
    apply(target, _self, args) { const a = argsFor(args); const db = Reflect.construct(target, a); note(db, a); return db; }
  });
  wrapped.set(Database, P);
  return P;
};
const state = (at) => write({ ev: 'state', at, open: conns.map((c) => { let open = null; try { open = c.db.open === true; } catch { open = null; } return { id: c.id, open }; }) });
const origLoad = Module._load;
Module._load = function p362Load(request, parent, isMain) {
  if (request === 'better-sqlite3') return wrap(BS3_ENTRY !== '' ? origLoad.call(this, BS3_ENTRY, parent, isMain) : origLoad.apply(this, arguments));
  return origLoad.apply(this, arguments);
};
process.on('exit', () => state('exit'));
setImmediate(() => {
  let app;
  try { app = require('electron').app; } catch { write({ ev: 'state-hook-failed' }); return; }
  app.prependListener('will-quit', () => state('will-quit'));
  app.prependListener('quit', () => state('quit'));
  // The probe review: said once both listeners are in, so "no quit event" is read off hooks
  // that took, whether or not the quit ever reached will-quit.
  write({ ev: 'state-hooked' });
});
write({ ev: 'installed', pid: process.pid, bs3: BS3 !== '' });
`;

/** The quit recorder. Everything that needs the app's own objects is installed from setImmediate. */
const RECORDER = `'use strict';
// Phase 362's quit recorder. SCRATCH ONLY. Generated by build/p362/probe-p362.mjs and loaded by
// NODE_OPTIONS into MAIN of a harness launch. It records the quit with appendFileSync (on disk
// before any SIGKILL) and presses what the probe asks through its trigger file; it changes
// nothing Tortie decides.
if (process.type !== 'browser') return;
const fs = require('node:fs');
const path = require('node:path');
const OUT = process.env.P362_EVENTS;
const TRIGGER = process.env.P362_TRIGGER || '';
const SENTINEL = process.env.P362_SENTINEL || '';
const OPEN_FOLDER = process.env.P362_OPEN_FOLDER || '';
const CRASH = process.env.P362_CRASH_AT_QUIT === '1';
const STANDIN = ${J(STANDIN_DUMP)};
const STANDIN_BYTES = ${String(STANDIN_DUMP_BYTES)};
const FALLBACK_MS = ${String(FALLBACK_MS)};
const QW_DELAY_MS = ${String(QW_DELAY_MS)};
const write = (o) => { try { fs.appendFileSync(OUT, JSON.stringify(Object.assign({ t: Date.now() }, o)) + '\\n'); } catch { /* never break the app */ } };
const sentinelNow = () => { let text = null; try { text = fs.readFileSync(SENTINEL, 'utf8'); } catch { return { sentinel: false, quitAt: null }; } try { const o = JSON.parse(text); return { sentinel: true, quitAt: typeof o.quitAt === 'string' ? o.quitAt : null }; } catch { return { sentinel: true, quitAt: null }; } };
let fallbackDepth = 0;
let inIpc = null;
const fromOf = (stack) => {
  if (fallbackDepth > 0) return 'timer';
  if (inIpc === 'app:quit') return 'ipc';
  if (inIpc === 'app:relaunch') return 'relaunch';
  return /listOnTimeout|processTimers/.test(String(stack)) ? 'timer-other' : 'other';
};
process.on('exit', (code) => write({ ev: 'process-exit', code }));
write({ ev: 'loaded', pid: process.pid });
setImmediate(() => {
  let electron;
  try { electron = require('electron'); } catch (err) { write({ ev: 'hook-failed', why: String(err && err.message).slice(0, 200) }); return; }
  const { app, BrowserWindow, Menu, Tray, ipcMain } = electron;
  try {
    const http = require('node:http');
    const orig = http.Server.prototype.closeIdleConnections;
    if (typeof orig === 'function') http.Server.prototype.closeIdleConnections = function p362Dispose() { write({ ev: 'dispose' }); return orig.apply(this, arguments); };
  } catch (err) { write({ ev: 'dispose-hook-failed', why: String(err && err.message).slice(0, 200) }); }
  const origQuit = app.quit.bind(app);
  app.quit = function p362Quit() { write({ ev: 'app.quit', from: fromOf(new Error().stack) }); return origQuit.apply(null, arguments); };
  const origHandle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = function p362Handle(channel, listener) {
    if (channel !== 'app:quit' && channel !== 'app:relaunch') return origHandle(channel, listener);
    write({ ev: 'ipc-wrapped', channel });
    return origHandle(channel, function p362Listener() { const was = inIpc; inIpc = channel; try { return listener.apply(this, arguments); } finally { inIpc = was; } });
  };
  const kindOf = (w) => { try { const u = String(w.webContents.getURL()); return u.includes('/settings/index.html') ? 'settings' : u.includes('/index.html') ? 'main' : 'other'; } catch { return 'unknown'; } };
  const kinds = new Map();
  const kind = (w) => kinds.get(w.id) || kindOf(w);
  const live = () => BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  const vis = () => live().map((w) => ({ id: w.id, kind: kind(w), visible: w.isVisible(), minimized: w.isMinimized() }));
  const counts = () => { const k = live().map(kind); return { all: k.length, main: k.filter((x) => x === 'main').length, settings: k.filter((x) => x === 'settings').length }; };
  const track = (w) => {
    const id = w.id;
    write({ ev: 'window-created', id });
    try {
      const wc = w.webContents;
      const origSend = wc.send.bind(wc);
      wc.send = function p362Send(channel) { if (channel === 'app:quitRequested') write({ ev: 'quit-requested', id, kind: kind(w) }); return origSend.apply(null, arguments); };
      wc.on('did-finish-load', () => { const k = kindOf(w); kinds.set(id, k); write({ ev: 'window-kind', id, kind: k }); });
    } catch (err) { write({ ev: 'window-hook-failed', id, why: String(err && err.message).slice(0, 200) }); }
    w.on('close', () => write({ ev: 'window-close', id, kind: kinds.get(id) || 'unknown' }));
    w.on('closed', () => write({ ev: 'window-closed', id, kind: kinds.get(id) || 'unknown' }));
  };
  for (const w of BrowserWindow.getAllWindows()) track(w);
  app.on('browser-window-created', (_e, w) => track(w));
  const findItem = (items, test) => { for (const item of items) { if (test(String(item.label))) return item; if (item.submenu) { const inner = findItem(item.submenu.items, test); if (inner) return inner; } } return null; };
  // The Quit row's click arms requestQuit()'s fallback timer: the 3,000 ms timer armed during
  // the click is tagged, so an app.quit() it makes reads 'timer' and one it skips reads nothing.
  const clickTagged = (item, tag) => {
    const real = globalThis.setTimeout;
    globalThis.setTimeout = function p362SetTimeout(fn, ms) {
      if (typeof fn === 'function' && Number(ms) === FALLBACK_MS) {
        const rest = Array.prototype.slice.call(arguments, 2);
        write({ ev: 'fallback-armed', tag });
        return real.call(globalThis, function p362Fallback() { fallbackDepth += 1; write({ ev: 'fallback-fired', tag }); try { return fn.apply(this, arguments); } finally { fallbackDepth -= 1; } }, ms, ...rest);
      }
      return real.apply(globalThis, arguments);
    };
    try { item.click(); } finally { globalThis.setTimeout = real; }
  };
  let trayMenu = null;
  try {
    const orig = Tray.prototype.setContextMenu;
    Tray.prototype.setContextMenu = function p362SetContextMenu(menu) {
      trayMenu = menu;
      try { write({ ev: 'tray-menu', items: menu ? menu.items.map((i) => String(i.label)) : [] }); } catch { /* the menu is kept either way */ }
      return orig.apply(this, arguments);
    };
    write({ ev: 'tray-wrap', ok: Tray.prototype.setContextMenu !== orig });
  } catch (err) { write({ ev: 'tray-wrap', ok: false, why: String(err && err.message).slice(0, 200) }); }
  let pass = 0;
  let qwArmed = false;
  const qw = () => {
    const before = counts();
    let clicked = false;
    let activated = false;
    let openFile = false;
    try { const menu = Menu.getApplicationMenu(); const item = menu ? findItem(menu.items, (l) => l.startsWith('Settings')) : null; if (item) { item.click(); clicked = true; } } catch (err) { write({ ev: 'qw-failed', step: 'settings', why: String(err && err.message).slice(0, 200) }); }
    try { app.emit('activate', { preventDefault() {} }, false); activated = true; } catch (err) { write({ ev: 'qw-failed', step: 'activate', why: String(err && err.message).slice(0, 200) }); }
    try { app.emit('open-file', { preventDefault() {} }, OPEN_FOLDER); openFile = true; } catch (err) { write({ ev: 'qw-failed', step: 'open-file', why: String(err && err.message).slice(0, 200) }); }
    const actedAt = Date.now();
    setTimeout(() => write({ ev: 'qw', actedAt, before, after: counts(), clicked, activated, openFile }), 400);
  };
  app.prependListener('before-quit', () => {
    pass += 1;
    write({ ev: 'before-quit', pass, windows: vis() });
    if (pass !== 1) return;
    setImmediate(() => write({ ev: 'after-first-pass', windows: vis() }));
    if (qwArmed) setTimeout(qw, QW_DELAY_MS);
  });
  app.prependListener('will-quit', () => write(Object.assign({ ev: 'will-quit', windows: vis() }, sentinelNow())));
  app.prependListener('quit', () => {
    write(Object.assign({ ev: 'quit' }, sentinelNow()));
    if (!CRASH) return;
    let dump = null;
    let wrote = false;
    try { const dir = path.join(app.getPath('crashDumps'), 'pending'); fs.mkdirSync(dir, { recursive: true }); dump = path.join(dir, STANDIN); fs.writeFileSync(dump, Buffer.alloc(STANDIN_BYTES)); wrote = true; } catch (err) { write({ ev: 'plant-failed', why: String(err && err.message).slice(0, 200) }); }
    write({ ev: 'crash-now', wrote, dump });
    process.reallyExit(139);
  });
  let seen = 0;
  const poll = setInterval(() => {
    if (TRIGGER === '') return;
    let req = null;
    try { req = JSON.parse(fs.readFileSync(TRIGGER, 'utf8')); } catch { return; }
    if (!req || typeof req.seq !== 'number' || req.seq <= seen) return;
    seen = req.seq;
    const settingsWin = () => live().find((w) => kind(w) === 'settings');
    const mainWin = () => live().find((w) => kind(w) === 'main');
    // The parent's own rule for the quit's window: the focused one, else the first not destroyed.
    const newest = () => { const w = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows().find((x) => !x.isDestroyed()); return w ? kind(w) : null; };
    try {
      if (req.action === 'move-settings') { const st = settingsWin(); if (st) { st.setBounds(req.bounds); write({ ev: 'settings-moved', bounds: st.getBounds() }); } else write({ ev: 'settings-moved', none: true }); return; }
      if (req.action === 'close-settings') { const st = settingsWin(); if (st) { st.once('closed', () => write({ ev: 'settings-closed' })); st.close(); } else write({ ev: 'settings-closed', none: true }); return; }
      if (req.action === 'arm-qw') { qwArmed = true; write({ ev: 'armed', what: 'qw' }); return; }
      if (req.action === 'menu-quit') { const menu = Menu.getApplicationMenu(); const item = menu ? findItem(menu.items, (l) => l.startsWith('Quit ')) : null; write({ ev: 'menu-quit', ok: item !== null, label: item ? String(item.label) : null, target: newest(), windows: live().length }); if (item) clickTagged(item, 'menu'); return; }
      if (req.action === 'tray-quit') { const item = trayMenu ? findItem(trayMenu.items, (l) => l.startsWith('Quit ')) : null; write({ ev: 'tray-quit', ok: item !== null, label: item ? String(item.label) : null, target: newest(), windows: live().length }); if (item) clickTagged(item, 'tray'); return; }
      if (req.action === 'close-main') { const w = mainWin(); write({ ev: 'close-main', ok: !!w, target: newest(), windows: live().length }); if (w) w.close(); return; }
    } catch (err) { write({ ev: 'trigger-failed', action: String(req.action), why: String(err && err.message).slice(0, 200) }); }
  }, 50);
  poll.unref();
  write({ ev: 'hooked' });
});
`;

/**
 * CM's crash-state preload (F1's, ported from probe:p357 less its Settings move,
 * which the recorder does): with the checking build it opens a manifest-shaped
 * scratch db 12 s after boot, drives iterate() until the checker plants the
 * crash's own header state, proves no read fails, writes its marker and holds
 * the connection off the collector.
 */
const CRASH_PRELOAD = `'use strict';
// Phase 362's CM crash-state preload (F1's, ported). SCRATCH ONLY. Generated by build/p362/probe-p362.mjs.
if (process.type !== 'browser') return;
const fs = require('node:fs');
const path = require('node:path');
const OUT = process.env.P3571_CS_OUT;
const SCRATCH = process.env.P3571_CS_SCRATCH;
const marker = { planted: false, readsOk: false };
const flush = () => { try { fs.writeFileSync(OUT, JSON.stringify(Object.assign({ t: Date.now() }, marker))); } catch { /* never break the app */ } };
flush();
setTimeout(() => {
  let Database;
  try { Database = require('better-sqlite3'); } catch (err) { marker.requireFailed = String(err && err.message).slice(0, 200); flush(); return; }
  try {
    const dir = fs.mkdtempSync(path.join(SCRATCH, 'el-'));
    const db = new Database(path.join(dir, 'manifest.db'));
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY, name TEXT, created_at INTEGER, last_seen INTEGER, status TEXT, payload TEXT)');
    const ins = db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?)');
    db.transaction(() => { for (let i = 0; i < 354; i += 1) ins.run('id-' + i, 'n' + i, 1e12 + i, 0, 'idle', 'p'.repeat(12000 + (i % 5000))); })();
    db.prepare('SELECT * FROM sessions ORDER BY created_at ASC').all();
    for (let k = 0; k < 4000; k += 1) { for (const row of db.prepare('SELECT * FROM sessions ORDER BY 1,2,3,4,5,6').raw(true).iterate()) void row; }
    let ok = true;
    try { db.prepare('SELECT * FROM sessions ORDER BY created_at ASC').all(); db.prepare('SELECT * FROM sessions WHERE id = ?').get('id-3'); } catch { ok = false; }
    globalThis.__p3571CrashDb = db;
    marker.planted = true;
    marker.readsOk = ok;
    flush();
  } catch (err) { marker.armFailed = String(err && err.message).slice(0, 200); flush(); }
}, 12000);
`;

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
    openFolder: join(base, 'open-me'),
    manifest: join(base, 'profile', 'gmux', 'manifest.db'),
    snapshots: join(base, 'profile', 'gmux', 'snapshots'),
    backups: join(base, 'profile', 'gmux', 'backups', 'manifest.backups.json'),
    appLog: join(base, 'profile', 'logs', 'app.log'),
    appLogOld: join(base, 'profile', 'logs', 'app.log.1'),
    sentinel: join(base, 'profile', 'logs', 'run.json'),
    crashpad: join(base, 'profile', 'Crashpad'),
    settings: join(base, 'profile', 'settings.json'),
    events: join(base, 'events.jsonl'),
    trigger: join(base, 'trigger.json'),
    trace: join(base, 'fault-trace.tsv'),
    tracker: join(base, 'tracker.jsonl'),
    recorder: join(base, 'quit-recorder.cjs'),
    trackerJs: join(base, 'sqlite-tracker.cjs'),
    seam: join(base, 'manifest-fault.json'),
    cmMarker: join(base, 'cs-armed.json'),
    cmScratch: join(base, 'cs'),
    cmPreload: join(base, 'crash-preload.cjs')
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
const realOrSelf = (f) => {
  try {
    return realpathSync(f);
  } catch {
    return f;
  }
};
/** app.log.1 then app.log: what one rotation leaves (src/main/log/transport.ts). */
const appLogLines = (p) => [...readLines(p.appLogOld), ...readLines(p.appLog)];
/** Crashpad's dumps, as `<sub>/<name>`. */
function crashpadDumps(p) {
  const out = [];
  for (const sub of ['pending', 'completed', 'new']) {
    try {
      for (const n of readdirSync(join(p.crashpad, sub))) if (n.endsWith('.dmp')) out.push(`${sub}/${n}`);
    } catch {
      /* no such folder */
    }
  }
  return out;
}
/**
 * The snapshot folder, read BEFORE any relaunch: its names, each live id's
 * completion record, and each live body's time, size and sha256. A folder that
 * does not read is handed to the one reader as data, the error's code and
 * whether the gmux folder it lives in is there, and copiesOf decides what that
 * means (THE FIX ROUND, lens 1: it returned null, so a quit that never made the
 * folder read UNREADABLE).
 */
function snapshotListing(p, liveIds) {
  let names;
  try {
    names = readdirSync(p.snapshots);
  } catch (err) {
    let gmuxDir = false;
    try {
      gmuxDir = statSync(dirname(p.snapshots)).isDirectory();
    } catch {
      gmuxDir = false;
    }
    return { error: typeof err?.code === 'string' ? err.code : 'unknown', gmuxDir };
  }
  const records = {};
  for (const id of liveIds) {
    const text = readText(join(p.snapshots, `${id}.capsules.json`));
    if (text !== null) records[id] = text;
  }
  const mtimes = {};
  const sizes = {};
  const sha256 = {};
  for (const n of names) {
    if (!liveIds.some((id) => n.startsWith(`${id}.txt.`))) continue;
    try {
      const s = statSync(join(p.snapshots, n));
      mtimes[n] = Math.floor(s.mtimeMs);
      sizes[n] = s.size;
      sha256[n] = createHash('sha256').update(readFileSync(join(p.snapshots, n))).digest('hex');
    } catch {
      /* gone, or unreadable: the body then matches no record (copiesOf) */
    }
  }
  return { names, records, mtimes, sizes, sha256 };
}

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

function launchOptions(label, checkout, p, extra, keepServer) {
  const env = {
    HOME: p.home,
    ZDOTDIR: p.home,
    HISTFILE: '/dev/null',
    SHELL: '/bin/sh',
    TERM_SESSION_ID: undefined,
    TERM_PROGRAM: undefined,
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_LOG_FILE: '1',
    GMUX_SPECSTORY_NO_CLOUD: '1',
    GMUX_HARNESS_DIR: HARNESS_DIR,
    GMUX_TAILSCALE_BIN: standin.binPath,
    [NAME_SERVERS_VAR]: dns.servers,
    ...(extra ?? {})
  };
  return {
    label,
    userDataDir: p.profile,
    cwd: checkout,
    // The app launch keeps its scratch server so the relaunch finds the sessions live; the
    // relaunch names the socket, so its teardown ends the server and the census reads around it.
    tmuxSocket: keepServer ? null : SOCKET,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer(env),
    graceMs: 8_000
  };
}

const devtoolsPort = (p) => {
  try {
    return Number(readFileSync(join(p.profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
/** The main window's renderer over CDP, once the bridge is up: `{ cdp, url }`. */
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
            if ((await cdpEval(cdp, "typeof window.gmux === 'object' && typeof window.gmux.sessions === 'object'")) === true) return { cdp, url: picked.target.webSocketDebuggerUrl };
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
const list = (win) => cdpEval(win, LIST_EXPR, 60_000);
const createExpr = (name, proj) => `window.gmux.sessions.create({ name: ${J(name)}, projectPath: ${J(proj)}, agent: 'shell' }).then((s) => ({ ok: true, id: s.id }), (e) => ({ ok: false, error: String(e && e.message).slice(0, 400) }))`;

/** The reports folder around one launch: a launch whose report count moved is said, and RUN grades the run as a whole. */
function noteReports(label, before) {
  const after = reportNames();
  if (before === null || after === null) return;
  const fresh = after.filter((n) => !before.includes(n));
  if (fresh.length > 0) (report.printed.reports ??= []).push({ launch: label, names: fresh });
}

/** One launch with a window, after the preflights and the hidden agents. */
async function launchApp(label, checkout, p, extra, body, { keepServer = false } = {}) {
  mkdirSync(p.home, { recursive: true });
  mkdirSync(p.proj, { recursive: true });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflights.push(pre.ok);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused: ${dnsPre.problems.join('; ')}`);
  writeHiddenAgents(p.profile, 'p362', hiddenAgentsBesides([]));
  const before = reportNames();
  try {
    return await withElectron(launchOptions(label, checkout, p, extra, keepServer), async (handle) => {
      shims.add(handle.pid);
      const appNow = () => {
        try {
          const a = handle.appPid();
          if (a > 0) apps.add(a);
        } catch {
          /* not up yet */
        }
      };
      const { cdp: win, url } = await attachWindow(p);
      appNow();
      await sleep(2_000);
      appNow();
      const agents = standInsOnlyVerdict(JSON.parse(await cdpEval(win, AGENTS_LIST_EXPR, 120_000)), { standIns: [] });
      agentsHeld.push(agents.ok);
      if (!agents.ok) throw new Error(`an agent resolved: ${agents.said}`);
      try {
        return await body(win, handle, { agents, url });
      } finally {
        try {
          win.close();
        } catch {
          /* already closed with the window */
        }
      }
    });
  } catch (err) {
    const why = String(err?.message ?? err);
    if (why.includes(CENSUS_WORDS)) censusFailures.push(`${label}: ${why.slice(0, 300)}`);
    throw err;
  } finally {
    noteReports(label, before);
  }
}

/** One launch with no window: the teardown smoke (QD, QD0), which quits by itself. */
async function launchSmoke(label, checkout, p, extra) {
  mkdirSync(p.home, { recursive: true });
  writeHiddenAgents(p.profile, 'p362', hiddenAgentsBesides([]));
  const before = reportNames();
  const out = { code: null, text: '' };
  try {
    await withElectron(
      {
        label,
        userDataDir: p.profile,
        cwd: checkout,
        tmuxSocket: SOCKET,
        env: withoutDevRenderer({
          HOME: p.home,
          ZDOTDIR: p.home,
          HISTFILE: '/dev/null',
          SHELL: '/bin/sh',
          TERM_SESSION_ID: undefined,
          TERM_PROGRAM: undefined,
          GMUX_SMOKE: 'quit-teardown',
          GMUX_TMUX_SOCKET: SOCKET,
          GMUX_HARNESS_DIR: HARNESS_DIR,
          GMUX_LOG_FILE: '1',
          GMUX_SPECSTORY_NO_CLOUD: '1',
          ...extra
        }),
        graceMs: 8_000
      },
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
          const code = await Promise.race([handle.exited, sleep(90_000).then(() => 'still running after 90 s')]);
          // The shim's last line can follow its exit on the pipe.
          await sleep(500);
          out.code = Number.isInteger(code) ? code : null;
          out.text = handle.text();
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
  return out;
}

/** The relaunch on the arm's profile: what a person has afterwards. It names the socket, so its teardown ends the server. */
async function relaunchRead(label, checkout, p, nonce) {
  const out = { ran: false, nonce, prefix: SHELL_PREFIX };
  try {
    await launchApp(label, checkout, p, {}, async (win, handle) => {
      out.list = await list(win);
      out.serverNames = serverNames();
      out.values = JSON.parse(await cdpEval(win, `JSON.stringify(${J([...LS_KEYS, TIP_KEY])}.map((x) => localStorage.getItem(x)))`));
      out.settingsText = readText(p.settings);
      const quitAt = Date.now();
      await Promise.race([cdpEval(win, 'window.gmux.quit().then(() => true, () => false)').catch(() => null), sleep(5_000)]);
      const code = await Promise.race([handle.exited, sleep(90_000).then(() => 'still running after 90 s')]);
      out.quitMs = Date.now() - quitAt;
      await sleep(500);
      out.quit = exitOf(handle.text(), Number.isInteger(code) ? code : null);
      out.ran = true;
    });
  } catch (err) {
    out.why = String(err?.message ?? err).slice(0, 300);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The DOM helpers (R5: the stopped notice and its Restart)
// ---------------------------------------------------------------------------

const TOAST_READ = `(() => {
  const t = [...document.querySelectorAll('.toast')].find((el) => el.querySelector('.toast-text')?.textContent?.includes(${J(STOPPED_WORDS)}));
  if (t === undefined) return null;
  const btn = [...t.querySelectorAll('button')].find((b) => b.className.includes('btn-text'));
  return JSON.stringify({ text: t.querySelector('.toast-text')?.textContent ?? null, button: btn?.textContent ?? null });
})()`;
async function readToast(win) {
  for (let i = 0; i < 40; i += 1) {
    const raw = await cdpEval(win, TOAST_READ);
    if (typeof raw === 'string') return JSON.parse(raw);
    await sleep(300);
  }
  return null;
}
const clickRestart = (win) =>
  cdpEval(
    win,
    `(() => {
    const t = [...document.querySelectorAll('.toast')].find((el) => el.querySelector('.toast-text')?.textContent?.includes(${J(STOPPED_WORDS)}));
    const btn = t === undefined ? undefined : [...t.querySelectorAll('button')].find((b) => b.className.includes('btn-text'));
    if (btn === undefined) return false;
    btn.click();
    return true;
  })()`
  );
async function waitForLine(handle, re, ms) {
  const started = Date.now();
  while (Date.now() - started < ms) {
    if (re.test(handle.text())) return true;
    await sleep(150);
  }
  return re.test(handle.text());
}

// ---------------------------------------------------------------------------
// The arms
// ---------------------------------------------------------------------------

/**
 * One quit arm at one build: seed his shape, launch with the recorder and the
 * tracker, build the world, press, read how the quit ended and what it left
 * on disk, then relaunch and read what survived. Returns the raw input; the
 * reading is `derive`'s.
 */
async function quitRun(id, build) {
  const spec = ARM_SPECS[id];
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const p = paths(`${id}-${build}`);
  const loops = [];
  try {
    const seedOut = seed(p, checkout);
    report.printed[`${id}-${build}-seed`] = seedOut.out;
    if (seedOut.status !== 0) throw new Error(`the seed failed: ${J(seedOut)}`);
    for (const d of [p.openFolder, p.cmScratch]) mkdirSync(d, { recursive: true });
    for (const f of [p.events, p.trigger, p.trace, p.tracker, p.cmMarker]) rmSync(f, { force: true });
    writeFileSync(p.trackerJs, TRACKER, { mode: 0o600 });
    writeFileSync(p.recorder, RECORDER, { mode: 0o600 });
    if (spec.crashState) writeFileSync(p.cmPreload, CRASH_PRELOAD, { mode: 0o600 });
    const nonce = `${id}-${build}-${String(Date.now())}`;
    let seq = 0;
    const ask = (action, more = {}) => {
      seq += 1;
      writeFileSync(`${p.trigger}.tmp`, J({ seq, action, ...more }));
      renameSync(`${p.trigger}.tmp`, p.trigger);
    };
    const eventsNow = () => eventsOf(readLines(p.events));
    const waitEvent = async (pred, ms) => {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        const e = eventsNow().find(pred);
        if (e !== undefined) return e;
        await sleep(100);
      }
      return null;
    };
    const world = { agents: null, prefix: SHELL_PREFIX, shellsWanted: spec.n, created: 0, serverNames: [], historySizes: [], listBefore: null, settingsMovedBounds: null, settingsClosed: false, flagBefore: null, loopsWanted: spec.loops ? LOOPS : 0, loopsStarted: 0, loadAtPress: null, qr: spec.pause ? { paused: false, pausedAt: null, resumed: false } : null, seam: spec.seam ? { installed: false, armed: false, toast: null, clicked: false } : null };
    const raw = { world };
    let exitAt = null;
    let exitAtRead = null;
    let liveIds = [];
    const extra = {
      NODE_OPTIONS: [`--require=${p.trackerJs}`, `--require=${p.recorder}`, ...(spec.crashState ? [`--require=${p.cmPreload}`] : [])].join(' '),
      P362_EVENTS: p.events,
      P362_TRIGGER: p.trigger,
      P362_TRACKER: p.tracker,
      P362_SENTINEL: p.sentinel,
      P362_OPEN_FOLDER: p.openFolder,
      GMUX_FAULT_TRACE: p.trace,
      ...(spec.seam ? { GMUX_HARNESS_MANIFEST_FAULT: p.seam } : {}),
      ...(spec.crashState ? { P362_BS3: BS3, P358ADV_PLANT: 'crash-state', P358ADV_PLANT_AT: '500', P358ADV_STEP_EVERY: '8', P358ADV_SEGV_EXIT: '1', P3571_CS_OUT: p.cmMarker, P3571_CS_SCRATCH: p.cmScratch } : {})
    };
    await launchApp(
      `${id}-${build}-app`,
      checkout,
      p,
      extra,
      async (win, handle, pre) => {
        world.agents = pre.agents;
        await waitEvent((e) => e.ev === 'hooked', 10_000);
        if (spec.seam) world.seam.installed = await waitForLine(handle, /manifest fault seam installed/, 5_000);
        if (!spec.nothing) {
          await cdpEval(win, `window.gmux.projects.add(${J(p.proj)}).then((x) => x && x.path, () => null)`);
          for (let i = 0; i < spec.n; i += 1) {
            const made = await cdpEval(win, createExpr(`${SHELL_PREFIX}${String(i).padStart(2, '0')}`, p.proj), 60_000);
            if (made?.ok === true) world.created += 1;
          }
          const ids = shellIds();
          for (const sid of ids) tmux('send-keys', '-t', sid, FILL_COMMAND, 'Enter');
          const until = Date.now() + 300_000;
          for (;;) {
            world.historySizes = ids.map((sid) => Number(tmux('display-message', '-p', '-t', sid, '#{history_size}').out || '0'));
            if (world.historySizes.every((n) => n >= HISTORY_FLOOR) || Date.now() > until) break;
            await sleep(1_000);
          }
          await sleep(2_000);
          world.historySizes = ids.map((sid) => Number(tmux('display-message', '-p', '-t', sid, '#{history_size}').out || '0'));
        }
        world.serverNames = serverNames();
        world.listBefore = await list(win);
        liveIds = (world.listBefore?.ids ?? []).filter((_x, i) => String((world.listBefore?.names ?? [])[i] ?? '').startsWith(SHELL_PREFIX));
        if (!spec.toast) await cdpEval(win, `(localStorage.setItem(${J(TIP_KEY)}, '1'), true)`);
        world.flagBefore = await cdpEval(win, `localStorage.getItem(${J(TIP_KEY)})`);
        await cdpEval(win, `(localStorage.setItem(${J(LS_KEYS[0])}, ${J(nonce)}), true)`);
        if (spec.settings !== 'none') {
          await cdpEval(win, 'window.gmux.openSettings().then(() => true, () => false)');
          await sleep(2_000);
          ask('move-settings', { bounds: SETTINGS_MOVED_BOUNDS });
          world.settingsMovedBounds = (await waitEvent((e) => e.ev === 'settings-moved', 5_000))?.bounds ?? null;
        }
        await cdpEval(win, `(localStorage.setItem(${J(LS_KEYS[1])}, ${J(nonce)}), true)`);
        if (spec.settings === 'close') {
          ask('close-settings');
          world.settingsClosed = (await waitEvent((e) => e.ev === 'settings-closed' && e.none !== true, 10_000)) !== null;
        }
        if (spec.qw) {
          ask('arm-qw');
          await waitEvent((e) => e.ev === 'armed' && e.what === 'qw', 5_000);
        }
        if (spec.crashState) {
          const until = Date.now() + 120_000;
          while (Date.now() < until) {
            const m = readText(p.cmMarker);
            if (m !== null && /"planted":true|"requireFailed"|"armFailed"/.test(m)) break;
            await sleep(300);
          }
        }
        if (spec.seam) {
          writeFileSync(p.seam, `${J({ seq: 1, fail: { operation: 'listSessions', code: 'SQLITE_CORRUPT' } })}\n`);
          world.seam.armed = await waitForLine(handle, /manifest fault armed: seq=1 listSessions SQLITE_CORRUPT/, 8_000);
          await cdpEval(win, 'window.gmux.sessions.list().then(() => null, () => null)');
          await sleep(2_500);
          world.seam.toast = await readToast(win);
        }
        await sleep(1_000);
        if (spec.loops) {
          startLoops(loops, LOOPS);
          world.loopsStarted = loops.filter((c) => Number.isInteger(c.pid)).length;
          await sleep(1_000);
        }
        await cdpEval(win, `(localStorage.setItem(${J(LS_KEYS[2])}, ${J(nonce)}), true)`);
        // QR: the main renderer paused through the debugger, on a second connection of its own.
        let dbg = null;
        if (spec.pause) {
          dbg = await wsConnect(pre.url, { collect: ['Debugger.paused', 'Debugger.resumed'] });
          await dbg.call('Debugger.enable', {}, 15_000);
          await dbg.call('Debugger.pause', {}, 15_000);
          for (let i = 0; i < 20 && !dbg.events().some((e) => e.method === 'Debugger.paused'); i += 1) await sleep(100);
          if (dbg.events().some((e) => e.method === 'Debugger.paused')) {
            world.qr.paused = true;
            world.qr.pausedAt = Date.now();
          }
        }
        void handle.exited.then(
          () => {
            exitAt = Date.now();
          },
          () => {
            exitAt = Date.now();
          }
        );
        world.loadAtPress = loadavg();
        if (spec.press === 'menu') ask('menu-quit');
        else if (spec.press === 'tray') ask('tray-quit');
        else if (spec.press === 'close') ask('close-main');
        else if (spec.press === 'bridge') {
          raw.press = { how: 'bridge', at: Date.now(), ok: true };
          void cdpEval(win, 'window.gmux.quit().then(() => true, () => false)', 10_000).catch(() => null);
        } else if (spec.press === 'restart') {
          raw.press = { how: 'restart', at: Date.now(), ok: false };
          raw.press.ok = (await clickRestart(win).catch(() => false)) === true;
          world.seam.clicked = raw.press.ok;
        }
        const pressEvent = { menu: 'menu-quit', tray: 'tray-quit', close: 'close-main' }[spec.press];
        const pressEv = pressEvent === undefined ? null : await waitEvent((e) => e.ev === pressEvent, 10_000);
        const pressAt = pressEv?.t ?? raw.press?.at ?? Date.now();
        if (spec.twice) {
          // THE PROBE REVIEW: the second press lands while the quit saves, a
          // second after its first pass (TWICE_NEED says why), and never a
          // second after the first press, inside the first quit's message.
          const firstPass = await waitEvent((e) => e.ev === 'before-quit' && e.pass === 1 && e.t >= pressAt, 10_000);
          await sleep(Math.max(0, (firstPass?.t ?? pressAt) + QT_SECOND_PRESS_MS - Date.now()));
          ask('menu-quit');
        }
        if (spec.pause && dbg !== null) {
          if (!world.qr.paused) {
            for (let i = 0; i < 28 && !dbg.events().some((e) => e.method === 'Debugger.paused'); i += 1) await sleep(100);
            if (dbg.events().some((e) => e.method === 'Debugger.paused')) {
              world.qr.paused = true;
              world.qr.pausedAt = Date.now();
            }
          }
          await sleep(Math.max(0, pressAt + QR_RESUME_MS - Date.now()));
          world.qr.resumed = (await dbg.call('Debugger.resume', {}, 5_000).then(() => true, () => false)) === true;
          try {
            dbg.close();
          } catch {
            /* gone with the window */
          }
        } else if (spec.long && !spec.crashState) {
          // While the window is up, one action asked of it: what a person meets during the saving (printed).
          await sleep(Math.max(0, pressAt + 2_000 - Date.now()));
          report.printed[`${id}-${build}-actionDuringQuit`] = await Promise.race([
            cdpEval(win, 'window.gmux.sessions.list().then((l) => ({ ok: true, n: l.length }), (e) => ({ ok: false, error: String(e && e.message).slice(0, 160) }))', 3_000).catch((e) => ({ ok: false, error: `cdp: ${String(e?.message ?? e).slice(0, 120)}` })),
            sleep(3_500).then(() => ({ ok: false, error: 'no answer in 3.5 s' }))
          ]);
        }
        const code = await Promise.race([handle.exited, sleep(120_000).then(() => 'still running after 120 s')]);
        // THE PROBE REVIEW: a quit that never ended has no end time. It used to
        // read "now" here, and the helper's own teardown later moved `exitAt`
        // again, so a quit that never ended was printed as gone at 120 s.
        exitAtRead = Number.isInteger(code) ? (exitAt ?? Date.now()) : null;
        // The shim's signal line can follow its exit on the pipe.
        await sleep(2_500);
        raw.shim = { text: handle.text().slice(-20_000), code: Number.isInteger(code) ? code : null };
      },
      { keepServer: true }
    );
    raw.exitAt = exitAtRead;
    raw.events = readLines(p.events);
    raw.trace = readLines(p.trace);
    raw.tracker = readLines(p.tracker);
    raw.manifest = [p.manifest, realOrSelf(p.manifest)];
    // THE PROBE REVIEW: with no list before the press nobody knows which shells
    // were live, so the copies are UNREAD (copiesOf answers read: false), never
    // "0 of 0 kept" graded as 0 of 64.
    raw.liveIds = world.listBefore?.ok === true ? liveIds : null;
    raw.snapshots = snapshotListing(p, liveIds);
    raw.backups = readText(p.backups);
    raw.sentinelAfter = readText(p.sentinel);
    if (spec.crashState) raw.cm = { bs3Built: checkingBs3Ok(BS3), markerText: readText(p.cmMarker), sessionList: realOrSelf(p.manifest), preloadDir: realOrSelf(p.cmScratch) };
    // The relaunch on the same profile, the same build.
    raw.relaunch = await relaunchRead(`${id}-${build}-relaunch`, checkout, p, nonce);
    raw.appLog = appLogLines(p);
    if (KEEP) writeFileSync(join(p.base, 'raw.json'), `${J(raw, null, 1)}\n`, { mode: 0o600 });
    return raw;
  } finally {
    endLoops(loops);
    endServer();
  }
}

/** QD and QD0: the teardown smoke (nothing held), the recorder ending QD with exit 139 at quit; then a relaunch. */
async function teardownRun(id, build) {
  const spec = ARM_SPECS[id];
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const p = paths(`${id}-${build}`);
  try {
    mkdirSync(p.profile, { recursive: true });
    for (const f of [p.events]) rmSync(f, { force: true });
    writeFileSync(p.recorder, RECORDER, { mode: 0o600 });
    const raw = { standin: STANDIN_DUMP, dumpsBefore: crashpadDumps(p) };
    const smoke = await launchSmoke(`${id}-${build}-teardown`, checkout, p, {
      NODE_OPTIONS: `--require=${p.recorder}`,
      P362_EVENTS: p.events,
      P362_SENTINEL: p.sentinel,
      P362_CRASH_AT_QUIT: spec.crash ? '1' : '0'
    });
    raw.shim = { text: smoke.text.slice(-20_000), code: smoke.code };
    raw.events = readLines(p.events);
    raw.sentinelAfter = readText(p.sentinel);
    raw.dumpsAfter = crashpadDumps(p);
    const rl = { ran: false };
    try {
      await launchApp(`${id}-${build}-relaunch`, checkout, p, {}, async (win, handle, pre) => {
        rl.agents = pre.agents;
        rl.list = await list(win);
        await Promise.race([cdpEval(win, 'window.gmux.quit().then(() => true, () => false)').catch(() => null), sleep(5_000)]);
        const code = await Promise.race([handle.exited, sleep(90_000).then(() => 'still running after 90 s')]);
        await sleep(500);
        rl.quit = exitOf(handle.text(), Number.isInteger(code) ? code : null);
        rl.ran = true;
      });
    } catch (err) {
      rl.why = String(err?.message ?? err).slice(0, 300);
    }
    raw.world = { agents: rl.agents ?? { ok: false, said: 'the relaunch did not reach its window' } };
    raw.relaunch = { ran: rl.ran };
    raw.appLog = appLogLines(p);
    report.printed[`${id}-${build}-relaunchQuit`] = rl.quit ?? rl.why ?? null;
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
  if (build === 'head') reading.parent = { mainClosed: parentReading?.timeline?.mainClosed ?? null };
  return reading;
}

/** What a person meets, printed for each pair: when the window closed and the process went, and what was kept. */
function printPair(id, parentR, headR) {
  const line = (r) =>
    r === null || r === undefined
      ? 'not read'
      : `closed ${String(r.timeline?.mainClosed ?? '—')} ms, gone ${String(r.timeline?.processEnd ?? '—')} ms, fallback ${String(r.timeline?.timerQuit ?? '—')}, pass ${String(r.timeline?.passLine?.at ?? '—')}, dispose ${String(r.timeline?.dispose ?? '—')}, will-quit ${String(r.timeline?.willQuit ?? '—')}, copies ${String(r.copies?.kept ?? '—')}/${String(r.copies?.of ?? '—')}${r.copies?.folder === 'never made' ? ' (the snapshot folder was never made)' : r.copies?.checked === 'bytes and sha256' ? ' (bytes and sha256 checked)' : ''}, .part ${String(r.copies?.parts ?? '—')}, quit generation ${String(r.generation?.quit ?? '—')}, ended ${r.exit?.signal ?? `code ${String(r.exit?.code ?? '—')}`}, load ${J(r.loadAtPress ?? null)}`;
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
    if (spec.crashState && !checkingBs3Ok(BS3)) {
      const why = `no checking better-sqlite3: P3571_BS3 is ${BS3 === '' ? 'not set' : `${BS3}, which holds no build/Release/better_sqlite3.node and lib/index.js`} (research 143's build was removed with 357.1's scratch)`;
      cannotRead('CM-parent', why);
      cannotRead('CM-head', why);
      continue;
    }
    const readings = {};
    for (const build of ['parent', 'head']) {
      say(`ARM ${id} at the ${build}`);
      noteHistory();
      historyDuring = `arm ${id} at the ${build}`;
      try {
        const raw = spec.teardown ? await teardownRun(id, build) : await quitRun(id, build);
        readings[build] = readingOf(id, build, raw, readings.parent ?? null);
        arm(`${id}-${build}`, readings[build]);
        if (TX_HOSTS.includes(id)) arm(`TX-${build}`, readings[build], id);
      } catch (err) {
        cannotRead(`${id}-${build}`, `the arm stopped: ${String(err?.message ?? err).slice(0, 400)}`);
        if (TX_HOSTS.includes(id)) cannotRead(`TX-${build}@${id}`, `the arm stopped: ${String(err?.message ?? err).slice(0, 200)}`);
      }
      endServer();
      noteHistory();
      historyDuring = `between arms, after ${id} at the ${build}`;
      await sleep(1_000);
    }
    if (!spec.teardown) printPair(id, readings.parent ?? null, readings.head ?? null);
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
  // The scratch server: end it on this run's socket, which the helper also does.
  endServer();
  await sleep(500);
  const after = processTable();
  const electronsLeft = [...after.values()].filter((r) => [...shims, ...apps].includes(r.pid) && /[Ee]lectron|Tortie/.test(r.command)).length;
  const loopsLeft = [...after.values()].filter((r) => loopPids.has(r.pid) && r.command.includes(LOOP_MARK)).length;
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
    loopsLeft,
    reportsRead,
    newReports,
    history
  });
  safely('the report', () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p362.json'), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  });
  if (!KEEP) safely('the scratch world', () => rmSync(RUN, { recursive: true, force: true }));
  else say(`kept ${RUN} (P362_KEEP=1); every reading in ${OUT}`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} verdict(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
// Every launch, stand-in and server above has ended; a CDP call's long timer must not hold the run (or its lock slot) open.
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
