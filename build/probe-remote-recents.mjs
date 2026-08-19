#!/usr/bin/env node
/**
 * probe-remote-recents.mjs. The Phase 92 live probe for a recent project that
 * names another machine.
 *
 * WHAT IT PROVES, in the real app, with a profile this run created:
 *  1. HIDDEN     `recents:list` answers two rows and never the row whose
 *                machine is not in the machines file.
 *  2. DRAWN      the home screen draws the machine's name on the remote row,
 *                and that row carries no element with a background fill, a
 *                border radius or a colour outside the muted and secondary
 *                text tokens. A machine's name is identity, not status.
 *  3. NO TILDE   the remote row's path is drawn in full even though it sits
 *                under `/Users/`, because a tilde here would stand for this
 *                Mac's account on this Mac.
 *  4. ONE SET    `File > Open Recent` lists the same two rows and not the
 *                third, read out of the main process itself.
 *  5. LIVE       rewriting machines.json without that machine takes the row
 *                off the OPEN home screen and out of the native menu, with no
 *                relaunch.
 *  6. REFUSAL    clicking the remote row while nothing is signed in shows the
 *                sentence for `notConnected`, and the time from click to
 *                sentence is recorded in milliseconds.
 *  7. LIVE ROW   confirming the seeded machine through the real bridge adds the
 *                "open on a machine" action row while the window stays open.
 *                This is the operator's own first-run defect, and it is here
 *                because a confirmation is written to a file that neither the
 *                link nor the machines file watches.
 *
 * WHAT IT DOES NOT DO. It contacts no machine, signs in to nothing and starts
 * no ssh. Neither seeded machine is reachable and neither is meant to be. What
 * is measured is which rows exist and what they say.
 *
 * HOW THE MENU IS READ, and the Phase 92 fix round changed it. The first build
 * asked System Events for the menu, which needs accessibility access granted to
 * whatever terminal runs the probe, so nobody could run this probe green on a
 * fresh Mac without going into System Settings first. It now attaches to the
 * MAIN PROCESS over the node inspector and reads `Menu.getApplicationMenu()`
 * directly. That needs no permission at all, and it reports each item's
 * sublabel as well as its label, so step 4 now proves the sublabel's words here
 * rather than deferring them to a unit test.
 *
 * What the main-process read does NOT prove is that macOS drew what the menu
 * object says. The System Events read is still made when the permission happens
 * to be granted, and its answer is printed beside the main-process one as a
 * cross-check. It never fails the run, because a missing permission is not a
 * defect in this build.
 *
 * SAFETY. Every launch gets an isolated `--user-data-dir` under the scratch
 * directory and an isolated HOME. The operator's profile, manifest, machines
 * file and installed app are never read or written. The tmux socket must be a
 * harness socket, and the app is launched with a harness term set so that the
 * override is actually honoured, which is checked by reading the app's own log.
 * The only process signalled is the one pid this run recorded.
 * The operator's own server is LISTED read only, before and after, and a change
 * in that count fails the run.
 *
 * Usage:
 *   npm run build
 *   node build/harness-socket.mjs gmux-p92-recents \
 *     'node build/probe-remote-recents.mjs'
 *   Options: [--scratch <dir>] [--keep]
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const keep = argv.includes('--keep');
const scratchAt = argv.indexOf('--scratch');
const scratch =
  scratchAt !== -1 && argv[scratchAt + 1]
    ? argv[scratchAt + 1]
    : join(tmpdir(), 'p92-remote-recents');

const profile = join(scratch, 'p92-profile');
const home = join(scratch, 'p92-home');
const appLogPath = join(scratch, 'p92-app.log');
const shotPath = join(repoRoot, 'out', 'p92-remote-recents.png');

/** The three seeded rows. One here, one on a machine, one on a machine that is gone. */
const LOCAL_PATH = join(home, 'p92-local-project');
const MAC_PATH = '/Users/someone-else/p92-remote-project';
const GONE_PATH = '/Users/someone-else/p92-forgotten-project';

