#!/usr/bin/env node
/**
 * probe:p370 — THE PHASE 370 APP RUN (build/p370/SPEC.md §8): how many
 * `git check-ignore` children the file tree holds at once, at the parent
 * (`3aae4f89`) and at HEAD, counted from OUTSIDE the app.
 *
 * At the parent every directory listing that lands starts a call of its own, so
 * showing a project whose tree remembers N open folders holds N+2 children at
 * once with no writer at all, and every repository change holds N+2 more (his
 * Mac: 515 at once, a load of 474). At HEAD the store holds one call and main
 * holds one child a repository.
 *
 * THE COUNTING GIT. `build/p370/stand-in.zsh` is copied into the run's own
 * `bin/` as `git`, and that folder is first on the launched app's PATH and on
 * the PATH its login shell answers (SHELL=/bin/sh, a scratch HOME). It logs each
 * call's start and end; a held call sleeps in zsh with no child and no CPU, and
 * the matrix's held cells answer from the fixture's own rules without running
 * real git, because his own builds run on this Mac. The run REFUSES (exit 2)
 * unless that login shell resolves `git` to the stand-in before each launch and
 * a git call whose parent is the app's own pid reached it after. Every git has
 * HOME in scratch, GIT_CONFIG_GLOBAL=/dev/null and GIT_CONFIG_NOSYSTEM=1, and
 * every repository it opens is one it made.
 *
 * THE FUSE. With 520 held children alive this run blows the fuse (the stand-in
 * stops holding), stops its writer and ENDS THAT LAUNCH there and then through
 * the helper's own teardown: the fuse stops the holding, never the starting, and
 * the spec step's parent ran 789 alive after it. The next cell takes a new
 * launch, and the fused cell's drain is not read at that build. The stand-in
 * caps itself at 560 whatever this file does.
 *
 * TWO COUNTS. A call main itself ended writes no end line, so the most alive is
 * read from the stand-in's log AND from the process table (`ps`, every 250 ms,
 * 100 in A9), where only a stand-in whose own parent is not a stand-in counts
 * (zsh shows its own command line for an instant in the child it forks for real
 * git). HEAD's clauses are asked of each on its own.
 *
 * ONE ELECTRON AT A TIME through build/electron-run.mjs inside
 * build/harness-socket.mjs, the parent first, each launch on its own scratch
 * profile, HOME and ZDOTDIR with HISTFILE=/dev/null, the harness socket as its
 * `tmuxSocket` (the helper's read-only census of his session names around it).
 * NO AGENT RUNS, not even for a version: every probed registry row is hidden and
 * `agents:list` is read back (a row that resolved refuses the run), and no
 * session is created at all. It starts nothing while memory reads under 20
 * percent free (ten minutes, then exit 3), and before any cell that can hold
 * more than 20 children it waits for a 1 minute load under 60, at most 20 minutes.
 *
 * THREE VERDICTS, AND A MISSING READING IS NEVER A PASS. Each grader names the
 * fields it reads (`reads`), the preconditions without which nothing it says can
 * be trusted (`needs`) and its `clauses`. An absent field or an unmet need is
 * UNREADABLE (exit 2); only a clause is FAIL (exit 1). Every reading taken from
 * raw text (the stand-in's log, the process table's samples, the page's
 * recorder) comes out of ONE pure function, `derive`, which
 * `--grader-self-test` drives over recorded raw fixtures seeded from the spec
 * step's own runs (build/p370/fixtures/).
 *
 * THE ARMS (SPEC §8.2): M the matrix (10, 100 and 500 folders; real git at 10,
 * held 1 s and 10 s at each), D the no-regression readings (parent, HEAD,
 * parent, HEAD), A1 to A11 the attack, and RUN.
 *
 * VERIFIERS ONLY: it starts Electrons. Take the lock.
 *
 *   P370_PARENT_CHECKOUT=<a built 3aae4f89> npm run -s probe:p370
 *   P370_ARMS=M,D,A1,…    the arms (default every one; RUN is always read)
 *   P370_CELLS=n10-real,n10-1s,…   M's cells (default all seven)
 *   P370_KEEP=1           keep every run folder, and each arm's raw input beside the report
 *   P370_REPORT=<file>    the report (default <harness dir>/report/probe-p370.json, outside the checkout)
 *   P370_HEAD_CHECKOUT=<built checkout>  DEVELOPMENT: launch it as HEAD; the run never exits 0
 *   P370_HEAD_ONLY=1      DEVELOPMENT: no parent; what compares with it reads UNREADABLE
 *   P370_PARENT_ONLY=1    DEVELOPMENT: the parent's half alone; the run never exits 0
 *   P370_FUSE_AT=<n>      DEVELOPMENT: a LOWER fuse, which is how the fused path is driven with few children; never exits 0
 *   node build/p370/probe-p370.mjs --grader-self-test   every reader and grader over build/p370/fixtures/; starts nothing
 *   node build/p370/probe-p370.mjs --preflight          the builds, the stand-in and the helpers; starts nothing
 *   node build/p370/probe-p370.mjs --list-graders       every grader's reads, needs and clauses; starts nothing
 *
 * Run the three flags with `node`, never through `npm run`, whose script hands
 * them to harness-socket.mjs.
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or an
 * arm could not be READ, 3 when the machine was short of memory.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { loadavg, userInfo } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The helpers this run USES, imported statically so gate:electron counts this
// probe among build/electron-run.mjs's users. Each only DEFINES functions when
// imported, so the three flags above still start nothing.
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

// ---------------------------------------------------------------------------
// What this run holds the builds against, by value (SPEC §8)
// ---------------------------------------------------------------------------

/** The parent this phase measures against. */
export const PARENT_SNAPSHOT = '3aae4f89';
/** A sentence only a main bundle that carries this phase holds (SPEC §4.2). */
export const PHASE_MARK = 'Git could not say which files are ignored.';
/** M's seven cells. */
export const CELLS = Object.freeze([
  { id: 'n10-real', n: 10, holdMs: 0, mode: 'real' },
  { id: 'n10-1s', n: 10, holdMs: 1_000, mode: 'answer' },
  { id: 'n10-10s', n: 10, holdMs: 10_000, mode: 'answer' },
  { id: 'n100-1s', n: 100, holdMs: 1_000, mode: 'answer' },
  { id: 'n100-10s', n: 100, holdMs: 10_000, mode: 'answer' },
  { id: 'n500-1s', n: 500, holdMs: 1_000, mode: 'answer' },
  { id: 'n500-10s', n: 500, holdMs: 10_000, mode: 'answer' }
]);
export const FUSE_AT = 520;
export const HARD_CAP = 560;
export const WRITE_MS = 200;
export const WRITE_S = 20;
/** A cell's three phases end by these, whatever happened: 90 s in all. */
export const MOUNT_MAX_S = 30;
export const DRAIN_MAX_S = 38;
/** The process table is read at least this often a second, or a count off it says nothing. */
export const MIN_SAMPLES_A_SECOND = 2;
/** And never further apart than this, its first and its last reading included: an average hides a table nobody read for ten seconds. */
export const MAX_GAP_S = 2;
/** How long D's frames are read (25 s of writer and 1.5 s after it), back from the moment its log is read. */
export const FRAMES_S = 26.5;
/** D's readings a build, over its two launches. */
export const D_COUNTS = Object.freeze({ first: 6, newFile: 10, added: 2, removed: 2, again: 2 });
export const LOAD_CEILING = 60;
export const LOAD_WAIT_MIN = 20;
export const MEMORY_FLOOR = 20;
/** D's bounds. */
export const D_SLACK_MS = 200;
export const FLOOR_BOUND_MS = 11_500;
export const MIN_FRAMES = 1_500;
/** Each arm's builds. */
export const ARM_SPECS = Object.freeze({
  M: ['parent', 'head'],
  D: ['parent', 'head'],
  A1: ['head'],
  A2: ['head'],
  A3: ['parent', 'head'],
  A4: ['head'],
  A5: ['parent', 'head'],
  A6: ['head'],
  A7: ['parent', 'head'],
  A8: ['head'],
  A9: ['head'],
  A10: ['head'],
  A11: ['head']
});
export const DEFAULT_ARMS = Object.freeze(Object.keys(ARM_SPECS));
export const CENSUS_WORDS = "is the private server the operator's live";
/** What a probe's own environment carries that no launch may. */
const STRIPPED = /^(?:CLAUDECODE|CLAUDE_|P370_)|^(?:GMUX_CONFIG_ROOT|TERM_SESSION_ID|TERM_PROGRAM|TERM_PROGRAM_VERSION|SSH_AUTH_SOCK|TMUX|TMUX_PANE|GMUX_SESSION_ID|GMUX_MANAGED|SECURITYSESSIONID|GH_TOKEN|GITHUB_TOKEN)$/;

// ---------------------------------------------------------------------------
// THE ONE READER. Every reading taken from raw text comes out of `derive` and
// the pure helpers it calls. The live arms hand it what they read off the disk,
// `ps` and the page; --grader-self-test hands it the recorded raw fixtures.
// ---------------------------------------------------------------------------

/**
 * The stand-in's log: one call a `S` line, closed by the `E` line of the same
 * pid that follows it. A pid the system used twice is two calls. A line that is
 * neither, an `E` with no open call, or a line whose numbers do not read is TORN:
 * a lost start would hide a call, so a log holding one cannot be graded.
 */
export function parseLog(text) {
  const calls = [];
  const open = new Map();
  let torn = 0;
  for (const line of String(text ?? '').split('\n')) {
    if (line === '') continue;
    const f = line.split(' ');
    if (f[0] === 'S' && f.length === 6 && num(Number(f[1])) && num(Number(f[2])) && num(Number(f[3])) && !open.has(f[2])) {
      const c = { sub: f[4], pid: Number(f[2]), ppid: Number(f[3]), cwd: f[5], start: Number(f[1]), end: null, exit: null, how: null, asked: null, killed: false };
      calls.push(c);
      open.set(f[2], c);
    } else if (f[0] === 'S' && f.length === 6 && open.has(f[2])) {
      // A call main ended wrote no E line, and the system gave its pid out again.
      const c = { sub: f[4], pid: Number(f[2]), ppid: Number(f[3]), cwd: f[5], start: Number(f[1]), end: null, exit: null, how: null, asked: null, killed: false };
      open.get(f[2]).before = c.start;
      calls.push(c);
      open.set(f[2], c);
    } else if (f[0] === 'E' && f.length === 6 && open.has(f[2]) && num(Number(f[1])) && num(Number(f[3]))) {
      const c = open.get(f[2]);
      c.end = Number(f[1]);
      c.exit = Number(f[3]);
      c.how = f[4];
      c.asked = Number(f[5]);
      open.delete(f[2]);
    } else torn += 1;
  }
  return { calls, torn };
}

/**
 * A call with no `E` line ended when the process table last showed its pid. One
 * the last reading still showed, one younger than it, and every one when no
 * table was sampled at all, is alive until the end: a call that cannot be shown
 * to have ended is counted alive (a fused cell ends with all of its holds out).
 */
export function closeOpen(calls, samples, until) {
  for (const c of calls) {
    if (c.end !== null) continue;
    c.killed = true;
    const cap = c.before ?? until ?? Infinity;
    if (!Array.isArray(samples) || samples.length === 0) {
      c.end = cap;
      continue;
    }
    let last = c.start + 0.001;
    let read = -Infinity;
    for (const [t, pids] of samples) {
      if (t > cap) continue;
      read = t;
      if (t >= c.start && pids.includes(c.pid)) last = t;
    }
    // Still there at the last reading, or younger than it: alive until the reading ended.
    c.end = read <= last && cap !== Infinity ? cap : last;
  }
  return calls;
}

/** The most of `calls` alive at once over [from, to), in one repository (each on its own; the largest answers). */
export function mostAlive(calls, from = -Infinity, to = Infinity) {
  const repos = new Map();
  for (const c of calls) {
    const s = Math.max(c.start, from);
    const e = Math.min(c.end ?? to, to);
    if (c.start >= to || (c.end ?? Infinity) <= from || e < s) continue;
    if (!repos.has(c.cwd)) repos.set(c.cwd, []);
    repos.get(c.cwd).push([s, 1], [e, -1]);
  }
  let most = 0;
  for (const events of repos.values()) {
    events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let alive = 0;
    for (const [, d] of events) {
      alive += d;
      if (alive > most) most = alive;
    }
  }
  return most;
}

/**
 * The same from the process table: each sample's stand-in pids, put in their
 * repository by the log's own start line. A pid the log has not named yet (a
 * child so young it has not written) counts in EVERY repository of its sample.
 */
export function mostInTable(samples, calls, from = -Infinity, to = Infinity) {
  const byPid = new Map();
  for (const c of calls) {
    if (!byPid.has(c.pid)) byPid.set(c.pid, []);
    byPid.get(c.pid).push(c);
  }
  let most = 0;
  for (const [t, pids] of samples ?? []) {
    if (t < from || t >= to) continue;
    const per = new Map();
    let unknown = 0;
    for (const pid of pids) {
      const c = (byPid.get(pid) ?? []).filter((x) => x.start <= t + 0.5).pop();
      if (c === undefined) unknown += 1;
      else per.set(c.cwd, (per.get(c.cwd) ?? 0) + 1);
    }
    most = Math.max(most, unknown, ...[...per.values()].map((n) => n + unknown));
  }
  return most;
}

const median = (xs) => {
  const v = xs.filter(num).sort((a, b) => a - b);
  if (v.length === 0) return null;
  return v.length % 2 === 1 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};
const cut = (xs) => (xs.length === 0 ? null : { least: Math.min(...xs), median: median(xs), most: Math.max(...xs), inAll: xs.reduce((a, b) => a + b, 0) });
const inCallAt = (ci, t, repo) => num(t) && ci.some((c) => c.start <= t && c.end > t && (repo === undefined || c.cwd === repo));
/** The rows the fixture's own rules ignore, of the rows drawn. */
export const ignoredByTheFixture = (path) => /\.log$/.test(path) || path === 'ignored/' || path.startsWith('ignored/');
/** `null` (it never came) as -1, so "never" is a reading and an absent one is not. */
const ms = (x) => (x === null ? -1 : x);
/** True when `x` came, and came by `bound`. */
const by = (x, bound) => num(x) && x >= 0 && x <= bound;

