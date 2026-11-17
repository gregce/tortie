#!/usr/bin/env node
/**
 * probe:p3251 — Phase 325.1 inside the real app: his own words are known by
 * what he typed, not by when (build/p3251/SPEC.md §8, D3251-16; the Phase
 * 325.1 entry in docs/BACKLOG.md, his ruling "2. a" of 2026-11-08).
 *
 * WHAT IT IS FOR. Words he types or pastes into a session can draw the shape
 * of a numbered question (`1. …`, `2. …`, a hint such as `to cancel`), and the
 * numbered verdict reads them as the agent asking. Phase 325 told his words by
 * TIME and lost real questions drawn within about a second of his last key;
 * 325.1 keeps a record of what he typed, beside the verdict, and asks the
 * verdict again with his characters taken out. The vitest files drive the
 * state machine on a virtual clock over every committed capture; this probe is
 * the one run INSIDE THE APP: the real registry rows launched by Tortie under
 * their bare names, his words through the pane's own xterm, the attach host's
 * tap, the shipped monitor at the unfocused 2 s cadence, a restore across a
 * relaunch, and main's own status and ⌘J's rows read back.
 *
 * IN probe:p321's AND THE DROPPED probe:p353:status S ARMS' SHAPE. Electrons
 * ONE AT A TIME through `build/electron-run.mjs` inside
 * build/harness-socket.mjs: the built parent FIRST (`P3251_PARENT_CHECKOUT`,
 * absent or unbuilt exits 2), then HEAD, each build on its own scratch profile
 * and HOME, every launch on the socket the harness hands it (`gmux-p3251-…`,
 * never `gmux`) named to the helper as `tmuxSocket`, so its read-only census
 * of his session names runs before and after and its teardown ends the
 * scratch server. Each build launches TWICE when arm R runs: the second launch
 * restores a session the first left running, after the helper ended the
 * scratch server between them. No Tortie window is focused (the focus taken
 * away for real over main's inspector, then the app's own blur), so the poll
 * runs at 2 s, MEASURED per arm through a `GMUX_TMUX_BIN` wrapper around the
 * vendored tmux that notes each monitor tick with its clock in ms and every
 * pane's activity stamp; an arm whose span did not tick every 2 s reads
 * UNREADABLE.
 *
 * THE SESSIONS ARE THE REAL REGISTRY ROWS cursor, qwen, opencode, antigravity,
 * claude, grok and pi, launched by their bare names (`cursor-agent`, `qwen`,
 * `opencode`, `agy`, `claude`, `grok`, `pi`), each resolved by the scratch
 * login shell to a wrapper on the build's scratch HOME that `exec`s
 * build/p321/stand-in.mjs under the bare name, which draws only COMMITTED
 * screens (src/main/activity/__tests__/fixtures/, build/fixtures/questions/)
 * and echoes what is typed into the agent's own input row with Phase 325.1's
 * line editor. BEFORE ANY LAUNCH every bare name must resolve to its wrapper
 * (exit 2 otherwise), and a copy of one in a folder the app's scan searches
 * whatever its PATH (`extraBinDirsFor`, src/main/tmux/resolve.ts) refuses the
 * run. GEMINI AND OMP ARE HIDDEN, never stood in: a real `gemini` sits in
 * /usr/local/bin and a real `omp` in /opt/homebrew/bin, folders that scan
 * searches. CODEX IS NOT STOOD IN EITHER: its update prompt is drawn under the
 * opencode row and gemini's trust gate under the pi row, each a row the
 * numbered verdict reads (arm Q names them). Every probed registry row but the
 * seven is HIDDEN (build/hidden-agents.mjs), the checkout's own overlay parser
 * is asked first, and the app's own `agents:list` is read back before any arm.
 * No real agent runs and NO MODEL TURN is spent.
 *
 * HIS WORDS GO THROUGH THE PANE'S OWN XTERM, never `tmux send-keys`: the
 * session is selected, its xterm `Terminal` is found through the React fiber
 * of its mount (no product hook), a key is `term.input(ch, true)` (a line feed
 * between lines) and a paste `term.paste(text)`, so both cross `onData`, the
 * renderer's release, `term:input`, the attach host and its tap as his do. The
 * byte shapes xterm does not make from those two (a cursor key) go through
 * `window.gmux.term.sendInput`, the path `onData` feeds. Every word is MADE UP
 * here; none is his, none is written to the report, and the report carries
 * counts and lengths only.
 *
 * THE ARMS (SPEC §8), each at the parent and at HEAD. HEAD is graded; the
 * parent is READ, and a parent reading that does not hold the arm's premise is
 * UNREADABLE, never a failure.
 *   W  §2.1's three texts, typed and pasted, into each stand-in's input row
 *      and a shell's prompt (48 cells): HEAD no needs input and no ⌘J row over
 *      at least 6 polls after his last key; the parent's needs input where its
 *      own verdict reads a question (the fault, reproduced). Since his ruled
 *      round his lines count only as one block that starts at the input's
 *      prompt mark, and the shell's prompt holds letters (`%~ %# `, a path),
 *      so at HEAD a pasted shell cell the parent's verdict reads as a
 *      question needs input. The parent's own cell beside the agents says
 *      nothing of the shell: its fault holds six agents in a question, and a
 *      session in a question takes one of the tick's six captures before any
 *      other session is read (MAX_CAPTURES_PER_TICK, src/main/activity/
 *      monitor.ts), so the parent never reads the shell's screen there. So W
 *      ends with THE SHELL ALONE, each text typed and pasted into the shell
 *      with every agent's input row empty and no session in a question, and
 *      a shell cell that needs input at HEAD passes only where the parent read
 *      the same text in the shell alone as needs input too, and (the ruled
 *      round's probe review) only when its own premise held, a paste bracketed
 *      and the shell not already in a question before his words; one whose
 *      premise broke is UNREADABLE, never a failure or a pass. A W reading
 *      must be WHOLE (the second ruled round's probe review): every
 *      session, text and way, and the shell alone, and at HEAD each text and
 *      way read as needs input at the parent in an agent's cell, or W is
 *      UNREADABLE (`wordsUnasked`). The shell is
 *      /bin/zsh, the Mac's own login shell (SHELL is set for the app, with the
 *      scratch ZDOTDIR and HISTFILE=/dev/null): macOS's /bin/bash is 3.2,
 *      whose line editor asks for no bracketed paste, so a paste there would
 *      not be a paste. A line typed into the shell runs when its line feed
 *      arrives (`command not found`), which is what a shell does with it.
 *   Q  `please look at the tests` typed, then a real question drawn 0.2, 0.5,
 *      1, 2 and 5 s after his last key: Claude Code 2.1.280's trust gate
 *      (claude row, its registry file absent), qwen's second permission (qwen
 *      row), antigravity's run permission (antigravity row), Codex's update
 *      prompt (opencode row) and gemini's trust gate (pi row). Each draw is
 *      placed half a second before a monitor tick, read off the tick log, so
 *      the tick that raises it is known; HEAD raises every one, its first
 *      needs input no later than the parent's plus one poll, each build held
 *      to its own ticks (`predictRaise`).
 *   C  his unsent line equal to the question's only first-option row (C1b),
 *      a substring of it (C2), its own hint line (C1c) and that hint line
 *      erased with Ctrl-U (C1u), then Claude's numbered trust gate: every one
 *      raised (the fix round raises C1b, whose other rows lie below it, and
 *      C1c, a hint line no prompt leads).
 *   S  his dialog-shaped words, his Enter (a submit), then the same rows drawn
 *      by the agent: raised.
 *   R  a claude session left on Claude's numbered trust gate, the app quit
 *      (its quit takes the snapshot) and the scratch server ended, the app
 *      relaunched and the session restored through the bridge: the replayed
 *      gate grey at HEAD; his Enter on the armed resume, the stand-in's own
 *      gate raised.
 *   F  focus leaving and returning, the pane's own reports, while a real
 *      question is drawn: raised.
 *   E  a typo fixed with Backspace, and a mid-line fix with Left and End:
 *      grey at HEAD, amber at the parent.
 *   LOG HEAD keeps none of his words in writing: none in its app log, none on
 *      its console (where the logger writes every level), and his record, in
 *      the shape main holds it, in none of the files the run left.
 *   RUN no Electron, stand-in, tool or socket of the run left; every launch's
 *      census and teardown clean; his shell history's size and time unmoved;
 *      no crash report of this run's programs.
 *
 * A GREY READING IS READ, NEVER ASSUMED (the probe reviewer's rule). Main's
 * status is polled every 500 ms and a read that fails is a gap, so every watch
 * carries its coverage (`coverageOf`): a cell graded grey whose watch was not
 * read through is UNREADABLE, and so is a question never seen raised over a
 * watch nobody read; only a watch read through can fail.
 *
 * WHAT IT REFUSES. It signals nothing it did not start: every launch is
 * `withElectron`'s, whose kill is in a `finally`; every stand-in and every
 * helper or tool a stand-in reported is ended by pid in this file's `finally`,
 * TERM then KILL, only while its command line is still the one recorded. It
 * never runs `pkill`, never names his server (the helper's census is the only
 * reader of it), installs nothing, reads no credential or conversation store,
 * writes nothing under the person's home, reads his shell history's size and
 * time only, and reads ~/Library/Logs/DiagnosticReports by NAME and mtime
 * only. It refuses a harness directory under /private/tmp, which macOS cleans
 * (SPEC §0): run it with TMPDIR and TMUX_TMPDIR under /private/var/tmp.
 *
 * VERIFIERS ONLY, under a lock slot. Builders write it and run only
 * `--grader-self-test`, which grades recorded fixtures (the probe reviewer's
 * whole recorded runs among them, through `gradeAll`), proves the stand-in's
 * line editor on the arms' own byte shapes and the committed screens the arms
 * draw, and STARTS NOTHING; its one file-scan case writes a folder under
 * TMPDIR and removes it in a finally.
 *
 *   npm run probe:p3251                                   (P3251_PARENT_CHECKOUT required)
 *   P3251_PARENT_CHECKOUT=/path/to/parent npm run probe:p3251
 *   P3251_ARMS=W,Q npm run probe:p3251                    named arms only
 *   P3251_KEEP=1 npm run probe:p3251                      keep the tick log and the polls
 *   node build/p3251/probe-p3251.mjs --grader-self-test   the graders; starts nothing
 *
 * WHAT IT WRITES. `out/p3251/probe-p3251.json`: per build and arm a verdict
 * and a sentence, statuses, timings and the measured cadence, never a line of
 * any screen or a byte of what was typed; with P3251_KEEP=1 also every status
 * poll (times and states) and the scratch run's tick log. Exit 0 when every
 * arm read as expected, 1 when an arm failed, 2 when it could not run or an
 * arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, hiddenAgentsPrecheck, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import {
  BARE_NAME,
  STAND_IN_AGENTS,
  composeInput,
  editInput,
  freshEcho,
  idleScreensFor,
  loadScreen,
  parentDetectDialog,
  refName
} from '../p321/stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const TAG = '[p3251]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sleep = (ms) => new Promise((done) => setTimeout(done, Math.max(0, ms)));
const sleepUntil = (at) => sleep(at - Date.now());

// ---------------------------------------------------------------------------
// What the arms type and draw: made-up words, committed screens
// ---------------------------------------------------------------------------

/**
 * SPEC §2.1's three texts, typed with a line feed between lines and pasted;
 * and (his second ruled round, 2026-11-16) a draft with a blank line between
 * its question and its options, which his ruled round's block read as needs
 * input again until a blank line of his counted as part of his typing.
 */
const TEXTS = [
  ['min', '1. to cancel\n2. x'],
  ['long', 'Do you want me to proceed?\n1. Yes, go ahead\n2. No, stop'],
  ['real', 'Two ways to do this:\n1. keep the cache\n2. drop it\nWould you like me to pick one?'],
  ['gap', 'Do you want me to proceed?\n\n1. Yes, go ahead\n2. No, stop']
];
/** SPEC §2.2's ordinary words, typed before every real question. */
const ORDINARY = 'please look at the tests';
/**
 * C1b: word for word the only first-option row of Claude's numbered trust gate,
 * raised since the fix round (its other rows lie below it). C2: a substring of
 * it. C1c: word for word the gate's own hint line, at its bottom and led by no
 * prompt, raised since the fix round. C1u: that hint line typed and erased
 * with Ctrl-U.
 */
const C1B_LINE = '1. Yes, I trust this folder';
const C2_LINE = 'Yes, I trust';
const C1C_LINE = 'Enter to confirm · Esc to cancel';
/** S: his dialog-shaped words, the rows Claude's numbered trust gate draws. */
const S_ROWS = '1. Yes, I trust this folder\n2. No, exit\nEnter to confirm · Esc to cancel';
/** E: what each fix leaves, as both the stand-in's editor and main's record keep it. */
const E_BACKSPACE = ['1. to cancel', '2. x'];
const E_LEFT = ['1. to cancel', '2. xy'];

const fx = (name) => ({ fixture: name });
const win = (file, id) => ({ window: file, id });
/** Claude Code's numbered trust gate, read by the numbered verdict (and by no shape). */
const Q1 = fx('claude-workspace-trust.txt');
/**
 * Arm Q's five recorded questions, each under the row that reads it (SPEC §8).
 * Codex is not stood in and gemini is hidden, so their questions are drawn
 * under two rows the numbered verdict reads, named here.
 */
const QUESTIONS = [
  { key: 'claude-2.1.280-trust', row: 'claude', screen: fx('claude-trust-2-1-280.txt'), reads: "Claude's shape" },
  { key: 'qwen-permission-2', row: 'qwen', screen: win('a-qwen.jsonl', 'a-qwen-0192'), reads: "qwen's shape" },
  { key: 'antigravity-run-permission', row: 'antigravity', screen: fx('antigravity-run-permission.txt'), reads: 'numbered' },
  { key: 'codex-update-prompt', row: 'opencode', screen: win('a-codex.jsonl', 'a-codex-0002'), reads: 'numbered' },
  { key: 'gemini-trust-gate', row: 'pi', screen: win('a-gemini.jsonl', 'a-gemini-0002'), reads: 'numbered' }
];
const Q_KEYS = QUESTIONS.map((q) => q.key);
const Q_DELAYS = [0.2, 0.5, 1, 2, 5];
/** Every stand-in's input row turned on as an agent's is: a carriage return submits, and a paste arrives bracketed. */
const INPUT_ON = { op: 'input', on: true, submit: true, bracketed: true };

// ---------------------------------------------------------------------------
// The graders: pure functions of the readings, so they can be proved alone
// ---------------------------------------------------------------------------

/** The unfocused cadence's tick (core.ts STATUS_POLL_IDLE_MS), and this probe's own poll of main's status. */
const ONE_POLL_MS = 2_000;
const STATUS_POLL_MS = 500;
/** A devtools round trip and the stand-in's 50 ms command poll, beside the status poll. */
const SLACK_MS = 400;
/** The monitor's own constant (src/main/activity/state-machine.ts QUIET_MS) the prediction re-derives with. */
const QUIET_MS = 2_000;
/** How far the monitor's `now` can trail the wrapper's clock: its own list-panes and the tick's first awaits. */
const NOW_LAG_MS = 100;
/** How long after a question is handed over a capture might still miss it. */
const DIALOG_LAG_MS = 250;
/** SPEC §8 W: at least six polls after his last key. */
const MIN_TICKS_AFTER = 6;
/** How far a question may be drawn off its asked delay and still be that delay's reading. */
const DELAY_TOLERANCE_MS = 200;
/**
 * The longest stretch of a watch with no answered status read that still lets
 * its silence be read. A raised question stays raised until a key or the
 * screen moves it, so a read every two polls sees one; a longer stretch, or
 * none at all, is a watch nobody read, which is UNREADABLE and never grey
 * (the probe reviewer's fix: a poller whose every read failed read as no
 * needs input, so a grey arm passed with main's status never read).
 */
const MAX_POLL_GAP_MS = 2 * ONE_POLL_MS;

/** A ticks-per-second reading counts as the unfocused 2 s cadence. */
export const atTwo = (rate) => rate !== null && rate !== undefined && rate > 0.35 && rate < 0.65;
/** One verdict: true a pass, false a failure, null UNREADABLE. */
const v = (ok, said) => ({ ok, said });
const lineCount = (text) => text.split('\n').length;
const charCount = (lines) => lines.reduce((n, l) => n + [...l].length, 0);

/**
 * How well main's status was read over one watch, `[from, to]` in ms: the
 * reads that answered (each `{ t, s }`), and the longest stretch with none,
 * the two ends included. Counts only.
 */
export function coverageOf(polls, from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return { reads: 0, gapMs: null };
  const at = (Array.isArray(polls) ? polls : []).map((p) => p?.t).filter((t) => Number.isFinite(t) && t >= from && t <= to).sort((a, b) => a - b);
  if (at.length === 0) return { reads: 0, gapMs: Math.round(to - from) };
  let gap = Math.max(at[0] - from, to - at[at.length - 1]);
  for (let i = 1; i < at.length; i += 1) gap = Math.max(gap, at[i] - at[i - 1]);
  return { reads: at.length, gapMs: Math.round(gap) };
}
/** Whether a watch was read through: at least one answered read, and no stretch longer than MAX_POLL_GAP_MS without one. */
export const covered = (c) => Number.isFinite(c?.reads) && c.reads >= 1 && Number.isFinite(c?.gapMs) && c.gapMs <= MAX_POLL_GAP_MS;
const coverSaid = (c) => (Number.isFinite(c?.reads) ? `${String(c.reads)} read(s), the longest stretch without one ${String(c.gapMs)} ms` : 'no coverage recorded');

/**
 * The tick at which the numbered verdict's own rule raises a question over ONE
 * launch's logged ticks: `ticks` is `[{ t, a }]` in ms, each monitor tick's
 * clock as the tmux wrapper logged it a moment before the monitor's own read
 * (so the monitor's `now` is t to t + NOW_LAG_MS) and the pane's
 * `#{window_activity}`. A tick COUNTS when it is quiet (now - a > QUIET_MS)
 * and its capture holds the question (taken after `drawAt`); two counting
 * ticks in a row raise it (DIALOG_CONFIRM_TICKS). Answers `{ at, why }`: the
 * second tick's clock, or null when a tick too near a line decides it, the log
 * holds a read that is not a tick, or too few ticks were logged. Held to its
 * own ticks, each build's lateness is its own: the parent and HEAD are two
 * launches whose ticks fall in different places, so their raw times are never
 * compared.
 */
export function predictRaise(ticks, drawAt, to) {
  if (!Array.isArray(ticks) || !Number.isFinite(drawAt) || !Number.isFinite(to)) return { at: null, why: 'no tick log for the pane' };
  const usable = ticks.filter((k) => Number.isFinite(k?.t) && Number.isFinite(k?.a) && k.t <= to).sort((x, y) => x.t - y.t);
  for (let i = 1; i < usable.length; i += 1) {
    if (usable[i].t - usable[i - 1].t < 1_500) return { at: null, why: 'the tick log holds two reads under 1.5 s apart, so not every line is a monitor tick' };
  }
  const after = usable.filter((k) => k.t + NOW_LAG_MS >= drawAt);
  if (after.length < 3) return { at: null, why: `only ${String(after.length)} logged tick(s) after the question was drawn` };
  const cls = (k) => {
    const age = k.t - k.a;
    const quiet = age > QUIET_MS ? 'yes' : age + NOW_LAG_MS <= QUIET_MS ? 'no' : 'maybe';
    const drawn = k.t >= drawAt + DIALOG_LAG_MS ? 'yes' : k.t + NOW_LAG_MS < drawAt ? 'no' : 'maybe';
    return { t: k.t, certain: quiet === 'yes' && drawn === 'yes', possible: quiet !== 'no' && drawn !== 'no' };
  };
  const c = usable.map(cls);
  for (let i = 1; i < c.length; i += 1) {
    if (c[i - 1].certain && c[i].certain) return { at: c[i].t, why: `two quiet ticks in a row with the question drawn, the second at +${String(Math.round(c[i].t - drawAt))} ms` };
    if (c[i - 1].possible && c[i].possible) return { at: null, why: `a tick at +${String(Math.round(c[i].t - drawAt))} ms sits within ${String(NOW_LAG_MS)} ms of the quiet line or of the draw` };
  }
  return { at: null, why: 'no two quiet ticks in a row with the question drawn before the watch ended' };
}

/** The run's own preconditions: the hidden rows, every bare name the stand-in, only stand-ins resolved, the cadence 2 s. */
export function gradePreconditions(p) {
  if (p?.hidden?.ok !== true) return v(null, `the hidden agents' precheck: ${p?.hidden?.said ?? 'not run'}`);
  if (p?.resolved !== true) return v(null, `a bare name resolves elsewhere: ${J(p?.elsewhere ?? [])}`);
  if (p?.agents?.ok !== true) return v(null, `the app's own agents:list: ${p?.agents?.said ?? 'not read'}`);
  if (!atTwo(p?.rate ?? null)) return v(null, `the monitor ticked ${String(p?.rate)} times a second with a session present, not every 2 s`);
  return v(true, `every bare name the stand-in, ${String(p.agents.said)}, the monitor at ${String(p.rate)} ticks a second`);
}

