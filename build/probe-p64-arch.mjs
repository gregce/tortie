#!/usr/bin/env node
/**
 * probe-p64-arch.mjs. THE APP RUN Phase 64 owed and did not have.
 *
 * ## Why this file exists, said plainly
 *
 * Phase 64's charter asks for "one app run that drives every item, per
 * CLAUDE.md's rule of one app run per phase". The only Electron the phase
 * shipped was `npm run probe:p64`, a MAIN PROCESS harness that opens no window.
 * So `ArchModules.tsx`, `arch-modules.css` and the `arch:modules` channel had
 * never been rendered in a running app by anybody, and the picker chord had
 * never been pressed in one. This is that run, in the shape
 * `build/probe-p63-arch.mjs` beside it already uses.
 *
 * ## It builds a repository rather than pointing at one
 *
 * The level 2 view is the one surface here that MAIN answers. It reads a real
 * `docs/arch/`, runs a real `git ls-files`, and takes its edges from the import
 * captures a real check wrote into the arch database. None of that can be
 * staged in a store, and this worktree carries no `docs/arch/` of its own, so
 * the probe writes a small repository into its own scratch directory, commits
 * it, and drives the app against that. Two parts, on purpose:
 *
 *   `small`  6 files, under the 30 file cap, so it draws BOXES.
 *   `wide`   36 files, over it, so it falls back to the dependency MATRIX.
 *
 * That is the caps falling back on a screen a person could have looked at,
 * which is a different claim from `npm run conformance:arch:modules` proving
 * the same rule over arrays. Both are worth having and neither replaces the
 * other.
 *
 * ## The chord, and how the native menu is caught
 *
 * `setMenu` has exactly one implementation and it reaches
 * `window.gmux.popupMenu`, which is the `ui:popupMenu` bridge and
 * `Menu.buildFromTemplate().popup()`. A native macOS popup cannot be read or
 * photographed from outside the app, measured in Phases 119, 152 and 153.
 *
 * THE RECORDER SITS AT `installShellOps` AND NOT AT THE BRIDGE. Wrapping
 * `window.gmux.popupMenu` from the page does nothing at all: `contextBridge`
 * under `contextIsolation: true` freezes that object, so the assignment is
 * silently discarded, the real bridge runs, and a REAL macOS popup opens over
 * the window and waits for a person who is not there. That is what held the
 * first version of this file open until its ceiling. `installShellOps` is the
 * seam `setMenu` already goes through and the store already exports it, so the
 * recorder is put in for the length of the press and taken out again in a
 * finally.
 *
 * What that proves is the chain from a real keydown to the rows a native menu
 * would have been built from, and that nothing was drawn in the DOM, because
 * the DOM node count and the `[role=menu]` count are both read across the
 * press. What it does NOT prove is the last hop, being `showNativeMenu` to
 * `ui:popupMenu` to `Menu.buildFromTemplate().popup()`, and this run does not
 * claim it. `src/renderer/arch/shot-probe.ts` says the same on the `aim` field.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - The one Electron goes through build/electron-run.mjs, which ends the tree
 *    it started in a `finally` block whatever happened here.
 *  - HOME is a scratch directory. Nothing under the person's home is opened.
 *  - It creates no session, spawns no agent, sends nothing to an agent and
 *    presses no Return. The chord's rows are recorded rather than shown, so no
 *    row is ever picked and no native popup is ever opened.
 *  - The scratch repository it writes lives under its own directory and is
 *    removed at the end.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p64-arch 'node build/probe-p64-arch.mjs'
 *
 * Exit 0 when every reading was taken and every assertion held. 1 when one did
 * not. 2 when the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p64]';
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
      "own: node build/harness-socket.mjs gmux-p64-arch 'node " +
      "build/probe-p64-arch.mjs'"
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
  (process.env['P64_OUT_DIR'] ?? '').trim() || 'out/p64'
);
mkdirSync(outDir, { recursive: true });

const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p64-arch');
mkdirSync(join(rawRoot, 'home'), { recursive: true });
mkdirSync(join(rawRoot, 'profile'), { recursive: true });
const root = realpathSync(rawRoot);
const home = join(root, 'home');
const project = join(root, 'repo');

// ---------------------------------------------------------------------------
// The repository the level 2 view is computed over
// ---------------------------------------------------------------------------

/** How many files each part holds. The first is under the box cap, the second over. */
const SMALL = 6;
const WIDE = 36;

