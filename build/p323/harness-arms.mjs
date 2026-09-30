#!/usr/bin/env node
/**
 * probe:p323:harness — build/harness-socket.mjs's teardown and its reap of a
 * dead run, at the parent and at HEAD (Phase 323, build/p323/SPEC.md §8.2).
 *
 * WHAT IT IS FOR. Every harness run in package.json goes through
 * `build/harness-socket.mjs`, and until Phase 323 its only backstop was
 * `kill-server`, which hangs up every pane. A created Gemini session survives
 * the hang-up, both of its processes, and so does anything in a pane's own
 * group that ignores it; they re-parent to launchd and run for good. Phase 323
 * gave the wrapper the product's own tree read and ending, through
 * `build/session-tree-cli.mts`. This is the proof, run rather than read, with
 * NO Electron: a scratch tmux server made the way a wrapped harness makes one,
 * holding one created Gemini session and one planted process that ignores the
 * hang-up, then ended the two ways a wrapped run ends.
 *
 *   j2  The planted command runs under `node build/harness-socket.mjs
 *       gmux-p323h '…'` and exits with its sessions still alive, so the
 *       wrapper's own teardown ends the server. At the parent, both Gemini
 *       processes and the planted sleep survive the teardown. At HEAD, 0
 *       survive and the wrapper prints its one line.
 *   j3  The same, but the wrapper's node process and its shell are sent
 *       SIGKILL by pid in the middle of the command, so no teardown runs and
 *       the server is left behind with its marker. A second
 *       `node build/harness-socket.mjs gmux-p323h 'true'` must reap it. At the
 *       parent the survivors remain. At HEAD they are 0.
 *
 * THE INDEPENDENT CENSUS. Survivors are counted by working directory,
 * `lsof -a -d cwd +D <the arm's folder>`, never by parent pid and never through
 * the module under test. Every planted session's folder is under the arm's own
 * folder, so a process there is one this arm started. The tree this script
 * read itself before the ending is compared row by row with that count.
 *
 * WHAT IT REFUSES, before anything starts.
 *   - Qwen, Antigravity (`agy`) and Grok are never started, not even `--help`.
 *     The one agent this script names is `gemini`, checked against that list.
 *   - Gemini runs ONLY under a scratch HOME inside this run's folder (his
 *     ruling R3 of 2026-09-29), with Phase 314's R8 settings
 *     (`general.enableAutoUpdate` and `general.enableAutoUpdateNotification`
 *     false, `privacy.usageStatisticsEnabled` false,
 *     `security.folderTrust.enabled` true) and an `npm` first on PATH that
 *     refuses and logs. Its install's version, mtimes and sizes are read from
 *     FILES before the first arm and after every arm, and a move stops the run
 *     (exit 2). Any install but the 0.54.0 of 2026-08-06 14:46:28 the census
 *     measured is refused before Gemini starts, because R8's key paths were
 *     read from that version's settings schema. Nothing is ever typed into its
 *     pane, so no turn is taken.
 *   - Every tmux call names its own scratch socket, `gmux-p323h-…`, composed
 *     by the wrapper under test; `-L gmux` and the default server are never
 *     named. A socket name that does not match is refused before it is used.
 *   - No `pkill`, `killall`, `pgrep`, pattern or negative pid. Every process
 *     this script ends is ended by pid, SIGTERM and then SIGKILL, and only
 *     while a re-read shows the start time, command line and group it
 *     recorded. That ending is this instrument's own, deliberately not the
 *     module under test.
 *   - `P323_PARENT_CHECKOUT` must hold a `build/harness-socket.mjs` and must
 *     not be this checkout, or it exits 2 with one sentence. The two builds
 *     run one after the other, never at once, each on its own socket.
 *
 * THE `finally`, and SIGINT, SIGTERM and SIGHUP reach the same clean-up. It
 * ends the wrapper children it started, sends `kill-server` to every scratch
 * socket it learned by its exact name, ends every process it recorded or that
 * the census found under the run folder (identity re-read first), unlinks the
 * socket files and markers by exact name, removes each wrapper's run directory
 * when it is empty, and removes the run folder unless `P323_KEEP=1`. SIGKILL
 * cannot be answered by anything; the plant stops waiting when this script's
 * pid is gone, so the wrapper then runs its own teardown.
 *
 * ENVIRONMENT (all optional except the parent):
 *   P323_PARENT_CHECKOUT       a checkout of the parent; needs build/harness-socket.mjs
 *   P323_HARNESS_BUILDS        'parent,head' (default), 'head' for a dry run
 *   P323_HARNESS_ARMS          'j2,j3' (default)
 *   P323_HARNESS_PLANTED_ONLY  '1' plants the sleep alone, no Gemini
 *   P323_KEEP                  '1' keeps the run folder and its results.json
 *
 * EXIT. 0 when every HEAD arm reads 0 survivors both ways and the wrapper says
 * what it ended; 1 when a HEAD arm does not; 2 when the run is unreadable or
 * refused (a parent that left nothing is unreadable, because HEAD's zero would
 * then prove nothing).
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { psRows } from './ps-read.mjs';

const HEAD = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONF = join(HEAD, 'resources', 'gmux-tmux.conf');
const BASE = 'gmux-p323h';
const SOCKET_SHAPE = /^gmux-p323h-[A-Za-z0-9._-]+-\d+$/;
const NEVER_STARTED = new Set(['qwen', 'agy', 'antigravity', 'grok']);
const AGENT = 'gemini';
const KEEP = process.env['P323_KEEP'] === '1';
const PLANTED_ONLY = process.env['P323_HARNESS_PLANTED_ONLY'] === '1';
const BUILDS = (process.env['P323_HARNESS_BUILDS'] ?? 'parent,head')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ARMS = (process.env['P323_HARNESS_ARMS'] ?? 'j2,j3')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Phase 314's R8, the key paths as the installed bundle's schema names them. */
const GEMINI_R8 = {
  general: { enableAutoUpdate: false, enableAutoUpdateNotification: false },
  privacy: { usageStatisticsEnabled: false },
  security: { folderTrust: { enabled: true } }
};

