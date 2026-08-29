#!/usr/bin/env node
/**
 * probe-p158-onepath.mjs. The skeleton only path, pressed for real over a
 * scratch copy of a repository with NO agent configured (Phase 158).
 *
 * ## What it proves, and how
 *
 * The charter says a project with no configured agent gets the deterministic
 * skeleton and nothing else, and says so plainly rather than appearing broken.
 * This probe launches ONE Electron on a fresh profile, so the arch choice is
 * None, opens the scratch repository, presses the shipped Draft button through
 * `src/renderer/arch/shot-probe.ts`'s `press` drive, and then reads back:
 *
 *   - what main answered the gesture: the contract present, the parts drawn,
 *     the pass refused with `no-choice`, no run recorded, the pass face words;
 *   - what landed on disk under `docs/arch/`: every file listed, the JSON
 *     parsed, and `baseline.json` ABSENT, because its first writer is always
 *     the person's own accept;
 *   - the app's own log: `arch.pass.refused` with `no-choice`, and NO
 *     `arch.pass.ran` line, because nothing ran;
 *   - the processes sampled every 300 ms while the app was up: no agent
 *     binary appeared, so the count for this gesture is ZERO;
 *   - the Electrons left after the run, counted with the CLAUDE.md command.
 *
 * Determinism is proved by pressing once and then drafting a second time
 * through the read only `arch:skeleton` channel inside the same window and
 * comparing bytes against what the seed wrote.
 *
 * ## Safety, absolute
 *
 *   - Refuses to run without a harness socket of its own, and refuses the
 *     names `gmux` and `default`.
 *   - Refuses a repository under the person's home directory. The scratch
 *     copy lives under the scratchpad and nowhere else.
 *   - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *     count taken before and after, which must match.
 *   - The one Electron goes through build/electron-run.mjs, which ends the
 *     whole tree it started in a `finally` block. This file signals nothing
 *     itself.
 *
 * Usage:
 *   P158_REPO=/abs/path/to/scratch/copy \
 *   node build/harness-socket.mjs gmux-p158-onepath 'node build/probe-p158-onepath.mjs'
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p158]';
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
      "gmux-p158-onepath 'node build/probe-p158-onepath.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const repoArg = (process.env['P158_REPO'] ?? '').trim();
if (repoArg === '') refuse('P158_REPO must name the scratch repository copy.');
const repo = realpathSync(resolve(repoArg));
const home = resolve(homedir());
if (repo === home || repo.startsWith(home + sep)) {
  refuse(`the repository "${repo}" is under the person's home. Use a scratch copy.`);
}
if (!existsSync(join(repo, '.git'))) refuse(`"${repo}" is not a git repository.`);
if (existsSync(join(repo, 'docs', 'arch'))) {
  refuse(
    `"${repo}/docs/arch" already exists. The skeleton only path starts from no contract; move it aside first.`
  );
}

const outDir = resolve(
  repoRoot,
  (process.env['P158_OUT_DIR'] ?? '').trim() || 'out/p158'
);
mkdirSync(outDir, { recursive: true });

const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p158-onepath');
mkdirSync(join(rawRoot, 'home'), { recursive: true });
mkdirSync(join(rawRoot, 'profile'), { recursive: true });
const root = realpathSync(rawRoot);
const scratchHome = join(root, 'home');
const profile = join(root, 'profile');

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

/** One `ps` sample: pid, parent and the full command of every process. */
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

const sessionsBefore = operatorSessionCount();
say(`operator sessions before: ${String(sessionsBefore)}`);
const electronsBefore = electronsLeft();
say(`electron pids before (the operator's own, counted so the end count is honest): ${String(electronsBefore.size)}`);

const agentBefore = new Set(
  psSample()
    .filter((r) => AGENT_COMM.test(r.command))
    .map((r) => r.pid)
);

// ---------------------------------------------------------------------------
// The one launch
// ---------------------------------------------------------------------------

const launchDrive = {
  projectPath: repo,
  arch: { width: 340, live: true, cwd: repo, check: false, onePath: true, press: true }
};

