#!/usr/bin/env node
/**
 * probe-openwith.mjs — the Phase 39 live probe, reproducible from the repo.
 *
 * WHY THIS IS A FILE AND NOT A LINE IN package.json. The probe needs a
 * scratch project built before the app starts, a drive spec composed from the
 * paths of that project, an isolated user data directory, a tmux socket that
 * is not the operator's, and a readback of two artifacts afterwards. That is
 * the same shape as build/fault-harness.mjs and build/conformance-agents.mjs,
 * so it lives where they live and `npm run probe:openwith` is one word.
 *
 * WHAT IT PROVES. It right clicks real rows in a real Electron window and
 * reports, per extension, the milliseconds the menu took to appear, whether
 * the submenu was the full list or the degraded one, and the labels. It then
 * opens one file with a non default app and prints the argv main recorded.
 *
 * COLD MEANS COLD ONCE. LaunchServices caches its answer for an extension
 * for the whole machine, not for one process, so the second run of this
 * probe on `.png` reads a warm OS however fresh the Electron instance is.
 * A number labelled cold is only cold the first time this Mac is asked about
 * that extension. Use `--exts` to pick extensions that have not been asked
 * about yet, e.g.
 *
 *   npm run probe:openwith -- --exts odt,flac,avi,psd
 *
 * SAFETY. The tmux socket is `gmux-p39` and build/harness-socket.mjs refuses
 * the operator's socket by name. The user data directory is under TMPDIR and
 * is deleted first. Nothing is launched on the operator's screen: main reads
 * GMUX_OPEN_WITH_RECORD and writes the argv to a file instead of spawning.
 *
 * Usage:
 *   node build/probe-openwith.mjs [--exts png,txt,json,md,zzqq]
 *                                 [--settle 4000] [--budget 150]
 *                                 [--keep]
 *
 * Exit code 0 when every extension built its menu inside the budget and the
 * recorded argv is the expected shape. Exit code 1 otherwise, with the
 * failing rows named.
 *
 * THE BUDGET IS NOT UNCONDITIONAL, SO THE FAILURE SAYS WHAT THE MACHINE WAS
 * DOING. The 150 ms budget was measured holding at 21 of 21 readings up to
 * load average 82, worst case 136.7 ms. At load average 116 it held at 2 of
 * 5: json took 207.5 ms, zzqq 192.1 ms and md 154.2 ms. The renderer's
 * setTimeout(120) is itself delivered late when the event loop is starved,
 * so a busy enough machine breaks the budget no matter what the deadline is
 * set to. Every failure line therefore carries the one minute load average
 * read before and after the run, so a future failure reads as "the machine
 * was at 116" rather than as a mystery.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { loadavg, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function flag(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const value = process.argv[at + 1];
  return value === undefined || value.startsWith('--') ? fallback : value;
}

/**
 * The default set is the spec's. `.zzqq` is there on purpose: nothing on any
 * Mac claims it, so it proves the empty answer is reported as an answer and
 * not as a failure.
 */
const exts = flag('exts', 'png,txt,json,md,zzqq')
  .split(',')
  .map((e) => e.trim().replace(/^\./, ''))
  .filter((e) => e.length > 0);
const settleMs = Number(flag('settle', '4000'));
const budgetMs = Number(flag('budget', '150'));
const keep = process.argv.includes('--keep');
/**
 * Skip the launch step. A cold re-measurement picks extensions nothing on
 * this Mac claims, and those have no non default app to launch with, so
 * asking for one would report a failure that says nothing about the code.
 */
const noLaunch = process.argv.includes('--no-launch');

if (exts.length === 0) {
  console.error('[probe:openwith] --exts listed no extensions');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The scratch project
// ---------------------------------------------------------------------------

const rawRoot = join(process.env['TMPDIR'] ?? tmpdir(), 'gmux-p39');

rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
mkdirSync(join(repoRoot, 'out'), { recursive: true });

// TMPDIR on macOS is /var/folders/…, a symlink to /private/var/folders/….
// Main resolves a project root to its real path before it will accept a file
// inside it, so the drive spec has to carry the real path or every lookup is
// refused as being outside the project.
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const recordPath = join(root, 'launch.jsonl');
const shotPath = join(repoRoot, 'out', 'p39-openwith.png');

// A run that fails before the capture must not leave the PREVIOUS run's
// image behind. On 2026-08-15 three runs invoked as `node
// build/probe-openwith.mjs` died at "electron: command not found", wrote no
// image, and left an older capture of an app with no project open on disk.
// Its md5 was identical across all three, which read as a deterministic bad
// capture rather than as no capture at all. Deleting it first makes a missing
// image the visible symptom.
rmSync(shotPath, { force: true });

const rels = exts.map((ext) => `p39-sample.${ext}`);
for (const rel of rels) {
  // Empty is enough. LaunchServices answers on the extension, not the bytes.
  writeFileSync(join(project, rel), '', 'utf8');
}

const drive = {
  projectPath: project,
  sidebarView: 'explorer',
  treeOps: {
    // Required by the type and unused on the openWith branch. The probe
    // never creates a folder by this name.
    scratchDir: 'p39-unused',
    openWith: noLaunch
      ? { rels, settleMs }
      : { rels, launchRel: rels[0], recordPath, settleMs }
  }
};

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

console.log(`[probe:openwith] extensions ${exts.join(', ')}`);
console.log(`[probe:openwith] project ${project}`);

execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit' });

const inner = [
  'electron .',
  `--user-data-dir="${join(root, 'profile')}"`,
  '-ApplePersistenceIgnoreState YES'
].join(' ');

/**
 * The one minute load average, read either side of the run. A timing failure
 * is only readable next to it, because the budget is known to break at about
 * load average 116 and to hold to about 82.
 */
const loadBefore = loadavg()[0];

const run = spawnSync(
  process.execPath,
  [join(repoRoot, 'build', 'harness-socket.mjs'), 'gmux-p39', inner],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      // `npm run probe:openwith` puts this on PATH and a bare `node
      // build/probe-openwith.mjs` does not, so the inner shell that the
      // tmux harness starts could not find `electron` at all. Adding it here
      // makes both spellings work.
      PATH: `${join(repoRoot, 'node_modules', '.bin')}:${process.env['PATH'] ?? ''}`,
      GMUX_SHOT: shotPath,
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      GMUX_OPEN_WITH_RECORD: recordPath
    }
  }
);

