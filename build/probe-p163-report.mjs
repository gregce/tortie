#!/usr/bin/env node
/**
 * probe-p163-report.mjs. The diagnostics capture on a zero session profile
 * and a twenty five session profile, cold and warm (Phase 163).
 *
 * ## What it proves, and how
 *
 * The audit of 2026-08-26 asked for a capture on a zero session profile and
 * on a twenty five session profile, and for the split between what Tortie
 * itself costs and what the sessions it supervises cost. This probe launches
 * FOUR Electrons in turn, each through build/electron-run.mjs:
 *
 *   1. zero sessions, cold     a fresh profile and a fresh scratch server
 *   2. zero sessions, warm     the same profile and server, launched again
 *   3. twenty five, cold       a second fresh profile and a second server,
 *                              twenty five shell sessions created in app
 *   4. twenty five, warm       the same profile and server again, so the
 *                              twenty five are found alive and reconciled
 *                              rather than created
 *
 * Each launch runs GMUX_SMOKE=p163-capture (src/main/harness/p163-capture.ts),
 * which opens the REAL window, waits for the startup milestones to land the
 * way they land for a person, reads the facts and writes one JSON file. This
 * script grades those files: every milestone present, session rows counted
 * apart from Tortie's rows, every Electron row typed, and nothing left
 * running when it is over.
 *
 * Every session is `shell` running `while true; do date; sleep 1; done`, the
 * same body the T1 smoke uses, so no agent binary is spawned and no token is
 * spent. The numbers it prints are the baseline the audit asked for and they
 * are measured here rather than inherited from it.
 *
 * ## Safety, absolute
 *
 *   - Refuses to run without a harness socket, and refuses `gmux` and
 *     `default` by name. The two scratch servers are `<socket>-z` and
 *     `<socket>-s`, both ended by the helper's finally block.
 *   - Every profile is under GMUX_HARNESS_DIR, and HOME is a scratch directory
 *     under it, so no file under the person's home is opened.
 *   - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *     count taken before and after, which must match.
 *   - It signals nothing itself and exits through process.exit after the last
 *     withElectron returns.
 *
 * Usage:
 *   node build/harness-socket.mjs --fresh gmux-p163-report 'node build/probe-p163-report.mjs'
 *
 * Knobs: P163_OUT_DIR (default out/p163), P163_SESSIONS (default 25),
 * GMUX_P163_HEAP=1 to add a main heap snapshot beside each capture.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p163]';
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
      "--fresh gmux-p163-report 'node build/probe-p163-report.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const wanted = Number((process.env['P163_SESSIONS'] ?? '').trim() || '25');
if (!Number.isInteger(wanted) || wanted < 1) refuse('P163_SESSIONS must be a positive integer.');

const outDir = resolve(repoRoot, (process.env['P163_OUT_DIR'] ?? '').trim() || 'out/p163');
mkdirSync(outDir, { recursive: true });

const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p163-report');
mkdirSync(join(rawRoot, 'home'), { recursive: true });
const root = realpathSync(rawRoot);
const scratchHome = join(root, 'home');

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

/** Whether a tmux server answers on a scratch socket. Read only. */
function scratchServerAlive(name) {
  const out = spawnSync('tmux', ['-L', name, 'list-sessions'], { encoding: 'utf8' });
  return out.status === 0;
}

const sessionsBefore = operatorSessionCount();
say(`operator sessions before: ${String(sessionsBefore)}`);
const electronsBefore = electronsLeft();
say(`electron pids before (the operator's own, so the end count is honest): ${String(electronsBefore.size)}`);

// ---------------------------------------------------------------------------
// The four launches
// ---------------------------------------------------------------------------