const probeJs = `(async () => {
  console.log('[p158-step] after-press');
  await window.__gmuxShotDrive({ projectPath: ${JSON.stringify(repo)}, arch: { width: 340, live: true, cwd: ${JSON.stringify(
    repo
  )}, onePath: true } });
  const api = window.gmux && window.gmux.arch;
  let draft = null;
  if (api && typeof api.skeleton === 'function') {
    const a = await api.skeleton({ cwd: ${JSON.stringify(repo)} });
    draft = a.files.map((f) => ({ path: f.path, bytes: f.content.length, content: f.content }));
  }
  const settings = window.gmux && typeof window.gmux.settingsGet === 'function'
    ? await window.gmux.settingsGet().then((s) => (s && s.arch) ?? null).catch(() => 'unreadable')
    : 'no-bridge';
  return { draft, archSetting: settings };
})()`;

const png = join(outDir, 'p158-onepath.png');

let samples = 0;
/** Every process seen while the app was up: pid to its parent and command. */
const seen = new Map();
/** The agent looking processes seen, with the sample they first appeared in. */
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

say('launch');
let code = 1;
let text = '';
let appPid = 0;
try {
  await withElectron(
    {
      label: 'p158 one path',
      userDataDir: profile,
      cwd: repoRoot,
      tmuxSocket: socket,
      env: {
        ...process.env,
        HOME: scratchHome,
        GMUX_SHOT: png,
        GMUX_SHOT_DELAY_MS: '9000',
        GMUX_SHOT_VERBOSE: '1',
        // An unpackaged run writes app.log only when asked, and the log is
        // one of the readings: the refusal line must be there and no run line.
        GMUX_LOG_FILE: '1',
        GMUX_SHOT_DRIVE: JSON.stringify(launchDrive),
        GMUX_SHOT_JS: probeJs
      }
    },
    async (handle) => {
      appPid = handle.pid;
      code = await new Promise((r) => {
        const ceiling = setTimeout(() => {
          console.error(`${TAG} passed the 240 s ceiling; the teardown ends the tree`);
          r(1);
        }, 240_000);
        void handle.exited.then((c) => {
          clearTimeout(ceiling);
          setTimeout(() => r(c), 500);
        });
      });
      text = handle.text();
      return code;
    }
  );
} finally {
  clearInterval(sampler);
}

/** Is this pid, by the parents the samples saw, under the app this probe started? */
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
say(`operator sessions after: ${String(sessionsAfter)}`);

// ---------------------------------------------------------------------------
// Reading the run back
// ---------------------------------------------------------------------------

function readJsonLine(stdout, what) {
  const re = new RegExp(`\\[arch-probe\\] ${what}: (\\{.*\\})\\s*$`);
  const found = [];
  for (const line of stdout.split('\n')) {
    const m = re.exec(line);
    if (m === null) continue;
    try {
      found.push(JSON.parse(m[1]));
    } catch {
      /* a truncated tee line is not a reading */
    }
  }
  return found;
}

function readLines(stdout, what) {
  const out = [];
  const re = new RegExp(`\\[arch-probe\\] ${what}: (.*)$`);
  for (const line of stdout.split('\n')) {
    const m = re.exec(line);
    if (m !== null) out.push(m[1].trim());
  }
  return out;
}

function readProbeValue(stdout) {
  const marker = '[gmux-shot] probe ';
  const at = stdout.lastIndexOf(marker);
  if (at === -1) return null;
  try {
    return JSON.parse(stdout.slice(at + marker.length).split('\n')[0] ?? '');
  } catch {
    return null;
  }
}

const presses = readJsonLine(text, 'press');
const onePaths = readJsonLine(text, 'onePath');
const restWords = readLines(text, 'restWords');
const value = readProbeValue(text);

