#!/usr/bin/env node
/**
 * probe:p372 — THE PHASE 372 APP RUN (build/p372/SPEC.md §8): what one Explorer
 * refresh costs the window, at the parent (`a28c2cf3`) and at HEAD, and that
 * nothing a person does to the tree is drawn any later for it.
 *
 * At the parent every change on disk re-reads every cached folder (Phase 155)
 * and writes each answer on its own: 502 store writes, 502 model passes and
 * 502 ignore-store calls a change at 500 open folders, changed or not. At HEAD
 * a listing equal to the one held writes nothing, and the listings one refresh
 * asked for are written by one `set` (SPEC §1 D1 to D8).
 *
 * THE WORLD. Each launch makes three scratch repositories of its own (10, 100
 * and 500 folders `d0001…`, a tracked `a.txt` and an ignored `b.log` each, the
 * writer's folder `w/`, an ignored folder, `.gitignore`, one uncommitted change,
 * a branch `other` that adds `c.txt` to every second folder, `0x/` of 20 files
 * that is not remembered, and in the 10 a marker folder `00ten/` drawn first), and shows each in
 * the Explorer with its folders remembered through the shot drive's
 * `localStorage`: `d0001` drawn first and read LAST, `d0002` read first. Real
 * git, `/usr/bin/git` on a closed PATH the scratch login shell must answer
 * (exit 2 otherwise); every git has HOME in scratch, GIT_CONFIG_GLOBAL=/dev/null
 * and GIT_CONFIG_NOSYSTEM=1; no remote.
 *
 * THE INSTRUMENTS. In the page: a recorder (`git:changed` counted, the lateness
 * of a 10 ms timer, long tasks, and every painted frame's rows read through the
 * tree's shadow root). Through CDP: `Performance.getMetrics` `TaskDuration` in
 * the `threadTicks` domain, read over each change's fixed window and over the
 * idle window of the same length that FOLLOWS it (SPEC §1 D11). The six
 * COUNTERS are conditional breakpoints that never pause, located by TEXT in each
 * build's own `out/renderer/assets/*.js`; an anchor missing, found twice, or
 * resolved by CDP anywhere but its own statement refuses the run (exit 2). They
 * run in their own phase of each launch, after the timed one. In MAIN, through
 * its inspector: `node:fs/promises.readdir` wrapped so ONE folder's read can be
 * held (main's `fs:readDir` asks it at call time), `mkdir`, `open`, `rename`
 * and `cp` timed as they resolve, and Electron's `shell.trashItem` replaced by a
 * move into the run's own folder, so the tree's own verbs never write into his
 * Trash (when it cannot be replaced, arm O is not driven).
 *
 * ONE ELECTRON AT A TIME through build/electron-run.mjs inside
 * build/harness-socket.mjs, in blocks: parent, HEAD, parent, HEAD. Each launch
 * on its own scratch profile, HOME and ZDOTDIR with HISTFILE=/dev/null and
 * SHELL=/bin/sh, the harness socket as its `tmuxSocket` (the helper's read-only
 * census of his session names around it). NO AGENT RUNS, not even for a
 * version: every probed registry row is hidden and `agents:list` is read back (a
 * row that resolved refuses the run), and no session is created. Before every
 * timed cell the 1 minute load is read: above 40 it waits 2 minutes, up to 20,
 * then runs and says so; under 20 percent memory free it starts nothing.
 *
 * THREE VERDICTS, AND A MISSING READING IS NEVER A PASS. Each grader names its
 * `reads`, its `needs` and its `clauses`; an absent field or an unmet need is
 * UNREADABLE (exit 2), only a clause is FAIL (exit 1). Every reading comes out
 * of ONE pure function, `derive`, which `--grader-self-test` drives over raw
 * fixtures seeded from the spec step's own launches (build/p372/fixtures/).
 * Every comparing arm first needs its launches to be ONE run, the parent and
 * HEAD alternated in time, each launch the build its renderer says it is, and
 * the window never hidden once the first project painted (`sessionOf`); a
 * metric CDP did not answer is null, never 0, and a latency stamped before its
 * own act is missing, never fast (the probe review, 2026-11-25).
 *
 * THE ARMS (SPEC §8): M the matrix and its gate (D11), L a new file's latency
 * (read from M's own changes), H one folder held 5 s, E an expand, O the tree's
 * own verbs, R Refresh, V a vanished folder, S a switch mid-collection, I the
 * ignore store, and RUN.
 *
 * VERIFIERS ONLY: it starts Electrons. Take the lock.
 *
 *   P372_PARENT_CHECKOUT=<a built a28c2cf3> npm run -s probe:p372
 *   P372_ARMS=M,H,…      the arms (default every one; RUN is always read)
 *   P372_KEEP=1          keep each arm's raw input beside the report
 *   P372_REPORT=<file>   the report (default <harness dir>/report/probe-p372.json, outside the checkout)
 *   P372_HEAD_FIRST=1    the attack (SPEC §10): HEAD, parent, HEAD, parent
 *   P372_HEAD_ONLY=1     DEVELOPMENT: no parent; what compares with it reads UNREADABLE; never exits 0
 *   P372_PARENT_ONLY=1   DEVELOPMENT: the parent's launches alone; never exits 0
 *   P372_NS=10,100       DEVELOPMENT: fewer repositories; never exits 0
 *   P372_BLOCKS=1        DEVELOPMENT: one block; never exits 0
 *   P372_REPS=<n>        DEVELOPMENT: changes a cell a block (default 8); never exits 0
 *   node build/p372/probe-p372.mjs --grader-self-test   every reader and grader over build/p372/fixtures/; starts nothing
 *   node build/p372/probe-p372.mjs --preflight          the builds, the anchors and the helpers; starts nothing
 *   node build/p372/probe-p372.mjs --list-graders       every grader's reads, needs and clauses; starts nothing
 *
 * Run the three flags with `node`, never through `npm run`, whose script hands
 * them to harness-socket.mjs.
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or an
 * arm could not be READ, 3 when the machine was short of memory.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { loadavg, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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

// ---------------------------------------------------------------------------
// What this run holds the builds against, by value (SPEC §1, §8)
// ---------------------------------------------------------------------------

/** The parent this phase measures against. */
export const PARENT_SNAPSHOT = 'a28c2cf3';
/** Text only a renderer bundle that carries this phase holds (SPEC §3: `sameListing`, exported from the store). */
export const PHASE_MARK = 'function sameListing(';
/** The repositories, and how many folders a refresh of each reads: the root and `w/` beside the N. */
export const SIZES = Object.freeze([10, 100, 500]);
export const readsFor = (n) => n + 2;
/** M's kinds (SPEC §8): a line in a tracked file, a new file read last, a new file read first, a branch. */
export const KINDS = Object.freeze(['same', 'addEarly', 'add', 'branch']);
/** The window a change is read over (SPEC §2.1), and the idle window after it is the same length. */
export const windowFor = (n) => (n >= 500 ? 4_000 : 3_000);
/** D11's floor under the parent's own block-to-block noise. */
export const NOISE_FLOOR_MS = 10;
/** One frame: the resolution of every drawn-row reading (SPEC §8). */
export const FRAME_MS = 17;
/** p370's N2/N3 bound for the ignore store (SPEC §8 arm I). */
export const IGNORE_SLACK_MS = 200;
/** What one folder is held for in main (SPEC §2.1 Phase H). */
export const HOLD_MS = 5_000;
export const LOAD_CEILING = 40;
export const LOAD_WAIT_MIN = 20;
export const MEMORY_FLOOR = 20;
/** I's frames: at least this many painted under the writer (SPEC §8). */
export const MIN_FRAMES = 1_000;
export const CENSUS_WORDS = "is the private server the operator's live";
/** Which launches each arm is driven in: blocks 1 and 2, or 1 alone. */
export const ARM_SPECS = Object.freeze({ M: [1, 2], L: [1, 2], H: [1], E: [1], R: [1], V: [1], O: [1], S: [2], I: [2] });
export const DEFAULT_ARMS = Object.freeze(Object.keys(ARM_SPECS));

/**
 * The six counters (SPEC §2.1, §8), each located by text in the build's own
 * renderer assets. `at`: where in the needle the breakpoint goes (its end, or
 * a second needle after it). `starts`: what the statement the breakpoint must
 * resolve at begins with.
 */
export const ANCHORS = Object.freeze([
  { key: 'read', needle: 'function readDir(dirPath){', at: 'end', starts: 'const ' },
  { key: 'store', needle: 'listeners.forEach(listener=>listener(state,previousState))', at: 'start', starts: 'listeners.forEach' },
  { key: 'input', needle: 'function treeInputOf(entriesByDir,rootPath){', at: 'end', starts: 'const ' },
  { key: 'diff', needle: 'const fed=fedRef.current;const next=treeInput.paths;', at: 'start', starts: 'const fed=' },
  { key: 'sync', needle: 'sync(target,paths,linkFolders){', at: 'end', starts: 'if(' },
  { key: 'render', needle: 'function useTreeModel(', at: 'const entriesByDir=', starts: 'const entriesByDir=' }
]);
/** The condition each counter runs; every one answers false, so nothing pauses. */
const CONDITIONS = Object.freeze({
  read: `__p372n('read')`,
  input: `__p372n('input')`,
  diff: `__p372n('diff')`,
  sync: `__p372n('sync')`,
  render: `__p372n('render')`,
  store: `(state && previousState && state.entriesByDir !== undefined && state.entriesByDir !== previousState.entriesByDir ? (window.__p372cache = state.entriesByDir, __p372n('write')) : state && previousState && state.ignored !== undefined && state.ignored !== previousState.ignored ? __p372n('ignoredSet') : false)`
});

/**
 * Locate every anchor in one build's renderer assets, by text: exactly once in
 * all the files together, or the anchor is refused with its reason.
 */
export function locateAnchors(files) {
  return ANCHORS.map((a) => {
    const hits = [];
    for (const [file, text] of files) {
      for (let at = text.indexOf(a.needle); at >= 0; at = text.indexOf(a.needle, at + 1)) hits.push({ file, at });
    }
    if (hits.length !== 1) return { key: a.key, ok: false, said: `${J(a.needle)} found ${String(hits.length)} times` };
    const { file, at: found } = hits[0];
    const text = files.get(file);
    let at = found;
    if (a.at === 'end') at = found + a.needle.length;
    else if (a.at !== 'start') {
      at = text.indexOf(a.at, found);
      if (at < 0) return { key: a.key, ok: false, said: `no ${J(a.at)} after ${J(a.needle)}` };
    }
    if (!text.startsWith(a.starts, at)) return { key: a.key, ok: false, said: `${J(a.needle)} is not followed by ${J(a.starts)}` };
    const before = text.slice(0, at);
    const line = before.split('\n').length - 1;
    const column = at - (before.lastIndexOf('\n') + 1);
    // The statement the counter belongs to ends at its first `;` (V8 may place
    // the breakpoint on a call inside it, as it does for `const paths=new Set`).
    const semi = text.indexOf(';', at);
    const statementEnd = column + (semi < 0 ? 0 : semi - at);
    return { key: a.key, ok: true, file, line, column, statementEnd, near: text.slice(at, at + 50) };
  });
}

/**
 * Whether CDP resolved a counter at its own statement (SPEC §8): one location,
 * on the anchor's line, from the anchor's first column to its statement's end.
 */
export function resolvedAtOwn(anchor, locations) {
  if (!Array.isArray(locations) || locations.length !== 1) return false;
  const [l] = locations;
  return l.lineNumber === anchor.line && l.columnNumber >= anchor.column && l.columnNumber <= anchor.statementEnd;
}

// ---------------------------------------------------------------------------
// The numbers, pure
// ---------------------------------------------------------------------------

