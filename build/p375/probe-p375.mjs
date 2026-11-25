#!/usr/bin/env node
/**
 * probe:p375 — THE PHASE 375 APP RUN (build/p375/SPEC.md §8): the Antigravity
 * card and Settings name the account agy's status line handed Tortie's
 * script, driven in the real app against a stand-in `agy`, the parent first.
 *
 *   node build/harness-socket.mjs --fresh gmux-p375 'node build/p375/probe-p375.mjs'
 *
 * ONE ELECTRON AT A TIME, every launch through build/electron-run.mjs's
 * `withElectron` with `program: 'app'`, `--use-mock-keychain` and
 * `GMUX_PROBES=1`, on a scratch profile, HOME and ZDOTDIR under
 * `/private/var/tmp` (`HISTFILE=/dev/null`, `SHELL=/bin/sh`, no
 * TERM_SESSION_ID or TERM_PROGRAM) and the socket build/harness-socket.mjs
 * hands this file. A launch names it as its `tmuxSocket`, so the helper reads
 * his session names once before and once after, READ ONLY (his allowance of 2
 * November 2026), and ends the scratch server. The exceptions are the first
 * launches of OLDER and NEWER, whose scratch server has to outlive the app
 * (a session that keeps reporting while another build opens its profile);
 * the last launch of each names the socket and ends it. That census is the
 * one read of his server anything here makes, and this file names that
 * server nowhere.
 *
 * NO AGENT RUNS AND NOTHING OF AN ACCOUNT IS READ. `agy` is
 * build/p374/stand-in.mjs behind the launcher its `buildAgy` compiles, under
 * its bare name on a closed PATH, replaying build/fixtures/p374's redacted
 * recordings with ADDRESSES THIS FILE MAKES UP AT RUN TIME
 * (`p375-<8 hex>-a@example.invalid`, and `-b` for a second account). Every
 * other probed row is hidden (`hiddenAgentsBesides(['antigravity'])`), the
 * precheck holds that list to the checkout's own registry, the folders the
 * app's scan always searches are refused if they hold an `agy`, and the app's
 * own `agents:list` must say nothing resolved but the stand-in, under this
 * run, or the launch is refused, exit 2. The two other meters read the usage
 * fixture (`GMUX_USAGE_FIXTURE`), so no request can be made, and the app's
 * sockets are sampled: a peer that is not 127.0.0.1 fails RUN. No key, no
 * keychain, no screenshot, nothing under ~/.gemini: agy's own folder is under
 * the scratch HOME, and the stand-in refuses the account's own home.
 *
 * NO ADDRESS LEAVES THE SCRATCH. The report and every printed line have the
 * planted addresses' own hex replaced (`<hexA>`, `<hexB>`), so neither
 * address is written outside this run's folder; the committed grader fixtures
 * hold only addresses invented under example.invalid.
 *
 * THE APP'S WINDOW NEVER TAKES HIS KEYBOARD FOR A READING. Main reads the
 * folder only while a window is in front, so main's `isFocused` is answered
 * from here through its own inspector (probe:p374's way), let go before every
 * quit.
 *
 * THE LAUNCHES
 *   P1 parent   OFF, then ON, CARD, SETTINGS, STATUS
 *   H1 head     OFF, then ON, CARD, SETTINGS, TWO, SEARCH, STATUS, and
 *               SETTINGS switched off last (off removes the folder)
 *   H2 head     OLDER: a session reports A, the app quits, the session lives
 *   P2 parent   OLDER: the parent opens HEAD's profile, and a live write too
 *   H3 head     OLDER: HEAD again
 *   P3 parent   NEWER: the parent's script writes a slot, the session lives
 *   H4 head     NEWER: HEAD rewrites the script at boot (D14); the next run
 *
 * THE ARMS, each graded on the stand-in's own log of every run, on this
 * file's own read of the slot file and of the page, never on what the app
 * says of itself:
 *   OFF      the switch off: every spawned and recorded argv the parent's
 *            byte for byte; no folder; no run; no Antigravity group on the
 *            card and no Antigravity row in Settings
 *   ON       42 replayed runs with address A: exit 0, no byte out, no error
 *            block, none over the overlap; the slot line the parent's shape
 *            with `"e":"A"` straight after the hash
 *   CARD     the hover card: Antigravity's lines the parent's with `Login: A`
 *            after the plan line, no control in its group, Claude's and
 *            Codex's groups the parent's, the parent's card naming no address
 *   SETTINGS Settings then Agents: the Antigravity row reads
 *            `A · Signed in to the Antigravity CLI. Switch accounts there.`
 *            with no control; Claude's and Codex's rows the parent's; off, no
 *            row; the parent, no row
 *   TWO      two sessions, A then B with other numbers, then A again: the
 *            card follows the last writer within FACE_MS, and every sample's
 *            address and numbers are one file's
 *   SEARCH   with the app still up: A and B as bytes, as their local parts,
 *            base64 and UTF-16 in every file of the world, a dump of a COPY
 *            of the manifest beside its WAL, `ps -Ao command` and `ps -E` of
 *            this run's own pids, and every usage answer and push the two
 *            windows saw: present ONLY in a slot line's `"e"` and in the
 *            Antigravity row's `email` and `usage:account`
 *   OLDER    HEAD's slot read by the parent: numbers drawn, no login line, no
 *            crash dump, a live write too; then HEAD again: `Login: A`
 *   NEWER    the parent's slot read by HEAD: no login line; the script
 *            rewritten with its salt; the next run names A
 *   STATUS   100 runs at 300 ms over an idle agy, both flavours, a run held
 *            alive in each: never working, at HEAD as at the parent
 *   RUN      agents hidden and read back, the fixture at every launch, no
 *            peer, nothing left, the census, his history unmoved
 *
 * WHERE THIS FILE READS SPEC §8 OTHERWISE, STATED
 *   1. A card line with a reset (`Resets in 3h 12m`) is compared with its
 *      countdown left out, because the two builds read it minutes apart; the
 *      windows' numbers, their order and every other word are compared whole.
 *   2. TWO runs at HEAD alone. The parent names no address, so it has no
 *      pair to mix; its numbers following the last writer are 374's, and
 *      probe:p374 ACCT holds them.
 *   3. OLDER's parent launch also takes one LIVE write of HEAD's script while
 *      it is up, so "ignores the field" is read over a line that landed under
 *      it and not only over one it found at boot.
 *   4. NEWER's time runs from the end of the run to the card read that first
 *      showed the line, not to the end of closing that card (about half a
 *      second of this file's own); the later time is kept as `afterDoneMs`.
 *      (The probe review, 2026-11-25, beside its other changes: CARD holds
 *      the drawn address to the slot line read beside it, TWO's samples name
 *      their launch, SEARCH's manifest dump must hold this launch's rows, and
 *      a card or resting row that was not read is UNREADABLE, never a pass.)
 *
 *   P375_PARENT_CHECKOUT=<a BUILT 8d58c391>   required, else exit 2
 *   P375_ARMS=ON,CARD      only these (RUN is always read; P1 and H1 run for
 *                          any of OFF ON CARD SETTINGS TWO SEARCH STATUS)
 *   P375_KEEP=1            keep the scratch world
 *   P375_OUT_DIR=<dir>     where the report goes (default out/p375)
 *   node build/p375/probe-p375.mjs --grader-self-test   every grader over build/p375/fixtures/graders.json; starts nothing
 *   node build/p375/probe-p375.mjs --list-graders       the clauses; starts nothing
 *   node build/p375/probe-p375.mjs --preflight          what a run needs; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ. A missing reading is UNREADABLE, never a pass.
 *
 * VERIFIERS ONLY: it starts Electrons. Take the lock.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { loadavg, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, hiddenAgentsPrecheck, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { drawnOf, readRecording, rebase, tailOf } from '../p374/make-fixtures.mjs';
import { GOOD_VERSION, STANDIN_PATH, buildAgy, hellos, runsOf, setVersion, stateOf, tell, writeSpecstory } from '../p374/stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// What the app is held against, BY VALUE, never imported from src/
// ---------------------------------------------------------------------------

export const SNAPSHOT = '8d58c391';
export const STAND_IN_ROWS = Object.freeze(['antigravity']);
/** Main looks every 5 s while a window is in front; an arm allows one look and a second. */
export const FACE_MS = 6_000;
export const STATUS_RUNS = 100;
/** A run held alive, under agy's own 5 s, and how much of it this file must have seen. */
export const HOLD_MS = 4_400;
export const HELD_AT_LEAST_MS = 3_000;
export const WORKING = 'running';
export const HISTORY_QUIET_MS = 180_000;
/** The Settings sentence (SPEC §5), by value. */
export const ACCOUNT_NOTE = 'Signed in to the Antigravity CLI. Switch accounts there.';
/** The card's labels this file reads by (the parent's words, unchanged by this phase). */
export const LABEL = Object.freeze({ antigravity: 'Antigravity', claude: 'Claude', codex: 'Codex' });
/** A token that stands in every world, so a search that finds nothing can be told from one that read nothing. */
export const SEARCH_CONTROL = 'P375SEARCHCONTROL';
/** Where an address may stand on disk (SPEC D11): a slot line or its unrenamed write, relative to the world. */
export const SLOT_PATH = /^\/p\/gmux\/antigravity-usage\/[0-9a-f-]{36}\.json(?:\.\d+\.tmp)?$/;
/** The slot line's head with its address (D1): the hash, then `"e"`. */
export const SLOT_HEAD = /^(\{"v":1,"h":"[0-9a-f]{64}",)"e":("[^"\\]*"|null),/;
/** The recordings' lines this file replays: launch 4 to 13 draw one face, 14 to 42 another. */
export const FIRST = Object.freeze({ from: 4, to: 13 });
export const SECOND = Object.freeze({ from: 14, to: 42 });

/** `30% 5h · 37% wk`, this file's own reading of the meter's two windows. */
export function faceOf(payload, now) {
  const d = drawnOf(payload, now);
  const part = (w, label) => (w === null ? null : `${String(Math.round(w.used))}% ${label}`);
  return [part(d.fiveHour, '5h'), part(d.sevenDay, 'wk')].filter((x) => x !== null).join(' · ');
}
/** The same two numbers, read off the card's own lines (`Gemini 30% 5h, Resets in …`). */
export function cardFaceOf(lines) {
  if (!Array.isArray(lines)) return '';
  const pick = (label) => {
    const l = lines.find((x) => new RegExp(`^Gemini \\d+% ${label}(?:,|$)`).test(String(x)));
    return l === undefined ? null : `${/^Gemini (\d+)%/.exec(l)[1]}% ${label}`;
  };
  return [pick('5h'), pick('wk')].filter((x) => x !== null).join(' · ');
}
/** The card's login line, or null. */
export const loginOf = (lines) => (Array.isArray(lines) ? (lines.find((l) => String(l).startsWith('Login: ')) ?? null) : null);
/** A card line with its countdown left out (stated 1), every other word kept. */
export const unclocked = (line) => String(line).replace(/Resets in (?:\d+d \d+h|\d+h \d+m|\d+m)/g, 'Resets in ·');
/** The parent's lines with `Login: <address>` where Phase 203 puts it: after the name and the plan, before the windows. */
export function withLogin(lines, address) {
  const at = lines.findIndex((l, i) => i > 0 && (/^Gemini /.test(l) || /^Other models /.test(l)));
  const k = at === -1 ? lines.length : at;
  return [...lines.slice(0, k), `Login: ${address}`, ...lines.slice(k)];
}
/** A slot line with its `"e"` taken out, so what is left can be searched; null when it is no slot line with one. */
export function withoutE(text) {
  return SLOT_HEAD.test(text) ? text.replace(SLOT_HEAD, '$1') : null;
}
/**
 * Every place inside a usage answer a needle stands, as a dotted path, split
 * into the places SPEC D11 allows (the Antigravity row's `email`, or the
 * whole answer of `usage:account`) and every other.
 */
export function ipcPlaces(value, needles, kind) {
  const allowed = [];
  const other = [];
  const visit = (v, path) => {
    if (typeof v === 'string') {
      if (!needles.some((n) => v.includes(n))) return;
      const ok = kind === 'account' ? path === '' : /^providers\.\d+\.email$/.test(path) && value?.providers?.[Number(path.split('.')[1])]?.provider === 'antigravity';
      (ok ? allowed : other).push(path === '' ? '(the answer)' : path);
      return;
    }
    if (v === null || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) visit(x, path === '' ? k : `${path}.${k}`);
  };
  visit(value, '');
  const keyed = kind === 'snapshot' && Array.isArray(value?.providers) ? value.providers.filter((p) => p?.provider !== 'antigravity' && Object.hasOwn(p ?? {}, 'email')).map((p) => String(p.provider)) : [];
  return { allowed, other, keyed };
}

// ---------------------------------------------------------------------------
// The graders. Each is `{ title, needs, clauses }` over one plain reading.
// A need that does not hold is UNREADABLE; a clause that does not is a FAIL.
// ---------------------------------------------------------------------------

const same = (a, b) => J(a) === J(b);
const numbered = (t) => /% 5h/.test(String(t));
const BUILDS = ['parent', 'head'];
const groupOf = (groups, provider) => (Array.isArray(groups) ? (groups.find((g) => g?.lines?.[0] === LABEL[provider]) ?? null) : null);
const clockless = (g) => (g === null ? null : { lines: g.lines.map(unclocked), controls: g.controls });
const rowOf = (rows, provider) => (Array.isArray(rows) ? (rows.find((r) => r?.provider === provider) ?? null) : null);
const pairOk = (r, s) => (s.login === `Login: ${r.A}` && r.aFaces.includes(s.face)) || (s.login === `Login: ${r.B}` && r.bFaces.includes(s.face));
const shapeOk = (r, b) => r[b].runs.codes.length === 1 && r[b].runs.codes[0] === 0;

export const GRADERS = {
  OFF: {
    title: 'with the switch off every argv and file is the parent’s, and nothing names Antigravity',
    needs: [
      ['both builds created the session and the stand-in said how it was started', (r) => BUILDS.every((b) => Array.isArray(r[b]?.spawned) && Array.isArray(r[b]?.recorded))],
      ['the stand-in answered the run it was asked for', (r) => BUILDS.every((b) => r[b].asked === true && Number.isInteger(r[b].runs))],
      ['both cards were read with the two other meters on', (r) => BUILDS.every((b) => groupOf(r[b].groups, 'claude') !== null && groupOf(r[b].groups, 'codex') !== null)],
      ['both Settings pages drew their logins', (r) => BUILDS.every((b) => rowOf(r[b].settings, 'claude') !== null && rowOf(r[b].settings, 'codex') !== null)],
      ['the folder was read', (r) => typeof r.head.folder === 'boolean']
    ],
    clauses: [
      ['spawned as the parent spawned it', (r) => same(r.head.spawned, r.parent.spawned)],
      ['recorded as the parent recorded it', (r) => same(r.head.recorded, r.parent.recorded) && same(r.head.resume, r.parent.resume)],
      ['no argv holds --settings', (r) => !J([r.head.spawned, r.head.recorded, r.head.resume]).includes('settings')],
      ['the folder was never made', (r) => r.head.folder === false],
      ['no status line run', (r) => r.head.runs === 0],
      ['no Antigravity group on the card', (r) => groupOf(r.head.groups, 'antigravity') === null],
      ['no Antigravity row in Settings', (r) => rowOf(r.head.settings, 'antigravity') === null],
      ['the card’s groups are the parent’s', (r) => same(r.head.groups.map(clockless), r.parent.groups.map(clockless))]
    ]
  },
  ON: {
    title: 'a session reports, and the slot line is the parent’s with the address after the hash',
    needs: [
      ['both builds’ sessions said hello', (r) => BUILDS.every((b) => Number.isInteger(r[b]?.pid))],
      ['every replayed run was logged', (r) => BUILDS.every((b) => r[b].runs?.sent >= 42 && r[b].runs.logged === r[b].runs.sent)],
      ['both slot lines were read, each with its hash', (r) => BUILDS.every((b) => typeof r[b].kept === 'string' && /^[0-9a-f]{64}$/.test(String(r[b].hash)))],
      ['there is a tail and a face to want', (r) => BUILDS.every((b) => typeof r[b].want === 'string' && numbered(r[b].wantFace) && typeof r[b].face === 'string')],
      ['the address was planted', (r) => /^p375-[0-9a-f]{8}-a@example\.invalid$/.test(String(r.A))]
    ],
    clauses: [
      ['every run exits 0', (r) => shapeOk(r, 'head') && r.head.runs.nonZero === 0],
      ['no run wrote a byte', (r) => r.head.runs.outBytes === 0 && r.head.runs.errBytes === 0],
      ['no error block', (r) => r.head.runs.errorBlocks === 0],
      ['no run over the 300 ms overlap', (r) => r.head.runs.killedByNext === 0],
      ['the parent’s line is the parent’s shape', (r) => r.parent.kept === `{"v":1,"h":"${r.parent.hash}",${r.parent.want}`],
      ['the line is the parent’s with "e":A after the hash', (r) => r.head.kept === `{"v":1,"h":"${r.head.hash}","e":${J(r.A)},${r.head.want}`],
      ['the face draws the last numbers', (r) => r.head.face === r.head.wantFace]
    ]
  },
  CARD: {
    title: 'the card names the account where Claude’s and Codex’s do, and nothing else moves',
    needs: [
      ['both cards were read, all three groups', (r) => BUILDS.every((b) => ['antigravity', 'claude', 'codex'].every((p) => groupOf(r[b]?.groups, p) !== null))],
      ['both drew the reported numbers', (r) => BUILDS.every((b) => numbered(cardFaceOf(groupOf(r[b].groups, 'antigravity').lines)))],
      // HEAD is compared with the parent's card, so that card must be of the line ON waited for; a parent card read
      // before it was drawn is no reading. HEAD's own card is not held here: its numbers are a clause below.
      ['the parent’s card shows the line it was given', (r) => cardFaceOf(groupOf(r.parent.groups, 'antigravity').lines) === r.parent.want],
      ['the resting row was read', (r) => typeof r.head.resting === 'string' && r.head.resting.startsWith(LABEL.antigravity) && numbered(r.head.resting)],
      ['the slot line was read beside the card', (r) => BUILDS.every((b) => typeof r[b].kept === 'string' && /^\{"v":1,"h":"[0-9a-f]{64}",/.test(r[b].kept))]
    ],
    clauses: [
      // The address the card draws is the one the slot line holds as its "e", so an address drawn from anywhere else fails.
      ['the address drawn is the slot line’s', (r) => SLOT_HEAD.exec(r.head.kept)?.[2] === J(r.A) && loginOf(groupOf(r.head.groups, 'antigravity').lines) === `Login: ${JSON.parse(SLOT_HEAD.exec(r.head.kept)[2])}`],
      ['Antigravity’s lines are the parent’s with Login: A after the plan', (r) => same(groupOf(r.head.groups, 'antigravity').lines.map(unclocked), withLogin(groupOf(r.parent.groups, 'antigravity').lines.map(unclocked), r.A))],
      ['no control in its group', (r) => groupOf(r.head.groups, 'antigravity').controls === 0],
      ['Claude’s group is the parent’s', (r) => same(clockless(groupOf(r.head.groups, 'claude')), clockless(groupOf(r.parent.groups, 'claude')))],
      ['Codex’s group is the parent’s', (r) => same(clockless(groupOf(r.head.groups, 'codex')), clockless(groupOf(r.parent.groups, 'codex')))],
      ['the parent’s card names no address', (r) => !J(r.parent.groups).includes('@') && loginOf(groupOf(r.parent.groups, 'antigravity').lines) === null],
      ['the resting row names no address', (r) => !String(r.head.resting).includes('@')]
    ]
  },
  SETTINGS: {
    title: 'Settings then Agents names the account in one row with no control',
    needs: [
      ['both builds’ logins were read, Claude’s and Codex’s', (r) => ['parentOn', 'headOn', 'headOff'].every((k) => rowOf(r[k], 'claude') !== null && rowOf(r[k], 'codex') !== null)],
      ['the address had reported before the row was read', (r) => r.reported === true]
    ],
    clauses: [
      ['the row is there with its words', (r) => rowOf(r.headOn, 'antigravity')?.caption === `${r.A} · ${ACCOUNT_NOTE}` && rowOf(r.headOn, 'antigravity').label === LABEL.antigravity],
      ['it has no control', (r) => rowOf(r.headOn, 'antigravity').controls === 0],
      ['it follows Codex’s', (r) => same(r.headOn.map((x) => x.provider), ['claude', 'codex', 'antigravity'])],
      ['Claude’s and Codex’s rows are the parent’s', (r) => ['claude', 'codex'].every((p) => same(rowOf(r.headOn, p), rowOf(r.parentOn, p)) && same(rowOf(r.headOff, p), rowOf(r.parentOn, p)))],
      ['switched off: no row', (r) => rowOf(r.headOff, 'antigravity') === null],
      ['the parent: no row', (r) => rowOf(r.parentOn, 'antigravity') === null]
    ]
  },
  TWO: {
    title: 'two accounts: the card follows the last writer and never mixes them',
    needs: [
      ['two addresses were planted', (r) => typeof r.A === 'string' && typeof r.B === 'string' && r.A !== r.B],
      ['the two accounts draw different numbers', (r) => r.aFaces?.length > 0 && r.bFaces?.length > 0 && [...r.aFaces, ...r.bFaces].every(numbered) && r.aFaces.every((f) => !r.bFaces.includes(f))],
      ['A was drawn first', (r) => r.aFirst === true],
      ['each writer’s file landed, B then A again', (r) => r.bLandedAt > 0 && r.aAgainAt > r.bLandedAt + FACE_MS],
      ['the card was sampled throughout, every sample a reading', (r) => Array.isArray(r.samples) && r.samples.length >= 40 && r.samples.every((s) => typeof s.face === 'string' && s.face !== '')],
      // Both accounts are read by ONE launch, so "never mixes" is asked of one card that saw both.
      ['every sample is of one launch', (r) => Number.isInteger(r.pid) && r.pid > 0 && r.samples.every((s) => s.pid === r.pid)],
      ['and while B was the last writer', (r) => r.samples.some((s) => s.at > r.bLandedAt + FACE_MS && s.at < r.aAgainAt)],
      ['and after the last writer’s time was up', (r) => r.samples.some((s) => s.at > r.aAgainAt + FACE_MS)]
    ],
    clauses: [
      ['every sample’s address and numbers are one file’s', (r) => r.samples.every((s) => pairOk(r, s))],
      [`B is drawn within ${String(FACE_MS)} ms of its file`, (r) => r.samples.filter((s) => s.at > r.bLandedAt + FACE_MS && s.at < r.aAgainAt).every((s) => s.login === `Login: ${r.B}`)],
      [`A is drawn again within ${String(FACE_MS)} ms of its file`, (r) => r.samples.filter((s) => s.at > r.aAgainAt + FACE_MS).every((s) => s.login === `Login: ${r.A}`)],
      ['the last writer’s last numbers are drawn', (r) => r.finalFace === r.wantFinal && r.finalLogin === `Login: ${r.A}`]
    ]
  },
  SEARCH: {
    title: 'the address goes only where it may',
    needs: [
      ['every file of the world was read, and a byte that is there was found', (r) => r.files >= 20 && r.control === true && same(r.unread, [])],
      ['a copy of the manifest was dumped, this launch’s sessions in it', (r) => r.manifest?.dumped === true && r.manifest.control === true],
      ['the process table and this run’s environments were read', (r) => r.ps?.read === true && r.ps.control === true && r.env?.read === true && r.env.control === true && r.env.pids >= 2],
      ['the windows’ usage answers and pushes were recorded', (r) => r.ipc?.pushes >= 1 && r.ipc.answers >= 4]
    ],
    clauses: [
      ['on disk, only in a slot line’s "e"', (r) => r.hits.every((h) => h.slotE === true && SLOT_PATH.test(h.path))],
      ['both accounts are in their slot lines', (r) => ['A', 'B'].every((n) => r.hits.some((h) => h.label === n && h.slotE === true && SLOT_PATH.test(h.path)))],
      ['not in the manifest', (r) => same(r.manifest.hits, [])],
      ['not on any command line', (r) => same(r.ps.hits, [])],
      ['not in any environment', (r) => same(r.env.hits, [])],
      ['in the usage answers only as the Antigravity row’s email', (r) => same(r.ipc.other, []) && r.ipc.allowed >= 1],
      ['no Claude or Codex row carries an email', (r) => same(r.ipc.keyed, [])],
      ['usage:account answers the last writer', (r) => r.ipc.account === r.A && r.ipc.settingsAccount === r.A]
    ]
  },
  OLDER: {
    title: 'the parent reads HEAD’s slot and ignores the address; HEAD names it again',
    needs: [
      ['HEAD drew the account first, from a line holding it', (r) => r.head1?.login === `Login: ${r.A}` && String(r.head1.kept).includes(`"e":${J(r.A)}`)],
      // "No login line" is a reading only of a card that drew its numbers: a card read before it was drawn has none either.
      ['the parent was launched on that profile and its card read', (r) => Array.isArray(r.parent?.lines) && typeof r.parent.face === 'string' && numbered(r.parent.want) && numbered(cardFaceOf(r.parent.lines))],
      ['the live write landed while the parent was up', (r) => r.parent?.live?.landed === true && numbered(r.parent.live.want) && r.parent.live.want !== r.parent.want],
      ['the parent’s card was read after the live write', (r) => Array.isArray(r.parent?.live?.lines) && numbered(cardFaceOf(r.parent.live.lines))],
      ['the crash dumps were counted', (r) => Number.isInteger(r.parent?.dumpsNew)],
      ['HEAD’s card was read again', (r) => Array.isArray(r.head2?.lines)]
    ],
    clauses: [
      ['the parent draws the numbers', (r) => r.parent.face === r.parent.want],
      ['and no login line', (r) => loginOf(r.parent.lines) === null && !J(r.parent.lines).includes('@')],
      ['a line that lands under it is read too, and still no login line', (r) => r.parent.live.face === r.parent.live.want && loginOf(r.parent.live.lines) === null],
      ['no crash', (r) => r.parent.dumpsNew === 0 && r.parent.alive === true],
      ['HEAD again: Login: A', (r) => loginOf(r.head2.lines) === `Login: ${r.A}` && cardFaceOf(r.head2.lines) === r.parent.live.want]
    ]
  },
  NEWER: {
    title: 'HEAD reads the parent’s slot with no login line, then names the account at the next run',
    needs: [
      ['the parent wrote its own shape', (r) => /^\{"v":1,"h":"[0-9a-f]{64}","p":/.test(String(r.parent?.kept)) && typeof r.parent.salt === 'string'],
      ['HEAD drew the parent’s numbers first', (r) => numbered(r.head?.before?.face) && Array.isArray(r.head.before.lines)],
      ['the next run landed', (r) => r.head?.landed === true && Array.isArray(r.head.after?.lines)]
    ],
    clauses: [
      ['before the next run: no login line', (r) => loginOf(r.head.before.lines) === null],
      ['the script was rewritten at boot, keeping its salt', (r) => r.head.script.rewritten === true && r.head.script.salt === r.parent.salt],
      ['the next run names the account', (r) => r.head.keptAfter === r.parent.kept.replace(/^(\{"v":1,"h":"[0-9a-f]{64}",)/, `$1"e":${J(r.A)},`)],
      [`the card says Login: A within ${String(FACE_MS)} ms`, (r) => loginOf(r.head.after.lines) === `Login: ${r.A}` && r.head.afterMs <= FACE_MS],
      ['the numbers did not move', (r) => r.head.after.face === r.head.before.face]
    ]
  },
  STATUS: {
    title: 'a hundred status line runs never read as working, at HEAD as at the parent',
    needs: [
      ['the command line showed the flag, as a real agy’s does', (r) => BUILDS.every((b) => r[b]?.plain?.argvShown === true && r[b]?.setsid?.argvShown === true)],
      ['both flavours settled idle first', (r) => BUILDS.every((b) => r[b].plain.settled === true && r[b].setsid.settled === true)],
      ['a hundred runs each were logged', (r) => BUILDS.every((b) => r[b].plain.runs >= STATUS_RUNS && r[b].setsid.runs >= STATUS_RUNS)],
      ['the status was read throughout', (r) => BUILDS.every((b) => [r[b].plain, r[b].setsid].every((x) => x.samples >= 40 && Array.isArray(x.seen) && x.seen.length > 0))],
      ['a run was seen alive for longer than the app’s slowest look', (r) => BUILDS.every((b) => [r[b].plain, r[b].setsid].every((x) => x.held?.aliveMs >= HELD_AT_LEAST_MS && x.held.samples >= 4 && x.held.seen.length > 0))],
      ['the held run was of its own flavour', (r) => BUILDS.every((b) => r[b].plain.held.stat.length > 0 && r[b].setsid.held.stat.length > 0 && r[b].plain.held.stat.every((s) => !s.includes('s')) && r[b].setsid.held.stat.every((s) => s.includes('s')))]
    ],
    clauses: [
      ['plain: never working', (r) => !r.head.plain.seen.includes(WORKING) && !r.head.plain.held.seen.includes(WORKING)],
      ['a session of its own: never working', (r) => !r.head.setsid.seen.includes(WORKING) && !r.head.setsid.held.seen.includes(WORKING)],
      ['no worse than the parent', (r) => r.head.plain.working + r.head.plain.held.working + r.head.setsid.working + r.head.setsid.held.working <= r.parent.plain.working + r.parent.plain.held.working + r.parent.setsid.working + r.parent.setsid.held.working],
      ['every run exited 0', (r) => r.head.plain.nonZero === 0 && r.head.setsid.nonZero === 0]
    ]
  },
  RUN: {
    title: 'nothing but the stand-ins ran, nothing was asked, nothing was left',
    needs: [
      ['every launch was read', (r) => r.launches >= 1 && r.scans === r.launches],
      ['every launch came back from its own teardown', (r) => r.returned === r.launches || r.census !== 'no change'],
      ['the census was read around every launch that named its socket', (r) => r.socketed >= 1 && (r.censused === r.socketed || r.census !== 'no change')],
      ['the app’s sockets were sampled', (r) => r.socketSamples >= r.launches],
      ['the process table was read', (r) => r.tableRead === true]
    ],
    clauses: [
      ['the agents were hidden at every launch', (r) => r.agentsHeld === true],
      ['the usage fixture answered at every launch', (r) => r.fixtures === r.launches],
      ['no peer but this Mac', (r) => same(r.peers, [])],
      ['no census change', (r) => r.census === 'no change'],
      ['no process of this run is left', (r) => r.left === 0],
      ['no Electron of this run is left', (r) => r.electrons === 0],
      ['his shell history is unmoved', (r) => r.history === true]
    ]
  }
};

export function verdictOf(id, reading) {
  const g = GRADERS[id];
  if (g === undefined) return { state: 'unreadable', why: `no grader ${id}`, failed: [] };
  const ask = (f) => {
    try {
      return f(reading) === true;
    } catch {
      return false;
    }
  };
  const unmet = g.needs.filter(([, f]) => !ask(f)).map(([n]) => n);
  if (reading === null || reading === undefined || unmet.length > 0) return { state: 'unreadable', why: unmet.join('; ') || 'nothing was read', failed: unmet };
  const failed = g.clauses.filter(([, f]) => !ask(f)).map(([n]) => n);
  return { state: failed.length === 0 ? 'pass' : 'fail', why: '', failed };
}

// ---------------------------------------------------------------------------
// The grader self-test. It starts nothing.
// ---------------------------------------------------------------------------

export const GRADER_FIXTURES = join(ROOT, 'build', 'p375', 'fixtures', 'graders.json');
/** The probe review's fixtures: the integrator's recorded app run, and readings broken from it. */
export const RECORDED_FIXTURES = join(ROOT, 'build', 'p375', 'fixtures', 'recorded.json');

/** `set`/`del`/`push` a dotted path of a copied reading. */
export function applyOps(reading, ops) {
  const out = JSON.parse(J(reading));
  for (const op of ops) {
    const path = (op.set ?? op.del ?? op.push).split('.');
    let at = out;
    for (const k of path.slice(0, -1)) at = at[k];
    const last = path[path.length - 1];
    if (op.del !== undefined) delete at[last];
    else if (op.push !== undefined) at[last].push(op.to);
    else at[last] = op.to;
  }
  return out;
}
function graderSelfTest() {
  const fx = JSON.parse(readFileSync(GRADER_FIXTURES, 'utf8'));
  let bad = 0;
  let clauses = 0;
  const check = (ok, what) => {
    if (!ok) {
      bad += 1;
      process.stdout.write(`[p375] FAIL ${what}\n`);
    }
  };
  // THE REPOSITORY IS PUBLIC: every address the committed fixtures hold is one invented under example.invalid.
  for (const m of readFileSync(GRADER_FIXTURES, 'utf8').matchAll(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g)) check(/@example\.(invalid|com)$/.test(m[0]), `the fixtures hold an address that is not invented: ${m[0].replace(/^.*@/, '…@')}`);
  for (const [id, g] of Object.entries(GRADERS)) {
    const f = fx[id];
    if (f === undefined) {
      check(false, `${id} has no fixture`);
      continue;
    }
    const honest = verdictOf(id, f.honest);
    check(honest.state === 'pass', `${id}: the honest reading ${honest.state} ${J(honest.failed)}`);
    check(verdictOf(id, null).state === 'unreadable', `${id}: no reading at all is unreadable`);
    const covered = new Set();
    for (const b of f.broken) {
      const v = verdictOf(id, applyOps(f.honest, b.ops));
      const want = g.needs.some(([n]) => n === b.name) ? 'unreadable' : 'fail';
      check(v.state === want && v.failed.includes(b.name), `${id}: "${b.name}" (${b.why ?? ''}) should read ${want}, read ${v.state} ${J(v.failed)}`);
      covered.add(b.name);
    }
    for (const [n] of [...g.needs, ...g.clauses]) {
      clauses += 1;
      check(covered.has(n), `${id}: nothing breaks "${n}"`);
    }
    for (const n of covered) check([...g.needs, ...g.clauses].some(([m]) => m === n), `${id}: a broken reading names "${n}", which is no clause`);
  }
  // The probe review's own fixtures: every grader over a reading the real app run recorded (its addresses' hex
  // invented again), which must pass, and the review's broken readings of it, each read as its need or clause says.
  let recorded = 0;
  check(existsSync(RECORDED_FIXTURES), 'the recorded fixtures are missing');
  if (existsSync(RECORDED_FIXTURES)) {
    const text = readFileSync(RECORDED_FIXTURES, 'utf8');
    for (const m of text.matchAll(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g)) check(/@example\.(invalid|com)$/.test(m[0]), `the recorded fixtures hold an address that is not invented: ${m[0].replace(/^.*@/, '…@')}`);
    const rx = JSON.parse(text);
    for (const [id, g] of Object.entries(GRADERS)) {
      const honest = rx.readings?.[id];
      if (honest === undefined) {
        check(false, `${id} has no recorded reading`);
        continue;
      }
      const v = verdictOf(id, honest);
      check(v.state === 'pass', `${id}: the recorded reading ${v.state} ${J(v.failed)} ${v.why}`);
      for (const b of rx.broken?.[id] ?? []) {
        recorded += 1;
        const got = verdictOf(id, applyOps(honest, b.ops));
        const want = g.needs.some(([n]) => n === b.name) ? 'unreadable' : g.clauses.some(([n]) => n === b.name) ? 'fail' : 'no such clause';
        check(want !== 'no such clause' && got.state === want && got.failed.includes(b.name), `${id} recorded: "${b.name}" (${b.why ?? ''}) should read ${want}, read ${got.state} ${J(got.failed)}`);
      }
    }
  }
  // This file's own readers, over plain values.
  const last = readRecording('launch').at(-1);
  const now = Date.now();
  check(faceOf(rebase(last, now), now) === '30% 5h · 37% wk', `the launch recording's last face reads ${faceOf(rebase(last, now), now)}`);
  check(cardFaceOf(['Antigravity', 'Gemini 30% 5h, Resets in 3h 2m', 'Gemini 37% wk, Resets in 4d 1h', 'Other models 0% 5h']) === '30% 5h · 37% wk', 'the card face reader');
  check(cardFaceOf(['Antigravity', 'Other models 30% 5h']) === '', 'the card face reader takes the second group');
  check(unclocked('Gemini 30% 5h, Resets in 3h 2m') === 'Gemini 30% 5h, Resets in ·' && unclocked('x Resets in 4d 1h') === 'x Resets in ·' && unclocked('Resets in 9m') === 'Resets in ·' && unclocked('Gemini 30% 5h') === 'Gemini 30% 5h', 'the countdown is the one thing left out');
  check(same(withLogin(['Antigravity', 'Example Tier', 'Gemini 1% 5h'], 'a@example.invalid'), ['Antigravity', 'Example Tier', 'Login: a@example.invalid', 'Gemini 1% 5h']) && same(withLogin(['Antigravity', 'Gemini 1% 5h'], 'a@example.invalid'), ['Antigravity', 'Login: a@example.invalid', 'Gemini 1% 5h']), 'the login line goes after the plan');
  const h = 'a'.repeat(64);
  check(withoutE(`{"v":1,"h":"${h}","e":"a@example.invalid","p":null,"q":{}}`) === `{"v":1,"h":"${h}","p":null,"q":{}}` && withoutE(`{"v":1,"h":"${h}","p":null}`) === null && withoutE(`{"v":1,"h":"${h}","e":null,"p":null}`) === `{"v":1,"h":"${h}","p":null}`, 'the e is the one thing a slot line search leaves out');
  check(withoutE(`{"v":1,"h":"${h}","e":"x","p":"a@example.invalid"}`)?.includes('a@example.invalid') === true, 'an address outside the e is still found');
  check(SLOT_PATH.test('/p/gmux/antigravity-usage/7d0f4e0a-0000-4000-8000-00000000a374.json') && SLOT_PATH.test('/p/gmux/antigravity-usage/7d0f4e0a-0000-4000-8000-00000000a374.json.42.tmp') && !SLOT_PATH.test('/p/gmux/antigravity-usage/status.sh') && !SLOT_PATH.test('/p/app.log'), 'the slot path');
  const snap = { providers: [{ provider: 'claude' }, { provider: 'antigravity', email: 'a@example.invalid' }] };
  check(same(ipcPlaces(snap, ['a@example.invalid'], 'snapshot'), { allowed: ['providers.1.email'], other: [], keyed: [] }), 'the row’s email is the place it may stand');
  check(same(ipcPlaces({ providers: [{ provider: 'claude', email: 'a@example.invalid' }, { provider: 'antigravity', plan: 'a@example.invalid' }] }, ['a@example.invalid'], 'snapshot'), { allowed: [], other: ['providers.0.email', 'providers.1.plan'], keyed: ['claude'] }), 'any other place is named');
  check(same(ipcPlaces('a@example.invalid', ['a@example.invalid'], 'account'), { allowed: ['(the answer)'], other: [], keyed: [] }), 'the account answer');
  process.stdout.write(bad === 0 ? `[p375] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} needs and clauses, each shown red on a broken reading of its own; ${String(recorded)} broken readings of the recorded run, each read right; the readers hold\n` : `[p375] grader self-test FAIL: ${String(bad)}\n`);
  return bad === 0;
}
if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
if (process.argv.includes('--list-graders')) {
  for (const [id, g] of Object.entries(GRADERS)) process.stdout.write(`${id}: ${g.title}\n${[...g.needs.map(([n]) => `  need   ${n}`), ...g.clauses.map(([n]) => `  clause ${n}`)].join('\n')}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The preflight and the refusals
// ---------------------------------------------------------------------------

const PARENT = (process.env['P375_PARENT_CHECKOUT'] ?? '').trim();
/** HEAD holds these; and an `out/` older than ANY shipping source is refused. */
const NEEDED = ['src/main/usage/service.ts', 'src/main/usage/ipc.ts', 'src/main/usage/antigravity/script.ts', 'src/main/usage/antigravity/folder.ts', 'src/main/usage/antigravity/receive.ts', 'src/renderer/app/UsageMeter.tsx', 'src/renderer/app/usage-copy.ts', 'src/renderer/settings/UsageGroup.tsx', 'src/renderer/settings/usage-copy.ts', 'src/shared/usage.ts', 'src/preload/usage.ts'];
/** The ABSOLUTE folders a checkout's resolver always searches, read from its own text; null when it cannot be found. */
export function absoluteScanDirsOf(text) {
  const at = String(text).indexOf('export function extraBinDirsFor(');
  if (at === -1) return null;
  const end = text.indexOf('\n}\n', at);
  return [...new Set([...text.slice(at, end === -1 ? undefined : end).matchAll(/'(\/[^']*)'/g)].map((m) => m[1]))];
}
function walk(dir, visit, skip = () => false) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const n of names) {
    const p = join(dir, n);
    if (skip(p)) continue;
    let st;
    try {
      st = lstatSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, visit, skip);
    else if (st.isFile()) visit(p);
  }
}
const textOr = (p) => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};
function preflightProblems() {
  const p = [];
  if (PARENT === '') p.push(`P375_PARENT_CHECKOUT is not set: it must name a BUILT ${SNAPSHOT}`);
  else {
    const at = resolve(PARENT);
    const bundle = join(at, 'out', 'main', 'index.js');
    if (!existsSync(bundle)) p.push(`${bundle} is missing: build the parent first`);
    else if (textOr(join(at, 'src', 'shared', 'usage.ts')).includes('usageAddress') || textOr(bundle).includes('usage:account')) p.push(`${at} already holds this phase, so it is no parent`);
    else if (!textOr(bundle).includes('stack_with_default')) p.push(`${at} does not hold Phase 374, so it is not ${SNAPSHOT}`);
  }
  const bundle = join(ROOT, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) p.push(`${bundle} is missing: npm run build first`);
  else {
    if (!textOr(bundle).includes('usage:account')) p.push(`${bundle} does not hold this phase: build first`);
    const gone = NEEDED.filter((s) => !existsSync(join(ROOT, s)));
    if (gone.length > 0) p.push(`${gone.join(', ')} is missing`);
    const newer = [];
    walk(join(ROOT, 'src'), (f) => {
      if (/\.(ts|tsx|css)$/.test(f) && !/__tests__|\.test\.tsx?$/.test(f) && statSync(f).mtimeMs > statSync(bundle).mtimeMs) newer.push(f.slice(ROOT.length + 1));
    });
    if (newer.length > 0) p.push(`out/ is older than ${newer.slice(0, 8).join(', ')}: build first`);
  }
  for (const f of [STANDIN_PATH, '/usr/bin/clang', '/usr/bin/sqlite3', '/usr/sbin/lsof', '/bin/ps']) if (!existsSync(f)) p.push(`${f} is missing`);
  return p;
}
if (process.argv.includes('--preflight')) {
  const p = preflightProblems();
  for (const x of p) process.stderr.write(`[p375] REFUSED. ${x}\n`);
  if (p.length === 0) process.stdout.write(`[p375] preflight PASS: the parent ${resolve(PARENT)} and out/ are built, the stand-in is here\n`);
  process.exit(p.length === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The run's own addresses, made up now, and the one rule for what it prints
// ---------------------------------------------------------------------------

const HEX_A = randomBytes(4).toString('hex');
let HEX_B = randomBytes(4).toString('hex');
while (HEX_B === HEX_A) HEX_B = randomBytes(4).toString('hex');
const A = `p375-${HEX_A}-a@example.invalid`;
const B = `p375-${HEX_B}-b@example.invalid`;
/** Everything this file prints or writes outside the run passes through here: neither address survives it. */
const redact = (text) => String(text).replaceAll(HEX_A, '<hexA>').replaceAll(HEX_B, '<hexB>');

const t0 = Date.now();
const say = (l) => console.log(redact(`[p375] ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`));
const refuse = (why) => {
  console.error(redact(`[p375] REFUSED. ${why}`));
  process.exit(2);
};
/** His shell history's size and modified time, under the ACCOUNT's home, and nothing else of it. */
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
if (!SOCKET.startsWith('gmux-p375')) refuse(`"${SOCKET}" is not a gmux-p375 harness socket: run me inside build/harness-socket.mjs`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR');
if (/^\/(private\/)?tmp\//.test(`${HARNESS_DIR}/`)) refuse('TMPDIR is /tmp: point it under /private/var/tmp');
{
  const p = preflightProblems();
  if (p.length > 0) refuse(p.join('; '));
}
const KEEP = (process.env['P375_KEEP'] ?? '') === '1';
const ARMS = new Set(((process.env['P375_ARMS'] ?? '').trim() || Object.keys(GRADERS).join(',')).split(',').map((x) => x.trim()));
ARMS.add('RUN');
{
  const odd = [...ARMS].filter((x) => GRADERS[x] === undefined);
  if (odd.length > 0) refuse(`no arm is called ${odd.join(', ')}`);
}
const on = (...ids) => ids.some((id) => ARMS.has(id));
const OUT = resolve((process.env['P375_OUT_DIR'] ?? '').trim() || join(ROOT, 'out', 'p375'));
const CHECKOUT = { parent: resolve(PARENT), head: ROOT };

mkdirSync(join(HARNESS_DIR, 'p375'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p375'));
/** ONE path for both builds' worlds, so an argv compares byte for byte. */
const W = join(RUN, 'w');
const HOME = join(W, 'h');
const PROFILE = join(W, 'p');
const PROJECT = join(W, 'alpha');
const BIN = join(HOME, '.local', 'bin');
const AGY = join(BIN, 'agy');
const TMP = join(W, 't');
const METER = join(PROFILE, 'gmux', 'antigravity-usage');
const LOGIN_PATH = `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
const APP_PATH = `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
const SYSTEM_DIRS = ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];
const HIDDEN = hiddenAgentsBesides(STAND_IN_ROWS);
let SI = join(RUN, 'si-none');

const report = { checkout: ROOT, parent: CHECKOUT.parent, load: [], arms: [], readings: {}, notes: [] };
const R = report.readings;
let failures = 0;
let unreadable = 0;
let agentsRefused = false;
const runFacts = { launches: 0, returned: 0, socketed: 0, censused: 0, scans: 0, agentsHeld: true, fixtures: 0, socketSamples: 0, peers: [], census: 'no change', tableRead: false, left: 0, electrons: 0, history: true };
const apps = new Set();
const note = (s) => {
  report.notes.push(redact(s));
  say(s);
};
async function step(label, body) {
  try {
    return await body();
  } catch (err) {
    note(`${label} stopped: ${String(err?.message ?? err).slice(0, 400)}`);
    return null;
  }
}
function finishArm(id) {
  const v = verdictOf(id, R[id] ?? null);
  report.arms.push({ id, state: v.state, failed: v.failed, why: v.why });
  if (v.state === 'fail') failures += 1;
  if (v.state === 'unreadable') unreadable += 1;
  say(`${v.state.toUpperCase()} ${id}: ${GRADERS[id].title}${v.state === 'fail' ? `; FAILED ${J(v.failed)}` : v.state === 'unreadable' ? `: ${v.why}` : ''}`);
}
const loadNow = () => loadavg().map((l) => l.toFixed(0)).join(' ');

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

const iso = (ms) => new Date(Date.now() + ms).toISOString();
function freshWorld(label) {
  if (existsSync(W)) renameSync(W, join(RUN, `w-${String(Date.now())}`));
  for (const d of [HOME, PROFILE, PROJECT, BIN, TMP, join(W, 'cc'), join(W, 'cx')]) mkdirSync(d, { recursive: true });
  SI = join(RUN, `si-${label}`);
  mkdirSync(SI, { recursive: true });
  writeFileSync(join(HOME, '.profile'), `PATH=${LOGIN_PATH}; export PATH; HISTFILE=/dev/null; PS1='x $ '\n`);
  writeFileSync(join(HOME, '.zshrc'), "PS1='x %# '\nHISTFILE=/dev/null\n");
  // The byte a search must find, so one that finds nothing is told from one that read nothing.
  writeFileSync(join(HOME, '.p375-control'), `${SEARCH_CONTROL}\n`);
  writeFileSync(join(W, 'cc', '.credentials.json'), J({ claudeAiOauth: { accessToken: 'P375SENTINELCLAUDE', subscriptionType: 'max', expiresAt: Date.now() + 3600e3 * 12 } }), { mode: 0o600 });
  writeFileSync(join(W, 'cx', 'auth.json'), J({ OPENAI_API_KEY: null, tokens: { access_token: 'P375SENTINELCODEX', account_id: 'acct' } }), { mode: 0o600 });
  writeFileSync(
    join(W, 'fx.json'),
    J({
      P375SENTINELCLAUDE: { status: 200, body: { five_hour: { utilization: 37, resets_at: iso(3 * 3600e3) }, seven_day: { utilization: 12, resets_at: iso(4 * 864e5) } } },
      P375SENTINELCODEX: { status: 200, body: { plan_type: 'pro', rate_limit: { primary_window: { limit_window_seconds: 604800, used_percent: 9, reset_after_seconds: 86400 }, secondary_window: { limit_window_seconds: 18000, used_percent: 41, reset_after_seconds: 3600 } } } }
    })
  );
  setVersion(SI, GOOD_VERSION);
  const b = buildAgy({ out: AGY, dir: SI, stamp: label });
  if (!b.ok) refuse(`the stand-in did not compile: ${b.said}`);
}
/** The application folder a launch opens: the checkout's own build, with a stand-in SpecStory, so nothing of either checkout is written. */
let appIs = '';
function appFolder(build) {
  const dir = join(RUN, 'app');
  if (appIs === build) return dir;
  if (existsSync(dir)) renameSync(dir, join(RUN, `app-was-${appIs}-${String(Date.now())}`));
  appIs = build;
  const from = CHECKOUT[build];
  mkdirSync(join(dir, 'build', 'vendor', 'specstory', 'bin'), { recursive: true });
  copyFileSync(join(from, 'package.json'), join(dir, 'package.json'));
  for (const n of ['out', 'resources', 'node_modules']) symlinkSync(join(from, n), join(dir, n));
  for (const n of readdirSync(join(from, 'build', 'vendor'))) if (n !== 'specstory') symlinkSync(join(from, 'build', 'vendor', n), join(dir, 'build', 'vendor', n));
  writeSpecstory(join(dir, 'build', 'vendor', 'specstory', 'bin', 'specstory'), join(RUN, 'specstory.log'));
  writeFileSync(join(dir, 'build', 'vendor', 'specstory', 'bin', 'specstory.json'), J({ version: '2.99.0' }));
  return dir;
}

// ---------------------------------------------------------------------------
// Processes, the manifest and the slot files, read by this file's own readers
// ---------------------------------------------------------------------------

function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  return String(r.stdout ?? '')
    .split('\n')
    .map((l) => /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(l))
    .filter((m) => m !== null)
    .map((m) => ({ pid: Number(m[1]), ppid: Number(m[2]), command: m[3] }));
}
/** This run's own stand-ins still alive, by the command line only they carry. */
const standInsAlive = () => processTable().filter((p) => p.command.includes(STANDIN_PATH) && p.command.includes(RUN));
function endStandIns() {
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    for (const p of standInsAlive()) {
      // Read again by pid right before the signal, never by pattern.
      const now = spawnSync('/bin/ps', ['-p', String(p.pid), '-o', 'command='], { encoding: 'utf8', timeout: 5_000 }).stdout ?? '';
      if (!now.includes(STANDIN_PATH) || !now.includes(RUN)) continue;
      try {
        process.kill(p.pid, signal);
      } catch {
        /* already gone */
      }
    }
    if (standInsAlive().length === 0) return;
    spawnSync('/bin/sleep', ['1']);
  }
}
/** Every pid under `root`, by the table's own parent links. */
function treeOf(table, root) {
  const mine = new Set([root]);
  for (let grown = true; grown; ) {
    grown = false;
    for (const p of table) if (mine.has(p.ppid) && !mine.has(p.pid)) {
      mine.add(p.pid);
      grown = true;
    }
  }
  return mine;
}
/** The app's own network peers, as lsof names them. */
function samplePeers(pid) {
  const table = processTable();
  const mine = [...treeOf(table, pid)].filter((x) => !table.find((p) => p.pid === x)?.command.includes(STANDIN_PATH));
  const r = spawnSync('/usr/sbin/lsof', ['-nP', '-a', '-i', '-p', mine.join(','), '-Fn'], { encoding: 'utf8', timeout: 15_000 });
  const lines = String(r.stdout ?? '').split('\n');
  // The app always holds one socket, its own debugging port; a list with none of it is no sample.
  if (lines.some((l) => l.startsWith('n'))) runFacts.socketSamples += 1;
  for (const l of lines) {
    if (!l.startsWith('n') || !l.includes('->')) continue;
    const peer = l.split('->')[1];
    if (!/^(127\.0\.0\.1|\[::1\]):/.test(peer) && !runFacts.peers.includes(peer)) runFacts.peers.push(peer);
  }
}
const tmuxBin = () => join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
/** The scratch server's own pid, or 0. Asked through the vendored client, on the harness socket alone. */
function serverPid() {
  const bin = existsSync(tmuxBin()) ? tmuxBin() : 'tmux';
  const r = spawnSync(bin, ['-L', SOCKET, 'display-message', '-p', '#{pid}'], { encoding: 'utf8', timeout: 10_000 });
  return r.status === 0 ? Number(String(r.stdout ?? '').trim()) || 0 : 0;
}
async function waitFor(test, ms, every = 200) {
  const started = Date.now();
  for (;;) {
    const v = await test();
    if (v) return v;
    if (Date.now() - started >= ms) return null;
    await sleep(every);
  }
}
let copies = 0;
/** A COPY of the manifest beside its WAL, under the run and outside the world; its folder, or null. */
function manifestCopy() {
  const db = join(PROFILE, 'gmux', 'manifest.db');
  if (!existsSync(db)) return null;
  copies += 1;
  const dir = join(RUN, 'copies', String(copies));
  mkdirSync(dir, { recursive: true });
  for (const s of ['', '-wal', '-shm']) if (existsSync(`${db}${s}`)) copyFileSync(`${db}${s}`, join(dir, `m.db${s}`));
  return dir;
}
/** One row's recorded argv and resume argv. */
function manifestRow(id) {
  const dir = manifestCopy();
  if (dir === null) return null;
  const r = spawnSync('/usr/bin/sqlite3', ['-json', join(dir, 'm.db'), `select argv, resume_argv, agent_session_id from sessions where id = '${id}';`], { encoding: 'utf8', timeout: 20_000 });
  try {
    const row = JSON.parse(r.stdout)[0];
    const parse = (t) => (t === null ? null : JSON.parse(t));
    return { argv: parse(row.argv), resume: parse(row.resume_argv) };
  } catch {
    return null;
  }
}
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const allRuns = () => hellos(SI).reduce((n, h) => n + runsOf(SI, h.pid).length, 0);
const meterFile = (id) => join(METER, `${id}.json`);
const keptOf = (id) => {
  try {
    return readFileSync(meterFile(id), 'utf8').trim();
  } catch {
    return null;
  }
};
const hashIn = (kept) => /^\{"v":1,"h":"([0-9a-f]{64})"/.exec(kept ?? '')?.[1] ?? null;
const saltIn = (text) => /^tt_k=([0-9a-f]{32})$/m.exec(String(text))?.[1] ?? null;
/** Crashpad's dumps under the profile, by name and nothing else. */
const dumps = () => {
  const out = [];
  walk(join(PROFILE, 'Crashpad'), (p) => {
    if (/\.dmp$/.test(p)) out.push(p);
  });
  return out;
};

// ---------------------------------------------------------------------------
// The app
// ---------------------------------------------------------------------------

const INHERITED = Object.fromEntries([...Object.keys(process.env).filter((n) => /^(?:CLAUDE|CODEX|GEMINI|ANTIGRAVITY|AGY|P374|P375|GMUX_USAGE_FIXTURE)/.test(n)), 'TERM_SESSION_ID', 'TERM_PROGRAM', 'NVM_BIN', 'BUN_INSTALL', 'SSH_AUTH_SOCK'].map((n) => [n, undefined]));
const LOAD = "(typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule))";

async function devtoolsList() {
  const port = Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
  return (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
}
async function attachMain(timeoutMs = 120_000) {
  const started = Date.now();
  let why = '';
  for (;;) {
    try {
      const picked = pickRendererTarget(await devtoolsList());
      why = picked.why ?? '';
      if (picked.target !== null) {
        const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
        if ((await cdpEval(cdp, "typeof window.__gmuxShotDrive === 'function' && typeof window.gmux === 'object'", 5_000)) === true) return cdp;
        cdp.close();
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}
async function attachSettings(timeoutMs = 30_000) {
  const started = Date.now();
  let why = 'not listed';
  for (;;) {
    try {
      const t = (await devtoolsList()).find((x) => x?.type === 'page' && String(x.url ?? '').includes('/settings/index.html') && typeof x.webSocketDebuggerUrl === 'string');
      if (t !== undefined) {
        const cdp = await wsConnect(t.webSocketDebuggerUrl);
        if ((await cdpEval(cdp, "typeof window.gmux === 'object' && document.querySelector('.set-nav') !== null", 5_000)) === true) return cdp;
        cdp.close();
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no Settings window: ${why}`);
    await sleep(300);
  }
}
async function attachInspector(handle) {
  for (let i = 0; i < 100; i += 1) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) return wsConnect(m[1]);
    await sleep(200);
  }
  throw new Error("main's inspector never appeared");
}

/** One launch. `keepServer`: its scratch server outlives the app, so a session reports into the next build's launch. */
async function launch(label, build, body, { keepServer = false } = {}) {
  const checkout = CHECKOUT[build];
  const scan = absoluteScanDirsOf(readFileSync(join(checkout, 'src', 'main', 'tmux', 'resolve.ts'), 'utf8'));
  const copiesOf = scan === null ? ['extraBinDirsFor not found'] : [...scan, ...SYSTEM_DIRS].filter((d) => {
    try {
      return readdirSync(d).includes('agy');
    } catch (err) {
      return err?.code !== 'ENOENT';
    }
  });
  const pre = copiesOf.length > 0 ? { ok: false, said: `an agy, or a folder that cannot be read, where the scan looks: ${copiesOf.join(', ')}` } : hiddenAgentsPrecheck({ checkout, prefix: 'p375', home: HOME, userPath: `${LOGIN_PATH}:${APP_PATH}`, standIns: STAND_IN_ROWS });
  if (!pre.ok) {
    runFacts.agentsHeld = false;
    agentsRefused = true;
    throw new Error(`${label}: ${pre.said}`);
  }
  writeHiddenAgents(PROFILE, 'p375', HIDDEN);
  report.load.push(`${label}: ${String(spawnSync('/usr/bin/uptime', [], { encoding: 'utf8' }).stdout ?? '').trim().replace(/^.*load averages?: /, 'load ')}`);
  runFacts.launches += 1;
  if (!keepServer) runFacts.socketed += 1;
  let bodyDone = false;
  try {
    const answer = await withElectron(
      {
        label,
        userDataDir: PROFILE,
        cwd: appFolder(build),
        program: 'app',
        tmuxSocket: keepServer ? null : SOCKET,
        args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
        env: withoutDevRenderer({
          ...INHERITED,
          HOME,
          ZDOTDIR: HOME,
          HISTFILE: '/dev/null',
          SHELL: '/bin/sh',
          TMPDIR: `${TMP}/`,
          PATH: APP_PATH,
          GMUX_TMUX_SOCKET: SOCKET,
          GMUX_PROBES: '1',
          GMUX_LOG_FILE: '1',
          GMUX_SPECSTORY_NO_CLOUD: '1',
          GMUX_SPECSTORY_HOME: HOME,
          GMUX_USAGE_FIXTURE: join(W, 'fx.json'),
          GMUX_HARNESS_DIR: HARNESS_DIR,
          CLAUDE_CONFIG_DIR: join(W, 'cc'),
          CODEX_HOME: join(W, 'cx')
        }),
        graceMs: 12_000,
        ceilingMs: 1_200_000
      },
      async (handle) => {
        const k = { build, handle, cdp: null, main: null, set: null };
        try {
          await handle.waitForLine(/usage fixture installed/, 60_000);
          runFacts.fixtures += 1;
          k.cdp = await attachMain();
          apps.add(handle.appPid());
          k.main = await attachInspector(handle);
          k.mev = async (expr) => {
            const r = await k.main.call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, 20_000);
            if (r.error || r.result?.exceptionDetails) throw new Error(`main refused ${J(r.error ?? r.result.exceptionDetails).slice(0, 200)}`);
            return r.result?.result?.value;
          };
          const focused = await k.mev(`(() => { const { BrowserWindow } = ${LOAD}('electron'); globalThis.__p375 = { focus: true }; const f = () => globalThis.__p375.focus; BrowserWindow.prototype.isFocused = f; for (const w of BrowserWindow.getAllWindows()) if (w.isFocused !== f) w.isFocused = f; return BrowserWindow.getAllWindows().length > 0 && BrowserWindow.getAllWindows().every((w) => w.isFocused()); })()`);
          if (focused !== true) throw new Error('main’s isFocused could not be answered from here');
          const list = JSON.parse(await cdpEval(k.cdp, AGENTS_LIST_EXPR, 120_000));
          const v = standInsOnlyVerdict(list, { standIns: STAND_IN_ROWS, under: RUN });
          runFacts.scans += 1;
          if (!v.ok || !list.some((a) => a.id === 'antigravity' && a.binPath !== null)) {
            runFacts.agentsHeld = false;
            agentsRefused = true;
            throw new Error(`agents:list: ${v.said}`);
          }
          await k.cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => null);
          samplePeers(handle.appPid());
          const value = await body(kit(k));
          samplePeers(handle.appPid());
          bodyDone = true;
          return value;
        } finally {
          if (k.set !== null) {
            try {
              await cdpEval(k.set, 'setTimeout(() => window.close(), 0) && true', 5_000);
            } catch {
              /* closing ends the target */
            }
            k.set.close();
          }
          k.main?.close();
          k.cdp?.close();
        }
      }
    );
    runFacts.returned += 1;
    if (!keepServer) runFacts.censused += 1;
    return answer;
  } catch (err) {
    // A body that had finished and a launch that still threw is its TEARDOWN speaking.
    const m = String(err?.message ?? err);
    if (bodyDone || / APPEARED on | WENT from /.test(m)) runFacts.census = m;
    throw err;
  }
}