/** The update guards §3 of the SPEC used, harmless to every other program. */
const GUARDS = { NO_UPDATE_NOTIFIER: '1', DISABLE_AUTOUPDATER: '1' };

/** What the census measured on 2026-09-29, printed beside what this run reads. */
const GEMINI_MEASURED = { version: '0.54.0', mtime: '2026-08-06 14:46:28' };

class Unreadable extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => console.log(`[p323:harness] ${line}`);

// ---------------------------------------------------------------------------
// This instrument's own process reads. Never the module under test.
// ---------------------------------------------------------------------------

/** The whole table, C locale; null when ps did not answer (./ps-read.mjs, shared with the probe). */
const psAll = () => psRows(null);
/** The named pids only; an empty map when none runs, null when ps did not answer. */
const psPids = (pids) => psRows(pids);

const nameOf = (command) => {
  const a0 = command.split(' ')[0] ?? '';
  return a0.slice(a0.lastIndexOf('/') + 1);
};

/** The entries whose pid is still the process recorded: group, start and command equal. */
function stillSame(entries) {
  const now = psPids([...new Set(entries.map((e) => e.pid))]);
  if (now === null) throw new Unreadable('ps did not answer an identity re-read');
  return entries.filter((e) => {
    const n = now.get(e.pid);
    return n !== undefined && n.pgid === e.pgid && n.lstart === e.lstart && n.command === e.command;
  });
}

/** Root plus descendants, cycle-safe and capped, each marked by the hang-up's groups. */
function treeOf(table, rootPid) {
  const root = table.get(rootPid);
  if (root === undefined) return [];
  const kids = new Map();
  for (const r of table.values()) {
    if (!kids.has(r.ppid)) kids.set(r.ppid, []);
    kids.get(r.ppid).push(r.pid);
  }
  const out = [];
  const seen = new Set();
  const stack = [rootPid];
  while (stack.length > 0 && out.length < 4_096) {
    const pid = stack.pop();
    if (seen.has(pid)) continue;
    seen.add(pid);
    const row = table.get(pid);
    if (row === undefined) continue;
    // The pane process's OWN group, the rule since Phase 323's second fix
    // round (the terminal's foreground group is no longer selected). This is
    // the instrument's own reading of the rule, never the module's.
    out.push({
      ...row,
      inHangupGroup: row.pgid === root.pgid
    });
    for (const k of kids.get(pid) ?? []) stack.push(k);
  }
  return out;
}

/** Every pid whose working directory is under `dir`, by lsof. The independent census. */
function censusByCwd(dir) {
  const r = spawnSync('/usr/sbin/lsof', ['-a', '-d', 'cwd', '+D', dir, '-F', 'p'], {
    encoding: 'utf8',
    timeout: 30_000
  });
  // lsof exits 1 when it found nothing, which is the answer we hope for.
  if (r.error !== undefined || (r.status !== 0 && r.status !== 1)) {
    throw new Unreadable(`lsof did not answer for ${dir}`);
  }
  const pids = [];
  for (const line of (r.stdout ?? '').split('\n')) {
    if (line.startsWith('p')) pids.push(Number(line.slice(1)));
  }
  return pids.filter((p) => Number.isInteger(p) && p > 1 && p !== process.pid);
}

