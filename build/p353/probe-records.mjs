#!/usr/bin/env node
/**
 * probe:p353:records — THE PHASE 353 RECORDS APP RUN (build/p353/SPEC.md §8):
 * Phase 302's arm 2 and Phase 305's arm, in ONE Electron per build.
 *
 *   302  a session ended and then removed can lose its tombstone
 *   305  a Restart can hard-delete the record of a session the person removed
 *
 * ONE ELECTRON AT A TIME, every launch through build/electron-run.mjs's
 * `withElectron`, each build on its own scratch profile, one scratch HOME
 * (ZDOTDIR the same, HISTFILE=/dev/null, no TERM_SESSION_ID) and the socket
 * build/harness-socket.mjs hands this file (`gmux-p353r…`). Every launch names
 * that socket (`tmuxSocket`) beside `GMUX_TMUX_SOCKET`, so the helper judges
 * the socket the app announces and its census reads the person's session
 * names once before and once after the launch, READ ONLY, which is the one
 * read of his server this run makes; this file names that server nowhere.
 * With `P353_PARENT_CHECKOUT` (a BUILT checkout of the parent, the main commit before this phase) the
 * parent runs FIRST, then HEAD, never at once.
 *
 * NO AGENT RUNS. Every session is a plain shell. build/hidden-agents.mjs
 * renames EVERY probed registry row before each launch
 * (`hiddenAgentsBesides([])`), its precheck holds that list to the checkout's
 * own registry, and the app's own `agents:list` must say nothing resolved
 * (`standInsOnlyVerdict`); a launch where it does not is UNREADABLE (exit 2).
 * The app's PATH and the login shell's are the system folders alone.
 *
 * THE ARMS
 *
 *   R302  (302's arm 2) One real local shell per trial, through the shipping
 *         bridge. PLAIN: End, and Remove at each interval of the grid
 *         (0, 1, 2, 5, 10, 20, 50, 100, 200, 500 ms) after the End was sent.
 *         RACE: the shell exits by itself (`exit 3` typed into its pane on the
 *         run's own scratch server, so its pane dies and the monitor reports
 *         it), the End is sent at each interval after, and the Remove is sent
 *         every 2 ms from then until main accepts it, which is the moment a
 *         person's Remove first lands; the monitor's reap races both. After
 *         each trial (5 s, two ticks at the slow cadence) the row is read
 *         through `sessions:list` and `sessions:listRemoved`.
 *   R305  (305's arm) End a shell, press Restart through the bridge, and send
 *         Remove 0, 1, 5, 25 and 100 ms into the create's await; read both
 *         lists. Beside it the no-regression rows: a Restart with no Remove
 *         (the ended row deleted, as always) and a Restore from Past (the
 *         removal date cleared, the row back).
 *   RUN   the precheck, the hidden agents, the launches.
 *
 * Then the scratch manifest is read from a COPY beside its WAL with
 * /usr/bin/sqlite3, and the app's own log is read for the lines Phase 302's
 * guards say.
 *
 * GRADED AT HEAD: a Remove main accepted leaves the row in Past and out of
 * the managed list, a refused one leaves it ended in the managed list; no row
 * of the managed list carries a removal date; no manifest row carries
 * `removed_at` beside a status other than `discarded`; no line of the
 * repository's Phase 302 clause in the log (that line means a writer the
 * census missed tried to write over a tombstone, which is what this arm exists
 * to find); a Remove inside a Restart's create keeps the removed row in Past
 * beside its replacement; an ordinary Restart deletes the ended row; a Restore
 * from Past brings the row back. AT THE PARENT the same readings are PRINTED
 * and never graded: 305's cells read GONE there (measured 10 of 10 by the
 * spec step), and 302's race is a race, so how many cells reproduce it is a
 * reading.
 *
 * WHAT IT REFUSES. A socket that is not a `gmux-p353r` harness socket; no
 * harness folder; no built `out/` here; a parent checkout that is not built or
 * is this one; a precheck or an `agents:list` that does not hold. It signals
 * no process: a pane dies because its own shell was told to exit, and every
 * Electron is ended by the helper.
 *
 *   npm run probe:p353:records                  HEAD alone
 *   P353_PARENT_CHECKOUT=/path npm run probe:p353:records
 *   P353_ARMS=R305 npm run probe:p353:records   one arm group
 *   node build/p353/probe-records.mjs --grader-self-test
 *                                               the graders over recorded
 *                                               fixtures; starts nothing
 *
 * ENV  GMUX_TMUX_SOCKET, GMUX_HARNESS_DIR (set by build/harness-socket.mjs);
 *      P353_PARENT_CHECKOUT, P353_ARMS (optional).
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Static, as every probe imports the helper (build/assert-electron-teardown.mjs
// counts a probe by its import and its call). None of the three starts
// anything when it loads, so the self-test below still starts nothing.
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, hiddenAgentsPrecheck, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';

const TAG = '[probe:p353:records]';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

/** The 302 grid, ms. */
const R302_INTERVALS = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500];
/** The 305 grid, ms into the create. */
const R305_INTERVALS = [0, 1, 5, 25, 100];
/** How long a trial waits for the monitor: two ticks at the slow 2 s cadence, and the reap's own awaits. */
const SETTLE_MS = 5000;
/** How long the RACE keeps sending Remove before it reads the row as never accepted. */
const REMOVE_WINDOW_MS = 4000;
/** The two refusals a Remove of a live row answers (src/main/sessions/lifecycle-gate.ts). */
const REMOVE_NOT_YET = /still running|cannot see whether/;

// ---------------------------------------------------------------------------
// The page expressions: pure builders, so the self-test can parse every one
// ---------------------------------------------------------------------------

/** The page's own helpers, one expression's preamble. */
const PAGE = `const s = window.gmux.sessions; const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const msg = (e) => String((e && e.message) || e); const t0 = performance.now(); const now = () => performance.now() - t0;`;