const READ_METER = `(() => { const m=[...document.querySelectorAll('.usage-meter')].find((e)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0})??null; const rows=m===null?[]:[...m.querySelectorAll('.usage-row, .usage-mini-row')]; return rows.map(e=>({t:(e.querySelector('.usage-text')||{}).textContent??null,hidden:(e.querySelector('.usage-hidden')||{}).textContent??null})); })()`;
const CARD_OPEN = `(() => { const m=[...document.querySelectorAll('.usage-meter')].find((e)=>e.getBoundingClientRect().width>0); if(!m) return false; m.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'})); return true; })()`;
const CARD_CLOSE = `(() => { const m=[...document.querySelectorAll('.usage-meter')].find((e)=>e.getBoundingClientRect().width>0); if(m) m.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'})); return true; })()`;
const CARD_READ = `[...document.querySelectorAll('.usage-card-group')].map((g)=>({ lines:[...g.querySelectorAll('.usage-card-name, .usage-card-line')].map(x=>(x.textContent||'').trim()), controls:g.querySelectorAll('button, a, input, select, [role=button], [data-login-control]').length }))`;
const LOGIN_ROWS = `[...document.querySelectorAll('[data-logins]')].map((r)=>({ provider:r.getAttribute('data-logins'), label:((r.querySelector('.set-row-label')||{}).textContent||'').trim(), text:(r.textContent||'').trim(), caption:(()=>{const c=r.querySelector('[data-antigravity-account]'); return c===null?null:(c.textContent||'').trim();})(), controls:r.querySelectorAll('button, a, input, select, [role=button]').length }))`;
const RECORD_PUSHES = `(() => { if (window.__p375 === undefined) { window.__p375 = { pushes: [] }; window.gmux.usage.onChanged((s) => window.__p375.pushes.push(JSON.stringify(s))); } return true; })()`;

