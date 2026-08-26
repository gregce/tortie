#!/usr/bin/env node
/**
 * probe-p63-arch.mjs. The runner for the Architecture view's shot drive.
 *
 * ## Why this file exists, said plainly
 *
 * `src/renderer/arch/shot-probe.ts` was written as the place research 49
 * section 9.6 gets checked. That section says, in its own words, that the
 * header "is expected to fit at the 220 px minimum. That is an estimate from
 * the layout rules, not a measurement, because nobody launched the app in this
 * workflow, and the first slice's Tier 2 screenshot probe is where it gets
 * checked."
 *
 * The drive landed. The runner did not. `src/renderer/app/probe-registry.ts`
 * named `build/probe-p63-arch.mjs` as its reader and no such file was ever
 * written, so the phase's own proof item, being one live app run and the width
 * measurement, had no way to be run. This is that file.
 *
 * ## ONE app run, three widths, and that is deliberate
 *
 * The house rule is one app launch per phase rather than one per claim. The
 * drive is exposed on the window as `__gmuxShotDrive`, so this probe launches
 * once and calls it again for each width from inside `GMUX_SHOT_JS`. Every
 * reading below comes out of one Electron.
 *
 * The readings, in the order they are taken:
 *
 *   1. 340 px, the comfortable width, with a subject selected so the prose
 *      panel is on screen.
 *   2. 260 px, the container query's own boundary.
 *   3. 220 px, THE ONE THAT HAS TO WORK, because it is the sidebar's floor in
 *      src/renderer/styles/app.css and the width section 9.6 guessed about.
 *   4. 220 px again with the teaching empty state drawn instead of a loaded
 *      contract, because that surface is the one a person meets first.
 *   5. 340 px again, this time clicking a real offending row, so the
 *      jump-to-line claim is driven through the shipped gesture.
 *
 * ## What it asserts, rather than prints
 *
 *  - The header title is NOT clipped at any of the three widths. That is
 *    section 9.6's estimate, measured.
 *  - The row's name and its provenance glyph survive at 220 px.
 *  - The provenance WORD is present at 340 px and gone at 220 px, which is the
 *    one responsive rule this view has, written as a container query at
 *    src/renderer/arch/arch.css:336.
 *  - The seeding prompt composes the same bytes twice and sends nothing.
 *  - Nothing on the surface rendered HTML somebody else wrote.
 *
 * Everything else is printed as a number for a reader to judge.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - The one Electron goes through build/electron-run.mjs, which ends the
 *    whole tree it started in a `finally` block whatever happened here. That
 *    is what `npm run gate:electron` enforces and it is why this file signals
 *    nothing itself.
 *  - HOME is a scratch directory. Nothing under the person's home is opened.
 *  - It creates no session, spawns no agent and writes no file into the
 *    repository. The drive stages fixtures in a store.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p63-arch 'node build/probe-p63-arch.mjs'
 *
 * ## Environment it reads
 *
 *   P63_OUT_DIR  where the picture and the JSON go. Default out/p63.
 *
 * Exit 0 when every reading was taken and every assertion held. 1 when one did
 * not. 2 when the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p63]';
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
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of my ' +
      "own: node build/harness-socket.mjs gmux-p63-arch 'node " +
      "build/probe-p63-arch.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const outDir = resolve(
  repoRoot,
  (process.env['P63_OUT_DIR'] ?? '').trim() || 'out/p63'
);
mkdirSync(outDir, { recursive: true });

const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p63-arch');
mkdirSync(join(rawRoot, 'home'), { recursive: true });
mkdirSync(join(rawRoot, 'profile'), { recursive: true });
const root = realpathSync(rawRoot);
const home = join(root, 'home');

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  if (out.status !== 0) return 0;
  return out.stdout.split('\n').filter((l) => l.trim() !== '').length;
}

const sessionsBefore = operatorSessionCount();
say(`operator sessions before: ${String(sessionsBefore)}`);

// ---------------------------------------------------------------------------
// The one launch
// ---------------------------------------------------------------------------

/**
 * The widths, and what each one is for. The last two entries re-drive the
 * SAME window, which is why there is one launch rather than five.
 */
const STEPS = [
  { label: 'w340', spec: { width: 340, select: 'component:tmux-layer' } },
  { label: 'w260', spec: { width: 260, select: 'component:tmux-layer' } },
  { label: 'w220', spec: { width: 220, select: 'component:tmux-layer' } },
  { label: 'w220-empty', spec: { width: 220, empty: true } },
  {
    label: 'w340-jump',
    spec: { width: 340, select: 'component:tmux-layer', jump: true }
  }
];

