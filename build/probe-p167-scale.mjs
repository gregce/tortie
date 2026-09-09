#!/usr/bin/env node
/**
 * probe-p167-scale.mjs. The Phase 167 scale scenario as a repeatable check
 * (Phase 171).
 *
 * ## Why this file exists
 *
 * Phase 167 drove the audit's scale profiles by hand through attack agents,
 * found two leaks, fixed both, and committed no driver. The audit of
 * 2026-08-30 named that: a scenario nobody can rerun is a story, and the
 * point it withheld comes back only when the scenario is a check. This is
 * that check. It launches ONE Electron through build/electron-run.mjs on a
 * scratch profile and a scratch tmux socket, drives three of the five Phase
 * 167 profiles in blocks, reads the rulers after every block, and grades the
 * blocks by the rule Phase 167 adopted: repeated cycles must plateau, and a
 * retained upward slope is a finding.
 *
 * ## The three profiles it drives, and the two it does not
 *
 *   b  project switches. Two scratch repositories are open as tabs, and each
 *      cycle steps through both with the Next project chord, which refreshes
 *      Source Control for the project that becomes active.
 *   c  surface open and close. Each cycle opens and closes Catch Me Up by its
 *      chord and Escape, the Architecture view by its chord and the Explorer
 *      chord, a file in Monaco, a diff, and a rendered markdown preview, the
 *      last three closed with the Close editor tab chord.
 *   d  split, close and reattach. Each cycle creates four real shell sessions
 *      through the shot drive's splitGrid, stages them as a grid, then kills
 *      all four through the cleanup hook. This is the exact shape that leaked
 *      one pty master per attach on the parent of Phase 167.
 *
 *   a  launches at zero to fifty sessions is `npm run probe:p163`, which owns
 *      the launch ruler, so it is not repeated here.
 *   e  remote disconnect, reconnect and quit needs a loopback sshd and belongs
 *      to `npm run smoke:matrix`, which Phase 173 adjudicates.
 *
 * ## The rulers, and which ones are asserted
 *
 * After every block the renderer is collected twice over the devtools
 * protocol and its JS heap used, DOM node count, event listener count and
 * document count are read from Performance.getMetrics. Those four are
 * ASSERTED: the growth from EVERY block to the block after it must stay under
 * the budgets below, in all three dimensions, and the worst pair is the
 * verdict. A heap that climbs by more than half the budget on every block is
 * additionally a slope. The rule is written over every pair rather than over
 * the last one because a leak that is collected late is still a leak, and the
 * last pair of a run that retained and then released reads NEGATIVE.
 * Profile d asserts heap only and reports nodes and listeners, because its
 * cycles kill and discard twelve real sessions a block and the Past Sessions
 * data that leaves behind grows the DOM by design.
 *
 * PHASE 220 gave that profile the two rulers it was missing, and they are the
 * two the sentence above could not provide. See judge() for both.
 *
 *   detached  Elements the renderer holds that no document can reach, counted
 *             after the two collections through `Runtime.queryObjects`, which
 *             is how the devtools console's own `queryObjects()` helper works
 *             and is a different mechanism from the Performance counters. A
 *             detached tree is never drawn and is never Past Sessions, so it
 *             can be asserted where `Nodes` cannot.
 *   past      How many discarded sessions the app holds in Past Sessions,
 *             asked of the app through `sessions.listRemoved`. It is the
 *             WORKLOAD FLOOR: a block that discarded nothing retains nothing,
 *             and a run under the floor is INCONCLUSIVE and says so rather than
 *             printing a plateau. It is also what proves this profile kept its
 *             history while releasing its disposable state, which is the
 *             distinction the whole finding turns on.
 *
 * And at the end of every run the page is asked to HOLD 24 detached trees of 43
 * elements each, being the size the failing runs of 2026-09-07 held per block.
 * The census must see them, the grader must go red on them, and the release
 * must bring the count back. A run that cannot do all three says so and fails,
 * because a ruler that has only ever been watched reporting "nothing was
 * retained" has not been watched at all.
 *
 * The whole drive runs under emulated reduced motion, which is the app's own
 * no flight path. The surface flights end on a requestAnimationFrame that
 * Chromium throttles when the window is occluded on the person's screen, and
 * a check must not depend on what covers the window while it runs.
 *
 * For the main process, `lsof` counts its open `/dev/ptmx` and `/dev/ttys`
 * descriptors. Those are ASSERTED across the split profile: the count after
 * the last block must equal the count before the first. That is Phase 167
 * finding 1, and it is the one regression this file exists to catch.
 *
 * The physical footprint of main and of the renderer, read by `vmmap` from
 * outside the app, is REPORTED and not asserted. Phase 167 measured main's
 * climb through the split profile to the wall, owned it, and named it: it is
 * V8 growing the young generation toward its 64 MB cap under the churn's
 * allocation rate, nothing in it is retained, and it comes back once the
 * memory reducer runs. A budget on that figure would be red on a healthy
 * tree, so the figure is printed for a person to read beside the asserted
 * ones.
 *
 * ## Safety, absolute
 *
 *   - Refuses to run without a harness socket, and refuses `gmux` and
 *     `default` by name. The socket is the one build/harness-socket.mjs made
 *     for this run, and that script ends it.
 *   - The profile, HOME and both repositories are under GMUX_HARNESS_DIR, so
 *     no file under the person's home is opened or written.
 *   - Every session is `shell`. No agent binary is spawned and no token is
 *     spent.
 *   - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *     count taken before and after, which must match.
 *   - It signals nothing itself. The one Electron is ended by withElectron's
 *     finally block, and the script exits through process.exit after that
 *     returns.
 *
 * Usage:
 *   npm run probe:p167
 *   node build/probe-p167-scale.mjs --self-test    grades twelve fixtures and
 *                                                  launches nothing
 *
 * ## WHY THE SURFACE PROFILE RUNS THROTTLED (Phase 200 fix round)
 *
 * Until this round the same command on the same commit reported different
 * verdicts. Three consecutive profile c runs read 967 / 967 / 967 nodes and
 * passed, 967 / 967 / 1,272 and passed, and 2,606 / 4,268 / 5,930 and failed.
 * A ruler that reports a plateau on a tree that retains is worse than no ruler,
 * and it is the seam the 0.98.0 audit's Test seam category is about.
 *
 * The cause is a RACE, not the highlight pool the first attempt suspected.
 * Opening the diff changes the container's computed colours a moment after it
 * is inserted, because @pierre/diffs adopts its theme stylesheet then. Under
 * reduced motion, which this check emulates and a person can switch on, the
 * app's own rule used to leave `transition-property` at `all`, so those colour
 * changes started real transitions; a transition still running when the
 * element is removed is kept alive by the document timeline and holds the whole
 * detached tree. Whether the removal beats the transition's first frame is
 * decided by how busy the machine is, which is why the same command answered
 * both ways.
 *
 * So the surface profile drives under `Emulation.setCPUThrottlingRate`, which
 * WIDENS that window. It does not close it. Measured on 2026-09-02 over three
 * blocks of six diff opens on a machine another workflow had at a load average
 * over 40: unthrottled, 0 nodes a block on a quiet machine and 1,104 on a
 * loaded one; at 4x, 1,104 a block three times out of three at the parent and
 * 42 at HEAD. The fix round's verifier then reran the parent on a QUIET machine
 * and read the node count exactly flat at 4x and again at 20x, 457/457/457 diff
 * only and 967/967/967 over all five surfaces, the same figures this tree
 * reads. So the node count is the sensitive ruler and never the deterministic
 * one: it catches this defect when the machine is busy and says nothing about
 * it when the machine is idle, at any throttle.
 *
 * The DETERMINISTIC half of the check is the motion reading below, which is a
 * state and not a race: at the parent it read `transition-property: all` in 18
 * of 18 diff opens on a quiet machine and in 6 of 6 on a loaded one, and here
 * it reads `none` every time. That is the reading a person should believe when
 * the two disagree. The throttle is applied for profile c only and reset after
 * it, because profiles b and d create and kill real sessions and their waits
 * are not written for a machine running at a quarter speed. The run FAILS if
 * the throttle cannot be applied, so a Chromium that stopped supporting it
 * cannot quietly turn the ruler off.
 *
 * ## WHAT PHASE 220 COULD NOT DO, WRITTEN DOWN SO NOBODY READS A GREEN RUN AS
 * ## THE ANSWER
 *
 * The split profile failed two runs of three at `b5cc017` on 2026-09-07, at
 * about 5 MB and exactly 1,020 DOM nodes a block, with the elements REACHABLE
 * from the document flat, so what grew was entirely detached. Seven runs
 * afterwards, over a renderer BYTE IDENTICAL to the one those runs measured
 * (`git diff b5cc017 HEAD -- src/renderer src/shared src/preload` is empty),
 * came back clean: 0 to 13 detached elements, constant, and a flat node count.
 * Two of those seven drove at a quarter CPU speed and one drove beside another
 * app doing the same work, so neither the throttle nor contention reproduced
 * it. NO OWNER WAS NAMED, and no renderer file was changed on a guess.
 *
 * What is here instead is the instrument that names one the day it comes back:
 * the detached census in every reading, the workload floor under it, one heap
 * snapshot per block behind `P167_SNAPSHOT=1` and `build/heap-retainers.mjs` to
 * read the retaining paths out of it. A run that goes red now says WHICH trees
 * and, with the snapshot, WHAT HOLDS THEM.
 *
 * Knobs, none prefixed GMUX_ so the contract inventory's env sweep does not
 * carry them: P167_BLOCKS (default 3), P167_CYCLES per block (default 6),
 * P167_PROFILES (default b,c,d), P167_OUT_DIR (default out/p167),
 * P167_HEAP_MB (default 8), P167_NODES (default 400), P167_LISTENERS
 * (default 200), P167_DETACHED (default 50), P167_CPU, the throttle
 * (default 4; 1 turns it off and the run says so), P167_CPU_PROFILES, which
 * profiles it applies to (default c), P167_SNAPSHOT=1 for a heap snapshot per
 * block, P167_PLANT=0 to skip the planted leak arm, P167_CENSUS_ROOTS, how
 * many detached tree roots each census line names (default 6), P167_REWRITES,
 * outside rewrites of the open file per redline open (default 4), P167_TYPES,
 * typed-and-taken-back words per redline open (default 2), and P167_ACCEPTS,
 * per-change accepts per redline open (default 2; each moves the tab's shadow
 * baseline and its generation and rebuilds the whole run list, and none of
 * them writes the person's file).
 *
 * PHASE 243. Each of those accepts now also RECORDS the baseline it moved to,
 * through main, into `<userData>/gmux/baselines/` — so the redline's churn per
 * cycle carries a durable write with it, and a descriptor kept per record
 * would show up in the descriptor reading this probe already asserts. The
 * count is read off the scratch profile's own store directory after the
 * surface closes, and a cycle that accepted and recorded nothing is a verdict
 * rather than a silence, because the plateau it printed would say nothing
 * about the half that never ran. It is one record per FILE and not per
 * accept: the record holds the newest baseline and the ring holds two bodies.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from './cdp-client.mjs';
import {
  inheritedDevRendererVars,
  withElectron,
  withoutDevRenderer
} from './electron-run.mjs';
import { seedArchSwitchOn } from './probe-arch-switch.mjs';
import {
  assertReachable,
  closeMaster,
  endRecordedPids,
  gate,
  listFarSessions,
  runOnMachine
} from './real-machine.mjs';
import { keyscanText } from './ssh-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/**
 * PHASE 200. Which of profile c's surfaces this run drives. Five when this
 * was written, six since Phase 225 added the redline, seven since Phase 230
 * added the four sidebar views on a remote tab.
 *
 * The 0.98.0 audit read the combined profile retaining 1,512 DOM nodes and 126
 * listeners a block and could say nothing about WHICH surface did it, because
 * one cycle opens and closes all five. One at a time is what turns a slope into
 * a name, and it is how Phase 200 found that the whole of it is Diff.
 *
 * The default is all of them, so the ordinary command is the combined profile
 * the audit measured, with the redline beside the diff it reads.
 */
