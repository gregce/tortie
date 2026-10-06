#!/usr/bin/env node
/**
 * probe:p337 — THE PHASE 337 APP RUN, the Mac side of the Screen: a session's
 * own screen read through `GET /v1/screen` and typed into through
 * `POST /v1/keys` (build/p337/SPEC.md §7.7).
 *
 * ONE Electron at HEAD through build/electron-run.mjs's `withElectron`, on a
 * scratch profile and a scratch HOME under the harness directory, the tmux
 * socket build/harness-socket.mjs hands it (`gmux-p337…`), and the LOOPBACK
 * scratch machine build/with-scratch-machine.mjs starts around this file
 * (`SCRATCH_MACHINE_QUIET_SHELL=1`, `SCRATCH_MACHINE_NO_OWN_KEYS=1`: its own
 * sshd on 127.0.0.1, its own keys and none of the person's, its own
 * TMUX_TMPDIR). With `P337_PARENT_CHECKOUT` (a BUILT `aebb4ce9`) a SECOND
 * Electron runs that parent on the same profile, one after the other and
 * never at once: it runs FIRST, so the HEAD launch that follows reads the
 * door's agreement `changed` (S0), the route list being a hashed field.
 *
 * WHAT IS REAL. The door, switched on, confirmed and published through the
 * STAND-IN Tailscale (build/p330/tailscale-standin.mjs behind
 * GMUX_TAILSCALE_BIN, preflighted by sha256, the process table sampled every
 * second: a real Tailscale under the app, or run as a command, FAILS the run).
 * The name check asks build/p332/dns-standin.mjs IN THIS PROCESS on 127.0.0.1.
 * The phones are build/p316/node-phone.mjs (`screenRead`, `sendKeys`), paired
 * through the stand-in's loopback forwarder with mutual TLS. THE AGENTS ARE
 * build/p318/stand-in.mjs (Claude Code inline and full screen, Codex, a
 * picker): the scratch login shell resolves `claude` and `codex` to
 * `exec -a` wrappers of it (the probe REFUSES to start, exit 2, unless both
 * bare names resolve there); Gemini's and Qwen's screens are their COMMITTED
 * captures drawn by build/p337/measure-screen.mjs `--draw` in a shell
 * session; every key is read by build/p337/key-recorder.mjs, which logs every
 * byte it reads. Those logs, and the probe's own `capture-pane` on the run's
 * scratch socket, are the ground truth every arm is graded on, never the
 * verb's report. NO VENDOR PROCESS RUNS AND NO MODEL TURN IS SPENT.
 *
 * THE ARMS (SPEC §7.7)
 *   S0  the door reads `changed`; its lines hold the route line with `keys`
 *       and `screen` and D35's write line; the confirm block draws the
 *       honesty sentence; Allow
 *   S1  `/v1/screen` for every session of the matrix: each answer one the
 *       phone draws, its rows' text equal to the probe's own `capture-pane
 *       -p`, its `cols`, `rows`, `cursor` and `alternate` equal to
 *       `display-message`'s, and every window's size unchanged
 *   S2  the long poll: a current `since` held 9.5 s or more and answered
 *       `unchanged`; a change drawn mid-hold answered within 250 ms; a
 *       malformed `since` 404
 *   S3  the shell: `echo <canary>` then Enter runs; C-c ends `sleep 1000` (the
 *       process table); C-d ends a `cat`
 *   S4  a key recorder in each mode: every name's bytes equal
 *       keys-encoding.json's (3.7b); text arrives as its exact bytes
 *   S5  THE ONE REFUSAL, (a) to (g), each on the stand-in's or recorder's log
 *   S6  replays: the same bytes 404 and one act; the same write id
 *       fresh-signed the recorded body and one act; an id nobody has `gone`;
 *       a Removed phone refused before HTTP
 *   S7  hostile bodies (65 items, 1,025 text bytes, a C0 text, `M-x`, an extra
 *       key): each refused for its own reason, the recorder's log unmoved
 *   S8  THE MACHINE: the far shell's screen equals the far `capture-pane -p`;
 *       a typed line reaches it; `Up` reaches a far recorder in application
 *       cursor mode as `ESC O A`; the far window's size unchanged; with the
 *       scratch sshd paused, keys refused `unreachable` and nothing typed
 *       after it resumes
 *   S9  status: a phone key answers a `needs_input` as the desk's does; a
 *       dialog-shaped echo typed from the phone reads as the same echo typed
 *       at the desk, at HEAD and at the parent (the fix round of 2026-10-06:
 *       the monitor reads a numbered question off the screen whoever typed
 *       it, today's class, stated; with no parent the arm is UNREADABLE)
 *   S10 D8 live: a session drawing forged guard rows beside four others for
 *       60 s while the monitor and a phone read them: every answer its own
 *   S11 after the app is gone: no typed canary in app.log, under the profile
 *       or HOME (the sessions' own saved screens counted apart), or in `ps
 *       -ww` sampled every 500 ms through S3 to S8; the keys log lines exactly
 *       D43's
 *   S12 `/v1/session` p50 at the parent and HEAD, and HEAD's with a phone
 *       watching a dense screen, printed; HEAD within 50 ms of the parent
 *   S13 THE DESK SCROLLED BACK: a desk wheel parks a session in copy mode; a
 *       phone key brings the pane out, the desk's own scroll state reads live,
 *       and the next desk wheel scrolls back again
 *   RN  ⌘J's rows and Catch Me Up's lines read the same at the parent and HEAD
 *   RP  with P337_PARENT_CHECKOUT: `/v1/screen` and `/v1/keys` 404; no byte at
 *       any recorder; the lines name neither; the forged rows printed
 *   RUN both preflights, the quiet agents, no real Tailscale, nothing
 *       forbidden at the stand-in, every stand-in ended, his history unmoved
 *
 * WHAT IT REFUSES TO DO. It never names the person's tmux server or `-L gmux`
 * (it refuses any socket that is not a `gmux-p337` harness socket), binds no
 * real interface and dials nothing but 127.0.0.1, never runs a real
 * `tailscale`, never asks real DNS, reads no keychain and no credential (the
 * app runs `--use-mock-keychain`), and signals only the pids it started, the
 * stand-ins wrote in their hellos, or the scratch machine's own sshd it
 * paused (resumed in a `finally` and on exit), by pid, never by pattern. Every
 * local shell is the scratch HOME's (HISTFILE=/dev/null, TERM_SESSION_ID
 * unset). It takes NO screenshot. Before EVERY launch the profile's
 * agents.json renames the Gemini, Qwen, Antigravity, Grok and Droid binaries
 * and `agents:list` is read back, so no agent's `--version` runs.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && npm run -s probe:p337
 *   P337_PARENT_CHECKOUT=<a BUILT aebb4ce9 checkout> npm run -s probe:p337
 *   P337_KEEP=1                    keep the scratch world (every log) for a re-derivation
 *   node build/p337/probe-p337.mjs --grader-self-test   every grader on its fixtures; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { execFile, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { freshWriteId, makePhone, pairThrough, readOffer, screenAnswerProblems, screenRead, screenRowText, sendKeys, signedGet, signedPost } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';
import { hellos, readLog, readState, sendOps, writeWrappers } from '../p318/stand-in.mjs';
import { authorizedLinesFor } from '../scratch-machine.mjs';
import { readRecorderLog } from './key-recorder.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hr = () => process.hrtime.bigint();
const msBetween = (from, to) => Number(BigInt(to) - BigInt(from)) / 1e6;

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE or read from the checkout
// ---------------------------------------------------------------------------

/** The phase's parent on main, the build RP and RN compare with. */
export const SNAPSHOT = 'aebb4ce9';
export const MACHINE_ID = 'p337far';
/** D35: HEAD's route line and write line, by value. */
export const ROUTE_LINE = 'Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, session, sessions, turns';
export const WRITE_LINE = 'Lets an allowed phone end a session, answer a numbered question, send a session one message and type into any session as you would at this Mac';
export const ROUTE_IDS = Object.freeze(['blocked', 'choose', 'end', 'keys', 'pair', 'say', 'screen', 'session', 'sessions', 'turns']);
export const LIVE = Object.freeze(['running', 'idle', 'needs_input']);
/** D43: the keys write's one log line, and its quiet minute. */
export const KEYS_LOG_LINE = "the phone's keys:";
export const KEYS_LOG_QUIET_MS = 60_000;
/** D42: two keys acts on one session at least this far apart. */
export const KEYS_GAP_MS = 50;
/**
 * How much closer than KEYS_GAP_MS two of an agent's READS may be: the Mac
 * waits its 50 ms between the two acts by its own clock, and a key's landing
 * at the pane varies by a millisecond or two either way. measure:p337 arm K
 * measured reads 49.62 and 49.96 ms apart while the verb waited its 50, and
 * grades the verb's own gap at 50 with no slack (build/p337/measure-screen.mjs
 * LANDING_SLACK_MS, the same 2).
 */
export const LANDING_SLACK_MS = 2;
/** S2: a held poll lasts at least this; a change mid-hold is answered within that. */
export const HELD_AT_LEAST_MS = 9_500;
export const CHANGE_WITHIN_MS = 250;
/** S12: HEAD's `/v1/session` p50 within this of the parent's. */
export const SESSION_P50_BOUND_MS = 50;
/** The recorder modes S4 drives (keys-encoding.json's own). */
export const MODES = Object.freeze(['normal', 'decckm', 'decckm,keypad', 'mok1', 'mok2', 'kitty', 'paste']);
/** S10's length. */
export const S10_MS = 60_000;

/** A string literal's value: `NAME = '…'` (or with a type), joined across `+` pieces and a line break. */
export function constWord(src, name) {
  const at = new RegExp(`\\b${name}\\s*(?::[^=]*)?=\\s*`).exec(String(src ?? ''));
  if (at === null) return null;
  let rest = src.slice(at.index + at[0].length);
  const out = [];
  for (;;) {
    const m = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/.exec(rest);
    if (m === null) break;
    out.push((m[1] ?? m[2]).replace(/\\(.)/g, '$1'));
    rest = rest.slice(m[0].length);
    const plus = /^\s*\+/.exec(rest);
    if (plus === null) break;
    rest = rest.slice(plus[0].length);
  }
  return out.length === 0 ? null : out.join('');
}

/** A write's answer as JSON, or null. */
export function answerOf(reply) {
  try {
    return reply?.status === 200 ? JSON.parse(reply.body) : null;
  } catch {
    return null;
  }
}

/** The route ids the confirm lines' `Answers these and nothing else:` line names, or null. */
export function routeIdsOf(lines) {
  const line = (lines ?? []).find((l) => l.startsWith('Answers these and nothing else:'));
  return line === undefined ? null : line.slice(line.indexOf(':') + 1).split(',').map((s) => s.trim()).filter((s) => s !== '');
}

/** The `q` quantile (nearest rank) of a list of numbers, or null. */
export function quantile(values, q) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  return xs[Math.min(xs.length - 1, Math.max(0, Math.ceil(q * xs.length) - 1))];
}

/** ⌘J's rows and Catch Me Up's lines with each build's suffix and every clock time taken out (318's RN normalisation). */
export function normalizeRn(reading, suffix) {
  const strip = (s) => String(s ?? '').split(suffix).join('<build>').replace(/\b\d{1,2}:\d{2}\b/g, '<time>');
  return {
    rows: (reading?.rows ?? []).map((r) => ({ name: strip(r.name), label: strip(r.label), excerpt: strip(r.excerpt) })).sort((a, b) => a.name.localeCompare(b.name)),
    lines: (reading?.lines ?? []).map(strip).sort()
  };
}

/**
 * A screen answer's rows as the phone's labels read them, against a capture's
 * rows: the rows that differ, and `-2` first when the answer holds another
 * number of rows than the pane. `capture-pane -p` ends EVERY row with a line
 * feed (measured: six rows read `a\nb\n\n\n\n\n`), so the piece after the last
 * one is that terminator and not a row. THE PROBE REVIEW (2026-10-05): this
 * compared only the rows the answer held, so an answer missing rows (S8 asks
 * nothing else of the far screen) read as equal.
 */
export function rowsDiffer(screen, captureText) {
  if (screen === null || typeof screen !== 'object' || !Array.isArray(screen.lines)) return [-1];
  const cap = String(captureText ?? '').split('\n');
  if (cap.length > 0 && cap[cap.length - 1] === '') cap.pop();
  const out = screen.lines.length === cap.length ? [] : [-2];
  for (let y = 0; y < screen.lines.length; y += 1) if (screenRowText(screen.lines[y]) !== (cap[y] ?? '').replace(/ +$/, '')) out.push(y);
  return out;
}

/** `display-message`'s seven fields as a geometry, or null. */
export function geometryOf(line) {
  const f = String(line ?? '').trim().split(' ');
  if (f.length !== 6 || f.some((x) => !/^\d+$/.test(x))) return null;
  return { cols: Number(f[0]), rows: Number(f[1]), x: Number(f[2]), y: Number(f[3]), visible: f[4] === '1', alternate: f[5] === '1' };
}

/** Whether a screen answer's geometry is what `display-message` read (the cursor's column clamped to `cols`, as D9 does). */
export function geometryEqual(screen, g) {
  if (screen === null || g === null) return false;
  return screen.cols === g.cols && screen.rows === g.rows && screen.cursor?.x === Math.min(g.x, g.cols) && screen.cursor?.y === Math.min(g.y, g.rows - 1) && screen.cursor?.visible === g.visible && screen.alternate === g.alternate;
}

/** The picker's option under its drawn cursor (`❯ N.`), 0-based, or null. */
export function pickerCursorOf(screen) {
  for (const line of screen?.lines ?? []) {
    const m = /^❯ ([1-9])\./.exec(screenRowText(line));
    if (m !== null) return Number(m[1]) - 1;
  }
  return null;
}

/**
 * How many `the phone's keys:` lines D43 owes for the keys writes this run
 * sent, in the order main answered them: every outcome but `done` once each,
 * and a `done` only when it is its session's first logged `done` for 60 s. A
 * write main never acted on (a 404, a cut, `busy`, `malformed`, a ledger
 * repeat) owes none.
 */
export function owedKeysLines(writes) {
  const lastDone = new Map();
  let owed = 0;
  for (const w of [...writes].sort((a, b) => a.at - b.at)) {
    if (w.status !== 200 || w.repeat === true || w.outcome === null || w.outcome === 'busy' || (w.outcome === 'refused' && w.reason === 'malformed')) continue;
    if (w.outcome !== 'done') {
      owed += 1;
      continue;
    }
    const last = lastDone.get(w.session);
    if (last !== undefined && w.at - last < KEYS_LOG_QUIET_MS) continue;
    lastDone.set(w.session, w.at);
    owed += 1;
  }
  return owed;
}

/**
 * D37, read live: the loopback yard's authorized_keys holds the run's own key
 * and nothing else (the closing empty line aside). Answers null when it does,
 * else why not, without saying any key it found.
 */
export function noOwnKeysLine(authorized, runKey) {
  const lines = String(authorized).split('\n').map((l) => l.trim()).filter((l) => l !== '');
  if (runKey.trim() === '') return 'the run has no key of its own';
  if (lines.length === 0) return 'the yard trusts no key at all';
  if (lines.length !== 1) return `the yard trusts ${String(lines.length)} keys, not the run's alone`;
  return lines[0] === runKey.trim() ? null : "the one key the yard trusts is not the run's";
}

// ---------------------------------------------------------------------------
// The graders: pure, over a recorded reading, each clause shown to fail
// ---------------------------------------------------------------------------

const refusedChanged = (x) => x?.outcome === 'refused' && x?.reason === 'changed';
const noBytes = (x) => x?.bytes === '';