// ONE scratch server for all four launches, the harness's own. The zero
// profile runs first and sees an empty server; the session profile then
// creates its sessions on it. The helper's finally block is asked to end the
// server on every launch EXCEPT the session profile's cold one, because the
// warm launch is only warm if it finds those sessions alive and reconciles
// them rather than creating or restoring them. If this script dies between
// the two, build/harness-socket.mjs ends the server anyway when the command
// exits, whatever its exit code, so nothing outlives the run either way.
const PROFILES = [
  { key: 'zero', sessions: 0 },
  { key: `s${String(wanted)}`, sessions: wanted }
];
const RUNS = ['cold', 'warm'];

/** @type {Array<{key:string, run:string, sessions:number, code:number, ms:number, file:string, capture:object|null, stdout:string}>} */
const launches = [];

for (const profile of PROFILES) {
  const userData = join(root, profile.key, 'profile');
  mkdirSync(userData, { recursive: true });
  for (const run of RUNS) {
    const file = join(outDir, `capture-${profile.key}-${run}.json`);
    const label = `p163 ${profile.key} ${run}`;
    const keepServer = profile.sessions > 0 && run === 'cold';
    say(`launch ${label} on socket ${socket}${keepServer ? ' (server kept for the warm launch)' : ''}`);
    const started = Date.now();
    let code = 1;
    let text = '';
    await withElectron(
      {
        label,
        userDataDir: userData,
        cwd: repoRoot,
        tmuxSocket: keepServer ? null : socket,
        env: {
          ...process.env,
          HOME: scratchHome,
          GMUX_TMUX_SOCKET: socket,
          GMUX_SMOKE: 'p163-capture',
          GMUX_P163_ROOT: root,
          GMUX_P163_OUT: file,
          GMUX_P163_SESSIONS: String(profile.sessions),
          GMUX_P163_RUN: run
        }
      },
      async (handle) => {
        code = await new Promise((r) => {
          const ceiling = setTimeout(() => {
            console.error(`${TAG} ${label} passed the 200 s ceiling; the teardown ends the tree`);
            r(1);
          }, 200_000);
          void handle.exited.then((c) => {
            clearTimeout(ceiling);
            setTimeout(() => r(c), 500);
          });
        });
        text = handle.text();
      }
    );
    const ms = Date.now() - started;
    let capture = null;
    if (existsSync(file)) {
      try {
        capture = JSON.parse(readFileSync(file, 'utf8'));
      } catch (err) {
        say(`${label}: capture file does not parse: ${String(err)}`);
      }
    }
    writeFileSync(join(outDir, `capture-${profile.key}-${run}.stdout.txt`), text);
    launches.push({ key: profile.key, run, sessions: profile.sessions, code, ms, file, capture, stdout: text });
    const smokeLines = text.split('\n').filter((l) => l.includes('[gmux-smoke]'));
    say(`${label}: exit ${String(code)} in ${String(ms)} ms, ${String(smokeLines.length)} smoke lines`);
    for (const l of smokeLines.filter((l) => /FAIL|5\/7/.test(l))) say(`  ${l.trim()}`);
  }
  // After the warm launch the helper has ended the server, so this reads
  // false; a true here means a finally block did not run.
  say(`${profile.key}: scratch server alive after both launches: ${String(scratchServerAlive(socket))}`);
}

const sessionsAfter = operatorSessionCount();
say(`operator sessions after: ${String(sessionsAfter)}`);
const electronsAfter = electronsLeft();
const electronsLeaked = [...electronsAfter]
  .filter(([pid]) => !electronsBefore.has(pid))
  .map(([, l]) => l);

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

const failures = [];
const check = (ok, why) => {
  if (!ok) failures.push(why);
};

const REQUIRED_ALWAYS = ['app-ready', 'window-shown', 'sessions-reconciled', 'sessions-listed', 'path-ready'];
const REQUIRED_WITH_SESSIONS = ['first-attach', 'first-bytes'];

function milestoneAt(capture, name) {
  const row = (capture?.milestones ?? []).find((m) => m.name === name);
  return row === undefined ? null : row.atMs;
}

