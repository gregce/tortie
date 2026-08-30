#!/usr/bin/env node
/**
 * probe-p164-boot.mjs. What a launch spawns before a person has touched
 * anything, measured on three profile shapes (Phase 164).
 *
 * ## What it proves, and how
 *
 * Phase 164 moved two pieces of invisible boot work to demand: the git status
 * of every hidden project, and the fourteen agent version probes. This probe
 * launches the REAL app, not a smoke, through build/electron-run.mjs with
 * build/p164-spawn-hook.cjs loaded into the main process, and reads what that
 * process spawned against Phase 163's own milestones. Three profile shapes,
 * each launched cold and warm several times:
 *
 *   reopen   five local projects and one shell terminal alive in the active
 *            project on the scratch server, which is the launch the audit
 *            named: reopening an existing project and terminal
 *   first    a fresh profile with no project, so the first screen is the
 *            first run page
 *   tiles    one project and no session, so the first screen is the session
 *            tiles, which draw the agent scan
 *
 * Cold means the profile's Chromium caches were removed before the launch,
 * the way Phase 163 defines it; warm is the next launch untouched.
 *
 * ## What it grades
 *
 *   reopen   zero agent version probes in the first five seconds, zero git
 *            status spawns in a hidden project in the first two seconds, at
 *            least one in the active project, and first-attach landed
 *   first    the boot warm is kept: probes start before the window is shown
 *   tiles    probes start before the window is shown, and one project is
 *            statused in the first two seconds
 *
 * When GMUX_P164_BASELINE names the out directory of an earlier run, the
 * first-attach and window-shown distributions are printed side by side and a
 * run whose p50 lies past the baseline's p95 AND more than ten percent past
 * the baseline's p50 is called a regression. Both conditions, because at five
 * runs a p50 crosses a p95 by a millisecond or two on the same tree launched
 * twice, measured on 2026-08-29, and a gate that flags that is one people
 * learn to ignore. The tables are printed whatever the rule says. That is
 * how the parent commit measurement is made: run this probe on a checkout
 * built at the parent with GMUX_P164_APP_ROOT pointing at it, then on the
 * new commit with the first run's directory as the baseline.
 *
 * ## Safety, absolute
 *
 *   - Refuses to run without a harness socket, and refuses `gmux` and
 *     `default` by name. Every launch ends in the helper's finally block and
 *     the scratch server is ended here in a finally block of its own.
 *   - Every profile, repository and HOME is under GMUX_HARNESS_DIR, so no
 *     file under the person's home is opened.
 *   - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *     count taken before and after, which must match.
 *   - It signals nothing itself and exits through process.exit after the last
 *     withElectron returns.
 *
 * Usage:
 *   node build/harness-socket.mjs --fresh gmux-p164-boot 'node build/probe-p164-boot.mjs'
 *   node build/probe-p164-boot.mjs --compare <before out dir> <after out dir>
 *
 * The second form launches nothing and needs no socket. It reads two out
 * directories this probe wrote, or directories in the same shape, and prints
 * the comparison, so the parent commit's numbers and the new commit's can be
 * put side by side after the fact.
 *
 * Knobs: GMUX_P164_OUT_DIR (default out/p164), GMUX_P164_RUNS (default 5),
 * GMUX_P164_SCENARIOS (default reopen,first,tiles), GMUX_P164_HOLD_MS
 * (default 8000), GMUX_P164_APP_ROOT (a built checkout to launch, default
 * this one), GMUX_P164_BASELINE (an earlier out directory to compare with).
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = join(repoRoot, 'build', 'p164-spawn-hook.cjs');
const TAG = '[probe:p164]';
const t0 = Date.now();
const say = (line) => {
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
};
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const compareMode = process.argv[2] === '--compare';

const socket = compareMode ? 'compare' : (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness: node build/harness-socket.mjs ' +
      "--fresh gmux-p164-boot 'node build/probe-p164-boot.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
const appRoot = resolve((process.env['GMUX_P164_APP_ROOT'] ?? '').trim() || repoRoot);
if (!compareMode && !existsSync(join(appRoot, 'out', 'main', 'index.js'))) {
  refuse(`${join(appRoot, 'out', 'main', 'index.js')} is missing. Run npm run build there first.`);
}
if (!compareMode && spawnSync('sqlite3', ['-version'], { encoding: 'utf8' }).status !== 0) {
  refuse('sqlite3 is not on the PATH, and the projects are seeded through it.');
}

const runs = Number((process.env['GMUX_P164_RUNS'] ?? '').trim() || '5');
if (!Number.isInteger(runs) || runs < 1) refuse('GMUX_P164_RUNS must be a positive integer.');
const holdMs = Number((process.env['GMUX_P164_HOLD_MS'] ?? '').trim() || '8000');
if (!Number.isInteger(holdMs) || holdMs < 3000) refuse('GMUX_P164_HOLD_MS must be at least 3000.');
const SCENARIOS = ['reopen', 'first', 'tiles'];
const scenarios = ((process.env['GMUX_P164_SCENARIOS'] ?? '').trim() || SCENARIOS.join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
for (const s of scenarios) if (!SCENARIOS.includes(s)) refuse(`unknown scenario "${s}"`);
const baselineDir = compareMode ? (process.argv[3] ?? '') : (process.env['GMUX_P164_BASELINE'] ?? '').trim();
if (compareMode && (baselineDir === '' || (process.argv[4] ?? '') === '')) {
  refuse('--compare needs two out directories, the before and the after.');
}

const outDir = resolve(repoRoot, (process.env['GMUX_P164_OUT_DIR'] ?? '').trim() || 'out/p164');
mkdirSync(outDir, { recursive: true });

const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p164-boot');
mkdirSync(rawRoot, { recursive: true });
const root = realpathSync(rawRoot);

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  if (out.status !== 0) return 0;
  return out.stdout.split('\n').filter((l) => l.trim() !== '').length;
}

/** The CLAUDE.md count of what an Electron run leaves behind, keyed by pid. */
function electronsLeft() {
  const out = spawnSync(
    'sh',
    ['-c', 'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct'],
    { encoding: 'utf8' }
  );
  const rows = new Map();
  for (const line of out.stdout.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.set(Number(m[1]), line.trim());
  }
  return rows;
}