const SURFACES = (
  process.env['P167_SURFACES'] ?? 'overview,arch,file,diff,redline,preview,remote'
)
  .split(',')
  .map((one) => one.trim())
  .filter((one) => one !== '');
const wantSurface = (name) => SURFACES.includes(name);
/** PHASE 227. Outside rewrites of the open file per redline open; 0 turns them off. */
const REWRITES = Math.max(0, Number(process.env['P167_REWRITES'] ?? '4') || 0);
/** PHASE 237. Typed-and-taken-back words per redline open; 0 turns them off. */
const TYPES = Math.max(0, Number(process.env['P167_TYPES'] ?? '2') || 0);
/** PHASE 238. Per-change accepts per redline open; 0 turns them off. */
const ACCEPTS = Math.max(0, Number(process.env['P167_ACCEPTS'] ?? '2') || 0);
/**
 * PHASE 230. The seventh surface is the four sidebar views on a tab whose
 * folder is on another machine, being the Explorer, Source control, Search
 * and Context, each of which now re-reads that machine when the window
 * regains focus through ONE hook, src/renderer/machines/use-remote-reread.ts.
 * A re-read on focus is a listener on a bus, and a listener attached on mount
 * and not released on unmount is exactly what this probe's listener count
 * exists to catch, so the four views are opened and closed on a remote tab
 * the way the six surfaces above are opened and closed on a local one, with
 * a window focus fired into each.
 *
 * The hook is inert on a tab whose folder is on this Mac, so driving the same
 * views on repo-a would measure nothing. A remote tab needs a machine that
 * answers, because main refuses to add a project on a machine it is not
 * connected to, so this surface is driven only when a person named one
 * through the same two variables build/real-machine.mjs already reads,
 * GMUX_REAL_MACHINE_HOST and GMUX_REAL_MACHINE_CONFIRM, and the run says so
 * in its output and its report either way. Under Phase 224's bounds: every
 * far write goes under one scratch directory in that person's home, removed
 * in the finally; the far server this run's scratch socket starts is killed
 * and its socket file unlinked in the same finally; the far `-L gmux` server
 * is only ever listed, once before and once after, and both counts are
 * printed.
 */
const REMOTE_HOST = (process.env['GMUX_REAL_MACHINE_HOST'] ?? '').trim();
const remoteArmed = wantSurface('remote') && REMOTE_HOST !== '';
const REMOTE_MACHINE_ID = 'p167-machine';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => process.stdout.write(`${line}\n`);

// ---------------------------------------------------------------------------
// The grader. Pure, so --self-test can prove it fails when it should.
// ---------------------------------------------------------------------------

export const DEFAULT_BUDGETS = {
  heapMb: 8,
  nodes: 400,
  listeners: 200,
  // PHASE 220. Detached elements the renderer still holds after two forced
  // collections. Zero is what a healthy split profile reads; the budget is
  // generous so a transient one nobody owns is not a finding, and the failing
  // runs of 2026-09-07 held about five hundred.
  detached: 50
};

/**
 * Judge one profile's block readings against the plateau rule.
 *
 * `blocks` is the reading after each block, oldest first, each carrying
 * `heapMb`, `nodes`, `listeners`, `documents`, `detached`, `past`, and, when
 * the profile tracks descriptors, `ptmx` and `ttys`. `before` is the reading
 * taken before the first block. Returns the list of failures, empty when the
 * profile passed.
 *
 * PHASE 220 added the last two, and they are the two halves of the question
 * this profile could not previously answer.
 *
 *   detached  Elements the renderer holds that are NOT reachable from any
 *             document, counted by `detachedCensus` below through
 *             `Runtime.queryObjects`, which is a different mechanism from the
 *             `Performance.getMetrics` counters everything else here reads.
 *             `Nodes` counts drawn and detached nodes together, which is why
 *             this profile's node budget had to be turned off: the header used
 *             to say Past Sessions grows the DOM by design. Detached elements
 *             are never drawn and never intentional, so they can be asserted
 *             here where `Nodes` cannot.
 *   past      How many discarded sessions the app has in Past Sessions. It is
 *             the WORKLOAD FLOOR. A profile that killed nothing retains
 *             nothing, and a ruler that cannot tell "the app released it" from
 *             "there was nothing to release" reports a plateau over a run that
 *             measured nothing. A run under the floor is INCONCLUSIVE and says
 *             so, rather than passing.
 */
export function judge(profile, before, blocks, budgets = DEFAULT_BUDGETS, rules = {}) {
  const assertNodes = rules.nodes !== false;
  const assertListeners = rules.listeners !== false;
  const failures = [];
  if (blocks.length < 2) {
    failures.push(`${profile}: fewer than two blocks were read, so no plateau can be judged`);
    return failures;
  }
  const last = blocks[blocks.length - 1];
  /**
   * The WORST growth from one block to the next, and which pair it was.
   *
   * PHASE 200 fix round, and this is the rule that decides whether the check
   * can be trusted. It used to read the last pair only. On 2026-09-02 a run
   * over a tree that retains read 2,650, then 4,312, then 967 nodes: the
   * retained trees were released during the last block, the last pair was
   * NEGATIVE, and the check printed "every driven profile plateaued" over a
   * defect it had just measured 1,662 of. A leak that is collected late is
   * still a leak, and a ruler that a late collection can talk out of its
   * finding is the seam the audit's Test seam category is about. So every
   * pair is judged and the worst one is the verdict.
   *
   * The fix round's own verifier then found the rule half applied: nodes and
   * listeners were judged over every pair and the HEAP was still judged over
   * the last pair alone, which is the one dimension the split profile fails
   * on. Written as a fixture, "retained then released in the last block" came
   * back red on nodes, red on listeners and GREEN on heap. All three
   * dimensions now use this function, so the rule the commit body, CLAUDE.md
   * and DESIGN-SPEC state is the rule the code applies.
   */
  const worst = (k) => {
    let value = 0;
    let at = 0;
    for (let i = 1; i < blocks.length; i += 1) {
      const step = blocks[i][k] - blocks[i - 1][k];
      if (step > value) {
        value = step;
        at = i;
      }
    }
    return { value, at };
  };
  const heapGrowth = worst('heapMb');
  if (heapGrowth.value > budgets.heapMb) {
    failures.push(
      `${profile}: renderer JS heap grew ${heapGrowth.value.toFixed(1)} MB from block ${String(heapGrowth.at)} to block ${String(heapGrowth.at + 1)}, over the ${String(budgets.heapMb)} MB budget`
    );
  }
  const nodeGrowth = worst('nodes');
  if (assertNodes && nodeGrowth.value > budgets.nodes) {
    failures.push(`${profile}: DOM nodes grew ${String(nodeGrowth.value)} from block ${String(nodeGrowth.at)} to block ${String(nodeGrowth.at + 1)}, over the ${String(budgets.nodes)} budget`);
  }
  const listenerGrowth = worst('listeners');
  if (assertListeners && listenerGrowth.value > budgets.listeners) {
    failures.push(`${profile}: event listeners grew ${String(listenerGrowth.value)} from block ${String(listenerGrowth.at)} to block ${String(listenerGrowth.at + 1)}, over the ${String(budgets.listeners)} budget`);
  }
  // A slope: every block-to-block heap delta over half the budget, across
  // three or more blocks. A one time allocation lands in one delta and then
  // stops; a leak lands in all of them.
  if (blocks.length >= 3) {
    const deltas = [];
    for (let i = 1; i < blocks.length; i += 1) deltas.push(blocks[i].heapMb - blocks[i - 1].heapMb);
    if (deltas.every((d) => d > budgets.heapMb / 2)) {
      failures.push(
        `${profile}: renderer JS heap climbed on every block (${deltas.map((d) => d.toFixed(1)).join(', ')} MB), which is a slope and not a plateau`
      );
    }
  }
  // PHASE 220. Detached elements: never drawn, never intentional, and the one
  // dimension of this profile that Past Sessions cannot explain away.
  if (rules.detached !== false) {
    const readings = [before, ...blocks];
    const missing = readings.filter((r) => typeof r.detached !== 'number').length;
    if (missing > 0) {
      failures.push(
        `${profile}: the detached element census came back empty for ${String(missing)} of ${String(readings.length)} readings, so this profile cannot say whether the renderer released the trees it discarded`
      );
    } else {
      const detachedGrowth = worst('detached');
      if (detachedGrowth.value > budgets.detached) {
        failures.push(
          `${profile}: the renderer held ${String(detachedGrowth.value)} more detached element(s) after block ${String(detachedGrowth.at + 1)} than after block ${String(detachedGrowth.at)}, over the ${String(budgets.detached)} budget. Detached trees are not drawn and are never Past Sessions.`
        );
      }
    }
  }
  // PHASE 220. The workload floor. See the comment above `past`.
  if (typeof rules.historyFloor === 'number') {
    const readings = [before, ...blocks].map((r) => r.past);
    const missing = readings.filter((p) => typeof p !== 'number').length;
    if (missing > 0) {
      failures.push(
        `${profile}: the Past Sessions count could not be read for ${String(missing)} of ${String(readings.length)} readings, so this run cannot say that its workload landed`
      );
    } else {
      let least = Infinity;
      let at = 0;
      for (let i = 1; i < readings.length; i += 1) {
        const step = readings[i] - readings[i - 1];
        if (step < least) {
          least = step;
          at = i;
        }
      }
      if (least < rules.historyFloor) {
        failures.push(
          `${profile}: block ${String(at)} put ${String(least)} discarded session(s) into Past Sessions, under the floor of ${String(rules.historyFloor)}. This run is INCONCLUSIVE rather than a plateau: a workload that did not land retains nothing, and that is not evidence about the renderer.`
        );
      }
    }
  }
  if (typeof before.ptmx === 'number' && typeof last.ptmx === 'number') {
    if (last.ptmx !== before.ptmx) {
      failures.push(`${profile}: main holds ${String(last.ptmx)} /dev/ptmx descriptors after the last block against ${String(before.ptmx)} before the first (Phase 167 finding 1)`);
    }
    if (last.ttys !== before.ttys) {
      failures.push(`${profile}: main holds ${String(last.ttys)} /dev/ttys descriptors after the last block against ${String(before.ttys)} before the first (Phase 167 finding 1)`);
    }
  }
  return failures;
}