/** What every arm reads off its raw input: the calls, the two counts, the app's own git, the sampling. */
function common(raw) {
  const { calls, torn } = parseLog(raw.log);
  const samples = raw.samples;
  closeOpen(calls, samples, raw.until);
  const ci = calls.filter((c) => c.sub === 'check-ignore');
  const span = Array.isArray(samples) && samples.length > 1 ? samples[samples.length - 1][0] - samples[0][0] : null;
  // Read from the first call or the first mark, whichever came first, to the moment the log was read.
  const began = Math.min(...[...Object.values(raw.marks ?? {}), ...ci.map((c) => c.start)].filter(num));
  const edges = span === null || !num(raw.until) ? null : [...(num(began) ? [began] : []), ...samples.map(([t]) => t), raw.until].sort((a, b) => a - b);
  return {
    calls,
    ci,
    samples,
    base: {
      app: { standIn: calls.some((c) => c.ppid === raw.appPid) },
      log: { torn },
      samples: { rate: span === null || span <= 0 ? undefined : Math.round((samples.length / span) * 100) / 100, gap: edges === null ? undefined : Math.round(Math.max(...edges.slice(1).map((t, i) => t - edges[i])) * 100) / 100, saw: (samples ?? []).some(([, pids]) => pids.length > 0) },
      alive: { log: mostAlive(ci), table: Array.isArray(samples) ? mostInTable(samples, ci) : undefined },
      started: ci.length
    }
  };
}

function phaseOf(x, from, to) {
  const started = x.ci.filter((c) => c.start >= from && c.start < to);
  const asked = started.map((c) => c.asked).filter((n) => num(n) && n > 0);
  const log = mostAlive(x.ci, from, to);
  const table = Array.isArray(x.samples) ? mostInTable(x.samples, x.ci, from, to) : 0;
  return {
    seconds: Math.round((to - from) * 10) / 10,
    started: started.length,
    perMinute: Math.round((started.length / Math.max(0.001, to - from)) * 60),
    alive: Math.max(log, table),
    aliveLog: log,
    aliveTable: table,
    asked: cut(asked),
    lastedMs: cut(started.filter((c) => !c.killed).map((c) => Math.round((c.end - c.start) * 1000))),
    ended: started.filter((c) => c.killed).length
  };
}

function deriveM(raw) {
  const x = common(raw);
  const m = raw.marks;
  const r = { ...x.base, cell: { n: raw.n, holdMs: raw.holdMs } };
  r.mount = { ...phaseOf(x, m.show, m.mountEnd), rows: raw.mountRows };
  r.writer = { ...phaseOf(x, m.writer, m.writerEnd), changes: raw.changes, files: raw.written };
  r.fuse = { blown: num(raw.fusedAt), atMount: num(raw.fusedAt) && raw.fusedAt <= m.mountEnd, afterMs: num(raw.fusedAt) ? Math.round((raw.fusedAt - m.writer) * 1000) : -1 };
  let until = m.writerEnd;
  if (num(m.drainEnd)) {
    until = m.drainEnd;
    const ignored = (raw.rows ?? []).filter((row) => ignoredByTheFixture(row.path));
    r.drain = { ...phaseOf(x, m.writerEnd, m.drainEnd), quiet: raw.drainQuiet === true, ignoredDrawn: ignored.length, undimmed: ignored.filter((row) => row.status !== 'ignored').map((row) => row.path) };
  }
  const startedIn = x.ci.filter((c) => c.start >= m.show && c.start < until);
  r.total = { started: startedIn.length, seconds: Math.round((until - m.show) * 10) / 10 };
  // A held cell starts at most one call a hold, plus 2 (SPEC §8.2), over the whole cell.
  // And every one that ended was held its whole hold: a cell whose hold was never applied is not a held cell.
  r.hold = { allowed: raw.holdMs > 0 ? Math.floor(((until - m.show) * 1000) / raw.holdMs) + 2 : -1, short: raw.holdMs > 0 ? startedIn.filter((c) => !c.killed && (c.how !== 'held' || (c.end - c.start) * 1000 < raw.holdMs - 20)).length : 0 };
  if (raw.thread !== undefined && raw.thread !== null) r.thread = raw.thread;
  return r;
}

function deriveD(raw) {
  const per = raw.launches.map((l) => ({ l, x: common(l) }));
  const first = raw.launches.flatMap((l) => l.mounts.map((m) => (num(m.rowAt) && num(m.dimAt) ? m.dimAt - m.rowAt : null)));
  const files = raw.launches.flatMap((l) => l.newFiles);
  const pick = (k) => raw.launches.map((l) => l.rule?.[k]);
  // `n` came, `missing` was watched and never came. One that was not read at all is in neither, so the two must add up to D_COUNTS.
  const read = (xs) => ({ n: xs.filter(num).length, missing: xs.filter((v) => v === null).length, median: median(xs) ?? -1, each: xs });
  const frames = raw.launches.map((l) => l.frames);
  const r = {
    launches: raw.launches.length,
    app: { standIn: per.length > 0 && per.every((p) => p.x.base.app.standIn) },
    log: { torn: per.reduce((n, p) => n + p.x.base.log.torn, 0) },
    alive: { log: Math.max(0, ...per.map((p) => p.x.base.alive.log)), table: per.every((p) => num(p.x.base.alive.table)) ? Math.max(0, ...per.map((p) => p.x.base.alive.table)) : undefined },
    samples: { rate: per.every((p) => num(p.x.base.samples.rate)) ? Math.min(...per.map((p) => p.x.base.samples.rate)) : undefined, gap: per.every((p) => num(p.x.base.samples.gap)) ? Math.max(...per.map((p) => p.x.base.samples.gap)) : undefined },
    started: per.length === 0 ? 0 : Math.min(...per.map((p) => p.x.base.started)),
    first: read(first),
    newFile: read(files),
    added: read(pick('added')),
    removed: read(pick('removed')),
    again: read(pick('again'))
  };
  if (frames.every((f) => f !== null && f !== undefined)) r.frames = { painted: Math.min(...frames.map((f) => f.complete)), bad: frames.reduce((n, f) => n + f.bad, 0), runs: frames.reduce((n, f) => n + f.runs, 0), calls: Math.min(...per.map((p) => p.x.ci.filter((c) => c.start >= p.l.until - FRAMES_S).length)) };
  return r;
}

/** Every attack arm's reading: the common one, and the arm's own facts off its marks, its watches and its frames. */
function deriveA(raw) {
  const x = common(raw);
  const r = { ...x.base };
  const m = raw.marks ?? {};
  const w = raw.watch ?? {};
  const since = (at, from) => (num(at) && num(from) ? Math.round(at - from * 1000) : at === null ? null : undefined);
  const startsIn = (from, to) => x.ci.filter((c) => c.start >= from && c.start < to).length;
  const f = raw.frames;
  if (raw.arm === 'A1') {
    r.edit = { inCall: inCallAt(x.ci, m.edit, raw.repo) };
    r.dim = { ms: ms(since(w.rule, m.edit)) };
  } else if (raw.arm === 'A2') {
    r.added = { ms: ms(since(w.added, m.add)), beforeTheRemoval: num(w.added) && w.added <= m.remove * 1000 };
    r.undim = { ms: ms(since(w.removed, m.remove)) };
    const again = x.ci.find((c) => c.start > m.remove);
    r.recheck = { ms: again === undefined ? -1 : Math.round((again.start - m.remove) * 1000) };
  } else if (raw.arm === 'A3') {
    r.out = { atSwitch: inCallAt(x.ci, m.toB, raw.repo), atReturn: inCallAt(x.ci, m.toA, raw.repo) };
    r.b = { dimMs: ms(since(w.b, m.toB)), frames: raw.bFrames?.frames, dimmedFromA: raw.bFrames?.badNot };
    r.a = { rootMs: ms(since(w.root, m.toA)), allMs: ms(since(raw.allDimmedAt, m.toA)) };
  } else if (raw.arm === 'A4') {
    r.out = { atSwitch: inCallAt(x.ci, m.toPlain, raw.repo) };
    r.plain = { frames: raw.plainFrames?.frames, dimmed: raw.plainFrames?.badNot, rowsDimmed: raw.plainDimmed };
    r.a = { allMs: ms(since(raw.allDimmedAt, m.toA)) };
  } else if (raw.arm === 'A5') {
    const inMinute = x.ci.filter((c) => c.start >= m.writer && c.start < m.writerEnd);
    r.minute = { calls: inMinute.length, failed: inMinute.filter((c) => c.exit === 3).length, seconds: Math.round(m.writerEnd - m.writer), changes: raw.changes };
    r.quiet = { calls: startsIn(m.writerEnd, m.quietEnd), seconds: Math.round(m.quietEnd - m.writerEnd) };
    if (f) r.frames = { painted: f.complete, bad: f.bad };
  } else if (raw.arm === 'A6') {
    const mine = x.ci.filter((c) => c.start >= m.removed);
    const one = mine[0];
    r.hang = { calls: mine.length, first: one === undefined ? -1 : Math.round((one.end - one.start) * 1000), answered: mine.some((c) => !c.killed && c.end < m.end), held: mine.every((c) => c.how === null || c.how === 'held'), seconds: Math.round(m.end - m.start) };
    if (f) r.frames = { painted: f.complete, bad: f.bad };
  } else if (raw.arm === 'A7') {
    const asked = x.ci.map((c) => c.asked);
    const full = asked.indexOf(20_000);
    r.opened = { ok: raw.opened === true, ms: ms(raw.openedMs ?? null) };
    r.long = { dimMs: ms(since(w.long, m.show)) };
    r.chain = { asked, full: full >= 0, rest: full >= 0 && num(asked[full + 1]) ? asked[full + 1] : -1, most: Math.max(0, ...asked.filter(num)) };
  } else if (raw.arm === 'A8') {
    r.out = { atFirst: inCallAt(x.ci, m.one, raw.repo), atSecond: inCallAt(x.ci, m.two, raw.repo) };
    r.one = { ms: ms(since(w.one, m.one)) };
    r.two = { ms: ms(since(w.two, m.two)) };
    r.after = { calls: startsIn(m.one, m.one + 15), seconds: Math.round(m.end - m.one) };
  } else if (raw.arm === 'A9') {
    const before = x.ci.filter((c) => c.start <= m.reload).pop();
    const after = x.ci.find((c) => c.start > m.reload);
    r.out = { atReload: inCallAt(x.ci, m.reload, raw.repo) };
    r.second = { came: after !== undefined, afterTheFirst: before !== undefined && after !== undefined && after.start >= before.end };
    r.dim = { ms: ms(since(w.root, m.reload)) };
  } else if (raw.arm === 'A10') {
    r.out = { atClose: inCallAt(x.ci, m.close, raw.repo), atOpen: inCallAt(x.ci, m.open, raw.repo) };
    r.section = { closed: raw.sectionClosed, opened: raw.sectionOpened };
    r.a = { allMs: ms(since(raw.allDimmedAt, m.open)) };
  } else if (raw.arm === 'A11') {
    r.asked = { calls: raw.answers?.calls, answered: raw.answers?.answered, superseded: raw.answers?.superseded, otherWords: raw.answers?.otherWords };
    r.burst = { started: startsIn(m.ask, m.end) };
  }
  return r;
}

/** THE ONE READER. A field the raw input does not carry is left out, never invented. */
export function derive(raw) {
  if (raw.arm === 'M') return deriveM(raw);
  if (raw.arm === 'D') return deriveD(raw);
  return deriveA(raw);
}

// ---------------------------------------------------------------------------
// The graders (pure, over a reading): used live and in --grader-self-test
// ---------------------------------------------------------------------------

const N_STANDIN = ['a git call whose parent is the app reached the stand-in', (r) => r.app.standIn === true];
const N_TORN = ['every line of the stand-in’s log was read whole', (r) => r.log.torn === 0];
const N_RATE = [`the process table was read at least ${String(MIN_SAMPLES_A_SECOND)} times a second`, (r) => r.samples.rate >= MIN_SAMPLES_A_SECOND];
const N_GAP = [`the process table was never left unread for more than ${String(MAX_GAP_S)} s`, (r) => r.samples.gap <= MAX_GAP_S];
const N_SAW = ['the process table saw a held stand-in at least once', (r) => r.samples.saw === true];
const N_ASKED = ['the app asked at least once', (r) => r.started >= 1];
const C_LOG = ['at most one check-ignore child alive at once a repository, by the stand-in’s log', (r) => r.alive.log <= 1];
const C_TABLE = ['at most one check-ignore child alive at once a repository, by the process table', (r) => r.alive.table <= 1];
const N_COUNTS = ['every latency was watched as often as D watches it (came or never came)', (r) => Object.entries(D_COUNTS).every(([k, n]) => r[k].n + r[k].missing === n)];
const N_FRAME_CALLS = ['git was asked at least twice in each launch while the frames were read', (r) => r.frames.calls >= 2];
const C_FUSE = ['the fuse was never blown', (r) => r.fuse.blown === false];
/**
 * A COUNT ONCE READ IS NOT UNREAD BY WHAT CAME AFTER IT. A HEAD that piles up
 * blows the fuse, its launch ends, and its drain is never read: that is the
 * failure this probe exists to see, not an arm that could not be read. Each of
 * these fails its arm whatever else is missing, when its own field was read and
 * the needs the count itself rests on (RESTS_ON) hold.
 */