/**
 * End these processes, one pid at a time, SIGTERM then SIGKILL, each only while
 * a re-read shows the group, start time and command line recorded. Never a
 * group, a pattern or a negative pid. Answers how many were signalled.
 */
async function endByPid(given) {
  // One entry per process, however many lists named it.
  const entries = [...new Map(given.map((e) => [`${String(e.pid)} ${e.lstart}`, e])).values()];
  for (const e of entries) {
    if (!Number.isInteger(e.pid) || e.pid <= 1 || e.pid === process.pid) {
      throw new Error(`refusing to signal pid ${String(e.pid)}`);
    }
  }
  if (entries.length === 0) return 0;
  let alive = stillSame(entries);
  const signalled = alive.length;
  for (const e of alive) {
    try {
      process.kill(e.pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
  const deadline = Date.now() + 3_000;
  while (alive.length > 0 && Date.now() < deadline) {
    await sleep(100);
    alive = stillSame(alive);
  }
  for (const e of stillSame(alive)) {
    try {
      process.kill(e.pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  return signalled;
}

// ---------------------------------------------------------------------------
// Gemini's install, read from files. Nothing here runs Gemini.
// ---------------------------------------------------------------------------

/** A file's or folder's mtime to the second, local time, the census's spelling. */
function mtimeOf(p) {
  const d = statSync(p).mtime;
  const pad = (n) => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * The install's fingerprint: where `gemini` resolves, its version, and the
 * mtime and size of its package.json and entry bundle, plus the mtimes of the
 * package folder and the folder holding it, because an `npm install -g`
 * replaces the package folder and so moves its parent's mtime even when it
 * writes the same bytes.
 */
function geminiInstall() {
  const w = spawnSync('/bin/sh', ['-c', `command -v ${AGENT}`], { encoding: 'utf8' });
  const onPath = (w.stdout ?? '').trim();
  if (onPath === '') return null;
  const real = realpathSync(onPath);
  const root = dirname(dirname(real));
  const pkg = join(root, 'package.json');
  return {
    onPath,
    real,
    version: JSON.parse(readFileSync(pkg, 'utf8')).version,
    pkg: `${mtimeOf(pkg)} ${String(statSync(pkg).size)}`,
    bundle: `${mtimeOf(real)} ${String(statSync(real).size)}`,
    folder: mtimeOf(root),
    parent: mtimeOf(dirname(root))
  };
}

/**
 * R8's key paths were read from 0.54.0's own settings schema (build/p314/SPEC.md
 * R8), so a different install could name them differently and run its
 * updater anyway. Anything but the install the census measured is refused
 * before Gemini starts.
 */
function geminiPinProblem(install) {
  const pkgTime = install.pkg.split(' ').slice(0, 2).join(' ');
  const bundleTime = install.bundle.split(' ').slice(0, 2).join(' ');
  if (
    install.version === GEMINI_MEASURED.version &&
    pkgTime === GEMINI_MEASURED.mtime &&
    bundleTime === GEMINI_MEASURED.mtime
  ) {
    return null;
  }
  return (
    `Gemini here is ${install.version} (package.json ${pkgTime}, bundle ${bundleTime}), not the ` +
    `${GEMINI_MEASURED.version} of ${GEMINI_MEASURED.mtime} whose settings schema R8's key paths ` +
    'were read from; re-read them before starting it, or set P323_HARNESS_PLANTED_ONLY=1.'
  );
}

// ---------------------------------------------------------------------------
// The run folder, the scratch HOME and the plant.
// ---------------------------------------------------------------------------

function scratchEnv(home, bin) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(?:CLAUDECODE|CLAUDE_)/.test(k)) continue;
    if (k === 'ZDOTDIR' || k === 'TMUX' || k === 'TMUX_PANE') continue;
    if (k.startsWith('npm_')) continue;
    env[k] = v;
  }
  return { ...env, ...GUARDS, HOME: home, PATH: `${bin}:${process.env['PATH'] ?? ''}` };
}

const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

/**
 * The shell line the wrapper runs. It plants on the wrapper's own scratch
 * socket, says so, and waits for this script's word to exit (j2) or for the
 * SIGKILL (j3). The sessions' folders are under the arm's folder, which is
 * what the census reads.
 *
 * The wait also ends when this script is gone (`kill -0` is a liveness probe
 * by pid and signals nothing), so a run of this script that is itself killed
 * with SIGKILL, which no `finally` and no handler can answer, does not leave
 * the plant waiting for ever: the wrapper then finishes its command and runs
 * its own teardown, which is the thing under test.
 */
function writePlant(armDir, home, withGemini) {
  const lines = [
    '#!/bin/sh',
    '# Phase 323 harness arm plant, written by build/p323/harness-arms.mjs.',
    `ARM=${shq(armDir)}`,
    `OWNER=${String(process.pid)}`,
    'printf \'%s\\n\' "$GMUX_TMUX_SOCKET" > "$ARM/socket"',
    'printf \'%s\\n\' "$$" > "$ARM/shell"',
    `T() { tmux -L "$GMUX_TMUX_SOCKET" -f ${shq(CONF)} "$@"; }`,
    `T new-session -d -s p323h-hup -x 200 -y 50 -c "$ARM/work/hup" -- /bin/sh -c "trap '' HUP; exec /bin/sleep 900" || exit 3`
  ];
  if (withGemini) {
    lines.push(
      `T new-session -d -s p323h-gemini -x 200 -y 50 -c "$ARM/work/gemini" -e HOME=${shq(home)} -- ${AGENT} || exit 3`
    );
  }
  lines.push(
    ': > "$ARM/planted"',
    'while [ ! -e "$ARM/go" ] && kill -0 "$OWNER" 2>/dev/null; do /bin/sleep 0.2; done',
    'exit 0',
    ''
  );
  const path = join(armDir, 'plant.sh');
  writeFileSync(path, lines.join('\n'), { mode: 0o755 });
  return path;
}

function socketDir() {
  return join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid())}`);
}

function tmuxOn(socket, args) {
  if (!SOCKET_SHAPE.test(socket)) throw new Error(`refusing tmux on -L ${socket}`);
  // `-u`: a tab in a format reaches a non-UTF-8 client as `_` (tmux 3.6a and 3.7b).
  return spawnSync('tmux', ['-u', '-L', socket, ...args], { encoding: 'utf8', timeout: 10_000 });
}

async function waitForFile(path, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (existsSync(path)) return true;
    await sleep(100);
  }
  return false;
}

/**
 * Wait until the planted trees stop changing for 3 s (and Gemini shows its two
 * processes), then answer them. This script's own read, from tmux's own pane
 * list: a pane counts only while it is alive and its process is the server's
 * own child.
 */
async function settle(socket, withGemini) {
  const t0 = Date.now();
  let prevKey = '';
  let since = Date.now();
  while (Date.now() - t0 < 45_000) {
    const panes = tmuxOn(socket, ['list-panes', '-a', '-F', '#{pane_pid}\t#{pane_dead}\t#{pid}\t#{session_name}']);
    const table = psAll();
    if (panes.status === 0 && table !== null) {
      const trees = [];
      for (const line of (panes.stdout ?? '').split('\n')) {
        const [pid, dead, server, session] = line.split('\t');
        if (dead !== '0') continue;
        const row = table.get(Number(pid));
        if (row === undefined || row.ppid !== Number(server)) continue;
        trees.push({ session, entries: treeOf(table, Number(pid)) });
      }
      const key = trees
        .map((t) => `${t.session}:${t.entries.map((e) => e.pid).sort().join(',')}`)
        .sort()
        .join('|');
      if (key !== prevKey) {
        prevKey = key;
        since = Date.now();
      }
      const gem = trees.find((t) => t.session === 'p323h-gemini');
      const ready =
        trees.some((t) => t.session === 'p323h-hup') &&
        (!withGemini || (gem !== undefined && gem.entries.length >= 2));
      if (ready && Date.now() - since >= 3_000) return { trees, settledMs: Date.now() - t0 };
    }
    await sleep(300);
  }
  throw new Unreadable(`the planted sessions on -L ${socket} never settled in 45 s`);
}

const ENDED_LINE =
  /\[harness-socket\] ended (\d+) process\(es\) the hang-up left running on -L (\S+) \(([^)]*)\)/g;

// ---------------------------------------------------------------------------
// The state the finally reads.
// ---------------------------------------------------------------------------

/** Every wrapper child this script started. */
const started = [];
/** Each wrapper's identity as `ps` read it just after the spawn, by pid. */
const wrapperIds = new Map();
/** Every scratch socket this script learned. */
const sockets = new Set();
/** Every process identity this script recorded, keyed by pid and start. */
const recorded = new Map();
/** Every run directory a wrapper this script ran said it made (`profile …`). */
const profiles = new Set();
let runDir = null;
/** Gemini's install as read before the first arm; the clean-up reads it again. */
let geminiBefore = null;
/** Set once the clean-up has begun, so no arm starts another wrapper. */
let stopping = false;

function remember(entries) {
  for (const e of entries) recorded.set(`${String(e.pid)} ${e.lstart}`, e);
}

const PROFILE_LINE = /\[harness-socket\] socket (\S+), profile (\S+)/g;

/** Learn the socket and run directory each wrapper printed, for the clean-up. */
function learnFrom(text) {
  for (const m of text.matchAll(PROFILE_LINE)) {
    if (SOCKET_SHAPE.test(m[1])) profiles.add(m[2]);
  }
}

/** Wait for a child to exit, bounded. Answers whether it did. */
function exited(child, ms) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((res) => {
    const t = setTimeout(() => res(false), ms);
    child.once('exit', () => {
      clearTimeout(t);
      res(true);
    });
  });
}

// ---------------------------------------------------------------------------
// One arm at one build.
// ---------------------------------------------------------------------------

async function runArm(build, checkout, arm, ctx) {
  const armDir = join(ctx.run, `${build}-${arm}`);
  mkdirSync(join(armDir, 'work', 'hup'), { recursive: true });
  mkdirSync(join(armDir, 'work', 'gemini'), { recursive: true });
  const plantPath = writePlant(armDir, ctx.home, ctx.withGemini);
  const plantLine = `/bin/sh ${shq(plantPath)}`;
  const hs = join(checkout, 'build', 'harness-socket.mjs');

  if (stopping) throw new Unreadable('interrupted');
  const wrapper = spawn(process.execPath, [hs, BASE, plantLine], {
    cwd: checkout,
    env: ctx.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  started.push(wrapper);
  // Its identity, read now, so the finally can re-read it before any signal.
  const self = psPids([wrapper.pid])?.get(wrapper.pid);
  if (self !== undefined) wrapperIds.set(wrapper.pid, self);
  let wrapperOut = '';
  wrapper.stdout.on('data', (b) => {
    wrapperOut += String(b);
  });
  wrapper.stderr.on('data', (b) => {
    wrapperOut += String(b);
  });

  if (!(await waitForFile(join(armDir, 'planted'), 30_000))) {
    throw new Unreadable(`${build} ${arm}: the plant never said it had planted:\n${wrapperOut}`);
  }
  const socket = readFileSync(join(armDir, 'socket'), 'utf8').trim();
  if (!SOCKET_SHAPE.test(socket)) throw new Unreadable(`${build} ${arm}: socket ${socket} is not ours`);
  sockets.add(socket);
  learnFrom(wrapperOut);
  // The plant's own shell, so the clean-up can end it by pid if this run is
  // interrupted while it waits.
  const plantPid = Number(readFileSync(join(armDir, 'shell'), 'utf8').trim());
  const plantRow = Number.isInteger(plantPid) ? psPids([plantPid])?.get(plantPid) : undefined;
  if (plantRow !== undefined) remember([plantRow]);

  const { trees, settledMs } = await settle(socket, ctx.withGemini);
  const all = trees.flatMap((t) => t.entries.map((e) => ({ ...e, session: t.session })));
  remember(all);

  const t0 = Date.now();
  let reapOut = '';
  if (arm === 'j2') {
    writeFileSync(join(armDir, 'go'), '');
    // Longer than the runner's own bound on an ending (120 s,
    // build/harness-socket.mjs END_RUNNER_TIMEOUT_MS), because the graces are
    // 10 s and 60 s since Phase 323's second fix round.
    if (!(await exited(wrapper, 130_000))) {
      throw new Unreadable(`${build} j2: the wrapper did not finish its teardown in 130 s`);
    }
  } else {
    // j3: the wrapper's node process and its shell, SIGKILL by pid, mid-command.
    const table = psAll();
    if (table === null) throw new Unreadable('ps did not answer');
    const shellPid = Number(readFileSync(join(armDir, 'shell'), 'utf8').trim());
    const chain = [...table.values()].filter(
      (r) => r.ppid === wrapper.pid || r.pid === shellPid
    );
    remember(chain);
    wrapper.kill('SIGKILL');
    if (!(await exited(wrapper, 10_000))) throw new Unreadable('the wrapper outlived SIGKILL');
    for (const e of stillSame(chain)) {
      try {
        process.kill(e.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
    await sleep(300);
    if (!existsSync(join(socketDir(), `${socket}.run`))) {
      throw new Unreadable(`${build} j3: the dead run left no marker, so nothing can reap it`);
    }
    const reap = spawnSync(process.execPath, [hs, BASE, 'true'], {
      cwd: checkout,
      env: ctx.env,
      encoding: 'utf8',
      timeout: 130_000
    });
    reapOut = `${reap.stdout ?? ''}${reap.stderr ?? ''}`;
    learnFrom(reapOut);
    if (reap.status !== 0) throw new Unreadable(`${build} j3: the reaping run exited ${String(reap.status)}:\n${reapOut}`);
  }
  const endMs = Date.now() - t0;

  // The census: stable over two reads a second apart, at most 8 s.
  let byCwd = censusByCwd(armDir);
  for (let i = 0; i < 8; i += 1) {
    await sleep(1_000);
    const again = censusByCwd(armDir);
    const same = again.length === byCwd.length && again.every((p) => byCwd.includes(p));
    byCwd = again;
    if (same) break;
  }
  const byTree = stillSame(all);
  const cwdRows = psPids(byCwd) ?? new Map();
  for (const row of cwdRows.values()) remember([row]);

  // The wrapper's one line for THIS socket; a reap can print lines for other
  // dead runs too.
  const text = arm === 'j2' ? wrapperOut : reapOut;
  const said = [...text.matchAll(ENDED_LINE)].find((m) => m[2] === socket);
  const endedLine = said === undefined ? null : { n: Number(said[1]), when: said[3] };

  // The instrument's own ending, so the next arm starts clean.
  const endedByProbe = await endByPid([...byTree, ...cwdRows.values()]);
  const serverLeft = tmuxOn(socket, ['list-sessions']).status === 0;

  const row = {
    build,
    arm,
    socket,
    settledMs,
    endMs,
    tree: all.map((e) => ({
      session: e.session,
      pid: e.pid,
      name: nameOf(e.command),
      stat: e.stat,
      inHangupGroup: e.inHangupGroup
    })),
    survivorsByTree: byTree.map((e) => `${nameOf(e.command)}:${String(e.pid)}`),
    survivorsByCwd: [...cwdRows.values()].map((e) => `${nameOf(e.command)}:${String(e.pid)}`),
    agree:
      byTree.length === cwdRows.size && byTree.every((e) => cwdRows.has(e.pid)),
    wrapperSaid: endedLine,
    serverLeft,
    endedByProbe
  };
  return row;
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

function judge(rows) {
  const problems = [];
  const unreadable = [];
  const notes = [];
  for (const r of rows) {
    if (!r.agree) {
      unreadable.push(`${r.build} ${r.arm}: the tree says ${r.survivorsByTree.join(' ') || 'none'} and the cwd census says ${r.survivorsByCwd.join(' ') || 'none'}`);
    }
    if (r.serverLeft) problems.push(`${r.build} ${r.arm}: the scratch server on -L ${r.socket} is still running`);
    if (r.build !== 'head') continue;
    if (r.survivorsByTree.length > 0 || r.survivorsByCwd.length > 0) {
      problems.push(`head ${r.arm}: ${String(r.survivorsByCwd.length)} survivor(s) (${r.survivorsByCwd.join(' ')})`);
    }
    if (r.wrapperSaid === null || r.wrapperSaid.n < 1) {
      problems.push(`head ${r.arm}: the wrapper did not print its one line naming what it ended`);
    }
    const parent = rows.find((p) => p.build === 'parent' && p.arm === r.arm);
    if (parent !== undefined && parent.survivorsByCwd.length === 0) {
      unreadable.push(`parent ${r.arm}: the parent left nothing running, so HEAD's zero proves nothing`);
    }
    // A cross-check, printed rather than judged: the module's report counts
    // what it signalled, and a process sent both signals may count twice.
    if (parent !== undefined && r.wrapperSaid !== null) {
      notes.push(
        `${r.arm}: the HEAD wrapper ended ${String(r.wrapperSaid.n)}; the parent left ${String(parent.survivorsByCwd.length)} running`
      );
    }
  }
  return { problems, unreadable, notes };
}

