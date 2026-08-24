#!/usr/bin/env node
/**
 * probe-p135-verify.mjs. Phase 135, the INDEPENDENT VERIFIER's probe.
 *
 * It launches the real app once, drives it into ONE of the states below with
 * shipped controls, writes one PNG, and reads getBoundingClientRect() for
 * every project control on screen. It then checks the rectangles itself for
 * overlap and for clipping.
 *
 * P135V_STATE, one of:
 *   top-expanded    the boot default: projects on top, row expanded
 *   top-collapsed   press the title band's own chevron
 *   left-expanded   press the title band's position button
 *   left-collapsed  press the position button, then the rail's chevron
 *   focus-left      projects already on the left (profile is reused), a real
 *                   session, and the real fill chord through the drive spec
 *
 * P135V_OUT_DIR   where the PNG and the JSON go. Required.
 * P135V_PROFILE   reuse this profile directory rather than a fresh one.
 *
 * SAFETY. Runs only on the socket build/harness-socket.mjs hands it, which
 * that script refuses to let be `gmux` or `default`. Its own user data
 * directory, its own scratch projects. `-L gmux` is named in exactly one
 * place, a read only session count taken before and after.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p135verify]';
const say = (l) => { console.log(`${TAG} ${l}`); };
const refuse = (w) => { console.error(`${TAG} ${w}`); process.exit(2); };

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run me through build/harness-socket.mjs.');
if (socket === 'gmux' || socket === 'default') refuse(`refusing to run on "${socket}"`);
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) refuse('out/main/index.js missing. npm run build first.');

const state = (process.env['P135V_STATE'] ?? '').trim();
const STATES = ['top-expanded', 'top-collapsed', 'left-expanded', 'left-collapsed', 'focus-left'];
if (!STATES.includes(state)) refuse(`P135V_STATE must be one of ${STATES.join(', ')}`);
const outDir = (process.env['P135V_OUT_DIR'] ?? '').trim();
if (outDir === '') refuse('no P135V_OUT_DIR.');
mkdirSync(outDir, { recursive: true });

function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, `gmux-p135v-${state}`);
rmSync(rawRoot, { recursive: true, force: true });
const names = ['tortie', 'notes', 'website'];
for (const n of names) mkdirSync(join(rawRoot, n, 'src'), { recursive: true });
const root = realpathSync(rawRoot);
const projects = names.map((n) => join(root, n));
for (const [i, dir] of projects.entries()) {
  writeFileSync(join(dir, 'README.md'), `# Phase 135\n\nScratch ${String(i + 1)}.\n`, 'utf8');
  writeFileSync(join(dir, 'src', 'index.ts'), 'export const one = 1;\n', 'utf8');
}

if (process.env['P135V_DIRTY'] === '1') {
  const g = (args, cwd) => spawnSync('git', args, { cwd, encoding: 'utf8' });
  const d = projects[0];
  g(['init', '-q'], d);
  g(['config', 'user.email', 'p135@example.invalid'], d);
  g(['config', 'user.name', 'p135'], d);
  writeFileSync(join(d, 'seed.txt'), 'seed\n', 'utf8');
  g(['add', '-A'], d);
  g(['commit', '-qm', 'seed'], d);
  for (let i = 0; i < 140; i += 1) writeFileSync(join(d, `dirty-${String(i)}.txt`), 'x\n', 'utf8');
  writeFileSync(join(d, 'seed.txt'), 'changed\n', 'utf8');
  say('project 1 is a git repo with 141 dirty paths, so the SCM badge draws');
}

const profileDir = (process.env['P135V_PROFILE'] ?? '').trim() || join(root, 'profile');
mkdirSync(profileDir, { recursive: true });

// --- the one expression the driven window evaluates ------------------------

const CLICK_POSITION = state === 'left-expanded' || state === 'left-collapsed';
const CLICK_TOP_CHEVRON = state === 'top-collapsed';
const CLICK_RAIL_CHEVRON = state === 'left-collapsed';

const PROBE_JS = `(async () => {
  const q = (s) => document.querySelector(s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { left: +r.left.toFixed(1), top: +r.top.toFixed(1), right: +r.right.toFixed(1),
      bottom: +r.bottom.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) }; };
  const click = (el) => { if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); return true; };
  const vis = (el) => { if (!el) return false; const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0; };

  await wait(700);
  const steps = [];
  if (${String(CLICK_POSITION)}) {
    steps.push(['position button', click(q('[data-slot="project-tabs"] .projects-position'))]);
    await wait(1100);
  }
  if (${String(CLICK_TOP_CHEVRON)}) {
    steps.push(['top chevron', click(q('[data-slot="project-tabs"] .prail-collapse'))]);
    await wait(1100);
  }
  if (${String(CLICK_RAIL_CHEVRON)}) {
    steps.push(['rail chevron', click(q('[data-slot="project-rail"] .prail-collapse'))]);
    await wait(1100);
  }

  // Every control the person can press in the project region, in DOM order,
  // together with the container it lives in.
  const containers = [];
  const railBand = q('[data-slot="project-rail"] .prail-band');
  const railFooter = q('[data-slot="project-rail"] .prail-footer');
  const topNav = q('[data-slot="project-tabs"] .titlebar-tabs');
  if (topNav) containers.push(['titlebar-tabs', topNav]);
  if (railBand) containers.push(['prail-band', railBand]);
  if (railFooter) containers.push(['prail-footer', railFooter]);

  const regions = containers.map(([name, el]) => {
    const kids = Array.from(el.querySelectorAll('button, .ptab, .ptab-chip'))
      .filter((n) => n.closest('button') === n || n.tagName !== 'BUTTON' ? true : true);
    // Only DIRECT pressables: buttons plus the chip, deduped by ancestry.
    const seen = [];
    for (const k of kids) { if (!seen.some((s) => s.contains(k))) seen.push(k); }
    return {
      container: name,
      box: box(el),
      visible: vis(el),
      controls: seen.map((n) => ({
        tag: n.tagName.toLowerCase(),
        cls: n.getAttribute('class'),
        label: n.getAttribute('aria-label') ?? n.getAttribute('title') ?? (n.textContent ?? '').trim().slice(0, 40),
        visible: vis(n),
        box: box(n)
      }))
    };
  });

  const shell = q('.shell');
  return {
    steps,
    state: ${JSON.stringify(state)},
    shellClass: shell ? shell.className : null,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    railBox: box(q('[data-slot="project-rail"]')),
    railVisible: vis(q('[data-slot="project-rail"]')),
    activityBox: box(q('[data-slot="activity-bar"]')),
    activityClass: (q('[data-slot="activity-bar"]') ?? {}).className ?? null,
    activityVisible: vis(q('[data-slot="activity-bar"]')),
    activityInSidebar: q('[data-slot="sidebar"] [data-slot="activity-bar"]') !== null,
    activityItems: Array.from(document.querySelectorAll('[data-slot="activity-bar"] .ab-item, [data-slot="activity-bar"] .ab-settings, [data-slot="activity-bar"] button'))
      .map((n) => ({ label: n.getAttribute('aria-label'), cls: n.getAttribute('class'), box: box(n) })),
    sidebarBox: box(q('[data-slot="sidebar"]')),
    workAreaBox: box(q('.work-area')),
    scmBadge: (() => { const n = document.querySelector('[data-slot="activity-bar"] .ab-badge, [data-slot="activity-bar"] .badge, [data-slot="activity-bar"] [class*="badge"]'); return n ? { cls: n.getAttribute('class'), text: (n.textContent||'').trim(), box: box(n), parentBox: box(n.parentElement) } : null; })(),
    addCount: document.querySelectorAll('.ptab-add, .prail-add').length,
    addBoxes: Array.from(document.querySelectorAll('.ptab-add, .prail-add')).map((n) => ({ cls: n.getAttribute('class'), label: n.getAttribute('aria-label'), visible: vis(n), box: box(n) })),
    regions
  };
})()`;

// --- the launch ------------------------------------------------------------

const out = join(outDir, `p135v-${state}.png`);
rmSync(out, { force: true });

const drive = {
  projectPath: projects[0],
  extraProjects: [projects[1], projects[2]],
  sidebarView: 'explorer'
};
if (state === 'focus-left') {
  drive.session = { agent: 'shell', name: 'p135v-focus' };
  drive.sessionFocus = { armMs: 2500, settleMs: 1400, pollMs: 25, leave: false };
}

say(`launch ${state} (profile ${profileDir})`);
const { code, text } = await runElectron({
  label: 'p135-verify',
  userDataDir: profileDir,
  cwd: repoRoot,
  env: {
    ...process.env,
    GMUX_SHOT: out,
    GMUX_SHOT_VERBOSE: '1',
    GMUX_SHOT_DELAY_MS: state === 'focus-left' ? '20000' : '12000',
    GMUX_SHOT_DRIVE: JSON.stringify(drive),
    GMUX_SHOT_JS: PROBE_JS
  },
  ceilingMs: 200_000,
  settleMs: 750,
  echo: true
});

const failures = [];
const marker = '[gmux-shot] probe ';
const at = text.lastIndexOf(marker);
let report = null;
if (at !== -1) {
  try { report = JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? ''); } catch { report = null; }
}
if (report === null) failures.push(`${state}: no probe value (electron exited ${String(code)})`);
if (!existsSync(out)) failures.push(`${state}: no screenshot at ${out}`);
else say(`screenshot ${out}`);

// --- the arithmetic: overlap and clipping ---------------------------------

function overlap(a, b) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0.5 && h > 0.5 ? { w: +w.toFixed(1), h: +h.toFixed(1) } : null;
}

if (report !== null) {
  console.log('');
  say(`STATE ${state}`);
  console.log(`  window        ${report.windowWidth} x ${report.windowHeight}`);
  console.log(`  shell class   ${report.shellClass}`);
  console.log(`  steps         ${JSON.stringify(report.steps)}`);
  console.log(`  rail          ${JSON.stringify(report.railBox)} visible=${report.railVisible}`);
  console.log(`  activity bar  ${JSON.stringify(report.activityBox)}`);
  console.log(`  activity cls  ${report.activityClass}  visible=${report.activityVisible}  inSidebar=${report.activityInSidebar}`);
  console.log(`  sidebar       ${JSON.stringify(report.sidebarBox)}`);
  console.log(`  work area     ${JSON.stringify(report.workAreaBox)}`);
  console.log(`  + count       ${report.addCount}`);
  console.log(`  scm badge     ${JSON.stringify(report.scmBadge)}`);
  for (const a of report.addBoxes) console.log(`    + ${a.cls} "${a.label}" visible=${a.visible} ${JSON.stringify(a.box)}`);
  console.log('  activity items');
  for (const it of report.activityItems) console.log(`    ${it.label} [${it.cls}] ${JSON.stringify(it.box)}`);

  console.log('');
  say('CONTROLS, in DOM order, per container');
  const problems = [];
  for (const reg of report.regions) {
    console.log(`  ${reg.container} ${JSON.stringify(reg.box)} visible=${reg.visible}`);
    reg.controls.forEach((c, i) => {
      console.log(`    ${String(i + 1)}. ${c.cls} "${c.label}" visible=${c.visible} ${JSON.stringify(c.box)}`);
    });
    if (!reg.visible) continue;
    // clipping: every visible control fully inside its container, non-zero
    for (const c of reg.controls) {
      if (!c.visible || c.box === null) continue;
      if (c.box.width <= 0 || c.box.height <= 0)
        problems.push(`${reg.container}: "${c.label}" has zero area ${JSON.stringify(c.box)}`);
      const p = reg.box;
      const slopL = +(c.box.left - p.left).toFixed(1);
      const slopR = +(p.right - c.box.right).toFixed(1);
      const slopT = +(c.box.top - p.top).toFixed(1);
      const slopB = +(p.bottom - c.box.bottom).toFixed(1);
      if (slopL < -0.5 || slopR < -0.5 || slopT < -0.5 || slopB < -0.5)
        problems.push(`${reg.container}: "${c.label}" spills its container (L${slopL} R${slopR} T${slopT} B${slopB})`);
    }
    // overlap: pairwise inside the container
    const vs = reg.controls.filter((c) => c.visible && c.box !== null);
    for (let i = 0; i < vs.length; i += 1)
      for (let j = i + 1; j < vs.length; j += 1) {
        const o = overlap(vs[i].box, vs[j].box);
        if (o !== null) problems.push(`${reg.container}: "${vs[i].label}" overlaps "${vs[j].label}" by ${o.w} x ${o.h}`);
      }
  }
  console.log('');
  if (problems.length === 0) say('OVERLAP AND CLIP: none. Every visible control sits inside its container and touches no other.');
  else { say(`OVERLAP AND CLIP: ${String(problems.length)} problem(s)`); for (const p of problems) console.log(`  ! ${p}`); failures.push(...problems); }

  writeFileSync(join(outDir, `p135v-${state}.json`), JSON.stringify(report, null, 2), 'utf8');
  say(`reading written to ${join(outDir, `p135v-${state}.json`)}`);
}

const operatorAfter = operatorSessionCount();
console.log('');
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) failures.push(`operator session count moved ${operatorBefore} -> ${operatorAfter}`);

if (process.env['P135V_KEEP_PROFILE'] !== '1') rmSync(root, { recursive: true, force: true });
else { rmSync(join(root, 'tortie'), { recursive: true, force: true }); }

if (failures.length > 0) {
  console.log('');
  say(`FAIL, ${String(failures.length)} reading(s):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS.');
