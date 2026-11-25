#!/usr/bin/env node
/**
 * probe:p374 — THE PHASE 374 APP RUN (build/p374/SPEC.md §8): the Antigravity
 * row, its flag, its script and its folder, driven in the real app against a
 * stand-in `agy`, the parent first.
 *
 *   node build/harness-socket.mjs --fresh gmux-p374 'node build/p374/probe-p374.mjs'
 *
 * ONE ELECTRON AT A TIME, every launch through build/electron-run.mjs's
 * `withElectron` with `program: 'app'`, on a scratch profile, HOME and ZDOTDIR
 * (`HISTFILE=/dev/null`, `SHELL=/bin/sh`, no TERM_SESSION_ID) and the socket
 * build/harness-socket.mjs hands this file. Every launch names it as its
 * `tmuxSocket`, so the helper reads his session names once before and once
 * after, READ ONLY (his allowance of 2 November 2026), and ends the scratch
 * server; the exceptions are LIFE's first two launches, whose scratch server has
 * to outlive the app, and its last names the socket and ends it. That census
 * is the one read of his server anything here makes, and this file names that
 * server nowhere.
 *
 * NO AGENT RUNS AND NOTHING OF AN ACCOUNT IS READ. `agy` is
 * build/p374/stand-in.mjs behind a launcher compiled here, under its bare name
 * on a closed PATH. Every other probed row is hidden
 * (`hiddenAgentsBesides(['antigravity'])`), the precheck holds that list to the
 * checkout's own registry, the folders the app's scan always searches are
 * refused if they hold an `agy`, and the app's own `agents:list` must say
 * nothing resolved but the stand-in, under this run. A launch that cannot say
 * so is refused, exit 2. SpecStory is a stand-in too, in an application folder
 * of this run's own (`appFolder`): links to the checkout's `out`, `resources`,
 * `node_modules` and bundled tmux, and nothing of either checkout is written.
 * agy's settings file is a fixture under the scratch HOME. The two other
 * meters read the usage fixture (`GMUX_USAGE_FIXTURE`), so no request can be
 * made, and the app's sockets are sampled: a peer that is not 127.0.0.1 fails
 * RUN. No key, no keychain (`--use-mock-keychain`), no screenshot.
 *
 * THE APP'S WINDOW NEVER TAKES HIS KEYBOARD FOR A READING. Main reads the
 * folder only while a window is in front, and he works at this Mac while this
 * runs, so main's `isFocused` is answered from here through its own inspector,
 * which is how the arm also shows that a window BEHIND reads nothing. The
 * inspector is let go before every quit.
 *
 * THE LAUNCHES
 *   P1 parent   creates, the FIFO's time, the two row rectangles
 *   P2 parent   restore, resume in place, Restart
 *   H1 head     the same with the switch OFF; then ON: CAP, FLOOR, ASIDE,
 *               GUARD, ON, STATUS, RECT, ACCT
 *   H2 head     the same restores with the switch OFF, then TYPED with it ON
 *   H3 to H5    LIFE: report, close, reopen; close, age, reopen
 *
 * THE ARMS, each graded on the stand-in's own log of the argv it was started
 * with and of every run, on the probe's own read of the manifest (a COPY beside
 * its WAL) and of the pane, and on the drawn page, never on what the app says
 * of itself:
 *   OFF    every spawned and recorded argv and every typed line, switch off,
 *          byte for byte the parent's; nothing under the folder; no run
 *   ON     spliced straight after the name; the row's argv the parent's; every
 *          run exit 0 with no output and no error block; the face on the
 *          recording's LAST numbers within 6 s; the second group on the card;
 *          no login line; nothing read while the window is behind
 *   FLOOR  1.4.9, unread, replaced since the scan (that session none, the next
 *          one, exactly one `--version` more), a wrapper script, a bare name
 *          that resolves elsewhere
 *   ASIDE  his own `--settings` in three spellings and `--gemini_dir`; seven
 *          shapes of his settings file, and the FIFO's create no slower than
 *          the parent's
 *   CAP    a captured session carries none, and the row says so
 *   GUARD  one dead session, one log line, the next create plain and alive, a
 *          changed file spliced again
 *   TYPED  restore, resume in place and Restart with the switch ON
 *   STATUS 100 runs at 300 ms over an idle agy, both flavours, never working.
 *          A run lives about 12 ms and the app looks every 1 or 2 s, so
 *          whether a poll meets one of the hundred is CHANCE. Each flavour is
 *          therefore ALSO read with one run HELD ALIVE for longer than the
 *          slowest look, seen alive by this file's own `ps`; without that
 *          the arm is UNREADABLE and never a pass. The second flavour leads a
 *          session of its own, which Tortie's status reading counts as a tool
 *          for as long as a run lives, so with a run held it reads working
 *          every time. The same two readings of a person's own status line at
 *          the parent are printed beside it
 *   ACCT   signed out, then in as another: never a mixture, never the first
 *          again, and no byte of either address anywhere but as a slot
 *          line's "e" (Phase 375 moved this on purpose, build/p375/SPEC.md D17)
 *   LIFE   the app closed while the sessions report, reopened on the last
 *          number with its age; a removed session, the boot sweep, off
 *   RECT   three rows: the first two where the parent draws them
 *   RUN    agents, the fixture, no peer, no flag in any store, nothing left,
 *          his history unmoved
 *
 * WHERE THIS FILE READS SPEC §8 OTHERWISE, STATED
 *   1. The stand-in is a compiled launcher and not a bash wrapper, because D6
 *      refuses a script (build/p374/stand-in.mjs says so). The wrapper is the
 *      FLOOR arm's refused file.
 *   2. The stale age is drawn at a relaunch over a file aged while the app was
 *      closed, because a held reading is replaced only by a newer one (D18).
 *   3. "Within the parent's time" is the parent's own FIFO create plus
 *      {@link FIFO_MARGIN_MS}, because two creates of one build differ by more
 *      than nothing.
 *
 *   P374_PARENT_CHECKOUT=<a BUILT 6ebc22e6>   required, else exit 2
 *   P374_ARMS=ON,ACCT     only these (RUN is always read; OFF, TYPED and RECT
 *                         keep the parent's launches)
 *   P374_KEEP=1           keep the scratch world
 *   P374_OUT_DIR=<dir>    where the report goes (default out/p374)
 *   node build/p374/probe-p374.mjs --grader-self-test   every grader over build/p374/fixtures/graders.json; starts nothing
 *   node build/p374/probe-p374.mjs --list-graders       the clauses; starts nothing
 *   node build/p374/probe-p374.mjs --preflight          what a run needs; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ. A missing reading is UNREADABLE, never a pass.
 *
 * VERIFIERS ONLY: it starts Electrons. Take the lock.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync, chmodSync, lstatSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { loadavg, userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, hiddenAgentsPrecheck, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { OTHER, PERSON, drawnOf, readRecording, rebase, tailOf } from './make-fixtures.mjs';
import { GOOD_VERSION, STANDIN_PATH, buildAgy, hellos, runsOf, setVersion, settingsValues, stateOf, tell, versionCalls, writeScriptAgy, writeSpecstory } from './stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// What the app is held against, BY VALUE, never imported from src/
// ---------------------------------------------------------------------------

export const SNAPSHOT = '6ebc22e6';
export const STAND_IN_ROWS = Object.freeze(['antigravity']);
/** Main looks every 5 s; the arm allows one look and a second. */
export const FACE_MS = 6_000;
export const FIFO_MARGIN_MS = 1_500;
export const STATUS_RUNS = 100;
/** A run held alive, under agy's own 5 s, and how much of it this file must have seen: longer than the app's slowest look (2 s apart). */
export const HOLD_MS = 4_400;
export const HELD_AT_LEAST_MS = 3_000;
/** A byte string that stands in every world, so a search that finds nothing can be told from one that read nothing. */
export const SEARCH_CONTROL = 'P374SENTINELCODEX';
export const WORKING = 'running';
export const HISTORY_QUIET_MS = 180_000;
export const WORDS = Object.freeze({
  session: 'Shows after a new Antigravity session starts.',
  version: 'Needs Antigravity CLI 1.4.10 or later.',
  captured: 'A session SpecStory captures does not report its plan.',
  'own-status-line': 'Your own Antigravity status line or settings are in use.'
});

/** `30% 5h · 37% wk`, this file's own reading of the meter's two windows. */
export function faceOf(payload, now) {
  const d = drawnOf(payload, now);
  const part = (w, label) => (w === null ? null : `${String(Math.round(w.used))}% ${label}`);
  return [part(d.fiveHour, '5h'), part(d.sevenDay, 'wk')].filter((x) => x !== null).join(' · ');
}
/** The card's second group, this file's own reading: each window's number alone. */
export function secondOf(payload, now) {
  const d = drawnOf(payload, now).second;
  return [d.fiveHour === null ? null : `Other models ${String(Math.round(d.fiveHour.used))}% 5h`, d.sevenDay === null ? null : `Other models ${String(Math.round(d.sevenDay.used))}% wk`].filter((x) => x !== null);
}

/** What is wrong with a spliced argv, `[]` when it is D3 and D4's own: the flag straight after the name and the JSON holding one key of three. */
export function spliceProblems(argv, scriptUnder) {
  const out = [];
  if (!Array.isArray(argv)) return ['no argv'];
  if (argv[0] !== '--settings') out.push(`the first word is ${J(argv[0])}`);
  if (settingsValues(argv).length !== 1) out.push(`${String(settingsValues(argv).length)} --settings`);
  let o = null;
  try {
    o = JSON.parse(argv[1]);
  } catch {
    out.push('the value is not JSON');
  }
  if (o !== null) {
    if (J(Object.keys(o)) !== '["statusLine"]') out.push(`top level keys ${J(Object.keys(o))}`);
    if (J(Object.keys(o.statusLine ?? {}).sort()) !== '["command","stack_with_default","type"]') out.push(`statusLine keys ${J(Object.keys(o.statusLine ?? {}))}`);
    if (o.statusLine?.type !== 'command' || o.statusLine?.stack_with_default !== true) out.push('type or stack_with_default');
    if (scriptUnder !== null && !String(o.statusLine?.command ?? '').includes(scriptUnder)) out.push('the command names no script of Tortie’s folder');
  }
  return out;
}