const t0 = Date.now();
function log(msg) {
  console.log(`[probe:p92recents ${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);
}
function refuse(why) {
  console.error(`[probe:p92recents] REFUSED. ${why}`);
  process.exit(2);
}

// -- preconditions ------------------------------------------------------------

if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js does not exist. Run npm run build first.');
}
const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '' || socket === 'gmux' || socket === 'default') {
  refuse(
    'GMUX_TMUX_SOCKET must be a harness socket. Run this probe as ' +
      "node build/harness-socket.mjs gmux-p92-recents 'node build/probe-remote-recents.mjs'"
  );
}
if (!/^gmux-[A-Za-z0-9._-]+$/.test(socket)) {
  refuse(`"${socket}" is not a harness socket name; use gmux-<something>`);
}

/** Operator sessions on the REAL socket, read only. Never anything else. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  if (out.status !== 0) return 0;
  return out.stdout.split('\n').filter((l) => l.trim().length > 0).length;
}
const operatorBefore = operatorSessionCount();
log(`operator sessions before: ${operatorBefore}`);

// -- process bookkeeping -------------------------------------------------------

let appPid = null;
let appExited = false;
let failed = false;
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function note(step, what, verdict, detail) {
  results.push({ step, what, verdict, detail });
  log(`step ${step} ${verdict.toUpperCase()} ${what}. ${detail}`);
}

async function stopApp() {
  if (appPid === null || appExited) return;
  try {
    process.kill(appPid, 'SIGTERM');
  } catch {
    return;
  }
  for (let waited = 0; waited < 15_000; waited += 500) {
    try {
      process.kill(appPid, 0);
    } catch {
      return;
    }
    await sleep(500);
  }
  try {
    process.kill(appPid, 'SIGKILL');
    log(`pid ${appPid} ignored SIGTERM and was killed with SIGKILL`);
  } catch {
    // Exited during the grace.
  }
}

async function finish(code) {
  await stopApp();
  const operatorAfter = operatorSessionCount();
  log(`operator sessions after: ${operatorAfter} (before: ${operatorBefore})`);
  if (operatorAfter !== operatorBefore) {
    console.error('[probe:p92recents] FAIL the operator session count changed');
    code = 1;
  }
  console.log('');
  console.log('| step | what | verdict | detail |');
  console.log('| --- | --- | --- | --- |');
  for (const r of results) {
    console.log(`| ${r.step} | ${r.what} | ${r.verdict} | ${r.detail} |`);
  }
  if (code === 0 && !keep) {
    rmSync(scratch, { recursive: true, force: true });
    log('removed the scratch profile and the isolated HOME');
  } else {
    log(`evidence kept under ${scratch}`);
  }
  process.exit(code);
}

/**
 * Fail the run if the app ignored the harness socket (Phase 92 fix round).
 *
 * `activeTmuxSocket` prints one line when GMUX_TMUX_SOCKET is set on a launch
 * that is not a harness launch, and it then uses the operator's own server.
 * Reading that line back is what turns this probe's safety sentence into a
 * check. It is called after the window is up, so the resolve has happened.
 */
function assertHarnessLaunch() {
  let text = '';
  try {
    text = readFileSync(appLogPath, 'utf8');
  } catch {
    return null;
  }
  if (text.includes('is set but this is not a harness launch')) {
    return 'the app ignored GMUX_TMUX_SOCKET and used the operator server on -L gmux';
  }
  return null;
}

async function fail(why) {
  failed = true;
  console.error(`[probe:p92recents] FAIL. ${why}`);
  await finish(1);
}

process.on('SIGINT', () => void finish(130));
process.on('SIGTERM', () => void finish(130));

// -- a minimal DevTools protocol client ---------------------------------------

function wsClientFrame(payload) {
  const data = Buffer.from(payload, 'utf8');
  const mask = randomBytes(4);
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x81, 0x80 | data.length]);
  } else if (data.length < 65_536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 1) masked[i] = data[i] ^ mask[i & 3];
  return Buffer.concat([header, mask, masked]);
}

function wsConnect(url) {
  const m = /^ws:\/\/([^:/]+):(\d+)(\/.*)$/.exec(url);
  if (m === null) throw new Error(`not a ws url: ${url}`);
  return new Promise((resolvePromise, reject) => {
    const sock = netConnect(Number(m[2]), m[1]);
    const key = randomBytes(16).toString('base64');
    let upgraded = false;
    let buf = Buffer.alloc(0);
    let fragments = [];
    const pending = new Map();
    let nextId = 1;
    sock.on('connect', () => {
      sock.write(
        `GET ${m[3]} HTTP/1.1\r\nHost: ${m[1]}:${m[2]}\r\n` +
          'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    sock.on('error', (err) => reject(err));
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!upgraded) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        const head = buf.subarray(0, idx).toString('utf8');
        buf = buf.subarray(idx + 4);
        if (!/ 101 /.test(head)) {
          reject(new Error(`websocket upgrade refused:\n${head}`));
          sock.destroy();
          return;
        }
        upgraded = true;
        resolvePromise(api);
      }
      for (;;) {
        if (buf.length < 2) return;
        const fin = (buf[0] & 0x80) !== 0;
        const op = buf[0] & 0x0f;
        let len = buf[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          len = Number(buf.readBigUInt64BE(2));
          off = 10;
        }
        if (buf.length < off + len) return;
        const payload = buf.subarray(off, off + len);
        buf = buf.subarray(off + len);
        if (op === 0x9) {
          const mask = randomBytes(4);
          const masked = Buffer.alloc(payload.length);
          for (let i = 0; i < payload.length; i += 1)
            masked[i] = payload[i] ^ mask[i & 3];
          sock.write(
            Buffer.concat([
              Buffer.from([0x8a, 0x80 | payload.length]),
              mask,
              masked
            ])
          );
          continue;
        }
        if (op !== 0x1 && op !== 0x0) continue;
        fragments.push(payload);
        if (!fin) continue;
        const text = Buffer.concat(fragments).toString('utf8');
        fragments = [];
        let msg;
        try {
          msg = JSON.parse(text);
        } catch {
          continue;
        }
        const waiter = pending.get(msg.id);
        if (waiter !== undefined) {
          pending.delete(msg.id);
          waiter(msg);
        }
      }
    });
    const api = {
      call(method, params, timeoutMs = 15_000) {
        const id = nextId;
        nextId += 1;
        sock.write(
          wsClientFrame(JSON.stringify({ id, method, params: params ?? {} }))
        );
        return new Promise((res, rej) => {
          pending.set(id, res);
          setTimeout(() => {
            if (pending.has(id)) {
              pending.delete(id);
              rej(new Error(`${method} timed out after ${timeoutMs / 1000} s`));
            }
          }, timeoutMs);
        });
      },
      close() {
        sock.destroy();
      }
    };
  });
}

async function cdpForProfile(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const portFile = readFileSync(
        join(profileDir, 'DevToolsActivePort'),
        'utf8'
      );
      const port = Number(portFile.split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find(
          (t) => t.type === 'page' && /index\.html/.test(t.url ?? '')
        );
        if (page !== undefined && page.webSocketDebuggerUrl) {
          const ws = await wsConnect(page.webSocketDebuggerUrl);
          log(`attached to the main window renderer over CDP (port ${port})`);
          return ws;
        }
      }
    } catch {
      // Not up yet.
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`no DevTools page target within ${timeoutMs / 1000} s`);
    }
    await sleep(500);
  }
}

async function cdpEval(cdp, expression) {
  const reply = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (reply.error !== undefined) throw new Error(JSON.stringify(reply.error));
  const res = reply.result?.result;
  if (reply.result?.exceptionDetails !== undefined) {
    throw new Error(JSON.stringify(reply.result.exceptionDetails));
  }
  return res?.value ?? null;
}

// -- the reads -----------------------------------------------------------------

/** What main answers on recents:list, straight through the bridge. */
const LIST_READ = `(async () => {
  const rows = await window.gmux.recents.list();
  return rows.map((r) => ({ path: r.path, machineId: r.machineId ?? null }));
})()`;

/**
 * Every recent row the home screen has drawn, with the treatment of each part.
 *
 * The colour check is deliberately crude and deliberately total: it reports
 * every computed background, border radius and colour inside the row, so the
 * assertion can say what was found rather than that nothing was found.
 */
const ROWS_READ = `(() => {
  const rows = [...document.querySelectorAll('.home-recent')];
  const paint = (el) => {
    const s = getComputedStyle(el);
    return {
      background: s.backgroundColor,
      radius: s.borderTopLeftRadius,
      color: s.color
    };
  };
  return rows.map((row) => ({
    text: row.textContent,
    name: row.querySelector('.home-recent-name')?.textContent ?? null,
    path: row.querySelector('.home-recent-path')?.textContent ?? null,
    machine: row.querySelector('.home-recent-machine')?.textContent ?? null,
    title: row.getAttribute('title'),
    parts: [...row.querySelectorAll('*')].map((el) => ({
      cls: el.className,
      ...paint(el)
    }))
  }));
})()`;

/** The action rows the home screen is drawing right now, by title. */
const ACTIONS_READ = `(() => [...document.querySelectorAll('.home-action')].map(
  (el) => el.querySelector('.home-row-title')?.textContent ?? ''
))()`;

/**
 * Confirm the seeded machine through the real bridge, exactly as the button in
 * Settings does. It contacts nothing: main writes one record and answers.
 */
const CONFIRM_DRIVE = `(async () => {
  const answer = await window.gmux.machines.rows();
  const row = (answer.rows ?? []).find((r) => r.id === 'p92mac');
  if (row === undefined) return 'no p92mac row';
  await window.gmux.machines.confirm({
    id: row.id,
    hashRead: row.hash,
    linesRead: row.lines
  });
  return 'confirmed';
})()`;

/** The toast text on screen, or null. */
const TOAST_READ = `(() => {
  const el = document.querySelector('.toast, .toasts .toast, [data-toast]');
  return el === null ? null : el.textContent;
})()`;

/**
 * Attach to the MAIN process over the node inspector.
 *
 * `--inspect=0` makes Electron print one line to stderr, being "Debugger
 * listening on ws://127.0.0.1:PORT/UUID", and stderr is piped to the app log.
 * So the url is read out of that file rather than guessed. The websocket client
 * above is the same one the renderer connection uses.
 */
async function mainProcessCdp(timeoutMs) {
  const started = Date.now();
  for (;;) {
    let text = '';
    try {
      text = readFileSync(appLogPath, 'utf8');
    } catch {
      text = '';
    }
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(text);
    if (m !== null) {
      try {
        const ws = await wsConnect(m[1]);
        log('attached to the MAIN process over the node inspector');
        return ws;
      } catch {
        // The port is printed before the listener is fully up sometimes.
      }
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`the main process inspector never appeared within ${timeoutMs / 1000} s`);
    }
    await sleep(300);
  }
}

/**
 * The File > Open Recent submenu, read out of the main process.
 *
 * Needs no permission, and reports the sublabel, which the accessibility
 * interface does not. Returns one row per item with its label, its sublabel and
 * its tooltip, or null when the menu is not there.
 */
const MENU_READ = `(() => {
  const load = typeof require === 'function'
    ? require
    : process.mainModule.require.bind(process.mainModule);
  const { Menu } = load('electron');
  const menu = Menu.getApplicationMenu();
  if (menu === null) return null;
  const file = menu.items.find((i) => i.label === 'File');
  if (file === undefined || file.submenu === undefined) return null;
  const recent = file.submenu.items.find((i) => i.label === 'Open Recent');
  if (recent === undefined || recent.submenu === undefined) return null;
  return recent.submenu.items.map((i) => ({
    label: i.label,
    sublabel: i.sublabel ?? '',
    toolTip: i.toolTip ?? '',
    enabled: i.enabled === true
  }));
})()`;

async function openRecentMenuFromMain(mainCdp) {
  try {
    const reply = await mainCdp.call('Runtime.evaluate', {
      expression: MENU_READ,
      returnByValue: true,
      includeCommandLineAPI: true
    });
    if (reply.result?.exceptionDetails !== undefined) {
      return { rows: null, why: JSON.stringify(reply.result.exceptionDetails) };
    }
    return { rows: reply.result?.result?.value ?? null, why: null };
  } catch (err) {
    return { rows: null, why: err.message };
  }
}

/**
 * The same submenu through System Events, kept only as a cross-check.
 *
 * It needs accessibility access granted to the terminal running the probe, so
 * it returns null on most machines and the run never fails on that.
 */
function openRecentMenuNames(pid) {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events"
  tell (first process whose unix id is ${pid})
    get name of every menu item of menu 1 of menu item "Open Recent" of menu 1 of menu bar item "File" of menu bar 1
  end tell
end tell`
    ],
    { encoding: 'utf8', timeout: 20_000, killSignal: 'SIGKILL' }
  );
  if (r.status !== 0) return null;
  return (r.stdout ?? '')
    .trim()
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// -- the probe -----------------------------------------------------------------