// What landed on disk.
const archDir = join(repo, 'docs', 'arch');
function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(repo, p));
    }
  };
  walk(dir);
  return out;
}
const written = listFiles(archDir);
const parsed = {};
for (const rel of written) {
  try {
    parsed[rel] = JSON.parse(readFileSync(join(repo, rel), 'utf8'));
  } catch (err) {
    parsed[rel] = `UNPARSEABLE: ${String(err)}`;
  }
}
const components = written.filter((p) => p.startsWith('docs/arch/components/'));
const contract = parsed['docs/arch/contract.json'] ?? null;
const edges = parsed['docs/arch/edges.json'] ?? null;

// Byte for byte against the read only draft channel, taken in the same window.
const draft = Array.isArray(value?.draft) ? value.draft : [];
const draftDiff = [];
for (const file of draft) {
  // The seed never writes baseline.json; its first writer is the accept.
  if (file.path.endsWith('baseline.json')) continue;
  const onDisk = existsSync(join(repo, file.path))
    ? readFileSync(join(repo, file.path), 'utf8')
    : null;
  if (onDisk !== file.content) draftDiff.push(file.path);
}
const draftPaths = draft.map((f) => f.path).sort();
const draftMinusBaseline = draftPaths.filter((p) => !p.endsWith('baseline.json'));

// What Source Control would see.
const gitStatus = spawnSync(
  'git',
  ['-C', repo, 'status', '--short', '--ignored', '--', 'docs/arch'],
  { encoding: 'utf8' }
).stdout.trim();
const gitIgnored = spawnSync(
  'git',
  ['-C', repo, 'check-ignore', '-v', 'docs/arch/contract.json'],
  { encoding: 'utf8' }
).stdout.trim();

// The app's own log.
const logPath = join(profile, 'logs', 'app.log');
const appLog = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '';
const logRefused = appLog
  .split('\n')
  .filter((l) => l.includes('arch.pass.refused'));
const logRan = appLog.split('\n').filter((l) => l.includes('arch.pass.ran'));
const logSpawn = appLog
  .split('\n')
  .filter((l) => /fold\.spawn|runGuarded|spawned/.test(l) && /arch/.test(l));

const agentRows = [...agentSeen].map(([pid, r]) => ({
  pid,
  ppid: r.ppid,
  mine: underApp(pid),
  sample: r.sample,
  command: r.command.slice(0, 200)
}));
const agentMine = agentRows.filter((r) => r.mine);
// The pass recipe's own shape: a one shot `-p` with a system prompt. A
// detection probe (`--version`) is Tortie's startup and is not the pass.
const passShaped = agentMine.filter((r) => /\s-p\s|--system-prompt|--max-budget-usd/.test(r.command));
const electronsAfter = electronsLeft();
const electronsLeaked = [...electronsAfter].filter(([pid]) => !electronsBefore.has(pid)).map(([, l]) => l);

const press = presses[0] ?? null;
const after = onePaths[onePaths.length - 1] ?? null;

const failures = [];
const check = (ok, why) => {
  if (!ok) failures.push(why);
};

