#!/usr/bin/env node
/**
 * probe:p348 — THE PHASE 348 APP RUN, the Mac side (build/p348/SPEC.md §8.1):
 * Remove and paste from the phone, through the door's two new writes,
 * `POST /v1/remove` and `POST /v1/paste`, the offer each reads (`removeConfirm`
 * on `/v1/session`, `paste` on the screen answer), the ONE Allow both wait
 * for (333.12), and the wrap marks Copy joins by (`wraps`, D43 to D46).
 *
 * TWO ELECTRONS, ONE AFTER THE OTHER AND NEVER AT ONCE, both through
 * build/electron-run.mjs's `withElectron` on ONE scratch profile, a scratch
 * HOME (ZDOTDIR the same, HISTFILE=/dev/null, no TERM_SESSION_ID) and the
 * socket build/harness-socket.mjs hands this file (`gmux-p348…`), inside
 * build/with-scratch-machine.mjs's LOOPBACK machine with the quiet shell, its
 * own far HOME and none of the person's keys (`SCRATCH_MACHINE_QUIET_SHELL=1`,
 * `SCRATCH_MACHINE_SCRATCH_HOME=1`, `SCRATCH_MACHINE_NO_OWN_KEYS=1`, which the
 * npm script exports and this file refuses to run without). FIRST the parent,
 * `P348_PARENT_CHECKOUT` (a BUILT d2bb05ee, required: `--preflight` refuses
 * without it), whose door is confirmed over its twelve routes and which pairs
 * the phones, so HEAD starts on a 0.112.0-shaped store whose agreement covers
 * the twelve and `remove` and `paste` WAIT for their Allow (D9, D21, 333.12).
 * Then HEAD.
 *
 * WHAT IS REAL. The door, switched on, confirmed and published through the
 * STAND-IN Tailscale (build/p330/tailscale-standin.mjs behind
 * GMUX_TAILSCALE_BIN, preflighted by sha256, the process table sampled every
 * second: a real Tailscale under the app, or run as a command, FAILS the run).
 * The name check asks build/p332/dns-standin.mjs IN THIS PROCESS on
 * 127.0.0.1. The phones are build/p316/node-phone.mjs (`removeSession`,
 * `pasteText`, read back by `removeAnswerOf` and `pasteAnswerOf`), paired
 * through the stand-in's loopback forwarder with mutual TLS. The loopback
 * machine's tmux is build/p326/far-tmux.sh, copied into this run beside an env
 * file of its own and named as the machine's `remoteTmuxPath`, so EVERY far
 * tmux invocation is written to this run's far log (and the create of R3u has
 * its `@gmux-id` stamp held, which keeps that row `unknown`).
 *
 * THE AGENTS ARE STAND-INS. The scratch login shell resolves `claude` and
 * `codex` to build/p318/stand-in.mjs's wrappers (`writeWrappers`), and this
 * file REFUSES (exit 2) unless both resolve there and nothing else does.
 * Since Phase 348's second fix round (the reverify found Oh My Pi, `omp`,
 * resolved through the app's own extra folders and run for its version on
 * every launch) build/hidden-agents.mjs renames EVERY probed registry row but
 * those two before EVERY launch (`hiddenAgentsBesides`, eleven today), its
 * precheck holds that list to the checkout's own registry, the scratch login
 * shell is asked about every one of their binaries, and the app's own
 * `agents:list` must say nothing resolved but the two stand-ins, under this
 * run (`standInsOnlyVerdict`); anything else is exit 2.
 * Every byte a paste lands as is read off build/p337/key-recorder.mjs's log
 * (raw mode, `normal` or `paste`) or the stand-in's own log, never off the
 * verb's report. NO VENDOR PROCESS RUNS AND NO MODEL TURN IS SPENT. After the
 * run the manifest's argv[0] of every session is read (a COPY beside its WAL,
 * build/scratch-login.mjs), and one outside the run fails RUN.
 *
 * THE ARMS (SPEC §8.1; R3 is read as three, each with its own verdict, so a
 * race this run could not make costs only its own clause)
 *   PARENT at d2bb05ee: `remove` and `paste` answer 404 before their bodies
 *          and to whole requests, nothing reaches the parent's main (no write
 *          line, no byte at a recorder, the row unchanged); and three refused
 *          `/v1/end` requests answered byte for byte as HEAD answers the same
 *          bodies (graded after HEAD)
 *   A0     at HEAD over the parent's agreement: exactly `remove` and `paste`
 *          wait; each answers 404 before its body and nothing reaches main;
 *          no `removeConfirm` and no `paste` flag; Settings then Phone draws
 *          both `New:` lines and their sentences above Allow, and the honesty
 *          sentence names both clauses; ONE Allow serves both; after it each
 *          waits for a body, Remove is offered and the picture takes a paste
 *   R1     End then Remove of two local rows from phone A, a shell and a
 *          Claude Code stand-in: the Mac's own words re-derived from the row;
 *          main reads each discarded with removedAt, in Past Sessions, out of
 *          the list; its saved scrollback and hook file gone; the Mac's OPEN
 *          Past tab shows it; Restore, pressed on that tab's row, brings each
 *          back, the conversation id with it
 *   R2     an ended row on the machine removed as R1, the far log holding no
 *          command naming it and no verb that ends, recreates, renames or
 *          types into a session in the window, the far server's sessions
 *          unchanged
 *   R3     a live local row (`changed`, main's words), a LIVE REMOTE row (the
 *          attack on main's missing remote gate: `changed`, still running
 *          there), a removed row and an id naming nothing (`gone`), the same
 *          bytes again (404) and the same write id fresh-signed (the recorded
 *          answer, acting once), a removed phone and a stopped door (no 200,
 *          nothing removed): each row UNCHANGED in main's own read
 *   R3u    a row whose create on the machine cannot be confirmed yet (its
 *          `@gmux-id` stamp held 8.5 s, inside the stamp's own 10 s bound),
 *          so main reads it `unknown`: `unreachable`, and the row is still
 *          there, not removed, once the create lands
 *   R3b    End from phone A and Remove from phone B on one live session on
 *          the machine: one of them `busy` (UNREADABLE when the two never
 *          overlapped on the Mac; the hostile client carries it)
 *   P1     a paste of `line one LF line two` into each program that asked for
 *          bracketed paste (the Claude Code and Codex stand-ins, a recorder in
 *          paste mode): ESC[200~, the text with LF as CR, ESC[201~, nothing
 *          after
 *   P2     `a LF b` into a recorder in normal mode: 61 0d 62, nothing after
 *   P3     ESC, CR, CR LF, DEL, NUL, U+0085 and half a surrogate: `refused`
 *          `character` in the Mac's words, ZERO bytes
 *   P4     16,384 bytes land exact; 16,385 `refused` `long`, ZERO bytes
 *   P5     a paste against a picture whose question moved since the phone
 *          read it: `refused` `changed`, ZERO bytes at the stand-in
 *   P6     a far session: no `paste` key on its picture; `refused` `machine` in
 *          the Mac's words; no buffer, paste, send-keys or copy-mode verb in
 *          the far log while it was answered, and its canary in no far argv
 *   P7     the same paste bytes again (404) and the same write id fresh-signed
 *          (the recorded answer): nothing more read
 *   P8     STATED, PRINTED, NEVER GRADED: a paste just after a Return to a
 *          reader that turns bracketed paste off as it starts a cooked read;
 *          what it read is printed (the desk's own class)
 *   K      after every arm and after the app is gone: no paste's canary in any
 *          file under the harness folder (the profile, the scratch HOME, the
 *          stand-ins', recorders' and far logs, the machine's yard), in
 *          app.log, or in any argv the sampler saw every 30 ms; one log line
 *          per write that acted; no `tortie-paste-` buffer on either server.
 *          No canary is ever sent to a program that echoes it (a cooked read,
 *          or a stand-in's prompt), so an honest run holds none
 *   W      the marks: a 200-character output at 80 columns, a row rewritten
 *          short and cleared to its end (G1b), the alternate screen, a page of
 *          history, and the same output on the machine, whose tmux release
 *          must name the fallback road (3.4 to 3.7a, re-derived here from
 *          D44's bounds; Homebrew's 3.6a today, UNREADABLE otherwise):
 *          `wraps` equal this run's own reading by D45 (`capture-pane -F` on
 *          3.7b, its own alignment of `-T -N` against `-J` on the machine, the
 *          ink guard), G1b's row NOT marked, none on the alternate screen
 *   RUN    the preflights, the hidden agents at every launch, the stand-ins
 *          resolved, every manifest argv[0] the run's, no real Tailscale,
 *          nothing forbidden at the stand-in, every stand-in and Electron
 *          ended, nothing of this run left, his shell history unmoved
 *
 * WHAT IT REFUSES TO DO. It never names the person's tmux server or `-L
 * gmux` (it refuses any socket that is not a `gmux-p348` harness socket),
 * binds no real interface and dials nothing but 127.0.0.1, never runs a real
 * `tailscale` and never asks real DNS, reads no keychain and no credential
 * (the app runs `--use-mock-keychain`), and signals only the pids it started,
 * the stand-ins wrote in their records, or the scratch sshd's own, by pid,
 * never by pattern, re-reading a pid's command line first. It takes NO
 * screenshot. It reads his shell history's size and modified time, under the
 * ACCOUNT's home, and nothing else of it. It writes no paste's text into its
 * report: the bytes are compared as hex and the texts carry canaries K scans
 * for.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && P348_PARENT_CHECKOUT=<a BUILT d2bb05ee> npm run -s probe:p348
 *   P348_ARMS=R1,P2,…        the arms to run (default all; A0, PARENT and RUN are always read)
 *   P348_KEEP=1              keep the scratch world and every answer (out/p348) for a re-derivation
 *   node build/p348/probe-p348.mjs --grader-self-test   every grader on build/p348/fixtures/graders.json; starts nothing
 *   node build/p348/probe-p348.mjs --preflight          the parent, out/, the stand-ins and the vendored tmux; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { execFile, spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentBinaries, hiddenAgentsBesides, hiddenAgentsPrecheck, hiddenAgentsScanVerdict, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import {
  endSession,
  freshWriteId,
  makePhone,
  pairThrough,
  pasteAnswerOf,
  pasteText,
  rawExchange,
  readOffer,
  removeAnswerOf,
  removeSession,
  screenPasteOf,
  screenRead,
  screenWrapsOf,
  scrollbackRead,
  scrollbackWrapsOf,
  sendKeys,
  signedGet,
  signedHeadersFor,
  signedPost,
  writeAnswerOf,
  writeBodyOf
} from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin } from '../p332/dns-standin.mjs';
import { STANDIN_PATH, hellos, readLog, readState, sendOps, writeWrappers } from '../p318/stand-in.mjs';
import { readRecorderLog } from '../p337/key-recorder.mjs';
import { manifestSessions, within } from '../scratch-login.mjs';
import { alignedMarks, flagsOf, inkAtEndOf, linesOf } from './wraps-fixtures.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HERE = fileURLToPath(import.meta.url);
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hr = () => process.hrtime.bigint();

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE or read from the checkout
// ---------------------------------------------------------------------------

/** The parent this phase is measured against (build/p348/SPEC.md, its head's parent). */
export const SNAPSHOT = 'd2bb05ee';
export const MACHINE_ID = 'p348far';
export const MACHINE_LABEL = 'p348 loopback';
/** The two routes this phase adds, in the table's order (D26). */
export const NEW_ROUTES = Object.freeze(['remove', 'paste']);
/** The most UTF-8 one paste may carry (D29). */
export const PASTE_MAX_BYTES = 16_384;
/** The phrases a write is logged under (writes.ts `logWrite`). */
export const LOG_PHRASE = Object.freeze({ remove: "the phone's remove:", paste: "the phone's paste:", end: "the phone's end:" });
/** The name the paste verb gives its buffer (D52), which no buffer may still carry after a paste. */
export const PASTE_BUFFER_PREFIX = 'tortie-paste-';
/**
 * The far tmux verbs that would end, recreate, rename or type into a session
 * there; none may appear while a Remove is answered (R2). A routine
 * `set-option`, `refresh-client` or resize is left out on purpose: the app
 * sends those for the machine's other sessions, and a Remove that reached the
 * machine through one would name the session or its id, which `naming` reads.
 */
export const MUTATING_FAR_VERBS = Object.freeze(['kill-session', 'kill-server', 'kill-window', 'kill-pane', 'send-keys', 'send', 'new-session', 'new', 'rename-session', 'respawn-pane', 'respawn-window', 'load-buffer', 'loadb', 'set-buffer', 'setb', 'paste-buffer', 'pasteb', 'delete-buffer', 'deleteb', 'copy-mode']);
/** The verbs a refused paste must never reach the machine as (P6). */
export const BUFFER_FAR_VERBS = Object.freeze(['load-buffer', 'loadb', 'set-buffer', 'setb', 'paste-buffer', 'pasteb', 'delete-buffer', 'deleteb', 'send-keys', 'send', 'copy-mode']);
/** The texts P3 sends, each refused `character` (D51): ESC, CR, CR LF, DEL, NUL, a C1 control, half a surrogate pair. */
export const P3_CASES = Object.freeze([
  { label: 'ESC', text: 'a\u001bb' },
  { label: 'CR', text: 'a\rb' },
  { label: 'CR LF', text: 'a\r\nb' },
  { label: 'DEL', text: 'a\u007fb' },
  { label: 'NUL', text: 'a\u0000b' },
  { label: 'U+0085', text: 'a\u0085b' },
  { label: 'half a surrogate', text: 'a\ud800b' }
]);

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

/**
 * THE PROBE REVIEW (rule 9): the variables the registry's rows name in their `extraProbeDirs` (`$NVM_BIN`…), read
 * from its source as text, `NVM_BIN` always among them. The run hands the app and the login shell none of them.
 */
export function rowDirVarsOf(src) {
  const names = new Set(['NVM_BIN']);
  for (const m of String(src ?? '').matchAll(/extraProbeDirs:\s*\[([^\]]*)\]/g)) for (const v of m[1].matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g)) names.add(v[1]);
  return Object.freeze([...names]);
}

/** A string literal reached by a path of names inside an object literal, or null when an anchor is missing. */
export function literalAt(src, anchors, key) {
  let rest = String(src ?? '');
  for (const a of anchors) {
    const at = new RegExp(`\\b${a}\\b\\s*[:=]`).exec(rest);
    if (at === null) return null;
    rest = rest.slice(at.index + at[0].length);
  }
  const m = new RegExp(`\\b${key}\\s*:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`).exec(rest);
  return m === null ? null : (m[1] ?? m[2]).replace(/\\(.)/g, '$1');
}