export const GRADERS = {
  S0: {
    title: 'the door asks again, and its lines say what the Screen does',
    clauses: [
      ['the door reads changed after the parent confirmed it', (r) => r.parentRanFirst !== true || r.confirmStateBefore === 'changed'],
      ['the route line names keys and screen among the ten', (r) => J(routeIdsOf(r.lines)) === J(ROUTE_IDS)],
      ["the lines hold D35's write line", (r) => Array.isArray(r.lines) && r.lines.includes(WRITE_LINE)],
      ['the confirm block draws the honesty sentence', (r) => typeof r.honesty === 'string' && r.honesty !== '' && typeof r.confirmBlock === 'string' && r.confirmBlock.includes(r.honesty)],
      ['Allow: the door listens', (r) => r.listening === true]
    ]
  },
  S1: {
    title: "every session's screen, as tmux reads it",
    clauses: [
      ['every session of the matrix answered a screen', (r) => r.required.length > 0 && r.required.every((n) => r.rows.some((x) => x.name === n && x.status === 200 && x.screen === true))],
      ['every answer is one the phone draws', (r) => r.rows.length > 0 && r.rows.every((x) => x.problems.length === 0)],
      ["every row's text equals capture-pane -p", (r) => r.rows.every((x) => x.rowsEqual === true)],
      ['cols, rows, cursor and alternate equal display-message', (r) => r.rows.every((x) => x.geometryEqual === true)],
      ['the full-screen session reads alternate and the inline one does not', (r) => r.fullAlternate === true && r.inlineAlternate === false],
      ['no window changed size', (r) => r.rows.every((x) => x.sizeSame === true)]
    ]
  },
  S2: {
    title: 'the long poll',
    clauses: [
      ['a current since is held at least 9.5 s and answered unchanged', (r) => typeof r.heldMs === 'number' && r.heldMs >= HELD_AT_LEAST_MS && r.heldUnchanged === true],
      ['a change drawn mid-hold is answered within 250 ms', (r) => r.changeAnswered === true && r.beforeDraw === false && typeof r.changeMs === 'number' && r.changeMs < CHANGE_WITHIN_MS],
      ['a malformed since is 404', (r) => Array.isArray(r.malformed) && r.malformed.length >= 3 && r.malformed.every((s) => s === 404)]
    ]
  },
  S3: {
    title: 'keys into the shell',
    clauses: [
      ['a typed line and Enter run it', (r) => r.echo.outcomes.length > 0 && r.echo.outcomes.every((o) => o === 'done') && r.echo.ran === true],
      ['C-c ends sleep 1000 by the process table', (r) => r.sleep.pid > 0 && r.sleep.outcome === 'done' && r.sleep.ended === true],
      ['C-d ends a cat by the process table', (r) => r.cat.pid > 0 && r.cat.outcome === 'done' && r.cat.ended === true]
    ]
  },
  S4: {
    title: 'every key name in every recorder mode',
    clauses: [
      ['every recorder mode was staged', (r) => MODES.every((m) => r.modes[m]?.staged === true)],
      ['every key was answered done', (r) => MODES.every((m) => r.modes[m]?.notDone === 0)],
      ["every name's bytes equal keys-encoding.json's", (r) => MODES.every((m) => (r.modes[m]?.compared ?? 0) > 0 && (r.modes[m]?.differ ?? ['?']).length === 0)],
      ['text arrived as its exact bytes', (r) => r.text.length > 0 && r.text.every((t) => t.want === t.got)]
    ]
  },
  S5: {
    title: 'the one refusal',
    clauses: [
      ['(a) a question drawn after the picture: refused changed, nothing typed', (r) => refusedChanged(r.a) && noBytes(r.a)],
      ['(b) a desk keystroke after the picture: refused changed, nothing typed', (r) => r.b.deskReached === true && refusedChanged(r.b) && noBytes(r.b)],
      ["(c) Codex's second, identical question: the first Enter typed, the second refused with no byte at it", (r) => r.c.first === 'done' && r.c.firstCommits === 1 && refusedChanged(r.c.second) && r.c.secondBytes === ''],
      ["(d) Claude Code's hook before its dialog: refused changed, nothing typed", (r) => r.d.waiting === true && refusedChanged(r.d) && noBytes(r.d)],
      // The probe review (2026-10-05): ONE moved per Down sent, never "at least four of five", which passed a lost last Down.
      ['(e) arrows in a picker: every byte landed on the picture it was sent for', (r) => r.e.outcomes.length >= 5 && r.e.moves.length === r.e.outcomes.length && r.e.outcomes.every((o) => o === 'done') && r.e.moves.every((m) => m.drawn === m.picture)],
      ['(f) a picker that redraws 120 ms after each key: ten Downs, zero changed, every one landed', (r) => r.f.sent === 10 && r.f.changed === 0 && Array.isArray(r.f.outcomes) && r.f.outcomes.length === 10 && r.f.outcomes.every((o) => o === 'done') && r.f.moves.length === 10 && r.f.moves.every((m) => m.drawn === m.picture)],
      ['(g) Escape then Enter 20 ms apart: two reads, no closer than 50 ms less the landing slack', (r) => J(r.g.outcomes) === J(['done', 'done']) && J(r.g.reads) === J(['1b', '0d']) && typeof r.g.apartMs === 'number' && r.g.apartMs >= KEYS_GAP_MS - LANDING_SLACK_MS]
    ]
  },
  S6: {
    title: 'replays',
    clauses: [
      ['the same bytes again: 404, and one act', (r) => r.replay.first === 200 && r.replay.again === 404 && r.replay.reads === 1],
      ['the same write id fresh-signed: the recorded body, and one act', (r) => r.reused.first === 200 && r.reused.second === 200 && r.reused.sameBody === true && r.reused.reads === 1],
      ['an id nobody has: gone, nothing typed', (r) => r.nobody.outcome === 'refused' && r.nobody.reason === 'gone'],
      ['a Removed phone: refused before HTTP', (r) => r.removed.wasPaired === true && r.removed.status === 0]
    ]
  },
  S7: {
    title: 'hostile bodies',
    clauses: [
      ['65 items: malformed', (r) => r.items65.outcome === 'refused' && r.items65.reason === 'malformed'],
      ['1,025 text bytes: long', (r) => r.long.outcome === 'refused' && r.long.reason === 'long'],
      ['a C0 text: character', (r) => r.control.outcome === 'refused' && r.control.reason === 'character'],
      ['M-x: malformed', (r) => r.metaX.outcome === 'refused' && r.metaX.reason === 'malformed'],
      ['an extra key: malformed', (r) => r.extra.outcome === 'refused' && r.extra.reason === 'malformed'],
      ["the recorder's log did not move", (r) => r.bytes === '']
    ]
  },
  S8: {
    title: 'a session on the loopback machine',
    clauses: [
      ["the far shell's screen equals its far capture-pane -p", (r) => r.screen === true && r.rowsEqual === true],
      ['a typed line and Enter reach it', (r) => r.echo.outcomes.length > 0 && r.echo.outcomes.every((o) => o === 'done') && r.echo.ran === true],
      ['Up reaches a far recorder in application cursor mode as ESC O A', (r) => r.up.outcome === 'done' && r.up.hex === '1b4f41'],
      ["the far window's size is unchanged", (r) => r.sizeSame === true],
      ['the machine paused: keys refused unreachable, nothing typed after it resumes', (r) => r.paused.staged === true && r.paused.outcome === 'refused' && r.paused.reason === 'unreachable' && r.paused.bytesAfter === '']
    ]
  },
  S9: {
    title: 'status',
    // THE FIX ROUND OF 2026-10-06 narrowed the second clause, on the verify's
    // reading: "raises no needs_input in 10 s" was false of the phone and, by
    // the monitor's own code (unchanged), of the desk too. It now asks that
    // the phone's echo reads as the same echo typed at the desk, at HEAD and
    // at the parent: held at needs input or not, the same.
    clauses: [
      ["a phone key answers needs_input as the desk's does", (r) => r.wasWaiting === true && r.key === 'done' && r.left === true],
      ["a dialog-shaped echo typed from the phone reads as the same echo typed at the desk", (r) => r.echo.typed === true && r.echo.echoed === true && r.echo.drawnAsAChoice === true && r.echo.samples >= 15 && r.desk.echoed === true && r.desk.samples >= 15 && r.echo.waitingSamples > 0 === r.desk.waitingSamples > 0],
      ["the desk's echo reads at HEAD as it reads at the parent (today's class, stated)", (r) => r.parentDesk !== null && r.parentDesk.echoed === true && r.parentDesk.samples >= 15 && r.parentDesk.waitingSamples > 0 === r.desk.waitingSamples > 0]
    ]
  },
  S10: {
    title: 'forged guard rows beside four sessions for 60 s',
    clauses: [
      ['every session was read through the whole minute', (r) => r.reads >= 100 && r.sessions === 5 && r.unread === 0],
      ['every screen answer is its own session\'s', (r) => r.foreign === 0 && r.ownMissing === 0],
      ['no session read needs input, and each stayed listed', (r) => r.waitingSamples === 0 && r.missingSamples === 0]
    ]
  },
  S11: {
    title: 'nothing typed is kept, and the keys lines are D43\'s',
    clauses: [
      ['app.log was read and every file under the profile and HOME was scanned', (r) => r.appLogRead === true && r.filesScanned > 0],
      ['no typed canary in any file but the sessions\' own saved screens', (r) => r.hits.length === 0],
      ['no typed canary on any command line', (r) => r.psSamples > 0 && r.psHits === 0],
      ['the keys log lines are exactly what D43 owes', (r) => typeof r.owed === 'number' && r.logged === r.owed && r.owed > 0]
    ]
  },
  S12: {
    title: "/v1/session's answer time",
    clauses: [
      ['HEAD answers within 50 ms of the parent\'s p50', (r) => typeof r.parentP50 === 'number' && typeof r.headP50 === 'number' && r.headP50 - r.parentP50 <= SESSION_P50_BOUND_MS],
      ['a phone watching a dense screen was measured beside it', (r) => typeof r.watchedP50 === 'number' && r.watchedReads > 0]
    ]
  },
  S13: {
    title: 'the desk scrolled back',
    clauses: [
      ['a desk wheel parked the session in copy mode', (r) => r.parked.inMode === true && r.parked.paneInMode === '1'],
      ['a phone key brought the pane out of copy mode', (r) => r.key === 'done' && r.after.paneInMode === '0'],
      ["the desk's own scroll state reads live by its next poll", (r) => r.after.deskLive === true],
      ['the next desk wheel scrolls back as before', (r) => r.again.inMode === true && r.again.paneInMode === '1']
    ]
  },
  RN: {
    title: 'no regression against the parent',
    clauses: [
      ['⌘J\'s rows read the same at the parent and at HEAD', (r) => r.parent.rows.length > 0 && J(r.parent.rows) === J(r.head.rows)],
      ["Catch Me Up's lines read the same at the parent and at HEAD", (r) => r.parent.lines.length > 0 && J(r.parent.lines) === J(r.head.lines)]
    ]
  },
  RP: {
    title: 'the parent has no Screen',
    clauses: [
      ['GET /v1/screen is 404', (r) => r.screen === 404],
      ['POST /v1/keys is 404', (r) => r.keys === 404],
      ['no recorder read a byte', (r) => r.bytes === ''],
      ['the lines name neither keys nor screen', (r) => Array.isArray(routeIdsOf(r.lines)) && !routeIdsOf(r.lines).includes('keys') && !routeIdsOf(r.lines).includes('screen')]
    ]
  },
  RUN: {
    title: 'the run held its own refusals',
    clauses: [
      ['both preflights passed and the bare names were the stand-in', (r) => r.tailscalePreflight === true && r.dnsPreflights.length > 0 && r.dnsPreflights.every(Boolean) && r.resolved === true],
      ['every launch held the quiet agents', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every(Boolean)],
      ['no real Tailscale ran, and nothing forbidden reached the stand-in', (r) => r.realTailscale === 0 && r.samples > 0 && r.forbidden === 0],
      ['every stand-in and every agent stand-in ended', (r) => r.standinLeft === 0 && r.agentsLeft === 0],
      ['his shell history did not move', (r) => typeof r.historyBefore === 'string' && r.historyBefore !== '' && r.historyBefore === r.historyAfter]
    ]
  }
};

/** One arm's verdict: `{ ok, failed }`. A clause that throws is a failed clause. */
export function grade(id, reading) {
  const failed = [];
  for (const [name, predicate] of GRADERS[id].clauses) {
    let ok = false;
    try {
      ok = predicate(reading) === true;
    } catch {
      ok = false;
    }
    if (!ok) failed.push(name);
  }
  return { ok: failed.length === 0, failed };
}

// ---------------------------------------------------------------------------
// The fixtures: each grader's honest reading and one break per clause
// ---------------------------------------------------------------------------

const HONESTY = 'A phone you allow can see what any session’s screen shows and type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.';
const LINES = ['Tortie for Mac on p337 (tortie-test.ts.net)', ROUTE_LINE, WRITE_LINE];
const PARENT_LINES = ['Answers these and nothing else: blocked, choose, end, pair, say, session, sessions, turns', 'Lets an allowed phone end a session, answer a numbered question and send a session one message'];
const row1 = (name, extra = {}) => ({ name, status: 200, screen: true, problems: [], rowsEqual: true, geometryEqual: true, sizeSame: true, ...extra });
const moves = (n) => Array.from({ length: n }, (_, i) => ({ drawn: i % 9, picture: i % 9 }));