function selfTest() {
  const b = (heapMb, nodes, listeners, ptmx = 0, ttys = 0) => ({ heapMb, nodes, listeners, documents: 1, ptmx, ttys, detached: 0, past: 0 });
  /** PHASE 220. A reading with a detached count and a Past Sessions count. */
  const d = (heapMb, detached, past) => ({ heapMb, nodes: 448, listeners: 229, documents: 14, ptmx: 0, ttys: 0, detached, past });
  const cases = [
    { name: 'flat', before: b(30, 2000, 300), blocks: [b(31, 2010, 301), b(31.5, 2012, 302), b(31.2, 2011, 301)], red: false },
    { name: 'one time allocation that plateaus', before: b(30, 2000, 300), blocks: [b(80, 2400, 380), b(81, 2410, 381), b(81.5, 2405, 380)], red: false },
    { name: 'steady climb', before: b(30, 2000, 300), blocks: [b(36, 2000, 300), b(42, 2000, 300), b(48, 2000, 300)], red: true },
    { name: 'descriptor leak', before: b(30, 2000, 300, 0, 0), blocks: [b(30, 2000, 300, 6, 6), b(30, 2000, 300, 12, 12), b(30, 2000, 300, 18, 18)], red: true },
    { name: 'listener leak', before: b(30, 2000, 300), blocks: [b(30, 2000, 300), b(30, 2000, 300), b(30, 2000, 600)], red: true },
    // PHASE 200 fix round. The shape that walked past the old rule: it
    // retained 1,662 nodes a block and then released them during the last
    // block, so the last pair read minus 3,345. These are the real numbers
    // from a run on 2026-09-02.
    { name: 'retained, then released in the last block', before: b(26, 439, 227), blocks: [b(25.3, 2650, 464), b(26.7, 4312, 626), b(26.5, 967, 303)], red: true },
    // And its opposite, so the new rule is not simply stricter: a surface that
    // warms up between the first two blocks and then holds still is green.
    { name: 'warm up then hold', before: b(7, 439, 227), blocks: [b(20, 974, 303), b(20.2, 1010, 303), b(20.1, 1004, 303)], red: false },
    // PHASE 200 fix round, second pass. The same shape written in the HEAP
    // dimension, which is the one the split profile fails on and the one the
    // first pass left reading the last pair alone. It was green here and it
    // must be red.
    { name: 'heap retained, then released in the last block', before: b(26, 439, 227), blocks: [b(26, 439, 227), b(45, 439, 227), b(26.5, 439, 227)], red: true },
    // And its opposite in the same dimension: a heap that steps up once, under
    // the budget, and then holds is a warm up and stays green.
    { name: 'heap warms up under the budget then holds', before: b(20, 439, 227), blocks: [b(20, 439, 227), b(25, 439, 227), b(25.2, 439, 227)], red: false },
    { name: 'one block', before: b(30, 2000, 300), blocks: [b(30, 2000, 300)], red: true },
    { name: 'node growth under the d rules', before: b(30, 2000, 300), blocks: [b(30, 2600, 300), b(30, 3300, 300), b(30, 4100, 300)], red: false, rules: { nodes: false, listeners: false } },
    { name: 'descriptor leak under the d rules', before: b(30, 2000, 300, 1, 0), blocks: [b(30, 2000, 300, 31, 1), b(30, 2000, 300, 61, 1), b(30, 2000, 300, 91, 1)], red: true, rules: { nodes: false, listeners: false } },
    // PHASE 220. The split profile's own shape, in the two dimensions it could
    // not previously judge. The healthy reading is measured: 0 detached at every
    // block and 24 discarded sessions a block into Past Sessions.
    { name: 'the split profile healthy', before: d(7.2, 0, 0), blocks: [d(10.3, 0, 24), d(10.3, 0, 48), d(11.1, 0, 72)], red: false, rules: { nodes: false, listeners: false, historyFloor: 21 } },
    // A disposable leak: the history is recorded normally and the renderer keeps
    // a detached tree per discarded session. Nothing else moves, so only the new
    // rule can catch it. The heap here stays under the slope rule on purpose.
    { name: 'detached trees held per discarded session', before: d(7.2, 0, 0), blocks: [d(10.3, 500, 24), d(11.0, 1000, 48), d(11.6, 1500, 72)], red: true, rules: { nodes: false, listeners: false, historyFloor: 21 } },
    // The census never answered. A ruler that reports green over a reading it
    // did not take is the thing this round is repairing.
    { name: 'the detached census came back empty', before: d(7.2, 0, 0), blocks: [{ ...d(10.3, 0, 24), detached: null }, d(10.3, 0, 48), d(11.1, 0, 72)], red: true, rules: { nodes: false, listeners: false, historyFloor: 21 } },
    // The workload did not land. This is the run that used to print "every
    // driven profile plateaued" over a block that discarded nothing.
    { name: 'a plateau over a workload that did not land', before: d(7.2, 0, 0), blocks: [d(10.5, 0, 24), d(10.5, 0, 26), d(11.1, 0, 50)], red: true, rules: { nodes: false, listeners: false, historyFloor: 21 } },
    // And a run whose history could not be read at all, which is the same
    // absence and must read the same way.
    { name: 'the Past Sessions count could not be read', before: d(7.2, 0, 0), blocks: [{ ...d(10.3, 0, 24), past: null }, d(10.3, 0, 48), d(11.1, 0, 72)], red: true, rules: { nodes: false, listeners: false, historyFloor: 21 } },
    // A profile that records no history at all, being b and c, must not be
    // asked the workload question. Without this the two other profiles would
    // go red on a rule that is not about them.
    { name: 'a profile with no history floor is not asked', before: d(7.2, 0, 0), blocks: [d(7.7, 4, 0), d(7.7, 4, 0), d(7.7, 4, 0)], red: false, rules: {} }
  ];
  let bad = 0;
  for (const c of cases) {
    const failures = judge(c.name, c.before, c.blocks, DEFAULT_BUDGETS, c.rules ?? {});
    const red = failures.length > 0;
    const ok = red === c.red;
    if (!ok) bad += 1;
    say(`self-test ${ok ? 'ok  ' : 'BAD '} ${c.name}: ${red ? 'red' : 'green'}${failures.length > 0 ? ` (${failures[0]})` : ''}`);
  }
  if (bad > 0) {
    say(`self-test: ${String(bad)} fixture(s) misjudged`);
    process.exit(1);
  }
  say('self-test: the grader fails on every red fixture and passes every green one');
  process.exit(0);
}

if (process.argv.includes('--self-test')) selfTest();

// ---------------------------------------------------------------------------
// Refusals and the run's shape
// ---------------------------------------------------------------------------

function refuse(message) {
  process.stderr.write(`probe-p167-scale: ${message}\n`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}". Run through build/harness-socket.mjs.`);
}
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set. Run through build/harness-socket.mjs.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) refuse('no build under out/. Run npm run build first.');

const blocksWanted = Math.max(2, Number(process.env['P167_BLOCKS'] ?? '3'));
const cyclesWanted = Math.max(1, Number(process.env['P167_CYCLES'] ?? '6'));
const profilesWanted = (process.env['P167_PROFILES'] ?? 'b,c,d').split(',').map((s) => s.trim()).filter(Boolean);
const budgets = {
  heapMb: Number(process.env['P167_HEAP_MB'] ?? String(DEFAULT_BUDGETS.heapMb)),
  nodes: Number(process.env['P167_NODES'] ?? String(DEFAULT_BUDGETS.nodes)),
  listeners: Number(process.env['P167_LISTENERS'] ?? String(DEFAULT_BUDGETS.listeners)),
  detached: Number(process.env['P167_DETACHED'] ?? String(DEFAULT_BUDGETS.detached))
};
/**
 * The CPU throttle the surface profile drives under. See the header: it is
 * what makes the diff retention reproduce every run instead of one run in
 * three. 1 turns it off, and a run that turns it off says so in its output and
 * in its report, so a green verdict from an unthrottled run can never be read
 * as the same evidence as a green verdict from a throttled one.
 */
const cpuThrottle = Math.max(1, Number(process.env['P167_CPU'] ?? '4'));
/**
 * PHASE 220. How many detached tree roots the census names in the run's own
 * output. The census itself is always taken, because its count is asserted.
 */
const censusRoots = Math.max(0, Number(process.env['P167_CENSUS_ROOTS'] ?? '6'));
/** PHASE 220. One heap snapshot per block, off by default. */
const snapshots = process.env['P167_SNAPSHOT'] === '1';
/**
 * PHASE 220. The planted leak arm at the end of the run, on by default because
 * it costs about five seconds and it is what makes a green verdict mean
 * something. `P167_PLANT=0` turns it off and the run says nothing was proved.
 */
const plantArm = process.env['P167_PLANT'] !== '0';
/**
 * PHASE 220. WHICH profiles drive under the throttle. The default is the
 * surface profile alone, which is exactly what Phase 200 wired, so the ordinary
 * command is unchanged.
 *
 * It is a knob because the split profile's retention is the same KIND of
 * reading as the diff's was: it appeared in two runs of three at `b5cc017` and
 * in none of three afterwards on a quiet machine, and the throttle is this
 * file's own way of widening a window rather than waiting for another workflow
 * to load the machine. A run that turns it on for a profile says so in its
 * output and in its report, so its verdict can never be read as the same
 * evidence as the default command's.
 */
const cpuProfiles = (process.env['P167_CPU_PROFILES'] ?? 'c')
  .split(',')
  .map((one) => one.trim())
  .filter((one) => one !== '');