function kit(k) {
  const page = (expr, ms = 60_000) => cdpEval(k.cdp, expr, ms);
  k.page = page;
  k.bridge = async (expr, ms = 120_000, cdp = k.cdp) => JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, ms));
  k.drive = (s) => page(`window.__gmuxShotDrive(${J(s)}).then(() => true)`, 120_000);
  k.meter = () => page(READ_METER);
  /** The Antigravity row as DRAWN: its accessible text names it. */
  k.drawn = async () => (await k.meter()).find((r) => String(r.hidden ?? '').startsWith('Antigravity')) ?? null;
  k.face = async () => {
    const r = await k.drawn();
    return r === null ? null : (r.t ?? '');
  };
  k.switch = async (usage) => {
    const r = await k.bridge(`window.gmux.settingsSet({ usage: ${J({ claude: false, codex: false, antigravity: false, ...usage })} }).then(() => true)`);
    if (!r.ok) throw new Error(`the switch: ${r.error}`);
    await sleep(700);
  };
  k.allOn = async () => {
    await k.switch({ claude: true, codex: true, antigravity: true });
    await waitFor(async () => (await k.meter()).filter((r) => (r.hidden ?? '').includes('% 5h')).length >= 2, 25_000, 300);
  };
  /** The whole hover card: opened, read, closed. */
  k.card = async () => {
    await page(CARD_OPEN);
    await sleep(500);
    const g = await page(CARD_READ);
    // When the card was read, so a time measured to a card's drawing is not also the time this file takes to close it.
    k.readAt = Date.now();
    await page(CARD_CLOSE);
    await sleep(400);
    return g;
  };
  k.cardGroup = async (provider) => groupOf(await k.card(), provider);
  /** Settings, opened once a launch, on Agents, with a push recorder in it. */
  k.settings = async () => {
    if (k.set === null) {
      await page('window.gmux.openSettings().then(() => true)', 30_000);
      k.set = await attachSettings();
      await cdpEval(k.set, `(() => { const b = [...document.querySelectorAll('.set-nav-item')].find((x) => (x.textContent || '').trim() === 'Agents'); if (b) b.click(); return b !== undefined; })()`);
      await waitFor(async () => (await cdpEval(k.set, "document.querySelector('[data-usage-group]') !== null")) === true, 15_000);
      await cdpEval(k.set, RECORD_PUSHES);
    }
    await waitFor(async () => (await cdpEval(k.set, LOGIN_ROWS)).filter((r) => r.provider === 'claude' || r.provider === 'codex').length === 2, 15_000, 300);
    return cdpEval(k.set, LOGIN_ROWS);
  };
  k.list = async () => (await k.bridge('window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, status: s.status })))')).value ?? [];
  let n = 0;
  /** A session made the way a person makes one; how it was started, from the stand-in itself. */
  k.create = async (label, { extraArgs = [], wait = 25_000 } = {}) => {
    n += 1;
    const input = { name: `p375-${label}-${String(n)}`, projectPath: PROJECT, cwd: PROJECT, agent: 'antigravity', ...(extraArgs.length > 0 ? { extraArgs } : {}) };
    const got = await k.bridge(`window.gmux.sessions.create(${J(input)}).then((s) => s.id)`);
    if (!got.ok) throw new Error(`${input.name}: ${got.error}`);
    const hello = await waitFor(() => hellos(SI).find((h) => h.session === got.value) ?? null, wait, 150);
    if (hello === null) throw new Error(`${input.name}: the stand-in never said hello`);
    const row = manifestRow(got.value);
    return { id: got.value, hello, spawned: hello.argv ?? null, recorded: row?.argv ?? null, resume: row?.resume ?? null };
  };
  k.kill = (id) => k.bridge(`window.gmux.sessions.kill(${J(id)})`);
  k.done = (hello, seq, ms) => waitFor(() => {
    const s = stateOf(SI, hello.pid);
    return s !== null && s.seq >= seq && s.pending === 0 && s.inFlight === false && runsOf(SI, hello.pid).length >= s.runs ? s : null;
  }, ms, 100);
  /** Replay lines of a recording as one account, and wait for every run to end. */
  k.replay = async (hello, recording, { from, to, email, everyMs = 320 }) => {
    const seq = tell(SI, hello.pid, [{ op: 'replay', recording, from, to, everyMs, email }]);
    const lines = (to ?? readRecording(recording).length) - from + 1;
    return k.done(hello, seq, lines * everyMs + 15_000);
  };
  return k;
}

