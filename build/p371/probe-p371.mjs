#!/usr/bin/env node
/**
 * probe:p371 — THE PHASE 371 APP RUN (build/p371/SPEC.md §8): what Tortie asks
 * git when a file is saved, and whether History, Branches, the remotes and a
 * file's history ever show something older than the parent (`e424fc64`) did.
 *
 * At the parent every saved file re-reads History: 10 git commands with the
 * Explorer in front, 15 with Source Control and a diff tab (SPEC §2.1). At HEAD
 * a change says whether git's own data may have moved, and only those re-read.
 * THE RISK IS STALENESS, so most of this probe is arm V: every way git's data
 * moves, driven from a terminal outside the app, in ten shapes of repository,
 * and the time until the PAGE shows the truth this probe's own git answers.
 *
 * THE COUNTING GIT. `build/p371/stand-in.zsh` is copied into the run's own `bin/`
 * as `git`, and that folder is first on the launched app's PATH and on the PATH
 * its login shell answers (SHELL=/bin/sh, a scratch HOME). It logs each call with
 * its next two arguments; a held call sleeps in zsh with no child and no CPU. The
 * run REFUSES (exit 2) unless that login shell resolves `git` to the stand-in
 * before each launch, and reads nothing unless a git call whose parent is the
 * app's own pid reached it after. Every git has HOME in scratch,
 * GIT_CONFIG_GLOBAL=/dev/null (a scratch file where an arm needs one) and
 * GIT_CONFIG_NOSYSTEM=1; every repository is one it made and every remote a bare
 * one on this disk. Terminal operations are /usr/bin/git children of this probe.
 *
 * WHAT IS SHOWN is read from the page's DOM, each time it changes: History's rows
 * with their sha, subject, refs and push mark, the branches with their arrows, the
 * remote branches, the remotes with their URL and their tracking mark, and the
 * followed file's rows. THE TRUTH is this probe's own git, asked after the
 * operation, written in the same words; "shown" is the moment they are equal. A
 * move that changes nothing drawn (gc, pack-refs, a stash) is timed by the first
 * read of History that starts after it instead.
 *
 * THE FUSE. Over 420 stand-ins alive in the process table blows the fuse (the
 * stand-in stops holding), stops the writer and ends that launch. Before any held
 * cell it waits for a 1 minute load under 60, at most 20 minutes, and it starts
 * nothing while memory reads under 20 percent free (ten minutes, then exit 3).
 *
 * TWO COUNTS at a held cell: the stand-in's log, where a call with no end line is
 * closed at its hold (main ended it), and the process table every 250 ms, where
 * only a stand-in whose own parent is not a stand-in counts.
 *
 * ONE ELECTRON AT A TIME through build/electron-run.mjs inside
 * build/harness-socket.mjs, the parent first in every pair, each launch on its own
 * scratch profile, HOME and ZDOTDIR with HISTFILE=/dev/null, the harness socket as
 * its `tmuxSocket` (the helper's read-only census around it). NO AGENT RUNS, not
 * even for a version: every probed row is hidden and `agents:list` is read back.
 * No session is created, the Runs section is never opened, no Architecture map is
 * armed and quick open is never pressed. Main's inspector (`--inspect=0`) is used
 * by A8, N and P alone and closed before the app ends.
 *
 * THREE VERDICTS, AND A MISSING READING IS NEVER A PASS. Each grader names the
 * fields it reads (`reads`), the preconditions without which nothing it says can
 * be trusted (`needs`) and its `clauses`. An absent field or an unmet need is
 * UNREADABLE (exit 2); only a clause is FAIL (exit 1). Every reading comes out of
 * ONE pure function, `derive`, which `--grader-self-test` drives over recorded raw
 * fixtures (build/p371/fixtures/: the spec step's six cells and this probe's own
 * runs at the parent).
 *
 * THE ARMS (SPEC §8.2): M the six cells, V the moves, A1 to A8 the attack, P a
 * person's own presses, N every other consumer, and RUN.
 *
 * VERIFIERS ONLY: it starts Electrons. Take the lock.
 *
 *   P371_PARENT_CHECKOUT=<a built e424fc64> npm run -s probe:p371
 *   P371_ARMS=M,V,A1,…    the arms (default every one; RUN is always read)
 *   P371_CELLS=e-real,…   M's cells (e = the Explorer, s = Source Control and a diff tab; real, 1s, 10s)
 *   P371_SHAPES=ordinary,…  V's shapes
 *   P371_KEEP=1           keep every run folder, and each arm's raw input beside the report
 *   P371_REPORT=<file>    the report (default <harness dir>/report/probe-p371.json, outside the checkout)
 *   P371_HEAD_CHECKOUT=<built checkout>  DEVELOPMENT: launch it as HEAD; the run never exits 0
 *   P371_HEAD_ONLY=1      DEVELOPMENT: no parent; what compares with it reads UNREADABLE; never exits 0
 *   P371_PARENT_ONLY=1    DEVELOPMENT: the parent's half alone; never exits 0
 *   node build/p371/probe-p371.mjs --grader-self-test   every reader and grader over build/p371/fixtures/; starts nothing
 *   node build/p371/probe-p371.mjs --preflight          the builds, the stand-in and the helpers; starts nothing
 *   node build/p371/probe-p371.mjs --list-graders       every grader's reads, needs and clauses; starts nothing
 *   node build/p371/probe-p371.mjs --check-shapes <dir> DEVELOPMENT: make every shape under a scratch <dir> and run
 *                         every operation there with /usr/bin/git, no app (it starts git and nothing else)
 *
 * Run the flags with `node`, never through `npm run`, whose script hands them to
 * harness-socket.mjs, where they are ignored, and starts the whole app run.
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or an
 * arm could not be READ, 3 when the machine was short of memory.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { loadavg, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The helpers this run USES, imported statically so gate:electron counts this
// probe among build/electron-run.mjs's users. Each only DEFINES functions when
// imported, so the flags above still start nothing.
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const num = (x) => typeof x === 'number' && Number.isFinite(x);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seconds = () => Date.now() / 1000;
const short = (s) => createHash('sha1').update(String(s)).digest('hex').slice(0, 12);

// ---------------------------------------------------------------------------
// What this run holds the builds against, by value (SPEC §8)
// ---------------------------------------------------------------------------

/** The parent this phase measures against. */
export const PARENT_SNAPSHOT = 'e424fc64';
/** A name only a main bundle that carries this phase holds (D7). */
export const PHASE_MARK = 'reftable/tables.list';
/** The five subcommands History asks, and the three every other consumer does. */
export const FIVE = Object.freeze(['for-each-ref', 'remote', 'rev-parse', 'symbolic-ref', 'log']);
export const OTHERS = Object.freeze(['status', 'show', 'check-ignore']);
/** Each read of History by name: its walk, a search's, a file's, the two lists, the remotes, and the walk's first round. */
export const READS = Object.freeze(['walk', 'search', 'fileWalk', 'branches', 'remoteBranches', 'remotes', 'round']);
export const CELLS = Object.freeze([
  { id: 'e-real', view: 'explorer', holdMs: 0 },
  { id: 'e-1s', view: 'explorer', holdMs: 1_000 },
  { id: 'e-10s', view: 'explorer', holdMs: 10_000 },
  { id: 's-real', view: 'scm', holdMs: 0 },
  { id: 's-1s', view: 'scm', holdMs: 1_000 },
  { id: 's-10s', view: 'scm', holdMs: 10_000 }
]);
export const SHAPES = Object.freeze(['ordinary', 'linked', 'linked-other', 'linked-main', 'submodule', 'reftable', 'separate', 'include', 'subfolder', 'new-workdir', 'init']);
export const FUSE_AT = 420;
export const WRITE_MS = 200;
export const WRITE_S = 30;
/** The process table at a held cell: how often, and how long it may go unread. */
export const MIN_SAMPLES_A_SECOND = 2;
export const MAX_GAP_S = 2;
export const LOAD_CEILING = 60;
export const LOAD_WAIT_MIN = 20;
export const MEMORY_FLOOR = 20;
/** V and P: how much later than the parent a thing may show (SPEC §8.2). */
export const SLACK_MS = 400;
/** V: how long a move is watched with nothing else written, and how long after the unrelated save. */
export const QUIET_WATCH_MS = 3_000;
export const SHORT_WATCH_MS = 1_000;
export const SAVE_WATCH_MS = 6_000;
/** A1 to A5: shown by this. */
export const SHOWN_BY_MS = 10_000;
export const ATTACK_SAVE_MS = 5_000;
export const BURST_N = 20;
export const BURST_FILES = 1_000;
export const A7_MOVES = 60;
export const A7_GAP_MS = 350;
export const BLOCK_FLOOR_MS = 100;
export const BLOCK_SLACK_MS = 50;
export const N_SAVES = 10;
/** P: ten kinds of press, three tries each. */
export const PRESSES = 10;
export const PRESS_TRIES = 3;
/** N: the parent's own range is a few milliseconds wide at one load, and the two builds run minutes apart. */
export const N_NOISE_MS = 100;
/** Counts that may differ by a floor's own edge: one check-ignore or one status either side of the window. */
export const EDGE_STARTS = 2;
/** A shape's moves, and the rows of it the parent must show the way SPEC §2.2 says, or the instrument is not reading. */
export const EXPECT_AT_PARENT = Object.freeze({
  ordinary: { n: 84, once: ['commit', 'branch made', 'push'], save: ['remote added', 'upstream unset'] },
  linked: { n: 84, once: ['commit', 'checkout'], save: ['branch made', 'remote added'] },
  'linked-other': { n: 42, once: [], save: ['commit', 'branch made'] },
  'linked-main': { n: 42, once: ['commit', 'branch made'], save: ['remote added'] },
  submodule: { n: 81, once: ['commit', 'branch made'], save: ['remote added'] },
  reftable: { n: 84, once: ['commit'], save: ['branch made', 'remote added'] },
  separate: { n: 60, once: ['commit', 'branch made'], save: ['remote added'] },
  include: { n: 69, once: ['commit', 'branch made'], save: ['included file', 'global file'] },
  subfolder: { n: 60, once: [], save: ['commit', 'branch made', 'remote added'] },
  'new-workdir': { n: 57, once: ['commit'], save: ['branch made', 'remote added'] },
  init: { n: 3, once: [], save: ['git init'] }
});
/** Each arm's builds. */
export const ARM_SPECS = Object.freeze({
  M: ['parent', 'head'],
  V: ['parent', 'head'],
  A1: ['head'],
  A2: ['head'],
  A3: ['head'],
  A4: ['head'],
  A5: ['head'],
  A6: ['head'],
  A7: ['parent', 'head'],
  A8: ['parent', 'head'],
  P: ['parent', 'head'],
  N: ['parent', 'head']
});
export const DEFAULT_ARMS = Object.freeze(Object.keys(ARM_SPECS));
export const CENSUS_WORDS = "is the private server the operator's live";
/** What a probe's own environment carries that no launch may. */
const STRIPPED = /^(?:CLAUDECODE|CLAUDE_|P371_)|^(?:GMUX_CONFIG_ROOT|TERM_SESSION_ID|TERM_PROGRAM|TERM_PROGRAM_VERSION|SSH_AUTH_SOCK|TMUX|TMUX_PANE|GMUX_SESSION_ID|GMUX_MANAGED|SECURITYSESSIONID|GH_TOKEN|GITHUB_TOKEN)$/;

// ---------------------------------------------------------------------------
// THE ONE READER. Every reading comes out of `derive` and the pure helpers it
// calls. The live arms hand it what they read off the disk, `ps` and the page;
// --grader-self-test hands it the recorded raw fixtures.
// ---------------------------------------------------------------------------

/** Which of History's reads a call is, by its subcommand and its next two arguments; null for every other git. */
export function readOf(sub, rest) {
  if (sub === 'log') return rest.startsWith('-z,--topo-order') ? 'walk' : rest.startsWith('-z,--decorate=full') ? (rest.endsWith(',--follow') ? 'fileWalk' : 'search') : null;
  if (sub === 'for-each-ref') {
    if (rest.startsWith('refs/remotes,')) return 'remoteBranches';
    if (rest.startsWith('refs/heads,--format=%(refname:short)')) return 'branches';
    return null;
  }
  if (sub === 'remote') return rest === '-v' ? 'remotes' : null;
  // One a walk, History's and a file's alike: the walk's first round, counted as its own.
  if (sub === 'symbolic-ref') return rest === '--quiet,HEAD' ? 'round' : null;
  return null;
}

/**
 * The stand-in's log: one call a `S` line, closed by the next `E` line of the same
 * pid. A pid the system used twice is two calls. A line that is neither, or an `E`
 * with no open call, is TORN: a lost start would hide a call, so a log holding one
 * cannot be graded. The spec step's own logs carry no cwd and no `how`.
 */
export function parseLog(text) {
  const calls = [];
  const open = new Map();
  let torn = 0;
  for (const line of String(text ?? '').split('\n')) {
    if (line === '') continue;
    const f = line.split(' ');
    if (f[0] === 'S' && (f.length === 6 || f.length === 7) && [f[1], f[2], f[3]].every((x) => x !== '' && num(Number(x)))) {
      const c = { sub: f[4], rest: f[5] === '' ? '-' : f[5], pid: Number(f[2]), ppid: Number(f[3]), cwd: f[6] ?? null, start: Number(f[1]), end: null, how: null, code: null };
      c.read = readOf(c.sub, c.rest);
      if (open.has(f[2])) open.get(f[2]).before = c.start;
      calls.push(c);
      open.set(f[2], c);
    } else if (f[0] === 'E' && (f.length === 4 || f.length === 5) && open.has(f[2]) && num(Number(f[1])) && num(Number(f[3]))) {
      const c = open.get(f[2]);
      c.end = Number(f[1]);
      c.code = Number(f[3]);
      c.how = f[4] ?? null;
      open.delete(f[2]);
    } else torn += 1;
  }
  return { calls, torn };
}

/**
 * A call with no `E` line is one main ended, or one STILL RUNNING when the reading
 * ended. The log alone cannot tell them apart, so the process table is asked: such a
 * call is alive at least to its hold, then to the last table that showed its pid, and
 * to `until` when no table read after its hold says it went. A call alive at `until`
 * is `running` and never `killed`. With no samples at all (the spec step's own logs)
 * it is closed at its hold, or where its pid came back.
 */
export function closeOpen(calls, holdMs, until, samples) {
  for (const c of calls) {
    if (c.end !== null) continue;
    let last = c.start + holdMs / 1000 + 0.2;
    if (Array.isArray(samples)) {
      const after = samples.filter(([t]) => t >= last && t < (c.before ?? Infinity));
      const gone = after.findIndex(([, pids]) => !pids.includes(c.pid));
      // Never seen gone after its hold: still out, as far as anything that looked can say.
      if (gone < 0) last = until ?? after[after.length - 1]?.[0] ?? last;
      else if (gone > 0) last = after[gone - 1][0];
    }
    c.end = Math.max(c.start, Math.min(c.before ?? Infinity, until ?? Infinity, last));
    if (c.before === undefined && num(until) && c.end >= until) c.running = true;
    else c.killed = true;
  }
  return calls;
}