const outDir = resolve((process.env['P167_OUT_DIR'] ?? '').trim() || join(REPO, 'out', 'p167'));
mkdirSync(outDir, { recursive: true });
mkdirSync(join(harnessDir, 'p167'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p167'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const repoA = join(root, 'repo-a');
const repoB = join(root, 'repo-b');
for (const d of [home, profile]) mkdirSync(d, { recursive: true });

/** A small repository with a committed file, a modified file and a markdown page. */
function makeRepo(path, name) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(join(path, 'src'), { recursive: true });
  const git = (...a) => {
    const r = spawnSync('git', a, { cwd: path, encoding: 'utf8', env: { ...process.env, HOME: home } });
    if (r.status !== 0) throw new Error(`git ${a.join(' ')} in ${path}: ${r.stderr}`);
  };
  git('init', '-q');
  git('config', 'user.email', 'p167@example.invalid');
  git('config', 'user.name', 'p167');
  writeFileSync(join(path, 'README.md'), `# ${name}\n\nOne line.\n`);
  writeFileSync(join(path, 'notes.md'), `# Notes for ${name}\n\n- one\n- two\n\nA paragraph of text.\n`);
  const lines = [];
  for (let i = 0; i < 200; i += 1) lines.push(`export const v${String(i)} = ${String(i)};`);
  writeFileSync(join(path, 'src', 'app.js'), `${lines.join('\n')}\n`);
  git('add', '.');
  git('commit', '-q', '-m', 'first');
  // A modified tracked file, so the diff has rows to draw.
  writeFileSync(join(path, 'README.md'), `# ${name}\n\nOne line.\nA second line the diff shows.\n`);
}
makeRepo(repoA, 'p167-a');
makeRepo(repoB, 'p167-b');

/**
 * PHASE 243. How many baseline records the store holds, read off the scratch
 * profile's own directory.
 *
 * `<userData>/gmux/baselines` is `<profile>/gmux/baselines` here, because the
 * launch passes `--user-data-dir`. Nothing outside this run's own profile is
 * opened, and a directory that is not there yet is zero rather than a throw.
 */
function countBaselineRecords() {
  try {
    return readdirSync(join(profile, 'gmux', 'baselines')).filter((n) =>
      n.endsWith('.json')
    ).length;
  } catch {
    return 0;
  }
}

/** The operator's server is read only: one count before, one after. */
function liveGmuxSessionCount() {
  const r = spawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', '#{session_id}'], { encoding: 'utf8' });
  if (r.status !== 0) return 0;
  return r.stdout.split('\n').filter((l) => l.trim() !== '').length;
}
const liveBefore = liveGmuxSessionCount();

// ---------------------------------------------------------------------------
// PHASE 230. The machine, when one is named, and the far scratch it gets
// ---------------------------------------------------------------------------

/**
 * Everything the remote surface holds between setup and teardown. `machine`
 * is null when no machine was named, and every step below is skipped and said
 * to be skipped.
 */
const remote = {
  machine: null,
  farRoot: null,
  projectId: null,
  farSessionsBefore: null,
  farSessionsAfter: null,
  farSocketsBefore: null,
  farSocketsAfter: null,
  confirmed: null,
  teardown: null,
  skipped: remoteArmed ? null : (wantSurface('remote') ? 'GMUX_REAL_MACHINE_HOST is unset, so no machine was named' : 'not in P167_SURFACES')
};

/** The far scratch directory, by its exact shape, and nothing else. */
function assertFarScratch(path) {
  if (typeof path !== 'string' || !/^\/[^\s]+\/tortie-p167-scratch-\d+$/.test(path)) {
    throw new Error(`refusing to touch ${String(path)}`);
  }
}

/** One shell script on the machine, carried as base64 so no quoting can bend it. */
function farScript(machine, script, timeoutMs = 120_000) {
  const b64 = Buffer.from(script, 'utf8').toString('base64');
  return runOnMachine(machine, `printf %s ${b64} | base64 -d | /bin/sh`, { timeoutMs });
}

/**
 * A small repository under that person's home, made by this run and removed
 * by it: one commit, one modified file and one untracked file, so every one
 * of the four views has rows to draw. The identity is set INSIDE the
 * repository, so ~/.gitconfig over there is never written.
 */
function setupFarScratch(machine) {
  const name = `tortie-p167-scratch-${String(process.pid)}`;
  const out = farScript(
    machine,
    [
      'set -e',
      'cd "$HOME"',
      `test ! -e ${name}`,
      `mkdir -p ${name}/src`,
      `cd ${name}`,
      'git init -q -b main',
      "git config --local user.email 'p167@example.invalid'",
      "git config --local user.name 'Tortie P167'",
      'git config --local commit.gpgsign false',
      "printf '# p167 scratch\n\nOne line.\n' > README.md",
      "printf 'export const one = 1;\n' > src/app.ts",
      'git add -A',
      "git commit -q -m 'p167 base'",
      "printf '# p167 scratch\n\nOne line.\nA second line.\n' > README.md",
      "printf 'scratch, untracked\n' > NOTES-untracked.md",
      'pwd'
    ].join('\n')
  );
  if (out.code !== 0) throw new Error(`the far scratch could not be made: ${out.both.trim()}`);
  const path = out.stdout.trim().split('\n').pop() ?? '';
  assertFarScratch(path);
  return path;
}

function teardownFarScratch(machine, path) {
  assertFarScratch(path);
  return farScript(machine, `rm -rf ${path}\ntest -e ${path} && echo STILL-THERE || echo GONE\n`, 60_000).both.trim();
}

/** The far `-L gmux` server is only ever listed. */
function farCounts(machine) {
  return {
    sessions: listFarSessions(machine, 'gmux').names,
    sockets: runOnMachine(machine, "ls /private/tmp/tmux-$(id -u) 2>/dev/null | tr '\\n' ' '").both.trim()
  };
}

/**
 * The far server this run's scratch socket may have started, ended, AND its
 * socket file unlinked, because `tmux kill-server` does not unlink and Phase
 * 224 left ten dead sockets under that person's temporary directory.
 */
function endFarScratchServer(machine) {
  if (socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) return 'refused';
  const out = runOnMachine(
    machine,
    `${machine.remoteTmuxPath} -L ${socket} -f /dev/null kill-server 2>&1; rm -f /private/tmp/tmux-$(id -u)/${socket}; echo ended`
  );
  return out.both.trim();
}

/**
 * The machine row and its identity, written into the scratch profile the way
 * the Phase 224 probes wrote them, and NEVER into the person's own profile.
 */
function writeMachineRow(machine) {
  mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
  mkdirSync(join(profile, 'gmux', 'machines'), { recursive: true });
  writeFileSync(
    join(profile, 'gmux', 'config', 'machines.json'),
    `${JSON.stringify(
      {
        schema: 1,
        machines: [
          {
            id: REMOTE_MACHINE_ID,
            label: 'p167 machine',
            color: 'orange',
            host: machine.host,
            ...(machine.port === 22 ? {} : { port: machine.port }),
            remoteTmuxPath: machine.remoteTmuxPath
          }
        ]
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    join(profile, 'gmux', 'machines', 'known-machines'),
    keyscanText({ host: machine.host, port: machine.port, caller: 'build/probe-p167-scale.mjs' }),
    'utf8'
  );
}

/**
 * The confirm press, in the Settings window of a FIRST Electron that ends
 * before the measured one starts. It is the one gate refusal 8 keeps, and it
 * is pressed here the way a person presses it, on the row's own button.
 */
const CONFIRM_DRIVE = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const rail = Array.from(document.querySelectorAll('button, [role="tab"], li, a'))
      .find((n) => (n.textContent || '').trim() === 'Machines');
    if (rail) { rail.click(); await wait(900); }
    for (const t of Array.from(document.querySelectorAll('[data-machines-action="toggle-lines"]'))) {
      if (t.getAttribute('aria-expanded') !== 'true') { t.click(); await wait(500); }
    }
    await wait(800);
    for (const c of Array.from(document.querySelectorAll('[data-machines-action="confirm"]'))) { c.click(); await wait(1800); }
    const rows = (await window.gmux.machines.rows()).rows.map((x) => ({ id: x.id, state: x.state }));
    return JSON.stringify({ rows });
  } catch (err) { return JSON.stringify({ error: String((err && err.stack) || err) }); }
})()`;

async function confirmMachineRow() {
  let out = '';
  await withElectron(
    {
      label: 'p167-confirm',
      userDataDir: profile,
      tmuxSocket: null,
      env: withoutDevRenderer({
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        GMUX_SHOT: join(outDir, 'p167-remote-confirm.png'),
        GMUX_SHOT_DELAY_MS: '4000',
        GMUX_SHOT_SETTINGS: '1',
        GMUX_SHOT_SETTINGS_JS: CONFIRM_DRIVE
      }),
      ceilingMs: 5 * 60 * 1000
    },
    (handle) =>
      new Promise((done) => {
        const child = handle.child;
        const take = (c) => { out += String(c); };
        child.stdout?.on('data', take);
        child.stderr?.on('data', take);
        child.on('exit', () => done());
      })
  );
  const marker = '[gmux-shot] driver';
  const at = out.lastIndexOf(marker);
  if (at === -1) return { error: `no driver line; tail=${out.slice(-400)}` };
  const line = out.slice(at + marker.length).split('\n')[0] ?? '';
  try {
    let parsed = JSON.parse(line.replace(/^\s*→\s*/, '').trim());
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return parsed;
  } catch {
    return { error: `unparsed driver line: ${line.slice(0, 300)}` };
  }
}

/** The remote tab registered from inside the measured app, once it is up. */
const ADD_REMOTE_DRIVE = (farRoot) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const G = window.gmux;
  const out = {};
  try {
    out.prepare = JSON.stringify(await G.machines.prepare(${JSON.stringify(REMOTE_MACHINE_ID)})).slice(0, 200);
    const added = await G.projects.addRemote({ machineId: ${JSON.stringify(REMOTE_MACHINE_ID)}, path: ${JSON.stringify(farRoot)} });
    out.added = JSON.stringify(added).slice(0, 300);
    out.projectId = added && added.ok ? added.project.id : null;
    await wait(1500);
    return out;
  } catch (e) { out.error = String((e && e.stack) || e); return out; }
})()`;

// ---------------------------------------------------------------------------
// Rulers read from outside the app
// ---------------------------------------------------------------------------

/** The renderer pid of the app window: the largest renderer child of the app. */
function rendererPidOf(appPid) {
  const out = execFileSync('ps', ['-Ao', 'pid=,ppid=,rss=,command='], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  let best = null;
  for (const line of out.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m === null) continue;
    if (Number(m[2]) !== appPid) continue;
    if (!m[4].includes('--type=renderer')) continue;
    const rss = Number(m[3]);
    if (best === null || rss > best.rss) best = { pid: Number(m[1]), rss };
  }
  return best === null ? 0 : best.pid;
}

/** Physical footprint in MB from vmmap, or null when vmmap cannot read the pid. */
function footprintMb(pid) {
  if (pid <= 0) return null;
  const r = spawnSync('vmmap', ['--summary', String(pid)], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) return null;
  const m = /Physical footprint:\s+([\d.]+)([KMG])/.exec(r.stdout);
  if (m === null) return null;
  const n = Number(m[1]);
  return m[2] === 'G' ? n * 1024 : m[2] === 'K' ? n / 1024 : n;
}

/** Open pty descriptors in one process: masters on /dev/ptmx and slaves on /dev/ttys. */
function ptyDescriptors(pid) {
  const r = spawnSync('lsof', ['-n', '-P', '-p', String(pid)], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const lines = r.stdout.split('\n');
  return {
    ptmx: lines.filter((l) => /\/dev\/ptmx\b/.test(l)).length,
    ttys: lines.filter((l) => /\/dev\/ttys\d+/.test(l)).length
  };
}

// ---------------------------------------------------------------------------
// The devtools side
// ---------------------------------------------------------------------------

/**
 * Find the app window by asking each page whether it carries the bridge and
 * the shot drive, rather than by matching its url. The p165 discovery matched
 * a url pattern and stopped finding its target; a page that answers for
 * itself cannot drift that way.
 */
async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          // PHASE 220: the heap snapshot arrives as a stream of events, so the
          // client is told to keep them. Nothing else changes; the two default
          // events are still collected and the chunks are dropped by
          // writeHeapSnapshot as soon as they are on disk.
          cdp = await wsConnect(t.webSocketDebuggerUrl, {
            collect: [
              'Runtime.consoleAPICalled',
              'Runtime.exceptionThrown',
              'HeapProfiler.addHeapSnapshotChunk'
            ]
          });
          const answer = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof answer === 'string') return { cdp, url: answer, port };
          cdp.close();
        } catch {
          if (cdp !== null) {
            try {
              cdp.close();
            } catch {
              /* already gone */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no page answered for the app window in time');
    await sleep(200);
  }
}

// Modifier bits for Input.dispatchKeyEvent: Alt 1, Ctrl 2, Meta 4, Shift 8.
const CHORD = {
  overview: { key: 'U', code: 'KeyU', vk: 85, modifiers: 8 | 4 },
  escape: { key: 'Escape', code: 'Escape', vk: 27, modifiers: 0 },
  arch: { key: 'A', code: 'KeyA', vk: 65, modifiers: 2 | 8 },
  explorer: { key: 'E', code: 'KeyE', vk: 69, modifiers: 8 | 4 },
  closeEditorTab: { key: 'w', code: 'KeyW', vk: 87, modifiers: 4 },
  nextProject: { key: 'Tab', code: 'Tab', vk: 9, modifiers: 2 },
  // PHASE 237. Plain Backspace, which the redline answers as a deletion of
  // the current side; ⌥⌫ is Rewind and is not what this drive presses.
  backspace: { key: 'Backspace', code: 'Backspace', vk: 8, modifiers: 0 },
  // PHASE 238. ⌥↓ steps to the next change and ⌥↩ accepts the one under
  // focus. An accept moves the tab's shadow baseline and its generation and
  // recomposes the whole document; it writes NO file, which is why this drive
  // can press it repeatedly over the same open without touching the fixture.
  redlineNext: { key: 'ArrowDown', code: 'ArrowDown', vk: 40, modifiers: 1 },
  redlineAccept: { key: 'Enter', code: 'Enter', vk: 13, modifiers: 1 }
};

async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

/**
 * PHASE 237. One printable character, as a real key event.
 *
 * `Input.dispatchKeyEvent` with `text` set is what produces the char event the
 * page's `beforeinput` sees. Research 83 records that a scripted `execCommand`
 * fires NO `beforeinput` in Chromium and produced a wrong conclusion once
 * already, so nothing here ever reaches for one.
 */
async function typeChar(cdp, ch) {
  await cdp.call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    text: ch,
    unmodifiedText: ch,
    key: ch
  });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
}

/** Wait until `expression` is true on the page, or give up after `ms`. */
async function until(cdp, expression, ms) {
  const started = Date.now();
  for (;;) {
    if ((await cdpEval(cdp, expression, 10_000)) === true) return true;
    if (Date.now() - started > ms) return false;
    await sleep(50);
  }
}

async function drive(cdp, spec, timeoutMs = 60_000) {
  await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify(spec)}).then(() => true)`, timeoutMs);
}
async function cleanup(cdp) {
  await cdpEval(cdp, `window.__gmuxShotCleanup().then(() => true)`, 60_000);
}

