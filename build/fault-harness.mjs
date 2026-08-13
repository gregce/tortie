#!/usr/bin/env node
/**
 * The general fault harness — the supervisor (Phase 19 item 1).
 *
 * Nothing anywhere else in this repo kills the app. Every harness quits
 * politely, so the crash-safety story is untested, and crash safety is what
 * Tortie is sold on. This script kills it.
 *
 * FAULT MATRIX ROWS THIS NOW COVERS (research 26 §13, audited in research 33
 * §7 and §7.1 item 1, where all seven were listed as exercised by nothing):
 *
 *   Row 1  Before declaration commit, kill creator   point create.before-declaration
 *   Row 2  After declaration, before spawn           point create.after-declaration
 *   Row 3  After spawn, before the identity stamp    point create.after-spawn
 *   Row 4  After the stamp, before the launch record point create.after-launch-record
 *                                                    and create.after-identity-stamp
 *   Row 9  During a checkpoint write, kill           points snapshot.before-write,
 *                                                    snapshot.after-write (the torn
 *                                                    window) and snapshot.after-rename
 *   Row 12 During each restore stage, kill the app   points restore.before-spawn,
 *                                                    restore.after-spawn,
 *                                                    restore.after-replay,
 *                                                    restore.after-arm,
 *                                                    restore.after-status-write
 *   Row 17 Electron crash, kill renderer and main    every case here
 *
 * All seven rows are exercised by a bare invocation, and every stage of row 12
 * is its own case. The workload opens a real renderer and then kills one
 * session out of band and restores it, so the SIGKILL takes a renderer down
 * with the main process and the five restore stages are reachable. Every row is
 * a chosen point rather than a lucky moment, so a failure is reproducible by
 * name.
 *
 * WHAT THE RANDOM CASES ARE FOR, and what they are not for. They are a search
 * for a torn window nobody named, and they are drawn from the intervals in
 * which the CONTROL RUN actually recorded fault points, not uniformly across
 * the whole run. The uniform draw was measured and it was close to worthless:
 * 84.7 % of the run is the workload waiting for a marker to appear on a pane,
 * 8 of 8 draws at seed 42 landed at the identical idle state, and 11 draws
 * across two batteries reached 2 distinct states. Drawing from the active
 * intervals puts every moment inside code that is writing.
 *
 * TWO TRAPS, BOTH MEASURED IN RESEARCH 34, BOTH DESIGNED AROUND HERE.
 *
 *  1. SIGTERM is not a crash in Electron. It runs the full graceful quit and
 *     honours `preventDefault()`, and a Node-level handler never fires because
 *     Chromium owns the signal. Only SIGKILL is a crash. This script sends
 *     SIGKILL and nothing else.
 *  2. `node_modules/.bin/electron` is a shim with its own pid. Killing the shim
 *     leaves the app running and still writing. So the real binary inside
 *     Electron.app is spawned directly, and the pid we kill is the app's.
 *
 * SAFETY. Every case runs under its own `--user-data-dir` and its own tmux
 * socket, so no session the user owns is on the server being crashed. The app
 * refuses to start the workload if either isolation is missing, and this script
 * refuses to run if the socket it was handed is the real one.
 *
 * Usage:
 *   node build/fault-harness.mjs                     the default battery
 *   node build/fault-harness.mjs --point <name>[#n]  one chosen point
 *   node build/fault-harness.mjs --random 3          three random moments
 *   node build/fault-harness.mjs --seed 7            the same random moments again
 *   node build/fault-harness.mjs --keep              leave the scratch root behind
 *   node build/fault-harness.mjs --json <path>       write the full report
 *
 * Output: one JSON report per case on stdout, then a summary table and a
 * PASS/FAIL line. Exit 0 only when every invariant held in every case.
 */

import { execFile, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ELECTRON = join(
  REPO,
  'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
);
const REAL_SOCKET = 'gmux';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    points: [],
    randomRuns: 0,
    seed: 1,
    keep: false,
    jsonPath: null,
    root: null
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--point') out.points.push(argv[(i += 1)]);
    else if (a === '--random') out.randomRuns = Number(argv[(i += 1)]);
    else if (a === '--seed') out.seed = Number(argv[(i += 1)]);
    else if (a === '--keep') out.keep = true;
    else if (a === '--json') out.jsonPath = argv[(i += 1)];
    else if (a === '--root') out.root = argv[(i += 1)];
    else throw new Error(`unknown argument ${a}`);
  }
  return out;
}