/** The most of `calls` alive at once over [from, to). */
export function mostAlive(calls, from = -Infinity, to = Infinity) {
  const events = [];
  for (const c of calls) {
    const s = Math.max(c.start, from);
    const e = Math.min(c.end ?? to, to);
    if (c.start >= to || e <= from || e < s) continue;
    events.push([s, 1], [e, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let alive = 0;
  let most = 0;
  for (const [, d] of events) {
    alive += d;
    if (alive > most) most = alive;
  }
  return most;
}

export const median = (xs) => {
  const v = xs.filter(num).sort((a, b) => a - b);
  if (v.length === 0) return null;
  return v.length % 2 === 1 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};
const round1 = (x) => Math.round(x * 10) / 10;
const round2 = (x) => Math.round(x * 100) / 100;
const startsIn = (calls, from, to) => calls.filter((c) => c.start >= from && c.start < to);
const countBy = (calls, key, names) => Object.fromEntries(names.map((n) => [n, calls.filter((c) => c[key] === n).length]));

/** Whether a git call whose parent is the app reached the stand-in, and the log's torn lines. */
function common(raw) {
  const { calls, torn } = parseLog(raw.log);
  closeOpen(calls, raw.holdMs ?? 0, raw.until, raw.samples);
  const apps = raw.appPids ?? [raw.appPid];
  return { calls, base: { app: { standIn: apps.length > 0 && apps.every((p) => calls.some((c) => c.ppid === p)) }, log: { torn } } };
}
/** How the process table was read over [from, to): how often, the longest gap (its first and last reading included), and the most it held. */
function tableOf(samples, from, to) {
  if (!Array.isArray(samples)) return {};
  const mine = samples.filter(([t]) => t >= from && t < to);
  if (mine.length < 2) return { rate: 0, gap: round2(to - from), most: Math.max(0, ...mine.map(([, p]) => p.length)) };
  const edges = [from, ...mine.map(([t]) => t), to];
  return { rate: round2(mine.length / Math.max(0.001, to - from)), gap: round2(Math.max(...edges.slice(1).map((t, i) => t - edges[i]))), most: Math.max(...mine.map(([, p]) => p.length)) };
}

function deriveM(raw) {
  const x = common(raw);
  const { from, to } = raw.marks;
  const inWindow = startsIn(x.calls, from, to);
  const five = countBy(inWindow, 'sub', FIVE);
  const others = countBy(inWindow, 'sub', OTHERS);
  const r = { ...x.base, cell: { id: raw.cell.id, holdMs: raw.cell.holdMs }, seconds: round1(to - from), changes: raw.changes, writes: raw.writes, fuse: { blown: raw.fused } };
  r.started = { ...five, ...others, five: Object.values(five).reduce((a, b) => a + b, 0) };
  if (num(raw.changes) && num(raw.writes) && raw.writes > 0) {
    r.perChange = { five: round1(r.started.five / Math.max(1, raw.changes)), ...Object.fromEntries(OTHERS.map((s) => [s, round2(others[s] / Math.max(1, raw.changes))])) };
    r.perWrite = round2(raw.changes / raw.writes);
  }
  const held = x.calls.filter((c) => c.sub !== 'check-ignore');
  r.alive = { log: mostAlive(x.calls, from, to) };
  r.hold = { short: raw.cell.holdMs === 0 ? 0 : held.filter((c) => !c.killed && !c.running && c.start >= from && c.end < to && (c.end - c.start) * 1000 < raw.cell.holdMs - 20).length };
  r.table = tableOf(raw.samples, from, to);
  if (raw.thread !== undefined) r.thread = raw.thread;
  return r;
}

/**
 * One move: when the page (or, for a move that draws nothing, the first read of
 * History that started after it) showed it. `once` is with nothing else written.
 */
export function seenOf(inst, calls) {
  const drawn = inst.truth !== inst.before;
  const at = drawn
    ? (inst.states.find(([t, h]) => t >= inst.t0 && h === inst.truth)?.[0] ?? null)
    : (calls.find((c) => (c.read !== null || FIVE.includes(c.sub)) && c.start >= inst.t0 && c.start <= inst.end)?.start ?? null);
  const once = at !== null && (inst.save === null || at < inst.save);
  return { drawn, once, ms: at === null ? null : Math.round(Math.max(0, at - (once ? inst.t1 : inst.save)) * 1000) };
}
function rowsOf(instances, calls) {
  const rows = {};
  for (const inst of instances) {
    const s = seenOf(inst, calls);
    const r = (rows[inst.row] ??= { n: 0, drawn: false, once: 0, save: 0, never: 0, drew: 0, onceEach: [], saveEach: [] });
    r.n += 1;
    r.drawn = r.drawn || s.drawn;
    r.drew += s.drawn ? 1 : 0;
    if (s.ms === null) r.never += 1;
    else if (s.once) {
      r.once += 1;
      r.onceEach.push(s.ms);
    } else {
      r.save += 1;
      r.saveEach.push(s.ms);
    }
  }
  for (const r of Object.values(rows)) {
    r.onceMs = median(r.onceEach) ?? -1;
    r.saveMs = median(r.saveEach) ?? -1;
  }
  return rows;
}
function deriveV(raw) {
  const x = common(raw);
  const rows = rowsOf(raw.instances, x.calls);
  const expect = EXPECT_AT_PARENT[raw.shape];
  return {
    ...x.base,
    shape: raw.shape,
    n: raw.instances.length,
    expected: raw.planned ?? expect.n, // a recording trimmed to some rows says how many it kept; a live one never does
    healed: raw.healed ?? null,
    five: x.calls.filter((c) => FIVE.includes(c.sub)).length,
    failedOps: raw.failedOps ?? [],
    rows,
    // Printed, never graded: a save after which main sent the page nothing at all (the Mac's own file events stalled, or the watcher lost them).
    unheard: raw.instances.filter((i) => i.save !== null && i.heard === 0).map((i) => `${i.row} ${String(i.k)}`),
    unexpected: [
      ...expect.once.filter((row) => !(rows[row]?.once > rows[row]?.n / 2)).map((row) => `${row}: not at once`),
      ...expect.save.filter((row) => !(rows[row]?.save > rows[row]?.n / 2)).map((row) => `${row}: not only after the save`)
    ]
  };
}

/**
 * HEAD's rows beside the parent's. A row the parent showed at once (more than half
 * of its tries) must be shown at once as often, never left unshown more often, its
 * median no more than SLACK_MS later. A DRAWN row it showed only after a save must be shown at once or after the
 * save, no later after it. A row that draws nothing and that the parent asked about
 * only because a file was saved is the accident this phase removes: not compared.
 */
export function compareRows(parent, head) {
  const out = { absent: [], notAtOnce: [], later: [], notShown: [], laterAfterSave: [], compared: 0 };
  for (const [row, p] of Object.entries(parent ?? {})) {
    const h = head?.[row];
    // A move that draws on one build and not on the other was not the same move: no reading, never "shown".
    if (h === undefined || h.n !== p.n || h.drew !== p.drew) {
      out.absent.push(row);
      continue;
    }
    if (p.once > p.n / 2) {
      out.compared += 1;
      if (h.never > p.never) out.notShown.push(`${row}: ${String(h.never)} never shown, the parent ${String(p.never)}`);
      if (h.once < p.once) out.notAtOnce.push(`${row}: ${String(h.once)} of ${String(h.n)}, the parent ${String(p.once)}`);
      else if (h.onceMs > p.onceMs + SLACK_MS) out.later.push(`${row}: ${String(h.onceMs)} ms, the parent ${String(p.onceMs)}`);
    } else if (p.drawn) {
      out.compared += 1;
      if (h.never > p.never) out.notShown.push(`${row}: ${String(h.never)} never shown, the parent ${String(p.never)}`);
      if (h.save > 0 && p.save > 0 && h.saveMs > p.saveMs + SLACK_MS) out.laterAfterSave.push(`${row}: ${String(h.saveMs)} ms after the save, the parent ${String(p.saveMs)}`);
    }
  }
  return out;
}

/** The attack arms whose reading is "each move shown, and how soon after its mark". */
function shownOf(raw, calls) {
  const each = raw.instances.map((i) => {
    const s = seenOf(i, calls);
    const from = i.from ?? i.save ?? i.t1;
    const at = s.drawn ? (i.states.find(([t, h]) => t >= i.t0 && h === i.truth)?.[0] ?? null) : null;
    return { row: i.row, drawn: s.drawn, once: s.once, ms: at === null ? -1 : Math.round(Math.max(0, at - from) * 1000) };
  });
  return { n: each.length, undrawn: each.filter((e) => !e.drawn).length, missing: each.filter((e) => e.ms < 0).map((e) => e.row), worst: Math.max(0, ...each.map((e) => e.ms)), each };
}
/** Null when a mark was never made: an empty window would read as "none started". */
const fiveIn = (calls, from, to) => (num(from) && num(to) ? startsIn(calls, from, to).filter((c) => FIVE.includes(c.sub)).length : null);
const spanOf = (from, to) => (num(from) && num(to) ? round1(to - from) : null);

function deriveA(raw) {
  const x = common(raw);
  const r = { ...x.base, failedOps: raw.failedOps ?? [] };
  const m = raw.marks ?? {};
  if (Array.isArray(raw.instances)) r.shown = shownOf(raw, x.calls);
  if (raw.arm === 'A1') r.burst = { files: raw.files, inside: raw.instances.filter((i) => i.writesMs <= 300).length };
  if (raw.arm === 'A3') {
    r.kills = { sent: raw.kills.filter((k) => k.sent === true && k.verified === true).length, launches: raw.kills.length, back: raw.kills.filter((k) => k.back === true).length };
    r.after = { saves: raw.afterSaves.length, reread: raw.afterSaves.filter(([a, b]) => fiveIn(x.calls, a, b) > 0).length };
  }
  if (raw.arm === 'A5') r.stop = { verified: raw.stop.verified === true, seconds: round1(raw.stop.contAt - raw.stop.at), saves: raw.stop.saves, moves: raw.stop.moves };
  if (raw.arm === 'A6') {
    const failing = startsIn(x.calls, m.open, m.answer);
    r.failing = { failed: failing.filter((c) => c.how === 'failed').length, ended: failing.filter((c) => c.sub === 'log' && c.killed === true).length, alone: fiveIn(failing, m.quiet, m.answer), seconds: spanOf(m.quiet, m.answer) };
    r.answering = { alone: fiveIn(x.calls, m.answer, m.save), seconds: spanOf(m.answer, m.save) };
    r.save = { shownMs: num(raw.shownAt) ? Math.round((raw.shownAt - m.save) * 1000) : -1, before: raw.shownBefore === true };
    r.next = { five: fiveIn(x.calls, m.next, m.end), heard: raw.nextHeard, seconds: spanOf(m.next, m.end) };
  }
  if (raw.arm === 'A7') {
    r.cells = {};
    for (const c of raw.cells) {
      const y = common(c);
      r.app.standIn = (Object.keys(r.cells).length === 0 || r.app.standIn) && y.base.app.standIn;
      r.log.torn += y.base.log.torn;
      const alive = Object.fromEntries(READS.map((k) => [k, mostAlive(y.calls.filter((z) => z.read === k))]));
      // The stand-in sleeps and THEN real git reads, so a read begun before the last move can answer it by luck. Only one begun after it must, and a walk's refs are the ones its FIRST ROUND read, so two of those (the walk's and the file's) must be.
      const afterMoves = Object.fromEntries(['round', 'walk', 'branches', 'remoteBranches', 'remotes', 'fileWalk'].map((k) => [k, num(c.marks.moved) ? y.calls.filter((z) => z.read === k && z.start >= c.marks.moved).length : null]));
      r.cells[c.id] = { holdMs: c.holdMs, moves: c.moves, alive, afterMoves, kept: c.kept ?? null, running: y.calls.filter((z) => z.running === true).length, started: countBy(y.calls, 'read', READS), log: mostAlive(y.calls), table: tableOf(c.samples, c.marks.from, c.marks.to), lastShownMs: num(c.shownAt) ? Math.round(Math.max(0, c.shownAt - c.marks.last) * 1000) : -1, fused: c.fused ?? null, short: y.calls.filter((z) => !z.killed && !z.running && z.sub !== 'check-ignore' && z.start < c.marks.lift && z.start >= c.marks.from && (z.end - z.start) * 1000 < c.holdMs - 20).length };
    }
  }
  if (raw.arm === 'A8') {
    const five = fiveIn(x.calls, m.writer, m.end);
    r.writer = { seconds: spanOf(m.writer, m.writerEnd), changes: raw.changes, five, least: num(m.writer) && num(m.end) ? Math.min(...['walk', 'branches', 'remoteBranches', 'remotes'].map((k) => startsIn(x.calls, m.writer, m.end).filter((c) => c.read === k).length)) : null };
    r.block = { longestMs: raw.longestMs, beats: raw.beats };
    r.config = { read: raw.configRead === true };
  }
  return r;
}

/** When the page first drew the truth after the press; null when it never did, or drew something else by the end (an older answer over it). */
const drawnAt = (p) => (p.states[p.states.length - 1]?.[1] === p.truth ? (p.states.find(([t, h]) => t >= p.t0 && h === p.truth)?.[0] ?? null) : null);

function deriveP(raw) {
  const x = common(raw);
  const rows = {};
  for (const p of raw.presses) {
    const mine = startsIn(x.calls, p.t0, p.end);
    const reads = countBy(mine, 'read', READS);
    const status = mine.filter((c) => c.sub === 'status').length;
    const ends = mine.filter((c) => c.read !== null && !c.killed).map((c) => c.end);
    const ms = p.kind === 'reads' ? (ends.length === 0 ? null : Math.max(...ends) - p.t0) : p.kind === 'page' ? (num(p.seenAt) && p.seenAt >= p.t0 ? p.seenAt - p.t0 : null) : drawnAt(p) === null ? null : drawnAt(p) - p.t0;
    const r = (rows[p.row] ??= { n: 0, missing: 0, each: [], starts: [] });
    r.n += 1;
    if (ms === null) r.missing += 1;
    else r.each.push(Math.round(ms * 1000));
    r.starts.push({ ...reads, status });
  }
  for (const r of Object.values(rows)) {
    r.ms = median(r.each) ?? -1;
    r.median = Object.fromEntries([...READS, 'status'].map((k) => [k, median(r.starts.map((s) => s[k])) ?? 0]));
    delete r.starts;
  }
  const c = raw.change;
  return { ...x.base, failedOps: raw.failedOps ?? [], rows, change: c === undefined || c === null ? {} : { applied: c.applied === true, seconds: round1(c.to - c.from), heard: c.heard, walks: startsIn(x.calls, c.from, c.to).filter((k) => k.read === 'walk' || k.read === 'search').length } };
}
/** HEAD's presses beside the parent's: no more of any read a press, and shown no more than SLACK_MS later. */
export function comparePresses(parent, head) {
  const out = { absent: [], more: [], later: [], compared: 0 };
  for (const [row, p] of Object.entries(parent ?? {})) {
    const h = head?.[row];
    if (h === undefined || h.n !== p.n) {
      out.absent.push(row);
      continue;
    }
    out.compared += 1;
    for (const k of [...READS, 'status']) if (h.median[k] > p.median[k]) out.more.push(`${row}: ${k} ${String(h.median[k])}, the parent ${String(p.median[k])}`);
    if (h.missing > p.missing) out.later.push(`${row}: ${String(h.missing)} never shown`);
    else if (h.ms > p.ms + SLACK_MS) out.later.push(`${row}: ${String(h.ms)} ms, the parent ${String(p.ms)}`);
  }
  return out;
}

function deriveN(raw) {
  const x = common(raw);
  const of = (k) => {
    const all = raw.saves.filter((s) => s[k] !== undefined);
    const each = all.map((s) => (num(s[k]) && s[k] >= s.t ? Math.round((s[k] - s.t) * 1000) : null));
    return { n: all.length, missing: each.filter((e) => e === null).length, median: median(each) ?? -1, most: Math.max(-1, ...each.filter(num)), each };
  };
  const inSaves = raw.saves.flatMap((s) => startsIn(x.calls, s.t, s.end));
  const n = Math.max(1, raw.saves.length);
  return {
    ...x.base,
    saves: raw.saves.length,
    explorer: of('explorer'),
    editor: of('editor'),
    changes: of('changes'),
    heard: round2(raw.saves.reduce((a, s) => a + s.heard, 0) / n),
    perSave: Object.fromEntries([...OTHERS, ...FIVE].map((s) => [s, round2(inSaves.filter((c) => c.sub === s).length / n)])),
    five: raw.saves.every((s) => num(s.t) && num(s.end)) ? inSaves.filter((c) => FIVE.includes(c.sub)).length : null,
    shortest: raw.saves.every((s) => num(s.t) && num(s.end)) ? round1(Math.min(Infinity, ...raw.saves.map((s) => s.end - s.t))) : null,
    block: { longestMs: raw.longestMs, beats: raw.beats }
  };
}

/** THE ONE READER. A field the raw input does not carry is left out, never invented. */
export function derive(raw) {
  if (raw.arm === 'M') return deriveM(raw);
  if (raw.arm === 'V') return deriveV(raw);
  if (raw.arm === 'P') return deriveP(raw);
  if (raw.arm === 'N') return deriveN(raw);
  return deriveA(raw);
}

// ---------------------------------------------------------------------------
// The graders (pure, over a reading): used live and in --grader-self-test
// ---------------------------------------------------------------------------

const N_STANDIN = ['a git call whose parent is the app reached the stand-in', (r) => r.app.standIn === true];
const N_TORN = ['every line of the stand-in’s log was read whole', (r) => r.log.torn === 0];
const N_OPS = ['every operation did what it says', (r) => r.failedOps.length === 0];
const N_PARENT = ['the parent’s own reading was read first and passed', (r) => r.parent.verdict === 'pass'];
const N_FUSE = ['the fuse was never blown', (r) => r.fuse.blown === false];
const N_WROTE = [`the writer wrote for its ${String(WRITE_S)} s and main sent at least 30 changes`, (r) => r.seconds >= WRITE_S - 0.5 && r.changes >= 30];
const N_HELD = ['every call of a held cell was held its whole hold', (r) => r.hold.short === 0];
const N_TABLE = [`at a held cell the process table was read at least ${String(MIN_SAMPLES_A_SECOND)} times a second, never ${String(MAX_GAP_S)} s apart`, (r) => r.cell.holdMs === 0 || (r.table.rate >= MIN_SAMPLES_A_SECOND && r.table.gap <= MAX_GAP_S)];
const N_DRAWN = ['every move changed what the page draws', (r) => r.shown.undrawn === 0];
const BASE = ['app.standIn', 'log.torn'];
const M_READS = [...BASE, 'cell.holdMs', 'seconds', 'changes', 'fuse.blown', 'started.five', 'perChange.five', 'perWrite', 'alive.log', 'hold.short'];
const shownBy = (ms) => [`every move was shown within ${String(ms)} ms`, (r) => r.shown.missing.length === 0 && r.shown.worst <= ms];
const noMore = (s) => [`no more ${s} a change than the parent (${String(EDGE_STARTS)} starts of edge)`, (r) => r.started[s] <= (r.parent[s] / Math.max(1, r.parent.changes)) * r.changes + EDGE_STARTS];

export const GRADERS = {
  'M-parent': {
    title: 'the parent asks git for History on every saved file',
    reads: M_READS,
    needs: [N_STANDIN, N_TORN, N_WROTE, N_HELD, N_FUSE],
    clauses: [['at least five of the five a change', (r) => r.perChange.five >= 5]]
  },
  'M-head': {
    title: 'HEAD asks none of the five for a saved file, and no other git more often',
    reads: [...M_READS, 'started.status', 'started.show', 'started.check-ignore', 'table', 'parent.verdict', 'parent.changes', 'parent.perWrite', 'parent.status', 'parent.show', 'parent.check-ignore'],
    needs: [N_STANDIN, N_TORN, N_WROTE, N_HELD, N_FUSE, N_TABLE, N_PARENT],
    clauses: [
      ...FIVE.map((s) => [`no ${s} for a saved file`, (r) => r.started[s] === 0]),
      ...OTHERS.map(noMore),
      ['changes delivered a write within 15 percent of the parent’s', (r) => Math.abs(r.perWrite - r.parent.perWrite) <= 0.15 * r.parent.perWrite]
    ]
  },
  'V-parent': {
    title: 'the parent’s moves in this shape, as SPEC §2.2 says it shows them',
    reads: [...BASE, 'shape', 'n', 'expected', 'five', 'failedOps', 'rows', 'unexpected'],
    needs: [N_STANDIN, N_TORN, N_OPS, ['every move of the shape was made', (r) => r.n === r.expected], ['the parent asked for the five at least once a move', (r) => r.five >= r.n], ['the rows this shape is known by read as SPEC §2.2 says', (r) => r.unexpected.length === 0]],
    clauses: []
  },
  'V-head': {
    title: 'HEAD shows every move no later than the parent did',
    reads: [...BASE, 'shape', 'n', 'failedOps', 'rows', 'parent.verdict', 'compare.absent', 'compare.compared', 'compare.notAtOnce', 'compare.later', 'compare.notShown', 'compare.laterAfterSave'],
    needs: [N_STANDIN, N_TORN, N_OPS, N_PARENT, ['every row of the parent’s was read as often', (r) => r.compare.absent.length === 0 && r.compare.compared >= 1]],
    clauses: [
      ['every move the parent showed at once is shown at once', (r) => r.compare.notAtOnce.length === 0],
      [`its median no more than ${String(SLACK_MS)} ms later than the parent’s`, (r) => r.compare.later.length === 0],
      ['every move the parent showed, at once or only after a save, is shown', (r) => r.compare.notShown.length === 0],
      [`and never later after the save by more than ${String(SLACK_MS)} ms`, (r) => r.compare.laterAfterSave.length === 0]
    ]
  },
  'A1-head': {
    title: 'a ref move inside a thousand file writes',
    reads: [...BASE, 'failedOps', 'shown.n', 'shown.undrawn', 'shown.missing', 'shown.worst', 'burst.files', 'burst.inside'],
    needs: [N_STANDIN, N_TORN, N_OPS, N_DRAWN, [`${String(BURST_N)} bursts of ${String(BURST_FILES)} files, at least half of them written inside 300 ms`, (r) => r.shown.n === BURST_N && r.burst.files === BURST_FILES && r.burst.inside >= BURST_N / 2]],
    clauses: [shownBy(SHOWN_BY_MS)]
  },
  'A2-head': {
    title: 'a move beside a reload, and ten moves behind another tab',
    reads: [...BASE, 'failedOps', 'shown.n', 'shown.undrawn', 'shown.missing', 'shown.worst'],
    needs: [N_STANDIN, N_TORN, N_OPS, N_DRAWN, ['nine reloads and one return were read', (r) => r.shown.n === 10]],
    clauses: [shownBy(SHOWN_BY_MS)]
  },
  'A3-head': {
    title: 'the watcher process killed around a move',
    reads: [...BASE, 'failedOps', 'shown.n', 'shown.undrawn', 'shown.missing', 'shown.worst', 'kills.sent', 'kills.launches', 'kills.back', 'after.saves', 'after.reread'],
    needs: [N_STANDIN, N_TORN, N_OPS, N_DRAWN, ['SIGKILL went to this app’s own watcher process in each of four launches, read by ps first', (r) => r.kills.launches === 4 && r.kills.sent === 4 && r.shown.n === 4], ['a new watcher process came back each time', (r) => r.kills.back === 4], ['three saves a launch were read afterwards', (r) => r.after.saves === 12]],
    clauses: [shownBy(SHOWN_BY_MS), ['every later save re-reads (D3: a stream that may be dead is never trusted again)', (r) => r.after.reread === r.after.saves]]
  },
  'A4-head': {
    title: 'the git directory taken away, made again, or pointed elsewhere',
    reads: [...BASE, 'failedOps', 'shown.n', 'shown.undrawn', 'shown.missing', 'shown.worst'],
    needs: [N_STANDIN, N_TORN, N_OPS, N_DRAWN, ['four shapes, two moves each', (r) => r.shown.n === 8]],
    clauses: [shownBy(ATTACK_SAVE_MS)]
  },
  'A5-head': {
    title: 'the app stopped for ten seconds while the repository moves',
    reads: [...BASE, 'failedOps', 'shown.n', 'shown.undrawn', 'shown.missing', 'shown.worst', 'stop.verified', 'stop.seconds', 'stop.saves', 'stop.moves'],
    needs: [N_STANDIN, N_TORN, N_OPS, N_DRAWN, ['the app’s own process was stopped for ten seconds over five moves and fifty saves', (r) => r.stop.verified === true && r.stop.seconds >= 9.5 && r.stop.saves === 50 && r.stop.moves === 5]],
    clauses: [shownBy(SHOWN_BY_MS)]
  },
  'A6-head': {
    title: 'a git that fails while the project opens',
    reads: [...BASE, 'failedOps', 'failing.failed', 'failing.ended', 'failing.alone', 'failing.seconds', 'answering.alone', 'answering.seconds', 'save.shownMs', 'save.before', 'next.five', 'next.heard', 'next.seconds'],
    needs: [N_STANDIN, N_TORN, N_OPS, ['git was seen to fail, and a walk to be ended at its time limit', (r) => r.failing.failed >= 2 && r.failing.ended >= 1], ['the failing quiet was watched for 8 s', (r) => r.failing.seconds >= 8], ['nothing was shown whole before the save', (r) => r.save.before === false], ['main sent the second save', (r) => r.next.heard >= 1], ['git answering was watched for 3 s before the save, and the second save for 3 s', (r) => r.answering.seconds >= 3 && r.next.seconds >= 3]],
    clauses: [
      ['nothing is started by itself while git fails', (r) => r.failing.alone === 0],
      ['nothing is started by itself once git answers', (r) => r.answering.alone === 0],
      [`the save shows the truth within ${String(ATTACK_SAVE_MS)} ms`, (r) => r.save.shownMs >= 0 && r.save.shownMs <= ATTACK_SAVE_MS],
      ['the next save starts none of the five', (r) => r.next.five === 0]
    ]
  },
  'A7-parent': {
    title: 'sixty ref moves under a held git at the parent, printed',
    reads: [...BASE, 'failedOps', 'cells.1s', 'cells.10s'],
    needs: [N_STANDIN, N_TORN, N_OPS, ['sixty moves at each hold, or the fuse blew first', (r) => ['1s', '10s'].every((c) => r.cells[c].moves === A7_MOVES || r.cells[c].fused === true)], ['the parent asked for each of the reads', (r) => ['1s', '10s'].every((c) => ['walk', 'branches', 'remoteBranches', 'remotes', 'round', 'fileWalk'].every((k) => r.cells[c].started[k] >= 1))]],
    clauses: []
  },
  'A7-head': {
    title: 'sixty ref moves under a held git: each read one at a time',
    reads: [...BASE, 'failedOps', 'cells.1s', 'cells.10s', ...['1s', '10s'].flatMap((c) => ['round', 'walk', 'branches', 'remoteBranches', 'remotes', 'fileWalk'].map((k) => `cells.${c}.afterMoves.${k}`).concat(`cells.${c}.kept`))],
    needs: [N_STANDIN, N_TORN, N_OPS, ['sixty moves at each hold, every call before the lift held whole, the fuse never blown', (r) => ['1s', '10s'].every((c) => r.cells[c].moves === A7_MOVES && r.cells[c].short === 0 && r.cells[c].fused === false)], ['each hold was watched until nothing was out', (r) => ['1s', '10s'].every((c) => r.cells[c].running === 0)], ['the walk, the lists and the remotes were each read at each hold', (r) => ['1s', '10s'].every((c) => ['walk', 'branches', 'remoteBranches', 'remotes', 'round', 'fileWalk'].every((k) => r.cells[c].started[k] >= 1))]],
    clauses: [
      ...['walk', 'branches', 'remoteBranches', 'remotes'].map((k) => [`at most one ${k} alive a repository`, (r) => ['1s', '10s'].every((c) => r.cells[c].alive[k] <= 1)]),
      ['at most one file walk alive a window', (r) => ['1s', '10s'].every((c) => r.cells[c].alive.fileWalk <= 1)],
      ['at most two first rounds alive, the walk’s and the file’s', (r) => ['1s', '10s'].every((c) => r.cells[c].alive.round <= 2)],
      ['the last move is shown once the held reads drain', (r) => ['1s', '10s'].every((c) => r.cells[c].lastShownMs >= 0)],
      ['each read was begun again after the last move', (r) => ['1s', '10s'].every((c) => Object.entries(r.cells[c].afterMoves).every(([k, n]) => n >= (k === 'round' ? 2 : 1)))],
      ['and the page still shows it once every read has answered', (r) => ['1s', '10s'].every((c) => r.cells[c].kept === true)]
    ]
  },
  'A8-parent': {
    title: 'a hostile config at the parent, printed',
    reads: [...BASE, 'failedOps', 'writer.seconds', 'writer.changes', 'writer.least', 'block.longestMs', 'block.beats'],
    needs: [N_STANDIN, N_TORN, N_OPS, ['the writer ran ten seconds and main sent changes', (r) => r.writer.seconds >= 9.5 && r.writer.changes >= 10], ['main’s thread was read', (r) => r.block.beats >= 100], ['the parent re-read for a save', (r) => r.writer.least >= 1]],
    clauses: []
  },
  'A8-head': {
    title: 'a hostile config never holds main, and is never trusted',
    reads: [...BASE, 'failedOps', 'writer.seconds', 'writer.changes', 'writer.five', 'writer.least', 'block.longestMs', 'block.beats', 'config.read', 'parent.verdict', 'parent.longestMs'],
    needs: [N_STANDIN, N_TORN, N_OPS, N_PARENT, ['the config the app read names the FIFO', (r) => r.config.read === true], ['the writer ran ten seconds and main sent changes', (r) => r.writer.seconds >= 9.5 && r.writer.changes >= 10], ['main’s thread was read', (r) => r.block.beats >= 100]],
    clauses: [
      [`main’s longest block under ${String(BLOCK_FLOOR_MS)} ms, or the parent’s plus ${String(BLOCK_SLACK_MS)}`, (r) => r.block.longestMs <= Math.max(BLOCK_FLOOR_MS, r.parent.longestMs + BLOCK_SLACK_MS)],
      ['every save re-reads, each of the four reads (one in five may be joined behind a slow one)', (r) => r.writer.least >= 0.8 * r.writer.changes]
    ]
  },
  'P-parent': {
    title: 'a person’s own presses at the parent, printed',
    reads: [...BASE, 'failedOps', 'rows', 'change.applied', 'change.heard', 'change.walks'],
    needs: [N_STANDIN, N_TORN, N_OPS, ['every press was read and shown', (r) => Object.keys(r.rows).length === PRESSES && Object.values(r.rows).every((p) => p.n === PRESS_TRIES && p.missing === 0)], ['a change search was on screen while main sent changes', (r) => r.change.applied === true && r.change.heard >= 5]],
    clauses: [['a change search on screen is never run again by a change (Phase 199)', (r) => r.change.walks === 0]]
  },
  'P-head': {
    title: 'a person’s own presses at HEAD: no more git, and no later',
    reads: [...BASE, 'failedOps', 'rows', 'change.applied', 'change.heard', 'change.walks', 'parent.verdict', 'compare.absent', 'compare.more', 'compare.later', 'compare.compared'],
    needs: [N_STANDIN, N_TORN, N_OPS, N_PARENT, ['every press of the parent’s was read as often', (r) => r.compare.absent.length === 0 && r.compare.compared === PRESSES], ['a change search was on screen while main sent changes', (r) => r.change.applied === true && r.change.heard >= 5]],
    clauses: [
      ['no press starts more of any read than at the parent', (r) => r.compare.more.length === 0],
      [`every press is shown no later than the parent’s plus ${String(SLACK_MS)} ms`, (r) => r.compare.later.length === 0],
      ['a change search on screen is never run again by a change (Phase 199)', (r) => r.change.walks === 0]
    ]
  },
  'N-parent': {
    title: 'every other consumer of a saved file at the parent, printed',
    reads: [...BASE, 'saves', 'explorer.median', 'explorer.missing', 'editor.median', 'editor.missing', 'changes.median', 'changes.missing', 'heard', 'perSave', 'five', 'block.longestMs', 'block.beats'],
    needs: [N_STANDIN, N_TORN, ['the parent asked for the five on its saves', (r) => r.five >= r.saves], [`${String(N_SAVES * 2)} saves were read, each shown`, (r) => r.saves === N_SAVES * 2 && r.explorer.n === N_SAVES && r.changes.n === N_SAVES && r.editor.n === N_SAVES * 2 && r.explorer.missing + r.editor.missing + r.changes.missing === 0], ['main’s thread was read', (r) => r.block.beats >= 100]],
    clauses: []
  },
  'N-head': {
    title: 'every other consumer of a saved file at HEAD: as the parent',
    reads: [...BASE, 'saves', 'explorer.median', 'explorer.missing', 'editor.median', 'editor.missing', 'changes.median', 'changes.missing', 'heard', 'perSave', 'five', 'shortest', 'block.longestMs', 'block.beats', 'parent.verdict', 'parent.explorer', 'parent.editor', 'parent.changes', 'parent.heard', 'parent.perSave', 'parent.longestMs'],
    needs: [N_STANDIN, N_TORN, N_PARENT, [`${String(N_SAVES * 2)} saves were read`, (r) => r.saves === N_SAVES * 2 && r.explorer.n === N_SAVES && r.changes.n === N_SAVES && r.editor.n === N_SAVES * 2], ['each save was watched for 2.4 s', (r) => r.shortest >= 2.4], ['main’s thread was read', (r) => r.block.beats >= 100]],
    clauses: [
      ['every save was shown by every consumer', (r) => r.explorer.missing + r.editor.missing + r.changes.missing === 0],
      ['the Explorer’s row within the parent’s range (and 100 ms of the machine’s noise)', (r) => r.explorer.median <= r.parent.explorer + N_NOISE_MS],
      ['the editor’s reload within the parent’s range (and 100 ms of the machine’s noise)', (r) => r.editor.median <= r.parent.editor + N_NOISE_MS],
      ['Changes’ row within the parent’s range (and 100 ms of the machine’s noise)', (r) => r.changes.median <= r.parent.changes + N_NOISE_MS],
      ['no fewer changes heard a save', (r) => r.heard >= r.parent.heard - 0.15],
      ...OTHERS.map((s) => [`no more ${s} a save`, (r) => r.perSave[s] <= r.parent.perSave[s] + 0.15]),
      ['none of the five for a save', (r) => r.five === 0],
      [`main’s longest block under ${String(BLOCK_FLOOR_MS)} ms, or the parent’s plus ${String(BLOCK_SLACK_MS)}`, (r) => r.block.longestMs <= Math.max(BLOCK_FLOOR_MS, r.parent.longestMs + BLOCK_SLACK_MS)]
    ]
  },
  RUN: {
    title: 'the run: the preflights, the hidden agents, the census, the stand-in the only git, his history, no leftover',
    reads: ['preflight.ok', 'launches', 'launchesLooked', 'agentsHeld', 'censusFailures', 'processTableRead', 'otherGits', 'electronsLeft', 'leftovers', 'socketLeft', 'history'],
    needs: [['the process table was read', (r) => r.processTableRead === true], ['at least one app was launched', (r) => r.launches >= 1], ['the table was read beside every app whose window came', (r) => r.launchesLooked >= r.agentsHeld.filter((x) => x === true).length]],
    clauses: [
      ['every preflight held', (r) => r.preflight.ok === true],
      ['every launch’s agents:list resolved nothing', (r) => r.agentsHeld.length === r.launches && r.agentsHeld.every((x) => x === true)],
      ['the census found nothing of the run on his server', (r) => r.censusFailures.length === 0],
      ['every git the process table showed the app start was the stand-in', (r) => r.otherGits.length === 0],
      ['no Electron of the run left', (r) => r.electronsLeft === 0],
      ['no process naming a run folder was left to end', (r) => r.leftovers.length === 0],
      ['no tmux server of the run left by a launch', (r) => r.socketLeft === false],
      ['his shell history unmoved, or moved by his own terminal', (r) => historyHeld(r.history) === 'unmoved' || historyHeld(r.history) === 'his terminal']
    ]
  }
};

/** p349's history rule, by value: unmoved, held, his terminal, or unread. */
export function historyHeld(history) {
  if (history?.before === history?.after) return 'unmoved';
  if (history?.quiet === null || history?.quiet === undefined || typeof history.quiet.again !== 'string') return 'unread';
  return history.quiet.again !== history.after ? 'his terminal' : 'held';
}

function present(reading, path) {
  let o = reading;
  for (const k of String(path).split('.')) {
    if (o === null || o === undefined || typeof o !== 'object') return false;
    o = o[k];
  }
  return o !== undefined && o !== null;
}
const holds = (predicate, reading) => {
  try {
    return predicate(reading) === true;
  } catch {
    return false;
  }
};
export const missingField = (path) => `the reading has no ${path}`;

/** One grader's verdict. An absent field or an unmet need is UNREADABLE and no clause is asked. */
export function grade(id, reading) {
  const g = GRADERS[id];
  const missing = g.reads.filter((path) => !present(reading, path)).map(missingField);
  if (missing.length === 0) for (const [name, predicate] of g.needs) if (!holds(predicate, reading)) missing.push(name);
  if (missing.length > 0) return { verdict: 'unreadable', ok: null, failed: [], missing };
  const failed = g.clauses.filter(([, predicate]) => !holds(predicate, reading)).map(([name]) => name);
  return { verdict: failed.length === 0 ? 'pass' : 'fail', ok: failed.length === 0, failed, missing: [] };
}

/** The parent's reading, linked into HEAD's where HEAD's grader compares with it, with the parent's own verdict. */
export function linkParent(arm, reading, parent) {
  const verdict = parent === undefined ? null : grade(`${arm}-parent`, parent).verdict;
  if (arm === 'M') reading.parent = { verdict, changes: parent?.changes ?? null, perWrite: parent?.perWrite ?? null, ...Object.fromEntries(OTHERS.map((s) => [s, parent?.started?.[s] ?? null])) };
  if (arm === 'V') {
    reading.parent = { verdict };
    if (parent !== undefined) reading.compare = compareRows(parent.rows, reading.rows);
  }
  if (arm === 'P') {
    reading.parent = { verdict };
    if (parent !== undefined) reading.compare = comparePresses(parent.rows, reading.rows);
  }
  if (arm === 'A8') reading.parent = { verdict, longestMs: parent?.block?.longestMs ?? null };
  if (arm === 'N') reading.parent = { verdict, explorer: parent?.explorer?.most ?? null, editor: parent?.editor?.most ?? null, changes: parent?.changes?.most ?? null, heard: parent?.heard ?? null, perSave: parent?.perSave ?? null, longestMs: parent?.block?.longestMs ?? null };
  return reading;
}

// ---------------------------------------------------------------------------
// --grader-self-test. Starts nothing.
// ---------------------------------------------------------------------------

export const FIXTURES_DIR = join(ROOT, 'build', 'p371', 'fixtures');

function at(obj, path) {
  const keys = Array.isArray(path) ? path : String(path).split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) && Array.isArray(o) ? Number(k) : k];
  return { o, k: keys[keys.length - 1] };
}
export function applyOps(reading, ops) {
  for (const op of ops ?? []) {
    const { o, k } = at(reading, op.set ?? op.delete);
    if (op.set !== undefined) o[k] = structuredClone(op.value);
    else delete o[k];
  }
  return reading;
}
/**
 * What breaks one recorded run, its times counted from `zero` (the run's own first
 * mark): a call put in (`lasts` null: it writes no end line), a log cut, a line of
 * noise, calls dropped by name, a field set or taken away.
 */
function editRaw(r, edits) {
  const zero = r.marks?.from ?? r.marks?.open ?? r.instances?.[0]?.t0 ?? 0;
  for (const e of edits ?? []) {
    if (e.cell !== undefined) editRaw(r.cells[e.cell], e.edits);
    if (e.set !== undefined || e.delete !== undefined) applyOps(r, [e]);
    if (e.cutLogAt !== undefined) r.log = r.log.split('\n').filter((l) => l === '' || Number(l.split(' ')[1]) < zero + e.cutLogAt).join('\n');
    if (e.noise !== undefined) r.log += `${e.noise}\n`;
    if (e.drop !== undefined) {
      const pids = new Set();
      r.log = r.log.split('\n').filter((l) => {
        const f = l.split(' ');
        if (f[0] === 'S' && e.drop.includes(f[4])) pids.add(f[2]);
        else if (f[0] === 'S') pids.delete(f[2]);
        return !((f[0] === 'S' || f[0] === 'E') && pids.has(f[2]));
      }).join('\n');
    }
    if (e.call !== undefined) {
      for (let i = 0; i < (e.call.times ?? 1); i += 1) {
        const s = zero + e.call.at;
        const pid = (e.call.pid ?? 990_000) + i;
        r.log += `S ${String(s)} ${String(pid)} ${String(r.appPid)} ${e.call.sub} ${e.call.rest ?? '-'}\n${e.call.lasts === null ? '' : `E ${String(s + e.call.lasts)} ${String(pid)} 0\n`}`;
      }
    }
    // Every call with no end line given one at its hold: a drain the recording did not wait for.
    if (e.drain === true) {
      const text = r.log;
      for (const c of parseLog(text).calls) if (c.end === null) r.log += `E ${String(c.start + r.holdMs / 1000 + 0.05)} ${String(c.pid)} 0 held\n`;
    }
    if (e.shift !== undefined) applyOps(r, [{ set: e.shift.set, value: zero + e.shift.by }]);
    if (e.unmoved !== undefined) for (const i of r.instances) if (i.row === e.unmoved.row && i.k === e.unmoved.k) i.truth = i.before;
    if (e.hideSamples !== undefined) r.samples = r.samples.filter(([t]) => t < zero + e.hideSamples[0] || t > zero + e.hideSamples[1]);
    if (e.hideTruth !== undefined) for (const i of r.instances) if (i.row === e.hideTruth) i.states = i.states.filter(([, h]) => h !== i.truth);
    if (e.late !== undefined) for (const i of r.instances) if (i.row === e.late.row) i.states = i.states.map(([t, h]) => [h === i.truth ? t + e.late.by : t, h]);
  }
  return r;
}
/** One raw fixture's input: its JSON, with `logFile` or a whole recorded run named by file read from fixtures/raw/, and what breaks it. */
function rawOf(raw) {
  const r = raw.rawFile === undefined ? structuredClone(raw) : { ...JSON.parse(readFileSync(join(FIXTURES_DIR, 'raw', raw.rawFile), 'utf8')) };
  if (typeof r.logFile === 'string') r.log = readFileSync(join(FIXTURES_DIR, 'raw', r.logFile), 'utf8');
  return editRaw(r, raw.edits);
}

function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const fx = JSON.parse(readFileSync(join(FIXTURES_DIR, 'graders.json'), 'utf8'));
  const sole = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const soleMiss = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const judge = (id, name, expect, names, make) => {
    if (GRADERS[id] === undefined) return say(false, `${J(name)} names ${J(id)}, which is no grader`);
    let g;
    try {
      g = grade(id, make());
    } catch (err) {
      return say(false, `${id} "${name}" could not be read: ${String(err?.message ?? err)}`);
    }
    const got = J([...(g.verdict === 'fail' ? g.failed : g.missing)].sort());
    const right = g.verdict === expect && (names === undefined || got === J([...names].sort()));
    say(right, `${id} answers ${expect.toUpperCase()}${names === undefined ? '' : ` on exactly ${J(names)}`}: ${name}${right ? '' : ` (answered ${g.verdict} ${got})`}`);
    if (right && expect === 'fail' && names?.length === 1) sole.get(id).add(names[0]);
    if (right && expect === 'unreadable' && names?.length === 1) soleMiss.get(id).add(names[0]);
  };
  // 1. Every grader's honest reading passes; every broken one fails exactly the clauses it names; every unreadable one the needs.
  for (const id of Object.keys(GRADERS)) {
    if (fx.honest[id] === undefined) say(false, `${id} has no honest reading`);
    else judge(id, 'its honest reading', 'pass', [], () => structuredClone(fx.honest[id]));
  }
  for (const c of fx.broken) judge(c.grader, c.name, 'fail', c.mustFail, () => applyOps(structuredClone(fx.honest[c.grader]), c.ops));
  for (const c of fx.unreadable) judge(c.grader, c.name, 'unreadable', c.mustMiss, () => applyOps(structuredClone(fx.honest[c.grader]), c.ops));
  for (const c of fx.variants) judge(c.grader, c.name, c.expect, undefined, () => applyOps(structuredClone(fx.honest[c.grader]), c.ops));
  // 2. The recorded raw input through THE ONE READER: its numbers as SPEC §2.1's table and the recorded run say, and its verdict.
  let values = 0;
  for (const c of fx.raw) {
    let reading;
    try {
      const raw = rawOf(c.raw);
      reading = derive(raw);
      if (c.parent !== undefined) linkParent(raw.arm, reading, derive(rawOf(fx.raw.find((x) => x.name === c.parent).raw)));
    } catch (err) {
      say(false, `the reader over ${J(c.name)} threw: ${String(err?.message ?? err)}`);
      continue;
    }
    const wrong = Object.entries(c.expect ?? {}).filter(([path, want]) => {
      values += 1;
      const { o, k } = at(reading, path);
      return J(o?.[k]) !== J(want);
    });
    say(wrong.length === 0, `the reader over ${J(c.name)} reads ${String(Object.keys(c.expect ?? {}).length)} values as recorded${wrong.length === 0 ? '' : `: wrong ${J(wrong.map(([p, w]) => { const { o, k } = at(reading, p); return { path: p, want: w, got: o?.[k] }; }))}`}`);
    if (c.grader !== undefined) judge(c.grader, c.name, c.verdict, c.names, () => reading);
  }
  // 3. The pure helpers.
  {
    const p = parseLog('S 1 7 1 log -z,--topo-order /r\nS 2 8 1 remote  \nE 3 7 0 held\nS 4 7 1 status -x /r\nE 5 7 1\nnot a line\nE 6 99 0\nS x 7 1 log a\n');
    say(p.calls.length === 3 && p.torn === 3, `a log with a pid used twice and three lines that do not read answers ${String(p.calls.length)} calls and ${String(p.torn)} torn`);
    const q = parseLog('S 1 7 1 log -z,--topo-order /r\nS 2 8 1 remote \nS 2.5 8 1 remote -v\n');
    closeOpen(q.calls, 1_000, 9);
    say(q.torn === 0 && q.calls[0].end === 2.2 && q.calls[0].killed === true && q.calls[1].rest === '-' && q.calls[1].end === 2.5 && q.calls[2].end === 3.7, `a call with no end line is closed at its hold, or where its pid came back (${J(q.calls.map((c) => c.end))})`);
    say(mostAlive([{ start: 1, end: 2 }, { start: 2, end: 3 }]) === 1 && mostAlive([{ start: 1, end: 3 }, { start: 2, end: 4 }]) === 2 && mostAlive([{ start: 1, end: 3 }, { start: 2, end: 4 }], 3.5) === 1, 'the most alive: a call that starts as the one before it ends is not two, and a window cuts it');
    const left = (samples, until, extra = '') => closeOpen(parseLog(`S 1 7 1 log -z,--topo-order /r\n${extra}`).calls, 1_000, until, samples).map((c) => [c.end, c.running === true, c.killed === true])[0];
    say(J([left([[2, [7]], [3, [7]]], 3.1), left([[2, [7]], [3, [7]], [4, []]], 9), left([[2, []], [4, []]], 9), left([], 5), left(undefined, 9), left(undefined, 1.5), left([[3, [7]]], 9, 'S 2 7 1 status - /r\n')]) === J([[3.1, true, false], [3, false, true], [2.2, false, true], [5, true, false], [2.2, false, true], [1.5, true, false], [2, false, true]]), 'a call with no end line is alive until a table after its hold no longer shows it, to the end when none says it went, and its hold where no table was read');
    const names = [['log', '-z,--topo-order'], ['log', '-z,--decorate=full,--follow'], ['log', '-z,--decorate=full'], ['log', '-1,--format=%H'], ['for-each-ref', 'refs/remotes,--format=x'], ['for-each-ref', 'refs/heads,--format=%(refname:short)%1f'], ['for-each-ref', 'refs/heads,--format=%(refname)%1f'], ['remote', '-v'], ['remote', '-'], ['symbolic-ref', '--quiet,HEAD'], ['symbolic-ref', '--quiet,--short'], ['rev-parse', '--verify,--quiet'], ['status', '-']].map(([s, r]) => readOf(s, r));
    say(J(names) === J(['walk', 'fileWalk', 'search', null, 'remoteBranches', 'branches', null, 'remotes', null, 'round', null, null, null]), `the reads are told apart by their next two arguments (${J(names)})`);
    const inst = { row: 'x', t0: 10, t1: 11, before: 'a', truth: 'b', save: null, end: 20, states: [[9, 'b'], [10.5, 'c'], [10.8, 'b']] };
    say(J(seenOf(inst, [])) === J({ drawn: true, once: true, ms: 0 }) && seenOf({ ...inst, states: [[9, 'b'], [10.5, 'c']] }, []).ms === null, 'a move shown before its command ended is shown at 0 ms, and never by a state from before it');
    say(J(seenOf({ ...inst, states: [[10.5, 'c'], [12.25, 'b']] }, [])) === J({ drawn: true, once: true, ms: 1250 }), 'a move shown later is timed from its command’s end');
    say(J(seenOf({ ...inst, save: 14, states: [[14.5, 'b']] }, [])) === J({ drawn: true, once: false, ms: 500 }) && seenOf({ ...inst, states: [] }, []).ms === null, 'a move shown after the save is timed from the save, and one never shown has no time');
    const calls = [{ sub: 'status', read: null, start: 10.2 }, { sub: 'remote', read: 'remotes', start: 12 }];
    say(J(seenOf({ ...inst, truth: 'a' }, calls)) === J({ drawn: false, once: true, ms: 1000 }) && seenOf({ ...inst, truth: 'a', end: 11.5 }, calls).ms === null, 'a move that draws nothing is timed by the first read of History after it, inside its own watch');
    const row = (over) => ({ n: 3, drawn: true, once: 3, save: 0, never: 0, onceMs: 600, saveMs: -1, ...over });
    const cmp = (p, h) => compareRows({ r: row(p) }, { r: row(h) });
    say(cmp({}, {}).notAtOnce.length === 0 && cmp({}, { once: 2, save: 1 }).notAtOnce.length === 1 && cmp({}, { onceMs: 1_001 }).later.length === 1 && cmp({}, { onceMs: 1_000 }).later.length === 0, 'a row the parent showed at once is held to as often, and to 400 ms');
    say(cmp({ once: 2, save: 1 }, { once: 2, save: 0, never: 1 }).notShown.length === 1 && cmp({ drew: 3 }, { drew: 2 }).absent.length === 1, 'a row the parent mostly showed at once may not be left unshown where the parent showed it, and a move that drew on one build alone is no reading');
    const saved = { once: 0, save: 3, saveMs: 900, onceMs: -1 };
    say(cmp(saved, {}).notShown.length === 0 && cmp(saved, { ...saved, save: 2, never: 1 }).notShown.length === 1 && cmp(saved, { ...saved, saveMs: 1_301 }).laterAfterSave.length === 1, 'a drawn row the parent showed only after a save must be shown, at once or no later after it');
    say(cmp({ ...saved, drawn: false }, { ...saved, drawn: false, save: 0, never: 3 }).compared === 0 && compareRows({ r: row({}) }, {}).absent.length === 1 && compareRows({ r: row({}) }, { r: row({ n: 2 }) }).absent.length === 1, 'a row that draws nothing and that only a save re-read is not compared, and a missing row is never a pass');
    const press = (over) => ({ n: 3, missing: 0, ms: 2_000, median: { walk: 1, search: 0, fileWalk: 1, branches: 1, remoteBranches: 1, remotes: 1, round: 2, status: 1 }, ...over });
    const cp = (over) => comparePresses({ r: press({}) }, { r: press(over) });
    say(cp({}).more.length === 0 && cp({ median: { ...press({}).median, walk: 2 } }).more.length === 1 && cp({ ms: 2_401 }).later.length === 1 && cp({ missing: 1 }).later.length === 1 && cp({ n: 2 }).absent.length === 1, 'a press is held to the parent’s starts, its time plus 400 ms, and its number of tries');
    const bin = '/w/bin/git';
    const ps = ['  1   0 /sbin/launchd', ' 50   1 Tortie', ` 60  50 /bin/zsh -f ${bin} log -z`, ` 61  60 /bin/zsh -f ${bin} log -z`, ' 62  60 /usr/bin/git log -z', ' 63  50 /usr/bin/git status', ' 64  50 git remote -v', ' 65  50 /Applications/x/Tortie Helper --type=utility --utility-sub-type=node.mojom.NodeService', ' 66  50 x --type=utility --utility-sub-type=network.mojom.NetworkService'].join('\n');
    say(J(standInsIn(ps, bin)) === J([60]), `the process table's stand-ins are ${J(standInsIn(ps, bin))}: not real git, not the child zsh forks for an instant`);
    say(J(gitsBeside(ps, bin, 50)) === J(['/usr/bin/git status', 'git remote -v']), `a git the app started that is not the stand-in is named (${J(gitsBeside(ps, bin, 50))})`);
    say(J(watchersOf(ps, 50)) === J([65]), `the app's own watcher process is its one node utility child (${J(watchersOf(ps, 50))})`);
    say(wholeTable('  1     0 /sbin/launchd\n 50   1 Tortie\n') && !wholeTable('') && !wholeTable(' 50   1 Tortie\n') && !wholeTable('  1     0 /sbin/launchd\n 50   1 Tor'), 'a process table without launchd, or cut mid-line, is no table');
    say(historyHeld({ before: 'a', after: 'a' }) === 'unmoved' && historyHeld({ before: 'a', after: 'b', quiet: null }) === 'unread' && historyHeld({ before: 'a', after: 'b', quiet: { again: 'b' } }) === 'held' && historyHeld({ before: 'a', after: 'b', quiet: { again: 'c' } }) === 'his terminal', 'his history reads unmoved, unread, held and his terminal');
  }
  // 4. A MISSING READING IS NEVER A PASS: every field a grader reads, deleted alone, answers UNREADABLE naming it.
  let swept = 0;
  for (const [id, g] of Object.entries(GRADERS)) {
    for (const path of g.reads) {
      swept += 1;
      const r = structuredClone(fx.honest[id] ?? {});
      const { o, k } = at(r, path);
      if (o !== null && typeof o === 'object') delete o[k];
      const v = grade(id, r);
      if (!(v.verdict === 'unreadable' && v.missing.includes(missingField(path)))) say(false, `${id} without ${path} answered ${v.verdict} ${J(v.missing)}`);
    }
  }
  say(swept > 0, `a missing reading is never a pass: ${String(swept)} fields, each deleted alone`);
  // 5. Every clause shown red alone, every need shown unreadable alone.
  let clauses = 0;
  let needs = 0;
  for (const [id, g] of Object.entries(GRADERS)) {
    for (const [name] of g.clauses) {
      clauses += 1;
      if (!sole.get(id).has(name)) say(false, `${id} clause never shown red alone: ${name}`);
    }
    for (const [name] of g.needs) {
      needs += 1;
      if (!soleMiss.get(id).has(name)) say(false, `${id} need never shown unreadable alone: ${name}`);
    }
  }
  // 6. The stand-in, read as text: it holds before it runs git, starts nothing for itself, and never reads his settings.
  const s = readFileSync(join(ROOT, 'build', 'p371', 'stand-in.zsh'), 'utf8').split('\n').filter((l) => !l.startsWith('#')).join('\n');
  say(s.indexOf('zselect -t') > 0 && s.indexOf('zselect -t') < s.indexOf('$REAL "$@"'), 'the stand-in holds before it runs git');
  say(s.indexOf('-e $W/fuse') > 0 && s.indexOf('-e $W/fuse') < s.indexOf('zselect -t'), 'the stand-in asks for the fuse before every step of its hold');
  say(/export GIT_CONFIG_GLOBAL=\$k\[GLOBAL\] GIT_CONFIG_NOSYSTEM=1/.test(s) && /GLOBAL \/dev\/null/.test(s), 'the stand-in names no git settings of his');
  say(!/\$\(|`|\bsleep\b/.test(s.replace(/\$\(\(/g, '')), 'the stand-in starts no child for itself (no substitution, no sleep)');
  process.stdout.write(failures === 0 ? `[p371] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses each shown red alone, ${String(needs)} needs each shown unreadable alone, ${String(swept)} fields that answer UNREADABLE when missing, ${String(fx.variants.length)} variants, ${String(fx.raw.length)} raw inputs (${String(values)} values) through the one reader.\n` : `[p371] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

/** Whether a `ps -Ao pid=,ppid=,command=` text is a whole table: it ends on a line end and holds launchd. */
export const wholeTable = (text) => /^\s*1\s+0\s/m.test(text) && text.endsWith('\n');
const rowsIn = (psText) => String(psText).split('\n').map((l) => /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(l)).filter((m) => m !== null).map((m) => ({ pid: Number(m[1]), ppid: Number(m[2]), command: m[3] }));
/** The stand-ins of `bin`: not one whose own parent is a stand-in. */
export function standInsIn(psText, bin) {
  const found = new Map(rowsIn(psText).filter((r) => r.command.includes(`${bin} `) || r.command.endsWith(bin)).map((r) => [r.pid, r.ppid]));
  return [...found].filter(([, ppid]) => !found.has(ppid)).map(([pid]) => pid);
}
/** The app's own children running a git that is not the stand-in. */
export const gitsBeside = (psText, bin, appPid) => rowsIn(psText).filter((r) => r.ppid === appPid && /^(?:\S*\/)?git(?:\s|$)/.test(r.command) && !r.command.includes(bin)).map((r) => r.command);
/** The app's own node utility processes: the watcher process is the only one a run with no phone door starts. */
export const watchersOf = (psText, appPid) => rowsIn(psText).filter((r) => r.ppid === appPid && r.command.includes('--type=utility') && r.command.includes('node.mojom.NodeService')).map((r) => r.pid);

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
if (process.argv.includes('--list-graders')) {
  process.stdout.write(`${J(Object.fromEntries(Object.entries(GRADERS).map(([id, g]) => [id, { title: g.title, reads: g.reads, needs: g.needs.map(([n]) => n), clauses: g.clauses.map(([n]) => n) }])), null, 1)}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The repositories, the moves and the truth: plain /usr/bin/git, no app
// ---------------------------------------------------------------------------

const REAL_GIT = '/usr/bin/git';
/** A terminal's git in one world: scratch HOME, no settings of his, no network (every remote is a path). */
function gitOf(home, global = '/dev/null') {
  const env = { PATH: '/usr/bin:/bin', HOME: home, GIT_CONFIG_GLOBAL: global, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 'a', GIT_AUTHOR_EMAIL: 'a@example.invalid', GIT_COMMITTER_NAME: 'a', GIT_COMMITTER_EMAIL: 'a@example.invalid', GIT_EDITOR: ':', GIT_MERGE_AUTOEDIT: 'no' };
  const run = (cwd, args, input) => spawnSync(REAL_GIT, args, { cwd, encoding: 'utf8', env, input, timeout: 120_000, maxBuffer: 64 << 20 });
  const must = (cwd, ...args) => {
    const r = run(cwd, args);
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} in ${cwd}: ${String(r.stderr).trim().slice(0, 240)}`);
    return String(r.stdout).trim();
  };
  const maybe = (cwd, ...args) => {
    const r = run(cwd, args);
    return r.status === 0 ? String(r.stdout).replace(/\n$/, '') : null;
  };
  return { run, must, maybe };
}
const linesOf = (text) => (text === null || text === '' ? [] : text.split('\n'));

/**
 * The truth, in the words the page's own recorder writes (SNAP): History's rows with
 * their push mark, the current branch's mark, their refs and their subject; the
 * branches with their arrows; the remote branches; the remotes with their URL and
 * their tracking mark; and the followed file's rows.
 */
function truthOf(git, dir, file) {
  const head = git.maybe(dir, 'symbolic-ref', '--quiet', 'HEAD');
  const sha = git.maybe(dir, 'rev-parse', '--verify', '--quiet', 'HEAD');
  const heads = linesOf(git.maybe(dir, 'for-each-ref', 'refs/heads', '--format=%(refname)%09%(upstream)%09%(upstream:track,nobracket)'));
  const mine = heads.map((l) => l.split('\t')).find(([name]) => name === head);
  const upstream = mine !== undefined && mine[1] !== '' && mine[2] !== 'gone' ? mine[1] : null;
  const refs = [...(sha === null ? [] : [head ?? 'HEAD']), ...(upstream === null ? [] : [upstream])].sort();
  const sync = new Map();
  if (upstream !== null && sha !== null) for (const l of linesOf(git.maybe(dir, 'rev-list', '--left-right', `HEAD...${upstream}`))) sync.set(l.slice(1), l[0] === '<' ? 'unpushed' : 'unpulled');
  const h = [];
  if (refs.length > 0) {
    for (const l of linesOf(git.must(dir, 'log', '--topo-order', '--decorate=full', '--max-count=50', '--format=%H%x09%D%x09%s', ...refs, '--'))) {
      const [id, deco, ...subject] = l.split('\t');
      const names = [];
      let current = '';
      for (const token of deco === '' ? [] : deco.split(', ')) {
        const arrow = token.startsWith('HEAD -> ');
        const full = arrow ? token.slice(8) : token.startsWith('tag: ') ? token.slice(5) : token;
        if (/^refs\/remotes\/[^/]+\/HEAD$/.test(full)) continue; // a fetch makes it, and no surface draws it
        const name = full.replace(/^refs\/(?:heads|remotes|tags)\//, '');
        names.push(name);
        if (arrow || full === 'HEAD') current = name;
      }
      h.push([id, sync.get(id) ?? '', current, names.sort().join(','), subject.join('\t')].join('|'));
    }
  }
  const bl = heads.map((l) => {
    const [name, , track] = l.split('\t');
    const arrows = [/ahead (\d+)/.exec(track), /behind (\d+)/.exec(track)].map((m, i) => (m === null ? '' : `${i === 0 ? '↑' : '↓'}${m[1]}`)).filter((x) => x !== '').join(' ');
    return [name.slice(11), name === head ? 'current' : '', arrows].join('|');
  });
  const rb = linesOf(git.maybe(dir, 'for-each-ref', 'refs/remotes', '--format=%(refname:short)%09%(symref)')).map((l) => l.split('\t')).filter(([, symref]) => symref === '').map(([name]) => name);
  const tracked = git.maybe(dir, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}');
  const urls = new Map(linesOf(git.maybe(dir, 'remote', '-v')).map((l) => /^(\S+)\t(.*) \(fetch\)$/.exec(l)).filter((m) => m !== null).map((m) => [m[1], m[2]]));
  const groups = new Set([...urls.keys(), ...rb.map((n) => n.split('/')[0])]);
  const rg = [...groups].map((n) => [n, urls.get(n) ?? '', tracked !== null && urls.has(n) && tracked.startsWith(`${n}/`) ? 'tracking' : ''].join('|'));
  const f = file === null || refs.length === 0 ? null : linesOf(git.must(dir, 'log', '--follow', '--max-count=50', '--format=%H', ...refs, '--', file));
  return J({ h: h.sort(), bl: bl.sort(), rb: rb.sort(), rg: rg.sort(), f: f === null ? null : f.sort() });
}

/** Files, twelve commits, a bare remote by path, and the branches and commits the moves use. */
function seedRepo(git, dir, remote, initArgs = []) {
  mkdirSync(join(dir, 'w'), { recursive: true });
  git.must(dir, 'init', '-q', '-b', 'main', ...initArgs);
  writeFileSync(join(dir, '.gitignore'), '*.log\n');
  for (const n of ['README.md', 'notes.txt', join('w', 'seed.txt')]) writeFileSync(join(dir, n), `${n}\n`);
  git.must(dir, 'add', '-A');
  git.must(dir, 'commit', '-qm', 'first');
  appendFileSync(join(dir, 'notes.txt'), 'two\n');
  git.must(dir, 'commit', '-qam', 'the notes');
  for (let i = 0; i < 10; i += 1) git.must(dir, 'commit', '-q', '--allow-empty', '-m', `base ${String(i)}`);
  git.must(dirname(dir), 'init', '-q', '--bare', '-b', 'main', remote);
  git.must(dir, 'remote', 'add', 'origin', remote);
  git.must(dir, 'push', '-qu', 'origin', 'main');
}
function seedBranches(git, dir) {
  const tree = git.must(dir, 'rev-parse', 'HEAD^{tree}');
  const picks = [];
  for (const k of [1, 2, 3]) {
    git.must(dir, 'branch', `x${String(k)}`);
    git.must(dir, 'update-ref', `refs/heads/side${String(k)}`, git.must(dir, 'commit-tree', tree, '-p', 'HEAD', '-m', `side ${String(k)}`));
    picks.push(git.must(dir, 'commit-tree', tree, '-p', 'HEAD', '-m', `pick ${String(k)}`));
    let stream = '';
    for (let i = 0; i < 200; i += 1) {
      const msg = `long ${String(k)}.${String(i)}`;
      stream += `commit refs/heads/long${String(k)}\ncommitter a <a@example.invalid> ${String(1_795_000_000 + i)} +0000\ndata ${String(Buffer.byteLength(msg))}\n${msg}\n${i === 0 ? `from ${git.must(dir, 'rev-parse', 'HEAD')}\n` : ''}\n`;
    }
    const r = git.run(dir, ['fast-import', '--quiet'], stream);
    if (r.status !== 0) throw new Error(`fast-import in ${dir}: ${String(r.stderr).slice(0, 200)}`);
  }
  return picks;
}

/**
 * One shape's world. `project` is what Tortie opens, `ops` where the terminal runs,
 * `home` the branch the terminal starts on, `file` the file the editor follows.
 */
function makeShape(shape, base, home, git) {
  const main = join(base, 'repo');
  const remote = join(base, 'remote.git');
  const w = { shape, base, project: main, ops: main, home: 'main', remote, file: 'notes.txt', git, picks: [], globalFile: null };
  if (shape === 'init') {
    w.file = null;
    w.folders = [1, 2, 3].map((k) => join(base, `open${String(k)}`));
    for (const d of w.folders) {
      mkdirSync(join(d, 'w'), { recursive: true });
      writeFileSync(join(d, 'notes.txt'), 'notes\n');
    }
    w.project = w.folders[0];
    w.ops = w.project;
    w.moves = w.folders.map((dir, i) => ({
      row: 'git init',
      k: i + 1,
      project: dir,
      run: () => {
        git.must(dir, 'init', '-q', '-b', 'main');
        git.must(dir, 'commit', '-q', '--allow-empty', '-m', 'first');
      }
    }));
    return w;
  }
  if (shape === 'submodule') {
    const src = join(base, 'src');
    const top = join(base, 'super');
    seedRepo(git, src, remote);
    mkdirSync(top);
    git.must(top, 'init', '-q', '-b', 'main');
    git.must(top, '-c', 'protocol.file.allow=always', 'submodule', '--quiet', 'add', remote, 'sub');
    git.must(top, 'commit', '-qm', 'a submodule');
    w.project = w.ops = join(top, 'sub');
    git.must(w.ops, 'remote', 'set-head', 'origin', '-d');
  } else if (shape === 'reftable') seedRepo(git, main, remote, ['--ref-format=reftable']);
  else if (shape === 'separate') seedRepo(git, main, remote, ['--separate-git-dir', join(base, 'apart.git')]);
  else seedRepo(git, main, remote);
  w.picks = seedBranches(git, w.ops);
  if (shape === 'linked' || shape === 'linked-other' || shape === 'linked-main') {
    const linked = join(base, 'linked');
    git.must(main, 'worktree', 'add', '-q', '-b', 'lw', linked);
    git.must(linked, 'push', '-qu', 'origin', 'lw');
    if (shape === 'linked') Object.assign(w, { project: linked, ops: linked, home: 'lw' });
    if (shape === 'linked-other') Object.assign(w, { project: linked, ops: main, home: 'main' });
    if (shape === 'linked-main') Object.assign(w, { project: main, ops: linked, home: 'lw' });
  }
  if (shape === 'subfolder') {
    const sub = join(main, 'w');
    mkdirSync(join(sub, 'w'));
    Object.assign(w, { project: sub, ops: sub, file: null });
  }
  if (shape === 'new-workdir') {
    const wd = join(base, 'workdir');
    mkdirSync(join(wd, '.git', 'logs'), { recursive: true });
    for (const n of ['config', 'refs', 'logs/refs', 'objects', 'info', 'hooks', 'packed-refs', 'remotes', 'rr-cache']) symlinkSync(join(main, '.git', n), join(wd, '.git', n));
    copyFileSync(join(main, '.git', 'HEAD'), join(wd, '.git', 'HEAD'));
    git.must(wd, 'checkout', '-q', '-f');
    Object.assign(w, { project: wd, ops: wd });
  }
  if (shape === 'include') {
    w.globalFile = join(home, 'global.cfg');
    w.included = join(main, '.git', 'inc.cfg');
    w.underHome = join(home, 'under-home.cfg');
    writeFileSync(w.globalFile, '');
    writeFileSync(w.included, '');
    writeFileSync(w.underHome, '');
    appendFileSync(join(main, '.git', 'config'), `[include]\n\tpath = inc.cfg\n[include]\n\tpath = ${w.underHome}\n`);
  }
  w.moves = movesOf(w);
  return w;
}

/** A commit made in the bare remote by nobody here: what a fetch brings. */
function farCommit(w, k) {
  const { git, remote, home } = w;
  const next = git.must(remote, 'commit-tree', git.must(remote, 'rev-parse', `${home}^{tree}`), '-p', home, '-m', `far ${String(k)}`);
  git.must(remote, 'update-ref', `refs/heads/${home}`, next);
}

/** The moves, in order: each `{ row, k, run, setup? }`; a setup is never timed. */
function movesOf(w) {
  const { git, home, base } = w;
  const g = (...args) => git.must(w.ops, ...args);
  const out = [];
  const add = (row, k, run, setup) => out.push({ row, k, run, ...(setup === undefined ? {} : { setup }) });
  const each = (row, run, setup) => [1, 2, 3].forEach((k) => add(row, k, () => run(k), setup === undefined ? undefined : () => setup(k)));
  const commit = (m) => g('commit', '-q', '--allow-empty', '-m', m);
  const tip = () => git.must(w.project, 'rev-parse', 'HEAD');
  const here = w.ops === w.project;
  const url = (n) => join(base, `${n}.git`);
  each('commit', (k) => commit(`c${String(k)}`));
  if (here) {
    each('amend', (k) => g('commit', '-q', '--amend', '--allow-empty', '-m', `amended ${String(k)}`));
    each('reset --soft', () => g('reset', '-q', '--soft', 'HEAD~1'));
    each('reset --hard', () => g('reset', '-q', '--hard', 'HEAD~1'));
  }
  each('push', () => g('push', '-q', 'origin', home), (k) => {
    if (k === 1) g('reset', '-q', '--hard', `origin/${home}`);
    commit(`to push ${String(k)}`);
  });
  each('fetch', () => g('fetch', '-q', 'origin'), (k) => farCommit(w, k));
  if (here) each('checkout', (k) => g('checkout', '-q', `x${String(k)}`));
  each('branch made', (k) => g('branch', `b${String(k)}`), (k) => (k === 1 && here ? g('checkout', '-q', home) : undefined));
  each('branch renamed', (k) => g('branch', '-m', `b${String(k)}`, `r${String(k)}`));
  each('branch deleted', (k) => g('branch', '-q', '-D', `r${String(k)}`));
  each('tag made', (k) => g('tag', `t${String(k)}`, tip()));
  each('tag deleted', (k) => g('tag', '-d', `t${String(k)}`));
  if (here) {
    each('merge', (k) => g('merge', '-q', '--no-ff', '-m', `merged ${String(k)}`, `side${String(k)}`));
    each('cherry-pick', (k) => g('cherry-pick', '--allow-empty', w.picks[k - 1]));
    each('rebase over 200 commits', () => g('rebase', '-q', home), (k) => g('checkout', '-q', `long${String(k)}`));
  }
  if (here && w.shape !== 'subfolder') {
    each('stash', () => g('stash', 'push', '-q'), (k) => {
      if (k === 1) g('checkout', '-q', home);
      appendFileSync(join(w.ops, 'README.md'), `stashed ${String(k)}\n`);
    });
    each('stash dropped', () => g('stash', 'drop', '-q'));
  }
  each('remote added', (k) => g('remote', 'add', `r${String(k)}`, url('other')), (k) => (k === 1 && here ? g('checkout', '-q', home) : undefined));
  each('remote renamed', (k) => g('remote', 'rename', `r${String(k)}`, `q${String(k)}`));
  each('remote repointed', (k) => g('remote', 'set-url', `q${String(k)}`, url(`moved${String(k)}`)));
  each('remote removed', (k) => g('remote', 'remove', `q${String(k)}`));
  for (const k of [1, 2, 3]) {
    add('upstream unset', k, () => g('branch', '--unset-upstream'));
    add('upstream set', k, () => g('branch', '-q', `--set-upstream-to=origin/${home}`));
  }
  each('update-ref', (k) => g('update-ref', `refs/heads/u${String(k)}`, 'HEAD'));
  if (here) {
    each('symbolic-ref', (k) => g('symbolic-ref', 'HEAD', `refs/heads/x${String(k)}`));
    if (w.shape !== 'new-workdir') {
      each('pack-refs', () => g('pack-refs', '--all'), (k) => {
        if (k === 1) g('symbolic-ref', 'HEAD', `refs/heads/${home}`);
        g('update-ref', `refs/heads/pk${String(k)}`, 'HEAD');
      });
      each('gc', () => g('gc', '-q'), (k) => g('update-ref', `refs/heads/gc${String(k)}`, 'HEAD'));
    }
    if (w.shape !== 'submodule' && w.shape !== 'new-workdir') {
      each('config --worktree', (k) => g('config', '--worktree', `remote.wc${String(k)}.url`, url(`wc${String(k)}`)), (k) => (k === 1 ? g('config', 'extensions.worktreeConfig', 'true') : undefined));
    }
  }
  if (w.shape === 'include') {
    const remoteIn = (file, name) => (k) => writeFileSync(file, `[remote "${name}"]\n\turl = ${url(`${name}${String(k)}`)}\n`);
    each('included file', remoteIn(w.included, 'inc'));
    each('included under home', remoteIn(w.underHome, 'homed'));
    each('global file', remoteIn(w.globalFile, 'glob'));
  }
  /** The entry names four shapes for the whole list; the others read the rows that tell their streams apart. */
  const SHORT = new Set(['commit', 'amend', 'reset --soft', 'checkout', 'branch made', 'branch deleted', 'branch renamed', 'tag made', 'push', 'fetch', 'merge', 'rebase over 200 commits', 'remote added', 'remote renamed', 'remote repointed', 'remote removed', 'upstream unset', 'upstream set', 'update-ref', 'pack-refs', 'included file', 'included under home', 'global file']);
  const whole = ['ordinary', 'linked', 'submodule', 'reftable'].includes(w.shape);
  // A row dropped with its setup takes its setup's work with it only where the rows kept need none of it: `checkout` back to home is kept by 'branch made'.
  return whole ? out : out.filter((m) => SHORT.has(m.row));
}

if (process.argv.includes('--check-shapes')) {
  const dir = process.argv[process.argv.indexOf('--check-shapes') + 1];
  if (typeof dir !== 'string' || !dir.startsWith('/private/var/tmp/')) {
    console.error('[p371] --check-shapes needs a scratch folder under /private/var/tmp');
    process.exit(2);
  }
  let bad = 0;
  for (const shape of SHAPES) {
    const base = join(dir, shape);
    rmSync(base, { recursive: true, force: true });
    mkdirSync(join(base, 'home'), { recursive: true });
    const git = gitOf(join(base, 'home'), shape === 'include' ? join(base, 'home', 'global.cfg') : '/dev/null');
    const undrawn = new Set();
    let done = 0;
    const started = Date.now();
    try {
      const w = makeShape(shape, base, join(base, 'home'), git);
      for (const m of w.moves) {
        const project = m.project ?? w.project;
        m.setup?.();
        const before = m.project === undefined ? truthOf(git, project, w.file) : '';
        m.run();
        if (truthOf(git, project, w.file) === before) undrawn.add(m.row);
        done += 1;
      }
      console.log(`[p371] ${shape}: ${String(done)} moves in ${String(Date.now() - started)} ms; drawing nothing: ${[...undrawn].join(', ') || 'none'}`);
    } catch (err) {
      bad += 1;
      console.log(`[p371] ${shape}: FAILED after ${String(done)} moves: ${String(err?.message ?? err)}`);
    }
  }
  process.exit(bad === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// --preflight: the builds, the stand-in and the helpers. Starts nothing.
// ---------------------------------------------------------------------------

const list = (name) => (process.env[name] ?? '').split(',').map((x) => x.trim()).filter((x) => x !== '');
const PARENT = (process.env['P371_PARENT_CHECKOUT'] ?? '').trim();
const HEAD_OVERRIDE = (process.env['P371_HEAD_CHECKOUT'] ?? '').trim();
const HEAD_ONLY = (process.env['P371_HEAD_ONLY'] ?? '') === '1';
const PARENT_ONLY = (process.env['P371_PARENT_ONLY'] ?? '') === '1';
const DEVELOPMENT = HEAD_OVERRIDE !== '' || HEAD_ONLY || PARENT_ONLY;
const HEAD = HEAD_OVERRIDE === '' ? ROOT : resolve(HEAD_OVERRIDE);
const ARMS = list('P371_ARMS').length > 0 ? list('P371_ARMS') : [...DEFAULT_ARMS];
const WANTED_CELLS = list('P371_CELLS').length > 0 ? list('P371_CELLS') : CELLS.map((c) => c.id);
const WANTED_SHAPES = list('P371_SHAPES').length > 0 ? list('P371_SHAPES') : [...SHAPES];
const KEEP = (process.env['P371_KEEP'] ?? '') === '1';
const BUILDS = ['parent', 'head'].filter((b) => !(HEAD_ONLY && b === 'parent') && !(PARENT_ONLY && b === 'head'));
const checkoutOf = (build) => (build === 'parent' ? resolve(PARENT) : HEAD);

/** A checkout's commit, read from its own .git, starting no git. Null when unread. */
function revisionOf(checkout) {
  try {
    let gitDir = join(checkout, '.git');
    if (statSync(gitDir).isFile()) gitDir = resolve(checkout, /^gitdir: (.+)$/m.exec(readFileSync(gitDir, 'utf8'))[1].trim());
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    if (/^[0-9a-f]{40}$/.test(head)) return head;
    const ref = /^ref: (.+)$/.exec(head)[1];
    let common = gitDir;
    try {
      common = resolve(gitDir, readFileSync(join(gitDir, 'commondir'), 'utf8').trim());
    } catch {
      /* not a linked worktree */
    }
    for (const dir of [gitDir, common]) if (existsSync(join(dir, ref))) return readFileSync(join(dir, ref), 'utf8').trim();
  } catch {
    /* unread */
  }
  return null;
}
/** Every .js of a build's main folder, joined: rollup may put the watcher in a chunk. */
function mainText(checkout) {
  let text = '';
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name));
      else if (e.name.endsWith('.js')) text += readFileSync(join(d, e.name), 'utf8');
    }
  };
  try {
    walk(join(checkout, 'out', 'main'));
  } catch {
    return '';
  }
  return text;
}

function preflightChecks() {
  const out = [];
  const check = (ok, yes, no) => out.push({ ok, said: ok ? yes : no });
  const strange = (names, known, what) => {
    const bad = names.filter((n) => !known.includes(n));
    check(bad.length === 0, `${what}: ${names.join(', ')}`, `${what} names ${J(bad)}, which are none (${known.join(', ')})`);
  };
  strange(ARMS, DEFAULT_ARMS, 'the arms');
  strange(WANTED_CELLS, CELLS.map((c) => c.id), "M's cells");
  strange(WANTED_SHAPES, [...SHAPES], "V's shapes");
  const SOURCES = ['src/main/watcher/git-data.ts', 'src/main/watcher/repo-watcher.ts', 'src/main/watcher/bus.ts', 'src/main/git/ipc.ts', 'src/renderer/scm/one-behind.ts', 'src/renderer/scm/depth.ts', 'src/renderer/state/repo-changed.ts', 'src/renderer/state/git.ts'];
  const built = (who, checkout) => {
    const bundle = join(checkout, 'out', 'main', 'index.js');
    check(existsSync(bundle), `${who} is built`, `${bundle} is missing: build ${who} first`);
    check(existsSync(join(checkout, 'out', 'renderer', 'index.html')), `${who}'s window is built`, `${who} has no out/renderer/index.html`);
    if (!existsSync(bundle)) return;
    const old = SOURCES.filter((f) => existsSync(join(checkout, f)) && statSync(join(checkout, f)).mtimeMs > statSync(bundle).mtimeMs);
    check(old.length === 0, `${who}'s out/ is newer than the files this phase moves`, `${who}'s out/ is older than ${J(old)}: build it again, or the run measures a tree that is gone`);
  };
  if (BUILDS.includes('parent')) {
    if (PARENT === '') check(false, '', `P371_PARENT_CHECKOUT is not set: the parent (${PARENT_SNAPSHOT}, built) runs first`);
    else {
      const p = resolve(PARENT);
      check(p !== ROOT, 'the parent is not this checkout', 'P371_PARENT_CHECKOUT is this checkout');
      const rev = revisionOf(p);
      check(rev !== null, `the parent ${p} is ${String(rev).slice(0, 8)}${String(rev).startsWith(PARENT_SNAPSHOT) ? '' : ` (the phase was measured against ${PARENT_SNAPSHOT})`}`, `the parent ${p} is not a git checkout this reader can read`);
      built('the parent', p);
      const text = mainText(p);
      check(text !== '' && !text.includes(PHASE_MARK), "the parent's main bundle does not carry this phase", "the parent's main bundle is missing or carries this phase, so it is not the parent");
    }
  }
  if (BUILDS.includes('head')) {
    built('HEAD', HEAD);
    if (HEAD_OVERRIDE === '') check(mainText(HEAD).includes(PHASE_MARK), "HEAD's main bundle carries this phase", `HEAD's main bundle does not hold ${J(PHASE_MARK)}: npm run build`);
  }
  check(existsSync(join(ROOT, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')), 'the development Electron is here', 'node_modules/electron/dist/Electron.app is missing');
  for (const f of ['build/electron-run.mjs', 'build/harness-socket.mjs', 'build/hidden-agents.mjs', 'build/cdp-client.mjs', 'build/cdp-target.mjs', 'build/p371/stand-in.zsh', 'build/p371/fixtures/graders.json']) check(existsSync(join(ROOT, f)), `${f} is here`, `${f} is missing`);
  for (const f of ['/bin/zsh', '/bin/ps', REAL_GIT, '/usr/bin/memory_pressure']) check(existsSync(f), `${f} is here`, `${f} is missing`);
  return out;
}

if (process.argv.includes('--preflight')) {
  const checks = preflightChecks();
  for (const c of checks) process.stdout.write(`[p371] ${c.ok ? 'ok     ' : 'REFUSED'} ${c.said}\n`);
  const bad = checks.filter((c) => !c.ok).length;
  process.stdout.write(bad === 0 ? `[p371] preflight PASS: ${String(checks.length)} checks\n` : `[p371] preflight REFUSED: ${String(bad)} of ${String(checks.length)} checks\n`);
  process.exit(bad === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The run: the refusals, the scratch world, the bookkeeping
// ---------------------------------------------------------------------------

const TAG = '[p371]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s ${l}`);
const refuse = (why, code = 2) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(code);
};
/** Thrown inside a launch to end the whole run with its own exit. */
class Refusal extends Error {
  constructor(why, code = 2) {
    super(why);
    this.code = code;
  }
}

const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (!SOCKET.startsWith('gmux-p371')) refuse(`${J(SOCKET)} is not a gmux-p371 harness socket. Run \`npm run probe:p371\`, which wraps this file in build/harness-socket.mjs.`);
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR. Run `npm run probe:p371`.');
const PREFLIGHT = preflightChecks();
{
  const bad = PREFLIGHT.filter((c) => !c.ok);
  if (bad.length > 0) refuse(bad.map((c) => c.said).join('; '));
}
mkdirSync(join(HARNESS_DIR, 'p371'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p371'));
if (/['"\s\\]/.test(RUN)) refuse(`the scratch path ${J(RUN)} holds a quote, a space or a backslash, which the stand-in's log cannot carry`);
const REPORT = (process.env['P371_REPORT'] ?? '').trim() || join(HARNESS_DIR, 'report', 'probe-p371.json');
if (resolve(REPORT).startsWith(`${ROOT}/`)) refuse(`the report ${REPORT} is inside the checkout`);
mkdirSync(dirname(REPORT), { recursive: true });

const report = { head: HEAD, headSha: revisionOf(HEAD), parent: PARENT === '' ? null : resolve(PARENT), parentSha: PARENT === '' ? null : revisionOf(resolve(PARENT)), socket: SOCKET, development: DEVELOPMENT, arms: [], readings: {} };
let failures = 0;
let unreadable = 0;
let stopWith = 0;
const cannotRead = (id, why) => {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  say(`UNREADABLE ${id}: ${why}`);
};
function judgeArm(id, grader, reading) {
  report.readings[id] = reading;
  const g = grade(grader, reading);
  if (g.verdict === 'unreadable') cannotRead(id, `${GRADERS[grader].title}; could not read ${J(g.missing)}`);
  else {
    report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[grader].title });
    if (!g.ok) failures += 1;
    say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[grader].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
  }
}
function keepRaw(id, raw) {
  if (KEEP) writeFileSync(join(dirname(REPORT), `raw-${id}.json`), `${J(raw)}\n`, { mode: 0o600 });
}

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
const loads = () => loadavg().map((x) => Math.round(x * 10) / 10);
function memoryFree() {
  const m = /free percentage:\s*(\d+)%/.exec(String(spawnSync('/usr/bin/memory_pressure', [], { encoding: 'utf8', timeout: 30_000 }).stdout ?? ''));
  return m === null ? null : Number(m[1]);
}
/** Nothing starts under 20 percent free; his own builds move the number, so it is read for ten minutes. */
async function memoryGate() {
  let free = memoryFree();
  for (let i = 0; i < 10 && free !== null && free < MEMORY_FLOOR; i += 1) {
    say(`memory reads ${String(free)}% free, under ${String(MEMORY_FLOOR)}: starting nothing, reading again in a minute`);
    await sleep(60_000);
    free = memoryFree();
  }
  if (free !== null && free < MEMORY_FLOOR) throw new Refusal(`memory still reads ${String(free)}% free after ten minutes, starting nothing`, 3);
  return free;
}
/** Before anything that can hold more than 20 children (SPEC §0). */
async function loadGate(what) {
  for (let waited = 0; loadavg()[0] > LOAD_CEILING && waited < LOAD_WAIT_MIN; waited += 2) {
    say(`${what}: the 1 minute load is ${loadavg()[0].toFixed(1)}, above ${String(LOAD_CEILING)}; waiting 2 minutes (${String(waited)} waited)`);
    await sleep(120_000);
  }
}
/** The whole table, asked again when `ps` did not answer one, and `''` when it never did: never a short table read as "nothing there". */
function psText(tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    const r = spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 20_000, maxBuffer: 64 << 20 });
    const text = String(r.stdout ?? '');
    if (r.status === 0 && wholeTable(text)) return text;
  }
  return '';
}
const commandOf = (pid) => String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
async function waitFor(get, forMs, every = 50) {
  const until = Date.now() + forMs;
  for (;;) {
    const v = await get();
    if (v !== null && v !== undefined && v !== false) return v;
    if (Date.now() > until) return null;
    await sleep(every);
  }
}

const otherGits = new Set();
const agentsHeld = [];
const censusFailures = [];
const appPids = [];
const leftovers = [];
let launches = 0;
let launchesLooked = 0;

// ---------------------------------------------------------------------------
// One launch: its world, its app, its page
// ---------------------------------------------------------------------------

/**
 * What each page carries: main's changes counted, and what the History, Branches,
 * remotes and file sections DRAW, written down each time it changes, in truthOf's
 * words. Nothing is read from the store.
 */
const RECORDER = `(() => {
  if (window.__p371) return true;
  const q = (s, r) => Array.from((r || document).querySelectorAll(s));
  const text = (el) => (el ? el.textContent : '');
  const P = (window.__p371 = { changed: 0, states: [], last: null, watch: {} });
  window.gmux.git.onChanged(() => { P.changed += 1; });
  const snap = () => {
    const hist = document.querySelector('[data-section-root="history"]');
    const file = document.querySelector('[data-section-root="fileHistory"]');
    const branches = document.querySelector('[data-section-root="branches"]');
    const h = hist ? q('.scm-hrow[data-hist]', hist).map((r) => {
      const names = [];
      let current = '';
      for (const p of q('.scm-ref-pill', r)) {
        if (p.classList.contains('scm-ref-more')) { names.push(...p.title.split('\\n')); continue; }
        const name = text(p.querySelector('.scm-ref-name'));
        names.push(name);
        if (p.classList.contains('scm-ref-head')) current = name;
      }
      return [r.getAttribute('data-hist').slice(2), r.getAttribute('data-sync') || '', current, names.sort().join(','), text(r.querySelector('.scm-hsubject'))].join('|');
    }).sort() : null;
    const bl = q('.scm-brow:not(.remote)', branches || document.createElement('i')).map((r) => [text(r.querySelector('.scm-bname')), r.classList.contains('current') ? 'current' : '', text(r.querySelector('.scm-barrows')).trim()].join('|')).sort();
    const rb = q('.scm-brow.remote .scm-bname', branches || document.createElement('i')).map(text).sort();
    const rg = q('.scm-remote-group', branches || document.createElement('i')).map((r) => [text(r.querySelector('.scm-group-label')), (r.querySelector('.scm-remote-url') || { title: '' }).title, r.querySelector('.scm-chip-tracking') ? 'tracking' : ''].join('|')).sort();
    const f = file && file.hasAttribute('data-file') ? q('[data-sha]', file).map((r) => r.getAttribute('data-sha')).sort() : null;
    return JSON.stringify({ h, bl, rb, rg, f });
  };
  const tree = () => { const t = document.querySelector('file-tree-container'); return t && t.shadowRoot ? t.shadowRoot : null; };
  const SEEN = {
    tree: (w) => { const t = tree(); return !!(t && t.querySelector('[data-item-path="' + w.path + '"]')); },
    changes: (w) => q('.scm-row .scm-row-name').some((e) => e.textContent === w.name),
    editor: (w) => q('.monaco-editor .view-lines').some((e) => e.textContent.replace(/\\u00a0/g, ' ').includes(w.token)),
    sel: (w) => q(w.sel).some((e) => !w.text || e.textContent.includes(w.text)),
    count: (w) => q(w.sel).length > w.more
  };
  const look = () => {
    const s = snap();
    if (s !== P.last) { P.last = s; P.states.push([Date.now() / 1000, s]); if (P.states.length > 3000) P.states.splice(0, 1000); }
    for (const w of Object.values(P.watch)) if (w.at === null && SEEN[w.kind](w)) w.at = Date.now() / 1000;
  };
  let asked = false;
  new MutationObserver(() => { if (!asked) { asked = true; setTimeout(() => { asked = false; look(); }, 0); } }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  setInterval(look, 40);
  look();
  return true;
})()`;

/** Main, over its inspector: how long its thread goes without turning, and the native menu a press raises, answered by the row asked for. */
const LOAD = `(typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule))`;
const MAIN_PATCH = `(() => {
  if (globalThis.__p371m) return true;
  const { Menu } = ${LOAD}('electron');
  const m = (globalThis.__p371m = { want: null, offered: [], picked: null, longest: 0, beats: 0 });
  const plain = (l) => String(l || '').replace(/^[\\u2713 ]+/, '').trim();
  Menu.prototype.popup = function (o) {
    m.offered = this.items.map((i) => plain(i.label));
    const it = this.items.find((i) => plain(i.label) === m.want && i.enabled !== false);
    m.picked = it ? plain(it.label) : null;
    if (it) it.click();
    if (o && o.callback) setImmediate(o.callback);
  };
  let last = performance.now();
  m.timer = setInterval(() => { const t = performance.now(); const late = t - last - 20; last = t; m.beats += 1; if (late > m.longest) m.longest = late; }, 20);
  return true;
})()`;

async function appWindow(profile) {
  const until = Date.now() + 120_000;
  let why = 'no DevToolsActivePort';
  while (Date.now() < until) {
    let cdp = null;
    try {
      const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      const pick = pickRendererTarget(await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json());
      why = pick.why ?? why;
      if (pick.target !== null) {
        cdp = await wsConnect(pick.target.webSocketDebuggerUrl, { collect: ['Runtime.exceptionThrown'] });
        if ((await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function'`, 5_000)) === true) return cdp;
        why = 'the window carries no shot drive yet';
        cdp.close();
      }
    } catch (err) {
      why = String(err?.message ?? err).slice(0, 200);
      try {
        cdp?.close();
      } catch {
        /* closed */
      }
    }
    await sleep(250);
  }
  throw new Error(`no app window: ${why}`);
}

async function mainOf(handle) {
  const url = await waitFor(() => /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text())?.[1] ?? null, 60_000, 200);
  if (url === null) throw new Error("main's inspector never appeared (--inspect=0)");
  const cdp = await wsConnect(url);
  const run = async (expression) => {
    const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, 20_000);
    if (r.error || r.result?.exceptionDetails) throw new Error(`main refused the evaluation: ${J(r.error ?? r.result.exceptionDetails).slice(0, 300)}`);
    return r.result?.result?.value;
  };
  await run(MAIN_PATCH);
  return { run, close: () => cdp.close(), end: () => run('(clearInterval(globalThis.__p371m.timer), true)') };
}