check(
  sessionsAfter === sessionsBefore,
  `the operator's session count moved from ${String(sessionsBefore)} to ${String(sessionsAfter)}`
);
check(electronsLeaked.length === 0, `Electrons left after the run: ${electronsLeaked.join(' | ')}`);

const rows = [];
for (const l of launches) {
  const label = `${l.key} ${l.run}`;
  check(l.code === 0, `${label}: the app exited ${String(l.code)} rather than 0`);
  check(l.capture !== null, `${label}: no capture file was written`);
  const c = l.capture;
  if (c === null) continue;

  for (const name of REQUIRED_ALWAYS) {
    check(milestoneAt(c, name) !== null, `${label}: milestone ${name} never landed`);
  }
  if (l.sessions > 0) {
    for (const name of REQUIRED_WITH_SESSIONS) {
      check(milestoneAt(c, name) !== null, `${label}: milestone ${name} never landed`);
    }
  } else {
    check(
      milestoneAt(c, 'first-attach') === null,
      `${label}: first-attach landed on a zero session profile, so something attached to nothing`
    );
  }
  const ready = milestoneAt(c, 'app-ready');
  const shown = milestoneAt(c, 'window-shown');
  if (ready !== null && shown !== null) {
    check(ready < shown, `${label}: app-ready at ${String(ready)} is not before window-shown at ${String(shown)}`);
  }
  check(
    (c.milestones ?? []).every((m) => Number.isFinite(m.atMs) && m.atMs > 0),
    `${label}: a milestone carries a time that is not a positive number`
  );

  // The split. Session rows are counted apart from Tortie's rows, by role.
  const s = c.ownedSummary;
  check(s !== undefined, `${label}: no owned summary`);
  if (s !== undefined) {
    const counted = s.tortie.processes + s.sessionServer.processes + s.sessions.processes + s.strays.processes;
    check(counted === s.total && s.total === c.owned.length, `${label}: owned rows counted ${String(counted)} across groups against ${String(c.owned.length)} rows`);
    check(s.sessions.panes === l.sessions, `${label}: ${String(s.sessions.panes)} pane rows and ${String(l.sessions)} sessions wanted`);
    check(s.sessions.named === l.sessions, `${label}: ${String(s.sessions.named)} named sessions and ${String(l.sessions)} wanted`);
    check(s.tortie.processes >= 2, `${label}: only ${String(s.tortie.processes)} Tortie rows, so the Electron helpers were not walked`);
    if (l.sessions > 0) {
      check(s.sessionServer.processes === 1, `${label}: ${String(s.sessionServer.processes)} session server rows and wanted exactly 1`);
      check(s.sessions.rssBytes > 0, `${label}: the sessions group holds no memory`);
    }
    check(
      c.owned.every((r) => r.role !== 'session' || (r.sessionName ?? '') !== ''),
      `${label}: a session row carries no session name`
    );
    // A basename carries no slash and no space, except an Electron helper,
    // whose argv[0] is "Tortie Helper (GPU)" and the like.
    check(
      c.owned.every((r) => !r.argv0.includes('/') && (!/\s/.test(r.argv0) || / Helper( \(|$)/.test(r.argv0))),
      `${label}: an owned row carries more than a basename`
    );
  }
  check(c.sessions.harness === l.sessions, `${label}: the manifest holds ${String(c.sessions.harness)} harness sessions and wanted ${String(l.sessions)}`);
  if (l.run === 'warm') {
    check(c.created.count === 0, `${label}: a warm launch created ${String(c.created.count)} sessions, so the cold launch's did not survive`);
  } else {
    check(c.created.count === l.sessions, `${label}: a cold launch created ${String(c.created.count)} and wanted ${String(l.sessions)}`);
  }

  // Every Electron row typed, the main row present under this pid, and the
  // window's pid among the Tab rows.
  const metrics = c.appMetrics ?? [];
  check(metrics.length >= 3, `${label}: only ${String(metrics.length)} Electron rows`);
  check(metrics.every((m) => typeof m.type === 'string' && m.type !== ''), `${label}: an Electron row has no type`);
  check(metrics.some((m) => m.type === 'Browser' && m.pid === c.mainPid), `${label}: no Browser row for pid ${String(c.mainPid)}`);
  const tabPids = new Set(metrics.filter((m) => m.type === 'Tab').map((m) => m.pid));
  check((c.windows ?? []).every((w) => tabPids.has(w.pid)), `${label}: a window's renderer pid is not among the Tab rows`);
  check((c.windows ?? []).some((w) => w.shown), `${label}: no window is visible`);
  check(c.mainMemory.privateKb > 0 && c.mainMemory.heapUsedKb > 0, `${label}: main memory reads zero`);

  // The report itself, cross checked against this harness's own reads. Two
  // readers of the same marks and the same process table must agree.
  const rep = c.report;
  check(rep !== null && typeof rep === 'object', `${label}: the diagnostics report is absent`);
  if (rep !== null && typeof rep === 'object') {
    const mine = Object.fromEntries((c.milestones ?? []).map((m) => [m.name, m.atMs]));
    const theirs = Object.fromEntries((rep.milestones ?? []).map((m) => [m.name, m.atMs]));
    for (const name of Object.keys(mine)) {
      check(theirs[name] === mine[name], `${label}: the report reads milestone ${name} at ${String(theirs[name])} and the harness at ${String(mine[name])}`);
    }
    check((rep.electronPids ?? []).length === metrics.length, `${label}: the report lists ${String((rep.electronPids ?? []).length)} Electron pids and the harness ${String(metrics.length)}`);
    check((rep.electronPids ?? []).every((p) => p.named), `${label}: an Electron pid is unnamed in the report: ${JSON.stringify((rep.electronPids ?? []).filter((p) => !p.named))}`);
    check((rep.sessions ?? []).length === l.sessions, `${label}: the report holds ${String((rep.sessions ?? []).length)} session rows and wanted ${String(l.sessions)}`);
    check(!(rep.sessions ?? []).some((s) => s.name === 'gmux-control'), `${label}: the report lists the control session as a session`);
    check((rep.sessions ?? []).every((s) => s.agent === 'shell'), `${label}: a session row does not say shell`);
    check((rep.shellTotal?.processCount ?? 0) >= 4, `${label}: the shell total counts ${String(rep.shellTotal?.processCount)} processes`);
    // Two folds of one process table, the harness's by role and the report's
    // by kind, must count the strays alike, and the Tortie total must be the
    // Tortie rows without them.
    check(
      (rep.leftoverTotal?.processCount ?? -1) === (s?.strays.processes ?? -2),
      `${label}: the report counts ${String(rep.leftoverTotal?.processCount)} left over and the walk ${String(s?.strays.processes)}`
    );
    check(
      (rep.shellTotal?.processCount ?? -1) === (rep.shell ?? []).filter((p) => p.kind !== 'orphan').length,
      `${label}: the shell total ${String(rep.shellTotal?.processCount)} is not the count of the non stray shell rows`
    );
    check(typeof rep.text === 'string' && rep.text.length > 0, `${label}: the report text is empty`);
    if (typeof rep.text === 'string') {
      check(!rep.text.includes('while true'), `${label}: the report text carries a session's command line`);
      check(!rep.text.includes(scratchHome), `${label}: the report text carries the scratch home path unredacted`);
      check(!/\/Users\/[a-z]/.test(rep.text), `${label}: the report text carries a home path`);
    }
    if (l.sessions > 0) {
      check((rep.sessionsTotal?.processCount ?? 0) === (s?.sessions.processes ?? -1), `${label}: the report's session process count ${String(rep.sessionsTotal?.processCount)} differs from the walk's ${String(s?.sessions.processes)}`);
    }
  }

  const rendererWs = metrics.filter((m) => m.type === 'Tab').reduce((a, m) => a + m.workingSetKb, 0);
  const gpu = metrics.find((m) => m.type === 'GPU');
  rows.push({
    profile: l.key,
    run: l.run,
    sessions: l.sessions,
    launchMs: l.ms,
    createMs: c.created.ms,
    created: c.created.count,
    attachedByRenderer: c.attachedByRenderer,
    milestones: Object.fromEntries((c.milestones ?? []).map((m) => [m.name, m.atMs])),
    mainPrivateKb: c.mainMemory.privateKb,
    mainHeapUsedKb: c.mainMemory.heapUsedKb,
    rendererWorkingSetKb: rendererWs,
    gpuWorkingSetKb: gpu?.workingSetKb ?? null,
    electronRows: metrics.length,
    tortie: s ?? null,
    report: c.report === null ? 'absent' : 'present',
    heapSnapshot: c.heapSnapshot
  });
}

// The warm launch must not be slower to first attach than cold by an order of
// magnitude; that is a sanity bound, not a budget. The budget is Phase 167's.
const cold25 = launches.find((l) => l.sessions === wanted && l.run === 'cold')?.capture;
const warm25 = launches.find((l) => l.sessions === wanted && l.run === 'warm')?.capture;
if (cold25 !== null && cold25 !== undefined && warm25 !== null && warm25 !== undefined) {
  const a = milestoneAt(cold25, 'sessions-reconciled');
  const b = milestoneAt(warm25, 'sessions-reconciled');
  if (a !== null && b !== null) {
    check(b < a * 10 + 5_000, `warm sessions-reconciled at ${String(b)} ms against cold ${String(a)} ms`);
  }
}

const report = {
  at: new Date().toISOString(),
  commit:
    spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim() || null,
  wanted,
  root,
  sessionsBefore,
  sessionsAfter,
  electronsLeft: electronsLeaked,
  rows,
  captures: launches.map((l) => ({ key: l.key, run: l.run, code: l.code, ms: l.ms, file: l.file })),
  failures
};
const reportPath = join(outDir, 'p163-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

say('');
say('profile  run   n  app-ready window-shown reconciled listed path-ready first-attach first-bytes | main priv KB | renderer WS KB | tortie rows/RSS MB | sessions rows/RSS MB | strays | created in ms');
for (const r of rows) {
  const m = r.milestones;
  const f = (v) => (v === undefined ? '-' : String(v));
  const mb = (b) => (b / 1048576).toFixed(1);
  const attach = r.attachedByRenderer ? 'r' : 'h';
  say(
    `${r.profile.padEnd(7)} ${r.run.padEnd(5)} ${String(r.sessions).padStart(2)}  ${f(m['app-ready']).padStart(9)} ${f(m['window-shown']).padStart(12)} ${f(m['sessions-reconciled']).padStart(10)} ${f(m['sessions-listed']).padStart(6)} ${f(m['path-ready']).padStart(10)} ${(m['first-attach'] === undefined ? '-' : `${String(m['first-attach'])}${attach}`).padStart(12)} ${f(m['first-bytes']).padStart(11)} | ${String(r.mainPrivateKb).padStart(11)} | ${String(r.rendererWorkingSetKb).padStart(14)} | ${r.tortie === null ? '-' : `${String(r.tortie.tortie.processes)}/${mb(r.tortie.tortie.rssBytes)}`.padStart(18)} | ${r.tortie === null ? '-' : `${String(r.tortie.sessions.processes)}/${mb(r.tortie.sessions.rssBytes)}`.padStart(20)} | ${String(r.tortie === null ? '-' : r.tortie.strays.processes).padStart(6)} | ${String(r.created)} in ${String(r.createMs)}`
  );
}
say('first-attach suffix: r the renderer attached on its own, h the harness attached the first session');
say(`report: ${reportPath}`);
say(`electrons left: ${String(electronsLeaked.length)}`);

if (failures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const f of failures) console.error(`${TAG}   - ${f}`);
  process.exit(1);
}
say('PASS');
process.exit(0);
