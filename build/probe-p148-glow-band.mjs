#!/usr/bin/env node
/**
 * probe-p148-glow-band.mjs. The Phase 148 measurement probe, modelled on
 * build/probe-p135-chrome.mjs and build/probe-p143-story.mjs.
 *
 * ONE launch reads both surfaces the phase touches, at whatever commit the
 * worktree is built from, so the same probe produces the parent commit's
 * numbers and the phase's numbers.
 *
 *   band     the top project band in both top states, read as bounding boxes
 *            of the position control, the collapse chevron, the first tab or
 *            the chip, and the add button.
 *   rail     the left orientation in both states, read the same way, because
 *            the phase claims those did not move.
 *   you      the session Catch Me Up view's you block, read as computed
 *            style, being the ground, the shadow and the text color, plus
 *            the agent answer's computed style beside it, because the phase
 *            claims the answer did not change.
 *
 * The one PNG is taken at the end, on the session view, with the top band
 * above it, so both surfaces are in one picture.
 *
 * SAFETY, ABSOLUTE. Runs only on a harness socket of its own. `-L gmux` is
 * named in exactly one place, a read only list-sessions count taken before
 * and after, which must match. The launch uses a scratch profile and a
 * scratch HOME through build/electron-run.mjs, which ends the tree it
 * started in a finally block whatever happened here. No pkill anywhere.
 *
 * Usage, from the worktree root, after npm run build:
 *
 *   P148_LABEL=before P148_OUT_DIR=/some/dir \
 *     node build/harness-socket.mjs gmux-p148 'node build/probe-p148-glow-band.mjs'
 */