/**
 * The battery a bare invocation runs: one control, eleven chosen points and
 * three random moments. Each case gets its own profile, its own tmux socket and
 * its own pair of app launches.
 *
 * The five `restore.*` points are all here rather than one of them. Row 12 of
 * the fault matrix is "during EACH restore stage", and a battery that kills at
 * one stage proves one stage. The four extra cases cost about 40 s.
 */
const DEFAULT_POINTS = [
  'create.before-declaration',
  'create.after-declaration',
  'create.after-spawn',
  'create.after-launch-record',
  'snapshot.before-write',
  'snapshot.after-write',
  'restore.before-spawn',
  'restore.after-spawn',
  'restore.after-replay',
  'restore.after-arm',
  'restore.after-status-write',
  'quit.before-snapshots'
];

/**
 * How long one app launch may take before the supervisor kills it and records
 * a harness timeout.
 *
 * MEASURED, and this is a hazard the harness makes for itself. It crashes the
 * same app bundle dozens of times, and macOS eventually answers the next launch
 * with a modal: one `fault-work` launch sat for over 12 minutes with its main
 * thread blocked in `-[NSPersistentUIManager promptToIgnorePersistentState]`,
 * reached through `_reopenWindowsAsNecessaryIncludingRestorableState`. No
 * JavaScript ever ran, so the in-app 120 s watchdog could not fire, and
 * `npm run smoke:fault` would have hung forever with no output.
 *
 * Two defences. `-ApplePersistenceIgnoreState YES` on the command line stopped
 * the prompt appearing in every probe, and this deadline catches whatever it
 * does not. A launch that hits the deadline is a FAILURE of the case, never a
 * pass: a harness that cannot start the app has proved nothing.
 *
 * `GMUX_FAULT_LAUNCH_DEADLINE_MS` moves it. That exists so the deadline can be
 * DRIVEN rather than reasoned about: set it to 500 and the whole battery
 * reports harness timeouts and exits 1, which is what proves the catch works.
 */
const LAUNCH_DEADLINE_MS = Number(
  process.env.GMUX_FAULT_LAUNCH_DEADLINE_MS ?? 180_000
);

/**
 * How long the supervisor waits after the process exits for its pipes to close.
 *
 * `close` fires only when every stdio stream is done, and a surviving Chromium
 * helper can hold the pipe open after the main process is dead. `exit` is the
 * event that means the app is gone, so that is what is waited on, with this
 * much grace afterwards to collect the last of the output.
 */
const STDIO_DRAIN_MS = 1_500;

// ---------------------------------------------------------------------------
// Seeded randomness, so a failing random run can be re-run exactly
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Running one app launch
// ---------------------------------------------------------------------------

/**
 * Spawn the app and wait for it to end.
 *
 * `killAfterMs` sends SIGKILL to the spawned pid at that moment. The spawned
 * pid IS the main process because the real binary is spawned rather than the
 * shim, so no driver library is needed to find it.
 *
 * Every launch is bounded by LAUNCH_DEADLINE_MS. Read that constant for the
 * 12 minute hang it exists to catch.
 */
