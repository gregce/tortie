#!/usr/bin/env node
/**
 * probe-home-machines.mjs. The Phase 92 live probe for the home screen's
 * column.
 *
 * WHAT IT PROVES, on the running app, in one launch:
 *  1. GEOMETRY  the top edge of the wordmark is IDENTICAL whether this person
 *               has no machine, one machine or two, at three window heights.
 *               The tolerance is 0 px, because the box height is a constant in
 *               CSS and not a computation. A column that moved when the machine
 *               list arrived would move the wordmark after a person had already
 *               looked at it, which is the one thing this screen must not do.
 *  2. THE ROW   three action rows with no machine, four with one and four with
 *               two, the second row naming the machine when there is one and
 *               reading the neutral title when there are two.
 *  3. STILLNESS no element inside `.home` has a computed animation, and the only
 *               thing a row transitions is its background colour.
 *  4. THE CAP   at or below the 760 px viewport exactly three recent rows are
 *               visible, and above it all five are. Neither number moved in
 *               this phase, and the fix round is what put them back.
 *  5. NO ORNAMENT  the machine's name on a recent row has no fill, no border and
 *               no border radius, read from the computed style rather than the
 *               stylesheet.
 *
 * HOW THE THREE HEIGHTS ARE PRODUCED, and this is a deviation worth naming. The
 * viewport is changed with the DevTools `Emulation.setDeviceMetricsOverride`
 * call rather than by resizing the real window. That is what makes nine
 * measurements possible in one launch. What it does not exercise is the window
 * manager's own resize, so a report that quotes these numbers says the viewport
 * was emulated.
 *
 * WHAT IT DOES NOT PROVE. It injects the machine rows into the renderer's own
 * store through `window.__gmuxHomeMachinesProbe`, so it says nothing about a
 * real machines file producing those rows, and it contacts no machine. The
 * seeded machines file exists only so main keeps the seeded remote recent row.
 *
 * SAFETY. It runs the DEV build from this tree, never the installed app. Every
 * launch gets an isolated --user-data-dir under the scratch directory. The only
 * process signalled is the one recorded pid. The operator's server on -L gmux
 * is only ever LISTED, read only, and the count is printed before and after.
 * The evidence photos are the window's own content over CDP, so no run of this
 * probe photographs the screen.
 *
 * Usage:
 *   node build/harness-socket.mjs gmux-p92-home \
 *     'node build/probe-home-machines.mjs'
 *   Options: [--scratch <dir>] [--keep] [--label <name>]
 *
 * The --label option names the run in the printed table and in the file names,
 * so the same probe can be run on an older checkout to record that build's top
 * edges. Nothing here measures 0.47.0 by itself, and the report has to say so.
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
const readOpt = (name, fallback) => {
  const at = argv.indexOf(name);
  return at !== -1 && argv[at + 1] ? argv[at + 1] : fallback;
};
const label = readOpt('--label', 'this build');
const scratch = readOpt('--scratch', join(tmpdir(), 'p92-home-machines'));

const TAG = '[probe:homemachines]';
const profile = join(scratch, 'profile');
const projects = join(scratch, 'projects');
const appLogPath = join(scratch, 'app.log');
const outDir = join(repoRoot, 'out');

/**
 * The viewport heights, tallest first.
 *
 * 900 is a tall window and draws five recents. 760 is the first height the
 * short-window media query claims. 620 is well under it. 586 is the viewport
 * of the 960 by 600 minimum window, which is the smallest the app can be made,
 * and the Phase 92 fix round added it because that is where the first build's
 * overflow was worst.
 */
const HEIGHTS = [900, 760, 620, 586];
/** Below this viewport height the screen draws three recents, not five. */
const SHORT_WINDOW = 760;
/** The three machine states, in the order the table prints them. */
const MACHINE_COUNTS = [0, 1, 2];
/** The id the drive gives its first injected machine. */
const FIRST_MACHINE_ID = 'p92m1';

