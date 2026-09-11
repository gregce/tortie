#!/usr/bin/env node
/**
 * Phase 256 RESEARCH probe: today's Architecture pane, read off the DOM.
 *
 * It is a READING probe rather than a gate. It launches ONE Electron on a
 * scratch profile with a scratch HOME and a scratch tmux socket, flips the
 * Architecture switch in that profile the way Settings does, opens two
 * repositories that are COPIES (P256_REPO_A, P256_REPO_B), and reads every
 * surface the pane and the map tab draw: the header, the repository line, the
 * model slot, every reading row with its sentence and its ten hover facts, the
 * contract offer, the map at level 1, level 2 and level 3, the drill crumbs,
 * and — after pressing Draft the contract, which writes `docs/arch/` into the
 * COPY and starts NO process — the whole contract cockpit: the strip, the
 * problems, the failure list, the outline, the gaps, the prose panel and the
 * level 2 module view.
 *
 * IT NEVER LAUNCHES AN AGENT. No agent is configured in the scratch profile,
 * so `arch:enrich` cannot spawn; the probe reads the pass face's own sentence
 * and the Fill in the contract button's disabled state and presses NEITHER.
 *
 * SAFETY. Without GMUX_TMUX_SOCKET and GMUX_HARNESS_DIR it refuses. It refuses
 * the checkout it runs from as a project. The one Electron is ended by
 * `withElectron`'s finally block whatever happened. It spawns no agent, spends
 * no token, opens no keychain and makes no request.
 *
 * Usage, from the worktree root:
 *   P256_REPO_A=<copy> P256_REPO_B=<copy> \
 *   node build/harness-socket.mjs gmux-p256 'node build/p256/probe-p256-pane.mjs'
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { withElectron } from '../electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => process.stdout.write(`${line}\n`);

function refuse(message) {
  process.stderr.write(`probe-p256-pane: ${message}\n`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}". Run through build/harness-socket.mjs.`);
}
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set. Run through build/harness-socket.mjs.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) refuse('no build under out/. Run npm run build first.');

function project(envName) {
  const raw = (process.env[envName] ?? '').trim();
  if (raw === '') refuse(`${envName} names no repository. Point it at a COPY.`);
  const p = realpathSync(raw);
  if (p === realpathSync(REPO)) refuse(`${envName} is the checkout this probe runs from.`);
  if (!existsSync(join(p, '.git'))) refuse(`${p} is not a git repository.`);
  return p;
}
const repoA = project('P256_REPO_A');
const repoB = project('P256_REPO_B');

mkdirSync(join(harnessDir, 'p256'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p256'));
const home = join(root, 'home');
const profile = join(root, 'profile');
for (const d of [home, profile]) mkdirSync(d, { recursive: true });

const OUT = join(REPO, 'build', 'p256', 'pane-readings.json');
const readings = { when: new Date().toISOString(), socket, repoA, repoB, steps: {} };
const note = (key, value) => {
  readings.steps[key] = value;
  say(`\n== ${key}\n${typeof value === 'string' ? value : JSON.stringify(value, null, 1).slice(0, 6000)}`);
};

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

const flipOn = `(async () => {
  const before = await window.gmux.settingsGet();
  const next = await window.gmux.settingsSet({
    arch: { enabled: true, agentId: before.arch.agentId, model: before.arch.model }
  });
  return next.arch.enabled;
})()`;

async function waitFor(cdp, expression, timeoutMs, everyMs = 300) {
  const started = Date.now();
  for (;;) {
    let answer = false;
    try {
      answer = await cdpEval(cdp, expression, 20_000);
    } catch {
      answer = false;
    }
    if (answer === true) return Date.now() - started;
    if (Date.now() - started > timeoutMs) return -1;
    await sleep(everyMs);
  }
}

// ---------------------------------------------------------------------------
// The reads, all off the DOM
// ---------------------------------------------------------------------------

const PANE_READ = `(() => {
  const pane = document.querySelector('[data-view="arch"]');
  if (pane === null) return JSON.stringify({ pane: false });
  const text = (el) => (el === null ? null : (el.textContent ?? '').trim());
  const header = pane.querySelector('.view-header') ?? document.querySelector('.view-header');
  const actions = header === null ? [] : [...header.querySelectorAll('button')].map((b) => ({
    label: b.getAttribute('aria-label') ?? '', title: b.getAttribute('title') ?? '', disabled: b.disabled === true
  }));
  const rows = [...pane.querySelectorAll('[data-slot="arch-reading"] li[data-group]')].map((li) => {
    const row = li.querySelector('.rd-part');
    return {
      id: li.getAttribute('data-group'),
      label: text(li.querySelector('.rd-part-name')),
      band: text(li.querySelector('.rd-band title')),
      weight: li.querySelector('.rd-bar')?.getAttribute('title') ?? null,
      sentence: text(li.querySelector('.rd-part-sentence')),
      facts: (row?.getAttribute('title') ?? '').split('\\n')
    };
  });
  const sections = [...pane.querySelectorAll('section')].map((s) => ({
    label: s.getAttribute('aria-label'), cls: s.className, chars: (s.textContent ?? '').trim().length
  }));
  return JSON.stringify({
    pane: true,
    actions,
    subject: text(pane.querySelector('[data-slot="arch-reading-repo"] .arch-subject')),
    line: text(pane.querySelector('[data-slot="arch-reading-repo"] .rd-line')),
    lineTitle: pane.querySelector('[data-slot="arch-reading-repo"] .rd-line')?.getAttribute('title') ?? null,
    model: text(pane.querySelector('[data-slot="arch-reading-model"]')),
    modelTitle: pane.querySelector('[data-slot="arch-reading-model"]')?.getAttribute('title') ?? null,
    rows,
    sections,
    crumb: text(pane.querySelector('.arch-crumb-here')),
    offerTitle: text(pane.querySelector('.arch-empty .section-header')),
    offerBody: text(pane.querySelector('.arch-empty > .arch-empty-body')),
    offerActions: [...pane.querySelectorAll('.arch-empty-action')].map((b) => ({
      label: (b.textContent ?? '').trim(), title: b.getAttribute('title'), disabled: b.disabled === true
    })),
    offerPassSentence: text(pane.querySelector('.arch-pass-sentence')),
    offerDisclosure: text(pane.querySelector('.arch-more')),
    wholeText: (pane.textContent ?? '').trim(),
    wholeChars: (pane.textContent ?? '').trim().length
  });
})()`;

const CONTRACT_READ = `(() => {
  const pane = document.querySelector('[data-view="arch"]');
  if (pane === null) return JSON.stringify({ pane: false });
  const text = (el) => (el === null ? null : (el.textContent ?? '').trim());
  const all = (sel) => [...pane.querySelectorAll(sel)];
  return JSON.stringify({
    ribbon: text(pane.querySelector('.arch-ribbon')),
    ribbonAction: pane.querySelector('.arch-ribbon-row button')?.getAttribute('aria-label') ?? null,
    pass: text(pane.querySelector('.arch-pass')),
    passButton: (() => { const b = pane.querySelector('.arch-pass-run'); return b === null ? null : { label: (b.textContent ?? '').trim(), disabled: b.disabled === true, title: b.getAttribute('title') }; })(),
    strip: text(pane.querySelector('.arch-strip')),
    stripLanes: all('.arch-strip .arch-lane').map((l) => (l.textContent ?? '').trim()),
    stripNotes: all('.arch-strip-note').map((n) => (n.textContent ?? '').trim()),
    problems: text(pane.querySelector('.arch-schema')),
    failures: all('.arch-failure, .arch-fail-row, [class*="failure"]').map((f) => (f.textContent ?? '').trim()).slice(0, 12),
    outline: all('.arch-outline li, .arch-row').map((li) => (li.textContent ?? '').trim()).slice(0, 20),
    outlineNames: all('.arch-row-name').map((n) => (n.textContent ?? '').trim()),
    gaps: text(pane.querySelector('[class*="gap"]')),
    prose: text(pane.querySelector('[class*="prose"]')),
    modules: text(pane.querySelector('.arch-modules')),
    changed: text(pane.querySelector('.arch-changes')),
    sections: all('section').map((s) => ({ label: s.getAttribute('aria-label'), chars: (s.textContent ?? '').trim().length })),
    wholeChars: (pane.textContent ?? '').trim().length
  });
})()`;

const MAP_READ = `(() => {
  const tab = document.querySelector('[data-slot="arch-map-tab"]');
  if (tab === null) return JSON.stringify({ tab: false });
  const boxes = [...tab.querySelectorAll('.arch-map-box')].map((g) => ({
    id: g.getAttribute('data-group'),
    label: (g.querySelector('.arch-map-name')?.textContent ?? '').trim(),
    title: (g.querySelector('title')?.textContent ?? '').trim(),
    cls: g.getAttribute('class')
  }));
  const edges = [...tab.querySelectorAll('.arch-map-edge')].map((e) => ({
    title: (e.querySelector('title')?.textContent ?? '').trim(), cls: e.getAttribute('class')
  }));
  const stubs = [...tab.querySelectorAll('.arch-map-stub-name')].map((s) => (s.textContent ?? '').trim());
  return JSON.stringify({
    tab: true,
    crumbs: [...tab.querySelectorAll('.arch-map-crumb, .arch-map-crumb-here')].map((c) => (c.textContent ?? '').trim()),
    boxes, edgeCount: edges.length, edges: edges.slice(0, 14), stubs,
    partial: (tab.querySelector('[data-slot="arch-map-partial"]')?.textContent ?? '').trim() || null,
    stale: (tab.querySelector('.arch-map-stale')?.textContent ?? '').trim() || null,
    files: (tab.querySelector('.arch-map-files')?.textContent ?? '').trim() || null,
    wholeChars: (tab.textContent ?? '').trim().length,
    wholeText: (tab.textContent ?? '').trim().slice(0, 1200)
  });
})()`;

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

function gitStatus(p) {
  const r = spawnSync('git', ['-C', p, 'status', '--porcelain'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout : `status failed: ${r.stderr}`;
}

const statusA = gitStatus(repoA);
const statusB = gitStatus(repoB);

await withElectron(
  {
    label: 'p256',
    userDataDir: profile,
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
    ceilingMs: 20 * 60 * 1000
  },
  async () => {
    const { cdp, url } = await cdpForAppWindow(90_000);
    say(`p256: app window at ${url}`);
    await cdp.call('Runtime.enable');
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }

    // --- repository A -----------------------------------------------------
    await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: repoA })}).then(() => true)`, 120_000);
    await sleep(1500);
    note('switch', await cdpEval(cdp, flipOn, 20_000));
    await sleep(800);
    await press(cdp, CHORD_ARCH);
    note('chordOpenedPane', (await waitFor(cdp, `document.querySelector('[data-view="arch"]') !== null`, 15_000)) >= 0);

    const coldA = await waitFor(cdp, FILLED, 300_000, 500);
    note('A.msToFilledReading', coldA);
    note('A.pane', JSON.parse(await cdpEval(cdp, PANE_READ, 30_000)));

    // The map tab, level 1.
    await cdpEval(cdp, `document.querySelector('.arch-map-open').click(); true`, 20_000);
    await waitFor(cdp, `document.querySelector('[data-slot="arch-map-tab"] svg') !== null`, 90_000);
    await sleep(1200);
    const map1 = JSON.parse(await cdpEval(cdp, MAP_READ, 30_000));
    note('A.map.level1', map1);

    // Level 2: click the heaviest box that is not the fold.
    const target1 = (map1.boxes ?? []).find((b) => b.id !== 'other')?.id ?? null;
    if (target1 !== null) {
      await cdpEval(cdp, `document.querySelector('.arch-map-box[data-group="${target1}"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); true`, 20_000);
      await sleep(2500);
      const map2 = JSON.parse(await cdpEval(cdp, MAP_READ, 30_000));
      note('A.map.level2', { drilled: target1, ...map2 });
      const target2 = (map2.boxes ?? [])[0]?.id ?? null;
      if (target2 !== null) {
        await cdpEval(cdp, `document.querySelector('.arch-map-box[data-group="${target2}"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); true`, 20_000);
        await sleep(2500);
        note('A.map.level3', { drilled: target2, ...JSON.parse(await cdpEval(cdp, MAP_READ, 30_000)) });
      }
    }
    // Back to the whole map, so the sidebar is unscoped again.
    await cdpEval(cdp, `(() => { const b = document.querySelector('.arch-map-crumb'); if (b !== null) b.click(); return true; })()`, 20_000);
    await sleep(1200);

    // --- the draft flow, up to but NOT through any agent ------------------
    const offer = await cdpEval(
      cdp,
      `(() => { const b = document.querySelector('[data-view="arch"] .arch-empty-action'); return b === null ? null : JSON.stringify({ label: (b.textContent ?? '').trim(), disabled: b.disabled === true, title: b.getAttribute('title') }); })()`,
      20_000
    );
    note('A.draftButton', offer === null ? null : JSON.parse(offer));
    if (offer !== null) {
      await cdpEval(cdp, `document.querySelector('[data-view="arch"] .arch-empty-action').click(); true`, 20_000);
      const wrote = await waitFor(cdp, `document.querySelector('[data-view="arch"] .arch-strip') !== null`, 120_000, 500);
      note('A.msToContractCockpit', wrote);
      await sleep(4000);
      note('A.contract', JSON.parse(await cdpEval(cdp, CONTRACT_READ, 30_000)));
      note('A.paneAfterDraft', JSON.parse(await cdpEval(cdp, PANE_READ, 30_000)));
      // Select the first outline row, so the prose panel and the level 2
      // module view have a subject.
      await cdpEval(cdp, `(() => { const r = document.querySelector('[data-view="arch"] .arch-row, [data-view="arch"] .arch-outline button'); if (r !== null) r.click(); return true; })()`, 20_000);
      await sleep(4000);
      note('A.contractWithSelection', JSON.parse(await cdpEval(cdp, CONTRACT_READ, 30_000)));
      // The map with the contract overlaid.
      await cdpEval(cdp, `document.querySelector('.arch-map-open').click(); true`, 20_000);
      await sleep(2500);
      note('A.map.level1.withContract', JSON.parse(await cdpEval(cdp, MAP_READ, 30_000)));
      // What landed on disk.
      const ls = spawnSync('bash', ['-lc', `cd ${JSON.stringify(repoA)} && find docs/arch -type f | sort && echo --- && wc -c docs/arch/contract.json docs/arch/edges.json 2>/dev/null | tail -3`], { encoding: 'utf8' });
      note('A.docsArchOnDisk', (ls.stdout ?? '').trim());
      const one = spawnSync('bash', ['-lc', `cd ${JSON.stringify(repoA)} && head -c 900 docs/arch/edges.json && echo && ls docs/arch/components | head -12 && head -c 700 docs/arch/components/$(ls docs/arch/components | head -1)`], { encoding: 'utf8' });
      note('A.docsArchSample', (one.stdout ?? '').trim());
    }

    // --- repository B -----------------------------------------------------
    await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: repoB })}).then(() => true)`, 180_000);
    await sleep(2000);
    await press(cdp, CHORD_ARCH);
    await sleep(1000);
    const coldB = await waitFor(cdp, FILLED, 420_000, 750);
    note('B.msToFilledReading', coldB);
    note('B.pane', JSON.parse(await cdpEval(cdp, PANE_READ, 30_000)));
    await cdpEval(cdp, `document.querySelector('.arch-map-open').click(); true`, 20_000);
    await waitFor(cdp, `document.querySelector('[data-slot="arch-map-tab"] svg') !== null`, 120_000);
    await sleep(1500);
    const mapB = JSON.parse(await cdpEval(cdp, MAP_READ, 30_000));
    note('B.map.level1', mapB);
    const bTarget = (mapB.boxes ?? []).find((b) => b.id !== 'other')?.id ?? null;
    if (bTarget !== null) {
      await cdpEval(cdp, `document.querySelector('.arch-map-box[data-group="${bTarget}"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); true`, 20_000);
      await sleep(3000);
      note('B.map.level2', { drilled: bTarget, ...JSON.parse(await cdpEval(cdp, MAP_READ, 30_000)) });
    }

    // --- the refusals -----------------------------------------------------
    note('sessionStatusElements', await cdpEval(cdp, `document.querySelectorAll('[data-session-status]').length`, 20_000));
  }
);

readings.gitStatusA = { before: statusA, after: gitStatus(repoA) };
readings.gitStatusB = { before: statusB, after: gitStatus(repoB), unchanged: statusB === gitStatus(repoB) };
writeFileSync(OUT, `${JSON.stringify(readings, null, 1)}\n`);
say(`\np256: wrote ${OUT}`);
process.exit(0);