export const EXPR = {
  /** Any async expression, answered as `{ ok, value | error }` text. */
  bridge: (expr) =>
    `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`,
  /** Both lists, each row's id, status and removal date. */
  lists: () =>
    `(async () => { const s = window.gmux.sessions; const pick = (x) => ({ id: x.id, status: x.status, removedAt: x.removedAt ?? null }); return { list: (await s.list()).map(pick), removed: (await s.listRemoved()).map(pick) }; })()`,
  /** R302 PLAIN: the End sent, and the Remove `at` ms after it. */
  plain: (id, at) =>
    `(async () => { ${PAGE} const ending = s.kill(${J(id)}).then(() => ({ ok: true, ms: now() }), (e) => ({ ok: false, error: msg(e), ms: now() })); if (${String(at)} > 0) await sleep(${String(at)}); let remove; try { await s.discard(${J(id)}); remove = { ok: true, ms: now() }; } catch (e) { remove = { ok: false, error: msg(e), ms: now() }; } return { end: await ending, remove }; })()`,
  /** R302 RACE: the End `at` ms after the shell was told to exit, the Remove every 2 ms until main accepts it. */
  race: (id, at) =>
    `(async () => { ${PAGE} if (${String(at)} > 0) await sleep(${String(at)}); const ending = s.kill(${J(id)}).then(() => ({ ok: true, ms: now() }), (e) => ({ ok: false, error: msg(e), ms: now() })); let remove = null; let tries = 0; while (now() < ${String(REMOVE_WINDOW_MS)}) { tries += 1; try { await s.discard(${J(id)}); remove = { ok: true, ms: now(), tries }; break; } catch (e) { const m = msg(e); if (!${String(REMOVE_NOT_YET)}.test(m)) { remove = { ok: false, error: m, ms: now(), tries }; break; } } await sleep(2); } if (remove === null) remove = { ok: false, error: 'never accepted in ${String(REMOVE_WINDOW_MS)} ms', tries }; return { end: await ending, remove }; })()`,
  /** R305: the Restart sent, and the Remove `at` ms into its create. */
  restartInside: (id, at) =>
    `(async () => { ${PAGE} const restarting = s.restart(${J(id)}).then((r) => ({ ok: true, id: (r && r.id) || null, ms: now() }), (e) => ({ ok: false, error: msg(e), ms: now() })); if (${String(at)} > 0) await sleep(${String(at)}); let remove; try { await s.discard(${J(id)}); remove = { ok: true, ms: now() }; } catch (e) { remove = { ok: false, error: msg(e), ms: now() }; } return { restart: await restarting, remove }; })()`,
  /** R305's control: an ordinary Restart. */
  restartControl: (id) =>
    `(async () => { ${PAGE} const r = await s.restart(${J(id)}); return { restart: { ok: true, id: (r && r.id) || null, ms: now() }, remove: null }; })()`
};

// ---------------------------------------------------------------------------
// The graders: pure, and what --grader-self-test proves
// ---------------------------------------------------------------------------

/**
 * One trial's row as the two lists read it: `managed`, `past`, `both` or
 * `gone`, and whether the managed list's copy carries a removal date.
 */
export function listPlace(after, id) {
  const inList = after.list.find((s) => s.id === id);
  const inPast = after.removed.find((s) => s.id === id);
  const place = inList !== undefined && inPast !== undefined ? 'both' : inList !== undefined ? 'managed' : inPast !== undefined ? 'past' : 'gone';
  return { place, listRemovedAt: inList?.removedAt ?? null, listStatus: inList?.status ?? null };
}

/**
 * PHASE 353's FIX ROUND. The fewest R305 cells that must land a Remove inside
 * the create for the grid to be read (or every cell, when the grid has fewer).
 */
const R305_MIN_LANDED = 3;

/** The manifest's row for an id, or null. */
const rowOf = (manifest, id) => (Array.isArray(manifest?.rows) ? (manifest.rows.find((r) => r.id === id) ?? null) : null);

/**
 * Grade one build's readings. HEAD is graded; the parent's readings are
 * counted and printed. Answers `{ findings, notes, unreadable }`.
 */