/** Where Phase 375 lets an address stand on disk: a slot line or its unrenamed write, relative to the world, and only as its `"e"`. */
export const SLOT_PATH = /^\/p\/gmux\/antigravity-usage\/[0-9a-f-]{36}\.json(?:\.\d+\.tmp)?$/;
const SLOT_HEAD = /^(\{"v":1,"h":"[0-9a-f]{64}",)"e":("[^"\\]*"|null),/;

// ---------------------------------------------------------------------------
// The graders. Each is `{ title, needs, clauses }` over one plain reading.
// A need that does not hold is UNREADABLE; a clause that does not is a FAIL.
// ---------------------------------------------------------------------------

const same = (a, b) => J(a) === J(b);
const OFF_PATHS = ['create', 'extras', 'captured'];
const PLACES = ['full', 'full160', 'mini', 'strip1440', 'strip960'];
const numbered = (t) => /% 5h/.test(String(t));
/** The conversations the stand-ins are given, so a resume argv is compared under a known id. */
export const CONV = Object.freeze({ one: '10000000-0000-4000-8000-000000000001', two: '10000000-0000-4000-8000-000000000002', three: '10000000-0000-4000-8000-000000000003', four: '10000000-0000-4000-8000-000000000004', five: '10000000-0000-4000-8000-000000000005' });

export const GRADERS = {
  OFF: {
    title: 'with the switch off every argv, typed line and file is the parent’s',
    needs: [
      ['both builds created all three sessions and the stand-in said how each was started', (r) => ['parent', 'head'].every((b) => OFF_PATHS.every((p) => Array.isArray(r[b]?.creates?.[p]?.spawned) && Array.isArray(r[b]?.creates?.[p]?.recorded)))],
      ['both builds learned the two conversations, so each resume argv is a reading', (r) => ['parent', 'head'].every((b) => r[b].creates.create.conversation === CONV.one && r[b].creates.extras.conversation === CONV.two && Array.isArray(r[b].creates.create.resume) && Array.isArray(r[b].creates.extras.resume))],
      ['both builds captured the third inside the stand-in SpecStory', (r) => ['parent', 'head'].every((b) => String(r[b].creates.captured.recorded[0]).endsWith('/specstory') && r[b].creates.captured.recorded.includes('-c'))],
      ['every session with the switch off was asked to run a line', (r) => r.head.creates.asked === OFF_PATHS.length],
      ['both restored programs said how they were started', (r) => ['parent', 'head'].every((b) => Array.isArray(r[b]?.lines?.restore?.ran))],
      ['both builds typed a restore and a resume in place and started a Restart', (r) => ['parent', 'head'].every((b) => typeof r[b]?.lines?.restore?.armed === 'string' && typeof r[b]?.lines?.resumeInPlace?.line === 'string' && Array.isArray(r[b]?.lines?.restart?.spawned))],
      ['the stand-in’s runs and the folder were read', (r) => Number.isInteger(r.head?.runs) && typeof r.head?.folder === 'boolean']
    ],
    clauses: [
      ...OFF_PATHS.map((p) => [`${p}: spawned as the parent spawned it`, (r) => same(r.head.creates[p].spawned, r.parent.creates[p].spawned)]),
      ...OFF_PATHS.map((p) => [`${p}: recorded as the parent recorded it`, (r) => same(r.head.creates[p].recorded, r.parent.creates[p].recorded) && same(r.head.creates[p].resume, r.parent.creates[p].resume)]),
      ['the restore types the parent’s line', (r) => r.head.lines.restore.armed === r.parent.lines.restore.armed && r.head.lines.restore.drawn === true && r.parent.lines.restore.drawn === true],
      ['the restored program starts as the parent’s', (r) => same(r.head.lines.restore.ran, r.parent.lines.restore.ran)],
      ['the resume in place types the parent’s line', (r) => r.head.lines.resumeInPlace.line === r.parent.lines.resumeInPlace.line],
      ['the Restart starts as the parent starts it', (r) => same(r.head.lines.restart.spawned, r.parent.lines.restart.spawned)],
      ['no argv holds --settings', (r) => OFF_PATHS.every((p) => settingsValues(r.head.creates[p].spawned).length === 0 && !J([r.head.creates[p].recorded, r.head.creates[p].resume]).includes('--settings'))],
      ['the folder was never made', (r) => r.head.folder === false],
      ['no status line run', (r) => r.head.runs === 0]
    ]
  },
  ON: {
    title: 'a new session reports and the row draws the last numbers',
    needs: [
      ['the session started and said hello', (r) => Array.isArray(r.spawned)],
      ['the parent’s create, its row and this row were read', (r) => Array.isArray(r.parentSpawned) && Array.isArray(r.parentRecorded) && Array.isArray(r.parentResume) && Array.isArray(r.recorded)],
      ['this session’s conversation was learned, so its resume argv is a reading', (r) => r.conversation === CONV.five && Array.isArray(r.resume)],
      ['what the pane was started with was read', (r) => typeof r.startLine === 'string' && r.startLine.length > 0],
      ['every replayed run was logged', (r) => Number.isInteger(r.runs?.sent) && r.runs.sent >= 42 && r.runs.logged === r.runs.sent],
      ['the face and the card were read, and there is a number to want', (r) => typeof r.face === 'string' && Array.isArray(r.card) && numbered(r.wantFace) && r.wantSecond?.length === 2 && typeof r.lastTail === 'string'],
      ['the numbers the timed run moved were drawn first', (r) => r.moved?.sawFirst === true && r.moved.first !== r.moved.then],
      ['the window behind was held for longer than two looks', (r) => r.behind?.heldMs >= 10_000],
      ['a new file landed while it was behind, with other numbers', (r) => r.behind.wrote === true && numbered(r.behind.wantThen) && r.behind.wantThen !== r.behind.faceBefore]
    ],
    clauses: [
      ['the flag is straight after the name and holds one key of three', (r) => same(r.splice, [])],
      ['the rest of the argv is the parent’s', (r) => same(r.spawned.slice(2), r.parentSpawned)],
      ['a plain create is one line for the person’s own shell, as the parent’s one word is', (r) => /^"?agy --settings '\{/.test(r.startLine)],
      ['the row is recorded as the parent records it', (r) => same(r.recorded, r.parentRecorded) && !J(r.recorded).includes('--settings')],
      ['it resumes by the parent’s argv', (r) => same(r.resume, r.parentResume) && !J(r.resume).includes('--settings')],
      ['every run exits 0', (r) => same(r.runs.codes, [0]) && r.runs.nonZero === 0],
      ['no run wrote a byte', (r) => r.runs.outBytes === 0 && r.runs.errBytes === 0],
      ['no error block', (r) => r.runs.errorBlocks === 0],
      ['no run over the 300 ms overlap', (r) => r.runs.killedByNext === 0],
      ['the kept file is the last payload’s', (r) => r.keptTail === r.lastTail],
      ['the face draws the last numbers', (r) => r.face === r.wantFace],
      ['the card draws the same two, each with its reset', (r) => r.wantFace.split(' · ').every((w) => r.card.some((l) => l.startsWith(`Gemini ${w}, Resets in `)))],
      [`within ${String(FACE_MS)} ms`, (r) => r.faceMs <= FACE_MS],
      ['a full bucket draws no reset and the card has the second group', (r) => r.wantSecond.every((w) => r.card.some((l) => l.startsWith(w))) && !r.card.some((l) => l.startsWith('Other models 0%') && l.includes('Resets'))],
      ['the card has no login line and no Choose login for this row', (r) => r.loginControls === 0 && !r.card.some((l) => /^Login:|Choose login/.test(l))],
      ['the second group is not on the face', (r) => !r.face.includes('Other models')],
      ['a window behind moved nothing', (r) => r.behind.faceBefore === r.behind.faceAfter && r.behind.faceThen === r.behind.wantThen]
    ]
  },
  FLOOR: {
    title: 'the flag needs a reading of the very file that runs',
    needs: [
      ['every create was started and said hello', (r) => ['old', 'unread', 'control', 'replaced', 'next', 'script', 'elsewhere'].every((k) => Array.isArray(r[k]?.spawned))],
      ['every re-scan read the version the arm planted', (r) => r.old.scan === '1.4.9' && r.unread.scan === 'no version here' && ['control', 'script', 'elsewhere'].every((k) => r[k].scan === GOOD_VERSION)],
      ['the bare name resolved elsewhere', (r) => r.elsewhere.flavour === 'elsewhere']
    ],
    clauses: [
      ['below the floor: none', (r) => settingsValues(r.old.spawned).length === 0 && r.old.alive === true],
      ['below the floor: the words', (r) => r.old.words === WORDS.version],
      ['unread: none', (r) => settingsValues(r.unread.spawned).length === 0],
      ['at the floor: spliced', (r) => same(r.control.splice, [])],
      ['replaced since the scan: none', (r) => settingsValues(r.replaced.spawned).length === 0 && r.replaced.alive === true],
      ['the replaced file is read exactly once more', (r) => r.replaced.versionsMore === 1],
      ['the session after it: spliced', (r) => same(r.next.splice, [])],
      ['a wrapper script: none', (r) => settingsValues(r.script.spawned).length === 0],
      ['a bare name that resolves elsewhere: none', (r) => settingsValues(r.elsewhere.spawned).length === 0]
    ]
  },
  ASIDE: {
    title: 'Tortie stands aside for a person’s own settings',
    needs: [
      ['every create was started and said hello', (r) => [...Object.values(r.flags ?? {}), ...Object.values(r.files ?? {})].every((x) => Array.isArray(x?.spawned)) && Object.keys(r.flags ?? {}).length === 4 && Object.keys(r.files ?? {}).length === 7],
      ['both builds timed the FIFO create', (r) => r.fifo?.parentMs > 0 && r.fifo?.headMs > 0]
    ],
    clauses: [
      ['his own flag in every spelling is the only one', (r) => Object.values(r.flags).every((x) => same(x.spawned, x.asked))],
      ['his own flag: the words', (r) => r.flags.two.words === WORDS['own-status-line']],
      ['a status line of his own: none', (r) => settingsValues(r.files.own.spawned).length === 0],
      ['switched off by him: spliced', (r) => same(r.files.disabled.splice, [])],
      ['no status line in the file: spliced', (r) => same(r.files.without.splice, [])],
      ['unreadable: none', (r) => settingsValues(r.files.unreadable.spawned).length === 0],
      ['huge: none', (r) => settingsValues(r.files.huge.spawned).length === 0],
      ['not JSON: none', (r) => settingsValues(r.files.broken.spawned).length === 0],
      ['a FIFO: none', (r) => settingsValues(r.files.fifo.spawned).length === 0],
      ['a FIFO makes the create no slower', (r) => r.fifo.headMs <= r.fifo.parentMs + FIFO_MARGIN_MS]
    ]
  },
  CAP: {
    title: 'a captured session carries no flag, and the row says so',
    needs: [
      ['the captured session said hello', (r) => Array.isArray(r.spawned)],
      ['it ran inside the stand-in SpecStory', (r) => r.wrapped === true],
      ['the row and the parent’s row were read', (r) => Array.isArray(r.recorded) && Array.isArray(r.parentRecorded)],
      ['the words were read before and after', (r) => typeof r.before === 'string' && typeof r.words === 'string']
    ],
    clauses: [
      ['no flag', (r) => settingsValues(r.spawned).length === 0],
      ['recorded as the parent records it', (r) => same(r.recorded, r.parentRecorded)],
      ['the row waits with its own words first', (r) => r.before === WORDS.session],
      ['then the captured words', (r) => r.words === WORDS.captured]
    ]
  },
  GUARD: {
    title: 'a bad start turns the flag off for that file',
    needs: [
      ['the first session was spliced and ended with exit 1', (r) => same(r.first?.splice, []) && r.first?.ended === true],
      ['the log was read', (r) => Number.isInteger(r.logLines) && r.logBytes > 0]
    ],
    clauses: [
      ['one log line', (r) => r.logLines === 1],
      ['the row says it', (r) => r.waitingFor === 'start-failed' && /^A new Antigravity session ended at once/.test(String(r.words))],
      ['the next create is plain', (r) => Array.isArray(r.second?.spawned) && settingsValues(r.second.spawned).length === 0],
      ['and alive', (r) => r.second.alive === true],
      ['a changed file is spliced again', (r) => same(r.third?.splice, []) && r.third?.alive === true]
    ]
  },
  TYPED: {
    title: 'with the switch on, a typed line is the parent’s and a Restart reports',
    needs: [
      ['the switch was on and all three paths were driven', (r) => r.switchOn === true && typeof r.head?.restore?.armed === 'string' && typeof r.head?.resumeInPlace?.line === 'string' && Array.isArray(r.head?.restart?.spawned)],
      ['the resumed program said how it was started', (r) => Array.isArray(r.head?.restore?.ran)],
      ['the parent’s three were read', (r) => typeof r.parent?.restore?.armed === 'string' && typeof r.parent?.resumeInPlace?.line === 'string' && Array.isArray(r.parent?.restart?.spawned)]
    ],
    clauses: [
      ['the restore types the parent’s line', (r) => r.head.restore.armed === r.parent.restore.armed && r.head.restore.drawn === true],
      ['the resumed program got no flag', (r) => Array.isArray(r.head.restore.ran) && settingsValues(r.head.restore.ran).length === 0],
      ['the resume in place types the parent’s line', (r) => r.head.resumeInPlace.line === r.parent.resumeInPlace.line],
      ['no --settings on any pane', (r) => r.head.paneSettings === 0],
      ['the Restart is spliced and the rest is the parent’s', (r) => same(r.head.restart.splice, []) && same(r.head.restart.spawned.slice(2), r.parent.restart.spawned)]
    ]
  },
  STATUS: {
    title: 'a hundred status line runs never read as working',
    needs: [
      ['the command line showed the flag, as a real agy’s does', (r) => r.plain?.argvShown === true && r.setsid?.argvShown === true],
      ['both flavours settled idle first', (r) => r.plain?.settled === true && r.setsid?.settled === true],
      ['a hundred runs each were logged', (r) => r.plain?.runs >= STATUS_RUNS && r.setsid?.runs >= STATUS_RUNS],
      ['nearly all of them ended by themselves', (r) => [r.plain, r.setsid].every((x) => x?.zero >= STATUS_RUNS * 0.9)],
      ['the status was read throughout', (r) => [r.plain, r.setsid].every((x) => x?.samples >= 40 && Array.isArray(x?.seen) && x.seen.length > 0)],
      ['a run was seen alive for longer than the app’s slowest look', (r) => [r.plain, r.setsid].every((x) => x?.held?.aliveMs >= HELD_AT_LEAST_MS && x.held.samples >= 4 && Array.isArray(x.held.seen) && x.held.seen.length > 0)],
      ['the held run was of its own flavour', (r) => r.plain.held.stat.length > 0 && r.setsid.held.stat.length > 0 && r.plain.held.stat.every((s) => !s.includes('s')) && r.setsid.held.stat.every((s) => s.includes('s'))]
    ],
    clauses: [
      ['plain: never working', (r) => !r.plain.seen.includes(WORKING)],
      ['plain: not with a run held alive either', (r) => !r.plain.held.seen.includes(WORKING)],
      ['a session of its own: never working', (r) => !r.setsid.seen.includes(WORKING)],
      ['a session of its own: not with a run held alive either', (r) => !r.setsid.held.seen.includes(WORKING)],
      ['every run exited 0', (r) => r.plain.nonZero === 0 && r.setsid.nonZero === 0]
    ]
  },
  ACCT: {
    title: 'two accounts are never mixed and no address lands anywhere',
    needs: [
      ['the first account was drawn, the second reported', (r) => r.firstDrawn === true && r.secondFileAt > 0],
      ['the two accounts draw different numbers', (r) => r.firstFaces?.length > 0 && r.secondFaces?.length > 0 && [...r.firstFaces, ...r.secondFaces].every(numbered) && r.firstFaces.every((f) => !r.secondFaces.includes(f))],
      ['the first account’s file was read', (r) => typeof r.firstKept === 'string' && r.firstKept.length > 70],
      ['the signed out run ran to its end, over numbers the file does not hold', (r) => r.signedOut?.runs === 1 && r.signedOut.code === 0 && r.signedOut.moved === true],
      ['the face was sampled throughout', (r) => Array.isArray(r.samples) && r.samples.length >= 20],
      ['and after the second account’s time was up', (r) => r.samples.some((s) => s.at > r.secondFileAt + FACE_MS)],
      ['the bytes were searched, every file of them, and a byte that is there was found', (r) => r.searched >= 5 && r.searchedControl === true && same(r.unread, [])]
    ],
    clauses: [
      ['signed out wrote nothing', (r) => r.signedOutSame === true],
      ['every drawn pair is one account’s', (r) => r.samples.every((s) => r.firstFaces.includes(s.face) || r.secondFaces.includes(s.face))],
      ['never the first again', (r) => {
        const i = r.samples.findIndex((s) => r.secondFaces.includes(s.face));
        return i !== -1 && r.samples.slice(i).every((s) => r.secondFaces.includes(s.face));
      }],
      [`the first is gone within ${String(FACE_MS)} ms of the second's first file`, (r) => r.samples.filter((s) => s.at > r.secondFileAt + FACE_MS).every((s) => r.secondFaces.includes(s.face))],
      ['the second’s last numbers are drawn', (r) => r.finalFace === r.wantFinal],
      ['no address byte in any file but a slot line’s "e"', (r) => r.hits.every((h) => h !== null && typeof h === 'object' && h.slotE === true && SLOT_PATH.test(String(h.path)))],
      ['the two hashes differ', (r) => typeof r.hashes?.[0] === 'string' && typeof r.hashes?.[1] === 'string' && r.hashes[0] !== r.hashes[1]]
    ]
  },
  LIFE: {
    title: 'the last number survives the app, and its files go when they should',
    needs: [
      ['the session went on reporting while the app was closed', (r) => r.closed?.runs >= 10 && r.closed.zero >= 10 && r.closed?.appGone === true],
      ['the reopened face was read', (r) => typeof r.reopened?.face === 'string'],
      ['it is not the number the app last drew', (r) => numbered(r.reopened.want) && numbered(r.reopened.before) && r.reopened.before !== r.reopened.want],
      ['the swept files were planted, the orphan with numbers of its own', (r) => r.sweep?.planted === 4 && numbered(r.sweep.orphanFace) && r.sweep.orphanFace !== r.reopened.want],
      ['the aged file was read at a relaunch', (r) => typeof r.aged?.face === 'string' && Array.isArray(r.aged?.card)],
      ['the removed session had a file, and Remove was taken', (r) => r.removed?.had === true && r.removed.taken === true],
      ['a spliced session was running its line when the switch went off', (r) => r.off?.spliced === true && r.off.hadFile === true]
    ],
    clauses: [
      ['reopened on the last number', (r) => r.reopened.face === r.reopened.want],
      ['with the file’s own time', (r) => Math.abs(r.reopened.readAt - r.reopened.fileAt) <= 1_500],
      ['every run while closed exited 0 and said nothing', (r) => r.closed.nonZero === 0 && r.closed.bytes === 0],
      ['an old reading says its age', (r) => r.aged.state === 'stale' && r.aged.card.some((l) => /^Last reported 4[2-4]m ago$/.test(l)) && !r.aged.card.includes('Last read failed')],
      ['the boot sweep takes what no row owns', (r) => r.sweep.orphanGone === true && r.sweep.tmpGone === true],
      ['and nothing of it was drawn', (r) => r.sweep.orphanFaceSeen === false],
      ['a stranger’s file and the live session’s stay', (r) => r.sweep.strangerStays === true && r.sweep.ownStays === true],
      ['a removed session’s file goes', (r) => r.removed.fileGone === true],
      ['off removes exactly its own', (r) => same(r.off.left, ['notes.txt'])],
      ['off draws no row', (r) => r.off.rows === 0],
      ['a session still running after off exits 0 and says nothing', (r) => r.off.runs >= 1 && r.off.zero === r.off.runs && r.off.nonZero === 0 && r.off.bytes === 0]
    ]
  },
  RECT: {
    title: 'three rows: the first two where the parent draws them',
    needs: [
      ['both builds read two rows in all three placements', (r) => ['parent', 'head2'].every((b) => ['full', 'full160', 'mini'].every((p) => r[b]?.[p]?.rows?.length === 2))],
      ['three rows were read in all three', (r) => ['full', 'full160', 'mini'].every((p) => r.head3?.[p]?.rows?.length === 3)],
      ['the strip was read', (r) => ['parent', 'head2', 'head3'].every((b) => ['strip1440', 'strip960'].every((p) => typeof r[b]?.[p]?.cls === 'string' && r[b][p].rows?.length === (b === 'head3' ? 3 : 2)))],
      ['every reading is of a page that had stopped moving', (r) => ['parent', 'head2', 'head3'].every((b) => PLACES.every((p) => r[b][p].still === true))],
      ['every row had been laid out, and a drawn one held its numbers', (r) => ['parent', 'head2', 'head3'].every((b) => PLACES.every((p) => r[b][p].rows.every((x) => x.r[2] > 0 && x.r[3] > 0 && x.bar !== null && x.bar[2] > 0 && (isMini(r[b][p]) || (numbered(x.t) && x.tr?.[2] > 0)))))],
      ['each placement is the one it is called, at one width of the dock', (r) => ['parent', 'head2', 'head3'].every((b) => !isMini(r[b].full) && !isMini(r[b].full160) && isMini(r[b].mini) && r[b].dock160 === 160 && r[b].dockWidth >= 200 && r[b].dockWidth === r.parent.dockWidth)]
    ],
    clauses: [
      ...PLACES.map((p) => [`${p}: two rows are the parent’s, every rectangle and word`, (r) => same(r.head2[p], r.parent[p])]),
      ...['full', 'full160', 'mini'].map((p) => [`${p}: the first two of three keep their left, width, height, bar and words`, (r) => [0, 1].every((i) => same(slimRow(r.head3[p].rows[i]), slimRow(r.parent[p].rows[i])))]),
      ...['full', 'full160', 'mini'].map((p) => [`${p}: the third row is in step with them`, (r) => r.head3[p].rows[2].r[0] === r.head3[p].rows[0].r[0] && Math.abs(r.head3[p].rows[2].r[1] - r.head3[p].rows[1].r[1] - (r.head3[p].rows[1].r[1] - r.head3[p].rows[0].r[1])) < 0.1])
    ]
  },
  RUN: {
    title: 'nothing but the stand-ins ran, nothing was asked, nothing was left',
    needs: [
      ['every launch was read', (r) => r.launches >= 1 && r.scans === r.launches],
      ['every launch came back from its own teardown', (r) => r.returned === r.launches || r.census !== 'no change'],
      ['the census was read around every launch that named its socket', (r) => r.socketed >= 1 && (r.censused === r.socketed || r.census !== 'no change')],
      ['the app’s sockets were sampled', (r) => r.socketSamples >= r.launches],
      ['the process table was read', (r) => r.tableRead === true],
      ['the stores of every world were searched, and a byte that is there was found', (r) => r.searched >= 20 && r.worlds >= 1 && r.searchedWorlds === r.worlds && same(r.unread, [])]
    ],
    clauses: [
      ['the agents were hidden at every launch', (r) => r.agentsHeld === true],
      ['the usage fixture answered at every launch', (r) => r.fixtures === r.launches],
      ['no peer but this Mac', (r) => same(r.peers, [])],
      ['the flag is in no store, log or backup', (r) => same(r.flagHits, [])],
      ['no census change', (r) => r.census === 'no change'],
      ['no process of this run is left', (r) => r.left === 0],
      ['no Electron of this run is left', (r) => r.electrons === 0],
      ['his shell history is unmoved', (r) => r.history === true]
    ]
  }
};
/** A rail or a narrow strip, whose rows are bars with no words. */
function isMini(reading) {
  return /\busage-mini\b/.test(String(reading?.cls));
}
function slimRow(row) {
  return { left: row.r[0], width: row.r[2], height: row.r[3], bar: row.bar === null ? null : [row.bar[2], row.bar[3]], text: row.t, textWidth: row.tr === null ? null : row.tr[2] };
}

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

export const GRADER_FIXTURES = join(ROOT, 'build', 'p374', 'fixtures', 'graders.json');

/** `set`/`del` a dotted path of a copied reading. */
export function applyOps(reading, ops) {
  const out = JSON.parse(J(reading));
  for (const op of ops) {
    const path = (op.set ?? op.del).split('.');
    let at = out;
    for (const k of path.slice(0, -1)) at = at[k];
    if (op.del !== undefined) delete at[path[path.length - 1]];
    else at[path[path.length - 1]] = op.to;
  }
  return out;
}
function graderSelfTest() {
  const fx = JSON.parse(readFileSync(GRADER_FIXTURES, 'utf8'));
  let bad = 0;
  let clauses = 0;
  const say = (ok, what) => {
    if (!ok) {
      bad += 1;
      process.stdout.write(`[p374] FAIL ${what}\n`);
    }
  };
  for (const [id, g] of Object.entries(GRADERS)) {
    const f = fx[id];
    if (f === undefined) {
      say(false, `${id} has no fixture`);
      continue;
    }
    const honest = verdictOf(id, f.honest);
    say(honest.state === 'pass', `${id}: the honest reading ${honest.state} ${J(honest.failed)}`);
    say(verdictOf(id, null).state === 'unreadable', `${id}: no reading at all is unreadable`);
    const covered = new Set();
    for (const b of f.broken) {
      const v = verdictOf(id, applyOps(f.honest, b.ops));
      const want = g.needs.some(([n]) => n === b.name) ? 'unreadable' : 'fail';
      say(v.state === want && v.failed.includes(b.name), `${id}: "${b.name}" should read ${want}, read ${v.state} ${J(v.failed)}`);
      covered.add(b.name);
    }
    for (const [n] of [...g.needs, ...g.clauses]) {
      clauses += 1;
      say(covered.has(n), `${id}: nothing breaks "${n}"`);
    }
    for (const n of covered) say([...g.needs, ...g.clauses].some(([m]) => m === n), `${id}: a broken reading names "${n}", which is no clause`);
  }
  // This file's own reading of a face, over the committed recording: the numbers the arms hold the app to.
  const last = readRecording('launch').at(-1);
  const now = Date.now();
  say(faceOf(rebase(last, now), now) === '30% 5h · 37% wk', `the launch recording's last face reads ${faceOf(rebase(last, now), now)}`);
  say(spliceProblems(['--settings', J({ statusLine: { type: 'command', command: '/x/status.sh', stack_with_default: true } })], '/x/').length === 0, 'an honest splice has no problem');
  for (const broken of [['x'], ['--settings', '{'], ['--settings', J({ statusLine: { type: 'command', command: '/x/', stack_with_default: true }, more: 1 })], ['--settings', J({ statusLine: { type: 'command', command: '/x/', stack_with_default: true, k: 1 } })], ['--settings', J({ statusLine: { type: 'command', command: '/y/', stack_with_default: true } })], ['--settings', J({ statusLine: { type: 'command', command: '/x/', stack_with_default: false } })]]) say(spliceProblems(broken, '/x/').length > 0, `a broken splice passes: ${J(broken)}`);
  process.stdout.write(bad === 0 ? `[p374] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} needs and clauses, each shown red on a broken reading of its own\n` : `[p374] grader self-test FAIL: ${String(bad)}\n`);
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

const PARENT = (process.env['P374_PARENT_CHECKOUT'] ?? '').trim();
/** HEAD holds these; and an `out/` older than ANY shipping source is refused. */
const NEEDED = ['src/main/usage/service.ts', 'src/main/usage/ipc.ts', 'src/main/usage/providers.ts', 'src/main/usage/antigravity/script.ts', 'src/main/usage/antigravity/folder.ts', 'src/main/usage/antigravity/launch.ts', 'src/main/usage/antigravity/receive.ts', 'src/main/usage/antigravity/own-status-line.ts', 'src/main/agents/detection.ts', 'src/main/sessions/create-local.ts', 'src/main/sessions/core.ts', 'src/renderer/app/UsageMeter.tsx', 'src/renderer/app/usage-copy.ts', 'src/renderer/settings/UsageGroup.tsx', 'src/shared/usage.ts', 'src/shared/settings.ts'];
/** The ABSOLUTE folders a checkout's resolver always searches, read from its own text; null when it cannot be found. */
export function absoluteScanDirsOf(text) {
  const at = String(text).indexOf('export function extraBinDirsFor(');
  if (at === -1) return null;
  const end = text.indexOf('\n}\n', at);
  return [...new Set([...text.slice(at, end === -1 ? undefined : end).matchAll(/'(\/[^']*)'/g)].map((m) => m[1]))];
}
function preflightProblems() {
  const p = [];
  if (PARENT === '') p.push(`P374_PARENT_CHECKOUT is not set: it must name a BUILT ${SNAPSHOT}`);
  else if (!existsSync(join(resolve(PARENT), 'out', 'main', 'index.js'))) p.push(`${resolve(PARENT)}/out/main/index.js is missing: build the parent first`);
  else if (existsSync(join(resolve(PARENT), 'src', 'main', 'usage', 'providers.ts')) || readFileSync(join(resolve(PARENT), 'out', 'main', 'index.js'), 'utf8').includes('stack_with_default')) p.push(`${resolve(PARENT)} already holds this phase, so it is no parent`);
  const bundle = join(ROOT, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) p.push(`${bundle} is missing: npm run build first`);
  else {
    if (!readFileSync(bundle, 'utf8').includes('stack_with_default')) p.push(`${bundle} does not hold this phase: build first`);
    const gone = NEEDED.filter((s) => !existsSync(join(ROOT, s)));
    if (gone.length > 0) p.push(`${gone.join(', ')} is missing`);
    const newer = [];
    walk(join(ROOT, 'src'), (f) => {
      if (/\.(ts|tsx|css)$/.test(f) && !/__tests__|\.test\.tsx?$/.test(f) && statSync(f).mtimeMs > statSync(bundle).mtimeMs) newer.push(f.slice(ROOT.length + 1));
    });
    if (newer.length > 0) p.push(`out/ is older than ${newer.slice(0, 8).join(', ')}: build first`);
  }
  for (const f of [STANDIN_PATH, '/usr/bin/clang', '/usr/bin/sqlite3', '/usr/bin/mkfifo', '/usr/sbin/lsof', '/bin/ps']) if (!existsSync(f)) p.push(`${f} is missing`);
  return p;
}
if (process.argv.includes('--preflight')) {
  const p = preflightProblems();
  for (const x of p) process.stderr.write(`[p374] REFUSED. ${x}\n`);
  if (p.length === 0) process.stdout.write(`[p374] preflight PASS: the parent ${resolve(PARENT)} and out/ are built, the stand-in is here\n`);
  process.exit(p.length === 0 ? 0 : 2);
}

const t0 = Date.now();
const say = (l) => console.log(`[p374] ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`[p374] REFUSED. ${why}`);
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
if (!SOCKET.startsWith('gmux-p374')) refuse(`"${SOCKET}" is not a gmux-p374 harness socket: run me inside build/harness-socket.mjs`);
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR');
if (/^\/(private\/)?tmp\//.test(`${HARNESS_DIR}/`)) refuse('TMPDIR is /tmp: point it under /private/var/tmp');
{
  const p = preflightProblems();
  if (p.length > 0) refuse(p.join('; '));
}
const KEEP = (process.env['P374_KEEP'] ?? '') === '1';
const ARMS = new Set(((process.env['P374_ARMS'] ?? '').trim() || Object.keys(GRADERS).join(',')).split(',').map((x) => x.trim()));
ARMS.add('RUN');
{
  const odd = [...ARMS].filter((x) => GRADERS[x] === undefined);
  if (odd.length > 0) refuse(`no arm is called ${odd.join(', ')}`);
}
const on = (...ids) => ids.some((id) => ARMS.has(id));
const OUT = resolve((process.env['P374_OUT_DIR'] ?? '').trim() || join(ROOT, 'out', 'p374'));
const CHECKOUT = { parent: resolve(PARENT), head: ROOT };

mkdirSync(join(HARNESS_DIR, 'p374'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p374'));
/** ONE path for both builds' worlds, so an argv compares byte for byte. */
const W = join(RUN, 'w');
const HOME = join(W, 'h');
const PROFILE = join(W, 'p');
const PROJECT = join(W, 'alpha');
const ELSE = join(W, 'beta');
const BIN = join(HOME, '.local', 'bin');
const AGY = join(BIN, 'agy');
const TMP = join(W, 't');
/** agy's own folder, under the SCRATCH home, and the one file this phase asks about. */
const AGY_DIR = join(HOME, '.gemini', 'antigravity-cli');
const AGY_SETTINGS = join(AGY_DIR, 'settings.json');
const METER = join(PROFILE, 'gmux', 'antigravity-usage');
const LOGIN_PATH = `./p374bin:${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
const APP_PATH = `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
const SYSTEM_DIRS = ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];
const HIDDEN = hiddenAgentsBesides(STAND_IN_ROWS);
let SI = join(RUN, 'si-none');

const report = { checkout: ROOT, parent: CHECKOUT.parent, load: [], arms: [], readings: {}, notes: [] };
const R = report.readings;
let failures = 0;
let unreadable = 0;
let agentsRefused = false;
const runFacts = { launches: 0, returned: 0, socketed: 0, censused: 0, scans: 0, agentsHeld: true, fixtures: 0, socketSamples: 0, peers: [], searched: 0, worlds: 0, searchedWorlds: 0, unread: [], flagHits: [], census: 'no change', tableRead: false, left: 0, electrons: 0, history: true };
const apps = new Set();
const note = (s) => {
  report.notes.push(s);
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

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

const iso = (ms) => new Date(Date.now() + ms).toISOString();
function freshWorld(build) {
  if (existsSync(W)) renameSync(W, join(RUN, `w-${String(Date.now())}`));
  for (const d of [HOME, PROFILE, PROJECT, join(ELSE, 'p374bin'), BIN, TMP, join(W, 'cc'), join(W, 'cx')]) mkdirSync(d, { recursive: true });
  SI = join(RUN, `si-${build}`);
  if (build !== 'parent') runFacts.worlds += 1;
  mkdirSync(SI, { recursive: true });
  writeFileSync(join(HOME, '.profile'), `PATH=${LOGIN_PATH}; export PATH; HISTFILE=/dev/null; PS1='x $ '\n`);
  writeFileSync(join(HOME, '.zshrc'), "PS1='x %# '\nHISTFILE=/dev/null\n");
  writeFileSync(join(W, 'cc', '.credentials.json'), J({ claudeAiOauth: { accessToken: 'P374SENTINELCLAUDE', subscriptionType: 'max', expiresAt: Date.now() + 3600e3 * 12 } }), { mode: 0o600 });
  writeFileSync(join(W, 'cx', 'auth.json'), J({ OPENAI_API_KEY: null, tokens: { access_token: 'P374SENTINELCODEX', account_id: 'acct' } }), { mode: 0o600 });
  writeFileSync(
    join(W, 'fx.json'),
    J({
      P374SENTINELCLAUDE: { status: 200, body: { five_hour: { utilization: 37, resets_at: iso(3 * 3600e3) }, seven_day: { utilization: 12, resets_at: iso(4 * 864e5) } } },
      P374SENTINELCODEX: { status: 200, body: { plan_type: 'pro', rate_limit: { primary_window: { limit_window_seconds: 604800, used_percent: 9, reset_after_seconds: 86400 }, secondary_window: { limit_window_seconds: 18000, used_percent: 41, reset_after_seconds: 3600 } } } }
    })
  );
  setVersion(SI, GOOD_VERSION);
  plantAgy('1');
  const e = buildAgy({ out: join(ELSE, 'p374bin', 'agy'), dir: SI, flavour: 'elsewhere' });
  if (!e.ok) refuse(`the stand-in did not compile: ${e.said}`);
}
function plantAgy(stamp) {
  const b = buildAgy({ out: AGY, dir: SI, stamp });
  if (!b.ok) refuse(`the stand-in did not compile: ${b.said}`);
}
/** The application folder a launch opens: the checkout's own build, with a stand-in SpecStory in place of the bundled one. */
let appIs = '';
function appFolder(build) {
  // ONE path for both builds' application folders too, because a captured row records the SpecStory in it.
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
// Processes, the manifest and the panes, read by this file's own readers
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
/** The app's own network peers, as lsof names them. */
function samplePeers(pid) {
  const table = processTable();
  const mine = new Set([pid]);
  for (let grown = true; grown; ) {
    grown = false;
    for (const p of table) if (mine.has(p.ppid) && !mine.has(p.pid) && !p.command.includes(STANDIN_PATH)) {
      mine.add(p.pid);
      grown = true;
    }
  }
  const r = spawnSync('/usr/sbin/lsof', ['-nP', '-a', '-i', '-p', [...mine].join(','), '-Fn'], { encoding: 'utf8', timeout: 15_000 });
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
let tmuxPath = null;
function tmux(...args) {
  if (tmuxPath === null) {
    // The binary the server itself runs, so a client of another version is never asked.
    const pid = Number(String(spawnSync('tmux', ['-L', SOCKET, 'display-message', '-p', '#{pid}'], { encoding: 'utf8', timeout: 10_000 }).stdout ?? '').trim());
    const command = pid > 1 ? String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 5_000 }).stdout ?? '').trim().split(/\s+/)[0] : '';
    tmuxPath = command.startsWith('/') && existsSync(command) ? command : existsSync(tmuxBin()) ? tmuxBin() : 'tmux';
  }
  const r = spawnSync(tmuxPath, ['-u', '-L', SOCKET, ...args], { encoding: 'utf8', timeout: 10_000 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
}
function targetNow(id) {
  for (const line of String(tmux('list-sessions', '-F', '#{session_id} #{@gmux-id}') ?? '').split('\n')) {
    const m = /^(\$\d+) (\S+)$/.exec(line.trim());
    if (m !== null && m[2] === id) return m[1];
  }
  return null;
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
/** One row's recorded argv and resume argv, from a copy of the manifest beside its WAL. */
function rowOf(id) {
  const db = join(PROFILE, 'gmux', 'manifest.db');
  if (!existsSync(db)) return null;
  copies += 1;
  const dir = join(RUN, 'copies', String(copies));
  mkdirSync(dir, { recursive: true });
  for (const s of ['', '-wal', '-shm']) if (existsSync(`${db}${s}`)) copyFileSync(`${db}${s}`, join(dir, `m.db${s}`));
  const r = spawnSync('/usr/bin/sqlite3', ['-json', join(dir, 'm.db'), `select argv, resume_argv, agent_session_id, status from sessions where id = '${id}';`], { encoding: 'utf8', timeout: 20_000 });
  try {
    const row = JSON.parse(r.stdout)[0];
    const parse = (t) => (t === null ? null : JSON.parse(t));
    return { argv: parse(row.argv), resume: parse(row.resume_argv), conversation: row.agent_session_id, status: row.status };
  } catch {
    return null;
  }
}
const helloOf = (id, fromMs = 0) => hellos(SI).filter((h) => h.session === id && h.at >= fromMs && h.tty === true).at(-1) ?? null;
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
// Since Phase 375 the line carries `"e"` straight after the hash; the tail is what follows either shape.
const tailIn = (kept) => (kept === null ? null : kept.replace(/^\{"v":1,"h":"[0-9a-f]{64}",(?:"e":(?:null|"[^"\\]*"),)?/, ''));
const hashIn = (kept) => /^\{"v":1,"h":"([0-9a-f]{64})"/.exec(kept ?? '')?.[1] ?? null;
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
/**
 * The same search for ACCT, each hit an object: the file, the needle and
 * whether it stood ONLY as a slot line's `"e"` (the line with its `"e"` taken
 * out no longer holds it).
 */
function searchAddresses(needles) {
  const hits = [];
  const unread = [];
  let files = 0;
  let control = false;
  walk(W, (p) => {
    let b;
    try {
      b = readFileSync(p);
    } catch (err) {
      if (err?.code !== 'ENOENT') unread.push(`${p.slice(W.length)}: ${String(err?.code)}`);
      return;
    }
    files += 1;
    if (b.includes(SEARCH_CONTROL)) control = true;
    const rel = p.slice(W.length);
    const text = SLOT_PATH.test(rel) ? b.toString('utf8') : '';
    const left = SLOT_HEAD.test(text) ? Buffer.from(text.replace(SLOT_HEAD, '$1')) : null;
    for (const n of needles) if (b.includes(n)) hits.push({ path: rel, needle: n, slotE: left !== null && !left.includes(n) });
  });
  return { hits, files, control, unread };
}
/** Every file under the world holding one of `needles`, as `path: needle`; whether the byte that IS there was found; and what could not be read. */
function search(needles) {
  const hits = [];
  const unread = [];
  let files = 0;
  let control = false;
  const bytes = needles.map((n) => [n, Buffer.from(n)]);
  walk(W, (p) => {
    let b;
    try {
      b = readFileSync(p);
    } catch (err) {
      // A file that went between the listing and the read is not one that stands; any other is unread.
      if (err?.code !== 'ENOENT') unread.push(`${p.slice(W.length)}: ${String(err?.code)}`);
      return;
    }
    files += 1;
    if (b.includes(SEARCH_CONTROL)) control = true;
    for (const [n, x] of bytes) if (b.includes(x)) hits.push(`${p.slice(W.length)}: ${n}`);
  });
  return { hits, files, control, unread };
}

// ---------------------------------------------------------------------------
// The app
// ---------------------------------------------------------------------------

const INHERITED = Object.fromEntries([...Object.keys(process.env).filter((n) => /^(?:CLAUDE|CODEX|GEMINI|ANTIGRAVITY|AGY|P374|GMUX_USAGE_FIXTURE)/.test(n)), 'TERM_SESSION_ID', 'TERM_PROGRAM', 'NVM_BIN', 'BUN_INSTALL', 'SSH_AUTH_SOCK'].map((n) => [n, undefined]));
const LOAD = "(typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule))";

async function attachMain(timeoutMs = 120_000) {
  const started = Date.now();
  let why = '';
  for (;;) {
    try {
      const port = Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      const picked = pickRendererTarget(await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json());
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
async function attachInspector(handle) {
  for (let i = 0; i < 100; i += 1) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) return wsConnect(m[1]);
    await sleep(200);
  }
  throw new Error("main's inspector never appeared");
}

/** One launch. `keepServer` is LIFE's first: its scratch server outlives the app. */
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
  const pre = copiesOf.length > 0 ? { ok: false, said: `an agy, or a folder that cannot be read, where the scan looks: ${copiesOf.join(', ')}` } : hiddenAgentsPrecheck({ checkout, prefix: 'p374', home: HOME, userPath: `${LOGIN_PATH}:${APP_PATH}`, standIns: STAND_IN_ROWS });
  if (!pre.ok) {
    runFacts.agentsHeld = false;
    agentsRefused = true;
    throw new Error(`${label}: ${pre.said}`);
  }
  writeHiddenAgents(PROFILE, 'p374', HIDDEN);
  report.load.push(`${label}: ${String(spawnSync('/usr/bin/uptime', [], { encoding: 'utf8' }).stdout ?? '').trim().replace(/^.*load averages?: /, 'load ')}`);
  runFacts.launches += 1;
  if (!keepServer) runFacts.socketed += 1;
  tmuxPath = null;
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
        const k = { build, handle, cdp: null, main: null };
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
          const focused = await k.mev(`(() => { const { BrowserWindow } = ${LOAD}('electron'); globalThis.__p374 = { focus: true }; const f = () => globalThis.__p374.focus; BrowserWindow.prototype.isFocused = f; for (const w of BrowserWindow.getAllWindows()) if (w.isFocused !== f) w.isFocused = f; return BrowserWindow.getAllWindows().length > 0 && BrowserWindow.getAllWindows().every((w) => w.isFocused()); })()`);
          if (focused !== true) throw new Error('main’s isFocused could not be answered from here');
          k.focus = (v) => k.mev(`globalThis.__p374.focus = ${J(v)}`);
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
          k.main?.close();
          k.cdp?.close();
        }
      }
    );
    runFacts.returned += 1;
    if (!keepServer) runFacts.censused += 1;
    return answer;
  } catch (err) {
    // A body that had finished and a launch that still threw is its TEARDOWN speaking: the census (a session
    // that appeared or went, or a reading it could not take) or a scratch server not proved gone.
    const m = String(err?.message ?? err);
    if (bodyDone || / APPEARED on | WENT from /.test(m)) runFacts.census = m;
    throw err;
  }
}

const READ_METER = `(() => { const b=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(v=>Math.round(v*100)/100)}; const m=[...document.querySelectorAll('.usage-meter')].find((e)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0})??null; const rows=m===null?[]:[...m.querySelectorAll('.usage-row, .usage-mini-row')]; return { cls:m&&m.className, meter:b(m), refresh:b(m&&m.querySelector('.usage-refresh')), rows:rows.map(e=>({r:b(e),bar:b(e.querySelector('.usage-bar')),t:(e.querySelector('.usage-text')||{}).textContent??null,tr:b(e.querySelector('.usage-text')),hidden:(e.querySelector('.usage-hidden')||{}).textContent??null})) }; })()`;

function kit(k) {
  const page = (expr, ms = 60_000) => cdpEval(k.cdp, expr, ms);
  k.page = page;
  k.bridge = async (expr, ms = 120_000) => JSON.parse(await page(`(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, ms));
  k.drive = (s) => page(`window.__gmuxShotDrive(${J(s)}).then(() => true)`, 120_000);
  k.meter = () => page(READ_METER);
  /** A read of this file's own. It moves what main thinks the window knows, so it is only ever the LAST thing an arm does. */
  k.usage = async () => (await k.bridge('window.gmux.usage.read()')).value;
  k.row = async () => (await k.usage())?.providers?.find((p) => p.provider === 'antigravity') ?? null;
  /** The Antigravity row as DRAWN: its accessible text names it, and its face line. */
  k.drawn = async () => (await k.meter()).rows.find((r) => String(r.hidden ?? '').startsWith('Antigravity')) ?? null;
  k.face = async () => {
    const r = await k.drawn();
    return r === null ? null : (r.t ?? '');
  };
  k.words = async () => String((await k.drawn())?.hidden ?? '');
  k.switch = async (patch) => {
    const r = await k.bridge(`window.gmux.settingsSet({ usage: ${J({ claude: false, codex: false, ...patch })} }).then(() => true)`);
    if (!r.ok) throw new Error(`the switch: ${r.error}`);
    await sleep(700);
  };
  k.card = async () =>
    page(
      `(async () => { const m=[...document.querySelectorAll('.usage-meter')].find((e)=>e.getBoundingClientRect().width>0); m.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'})); await new Promise(r=>setTimeout(r,500)); const g=[...document.querySelectorAll('.usage-card-group')].find((x)=>(x.textContent||'').startsWith('Antigravity')); const out=g?{ lines:[...g.querySelectorAll('.usage-card-name, .usage-card-line')].map(x=>(x.textContent||'').trim()), controls:g.querySelectorAll('button, a, [role=button], [data-login-control]').length }:null; m.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'})); await new Promise(r=>setTimeout(r,400)); return out; })()`,
      20_000
    );
  k.list = async () => (await k.bridge('window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, status: s.status })))')).value ?? [];
  let n = 0;
  /** A session made the way a person makes one; how it was started, from the stand-in itself. */
  k.create = async (label, { extraArgs = [], capture = false, project = PROJECT, wait = 25_000 } = {}) => {
    n += 1;
    const from = Date.now();
    const input = { name: `p374-${label}-${String(n)}`, projectPath: project, cwd: project, agent: 'antigravity', ...(extraArgs.length > 0 ? { extraArgs } : {}), ...(capture ? { capture: true } : {}) };
    const got = await k.bridge(`window.gmux.sessions.create(${J(input)}).then((s) => s.id)`);
    const ms = Date.now() - from;
    if (!got.ok) throw new Error(`${input.name}: ${got.error}`);
    const hello = await waitFor(() => hellos(SI).find((h) => h.session === got.value) ?? null, wait, 150);
    const row = rowOf(got.value);
    return { id: got.value, ms, hello, spawned: hello?.argv ?? null, flavour: hello?.flavour ?? null, recorded: row?.argv ?? null, resume: row?.resume ?? null, splice: hello === null ? null : [...spliceProblems(hello.argv, METER), ...(hello.settings?.refused === undefined ? [] : [`agy refused it: ${String(hello.settings.refused)}`])], alive: hello !== null && alive(hello.pid) };
  };
  k.slim = (s, more = {}) => ({ spawned: s.spawned, recorded: s.recorded, resume: s.resume, splice: s.splice, alive: s.alive, flavour: s.flavour, ms: s.ms, ...more });
  k.stillAlive = async (s, ms = 2_500) => {
    await sleep(ms);
    return s.hello !== null && alive(s.hello.pid);
  };
  k.kill = (id) => k.bridge(`window.gmux.sessions.kill(${J(id)})`);
  k.rescan = () => k.bridge('window.gmux.agentsRescan().then((r) => r.agents.filter((a) => a.id === "antigravity").map((a) => a.version ?? null))');
  k.done = (hello, seq, ms) => waitFor(() => {
    const s = stateOf(SI, hello.pid);
    return s !== null && s.seq >= seq && s.pending === 0 && s.inFlight === false && runsOf(SI, hello.pid).length >= s.runs ? s : null;
  }, ms, 100);
  return k;
}

/** The three creates and the two rectangles of OFF; `conversation` gives a row an id to resume by. */
async function conversationFor(k, s, id) {
  tell(SI, s.hello.pid, [{ op: 'conversation', id }]);
  return waitFor(() => (rowOf(s.id)?.conversation === id ? true : null), 45_000, 500);
}
async function offCreates(k) {
  const a = await k.create('create');
  const b = await k.create('extras', { extraArgs: ['--model', 'example model', '--sandbox'] });
  const c = await k.create('captured', { capture: true });
  if (a.hello !== null) await conversationFor(k, a, CONV.one);
  if (b.hello !== null) await conversationFor(k, b, CONV.two);
  // The resume argv is armed once the conversation is known, so each row is read again here.
  const again = (s) => ({ ...k.slim(s), id: s.id, recorded: rowOf(s.id)?.argv ?? null, resume: rowOf(s.id)?.resume ?? null, conversation: rowOf(s.id)?.conversation ?? null });
  const out = { create: again(a), extras: again(b), captured: again(c), asked: 0 };
  // Each is asked to run a line, so "no run" is a reading: one with no command answers the ask and runs nothing.
  for (const s of [a, b, c]) {
    if (s.hello === null) continue;
    const seq = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'launch', from: 4, to: 4 }]);
    if ((await k.done(s.hello, seq, 10_000)) !== null) out.asked += 1;
  }
  return out;
}
const strip = (t) => String(t ?? '').replace(/\s+/g, '');
const paneText = (target) => String(tmux('capture-pane', '-p', '-J', '-S', '-200', '-t', target) ?? '');

