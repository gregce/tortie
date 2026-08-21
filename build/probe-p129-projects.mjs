#!/usr/bin/env node
/**
 * probe-p129-projects.mjs. Phase 129 item 3, live.
 *
 * WHAT IT PROVES. One claim, in four launches of the real app.
 *
 *   The project tabs collapse where they are, move to a rail down the left
 *   side of the window, keep their order and their selection when they move,
 *   still answer Cmd+2, survive a relaunch, and never take the terminal
 *   region into the 1 to 239 px reflow band.
 *
 * HOW IT DRIVES. Every reading presses a SHIPPED control in the document. The
 * collapse chevron and the position button are clicked, Cmd+2 is a real
 * KeyboardEvent on window with `bubbles: true`, and the sidebar and the dock
 * are widened by pressing End on their own focused separators, which is the
 * keyboard half of the shipped resize handle. No renderer side driver module
 * was added for this phase. A driver that calls the store would prove the
 * store works, and this has to prove the CONTROLS work.
 *
 * THE READING THAT MATTERS MOST is row 7. `chrome-geometry.ts` promises that
 * the terminal region is never laid out between 1 and 239 CSS pixels, because
 * @xterm/addon-fit floors columns at 2 and a squeezed container reflows every
 * visible pane of real work. A 200px column on the left is the first new
 * region since that budget was written, so the probe widens the sidebar and
 * the dock to their live ceilings with the rail on and measures what the
 * terminal region was actually laid out at.
 *
 * WHAT IT DOES NOT PROVE, said plainly.
 *
 *  - The View menu's radio pair is not clicked here. A native macOS menu
 *    cannot be opened from the renderer, so that half is proven cheaply and
 *    exactly in src/main/__tests__/projects-position-menu.test.ts, which runs
 *    the real menu.ts against a template capturing Menu mock.
 *  - The narrow window branch (a window under 1028px draws the rail
 *    collapsed) is not driven here, because the app's own minimum window is
 *    960px and the harness does not resize the window. It is driven over the
 *    whole grid in src/renderer/state/__tests__/chrome-geometry.test.ts.
 *  - No session is created, so no agent runs and no pane is attached. The
 *    terminal region is measured as a laid out box, which is the number the
 *    budget is about.
 *
 * SAFETY, ABSOLUTE. The probe runs on the socket build/harness-socket.mjs
 * gave it, which that script refuses to let be `gmux` or `default`. Its own
 * user data directory, its own scratch projects. It names `-L gmux` in
 * exactly one place, a read only session count taken before and after, which
 * must match. No pkill, no kill-server, and only the pids it spawned are
 * killed.
 *
 * Usage, from the repository root:
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p129-projects \
 *     'node build/probe-p129-projects.mjs'
 *
 * Add --keep to leave the scratch root and the four PNGs in place.
 *
 * Exit code 0 when every reading passes. 1 when one does not, with each
 * failing row named. 2 when the probe refuses to run at all.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p129projects]';
const keep = process.argv.includes('--keep');

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
      "my own: node build/harness-socket.mjs gmux-p129-projects 'node " +
      "build/probe-p129-projects.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
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
// Three scratch projects, so the strip and the rail both have an order to keep
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'gmux-p129-projects');
rmSync(rawRoot, { recursive: true, force: true });
const names = ['alpha', 'bravo', 'charlie'];
for (const name of names) mkdirSync(join(rawRoot, name), { recursive: true });
const root = realpathSync(rawRoot);
const projects = names.map((n) => join(root, n));
for (const [i, dir] of projects.entries()) {
  writeFileSync(
    join(dir, 'README.md'),
    ['# Phase 129', '', `Scratch project ${String(i + 1)}.`, ''].join('\n'),
    'utf8'
  );
}

// ---------------------------------------------------------------------------
// The expressions the driven window evaluates
//
// Each one is a single async expression. GMUX_SHOT_JS awaits it and prints
// its value as JSON, so everything a reading needs must come back in the
// object it resolves to.
// ---------------------------------------------------------------------------

const PRELUDE = `
const q = (s) => document.querySelector(s);
const all = (s) => Array.from(document.querySelectorAll(s));
const box = (el) => { if (el === null || el === undefined) return null;
  const r = el.getBoundingClientRect();
  return { left: +r.left.toFixed(2), top: +r.top.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (el) => { if (el === null || el === undefined) return false;
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); return true; };
const tabNames = () => all('[data-slot="project-tabs"] .titlebar-tabs [data-project-id] .ptab-name').map((n) => n.textContent);
const tabIds = () => all('[data-slot="project-tabs"] .titlebar-tabs [data-project-id]').map((n) => n.getAttribute('data-project-id'));
const railIds = () => all('[data-slot="project-rail"] .prail-row').map((n) => n.getAttribute('data-project-id'));
const railNames = () => all('[data-slot="project-rail"] .prail-row .prail-name').map((n) => n.textContent);
const selectedTab = () => (q('[data-slot="project-tabs"] .ptab-wrap.selected') ?? {getAttribute:()=>null}).getAttribute('data-project-id');
const selectedRail = () => (q('[data-slot="project-rail"] .prail-row.selected') ?? {getAttribute:()=>null}).getAttribute('data-project-id');
/** Where the rail sits among the shell body's own children. */
const railIndex = () => { const body = q('.shell-body'); if (body === null) return -1;
  return Array.from(body.children).findIndex((c) => c.getAttribute('data-slot') === 'project-rail'); };