// Step 1 runs as the launch drive. Steps 2 onward run inside the window,
// through the very same hook, with a marker line before each so the console
// stream can be read back unambiguously.
const launchDrive = {
  projectPath: repoRoot,
  arch: { ...STEPS[0].spec, seed: true }
};

const rest = STEPS.slice(1);

/**
 * THE CHORD MEASUREMENT, and it is a differential inside one session.
 *
 * The verification round found ⌃⇧A with no renderer keydown branch, unlike the
 * two sibling chords the phase says it joins, and measured it by sending the
 * identical synthetic event for all three: ⌃⇧C moved the view, ⌃⇧G moved the
 * view, ⌃⇧A left it where it was. The reading only means anything as a
 * difference, so all three are sent here, in one session, by one code path.
 *
 * The event is dispatched on `window` because that is where the ladder listens,
 * in the capture phase. Nothing about the menu is involved: the point of the
 * finding is that a chord which exists ONLY as a native accelerator never runs,
 * for the reason src/renderer/terminal/keys/index.ts:10-15 records.
 */
const CHORDS = [
  ['g', 'scm'],
  ['c', 'context'],
  ['a', 'arch']
];

const probeJs = `(async () => {
  const steps = ${JSON.stringify(rest)};
  const done = [];
  for (const step of steps) {
    console.log('[p63-step] ' + step.label);
    await window.__gmuxShotDrive({ arch: step.spec });
    done.push(step.label);
    await new Promise((r) => setTimeout(r, 200));
  }
  const viewNow = () =>
    document.querySelector('.sidebar-view')?.getAttribute('data-view') ?? null;
  const chords = [];
  for (const [key, want] of ${JSON.stringify(CHORDS)}) {
    const before = viewNow();
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: key.toUpperCase(),
        code: 'Key' + key.toUpperCase(),
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
    );
    await new Promise((r) => setTimeout(r, 500));
    const after = viewNow();
    chords.push({ key, want, before, after, moved: before !== after });
  }
  return { drove: done, chords, sidebar: Math.round(
    (document.querySelector('.sidebar')?.getBoundingClientRect().width) || 0
  ) };
})()`;

const png = join(outDir, 'p63-arch.png');

say('launch');
const { code, text } = await runElectron({
  label: 'p63 arch',
  userDataDir: join(root, 'profile'),
  cwd: repoRoot,
  tmuxSocket: socket,
  env: {
    ...process.env,
    HOME: home,
    GMUX_SHOT: png,
    GMUX_SHOT_DELAY_MS: '9000',
    GMUX_SHOT_VERBOSE: '1',
    GMUX_SHOT_DRIVE: JSON.stringify(launchDrive),
    GMUX_SHOT_JS: probeJs
  },
  ceilingMs: 300_000,
  settleMs: 500
});

const sessionsAfter = operatorSessionCount();
say(`operator sessions after: ${String(sessionsAfter)}`);

// ---------------------------------------------------------------------------
// Reading the run back
// ---------------------------------------------------------------------------

/**
 * The drive prints one `[arch-probe] measure: {…}` line per call, and this
 * probe prints one `[p63-step] <label>` line before every call after the
 * first. Walking the stream in order therefore labels every measurement
 * without counting on how many lines the app wrote between them.
 */