async function main() {
  // Refusals, before anything starts.
  if (NEVER_STARTED.has(AGENT)) throw new Error('refused');
  for (const b of BUILDS) {
    if (b !== 'parent' && b !== 'head') throw new Unreadable(`unknown build ${b}; use parent,head`);
  }
  for (const a of ARMS) {
    if (a !== 'j2' && a !== 'j3') throw new Unreadable(`unknown arm ${a}; use j2,j3`);
  }
  const checkouts = { head: HEAD };
  if (BUILDS.includes('parent')) {
    const parent = process.env['P323_PARENT_CHECKOUT'] ?? '';
    if (parent === '' || !existsSync(join(parent, 'build', 'harness-socket.mjs'))) {
      throw new Unreadable(
        'P323_PARENT_CHECKOUT must name a checkout of the parent holding build/harness-socket.mjs (or set P323_HARNESS_BUILDS=head for a dry run).'
      );
    }
    if (realpathSync(parent) === realpathSync(HEAD)) {
      throw new Unreadable('P323_PARENT_CHECKOUT is this checkout, so there is no side by side.');
    }
    checkouts.parent = parent;
  }
  const lsofCheck = spawnSync('/usr/sbin/lsof', ['-v'], { encoding: 'utf8' });
  if (lsofCheck.error !== undefined) throw new Unreadable('/usr/sbin/lsof is not usable here');

  const base = realpathSync(process.env['TMPDIR'] ?? tmpdir());
  runDir = join(base, `p323h-${String(process.pid)}`);
  mkdirSync(runDir, { recursive: true });
  const run = realpathSync(runDir);
  const home = join(run, 'home');
  const bin = join(run, 'bin');
  mkdirSync(join(home, '.gemini'), { recursive: true });
  mkdirSync(bin, { recursive: true });
  if (home === homedir() || !home.startsWith(run)) throw new Error('the scratch HOME is not scratch');
  writeFileSync(join(home, '.gemini', 'settings.json'), `${JSON.stringify(GEMINI_R8, null, 2)}\n`);
  writeFileSync(
    join(bin, 'npm'),
    `#!/bin/sh\necho "npm $*" >> ${shq(join(run, 'npm-calls.log'))}\necho "probe:p323:harness refuses npm" >&2\nexit 1\n`,
    { mode: 0o755 }
  );
  const env = scratchEnv(home, bin);

  let withGemini = !PLANTED_ONLY;
  let before = null;
  if (withGemini) {
    before = geminiInstall();
    if (before === null) {
      say('gemini is not installed here; its row reads "not installed" and the planted row runs alone');
      withGemini = false;
    } else {
      const pin = geminiPinProblem(before);
      if (pin !== null) throw new Unreadable(pin);
      geminiBefore = before;
      say(
        `gemini ${before.version}, package.json ${before.pkg}, bundle ${before.bundle}, ` +
          `folder ${before.folder}, its parent ${before.parent} ` +
          `(the census measured ${GEMINI_MEASURED.version}, ${GEMINI_MEASURED.mtime})`
      );
    }
  }
  say(`run folder ${run}; builds ${BUILDS.join(',')}; arms ${ARMS.join(',')}; gemini ${withGemini ? 'yes' : 'no'}`);

  const ctx = { run, home, env, withGemini };
  const rows = [];
  for (const build of BUILDS) {
    for (const arm of ARMS) {
      const row = await runArm(build, checkouts[build], arm, ctx);
      rows.push(row);
      console.log(JSON.stringify(row));
      if (before !== null) {
        const after = geminiInstall();
        if (JSON.stringify(after) !== JSON.stringify(before)) {
          throw new Unreadable(
            `STOP: Gemini's install moved during ${build} ${arm}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`
          );
        }
      }
      if (existsSync(join(run, 'npm-calls.log'))) {
        throw new Unreadable(`STOP: something called npm during ${build} ${arm}; see npm-calls.log`);
      }
    }
  }

  say('build  arm  settled  end ms  tree (name/group)                        survivors tree | cwd   wrapper said');
  for (const r of rows) {
    const tree = r.tree.map((e) => `${e.name}${e.inHangupGroup ? '' : '(own)'}`).join(' ');
    say(
      `${r.build.padEnd(6)} ${r.arm}   ${String(r.settledMs).padStart(6)}  ${String(r.endMs).padStart(6)}  ${tree.padEnd(40)} ` +
        `${String(r.survivorsByTree.length)} | ${String(r.survivorsByCwd.length)}   ` +
        `${r.wrapperSaid === null ? '-' : `ended ${String(r.wrapperSaid.n)} (${r.wrapperSaid.when})`}`
    );
  }
  if (KEEP) writeFileSync(join(run, 'results.json'), `${JSON.stringify(rows, null, 2)}\n`);

  const { problems, unreadable, notes } = judge(rows);
  for (const n of notes) say(`note: ${n}`);
  for (const u of unreadable) say(`UNREADABLE: ${u}`);
  for (const p of problems) say(`FAIL: ${p}`);
  if (unreadable.length > 0) return 2;
  if (!BUILDS.includes('head')) return 0;
  if (problems.length > 0) return 1;
  say('PASS');
  return 0;
}

