#!/usr/bin/env node
/**
 * probe-p135-chrome.mjs. Phase 135 item three, the design step.
 *
 * WHAT IT DOES. It launches the real app once per run, moves the projects to
 * the left by pressing the shipped position button, and writes one PNG plus
 * one set of measured rectangles. The design step runs it three times against
 * three trees, being the tree as it is today, the tree with treatment A in it,
 * and the tree with treatment B in it. That is how the two candidates get a
 * photograph beside them instead of a description.
 *
 * HOW IT DRIVES. The position button is a shipped control in the document and
 * the probe clicks it. Hiding the sidebar is done with the shipped Command B
 * chord on window. No renderer driver module was added for this phase.
 *
 * ENVIRONMENT IT READS.
 *   P135_LABEL          the name that goes in the PNG file name. Required.
 *   P135_OUT_DIR        where the PNG is written. Required.
 *   P135_HIDE_SIDEBAR   set to 1 to press Command B after the move.
 *   P135_STAY_TOP       set to 1 to leave the projects on top.
 *
 * SAFETY, ABSOLUTE. It runs on the socket build/harness-socket.mjs gave it,
 * which that script refuses to let be `gmux` or `default`. It uses its own
 * user data directory and its own scratch projects. It names `-L gmux` in
 * exactly one place, a read only session count taken before and after, which
 * must match. No pkill, no kill-server, and only the pid it spawned is ended.
 *
 * Usage, from the worktree root:
 *
 *   npm run build
 *   P135_LABEL=before P135_OUT_DIR=/some/dir \
 *     node build/harness-socket.mjs gmux-p135-chrome \
 *       'node build/probe-p135-chrome.mjs'
 *
 * Exit code 0 when the launch produced a picture and a reading. 1 when it did
 * not. 2 when the probe refuses to run at all.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p135chrome]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p135-chrome 'node " +
      "build/probe-p135-chrome.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const label = (process.env['P135_LABEL'] ?? '').trim();
if (label === '') refuse('no P135_LABEL. I will not write an unnamed picture.');
const outDir = (process.env['P135_OUT_DIR'] ?? '').trim();
if (outDir === '') refuse('no P135_OUT_DIR.');
mkdirSync(outDir, { recursive: true });

const hideSidebar = process.env['P135_HIDE_SIDEBAR'] === '1';
const stayTop = process.env['P135_STAY_TOP'] === '1';

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

// ---------------------------------------------------------------------------
// Three scratch projects, so the rail has rows in it
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'gmux-p135-chrome');
rmSync(rawRoot, { recursive: true, force: true });
const names = ['tortie', 'notes', 'website'];
for (const name of names) mkdirSync(join(rawRoot, name, 'src'), { recursive: true });
const root = realpathSync(rawRoot);
const projects = names.map((n) => join(root, n));
for (const [i, dir] of projects.entries()) {
  writeFileSync(
    join(dir, 'README.md'),
    ['# Phase 135', '', `Scratch project ${String(i + 1)}.`, ''].join('\n'),
    'utf8'
  );
  writeFileSync(join(dir, 'src', 'index.ts'), 'export const one = 1;\n', 'utf8');
  writeFileSync(join(dir, 'src', 'view.ts'), 'export const two = 2;\n', 'utf8');
}

// ---------------------------------------------------------------------------
// The one expression the driven window evaluates
// ---------------------------------------------------------------------------

const PROBE_JS = `(async () => {
  const q = (s) => document.querySelector(s);
  const box = (el) => { if (el === null || el === undefined) return null;
    const r = el.getBoundingClientRect();
    return { left: +r.left.toFixed(1), top: +r.top.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) }; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = (el) => { if (el === null || el === undefined) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); return true; };
  const positionBtn = () => q('[data-slot="project-rail"] .projects-position') ?? q('[data-slot="project-tabs"] .projects-position');
  const read = () => ({
    rail: box(q('[data-slot="project-rail"]')),
    activityBar: box(q('[data-slot="activity-bar"]')),
    activityClass: (q('[data-slot="activity-bar"]') ?? { className: null }).className,
    activityInSidebar: q('[data-slot="sidebar"] [data-slot="activity-bar"]') !== null,
    sidebar: box(q('[data-slot="sidebar"]')),
    workArea: box(q('.work-area')),
    terminal: box(q('.center')),
    items: Array.from(document.querySelectorAll('[data-slot="activity-bar"] .ab-item')).map((n) => ({ label: n.getAttribute('aria-label'), box: box(n) })),
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight
  });
  await wait(500);
  const before = read();
  let moved = false;
  if (${String(!stayTop)}) {
    moved = click(positionBtn());
    await wait(900);
  }
  if (${String(hideSidebar)}) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', code: 'KeyB', metaKey: true, bubbles: true, cancelable: true }));
    await wait(900);
  }
  const after = read();
  return { moved, before, after };
})()`;

// ---------------------------------------------------------------------------
// The launch
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');
const out = join(outDir, `p135-${label}.png`);
rmSync(out, { force: true });

const drive = {
  projectPath: projects[0],
  extraProjects: [projects[1], projects[2]],
  sidebarView: 'explorer'
};

say(`launch ${label}`);
const child = spawn(
  electronBin,
  [
    '.',
    `--user-data-dir=${join(root, 'profile')}`,
    '-ApplePersistenceIgnoreState',
    'YES'
  ],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: out,
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '11000',
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      GMUX_SHOT_JS: PROBE_JS
    }
  }
);

let text = '';
const onText = (chunk) => {
  process.stdout.write(chunk);
  text += chunk;
};
child.stdout.on('data', (b) => { onText(b.toString()); });
child.stderr.on('data', (b) => { onText(b.toString()); });

const code = await new Promise((r) => {
  const watchdog = setTimeout(() => {
    console.error(`${TAG} ${label} passed its ceiling. Ending the pid I started.`);
    child.kill('SIGTERM');
  }, 180_000);
  child.on('error', (err) => {
    clearTimeout(watchdog);
    console.error(`${TAG} electron could not start: ${err.message}`);
    r(1);
  });
  child.on('exit', (c) => {
    clearTimeout(watchdog);
    setTimeout(() => { r(c ?? 1); }, 750);
  });
});
child.stdout.destroy();
child.stderr.destroy();

const failures = [];
const marker = '[gmux-shot] probe ';
const at = text.lastIndexOf(marker);
let report = null;
if (at !== -1) {
  try {
    report = JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? '');
  } catch {
    report = null;
  }
}
if (report === null) {
  failures.push(`${label}: the driven window printed no probe value (electron exited ${String(code)})`);
}
if (!existsSync(out)) failures.push(`${label}: no screenshot was written to ${out}`);
else say(`screenshot ${out}`);

if (report !== null) {
  console.log('');
  say(`reading for ${label}`);
  console.log(`  moved to left   ${String(report.moved)}`);
  console.log(`  window          ${String(report.after.windowWidth)} by ${String(report.after.windowHeight)}`);
  console.log(`  rail            ${JSON.stringify(report.after.rail)}`);
  console.log(`  activity bar    ${JSON.stringify(report.after.activityBar)}`);
  console.log(`  activity class  ${String(report.after.activityClass)}`);
  console.log(`  inside sidebar  ${String(report.after.activityInSidebar)}`);
  console.log(`  sidebar         ${JSON.stringify(report.after.sidebar)}`);
  console.log(`  work area       ${JSON.stringify(report.after.workArea)}`);
  console.log(`  terminal        ${JSON.stringify(report.after.terminal)}`);
  console.log('  items');
  for (const it of report.after.items) {
    console.log(`    ${String(it.label)} ${JSON.stringify(it.box)}`);
  }
  console.log('');
  say('the same reading before the position button was pressed');
  console.log(`  activity bar    ${JSON.stringify(report.before.activityBar)}`);
  console.log(`  sidebar         ${JSON.stringify(report.before.sidebar)}`);
  console.log(`  work area       ${JSON.stringify(report.before.workArea)}`);
  writeFileSync(join(outDir, `p135-${label}.json`), JSON.stringify(report, null, 2), 'utf8');
  say(`reading written to ${join(outDir, `p135-${label}.json`)}`);
}

const operatorAfter = operatorSessionCount();
console.log('');
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(`the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`);
}

rmSync(root, { recursive: true, force: true });

if (failures.length > 0) {
  console.log('');
  say(`FAIL, ${String(failures.length)} reading(s):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS. One launch, one picture, one reading.');