/**
 * The line standing at a pane's prompt that begins with this run's agy and a flag, every
 * space left out (the shell wraps it where it likes), and how many such lines
 * the pane holds. Read off the pane by this file's own client, never off what
 * the app says it typed.
 */
function typedLine(target) {
  const text = strip(paneText(target));
  // Whatever follows the program, so a line that carries something BEFORE the id is read and not missed.
  const mark = strip(`${AGY} --`);
  const n = text.split(mark).length - 1;
  return { n, line: n === 0 ? null : text.slice(text.lastIndexOf(mark)) };
}
/** Restore one row, run it, let it leave, put the line back, and Restart another. */
async function typedPaths(k, restoreId, restartId) {
  const out = { restore: { armed: null, drawn: false, ran: null }, resumeInPlace: { line: null, landing: null }, restart: { spawned: null, splice: null }, paneSettings: null };
  const from = Date.now();
  const got = await k.bridge(`window.gmux.sessions.restore(${J(restoreId)}).then(() => true)`);
  if (!got.ok) note(`restore: ${got.error}`);
  const target = await waitFor(() => targetNow(restoreId), 20_000);
  if (target !== null) {
    await waitFor(() => (typedLine(target).n > 0 ? true : null), 20_000);
    await sleep(1_500);
    out.restore.armed = typedLine(target).line;
    out.restore.drawn = out.restore.armed !== null;
    const had = typedLine(target).n;
    tmux('send-keys', '-t', target, 'Enter');
    const hello = await waitFor(() => helloOf(restoreId, from), 20_000);
    out.restore.ran = hello?.argv ?? null;
    if (hello !== null) {
      // The monitor has to have seen the agent here before it can see it leave.
      await sleep(8_000);
      tell(SI, hello.pid, [{ op: 'exit', code: 0 }]);
      await waitFor(() => (alive(hello.pid) ? null : true), 10_000);
      const again = await waitFor(async () => {
        const r = await k.bridge(`window.gmux.sessions.resumeInPlace(${J(restoreId)})`);
        return r.ok && r.value?.refusal !== 'not-dropped' && r.value?.refusal !== 'running' ? r : null;
      }, 45_000, 1_000);
      out.resumeInPlace.landing = again?.value?.landing ?? again?.value?.refusal ?? null;
      await waitFor(() => (typedLine(target).n > had ? true : null), 6_000);
      await sleep(800);
      out.resumeInPlace.line = typedLine(target).n > had ? typedLine(target).line : null;
    }
    out.paneSettings = (paneText(target).match(/--?settings/g) ?? []).length;
  }
  const r = await k.bridge(`window.gmux.sessions.restart(${J(restartId)})`);
  if (!r.ok) note(`restart: ${r.error}`);
  const newId = r.ok ? (r.value?.session?.id ?? r.value?.id ?? r.value?.sessionId ?? null) : null;
  const h = newId === null ? null : await waitFor(() => hellos(SI).find((x) => x.session === newId) ?? null, 25_000);
  out.restart.spawned = h?.argv ?? null;
  out.restart.splice = h === null ? null : spliceProblems(h.argv, METER);
  return out;
}