export function gradeBuild(r) {
  const findings = [];
  const notes = [];
  const unreadable = [...(r.unreadable ?? [])];
  const head = r.build === 'head';
  const flag = (line) => (head ? findings : notes).push(line);
  let parentDefects302 = 0;
  for (const t of r.r302 ?? []) {
    const what = `R302 ${t.kind} @${String(t.at)}ms (${t.id})`;
    if (t.error !== undefined) {
      unreadable.push(`${what}: the trial did not run: ${t.error}`);
      continue;
    }
    // THE PROBE REVIEW (Phase 353). A RACE cell exists to land a Remove while
    // the reap and the End are both in flight; one whose Remove was never
    // accepted raced nothing, so it is no reading, whatever list holds the row.
    if (t.kind === 'race' && t.remove?.ok !== true) {
      unreadable.push(`${what}: the Remove was never accepted (${t.remove?.error ?? 'not sent'}), so nothing raced the reap and the End`);
      continue;
    }
    const { place, listRemovedAt } = listPlace(t.after, t.id);
    const row = rowOf(r.manifest, t.id);
    if (listRemovedAt !== null) flag(`${what}: the managed list draws the row WITH a removal date (${String(listRemovedAt)}): it left Past Sessions and came back with nothing behind it`);
    if (t.remove?.ok === true) {
      if (place !== 'past') {
        flag(`${what}: main accepted the Remove at ${String(Math.round(t.remove.ms))} ms and the row reads ${place}, not in Past Sessions`);
        if (!head) parentDefects302 += 1;
      }
      if (row !== null && (row.status !== 'discarded' || row.removed_at === null)) flag(`${what}: the manifest holds ${row.status} with removed_at ${String(row.removed_at)} after an accepted Remove`);
    } else if (place !== 'managed') {
      flag(`${what}: the Remove was not accepted (${t.remove?.error ?? 'not sent'}) and the row reads ${place}, not in the managed list`);
    }
  }
  // THE PROBE REVIEW (Phase 353). The PLAIN grid holds the no-regression half:
  // a Remove main accepted after an End leaves the row in Past. A grid in which
  // no Remove was ever accepted read only refusals, so that half was never read.
  {
    const plain = (r.r302 ?? []).filter((t) => t.kind === 'plain' && t.error === undefined);
    if (plain.length > 0 && !plain.some((t) => t.remove?.ok === true)) {
      unreadable.push(`R302 plain: none of the ${String(plain.length)} Removes was accepted, so no tombstone written after an End was ever read`);
    }
  }
  let r305Landed = 0;
  const r305Missed = [];
  for (const t of r.r305 ?? []) {
    const what = `R305 ${t.kind}${t.at === null ? '' : ` @${String(t.at)}ms`} (${t.id})`;
    if (t.error !== undefined) {
      unreadable.push(`${what}: the trial did not run: ${t.error}`);
      continue;
    }
    const old = listPlace(t.after, t.id);
    const row = rowOf(r.manifest, t.id);
    if (t.kind === 'inside') {
      if (t.restart?.ok !== true) {
        unreadable.push(`${what}: the restart did not answer a replacement (${t.restart?.error ?? 'no answer'})`);
        continue;
      }
      const replacement = listPlace(t.after, t.restart.id);
      if (replacement.place !== 'managed') flag(`${what}: the replacement ${t.restart.id} reads ${replacement.place}, not in the managed list`);
      // PHASE 353's FIX ROUND (the records lens). A cell whose Remove did not
      // land inside the create (refused, or answered after the restart) raced
      // nothing and is a NOTE, not a reading: at HEAD the create took about
      // 26 ms, so the 25 and 100 ms cells came after it on a quiet Mac and
      // left the whole run unreadable with every cell that landed passing.
      // The grid is read once, below: at least `R305_MIN_LANDED` cells must
      // have landed, or it is UNREADABLE.
      if (t.remove?.ok !== true) {
        r305Missed.push(`${what}: the Remove was refused (${t.remove?.error ?? 'not sent'})`);
        continue;
      }
      if (t.remove.ms >= t.restart.ms) {
        r305Missed.push(`${what}: the Remove answered at ${String(Math.round(t.remove.ms))} ms, after the restart at ${String(Math.round(t.restart.ms))} ms`);
        continue;
      }
      r305Landed += 1;
      if (old.place !== 'past') flag(`${what}: a Remove inside the create, and the removed row reads ${old.place}, not in Past Sessions${old.place === 'gone' ? ': the restart deleted it' : ''}`);
      if (head && Array.isArray(r.manifest?.rows) && (row === null || row.status !== 'discarded' || row.removed_at === null)) findings.push(`${what}: the manifest holds ${row === null ? 'no row' : `${row.status} with removed_at ${String(row.removed_at)}`} for the removed row`);
    } else if (t.kind === 'control') {
      if (t.restart?.ok !== true) {
        unreadable.push(`${what}: the restart did not answer a replacement (${t.restart?.error ?? 'no answer'})`);
        continue;
      }
      if (old.place !== 'gone') flag(`${what}: an ordinary Restart of an ended row left it ${old.place}; it is deleted, as it always was`);
      if (row !== null) flag(`${what}: the manifest still holds the restarted row (${row.status})`);
      if (listPlace(t.after, t.restart.id).place !== 'managed') flag(`${what}: the replacement is not in the managed list`);
    } else if (t.kind === 'restore') {
      if (t.restore?.ok !== true) {
        flag(`${what}: the Restore from Past was refused (${t.restore?.error ?? 'no answer'})`);
        continue;
      }
      if (old.place !== 'managed') flag(`${what}: a Restore from Past left the row ${old.place}, not back in the managed list`);
      if (old.listRemovedAt !== null) flag(`${what}: the restored row still carries its removal date in the managed list`);
      if (row !== null && row.removed_at !== null) flag(`${what}: the manifest still holds removed_at ${String(row.removed_at)} for the restored row`);
    }
  }
  {
    const inside = (r.r305 ?? []).filter((t) => t.kind === 'inside' && t.error === undefined && t.restart?.ok === true);
    const want = Math.min(R305_MIN_LANDED, inside.length);
    for (const m of r305Missed) notes.push(`${m}: it did not land inside the create, so it raced nothing and is not graded`);
    if (inside.length > 0 && r305Landed < want) {
      unreadable.push(`R305 inside: ${String(r305Landed)} of ${String(inside.length)} cells landed a Remove inside the create, fewer than ${String(want)}, so the grid read too little to grade`);
    }
  }
  if (r.manifest?.error !== undefined) {
    unreadable.push(`the manifest could not be read: ${r.manifest.error}`);
  } else if (Array.isArray(r.manifest?.rows)) {
    const torn = r.manifest.rows.filter((x) => x.removed_at !== null && x.status !== 'discarded');
    for (const x of torn) flag(`the manifest holds ${x.id} (${String(x.name)}) as ${x.status} WITH removed_at ${String(x.removed_at)}: neither list can reach it correctly and the prune never collects it`);
  }
  // THE PROBE REVIEW (Phase 353). The clause's line is counted in the app's own
  // output; a HEAD whose output could not be read has no count, which is not 0.
  if (head && (r.log === null || r.log === undefined || r.log.read === false)) {
    unreadable.push("the app's own log could not be read, so the repository clause's line was never counted");
  }
  if (head && (r.log?.clause ?? 0) > 0) {
    findings.push(`app.log holds ${String(r.log.clause)} line(s) of the repository's Phase 302 clause: a writer outside the two that re-read tried to write a status over a tombstone (${(r.log.clauseLines ?? []).slice(0, 3).join(' // ')})`);
  }
  if (!head) {
    const gone = (r.r305 ?? []).filter((t) => t.kind === 'inside' && t.error === undefined && t.remove?.ok === true && t.restart?.ok === true && t.remove.ms < t.restart.ms && listPlace(t.after, t.id).place === 'gone').length;
    notes.push(`the parent deleted the removed row in ${String(gone)} of ${String((r.r305 ?? []).filter((t) => t.kind === 'inside').length)} Restart cells with a Remove inside the create (build/p353/SPEC.md §2.4 measured 10 of 10 over its fake host)`);
    notes.push(`the parent lost a tombstone in ${String(parentDefects302)} of ${String((r.r302 ?? []).length)} 302 trials; the race is a race, and the deterministic sweep (src/main/sessions/__tests__/p302-tombstone.test.ts) carries the proof`);
  }
  return { findings, notes, unreadable };
}

