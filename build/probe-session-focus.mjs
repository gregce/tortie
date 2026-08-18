#!/usr/bin/env node
/**
 * probe-session-focus.mjs. The Phase 80.1 live probe.
 *
 * WHAT IT PROVES. One claim, at Tier 3, measured twice by two independent
 * readings that do not share a code path.
 *
 *   Between the chord press and the end of the 200 ms flight, no visible leaf
 *   is resized. After the swap, each visible leaf is resized exactly once.
 *
 * READING ONE, IN THE RENDERER. src/renderer/app/focus-shot-drive.ts
 * subscribes to `Terminal.onResize` for every visible leaf, presses the real
 * chord as a capture phase keydown on `window`, and prints one row per event
 * with its offset from the press. `Terminal.onResize` fires exactly when
 * columns or rows change, which is exactly when TerminalPane calls
 * `gmux.sessions.resize`.
 *
 * READING TWO, ON TMUX, WHICH IS THE GROUND TRUTH. This file polls the
 * HARNESS tmux server every 25 ms for the whole gesture and records the
 * sequence of distinct pane sizes per session. A flight that animated the
 * live layout box would show a staircase of five to twelve intermediate
 * sizes. Two sizes and one transition is the shape that cannot be faked.
 *
 * SAFETY, ABSOLUTE. The probe runs on the socket build/harness-socket.mjs
 * gave it, which that script refuses to let be `gmux` or `default`. It uses
 * its own user data directory and its own scratch project. It names `-L gmux`
 * in exactly one place, a read only session count taken before and after,
 * which must match. It never uses pkill, never uses kill-server, and kills
 * only the pid it spawned.
 *
 * Usage, from the repository root. The npm script is the ordinary run. The
 * flags go INSIDE the harness command, because `npm run x -- --flag` would
 * append them after the quoted inner command and harness-socket.mjs would
 * drop them:
 *
 *   npm run probe:sessionfocus
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p801-focus \
 *     'node build/probe-session-focus.mjs --reduced'
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p801-focus \
 *     'node build/probe-session-focus.mjs --keep'
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p801-focus \
 *     'node build/probe-session-focus.mjs --stayfocused'
 *
 * The last one skips the way out, so the screenshot it writes shows the
 * settled focus rather than the layout after leaving it.
 *
 * Exit code 0 when both readings pass. Exit code 1 otherwise, with every
 * failing row named. Exit code 2 when the probe refuses to run at all.
 */

import { execFile, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { loadavg, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:sessionfocus]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Arguments and refusals
// ---------------------------------------------------------------------------

function flag(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const value = process.argv[at + 1];
  return value === undefined || value.startsWith('--') ? fallback : value;
}

const reduced = process.argv.includes('--reduced');
const keep = process.argv.includes('--keep');
/** Leave the mode ON at capture time, for the settled focus screenshot. */
const stayFocused = process.argv.includes('--stayfocused');
const armMs = Number(flag('arm', '4000'));
const settleMs = Number(flag('settle', '1500'));
const pollMs = Number(flag('poll', '25'));
/** The flight's length. The renderer reads it from --dur-panel. */
const flightMs = Number(flag('flight', '200'));

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p801-focus 'node " +
      "build/probe-session-focus.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/**
 * The operator's live server, listed and never written. This is the ONLY
 * place this file names it.
 */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '')
    .split('\n')
    .filter((line) => line.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

// ---------------------------------------------------------------------------
// The scratch project
// ---------------------------------------------------------------------------

const scratch = process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'gmux-p801-focus');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# p80.1 focus probe\n', 'utf8');

/**
 * The screenshot goes OUTSIDE the repository, beside the scratch root rather
 * than inside it, so `--keep` is not what decides whether the evidence
 * survives. `out/` would have been the house habit, and electron-builder.yml
 * packs `out/**`, so a screenshot written there ends up inside app.asar in the
 * next packaged build. The phase's scratch files carry a `p80.1-` prefix and
 * live outside the repository, and these two are scratch files.
 */