const DECISIVE = new Map([[C_LOG, 'alive.log'], [C_TABLE, 'alive.table'], [C_FUSE, 'fuse.blown']]);
const RESTS_ON = [N_STANDIN, N_TORN, N_RATE, N_GAP];
const A_READS = ['app.standIn', 'log.torn', 'samples.rate', 'samples.gap', 'alive.log', 'alive.table', 'started'];
const A_NEEDS = [N_STANDIN, N_TORN, N_RATE, N_GAP, N_ASKED];
const A_CLAUSES = [C_LOG, C_TABLE];
const A_PARENT = { reads: ['app.standIn', 'log.torn', 'alive.log', 'started'], needs: [N_STANDIN, N_TORN, N_ASKED] };
const dimmedBy = (name, get, bound) => [`${name} within ${String(bound)} ms`, (r) => by(get(r), bound)];
const parentWas = (what) => [`the parent’s ${what} was read first and passed`, (r) => r.parent.verdict === 'pass'];

export const GRADERS = {
  'M-parent': {
    title: 'the parent starts one call a folder: the pile-up at the mount with no writer, and more under one',
    reads: ['app.standIn', 'log.torn', 'cell.n', 'cell.holdMs', 'mount.aliveLog', 'mount.rows', 'writer.aliveLog', 'writer.changes', 'fuse.blown', 'fuse.atMount', 'total.started'],
    needs: [N_STANDIN, N_TORN, ['the tree drew a row at the mount, or the fuse blew there', (r) => r.mount.rows >= 1 || r.fuse.atMount === true], ['main sent a repository change under the writer, or the fuse blew first', (r) => r.writer.changes >= 1 || r.fuse.blown === true]],
    clauses: [
      // Real git answers in 12 to 35 ms, so how many overlap there is the scheduler’s (8 and 11 measured at the mount, 13 under the
      // writer): with no hold more than one is what is held, at the mount and under the writer alike.
      // By this cell's own log alone: the process table also holds what the cell before it left running, which is nobody's pile-up here.
      // A blown fuse is no pass by itself either: the fuse counts marker files, and the log says how many were alive.
      ['at least N children alive at once at the mount (more than one with real git at its own speed)', (r) => (r.cell.holdMs === 0 ? r.mount.aliveLog > 1 : r.mount.aliveLog >= r.cell.n)],
      ['under the writer more alive at once than at the mount, or the fuse at the mount (more than one with real git at its own speed)', (r) => r.fuse.atMount === true || (r.cell.holdMs === 0 ? r.writer.aliveLog > 1 : r.writer.aliveLog > r.mount.aliveLog)]
    ]
  },
  'M-head': {
    title: 'HEAD, the same: one call at a time, and the rows dimmed at the end',
    reads: ['app.standIn', 'log.torn', 'samples.rate', 'samples.gap', 'samples.saw', 'cell.holdMs', 'mount.rows', 'mount.started', 'writer.started', 'writer.changes', 'writer.seconds', 'alive.log', 'alive.table', 'fuse.blown', 'total.started', 'hold.allowed', 'hold.short', 'drain.quiet', 'drain.ignoredDrawn', 'drain.undimmed', 'parent.verdict', 'parent.started'],
    needs: [
      N_STANDIN,
      N_TORN,
      N_RATE,
      N_GAP,
      ['the process table saw a stand-in, in a held cell', (r) => r.cell.holdMs === 0 || r.samples.saw === true],
      ['every call of a held cell was held its whole hold', (r) => r.hold.short === 0],
      ['the tree drew a row at the mount', (r) => r.mount.rows >= 1],
      ['the mount and the writer each started a call', (r) => r.mount.started >= 1 && r.writer.started >= 1],
      ['main sent at least one repository change a second under the writer', (r) => r.writer.changes >= WRITE_S],
      ['the writer wrote for its whole 20 s', (r) => r.writer.seconds >= WRITE_S - 0.5],
      ['an ignored row was drawn at the drain', (r) => r.drain.ignoredDrawn >= 1],
      parentWas('same cell')
    ],
    clauses: [
      C_LOG,
      C_TABLE,
      C_FUSE,
      // Two floors and two holds fit inside DRAIN_MAX_S, so a drain that is not quiet by then is a store still asking.
      ['the drain went quiet', (r) => r.drain.quiet === true],
      ['no more calls started than at the parent in the same cell', (r) => r.total.started <= r.parent.started],
      ['a held cell started at most one call a hold, plus 2', (r) => r.hold.allowed < 0 || r.total.started <= r.hold.allowed],
      ['every ignored row drawn is dimmed at the drain', (r) => r.drain.undimmed.length === 0]
    ]
  },
  'D-parent': {
    title: 'the parent’s dimming on a quiet tree with real git, printed',
    reads: ['app.standIn', 'log.torn', 'launches', 'first.n', 'newFile.n', 'added.n', 'removed.n', 'again.n', 'again.median', 'again.missing', 'started', 'frames.painted', 'frames.bad', 'frames.calls'],
    needs: [N_STANDIN, N_TORN, N_ASKED, ['both launches were read', (r) => r.launches === 2], N_COUNTS, ['every latency came at least twice', (r) => r.first.n >= 2 && r.newFile.n >= 2 && r.added.n >= 2 && r.removed.n >= 2], N_FRAME_CALLS, [`at least ${String(MIN_FRAMES)} frames painted with every must-dim row drawn, in each launch`, (r) => r.frames.painted >= MIN_FRAMES]],
    clauses: [[`a rule added inside the floor shows within ${String(FLOOR_BOUND_MS)} ms`, (r) => r.again.missing === 0 && Math.max(...r.again.each) <= FLOOR_BOUND_MS], ['no frame drew a must-dim row undimmed', (r) => r.frames.bad === 0]]
  },
  'D-head': {
    title: 'HEAD’s dimming on a quiet tree with real git: no later than the parent’s, and never blank',
    reads: ['app.standIn', 'log.torn', 'samples.rate', 'samples.gap', 'alive.log', 'alive.table', 'started', 'launches', 'first.n', 'first.median', 'first.missing', 'newFile.n', 'newFile.median', 'newFile.missing', 'added.n', 'added.median', 'added.missing', 'removed.n', 'removed.median', 'removed.missing', 'again.n', 'again.median', 'again.missing', 'frames.painted', 'frames.bad', 'frames.calls', 'parent.verdict', 'parent.first', 'parent.newFile', 'parent.added', 'parent.removed'],
    needs: [N_STANDIN, N_TORN, N_RATE, N_GAP, N_ASKED, ['both launches were read', (r) => r.launches === 2], N_COUNTS, N_FRAME_CALLS, [`at least ${String(MIN_FRAMES)} frames painted with every must-dim row drawn, in each launch`, (r) => r.frames.painted >= MIN_FRAMES], parentWas('D')],
    clauses: [
      C_LOG,
      C_TABLE,
      ['every latency came', (r) => r.first.missing + r.newFile.missing + r.added.missing + r.removed.missing + r.again.missing === 0],
      [`the first dimmed row within ${String(D_SLACK_MS)} ms of the parent’s median`, (r) => r.first.median <= r.parent.first + D_SLACK_MS],
      [`a new ignored file within ${String(D_SLACK_MS)} ms of the parent’s median`, (r) => r.newFile.median <= r.parent.newFile + D_SLACK_MS],
      [`a rule added on a quiet tree within ${String(D_SLACK_MS)} ms of the parent’s median`, (r) => r.added.median <= r.parent.added + D_SLACK_MS],
      [`a rule taken away within ${String(D_SLACK_MS)} ms of the parent’s median`, (r) => r.removed.median <= r.parent.removed + D_SLACK_MS],
      [`a rule added inside the floor shows within ${String(FLOOR_BOUND_MS)} ms`, (r) => r.again.missing > 0 || Math.max(...r.again.each) <= FLOOR_BOUND_MS],
      ['no frame drew a must-dim row undimmed', (r) => r.frames.bad === 0]
    ]
  },
  'A1-head': {
    title: 'a rule added while a held call runs',
    reads: [...A_READS, 'samples.saw', 'edit.inCall', 'dim.ms'],
    needs: [...A_NEEDS, N_SAW, ['the rule was added while the mount’s call was out', (r) => r.edit.inCall === true]],
    clauses: [...A_CLAUSES, dimmedBy('the rule’s row dims', (r) => r.dim.ms, 8_000)]
  },
  'A2-head': {
    title: 'a second edit inside the ten second floor',
    reads: [...A_READS, 'added.beforeTheRemoval', 'undim.ms', 'recheck.ms'],
    needs: [...A_NEEDS, ['the rule’s row was dimmed before the rule was taken away', (r) => r.added.beforeTheRemoval === true]],
    // The row itself undims on `git status` alone (it lists the file untracked), so the floor's trailing revalidation is read in the log.
    clauses: [...A_CLAUSES, dimmedBy('the row undims', (r) => r.undim.ms, FLOOR_BOUND_MS), dimmedBy('git is asked again', (r) => r.recheck.ms, FLOOR_BOUND_MS)]
  },
  'A3-parent': {
    title: 'a project switch and back mid-call at the parent, printed',
    ...A_PARENT,
    reads: [...A_PARENT.reads, 'out.atSwitch', 'out.atReturn', 'b.dimMs', 'a.rootMs'],
    needs: [...A_PARENT.needs, ['a call of A’s was out at the switch and at the return', (r) => r.out.atSwitch === true && r.out.atReturn === true]],
    clauses: []
  },
  'A3-head': {
    title: 'a project switch and back mid-call: the new project is never made to wait',
    reads: [...A_READS, 'samples.saw', 'out.atSwitch', 'out.atReturn', 'b.dimMs', 'b.frames', 'b.dimmedFromA', 'a.rootMs', 'a.allMs'],
    needs: [...A_NEEDS, N_SAW, ['a call of A’s was out at the switch and at the return', (r) => r.out.atSwitch === true && r.out.atReturn === true], ['B was painted at least 10 times', (r) => r.b.frames >= 10]],
    clauses: [...A_CLAUSES, dimmedBy('B’s row dims', (r) => r.b.dimMs, 1_500), dimmedBy('A’s root.log dims', (r) => r.a.rootMs, 22_000), dimmedBy('every ignored row of A drawn dims', (r) => r.a.allMs, 32_000), ['no row of B was ever dimmed from A', (r) => r.b.dimmedFromA === 0]]
  },
  'A4-head': {
    title: 'a folder that is not a repository, mid-call',
    reads: [...A_READS, 'samples.saw', 'out.atSwitch', 'plain.frames', 'plain.dimmed', 'plain.rowsDimmed', 'a.allMs'],
    needs: [...A_NEEDS, N_SAW, ['a call of A’s was out at the switch', (r) => r.out.atSwitch === true], ['the plain folder was painted at least 10 times', (r) => r.plain.frames >= 10]],
    clauses: [...A_CLAUSES, ['nothing is dimmed in the plain folder', (r) => r.plain.dimmed === 0 && r.plain.rowsDimmed === 0], dimmedBy('A’s ignored rows dim after the return', (r) => r.a.allMs, 17_000)]
  },
  'A5-parent': {
    title: 'a git that fails every time at the parent, printed',
    ...A_PARENT,
    reads: [...A_PARENT.reads, 'minute.calls', 'minute.failed', 'minute.changes'],
    needs: [...A_PARENT.needs, ['git was seen to fail, and main sent changes', (r) => r.minute.failed >= 1 && r.minute.changes >= 30]],
    clauses: []
  },
  'A5-head': {
    title: 'a git that fails every time: about one call a second, and the rows stay',
    reads: [...A_READS, 'minute.calls', 'minute.failed', 'minute.seconds', 'minute.changes', 'quiet.calls', 'quiet.seconds', 'frames.painted', 'frames.bad'],
    needs: [...A_NEEDS, ['git was seen to fail, and main sent changes for the minute', (r) => r.minute.failed >= 1 && r.minute.changes >= 30 && r.minute.seconds >= 59], ['the quiet half minute was read whole', (r) => r.quiet.seconds >= 29], ['at least 1500 frames painted with every must-dim row drawn', (r) => r.frames.painted >= MIN_FRAMES]],
    clauses: [...A_CLAUSES, ['at most 70 calls in the minute', (r) => r.minute.calls <= 70], ['at least 30 calls in the minute: a failure never stops the asking', (r) => r.minute.calls >= 30], ['at most 2 calls in the quiet half minute after', (r) => r.quiet.calls <= 2], ['no frame drew a dimmed row undimmed', (r) => r.frames.bad === 0]]
  },
  'A6-head': {
    title: 'a git that never returns: main ends it at 30 s and the set on screen stays',
    reads: [...A_READS, 'samples.saw', 'hang.calls', 'hang.first', 'hang.answered', 'hang.held', 'hang.seconds', 'frames.painted', 'frames.bad'],
    needs: [...A_NEEDS, N_SAW, ['a held call was out after the rule was taken away', (r) => r.hang.calls >= 1 && r.hang.held === true], ['the hang was watched for 75 s', (r) => r.hang.seconds >= 74], ['at least 1500 frames painted with every must-dim row drawn', (r) => r.frames.painted >= MIN_FRAMES]],
    clauses: [...A_CLAUSES, ['main ended the first hung call at 30 s, gone from the process table within 2 s', (r) => r.hang.first >= 28_000 && r.hang.first <= 32_000], ['no call that hung was let to answer', (r) => r.hang.answered === false], ['at most 3 calls in the 75 s', (r) => r.hang.calls <= 3], ['the set on screen did not change while git hung', (r) => r.frames.bad === 0]]
  },
  'A7-parent': {
    // Measured by the builder at 3aae4f89: calls of 7, 8, 9 and 20,000, and nothing after, so the long-named row NEVER dims there
    // (the parent asks only from a sync, and a quiet tree sends none). SPEC §8.2 expected it to; it is printed, not held.
    title: 'more than 20,000 paths at the parent, printed',
    ...A_PARENT,
    reads: [...A_PARENT.reads, 'opened.ok', 'long.dimMs', 'chain.most'],
    needs: [...A_PARENT.needs],
    stated: ['this tree did not open in the harness within 60 s, so the claim rests on F11', (r) => r.opened.ok !== true],
    clauses: []
  },
  'A7-head': {
    title: 'more than 20,000 paths: a chain of calls, one at a time',
    reads: [...A_READS, 'opened.ok', 'long.dimMs', 'chain.full', 'chain.rest', 'chain.most'],
    needs: [...A_NEEDS],
    // Not where the parent opened it: a tree that opens there and not here is worse, not unopenable.
    stated: ['this tree did not open in the harness within 60 s, so the claim rests on F11', (r) => r.opened.ok !== true && r.parent?.opened !== true],
    clauses: [...A_CLAUSES, ['the tree opened, as it did at the parent', (r) => r.opened.ok === true], ['a call of 20,000 paths, none of more, and then the rest', (r) => r.chain.full === true && r.chain.most === 20_000 && r.chain.rest >= 1 && r.chain.rest < 20_000], ['the long-named row dims', (r) => r.long.dimMs >= 0], ['at most 4 calls', (r) => r.started <= 4]]
  },
  'A8-head': {
    title: 'two changes inside one call',
    reads: [...A_READS, 'samples.saw', 'out.atFirst', 'out.atSecond', 'one.ms', 'two.ms', 'after.calls', 'after.seconds'],
    needs: [...A_NEEDS, N_SAW, ['both files were written while a call was out', (r) => r.out.atFirst === true && r.out.atSecond === true], ['the 15 s after the first write were read whole', (r) => r.after.seconds >= 15]],
    clauses: [...A_CLAUSES, dimmedBy('the first file dims', (r) => r.one.ms, 8_000), dimmedBy('the second file dims', (r) => r.two.ms, 8_000), ['at most 4 calls in the 15 s after the first write', (r) => r.after.calls <= 4]]
  },
  'A9-head': {
    title: 'a window reload mid-call',
    reads: [...A_READS, 'samples.saw', 'out.atReload', 'second.came', 'second.afterTheFirst', 'dim.ms'],
    needs: [...A_NEEDS, N_SAW, ['the mount’s call was out at the reload', (r) => r.out.atReload === true], ['the reloaded window asked', (r) => r.second.came === true]],
    clauses: [...A_CLAUSES, ['the second call started only after the first ended', (r) => r.second.afterTheFirst === true], dimmedBy('root.log dims', (r) => r.dim.ms, 23_000)]
  },
  'A10-head': {
    title: 'the Files section collapsed and opened mid-call',
    reads: [...A_READS, 'samples.saw', 'out.atClose', 'out.atOpen', 'section.closed', 'section.opened', 'a.allMs'],
    needs: [...A_NEEDS, N_SAW, ['a call was out at both presses', (r) => r.out.atClose === true && r.out.atOpen === true], ['the section closed and opened', (r) => r.section.closed === true && r.section.opened === true]],
    clauses: [...A_CLAUSES, dimmedBy('every ignored row drawn dims', (r) => r.a.allMs, 17_000)]
  },
  'A11-head': {
    title: 'the page asks 200 times at once',
    reads: [...A_READS, 'samples.saw', 'asked.calls', 'asked.answered', 'asked.superseded', 'burst.started'],
    needs: [...A_NEEDS, N_SAW, ['the page asked 200 times', (r) => r.asked.calls === 200]],
    clauses: [...A_CLAUSES, ['at most 3 children in all', (r) => r.burst.started <= 3], ['at least 197 rejections naming "superseded"', (r) => r.asked.superseded >= 197], ['the first was answered, and so one at least', (r) => r.asked.answered >= 1]]
  },
  RUN: {
    title: 'the run: the preflights, the hidden agents, the census, every pid ended, his history, no leftover',
    reads: ['preflight.ok', 'launches', 'agentsHeld', 'censusFailures', 'processTableRead', 'otherGits', 'electronsLeft', 'leftovers', 'history'],
    needs: [['the process table was read', (r) => r.processTableRead === true], ['every check-ignore of the app’s own that the process table showed was the stand-in', (r) => r.otherGits.length === 0], ['at least one app was launched', (r) => r.launches >= 1]],
    clauses: [
      ['every preflight held', (r) => r.preflight.ok === true],
      ['every launch’s agents:list resolved nothing', (r) => r.agentsHeld.length === r.launches && r.agentsHeld.every((x) => x === true)],
      ['the census found nothing of the run on his server', (r) => r.censusFailures.length === 0],
      ['no Electron of the run left', (r) => r.electronsLeft === 0],
      ['no process naming a run folder was left to end', (r) => r.leftovers.length === 0],
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

/**
 * One grader's verdict: pass, fail, unreadable, or stated (A7 alone: the tree
 * did not open in the harness, which moves no exit and is printed). An absent
 * field or an unmet need is UNREADABLE and no clause is asked, but for the
 * DECISIVE ones, which fail whatever else was not read.
 */
export function grade(id, reading) {
  const g = GRADERS[id];
  const rests = g.needs.filter((n) => RESTS_ON.includes(n));
  const certain = rests.length === RESTS_ON.length && rests.every(([, predicate]) => holds(predicate, reading)) ? g.clauses.filter((c) => DECISIVE.has(c) && present(reading, DECISIVE.get(c)) && !holds(c[1], reading)).map(([name]) => name) : [];
  if (certain.length === 0 && g.stated !== undefined && present(reading, 'opened.ok') && holds(g.stated[1], reading)) return { verdict: 'stated', ok: null, failed: [], missing: [g.stated[0]] };
  const missing = g.reads.filter((path) => !present(reading, path)).map(missingField);
  if (missing.length === 0) for (const [name, predicate] of g.needs) if (!holds(predicate, reading)) missing.push(name);
  if (missing.length > 0) return certain.length > 0 ? { verdict: 'fail', ok: false, failed: certain, missing } : { verdict: 'unreadable', ok: null, failed: [], missing };
  const failed = g.clauses.filter(([, predicate]) => !holds(predicate, reading)).map(([name]) => name);
  return { verdict: failed.length === 0 ? 'pass' : 'fail', ok: failed.length === 0, failed, missing: [] };
}

/** The parent's reading, linked into HEAD's where HEAD's grader compares with it, with the parent's own verdict. */
export function linkParent(arm, reading, parent) {
  if (arm === 'A7') reading.parent = { opened: parent?.opened?.ok ?? null };
  if (arm === 'M') reading.parent = { verdict: parent === undefined ? null : grade('M-parent', parent).verdict, started: parent?.total?.started ?? null };
  if (arm === 'D') reading.parent = { verdict: parent === undefined ? null : grade('D-parent', parent).verdict, first: parent?.first?.median ?? null, newFile: parent?.newFile?.median ?? null, added: parent?.added?.median ?? null, removed: parent?.removed?.median ?? null };
  return reading;
}

// ---------------------------------------------------------------------------
// --grader-self-test. Starts nothing.
// ---------------------------------------------------------------------------

export const FIXTURES_DIR = join(ROOT, 'build', 'p370', 'fixtures');

function at(obj, path) {
  const keys = String(path).split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) ? Number(k) : k];
  const last = keys[keys.length - 1];
  return { o, k: /^\d+$/.test(last) ? Number(last) : last };
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
 * What breaks one recorded run, its times counted from that run's own first
 * mark or call: a sample hidden, a call put beside the others (`lasts` null: it
 * writes no end line; `seen`: the process table shows it), a log cut, every call
 * made to last so long, a word changed in every line, a field set or taken away.
 */
function editRaw(r, edits) {
  for (const e of edits ?? []) {
    const runs = e.launches === true ? r.launches : [r];
    for (const x of runs) {
      const zero = Math.min(...[...Object.values(x.marks ?? {}), ...String(x.log ?? '').split('\n').map((l) => Number(l.split(' ')[1]))].filter(num));
      if (e.set !== undefined || e.delete !== undefined) applyOps(x, [e]);
      if (e.hideSamples !== undefined) x.samples = x.samples.filter(([t]) => t < zero + e.hideSamples[0] || t > zero + e.hideSamples[1]);
      if (e.cutLogAt !== undefined) x.log = x.log.split('\n').filter((l) => l === '' || Number(l.split(' ')[1]) < zero + e.cutLogAt).join('\n');
      if (e.lasts !== undefined) {
        const starts = new Map();
        x.log = x.log.split('\n').map((l) => {
          const f = l.split(' ');
          if (f[0] === 'S' && f[4] === 'check-ignore') starts.set(f[2], Number(f[1]));
          if (f[0] === 'E' && starts.has(f[2])) f[1] = String(starts.get(f[2]) + e.lasts);
          return f.join(' ');
        }).join('\n');
      }
      if (e.word !== undefined) x.log = x.log.split(` ${e.word[0]} `).join(` ${e.word[1]} `);
      if (e.call !== undefined) {
        const s = zero + e.call.at;
        const end = e.call.lasts === null ? null : s + e.call.lasts;
        const repo = e.call.repo ?? x.repo ?? x.log.split('\n').find((l) => l.startsWith('S ') && l.includes(' check-ignore ')).split(' ')[5];
        x.log += `S ${String(s)} 999999 ${String(x.appPid)} check-ignore ${repo}\n${end === null ? '' : `E ${String(end)} 999999 0 held 3\n`}`;
        if (e.call.seen === true) x.samples = x.samples.map(([t, pids]) => [t, t >= s && t <= (end ?? Infinity) ? [...pids, 999999] : pids]);
      }
    }
  }
  return r;
}
/** One raw fixture's input: its JSON, with each `log` or whole recorded run named by file read from fixtures/raw/, and what breaks it. */
function rawOf(raw) {
  const r = raw.rawFile === undefined ? structuredClone(raw) : { ...JSON.parse(readFileSync(join(FIXTURES_DIR, 'raw', raw.rawFile), 'utf8')) };
  const fill = (o) => {
    if (o && typeof o.logFile === 'string') o.log = readFileSync(join(FIXTURES_DIR, 'raw', o.logFile), 'utf8');
    if (o && Array.isArray(o.logLines)) o.log = `${o.logLines.join('\n')}\n`;
  };
  fill(r);
  for (const l of r.launches ?? []) fill(l);
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
  // 2. The recorded raw input through THE ONE READER: its numbers as the spec step's tables say, and its verdict.
  let values = 0;
  for (const c of fx.raw) {
    let reading;
    try {
      reading = derive(rawOf(c.raw));
      if (c.parent !== undefined) linkParent(c.parentArm ?? c.raw.arm, reading, derive(rawOf(fx.raw.find((x) => x.name === c.parent).raw)));
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
  // 3. The pure helpers: a pid the system used twice, a call main ended, a torn line, a forked child's own instant, two repositories.
  {
    const p = parseLog('S 1 7 1 check-ignore /r\nS 2 8 1 check-ignore /r\nE 3 7 0 held 2\nS 4 7 1 check-ignore /r\nE 5 7 1 held 2\nnot a line\nE 6 99 0 pass 0\n');
    say(p.calls.length === 3 && p.torn === 2, `a log with a pid used twice, one open call and two lines that do not read answers ${String(p.calls.length)} calls and ${String(p.torn)} torn`);
    closeOpen(p.calls, [[2.5, [7, 8]], [2.9, [8]], [4.5, [7]]], 9);
    say(p.calls[1].end === 2.9 && p.calls[1].killed === true, `a call main ended is closed when the process table last showed it (${String(p.calls[1].end)})`);
    say(mostAlive(p.calls) === 2 && mostAlive([{ cwd: '/a', start: 1, end: 3 }, { cwd: '/b', start: 1, end: 3 }]) === 1, 'the most alive is counted a repository');
    say(mostAlive([{ cwd: '/a', start: 1, end: 2 }, { cwd: '/a', start: 2, end: 3 }]) === 1, 'a call that starts as the one before it ends is not two');
    const out = parseLog('S 1 7 1 check-ignore /r\nS 2 8 1 check-ignore /r\nS 3 9 1 check-ignore /r\n').calls;
    closeOpen(out, [[1.5, [7]], [2.5, [8]]], 5);
    say(J(out.map((c) => c.end)) === J([1.5, 5, 5]), `a call the last reading still showed, or one younger than it, is alive until the end (${J(out.map((c) => c.end))})`);
    const unsampled = parseLog('S 1 7 1 check-ignore /r\nS 2 8 1 check-ignore /r\n').calls;
    closeOpen(unsampled, undefined, 9);
    say(mostAlive(unsampled) === 2, 'with no table sampled, a call with no end is counted alive');
    const reused = parseLog('S 1 7 1 check-ignore /r\nS 4 7 1 check-ignore /r\nE 5 7 0 held 1\n');
    closeOpen(reused.calls, undefined, 9);
    say(reused.torn === 0 && reused.calls.length === 2 && reused.calls[0].end === 4 && mostAlive(reused.calls) === 1, 'an ended call whose pid came back ends where the new one starts');
    say(mostInTable([[2, [7, 55]]], [{ pid: 7, cwd: '/a', start: 1 }]) === 2, 'a stand-in the log has not named yet counts beside the one it has');
    const table = standInsIn(['  1   0 /sbin/launchd', ' 50   1 Tortie', ' 60  50 /bin/zsh -f /w/bin/git check-ignore -z --stdin', ' 61  60 /bin/zsh -f /w/bin/git check-ignore -z --stdin', ' 62  50 /bin/zsh -f /w/bin/git -c a=b status', ' 63  50 /usr/bin/git check-ignore -z --stdin'].join('\n'), '/w/bin/git');
    say(J(table) === J([60]), `the process table's stand-ins are ${J(table)}: not real git, not another subcommand, not the child zsh forks for an instant`);
    say(wholeTable('  1     0 /sbin/launchd\n 50   1 Tortie\n') && !wholeTable('') && !wholeTable(' 50   1 Tortie\n') && !wholeTable('  1     0 /sbin/launchd\n 50   1 Tor'), 'a process table without launchd, or cut mid-line, is no table');
    const beside = gitsBeside(['  1   0 /sbin/launchd', ' 60  50 /bin/zsh -f /w/bin/git check-ignore -z --stdin', ' 61  60 /usr/bin/git check-ignore -z --stdin', ' 62  50 /usr/bin/git status', ' 63  50 git check-ignore -z --stdin'].join('\n'), '/w/bin/git', 50);
    say(J(beside) === J(['git check-ignore -z --stdin']), `a check-ignore child of the app's that is not the stand-in is named, and the stand-in's own real git is not (${J(beside)})`);
    const gapOf = (samples, marks) => derive({ arm: 'A4', log: 'S 100 7 1 check-ignore /r\nE 101 7 0 held 1\n', appPid: 1, until: 110, samples, marks }).samples.gap;
    say(gapOf([[101, []], [109, []]], {}) === 8 && gapOf([[106, []], [108, []]], { toA: 99 }) === 7 && gapOf([], {}) === undefined, 'the widest time the process table went unread counts the time before its first reading and after its last');
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
  // 6. The stand-in, read as text: a held call starts nothing, holds before it reads, and never reads his settings.
  const s = readFileSync(join(ROOT, 'build', 'p370', 'stand-in.zsh'), 'utf8').split('\n').filter((l) => !l.startsWith('#')).join('\n');
  say(s.indexOf('zselect -t') > 0 && s.indexOf('zselect -t') < s.indexOf('sysread -i 0'), 'the stand-in holds before it reads its stdin');
  say(/export GIT_CONFIG_GLOBAL=\/dev\/null GIT_CONFIG_NOSYSTEM=1/.test(s), 'the stand-in names no git settings of his');
  say(!/\$\(|`|\bsleep\b/.test(s.replace(/\$\(\(/g, '')), 'the stand-in starts no child for itself (no substitution, no sleep)');
  process.stdout.write(failures === 0 ? `[p370] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses each shown red alone, ${String(needs)} needs each shown unreadable alone, ${String(swept)} fields that answer UNREADABLE when missing, ${String(fx.variants.length)} variants, ${String(fx.raw.length)} raw inputs (${String(values)} values) through the one reader.\n` : `[p370] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

/** Whether a `ps -Ao pid=,ppid=,command=` text is a whole table: it ends on a line end and holds launchd. */
export const wholeTable = (text) => /^\s*1\s+0\s/m.test(text) && text.endsWith('\n');

/** The app's own children asking check-ignore of a git that is not the stand-in. */
export function gitsBeside(psText, bin, appPid) {
  return String(psText).split('\n').map((l) => /^\s*\d+\s+(\d+)\s+(.*)$/.exec(l)).filter((m) => m !== null && Number(m[1]) === appPid && /(?:^|\s)check-ignore(?:\s|$)/.test(m[2]) && !m[2].includes(`${bin} `)).map((m) => m[2]);
}

/** The stand-ins of `bin` holding a check-ignore, in `ps -Ao pid=,ppid=,command=` text: not one whose own parent is a stand-in. */
export function standInsIn(psText, bin) {
  const found = new Map();
  for (const line of String(psText).split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m === null) continue;
    const at = m[3].indexOf(`${bin} `);
    if (at < 0) continue;
    const args = m[3].slice(at + bin.length + 1).split(' ');
    let sub = '';
    for (let i = 0; i < args.length && sub === ''; i += 1) {
      if (['-c', '-C', '--git-dir', '--work-tree', '--namespace', '--exec-path'].includes(args[i])) i += 1;
      else if (!args[i].startsWith('-')) sub = args[i];
    }
    if (sub === 'check-ignore') found.set(Number(m[1]), Number(m[2]));
  }
  return [...found].filter(([, ppid]) => !found.has(ppid)).map(([pid]) => pid);
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
if (process.argv.includes('--list-graders')) {
  process.stdout.write(`${J(Object.fromEntries(Object.entries(GRADERS).map(([id, g]) => [id, { title: g.title, reads: g.reads, needs: g.needs.map(([n]) => n), clauses: g.clauses.map(([n]) => n) }])), null, 1)}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// --preflight: the builds, the stand-in and the helpers. Starts nothing.
// ---------------------------------------------------------------------------

const list = (name) => (process.env[name] ?? '').split(',').map((x) => x.trim()).filter((x) => x !== '');
const PARENT = (process.env['P370_PARENT_CHECKOUT'] ?? '').trim();
const HEAD_OVERRIDE = (process.env['P370_HEAD_CHECKOUT'] ?? '').trim();
const HEAD_ONLY = (process.env['P370_HEAD_ONLY'] ?? '') === '1';
const PARENT_ONLY = (process.env['P370_PARENT_ONLY'] ?? '') === '1';
const FUSE = Math.min(FUSE_AT, Number(process.env['P370_FUSE_AT'] ?? '') > 0 ? Number(process.env['P370_FUSE_AT']) : FUSE_AT);
const DEVELOPMENT = HEAD_OVERRIDE !== '' || HEAD_ONLY || PARENT_ONLY || FUSE !== FUSE_AT;
const HEAD = HEAD_OVERRIDE === '' ? ROOT : resolve(HEAD_OVERRIDE);
const ARMS = list('P370_ARMS').length > 0 ? list('P370_ARMS') : [...DEFAULT_ARMS];
const WANTED = list('P370_CELLS').length > 0 ? list('P370_CELLS') : CELLS.map((c) => c.id);
const KEEP = (process.env['P370_KEEP'] ?? '') === '1';
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
/** Every .js of a build's main folder, joined: rollup may put the service in a chunk. */
function mainText(checkout) {
  const dir = join(checkout, 'out', 'main');
  let text = '';
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name));
      else if (e.name.endsWith('.js')) text += readFileSync(join(d, e.name), 'utf8');
    }
  };
  try {
    walk(dir);
  } catch {
    return '';
  }
  return text;
}

function preflightChecks() {
  const out = [];
  const check = (ok, yes, no) => out.push({ ok, said: ok ? yes : no });
  const strange = ARMS.filter((a) => ARM_SPECS[a] === undefined);
  check(strange.length === 0, `the arms are ${ARMS.join(', ')}`, `P370_ARMS names ${J(strange)}, which are no arms (${DEFAULT_ARMS.join(', ')})`);
  const noCell = WANTED.filter((c) => !CELLS.some((x) => x.id === c));
  check(noCell.length === 0, `M's cells are ${WANTED.join(', ')}`, `P370_CELLS names ${J(noCell)}, which are no cells (${CELLS.map((c) => c.id).join(', ')})`);
  const built = (who, checkout, sources) => {
    const bundle = join(checkout, 'out', 'main', 'index.js');
    check(existsSync(bundle), `${who} is built`, `${bundle} is missing: build ${who} first`);
    check(existsSync(join(checkout, 'out', 'renderer', 'index.html')), `${who}'s window is built`, `${who} has no out/renderer/index.html`);
    if (!existsSync(bundle)) return;
    const old = sources.filter((f) => existsSync(join(checkout, f)) && statSync(join(checkout, f)).mtimeMs > statSync(bundle).mtimeMs);
    check(old.length === 0, `${who}'s out/ is newer than the files this phase moves`, `${who}'s out/ is older than ${J(old)}: build it again, or the run measures a tree that is gone`);
  };
  const SOURCES = ['src/main/git/service.ts', 'src/main/git/ignore-line.ts', 'src/main/git/exec.ts', 'src/renderer/tree/ignored.ts', 'src/renderer/tree/use-tree-model.ts', 'src/renderer/tree/FilesSection.tsx', 'src/renderer/tree/store.ts'];
  if (BUILDS.includes('parent')) {
    if (PARENT === '') check(false, '', `P370_PARENT_CHECKOUT is not set: the parent (${PARENT_SNAPSHOT}, built) runs first`);
    else {
      const p = resolve(PARENT);
      check(p !== ROOT, 'the parent is not this checkout', 'P370_PARENT_CHECKOUT is this checkout');
      const rev = revisionOf(p);
      check(rev !== null, `the parent ${p} is ${String(rev).slice(0, 8)}${String(rev).startsWith(PARENT_SNAPSHOT) ? '' : ` (the phase was measured against ${PARENT_SNAPSHOT})`}`, `the parent ${p} is not a git checkout this reader can read`);
      built('the parent', p, SOURCES);
      const text = mainText(p);
      check(text !== '' && !text.includes(PHASE_MARK), "the parent's main bundle does not carry this phase", "the parent's main bundle is missing or carries this phase, so it is not the parent");
    }
  }
  if (BUILDS.includes('head')) {
    built('HEAD', HEAD, SOURCES);
    if (HEAD_OVERRIDE === '') check(mainText(HEAD).includes(PHASE_MARK), "HEAD's main bundle carries this phase", `HEAD's main bundle does not hold ${J(PHASE_MARK)}: npm run build`);
  }
  check(existsSync(join(ROOT, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')), 'the development Electron is here', 'node_modules/electron/dist/Electron.app is missing');
  for (const f of ['build/electron-run.mjs', 'build/harness-socket.mjs', 'build/hidden-agents.mjs', 'build/cdp-client.mjs', 'build/p370/stand-in.zsh', 'build/p370/fixtures/graders.json']) check(existsSync(join(ROOT, f)), `${f} is here`, `${f} is missing`);
  for (const f of ['/bin/zsh', '/bin/ps', '/usr/bin/git', '/usr/bin/memory_pressure']) check(existsSync(f), `${f} is here`, `${f} is missing`);
  return out;
}

if (process.argv.includes('--preflight')) {
  const checks = preflightChecks();
  for (const c of checks) process.stdout.write(`[p370] ${c.ok ? 'ok     ' : 'REFUSED'} ${c.said}\n`);
  const bad = checks.filter((c) => !c.ok).length;
  process.stdout.write(bad === 0 ? `[p370] preflight PASS: ${String(checks.length)} checks\n` : `[p370] preflight REFUSED: ${String(bad)} of ${String(checks.length)} checks\n`);
  process.exit(bad === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The run: the refusals, the scratch world, the bookkeeping
// ---------------------------------------------------------------------------

const TAG = '[p370]';
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
if (!SOCKET.startsWith('gmux-p370')) refuse(`${J(SOCKET)} is not a gmux-p370 harness socket. Run \`npm run probe:p370\`, which wraps this file in build/harness-socket.mjs.`);
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR. Run `npm run probe:p370`.');
const PREFLIGHT = preflightChecks();
{
  const bad = PREFLIGHT.filter((c) => !c.ok);
  if (bad.length > 0) refuse(bad.map((c) => c.said).join('; '));
}
mkdirSync(join(HARNESS_DIR, 'p370'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p370'));
if (/['"\s\\]/.test(RUN)) refuse(`the scratch path ${J(RUN)} holds a quote, a space or a backslash, which the stand-in's log cannot carry`);
const REPORT = (process.env['P370_REPORT'] ?? '').trim() || join(HARNESS_DIR, 'report', 'probe-p370.json');
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
  else if (g.verdict === 'stated') {
    report.arms.push({ id, ok: null, stated: g.missing });
    say(`STATED ${id}: ${g.missing.join('; ')}`);
  } else {
    report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[grader].title });
    if (!g.ok) failures += 1;
    say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[grader].title}${g.ok ? '' : `; FAILED ${J(g.failed)}${g.missing.length > 0 ? `, and could not read ${J(g.missing)}` : ''}`}`);
  }
}
function keepRaw(id, raw) {
  if (KEEP) writeFileSync(join(dirname(REPORT), `raw-${id}.json`), `${J(raw, null, 1)}\n`, { mode: 0o600 });
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
function swapUsedMb() {
  const m = /used = ([\d.]+)M/.exec(String(spawnSync('/usr/sbin/sysctl', ['-n', 'vm.swapusage'], { encoding: 'utf8', timeout: 10_000 }).stdout ?? ''));
  return m === null ? null : Math.round(Number(m[1]));
}
/** Nothing starts under 20 percent free; his own builds move the number, so it is read for ten minutes. */
async function memoryGate() {
  let free = memoryFree();
  for (let i = 0; i < 10 && free !== null && free < MEMORY_FLOOR; i += 1) {
    say(`memory reads ${String(free)}% free, under ${String(MEMORY_FLOOR)}: starting nothing, reading again in a minute (swap used ${String(swapUsedMb())} MB)`);
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
/** Every check-ignore child of the app's own that the sampler saw and that was not the stand-in: with one, no count here means anything. */
const otherGits = new Set();

const agentsHeld = [];
const censusFailures = [];
const appPids = [];
const leftovers = [];
let launches = 0;

// ---------------------------------------------------------------------------
// One launch: its world, its app, its page
// ---------------------------------------------------------------------------

/** What each page carries: main's changes counted, the thread's own lateness, and the rows read once a painted frame. */
const RECORDER = `(() => {
  if (window.__p370) return true;
  window.__p370 = { changed: 0, blockedMs: 0, longest: 0 };
  window.gmux.git.onChanged(() => { window.__p370.changed += 1; });
  let last = performance.now();
  setInterval(() => {
    const t = performance.now();
    const late = t - last - 10;
    last = t;
    if (late > 4) { window.__p370.blockedMs += late; if (late > window.__p370.longest) window.__p370.longest = late; }
  }, 10);
  const F = (window.__p370f = { marker: null, must: [], mustNot: [], frames: 0, complete: 0, bad: 0, runs: 0, badNot: 0, inBad: false, watch: {}, first: null });
  window.__p370rows = () => {
    const h = document.querySelector('file-tree-container');
    return h && h.shadowRoot ? Array.from(h.shadowRoot.querySelectorAll('[data-item-path]')).map((r) => ({ path: r.getAttribute('data-item-path'), status: r.getAttribute('data-item-git-status') || 'none' })) : [];
  };
  const frame = () => {
    const h = document.querySelector('file-tree-container');
    const s = h && h.shadowRoot ? h.shadowRoot : null;
    const t = Date.now();
    if (s) {
      const statusOf = (p) => { const r = s.querySelector('[data-item-path="' + p + '"]'); return r ? r.getAttribute('data-item-git-status') || 'none' : null; };
      if (F.first && statusOf(F.first.row) !== null) {
        if (F.first.rowAt === null) F.first.rowAt = t;
        if (F.first.dimAt === null && s.querySelector('[data-item-git-status="ignored"]')) F.first.dimAt = t;
      }
      for (const k of Object.keys(F.watch)) {
        const w = F.watch[k];
        if (w.at !== null || (w.marker && statusOf(w.marker) === null)) continue;
        const st = statusOf(w.path);
        if (st !== null && (w.want === 'ignored') === (st === 'ignored')) w.at = t;
      }
      if (F.marker !== null && statusOf(F.marker) !== null) {
        F.frames += 1;
        let bad = false;
        let whole = true;
        for (const p of F.must) { const st = statusOf(p); if (st === null) whole = false; else if (st !== 'ignored') bad = true; }
        if (whole) F.complete += 1;
        if (bad) { F.bad += 1; if (!F.inBad) F.runs += 1; }
        F.inBad = bad;
        for (const p of F.mustNot) if (statusOf(p) === 'ignored') { F.badNot += 1; break; }
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
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

/**
 * One app of `build`, on a world of its own under the run folder. `body(ctx)`
 * is handed the page, the world and the knobs; whatever it does, the helper ends
 * the app, the stand-ins are waited out, and anything left naming the world is
 * ended by pid and COUNTED as a leftover.
 */
async function withApp(label, build, body) {
  const base = join(RUN, label);
  const checkout = checkoutOf(build);
  rmSync(base, { recursive: true, force: true });
  const w = { base, home: join(base, 'h'), profile: join(base, 'p'), bin: join(base, 'bin'), alive: join(base, 'alive'), fuse: join(base, 'fuse'), control: join(base, 'control'), logs: join(base, 'logs') };
  for (const d of [w.home, w.profile, w.bin, w.alive, w.logs]) mkdirSync(d, { recursive: true });
  const git = join(w.bin, 'git');
  copyFileSync(join(ROOT, 'build', 'p370', 'stand-in.zsh'), git);
  chmodSync(git, 0o755);
  const knobs = { LOG: join(w.logs, 'boot.txt'), MODE: 'real', HOLD_MS: 0, HOLD_REPO: '', FAIL: '', COUNT: '', HARD: HARD_CAP };
  const setControl = (over) => {
    Object.assign(knobs, { MODE: 'real', HOLD_MS: 0, HOLD_REPO: '', FAIL: '', COUNT: '' }, over);
    if (!existsSync(knobs.LOG)) writeFileSync(knobs.LOG, '');
    writeFileSync(`${w.control}.new`, `${Object.entries(knobs).map(([a, b]) => `${a}=${String(b)}`).join('\n')}\n`);
    renameSync(`${w.control}.new`, w.control);
  };
  setControl({});
  const closed = `${w.bin}:/usr/bin:/bin:/usr/sbin:/sbin`;
  for (const f of ['.profile', '.zprofile', '.zshenv', '.zshrc', '.bash_profile']) writeFileSync(join(w.home, f), `PATH=${closed}\nexport PATH\n`);
  writeFileSync(join(w.home, '.hushlogin'), '');
  writeHiddenAgents(w.profile, 'p370', hiddenAgentsBesides([]));
  const env = withoutDevRenderer({
    ...Object.fromEntries(Object.keys(process.env).filter((n) => STRIPPED.test(n)).map((n) => [n, undefined])),
    HOME: w.home,
    ZDOTDIR: w.home,
    HISTFILE: '/dev/null',
    SHELL: '/bin/sh',
    PATH: closed,
    GIT_CONFIG_GLOBAL: '/dev/null',
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
  say(`LAUNCH ${label} at the ${build}: load ${J(loads())}, memory ${String(memory)}% free, swap ${String(swapUsedMb())} MB`);
  let cleared = null;
  try {
    await withElectron(
      {
        label: `p370-${label}`,
        userDataDir: w.profile,
        tmuxSocket: SOCKET,
        cwd: checkout,
        program: 'app',
        args: ['--remote-debugging-port=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
        env,
        graceMs: 15_000
      },
      async (handle) => {
        appPids.push(handle.pid);
        const cdp = await appWindow(w.profile);
        try {
          await cdp.call('Runtime.enable');
          await cdp.call('Page.enable');
          await cdp.call('Performance.enable');
          await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
          let scan = null;
          try {
            scan = JSON.parse(await cdpEval(cdp, AGENTS_LIST_EXPR, 90_000));
          } catch {
            scan = null;
          }
          const verdict = standInsOnlyVerdict(scan, { standIns: [] });
          agentsHeld.push(verdict.ok);
          if (!verdict.ok) throw new Refusal(`the app's own scan resolved an agent: ${verdict.said}`);
          await cdpEval(cdp, RECORDER);
          cleared = makeContext({ w, git, cdp, pid: handle.pid, build, setControl, knobs });
          await body(cleared);
        } finally {
          cleared?.stop();
          try {
            writeFileSync(w.fuse, 'the launch is ending\n');
          } catch {
            /* the world is going */
          }
          cdp.close();
        }
      }
    );
  } catch (err) {
    const why = String(err?.message ?? err);
    if (why.includes(CENSUS_WORDS)) censusFailures.push(`${label}: ${why.slice(0, 300)}`);
    throw err;
  } finally {
    cleared?.stop();
    const naming = () => psText().split('\n').filter((l) => l.includes(`${base}/`)).map((l) => Number(l.trim().split(/\s+/)[0]));
    for (let i = 0; i < 225 && naming().length > 0; i += 1) await sleep(200);
    for (const pid of naming()) {
      const command = String(spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
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

/** What an arm is handed: the page, the repositories, the knobs, the sampler and the waits. */
function makeContext({ w, git, cdp, pid, build, setControl, knobs }) {
  const ev = (expr, timeoutMs = 60_000) => cdpEval(cdp, expr, timeoutMs);
  const waitFor = async (get, forMs, every = 50) => {
    const until = Date.now() + forMs;
    for (;;) {
      const v = await get();
      if (v !== null && v !== undefined && v !== false) return v;
      if (Date.now() > until) return null;
      await sleep(every);
    }
  };
  const env = { PATH: '/usr/bin:/bin', HOME: w.home, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const ctx = {
    w,
    cdp,
    pid,
    build,
    ev,
    waitFor,
    setControl,
    timer: null,
    samples: [],
    stop() {
      if (ctx.timer !== null) clearInterval(ctx.timer);
      ctx.timer = null;
    },
    /** Read the process table every `everyMs` from now on, into a list of this arm's own. */
    sample(everyMs = 250) {
      ctx.stop();
      const mine = [];
      ctx.samples = mine;
      ctx.timer = setInterval(() => {
        const t = seconds();
        const text = psText(1);
        if (text === '') return; // a table ps did not answer is no reading, and the gap it leaves is graded
        mine.push([t, standInsIn(text, git)]);
        for (const other of gitsBeside(text, git, pid)) otherGits.add(other.slice(0, 160));
      }, everyMs);
      return mine;
    },
    /** A log of this arm's own, from the next call on. */
    newLog(name, over) {
      knobs.LOG = join(w.logs, `${name}.txt`);
      setControl(over ?? {});
      return knobs.LOG;
    },
    calls: () => parseLog(readFileSync(knobs.LOG, 'utf8')).calls.filter((c) => c.sub === 'check-ignore'),
    allCalls: () => parseLog(readFileSync(knobs.LOG, 'utf8')).calls,
    aliveNow: () => ctx.calls().filter((c) => c.end === null).length,
    /** No stand-in holding a check-ignore in the table, for half a second. */
    async quiet(forMs) {
      let since = null;
      return waitFor(() => {
        const text = psText();
        if (text === '' || standInsIn(text, git).length > 0) since = null;
        else if (since === null) since = Date.now();
        return since !== null && Date.now() - since > 500;
      }, forMs, 150);
    },
    /** End every stand-in this launch still holds, by pid, each read again first. Only once no repository is shown. */
    endHeld() {
      for (const p of standInsIn(psText(), git)) {
        const command = String(spawnSync('/bin/ps', ['-p', String(p), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '');
        if (!command.includes(git)) continue;
        try {
          process.kill(p, 'SIGTERM');
        } catch {
          /* gone */
        }
        rmSync(join(w.alive, String(p)), { force: true });
      }
    },
    /** A scratch repository of `n` folders, its writer's own folder, an ignored one, and one uncommitted change. */
    repo(name, { n = 3, rules = '*.log\nignored/\n', extra } = {}) {
      const dir = join(w.base, name);
      mkdirSync(join(dir, 'ignored'), { recursive: true });
      mkdirSync(join(dir, 'w'));
      writeFileSync(join(dir, '.gitignore'), rules);
      writeFileSync(join(dir, 'README.md'), '# the fixture\n');
      writeFileSync(join(dir, 'root.log'), 'at the root\n');
      writeFileSync(join(dir, 'ignored', 'k.txt'), 'in an ignored folder\n');
      writeFileSync(join(dir, 'w', 'seed.txt'), 'seed\n');
      const dirs = Array.from({ length: n }, (_, i) => `d${String(i + 1).padStart(4, '0')}`);
      for (const d of dirs) {
        mkdirSync(join(dir, d));
        writeFileSync(join(dir, d, 'a.txt'), `${d}\n`);
        writeFileSync(join(dir, d, 'b.log'), `${d}\n`);
      }
      let more = [];
      if (extra !== undefined) more = extra(dir);
      for (const args of [['init', '-q', '-b', 'main'], ['add', '-A'], ['-c', 'user.email=p370@example.invalid', '-c', 'user.name=p370', 'commit', '-q', '-m', 'the fixture']]) {
        const r = spawnSync('/usr/bin/git', args, { cwd: dir, encoding: 'utf8', env, timeout: 120_000 });
        if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed in the fixture: ${String(r.stderr).trim().slice(0, 200)}`);
      }
      appendFileSync(join(dir, 'w', 'seed.txt'), 'a line since the commit\n');
      return { dir, name, expanded: [...more, ...dirs.map((d) => `${d}/`), 'w/'], n };
    },
    /** A folder that is not a repository. */
    plain(name) {
      const dir = join(w.base, name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'plain.txt'), 'plain\n');
      writeFileSync(join(dir, 'root.log'), 'not ignored by anything here\n');
      return { dir, name, expanded: [] };
    },
    /** Show a project in the Explorer, its open folders seeded first as the tree remembers them. Answers when rows are drawn. */
    show: (repo) => ev(`window.__gmuxShotDrive(${J({ projectPath: repo.dir, localStorage: { [`gmux.treeOpen.${repo.dir}`]: J(repo.expanded) }, sidebarView: 'explorer' })}).then(() => Date.now())`, 120_000),
    /** Press an open project's own tab. Answers the page's clock, in seconds. */
    async tab(repo) {
      const t = await ev(`(() => { const b = Array.from(document.querySelectorAll('.ptab, .prail-open')).find((x) => (x.getAttribute('aria-label') || '').split(',')[0] === ${J(repo.name)}); if (!b) return null; const t = Date.now(); b.click(); return t; })()`);
      if (t === null) throw new Error(`no tab named ${repo.name}`);
      return t / 1000;
    },
    seed: (repo) => ev(`(localStorage.setItem(${J(`gmux.treeOpen.${repo.dir}`)}, ${J(J(repo.expanded))}), true)`),
    rows: () => ev('window.__p370rows()'),
    watch: (key, path, want = 'ignored', marker = null) => ev(`(window.__p370f.watch[${J(key)}] = ${J({ path, want, marker, at: null })}, true)`),
    at: (key) => ev(`window.__p370f.watch[${J(key)}] ? window.__p370f.watch[${J(key)}].at : null`),
    waitAt: (key, forMs) => waitFor(() => ctx.at(key), forMs, 30),
    frames: (over) => ev(`(Object.assign(window.__p370f, { frames: 0, complete: 0, bad: 0, runs: 0, badNot: 0, inBad: false, must: [], mustNot: [] }, ${J(over)}), true)`),
    readFrames: () => ev('(({ frames, complete, bad, runs, badNot }) => ({ frames, complete, bad, runs, badNot }))(window.__p370f)'),
    changed: () => ev('window.__p370.changed'),
    /** The moment every ignored row drawn reads dimmed (page clock), or null. */
    allDimmed: (marker, forMs) => waitFor(() => ev(`(() => { const rows = window.__p370rows(); if (!rows.some((r) => r.path === ${J(marker)})) return null; const ig = rows.filter((r) => /\\.log$/.test(r.path) || r.path === 'ignored/'); return ig.length > 0 && ig.every((r) => r.status === 'ignored') ? Date.now() : null; })()`), forMs, 100),
    /** The moment (seconds) of the first check-ignore started in `repo` since `from`, as soon as it starts. */
    callIn: (repo, from, forMs) => waitFor(() => ctx.calls().find((c) => c.cwd === repo.dir && c.start >= from)?.start, forMs, 40),
    /** Wait until the repository shown is settled: dimmed, nothing running, nothing started for `still` ms. */
    async settle(repo, still = 2_500) {
      if ((await ctx.allDimmed('root.log', 30_000)) === null) throw new Error(`${repo.name} never dimmed while git answered at its own speed`);
      const ok = await waitFor(() => {
        const c = ctx.calls();
        return c.every((x) => x.end !== null) && seconds() - Math.max(0, ...c.map((x) => x.start)) > still / 1000;
      }, 40_000, 200);
      if (ok === null) throw new Error(`${repo.name} never went quiet`);
    },
    /** An arm's raw input, its sampler stopped and its log read. */
    raw(arm, over) {
      ctx.stop();
      return { arm, build, log: readFileSync(knobs.LOG, 'utf8'), samples: ctx.samples, appPid: pid, until: seconds(), ...over };
    }
  };
  return ctx;
}

// ---------------------------------------------------------------------------
// M: one cell
// ---------------------------------------------------------------------------

async function metrics(cdp) {
  const r = await cdp.call('Performance.getMetrics');
  const task = (r.result?.metrics ?? []).find((m) => m.name === 'TaskDuration');
  return task === undefined ? null : task.value * 1000;
}

/** One cell in an open app. Answers its raw input; `fusedAt` set means this launch must end now. */
async function matrixCell(ctx, cell, repos, park) {
  const repo = repos.get(cell.n);
  if (ctx.build === 'parent' && (cell.n > 20 || cell.holdMs > 0)) await loadGate(`${cell.id} at the parent`);
  const free = await memoryGate();
  const load = { before: loads(), memory: free, swap: swapUsedMb() };
  ctx.newLog(cell.id, { MODE: cell.mode, HOLD_MS: cell.holdMs });
  const marks = {};
  let fusedAt = null;
  /** The fuse: blow it at the ceiling, and say so to whoever is waiting. */
  const tooMany = () => {
    if (fusedAt !== null || readdirSync(ctx.w.alive).length < FUSE) return fusedAt !== null;
    writeFileSync(ctx.w.fuse, 'blown\n');
    fusedAt = seconds();
    return true;
  };
  ctx.sample();
  marks.show = seconds();
  const driven = ctx.show(repo).catch((err) => String(err?.message ?? err));
  let mine = null;
  // The mount: its burst runs out (nothing alive, nothing started for 2.5 s), and at most MOUNT_MAX_S.
  while (seconds() - marks.show < MOUNT_MAX_S && !tooMany()) {
    await sleep(100);
    if (mine === null && ctx.allCalls().some((c) => c.ppid === ctx.pid)) mine = true;
    if (mine === null && seconds() - marks.show > 20) throw new Refusal(`no git call whose parent is the app (pid ${String(ctx.pid)}) reached the stand-in`);
    const c = ctx.calls();
    if (seconds() - marks.show > 6 && c.length > 0 && c.every((x) => x.end !== null) && seconds() - Math.max(...c.map((x) => x.start)) > 2.5) break;
  }
  await Promise.race([driven, sleep(fusedAt === null ? 20_000 : 0)]);
  const mountRows = fusedAt === null ? (await ctx.rows()).length : -1; // a fused launch is asked nothing more
  marks.mountEnd = seconds();
  // The writer: one new file every 200 ms in the folder the tree has listed.
  marks.writer = seconds();
  const before = fusedAt === null ? { changed: await ctx.changed(), task: await metrics(ctx.cdp), blocked: await ctx.ev('(window.__p370.longest = 0, window.__p370.blockedMs)') } : null;
  marks.writer = seconds();
  let written = 0;
  let next = Date.now();
  // The page's own counters, asked for beside the writer and never waited on: a fused launch ends on the last answer it had.
  let seen = { changed: before?.changed ?? 0, blocked: before?.blocked ?? 0, longest: 0 };
  let asking = false;
  let nextLook = Date.now() + 300;
  while (seconds() - marks.writer < WRITE_S && !tooMany()) {
    if (!asking && Date.now() >= nextLook) {
      asking = true;
      ctx.ev('({ changed: window.__p370.changed, blocked: window.__p370.blockedMs, longest: window.__p370.longest })').then((v) => (seen = v), () => undefined).finally(() => ((asking = false), (nextLook = Date.now() + 300)));
    }
    if (Date.now() >= next) {
      written += 1;
      writeFileSync(join(repo.dir, 'w', `n${String(written).padStart(4, '0')}.${written % 5 === 0 ? 'log' : 'txt'}`), `${String(written)}\n`);
      next += WRITE_MS;
    }
    await sleep(25);
  }
  marks.writerEnd = seconds();
  const raw = { n: cell.n, holdMs: cell.holdMs, marks, fusedAt, written, mountRows, load };
  if (fusedAt === null) seen = await ctx.ev('({ changed: window.__p370.changed, blocked: window.__p370.blockedMs, longest: window.__p370.longest })');
  raw.changes = seen.changed - (before?.changed ?? 0);
  if (before !== null && raw.changes > 0) {
    const task = fusedAt === null ? await metrics(ctx.cdp) : null;
    raw.thread = { blockedMsAChange: Math.round((seen.blocked - before.blocked) / raw.changes), longestMs: Math.round(seen.longest), taskMsAChange: task === null || before.task === null ? null : Math.round((task - before.task) / raw.changes) };
  }
  if (fusedAt !== null) {
    raw.load.after = loads();
    return ctx.raw('M', raw);
  }
  // The drain: what is left once the writer stops, past the floor's own trailing revalidation.
  raw.drainQuiet = false;
  while (seconds() - marks.writerEnd < DRAIN_MAX_S && !tooMany()) {
    await sleep(150);
    const c = ctx.calls();
    if (seconds() - marks.writerEnd > 12 && c.every((x) => x.end !== null) && seconds() - Math.max(0, ...c.map((x) => x.start)) > 2.5) {
      raw.drainQuiet = true;
      break;
    }
  }
  raw.fusedAt = fusedAt;
  raw.rows = fusedAt === null ? await ctx.rows() : [];
  marks.drainEnd = seconds();
  raw.load.after = loads();
  const answer = ctx.raw('M', raw);
  if (fusedAt === null) {
    // Leave the repository, then take the writer's files away with nothing shown to read them.
    ctx.newLog(`${cell.id}-after`, {});
    await ctx.tab(park);
    await ctx.quiet(45_000);
    for (const f of readdirSync(join(repo.dir, 'w'))) if (/^n\d{4}\./.test(f)) rmSync(join(repo.dir, 'w', f));
    await sleep(1_500);
  }
  return answer;
}

async function matrixAt(build, readings) {
  const queue = CELLS.filter((c) => WANTED.includes(c.id));
  let launch = 0;
  while (queue.length > 0) {
    launch += 1;
    const left = queue.length;
    await withApp(`m${build[0]}${String(launch)}`, build, async (ctx) => {
      const repos = new Map([...new Set(queue.map((c) => c.n))].map((n) => [n, ctx.repo(`r${String(n)}`, { n })]));
      const park = ctx.plain('park');
      await ctx.show(park);
      while (queue.length > 0) {
        const cell = queue.shift();
        const id = `M:${cell.id}-${build}`;
        let raw;
        try {
          raw = await matrixCell(ctx, cell, repos, park);
        } catch (err) {
          if (err instanceof Refusal) throw err;
          cannotRead(id, `the cell stopped: ${String(err?.message ?? err).slice(0, 300)}`);
          return; // a page that did not answer is not trusted with the next cell: a new launch
        }
        keepRaw(`M-${cell.id}-${build}`, raw);
        const reading = derive(raw);
        if (build === 'head') linkParent('M', reading, readings.get(cell.id));
        else readings.set(cell.id, reading);
        say(`${id}, load ${J(raw.load)}: mount ${J(reading.mount)}; writer ${J(reading.writer)}; fuse ${J(reading.fuse)}; drain ${J(reading.drain ?? null)}; thread ${J(reading.thread ?? null)}`);
        judgeArm(id, `M-${build}`, reading);
        if (raw.fusedAt !== null) {
          say(`${id}: the fuse blew with ${String(FUSE)} held, so this launch ends here`);
          return;
        }
      }
    });
    if (queue.length === left) throw new Error(`launch ${String(launch)} of M at the ${build} read no cell`);
  }
}

// ---------------------------------------------------------------------------
// D: the no-regression readings, real git, a quiet tree
// ---------------------------------------------------------------------------

const MARK_A = 'd0001/';
/** Rows git ignores that stay drawn whatever a writer adds: the tree draws folders first, and the writer's own folder after these. */
const MUST = Object.freeze(['d0001/b.log', 'd0002/b.log', 'd0003/b.log', 'ignored/']);

async function quietTree(label, build) {
  let answer = null;
  await withApp(label, build, async (ctx) => {
    const load = { before: loads() };
    const park = ctx.plain('park');
    const repo = ctx.repo('quiet');
    await ctx.show(park);
    ctx.newLog('d', {});
    const samples = ctx.sample();
    const mounts = [];
    for (let i = 0; i < 3; i += 1) {
      await ctx.seed(repo);
      await ctx.ev(`(window.__p370f.first = { row: 'd0001/', rowAt: null, dimAt: null }, true)`);
      if (i === 0) await ctx.show(repo);
      else await ctx.tab(repo);
      await ctx.settle(repo);
      mounts.push(await ctx.ev('({ rowAt: window.__p370f.first.rowAt, dimAt: window.__p370f.first.dimAt })'));
      if (i < 2) {
        await ctx.tab(park);
        await sleep(1_500);
      }
    }
    await ctx.ev('(window.__p370f.first = null, true)');
    const newFiles = [];
    for (let i = 1; i <= 5; i += 1) {
      const rel = `w/late${String(i)}.log`;
      await ctx.watch(rel, rel);
      const t = Date.now();
      writeFileSync(join(repo.dir, rel), 'late\n');
      const hit = await ctx.waitAt(rel, 15_000);
      newFiles.push(hit === null ? null : hit - t);
      await sleep(2_500);
    }
    // A rule, on a quiet tree: added, taken away, and added again 2 s after that, inside the floor.
    writeFileSync(join(repo.dir, 'w', 'keep.txt'), 'keep\n');
    // Two floors long: this write's own trailing revalidation can come ten seconds after it, and starts the floor again.
    await sleep(21_000);
    const base = readFileSync(join(repo.dir, '.gitignore'), 'utf8');
    const edit = async (key, want, text) => {
      await ctx.watch(key, 'w/keep.txt', want);
      const t = Date.now();
      writeFileSync(join(repo.dir, '.gitignore'), text);
      const hit = await ctx.waitAt(key, 25_000);
      return hit === null ? null : hit - t;
    };
    const rule = { added: await edit('added', 'ignored', `${base}keep.txt\n`) };
    await sleep(12_000);
    rule.removed = await edit('removed', 'none', base);
    await sleep(2_000);
    rule.again = await edit('again', 'ignored', `${base}keep.txt\n`);
    await sleep(12_000);
    // Phase 47.1's frames, under a writer for 25 s.
    await ctx.frames({ marker: MARK_A, must: MUST });
    const from = Date.now();
    for (let k = 1; Date.now() - from < 25_000; k += 1) {
      writeFileSync(join(repo.dir, 'w', `f${String(k).padStart(4, '0')}.txt`), `${String(k)}\n`);
      await sleep(WRITE_MS);
    }
    await sleep(1_500);
    const frames = await ctx.readFrames();
    load.after = loads();
    answer = { ...ctx.raw('D', { mounts, newFiles, rule, frames, load }), samples };
  });
  return answer;
}

async function runD() {
  const raws = { parent: [], head: [] };
  for (const round of [1, 2]) {
    for (const build of BUILDS) {
      try {
        raws[build].push(await quietTree(`d${build[0]}${String(round)}`, build));
        const l = raws[build][raws[build].length - 1];
        say(`D round ${String(round)} at the ${build}, load ${J(l.load)}: mounts ${J(l.mounts.map((m) => (m.rowAt === null || m.dimAt === null ? null : m.dimAt - m.rowAt)))}, new files ${J(l.newFiles)}, the rule ${J(l.rule)}, frames ${J(l.frames)}`);
      } catch (err) {
        if (err instanceof Refusal) throw err;
        say(`D round ${String(round)} at the ${build} stopped: ${String(err?.message ?? err).slice(0, 300)}`);
      }
    }
  }
  let parent;
  for (const build of BUILDS) {
    const raw = { arm: 'D', build, launches: raws[build] };
    keepRaw(`D-${build}`, raw);
    const reading = derive(raw);
    if (build === 'parent') parent = reading;
    else linkParent('D', reading, parent);
    judgeArm(`D-${build}`, `D-${build}`, reading);
  }
}

// ---------------------------------------------------------------------------
// A1 to A11: the attack, every arm on a repository of its own in one launch a build
// ---------------------------------------------------------------------------

const ATTACKS = {
  async A1(ctx, park) {
    const repo = ctx.repo('a1');
    writeFileSync(join(repo.dir, 'w', 'keep.txt'), 'keep\n');
    await sleep(12_000); // past the ten second floor of whatever was shown before
    ctx.newLog('A1', { HOLD_MS: 3_000 });
    ctx.sample();
    await ctx.watch('rule', 'w/keep.txt');
    const marks = {};
    const from = seconds();
    const driven = ctx.show(repo);
    await ctx.callIn(repo, from, 20_000);
    await ctx.waitFor(() => ctx.ev(`window.__p370rows().some((r) => r.path === 'w/keep.txt')`), 2_000);
    marks.edit = seconds();
    appendFileSync(join(repo.dir, '.gitignore'), 'keep.txt\n');
    const rule = await ctx.waitAt('rule', 20_000);
    await driven;
    await sleep(1_000);
    return ctx.raw('A1', { repo: repo.dir, marks, watch: { rule } });
  },
  async A2(ctx) {
    const repo = ctx.repo('a2');
    writeFileSync(join(repo.dir, 'w', 'keep.txt'), 'keep\n');
    ctx.newLog('A2', {});
    ctx.sample();
    await ctx.show(repo);
    await ctx.settle(repo);
    await sleep(11_000);
    const base = readFileSync(join(repo.dir, '.gitignore'), 'utf8');
    await ctx.watch('added', 'w/keep.txt');
    const marks = { add: seconds() };
    writeFileSync(join(repo.dir, '.gitignore'), `${base}keep.txt\n`);
    await sleep(2_000);
    const added = await ctx.at('added');
    await ctx.watch('removed', 'w/keep.txt', 'none');
    marks.remove = seconds();
    writeFileSync(join(repo.dir, '.gitignore'), base);
    const removed = await ctx.waitAt('removed', 20_000);
    while (seconds() - marks.remove < 13) await sleep(100);
    return ctx.raw('A2', { repo: repo.dir, marks, watch: { added, removed } });
  },
  async A3(ctx, park) {
    const b = ctx.repo('a3b', { rules: '*.tmp\n', extra: (dir) => (writeFileSync(join(dir, 'onlyb.txt'), 'b\n'), writeFileSync(join(dir, 'b.tmp'), 'b\n'), []) });
    const a = ctx.repo('a3a');
    ctx.newLog('A3', { HOLD_MS: 10_000, HOLD_REPO: a.dir });
    ctx.sample();
    await ctx.show(b);
    await ctx.waitFor(() => ctx.ev(`window.__p370rows().some((r) => r.path === 'b.tmp' && r.status === 'ignored')`), 20_000);
    await ctx.tab(park);
    await sleep(1_000);
    const marks = {};
    const from = seconds();
    const driven = ctx.show(a);
    await ctx.callIn(a, from, 20_000);
    await driven;
    await ctx.frames({ marker: 'onlyb.txt', mustNot: ['root.log', 'd0001/b.log', 'd0002/b.log', 'd0003/b.log', 'ignored/'] });
    await ctx.watch('b', 'b.tmp', 'ignored', 'onlyb.txt');
    marks.toB = await ctx.tab(b);
    await sleep(2_000);
    const bFrames = await ctx.readFrames();
    const atB = await ctx.at('b');
    await ctx.frames({ marker: null });
    await ctx.watch('root', 'root.log', 'ignored', MARK_A);
    await ctx.ev(`(window.__p370f.watch.root.at = null, true)`);
    marks.toA = await ctx.tab(a);
    const root = await ctx.waitAt('root', 45_000);
    const allDimmedAt = await ctx.allDimmed(MARK_A, 20_000);
    return ctx.raw('A3', { repo: a.dir, marks, watch: { b: atB, root }, bFrames, allDimmedAt });
  },
  async A4(ctx, park) {
    const a = ctx.repo('a4');
    ctx.newLog('A4', { HOLD_MS: 5_000 });
    ctx.sample();
    const marks = {};
    const from = seconds();
    const driven = ctx.show(a);
    await ctx.callIn(a, from, 20_000);
    await driven;
    await ctx.frames({ marker: 'plain.txt', mustNot: ['root.log', 'plain.txt'] });
    marks.toPlain = await ctx.tab(park);
    await sleep(2_000);
    const plainFrames = await ctx.readFrames();
    const plainDimmed = (await ctx.rows()).filter((r) => r.status === 'ignored').length;
    await ctx.frames({ marker: null });
    marks.toA = await ctx.tab(a);
    const allDimmedAt = await ctx.allDimmed(MARK_A, 30_000);
    await sleep(1_000);
    return ctx.raw('A4', { repo: a.dir, marks, plainFrames, plainDimmed, allDimmedAt });
  },
  async A5(ctx) {
    const repo = ctx.repo('a5');
    ctx.newLog('A5-before', {});
    await ctx.show(repo);
    await ctx.settle(repo);
    ctx.newLog('A5', { FAIL: 3, MODE: 'answer' });
    ctx.sample();
    await ctx.frames({ marker: MARK_A, must: MUST });
    const changed = await ctx.changed();
    const marks = { writer: seconds() };
    for (let k = 1; seconds() - marks.writer < 60; k += 1) {
      writeFileSync(join(repo.dir, 'w', `n${String(k).padStart(4, '0')}.txt`), `${String(k)}\n`);
      await sleep(WRITE_MS);
    }
    marks.writerEnd = seconds();
    const changes = (await ctx.changed()) - changed;
    await sleep(30_000);
    marks.quietEnd = seconds();
    const frames = await ctx.readFrames();
    return ctx.raw('A5', { repo: repo.dir, marks, frames, changes });
  },
  async A6(ctx, park) {
    const repo = ctx.repo('a6', { rules: '*.log\nignored/\nkeep.txt\n' });
    writeFileSync(join(repo.dir, 'w', 'keep.txt'), 'keep\n');
    ctx.newLog('A6-before', {});
    await ctx.show(repo);
    await ctx.settle(repo);
    ctx.newLog('A6', { HOLD_MS: 40_000 });
    ctx.sample();
    // Not w/keep.txt: once its rule is gone `git status` lists it untracked, which the row shows whatever check-ignore answers.
    await ctx.frames({ marker: MARK_A, must: ['root.log', ...MUST] });
    const marks = { start: seconds() };
    await sleep(5_000);
    marks.removed = seconds();
    writeFileSync(join(repo.dir, '.gitignore'), '*.log\nignored/\n');
    while (seconds() - marks.start < 75) await sleep(100);
    marks.end = seconds();
    const frames = await ctx.readFrames();
    const raw = ctx.raw('A6', { repo: repo.dir, marks, frames });
    raw.until = marks.end;
    await ctx.tab(park);
    ctx.newLog('A6-after', {});
    await sleep(500);
    ctx.endHeld();
    return raw;
  },
  async A7(ctx) {
    const long = `aaaa/${'x'.repeat(36)}.log`;
    const repo = ctx.repo('a7', {
      n: 0,
      extra: (dir) => {
        mkdirSync(join(dir, 'aaaa'));
        writeFileSync(join(dir, ...long.split('/')), 'long\n');
        mkdirSync(join(dir, 'big'));
        for (let i = 1; i <= 21_000; i += 1) writeFileSync(join(dir, 'big', `f${String(i).padStart(5, '0')}.t`), '');
        return ['aaaa/', 'big/'];
      }
    });
    // Held 3 s, so every listing has landed when the first call ends and the chain is the same at every speed.
    ctx.newLog('A7', { COUNT: 1, HOLD_MS: 3_000 });
    ctx.sample();
    await ctx.watch('long', long);
    const marks = { show: seconds() };
    const driven = ctx.show(repo).catch(() => undefined);
    const drawn = await ctx.waitFor(() => ctx.ev(`window.__p370rows().some((r) => r.path.startsWith('big/f'))`), 60_000, 200);
    const openedMs = Math.round((seconds() - marks.show) * 1000);
    const hit = drawn === null ? null : await ctx.waitAt('long', 45_000);
    await driven;
    if (drawn !== null) await sleep(4_000);
    return ctx.raw('A7', { repo: repo.dir, marks, watch: { long: hit }, opened: drawn !== null, openedMs: drawn === null ? null : openedMs });
  },
  async A8(ctx) {
    const repo = ctx.repo('a8');
    ctx.newLog('A8-before', {});
    await ctx.show(repo);
    await ctx.settle(repo);
    await sleep(11_000);
    ctx.newLog('A8', { HOLD_MS: 3_000 });
    ctx.sample();
    const marks = {};
    for (const [k, rel] of [['one', 'w/late1.log'], ['two', 'w/late2.log']]) await ctx.watch(k, rel);
    const from = seconds();
    writeFileSync(join(repo.dir, 'w', 'start.txt'), 'start\n');
    if ((await ctx.callIn(repo, from, 10_000)) === null) throw new Error('no call started on the first change');
    await sleep(300);
    marks.one = seconds();
    writeFileSync(join(repo.dir, 'w', 'late1.log'), 'one\n');
    await sleep(600);
    marks.two = seconds();
    writeFileSync(join(repo.dir, 'w', 'late2.log'), 'two\n');
    while (seconds() - marks.one < 15.2) await sleep(100);
    const one = await ctx.at('one');
    const two = await ctx.at('two');
    marks.end = seconds();
    return ctx.raw('A8', { repo: repo.dir, marks, watch: { one, two } });
  },
  async A9(ctx) {
    const repo = ctx.repo('a9');
    ctx.newLog('A9', { HOLD_MS: 10_000 });
    ctx.sample(100);
    const marks = {};
    const from = seconds();
    const driven = ctx.show(repo).catch(() => undefined);
    const first = await ctx.callIn(repo, from, 20_000);
    if (first === null) throw new Error('no call started at the mount');
    while (seconds() - first < 2) await sleep(20);
    marks.reload = seconds();
    await ctx.cdp.call('Page.reload', {});
    await Promise.race([driven, sleep(200)]);
    // The reloaded window restores its own project and its own view: nothing is driven into it.
    const back = await ctx.waitFor(async () => {
      try {
        return (await ctx.ev(`document.readyState === 'complete' && typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' && performance.timeOrigin > ${String(marks.reload * 1000 - 500)}`, 5_000)) === true;
      } catch {
        return null;
      }
    }, 30_000, 100);
    if (back === null) throw new Error('the window did not come back after the reload');
    await ctx.ev(RECORDER);
    await ctx.watch('root', 'root.log', 'ignored', MARK_A);
    const root = await ctx.waitAt('root', 40_000);
    await sleep(1_000);
    return ctx.raw('A9', { repo: repo.dir, marks, watch: { root } });
  },
  async A10(ctx) {
    const repo = ctx.repo('a10');
    ctx.newLog('A10', { HOLD_MS: 5_000 });
    ctx.sample();
    const marks = {};
    const press = () => ev1(ctx, `(() => { const b = document.querySelector('section.section-files .section-toggle'); if (!b) return null; b.click(); return Date.now(); })()`);
    const state = () => ev1(ctx, `(() => { const s = document.querySelector('section.section-files'); return s ? s.classList.contains('collapsed') : null; })()`);
    const from = seconds();
    const driven = ctx.show(repo);
    await ctx.callIn(repo, from, 20_000);
    await driven;
    marks.close = (await press()) / 1000;
    await sleep(500);
    const sectionClosed = (await state()) === true;
    await sleep(500);
    marks.open = (await press()) / 1000;
    await sleep(300);
    const sectionOpened = (await state()) === false;
    const allDimmedAt = await ctx.allDimmed(MARK_A, 25_000);
    await sleep(1_000);
    return ctx.raw('A10', { repo: repo.dir, marks, sectionClosed, sectionOpened, allDimmedAt });
  },
  async A11(ctx) {
    const repo = ctx.repo('a11');
    ctx.newLog('A11-before', {});
    await ctx.show(repo);
    await ctx.settle(repo);
    ctx.newLog('A11', { HOLD_MS: 2_000, MODE: 'answer' });
    ctx.sample();
    const marks = { ask: seconds() };
    const answers = await ctx.ev(
      `Promise.allSettled(Array.from({ length: 200 }, () => window.gmux.git.checkIgnore({ repoPath: ${J(repo.dir)}, paths: ['root.log', 'README.md'] }))).then((all) => { const no = all.filter((x) => x.status === 'rejected').map((x) => JSON.stringify(x.reason, Object.getOwnPropertyNames(x.reason || {})) + String(x.reason && x.reason.message)); return { calls: all.length, answered: all.length - no.length, superseded: no.filter((s) => /superseded|newer one replaced it/.test(s)).length, otherWords: [...new Set(no.filter((s) => !/superseded|newer one replaced it/.test(s)).map((s) => s.slice(0, 160)))].slice(0, 3) }; })`,
      90_000
    );
    await sleep(3_000);
    marks.end = seconds();
    return ctx.raw('A11', { repo: repo.dir, marks, answers });
  }
};
const ev1 = (ctx, expr) => ctx.ev(expr, 20_000);

async function attacksAt(build) {
  const mine = ARMS.filter((a) => /^A\d+$/.test(a) && ARM_SPECS[a].includes(build));
  let launch = 0;
  while (mine.length > 0) {
    launch += 1;
    await withApp(`a${build[0]}${String(launch)}`, build, async (ctx) => {
      const park = ctx.plain('park');
      await ctx.show(park);
      while (mine.length > 0) {
        const id = mine.shift();
        const key = `${id}-${build}`;
        await memoryGate();
        const load = { before: loads() };
        try {
          const raw = await ATTACKS[id](ctx, park);
          load.after = loads();
          raw.load = load;
          keepRaw(key, raw);
          const reading = derive(raw);
          if (key === 'A7-head') linkParent('A7', reading, report.readings['A7-parent']);
          say(`${key}, load ${J(load)}: ${J(reading)}`);
          judgeArm(key, key, reading);
        } catch (err) {
          if (err instanceof Refusal) throw err;
          ctx.stop();
          cannotRead(key, `the arm stopped: ${String(err?.message ?? err).slice(0, 300)}`);
          return; // a new launch for the arms left
        }
        ctx.stop();
        await ctx.tab(park);
        ctx.newLog(`${id}-after`, {});
        if ((await ctx.quiet(45_000)) === null) ctx.endHeld();
        for (const n of readdirSync(ctx.w.alive)) rmSync(join(ctx.w.alive, n), { force: true });
      }
    });
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

say(`measuring HEAD ${HEAD} (${String(report.headSha).slice(0, 8)}) against the parent ${String(report.parent)} (${String(report.parentSha).slice(0, 8)}); arms ${ARMS.join(',')}; cells ${WANTED.join(',')}; socket ${SOCKET}; load ${J(loads())}; history ${HISTORY_BEFORE}${DEVELOPMENT ? '; DEVELOPMENT, this run never exits 0' : ''}`);
try {
  if (ARMS.includes('M')) {
    const readings = new Map();
    for (const build of BUILDS) await matrixAt(build, readings);
  }
  if (ARMS.includes('D')) await runD();
  for (const build of BUILDS) await attacksAt(build);
} catch (err) {
  stopWith = err instanceof Refusal ? err.code : 0;
  if (stopWith === 0) unreadable += 1;
  report.error = String(err?.message ?? err).slice(0, 900);
  say(`THE RUN STOPPED: ${report.error}`);
} finally {
  const text = psText();
  const left = text.split('\n').filter((l) => l.includes(`${RUN}/`)).map((l) => l.trim().slice(0, 160));
  const electrons = appPids.filter((pid) => text.split('\n').some((l) => Number(l.trim().split(/\s+/)[0]) === pid && /Electron|Tortie/.test(l)));
  const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null };
  if (history.after !== history.before) {
    say(`his shell history moved (${history.before} to ${history.after}); starting nothing for 3 minutes and reading it again`);
    await sleep(180_000);
    history.quiet = { again: historyStat() };
  }
  judgeArm('RUN', 'RUN', { preflight: { ok: PREFLIGHT.every((c) => c.ok) }, launches, agentsHeld, censusFailures, processTableRead: text.length > 0, otherGits: [...otherGits], electronsLeft: electrons.length, leftovers: [...leftovers, ...left], history });
  report.seconds = Math.round((Date.now() - t0) / 1000);
  report.load = loads();
  writeFileSync(REPORT, `${J(report, null, 2)}\n`, { mode: 0o600 });
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}
say(`${String(report.arms.filter((a) => a.ok === true).length)} verdict(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read; ${String(report.seconds)} s; load ${J(report.load)}; report ${REPORT}`);
process.exit(stopWith > 0 ? stopWith : failures > 0 ? 1 : unreadable > 0 || DEVELOPMENT ? 2 : 0);