async function size(k, w, h) {
  await k.cdp.call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(900);
}
/** The placements of SPEC §0.1.8, read at one build in one state. */
async function rects(k) {
  const read = async () => {
    const once = async () => {
      await k.cdp.call('Page.captureScreenshot', { format: 'png' }, 30_000).catch(() => null);
      await sleep(300);
      const m = await k.meter();
      return { cls: m.cls, meter: m.meter, refresh: m.refresh, rows: m.rows.map(({ r, bar, t, tr }) => ({ r, bar, t, tr })) };
    };
    // Two readings in a row that say the same, or this one is not of a page at rest.
    let last = await once();
    for (let i = 0; i < 10; i += 1) {
      const next = await once();
      if (same(next, last)) return { ...next, still: true };
      last = next;
    }
    return { ...last, still: false };
  };
  const key = async (name, code) => {
    for (const type of ['rawKeyDown', 'keyUp']) await k.cdp.call('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
    await sleep(600);
  };
  const out = {};
  await size(k, 1440, 900);
  await k.drive({ projectPath: PROJECT, orientation: 'right' });
  await sleep(800);
  await k.page(`document.querySelector('[data-slot="session-dock"] > .dock-resizer')?.focus()`);
  await key('End', 35);
  await key('Home', 36);
  out.full160 = await read();
  out.dock160 = await k.page(`Math.round(document.querySelector('[data-slot="session-dock"]').getBoundingClientRect().width)`);
  for (let i = 0; i < 40; i += 1) {
    const w = await k.page(`Math.round(document.querySelector('[data-slot="session-dock"]').getBoundingClientRect().width)`);
    if (w >= 200) break;
    await k.page(`document.querySelector('[data-slot="session-dock"] > .dock-resizer')?.focus()`);
    await key('ArrowLeft', 37);
    const w2 = await k.page(`Math.round(document.querySelector('[data-slot="session-dock"]').getBoundingClientRect().width)`);
    if (w2 <= w) await key('ArrowRight', 39);
  }
  out.full = await read();
  out.dockWidth = await k.page(`Math.round(document.querySelector('[data-slot="session-dock"]').getBoundingClientRect().width)`);
  await k.page(`document.querySelector('button[aria-label="Collapse session list"]')?.click()`);
  await sleep(900);
  out.mini = await read();
  await k.page(`document.querySelector('button[aria-label="Show session names"]')?.click()`);
  await sleep(600);
  await k.drive({ projectPath: PROJECT, orientation: 'top' });
  await sleep(1_000);
  out.strip1440 = await read();
  await size(k, 960, 700);
  out.strip960 = await read();
  await size(k, 1440, 900);
  await k.drive({ projectPath: PROJECT, orientation: 'right' });
  await sleep(600);
  return out;
}
async function twoMetersOn(k, antigravity) {
  await k.switch({ claude: true, codex: true, ...(antigravity === undefined ? {} : { antigravity }) });
  // Off the PAGE, never by a read of this file's own: main would answer it, and then have nothing new to tell the window.
  await waitFor(async () => (await k.meter()).rows.filter((r) => (r.hidden ?? '').includes('% 5h')).length >= (antigravity === true ? 3 : 2), 25_000, 300);
  await sleep(800);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const keep = {};

/** P1 and H1's opening: the creates, the FIFO, two rows. The switch is off, or does not exist. */
async function firstHalf(k) {
  await size(k, 1440, 900);
  await k.drive({ projectPath: PROJECT, orientation: 'right' });
  await k.drive({ projectPath: PROJECT, session: { agent: 'shell', name: 'p374-shell' } });
  await sleep(800);
  const out = { creates: null, fifoMs: null, rect: null };
  if (on('OFF', 'ON', 'CAP', 'TYPED')) out.creates = await offCreates(k);
  if (on('RECT')) {
    await twoMetersOn(k);
    out.rect = await rects(k);
    await k.switch({});
  }
  if (on('ASIDE') && k.build === 'parent') out.fifoMs = await fifoCreate(k);
  // PRINTED, NOT GRADED: the same hundred runs of a status line the PERSON set, at the parent, led by a session of its own.
  if (on('STATUS') && k.build === 'parent') await step('STATUS at the parent', async () => {
    R.STATUS = { parentOwn: await statusRuns(k, 'own', true, ['--settings', J({ statusLine: { type: 'command', command: '/bin/cat >/dev/null; exit 0', stack_with_default: true } })]) };
    note(`STATUS, the parent, a person's own status line in a session of its own: ${J(R.STATUS.parentOwn.seen)}, ${String(R.STATUS.parentOwn.working)} of ${String(R.STATUS.parentOwn.samples)} samples working; with one run held alive ${String(R.STATUS.parentOwn.held.working)} of ${String(R.STATUS.parentOwn.held.samples)} (${J(R.STATUS.parentOwn.held.stat)})`);
  });
  return out;
}
function settingsFile(shape) {
  rmSync(AGY_SETTINGS, { force: true });
  mkdirSync(AGY_DIR, { recursive: true });
  if (shape === null) return;
  if (shape === 'fifo') spawnSync('/usr/bin/mkfifo', [AGY_SETTINGS]);
  else writeFileSync(AGY_SETTINGS, shape.text, { mode: 0o600 });
  if (shape.mode !== undefined) chmodSync(AGY_SETTINGS, shape.mode);
}
async function fifoCreate(k) {
  settingsFile('fifo');
  try {
    const s = await k.create('fifo');
    k.lastFifo = s;
    return s.ms;
  } finally {
    settingsFile(null);
  }
}

/** A hundred status line runs over an idle agy, and every status the session read meanwhile. */
async function statusRuns(k, name, setsid, extraArgs = []) {
  // A real agy's command line holds its flags, and the app reads it; this session ends before the teardown does.
  writeFileSync(join(SI, 'keep-args'), '');
  const s = await k.create(`status-${name}`, { extraArgs });
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
  await k.page(`(() => { const w = (window.__p374s ??= {}); w[${J(s.id)}] = []; window.gmux.sessions.onStatusChanged((e) => { const id = e.sessionId ?? e.id; if (id === ${J(s.id)}) w[${J(s.id)}].push(String(e.status)); }); return true; })()`);
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
  const events = (await k.page(`window.__p374s[${J(s.id)}]`)) ?? [];
  for (const e of events) seen.add(e);
  const runs = runsOf(SI, s.hello.pid);
  const ms = runs.map((x) => x.ms).sort((a, b) => a - b);
  // ONE RUN HELD ALIVE across the app's own looks, so what a look says of a run is a reading and not luck.
  const held = { aliveMs: 0, samples: 0, working: 0, seen: [], stat: [], idleFirst: (await look()) ?? null };
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
  for (const e of ((await k.page(`window.__p374s[${J(s.id)}]`)) ?? []).slice(eventsBefore)) heldSeen.add(e);
  held.seen = [...heldSeen];
  held.stat = [...stats];
  await k.kill(s.id);
  return { argvShown: s.spawned.every((t) => commandLine.includes(t)), settled: settled === true, samples, working, events, held, seen: [...seen], runs: runs.length, zero: runs.filter((x) => x.code === 0).length, killed: runs.filter((x) => x.killedByNext).length, nonZero: runs.filter((x) => x.code !== null && x.code !== 0).length, ms: { p50: ms[Math.floor(ms.length / 2)] ?? null, max: ms.at(-1) ?? null }, splice: s.splice };
}

async function headOn(k) {
  const off = R.OFF.head;
  await k.focus(true);
  await k.switch({ antigravity: true });
  await waitFor(async () => (await k.drawn()) !== null, 10_000);

  if (on('CAP')) await step('CAP', async () => {
    const before = (await k.words()).split('. ').slice(1).join('. ');
    const wraps = () => readFileSync(join(RUN, 'specstory.log'), 'utf8').split('\n').filter((l) => l.startsWith('run antigravity')).length;
    const had = wraps();
    const s = await k.create('cap', { capture: true });
    await waitFor(async () => ((await k.words()).includes(WORDS.captured) ? true : null), FACE_MS + 4_000);
    const words = (await k.words()).split('. ').slice(1).join('. ');
    const wrapped = wraps() === had + 1;
    R.CAP = { ...k.slim(s), before: sentence(before), words: sentence(words), wrapped, parentRecorded: R.OFF.parent?.creates?.captured?.recorded ?? null };
    await k.kill(s.id);
  });

  if (on('FLOOR')) await step('FLOOR', async () => {
    const f = {};
    const scanned = async () => {
      const r = await k.rescan();
      return r.ok ? (r.value?.[0] ?? null) : null;
    };
    setVersion(SI, '1.4.9');
    plantAgy('old');
    let scan = await scanned();
    let s = await k.create('old');
    await waitFor(async () => ((await k.words()).includes(WORDS.version) ? true : null), FACE_MS + 4_000);
    f.old = { ...k.slim(s), scan, alive: await k.stillAlive(s), words: sentence((await k.words()).split('. ').slice(1).join('. ')) };
    await k.kill(s.id);
    setVersion(SI, 'no version here');
    plantAgy('unread');
    scan = await scanned();
    s = await k.create('unread');
    f.unread = k.slim(s, { scan });
    await k.kill(s.id);
    setVersion(SI, GOOD_VERSION);
    plantAgy('good');
    scan = await scanned();
    s = await k.create('control');
    f.control = k.slim(s, { scan });
    await k.kill(s.id);
    plantAgy('replaced');
    const versions = versionCalls(SI).length;
    s = await k.create('replaced');
    f.replaced = { ...k.slim(s), alive: await k.stillAlive(s, 6_000), versionsMore: versionCalls(SI).length - versions };
    await k.kill(s.id);
    s = await k.create('next');
    f.next = k.slim(s);
    f.replaced.versionsMore = versionCalls(SI).length - versions;
    await k.kill(s.id);
    writeScriptAgy({ out: AGY, dir: SI });
    scan = await scanned();
    s = await k.create('script');
    f.script = k.slim(s, { scan });
    await k.kill(s.id);
    plantAgy('back');
    scan = await scanned();
    s = await k.create('elsewhere', { project: ELSE });
    f.elsewhere = k.slim(s, { scan });
    await k.kill(s.id);
    R.FLOOR = f;
  });

  if (on('ASIDE')) await step('ASIDE', async () => {
    const flags = {};
    const value = J({ model: 'example' });
    for (const [name, args] of [['two', ['--settings', value]], ['equals', [`--settings=${value}`]], ['one', ['-settings', value]], ['dir', ['--gemini_dir', '/example']]]) {
      const s = await k.create(`aside-${name}`, { extraArgs: args });
      let words = null;
      if (name === 'two') {
        await waitFor(async () => ((await k.words()).includes(WORDS['own-status-line']) ? true : null), FACE_MS + 4_000);
        words = sentence((await k.words()).split('. ').slice(1).join('. '));
      }
      flags[name] = { ...k.slim(s), asked: args, words };
      await k.kill(s.id);
    }
    const files = {};
    const own = { type: 'command', command: '/usr/bin/true' };
    for (const [name, shape] of [
      ['own', { text: J({ statusLine: own }) }],
      ['disabled', { text: J({ statusLine: { ...own, enabled: false } }) }],
      ['without', { text: J({ model: 'example' }) }],
      ['unreadable', { text: J({}), mode: 0o000 }],
      ['huge', { text: J({ pad: 'x'.repeat(300 * 1024) }) }],
      ['broken', { text: '{ "statusLine": ' }]
    ]) {
      settingsFile(shape);
      const s = await k.create(`file-${name}`);
      files[name] = k.slim(s);
      await k.kill(s.id);
    }
    const headMs = await fifoCreate(k);
    files.fifo = k.slim(k.lastFifo);
    await k.kill(k.lastFifo.id);
    settingsFile(null);
    R.ASIDE = { flags, files, fifo: { parentMs: keep.parentFifoMs ?? null, headMs } };
  });

  if (on('GUARD')) await step('GUARD', async () => {
    const line = /usage\.antigravity\.start-failed/g;
    const logged = () => (logText().match(line) ?? []).length;
    const had = logged();
    writeFileSync(join(SI, 'start.json'), J({ exit: 1, afterMs: 1_500, onlyWithSettings: true }));
    const a = await k.create('guard-a');
    const ended = a.hello !== null && (await waitFor(() => (alive(a.hello.pid) ? null : true), 10_000)) === true;
    await waitFor(() => (logged() > had ? true : null), 15_000);
    await waitFor(async () => ((await k.words()).includes('Antigravity session ended at once') ? true : null), FACE_MS + 4_000);
    const words = sentence((await k.words()).split('. ').slice(1).join('. '));
    const waitingFor = (await k.row())?.waitingFor ?? null;
    const b = await k.create('guard-b');
    const bAlive = await k.stillAlive(b, 4_000);
    rmSync(join(SI, 'start.json'), { force: true });
    plantAgy('guard');
    await k.rescan();
    const c = await k.create('guard-c');
    const cAlive = await k.stillAlive(c);
    R.GUARD = { first: { ...k.slim(a), ended }, logLines: logged() - had, logBytes: logText().length, waitingFor, words, second: { ...k.slim(b), alive: bAlive }, third: { ...k.slim(c), alive: cAlive } };
    await k.kill(b.id);
    await k.kill(c.id);
  });

  if (on('ON')) await step('ON', async () => {
    const s = await k.create('on');
    const startLine = String(tmux('display-message', '-p', '-t', `${targetNow(s.id)}:`, '#{pane_start_command}') ?? '').trim();
    if (s.hello !== null) await conversationFor(k, s, CONV.five);
    const lines = readRecording('launch');
    // Up to the last run on the first numbers; then THE ONE RUN that moves them, timed; then the rest.
    const moves = lines.findIndex((l) => l.payload.quota !== undefined && faceOf(l.payload, 0) !== faceOf(lines[3].payload, 0)) + 1;
    let seq = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'launch', from: 1, to: moves - 1, everyMs: 320 }]);
    await k.done(s.hello, seq, 40_000);
    const first = faceOf(rebase(lines[moves - 2], s.hello.origin), Date.now());
    const sawFirst = (await waitFor(async () => ((await k.face()) === first ? true : null), FACE_MS + 6_000, 100)) === true;
    seq = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'launch', from: moves, to: moves }]);
    await k.done(s.hello, seq, 10_000);
    const at = statSync(meterFile(s.id)).mtimeMs;
    const then1 = faceOf(rebase(lines[moves - 1], s.hello.origin), Date.now());
    await waitFor(async () => ((await k.face()) === then1 ? true : null), FACE_MS + 6_000, 100);
    const faceMs = Math.round(Date.now() - at);
    seq = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'launch', from: moves + 1, everyMs: 320 }]);
    await k.done(s.hello, seq, 40_000);
    const keptTail = tailIn(keptOf(s.id));
    const last = rebase(lines.at(-1), s.hello.origin);
    const wantFace = faceOf(last, Date.now());
    await waitFor(async () => ((await k.face()) === wantFace ? true : null), FACE_MS + 6_000, 100);
    const face = await k.face();
    const card = await k.card();
    const runs = runsOf(SI, s.hello.pid);
    // A window behind reads nothing: a new file, three looks' time, the same face; then in front.
    await k.focus(false);
    await sleep(1_000);
    const faceBefore = await k.face();
    const then = rebase(readRecording('resume').at(-1), s.hello.origin);
    const t = Date.now();
    const seq2 = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'resume', from: 21, to: 21 }]);
    await k.done(s.hello, seq2, 10_000);
    const wrote = tailIn(keptOf(s.id)) === tailOf(then);
    await sleep(Math.max(0, 11_500 - (Date.now() - t)));
    const faceAfter = await k.face();
    const heldMs = Date.now() - t;
    await k.focus(true);
    const wantThen = faceOf(then, Date.now());
    await waitFor(async () => ((await k.face()) === wantThen ? true : null), FACE_MS + 4_000, 200);
    const faceThen = await k.face();
    // The row again, now that its conversation is known and its resume argv is armed.
    const row = rowOf(s.id);
    const parentCreate = R.OFF.parent?.creates?.create ?? null;
    R.ON = {
      ...k.slim(s),
      startLine,
      recorded: row?.argv ?? null,
      resume: row?.resume ?? null,
      conversation: row?.conversation ?? null,
      parentSpawned: parentCreate?.spawned ?? null,
      parentRecorded: parentCreate?.recorded ?? null,
      // The parent's own, for another conversation: the id alone is replaced.
      parentResume: parentCreate?.resume?.map((t) => t.replaceAll(CONV.one, CONV.five)) ?? null,
      runs: { sent: lines.length, logged: runs.length, codes: [...new Set(runs.map((x) => x.code))], nonZero: runs.filter((x) => x.code !== null && x.code !== 0).length, outBytes: runs.reduce((a, x) => a + x.out, 0), errBytes: runs.reduce((a, x) => a + x.err, 0), killedByNext: runs.filter((x) => x.killedByNext).length, errorBlocks: stateOf(SI, s.hello.pid)?.errorBlocks ?? -1, ms: { max: Math.max(...runs.map((x) => x.ms)), p50: runs.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(runs.length / 2)] } },
      keptTail,
      lastTail: tailOf(last),
      face,
      wantFace,
      moved: { sawFirst, first, then: then1 },
      faceMs,
      card: card?.lines ?? null,
      loginControls: card?.controls ?? null,
      wantSecond: secondOf(last, Date.now()),
      behind: { heldMs, wrote, faceBefore, faceAfter, faceThen, wantThen }
    };
    // PRINTED, NOT GRADED: a run that took longer than agy's overlap, and when, so a stall of the machine can be placed.
    for (const x of runs.filter((y) => y.ms > 300 || y.killedByNext)) note(`ON: run ${String(x.n)} took ${String(x.ms)} ms from ${new Date(x.at).toISOString()}${x.killedByNext ? ', ended by the next' : ''}, load ${loadavg().map((l) => l.toFixed(0)).join(' ')} at the arm's end`);
    await k.kill(s.id);
  });

  if (on('STATUS')) await step('STATUS', async () => {
    R.STATUS = { ...(R.STATUS ?? {}), plain: await statusRuns(k, 'plain', false), setsid: await statusRuns(k, 'setsid', true) };
  });

  if (on('RECT')) await step('RECT three', async () => {
    const s = await k.create('rect');
    const seq = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'launch', from: 42, to: 42 }]);
    await k.done(s.hello, seq, 10_000);
    await twoMetersOn(k, true);
    await waitFor(async () => ((await k.face()) ?? '').includes('5h'), FACE_MS + 4_000);
    R.RECT.head3 = await rects(k);
    note(`RECT: the strip at 1440 reads ${J(R.RECT.head3.strip1440.cls)}, at 960 ${J(R.RECT.head3.strip960.cls)} (the parent's two rows ${J(R.RECT.parent?.strip960?.cls)})`);
    await k.switch({ antigravity: true });
    await k.kill(s.id);
  });

  if (on('ACCT')) await step('ACCT', async () => {
    const s = await k.create('acct');
    const launchLines = readRecording('launch');
    const resumeLines = readRecording('resume');
    let seq = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'launch', from: 30, to: 42, everyMs: 200, email: PERSON }]);
    await k.done(s.hello, seq, 15_000);
    const firstFaces = [...new Set(launchLines.slice(29).map((l) => faceOf(rebase(l, s.hello.origin), Date.now())))];
    const firstDrawn = (await waitFor(async () => (firstFaces.includes(await k.face()) ? true : null), FACE_MS + 4_000)) === true;
    const firstKept = keptOf(s.id);
    // Signed out, over numbers the file does NOT hold: a run over the same ones would write nothing whoever it was.
    const other = launchLines.findIndex((l) => tailOf(l.payload) !== null && tailOf(rebase(l, s.hello.origin)) !== tailIn(firstKept)) + 1;
    const hadRuns = runsOf(SI, s.hello.pid).length;
    seq = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'launch', from: other, to: other, email: null }]);
    await k.done(s.hello, seq, 10_000);
    const outRuns = runsOf(SI, s.hello.pid).slice(hadRuns);
    const signedOut = { runs: outRuns.length, code: outRuns[0]?.code ?? null, moved: other > 0 && tailOf(rebase(launchLines[other - 1], s.hello.origin)) !== tailIn(firstKept) };
    const signedOutSame = keptOf(s.id) === firstKept;
    const firstHash = hashIn(firstKept);
    const secondFaces = [...new Set(resumeLines.filter((l) => l.payload.quota !== undefined).map((l) => faceOf(rebase(l, s.hello.origin), Date.now())))];
    const samples = [];
    let secondFileAt = 0;
    seq = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'resume', everyMs: 330, email: 'other' }]);
    const until = Date.now() + 16_000;
    while (Date.now() < until) {
      if (secondFileAt === 0 && hashIn(keptOf(s.id)) !== firstHash) secondFileAt = Date.now();
      samples.push({ at: Date.now(), face: (await k.face()) ?? '' });
      await sleep(120);
    }
    await k.done(s.hello, seq, 10_000);
    const found = searchAddresses([PERSON, OTHER, 'person@', 'other@', 'example.com', 'example.org', Buffer.from(PERSON).toString('base64').slice(0, 16)]);
    R.ACCT = { firstDrawn, firstKept, signedOut, secondFileAt, samples, searched: found.files, searchedControl: found.control, unread: found.unread, signedOutSame, firstFaces, secondFaces, finalFace: await k.face(), wantFinal: faceOf(rebase(resumeLines.at(-1), s.hello.origin), Date.now()), hits: found.hits, hashes: [firstHash, hashIn(keptOf(s.id))] };
    await k.kill(s.id);
  });
  return off;
}
const sentence = (t) => {
  const s = String(t).trim();
  return s === '' || s.endsWith('.') ? s : `${s}.`;
};
function logText() {
  let out = '';
  walk(PROFILE, (p) => {
    if (/\.log(\.\d+)?$/.test(p)) out += readFileSync(p, 'utf8');
  }, (p) => /(Cache|IndexedDB|Local Storage|blob_storage)$/.test(p));
  return out;
}

