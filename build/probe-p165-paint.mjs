#!/usr/bin/env node
/**
 * probe-p165-paint.mjs. What a warm launch loads and when it paints, and
 * whether every surface Phase 165 made lazy still opens the first time,
 * offline (Phase 165).
 *
 * ## What it proves, and how
 *
 * Phase 165 moved the Catch Me Up page, the Architecture subject and the
 * other secondary surfaces out of the entry chunk. The byte claim is the
 * gate's, read off the built output. This probe is the other two claims,
 * which only a window can answer:
 *
 *   1. The paint ruler did not get worse. It launches the REAL app, not a
 *      smoke, through build/electron-run.mjs with build/p164-spawn-hook.cjs
 *      loaded into the main process, so Phase 163's milestones (window-shown,
 *      first-attach, first-bytes) are read the way Phase 164 read them, and
 *      it reads the renderer's own navigation timing over the devtools
 *      protocol: domInteractive, DOMContentLoaded and every script the page
 *      fetched, with bytes. One cold launch, discarded from the statistics,
 *      then GMUX_P165_RUNS warm launches.
 *
 *   2. Every lazy surface opens the first time, offline. In a DRIVE launch of
 *      its own after the warm runs (its own because the diagnostics door,
 *      `window.__gmuxShotDrive`, exists only when the launch asks for the
 *      probe registry with GMUX_PROBES=1, and a probes launch boots more than
 *      a person's launch does, so it must not sit in the timing sample), the
 *      page is put offline through the
 *      protocol's own network emulation, and then the person's own gestures
 *      are sent as real input events: the Catch Me Up chord, the Architecture
 *      chord, a click on the map control, and the diagnostics report through
 *      its one harness door. For each, the time from the gesture to the
 *      surface in the DOM is measured on the page's own clock, the chunks
 *      that fetch was for are listed with bytes, and a photograph is taken.
 *      Any exception the page throws in that window fails the run.
 *
 * ## How the parent commit is measured
 *
 * Build the parent in its own checkout, run this probe with
 * GMUX_P165_APP_ROOT pointing at it, then run it on the new commit with
 * GMUX_P165_BASELINE naming the first run's out directory. The tables print
 * side by side, and the same rule Phase 164 used decides a regression: a p50
 * past the baseline's p95 AND more than ten percent past the baseline's p50.
 * On the parent every surface is eager, so its "chunks fetched at open" rows
 * are empty and its open latency is the floor the split is compared with.
 *
 * ## Safety, absolute
 *
 *   - Refuses to run without a harness socket, and refuses `gmux` and
 *     `default` by name. Every launch ends in the helper's finally block and
 *     the scratch server is ended here in a finally block of its own.
 *   - Every profile, repository and HOME is under GMUX_HARNESS_DIR, so no
 *     file under the person's home is opened.
 *   - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *     count taken before and after, which must match.
 *   - It signals nothing itself and exits through process.exit after the
 *     last withElectron returns.
 *
 * Usage:
 *   node build/harness-socket.mjs --fresh gmux-p165-paint 'node build/probe-p165-paint.mjs'
 *   node build/probe-p165-paint.mjs --compare <before out dir> <after out dir>
 *
 * Knobs: GMUX_P165_OUT_DIR (default out/p165), GMUX_P165_RUNS (default 5),
 * GMUX_P165_HOLD_MS (default 8000), GMUX_P165_APP_ROOT (a built checkout to
 * launch, default this one), GMUX_P165_BASELINE (an earlier out directory to
 * compare with), GMUX_P165_DRIVE (default 1; 0 skips the drive),
 * GMUX_P165_OFFLINE (default 1; 0 drives the same gestures online).
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cdpEval, wsConnect } from './cdp-client.mjs';
import { pickRendererTarget, selfTest as targetSelfTest } from './cdp-target.mjs';
import { withElectron } from './electron-run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const TAG = '[probe:p165]';
const t0 = Date.now();
const say = (line) =>
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Number(n).toLocaleString('en-US');

/** A percentile over a list, by the nearest rank, the way Phase 164 takes it. */
function pct(xs, p) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.max(0, Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1))];
}
const dist = (xs) => ({ p50: pct(xs, 50), p95: pct(xs, 95), values: xs });
const fmtDist = (d) =>
  d.values.length === 0
    ? 'never'
    : `p50 ${Math.round(d.p50)} p95 ${Math.round(d.p95)} [${d.values.map((x) => Math.round(x)).join(' ')}]`;