check(code === 0, `the app exited ${String(code)} rather than 0`);
check(
  sessionsAfter === sessionsBefore,
  `the operator's session count moved from ${String(sessionsBefore)} to ${String(sessionsAfter)}`
);
check(press !== null, 'the press line never arrived');
if (press !== null) {
  check(press.disabledBefore === false, 'the Draft button was disabled before the press');
  check(press.present === true, 'after the press the store still says no contract');
  check(press.components >= 1, 'after the press the store holds no parts');
  check(press.refusal === 'no-choice', `the pass refusal was ${String(press.refusal)} and wanted no-choice`);
  check(press.chosen === false, 'main says an agent is chosen on a fresh profile');
  check(press.lastRun === null, 'main recorded a run when nothing may run');
  check(press.running === false, 'main says a pass is running');
  check(
    typeof press.passWords === 'string' && press.passWords.includes('No agent fills this in yet'),
    `the pass face does not say the skeleton is the whole story: "${String(press.passWords)}"`
  );
  check(press.error === null, `the store holds an error: ${String(press.error)}`);
}
check(written.length >= 3, `only ${String(written.length)} files landed under docs/arch`);
check(written.includes('docs/arch/contract.json'), 'contract.json did not land');
check(written.includes('docs/arch/edges.json'), 'edges.json did not land');
check(components.length >= 1, 'no component file landed');
check(!written.includes('docs/arch/baseline.json'), 'baseline.json was written by the seed');
check(
  Object.values(parsed).every((v) => typeof v !== 'string'),
  'a written file does not parse as JSON'
);
check(draft.length > 0, 'the read only draft channel answered nothing');
check(
  JSON.stringify(draftMinusBaseline) === JSON.stringify(written),
  `the seed wrote ${JSON.stringify(written)} and the draft names ${JSON.stringify(draftMinusBaseline)}`
);
check(
  draftDiff.length === 0,
  `the seed's bytes differ from a second draft on: ${draftDiff.join(', ')}`
);
check(
  draftPaths.includes('docs/arch/baseline.json'),
  'the draft channel no longer names baseline.json, so the seed filter is untested'
);
check(logRefused.some((l) => l.includes('no-choice')), 'the app log holds no arch.pass.refused no-choice line');
check(logRan.length === 0, `the app log holds ${String(logRan.length)} arch.pass.ran lines and wanted 0`);
check(
  passShaped.length === 0,
  `a pass shaped agent process ran under the app: ${passShaped.map((r) => r.command).join(' | ')}`
);
check(samples > 10, `only ${String(samples)} process samples were taken`);
check(electronsLeaked.length === 0, `Electrons left after the run: ${electronsLeaked.join(' | ')}`);
check(
  value?.archSetting === null || (value?.archSetting?.agentId === null && value?.archSetting?.model === null),
  `the arch setting on a fresh profile reads ${JSON.stringify(value?.archSetting)}`
);

const report = {
  at: new Date().toISOString(),
  commit:
    spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim() ||
    null,
  repo,
  exitCode: code,
  sessionsBefore,
  sessionsAfter,
  png: existsSync(png) ? png : null,
  press,
  afterPress: after,
  restWords,
  written,
  contractSubject: contract?.subject ?? null,
  contractLayers: Array.isArray(contract?.layers) ? contract.layers.length : null,
  componentFiles: components.length,
  edgeCount: Array.isArray(edges?.edges) ? edges.edges.length : null,
  mayEdges: Array.isArray(edges?.edges)
    ? edges.edges.filter((e) => e.rule === 'may').length
    : null,
  draftPaths,
  draftDiff,
  gitStatus,
  gitIgnored,
  archSetting: value?.archSetting ?? null,
  log: { refused: logRefused, ran: logRan, spawn: logSpawn },
  profile,
  appPid,
  processSamples: samples,
  agentProcessesSeen: agentRows,
  agentProcessesUnderApp: agentMine.length,
  passShapedProcesses: passShaped.length,
  electronsLeft: electronsLeaked,
  failures
};

writeFileSync(join(outDir, 'p158-onepath.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(outDir, 'p158-onepath.stdout.txt'), text);

say(`press: ${JSON.stringify(press)}`);
say(`written: ${JSON.stringify(written)}`);
say(`draft vs disk: ${draftDiff.length === 0 ? 'byte identical' : draftDiff.join(', ')}`);
say(`git sees: ${gitStatus === '' ? 'nothing' : gitStatus.replace(/\n/g, ' | ')}${gitIgnored === '' ? '' : ` (ignored by ${gitIgnored})`}`);
say(`log refused: ${String(logRefused.length)} ran: ${String(logRan.length)}`);
say(
  `agent processes over ${String(samples)} samples: ${String(agentRows.length)} seen, ${String(
    agentMine.length
  )} under the app, ${String(passShaped.length)} pass shaped`
);
for (const r of agentMine) say(`  under the app: pid ${String(r.pid)} ${r.command}`);
say(`electrons left: ${String(electronsLeaked.length)}`);
say(`report: ${join(outDir, 'p158-onepath.json')}`);

if (failures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const f of failures) console.error(`${TAG}   - ${f}`);
  process.exit(1);
}
say('PASS');
