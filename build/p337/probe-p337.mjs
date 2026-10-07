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
 * TMUX_TMPDIR). With `P337_PARENT_CHECKOUT` (a BUILT `e3837139` since Phase 337.1) a SECOND
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
 *   RP  with P337_PARENT_CHECKOUT (since Phase 337.1 a BUILT `e3837139`, 337
 *       itself): `/v1/scrollback` 404 with the door's `route` word logged; a
 *       screen answer carries no `depth` and no `space`; the lines name the
 *       screen and no `scrollback`; the forged rows printed. Nothing is typed
 *       at the parent (its keys route is real, and a write there is a line S11
 *       does not owe)
 *
 * PHASE 337.1, THE SB ARMS (build/p3371/SPEC.md §7.7), at HEAD after RN, the
 * histories drawn by build/p3371/history-stand-in.mjs and the committed
 * captures, every page read the phone's way (node-phone.mjs `scrollbackRead`)
 * and held to the probe's OWN `capture-pane -p` and `-p -e` of the same index
 * range and its OWN SGR reader (measure-screen.mjs `ownStyles`, which imports
 * nothing of src/main/screen):
 *   SB0 S0's reading held to the scrollback route (eleven routes) and D35's
 *       honesty sentence, the terminal and what it printed before
 *   SB1 every history paged whole: Claude Code and Codex inline after their
 *       committed screens (each drawn over the last, which tmux scrolls into
 *       its history), a shell with 3,000 numbered lines, Gemini's and Qwen's
 *       committed screens stacked, a shell on the loopback machine, and a
 *       canary history (SB6's): every row's text, every run's pen, every
 *       window's size unchanged
 *   SB2 100 pages each while a stand-in prints 200 and 2,000 lines a second
 *       (the scratch server's history-limit raised to 100,000 for those two,
 *       so nothing trims), each verified by number; busy counted; a second
 *       phone's live poll answering 20 changes within 250 ms p99 meanwhile
 *   SB3 THE ATTACK, with main's inspector (`--inspect=0`) stamping each page
 *       statement main writes and sampling its event-loop lag: every refused
 *       query of §6.2 live, 404 with no statement written; another wrap, a
 *       depth past the history, a `from` past it and the alternate screen,
 *       each `moved`; 200 page reads from one phone in 2 s, every answer a
 *       page, `busy` or a connection refused at the door's per-source cap
 *       (one source holds four, and every phone reaches the door from one),
 *       none waiting past the queue, main's lag p99 under 50 ms and one
 *       session's starts 250 ms apart by main's stamps; a worst-colour
 *       history's starts at least SCREEN_DUTY_FACTOR times the compose before
 *       them (the compose read as main's largest lag after the start, an
 *       upper bound); a session ended before its page, `ended`; and the door
 *       switched off while three pages wait their floors, every one answered
 *       or cut within the stop join, by the phone's own clock (the door logs
 *       no line for its join)
 *   SB4 a session made under a history-limit of 1,000 trimmed under a held
 *       depth, `moved`; `clear` in a shell, `moved` (UNREADABLE when its
 *       terminfo sends no E3 and the history stays)
 *   SB5 the loopback machine's sshd paused: `unreachable`; resumed: paged
 *   SB6 after the app is gone: no canary row in app.log, under the profile
 *       or HOME (the sessions' own saved screens counted apart), or in `ps
 *       -ww` sampled through SB1 to SB3
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
 *   P337_PARENT_CHECKOUT=<a BUILT e3837139 checkout> npm run -s probe:p337
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
import { freshWriteId, makePhone, pairThrough, readOffer, screenAnswerProblems, screenRead, screenRowText, scrollbackAnswerProblems, scrollbackRead, scrollbackTarget, sendKeys, signedGet, signedPost } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';
import { hellos, readLog, readState, sendOps, writeWrappers } from '../p318/stand-in.mjs';
import { authorizedLinesFor } from '../scratch-machine.mjs';
import { readRecorderLog } from './key-recorder.mjs';
import { h2Groups, ownStyles, runsAgainstOwn } from './measure-screen.mjs';
import { numberOf as numberedRow } from '../p3371/history-stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hr = () => process.hrtime.bigint();
const msBetween = (from, to) => Number(BigInt(to) - BigInt(from)) / 1e6;

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE or read from the checkout
// ---------------------------------------------------------------------------

/**
 * The phase's parent on main, the build RP and RN compare with. Since Phase
 * 337.1 the parent is `e3837139`, 337 itself (build/p3371/SPEC.md §7.7): RP
 * reads there that `/v1/scrollback` is no route and a screen answer carries
 * no depth. RN, S9's parent half and S12 read any parent the same way.
 */
export const SNAPSHOT = 'e3837139';
export const MACHINE_ID = 'p337far';
/** D35: HEAD's route line and write line, by value. */
export const ROUTE_LINE = 'Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, scrollback, session, sessions, turns';
export const WRITE_LINE = 'Lets an allowed phone end a session, answer a numbered question, send a session one message and type into any session as you would at this Mac';
export const ROUTE_IDS = Object.freeze(['blocked', 'choose', 'end', 'keys', 'pair', 'say', 'screen', 'scrollback', 'session', 'sessions', 'turns']);
/** The parent's (337's) route line: ten routes and no `scrollback`. */
export const PARENT_ROUTE_LINE = 'Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, session, sessions, turns';
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

// ---------------------------------------------------------------------------
// PHASE 337.1, the SB arms (build/p3371/SPEC.md §7.7): the reader's bounds by
// value, each held equal to the tree's own by the self-test
// ---------------------------------------------------------------------------

/** D35's honesty sentence, by value; the run reads the tree's own and the self-test holds the two equal. */
export const HONESTY_D35 = 'A phone you allow can see what any session’s terminal shows and what it printed before, type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.';
/** D14: one page start per session no sooner than this after the last, on this Mac. */
export const SB_MIN_GAP_MS = 250;
/** D14: pages waiting their turn on one session; one more is `busy` at once. */
export const SB_QUEUE_MAX = 4;
/** D14 (337 D15): a start waits this many times the session's last page compose. */
export const SB_DUTY_FACTOR = 4;
/** The door's stop join (src/main/pocket/door/limits.ts DOOR_STOP_JOIN_MS). */
export const SB_STOP_JOIN_MS = 1_000;
/** How late after the join a page may still settle at the phone (a cut travels the forwarder). */
export const SB_STOP_SLACK_MS = 500;
/** D7: the most rows one page may ask for. */
export const SB_MAX_COUNT = 128;
/** SB2: pages at each rate; SB2's poll changes; SB3's burst. */
export const SB2_PAGES = 100;
export const SB2_CHANGES = 20;
export const SB3_BURST = 200;
/** SB3: main's event-loop lag p99 bound while the burst lasts. */
export const SB3_LAG_P99_MS = 50;
/** How much earlier than its floor a start may be stamped (two clocks, a millisecond either way). */
export const SB_GAP_SLACK_MS = 2;
/** The four absences a page may answer with (D8). */
export const SB_ABSENCES = Object.freeze(['ended', 'unreachable', 'moved', 'busy']);
/** SB1's matrix (§7.7): each session's history paged whole. */
export const SB1_MATRIX = Object.freeze(['p3371-claude', 'p3371-codex', 'p3371-shell', 'p3371-gemini', 'p3371-qwen', 'p3371-far', 'p3371-canary']);

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
// PHASE 337.1: the SB arms' pure readers (build/p3371/SPEC.md §7.7)
// ---------------------------------------------------------------------------

/**
 * SB3's refused queries (§6.2, live): each a `/v1/scrollback` target the
 * Mac must answer 404, built from an honest ask by one change. The honest
 * target itself is never among them.
 */
export function refusedTargets(id, ask) {
  const pairs = (over = {}, drop = null, extra = '') => {
    const q = { id, from: String(ask.from), count: String(ask.count), depth: String(ask.depth), wrap: String(ask.wrap), keep: ask.keep, ...over };
    const names = ['id', 'from', 'count', 'depth', 'wrap', 'keep'].filter((n) => n !== drop);
    return `/v1/scrollback?${names.map((n) => `${n}=${encodeURIComponent(q[n])}`).join('&')}${extra}`;
  };
  return [
    ...['id', 'from', 'count', 'depth', 'wrap', 'keep'].map((n) => ({ what: `${n} missing`, target: pairs({}, n) })),
    { what: 'from repeated', target: pairs({}, null, `&from=${String(ask.from)}`) },
    { what: 'an unknown name', target: pairs({}, null, '&x=1') },
    { what: 'cols named (rule ah)', target: pairs({}, null, `&cols=${String(ask.wrap)}`) },
    { what: 'a sign on from', target: pairs({ from: `+${String(ask.from)}` }) },
    { what: 'a negative from', target: pairs({ from: '-1' }) },
    { what: 'a leading zero', target: pairs({ count: `0${String(ask.count)}` }) },
    { what: 'a depth of 100,001', target: pairs({ depth: '100001' }) },
    { what: 'a count of 0', target: pairs({ count: '0' }) },
    { what: 'a count of 129', target: pairs({ count: '129' }) },
    { what: 'a wrap of 513', target: pairs({ wrap: '513' }) },
    { what: 'keep middle', target: pairs({ keep: 'middle' }) },
    { what: 'keep TOP', target: pairs({ keep: 'TOP' }) },
    { what: 'from + count past depth', target: pairs({ from: String(ask.depth - 5), count: '10' }) },
    { what: 'an id nobody has', target: pairs({ id: randomUUID() }) }
  ];
}

/**
 * A served page against the probe's own captures of the same index range:
 * rows whose text differs from `capture-pane -p`, and runs that disagree with
 * the probe's own SGR reader over `capture-pane -p -e` (measure-screen.mjs's
 * `ownStyles`, `runsAgainstOwn`, which import nothing of src/main/screen).
 */
export function pageAgainst(rows, plainText, styledText) {
  const plain = String(plainText ?? '').split('\n');
  if (plain.length > 0 && plain[plain.length - 1] === '') plain.pop();
  let textMismatch = plain.length === rows.length ? 0 : 1;
  rows.forEach((row, k) => {
    if (screenRowText(row) !== (plain[k] ?? '').replace(/ +$/, '')) textMismatch += 1;
  });
  const styled = String(styledText ?? '').replace(/\n$/, '');
  return { textMismatch, styleMismatch: runsAgainstOwn(rows, ownStyles(styled, rows.length)) };
}

/** SB3's burst: past this a page waited behind more than the queue (four waiting at the floor, and a second for the trip). */
export const SB_LATE_MS = (SB_QUEUE_MAX + 1) * SB_MIN_GAP_MS + 1_000;

/**
 * SB3's burst, each settled read `{ r: { status, answer, ms }, ask }` sorted
 * into what it came to. A connection with no answer (status 0) is a refusal at
 * the door's per-source cap only when it came back at once: THE PROBE REVIEW
 * (2026-10-06) found every status 0 counted as refused at the cap, so a page
 * main held until the phone's own 20 s timeout cut it read as the cap's
 * refusal and the clause passed over a page that waited past the queue. One
 * that took longer than `SB_LATE_MS` is `late`, as a served page that did.
 */
export function burstOf(settled) {
  const burst = { sent: settled.length, served: 0, busy: 0, refusedAtCap: 0, malformed: 0, notFound: 0, late: 0, other: 0 };
  for (const { r, ask } of settled) {
    if (r.status === 0) {
      if (typeof r.ms === 'number' && r.ms <= SB_LATE_MS) burst.refusedAtCap += 1;
      else burst.late += 1;
    } else if (r.status === 404) burst.notFound += 1;
    else if (r.status !== 200 || r.answer === null) burst.malformed += 1;
    else if (scrollbackAnswerProblems(r.answer, r.answer.why === null ? ask : null).length > 0) burst.malformed += 1;
    else if (r.answer.why === 'busy') burst.busy += 1;
    else if (r.answer.why === null) {
      burst.served += 1;
      if (r.ms > SB_LATE_MS) burst.late += 1;
    } else burst.other += 1;
  }
  burst.malformed += burst.other;
  return burst;
}

/** The index of the first `L000001` row of a capture (the numbered lines' offset in a history), or null. */
export function offsetOfFirst(captureText) {
  const at = String(captureText ?? '').split('\n').findIndex((l) => numberedRow(l)?.n === 1 && numberedRow(l)?.prefix === 'L');
  return at < 0 ? null : at;
}

/** Whether a served page's rows hold the numbered lines its index range names, `off` lines below index 0. */
export function numberedRowsHold(rows, from, off) {
  return rows.length > 0 && rows.every((row, k) => numberedRow(screenRowText(row))?.n === from + k - off + 1);
}

/** Main's page starts for one tmux target, stamped by main (`at`, ms), in order; and the least gap between two. */
export function startsOf(stamps, target) {
  const at = stamps.filter((x) => x.target === target).map((x) => x.at).sort((a, b) => a - b);
  let minGapMs = null;
  for (let i = 1; i < at.length; i += 1) {
    const g = at[i] - at[i - 1];
    if (minGapMs === null || g < minGapMs) minGapMs = g;
  }
  return { n: at.length, minGapMs, at };
}

/** The largest event-loop lag main sampled in `[from, to]` (ms by main's own clock), or 0. */
export function lagWithin(lags, from, to) {
  let most = 0;
  for (const x of lags) if (x.at >= from && x.at <= to && x.lag > most) most = x.lag;
  return most;
}

/**
 * SB3's duty check over one session's starts: each gap beside the compose
 * that preceded it, read as main's largest lag in the 200 ms after a start
 * (a compose runs synchronously on main's loop, so it shows as that lag; the
 * read is an upper bound, which makes the check stricter, never looser).
 */
export function dutyGaps(starts, lags) {
  const out = [];
  for (let i = 1; i < starts.length; i += 1) out.push({ gapMs: starts[i] - starts[i - 1], composeMs: lagWithin(lags, starts[i - 1], starts[i - 1] + 200) });
  return out;
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
      ['the route line names keys and screen among the eleven', (r) => J(routeIdsOf(r.lines)) === J(ROUTE_IDS)],
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
    // PHASE 337.1 (build/p3371/SPEC.md §7.7): the parent is 337 itself
    // (`e3837139`), which has the Screen and no history. 337's own RP read a
    // parent with no Screen at all; that parent is no longer this phase's.
    title: 'the parent has no scrollback',
    clauses: [
      ['GET /v1/scrollback is 404', (r) => r.scrollback === 404],
      ["the door logged the refusal's word, route", (r) => r.routeLogged === true],
      ["the parent's screen answer carries no depth and no space", (r) => r.screen === 200 && r.depthField === false && r.spaceField === false],
      ['the lines name the screen and no scrollback', (r) => Array.isArray(routeIdsOf(r.lines)) && routeIdsOf(r.lines).includes('screen') && !routeIdsOf(r.lines).includes('scrollback')]
    ]
  },
  // ------------------------------------------------------------------ PHASE 337.1, the SB arms (§7.7)
  SB0: {
    title: 'the door asks again for the scrollback route, and says the phone can read what a session printed',
    clauses: [
      ['the door reads changed after the parent confirmed it', (r) => r.parentRanFirst !== true || r.confirmStateBefore === 'changed'],
      ['the route line holds scrollback, eleven routes', (r) => J(routeIdsOf(r.lines)) === J(ROUTE_IDS) && routeIdsOf(r.lines).includes('scrollback')],
      ["the confirm block draws D35's honesty sentence: the terminal and what it printed before", (r) => r.honesty === HONESTY_D35 && typeof r.confirmBlock === 'string' && r.confirmBlock.includes(HONESTY_D35)],
      ['Allow: the door listens', (r) => r.listening === true]
    ]
  },
  SB1: {
    title: "every session's history paged whole, as tmux holds it",
    clauses: [
      ['every session of the matrix was paged whole', (r) => r.required.length > 0 && r.required.every((n) => r.rows.some((x) => x.name === n && x.depth > 0 && x.unserved === 0 && x.rowsCompared === x.depth))],
      ['every page is one the phone joins', (r) => r.rows.length > 0 && r.rows.every((x) => x.problems === 0)],
      ["every row's text equals the probe's own capture-pane -p of its index", (r) => r.rows.length > 0 && r.rows.every((x) => x.textMismatch === 0)],
      ["every run is one pen by the probe's own SGR reader", (r) => r.rows.length > 0 && r.rows.every((x) => x.styleMismatch === 0)],
      ['no window changed size', (r) => r.rows.length > 0 && r.rows.every((x) => x.sizeSame === true)]
    ]
  },
  SB2: {
    title: 'pages while a stand-in prints, and the live poll beside them',
    clauses: [
      ['100 pages each at 200 and at 2,000 lines a second', (r) => ['200', '2000'].every((k) => (r.rates[k]?.pages ?? 0) >= SB2_PAGES)],
      ['every served page verified by number', (r) => ['200', '2000'].every((k) => (r.rates[k]?.served ?? 0) > 0 && r.rates[k].wrong === 0)],
      ['nothing moved, ended or unanswered (busy counted)', (r) => ['200', '2000'].every((k) => r.rates[k]?.moved === 0 && r.rates[k]?.other === 0)],
      ["the live poll's change-to-answer p99 stayed under 250 ms while paging", (r) => r.poll.n >= SB2_CHANGES && r.poll.missed === 0 && typeof r.poll.p99 === 'number' && r.poll.p99 < CHANGE_WITHIN_MS]
    ]
  },
  SB3: {
    title: 'the attack on the page route',
    clauses: [
      ['every refused query is 404 and composes nothing', (r) => r.refused.length >= 15 && r.refused.every((x) => x.status === 404) && r.statementsDuringRefused === 0],
      ['wrap not the width, depth above the history, from past it and the alternate screen: each moved', (r) => ['wrap', 'deep', 'past', 'alt'].every((k) => r.moved[k] === 'moved')],
      // One source holds at most PER_SOURCE_MAX (4) connections (door/limits.ts), and every phone of a run reaches the door
      // through the stand-in forwarder from ONE source, so at most four pages are ever in main at once from outside: one
      // in flight and three waiting, inside SCROLLBACK_QUEUE_MAX. The rest are refused at the cap (status 0). The queue's
      // own bound past four is the hostile client's arm over the SHIPPING reader (build/p3371/SPEC.md §6.2).
      ['200 page reads from one phone in 2 s: every answer in its form, none waiting past the queue', (r) => r.burst.sent === SB3_BURST && r.burst.malformed === 0 && r.burst.notFound === 0 && r.burst.served > 0 && r.burst.late === 0 && r.burst.served + r.burst.busy + r.burst.refusedAtCap === r.burst.sent],
      ["main's event-loop lag p99 stayed under 50 ms through the burst", (r) => r.lag.samples > 0 && typeof r.lag.p99 === 'number' && r.lag.p99 < SB3_LAG_P99_MS],
      ["one session's starts at least 250 ms apart by main's own stamps", (r) => r.starts.n >= 3 && typeof r.starts.minGapMs === 'number' && r.starts.minGapMs >= SB_MIN_GAP_MS - SB_GAP_SLACK_MS],
      // Read only when it was readable: with fewer than three gaps the run says SB3-worst UNREADABLE instead.
      ['on a worst-colour history each start waited SCREEN_DUTY_FACTOR times the compose before it', (r) => (typeof r.worst.unread === 'string' && r.worst.gaps.length < 3) || (r.worst.gaps.length >= 3 && r.worst.gaps.every((g) => g.gapMs >= Math.max(SB_MIN_GAP_MS, SB_DUTY_FACTOR * g.composeMs) - SB_GAP_SLACK_MS))],
      ['a page on a session that ended: ended', (r) => r.ended === 'ended'],
      ['the door switched off while pages waited: every one answered or cut within the stop join', (r) => r.doorOff.pending >= 2 && r.doorOff.settled === r.doorOff.pending && typeof r.doorOff.maxMs === 'number' && r.doorOff.maxMs <= SB_STOP_JOIN_MS + SB_STOP_SLACK_MS]
    ]
  },
  SB4: {
    title: 'the history moved under a held depth',
    clauses: [
      ['a session with history-limit 1,000 trimmed under a held depth: moved', (r) => r.trim.staged === true && r.trim.why === 'moved'],
      ['clear in the shell emptied the history: moved', (r) => r.clear.staged === true && r.clear.why === 'moved']
    ]
  },
  SB5: {
    title: 'the loopback machine stops answering, and comes back',
    clauses: [
      ['the machine stopped: unreachable', (r) => r.paused.staged === true && r.paused.why === 'unreachable'],
      ['back: paged again', (r) => r.back.why === null && r.back.rows > 0 && r.back.problems === 0]
    ]
  },
  SB6: {
    title: 'no paged row is kept or shown anywhere',
    clauses: [
      ['app.log was read and every file under the profile and HOME was scanned', (r) => r.appLogRead === true && r.filesScanned > 0],
      ['a canary row was paged to the phone', (r) => r.canaryPaged === true],
      ["no paged row in any file but the sessions' own saved screens", (r) => r.hits.length === 0],
      ['no paged row on any command line', (r) => r.psSamples > 0 && r.psHits === 0]
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

/** HEAD's honesty sentence since Phase 337.1 (D35); S0 reads it as SB0 does. */
const HONESTY = HONESTY_D35;
const LINES = ['Tortie for Mac on p337 (tortie-test.ts.net)', ROUTE_LINE, WRITE_LINE];
/** The parent's (337's) lines: ten routes, the same write line. */
const PARENT_LINES = [PARENT_ROUTE_LINE, WRITE_LINE];
const row1 = (name, extra = {}) => ({ name, status: 200, screen: true, problems: [], rowsEqual: true, geometryEqual: true, sizeSame: true, ...extra });
const moves = (n) => Array.from({ length: n }, (_, i) => ({ drawn: i % 9, picture: i % 9 }));

export const GRADER_FIXTURES = {
  S0: {
    pass: { lines: LINES, honesty: HONESTY, confirmBlock: `${LINES.join('\n')}\n${HONESTY}`, parentRanFirst: true, confirmStateBefore: 'changed', listening: true },
    breaks: {
      'the door reads changed after the parent confirmed it': (r) => void (r.confirmStateBefore = 'confirmed'),
      'the route line names keys and screen among the eleven': (r) => void (r.lines = [LINES[0], PARENT_LINES[0], WRITE_LINE]),
      "the lines hold D35's write line": (r) => void (r.lines = [LINES[0], ROUTE_LINE, 'Lets an allowed phone end a session, answer a numbered question and send a session one message']),
      'the confirm block draws the honesty sentence': (r) => void (r.confirmBlock = LINES.join('\n')),
      'Allow: the door listens': (r) => void (r.listening = false)
    },
    refused: [
      { what: 'a route line one route short', clause: 'the route line names keys and screen among the eleven', edit: (r) => void (r.lines = [LINES[0], 'Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, session, sessions, turns', WRITE_LINE]) },
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
    pass: { scrollback: 404, routeLogged: true, screen: 200, depthField: false, spaceField: false, lines: PARENT_LINES },
    breaks: {
      'GET /v1/scrollback is 404': (r) => void (r.scrollback = 200),
      "the door logged the refusal's word, route": (r) => void (r.routeLogged = false),
      "the parent's screen answer carries no depth and no space": (r) => void (r.depthField = true),
      'the lines name the screen and no scrollback': (r) => void (r.lines = LINES)
    },
    refused: [
      { what: 'a parent with no Screen either (the screen read 404, as 337 read its own parent)', clause: "the parent's screen answer carries no depth and no space", edit: (r) => void (r.screen = 404) },
      { what: 'a parent answer carrying a space with no depth', clause: "the parent's screen answer carries no depth and no space", edit: (r) => void (r.spaceField = true) },
      { what: 'a parent whose lines were never read', clause: 'the lines name the screen and no scrollback', edit: (r) => void (r.lines = []) },
      { what: "a parent before 337 (its lines name no screen)", clause: 'the lines name the screen and no scrollback', edit: (r) => void (r.lines = ['Answers these and nothing else: blocked, choose, end, pair, say, session, sessions, turns']) },
      { what: 'a scrollback read cut before HTTP (status 0, not 404)', clause: 'GET /v1/scrollback is 404', edit: (r) => void (r.scrollback = 0) }
    ]
  },
  SB0: {
    pass: { lines: LINES, honesty: HONESTY_D35, confirmBlock: `${LINES.join('\n')}\n${HONESTY_D35}\nAllow`, parentRanFirst: true, confirmStateBefore: 'changed', listening: true },
    breaks: {
      'the door reads changed after the parent confirmed it': (r) => void (r.confirmStateBefore = 'confirmed'),
      'the route line holds scrollback, eleven routes': (r) => void (r.lines = [LINES[0], PARENT_ROUTE_LINE, WRITE_LINE]),
      "the confirm block draws D35's honesty sentence: the terminal and what it printed before": (r) => void (r.confirmBlock = `${LINES.join('\n')}\nAllow`),
      'Allow: the door listens': (r) => void (r.listening = false)
    },
    refused: [
      { what: "337's honesty sentence, which says nothing of what a session printed before", clause: "the confirm block draws D35's honesty sentence: the terminal and what it printed before", edit: (r) => Object.assign(r, { honesty: 'A phone you allow can see what any session’s screen shows and type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.', confirmBlock: `${LINES.join('\n')}\nA phone you allow can see what any session’s screen shows and type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.\nAllow` }) },
      { what: 'a route line with scrollback and without screen', clause: 'the route line holds scrollback, eleven routes', edit: (r) => void (r.lines = [LINES[0], 'Answers these and nothing else: blocked, choose, end, keys, pair, say, scrollback, session, sessions, turns', WRITE_LINE]) }
    ]
  },
  SB1: {
    pass: { required: ['p3371-claude', 'p3371-shell'], rows: [{ name: 'p3371-claude', depth: 480, pages: 5, unserved: 0, rowsCompared: 480, problems: 0, textMismatch: 0, styleMismatch: 0, sizeSame: true }, { name: 'p3371-shell', depth: 3004, pages: 31, unserved: 0, rowsCompared: 3004, problems: 0, textMismatch: 0, styleMismatch: 0, sizeSame: true }] },
    breaks: {
      'every session of the matrix was paged whole': (r) => void (r.rows[1].unserved = 1),
      'every page is one the phone joins': (r) => void (r.rows[0].problems = 1),
      "every row's text equals the probe's own capture-pane -p of its index": (r) => void (r.rows[1].textMismatch = 1),
      "every run is one pen by the probe's own SGR reader": (r) => void (r.rows[0].styleMismatch = 1),
      'no window changed size': (r) => void (r.rows[0].sizeSame = false)
    },
    refused: [
      { what: 'a session left out of the matrix', clause: 'every session of the matrix was paged whole', edit: (r) => void (r.required = [...r.required, 'p3371-far']) },
      { what: 'a history paged with a hole (rows compared short of its depth)', clause: 'every session of the matrix was paged whole', edit: (r) => void (r.rows[1].rowsCompared = 2904) },
      { what: 'a session with no history at all', clause: 'every session of the matrix was paged whole', edit: (r) => Object.assign(r.rows[0], { depth: 0, rowsCompared: 0 }) }
    ]
  },
  SB2: {
    pass: { rates: { 200: { pages: 100, served: 100, busy: 0, moved: 0, other: 0, wrong: 0 }, 2000: { pages: 100, served: 99, busy: 1, moved: 0, other: 0, wrong: 0 } }, poll: { n: 20, missed: 0, p50: 104, p99: 141 } },
    breaks: {
      '100 pages each at 200 and at 2,000 lines a second': (r) => void (r.rates['2000'].pages = 99),
      'every served page verified by number': (r) => void (r.rates['200'].wrong = 1),
      'nothing moved, ended or unanswered (busy counted)': (r) => void (r.rates['2000'].moved = 1),
      "the live poll's change-to-answer p99 stayed under 250 ms while paging": (r) => void (r.poll.p99 = 250)
    },
    refused: [
      { what: 'a change the poll never answered', clause: "the live poll's change-to-answer p99 stayed under 250 ms while paging", edit: (r) => void (r.poll.missed = 1) },
      { what: 'a rate with no page served (every one busy)', clause: 'every served page verified by number', edit: (r) => Object.assign(r.rates['2000'], { served: 0, busy: 100 }) }
    ]
  },
  SB3: {
    pass: {
      refused: Array.from({ length: 22 }, (_, i) => ({ what: `q${String(i)}`, status: 404 })),
      statementsDuringRefused: 0,
      moved: { wrap: 'moved', deep: 'moved', past: 'moved', alt: 'moved' },
      burst: { sent: 200, served: 9, busy: 0, refusedAtCap: 191, malformed: 0, notFound: 0, late: 0 },
      lag: { samples: 410, p99: 12.4 },
      starts: { n: 9, minGapMs: 250.4 },
      worst: { gaps: [{ gapMs: 251.1, composeMs: 22 }, { gapMs: 250.6, composeMs: 19 }, { gapMs: 250.2, composeMs: 25 }], unread: null },
      ended: 'ended',
      doorOff: { pending: 4, settled: 4, maxMs: 1_090 }
    },
    breaks: {
      'every refused query is 404 and composes nothing': (r) => void (r.statementsDuringRefused = 1),
      'wrap not the width, depth above the history, from past it and the alternate screen: each moved': (r) => void (r.moved.alt = null),
      '200 page reads from one phone in 2 s: every answer in its form, none waiting past the queue': (r) => void (r.burst.malformed = 1),
      "main's event-loop lag p99 stayed under 50 ms through the burst": (r) => void (r.lag.p99 = 50),
      "one session's starts at least 250 ms apart by main's own stamps": (r) => void (r.starts.minGapMs = 120),
      'on a worst-colour history each start waited SCREEN_DUTY_FACTOR times the compose before it': (r) => void (r.worst.gaps[1] = { gapMs: 250.6, composeMs: 80 }),
      'a page on a session that ended: ended': (r) => void (r.ended = 'unreachable'),
      'the door switched off while pages waited: every one answered or cut within the stop join': (r) => void (r.doorOff.maxMs = 8_000)
    },
    refused: [
      { what: 'a refused query that was asked of tmux anyway', clause: 'every refused query is 404 and composes nothing', edit: (r) => void (r.statementsDuringRefused = 2) },
      { what: 'a query main answered 200', clause: 'every refused query is 404 and composes nothing', edit: (r) => void (r.refused[3].status = 200) },
      { what: 'a page that waited behind more than the queue (late)', clause: '200 page reads from one phone in 2 s: every answer in its form, none waiting past the queue', edit: (r) => void (r.burst.late = 1) },
      { what: 'a burst whose answers do not add up to what was sent (one lost)', clause: '200 page reads from one phone in 2 s: every answer in its form, none waiting past the queue', edit: (r) => void (r.burst.refusedAtCap = 190) },
      { what: 'a burst answer that was neither a page, busy nor refused at the cap (a 404)', clause: '200 page reads from one phone in 2 s: every answer in its form, none waiting past the queue', edit: (r) => void (r.burst.notFound = 1) },
      { what: 'a page held past the join (8 s, the queue at 250 ms a start, §Attack B3)', clause: 'the door switched off while pages waited: every one answered or cut within the stop join', edit: (r) => void (r.doorOff.settled = 3) },
      { what: 'no stamps read from main', clause: "one session's starts at least 250 ms apart by main's own stamps", edit: (r) => void (r.starts = { n: 0, minGapMs: null }) },
      { what: 'two worst-colour gaps and no word saying why (the fix round: never a silent pass)', clause: 'on a worst-colour history each start waited SCREEN_DUTY_FACTOR times the compose before it', edit: (r) => void (r.worst.gaps = r.worst.gaps.slice(0, 2)) },
      { what: 'a worst-colour gap too short beside an unread word', clause: 'on a worst-colour history each start waited SCREEN_DUTY_FACTOR times the compose before it', edit: (r) => void Object.assign(r.worst, { unread: 'x', gaps: [...r.worst.gaps, { gapMs: 251, composeMs: 90 }] }) }
    ]
  },
  SB4: {
    pass: { trim: { staged: true, why: 'moved', held: 991, dropped: 904 }, clear: { staged: true, why: 'moved', held: 480, after: 0 } },
    breaks: {
      'a session with history-limit 1,000 trimmed under a held depth: moved': (r) => void (r.trim.why = null),
      'clear in the shell emptied the history: moved': (r) => void (r.clear.why = null)
    },
    refused: [{ what: 'a trim never staged', clause: 'a session with history-limit 1,000 trimmed under a held depth: moved', edit: (r) => void (r.trim.staged = false) }]
  },
  SB5: {
    pass: { paused: { staged: true, why: 'unreachable' }, back: { why: null, rows: 100, problems: 0 } },
    breaks: {
      'the machine stopped: unreachable': (r) => void (r.paused.why = 'busy'),
      'back: paged again': (r) => void (r.back.why = 'unreachable')
    },
    refused: [
      { what: 'a pause never staged', clause: 'the machine stopped: unreachable', edit: (r) => void (r.paused.staged = false) },
      { what: 'a page after it came back the phone would refuse', clause: 'back: paged again', edit: (r) => void (r.back.problems = 1) }
    ]
  },
  SB6: {
    pass: { appLogRead: true, filesScanned: 1_904, canaryPaged: true, hits: [], snapshotHits: 2, psSamples: 120, psHits: 0 },
    breaks: {
      'app.log was read and every file under the profile and HOME was scanned': (r) => void (r.filesScanned = 0),
      'a canary row was paged to the phone': (r) => void (r.canaryPaged = false),
      "no paged row in any file but the sessions' own saved screens": (r) => void (r.hits = [{ file: 'profile/logs/app.log', canary: 'p3371sb' }]),
      'no paged row on any command line': (r) => void (r.psHits = 1)
    },
    refused: [{ what: 'a ps sampler that never sampled', clause: 'no paged row on any command line', edit: (r) => Object.assign(r, { psSamples: 0, psHits: 0 }) }]
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
  say(constWord(contract, 'POCKET_DOOR_HONESTY') === HONESTY_D35, "the fixtures' honesty sentence is the contract's own, byte for byte (D35)");
  say(HONESTY_D35.includes('terminal shows and what it printed before'), "D35's sentence says the phone sees what a terminal printed before");
  // ROUTE_LINE against the tree's own POCKET_ROUTE_IDS (Phase 337.1 added scrollback), and the parent's line one route short of it.
  const treeIds = [...(/POCKET_ROUTE_IDS = \[([\s\S]*?)\] as const/.exec(contract)?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
  say(treeIds.length > 0 && J(routeIdsOf([ROUTE_LINE])) === J(treeIds), `ROUTE_LINE names exactly the tree's POCKET_ROUTE_IDS (${treeIds.join(', ')})`);
  say(J(routeIdsOf([PARENT_ROUTE_LINE])) === J(ROUTE_IDS.filter((id) => id !== 'scrollback')), "PARENT_ROUTE_LINE is HEAD's less scrollback");
  // The reader's bounds by value against the tree's own (src/main/screen/scrollback.ts, watch.ts, door/limits.ts).
  {
    const src = (rel) => {
      try {
        return readFileSync(join(ROOT, rel), 'utf8');
      } catch {
        return '';
      }
    };
    const num = (text, name) => {
      const m = new RegExp(`export const ${name} = ([0-9_]+);`).exec(text);
      return m === null ? null : Number(m[1].replace(/_/g, ''));
    };
    const sb = src('src/main/screen/scrollback.ts');
    say(num(sb, 'SCROLLBACK_MIN_GAP_MS') === SB_MIN_GAP_MS && num(sb, 'SCROLLBACK_QUEUE_MAX') === SB_QUEUE_MAX, `SB_MIN_GAP_MS and SB_QUEUE_MAX are the tree's (${String(num(sb, 'SCROLLBACK_MIN_GAP_MS'))}, ${String(num(sb, 'SCROLLBACK_QUEUE_MAX'))})`);
    say(num(src('src/main/screen/watch.ts'), 'SCREEN_DUTY_FACTOR') === SB_DUTY_FACTOR, "SB_DUTY_FACTOR is the tree's SCREEN_DUTY_FACTOR");
    say(num(src('src/main/pocket/door/limits.ts'), 'DOOR_STOP_JOIN_MS') === SB_STOP_JOIN_MS, "SB_STOP_JOIN_MS is the tree's DOOR_STOP_JOIN_MS");
    say(num(src('src/shared/ipc/pocket.ts'), 'POCKET_SCROLLBACK_MAX_COUNT') === SB_MAX_COUNT, "SB_MAX_COUNT is the tree's POCKET_SCROLLBACK_MAX_COUNT");
  }
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
    RP: { scrollback: 404, routeLogged: true, screen: 200, depthField: false, spaceField: false, lines: ['Publishes https://tortie-test.ts.net:8443', ...PARENT_LINES] },
    SB0: { lines: ['Publishes https://tortie-test.ts.net:8443', ROUTE_LINE, WRITE_LINE], honesty: HONESTY_D35, confirmBlock: `Publishes https://tortie-test.ts.net:8443\n${ROUTE_LINE}\n${WRITE_LINE}\n${HONESTY_D35}\nAllow`, parentRanFirst: false, confirmStateBefore: 'unconfirmed', listening: true },
    SB1: { required: [...SB1_MATRIX], rows: SB1_MATRIX.map((name) => ({ name, depth: 700, pages: 7, unserved: 0, rowsCompared: 700, problems: 0, textMismatch: 0, styleMismatch: 0, sizeSame: true })) },
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
  // PHASE 337.1: the SB readers.
  {
    const ask = { from: 100, count: 10, depth: 500, wrap: 80, keep: 'bottom' };
    const honest = scrollbackTarget('s1', ask);
    const refused = refusedTargets('s1', ask);
    say(refused.length >= 15 && refused.every((x) => x.target !== honest) && new Set(refused.map((x) => x.target)).size === refused.length, `refusedTargets builds ${String(refused.length)} distinct hostile targets, none the honest one`);
    say(refused.some((x) => /[?&]cols=/.test(x.target)) && refused.some((x) => /count=129/.test(x.target)) && refused.some((x) => /keep=TOP/.test(x.target)), 'refusedTargets names cols, a count of 129 and keep TOP among them');
    const run1 = (text, style = 0) => ({ text, style, cells: [...text].length });
    const rows = [[run1('L000001 a')], [run1('L000002', 0), run1(' b', 1)]];
    const same = pageAgainst(rows, 'L000001 a\nL000002 b\n', 'L000001 a\nL000002\u001b[1m b\u001b[0m\n');
    say(same.textMismatch === 0 && same.styleMismatch === 0, 'pageAgainst takes a page equal to the probe\'s own two captures');
    say(pageAgainst(rows, 'L000001 a\nL000003 b\n', 'L000001 a\nL000002 b\n').textMismatch === 1, 'pageAgainst names a row whose text differs');
    say(pageAgainst(rows, 'L000001 a\n', 'L000001 a\n').textMismatch >= 1, 'pageAgainst refuses a page longer than the capture');
    say(pageAgainst(rows, 'L000001 a\nL000002 b\n', 'L000001 a\nL000002 b\n').styleMismatch === 0 && pageAgainst([[run1('L000001 a')], [run1('L000002 b')]], 'L000001 a\nL000002 b\n', 'L000001 a\nL000002\u001b[1m b\n').styleMismatch === 1, 'pageAgainst refuses a run that spans two pens by the probe\'s own reader');
    say(offsetOfFirst('p337 % seq\nL000001 x\nL000002 x\n') === 1 && offsetOfFirst('nothing\n') === null, 'offsetOfFirst finds the first numbered line');
    say(numberedRowsHold([[run1('L000004 x')], [run1('L000005 x')]], 4, 1) && !numberedRowsHold([[run1('L000004 x')], [run1('L000006 x')]], 4, 1) && !numberedRowsHold([], 4, 1), 'numberedRowsHold takes contiguous lines at their index and refuses a skipped one');
    const st = startsOf([{ target: '$3', at: 1000 }, { target: '$4', at: 1100 }, { target: '$3', at: 1251 }, { target: '$3', at: 1500 }], '$3');
    say(st.n === 3 && st.minGapMs === 249, "startsOf reads one target's starts and the least gap between them");
    const lags = [{ at: 1005, lag: 3 }, { at: 1020, lag: 22 }, { at: 1300, lag: 40 }];
    say(lagWithin(lags, 1000, 1200) === 22 && lagWithin(lags, 2000, 3000) === 0, 'lagWithin reads the largest lag in a window');
    const dg = dutyGaps([1000, 1251], lags);
    say(dg.length === 1 && dg[0].gapMs === 251 && dg[0].composeMs === 22, 'dutyGaps pairs each gap with the compose lag after the start before it');
  }
  // THE PROBE REVIEW OF PHASE 337.1 (2026-10-06): each SB grader and RP on a
  // reading of the review's own, composed the way its arm composes it (an
  // honest run), and on broken ones, each the symptom of a defect class.
  {
    const sbPage = (rows) => ({ r: { status: 200, answer: { sessionId: 's', at: 1, from: 100, depth: 900, wrap: 80, space: '0123456789ab', styles: [{ fg: '#d4d4d4', bg: null, bold: false, dim: false, italic: false, underline: false, strike: false }], rows: Array.from({ length: rows }, (_, k) => [{ text: `L${String(101 + k).padStart(6, '0')}`, style: 0, cells: 7 }]), why: null, sentence: null }, ms: 260 }, ask: { from: 100, count: rows, depth: 900, wrap: 80, keep: 'bottom' } });
    const absent = (why, ms = 3) => ({ r: { status: 200, answer: { sessionId: 's', at: 1, from: null, depth: null, wrap: null, space: null, styles: [], rows: [], why, sentence: 'x' }, ms }, ask: null });
    const capCut = (ms) => ({ r: { status: 0, answer: null, ms, error: 'socket hang up' }, ask: null });
    // An honest burst as the arm settles it: four reach main past the per-source cap, one in flight and three
    // waiting, the rest refused at the cap at once.
    const honestBurst = [...Array.from({ length: 9 }, () => sbPage(100)), absent('busy'), ...Array.from({ length: 190 }, () => capCut(4))];
    const bOk = burstOf(honestBurst);
    say(bOk.sent === 200 && bOk.served === 9 && bOk.busy === 1 && bOk.refusedAtCap === 190 && bOk.late === 0 && bOk.malformed === 0, `burstOf sorts an honest burst: ${J(bOk)}`);
    const sb3Of = (burst) => ({ ...structuredClone(GRADER_FIXTURES.SB3.pass), burst });
    const g3 = grade('SB3', sb3Of(bOk));
    say(g3.ok, `SB3 passes the review's honest burst${g3.ok ? '' : `, failing ${J(g3.failed)}`}`);
    // A page main held past the queue until the phone's own 20 s cut it: status 0, as a cap refusal is.
    const hung = burstOf([...honestBurst.slice(0, 199), { r: { status: 0, answer: null, ms: 20_004, error: 'timed out' }, ask: null }]);
    const g3h = grade('SB3', sb3Of(hung));
    say(hung.late === 1 && !g3h.ok && g3h.failed.includes('200 page reads from one phone in 2 s: every answer in its form, none waiting past the queue'), `SB3 refuses a page held until the phone's timeout, which the arm counted as refused at the cap before the review (${J(hung)})`);
    const lateServed = burstOf([...honestBurst.slice(0, 8), { ...sbPage(100), r: { ...sbPage(100).r, ms: SB_LATE_MS + 1 } }, ...honestBurst.slice(9)]);
    say(lateServed.late === 1 && !grade('SB3', sb3Of(lateServed)).ok, 'SB3 refuses a page served after waiting past the queue');
    const wrongRows = burstOf([...honestBurst.slice(0, 8), { ...sbPage(100), ask: { from: 100, count: 50, depth: 900, wrap: 80, keep: 'bottom' } }, ...honestBurst.slice(9)]);
    say(wrongRows.malformed === 1 && !grade('SB3', sb3Of(wrongRows)).ok, 'SB3 refuses a burst page holding rows it was not asked for');
    // The readings each other arm composes on a run that went right, and the broken one beside each.
    const mine = {
      SB0: { lines: ['Publishes https://tortie-test.ts.net:8443', ROUTE_LINE, WRITE_LINE], honesty: HONESTY_D35, confirmBlock: `Publishes https://tortie-test.ts.net:8443\n${ROUTE_LINE}\n${WRITE_LINE}\n${HONESTY_D35}\nAllow`, parentRanFirst: true, confirmStateBefore: 'changed', listening: true },
      SB1: { required: [...SB1_MATRIX], rows: SB1_MATRIX.map((name) => ({ name, depth: name === 'p3371-shell' ? 3_004 : 1_472, pages: name === 'p3371-shell' ? 31 : 15, unserved: 0, rowsCompared: name === 'p3371-shell' ? 3_004 : 1_472, problems: 0, textMismatch: 0, styleMismatch: 0, sizeSame: true, canary: name === 'p3371-canary' })) },
      SB2: { rates: { 200: { pages: 100, served: 100, busy: 0, moved: 0, other: 0, wrong: 0 }, 2000: { pages: 100, served: 97, busy: 3, moved: 0, other: 0, wrong: 0 } }, poll: { n: 20, missed: 0, p50: 96, p99: 188 } },
      SB4: { trim: { staged: true, why: 'moved', held: 996, dropped: 900 }, clear: { staged: true, why: 'moved', held: 476, after: 0 } },
      SB5: { paused: { staged: true, why: 'unreachable', statusThen: 'running' }, back: { why: null, rows: 100, problems: 0 } },
      SB6: { appLogRead: true, filesScanned: 2_311, canaryPaged: true, hits: [], snapshotHits: 1, psSamples: 233, psHits: 0 },
      RP: { scrollback: 404, routeLogged: true, screen: 200, depthField: false, spaceField: false, lines: ['Publishes https://tortie-test.ts.net:8443', PARENT_ROUTE_LINE, WRITE_LINE] }
    };
    const broken = [
      ['SB0', 'a door whose confirm block still drew 337\'s sentence beside the route line with scrollback', (r) => void (r.confirmBlock = r.confirmBlock.replace(HONESTY_D35, 'A phone you allow can see what any session’s screen shows and type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.'))],
      ['SB0', 'a HEAD launch after the parent that read the door confirmed, so Allow was never asked again', (r) => void (r.confirmStateBefore = 'confirmed')],
      ['SB1', "the far shell's last page answered unreachable (a hole at the top of its history)", (r) => Object.assign(r.rows[5], { unserved: 1, rowsCompared: 1_372 })],
      ['SB1', 'a page of Codex\'s history whose rows hold the pen of the row above', (r) => void (r.rows[1].styleMismatch = 3)],
      ['SB2', "the 2,000-a-second pane trimmed at 25,000 under the held depth (the arm's own staging before the review): pages moved and the lines read off by the trim", (r) => Object.assign(r.rates['2000'], { served: 61, moved: 39, wrong: 61 })],
      ['SB2', 'the live poll missing a change while pages were read', (r) => Object.assign(r.poll, { n: 19, missed: 1 })],
      ['SB4', "a trim that never came, because the session's limit fell back to 25,000 (the arm's own staging before the review)", (r) => Object.assign(r.trim, { staged: false, why: null, dropped: null })],
      ['SB4', 'a clear that left the page served from the old history', (r) => void (r.clear.why = null)],
      ['SB5', "a paused machine answered busy, as if it were this Mac's", (r) => void (r.paused.why = 'busy')],
      ['SB5', 'the machine back, and its page cut short of what was asked', (r) => void (r.back.problems = 1)],
      ['SB6', 'a canary row written into app.log', (r) => void r.hits.push({ file: 'profile/gmux/logs/app.log', canary: 'p3371sb0011223344aa' })],
      ['SB6', 'a canary row on a command line', (r) => void (r.psHits = 2)],
      ['RP', 'a parent whose door answered the page (it is no parent of this phase)', (r) => void (r.scrollback = 200)],
      ['RP', 'a parent whose screen answer already carried a depth', (r) => void (r.depthField = true)]
    ];
    for (const [id, reading] of Object.entries(mine)) {
      const g = grade(id, structuredClone(reading));
      say(g.ok, `${id} passes the review's own honest reading of 2026-10-06${g.ok ? '' : `, failing ${J(g.failed)}`}`);
    }
    for (const [id, what, edit] of broken) {
      const reading = structuredClone(mine[id]);
      edit(reading);
      const g = grade(id, reading);
      say(!g.ok, `${id} refuses ${what}${g.ok ? ' (it PASSED)' : ''}`);
    }
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
  'src/main/screen/scrollback.ts',
  'src/main/pocket/routes.ts',
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

function launchOptions(label, checkout, { inspect = false } = {}) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: checkout,
    tmuxSocket: SOCKET,
    // Phase 337.1: HEAD's launch opens main's inspector (`--inspect=0`, as probe:p320 does), so SB3 reads main's
    // own stamps of each page start and its event-loop lag; the recorder is put in and taken out around SB3.
    args: ['--remote-debugging-port=0', ...(inspect ? ['--inspect=0'] : []), '--use-mock-keychain'],
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
async function launch(label, checkout, body, options = {}) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
  writeQuietAgents(PROFILE);
  return withElectron(launchOptions(label, checkout, options), async (handle) => {
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
// PHASE 337.1 — the SB arms (build/p3371/SPEC.md §7.7), at HEAD, after RN
// ---------------------------------------------------------------------------

const STAND_IN = join(ROOT, 'build', 'p3371', 'history-stand-in.mjs');
/** SB6's canaries: rows a page carries, never typed on any command line (a file the stand-in stacks). */
const sbCanaries = new Set();
/** SB6's sampler and whether a canary row reached the phone; read after the app has gone. */
const SB_STATE = { ps: null, canaryPaged: false, ran: false };

/** A history stand-in started in a shell session, by the probe's own tmux, once its prompt is drawn. */
const standInIn = (main, id, args, options) => startIn(main, id, `exec '${process.execPath}' '${STAND_IN}' ${args}`, options);
/** A list file of captures for the stand-in's `--stack`, repeated until at least `lines` rows. */
function stackList(name, files, lines) {
  const perPass = files.reduce((n, f) => n + readFileSync(f, 'latin1').split('\n').length, 0);
  const reps = Math.max(1, Math.ceil(lines / Math.max(1, perPass)));
  const list = join(DRAWN, `${name}.list`);
  writeFileSync(list, `${Array.from({ length: reps }, () => files).flat().join('\n')}\n`);
  return list;
}
/** The probe's own `#{history_size}` of a session (local or far), or null. */
const historyOf = async (main, id, far = false) => {
  const t = String((far ? farOut : tmuxOut)('display-message', '-p', '-t', await targetOf(main, id), '#{history_size}') ?? '').trim();
  return /^\d+$/.test(t) ? Number(t) : null;
};
/** The phone's picture of a session until it carries a numeric depth: `{ depth, space, cols }`, or null. */
async function depthOf(P, id, ms = 15_000) {
  return waitFor(async () => {
    const s = (await screenRead(P.phone, P.door, id)).answer?.screen ?? null;
    return s !== null && typeof s.depth === 'number' ? { depth: s.depth, space: s.space, cols: s.cols, alternate: s.alternate } : null;
  }, ms, 200);
}
/**
 * A history-limit HELD by the sessions `make` makes (one id, or an object of
 * ids), for as long as they live (SB2, SB4). The global is set while they are
 * made, for a tmux that reads the limit only when a pane is made; then each
 * made session's OWN option is set to it and read back, and the global is put
 * back. THE PROBE REVIEW (2026-10-06): this put the global back the moment the
 * shell was made and set nothing on the session, and the vendored tmux 3.7b
 * (the one the app runs here) applies a changed limit to the panes that exist,
 * so SB4's pane was handed 25,000 again and never trimmed, and SB2's flood
 * pane trimmed at 25,000 (measured on a scratch server: a pane made under a
 * global of 1,000 read `#{history_limit}` 25000 and held 4,971 lines once the
 * global was put back; one whose session option was set kept 1,000, and one
 * set to 100,000 kept it, after the global moved; measure:p337 met the same,
 * §As built item 7). A made session whose limit does not read back THROWS,
 * which its arm reads as UNREADABLE, never as the product's failure. Stated:
 * on 3.7b the global set for a moment also trims every other session of the
 * run to a lower limit (SB4's 1,000), which the arms after SB4 read afresh.
 */
async function withHistoryLimit(main, limit, make) {
  const was = String(tmuxOut('show-options', '-gv', 'history-limit') ?? '').trim();
  tmuxOut('set-option', '-g', 'history-limit', String(limit));
  try {
    const made = await make();
    for (const id of typeof made === 'string' ? [made] : Object.values(made)) {
      const target = await targetOf(main, id);
      tmuxOut('set-option', '-t', target, 'history-limit', String(limit));
      const held = String(tmuxOut('display-message', '-p', '-t', target, '#{history_limit}') ?? '').trim();
      if (held !== String(limit)) throw new Error(`the session ${id} holds a history-limit of ${held === '' ? 'nothing read' : held}, not the ${String(limit)} its arm needs`);
    }
    return made;
  } finally {
    if (/^\d+$/.test(was)) tmuxOut('set-option', '-g', 'history-limit', was);
  }
}

/**
 * MAIN'S OWN STAMPS (SB3), over main's inspector: every page statement's
 * capture (`capture-pane … -S <a> -E <b>`, which only the page reader writes)
 * stamped as main writes it to the control client's pipe, and main's
 * event-loop lag sampled every 10 ms. The command line holds a `$`-id and two
 * numbers, never a row. Put in before SB3 and taken out after it, whatever
 * happened.
 */
const SB_MAIN_PATCH = `(() => {
  if (globalThis.__p3371) return true;
  const rec = { starts: [], lags: [], timer: null, pipes: 0 };
  let last = performance.now();
  rec.timer = setInterval(() => { const t = performance.now(); rec.lags.push({ at: Date.now(), lag: Math.max(0, t - last - 10) }); last = t; if (rec.lags.length > 100000) rec.lags.shift(); }, 10);
  for (const h of process._getActiveHandles()) {
    if (h === null || typeof h !== 'object' || typeof h.write !== 'function' || h.__p3371 !== undefined) continue;
    const original = h.write;
    h.__p3371 = original;
    h.write = function (chunk, ...rest) {
      try {
        const text = typeof chunk === 'string' ? chunk : Buffer.isBuffer(chunk) ? chunk.toString('latin1') : '';
        for (const line of text.split('\\n')) {
          const m = /^capture-pane .*-t '?(\\$[0-9]+)'? -S (-?[0-9]+) -E (-?[0-9]+)/.exec(line);
          if (m !== null) rec.starts.push({ at: Date.now(), target: m[1], a: Number(m[2]), b: Number(m[3]) });
        }
      } catch {}
      return original.call(this, chunk, ...rest);
    };
    rec.pipes += 1;
  }
  globalThis.__p3371 = rec;
  return rec.pipes > 0;
})()`;
const SB_MAIN_RESTORE = `(() => { const rec = globalThis.__p3371; if (!rec) return true; clearInterval(rec.timer); for (const h of process._getActiveHandles()) if (h && h.__p3371) { h.write = h.__p3371; delete h.__p3371; } delete globalThis.__p3371; return true; })()`;
const SB_MAIN_READ = (from) => `JSON.stringify(globalThis.__p3371 ? { starts: globalThis.__p3371.starts.filter((x) => x.at >= ${String(from)}), lags: globalThis.__p3371.lags.filter((x) => x.at >= ${String(from)}) } : null)`;
/** The MAIN process, over the node inspector `--inspect=0` opened (probe:p320's reader). */
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

/** One session's whole history paged by phone P, each page against the probe's own captures (SB1). */
async function pageWhole(main, P, name, id, { far = false } = {}) {
  const read = far ? farOut : tmuxOut;
  const target = await targetOf(main, id);
  const sizeBefore = String(read('display-message', '-p', '-t', target, SIZE) ?? '').trim();
  const pic = await depthOf(P, id);
  const row = { name, depth: pic?.depth ?? 0, pages: 0, unserved: 0, rowsCompared: 0, problems: 0, textMismatch: 0, styleMismatch: 0, sizeSame: false, canary: false };
  if (pic !== null) {
    for (let from = 0; from < pic.depth; ) {
      const ask = { from, count: Math.min(100, pic.depth - from), depth: pic.depth, wrap: pic.cols, keep: 'top' };
      row.pages += 1;
      const r = await scrollbackRead(P.phone, P.door, id, ask);
      const a = r.answer;
      if (r.status !== 200 || a === null || a.why !== null || a.rows.length === 0) {
        row.unserved += 1;
        from += ask.count;
        continue;
      }
      if (scrollbackAnswerProblems(a, ask).length > 0) row.problems += 1;
      const lo = a.from - a.depth;
      const hi = a.from + a.rows.length - 1 - a.depth;
      const plain = read('capture-pane', '-p', '-t', target, '-S', String(lo), '-E', String(hi));
      const styled = read('capture-pane', '-p', '-e', '-t', target, '-S', String(lo), '-E', String(hi));
      const against = pageAgainst(a.rows, plain, styled);
      row.textMismatch += against.textMismatch;
      row.styleMismatch += against.styleMismatch;
      row.rowsCompared += a.rows.length;
      if (a.rows.some((runs) => [...sbCanaries].some((c) => screenRowText(runs).includes(c)))) row.canary = true;
      from = a.from + a.rows.length;
    }
  }
  row.sizeSame = sizeBefore !== '' && sizeBefore === String(read('display-message', '-p', '-t', target, SIZE) ?? '').trim();
  return row;
}

/** The scratch machine's sshd and every child of it, paused for `body` and resumed after, whatever happened (S8's way). */
async function withMachinePaused(body) {
  if (!existsSync(SSHD_CONF)) return { staged: false, value: null };
  const table = processTable();
  const listener = [...table.rows.values()].find((row) => isScratchSshd(row.command, SSHD_CONF)) ?? null;
  if (listener === null) return { staged: false, value: null };
  const recorded = [listener.pid, ...descendantsOf(table.children, listener.pid)];
  try {
    for (const pid of recorded) {
      try {
        process.kill(pid, 'SIGSTOP');
        stopped.add(pid);
      } catch {
        /* gone */
      }
    }
    return { staged: stopped.size > 0, value: await body() };
  } finally {
    resumeStopped();
  }
}

async function runSb(main, handle, A) {
  SB_STATE.ran = true;
  const D = await pairPhone(main, 'p3371 phone D');
  if (!D.ok) throw new Error(`phone D did not pair: ${D.why}`);
  // ---- the sessions ----------------------------------------------------------------------------------
  const sb = {};
  const groups = h2Groups(ROOT);
  sb.claude = await agentSession(main, 'p3371-claude', 'claude', join(PROJECTS, 'p3371-claude'));
  sb.codex = await agentSession(main, 'p3371-codex', 'codex', join(PROJECTS, 'p3371-codex'));
  // Claude Code and Codex inline after their committed screens: each screen is drawn over the last, and the
  // stand-in's clear (ESC [ H ESC [ 2 J) scrolls the screen it clears into tmux's history (§14 M8).
  const named = (re) => readdirSync(join(ROOT, 'build', 'fixtures', 'reply')).filter((n) => re.test(n)).sort();
  await tell(sb.claude, [...named(/^claude-.*\.(?:ansi|txt)$/).map((fixture) => ({ op: 'screen', fixture })), { op: 'idle' }]);
  await tell(sb.codex, [...named(/^codex-.*\.(?:ansi|txt)$/).map((fixture) => ({ op: 'screen', fixture })), { op: 'idle' }]);
  sb.shell = await shell(main, join(PROJECTS, 'p3371-shell'), 'p3371-shell');
  await startIn(main, sb.shell, `seq -f 'L%06g' 1 3000`);
  sb.gemini = await shell(main, join(PROJECTS, 'p3371-gemini'), 'p3371-gemini');
  await standInIn(main, sb.gemini, `--stack '${stackList('p3371-gemini', groups.gemini, 600)}'`);
  sb.qwen = await shell(main, join(PROJECTS, 'p3371-qwen'), 'p3371-qwen');
  await standInIn(main, sb.qwen, `--stack '${stackList('p3371-qwen', groups.qwen, 600)}'`);
  const canaryFile = join(DRAWN, 'p3371-canary.txt');
  {
    const rows = [];
    for (let i = 0; i < 40; i += 1) {
      const c = `p3371sb${randomBytes(6).toString('hex')}`;
      sbCanaries.add(c);
      rows.push(`${c} row ${String(i)}`);
    }
    writeFileSync(canaryFile, `${rows.join('\n')}\n`);
  }
  sb.canary = await shell(main, join(PROJECTS, 'p3371-canary'), 'p3371-canary');
  await standInIn(main, sb.canary, `--stack '${stackList('p3371-canary', [canaryFile], 400)}'`);
  const farPath = join(FAR, 'p3371');
  mkdirSync(farPath, { recursive: true });
  sb.far = await shell(main, farPath, 'p3371-far', MACHINE_ID);
  await startIn(main, sb.far, `seq -f 'L%06g' 1 1500`, { far: true });
  await sleep(3_000);
  say(`SB sessions made: ${J(sb)}`);

  // SB6's sampler, from the first page to the last.
  SB_STATE.ps = startPsSampler(sbCanaries);

  // ---- SB1: every session's history, paged whole ----------------------------------------------------
  await armSafely('SB1', async () => {
    const matrix = [
      ['p3371-claude', sb.claude],
      ['p3371-codex', sb.codex],
      ['p3371-shell', sb.shell],
      ['p3371-gemini', sb.gemini],
      ['p3371-qwen', sb.qwen],
      ['p3371-far', sb.far, true],
      ['p3371-canary', sb.canary]
    ];
    const rows = [];
    for (const [name, id, far] of matrix) rows.push(await pageWhole(main, A, name, id, { far: far === true }));
    SB_STATE.canaryPaged = rows.find((r) => r.name === 'p3371-canary')?.canary === true;
    say(`SB1 paged: ${rows.map((r) => `${r.name} ${String(r.rowsCompared)} of ${String(r.depth)} rows in ${String(r.pages)} pages`).join('; ')}`);
    arm('SB1', { required: [...SB1_MATRIX], rows });
  });

  // ---- SB2: pages while a stand-in prints, the live poll beside them --------------------------------
  await armSafely('SB2', async () => {
    const made = await withHistoryLimit(main, 100_000, async () => {
      const r200 = await shell(main, join(PROJECTS, 'p3371-r200'), 'p3371-r200');
      const r2000 = await shell(main, join(PROJECTS, 'p3371-r2000'), 'p3371-r2000');
      return { r200, r2000 };
    });
    await standInIn(main, made.r200, '--rate 200 --total 40000');
    await standInIn(main, made.r2000, '--rate 2000 --total 90000');
    const pollShell = await shell(main, join(PROJECTS, 'p3371-poll'), 'p3371-poll');
    const offsetFor = async (id) => {
      await waitFor(async () => ((await historyOf(main, id)) ?? 0) >= 400 ? true : null, 30_000, 200);
      const h = (await historyOf(main, id)) ?? 0;
      return offsetOfFirst(tmuxOut('capture-pane', '-p', '-t', await targetOf(main, id), '-S', '-', '-E', String(-Math.max(0, h - 80))));
    };
    const pageLoop = async (id, off) => {
      const t = { pages: 0, served: 0, busy: 0, moved: 0, other: 0, wrong: 0 };
      const until = Date.now() + 120_000;
      while (t.pages < SB2_PAGES && Date.now() < until) {
        const pic = await depthOf(A, id, 5_000);
        if (pic === null || pic.depth < 300) continue;
        const ask = { from: pic.depth - 250, count: 100, depth: pic.depth, wrap: pic.cols, keep: 'bottom' };
        const r = await scrollbackRead(A.phone, A.door, id, ask);
        t.pages += 1;
        const a = r.answer;
        if (r.status !== 200 || a === null) t.other += 1;
        else if (a.why === 'busy') t.busy += 1;
        else if (a.why === 'moved') t.moved += 1;
        else if (a.why !== null) t.other += 1;
        else {
          t.served += 1;
          if (scrollbackAnswerProblems(a, ask).length > 0 || a.from !== ask.from || !numberedRowsHold(a.rows, a.from, off)) t.wrong += 1;
        }
      }
      return t;
    };
    const pollLoop = async () => {
      const target = await targetOf(main, pollShell);
      await waitFor(() => (String(tmuxOut('capture-pane', '-p', '-t', target) ?? '').includes('p337') ? true : null), 30_000, 250);
      const times = [];
      let missed = 0;
      for (let i = 0; i < SB2_CHANGES; i += 1) {
        const base = await screenRead(D.phone, D.door, pollShell);
        let settledAt = null;
        const pending = screenRead(D.phone, D.door, pollShell, { since: base.answer?.revision ?? null, timeoutMs: 30_000 }).then((r) => {
          settledAt = Date.now();
          return r;
        });
        await sleep(1_000);
        const drawnAt = Date.now();
        tmuxOut('send-keys', '-t', target, '-l', 'z');
        const changed = await pending;
        if (changed.answer === null || changed.answer.unchanged !== false || settledAt === null || settledAt < drawnAt) missed += 1;
        else times.push(settledAt - drawnAt);
        tmuxOut('send-keys', '-t', target, 'C-u');
        await sleep(300);
      }
      return { n: times.length, missed, p50: quantile(times, 0.5), p99: quantile(times, 0.99) };
    };
    const [off200, off2000] = [await offsetFor(made.r200), await offsetFor(made.r2000)];
    if (off200 === null || off2000 === null) return cannotRead('SB2', `the numbered lines were not found in the history (offsets ${J([off200, off2000])})`);
    const [t200, t2000, poll] = await Promise.all([pageLoop(made.r200, off200), pageLoop(made.r2000, off2000), pollLoop()]);
    say(`SB2: 200/s ${J(t200)}; 2000/s ${J(t2000)}; the live poll while paging ${J(poll)}`);
    arm('SB2', { rates: { 200: t200, 2000: t2000 }, poll });
  });

  // ---- SB4: the history moved under a held depth --------------------------------------------------------
  await armSafely('SB4', async () => {
    const trim = { staged: false, why: null, held: null, dropped: null };
    const trimId = await withHistoryLimit(main, 1_000, () => shell(main, join(PROJECTS, 'p3371-trim'), 'p3371-trim'));
    await standInIn(main, trimId, '--rate 400 --total 4000');
    const pic = await waitFor(async () => {
      const p = await depthOf(A, trimId, 2_000);
      return p !== null && p.depth >= 980 ? p : null;
    }, 30_000, 50);
    if (pic !== null) {
      trim.held = pic.depth;
      let last = pic.depth;
      for (let k = 0; k < 2_000 && trim.dropped === null; k += 1) {
        const h = await historyOf(main, trimId);
        if (h !== null && h < last) trim.dropped = h;
        else {
          if (h !== null) last = h;
          await sleep(5);
        }
      }
      if (trim.dropped !== null) {
        const r = await scrollbackRead(A.phone, A.door, trimId, { from: 600, count: 50, depth: pic.depth, wrap: pic.cols, keep: 'bottom' });
        trim.staged = true;
        trim.why = r.answer?.why ?? `status ${String(r.status)}`;
      }
    }
    const clear = { staged: false, why: null, held: null, after: null };
    const clearId = await shell(main, join(PROJECTS, 'p3371-clear'), 'p3371-clear');
    await startIn(main, clearId, `seq -f 'L%06g' 1 500`);
    const held = await waitFor(async () => {
      const p = await depthOf(A, clearId, 2_000);
      return p !== null && p.depth >= 400 ? p : null;
    }, 20_000, 200);
    if (held !== null) {
      clear.held = held.depth;
      const target = await targetOf(main, clearId);
      tmuxOut('send-keys', '-t', target, '-l', 'clear');
      tmuxOut('send-keys', '-t', target, 'Enter');
      clear.after = await waitFor(async () => ((await historyOf(main, clearId)) === 0 ? 0 : null), 5_000, 100);
      if (clear.after === 0) {
        const r = await scrollbackRead(A.phone, A.door, clearId, { from: held.depth - 150, count: 100, depth: held.depth, wrap: held.cols, keep: 'bottom' });
        clear.staged = true;
        clear.why = r.answer?.why ?? `status ${String(r.status)}`;
      } else clear.after = await historyOf(main, clearId);
    }
    if (!clear.staged && held !== null) return cannotRead('SB4', `clear in the scratch shell left a history of ${String(clear.after)} lines (its terminfo sent no E3), so the clear could not be read`, { trim, clear });
    arm('SB4', { trim, clear });
  });

  // ---- SB5: the loopback machine stops answering, then comes back --------------------------------------
  await armSafely('SB5', async () => {
    const pic = await depthOf(A, sb.far);
    if (pic === null) return cannotRead('SB5', 'the far shell never drew a picture with a depth');
    const ask = { from: Math.max(0, pic.depth - 100), count: Math.min(100, pic.depth), depth: pic.depth, wrap: pic.cols, keep: 'bottom' };
    const paused = await withMachinePaused(async () => {
      await sleep(300);
      const r = await scrollbackRead(A.phone, A.door, sb.far, ask);
      // A served page's `why` is null, which `??` would have read as no answer (the fix round).
      return { why: r.answer === null ? `status ${String(r.status)}` : r.answer.why, statusThen: await statusOf(main, sb.far) };
    });
    await waitFor(async () => (LIVE.includes(await statusOf(main, sb.far)) ? true : null), 120_000, 1_000);
    await sleep(2_000);
    const again = await depthOf(A, sb.far, 30_000);
    const askAgain = again === null ? ask : { from: Math.max(0, again.depth - 100), count: Math.min(100, again.depth), depth: again.depth, wrap: again.cols, keep: 'bottom' };
    const r = await scrollbackRead(A.phone, A.door, sb.far, askAgain);
    const back = { why: r.answer === null ? `status ${String(r.status)}` : r.answer.why, rows: r.answer?.rows?.length ?? 0, problems: r.answer === null ? 1 : scrollbackAnswerProblems(r.answer, askAgain).length };
    say(`SB5: paused ${J(paused)}; back ${J(back)}`);
    arm('SB5', { paused: { staged: paused.staged, why: paused.value?.why ?? null, statusThen: paused.value?.statusThen ?? null }, back });
  });

  // ---- SB3: the attack, main's own stamps around it --------------------------------------------------------
  let mainCdp = null;
  try {
    await armSafely('SB3', async () => {
      mainCdp = await cdpForMain(handle, 30_000);
      const took = (await mainEval(mainCdp, SB_MAIN_PATCH)) === true;
      if (!took) return cannotRead('SB3', "main's inspector took no recorder (no pipe to stamp)");
      const out = {};
      const shellPic = await depthOf(A, sb.shell);
      if (shellPic === null) return cannotRead('SB3', 'the 3,000-line shell never drew a picture with a depth');
      // (a) every refused query, 404, and no statement written while they were asked.
      {
        const t0 = Date.now();
        const logBefore = (appLogText() ?? '').length;
        const refused = [];
        for (const { what, target } of refusedTargets(sb.shell, { from: 100, count: 10, depth: shellPic.depth, wrap: shellPic.cols, keep: 'bottom' })) {
          refused.push({ what, status: (await signedGet(A.phone, A.door, target)).status });
        }
        await sleep(300);
        const seen = JSON.parse((await mainEval(mainCdp, SB_MAIN_READ(t0))) ?? 'null');
        out.refused = refused;
        out.statementsDuringRefused = seen === null ? -1 : seen.starts.length;
        out.appLogDuringRefused = (appLogText() ?? '').slice(logBefore).split('\n').filter((l) => l.trim() !== '').length;
      }
      // (b) moved: another wrap, a depth past the history, a from past it, and the alternate screen.
      {
        const one = async (id, ask) => (await scrollbackRead(A.phone, A.door, id, ask)).answer?.why ?? null;
        const base = { from: 100, count: 100, depth: shellPic.depth, wrap: shellPic.cols, keep: 'bottom' };
        out.moved = {
          wrap: await one(sb.shell, { ...base, wrap: shellPic.cols === 512 ? 511 : shellPic.cols + 1 }),
          deep: await one(sb.shell, { ...base, depth: shellPic.depth + 50 }),
          past: await one(sb.shell, { from: shellPic.depth + 10, count: 10, depth: shellPic.depth + 30, wrap: shellPic.cols, keep: 'bottom' })
        };
        const claudePic = await depthOf(A, sb.claude);
        await tell(sb.claude, [{ op: 'alt', on: true }]);
        await sleep(600);
        out.moved.alt = claudePic === null ? 'no depth before' : await one(sb.claude, { from: Math.max(0, claudePic.depth - 100), count: Math.min(100, claudePic.depth), depth: claudePic.depth, wrap: claudePic.cols, keep: 'bottom' });
        await tell(sb.claude, [{ op: 'alt', on: false }]);
      }
      // (c) 200 page reads from one phone in 2 s, each on a connection of its own; main's stamps and lag around them.
      {
        await sleep(400);
        const t0 = Date.now();
        const asks = [];
        for (let i = 0; i < SB3_BURST; i += 1) {
          const from = (i * 37) % Math.max(1, shellPic.depth - 100);
          const ask = { from, count: 100, depth: shellPic.depth, wrap: shellPic.cols, keep: 'bottom' };
          asks.push(scrollbackRead(A.phone, A.door, sb.shell, ask).then((r) => ({ r, ask })).catch(() => ({ r: { status: 0, answer: null, ms: 0 }, ask })));
          await sleep(10);
        }
        const settled = await Promise.all(asks);
        const tEnd = Date.now();
        const burst = burstOf(settled);
        const seen = JSON.parse((await mainEval(mainCdp, SB_MAIN_READ(t0))) ?? 'null');
        const target = await targetOf(main, sb.shell);
        const tmuxId = String(tmuxOut('display-message', '-p', '-t', target, '#{session_id}') ?? '').trim();
        const lags = (seen?.lags ?? []).filter((x) => x.at <= tEnd + 500).map((x) => x.lag);
        out.burst = burst;
        out.lag = { samples: lags.length, p99: quantile(lags, 0.99), max: quantile(lags, 1) };
        const st = startsOf(seen?.starts ?? [], tmuxId);
        out.starts = { n: st.n, minGapMs: st.minGapMs };
      }
      // (d) a worst-colour history: each start and the compose before it, by main's own stamps and lag.
      {
        const worst = await shell(main, join(PROJECTS, 'p3371-worst'), 'p3371-worst');
        // The worst rows, then a plain live screen over them: a live screen of
        // per-cell colours is over the 1,024-style cap and carries no depth, so
        // with the worst rows still live no page was ever asked (the fix round).
        await standInIn(main, worst, '--worst 400 --cols 80 --quiet-after 60');
        const pic = await waitFor(async () => {
          const p = await depthOf(A, worst, 2_000);
          return p !== null && p.depth >= 300 ? p : null;
        }, 30_000, 300);
        const t0 = Date.now();
        if (pic !== null) for (let i = 0; i < 4; i += 1) await scrollbackRead(A.phone, A.door, worst, { from: 150 + i * 20, count: 100, depth: pic.depth, wrap: pic.cols, keep: i % 2 === 0 ? 'bottom' : 'top' });
        const seen = JSON.parse((await mainEval(mainCdp, SB_MAIN_READ(t0))) ?? 'null');
        const tmuxId = String(tmuxOut('display-message', '-p', '-t', await targetOf(main, worst), '#{session_id}') ?? '').trim();
        const gaps = dutyGaps(startsOf(seen?.starts ?? [], tmuxId).at, seen?.lags ?? []);
        out.worst = { gaps, unread: pic === null ? 'the worst-colour history never drew a picture with a depth of 300 or more' : gaps.length < 3 ? `${String(gaps.length)} start gap(s) seen, of the 3 the clause reads` : null };
      }
      // (e) a session that ended between its picture and its page.
      {
        const endMe = await shell(main, join(PROJECTS, 'p3371-endme'), 'p3371-endme');
        await startIn(main, endMe, `seq -f 'L%06g' 1 300`);
        const pic = await depthOf(A, endMe);
        tmuxOut('kill-session', '-t', await targetOf(main, endMe));
        await waitFor(async () => (!LIVE.includes(await statusOf(main, endMe)) ? true : null), 30_000, 250);
        const r = pic === null ? null : await scrollbackRead(A.phone, A.door, endMe, { from: Math.max(0, pic.depth - 100), count: Math.min(100, pic.depth), depth: pic.depth, wrap: pic.cols, keep: 'bottom' });
        out.ended = r === null ? 'no depth before' : (r.answer?.why ?? `status ${String(r.status)}`);
      }
      // (f) the door switched off while pages wait their turn: four asked at once on a session paged by nobody
      // before, so the first starts at once and three wait their floors; the switch goes off 60 ms later.
      {
        const fresh = await shell(main, join(PROJECTS, 'p3371-doorstop'), 'p3371-doorstop');
        await startIn(main, fresh, `seq -f 'L%06g' 1 600`);
        const pic = await depthOf(A, fresh);
        if (pic === null) return cannotRead('SB3', 'the door-stop shell never drew a picture with a depth', out);
        const settledAt = [];
        const pages = Array.from({ length: 4 }, (_, i) =>
          scrollbackRead(A.phone, A.door, fresh, { from: 100 + i * 50, count: 100, depth: pic.depth, wrap: pic.cols, keep: 'bottom' }).then(
            (r) => void settledAt.push({ i, at: Date.now(), status: r.status, why: r.answer?.why ?? null }),
            () => void settledAt.push({ i, at: Date.now(), status: 0, why: null })
          )
        );
        await sleep(60);
        const offAt = Date.now();
        const pendingAtOff = 4 - settledAt.length;
        await pocket(main, 'setDoor', { on: false });
        await Promise.race([Promise.all(pages), sleep(10_000)]);
        const after = settledAt.filter((x) => x.at >= offAt);
        out.doorOff = { pending: pendingAtOff, settled: after.length, maxMs: after.length === 0 ? null : Math.max(...after.map((x) => x.at - offAt)), answers: settledAt.map((x) => ({ status: x.status, why: x.why })) };
      }
      say(`SB3: ${J({ refused: out.refused.length, statementsDuringRefused: out.statementsDuringRefused, moved: out.moved, burst: out.burst, lag: out.lag, starts: out.starts, worst: out.worst, ended: out.ended, doorOff: out.doorOff })}`);
      arm('SB3', out);
      // The worst-colour clause read no data: UNREADABLE by its own name, never
      // a FAIL of the product and never a silent PASS (the fix round).
      if (typeof out.worst?.unread === 'string') cannotRead('SB3-worst', out.worst.unread, out.worst);
    });
  } finally {
    if (mainCdp !== null) {
      await mainEval(mainCdp, SB_MAIN_RESTORE).catch(() => undefined);
      try {
        mainCdp.close();
      } catch {
        /* closed */
      }
    }
    SB_STATE.ps?.stop();
  }
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
      // RP (Phase 337.1): the parent is 337 (e3837139). A shell with a history; its screen answer, read the
      // phone's way, and a page of that history, which the parent has no route for. Nothing is typed here: the
      // parent's keys route is real, and a write here would be a line S11 does not owe.
      const rpShell = await shell(main, join(PROJECTS, 'rp-shell'), 'p3371-rp-shell');
      await startIn(main, rpShell, `seq -f 'L%06g' 1 300`);
      await sleep(1_500);
      const screen = await screenRead(P.phone, P.door, rpShell);
      const pageAsk = { from: 0, count: 10, depth: Math.max(10, Number(screen.answer?.screen?.depth ?? 200) || 200), wrap: Number(screen.answer?.screen?.cols ?? 80) || 80, keep: 'bottom' };
      const page = await scrollbackRead(P.phone, P.door, rpShell, pageAsk);
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
      const s0 = screen.answer?.screen ?? null;
      arm('RP', {
        scrollback: page.status,
        routeLogged: countLog('refused a connection at the door: route') > 0,
        screen: screen.status,
        // Null when no screen came back to read, which the grader takes as no reading at all.
        depthField: s0 === null ? null : Object.hasOwn(s0, 'depth'),
        spaceField: s0 === null ? null : Object.hasOwn(s0, 'space'),
        lines: st?.confirmLines ?? []
      });
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
  await launch('p337-head', ROOT, async (main, handle) => {
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
      const doorReading = { lines: door.lines, honesty: WORDS_HEAD.honesty, confirmBlock, parentRanFirst: PARENT !== '', confirmStateBefore: door.before, listening: door.ok && st?.state === 'listening' };
      arm('S0', doorReading);
      // Phase 337.1: the same reading, held to the scrollback route and D35's sentence.
      arm('SB0', doorReading);
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
    // ---- Phase 337.1: the SB arms, last, because SB3 ends by switching the door off ---------------------------
    try {
      await runSb(main, handle, A);
    } catch (err) {
      for (const id of ['SB1', 'SB2', 'SB3', 'SB4', 'SB5']) if (!report.arms.some((x) => x.id === id)) cannotRead(id, `the SB arms stopped: ${String(err?.message ?? err)}`);
    }
    HEAD_DONE.value = true;
  }, { inspect: true });
} catch (err) {
  failures += 1;
  report.error = String(err?.message ?? err);
  say(`the run stopped: ${report.error}`);
} finally {
  psSampler?.stop();
  SB_STATE.ps?.stop();
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
    // SB6 (Phase 337.1): the same scan for the rows a page carried, the sessions' own saved screens counted apart.
    // A scan is read only when SB1 paged (the probe review, 2026-10-06): with SB1 unread no canary row reached the
    // phone, and SB6's own control clause would have counted that as the product's FAIL.
    if (SB_STATE.ran && !report.arms.some((x) => x.id === 'SB1' && x.ok !== null)) cannotRead('SB6', 'SB1 never paged a history, so no canary row reached the phone to look for');
    else if (SB_STATE.ran) {
      const sbHits = [];
      let sbSnapshotHits = 0;
      let sbFiles = 0;
      const sbWalk = (dir) => {
        let names = [];
        try {
          names = readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of names) {
          const p = join(dir, e.name);
          if (e.isDirectory()) sbWalk(p);
          else if (e.isFile()) {
            sbFiles += 1;
            let body;
            try {
              body = readFileSync(p).toString('latin1');
            } catch {
              continue;
            }
            for (const c of sbCanaries) {
              if (!body.includes(c)) continue;
              if (p.startsWith(SNAPSHOTS)) sbSnapshotHits += 1;
              else sbHits.push({ file: p.slice(RUN.length + 1), canary: c });
            }
          }
        }
      };
      sbWalk(PROFILE);
      sbWalk(HOME);
      arm('SB6', { appLogRead: text !== null, filesScanned: sbFiles, canaryPaged: SB_STATE.canaryPaged, hits: sbHits, snapshotHits: sbSnapshotHits, psSamples: SB_STATE.ps?.samples() ?? 0, psHits: SB_STATE.ps?.hits() ?? 0 });
    }
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