function readMeasurements(stdout) {
  const found = [];
  let label = STEPS[0].label;
  for (const line of stdout.split('\n')) {
    const step = /\[p63-step\] (\S+)/.exec(line);
    if (step !== null) {
      label = step[1];
      continue;
    }
    const m = /\[arch-probe\] measure: (\{.*\})\s*$/.exec(line);
    if (m === null) continue;
    try {
      found.push({ label, m: JSON.parse(m[1]) });
    } catch {
      /* a truncated tee line is not a measurement */
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

/** The value `GMUX_SHOT_JS` returned, printed by main as one line. */
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

const measurements = readMeasurements(text);
const value = readProbeValue(text);
const chords = Array.isArray(value?.chords) ? value.chords : [];
const seedLines = readLines(text, 'seed');
const jumpLines = readLines(text, 'jump');
const divergenceLines = readLines(text, 'divergences');

const by = (label) => measurements.find((r) => r.label === label)?.m ?? null;

const failures = [];
const check = (ok, why) => {
  if (!ok) failures.push(why);
};

check(code === 0, `the app exited ${String(code)} rather than 0`);
check(
  sessionsAfter === sessionsBefore,
  `the operator's session count moved from ${String(sessionsBefore)} to ${String(sessionsAfter)}`
);
check(
  measurements.length === STEPS.length,
  `expected ${String(STEPS.length)} measurements and read ${String(measurements.length)}`
);

for (const label of ['w340', 'w260', 'w220']) {
  const m = by(label);
  if (m === null) {
    failures.push(`no measurement at ${label}`);
    continue;
  }
  // Section 9.6's estimate, measured. This is the whole reason the file exists.
  check(
    m.headerTitleClipped === false,
    `${label}: the header title is CLIPPED, so section 9.6's estimate is wrong`
  );
  check(m.header > 0, `${label}: the view header has no width`);
  check(m.headerActions >= 1, `${label}: the header lost its control`);
  check(
    typeof m.rowName === 'string' && m.rowName.length > 0,
    `${label}: the row lost its name`
  );
  check(m.provGlyph === true, `${label}: the row lost its provenance glyph`);
  check(m.rawHtmlNodes === 0, `${label}: something rendered raw HTML`);
}

const wide = by('w340');
const floor = by('w220');
if (wide !== null && floor !== null) {
  check(
    wide.provWord === true,
    'w340: the provenance word is missing at a comfortable width'
  );
  check(
    floor.provWord === false,
    'w220: the provenance word survived the container query at the floor'
  );
}

const emptyAtFloor = by('w220-empty');
if (emptyAtFloor !== null) {
  check(
    emptyAtFloor.lanes === 0,
    'w220-empty: the verdict strip drew lanes over the teaching state'
  );
  check(
    emptyAtFloor.header > 0,
    'w220-empty: the teaching state lost the view header'
  );
}

check(
  seedLines.some((l) => l.includes('deterministic=true')),
  'the seeding prompt did not compose the same bytes twice'
);

check(
  chords.length === CHORDS.length,
  `expected ${String(CHORDS.length)} chord readings and read ${String(chords.length)}`
);
for (const row of chords) {
  check(
    row.after === row.want,
    `Ctrl+Shift+${String(row.key).toUpperCase()} left the sidebar on ${String(
      row.before
    )} and wanted ${String(row.want)}, reading ${String(row.after)}`
  );
  check(
    row.moved === true,
    `Ctrl+Shift+${String(row.key).toUpperCase()} moved nothing, which is the Phase 22 defect`
  );
}

const report = {
  at: new Date().toISOString(),
  commit:
    spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8'
    }).stdout.trim() || null,
  exitCode: code,
  sessionsBefore,
  sessionsAfter,
  png: existsSync(png) ? png : null,
  measurements,
  chords,
  seed: seedLines,
  jump: jumpLines,
  divergences: divergenceLines,
  failures
};
const reportPath = join(outDir, 'p63-arch.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('');
console.log(`${TAG} the readings, one row per width`);
for (const row of measurements) {
  const m = row.m;
  console.log(
    `${TAG}   ${row.label.padEnd(11)} sidebar=${String(m.sidebar)} header=${String(
      m.header
    )} title=${String(m.headerTitle)} clipped=${String(
      m.headerTitleClipped
    )} rowH=${String(m.row)} provWord=${String(m.provWord)} provGlyph=${String(
      m.provGlyph
    )} lanes=${String(m.lanes)} offending=${String(m.offending)}`
  );
}
for (const row of chords) {
  console.log(
    `${TAG}   chord Ctrl+Shift+${String(row.key).toUpperCase()} ${String(
      row.before
    )} -> ${String(row.after)} moved=${String(row.moved)}`
  );
}
for (const line of seedLines) console.log(`${TAG}   seed: ${line}`);
for (const line of jumpLines) console.log(`${TAG}   jump: ${line}`);
for (const line of divergenceLines) {
  console.log(`${TAG}   divergences: ${line}`);
}
console.log(`${TAG} report ${reportPath}`);
if (report.png !== null) console.log(`${TAG} picture ${report.png}`);

if (failures.length > 0) {
  console.error('');
  for (const f of failures) console.error(`${TAG} FAIL ${f}`);
  process.exit(1);
}
say('every reading taken and every assertion held');