/**
 * One app of `build`, on a world of its own under the run folder. `body(ctx)` is
 * handed the page, the world and the knobs; whatever it does, the helper ends the
 * app, the stand-ins are waited out, and anything left naming the world is ended by
 * pid and COUNTED as a leftover.
 */
async function withApp(label, build, options, body) {
  const base = join(RUN, label);
  rmSync(base, { recursive: true, force: true });
  const w = { base, home: join(base, 'h'), profile: join(base, 'p'), bin: join(base, 'bin'), fuse: join(base, 'fuse'), control: join(base, 'control'), logs: join(base, 'logs') };
  for (const d of [w.home, w.profile, w.bin, w.logs]) mkdirSync(d, { recursive: true });
  const git = join(w.bin, 'git');
  copyFileSync(join(ROOT, 'build', 'p371', 'stand-in.zsh'), git);
  chmodSync(git, 0o755);
  const global = options.global === true ? join(w.home, 'global.cfg') : '/dev/null';
  if (options.global === true) writeFileSync(global, '');
  const knobs = { LOG: join(w.logs, 'boot.txt'), HOLD_MS: 0, HOLD_ONLY: '', FAIL: '', GLOBAL: global, GITDIR: '', WORKTREE: '' };
  const setControl = (over) => {
    Object.assign(knobs, { HOLD_MS: 0, HOLD_ONLY: '', FAIL: '', GITDIR: '', WORKTREE: '' }, over);
    if (!existsSync(knobs.LOG)) writeFileSync(knobs.LOG, '');
    writeFileSync(`${w.control}.new`, `${Object.entries(knobs).map(([a, b]) => `${a}=${String(b)}`).join('\n')}\n`);
    renameSync(`${w.control}.new`, w.control);
  };
  setControl({});
  const closed = `${w.bin}:/usr/bin:/bin:/usr/sbin:/sbin`;
  for (const f of ['.profile', '.zprofile', '.zshenv', '.zshrc', '.bash_profile']) writeFileSync(join(w.home, f), `PATH=${closed}\nexport PATH\n`);
  writeFileSync(join(w.home, '.hushlogin'), '');
  writeHiddenAgents(w.profile, 'p371', hiddenAgentsBesides([]));
  const env = withoutDevRenderer({
    ...Object.fromEntries(Object.keys(process.env).filter((n) => STRIPPED.test(n)).map((n) => [n, undefined])),
    HOME: w.home,
    ZDOTDIR: w.home,
    HISTFILE: '/dev/null',
    SHELL: '/bin/sh',
    PATH: closed,
    GIT_CONFIG_GLOBAL: global,
    GIT_CONFIG_NOSYSTEM: '1',
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_SPECSTORY_NO_CLOUD: '1',
    GMUX_LOG_FILE: '1'
  });
  {
    const whole = Object.fromEntries(Object.entries({ ...process.env, ...env }).filter(([, v]) => v !== undefined));
    const r = spawnSync('/bin/sh', ['-lic', 'command -v git'], { encoding: 'utf8', timeout: 30_000, env: whole });
    const where = String(r.stdout ?? '').trim().split('\n').pop() ?? '';
    if (where !== git) throw new Refusal(`the login shell the app will ask resolves git to ${J(where)}, not the stand-in ${git}`);
  }
  const memory = await memoryGate();
  launches += 1;
  say(`LAUNCH ${label} at the ${build}: load ${J(loads())}, memory ${String(memory)}% free`);
  let ctx = null;
  try {
    await withElectron(
      {
        label: `p371-${label}`,
        userDataDir: w.profile,
        tmuxSocket: SOCKET,
        cwd: checkoutOf(build),
        program: 'app',
        args: [...(options.inspect === true ? ['--inspect=0'] : []), '--remote-debugging-port=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
        env,
        graceMs: 15_000
      },
      async (handle) => {
        appPids.push(handle.pid);
        const cdp = await appWindow(w.profile);
        let main = null;
        try {
          await cdp.call('Runtime.enable');
          await cdp.call('Page.enable');
          await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
          let scan = null;
          try {
            scan = JSON.parse(await cdpEval(cdp, AGENTS_LIST_EXPR, 90_000));
          } catch {
            scan = null;
          }
          const verdict = standInsOnlyVerdict(scan, { standIns: [] });
          agentsHeld.push(verdict.ok);
          if (!verdict.ok) throw new Refusal(`the app's own scan resolved an agent: ${verdict.said}`);
          if (options.inspect === true) main = await mainOf(handle);
          await cdpEval(cdp, RECORDER);
          ctx = makeContext({ w, bin: git, cdp, main, pid: handle.pid, build, setControl, knobs, terminal: gitOf(w.home, global) });
          await body(ctx);
        } finally {
          ctx?.stop();
          ctx?.look();
          launchesLooked += ctx?.looked === true ? 1 : 0;
          try {
            setControl({});
            writeFileSync(w.fuse, 'the launch is ending\n');
          } catch {
            /* the world is going */
          }
          try {
            await main?.end();
          } catch {
            /* main is busy */
          }
          main?.close();
          cdp.close();
        }
      }
    );
  } catch (err) {
    const why = String(err?.message ?? err);
    if (why.includes(CENSUS_WORDS)) censusFailures.push(`${label}: ${why.slice(0, 300)}`);
    throw err;
  } finally {
    ctx?.stop();
    const naming = () => rowsIn(psText()).filter((r) => r.command.includes(`${base}/`)).map((r) => r.pid);
    for (let i = 0; i < 225 && naming().length > 0; i += 1) await sleep(200);
    for (const pid of naming()) {
      const command = commandOf(pid);
      if (!command.includes(`${base}/`)) continue;
      leftovers.push(`${label}: ${command.slice(0, 160)}`);
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        /* gone */
      }
    }
    try {
      copyFileSync(join(w.profile, 'logs', 'app.log'), join(w.logs, 'app.txt'));
    } catch {
      /* the app wrote none */
    }
    if (KEEP) {
      mkdirSync(join(dirname(REPORT), label), { recursive: true });
      for (const n of readdirSync(w.logs)) copyFileSync(join(w.logs, n), join(dirname(REPORT), label, n));
    } else rmSync(base, { recursive: true, force: true });
    await sleep(1_000);
  }
}