/** The face the last line of a replay draws, at now. */
const faceAt = (hello, recording, line) => faceOf(rebase(readRecording(recording)[line - 1], hello.origin), Date.now());
const tailAt = (hello, recording, line) => tailOf(rebase(readRecording(recording)[line - 1], hello.origin));

// ---------------------------------------------------------------------------
// The arms
// ---------------------------------------------------------------------------

let shells = 0;
async function opening(k) {
  await k.cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(600);
  await k.page(RECORD_PUSHES);
  await k.drive({ projectPath: PROJECT, orientation: 'right' });
  shells += 1;
  await k.drive({ projectPath: PROJECT, session: { agent: 'shell', name: `p375-shell-${String(shells)}` } });
  await sleep(800);
}

/** OFF: the switch off, the two other meters on; one create; one run asked; the card and Settings read. */
async function offReading(k) {
  await k.switch({ claude: true, codex: true });
  await waitFor(async () => (await k.meter()).filter((r) => (r.hidden ?? '').includes('% 5h')).length >= 2, 25_000, 300);
  const s = await k.create('off');
  const asked = (await k.replay(s.hello, 'launch', { from: FIRST.from, to: FIRST.from, email: A })) !== null;
  const out = { spawned: s.spawned, recorded: s.recorded, resume: s.resume, asked, runs: runsOf(SI, s.hello.pid).length, folder: existsSync(METER), groups: await k.card(), settings: await k.settings() };
  await k.kill(s.id);
  return out;
}