// ---------------------------------------------------------------------------
// --compare: launches nothing, needs no socket.
// ---------------------------------------------------------------------------

const SURFACES = ['overview', 'arch', 'map', 'diagnostics'];
const MILESTONES = [
  'main app-ready',
  'main window-shown',
  'main sessions-listed',
  'main first-attach',
  'main first-bytes',
  'renderer domInteractive',
  'renderer DOMContentLoaded end',
  'renderer DOMContentLoaded since main start'
];

function regression(before, after) {
  if (before === undefined || after === undefined) return false;
  if (before.p95 === null || after.p50 === null) return false;
  return after.p50 > before.p95 && after.p50 > before.p50 * 1.1;
}

function printComparison(before, after) {
  console.log('');
  console.log(`== warm, ${String(before.runs)} runs before and ${String(after.runs)} after ==`);
  let worse = 0;
  for (const name of MILESTONES) {
    const b = before.summary[name];
    const a = after.summary[name];
    const bad = regression(b, a);
    if (bad) worse += 1;
    console.log(
      `  ${name.padEnd(42)} before ${b ? fmtDist(b) : 'none'}\n  ${''.padEnd(42)} after  ${a ? fmtDist(a) : 'none'}${bad ? '  REGRESSION' : ''}`
    );
  }
  console.log('');
  console.log('== eager scripts the page fetched at boot (warm run 1) ==');
  for (const [label, s] of [['before', before], ['after', after]]) {
    const r = s.bootScripts;
    console.log(
      `  ${label}: ${String(r.length)} script(s), ${fmt(r.reduce((x, y) => x + y.decoded, 0))} bytes decoded: ${r.map((x) => `${x.name} ${fmt(x.decoded)}`).join(' | ')}`
    );
  }
  console.log('');
  console.log(`== the first open of each lazy surface, ${after.drive?.overview?.offline === true ? 'offline' : 'ONLINE'} ==`);
  for (const surface of after.drive === null || after.drive === undefined ? [] : SURFACES) {
    const b = before.drive?.[surface];
    const a = after.drive[surface];
    const line = (d) =>
      d === undefined
        ? 'not driven'
        : `${d.opened ? 'opened' : 'DID NOT OPEN'} in ${d.opened ? String(Math.round(d.ms)) : '-'} ms, fetched ${d.fetched.length === 0 ? 'nothing' : d.fetched.map((f) => `${f.name} ${fmt(f.decoded)}B`).join(', ')}`;
    console.log(`  ${surface.padEnd(12)} before ${line(b)}\n  ${''.padEnd(12)} after  ${line(a)}`);
  }
  return worse;
}