function runApp({ mode, profile, socket, root, fault, trace, killAfterBeginMs }) {
  return new Promise((resolveRun) => {
    const started = Date.now();
    let beganAt = null;
    let timedOut = false;
    const env = {
      ...process.env,
      GMUX_SMOKE: mode,
      GMUX_FAULT_ROOT: root,
      GMUX_TMUX_SOCKET: socket,
      // A migration into a scratch profile would copy the user's real data.
      // The app already guards this by path; belt and braces.
      GMUX_SKIP_USERDATA_MIGRATION: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1'
    };
    if (fault) env.GMUX_FAULT = fault;
    if (trace) env.GMUX_FAULT_TRACE = trace;

    const child = spawn(
      ELECTRON,
      [
        '.',
        `--user-data-dir=${profile}`,
        // AppKit's post-crash "reopen your windows?" modal. It blocks the main
        // thread before JavaScript runs, so nothing inside the app can defend
        // against it. See LAUNCH_DEADLINE_MS.
        '-ApplePersistenceIgnoreState',
        'YES'
      ],
      {
        cwd: REPO,
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let stdout = '';
    let stderr = '';
    let timer = null;
    child.stdout.on('data', (b) => {
      stdout += b.toString();
      // Time the kill from the moment the app is BOOTED and about to write,
      // not from spawn. Electron's boot is most of a run and its duration
      // varies by more than the writing phase is wide, so a delay measured
      // from spawn lands after the run has already finished.
      if (beganAt === null && stdout.includes('[gmux-fault] work-ready')) {
        beganAt = Date.now();
        if (typeof killAfterBeginMs === 'number') {
          timer = setTimeout(() => {
            try {
              process.kill(child.pid, 'SIGKILL');
            } catch {
              /* already gone: the run finished before the moment we picked */
            }
          }, killAfterBeginMs);
        }
      }
    });
    child.stderr.on('data', (b) => (stderr += b.toString()));

    const deadline = setTimeout(() => {
      timedOut = true;
      console.error(
        `[fault] launch exceeded ${String(LAUNCH_DEADLINE_MS)} ms; killing pid ${String(child.pid)}`
      );
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }, LAUNCH_DEADLINE_MS);

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      clearTimeout(deadline);
      resolveRun({
        code: child.exitCode,
        signal: child.signalCode,
        timedOut,
        ms: Date.now() - started,
        startedAt: started,
        beganAt,
        pid: child.pid,
        stdout,
        stderr
      });
    };

    // `exit` means the app is gone. `close` also waits for every pipe, and a
    // surviving Chromium helper can hold one open long after the main process
    // is dead. Wait for `exit`, then give the pipes a short grace to drain.
    child.on('close', finish);
    child.on('exit', () => {
      const grace = setTimeout(finish, STDIO_DRAIN_MS);
      grace.unref?.();
    });
  });
}

/**
 * Two fault points closer together than this are treated as one stretch of
 * work. Wider than this and the app is waiting on something, e.g. a marker
 * appearing on a pane, and there is nothing there for a crash to tear.
 */
const ACTIVE_GAP_MS = 150;

/** A single point is given this much width, so a crash can land on it. */
const POINT_WIDTH_MS = 20;

/**
 * The stretches of a control run in which the app was actually working.
 *
 * The whole run is not the right draw window. Measured on this workload: the
 * durable writes occupy 219 ms of a 1,434 ms run and the other 1,215 ms is the
 * workload waiting for a marker, so a uniform draw lands in a write 15.3 % of
 * the time and observed 2 hits in 11 draws. Drawing from these intervals puts
 * every random moment inside code that is writing.
 */
function activeWindow(times) {
  if (times.length === 0) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const intervals = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const t of sorted.slice(1)) {
    if (t - prev > ACTIVE_GAP_MS) {
      intervals.push([start, prev + POINT_WIDTH_MS]);
      start = t;
    }
    prev = t;
  }
  intervals.push([start, prev + POINT_WIDTH_MS]);
  const activeMs = intervals.reduce((sum, [a, b]) => sum + (b - a), 0);
  return {
    firstMs: sorted[0],
    lastMs: sorted[sorted.length - 1],
    intervals,
    activeMs
  };
}

/** Pick a millisecond from the union of the active intervals. */
function drawActiveMoment(window, fraction) {
  if (!window || window.intervals.length === 0) return null;
  let want = fraction * window.activeMs;
  for (const [a, b] of window.intervals) {
    const width = b - a;
    if (want <= width) return Math.max(1, Math.round(a + want));
    want -= width;
  }
  const last = window.intervals[window.intervals.length - 1];
  return Math.max(1, Math.round(last[1]));
}

