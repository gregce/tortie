#!/usr/bin/env node
/**
 * probe-home-update-line.mjs. The Phase 62.1 live probe for the home screen
 * update line.
 *
 * WHAT IT PROVES, on the PACKAGED app, end to end:
 *  1. SILENCE   a fresh profile boots to the home screen and the update
 *               line's slot is empty. No user check has started, and main
 *               hides everything else, so the slot must show nothing.
 *  2. THE WIRE  a real click on "Check for Updates…" in the app's own menu,
 *               against a dead loopback feed, drives the line through its
 *               live wiring: best effort "Checking for updates", then the
 *               asserted end state "The update check failed." with
 *               data-stage="failed" within 30 seconds.
 *
 * Dev builds have no update journey at all (initUpdater returns behind
 * app.isPackaged), so this probe requires release/mac-arm64/Tortie.app.
 * Downloading, staging and ready are NOT driven here. The mirror is stage
 * blind and the unit tests pin every stage's words; checking and failed
 * prove the live wiring at Tier 2 cost.
 *
 * SAFETY. The packaged binary is launched DIRECTLY, never through `open`,
 * so LaunchServices never registers this build against the operator's
 * installed app. Every launch gets an isolated --user-data-dir and an
 * isolated HOME under the scratch directory (the Phase 58 updater cache
 * discipline). The feed override points at a dead loopback port, so the
 * check fails fast and no bytes download; the app honours the override only
 * because GMUX_UPDATE_REHEARSAL is set, the tmux socket is a harness socket
 * and the profile is isolated. The only process killed is the one recorded
 * pid. The operator's server is only ever LISTED, read only, and the count
 * is printed before and after. The evidence photo is the window's own content
 * over CDP, and its fallback is the app's window rectangle through
 * build/window-shot.mjs, so no run of this probe photographs the screen.
 *
 * Usage:
 *   node build/harness-socket.mjs gmux-p621-line \
 *     'node build/probe-home-update-line.mjs'
 *   Options: [--scratch <dir>] [--keep]
 */

import { spawnSync } from 'node:child_process';
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

import { windowShot } from './window-shot.mjs';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const keep = argv.includes('--keep');
const scratchAt = argv.indexOf('--scratch');
const scratch =
  scratchAt !== -1 && argv[scratchAt + 1]
    ? argv[scratchAt + 1]
    : (process.env['GMUX_HARNESS_DIR'] ??
      join(tmpdir(), 'p62.1-home-update-line'));

const appPath = join(repoRoot, 'release', 'mac-arm64', 'Tortie.app');
const appBinary = join(appPath, 'Contents', 'MacOS', 'Tortie');
const profile = join(scratch, 'p62.1-line-profile');
const home = join(scratch, 'p62.1-line-home');
// The evidence photo lives in out/, NOT in the scratch directory. The scratch
// directory is deleted at the end of a green run, and the first version of
// this probe deleted its own screenshot with it, which left the run with no
// picture to look at.
const shotPath = join(repoRoot, 'out', 'p62.1-home-update-line.png');
const appLogPath = join(scratch, 'p62.1-line-app.log');

function refuse(why) {
  console.error(`[probe:homeupdateline] REFUSED. ${why}`);
  process.exit(2);
}

const t0 = Date.now();
function log(msg) {
  console.log(
    `[probe:homeupdateline ${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`
  );
}

// -- preconditions ------------------------------------------------------------

if (!existsSync(appBinary)) {
  refuse(`${appPath} does not exist. Run npm run package:dir first.`);
}
const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '' || socket === 'gmux' || socket === 'default') {
  refuse(
    'GMUX_TMUX_SOCKET must be a harness socket. Run this probe as ' +
      "node build/harness-socket.mjs gmux-p621-line 'node build/probe-home-update-line.mjs'"
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

// -- the recorded pid, and the only teardown that may kill anything -----------

/** The one pid this run spawned, or null. Nothing else is ever signalled. */
let appPid = null;
let appExited = false;
let failed = false;

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
  // A frozen event loop outlives SIGTERM (the update-rehearsal lesson).
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
    console.error(
      '[probe:homeupdateline] FAIL the operator session count changed during the run'
    );
    code = 1;
  }
  if (code === 0 && !keep) {
    rmSync(profile, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    log('removed the scratch profile and the isolated HOME');
  } else {
    log(`evidence kept under ${scratch}`);
  }
  process.exit(code);
}

async function fail(why) {
  failed = true;
  console.error(`[probe:homeupdateline] FAIL. ${why}`);
  await finish(1);
}

process.on('SIGINT', () => void finish(130));
process.on('SIGTERM', () => void finish(130));

// -- a minimal DevTools protocol client (the update-rehearsal shape) ----------

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
        const list = await (
          await fetch(`http://127.0.0.1:${port}/json/list`)
        ).json();
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

async function cdpEval(cdp, expression) {
  const reply = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true
  });
  if (reply.error !== undefined) throw new Error(JSON.stringify(reply.error));
  return reply.result?.result?.value ?? null;
}

// -- readers and drivers -------------------------------------------------------

/** The line straight from the DOM: stage attribute and text, or null. */
const LINE_READ = `(() => {
  const el = document.querySelector('.home-update-line');
  if (!el) return null;
  return {
    stage: el.getAttribute('data-stage'),
    text: el.textContent,
    home: document.querySelector('.home') !== null
  };
})()`;