export const GRADER_FIXTURES = {
  S0: {
    pass: { lines: LINES, honesty: HONESTY, confirmBlock: `${LINES.join('\n')}\n${HONESTY}`, parentRanFirst: true, confirmStateBefore: 'changed', listening: true },
    breaks: {
      'the door reads changed after the parent confirmed it': (r) => void (r.confirmStateBefore = 'confirmed'),
      'the route line names keys and screen among the ten': (r) => void (r.lines = [LINES[0], PARENT_LINES[0], WRITE_LINE]),
      "the lines hold D35's write line": (r) => void (r.lines = [LINES[0], ROUTE_LINE, PARENT_LINES[1]]),
      'the confirm block draws the honesty sentence': (r) => void (r.confirmBlock = LINES.join('\n')),
      'Allow: the door listens': (r) => void (r.listening = false)
    },
    refused: [
      { what: 'a route line one route short', clause: 'the route line names keys and screen among the ten', edit: (r) => void (r.lines = [LINES[0], 'Answers these and nothing else: blocked, choose, end, keys, pair, say, session, sessions, turns', WRITE_LINE]) },
      // The probe review's own (2026-10-05).
      { what: "a confirm block still drawing 318's honesty sentence", clause: 'the confirm block draws the honesty sentence', edit: (r) => void (r.confirmBlock = `${LINES.join('\n')}\nA phone you allow can end a session, answer a numbered question and send a session one message. It can change nothing else on this Mac.`) },
      { what: 'a door already confirmed when the parent ran first (the hash did not move)', clause: 'the door reads changed after the parent confirmed it', edit: (r) => void (r.confirmStateBefore = 'confirmed') },
      { what: 'a confirm block that was never read', clause: 'the confirm block draws the honesty sentence', edit: (r) => void (r.confirmBlock = null) }
    ]
  },
  S1: {
    pass: { required: ['p337-claude', 'p337-shell'], rows: [row1('p337-claude'), row1('p337-shell')], fullAlternate: true, inlineAlternate: false },
    breaks: {
      'every session of the matrix answered a screen': (r) => void (r.rows[1].status = 404),
      'every answer is one the phone draws': (r) => void (r.rows[0].problems = ['cols 513 is outside 1 to 512']),
      "every row's text equals capture-pane -p": (r) => void (r.rows[1].rowsEqual = false),
      'cols, rows, cursor and alternate equal display-message': (r) => void (r.rows[0].geometryEqual = false),
      'the full-screen session reads alternate and the inline one does not': (r) => void (r.fullAlternate = false),
      'no window changed size': (r) => void (r.rows[0].sizeSame = false)
    },
    refused: [
      { what: 'a matrix with a session missing', clause: 'every session of the matrix answered a screen', edit: (r) => void (r.required = [...r.required, 'p337-gemini']) },
      // The probe review's own (2026-10-05).
      { what: 'a session answered with a why and no screen', clause: 'every session of the matrix answered a screen', edit: (r) => void (r.rows[0].screen = false) },
      { what: 'an answer the phone would refuse (a run past cols)', clause: 'every answer is one the phone draws', edit: (r) => void (r.rows[1].problems = ['row 3 covers 121 cells, past 120']) },
      { what: 'a full-screen session not read at all', clause: 'the full-screen session reads alternate and the inline one does not', edit: (r) => void (r.fullAlternate = null) },
      { what: 'a window whose size was not read (both empty)', clause: 'no window changed size', edit: (r) => void (r.rows[1].sizeSame = false) }
    ]
  },
  S2: {
    pass: { heldMs: 10_004, heldUnchanged: true, changeMs: 104, changeAnswered: true, beforeDraw: false, malformed: [404, 404, 404, 404] },
    breaks: {
      'a current since is held at least 9.5 s and answered unchanged': (r) => void (r.heldMs = 9_400),
      'a change drawn mid-hold is answered within 250 ms': (r) => void (r.changeMs = 250),
      'a malformed since is 404': (r) => void (r.malformed = [404, 200, 404])
    },
    refused: [
      { what: 'a hold answered with a screen', clause: 'a current since is held at least 9.5 s and answered unchanged', edit: (r) => void (r.heldUnchanged = false) },
      // The probe review's own (2026-10-05).
      { what: 'a held poll answered by some other change before the probe drew (2 ms after it drew, by the old reading)', clause: 'a change drawn mid-hold is answered within 250 ms', edit: (r) => Object.assign(r, { beforeDraw: true, changeMs: 2 }) },
      { what: 'an upper-case since answered 200', clause: 'a malformed since is 404', edit: (r) => void (r.malformed = [404, 404, 200, 404]) },
      { what: 'a hold cut at 9,499 ms', clause: 'a current since is held at least 9.5 s and answered unchanged', edit: (r) => void (r.heldMs = 9_499) }
    ]
  },
  S3: {
    pass: { echo: { outcomes: ['done', 'done'], ran: true }, sleep: { pid: 4242, outcome: 'done', ended: true }, cat: { pid: 4243, outcome: 'done', ended: true } },
    breaks: {
      'a typed line and Enter run it': (r) => void (r.echo.ran = false),
      'C-c ends sleep 1000 by the process table': (r) => void (r.sleep.ended = false),
      'C-d ends a cat by the process table': (r) => void (r.cat.pid = 0)
    },
    // The probe review's own (2026-10-05).
    refused: [
      { what: 'C-c answered done with the sleep still running', clause: 'C-c ends sleep 1000 by the process table', edit: (r) => void (r.sleep.ended = false) },
      { what: 'the Enter refused changed after the line was typed', clause: 'a typed line and Enter run it', edit: (r) => void (r.echo.outcomes = ['done', 'refused']) },
      { what: 'no write sent at all', clause: 'a typed line and Enter run it', edit: (r) => void (r.echo = { outcomes: [], ran: true }) },
      { what: 'C-d refused, the cat ended by something else', clause: 'C-d ends a cat by the process table', edit: (r) => void (r.cat.outcome = 'refused') }
    ]
  },
  S4: {
    pass: { modes: Object.fromEntries(MODES.map((m) => [m, { staged: true, notDone: 0, compared: 33, differ: [] }])), text: [{ want: '783b', got: '783b' }] },
    breaks: {
      'every recorder mode was staged': (r) => void (r.modes.kitty.staged = false),
      'every key was answered done': (r) => void (r.modes.mok2.notDone = 1),
      "every name's bytes equal keys-encoding.json's": (r) => void (r.modes.decckm.differ = ['Up']),
      'text arrived as its exact bytes': (r) => void (r.text[0].got = '78')
    },
    // The probe review's own (2026-10-05).
    refused: [
      { what: 'a mode staged and never compared (its fixture rows missing)', clause: "every name's bytes equal keys-encoding.json's", edit: (r) => void (r.modes.mok1 = { staged: true, notDone: 0, compared: 0, differ: [] }) },
      { what: 'é typed as its Latin-1 byte', clause: 'text arrived as its exact bytes', edit: (r) => void r.text.push({ want: 'c3a9', got: 'e9' }) },
      { what: 'no text sent at all', clause: 'text arrived as its exact bytes', edit: (r) => void (r.text = []) },
      { what: 'a mode missing from the reading', clause: 'every recorder mode was staged', edit: (r) => void delete r.modes.paste }
    ]
  },
  S5: {
    pass: {
      a: { outcome: 'refused', reason: 'changed', bytes: '' },
      b: { deskReached: true, outcome: 'refused', reason: 'changed', bytes: '' },
      c: { first: 'done', firstCommits: 1, second: { outcome: 'refused', reason: 'changed' }, secondBytes: '' },
      d: { waiting: true, outcome: 'refused', reason: 'changed', bytes: '' },
      e: { moves: moves(5), outcomes: ['done', 'done', 'done', 'done', 'done'] },
      f: { sent: 10, changed: 0, moves: moves(10), outcomes: Array.from({ length: 10 }, () => 'done') },
      g: { reads: ['1b', '0d'], apartMs: 51.3, outcomes: ['done', 'done'] }
    },
    breaks: {
      '(a) a question drawn after the picture: refused changed, nothing typed': (r) => void (r.a.bytes = '31'),
      '(b) a desk keystroke after the picture: refused changed, nothing typed': (r) => void (r.b.outcome = 'done'),
      "(c) Codex's second, identical question: the first Enter typed, the second refused with no byte at it": (r) => void (r.c.secondBytes = '0d'),
      "(d) Claude Code's hook before its dialog: refused changed, nothing typed": (r) => void (r.d.reason = 'unreachable'),
      '(e) arrows in a picker: every byte landed on the picture it was sent for': (r) => void (r.e.moves[2] = { drawn: 3, picture: 2 }),
      '(f) a picker that redraws 120 ms after each key: ten Downs, zero changed, every one landed': (r) => void (r.f.changed = 1),
      '(g) Escape then Enter 20 ms apart: two reads, no closer than 50 ms less the landing slack': (r) => void (r.g = { reads: ['1b0d'], apartMs: null })
    },
    refused: [
      { what: 'a desk keystroke that never reached the session', clause: '(b) a desk keystroke after the picture: refused changed, nothing typed', edit: (r) => void (r.b.deskReached = false) },
      { what: 'two reads 47.9 ms apart, past the landing slack', clause: '(g) Escape then Enter 20 ms apart: two reads, no closer than 50 ms less the landing slack', edit: (r) => void (r.g.apartMs = 47.9) },
      { what: 'the reads in the other order', clause: '(g) Escape then Enter 20 ms apart: two reads, no closer than 50 ms less the landing slack', edit: (r) => void (r.g = { reads: ['0d', '1b'], apartMs: 60 }) },
      { what: 'a Down lost', clause: '(f) a picker that redraws 120 ms after each key: ten Downs, zero changed, every one landed', edit: (r) => void r.f.moves.pop() },
      // The probe review's own (2026-10-05): each passed the graders as the builders left them.
      { what: 'the LAST of five Downs answered done and never landed', clause: '(e) arrows in a picker: every byte landed on the picture it was sent for', edit: (r) => void r.e.moves.pop() },
      { what: 'a Down that landed twice', clause: '(e) arrows in a picker: every byte landed on the picture it was sent for', edit: (r) => void r.e.moves.push({ drawn: 5, picture: 5 }) },
      { what: 'a Down answered failed that still landed', clause: '(f) a picker that redraws 120 ms after each key: ten Downs, zero changed, every one landed', edit: (r) => void (r.f.outcomes[4] = 'failed') },
      { what: 'Enter answered busy while Escape was in flight, so the gap was never reached', clause: '(g) Escape then Enter 20 ms apart: two reads, no closer than 50 ms less the landing slack', edit: (r) => void (r.g = { reads: ['1b'], apartMs: null, outcomes: ['done', 'busy'] }) },
      { what: 'two reads right but Enter refused (another writer typed the 0d)', clause: '(g) Escape then Enter 20 ms apart: two reads, no closer than 50 ms less the landing slack', edit: (r) => void (r.g.outcomes = ['done', 'refused']) },
      { what: "(a)'s refusal with a byte at the stand-in", clause: '(a) a question drawn after the picture: refused changed, nothing typed', edit: (r) => void (r.a.bytes = '0d') },
      { what: "(c)'s second question never drawn (its bytes unread)", clause: "(c) Codex's second, identical question: the first Enter typed, the second refused with no byte at it", edit: (r) => void (r.c.secondBytes = null) },
      { what: "(c)'s first Enter committing twice", clause: "(c) Codex's second, identical question: the first Enter typed, the second refused with no byte at it", edit: (r) => void (r.c.firstCommits = 2) },
      { what: "(d)'s status never read needs_input", clause: "(d) Claude Code's hook before its dialog: refused changed, nothing typed", edit: (r) => void (r.d.waiting = false) }
    ]
  },
  S6: {
    pass: { replay: { first: 200, again: 404, reads: 1 }, reused: { first: 200, second: 200, sameBody: true, reads: 1 }, nobody: { outcome: 'refused', reason: 'gone' }, removed: { status: 0, wasPaired: true } },
    breaks: {
      'the same bytes again: 404, and one act': (r) => void (r.replay.reads = 2),
      'the same write id fresh-signed: the recorded body, and one act': (r) => void (r.reused.sameBody = false),
      'an id nobody has: gone, nothing typed': (r) => void (r.nobody.reason = 'unreachable'),
      'a Removed phone: refused before HTTP': (r) => void (r.removed.status = 404)
    },
    // The probe review's own (2026-10-05).
    refused: [
      { what: 'the replay answered 200 and acted again', clause: 'the same bytes again: 404, and one act', edit: (r) => Object.assign(r.replay, { again: 200, reads: 2 }) },
      { what: 'the reused write id typed twice', clause: 'the same write id fresh-signed: the recorded body, and one act', edit: (r) => void (r.reused.reads = 2) },
      { what: 'an id nobody has typed into', clause: 'an id nobody has: gone, nothing typed', edit: (r) => void (r.nobody = { outcome: 'done', reason: null }) },
      { what: 'a Remove that never found phone B', clause: 'a Removed phone: refused before HTTP', edit: (r) => void (r.removed.wasPaired = false) }
    ]
  },
  S7: {
    pass: {
      items65: { outcome: 'refused', reason: 'malformed' },
      long: { outcome: 'refused', reason: 'long' },
      control: { outcome: 'refused', reason: 'character' },
      metaX: { outcome: 'refused', reason: 'malformed' },
      extra: { outcome: 'refused', reason: 'malformed' },
      bytes: ''
    },
    breaks: {
      '65 items: malformed': (r) => void (r.items65.outcome = 'done'),
      '1,025 text bytes: long': (r) => void (r.long.reason = 'malformed'),
      'a C0 text: character': (r) => void (r.control.outcome = 'done'),
      'M-x: malformed': (r) => void (r.metaX.reason = 'character'),
      'an extra key: malformed': (r) => void (r.extra.outcome = 'done'),
      "the recorder's log did not move": (r) => void (r.bytes = '61')
    },
    // The probe review's own (2026-10-05).
    refused: [
      { what: 'the C0 text refused and yet typed', clause: "the recorder's log did not move", edit: (r) => void (r.bytes = '6101') },
      { what: '65 items answered busy (never parsed)', clause: '65 items: malformed', edit: (r) => void (r.items65 = { outcome: 'busy', reason: null }) },
      { what: '1,025 text bytes cut at the door (no answer)', clause: '1,025 text bytes: long', edit: (r) => void (r.long = { outcome: null, reason: null }) },
      { what: 'an extra key taken', clause: 'an extra key: malformed', edit: (r) => void (r.extra = { outcome: 'done', reason: null }) }
    ]
  },
  S8: {
    pass: { screen: true, rowsEqual: true, echo: { outcomes: ['done', 'done'], ran: true }, up: { outcome: 'done', hex: '1b4f41' }, sizeSame: true, paused: { staged: true, outcome: 'refused', reason: 'unreachable', bytesAfter: '' } },
    breaks: {
      "the far shell's screen equals its far capture-pane -p": (r) => void (r.rowsEqual = false),
      'a typed line and Enter reach it': (r) => void (r.echo.ran = false),
      'Up reaches a far recorder in application cursor mode as ESC O A': (r) => void (r.up.hex = '1b5b41'),
      "the far window's size is unchanged": (r) => void (r.sizeSame = false),
      'the machine paused: keys refused unreachable, nothing typed after it resumes': (r) => void (r.paused.bytesAfter = '61')
    },
    refused: [
      { what: 'a pause that was never staged', clause: 'the machine paused: keys refused unreachable, nothing typed after it resumes', edit: (r) => void (r.paused.staged = false) },
      // The probe review's own (2026-10-05).
      { what: 'keys answered done while the machine was paused', clause: 'the machine paused: keys refused unreachable, nothing typed after it resumes', edit: (r) => Object.assign(r.paused, { outcome: 'done', reason: null }) },
      { what: 'the far screen never answered', clause: "the far shell's screen equals its far capture-pane -p", edit: (r) => Object.assign(r, { screen: false, rowsEqual: false }) },
      { what: 'Up answered done with no byte at the far recorder', clause: 'Up reaches a far recorder in application cursor mode as ESC O A', edit: (r) => void (r.up.hex = '') },
      { what: 'the typed line done and never run', clause: 'a typed line and Enter reach it', edit: (r) => void (r.echo.ran = false) }
    ]
  },
  S9: {
    // The verify's own reading (2026-10-06): held 20 of 20 after the phone's echo, and so after the desk's.
    pass: { wasWaiting: true, key: 'done', left: true, echo: { typed: true, echoed: true, drawnAsAChoice: true, samples: 20, waitingSamples: 20 }, desk: { fronted: true, echoed: true, samples: 20, waitingSamples: 20 }, parentDesk: { fronted: true, echoed: true, samples: 20, waitingSamples: 20 } },
    breaks: {
      "a phone key answers needs_input as the desk's does": (r) => void (r.left = false),
      'a dialog-shaped echo typed from the phone reads as the same echo typed at the desk': (r) => void (r.desk.waitingSamples = 0),
      "the desk's echo reads at HEAD as it reads at the parent (today's class, stated)": (r) => void (r.parentDesk.waitingSamples = 0)
    },
    // The probe review's own (2026-10-05), and the fix round's (2026-10-06).
    refused: [
      { what: 'an echo the Mac does not read as a choice (one row holding all three, as the arm typed it before)', clause: 'a dialog-shaped echo typed from the phone reads as the same echo typed at the desk', edit: (r) => void (r.echo.drawnAsAChoice = false) },
      { what: 'an echo whose rows were never drawn', clause: 'a dialog-shaped echo typed from the phone reads as the same echo typed at the desk', edit: (r) => void (r.echo.echoed = false) },
      { what: 'the echo of an older reading with neither field', clause: 'a dialog-shaped echo typed from the phone reads as the same echo typed at the desk', edit: (r) => void (r.echo = { typed: true, samples: 20, waitingSamples: 0 }) },
      { what: 'the phone held at needs input where the desk was not', clause: 'a dialog-shaped echo typed from the phone reads as the same echo typed at the desk', edit: (r) => Object.assign(r, { desk: { ...r.desk, waitingSamples: 0 }, parentDesk: { ...r.parentDesk, waitingSamples: 0 } }) },
      { what: 'a desk echo that was never drawn', clause: 'a dialog-shaped echo typed from the phone reads as the same echo typed at the desk', edit: (r) => void (r.desk.echoed = false) },
      { what: 'no parent measured', clause: "the desk's echo reads at HEAD as it reads at the parent (today's class, stated)", edit: (r) => void (r.parentDesk = null) },
      { what: 'the key answered done and the session left needs_input never', clause: "a phone key answers needs_input as the desk's does", edit: (r) => void (r.left = false) },
      { what: 'a key refused while the session waited', clause: "a phone key answers needs_input as the desk's does", edit: (r) => void (r.key = 'refused') }
    ]
  },
  S10: {
    pass: { reads: 600, sessions: 5, unread: 0, foreign: 0, ownMissing: 0, waitingSamples: 0, missingSamples: 0 },
    breaks: {
      'every session was read through the whole minute': (r) => void (r.unread = 1),
      "every screen answer is its own session's": (r) => void (r.foreign = 1),
      'no session read needs input, and each stayed listed': (r) => void (r.waitingSamples = 1)
    },
    refused: [
      { what: 'an answer missing its own label', clause: "every screen answer is its own session's", edit: (r) => void (r.ownMissing = 2) },
      // The probe review's own (2026-10-05).
      { what: 'a minute that read only 60 screens', clause: 'every session was read through the whole minute', edit: (r) => void (r.reads = 60) },
      { what: 'a forged session dropped from the list for a sample', clause: 'no session read needs input, and each stayed listed', edit: (r) => void (r.missingSamples = 1) },
      { what: 'four sessions, not five', clause: 'every session was read through the whole minute', edit: (r) => void (r.sessions = 4) }
    ]
  },
  S11: {
    pass: { appLogRead: true, filesScanned: 412, hits: [], snapshotHits: 3, psSamples: 180, psHits: 0, logged: 21, owed: 21 },
    breaks: {
      'app.log was read and every file under the profile and HOME was scanned': (r) => void (r.appLogRead = false),
      "no typed canary in any file but the sessions' own saved screens": (r) => void (r.hits = [{ file: 'profile/logs/app.log', canary: 'p337c00' }]),
      'no typed canary on any command line': (r) => void (r.psHits = 1),
      'the keys log lines are exactly what D43 owes': (r) => void (r.logged = 400)
    },
    refused: [
      { what: 'one line short of what is owed', clause: 'the keys log lines are exactly what D43 owes', edit: (r) => void (r.logged = 20) },
      // The probe review's own (2026-10-05).
      { what: "a canary in HOME's shell history", clause: "no typed canary in any file but the sessions' own saved screens", edit: (r) => void (r.hits = [{ file: 'home/.zsh_history', canary: 'p337c0a1b2c3d4e5f' }]) },
      { what: 'a ps sampler that never sampled', clause: 'no typed canary on any command line', edit: (r) => Object.assign(r, { psSamples: 0, psHits: 0 }) },
      { what: 'a run that owed and logged nothing', clause: 'the keys log lines are exactly what D43 owes', edit: (r) => Object.assign(r, { logged: 0, owed: 0 }) },
      { what: 'a scan that read no file', clause: 'app.log was read and every file under the profile and HOME was scanned', edit: (r) => void (r.filesScanned = 0) }
    ]
  },
  S12: {
    pass: { parentP50: 8.1, headP50: 9.4, watchedP50: 11.2, watchedReads: 20 },
    breaks: {
      "HEAD answers within 50 ms of the parent's p50": (r) => void (r.headP50 = 58.2),
      'a phone watching a dense screen was measured beside it': (r) => void (r.watchedReads = 0)
    },
    refused: [
      { what: 'no parent ran', clause: "HEAD answers within 50 ms of the parent's p50", edit: (r) => void (r.parentP50 = null) },
      // The probe review's own (2026-10-05).
      { what: 'HEAD 50.1 ms over the parent', clause: "HEAD answers within 50 ms of the parent's p50", edit: (r) => Object.assign(r, { parentP50: 8, headP50: 58.1 }) },
      { what: 'a watched p50 that was never measured', clause: 'a phone watching a dense screen was measured beside it', edit: (r) => void (r.watchedP50 = null) }
    ]
  },
  S13: {
    pass: { parked: { inMode: true, paneInMode: '1' }, key: 'done', after: { paneInMode: '0', deskLive: true }, again: { inMode: true, paneInMode: '1' } },
    breaks: {
      'a desk wheel parked the session in copy mode': (r) => void (r.parked.paneInMode = '0'),
      'a phone key brought the pane out of copy mode': (r) => void (r.after.paneInMode = '1'),
      "the desk's own scroll state reads live by its next poll": (r) => void (r.after.deskLive = false),
      'the next desk wheel scrolls back as before': (r) => void (r.again.inMode = false)
    },
    // The probe review's own (2026-10-05).
    refused: [
      { what: 'a phone key refused while the desk was scrolled back', clause: 'a phone key brought the pane out of copy mode', edit: (r) => void (r.key = 'refused') },
      { what: 'a wheel that never parked the desk (its state read live)', clause: 'a desk wheel parked the session in copy mode', edit: (r) => void (r.parked.inMode = false) },
      { what: "the pane's mode not read (an empty answer)", clause: 'a phone key brought the pane out of copy mode', edit: (r) => void (r.after.paneInMode = '') }
    ]
  },
  RN: {
    pass: { parent: { rows: [{ name: 'p337-rn-wait-<build>', label: 'needs input', excerpt: 'Bash' }], lines: ['p337-rn-wait-<build> :: Needs input'] }, head: { rows: [{ name: 'p337-rn-wait-<build>', label: 'needs input', excerpt: 'Bash' }], lines: ['p337-rn-wait-<build> :: Needs input'] } },
    breaks: {
      "⌘J's rows read the same at the parent and at HEAD": (r) => void (r.head.rows[0].excerpt = 'Screen'),
      "Catch Me Up's lines read the same at the parent and at HEAD": (r) => void (r.head.lines = ['p337-rn-wait-<build> :: Working'])
    },
    // The probe review's own (2026-10-05).
    refused: [
      { what: 'a row at HEAD the parent does not draw', clause: "⌘J's rows read the same at the parent and at HEAD", edit: (r) => void r.head.rows.push({ name: 'p337-rn-idle-<build>', label: 'idle', excerpt: '' }) },
      { what: 'a parent that drew no row (nothing compared)', clause: "⌘J's rows read the same at the parent and at HEAD", edit: (r) => Object.assign(r, { parent: { rows: [], lines: r.parent.lines }, head: { rows: [], lines: r.head.lines } }) }
    ]
  },
  RP: {
    pass: { screen: 404, keys: 404, bytes: '', lines: PARENT_LINES },
    breaks: {
      'GET /v1/screen is 404': (r) => void (r.screen = 200),
      'POST /v1/keys is 404': (r) => void (r.keys = 200),
      'no recorder read a byte': (r) => void (r.bytes = '1b'),
      'the lines name neither keys nor screen': (r) => void (r.lines = LINES)
    },
    // The probe review's own (2026-10-05).
    refused: [
      { what: 'the parent answering a screen read', clause: 'GET /v1/screen is 404', edit: (r) => void (r.screen = 200) },
      { what: 'a parent whose lines were never read', clause: 'the lines name neither keys nor screen', edit: (r) => void (r.lines = []) },
      { what: 'a canary typed into the parent', clause: 'no recorder read a byte', edit: (r) => void (r.bytes = '7033333763') }
    ]
  },
  RUN: {
    pass: { tailscalePreflight: true, dnsPreflights: [true, true], resolved: true, agentsHeld: [true, true], realTailscale: 0, samples: 900, forbidden: 0, standinLeft: 0, agentsLeft: 0, historyBefore: '733025 1791244365 | 23166 1790702242', historyAfter: '733025 1791244365 | 23166 1790702242' },
    breaks: {
      'both preflights passed and the bare names were the stand-in': (r) => void (r.resolved = false),
      'every launch held the quiet agents': (r) => void (r.agentsHeld = [true, false]),
      'no real Tailscale ran, and nothing forbidden reached the stand-in': (r) => void (r.realTailscale = 1),
      'every stand-in and every agent stand-in ended': (r) => void (r.agentsLeft = 1),
      'his shell history did not move': (r) => void (r.historyAfter = '733051 1791244999 | 23166 1790702242')
    },
    // The probe review's own (2026-10-05).
    refused: [
      { what: 'a Tailscale stand-in left running', clause: 'every stand-in and every agent stand-in ended', edit: (r) => void (r.standinLeft = 1) },
      { what: 'a forbidden argv at the stand-in', clause: 'no real Tailscale ran, and nothing forbidden reached the stand-in', edit: (r) => void (r.forbidden = 1) },
      { what: 'a sampler that never sampled', clause: 'no real Tailscale ran, and nothing forbidden reached the stand-in', edit: (r) => void (r.samples = 0) },
      { what: 'a history that could not be read', clause: 'his shell history did not move', edit: (r) => Object.assign(r, { historyBefore: '', historyAfter: '' }) },
      { what: 'a DNS preflight that refused one launch', clause: 'both preflights passed and the bare names were the stand-in', edit: (r) => void (r.dnsPreflights = [true, false]) }
    ]
  }
};