/** Pull `[gmux-fault] <kind> {json}` records out of a run's stdout. */
function records(stdout, kind) {
  const out = [];
  for (const line of stdout.split('\n')) {
    const prefix = `[gmux-fault] ${kind} `;
    const at = line.indexOf(prefix);
    if (at === -1) continue;
    try {
      out.push(JSON.parse(line.slice(at + prefix.length)));
    } catch {
      /* a truncated line is itself evidence; skip it */
    }
  }
  return out;
}

async function killServer(socket) {
  if (socket === REAL_SOCKET) throw new Error('refusing to touch -L gmux');
  if (!socket.startsWith('gmux-fault-')) {
    throw new Error(`refusing to kill a server this harness did not name: ${socket}`);
  }
  // Ask tmux where its socket is rather than guessing. tmux puts it under
  // $TMUX_TMPDIR or /tmp, never under the TMPDIR Node reports on macOS.
  const path = await execFileP('tmux', [
    '-L',
    socket,
    'display-message',
    '-p',
    '#{socket_path}'
  ])
    .then((r) => r.stdout.trim())
    .catch(() => '');
  await execFileP('tmux', ['-L', socket, 'kill-server']).catch(() => undefined);
  // A server killed while a client was attached leaves its socket file behind.
  // Remove ours, by exact path, so a machine that runs this often does not
  // accumulate dead sockets next to the real one.
  if (path.endsWith(`/${socket}`)) rmSync(path, { force: true });
}

// ---------------------------------------------------------------------------
// One case: workload, kill, relaunch, survey, judge
// ---------------------------------------------------------------------------

async function runCase({ name, index, root, fault, killAfterBeginMs }) {
  const caseRoot = join(root, name.replace(/[^A-Za-z0-9._-]/g, '_'));
  const profile = join(caseRoot, 'profile');
  const trace = join(caseRoot, 'trace.tsv');
  const socket = `gmux-fault-${process.pid}-${index}`;
  mkdirSync(profile, { recursive: true });

  const work = await runApp({
    mode: 'fault-work',
    profile,
    socket,
    root: caseRoot,
    fault,
    trace,
    killAfterBeginMs
  });
  const survey = await runApp({
    mode: 'fault-survey',
    profile,
    socket,
    root: caseRoot,
    trace: join(caseRoot, 'survey-trace.tsv')
  });
  await killServer(socket);

  const report = records(survey.stdout, 'survivors')[0] ?? null;
  const traceLines = existsSync(trace)
    ? readFileSync(trace, 'utf8')
        .split('\n')
        .filter((l) => l.length > 0)
        .map((l) => l.split('\t'))
    : [];
  const reached = traceLines.map((f) => `${f[0]}#${f[1]}`);
  // Where the durable work sat inside this launch, measured from the moment
  // the workload announced itself. The control run's window is what the random
  // kills are drawn from, so a random moment lands inside the writing rather
  // than inside Electron's boot.
  const origin = work.beganAt ?? work.startedAt;
  const times = traceLines.map((f) => Number(f[2]) - origin);
  const workWindow = activeWindow(times);

  const result = {
    case: name,
    socket,
    fault: fault ?? null,
    killAfterBeginMs: killAfterBeginMs ?? null,
    work: { exit: work.code, signal: work.signal, ms: work.ms, timedOut: work.timedOut },
    survey: {
      exit: survey.code,
      signal: survey.signal,
      ms: survey.ms,
      timedOut: survey.timedOut
    },
    pointsReached: reached,
    workWindow,
    survivors: report,
    failures: []
  };
  judge(result, {
    expectKill: fault !== undefined || killAfterBeginMs !== undefined
  });
  if (result.failures.length > 0) {
    result.workStderr = work.stderr.slice(-2000);
    result.surveyStderr = survey.stderr.slice(-2000);
  }
  return result;
}

/**
 * The checker. It runs here, in a process that never booted the app, so it
 * cannot have been damaged by the fault it is judging (research 34 §5.2).
 */