const argv = process.argv.slice(2);
if (argv[0] === '--compare') {
  const [, a, b] = argv;
  if (!a || !b) refuse('--compare needs two out directories');
  const read = (d) => JSON.parse(readFileSync(join(resolve(d), 'summary.json'), 'utf8'));
  const worse = printComparison(read(a), read(b));
  process.exit(worse === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The live probe.
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '' || socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) {
  refuse(`GMUX_TMUX_SOCKET is "${socket}". Run through build/harness-socket.mjs.`);
}
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('GMUX_HARNESS_DIR is not set. Run through build/harness-socket.mjs.');
const appRoot = resolve((process.env['GMUX_P165_APP_ROOT'] ?? '').trim() || REPO);
if (!existsSync(join(appRoot, 'out', 'main', 'index.js'))) refuse(`${appRoot} has no build. Run npm run build there first.`);
const HOOK = join(REPO, 'build', 'p164-spawn-hook.cjs');
if (!existsSync(HOOK)) refuse(`${HOOK} is missing.`);
const runs = Number(process.env['GMUX_P165_RUNS'] ?? '5');
const holdMs = Number(process.env['GMUX_P165_HOLD_MS'] ?? '8000');
const drive = (process.env['GMUX_P165_DRIVE'] ?? '1') !== '0';
// The offline claim is the default. GMUX_P165_OFFLINE=0 drives the same
// gestures with the page online, which is how the cost of the protocol's
// own offline emulation was separated from the cost of a chunk load.
const offlineDrive = (process.env['GMUX_P165_OFFLINE'] ?? '1') !== '0';
const outDir = resolve((process.env['GMUX_P165_OUT_DIR'] ?? '').trim() || join(REPO, 'out', 'p165'));
const baselineDir = (process.env['GMUX_P165_BASELINE'] ?? '').trim();
mkdirSync(outDir, { recursive: true });
mkdirSync(join(harnessDir, 'p165'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p165'));
const home = join(root, 'home');
const profile = join(root, 'profile');

/**
 * The one read of the operator's server: every session by its immutable id
 * with its @gmux-id, before and after. Phase 171 replaced a bare count. The
 * count moved from 48 to 49 during a run on 2026-08-30 because the operator
 * opened a session of his own while the probe ran, and the probe called that
 * a failure. A session this run created would be in THIS RUN'S manifest, so
 * that is the test for a leak; a session that vanished is always a failure.
 */
function operatorSessions() {
  const out = spawnSync(
    'tmux',
    ['-L', 'gmux', 'list-sessions', '-F', '#{session_id}\t#{session_name}\t#{@gmux-id}'],
    { encoding: 'utf8' }
  );
  const rows = new Map();
  if (out.status !== 0) return rows;
  for (const line of out.stdout.split('\n')) {
    if (line.trim() === '') continue;
    const [id, name, gmuxId] = line.split('\t');
    rows.set(id, { name: name ?? '', gmuxId: gmuxId ?? '' });
  }
  return rows;
}
/** Does this run's own scratch manifest know a session id? Then this run made it. */
function scratchManifestKnows(gmuxId) {
  const db = join(profile, 'gmux', 'manifest.db');
  if (gmuxId === '' || !existsSync(db)) return false;
  const r = spawnSync(
    'sqlite3',
    [db, `SELECT COUNT(*) FROM sessions WHERE id = '${gmuxId.replace(/'/g, "''")}';`],
    { encoding: 'utf8' }
  );
  return r.status === 0 && Number(r.stdout.trim()) > 0;
}
/** Every Electron shaped process, by pid, the way CLAUDE.md says to count. */
function electronRows() {
  const out = spawnSync(
    'sh',
    ['-c', 'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct'],
    { encoding: 'utf8' }
  );
  const rows = new Map();
  for (const line of out.stdout.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m) rows.set(Number(m[1]), line.trim());
  }
  return rows;
}
const tmux = (...a) => spawnSync('tmux', ['-L', socket, ...a], { encoding: 'utf8' });

/**
 * The Electron rows this run left: the new rows whose command line names
 * this run's profile, plus any bare `Tortie` row (the main process, which
 * renames itself and carries no arguments) whose child is one of those.
 * Another workflow's probes may be running beside this one, and their rows
 * are reported but never counted.
 */
function leftByThisRun(before) {
  const now = electronRows();
  const fresh = [...now].filter(([pid]) => !before.has(pid));
  const command = (pid) => spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout.trim();
  const mine = new Map();
  for (const [pid, line] of fresh) {
    if (command(pid).includes(profile)) mine.set(pid, line);
  }
  for (const [pid, line] of fresh) {
    if (!/\sTortie$/.test(line)) continue;
    const kids = [...mine.keys()].filter((k) => Number(/^\s*\d+\s+(\d+)/.exec(now.get(k))?.[1]) === pid);
    if (kids.length > 0) mine.set(pid, line);
  }
  const others = fresh.filter(([pid]) => !mine.has(pid)).length;
  if (others > 0) say(`${String(others)} new Electron row(s) belong to another run on this machine and are not counted.`);
  return [...mine.values()];
}

function makeRepo(path, name) {
  mkdirSync(path, { recursive: true });
  const git = (...a) => spawnSync('git', a, { cwd: path, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'p165@example.invalid');
  git('config', 'user.name', 'p165');
  writeFileSync(join(path, 'README.md'), `# ${name}\n`);
  git('add', '.');
  git('commit', '-q', '-m', 'first');
}
function purgeChromiumCaches(p) {
  for (const d of ['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'blob_storage', 'Session Storage']) {
    const x = join(p, d);
    if (x.startsWith(root) && existsSync(x)) rmSync(x, { recursive: true, force: true });
  }
}
function seedProject(p, path) {
  const db = join(p, 'gmux', 'manifest.db');
  if (!existsSync(db)) throw new Error(`no manifest at ${db}`);
  const r = spawnSync(
    'sqlite3',
    [db, `INSERT OR IGNORE INTO projects (id, path, name) VALUES ('p165-home-${String(Date.now())}', '${path}', '${basename(path)}');`],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) throw new Error(`sqlite3: ${r.stderr}`);
}
/** The hook's hold record for a launch, once it is written. */
function mainLog(logFile) {
  for (const name of readdirSync(dirname(logFile))) {
    if (!name.startsWith(`${basename(logFile)}.`) || !name.endsWith('.json')) continue;
    try {
      const j = JSON.parse(readFileSync(join(dirname(logFile), name), 'utf8'));
      if (j.type === 'browser' && j.why === 'hold') return join(dirname(logFile), name);
    } catch {
      /* half written; the next poll reads it whole */
    }
  }
  return null;
}
/**
 * Attach to the main window. The pick itself is build/cdp-target.mjs, proved
 * on fixtures before any launch, and when the window is not found in time the
 * error says what the browser listed instead, so the reader can tell a
 * window that never loaded from one another client holds.
 */
async function cdpForProfile(profileDir, timeoutMs) {
  const started = Date.now();
  let last = 'DevToolsActivePort has not been written';
  for (;;) {
    try {
      const port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      if (port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const pick = pickRendererTarget(list);
        if (pick.target !== null) {
          return await wsConnect(pick.target.webSocketDebuggerUrl, {
            collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Network.requestWillBeSent', 'Network.loadingFinished']
          });
        }
        last = pick.why;
      }
    } catch (e) {
      last = `port file or /json/list not answering yet: ${String(e?.message ?? e)}`;
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`observer: no main window target within ${String(timeoutMs)} ms; last seen: ${last}`);
    }
    await sleep(50);
  }
}

const RENDERER_READ = `(() => {
  const n = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource')
    .filter((r) => /\\.(js|css)$/.test(r.name))
    .map((r) => ({ name: r.name.replace(/^.*\\//, ''), start: r.startTime, end: r.responseEnd, decoded: r.decodedBodySize }));
  return {
    timeOrigin: performance.timeOrigin,
    domInteractive: n.domInteractive,
    dclStart: n.domContentLoadedEventStart,
    dclEnd: n.domContentLoadedEventEnd,
    loadEnd: n.loadEventEnd,
    resources: res,
    xterm: document.querySelectorAll('.xterm').length
  };
})()`;

/**
 * Arm a page side watcher that resolves when `selector` is in the DOM, with
 * the time from the first `eventName` seen after arming (or from arming when
 * no event is named) to the element's arrival, on the page's own clock.
 */
function armWatcher(cdp, selector, eventName, limitMs) {
  return cdpEval(
    cdp,
    `new Promise((resolve) => {
      const armed = performance.now();
      let at = null;
      const onEvent = () => { if (at === null) at = performance.now(); };
      if (${JSON.stringify(eventName)} !== null) window.addEventListener(${JSON.stringify(eventName)}, onEvent, { capture: true, once: true });
      const done = (opened) => {
        const seen = performance.now();
        if (${JSON.stringify(eventName)} !== null) window.removeEventListener(${JSON.stringify(eventName)}, onEvent, { capture: true });
        obs.disconnect();
        clearInterval(tick);
        resolve({ opened, ms: seen - (at ?? armed), gestureSeen: at !== null });
      };
      const check = () => { if (document.querySelector(${JSON.stringify(selector)}) !== null) done(true); };
      const obs = new MutationObserver(check);
      obs.observe(document.documentElement, { childList: true, subtree: true });
      const tick = setInterval(() => { check(); if (performance.now() - armed > ${String(limitMs)}) done(false); }, 20);
      check();
    })`,
    limitMs + 5000
  );
}

/**
 * The scripts and stylesheets the page fetched since `mark` events had been
 * seen, with bytes, from the Network domain. Resource timing is empty on a
 * file: page, so the protocol's own events are the only record.
 */
function fetchedSince(cdp, mark) {
  const evs = cdp.events().slice(mark);
  const sizes = new Map();
  for (const e of evs) {
    if (e.method === 'Network.loadingFinished') sizes.set(e.params.requestId, e.params.encodedDataLength);
  }
  const out = [];
  for (const e of evs) {
    if (e.method !== 'Network.requestWillBeSent') continue;
    const url = e.params.request?.url ?? '';
    if (!/\.(js|css)$/.test(url)) continue;
    out.push({ name: url.replace(/^.*\//, ''), decoded: sizes.get(e.params.requestId) ?? -1 });
  }
  return out;
}
const fetchedLine = (fetched) => (fetched.length === 0 ? 'nothing' : fetched.map((f) => `${f.name} ${fmt(f.decoded)}B`).join(', '));

/** A real key press, both halves, with the modifiers the keymap names. */
async function press(cdp, { key, code, vk, modifiers }) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
/** A real click at the centre of the first element the selector finds. */
async function click(cdp, selector) {
  const rect = await cdpEval(
    cdp,
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el === null) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; })()`
  );
  if (rect === null) throw new Error(`nothing matches ${selector} to click`);
  const at = { x: rect.x, y: rect.y, button: 'left', clickCount: 1 };
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', ...at });
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at });
  return rect;
}
async function photograph(cdp, file) {
  const shot = await cdp.call('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
}

/** The offline drive: every lazy surface, first open, real gestures. */
async function driveSurfaces(cdp) {
  const out = {};
  await cdp.call('Runtime.enable');
  await cdp.call('Network.enable');
  if (offlineDrive) {
    await cdp.call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  }
  const offline = await cdpEval(cdp, 'navigator.onLine === false');
  const exceptionsBefore = cdp.events().filter((e) => e.method === 'Runtime.exceptionThrown').length;

  // 1. Catch Me Up, by its chord. Shift+Cmd+U: Shift is 8 and Meta is 4.
  {
    const mark = cdp.events().length;
    const watcher = armWatcher(cdp, '.overview-layer', 'keydown', 5000);
    await sleep(50);
    await press(cdp, { key: 'U', code: 'KeyU', vk: 85, modifiers: 8 | 4 });
    const r = { ...(await watcher), fetched: [] };
    await sleep(100);
    r.fetched = fetchedSince(cdp, mark);
    await sleep(250);
    await photograph(cdp, join(outDir, 'drive-overview.png'));
    const face = await cdpEval(cdp, `(() => { const l = document.querySelector('.overview-layer'); return l === null ? null : { rows: document.querySelectorAll('.overview-line').length, text: (l.innerText || '').slice(0, 120) }; })()`);
    out.overview = { ...r, offline, face };
    say(`overview: ${r.opened ? 'opened' : 'DID NOT OPEN'} in ${String(Math.round(r.ms))} ms, fetched ${fetchedLine(r.fetched)}`);
    // Escape closes it; the layer must leave the DOM.
    await press(cdp, { key: 'Escape', code: 'Escape', vk: 27, modifiers: 0 });
    for (let i = 0; i < 100; i += 1) {
      if ((await cdpEval(cdp, `document.querySelector('.overview-layer') === null`)) === true) break;
      await sleep(20);
    }
    out.overview.closed = await cdpEval(cdp, `document.querySelector('.overview-layer') === null`);
  }

  // 2. The Architecture subject, by its chord. Ctrl+Shift+A: Ctrl is 2.
  {
    const mark = cdp.events().length;
    const watcher = armWatcher(cdp, '.arch', 'keydown', 5000);
    await sleep(50);
    await press(cdp, { key: 'A', code: 'KeyA', vk: 65, modifiers: 2 | 8 });
    const r = { ...(await watcher), fetched: [] };
    await sleep(100);
    r.fetched = fetchedSince(cdp, mark);
    await sleep(250);
    await photograph(cdp, join(outDir, 'drive-arch.png'));
    const face = await cdpEval(cdp, `(() => ({ view: document.querySelector('[data-view="arch"]') !== null, title: document.querySelector('[data-view="arch"] .view-header-title')?.textContent ?? null, headerHeight: document.querySelector('[data-view="arch"] .view-header')?.getBoundingClientRect().height ?? null, mapControl: document.querySelector('.arch-map-open') !== null }))()`);
    out.arch = { ...r, offline, face };
    say(`arch: ${r.opened ? 'opened' : 'DID NOT OPEN'} in ${String(Math.round(r.ms))} ms, header "${String(face.title)}" ${String(face.headerHeight)}px, fetched ${fetchedLine(r.fetched)}`);
  }

  // 3. The map tab, by the subject's own control.
  {
    const mark = cdp.events().length;
    const watcher = armWatcher(cdp, '.arch-map-tab', 'mousedown', 8000);
    await sleep(50);
    await click(cdp, '.arch-map-open');
    const r = { ...(await watcher), fetched: [] };
    await sleep(100);
    r.fetched = fetchedSince(cdp, mark);
    await sleep(400);
    await photograph(cdp, join(outDir, 'drive-map.png'));
    out.map = { ...r, offline };
    say(`map: ${r.opened ? 'opened' : 'DID NOT OPEN'} in ${String(Math.round(r.ms))} ms, fetched ${fetchedLine(r.fetched)}`);
  }

  // 4. The diagnostics report, through its one harness door, which is the
  // door the View menu row and Phase 163's own probe use. The door exists
  // only on a GMUX_PROBES=1 launch, which is why the drive is a launch of
  // its own: with GMUX_PROBES=0 the probe registry never loads, the hook is
  // never installed, and this leg cannot open no matter what the product
  // does. That is what its DID NOT OPEN meant from Phase 165 to Phase 171.
  {
    const mark = cdp.events().length;
    const watcher = armWatcher(cdp, '.diag', null, 15000);
    await sleep(50);
    const hook = await cdpEval(cdp, `typeof window.__gmuxShotDrive === 'function'`);
    if (hook === true) {
      await cdpEval(cdp, `window.__gmuxShotDrive({ projectPath: ${JSON.stringify(home)}, diagnosticsReport: true })`, 60_000);
    }
    const r = { ...(await watcher), fetched: [] };
    await sleep(250);
    r.fetched = fetchedSince(cdp, mark);
    await photograph(cdp, join(outDir, 'drive-diagnostics.png'));
    out.diagnostics = { ...r, offline, hook };
    say(`diagnostics: ${r.opened ? 'opened' : 'DID NOT OPEN'} in ${String(Math.round(r.ms))} ms, fetched ${fetchedLine(r.fetched)}${hook ? '' : ' (no shot hook on this window)'}`);
  }

  const thrown = cdp.events().filter((e) => e.method === 'Runtime.exceptionThrown').slice(exceptionsBefore);
  const consoleErrors = cdp.events().filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error');
  out.exceptions = thrown.map((e) => e.params?.exceptionDetails?.exception?.description ?? e.params?.exceptionDetails?.text ?? 'unknown');
  out.consoleErrors = consoleErrors.map((e) => (e.params?.args ?? []).map((a) => a.value ?? a.description ?? '').join(' '));
  await cdp.call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  return out;
}

async function launch(label, extraEnv, logFile, opts = {}) {
  for (const n of readdirSync(dirname(logFile))) {
    if (n.startsWith(basename(logFile))) rmSync(join(dirname(logFile), n));
  }
  rmSync(join(profile, 'DevToolsActivePort'), { force: true });
  const started = Date.now();
  let text = '';
  let renderer = null;
  let driven = null;
  let rendererErr = null;
  await withElectron(
    {
      label,
      userDataDir: profile,
      cwd: appRoot,
      tmuxSocket: null,
      program: 'app',
      args: opts.cdp ? ['--remote-debugging-port=0', '--use-mock-keychain'] : ['--use-mock-keychain'],
      env: {
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        NODE_OPTIONS: `--require ${HOOK}`,
        GMUX_P164_SPAWN_LOG: logFile,
        GMUX_P164_HOLD_MS: String(holdMs),
        ...extraEnv
      }
    },
    async (handle) => {
      const deadline = Date.now() + holdMs + 30_000;
      if (opts.cdp) {
        try {
          const cdp = await cdpForProfile(profile, 20_000);
          for (;;) {
            const v = await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`);
            if (v > 0) break;
            await sleep(50);
          }
          // Read once the hold is near, so first paint and first attach are settled.
          await sleep(Math.max(0, holdMs - 1500 - (Date.now() - started)));
          renderer = await cdpEval(cdp, RENDERER_READ);
          // What the frame holds after boot: the scripts and sheets the page
          // loaded before anything was touched, from the frame's own tree.
          const tree = await cdp.call('Page.getResourceTree');
          renderer.loaded = (tree.result?.frameTree?.resources ?? [])
            .filter((x) => x.type === 'Script' || x.type === 'Stylesheet')
            .map((x) => ({ name: x.url.replace(/^.*\//, ''), type: x.type, decoded: x.contentSize ?? -1 }));
          if (opts.drive) driven = await driveSurfaces(cdp);
          cdp.close();
        } catch (e) {
          rendererErr = String(e);
        }
      }
      if (opts.waitExit) {
        await handle.exited;
      } else {
        while (Date.now() < deadline) {
          if (mainLog(logFile) !== null) break;
          await sleep(200);
        }
      }
      text = handle.text();
    }
  );
  writeFileSync(`${logFile}.stdout.txt`, text);
  const f = mainLog(logFile);
  let main = null;
  if (f !== null) {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    main = {
      milestones: Object.fromEntries(j.milestones.map((m) => [m.name, m.atMs])),
      timeOriginEstimate: statSync(f).mtimeMs - j.writtenAt
    };
  }
  const row = { label, wallMs: Date.now() - started, main, renderer, driven, rendererErr };
  writeFileSync(logFile, JSON.stringify(row, null, 1));
  say(
    `${label}: wall ${String(row.wallMs)} ms, milestones ${main ? JSON.stringify(main.milestones) : 'none'}${rendererErr ? ` renderer error ${rendererErr}` : ''}`
  );
  return row;
}

// The observer proves itself before it spends an Electron: a pick that
// drifted fails here, in 1 ms, and never as a budget number.
{
  const st = targetSelfTest();
  if (!st.ok) refuse(`target discovery fixtures failed: ${st.failures.join(' | ')}`);
  say(`target discovery: ${String(st.count)} fixtures pass`);
}
const operatorBefore = operatorSessions();
const electronsBefore = electronRows();
say(`app root ${appRoot}`);
say(`operator sessions before ${String(operatorBefore.size)}, electron pids before ${String(electronsBefore.size)}`);

let exitCode = 1;
try {
  tmux('kill-server');
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  makeRepo(home, 'home');
  // One shell session alive on the scratch server, made by Phase 163's own
  // capture harness so the warm launches have a terminal to attach.
  await launch(
    'setup',
    {
      GMUX_SMOKE: 'p163-capture',
      GMUX_P163_ROOT: root,
      GMUX_P163_OUT: join(outDir, 'setup-capture.json'),
      GMUX_P163_SESSIONS: '1',
      GMUX_P163_RUN: 'cold',
      GMUX_P164_HOLD_MS: '60000'
    },
    join(outDir, 'setup-spawns.json'),
    { waitExit: true }
  );
  seedProject(profile, home);
  say(`scratch server holds ${String(tmux('list-sessions').stdout.trim().split('\n').filter(Boolean).length)} session(s)`);

  purgeChromiumCaches(profile);
  const cold = await launch('cold 1', { GMUX_PROBES: '0' }, join(outDir, 'cold-1.json'), { cdp: true });
  const warm = [];
  for (let i = 1; i <= runs; i += 1) {
    warm.push(
      await launch(`warm ${String(i)}`, { GMUX_PROBES: '0' }, join(outDir, `warm-${String(i)}.json`), {
        cdp: true
      })
    );
  }
  // The drive spends a launch of its own, OUTSIDE the timing sample, with the
  // probe registry loaded, because the diagnostics door exists only there.
  const driveRow = drive
    ? await launch('drive', { GMUX_PROBES: '1' }, join(outDir, 'drive.json'), { cdp: true, drive: true })
    : null;

  const summary = {};
  const line = (k, xs) => {
    summary[k] = dist(xs);
    console.log(`  ${k.padEnd(42)} ${fmtDist(summary[k])}`);
  };
  console.log(`\n== warm (${String(warm.length)} runs; cold run discarded: DCL ${String(Math.round(cold.renderer?.dclEnd ?? -1))} ms, window-shown ${String(cold.main?.milestones['window-shown'] ?? -1)} ms) ==`);
  for (const name of ['app-ready', 'window-shown', 'sessions-listed', 'first-attach', 'first-bytes']) {
    line(`main ${name}`, warm.map((r) => r.main?.milestones[name]).filter((x) => typeof x === 'number'));
  }
  const rr = warm.filter((r) => r.renderer && r.main);
  line('renderer domInteractive', rr.map((r) => r.renderer.domInteractive));
  line('renderer DOMContentLoaded end', rr.map((r) => r.renderer.dclEnd));
  line('renderer DOMContentLoaded since main start', rr.map((r) => r.renderer.timeOrigin + r.renderer.dclEnd - r.main.timeOriginEstimate));
  line('xterm surfaces at read', rr.map((r) => r.renderer.xterm));
  const bootScripts = (rr[0]?.renderer.loaded ?? []).filter((x) => x.type === 'Script');
  console.log(
    `  eager scripts at boot (warm 1): ${String(bootScripts.length)}, ${fmt(bootScripts.reduce((a, x) => a + x.decoded, 0))} bytes decoded: ${bootScripts.map((x) => `${x.name} ${fmt(x.decoded)}`).join(' | ')}`
  );
  const driven = driveRow?.driven ?? null;
  const result = { appRoot, runs, holdMs, summary, bootScripts, drive: driven, rows: { cold, warm, drive: driveRow } };
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(result, null, 1));

  let bad = 0;
  // Observer failures are named as such and never reach the budget line. A
  // renderer that could not be read is a defect in this probe or its
  // environment, not a paint that got slower, and before Phase 171 it was
  // reported as "p95 is null ms against the 200 ms budget line".
  const unread = [cold, ...warm, ...(driveRow === null ? [] : [driveRow])].filter(
    (r) => r.rendererErr !== null
  );
  if (unread.length > 0) {
    bad += 1;
    say(`FAIL: observer: the renderer could not be read in ${unread.map((r) => `${r.label} (${r.rendererErr})`).join('; ')}. This is observer drift, not a product budget.`);
  }
  const dclP95 = summary['renderer DOMContentLoaded end']?.p95 ?? null;
  if (unread.length > 0 && dclP95 === null) {
    say('warm DOMContentLoaded p95: unmeasured, see the observer failure above.');
  } else if (dclP95 === null || dclP95 >= 200) {
    bad += 1;
    say(`FAIL: warm DOMContentLoaded p95 is ${String(dclP95)} ms against the 200 ms budget line.`);
  }
  if (drive) {
    if (driven === null) {
      bad += 1;
      say('FAIL: the drive run produced nothing.');
    } else {
      // A missing shot hook means the drive launch never got its door, so the
      // diagnostics verdict below would blame the product for the observer's
      // own launch shape. Name it, and judge the other surfaces normally.
      const observerDiag = driven.diagnostics != null && driven.diagnostics.hook !== true;
      if (observerDiag) {
        bad += 1;
        say('FAIL: observer: the drive launch carries no shot hook, so the diagnostics door cannot be driven. This is observer drift, not a product budget.');
      }
      for (const surface of SURFACES) {
        if (surface === 'diagnostics' && observerDiag) continue;
        const d = driven[surface];
        if (!d?.opened) {
          bad += 1;
          say(`FAIL: ${surface} did not open offline the first time.`);
        }
        if (offlineDrive && d && d.offline !== true) {
          bad += 1;
          say(`FAIL: ${surface} was driven with the page online, so the offline claim is unproven.`);
        }
      }
      if (driven.overview?.closed !== true) {
        bad += 1;
        say('FAIL: Escape did not close the Catch Me Up page.');
      }
      if (driven.exceptions.length > 0) {
        bad += 1;
        say(`FAIL: the page threw during the drive: ${driven.exceptions.join(' | ')}`);
      }
      if (driven.consoleErrors.length > 0) {
        say(`note: console.error during the drive: ${driven.consoleErrors.join(' | ')}`);
      }
    }
  }
  if (baselineDir !== '') {
    const before = JSON.parse(readFileSync(join(resolve(baselineDir), 'summary.json'), 'utf8'));
    const worse = printComparison(before, result);
    if (worse > 0) {
      bad += worse;
      say(`FAIL: ${String(worse)} milestone(s) regressed against ${baselineDir}.`);
    }
  }
  exitCode = bad === 0 ? 0 : 1;
} finally {
  tmux('kill-server');
  const operatorAfter = operatorSessions();
  const missing = [...operatorBefore.keys()].filter((id) => !operatorAfter.has(id));
  const fresh = [...operatorAfter].filter(([id]) => !operatorBefore.has(id));
  const leakedSessions = fresh.filter(([, s]) => scratchManifestKnows(s.gmuxId));
  const theirs = fresh.filter(([, s]) => !scratchManifestKnows(s.gmuxId));
  const leaked = leftByThisRun(electronsBefore);
  say(
    `operator sessions after ${String(operatorAfter.size)} (before ${String(operatorBefore.size)}); electrons left by this run: ${String(leaked.length)}${leaked.length > 0 ? ` ${leaked.join(' | ')}` : ''}`
  );
  if (missing.length > 0) {
    say(`FAIL: ${String(missing.length)} operator session(s) vanished during the run: ${missing.join(' ')}`);
    exitCode = 1;
  }
  if (leakedSessions.length > 0) {
    say(`FAIL: this run created ${String(leakedSessions.length)} session(s) on the operator's server: ${leakedSessions.map(([id, s]) => `${id} ${s.name}`).join(' ')}`);
    exitCode = 1;
  }
  if (theirs.length > 0) {
    say(`note: ${String(theirs.length)} session(s) opened on the operator's server during the run, not by this run's app, not counted: ${theirs.map(([id, s]) => `${id} ${s.name}`).join(' ')}`);
  }
  if (leaked.length > 0) exitCode = 1;
}
say(exitCode === 0 ? 'PASS' : 'FAIL');
process.exit(exitCode);