const loadAfter = loadavg()[0];

const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
process.stdout.write(output);

/** Appended to every timing failure, and printed once with the table. */
const loadNote =
  `load average ${loadBefore.toFixed(1)} before the run and ` +
  `${loadAfter.toFixed(1)} after`;

// ---------------------------------------------------------------------------
// Reading the evidence back
// ---------------------------------------------------------------------------

/** The last `treeOps result {…}` line the renderer printed. */
function readResult(text) {
  const marker = 'treeOps result ';
  let found = null;
  for (const line of text.split('\n')) {
    const at = line.indexOf(marker);
    if (at === -1) continue;
    try {
      found = JSON.parse(line.slice(at + marker.length));
    } catch {
      // A truncated line is not a result. Keep the last complete one.
    }
  }
  return found;
}

const result = readResult(output);
if (result === null) {
  console.error('[probe:openwith] the renderer printed no treeOps result');
  process.exit(1);
}

/**
 * The per-extension table. driveOpenWith reports it as one step named
 * '39: the readings' whose detail is the JSON array, because a step's detail
 * is the only field shot-hook prints verbatim.
 */
function readReadings(steps) {
  const step = (steps ?? []).find((s) => s.name === '39: the readings');
  if (step === undefined) return [];
  try {
    return JSON.parse(step.detail);
  } catch {
    return [];
  }
}

const readings = readReadings(result.steps);
const failures = [];

console.log('');
console.log(`[probe:openwith] ${loadNote}`);
console.log('  file                 cold ms   warm ms  status       labels');
console.log('  -------------------- --------  -------  -----------  ------');
for (const row of readings) {
  console.log(
    `  ${row.rel.padEnd(20)} ${String(row.coldMs).padStart(8)}  ` +
      `${String(row.warmMs).padStart(7)}  ${String(row.status).padEnd(11)}  ` +
      row.labels.join(' | ')
  );
  if (!(row.coldMs >= 0 && row.coldMs < budgetMs)) {
    failures.push(
      `${row.rel} built cold in ${row.coldMs} ms, budget ${budgetMs} ms, ` +
        `${loadNote}. The budget was measured holding to about load average ` +
        `82 and breaking at about 116`
    );
  }
  if (!(row.warmMs >= 0 && row.warmMs < budgetMs)) {
    failures.push(
      `${row.rel} built warm in ${row.warmMs} ms, budget ${budgetMs} ms, ` +
        `${loadNote}. The budget was measured holding to about load average ` +
        `82 and breaking at about 116`
    );
  }
}

console.log('');
if (noLaunch) {
  console.log('[probe:openwith] --no-launch, so no argv was recorded');
} else if (existsSync(recordPath)) {
  const line = readFileSync(recordPath, 'utf8').trim().split('\n').pop() ?? '';
  console.log(`[probe:openwith] recorded launch ${line}`);
  let recorded = null;
  try {
    recorded = JSON.parse(line);
  } catch {
    recorded = null;
  }
  const args = recorded?.args ?? [];
  const shaped =
    recorded?.bin === '/usr/bin/open' &&
    args.length === 3 &&
    args[0] === '-a' &&
    String(args[1]).endsWith('.app') &&
    String(args[2]) === join(project, rels[0]);
  if (!shaped) failures.push('the recorded launch argv is not the expected shape');
} else {
  failures.push('main recorded no launch');
}

for (const step of result.steps ?? []) {
  if (!step.ok) failures.push(`${step.name}: ${step.detail}`);
}

if (existsSync(shotPath)) {
  console.log(`[probe:openwith] screenshot ${shotPath}`);
} else {
  failures.push(
    `no screenshot was written to ${shotPath}, so this run photographed nothing`
  );
}
if (!keep) rmSync(root, { recursive: true, force: true });

const named = [...new Set(failures)];
if (named.length > 0) {
  console.error('');
  for (const failure of named) console.error(`[probe:openwith] FAIL ${failure}`);
  process.exit(1);
}
console.log(`[probe:openwith] every reading inside the budget, ${loadNote}`);