function judge(r, { expectKill }) {
  const bad = (why) => r.failures.push(why);

  // A launch the supervisor had to kill on its deadline is a failure of the
  // case, never a pass. It means the app never got to the point being tested.
  if (r.work.timedOut) {
    bad(`the workload never finished: killed on the ${String(LAUNCH_DEADLINE_MS)} ms launch deadline`);
    return;
  }
  if (r.survey.timedOut) {
    bad(`the survey never finished: killed on the ${String(LAUNCH_DEADLINE_MS)} ms launch deadline`);
    return;
  }

  if (expectKill && r.work.signal !== 'SIGKILL') {
    bad(
      `the workload was meant to be killed and ended with exit ${String(r.work.exit)} signal ${String(r.work.signal)}`
    );
  }
  if (!expectKill && r.work.exit !== 0) {
    bad(`the clean workload exited ${String(r.work.exit)}`);
  }
  if (r.survey.exit !== 0) {
    bad(`the app did not relaunch after the crash: survey exited ${String(r.survey.exit)}`);
    return;
  }
  const s = r.survivors;
  if (s === null) {
    bad('the survey printed no survivors record');
    return;
  }

  // 1. The manifest is readable and undamaged, before anything reconciles it.
  if (s.before.manifestIntegrity !== 'ok' && s.before.manifestIntegrity !== 'missing') {
    bad(`manifest integrity after the crash: ${s.before.manifestIntegrity}`);
  }

  // 2. No live session the app cannot see. A session carrying `@gmux-id` with
  //    no row is work the user owns and Tortie has lost track of.
  if (s.orphanedLiveSessions.length > 0) {
    bad(`live sessions with no manifest row: ${s.orphanedLiveSessions.join(', ')}`);
  }

  // 3. Nothing is reported running that is not running. A crash must never
  //    leave the user looking at a healthy row for a session that is gone.
  for (const v of s.verdicts) {
    if (v.statusAfter === 'running' && !v.tmuxAlive) {
      bad(`"${v.name}" reads running after reconcile and no tmux session holds it`);
    }
  }

  // 4. No torn snapshot. A snapshot that exists must be whole: non-zero, and
  //    carrying the marker its pane printed.
  for (const f of s.after.snapshots) {
    if (f.bytes === 0) bad(`zero-byte snapshot published: ${f.file}`);
  }
  for (const v of s.verdicts) {
    if (v.snapshotBytes !== null && v.snapshotHasMarker === false) {
      bad(`"${v.name}" has a snapshot that does not contain its marker`);
    }
  }

  // 5. The control case is held to the whole story, because nothing crashed.
  if (!expectKill) {
    for (const v of s.verdicts) {
      if (!v.rowPresent) bad(`"${v.name}" has no manifest row after a clean quit`);
      if (!v.tmuxAlive) bad(`"${v.name}" is not alive in tmux after a clean quit`);
      if (v.snapshotHasMarker !== true) {
        bad(`"${v.name}" has no whole snapshot after a clean quit`);
      }
    }
    if (s.after.snapshotTemporaries.length > 0) {
      bad(`a clean quit left temporaries behind: ${s.after.snapshotTemporaries.join(', ')}`);
    }
  }

  // 6. A chosen point that was never reached means the run proved nothing.
  if (r.fault !== null && r.work.signal === 'SIGKILL') {
    const wanted = r.fault.includes('#') ? r.fault : `${r.fault}#1`;
    if (!r.pointsReached.includes(wanted)) {
      bad(`the trace never records ${wanted}, so the kill did not happen where it claims`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(ELECTRON)) {
    throw new Error(`Electron binary not found at ${ELECTRON} — run npm install`);
  }
  if (!existsSync(join(REPO, 'out/main/index.js'))) {
    throw new Error('out/main/index.js is missing — run npm run build first');
  }

  // `realpathSync` matters and it is not cosmetic. On macOS `tmpdir()` answers
  // `/var/folders/...`, which is a symlink, while Electron answers
  // `app.getPath('userData')` as `/private/var/folders/...`. The in-app
  // isolation guard compares the two with `startsWith`, so without this every
  // case is refused before it creates a session.
  const requested = args.root ?? join(tmpdir(), `gmux-fault-${String(process.pid)}`);
  mkdirSync(requested, { recursive: true });
  const root = realpathSync(requested);
  console.log(`[fault] scratch root ${root}`);
  console.log(`[fault] electron    ${ELECTRON}`);

  const results = [];
  let index = 0;

  // The control run first. It is the baseline for what a whole state looks
  // like, and its duration is the window the random kills are drawn from.
  const control = await runCase({ name: 'clean', index: (index += 1), root });
  results.push(control);
  console.log(JSON.stringify(control, null, 2));

  const points = args.points.length > 0 ? args.points : args.randomRuns > 0 ? [] : DEFAULT_POINTS;
  for (const point of points) {
    const r = await runCase({
      name: `point-${point}`,
      index: (index += 1),
      root,
      fault: point
    });
    results.push(r);
    console.log(JSON.stringify(r, null, 2));
  }

  const randomRuns = args.randomRuns > 0 ? args.randomRuns : args.points.length > 0 ? 0 : 3;
  const rnd = mulberry32(args.seed);
  // Measured on the control run, not guessed: the stretches in which that run
  // recorded fault points, as offsets from the moment the workload announced
  // itself. Electron's boot is most of a 1.6 s run and varies by more than the
  // write window is wide, so a delay measured from spawn mostly kills a
  // process that has written nothing.
  const window = control.workWindow;
  if (window) {
    console.log(
      `[fault] random kills are drawn from ${String(window.intervals.length)} active ` +
        `interval(s) totalling ${String(window.activeMs)} ms inside a ` +
        `${String(window.lastMs - window.firstMs)} ms run, measured on the control run: ` +
        window.intervals.map(([a, b]) => `${String(a)}-${String(b)}`).join(', ')
    );
  } else {
    console.log('[fault] the control run recorded no fault points; drawing from 1 to 200 ms');
  }
  for (let i = 0; i < randomRuns; i += 1) {
    // The seed fixes the FRACTION of the ACTIVE time, and the intervals are
    // measured on this machine on this run. So a seed reproduces the same
    // moments on the same machine, and the same intent on a slower one.
    const fraction = rnd();
    let at = drawActiveMoment(window, fraction) ?? Math.max(1, Math.round(fraction * 200));
    let r = null;
    // A moment drawn from one run can still fall after a faster run has
    // finished. That is a miss rather than a defect, so redraw once, earlier,
    // and only then let it fail.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      r = await runCase({
        name: `random-${String(i + 1)}-try-${String(attempt)}-at-${String(at)}ms`,
        index: (index += 1),
        root,
        killAfterBeginMs: at
      });
      r.randomFraction = Number(fraction.toFixed(4));
      if (r.work.signal === 'SIGKILL') break;
      at = Math.max(lo, Math.round(at * 0.6));
      console.log(
        `[fault] random ${String(i + 1)} finished before the kill; redrawing at ${String(at)} ms`
      );
    }
    results.push(r);
    console.log(JSON.stringify(r, null, 2));
  }

  const pad = (s, n) => String(s).padEnd(n);
  console.log('');
  console.log(
    `${pad('case', 38)}${pad('work', 16)}${pad('survey', 10)}${pad('rows', 6)}${pad('live', 6)}${pad('snaps', 7)}verdict`
  );
  for (const r of results) {
    const s = r.survivors;
    console.log(
      pad(r.case, 38) +
        pad(r.work.signal ?? `exit ${String(r.work.exit)}`, 16) +
        pad(`exit ${String(r.survey.exit)}`, 10) +
        pad(s ? s.before.rows.length : '-', 6) +
        pad(s ? s.before.liveSessions.length : '-', 6) +
        pad(s ? s.before.snapshots.length : '-', 7) +
        (r.failures.length === 0 ? 'pass' : `FAIL ${r.failures.join('; ')}`)
    );
  }

  const failed = results.filter((r) => r.failures.length > 0);
  if (args.jsonPath) {
    writeFileSync(args.jsonPath, `${JSON.stringify({ root, results }, null, 2)}\n`);
    console.log(`[fault] report written to ${args.jsonPath}`);
  }
  if (!args.keep) rmSync(root, { recursive: true, force: true });
  console.log('');
  console.log(
    failed.length === 0
      ? `[fault] PASS — ${String(results.length)} cases, every invariant held`
      : `[fault] FAIL — ${String(failed.length)} of ${String(results.length)} cases broke an invariant`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`[fault] FAIL: ${err.stack ?? err.message}`);
  process.exit(1);
});