/** Every grader on its fixtures, and the pure readers on inputs of their own. Starts nothing. */
function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: (x) => structuredClone(x), say, J });
  // The route line by value, and the parent's.
  say(J(routeIdsOf([ROUTE_LINE])) === J(ROUTE_IDS) && routeIdsOf(['nothing']) === null, 'routeIdsOf reads the ten routes and nothing from a line that is not one');
  // The honesty sentence, read from the contract as HEAD has it.
  let contract = '';
  try {
    contract = readFileSync(join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts'), 'utf8');
  } catch {
    contract = '';
  }
  say(constWord(contract, 'POCKET_DOOR_HONESTY') === HONESTY, "the fixtures' honesty sentence is the contract's own, byte for byte");
  // Rows against a capture, the phone's way.
  const screen = { lines: [[{ text: 'ab  ', style: 0, cells: 4 }], [], [{ text: 'é', style: 0, cells: 1 }, { text: '漢', style: 1, cells: 2 }]] };
  say(rowsDiffer(screen, 'ab\n\né漢\n').length === 0, 'rowsDiffer takes rows equal with trailing blanks dropped');
  say(J(rowsDiffer(screen, 'ab\nx\né漢')) === J([1]), 'rowsDiffer names the row that differs');
  say(J(rowsDiffer(null, '')) === J([-1]), 'rowsDiffer refuses an answer with no screen');
  // The probe review (2026-10-05): the row COUNT, against capture-pane -p's own shape (every row ends in a line feed).
  const run1 = (text) => [{ text, style: 0, cells: [...text].length }];
  say(rowsDiffer({ lines: [run1('a'), run1('b'), [], [], [], []] }, 'a\nb\n\n\n\n\n').length === 0, 'rowsDiffer takes six rows against the six capture-pane -p printed, the last four blank');
  say(J(rowsDiffer(screen, 'ab\n\né漢\nx\n')) === J([-2]), 'rowsDiffer refuses an answer one row short of the pane');
  say(J(rowsDiffer({ lines: [...screen.lines, []] }, 'ab\n\né漢\n')) === J([-2]), 'rowsDiffer refuses an answer one row longer than the pane, even a blank one');
  say(rowsDiffer(screen, null).includes(-2), 'rowsDiffer refuses a capture that was never read');
  // THE PROBE REVIEW'S HONEST READINGS (2026-10-05): each the shape its arm
  // composes on a run that went right, written from the arm's code rather
  // than from the builder's fixtures, and each must pass.
  const recorders = MODES.map((m) => `p337-rec-${m.replace(',', '-')}`);
  const matrix = ['p337-claude', 'p337-claude-full', 'p337-codex', 'p337-gemini', 'p337-qwen', 'p337-shell', ...recorders];
  const honest = {
    S0: { lines: ['Publishes https://tortie-test.ts.net:8443', ROUTE_LINE, WRITE_LINE], honesty: HONESTY, confirmBlock: `Publishes https://tortie-test.ts.net:8443\n${ROUTE_LINE}\n${WRITE_LINE}\n${HONESTY}\nAllow`, parentRanFirst: false, confirmStateBefore: 'unconfirmed', listening: true },
    S1: { required: matrix, rows: matrix.map((name) => ({ ...row1(name), alternate: name === 'p337-claude-full' })), fullAlternate: true, inlineAlternate: false },
    S2: { heldMs: 10_003, heldUnchanged: true, changeMs: 97, changeAnswered: true, beforeDraw: false, malformed: [404, 404, 404, 404] },
    S3: { echo: { outcomes: ['done', 'done'], ran: true }, sleep: { pid: 50_123, outcome: 'done', ended: true }, cat: { pid: 50_160, outcome: 'done', ended: true } },
    S4: { modes: Object.fromEntries(MODES.map((m) => [m, { staged: true, notDone: 0, compared: 25, differ: [] }])), text: Array.from({ length: 11 }, (_, i) => ({ want: `6${String(i)}`, got: `6${String(i)}` })) },
    S5: {
      a: { outcome: 'refused', reason: 'changed', bytes: '' },
      b: { deskReached: true, outcome: 'refused', reason: 'changed', bytes: '' },
      c: { first: 'done', firstCommits: 1, second: { outcome: 'refused', reason: 'changed' }, secondBytes: '', handedAsking: false },
      d: { waiting: true, outcome: 'refused', reason: 'changed', bytes: '' },
      e: { moves: Array.from({ length: 5 }, (_, i) => ({ drawn: i, picture: i })), outcomes: Array.from({ length: 5 }, () => 'done') },
      f: { sent: 10, changed: 0, moves: Array.from({ length: 10 }, (_, i) => ({ drawn: i % 9, picture: i % 9 })), outcomes: Array.from({ length: 10 }, () => 'done') },
      g: { reads: ['1b', '0d'], apartMs: 48.4, outcomes: ['done', 'done'] }
    },
    S6: { replay: { first: 200, again: 404, reads: 1 }, reused: { first: 200, second: 200, sameBody: true, reads: 1 }, nobody: { outcome: 'refused', reason: 'gone' }, removed: { status: 0, wasPaired: true } },
    S8: { screen: true, rowsEqual: true, echo: { outcomes: ['done', 'done'], ran: true }, up: { outcome: 'done', hex: '1b4f41' }, sizeSame: true, paused: { staged: true, outcome: 'refused', reason: 'unreachable', bytesAfter: '' } },
    S9: { wasWaiting: true, key: 'done', left: true, echo: { typed: true, echoed: true, drawnAsAChoice: true, samples: 20, waitingSamples: 20 }, desk: { fronted: true, echoed: true, samples: 20, waitingSamples: 20 }, parentDesk: { fronted: true, echoed: true, samples: 20, waitingSamples: 20 } },
    S10: { reads: 1_180, sessions: 5, unread: 0, foreign: 0, ownMissing: 0, waitingSamples: 0, missingSamples: 0 },
    S11: { appLogRead: true, filesScanned: 1_904, hits: [], snapshotHits: 5, psSamples: 140, psHits: 0, logged: 38, owed: 38 },
    S12: { parentP50: 12.4, headP50: 11.9, watchedP50: 13.1, watchedReads: 31 },
    RP: { screen: 404, keys: 404, bytes: '', lines: ['Publishes https://tortie-test.ts.net:8443', ...PARENT_LINES] },
    RUN: { tailscalePreflight: true, dnsPreflights: [true, true], resolved: true, agentsHeld: [true, true], realTailscale: 0, samples: 2_410, forbidden: 0, standinLeft: 0, agentsLeft: 0, historyBefore: '733190 1791250793 | 23166 1790702242', historyAfter: '733190 1791250793 | 23166 1790702242' }
  };
  for (const [id, reading] of Object.entries(honest)) {
    const g = grade(id, reading);
    say(g.ok, `${id} passes the review's honest reading${g.ok ? '' : `, failing ${J(g.failed)}`}`);
  }
  const kw = (session, outcome, at) => ({ session, status: 200, outcome, reason: null, at });
  say(owedKeysLines([kw('a', 'done', 0), kw('a', 'done', 60_000)]) === 2 && owedKeysLines([kw('a', 'done', 0), kw('a', 'done', 59_999)]) === 1, "owedKeysLines draws the quiet minute's edge where writes.ts does (60,000 ms is a new line, 59,999 is not)");
  // Geometry.
  const g = geometryOf('120 40 7 39 1 0\n');
  say(g !== null && g.cols === 120 && g.alternate === false && geometryOf('120 40 7') === null, 'geometryOf reads the six numbers and refuses fewer');
  say(geometryEqual({ cols: 120, rows: 40, cursor: { x: 7, y: 39, visible: true }, alternate: false }, g), 'geometryEqual takes the same geometry');
  say(!geometryEqual({ cols: 120, rows: 40, cursor: { x: 7, y: 38, visible: true }, alternate: false }, g), 'geometryEqual refuses a cursor one row off');
  // The picker's cursor.
  say(pickerCursorOf({ lines: [[{ text: ' Pick one', style: 0, cells: 9 }], [{ text: '  1. First', style: 0, cells: 10 }], [{ text: '❯ 2. Second', style: 0, cells: 11 }]] }) === 1, "pickerCursorOf reads the option under the picker's drawn cursor");
  // D43's count, both ways.
  const w = (session, outcome, at, extra = {}) => ({ session, status: 200, outcome, reason: null, at, ...extra });
  say(owedKeysLines([w('a', 'done', 0), w('a', 'done', 1_000), w('a', 'done', 61_000), w('b', 'done', 2_000)]) === 3, 'owedKeysLines owes one done line per session per quiet minute');
  say(owedKeysLines([w('a', 'refused', 0, { reason: 'changed' }), w('a', 'refused', 10, { reason: 'changed' })]) === 2, 'owedKeysLines owes every other outcome every time');
  say(owedKeysLines([w('a', 'refused', 0, { reason: 'malformed' }), w('a', 'busy', 1), w('a', 'done', 2, { repeat: true }), { session: 'a', status: 404, outcome: null, at: 3 }]) === 0, 'owedKeysLines owes nothing for malformed, busy, a ledger repeat or a 404');
  // D37: the loopback machine trusts the run's key alone under
  // SCRATCH_MACHINE_NO_OWN_KEYS=1, and the yard writes its authorized_keys
  // through that one function. Each clause is red if its rule is taken out.
  {
    let asked = 0;
    const own = () => {
      asked += 1;
      return ['ssh-ed25519 HIS'];
    };
    const on = authorizedLinesFor('ssh-ed25519 RUN', { SCRATCH_MACHINE_NO_OWN_KEYS: '1' }, own);
    say(J(on) === J(['ssh-ed25519 RUN', '']) && asked === 0, "D37: with SCRATCH_MACHINE_NO_OWN_KEYS=1 the yard trusts the run's key alone, and the person's keys are never read");
    asked = 0;
    const off = authorizedLinesFor('ssh-ed25519 RUN', {}, own);
    say(J(off) === J(['ssh-ed25519 RUN', 'ssh-ed25519 HIS', '']) && asked === 1, "D37: off by default, the yard's authorized_keys is what it was");
    asked = 0;
    const near = ['yes', '0', 'true', ' 1', '1 '].map((v) => authorizedLinesFor('k', { SCRATCH_MACHINE_NO_OWN_KEYS: v }, own).length);
    say(near.every((len) => len === 3) && asked === 5, 'D37: the option is on only for the exact value 1');
    let yard = '';
    try {
      yard = readFileSync(join(ROOT, 'build', 'scratch-machine.mjs'), 'utf8');
    } catch {
      yard = '';
    }
    const from = yard.indexOf('export function scratchYard(');
    const to = yard.indexOf('export function scratchMachine(');
    const body = from === -1 || to <= from ? '' : yard.slice(from, to).replace(/\/\/[^\n]*/g, '');
    const calls = [...yard.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').matchAll(/\bownPublicKeys\s*\(/g)].length;
    say(/\bauthorizedLinesFor\s*\(/.test(body) && !/\bownPublicKeys\s*\(/.test(body) && calls === 1, "D37: scratchYard writes authorized_keys through authorizedLinesFor, and ownPublicKeys( is called nowhere but by it (its one spelling is its declaration)");
    say(noOwnKeysLine(['ssh-ed25519 RUN', ''].join('\n'), 'ssh-ed25519 RUN') === null && noOwnKeysLine(['ssh-ed25519 RUN', 'ssh-ed25519 HIS', ''].join('\n'), 'ssh-ed25519 RUN') !== null && noOwnKeysLine('', 'ssh-ed25519 RUN') !== null, "D37's live read: the yard's authorized_keys holds the run's key and nothing else");
  }
  // normalizeRn.
  const n = normalizeRn({ rows: [{ name: 'x-head', label: 'started 14:24', excerpt: '' }], lines: ['x-head :: a'] }, 'head');
  say(n.rows[0].name === 'x-<build>' && n.rows[0].label === 'started <time>' && n.lines[0] === 'x-<build> :: a', 'normalizeRn takes the suffix and the clock out');
  process.stdout.write(failures === 0 ? `[p337] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break, and the readers.\n` : `[p337] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked
// ---------------------------------------------------------------------------

const TAG = '[p337]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p337`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p337')) refuse(`"${SOCKET}" is not a gmux-p337 harness socket.`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
if ((process.env['SCRATCH_MACHINE_NO_OWN_KEYS'] ?? '') !== '1') refuse('SCRATCH_MACHINE_NO_OWN_KEYS is not 1, so the loopback machine would trust the person\'s own keys. Run `npm run probe:p337`.');
const CONFIG_ROOT = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
let carriage = null;
try {
  carriage = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8'));
} catch {
  carriage = null;
}
if (CONFIG_ROOT === '' || carriage === null) refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs.');
if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
{
  // D37, live: the yard build/with-scratch-machine.mjs made (its prefix
  // `p71-scratch`, spelled there) trusts the run's key alone. A prefix that
  // moved reads as no file and refuses, never as a pass.
  let authorized = null;
  let runKey = '';
  try {
    authorized = readFileSync(join(CONFIG_ROOT, 'p71-scratch-authorized'), 'utf8');
    runKey = readFileSync(join(CONFIG_ROOT, 'p71-scratch-userkey.pub'), 'utf8');
  } catch {
    authorized = null;
  }
  const why = authorized === null ? "the yard's authorized_keys was not found under GMUX_CONFIG_ROOT" : noOwnKeysLine(authorized, runKey);
  if (why !== null) refuse(`SCRATCH_MACHINE_NO_OWN_KEYS (D37): ${why}.`);
}
const FAR_TMUX = String(carriage.remoteTmuxPath ?? '');
if (!existsSync(FAR_TMUX)) refuse(`the carriage's tmux ${J(FAR_TMUX)} does not exist.`);
/** The scratch machine's sshd configuration file, which is what identifies its listener in the process table (S8's pause). */
const SSHD_CONF = join(CONFIG_ROOT, 'p71-scratch-sshd-one.conf');

const PARENT = (process.env['P337_PARENT_CHECKOUT'] ?? '').trim();
const KEEP = (process.env['P337_KEEP'] ?? '') === '1';
/** The sources a HEAD reading is made of; out/ older than any of them is refused. */
const SOURCES = [
  'src/main/screen/read.ts',
  'src/main/screen/compose.ts',
  'src/main/screen/watch.ts',
  'src/main/screen/keys.ts',
  'src/main/machines/remote-screen.ts',
  'src/main/machines/scroll-order.ts',
  'src/main/tmux/control-client.ts',
  'src/main/pocket/writes.ts',
  'src/main/pocket/facts.ts',
  'src/main/pocket/door/table.ts',
  'src/main/capabilities.ts'
];
for (const checkout of [ROOT, ...(PARENT === '' ? [] : [resolve(PARENT)])]) {
  const bundle = join(checkout, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) refuse(`${bundle} is missing. Build that checkout first.`);
  if (checkout === ROOT) {
    const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(bundle).mtimeMs);
    if (newer.length > 0) refuse(`out/ is older than ${newer.join(', ')}; build first.`);
  }
}

/** `stat -f '%z %m'` of his two history files, and nothing else read of them. */
function historyStat() {
  const home = process.env['HOME'] ?? '';
  const r = spawnSync('/usr/bin/stat', ['-f', '%z %m', join(home, '.zsh_history'), join(home, '.bash_history')], { encoding: 'utf8', timeout: 10_000 });
  return String(r.stdout ?? '').trim().replace(/\n/g, ' | ');
}
const HISTORY_BEFORE = historyStat();

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

mkdirSync(join(HARNESS_DIR, 'p337'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p337'));
const HOME = join(RUN, 'home');
const PROFILE = join(RUN, 'profile');
const PROJECTS = join(RUN, 'projects');
const FAR = join(RUN, 'far');
const BIN = join(HOME, '.local', 'bin');
/** OUTSIDE the profile and HOME, so S11's scan never reads the logs every typed byte is kept in. */
const STANDIN_DIR = join(RUN, 'standin');
const RECORDERS = join(RUN, 'recorders');
const DRAWN = join(RUN, 'drawn');
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const FAR_ENV = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
const OUT = join(ROOT, 'out', 'p337');
const RECORDER = join(ROOT, 'build', 'p337', 'key-recorder.mjs');
const DRAWER = join(ROOT, 'build', 'p337', 'measure-screen.mjs');
const TMUX = existsSync(join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux')) ? join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux') : 'tmux';
const KEYS_ENCODING = JSON.parse(readFileSync(join(ROOT, 'build', 'fixtures', 'screen', 'keys-encoding.json'), 'utf8'));
const KEY_NAMES = Object.freeze(['Escape', 'Tab', 'BTab', 'Enter', 'BSpace', 'Up', 'Down', 'Left', 'Right', ...'abcdefghijklmnopqrstuvwxyz'.split('').map((l) => `C-${l}`)]);
const N = {
  claude: 'p337-claude',
  claudeFull: 'p337-claude-full',
  codex: 'p337-codex',
  picker: 'p337-picker',
  gemini: 'p337-gemini',
  qwen: 'p337-qwen',
  shell: 'p337-shell',
  scroll: 'p337-scroll',
  busy: 'p337-rec-busy',
  far: 'p337-far',
  farRec: 'p337-far-rec',
  rnWait: 'p337-rn-wait',
  rnIdle: 'p337-rn-idle',
  s9Desk: 'p337-s9-desk'
};
const recName = (mode) => `p337-rec-${mode.replace(',', '-')}`;
const S10_NAMES = Object.freeze(['p337-s10-forged', 'p337-s10-a', 'p337-s10-b', 'p337-s10-c', 'p337-s10-d']);
/** RN's two builds' suffixes, THE SAME LENGTH (318's lesson: a line wraps where the path's length says). */
const RN_SUFFIX = Object.freeze({ parent: 'parent', head: 'headrn' });
/**
 * RN's projects, under a SHORT root (the fix round of 2026-10-06). The Claude
 * stand-in cuts every row to its pane's width, and Claude Code's second
 * option names the project's folder: under the harness directory that row was
 * 160 columns, so at the parent's 142 it lost `from this project` and at
 * HEAD's wider pane it did not, and RN read a difference no code made (the
 * suffixes were already one length). Here the row is under 90 columns, which
 * every desk pane this probe draws holds whole. Removed in the `finally`.
 */
const RN_ROOT = join('/private/tmp', `p337rn-${String(process.pid)}`);

/** The words main says, read from the checkout's own source (never typed here twice). */
const WORDS_HEAD = { honesty: constWord(readFileSync(join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts'), 'utf8'), 'POCKET_DOOR_HONESTY') };

const report = { checkout: ROOT, parent: PARENT === '' ? null : resolve(PARENT), arms: [], readings: {} };
let failures = 0;
let unreadable = 0;
function arm(id, reading) {
  const g = grade(id, reading);
  report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
  report.readings[id] = reading;
  if (!g.ok) failures += 1;
  say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
}
function cannotRead(id, why, reading) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  if (reading !== undefined) report.readings[id] = reading;
  say(`UNREADABLE ${id}: ${why}`);
}
/** Run one arm's body; a body that throws is that arm's UNREADABLE, and the run goes on. */
async function armSafely(id, body) {
  try {
    await body();
  } catch (err) {
    cannotRead(id, `the arm stopped: ${String(err?.message ?? err)}`);
  }
}

// ---------------------------------------------------------------------------
// The guards: the stand-ins, the samplers, the paused sshd
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
let watch = null;
let psSampler = null;
let lastShim = 0;
let lastApp = 0;
let tailscalePreflight = false;
let resolvedOk = false;
const dnsPreflights = [];
const agentsHeld = [];
/** S8's paused pids, each resumed in the `finally` and on exit. */
const stopped = new Set();
function resumeStopped() {
  for (const pid of [...stopped]) {
    try {
      process.kill(pid, 'SIGCONT');
    } catch {
      /* gone */
    }
    stopped.delete(pid);
  }
}
process.on('exit', resumeStopped);

/** The forwarder the stand-in's NEWEST live Funnel child listens on, or 0 (318's lesson: never the oldest). */
const forwarderPort = () => standin?.readFunnel().at(-1)?.forwarderPort ?? 0;

/** S11's process sampler: `ps -ww -ax -o command=` every 500 ms, each sample searched for every canary typed so far. */
function startPsSampler(canaries) {
  let samples = 0;
  const hits = [];
  let busy = false;
  const timer = setInterval(() => {
    if (busy) return;
    busy = true;
    execFile('/bin/ps', ['-ww', '-ax', '-o', 'command='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 5_000 }, (err, stdout) => {
      busy = false;
      if (err !== null) return;
      samples += 1;
      for (const c of canaries) if (String(stdout).includes(c)) hits.push(c);
    });
  }, 500);
  return { stop: () => clearInterval(timer), samples: () => samples, hits: () => hits.length };
}

/** The scratch machine's sshd listener as started, or as macOS's sshd renames it (317's reader). */
function isScratchSshd(command, conf) {
  const started = `/usr/sbin/sshd -D -f ${String(conf)}`;
  const c = String(command ?? '');
  return c === started || c.startsWith(`sshd: ${started} [listener]`);
}
/** The process table, read with `ps -ww -ax` (never a pattern), as a pid map and a parent map. */
function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,stat=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const children = new Map();
  const rows = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line);
    if (m === null) continue;
    const pid = Number(m[1]);
    const ppid = Number(m[2]);
    rows.set(pid, { pid, ppid, stat: m[3], command: m[4] });
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  return { children, rows };
}
function descendantsOf(children, pid) {
  const out = [];
  const walk = (one) => {
    for (const child of children.get(one) ?? []) {
      walk(child);
      out.push(child);
    }
  };
  walk(pid);
  return out;
}
/** Whether `pid` is a live process that is not a zombie. */
function liveProcess(pid) {
  const row = processTable().rows.get(pid);
  return row !== undefined && !row.stat.startsWith('Z');
}

// ---------------------------------------------------------------------------
// The app
// ---------------------------------------------------------------------------

const INHERITED = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_|CODEX_)/.test(n) || n === 'TERM_SESSION_ID').map((n) => [n, undefined]));

const devtoolsPort = () => {
  try {
    return Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
async function targets() {
  const port = devtoolsPort();
  if (!(port > 0)) return [];
  try {
    return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
  } catch {
    return [];
  }
}
/** The app window, once its bridge and the drives this run uses are armed. */
async function attachMain(timeoutMs = 150_000) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    const picked = pickRendererTarget(await targets());
    if (picked.target !== null) {
      const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      for (let i = 0; i < 200; i += 1) {
        if ((await cdpEval(cdp, "window.gmux !== undefined && window.gmux.pocket !== undefined && typeof window.__p293 === 'object' && typeof window.__gmuxP95 === 'object' && typeof window.__gmuxP93 === 'object'")) === true) return cdp;
        await sleep(300);
      }
      throw new Error('the app never armed window.gmux.pocket and the drives');
    }
    why = picked.why;
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}
/** Settings then Phone, as a person opens it. */
async function attachSettings(main, timeoutMs = 30_000) {
  await cdpEval(main, 'window.gmux.openSettings().then(() => true)');
  const started = Date.now();
  for (;;) {
    const t = (await targets()).find((x) => x.type === 'page' && /\/renderer\/settings\/index\.html/.test(String(x.url)) && typeof x.webSocketDebuggerUrl === 'string');
    if (t !== undefined) {
      const cdp = await wsConnect(t.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      await cdpEval(cdp, "(() => { location.hash = 'phone'; return true; })()");
      for (let i = 0; i < 100; i += 1) {
        if ((await cdpEval(cdp, `document.querySelector('section[aria-label="Phone"]') !== null`)) === true) return cdp;
        await sleep(200);
      }
      throw new Error('Settings opened and never drew the Phone section');
    }
    if (Date.now() - started > timeoutMs) throw new Error('no Settings window');
    await sleep(300);
  }
}
async function pocket(cdp, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`));
}
async function bridge(cdp, expr) {
  return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, 180_000));
}
async function status(cdp) {
  const got = await pocket(cdp, 'status');
  return got.ok ? got.value : null;
}
async function waitStatus(cdp, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    last = await status(cdp);
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(300);
  }
}
async function waitFor(test, ms, every = 300) {
  const started = Date.now();
  for (;;) {
    const v = await test();
    if (v) return v;
    if (Date.now() - started >= ms) return null;
    await sleep(every);
  }
}
/** Main's sessions, with the facts the arms read. */
async function sessions(cdp) {
  const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName, status: s.status, agent: s.agent, machine: s.machine ? { id: s.machine.id } : null })))');
  return got.ok ? got.value : [];
}
const byName = async (cdp, name) => (await sessions(cdp)).find((s) => s.name === name) ?? null;
const statusOf = async (cdp, id) => (await sessions(cdp)).find((s) => s.id === id)?.status ?? null;

/** Confirm the door as it stands and wait until a code may show (318's `confirmDoor`). */
async function confirmDoor(cdp) {
  const now = await waitStatus(
    cdp,
    (s) => (s.state === 'listening' && s.confirmState === 'confirmed') || (s.confirmable === true && s.state !== 'opening' && s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`))),
    40_000
  );
  if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: now.status?.state, refusal: now.status?.refusal })}`, lines: now.status?.confirmLines ?? [], before: now.status?.confirmState ?? null };
  const before = now.status.confirmState;
  const lines = now.status.confirmLines;
  if (!(now.status.state === 'listening' && now.status.confirmState === 'confirmed')) {
    const c = await pocket(cdp, 'confirmDoor', { linesRead: lines, hashRead: now.status.confirmHash });
    if (!c.ok || c.value.allowed !== true) return { ok: false, why: c.ok ? `confirm allowed=${String(c.value.allowed)}` : c.error, lines, before };
  }
  const l = await waitStatus(cdp, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 70_000);
  return { ok: l.ok, why: l.ok ? '' : `never pairable: ${J({ state: l.status?.state, pairable: l.status?.pairable })}`, lines, before };
}

/** A node phone, paired through the forwarder and allowed through the bridge. */
async function pairPhone(cdp, label) {
  const offered = await pocket(cdp, 'beginPairing');
  if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
  const read = readOffer(offered.value.payload);
  if (!read.ok) return { ok: false, why: `the code does not read the phone's way: ${read.why}` };
  const phone = makePhone(label, read.offer.dx);
  const door = { get port() { return forwarderPort(); }, name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
  const paired = await pairThrough(door, read.offer, phone, {
    tries: 20,
    everyMs: 500,
    between: async () => {
      const sheet = await pocket(cdp, 'pairingState');
      if (sheet.ok && sheet.value.state === 'presented') await pocket(cdp, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash });
    }
  });
  await pocket(cdp, 'cancelPairing');
  if (!paired.ok) return { ok: false, why: `pairing answered ${J(paired.words)} (${paired.why})` };
  const first = await signedGet(phone, door, '/v1/blocked');
  return { ok: first.status === 200, why: first.status === 200 ? '' : `the first read answered ${String(first.status)}`, phone, door };
}