/** Count Phase 302's and 305's log lines in an app log. */
export function logCounts(text) {
  const lines = String(text ?? '').split('\n');
  const pick = (needle) => lines.filter((l) => l.includes(needle));
  const clauseLines = pick('a removed session keeps its status');
  return {
    guardReap: pick("a removed session's pane died").length,
    guardEnd: pick('a session was removed while it ended').length,
    keptRestart: pick('was removed while it restarted').length,
    clause: clauseLines.length,
    clauseLines: clauseLines.map((l) => l.trim().slice(0, 200))
  };
}

// ---------------------------------------------------------------------------
// --grader-self-test: recorded fixtures, nothing started
// ---------------------------------------------------------------------------

function selfTest() {
  const lists = (managed, past) => ({ list: managed, removed: past });
  const okHead = {
    build: 'head',
    r302: [
      { kind: 'plain', at: 0, id: 'a', end: { ok: true }, remove: { ok: false, error: 'This session is still running, so it was not removed. End it first.' }, after: lists([{ id: 'a', status: 'exited', removedAt: null }], []) },
      { kind: 'plain', at: 500, id: 'b', end: { ok: true }, remove: { ok: true, ms: 501 }, after: lists([], [{ id: 'b', status: 'discarded', removedAt: 9 }]) },
      { kind: 'race', at: 5, id: 'c', end: { ok: true }, remove: { ok: true, ms: 140, tries: 30 }, after: lists([], [{ id: 'c', status: 'discarded', removedAt: 9 }]) }
    ],
    r305: [
      { kind: 'inside', at: 5, id: 'd', restart: { ok: true, id: 'd2', ms: 300 }, remove: { ok: true, ms: 9 }, after: lists([{ id: 'd2', status: 'running', removedAt: null }], [{ id: 'd', status: 'discarded', removedAt: 9 }]) },
      { kind: 'control', at: null, id: 'e', restart: { ok: true, id: 'e2', ms: 300 }, remove: null, after: lists([{ id: 'e2', status: 'running', removedAt: null }], []) },
      { kind: 'restore', at: null, id: 'f', restore: { ok: true }, after: lists([{ id: 'f', status: 'running', removedAt: null }], []) }
    ],
    manifest: { rows: [
      { id: 'a', name: 'a', status: 'exited', removed_at: null },
      { id: 'b', name: 'b', status: 'discarded', removed_at: 9 },
      { id: 'c', name: 'c', status: 'discarded', removed_at: 9 },
      { id: 'd', name: 'd', status: 'discarded', removed_at: 9 },
      { id: 'd2', name: 'd', status: 'running', removed_at: null },
      { id: 'e2', name: 'e', status: 'running', removed_at: null },
      { id: 'f', name: 'f', status: 'running', removed_at: null }
    ] },
    log: { clause: 0 }
  };
  const cases = [];
  const expectGrade = (what, reading, want) => {
    const got = gradeBuild(reading);
    const counts = { findings: got.findings.length, unreadable: got.unreadable.length };
    const ok = Object.entries(want).every(([k, v]) => (typeof v === 'function' ? v(got[k]) : counts[k] === v));
    cases.push([ok, what, ok ? '' : J(got)]);
  };
  const clone = (x) => JSON.parse(J(x));
  expectGrade('a clean HEAD reading grades clean', okHead, { findings: 0, unreadable: 0 });
  {
    const r = clone(okHead);
    r.r302[2].after = lists([{ id: 'c', status: 'exited', removedAt: 9 }], []);
    r.manifest.rows[2] = { id: 'c', name: 'c', status: 'exited', removed_at: 9 };
    expectGrade('302: an accepted Remove whose row came back to the managed list with its removal date is a finding (the list, the place, the row and the torn manifest)', r, { findings: 4, unreadable: 0 });
  }
  {
    const r = clone(okHead);
    r.manifest.rows.push({ id: 'z', name: 'stray', status: 'restorable', removed_at: 7 });
    expectGrade('302: any manifest row with removed_at beside another status is a finding', r, { findings: 1 });
  }
  {
    const r = clone(okHead);
    r.log = { clause: 2, clauseLines: ['[gmux-manifest] a removed session keeps its status: id=q refused=exited'] };
    expectGrade('302: a line of the repository clause in the log is a finding (a writer the census missed)', r, { findings: 1 });
  }
  {
    const r = clone(okHead);
    r.r302[0].after = lists([], []);
    expectGrade('302: a refused Remove whose row is in no list is a finding', r, { findings: 1 });
  }
  {
    const r = clone(okHead);
    r.r305[0].after = lists([{ id: 'd2', status: 'running', removedAt: null }], []);
    r.manifest.rows = r.manifest.rows.filter((x) => x.id !== 'd');
    expectGrade('305: a Remove inside the create whose row the restart deleted is a finding (the list and the manifest)', r, { findings: 2 });
  }
  {
    const r = clone(okHead);
    r.r305[0].remove = { ok: true, ms: 400 };
    expectGrade('305: a grid whose only cell answered after the restart is UNREADABLE, never a pass', r, { findings: 0, unreadable: 1 });
  }
  // PHASE 353's FIX ROUND: the grid is graded on the cells that landed inside
  // the create, and at least three of five must have.
  {
    const r = clone(okHead);
    const inside = r.r305[0];
    const cells = [0, 1, 5, 25, 100].map((at, i) => ({ ...clone(inside), at, id: `g${String(i)}`, restart: { ok: true, id: `g${String(i)}r`, ms: 26 } }));
    for (const c of cells) {
      c.remove = c.at < 25 ? { ok: true, ms: c.at + 3 } : { ok: false, error: 'No session with that id' };
      c.after = lists([{ id: c.restart.id, status: 'running', removedAt: null }], c.at < 25 ? [{ id: c.id, status: 'discarded', removedAt: 9 }] : []);
      r.manifest.rows.push(c.at < 25 ? { id: c.id, name: c.id, status: 'discarded', removed_at: 9 } : { id: `${c.id}-unused`, name: 'x', status: 'running', removed_at: null });
      r.manifest.rows.push({ id: c.restart.id, name: c.id, status: 'running', removed_at: null });
    }
    r.r305.splice(0, 1, ...cells);
    expectGrade('305 (fix round): three cells inside the create and two after it grade clean, the two a note each', r, {
      findings: 0,
      unreadable: 0,
      notes: (n) => n.filter((l) => l.includes('did not land inside the create')).length === 2
    });
    const two = clone(r);
    two.r305[2].remove = { ok: false, error: 'No session with that id' };
    two.r305[2].after = lists([{ id: two.r305[2].restart.id, status: 'running', removedAt: null }], []);
    two.manifest.rows = two.manifest.rows.filter((x) => x.id !== two.r305[2].id);
    expectGrade('305 (fix round): two of five cells inside the create is UNREADABLE, never a pass', two, { findings: 0, unreadable: 1 });
  }
  {
    const r = clone(okHead);
    r.r305[1].after = lists([{ id: 'e2', status: 'running', removedAt: null }, { id: 'e', status: 'exited', removedAt: null }], []);
    r.manifest.rows.push({ id: 'e', name: 'e', status: 'exited', removed_at: null });
    expectGrade('305: an ordinary Restart that kept the ended row is a finding (no regression: it is deleted as always)', r, { findings: 2 });
  }
  {
    const r = clone(okHead);
    r.r305[2].after = lists([], [{ id: 'f', status: 'discarded', removedAt: 9 }]);
    expectGrade('305: a Restore from Past that left the row in Past is a finding', r, { findings: 1 });
  }
  {
    const r = clone(okHead);
    r.r302[1].error = 'the window went away';
    // The probe review: that trial was the plain grid's one accepted Remove, so
    // the grid's tombstone half goes unread too, which is a second UNREADABLE.
    expectGrade('a trial that did not run is UNREADABLE', r, { findings: 0, unreadable: (u) => u.some((l) => l.includes('did not run')) && u.length === 2 });
  }
  {
    const r = clone(okHead);
    r.manifest = { error: 'sqlite3 refused' };
    expectGrade('an unreadable manifest is UNREADABLE, and reads as no finding', r, { findings: 0, unreadable: 1 });
  }
  {
    const r = clone(okHead);
    r.build = 'parent';
    r.r305[0].after = lists([{ id: 'd2', status: 'running', removedAt: null }], []);
    r.manifest.rows = r.manifest.rows.filter((x) => x.id !== 'd');
    r.log = { clause: 5 };
    expectGrade('the parent is never graded: its defect is a note', r, {
      findings: 0,
      notes: (n) => n.some((l) => l.includes('deleted the removed row in 1 of 1'))
    });
  }
  // THE PROBE REVIEW (Phase 353): a missing reading is UNREADABLE, never a pass.
  {
    const r = clone(okHead);
    r.r302[2].remove = { ok: false, error: 'never accepted in 4000 ms', tries: 1900 };
    r.r302[2].after = lists([{ id: 'c', status: 'exited', removedAt: null }], []);
    r.manifest.rows[2] = { id: 'c', name: 'c', status: 'exited', removed_at: null };
    expectGrade('review: a RACE cell whose Remove was never accepted raced nothing, so it is UNREADABLE, not a pass', r, { findings: 0, unreadable: 1 });
  }
  {
    const r = clone(okHead);
    r.r302[2].remove = { ok: false, error: 'no session with that id', tries: 3 };
    r.r302[2].after = lists([{ id: 'c', status: 'exited', removedAt: null }], []);
    r.manifest.rows[2] = { id: 'c', name: 'c', status: 'exited', removed_at: null };
    expectGrade('review: a RACE cell refused for any other reason raced nothing either', r, { findings: 0, unreadable: 1 });
  }
  {
    const r = clone(okHead);
    r.r302[1].remove = { ok: false, error: 'This session is still running, so it was not removed. End it first.' };
    r.r302[1].after = lists([{ id: 'b', status: 'exited', removedAt: null }], []);
    r.manifest.rows[1] = { id: 'b', name: 'b', status: 'exited', removed_at: null };
    expectGrade('review: a PLAIN grid in which no Remove was ever accepted never read a tombstone, so it is UNREADABLE', r, { findings: 0, unreadable: 1 });
  }
  {
    const r = clone(okHead);
    r.log = { ...logCounts(''), read: false };
    expectGrade("review: HEAD's log not read is UNREADABLE, never a count of 0", r, { findings: 0, unreadable: 1 });
  }
  {
    const r = clone(okHead);
    r.log = null;
    expectGrade('review: no log reading at all at HEAD is UNREADABLE', r, { findings: 0, unreadable: 1 });
  }
  {
    const r = clone(okHead);
    r.build = 'parent';
    r.log = { ...logCounts(''), read: false };
    expectGrade("review: the parent's log is never graded, so its absence is no unreadable", r, { findings: 0, unreadable: 0 });
  }
  {
    const r = clone(okHead);
    r.log = { ...logCounts('[gmux-socket] gmux-p353r-x\n'), read: true };
    expectGrade('review: an honest HEAD log with no clause line grades clean', r, { findings: 0, unreadable: 0 });
  }
  for (const [name, build] of Object.entries(EXPR)) {
    const sample = name === 'bridge' ? build('window.gmux.sessions.list()') : name === 'lists' ? build() : build('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 5);
    let parsed = true;
    let why = '';
    try {
      // Parsed and never called: nothing in it runs.
      void new Function(`return ${sample};`);
    } catch (err) {
      parsed = false;
      why = err instanceof Error ? err.message : String(err);
    }
    cases.push([parsed, `the page expression ${name} parses`, why]);
  }
  {
    const c = logCounts("x\n[gmux-sessions] a removed session's pane died: id=a; it stays in Past Sessions\n[gmux-manifest] a removed session keeps its status: id=b refused=exited\n");
    cases.push([c.guardReap === 1 && c.clause === 1 && c.guardEnd === 0, 'the log counter reads each line by its own words', J(c)]);
  }
  for (const [ok, what, detail] of cases) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok ? '' : `: ${detail}`}`);
  const bad = cases.filter(([ok]) => !ok).length;
  console.log(`${TAG} grader self-test: ${bad === 0 ? 'PASS' : 'FAIL'}, ${String(cases.length - bad)} of ${String(cases.length)} cases. Nothing was started.`);
  process.exit(bad === 0 ? 0 : 1);
}

if (process.argv.includes('--grader-self-test')) selfTest();

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked
// ---------------------------------------------------------------------------

const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (!socket.startsWith('gmux-p353r')) refuse(`"${socket}" is not a gmux-p353r harness socket. Run \`npm run probe:p353:records\`, which wraps this file in build/harness-socket.mjs.`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '' || !existsSync(harnessDir)) refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profiles.');
const TMUX = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
if (!existsSync(TMUX)) refuse(`${TMUX} is not there; this run reads its scratch server with the vendored tmux the app runs.`);
if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) refuse('there is no built out/ here. `npm run probe:p353:records` builds first.');
const parentRaw = (process.env['P353_PARENT_CHECKOUT'] ?? '').trim();
let parent = null;
if (parentRaw !== '') {
  parent = resolve(parentRaw);
  if (!existsSync(join(parent, 'out', 'main', 'index.js'))) refuse(`P353_PARENT_CHECKOUT (${parent}) holds no built out/main/index.js.`);
  if (realpathSync(parent) === realpathSync(ROOT)) refuse('P353_PARENT_CHECKOUT names this checkout.');
}
const ARMS = new Set(
  ((process.env['P353_ARMS'] ?? '').trim() || 'R302,R305').split(',').map((s) => s.trim()).filter((s) => s !== '')
);
for (const a of ARMS) if (a !== 'R302' && a !== 'R305') refuse(`P353_ARMS names ${a}; the arms are R302 and R305.`);