/** Click the real "Check for Updates…" item, by unix pid, never by name. */
function clickCheckForUpdates(pid) {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events"
  tell (first process whose unix id is ${pid})
    click menu item "Check for Updates…" of menu 1 of menu bar item "Tortie" of menu bar 1
  end tell
end tell`
    ],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) {
    return `osascript failed: ${(r.stderr ?? '').trim()}`;
  }
  return null;
}

/**
 * The evidence photo. CDP first, because it photographs the window's own
 * content and nothing else can be in the frame. The fallback is the app's
 * window rectangle through build/window-shot.mjs, which refuses when the app
 * under test is not in front. Neither path can photograph the whole screen.
 */
async function screenshot(cdp) {
  mkdirSync(dirname(shotPath), { recursive: true });
  try {
    const reply = await cdp.call('Page.captureScreenshot', { format: 'png' });
    const data = reply.result?.data;
    if (typeof data === 'string' && data.length > 0) {
      writeFileSync(shotPath, Buffer.from(data, 'base64'));
      log(`screenshot saved to ${shotPath} (window content over CDP)`);
      return;
    }
  } catch {
    // Fall through to the window rectangle.
  }
  const answer = windowShot({ pid: appPid, path: shotPath, log });
  if (answer !== 'saved') {
    log('the DOM reads above are the evidence for this step.');
  }
}

// -- the probe -----------------------------------------------------------------

async function main() {
  rmSync(profile, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
  mkdirSync(join(home, 'Library', 'Caches'), { recursive: true });
  mkdirSync(join(home, 'Library', 'Application Support'), { recursive: true });
  mkdirSync(profile, { recursive: true });
  log(`fresh profile at ${profile}, fresh isolated HOME at ${home}`);

  // The dead loopback feed. Port 9 answers nothing, so the user's check
  // fails fast and no bytes ever download. The app honours the override
  // only because all three rehearsal conditions hold here.
  const env = {
    ...process.env,
    HOME: home,
    GMUX_UPDATE_REHEARSAL: '1',
    TORTIE_UPDATE_FEED: 'http://127.0.0.1:9/feed'
  };
  const logStream = createWriteStream(appLogPath, { flags: 'w' });
  return withElectron(
    {
      label: 'home-update-line',
      program: appBinary,
      userDataDir: profile,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: env
    },
    async (handle) => {
    const child = handle.child;
    appPid = child.pid;
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    child.on('exit', () => {
      appExited = true;
    });
    log(`launched ${appBinary} directly, pid ${appPid}, log ${appLogPath}`);

    let cdp;
    try {
      cdp = await cdpForProfile(profile, 60_000);
    } catch (err) {
      return fail(err.message);
    }

    // Step 1. The home screen is up and the slot is empty. This is the
    // background-silence read: no user check has started, and main hides
    // everything the user did not start, so the line must show nothing. If a
    // first-run surface ever hides the home screen, this read fails loudly
    // rather than clicking through it.
    let first = null;
    for (let waited = 0; waited < 30_000; waited += 500) {
      first = await cdpEval(cdp, LINE_READ);
      if (first !== null) break;
      await sleep(500);
    }
    if (first === null) {
      await screenshot(cdp);
      return fail(
        'no .home-update-line within 30 s. The home screen is not on screen.'
      );
    }
    if (first.home !== true) {
      await screenshot(cdp);
      return fail('the .home container is missing around the update line');
    }
    if (first.stage !== 'hidden' || first.text !== '') {
      await screenshot(cdp);
      return fail(
        `the slot is not empty before any user check. It reads stage="${first.stage}" text="${first.text}"`
      );
    }
    log(
      'the empty slot is proven: data-stage="hidden" and no text before any click'
    );

    // Step 2. The user's check, through the app's real menu, by unix pid.
    await sleep(2_000);
    const clickErr = clickCheckForUpdates(appPid);
    if (clickErr !== null) {
      await screenshot(cdp);
      return fail(`could not click "Check for Updates…". ${clickErr}`);
    }
    const clickedAt = Date.now();
    log('clicked "Check for Updates…" in the Tortie menu, by unix pid');

    // Step 3. Poll at 50 ms. The dead feed fails fast, so catching the
    // checking words is best effort and their absence is not a failure. The
    // assertion is the end state.
    let sawChecking = null;
    let last = first;
    let reachedFailed = false;
    while (Date.now() - clickedAt < 30_000) {
      const read = await cdpEval(cdp, LINE_READ);
      if (read !== null) {
        if (read.text !== last.text || read.stage !== last.stage) {
          log(`the line moved: stage="${read.stage}" text="${read.text}"`);
          last = read;
        }
        if (read.text === 'Checking for updates' && sawChecking === null) {
          sawChecking = Date.now() - clickedAt;
        }
        if (
          read.stage === 'failed' &&
          read.text === 'The update check failed.'
        ) {
          reachedFailed = true;
          break;
        }
      }
      await sleep(50);
    }
    if (sawChecking !== null) {
      log(`caught "Checking for updates" ${sawChecking} ms after the click`);
    } else {
      log(
        'the checking words were not caught. The dead feed fails fast; this is recorded, not a failure.'
      );
    }
    if (!reachedFailed) {
      await screenshot(cdp);
      return fail(
        `the line never reached "The update check failed." within 30 s. Last read: stage="${last.stage}" text="${last.text}"`
      );
    }
    log(
      `PASS the line reached "The update check failed." with data-stage="failed" ${Date.now() - clickedAt} ms after the click`
    );

    // Step 4. The evidence photo, with the failed words on screen.
    await screenshot(cdp);
    cdp.close();
    return finish(0);
  });
}

main().catch((err) => {
  if (!failed) void fail(err?.stack ?? String(err));
});