async function readRenderer(cdp) {
  await cdp.call('HeapProfiler.collectGarbage');
  await sleep(250);
  await cdp.call('HeapProfiler.collectGarbage');
  const metrics = (await cdp.call('Performance.getMetrics')).result.metrics;
  const get = (name) => metrics.find((m) => m.name === name)?.value ?? 0;
  return {
    heapMb: get('JSHeapUsedSize') / (1024 * 1024),
    heapTotalMb: get('JSHeapTotalSize') / (1024 * 1024),
    nodes: get('Nodes'),
    listeners: get('JSEventListeners'),
    documents: get('Documents'),
    frames: get('Frames'),
    xterm: await cdpEval(cdp, `document.querySelectorAll('.xterm').length`),
    // PHASE 200 fix round. How many elements are still REACHABLE from the
    // document, walking into every shadow root. `Nodes` above counts detached
    // ones too, so a profile whose Nodes climb while this stays flat is holding
    // trees nobody can see, while one where both climb is drawing more, which
    // profile d does by design because it lists every past session. Without the
    // pair a reader cannot tell those two apart and they want opposite answers.
    // Printed, never asserted.
    live: await cdpEval(
      cdp,
      `(() => { let n = 0; const walk = (root) => { for (const el of root.querySelectorAll('*')) { n += 1; if (el.shadowRoot !== null) walk(el.shadowRoot); } }; walk(document); return n; })()`
    )
  };
}

/**
 * PHASE 220. A census of the DETACHED elements the renderer is still holding,
 * grouped by the root of each detached tree.
 *
 * ## Why the readings above could not name an owner
 *
 * `Nodes` from `Performance.getMetrics` counts detached nodes as well as drawn
 * ones, and `live` beside it counts only what is reachable from the document.
 * The split profile's failing runs at `b5cc017` grew `Nodes` by exactly 1,020 a
 * block while `live` stayed flat, so what grows is entirely detached: 24 real
 * sessions are discarded a block and something keeps 42.5 elements of each. A
 * pair of totals says that much and no more, and the brief asks for the owner.
 *
 * So this asks the page. `Runtime.queryObjects` is what the devtools console's
 * own `queryObjects()` helper uses: it collects first and then hands back every
 * live object whose prototype chain holds the one it is given. Every element
 * that answers and is not connected is counted, and the ROOT of each detached
 * tree, being an element whose parent is not itself an element, is grouped by
 * its tag and class with the size of the tree hanging off it. A name and a size
 * is what turns a slope into an owner.
 *
 * IT RUNS ON EVERY BLOCK OF EVERY PROFILE, and there is no knob to turn it off:
 * the count is one of the three numbers the verdict is made of, so a run that
 * skipped it would be a run that could not answer the question it was written
 * for. `P167_CENSUS_ROOTS` bounds how many detached roots are NAMED in the
 * report and changes nothing that is counted. It releases its object group
 * before returning, so the census can never be the thing that retains what it
 * is counting.
 */
async function detachedCensus(cdp) {
  const GROUP = 'p167-census';
  try {
    const proto = await cdp.call('Runtime.evaluate', {
      expression: 'Element.prototype',
      objectGroup: GROUP
    });
    const protoId = proto.result?.result?.objectId;
    if (protoId === undefined) return { failed: `no prototype: ${JSON.stringify(proto).slice(0, 300)}` };
    const found = await cdp.call('Runtime.queryObjects', {
      prototypeObjectId: protoId,
      objectGroup: GROUP
    });
    const arrayId = found.result?.objects?.objectId;
    if (arrayId === undefined) return { failed: `no objects: ${JSON.stringify(found).slice(0, 300)}` };
    const answer = await cdp.call(
      'Runtime.callFunctionOn',
      {
        objectId: arrayId,
        objectGroup: GROUP,
        returnByValue: true,
        functionDeclaration: `function () {
          const roots = new Map();
          let elements = 0;
          let detached = 0;
          let refused = 0;
          for (const el of this) {
            // queryObjects hands back Element.prototype itself and every other
            // object on that chain, and a DOM getter called on one of those
            // throws "Illegal invocation". Counted rather than swallowed.
            let connected = true;
            try {
              connected = el.isConnected;
            } catch {
              refused += 1;
              continue;
            }
            elements += 1;
            if (connected) continue;
            detached += 1;
            const parent = el.parentNode;
            if (parent !== null && parent.nodeType === 1) continue;
            const cls =
              typeof el.className === 'string' && el.className.trim() !== ''
                ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
                : '';
            const under = parent === null ? '' : ' under ' + parent.nodeName.toLowerCase();
            const key = el.tagName.toLowerCase() + cls + under;
            const was = roots.get(key) ?? { trees: 0, nodes: 0 };
            was.trees += 1;
            was.nodes += 1 + el.querySelectorAll('*').length;
            roots.set(key, was);
          }
          return {
            elements,
            detached,
            refused,
            roots: [...roots]
              .map(([what, v]) => ({ what, trees: v.trees, nodes: v.nodes }))
              .sort((a, b) => b.nodes - a.nodes)
              .slice(0, 14)
          };
        }`
      },
      120_000
    );
    return answer.result?.result?.value ?? { failed: `no value: ${JSON.stringify(answer).slice(0, 300)}` };
  } catch (err) {
    return { failed: String(err) };
  } finally {
    try {
      await cdp.call('Runtime.releaseObjectGroup', { objectGroup: GROUP });
    } catch {
      /* the page is gone; nothing is held either way */
    }
  }
}

/**
 * PHASE 220. Write one post-collection heap snapshot, for
 * `build/heap-retainers.mjs` to name what is holding what.
 *
 * The census above says WHICH trees are detached and how big they are. It
 * cannot say what holds them, and the brief asks for that half to come from
 * retaining paths rather than from the slope. This is the capture; the reading
 * is a separate plain node script over the file, so nothing about the analysis
 * runs inside the app being measured.
 *
 * The chunks are removed from the client's event list the moment they are on
 * disk, so this probe never holds a second copy of the renderer's heap while
 * the next block runs. Off by default (`P167_SNAPSHOT=1`), because a snapshot
 * of a 40 MB heap is a large file and takes seconds to stream.
 */
async function writeHeapSnapshot(cdp, path) {
  const events = cdp.events();
  const from = events.length;
  await cdp.call(
    'HeapProfiler.takeHeapSnapshot',
    { reportProgress: false, captureNumericValue: false },
    900_000
  );
  const chunks = [];
  for (let i = from; i < events.length; i += 1) {
    if (events[i].method === 'HeapProfiler.addHeapSnapshotChunk') {
      chunks.push(events[i].params?.chunk ?? '');
    }
  }
  const kept = events.slice(from).filter((e) => e.method !== 'HeapProfiler.addHeapSnapshotChunk');
  events.length = from;
  for (const one of kept) events.push(one);
  const text = chunks.join('');
  writeFileSync(path, text);
  return text.length;
}

// ---------------------------------------------------------------------------
// The cycles
// ---------------------------------------------------------------------------

/**
 * THE TRIPWIRE UNDER THE NODE COUNT (Phase 200 fix round), read while the diff
 * is on screen.
 *
 * The node ruler below is a race: it catches the retention only when the close
 * beats the transition's first frame, which is decided by how busy the machine
 * is. Measured on 2026-09-02 over one commit that retains: 1,662 nodes a block
 * on a loaded machine and 0 on a quiet one, from the same command. So the check
 * also reads the CAUSE, which is not a race and is the same on every machine.
 *
 * Under `prefers-reduced-motion: reduce`, which this whole drive emulates and
 * which a person can switch on in System Settings, an app that writes the usual
 * `transition-duration: 1ms !important` on `*` leaves `transition-property` at
 * `all`. Every element then transitions every property, the diff container's
 * colours land a moment after it is inserted because @pierre/diffs adopts its
 * theme stylesheet then, and a transition still running when the element is
 * removed is held by the document timeline along with the whole detached tree.
 *
 * So two readings, taken with the diff up:
 *
 *   property   the container's computed `transition-property`. Under reduced
 *              motion this must be `none`. `all` is the defect, whatever the
 *              node count says.
 *   running    how many CSSTransitions the document is running at that moment.
 *              Under reduced motion nothing may be transitioning at all.
 *
 * A run that drove the diff and read NEITHER fails too. A ruler that reports
 * green over a reading it never took is the thing this round is repairing.
 */
async function readMotion(cdp) {
  return await cdpEval(
    cdp,
    `(() => {
       const el = document.querySelector('diffs-container');
       if (el === null) return null;
       const running = document
         .getAnimations()
         .filter((a) => a.constructor.name === 'CSSTransition')
         .map((a) => String(a.transitionProperty));
       return { property: getComputedStyle(el).transitionProperty, running };
     })()`
  );
}

/** What the page looked like when a gesture missed, for the report. */
async function missDebug(cdp, name) {
  return await cdpEval(
    cdp,
    `({ miss: ${JSON.stringify(name)}, active: (document.activeElement?.tagName ?? '') + ' ' + (document.activeElement?.className ?? ''), shell: document.querySelector('.shell')?.className ?? null, xterm: document.querySelectorAll('.xterm').length })`
  );
}

/**
 * Wait until the app holds no live session rows and no mounted terminal.
 * Rows that linger after the cleanup hook are killed and discarded from
 * here, by id from the real list, so a reused harness name can never target
 * an old row. Returns null when settled, or what remained when it never did.
 */
async function settleSessions(cdp, ms) {
  const started = Date.now();
  let swept = false;
  for (;;) {
    const state = await cdpEval(
      cdp,
      `window.gmux.sessions.list().then((rows) => ({ rows: rows.map((r) => ({ id: r.id, name: r.name, status: r.status })), xterm: document.querySelectorAll('.xterm').length }))`,
      15_000
    );
    const live = state.rows.filter((r) => r.status !== 'exited' && r.status !== 'restorable');
    if (state.rows.length === 0 && state.xterm === 0) return null;
    if (Date.now() - started > ms) return state;
    if (Date.now() - started > ms / 2 && !swept) {
      // The cleanup hook missed some. Sweep by id, once.
      swept = true;
      for (const r of state.rows) {
        await cdpEval(cdp, `window.gmux.sessions.kill(${JSON.stringify(r.id)}).catch(() => 0).then(() => window.gmux.sessions.discard(${JSON.stringify(r.id)}).catch(() => 0)).then(() => true)`, 20_000);
      }
    }
    void live;
    await sleep(500);
  }
}

/** One profile b cycle: step through both project tabs. */
async function cycleSwitch(cdp, log) {
  const active = () => cdpEval(cdp, `(document.querySelector('[role="tab"][aria-selected="true"]') ?? document.querySelector('.project-chip'))?.textContent ?? null`);
  const start = await active();
  await press(cdp, CHORD.nextProject);
  await sleep(350);
  const mid = await active();
  await press(cdp, CHORD.nextProject);
  await sleep(350);
  const end = await active();
  if (start !== null && mid === start) log.switchMisses += 1;
  if (end !== start) log.switchMisses += 1;
}