/**
 * The clean-up, once, whichever way the run ends: from the `finally` below, or
 * from SIGINT, SIGTERM or SIGHUP, which would otherwise end this process with
 * its plant, its scratch server and whatever survived the hang-up still
 * running (a run interrupted on 2026-09-29 left a planted sleep at ppid 1
 * exactly that way). SIGKILL cannot be answered; the plant's own wait ends
 * when this pid is gone, so the wrapper's teardown still runs then.
 *
 *   1. Every wrapper still running, by its own pid and only while a re-read
 *      shows the start time, command line and group read at the spawn: SIGTERM
 *      first, which the wrapper forwards to its command and then tears down,
 *      then SIGKILL after 20 s. A child Node has not yet reaped cannot have had
 *      its pid handed to anyone else, so an identity that could not be read at
 *      the spawn falls back to the handle alone.
 *   2. Every scratch server this script learned, by its exact name, including
 *      one an arm's plant wrote down before the arm read it.
 *   3. Everything recorded or found by working directory under the run folder,
 *      identity re-read first, SIGTERM then SIGKILL, one pid at a time.
 *   4. Socket files and markers by exact name, each wrapper's own empty run
 *      directory, and the run folder unless P323_KEEP=1.
 */
let cleanedUp = null;
function cleanUp() {
  cleanedUp ??= (async () => {
    stopping = true;
    let ok = true;
    const live = started.filter((c) => c.exitCode === null && c.signalCode === null);
    const same = (child) => {
      const id = wrapperIds.get(child.pid);
      if (id === undefined) return true;
      try {
        return stillSame([id]).length === 1;
      } catch {
        return false;
      }
    };
    for (const child of live) if (same(child)) child.kill('SIGTERM');
    for (const child of live) {
      if (!(await exited(child, 20_000)) && same(child)) child.kill('SIGKILL');
    }
    if (runDir !== null && existsSync(runDir)) {
      for (const build of ['parent', 'head']) {
        for (const arm of ['j2', 'j3']) {
          const f = join(runDir, `${build}-${arm}`, 'socket');
          if (!existsSync(f)) continue;
          const s = readFileSync(f, 'utf8').trim();
          if (SOCKET_SHAPE.test(s)) sockets.add(s);
        }
      }
    }
    for (const socket of sockets) {
      if (SOCKET_SHAPE.test(socket)) tmuxOn(socket, ['kill-server']);
    }
    let ended = 0;
    try {
      const found = runDir !== null && existsSync(runDir) ? censusByCwd(realpathSync(runDir)) : [];
      const foundRows = [...(psPids(found) ?? new Map()).values()];
      ended = await endByPid([...recorded.values(), ...foundRows]);
    } catch (err) {
      say(`the clean-up could not end everything: ${String(err?.message ?? err)}`);
      ok = false;
    }
    for (const socket of sockets) {
      if (!SOCKET_SHAPE.test(socket)) continue;
      rmSync(join(socketDir(), socket), { force: true });
      rmSync(join(socketDir(), `${socket}.run`), { force: true });
      profiles.add(join(process.env['TMPDIR'] ?? '/tmp', socket));
    }
    // A wrapper's run directory is kept by the wrapper as evidence; these are
    // this script's, and only an EMPTY one is removed (rmdir refuses the rest).
    for (const dir of profiles) {
      try {
        rmdirSync(dir);
      } catch {
        /* not empty, or already gone */
      }
    }
    // Gemini's install once more, after everything this run started has
    // ended, whichever way the run ended. A move is a stop and is said.
    if (geminiBefore !== null) {
      let after = null;
      try {
        after = geminiInstall();
      } catch {
        after = null;
      }
      if (JSON.stringify(after) === JSON.stringify(geminiBefore)) {
        say(`gemini's install unchanged at the end: ${geminiBefore.version}, package.json ${geminiBefore.pkg}, bundle ${geminiBefore.bundle}`);
      } else {
        say(`STOP: Gemini's install moved: ${JSON.stringify(geminiBefore)} -> ${JSON.stringify(after)}`);
        ok = false;
      }
    }
    if (runDir !== null && existsSync(join(runDir, 'npm-calls.log'))) {
      say(`STOP: something called npm: ${readFileSync(join(runDir, 'npm-calls.log'), 'utf8').trim()}`);
      ok = false;
    }
    if (runDir !== null && !KEEP) rmSync(runDir, { recursive: true, force: true });
    say(`clean-up: ended ${String(ended)} process(es) by pid; ${KEEP && runDir !== null ? `kept ${runDir}` : 'run folder removed'}`);
    return ok;
  })();
  return cleanedUp;
}

const SIGNALS = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 };
for (const [signal, exitCode] of Object.entries(SIGNALS)) {
  process.once(signal, () => {
    say(`${signal}: cleaning up before exiting`);
    void cleanUp().finally(() => process.exit(exitCode));
  });
}

let code = 2;
try {
  code = await main();
} catch (err) {
  say(err instanceof Unreadable ? `UNREADABLE: ${err.message}` : `ERROR: ${err?.stack ?? String(err)}`);
  code = err instanceof Unreadable ? 2 : 1;
} finally {
  // Every wrapper child in `started` is ended here, through cleanUp(); see it.
  if (!(await cleanUp())) code = Math.max(code, 2);
  process.exitCode = code;
}