const shotPath = join(
  scratch,
  reduced ? 'p80.1-focus-reduced.png' : 'p80.1-focus.png'
);
rmSync(shotPath, { force: true });

/**
 * 100 printable characters, repeated down the pane. A fresh prompt fills one
 * row of twenty and reads as an empty drawing buffer at 400 samples, so the
 * ink number only means something on a pane that is full.
 */
const SEED_LINE =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  '0123456789abcdefghijklmnopqrstuvwxyz==';

const drive = {
  projectPath: project,
  session: { agent: 'shell', name: 'p801-a' },
  splitGrid: true,
  sessionFocus: {
    armMs,
    settleMs,
    pollMs: 8,
    measureCopy: true,
    leave: !stayFocused,
    seed: `yes ${SEED_LINE} | head -80`
  }
};

// ---------------------------------------------------------------------------
// The tmux poll
// ---------------------------------------------------------------------------

/** One sample: `{ at, panes: { sessionName: 'WxH' } }`. */
const timeline = [];
let polling = false;
let pollTimer = null;

async function samplePanes() {
  const at = Date.now();
  let stdout = '';
  try {
    const r = await execFileP('tmux', [
      '-L',
      socket,
      'list-panes',
      '-a',
      '-F',
      '#{session_name} #{pane_width}x#{pane_height}'
    ]);
    stdout = r.stdout;
  } catch {
    return; // no server yet, or it went away. Not a sample.
  }
  const panes = {};
  for (const line of stdout.split('\n')) {
    const [name, size] = line.trim().split(/\s+/);
    if (name === undefined || size === undefined) continue;
    panes[name] = size;
  }
  timeline.push({ at, panes });
}

function startPolling() {
  if (polling) return;
  polling = true;
  say(`polling ${socket} every ${String(pollMs)} ms`);
  let busy = false;
  pollTimer = setInterval(() => {
    if (busy) return;
    busy = true;
    void samplePanes().finally(() => {
      busy = false;
    });
  }, pollMs);
}