/** The premises every typed or pasted cell shares; a sentence when one does not hold, else null. */
function cellPremise(cells) {
  const short = cells.filter((c) => !(Number.isFinite(c.ticksAfter) && c.ticksAfter >= MIN_TICKS_AFTER));
  if (short.length > 0) return `${String(short.length)} cell(s) were watched over fewer than ${String(MIN_TICKS_AFTER)} polls after his last key`;
  const lost = cells.filter((c) => c.reached === false);
  if (lost.length > 0) return `his words never reached the input row in ${String(lost.length)} cell(s): ${lost.slice(0, 4).map((c) => `${c.session} ${c.text ?? c.case ?? ''} ${c.how ?? ''}`.trim()).join('; ')}`;
  const plain = cells.filter((c) => c.how === 'pasted' && c.bracketed !== true);
  if (plain.length > 0) return `${String(plain.length)} paste(s) were not bracketed by the pane's terminal, so they were not a paste: ${plain.slice(0, 4).map((c) => c.session).join(', ')}`;
  const before = cells.filter((c) => c.amberBefore === true);
  if (before.length > 0) return `${String(before.length)} session(s) already read needs input before his words, so their reading says nothing`;
  return null;
}

/** The cells that read needs input (or a ⌘J row) with their own premise held: his words reached the row, a paste was a paste, and nothing was blocked before. */
const definiteAmber = (cells) =>
  cells.filter((c) => (c.amber === true || c.panel === true) && c.amberBefore !== true && c.reached !== false && !(c.how === 'pasted' && c.bracketed !== true));

/**
 * HEAD's grey cells are grey only where main's status was read through the
 * whole watch after his last key (`cover`, `coverageOf`); a sentence when one
 * was not, else null. Asked at HEAD alone: the parent is graded on the cells it
 * read as needs input, which were read.
 */
function greyUnread(cells) {
  const unread = cells.filter((c) => c.amber !== true && c.panel !== true && !covered(c.cover));
  if (unread.length === 0) return null;
  return `main's status was not read through the watch after his last key in ${String(unread.length)} cell(s), so their grey says nothing: ${unread
    .slice(0, 3)
    .map((c) => `${c.session} ${c.text ?? c.case ?? ''} ${c.how ?? ''} (${coverSaid(c.cover)})`.replace(/\s+/g, ' ').trim())
    .join('; ')}`;
}

/** A cell that read needs input, or a ⌘J row. */
const lit = (c) => c.amber === true || c.panel === true;

/**
 * HIS RULED ROUND. The parent's reading of the same text, typed or pasted the
 * same way, in the shell ALONE (`alone`), for a cell of the shell: a sentence
 * when it was not read, else that cell. Beside the six agents the parent's
 * fault holds in a question the parent never reads the shell's screen, since
 * each of the tick's six captures goes first to a session in a question
 * (MAX_CAPTURES_PER_TICK, src/main/activity/monitor.ts), so its own cell there
 * says nothing of the shell. Alone it does, unless another session read needs
 * input during the watch (`others`, which must be recorded and 0).
 */
function aloneOf(alone, c) {
  const at = `${String(c.text)} ${String(c.how)}`;
  const a = (Array.isArray(alone) ? alone : []).find((x) => x.text === c.text && x.how === c.how);
  if (a === undefined) return `the parent did not read the shell alone for ${at}`;
  if (a.others !== 0) return `another session read needs input beside the parent's shell alone for ${at}, so its screen may not have been read`;
  const premise = cellPremise([a]);
  if (premise !== null) return `the parent's shell alone for ${at}: ${premise}`;
  if (!lit(a) && !covered(a.cover)) return `main's status was not read through the parent's shell alone for ${at}`;
  return a;
}

/**
 * (W) His words in every input row. A cell is `{ session, agent, text, how,
 * numbered, reached, bracketed, amberBefore, amber, panel, ticksAfter }`;
 * `numbered` is the parent's own numbered verdict over the pane as it read
 * after his words. The parent: the fault reproduces in at least one numbered
 * cell, or HEAD's reading proves nothing. HEAD: no cell needs input and none is
 * a ⌘J row. `parent` is the parent's own verdict on this arm, and
 * `parentReading` the parent's reading of it, whose `alone` cells (the shell
 * alone, `others` the sessions beside it read as needs input) the shell's
 * cells are graded against.
 */
export function gradeWords(r, atParent, parent = null, parentReading = null) {
  const all = Array.isArray(r?.cells) ? r.cells : [];
  if (all.length === 0) return v(null, 'no cell was read');
  // HIS RULED ROUND (build/p3251/SPEC.md §As built): his lines count as his
  // only as one block that starts at the input's prompt mark, and the shell's
  // prompt holds letters (`%~ %# `, a path), so his words there read at HEAD
  // as the parent reads them. A cell of the shell the parent's own verdict
  // reads as a question, and every cell of the shell alone, is graded against
  // the parent's reading of the same text in the shell alone (`aloneOf`):
  // needs input at HEAD where the parent read it grey is a failure, and where
  // the parent read it as needs input too it is counted and named. Every
  // agent's cell is graded as before.
  const shell = atParent ? [] : all.filter((c) => c.agent === 'shell' && c.numbered === true);
  const cells = all.filter((c) => !shell.includes(c));
  const alone = Array.isArray(r?.alone) ? r.alone : [];
  // At HEAD a cell whose own premise held and that read needs input is a
  // failure whatever another cell failed to read: a provable failure is never
  // hidden as unreadable (the probe reviewer's fix).
  const definite = atParent ? [] : definiteAmber(cells);
  if (definite.length > 0) return v(false, `${String(definite.length)} of ${String(cells.length)} cells read needs input or a ⌘J row: ${definite.slice(0, 6).map((c) => `${c.session} ${c.text} ${c.how}`).join('; ')}`);
  const shellLit = atParent ? [] : [...shell, ...alone].filter(lit);
  // THE RULED ROUND'S PROBE REVIEW: a lit shell cell at HEAD is held to its OWN
  // premise, as an agent's cell is (`definiteAmber`): his words reached it, a
  // paste was a paste, and it did not already need input before his words. Only
  // such a cell is compared with the parent's shell alone. One whose premise
  // broke proves nothing either way: it is never a failure (the grader read one
  // already blocked before his words, beside a parent that read grey, as HEAD
  // worse) and never counted as the parent's reading (it passed one whose paste
  // the pane never bracketed).
  const shellHeld = definiteAmber(shellLit);
  const against = shellHeld.map((c) => [c, aloneOf(parentReading?.alone, c)]);
  const worse = against.filter(([, a]) => typeof a !== 'string' && !lit(a)).map(([c]) => c);
  if (worse.length > 0) return v(false, `the shell read needs input at HEAD in ${String(worse.length)} cell(s) where the parent read the same text in the shell alone as grey: ${worse.slice(0, 4).map((c) => `${c.text} ${c.how}${alone.includes(c) ? ' alone' : ''}`).join('; ')}`);
  const premise = cellPremise(cells);
  if (premise !== null) return v(null, premise);
  const numbered = cells.filter((c) => c.numbered === true);
  if (atParent) {
    const fault = numbered.filter((c) => c.amber === true);
    const asked = alone.filter((c) => c.numbered === true);
    const aloneSaid = alone.length === 0 ? '' : `; the shell alone: ${String(asked.filter(lit).length)} of ${String(asked.length)} cell(s) its verdict reads as a question read needs input`;
    return fault.length > 0
      ? v(true, `the parent read ${String(fault.length)} of ${String(numbered.length)} cells its own verdict reads as a question as needs input (the fault, reproduced); ${String(cells.length)} cells${aloneSaid}`)
      : v(null, `the parent read none of ${String(numbered.length)} cells its own verdict reads as a question as needs input, so the fault did not reproduce`);
  }
  // (The probe review of his ruled round took out a second "a cell needs input"
  // failure here: once `premise` is null every lit cell is in `definite`, which
  // already failed above, so it could never fire.)
  if (parent?.ok !== true) return v(null, `the parent did not reproduce the fault (${parent?.said ?? 'not read'}), so HEAD's grey asks nothing`);
  if (numbered.length === 0) return v(null, `none of HEAD's ${String(cells.length)} cells read as a question by the parent's own verdict on the pane, so nothing was asked`);
  const unread = greyUnread(cells);
  if (unread !== null) return v(null, unread);
  const busy = alone.filter((c) => c.others !== 0);
  if (busy.length > 0) return v(null, `another session read needs input beside HEAD's shell alone in ${String(busy.length)} cell(s), so it was not alone`);
  const shellBroke = shellLit.filter((c) => !shellHeld.includes(c));
  if (shellBroke.length > 0) {
    const why = (c) => (c.amberBefore === true ? 'it already read needs input before his words' : c.reached === false ? 'his words never reached it' : "the paste was not bracketed by the pane's terminal");
    return v(null, `the shell read needs input at HEAD in ${String(shellBroke.length)} cell(s) whose own premise did not hold, so they prove nothing either way: ${shellBroke.slice(0, 3).map((c) => `${c.text} ${c.how}${alone.includes(c) ? ' alone' : ''} (${why(c)})`).join('; ')}`);
  }
  const unmatched = against.filter(([, a]) => typeof a === 'string').map(([, a]) => a);
  if (unmatched.length > 0) return v(null, `the shell read needs input at HEAD and ${unmatched[0]}, so it has nothing to be compared with`);
  const asParent = shellLit.length === 0 ? '' : `; the shell's ${String(shellLit.length)} cell(s) behind its prompt, which holds letters, need input as the parent reads the same text in the shell alone`;
  return v(true, `${String(cells.length)} cells, ${String(numbered.length)} a question by the parent's own verdict on the pane: none needs input and none a ⌘J row over at least ${String(MIN_TICKS_AFTER)} polls after his last key, main's status read through every watch${asParent}`);
}

/**
 * (W) THE READING IS WHOLE, AND EACH TEXT WAS ASKED (the second ruled round's
 * probe review). The drive records one cell per session, text and way, and
 * the shell alone once per text and way, or it throws and the arm is
 * UNREADABLE; a reading that lacks one never asked that text there, and
 * `gradeWords` passed it: HEAD's W read PASS with every `gap` cell taken out,
 * as if the blank line had been typed. So a reading that is not whole is
 * UNREADABLE. At HEAD each text and way must also have been read as needs
 * input at the parent in at least one agent's cell whose premise held: the
 * parent's fault is otherwise counted over the whole arm, and HEAD's grey on a
 * text the parent never read as a question asks nothing. Asked only of a W
 * verdict that passed (`GRADE.W`), so a failure is never hidden. A sentence,
 * or null.
 */
export function wordsUnasked(r, atParent, parentReading = null) {
  const ways = TEXTS.flatMap(([text]) => ['typed', 'pasted'].map((how) => [text, how]));
  const sessions = [...STAND_IN_AGENTS.map((a) => `w-${a}`), 'w-shell'];
  const cells = Array.isArray(r?.cells) ? r.cells : [];
  const alone = Array.isArray(r?.alone) ? r.alone : [];
  const has = (list, session, [text, how]) => list.some((c) => c.session === session && c.text === text && c.how === how);
  const missing = sessions.flatMap((s) => ways.filter((w) => !has(cells, s, w)).map(([text, how]) => `${s} ${text} ${how}`));
  if (missing.length > 0) return `${String(missing.length)} cell(s) were never read, so their text was never asked there: ${missing.slice(0, 4).join('; ')}`;
  const lone = ways.filter((w) => !has(alone, 'w-shell', w)).map(([text, how]) => `${text} ${how}`);
  if (lone.length > 0) return `the shell alone was never read for ${lone.slice(0, 4).join('; ')}`;
  if (atParent) return null;
  const pcells = Array.isArray(parentReading?.cells) ? parentReading.cells : [];
  const unasked = ways
    .filter(([text, how]) => definiteAmber(pcells.filter((c) => c.agent !== 'shell' && c.numbered === true && c.text === text && c.how === how)).length === 0)
    .map(([text, how]) => `${text} ${how}`);
  if (unasked.length > 0) return `the parent read no agent's cell of ${unasked.slice(0, 4).join('; ')} as needs input, so HEAD's grey there asks nothing`;
  return null;
}

/**
 * (Q) Every recorded question drawn d s after his last key. A cell is `{ q,
 * delayS, dActualMs, beforeAmber, raised, firstMs, predictedMs, excessMs }`:
 * `excessMs` is how long after its own launch's ticks said it would (the
 * prediction) main first read needs input. The parent raises every one, or
 * that cell is not read. HEAD raises every one, its excess no more than the
 * parent's plus one poll. `parent` is the parent's READING of this arm.
 */
export function gradeQuestions(r, atParent, parent = null) {
  const cells = Array.isArray(r?.cells) ? r.cells : [];
  const want = Q_KEYS.length * Q_DELAYS.length;
  if (cells.length < want) return v(null, `${String(cells.length)} of ${String(want)} cells were read`);
  const off = cells.filter((c) => !Number.isFinite(c.dActualMs) || Math.abs(c.dActualMs - c.delayS * 1000) > DELAY_TOLERANCE_MS);
  if (off.length > 0) return v(null, `${String(off.length)} question(s) were drawn more than ${String(DELAY_TOLERANCE_MS)} ms off their delay: ${off.slice(0, 4).map((c) => `${c.q} at ${String(c.delayS)} s drawn after ${String(c.dActualMs)} ms`).join('; ')}`);
  const before = cells.filter((c) => c.beforeAmber === true);
  if (before.length > 0) return v(null, `${String(before.length)} session(s) already read needs input before their question was drawn`);
  if (atParent) {
    const missed = cells.filter((c) => c.raised !== true);
    if (missed.length > 0) return v(null, `the parent never raised ${missed.slice(0, 4).map((c) => `${c.q} at ${String(c.delayS)} s`).join(', ')}, so those cells are not read`);
    const firsts = cells.map((c) => c.firstMs).filter(Number.isFinite).sort((a, b) => a - b);
    return v(true, `every question raised at every delay, first needs input ${String(firsts[0])} to ${String(firsts[firsts.length - 1])} ms after the draw`);
  }
  const byCell = new Map((Array.isArray(parent?.cells) ? parent.cells : []).map((c) => [`${c.q}@${String(c.delayS)}`, c]));
  const fails = [];
  const unread = [];
  for (const c of cells) {
    const name = `${c.q} at ${String(c.delayS)} s`;
    const p = byCell.get(`${c.q}@${String(c.delayS)}`);
    if (p === undefined || p.raised !== true) {
      unread.push(`${name} (the parent ${p === undefined ? 'did not read it' : 'never raised it'})`);
      continue;
    }
    if (c.raised !== true) {
      // Never raised is a failure only over a watch main's status was read through.
      if (covered(c.cover)) fails.push(`${name} was never raised`);
      else unread.push(`${name} (never seen raised, but main's status was not read through its watch: ${coverSaid(c.cover)})`);
      continue;
    }
    if (!Number.isFinite(c.excessMs) || !Number.isFinite(p.excessMs)) {
      unread.push(`${name} (no prediction off ${Number.isFinite(c.excessMs) ? "the parent's" : "HEAD's"} tick log)`);
      continue;
    }
    const allowed = Math.max(0, p.excessMs) + ONE_POLL_MS + STATUS_POLL_MS + SLACK_MS;
    if (c.excessMs > allowed) fails.push(`${name} was first read needs input ${String(c.excessMs)} ms after its own ticks said, against the parent's ${String(p.excessMs)} ms plus one poll (${String(allowed)} ms)`);
  }
  if (fails.length > 0) return v(false, `${String(fails.length)} of ${String(cells.length)} questions late or lost: ${fails.slice(0, 4).join('; ')}`);
  if (unread.length > 0) return v(null, `${String(unread.length)} of ${String(cells.length)} cells not read: ${unread.slice(0, 4).join('; ')}`);
  return v(true, `${String(cells.length)} questions over ${String(Q_DELAYS.length)} delays: every one raised, each no later than the parent's plus one poll`);
}

/**
 * (C) The coincidence boundary. `{ numbered, c1b, c2, c1c, c1u }`, each case
 * `{ reached, bracketed, beforeAmber, raised }`, C1u also `erased`. HEAD, since
 * the fix round, every one raised: C1b (his line word for word the question's
 * only first-option row, its other rows below it), C2 (a substring of that
 * row), C1c (his line word for word the question's own hint line, at its
 * bottom and led by no prompt) and C1u (that hint line erased with Ctrl-U).
 * The residual SPEC Q1 now states (a question's last option with nothing of it
 * below) is drawn by no committed screen, so the vitest rows hold it. The
 * parent: all four raised, or the arm's premise did not hold.
 */
export function gradeCoincidence(r, atParent) {
  const CASES = [['C1b', r?.c1b], ['C2', r?.c2], ['C1c', r?.c1c], ['C1u', r?.c1u]];
  const missing = CASES.filter(([, c]) => c === undefined).map(([name]) => name);
  if (missing.length > 0) return v(null, `${missing.join(' and ')} not read`);
  if (r.numbered !== true) return v(null, "the question drawn did not read as a question by the parent's own verdict on the pane");
  for (const [name, c] of CASES) {
    if (c.reached !== true) return v(null, `${name}: his line never reached the input row`);
    if (c.bracketed !== true) return v(null, `${name}: the paste was not bracketed by the pane's terminal`);
    if (c.beforeAmber === true) return v(null, `${name}: the session already read needs input before the question was drawn`);
    if (c.raised !== true && !covered(c.cover)) return v(null, `${name}: never seen raised, but main's status was not read through its watch (${coverSaid(c.cover)})`);
  }
  if (r.c1u.erased !== true) return v(null, 'C1u: the stand-in kept his line after Ctrl-U, so nothing was erased');
  if (atParent) {
    const raised = CASES.filter(([, c]) => c.raised === true).map(([name]) => name);
    return raised.length === CASES.length
      ? v(true, 'all four questions raised at the parent')
      : v(null, `the parent raised ${raised.join(', ') || 'none'} of C1b, C2, C1c and C1u, so the premise did not hold`);
  }
  const held = [
    ['C1b', r.c1b, "his unsent line, word for word the question's only first-option row with its other rows below it,"],
    ['C2', r.c2, "his unsent line, a substring of the question's row,"],
    ['C1c', r.c1c, "his unsent line, word for word the question's own hint line,"],
    ['C1u', r.c1u, 'his line erased with Ctrl-U']
  ]
    .filter(([, c]) => c.raised !== true)
    .map(([name, , what]) => `${name}: ${what} held the question`);
  return held.length === 0 ? v(true, 'C1b, C2, C1c and C1u raised: no line of his held the question') : v(false, held.join('; '));
}

/** (S) His dialog-shaped words, his Enter, then the same rows drawn by the agent: raised. */
export function gradeSubmit(r, atParent) {
  if (r?.reached !== true) return v(null, 'his words never reached the input row');
  if (r.bracketed !== true) return v(null, "the paste was not bracketed by the pane's terminal");
  if (r.submitted !== true) return v(null, 'the stand-in never took his Enter as a submit');
  if (r.beforeAmber === true) return v(null, 'the session already read needs input before the question was drawn');
  if (r.numbered !== true) return v(null, "the rows drawn did not read as a question by the parent's own verdict on the pane");
  if (r.raised === true) return v(true, 'his words sent, then the same rows drawn by the agent: raised');
  if (!covered(r.cover)) return v(null, `never seen raised, but main's status was not read through the watch (${coverSaid(r.cover)})`);
  return atParent ? v(null, 'the parent never raised the question, so the premise did not hold') : v(false, 'his words, sent with Enter, held the question the agent drew with the same rows');
}

/**
 * (R) The restore. `{ restored, replayed, armed, replayAmber, gateDrawn,
 * gateBefore, gateAmber }`. HEAD: the replayed gate never needs input, and the
 * stand-in's own gate after his Enter does; the parent's replay must have read
 * as a question, or HEAD's grey asks nothing. The parent: its own gate raised.
 * `parent` is the parent's READING of this arm.
 */
export function gradeRestore(r, atParent, parent = null) {
  if (r?.restored !== true) return v(null, 'the session was not restored');
  if (r.replayed !== true) return v(null, 'the restore printed no question to replay');
  if (r.armed !== true) return v(null, 'the restore armed no resume, so his Enter had nothing to start');
  if (r.gateDrawn !== true) return v(null, 'the agent never started after his Enter, so it drew no gate of its own');
  if (r.gateBefore === 'needs_input') return v(null, 'the session still read needs input when the agent drew its own gate, so its raise reads nothing');
  if (atParent) {
    return r.gateAmber === true
      ? v(true, `its own gate raised; the replayed gate ${r.replayAmber === true ? 'needs input, as SPEC §2.4 C9 measured' : 'not needs input this run'}`)
      : v(null, "the agent's own gate after his Enter was never raised at the parent, so the premise did not hold");
  }
  if (r.replayAmber === true) return v(false, "the replayed trust gate read needs input: Tortie's own text taken for the agent asking");
  if (r.gateAmber !== true && covered(r.gateCover)) return v(false, "the agent's own gate after his Enter was never raised");
  if (parent?.replayAmber !== true) return v(null, "the parent did not read the replayed gate as needs input, so HEAD's grey asks nothing");
  if (!covered(r.replayCover)) return v(null, `the replayed gate was never seen as needs input, but main's status was not read through that watch (${coverSaid(r.replayCover)})`);
  if (r.gateAmber !== true) return v(null, `the agent's own gate was never seen raised, but main's status was not read through its watch (${coverSaid(r.gateCover)})`);
  return v(true, "the replayed gate stayed grey, and the agent's own gate after his Enter was raised");
}