/** What an arm is handed: the page, the terminal, the knobs, the sampler and the waits. */
function makeContext({ w, bin, cdp, main, pid, build, setControl, knobs, terminal }) {
  const ev = (expr, timeoutMs = 60_000) => cdpEval(cdp, expr, timeoutMs);
  let saves = 0;
  const ctx = {
    w,
    cdp,
    main,
    pid,
    build,
    ev,
    git: terminal,
    setControl,
    timer: null,
    samples: [],
    fused: false,
    project: null,
    file: null,
    failedOps: [],
    healed: 0,
    looked: false,
    /** The longest hold this log's calls can have been given: one begun before a lift is still held after it. */
    held: 0,
    stop() {
      if (ctx.timer !== null) clearInterval(ctx.timer);
      ctx.timer = null;
    },
    /** Read the process table every 250 ms from now on; over FUSE_AT the fuse blows. */
    sample() {
      ctx.stop();
      const mine = (ctx.samples = []);
      ctx.timer = setInterval(() => {
        const t = seconds();
        const text = psText(1);
        if (text === '') return; // a table ps did not answer is no reading, and the gap it leaves is graded
        const pids = standInsIn(text, bin);
        mine.push([t, pids]);
        ctx.looked = true;
        for (const other of gitsBeside(text, bin, pid)) otherGits.add(other.slice(0, 160));
        if (pids.length > FUSE_AT && !ctx.fused) {
          ctx.fused = true;
          writeFileSync(w.fuse, 'blown\n');
        }
      }, 250);
      return mine;
    },
    look() {
      const text = psText(1);
      if (text !== '') ctx.looked = true;
      for (const other of gitsBeside(text, bin, pid)) otherGits.add(other.slice(0, 160));
      return standInsIn(text, bin).length;
    },
    /** A log of this arm's own, from the next call on. */
    newLog(name, over) {
      knobs.LOG = join(w.logs, `${name}.txt`);
      ctx.held = over?.HOLD_MS ?? 0;
      setControl(over ?? {});
    },
    log: () => readFileSync(knobs.LOG, 'utf8'),
    calls: () => parseLog(ctx.log()).calls,
    changed: () => ev('window.__p371.changed'),
    last: () => ev('window.__p371.last'),
    /** What the page drew since `from`, as [seconds, hash], the one it drew at `from` first. */
    async states(from) {
      const all = JSON.parse(await ev(`JSON.stringify((() => { const s = window.__p371.states; let i = s.findIndex((x) => x[0] >= ${String(from)}); if (i < 0) i = s.length; return s.slice(Math.max(0, i - 1)); })())`));
      return all.map(([t, s]) => [t, short(s)]);
    },
    watch: (key, over) => ev(`(window.__p371.watch[${J(key)}] = Object.assign(${J(over)}, { at: null }), true)`),
    at: (key) => ev(`window.__p371.watch[${J(key)}] ? window.__p371.watch[${J(key)}].at : null`),
    waitAt: (key, forMs) => waitFor(() => ctx.at(key), forMs, 40),
    /** Press a thing the page draws. Answers the page's clock, in seconds. */
    async press(selector, pick = '() => true') {
      const t = await ev(`(() => { const b = Array.from(document.querySelectorAll(${J(selector)})).find(${pick}); if (!b || b.disabled) return null; const t = Date.now() / 1000; b.click(); return t; })()`);
      if (t === null) throw new Error(`nothing to press: ${selector}`);
      return t;
    },
    type: (selector, value) => ev(`(() => { const el = document.querySelector(${J(selector)}); if (!el) return null; const d = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'); const t = Date.now() / 1000; el.focus(); d.set.call(el, ${J(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return t; })()`),
    /** The row the next native menu answers with, read back as OFFERED after it. */
    async menu(want, raise) {
      await main.run(`(globalThis.__p371m.want = ${J(want)}, globalThis.__p371m.picked = null, true)`);
      const t = await raise();
      const picked = await waitFor(() => main.run('globalThis.__p371m.picked'), 5_000, 30);
      if (picked !== want) throw new Error(`the menu did not offer ${J(want)}: ${J(await main.run('globalThis.__p371m.offered'))}`);
      return t;
    },
    /** Open a project: Source Control with Branches open and a file, or the Explorer. */
    async show(dir, { view = 'scm', file = null, mode = 'file', open = [] } = {}) {
      ctx.project = dir;
      ctx.file = view === 'scm' ? file : null;
      await ev(`window.__gmuxShotDrive(${J({ projectPath: dir, ...(file === null ? {} : { openRel: file, mode }), sidebarView: view, localStorage: { [`gmux.scm.branchesCollapsed.${dir}`]: 'false', [`gmux.treeOpen.${dir}`]: J(open) } })}).then(() => 1)`, 120_000);
      await sleep(1_500);
    },
    async tab(dir) {
      const name = dir.split('/').pop();
      return ctx.press('.ptab, .prail-open', `(x) => (x.getAttribute('aria-label') || '').split(',')[0] === ${J(name)}`);
    },
    truth: () => truthOf(terminal, ctx.project, ctx.file),
    /** One unrelated saved file in the project. Answers the probe's clock. */
    save(dir = ctx.project) {
      saves += 1;
      mkdirSync(join(dir, 'w'), { recursive: true });
      const t = seconds();
      writeFileSync(join(dir, 'w', `saved${String(saves)}.txt`), `${String(saves)}\n`);
      if (saves > 1) rmSync(join(dir, 'w', `saved${String(saves - 1)}.txt`), { force: true });
      return t;
    },
    /** No git of the app's running, and none started for `forMs`. A call main ended wrote no end line and is let go 4 s past the longest hold its log was given. */
    quiet: (forMs = 600, within = 45_000) =>
      waitFor(() => {
        const c = ctx.calls();
        const now = seconds();
        return c.every((x) => x.end !== null || now - x.start > ctx.held / 1000 + 4) && now - Math.max(0, ...c.map((x) => x.start)) > forMs / 1000;
      }, within, 60),
    /** Quiet, and the page showing the truth: a save brings a shape that only a save refreshes. */
    async still() {
      for (let i = 0; i < 4; i += 1) {
        if ((await ctx.quiet()) === null) throw new Error('git never went quiet');
        const truth = ctx.truth();
        if ((await waitFor(async () => (await ctx.last()) === truth, 400, 60)) !== null) return short(truth);
        ctx.save();
        ctx.healed += 1;
        await waitFor(async () => (await ctx.last()) === truth, SAVE_WATCH_MS, 60);
      }
      const truth = ctx.truth();
      const last = await ctx.last();
      if (KEEP) writeFileSync(join(w.logs, `unsettled-${String(Date.now())}.json`), `${J({ truth, last })}\n`);
      throw new Error(`the page never came to the truth: ${J({ truth: truth.slice(0, 300), drawn: String(last).slice(0, 300) })}`);
    },
    /** One move, watched: at once for `watchMs` with nothing else written, then after one unrelated save. */
    async move(m, { watchMs = QUIET_WATCH_MS, saveWatchMs = SAVE_WATCH_MS } = {}) {
      const before = await ctx.still();
      const from = seconds();
      const inst = { row: m.row, k: m.k, t0: from, t1: null, before, truth: null, save: null, states: [], end: null };
      try {
        m.run();
      } catch (err) {
        ctx.failedOps.push(`${m.row} ${String(m.k)}: ${String(err?.message ?? err).slice(0, 200)}`);
        throw err;
      }
      inst.t1 = seconds();
      const truth = ctx.truth();
      inst.truth = short(truth);
      const drawn = inst.truth !== before;
      const seen = async () => (drawn ? (await ctx.last()) === truth : ctx.calls().some((c) => c.start >= from && FIVE.includes(c.sub)));
      if ((await waitFor(seen, watchMs, 50)) === null) {
        const heard = await ctx.changed();
        inst.save = ctx.save();
        await waitFor(seen, saveWatchMs, 50);
        inst.heard = (await ctx.changed()) - heard;
      }
      inst.end = seconds();
      inst.states = await ctx.states(from);
      return inst;
    },
    raw(arm, over) {
      ctx.stop();
      return { arm, build, log: ctx.log(), appPid: pid, until: seconds(), failedOps: ctx.failedOps, ...over };
    }
  };
  return ctx;
}

