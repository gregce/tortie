#!/usr/bin/env node
/**
 * probe-p159-drift.mjs. The drift trigger driven end to end over a scratch
 * repository, with no agent and then with one, and the process count read
 * both times (Phase 159).
 *
 * ## What it proves, and how
 *
 * The charter: a promise that broke gets a repair proposed by the same
 * headless pass Phase 158 built, automatically under the same gate, and the
 * process count reads ZERO with no agent configured and EXACTLY ONE with an
 * agent configured over the whole window, including the check that follows
 * the kept write. A freshness number changing must not start anything on
 * its own account.
 *
 * Each mode launches ONE Electron on a fresh profile over a scratch git
 * repository this probe builds itself, then, coordinated between this
 * process and the renderer through the harness output:
 *
 *   1. the drive opens the Architecture view live, which arms the watch;
 *   2. the renderer seeds the skeleton through the shipped `arch:seed`, and
 *      this process rewrites `edges.json` to plant two `must-not` promises
 *      that HOLD, leaving the skeleton's own notes as written, digits and
 *      all, and commits the contract;
 *   3. the renderer waits until a check reports both promises holding;
 *   4. this process BREAKS the first promise for real, one new file with one
 *      import across the boundary, and the shipped path takes it from
 *      there: the watcher's window, the check, the settle hold, the second
 *      opinion, the drift, the runner's gate, the fold's one shot spawn;
 *   5. the spawn is a STUB, so nothing is spent: it counts itself in a file,
 *      writes the prompt it was given, and answers with the contract as it
 *      sits on disk with the broken promise's rule flipped to `may`, which
 *      is a repair the validator keeps in drift scope and which makes the
 *      check that follows the write find no drift;
 *   6. this process breaks the SECOND promise inside the fold's minimum
 *      interval, and the runner must refuse `interval` and spawn nothing;
 *   7. the renderer presses the ribbon's repair, being `arch:enrich` with
 *      `scope: 'drift'`, which a person's press always sends, and the stub
 *      counts once more with an agent or the gate refuses `no-choice`
 *      without one.
 *
 * Then it reads back the stub's count, the prompts the stub saw, the app's
 * own log lines, `docs/arch/edges.json` before and after by md5, every
 * process sampled while the app was up, and the Electrons left.
 *
 * `P159_REAL=1` skips the stub for the ON mode and lets the chosen agent
 * run once for real, the named proof only. It is never a loop: the interval
 * and the same input hash stop a second spawn, and this probe reads the
 * count to prove it.
 *
 * ## Safety, absolute
 *
 *   - Refuses to run without a harness socket of its own, and refuses the
 *     names `gmux` and `default`.
 *   - The scratch repository lives under the harness directory and nowhere
 *     else; a P159_REPO under the person's home is refused.
 *   - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *     count taken before and after, which must match.
 *   - Every Electron goes through build/electron-run.mjs, which ends the
 *     whole tree it started in a `finally` block. This file signals nothing
 *     itself, and it exits explicitly after the last launch returns.
 *
 * Usage:
 *   node build/harness-socket.mjs gmux-p159-drift 'node build/probe-p159-drift.mjs'
 *   P159_MODE=on|off|both (default both), P159_REAL=1 for the one real run.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p159]';
const t0 = Date.now();
const say = (line) => {
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
};
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness: node build/harness-socket.mjs ' +
      "gmux-p159-drift 'node build/probe-p159-drift.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const modeArg = (process.env['P159_MODE'] ?? 'both').trim();
const modes = modeArg === 'both' ? ['off', 'on'] : [modeArg];
if (!modes.every((m) => m === 'off' || m === 'on')) {
  refuse(`P159_MODE must be off, on or both, not "${modeArg}"`);
}
const real = process.env['P159_REAL'] === '1';
const home = resolve(homedir());

const outDir = resolve(
  repoRoot,
  (process.env['P159_OUT_DIR'] ?? '').trim() || 'out/p159'
);
mkdirSync(outDir, { recursive: true });

const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p159-drift');
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);
if (root === home || root.startsWith(home + sep)) {
  refuse(`the scratch root "${root}" is under the person's home`);
}

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  if (out.status !== 0) return 0;
  return out.stdout.split('\n').filter((l) => l.trim() !== '').length;
}

/** Every launchable agent binary name Tortie's table knows, as a pattern. */
const AGENT_COMM =
  /(^|\/)(claude|codex|gemini|aider|amp|droid|goose|opencode|copilot|cursor-agent|kiro|qwen|crush|pi)(\s|$)/;

