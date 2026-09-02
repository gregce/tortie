#!/usr/bin/env node
/**
 * probe-p201-reading.mjs. The sidebar reads, driven in the real app (Phase
 * 201, research 77 section 7).
 *
 * ## What it proves, and why the unit suite cannot
 *
 * The unit suite renders the reading's face over a seeded model and the gate
 * pins every sentence over fixtures. What neither can hold is that the
 * SHIPPED app composes the reading over a real repository's fact base, that
 * the cold scan and the tree read land as one `arch:mapUpdated` push the
 * sidebar re-reads, that the rows sit in weight order with the contract last
 * under two header icons, that the ten facts ride each row's hover in their
 * fixed order, and that the map tab draws the SAME boxes the sidebar lists,
 * one rule and two readers. This probe launches ONE Electron on a scratch
 * profile, opens the repository named in P201_PROJECT, flips the Architecture
 * switch in that profile the way Settings does, opens the view with its
 * chord, waits for the reading to fill, and reads everything off the DOM.
 *
 * Against the mock. docs/research/assets/77-arch-reading/reading.html is the
 * picture the operator approved over the gmux copy at 2,490 files. When the
 * opened repository is that copy, the row order and every sentence are
 * compared to the mock's byte for byte; on any other repository the same
 * rows are read and printed, and the order is checked against the weights
 * the rows themselves declare.
 *
 * At the parent commit the pane has no reading; the probe then prints the
 * computed parts rows it finds and fails, which is how the reorder is shown.
 *
 * ## Safety
 *
 * Without GMUX_TMUX_SOCKET it refuses. Without P201_PROJECT it refuses, and
 * it refuses the checkout it runs from. The repository is READ: the probe
 * compares `git status --porcelain` before and after, creates no session,
 * writes nothing under the project, and the one Electron is ended by
 * `withElectron`'s finally block whatever happened. It spawns no agent and
 * spends no token.
 *
 * Usage, from the worktree root:
 *   P201_PROJECT=<a copy of a repository> node build/harness-socket.mjs gmux-p201 'node build/probe-p201-reading.mjs'
 *
 * Exit 0 when every check passes, 1 otherwise, 2 when the probe refuses.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from './cdp-client.mjs';
import { withElectron } from './electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => process.stdout.write(`${line}\n`);

function refuse(message) {
  process.stderr.write(`probe-p201-reading: ${message}\n`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}". Run through build/harness-socket.mjs.`);
}
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set. Run through build/harness-socket.mjs.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) refuse('no build under out/. Run npm run build first.');
const projectArg = (process.env['P201_PROJECT'] ?? '').trim();
if (projectArg === '') refuse('P201_PROJECT names no repository. Point it at a COPY of a repository, never the checkout you work in.');
const project = realpathSync(projectArg);
if (project === realpathSync(REPO)) refuse('P201_PROJECT is the checkout this probe runs from. Point it at a copy.');
if (!existsSync(join(project, '.git'))) refuse(`${project} is not a git repository.`);

mkdirSync(join(harnessDir, 'p201'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p201'));
const home = join(root, 'home');
const profile = join(root, 'profile');
for (const d of [home, profile]) mkdirSync(d, { recursive: true });

/** The working tree's status, so "read only" is a comparison rather than a promise. */
function gitStatus() {
  const r = spawnSync('git', ['-C', project, 'status', '--porcelain', '-z'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout : `status failed: ${r.stderr}`;
}
function trackedCount() {
  const r = spawnSync('git', ['-C', project, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout.split('\0').filter(Boolean).length : -1;
}

// ---------------------------------------------------------------------------
// The mock, being the approved picture over the gmux copy at 2,490 files.
// ---------------------------------------------------------------------------

const MOCK_FILE_COUNT = 2490;
const MOCK_REPO_LINE =
  '2,490 files, mostly TypeScript; 7 parts, the biggest src/main (38%); 9 connections between parts; 7,313 of 10,857 imports lead inside the repository.';
const MOCK_ROWS = [
  ['src/main', 'Engine', '38%', '943 files, TypeScript; made of machines, arch, overview, manifest, harness and 56 more; used by build; uses src/shared; entry src/main/index.ts.'],
  ['src/renderer', 'Engine', '36%', '906 files, mostly TypeScript; made of app, scm, editor, arch, settings and 25 more; used by build; uses src/shared; entry src/renderer/index.html.'],
  ['docs', 'Surface', '11%', '273 files, mostly Markdown; made of research, shots, brand, audits, readme and 2 more; not code apart from 15 files.'],
  ['build', 'Surface', '9%', '215 files, mostly JavaScript; made of probe*, assert*, conformance*, p138* and 59 more; uses src/main and src/shared; no other part uses it.'],
  ['src/shared', 'Engine', '3%', '85 files, TypeScript; made of keymap, agent-overlay, settings, context, arch and 31 more; used by src/renderer and src/main; uses no other part; entry src/shared/ipc/index.ts.'],
  ['everything else', 'Surface', '2%', '51 files, JSON and other files; 6 small folders (resources, .github, .playwright-mcp, .claude, patches, src/test) and 24 root files; not code apart from 3 files.'],
  ['src/preload', 'Surface', '1%', '17 files, TypeScript; made of machines, terminal, arch, bridge, context and 12 more; uses src/shared; no other part uses it; entry src/preload/index.ts.']
];
/** The src/main hover as the mock draws it, minus Defines, which the mock hand cut. */
const MOCK_SRC_MAIN_FACTS = [
  'Size: 943 files, 288,056 lines',
  'Languages: TypeScript 921, text files 17, JSON 4, JavaScript 1',
  'Defines: 4,282 functions, 2,016 constants, 871 interfaces, 832 methods',
  'Entries: src/main/index.ts, src/main/actions/index.ts, src/main/activity/index.ts, src/main/agents/index.ts',
  'Imports: 5,247 written, 3,425 to this repository, 1,822 to dependencies, 0 not followed',
  'Used by: build 64, src/renderer 9',
  'Uses: src/shared 473, src/renderer 1'
];
const FACT_ORDER = ['Size:', 'Languages:', 'Defines:', 'Declares:', 'Entries:', 'Imports:', 'Used by:', 'Uses:', 'Folders:', 'Also holds:'];

// ---------------------------------------------------------------------------
// The connection
// ---------------------------------------------------------------------------

async function cdpForAppWindow(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const answer = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof answer === 'string') return { cdp, url: answer };
          cdp.close();
        } catch {
          if (cdp !== null) {
            try {
              cdp.close();
            } catch {
              /* already gone */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no page answered for the app window in time');
    await sleep(200);
  }
}

async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const CHORD_ARCH = { key: 'A', code: 'KeyA', vk: 65, modifiers: 2 | 8 };

function flipOn() {
  return `(async () => {
  const before = await window.gmux.settingsGet();
  const next = await window.gmux.settingsSet({
    arch: { enabled: true, agentId: before.arch.agentId, model: before.arch.model }
  });
  return next.arch.enabled;
})()`;
}

async function waitFor(cdp, expression, timeoutMs, everyMs = 250) {
  const started = Date.now();
  for (;;) {
    const answer = await cdpEval(cdp, expression, 15_000);
    if (answer === true) return true;
    if (Date.now() - started > timeoutMs) return false;
    await sleep(everyMs);
  }
}

// ---------------------------------------------------------------------------
// The reads, all off the DOM
// ---------------------------------------------------------------------------

/** The whole pane, in the terms the phase gates. */
const PANE_READ = `(() => {
  const pane = document.querySelector('[data-view="arch"]');
  if (pane === null) return JSON.stringify({ pane: false });
  const text = (el) => (el === null ? null : (el.textContent ?? '').trim());
  const header = pane.querySelector('.view-header') ?? document.querySelector('.view-header');
  const actions = header === null ? [] : [...header.querySelectorAll('.view-header-action')].map((b) => ({
    label: b.getAttribute('aria-label') ?? '', title: b.getAttribute('title') ?? '', disabled: b.disabled === true
  }));
  const html = pane.innerHTML;
  const at = (sel) => { const el = pane.querySelector(sel); return el === null ? -1 : html.indexOf(el.outerHTML.slice(0, 80)); };
  const rows = [...pane.querySelectorAll('[data-slot="arch-reading"] li[data-group]')].map((li) => {
    const row = li.querySelector('.rd-part');
    return {
      id: li.getAttribute('data-group'),
      label: text(li.querySelector('.rd-part-name')),
      band: text(li.querySelector('.rd-band title')),
      weight: li.querySelector('.rd-bar')?.getAttribute('title') ?? null,
      sentence: text(li.querySelector('.rd-part-sentence')),
      facts: (row?.getAttribute('title') ?? '').split('\\n'),
      button: row?.tagName === 'BUTTON',
      selected: row?.classList.contains('selected') === true
    };
  });
  const old = [...pane.querySelectorAll('.arch-row-name')].map((el) => text(el));
  return JSON.stringify({
    pane: true,
    actions,
    subject: text(pane.querySelector('[data-slot="arch-reading-repo"] .arch-subject')),
    subjectTitle: pane.querySelector('[data-slot="arch-reading-repo"] .arch-subject')?.getAttribute('title') ?? null,
    line: text(pane.querySelector('[data-slot="arch-reading-repo"] .rd-line')),
    lineTitle: pane.querySelector('[data-slot="arch-reading-repo"] .rd-line')?.getAttribute('title') ?? null,
    model: text(pane.querySelector('[data-slot="arch-reading-model"]')),
    modelButtons: pane.querySelectorAll('[data-slot="arch-reading-model"] button').length,
    order: {
      repo: at('[data-slot="arch-reading-repo"]'),
      model: at('[data-slot="arch-reading-model"]'),
      components: at('section[aria-label="Components"]')
    },
    // What sits before and after the reading: nothing but the crumb before
    // it, and the contract after it, as the offer or as the cockpit.
    before: pane.querySelector('[data-slot="arch-reading"]')?.previousElementSibling?.className ?? null,
    after: pane.querySelector('[data-slot="arch-reading"]')?.nextElementSibling?.className ?? null,
    afterLabel: pane.querySelector('[data-slot="arch-reading"]')?.nextElementSibling?.getAttribute('aria-label') ?? null,
    contractPresent: pane.querySelector('section[aria-label="Contract"]') === null,
    contractHeading: text(pane.querySelector('section[aria-label="Contract"] .section-header')),
    contractBody: text(pane.querySelector('section[aria-label="Contract"] .arch-empty-body')),
    rows,
    oldRows: old,
    crumb: text(pane.querySelector('.arch-crumb-here'))
  });
})()`;

/** Whether the reading has filled: every row has lines and definitions, and the line has imports. */
const FILLED = `(() => {
  const pane = document.querySelector('[data-view="arch"]');
  if (pane === null) return false;
  const line = (pane.querySelector('[data-slot="arch-reading-repo"] .rd-line')?.textContent ?? '');
  const m = /of ([\\d,]+) imports/.exec(line);
  if (m === null || Number(m[1].replace(/,/g, '')) === 0) return false;
  const rows = [...pane.querySelectorAll('[data-slot="arch-reading"] li[data-group] .rd-part')];
  if (rows.length === 0) return false;
  return rows.every((row) => {
    const t = row.getAttribute('title') ?? '';
    const size = /Size: [\\d,]+ files?, ([\\d,]+) lines?/.exec(t);
    return size !== null && Number(size[1].replace(/,/g, '')) > 0;
  });
})()`;

/** The map tab's boxes, ids and hover titles, and the drilled crumb. */
const MAP_READ = `(() => {
  const tab = document.querySelector('[data-slot="arch-map-tab"]');
  if (tab === null) return JSON.stringify({ tab: false });
  const boxes = [...tab.querySelectorAll('.arch-map-box')].map((g) => ({
    id: g.getAttribute('data-group'),
    label: (g.querySelector('.arch-map-name')?.textContent ?? '').trim(),
    title: (g.querySelector('title')?.textContent ?? '').trim()
  }));
  return JSON.stringify({ tab: true, boxes, edges: tab.querySelectorAll('.arch-map-edge').length });
})()`;

// ---------------------------------------------------------------------------

const failures = [];
const check = (ok, line) => {
  say(`  ${ok ? 'ok  ' : 'FAIL'} ${line}`);
  if (!ok) failures.push(line);
};

const statusBefore = gitStatus();
const tracked = trackedCount();
say(`p201: project ${project}, ${String(tracked)} tracked files`);

await withElectron(
  {
    label: 'p201',
    userDataDir: profile,
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
    ceilingMs: 15 * 60 * 1000
  },
  async () => {
    const { cdp, url } = await cdpForAppWindow(90_000);
    say(`p201: app window at ${url}`);
    await cdp.call('Runtime.enable');
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: project })}).then(() => true)`, 60_000);
    await sleep(1500);

    say('\nthe switch, flipped in this scratch profile the way Settings flips it');
    check((await cdpEval(cdp, flipOn(), 15_000)) === true, 'settings:set answered enabled true');
    await sleep(1000);
    await press(cdp, CHORD_ARCH);
    check(await waitFor(cdp, `document.querySelector('[data-view="arch"]') !== null`, 10_000), 'the view.arch chord opened the pane');

    say('\nthe reading, waited for until the cold scan and the tree read landed');
    const t0 = Date.now();
    const filled = await waitFor(cdp, FILLED, 180_000, 500);
    say(`  the reading ${filled ? 'filled' : 'did not fill'} after ${String(Date.now() - t0)} ms`);
    const pane = JSON.parse(await cdpEval(cdp, PANE_READ, 15_000));
    if (!filled && pane.rows.length === 0 && pane.oldRows.length > 0) {
      say(`  the pane carries no reading; its rows read [${pane.oldRows.join(', ')}] (the parent shape)`);
    }
    check(filled, 'every row carries a size in lines and the line counts imports');

    say('\nthe order of research 77 section 7');
    check(
      pane.actions.map((a) => a.label).join(' | ') === 'Open the map | Read the code again',
      `the header carries the map and the refresh icons in that order (${pane.actions.map((a) => a.label).join(' | ') || 'none'})`
    );
    check(pane.actions.every((a) => a.title.length > 40 && !a.disabled), 'both header icons carry a hover title and are enabled');
    const o = pane.order;
    check(o.repo > -1 && o.model > o.repo && o.components > o.model,
      `the repository line, the model slot and the components sit in that order (${String(o.repo)}, ${String(o.model)}, ${String(o.components)})`);
    check(pane.before === null || String(pane.before).includes('arch-crumb'), `nothing but the crumb sits before the reading (${String(pane.before)})`);
    const contractFaces = ['arch-empty', 'arch-pass', 'arch-ribbon-row', 'arch-lastvalid'];
    check(contractFaces.some((c) => String(pane.after ?? '').includes(c)), `the contract follows the reading, as ${pane.contractPresent ? 'the cockpit' : 'the offer'} (${String(pane.after)}${pane.afterLabel === null ? '' : `, ${pane.afterLabel}`})`);
    check(pane.model === 'No model reading yet.' && pane.modelButtons === 0, `the model slot is one line with no control ("${pane.model}", ${String(pane.modelButtons)} buttons)`);
    if (!pane.contractPresent) {
      check(pane.contractHeading === 'Contract' && (pane.contractBody ?? '').startsWith('None yet.'), `the offer reads None yet ("${pane.contractHeading}": "${pane.contractBody}")`);
    } else {
      say(`  the repository carries a contract, so the cockpit follows the reading rather than the offer`);
    }
    check(typeof pane.subjectTitle === 'string' && typeof pane.lineTitle === 'string' && pane.lineTitle.startsWith('From the code alone.'), 'the name row and the line carry their hovers');

    say('\nthe rows, off the DOM');
    say(`  ${pane.subject}: ${pane.line}`);
    for (const r of pane.rows) say(`  ${r.label} [${r.band}] [${r.weight}]: ${r.sentence}`);
    check(pane.rows.length >= 2, `${String(pane.rows.length)} rows`);
    const weights = pane.rows.map((r) => Number(/^(\d+)%/.exec(r.weight ?? '')?.[1] ?? '-1'));
    check(weights.every((w, i) => i === 0 || w <= weights[i - 1]), `the rows sit in weight order (${weights.join(', ')})`);
    check(pane.rows.every((r) => r.button), 'every row is a button that drills');
    check(pane.rows.every((r) => /^(Engine|Surface|Foundation)\. /.test(r.band)), 'every row wears a band glyph with its sentence on hover');
    for (const r of pane.rows) {
      const heads = r.facts.map((f) => FACT_ORDER.findIndex((p) => f.startsWith(p)));
      const ordered = heads.every((h, i) => h >= 0 && (i === 0 || h > heads[i - 1]));
      check(ordered && heads[0] === 0 && r.facts.some((f) => f.startsWith('Imports:')), `${r.label}: ${String(r.facts.length)} hover facts in the fixed order`);
    }

    const isMock = pane.subject === 'tortie' && tracked === MOCK_FILE_COUNT;
    say(`\nagainst the mock, ${isMock ? 'the gmux copy at 2,490 files' : 'SKIPPED: not the gmux copy at 2,490 files'}`);
    if (isMock) {
      check(pane.subject === 'tortie' && pane.line === MOCK_REPO_LINE, `the name row and the repository line are the mock's byte for byte`);
      check(pane.rows.map((r) => r.label).join(' | ') === MOCK_ROWS.map((m) => m[0]).join(' | '), `the row order is the mock's (${pane.rows.map((r) => r.label).join(', ')})`);
      for (const [label, band, weight, sentence] of MOCK_ROWS) {
        const row = pane.rows.find((r) => r.label === label);
        check(row !== undefined && row.sentence === sentence, `${label}: the sentence is the mock's byte for byte`);
        check(row !== undefined && row.band.startsWith(band) && row.weight === `${weight} of the files in the repository`, `${label}: the band is ${band} and the weight is ${weight}`);
      }
      const main = pane.rows.find((r) => r.label === 'src/main');
      const mainFacts = main === undefined ? [] : main.facts;
      for (const fact of MOCK_SRC_MAIN_FACTS) {
        check(mainFacts.includes(fact), `src/main hover: ${fact.slice(0, 60)}`);
      }
      const folders = mainFacts.find((f) => f.startsWith('Folders:')) ?? '';
      check(folders.startsWith('Folders: machines 134, arch 77, overview 68, manifest 60, harness 44,'), 'src/main hover: the folders line starts as the mock draws it');
    }

    say('\nthe map draws the same boxes, one rule and two readers');
    await cdpEval(cdp, `document.querySelector('.arch-map-open').click(); true`, 15_000);
    check(await waitFor(cdp, `document.querySelector('[data-slot="arch-map-tab"] svg') !== null`, 60_000), 'the header icon opened the map tab');
    const map = JSON.parse(await cdpEval(cdp, MAP_READ, 15_000));
    const sideIds = pane.rows.map((r) => r.id).sort().join(',');
    const mapIds = (map.boxes ?? []).map((b) => b.id).sort().join(',');
    check(map.tab && mapIds === sideIds, `the map's boxes are the sidebar's rows (${mapIds})`);
    for (const b of map.boxes ?? []) say(`  box ${b.id}: ${b.title}`);
    check((map.boxes ?? []).every((b) => pane.rows.find((r) => r.id === b.id)?.label === b.label), 'every box wears the label its row wears');
    say(`  ${String(map.edges)} edges drawn`);

    say('\nthe drill, from a row');
    const first = pane.rows[0];
    await cdpEval(cdp, `document.querySelector('[data-slot="arch-reading"] li[data-group="${first.id}"] .rd-part').click(); true`, 15_000);
    check(await waitFor(cdp, `(document.querySelector('[data-view="arch"] .arch-crumb-here')?.textContent ?? '') === ${JSON.stringify(first.label)}`, 20_000), `clicking ${first.label} drilled the shared record, and the crumb says so`);
    const drilled = JSON.parse(await cdpEval(cdp, PANE_READ, 15_000));
    check(drilled.rows.find((r) => r.id === first.id)?.selected === true, 'the drilled row wears the selected face');

    say('\nthe refusals');
    const statuses = await cdpEval(cdp, `document.querySelectorAll('[data-session-status]').length`, 15_000);
    check(statuses === 0, `no session exists, so nothing set one (${String(statuses)} status elements)`);
  }
);

const spawned = spawnSync('bash', ['-lc', `pgrep -laf "${project}" | grep -v pgrep | wc -l`], { encoding: 'utf8' });
check((spawned.stdout ?? '').trim() === '0', `nothing is left running against the project (${(spawned.stdout ?? '').trim()})`);
check(gitStatus() === statusBefore, 'the project working tree is unchanged by git status, so the repository was only read');

say('');
if (failures.length > 0) {
  say(`probe-p201-reading: FAIL, ${String(failures.length)} check(s):`);
  for (const f of failures) say(`  - ${f}`);
  process.exit(1);
}
say('probe-p201-reading: PASS. The pane reads in the order of research 77 section 7, every row carries its sentence and its ten facts in the fixed order, the map draws the same boxes, a row drills, and the repository was only read.');
process.exit(0);