const appLogText = () => {
  try {
    return readFileSync(APP_LOG, 'utf8');
  } catch {
    return null;
  }
};
const countLog = (needle) => (appLogText() ?? '').split('\n').filter((l) => l.includes(needle)).length;

/** One tmux command on the run's own scratch socket; its output, or null. */
const tmuxOut = (...args) => {
  const r = spawnSync(TMUX, ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
/** The same on the loopback machine's own server. */
const farOut = (...args) => {
  const r = spawnSync(FAR_TMUX, ['-L', SOCKET, '-f', '/dev/null', ...args], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const GEOMETRY = '#{pane_width} #{pane_height} #{cursor_x} #{cursor_y} #{cursor_flag} #{alternate_on}';
const SIZE = '#{window_width}x#{window_height}';

function writeMachines(withMachine, path = MACHINES_JSON) {
  if (!path.startsWith(`${RUN}/`) && !path.startsWith(`${CONFIG_ROOT}/`)) throw new Error(`the machines file ${path} is outside this run's scratch world; nothing is written there`);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const machines = withMachine ? [{ id: MACHINE_ID, label: 'p337 loopback', host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: FAR_TMUX }] : [];
  writeFileSync(path, `${J({ schema: 1, machines })}\n`, 'utf8');
}

function launchOptions(label, checkout) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: checkout,
    tmuxSocket: SOCKET,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({
      ...INHERITED,
      HOME,
      ZDOTDIR: HOME,
      HISTFILE: '/dev/null',
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: CONFIG_ROOT,
      GMUX_HARNESS_DIR: HARNESS_DIR,
      // THE STAND-INS. A development build honours both; a packaged one ignores them.
      GMUX_TAILSCALE_BIN: standin.binPath,
      [NAME_SERVERS_VAR]: dns.servers,
      ...(typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
    }),
    graceMs: 8_000,
    ceilingMs: 3_600_000
  };
}

/** One launch through the helper, after both preflights and the quiet agents. */
async function launch(label, checkout, body) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
  writeQuietAgents(PROFILE);
  return withElectron(launchOptions(label, checkout), async (handle) => {
    lastShim = handle.pid;
    const appNow = () => {
      try {
        lastApp = handle.appPid() || lastApp;
      } catch {
        /* not up yet */
      }
      return lastApp;
    };
    appNow();
    const main = await attachMain();
    appNow();
    try {
      const list = JSON.parse(await cdpEval(main, 'window.gmux.agentsList().then((r) => JSON.stringify(r))'));
      const held = quietAgentsHeld(list);
      agentsHeld.push(held.ok);
      if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
      await body(main, handle);
    } finally {
      main.close();
      appNow();
    }
  });
}

// ---------------------------------------------------------------------------
// The sessions, the stand-ins and the recorders, through their own files
// ---------------------------------------------------------------------------

/** The stand-in a session runs now: the newest hello naming its id. */
function standinOf(sessionId) {
  const mine = hellos(STANDIN_DIR).filter((h) => h.session === sessionId);
  mine.sort((a, b) => Number(a.at) - Number(b.at));
  return mine[mine.length - 1] ?? null;
}
const seqs = new Map();
/** Tell a session's stand-in some ops and wait until it applied them. */
async function tell(sessionId, ops) {
  const s = standinOf(sessionId);
  if (s === null) throw new Error(`no stand-in said hello for ${sessionId}`);
  const seq = (seqs.get(s.pid) ?? 0) + 1;
  seqs.set(s.pid, seq);
  sendOps(STANDIN_DIR, s.pid, seq, ops);
  const ok = await waitFor(() => Number(readState(STANDIN_DIR, s.pid)?.seq ?? 0) >= seq, 5_000, 25);
  if (ok === null) throw new Error(`the stand-in ${String(s.pid)} never applied seq ${String(seq)}`);
  return s;
}
const stateOf = (sessionId) => {
  const s = standinOf(sessionId);
  return s === null ? null : readState(STANDIN_DIR, s.pid);
};
function logFrom(sessionId, from) {
  const s = standinOf(sessionId);
  return s === null ? [] : readLog(STANDIN_DIR, s.pid).filter((l) => l.t >= BigInt(from));
}
const bytesFrom = (sessionId, from) => logFrom(sessionId, from).filter((l) => l.kind === 'read').map((l) => String(l.hex)).join('');

/** Each recorder's log, by session id. */
const recorderLogs = new Map();
const recorderReads = (id) => {
  try {
    return readRecorderLog(readFileSync(recorderLogs.get(id) ?? '', 'utf8')).reads.map((r) => ({ t: BigInt(r.t), hex: r.hex }));
  } catch {
    return [];
  }
};
const recBytesFrom = (id, from) => recorderReads(id).filter((r) => r.t >= BigInt(from)).map((r) => r.hex).join('');

/** Each session's project folder, so `front()` can bring its project forward. */
const projectOf = new Map();
const tmuxNameOf = new Map();

/** An agent session made the way a person makes one, and its stand-in's hello. */
async function agentSession(main, name, agent, project) {
  mkdirSync(project, { recursive: true });
  writeFileSync(join(project, 'README.md'), `# ${name}\n`);
  await bridge(main, `window.__p293.addProject(${J(project)})`);
  const made = await bridge(main, `window.gmux.sessions.create(${J({ name, projectPath: project, cwd: project, agent })}).then((s) => s.id)`);
  if (!made.ok || typeof made.value !== 'string') throw new Error(`${name} was not created: ${J(made)}`);
  const id = made.value;
  projectOf.set(id, project);
  const hello = await waitFor(() => standinOf(id), 60_000, 250);
  if (hello === null) throw new Error(`${name}'s stand-in never said hello, so Tortie launched something else as ${agent}`);
  return id;
}
/** A shell, made through the session manager's drive, local or on the machine. */
async function shell(main, path, name, machineId) {
  mkdirSync(path, { recursive: true });
  if (machineId === undefined) await bridge(main, `window.__p293.addProject(${J(path)})`);
  const got = await bridge(main, `window.__p293.createSession(${J(machineId === undefined ? { path, name } : { path, name, machineId })})`);
  if (!got.ok || typeof got.value !== 'string') throw new Error(`${name} was not created: ${J(got)}`);
  projectOf.set(got.value, path);
  return got.value;
}
/** The tmux target of a session, by its exact tmux name. */
async function targetOf(main, id) {
  if (!tmuxNameOf.has(id)) {
    const s = (await sessions(main)).find((x) => x.id === id);
    if (s === undefined) throw new Error(`no session ${id}`);
    tmuxNameOf.set(id, s.tmuxName);
  }
  return `=${tmuxNameOf.get(id)}:`;
}
/** A command started in a fresh shell session, by the probe's own tmux on the scratch socket, once its prompt is drawn. */
async function startIn(main, id, command, { far = false } = {}) {
  const target = await targetOf(main, id);
  const read = far ? farOut : tmuxOut;
  // This Mac's scratch shell draws `p337 %`; the machine's quiet shell draws a prompt of its own, so there anything inked will do.
  const prompt = await waitFor(() => {
    const text = String(read('capture-pane', '-p', '-t', target) ?? '');
    return (far ? text.trim() !== '' : text.includes('p337')) ? true : null;
  }, 30_000, 250);
  if (prompt === null) throw new Error(`no prompt in ${target}`);
  read('send-keys', '-t', target, '-l', command);
  read('send-keys', '-t', target, 'Enter');
}
/** A key recorder in a shell session, and its log. */
async function recorderSession(main, name, modes, { busy = 0, machineId, path } = {}) {
  const id = await shell(main, path ?? join(PROJECTS, name), name, machineId);
  const log = join(RECORDERS, `${name}.jsonl`);
  recorderLogs.set(id, log);
  await startIn(main, id, `exec '${process.execPath}' '${RECORDER}' '${log}' ${modes}${busy > 0 ? ` --busy=${String(busy)}` : ''} --label=${name}`, { far: machineId !== undefined });
  const ready = await waitFor(() => {
    try {
      return readRecorderLog(readFileSync(log, 'utf8')).ready !== null ? true : null;
    } catch {
      return null;
    }
  }, 20_000, 200);
  if (ready === null) throw new Error(`${name}'s recorder never said it was ready`);
  return id;
}
/** A drawer in a shell session: the bytes of `file`, held. */
async function drawerSession(main, name, file) {
  const id = await shell(main, join(PROJECTS, name), name);
  await startIn(main, id, `exec '${process.execPath}' '${DRAWER}' --draw '${file}'`);
  return id;
}

/** Remove the scratch HOME's Claude registry files whose process is gone; how many (probe:p318's sweep). */
function sweepDeadRegistry() {
  const dir = join(HOME, '.claude', 'sessions');
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return 0;
  }
  let swept = 0;
  for (const name of names) {
    const m = /^([0-9]+)\.json$/.exec(name);
    if (m === null) continue;
    try {
      process.kill(Number(m[1]), 0);
      continue;
    } catch (err) {
      if (err?.code === 'EPERM') continue;
    }
    rmSync(join(dir, name), { force: true });
    swept += 1;
  }
  return swept;
}

/** The session active in its project, its terminal mounted (318's `front`). */
const select = (main, id) => bridge(main, `window.__gmuxP95.select(${J(id)})`);
async function front(main, id) {
  const path = projectOf.get(id);
  if (path !== undefined) await bridge(main, `window.__gmuxP95.openLocal(${J(path)})`);
  const st = await select(main, id);
  return st.ok === true && st.value?.activeSessionId === id && st.value?.terminal === true;
}
/** A desk KEYSTROKE, as TerminalPane's `onData` sends one. */
const desk = (main, id, text) => cdpEval(main, `(window.gmux.noteTerminalInput(${J(id)}), window.gmux.term.sendInput(${J(id)}, ${J(text)}), true)`);

/**
 * S9's dialog-shaped echo, as the Mac's own detector reads one (the probe
 * review, 2026-10-05): a question row, a `1.` row and a `2.` row, each
 * starting a row of its own (`detectDialogRows`' QUEST, OPT1 and OPT2), the
 * shape 318's R16 drew. A key's text holds no line break, so each row is a
 * message of its own, which the stand-in echoes on its own row.
 */
const S9_ECHO_ROWS = Object.freeze(['Do you want to proceed?', '❯ 1. Yes', '  2. No']);

/**
 * THE FIX ROUND OF 2026-10-06: S9's echo typed by the phone `P`, or AT THE
 * DESK when `P` is null (TerminalPane's own keystroke, the session brought in
 * front first), into a Claude stand-in idle at its prompt; then the session's
 * status sampled every 500 ms for 10 s. The verify read the phone's echo held
 * at needs input in 20 of 20 samples, and the monitor's release
 * (`noteUserInput`, src/main/activity/monitor.ts, unchanged by this phase)
 * moves an existing needs input and never stops the next tick from reading a
 * numbered question off the screen, whoever typed it. So the same rows are
 * typed at the desk at HEAD and at the parent, and S9 asks that the phone's
 * echo reads as theirs: an existing class is stated, not hidden, and a phone
 * that read worse than the desk would fail.
 */
async function echoAndSample(main, id, P) {
  await waitFor(() => (stateOf(id)?.mode === 'idle' ? true : null), 10_000, 100);
  const fronted = P === null ? await front(main, id) : null;
  const outcomes = [];
  for (const row of S9_ECHO_ROWS) {
    const from = hr();
    const hex = Buffer.from(row, 'utf8').toString('hex');
    if (P === null) {
      await desk(main, id, row);
      await sleep(60);
      await desk(main, id, '\r');
      outcomes.push('desk');
    } else {
      outcomes.push((await keys(P, id, [{ t: row }], await picture(P, id))).outcome);
      outcomes.push((await keys(P, id, [{ k: 'Enter' }], await picture(P, id))).outcome);
    }
    await waitFor(() => (logFrom(id, from).some((l) => l.kind === 'submitted' && l.hex === hex) ? true : null), 5_000, 50);
    await waitFor(() => (stateOf(id)?.mode === 'idle' ? true : null), 10_000, 100);
  }
  const pane = String(tmuxOut('capture-pane', '-p', '-t', await targetOf(main, id)) ?? '').split('\n').map((l) => l.replace(/ +$/, ''));
  const echoed = S9_ECHO_ROWS.every((row) => pane.includes(row));
  let samples = 0;
  let waitingSamples = 0;
  const until = Date.now() + 10_000;
  while (Date.now() < until) {
    samples += 1;
    if ((await statusOf(main, id)) === 'needs_input') waitingSamples += 1;
    await sleep(500);
  }
  return { fronted, outcomes, echoed, samples, waitingSamples };
}

// ---------------------------------------------------------------------------
// The phone's two Screen verbs, recorded
// ---------------------------------------------------------------------------

/** Every keys write this run sent, for S11's D43 count. */
const keysWrites = [];
/** A canary in every text that can carry one, for S11's scan. */
const canaries = new Set();
const canary = () => {
  const c = `p337c${randomBytes(6).toString('hex')}`;
  canaries.add(c);
  return c;
};
const nonce = () => randomUUID().replace(/-/g, '');

/** One `/v1/screen` read with no `since`: the answer's screen, or null. */
async function picture(P, id) {
  const r = await screenRead(P.phone, P.door, id);
  return r.answer?.screen ?? null;
}
/** One keys write against a picture; its status, outcome and reason, recorded for S11. */
async function keys(P, id, items, pic, { door = P.door, write = freshWriteId(), repeat = false, ...options } = {}) {
  const r = await sendKeys(P.phone, door, id, items, { turn: pic?.turn ?? '0123456789abcdef-1', dialog: pic?.dialog ?? null, write, nonce: nonce(), ...options });
  const a = answerOf(r);
  const one = { session: id, status: r.status, outcome: a?.outcome ?? null, reason: a?.reason ?? null, at: Date.now(), repeat, body: r.status === 200 ? r.body : null, write };
  keysWrites.push(one);
  return one;
}
/** A recorder's bytes for one keys write, read after the write and a short settle. */
async function keyInto(P, id, items, pic, settleMs = 60) {
  const from = hr();
  const k = await keys(P, id, items, pic);
  await sleep(settleMs);
  return { ...k, hex: recBytesFrom(id, from) };
}

/** `/v1/session` for one id, 20 reads, p50. */
async function sessionReadP50(P, id) {
  const times = [];
  for (let i = 0; i < 20; i += 1) {
    const s = hr();
    await signedGet(P.phone, P.door, `/v1/session?id=${encodeURIComponent(id)}`);
    times.push(msBetween(s, hr()));
  }
  return quantile(times, 0.5);
}

/** ⌘J's rows and Catch Me Up's lines, for the sessions whose names end in `suffix` (318's reader). */
async function readRn(main, id, suffix) {
  await select(main, id);
  await cdpEval(main, 'window.__gmuxP93.openPanel()');
  await sleep(700);
  const rows = JSON.parse(await cdpEval(main, `JSON.stringify([...document.querySelectorAll('.attention-row')].map((row) => ({ name: row.querySelector('.attention-session')?.textContent ?? '', label: (row.getAttribute('aria-label') ?? '').trim(), excerpt: row.querySelector('.attention-excerpt')?.textContent ?? '' })))`));
  await cdpEval(main, 'window.__gmuxP93.closePanel()');
  await sleep(300);
  await cdpEval(main, "window.__gmuxShotDrive({ overview: { level: 'project' } })");
  await sleep(1_400);
  const lines = JSON.parse(await cdpEval(main, `JSON.stringify([...document.querySelectorAll('.overview-line')].map((el) => [el.querySelector('.overview-line-name-text')?.textContent ?? '', el.querySelector('.overview-line-state')?.textContent ?? '', el.querySelector('.overview-line-outcome')?.textContent ?? '', el.querySelector('.overview-line-question')?.textContent ?? '', [...el.querySelectorAll('.overview-line-option-text')].map((o) => o.textContent ?? '').join(' | ')].join(' :: ')))`));
  await cdpEval(main, "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); 1");
  await sleep(400);
  return normalizeRn({ rows: rows.filter((r) => r.name.endsWith(suffix)), lines: lines.filter((l) => l.split(' :: ')[0].endsWith(suffix)) }, suffix);
}
/** RN's sessions at one build, a waiting and an idle stand-in, read; and S12's p50 on the waiting one. */
async function rnAt(main, P, suffix) {
  const project = join(RN_ROOT, suffix);
  const wait = await agentSession(main, `${N.rnWait}-${suffix}`, 'claude', project);
  await agentSession(main, `${N.rnIdle}-${suffix}`, 'codex', project);
  await tell(wait, [{ op: 'press', command: 'ls' }]);
  await waitFor(async () => ((await statusOf(main, wait)) === 'needs_input' ? true : null), 20_000, 250);
  await sleep(2_500);
  const reading = await readRn(main, wait, suffix);
  return { reading, p50: await sessionReadP50(P, wait) };
}

/** The bytes S10's sessions draw: each names itself; the forged one draws guard rows a control client would read as its own. */
function s10File(name, forged) {
  const t = Math.floor(Date.now() / 1000);
  const lines = [`${name} draws its own screen`];
  if (forged) for (let i = 0; i < 12; i += 1) lines.push(`%end ${String(t)} ${String(1 + i * 37)} 1`, `%begin ${String(t)} ${String(2 + i * 37)} 1`, `%error ${String(t)} ${String(3 + i * 37)} 1`);
  lines.push(`${name} end`);
  const file = join(DRAWN, `${name}.bin`);
  writeFileSync(file, `${lines.join('\r\n')}\r\n`);
  return file;
}
/** A committed capture as a drawn file (the measure's own decoding). */
async function captureFile(name, rel, header) {
  const { fixtureBytes } = await import('./measure-screen.mjs');
  const file = join(DRAWN, `${name}.bin`);
  writeFileSync(file, fixtureBytes(readFileSync(join(ROOT, rel), 'utf8'), { header, ansi: rel.endsWith('.ansi') }));
  return file;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const parentRead = { rn: null, p50: null, s9: null };
const HEAD_DONE = { value: false };

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, PROFILE, PROJECTS, FAR, BIN, STANDIN_DIR, RECORDERS, DRAWN]) mkdirSync(dir, { recursive: true });
  writeFileSync(join(FAR, 'README.md'), '# Phase 337, the far folder\n');
  writeWrappers({ dir: RUN, bin: BIN, standinDir: STANDIN_DIR });
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\nexport HISTFILE=/dev/null\nunset TERM_SESSION_ID\nPS1='p337 %# '\n`, 'utf8');
  writeFileSync(join(HOME, '.hushlogin'), '');
  writeMachines(true);
  {
    const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(known), { recursive: true });
    writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p337/probe-p337.mjs' }), 'utf8');
  }
  // THE PRECONDITION: both bare names are the stand-in, asked of the login shell the app will ask.
  {
    const shellEnv = { ...process.env, HOME, ZDOTDIR: HOME, HISTFILE: '/dev/null' };
    for (const name of Object.keys(INHERITED)) delete shellEnv[name];
    const loginShell = (process.env['SHELL'] ?? '').trim() || '/bin/zsh';
    const resolved = {};
    for (const bare of ['claude', 'codex']) {
      const r = spawnSync(loginShell, ['-lic', `command -v ${bare}`], { encoding: 'utf8', timeout: 30_000, env: shellEnv });
      resolved[bare] = (String(r.stdout ?? '').trim().split('\n').pop() ?? '') === join(BIN, bare);
    }
    report.readings.resolvesToStandIn = resolved;
    resolvedOk = Object.values(resolved).every(Boolean);
    if (!resolvedOk) {
      unreadable += 1;
      throw new Error(`the scratch login shell resolves ${J(resolved)}: a bare name is not the stand-in, so nothing is launched`);
    }
  }
  standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });
  say(`measuring ${ROOT}${PARENT === '' ? '' : ` after the parent ${PARENT}`}; socket ${SOCKET}; the loopback machine on ${String(carriage.host)}:${String(carriage.port)}; history ${HISTORY_BEFORE}`);

  // ======================================================================
  // RP, RN's and S12's parent halves — the parent, FIRST, on the same profile
  // ======================================================================
  if (PARENT !== '') {
    await launch('p337-parent', resolve(PARENT), async (main) => {
      await pocket(main, 'setDoor', { on: true });
      const door = await confirmDoor(main);
      if (!door.ok) return cannotRead('RP', `the parent's door never listened: ${door.why}`);
      const P = await pairPhone(main, 'p337 parent phone');
      if (!P.ok) return cannotRead('RP', `no phone paired with the parent: ${P.why}`);
      const rn = await rnAt(main, P, RN_SUFFIX.parent);
      parentRead.rn = rn.reading;
      parentRead.p50 = rn.p50;
      // S9's parent half (the fix round of 2026-10-06): the same dialog-shaped
      // echo typed AT THE DESK into a Claude stand-in at the parent.
      try {
        const s9 = await agentSession(main, `${N.s9Desk}-${RN_SUFFIX.parent}`, 'claude', join(PROJECTS, 's9-parent'));
        const desked = await echoAndSample(main, s9, null);
        parentRead.s9 = { fronted: desked.fronted, echoed: desked.echoed, samples: desked.samples, waitingSamples: desked.waitingSamples };
        say(`S9's parent half, printed: the desk's echo read needs input in ${String(desked.waitingSamples)} of ${String(desked.samples)} samples`);
      } catch (err) {
        say(`S9's parent half could not be read: ${String(err?.message ?? err)}`);
      }
      const rec = await recorderSession(main, 'p337-rp-rec', 'normal');
      const from = hr();
      const screen = await screenRead(P.phone, P.door, rec);
      const k = await sendKeys(P.phone, P.door, rec, [{ t: canary() }], { turn: '0123456789abcdef-1', dialog: null, nonce: nonce() });
      await sleep(800);
      // The forged rows at the parent, printed: its monitor reads every pane through the control client.
      const forgedIds = [];
      for (const name of S10_NAMES) forgedIds.push(await drawerSession(main, `${name}-parent`, s10File(`${name}-parent`, name.endsWith('forged'))));
      const seen = [];
      const until = Date.now() + 20_000;
      while (Date.now() < until) {
        const list = await sessions(main);
        seen.push(forgedIds.map((id) => list.find((s) => s.id === id)?.status ?? 'missing'));
        await sleep(1_000);
      }
      const st = await status(main);
      report.readings.parentForged = { samples: seen.length, statuses: [...new Set(seen.flat())] };
      say(`RP the forged rows at the parent, printed: ${J(report.readings.parentForged)}`);
      arm('RP', { screen: screen.status, keys: k.status, bytes: recBytesFrom(rec, from), lines: st?.confirmLines ?? [] });
    });
    // THE PARENT'S CLAUDE STAND-INS' REGISTRY FILES, once their process is
    // gone (the fix round of 2026-10-06, probe:p318's own sweep of 2026-10-04).
    // Each launch ends the scratch tmux server, so HEAD's panes are numbered
    // from the start again, and a stand-in ended hard leaves `<pid>.json`
    // saying `waiting` for a pane id a HEAD session is then given; Tortie's
    // Claude registry reader keys by pane id, asks no pid, and keeps the file
    // it read last, which by name is the parent's when the pids cross a digit.
    // The verify's S9 read HEAD's first Claude session at needs input 20 of 20
    // after the echo; this round's two runs, with no crossing, read 0 of 20 at
    // the phone, at HEAD's desk and at the parent's desk. Claude Code deletes
    // its own file on exit, which is what this does for a process that can no
    // longer. A pre-existing reading, reported, not graded.
    report.readings.registrySweptAfterParent = sweepDeadRegistry();
    say(`swept ${String(report.readings.registrySweptAfterParent)} registry file(s) the parent's ended Claude stand-ins left behind`);
  }

  // ======================================================================
  // HEAD — S0 to S13 and RN's head half, one launch
  // ======================================================================
  await launch('p337-head', ROOT, async (main) => {
    const ids = {};
    // ---- the sessions ----------------------------------------------------------
    ids.claude = await agentSession(main, N.claude, 'claude', join(PROJECTS, 'claude'));
    ids.claudeFull = await agentSession(main, N.claudeFull, 'claude', join(PROJECTS, 'claude-full'));
    ids.codex = await agentSession(main, N.codex, 'codex', join(PROJECTS, 'codex'));
    ids.picker = await agentSession(main, N.picker, 'claude', join(PROJECTS, 'picker'));
    await tell(ids.claudeFull, [{ op: 'alt', on: true }]);
    ids.gemini = await drawerSession(main, N.gemini, await captureFile(N.gemini, 'src/main/activity/__tests__/fixtures/gemini-trust-gate.txt', false));
    ids.qwen = await drawerSession(main, N.qwen, await captureFile(N.qwen, 'src/main/activity/__tests__/fixtures/qwen-idle.txt', false));
    ids.shell = await shell(main, join(PROJECTS, 'shell'), N.shell);
    ids.scroll = await shell(main, join(PROJECTS, 'scroll'), N.scroll);
    ids.rec = {};
    for (const mode of MODES) ids.rec[mode] = await recorderSession(main, recName(mode), mode);
    ids.busy = await recorderSession(main, N.busy, 'normal', { busy: 25 });
    const up = await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
    if (!(up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable))) throw new Error(`the loopback machine is not usable: ${J(up).slice(0, 400)}`);
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const opened = await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
      if (opened.ok && opened.value?.result?.ok === true) break;
      await sleep(3_000);
    }
    ids.far = await shell(main, FAR, N.far, MACHINE_ID);
    ids.farRec = await recorderSession(main, N.farRec, 'decckm', { machineId: MACHINE_ID, path: FAR });
    const flat = [ids.claude, ids.claudeFull, ids.codex, ids.picker, ids.gemini, ids.qwen, ids.shell, ids.scroll, ids.busy, ids.far, ids.farRec, ...Object.values(ids.rec)];
    const live = await waitFor(async () => {
      const list = await sessions(main);
      return flat.every((id) => list.some((s) => s.id === id && LIVE.includes(s.status))) ? list : null;
    }, 90_000);
    if (live === null) throw new Error('the sessions never all read live');
    say(`sessions made: ${J(ids)}`);

    // ---- S0: the door asks again ----------------------------------------------------
    let settings = null;
    try {
      settings = await attachSettings(main);
      await pocket(main, 'setDoor', { on: true });
      const asking = await waitStatus(main, (s) => s.confirmable === true && s.state !== 'opening' && s.confirmState !== 'confirmed' && s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`)), 40_000);
      const confirmBlock = asking.ok
        ? await waitFor(async () => {
            const text = await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-confirm]'); return b === null ? null : b.innerText; })()`);
            return typeof text === 'string' && text.length > 0 ? text : null;
          }, 10_000, 200)
        : null;
      const door = await confirmDoor(main);
      const st = await status(main);
      arm('S0', { lines: door.lines, honesty: WORDS_HEAD.honesty, confirmBlock, parentRanFirst: PARENT !== '', confirmStateBefore: door.before, listening: door.ok && st?.state === 'listening' });
      if (!door.ok) throw new Error(`the door never listened: ${door.why}`);
    } finally {
      settings?.close();
    }

    // ---- the phones -----------------------------------------------------------------
    const A = await pairPhone(main, 'p337 phone A');
    if (!A.ok) throw new Error(`phone A did not pair: ${A.why}`);
    const B = await pairPhone(main, 'p337 phone B');
    if (!B.ok) throw new Error(`phone B did not pair: ${B.why}`);

    // ---- S1: every session's screen ---------------------------------------------------
    await armSafely('S1', async () => {
      const matrix = [
        [N.claude, ids.claude],
        [N.claudeFull, ids.claudeFull],
        [N.codex, ids.codex],
        [N.gemini, ids.gemini],
        [N.qwen, ids.qwen],
        [N.shell, ids.shell],
        ...MODES.map((m) => [recName(m), ids.rec[m]])
      ];
      const rows = [];
      for (const [name, id] of matrix) {
        const target = await targetOf(main, id);
        const sizeBefore = String(tmuxOut('display-message', '-p', '-t', target, SIZE) ?? '').trim();
        const cap1 = tmuxOut('capture-pane', '-p', '-t', target);
        const geo1 = geometryOf(tmuxOut('display-message', '-p', '-t', target, GEOMETRY));
        const r = await screenRead(A.phone, A.door, id);
        const cap2 = tmuxOut('capture-pane', '-p', '-t', target);
        const geo2 = geometryOf(tmuxOut('display-message', '-p', '-t', target, GEOMETRY));
        const sizeAfter = String(tmuxOut('display-message', '-p', '-t', target, SIZE) ?? '').trim();
        const s = r.answer?.screen ?? null;
        rows.push({
          name,
          status: r.status,
          screen: s !== null,
          problems: r.answer === null ? ['no answer'] : screenAnswerProblems(r.answer),
          rowsEqual: s !== null && (rowsDiffer(s, cap1).length === 0 || rowsDiffer(s, cap2).length === 0),
          geometryEqual: s !== null && (geometryEqual(s, geo1) || geometryEqual(s, geo2)),
          sizeSame: sizeBefore !== '' && sizeBefore === sizeAfter,
          alternate: s?.alternate ?? null
        });
      }
      arm('S1', { required: matrix.map(([n]) => n), rows, fullAlternate: rows.find((x) => x.name === N.claudeFull)?.alternate ?? null, inlineAlternate: rows.find((x) => x.name === N.claude)?.alternate ?? null });
    });

    // ---- S2: the long poll -------------------------------------------------------------
    await armSafely('S2', async () => {
      const id = ids.gemini;
      const first = await screenRead(A.phone, A.door, id);
      const rev = first.answer?.revision ?? null;
      if (rev === null) return cannotRead('S2', `the first read answered ${String(first.status)}`);
      const held = await screenRead(A.phone, A.door, id, { since: rev, timeoutMs: 30_000 });
      // A change mid-hold: the shell's prompt typed into by the probe's own tmux.
      const target = await targetOf(main, ids.shell);
      const base = await screenRead(A.phone, A.door, ids.shell);
      // When the held poll came back, by this process's clock: an answer
      // before the probe drew is some other change, and must not read as the
      // change answered within 250 ms (the probe review, 2026-10-05).
      let settledAt = null;
      const pending = screenRead(A.phone, A.door, ids.shell, { since: base.answer?.revision ?? null, timeoutMs: 30_000 }).then((r) => {
        settledAt = Date.now();
        return r;
      });
      await sleep(3_000);
      const drawnAt = Date.now();
      tmuxOut('send-keys', '-t', target, '-l', 'z');
      const changed = await pending;
      const changeMs = Date.now() - drawnAt;
      tmuxOut('send-keys', '-t', target, 'C-u');
      const malformed = [];
      for (const bad of ['0123456789a', '0123456789abc', '0123456789AB', 'zz']) malformed.push((await screenRead(A.phone, A.door, id, { target: `/v1/screen?id=${encodeURIComponent(id)}&since=${bad}` })).status);
      arm('S2', { heldMs: held.ms, heldUnchanged: held.answer?.unchanged === true, changeMs, changeAnswered: changed.answer !== null && changed.answer.unchanged === false, beforeDraw: settledAt === null || settledAt < drawnAt, malformed });
    });

    psSampler = startPsSampler(canaries);

    // ---- S3: the shell ------------------------------------------------------------------
    await armSafely('S3', async () => {
      const id = ids.shell;
      const target = await targetOf(main, id);
      const word = canary();
      let pic = await picture(A, id);
      const outcomes = [(await keys(A, id, [{ t: `echo ${word}` }], pic)).outcome];
      pic = await picture(A, id);
      outcomes.push((await keys(A, id, [{ k: 'Enter' }], pic)).outcome);
      const ran = await waitFor(() => (String(tmuxOut('capture-pane', '-p', '-t', target) ?? '').split('\n').some((l) => l.trim() === word) ? true : null), 5_000, 100);
      const panePid = Number(String(tmuxOut('display-message', '-p', '-t', target, '#{pane_pid}') ?? '').trim());
      const childNamed = (command) => {
        const t = processTable();
        return [...descendantsOf(t.children, panePid)].map((pid) => t.rows.get(pid)).find((row) => row !== undefined && row.command === command && !row.stat.startsWith('Z'))?.pid ?? 0;
      };
      const runAndEnd = async (command, key) => {
        await keys(A, id, [{ t: command }], await picture(A, id));
        await keys(A, id, [{ k: 'Enter' }], await picture(A, id));
        const pid = (await waitFor(() => childNamed(command) || null, 5_000, 100)) ?? 0;
        const k = await keys(A, id, [{ k: key }], await picture(A, id));
        const ended = pid > 0 && (await waitFor(() => (liveProcess(pid) ? null : true), 5_000, 100)) === true;
        return { pid, outcome: k.outcome, ended };
      };
      const sleepRun = await runAndEnd('sleep 1000', 'C-c');
      const catRun = await runAndEnd('cat', 'C-d');
      arm('S3', { echo: { outcomes, ran: ran === true }, sleep: sleepRun, cat: catRun });
    });

    // ---- S4: every key name in every mode ---------------------------------------------
    await armSafely('S4', async () => {
      const modes = {};
      for (const mode of MODES) {
        const id = ids.rec[mode];
        const pic = await picture(A, id);
        if (pic === null) {
          modes[mode] = { staged: false };
          continue;
        }
        const want = KEYS_ENCODING.modes['3.7b']?.[mode]?.keys ?? {};
        const differ = [];
        let compared = 0;
        let notDone = 0;
        for (const name of KEY_NAMES) {
          const k = await keyInto(A, id, [{ k: name }], pic);
          if (k.outcome !== 'done') notDone += 1;
          if (typeof want[name] === 'string') {
            compared += 1;
            if (k.hex !== want[name]) differ.push(name);
          }
        }
        modes[mode] = { staged: true, notDone, compared, differ };
      }
      const text = [];
      const id = ids.rec.paste;
      for (const t of ['hello', 'x;', 'a\\;b', '-R', 'é', `e${String.fromCodePoint(0x301)}`, String.fromCodePoint(0x1f44d, 0x1f3fd), '漢字', '#{pane_id}', '$HOME', canary()]) {
        const k = await keyInto(A, id, [{ t }], await picture(A, id), 120);
        text.push({ want: Buffer.from(t, 'utf8').toString('hex'), got: k.hex });
      }
      arm('S4', { modes, text });
    });

    // ---- S5: the one refusal ----------------------------------------------------------
    await armSafely('S5', async () => {
      const out = {};
      // (a) a picture with no question, then a question drawn, then keys with the picture's turn.
      {
        const id = ids.claude;
        const pic = await picture(A, id);
        await tell(id, [{ op: 'press', command: 'touch p337-a.txt' }]);
        await waitFor(() => (stateOf(id)?.mode === 'press' ? true : null), 5_000, 25);
        await sleep(300);
        const from = hr();
        const k = await keys(A, id, [{ t: '1' }], pic);
        await sleep(300);
        out.a = { outcome: k.outcome, reason: k.reason, bytes: bytesFrom(id, from) };
      }
      // (b) a picture of the question, a desk keystroke, then keys with that picture.
      {
        const id = ids.claude;
        const pic = await picture(A, id);
        await front(main, id);
        const deskFrom = hr();
        await desk(main, id, '\u001b[B');
        const deskReached = (await waitFor(() => (bytesFrom(id, deskFrom).includes('1b5b42') ? true : null), 3_000, 25)) === true;
        await sleep(200);
        const from = hr();
        const k = await keys(A, id, [{ t: '1' }], pic);
        await sleep(300);
        out.b = { deskReached, outcome: k.outcome, reason: k.reason, bytes: bytesFrom(id, from) };
        await tell(id, [{ op: 'work', ms: 600 }]);
        await waitFor(() => (stateOf(id)?.mode === 'idle' ? true : null), 10_000, 100);
      }
      // (c) Codex's question, Enter, its run drawn, an identical question with no hook, Enter on the poll's picture.
      {
        const id = ids.codex;
        await tell(id, [{ op: 'ask', command: 'touch p337-c.txt', ranMs: 500 }]);
        await waitFor(() => (stateOf(id)?.mode === 'press' ? true : null), 5_000, 25);
        await sleep(300);
        const pic = await screenRead(A.phone, A.door, id);
        const from = hr();
        const first = await keys(A, id, [{ k: 'Enter' }], pic.answer?.screen ?? null);
        const handed = await screenRead(A.phone, A.door, id, { since: pic.answer?.revision ?? null, timeoutMs: 15_000 });
        const firstCommits = logFrom(id, from).filter((l) => l.kind === 'commit').length;
        // The second question is up before the person's Enter reaches the Mac.
        const secondAt = await waitFor(() => {
          const s = stateOf(id);
          return s !== null && s.mode === 'press' && logFrom(id, from).some((l) => l.kind === 'ran') ? hr() : null;
        }, 5_000, 10);
        await sleep(100);
        const second = await keys(A, id, [{ k: 'Enter' }], handed.answer?.screen ?? null);
        await sleep(300);
        out.c = { first: first.outcome, firstCommits, second: { outcome: second.outcome, reason: second.reason }, secondBytes: secondAt === null ? null : bytesFrom(id, secondAt), handedAsking: handed.answer?.screen?.asking ?? null };
        await tell(id, [{ op: 'idle' }]);
      }
      // (d) Claude Code's hook commits needs_input before its dialog is drawn.
      {
        const id = ids.claude;
        await waitFor(async () => ((await statusOf(main, id)) !== 'needs_input' ? true : null), 20_000, 250);
        const pic = await picture(A, id);
        await tell(id, [{ op: 'press', command: 'touch p337-d.txt' }]);
        const waiting = (await waitFor(async () => ((await statusOf(main, id)) === 'needs_input' ? true : null), 20_000, 100)) === true;
        const from = hr();
        const k = await keys(A, id, [{ t: '1' }], pic);
        await sleep(300);
        out.d = { waiting, outcome: k.outcome, reason: k.reason, bytes: bytesFrom(id, from) };
        await tell(id, [{ op: 'work', ms: 600 }]);
      }
      // (e) and (f): arrows in a picker, one per picture, the picture the poll handed back.
      const pickerRun = async (redrawMs, count) => {
        const id = ids.picker;
        await tell(id, [{ op: 'picker', options: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'], redrawMs }]);
        await waitFor(() => (stateOf(id)?.mode === 'picker' ? true : null), 5_000, 25);
        await sleep(400);
        let answer = (await screenRead(A.phone, A.door, id)).answer;
        const from = hr();
        const outcomes = [];
        const pictures = [];
        for (let i = 0; i < count; i += 1) {
          pictures.push(pickerCursorOf(answer?.screen ?? null));
          const k = await keys(A, id, [{ k: 'Down' }], answer?.screen ?? null);
          outcomes.push(k.outcome === 'refused' ? `refused ${String(k.reason)}` : k.outcome);
          answer = (await screenRead(A.phone, A.door, id, { since: answer?.revision ?? null, timeoutMs: 15_000 })).answer;
        }
        await sleep(redrawMs + 200);
        const moved = logFrom(id, from).filter((l) => l.kind === 'moved');
        await tell(id, [{ op: 'idle' }]);
        return { outcomes, moves: moved.map((m, i) => ({ drawn: Number(m.drawn), picture: pictures[i] ?? null })) };
      };
      {
        const e = await pickerRun(0, 5);
        out.e = { moves: e.moves, outcomes: e.outcomes };
        const f = await pickerRun(120, 10);
        out.f = { sent: f.outcomes.length, changed: f.outcomes.filter((o) => o === 'refused changed').length, moves: f.moves, outcomes: f.outcomes };
      }
      // (g) Escape then Enter from the node phone 20 ms apart, at a reader busy 25 ms after each input.
      {
        const id = ids.busy;
        const pic = await picture(A, id);
        const from = hr();
        // Enter goes 20 ms after Escape was sent OR the moment Escape is
        // answered, whichever is later (the probe review, 2026-10-05). The
        // door holds one write in flight per session and answers a second
        // `busy` (writes.ts step 3), so an Enter sent while Escape was still in
        // flight typed nothing and read as ONE read, a product FAIL for a
        // scenario the run never staged. Either way the two reach the verb as
        // close as the door ever lets them, which is what D42 holds apart.
        const [first] = await Promise.all([keys(A, id, [{ k: 'Escape' }], pic), sleep(20)]);
        const second = await keys(A, id, [{ k: 'Enter' }], pic);
        await sleep(400);
        const reads = recorderReads(id).filter((r) => r.t >= from);
        out.g = { reads: reads.map((r) => r.hex), apartMs: reads[0] !== undefined && reads[1] !== undefined ? msBetween(reads[0].t, reads[1].t) : null, outcomes: [first, second].map((k) => k?.outcome ?? null) };
      }
      arm('S5', out);
    });

    // ---- S6: replays -----------------------------------------------------------------------
    await armSafely('S6', async () => {
      const id = ids.rec.normal;
      const out = {};
      {
        const pic = await picture(A, id);
        const write = freshWriteId();
        const once = nonce();
        const timestamp = String(Date.now());
        const text = canary();
        const from = hr();
        const first = await sendKeys(A.phone, A.door, id, [{ t: text }], { turn: pic?.turn, dialog: null, write, nonce: once, timestamp });
        keysWrites.push({ session: id, status: first.status, outcome: answerOf(first)?.outcome ?? null, reason: answerOf(first)?.reason ?? null, at: Date.now() });
        // The same bytes: the same body, nonce and timestamp, so the same signature.
        const again = await sendKeys(A.phone, A.door, id, [{ t: text }], { turn: pic?.turn, dialog: null, write, nonce: once, timestamp });
        keysWrites.push({ session: id, status: again.status, outcome: answerOf(again)?.outcome ?? null, reason: answerOf(again)?.reason ?? null, at: Date.now(), repeat: true });
        await sleep(400);
        out.replay = { first: first.status, again: again.status, reads: recorderReads(id).filter((r) => r.t >= from).length };
      }
      {
        const pic = await picture(A, id);
        const write = freshWriteId();
        const text = canary();
        const from = hr();
        const first = await keys(A, id, [{ t: text }], pic, { write });
        const second = await keys(A, id, [{ t: text }], pic, { write, repeat: true });
        await sleep(400);
        out.reused = { first: first.status, second: second.status, sameBody: first.body !== null && first.body === second.body, reads: recorderReads(id).filter((r) => r.t >= from).length };
      }
      {
        const k = await keys(A, randomUUID(), [{ t: 'a' }], await picture(A, id));
        out.nobody = { outcome: k.outcome, reason: k.reason };
      }
      {
        const st = await status(main);
        const row = (st?.phones ?? []).find((p) => p.label === 'p337 phone B');
        if (row !== undefined) await pocket(main, 'removePhone', row.id);
        await sleep(1_500);
        const again = await confirmDoor(main);
        if (!again.ok) throw new Error(`the door did not listen again after a Remove: ${again.why}`);
        const r = await sendKeys(B.phone, B.door, id, [{ t: canary() }], { turn: '0123456789abcdef-1', dialog: null, nonce: nonce() });
        const control = (await signedGet(A.phone, A.door, '/v1/blocked')).status;
        out.removed = { status: r.status, wasPaired: row !== undefined && control === 200 };
      }
      arm('S6', out);
    });

    // ---- S7: hostile bodies --------------------------------------------------------------------
    await armSafely('S7', async () => {
      const id = ids.rec.normal;
      const pic = await picture(A, id);
      const from = hr();
      const raw = async (fields) => {
        const r = await signedPost(A.phone, A.door, '/v1/keys', fields, { nonce: nonce() });
        const a = answerOf(r);
        keysWrites.push({ session: id, status: r.status, outcome: a?.outcome ?? null, reason: a?.reason ?? null, at: Date.now() });
        return { status: r.status, outcome: a?.outcome ?? null, reason: a?.reason ?? null };
      };
      const base = (k) => ({ dialog: null, keys: k, session: id, turn: pic?.turn ?? '0123456789abcdef-1', write: freshWriteId() });
      const out = {
        items65: await raw(base(Array.from({ length: 65 }, () => ({ t: 'a' })))),
        long: await raw(base([{ t: 'a'.repeat(1_025) }])),
        control: await raw(base([{ t: `a${String.fromCharCode(1)}` }])),
        metaX: await raw(base([{ k: 'M-x' }])),
        extra: await raw({ ...base([{ t: 'a' }]), extra: 1 })
      };
      await sleep(400);
      arm('S7', { ...out, bytes: recBytesFrom(id, from) });
    });

    // ---- S8: the machine -------------------------------------------------------------------------
    await armSafely('S8', async () => {
      const id = ids.far;
      const target = await targetOf(main, id);
      const sizeBefore = String(farOut('display-message', '-p', '-t', target, SIZE) ?? '').trim();
      const cap1 = farOut('capture-pane', '-p', '-t', target);
      const r = await screenRead(A.phone, A.door, id);
      const cap2 = farOut('capture-pane', '-p', '-t', target);
      const s = r.answer?.screen ?? null;
      const word = canary();
      const outcomes = [(await keys(A, id, [{ t: `echo ${word}` }], s)).outcome];
      outcomes.push((await keys(A, id, [{ k: 'Enter' }], await picture(A, id))).outcome);
      const ran = await waitFor(() => (String(farOut('capture-pane', '-p', '-t', target) ?? '').split('\n').some((l) => l.trim() === word) ? true : null), 8_000, 200);
      const upKey = await keyInto(A, ids.farRec, [{ k: 'Up' }], await picture(A, ids.farRec), 400);
      const sizeAfter = String(farOut('display-message', '-p', '-t', target, SIZE) ?? '').trim();
      // The machine stops answering: its sshd and every child of it paused, resumed in the finally.
      const paused = { staged: false, outcome: null, reason: null, bytesAfter: null };
      if (existsSync(SSHD_CONF)) {
        const table = processTable();
        const listener = [...table.rows.values()].find((row) => isScratchSshd(row.command, SSHD_CONF)) ?? null;
        if (listener !== null) {
          const recorded = [listener.pid, ...descendantsOf(table.children, listener.pid)];
          const pic = await picture(A, ids.farRec);
          let from = hr();
          try {
            for (const pid of recorded) {
              try {
                process.kill(pid, 'SIGSTOP');
                stopped.add(pid);
              } catch {
                /* gone */
              }
            }
            const unknown = await waitFor(async () => ((await statusOf(main, ids.farRec)) === 'unknown' ? true : null), 120_000, 1_000);
            paused.staged = unknown === true;
            from = hr();
            const k = await keys(A, ids.farRec, [{ t: canary() }], pic);
            paused.outcome = k.outcome;
            paused.reason = k.reason;
          } finally {
            resumeStopped();
          }
          await waitFor(async () => (LIVE.includes(await statusOf(main, ids.farRec)) ? true : null), 120_000, 1_000);
          await sleep(3_000);
          paused.bytesAfter = recBytesFrom(ids.farRec, from);
        }
      }
      arm('S8', { screen: s !== null, rowsEqual: s !== null && (rowsDiffer(s, cap1).length === 0 || rowsDiffer(s, cap2).length === 0), echo: { outcomes, ran: ran === true }, up: { outcome: upKey.outcome, hex: upKey.hex }, sizeSame: sizeBefore !== '' && sizeBefore === sizeAfter, paused });
    });
    psSampler.stop();

    // ---- S9: status ------------------------------------------------------------------------------------
    await armSafely('S9', async () => {
      const id = ids.claude;
      await waitFor(async () => ((await statusOf(main, id)) !== 'needs_input' && stateOf(id)?.mode === 'idle' ? true : null), 20_000, 250);
      await tell(id, [{ op: 'press', command: 'touch p337-s9.txt' }]);
      const wasWaiting = (await waitFor(async () => ((await statusOf(main, id)) === 'needs_input' ? true : null), 20_000, 250)) === true;
      await sleep(300);
      const k = await keys(A, id, [{ t: '1' }], await picture(A, id));
      const left = (await waitFor(async () => ((await statusOf(main, id)) !== 'needs_input' ? true : null), 10_000, 250)) === true;
      await waitFor(() => (stateOf(id)?.mode === 'idle' ? true : null), 10_000, 100);
      // The phone's echo. `drawnAsAChoice` is the Mac's own Screen saying the
      // echo reads as a question (`asking`), so the staging is proved, not
      // assumed: the ONE row the arm first typed held all three, which no
      // detector reads as a choice.
      const phone = await echoAndSample(main, id, A);
      const drawnAsAChoice = (await picture(A, id))?.asking === true;
      await tell(id, [{ op: 'clear' }]);
      // The same rows typed AT THE DESK into a second Claude stand-in (the fix round of 2026-10-06).
      const deskId = await agentSession(main, `${N.s9Desk}-${RN_SUFFIX.head}`, 'claude', join(PROJECTS, 's9-desk'));
      const desked = await echoAndSample(main, deskId, null);
      await tell(deskId, [{ op: 'clear' }]);
      const reading = {
        wasWaiting,
        key: k.outcome,
        left,
        echo: { typed: phone.outcomes.length === 2 * S9_ECHO_ROWS.length && phone.outcomes.every((o) => o === 'done'), echoed: phone.echoed, drawnAsAChoice, samples: phone.samples, waitingSamples: phone.waitingSamples },
        desk: { fronted: desked.fronted, echoed: desked.echoed, samples: desked.samples, waitingSamples: desked.waitingSamples },
        parentDesk: parentRead.s9
      };
      say(`S9 a dialog-shaped echo, needs input in: the phone's ${String(phone.waitingSamples)} of ${String(phone.samples)} samples, the desk's at HEAD ${String(desked.waitingSamples)} of ${String(desked.samples)}, the desk's at the parent ${parentRead.s9 === null ? 'not measured' : `${String(parentRead.s9.waitingSamples)} of ${String(parentRead.s9.samples)}`}`);
      if (parentRead.s9 === null) return cannotRead('S9', 'no parent ran (P337_PARENT_CHECKOUT unset), so the desk\'s echo at the parent, which says whether this is today\'s class, was not measured', reading);
      arm('S9', reading);
    });

    // ---- S10: forged guard rows, live -------------------------------------------------------------------
    await armSafely('S10', async () => {
      const made = [];
      for (const name of S10_NAMES) made.push([name, await drawerSession(main, name, s10File(name, name.endsWith('forged')))]);
      await sleep(1_500);
      let reads = 0;
      let unread = 0;
      let foreign = 0;
      let ownMissing = 0;
      let waitingSamples = 0;
      let missingSamples = 0;
      const until = Date.now() + S10_MS;
      while (Date.now() < until) {
        for (const [name, id] of made) {
          const r = await screenRead(A.phone, A.door, id);
          reads += 1;
          const text = (r.answer?.screen?.lines ?? []).map(screenRowText).join('\n');
          if (r.answer?.screen === null || r.answer?.screen === undefined) {
            unread += 1;
            continue;
          }
          if (!text.includes(`${name} draws its own screen`)) ownMissing += 1;
          if (S10_NAMES.some((other) => other !== name && text.includes(`${other} draws`))) foreign += 1;
        }
        const list = await sessions(main);
        for (const [, id] of made) {
          const st = list.find((s) => s.id === id)?.status;
          if (st === undefined) missingSamples += 1;
          else if (st === 'needs_input') waitingSamples += 1;
        }
      }
      arm('S10', { reads, sessions: made.length, unread, foreign, ownMissing, waitingSamples, missingSamples });
    });

    // ---- S13: the desk scrolled back ------------------------------------------------------------------------
    await armSafely('S13', async () => {
      const id = ids.scroll;
      const target = await targetOf(main, id);
      tmuxOut('send-keys', '-t', target, '-l', 'seq 1 3000');
      tmuxOut('send-keys', '-t', target, 'Enter');
      await sleep(1_500);
      const mounted = await front(main, id);
      if (!mounted) return cannotRead('S13', 'the scroll session never came to the front with its terminal drawn');
      const inMode = () => String(tmuxOut('display-message', '-p', '-t', target, '#{pane_in_mode}') ?? '').trim();
      const deskState = async () => (await bridge(main, `window.__gmuxP95.read(${J(id)})`)).value?.state ?? null;
      await bridge(main, 'window.__gmuxP95.wheel(6, -120)');
      await sleep(800);
      const parked = { inMode: (await deskState())?.inMode === true, paneInMode: inMode() };
      const k = await keys(A, id, [{ k: 'C-e' }], await picture(A, id));
      await sleep(300);
      const paneAfter = inMode();
      const deskLive = (await waitFor(async () => ((await deskState())?.inMode === false ? true : null), 3_000, 200)) === true;
      await bridge(main, 'window.__gmuxP95.wheel(6, -120)');
      await sleep(800);
      const again = { inMode: (await deskState())?.inMode === true, paneInMode: inMode() };
      arm('S13', { parked, key: k.outcome, after: { paneInMode: paneAfter, deskLive }, again });
    });

    // ---- S12 and RN ------------------------------------------------------------------------------------------
    await armSafely('RN', async () => {
      const head = await rnAt(main, A, RN_SUFFIX.head);
      // S12: /v1/session at HEAD, and again while a phone watches a dense screen.
      const dense = await drawerSession(main, 'p337-dense', await captureFile('p337-dense', 'build/fixtures/reply/claude-prompt-pasted-long-2.1.287.ansi', true));
      let watchedReads = 0;
      // Phone B was Removed in S6, so a third phone watches.
      const C = await pairPhone(main, 'p337 phone C');
      let watchedP50 = null;
      if (C.ok) {
        let on = true;
        const w = (async () => {
          let since = null;
          while (on) {
            const r = await screenRead(C.phone, C.door, dense, { since, timeoutMs: 15_000 }).catch(() => null);
            since = r?.answer?.revision ?? null;
            watchedReads += 1;
          }
        })();
        watchedP50 = await sessionReadP50(A, (await byName(main, `${N.rnWait}-${RN_SUFFIX.head}`))?.id ?? '');
        on = false;
        await Promise.race([w, sleep(16_000)]);
      }
      const s12 = { parentP50: parentRead.p50, headP50: head.p50, watchedP50, watchedReads };
      say(`S12 /v1/session p50, printed: parent ${String(parentRead.p50)} ms, HEAD ${String(head.p50)} ms, HEAD with a phone watching a dense screen ${String(watchedP50)} ms (${String(watchedReads)} reads)`);
      if (parentRead.p50 === null) cannotRead('S12', 'no parent ran (P337_PARENT_CHECKOUT unset)', s12);
      else arm('S12', s12);
      if (parentRead.rn === null) return cannotRead('RN', 'no parent ran (P337_PARENT_CHECKOUT unset), so there is nothing to compare HEAD with', { head: head.reading });
      arm('RN', { parent: parentRead.rn, head: head.reading });
    });
    HEAD_DONE.value = true;
  });
} catch (err) {
  failures += 1;
  report.error = String(err?.message ?? err);
  say(`the run stopped: ${report.error}`);
} finally {
  psSampler?.stop();
  resumeStopped();
  const leaked = watch === null ? [] : watch.stop();
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(standin.dir, 1_500);
  if (dns !== null) await dns.close();
  // Every agent stand-in, by the pids the stand-ins wrote; recorders and drawers end with their panes.
  const agentPids = hellos(STANDIN_DIR).flatMap((h) => [Number(h.pid), Number(h.runnerPid)]).filter((p) => Number.isInteger(p) && p > 1);
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  for (const pid of agentPids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* gone with its pane */
    }
  }
  for (let i = 0; i < 20 && agentPids.some(alive); i += 1) await sleep(100);
  for (const pid of agentPids.filter(alive)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }
  const agentsLeft = agentPids.filter(alive).length;
  // S11, after the app has gone.
  if (HEAD_DONE.value) {
    const text = appLogText();
    const hits = [];
    let snapshotHits = 0;
    const SNAPSHOTS = `${join(PROFILE, 'gmux', 'snapshots')}/`;
    let filesScanned = 0;
    const walk = (dir) => {
      let names = [];
      try {
        names = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of names) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.isFile()) {
          filesScanned += 1;
          let s;
          try {
            s = readFileSync(p).toString('latin1');
          } catch {
            continue;
          }
          for (const c of canaries) {
            if (!s.includes(c)) continue;
            if (p.startsWith(SNAPSHOTS)) snapshotHits += 1;
            else hits.push({ file: p.slice(RUN.length + 1), canary: c });
          }
        }
      }
    };
    walk(PROFILE);
    walk(HOME);
    arm('S11', { appLogRead: text !== null, filesScanned, hits, snapshotHits, psSamples: psSampler?.samples() ?? 0, psHits: psSampler?.hits() ?? 0, logged: countLog(KEYS_LOG_LINE), owed: owedKeysLines(keysWrites) });
  }
  arm('RUN', {
    tailscalePreflight,
    dnsPreflights,
    agentsHeld,
    resolved: resolvedOk,
    realTailscale: leaked.length,
    samples: watch?.samples() ?? 0,
    forbidden: standin === null ? 0 : standin.forbidden().length,
    standinLeft: ended.left.length,
    agentsLeft,
    historyBefore: HISTORY_BEFORE,
    historyAfter: historyStat()
  });
  report.readings.processRowsAtEnd = processRows().filter((r) => r.command.includes('tailscale-standin.mjs') || r.command.includes('build/p318/stand-in.mjs')).length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `probe-p337${PARENT === '' ? '' : '-with-parent'}.json`), `${J(report, (_k, v) => (typeof v === 'bigint' ? String(v) : v), 2)}\n`);
  rmSync(RN_ROOT, { recursive: true, force: true });
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
  else say(`kept ${RUN} (P337_KEEP=1): every stand-in's and recorder's log`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