/** (F) Focus leaving and returning while a real question is drawn: raised. */
export function gradeFocus(r, atParent) {
  if (r?.drawn !== true) return v(null, 'the question was never drawn');
  if (r.numbered !== true) return v(null, "the question did not read as a question by the parent's own verdict on the pane");
  if (r.beforeAmber === true) return v(null, 'the session already read needs input before the question was drawn');
  if (r.raised === true) return v(true, "raised, with the focus reports through the pane's own xterm");
  if (!covered(r.cover)) return v(null, `never seen raised, but main's status was not read through the watch (${coverSaid(r.cover)})`);
  return atParent ? v(null, 'the parent never raised the question, so the premise did not hold') : v(false, 'never raised after the focus went and came back');
}

/**
 * (E) His words fixed with Backspace, and with Left and End. Cells as W's,
 * one per fix: grey at HEAD where the parent read the corrected words as needs
 * input. `parent` is the parent's own verdict on this arm.
 */
export function gradeEdits(r, atParent, parent = null) {
  const cells = Array.isArray(r?.cells) ? r.cells : [];
  for (const name of ['backspace', 'left']) if (!cells.some((c) => c.case === name)) return v(null, `the ${name} fix was not read`);
  const definite = atParent ? [] : definiteAmber(cells);
  if (definite.length > 0) return v(false, `${definite.map((c) => c.case).join(' and ')} read needs input`);
  const premise = cellPremise(cells);
  if (premise !== null) return v(null, premise);
  const plain = cells.filter((c) => c.numbered !== true);
  if (plain.length > 0) return v(null, `${plain.map((c) => c.case).join(' and ')}: the fixed words did not read as a question by the parent's own verdict on the pane, so the stand-in drew something else`);
  const amber = cells.filter((c) => c.amber === true);
  if (atParent) {
    return amber.length > 0
      ? v(true, `the parent read ${amber.map((c) => c.case).join(' and ')} as needs input (the fault, reproduced)`)
      : v(null, 'the parent read neither fix as needs input, so the fault did not reproduce');
  }
  // (His second ruled round took out a second "read needs input" failure
  // here, as the probe review of his ruled round did in gradeWords: once
  // `premise` is null every lit cell is in `definite`, which already failed
  // above, so it could never fire.)
  if (parent?.ok !== true) return v(null, `the parent did not reproduce the fault (${parent?.said ?? 'not read'}), so HEAD's grey asks nothing`);
  const unread = greyUnread(cells);
  if (unread !== null) return v(null, unread);
  return v(true, 'a typo fixed with Backspace and a mid-line fix with Left and End: both grey, main\'s status read through both watches');
}

/** (RUN) What the run left behind. */
export function gradeRun(x) {
  const bad = [];
  if (Number.isFinite(x?.electronsOfRun) && x.electronsOfRun !== 0) bad.push(`${String(x.electronsOfRun)} Electron process(es) of this run left`);
  if (Number.isFinite(x?.survivors) && x.survivors !== 0) bad.push(`${String(x.survivors)} stand-in or tool process(es) left`);
  if (x?.socketLeft !== false) bad.push("the scratch server's socket file was left");
  if ((x?.thrown ?? 1) !== 0) bad.push(`${String(x?.thrown)} launch(es) the helper's teardown or census refused (its own lines above say why)`);
  if ((x?.crashOurs ?? 1) !== 0) bad.push(`${String(x?.crashOurs)} new crash report(s) of this run's programs`);
  if (bad.length > 0) return v(false, bad.join('; '));
  // The probe review: a process table that could not be read shows nothing
  // left, so it is UNREADABLE and never a clean run.
  if (!Number.isFinite(x?.electronsOfRun) || !Number.isFinite(x?.survivors)) return v(null, 'the process table could not be read, so nothing is shown left or not');
  if ((x?.bodyThrew ?? 0) !== 0) return v(null, `${String(x.bodyThrew)} launch(es) threw before their arms were read`);
  if (x?.historyMoved === null) return v(null, "his shell history's size and time could not be read at both ends of the run, so it was not shown unmoved");
  if (x?.historyMoved !== false) return v(null, 'his shell history moved across the run; his own terminals append on their own, so read it again before calling it this run\'s');
  return v(true, `nothing of the run left, every census and teardown clean, his shell history unmoved, no crash report of the run's programs${x.crashOthers > 0 ? ` (${String(x.crashOthers)} of other programs, noted)` : ''}`);
}

/**
 * Pieces of the made-up words that only his typing ever puts anywhere (no
 * committed screen draws them), so a hit in the app's own log is his words
 * logged and nothing else (SPEC §0, PRIVACY).
 */
const LOG_WORDS = ['please look at the tests', 'Two ways to do this', 'keep the cache', 'Do you want me to proceed', 'cancez', 'cncel'];

/**
 * THE RECORD'S OWN SHAPE (the probe reviewer's fix). Main's record keeps each
 * line as its code points (`OwnWords.lines: string[][]`,
 * src/main/activity/own-words.ts), so a record that is logged or written whole
 * reads `"p","l","e",…` (JSON, which is every app.log line and every console
 * line the app's logger writes), `'p', 'l', 'e', …` (a printed object, its rows
 * broken anywhere), or, for the reader's own code points, `112,108,101,…`: none
 * of them holds a piece above as it is spelled. Each piece of ten code points
 * or more is matched in those spellings too, so a hit is his record and never
 * a screen: a terminal snapshot holds his words as the screen drew them and
 * never one character to a string.
 */
const escapeForRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RECORD_FORMS = LOG_WORDS.filter((w) => [...w].length >= 10).flatMap((w) => {
  const cps = [...w];
  return [
    new RegExp(cps.map((ch) => `["']${escapeForRe(ch)}["']`).join('\\s*,\\s*'), 'g'),
    new RegExp(`(?<![0-9])${cps.map((ch) => String(ch.codePointAt(0))).join('\\s*,\\s*')}(?![0-9])`, 'g')
  ];
});
const countOf = (text, re) => {
  re.lastIndex = 0;
  return (String(text).match(re) ?? []).length;
};
/** His record, in the shape main holds it, found in a text: a count, never a line. */
export function recordHits(text) {
  return RECORD_FORMS.reduce((n, re) => n + countOf(text, re), 0);
}
/** His words in a text, as he typed them or as his record holds them: a count, never a line. */
export function wordHits(text) {
  const t = String(text ?? '');
  return LOG_WORDS.reduce((n, w) => n + t.split(w).length - 1, 0) + recordHits(t);
}

/** A file bigger than this is not read for his record, and is counted as not read. */
const SCAN_FILE_MAX_BYTES = 128 * 1024 * 1024;

/**
 * Every regular file under the given folders (links and sockets left alone),
 * each read for his RECORD in the shape main holds it (`recordHits`): how many
 * were read, how many places hold it, and how many could not be read. Counts
 * only, never a line.
 */
export function scanFilesForRecord(dirs) {
  let scanned = 0;
  let fileHits = 0;
  let unreadFiles = 0;
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      if (err?.code !== 'ENOENT') unreadFiles += 1;
      return;
    }
    for (const e of entries) {
      const path = join(dir, e.name);
      if (e.isDirectory()) walk(path);
      else if (e.isFile()) {
        try {
          if (statSync(path).size > SCAN_FILE_MAX_BYTES) {
            unreadFiles += 1;
            continue;
          }
          fileHits += recordHits(readFileSync(path, 'latin1'));
          scanned += 1;
        } catch {
          unreadFiles += 1;
        }
      }
    }
  };
  for (const d of dirs) walk(d);
  return { scanned, fileHits, unreadFiles };
}

/**
 * (LOG) What the run leaves in writing, read after the build's last launch,
 * counts only: `files` and `hits`, the app's own log (`<profile>/logs/app.log`
 * and its pair) through `wordHits`; `consoleRead` and `consoleHits`, everything
 * each launch of the build wrote on its console, where the logger writes every
 * line at every level (app.log keeps info and above, so a debug line or a bare
 * `console.log` is on the console alone); and `scanned`, `fileHits` and
 * `unreadFiles`, every file the run left under its harness directory read for
 * his RECORD (`recordHits`; his words as the screen drew them are in a
 * terminal snapshot by design, so only the record's own shape counts there).
 * HEAD keeps none of it; a part that was not read is UNREADABLE, never a pass.
 * The parent's counts are printed and never graded.
 */
export function gradeLog(x) {
  const bad = [];
  if (Number.isFinite(x?.hits) && x.hits > 0) bad.push(`the app's own log holds his words ${String(x.hits)} time(s)`);
  if (Number.isFinite(x?.consoleHits) && x.consoleHits > 0) bad.push(`the app's console holds his words ${String(x.consoleHits)} time(s)`);
  if (Number.isFinite(x?.fileHits) && x.fileHits > 0) bad.push(`${String(x.fileHits)} place(s) in the build's files hold his record`);
  if (bad.length > 0) return v(false, bad.join('; '));
  if (!Number.isFinite(x?.files) || x.files === 0 || !Number.isFinite(x?.hits)) return v(null, 'there was no app log to read');
  if (x?.consoleRead !== true || !Number.isFinite(x?.consoleHits)) return v(null, "the app's console was not read for every launch of the build");
  if (!Number.isFinite(x?.scanned) || x.scanned === 0 || !Number.isFinite(x?.fileHits)) return v(null, "the build's files were not read");
  if (x?.unreadFiles !== 0) return v(null, `${String(x?.unreadFiles)} of the build's files could not be read, so they were not shown to hold nothing`);
  return v(true, `none of his words in the app's own log (${String(x.files)} file(s)) or on its console, and his record in none of the build's ${String(x.scanned)} files`);
}

/** Each arm's grader, handed the parent's READING or its VERDICT as the arm needs. */
const GRADE = {
  // A W verdict that passed is held to a whole reading, each text asked (`wordsUnasked`).
  W: (r, p, parent) => {
    const g = gradeWords(r, p, parent.verdict, parent.reading);
    const unasked = g.ok === true ? wordsUnasked(r, p, parent.reading) : null;
    return unasked === null ? g : v(null, unasked);
  },
  Q: (r, p, parent) => gradeQuestions(r, p, parent.reading),
  C: (r, p) => gradeCoincidence(r, p),
  S: (r, p) => gradeSubmit(r, p),
  R: (r, p, parent) => gradeRestore(r, p, parent.reading),
  F: (r, p) => gradeFocus(r, p),
  E: (r, p, parent) => gradeEdits(r, p, parent.verdict)
};

/**
 * Every verdict of a run, from its recorded readings, exactly as the run
 * records them (the probe reviewer moved this out of the run so the self-test
 * drives the very wiring the run uses): the parent first, its preconditions,
 * then each named arm; a parent reading that fails is READ and not graded; a
 * verdict over a span the monitor did not tick every 2 s is UNREADABLE. Answers
 * `[[build, id, verdict]]` in the order the run prints them. Pure: it changes
 * nothing it is handed.
 */
