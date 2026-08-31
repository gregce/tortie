#!/usr/bin/env node
/**
 * probe-p175-arch-flag.mjs. Architecture is off until you turn it on, driven
 * in the real app (Phase 175).
 *
 * ## What it proves, and why reading the code would not
 *
 * The unit tests hold each gate on its own. What they cannot hold is that
 * the SHIPPED app boots with the switch off, that the shell really hears the
 * flip in the same session, and that main's native menu really changed
 * rather than the template function having been written correctly and never
 * re-run. This probe launches ONE Electron on a scratch profile and reads
 * both sides.
 *
 * Three passes over one launch:
 *
 *   OFF   the shipped default on a profile that has never been written. The
 *         activity rail has no Architecture mark, the native menu carries
 *         none of the three Architecture rows, ⌃⇧A opens no view, and a
 *         `show-arch` and a `show-arch-map` INJECTED ON THE REAL MENU
 *         CHANNEL from main open nothing either. That injection is the point
 *         of the file: a hidden icon is not the same thing as a dead entry
 *         point, and it is how a stale queued row would arrive.
 *   ON    the switch flipped through the shipped `settings:set` bridge, the
 *         way the Settings page flips it. Every one of the above comes back
 *         in the SAME SESSION with no relaunch, read from the real rail and
 *         the real `Menu.getApplicationMenu()`, and the map TAB is opened
 *         here through the same injected menu action.
 *   OFF   flipped back, and all of it goes again, the already-open map tab
 *         included. The fix round added that last clause and the pass above
 *         it. The first build of this probe read `.arch-map-tab` only in the
 *         OFF passes, where no map had ever been opened, so it could not see
 *         a map tab OUTLIVING the switch, which is what it did: the rail
 *         mark, the three menu rows and the Architecture pane all went and a
 *         fully usable Architecture surface stayed on screen.
 *
 * The Phase 63 refusals are checked too: no session status moved, nothing
 * spawned, and the scratch repository's docs/arch bytes are identical before
 * and after by digest.
 *
 * ## How the menu is read
 *
 * `--inspect=0` makes Electron print its main process inspector url, and the
 * url is read out of the app's own output rather than guessed. That needs no
 * accessibility permission, so this runs green on a fresh Mac. It reads
 * `Menu.getApplicationMenu()` and sends on `ui:menuAction`, and nothing else.
 *
 * ## Safety
 *
 * Without GMUX_TMUX_SOCKET it refuses. The app gets its own profile and its
 * own HOME under the harness directory, and the one Electron is ended by
 * `withElectron`'s finally block whatever happened. It signals nothing
 * itself, spawns no agent, opens nothing under the person's home and creates
 * no session.
 *
 * Usage, from the worktree root:
 *   node build/harness-socket.mjs gmux-p175 'node build/probe-p175-arch-flag.mjs'
 *
 * Exit 0 when every check passes, 1 otherwise, 2 when the probe refuses.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from './cdp-client.mjs';
import { withElectron } from './electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => process.stdout.write(`${line}\n`);

function refuse(message) {
  process.stderr.write(`probe-p175-arch-flag: ${message}\n`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}". Run through build/harness-socket.mjs.`);
}
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set. Run through build/harness-socket.mjs.');
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) refuse('no build under out/. Run npm run build first.');

mkdirSync(join(harnessDir, 'p175'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p175'));
const home = join(root, 'home');
const profile = join(root, 'profile');
const repo = join(root, 'repo');
for (const d of [home, profile]) mkdirSync(d, { recursive: true });

/** A small repository carrying a docs/arch contract, so the flag has something to hide. */
function makeRepo() {
  rmSync(repo, { recursive: true, force: true });
  mkdirSync(join(repo, 'src'), { recursive: true });
  mkdirSync(join(repo, 'docs', 'arch'), { recursive: true });
  const git = (...a) => {
    const r = spawnSync('git', a, { cwd: repo, encoding: 'utf8', env: { ...process.env, HOME: home } });
    if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  };
  git('init', '-q');
  git('config', 'user.email', 'p175@example.invalid');
  git('config', 'user.name', 'p175');
  writeFileSync(join(repo, 'README.md'), '# p175\n\nOne line.\n');
  writeFileSync(join(repo, 'src', 'app.js'), 'export const one = 1;\n');
  writeFileSync(
    join(repo, 'docs', 'arch', 'index.md'),
    ['---', 'schema: arch/1', 'name: p175', '---', '', 'One part.', ''].join('\n')
  );
  git('add', '.');
  git('commit', '-q', '-m', 'first');
}
makeRepo();