function writeRepo() {
  rmSync(project, { recursive: true, force: true });
  const write = (rel, body) => {
    const at = join(project, rel);
    mkdirSync(dirname(at), { recursive: true });
    writeFileSync(at, body);
  };

  // A chain of real imports, so the interior edges are real captures rather
  // than a planted table. Each file imports the one before it, and the first
  // of each part imports nothing, which also gives the matrix an isolated row
  // to report.
  for (let i = 0; i < SMALL; i += 1) {
    const before = i === 0 ? '' : `import { v${String(i - 1)} } from './m${String(i - 1)}';\n`;
    write(
      `src/small/m${String(i)}.ts`,
      `${before}export const v${String(i)} = ${String(i)}${i === 0 ? '' : ' + v' + String(i - 1)};\n`
    );
  }
  for (let i = 0; i < WIDE; i += 1) {
    const before = i === 0 ? '' : `import { w${String(i - 1)} } from './w${String(i - 1)}';\n`;
    write(
      `src/wide/w${String(i)}.ts`,
      `${before}export const w${String(i)} = ${String(i)}${i === 0 ? '' : ' + w' + String(i - 1)};\n`
    );
  }

  write(
    'docs/arch/contract.json',
    `${JSON.stringify(
      {
        version: 1,
        subject: 'The repository build/probe-p64-arch.mjs writes for its own app run.',
        strictness: 'not-wrong',
        // THREE, and it is a floor rather than a taste. `src/main/arch/
        // schema.ts` refuses a contract with fewer and drops every component
        // with it, which is how this probe's first run reported an unknown
        // part for a part that was right there on disk.
        layers: [
          { id: 'engine', name: 'engine', order: 0 },
          { id: 'surface', name: 'surface', order: 1 },
          { id: 'foundation', name: 'foundation', order: 2 }
        ],
        flows: []
      },
      null,
      2
    )}\n`
  );
  const part = (id, dir, layer, description) => ({
    id,
    name: id,
    kind: 'component',
    layer,
    provenance: 'first-party',
    anchors: [`src/${dir}`],
    boundary: 'closed',
    description,
    evidence: [],
    deprecated: false,
    gaps: []
  });
  write(
    'docs/arch/components/small.json',
    `${JSON.stringify(part('small', 'small', 'engine', 'Under the box cap.'), null, 2)}\n`
  );
  write(
    'docs/arch/components/wide.json',
    `${JSON.stringify(part('wide', 'wide', 'surface', 'Over the box cap.'), null, 2)}\n`
  );
  write(
    'docs/arch/edges.json',
    `${JSON.stringify(
      {
        edges: [
          {
            id: 'wide-must-not-small',
            from: 'wide',
            to: 'small',
            kind: 'imports',
            rule: 'must-not',
            checker: 'imports',
            label: 'never',
            note: 'A promise with nothing crossing it.',
            evidence: []
          }
        ]
      },
      null,
      2
    )}\n`
  );
  write('package.json', `${JSON.stringify({ name: 'p64-probe-repo', version: '0.0.0' }, null, 2)}\n`);

  const git = (...args) =>
    spawnSync('git', ['-C', project, ...args], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home, GIT_CONFIG_GLOBAL: '/dev/null' }
    });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'probe@example.invalid');
  git('config', 'user.name', 'p64 probe');
  git('add', '-A');
  const done = git('commit', '-qm', 'the repository this probe measures');
  if (done.status !== 0) {
    refuse(`could not commit the scratch repository: ${done.stderr.trim()}`);
  }
}

writeRepo();
say(`scratch repository written at ${project}`);

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

const launchDrive = {
  projectPath: project,
  arch: { width: 340, live: true, cwd: project, check: true, modules: 'small' }
};

const probeJs = `(async () => {
  const project = ${JSON.stringify(project)};
  const nodes = () => document.querySelectorAll('*').length;
  const domMenus = () =>
    document.querySelectorAll('[role=menu], .context-menu, .dom-menu').length;

  // The second drawing, through the same hook and the same window.
  console.log('[p64-step] wide');
  await window.__gmuxShotDrive({
    arch: { width: 340, live: true, cwd: project, modules: 'wide' }
  });

  // A part the contract does not have, which a stale selection produces.
  console.log('[p64-step] gone');
  await window.__gmuxShotDrive({
    arch: { width: 340, live: true, cwd: project, modules: 'no-such-part' }
  });

  // THE CHORD. It is measured as a DIFFERENCE, exactly as Phase 63's probe
  // measures its three, because a reading that the aiming chord did something
  // only means anything beside a reading that this window's keyboard ladder is
  // live at all. Control-Shift-G moves the sidebar view and is that control.
  const viewNow = () =>
    document.querySelector('.sidebar-view')?.getAttribute('data-view') ?? null;
  console.log('[p64-step] control chord');
  const viewBefore = viewNow();
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'G',
      code: 'KeyG',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true
    })
  );
  await new Promise((r) => setTimeout(r, 800));
  const viewAfter = viewNow();

  // THE AIMING CHORD ITSELF. It is pressed inside the drive, which records the
  // one door setMenu opens for the length of the press and takes the recorder
  // out again in a finally. See ArchProbeSpec.aim for why the recorder cannot
  // sit on window.gmux.popupMenu: that object is frozen by contextBridge, the
  // assignment does nothing, and a REAL macOS popup opens over the window and
  // waits for a person who is not there.
  console.log('[p64-step] aim chord');
  await window.__gmuxShotDrive({ arch: { live: true, cwd: project, aim: true } });

  return {
    control: { before: viewBefore, after: viewAfter, moved: viewBefore !== viewAfter }
  };
})()`;

const png = join(outDir, 'p64-arch.png');

say('launch');
const { code, text } = await runElectron({
  label: 'p64 arch',
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

function readModules(stdout) {
  const found = [];
  for (const line of stdout.split('\n')) {
    const m = /\[arch-probe\] modules: (\{.*\})\s*$/.exec(line);
    if (m === null) continue;
    try {
      found.push(JSON.parse(m[1]));
    } catch {
      /* a truncated tee line is not a measurement */
    }
  }
  return found;
}

function readAim(stdout) {
  let found = null;
  for (const line of stdout.split('\n')) {
    const m = /\[arch-probe\] aim: (\{.*\})\s*$/.exec(line);
    if (m === null) continue;
    try {
      found = JSON.parse(m[1]);
    } catch {
      /* a truncated tee line is not a measurement */
    }
  }
  return found;
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

const modules = readModules(text);
const value = readProbeValue(text);
const aim = readAim(text);

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
  modules.length === 3,
  `expected 3 level 2 readings and read ${String(modules.length)}`
);

const byPart = (id) => modules.find((m) => m.part === id) ?? null;

const small = byPart('small');
if (small === null) failures.push('no reading for the part under the box cap');
else {
  check(small.present === true, 'small: the level 2 section did not render at all');
  check(small.grade === 'boxes', `small: drew ${String(small.grade)} rather than boxes`);
  check(small.drawing === 'boxes', `small: the body says ${String(small.drawing)}`);
  check(
    small.boxes === SMALL,
    `small: ${String(small.boxes)} boxes on screen rather than ${String(SMALL)}`
  );
  check(small.countBadges === 0, 'small: a box grew a count badge');
  check(small.rawHtmlNodes === 0, 'small: something rendered raw HTML');
  check(
    typeof small.sentences === 'string' && small.sentences.includes('import'),
    'small: the sentence under the drawing does not say how many imports'
  );
}

const wide = byPart('wide');
if (wide === null) failures.push('no reading for the part over the box cap');
else {
  check(wide.grade === 'matrix', `wide: drew ${String(wide.grade)} rather than the matrix`);
  check(wide.boxes === 0, `wide: ${String(wide.boxes)} boxes drawn past the cap`);
  check(
    wide.matrixLabels > 0,
    'wide: the matrix drew no rows, so the fallback did not fire on screen'
  );
  check(wide.rawHtmlNodes === 0, 'wide: something rendered raw HTML');
}

const gone = byPart('no-such-part');
if (gone === null) failures.push('no reading for a part the contract does not have');
else {
  // The note the verifier raised: an unknown part is not a drawing, so the
  // attribute a probe keys on must not claim one.
  check(
    gone.grade === 'unknown',
    `a part the contract does not have reported data-grade=${String(gone.grade)}`
  );
  check(gone.boxes === 0, 'a part the contract does not have drew boxes');
}

check(value !== null, 'the page returned no value at all');
if (value !== null) {
  // The control first. Without it a chord that raised nothing cannot be told
  // apart from a window whose keyboard ladder was never installed.
  check(
    value.control?.after === 'scm',
    `the control chord left the sidebar on ${String(value.control?.after)} rather than scm, so this window's keyboard ladder is what failed rather than the aiming chord`
  );
}