async function life() {
  freshWorld('life');
  const L = { closed: null, reopened: null, aged: null, sweep: null, removed: null, off: null };
  R.LIFE = L;
  const ids = {};
  await launch('p374-H3', 'head', async (k) => {
    await size(k, 1440, 900);
    await k.drive({ projectPath: PROJECT, orientation: 'right' });
    await k.drive({ projectPath: PROJECT, session: { agent: 'shell', name: 'p374-shell' } });
    await k.switch({ antigravity: true });
    const s = await k.create('life');
    ids.one = s.id;
    ids.hello = s.hello;
    const seq = tell(SI, s.hello.pid, [{ op: 'replay', recording: 'launch', from: 1, to: 10, everyMs: 320 }]);
    await k.done(s.hello, seq, 20_000);
    const other = await k.create('life-two');
    ids.two = other.id;
    ids.twoHello = other.hello;
    ids.twoSplice = other.splice;
    await waitFor(async () => ((await k.face()) ?? '').includes('5h'), FACE_MS + 4_000);
    ids.before = await k.face();
  }, { keepServer: true });
  // A pid nobody learned is not a process that has gone.
  const appGone = apps.size > 0 && [...apps].every((p) => Number.isInteger(p) && p > 1 && !alive(p));
  const had = runsOf(SI, ids.hello.pid).length;
  const seq = tell(SI, ids.hello.pid, [{ op: 'replay', recording: 'launch', from: 11, to: 42, everyMs: 320 }]);
  await waitFor(() => {
    const s = stateOf(SI, ids.hello.pid);
    return s !== null && s.seq >= seq && s.pending === 0 && s.inFlight === false && runsOf(SI, ids.hello.pid).length >= s.runs ? true : null;
  }, 40_000);
  const closed = runsOf(SI, ids.hello.pid).slice(had);
  L.closed = { runs: closed.length, appGone, zero: closed.filter((r) => r.code === 0).length, nonZero: closed.filter((r) => r.code !== null && r.code !== 0).length, bytes: closed.reduce((a, r) => a + r.out + r.err, 0) };
  // What no row owns: a whole reading of another account, the NEWEST file of all, a leftover, a stranger's note.
  const orphan = randomUUID();
  const orphanPayload = rebase(readRecording('resume').at(-1), Date.now());
  const orphanFace = faceOf(orphanPayload, Date.now());
  writeFileSync(join(METER, `${orphan}.json`), `{"v":1,"h":"${'b'.repeat(64)}",${tailOf(orphanPayload)}\n`, { mode: 0o600 });
  writeFileSync(join(METER, `${ids.one}.json.4242.tmp`), '{', { mode: 0o600 });
  writeFileSync(join(METER, 'notes.txt'), 'a stranger’s\n');
  L.sweep = { planted: [`${orphan}.json`, `${ids.one}.json.4242.tmp`, 'notes.txt', `${ids.one}.json`].filter((n) => existsSync(join(METER, n))).length, orphanFace, orphanFaceSeen: false };
  const fileAt = statSync(meterFile(ids.one)).mtimeMs;
  const want = faceOf(rebase(readRecording('launch').at(-1), ids.hello.origin), Date.now());
  // Two reopenings: the first on the fresh number, the second over a file aged while the app was closed.
  await launch('p374-H4', 'head', async (k) => {
    await size(k, 1440, 900);
    await k.drive({ projectPath: PROJECT, orientation: 'right' });
    await waitFor(async () => ((await k.face()) ?? '').includes('5h'), 20_000, 100);
    const face = await k.face();
    for (let i = 0; i < 40; i += 1) {
      if ((await k.face()) === orphanFace) L.sweep.orphanFaceSeen = true;
      await sleep(150);
    }
    L.reopened = { face, before: ids.before ?? null, want, readAt: (await k.row())?.readAt ?? null, fileAt };
    L.sweep.orphanGone = !existsSync(join(METER, `${orphan}.json`));
    L.sweep.tmpGone = !existsSync(join(METER, `${ids.one}.json.4242.tmp`));
    L.sweep.strangerStays = existsSync(join(METER, 'notes.txt'));
    L.sweep.ownStays = existsSync(meterFile(ids.one));
  }, { keepServer: true });
  const aged = (Date.now() - 42 * 60_000) / 1000;
  utimesSync(meterFile(ids.one), aged, aged);
  await launch('p374-H5', 'head', async (k) => {
    await size(k, 1440, 900);
    await k.drive({ projectPath: PROJECT, orientation: 'right' });
    await waitFor(async () => ((await k.face()) ?? '').includes('5h'), 20_000, 100);
    const card = await k.card();
    L.aged = { face: await k.face(), state: (await k.row())?.state ?? null, card: card?.lines ?? null };
    // Removed: End, then Remove; its file goes and nothing brings it back.
    await k.kill(ids.one);
    await waitFor(async () => ((await k.list()).find((x) => x.id === ids.one)?.status !== 'running' && !alive(ids.hello.pid) ? true : null), 20_000);
    const hadFile = existsSync(meterFile(ids.one));
    const taken = await k.bridge(`window.gmux.sessions.discard(${J(ids.one)})`);
    await sleep(1_500);
    L.removed = { had: hadFile, taken: taken.ok, fileGone: !existsSync(meterFile(ids.one)) };
    // Off, with the second session still running its line.
    const twoHadFile = existsSync(meterFile(ids.two));
    await k.switch({ antigravity: false });
    await sleep(3_000);
    const s2 = runsOf(SI, ids.twoHello.pid).length;
    const seq2 = tell(SI, ids.twoHello.pid, [{ op: 'replay', recording: 'launch', from: 40, to: 42, everyMs: 320 }]);
    await k.done(ids.twoHello, seq2, 10_000);
    const runs = runsOf(SI, ids.twoHello.pid).slice(s2);
    L.off = { spliced: same(ids.twoSplice, []), hadFile: twoHadFile, zero: runs.filter((r) => r.code === 0).length, left: existsSync(METER) ? readdirSync(METER).sort() : [], rows: (await k.meter()).rows.filter((r) => String(r.hidden ?? '').startsWith('Antigravity')).length, runs: runs.length, nonZero: runs.filter((r) => r.code !== null && r.code !== 0).length, bytes: runs.reduce((a, r) => a + r.out + r.err, 0) };
  });
}