const tmux = (...args) => spawnSync('tmux', ['-L', socket, ...args], { encoding: 'utf8' });

// ---------------------------------------------------------------------------
// Scratch repositories and profiles
// ---------------------------------------------------------------------------

function makeRepo(path, name) {
  mkdirSync(path, { recursive: true });
  const git = (...a) => spawnSync('git', a, { cwd: path, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'p164@example.invalid');
  git('config', 'user.name', 'p164');
  writeFileSync(join(path, 'README.md'), `# ${name}\n`);
  git('add', '.');
  git('commit', '-q', '-m', 'first');
  writeFileSync(join(path, 'untracked.txt'), 'x\n');
}

function purgeChromiumCaches(profile) {
  for (const d of ['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'blob_storage', 'Session Storage']) {
    const p = join(profile, d);
    if (p.startsWith(root) && existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
}

function seedProjects(profile, paths) {
  const db = join(profile, 'gmux', 'manifest.db');
  if (!existsSync(db)) throw new Error(`no manifest at ${db}`);
  const rows = paths
    .map(
      (p, i) =>
        `INSERT OR IGNORE INTO projects (id, path, name) VALUES ('p164-${String(i)}-${String(Date.now())}', '${p}', '${basename(p)}');`
    )
    .join('\n');
  const r = spawnSync('sqlite3', [db, rows], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`sqlite3: ${r.stderr}`);
  const count = spawnSync('sqlite3', [db, 'SELECT COUNT(*) FROM projects;'], { encoding: 'utf8' }).stdout.trim();
  say(`projects in manifest: ${count}`);
}

// ---------------------------------------------------------------------------
// One launch
// ---------------------------------------------------------------------------

/** The log written by the Electron MAIN process when the hold was reached. */
function mainLog(logFile) {
  const dir = dirname(logFile);
  const base = basename(logFile);
  for (const name of readdirSync(dir)) {
    if (!name.startsWith(`${base}.`) || !name.endsWith('.json')) continue;
    try {
      const j = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      if (j.type === 'browser' && j.why === 'hold') return join(dir, name);
    } catch {}
  }
  return null;
}

async function launch(label, profile, home, extraEnv, logFile, keepServer) {
  for (const n of readdirSync(dirname(logFile))) {
    if (n.startsWith(basename(logFile))) rmSync(join(dirname(logFile), n));
  }
  const started = Date.now();
  let text = '';
  await withElectron(
    {
      label,
      userDataDir: profile,
      cwd: appRoot,
      tmuxSocket: keepServer ? null : socket,
      program: 'app',
      args: ['--use-mock-keychain'],
      env: {
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        NODE_OPTIONS: `--require ${HOOK}`,
        GMUX_P164_SPAWN_LOG: logFile,
        GMUX_P164_HOLD_MS: String(holdMs),
        ...extraEnv
      }
    },
    async (handle) => {
      const deadline = Date.now() + holdMs + 20_000;
      while (Date.now() < deadline) {
        if (mainLog(logFile) !== null) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      text = handle.text();
    }
  );
  writeFileSync(`${logFile}.stdout.txt`, text);
  say(`${label}: ${String(Date.now() - started)} ms wall`);
  const f = mainLog(logFile);
  if (f === null) return null;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  writeFileSync(logFile, JSON.stringify(j, null, 1));
  return j;
}

// ---------------------------------------------------------------------------
// Reading a launch
// ---------------------------------------------------------------------------

const NOT_AGENT = new Set(['tmux', 'git', 'zsh', 'bash', 'sh', 'ps', 'ssh', 'launchctl', 'sqlite3', 'osascript', 'mdls', 'security', 'which', 'lsof']);

function readLaunch(j, activeName) {
  const ms = Object.fromEntries(j.milestones.map((m) => [m.name, m.atMs]));
  const statusRows = j.spawns.filter((s) => basename(s.file) === 'git' && s.args[0] === 'status');
  const in2 = statusRows.filter((s) => s.t <= 2000);
  const isActive = (s) => basename(s.cwd ?? '') === activeName;
  const probes = j.spawns.filter((s) => !NOT_AGENT.has(basename(s.file)) && !s.file.includes('Electron'));
  return {
    milestones: ms,
    statusActive2s: in2.filter(isActive).length,
    statusHidden2s: in2.filter((s) => !isActive(s)).length,
    hiddenProjects2s: [...new Set(in2.filter((s) => !isActive(s)).map((s) => s.cwd))],
    gitOther2s: j.spawns.filter((s) => basename(s.file) === 'git' && s.args[0] !== 'status' && s.t <= 2000).length,
    probes5s: probes.filter((s) => s.t <= 5000).length,
    probesAll: probes.length,
    firstProbeAt: probes.length > 0 ? Math.min(...probes.map((s) => s.t)) : null,
    probeArgv: probes.map((s) => `${basename(s.file)} ${s.args.join(' ')}`)
  };
}

const pct = (xs, p) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1);
  return s[Math.max(0, i)];
};
const fmt = (xs) => (xs.length === 0 ? 'never' : `p50 ${String(pct(xs, 50))} p95 ${String(pct(xs, 95))} [${xs.join(' ')}]`);

// ---------------------------------------------------------------------------
// The scenarios
// ---------------------------------------------------------------------------

/** @type {Array<{what:string, detail:string}>} */
const failures = [];
const fail = (what, detail) => failures.push({ what, detail });
/** @type {Record<string, Record<string, object[]>>} */
const results = {};

async function runScenario(scenario) {
  // Every scenario starts on an EMPTY scratch server. The reopen scenario
  // leaves its shell session alive on purpose, and a later profile that found
  // it would adopt it and show a row where the scenario promises none.
  tmux('kill-server');
  const scRoot = join(root, scenario);
  if (existsSync(scRoot)) rmSync(scRoot, { recursive: true, force: true });
  const home = join(scRoot, 'home');
  const profile = join(scRoot, 'profile');
  mkdirSync(home, { recursive: true });
  mkdirSync(profile, { recursive: true });
  const scOut = join(outDir, scenario);
  mkdirSync(scOut, { recursive: true });
  results[scenario] = { cold: [], warm: [] };

  if (scenario === 'reopen' || scenario === 'tiles') {
    const n = scenario === 'reopen' ? 5 : 1;
    // Project r1 IS the scratch home, because the p163 capture harness creates
    // its session with cwd home, and the renderer only selects and attaches a
    // session that belongs to the active project. The manifest lists projects
    // by name, so 'home' sorts first and is the active project on every launch.
    makeRepo(home, 'home');
    const repos = [home];
    for (let i = 2; i <= n; i += 1) {
      const p = join(scRoot, 'repos', `r${String(i)}`);
      makeRepo(p, `r${String(i)}`);
      repos.push(p);
    }
    // The setup launch is the Phase 163 capture harness. It boots the core,
    // creates one shell session on the scratch server (reopen) or none
    // (tiles), and writes the manifest schema. It is not measured.
    await launch(
      `${scenario} setup`,
      profile,
      home,
      {
        GMUX_SMOKE: 'p163-capture',
        GMUX_P163_ROOT: scRoot,
        GMUX_P163_OUT: join(scOut, 'setup-capture.json'),
        GMUX_P163_SESSIONS: scenario === 'reopen' ? '1' : '0',
        GMUX_P163_RUN: 'cold',
        GMUX_P164_HOLD_MS: '60000'
      },
      join(scOut, 'setup-spawns.json'),
      true
    );
    seedProjects(profile, repos);
    const alive = tmux('list-sessions').stdout.trim().split('\n').filter(Boolean).length;
    say(`${scenario}: scratch server holds ${String(alive)} session(s)`);
    for (const temp of ['cold', 'warm']) {
      for (let i = 1; i <= runs; i += 1) {
        if (temp === 'cold') purgeChromiumCaches(profile);
        const j = await launch(`${scenario} ${temp} ${String(i)}`, profile, home, { GMUX_PROBES: '0' }, join(scOut, `${temp}-${String(i)}.json`), true);
        if (j === null) fail(`${scenario} ${temp} ${String(i)} wrote no log`, 'the main process never reached the hold');
        else results[scenario][temp].push(readLaunch(j, 'home'));
      }
    }
  } else {
    for (let i = 1; i <= runs; i += 1) {
      const p = join(scRoot, `fresh-${String(i)}`);
      mkdirSync(p, { recursive: true });
      for (const temp of ['cold', 'warm']) {
        const j = await launch(`${scenario} ${temp} ${String(i)}`, p, home, { GMUX_PROBES: '0' }, join(scOut, `${temp}-${String(i)}.json`), true);
        if (j === null) fail(`${scenario} ${temp} ${String(i)} wrote no log`, 'the main process never reached the hold');
        else results[scenario][temp].push(readLaunch(j, 'home'));
      }
    }
  }
}

function report(scenario) {
  for (const temp of ['cold', 'warm']) {
    const rs = results[scenario][temp];
    if (rs.length === 0) continue;
    console.log(`\n== ${scenario} ${temp} (${String(rs.length)} runs, ${String(holdMs)} ms window) ==`);
    for (const name of ['app-ready', 'path-ready', 'sessions-reconciled', 'window-shown', 'sessions-listed', 'first-attach', 'first-bytes']) {
      const xs = rs.map((r) => r.milestones[name]).filter((x) => typeof x === 'number');
      console.log(`  ${name.padEnd(22)} ${fmt(xs)}`);
    }
    console.log(`  ${'git status active 2s'.padEnd(22)} ${fmt(rs.map((r) => r.statusActive2s))}`);
    console.log(`  ${'git status hidden 2s'.padEnd(22)} ${fmt(rs.map((r) => r.statusHidden2s))}`);
    console.log(`  ${'other git 2s'.padEnd(22)} ${fmt(rs.map((r) => r.gitOther2s))}`);
    console.log(`  ${'agent probes 5s'.padEnd(22)} ${fmt(rs.map((r) => r.probes5s))}`);
    console.log(`  ${'agent probes window'.padEnd(22)} ${fmt(rs.map((r) => r.probesAll))}`);
    console.log(`  ${'first probe at'.padEnd(22)} ${fmt(rs.map((r) => r.firstProbeAt).filter((x) => x !== null))}`);
    if (rs[0].probeArgv.length > 0) console.log(`  probe argv in run 1: ${rs[0].probeArgv.join(' | ')}`);
  }
}

function grade(scenario) {
  for (const temp of ['cold', 'warm']) {
    const rs = results[scenario][temp];
    rs.forEach((r, i) => {
      const label = `${scenario} ${temp} ${String(i + 1)}`;
      for (const name of ['app-ready', 'path-ready', 'sessions-reconciled', 'window-shown', 'sessions-listed']) {
        if (typeof r.milestones[name] !== 'number') fail(`${label}: milestone ${name} never landed`, 'Phase 163 marks it on every launch');
      }
      if (scenario === 'reopen') {
        if (r.probes5s !== 0) {
          fail(`${label}: ${String(r.probes5s)} agent version probe(s) in the first 5 s`, `reopening an existing terminal must start none. First at ${String(r.firstProbeAt)} ms: ${r.probeArgv.slice(0, 3).join(' | ')}`);
        }
        if (r.statusHidden2s !== 0) {
          fail(`${label}: ${String(r.statusHidden2s)} git status spawn(s) in hidden project(s) in the first 2 s`, `projects: ${r.hiddenProjects2s.map((p) => basename(p ?? '?')).join(', ')}`);
        }
        if (r.statusActive2s < 1) fail(`${label}: the active project was not statused in the first 2 s`, 'one prompt status for the active project is the promise');
        if (typeof r.milestones['first-attach'] !== 'number') fail(`${label}: first-attach never landed`, 'the existing terminal must still attach on its own');
      } else {
        const shown = r.milestones['window-shown'];
        if (r.firstProbeAt === null) fail(`${label}: no agent probe ran`, 'the boot warm is kept on a profile with nothing to show');
        else if (typeof shown === 'number' && r.firstProbeAt > shown + 500) fail(`${label}: first probe at ${String(r.firstProbeAt)} ms, window shown at ${String(shown)} ms`, 'the warm on a profile with nothing to show starts before the window, as it did at the parent');
        if (scenario === 'tiles' && r.statusActive2s < 1) fail(`${label}: the one project was not statused in the first 2 s`, '');
        if (scenario === 'first' && r.statusActive2s + r.statusHidden2s !== 0) fail(`${label}: git status ran with no project`, '');
      }
    });
  }
}

/**
 * The launches an out directory holds for one scenario and temperature. Only
 * the files named `cold-N.json` and `warm-N.json` count: the raw per pid file
 * the hook writes beside each one shares the prefix and must not be read
 * twice.
 */
function readOutDir(dir, temp) {
  const rows = [];
  if (!existsSync(dir)) return rows;
  for (const f of readdirSync(dir).filter((n) => new RegExp(`^${temp}-\\d+\\.json$`).test(n)).sort()) {
    try {
      rows.push(readLaunch(JSON.parse(readFileSync(join(dir, f), 'utf8')), 'home'));
    } catch {}
  }
  return rows;
}

function compareBaseline(scenario) {
  if (baselineDir === '') return;
  const dir = join(resolve(repoRoot, baselineDir), scenario);
  if (!existsSync(dir)) {
    say(`baseline: no ${dir}, nothing to compare for ${scenario}`);
    return;
  }
  for (const temp of ['cold', 'warm']) {
    const before = readOutDir(dir, temp);
    const after = results[scenario][temp];
    if (before.length === 0 || after.length === 0) continue;
    console.log(`\n== ${scenario} ${temp}: baseline against this run ==`);
    for (const name of ['window-shown', 'sessions-listed', 'first-attach']) {
      const b = before.map((r) => r.milestones[name]).filter((x) => typeof x === 'number');
      const a = after.map((r) => r.milestones[name]).filter((x) => typeof x === 'number');
      console.log(`  ${name.padEnd(16)} before ${fmt(b)}\n  ${''.padEnd(16)} after  ${fmt(a)}`);
      if (b.length > 0 && a.length > 0 && pct(a, 50) > pct(b, 95) && pct(a, 50) > pct(b, 50) * 1.1) {
        fail(`${scenario} ${temp}: ${name} regressed`, `after p50 ${String(pct(a, 50))} ms lies past the baseline p95 ${String(pct(b, 95))} ms and more than ten percent past its p50 ${String(pct(b, 50))} ms`);
      }
    }
    const bp = before.map((r) => r.probes5s);
    const ap = after.map((r) => r.probes5s);
    console.log(`  ${'probes 5s'.padEnd(16)} before ${fmt(bp)}\n  ${''.padEnd(16)} after  ${fmt(ap)}`);
    const bh = before.map((r) => r.statusHidden2s);
    const ah = after.map((r) => r.statusHidden2s);
    console.log(`  ${'hidden status 2s'.padEnd(16)} before ${fmt(bh)}\n  ${''.padEnd(16)} after  ${fmt(ah)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (compareMode) {
  // No launch, no socket, no server. Read both directories and print.
  const afterDir = resolve(repoRoot, process.argv[4]);
  for (const scenario of SCENARIOS) {
    results[scenario] = { cold: readOutDir(join(afterDir, scenario), 'cold'), warm: readOutDir(join(afterDir, scenario), 'warm') };
    if (results[scenario].cold.length + results[scenario].warm.length === 0) continue;
    report(scenario);
    compareBaseline(scenario);
  }
  if (failures.length > 0) {
    console.error(`\n${TAG} ${String(failures.length)} regression finding(s):`);
    for (const { what, detail } of failures) console.error(`  ${what}\n    ${detail}`);
    process.exit(1);
  }
  console.log(`\n${TAG} compared ${baselineDir} against ${afterDir}, no regression.`);
  process.exit(0);
}

const sessionsBefore = operatorSessionCount();
say(`operator sessions before: ${String(sessionsBefore)}`);
const electronsBefore = electronsLeft();
say(`electron pids before (the operator's own, so the end count is honest): ${String(electronsBefore.size)}`);
say(`app root ${appRoot}, scenarios ${scenarios.join(', ')}, ${String(runs)} run(s) per temperature`);

let exitCode = 1;
try {
  for (const scenario of scenarios) {
    await runScenario(scenario);
    report(scenario);
    grade(scenario);
    compareBaseline(scenario);
  }
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ appRoot, runs, holdMs, results, failures }, null, 1));

  const sessionsAfter = operatorSessionCount();
  if (sessionsAfter !== sessionsBefore) {
    fail('the operator session count moved', `${String(sessionsBefore)} before, ${String(sessionsAfter)} after`);
  }
  const electronsAfter = electronsLeft();
  const leaked = [...electronsAfter.keys()].filter((pid) => !electronsBefore.has(pid));
  if (leaked.length > 0) {
    fail(`${String(leaked.length)} Electron process(es) left running`, leaked.map((pid) => electronsAfter.get(pid)).join('; '));
  }
  say(`operator sessions after: ${String(sessionsAfter)}; electron pids after: ${String(electronsAfter.size)}`);

  console.log('');
  if (failures.length > 0) {
    console.error(`${TAG} FAIL, ${String(failures.length)} finding(s):`);
    for (const { what, detail } of failures) {
      console.error(`  ${what}`);
      if (detail !== '') console.error(`    ${detail}`);
    }
  } else {
    console.log(`${TAG} PASS. Raw logs under ${outDir}.`);
    exitCode = 0;
  }
} finally {
  const r = tmux('kill-server');
  say(`scratch server ${socket} ended (exit ${String(r.status)})`);
  process.exit(exitCode);
}