function psSample() {
  const out = spawnSync('ps', ['-Ao', 'pid,ppid,command'], { encoding: 'utf8' });
  const rows = [];
  for (const line of out.stdout.split('\n').slice(1)) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.push({ pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}

/** The CLAUDE.md count of what an Electron run leaves behind, keyed by pid. */
function electronsLeft() {
  const out = spawnSync(
    'sh',
    [
      '-c',
      'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct'
    ],
    { encoding: 'utf8' }
  );
  const rows = new Map();
  for (const line of out.stdout.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.set(Number(m[1]), line.trim());
  }
  return rows;
}

const md5 = (path) =>
  existsSync(path) ? createHash('md5').update(readFileSync(path)).digest('hex') : null;

function git(repo, args) {
  const out = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  if (out.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${out.stderr}`);
  }
  return out.stdout.trim();
}

// ---------------------------------------------------------------------------
// The scratch repository: six parts, six files each way, one commit
// ---------------------------------------------------------------------------

/**
 * Six directories so the skeleton groups at depth two without merging, and
 * no digit anywhere in a name, because the validator's invented number rule
 * reads every prose field of the answer against the facts it was given.
 */
const SCRATCH_FILES = {
  'package.json': '{\n  "name": "drift-scratch",\n  "private": true\n}\n',
  'src/app/main.ts':
    "import { boot } from '../core/boot';\nimport { paint } from '../ui/paint';\nexport const run = (): string => paint(boot());\n",
  'src/app/args.ts': 'export const args = (): string[] => [];\n',
  'src/core/boot.ts':
    "import { open } from '../store/open';\nexport const boot = (): string => open();\n",
  'src/core/plan.ts': "export const plan = (): string => 'plan';\n",
  'src/store/open.ts':
    "import { id } from '../util/id';\nexport const open = (): string => id();\n",
  'src/store/save.ts': 'export const save = (): boolean => true;\n',
  'src/net/fetch.ts':
    "import { id } from '../util/id';\nexport const fetchIt = (): string => id();\n",
  'src/net/retry.ts': 'export const retry = (): number => 0;\n',
  'src/ui/paint.ts':
    "import { id } from '../util/id';\nexport const paint = (x: string): string => x + id();\n",
  'src/ui/theme.ts': "export const theme = (): string => 'plain';\n",
  'src/util/id.ts': "export const id = (): string => 'id';\n",
  'src/util/text.ts': 'export const text = (x: string): string => x.trim();\n'
};

/** The two promises this probe plants, and the file that breaks each. */
const PLANTED = [
  {
    fromDir: 'src/app',
    toDir: 'src/store',
    breakFile: 'src/app/leak.ts',
    breakText: "import { save } from '../store/save';\nexport const leak = (): boolean => save();\n"
  },
  {
    fromDir: 'src/net',
    toDir: 'src/ui',
    breakFile: 'src/net/peek.ts',
    breakText: "import { theme } from '../ui/theme';\nexport const peek = (): string => theme();\n"
  }
];

function buildScratchRepo(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [rel, text] of Object.entries(SCRATCH_FILES)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text, 'utf8');
  }
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.email', 'probe@example.invalid']);
  git(dir, ['config', 'user.name', 'probe']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'one']);
  return git(dir, ['rev-parse', 'HEAD']);
}

/**
 * Plant the two must-not promises into the seeded contract, then commit the
 * contract so the freshness walk has a cut and Source Control is clean
 * before the break. The skeleton's own notes stay exactly as Phase 158
 * writes them, digits and all: the fix round of Phase 159 found that an
 * earlier version of this probe stripped them, which hid that no repair over
 * the shipped skeleton could ever be kept.
 */
function plantPromises(repo) {
  const edgesPath = join(repo, 'docs', 'arch', 'edges.json');
  const edges = JSON.parse(readFileSync(edgesPath, 'utf8'));
  const componentsDir = join(repo, 'docs', 'arch', 'components');
  const components = readdirSync(componentsDir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => JSON.parse(readFileSync(join(componentsDir, n), 'utf8')));
  const idOfDir = (dir) => {
    const found = components.find((c) => Array.isArray(c.anchors) && c.anchors.includes(dir));
    if (found === undefined) {
      throw new Error(`no drafted part anchors ${dir}; parts are ${components.map((c) => c.id).join(', ')}`);
    }
    return found.id;
  };
  const planted = PLANTED.map((p) => {
    const from = idOfDir(p.fromDir);
    const to = idOfDir(p.toDir);
    const id = `${from}-must-not-${to}`;
    if (edges.edges.some((e) => e.from === from && e.to === to)) {
      throw new Error(`the skeleton already drafted ${from} to ${to}; the break would not be new`);
    }
    edges.edges.push({
      id,
      from,
      to,
      kind: 'imports',
      rule: 'must-not',
      checker: 'imports',
      note: 'This part never reaches that one directly.',
      evidence: []
    });
    return { ...p, id, from, to };
  });
  edges.edges.sort((a, b) => (a.id < b.id ? -1 : 1));
  writeFileSync(edgesPath, `${JSON.stringify(edges, null, 2)}\n`, 'utf8');
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-q', '-m', 'two']);
  return { planted, commit: git(repo, ['rev-parse', 'HEAD']) };
}

/**
 * Break one planted promise FOR REAL: one new file with one import across
 * the boundary, committed, because the fact base is built from `git
 * ls-files` and an untracked file is invisible to every checker. The first
 * probe run proved that the hard way: the break sat untracked for ninety
 * seconds and no check ever saw it. After the commit the file is written
 * once more with one trailing comment, so the watcher sees a change to a
 * TRACKED file and the shipped path fires from there.
 */
function breakPromise(repo, promise, message) {
  writeFileSync(join(repo, promise.breakFile), promise.breakText, 'utf8');
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-q', '-m', message]);
  const commit = git(repo, ['rev-parse', 'HEAD']);
  writeFileSync(
    join(repo, promise.breakFile),
    `${promise.breakText}// crosses the boundary on purpose\n`,
    'utf8'
  );
  return commit;
}

// ---------------------------------------------------------------------------
// The stub: counts itself, keeps the prompt, answers with one rule flipped
// ---------------------------------------------------------------------------

function writeStub(dir) {
  const script = join(dir, 'arch-stub.mjs');
  const wrapper = join(dir, 'arch-stub.sh');
  writeFileSync(
    script,
    `// Harness only. Counts itself, keeps the prompt, and answers with the
// contract as it sits on disk with every promise the DRIFT block names
// flipped from must-not to may. Reads nothing else and spends nothing.
// The window it prints is the one the fold's reader knows as allowed, being
// allowed_warning under the suspend utilization; any other status word
// suspends the pass until the window resets, which the first run of this
// probe found by printing "allowed".
import { readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
const repo = process.env['P159_REPO'] ?? '';
const log = process.env['P159_STUB_LOG'] ?? '';
const at = Date.now();
const argv = process.argv.slice(2);
const p = argv.indexOf('-p');
const prompt = p === -1 ? '' : (argv[p + 1] ?? '');
const n = log === '' ? 0 : (readFileSync(log, 'utf8').split('\\n').filter((l) => l.trim() !== '').length);
if (log !== '') appendFileSync(log, String(at) + ' ' + String(prompt.length) + '\\n');
writeFileSync(join(process.env['P159_STUB_DIR'] ?? '.', 'prompt-' + String(n + 1) + '.txt'), prompt, 'utf8');
const driftStart = prompt.indexOf('\\nDRIFT');
const driftEnd = prompt.indexOf('END DRIFT');
const block = driftStart !== -1 && driftEnd !== -1 ? prompt.slice(driftStart, driftEnd) : prompt;
const named = new Set([...block.matchAll(/edge:([a-z0-9-]+)/g)].map((m) => m[1]));
const arch = join(repo, 'docs', 'arch');
const contract = JSON.parse(readFileSync(join(arch, 'contract.json'), 'utf8'));
const components = readdirSync(join(arch, 'components')).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join(arch, 'components', f), 'utf8')));
const edges = JSON.parse(readFileSync(join(arch, 'edges.json'), 'utf8')).edges;
for (const edge of edges) if (named.has(edge.id) && edge.rule === 'must-not') edge.rule = 'may';
// The answer carries the FILE shapes: edges.json is an object holding the list.
const answer = { contract, components, edges: { edges }, suggestions: [] };
process.stdout.write(JSON.stringify({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed_warning', rateLimitType: 'seven_day', utilization: 0.37, resetsAt: 1788076800 } }) + '\\n');
process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: JSON.stringify(answer), total_cost_usd: 0 }) + '\\n');
`,
    'utf8'
  );
  writeFileSync(
    wrapper,
    `#!/bin/sh\n# Harness only.\nexec "${process.execPath}" "${script}" "$@"\n`,
    'utf8'
  );
  chmodSync(wrapper, 0o755);
  return wrapper;
}

// ---------------------------------------------------------------------------
// One mode: one launch
// ---------------------------------------------------------------------------

const CHOICE = { agentId: 'claude', model: 'claude-haiku-4-5-20251001' };

async function runMode(mode) {
  const modeRoot = join(root, mode);
  rmSync(modeRoot, { recursive: true, force: true });
  const repo = join(modeRoot, 'repo');
  const profile = join(modeRoot, 'profile');
  const scratchHome = join(modeRoot, 'home');
  const stubDir = join(modeRoot, 'stub');
  for (const d of [profile, scratchHome, stubDir]) mkdirSync(d, { recursive: true });
  const firstCommit = buildScratchRepo(repo);
  const stubLog = join(stubDir, 'count.log');
  writeFileSync(stubLog, '', 'utf8');
  const stub = writeStub(stubDir);
  const useStub = !(mode === 'on' && real);
  const seedFile = join(modeRoot, 'arch-seed.json');
  writeFileSync(seedFile, JSON.stringify(CHOICE), 'utf8');
  say(`${mode}: scratch repository at ${repo}, first commit ${firstCommit.slice(0, 12)}`);

  const sessionsBefore = operatorSessionCount();
  const electronsBefore = electronsLeft();
  const agentBefore = new Set(
    psSample().filter((r) => AGENT_COMM.test(r.command)).map((r) => r.pid)
  );

  const launchDrive = {
    projectPath: repo,
    arch: { width: 340, live: true, cwd: repo, check: false }
  };

  // The renderer side. It talks to this process through console lines, and
  // this process answers by changing files in the scratch repository. Every
  // reading it takes is printed as one JSON line the report parses.
  const probeJs = `(async () => {
  const cwd = ${JSON.stringify(repo)};
  const api = window.gmux.arch;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const mark = (what, value) => console.log('[p159] ' + what + ' ' + JSON.stringify(value === undefined ? null : value));
  const until = async (label, test, ms) => {
    const deadline = Date.now() + ms;
    let last = null;
    while (Date.now() < deadline) {
      last = await test();
      if (last !== null && last !== false) return last;
      await sleep(250);
    }
    mark('timeout', { label, ms });
    return null;
  };
  const verdictOf = (load, id) => (load.verdicts.find((v) => v.subjectId === 'edge:' + id) ?? null);
  const summary = (load) => ({
    checkedAtCommit: load.checkedAtCommit, drift: load.drift, changes: load.changes,
    verdicts: load.verdicts.filter((v) => v.subjectId.startsWith('edge:')).map((v) => [v.subjectId, v.status, v.coverage])
  });
  const status = async () => api.passStatus({ cwd });

  const seeded = await api.seed({ cwd });
  // The seed asks for a check; the plant waits for it so the two do not race.
  await until('firstCheck', async () => {
    const load = await api.load({ cwd });
    return load.checkedAtCommit !== null ? load.checkedAtCommit : null;
  }, 60000);
  mark('seeded', seeded);
  // Hand off: this process plants the promises and commits.
  const planted = await until('planted', async () => {
    const load = await api.load({ cwd });
    return load.edges.some((e) => e.rule === 'must-not') ? load.edges.filter((e) => e.rule === 'must-not').map((e) => e.id) : null;
  }, 60000);
  mark('planted', planted);
  const [first, second] = planted ?? [];
  const holding = await until('holding', async () => {
    const load = await api.load({ cwd });
    const a = verdictOf(load, first); const b = verdictOf(load, second);
    return a && b && a.status === 'convergent' && b.status === 'convergent' ? summary(load) : null;
  }, 60000);
  mark('holding', holding);
  const statusBeforeBreak = await status();
  mark('statusBeforeBreak', statusBeforeBreak);
  mark('break-one', first);
  // Hand off: this process writes the first breaking file. With an agent the
  // stub answers inside the same second the break is published, so the
  // divergent state is not polled for; the recorded run is what is waited
  // on, and the prompt the stub kept is what proves the promise was broken
  // at the spawn. With no agent the divergent state is what stands.
  const ranAt = Date.now();
  let broke = null;
  let firstRun = null;
  if (${mode === 'on' ? 'true' : 'false'}) {
    firstRun = await until('firstRun', async () => {
      const s = await status();
      return s.lastRun !== null ? s : null;
    }, ${useStub ? 30000 : 200000});
    broke = summary(await api.load({ cwd }));
  } else {
    broke = await until('broke', async () => {
      const load = await api.load({ cwd });
      const a = verdictOf(load, first);
      return a && a.status === 'divergent' ? summary(load) : null;
    }, 60000);
    firstRun = await until('firstRun', async () => {
      const s = await status();
      return s.lastRun !== null ? s : null;
    }, 8000);
  }
  mark('broke', broke);
  mark('firstRun', firstRun === null ? null : { ...firstRun, waitedMs: Date.now() - ranAt });
  const repaired = await until('repaired', async () => {
    const load = await api.load({ cwd });
    return load.drift.count === 0 ? summary(load) : null;
  }, ${mode === 'on' ? 20000 : 4000});
  mark('repaired', repaired);
  mark('afterFirstWindow', { status: await status(), load: summary(await api.load({ cwd })) });
  // The second break goes in AT ONCE, inside the fold's minimum interval.
  mark('break-two', second);
  // Hand off: this process writes the second breaking file, inside the interval.
  const brokeTwo = await until('brokeTwo', async () => {
    const load = await api.load({ cwd });
    const b = verdictOf(load, second);
    return b && b.status === 'divergent' ? summary(load) : null;
  }, 60000);
  mark('brokeTwo', brokeTwo);
  await sleep(6000);
  mark('afterSecondBreak', { status: await status(), load: summary(await api.load({ cwd })) });
  // The ribbon's own keypress: arch:enrich scoped to the drift.
  const pressedAt = Date.now();
  const pressed = await api.enrich({ cwd, scope: 'drift' });
  mark('pressed', { ...pressed, wallMs: Date.now() - pressedAt });
  const afterPress = await until('afterPress', async () => {
    const load = await api.load({ cwd });
    return ${mode === 'on' ? 'load.drift.count === 0' : 'load.drift.count > 0'} ? summary(load) : null;
  }, 20000);
  mark('afterPress', afterPress);
  await sleep(4000);
  const finalStatus = await status();
  const finalLoad = summary(await api.load({ cwd }));
  const face = {
    repairButtons: document.querySelectorAll('.arch-ribbon-repair').length,
    ribbon: document.querySelector('.arch-ribbon')?.textContent?.trim() ?? null,
    changesRows: document.querySelectorAll('.arch-changes li').length,
    changesFirstRow: document.querySelector('.arch-changes li')?.textContent?.trim() ?? null
  };
  mark('final', { status: finalStatus, load: finalLoad, face });
  return { status: finalStatus, load: finalLoad, face };
})()`;

  const png = join(outDir, `p159-${mode}.png`);
  let samples = 0;
  const seen = new Map();
  const agentSeen = new Map();
  const sampler = setInterval(() => {
    samples += 1;
    for (const r of psSample()) {
      if (!seen.has(r.pid)) seen.set(r.pid, { ppid: r.ppid, command: r.command });
      if (AGENT_COMM.test(r.command) && !agentBefore.has(r.pid) && !agentSeen.has(r.pid)) {
        agentSeen.set(r.pid, { ppid: r.ppid, command: r.command, sample: samples });
      }
    }
  }, 300);

  const timeline = [];
  const at = (what, extra = {}) => {
    timeline.push({ t: Date.now() - t0, atMs: Date.now(), what, ...extra });
    say(`${mode}: ${what} at ${String(Date.now())}`);
  };

  let code = 1;
  let text = '';
  let appPid = 0;
  let planted = null;
  let edgesBefore = null;
  let edgesAfterPlant = null;
  // The real run keeps the person's own HOME, because the agent reads its
  // credentials there and a scratch home answers "not logged in" in under a
  // second, which the first real attempt measured at 666 ms. The stub runs
  // keep the scratch home, exactly as Phase 158's probe did.
  const env = {
    ...process.env,
    HOME: useStub ? scratchHome : process.env['HOME'],
    GMUX_SHOT: png,
    GMUX_SHOT_DELAY_MS: '9000',
    GMUX_SHOT_VERBOSE: '1',
    GMUX_LOG_FILE: '1',
    GMUX_SHOT_DRIVE: JSON.stringify(launchDrive),
    GMUX_SHOT_JS: probeJs,
    P159_REPO: repo,
    P159_STUB_LOG: stubLog,
    P159_STUB_DIR: stubDir
  };
  if (useStub) env.GMUX_FOLD_BIN = stub;
  if (mode === 'on') env.GMUX_ARCH_SEED = seedFile;

  try {
    await withElectron(
      {
        label: `p159 drift ${mode}`,
        userDataDir: profile,
        cwd: repoRoot,
        tmuxSocket: socket,
        ceilingMs: 420_000,
        env
      },
      async (handle) => {
        appPid = handle.pid;
        const exited = new Promise((r) => {
          void handle.exited.then((c) => setTimeout(() => r(c), 500));
        });
        const race = (p, label) =>
          Promise.race([p, exited.then(() => Promise.reject(new Error(`the app exited before ${label}`)))]);
        try {
          await race(handle.waitForLine(/\[p159\] seeded /, 90_000), 'seeded');
          at('seeded');
          edgesBefore = md5(join(repo, 'docs', 'arch', 'edges.json'));
          planted = plantPromises(repo);
          edgesAfterPlant = md5(join(repo, 'docs', 'arch', 'edges.json'));
          at('planted', { ids: planted.planted.map((p) => p.id), commit: planted.commit.slice(0, 12) });
          await race(handle.waitForLine(/\[p159\] break-one /, 90_000), 'break-one');
          const one = planted.planted[0];
          const breakOne = breakPromise(repo, one, 'three');
          at('broke-one', { file: one.breakFile, edge: one.id, commit: breakOne.slice(0, 12) });
          await race(handle.waitForLine(/\[p159\] break-two /, 300_000), 'break-two');
          const two = planted.planted[1];
          const breakTwo = breakPromise(repo, two, 'four');
          at('broke-two', { file: two.breakFile, edge: two.id, commit: breakTwo.slice(0, 12) });
        } catch (err) {
          at(`coordination stopped: ${String(err)}`);
        }
        code = await exited;
        text = handle.text();
        return code;
      }
    );
  } finally {
    clearInterval(sampler);
  }

  function underApp(pid) {
    let cur = pid;
    for (let hop = 0; hop < 32; hop += 1) {
      if (cur === appPid) return true;
      const row = seen.get(cur);
      if (row === undefined || row.ppid <= 1) return false;
      cur = row.ppid;
    }
    return false;
  }

  const sessionsAfter = operatorSessionCount();

  // The renderer's readings, one JSON line each.
  const marks = {};
  for (const line of text.split('\n')) {
    const m = /\[p159\] ([a-zA-Z-]+) (.*)$/.exec(line);
    if (m === null) continue;
    try {
      marks[m[1]] = JSON.parse(m[2]);
    } catch {
      marks[m[1]] = m[2];
    }
  }
  const seedLine = text.split('\n').find((l) => l.includes('[gmux-arch-seed]')) ?? null;

  const stubCount = readFileSync(stubLog, 'utf8').split('\n').filter((l) => l.trim() !== '');
  const prompts = readdirSync(stubDir)
    .filter((n) => n.startsWith('prompt-'))
    .sort()
    .map((n) => {
      const body = readFileSync(join(stubDir, n), 'utf8');
      const driftStart = body.indexOf('\nDRIFT');
      const driftEnd = body.indexOf('END DRIFT');
      return {
        file: n,
        bytes: Buffer.byteLength(body, 'utf8'),
        driftBlock: driftStart !== -1 && driftEnd !== -1 ? body.slice(driftStart + 1, driftEnd + 'END DRIFT'.length) : null
      };
    });

  const edgesPath = join(repo, 'docs', 'arch', 'edges.json');
  const edgesAfter = md5(edgesPath);
  const edgesNow = existsSync(edgesPath) ? JSON.parse(readFileSync(edgesPath, 'utf8')).edges : [];
  const plantedRules = (planted?.planted ?? []).map((p) => ({
    id: p.id,
    rule: edgesNow.find((e) => e.id === p.id)?.rule ?? null
  }));
  const gitStatus = spawnSync('git', ['-C', repo, 'status', '--short'], { encoding: 'utf8' }).stdout.trim();

  const logPath = join(profile, 'logs', 'app.log');
  const appLog = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '';
  const logLines = appLog.split('\n');
  const pick = (needle) => logLines.filter((l) => l.includes(needle));
  const reasonsOf = (lines) =>
    lines.map((l) => {
      const m = /"reason":"([^"]*)"/.exec(l);
      return m === null ? '?' : m[1];
    });
  const logRan = pick('arch.pass.ran');
  const logRefused = pick('arch.pass.refused');
  const logSkipped = pick('arch.pass.skipped');
  const logSuspended = pick('arch.pass.suspended');

  const agentRows = [...agentSeen].map(([pid, r]) => ({
    pid,
    ppid: r.ppid,
    mine: underApp(pid),
    sample: r.sample,
    command: r.command.slice(0, 200)
  }));
  const agentMine = agentRows.filter((r) => r.mine);
  const passShaped = agentMine.filter((r) => /\s-p\s|--system-prompt|--max-budget-usd/.test(r.command));
  // Another workflow's Electron may start during this window, so only a
  // process that names this checkout or sits under this launch's shim is
  // counted as left by this probe.
  const electronsAfter = electronsLeft();
  const electronsLeaked = [...electronsAfter]
    .filter(([pid, line]) => {
      if (electronsBefore.has(pid)) return false;
      const m = /^\s*(\d+)\s+(\d+)\s+/.exec(line);
      const ppid = m === null ? 0 : Number(m[2]);
      return line.includes(repoRoot) || ppid === appPid || underApp(pid);
    })
    .map(([, l]) => l);

  // The automatic window is everything before the press: the stub rows
  // whose timestamp precedes it, and the log's kept runs by trigger.
  const runsByTrigger = {};
  for (const l of logRan) {
    const m = /"trigger":"([a-z]+)"/.exec(l);
    const v = /"verdict":"([a-z]+)"/.exec(l);
    const key = `${m === null ? '?' : m[1]}:${v === null ? '?' : v[1]}`;
    runsByTrigger[key] = (runsByTrigger[key] ?? 0) + 1;
  }

  const failures = [];
  const check = (ok, why) => {
    if (!ok) failures.push(why);
  };
  check(code === 0, `the app exited ${String(code)} rather than 0`);
  check(sessionsAfter === sessionsBefore, `the operator's session count moved from ${String(sessionsBefore)} to ${String(sessionsAfter)}`);
  check(marks['seeded']?.ok === true, 'the seed did not write');
  check(Array.isArray(marks['planted']) && marks['planted'].length === 2, 'the two planted promises never loaded');
  check(marks['holding'] !== null && marks['holding'] !== undefined, 'the two planted promises never held');
  if (mode === 'off') {
    check(marks['broke'] !== null && marks['broke'] !== undefined, 'the first break was never published as divergent');
    check(marks['broke']?.drift?.count >= 1, 'main counted no drift after the first break');
  }
  check(passShaped.length === (mode === 'on' && real ? 1 : 0), `pass shaped agent processes under the app: ${String(passShaped.length)}`);
  check(electronsLeaked.length === 0, `Electrons left after the run: ${electronsLeaked.join(' | ')}`);
  check(samples > 10, `only ${String(samples)} process samples were taken`);
  if (mode === 'off') {
    check(stubCount.length === 0, `the stub ran ${String(stubCount.length)} times with no agent`);
    check(logRan.length === 0, `arch.pass.ran appeared ${String(logRan.length)} times with no agent`);
    check(marks['firstRun'] === null, 'a run was recorded with no agent');
    check(marks['afterSecondBreak']?.load?.drift?.count >= 2, 'both breaks should stand with no agent');
    check(marks['pressed']?.refusal === 'no-choice', `the press was answered ${String(marks['pressed']?.refusal)} and wanted no-choice`);
    check(seedLine === null, 'the arch seed printed a line in off mode');
    check(marks['afterSecondBreak']?.status?.chosen === false, 'main says an agent is chosen on a fresh profile');
  } else {
    check(seedLine !== null && seedLine.includes(CHOICE.agentId), 'the arch seed did not keep the choice');
    check(marks['firstRun']?.lastRun !== null && marks['firstRun'] !== null, 'no run was recorded after the first break');
    check(marks['firstRun']?.lastRun?.trigger === 'drift', `the first run's trigger was ${String(marks['firstRun']?.lastRun?.trigger)}`);
    check(marks['firstRun']?.lastRun?.scope === 'drift', `the first run's scope was ${String(marks['firstRun']?.lastRun?.scope)}`);
    if (useStub) {
      check(marks['firstRun']?.lastRun?.verdict === 'kept', `the first run was ${String(marks['firstRun']?.lastRun?.verdict)}: ${String(marks['firstRun']?.lastRun?.reason)} ${String(marks['firstRun']?.lastRun?.detail)}`);
      check(marks['repaired'] !== null && marks['repaired'] !== undefined, 'the drift did not clear after the kept write');
      // The automatic window is everything before the press. Exactly one
      // stub row must precede it, whatever the check after the kept write
      // and the second break inside the interval asked for.
      const pressedAt = marks['pressed']?.run?.startedAt ?? Number.MAX_SAFE_INTEGER;
      const automatic = stubCount.filter((l) => Number(l.split(' ')[0]) < pressedAt);
      check(automatic.length === 1, `the stub ran ${String(automatic.length)} times before the press, wanted exactly 1`);
      check(logRan.length === 2, `arch.pass.ran appeared ${String(logRan.length)} times, wanted 2`);
      // The runner records the interval as a skip rather than a refusal,
      // the fold's own word for a boundary dropped without spending.
      const dropped = [...reasonsOf(logRefused), ...reasonsOf(logSkipped)];
      check(dropped.includes('interval'), `the second break was not dropped for the interval; the runner said ${dropped.join(', ')}`);
      check(marks['afterSecondBreak']?.status?.lastRun?.startedAt === marks['firstRun']?.lastRun?.startedAt, 'a second automatic run was recorded inside the interval');
      check(marks['pressed']?.started === true && marks['pressed']?.run?.verdict === 'kept', `the press was ${String(marks['pressed']?.refusal ?? marks['pressed']?.run?.verdict)}`);
      check(marks['pressed']?.run?.trigger === 'ribbon', `the press's trigger was ${String(marks['pressed']?.run?.trigger)}`);
      check(stubCount.length === 2, `the stub ran ${String(stubCount.length)} times over the whole window, wanted 2 (one automatic, one press)`);
      check(plantedRules.every((r) => r.rule === 'may'), `planted rules after the two repairs: ${JSON.stringify(plantedRules)}`);
      check(prompts.length === 2 && prompts[0].driftBlock !== null, 'the stub kept no delta prompt with a DRIFT block');
      check(prompts[0]?.driftBlock?.includes(planted?.planted[0].id) === true, 'the first delta prompt does not name the first broken promise');
      check(prompts[0]?.driftBlock?.includes(planted?.planted[1].id) !== true, 'the first delta prompt names the promise that still held');
    }
    check(edgesAfter !== edgesAfterPlant, 'edges.json did not move after the repair');
  }
  check(reasonsOf(logSkipped).includes('held') || mode === 'off', 'the settle hold never deferred a repair');
  // The stub's first row must come AFTER the settle window, never inside it:
  // the break is a downgrade, so the check that saw it published the old
  // verdict and the run that fired is the second opinion.
  if (mode === 'on' && useStub) {
    const brokeOneAt = timeline.find((t) => t.what === 'broke-one')?.atMs ?? 0;
    const firstStubAt = Number((stubCount[0] ?? '0').split(' ')[0]);
    check(firstStubAt - brokeOneAt >= 2400, `the stub ran ${String(firstStubAt - brokeOneAt)} ms after the break, inside the settle window`);
  }

  const report = {
    mode,
    real: mode === 'on' && real,
    at: new Date().toISOString(),
    commit: spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim() || null,
    repo,
    firstCommit,
    planted: planted?.planted ?? null,
    plantedCommit: planted?.commit ?? null,
    exitCode: code,
    sessionsBefore,
    sessionsAfter,
    png: existsSync(png) ? png : null,
    timeline,
    marks,
    seedLine,
    stubRuns: stubCount,
    prompts,
    edgesMd5: { seeded: edgesBefore, planted: edgesAfterPlant, final: edgesAfter },
    plantedRules,
    gitStatus,
    log: {
      ran: logRan,
      refused: logRefused,
      refusedReasons: reasonsOf(logRefused),
      skipped: logSkipped,
      skippedReasons: reasonsOf(logSkipped),
      suspended: logSuspended,
      runsByTrigger
    },
    profile,
    appPid,
    processSamples: samples,
    agentProcessesSeen: agentRows,
    agentProcessesUnderApp: agentMine.length,
    passShapedProcesses: passShaped.length,
    electronsLeft: electronsLeaked,
    failures
  };
  writeFileSync(join(outDir, `p159-${mode}.json`), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(outDir, `p159-${mode}.stdout.txt`), text);

  say(`${mode}: stub runs ${String(stubCount.length)}, pass shaped ${String(passShaped.length)}, log ran ${String(logRan.length)} refused [${reasonsOf(logRefused).join(', ')}] skipped [${reasonsOf(logSkipped).join(', ')}]`);
  say(`${mode}: first run ${JSON.stringify(marks['firstRun']?.lastRun ?? null)}`);
  say(`${mode}: press ${JSON.stringify(marks['pressed'] ?? null)}`);
  say(`${mode}: planted rules now ${JSON.stringify(plantedRules)}; edges.json md5 ${String(edgesAfterPlant)} -> ${String(edgesAfter)}`);
  say(`${mode}: electrons left ${String(electronsLeaked.length)}; report ${join(outDir, `p159-${mode}.json`)}`);
  return failures.map((f) => `${mode}: ${f}`);
}

const allFailures = [];
for (const mode of modes) {
  allFailures.push(...(await runMode(mode)));
}
if (allFailures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const f of allFailures) console.error(`${TAG}   - ${f}`);
  process.exit(1);
}
say('PASS');
// Phase 158's verifier found the node process stays alive after withElectron
// returns, so the exit is explicit.
process.exit(0);