/** Every byte under docs/arch, as one digest, so "untouched" is a number. */
function archDigest() {
  const dir = join(repo, 'docs', 'arch');
  const h = createHash('sha256');
  for (const name of readdirSync(dir).sort()) {
    h.update(name);
    h.update(readFileSync(join(dir, name)));
  }
  return h.digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// The two connections
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

/** Attach to MAIN over the node inspector, whose url the app printed itself. */
async function cdpForMain(handle, timeoutMs) {
  const started = Date.now();
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) {
      try {
        return await wsConnect(m[1]);
      } catch {
        /* the port is printed a beat before the listener is up */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('the main process inspector never appeared');
    await sleep(300);
  }
}

// ---------------------------------------------------------------------------
// The reads
// ---------------------------------------------------------------------------

/** Every label in the whole application menu, flattened. Read from MAIN. */
const MENU_READ = `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { Menu } = load('electron');
  const menu = Menu.getApplicationMenu();
  if (menu === null) return null;
  const out = [];
  const walk = (items) => {
    for (const it of items) {
      if (typeof it.label === 'string' && it.label !== '') {
        out.push({ label: it.label, visible: it.visible !== false, enabled: it.enabled !== false });
      }
      if (it.submenu && Array.isArray(it.submenu.items)) walk(it.submenu.items);
    }
  };
  walk(menu.items);
  return JSON.stringify(out);
})()`;

/** Inject one menu action on the REAL channel, the way a stale row would. */
function injectAction(action) {
  return `(() => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { BrowserWindow } = load('electron');
  const wins = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  let sent = 0;
  for (const w of wins) {
    if (w.webContents.isDestroyed()) continue;
    w.webContents.send('ui:menuAction', ${JSON.stringify(action)});
    sent += 1;
  }
  return sent;
})()`;
}

/** What the shell is drawing right now, in the terms the phase gates. */
const FACE_READ = `(() => {
  const rail = [...document.querySelectorAll('.ab-item')].map(
    (el) => el.getAttribute('aria-label') ?? el.getAttribute('title') ?? ''
  );
  return JSON.stringify({
    railCount: rail.length,
    archOnRail: rail.some((t) => t.startsWith('Architecture')),
    archPane: document.querySelector('[data-view="arch"]') !== null,
    archMapTab: document.querySelector('.arch-map-tab') !== null,
    archMapTabRows: [...document.querySelectorAll('.ed-tab-name')].filter(
      (el) => (el.textContent ?? '').trim() === 'Architecture map'
    ).length
  });
})()`;

async function mainEval(cdp, expression, ms = 15_000) {
  const res = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    includeCommandLineAPI: true
  });
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value ?? null;
}

const ARCH_ROWS = ['Architecture', 'Architecture Map', 'Aim at a Promise…'];

async function readAll(cdp, main) {
  const face = JSON.parse(await cdpEval(cdp, FACE_READ, 15_000));
  const labels = JSON.parse((await mainEval(main, MENU_READ)) ?? '[]');
  const archRows = labels.filter((r) => ARCH_ROWS.includes(r.label));
  return { ...face, menuLabels: labels.length, archRows };
}

async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

/** ⌃⇧A, the view.arch chord. Modifiers: 2 is Control, 8 is Shift. */
const CHORD_ARCH = { key: 'A', code: 'KeyA', vk: 65, modifiers: 2 | 8 };

/** Flip the switch through the shipped bridge, the way Settings does. */
function flip(on) {
  return `(async () => {
  const before = await window.gmux.settingsGet();
  const next = await window.gmux.settingsSet({
    arch: { enabled: ${on ? 'true' : 'false'}, agentId: before.arch.agentId, model: before.arch.model }
  });
  return next.arch.enabled;
})()`;
}

// ---------------------------------------------------------------------------

const failures = [];
const check = (ok, line) => {
  say(`  ${ok ? 'ok  ' : 'FAIL'} ${line}`);
  if (!ok) failures.push(line);
};

const digestBefore = archDigest();
let statusesSeen = 'not read';