// ---------------------------------------------------------------------------
// M: the six cells
// ---------------------------------------------------------------------------

async function cellRun(cell, build) {
  let raw = null;
  const load = { before: loads() };
  await withApp(`m${build[0]}-${cell.id}`, build, {}, async (ctx) => {
    const repo = join(ctx.w.base, 'repo');
    seedRepo(ctx.git, repo, join(ctx.w.base, 'remote.git'));
    for (let i = 0; i < 49; i += 1) ctx.git.must(repo, 'commit', '-q', '--allow-empty', '-m', `c${String(i)}`);
    ctx.git.must(repo, 'push', '-q', 'origin', 'main');
    for (const b of ['a', 'b', 'c']) ctx.git.must(repo, 'branch', b);
    appendFileSync(join(repo, 'README.md'), 'changed\n');
    await ctx.show(repo, cell.view === 'scm' ? { file: 'README.md', mode: 'diff' } : { view: 'explorer' });
    await sleep(2_500);
    if ((await ctx.quiet(1_000)) === null) throw new Error('git never went quiet after the project opened');
    // One warm save, not counted: the first flush says true whatever it was (D2).
    const heard = await ctx.changed();
    const warm = ctx.save();
    if ((await waitFor(async () => (await ctx.changed()) > heard, 8_000)) === null) throw new Error('the warm save was not heard');
    // The page hears it 150 ms before it asks git anything, and quiet would answer before that.
    if ((await waitFor(() => ctx.calls().some((c) => c.sub === 'status' && c.start >= warm), 8_000)) === null) throw new Error('the warm save asked git nothing');
    if ((await ctx.quiet(1_500)) === null) throw new Error('git never went quiet after the warm save');
    if (cell.holdMs > 0) await loadGate(`${cell.id} at the ${build}`);
    load.cell = loads();
    ctx.newLog('cell', { HOLD_MS: cell.holdMs });
    ctx.sample();
    const before = await ctx.changed();
    const marks = { from: seconds() };
    let writes = 0;
    let next = Date.now();
    while (seconds() - marks.from < WRITE_S && !ctx.fused) {
      if (Date.now() >= next) {
        writes += 1;
        writeFileSync(join(repo, 'w', `n${String(writes)}.txt`), `${String(writes)}\n`);
        if (writes > 1) rmSync(join(repo, 'w', `n${String(writes - 1)}.txt`), { force: true });
        next += WRITE_MS;
      }
      await sleep(20);
    }
    marks.to = seconds();
    raw = ctx.raw('M', { cell, marks, writes, changes: (await ctx.changed()) - before, samples: ctx.samples, holdMs: cell.holdMs, fused: ctx.fused, load });
    raw.until = marks.to;
    load.after = loads();
  });
  return raw;
}