export function gradeAll(readingsByBuild, arms, builds = [{ label: 'parent', atParent: true }, { label: 'head', atParent: false }], grades = GRADE) {
  const lines = [];
  const verdicts = {};
  for (const build of builds) {
    const readings = readingsByBuild?.[build.label] ?? {};
    verdicts[build.label] = {};
    const pre = gradePreconditions(readings.preconditions ?? {});
    lines.push([build.label, 'preconditions', pre]);
    if (pre.ok !== true) continue;
    const own = { ...readings };
    if (arms.has('R') && readings.preconditionsTwo !== undefined) {
      const two = gradePreconditions(readings.preconditionsTwo);
      lines.push([build.label, 'preconditions (second launch)', two]);
      if (two.ok !== true) own.R = { unreadable: `the second launch's preconditions: ${two.said}` };
    }
    for (const [id, grade] of Object.entries(grades)) {
      if (!arms.has(id)) continue;
      const r = own[id];
      if (r === undefined) {
        lines.push([build.label, id, v(null, 'the arm was not read')]);
        continue;
      }
      if (typeof r.unreadable === 'string') {
        verdicts[build.label][id] = v(null, r.unreadable);
        lines.push([build.label, id, verdicts[build.label][id]]);
        continue;
      }
      const parent = { reading: readingsByBuild?.parent?.[id] ?? null, verdict: verdicts.parent?.[id] ?? null };
      const g0 = grade(r, build.atParent, parent);
      // The parent is READ, never graded: a parent that does not read as an
      // arm's premise says leaves that arm's side by side unread.
      const g = build.atParent && g0.ok === false ? v(null, `at the parent, read and not graded: ${g0.said}`) : g0;
      const graded = g.ok !== null && !atTwo(r.rate ?? null) ? v(null, `${g.said}, but the monitor ticked ${String(r.rate)} times a second across this arm, not every 2 s`) : g;
      verdicts[build.label][id] = graded;
      lines.push([build.label, id, graded]);
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// --grader-self-test: recorded fixtures, each grader asked over what must
// pass, then each clause broken on its own, which must read red; the stand-in's
// line editor on the arms' own byte shapes; the committed screens the arms
// draw. It starts nothing.
// ---------------------------------------------------------------------------

function graderSelfTest() {
  const D0 = 1_800_000_000_300;
  /** A launch whose question was drawn 550 ms before a tick, its ticks every 2 s from there. */
  const aligned = (draw, n = 6) => Array.from({ length: n }, (_, k) => ({ t: draw + 550 + 2_000 * k, a: Math.floor(draw / 1_000) * 1_000 }));
  const pre = { hidden: { ok: true, said: 'h' }, resolved: true, agents: { ok: true, said: 's' }, rate: 0.5 };
  /** A watch read every 500 ms, and one nobody read. */
  const READ = { reads: 26, gapMs: 610 };
  const UNREAD = { reads: 0, gapMs: 14_000 };
  const wcell = (o = {}) => ({ session: 'w-qwen', agent: 'qwen', text: 'min', chars: 16, how: 'typed', numbered: true, reached: true, bracketed: null, amberBefore: false, amber: false, panel: false, ticksAfter: 6, cover: READ, ...o });
  const wHead = { cells: [wcell(), wcell({ how: 'pasted', bracketed: true }), wcell({ session: 'w-cursor', agent: 'cursor', numbered: false })] };
  const wParent = { cells: [wcell({ amber: true }), wcell({ how: 'pasted', bracketed: true, amber: true }), wcell({ session: 'w-cursor', agent: 'cursor', numbered: false })] };
  const OK = { ok: true, said: 'reproduced' };
  /** His ruled round: a shell cell its verdict reads as a question, and the same paste in the shell alone. */
  const shellLit = (o = {}) => wcell({ session: 'w-shell', agent: 'shell', text: 'long', how: 'pasted', bracketed: true, reached: null, amber: true, panel: true, ...o });
  const aloneCell = (o = {}) => shellLit({ others: 0, ...o });
  const qcells = (f = () => ({})) => Q_KEYS.flatMap((q) => Q_DELAYS.map((d) => ({ q, row: 'x', delayS: d, dActualMs: d * 1000 + 20, beforeAmber: false, raised: true, firstMs: 4_800, predictedMs: 4_550, excessMs: 250, cover: READ, ...f(q, d) })));
  const qParent = { cells: qcells() };
  const at = (q, d) => (q === 'qwen-permission-2' && d === 0.5);
  const ccase = (o = {}) => ({ reached: true, bracketed: true, beforeAmber: false, raised: true, cover: READ, ...o });
  const cBase = { numbered: true, c1b: ccase(), c2: ccase(), c1c: ccase(), c1u: ccase({ erased: true }) };
  const sBase = { bracketed: true, reached: true, submitted: true, beforeAmber: false, numbered: true, raised: true, cover: READ };
  const rHead = { restored: true, replayed: true, armed: true, replayAmber: false, replayCover: READ, gateDrawn: true, gateBefore: 'running', gateAmber: true, gateCover: READ };
  const rParent = { ...rHead, replayAmber: true };
  const fBase = { drawn: true, numbered: true, beforeAmber: false, raised: true, cover: READ };
  const ecell = (c, o = {}) => ({ case: c, session: `e-${c}`, reached: true, numbered: true, amberBefore: false, amber: false, ticksAfter: 6, cover: READ, ...o });
  const eHead = { cells: [ecell('backspace'), ecell('left')] };
  const eParent = { cells: [ecell('backspace', { amber: true }), ecell('left', { amber: true })] };
  const runBase = { electronsOfRun: 0, survivors: 0, socketLeft: false, thrown: 0, crashOurs: 0, crashOthers: 0, historyMoved: false };
  const logBase = { files: 1, hits: 0, consoleRead: true, consoleHits: 0, scanned: 412, fileHits: 0, unreadFiles: 0 };

  /**
   * THE PROBE REVIEWER'S RECORDED FIXTURES (Phase 325.1, docs/method/
   * HOW-WE-BUILT-THIS.md rule 9). Whole readings in the exact shape the arms
   * record them, both builds, driven through `gradeAll`, the wiring the run
   * itself uses: an honest run, and broken runs of each kind the brief names,
   * being his words read as a question, a real question held grey after his
   * keys, and his typed record found in a log or a file; and the readings a run
   * can fail to make, each of which must read UNREADABLE and never pass. The
   * log texts are built here the way the app's logger writes them
   * (src/main/log/format.ts: one JSON object a line, the fields JSON) and the
   * way a printed object reads, around the record's own shape
   * (`OwnWords.lines: string[][]`).
   */
  function reviewerCases() {
    const ALL = new Set(['W', 'Q', 'C', 'S', 'R', 'F', 'E']);
    const COVER = { reads: 27, gapMs: 640 };
    const preRec = { hidden: { ok: true, said: 'every probed row but the seven hidden' }, resolved: true, agents: { ok: true, said: 'seven stand-ins, nothing else resolved' }, rate: 0.5 };
    const W_SESSIONS = [...STAND_IN_AGENTS, 'shell'];
    // What the parent's own verdict reads after his words, as SPEC §2.1 and the
    // reviewer's zsh measurement found: cursor's arrow is no mark of OPT1, and a
    // shell runs each typed line at its line feed.
    const numberedAt = (agent, text, how) => (agent === 'cursor' ? text !== 'min' : agent === 'shell' ? how === 'pasted' && text !== 'min' : true);
    // His ruled round, as the two builds read it: beside the agents its fault
    // holds in a question the parent never reads the shell's screen, and HEAD
    // reads the shell's numbered words behind its prompt as the parent reads
    // them in the shell alone.
    const wRec = (atParent) => ({
      cells: TEXTS.flatMap(([text, words]) =>
        ['typed', 'pasted'].flatMap((how) =>
          W_SESSIONS.map((agent) => {
            const numbered = numberedAt(agent, text, how);
            const drawnAmber = agent === 'shell' ? !atParent && numbered : atParent && numbered;
            return { session: `w-${agent}`, agent, text, chars: words.length, how, numbered, reached: agent === 'shell' ? null : true, bracketed: how === 'pasted' ? true : null, amberBefore: false, amber: drawnAmber, panel: drawnAmber, ticksAfter: 7, cover: COVER };
          })
        )
      ),
      alone: TEXTS.flatMap(([text, words]) =>
        ['typed', 'pasted'].map((how) => {
          const numbered = numberedAt('shell', text, how);
          return { session: 'w-shell', agent: 'shell', text, chars: words.length, how, numbered, reached: null, bracketed: how === 'pasted' ? true : null, amberBefore: false, amber: numbered, panel: numbered, ticksAfter: 7, cover: COVER, others: 0 };
        })
      ),
      rate: 0.5
    });
    const qRec = (atParent) => ({
      cells: Q_KEYS.flatMap((q, i) =>
        Q_DELAYS.map((d, j) => ({ q, row: QUESTIONS[i].row, reads: QUESTIONS[i].reads, delayS: d, dActualMs: d * 1000 + ((i + j) % 3) * 17, aligned: true, beforeAmber: false, raised: true, firstMs: 4_700 + ((i * 5 + j) % 4) * 120 + (atParent ? 0 : 60), predictedMs: 4_550, excessMs: 150 + ((i * 5 + j) % 4) * 120 + (atParent ? 0 : 60), why: 'two quiet ticks in a row with the question drawn, the second at +4550 ms', cover: COVER }))
      ),
      rate: 0.5
    });
    const eRec = (atParent) => ({
      cells: ['backspace', 'left'].map((c) => ({ case: c, session: `e-${c}`, numbered: true, reached: true, amberBefore: false, amber: atParent, ticksAfter: 7, cover: COVER })),
      rate: 0.48
    });
    const buildRec = (atParent) => ({
      preconditions: preRec,
      preconditionsTwo: preRec,
      handoff: { id: 's-r', name: 'r-claude', status: 'needs_input' },
      W: wRec(atParent),
      Q: qRec(atParent),
      C: {
        numbered: true,
        c1b: { bracketed: true, reached: true, beforeAmber: false, raised: true, cover: COVER },
        c2: { bracketed: true, reached: true, beforeAmber: false, raised: true, cover: COVER },
        c1c: { bracketed: true, reached: true, beforeAmber: false, raised: true, cover: COVER },
        c1u: { bracketed: true, reached: true, erased: true, beforeAmber: false, raised: true, cover: COVER },
        rate: 0.5
      },
      S: { bracketed: true, reached: true, submitted: true, beforeAmber: false, numbered: true, raised: true, cover: COVER, rate: 0.51 },
      F: { drawn: true, numbered: true, beforeAmber: false, raised: true, cover: COVER, rate: 0.5 },
      E: eRec(atParent),
      R: { restored: true, replayed: true, armed: true, replayAmber: atParent, replayCover: COVER, gateDrawn: true, gateBefore: 'working', gateAmber: true, gateCover: COVER, rate: 0.49 }
    });
    const honest = () => ({ parent: buildRec(true), head: buildRec(false) });
    /** A copy of the honest run with one change made to it. */
    const withRun = (change) => {
      const r = honest();
      change(r);
      return r;
    };
    const verdictOf = (run, build, id) => gradeAll(run, ALL).find(([b, i]) => b === build && i === id)?.[2]?.ok;
    const cellOf = (cells, session, text, how) => cells.find((c) => c.session === session && c.text === text && c.how === how);
    const qCell = (run, build, key, d) => run[build].Q.cells.find((c) => c.q === key && c.delayS === d);

    // The log texts, as the app writes them, and a terminal snapshot that draws his words as the screen drew them.
    const line = (fields) => JSON.stringify({ ts: '2026-11-08T22:00:00.000Z', level: 'info', scope: 'activity', pid: 4242, proctype: 'main', msg: 'state', ...fields });
    const honestLog = [line({ msg: 'session created', name: 'w-qwen', agent: 'qwen' }), line({ msg: 'tick', sessions: 9, captures: 2 }), line({ msg: 'restore', name: 'r-claude', kind: 'armed' })].join('\n');
    const record = (text) => ({ lines: text.split('\n').map((l) => [...l]), col: 0, size: [...text].length, inPaste: false });
    const loggedRecord = line({ msg: 'own', ownWords: record(ORDINARY) });
    const printedRecord = `[gmux-activity] own ${inspect({ ownWords: record(TEXTS[2][1]) }, { depth: 6, breakLength: 60 })}`;
    const codePoints = line({ msg: 'keys', cps: [...ORDINARY].map((c) => c.codePointAt(0)) });
    const plainLogged = line({ msg: `typed ${ORDINARY}` });
    const snapshot = `~/project-head % \n> ${ORDINARY}\n  Two ways to do this:\n  1. keep the cache\n`;
    const plainOnly = (text) => LOG_WORDS.reduce((n, w) => n + text.split(w).length - 1, 0);

    return [
      // coverageOf and covered
      ['reviewer coverage: read every 500 ms through a 12 s watch', () => covered(coverageOf(Array.from({ length: 25 }, (_, k) => ({ t: 1_000 + 500 * k, s: 'idle' })), 1_000, 13_000)), true],
      ['reviewer coverage: read only in its first second', () => covered(coverageOf([{ t: 1_000, s: 'idle' }, { t: 1_500, s: 'idle' }], 1_000, 13_000)), false],
      ['reviewer coverage: never read', () => J(coverageOf([], 1_000, 13_000)), J({ reads: 0, gapMs: 12_000 })],
      ['reviewer coverage: reads outside the watch count nothing', () => coverageOf([{ t: 500, s: 'idle' }, { t: 13_500, s: 'idle' }], 1_000, 13_000).reads, 0],
      // predictRaise over a recorded-shape tick log: 2 s ticks with tens of ms of jitter, the question 550 ms before one
      ['reviewer predict: jittered 2 s ticks, raised at the third tick after the draw', () => predictRaise(Array.from({ length: 8 }, (_, k) => ({ t: D0 + 550 + 2_000 * k + [12, -27, 31, -8, 19, -30, 4, 22][k], a: Math.floor(D0 / 1_000) * 1_000 })), D0, D0 + 25_000).at, D0 + 550 + 4_000 + 31],
      // An honest run: every verdict of both builds passes
      ['reviewer honest run: every verdict of both builds passes', () => gradeAll(honest(), ALL).every(([, , g]) => g.ok === true), true],
      ['reviewer honest run: 18 verdicts, the preconditions and seven arms a build', () => gradeAll(honest(), ALL).length, 18],
      // His words read as a question at HEAD
      ['reviewer broken: his pasted words read as a question in one HEAD session (W)', () => verdictOf(withRun((r) => Object.assign(cellOf(r.head.W.cells, 'w-qwen', 'long', 'pasted'), { amber: true })), 'head', 'W'), false],
      // His ruled round: the shell's cells are graded against the parent's shell alone, so the
      // reviewer's ⌘J row is planted on an agent's cell, where it is still a failure.
      ['reviewer broken: his words a ⌘J row at HEAD with no amber in the poll (W)', () => verdictOf(withRun((r) => Object.assign(cellOf(r.head.W.cells, 'w-qwen', 'real', 'pasted'), { panel: true })), 'head', 'W'), false],
      ['reviewer broken: the shell needs input at HEAD where the parent read the same paste in the shell alone as grey (W)', () => verdictOf(withRun((r) => Object.assign(cellOf(r.parent.W.alone, 'w-shell', 'long', 'pasted'), { amber: false, panel: false })), 'head', 'W'), false],
      ['reviewer: the parent\'s shell alone read beside a session in a question compares nothing (W)', () => verdictOf(withRun((r) => { cellOf(r.parent.W.alone, 'w-shell', 'real', 'pasted').others = 2; }), 'head', 'W'), null],
      // THE RULED ROUND'S PROBE REVIEW (rule 9): a lit shell cell at HEAD is held
      // to its own premise before it is compared with the parent's shell alone.
      ["reviewer (ruled round): HEAD's shell cell already read needs input before his words, the parent's alone needs input too: no proof either way (W)", () => verdictOf(withRun((r) => { cellOf(r.head.W.cells, 'w-shell', 'real', 'pasted').amberBefore = true; }), 'head', 'W'), null],
      ["reviewer (ruled round): the same cell beside a parent that read the shell alone grey, HEAD's own alone grey too, is no failure either (W)", () => verdictOf(withRun((r) => {
        cellOf(r.head.W.cells, 'w-shell', 'real', 'pasted').amberBefore = true;
        Object.assign(cellOf(r.head.W.alone, 'w-shell', 'real', 'pasted'), { amber: false, panel: false });
        Object.assign(cellOf(r.parent.W.alone, 'w-shell', 'real', 'pasted'), { amber: false, panel: false });
      }), 'head', 'W'), null],
      ["reviewer (ruled round): beside that cell, HEAD's own shell alone needing input where the parent's read grey is still a failure (W)", () => verdictOf(withRun((r) => {
        cellOf(r.head.W.cells, 'w-shell', 'real', 'pasted').amberBefore = true;
        Object.assign(cellOf(r.parent.W.alone, 'w-shell', 'real', 'pasted'), { amber: false, panel: false });
      }), 'head', 'W'), false],
      ["reviewer (ruled round): HEAD's shell alone paste the pane's terminal did not bracket, needing input, is no proof (W)", () => verdictOf(withRun((r) => { cellOf(r.head.W.alone, 'w-shell', 'long', 'pasted').bracketed = false; }), 'head', 'W'), null],
      ["reviewer (ruled round): HEAD's shell paste beside the agents not bracketed, needing input, is no proof (W)", () => verdictOf(withRun((r) => { cellOf(r.head.W.cells, 'w-shell', 'real', 'pasted').bracketed = false; }), 'head', 'W'), null],
      // THE SECOND RULED ROUND'S PROBE REVIEW: a W reading is whole, and each
      // text and way was read as needs input at the parent (`wordsUnasked`).
      ['reviewer (second ruled round): HEAD\'s gap cells missing altogether is no pass (W)', () => verdictOf(withRun((r) => { r.head.W.cells = r.head.W.cells.filter((c) => c.text !== 'gap'); }), 'head', 'W'), null],
      ['reviewer (second ruled round): one HEAD cell missing is no pass (W)', () => verdictOf(withRun((r) => { r.head.W.cells = r.head.W.cells.filter((c) => !(c.session === 'w-cursor' && c.text === 'gap' && c.how === 'pasted')); }), 'head', 'W'), null],
      ['reviewer (second ruled round): HEAD\'s shell alone never read for one text is no pass (W)', () => verdictOf(withRun((r) => { r.head.W.alone = r.head.W.alone.filter((c) => !(c.text === 'gap' && c.how === 'pasted')); }), 'head', 'W'), null],
      ['reviewer (second ruled round): the parent read one text and way as needs input in no agent, so HEAD\'s grey there asks nothing (W)', () => verdictOf(withRun((r) => { for (const c of r.parent.W.cells) if (c.text === 'gap' && c.how === 'typed') Object.assign(c, { amber: false, panel: false }); }), 'head', 'W'), null],
      ['reviewer (second ruled round): the parent\'s own reading missing a text is read and not a pass (W)', () => verdictOf(withRun((r) => { r.parent.W.cells = r.parent.W.cells.filter((c) => c.text !== 'gap'); }), 'parent', 'W'), null],
      ['reviewer (second ruled round): a failure is never hidden by a missing cell (W)', () => verdictOf(withRun((r) => {
        r.head.W.cells = r.head.W.cells.filter((c) => c.text !== 'gap');
        Object.assign(cellOf(r.head.W.cells, 'w-claude', 'long', 'pasted'), { amber: true });
      }), 'head', 'W'), false],
      ['reviewer (second ruled round): a whole reading, every text asked, still passes (W)', () => verdictOf(honest(), 'head', 'W'), true],
      ['reviewer broken: his words amber at HEAD while the parent read nothing, still a failure (W)', () => verdictOf(withRun((r) => {
        r.parent.W.rate = 1;
        Object.assign(cellOf(r.head.W.cells, 'w-claude', 'min', 'typed'), { amber: true });
      }), 'head', 'W'), false],
      ['reviewer broken: his words amber in one HEAD cell while another was watched too briefly, still a failure (W)', () => verdictOf(withRun((r) => {
        Object.assign(cellOf(r.head.W.cells, 'w-opencode', 'long', 'typed'), { amber: true });
        cellOf(r.head.W.cells, 'w-pi', 'min', 'typed').ticksAfter = 4;
      }), 'head', 'W'), false],
      ['reviewer: an amber HEAD cell whose words never reached the row is no proof either way (W)', () => verdictOf(withRun((r) => Object.assign(cellOf(r.head.W.cells, 'w-grok', 'real', 'typed'), { amber: true, reached: false })), 'head', 'W'), null],
      ['reviewer broken: his fixed typo read as a question at HEAD (E)', () => verdictOf(withRun((r) => { r.head.E.cells[0].amber = true; }), 'head', 'E'), false],
      ['reviewer broken: the replayed screen taken for the agent asking at HEAD (R)', () => verdictOf(withRun((r) => { r.head.R.replayAmber = true; }), 'head', 'R'), false],
      // A real question held grey after his keys at HEAD
      ["reviewer broken: Claude Code's trust gate 0.5 s after his last key never raised at HEAD (Q)", () => verdictOf(withRun((r) => Object.assign(qCell(r, 'head', 'claude-2.1.280-trust', 0.5), { raised: false, firstMs: null, excessMs: null })), 'head', 'Q'), false],
      ["reviewer broken: Codex's update prompt 0.2 s after his last key raised two polls late at HEAD (Q)", () => verdictOf(withRun((r) => Object.assign(qCell(r, 'head', 'codex-update-prompt', 0.2), { firstMs: 8_900, excessMs: 4_350 })), 'head', 'Q'), false],
      ["reviewer: qwen's second permission one poll late at HEAD is allowed (Q)", () => verdictOf(withRun((r) => Object.assign(qCell(r, 'head', 'qwen-permission-2', 1), { firstMs: 6_900, excessMs: 2_350 })), 'head', 'Q'), true],
      ['reviewer broken: C2, a substring of the row, held at HEAD (C)', () => verdictOf(withRun((r) => { r.head.C.c2.raised = false; }), 'head', 'C'), false],
      ['reviewer broken: his sent words held the question at HEAD (S)', () => verdictOf(withRun((r) => { r.head.S.raised = false; }), 'head', 'S'), false],
      ['reviewer broken: a question drawn while the focus moved held at HEAD (F)', () => verdictOf(withRun((r) => { r.head.F.raised = false; }), 'head', 'F'), false],
      ["reviewer broken: the agent's own gate after his Enter held at HEAD (R)", () => verdictOf(withRun((r) => { r.head.R.gateAmber = false; }), 'head', 'R'), false],
      // The readings a run can fail to make: UNREADABLE, never a pass
      ['reviewer missing: one HEAD cell whose status was never read is not grey (W)', () => verdictOf(withRun((r) => { cellOf(r.head.W.cells, 'w-pi', 'real', 'typed').cover = UNREAD; }), 'head', 'W'), null],
      ['reviewer missing: a HEAD cell with no coverage recorded is not grey (W)', () => verdictOf(withRun((r) => { delete cellOf(r.head.W.cells, 'w-grok', 'min', 'pasted').cover; }), 'head', 'W'), null],
      ['reviewer missing: a HEAD fix whose status was never read is not grey (E)', () => verdictOf(withRun((r) => { r.head.E.cells[1].cover = { reads: 3, gapMs: 9_000 }; }), 'head', 'E'), null],
      ['reviewer missing: the replayed gate grey over a watch nobody read (R)', () => verdictOf(withRun((r) => { r.head.R.replayCover = UNREAD; }), 'head', 'R'), null],
      ['reviewer missing: a question never seen raised over a watch nobody read is not a failure (Q)', () => verdictOf(withRun((r) => Object.assign(qCell(r, 'head', 'gemini-trust-gate', 2), { raised: false, firstMs: null, excessMs: null, cover: UNREAD })), 'head', 'Q'), null],
      ['reviewer missing: C2 never seen raised over a watch nobody read (C)', () => verdictOf(withRun((r) => Object.assign(r.head.C.c2, { raised: false, cover: UNREAD })), 'head', 'C'), null],
      ['reviewer missing: S never seen raised over a watch nobody read (S)', () => verdictOf(withRun((r) => Object.assign(r.head.S, { raised: false, cover: UNREAD })), 'head', 'S'), null],
      ['reviewer missing: F never seen raised over a watch nobody read (F)', () => verdictOf(withRun((r) => Object.assign(r.head.F, { raised: false, cover: UNREAD })), 'head', 'F'), null],
      ["reviewer missing: the agent's own gate never seen raised over a watch nobody read (R)", () => verdictOf(withRun((r) => Object.assign(r.head.R, { gateAmber: false, gateCover: UNREAD })), 'head', 'R'), null],
      ['reviewer missing: an arm HEAD never read', () => verdictOf(withRun((r) => { delete r.head.S; }), 'head', 'S'), null],
      ["reviewer missing: the parent's W over a 1 s cadence leaves HEAD's grey unread", () => verdictOf(withRun((r) => { r.parent.W.rate = 1; }), 'head', 'W'), null],
      ["reviewer missing: HEAD's second launch failed its preconditions, so R is unread", () => verdictOf(withRun((r) => { r.head.preconditionsTwo = { ...preRec, rate: 1 }; }), 'head', 'R'), null],
      ['reviewer wiring: a parent reading shaped like a failure is read and not graded', () => verdictOf(withRun((r) => { r.parent.S.raised = false; }), 'parent', 'S'), null],
      ["reviewer wiring: a grader's failure at the parent is turned into a reading, never graded", () => gradeAll(honest(), new Set(['S']), undefined, { S: () => v(false, 'a failure-shaped reading') }).find(([b, i]) => b === 'parent' && i === 'S')?.[2]?.ok, null],
      ["reviewer wiring: the same grader's failure at HEAD stands", () => gradeAll(honest(), new Set(['S']), undefined, { S: () => v(false, 'a failure-shaped reading') }).find(([b, i]) => b === 'head' && i === 'S')?.[2]?.ok, false],
      ["reviewer wiring: HEAD's S is graded on its own when the parent's was not", () => verdictOf(withRun((r) => { r.parent.S.raised = false; }), 'head', 'S'), true],
      ['reviewer wiring: gradeAll changes nothing it is handed', () => {
        const r = withRun((x) => { x.head.preconditionsTwo = { ...preRec, rate: 1 }; });
        const before = J(r);
        gradeAll(r, ALL);
        return J(r) === before;
      }, true],
      // His typed record found in a log or a file
      ['reviewer log: an honest app.log holds none of his words', () => wordHits(honestLog), 0],
      ['reviewer log: his record logged whole, as the logger writes it, was invisible to the scan by spelling', () => plainOnly(loggedRecord), 0],
      ['reviewer log: his record logged whole, as the logger writes it, is found', () => wordHits(loggedRecord) > 0, true],
      ['reviewer log: his record printed on the console, its rows broken, is found', () => wordHits(printedRecord) > 0, true],
      ["reviewer log: the reader's code points logged are found", () => wordHits(codePoints) > 0, true],
      ['reviewer log: his words logged as he typed them are found', () => wordHits(plainLogged) > 0, true],
      ['reviewer file: his record written into a file is found', () => recordHits(`SQLite format 3\u0000${JSON.stringify({ ownWords: record(TEXTS[1][1]) })}\u0000`) > 0, true],
      ['reviewer file: a terminal snapshot holding his words as the screen drew them is no record', () => recordHits(snapshot), 0],
      ['reviewer log: a run whose log held his record reads LOG failed', () => gradeLog({ ...logBase, hits: wordHits(`${honestLog}\n${loggedRecord}`) }).ok, false],
      ['reviewer log: a run whose console alone printed his record reads LOG failed', () => gradeLog({ ...logBase, consoleHits: wordHits(printedRecord) }).ok, false],
      ['reviewer file: a run whose files held his record reads LOG failed', () => gradeLog({ ...logBase, fileHits: recordHits(JSON.stringify(record(ORDINARY))) }).ok, false],
      // The scanner itself, over the committed question windows, and over a
      // folder of its own (removed in a finally) holding a record, a snapshot
      // and a link.
      ['reviewer file scan: the committed question windows hold no record, every file read', () => {
        const s = scanFilesForRecord([join(ROOT, 'build', 'fixtures', 'questions')]);
        return s.scanned > 0 && s.fileHits === 0 && s.unreadFiles === 0;
      }, true],
      ['reviewer file scan: a record written deep in a folder is found, the snapshot and the link beside it are not', () => {
        const dir = mkdtempSync(join(tmpdir(), 'p3251-scan-'));
        try {
          mkdirSync(join(dir, 'a', 'b'), { recursive: true });
          writeFileSync(join(dir, 'a', 'b', 'state.json'), JSON.stringify({ kept: record(ORDINARY) }));
          writeFileSync(join(dir, 'a', 'snapshot.txt'), snapshot);
          symlinkSync('/usr/bin', join(dir, 'a', 'link'));
          return J(scanFilesForRecord([dir]));
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      }, J({ scanned: 2, fileHits: 1, unreadFiles: 0 })],
      ['reviewer file scan: a folder that is not there reads nothing and is no error', () => J(scanFilesForRecord([join(ROOT, 'build', 'p3251', 'no-such-folder')])), J({ scanned: 0, fileHits: 0, unreadFiles: 0 })]
    ];
  }

  const echo = (submit, chunks) => {
    const e = freshEcho(submit);
    for (const c of chunks) editInput(e, c);
    return J(e.typed);
  };
  const cases = [
    // predictRaise
    ['predict: a question drawn 550 ms before a tick is raised at the third tick after it', () => predictRaise(aligned(D0), D0, D0 + 20_000).at, D0 + 4_550],
    ['predict break: two reads under 1.5 s apart', () => predictRaise([...aligned(D0), { t: D0 + 3_000, a: 0 }], D0, D0 + 20_000).at, null],
    ['predict break: too few ticks after the draw', () => predictRaise(aligned(D0, 2), D0, D0 + 20_000).at, null],
    ['predict break: a tick on the quiet line', () => predictRaise(Array.from({ length: 6 }, (_, k) => ({ t: D0 + 1_650 + 2_000 * k, a: Math.floor(D0 / 1_000) * 1_000 })), D0, D0 + 20_000).at, null],
    ['predict break: the watch ends before two quiet ticks', () => predictRaise(aligned(D0), D0, D0 + 3_000).at, null],
    // preconditions
    ['preconditions held', () => gradePreconditions(pre).ok, true],
    ['preconditions break: the hidden precheck refused', () => gradePreconditions({ ...pre, hidden: { ok: false, said: 'x' } }).ok, null],
    ['preconditions break: a bare name resolved elsewhere', () => gradePreconditions({ ...pre, resolved: false }).ok, null],
    ['preconditions break: a real agent in the app\'s own scan', () => gradePreconditions({ ...pre, agents: { ok: false, said: 'omp at /opt/homebrew/bin/omp' } }).ok, null],
    ['preconditions break: a 1 s cadence', () => gradePreconditions({ ...pre, rate: 1 }).ok, null],
    // W
    ['W HEAD grey everywhere, the parent reproduced', () => gradeWords(wHead, false, OK).ok, true],
    ['W HEAD break: a cell needs input', () => gradeWords({ cells: [...wHead.cells, wcell({ amber: true })] }, false, OK).ok, false],
    ['W HEAD break: a ⌘J row alone', () => gradeWords({ cells: [...wHead.cells, wcell({ panel: true })] }, false, OK).ok, false],
    // His ruled round: a shell cell HEAD reads as needs input is graded against the parent's shell alone.
    ['W HEAD: the shell needs input where the parent read the shell alone so too, every agent grey', () => gradeWords({ cells: [...wHead.cells, shellLit()] }, false, OK, { alone: [aloneCell()] }).ok, true],
    ['W HEAD: the shell grey where the parent read the shell alone as needs input', () => gradeWords({ cells: [...wHead.cells, shellLit({ amber: false, panel: false })] }, false, OK, { alone: [aloneCell()] }).ok, true],
    ['W HEAD break: the shell needs input where the parent read the shell alone grey', () => gradeWords({ cells: [...wHead.cells, shellLit()] }, false, OK, { alone: [aloneCell({ amber: false, panel: false })] }).ok, false],
    ['W HEAD break: the shell alone needs input at HEAD where the parent read it grey', () => gradeWords({ cells: wHead.cells, alone: [aloneCell()] }, false, OK, { alone: [aloneCell({ amber: false, panel: false })] }).ok, false],
    ['W HEAD break: the shell needs input and the parent did not read the shell alone', () => gradeWords({ cells: [...wHead.cells, shellLit()] }, false, OK, { alone: [] }).ok, null],
    ['W HEAD break: the parent read the shell alone beside a session in a question', () => gradeWords({ cells: [...wHead.cells, shellLit()] }, false, OK, { alone: [aloneCell({ others: 1 })] }).ok, null],
    ['W HEAD break: the parent read the shell alone with no count of the sessions beside it', () => gradeWords({ cells: [...wHead.cells, shellLit()] }, false, OK, { alone: [aloneCell({ others: undefined })] }).ok, null],
    ['W HEAD break: a session read needs input beside HEAD\'s shell alone', () => gradeWords({ cells: wHead.cells, alone: [aloneCell({ amber: false, panel: false, others: 1 })] }, false, OK, { alone: [aloneCell()] }).ok, null],
    ['W HEAD break: an agent amber beside the shell', () => gradeWords({ cells: [...wHead.cells, shellLit(), wcell({ amber: true })] }, false, OK, { alone: [aloneCell()] }).ok, false],
    ['W HEAD break: only the shell, nothing asked of an agent', () => gradeWords({ cells: [shellLit()] }, false, OK, { alone: [aloneCell()] }).ok, null],
    // The ruled round's probe review: HEAD's own premise before any comparison.
    ['W HEAD break: the shell needs input but already did before his words, beside a parent alone grey: no proof, never a failure', () => gradeWords({ cells: [...wHead.cells, shellLit({ amberBefore: true })] }, false, OK, { alone: [aloneCell({ amber: false, panel: false })] }).ok, null],
    ['W HEAD break: the parent did not reproduce', () => gradeWords(wHead, false, { ok: null, said: 'x' }).ok, null],
    ['W HEAD break: no cell read as a question', () => gradeWords({ cells: [wcell({ numbered: false })] }, false, OK).ok, null],
    ['W break: watched over five polls only', () => gradeWords({ cells: [...wHead.cells, wcell({ ticksAfter: 5 })] }, false, OK).ok, null],
    ['W break: his words never reached the row', () => gradeWords({ cells: [...wHead.cells, wcell({ reached: false })] }, false, OK).ok, null],
    ['W break: a paste the terminal did not bracket', () => gradeWords({ cells: [...wHead.cells, wcell({ how: 'pasted', bracketed: false })] }, false, OK).ok, null],
    ['W break: needs input before his words', () => gradeWords({ cells: [...wHead.cells, wcell({ amberBefore: true })] }, false, OK).ok, null],
    ['W break: no cells', () => gradeWords({ cells: [] }, false, OK).ok, null],
    ['W parent: the fault reproduced', () => gradeWords(wParent, true).ok, true],
    ['W parent break: amber only where its verdict reads no question', () => gradeWords({ cells: [wcell({ numbered: false, amber: true })] }, true).ok, null],
    // Q
    ['Q HEAD every question raised on time', () => gradeQuestions({ cells: qcells() }, false, qParent).ok, true],
    ['Q HEAD one poll late is allowed', () => gradeQuestions({ cells: qcells((q, d) => (at(q, d) ? { excessMs: 2_600, firstMs: 7_150 } : {})) }, false, qParent).ok, true],
    ['Q HEAD break: a question never raised', () => gradeQuestions({ cells: qcells((q, d) => (at(q, d) ? { raised: false, firstMs: null, excessMs: null } : {})) }, false, qParent).ok, false],
    ['Q HEAD break: a question two polls late', () => gradeQuestions({ cells: qcells((q, d) => (at(q, d) ? { excessMs: 4_300, firstMs: 8_850 } : {})) }, false, qParent).ok, false],
    ['Q HEAD break: no prediction off its ticks', () => gradeQuestions({ cells: qcells((q, d) => (at(q, d) ? { predictedMs: null, excessMs: null } : {})) }, false, qParent).ok, null],
    ['Q HEAD break: the parent never raised that cell', () => gradeQuestions({ cells: qcells() }, false, { cells: qcells((q, d) => (at(q, d) ? { raised: false } : {})) }).ok, null],
    ['Q break: a cell missing', () => gradeQuestions({ cells: qcells().slice(1) }, false, qParent).ok, null],
    ['Q break: drawn 400 ms off its delay', () => gradeQuestions({ cells: qcells((q, d) => (at(q, d) ? { dActualMs: 900 } : {})) }, false, qParent).ok, null],
    ['Q break: needs input before the draw', () => gradeQuestions({ cells: qcells((q, d) => (at(q, d) ? { beforeAmber: true } : {})) }, false, qParent).ok, null],
    ['Q parent every question raised', () => gradeQuestions(qParent, true).ok, true],
    ['Q parent break: one never raised', () => gradeQuestions({ cells: qcells((q, d) => (at(q, d) ? { raised: false } : {})) }, true).ok, null],
    // C
    ['C HEAD C1b, C2, C1c and C1u raised', () => gradeCoincidence(cBase, false).ok, true],
    ['C HEAD break: C1c held, the gate’s own hint line', () => gradeCoincidence({ ...cBase, c1c: ccase({ raised: false }) }, false).ok, false],
    ['C HEAD break: C1b held, its other rows below it', () => gradeCoincidence({ ...cBase, c1b: ccase({ raised: false }) }, false).ok, false],
    ['C HEAD break: C2 held', () => gradeCoincidence({ ...cBase, c2: ccase({ raised: false }) }, false).ok, false],
    ['C HEAD break: C1u held, a line erased with Ctrl-U kept', () => gradeCoincidence({ ...cBase, c1u: ccase({ erased: true, raised: false }) }, false).ok, false],
    ['C break: the stand-in kept the line after Ctrl-U', () => gradeCoincidence({ ...cBase, c1u: ccase({ erased: false }) }, false).ok, null],
    ['C break: the question read as none', () => gradeCoincidence({ ...cBase, numbered: false }, false).ok, null],
    ['C break: his line never reached the row', () => gradeCoincidence({ ...cBase, c1b: ccase({ reached: false }) }, false).ok, null],
    ['C break: a paste the terminal did not bracket', () => gradeCoincidence({ ...cBase, c2: ccase({ bracketed: false }) }, false).ok, null],
    ['C break: needs input before the draw', () => gradeCoincidence({ ...cBase, c2: ccase({ beforeAmber: true }) }, false).ok, null],
    ['C break: a case missing', () => gradeCoincidence({ numbered: true, c1b: cBase.c1b, c2: cBase.c2, c1u: cBase.c1u }, false).ok, null],
    ['C break: C1b never seen raised over a watch nobody read', () => gradeCoincidence({ ...cBase, c1b: ccase({ raised: false, cover: UNREAD }) }, false).ok, null],
    ['C parent all four raised', () => gradeCoincidence(cBase, true).ok, true],
    ['C parent break: C1c not raised', () => gradeCoincidence({ ...cBase, c1c: ccase({ raised: false }) }, true).ok, null],
    // S
    ['S raised', () => gradeSubmit(sBase, false).ok, true],
    ['S HEAD break: held after his Enter', () => gradeSubmit({ ...sBase, raised: false }, false).ok, false],
    ['S break: his words never reached the row', () => gradeSubmit({ ...sBase, reached: false }, false).ok, null],
    ['S break: a paste the terminal did not bracket', () => gradeSubmit({ ...sBase, bracketed: false }, false).ok, null],
    ['S break: his Enter was no submit', () => gradeSubmit({ ...sBase, submitted: false }, false).ok, null],
    ['S break: needs input before the draw', () => gradeSubmit({ ...sBase, beforeAmber: true }, false).ok, null],
    ['S break: the rows read as no question', () => gradeSubmit({ ...sBase, numbered: false }, false).ok, null],
    ['S parent break: never raised', () => gradeSubmit({ ...sBase, raised: false }, true).ok, null],
    // R
    ['R HEAD the replay grey, the agent\'s own gate raised', () => gradeRestore(rHead, false, rParent).ok, true],
    ['R HEAD break: the replay needs input', () => gradeRestore({ ...rHead, replayAmber: true }, false, rParent).ok, false],
    ['R HEAD break: the agent\'s own gate never raised', () => gradeRestore({ ...rHead, gateAmber: false }, false, rParent).ok, false],
    ['R HEAD break: the parent\'s replay never read as a question', () => gradeRestore(rHead, false, { ...rParent, replayAmber: false }).ok, null],
    ['R break: not restored', () => gradeRestore({ ...rHead, restored: false }, false, rParent).ok, null],
    ['R break: no question replayed', () => gradeRestore({ ...rHead, replayed: false }, false, rParent).ok, null],
    ['R break: no resume armed', () => gradeRestore({ ...rHead, armed: false }, false, rParent).ok, null],
    ['R break: the agent never started', () => gradeRestore({ ...rHead, gateDrawn: false }, false, rParent).ok, null],
    ['R break: still needs input at the gate', () => gradeRestore({ ...rHead, gateBefore: 'needs_input' }, false, rParent).ok, null],
    ['R parent its own gate raised', () => gradeRestore(rParent, true).ok, true],
    ['R parent break: its own gate never raised', () => gradeRestore({ ...rParent, gateAmber: false }, true).ok, null],
    // F
    ['F raised', () => gradeFocus(fBase, false).ok, true],
    ['F HEAD break: never raised', () => gradeFocus({ ...fBase, raised: false }, false).ok, false],
    ['F break: never drawn', () => gradeFocus({ ...fBase, drawn: false }, false).ok, null],
    ['F break: read as no question', () => gradeFocus({ ...fBase, numbered: false }, false).ok, null],
    ['F break: needs input before the draw', () => gradeFocus({ ...fBase, beforeAmber: true }, false).ok, null],
    ['F parent break: never raised', () => gradeFocus({ ...fBase, raised: false }, true).ok, null],
    // E
    ['E HEAD both fixes grey, the parent reproduced', () => gradeEdits(eHead, false, OK).ok, true],
    ['E HEAD break: a fix needs input', () => gradeEdits({ cells: [ecell('backspace'), ecell('left', { amber: true })] }, false, OK).ok, false],
    ['E HEAD break: the parent did not reproduce', () => gradeEdits(eHead, false, { ok: null, said: 'x' }).ok, null],
    ['E break: a fix missing', () => gradeEdits({ cells: [ecell('backspace')] }, false, OK).ok, null],
    ['E break: the stand-in drew something else', () => gradeEdits({ cells: [ecell('backspace'), ecell('left', { numbered: false })] }, false, OK).ok, null],
    ['E break: his words never reached the row', () => gradeEdits({ cells: [ecell('backspace', { reached: false }), ecell('left')] }, false, OK).ok, null],
    ['E break: watched over three polls only', () => gradeEdits({ cells: [ecell('backspace', { ticksAfter: 3 }), ecell('left')] }, false, OK).ok, null],
    ['E break: needs input before his words', () => gradeEdits({ cells: [ecell('backspace', { amberBefore: true }), ecell('left')] }, false, OK).ok, null],
    ['E parent the fault reproduced', () => gradeEdits(eParent, true).ok, true],
    ['E parent break: neither fix amber', () => gradeEdits(eHead, true).ok, null],
    // RUN
    ['RUN nothing left', () => gradeRun(runBase).ok, true],
    ['RUN break: an Electron of the run left', () => gradeRun({ ...runBase, electronsOfRun: 1 }).ok, false],
    ['RUN break: a stand-in left', () => gradeRun({ ...runBase, survivors: 1 }).ok, false],
    ['RUN break: the socket file left', () => gradeRun({ ...runBase, socketLeft: true }).ok, false],
    ['RUN break: a census or teardown refused a launch', () => gradeRun({ ...runBase, thrown: 1 }).ok, false],
    ['RUN break: a crash report of the run', () => gradeRun({ ...runBase, crashOurs: 1 }).ok, false],
    ['RUN break: his history moved', () => gradeRun({ ...runBase, historyMoved: true }).ok, null],
    ['RUN break: a launch threw before its arms were read', () => gradeRun({ ...runBase, bodyThrew: 1 }).ok, null],
    ['RUN break: a process table that could not be read shows no Electron left', () => gradeRun({ ...runBase, electronsOfRun: null }).ok, null],
    ['RUN break: survivors never counted', () => gradeRun({ ...runBase, survivors: undefined }).ok, null],
    ["RUN break: his history's size and time not read", () => gradeRun({ ...runBase, historyMoved: null }).ok, null],
    ['RUN break: a stand-in left beats a process table read in part', () => gradeRun({ ...runBase, electronsOfRun: null, survivors: 2 }).ok, false],
    // LOG
    ['LOG none of his words in the app log, on the console or as his record in a file', () => gradeLog(logBase).ok, true],
    ['LOG break: his words logged', () => gradeLog({ ...logBase, hits: 2 }).ok, false],
    ['LOG break: no log to read', () => gradeLog({ ...logBase, files: 0, hits: null }).ok, null],
    ['LOG break: his words on the console', () => gradeLog({ ...logBase, consoleHits: 1 }).ok, false],
    ['LOG break: his record in a file', () => gradeLog({ ...logBase, fileHits: 1 }).ok, false],
    ['LOG break: a launch whose console was not read', () => gradeLog({ ...logBase, consoleRead: false }).ok, null],
    ['LOG break: no file of the build read', () => gradeLog({ ...logBase, scanned: 0 }).ok, null],
    ['LOG break: a file that could not be read', () => gradeLog({ ...logBase, unreadFiles: 1 }).ok, null],
    ['LOG break: his words in the log beat a console nobody read', () => gradeLog({ ...logBase, hits: 1, consoleRead: false, consoleHits: null }).ok, false],
    ...reviewerCases(),
    // The stand-in's line editor, on the arms' own byte shapes as tmux hands them (End arrives as ESC [ 4 ~).
    ['stand-in E Backspace', () => echo(true, [...'1. to cancez', '\u007f', ...'l\n2. x']), J(E_BACKSPACE)],
    ['stand-in E Left and End', () => echo(true, [...'1. to cncel', '\u001b[D', '\u001b[D', '\u001b[D', '\u001b[D', 'a', '\u001b[4~', ...'\n2. y', '\u001b[D', 'x']), J(E_LEFT)],
    ['stand-in a paste split across chunks, its markers dropped', () => echo(true, ['\u001b[200~1. to ca', 'ncel\r2. x\u001b[2', '01~']), J(['1. to cancel', '2. x'])],
    ['stand-in S his Enter submits', () => echo(true, ['\u001b[200~a\rb\u001b[201~', '\r']), J([])],
    ['stand-in without submit a carriage return is a new line, as before', () => echo(false, ['a\rb']), J(['a', 'b'])],
    ['stand-in a carriage return inside a paste is a new line even with submit', () => echo(true, ['\u001b[200~a\r', 'b\u001b[201~']), J(['a', 'b'])],
    ['stand-in Up and a modified arrow change nothing', () => echo(true, ['ab', '\u001b[A', '\u001b[1;5D', 'c']), J(['abc'])],
    // The committed screens the arms draw, and what the parent's own verdict reads in them.
    ['screens: every question the arms draw is committed', () => [...QUESTIONS.map((q) => q.screen), Q1].every((ref) => loadScreen(ref) !== null), true],
    ['screens: the numbered questions read as one, the two shapes as none', () => J(QUESTIONS.map((q) => parentDetectDialog((loadScreen(q.screen) ?? []).join('\n')))), J([false, false, true, true, true])],
    ['screens: W asks something in every text', () => TEXTS.every(([, t]) => STAND_IN_AGENTS.some((a) => parentDetectDialog(composeInput(a, loadScreen(idleScreensFor(a).idle) ?? [], t.split('\n')).join('\n')))), true],
    ['screens: E\'s fixed words read as a question in antigravity\'s row', () => [E_BACKSPACE, E_LEFT].every((t) => parentDetectDialog(composeInput('antigravity', loadScreen(idleScreensFor('antigravity').idle) ?? [], t).join('\n'))), true],
    ['screens: C\'s lines alone read as no question, S\'s rows as one', () => J([C1B_LINE, C2_LINE, C1C_LINE, S_ROWS].map((t) => parentDetectDialog(composeInput('claude', loadScreen(idleScreensFor('claude').idle) ?? [], t.split('\n')).join('\n')))), J([false, false, false, true])],
    ['stand-in C1u Ctrl-U empties his line', () => echo(true, ['\u001b[200~Enter to confirm · Esc to cancel\u001b[201~', '\u0015']), J([''])]
  ];
  let bad = 0;
  for (const [name, run, want] of cases) {
    let got;
    try {
      got = run();
    } catch (err) {
      got = `threw ${String(err?.message ?? err)}`;
    }
    const ok = got === want;
    if (!ok) bad += 1;
    say(`self-test ${ok ? 'ok  ' : 'FAIL'} ${name}: ${J(got)}${ok ? '' : `, want ${J(want)}`}`);
  }
  say(bad === 0 ? `grader self-test PASS: ${String(cases.length)} cases, nothing started` : `grader self-test FAIL: ${String(bad)} of ${String(cases.length)}`);
  return bad === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The run (verifiers only): everything below starts an Electron
// ---------------------------------------------------------------------------

function refuse(message) {
  process.stderr.write(`${TAG} ${message}\n`);
  process.exit(2);
}

const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '' || SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p3251')) {
  refuse(`GMUX_TMUX_SOCKET is ${J(SOCKET)}, not a gmux-p3251 harness socket. Run it as \`npm run probe:p3251\`.`);
}
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
mkdirSync(HARNESS_DIR, { recursive: true });
if (/^\/(private\/)?tmp(\/|$)/.test(realpathSync(HARNESS_DIR))) {
  refuse(`the harness directory ${realpathSync(HARNESS_DIR)} is under /private/tmp, which macOS cleans (build/p3251/SPEC.md §0); set TMPDIR and TMUX_TMPDIR under /private/var/tmp and run it again.`);
}
const PARENT = (process.env['P3251_PARENT_CHECKOUT'] ?? '').trim();
if (PARENT === '') refuse('P3251_PARENT_CHECKOUT is not set: the built parent is launched first and is required (build/p3251/SPEC.md §8).');
if (resolve(PARENT) === ROOT) refuse('P3251_PARENT_CHECKOUT names this checkout; it must name a built parent.');
const BUILDS = [
  { label: 'parent', checkout: resolve(PARENT), atParent: true },
  { label: 'head', checkout: ROOT, atParent: false }
];
for (const b of BUILDS) {
  if (!existsSync(join(b.checkout, 'out', 'main', 'index.js'))) refuse(`${b.checkout} has no build at out/main/index.js. Build it first.`);
}
for (const ref of [...QUESTIONS.map((q) => q.screen), Q1]) {
  if (loadScreen(ref) === null) refuse(`the committed screen ${refName(ref)} is not in this checkout.`);
}
const ARMS = new Set(((process.env['P3251_ARMS'] ?? '').trim() || 'W,Q,C,S,R,F,E').split(',').map((x) => x.trim()));
const KEEP = (process.env['P3251_KEEP'] ?? '') === '1';
const CEILING_MS = 4_500_000;
const COLS = 172;
const ROWS = 52;
/** Between launching the arms' sessions and his first key: each has drawn and gone quiet. */
const SETTLE_MS = 8_000;
/** How long a question is watched after it is drawn. */
const RAISE_WATCH_MS = 25_000;
/** Between two of his keys, and how far before a monitor tick a question is drawn. */
const KEY_GAP_MS = 70;
const ALIGN_LEAD_MS = 550;
/** The stand-in reads its commands every 50 ms: a command written this early lands on the asked delay. */
const APPLY_LEAD_MS = 30;

/** His shell history, size and time only, never a byte of it. */
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

/** His crash reports, by NAME and mtime only (SPEC §0): never opened. */
function crashReports() {
  const dir = join(userInfo().homedir, 'Library', 'Logs', 'DiagnosticReports');
  const out = new Map();
  for (const d of [dir, join(dir, 'Retired')]) {
    let names = [];
    try {
      names = readdirSync(d);
    } catch {
      continue;
    }
    for (const n of names) {
      try {
        out.set(join(d, n), statSync(join(d, n)).mtimeMs);
      } catch {
        /* gone between the read and the stat */
      }
    }
  }
  return out;
}
/** A report a program this run starts would write: the app, its helpers, tmux, node, a shell. */
const OURS_REPORT = /^(Electron|Tortie|tmux|node|zsh|bash|sh|script|sleep|specstory)[ \-_.(]/i;
function crashDiff(before, after) {
  const changed = [...after].filter(([p, m]) => before.get(p) !== m).map(([p]) => p.split('/').pop() ?? p);
  const ours = changed.filter((n) => OURS_REPORT.test(n));
  return { ours, others: changed.length - ours.length };
}

mkdirSync(join(HARNESS_DIR, 'p3251'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p3251'));

/**
 * What one build leaves in writing, read for his words (`gradeLog`): its own
 * app log, `<profile>/logs/app.log` and its pair, through `wordHits`; the
 * console of every launch of the build, read in `launchOnce`; and `files`,
 * every file the run left under its harness directory (both builds' profiles,
 * HOMEs and projects, and whatever the app's harness seams wrote beside them),
 * read ONCE for his record. Only HEAD keeps a record, and a parent has no
 * record to write, so every record-shaped hit there is HEAD's. Counts only.
 */
function scanBuild(label, files) {
  const dir = join(RUN, `profile-${label}`, 'logs');
  const ofBuild = report.launches.filter((l) => l.build === label);
  const consoleRead = ofBuild.length > 0 && ofBuild.every((l) => l.consoleRead === true && Number.isFinite(l.consoleHits));
  const consoleHits = ofBuild.reduce((n, l) => n + (Number.isFinite(l.consoleHits) ? l.consoleHits : 0), 0);
  files = { ...files };
  let names = [];
  try {
    names = readdirSync(dir).filter((n) => /^app\.log(\.\d+)?$/.test(n));
  } catch {
    return { files: 0, hits: null, consoleRead, consoleHits, ...files };
  }
  let hits = 0;
  for (const f of names) {
    try {
      hits += wordHits(readFileSync(join(dir, f), 'utf8'));
    } catch {
      // A log that could not be read was not shown to hold nothing.
      files.unreadFiles += 1;
    }
  }
  return { files: names.length, hits, consoleRead, consoleHits, ...files };
}
const NODE_BIN = join(RUN, 'nodebin');
const STANDIN_DIR = join(RUN, 'standin');
const TICK_LOG = join(RUN, 'monitor-ticks.log');
/** Beside each tick's second, the tick's clock in ms and every pane's `#{window_activity}`, read a moment before the monitor's own read. */
const PHASE_LOG = join(RUN, 'monitor-phase.log');
const TMUX_WRAPPER = join(RUN, 'tmux-counting');
const STAND_IN = join(ROOT, 'build', 'p321', 'stand-in.mjs');
const homeOf = (label) => join(RUN, `home-${label}`);
const binOf = (label) => join(homeOf(label), '.local', 'bin');
const projectOf = (label) => join(RUN, `project-${label}`);
const loginPathOf = (label) => `${binOf(label)}:/usr/bin:/bin:/usr/sbin:/sbin`;
const appPathOf = (label) => `${binOf(label)}:${NODE_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** The seven stand-ins; every other probed row is hidden, gemini and omp among them. */
const STAND_INS = STAND_IN_AGENTS;
const HIDDEN_PREFIX = 'p3251';
const HIDDEN_IDS = hiddenAgentsBesides(STAND_INS);
/** Every Claude Code session variable, the terminal's own names and his shell's dot-folder, removed from the app. */
const STRIPPED = Object.fromEntries(
  Object.keys(process.env)
    .filter((name) => /^(?:CLAUDECODE|CLAUDE_)/.test(name) || ['ZDOTDIR', 'TERM_SESSION_ID', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION', 'TMUX', 'TMUX_PANE'].includes(name))
    .map((name) => [name, undefined])
);

const report = { builds: {}, readings: {}, launches: [], historyBefore: HISTORY_BEFORE };
let failures = 0;
let unreadable = 0;
const record = (build, id, verdict) => {
  report.builds[build] ??= [];
  report.builds[build].push({ id, ...verdict });
  if (verdict.ok === false) failures += 1;
  if (verdict.ok === null) unreadable += 1;
  say(`${verdict.ok === null ? 'UNREADABLE' : verdict.ok ? 'PASS' : 'FAIL'} [${build}] ${id}: ${verdict.said}`);
};
class Unreadable extends Error {}

// ---------------------------------------------------------------------------
// The processes this run started, ended by pid in the finally
// ---------------------------------------------------------------------------

const commandOf = (pid) => (spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
const ours = new Map();
const noteProc = (pid) => {
  if (Number.isInteger(pid) && pid > 1 && !ours.has(pid)) {
    const cmd = commandOf(pid);
    if (cmd !== '') ours.set(pid, cmd);
  }
};
/** A pane's process and every descendant, by parent pid, so the finally can end them. */
function noteTree(root) {
  const ps = spawnSync('/bin/ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' });
  const kids = new Map();
  for (const line of (ps.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)/.exec(line);
    if (m === null) continue;
    const [pid, ppid] = [Number(m[1]), Number(m[2])];
    if (!kids.has(ppid)) kids.set(ppid, []);
    kids.get(ppid).push(pid);
  }
  const stack = [root];
  const seen = new Set();
  while (stack.length > 0) {
    const pid = stack.pop();
    if (seen.has(pid)) continue;
    seen.add(pid);
    noteProc(pid);
    for (const k of kids.get(pid) ?? []) stack.push(k);
  }
}
async function endByPid(pids) {
  const live = pids.filter((pid) => ours.has(pid) && commandOf(pid) === ours.get(pid));
  for (const pid of live) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
  if (live.length === 0) return { asked: 0, killed: 0 };
  await sleep(1_500);
  const still = live.filter((pid) => commandOf(pid) === ours.get(pid));
  for (const pid of still) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  return { asked: live.length, killed: still.length };
}

// ---------------------------------------------------------------------------
// tmux, on this run's socket only
// ---------------------------------------------------------------------------

const VENDORED = [join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux')].find((p) => existsSync(p)) ?? null;
const tmuxRun = (args) => spawnSync(VENDORED ?? 'tmux', ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 15_000 });
function paneOf(tmuxName) {
  const r = tmuxRun(['list-panes', '-a', '-F', '#{session_name}\t#{pane_id}\t#{pane_pid}']);
  for (const line of (r.stdout ?? '').split('\n')) {
    const [name, paneId, pid] = line.split('\t');
    if (name === tmuxName && paneId !== undefined) return { paneId, panePid: Number(pid) };
  }
  return null;
}
/** The visible screen as the monitor captures it (`capture-pane -p`, monitor.ts), for this probe's own reading only. */
const screenOf = (paneId) => (paneId === null ? '' : (tmuxRun(['capture-pane', '-p', '-t', paneId]).stdout ?? ''));
/** The same with wrapped lines joined, so a long command line reads whole. */
const joinedScreenOf = (paneId) => (paneId === null ? '' : (tmuxRun(['capture-pane', '-p', '-J', '-t', paneId]).stdout ?? ''));
const socketFile = () => join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid())}`, SOCKET);

// ---------------------------------------------------------------------------
// The stand-ins
// ---------------------------------------------------------------------------

function hellos() {
  if (!existsSync(STANDIN_DIR)) return [];
  const out = [];
  for (const n of readdirSync(STANDIN_DIR)) {
    if (!/^hello-\d+\.json$/.test(n)) continue;
    try {
      out.push(JSON.parse(readFileSync(join(STANDIN_DIR, n), 'utf8')));
    } catch {
      /* written a beat ago */
    }
  }
  return out;
}
function stateOf(pid) {
  try {
    return JSON.parse(readFileSync(join(STANDIN_DIR, `state-${String(pid)}.json`), 'utf8'));
  } catch {
    return null;
  }
}
const cmdSeq = new Map();
/** One command to a stand-in, waited on until it says it applied it; answers its state, whose `at` is when. */
async function tell(pid, ops, waitMs = 3_000) {
  const seq = (cmdSeq.get(pid) ?? 0) + 1;
  cmdSeq.set(pid, seq);
  writeFileSync(join(STANDIN_DIR, `cmd-${String(pid)}.json`), J({ seq, ops }));
  const started = Date.now();
  while (Date.now() - started < waitMs) {
    const st = stateOf(pid);
    if ((st?.seq ?? 0) >= seq) return st;
    await sleep(20);
  }
  throw new Unreadable(`the stand-in ${String(pid)} did not apply command ${String(seq)} within ${String(waitMs)} ms`);
}

function writeWorld() {
  rmSync(RUN, { recursive: true, force: true });
  for (const d of [RUN, NODE_BIN, STANDIN_DIR]) mkdirSync(d, { recursive: true });
  symlinkSync(process.execPath, join(NODE_BIN, 'node'));
  for (const build of BUILDS) {
    const HOME = homeOf(build.label);
    const BIN = binOf(build.label);
    const PROJECT = projectOf(build.label);
    for (const d of [HOME, BIN, PROJECT]) mkdirSync(d, { recursive: true });
    for (const agent of STAND_INS) {
      const bare = BARE_NAME[agent];
      writeFileSync(
        join(BIN, bare),
        [
          '#!/bin/bash',
          `# probe:p3251. NOT ${bare} and not an agent: build/p321/stand-in.mjs draws committed screens.`,
          `P321_AGENT='${agent}'; export P321_AGENT`,
          `P321_STANDIN_DIR='${STANDIN_DIR}'; export P321_STANDIN_DIR`,
          `P321_STANDIN_CEILING_MS='${String(CEILING_MS)}'; export P321_STANDIN_CEILING_MS`,
          `exec -a '${bare}' '${process.execPath}' '${STAND_IN}' "$@"`,
          ''
        ].join('\n'),
        'utf8'
      );
      chmodSync(join(BIN, bare), 0o755);
    }
    writeFileSync(join(BIN, 'npm'), '#!/bin/sh\necho "probe:p3251 refuses npm: nothing is installed during this run" >&2\nexit 1\n', 'utf8');
    chmodSync(join(BIN, 'npm'), 0o755);
    const rc = `export PATH="${loginPathOf(build.label)}"\nexport HISTFILE=/dev/null\nSAVEHIST=0\n`;
    writeFileSync(join(HOME, '.zshenv'), rc, 'utf8');
    writeFileSync(join(HOME, '.zprofile'), rc, 'utf8');
    writeFileSync(join(HOME, '.zshrc'), `${rc}PROMPT='%~ %# '\n`, 'utf8');
    const git = (args) => spawnSync('/usr/bin/git', args, { cwd: PROJECT, encoding: 'utf8', env: { ...process.env, HOME, GIT_CONFIG_NOSYSTEM: '1' } });
    git(['init', '-q']);
    writeFileSync(join(PROJECT, 'note.txt'), 'hello\n');
    git(['add', '-A']);
    git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);
  }
  if (VENDORED !== null) {
    writeFileSync(
      TMUX_WRAPPER,
      [
        '#!/bin/sh',
        `case "$*" in *'#{window_activity}'*)`,
        `  /bin/date +%s >> '${TICK_LOG}'`,
        // The tick's clock in ms and each pane's activity stamp, a read of the
        // run's own server only; a perl or tmux that fails leaves a line the
        // reader skips, so the prediction reads null.
        `  { /usr/bin/perl -MTime::HiRes=time -e 'printf("%.3f", time)' 2>/dev/null; printf ' '; '${VENDORED}' -L '${SOCKET}' list-panes -a -F '#{pane_id}=#{window_activity}' 2>/dev/null | /usr/bin/tr '\\n' ' '; printf '\\n'; } >> '${PHASE_LOG}' ;;`,
        'esac',
        `exec '${VENDORED}' "$@"`,
        ''
      ].join('\n'),
      'utf8'
    );
    chmodSync(TMUX_WRAPPER, 0o755);
  }
}

/**
 * The folders the app's own scan searches whatever PATH it is handed, read out
 * of a checkout's `extraBinDirsFor` (src/main/tmux/resolve.ts): its absolute
 * ones. A copy of a stand-in's bare name there is a real agent the scan would
 * run for its version.
 */
function shadowCopies(checkout) {
  let text = '';
  try {
    text = readFileSync(join(checkout, 'src', 'main', 'tmux', 'resolve.ts'), 'utf8');
  } catch {
    return { ok: false, copies: [], why: 'resolve.ts could not be read' };
  }
  const at = text.indexOf('export function extraBinDirsFor(');
  if (at === -1) return { ok: false, copies: [], why: 'extraBinDirsFor is not in resolve.ts' };
  const body = text.slice(at, text.indexOf('\n}\n', at));
  const dirs = [...new Set([...body.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]))];
  const copies = [];
  for (const dir of dirs) {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch (err) {
      if (err?.code !== 'ENOENT') return { ok: false, copies, why: `${dir} could not be read` };
      continue;
    }
    for (const agent of STAND_INS) if (entries.includes(BARE_NAME[agent])) copies.push(join(dir, BARE_NAME[agent]));
  }
  return { ok: copies.length === 0, copies, why: copies.length === 0 ? '' : `a copy of a stand-in's name sits where the scan looks: ${copies.join(', ')}` };
}

/** The app's environment for one build, his history and his dot-folders out of it. */
const appEnvOf = (label) => ({
  ...STRIPPED,
  HOME: homeOf(label),
  ZDOTDIR: homeOf(label),
  HISTFILE: '/dev/null',
  SHELL: '/bin/zsh',
  PATH: appPathOf(label),
  GMUX_TMUX_SOCKET: SOCKET,
  GMUX_PROBES: '1',
  GMUX_LOG_FILE: '1',
  GMUX_SPECSTORY_NO_CLOUD: '1',
  GMUX_HARNESS_DIR: HARNESS_DIR,
  ...(VENDORED === null ? {} : { GMUX_TMUX_BIN: TMUX_WRAPPER })
});

/** Asked of the login shell the app will ask, with the environment the app will be given. */
function resolvedToStandIns(label) {
  const env = { ...process.env, ...appEnvOf(label), PATH: loginPathOf(label) };
  for (const [name, value] of Object.entries(env)) if (value === undefined) delete env[name];
  const elsewhere = [];
  for (const agent of STAND_INS) {
    const bare = BARE_NAME[agent];
    const r = spawnSync('/bin/zsh', ['-lic', `command -v ${bare}`], { encoding: 'utf8', timeout: 30_000, env });
    const got = (r.stdout ?? '').trim().split('\n').pop() ?? '';
    if (got !== join(binOf(label), bare)) elsewhere.push(`${bare} → ${got || 'nothing'}`);
  }
  return { resolved: elsewhere.length === 0, elsewhere };
}

// ---------------------------------------------------------------------------
// One launch
// ---------------------------------------------------------------------------

/** MAIN's node inspector, whose url the app printed because it started with `--inspect=0`. */
async function cdpForMain(handle, timeoutMs) {
  const started = Date.now();
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) {
      try {
        return await wsConnect(m[1]);
      } catch {
        /* printed a beat before it listens */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('the main process inspector never appeared');
    await sleep(300);
  }
}
async function cdpForWindow(profile, timeoutMs) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    try {
      const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) return await wsConnect(picked.target.webSocketDebuggerUrl);
        why = picked.why;
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}

/** The focus, taken away for real before the app's own blur (probe:p321's fix). */
const BLUR = `(async () => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { app, BrowserWindow } = load('electron');
  const ws = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  const focused = () => ws.filter((w) => w.isFocused()).length;
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  if (ws[0] !== undefined && ws[0].getSize()[0] < 1900) ws[0].setSize(1920, 1200);
  for (const w of ws) if (w.isFocused()) w.blur();
  for (let i = 0; i < 20 && focused() > 0; i += 1) await wait(100);
  if (focused() > 0 && process.platform === 'darwin') { app.hide(); for (let i = 0; i < 30 && focused() > 0; i += 1) await wait(100); }
  app.emit('browser-window-blur', {}, ws[0]);
  return String(focused()) + ' focused after';
})()`;

/**
 * The page's own kit: a session's xterm Terminal found through the React fiber
 * of its mount (as probe:p292 finds it), his keys through `term.input`, a paste
 * through `term.paste`, a cursor key through the bridge's own `sendInput` (the
 * path `onData` feeds), the pane's focus reports through `term.input`, and
 * whether the terminal will bracket a paste. No product file gains a hook.
 */
const PAGE_KIT = String.raw`
(() => {
  const termOf = (sessionId) => {
    const pane = document.querySelector('.gmux-terminal-pane[data-session-id="' + sessionId + '"]');
    const mount = pane ? pane.querySelector('.gmux-terminal-mount') : null;
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
          if (c && typeof c === 'object' && c.buffer && typeof c.input === 'function' && typeof c.paste === 'function') return c;
        }
        h = h.next;
        n += 1;
      }
    }
    return null;
  };
  window.__p3251 = {
    has: (id) => termOf(id) !== null,
    key: (id, ch) => { const t = termOf(id); if (!t) return false; t.input(ch, true); return true; },
    paste: (id, text) => { const t = termOf(id); if (!t) return false; t.paste(text); return true; },
    raw: (id, data) => { const g = window.gmux && window.gmux.term; if (!g || termOf(id) === null) return false; g.sendInput(id, data); return true; },
    focus: (id, on) => { const t = termOf(id); if (!t) return false; t.input(on ? '\u001b[I' : '\u001b[O', false); return true; },
    bracketed: (id) => { const t = termOf(id); return t !== null && t.modes !== undefined && t.modes.bracketedPasteMode === true; }
  };
  return true;
})()`;

/** Every logged tick's clock, in ms, oldest first. */
const tickClock = () =>
  existsSync(PHASE_LOG)
    ? readFileSync(PHASE_LOG, 'utf8').split('\n').map((l) => Number(l.trim().split(/\s+/)[0]) * 1000).filter((t) => Number.isFinite(t) && t > 0)
    : [];
/** How many monitor ticks were logged in (from, to]. */
const ticksIn = (from, to = Infinity) => tickClock().filter((t) => t > from && t <= to).length;
/** One pane's logged ticks between two moments, `{ t, a }` in ms. */
function phaseTicksOf(paneId, fromMs, toMs) {
  if (paneId === null || !existsSync(PHASE_LOG)) return [];
  const out = [];
  for (const line of readFileSync(PHASE_LOG, 'utf8').split('\n')) {
    const [first, ...rest] = line.trim().split(/\s+/);
    const t = Number(first) * 1000;
    if (!Number.isFinite(t) || t < fromMs || t > toMs) continue;
    const hit = rest.find((x) => x.startsWith(`${paneId}=`));
    if (hit === undefined) continue;
    const a = Number(hit.slice(paneId.length + 1)) * 1000;
    if (Number.isFinite(a) && a > 0) out.push({ t, a });
  }
  return out;
}
const rateBetween = (from, to) => {
  if (VENDORED === null || to - from < 5_000 || !existsSync(TICK_LOG)) return null;
  const a = Math.ceil(from / 1000);
  const b = Math.floor(to / 1000);
  const ticks = readFileSync(TICK_LOG, 'utf8').split('\n').filter(Boolean).map(Number);
  return Math.round((ticks.filter((t) => t >= a && t < b).length * 100) / Math.max(1, b - a)) / 100;
};

/**
 * One launch's handle on the app: the window and main over the devtools
 * protocol, and everything an arm does through them.
 */
async function connectApp(build, handle, profile) {
  const cdp = await cdpForWindow(profile, 150_000);
  await cdp.call('Runtime.enable');
  for (let i = 0; i < 200; i += 1) {
    if ((await cdpEval(cdp, 'window.__gmuxP95 !== undefined && window.__gmuxP202 !== undefined && window.__gmuxP93 !== undefined && window.gmux !== undefined')) === true) break;
    await sleep(300);
  }
  await cdpEval(cdp, PAGE_KIT);
  const agents = standInsOnlyVerdict(JSON.parse(await cdpEval(cdp, AGENTS_LIST_EXPR, 120_000)), { standIns: STAND_INS, under: RUN });
  await cdpEval(cdp, `window.__gmuxP93.setup(${J({ path: projectOf(build.label), names: [] })}).then(() => true)`);
  let mainCdp = null;
  try {
    mainCdp = await cdpForMain(handle, 60_000);
  } catch {
    mainCdp = null;
  }
  const page = (expr, ms) => cdpEval(cdp, expr, ms);
  const A = {
    agents,
    page,
    /** Every poller still running, so a section an arm threw out of stops them. */
    pollers: new Set(),
    close() {
      cdp.close();
      mainCdp?.close();
    },
    async blur() {
      if (mainCdp === null) return 'no inspector';
      const got = await mainCdp.call('Runtime.evaluate', { expression: BLUR, includeCommandLineAPI: true, returnByValue: true, awaitPromise: true });
      return String(got.result?.result?.value ?? '');
    },
    async mainSessions() {
      return JSON.parse(await page('window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status, tmuxName: x.tmuxName }))))'));
    },
    async statusOf(one) {
      return (await A.mainSessions()).find((s) => s.id === one.id)?.status ?? 'gone';
    },
    /** Main's status of every named session every 500 ms, until stopped: `log` is id → `[{ t, s }]`. */
    poller(ids) {
      const log = new Map(ids.map((id) => [id, []]));
      let stop = false;
      const done = (async () => {
        while (!stop) {
          const t0 = Date.now();
          let list = null;
          try {
            list = await A.mainSessions();
          } catch {
            list = null; // a read that failed is a gap, never a status
          }
          const t = Date.now();
          if (list !== null) for (const id of ids) log.get(id).push({ t, s: list.find((x) => x.id === id)?.status ?? 'gone' });
          await sleep(STATUS_POLL_MS - (Date.now() - t0));
        }
      })();
      const handle = {
        log,
        async stop() {
          stop = true;
          A.pollers.delete(handle);
          await done;
        }
      };
      A.pollers.add(handle);
      return handle;
    },
    async panelNames() {
      const names = JSON.parse(await page('window.__gmuxP93.openPanel().then((s) => JSON.stringify(s.rows.map((r) => r.name)))'));
      await page('window.__gmuxP93.closePanel().then(() => true)');
      await A.blur().catch(() => undefined);
      return names;
    },
    async launch(name, agent) {
      const before = new Set(hellos().map((h) => h.pid));
      // A row this launch made, never an ended one of the same name the manifest still lists.
      const known = new Set((await A.mainSessions()).map((s) => s.id));
      await page(`window.__gmuxP202.createSession(${J(name)}, ${J(agent)}).then(() => 'ok').catch((e) => 'ERR ' + String(e && e.message || e))`);
      let row;
      for (let i = 0; i < 80 && row === undefined; i += 1) {
        row = (await A.mainSessions()).find((s) => s.name === name && !known.has(s.id));
        if (row === undefined) await sleep(250);
      }
      if (row === undefined) throw new Unreadable(`Tortie never created the ${agent} session ${name}`);
      const pane = paneOf(row.tmuxName);
      if (pane !== null) noteTree(pane.panePid);
      if (agent === 'shell') return { name, agent, id: row.id, pid: 0, pane: pane?.paneId ?? null, panePid: pane?.panePid ?? 0 };
      let hello;
      for (let i = 0; i < 120 && hello === undefined; i += 1) {
        hello = hellos().find((h) => !before.has(h.pid) && h.agent === agent);
        if (hello === undefined) await sleep(250);
      }
      if (hello === undefined) {
        await page(`window.gmux.sessions.kill(${J(row.id)}).then(() => 'ok').catch(() => 'err')`);
        throw new Unreadable(`${name}: the ${BARE_NAME[agent]} Tortie launched never said hello as the stand-in; the session was ended at once`);
      }
      noteProc(hello.pid);
      if (pane !== null) tmuxRun(['resize-window', '-t', pane.paneId, '-x', String(COLS), '-y', String(ROWS)]);
      return { name, agent, id: row.id, pid: hello.pid, pane: pane?.paneId ?? null, panePid: pane?.panePid ?? 0 };
    },
    async end(ones) {
      for (const one of ones) {
        if (one.panePid > 0) noteTree(one.panePid);
        await page(`window.gmux.sessions.kill(${J(one.id)}).then(() => 'ok').catch(() => 'err')`);
      }
      await sleep(1_500);
    },
    async select(one) {
      await page(`window.__gmuxP95.select(${J(one.id)}).then(() => true)`);
      for (let i = 0; i < 40; i += 1) {
        if ((await page(`window.__p3251.has(${J(one.id)})`)) === true) return;
        await sleep(150);
      }
      throw new Unreadable(`${one.name}: its pane's xterm was never found`);
    },
    async key(one, ch) {
      if ((await page(`window.__p3251.key(${J(one.id)}, ${J(ch)})`)) !== true) throw new Unreadable(`${one.name}: its pane's xterm took no key`);
    },
    async typeKeys(one, text) {
      for (const ch of text) {
        await A.key(one, ch);
        await sleep(KEY_GAP_MS);
      }
    },
    async raw(one, data) {
      if ((await page(`window.__p3251.raw(${J(one.id)}, ${J(data)})`)) !== true) throw new Unreadable(`${one.name}: the bridge took no bytes`);
      await sleep(KEY_GAP_MS);
    },
    async paste(one, text) {
      if ((await page(`window.__p3251.paste(${J(one.id)}, ${J(text)})`)) !== true) throw new Unreadable(`${one.name}: its pane's xterm took no paste`);
    },
    /**
     * Whether the pane's terminal will bracket a paste, asked for up to 3 s: a
     * session just selected may not have had its program's mode replayed to
     * the window's terminal yet (the probe reviewer's fix; a first read alone
     * could read false and make the whole arm unreadable).
     */
    async bracketed(one) {
      for (let i = 0; i < 15; i += 1) {
        if ((await page(`window.__p3251.bracketed(${J(one.id)})`)) === true) return true;
        await sleep(200);
      }
      return false;
    },
    async focus(one, on) {
      if ((await page(`window.__p3251.focus(${J(one.id)}, ${J(on)})`)) !== true) throw new Unreadable(`${one.name}: its pane's xterm sent no focus report`);
    },
    /** Until `n` monitor ticks were logged after `t0` and `minMs` passed since it, or `maxMs` ran out. */
    async waitTicksAfter(t0, n, minMs, maxMs) {
      const started = Date.now();
      for (;;) {
        if (ticksIn(t0) >= n && Date.now() >= t0 + minMs) return true;
        if (Date.now() - started > maxMs) return false;
        await sleep(500);
      }
    },
    async waitNoneBlocked(ones, maxMs) {
      const until = Date.now() + maxMs;
      while (Date.now() < until) {
        const list = await A.mainSessions();
        if (!ones.some((one) => list.find((s) => s.id === one.id)?.status === 'needs_input')) return true;
        await sleep(700);
      }
      return false;
    },
    /**
     * When his last key goes so a question drawn `dMs` after it lands
     * ALIGN_LEAD_MS before a monitor tick, read off this launch's tick log:
     * then the tick after the draw is never quiet, the next two are, and the
     * question is raised on the third tick after it at both builds, whatever
     * second the draw fell in.
     */
    planDraw(dMs) {
      const clock = tickClock();
      const now = Date.now();
      if (clock.length < 3) return { lastKeyAt: now, aligned: false };
      let tick = clock[clock.length - 1];
      while (tick - ALIGN_LEAD_MS - dMs < now + 150) tick += ONE_POLL_MS;
      return { lastKeyAt: tick - ALIGN_LEAD_MS - dMs, aligned: true };
    }
  };
  await A.blur().catch(() => undefined);
  return A;
}

const pollsOf = (poll, id, from) => (poll.log.get(id) ?? []).filter((p) => p.t >= from);
const raisedAfter = (poll, id, from) => pollsOf(poll, id, from).some((p) => p.s === 'needs_input');
/** How well one session's status was read over `[from, to]` (`coverageOf`): counts only. */
const coverOf = (poll, id, from, to) => coverageOf(poll.log.get(id) ?? [], from, to);
const keep = (polls) => (KEEP ? polls : undefined);

/** One section: its span's cadence measured, the sessions it started ended. */
async function section(A, readings, id, fn) {
  if (!ARMS.has(id)) return;
  await A.blur().catch(() => undefined);
  const live = [];
  const from = Date.now();
  let reading = null;
  try {
    reading = await fn(live);
  } catch (err) {
    reading = { unreadable: err instanceof Unreadable ? err.message : `it threw: ${String(err?.message ?? err)}` };
  } finally {
    for (const p of [...A.pollers]) await p.stop().catch(() => undefined);
    await A.end(live).catch(() => undefined);
  }
  readings[id] = { ...reading, rate: rateBetween(from, Date.now()) };
}

/** The preconditions every launch reads: the app's scan, and the cadence with one settled shell. */
async function preconditions(A, which, hidden) {
  const metronome = await A.launch(`metronome-${which}`, 'shell');
  const from = Date.now();
  await sleep(20_000);
  return { metronome, reading: { hidden, resolved: true, agents: A.agents, rate: rateBetween(from, Date.now()) } };
}

// ---------------------------------------------------------------------------
// The first launch of a build: W, Q, C, S, F, E, and R's first half
// ---------------------------------------------------------------------------

async function driveOne(build, A, readings, hidden) {
  const { metronome, reading } = await preconditions(A, 'one', hidden);
  readings.preconditions = reading;
  if (gradePreconditions(reading).ok !== true) {
    await A.end([metronome]);
    return;
  }

  // ---- (W) his words in every input row ----
  await section(A, readings, 'W', async (live) => {
    const sessions = [];
    for (const agent of STAND_INS) {
      const one = await A.launch(`w-${agent}`, agent);
      live.push(one);
      const idle = idleScreensFor(agent);
      if (idle.idle === null) throw new Unreadable(idle.why);
      await tell(one.pid, [{ op: 'draw', screen: idle.idle }, INPUT_ON]);
      sessions.push(one);
    }
    const shell = await A.launch('w-shell', 'shell');
    live.push(shell);
    sessions.push(shell);
    // Each window takes the terminal's size now, and not in the middle of an arm.
    for (const one of sessions) await A.select(one);
    await A.blur();
    await sleep(SETTLE_MS);
    const cells = [];
    const polls = {};
    for (const [textId, text] of TEXTS) {
      for (const how of ['typed', 'pasted']) {
        for (const one of sessions) if (one.pid > 0) await tell(one.pid, [{ op: 'clear-input' }]);
        await A.blur();
        const poll = A.poller(sessions.map((s) => s.id));
        const marks = new Map();
        for (const one of sessions) {
          await A.select(one);
          const before = await A.statusOf(one);
          const first = Date.now();
          let bracketed = null;
          if (how === 'pasted') {
            bracketed = await A.bracketed(one);
            await A.paste(one, text);
          } else {
            await A.typeKeys(one, text);
          }
          marks.set(one.id, { first, last: Date.now(), before, bracketed });
        }
        await A.blur();
        await sleep(1_000);
        const facts = new Map();
        for (const one of sessions) {
          const st = one.pid > 0 ? stateOf(one.pid) : null;
          facts.set(one.id, {
            numbered: parentDetectDialog(screenOf(one.pane)),
            reached: one.pid > 0 ? st?.typedLines === lineCount(text) && st?.typedChars === charCount(text.split('\n')) : null
          });
        }
        const lastOfAll = Math.max(...[...marks.values()].map((m) => m.last));
        await A.waitTicksAfter(lastOfAll, MIN_TICKS_AFTER, 14_000, 45_000);
        const watchEnd = Date.now();
        const panel = await A.panelNames();
        await poll.stop();
        for (const one of sessions) {
          const m = marks.get(one.id);
          const f = facts.get(one.id);
          const seen = pollsOf(poll, one.id, m.first);
          cells.push({
            session: one.name,
            agent: one.agent,
            text: textId,
            chars: text.length,
            how,
            numbered: f.numbered,
            reached: f.reached,
            bracketed: m.bracketed,
            amberBefore: m.before === 'needs_input',
            amber: seen.some((p) => p.s === 'needs_input'),
            panel: panel.includes(one.name),
            ticksAfter: ticksIn(m.last, watchEnd),
            cover: coverOf(poll, one.id, m.last, watchEnd)
          });
          if (KEEP) polls[`${one.name} ${textId} ${how}`] = seen;
        }
        // His Enter in every session: a submit, which empties each input row and
        // main's record, and lets a raised session go, as his key does. In the
        // shell the Enter RUNS what he pasted, and the shell leaves his lines on
        // the screen above its answer, where the numbered verdict reads the
        // longer texts as a question again at BOTH builds (the echoed prompt,
        // SPEC §13's stated limit, measured by the probe reviewer on the
        // vendored tmux and /bin/zsh); the next round's cells would then start
        // already blocked and the whole arm read UNREADABLE. So his Ctrl-L
        // follows it there, as he would clear a screen: the shell clears it,
        // and main's record reads it as nothing (a control byte).
        for (const one of sessions) {
          await A.select(one);
          await A.key(one, '\r');
          if (one.agent === 'shell') {
            await sleep(600);
            await A.key(one, '\f');
          }
        }
        for (const one of sessions) if (one.pid > 0) await tell(one.pid, [{ op: 'clear-input' }]);
        await A.blur();
        await A.waitNoneBlocked(sessions, 25_000);
        await sleep(4_000);
      }
    }
    // HIS RULED ROUND (build/p3251/SPEC.md §As built). THE SHELL ALONE. In the
    // rounds above the parent's fault holds six agents in a question, and a
    // session in a question takes one of the tick's six captures before any
    // other session is read (MAX_CAPTURES_PER_TICK in
    // src/main/activity/monitor.ts), so the parent never read the shell's
    // screen there and its grey says nothing about it. Here every agent's input
    // row is empty and his words go into the shell alone, so each build reads
    // the shell's screen, and a shell cell HEAD reads as needs input is graded
    // against this reading of the parent's (`gradeWords`). `others` counts the
    // other sessions read as needs input during the watch.
    const alone = [];
    for (const [textId, text] of TEXTS) {
      for (const how of ['typed', 'pasted']) {
        for (const one of sessions) if (one.pid > 0) await tell(one.pid, [{ op: 'clear-input' }]);
        await A.blur();
        const poll = A.poller(sessions.map((s) => s.id));
        await A.select(shell);
        const before = await A.statusOf(shell);
        const first = Date.now();
        let bracketed = null;
        if (how === 'pasted') {
          bracketed = await A.bracketed(shell);
          await A.paste(shell, text);
        } else {
          await A.typeKeys(shell, text);
        }
        const last = Date.now();
        await A.blur();
        await sleep(1_000);
        const numbered = parentDetectDialog(screenOf(shell.pane));
        await A.waitTicksAfter(last, MIN_TICKS_AFTER, 14_000, 45_000);
        const watchEnd = Date.now();
        const panel = await A.panelNames();
        await poll.stop();
        const seen = pollsOf(poll, shell.id, first);
        const others = sessions.filter((s) => s !== shell && pollsOf(poll, s.id, first).some((p) => p.s === 'needs_input')).length;
        alone.push({
          session: shell.name,
          agent: shell.agent,
          text: textId,
          chars: text.length,
          how,
          numbered,
          reached: null,
          bracketed,
          amberBefore: before === 'needs_input',
          amber: seen.some((p) => p.s === 'needs_input'),
          panel: panel.includes(shell.name),
          ticksAfter: ticksIn(last, watchEnd),
          cover: coverOf(poll, shell.id, last, watchEnd),
          others
        });
        if (KEEP) polls[`${shell.name} ${textId} ${how} alone`] = seen;
        await A.select(shell);
        await A.key(shell, '\r');
        await sleep(600);
        await A.key(shell, '\f');
        await A.blur();
        await A.waitNoneBlocked(sessions, 25_000);
        await sleep(4_000);
      }
    }
    return { cells, alone, polls: keep(polls) };
  });

  // ---- (Q) every recorded question, drawn d s after his last key ----
  await section(A, readings, 'Q', async (live) => {
    const cells = [];
    const polls = {};
    for (const d of Q_DELAYS) {
      const ones = [];
      for (const q of QUESTIONS) {
        const one = await A.launch(`q-${q.key}-${String(d).replace('.', '_')}`, q.row);
        live.push(one);
        const idle = idleScreensFor(q.row);
        if (idle.idle === null) throw new Unreadable(idle.why);
        await tell(one.pid, [{ op: 'draw', screen: idle.idle }, INPUT_ON]);
        ones.push({ q, one });
      }
      for (const { one } of ones) await A.select(one);
      await A.blur();
      await sleep(SETTLE_MS);
      const poll = A.poller(ones.map((x) => x.one.id));
      const round = [];
      for (const { q, one } of ones) {
        await A.select(one);
        await A.typeKeys(one, ORDINARY.slice(0, -1));
        const plan = A.planDraw(d * 1000);
        await sleepUntil(plan.lastKeyAt);
        const before = await A.statusOf(one);
        await A.key(one, ORDINARY.slice(-1));
        const lastKey = Date.now();
        await sleepUntil(lastKey + d * 1000 - APPLY_LEAD_MS);
        // The agent puts its question up in place of its prompt, as recorded.
        const st = await tell(one.pid, [{ op: 'input', on: false }, { op: 'draw', screen: q.screen }]);
        round.push({ q, one, lastKey, drawAt: Number(st?.at) || Date.now(), aligned: plan.aligned, before });
      }
      await A.blur();
      const until = Math.max(...round.map((c) => c.drawAt)) + RAISE_WATCH_MS;
      while (Date.now() < until && !round.every((c) => raisedAfter(poll, c.one.id, c.drawAt))) await sleep(500);
      await sleep(STATUS_POLL_MS * 2);
      await poll.stop();
      const stoppedAt = Date.now();
      for (const c of round) {
        const seen = pollsOf(poll, c.one.id, c.drawAt);
        const first = seen.find((p) => p.s === 'needs_input');
        const pred = predictRaise(phaseTicksOf(c.one.pane, c.drawAt - 8_000, c.drawAt + RAISE_WATCH_MS), c.drawAt, c.drawAt + RAISE_WATCH_MS);
        cells.push({
          q: c.q.key,
          row: c.q.row,
          reads: c.q.reads,
          delayS: d,
          dActualMs: c.drawAt - c.lastKey,
          aligned: c.aligned,
          beforeAmber: c.before === 'needs_input',
          raised: first !== undefined,
          firstMs: first === undefined ? null : first.t - c.drawAt,
          predictedMs: pred.at === null ? null : pred.at - c.drawAt,
          excessMs: first === undefined || pred.at === null ? null : first.t - pred.at,
          why: pred.why,
          cover: coverOf(poll, c.one.id, c.drawAt, Math.min(stoppedAt, c.drawAt + RAISE_WATCH_MS))
        });
        if (KEEP) polls[`${c.q.key} ${String(d)}`] = seen;
      }
      await A.end(ones.map((x) => x.one));
      for (const x of ones) live.splice(live.indexOf(x.one), 1);
    }
    return { cells, polls: keep(polls) };
  });

  // ---- (C) the coincidence boundary: C1b, C2, C1c and C1u, each graded ----
  await section(A, readings, 'C', async (live) => {
    // [reading key, session name, his line, erased with Ctrl-U]
    const CASES = [['c1b', 'c-whole-row', C1B_LINE, false], ['c2', 'c-substring', C2_LINE, false], ['c1c', 'c-hint-row', C1C_LINE, false], ['c1u', 'c-erased', C1C_LINE, true]];
    const ones = [];
    for (const [key, name, line, erase] of CASES) {
      const one = await A.launch(name, 'claude');
      live.push(one);
      ones.push({ key, one, line, erase });
    }
    const idle = idleScreensFor('claude');
    if (idle.idle === null) throw new Unreadable(idle.why);
    for (const { one } of ones) await tell(one.pid, [{ op: 'draw', screen: idle.idle }, INPUT_ON]);
    for (const { one } of ones) await A.select(one);
    await A.blur();
    await sleep(SETTLE_MS);
    const facts = new Map();
    for (const { one, line, erase } of ones) {
      await A.select(one);
      const bracketed = await A.bracketed(one);
      await A.paste(one, line);
      await sleep(400);
      const st = stateOf(one.pid);
      const fact = { bracketed, reached: st?.typedLines === 1 && st?.typedChars === [...line].length };
      if (erase) {
        // Ctrl-U through the pane's own xterm: the stand-in empties its row as
        // an agent's editor does, and main's record forgets the line.
        await A.key(one, '\u0015');
        await sleep(400);
        fact.erased = stateOf(one.pid)?.typedChars === 0;
      }
      facts.set(one.id, fact);
    }
    await A.blur();
    await sleep(3_000);
    const poll = A.poller(ones.map((x) => x.one.id));
    const draws = new Map();
    for (const { one } of ones) {
      const before = await A.statusOf(one);
      const st = await tell(one.pid, [{ op: 'input', on: false }, { op: 'draw', screen: Q1 }]);
      draws.set(one.id, { at: Number(st?.at) || Date.now(), before });
    }
    await sleep(1_000);
    const numbered = ones.every(({ one }) => parentDetectDialog(screenOf(one.pane)));
    await sleep(RAISE_WATCH_MS);
    await poll.stop();
    const caseOf = (one) => ({
      ...facts.get(one.id),
      beforeAmber: draws.get(one.id).before === 'needs_input',
      raised: raisedAfter(poll, one.id, draws.get(one.id).at),
      cover: coverOf(poll, one.id, draws.get(one.id).at, draws.get(one.id).at + RAISE_WATCH_MS),
      polls: keep(pollsOf(poll, one.id, draws.get(one.id).at))
    });
    return { numbered, ...Object.fromEntries(ones.map(({ key, one }) => [key, caseOf(one)])) };
  });

  // ---- (S) his words sent with Enter, then the same rows drawn by the agent ----
  await section(A, readings, 'S', async (live) => {
    const one = await A.launch('s-claude', 'claude');
    live.push(one);
    const idle = idleScreensFor('claude');
    if (idle.idle === null) throw new Unreadable(idle.why);
    await tell(one.pid, [{ op: 'draw', screen: idle.idle }, INPUT_ON]);
    await A.select(one);
    await A.blur();
    await sleep(SETTLE_MS);
    await A.select(one);
    const bracketed = await A.bracketed(one);
    await A.paste(one, S_ROWS);
    await sleep(300);
    const reached = stateOf(one.pid)?.typedLines === lineCount(S_ROWS);
    await A.key(one, '\r');
    await sleep(300);
    const submitted = stateOf(one.pid)?.typedLines === 0;
    await A.blur();
    await sleep(10_000);
    const before = await A.statusOf(one);
    const poll = A.poller([one.id]);
    const st = await tell(one.pid, [{ op: 'input', on: false }, { op: 'draw', screen: Q1 }]);
    const drawAt = Number(st?.at) || Date.now();
    await sleep(1_000);
    const numbered = parentDetectDialog(screenOf(one.pane));
    await sleep(RAISE_WATCH_MS);
    await poll.stop();
    return {
      bracketed,
      reached,
      submitted,
      beforeAmber: before === 'needs_input',
      numbered,
      raised: raisedAfter(poll, one.id, drawAt),
      cover: coverOf(poll, one.id, drawAt, drawAt + RAISE_WATCH_MS),
      polls: keep(pollsOf(poll, one.id, drawAt))
    };
  });

  // ---- (F) focus leaving and returning while a real question is drawn ----
  await section(A, readings, 'F', async (live) => {
    const one = await A.launch('f-claude', 'claude');
    live.push(one);
    const idle = idleScreensFor('claude');
    if (idle.idle === null) throw new Unreadable(idle.why);
    await tell(one.pid, [{ op: 'draw', screen: idle.idle }, INPUT_ON]);
    await A.select(one);
    await A.blur();
    await sleep(SETTLE_MS);
    await A.select(one);
    await A.typeKeys(one, ORDINARY);
    await sleep(1_000);
    const before = await A.statusOf(one);
    const poll = A.poller([one.id]);
    const st = await tell(one.pid, [{ op: 'input', on: false }, { op: 'draw', screen: Q1 }]);
    const drawAt = Number(st?.at) || Date.now();
    await A.focus(one, false);
    await sleep(1_500);
    await A.focus(one, true);
    await A.blur();
    await sleep(1_000);
    const numbered = parentDetectDialog(screenOf(one.pane));
    await sleep(RAISE_WATCH_MS);
    await poll.stop();
    return {
      drawn: true,
      numbered,
      beforeAmber: before === 'needs_input',
      raised: raisedAfter(poll, one.id, drawAt),
      cover: coverOf(poll, one.id, drawAt, drawAt + RAISE_WATCH_MS),
      polls: keep(pollsOf(poll, one.id, drawAt))
    };
  });

  // ---- (E) a typo fixed with Backspace, and a mid-line fix with Left and End ----
  await section(A, readings, 'E', async (live) => {
    const bs = await A.launch('e-backspace', 'antigravity');
    live.push(bs);
    const lf = await A.launch('e-left', 'antigravity');
    live.push(lf);
    const idle = idleScreensFor('antigravity');
    if (idle.idle === null) throw new Unreadable(idle.why);
    for (const one of [bs, lf]) await tell(one.pid, [{ op: 'draw', screen: idle.idle }, INPUT_ON]);
    for (const one of [bs, lf]) await A.select(one);
    await A.blur();
    await sleep(SETTLE_MS);
    const poll = A.poller([bs.id, lf.id]);
    const marks = new Map();
    // Backspace is what xterm sends for it (DEL), through the pane's own xterm.
    await A.select(bs);
    marks.set(bs.id, { before: await A.statusOf(bs), first: Date.now() });
    await A.typeKeys(bs, '1. to cancez');
    await A.key(bs, '\u007f');
    await A.typeKeys(bs, 'l\n2. x');
    marks.get(bs.id).last = Date.now();
    // Left and End are cursor keys, sent on the path onData feeds, as xterm spells them.
    await A.select(lf);
    marks.set(lf.id, { before: await A.statusOf(lf), first: Date.now() });
    await A.typeKeys(lf, '1. to cncel');
    for (let n = 0; n < 4; n += 1) await A.raw(lf, '\u001b[D');
    await A.key(lf, 'a');
    await A.raw(lf, '\u001b[F');
    await A.typeKeys(lf, '\n2. y');
    await A.raw(lf, '\u001b[D');
    await A.key(lf, 'x');
    marks.get(lf.id).last = Date.now();
    await A.blur();
    await sleep(1_000);
    const reachedOf = (one, want) => {
      const st = stateOf(one.pid);
      return st?.typedLines === want.length && st?.typedChars === charCount(want);
    };
    const facts = new Map([
      [bs.id, { case: 'backspace', numbered: parentDetectDialog(screenOf(bs.pane)), reached: reachedOf(bs, E_BACKSPACE) }],
      [lf.id, { case: 'left', numbered: parentDetectDialog(screenOf(lf.pane)), reached: reachedOf(lf, E_LEFT) }]
    ]);
    await A.waitTicksAfter(marks.get(lf.id).last, MIN_TICKS_AFTER, 14_000, 45_000);
    const watchEnd = Date.now();
    await poll.stop();
    const cells = [bs, lf].map((one) => {
      const m = marks.get(one.id);
      return {
        session: one.name,
        ...facts.get(one.id),
        amberBefore: m.before === 'needs_input',
        amber: raisedAfter(poll, one.id, m.first),
        ticksAfter: ticksIn(m.last, watchEnd),
        cover: coverOf(poll, one.id, m.last, watchEnd),
        polls: keep(pollsOf(poll, one.id, m.first))
      };
    });
    return { cells };
  });

  // ---- (R) the first half: a claude session left on its numbered trust gate ----
  // It is in no section's `live` on purpose: it must still be running when this
  // launch quits, so the app's own quit takes the snapshot the restore replays.
  if (ARMS.has('R')) {
    try {
      await A.blur().catch(() => undefined);
      const one = await A.launch('r-claude', 'claude');
      await tell(one.pid, [{ op: 'draw', screen: Q1 }]);
      await sleep(12_000);
      readings.handoff = { id: one.id, name: one.name, status: await A.statusOf(one) };
    } catch (err) {
      readings.handoff = { unreadable: err instanceof Unreadable ? err.message : `it threw: ${String(err?.message ?? err)}` };
    }
  }
  await A.end([metronome]);
}

// ---------------------------------------------------------------------------
// The second launch of a build: R's second half, after the scratch server ended
// ---------------------------------------------------------------------------

async function driveTwo(build, A, readings, hidden) {
  const { metronome, reading } = await preconditions(A, 'two', hidden);
  readings.preconditionsTwo = reading;
  if (gradePreconditions(reading).ok !== true) {
    await A.end([metronome]);
    return;
  }
  await section(A, readings, 'R', async (live) => {
    const id = readings.handoff?.id;
    if (id === undefined) throw new Unreadable(readings.handoff?.unreadable ?? 'the first launch made no session to restore');
    let status = 'gone';
    for (let i = 0; i < 120; i += 1) {
      status = (await A.mainSessions()).find((s) => s.id === id)?.status ?? 'gone';
      if (status === 'restorable' || status === 'exited') break;
      await sleep(500);
    }
    if (status !== 'restorable' && status !== 'exited') throw new Unreadable(`after the relaunch the session read ${status}, not ready to restore`);
    const restored = await A.page(`window.gmux.sessions.restore(${J(id)}).then(() => 'ok').catch((e) => 'ERR ' + String(e && e.message || e))`, 90_000);
    if (restored !== 'ok') return { restored: false, why: 'the restore answered an error' };
    // Main's status is watched from the moment the restore answered, so the
    // replayed gate's whole time on the screen is read (the probe reviewer's
    // fix: the watch began only after the replay was found and the session
    // selected, and its grey asked nothing about the seconds before).
    const poll = A.poller([id]);
    const replayFrom = Date.now();
    const row = (await A.mainSessions()).find((s) => s.id === id);
    const pane = row === undefined ? null : paneOf(row.tmuxName);
    if (pane !== null) noteTree(pane.panePid);
    const back = { name: readings.handoff.name, agent: 'claude', id, pid: 0, pane: pane?.paneId ?? null, panePid: pane?.panePid ?? 0 };
    live.push(back);
    let replayed = false;
    let armed = false;
    for (let i = 0; i < 60 && !(replayed && armed); i += 1) {
      replayed = parentDetectDialog(screenOf(back.pane));
      // The armed command can wrap at the pane's width on rows `-J` does not
      // join (a shell redraws its own line), so every row break is taken out
      // before it is read (the attack lens: `--resu` and `me` on two rows).
      armed = /--resume/.test(joinedScreenOf(back.pane).replace(/\n/g, ''));
      if (!(replayed && armed)) await sleep(250);
    }
    await A.select(back);
    await A.blur();
    await sleep(RAISE_WATCH_MS);
    const replayAmber = raisedAfter(poll, id, replayFrom);
    const replayCover = coverOf(poll, id, replayFrom, Date.now());
    // His Enter on the armed resume, through the pane's own xterm; the agent's
    // own gate is drawn the moment it says hello, as a real agent draws at once.
    const helloBefore = new Set(hellos().map((h) => h.pid));
    await A.key(back, '\r');
    let hello;
    for (let i = 0; i < 200 && hello === undefined; i += 1) {
      hello = hellos().find((h) => !helloBefore.has(h.pid) && h.agent === 'claude');
      if (hello === undefined) await sleep(100);
    }
    let gateDrawn = false;
    let gateBefore = null;
    let drawAt = null;
    if (hello !== undefined) {
      noteProc(hello.pid);
      if (back.panePid > 0) noteTree(back.panePid);
      gateBefore = await A.statusOf(back);
      const st = await tell(hello.pid, [{ op: 'draw', screen: Q1 }]);
      drawAt = Number(st?.at) || Date.now();
      gateDrawn = true;
    }
    await A.blur();
    await sleep(RAISE_WATCH_MS);
    await poll.stop();
    return {
      restored: true,
      replayed,
      armed,
      replayAmber,
      replayCover,
      gateDrawn,
      gateBefore,
      gateAmber: drawAt !== null && raisedAfter(poll, id, drawAt),
      gateCover: drawAt === null ? { reads: 0, gapMs: null } : coverOf(poll, id, drawAt, drawAt + RAISE_WATCH_MS),
      polls: keep(pollsOf(poll, id, replayFrom))
    };
  });
  await A.end([metronome]);
}

// ---------------------------------------------------------------------------
// A build: its first launch, and its second when R runs
// ---------------------------------------------------------------------------

async function launchOnce(build, which, drive, readings) {
  const PROFILE = join(RUN, `profile-${build.label}`);
  mkdirSync(PROFILE, { recursive: true });
  const pre = hiddenAgentsPrecheck({ checkout: build.checkout, prefix: HIDDEN_PREFIX, home: homeOf(build.label), userPath: `${loginPathOf(build.label)}:${appPathOf(build.label)}`, standIns: STAND_INS });
  const hidden = { ok: pre.ok, said: pre.said };
  if (!pre.ok) {
    readings[which === 'one' ? 'preconditions' : 'preconditionsTwo'] = { hidden };
    return;
  }
  writeHiddenAgents(PROFILE, HIDDEN_PREFIX, HIDDEN_IDS);
  const crashBefore = crashReports();
  const entry = { build: build.label, which, shim: 0, app: 0, thrown: null, crash: null, consoleRead: false, consoleHits: null };
  report.launches.push(entry);
  // The launch's handle is kept past the helper's teardown, so everything the
  // app wrote on its console, its quit included, is read for his words below.
  let launched = null;
  try {
    await withElectron(
      {
        label: `p3251-${build.label}-${which}`,
        userDataDir: PROFILE,
        cwd: build.checkout,
        tmuxSocket: SOCKET,
        args: [
          '--remote-debugging-port=0',
          '--use-mock-keychain',
          '--inspect=0',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-background-timer-throttling'
        ],
        env: withoutDevRenderer(appEnvOf(build.label)),
        // Long enough for the app's own quit, which takes the snapshot arm R replays.
        graceMs: 20_000,
        ceilingMs: CEILING_MS
      },
      async (handle) => {
        entry.shim = handle.pid;
        launched = handle;
        let A = null;
        try {
          A = await connectApp(build, handle, PROFILE);
          await drive(build, A, readings, hidden);
        } finally {
          try {
            entry.app = handle.appPid();
          } catch {
            /* recorded as 0 */
          }
          A?.close();
        }
      }
    );
  } catch (err) {
    // The helper's own lines say why; a census sentence may name his sessions,
    // so the report keeps only that it refused, and how: his server (the
    // census, or the app's own socket announcement), the scratch server not
    // proven gone, or this probe's own body.
    const text = String(err?.message ?? err);
    entry.thrown = /census|private server|gmux-socket/i.test(text) ? 'his-server' : /not proven gone/i.test(text) ? 'teardown' : 'body';
    say(`the ${which} launch of the ${build.label} build threw (${entry.thrown}); the helper's own lines above say why`);
  }
  // His words on the app's console (the logger writes every line there at
  // every level, and app.log keeps info and above): a count, never a line.
  if (launched !== null) {
    try {
      entry.consoleHits = wordHits(launched.text());
      entry.consoleRead = true;
    } catch {
      entry.consoleRead = false;
    }
  }
  entry.crash = crashDiff(crashBefore, crashReports());
}

async function runBuild(build) {
  const readings = {};
  await launchOnce(build, 'one', driveOne, readings);
  if (ARMS.has('R') && gradePreconditions(readings.preconditions ?? {}).ok === true) {
    if (readings.handoff?.id !== undefined) await launchOnce(build, 'two', driveTwo, readings);
    else readings.R = { unreadable: readings.handoff?.unreadable ?? 'the first launch made no session to restore' };
  }
  return readings;
}

// ---------------------------------------------------------------------------

let ran = false;
let preconditionsOk = false;
try {
  writeWorld();
  const resolution = Object.fromEntries(BUILDS.map((b) => [b.label, resolvedToStandIns(b.label)]));
  report.resolution = resolution;
  const shadows = BUILDS.map((b) => ({ label: b.label, ...shadowCopies(b.checkout) }));
  report.shadows = shadows;
  const shadowed = shadows.find((x) => !x.ok);
  const unresolved = Object.entries(resolution).find(([, r]) => !r.resolved);
  if (shadowed !== undefined) {
    record('run', 'preconditions', v(null, `${shadowed.label}: ${shadowed.why}; nothing is launched, because the app's scan would run it for its version`));
  } else if (unresolved !== undefined) {
    record('run', 'preconditions', v(null, `${unresolved[0]}: a bare name resolves elsewhere: ${unresolved[1].elsewhere.join(', ')}; nothing is launched`));
  } else {
    preconditionsOk = true;
    // Each build's verdicts printed as soon as it is read; HEAD's graded
    // beside the parent's own (`gradeAll`, the one wiring the self-test drives).
    for (const [i, build] of BUILDS.entries()) {
      report.readings[build.label] = await runBuild(build);
      for (const [label, id, verdict] of gradeAll(report.readings, ARMS, BUILDS.slice(0, i + 1))) {
        if (label === build.label) record(label, id, verdict);
      }
    }
    ran = true;
  }
} catch (err) {
  record('run', 'the run', v(false, `it threw: ${String(err?.message ?? err)}`));
} finally {
  // THE STAND-INS, THEIR HELPERS, TOOLS AND TERMINAL TOOLS, by pid. Each
  // launch's teardown ended the scratch server, which hangs every pane up, and
  // each stand-in ends its own children in its finally; anything this run
  // recorded that is still running with the same command line is ended here.
  for (const n of existsSync(STANDIN_DIR) ? readdirSync(STANDIN_DIR) : []) {
    const m = /^state-(\d+)\.json$/.exec(n);
    if (m === null) continue;
    const st = stateOf(Number(m[1]));
    for (const k of [...(st?.helpers ?? []), ...(st?.tools ?? []), ...(st?.terminals ?? [])]) if (k.live === true) noteProc(k.pid);
  }
  const ended = await endByPid([...ours.keys()]);
  report.processes = { seen: ours.size, leftAfterTeardown: ended.asked, neededKill: ended.killed, survivors: [...ours].filter(([pid, cmd]) => commandOf(pid) === cmd).length };
  // The scratch socket's FILE, when no server answers on it: each launch's
  // teardown ends the server and removes it, and a file left behind is
  // unlinked here. One a live server still holds is left for the harness to
  // end, and RUN reads it as left.
  if (existsSync(socketFile())) {
    const asked = tmuxRun(['list-sessions']);
    if (asked.status !== 0 && /no server running|error connecting|connection refused/i.test(asked.stderr ?? '')) rmSync(socketFile(), { force: true });
  }
  // The app's own log, its console and the build's files, read for his words
  // and his record before the scratch world goes: counts only.
  const runFiles = scanFilesForRecord([HARNESS_DIR]);
  report.logs = Object.fromEntries(BUILDS.map((b) => [b.label, scanBuild(b.label, runFiles)]));
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}

const ps = spawnSync('/bin/ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
// The process table is READ, never assumed (the probe review): a /bin/ps that
// could not run answers nothing, which would read as nothing of the run left,
// so RUN takes it as unread. This run's own pid must be in the table.
const psRead = ps.status === 0 && commandOf(process.pid) !== '' && new RegExp(`^\\s*${String(process.pid)}\\s`, 'm').test(ps.stdout ?? '');
const electronLines = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
const ofThisRun = electronLines.filter((l) => {
  const [pid, ppid] = l.trim().split(/\s+/).map(Number);
  return report.launches.some((s) => [s.shim, s.app].filter((x) => x > 0).some((x) => x === pid || x === ppid));
});
report.electron = { lines: electronLines.length, ofThisRun: ofThisRun.length };
report.historyAfter = historyStat();
const crashOurs = report.launches.flatMap((l) => l.crash?.ours ?? []);
report.crash = { ours: crashOurs, others: report.launches.reduce((n, l) => n + (l.crash?.others ?? 0), 0) };
if (ran || report.launches.length > 0) {
  for (const b of BUILDS) {
    if (!report.launches.some((l) => l.build === b.label)) continue;
    const x = report.logs?.[b.label];
    if (b.atParent) {
      say(
        `[parent] LOG, read and not graded: ${String(x?.hits ?? 'no')} piece(s) of his words in ${String(x?.files ?? 0)} app log file(s), ` +
          `${String(x?.consoleHits ?? 'no')} on its console (the run's files, read once for a record only HEAD keeps, are graded at HEAD)`
      );
    } else record(b.label, 'LOG', gradeLog(x));
  }
  record(
    'run',
    'RUN',
    gradeRun({
      electronsOfRun: psRead ? ofThisRun.length : null,
      survivors: psRead ? report.processes?.survivors : null,
      socketLeft: existsSync(socketFile()),
      thrown: report.launches.filter((l) => l.thrown === 'his-server' || l.thrown === 'teardown').length,
      bodyThrew: report.launches.filter((l) => l.thrown === 'body').length,
      crashOurs: crashOurs.length,
      crashOthers: report.crash.others,
      // A history file that could not be stat'ed at either end was not shown
      // unmoved (the probe review): RUN reads it as unread.
      historyMoved: /none/.test(`${HISTORY_BEFORE}|${report.historyAfter}`) ? null : report.historyAfter !== HISTORY_BEFORE
    })
  );
}

const OUT = join(ROOT, 'out', 'p3251');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'probe-p3251.json'), `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${join(OUT, 'probe-p3251.json')}${KEEP ? `, and kept the run's scratch world at ${RUN}` : ''}`);
if (!preconditionsOk || !ran) process.exit(2);
if (failures > 0) {
  say(`probe:p3251 FAILED ${String(failures)} reading(s)`);
  process.exit(1);
}
if (unreadable > 0) {
  say(`probe:p3251 could not READ ${String(unreadable)} reading(s); that is not a pass`);
  process.exit(2);
}
say('probe:p3251 OK');
process.exit(0);