await withElectron(
  {
    label: 'p175',
    userDataDir: profile,
    tmuxSocket: null,
    args: ['--remote-debugging-port=0', '--inspect=0', '--use-mock-keychain'],
    env: { HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' },
    ceilingMs: 15 * 60 * 1000
  },
  async (handle) => {
    const { cdp, url } = await cdpForAppWindow(90_000);
    say(`p175: app window at ${url}`);
    await cdp.call('Runtime.enable');
    const main = await cdpForMain(handle, 60_000);
    say('p175: attached to the main process over the node inspector');
    for (;;) {
      if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
      await sleep(50);
    }
    await cdpEval(cdp, `window.__gmuxShotDrive(${JSON.stringify({ projectPath: repo })}).then(() => true)`, 60_000);
    await sleep(1500);

    // ---- PASS 1: the shipped default ------------------------------------
    say('\nOFF, the shipped default on a profile that has never been written');
    const stored = await cdpEval(cdp, `window.gmux.settingsGet().then((s) => JSON.stringify(s.arch))`, 15_000);
    check(JSON.parse(stored).enabled === false, `settings say arch.enabled is off (${stored})`);
    const off1 = await readAll(cdp, main);
    check(!off1.archOnRail, `the activity rail has no Architecture mark (${String(off1.railCount)} marks)`);
    check(off1.archRows.length === 0, `the native menu carries none of the three rows (${String(off1.menuLabels)} labels in all)`);
    check(!off1.archPane, 'no Architecture pane is mounted');

    await press(cdp, CHORD_ARCH);
    await sleep(600);
    const afterChord = JSON.parse(await cdpEval(cdp, FACE_READ, 15_000));
    check(!afterChord.archPane, 'the view.arch chord opened nothing');

    // The named independent step: the rows are gone, so inject the actions
    // they would have sent, on the real channel, from main.
    for (const action of ['show-arch', 'show-arch-map', 'arch-aim']) {
      const sent = await mainEval(main, injectAction(action));
      check(sent >= 1, `${action} was injected on ui:menuAction into ${String(sent)} window(s)`);
    }
    await sleep(900);
    const afterInject = JSON.parse(await cdpEval(cdp, FACE_READ, 15_000));
    check(!afterInject.archPane, 'an injected show-arch opened no view');
    check(!afterInject.archMapTab, 'an injected show-arch-map opened no map tab');

    // ---- PASS 2: on ------------------------------------------------------
    say('\nON, flipped through the shipped settings bridge, no relaunch');
    check((await cdpEval(cdp, flip(true), 15_000)) === true, 'settings:set answered enabled true');
    await sleep(1200);
    const on = await readAll(cdp, main);
    check(on.archOnRail, `the Architecture mark is on the rail (${String(on.railCount)} marks)`);
    check(
      on.archRows.length === 3 && on.archRows.every((r) => r.visible && r.enabled),
      `all three menu rows are present, visible and enabled (${on.archRows.map((r) => r.label).join(', ') || 'none'})`
    );
    await press(cdp, CHORD_ARCH);
    check(
      await (async () => {
        for (let i = 0; i < 60; i += 1) {
          if ((await cdpEval(cdp, `document.querySelector('[data-view="arch"]') !== null`)) === true) return true;
          await sleep(100);
        }
        return false;
      })(),
      'the view.arch chord opened the view in the same session'
    );

    // THE FIX ROUND'S OWN STEP. The map tab is opened here, while the switch
    // is ON, which is the state the first build of this probe never read it
    // in: it asked about `.arch-map-tab` only in the OFF passes, where no map
    // had ever been opened, so a map tab that OUTLIVED the switch was
    // invisible to it. Opened through the same injected menu action, so this
    // is the shipped `show-arch-map` door and not a test hook.
    await mainEval(main, injectAction('show-arch-map'));
    const mapOpened = await (async () => {
      for (let i = 0; i < 60; i += 1) {
        if ((await cdpEval(cdp, `document.querySelector('.arch-map-tab') !== null`)) === true) return true;
        await sleep(100);
      }
      return false;
    })();
    check(mapOpened, 'show-arch-map opened the map tab while the switch is on');
    const onMap = JSON.parse(await cdpEval(cdp, FACE_READ, 15_000));
    check(onMap.archMapTabRows === 1, `the map tab has a tab row (${String(onMap.archMapTabRows)} rows named Architecture map)`);

    // ---- PASS 3: off again ----------------------------------------------
    say('\nOFF again, and everything goes');
    check((await cdpEval(cdp, flip(false), 15_000)) === false, 'settings:set answered enabled false');
    await sleep(1200);
    const off2 = await readAll(cdp, main);
    check(!off2.archOnRail, `the Architecture mark left the rail (${String(off2.railCount)} marks)`);
    check(off2.archRows.length === 0, 'all three menu rows left the native menu');
    check(!off2.archPane, 'the Architecture pane is not drawn any more');
    check(!off2.archMapTab, 'the open Architecture Map tab closed with the rest of it');
    check(off2.archMapTabRows === 0, `no tab row named Architecture map is left (${String(off2.archMapTabRows)})`);
    check(
      off2.railCount === off1.railCount && off2.menuLabels === off1.menuLabels,
      `the rail and the menu are back to the shipped shape (${String(off2.railCount)} marks, ${String(off2.menuLabels)} labels)`
    );

    // ---- the three Phase 63 refusals -------------------------------------
    say('\nthe three refusals Phase 63 wrote, still true');
    statusesSeen = await cdpEval(
      cdp,
      `(() => { const s = document.querySelectorAll('[data-session-status]'); return String(s.length); })()`,
      15_000
    );
    check(statusesSeen === '0', `no session exists, so no verdict set one (${statusesSeen} status elements)`);
    const spawned = spawnSync('bash', ['-lc', `pgrep -laf "${repo}" | grep -v pgrep | wc -l`], { encoding: 'utf8' });
    check((spawned.stdout ?? '').trim() === '0', `nothing spawned against the scratch repository (${(spawned.stdout ?? '').trim()})`);
  }
);

const digestAfter = archDigest();
check(digestBefore === digestAfter, `docs/arch on disk is untouched by the flag (sha256 ${digestBefore})`);

say('');
if (failures.length > 0) {
  say(`probe-p175-arch-flag: FAIL, ${String(failures.length)} check(s):`);
  for (const f of failures) say(`  - ${f}`);
  process.exit(1);
}
say('probe-p175-arch-flag: PASS. The switch ships off, the rail and the native menu carry nothing, the chord and an injected menu action open nothing, turning it on reveals all of it in the same session including the map tab, and turning it off removes all of it including a map tab that was already open.');
process.exit(0);