const activityIndex = () => { const body = q('.shell-body'); if (body === null) return -1;
  return Array.from(body.children).findIndex((c) => c.getAttribute('data-slot') === 'activity-bar'); };
const collapseBtn = () => q('[data-slot="project-rail"] .prail-collapse') ?? q('[data-slot="project-tabs"] .prail-collapse');
const positionBtn = () => q('[data-slot="project-rail"] .projects-position') ?? q('[data-slot="project-tabs"] .projects-position');
const domMenus = () => all('[role="menu"]').length;
/** Press End on a focused separator — the keyboard half of the shipped handle. */
const widenTo = (sel) => { const h = q(sel); if (h === null) return false;
  h.focus();
  h.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', code: 'End', bubbles: true, cancelable: true }));
  return true; };
const chord = (key) => window.dispatchEvent(new KeyboardEvent('keydown', { key, code: 'Digit' + key, metaKey: true, bubbles: true, cancelable: true }));
const focusedTag = () => { const a = document.activeElement; return a === null ? 'none' : (a.className || a.tagName); };
`;

/** Launch 1: the tabs on top, expanded, exactly as every build drew them. */
const TOP_EXPANDED_JS = `(async () => {
${PRELUDE}
  await wait(400);
  return {
    tabIds: tabIds(),
    tabNames: tabNames(),
    rail: q('[data-slot="project-rail"]') !== null,
    selected: selectedTab(),
    hasCollapse: collapseBtn() !== null,
    hasPosition: positionBtn() !== null,
    domMenus: domMenus()
  };
})()`;

/** Launch 2: press the collapse control on top. */
const TOP_COLLAPSED_JS = `(async () => {
${PRELUDE}
  await wait(400);
  const beforeTabs = tabIds().length;
  const pressed = click(collapseBtn());
  await wait(500);
  const chip = q('.ptab-chip');
  return {
    pressed,
    beforeTabs,
    afterTabs: tabIds().length,
    chip: chip !== null,
    chipName: chip === null ? null : (chip.querySelector('.prail-name') ?? {textContent:null}).textContent,
    chipLabel: chip === null ? null : chip.getAttribute('aria-label'),
    chipPopup: chip === null ? null : chip.getAttribute('aria-haspopup'),
    domMenus: domMenus(),
    titlebar: box(q('.titlebar')),
    rail: q('[data-slot="project-rail"]') !== null
  };
})()`;

/** Launch 3: press the position control, then read the rail and the budget. */
const LEFT_EXPANDED_JS = `(async () => {
${PRELUDE}
  await wait(400);
  const before = { tabIds: tabIds(), selected: selectedTab() };
  const pressed = click(positionBtn());
  await wait(700);
  const rail = q('[data-slot="project-rail"]');
  const after = { railIds: railIds(), railNames: railNames(), selected: selectedRail() };
  // Cmd+2 with the rail on, driven as a real chord on window.
  chord('2');
  await wait(500);
  const afterDigit = selectedRail();
  // Row 7. Widen the sidebar and the dock to their LIVE ceilings, with the
  // rail on, then measure what the terminal region was laid out at.
  widenTo('.dock-resizer');
  await wait(300);
  widenTo('.sidebar-resizer');
  await wait(500);
  const terminal = box(q('.center'));
  return {
    pressed,
    before,
    after,
    afterDigit,
    railBox: box(rail),
    railIndex: railIndex(),
    activityIndex: activityIndex(),
    tabsInBand: tabIds().length,
    terminal,
    sidebar: box(q('[data-slot="sidebar"]')),
    dock: box(q('[data-slot="session-dock"]')),
    editorOverlay: q('.ed-panel.ed-overlay') !== null,
    windowWidth: window.innerWidth,
    domMenus: domMenus()
  };
})()`;

/** Launch 4: the SAME profile again, then collapse the rail. */
const LEFT_COLLAPSED_JS = `(async () => {
${PRELUDE}
  await wait(400);
  const onBoot = { rail: q('[data-slot="project-rail"]') !== null, railBox: box(q('[data-slot="project-rail"]')), tabsInBand: tabIds().length };
  const before = document.activeElement;
  const pressed = click(collapseBtn());
  await wait(600);
  const collapsedBox = box(q('[data-slot="project-rail"]'));
  // The hover card. React synthesises its own onPointerEnter from a native
  // pointerover with no relatedTarget, so that is the one event dispatched,
  // as a primary mouse pointer. The card reveals on a 400 ms timer, so the
  // wait below is comfortably past it.
  const row = q('[data-slot="project-rail"] .prail-row');
  const focusBefore = focusedTag();
  if (row !== null) {
    row.dispatchEvent(
      new PointerEvent('pointerover', { pointerType: 'mouse', bubbles: true, isPrimary: true, pointerId: 1 })
    );
  }
  await wait(1400);
  const card = q('.prail-card');
  const focusAfter = focusedTag();
  return {
    onBoot,
    pressed,
    collapsedBox,
    railIds: railIds(),
    card: card === null ? null : {
      hidden: card.getAttribute('aria-hidden'),
      pointerEvents: getComputedStyle(card).pointerEvents,
      text: card.textContent
    },
    focusBefore,
    focusAfter,
    tookFocus: card !== null && card.contains(document.activeElement)
  };
})()`;

// ---------------------------------------------------------------------------
// The launches
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');
const failures = [];

function shotPath(name) {
  return join(scratch, `p129-projects-${name}.png`);
}

async function launch(name, profile, drive, probeJs) {
  const out = shotPath(name);
  rmSync(out, { force: true });
  say(`launch ${name} (profile ${profile})`);
  const child = spawn(
    electronBin,
    [
      '.',
      `--user-data-dir=${join(root, `profile-${profile}`)}`,
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
        GMUX_SHOT_JS: probeJs
      }
    }
  );
  let text = '';
  const onText = (chunk) => {
    process.stdout.write(chunk);
    text += chunk;
  };
  child.stdout.on('data', (b) => {
    onText(b.toString());
  });
  child.stderr.on('data', (b) => {
    onText(b.toString());
  });
  const code = await new Promise((r) => {
    const watchdog = setTimeout(() => {
      console.error(`${TAG} ${name} passed its ceiling. Ending the pid I started.`);
      child.kill('SIGTERM');
    }, 180_000);
    child.on('error', (err) => {
      clearTimeout(watchdog);
      console.error(`${TAG} electron could not start: ${err.message}`);
      r(1);
    });
    child.on('exit', (c) => {
      clearTimeout(watchdog);
      setTimeout(() => {
        r(c ?? 1);
      }, 750);
    });
  });
  child.stdout.destroy();
  child.stderr.destroy();

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
      `${name}: the driven window printed no probe value (electron exited ${String(code)})`
    );
  }
  if (!existsSync(out)) failures.push(`${name}: no screenshot was written to ${out}`);
  else say(`${name}: screenshot ${out}`);
  return report;
}

function need(condition, why) {
  if (!condition) failures.push(why);
}

const drive = {
  projectPath: projects[0],
  extraProjects: [projects[1], projects[2]]
};

/**
 * Launch 3 also asks for the session dock, because row 7 is only a real
 * reading with something on the window's right edge to take width. With the
 * dock on, `End` on its separator widens it to its 320px ceiling, and `End`
 * on the sidebar's separator then takes everything the budget still allows.
 */
const driveRight = { ...drive, orientation: 'right' };

// -- 1, the tabs on top, expanded -------------------------------------------

const topExpanded = await launch('top-expanded', 'a', drive, TOP_EXPANDED_JS);
if (topExpanded !== null) {
  console.log('');
  say('1. the tabs on top, expanded');
  console.log(`  tabs            ${JSON.stringify(topExpanded.tabNames)}`);
  console.log(`  rail present    ${String(topExpanded.rail)}`);
  console.log(`  DOM menus       ${String(topExpanded.domMenus)}`);
  need(topExpanded.tabIds.length === 3, `1: expected 3 tabs, read ${String(topExpanded.tabIds.length)}`);
  need(topExpanded.rail === false, '1: a project rail was drawn while the tabs are on top');
  need(topExpanded.hasCollapse === true, '1: the band carries no collapse control');
  need(topExpanded.hasPosition === true, '1: the band carries no position control');
  need(topExpanded.domMenus === 0, '1: a menu was drawn in the DOM, and DESIGN §3 forbids that');
}

// -- 2, collapsed on top ----------------------------------------------------

const topCollapsed = await launch('top-collapsed', 'b', drive, TOP_COLLAPSED_JS);
if (topCollapsed !== null) {
  console.log('');
  say('2. collapsed on top');
  console.log(`  tabs before     ${String(topCollapsed.beforeTabs)}`);
  console.log(`  tabs after      ${String(topCollapsed.afterTabs)}`);
  console.log(`  chip            ${String(topCollapsed.chipName)} (${String(topCollapsed.chipLabel)})`);
  console.log(`  title band      ${JSON.stringify(topCollapsed.titlebar)}`);
  need(topCollapsed.pressed === true, '2: the collapse control was not there to press');
  need(topCollapsed.beforeTabs === 3, '2: the strip did not start with three tabs');
  need(topCollapsed.afterTabs === 0, `2: ${String(topCollapsed.afterTabs)} tabs survived the collapse`);
  need(topCollapsed.chip === true, '2: no chip replaced the row of tabs');
  need(topCollapsed.chipLabel === 'Switch project', `2: the chip is named "${String(topCollapsed.chipLabel)}"`);
  need(topCollapsed.chipPopup === 'menu', '2: the chip does not announce a menu');
  need(topCollapsed.domMenus === 0, '2: a menu was drawn in the DOM');
  need(
    topCollapsed.titlebar !== null && topCollapsed.titlebar.height === 38,
    `2: the title band is ${String(topCollapsed.titlebar?.height)}px, and it must stay 38 for the traffic lights`
  );
}

// -- 3, the rail ------------------------------------------------------------

const leftExpanded = await launch('left-expanded', 'c', driveRight, LEFT_EXPANDED_JS);
if (leftExpanded !== null) {
  console.log('');
  say('3. the tabs on the left');
  console.log(`  rail box        ${JSON.stringify(leftExpanded.railBox)}`);
  console.log(`  rail is child   ${String(leftExpanded.railIndex)} of .shell-body, activity bar is ${String(leftExpanded.activityIndex)}`);
  console.log(`  order before    ${JSON.stringify(leftExpanded.before.tabIds)}`);
  console.log(`  order after     ${JSON.stringify(leftExpanded.after.railIds)}`);
  console.log(`  selected        ${String(leftExpanded.before.selected)} -> ${String(leftExpanded.after.selected)}`);
  console.log(`  after Cmd+2     ${String(leftExpanded.afterDigit)}`);
  console.log(`  window          ${String(leftExpanded.windowWidth)}px`);
  console.log(`  sidebar         ${JSON.stringify(leftExpanded.sidebar)}`);
  console.log(`  dock            ${JSON.stringify(leftExpanded.dock)}`);
  console.log(`  terminal        ${JSON.stringify(leftExpanded.terminal)}`);
  need(leftExpanded.pressed === true, '3: the position control was not there to press');
  need(
    leftExpanded.railBox !== null && leftExpanded.railBox.width === 200,
    `3: the rail is ${String(leftExpanded.railBox?.width)} CSS px, and it must be exactly 200`
  );
  need(
    leftExpanded.railBox !== null && leftExpanded.railBox.left === 0,
    '3: the rail is not flush to the window edge'
  );
  need(
    leftExpanded.railIndex === 0 && leftExpanded.activityIndex > 0,
    `3: the rail is child ${String(leftExpanded.railIndex)}, and it must come before the activity bar`
  );
  need(leftExpanded.tabsInBand === 0, '3: the title band still draws tabs while the rail is on');
  need(
    JSON.stringify(leftExpanded.after.railIds) ===
      JSON.stringify(leftExpanded.before.tabIds),
    '3: the rail draws the projects in a different order from the strip'
  );
  need(
    leftExpanded.after.selected === leftExpanded.before.selected,
    '3: moving the tabs changed which project is selected'
  );
  need(
    leftExpanded.afterDigit === (leftExpanded.after.railIds[1] ?? null),
    `3: Cmd+2 selected ${String(leftExpanded.afterDigit)} rather than the second project`
  );
  // Row 7 — the reflow band.
  const t = leftExpanded.terminal;
  need(
    t !== null && (t.width === 0 || t.width >= 240 || leftExpanded.editorOverlay === true),
    `3: the terminal region was laid out at ${String(t?.width)} CSS px, inside the 1 to 239 reflow band`
  );
}

// -- 4, the same profile again, then collapsed ------------------------------

const leftCollapsed = await launch('left-collapsed', 'c', driveRight, LEFT_COLLAPSED_JS);
if (leftCollapsed !== null) {
  console.log('');
  say('4. the value survives a relaunch, and the rail collapses');
  console.log(`  on boot         rail=${String(leftCollapsed.onBoot.rail)} ${JSON.stringify(leftCollapsed.onBoot.railBox)}`);
  console.log(`  collapsed       ${JSON.stringify(leftCollapsed.collapsedBox)}`);
  console.log(`  card            ${JSON.stringify(leftCollapsed.card)}`);
  console.log(`  keyboard        ${String(leftCollapsed.focusBefore)} -> ${String(leftCollapsed.focusAfter)}`);
  need(leftCollapsed.onBoot.rail === true, '4: a second launch on the same profile came up with the tabs on top');
  need(
    leftCollapsed.onBoot.railBox !== null && leftCollapsed.onBoot.railBox.width === 200,
    `4: the relaunched rail is ${String(leftCollapsed.onBoot.railBox?.width)} px`
  );
  need(leftCollapsed.onBoot.tabsInBand === 0, '4: the relaunched band drew tabs as well as the rail');
  need(leftCollapsed.pressed === true, '4: the rail carries no collapse control');
  need(
    leftCollapsed.collapsedBox !== null && leftCollapsed.collapsedBox.width === 48,
    `4: the collapsed rail is ${String(leftCollapsed.collapsedBox?.width)} CSS px, and it must be exactly 48`
  );
  need(leftCollapsed.railIds.length === 3, '4: the collapsed rail lost a project');
  need(leftCollapsed.card !== null, '4: hovering a collapsed row revealed no card');
  need(
    leftCollapsed.card === null || leftCollapsed.card.hidden === 'true',
    '4: the card is not aria-hidden'
  );
  need(
    leftCollapsed.card === null || leftCollapsed.card.pointerEvents === 'none',
    '4: the card can be hovered, and it must never be a target'
  );
  need(leftCollapsed.tookFocus === false, '4: the card took the keyboard');
  need(
    leftCollapsed.focusBefore === leftCollapsed.focusAfter,
    `4: the keyboard moved from ${String(leftCollapsed.focusBefore)} to ${String(leftCollapsed.focusAfter)} on a hover`
  );
}

// ---------------------------------------------------------------------------
// The verdict
// ---------------------------------------------------------------------------

const operatorAfter = operatorSessionCount();
console.log('');
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`
  );
}

if (!keep) rmSync(root, { recursive: true, force: true });
else say(`kept ${root}`);

if (failures.length > 0) {
  console.log('');
  say(`FAIL, ${String(failures.length)} reading(s):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS. Four launches, four screenshots, every reading held.');