// ---------------------------------------------------------------------------
// The scratch world, under the harness folder: outside the repository and the home
// ---------------------------------------------------------------------------

const RUN = join(realpathSync(harnessDir), 'p353r');
const HOME = join(RUN, 'home');
const PROJECT = join(RUN, 'project');
const DB_COPIES = join(RUN, 'db');
for (const dir of [HOME, PROJECT, DB_COPIES]) mkdirSync(dir, { recursive: true });
/**
 * The app's PATH and its login shell's: the system folders, and FIRST a folder
 * holding one link, `node`, to this process's own runtime (Phase 353's fix
 * round). `build/electron-run.mjs` starts the `node_modules/.bin/electron`
 * shim, whose first line is `#!/usr/bin/env node`, under this PATH, and with
 * the system folders alone it answered `env: node: No such file or directory`
 * and the app never started (the records lens, 2026-11-05). probe-starts and
 * probe-status link it the same way. No agent's binary is named `node`.
 */
const NODE_BIN = join(RUN, 'nodebin');
mkdirSync(NODE_BIN, { recursive: true });
if (!existsSync(join(NODE_BIN, 'node'))) symlinkSync(process.execPath, join(NODE_BIN, 'node'));
const APP_PATH = `${NODE_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
writeFileSync(join(HOME, '.zshenv'), '', 'utf8');
writeFileSync(join(HOME, '.zprofile'), `export PATH="${APP_PATH}"\n`, 'utf8');
writeFileSync(join(HOME, '.zshrc'), `export PATH="${APP_PATH}"\nexport HISTFILE=/dev/null\nPS1='p353r %# '\n`, 'utf8');
writeFileSync(join(HOME, '.hushlogin'), '', 'utf8');
writeFileSync(join(PROJECT, 'README.md'), '# Phase 353, the records probe\n', 'utf8');
const PREFIX = 'p353r';

/** A read of the run's own scratch server; `-u` so a tab is never sent as `_`. */
const tm = (args) => spawnSync(TMUX, ['-u', '-L', socket, ...args], { encoding: 'utf8', timeout: 15_000 });

/** The `$-id` of the session whose `@gmux-id` is this row's id, on the run's own server. */
function tmuxIdOf(sessionId) {
  const r = tm(['list-sessions', '-F', '#{session_id}\t#{@gmux-id}']);
  for (const line of (r.stdout ?? '').split('\n')) {
    const [sid, gid] = line.split('\t');
    if (gid === sessionId) return sid;
  }
  return null;
}

// ---------------------------------------------------------------------------
// One launch, its page and its bridge
// ---------------------------------------------------------------------------

async function cdpForAppWindow(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__p293 === 'object' ? location.href : null`, 5000);
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          try {
            cdp?.close();
          } catch {
            /* already closed */
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window carrying the bridge and the Phase 293 drive');
    await sleep(250);
  }
}

