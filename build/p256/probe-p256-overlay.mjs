#!/usr/bin/env node
/**
 * Phase 256 RESEARCH probe, second reading: the pane and the LEVEL 1 map over a
 * repository that already carries the drafted `docs/arch/`, so the overlay rule
 * can be read rather than reasoned about. One Electron, one scratch profile, a
 * scratch HOME, the harness socket, no agent, no token, no keychain.
 *
 * Usage: P256_REPO_A=<copy with docs/arch> node build/harness-socket.mjs gmux-p256o \
 *          'node build/p256/probe-p256-overlay.mjs'
 */
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { withElectron } from '../electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (l) => process.stdout.write(`${l}\n`);
const refuse = (m) => {
  process.stderr.write(`probe-p256-overlay: ${m}\n`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (!socket.startsWith('gmux-')) refuse('run through build/harness-socket.mjs');
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set');
const repoA = realpathSync((process.env['P256_REPO_A'] ?? '').trim() || refuse('P256_REPO_A'));
if (repoA === realpathSync(REPO)) refuse('that is the checkout this probe runs from');

const root = join(harnessDir, 'p256o');
const home = join(root, 'home');
const profile = join(root, 'profile');
for (const d of [home, profile]) mkdirSync(d, { recursive: true });

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
          const answer = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`, 5000);
          if (typeof answer === 'string') return { cdp, url: answer };
          cdp.close();
        } catch {
          if (cdp !== null) {
            try {
              cdp.close();
            } catch {
              /* gone */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no page answered in time');
    await sleep(200);
  }
}

const out = { when: new Date().toISOString(), repoA, steps: {} };
const note = (k, v) => {
  out.steps[k] = v;
  say(`\n== ${k}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 1).slice(0, 5000)}`);
};

await withElectron(
  {
    label: 'p256o',
    userDataDir: profile,
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
    ceilingMs: 12 * 60 * 1000
  },
  async () => {
    const { cdp } = await cdpForAppWindow(90_000);
    await cdp.call('Runtime.enable');
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: repoA })}).then(() => true)`, 120_000);
    await sleep(1500);
    await cdpEval(
      cdp,
      `(async () => { const b = await window.gmux.settingsGet(); const n = await window.gmux.settingsSet({ arch: { enabled: true, agentId: b.arch.agentId, model: b.arch.model } }); return n.arch.enabled; })()`,
      20_000
    );
    await sleep(800);
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'A', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2 | 8 });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'A', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2 | 8 });
    // Wait for the reading AND the first check.
    const started = Date.now();
    for (;;) {
      const ok = await cdpEval(cdp, `document.querySelector('[data-view="arch"] .arch-strip') !== null && (document.querySelector('[data-view="arch"] .rd-line')?.textContent ?? '').includes('imports')`, 20_000);
      if (ok === true || Date.now() - started > 300_000) break;
      await sleep(500);
    }
    note('msToContractFace', Date.now() - started);
    await sleep(6000);
    note(
      'paneText',
      await cdpEval(cdp, `(document.querySelector('[data-view="arch"]')?.textContent ?? '').trim()`, 20_000)
    );
    note(
      'outline',
      JSON.parse(
        await cdpEval(
          cdp,
          `JSON.stringify([...document.querySelectorAll('[data-view="arch"] .arch-outline:not(.rd-parts) li')].map((li) => ({ text: (li.textContent ?? '').trim(), title: li.querySelector('[title]')?.getAttribute('title') ?? null })))`,
          20_000
        )
      )
    );
    await cdpEval(cdp, `document.querySelector('.arch-map-open').click(); true`, 20_000);
    for (let i = 0; i < 120; i += 1) {
      if ((await cdpEval(cdp, `document.querySelector('[data-slot="arch-map-tab"] svg') !== null`, 20_000)) === true) break;
      await sleep(500);
    }
    await sleep(2000);
    note(
      'map.level1.withContract',
      JSON.parse(
        await cdpEval(
          cdp,
          `JSON.stringify({
            crumbs: [...document.querySelectorAll('.arch-map-crumb, .arch-map-crumb-here')].map((c) => (c.textContent ?? '').trim()),
            boxes: [...document.querySelectorAll('.arch-map-box')].map((g) => ({ id: g.getAttribute('data-group'), label: (g.querySelector('.arch-map-name')?.textContent ?? '').trim(), title: (g.querySelector('title')?.textContent ?? '').trim(), cls: g.getAttribute('class') })),
            edges: [...document.querySelectorAll('.arch-map-edge')].map((e) => ({ t: (e.querySelector('title')?.textContent ?? '').trim(), cls: e.getAttribute('class') }))
          })`,
          20_000
        )
      )
    );
  }
);

writeFileSync(join(REPO, 'build', 'p256', 'overlay-readings.json'), `${JSON.stringify(out, null, 1)}\n`);
say('\np256o: wrote build/p256/overlay-readings.json');
process.exit(0);