/** The flag in any file of the world but this run's own: a store, a backup, a log, a snapshot. */
function searchFlag() {
  const found = search(['stack_with_default']);
  runFacts.searched += found.files;
  runFacts.unread.push(...found.unread);
  if (found.control) runFacts.searchedWorlds += 1;
  runFacts.flagHits.push(...found.hits);
}

let fatal = null;
try {
  R.OFF = { parent: {}, head: {} };
  R.RECT = {};
  const needFirst = on('OFF', 'ON', 'CAP', 'TYPED', 'ASIDE', 'RECT', 'FLOOR', 'GUARD', 'STATUS', 'ACCT');
  if (needFirst) {
    freshWorld('parent');
    await launch('p374-P1', 'parent', async (k) => {
      const f = await firstHalf(k);
      R.OFF.parent.creates = f.creates;
      R.RECT.parent = f.rect;
      keep.parentFifoMs = f.fifoMs;
    });
    if (on('OFF', 'TYPED') && R.OFF.parent.creates !== null) await launch('p374-P2', 'parent', async (k) => {
      R.OFF.parent.lines = await typedPaths(k, R.OFF.parent.creates.create.id, R.OFF.parent.creates.extras.id);
    });
    endStandIns();
    freshWorld('head');
    await launch('p374-H1', 'head', async (k) => {
      const f = await firstHalf(k);
      R.OFF.head.creates = f.creates;
      R.RECT.head2 = f.rect;
      R.OFF.head.runs = allRuns();
      R.OFF.head.folder = existsSync(METER);
      if (on('TYPED')) {
        // Two more, made with the switch off, for TYPED to restore and Restart with it on.
        const c = await k.create('typed-a');
        const d = await k.create('typed-b', { extraArgs: ['--model', 'example model', '--sandbox'] });
        await conversationFor(k, c, CONV.three);
        await conversationFor(k, d, CONV.four);
        keep.typed = { restore: c.id, restart: d.id };
      }
      await headOn(k);
      if (on('OFF', 'TYPED')) await k.switch({ antigravity: false });
    });
    if (on('OFF', 'TYPED') && R.OFF.head.creates !== null) await launch('p374-H2', 'head', async (k) => {
      R.OFF.head.lines = await typedPaths(k, R.OFF.head.creates.create.id, R.OFF.head.creates.extras.id);
      R.OFF.head.folder = R.OFF.head.folder || existsSync(METER);
      if (on('TYPED') && keep.typed !== undefined) {
        await k.switch({ antigravity: true });
        const t = await typedPaths(k, keep.typed.restore, keep.typed.restart);
        R.TYPED = { switchOn: true, parent: typedLike(R.OFF.parent.lines, CONV.one, CONV.three), head: t };
      }
    });
    searchFlag();
    endStandIns();
  }
  if (on('LIFE')) {
    await step('LIFE', life);
    searchFlag();
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
  report.fatal = fatal;
  writeFileSync(join(OUT, 'probe-p374.json'), `${JSON.stringify(report, null, 1).replaceAll(RUN, '<run>')}\n`, { mode: 0o600 });
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}
/** The parent's lines for one conversation, read as they would be for another: the id alone is replaced. */
function typedLike(lines, from, to) {
  if (lines === undefined || lines === null) return {};
  const swap = (t) => (typeof t === 'string' ? t.replaceAll(from, to) : t);
  return { restore: { armed: swap(lines.restore?.armed) }, resumeInPlace: { line: swap(lines.resumeInPlace?.line) }, restart: lines.restart };
}

say(`report ${join(OUT, 'probe-p374.json')}; ${report.load.join('; ')}`);
say(`${String(report.arms.filter((a) => a.state === 'pass').length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
process.exit(agentsRefused ? 2 : failures > 0 ? 1 : unreadable > 0 || fatal !== null ? 2 : 0);