/** One profile c cycle: six surfaces opened and closed by real gestures. */
async function cycleSurfaces(cdp, log) {
  const closeOrCount = async (name, goneExpr) => {
    if (!(await until(cdp, goneExpr, 8000))) {
      log.closeMisses.push(name);
    }
  };
  // PHASE 200: each surface is skippable, so one run can be one surface. The
  // default drives all six, which is the combined profile the audit measured
  // plus the redline Phase 225 added.

  // Catch Me Up, and Escape.
  if (wantSurface('overview')) {
    await press(cdp, CHORD.overview);
    if (!(await until(cdp, `document.querySelector('.overview-layer') !== null`, 8000))) {
      log.openMisses.push('overview');
      log.debug.push(await missDebug(cdp, 'overview'));
    }
    await sleep(150);
    await press(cdp, CHORD.escape);
    await closeOrCount('overview', `document.querySelector('.overview-layer') === null`);
  }

  // Architecture, then the Explorer chord puts it away.
  if (wantSurface('arch')) {
    await press(cdp, CHORD.arch);
    if (!(await until(cdp, `document.querySelector('[data-view="arch"]') !== null`, 8000))) log.openMisses.push('arch');
    await sleep(150);
    await press(cdp, CHORD.explorer);
    await closeOrCount('arch', `document.querySelector('[data-view="arch"]') === null`);
  }

  // A file in Monaco.
  if (wantSurface('file')) {
    await drive(cdp, { projectPath: repoA, openRel: 'src/app.js', mode: 'file' });
    if (!(await until(cdp, `document.querySelector('.monaco-editor') !== null`, 15000))) log.openMisses.push('file');
    await press(cdp, CHORD.closeEditorTab);
    await closeOrCount('file', `document.querySelector('.monaco-editor') === null`);
  }

  // A diff.
  if (wantSurface('diff')) {
    await drive(cdp, { projectPath: repoA, openRel: 'README.md', mode: 'diff' });
    if (!(await until(cdp, `document.querySelector('diffs-container') !== null`, 15000))) log.openMisses.push('diff');
    log.motion.push(await readMotion(cdp));
    await press(cdp, CHORD.closeEditorTab);
    await closeOrCount('diff', `document.querySelector('diffs-container') === null`);
  }

  // PHASE 225. The redline: the same file as the diff, read as one document
  // with its changes marked in place, drawn against the tab's shadow
  // baseline. Research 83 F.7 measured that this word appeared zero times
  // here, so Phase 194 shipped a surface this probe never opened; the phase
  // that makes it recompose against a baseline of its own adds it.
  //
  // PHASE 227 REWRITES THE FILE UNDER IT, which its charter names and Phase
  // 225 left to it: with the redline open, README.md is rewritten from
  // outside `P167_REWRITES` times a cycle (default 4), each write a different
  // word so every one recomposes the document through the watcher, and the
  // last one is waited for on the face before the tab closes. The writes are
  // this process's own `writeFileSync`, so nothing is spawned and nothing
  // needs ending. The file is put back to its standing modified text after,
  // so the diff surface keeps its rows.
  if (wantSurface('redline')) {
    await drive(cdp, { projectPath: repoA, openRel: 'README.md', mode: 'diff', editorMode: 'redline' });
    if (!(await until(cdp, `document.querySelector('.ed-redline-doc') !== null`, 15000))) log.openMisses.push('redline');
    const readme = join(repoA, 'README.md');
    const standing = readFileSync(readme, 'utf8');
    for (let w = 0; w < REWRITES; w += 1) {
      const word = `rewrite${String(log.rewrites)}`;
      log.rewrites += 1;
      writeFileSync(readme, `# p167-a\n\nOne line.\nA second line the diff shows, ${word}.\n`);
      const drawn = await until(cdp, `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.textContent.includes(${JSON.stringify(word)}); })()`, 8000);
      if (!drawn) log.rewriteMisses.push(word);
    }
    // PHASE 237. THE SURFACE TYPES UNDER ITSELF AS WELL AS BEING REWRITTEN
    // UNDER. A keystroke in the redline is a recompose and a rebuild of the
    // whole run list with the caret put back, which is a DOM churn per
    // character; a listener or a node kept per keystroke is exactly the shape
    // this probe's plateau rule exists to catch, and the outside rewrites
    // above cannot see it because they never open a caret.
    //
    // The word is typed and then taken back with the same number of plain
    // Backspaces, so the buffer ends equal to what is on disk and the tab is
    // clean again: a dirty tab would refuse the re-read the next cycle needs,
    // and ⌘W over one is a different journey from the one this probe measures.
    for (let t = 0; t < TYPES; t += 1) {
      const word = `typed${String(log.typed)}`;
      log.typed += 1;
      await cdpEval(
        cdp,
        `(() => {
          const doc = document.querySelector('.ed-redline-doc');
          if (doc === null) return false;
          doc.focus();
          const range = document.createRange();
          range.selectNodeContents(doc);
          range.collapse(true);
          const sel = getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          return true;
        })()`,
        10_000
      );
      for (const ch of word) await typeChar(cdp, ch);
      const drawn = await until(
        cdp,
        `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.textContent.includes(${JSON.stringify(word)}); })()`,
        8000
      );
      if (!drawn) log.typeMisses.push(word);
      for (let b = 0; b < word.length; b += 1) await press(cdp, CHORD.backspace);
      const clean = await until(
        cdp,
        `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && !d.textContent.includes(${JSON.stringify(word)}); })()`,
        8000
      );
      if (!clean) log.typeMisses.push(`${word} (not taken back)`);
    }
    // PHASE 238. THE SURFACE ACCEPTS UNDER ITSELF as well as being rewritten
    // under and typed in. An accept moves the tab's SHADOW BASELINE and its
    // generation, which recomposes the whole document and redraws every change
    // wrapper with a new `data-change-gen` — a full rebuild of the run list per
    // press, exactly the churn this probe's plateau rule exists to catch, and
    // one neither of the loops above can produce: the rewrites move the RIGHT
    // side and the typing moves the buffer, while this moves the LEFT one.
    //
    // Each iteration makes its own change from outside and then accepts it, so
    // no iteration is a no-op against a document that has already been
    // narrowed to nothing, and each one also drives the property that matters
    // beyond the churn: an edit arriving AFTER an accept is drawn against the
    // ACCEPTED baseline and not the old one, which is what the change count
    // returning to exactly one says.
    //
    // IT WRITES NO FILE ITSELF (research 83 B.5). The `writeFileSync` here is
    // this process making the change to accept, the same way the rewrite loop
    // above makes its own, and the file is put back to its standing text below.
    for (let a = 0; a < ACCEPTS; a += 1) {
      const word = `accepted${String(log.accepts)}`;
      log.accepts += 1;
      writeFileSync(readme, `# p167-a\n\nOne line.\nA second line the diff shows, ${word}.\n`);
      const drawn = await until(
        cdp,
        `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.textContent.includes(${JSON.stringify(word)}); })()`,
        8000
      );
      if (!drawn) {
        log.acceptMisses.push(`${word} (never drawn)`);
        continue;
      }
      const before = await cdpEval(
        cdp,
        `document.querySelectorAll('.ed-redline-change').length`,
        10_000
      );
      if (typeof before !== 'number' || before < 1) {
        log.acceptMisses.push(`${word} (nothing to accept, count ${String(before)})`);
        continue;
      }
      // ⌥↓ from nowhere focuses the FIRST change; ⌥↩ accepts it.
      await press(cdp, CHORD.redlineNext);
      await press(cdp, CHORD.redlineAccept);
      const dropped = await until(
        cdp,
        `document.querySelectorAll('.ed-redline-change').length === ${String(before - 1)}`,
        8000
      );
      if (!dropped) log.acceptMisses.push(`${word} (count stayed at ${String(before)})`);
      // And the accepted words are still on the face, now as plain text: an
      // accept narrows the marking and never removes the person's bytes.
      const kept = await cdpEval(
        cdp,
        `(() => { const d = document.querySelector('.ed-redline-doc'); return d !== null && d.textContent.includes(${JSON.stringify(word)}); })()`,
        10_000
      );
      if (kept !== true) log.acceptMisses.push(`${word} (gone from the face after the accept)`);
    }
    // PHASE 243. THE SURFACE WRITES A BASELINE as well as being rewritten
    // under, typed in and accepted in. Every accept above now moves a baseline
    // that is RECORDED, into `<userData>/gmux/baselines/`, so the redline's
    // churn per cycle carries a durable write in main with it: a file
    // descriptor kept per record would show up in the descriptor reading this
    // probe already asserts, and a record per cycle that never lands would
    // mean the accepts above are proving less than they say. The count is read
    // off the store's own directory rather than off the face, because a
    // receipt is not something a person sees.
    log.baselines = countBaselineRecords();
    writeFileSync(readme, standing);
    await press(cdp, CHORD.closeEditorTab);
    await closeOrCount('redline', `document.querySelector('.ed-redline-doc') === null`);
  }

  // A rendered markdown page.
  if (wantSurface('preview')) {
    await drive(cdp, { projectPath: repoA, openRel: 'notes.md', mode: 'file' });
    if (!(await until(cdp, `document.querySelector('.md-content') !== null`, 15000))) log.openMisses.push('preview');
    await press(cdp, CHORD.closeEditorTab);
    await closeOrCount('preview', `document.querySelector('.md-content') === null`);
  }

  // PHASE 230. The four sidebar views on the remote tab, each opened by its
  // own rail button, given one window focus while it is up, and closed by the
  // next view taking its place; then the local tab again, which unmounts the
  // last of them. Every view here reads through the one re-read hook, and
  // the listener count over the blocks is what says whether a mount's
  // listeners are released by its unmount.
  if (wantSurface('remote') && remote.projectId !== null) {
    const selectTab = (id) =>
      `(() => { const b = document.querySelector('[data-project-id="${id}"] button.ptab'); if (b === null) return false; b.click(); return true; })()`;
    // THE RAIL TOGGLES. A rail item whose view is already up and visible
    // collapses the sidebar when pressed, which is the designed ⌘B toggle in
    // app/ActivityBar.tsx, and a NEW tab's view is Source control by default
    // (state/sidebar-views.ts, SIDEBAR_VIEW_DEFAULT). So the first press of
    // Source control on the remote tab in block 1 took the whole sidebar
    // away and the open never landed: the fix round's instrumented run read
    // `.sidebar-view` null and no rail item pressed after 8,006 ms, then
    // Search landing in 56 ms on the next press. An item that is already
    // pressed is left alone, so the open condition below reads the view that
    // is up rather than the sidebar the press would have hidden.
    const rail = (label) =>
      `(() => { const b = Array.from(document.querySelectorAll('button.ab-item')).find((x) => (x.getAttribute('title') || '').startsWith('${label} (')); if (b === undefined) return false; if (b.getAttribute('aria-pressed') === 'true') return true; b.click(); return true; })()`;
    const focused = `(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); return true; })()`;
    if (!(await cdpEval(cdp, selectTab(remote.projectId)))) log.openMisses.push('remote tab');
    const views = [
      ['Source control', `document.querySelector('[data-view="scm"] .scm-sections.remote') !== null`],
      ['Search', `document.querySelector('[data-view="search"] [data-slot="search-body"]') !== null`],
      ['Context', `document.querySelector('[data-view="context"]') !== null`],
      ['Explorer', `document.querySelector('[data-view="scm"], [data-view="search"], [data-view="context"]') === null && document.querySelector('[data-slot="tree"]') !== null`]
    ];
    for (const [label, upExpr] of views) {
      if (!(await cdpEval(cdp, rail(label)))) { log.openMisses.push(`remote ${label}`); continue; }
      if (!(await until(cdp, upExpr, 8000))) {
        log.openMisses.push(`remote ${label}`);
        // What was up instead: the view the sidebar holds, or null when the
        // sidebar itself is hidden, and which rail item is pressed.
        log.debug.push(await cdpEval(cdp, `({ miss: ${JSON.stringify(`remote ${label}`)}, view: document.querySelector('.sidebar-view')?.dataset.view ?? null, pressed: Array.from(document.querySelectorAll('button.ab-item[aria-pressed="true"]')).map((b) => b.getAttribute('title')) })`));
      }
      await sleep(120);
      await cdpEval(cdp, focused);
      await sleep(250);
    }
    await drive(cdp, { projectPath: repoA });
    await closeOrCount('remote', `document.querySelector('.scm-sections.remote') === null && document.querySelector('[data-view="scm"], [data-view="search"], [data-view="context"]') === null`);
  }
}