/** The words the Mac says, read from the checkout's own source (never typed here twice). */
export function wordsOf(checkout) {
  const src = (rel) => {
    try {
      return readFileSync(join(checkout, rel), 'utf8');
    } catch {
      return '';
    }
  };
  const pocket = src('src/shared/ipc/pocket.ts');
  const lifecycle = src('src/shared/lifecycle-words.ts');
  const gate = src('src/main/sessions/lifecycle-gate.ts');
  const copy = src('src/shared/screen-copy.ts');
  const confirm = /export function removeSessionConfirm[\s\S]*?\n}/.exec(lifecycle)?.[0] ?? '';
  return {
    removeTitle: literalAt(pocket, ['POCKET_NEW_ROUTE_WORDS', 'remove'], 'title'),
    removeSentence: literalAt(pocket, ['POCKET_NEW_ROUTE_WORDS', 'remove'], 'sentence'),
    pasteTitle: literalAt(pocket, ['POCKET_NEW_ROUTE_WORDS', 'paste'], 'title'),
    pasteSentence: literalAt(pocket, ['POCKET_NEW_ROUTE_WORDS', 'paste'], 'sentence'),
    removeClause: literalAt(pocket, ['POCKET_HONESTY_ADDED'], 'remove'),
    pasteClause: literalAt(pocket, ['POCKET_HONESTY_ADDED'], 'paste'),
    doorHonesty: constWord(pocket, 'POCKET_DOOR_HONESTY'),
    busy: literalAt(pocket, ['POCKET_WRITE_SENTENCES'], 'busy'),
    unreadable: literalAt(pocket, ['POCKET_WRITE_SENTENCES'], 'unreadable'),
    LIFECYCLE_SESSION_CHANGED: constWord(lifecycle, 'LIFECYCLE_SESSION_CHANGED'),
    END_UNREACHABLE_TITLE: constWord(lifecycle, 'END_UNREACHABLE_TITLE'),
    SESSION_NOT_FOUND: constWord(lifecycle, 'SESSION_NOT_FOUND'),
    REMOVE_REFUSED_LIVE: constWord(gate, 'REMOVE_REFUSED_LIVE'),
    removeBody: /body:\s*'((?:[^'\\]|\\.)*)'/.exec(confirm)?.[1] ?? null,
    removeLabel: /confirmLabel:\s*'((?:[^'\\]|\\.)*)'/.exec(confirm)?.[1] ?? null,
    removeTitleShape: /title:\s*`([^`]*)`/.exec(confirm)?.[1] ?? null,
    PASTE_TOO_LONG: constWord(copy, 'PASTE_TOO_LONG'),
    PASTE_CHARACTER: constWord(copy, 'PASTE_CHARACTER'),
    PASTE_THIS_MAC_ONLY: constWord(copy, 'PASTE_THIS_MAC_ONLY'),
    SCREEN_QUESTION_MOVED: constWord(copy, 'SCREEN_QUESTION_MOVED')
  };
}

/** The Mac's Remove confirmation over a row, composed HERE from the words in the tree (D5): `Remove '<name>'?`. */
export function removeConfirmOf(words, name) {
  if (typeof words?.removeTitleShape !== 'string' || !words.removeTitleShape.includes('${session.name}')) return null;
  return { title: words.removeTitleShape.replace('${session.name}', String(name)), body: words.removeBody, confirmLabel: words.removeLabel };
}

/** The status code at the head of a raw HTTP answer, or 0 when nothing came. */
export function statusOfBytes(bytes) {
  const m = /^HTTP\/1\.1 (\d{3})/.exec(Buffer.from(bytes ?? Buffer.alloc(0)).toString('latin1'));
  return m === null ? 0 : Number(m[1]);
}

/**
 * A head-only exchange, read (probe:p346's rule): the status at the head of
 * what came back; `0` ONLY when the handshake held and nothing came back
 * before the idle timeout, which is a door waiting for the body; `-1` for
 * anything else that carried no status.
 */
export function headOnlyReading(got) {
  const status = statusOfBytes(got?.bytes);
  if (status !== 0) return status;
  return got?.handshook === true && got?.error === 'timed out' && Buffer.from(got?.bytes ?? Buffer.alloc(0)).length === 0 ? 0 : -1;
}

/**
 * THE ROAD A VERSION'S MARKS TAKE, re-derived here from the spec's two bounds
 * (D44: `capture-pane -F` since 3.7b, the `-T` fallback since 3.4), never
 * imported: `flags`, `fallback` or `none`, and `none` for a spelling that is
 * not `<major>.<minor><letter?>`.
 */
export function roadOfVersion(version) {
  const m = /^(\d{1,3})\.(\d{1,3})([a-z]?)$/.exec(String(version ?? ''));
  if (m === null) return 'none';
  const v = [Number(m[1]), Number(m[2]), m[3] === '' ? 0 : m[3].charCodeAt(0) - 96];
  const atLeast = (b) => v[0] !== b[0] ? v[0] > b[0] : v[1] !== b[1] ? v[1] > b[1] : v[2] >= b[2];
  if (atLeast([3, 7, 2])) return 'flags';
  if (atLeast([3, 4, 0])) return 'fallback';
  return 'none';
}

/** A terminal's focus reports (ESC [ I, ESC [ O), which tmux sends a program that asked for them and which no paste types. */
export const FOCUS_REPORTS = Object.freeze(['1b5b49', '1b5b4f']);

/** A text's UTF-8 as lowercase hex. */
export const hexOf = (text) => Buffer.from(String(text), 'utf8').toString('hex');

/**
 * THIS FILE'S OWN COMPOSITION OF WHAT `paste-buffer -p` MUST SEND (§2.2, D19):
 * a line feed as a carriage return, every other byte as it is (the text rule
 * refuses every byte the two versions send differently, D58), between
 * `ESC[200~` and `ESC[201~` exactly when the program asked for bracketed paste,
 * and nothing after. As hex.
 */
export function landsAs(text, bracketed) {
  const body = Buffer.from(String(text).replace(/\n/g, '\r'), 'utf8').toString('hex');
  return bracketed ? `${hexOf('\u001b[200~')}${body}${hexOf('\u001b[201~')}` : body;
}

/**
 * D45, THIS FILE'S OWN READING: the rows `r` (0 to rows - 2) tmux flagged
 * wrapped whose last column holds ink by this file's width reading, none on
 * the alternate screen. `null` when a flagged row's width cannot be read here.
 */
export function marksByD45({ flagged, rowsText, cols, alternate }) {
  if (alternate) return [];
  const out = [];
  for (let r = 0; r < rowsText.length - 1; r += 1) {
    if (flagged[r] !== true) continue;
    const ink = inkAtEndOf(rowsText[r], cols);
    if (ink === null) return null;
    if (ink) out.push(r);
  }
  return out;
}

/**
 * The far log (build/p326/far-tmux.sh), read: one entry per invocation,
 * `{ at, pid, words, verb }`, or a note `{ at, pid, note }`. The verb is the
 * first word after tmux's leading global options.
 */
export function farLogEntries(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const m = /^(\d+) (\d+) (.*)$/.exec(line);
    if (m === null) continue;
    const at = Number(m[1]);
    const pid = Number(m[2]);
    if (m[3].startsWith('# ')) {
      out.push({ at, pid, note: m[3].slice(2) });
      continue;
    }
    const words = [...m[3].matchAll(/'((?:[^']|'\\'')*)'|(\S+)/g)].map((w) => (w[1] ?? w[2]).replace(/'\\''/g, "'"));
    let i = 0;
    while (i < words.length) {
      const w = words[i];
      if (['-L', '-S', '-f', '-T', '-c'].includes(w)) i += 2;
      else if (w === '--') {
        i += 1;
        break;
      } else if (w.startsWith('-')) i += 1;
      else break;
    }
    out.push({ at, pid, words, verb: words[i] ?? '' });
  }
  return out;
}

/**
 * The far log's invocations inside `[from, to]`: every one, those naming any
 * of `names`, those whose verb is in `verbs`, and how many carry one of
 * `canaries` in any word.
 */
export function farWindow(entries, from, to, names, verbs, canaries = []) {
  const inside = entries.filter((e) => e.words !== undefined && e.at >= from && e.at <= to);
  return {
    all: inside.length,
    naming: inside.filter((e) => names.some((n) => typeof n === 'string' && n !== '' && e.words.some((w) => w.includes(n)))).map((e) => e.words.join(' ')),
    verbs: inside.filter((e) => verbs.includes(e.verb)).map((e) => e.words.join(' ')),
    canary: inside.filter((e) => [...canaries].some((c) => e.words.some((w) => w.includes(c)))).length
  };
}

/** Whether an answer acted, the way main logs it (writes.ts step 7): a 200 that is not busy, malformed or a ledger repeat. */
export function actedOf(a, { repeat = false } = {}) {
  if (a?.status !== 200 || a.ok !== true) return a?.status === 0 ? 'unknown' : 'no';
  if (repeat || a.outcome === 'busy') return 'no';
  if (a.outcome === 'refused' && a.reason === 'malformed') return 'no';
  return 'yes';
}

// ---------------------------------------------------------------------------
// The graders: pure, over a recorded reading, each clause shown to fail
// ---------------------------------------------------------------------------

const deepEqual = (a, b) => J(a) === J(b);
const doneOf = (a) => a?.status === 200 && a.ok === true && a.outcome === 'done';
const refusedOf = (a, reason, sentence) => a?.status === 200 && a.ok === true && a.outcome === 'refused' && a.reason === reason && (sentence === undefined || a.sentence === sentence);
const ended = (s) => s === 'exited' || s === 'restorable';
const unchanged = (c) => c?.before !== undefined && c?.before !== null && deepEqual(c.before, c.after);

export const GRADERS = {
  PARENT: {
    title: 'the parent has neither route, and its End answers as HEAD\'s',
    clauses: [
      ['remove and paste answer 404 before their bodies and to whole requests', (r) => r.removeHead === 404 && r.removeFull === 404 && r.pasteHead === 404 && r.pasteFull === 404],
      ["nothing reached the parent's main", (r) => r.lines === 0 && r.bytes === '' && unchanged(r.row)],
      ['/v1/end answers the same three bodies byte for byte at both builds', (r) => Array.isArray(r.ends) && r.ends.length === 3 && r.ends.every((e) => e.parent.status === 200 && e.head.status === 200 && e.parent.body === e.head.body)]
    ]
  },
  A0: {
    title: 'remove and paste wait for ONE Allow, then are answered',
    clauses: [
      ['an agreement is on record and exactly remove and paste wait', (r) => r.before.confirmState === 'confirmed' && deepEqual(r.before.routesWaiting, NEW_ROUTES) && NEW_ROUTES.every((x) => !r.before.routesAllowed.includes(x))],
      ['remove and paste answer 404 before their bodies, and nothing reaches main', (r) => r.removeHead === 404 && r.removeFull === 404 && r.pasteHead === 404 && r.pasteFull === 404 && r.linesBefore === 0 && r.bytesBefore === '' && unchanged(r.row)],
      ['no removeConfirm and no paste flag while they wait', (r) => r.detailBefore === true && r.pictureBefore === 200 && r.removeConfirmBefore === false && r.pasteFlagBefore === false],
      ['the face says both New: lines and their sentences above Allow', (r) => r.face.length === 2 && r.face[0].id === 'remove' && r.face[0].title === `New: ${r.words.removeTitle}` && r.face[0].sentence === r.words.removeSentence && r.face[1].id === 'paste' && r.face[1].title === `New: ${r.words.pasteTitle}` && r.face[1].sentence === r.words.pasteSentence && typeof r.drawn?.remove === 'string' && r.drawn.remove.includes(r.face[0].title) && r.drawn.remove.includes(r.words.removeSentence) && typeof r.drawn?.paste === 'string' && r.drawn.paste.includes(r.face[1].title) && r.drawn.paste.includes(r.words.pasteSentence)],
      ['the honesty sentence names both new clauses', (r) => Array.isArray(r.honesty) && typeof r.words.doorHonesty === 'string' && r.words.doorHonesty !== '' && r.honesty.some((p) => typeof p === 'string' && p.startsWith(r.words.doorHonesty) && p.includes(r.words.removeClause) && p.includes(r.words.pasteClause))],
      ['one Allow serves both, and nothing waits', (r) => r.allowPresses === 1 && r.after.confirmState === 'confirmed' && r.after.routesWaiting.length === 0 && NEW_ROUTES.every((x) => r.after.routesAllowed.includes(x))],
      ['after Allow each waits for a body, Remove is offered and the picture takes a paste', (r) => r.removeControl === 0 && r.pasteControl === 0 && r.removeConfirmAfter === true && r.pasteFlagAfter === true]
    ]
  },
  R1: {
    title: 'End then Remove of two local rows, and Restore from Past',
    clauses: [
      ['End from phone A ended both rows', (r) => r.rows.length === 2 && r.rows.every((x) => doneOf(x.end) && ended(x.statusAfterEnd))],
      ["/v1/session offers Remove in the Mac's own words, re-derived from each row", (r) => r.rows.every((x) => x.confirm.want !== null && deepEqual(x.confirm.got, x.confirm.want))],
      ['each Remove answered done', (r) => r.rows.every((x) => doneOf(x.answer))],
      ['main reads each discarded with removedAt, in Past Sessions and out of the list', (r) => r.rows.every((x) => x.listedAfter === false && x.removed.listed === true && x.removed.status === 'discarded' && Number.isFinite(x.removed.removedAt))],
      // THE PROBE REVIEW (rule 9): that a file was THERE to delete is asked by UNREADABLE_WHEN, each kind on its own;
      // either one alone used to stand for both, so a scrollback nobody saw before read as deleted.
      ['its saved scrollback and hook file are gone', (r) => r.rows.every((x) => x.files.snapshotAfter === 0 && x.files.hookAfter === false)],
      ["the Mac's open Past tab shows each", (r) => r.pastTab.open === true && r.rows.every((x) => x.pastTab === true)],
      ['Restore from Past brings each back, the conversation id with it', (r) => r.rows.every((x) => x.restore.listedAgain === true) && r.rows.some((x) => typeof x.restore.idBefore === 'string' && x.restore.idBefore !== '' && x.restore.idAfter === x.restore.idBefore)]
    ]
  },
  R2: {
    title: 'an ended row on another machine removed, nothing sent there',
    clauses: [
      ['End from phone A ended the row on the machine', (r) => doneOf(r.end) && ended(r.statusAfterEnd)],
      ["/v1/session offers Remove in the Mac's own words", (r) => r.confirm.want !== null && deepEqual(r.confirm.got, r.confirm.want)],
      ['the Remove answered done', (r) => doneOf(r.answer)],
      ['main reads it discarded with removedAt, in Past Sessions and out of the list', (r) => r.listedAfter === false && r.removed.listed === true && r.removed.status === 'discarded' && Number.isFinite(r.removed.removedAt)],
      // THE PROBE REVIEW (rule 9): the far log holds every tmux INVOCATION on the machine and nothing a control
      // connection carries on its standard input, so this clause says what it reads and no more.
      ['no tmux command was run on the machine for the Remove (the far log, which a control connection\'s commands do not reach)', (r) => r.far.read === true && r.far.naming.length === 0 && r.far.verbs.length === 0 && deepEqual(r.farBefore, r.farAfter)]
    ]
  },
  R3: {
    title: 'every refusal answered as the write path answers it, each row unchanged',
    clauses: [
      ["a live local row is refused changed in main's own words, unchanged", (r) => refusedOf(r.live.answer, 'changed', r.words.REMOVE_REFUSED_LIVE) && unchanged(r.live)],
      ['a LIVE REMOTE row is refused changed and left running on its machine', (r) => refusedOf(r.farLive.answer, 'changed', r.words.LIFECYCLE_SESSION_CHANGED) && unchanged(r.farLive) && r.farLive.farHolds === true],
      ['a removed row and an id naming nothing are gone', (r) => refusedOf(r.discarded.answer, 'gone', r.words.LIFECYCLE_SESSION_CHANGED) && unchanged(r.discarded) && refusedOf(r.nothing.answer, 'gone', r.words.SESSION_NOT_FOUND)],
      ['the same bytes again are 404, and the same write id fresh-signed is the recorded answer, acting once', (r) => doneOf(r.replay.first) && r.replay.again === 404 && r.replay.resent.status === 200 && r.replay.resent.body === r.replay.first.body && r.replay.acts === 1],
      ['a removed phone and a stopped door remove nothing and never answer 200', (r) => r.removedPhone.wasPaired === true && r.removedPhone.status !== 200 && r.removedPhone.control === 200 && unchanged(r.removedPhone) && r.doorStopped.status !== 200 && unchanged(r.doorStopped)]
    ]
  },
  R3u: {
    title: 'a row Tortie cannot see is refused unreachable',
    clauses: [
      ['the Remove of the unknown row is refused unreachable in the Mac\'s words', (r) => refusedOf(r.answer, 'unreachable', r.words.END_UNREACHABLE_TITLE)],
      ['the row was not removed', (r) => r.removedAfter === false && r.listedAfter === true]
    ]
  },
  R3b: {
    title: 'End and Remove on one session from two phones: one busy',
    clauses: [['one of the two answered busy in the door\'s words, and the other acted once', (r) => r.answers.length === 2 && r.answers.filter((a) => a.status === 200 && a.ok === true && a.outcome === 'busy' && a.sentence === r.words.busy).length === 1 && r.answers.filter((a) => a.outcome !== 'busy').every((a) => a.status === 200 && a.ok === true)]]
  },
  P1: {
    title: 'a paste lands bracketed where the program asked, nothing after',
    clauses: [
      ['each paste answered done', (r) => r.targets.length === 3 && r.targets.every((t) => doneOf(t.answer))],
      ['each program read ESC[200~, the text with LF as CR, ESC[201~, and nothing after', (r) => r.targets.every((t) => t.readHex === landsAs(t.text, true))]
    ]
  },
  P2: {
    title: 'a paste lands raw where the program did not ask',
    clauses: [
      ['the paste answered done', (r) => doneOf(r.answer)],
      ['the recorder read 61 0d 62 and nothing after', (r) => r.text === 'a\nb' && r.readHex === landsAs(r.text, false) && r.readHex === '610d62']
    ]
  },
  P3: {
    title: 'a text holding a character Tortie does not paste types nothing',
    clauses: [
      ['each is refused character in the Mac\'s words', (r) => r.cases.length === P3_CASES.length && r.cases.every((c) => refusedOf(c.answer, 'character', r.words.PASTE_CHARACTER))],
      ['the recorder read ZERO bytes', (r) => r.cases.every((c) => c.readHex === '')]
    ]
  },
  P4: {
    title: 'the cap: 16,384 bytes land exact, 16,385 type nothing',
    clauses: [
      ['16,384 bytes answered done and landed exact', (r) => r.atCap.textBytes === PASTE_MAX_BYTES && doneOf(r.atCap.answer) && r.atCap.readHex === landsAs(r.atCap.text, false)],
      ['16,385 bytes refused long in the Mac\'s words, ZERO bytes', (r) => r.overCap.textBytes === PASTE_MAX_BYTES + 1 && refusedOf(r.overCap.answer, 'long', r.words.PASTE_TOO_LONG) && r.overCap.readHex === '']
    ]
  },
  P5: {
    title: 'the question lock: a paste against a moved question types nothing',
    clauses: [
      ['the question moved between the phone\'s read and its write', (r) => r.first.asking === true && (r.moved.turn !== r.first.turn || r.moved.dialog !== r.first.dialog)],
      ['the paste is refused changed in the Mac\'s words', (r) => refusedOf(r.answer, 'changed', r.words.SCREEN_QUESTION_MOVED)],
      ['the stand-in read ZERO bytes', (r) => r.readHex === '']
    ]
  },
  P6: {
    title: 'a paste on another machine is refused, nothing sent there',
    clauses: [
      // D30: the key is ABSENT there, never `false`: it is present (true) only where the Mac takes a paste.
      ['the far picture carries no paste key', (r) => r.picture === 200 && r.pasteFlag === false && r.pasteKey === false],
      ['the paste is refused machine in the Mac\'s words', (r) => refusedOf(r.answer, 'machine', r.words.PASTE_THIS_MAC_ONLY)],
      // THE PROBE REVIEW (rule 9): as R2's, the far log's reach and no more.
      ['nothing of the paste reached the machine as a tmux command (the far log, which a control connection\'s commands do not reach)', (r) => r.far.read === true && r.far.verbs.length === 0 && r.far.canary === 0]
    ]
  },
  P7: {
    title: 'a paste happens once or not at all',
    clauses: [
      ['the first paste answered done', (r) => doneOf(r.first)],
      ['the same bytes again are 404', (r) => r.again === 404],
      ['the same write id fresh-signed is the recorded answer, byte for byte', (r) => r.resent.status === 200 && r.resent.body === r.first.body],
      ['the recorder read nothing more', (r) => r.firstHex === landsAs(r.text, false) && r.moreHex === '']
    ]
  },
  K: {
    title: 'nothing of a paste is kept',
    clauses: [
      ['no canary in any file under the profile, HOME or the harness folder', (r) => r.canaries > 0 && r.filesScanned > 0 && r.fileHits.length === 0],
      ['no canary in app.log, and one log line per write that acted', (r) => r.appLogRead === true && r.appLogHits === 0 && ['paste', 'remove'].every((v) => r.lines[v] >= r.acted[v] && r.lines[v] <= r.acted[v] + r.unknown[v])],
      ['no canary in any argv the sampler saw', (r) => r.argvSamples > 0 && r.argvHits === 0],
      ['no tortie-paste buffer on either server', (r) => r.buffersRead === true && r.buffers.filter((b) => b.startsWith(PASTE_BUFFER_PREFIX)).length === 0]
    ]
  },
  W: {
    title: 'the marks: the screen answer and the page equal this run\'s reading by D45',
    clauses: [
      ['each live picture\'s wraps equal this run\'s reading', (r) => r.local.length >= 3 && r.local.every((c) => c.problem === null && Array.isArray(c.mine) && deepEqual(c.wraps, c.mine))],
      ['the page\'s wraps equal this run\'s reading of the same range', (r) => r.page !== null && r.page.status === 200 && r.page.why === null && (r.page.problem ?? null) === null && Array.isArray(r.page.mine) && deepEqual(r.page.wraps, r.page.mine) && r.page.wraps.length > 0],
      ['G1b\'s rewritten row is flagged and NOT marked', (r) => { const g = r.local.find((c) => c.name === 'g1b'); return g !== undefined && g.flagged[0] === true && !g.wraps.includes(0); }],
      // THE PROBE REVIEW (rule 9): the PICTURE must say it is the alternate screen too. A picture never read reads
      // as no marks (`screenWrapsOf(undefined)`), which passed this clause before the review.
      ['the alternate screen carries no mark', (r) => { const a = r.local.find((c) => c.name === 'alt'); return a !== undefined && a.pictured === true && a.pictureAlternate === true && a.alternate === true && a.flagged.some(Boolean) && a.wraps.length === 0; }],
      ['the far picture, read through the fallback, equals this run\'s reading', (r) => r.far !== null && r.far.road === 'fallback' && roadOfVersion(r.far.version) === 'fallback' && r.far.problem === null && Array.isArray(r.far.mine) && deepEqual(r.far.wraps, r.far.mine) && r.far.wraps.length > 0]
    ]
  },
  RUN: {
    title: 'no real Tailscale, no real DNS, no vendor agent, nothing left',
    clauses: [
      ['the Tailscale preflight passed', (r) => r.tailscalePreflight === true],
      ['the DNS preflight passed at every launch', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every(Boolean)],
      ['the hidden agents held at every launch', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every(Boolean)],
      ['claude and codex resolved to the stand-ins and no hidden one resolved', (r) => r.resolved === true && r.hiddenUnresolved === true],
      ['every session the manifest holds ran a program of this run', (r) => r.manifest?.read === true && Array.isArray(r.manifest.outside) && r.manifest.outside.length === 0],
      ['no real Tailscale in any sample, and nothing forbidden at the stand-in', (r) => r.realTailscale === 0 && r.samples > 0 && r.forbidden === 0],
      ['every stand-in and Electron ended, and nothing of this run is left', (r) => r.standinLeft === 0 && r.agentsLeft === 0 && r.runLeft === 0 && r.electronsLeft === 0],
      ['his shell history did not move across the run', (r) => typeof r.history.before === 'string' && r.history.before !== '' && r.history.before === r.history.after]
    ]
  }
};

/**
 * A reading missing what an arm's clauses need is UNREADABLE, never a pass and
 * never the product's failure (docs/method/HOW-WE-BUILT-THIS.md rule 9). Each
 * entry answers why, or null when the reading can be graded.
 */
export const UNREADABLE_WHEN = {
  // THE PROBE REVIEW (rule 9): a recorder's log that could not be read is `null`, never `''` (it was `''`, so every
  // "zero bytes" clause passed over a log nobody read).
  PARENT: (r) => (!Array.isArray(r.ends) || r.ends.some((e) => e.head === null) ? 'HEAD\'s answers to the three End bodies were not read' : r.bytes === null ? 'the parent\'s recorder log could not be read, so whether anything reached it was not' : null),
  A0: (r) => (r.statusRead === false ? 'the door\'s status was never read at HEAD, so the two routes could not be seen waiting' : r.bytesBefore === null ? 'the recorder\'s log could not be read while the two routes waited' : null),
  R1: (r) =>
    r.rows.length < 2
      ? `only ${String(r.rows.length)} local row(s) were ended and read`
      : !r.rows.some((x) => x.files?.snapshotBefore > 0)
        ? 'no row had saved scrollback before its Remove (the End\'s own capture writes one), so its deletion was not seen'
        : !r.rows.some((x) => x.files?.hookBefore === true)
          ? 'no row had a hook settings file before its Remove (a Claude Code row writes one at create), so its deletion was not seen'
          : r.rows.some((x) => x.restore?.reopened === false && x.restore?.pressed !== true)
            ? 'the Mac\'s Past tab could not be opened again before a Restore press, so that Restore was never pressed (the fix round)'
            : null,
  R2: (r) => (r.statusAfterEnd === null ? 'the row on the machine never read ended after its End' : r.far.read !== true ? 'the far log could not be read' : null),
  R3: (r) => {
    const missing = ['live', 'farLive', 'discarded', 'nothing', 'replay', 'removedPhone', 'doorStopped'].filter((k) => r[k] === undefined || r[k] === null);
    if (missing.length > 0) return `the reading holds no ${missing.join(', ')} (R1 makes the removed row and the replays, the machine the far row)`;
    return r.removedPhone.wasPaired !== true ? 'phone C never paired and was removed, so a removed phone could not be asked' : null;
  },
  R3u: (r) => (r.statusAtSend !== 'unknown' ? `main read the row ${J(r.statusAtSend)} when the Remove was sent, so an unknown row was not tested` : null),
  R3b: (r) => (!r.answers.some((a) => a.outcome === 'busy') && r.answers.every((a) => a.status === 200 && a.ok === true) ? 'the two writes never overlapped on the Mac (each acted on its own), so busy could not be read; the hostile client carries it' : null),
  P1: (r) => (r.targets.length < 3 ? `only ${String(r.targets.length)} of the three programs was read` : r.targets.some((t) => t.readHex === null) ? `${r.targets.filter((t) => t.readHex === null).map((t) => t.name).join(', ')}'s log could not be read` : null),
  // THE PROBE REVIEW (rule 9): P2, P3, P4 and P7 read the recorder's log; P3 and P5 grade ZERO bytes, which a dead or
  // unread log also reads, so each ends with a CONTROL paste that must land, or the zero means nothing.
  P2: (r) => (r.readHex === null ? 'the recorder\'s log could not be read' : null),
  P3: (r) =>
    r.cases.some((c) => c.readHex === null)
      ? 'the recorder\'s log could not be read for every case'
      : r.control === undefined || r.control === null || r.control.landed !== true
        ? `the control paste after the refusals did not land whole at the recorder (${J(r.control?.readHex ?? null)}), so its zero bytes say nothing`
        : null,
  P4: (r) => (r.atCap?.readHex === null || r.overCap?.readHex === null ? 'the recorder\'s log could not be read' : null),
  P5: (r) =>
    r.first?.asking !== true
      ? 'the stand-in never drew a question for the phone to read'
      : r.readHex === null
        ? 'the stand-in\'s log could not be read (no stand-in said hello for the session)'
        : r.control === undefined || r.control === null || r.control.landed !== true
          ? `the control paste after the refusal did not land whole at the stand-in (${J(r.control?.readHex ?? null)}), so its zero bytes say nothing`
          : null,
  // THE PROBE REVIEW (rule 9): a far log nobody could read is no reading, as R2's is, never the product's failure.
  P6: (r) => (r.far?.read !== true ? 'the far log could not be read, so what reached the machine was not' : null),
  P7: (r) => (r.firstHex === null || r.moreHex === null ? 'the recorder\'s log could not be read' : null),
  K: (r) => (r.appLogRead !== true ? 'app.log could not be read' : null),
  W: (r) => {
    if (r.local.length === 0) return 'no picture was drawn to read';
    // THE PROBE REVIEW (rule 9): a picture the phone never read reads as NO marks (`screenWrapsOf(undefined)`), which
    // the alternate screen's clause (and the first clause, there) passed before the review.
    const unpictured = r.local.filter((c) => c.pictured !== true).map((c) => c.name);
    if (unpictured.length > 0) return `the phone never read a still picture of ${unpictured.join(', ')}, so its marks were not read`;
    if (r.far !== null && r.far !== undefined && r.far.pictured !== true) return 'the phone never read a still picture of the far session, so its marks were not read';
    if (r.local.some((c) => c.mine === null) || r.page?.mine === null || r.far?.mine === null) return 'a flagged row held a character this run cannot place, so its own reading is missing';
    if (r.page === null) return `no page could be asked for (${String(r.pageWhy ?? 'no reason recorded')})`;
    if (r.far === null) return 'the machine was not usable, so the far picture could not be drawn';
    if (roadOfVersion(r.far.version) !== 'fallback') return `the machine's tmux reads ${J(r.far.version)}, so its marks do not take the fallback and that road cannot be read there`;
    return null;
  },
  RUN: (r) =>
    r.manifest?.read !== true
      ? `the manifest could not be read after the app was gone (${String(r.manifest?.why ?? 'no reading')})`
      : typeof r.history?.before !== 'string' || typeof r.history?.after !== 'string' || r.history.before.split('|').includes('none') || r.history.after.split('|').includes('none')
        ? `his shell history could not be read (${J(r.history ?? null)})`
        : null
};

/** One arm's verdict, UNREADABLE asked first: `{ state: 'pass' | 'fail' | 'unreadable', failed, why }`. */
export function verdictOf(id, reading) {
  if (reading === null || reading === undefined || typeof reading !== 'object') return { state: 'unreadable', failed: [], why: 'there is no reading' };
  let why = null;
  try {
    why = UNREADABLE_WHEN[id]?.(reading) ?? null;
  } catch (err) {
    why = `the reading could not be asked whether it is whole (${String(err?.message ?? err)})`;
  }
  if (why !== null) return { state: 'unreadable', failed: [], why };
  const g = grade(id, reading);
  return { state: g.ok ? 'pass' : 'fail', failed: g.failed, why: null };
}

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
// --grader-self-test: every grader on build/p348/fixtures/graders.json, and
// the pure readers on texts of their own. Starts nothing.
// ---------------------------------------------------------------------------

/** The recorded fixtures every grader is held to. */
export const GRADER_FIXTURES = join(ROOT, 'build', 'p348', 'fixtures', 'graders.json');

/** A dotted path into a reading: its parent and the last key (a number for an array index). */
function at(obj, path) {
  const keys = String(path).split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) ? Number(k) : k];
  const last = keys[keys.length - 1];
  return { o, k: /^\d+$/.test(last) ? Number(last) : last };
}