function stopPolling() {
  if (pollTimer !== null) clearInterval(pollTimer);
  pollTimer = null;
  polling = false;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const loadBefore = loadavg()[0];
let rendererReport = null;
let text = '';

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');
const args = ['.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'];
if (reduced) args.push('--force-prefers-reduced-motion');

say(`launching electron${reduced ? ' with reduced motion forced' : ''}`);

const child = spawn(electronBin, args, {
  cwd: repoRoot,
  env: {
    ...process.env,
    GMUX_SHOT: shotPath,
    GMUX_SHOT_VERBOSE: '1',
    GMUX_SHOT_DELAY_MS: String(armMs + settleMs * 2 + 14_000),
    GMUX_SHOT_DRIVE: JSON.stringify(drive)
  }
});

function onText(chunk) {
  process.stdout.write(chunk);
  text += chunk;
  if (chunk.includes('[focus-probe] arming')) startPolling();
  const marker = '[focus-probe] result ';
  let at = text.lastIndexOf(marker);
  if (at === -1) return;
  const line = text.slice(at + marker.length).split('\n')[0] ?? '';
  try {
    rendererReport = JSON.parse(line);
  } catch {
    // The line is still arriving. Try again on the next chunk.
  }
}

child.stdout.on('data', (b) => {
  onText(b.toString());
});
child.stderr.on('data', (b) => {
  onText(b.toString());
});

/**
 * `exit`, not `close`, AND the two pipes are destroyed once it resolves.
 *
 * The app starts a tmux server, and that server inherits this child's stdout
 * and stderr. Two things follow and the probe needs both fixes.
 *
 *  1. `close` waits for a stdio end that never comes, because the tmux server
 *     is still holding the write end long after Electron has quit. Awaiting
 *     `exit` instead is what lets the reading below run at all. Measured on
 *     2026-08-18: the run finished, wrote its screenshot, and then sat for
 *     448 s until it was stopped by hand.
 *  2. Awaiting `exit` still leaves those two readable streams referenced by
 *     the event loop, so node never exits on its own and the promised exit
 *     code is never delivered. Measured on 2026-08-18: the probe printed
 *     "both readings agree" and was still alive 13 minutes 38 seconds later
 *     for a run whose work took about 40 seconds. Destroying both handles
 *     after the drain is what lets the process end, and it is what lets
 *     build/harness-socket.mjs reach its own cleanup instead of leaving a
 *     scratch tmux server behind.
 *
 * A short drain after `exit` collects the last lines before either destroy.
 */
const exitCode = await new Promise((r) => {
  const watchdog = setTimeout(
    () => {
      console.error(`${TAG} the run passed its ceiling. Ending the pid I started.`);
      child.kill('SIGTERM');
    },
    armMs + settleMs * 2 + 120_000
  );
  child.on('error', (err) => {
    clearTimeout(watchdog);
    console.error(`${TAG} electron could not start: ${err.message}`);
    r(1);
  });
  child.on('exit', (code) => {
    clearTimeout(watchdog);
    setTimeout(() => {
      r(code ?? 1);
    }, 750);
  });
});
// The two lines that let this file be a gate. See the note above the promise.
child.stdout.destroy();
child.stderr.destroy();
stopPolling();
const loadAfter = loadavg()[0];

// ---------------------------------------------------------------------------
// Reading the evidence back
// ---------------------------------------------------------------------------

const failures = [];
const loadNote = `load average ${loadBefore.toFixed(1)} before and ${loadAfter.toFixed(1)} after`;

if (rendererReport === null) {
  failures.push(
    'the renderer printed no focus-probe result, so nothing was measured ' +
      `(electron exited ${String(exitCode)})`
  );
}

const gestures = rendererReport?.gestures ?? [];
const enter = gestures.find((g) => g.name === 'enter') ?? null;
const leave = gestures.find((g) => g.name === 'leave') ?? null;
const leafIds = rendererReport?.leafIds ?? [];

console.log('');
say(`${loadNote}`);
say(`visible leaves: ${String(leafIds.length)}`);

for (const gesture of gestures) {
  console.log('');
  say(`reading one, the renderer. ${gesture.name}: ${String(gesture.rows.length)} resize events`);
  console.log('  leaf                                  cols  rows   t_ms');
  console.log('  ------------------------------------  ----  ----  -----');
  for (const row of gesture.rows) {
    console.log(
      `  ${String(row.leafId).padEnd(38)}${String(row.cols).padStart(4)}` +
        `  ${String(row.rows).padStart(4)}  ${String(row.tMs).padStart(5)}`
    );
  }
}

for (const copy of rendererReport?.copies ?? []) {
  say(
    `still copy: leaf=${copy.leafId} grabbed=${String(copy.grabbed)} ` +
      `ink=${copy.ink === null ? 'not measured' : Number(copy.ink).toFixed(4)} ` +
      `sampled=${String(copy.sampled)} ` +
      `sources=[${(copy.sources ?? []).join(' ')}]`
  );
}

const copyWindows = rendererReport?.copyWindows ?? [];
say(
  `copy node seen in ${String(copyWindows.length)} windows over ` +
    `${String(rendererReport?.polls ?? 0)} polls at ` +
    `${String(rendererReport?.pollMs ?? 0)} ms`
);

// -- reading two ------------------------------------------------------------

/** Distinct consecutive sizes per session inside one time window. */
function sizeRuns(fromAt, toAt) {
  const runs = new Map();
  for (const sample of timeline) {
    if (sample.at < fromAt || sample.at > toAt) continue;
    for (const [name, size] of Object.entries(sample.panes)) {
      const list = runs.get(name) ?? [];
      const last = list[list.length - 1];
      if (last === undefined || last.size !== size) {
        list.push({ size, at: sample.at });
      }
      runs.set(name, list);
    }
  }
  return runs;
}

console.log('');
say(`reading two, tmux on -L ${socket}. ${String(timeline.length)} samples`);
if (enter !== null) {
  const from = enter.pressedAtEpochMs - 100;
  const to = enter.pressedAtEpochMs + settleMs;
  const runs = sizeRuns(from, to);
  console.log('  session                sizes over the enter gesture');
  console.log('  ---------------------  ----------------------------');
  /**
   * Sessions that changed size at all. The app's own control session never
   * resizes and is not a leaf, so a session that held one size is evidence
   * rather than a failure. What would be a failure is a THIRD size, which is
   * the staircase this reading exists to make impossible to hide.
   */
  let moved = 0;
  for (const [name, list] of runs) {
    console.log(
      `  ${name.padEnd(21)}  ` +
        list
          .map(
            (s) => `${s.size}@+${String(s.at - enter.pressedAtEpochMs)}ms`
          )
          .join('  ')
    );
    if (reduced) continue;
    if (list.length > 2) {
      failures.push(
        `${name} showed ${String(list.length)} distinct pane sizes over the ` +
          'enter gesture, expected at most two. Three or more is a staircase, ' +
          'which means the live layout box was animated'
      );
      continue;
    }
    if (list.length < 2) continue;
    moved += 1;
    const changedAt = (list[1]?.at ?? 0) - enter.pressedAtEpochMs;
    if (changedAt < flightMs) {
      failures.push(
        `${name} changed size ${String(changedAt)} ms after the press, ` +
          `before the ${String(flightMs)} ms flight ended`
      );
    }
  }
  if (runs.size === 0) {
    failures.push(
      'the tmux poll captured no pane sizes during the enter gesture, so ' +
        'reading two measured nothing'
    );
  } else if (!reduced && moved !== leafIds.length) {
    failures.push(
      `${String(moved)} tmux sessions changed size over the enter gesture, ` +
        `expected ${String(leafIds.length)}, one per visible leaf`
    );
  }
}

// -- the pass conditions ----------------------------------------------------

if (enter === null) {
  failures.push('the renderer recorded no enter gesture');
} else if (reduced) {
  for (const row of enter.rows) {
    if (row.tMs >= 32) {
      failures.push(
        `${row.leafId} resized ${String(row.tMs)} ms after the press under ` +
          'reduced motion, which must be instant'
      );
    }
  }
  if (copyWindows.length > 0) {
    failures.push(
      `the copy node appeared ${String(copyWindows.length)} times under ` +
        'reduced motion, and it must never be built at all'
    );
  }
} else {
  const early = enter.rows.filter((r) => r.tMs > 0 && r.tMs < flightMs);
  for (const row of early) {
    failures.push(
      `${row.leafId} resized at ${String(row.tMs)} ms, inside the ` +
        `${String(flightMs)} ms flight. Nothing may resize before the swap`
    );
  }
  const afterSwap = enter.rows.filter((r) => r.tMs >= flightMs);
  const distinct = new Set(afterSwap.map((r) => r.leafId));
  if (leafIds.length > 0 && afterSwap.length !== leafIds.length) {
    failures.push(
      `${String(afterSwap.length)} resize events after the swap, expected ` +
        `exactly ${String(leafIds.length)}, one per visible leaf`
    );
  }
  if (leafIds.length > 0 && distinct.size !== leafIds.length) {
    failures.push(
      `${String(distinct.size)} distinct leaves resized after the swap, ` +
        `expected ${String(leafIds.length)}`
    );
  }
  if (leave === null && !stayFocused) {
    failures.push('the renderer recorded no leave gesture');
  }
}

if (existsSync(shotPath)) {
  say(`screenshot ${shotPath}`);
} else {
  failures.push(`no screenshot was written to ${shotPath}`);
}

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's server went from ${String(operatorBefore)} sessions to ` +
      `${String(operatorAfter)}. This probe must never touch it`
  );
}

if (!keep) rmSync(root, { recursive: true, force: true });

const named = [...new Set(failures)];
if (named.length > 0) {
  console.error('');
  for (const failure of named) console.error(`${TAG} FAIL ${failure}`);
  process.exit(1);
}
console.log('');
say(
  reduced
    ? `both readings agree. Every leaf resized inside 32 ms and the copy was ` +
        `never built, ${loadNote}`
    : `both readings agree. No leaf resized before ${String(flightMs)} ms, ` +
        `${loadNote}`
);