/** One profile d cycle: four real sessions in a grid, then all four killed. */
async function cycleSplit(cdp, log) {
  await drive(cdp, { projectPath: repoA, session: { agent: 'shell', name: 'p167-base' }, splitGrid: true }, 120_000);
  if (!(await until(cdp, `document.querySelectorAll('.xterm').length >= 4`, 30000))) {
    log.openMisses.push('grid');
    log.debug.push(await missDebug(cdp, 'grid'));
  }
  await cleanup(cdp);
  const remains = await settleSessions(cdp, 45_000);
  if (remains !== null) {
    log.closeMisses.push('grid');
    log.debug.push({ miss: 'grid-close', remains });
  }
  await sleep(400);
}

/** One line of the census and the history count, for the run's own output. */
function censusLine(row) {
  if (row.censusFailed !== null && row.censusFailed !== undefined) {
    return `could not be read: ${String(row.censusFailed)}`;
  }
  if (typeof row.detached !== 'number') return 'not read';
  const top = (row.censusRoots ?? [])
    .slice(0, censusRoots)
    .map((r) => `${r.what} x${String(r.trees)} (${String(r.nodes)} nodes)`)
    .join(', ');
  return (
    `${String(row.detached)} detached element(s), ` +
    `${row.past === null ? 'no' : String(row.past)} in Past Sessions` +
    (top === '' ? '' : `; ${top}`)
  );
}

/**
 * PHASE 220. How many discarded sessions the app has in Past Sessions.
 *
 * It is the WORKLOAD FLOOR, and it is read from the app rather than inferred
 * from a node count. See judge(): a block that discarded nothing retains
 * nothing, and a plateau over it is not evidence. It is also the reading that
 * proves this phase kept the brief's promise not to delete history to obtain a
 * plateau: the count must keep climbing while the detached count does not.
 */
async function pastSessionCount(cdp) {
  try {
    return await cdpEval(
      cdp,
      `(async () => {
         const s = window.gmux?.sessions;
         if (typeof s?.listRemoved !== 'function') return null;
         try { return (await s.listRemoved()).length; } catch { return null; }
       })()`,
      30_000
    );
  } catch {
    return null;
  }
}

const CYCLES = { b: cycleSwitch, c: cycleSurfaces, d: cycleSplit };
const NAMES = { b: 'b, project switches', c: 'c, surface open and close', d: 'd, split, close and reattach' };

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const report = { startedAt: new Date().toISOString(), blocks: blocksWanted, cycles: cyclesWanted, budgets, cpuThrottle, profiles: {} };
const failures = [];
let mainPidSeen = 0;

rmSync(join(profile, 'DevToolsActivePort'), { force: true });
// PHASE 200. The Architecture switch ships OFF and this profile is a fresh
// directory, so every Architecture gesture landed on a view that was not
// there. The audit read all 18 opens missing and had to work out that it was
// stale harness setup rather than a broken surface.
seedArchSwitchOn(profile);
say('p167: seeded the Architecture switch on in the scratch profile');

// PHASE 230. The machine, when one is named: the row and its identity into
// the scratch profile, the far scratch repository, and the confirm press in a
// first Electron that ends before the measured one starts.
if (remoteArmed) {
  remote.machine = await gate('p167');
  assertReachable(remote.machine);
  const before = farCounts(remote.machine);
  remote.farSessionsBefore = before.sessions;
  remote.farSocketsBefore = before.sockets;
  say(`p167: the machine ${remote.machine.host} answers; its -L gmux server holds ${String(before.sessions.length)} session(s) [${before.sessions.join(', ')}], sockets: ${before.sockets || 'none'}`);
  remote.farRoot = setupFarScratch(remote.machine);
  say(`p167: far scratch repository at ${remote.farRoot}`);
  writeMachineRow(remote.machine);
  remote.confirmed = await confirmMachineRow();
  const row = Array.isArray(remote.confirmed?.rows) ? remote.confirmed.rows.find((r) => r.id === REMOTE_MACHINE_ID) : undefined;
  if (row === undefined || row.state !== 'confirmed') {
    failures.push(`remote: the machine row did not confirm (${JSON.stringify(remote.confirmed).slice(0, 300)}), so the remote surface was not driven`);
    remote.skipped = 'the row did not confirm';
  } else {
    say(`p167: the machine row confirmed in the Settings window`);
  }
} else {
  say(`p167: the remote surface is NOT driven (${remote.skipped}); the remote views' listeners were not measured`);
}

// PHASE 200: say what this shell brought and what was taken out, so a run in
// the operator's dev terminal and a run in a clean one are visibly the same.
{
  const inherited = inheritedDevRendererVars();
  say(
    inherited.length === 0
      ? 'p167: no development renderer variable in this shell; the built renderer is what is measured'
      : `p167: stripped ${inherited.join(', ')} from the app's environment; the built renderer is what is measured`
  );
}