/** ON and CARD: the launch recording replayed whole as A; the slot line, the face, the card, the resting text. */
async function onReading(k) {
  await k.allOn();
  const s = await k.create('on');
  await k.replay(s.hello, 'launch', { from: 1, to: 42, email: A });
  const runs = runsOf(SI, s.hello.pid);
  const wantFace = faceAt(s.hello, 'launch', 42);
  await waitFor(async () => ((await k.face()) === wantFace ? true : null), FACE_MS + 6_000, 200);
  const kept = keptOf(s.id);
  const on = {
    pid: s.hello.pid,
    kept,
    hash: hashIn(kept),
    want: tailAt(s.hello, 'launch', 42),
    face: await k.face(),
    wantFace,
    runs: { sent: 42, logged: runs.length, codes: [...new Set(runs.map((x) => x.code))], nonZero: runs.filter((x) => x.code !== null && x.code !== 0).length, outBytes: runs.reduce((a, x) => a + x.out, 0), errBytes: runs.reduce((a, x) => a + x.err, 0), killedByNext: runs.filter((x) => x.killedByNext).length, errorBlocks: stateOf(SI, s.hello.pid)?.errorBlocks ?? -1, ms: { max: Math.max(...runs.map((x) => x.ms)), p50: runs.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(runs.length / 2)] } }
  };
  // PRINTED, NOT GRADED: a run that took longer than agy's overlap, so a stall of the machine can be placed.
  for (const x of runs.filter((y) => y.ms > 300 || y.killedByNext)) note(`ON ${k.build}: run ${String(x.n)} took ${String(x.ms)} ms${x.killedByNext ? ', ended by the next' : ''}, load ${loadNow()}`);
  // The slot line is read right after the card, so the address the card drew is held to the one the slot holds.
  const card = { groups: await k.card(), resting: (await k.drawn())?.hidden ?? null, kept: keptOf(s.id), want: wantFace };
  return { s, on, card };
}

