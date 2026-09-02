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
 * Knobs, none prefixed GMUX_ so the contract inventory's env sweep does not
 * carry them: P167_BLOCKS (default 3), P167_CYCLES per block (default 6),
 * P167_PROFILES (default b,c,d), P167_OUT_DIR (default out/p167),
 * P167_HEAP_MB (default 8), P167_NODES (default 400), P167_LISTENERS
 * (default 200), P167_CPU, the throttle for profile c (default 4; 1 turns it
 * off and the run says so).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from './cdp-client.mjs';
import {
  inheritedDevRendererVars,
  withElectron,
  withoutDevRenderer
} from './electron-run.mjs';
import { seedArchSwitchOn } from './probe-arch-switch.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/**
 * PHASE 200. Which of profile c's five surfaces this run drives.
 *
 * The 0.98.0 audit read the combined profile retaining 1,512 DOM nodes and 126
 * listeners a block and could say nothing about WHICH surface did it, because
 * one cycle opens and closes all five. One at a time is what turns a slope into
 * a name, and it is how Phase 200 found that the whole of it is Diff.
 *
 * The default is all five, so the ordinary command is the combined profile the
 * audit measured.
 */
const SURFACES = (
  process.env['P167_SURFACES'] ?? 'overview,arch,file,diff,preview'
)
  .split(',')
  .map((one) => one.trim())
  .filter((one) => one !== '');
const wantSurface = (name) => SURFACES.includes(name);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => process.stdout.write(`${line}\n`);

// ---------------------------------------------------------------------------
// The grader. Pure, so --self-test can prove it fails when it should.
// ---------------------------------------------------------------------------

export const DEFAULT_BUDGETS = { heapMb: 8, nodes: 400, listeners: 200 };

/**
 * Judge one profile's block readings against the plateau rule.
 *
 * `blocks` is the reading after each block, oldest first, each carrying
 * `heapMb`, `nodes`, `listeners`, `documents`, and, when the profile tracks
 * descriptors, `ptmx` and `ttys`. `before` is the reading taken before the
 * first block. Returns the list of failures, empty when the profile passed.
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
  const b = (heapMb, nodes, listeners, ptmx = 0, ttys = 0) => ({ heapMb, nodes, listeners, documents: 1, ptmx, ttys });
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
    { name: 'descriptor leak under the d rules', before: b(30, 2000, 300, 1, 0), blocks: [b(30, 2000, 300, 31, 1), b(30, 2000, 300, 61, 1), b(30, 2000, 300, 91, 1)], red: true, rules: { nodes: false, listeners: false } }
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
  listeners: Number(process.env['P167_LISTENERS'] ?? String(DEFAULT_BUDGETS.listeners))
};
/**
 * The CPU throttle the surface profile drives under. See the header: it is
 * what makes the diff retention reproduce every run instead of one run in
 * three. 1 turns it off, and a run that turns it off says so in its output and
 * in its report, so a green verdict from an unthrottled run can never be read
 * as the same evidence as a green verdict from a throttled one.
 */
const cpuThrottle = Math.max(1, Number(process.env['P167_CPU'] ?? '4'));
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

/** The operator's server is read only: one count before, one after. */
function liveGmuxSessionCount() {
  const r = spawnSync('tmux', ['-L', 'gmux', 'list-sessions', '-F', '#{session_id}'], { encoding: 'utf8' });
  if (r.status !== 0) return 0;
  return r.stdout.split('\n').filter((l) => l.trim() !== '').length;
}
const liveBefore = liveGmuxSessionCount();

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
          cdp = await wsConnect(t.webSocketDebuggerUrl);
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
  nextProject: { key: 'Tab', code: 'Tab', vk: 9, modifiers: 2 }
};

async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
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

/** One profile c cycle: five surfaces opened and closed by real gestures. */
async function cycleSurfaces(cdp, log) {
  const closeOrCount = async (name, goneExpr) => {
    if (!(await until(cdp, goneExpr, 8000))) {
      log.closeMisses.push(name);
    }
  };
  // PHASE 200: each surface is skippable, so one run can be one surface. The
  // default drives all five, which is the combined profile the audit measured.

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

  // A rendered markdown page.
  if (wantSurface('preview')) {
    await drive(cdp, { projectPath: repoA, openRel: 'notes.md', mode: 'file' });
    if (!(await until(cdp, `document.querySelector('.md-content') !== null`, 15000))) log.openMisses.push('preview');
    await press(cdp, CHORD.closeEditorTab);
    await closeOrCount('preview', `document.querySelector('.md-content') === null`);
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
      const throttled = key === 'c' && cpuThrottle > 1;
      if (throttled) {
        const answer = await cdp.call('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
        if (answer.error !== undefined) {
          failures.push(`${key}: the CPU throttle could not be applied (${JSON.stringify(answer.error)}), so this profile measured the fast path only`);
          continue;
        }
      }
      const log = { openMisses: [], closeMisses: [], switchMisses: 0, debug: [], motion: [] };
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
      const blocks = [];
      for (let b = 1; b <= blocksWanted; b += 1) {
        const started = Date.now();
        for (let c = 0; c < cyclesWanted; c += 1) await cycle(cdp, log);
        await sleep(1500);
        const row = await readAll(descriptors);
        row.ms = Date.now() - started;
        blocks.push(row);
        say(`  block ${String(b)}     ${fmt(row)}  (${String(row.ms)} ms)`);
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
      const rules = key === 'd' ? { nodes: false, listeners: false } : {};
      const verdicts = judge(key, before, blocks, budgets, rules);
      if (log.openMisses.length > 0) verdicts.push(`${key}: ${String(log.openMisses.length)} surface open(s) did not land: ${[...new Set(log.openMisses)].join(', ')}`);
      if (log.closeMisses.length > 0) verdicts.push(`${key}: ${String(log.closeMisses.length)} surface close(s) did not land: ${[...new Set(log.closeMisses)].join(', ')}`);
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
    cdp.close();
  }
);

const liveAfter = liveGmuxSessionCount();
if (liveAfter !== liveBefore) {
  failures.push(`the operator's gmux server counted ${String(liveBefore)} sessions before and ${String(liveAfter)} after; this probe must never touch it`);
}
report.mainPid = mainPidSeen;
report.failures = failures;
report.liveGmuxSessions = { before: liveBefore, after: liveAfter };
writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
say(`\np167: report written to ${join(outDir, 'report.json')}`);
if (failures.length > 0) {
  say(`p167: ${String(failures.length)} failure(s)`);
  for (const f of failures) say(`  ${f}`);
  process.exit(1);
}
say('p167: every driven profile plateaued and main holds the descriptors it started with');
process.exit(0);