import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
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
const TAG = '[probe:p148]';
const say = (line) => console.log(`${TAG} ${line}`);
const refuse = (why) => {
  console.error(`${TAG} ${why}`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of my own: ' +
      "node build/harness-socket.mjs gmux-p148 'node build/probe-p148-glow-band.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const label = (process.env['P148_LABEL'] ?? '').trim();
if (label === '') refuse('no P148_LABEL. I will not write an unnamed picture.');
const outDir = (process.env['P148_OUT_DIR'] ?? '').trim();
if (outDir === '') refuse('no P148_OUT_DIR.');
mkdirSync(outDir, { recursive: true });

// What the one PNG shows. 'you' ends on the session Catch Me Up view. 'band'
// closes it again so the picture shows the top band with its tabs, because
// the focus flight hides the band's contents while the overview is open.
const PHOTO = (process.env['P148_PHOTO'] ?? '').trim() || 'you';
if (!['you', 'band'].includes(PHOTO)) {
  refuse(`P148_PHOTO is "${PHOTO}". It is you or band.`);
}

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
// The scratch world: a home, three projects, one seeded claude session
// ---------------------------------------------------------------------------

const FIXTURES = join(repoRoot, 'docs', 'research', 'assets', '63-fixtures');
const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p148');
rmSync(rawRoot, { recursive: true, force: true });
const names = ['tortie', 'notes', 'website'];
for (const n of names) mkdirSync(join(rawRoot, n), { recursive: true });
mkdirSync(join(rawRoot, 'home'), { recursive: true });
const root = realpathSync(rawRoot);
const projects = names.map((n) => join(root, n));
const project = projects[0];
const home = join(root, 'home');
for (const dir of projects) {
  writeFileSync(join(dir, 'README.md'), '# Phase 148 scratch\n', 'utf8');
}

const SESSION_ID = '11111111-2222-4333-8444-555555555555';
const claudeDir = join(home, '.claude', 'projects', project.replace(/\//g, '-'));
mkdirSync(claudeDir, { recursive: true });
copyFileSync(
  join(FIXTURES, 'claude-session.jsonl'),
  join(claudeDir, `${SESSION_ID}.jsonl`)
);

const overviewSeedPath = join(root, 'overview-seed.json');
writeFileSync(
  overviewSeedPath,
  JSON.stringify([
    {
      name: 'claude-6',
      agent: 'claude',
      agentSessionId: SESSION_ID,
      cwd: project,
      createdAt: Date.UTC(2026, 7, 20, 8, 0, 0)
    }
  ]),
  'utf8'
);

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
  const flat = (el) => ((el && el.innerText) || '').replace(/\\s+/g, ' ').trim();
  const layer = () => q('.overview-layer');

  const bandRead = () => ({
    position: box(q('.titlebar .projects-position')),
    chevron: box(q('.titlebar .prail-collapse')),
    firstTab: box(q('.titlebar-tabs [data-project-id]')),
    chip: box(q('.titlebar .ptab-chip')),
    add: box(q('.titlebar .ptab-add')),
    tabCount: document.querySelectorAll('.titlebar-tabs [data-project-id]').length
  });

  const out = {};
  await wait(700);

  // 1. Top band, expanded.
  out.topExpanded = bandRead();

  // 2. Top band, collapsed, then expand again.
  click(q('.titlebar .prail-collapse'));
  await wait(700);
  out.topCollapsed = bandRead();
  click(q('.titlebar .prail-collapse'));
  await wait(700);

  // 3. The left orientation, both states, through the shipped position button.
  click(q('.titlebar .projects-position'));
  await wait(900);
  const railBand = '[data-slot="project-rail"] .prail-band ';
  out.leftExpanded = {
    position: box(q(railBand + '.projects-position')),
    chevron: box(q(railBand + '.prail-collapse')),
    add: box(q(railBand + '.prail-add')),
    title: box(q('[data-slot="project-rail"] .prail-title'))
  };
  click(q(railBand + '.prail-collapse'));
  await wait(700);
  out.leftCollapsed = {
    chevron: box(q(railBand + '.prail-collapse')),
    footAdd: box(q('.prail-footer .prail-add')),
    footPosition: box(q('.prail-footer .projects-position'))
  };
  click(q(railBand + '.prail-collapse'));
  await wait(700);
  click(q('[data-slot="project-rail"] .projects-position'));
  await wait(900);
  out.backOnTop = bandRead();

  // 4. The session Catch Me Up view, and the you block's computed style.
  await window.__gmuxShotDrive({
    projectPath: ${JSON.stringify(project)},
    overview: { level: 'session', sessionNames: ['claude-6'] }
  });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const l = layer();
    if (l !== null && flat(l) !== '' && l.querySelector('.overview-turn') !== null) break;
    await wait(200);
  }
  await wait(700);
  const l = layer();
  if (l === null) { out.you = { error: 'the session view did not open' }; return out; }
  const youEl = l.querySelector('.overview-you');
  const askEl = l.querySelector('.overview-ask');
  const labelEl = l.querySelector('.overview-label');
  const measured = youEl !== null ? youEl : askEl;
  const cs = measured === null ? null : getComputedStyle(measured);
  const askCs = askEl === null ? null : getComputedStyle(askEl);
  const ansEl = l.querySelector('.overview-answer');
  const ansCs = ansEl === null ? null : getComputedStyle(ansEl);
  out.you = {
    wrapperPresent: youEl !== null,
    selectorUsed: youEl !== null ? '.overview-you' : '.overview-ask',
    background: cs === null ? null : cs.backgroundColor,
    boxShadow: cs === null ? null : cs.boxShadow,
    borderRadius: cs === null ? null : cs.borderRadius,
    askColor: askCs === null ? null : askCs.color,
    labelColor: labelEl === null ? null : getComputedStyle(labelEl).color,
    box: box(measured),
    turnCount: l.querySelectorAll('.overview-turn').length,
    youCount: l.querySelectorAll('.overview-you').length
  };
  out.answer = {
    background: ansCs === null ? null : ansCs.backgroundColor,
    boxShadow: ansCs === null ? null : ansCs.boxShadow,
    color: ansCs === null ? null : ansCs.color,
    box: box(ansEl)
  };
  out.bandUnderOverview = bandRead();
  if (${JSON.stringify(PHOTO)} === 'band') {
    for (let i = 0; i < 8 && layer() !== null; i += 1) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await wait(250);
    }
    await wait(500);
    out.closedForBandPhoto = layer() === null;
  }
  return out;
})()`;

// ---------------------------------------------------------------------------
// The launch
// ---------------------------------------------------------------------------

const png = join(outDir, `p148-${label}-${PHOTO}.png`);
rmSync(png, { force: true });

const drive = {
  projectPath: project,
  extraProjects: [projects[1], projects[2]]
};

say(`launch ${label}`);
const { code, text } = await runElectron({
  label: 'p148 glow band',
  userDataDir: join(root, 'profile'),
  cwd: repoRoot,
  env: {
    ...process.env,
    HOME: home,
    GMUX_SHOT: png,
    GMUX_SHOT_DELAY_MS: '11000',
    GMUX_OVERVIEW_SEED: overviewSeedPath,
    GMUX_SHOT_DRIVE: JSON.stringify(drive),
    GMUX_SHOT_JS: PROBE_JS
  },
  ceilingMs: 240_000,
  settleMs: 750
});

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
  failures.push(
    `the driven window printed no probe value (electron exited ${String(code)})`
  );
}
if (!existsSync(png)) failures.push(`no screenshot was written to ${png}`);
else say(`screenshot ${png}`);

if (report !== null) {
  writeFileSync(
    join(outDir, `p148-${label}-${PHOTO}.json`),
    JSON.stringify(report, null, 2),
    'utf8'
  );
  say(`reading written to ${join(outDir, `p148-${label}-${PHOTO}.json`)}`);
  console.log(JSON.stringify(report, null, 2));
}

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`
  );
}

rmSync(root, { recursive: true, force: true });

if (failures.length > 0) {
  say(`FAIL, ${String(failures.length)} reading(s):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS. One launch, one picture, one reading.');