/** Evaluate an async page expression and answer `{ ok, value | error }`. */
async function bridge(cdp, expr, ms = 120_000) {
  return JSON.parse(
    await cdpEval(
      cdp,
      EXPR.bridge(expr),
      ms
    )
  );
}

/** Both lists, as the page reads them. */
async function readLists(cdp) {
  const got = await bridge(cdp, EXPR.lists());
  if (!got.ok) throw new Error(`the lists could not be read: ${got.error}`);
  return got.value;
}

/** A shell session in the project, live in main's list, with its pane drawn. */
async function newShell(cdp, name) {
  const got = await bridge(cdp, `window.__p293.createSession(${J({ path: PROJECT, name })})`);
  if (!got.ok || typeof got.value !== 'string') throw new Error(`${name} was not created: ${J(got)}`);
  const id = got.value;
  const started = Date.now();
  for (;;) {
    const lists = await readLists(cdp);
    const row = lists.list.find((x) => x.id === id);
    if (row !== undefined && (row.status === 'running' || row.status === 'idle') && tmuxIdOf(id) !== null) break;
    if (Date.now() - started > 20_000) throw new Error(`${name} never read live with a session on the run's server`);
    await sleep(200);
  }
  // The shell's own prompt, so what is typed into it is read.
  await sleep(700);
  return id;
}