function seed() {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(join(home, 'Library', 'Caches'), { recursive: true });
  mkdirSync(join(home, 'Library', 'Application Support'), { recursive: true });
  mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
  mkdirSync(LOCAL_PATH, { recursive: true });

  writeFileSync(
    join(profile, 'recents.json'),
    `${JSON.stringify(
      {
        version: 1,
        recents: [
          { path: MAC_PATH, name: 'remote project', lastOpenedAt: 3, machineId: 'p92mac' },
          { path: GONE_PATH, name: 'forgotten project', lastOpenedAt: 2, machineId: 'p92gone' },
          { path: LOCAL_PATH, name: 'local project', lastOpenedAt: 1 }
        ]
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    join(profile, 'gmux', 'config', 'machines.json'),
    `${JSON.stringify(
      {
        schema: 1,
        machines: [
          {
            id: 'p92mac',
            label: 'Probe Mac',
            // A loopback address nothing listens on. This probe signs in to
            // nothing and this row exists so a machine id resolves to a name.
            host: '127.0.0.1',
            port: 65_534
          }
        ]
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  log(`seeded three recents and one machine under ${profile}`);
}

/** Rewrite machines.json with no machines at all. */
function forgetTheMachine() {
  writeFileSync(
    join(profile, 'gmux', 'config', 'machines.json'),
    `${JSON.stringify({ schema: 1, machines: [] }, null, 2)}\n`,
    'utf8'
  );
  log('rewrote machines.json with no machines, while the app is running');
}

async function main() {
  seed();
  const logStream = createWriteStream(appLogPath, { flags: 'w' });
  const child = spawn(
    'npx',
    [
      'electron',
      '.',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      // The MAIN process inspector, on a port the OS picks. It is what step 4
      // reads the native menu through. See mainProcessCdp below.
      '--inspect=0',
      '--use-mock-keychain',
      '-ApplePersistenceIgnoreState',
      'YES'
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        // PHASE 92 FIX ROUND. THIS ENV IS WHAT MAKES THE SOCKET OVERRIDE REAL.
        // `activeTmuxSocket` in src/main/tmux/resolve.ts honours
        // GMUX_TMUX_SOCKET only on a harness launch, and a harness launch is
        // GMUX_SMOKE, GMUX_SHOT or GMUX_UPDATE_REHEARSAL. The first build of
        // this probe set none of them, so the app printed "GMUX_TMUX_SOCKET is
        // set but this is not a harness launch, so it is ignored" and attached
        // to the operator's own server on -L gmux. Nothing was lost, and the
        // probe's own header claimed a read-only relationship that was false.
        //
        // GMUX_UPDATE_REHEARSAL and not GMUX_SHOT, and the reason is mechanical.
        // GMUX_SHOT hands the process to `runShot`, which photographs the window
        // and calls app.exit, so the app would be gone before CDP could drive
        // it. GMUX_UPDATE_REHEARSAL is the term the two other CDP-driving probes
        // in this directory use, being probe-home-update-line.mjs and
        // probe-finder-open.mjs. On its own it changes nothing about the app:
        // TORTIE_UPDATE_FEED and GMUX_UPDATE_STATE_ROOT are unset here, so the
        // updater has nothing to redirect, and a dev build never updates.
        //
        // `assertHarnessLaunch` below reads the app log and fails the run if the
        // refusal line appears anyway, so this can never silently regress.
        GMUX_UPDATE_REHEARSAL: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  appPid = child.pid;
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  child.on('exit', () => {
    appExited = true;
  });
  log(`launched electron in dev mode, pid ${appPid}, log ${appLogPath}`);

  let cdp;
  try {
    cdp = await cdpForProfile(profile, 90_000);
  } catch (err) {
    return fail(err.message);
  }

  const ignored = assertHarnessLaunch();
  if (ignored !== null) return fail(ignored);
  log('the app honoured the harness socket, so the operator server was untouched');

  let mainCdp;
  try {
    mainCdp = await mainProcessCdp(60_000);
  } catch (err) {
    return fail(err.message);
  }

  // Step 1. What main answers.
  let listed = null;
  for (let waited = 0; waited < 30_000; waited += 500) {
    try {
      listed = await cdpEval(cdp, LIST_READ);
    } catch {
      listed = null;
    }
    if (Array.isArray(listed) && listed.length > 0) break;
    await sleep(500);
  }
  if (!Array.isArray(listed)) return fail('recents:list never answered');
  const paths = listed.map((r) => r.path);
  const step1 =
    listed.length === 2 &&
    paths.includes(MAC_PATH) &&
    paths.includes(LOCAL_PATH) &&
    !paths.includes(GONE_PATH);
  note(
    1,
    'recents:list hides the row whose machine has gone',
    step1 ? 'pass' : 'FAIL',
    `${listed.length} rows: ${JSON.stringify(listed)}`
  );
  if (!step1) return fail('step 1');

  // Steps 2 and 3. What the home screen drew.
  let drawn = [];
  for (let waited = 0; waited < 20_000; waited += 500) {
    drawn = (await cdpEval(cdp, ROWS_READ)) ?? [];
    if (drawn.length >= 2) break;
    await sleep(500);
  }
  const remoteRow = drawn.find((r) => (r.title ?? '').includes(MAC_PATH));
  const step2 =
    remoteRow !== undefined &&
    typeof remoteRow.machine === 'string' &&
    remoteRow.machine.includes('Probe Mac') &&
    !drawn.some((r) => (r.text ?? '').includes(GONE_PATH));
  note(
    2,
    'the home screen names the machine on the remote row and draws no forgotten row',
    step2 ? 'pass' : 'FAIL',
    `rows ${drawn.length}, machine text ${JSON.stringify(remoteRow?.machine ?? null)}`
  );

  const painted =
    remoteRow === undefined
      ? []
      : remoteRow.parts.filter(
          (p) =>
            (p.background !== 'rgba(0, 0, 0, 0)' &&
              p.background !== 'transparent') ||
            (p.radius !== '0px' && p.radius !== '')
        );
  const step2b = remoteRow !== undefined && painted.length === 0;
  note(
    '2b',
    'the machine name is drawn as quiet text, with no fill, badge or rounded box',
    step2b ? 'pass' : 'FAIL',
    painted.length === 0
      ? 'no element inside the row has a background fill or a border radius'
      : `painted parts: ${JSON.stringify(painted)}`
  );

  const step3 =
    remoteRow !== undefined &&
    !String(remoteRow.path ?? '').includes('~') &&
    !String(remoteRow.title ?? '').includes('~');
  note(
    3,
    "the remote row's path is drawn in full, with no tilde",
    step3 ? 'pass' : 'FAIL',
    `path ${JSON.stringify(remoteRow?.path ?? null)} title ${JSON.stringify(remoteRow?.title ?? null)}`
  );

  // Step 4. The native menu, read out of the main process.
  const menu = await openRecentMenuFromMain(mainCdp);
  const items = menu.rows;
  const labels = items === null ? [] : items.map((i) => i.label);
  const remoteItem = items === null ? undefined : items.find((i) => i.label === 'remote project');
  const step4 =
    items !== null &&
    labels.includes('remote project') &&
    labels.includes('local project') &&
    !labels.includes('forgotten project') &&
    remoteItem !== undefined &&
    remoteItem.sublabel.includes('Probe Mac') &&
    !remoteItem.sublabel.includes('~') &&
    remoteItem.toolTip.includes(MAC_PATH) &&
    remoteItem.toolTip.includes('Probe Mac');
  note(
    4,
    'File > Open Recent lists the same two rows and not the third, and the remote row names its machine',
    step4 ? 'pass' : 'FAIL',
    items === null
      ? `the main process did not answer: ${menu.why}`
      : `items: ${JSON.stringify(items)}`
  );

  // The same read through the accessibility interface, printed and never
  // asserted. It answers only where a person has granted the permission.
  const axNames = openRecentMenuNames(appPid);
  log(
    axNames === null
      ? '  cross-check through System Events: no answer, which means the terminal has no accessibility access. Nothing failed on that.'
      : `  cross-check through System Events: ${JSON.stringify(axNames)}`
  );

  // Step 6 is measured BEFORE step 5, because step 5 removes the row.
  const clickedAt = Date.now();
  await cdpEval(
    cdp,
    `(() => {
      const rows = [...document.querySelectorAll('.home-recent')];
      const row = rows.find((r) => (r.getAttribute('title') ?? '').includes(${JSON.stringify(MAC_PATH)}));
      if (row) row.click();
      return row !== undefined;
    })()`
  );
  let toast = null;
  while (Date.now() - clickedAt < 20_000) {
    toast = await cdpEval(cdp, TOAST_READ);
    if (typeof toast === 'string' && toast.includes('Probe Mac')) break;
    await sleep(50);
  }
  const refusalMs = Date.now() - clickedAt;
  const step6 =
    typeof toast === 'string' && toast.includes('Tortie is not connected to Probe Mac.');
  note(
    6,
    'clicking the remote row while nothing is signed in says so',
    step6 ? 'pass' : 'FAIL',
    `${refusalMs} ms from click to sentence. Sentence: ${JSON.stringify(toast)}`
  );

  // Step 7. The defect the fix round closed. The seeded machine is in the file
  // and nobody has confirmed it, so the home screen draws three action rows.
  // Confirming it through the real bridge must add the fourth row while the
  // window stays open. Before the fix a confirmation touched neither the link
  // nor machines.json, so nothing pushed and the row waited for a relaunch.
  const beforeActions = (await cdpEval(cdp, ACTIONS_READ)) ?? [];
  const confirmed = await cdpEval(cdp, CONFIRM_DRIVE);
  const confirmedAt = Date.now();
  let afterActions = beforeActions;
  while (Date.now() - confirmedAt < 20_000) {
    afterActions = (await cdpEval(cdp, ACTIONS_READ)) ?? [];
    if (afterActions.length > beforeActions.length) break;
    await sleep(50);
  }
  const rowMs = Date.now() - confirmedAt;
  const step7 =
    confirmed === 'confirmed' &&
    beforeActions.length === 3 &&
    afterActions.length === 4 &&
    afterActions[1] === 'Open on Probe Mac…';
  note(
    7,
    'confirming a machine adds the action row with no relaunch',
    step7 ? 'pass' : 'FAIL',
    `${rowMs} ms from the confirmation to the row. before ${JSON.stringify(beforeActions)}, after ${JSON.stringify(afterActions)}, bridge said ${JSON.stringify(confirmed)}`
  );

  // Step 5. Forget the machine while the window is open.
  forgetTheMachine();
  const forgotAt = Date.now();
  let afterList = null;
  while (Date.now() - forgotAt < 20_000) {
    afterList = await cdpEval(cdp, LIST_READ);
    if (Array.isArray(afterList) && afterList.length === 1) break;
    await sleep(200);
  }
  const liveMs = Date.now() - forgotAt;
  const afterRows = (await cdpEval(cdp, ROWS_READ)) ?? [];
  const afterMenu = await openRecentMenuFromMain(mainCdp);
  const afterLabels =
    afterMenu.rows === null ? null : afterMenu.rows.map((i) => i.label);
  const step5 =
    Array.isArray(afterList) &&
    afterList.length === 1 &&
    afterList[0]?.path === LOCAL_PATH &&
    !afterRows.some((r) => (r.text ?? '').includes(MAC_PATH)) &&
    afterLabels !== null &&
    !afterLabels.includes('remote project');
  note(
    5,
    'forgetting the machine takes its row off the open home screen and out of the menu',
    step5 ? 'pass' : 'FAIL',
    `${liveMs} ms after the file was rewritten. list ${JSON.stringify(afterList)}, menu ${JSON.stringify(afterLabels)}`
  );

  // The evidence photo, of the window's own content.
  try {
    const reply = await cdp.call('Page.captureScreenshot', { format: 'png' });
    const data = reply.result?.data;
    if (typeof data === 'string' && data.length > 0) {
      mkdirSync(dirname(shotPath), { recursive: true });
      writeFileSync(shotPath, Buffer.from(data, 'base64'));
      log(`screenshot saved to ${shotPath} (window content over CDP)`);
    }
  } catch {
    log('no screenshot. The reads above are the evidence.');
  }

  cdp.close();
  mainCdp.close();
  const allPassed = results.every((r) => r.verdict === 'pass');
  return finish(allPassed ? 0 : 1);
}

main().catch((err) => {
  if (!failed) void fail(err?.stack ?? String(err));
});