const t0 = Date.now();
function log(msg) {
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${msg}`);
}
function refuse(why) {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
}

// -- preconditions -----------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');
if (!existsSync(electronBin)) refuse(`${electronBin} does not exist`);
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js does not exist. Run npm run build first.');
}

const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '' || socket === 'gmux' || socket === 'default') {
  refuse(
    'GMUX_TMUX_SOCKET must be a harness socket. Run this probe as ' +
      "node build/harness-socket.mjs gmux-p92-home 'node build/probe-home-machines.mjs'"
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
log(`operator sessions on -L gmux before: ${operatorBefore}`);

// -- the one recorded pid ----------------------------------------------------

let appPid = null;
let appExited = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  log(`operator sessions on -L gmux after: ${operatorAfter} (before: ${operatorBefore})`);
  if (operatorAfter !== operatorBefore) {
    console.error(`${TAG} FAIL the operator session count changed during the run`);
    code = 1;
  }
  if (code === 0 && !keep) {
    rmSync(scratch, { recursive: true, force: true });
    log('removed the scratch profile');
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
  console.error(`${TAG} FAIL. ${why}`);
  await finish(1);
}
process.on('SIGINT', () => void finish(130));
process.on('SIGTERM', () => void finish(130));

// -- a minimal DevTools protocol client --------------------------------------
// The same shape build/probe-home-update-line.mjs uses. It is copied rather than
// shared because that probe's copy is the one a reader of this directory
// already knows, and a shared module would be a fifth thing to keep in step.

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
          for (let i = 0; i < payload.length; i += 1) {
            masked[i] = payload[i] ^ mask[i & 3];
          }
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
      call(method, params, timeoutMs = 20_000) {
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
      const portFile = readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8');
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
      // Not up yet. Keep polling.
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`no DevTools page target within ${timeoutMs / 1000} s`);
    }
    await sleep(500);
  }
}

async function cdpEval(cdp, expression, awaitPromise = false) {
  const reply = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise
  });
  if (reply.error !== undefined) throw new Error(JSON.stringify(reply.error));
  const thrown = reply.result?.exceptionDetails;
  if (thrown !== undefined) throw new Error(JSON.stringify(thrown));
  return reply.result?.result?.value ?? null;
}

async function screenshot(cdp, name) {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, name);
  try {
    const reply = await cdp.call('Page.captureScreenshot', { format: 'png' });
    const data = reply.result?.data;
    if (typeof data === 'string' && data.length > 0) {
      writeFileSync(path, Buffer.from(data, 'base64'));
      log(`screenshot saved to ${path} (window content over CDP)`);
      return path;
    }
  } catch {
    // The DOM reads below are the evidence when no image comes back.
  }
  log(`no screenshot for ${name}. The DOM reads are the evidence.`);
  return null;
}

// -- the seeded profile ------------------------------------------------------

/**
 * Five recent projects, four on this Mac and one on the seeded machine.
 *
 * The folders are real, so the after-paint existence check marks none of them
 * missing and the rows read the way a person's own rows read. The remote row
 * carries the id the drive gives its first injected machine, so the label the
 * screen draws is the injected label rather than the id fallback.
 */
function seedProfile() {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
  mkdirSync(projects, { recursive: true });

  const now = Date.now();
  const rows = [];
  for (let i = 0; i < 4; i += 1) {
    const path = join(projects, `local-${i + 1}`);
    mkdirSync(path, { recursive: true });
    rows.push({ path, name: `local-${i + 1}`, lastOpenedAt: now - i * 1000 });
  }
  rows.push({
    path: '/Users/probe/work/webapp',
    name: 'webapp',
    lastOpenedAt: now - 9000,
    machineId: FIRST_MACHINE_ID
  });
  writeFileSync(
    join(profile, 'recents.json'),
    JSON.stringify({ version: 1, recents: rows }, null, 2),
    'utf8'
  );

  // One machine row, so main keeps the remote recent row. It is NOT confirmed,
  // nothing signs in to it, and the drive supplies the machine state the screen
  // reads. The host is a name that resolves to nothing on purpose.
  writeFileSync(
    join(profile, 'gmux', 'config', 'machines.json'),
    JSON.stringify(
      {
        schema: 1,
        machines: [
          {
            id: FIRST_MACHINE_ID,
            label: 'Mac Pro',
            color: 'magenta',
            host: 'p92-probe.invalid'
          }
        ]
      },
      null,
      2
    ),
    'utf8'
  );
  log(`seeded ${profile} with 5 recents and 1 machine row`);
}

// -- the run -----------------------------------------------------------------

const failures = [];
const cells = [];

async function main() {
  seedProfile();

  const logStream = createWriteStream(appLogPath, { flags: 'w' });
  const child = spawn(
    electronBin,
    [
      '.',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      '-ApplePersistenceIgnoreState',
      'YES'
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
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
      GMUX_UPDATE_REHEARSAL: '1',
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
  log(`launched the dev app, pid ${appPid}, log ${appLogPath}`);

  let cdp;
  try {
    cdp = await cdpForProfile(profile, 60_000);
  } catch (err) {
    return fail(err.message);
  }

  // Wait for the home screen and for the drive to be assigned.
  let ready = false;
  for (let waited = 0; waited < 60_000; waited += 500) {
    ready = await cdpEval(
      cdp,
      "document.querySelector('.home') !== null && " +
        "typeof window.__gmuxHomeMachinesProbe === 'function'"
    );
    if (ready === true) break;
    await sleep(500);
  }
  if (ready !== true) {
    return fail('the home screen and its drive never appeared within 60 s');
  }
  log('the home screen is up and the drive is assigned');

  const ignored = assertHarnessLaunch();
  if (ignored !== null) return fail(ignored);
  log('the app honoured the harness socket, so the operator server was untouched');

  for (const height of HEIGHTS) {
    await cdp.call('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(600);
    for (const machines of MACHINE_COUNTS) {
      let answer;
      try {
        answer = await cdpEval(
          cdp,
          `window.__gmuxHomeMachinesProbe(${JSON.stringify({
            machines,
            hold: true,
            settleMs: 350
          })})`,
          true
        );
      } catch (err) {
        return fail(`the drive threw at ${height} px, ${machines} machines: ${err.message}`);
      }
      if (answer === null || answer.ok !== true) {
        return fail(
          `the drive refused at ${height} px, ${machines} machines: ${answer?.why ?? 'no answer'}`
        );
      }
      cells.push({ height, machines, ...answer.reading });
    }
    // One photograph per height, with one machine held, which is the state the
    // phase is about.
    await cdpEval(
      cdp,
      'window.__gmuxHomeMachinesProbe({ machines: 1, hold: true, settleMs: 350 })',
      true
    );
    await screenshot(cdp, `p92-home-${label.replace(/\W+/g, '-')}-${height}.png`);
  }

  // -- the table -------------------------------------------------------------

  console.log('');
  console.log(`${TAG} the column at three viewport heights by three machine states (${label})`);
  console.log('  viewport  machines  lockup top  col height  actions  second row title            recents shown  needs/has    scrolls');
  console.log('  --------  --------  ----------  ----------  -------  --------------------------  -------------  -----------  -------');
  for (const c of cells) {
    console.log(
      `  ${String(c.height).padStart(8)}  ${String(c.machines).padStart(8)}  ` +
        `${String(c.lockupTop).padStart(10)}  ${String(c.colHeight).padStart(10)}  ` +
        `${String(c.actionCount).padStart(7)}  ${String(c.actionTitles[1] ?? '').padEnd(26)}  ` +
        `${String(c.recentRowsVisible).padStart(13)}  ` +
        `${`${c.homeScrollHeight}/${c.homeClientHeight}`.padStart(11)}  ` +
        `${String(c.homeScrolls).padStart(7)}`
    );
  }
  console.log('');

  // -- the assertions --------------------------------------------------------

  for (const height of HEIGHTS) {
    const row = cells.filter((c) => c.height === height);
    const tops = row.map((c) => c.lockupTop);
    const same = tops.every((t) => t === tops[0]);
    if (!same) {
      failures.push(
        `at ${height} px the wordmark's top edge moved with the machine list: ${tops.join(', ')}`
      );
    }
    const counts = row.map((c) => c.actionCount);
    if (counts[0] !== 3 || counts[1] !== 4 || counts[2] !== 4) {
      failures.push(
        `at ${height} px the action row count is ${counts.join(', ')} and should be 3, 4, 4`
      );
    }
    if (row[1]?.actionTitles[1] !== 'Open on Mac Pro…') {
      failures.push(
        `at ${height} px one machine draws "${row[1]?.actionTitles[1]}" and should draw "Open on Mac Pro…"`
      );
    }
    if (row[2]?.actionTitles[1] !== 'Open on another machine…') {
      failures.push(
        `at ${height} px two machines draw "${row[2]?.actionTitles[1]}" and should draw "Open on another machine…"`
      );
    }
    for (const c of row) {
      if (c.animations.length > 0) {
        failures.push(
          `at ${height} px, ${c.machines} machines, something in .home animates: ${c.animations.join(', ')}`
        );
      }
      const bad = c.rowTransitions.filter((p) => p !== 'background-color');
      if (bad.length > 0) {
        failures.push(
          `at ${height} px a .home-row transitions ${bad.join(', ')} and should transition background-color only`
        );
      }
      const shown = c.recentRowsVisible;
      if (height <= SHORT_WINDOW && shown !== 3) {
        failures.push(`at ${height} px ${shown} recent rows are visible and the cap is 3`);
      }
      if (height > SHORT_WINDOW && shown !== 5) {
        failures.push(`at ${height} px ${shown} recent rows are visible and 5 were seeded`);
      }
      if (c.homeScrolls) {
        failures.push(
          `at ${height} px, ${c.machines} machines, the home screen has to ` +
            `scroll: it needs ${c.homeScrollHeight} px in ${c.homeClientHeight} px`
        );
      }
    }
  }

  // The machine name on a recent row carries no ornament. Read once, at the
  // tallest viewport with one machine, from the COMPUTED style.
  const withName = cells.find(
    (c) => c.height === 900 && c.machines === 1 && c.recentMachineStyle !== null
  );
  if (withName === undefined) {
    failures.push('no recent row drew a machine name, so the ornament read never happened');
  } else {
    const s = withName.recentMachineStyle;
    console.log(`${TAG} the machine name's computed style: ${JSON.stringify(s)}`);
    if (withName.recentMachineNames[0] !== 'Mac Pro') {
      failures.push(
        `the recent row names "${withName.recentMachineNames[0]}" and should name "Mac Pro"`
      );
    }
    if (!/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) {
      failures.push(`the machine name has a fill: ${s.backgroundColor}`);
    }
    if (s.borderRadius !== '0px') {
      failures.push(`the machine name has a border radius: ${s.borderRadius}`);
    }
    if (s.borderTopWidth !== '0px') {
      failures.push(`the machine name has a border: ${s.borderTopWidth}`);
    }
    if (/mono|Menlo/i.test(s.fontFamily)) {
      failures.push(`the machine name is set in a mono face: ${s.fontFamily}`);
    }
  }

  console.log('');
  log('WHAT THIS RUN DID NOT MEASURE');
  log('  the 0.47.0 top edges. This probe measures one build at a time. Put the');
  log('  0.47.0 numbers back into home-screen.css, which are a 514 px box');
  log('  everywhere and the cap at nth-of-type(n + 4), rebuild, and run this');
  log('  probe with --label 0.47.0. The fix round did exactly that and wrote');
  log('  the twelve numbers into the note at the top of home-screen.css.');
  log('  the window manager\'s own resize. The viewport was emulated over CDP.');
  log('  anything about a real machine. Nothing was contacted.');
  console.log('');

  if (failures.length > 0) {
    for (const f of failures) console.error(`${TAG} FAIL ${f}`);
    return finish(1);
  }
  log(`all checks passed across ${cells.length} cells`);
  return finish(0);
}

await main();