/** TWO: A, then B in a second session, then A again, the card held open and sampled throughout. */
async function twoReading(k) {
  const a = await k.create('two-a');
  const b = await k.create('two-b');
  await k.replay(a.hello, 'launch', { ...FIRST, email: A });
  const aFaces = [...new Set([faceAt(a.hello, 'launch', FIRST.to), faceAt(a.hello, 'launch', SECOND.from)])];
  const resume = readRecording('resume');
  const bFaces = [...new Set(resume.filter((l) => l.payload.quota !== undefined).map((l) => faceOf(rebase(l, b.hello.origin), Date.now())))];
  const aFirst = (await waitFor(async () => {
    const g = await k.cardGroup('antigravity');
    return g !== null && cardFaceOf(g.lines) === aFaces[0] && loginOf(g.lines) === `Login: ${A}` ? true : null;
  }, FACE_MS + 6_000, 300)) === true;
  const samples = [];
  let sampling = true;
  await k.page(CARD_OPEN);
  await sleep(500);
  const pid = k.handle.appPid();
  const sampler = (async () => {
    while (sampling) {
      const g = groupOf(await k.page(CARD_READ), 'antigravity');
      samples.push({ at: Date.now(), pid: k.handle.appPid(), face: g === null ? '' : cardFaceOf(g.lines), login: g === null ? null : loginOf(g.lines) });
      await sleep(150);
    }
  })();
  let bLandedAt = 0;
  let aAgainAt = 0;
  try {
    await sleep(2_000);
    const bBefore = keptOf(b.id);
    const seqB = tell(SI, b.hello.pid, [{ op: 'replay', recording: 'resume', from: 1, everyMs: 330, email: B }]);
    await waitFor(() => {
      if (bLandedAt === 0 && keptOf(b.id) !== bBefore && hashIn(keptOf(b.id)) !== null) bLandedAt = Date.now();
      return bLandedAt > 0 ? true : null;
    }, 20_000, 50);
    await k.done(b.hello, seqB, 30_000);
    await sleep(FACE_MS + 2_000);
    const aBefore = keptOf(a.id);
    const seqA = tell(SI, a.hello.pid, [{ op: 'replay', recording: 'launch', from: SECOND.from, to: SECOND.from, everyMs: 320, email: A }]);
    await waitFor(() => {
      if (aAgainAt === 0 && keptOf(a.id) !== aBefore) aAgainAt = Date.now();
      return aAgainAt > 0 ? true : null;
    }, 20_000, 50);
    await k.done(a.hello, seqA, 15_000);
    await sleep(FACE_MS + 3_000);
  } finally {
    sampling = false;
    await sampler;
    await k.page(CARD_CLOSE);
  }
  const g = await k.cardGroup('antigravity');
  const out = { A, B, pid, aFaces, bFaces, aFirst, samples, bLandedAt, aAgainAt, finalFace: g === null ? null : cardFaceOf(g.lines), finalLogin: g === null ? null : loginOf(g.lines), wantFinal: faceAt(a.hello, 'launch', SECOND.from) };
  return { out, sessions: [a, b] };
}