check(aim !== null, 'the aiming chord was never measured at all');
if (aim !== null) {
  check(
    aim.raised === 1,
    `the aiming chord opened ${String(aim.raised)} menus rather than 1`
  );
  check(
    (aim.rows?.[0] ?? []).length > 0,
    'the aiming chord opened a menu with no rows in it'
  );
  check(
    aim.before.domMenus === 0 && aim.after.domMenus === 0,
    'a menu was drawn in the DOM, which DESIGN.md section 3 forbids'
  );
  check(
    aim.domNodesAdded === 0,
    `the aiming chord added ${String(aim.domNodesAdded)} DOM nodes, so something was drawn in the page`
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
  repo: { project, small: SMALL, wide: WIDE },
  modules,
  control: value,
  aim,
  failures
};
writeFileSync(join(outDir, 'p64-arch.json'), `${JSON.stringify(report, null, 2)}\n`);

for (const m of modules) {
  say(
    `${String(m.part).padEnd(14)} grade=${String(m.grade).padEnd(8)} boxes=${String(m.boxes).padStart(3)} matrix=${String(m.matrixLabels).padStart(3)} rank=${String(m.rankRows).padStart(3)}`
  );
}
if (aim !== null) {
  say(
    `aim chord: ${String(aim.raised)} menu(s), DOM menus ${String(aim.after.domMenus)}, DOM nodes added ${String(aim.domNodesAdded)}`
  );
  for (const rows of aim.rows ?? []) say(`  menu rows: ${rows.join(' | ')}`);
}

rmSync(project, { recursive: true, force: true });

if (failures.length > 0) {
  for (const f of failures) console.error(`${TAG} FAIL ${f}`);
  console.error(`${TAG} ${String(failures.length)} assertion(s) failed. ${join(outDir, 'p64-arch.json')}`);
  process.exit(1);
}
say(
  `PASS. every level 2 drawing rendered over a real repository, and the chord ` +
    `reached the one door a native menu is built from with nothing drawn in the ` +
    `page. ${join(outDir, 'p64-arch.json')}`
);