export const median = (a) => {
  const s = a.filter(num).sort((x, y) => x - y);
  if (s.length === 0) return null;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const minOf = (a) => (a.filter(num).length === 0 ? null : Math.min(...a.filter(num)));
const maxOf = (a) => (a.filter(num).length === 0 ? null : Math.max(...a.filter(num)));
const cellId = (n, kind) => `n${String(n)}-${kind}`;
/**
 * REVIEW: a latency is a reading only when it is a number at or after the act
 * it is timed from. A row stamped before its own write was read before it was
 * drawn (a stale row, a clock read wrong), so it is missing, never fast.
 */
export const lat = (x) => (num(x) && x >= 0 ? x : null);

/**
 * REVIEW: what every comparing arm needs of the launches it reads (SPEC §1
 * D11, §8): one run, the parent and HEAD alternated in time, each launch the
 * build its renderer says it is (a HEAD launch named the parent would be HEAD
 * compared with itself and read as equal), and its window never hidden while
 * the launch ran (a hidden window draws nothing, so its thread and its frames
 * are no reading of what a person sees). `why` names every one that failed.
 */
export function sessionOf(launches) {
  const why = [];
  if (!Array.isArray(launches) || launches.length === 0) return { ok: false, why: ['no launch'] };
  const runs = new Set(launches.map((l) => l.run));
  if (!launches.every((l) => typeof l.run === 'string' && l.run !== '') || runs.size !== 1) why.push('not one run');
  if (!launches.every((l) => num(l.startedAt))) why.push('a launch has no start');
  else {
    const order = [...launches].sort((a, b) => a.startedAt - b.startedAt);
    if (order.some((l, i) => i > 0 && l.build === order[i - 1].build)) why.push('the parent and HEAD not alternated');
    for (const b of ['parent', 'head']) {
      const blocks = order.filter((l) => l.build === b).map((l) => l.block);
      if (blocks.some((k, i) => !Number.isInteger(k) || (i > 0 && k <= blocks[i - 1]))) why.push(`the ${b}'s blocks out of order`);
    }
  }
  if (!launches.every((l) => typeof l.carriesPhase === 'boolean' && l.carriesPhase === (l.build === 'head'))) why.push('a launch is not the build it names');
  if (!launches.every((l) => l.visibility?.read === true && Array.isArray(l.visibility.hidden) && l.visibility.hidden.length === 0)) why.push('a window was hidden, or its visibility unread');
  return { ok: why.length === 0, why };
}

/** The window's thread a change: the change's window less the idle window that follows it (SPEC §1 D11). */
export const threadOf = (row) => (num(row?.taskMs) && num(row?.idleTaskMs) ? row.taskMs - row.idleTaskMs : null);

/**
 * D11, over one cell's two builds. `parent` and `head` are the per-block lists
 * of thread values. `noise` is the gap between the parent's two block medians,
 * at least NOISE_FLOOR_MS.
 */
export function gateCell(n, parentBlocks, headBlocks) {
  const pm = parentBlocks.map(median);
  const hm = headBlocks.map(median);
  const parent = median(parentBlocks.flat());
  const head = median(headBlocks.flat());
  const noise = Math.max(NOISE_FLOOR_MS, pm.length >= 2 && num(pm[0]) && num(pm[1]) ? Math.abs(pm[0] - pm[1]) : 0);
  const notHigher = num(parent) && num(head) && head <= parent + noise;
  const lower = num(parent) && num(head) && head <= parent - noise;
  const bothPairs = pm.length === hm.length && pm.length >= 1 && pm.every((p, i) => num(p) && num(hm[i]) && hm[i] < p);
  return { n, parent, head, parentBlocks: pm, headBlocks: hm, noise, notHigher, lower: n >= 100 ? lower : null, bothPairs: n >= 500 ? bothPairs : null };
}

function launchesOf(raw, build) {
  return (raw.launches ?? []).filter((l) => l.build === build).sort((a, b) => a.block - b.block);
}

function deriveM(raw) {
  const cells = {};
  const counts = {};
  const wanted = [];
  const builds = ['parent', 'head'];
  let changed = { rows: 0, notOne: 0 };
  for (const n of SIZES) {
    for (const kind of KINDS) {
      const id = cellId(n, kind);
      wanted.push(id);
      const per = {};
      for (const b of builds) {
        const blocks = launchesOf(raw, b).map((l) => (l.cells ?? []).find((c) => c.n === n && c.kind === kind)).filter((c) => c !== undefined);
        for (const c of blocks) for (const r of c.rows) {
          changed.rows += 1;
          if (r.changed !== 1) changed.notOne += 1;
        }
        per[b] = blocks.map((c) => c.rows.map(threadOf).filter(num));
        // REVIEW: how many changes each block TIMED, beside how many it read (a change with a metric unread is missing).
        per[`${b}Asked`] = blocks.map((c) => c.rows.length);
        per[`${b}Load`] = blocks.map((c) => c.load?.[0] ?? null);
        per[`${b}Extra`] = blocks.map((c) => ({ script: median(c.rows.map((r) => (num(r.scriptMs) && num(r.idleScriptMs) ? r.scriptMs - r.idleScriptMs : null))), blocked: median(c.rows.map((r) => r.blocked)), longest: maxOf(c.rows.map((r) => r.longest)), longTasks: c.rows.reduce((a, r) => a + (r.longTasks ?? 0), 0), raw: median(c.rows.map((r) => r.taskMs)) }));
      }
      if (per.parent.length > 0 && per.head.length > 0) cells[id] = { ...gateCell(n, per.parent, per.head), changes: { parent: per.parent.map((x) => x.length), head: per.head.map((x) => x.length) }, asked: { parent: per.parentAsked, head: per.headAsked }, load: { parent: per.parentLoad, head: per.headLoad }, extra: { parent: per.parentExtra, head: per.headExtra } };
      for (const b of builds) {
        const pers = launchesOf(raw, b).flatMap((l) => ((l.counts ?? []).find((c) => c.n === n && c.kind === kind)?.per ?? []));
        if (pers.length === 0) continue;
        counts[id] ??= {};
        const field = (k) => pers.map((p) => (num(p[k]) ? p[k] : 0));
        counts[id][b] = { changes: pers.length, perLaunch: launchesOf(raw, b).map((l) => ((l.counts ?? []).find((c) => c.n === n && c.kind === kind)?.per ?? []).length), read: field('read'), write: field('write'), diff: field('diff'), sync: field('sync'), input: field('input'), render: field('render') };
      }
    }
  }
  const anchors = (raw.launches ?? []).every((l) => Array.isArray(l.anchors) && l.anchors.length === ANCHORS.length && l.anchors.every((a) => a.ok === true && a.resolved === true));
  const blocks = Object.fromEntries(builds.map((b) => [b, launchesOf(raw, b).length]));
  return { arm: 'M', wanted, cells, counts, anchors, blocks, changed, sizes: SIZES };
}

function deriveL(raw) {
  const cells = {};
  for (const n of [10, 500]) {
    for (const kind of ['add', 'addEarly']) {
      const get = (b) => launchesOf(raw, b).flatMap((l) => ((l.cells ?? []).find((c) => c.n === n && c.kind === kind)?.rows ?? []).map((r) => lat(r.latencyMs)));
      const p = get('parent');
      const h = get('head');
      cells[cellId(n, kind)] = { parent: median(p), head: median(h), missing: { parent: p.filter((x) => !num(x)).length, head: h.filter((x) => !num(x)).length }, changes: { parent: p.length, head: h.length } };
    }
  }
  return { arm: 'L', cells };
}

function byBuild(raw, key) {
  const out = {};
  for (const b of ['parent', 'head']) {
    const l = launchesOf(raw, b).find((x) => x[key] !== undefined && x[key] !== null);
    if (l !== undefined) out[b] = l[key];
  }
  return out;
}

function deriveH(raw) {
  const held = byBuild(raw, 'held');
  const out = { arm: 'H', cells: {}, own: {}, holdTook: {} };
  for (const [b, list] of Object.entries(held)) {
    out.holdTook[b] = list.every((x) => (x.rows ?? []).every((r) => num(r.mainHoldMs) && r.mainHoldMs >= HOLD_MS - 100) && num(x.own?.mainHoldMs) && x.own.mainHoldMs >= HOLD_MS - 100);
    for (const x of list) {
      for (const folder of ['d0001', 'd0002']) {
        const ms = (x.rows ?? []).filter((r) => r.folder === folder).map((r) => lat(r.latencyMs));
        const id = `n${String(x.n)}-${folder}`;
        out.cells[id] ??= {};
        out.cells[id][b] = { median: median(ms), missing: ms.filter((v) => !num(v)).length, n: ms.length };
      }
      out.own[`n${String(x.n)}`] ??= {};
      out.own[`n${String(x.n)}`][b] = { latencyMs: lat(x.own?.latencyMs), writes: x.own?.writes ?? null };
    }
  }
  return out;
}

function deriveE(raw) {
  const e = byBuild(raw, 'expand');
  const out = { arm: 'E' };
  for (const [b, x] of Object.entries(e)) {
    const quiet = x.quiet.map(lat);
    const heldMs = x.held.map(lat);
    out[b] = { quiet: median(quiet), held: median(heldMs), missing: [...quiet, ...heldMs].filter((v) => !num(v)).length, n: { quiet: x.quiet.length, held: x.held.length }, holdTook: x.holdTook === true, refreshesWhileHeld: x.refreshesWhileHeld ?? 0 };
  }
  return out;
}

function deriveR(raw) {
  const r = byBuild(raw, 'refresh');
  const out = { arm: 'R' };
  for (const [b, x] of Object.entries(r)) {
    const quiet = x.quiet.map(lat);
    const heldMs = x.held.map((h) => lat(h.ms));
    out[b] = { quiet: median(quiet), held: median(heldMs), missing: [...quiet, ...heldMs].filter((v) => !num(v)).length, heldReadAgain: x.held.length > 0 && x.held.every((h) => h.heldReadAgain === true), heldTook: x.held.length > 0 && x.held.every((h) => h.holdTook === true), pressed: x.pressed === true, n: { quiet: x.quiet.length, held: x.held.length } };
  }
  return out;
}

function deriveV(raw) {
  const v = byBuild(raw, 'vanish');
  const out = { arm: 'V' };
  for (const [b, list] of Object.entries(v)) {
    const gone = list.map((x) => lat(x.goneMs));
    out[b] = { gone: median(gone), missing: gone.filter((v) => !num(v)).length, never: list.filter((x) => !num(x.goneMs) && x.stillDrawn === true).length, keysAfter: list.filter((x) => x.keyAfter !== false).length, cacheRead: list.every((x) => typeof x.keyAfter === 'boolean'), n: list.length };
  }
  return out;
}

/** O: each event's latency, the smaller of its two runs, matched by its order and its name. */
function deriveO(raw) {
  const o = byBuild(raw, 'ops');
  const out = { arm: 'O' };
  for (const [b, x] of Object.entries(o)) {
    out[b] = { trashStandIn: x.trashStandIn === true };
    for (const mode of ['quiet', 'held']) {
      const runs = x[mode] ?? [];
      const events = {};
      for (const run of runs) for (const ev of run.events ?? []) {
        events[ev.key] ??= [];
        events[ev.key].push(lat(ev.ms));
      }
      out[b][mode] = { stepsOk: runs.length > 0 && runs.every((r) => r.steps?.failed === 0 && num(r.steps?.passed) && r.steps.passed > 0), runs: runs.length, events: Object.fromEntries(Object.entries(events).map(([k, ms]) => [k, minOf(ms)])), holdTook: runs.every((r) => mode === 'quiet' || r.holdTook === true) };
    }
  }
  return out;
}

function deriveS(raw) {
  const s = byBuild(raw, 'switch');
  const out = { arm: 'S' };
  for (const [b, x] of Object.entries(s)) out[b] = { tenShown: x.tenShown === true, frames: x.frames ?? 0, forbidden: x.forbidden ?? null, examples: x.examples ?? [], newFiles: x.newFiles ?? {}, allDrawn: Object.keys(x.newFiles ?? {}).length > 0 && Object.values(x.newFiles ?? {}).every(num), holdTook: x.holdTook === true };
  return out;
}

function deriveI(raw) {
  const i = byBuild(raw, 'ignore');
  const out = { arm: 'I' };
  for (const [b, x] of Object.entries(i)) {
    // INTEGRATOR: a rule add that never dimmed a row read undimmed when the wait ended is a reading (`ruleAddNever`),
    // and the undim after it is no reading of anything (the row was never dimmed), so it is left out.
    const never = (x.ruleAddNever ?? []).map((v) => v === true);
    const ruleAdd = x.ruleAdd.map(lat);
    const newLog = x.newLog.map(lat);
    const shown = ruleAdd.map((v, k) => !(never[k] === true && !num(x.ruleAdd[k])));
    const removes = x.ruleRemove.map(lat).filter((_, k) => shown[k]);
    out[b] = { newLog: median(newLog), ruleAdd: median(ruleAdd), ruleAddNever: never.filter(Boolean).length, ruleRemove: median(removes), missing: [...newLog, ...ruleAdd.filter((_, k) => shown[k]), ...removes].filter((v) => !num(v)).length, frames: x.frames ?? 0, bad: x.bad ?? null, changes: x.changes ?? 0 };
  }
  return out;
}

/** THE ONE READER: every reading this run grades comes out of here. */
export function derive(raw) {
  const reading = (() => {
    switch (raw?.arm) {
      case 'M': return deriveM(raw);
      case 'L': return deriveL(raw);
      case 'H': return deriveH(raw);
      case 'E': return deriveE(raw);
      case 'R': return deriveR(raw);
      case 'V': return deriveV(raw);
      case 'O': return deriveO(raw);
      case 'S': return deriveS(raw);
      case 'I': return deriveI(raw);
      default: throw new Error(`no reader for arm ${J(raw?.arm)}`);
    }
  })();
  // REVIEW: every comparing arm reads its launches' session (sessionOf), so a reading of two runs, of launches not
  // alternated, of a launch that is not the build it names, or of a hidden window is UNREADABLE.
  reading.session = sessionOf(raw.launches);
  return reading;
}

// ---------------------------------------------------------------------------
// The graders (pure, over a reading): used live and in --grader-self-test
// ---------------------------------------------------------------------------

const cellsAt = (r, n) => Object.entries(r.cells).filter(([id]) => id.startsWith(`n${String(n)}-`)).map(([, c]) => c);
const countsOf = (r, kinds) => Object.entries(r.counts).filter(([id]) => kinds.some((k) => id.endsWith(`-${k}`)));
const allIn = (list, pred) => list.length > 0 && list.every(pred);
const le = (a, b) => num(a) && num(b) && a <= b;
/** O: the events a build drew, as [key, ms]. */
const drawnBy = (events) => Object.entries(events ?? {}).filter(([, v]) => num(v));

/** REVIEW: the need every comparing arm asks first (sessionOf). */
export const SESSION_NEED = Object.freeze(['every launch is of this one run, the parent and HEAD alternated, each the build its renderer says, its window never hidden', (r) => r.session.ok === true]);

export const GRADERS = {
  M: {
    title: 'the matrix: the window’s thread a change at 10, 100 and 500 open folders, and what one refresh writes (D11)',
    reads: ['session.ok', 'cells', 'counts', 'anchors', 'blocks.parent', 'blocks.head', 'changed.rows'],
    needs: [
      SESSION_NEED,
      ['every counter was found once in both builds and resolved at its own statement', (r) => r.anchors === true],
      ['both builds ran two blocks', (r) => r.blocks.parent >= 2 && r.blocks.head >= 2],
      ['every cell of every size and kind was read at both builds', (r) => r.wanted.every((id) => r.cells[id] !== undefined)],
      // REVIEW: as first built this asked for 6 readable changes a block, so a cell timed with a change unread (or one
      // block of the parent missing that cell, which also floored its noise) was graded whole.
      ['every cell holds every change it timed, readable, at least 8 a block, in every block of both builds', (r) => Object.values(r.cells).every((c) => ['parent', 'head'].every((b) => c.changes[b].length === r.blocks[b] && c.asked[b].length === r.blocks[b] && c.changes[b].every((x, i) => x === c.asked[b][i] && x >= 8)))],
      ['every change the matrix timed produced exactly one git:changed in the page', (r) => r.changed.rows > 0 && r.changed.notOne === 0],
      // REVIEW: three changes a kind in every block (counted()), not merely one.
      ['every size and kind was counted at both builds, three changes in every block', (r) => r.wanted.every((id) => ['parent', 'head'].every((b) => r.counts[id]?.[b] !== undefined && r.counts[id][b].perLaunch.length === r.blocks[b] && r.counts[id][b].perLaunch.every((x) => x === 3)))],
      ['the parent wrote the cache once a folder a change, as the spec step read it (the counters see what they count)', (r) => Object.entries(r.counts).every(([id, c]) => c.parent.write.every((w, i) => w === readsFor(Number(id.slice(1, id.indexOf('-')))) && c.parent.read[i] === w))]
    ],
    clauses: [
      ['D11: no cell reads HEAD higher than the parent + noise', (r) => Object.values(r.cells).every((c) => c.notHigher === true)],
      ['D11: at 100 folders HEAD reads lower than the parent − noise, every kind', (r) => allIn(cellsAt(r, 100), (c) => c.lower === true)],
      ['D11: at 500 folders HEAD reads lower than the parent − noise, every kind', (r) => allIn(cellsAt(r, 500), (c) => c.lower === true)],
      ['D11: at 500 folders HEAD reads below the parent in both block pairs, every kind', (r) => allIn(cellsAt(r, 500), (c) => c.bothPairs === true)],
      ['Phase 155: every change still reads every cached folder at HEAD', (r) => Object.entries(r.counts).every(([id, c]) => c.head.read.every((x) => x === readsFor(Number(id.slice(1, id.indexOf('-'))))))],
      ['nothing changed: 0 store writes, 0 model passes, at most 1 ignore-store call', (r) => allIn(countsOf(r, ['same']), ([, c]) => c.head.write.every((x) => x === 0) && c.head.diff.every((x) => x === 0) && c.head.sync.every((x) => x <= 1))],
      ['one file added: 1 store write, 1 model pass, at most 2 ignore-store calls', (r) => allIn(countsOf(r, ['add', 'addEarly']), ([, c]) => c.head.write.every((x) => x === 1) && c.head.diff.every((x) => x === 1) && c.head.sync.every((x) => x <= 2))],
      ['a branch switch: at most 2 store writes and 2 model passes', (r) => allIn(countsOf(r, ['branch']), ([, c]) => c.head.write.every((x) => x <= 2) && c.head.diff.every((x) => x <= 2))]
    ]
  },
  L: {
    title: 'a new file’s latency, in the folder read last and in the folder read first, at 10 and 500 folders',
    reads: ['session.ok', 'cells.n10-add', 'cells.n10-addEarly', 'cells.n500-add', 'cells.n500-addEarly'],
    needs: [
      SESSION_NEED,
      ['every new file was read at both builds, at least 12 each', (r) => Object.values(r.cells).every((c) => c.changes.parent >= 12 && c.changes.head >= 12)],
      ['every new file was drawn at both builds', (r) => Object.values(r.cells).every((c) => c.missing.parent === 0 && c.missing.head === 0)]
    ],
    clauses: [
      ['10 folders, read last: HEAD no later than the parent + one frame', (r) => le(r.cells['n10-add'].head, r.cells['n10-add'].parent + FRAME_MS)],
      ['10 folders, read first: HEAD no later than the parent + one frame', (r) => le(r.cells['n10-addEarly'].head, r.cells['n10-addEarly'].parent + FRAME_MS)],
      ['500 folders, read last: HEAD no later than the parent + one frame', (r) => le(r.cells['n500-add'].head, r.cells['n500-add'].parent + FRAME_MS)],
      ['500 folders, read first: HEAD no later than the parent + one frame', (r) => le(r.cells['n500-addEarly'].head, r.cells['n500-addEarly'].parent + FRAME_MS)]
    ]
  },
  H: {
    title: 'one folder held 5 s in main: the others are not held with it, and the held one lands alone',
    reads: ['session.ok', 'cells.n10-d0001.parent', 'cells.n10-d0001.head', 'cells.n10-d0002.head', 'cells.n500-d0001.head', 'cells.n500-d0002.head', 'own.n10.head', 'own.n500.head', 'own.n10.parent', 'own.n500.parent', 'holdTook.parent', 'holdTook.head'],
    needs: [
      SESSION_NEED,
      ['main held the folder’s read 5 s every time, at both builds', (r) => r.holdTook.parent === true && r.holdTook.head === true],
      ['every new file was drawn at both builds', (r) => Object.values(r.cells).every((c) => c.parent?.missing === 0 && c.head?.missing === 0 && c.parent.n >= 3 && c.head.n >= 3) && Object.values(r.own).every((o) => num(o.parent?.latencyMs) && num(o.head?.latencyMs))],
      ['the held folder’s landing was counted', (r) => Object.values(r.own).every((o) => num(o.head?.writes))]
    ],
    clauses: [
      ['a new file in another folder: HEAD no later than the parent + one frame, every cell', (r) => Object.values(r.cells).every((c) => le(c.head.median, c.parent.median + FRAME_MS))],
      // INTEGRATOR: against the parent's OWN reading of the held folder's file. As first built this bound was 5 s plus
      // the parent's latency in ANOTHER folder (d0001), which the parent itself missed by 98 ms at 10 folders in the
      // integrator's run (5,594 against 5,493) and HEAD by 3 ms (5,496): a bound today's build fails is no regression test.
      ['the held folder’s own new file: no later than the parent’s own + one frame', (r) => Object.values(r.own).every((o) => le(o.head.latencyMs, o.parent.latencyMs + FRAME_MS))],
      ['the held folder is written alone: one store write when it lands', (r) => Object.values(r.own).every((o) => o.head.writes === 1)]
    ]
  },
  E: {
    title: 'an expand, on a quiet tree and while a refresh is held open',
    reads: ['session.ok', 'parent.quiet', 'parent.held', 'head.quiet', 'head.held'],
    needs: [
      SESSION_NEED,
      ['ten expands a mode were drawn at both builds', (r) => ['parent', 'head'].every((b) => r[b].missing === 0 && r[b].n.quiet >= 10 && r[b].n.held >= 10)],
      ['the folder was held and refreshes were in flight while it was, at both builds', (r) => ['parent', 'head'].every((b) => r[b].holdTook === true && r[b].refreshesWhileHeld >= 1)]
    ],
    clauses: [
      ['quiet: HEAD draws the rows no later than the parent + one frame', (r) => le(r.head.quiet, r.parent.quiet + FRAME_MS)],
      ['held: HEAD draws the rows no later than the parent + one frame', (r) => le(r.head.held, r.parent.held + FRAME_MS)]
    ]
  },
  O: {
    title: 'the tree’s own verbs (new folder, new file, rename, duplicate, move, trash), on a quiet tree and inside a held collection',
    reads: ['session.ok', 'parent.quiet', 'parent.held', 'head.quiet', 'head.held'],
    needs: [
      SESSION_NEED,
      ['the trash went into the run’s own folder at both builds, never his Trash', (r) => r.parent.trashStandIn === true && r.head.trashStandIn === true],
      ['each mode ran twice at both builds, the held one with its folder held', (r) => ['parent', 'head'].every((b) => r[b].quiet.runs >= 2 && r[b].held.runs >= 2 && r[b].held.holdTook === true)],
      // INTEGRATOR: an event neither build drew (the shot drive's own `p37/` rows, which this arm does not track) is no
      // reading of either; the need is over the events the parent DREW, as its words say.
      ['every event the parent drew was read at HEAD too', (r) => ['quiet', 'held'].every((m) => drawnBy(r.parent[m].events).length > 0 && drawnBy(r.parent[m].events).every(([k]) => k in r.head[m].events))]
    ],
    clauses: [
      ['every step ok at the parent', (r) => r.parent.quiet.stepsOk === true && r.parent.held.stepsOk === true],
      ['every step ok at HEAD', (r) => r.head.quiet.stepsOk === true && r.head.held.stepsOk === true],
      ['quiet: every row drawn or gone no later than the parent + one frame', (r) => drawnBy(r.parent.quiet.events).every(([k, v]) => le(r.head.quiet.events[k], v + FRAME_MS))],
      ['held: every row drawn or gone no later than the parent + one frame', (r) => drawnBy(r.parent.held.events).every(([k, v]) => le(r.head.held.events[k], v + FRAME_MS))]
    ]
  },
  R: {
    title: 'Refresh pressed inside the watcher’s delay, quiet and while a folder is held',
    reads: ['session.ok', 'parent.quiet', 'parent.held', 'head.quiet', 'head.held', 'head.heldReadAgain'],
    needs: [
      SESSION_NEED,
      ['the Refresh button was pressed and every row was drawn at both builds', (r) => ['parent', 'head'].every((b) => r[b].pressed === true && r[b].missing === 0 && r[b].n.quiet >= 4 && r[b].n.held >= 3)],
      ['the folder’s read was held at every held press, at both builds', (r) => r.parent.heldTook === true && r.head.heldTook === true]
    ],
    clauses: [
      ['quiet: the row after the press no later than the parent + one frame', (r) => le(r.head.quiet, r.parent.quiet + FRAME_MS)],
      ['held: the row after the press no later than the parent + one frame', (r) => le(r.head.held, r.parent.held + FRAME_MS)],
      ['Phase 155: the held folder is read again after its held read, every press', (r) => r.head.heldReadAgain === true]
    ]
  },
  V: {
    title: 'a folder removed from outside: its rows go, and its key goes from the cache',
    // INTEGRATOR: the parent's `gone` is no read field, because a parent that never took its rows away reads none;
    // its `missing` and `never` say which (the first need).
    reads: ['session.ok', 'parent.missing', 'parent.never', 'head.gone', 'head.keysAfter'],
    needs: [
      SESSION_NEED,
      // INTEGRATOR: a folder's row the PARENT still draws when the wait ends is a reading of the parent (it never took
      // the row away), not a missing one; a row neither gone nor read as still drawn is missing.
      ['five folders removed at both builds, every row gone at HEAD, and at the parent gone or read as still drawn', (r) => ['parent', 'head'].every((b) => r[b].n >= 5) && r.head.missing === 0 && r.parent.missing === (r.parent.never ?? 0)],
      ['every folder was cached before its removal and the cache read after it, at HEAD', (r) => r.head.cacheRead === true]
    ],
    clauses: [
      ['the rows gone no later than the parent + one frame (or the parent never took them away)', (r) => (r.parent.missing > 0 && r.parent.missing === r.parent.never && r.parent.gone === null ? num(r.head.gone) : le(r.head.gone, r.parent.gone + FRAME_MS))],
      ['no key for a removed folder after', (r) => r.head.keysAfter === 0]
    ]
  },
  S: {
    title: 'a switch of project while a refresh is held open: nothing of the old project drawn, and the new files after the return',
    reads: ['session.ok', 'head.forbidden', 'head.frames', 'head.newFiles'],
    needs: [
      SESSION_NEED,
      ['the 10 was shown and its frames were read at HEAD, at least 30', (r) => r.head.tenShown === true && r.head.frames >= 30],
      ['the folder was held when the switch was made at HEAD', (r) => r.head.holdTook === true],
      ['new files were watched after the return', (r) => Object.keys(r.head.newFiles).length >= 2]
    ],
    clauses: [
      ['no row of the 500 repository drawn while the 10 is shown', (r) => r.head.forbidden === 0],
      ['after the return, every new file drawn', (r) => r.head.allDrawn === true]
    ]
  },
  I: {
    title: 'the ignore store: a new ignored file dims, a rule added and taken away shows, and Phase 47.1’s frames hold',
    // INTEGRATOR: the parent's rule readings are no read fields, because a parent that never showed a rule reads
    // none; its `missing` and `ruleAddNever` say which (the first need).
    reads: ['session.ok', 'parent.newLog', 'parent.missing', 'parent.ruleAddNever', 'head.newLog', 'head.ruleAdd', 'head.ruleRemove', 'head.bad'],
    needs: [
      SESSION_NEED,
      ['every dim and undim was drawn at both builds', (r) => r.parent.missing === 0 && r.head.missing === 0],
      [`at least ${String(MIN_FRAMES)} frames painted under the writer at HEAD, with changes in them`, (r) => r.head.frames >= MIN_FRAMES && r.head.changes >= 10]
    ],
    clauses: [
      ['a new ignored file dims no later than the parent + 200 ms', (r) => le(r.head.newLog, r.parent.newLog + IGNORE_SLACK_MS)],
      ['a rule added shows no later than the parent + 200 ms (or the parent never showed it)', (r) => (r.parent.ruleAdd === null && r.parent.ruleAddNever > 0 ? num(r.head.ruleAdd) : le(r.head.ruleAdd, r.parent.ruleAdd + IGNORE_SLACK_MS))],
      ['a rule taken away shows no later than the parent + 200 ms (or the parent never showed the rule)', (r) => (r.parent.ruleRemove === null && r.parent.ruleAddNever > 0 ? num(r.head.ruleRemove) : le(r.head.ruleRemove, r.parent.ruleRemove + IGNORE_SLACK_MS))],
      ['at HEAD a rule added always shows', (r) => (r.head.ruleAddNever ?? 0) === 0],
      ['no frame draws a must-dim row undimmed', (r) => r.head.bad === 0]
    ]
  },
  RUN: {
    title: 'the run: the preflights, the hidden agents, the census, every pid ended, his history, no leftover',
    reads: ['preflight.ok', 'launches', 'agentsHeld', 'censusFailures', 'processTableRead', 'electronsLeft', 'leftovers', 'history', 'loads'],
    needs: [['the process table was read', (r) => r.processTableRead === true], ['at least one app was launched', (r) => r.launches >= 1]],
    clauses: [
      ['every preflight held', (r) => r.preflight.ok === true],
      ['every launch’s agents:list resolved nothing', (r) => r.agentsHeld.length === r.launches && r.agentsHeld.every((x) => x === true)],
      ['the census found nothing of the run on his server', (r) => r.censusFailures.length === 0],
      ['no Electron of the run left', (r) => r.electronsLeft === 0],
      ['no process naming a run folder was left to end', (r) => r.leftovers.length === 0],
      ['his shell history unmoved, or moved by his own terminal', (r) => historyHeld(r.history) === 'unmoved' || historyHeld(r.history) === 'his terminal'],
      // REVIEW: as first built a memory reading that never came (null) passed this clause.
      ['the load and the memory were read beside every timed cell', (r) => r.loads.every((l) => num(l.load) && num(l.mem))]
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

/** One grader's verdict: pass, fail or unreadable. An absent field or an unmet need is UNREADABLE and no clause is asked. */
export function grade(id, reading) {
  const g = GRADERS[id];
  const missing = g.reads.filter((path) => !present(reading, path)).map(missingField);
  if (missing.length === 0) for (const [name, predicate] of g.needs) if (!holds(predicate, reading)) missing.push(name);
  if (missing.length > 0) return { verdict: 'unreadable', ok: null, failed: [], missing };
  const failed = g.clauses.filter(([, predicate]) => !holds(predicate, reading)).map(([name]) => name);
  return { verdict: failed.length === 0 ? 'pass' : 'fail', ok: failed.length === 0, failed, missing: [] };
}

// ---------------------------------------------------------------------------
// --grader-self-test. Starts nothing.
// ---------------------------------------------------------------------------

export const FIXTURES_DIR = join(ROOT, 'build', 'p372', 'fixtures');

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
 * What turns one recorded launch into another: its build and block named, a
 * cell's thread scaled (`taskMs` moved toward its own idle window by `factor`)
 * or moved by `addMs`, its latencies moved, a counter set on every change of a
 * kind, a cell taken away, one size's cells and counts taken from another
 * recorded launch, a field set or deleted.
 */
function editLaunch(l, e) {
  const cells = (l.cells ?? []).filter((c) => (e.n === undefined || c.n === e.n) && (e.kind === undefined || c.kind === e.kind));
  if (e.build !== undefined) l.build = e.build;
  if (e.block !== undefined) l.block = e.block;
  if (e.scaleThread !== undefined) for (const c of cells) for (const r of c.rows) r.taskMs = Math.round(r.idleTaskMs + (r.taskMs - r.idleTaskMs) * e.scaleThread);
  if (e.addThread !== undefined) for (const c of cells) for (const r of c.rows) r.taskMs += e.addThread;
  if (e.addLatency !== undefined) for (const c of cells) for (const r of c.rows) if (num(r.latencyMs)) r.latencyMs += e.addLatency;
  if (e.dropCell === true) l.cells = (l.cells ?? []).filter((c) => !cells.includes(c));
  if (e.take !== undefined) {
    const from = JSON.parse(readFileSync(join(FIXTURES_DIR, 'raw', e.take.file), 'utf8'));
    l.cells = [...(l.cells ?? []).filter((c) => c.n !== e.take.n), ...from.cells.filter((c) => c.n === e.take.n)];
    l.counts = [...(l.counts ?? []).filter((c) => c.n !== e.take.n), ...from.counts.filter((c) => c.n === e.take.n)];
  }
  if (e.count !== undefined) for (const c of (l.counts ?? []).filter((x) => (e.n === undefined || x.n === e.n) && (e.kind === undefined || x.kind === e.kind))) for (const p of c.per) p[e.count] = e.value;
  if (e.set !== undefined || e.delete !== undefined) applyOps(l, [e]);
  return l;
}
/** One raw fixture's input: launches read from fixtures/raw/ by file, each with its edits. */
function rawOf(spec) {
  const launches = (spec.launches ?? []).map((x) => {
    const l = structuredClone(x.file === undefined ? x.launch : JSON.parse(readFileSync(join(FIXTURES_DIR, 'raw', x.file), 'utf8')));
    for (const e of x.edits ?? []) editLaunch(l, e);
    return l;
  });
  return { arm: spec.arm, launches };
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
  const honest = {};
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
  // 1. The recorded raw input through THE ONE READER: its numbers as recorded, and its verdict.
  let values = 0;
  for (const c of fx.raw) {
    let reading;
    try {
      reading = derive(rawOf(c.raw));
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
    if (c.honestFor !== undefined) honest[c.honestFor] = reading;
    if (c.grader !== undefined) judge(c.grader, c.name, c.verdict, c.names, () => reading);
  }
  if (fx.honestRun !== undefined) honest.RUN = fx.honestRun;
  // 2. Every grader's honest reading passes; every broken one fails exactly the clauses it names; every unreadable one the needs.
  for (const id of Object.keys(GRADERS)) {
    if (honest[id] === undefined) say(false, `${id} has no honest reading`);
    else judge(id, 'its honest reading', 'pass', [], () => structuredClone(honest[id]));
  }
  for (const c of fx.broken) judge(c.grader, c.name, 'fail', c.mustFail, () => applyOps(structuredClone(honest[c.grader]), c.ops));
  for (const c of fx.unreadable) judge(c.grader, c.name, 'unreadable', c.mustMiss, () => applyOps(structuredClone(honest[c.grader]), c.ops));
  // 3. The pure helpers.
  {
    const g = gateCell(500, [[200, 210, 190], [230, 220, 240]], [[60, 70], [65, 75]]);
    say(g.noise === 30 && g.notHigher && g.lower && g.bothPairs, `D11 at 500: noise is the parent's two block medians apart (${String(g.noise)}), and HEAD well under passes all three`);
    const q = gateCell(10, [[20, 21], [22, 23]], [[29, 30], [31, 33]]);
    say(q.noise === NOISE_FLOOR_MS && q.notHigher === true && q.lower === null, 'D11 at 10: the noise is floored at 10 ms, HEAD 9 ms higher is not higher, and no "lower" is asked');
    const r = gateCell(100, [[50], [52]], [[45], [44]]);
    say(r.lower === false && r.notHigher === true, 'D11 at 100: HEAD 6 ms lower is not lower than the parent − noise');
    const s = gateCell(500, [[200], [100]], [[120], [101]]);
    say(s.bothPairs === false, 'D11 at 500: a block pair where HEAD is not below the parent fails both pairs');
    say(threadOf({ taskMs: 30, idleTaskMs: 12 }) === 18 && threadOf({ taskMs: 30 }) === null, 'the thread a change is its window less the idle window after it, and unread without one');
    const files = new Map([['a.js', 'x function readDir(dirPath){const fn=1;}'], ['b.js', 'listeners.forEach(listener=>listener(state,previousState))\nfunction treeInputOf(entriesByDir,rootPath){const p=1}const fed=fedRef.current;const next=treeInput.paths;sync(target,paths,linkFolders){if(a)}function useTreeModel(o){const x=1;const entriesByDir=2']]);
    const a = locateAnchors(files);
    say(a.every((x) => x.ok) && a.find((x) => x.key === 'read').column === 'x function readDir(dirPath){'.length && a.find((x) => x.key === 'input').line === 1, 'the six anchors are found by text, each at its own statement');
    const twice = new Map([...files, ['c.js', 'function readDir(dirPath){const q=1}']]);
    say(locateAnchors(twice).find((x) => x.key === 'read').ok === false, 'an anchor found twice is refused');
    const gone = new Map([['a.js', 'nothing here']]);
    say(locateAnchors(gone).every((x) => x.ok === false), 'an anchor not found is refused');
    const anchor = { line: 5, column: 100, statementEnd: 120 };
    const inner = locateAnchors(new Map([['i.js', 'function treeInputOf(entriesByDir,rootPath){const paths=new Set;const kinds=1}']])).find((x) => x.key === 'input');
    say(inner.statementEnd - inner.column === 'const paths=new Set'.length && resolvedAtOwn(inner, [{ lineNumber: 0, columnNumber: inner.column + 12 }]) && !resolvedAtOwn(inner, [{ lineNumber: 0, columnNumber: inner.statementEnd + 1 }]), 'a counter V8 places on a call inside its own statement (the parent\'s treeInputOf, 12 columns in) is at its own statement, and one past the statement\'s end is not');
    say(resolvedAtOwn(anchor, [{ lineNumber: 5, columnNumber: 100 }]) && resolvedAtOwn(anchor, [{ lineNumber: 5, columnNumber: 120 }]) && !resolvedAtOwn(anchor, [{ lineNumber: 5, columnNumber: 121 }]) && !resolvedAtOwn(anchor, [{ lineNumber: 5, columnNumber: 99 }]) && !resolvedAtOwn(anchor, [{ lineNumber: 6, columnNumber: 100 }]) && !resolvedAtOwn(anchor, []) && !resolvedAtOwn(anchor, [{ lineNumber: 5, columnNumber: 100 }, { lineNumber: 9, columnNumber: 1 }]), 'a counter resolved anywhere but its own statement, or in two places, is refused');
    say(historyHeld({ before: 'a', after: 'a' }) === 'unmoved' && historyHeld({ before: 'a', after: 'b', quiet: null }) === 'unread' && historyHeld({ before: 'a', after: 'b', quiet: { again: 'b' } }) === 'held' && historyHeld({ before: 'a', after: 'b', quiet: { again: 'c' } }) === 'his terminal', 'his history reads unmoved, unread, held and his terminal');
    say(eventsOf([{ fn: 'mkdir', a: '/r/0ops-a', end: 100 }], [{ path: '0ops-a/', t: 130, present: true }], '/r', '0ops-a').map((e) => J(e)).join() === J({ key: '1 mkdir <dir>/ drawn', ms: 30 }), 'an event in main is matched to the first frame after it that draws its row');
    say(eventsOf([{ fn: 'rename', a: '/r/0ops-a/x.md', b: '/r/0ops-a/y.md', end: 100 }], [{ path: '0ops-a/x.md', t: 90, present: true }, { path: '0ops-a/y.md', t: 80, present: false }, { path: '0ops-a/y.md', t: 120, present: true }, { path: '0ops-a/x.md', t: 140, present: false }], '/r', '0ops-a').map((e) => `${e.key}=${String(e.ms)}`).join() === '1 rename <dir>/y_md drawn=20,2 rename <dir>/x_md gone=40', 'a rename is two events, the new row drawn and the old row gone, each read from the rename on');
    say(eventsOf([{ fn: 'trash', a: '/r/0ops-a/x.md', end: 100 }], [{ path: '0ops-a/x.md', t: 10, present: true }, { path: '0ops-a/x.md', t: 95, present: false }], '/r', '0ops-a')[0].ms === 0, 'a row the tree already took away before main answered reads 0, never the next time it goes');
    say(eventsOf([{ fn: 'open', a: '/r/0ops-a/inner/z.md', flags: 'wx', end: 100 }, { fn: 'open', a: '/r/0ops-a/z.md', flags: 'r', end: 100 }], [], '/r', '0ops-a').length === 0, 'an event inside the folder the tree does not open, and a read, are no events');
  }
  // 4. A MISSING READING IS NEVER A PASS: every field a grader reads, deleted alone, answers UNREADABLE naming it.
  let swept = 0;
  for (const [id, g] of Object.entries(GRADERS)) {
    for (const path of g.reads) {
      swept += 1;
      const r = structuredClone(honest[id] ?? {});
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
  process.stdout.write(failures === 0 ? `[p372] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses each shown red alone, ${String(needs)} needs each shown unreadable alone, ${String(swept)} fields that answer UNREADABLE when missing, ${String(fx.raw.length)} raw inputs (${String(values)} values) through the one reader.\n` : `[p372] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

/**
 * O's events, pure: every create or removal main made under the drive's folder
 * (`fn` mkdir, open with a writing flag, rename, cp, trash), matched to the
 * first painted frame after it that draws its row (or no longer does).
 * Anything under `inner/`, which the tree is never asked to open, is no event.
 */
export function eventsOf(fsops, transitions, repo, dir) {
  const out = [];
  const rel = (abs) => (typeof abs === 'string' && abs.startsWith(`${repo}/`) ? abs.slice(repo.length + 1) : null);
  const watched = (p) => p !== null && (p === dir || p.startsWith(`${dir}/`)) && !p.startsWith(`${dir}/inner/`);
  const rowOf = (p, isDir) => (isDir ? `${p}/` : p);
  // A row the tree already showed in the wanted state when main's call answered
  // (an optimistic move) reads 0; otherwise the first frame after it that does.
  const stateAt = (row, t) => {
    let st = false;
    for (const x of transitions) if (x.path === row && x.t <= t) st = x.present;
    return st;
  };
  const after = (row, present, t) => transitions.find((x) => x.path === row && x.present === present && x.t >= t);
  let i = 0;
  const add = (row, present, end, fn) => {
    i += 1;
    const hit = stateAt(row, end) === present ? { t: end } : after(row, present, end);
    // Keyed by order and by the row INSIDE the drive's folder, so two runs in two folders name one event alike.
    // No dot in a key, so a reading's path can name it.
    out.push({ key: `${String(i)} ${fn} <dir>${row.slice(dir.length)} ${present ? 'drawn' : 'gone'}`.replace(/\./g, '_'), ms: hit === undefined ? null : hit.t - end });
  };
  for (const op of fsops) {
    const a = rel(op.a);
    const b = rel(op.b);
    if (op.fn === 'mkdir' && watched(a)) add(rowOf(a, true), true, op.end, 'mkdir');
    else if (op.fn === 'open' && watched(a) && /[wa]/.test(String(op.flags ?? ''))) add(a, true, op.end, 'open');
    else if (op.fn === 'cp' && watched(b)) add(b, true, op.end, 'cp');
    else if (op.fn === 'trash' && watched(a)) add(rowOf(a, op.dir === true), false, op.end, 'trash');
    else if (op.fn === 'rename') {
      if (watched(b)) add(rowOf(b, op.dir === true), true, op.end, 'rename');
      if (watched(a)) add(rowOf(a, op.dir === true), false, op.end, 'rename');
    }
  }
  return out;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
if (process.argv.includes('--list-graders')) {
  process.stdout.write(`${J(Object.fromEntries(Object.entries(GRADERS).map(([id, g]) => [id, { title: g.title, reads: g.reads, needs: g.needs.map(([n]) => n), clauses: g.clauses.map(([n]) => n) }])), null, 1)}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// --preflight: the builds, the anchors and the helpers. Starts nothing.
// ---------------------------------------------------------------------------

const list = (name) => (process.env[name] ?? '').split(',').map((x) => x.trim()).filter((x) => x !== '');
const PARENT = (process.env['P372_PARENT_CHECKOUT'] ?? '').trim();
const HEAD_ONLY = (process.env['P372_HEAD_ONLY'] ?? '') === '1';
const PARENT_ONLY = (process.env['P372_PARENT_ONLY'] ?? '') === '1';
const NS = list('P372_NS').length > 0 ? list('P372_NS').map(Number) : [...SIZES];
const BLOCKS = Number(process.env['P372_BLOCKS'] ?? '2');
const REPS = Number(process.env['P372_REPS'] ?? '8');
const DEVELOPMENT = HEAD_ONLY || PARENT_ONLY || J(NS) !== J([...SIZES]) || BLOCKS !== 2 || REPS !== 8;
const HEAD = ROOT;
const ARMS = list('P372_ARMS').length > 0 ? list('P372_ARMS') : [...DEFAULT_ARMS];
const KEEP = (process.env['P372_KEEP'] ?? '') === '1';
/** SPEC §10's attack: the same blocks with HEAD launched first in each. */
const HEAD_FIRST = (process.env['P372_HEAD_FIRST'] ?? '') === '1';
const BUILDS = (HEAD_FIRST ? ['head', 'parent'] : ['parent', 'head']).filter((b) => !(HEAD_ONLY && b === 'parent') && !(PARENT_ONLY && b === 'head'));
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
/** Every .js of a build's renderer assets, by name. */
function rendererAssets(checkout) {
  const dir = join(checkout, 'out', 'renderer', 'assets');
  try {
    return new Map(readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => [f, readFileSync(join(dir, f), 'utf8')]));
  } catch {
    return new Map();
  }
}

function preflightChecks() {
  const out = [];
  const check = (ok, yes, no) => out.push({ ok, said: ok ? yes : no });
  const strange = ARMS.filter((a) => ARM_SPECS[a] === undefined);
  check(strange.length === 0, `the arms are ${ARMS.join(', ')}`, `P372_ARMS names ${J(strange)}, which are no arms (${DEFAULT_ARMS.join(', ')})`);
  check(NS.every((n) => SIZES.includes(n)), `the repositories are ${NS.join(', ')} folders`, `P372_NS names ${J(NS)}; the sizes are ${SIZES.join(', ')}`);
  check(BLOCKS === 1 || BLOCKS === 2, `${String(BLOCKS)} block(s)`, `P372_BLOCKS is ${String(BLOCKS)}, not 1 or 2`);
  check(Number.isInteger(REPS) && REPS >= 1, `${String(REPS)} changes a cell a block`, `P372_REPS is ${String(REPS)}`);
  const SOURCES = ['src/renderer/tree/store.ts', 'src/renderer/tree/use-tree-model.ts', 'src/renderer/tree/ignored.ts', 'src/renderer/tree/fs-bridge.ts', 'src/renderer/tree/tree-paths.ts', 'src/renderer/tree/FilesSection.tsx'];
  const built = (who, checkout, wantMark) => {
    const html = join(checkout, 'out', 'renderer', 'index.html');
    check(existsSync(join(checkout, 'out', 'main', 'index.js')) && existsSync(html), `${who} is built`, `${who} has no out/main/index.js or out/renderer/index.html: build it first`);
    if (!existsSync(html)) return;
    const old = SOURCES.filter((f) => existsSync(join(checkout, f)) && statSync(join(checkout, f)).mtimeMs > statSync(html).mtimeMs);
    check(old.length === 0, `${who}'s out/ is newer than the files this phase moves`, `${who}'s out/ is older than ${J(old)}: build it again, or the run measures a tree that is gone`);
    const assets = rendererAssets(checkout);
    const marked = [...assets.values()].some((t) => t.includes(PHASE_MARK));
    check(marked === wantMark, wantMark ? `${who}'s renderer carries this phase` : `${who}'s renderer does not carry this phase`, wantMark ? `${who}'s renderer does not hold ${J(PHASE_MARK)}: npm run build` : `${who}'s renderer holds ${J(PHASE_MARK)}, so it is not the parent`);
    for (const a of locateAnchors(assets)) check(a.ok, `${who}'s counter ${a.key} is at ${String(a.file)}:${String(a.line)}:${String(a.column)}`, `${who}'s counter ${a.key}: ${String(a.said)}`);
  };
  if (BUILDS.includes('parent')) {
    if (PARENT === '') check(false, '', `P372_PARENT_CHECKOUT is not set: the parent (${PARENT_SNAPSHOT}, built) runs first`);
    else {
      const p = resolve(PARENT);
      check(p !== ROOT, 'the parent is not this checkout', 'P372_PARENT_CHECKOUT is this checkout');
      const rev = revisionOf(p);
      check(rev !== null, `the parent ${p} is ${String(rev).slice(0, 8)}${String(rev).startsWith(PARENT_SNAPSHOT) ? '' : ` (the phase was measured against ${PARENT_SNAPSHOT})`}`, `the parent ${p} is not a git checkout this reader can read`);
      built('the parent', p, false);
    }
  }
  if (BUILDS.includes('head')) built('HEAD', HEAD, true);
  check(existsSync(join(ROOT, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')), 'the development Electron is here', 'node_modules/electron/dist/Electron.app is missing');
  for (const f of ['build/electron-run.mjs', 'build/harness-socket.mjs', 'build/hidden-agents.mjs', 'build/cdp-client.mjs', 'build/cdp-target.mjs', 'build/p372/fixtures/graders.json']) check(existsSync(join(ROOT, f)), `${f} is here`, `${f} is missing`);
  for (const f of ['/bin/sh', '/bin/ps', '/usr/bin/git', '/usr/bin/memory_pressure', '/usr/sbin/sysctl']) check(existsSync(f), `${f} is here`, `${f} is missing`);
  return out;
}

if (process.argv.includes('--preflight')) {
  const checks = preflightChecks();
  for (const c of checks) process.stdout.write(`[p372] ${c.ok ? 'ok     ' : 'REFUSED'} ${c.said}\n`);
  const bad = checks.filter((c) => !c.ok).length;
  process.stdout.write(bad === 0 ? `[p372] preflight PASS: ${String(checks.length)} checks\n` : `[p372] preflight REFUSED: ${String(bad)} of ${String(checks.length)} checks\n`);
  process.exit(bad === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The run: the refusals, the scratch world, the bookkeeping
// ---------------------------------------------------------------------------

const TAG = '[p372]';
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
if (!SOCKET.startsWith('gmux-p372')) refuse(`${J(SOCKET)} is not a gmux-p372 harness socket. Run \`npm run probe:p372\`, which wraps this file in build/harness-socket.mjs.`);
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR. Run `npm run probe:p372`.');
/** REVIEW: this run's own name, carried by every launch's raw input (sessionOf). */
const RUN_ID = `${SOCKET}-${String(process.pid)}-${String(t0)}`;
const PREFLIGHT = preflightChecks();
{
  const bad = PREFLIGHT.filter((c) => !c.ok);
  if (bad.length > 0) refuse(bad.map((c) => c.said).join('; '));
}
mkdirSync(join(HARNESS_DIR, 'p372'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p372'));
if (/['"\s\\]/.test(RUN)) refuse(`the scratch path ${J(RUN)} holds a quote, a space or a backslash`);
const REPORT = (process.env['P372_REPORT'] ?? '').trim() || join(HARNESS_DIR, 'report', 'probe-p372.json');
if (resolve(REPORT).startsWith(`${ROOT}/`)) refuse(`the report ${REPORT} is inside the checkout`);
mkdirSync(dirname(REPORT), { recursive: true });

const report = { head: HEAD, headSha: revisionOf(HEAD), parent: PARENT === '' ? null : resolve(PARENT), parentSha: PARENT === '' ? null : revisionOf(resolve(PARENT)), socket: SOCKET, development: DEVELOPMENT, ns: NS, blocks: BLOCKS, reps: REPS, arms: [], readings: {}, launches: [] };
let failures = 0;
let unreadable = 0;
let stopWith = 0;
const cannotRead = (id, why) => {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  say(`UNREADABLE ${id}: ${why}`);
};
function judgeArm(id, reading) {
  report.readings[id] = reading;
  const g = grade(id, reading);
  if (g.verdict === 'unreadable') cannotRead(id, `${GRADERS[id].title}; could not read ${J(g.missing)}`);
  else {
    report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
    if (!g.ok) failures += 1;
    say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
  }
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
/** Nothing starts under 20 percent free with swap growing; his own work moves the number, so it is read for ten minutes. */
async function memoryGate() {
  let free = memoryFree();
  const swap0 = swapUsedMb();
  for (let i = 0; i < 10 && free !== null && free < MEMORY_FLOOR; i += 1) {
    say(`memory reads ${String(free)}% free, under ${String(MEMORY_FLOOR)}: starting nothing, reading again in a minute (swap used ${String(swapUsedMb())} MB)`);
    await sleep(60_000);
    free = memoryFree();
  }
  if (free !== null && free < MEMORY_FLOOR && (swapUsedMb() ?? 0) > (swap0 ?? 0)) throw new Refusal(`memory still reads ${String(free)}% free after ten minutes with swap growing, starting nothing`, 3);
  return free;
}
/** Before every timed cell (SPEC §0): above 40 wait 2 minutes, up to 20, then run and say so. */
const loadsRead = [];
async function loadGate(what) {
  let waited = 0;
  for (; loadavg()[0] > LOAD_CEILING && waited < LOAD_WAIT_MIN; waited += 2) {
    say(`${what}: the 1 minute load is ${loadavg()[0].toFixed(1)}, above ${String(LOAD_CEILING)}; waiting 2 minutes (${String(waited)} waited)`);
    await sleep(120_000);
  }
  const reading = { what, load: loadavg()[0], loads: loads(), waitedMin: waited, mem: memoryFree() };
  if (reading.load > LOAD_CEILING) say(`${what}: the load is still ${reading.load.toFixed(1)} after ${String(waited)} minutes; running it and saying so`);
  loadsRead.push(reading);
  return reading;
}
/** The whole table, asked again when `ps` did not answer one, and `''` when it never did. */
function psText(tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    const r = spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 20_000, maxBuffer: 64 << 20 });
    const text = String(r.stdout ?? '');
    if (r.status === 0 && /^\s*1\s+0\s/m.test(text)) return text;
  }
  return '';
}

const agentsHeld = [];
const censusFailures = [];
const appPids = [];
const leftovers = [];
let launches = 0;
/** Every launch's raw input, by build and block. */
const launchRaws = [];

// ---------------------------------------------------------------------------
// The world: three repositories a launch
// ---------------------------------------------------------------------------

const CLOSED = '/usr/bin:/bin:/usr/sbin:/sbin';
const pad = (i) => `d${String(i).padStart(4, '0')}`;

function makeRepo(base, n, home) {
  const dir = join(base, `r${String(n)}`);
  const env = { PATH: CLOSED, HOME: home, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = (args) => {
    const r = spawnSync('/usr/bin/git', args, { cwd: dir, encoding: 'utf8', env, timeout: 120_000 });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${String(r.stderr).slice(0, 200)}`);
    return r.stdout;
  };
  mkdirSync(join(dir, 'ignored'), { recursive: true });
  mkdirSync(join(dir, 'w'));
  mkdirSync(join(dir, '0x'));
  writeFileSync(join(dir, '.gitignore'), '*.log\nignored/\n');
  writeFileSync(join(dir, 'README.md'), '# fixture\n');
  writeFileSync(join(dir, 'root.log'), 'root\n');
  writeFileSync(join(dir, 'ignored', 'k.txt'), 'k\n');
  writeFileSync(join(dir, 'w', 'seed.txt'), 'seed\n');
  if (n === 10) writeFileSync(join(dir, 'ten.txt'), 'the ten\n');
  // INTEGRATOR: S's marker, a folder sorted above every other row so it is on screen (`ten.txt` sorts last, below the
  // rows the tree draws, so the first full run never saw the 10 shown at either build). Not remembered, so not cached.
  if (n === 10) {
    mkdirSync(join(dir, '00ten'));
    writeFileSync(join(dir, '00ten', 't.txt'), 'the ten\n');
  }
  // V's five folders: sorted above every d#### row, so on screen, and not remembered, so a refresh reads N+2.
  for (let i = 1; i <= 5; i += 1) {
    mkdirSync(join(dir, `0v${String(i)}`));
    writeFileSync(join(dir, `0v${String(i)}`, 'v.txt'), 'v\n');
  }
  for (let i = 1; i <= 20; i += 1) writeFileSync(join(dir, '0x', `f${String(i).padStart(2, '0')}.txt`), 'x\n');
  const dirs = Array.from({ length: n }, (_, i) => pad(i + 1));
  for (const d of dirs) {
    mkdirSync(join(dir, d));
    writeFileSync(join(dir, d, 'a.txt'), `${d}\n`);
    writeFileSync(join(dir, d, 'b.log'), `${d}\n`);
  }
  git(['init', '-q', '-b', 'main']);
  git(['add', '-A']);
  git(['-c', 'user.email=p372@example.invalid', '-c', 'user.name=p372', 'commit', '-q', '-m', 'fixture']);
  git(['checkout', '-q', '-b', 'other']);
  dirs.forEach((d, i) => {
    if (i % 2 === 0) writeFileSync(join(dir, d, 'c.txt'), 'other\n');
  });
  git(['add', '-A']);
  git(['-c', 'user.email=p372@example.invalid', '-c', 'user.name=p372', 'commit', '-q', '-m', 'other']);
  git(['checkout', '-q', 'main']);
  appendFileSync(join(dir, 'w', 'seed.txt'), 'since the commit\n');
  // Untracked, so a rule can ignore it (arm I).
  writeFileSync(join(dir, 'd0001', '0extra1.txt'), 'extra\n');
  // d0001 is drawn first and READ LAST (the cache's key order is the order the restore's answers landed in),
  // d0002 is read first after the root: the two ends of a refresh.
  return { dir, n, git, expanded: [...dirs.slice(1).map((d) => `${d}/`), 'w/', `${dirs[0]}/`] };
}

// ---------------------------------------------------------------------------
// The page's recorder, main's instruments
// ---------------------------------------------------------------------------

const RECORDER = `(() => {
  if (window.__p372) return true;
  const R = (window.__p372 = { changed: [], lates: [], long: [], watch: {}, n: {}, t: {}, timeline: [], tracked: [], forbid: null, must: null, frames: 0, ops: null });
  window.gmux.git.onChanged(() => { R.changed.push(Date.now()); });
  let last = performance.now();
  setInterval(() => { const t = performance.now(); const late = t - last - 10; last = t; if (late > 4) R.lates.push([Date.now(), late]); }, 10);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) R.long.push([performance.timeOrigin + e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: false }); } catch {}
  // REVIEW: every span the window was not visible, so a launch timed while hidden reads UNREADABLE (sessionOf).
  R.vis = { hidden: [], since: document.visibilityState === 'visible' ? null : Date.now() };
  document.addEventListener('visibilitychange', () => { const V = R.vis; if (document.visibilityState !== 'visible') { if (V.since === null) V.since = Date.now(); } else if (V.since !== null) { V.hidden.push([V.since, Date.now()]); V.since = null; } });
  window.__p372n = (k) => { R.n[k] = (R.n[k] || 0) + 1; (R.t[k] ||= []).push(Date.now()); return false; };
  const log = console.log.bind(console);
  console.log = (...a) => { try { const s = String(a[0]); if (s.startsWith('[shot-drive] treeOps result ')) R.ops = JSON.parse(s.slice('[shot-drive] treeOps result '.length)); } catch {} return log(...a); };
  const was = {};
  const frame = () => {
    const h = document.querySelector('file-tree-container');
    const s = h && h.shadowRoot;
    const t = Date.now();
    if (s) {
      R.frames += 1;
      const row = (p) => s.querySelector('[data-item-path="' + p + '"]');
      for (const k of Object.keys(R.watch)) {
        const w = R.watch[k];
        if (w.at !== null) continue;
        const r = row(w.path);
        const st = r ? (r.getAttribute('data-item-git-status') || 'none') : null;
        const ok = w.want === 'present' ? st !== null : w.want === 'absent' ? st === null : w.want === 'ignored' ? st === 'ignored' : st !== null && st !== 'ignored';
        if (ok) w.at = t;
      }
      for (const p of R.tracked) { const present = row(p) !== null; if (was[p] !== present) { was[p] = present; R.timeline.push({ path: p, t, present }); } }
      if (R.forbid !== null) {
        const F = R.forbid;
        if (!F.shown && row(F.marker) !== null) F.shown = true;
        if (F.shown && !F.done) {
          F.frames += 1;
          for (const r of s.querySelectorAll('[data-item-path]')) {
            const p = r.getAttribute('data-item-path');
            const m = /^d(\\d{4})\\//.exec(p);
            if ((m && Number(m[1]) > F.maxD) || F.extra.some((x) => p === x || p.startsWith(x))) { F.bad += 1; if (F.examples.length < 5) F.examples.push(p); break; }
          }
        }
      }
      if (R.must !== null) {
        const M = R.must;
        M.frames += 1;
        for (const p of M.paths) { const r = row(p); if (r && (r.getAttribute('data-item-git-status') || 'none') !== 'ignored') { M.bad += 1; break; } }
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return true;
})()`;

/**
 * Main's instruments, installed once a launch through its inspector. `repos`
 * are the launch's own repositories: nothing outside them is recorded, held or
 * trashed. A read is recorded only for a folder a hold has named.
 */
const mainInstall = (repos, trashDir) => `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const p = load('node:fs/promises');
  const fs = load('node:fs');
  const path = load('node:path');
  if (globalThis.__p372m) return globalThis.__p372m.trashOk;
  const M = (globalThis.__p372m = { reads: [], fsops: [], hold: null, holdMs: 0, track: new Set(), trashOk: false, repos: ${J(repos)} });
  const mine = (x) => typeof x === 'string' && M.repos.some((r) => x.startsWith(r + '/'));
  const orig = {};
  orig.readdir = p.readdir;
  p.readdir = async function (dir, opts) {
    const s = String(dir);
    const one = M.track.has(s) ? { path: s, start: Date.now(), end: null, held: false } : null;
    if (one) M.reads.push(one);
    if (one && M.hold === s) { one.held = true; await new Promise((r) => setTimeout(r, M.holdMs)); }
    try { return await orig.readdir.call(this, dir, opts); } finally { if (one) one.end = Date.now(); }
  };
  for (const fn of ['mkdir', 'open', 'rename', 'cp']) {
    orig[fn] = p[fn];
    p[fn] = async function (a, b, ...rest) {
      const out = await orig[fn].call(this, a, b, ...rest);
      const A = String(a);
      if (mine(A) || mine(String(b))) {
        let dir = false;
        try { dir = fn === 'rename' && fs.statSync(String(b)).isDirectory(); } catch {}
        M.fsops.push({ fn, a: A, b: typeof b === 'string' ? b : null, flags: fn === 'open' ? String(b ?? 'r') : null, dir, end: Date.now() });
      }
      return out;
    };
  }
  const shell = load('electron').shell;
  let n = 0;
  const stand = async (item) => {
    const s = String(item);
    if (!mine(s)) throw new Error('p372: a trash outside the run is refused');
    n += 1;
    let dir = false;
    try { dir = fs.statSync(s).isDirectory(); } catch {}
    fs.renameSync(s, path.join(${J(trashDir)}, String(n) + '-' + path.basename(s)));
    M.fsops.push({ fn: 'trash', a: s, b: null, flags: null, dir, end: Date.now() });
  };
  try { shell.trashItem = stand; } catch {}
  M.trashOk = shell.trashItem === stand;
  return M.trashOk;
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
async function mainCdp(handle) {
  const until = Date.now() + 60_000;
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) {
      try {
        return await wsConnect(m[1], { collect: [] });
      } catch {
        /* not yet */
      }
    }
    if (Date.now() > until) throw new Error('no main inspector');
    await sleep(300);
  }
}
async function mainEval(cdp, expression) {
  const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, 30_000);
  if (r.result?.exceptionDetails) throw new Error(`main threw: ${J(r.result.exceptionDetails).slice(0, 300)}`);
  return r.result?.result?.value;
}

const STRIPPED = /^(?:CLAUDECODE|CLAUDE_|P372_)|^(?:GMUX_CONFIG_ROOT|TERM_SESSION_ID|TERM_PROGRAM|TERM_PROGRAM_VERSION|SSH_AUTH_SOCK|TMUX|TMUX_PANE|GMUX_SESSION_ID|GMUX_MANAGED|SECURITYSESSIONID|GH_TOKEN|GITHUB_TOKEN)$/;

/**
 * One app of `build`, on a world of its own under the run folder. Whatever
 * `body` does, the helper ends the app, and anything left naming the world is
 * ended by pid, its command line read again first, and COUNTED as a leftover.
 */
async function withApp(label, build, body) {
  const base = join(RUN, label);
  const checkout = checkoutOf(build);
  rmSync(base, { recursive: true, force: true });
  const w = { base, home: join(base, 'h'), profile: join(base, 'p'), trash: join(base, 'trash') };
  for (const d of [w.home, w.profile, w.trash]) mkdirSync(d, { recursive: true });
  for (const f of ['.profile', '.zprofile', '.zshenv', '.zshrc', '.bash_profile']) writeFileSync(join(w.home, f), `PATH=${CLOSED}\nexport PATH\n`);
  writeFileSync(join(w.home, '.hushlogin'), '');
  writeHiddenAgents(w.profile, 'p372', hiddenAgentsBesides([]));
  const env = withoutDevRenderer({
    ...Object.fromEntries(Object.keys(process.env).filter((n) => STRIPPED.test(n)).map((n) => [n, undefined])),
    HOME: w.home,
    ZDOTDIR: w.home,
    HISTFILE: '/dev/null',
    SHELL: '/bin/sh',
    PATH: CLOSED,
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
    if (where !== '/usr/bin/git') throw new Refusal(`the login shell the app will ask resolves git to ${J(where)}, not /usr/bin/git`);
  }
  const repos = new Map(NS.map((n) => [n, makeRepo(base, n, w.home)]));
  const memory = await memoryGate();
  launches += 1;
  say(`LAUNCH ${label} at the ${build}: load ${J(loads())}, memory ${String(memory)}% free, swap ${String(swapUsedMb())} MB`);
  let ctx = null;
  try {
    await withElectron(
      {
        label: `p372-${label}`,
        userDataDir: w.profile,
        tmuxSocket: SOCKET,
        cwd: checkout,
        program: 'app',
        args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
        env,
        graceMs: 15_000,
        ceilingMs: 90 * 60 * 1000
      },
      async (handle) => {
        appPids.push(handle.pid);
        const cdp = await appWindow(w.profile);
        const main = await mainCdp(handle);
        try {
          await cdp.call('Runtime.enable');
          await cdp.call('Page.enable');
          const perf = await cdp.call('Performance.enable', { timeDomain: 'threadTicks' });
          if (perf.error !== undefined) throw new Refusal(`Performance.enable in threadTicks answered ${J(perf.error)}`);
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
          const trashOk = await mainEval(main, mainInstall([...repos.values()].map((r) => r.dir), w.trash));
          ctx = makeContext({ w, cdp, main, build, checkout, repos, trashOk });
          await body(ctx);
        } finally {
          try {
            await mainEval(main, '(globalThis.__p372m && (globalThis.__p372m.hold = null), true)');
          } catch {
            /* gone */
          }
          cdp.close();
          main.close();
        }
      }
    );
  } catch (err) {
    const why = String(err?.message ?? err);
    if (why.includes(CENSUS_WORDS)) censusFailures.push(`${label}: ${why.slice(0, 300)}`);
    throw err;
  } finally {
    const naming = () => psText().split('\n').filter((l) => l.includes(`${base}/`)).map((l) => Number(l.trim().split(/\s+/)[0]));
    for (let i = 0; i < 75 && naming().length > 0; i += 1) await sleep(200);
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
    if (!KEEP) rmSync(base, { recursive: true, force: true });
    await sleep(1_000);
  }
}

/** What an arm is handed: the page, main, the repositories and the waits. */
function makeContext({ w, cdp, main, build, checkout, repos, trashOk }) {
  const ev = (expr, timeoutMs = 120_000) => cdpEval(cdp, expr, timeoutMs);
  const ctx = {
    w,
    cdp,
    main,
    build,
    checkout,
    repos,
    trashOk,
    ev,
    async metrics() {
      const r = await cdp.call('Performance.getMetrics');
      const m = Object.fromEntries((r.result?.metrics ?? []).map((x) => [x.name, x.value]));
      // REVIEW: a metric CDP did not answer is null, never 0 (a 0 read as HEAD's thread would pass D11).
      return { task: num(m.TaskDuration) ? m.TaskDuration * 1000 : null, script: num(m.ScriptDuration) ? m.ScriptDuration * 1000 : null };
    },
    pageWindow: (from, to) => ev(`(() => { const R = window.__p372; const l = R.lates.filter((x) => x[0] >= ${from} && x[0] <= ${to}); const lt = R.long.filter((x) => x[0] >= ${from} && x[0] <= ${to}); return { blocked: Math.round(l.reduce((a, x) => a + x[1], 0)), longest: Math.round(l.reduce((a, x) => Math.max(a, x[1]), 0)), longTasks: lt.length, changed: R.changed.filter((t) => t >= ${from} && t <= ${to}).length }; })()`),
    watch: (key, path, want) => ev(`(window.__p372.watch[${J(key)}] = { path: ${J(path)}, want: ${J(want)}, at: null }, true)`),
    watched: (key) => ev(`(() => { const w = window.__p372.watch[${J(key)}]; return w ? w.at : null; })()`),
    async waitWatched(key, forMs) {
      const until = Date.now() + forMs;
      for (;;) {
        const v = await ctx.watched(key);
        if (v !== null) return v;
        if (Date.now() > until) return null;
        await sleep(50);
      }
    },
    hold: (dir, ms = HOLD_MS) => mainEval(main, `(globalThis.__p372m.track.add(${J(dir)}), globalThis.__p372m.holdMs = ${String(ms)}, globalThis.__p372m.hold = ${J(dir)}, true)`),
    unhold: () => mainEval(main, '(globalThis.__p372m.hold = null, true)'),
    mainReads: (dir) => mainEval(main, `globalThis.__p372m.reads.filter((r) => r.path === ${J(dir)})`),
    dropMainLog: () => mainEval(main, '(globalThis.__p372m.reads = [], globalThis.__p372m.fsops = [], true)'),
    async show(repo, settleMs) {
      await ev(`(window.__p372.watch.first = { path: 'd0001/a.txt', want: 'present', at: null }, true)`);
      await ev(`window.__gmuxShotDrive(${J({ projectPath: repo.dir, localStorage: { [`gmux.treeOpen.${repo.dir}`]: J(repo.expanded) }, sidebarView: 'explorer' })}).then(() => true)`, 300_000);
      const first = await ctx.waitWatched('first', 120_000);
      await sleep(settleMs);
      return first;
    },
    /** The counters on: six conditional breakpoints, each resolved where its anchor is, or the run is refused. */
    async countersOn() {
      await cdp.call('Debugger.enable');
      const ids = [];
      const anchors = locateAnchors(rendererAssets(checkout));
      const out = [];
      for (const a of anchors) {
        if (!a.ok) throw new Refusal(`counter ${a.key}: ${a.said}`);
        const r = await cdp.call('Debugger.setBreakpointByUrl', { urlRegex: `${a.file.replace(/[.$]/g, '\\$&')}$`, lineNumber: a.line, columnNumber: a.column, condition: CONDITIONS[a.key] });
        const locations = r.result?.locations ?? [];
        if (r.result?.breakpointId) ids.push(r.result.breakpointId);
        const resolved = resolvedAtOwn(a, locations);
        out.push({ key: a.key, file: a.file, line: a.line, column: a.column, statementEnd: a.statementEnd, ok: true, resolved, locations: locations.map((l) => ({ line: l.lineNumber, column: l.columnNumber })) });
        say(`counter ${a.key} at ${a.file}:${String(a.line)}:${String(a.column)} resolved at ${J(locations.map((l) => [l.lineNumber, l.columnNumber]))}`);
        if (!resolved) throw new Refusal(`counter ${a.key} at ${a.file}:${String(a.line)}:${String(a.column)} resolved at ${J(locations)}, not its own statement`);
      }
      ctx.breakpoints = ids;
      return out;
    },
    async countersOff() {
      for (const id of ctx.breakpoints ?? []) await cdp.call('Debugger.removeBreakpoint', { breakpointId: id });
      ctx.breakpoints = [];
      await cdp.call('Debugger.disable');
    },
    resetCounts: () => ev('(window.__p372.n = {}, window.__p372.t = {}, true)'),
    counts: () => ev('({ n: window.__p372.n, t: window.__p372.t })'),
    cacheHas: (abs) => ev(`(() => { const c = window.__p372cache; return c ? Object.prototype.hasOwnProperty.call(c, ${J(abs)}) : null; })()`)
  };
  return ctx;
}

// ---------------------------------------------------------------------------
// The arms, one launch at a time
// ---------------------------------------------------------------------------

/** One change of `kind` in `repo`; for a new file, its row is watched first. */
async function change(ctx, repo, kind, seq) {
  if (kind === 'same') {
    appendFileSync(join(repo.dir, 'w', 'seed.txt'), `line ${String(seq)}\n`);
    return { at: Date.now(), key: null };
  }
  if (kind === 'add' || kind === 'addEarly') {
    const folder = kind === 'add' ? 'd0001' : 'd0002';
    const name = `0new-${String(seq).padStart(4, '0')}.txt`;
    const key = `${ctx.build}-${String(repo.n)}-${name}`;
    await ctx.watch(key, `${folder}/${name}`, 'present');
    const at = Date.now();
    writeFileSync(join(repo.dir, folder, name), 'new\n');
    return { at, key };
  }
  repo.git(['checkout', '-q', repo.onOther ? 'main' : 'other']);
  repo.onOther = !repo.onOther;
  return { at: Date.now(), key: null };
}

/** M, timed (no debugger), then counted (the debugger on). */
async function matrix(ctx, repo, raw, seq) {
  const W = windowFor(repo.n);
  for (const kind of KINDS) {
    const gate = await loadGate(`${ctx.build} r${String(repo.n)} ${kind}`);
    const rows = [];
    for (let r = 0; r < REPS; r += 1) {
      const a = await ctx.metrics();
      const { at, key } = await change(ctx, repo, kind, (seq.n += 1));
      await sleep(W);
      const b = await ctx.metrics();
      const to = Date.now();
      await sleep(W);
      const c = await ctx.metrics();
      const page = await ctx.pageWindow(at, to);
      const latencyMs = key === null ? null : await ctx.ev(`(() => { const w = window.__p372.watch[${J(key)}]; return w && w.at !== null ? w.at - ${String(at)} : null; })()`);
      const span = (x, y) => (num(x) && num(y) ? Math.round(y - x) : null);
      rows.push({ taskMs: span(a.task, b.task), idleTaskMs: span(b.task, c.task), scriptMs: span(a.script, b.script), idleScriptMs: span(b.script, c.script), ...page, latencyMs });
      await sleep(500);
    }
    const cell = { n: repo.n, kind, W, load: gate.loads, loadAfter: loads(), mem: gate.mem, waitedMin: gate.waitedMin, rows };
    raw.cells.push(cell);
    say(`${ctx.build} r${String(repo.n)} ${kind}: thread ${J(rows.map(threadOf))} latency ${J(rows.map((x) => x.latencyMs))} changes ${J(rows.map((x) => x.changed))} load ${J(gate.loads)}`);
  }
  if (repo.onOther) {
    repo.git(['checkout', '-q', 'main']);
    repo.onOther = false;
    await sleep(W);
  }
}

async function counted(ctx, repo, raw, seq) {
  const W = windowFor(repo.n);
  for (const kind of KINDS) {
    const per = [];
    for (let r = 0; r < 3; r += 1) {
      await ctx.resetCounts();
      const { at } = await change(ctx, repo, kind, (seq.n += 1));
      await sleep(W);
      const c = await ctx.counts();
      const reads = c.t.read ?? [];
      const writes = c.t.write ?? [];
      per.push({ ...c.n, firstRead: reads.length ? reads[0] - at : null, lastWrite: writes.length ? writes[writes.length - 1] - at : null, readToLastWrite: reads.length && writes.length ? writes[writes.length - 1] - reads[0] : null });
      await sleep(500);
    }
    raw.counts.push({ n: repo.n, kind, per });
    say(`${ctx.build} r${String(repo.n)} ${kind} counts: ${J(per.map((p) => ({ read: p.read ?? 0, write: p.write ?? 0, diff: p.diff ?? 0, sync: p.sync ?? 0, render: p.render ?? 0 })))}`);
  }
  if (repo.onOther) {
    repo.git(['checkout', '-q', 'main']);
    repo.onOther = false;
    await sleep(W);
  }
}

/** H: d0003 held 5 s in main; new files in d0001 and d0002 timed; then the held folder's own file, counted. */
async function heldArm(ctx, repo, seq) {
  const held = join(repo.dir, 'd0003');
  await ctx.hold(held);
  const rows = [];
  let folded = null;
  try {
    for (let r = 0; r < 8; r += 1) {
      const folder = r % 2 === 0 ? 'd0001' : 'd0002';
      const name = `0held-${String((seq.n += 1)).padStart(4, '0')}.txt`;
      const key = `${ctx.build}-h-${name}`;
      await ctx.watch(key, `${folder}/${name}`, 'present');
      const at = Date.now();
      writeFileSync(join(repo.dir, folder, name), 'held\n');
      await sleep(7_000);
      const drawn = await ctx.watched(key);
      const heldReads = (await ctx.mainReads(held)).filter((x) => x.start >= at && x.held && num(x.end));
      rows.push({ folder, latencyMs: drawn === null ? null : drawn - at, mainHoldMs: heldReads.length > 0 ? Math.min(...heldReads.map((x) => x.end - x.start)) : null });
    }
    await sleep(6_000);
    // INTEGRATOR: d0003's rows sit below what the tree draws once d0001 and d0002 hold this run's new files, so its
    // own new file was never seen at either build in the first full run. Fold the two above it (a fold keeps the
    // cache, so a refresh still reads them), and open them again in the finally.
    folded = await foldAbove(ctx, ['d0001', 'd0002'], 'fold');
    await ctx.countersOn();
    const name = `0own-${String((seq.n += 1)).padStart(4, '0')}.txt`;
    const key = `${ctx.build}-own-${name}`;
    await ctx.watch(key, `d0003/${name}`, 'present');
    const at = Date.now();
    writeFileSync(join(held, name), 'own\n');
    await sleep(2_000);
    await ctx.resetCounts();
    const drawn = await ctx.waitWatched(key, 12_000);
    await sleep(300);
    const c = await ctx.counts();
    await ctx.countersOff();
    const heldReads = (await ctx.mainReads(held)).filter((x) => x.start >= at && x.held && num(x.end));
    const own = { latencyMs: drawn === null ? null : drawn - at, writes: c.n.write ?? 0, mainHoldMs: heldReads.length > 0 ? Math.min(...heldReads.map((x) => x.end - x.start)) : null };
    say(`${ctx.build} H r${String(repo.n)}: ${J(rows)} own ${J(own)}`);
    return { n: repo.n, rows, own: { ...own, folded } };
  } finally {
    await ctx.unhold();
    await sleep(6_000);
    if (folded !== null) await foldAbove(ctx, folded, 'open');
  }
}

/** H: click each folder's row to fold it (or open it again), and wait for its first row to go (or come back). */
async function foldAbove(ctx, folders, how) {
  const done = [];
  for (const d of folders) {
    const key = `${ctx.build}-fold-${how}-${d}-${String(Date.now())}`;
    await ctx.watch(key, `${d}/a.txt`, how === 'fold' ? 'absent' : 'present');
    const clicked = await ctx.ev(`(() => { const h = document.querySelector('file-tree-container'); const r = h && h.shadowRoot && h.shadowRoot.querySelector('[data-item-path="${d}/"]'); if (!r) return false; r.click(); return true; })()`);
    if (clicked && (await ctx.waitWatched(key, 5_000)) !== null) done.push(d);
  }
  await sleep(800);
  return done;
}

/** E: `0x/` expanded by a click on its row, ten times, quiet and with d0003 held and the watcher ticking. */
async function expandArm(ctx, repo) {
  const click = (key, want, first) => ctx.ev(`(async () => {
    const h = document.querySelector('file-tree-container');
    const s = h && h.shadowRoot;
    const row = s && s.querySelector('[data-item-path="0x/"]');
    if (!row) return null;
    window.__p372.watch[${J(key)}] = { path: ${J(first)}, want: ${J(want)}, at: null };
    const at = Date.now();
    row.click();
    return at;
  })()`);
  const one = async (i, mode) => {
    const open = `${ctx.build}-e-${mode}-${String(i)}-open`;
    const at = await click(open, 'present', '0x/f01.txt');
    const drawn = at === null ? null : await ctx.waitWatched(open, 5_000);
    const close = `${ctx.build}-e-${mode}-${String(i)}-close`;
    const at2 = await click(close, 'absent', '0x/f01.txt');
    if (at2 !== null) await ctx.waitWatched(close, 5_000);
    await sleep(300);
    return at === null || drawn === null ? null : drawn - at;
  };
  const quiet = [];
  for (let i = 0; i < 10; i += 1) quiet.push(await one(i, 'quiet'));
  const held = join(repo.dir, 'd0003');
  await ctx.hold(held);
  const heldMs = [];
  let ticks = 0;
  try {
    const timer = setInterval(() => {
      ticks += 1;
      appendFileSync(join(repo.dir, 'w', 'seed.txt'), `e ${String(ticks)}\n`);
    }, 900);
    try {
      await sleep(1_200);
      for (let i = 0; i < 10; i += 1) heldMs.push(await one(i, 'held'));
    } finally {
      clearInterval(timer);
    }
  } finally {
    await ctx.unhold();
  }
  const reads = (await ctx.mainReads(held)).filter((x) => x.held);
  await sleep(6_000);
  const out = { quiet, held: heldMs, holdTook: reads.length > 0, refreshesWhileHeld: reads.length };
  say(`${ctx.build} E: ${J(out)}`);
  return out;
}

/** R: a file written into d0001 and the Refresh button pressed inside the watcher's delay; then with d0003 held. */
async function refreshArm(ctx, repo, seq) {
  const press = () => ctx.ev(`(() => {
    const all = Array.from(document.querySelectorAll('[aria-label="Refresh files"]')).filter((b) => b.offsetParent !== null);
    if (all.length === 0) return null;
    const at = Date.now();
    all[0].click();
    return at;
  })()`);
  const one = async (mode) => {
    const name = `0r-${String((seq.n += 1)).padStart(4, '0')}.txt`;
    const key = `${ctx.build}-r-${name}`;
    await ctx.watch(key, `d0001/${name}`, 'present');
    writeFileSync(join(repo.dir, 'd0001', name), 'r\n');
    await sleep(60);
    const at = await press();
    const drawn = at === null ? null : await ctx.waitWatched(key, mode === 'held' ? 12_000 : 4_000);
    return { at, ms: at === null || drawn === null ? null : drawn - at };
  };
  const quiet = [];
  let pressed = true;
  for (let i = 0; i < 6; i += 1) {
    const r = await one('quiet');
    if (r.at === null) pressed = false;
    quiet.push(r.ms);
    await sleep(2_500);
  }
  const held = join(repo.dir, 'd0003');
  const heldRows = [];
  for (let i = 0; i < 4; i += 1) {
    await ctx.hold(held);
    try {
      // a read of d0003 started and held before the press: the watcher's own tick
      appendFileSync(join(repo.dir, 'w', 'seed.txt'), `r ${String(i)}\n`);
      await sleep(800);
      const r = await one('held');
      if (r.at === null) pressed = false;
      await ctx.unhold();
      await sleep(HOLD_MS + 1_500);
      const reads = await ctx.mainReads(held);
      const first = reads.find((x) => x.held && x.start <= (r.at ?? 0) && (x.end ?? Infinity) >= (r.at ?? 0));
      const again = first !== undefined && reads.some((x) => x.start >= first.end);
      heldRows.push({ ms: r.ms, holdTook: first !== undefined, heldReadAgain: again });
    } finally {
      await ctx.unhold();
    }
    await sleep(1_500);
  }
  const out = { quiet, held: heldRows, pressed };
  say(`${ctx.build} R: ${J(out)}`);
  return out;
}

/**
 * V: five folders at the top of the tree, each opened by a click on its row (so
 * it is a cached folder) and then removed from outside; its rows gone, and the
 * cache read after through the store counter's own record (counters on).
 */
async function vanishArm(ctx, repo) {
  await ctx.countersOn();
  const out = [];
  try {
    for (const i of [1, 2, 3, 4, 5]) {
      const d = `0v${String(i)}`;
      const open = `${ctx.build}-v-${d}-open`;
      await ctx.watch(open, `${d}/v.txt`, 'present');
      const clicked = await ctx.ev(`(() => { const h = document.querySelector('file-tree-container'); const r = h && h.shadowRoot && h.shadowRoot.querySelector('[data-item-path="${d}/"]'); if (!r) return false; r.click(); return true; })()`);
      const opened = clicked ? await ctx.waitWatched(open, 5_000) : null;
      await sleep(800);
      const cachedBefore = await ctx.cacheHas(join(repo.dir, d));
      const key = `${ctx.build}-v-${d}`;
      await ctx.watch(key, `${d}/`, 'absent');
      const at = Date.now();
      rmSync(join(repo.dir, d), { recursive: true, force: true });
      const gone = opened === null ? null : await ctx.waitWatched(key, 15_000);
      await sleep(2_500);
      // INTEGRATOR: whether the row is still drawn once the wait is over (the parent's reading in the first full run).
      const stillDrawn = gone !== null ? false : await ctx.ev(`(() => { const h = document.querySelector('file-tree-container'); return !!(h && h.shadowRoot && h.shadowRoot.querySelector('[data-item-path="${d}/"]')); })()`);
      out.push({ folder: d, opened: opened !== null, cachedBefore, goneMs: gone === null ? null : gone - at, stillDrawn, keyAfter: cachedBefore === true ? await ctx.cacheHas(join(repo.dir, d)) : null });
    }
  } finally {
    await ctx.countersOff();
  }
  say(`${ctx.build} V: ${J(out)}`);
  return out;
}

/** O: the shot drive's treeOps, twice on a quiet tree and twice with d0003 held, each event timed from main's own fs call. */
async function opsArm(ctx, repo) {
  const out = { trashStandIn: ctx.trashOk === true, quiet: [], held: [] };
  if (!ctx.trashOk) {
    say(`${ctx.build} O: Electron's shell.trashItem could not be replaced, so the verbs are not driven (they would write into his Trash)`);
    return out;
  }
  const held = join(repo.dir, 'd0003');
  let k = 0;
  for (const mode of ['quiet', 'quiet', 'held', 'held']) {
    k += 1;
    const dir = `0ops-${String(k)}`;
    const tracked = [`${dir}/`, `${dir}/note.md`, `${dir}/renamed.md`, `${dir}/renamed copy.md`, `${dir}/inner/`];
    await ctx.ev(`(window.__p372.ops = null, window.__p372.timeline = [], window.__p372.tracked = ${J(tracked)}, true)`);
    await ctx.dropMainLog();
    if (mode === 'held') await ctx.hold(held);
    try {
      await ctx.ev(`window.__gmuxShotDrive(${J({ projectPath: repo.dir, sidebarView: 'explorer', treeOps: { scratchDir: dir } })}).then(() => true)`, 300_000);
      await sleep(1_000);
    } finally {
      if (mode === 'held') await ctx.unhold();
    }
    const result = await ctx.ev('window.__p372.ops');
    const timeline = await ctx.ev('window.__p372.timeline');
    const fsops = await mainEval(ctx.main, 'globalThis.__p372m.fsops');
    const reads = mode === 'held' ? (await ctx.mainReads(held)).filter((x) => x.held) : [];
    const events = eventsOf(fsops, timeline, repo.dir, dir);
    const run = { steps: result === null ? null : { passed: result.passed, failed: result.failed, failedNames: (result.steps ?? []).filter((s) => !s.ok).map((s) => s.name) }, events, holdTook: mode === 'quiet' || reads.length > 0 };
    out[mode].push(run);
    say(`${ctx.build} O ${mode}: ${J(run)}`);
    await ctx.ev('(window.__p372.tracked = [], true)');
    await sleep(HOLD_MS + 1_000);
  }
  return out;
}

/** S: d0003 held in the 500, new files added, the 10 shown, then the 500 again. */
async function switchArm(ctx, r500, r10, seq) {
  const held = join(r500.dir, 'd0003');
  await ctx.hold(held);
  const files = [`d0001/0s-${String((seq.n += 1))}.txt`, `d0003/0s-${String((seq.n += 1))}.txt`];
  let out;
  try {
    for (const f of files) writeFileSync(join(r500.dir, f), 's\n');
    await sleep(700);
    const reads = (await ctx.mainReads(held)).filter((x) => x.held);
    await ctx.ev(`(window.__p372.forbid = { marker: '00ten/', maxD: 10, extra: ${J(['0ops-', ...files])}, shown: false, done: false, frames: 0, bad: 0, examples: [] }, true)`);
    await ctx.ev(`window.__gmuxShotDrive(${J({ projectPath: r10.dir, localStorage: { [`gmux.treeOpen.${r10.dir}`]: J(r10.expanded) }, sidebarView: 'explorer' })}).then(() => true)`, 300_000);
    await sleep(HOLD_MS + 2_000);
    await ctx.ev('(window.__p372.forbid.done = true, true)');
    const F = await ctx.ev('window.__p372.forbid');
    for (const f of files) await ctx.watch(`${ctx.build}-s-${f}`, f, 'present');
    await ctx.ev(`window.__gmuxShotDrive(${J({ projectPath: r500.dir, localStorage: { [`gmux.treeOpen.${r500.dir}`]: J(r500.expanded) }, sidebarView: 'explorer' })}).then(() => true)`, 300_000);
    const newFiles = {};
    for (const f of files) newFiles[f] = await ctx.waitWatched(`${ctx.build}-s-${f}`, 30_000);
    out = { tenShown: F.shown, frames: F.frames, forbidden: F.bad, examples: F.examples, newFiles, holdTook: reads.length > 0 };
  } finally {
    await ctx.unhold();
    await ctx.ev('(window.__p372.forbid = null, true)');
  }
  say(`${ctx.build} S: ${J(out)}`);
  return out;
}

/** I: a new ignored file dims, a rule added and taken away shows, and 20 s of frames under a writer. */
async function ignoreArm(ctx, repo, seq) {
  const newLog = [];
  for (let i = 0; i < 4; i += 1) {
    const name = `0ig-${String((seq.n += 1))}.log`;
    const key = `${ctx.build}-i-${name}`;
    await ctx.watch(key, `d0001/${name}`, 'ignored');
    const at = Date.now();
    writeFileSync(join(repo.dir, 'd0001', name), 'log\n');
    const t = await ctx.waitWatched(key, 6_000);
    newLog.push(t === null ? null : t - at);
    await sleep(1_500);
  }
  const rules = readFileSync(join(repo.dir, '.gitignore'), 'utf8');
  const ruleAdd = [];
  const ruleAddNever = [];
  const ruleRemove = [];
  for (let i = 0; i < 3; i += 1) {
    const a = `${ctx.build}-i-add-${String(i)}`;
    await ctx.watch(a, 'd0001/0extra1.txt', 'ignored');
    let at = Date.now();
    writeFileSync(join(repo.dir, '.gitignore'), `${rules}0extra*.txt\n`);
    let t = await ctx.waitWatched(a, 15_000);
    ruleAdd.push(t === null ? null : t - at);
    // INTEGRATOR: a rule add that never dimmed the row, read as still drawn undimmed when the wait ended.
    if (t === null) {
      const seen = `${a}-seen`;
      await ctx.watch(seen, 'd0001/0extra1.txt', 'notignored');
      ruleAddNever.push((await ctx.waitWatched(seen, 1_000)) !== null);
    } else ruleAddNever.push(false);
    await sleep(1_500);
    const b = `${ctx.build}-i-rm-${String(i)}`;
    await ctx.watch(b, 'd0001/0extra1.txt', 'notignored');
    at = Date.now();
    writeFileSync(join(repo.dir, '.gitignore'), rules);
    t = await ctx.waitWatched(b, 6_000);
    ruleRemove.push(t === null ? null : t - at);
    await sleep(1_500);
  }
  await ctx.ev(`(window.__p372.must = { paths: ['d0001/b.log', 'd0002/b.log', 'd0003/b.log', 'ignored/'], frames: 0, bad: 0 }, true)`);
  const c0 = await ctx.ev('window.__p372.changed.length');
  let i = 0;
  const timer = setInterval(() => {
    i += 1;
    appendFileSync(join(repo.dir, 'w', 'seed.txt'), `i ${String(i)}\n`);
  }, 200);
  try {
    await sleep(20_000);
  } finally {
    clearInterval(timer);
  }
  const M = await ctx.ev('window.__p372.must');
  const changes = (await ctx.ev('window.__p372.changed.length')) - c0;
  await ctx.ev('(window.__p372.must = null, true)');
  const out = { newLog, ruleAdd, ruleAddNever, ruleRemove, frames: M.frames, bad: M.bad, changes };
  say(`${ctx.build} I: ${J(out)}`);
  await sleep(3_000);
  return out;
}

/** One launch: every repository its arms need, every arm this block drives. */
async function oneLaunch(build, block) {
  const raw = { build, block, label: `${build}${String(block)}`, rev: revisionOf(checkoutOf(build)), run: RUN_ID, startedAt: Date.now(), carriesPhase: [...rendererAssets(checkoutOf(build)).values()].some((t) => t.includes(PHASE_MARK)), loadStart: loads(), cells: [], counts: [], held: [], anchors: null };
  const wants = (arm) => ARMS.includes(arm) && ARM_SPECS[arm].includes(block);
  const seq = { n: 0 };
  // In the list from the start, so a launch that stops still hands its readings to the graders (which then read UNREADABLE, never a pass).
  launchRaws.push(raw);
  await withApp(raw.label, build, async (ctx) => {
    for (const n of NS) {
      const repo = ctx.repos.get(n);
      say(`${build} block ${String(block)}: show r${String(n)} (${String(repo.expanded.length)} folders remembered)`);
      const first = await ctx.show(repo, n >= 500 ? 15_000 : 8_000);
      if (first === null) throw new Error(`r${String(n)} never drew d0001/a.txt`);
      // REVIEW: the visibility record starts once the first project has painted a frame (so the window was shown),
      // before any arm reads anything; a span hidden from here on makes the launch UNREADABLE (sessionOf).
      if (n === NS[0]) await ctx.ev(`(window.__p372.vis = { hidden: [], since: document.visibilityState === 'visible' ? null : Date.now() }, true)`);
      if (wants('M') || wants('L')) {
        await matrix(ctx, repo, raw, seq);
        raw.anchors = await ctx.countersOn();
        await counted(ctx, repo, raw, seq);
        await ctx.countersOff();
      }
      if (wants('H') && (n === 10 || n === 500)) raw.held.push(await heldArm(ctx, repo, seq));
      if (n === 500 && wants('E')) raw.expand = await expandArm(ctx, repo);
      if (n === 500 && wants('V')) raw.vanish = await vanishArm(ctx, repo);
      if (n === 500 && wants('R')) raw.refresh = await refreshArm(ctx, repo, seq);
      if (n === 500 && wants('O')) raw.ops = await opsArm(ctx, repo);
      if (n === 100 && wants('I')) raw.ignore = await ignoreArm(ctx, repo, seq);
      if (n === 500 && wants('S') && ctx.repos.has(10)) raw.switch = await switchArm(ctx, repo, ctx.repos.get(10), seq);
    }
    // REVIEW: whether the window was ever hidden while the arms ran (a launch that stopped first has none, so reads UNREADABLE).
    raw.visibility = await ctx.ev('(() => { const V = window.__p372.vis; return { read: true, hidden: [...V.hidden, ...(V.since !== null ? [[V.since, null]] : [])] }; })()');
  });
  if (raw.held.length === 0) delete raw.held;
  raw.loadEnd = loads();
  report.launches.push({ build, block, label: raw.label, loadStart: raw.loadStart, loadEnd: raw.loadEnd, anchors: raw.anchors });
  if (KEEP) writeFileSync(join(dirname(REPORT), `raw-${raw.label}.json`), `${J(raw, null, 1)}\n`, { mode: 0o600 });
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

say(`measuring HEAD ${HEAD} (${String(report.headSha).slice(0, 8)}) against the parent ${String(report.parent)} (${String(report.parentSha).slice(0, 8)}); arms ${ARMS.join(',')}; sizes ${NS.join(',')}; blocks ${String(BLOCKS)}; socket ${SOCKET}; load ${J(loads())}; history ${HISTORY_BEFORE}${DEVELOPMENT ? '; DEVELOPMENT, this run never exits 0' : ''}`);
try {
  for (let block = 1; block <= BLOCKS; block += 1) for (const build of BUILDS) await oneLaunch(build, block);
} catch (err) {
  stopWith = err instanceof Refusal ? err.code : 0;
  if (stopWith === 0) unreadable += 1;
  report.error = String(err?.message ?? err).slice(0, 900);
  say(`THE RUN STOPPED: ${report.error}`);
} finally {
  for (const arm of ARMS) {
    try {
      const raw = { arm, launches: launchRaws };
      if (KEEP) writeFileSync(join(dirname(REPORT), `raw-arm-${arm}.json`), `${J({ arm, labels: launchRaws.map((l) => l.label) })}\n`, { mode: 0o600 });
      judgeArm(arm, derive(raw));
    } catch (err) {
      cannotRead(arm, `the reader threw: ${String(err?.message ?? err).slice(0, 300)}`);
    }
  }
  const text = psText();
  const left = text.split('\n').filter((l) => l.includes(`${RUN}/`)).map((l) => l.trim().slice(0, 160));
  const electrons = appPids.filter((pid) => text.split('\n').some((l) => Number(l.trim().split(/\s+/)[0]) === pid));
  const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null };
  if (history.after !== history.before) {
    say(`his shell history moved (${history.before} to ${history.after}); starting nothing for 3 minutes and reading it again`);
    await sleep(180_000);
    history.quiet = { again: historyStat() };
  }
  judgeArm('RUN', { preflight: { ok: PREFLIGHT.every((c) => c.ok) }, launches, agentsHeld, censusFailures, processTableRead: text.length > 0, electronsLeft: electrons.length, leftovers: [...leftovers, ...left], history, loads: loadsRead });
  report.loadsRead = loadsRead;
  report.seconds = Math.round((Date.now() - t0) / 1000);
  report.load = loads();
  writeFileSync(REPORT, `${J(report, null, 2)}\n`, { mode: 0o600 });
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}
say(`${String(report.arms.filter((a) => a.ok === true).length)} verdict(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read; ${String(report.seconds)} s; load ${J(report.load)}; report ${REPORT}`);
process.exit(stopWith > 0 ? stopWith : failures > 0 ? 1 : unreadable > 0 || DEVELOPMENT ? 2 : 0);