/** SEARCH: the address in every place it could reach, with the app still up. */
async function searchReading(k) {
  const needles = [
    ['A', Buffer.from(A)],
    ['B', Buffer.from(B)],
    ['A local part', Buffer.from(`p375-${HEX_A}`)],
    ['B local part', Buffer.from(`p375-${HEX_B}`)],
    ['A base64', Buffer.from(Buffer.from(A).toString('base64').slice(0, 16))],
    ['B base64', Buffer.from(Buffer.from(B).toString('base64').slice(0, 16))],
    ['A UTF-16', Buffer.from(`p375-${HEX_A}`, 'utf16le')],
    ['B UTF-16', Buffer.from(`p375-${HEX_B}`, 'utf16le')]
  ];
  const labelOf = (n) => n.replace(/ .*$/, '');
  const hits = [];
  const unread = [];
  let files = 0;
  let control = false;
  walk(W, (p) => {
    let bytes;
    try {
      bytes = readFileSync(p);
    } catch (err) {
      if (err?.code !== 'ENOENT') unread.push(`${p.slice(W.length)}: ${String(err?.code)}`);
      return;
    }
    files += 1;
    if (bytes.includes(SEARCH_CONTROL)) control = true;
    const rel = p.slice(W.length);
    const left = SLOT_PATH.test(rel) ? withoutE(bytes.toString('utf8')) : null;
    for (const [n, x] of needles) if (bytes.includes(x)) hits.push({ path: rel, label: labelOf(n), form: n, slotE: left !== null && !Buffer.from(left).includes(x) });
  });
  // The manifest, as SQLite reads it: a dump of a COPY beside its WAL.
  const dir = manifestCopy();
  const dump = dir === null ? null : spawnSync('/usr/bin/sqlite3', [join(dir, 'm.db'), '.dump'], { encoding: 'utf8', timeout: 30_000, maxBuffer: 256 * 1024 * 1024 });
  const dumped = dump !== null && dump.status === 0 && String(dump.stdout).includes('CREATE TABLE');
  // The dump must hold this launch's own rows (TWO's sessions), so a copy that missed its WAL is told from one with no address in it.
  const manifest = { dumped, control: dumped && String(dump.stdout).includes('p375-two-a-'), hits: dumped ? needles.filter(([, x]) => Buffer.from(dump.stdout).includes(x)).map(([n]) => n) : [] };
  // Every command line on the machine, and the environments of this run's own processes.
  const psAll = spawnSync('/bin/ps', ['-Aww', '-o', 'command='], { encoding: 'utf8', timeout: 15_000, maxBuffer: 64 * 1024 * 1024 });
  const ps = { read: psAll.status === 0, control: String(psAll.stdout).includes('probe-p375.mjs'), hits: needles.filter(([, x]) => Buffer.from(String(psAll.stdout)).includes(x)).map(([n]) => n) };
  const table = processTable();
  const pids = [...new Set([...treeOf(table, k.handle.appPid()), ...(serverPid() > 0 ? treeOf(table, serverPid()) : [])])].filter((p) => p > 1);
  const envs = spawnSync('/bin/ps', ['-E', '-ww', '-p', pids.join(','), '-o', 'command='], { encoding: 'utf8', timeout: 15_000, maxBuffer: 64 * 1024 * 1024 });
  const env = { read: envs.status === 0, pids: pids.length, control: String(envs.stdout).includes(`HOME=${HOME}`), hits: needles.filter(([, x]) => Buffer.from(String(envs.stdout)).includes(x)).map(([n]) => n) };
  // Every usage answer and push the two windows saw, and one of each read now.
  const words = [A, B, `p375-${HEX_A}`, `p375-${HEX_B}`];
  const pushes = [...((await k.page('window.__p375 === undefined ? [] : window.__p375.pushes')) ?? []), ...(k.set === null ? [] : ((await cdpEval(k.set, 'window.__p375 === undefined ? [] : window.__p375.pushes')) ?? []))].map((t) => JSON.parse(t));
  const read = (await k.bridge('window.gmux.usage.read()')).value;
  const refresh = (await k.bridge('window.gmux.usage.refresh()')).value;
  const account = (await k.bridge('window.gmux.usage.account()')).value;
  const settingsAccount = k.set === null ? null : (await k.bridge('window.gmux.usage.account()', 60_000, k.set)).value;
  const ipc = { pushes: pushes.length, answers: 0, allowed: 0, other: [], keyed: [], account, settingsAccount };
  for (const [kind, name, v] of [...pushes.map((p, i) => ['snapshot', `push ${String(i)}`, p]), ['snapshot', 'read', read], ['snapshot', 'refresh', refresh], ['account', 'account', account], ['account', 'Settings account', settingsAccount]]) {
    if (v === null || v === undefined) continue;
    if (!name.startsWith('push')) ipc.answers += 1;
    const placed = ipcPlaces(v, words, kind);
    ipc.allowed += placed.allowed.length;
    ipc.other.push(...placed.other.map((p) => `${name}: ${p}`));
    ipc.keyed.push(...placed.keyed.map((p) => `${name}: ${p}`));
  }
  return { files, control, unread, hits, manifest, ps, env, ipc, A, B };
}