try {
await withElectron(
  {
    label: 'p167',
    userDataDir: profile,
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    // PHASE 200: the development renderer variables are stripped HERE, so
    // this command measures the built renderer whatever shell it is typed in.
    env: withoutDevRenderer({
      HOME: home,
      GMUX_TMUX_SOCKET: socket,
      GMUX_PROBES: '1'
    }),
    ceilingMs: 60 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(60_000);
    say(`p167: app window at ${url}`);
    await cdp.call('Runtime.enable');
    await cdp.call('Performance.enable');
    await cdp.call('HeapProfiler.enable');
    // The surface flights ride a 200 ms fade whose final frame waits on
    // requestAnimationFrame, and Chromium throttles that callback when the
    // window is occluded, which latches the flight and drops later chords.
    // The app's reduced motion path commits synchronously, so the check
    // drives that path and never depends on whether the window is covered.
    await cdp.call('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    const mainPid = handle.appPid();
    mainPidSeen = mainPid;
    // Both projects open as tabs before any cycle, and the boot settled.
    await drive(cdp, { projectPath: repoA });
    await drive(cdp, { projectPath: repoB });
    // PHASE 230. The remote tab, registered from inside the app once the
    // machine has signed in, and left for the surface cycle to select.
    if (remoteArmed && remote.skipped === null) {
      const added = await cdpEval(cdp, ADD_REMOTE_DRIVE(remote.farRoot), 120_000);
      remote.projectId = typeof added?.projectId === 'string' ? added.projectId : null;
      if (remote.projectId === null) {
        failures.push(`remote: the far scratch folder could not be opened as a tab (${JSON.stringify(added).slice(0, 300)}), so the remote surface was not driven`);
        remote.skipped = 'the remote tab could not be added';
      } else {
        say(`p167: remote tab ${remote.projectId} on ${remote.farRoot}`);
      }
    }
    await drive(cdp, { projectPath: repoA });
    await sleep(2000);
    const rendererPid = rendererPidOf(mainPid);
    say(`p167: main pid ${String(mainPid)}, renderer pid ${String(rendererPid)}, ${String(blocksWanted)} blocks of ${String(cyclesWanted)} cycles, profiles ${profilesWanted.join(',')}`);

    const readAll = async (withDescriptors) => {
      const r = await readRenderer(cdp);
      const row = {
        ...r,
        mainFootprintMb: footprintMb(mainPid),
        rendererFootprintMb: footprintMb(rendererPid)
      };
      if (withDescriptors) Object.assign(row, ptyDescriptors(mainPid));
      // PHASE 220. Both readings are taken AFTER readRenderer's two forced
      // collections, so a detached tree that is counted here survived them.
      const c = await detachedCensus(cdp);
      row.censusRoots = c === null || c === undefined || c.failed !== undefined ? null : c.roots;
      row.detached = typeof c?.detached === 'number' ? c.detached : null;
      row.censusFailed = c?.failed ?? null;
      row.past = await pastSessionCount(cdp);
      return row;
    };
    const fmt = (row) =>
      `heap ${row.heapMb.toFixed(1)} MB, nodes ${String(row.nodes)} (${String(row.live)} on screen), listeners ${String(row.listeners)}, documents ${String(row.documents)}, xterm ${String(row.xterm)}` +
      (typeof row.ptmx === 'number' ? `, ptmx ${String(row.ptmx)}, ttys ${String(row.ttys)}` : '') +
      `, main ${row.mainFootprintMb === null ? '-' : row.mainFootprintMb.toFixed(1)} MB, renderer ${row.rendererFootprintMb === null ? '-' : row.rendererFootprintMb.toFixed(1)} MB`;

    for (const key of profilesWanted) {
      const cycle = CYCLES[key];
      if (cycle === undefined) {
        failures.push(`unknown profile "${key}"`);
        continue;
      }
      const descriptors = key === 'd';
      // PHASE 200 fix round. The surface profile, and only it, drives at a
      // quarter speed so the removal-versus-first-frame race the header
      // describes falls the same way every run.
      const throttled = cpuProfiles.includes(key) && cpuThrottle > 1;
      if (throttled) {
        const answer = await cdp.call('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
        if (answer.error !== undefined) {
          failures.push(`${key}: the CPU throttle could not be applied (${JSON.stringify(answer.error)}), so this profile measured the fast path only`);
          continue;
        }
      }
      const log = { openMisses: [], closeMisses: [], switchMisses: 0, debug: [], motion: [], rewrites: 0, rewriteMisses: [], typed: 0, typeMisses: [], accepts: 0, acceptMisses: [], baselines: 0 };
      const exceptionsBefore = cdp.events().filter((e) => e.method === 'Runtime.exceptionThrown').length;
      const before = await readAll(descriptors);
      say(`\n${NAMES[key]}`);
      say(
        throttled
          ? `  driving at 1/${String(cpuThrottle)} CPU speed, which widens the window the retention race falls in; the motion reading below is the half that does not depend on how busy this machine is`
          : key === 'c'
            ? '  NOT throttled (P167_CPU=1): this profile can report a plateau on a tree that retains'
            : '  full speed'
      );
      say(`  before      ${fmt(before)}`);
      say(`  census      ${censusLine(before)}`);
      const blocks = [];
      for (let b = 1; b <= blocksWanted; b += 1) {
        const started = Date.now();
        for (let c = 0; c < cyclesWanted; c += 1) await cycle(cdp, log);
        await sleep(1500);
        const row = await readAll(descriptors);
        row.ms = Date.now() - started;
        blocks.push(row);
        say(`  block ${String(b)}     ${fmt(row)}  (${String(row.ms)} ms)`);
        say(`  census      ${censusLine(row)}`);
        if (snapshots) {
          const path = join(outDir, `heap-${key}-block${String(b)}.heapsnapshot`);
          const bytes = await writeHeapSnapshot(cdp, path);
          say(`  snapshot    ${path} (${(bytes / (1024 * 1024)).toFixed(1)} MB)`);
        }
      }
      if (descriptors && blocks.length > 0) {
        const last = blocks[blocks.length - 1];
        if (last.ptmx !== before.ptmx || last.ttys !== before.ttys) {
          await sleep(10_000);
          Object.assign(last, ptyDescriptors(mainPid));
          say(`  re-read     ptmx ${String(last.ptmx)}, ttys ${String(last.ttys)} after a 10 s settle`);
        }
      }
      const thrown = cdp.events().filter((e) => e.method === 'Runtime.exceptionThrown').slice(exceptionsBefore);
      const exceptions = thrown.map((e) => e.params?.exceptionDetails?.exception?.description ?? e.params?.exceptionDetails?.text ?? 'unknown');
      // PHASE 220. Profile d keeps its node and listener rules off, because the
      // header's reason for turning them off is about what the app may DRAW.
      // It gains the two rules that are not about drawing: the detached census
      // and the workload floor. Each cycle discards four real sessions, and the
      // floor is set a little under that so one session the app records late is
      // not read as a workload that did not land.
      const rules =
        key === 'd'
          ? {
              nodes: false,
              listeners: false,
              historyFloor: Math.max(1, Math.floor(cyclesWanted * 4 * 0.75))
            }
          : {};
      const verdicts = judge(key, before, blocks, budgets, rules);
      if (log.openMisses.length > 0) verdicts.push(`${key}: ${String(log.openMisses.length)} surface open(s) did not land: ${[...new Set(log.openMisses)].join(', ')}`);
      if (log.closeMisses.length > 0) verdicts.push(`${key}: ${String(log.closeMisses.length)} surface close(s) did not land: ${[...new Set(log.closeMisses)].join(', ')}`);
      // PHASE 227. The redline was rewritten under, and every rewrite must
      // have reached the face, or the profile drove a surface that was not
      // recomposing and can say nothing about it.
      if (key === 'c' && wantSurface('redline')) {
        if (log.rewrites === 0 && REWRITES > 0) verdicts.push(`${key}: the redline was opened and never rewritten under, so this run cannot say it plateaus under rewrites`);
        if (log.rewriteMisses.length > 0) verdicts.push(`${key}: ${String(log.rewriteMisses.length)} of ${String(log.rewrites)} outside rewrites never reached the redline's face: ${log.rewriteMisses.slice(0, 5).join(', ')}`);
        else if (log.rewrites > 0) say(`${key}: the redline recomposed under ${String(log.rewrites)} outside rewrites, every one drawn on the face`);
        // PHASE 237. And it was TYPED IN, which is the other half of the same
        // question: a keystroke recomposes and rebuilds the whole run list
        // with the caret put back, so a node or a listener kept per character
        // is the shape this probe exists to catch.
        if (log.typed === 0 && TYPES > 0) verdicts.push(`${key}: the redline was opened and never typed in, so this run cannot say it plateaus under typing`);
        if (log.typeMisses.length > 0) verdicts.push(`${key}: ${String(log.typeMisses.length)} of ${String(log.typed)} typed words never reached the redline's face or were not taken back: ${log.typeMisses.slice(0, 5).join(', ')}`);
        else if (log.typed > 0) say(`${key}: the redline was typed in ${String(log.typed)} times, every word drawn and taken back`);
        // PHASE 238. The accepts, judged the same way: a block that never
        // accepted cannot say the surface plateaus under an accept.
        if (log.accepts === 0 && ACCEPTS > 0) verdicts.push(`${key}: the redline was opened and never accepted in, so this run cannot say it plateaus under accepts`);
        // PHASE 243. A cycle that accepted and recorded nothing is a cycle
        // whose durable half never ran, so the plateau it printed says nothing
        // about it.
        if (log.accepts > 0 && log.baselines === 0) verdicts.push(`${key}: the redline accepted ${String(log.accepts)} times and the baseline store holds no record, so this run cannot say the durable baseline plateaus`);
        else if (log.baselines > 0) say(`${key}: the baseline store holds ${String(log.baselines)} record(s), one per file, after ${String(log.accepts)} accepts written through main while the surface churned`);
        if (log.acceptMisses.length > 0) verdicts.push(`${key}: ${String(log.acceptMisses.length)} of ${String(log.accepts)} accepts never dropped a change from the redline's face: ${log.acceptMisses.slice(0, 5).join(', ')}`);
        else if (log.accepts > 0) say(`${key}: the redline accepted ${String(log.accepts)} changes, every one gone from the face and no byte written`);
      }
      // PHASE 200 fix round. The tripwire readMotion took, judged here.
      if (key === 'c' && wantSurface('diff')) {
        const read = log.motion.filter((m) => m !== null && m !== undefined);
        if (read.length === 0) {
          verdicts.push(`${key}: the diff was driven ${String(log.motion.length)} time(s) and its motion reading came back empty every time, so this profile cannot say whether the surface can retain`);
        } else {
          const property = read.filter((m) => m.property !== 'none');
          if (property.length > 0) {
            verdicts.push(`${key}: the diff container's transition-property read "${String(property[0].property)}" under reduced motion in ${String(property.length)} of ${String(read.length)} opens; every property change on a surface that is about to close then leaves a transition holding the detached tree`);
          }
          const running = read.filter((m) => m.running.length > 0);
          if (running.length > 0) {
            verdicts.push(`${key}: ${String(running.length)} of ${String(read.length)} diff opens had a CSS transition running under reduced motion (${running[0].running.slice(0, 3).join(', ')}), which nothing may under this media query`);
          }
          say(`  motion      ${String(read.length)} diff open(s) read: transition-property ${read[0].property}, transitions running ${String(Math.max(...read.map((m) => m.running.length)))} at most`);
        }
      }
      if (log.switchMisses > 0) say(`  note: ${String(log.switchMisses)} project switch(es) read the same active tab before and after the chord`);
      if (exceptions.length > 0) verdicts.push(`${key}: ${String(exceptions.length)} page exception(s): ${exceptions.slice(0, 3).join(' | ')}`);
      for (const v of verdicts) say(`  FAIL ${v}`);
      if (verdicts.length === 0) {
        // The WORST pair, not the last one. See judge(): a run that retained
        // and then released reads a negative last pair, and saying so would
        // be reporting the number that hid the defect.
        const step = (k) => {
          let value = 0;
          for (let i = 1; i < blocks.length; i += 1) value = Math.max(value, blocks[i][k] - blocks[i - 1][k]);
          return value;
        };
        say(`  ok, the worst block to block growth was heap ${step('heapMb').toFixed(1)} MB, nodes ${String(step('nodes'))}, listeners ${String(step('listeners'))}`);
      }
      failures.push(...verdicts);
      log.debug = log.debug.slice(0, 6);
      report.profiles[key] = { before, blocks, log, exceptions, verdicts, cpuThrottle: throttled ? cpuThrottle : 1 };
      if (throttled) await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 });
    }

    // -----------------------------------------------------------------------
    // PHASE 220. The planted leak, so a green run is a run whose ruler is armed
    // -----------------------------------------------------------------------
    //
    // Every reading above is a number that came back small. A ruler that has
    // only ever been watched reporting "nothing was retained" has not been
    // watched at all, and the brief asks for a planted disposable leak that any
    // replacement measurement must reject.
    //
    // So the page is asked to hold 24 detached trees of 43 elements each, which
    // is the size and the shape the split profile's failing runs of 2026-09-07
    // held per block, being about 1,020 nodes. The census must see them, the
    // grader must go red on them, and the release must bring the count back.
    // The last of the three is not decoration: an arm that plants a leak and
    // cannot prove it let go is itself a leak.
    if (plantArm) {
      const rest = await readAll(false);
      const planted = await cdpEval(
        cdp,
        `(() => {
           const held = [];
           for (let i = 0; i < 24; i += 1) {
             const root = document.createElement('div');
             root.className = 'p167-planted-leak';
             for (let j = 0; j < 42; j += 1) root.appendChild(document.createElement('span'));
             held.push(root);
           }
           window.__p167Planted = held;
           return held.length * 43;
         })()`
      );
      const during = await readAll(false);
      const verdicts = judge('planted leak', rest, [rest, during], budgets, {
        nodes: false,
        listeners: false
      });
      await cdpEval(
        cdp,
        `(() => { delete window.__p167Planted; return true; })()`
      );
      const after = await readAll(false);
      const grew = (during.detached ?? 0) - (rest.detached ?? 0);
      const left = (after.detached ?? 0) - (rest.detached ?? 0);
      say('\nthe planted leak, which proves the ruler is armed');
      say(
        `  planted ${String(planted)} element(s) in 24 detached trees; the census saw ${String(grew)} more, the grader raised ${String(verdicts.length)} finding(s), and ${String(left)} were still held after the page let go`
      );
      if (grew < 1000) {
        failures.push(
          `the planted leak of ${String(planted)} detached elements moved the census by only ${String(grew)}, so the census is not counting what this profile is asked to catch`
        );
      }
      if (verdicts.length === 0) {
        failures.push(
          'the grader passed a planted leak of 24 detached trees. Every green verdict in this run was produced by a ruler that cannot fail.'
        );
      }
      if (left > budgets.detached) {
        failures.push(
          `the planted leak left ${String(left)} detached element(s) behind after the page released it, so this arm is itself retaining what it counted`
        );
      }
      report.plantedLeak = { planted, grew, left, verdicts };
    }

    cdp.close();
  }
);
} finally {
  // PHASE 230. Whatever happened above: the far scratch directory removed,
  // the far server on this run's scratch socket ended with its socket file
  // unlinked, the shared connection closed and every pid this run started
  // ended, then the far -L gmux server listed once more. The counts before
  // and after are printed side by side, because that server is the person's
  // and this probe only ever lists it.
  if (remote.machine !== null) {
    const teardown = {};
    try {
      if (remote.farRoot !== null) teardown.farScratch = teardownFarScratch(remote.machine, remote.farRoot);
    } catch (err) {
      teardown.farScratch = `failed: ${String(err)}`;
    }
    try {
      teardown.farScratchServer = endFarScratchServer(remote.machine);
    } catch (err) {
      teardown.farScratchServer = `failed: ${String(err)}`;
    }
    try {
      const after = farCounts(remote.machine);
      remote.farSessionsAfter = after.sessions;
      remote.farSocketsAfter = after.sockets;
    } catch (err) {
      teardown.farCounts = `failed: ${String(err)}`;
    }
    try {
      teardown.master = closeMaster(remote.machine).both.trim() || 'closed';
    } catch (err) {
      teardown.master = `failed: ${String(err)}`;
    }
    teardown.endedPids = endRecordedPids(remote.machine);
    remote.teardown = teardown;
    say(`p167: far scratch ${String(teardown.farScratch)}; scratch server ${String(teardown.farScratchServer)}`);
    say(`p167: the machine's -L gmux server held ${String(remote.farSessionsBefore?.length ?? '?')} session(s) before and ${String(remote.farSessionsAfter?.length ?? '?')} after [${(remote.farSessionsAfter ?? []).join(', ')}]; sockets before: ${remote.farSocketsBefore || 'none'}; after: ${remote.farSocketsAfter || 'none'}`);
    const before = remote.farSessionsBefore ?? [];
    const afterNames = remote.farSessionsAfter ?? [];
    if (JSON.stringify(before) !== JSON.stringify(afterNames)) {
      failures.push(`remote: the machine's -L gmux server listed [${before.join(', ')}] before and [${afterNames.join(', ')}] after; this probe must never touch it`);
    }
    if (typeof teardown.farScratch === 'string' && !teardown.farScratch.endsWith('GONE')) {
      failures.push(`remote: the far scratch directory was not removed (${String(teardown.farScratch)})`);
    }
  }
}

const liveAfter = liveGmuxSessionCount();
if (liveAfter !== liveBefore) {
  failures.push(`the operator's gmux server counted ${String(liveBefore)} sessions before and ${String(liveAfter)} after; this probe must never touch it`);
}
report.mainPid = mainPidSeen;
report.failures = failures;
report.liveGmuxSessions = { before: liveBefore, after: liveAfter };
report.remote = {
  armed: remoteArmed,
  skipped: remote.skipped,
  host: remote.machine?.host ?? null,
  farRoot: remote.farRoot,
  projectId: remote.projectId,
  confirmed: remote.confirmed,
  farSessionsBefore: remote.farSessionsBefore,
  farSessionsAfter: remote.farSessionsAfter,
  farSocketsBefore: remote.farSocketsBefore,
  farSocketsAfter: remote.farSocketsAfter,
  teardown: remote.teardown
};
writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
say(`\np167: report written to ${join(outDir, 'report.json')}`);
if (failures.length > 0) {
  say(`p167: ${String(failures.length)} failure(s)`);
  for (const f of failures) say(`  ${f}`);
  process.exit(1);
}
say('p167: every driven profile plateaued and main holds the descriptors it started with');
process.exit(0);