async function runM() {
  for (const cell of CELLS.filter((c) => WANTED_CELLS.includes(c.id))) {
    let parent;
    for (const build of BUILDS) {
      const id = `M:${cell.id}-${build}`;
      try {
        const raw = await cellRun(cell, build);
        keepRaw(`M-${cell.id}-${build}`, raw);
        const reading = derive(raw);
        if (build === 'parent') parent = reading;
        else linkParent('M', reading, parent);
        say(`${id}, load ${J(raw.load)}: ${J(reading)}`);
        judgeArm(id, `M-${build}`, reading);
      } catch (err) {
        if (err instanceof Refusal) throw err;
        cannotRead(id, `the cell stopped: ${String(err?.message ?? err).slice(0, 400)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// V: the moves
// ---------------------------------------------------------------------------

async function shapeRun(shape, build) {
  let raw = null;
  const load = { before: loads() };
  await withApp(`v${build[0]}-${shape}`, build, { global: shape === 'include' }, async (ctx) => {
    const world = makeShape(shape, ctx.w.base, ctx.w.home, ctx.git);
    if (shape !== 'init') {
      await ctx.show(world.project, { file: world.file });
      await ctx.move({ row: 'warm', k: 0, run: () => undefined }, { watchMs: 0 });
    }
    ctx.newLog('moves', {});
    const instances = [];
    const late = new Set();
    for (const m of world.moves) {
      if (m.project !== undefined) await ctx.show(m.project, {});
      if (m.setup !== undefined) {
        m.setup();
        await sleep(700); // its own flush is still to come, and quiet would answer before it
      }
      // A row whose first try was not shown in the whole quiet watch is not made to wait it again twice.
      const inst = await (m.project === undefined ? ctx.move(m, { watchMs: late.has(m.row) ? SHORT_WATCH_MS : QUIET_WATCH_MS }) : openMove(ctx, m));
      if (inst.save !== null) late.add(m.row);
      instances.push(inst);
    }
    raw = ctx.raw('V', { shape, instances, healed: ctx.healed, load });
    ctx.look();
    load.after = loads();
  });
  return raw;
}
/** `git init` in an open folder: there is no truth to settle on before it, only the page with no History at all. */
async function openMove(ctx, m) {
  if ((await ctx.quiet()) === null) throw new Error('git never went quiet');
  const before = short(await ctx.last());
  const from = seconds();
  m.run();
  const inst = { row: m.row, k: m.k, t0: from, t1: seconds(), before, truth: null, save: null, states: [], end: null };
  const truth = ctx.truth();
  inst.truth = short(truth);
  const seen = async () => (await ctx.last()) === truth;
  if ((await waitFor(seen, QUIET_WATCH_MS, 50)) === null) {
    inst.save = ctx.save();
    if ((await waitFor(seen, SAVE_WATCH_MS, 50)) === null && KEEP) writeFileSync(join(ctx.w.logs, `unshown-${m.row}-${String(m.k)}.json`), `${J({ truth, last: await ctx.last() })}\n`);
  }
  inst.end = seconds();
  inst.states = await ctx.states(from);
  return inst;
}

async function runV() {
  for (const shape of SHAPES.filter((s) => WANTED_SHAPES.includes(s))) {
    let parent;
    for (const build of BUILDS) {
      const id = `V:${shape}-${build}`;
      try {
        const raw = await shapeRun(shape, build);
        keepRaw(`V-${shape}-${build}`, raw);
        const reading = derive(raw);
        if (build === 'parent') parent = reading;
        else linkParent('V', reading, parent);
        say(`${id}, load ${J(raw.load)}: ${Object.entries(reading.rows).map(([row, r]) => `${row} ${r.drawn ? '' : '(draws nothing) '}${String(r.once)}/${String(r.save)}/${String(r.never)} ${String(r.onceMs)}/${String(r.saveMs)} ms`).join('; ')}${build === 'head' || reading.unexpected.length === 0 ? '' : `; UNEXPECTED ${J(reading.unexpected)}`}; saves needed to settle before a move: ${String(reading.healed)}; saves main sent nothing for: ${J(reading.unheard)}`);
        judgeArm(id, `V-${build}`, reading);
      } catch (err) {
        if (err instanceof Refusal) throw err;
        cannotRead(id, `the shape stopped: ${String(err?.message ?? err).slice(0, 500)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// A1 to A8: the attack
// ---------------------------------------------------------------------------

/** An ordinary repository, shown in Source Control with Branches open, the first flush spent. */
async function plainWorld(ctx, name, { file = 'notes.txt', mode = 'file', initArgs = [] } = {}) {
  const repo = join(ctx.w.base, name);
  seedRepo(ctx.git, repo, join(ctx.w.base, `${name}-remote.git`), initArgs);
  await ctx.show(repo, { file, mode });
  await ctx.move({ row: 'warm', k: 0, run: () => undefined }, { watchMs: 0 });
  return repo;
}
/** One move of an attack: watched for `forMs` from its end (or from `from`), with whatever `around` does beside it. */
async function attackMove(ctx, row, run, { forMs = SHOWN_BY_MS + 2_000, before = null } = {}) {
  const inst = { row, k: 1, t0: seconds(), t1: null, before: before ?? short(await ctx.last()), truth: null, save: null, states: [], end: null };
  inst.t0 = seconds();
  await run(inst);
  inst.t1 ??= seconds();
  const truth = ctx.truth();
  inst.truth = short(truth);
  await waitFor(async () => (await ctx.last()) === truth, forMs, 50);
  inst.end = seconds();
  inst.states = await ctx.states(inst.t0);
  return inst;
}
async function pageBack(ctx, from) {
  const back = await waitFor(async () => {
    try {
      return (await ctx.ev(`document.readyState === 'complete' && typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' && performance.timeOrigin > ${String(from * 1000 - 500)}`, 5_000)) === true;
    } catch {
      return null;
    }
  }, 30_000, 60);
  if (back === null) throw new Error('the window did not come back after the reload');
  await ctx.ev(RECORDER);
}

/** The arms that take one launch; each answers its raw input. */
const ATTACKS = {
  async A1(ctx) {
    const repo = await plainWorld(ctx, 'a1');
    ctx.newLog('A1', {});
    const instances = [];
    for (let k = 1; k <= BURST_N; k += 1) {
      const before = await ctx.still();
      const dir = join(repo, 'w', `burst${String(k)}`);
      mkdirSync(dir);
      const inst = await attackMove(ctx, `burst ${String(k)}`, (i) => {
        const began = Date.now();
        for (let n = 0; n < BURST_FILES; n += 1) {
          if (n === BURST_FILES / 2) ctx.git.must(repo, 'branch', `burst${String(k)}`);
          writeFileSync(join(dir, `f${String(n)}.txt`), '');
        }
        i.writesMs = Date.now() - began;
      }, { before });
      instances.push(inst);
      rmSync(dir, { recursive: true, force: true });
      await sleep(600);
    }
    return ctx.raw('A1', { files: BURST_FILES, instances });
  },
  async A2(ctx) {
    const repo = await plainWorld(ctx, 'a2', { file: null });
    ctx.newLog('A2', {});
    const instances = [];
    let n = 0;
    for (const offset of [-50, 0, 50]) {
      for (const k of [1, 2, 3]) {
        const before = await ctx.still();
        n += 1;
        const commit = () => ctx.git.must(repo, 'commit', '-q', '--allow-empty', '-m', `reload ${String(n)}`);
        instances.push(await attackMove(ctx, `reload ${String(offset)} ms, ${String(k)}`, async (i) => {
          if (offset > 0) {
            commit();
            i.t1 = seconds();
            await sleep(offset);
          }
          const at = seconds();
          const reload = ctx.cdp.call('Page.reload', {}).catch(() => undefined);
          if (offset < 0) await sleep(-offset);
          if (offset <= 0) {
            commit();
            i.t1 = seconds();
          }
          await Promise.race([reload, sleep(300)]);
          await pageBack(ctx, at);
        }, { before }));
      }
    }
    const other = join(ctx.w.base, 'a2b');
    seedRepo(ctx.git, other, join(ctx.w.base, 'a2b-remote.git'));
    const before = await ctx.still();
    await ctx.show(other, {});
    await ctx.quiet();
    ctx.project = repo;
    instances.push(await attackMove(ctx, 'ten moves behind another tab', async (i) => {
      for (let k = 1; k <= 10; k += 1) {
        ctx.git.must(repo, 'branch', `behind${String(k)}`);
        await sleep(200);
      }
      i.t1 = seconds();
      i.from = await ctx.tab(repo);
    }, { before }));
    return ctx.raw('A2', { instances });
  },
  async A4(ctx) {
    const instances = [];
    const shapes = [
      ['renamed away and back, a flush between', async (repo) => {
        renameSync(join(repo, '.git'), join(repo, '.away'));
        ctx.save();
        await sleep(2_000);
        renameSync(join(repo, '.away'), join(repo, '.git'));
      }],
      ['renamed away and back at once', async (repo) => {
        renameSync(join(repo, '.git'), join(repo, '.away'));
        renameSync(join(repo, '.away'), join(repo, '.git'));
      }],
      ['removed and made again', async (repo, name) => {
        rmSync(join(repo, '.git'), { recursive: true, force: true });
        await sleep(1_000);
        seedRepo(ctx.git, repo, join(ctx.w.base, `${name}-again.git`));
      }],
      ['the pointer rewritten', async (repo, name) => {
        renameSync(join(ctx.w.base, `${name}-apart.git`), join(ctx.w.base, `${name}-moved.git`));
        writeFileSync(join(repo, '.git'), `gitdir: ${join(ctx.w.base, `${name}-moved.git`)}\n`);
      }]
    ];
    ctx.newLog('A4', {});
    for (const [i, [what, change]] of shapes.entries()) {
      const name = `a4${String(i)}`;
      const repo = await plainWorld(ctx, name, { file: null, ...(i === 3 ? { initArgs: ['--separate-git-dir', join(ctx.w.base, `${name}-apart.git`)] } : {}) });
      await change(repo, name);
      await sleep(1_500);
      for (const k of [1, 2]) {
        instances.push(await attackMove(ctx, `${what}, move ${String(k)}`, async (inst) => {
          ctx.git.must(repo, 'branch', `after${String(k)}`);
          inst.t1 = seconds();
          await sleep(1_000);
          inst.from = ctx.save();
        }, { forMs: ATTACK_SAVE_MS + 2_000 }));
        await ctx.quiet();
      }
    }
    return ctx.raw('A4', { instances });
  },
  async A5(ctx) {
    const repo = await plainWorld(ctx, 'a5');
    ctx.newLog('A5', {});
    const before = await ctx.still();
    const stop = { verified: false, at: 0, contAt: 0, saves: 0, moves: 0 };
    const command = commandOf(ctx.pid);
    // Electron's main renames itself to the one word `Tortie`, as his own does, so this one is known by its PARENT: this process.
    const ours = () => {
      const now = commandOf(ctx.pid);
      return now !== '' && now === command && Number(String(spawnSync('/bin/ps', ['-p', String(ctx.pid), '-o', 'ppid='], { encoding: 'utf8' }).stdout ?? '').trim()) === process.pid;
    };
    const inst = await attackMove(ctx, 'the app stopped for ten seconds', async (i) => {
      if (!ours()) throw new Error(`the app's pid ${String(ctx.pid)} reads ${J(command)} and is not this run's own child`);
      process.kill(ctx.pid, 'SIGSTOP');
      stop.at = seconds();
      stop.verified = true;
      try {
        for (let n = 0; n < 50; n += 1) {
          ctx.save();
          stop.saves += 1;
          if (n % 10 === 5) {
            ctx.git.must(repo, 'branch', `stopped${String(n)}`);
            stop.moves += 1;
          }
          while (seconds() - stop.at < (n + 1) * 0.2) await sleep(10);
        }
      } finally {
        if (ours()) process.kill(ctx.pid, 'SIGCONT');
        stop.contAt = seconds();
      }
      i.from = stop.contAt;
    }, { before });
    return ctx.raw('A5', { instances: [inst], stop });
  },
  async A6(ctx) {
    const repo = join(ctx.w.base, 'a6');
    seedRepo(ctx.git, repo, join(ctx.w.base, 'a6-remote.git'));
    const marks = {};
    ctx.newLog('A6', { FAIL: 'for-each-ref,remote', HOLD_MS: 32_000, HOLD_ONLY: 'log' });
    marks.open = seconds();
    await Promise.race([ctx.show(repo, {}).catch(() => undefined), sleep(25_000)]);
    while (seconds() - marks.open < 28.5) await sleep(50);
    // The walk is ended by main at its own limit; the flat one it falls to fails at once, so this cell stays under 45 s.
    ctx.setControl({ FAIL: 'for-each-ref,remote,log' });
    while (seconds() - marks.open < 33) await sleep(50);
    marks.quiet = seconds();
    while (seconds() - marks.open < 42) await sleep(50);
    marks.answer = seconds();
    ctx.setControl({});
    await sleep(3_000);
    const truth = ctx.truth();
    const shownBefore = (await ctx.last()) === truth;
    marks.save = ctx.save();
    const hit = await waitFor(async () => (await ctx.last()) === truth, ATTACK_SAVE_MS + 3_000, 40);
    const shownAt = hit === null ? null : ((await ctx.states(marks.save)).find(([t, h]) => t >= marks.save && h === short(truth))?.[0] ?? null);
    await ctx.quiet(1_500);
    const heard = await ctx.changed();
    marks.next = ctx.save();
    await sleep(3_500);
    marks.end = seconds();
    return ctx.raw('A6', { marks, holdMs: 32_000, shownBefore, shownAt, nextHeard: (await ctx.changed()) - heard });
  },
  async A8(ctx) {
    const repo = await plainWorld(ctx, 'a8');
    await ctx.still();
    const clean = join(ctx.w.base, 'clean.git');
    cpSync(join(repo, '.git'), clean, { recursive: true });
    // Real git reads the clean copy: a git that opened the FIFO would hang, and this arm is about main's own thread.
    ctx.newLog('A8', { GITDIR: clean, WORKTREE: repo });
    await ctx.main.run('(globalThis.__p371m.longest = 0, globalThis.__p371m.beats = 0, true)');
    const fifo = join(repo, '.git', 'fifo');
    const made = spawnSync('/usr/bin/mkfifo', [fifo], { encoding: 'utf8' });
    if (made.status !== 0) throw new Error(`mkfifo: ${String(made.stderr)}`);
    appendFileSync(join(repo, '.git', 'config'), `[include]\n\tpath = fifo\n[include]\n\tpath = /dev/tty\n[include]\n\tpath = /net/x/y\n`);
    await sleep(2_000);
    await ctx.quiet(800);
    const before = await ctx.changed();
    const marks = { writer: seconds() };
    for (let k = 1; seconds() - marks.writer < 10; k += 1) {
      ctx.save();
      await sleep(WRITE_MS);
    }
    marks.writerEnd = seconds();
    await sleep(1_500);
    const changes = (await ctx.changed()) - before;
    await ctx.quiet(800);
    marks.end = seconds();
    const m = JSON.parse(await ctx.main.run('JSON.stringify({ longest: globalThis.__p371m.longest, beats: globalThis.__p371m.beats })'));
    const answer = ctx.raw('A8', { marks, changes, longestMs: Math.round(m.longest), beats: m.beats, configRead: readFileSync(join(repo, '.git', 'config'), 'utf8').includes('path = fifo') });
    copyFileSync(join(clean, 'config'), join(repo, '.git', 'config'));
    rmSync(fifo, { force: true });
    return answer;
  }
};
const INSPECTED = new Set(['A8']);

/** A3: four launches, because a watch that was lost once is never trusted again (D3), so one killed process is all a launch may read. */
async function attackA3(build) {
  const instances = [];
  const kills = [];
  const afterSaves = [];
  const pids = [];
  let log = '';
  for (const [i, when] of ['between the move and the flush', 'before the move', 'between the move and the flush', 'before the move'].entries()) {
    await withApp(`a3${build[0]}${String(i + 1)}`, build, {}, async (ctx) => {
      pids.push(ctx.pid);
      const repo = await plainWorld(ctx, `a3${String(i)}`);
      const before = await ctx.still();
      ctx.newLog('A3', {});
      const kill = { pid: null, verified: false, sent: false, back: false };
      kills.push(kill);
      const mine = watchersOf(psText(), ctx.pid);
      if (mine.length !== 1) throw new Error(`the app has ${String(mine.length)} node utility children, not its one watcher process`);
      kill.pid = mine[0];
      const command = commandOf(kill.pid);
      const end = () => {
        const now = commandOf(kill.pid);
        kill.verified = now === command && now.includes('--type=utility') && watchersOf(psText(), ctx.pid).includes(kill.pid);
        if (!kill.verified) throw new Error(`pid ${String(kill.pid)} reads ${J(now)}, not this app's watcher process`);
        process.kill(kill.pid, 'SIGKILL');
        kill.sent = true;
      };
      const move = () => ctx.git.must(repo, 'branch', `killed${String(i)}`);
      instances.push(await attackMove(ctx, `killed ${when}`, async (inst) => {
        if (i % 2 === 0) {
          // Read and verified first, so the signal lands within a few milliseconds of the move.
          kill.verified = commandOf(kill.pid) === command;
          move();
          inst.t1 = seconds();
          end();
        } else {
          end();
          await sleep(50);
          move();
          inst.t1 = seconds();
        }
      }, { before }));
      kill.back = (await waitFor(() => watchersOf(psText(), ctx.pid).some((p) => p !== kill.pid), 15_000, 300)) !== null;
      await ctx.quiet(1_500);
      for (let n = 0; n < 3; n += 1) {
        const t = ctx.save();
        await sleep(2_500);
        afterSaves.push([t, seconds()]);
      }
      log += ctx.log();
    });
  }
  return { arm: 'A3', build, log, appPids: pids, until: seconds(), failedOps: [], instances, kills, afterSaves };
}

/** A7: a launch a hold. */
async function attackA7(build) {
  const cells = [];
  for (const [id, holdMs] of [['1s', 1_000], ['10s', 10_000]]) {
    await withApp(`a7${build[0]}${id}`, build, {}, async (ctx) => {
      const repo = join(ctx.w.base, 'a7');
      seedRepo(ctx.git, repo, join(ctx.w.base, 'a7-remote.git'));
      appendFileSync(join(repo, 'README.md'), 'changed\n');
      await ctx.show(repo, { file: 'README.md', mode: 'diff' });
      await ctx.move({ row: 'warm', k: 0, run: () => undefined }, { watchMs: 0 });
      await ctx.still();
      await loadGate(`A7 ${id} at the ${build}`);
      ctx.newLog('A7', { HOLD_MS: holdMs });
      ctx.sample();
      const marks = { from: seconds() };
      let moves = 0;
      while (moves < A7_MOVES && !ctx.fused) {
        moves += 1;
        ctx.git.must(repo, 'update-ref', `refs/heads/held${String(moves)}`, 'HEAD');
        marks.moved = seconds();
        while (seconds() - marks.from < (moves * A7_GAP_MS) / 1000) await sleep(5);
      }
      marks.last = seconds();
      const truth = ctx.truth();
      const shown = async () => (await ctx.last()) === truth;
      // A held cell runs at most 45 s: the hold is lifted by 34 s, and what is out, each held its 10 s, drains.
      await waitFor(async () => (ctx.fused ? true : shown()), Math.max(0, 34_000 - (marks.last - marks.from) * 1000), 200);
      marks.lift = seconds();
      const samples = ctx.samples; // read on until the drain is over, so what is still out then is seen alive
      marks.to = marks.lift;
      ctx.setControl({});
      if (!ctx.fused) await waitFor(shown, 30_000, 200);
      const shownAt = (await ctx.states(marks.from)).find(([t, h]) => t >= marks.last - 0.4 && h === short(truth))?.[0] ?? null;
      const fused = ctx.fused; // the cell's own: what a drain does after it is not the cell
      await ctx.quiet(1_000, 45_000);
      const kept = (await ctx.last()) === truth;
      const log = ctx.log();
      const until = seconds();
      ctx.stop();
      cells.push({ id, holdMs, moves, log, samples, marks, shownAt, kept, fused, until, appPid: ctx.pid, load: loads() });
    });
  }
  return { arm: 'A7', build, cells, failedOps: [] };
}

async function runAttacks() {
  for (const id of ARMS.filter((a) => /^A\d+$/.test(a))) {
    let parent;
    for (const build of BUILDS.filter((b) => ARM_SPECS[id].includes(b))) {
      const key = `${id}-${build}`;
      const load = { before: loads() };
      try {
        let raw = null;
        if (id === 'A3') raw = await attackA3(build);
        else if (id === 'A7') raw = await attackA7(build);
        else
          await withApp(`${id.toLowerCase()}${build[0]}`, build, { inspect: INSPECTED.has(id) }, async (ctx) => {
            raw = await ATTACKS[id](ctx);
            ctx.look();
          });
        load.after = loads();
        raw.load = load;
        keepRaw(key, raw);
        const reading = derive(raw);
        if (id === 'A8' && build === 'head') linkParent('A8', reading, parent);
        else if (build === 'parent') parent = reading;
        say(`${key}, load ${J(load)}: ${J(reading)}`);
        judgeArm(key, key, reading);
      } catch (err) {
        if (err instanceof Refusal) throw err;
        cannotRead(key, `the arm stopped: ${String(err?.message ?? err).slice(0, 400)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// P: a person's own presses, git held 1 s
// ---------------------------------------------------------------------------

async function pressesAt(build) {
  let raw = null;
  const load = { before: loads() };
  await withApp(`p${build[0]}`, build, { inspect: true }, async (ctx) => {
    const repo = join(ctx.w.base, 'p');
    seedRepo(ctx.git, repo, join(ctx.w.base, 'p-remote.git'));
    for (let i = 0; i < 170; i += 1) ctx.git.must(repo, 'commit', '-q', '--allow-empty', '-m', `more ${String(i)}`);
    ctx.git.must(repo, 'push', '-q', 'origin', 'main');
    for (const k of [1, 2, 3]) ctx.git.must(repo, 'branch', `x${String(k)}`);
    await ctx.show(repo, { file: 'notes.txt' });
    await ctx.move({ row: 'warm', k: 0, run: () => undefined }, { watchMs: 0 });
    await ctx.still();
    ctx.newLog('P', { HOLD_MS: 1_000 });
    const presses = [];
    const finish = async (p) => {
      await sleep(700); // what the press starts, and the flush its own git causes, are still to come, and quiet would answer before them
      if ((await ctx.quiet(1_300)) === null) throw new Error(`git never went quiet after ${p.row}`);
      p.end = seconds();
      p.states = await ctx.states(p.t0);
      presses.push(p);
    };
    const until = (truth) => waitFor(async () => (await ctx.last()) === truth, 25_000, 50);
    const HEADER = '.branch-refresh[aria-label="Refresh git status"]';
    for (const k of [1, 2, 3]) await finish({ row: '↻', k, kind: 'reads', t0: await ctx.press(HEADER) });
    for (const k of [1, 2, 3]) await finish({ row: 'Refresh branches', k, kind: 'reads', t0: await ctx.press('[aria-label="Refresh branches"]') });
    for (const k of [1, 2, 3]) {
      const t = await ctx.press('.scm-brow:not(.remote)', `(x) => x.querySelector('.scm-bname').textContent === ${J(`x${String(k)}`)}`);
      if ((await waitFor(() => ctx.git.maybe(repo, 'symbolic-ref', 'HEAD') === `refs/heads/x${String(k)}`, 10_000, 40)) === null) throw new Error('the checkout was never made');
      const truth = ctx.truth();
      await until(truth);
      await finish({ row: 'checkout', k, kind: 'truth', t0: t, truth: short(truth) });
    }
    for (const k of [1, 2, 3]) {
      await ctx.menu('Create Branch…', () => ctx.ev(`(() => { const r = document.querySelector('[data-section-root="history"] .scm-hrow'); const b = r.getBoundingClientRect(); r.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: b.left + 40, clientY: b.top + 4 })); return Date.now() / 1000; })()`));
      if ((await waitFor(() => ctx.ev(`document.querySelector('.scm-mini-input') !== null`), 5_000)) === null) throw new Error('the branch sheet never opened');
      await ctx.type('.scm-mini-input', `made${String(k)}`);
      await sleep(80);
      const t = await ctx.press('.scm-mini-modal .btn-primary');
      if ((await waitFor(() => ctx.git.maybe(repo, 'rev-parse', '--verify', '--quiet', `refs/heads/made${String(k)}`) !== null, 10_000, 40)) === null) throw new Error('the branch was never made');
      const truth = ctx.truth();
      await until(truth);
      await finish({ row: 'branch made', k, kind: 'truth', t0: t, truth: short(truth) });
    }
    for (const k of [1, 2, 3]) {
      writeFileSync(join(repo, 'w', `staged${String(k)}.txt`), `${String(k)}\n`);
      ctx.git.must(repo, 'add', '-A');
      await sleep(1_500); // the flush this starts is still to come, and quiet would answer before it
      await ctx.quiet(1_300);
      await ctx.type('.scm-commit-input', `pressed ${String(k)}`);
      if ((await waitFor(() => ctx.ev(`!document.querySelector('.scm-commit-btn').disabled`), 10_000)) === null) throw new Error('the commit was never offered');
      const at = ctx.git.must(repo, 'rev-parse', 'HEAD');
      const t = await ctx.press('.scm-commit-btn');
      if ((await waitFor(() => ctx.git.must(repo, 'rev-parse', 'HEAD') !== at, 15_000, 40)) === null) throw new Error('the commit was never made');
      const truth = ctx.truth();
      await until(truth);
      await finish({ row: 'commit', k, kind: 'truth', t0: t, truth: short(truth) });
    }
    for (const [i, label] of ['All local branches', 'Everything', 'This branch + upstream'].entries()) {
      if ((await waitFor(() => ctx.ev(`!document.querySelector('.scm-scope-btn').disabled`), 20_000)) === null) throw new Error('the scope button stayed disabled');
      const t = await ctx.menu(label, () => ctx.press('.scm-scope-btn'));
      await sleep(300);
      await finish({ row: 'scope', k: i + 1, kind: 'reads', t0: t });
    }
    for (const k of [1, 2, 3]) {
      const t = await ctx.type('[aria-label="Search history"]', `message:base${String(k)}`);
      await sleep(800);
      await finish({ row: 'query', k, kind: 'reads', t0: t });
      const c = await ctx.type('[aria-label="Search history"]', '');
      await sleep(800);
      await finish({ row: 'query cleared', k, kind: 'reads', t0: c });
    }
    for (const k of [1, 2, 3]) {
      const toggle = (root) => ctx.press(`[data-section-root="${root}"] .section-toggle`);
      await toggle('history');
      await toggle('branches');
      await sleep(400);
      const t = await ctx.press(HEADER);
      await sleep(200);
      await toggle('history');
      await toggle('branches');
      const truth = ctx.truth();
      await until(truth);
      await finish({ row: 'opened while a read is out', k, kind: 'truth', t0: t, truth: short(truth) });
    }
    for (const k of [1, 2, 3]) {
      await ctx.watch(`more${String(k)}`, { kind: 'count', sel: '[data-section-root="history"] .scm-hrow[data-hist]', more: 50 * k });
      const t = await ctx.press('[data-hist="more"]');
      await ctx.waitAt(`more${String(k)}`, 25_000);
      await finish({ row: 'Load 50 more', k, kind: 'page', t0: t, seenAt: await ctx.at(`more${String(k)}`) });
    }
    // A change search on screen while an agent writes (Phase 199).
    await ctx.type('[aria-label="Search history"]', 'change:two');
    if ((await waitFor(() => ctx.ev(`(() => { const b = document.querySelector('[aria-label="Search changes"]'); return b !== null && !b.disabled; })()`), 20_000)) === null) throw new Error('the change search was never offered');
    await ctx.press('[aria-label="Search changes"]');
    const applied = (await waitFor(() => ctx.ev(`document.querySelector('.scm-history-search-ms') !== null`), 25_000)) !== null;
    await ctx.quiet(1_300);
    const heard = await ctx.changed();
    const change = { applied, from: seconds(), to: 0, heard: 0 };
    while (seconds() - change.from < 8) {
      ctx.save();
      await sleep(WRITE_MS);
    }
    await sleep(1_000);
    change.to = seconds();
    change.heard = (await ctx.changed()) - heard;
    await ctx.quiet(1_300);
    ctx.look();
    load.after = loads();
    raw = ctx.raw('P', { presses, change, holdMs: 1_000, load });
  });
  return raw;
}

// ---------------------------------------------------------------------------
// N: every other consumer of a saved file, and main's own thread
// ---------------------------------------------------------------------------

async function consumersAt(build) {
  let raw = null;
  const load = { before: loads() };
  await withApp(`n${build[0]}`, build, { inspect: true }, async (ctx) => {
    const repo = join(ctx.w.base, 'n');
    mkdirSync(repo, { recursive: true });
    writeFileSync(join(repo, 'code.ts'), 'export const first = 1;\n');
    seedRepo(ctx.git, repo, join(ctx.w.base, 'n-remote.git'));
    const saves = [];
    for (const view of ['explorer', 'scm']) {
      await ctx.show(repo, { view, file: 'code.ts', open: ['w/'] });
      await ctx.quiet(1_500);
      ctx.save();
      await sleep(1_500);
      await ctx.quiet(1_500);
      if (view === 'explorer') {
        ctx.newLog('N', {});
        await ctx.main.run('(globalThis.__p371m.longest = 0, globalThis.__p371m.beats = 0, true)');
      }
      for (let k = 1; k <= N_SAVES; k += 1) {
        const id = `${view}${String(k)}`;
        const name = `${view === 'explorer' ? 'e' : 's'}new${String(k)}.txt`;
        const token = `token_${id}`;
        const first = view === 'explorer' ? { kind: 'tree', path: `w/${name}` } : { kind: 'changes', name };
        await ctx.watch(`${id}-row`, first);
        await ctx.watch(`${id}-editor`, { kind: 'editor', token });
        const heard = await ctx.changed();
        const t = seconds();
        writeFileSync(join(repo, 'w', name), `${id}\n`);
        writeFileSync(join(repo, 'code.ts'), `export const ${token} = ${String(k)};\n`);
        if (k > 1) rmSync(join(repo, 'w', name.replace(/\d+/, String(k - 1))), { force: true });
        const row = await ctx.waitAt(`${id}-row`, 8_000);
        const editor = await ctx.waitAt(`${id}-editor`, 8_000);
        await sleep(Math.max(0, 2_500 - (seconds() - t) * 1000));
        saves.push({ t, [view === 'explorer' ? 'explorer' : 'changes']: row, editor, heard: (await ctx.changed()) - heard, end: seconds() });
      }
    }
    const m = JSON.parse(await ctx.main.run('JSON.stringify({ longest: globalThis.__p371m.longest, beats: globalThis.__p371m.beats })'));
    ctx.look();
    load.after = loads();
    raw = ctx.raw('N', { saves, longestMs: Math.round(m.longest), beats: m.beats, load });
  });
  return raw;
}

async function runPaired(arm, at) {
  let parent;
  for (const build of BUILDS) {
    const id = `${arm}-${build}`;
    try {
      const raw = await at(build);
      keepRaw(id, raw);
      const reading = derive(raw);
      if (build === 'parent') parent = reading;
      else linkParent(arm, reading, parent);
      say(`${id}, load ${J(raw.load)}: ${J(reading)}`);
      judgeArm(id, id, reading);
    } catch (err) {
      if (err instanceof Refusal) throw err;
      cannotRead(id, `the arm stopped: ${String(err?.message ?? err).slice(0, 400)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

say(`measuring HEAD ${HEAD} (${String(report.headSha).slice(0, 8)}) against the parent ${String(report.parent)} (${String(report.parentSha).slice(0, 8)}); arms ${ARMS.join(',')}; cells ${WANTED_CELLS.join(',')}; shapes ${WANTED_SHAPES.join(',')}; socket ${SOCKET}; load ${J(loads())}; history ${HISTORY_BEFORE}${DEVELOPMENT ? '; DEVELOPMENT, this run never exits 0' : ''}`);
try {
  if (ARMS.includes('M')) await runM();
  if (ARMS.includes('V')) await runV();
  await runAttacks();
  if (ARMS.includes('P')) await runPaired('P', pressesAt);
  if (ARMS.includes('N')) await runPaired('N', consumersAt);
} catch (err) {
  stopWith = err instanceof Refusal ? err.code : 0;
  if (stopWith === 0) unreadable += 1;
  report.error = String(err?.message ?? err).slice(0, 900);
  say(`THE RUN STOPPED: ${report.error}`);
} finally {
  const text = psText();
  const left = rowsIn(text).filter((r) => r.command.includes(`${RUN}/`)).map((r) => `${String(r.pid)} ${r.command.slice(0, 160)}`);
  const electrons = appPids.filter((pid) => rowsIn(text).some((r) => r.pid === pid && /Electron|Tortie/.test(r.command)));
  // A tmux server of this run's own socket: its command line names the socket, and the helper ends each launch's own.
  const socketLeft = rowsIn(text).some((r) => /(?:^|\/)tmux\b/.test(r.command) && r.command.includes(`-L ${SOCKET}`));
  const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null };
  if (history.after !== history.before) {
    say(`his shell history moved (${history.before} to ${history.after}); starting nothing for 3 minutes and reading it again`);
    await sleep(180_000);
    history.quiet = { again: historyStat() };
  }
  judgeArm('RUN', 'RUN', { preflight: { ok: PREFLIGHT.every((c) => c.ok) }, launches, launchesLooked, agentsHeld, censusFailures, processTableRead: text.length > 0, otherGits: [...otherGits], electronsLeft: electrons.length, leftovers: [...leftovers, ...left], socketLeft, history });
  report.seconds = Math.round((Date.now() - t0) / 1000);
  report.load = loads();
  writeFileSync(REPORT, `${J(report, null, 2)}\n`, { mode: 0o600 });
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}
say(`${String(report.arms.filter((a) => a.ok === true).length)} verdict(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read; ${String(report.seconds)} s; load ${J(report.load)}; report ${REPORT}`);
process.exit(stopWith > 0 ? stopWith : failures > 0 ? 1 : unreadable > 0 || DEVELOPMENT ? 2 : 0);