/** Apply a broken fixture's ops to a copy of the honest reading: `set`, `push`, `delete`, `swap`. */
export function applyOps(reading, ops) {
  for (const op of ops) {
    if (op.set !== undefined) {
      const { o, k } = at(reading, op.set);
      o[k] = structuredClone(op.value);
    } else if (op.push !== undefined) {
      const { o, k } = at(reading, op.push);
      o[k].push(structuredClone(op.value));
    } else if (op.delete !== undefined) {
      const { o, k } = at(reading, op.delete);
      if (Array.isArray(o)) o.splice(k, 1);
      else delete o[k];
    } else if (op.swap !== undefined) {
      const a = at(reading, op.swap[0]);
      const b = at(reading, op.swap[1]);
      const t = a.o[a.k];
      a.o[a.k] = b.o[b.k];
      b.o[b.k] = t;
    } else throw new Error(`an op this reader does not know: ${J(op)}`);
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
  }
  let clauses = 0;
  if (fixtures !== null) {
    const honest = fixtures.honest ?? {};
    const broken = Array.isArray(fixtures.broken) ? fixtures.broken : [];
    // 1. Every grader's honest reading passes.
    for (const id of Object.keys(GRADERS)) {
      const v = verdictOf(id, structuredClone(honest[id]));
      say(v.state === 'pass', `${id}'s honest reading passes${v.state === 'pass' ? '' : ` (it read ${v.state}: ${J(v.failed)} ${v.why ?? ''})`}`);
    }
    // 2. Every broken reading answers exactly what it names.
    const sole = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
    const unreadableSeen = new Set();
    for (const c of broken) {
      if (GRADERS[c.arm] === undefined) {
        say(false, `the broken reading "${String(c.name)}" names ${J(c.arm)}, which is no arm`);
        continue;
      }
      const unknown = (c.mustFail ?? []).filter((name) => !GRADERS[c.arm].clauses.some(([cl]) => cl === name));
      if (unknown.length > 0) {
        say(false, `${c.arm} "${c.name}" names ${J(unknown)}, which no clause of its grader is`);
        continue;
      }
      let v;
      try {
        v = verdictOf(c.arm, applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
      } catch (err) {
        say(false, `${c.arm} "${c.name}" could not be applied: ${String(err?.message ?? err)}`);
        continue;
      }
      const want = J([...(c.mustFail ?? [])].sort());
      const got = J([...v.failed].sort());
      const right = c.expect === 'fail' ? v.state === 'fail' && want === got : v.state === c.expect;
      say(right, `${c.arm} answers ${String(c.expect).toUpperCase()}${c.expect === 'fail' ? ` on exactly ${want}` : ''} for: ${c.name}${right ? '' : ` (it read ${v.state}: ${got} ${v.why ?? ''})`}`);
      if (right && c.expect === 'fail' && (c.mustFail ?? []).length === 1) sole.get(c.arm).add(c.mustFail[0]);
      if (right && c.expect === 'unreadable') unreadableSeen.add(c.arm);
    }
    // 3. Every clause that can say FAIL is shown red on a broken reading of its own.
    for (const [id, g] of Object.entries(GRADERS)) {
      for (const [name] of g.clauses) {
        clauses += 1;
        say(sole.get(id).has(name), `${id}: "${name}" goes red on a broken reading of its own`);
      }
    }
    // 4. Every UNREADABLE rule is shown on a reading of its own.
    for (const id of Object.keys(UNREADABLE_WHEN)) say(unreadableSeen.has(id), `${id}: a reading missing what its clauses need reads UNREADABLE, never a pass or a failure`);
    // 5. The fixtures' words are the tree's, byte for byte (the mac builder's half of the words).
    const tree = wordsOf(ROOT);
    const missing = Object.entries(tree).filter(([, v]) => typeof v !== 'string' || v === '').map(([k]) => k);
    say(missing.length === 0, `every word the run grades on is in the tree${missing.length === 0 ? '' : ` (missing ${J(missing)}: the mac builder's half)`}`);
    const drift = [];
    for (const [id, reading] of Object.entries(honest)) {
      for (const [k, v] of Object.entries(reading?.words ?? {})) if (tree[k] !== v) drift.push(`${id}.${k}`);
    }
    say(drift.length === 0, `the fixtures' words are the tree's, byte for byte${drift.length === 0 ? '' : ` (differ: ${J(drift)})`}`);
  }
  // THE PROBE REVIEW'S OWN RECORDED READINGS (docs/method/HOW-WE-BUILT-THIS.md rule 9), in fixtures/reviewer/: an
  // honest reading per grader composed from the source (never from graders.json), and broken readings, each the
  // honest one with ONE thing wrong, each answering EXACTLY what it names (the clauses it fails, or UNREADABLE), two
  // of them honest readings in another order that must pass. THE REVIEW's cases are the missing readings (a log
  // nobody read, a control paste that never landed, a picture never read) that read as passes before it.
  {
    let rh = null;
    let rb = null;
    try {
      rh = JSON.parse(readFileSync(join(ROOT, 'build', 'p348', 'fixtures', 'reviewer', 'honest.json'), 'utf8')).readings;
      rb = JSON.parse(readFileSync(join(ROOT, 'build', 'p348', 'fixtures', 'reviewer', 'broken.json'), 'utf8'));
    } catch (err) {
      say(false, `the review's fixtures did not load: ${String(err?.message ?? err)}`);
    }
    if (rh !== null && rb !== null) {
      for (const id of Object.keys(GRADERS)) {
        const v = verdictOf(id, structuredClone(rh[id]));
        say(v.state === 'pass', `the review's honest ${id} passes${v.state === 'pass' ? '' : ` (it read ${v.state}: ${J(v.failed)} ${v.why ?? ''})`}`);
      }
      const failedOn = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
      const unreadOn = new Set();
      for (const c of rb) {
        if (GRADERS[c.arm] === undefined) {
          say(false, `the review's broken reading "${String(c.name)}" names ${J(c.arm)}, which is no arm`);
          continue;
        }
        const unknown = (c.mustFail ?? []).filter((name) => !GRADERS[c.arm].clauses.some(([cl]) => cl === name));
        if (unknown.length > 0) {
          say(false, `the review's ${c.arm} "${c.name}" names ${J(unknown)}, which no clause of its grader is`);
          continue;
        }
        let v;
        try {
          v = verdictOf(c.arm, applyOps(structuredClone(rh[c.arm]), c.ops ?? []));
        } catch (err) {
          say(false, `the review's ${c.arm} "${c.name}" could not be applied: ${String(err?.message ?? err)}`);
          continue;
        }
        const want = J([...(c.mustFail ?? [])].sort());
        const got = J([...v.failed].sort());
        const right = c.expect === 'fail' ? v.state === 'fail' && want === got : v.state === c.expect;
        say(right, `the review's ${c.arm} answers ${String(c.expect).toUpperCase()}${c.expect === 'fail' ? ` on exactly ${want}` : ''} for: ${c.name}${right ? '' : ` (it read ${v.state}: ${got} ${v.why ?? ''})`}`);
        if (right && c.expect === 'fail') for (const m of c.mustFail) failedOn.get(c.arm).add(m);
        if (right && c.expect === 'unreadable') unreadOn.add(c.arm);
      }
      // Every clause that can say FAIL is reached by a broken reading of the review's own, and every UNREADABLE rule.
      const unreached = Object.entries(GRADERS).flatMap(([id, g]) => g.clauses.filter(([name]) => !failedOn.get(id).has(name)).map(([name]) => `${id}: ${name}`));
      say(unreached.length === 0, `the review's broken readings reach every clause of every grader${unreached.length === 0 ? '' : ` (missing ${J(unreached)})`}`);
      const unreadMissing = Object.keys(UNREADABLE_WHEN).filter((id) => !unreadOn.has(id));
      say(unreadMissing.length === 0, `the review's broken readings reach every UNREADABLE rule${unreadMissing.length === 0 ? '' : ` (missing ${J(unreadMissing)})`}`);
    }
  }
  // THE PROBE REVIEW: the row folders' variables the app is never handed, read from the registry as text.
  say(J(rowDirVarsOf("  extraProbeDirs: ['$NVM_BIN', '~/.nvm/versions/node/*/bin'],\n  extraProbeDirs: ['${BUN_INSTALL}/bin'],")) === J(['NVM_BIN', 'BUN_INSTALL']) && J(rowDirVarsOf('')) === J(['NVM_BIN']), 'rowDirVarsOf reads $VAR and ${VAR} in extraProbeDirs and always holds NVM_BIN');
  say(rowDirVarsOf((() => {
    try {
      return readFileSync(join(ROOT, 'src', 'main', 'agents', 'registry.ts'), 'utf8');
    } catch {
      return '';
    }
  })()).includes('NVM_BIN') && /extraProbeDirs:\s*\[[^\]]*\$NVM_BIN/.test((() => {
    try {
      return readFileSync(join(ROOT, 'src', 'main', 'agents', 'registry.ts'), 'utf8');
    } catch {
      return '';
    }
  })()), "the tree's registry still names $NVM_BIN in a row's extraProbeDirs, which the run withholds from the app");
  // The pure readers.
  say(constWord("export const A = 'one';\nexport const B: string =\n  'two, ' +\n  \"three.\";\n", 'B') === 'two, three.', 'constWord reads a concatenation over a line break');
  say(literalAt("export const X = Object.freeze({ paste: { title: 'a b', sentence: 'c d.' } });", ['X', 'paste'], 'sentence') === 'c d.' && literalAt('const Y = {}', ['X'], 'k') === null, 'literalAt reads a nested literal and answers null for a missing anchor');
  say(statusOfBytes(Buffer.from('HTTP/1.1 404 Not Found\r\n\r\n')) === 404 && statusOfBytes(Buffer.alloc(0)) === 0, 'statusOfBytes reads a status line and 0 for nothing');
  say(headOnlyReading({ handshook: true, bytes: Buffer.alloc(0), error: 'timed out' }) === 0 && headOnlyReading({ handshook: false, bytes: Buffer.alloc(0), error: 'socket hang up' }) === -1 && headOnlyReading({ handshook: true, bytes: Buffer.from('HTTP/1.1 404 Not Found\r\n\r\n'), error: null }) === 404, 'headOnlyReading: a door waiting is 0, a dead connection -1, a 404 404');
  say(landsAs('a\nb', false) === '610d62' && landsAs('a\nb', true) === '1b5b3230307e610d621b5b3230317e', 'landsAs: LF as CR, bracketed exactly when asked (§2.2)');
  say(landsAs('é\tx', false) === 'c3a90978', 'landsAs: a tab and UTF-8 as they are');
  {
    const words = { removeTitleShape: "Remove '${session.name}'?", removeBody: 'It moves.', removeLabel: 'Remove' };
    say(deepEqual(removeConfirmOf(words, 'p348-x'), { title: "Remove 'p348-x'?", body: 'It moves.', confirmLabel: 'Remove' }) && removeConfirmOf({}, 'x') === null, "removeConfirmOf composes the Mac's title from its own template");
  }
  {
    const A40 = 'A'.repeat(40);
    say(deepEqual(marksByD45({ flagged: [true, true, false, false], rowsText: [`ok${' '.repeat(38)}`, A40, 'A'.repeat(20), ''], cols: 40, alternate: false }), [1]), 'marksByD45: a flagged row with a space at its end is not marked, one with ink is (G1b)');
    say(deepEqual(marksByD45({ flagged: [true, true, false], rowsText: [A40, A40, 'A'], cols: 40, alternate: true }), []) && deepEqual(marksByD45({ flagged: [true, true], rowsText: [A40, A40], cols: 40, alternate: false }), [0]), 'marksByD45: the alternate screen carries none, and the last row is never marked');
    say(marksByD45({ flagged: [true, false], rowsText: [`${'x'.repeat(39)}‍`, ''], cols: 40, alternate: false }) === null, 'marksByD45: a row this file cannot place is no reading');
  }
  {
    // As build/p326/far-tmux.sh writes them: `<ms> <pid> ${(qq)@}`, the ARGUMENTS alone (never the program's
    // name), each single-quoted, an embedded quote as '\\''; and a note as `<ms> <pid> # <note>`.
    const log = ["1000 7 '-L' 'gmux-p348-1' 'list-sessions' '-F' '#{session_id}'", "1100 8 '-L' 'gmux-p348-1' '-f' '/dev/null' 'kill-session' '-t' '$4'", '1150 8 # held stamp-delay-ms 15000', "1200 9 '-L' 'gmux-p348-1' 'load-buffer' '-b' 'it'\\''s' '-'"].join('\n');
    const e = farLogEntries(log);
    say(e.length === 4 && e[0].verb === 'list-sessions' && e[1].verb === 'kill-session' && e[2].note === 'held stamp-delay-ms 15000' && e[3].verb === 'load-buffer' && e[3].words[4] === "it's", 'farLogEntries reads invocations past their global options, a quoted quote, and notes');
    // A line with the program's name first, which the wrapper never writes, reads its verb as `tmux`: the reader takes
    // the first word past the global options, so the lines above must be the wrapper's own spelling to mean anything.
    say(farLogEntries("1000 7 'tmux' '-L' 'gmux-p348-1' 'kill-session' '-t' '$4'")[0].verb === 'tmux', "farLogEntries reads the first word past the global options as the verb, which is why the wrapper's own spelling is held above");
    const w = farWindow(e, 1050, 1300, ['$4'], BUFFER_FAR_VERBS);
    say(w.all === 2 && w.naming.length === 1 && w.verbs.length === 1 && farWindow(e, 0, 1050, ['$4'], MUTATING_FAR_VERBS).verbs.length === 0, 'farWindow counts the window, what names the row and the verbs asked for');
  }
  say(actedOf({ status: 200, ok: true, outcome: 'refused', reason: 'gone' }) === 'yes' && actedOf({ status: 200, ok: true, outcome: 'refused', reason: 'malformed' }) === 'no' && actedOf({ status: 200, ok: true, outcome: 'busy' }) === 'no' && actedOf({ status: 0 }) === 'unknown' && actedOf({ status: 404 }) === 'no' && actedOf({ status: 200, ok: true, outcome: 'done' }, { repeat: true }) === 'no', 'actedOf counts a verb\'s refusal, and no malformed, busy, 404 or ledger repeat');
  say(P3_CASES.every((c) => typeof c.text === 'string' && c.text.length >= 3) && P3_CASES.some((c) => c.text.includes('\ud800')), 'P3 sends seven texts, half a surrogate among them');
  // The tree's contract: the two routes, the cap.
  {
    const pocket = (() => {
      try {
        return readFileSync(join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts'), 'utf8');
      } catch {
        return '';
      }
    })();
    const ids = [...(/POCKET_ROUTE_IDS = \[([\s\S]*?)\] as const/.exec(pocket)?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    say(ids.length === 14 && ids.slice(-3).join() === 'start,remove,paste', `the tree's POCKET_ROUTE_IDS end start, remove, paste, fourteen in all (${String(ids.length)}: the mac builder's half)`);
    say(/POCKET_PASTE_MAX_TEXT_BYTES\s*=\s*16_384/.test(pocket), "the tree's POCKET_PASTE_MAX_TEXT_BYTES is 16,384 (D29)");
  }
  process.stdout.write(failures === 0 ? `[p348] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown red on a broken reading of its own.\n` : `[p348] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// --preflight: what the run needs, asked before the harness socket is made.
// It starts nothing.
// ---------------------------------------------------------------------------

/** The sources a HEAD reading is made of; out/ older than any of them is refused. */
const SOURCES = [
  'src/main/pocket/writes.ts',
  'src/main/pocket/routes.ts',
  'src/main/pocket/facts.ts',
  'src/main/pocket/ipc.ts',
  'src/main/pocket/door/table.ts',
  'src/main/pocket/door/limits.ts',
  'src/main/pocket/door/wire.ts',
  'src/main/pocket/route-ledger.ts',
  'src/main/sessions/pocket-writes.ts',
  'src/main/screen/paste.ts',
  'src/main/screen/keys.ts',
  'src/main/screen/read.ts',
  'src/main/screen/compose.ts',
  'src/main/screen/scrollback.ts',
  'src/main/machines/remote-screen.ts',
  'src/main/reply/buffer.ts',
  'src/main/reply/text-rules.ts',
  'src/main/capabilities.ts',
  'src/shared/ipc/pocket.ts'
];
const PARENT = (process.env['P348_PARENT_CHECKOUT'] ?? '').trim();

/** What is missing for a run, as sentences; none means the run may start. */
function preflightProblems() {
  const p = [];
  if (PARENT === '') p.push(`P348_PARENT_CHECKOUT is not set. A0 needs the parent (${SNAPSHOT}, built) to run FIRST on the same profile, so HEAD starts over a twelve-route agreement`);
  else if (!existsSync(join(resolve(PARENT), 'out', 'main', 'index.js'))) p.push(`${resolve(PARENT)}/out/main/index.js is missing: build the parent checkout first`);
  const bundle = join(ROOT, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) p.push(`${bundle} is missing: npm run build first`);
  else {
    const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(bundle).mtimeMs);
    if (newer.length > 0) p.push(`out/ is older than ${newer.join(', ')}: build first`);
  }
  for (const f of ['build/p318/stand-in.mjs', 'build/p337/key-recorder.mjs', 'build/p326/far-tmux.sh', 'build/p348/wraps-fixtures.mjs']) if (!existsSync(join(ROOT, f))) p.push(`${f} is missing`);
  if (!existsSync('/bin/zsh')) p.push('/bin/zsh is missing, which the far tmux wrapper runs under');
  return p;
}

if (process.argv.includes('--preflight')) {
  const p = preflightProblems();
  for (const x of p) process.stderr.write(`[p348] REFUSED. ${x}\n`);
  if (p.length === 0) process.stdout.write(`[p348] preflight PASS: the parent ${resolve(PARENT)} is built, out/ is current, the stand-ins and the far wrapper are here\n`);
  process.exit(p.length === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked
// ---------------------------------------------------------------------------

const TAG = '[p348]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
/** His shell history's size and modified time, under the ACCOUNT's home (never $HOME), and nothing else of it. */
const historyStat = () =>
  ['.zsh_history', '.bash_history']
    .map((n) => {
      try {
        const s = statSync(join(userInfo().homedir, n));
        return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
      } catch {
        return 'none';
      }
    })
    .join('|');
const HISTORY_BEFORE = historyStat();
const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p348`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p348')) refuse(`"${SOCKET}" is not a gmux-p348 harness socket.`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
for (const v of ['SCRATCH_MACHINE_QUIET_SHELL', 'SCRATCH_MACHINE_SCRATCH_HOME', 'SCRATCH_MACHINE_NO_OWN_KEYS']) {
  if ((process.env[v] ?? '') !== '1') refuse(`${v} is not 1: the loopback machine would read his own rc files, home or keys. Run it through \`npm run probe:p348\`.`);
}
const CONFIG_ROOT = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
let carriage = null;
try {
  carriage = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8'));
} catch {
  carriage = null;
}
if (CONFIG_ROOT === '' || carriage === null) refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs.');
if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
/** The far machine's REAL tmux, behind the wrapper the app is handed. */
const FAR_TMUX = String(carriage.remoteTmuxPath ?? '');
if (!existsSync(FAR_TMUX)) refuse(`the carriage's tmux ${J(FAR_TMUX)} does not exist.`);
/** The far HOME the yard lends its sessions (build/scratch-machine.mjs `scratchHomeFor`). */
const FAR_HOME = join(CONFIG_ROOT, 'home');
if (!existsSync(FAR_HOME)) refuse(`the machine's scratch home ${FAR_HOME} does not exist, so its far side would be his own home.`);
{
  const p = preflightProblems();
  if (p.length > 0) refuse(p.join('; '));
}
const KEEP = (process.env['P348_KEEP'] ?? '') === '1';
const ARMS = new Set(((process.env['P348_ARMS'] ?? '').trim() || 'R1,R2,R3,R3u,R3b,P1,P2,P3,P4,P5,P6,P7,P8,K,W').split(',').map((x) => x.trim()));
const on = (id) => ARMS.has(id);

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

mkdirSync(join(HARNESS_DIR, 'p348'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p348'));
const HOME = join(RUN, 'home');
const PROFILE = join(RUN, 'profile');
const PROJECTS = join(RUN, 'projects');
const FAR = join(RUN, 'far');
const BIN = join(HOME, '.local', 'bin');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-ins for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const RECORDERS = join(RUN, 'recorders');
const DRAWN = join(RUN, 'drawn');
const WRAP_DIR = join(RUN, 'farwrap');
const FAR_LOG = join(RUN, 'far.log');
const FAR_RULES = join(RUN, 'far.rules');
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const MANIFEST = join(PROFILE, 'gmux', 'manifest.db');
const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
const SNAPSHOTS = join(PROFILE, 'gmux', 'snapshots');
const HOOKS = join(PROFILE, 'gmux', 'hooks', 'claude');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const FAR_ENV = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
const OUT = join(ROOT, 'out', 'p348');
const RECORDER = join(ROOT, 'build', 'p337', 'key-recorder.mjs');
const DRAWER = join(ROOT, 'build', 'p348', 'wraps-fixtures.mjs');
/** The scratch login PATH: the stand-ins and the system folders, nothing of his. */
const LOGIN_PATH = `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** ONE `node`, a link to this node, for the Electron shim's `#!/usr/bin/env node` and nothing else (probe:p346's rule). */
const NODE_BIN = join(RUN, 'nodebin');
/** THE APP'S OWN PATH (probe:p346's fix round): the stand-ins, that one `node`, and the system folders. */
const APP_PATH = `${BIN}:${NODE_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
const HIDDEN_PREFIX = 'p348';
/** The run's stand-ins, and every other probed row of the registry, hidden (Phase 348's second fix round). */
const STAND_IN_IDS = Object.freeze(['claude', 'codex']);
const HIDDEN_IDS = hiddenAgentsBesides(STAND_IN_IDS);
const HIDDEN_BINS = hiddenAgentBinaries(HIDDEN_IDS);
const WORDS_HEAD = wordsOf(ROOT);

const report = { checkout: ROOT, parent: resolve(PARENT), arms: [], readings: {}, printed: {} };
let failures = 0;
let unreadable = 0;
function arm(id, reading) {
  const v = verdictOf(id, reading);
  if (v.state === 'unreadable') return cannotRead(id, v.why, reading);
  const ok = v.state === 'pass';
  report.arms.push({ id, ok, failed: v.failed, title: GRADERS[id].title });
  report.readings[id] = reading;
  if (!ok) failures += 1;
  say(`${ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${ok ? '' : `; FAILED ${J(v.failed)}`}`);
}
function cannotRead(id, why, reading) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  if (reading !== undefined) report.readings[id] = reading;
  say(`UNREADABLE ${id}: ${why}`);
}
/** Run one arm's body; a body that throws is that arm's UNREADABLE, and the run goes on. */
async function armSafely(id, body) {
  if (!on(id)) {
    report.arms.push({ id, ok: null, said: 'not run: P348_ARMS left it out' });
    return;
  }
  try {
    await body();
  } catch (err) {
    cannotRead(id, `the arm stopped: ${String(err?.message ?? err)}`);
  }
}

// ---------------------------------------------------------------------------
// Processes, read and never matched by pattern
// ---------------------------------------------------------------------------

/** The process table as pid → { ppid, command }, read with `ps -ww -ax` (never a pattern). */
function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const rows = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.set(Number(m[1]), { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * THE ARGV SAMPLER (K): the process table read every 30 ms while the pastes
 * run, every command line asked for every canary. A paste's words reach tmux
 * on `load-buffer`'s standard input (D52), so no argv may hold one.
 */
function startArgvSampler(canaries) {
  let samples = 0;
  let hits = 0;
  let stopped = false;
  let busy = false;
  const timer = setInterval(() => {
    if (stopped || busy) return;
    busy = true;
    execFile('/bin/ps', ['-ww', '-ax', '-o', 'command='], { encoding: 'utf8', timeout: 5_000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      busy = false;
      if (err) return;
      samples += 1;
      for (const c of canaries) if (String(stdout).includes(c)) hits += 1;
    });
  }, 30);
  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      return { samples, hits };
    }
  };
}

// ---------------------------------------------------------------------------
// The app, over its renderer and its bridge
// ---------------------------------------------------------------------------

/**
 * THE VARIABLES THE REGISTRY'S ROWS NAME IN THEIR OWN INSTALL FOLDERS (`$NVM_BIN`…), read from the registry as text
 * (THE PROBE REVIEW, rule 9; probe:p313's and probe:p346's rule): Tortie probes a row's `extraProbeDirs` whatever PATH
 * it is given, and a verifier's own environment carries `NVM_BIN` naming his nvm folder, so the app and the login
 * shell are handed none of them. `NVM_BIN` is held even if the registry stops naming it.
 */
const ROW_DIR_VARS = rowDirVarsOf((() => {
  try {
    return readFileSync(join(ROOT, 'src', 'main', 'agents', 'registry.ts'), 'utf8');
  } catch {
    return '';
  }
})());
const INHERITED = Object.fromEntries([...Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_|CODEX_)/.test(n) || n === 'TERM_SESSION_ID'), ...ROW_DIR_VARS].map((n) => [n, undefined]));

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
        if ((await cdpEval(cdp, "window.gmux !== undefined && window.gmux.pocket !== undefined && typeof window.__p293 === 'object' && typeof window.__gmuxP95 === 'object'")) === true) return cdp;
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
  const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName, status: s.status, agent: s.agent, agentSessionId: s.agentSessionId ?? null, projectPath: s.projectPath, machine: s.machine ? { id: s.machine.id } : null })))');
  return got.ok ? got.value : [];
}
/** Main's Past Sessions, its own read of the manifest's tombstones. */
async function removedRows(cdp) {
  const got = await bridge(cdp, 'window.gmux.sessions.listRemoved().then((l) => l.map((s) => ({ id: s.id, status: s.status, removedAt: s.removedAt ?? null })))');
  return got.ok ? got.value : null;
}
/**
 * A status as the arms compare it before and after a refused write: `running`,
 * `idle` and `needs_input` are one class, because a live session moves among
 * them on its own and a refusal is about whether it was ended or removed.
 */
const statusClass = (status) => (status === 'running' || status === 'idle' || status === 'needs_input' ? 'live' : status);
/** One row as main reads it now: listed or not, its status's class, removed or not. */
async function rowState(cdp, id) {
  const list = await sessions(cdp);
  const removed = (await removedRows(cdp)) ?? [];
  const row = list.find((s) => s.id === id) ?? null;
  return { listed: row !== null, status: statusClass(row?.status ?? null), removed: removed.some((s) => s.id === id) };
}

/**
 * Confirm the door as it stands and wait until a code may show. Called only
 * where no route waits (the parent's, and HEAD after its Allow).
 */
async function confirmDoor(cdp) {
  const now = await waitStatus(cdp, (s) => (s.state === 'listening' && s.confirmState === 'confirmed') || (s.confirmable === true && s.state !== 'opening' && s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`))), 40_000);
  if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: now.status?.state, refusal: now.status?.refusal })}` };
  if (!(now.status.state === 'listening' && now.status.confirmState === 'confirmed')) {
    const c = await pocket(cdp, 'confirmDoor', { linesRead: now.status.confirmLines, hashRead: now.status.confirmHash });
    if (!c.ok || c.value.allowed !== true) return { ok: false, why: c.ok ? `confirm allowed=${String(c.value.allowed)}` : c.error };
  }
  const l = await waitStatus(cdp, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 70_000);
  return { ok: l.ok, why: l.ok ? '' : `never pairable: ${J({ state: l.status?.state, pairable: l.status?.pairable })}` };
}

/** The forwarder the stand-in's NEWEST live Funnel child listens on, or 0 (probe:p318's reading). */
const forwarderPort = () => standin?.readFunnel().at(-1)?.forwarderPort ?? 0;

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
  return { ok: first.status === 200, why: first.status === 200 ? '' : `the first read answered ${String(first.status)}`, label, phone, door };
}

const appLogText = () => {
  try {
    return readFileSync(APP_LOG, 'utf8');
  } catch {
    return null;
  }
};
/** The write lines app.log holds for a verb, optionally naming one session. */
const writeLines = (verb, sessionId = null) => (appLogText() ?? '').split('\n').filter((l) => l.includes(LOG_PHRASE[verb]) && (sessionId === null || l.includes(sessionId)));

// ---------------------------------------------------------------------------
// tmux, read by this file's own clients: this Mac's server by the binary it
// runs (so `capture-pane -F` reaches a 3.7b server as 3.7b), the machine's
// by its REAL binary (never the wrapper, so this file's reads are not in the
// far log)
// ---------------------------------------------------------------------------

let localTmuxBin = null;
/**
 * The binary this Mac's scratch server runs, read off its own pid once the
 * server is up (and kept); `tmux` on PATH until then. Reset at each launch,
 * whose server is a new one.
 */
function tmuxBin() {
  if (localTmuxBin !== null) return localTmuxBin;
  const pid = Number(String(spawnSync('tmux', ['-L', SOCKET, 'display-message', '-p', '#{pid}'], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim());
  if (!(pid > 1)) return 'tmux';
  const command = String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim();
  const bin = command.split(/\s+/)[0] ?? '';
  if (bin.startsWith('/') && existsSync(bin)) localTmuxBin = bin;
  return localTmuxBin ?? 'tmux';
}
/** A tmux binary's own release (`tmux -V`), or null. */
const versionOf = (bin) => /^tmux (\S+)/.exec(String(spawnSync(bin, ['-V'], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim())?.[1] ?? null;
const tmuxOut = (...args) => {
  const r = spawnSync(tmuxBin(), ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const farOut = (...args) => {
  const r = spawnSync(FAR_TMUX, ['-L', SOCKET, '-f', '/dev/null', ...args], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
/** The far server's session names, sorted: what R2 holds unchanged across a Remove. */
const farSessionNames = () => linesOf(farOut('list-sessions', '-F', '#{session_name}') ?? '').sort();

/** The far log's entries, read whole. */
const farEntries = () => {
  try {
    return farLogEntries(readFileSync(FAR_LOG, 'utf8'));
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// The sessions, the stand-ins, the recorders and the drawers
// ---------------------------------------------------------------------------

/** Every session id this run made, for the ends. */
const made = new Map();
const tmuxNameOf = new Map();

/** The tmux target of a session, by its exact tmux name. */
async function targetOf(main, id) {
  if (!tmuxNameOf.has(id)) {
    const s = (await sessions(main)).find((x) => x.id === id);
    if (s === undefined) throw new Error(`no session ${id}`);
    tmuxNameOf.set(id, s.tmuxName);
  }
  return `=${tmuxNameOf.get(id)}:`;
}
/** A command started in a fresh shell session by this file's own tmux, once its prompt is drawn (probe:p337's rule). */
async function startIn(main, id, command, { far = false } = {}) {
  const target = await targetOf(main, id);
  const read = far ? farOut : tmuxOut;
  const prompt = await waitFor(() => {
    const text = String(read('capture-pane', '-p', '-t', target) ?? '');
    return (far ? text.trim() !== '' : text.includes('p348')) ? true : null;
  }, 30_000, 250);
  if (prompt === null) throw new Error(`no prompt in ${target}`);
  read('send-keys', '-t', target, '-l', command);
  read('send-keys', '-t', target, 'Enter');
}
/** A shell, made through the session manager's drive, local or on the machine. */
async function shell(main, name, { far = false } = {}) {
  const path = far ? FAR : join(PROJECTS, 'main');
  const got = await bridge(main, `window.__p293.createSession(${J(far ? { path, name, machineId: MACHINE_ID } : { path, name })})`);
  if (!got.ok || typeof got.value !== 'string') throw new Error(`${name} was not created: ${J(got)}`);
  made.set(got.value, { far, name });
  const listed = await waitFor(async () => (await sessions(main)).find((s) => s.id === got.value && ['running', 'idle'].includes(s.status)) ?? null, 30_000, 300);
  if (listed === null) throw new Error(`${name} never read live`);
  return got.value;
}
/** The stand-in a session runs now: the newest hello naming its id. */
function standinOf(sessionId) {
  const mine = hellos(STANDIN_DIR).filter((h) => h.session === sessionId);
  mine.sort((a, b) => Number(a.at) - Number(b.at));
  return mine[mine.length - 1] ?? null;
}
/** An agent session made the way a person makes one, and its stand-in's hello. */
async function agentSession(main, name, agent) {
  const project = join(PROJECTS, 'main');
  const got = await bridge(main, `window.gmux.sessions.create(${J({ name, projectPath: project, cwd: project, agent })}).then((s) => s.id)`);
  if (!got.ok || typeof got.value !== 'string') throw new Error(`${name} was not created: ${J(got)}`);
  made.set(got.value, { far: false, name });
  const hello = await waitFor(() => standinOf(got.value), 60_000, 250);
  if (hello === null) throw new Error(`${name}'s stand-in never said hello, so Tortie launched something else as ${agent}`);
  await waitFor(() => (readState(STANDIN_DIR, hello.pid)?.mode === 'idle' ? true : null), 20_000, 100);
  return got.value;
}
const seqs = new Map();
/** Tell a session's stand-in some ops and wait until it applied them (probe:p337's `tell`). */
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
/**
 * The bytes a session's stand-in read since `from`, as hex, and how many of
 * its reads were a focus report alone (Claude Code asks for them, tmux sends
 * one when the pane's focus moves, and no paste types one), which are left out.
 */
function standinReadFrom(sessionId, from) {
  const s = standinOf(sessionId);
  // THE PROBE REVIEW (rule 9): no stand-in said hello for the session, so nothing of its reads is known: `null`, never
  // `''`, which every "zero bytes" clause would read as a pass.
  if (s === null) return { hex: null, focus: 0 };
  const reads = readLog(STANDIN_DIR, s.pid).filter((l) => l.kind === 'read' && l.t >= BigInt(from)).map((l) => String(l.hex));
  return { hex: reads.filter((h) => !FOCUS_REPORTS.includes(h)).join(''), focus: reads.filter((h) => FOCUS_REPORTS.includes(h)).length };
}
const standinHexFrom = (sessionId, from) => standinReadFrom(sessionId, from).hex;
/** Each recorder's log, by session id. */
const recorderLogs = new Map();
/** A recorder's bytes since `from`, as hex; `null` (THE PROBE REVIEW: never `''`) when its log could not be read. */
const recorderHexFrom = (id, from) => {
  try {
    return readRecorderLog(readFileSync(recorderLogs.get(id) ?? '', 'utf8')).reads.filter((r) => BigInt(r.t) >= BigInt(from)).map((r) => r.hex).join('');
  } catch {
    return null;
  }
};
/** A key recorder in a shell session, and its log (probe:p337's `recorderSession`). */
async function recorderSession(main, name, modes) {
  const id = await shell(main, name);
  const log = join(RECORDERS, `${name}.jsonl`);
  recorderLogs.set(id, log);
  // An hour, not the recorder's default ten minutes: one recorder serves A0 to P7.
  await startIn(main, id, `exec '${process.execPath}' '${RECORDER}' '${log}' ${modes} --label=${name} --life=3600`);
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
/** A drawer in a shell session (build/p348/wraps-fixtures.mjs `--draw`), its window at `cols` by `rows` first. */
async function drawerSession(main, name, bytes, { far = false, cols = 80, rows = 24, alt = false } = {}) {
  const id = await shell(main, name, { far });
  const target = await targetOf(main, id);
  (far ? farOut : tmuxOut)('resize-window', '-t', target, '-x', String(cols), '-y', String(rows));
  const file = join(DRAWN, `${name}.bin`);
  writeFileSync(file, bytes);
  await startIn(main, id, `exec '${process.execPath}' '${DRAWER}' --draw '${file}'${alt ? ' --alt' : ''}`, { far });
  return id;
}
/** A session's pane read by this file's own client: its rows, its joined lines, its flags (3.7b), its size and its screen. */
function paneReading(target, { far = false, range = [] } = {}) {
  const read = far ? farOut : tmuxOut;
  const rowsText = linesOf(read('capture-pane', '-p', '-T', '-N', '-t', target, ...range) ?? '');
  const joined = linesOf(read('capture-pane', '-p', '-J', '-t', target, ...range) ?? '');
  const flagLines = far ? null : read('capture-pane', '-p', '-F', '-T', '-N', '-t', target, ...range);
  const cols = Number(String(read('display-message', '-p', '-t', target, '#{pane_width}') ?? '').trim());
  const alternate = String(read('display-message', '-p', '-t', target, '#{alternate_on}') ?? '').trim() === '1';
  const history = Number(String(read('display-message', '-p', '-t', target, '#{history_size}') ?? '').trim());
  let flagged;
  let road;
  if (flagLines !== null) {
    const f = flagsOf(linesOf(flagLines));
    flagged = f.map((x) => x?.wrapped === true);
    road = 'flags';
  } else {
    flagged = alignedMarks(rowsText, joined).marked;
    road = 'fallback';
  }
  return { rowsText, joined, flagged, cols, alternate, history, road };
}

/** The snapshot files that name a session, and whether its hook settings file is there. */
function filesOf(sessionId) {
  let names = [];
  try {
    names = readdirSync(SNAPSHOTS);
  } catch {
    names = [];
  }
  return { snapshots: names.filter((n) => n.includes(sessionId)).length, hook: existsSync(join(HOOKS, `${sessionId}.json`)) };
}

// ---------------------------------------------------------------------------
// The phone's two writes, recorded
// ---------------------------------------------------------------------------

const nonce = () => randomUUID().replace(/-/g, '');
/** Every write id this run sent, and every canary a paste carried, for K. */
const sentWrites = new Set();
const canaries = new Set();
const canary = () => {
  const c = `p348c${randomBytes(6).toString('hex')}`;
  canaries.add(c);
  return c;
};
/**
 * THE REPORT AS WRITTEN carries no paste's words: every canary and its hex is
 * replaced, and any string past 4,096 characters (the 16,384-byte text and its
 * hex) by its length and digest. The raw bytes stay in the recorders' and the
 * stand-ins' logs, which `P348_KEEP=1` keeps for a re-derivation.
 */
function redactedReport(value) {
  const swaps = [...canaries].flatMap((c) => [[c, '<canary>'], [hexOf(c), '<canary as hex>']]);
  return JSON.stringify(
    value,
    (_k, v) => {
      if (typeof v === 'bigint') return String(v);
      if (typeof v !== 'string') return v;
      let out = v;
      for (const [from, to] of swaps) out = out.split(from).join(to);
      return out.length > 4096 ? `<${String(out.length)} characters, sha256 ${createHash('sha256').update(out).digest('hex').slice(0, 16)}>` : out;
    },
    2
  );
}
/** The writes that acted (main's step 7 logged them), by verb, for K's one line per write. */
const acted = { remove: 0, paste: 0 };
const actedUnknown = { remove: 0, paste: 0 };
const noteActed = (verb, a, repeat = false) => {
  const did = actedOf(a, { repeat });
  if (did === 'yes') acted[verb] += 1;
  else if (did === 'unknown') actedUnknown[verb] += 1;
};
/** The picture one `/v1/screen` read answers now: its screen, or null. */
async function picture(P, id) {
  const r = await screenRead(P.phone, P.door, id);
  return { status: r.status, screen: r.answer?.screen ?? null };
}
/** One Remove from a phone, read the phone's way. */
async function remove(P, id, { write = freshWriteId(), repeat = false, ...options } = {}) {
  sentWrites.add(write);
  const reply = await removeSession(P.phone, P.door, { session: id, write, ...options });
  const read = removeAnswerOf(reply, write);
  const a = read.ok ? read.answer : null;
  const out = { status: reply.status, ok: read.ok, why: read.why, outcome: a?.outcome ?? null, reason: a?.reason ?? null, sentence: a?.sentence ?? null, body: reply.status === 200 ? reply.body : null, write };
  noteActed('remove', out, repeat);
  return out;
}
/** One paste from a phone against a picture, read the phone's way. */
async function paste(P, id, text, pic, { write = freshWriteId(), repeat = false, ...options } = {}) {
  sentWrites.add(write);
  const reply = await pasteText(P.phone, P.door, { session: id, text, turn: pic?.turn ?? `${'0'.repeat(16)}-0`, dialog: pic?.dialog ?? null, write, ...options });
  const read = pasteAnswerOf(reply, write);
  const a = read.ok ? read.answer : null;
  const out = { status: reply.status, ok: read.ok, why: read.why, outcome: a?.outcome ?? null, reason: a?.reason ?? null, sentence: a?.sentence ?? null, body: reply.status === 200 ? reply.body : null, write };
  noteActed('paste', out, repeat);
  return out;
}
/**
 * A write's head alone: the request line, the Host, the signature over the
 * body it names and its Content-Length, and NO body (probe:p346's rule). A
 * door that refuses the route answers 404 before it reads a body; a door that
 * serves it waits for the body, so nothing comes inside the window (0).
 */
async function headOnly(P, verb, fields) {
  const target = `/v1/${verb}`;
  const body = writeBodyOf(fields);
  const headers = signedHeadersFor(P.phone, 'POST', target, body);
  const head = [`POST ${target} HTTP/1.1`, `host: ${P.door.name}:${String(P.door.publicPort)}`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), 'content-type: application/json', `content-length: ${String(body.length)}`, '', ''].join('\r\n');
  const got = await rawExchange({ door: P.door, bytes: Buffer.from(head, 'latin1'), identity: P.phone, timeoutMs: 4_000 });
  return headOnlyReading(got);
}
/** Wait for a recorder's or stand-in's bytes since `from` to stop growing, then answer them. */
async function settledHex(read, from, ms = 1_500, want = null) {
  let last = read(from);
  const started = Date.now();
  for (;;) {
    await sleep(150);
    const now = read(from);
    // A log that could not be read (`null`) is waited on, and answered as `null` at the end: no reading, never bytes.
    if (now !== null && want !== null && now.length >= want.length && now === last) return now;
    if (now !== null && want === null && now === last && Date.now() - started >= 450) return now;
    last = now;
    if (Date.now() - started >= ms) return now;
  }
}

// ---------------------------------------------------------------------------
// The machine, the profile and the launch
// ---------------------------------------------------------------------------

/** The far wrapper (build/p326/far-tmux.sh) and its env file, in this run's own folder. */
function writeFarWrapper() {
  mkdirSync(WRAP_DIR, { recursive: true });
  const wrapper = join(WRAP_DIR, 'far-tmux.sh');
  copyFileSync(join(ROOT, 'build', 'p326', 'far-tmux.sh'), wrapper);
  chmodSync(wrapper, 0o755);
  const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  writeFileSync(join(WRAP_DIR, 'far-tmux.env'), `REAL=${shq(FAR_TMUX)}\nLOG=${shq(FAR_LOG)}\nRULES=${shq(FAR_RULES)}\nFARHOME=${shq(FAR_HOME)}\n`, 'utf8');
  writeFileSync(FAR_LOG, '', 'utf8');
  writeFileSync(FAR_RULES, '', 'utf8');
  return wrapper;
}
const writeFarRules = (lines) => {
  writeFileSync(`${FAR_RULES}.next`, lines.length === 0 ? '' : `${lines.join('\n')}\n`, 'utf8');
  spawnSync('/bin/mv', ['-f', `${FAR_RULES}.next`, FAR_RULES]);
};
function writeMachines(wrapper) {
  mkdirSync(dirname(MACHINES_JSON), { recursive: true, mode: 0o700 });
  writeFileSync(MACHINES_JSON, `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: MACHINE_LABEL, host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: wrapper }] })}\n`, 'utf8');
  const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
  mkdirSync(dirname(known), { recursive: true });
  writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p348/probe-p348.mjs' }), 'utf8');
}

let standin = null;
let dns = null;
let watch = null;
let lastShim = 0;
let lastApp = 0;
const shims = new Set();
const apps = new Set();
let tailscalePreflight = false;
const dnsPreflights = [];
const agentsHeld = [];
let resolvedOk = false;
let hiddenUnresolved = false;

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
      PATH: APP_PATH,
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

/** One launch through the helper, after both preflights and the hidden agents. */
async function launch(label, checkout, body) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
  // build/hidden-agents.mjs before EVERY launch: the checkout's own reader, then the file.
  const hiddenPre = hiddenAgentsPrecheck({ checkout, prefix: HIDDEN_PREFIX, home: HOME, userPath: `${LOGIN_PATH}:${APP_PATH}`, standIns: STAND_IN_IDS });
  (report.readings.hiddenPrechecks ??= []).push({ label, ok: hiddenPre.ok, said: hiddenPre.said, wouldResolve: hiddenPre.wouldResolve });
  if (!hiddenPre.ok) {
    agentsHeld.push(false);
    throw new Error(`the hidden agents' precheck refused the launch: ${hiddenPre.said}`);
  }
  writeHiddenAgents(PROFILE, HIDDEN_PREFIX, HIDDEN_IDS);
  return withElectron(launchOptions(label, checkout), async (handle) => {
    lastShim = handle.pid;
    shims.add(handle.pid);
    const appNow = () => {
      try {
        lastApp = handle.appPid() || lastApp;
        if (lastApp > 0) apps.add(lastApp);
      } catch {
        /* not up yet */
      }
      return lastApp;
    };
    appNow();
    const main = await attachMain();
    appNow();
    try {
      // NO AGENT STARTS but the stand-ins: every hidden row must read not installed, and nothing but the two
      // stand-ins, under this run, may have resolved at all (Phase 348's second fix round).
      const list = JSON.parse(await cdpEval(main, AGENTS_LIST_EXPR, 120_000));
      const held = hiddenAgentsScanVerdict(list, HIDDEN_IDS);
      const only = standInsOnlyVerdict(list, { standIns: STAND_IN_IDS, under: RUN });
      (report.readings.agentScans ??= []).push({ label, held: held.said, only: only.said });
      agentsHeld.push(held.ok && only.ok);
      if (!held.ok) throw new Error(`agents:list says a hidden agent resolved: ${held.said}`);
      if (!only.ok) throw new Error(`agents:list says an agent other than the stand-ins resolved: ${only.said}`);
      localTmuxBin = null;
      await body(main, handle);
    } finally {
      main.close();
      appNow();
    }
  });
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const ZERO_TURN = `${'0'.repeat(16)}-0`;
/** The three refused End bodies PARENT holds the two builds to, byte for byte (fixed ids, so the echo is one). */
const END_IDS = [freshWriteId(), freshWriteId(), freshWriteId()];
const END_BODIES = Object.freeze([
  { label: 'an id that names nothing', body: writeBodyOf({ batch: false, session: 'p348-names-nothing', write: END_IDS[0] }) },
  { label: 'a body with an extra key', body: Buffer.from(`{"batch":false,"extra":1,"session":"p348-names-nothing","write":"${END_IDS[1]}"}`, 'utf8') },
  { label: 'a batch End of an id that names nothing', body: writeBodyOf({ batch: true, session: 'p348-names-nothing-too', write: END_IDS[2] }) }
]);
/** One of those bodies, signed fresh and sent: its status and its answer's bytes. */
async function endBody(P, e) {
  const reply = await signedPost(P.phone, P.door, '/v1/end', null, { body: e.body });
  return { status: reply.status, body: reply.status === 200 ? String(reply.body) : null };
}
/** One End from a phone, read the phone's way. */
async function endWrite(P, id, options = {}) {
  const write = freshWriteId();
  sentWrites.add(write);
  const reply = await endSession(P.phone, P.door, id, { write, ...options });
  const read = writeAnswerOf(reply, write, 'end');
  return { status: reply.status, ok: read.ok, outcome: read.answer?.outcome ?? null, reason: read.answer?.reason ?? null, sentence: read.answer?.sentence ?? null };
}
/** The status main reads a row at once it ended (exited or restorable), or null past `ms`. */
async function waitEnded(main, id, ms = 30_000) {
  const row = await waitFor(async () => (await sessions(main)).find((s) => s.id === id && ended(s.status)) ?? null, ms, 300);
  return row?.status ?? null;
}
/** One `/v1/session` detail as the phone reads it, or null. */
async function sessionDetail(P, id) {
  const r = await signedGet(P.phone, P.door, `/v1/session?id=${encodeURIComponent(id)}`);
  try {
    return r.status === 200 ? JSON.parse(r.body).session : null;
  } catch {
    return null;
  }
}
/** A real Escape over the protocol, which the session manager sheet closes on. */
async function pressEscape(main) {
  for (const type of ['keyDown', 'keyUp']) await main.call('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }).catch(() => undefined);
}
/** The words a reading carries, by name, from the tree (so the fixtures' words can be held to it). */
const wordsFor = (...names) => Object.fromEntries(names.map((n) => [n, WORDS_HEAD[n]]));

/** P8's scratch reader: raw, asking for bracketed paste, until it reads a Return; then it turns the paste mode off and reads cooked. */
const P8_READER = `import { appendFileSync, writeFileSync } from 'node:fs';
const log = process.argv[2];
writeFileSync(log, JSON.stringify({ ready: true }) + '\\n');
process.stdin.setRawMode(true);
process.stdout.write('\\u001b[?2004hp348 p8 reader\\r\\n');
let cooked = false;
process.stdin.on('data', (chunk) => {
  appendFileSync(log, JSON.stringify({ t: process.hrtime.bigint().toString(), hex: chunk.toString('hex'), cooked }) + '\\n');
  if (!cooked && chunk.includes(0x0d)) {
    process.stdout.write('\\u001b[?2004l');
    process.stdin.setRawMode(false);
    cooked = true;
  }
});
for (const s of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(s, () => process.exit(0));
setTimeout(() => process.exit(0), 600000);
`;

let A = null;
let B = null;
let parentReading = null;
const parentEnds = [];
let headEnds = null;
let sampler = null;
let argvRead = { samples: 0, hits: 0 };
let buffersRead = null;
let ends = null;
let machineOk = false;

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, PROFILE, PROJECTS, join(PROJECTS, 'main'), FAR, BIN, NODE_BIN, STANDIN_DIR, RECORDERS, DRAWN]) mkdirSync(dir, { recursive: true });
  symlinkSync(process.execPath, join(NODE_BIN, 'node'));
  writeFileSync(join(PROJECTS, 'main', 'README.md'), '# Phase 348, the probe\'s project\n');
  writeFileSync(join(FAR, 'README.md'), '# Phase 348, the far folder\n');

  // ---- the stand-ins on the scratch PATH ------------------------------------
  const p318 = writeWrappers({ dir: RUN, bin: BIN, standinDir: STANDIN_DIR });
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${LOGIN_PATH}"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${LOGIN_PATH}"\nexport HISTFILE=/dev/null\nPS1='p348 %# '\n`, 'utf8');
  writeFileSync(join(HOME, '.hushlogin'), '');
  writeFileSync(join(RUN, 'p8-reader.mjs'), P8_READER, 'utf8');
  const wrapper = writeFarWrapper();
  writeMachines(wrapper);
  // THE PRECONDITION: `claude` and `codex` are build/p318/stand-in.mjs and no hidden row's binary resolves, asked of the
  // login shell the app will ask, with the environment the app will be given. Anything else is no run (exit 2).
  {
    const shellEnv = { ...process.env, HOME, ZDOTDIR: HOME, HISTFILE: '/dev/null', PATH: APP_PATH };
    for (const name of Object.keys(INHERITED)) delete shellEnv[name];
    const loginShell = (process.env['SHELL'] ?? '').trim() || '/bin/zsh';
    const ask = (bare) => (String(spawnSync(loginShell, ['-lic', `command -v ${bare} || true`], { encoding: 'utf8', timeout: 30_000, env: shellEnv }).stdout ?? '').trim().split('\n').pop() ?? '');
    const resolved = { claude: ask('claude'), codex: ask('codex') };
    const hidden = Object.fromEntries(HIDDEN_BINS.map((b) => [b, ask(b)]));
    const runner = (() => {
      try {
        return readFileSync(p318.runner, 'utf8');
      } catch {
        return '';
      }
    })();
    const standIns = ['claude', 'codex'].every((b) => resolved[b] === join(BIN, b) && readFileSync(join(BIN, b), 'utf8').includes(p318.runner)) && runner.includes(STANDIN_PATH);
    report.readings.resolves = { resolved, hidden, standIns };
    resolvedOk = standIns;
    hiddenUnresolved = Object.values(hidden).every((at) => at === '');
    if (!resolvedOk || !hiddenUnresolved) {
      throw new Error(`the scratch login shell resolves ${J(resolved)} and the hidden ${J(hidden)}: claude and codex are not build/p318/stand-in.mjs, or a hidden agent resolves, so nothing is launched`);
    }
  }
  standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });
  say(`measuring ${ROOT} after the parent ${resolve(PARENT)}; socket ${SOCKET}; the loopback machine on ${String(carriage.host)}:${String(carriage.port)}, its tmux behind ${wrapper}`);

  // ======================================================================
  // PARENT, first, on the same profile: its door confirmed over twelve
  // routes, the phones paired, and its half of the reading
  // ======================================================================
  await launch('p348-parent', resolve(PARENT), async (main) => {
    await pocket(main, 'setDoor', { on: true });
    const door = await confirmDoor(main);
    if (!door.ok) throw new Error(`the parent's door never listened: ${door.why}`);
    A = await pairPhone(main, 'p348 phone A');
    if (!A.ok) throw new Error(`phone A did not pair with the parent: ${A.why}`);
    B = await pairPhone(main, 'p348 phone B');
    if (!B.ok) throw new Error(`phone B did not pair with the parent: ${B.why}`);
    await bridge(main, `window.__p293.addProject(${J(join(PROJECTS, 'main'))})`);
    const rec = await recorderSession(main, 'p348-parent-rec', 'normal');
    const rowBefore = await rowState(main, rec);
    const linesBefore = writeLines('remove').length + writeLines('paste').length;
    const from = hr();
    const removeHead = await headOnly(A, 'remove', { session: rec, write: freshWriteId() });
    const removeFull = (await removeSession(A.phone, A.door, { session: rec })).status;
    const pic = await picture(A, rec);
    const text = `parent ${canary()}`;
    const pasteHead = await headOnly(A, 'paste', { dialog: null, session: rec, text, turn: pic.screen?.turn ?? ZERO_TURN, write: freshWriteId() });
    const pasteFull = (await pasteText(A.phone, A.door, { session: rec, text, turn: pic.screen?.turn ?? ZERO_TURN, dialog: null })).status;
    await sleep(800);
    parentReading = {
      removeHead,
      removeFull,
      pasteHead,
      pasteFull,
      lines: writeLines('remove').length + writeLines('paste').length - linesBefore,
      bytes: recorderHexFrom(rec, from),
      row: { before: rowBefore, after: await rowState(main, rec) }
    };
    for (const e of END_BODIES) parentEnds.push({ label: e.label, parent: await endBody(A, e) });
    say(`parent: remove ${String(removeHead)}/${String(removeFull)}, paste ${String(pasteHead)}/${String(pasteFull)}; End's three bodies answered ${J(parentEnds.map((e) => e.parent.status))}`);
  });

  // ======================================================================
  // HEAD, over the parent's agreement
  // ======================================================================
  await launch('p348-head', ROOT, async (main) => {
    // ---- the projects and the machine -------------------------------------------------
    await bridge(main, `window.__p293.addProject(${J(join(PROJECTS, 'main'))})`);
    const up = await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
    machineOk = up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable);
    if (machineOk) {
      for (let attempt = 1; attempt <= 6; attempt += 1) {
        const opened = await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
        if (opened.ok && opened.value?.result?.ok === true) break;
        await sleep(3_000);
      }
    }
    say(`the loopback machine usable: ${String(machineOk)}`);
    const ids = {};
    ids.rec = await recorderSession(main, 'p348-rec', 'normal');
    ids.r1Shell = await shell(main, 'p348-r1-shell');

    // ---- A0: remove and paste wait for ONE Allow -------------------------------------------
    await pocket(main, 'setDoor', { on: true });
    const listening = await waitStatus(main, (s) => s.state === 'listening' && (s.confirmState === 'confirmed' || s.confirmable === true), 60_000);
    const before = listening.status;
    const blockedOk = A !== null && (await signedGet(A.phone, A.door, '/v1/blocked')).status === 200;
    if (!blockedOk) throw new Error('phone A, paired at the parent, cannot read at HEAD');
    let settings = null;
    try {
      settings = await attachSettings(main);
      const rowBefore = await rowState(main, ids.rec);
      const lines0 = writeLines('remove').length + writeLines('paste').length;
      const from = hr();
      const removeHead = await headOnly(A, 'remove', { session: ids.rec, write: freshWriteId() });
      const removeFull = (await remove(A, ids.rec)).status;
      const pic = await picture(A, ids.rec);
      const pasteHead = await headOnly(A, 'paste', { dialog: null, session: ids.rec, text: 'a0', turn: pic.screen?.turn ?? ZERO_TURN, write: freshWriteId() });
      const pasteFull = (await paste(A, ids.rec, `a0 ${canary()}`, pic.screen)).status;
      await sleep(800);
      const linesBefore = writeLines('remove').length + writeLines('paste').length - lines0;
      const bytesBefore = recorderHexFrom(ids.rec, from);
      const rowAfter = await rowState(main, ids.rec);
      // End is served throughout: the shell R1 removes is ended now, so its answer can be asked for an offer while Remove waits.
      ids.r1ShellEnd = await endWrite(A, ids.r1Shell);
      ids.r1ShellEnded = await waitEnded(main, ids.r1Shell);
      const detailBefore = await sessionDetail(A, ids.r1Shell);
      const sheet = await status(main);
      const face = (sheet?.confirmFace?.added ?? []).map((x) => ({ id: x.id, title: x.title, sentence: x.sentence }));
      const drawnOf = (id) =>
        waitFor(async () => {
          const t = await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-face-new="${id}"]'); return b === null ? null : b.textContent; })()`);
          return typeof t === 'string' && t.length > 0 ? t : null;
        }, 10_000, 200);
      const drawn = { remove: await drawnOf('remove'), paste: await drawnOf('paste') };
      const honesty = await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-confirm] [data-phone-confirm-details]'); return b === null ? null : [...b.querySelectorAll('p.set-config-warning')].map((p) => p.textContent); })()`);
      // ONE Allow, pressed where a person presses it, once it may be pressed (a
      // disabled button takes no click, probe:p33312's rule), and never again.
      let allowPresses = 0;
      const pressed = await waitFor(async () => ((await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-action="confirm-door"]'); if (b === null || b.disabled) return false; b.click(); return true; })()`)) === true ? true : null), 15_000, 250);
      if (pressed === true) allowPresses += 1;
      const allowed = await waitStatus(main, (s) => s.confirmState === 'confirmed' && (s.routesWaiting ?? []).length === 0 && NEW_ROUTES.every((x) => (s.routesAllowed ?? []).includes(x)), 40_000);
      await waitStatus(main, (s) => s.state === 'listening', 40_000);
      const removeControl = await headOnly(A, 'remove', { session: ids.rec, write: freshWriteId() });
      const picNow = await picture(A, ids.rec);
      const pasteControl = await headOnly(A, 'paste', { dialog: null, session: ids.rec, text: 'a0', turn: picNow.screen?.turn ?? ZERO_TURN, write: freshWriteId() });
      const detailAfter = (await waitFor(async () => {
        const d = await sessionDetail(A, ids.r1Shell);
        return d !== null && Object.hasOwn(d, 'removeConfirm') ? d : null;
      }, 15_000, 500)) ?? (await sessionDetail(A, ids.r1Shell));
      const picAfter = (await waitFor(async () => {
        const p = await picture(A, ids.rec);
        return screenPasteOf(p.screen) ? p : null;
      }, 15_000, 500)) ?? (await picture(A, ids.rec));
      arm('A0', {
        words: wordsFor('removeTitle', 'removeSentence', 'pasteTitle', 'pasteSentence', 'removeClause', 'pasteClause', 'doorHonesty'),
        statusRead: before !== null && before !== undefined,
        before: { confirmState: before?.confirmState ?? null, routesWaiting: before?.routesWaiting ?? [], routesAllowed: before?.routesAllowed ?? [] },
        removeHead,
        removeFull,
        pasteHead,
        pasteFull,
        linesBefore,
        bytesBefore,
        row: { before: rowBefore, after: rowAfter },
        detailBefore: detailBefore !== null,
        pictureBefore: pic.status,
        removeConfirmBefore: detailBefore !== null && Object.hasOwn(detailBefore, 'removeConfirm'),
        pasteFlagBefore: pic.screen !== null && Object.hasOwn(pic.screen, 'paste'),
        face,
        drawn,
        honesty,
        allowPresses,
        after: { confirmState: allowed.status?.confirmState ?? null, routesWaiting: allowed.status?.routesWaiting ?? null, routesAllowed: allowed.status?.routesAllowed ?? [] },
        removeControl,
        pasteControl,
        removeConfirmAfter: detailAfter !== null && Object.hasOwn(detailAfter, 'removeConfirm'),
        pasteFlagAfter: screenPasteOf(picAfter.screen)
      });
    } finally {
      settings?.close();
      settings = null;
    }

    // ---- PARENT's HEAD half: the same three End bodies ------------------------------------
    headEnds = [];
    for (const e of END_BODIES) headEnds.push(await endBody(A, e));

    // ---- R1, and the three refusals of R3 that need a removed row --------------------------
    const r3 = { words: wordsFor('REMOVE_REFUSED_LIVE', 'LIFECYCLE_SESSION_CHANGED', 'SESSION_NOT_FOUND') };
    await armSafely('R1', async () => {
      const claudeId = await agentSession(main, 'p348-r1-claude', 'claude');
      const claudeConversation = (await sessions(main)).find((s) => s.id === claudeId)?.agentSessionId ?? null;
      const claudeEnd = await endWrite(A, claudeId);
      const claudeEnded = await waitEnded(main, claudeId);
      const subjects = [
        { kind: 'shell', id: ids.r1Shell, name: 'p348-r1-shell', end: ids.r1ShellEnd, statusAfterEnd: ids.r1ShellEnded, idBefore: null },
        { kind: 'claude', id: claudeId, name: 'p348-r1-claude', end: claudeEnd, statusAfterEnd: claudeEnded, idBefore: claudeConversation }
      ];
      // The Mac's Past tab, opened BEFORE the Removes, so what it shows is its own refetch after the broadcast (D10).
      const opened = await bridge(main, "window.__p293.open('past')");
      const out = { rows: [], pastTab: { open: opened.ok && opened.value?.sheet === true } };
      const replay = { nonce: nonce(), timestamp: String(Date.now()) };
      for (const sub of subjects) {
        const detail = await sessionDetail(A, sub.id);
        const filesBefore = filesOf(sub.id);
        const write = freshWriteId();
        const answer = await remove(A, sub.id, { write, ...(sub.kind === 'claude' ? replay : {}) });
        if (sub.kind === 'claude') {
          // R3's replays of THIS Remove, sent at once and well inside the door's clock window: the same nonce and
          // clock again (the nonce memory's 404), then the same write id signed fresh (the ledger's recorded answer).
          const sameBytes = await removeSession(A.phone, A.door, { session: claudeId, write, ...replay });
          const resent = await remove(A, claudeId, { write, repeat: true });
          r3.replay = { first: answer, again: sameBytes.status, resent: { status: resent.status, body: resent.body }, acts: null };
        }
        await sleep(1_000);
        const list = await sessions(main);
        const removedList = (await removedRows(main)) ?? [];
        const removedRow = removedList.find((x) => x.id === sub.id) ?? null;
        const filesAfter = filesOf(sub.id);
        const pastShows = (await waitFor(async () => {
          const st = await bridge(main, 'window.__p293.state()');
          return st.ok && (st.value?.rows ?? []).some((x) => x.tab === 'past' && x.id === sub.id) ? true : null;
        }, 8_000, 300)) === true;
        out.rows.push({
          kind: sub.kind,
          end: sub.end,
          statusAfterEnd: sub.statusAfterEnd,
          confirm: { got: detail?.removeConfirm ?? null, want: removeConfirmOf(WORDS_HEAD, sub.name) },
          answer,
          listedAfter: list.some((x) => x.id === sub.id),
          removed: { listed: removedRow !== null, status: removedRow?.status ?? null, removedAt: removedRow?.removedAt ?? null },
          files: { snapshotBefore: filesBefore.snapshots, snapshotAfter: filesAfter.snapshots, hookBefore: filesBefore.hook, hookAfter: filesAfter.hook },
          pastTab: pastShows,
          restore: { reopened: false, pressed: false, listedAgain: false, idBefore: sub.idBefore, idAfter: null }
        });
      }
      // R3: a removed row is gone, an id naming nothing is gone, and the claude Remove's replays act on nothing.
      {
        const beforeShell = await rowState(main, ids.r1Shell);
        const again = await remove(A, ids.r1Shell);
        r3.discarded = { answer: again, before: beforeShell, after: await rowState(main, ids.r1Shell) };
        r3.nothing = { answer: await remove(A, 'p348-names-nothing') };
        // The claude Remove acted ONCE across its two replays: one write line names it.
        if (r3.replay !== undefined) r3.replay.acts = writeLines('remove', claudeId).length;
      }
      // Restore, PRESSED on the Mac's open Past tab (its row's own Restore button, a real click on the sheet), which
      // runs the sheet's restore of a removed row, main's sessions:restore behind it.
      // THE FIX ROUND (2026-10-19, verify lenses 1 and 3): the Mac closes the session manager after every Restore from
      // Past (`landPastRestore` calls `closeSessionManager`, src/renderer/session-manager/actions.ts, which this phase
      // does not touch), so the second row's button was often gone and R1 read `pressed: false` over a Restore that
      // works. The Past tab is opened again before EACH press, and the row's own button waited for there.
      for (const [i, sub] of subjects.entries()) {
        const reopened = await bridge(main, "window.__p293.open('past')");
        const pressedRestore = await waitFor(async () => ((await cdpEval(main, `(() => { const id = ${J(sub.id)}; const b = document.querySelector('.sm-past-row[data-manage-row="' + CSS.escape(id) + '"] [data-manage-primary="' + CSS.escape(id) + '"][data-verb="restore"]'); if (b === null || b.disabled) return false; b.click(); return true; })()`)) === true ? true : null), 10_000, 250);
        const back = pressedRestore === null ? null : await waitFor(async () => (await sessions(main)).find((s) => s.id === sub.id && ['running', 'idle', 'needs_input'].includes(s.status)) ?? null, 45_000, 500);
        out.rows[i].restore = { reopened: reopened.ok && reopened.value?.sheet === true, pressed: pressedRestore === true, listedAgain: back !== null, status: back?.status ?? null, idBefore: sub.idBefore, idAfter: back?.agentSessionId ?? null };
      }
      await pressEscape(main);
      arm('R1', out);
    });

    // ---- R2: an ended row on the machine, removed, nothing sent there -----------------------
    await armSafely('R2', async () => {
      if (!machineOk) throw new Error('the loopback machine is not usable');
      const id = await shell(main, 'p348-r2', { far: true });
      const tmuxName = (await sessions(main)).find((s) => s.id === id)?.tmuxName ?? '';
      const end = await endWrite(A, id);
      const statusAfterEnd = await waitEnded(main, id);
      const detail = await sessionDetail(A, id);
      const farBefore = farSessionNames();
      const t1 = Date.now();
      const answer = await remove(A, id);
      await sleep(2_000);
      const t2 = Date.now();
      const farAfter = farSessionNames();
      const entries = farEntries();
      const w = entries === null ? null : farWindow(entries, t1, t2, [tmuxName, id], MUTATING_FAR_VERBS);
      const removedRow = ((await removedRows(main)) ?? []).find((x) => x.id === id) ?? null;
      arm('R2', {
        end,
        statusAfterEnd,
        confirm: { got: detail?.removeConfirm ?? null, want: removeConfirmOf(WORDS_HEAD, 'p348-r2') },
        answer,
        listedAfter: (await sessions(main)).some((x) => x.id === id),
        removed: { listed: removedRow !== null, status: removedRow?.status ?? null, removedAt: removedRow?.removedAt ?? null },
        far: w === null ? { read: false, all: 0, naming: [], verbs: [], canary: 0 } : { read: true, ...w },
        farBefore,
        farAfter
      });
    });

    // ---- R3: the refusals, each row unchanged --------------------------------------------
    await armSafely('R3', async () => {
      ids.r3Live = await shell(main, 'p348-r3-live');
      {
        const before = await rowState(main, ids.r3Live);
        const answer = await remove(A, ids.r3Live);
        r3.live = { answer, before, after: await rowState(main, ids.r3Live) };
      }
      if (!machineOk) throw new Error('the loopback machine is not usable');
      {
        const id = await shell(main, 'p348-r3-farlive', { far: true });
        const tmuxName = (await sessions(main)).find((s) => s.id === id)?.tmuxName ?? '';
        const before = await rowState(main, id);
        const answer = await remove(A, id);
        await sleep(1_000);
        r3.farLive = { answer, before, after: await rowState(main, id), farHolds: farSessionNames().includes(tmuxName) };
      }
      {
        const C = await pairPhone(main, 'p348 phone C');
        const st = await status(main);
        const row = (st?.phones ?? []).find((p) => p.label === 'p348 phone C');
        if (C.ok && row !== undefined) await pocket(main, 'removePhone', row.id);
        await sleep(1_500);
        const again = await confirmDoor(main);
        if (!again.ok) throw new Error(`the door did not listen again after a Remove of phone C: ${again.why}`);
        const before = await rowState(main, ids.r3Live);
        const reply = C.ok ? await removeSession(C.phone, C.door, { session: ids.r3Live, timeoutMs: 6_000 }) : { status: -1 };
        // The control: phone A still reads, once the door has settled after the Remove (its agreement moved with it).
        const control = (await waitFor(async () => ((await signedGet(A.phone, A.door, '/v1/blocked')).status === 200 ? 200 : null), 20_000, 500)) ?? (await signedGet(A.phone, A.door, '/v1/blocked')).status;
        r3.removedPhone = { status: reply.status, control, wasPaired: C.ok && row !== undefined, before, after: await rowState(main, ids.r3Live) };
      }
      {
        await pocket(main, 'setDoor', { on: false });
        await waitStatus(main, (s) => s.state !== 'listening', 20_000);
        const before = await rowState(main, ids.r3Live);
        const reply = await removeSession(B.phone, B.door, { session: ids.r3Live, timeoutMs: 4_000 });
        await pocket(main, 'setDoor', { on: true });
        const again = await confirmDoor(main);
        if (!again.ok) throw new Error(`the door did not listen again after it was switched off: ${again.why}`);
        r3.doorStopped = { status: reply.status, before, after: await rowState(main, ids.r3Live) };
      }
      arm('R3', r3);
    });

    // ---- R3u: a row Tortie cannot see ----------------------------------------------------
    await armSafely('R3u', async () => {
      if (!machineOk) throw new Error('the loopback machine is not usable');
      const name = 'p348-r3-unknown';
      // The create's `@gmux-id` stamp held 8.5 s (probe:p326's arm C): longer than the row takes to read `unknown`,
      // shorter than the stamp's own 10 s bound, so the create still lands and the row is bound once it does.
      writeFarRules(['stamp-delay-ms 8500']);
      const creating = bridge(main, `window.__p293.createSession(${J({ path: FAR, name, machineId: MACHINE_ID })})`);
      const row = await waitFor(async () => (await sessions(main)).find((s) => s.name === name && s.machine?.id === MACHINE_ID && s.status === 'unknown') ?? null, 6_000, 100);
      const answer = row === null ? null : await remove(A, row.id);
      const statusAtSend = row === null ? null : 'unknown';
      writeFarRules([]);
      await creating;
      await sleep(3_000);
      const listed = (await sessions(main)).find((s) => s.name === name && s.machine?.id === MACHINE_ID) ?? null;
      if (listed !== null) made.set(listed.id, { far: true, name });
      const after = listed === null ? null : await rowState(main, listed.id);
      arm('R3u', { words: wordsFor('END_UNREACHABLE_TITLE'), statusAtSend, answer, removedAfter: after?.removed ?? null, listedAfter: after?.listed ?? false });
    });

    // ---- R3b: End and Remove on one session from two phones -------------------------------
    await armSafely('R3b', async () => {
      if (!machineOk) throw new Error('the loopback machine is not usable');
      const id = await shell(main, 'p348-r3-busy', { far: true });
      const write = freshWriteId();
      sentWrites.add(write);
      let left = () => undefined;
      const aLeft = new Promise((r) => {
        left = r;
      });
      const aP = endSession(A.phone, A.door, id, { write, onWritten: () => left() });
      await Promise.race([aLeft, sleep(10_000)]);
      await sleep(5);
      const b = await remove(B, id);
      const aReply = await aP;
      const aRead = writeAnswerOf(aReply, write, 'end');
      const a = { status: aReply.status, ok: aRead.ok, outcome: aRead.answer?.outcome ?? null, sentence: aRead.answer?.sentence ?? null };
      arm('R3b', { words: wordsFor('busy'), answers: [a, { status: b.status, ok: b.ok, outcome: b.outcome, sentence: b.sentence }] });
    });

    // ---- the pastes, under the argv sampler ------------------------------------------------
    sampler = startArgvSampler(canaries);
    await armSafely('P1', async () => {
      ids.claude = await agentSession(main, 'p348-claude', 'claude');
      ids.codex = await agentSession(main, 'p348-codex', 'codex');
      ids.recPaste = await recorderSession(main, 'p348-rec-paste', 'paste');
      const targets = [];
      for (const [name, id, kind] of [['claude', ids.claude, 'standin'], ['codex', ids.codex, 'standin'], ['recorder', ids.recPaste, 'recorder']]) {
        const pic = await picture(A, id);
        const text = 'line one\nline two';
        const from = hr();
        const answer = await paste(A, id, text, pic.screen);
        const read = kind === 'standin' ? (f) => standinHexFrom(id, f) : (f) => recorderHexFrom(id, f);
        const readHex = await settledHex(read, from, 2_500, landsAs(text, true));
        targets.push({ name, text, answer, readHex, focusReports: kind === 'standin' ? standinReadFrom(id, from).focus : 0 });
      }
      arm('P1', { targets });
    });
    await armSafely('P2', async () => {
      const pic = await picture(A, ids.rec);
      const text = 'a\nb';
      const from = hr();
      const answer = await paste(A, ids.rec, text, pic.screen);
      arm('P2', { text, answer, readHex: await settledHex((f) => recorderHexFrom(ids.rec, f), from, 1_500, '610d62') });
    });
    await armSafely('P3', async () => {
      const cases = [];
      for (const c of P3_CASES) {
        const pic = await picture(A, ids.rec);
        const text = `${c.text.slice(0, 1)}${canary()}${c.text.slice(1)}`;
        const from = hr();
        const answer = await paste(A, ids.rec, text, pic.screen);
        await sleep(400);
        cases.push({ label: c.label, answer, readHex: recorderHexFrom(ids.rec, from) });
      }
      // THE CONTROL (the probe review, rule 9): a paste the Mac takes, after the seven, must reach the same recorder
      // whole, or its ZERO bytes above prove nothing (a dead recorder reads zero too). No canary: it lands.
      const ctlText = 'p3 control';
      const ctlPic = await picture(A, ids.rec);
      const ctlFrom = hr();
      const ctlAnswer = await paste(A, ids.rec, ctlText, ctlPic.screen);
      const ctlHex = await settledHex((f) => recorderHexFrom(ids.rec, f), ctlFrom, 2_500, landsAs(ctlText, false));
      arm('P3', { words: wordsFor('PASTE_CHARACTER'), cases, control: { text: ctlText, outcome: ctlAnswer.outcome, readHex: ctlHex, landed: ctlHex === landsAs(ctlText, false) } });
    });
    await armSafely('P4', async () => {
      const filled = (head, bytes) => {
        let text = head;
        while (Buffer.byteLength(text, 'utf8') < bytes) text += 'p348 a line of printable text at the cap\n';
        return text.slice(0, bytes);
      };
      const atCap = filled(`${canary()}\n`, PASTE_MAX_BYTES);
      const overCap = filled(`${canary()}\n`, PASTE_MAX_BYTES + 1);
      let pic = await picture(A, ids.rec);
      let from = hr();
      const atAnswer = await paste(A, ids.rec, atCap, pic.screen);
      const atHex = await settledHex((f) => recorderHexFrom(ids.rec, f), from, 5_000, landsAs(atCap, false));
      pic = await picture(A, ids.rec);
      from = hr();
      const overAnswer = await paste(A, ids.rec, overCap, pic.screen);
      await sleep(600);
      arm('P4', {
        words: wordsFor('PASTE_TOO_LONG'),
        atCap: { text: atCap, textBytes: Buffer.byteLength(atCap, 'utf8'), answer: atAnswer, readHex: atHex },
        overCap: { textBytes: Buffer.byteLength(overCap, 'utf8'), answer: overAnswer, readHex: recorderHexFrom(ids.rec, from) }
      });
    });
    await armSafely('P5', async () => {
      if (ids.claude === undefined) ids.claude = await agentSession(main, 'p348-claude', 'claude');
      await tell(ids.claude, [{ op: 'press', command: 'touch p348-first.txt' }]);
      const asked = await waitFor(async () => {
        const p = await picture(A, ids.claude);
        return p.screen?.asking === true ? p : null;
      }, 15_000, 300);
      const first = { turn: asked?.screen?.turn ?? null, dialog: asked?.screen?.dialog ?? null, asking: asked?.screen?.asking === true };
      await tell(ids.claude, [{ op: 'press', command: 'touch p348-second.txt' }]);
      const movedPic = await waitFor(async () => {
        const p = await picture(A, ids.claude);
        return p.screen !== null && (p.screen.turn !== first.turn || p.screen.dialog !== first.dialog) ? p : null;
      }, 15_000, 300);
      const moved = { turn: movedPic?.screen?.turn ?? first.turn, dialog: movedPic?.screen?.dialog ?? first.dialog };
      const from = hr();
      const answer = await paste(A, ids.claude, `p5 ${canary()}`, { turn: first.turn ?? ZERO_TURN, dialog: first.dialog });
      await sleep(700);
      const readHex = standinHexFrom(ids.claude, from);
      const focusReports = standinReadFrom(ids.claude, from).focus;
      // THE CONTROL (the probe review, rule 9): a paste the lock lets through must reach the stand-in whole, bracketed
      // as it asked, or the ZERO bytes above prove nothing. No canary: it is drawn. THE FIX ROUND (2026-10-19, verify
      // lenses 1 and 3): the control waited for a picture that asked nothing after `idle`, but main's status stays
      // `needs_input` and `asking` reads that status, so it waited out its 10 s on every run and P5 read UNREADABLE.
      // It is now a paste against the CURRENT picture of the question still drawn (its own turn and window mark,
      // read just before), which the question lock admits and must land; only then is the stand-in sent back idle.
      const ctlText = 'p5 control';
      const ctlPic = await waitFor(async () => {
        const p = await picture(A, ids.claude);
        return p.screen !== null && p.screen.asking === true && p.screen.turn === moved.turn && p.screen.dialog === moved.dialog ? p : null;
      }, 10_000, 300);
      let control = { text: ctlText, outcome: null, readHex: null, landed: false, why: 'no picture of the question still drawn was read for the control' };
      if (ctlPic !== null) {
        const ctlFrom = hr();
        const ctlAnswer = await paste(A, ids.claude, ctlText, ctlPic.screen);
        const ctlHex = await settledHex((f) => standinHexFrom(ids.claude, f), ctlFrom, 2_500, landsAs(ctlText, true));
        control = { text: ctlText, turn: ctlPic.screen.turn ?? null, dialog: ctlPic.screen.dialog ?? null, outcome: ctlAnswer.outcome, readHex: ctlHex, landed: ctlHex === landsAs(ctlText, true), why: null };
      }
      await tell(ids.claude, [{ op: 'idle' }]).catch(() => undefined);
      arm('P5', { words: wordsFor('SCREEN_QUESTION_MOVED'), first, moved, answer, readHex, focusReports, control });
    });
    await armSafely('P6', async () => {
      if (!machineOk) throw new Error('the loopback machine is not usable');
      const id = await shell(main, 'p348-p6', { far: true });
      const tmuxName = (await sessions(main)).find((s) => s.id === id)?.tmuxName ?? '';
      const pic = await picture(A, id);
      const text = `p6 ${canary()}`;
      const t1 = Date.now();
      const answer = await paste(A, id, text, pic.screen);
      await sleep(1_500);
      const entries = farEntries();
      // The paste's own verbs and its canary, never the reads that name the session: the picture's watcher reads it.
      const w = entries === null ? null : farWindow(entries, t1, Date.now(), [tmuxName, id], BUFFER_FAR_VERBS, [text.slice(3)]);
      arm('P6', { words: wordsFor('PASTE_THIS_MAC_ONLY'), picture: pic.status, pasteFlag: screenPasteOf(pic.screen), pasteKey: pic.screen !== null && Object.hasOwn(pic.screen, 'paste'), answer, far: w === null ? { read: false, all: 0, naming: [], verbs: [], canary: 0 } : { read: true, ...w } });
    });
    await armSafely('P7', async () => {
      const pic = await picture(A, ids.rec);
      const text = `${canary()} replay`;
      const write = freshWriteId();
      const once = { nonce: nonce(), timestamp: String(Date.now()) };
      const from = hr();
      const first = await paste(A, ids.rec, text, pic.screen, { write, ...once });
      const firstHex = await settledHex((f) => recorderHexFrom(ids.rec, f), from, 1_500, landsAs(text, false));
      const mid = hr();
      const again = (await pasteText(A.phone, A.door, { session: ids.rec, text, turn: pic.screen?.turn ?? ZERO_TURN, dialog: pic.screen?.dialog ?? null, write, ...once })).status;
      const resent = await paste(A, ids.rec, text, pic.screen, { write, repeat: true });
      await sleep(700);
      arm('P7', { text, first: { status: first.status, ok: first.ok, outcome: first.outcome, body: first.body }, again, resent: { status: resent.status, body: resent.body }, firstHex, moreHex: recorderHexFrom(ids.rec, mid) });
    });
    if (on('P8')) {
      try {
        const id = await shell(main, 'p348-p8');
        const log = join(RECORDERS, 'p8.jsonl');
        await startIn(main, id, `exec '${process.execPath}' '${join(RUN, 'p8-reader.mjs')}' '${log}'`);
        await waitFor(() => existsSync(log), 15_000, 200);
        await sleep(500);
        const pic = await picture(A, id);
        const keys = await sendKeys(A.phone, A.door, id, [{ k: 'Enter' }], { turn: pic.screen?.turn ?? ZERO_TURN, dialog: pic.screen?.dialog ?? null });
        // No canary: a cooked read echoes, and an echo on the screen is what a snapshot keeps.
        const answer = await paste(A, id, 'p8 one line\n', pic.screen);
        await sleep(1_500);
        const reads = linesOf(readFileSync(log, 'utf8')).slice(1).map((l) => JSON.parse(l)).map((x) => ({ cooked: x.cooked, hex: x.hex }));
        report.printed.P8 = { keys: keys.status, paste: answer.outcome, reads };
        say(`P8 (stated, printed, never graded): the Return then the paste reached the reader as ${J(reads.map((x) => `${x.cooked ? 'cooked' : 'raw'}:${x.hex}`))}`);
      } catch (err) {
        say(`P8 (stated) could not be read: ${String(err?.message ?? err)}`);
      }
    }
    argvRead = sampler.stop();
    sampler = null;

    // ---- W: the marks ------------------------------------------------------------------------
    await armSafely('W', async () => {
      const clear = '\u001b[H\u001b[2J';
      const drawLong = Buffer.from(`${clear}${'w'.repeat(200)}`, 'utf8');
      const drawG1b = Buffer.from(`${clear}${'A'.repeat(200)}\u001b[Hstatus: ok\u001b[K`, 'utf8');
      const drawAlt = Buffer.from(`\u001b[H${'A'.repeat(200)}`, 'utf8');
      const drawHist = Buffer.from(`${clear}${Array.from({ length: 120 }, (_, i) => `H${String(i).padStart(3, '0')} ${'abcdefghij'.repeat(15).slice(0, 145)}`).join('\r\n')}`, 'utf8');
      const w = {
        long: await drawerSession(main, 'p348-w-long', drawLong),
        g1b: await drawerSession(main, 'p348-w-g1b', drawG1b),
        alt: await drawerSession(main, 'p348-w-alt', drawAlt, { alt: true }),
        hist: await drawerSession(main, 'p348-w-hist', drawHist)
      };
      const far = machineOk ? await drawerSession(main, 'p348-w-far', drawLong, { far: true }) : null;
      await sleep(2_000);
      /** A picture that held still across two reads 400 ms apart. */
      const stillPicture = (id) =>
        waitFor(async () => {
          const p1 = await picture(A, id);
          await sleep(400);
          const p2 = await picture(A, id);
          return p1.screen !== null && p2.screen !== null && J(p1.screen.lines) === J(p2.screen.lines) ? p2 : null;
        }, 15_000, 300);
      const local = [];
      for (const name of ['long', 'g1b', 'alt']) {
        const pic = await stillPicture(w[name]);
        const pane = paneReading(await targetOf(main, w[name]));
        const mine = marksByD45({ flagged: pane.flagged, rowsText: pane.rowsText, cols: pane.cols, alternate: pane.alternate });
        const read = screenWrapsOf(pic?.screen);
        // `pictured` and `pictureAlternate` (the probe review, rule 9): whether the phone read a still picture at all,
        // and whether that PICTURE says the alternate screen, which no mark list can say for itself.
        local.push({ name, pictured: pic !== null && pic.screen !== null, pictureAlternate: pic?.screen?.alternate ?? null, wraps: read.marks, problem: read.problem, mine, flagged: pane.flagged, alternate: pane.alternate, road: pane.road });
      }
      // A page of history: the last 100 rows above the live screen, asked as the phone asks, and the same rows read by
      // this file's own client numbered from the oldest line as the page is (index i is tmux's line i - depth).
      let page = null;
      let pageWhy = null;
      {
        const pic = await stillPicture(w.hist);
        const sc = pic?.screen ?? null;
        if (sc === null) pageWhy = 'the history drawer never held still for the phone';
        else if (!Number.isInteger(sc.depth) || sc.depth <= 100) pageWhy = `the history drawer's picture carried depth ${J(sc.depth)}, not more than 100`;
        else {
          const ask = { from: sc.depth - 100, count: 100, depth: sc.depth, wrap: sc.cols, keep: 'bottom' };
          const got = await scrollbackRead(A.phone, A.door, w.hist, ask);
          const answer = got.answer;
          if (got.status !== 200 || answer === null || !Array.isArray(answer.rows) || !Number.isInteger(answer.from) || !Number.isInteger(answer.depth)) {
            // The Mac's answer, which is the product's: graded, never UNREADABLE.
            page = { status: got.status, why: answer?.why ?? null, wraps: [], mine: [], rows: 0, read: 0 };
          } else {
            const a = answer.from - answer.depth;
            const b = answer.from + answer.rows.length - 1 - answer.depth;
            const pane = paneReading(await targetOf(main, w.hist), { range: ['-S', String(a), '-E', String(b)] });
            page = { status: got.status, why: answer.why ?? null, wraps: scrollbackWrapsOf(answer).marks, problem: scrollbackWrapsOf(answer).problem, mine: marksByD45({ flagged: pane.flagged, rowsText: pane.rowsText, cols: pane.cols, alternate: false }), rows: answer.rows.length, read: pane.rowsText.length, road: pane.road };
          }
        }
      }
      // The same output on the machine, whose marks take the road its own tmux release names (D44).
      let farReading = null;
      if (far !== null) {
        const pic = await stillPicture(far);
        const pane = paneReading(await targetOf(main, far), { far: true });
        const version = versionOf(FAR_TMUX);
        farReading = { version, road: roadOfVersion(version), mineRoad: pane.road, pictured: pic !== null && pic.screen !== null, wraps: screenWrapsOf(pic?.screen).marks, problem: screenWrapsOf(pic?.screen).problem, mine: marksByD45({ flagged: pane.flagged, rowsText: pane.rowsText, cols: pane.cols, alternate: pane.alternate }) };
      }
      const localVersion = versionOf(tmuxBin());
      arm('W', { local, page, pageWhy, far: farReading, localTmux: { bin: tmuxBin(), version: localVersion, road: roadOfVersion(localVersion) }, farTmux: FAR_TMUX });
    });

    // ---- K's buffers, while both servers are up ------------------------------------------------
    {
      const local = tmuxOut('list-buffers', '-F', '#{buffer_name}');
      const farB = farOut('list-buffers', '-F', '#{buffer_name}');
      // THE PROBE REVIEW (rule 9): `read` is THIS Mac's server, where every paste lands; a far listing alone used to
      // stand for both, so a local server nobody listed read as holding no buffer.
      buffersRead = { read: local !== null, farRead: farB !== null, names: [...linesOf(local ?? ''), ...linesOf(farB ?? '')] };
    }

    // ---- the ends: every session this run made, ended and removed by main's own verbs ------------
    {
      const all = [...made.keys()];
      let endedCount = 0;
      let removedCount = 0;
      for (const id of all) if ((await bridge(main, `window.gmux.sessions.kill(${J(id)})`)).ok) endedCount += 1;
      await waitFor(async () => ((await sessions(main)).filter((s) => made.has(s.id) && ['running', 'idle', 'needs_input'].includes(s.status)).length === 0 ? true : null), 60_000, 500);
      for (const id of all) if ((await bridge(main, `window.gmux.sessions.discard(${J(id)})`)).ok) removedCount += 1;
      await sleep(1_500);
      ends = { made: all.length, ended: endedCount, removed: removedCount, leftListed: (await sessions(main)).filter((s) => made.has(s.id)).length };
      say(`the ends: ${J(ends)}`);
    }
  });
} catch (err) {
  // A run that stopped left every arm after the stop unread, which is exit 2 ("could not run"), never 1.
  unreadable += 1;
  report.error = String(err?.message ?? err);
  say(`the run stopped, so every arm after this point is UNREADABLE: ${report.error}`);
} finally {
  /** One step of the ending: a step that throws is written down and the ending goes on. */
  const safely = (label, fn, fallback = null) => {
    try {
      return fn();
    } catch (err) {
      (report.ending ??= []).push(`${label}: ${String(err?.message ?? err)}`);
      return fallback;
    }
  };
  if (sampler !== null) argvRead = sampler.stop();
  safely('the far rules', () => writeFarRules([]));
  const leaked = watch === null ? [] : safely('the Tailscale watcher', () => watch.stop(), []);
  const endedStandin = standin === null ? { ended: [], left: [] } : safely('the Tailscale stand-in', () => endStandinProcesses(standin.dir, 1_500), { ended: [], left: ['unknown'] });
  if (dns !== null) await dns.close().catch((err) => (report.ending ??= []).push(`the DNS stand-in: ${String(err?.message ?? err)}`));
  // Every agent stand-in, recorder, drawer and reader this run started, each re-read before it is signalled (a pid can
  // be handed out again): a pid a stand-in of THIS run wrote in its hello whose command line is still the stand-in's
  // or names this run's folder, and any other process whose command line names this run's folder. Never a process
  // by the stand-in's path alone, which another run of probe:p318 in this checkout also runs.
  const helloPids = new Set(safely('the stand-ins\' hellos', () => hellos(STANDIN_DIR), []).flatMap((h) => [Number(h.pid), Number(h.runnerPid)]).filter((p) => Number.isInteger(p) && p > 1));
  const ours = (rows, pid) => {
    const command = rows.get(pid)?.command ?? '';
    if (pid === process.pid || command === '') return false;
    return command.includes(RUN) || (helloPids.has(pid) && command.includes(STANDIN_PATH));
  };
  const table = processTable();
  const pids = [...new Set([...helloPids, ...table.keys()])].filter((p) => Number.isInteger(p) && p > 1 && ours(table, p));
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* gone with its pane */
    }
  }
  for (let i = 0; i < 20 && pids.some(alive); i += 1) await sleep(100);
  {
    const now = processTable();
    for (const pid of pids.filter((p) => alive(p) && ours(now, p))) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* gone */
      }
    }
  }
  await sleep(300);
  const after = processTable();
  const agentsLeft = pids.filter((p) => alive(p) && ours(after, p)).length;
  const runLeft = [...after.values()].filter((r) => r.pid !== process.pid && r.command.includes(RUN)).length;
  // Electrons, counted once at the end: anything carrying this run's profile, and the shims and apps this run started
  // still running an Electron or the app (the main process renames itself to the bare `Tortie`).
  const electronsLeft = [...after.values()].filter((r) => r.command.includes(PROFILE) || ((shims.has(r.pid) || apps.has(r.pid)) && /[Ee]lectron|Tortie/.test(r.command))).length;
  // PARENT, graded after HEAD answered the same bodies.
  if (parentReading !== null) {
    arm('PARENT', { ...parentReading, ends: parentEnds.map((e, i) => ({ label: e.label, parent: e.parent, head: headEnds?.[i] ?? null })) });
  } else cannotRead('PARENT', 'the parent never ran its half');
  // K, after the app is gone: every file this run's world holds, app.log, the sampler and the buffers.
  if (on('K')) {
    const text = appLogText();
    const fileHits = [];
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
          for (const c of canaries) if (s.includes(c)) fileHits.push({ file: p.slice(HARNESS_DIR.length + 1) });
        }
      }
    };
    walk(HARNESS_DIR);
    arm('K', {
      canaries: canaries.size,
      filesScanned,
      fileHits,
      appLogRead: text !== null,
      appLogHits: text === null ? 0 : [...canaries].filter((c) => text.includes(c)).length,
      lines: { paste: writeLines('paste').length, remove: writeLines('remove').length },
      acted: { ...acted },
      unknown: { ...actedUnknown },
      argvSamples: argvRead.samples,
      argvHits: argvRead.hits,
      buffersRead: buffersRead?.read === true,
      buffers: buffersRead?.names ?? []
    });
  }
  // RUN: the manifest's programs, read from a COPY beside its WAL after the app is gone.
  const m = manifestSessions(MANIFEST);
  const roots = [RUN, FAR_HOME];
  try {
    roots.push(realpathSync(FAR_HOME));
  } catch {
    /* as written */
  }
  // A SHELL row runs the login shell: `[$SHELL, -l]` on this Mac (src/main/manifest/agents.ts) and an empty argv on a
  // machine (src/main/machines/remote-sessions.ts), so its argv[0] is a shell /etc/shells lists, or none. Every other
  // row ran an agent, and its argv[0] must be a program of this run.
  const SHELLS = safely('/etc/shells', () => linesOf(readFileSync('/etc/shells', 'utf8')).map((l) => l.trim()).filter((l) => l.startsWith('/')), ['/bin/zsh', '/bin/bash', '/bin/sh']);
  const outside = m.read ? m.rows.filter((row) => !(roots.some((root) => within(root, row.argv0)) || (row.agent === 'shell' && (row.argv0 === null || SHELLS.includes(row.argv0))))).map((row) => ({ id: row.id, name: row.name, agent: row.agent, argv0: row.argv0 })) : [];
  arm('RUN', {
    tailscalePreflight,
    dnsPreflights,
    agentsHeld,
    resolved: resolvedOk,
    hiddenUnresolved,
    manifest: { read: m.read, rows: m.rows.length, outside, why: m.why },
    realTailscale: leaked.length,
    samples: watch?.samples() ?? 0,
    forbidden: standin === null ? 0 : standin.forbidden().length,
    standinLeft: endedStandin.left.length,
    agentsLeft,
    runLeft,
    electronsLeft,
    history: { before: HISTORY_BEFORE, after: historyStat() },
    ends
  });
  // Every graded arm says something: one the run never reached is named, and counted once more only when no stop
  // already counted it.
  for (const id of ['PARENT', 'A0', ...[...ARMS].filter((x) => x !== 'P8' && GRADERS[x] !== undefined), 'RUN']) {
    if (report.arms.some((a) => a.id === id)) continue;
    if (report.error === undefined) cannotRead(id, 'the run never read it');
    else report.arms.push({ id, ok: null, said: 'not read: the run stopped before it' });
  }
  safely('the report', () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p348.json'), `${redactedReport(report)}\n`, { mode: 0o600 });
  });
  if (!KEEP) safely('the scratch world', () => rmSync(RUN, { recursive: true, force: true }));
  else say(`kept ${RUN} (P348_KEEP=1): the stand-ins' logs under ${STANDIN_DIR}, the recorders' under ${RECORDERS}, the far log ${FAR_LOG}; every reading in ${OUT}`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