function launchOptions(label, checkout, profile) {
  return {
    label: `p353r-${label}`,
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: checkout,
    args: [
      '--remote-debugging-port=0',
      '--use-mock-keychain',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'
    ],
    env: withoutDevRenderer({
      HOME,
      ZDOTDIR: HOME,
      HISTFILE: '/dev/null',
      TERM_SESSION_ID: undefined,
      PATH: APP_PATH,
      SHELL: '/bin/zsh',
      GMUX_TMUX_SOCKET: socket,
      GMUX_PROBES: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1'
    }),
    graceMs: 8_000,
    ceilingMs: 25 * 60_000
  };
}

/** The manifest, from a COPY beside its WAL, through /usr/bin/sqlite3. */
function readManifest(profile, label) {
  const db = join(profile, 'gmux', 'manifest.db');
  if (!existsSync(db)) return { error: `no manifest at ${db}` };
  const copy = join(DB_COPIES, `${label}.db`);
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${copy}${suffix}`, { force: true });
    if (existsSync(`${db}${suffix}`)) copyFileSync(`${db}${suffix}`, `${copy}${suffix}`);
  }
  const r = spawnSync('/usr/bin/sqlite3', ['-json', copy, 'SELECT id, name, status, removed_at FROM sessions;'], { encoding: 'utf8', timeout: 20_000 });
  if (r.status !== 0) return { error: `sqlite3 refused: ${(r.stderr ?? '').trim()}` };
  const text = (r.stdout ?? '').trim();
  try {
    return { rows: text === '' ? [] : JSON.parse(text) };
  } catch (err) {
    return { error: `sqlite3 answered no JSON: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// The arms
// ---------------------------------------------------------------------------

async function armR302(cdp, reading) {
  // PLAIN: End, and Remove at the interval.
  for (const at of R302_INTERVALS) {
    const trial = { kind: 'plain', at };
    reading.r302.push(trial);
    try {
      trial.id = await newShell(cdp, `p353r-plain-${String(at)}`);
      const got = await bridge(cdp, EXPR.plain(trial.id, at));
      if (!got.ok) throw new Error(got.error);
      Object.assign(trial, got.value);
      await sleep(SETTLE_MS);
      trial.after = await readLists(cdp);
      say(`R302 plain @${String(at)}ms: remove ${trial.remove.ok ? `accepted at ${String(Math.round(trial.remove.ms))} ms` : 'refused'}, row ${listPlace(trial.after, trial.id).place}`);
    } catch (err) {
      trial.error = err instanceof Error ? err.message : String(err);
      say(`R302 plain @${String(at)}ms: ${trial.error}`);
    }
  }
  // RACE: the shell exits by itself, the End at the interval, the Remove the moment it is accepted.
  for (const at of R302_INTERVALS) {
    const trial = { kind: 'race', at };
    reading.r302.push(trial);
    try {
      trial.id = await newShell(cdp, `p353r-race-${String(at)}`);
      const target = tmuxIdOf(trial.id);
      if (target === null) throw new Error('its session is not on the run\'s server');
      const typed = tm(['send-keys', '-t', target, 'exit 3', 'Enter']);
      if (typed.status !== 0) throw new Error(`the exit could not be typed: ${(typed.stderr ?? '').trim()}`);
      const got = await bridge(cdp, EXPR.race(trial.id, at));
      if (!got.ok) throw new Error(got.error);
      Object.assign(trial, got.value);
      await sleep(SETTLE_MS);
      trial.after = await readLists(cdp);
      say(`R302 race @${String(at)}ms: end ${trial.end.ok ? 'resolved' : `refused (${trial.end.error})`}, remove ${trial.remove.ok ? `accepted at ${String(Math.round(trial.remove.ms))} ms after ${String(trial.remove.tries)} tries` : `not accepted (${trial.remove.error})`}, row ${listPlace(trial.after, trial.id).place}`);
    } catch (err) {
      trial.error = err instanceof Error ? err.message : String(err);
      say(`R302 race @${String(at)}ms: ${trial.error}`);
    }
  }
}

async function endShell(cdp, id) {
  const got = await bridge(cdp, `window.gmux.sessions.kill(${J(id)})`);
  if (!got.ok) throw new Error(`the End was refused: ${got.error}`);
  await sleep(400);
}

async function armR305(cdp, reading) {
  // A Remove inside the create, at each interval.
  for (const at of R305_INTERVALS) {
    const trial = { kind: 'inside', at };
    reading.r305.push(trial);
    try {
      trial.id = await newShell(cdp, `p353r-restart-${String(at)}`);
      await endShell(cdp, trial.id);
      const got = await bridge(cdp, EXPR.restartInside(trial.id, at));
      if (!got.ok) throw new Error(got.error);
      Object.assign(trial, got.value);
      await sleep(800);
      trial.after = await readLists(cdp);
      say(`R305 inside @${String(at)}ms: remove ${trial.remove.ok ? `at ${String(Math.round(trial.remove.ms))} ms` : `refused (${trial.remove.error})`}, restart ${trial.restart.ok ? `at ${String(Math.round(trial.restart.ms))} ms` : `refused (${trial.restart.error})`}, the removed row ${listPlace(trial.after, trial.id).place}`);
    } catch (err) {
      trial.error = err instanceof Error ? err.message : String(err);
      say(`R305 inside @${String(at)}ms: ${trial.error}`);
    }
  }
  // The control: an ordinary Restart of an ended row deletes it, as always.
  {
    const trial = { kind: 'control', at: null };
    reading.r305.push(trial);
    try {
      trial.id = await newShell(cdp, 'p353r-restart-control');
      await endShell(cdp, trial.id);
      const got = await bridge(cdp, EXPR.restartControl(trial.id));
      if (!got.ok) throw new Error(got.error);
      Object.assign(trial, got.value);
      await sleep(800);
      trial.after = await readLists(cdp);
      say(`R305 control: the ended row ${listPlace(trial.after, trial.id).place}, the replacement ${listPlace(trial.after, trial.restart.id).place}`);
    } catch (err) {
      trial.error = err instanceof Error ? err.message : String(err);
      say(`R305 control: ${trial.error}`);
    }
  }
  // Restore from Past: the removal date cleared and the row back.
  {
    const trial = { kind: 'restore', at: null };
    reading.r305.push(trial);
    try {
      trial.id = await newShell(cdp, 'p353r-restore');
      await endShell(cdp, trial.id);
      const removed = await bridge(cdp, `window.gmux.sessions.discard(${J(trial.id)})`);
      if (!removed.ok) throw new Error(`the Remove was refused: ${removed.error}`);
      await sleep(400);
      const restored = await bridge(cdp, `window.gmux.sessions.restore(${J(trial.id)})`, 180_000);
      trial.restore = restored.ok ? { ok: true } : { ok: false, error: restored.error };
      await sleep(1500);
      trial.after = await readLists(cdp);
      say(`R305 restore from Past: ${trial.restore.ok ? 'restored' : `refused (${trial.restore.error})`}, the row ${listPlace(trial.after, trial.id).place}`);
    } catch (err) {
      trial.error = err instanceof Error ? err.message : String(err);
      say(`R305 restore: ${trial.error}`);
    }
  }
}

async function runBuild(build, checkout) {
  const profile = join(RUN, `profile-${build}`);
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const reading = { build, checkout, r302: [], r305: [], unreadable: [], agents: null, launchError: null, manifest: null, log: null };
  const standIns = [];
  writeHiddenAgents(profile, PREFIX, hiddenAgentsBesides(standIns));
  const pre = hiddenAgentsPrecheck({ checkout, prefix: PREFIX, home: HOME, userPath: APP_PATH, standIns });
  say(`${build}: hidden agents precheck ${pre.ok ? 'holds' : 'FAILS'}: ${pre.said}`);
  if (!pre.ok) {
    reading.unreadable.push(`the hidden agents precheck failed at ${build}: ${pre.said}`);
    return reading;
  }
  try {
    await withElectron(launchOptions(build, checkout, profile), async (handle) => {
      const { cdp, url } = await cdpForAppWindow(profile, 120_000);
      say(`${build}: app window at ${url}, pid ${String(handle.appPid())}`);
      try {
        await cdp.call('Runtime.enable');
        await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
        // NO AGENT STARTS: the app's own scan must say nothing resolved, or nothing goes on.
        const list = JSON.parse(await cdpEval(cdp, AGENTS_LIST_EXPR, 60_000));
        reading.agents = standInsOnlyVerdict(list, { standIns });
        say(`${build}: agents:list ${reading.agents.ok ? 'holds' : 'FAILS'}: ${reading.agents.said}`);
        if (!reading.agents.ok) {
          reading.unreadable.push(`agents:list at ${build}: ${reading.agents.said}`);
          return;
        }
        const added = await bridge(cdp, `window.__p293.addProject(${J(PROJECT)})`);
        if (!added.ok) throw new Error(`the project could not be opened: ${added.error}`);
        if (ARMS.has('R302')) await armR302(cdp, reading);
        if (ARMS.has('R305')) await armR305(cdp, reading);
      } finally {
        try {
          writeFileSync(join(RUN, `app-${build}.log`), handle.text());
        } catch {
          /* the readings are the evidence; this is the footnote */
        }
        cdp.close();
      }
    });
  } catch (err) {
    reading.launchError = err instanceof Error ? err.message : String(err);
    reading.unreadable.push(`the ${build} launch did not complete: ${reading.launchError}`);
  }
  // The app has exited; the manifest is read from a copy, never live.
  reading.manifest = readManifest(profile, build);
  // ONE source, so a line is counted once: the app's own log file when file
  // logging wrote one, else what the app printed.
  let logText = '';
  for (const path of [join(profile, 'logs', 'app.log'), join(RUN, `app-${build}.log`)]) {
    try {
      logText = readFileSync(path, 'utf8');
      reading.logFrom = path;
      break;
    } catch {
      /* the next one */
    }
  }
  // An app always prints (the socket line the helper requires, at least), so
  // nothing read is no log, never a log with no clause line in it.
  reading.log = { ...logCounts(logText), read: logText !== '' };
  return reading;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const readings = { socket, run: RUN, arms: [...ARMS], builds: [] };
let exit = 0;
try {
  if (parent !== null) readings.builds.push(await runBuild('parent', parent));
  readings.builds.push(await runBuild('head', ROOT));
} catch (err) {
  readings.error = err instanceof Error ? err.message : String(err);
  exit = 2;
}
const path = join(RUN, 'readings.json');
writeFileSync(path, `${J(readings)}\n`, 'utf8');
for (const b of readings.builds) {
  const g = gradeBuild(b);
  b.grade = g;
  say(`${b.build}: ${String(g.findings.length)} finding(s), ${String(g.unreadable.length)} unreadable, log ${J({ guardReap: b.log?.guardReap, guardEnd: b.log?.guardEnd, keptRestart: b.log?.keptRestart, clause: b.log?.clause })}`);
  for (const f of g.findings) say(`  FINDING ${f}`);
  for (const u of g.unreadable) say(`  UNREADABLE ${u}`);
  for (const n of g.notes) say(`  note ${n}`);
}
// A finding at HEAD is a failure whatever else could not be read; past that, a
// cell that could not be read anywhere leaves the run UNREADABLE, never a pass.
const graded = readings.builds.map((b) => b.grade);
if (graded.some((g) => g.findings.length > 0)) exit = 1;
else if (exit === 0 && graded.some((g) => g.unreadable.length > 0)) exit = 2;
if (!readings.builds.some((b) => b.build === 'head')) exit = Math.max(exit, 2);
writeFileSync(path, `${J(readings)}\n`, 'utf8');
say(`readings at ${path}`);
console.log(`${TAG} ${exit === 0 ? 'PASS' : exit === 1 ? 'FAIL' : 'UNREADABLE'}${parent === null ? ' (HEAD alone; P353_PARENT_CHECKOUT reads the parent first)' : ''}.`);
process.exit(exit);