/** A hundred status line runs over an idle agy, and every status the session read meanwhile (probe:p374's reading). */
async function statusRuns(k, name, setsid) {
  // A real agy's command line holds its flags, and the app reads it; this session ends before the teardown does.
  writeFileSync(join(SI, 'keep-args'), '');
  const s = await k.create(`status-${name}`);
  rmSync(join(SI, 'keep-args'), { force: true });
  const commandLine = String(spawnSync('/bin/ps', ['-p', String(s.hello.pid), '-o', 'command='], { encoding: 'utf8', timeout: 5_000 }).stdout ?? '').trim();
  tell(SI, s.hello.pid, [{ op: 'modes', everyMs: 2_000 }]);
  const settled = await waitFor(async () => {
    for (let i = 0; i < 4; i += 1) {
      if ((await k.list()).find((x) => x.id === s.id)?.status !== 'idle') return null;
      await sleep(700);
    }
    return true;
  }, 60_000, 500);
  await k.page(`(() => { const w = (window.__p375s ??= {}); w[${J(s.id)}] = []; window.gmux.sessions.onStatusChanged((e) => { const id = e.sessionId ?? e.id; if (id === ${J(s.id)}) w[${J(s.id)}].push(String(e.status)); }); return true; })()`);
  const seq = tell(SI, s.hello.pid, [{ op: 'burst', count: STATUS_RUNS, everyMs: 300, setsid }]);
  const seen = new Set();
  let samples = 0;
  let working = 0;
  const until = Date.now() + STATUS_RUNS * 300 + 4_000;
  const look = async () => (await k.list()).find((x) => x.id === s.id)?.status;
  while (Date.now() < until) {
    const st = await look();
    if (st !== undefined) {
      seen.add(st);
      samples += 1;
      if (st === WORKING) working += 1;
    }
    await sleep(250);
  }
  await k.done(s.hello, seq, 15_000);
  const events = (await k.page(`window.__p375s[${J(s.id)}]`)) ?? [];
  for (const e of events) seen.add(e);
  const runs = runsOf(SI, s.hello.pid);
  // ONE RUN HELD ALIVE across the app's own looks, so what a look says of a run is a reading and not luck.
  const held = { aliveMs: 0, samples: 0, working: 0, seen: [], stat: [] };
  const heldSeen = new Set();
  const stats = new Set();
  const eventsBefore = events.length;
  const held0 = tell(SI, s.hello.pid, [{ op: 'hold', ms: HOLD_MS, setsid }]);
  const firstPid = await waitFor(() => {
    const st = stateOf(SI, s.hello.pid);
    return st !== null && st.seq >= held0 && st.pids?.length === 1 ? st.pids[0] : null;
  }, 3_000, 50);
  let from = 0;
  while (firstPid !== null) {
    const stat = String(spawnSync('/bin/ps', ['-p', String(firstPid), '-o', 'stat='], { encoding: 'utf8', timeout: 5_000 }).stdout ?? '').trim();
    if (stat === '' || stat.startsWith('Z')) break;
    const now = Date.now();
    if (from === 0) from = now;
    held.aliveMs = now - from;
    stats.add(stat);
    const st = await look();
    if (st !== undefined) {
      heldSeen.add(st);
      held.samples += 1;
      if (st === WORKING) held.working += 1;
    }
    await sleep(200);
    if (now - from > 10_000) break;
  }
  await k.done(s.hello, held0, 8_000);
  for (const e of ((await k.page(`window.__p375s[${J(s.id)}]`)) ?? []).slice(eventsBefore)) heldSeen.add(e);
  held.seen = [...heldSeen];
  held.stat = [...stats];
  await k.kill(s.id);
  return { argvShown: s.spawned.every((t) => commandLine.includes(t)), settled: settled === true, samples, working, held, seen: [...seen], runs: runs.length, nonZero: runs.filter((x) => x.code !== null && x.code !== 0).length };
}

/** P1 and H1: everything one launch of each build reads. */
async function firstLaunch(k) {
  await opening(k);
  const b = k.build;
  if (on('OFF')) await step(`OFF ${b}`, async () => {
    R.OFF[b] = await offReading(k);
  });
  let onS = null;
  if (on('ON', 'CARD', 'SETTINGS', 'TWO', 'SEARCH')) await step(`ON ${b}`, async () => {
    const got = await onReading(k);
    onS = got.s;
    R.ON[b] = got.on;
    R.CARD[b] = got.card;
  });
  if (on('SETTINGS')) await step(`SETTINGS ${b}`, async () => {
    R.SETTINGS.reported = R.SETTINGS.reported || (b === 'head' && typeof R.ON.head?.kept === 'string' && R.ON.head.kept.includes(`"e":${J(A)}`));
    if (b === 'head') await waitFor(async () => (rowOf(await k.settings(), 'antigravity') !== null ? true : null), FACE_MS + 4_000, 300);
    R.SETTINGS[`${b}On`] = await k.settings();
  });
  if (b === 'head' && on('TWO', 'SEARCH')) await step('TWO', async () => {
    const got = await twoReading(k);
    R.TWO = got.out;
    if (on('SEARCH')) await step('SEARCH', async () => {
      if (k.set === null) await k.settings();
      R.SEARCH = await searchReading(k);
    });
    for (const s of got.sessions) await k.kill(s.id);
  });
  if (onS !== null) await k.kill(onS.id);
  if (on('STATUS')) await step(`STATUS ${b}`, async () => {
    await k.allOn();
    R.STATUS[b] = { plain: await statusRuns(k, 'plain', false), setsid: await statusRuns(k, 'setsid', true) };
  });
  // Last, because off removes the folder every running session writes into.
  if (b === 'head' && on('SETTINGS')) await step('SETTINGS off', async () => {
    await k.switch({ claude: true, codex: true, antigravity: false });
    await waitFor(async () => (rowOf(await k.settings(), 'antigravity') === null ? true : null), 10_000, 300);
    R.SETTINGS.headOff = await k.settings();
  });
}

/** OLDER: HEAD writes A; the parent opens that profile; HEAD again. */
async function older() {
  freshWorld('older');
  const O = { A, head1: null, parent: null, head2: null };
  R.OLDER = O;
  const ids = {};
  await launch('p375-H2', 'head', async (k) => {
    await opening(k);
    await k.allOn();
    const s = await k.create('older');
    ids.s = s;
    await k.replay(s.hello, 'launch', { ...FIRST, email: A });
    const want = faceAt(s.hello, 'launch', FIRST.to);
    await waitFor(async () => ((await k.face()) === want ? true : null), FACE_MS + 6_000, 200);
    const g = await k.cardGroup('antigravity');
    O.head1 = { kept: keptOf(s.id), login: g === null ? null : loginOf(g.lines), lines: g?.lines ?? null };
  }, { keepServer: true });
  const had = dumps().length;
  await launch('p375-P2', 'parent', async (k) => {
    await opening(k);
    const want = faceAt(ids.s.hello, 'launch', FIRST.to);
    await waitFor(async () => ((await k.face()) === want ? true : null), 20_000, 200);
    const g = await k.cardGroup('antigravity');
    const parent = { want, face: await k.face(), lines: g?.lines ?? null };
    // One LIVE write of HEAD's script, under the parent: other numbers, the address beside them.
    const before = keptOf(ids.s.id);
    await k.replay(ids.s.hello, 'launch', { from: SECOND.from, to: SECOND.from, email: A });
    const liveWant = faceAt(ids.s.hello, 'launch', SECOND.from);
    const landed = keptOf(ids.s.id) !== before && String(keptOf(ids.s.id)).includes(`"e":${J(A)}`);
    await waitFor(async () => ((await k.face()) === liveWant ? true : null), FACE_MS + 6_000, 200);
    const g2 = await k.cardGroup('antigravity');
    parent.live = { landed, want: liveWant, face: await k.face(), lines: g2?.lines ?? null };
    parent.alive = alive(k.handle.appPid());
    O.parent = parent;
  }, { keepServer: true });
  if (O.parent !== null) O.parent.dumpsNew = dumps().length - had;
  await launch('p375-H3', 'head', async (k) => {
    await opening(k);
    const want = faceAt(ids.s.hello, 'launch', SECOND.from);
    const from = Date.now();
    await waitFor(async () => {
      const g = await k.cardGroup('antigravity');
      return g !== null && loginOf(g.lines) === `Login: ${A}` && cardFaceOf(g.lines) === want ? true : null;
    }, 20_000, 300);
    const g = await k.cardGroup('antigravity');
    O.head2 = { lines: g?.lines ?? null, ms: Date.now() - from };
    await k.kill(ids.s.id);
  });
}

/** NEWER: the parent's script writes A's numbers with no address; HEAD rewrites the script at boot; the next run names A. */
async function newer() {
  freshWorld('newer');
  const N = { A, parent: null, head: null };
  R.NEWER = N;
  const ids = {};
  await launch('p375-P3', 'parent', async (k) => {
    await opening(k);
    await k.allOn();
    const s = await k.create('newer');
    ids.s = s;
    await k.replay(s.hello, 'launch', { ...FIRST, email: A });
    N.parent = { kept: keptOf(s.id), salt: saltIn(textOr(join(METER, 'status.sh'))), script: textOr(join(METER, 'status.sh')) };
  }, { keepServer: true });
  await launch('p375-H4', 'head', async (k) => {
    await opening(k);
    const want = faceAt(ids.s.hello, 'launch', FIRST.to);
    await waitFor(async () => ((await k.face()) === want ? true : null), 20_000, 200);
    const g = await k.cardGroup('antigravity');
    const script = textOr(join(METER, 'status.sh'));
    const head = { before: { face: await k.face(), lines: g?.lines ?? null }, script: { rewritten: script !== '' && script !== N.parent?.script, salt: saltIn(script) } };
    // The next run: the same numbers, so the address alone is what makes the line move.
    const before = keptOf(ids.s.id);
    await k.replay(ids.s.hello, 'launch', { from: FIRST.to, to: FIRST.to, email: A });
    head.keptAfter = keptOf(ids.s.id);
    head.landed = head.keptAfter !== before;
    const landedAt = Date.now();
    await waitFor(async () => {
      const x = await k.cardGroup('antigravity');
      return x !== null && loginOf(x.lines) === `Login: ${A}` ? true : null;
    }, FACE_MS + 6_000, 200);
    // To the read that first saw the line, not to the end of that read's close (about 0.5 s of this file's own).
    head.afterMs = (k.readAt ?? Date.now()) - landedAt;
    head.afterDoneMs = Date.now() - landedAt;
    const g2 = await k.cardGroup('antigravity');
    head.after = { face: g2 === null ? null : cardFaceOf(g2.lines), lines: g2?.lines ?? null };
    head.before.face = g === null ? head.before.face : cardFaceOf(g.lines);
    N.head = head;
    delete N.parent.script;
    await k.kill(ids.s.id);
  });
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let fatal = null;
try {
  for (const id of ['OFF', 'ON', 'CARD', 'STATUS']) R[id] = {};
  R.SETTINGS = { A, reported: false };
  R.CARD.A = A;
  R.ON.A = A;
  if (on('OFF', 'ON', 'CARD', 'SETTINGS', 'TWO', 'SEARCH', 'STATUS')) {
    freshWorld('parent');
    await launch('p375-P1', 'parent', firstLaunch);
    endStandIns();
    freshWorld('head');
    await launch('p375-H1', 'head', firstLaunch);
    endStandIns();
  }
  if (on('OLDER')) {
    await step('OLDER', older);
    endStandIns();
  }
  if (on('NEWER')) {
    await step('NEWER', newer);
    endStandIns();
  }
} catch (err) {
  fatal = String(err?.stack ?? err?.message ?? err);
  note(`THE RUN STOPPED: ${fatal.slice(0, 600)}`);
} finally {
  endStandIns();
  const table = processTable();
  runFacts.tableRead = table.some((p) => p.pid === process.pid);
  // The stand-ins, and any `sh` still running Tortie's own line.
  runFacts.left = table.filter((p) => (p.command.includes(STANDIN_PATH) && p.command.includes(RUN)) || p.command.includes(METER)).length;
  runFacts.electrons = table.filter((p) => p.command.includes(`--user-data-dir=${PROFILE}`)).length + [...apps].filter((p) => p > 0 && alive(p)).length;
  if (historyStat() !== HISTORY_BEFORE) {
    note(`his shell history moved (${HISTORY_BEFORE} to ${historyStat()}); starting nothing for ${String(HISTORY_QUIET_MS)} ms`);
    const moved = historyStat();
    await sleep(HISTORY_QUIET_MS);
    runFacts.history = false;
    if (historyStat() !== moved) note('it moved again while nothing of this run was running');
  }
  R.RUN = runFacts;
  for (const id of Object.keys(GRADERS)) if (ARMS.has(id)) finishArm(id);
  mkdirSync(OUT, { recursive: true });
  report.history = { before: HISTORY_BEFORE, after: historyStat() };
  report.fatal = fatal === null ? null : redact(fatal);
  writeFileSync(join(OUT, 'probe-p375.json'), `${redact(JSON.stringify(report, null, 1)).replaceAll(RUN, '<run>')}\n`, { mode: 0o600 });
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}

say(`report ${join(OUT, 'probe-p375.json')}; ${report.load.join('; ')}`);
say(`${String(report.arms.filter((a) => a.state === 'pass').length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
process.exit(agentsRefused ? 2 : failures > 0 ? 1 : unreadable > 0 || fatal !== null ? 2 : 0);
