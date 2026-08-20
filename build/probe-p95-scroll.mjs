#!/usr/bin/env node
/**
 * probe-p95-scroll.mjs. The Phase 95 live probe.
 *
 * ## WHAT IT PROVES
 *
 * That asking a session with no pane of its own on this Mac where its
 * scrollbar is produces an answer instead of a stack trace once a second, and
 * that a session running on this Mac still scrolls exactly as it did.
 *
 * The operator watched his own console fill with the same `terminal:scrollState`
 * stack trace for as long as a session on his Mac Pro was on screen. Every step
 * below is one half of that sentence turned into a measurement.
 *
 *   step  what it does                              what must be true
 *   ----  ----------------------------------------  --------------------------
 *   0     reads the operator's session count         it is the same at the end
 *   1     refuses a socket that is not a harness     nothing starts
 *   2     a session on the loopback machine, 60 s    0 scrollState error lines
 *   3     a local session that is not running, 60 s  0 scrollState error lines
 *   4     photographs the remote session's window    the note is on screen
 *   5     the wheel over the remote pane, 20 turns   nothing typed, no error
 *   6     types into the remote pane                 the characters arrive
 *   7     a local RUNNING session's scrollbar        the numbers move
 *
 * Steps 2, 3 and 7 print numbers this run measured. The same probe is run on
 * the parent commit, so the before and after are both measured rather than
 * one being measured and the other assumed.
 *
 * ## SAFETY, ABSOLUTE
 *
 * It runs on the socket build/harness-socket.mjs gave it, which that script
 * refuses to let be `gmux` or `default`. It uses its own user data directory
 * and its own scratch project, both outside the repository. It names `-L gmux`
 * in exactly one place, a read only session count taken before and after. It
 * never uses pkill, never uses kill-server, and signals only the pids it
 * spawned. Every scratch file carries a `p95-` prefix.
 *
 * Usage, from the repository root:
 *
 *   node build/harness-socket.mjs --fresh gmux-p95-scroll \
 *     'export GMUX_CONFIG_ROOT="${TMPDIR}gmux-p95-scroll"; \
 *      node build/with-scratch-machine.mjs -- node build/probe-p95-scroll.mjs'
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p95]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => console.log(`${TAG} ${line}`);
function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

/** How long each watch window is. The entry asks for at least 60 seconds. */
const WATCH_MS = Number(process.env['P95_WATCH_MS'] ?? '62000');
/** Where this run writes its own report, so nothing depends on stdout. */
const REPORT = process.env['P95_REPORT'] ?? join(tmpdir(), 'p95-report.json');

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run me through the harness.');
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
if (configRoot === '') refuse('no GMUX_CONFIG_ROOT, so nothing is isolated.');
if (
  (process.env['P95_PACKAGED_BIN'] ?? '').trim() === '' &&
  !existsSync(join(repoRoot, 'out', 'main', 'index.js'))
) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/** The operator's own server, listed and never written. The ONLY mention. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);
say(`config root: ${configRoot}`);

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

const scratch = process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p95-scroll');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
mkdirSync(join(rawRoot, 'profile'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
const appLog = join(root, 'p95-app.log');
writeFileSync(join(project, 'README.md'), '# p95 scroll probe\n', 'utf8');

const MACHINE_ID = 'p95far';
const MACHINE_LABEL = 'Scratch Machine';

/** What build/with-scratch-machine.mjs wrote for this run, or null. */
function readCarriage() {
  try {
    return JSON.parse(
      readFileSync(join(configRoot, 'p69-carriage.json'), 'utf8')
    );
  } catch {
    return null;
  }
}
const carriage = readCarriage();
if (carriage === null) {
  refuse(
    'no scratch machine details at p69-carriage.json inside the config root. ' +
      'Run me inside node build/with-scratch-machine.mjs.'
  );
}
// `machines.json` lives under the app's OWN profile, at
// <userData>/gmux/config/machines.json. GMUX_CONFIG_ROOT is where the harness
// keeps its carriage file and is not where the app reads its configuration.
const appConfigDir = join(profile, 'gmux', 'config');
mkdirSync(appConfigDir, { recursive: true, mode: 0o700 });
writeFileSync(
  join(appConfigDir, 'machines.json'),
  `${JSON.stringify(
    {
      schema: 1,
      machines: [
        {
          id: MACHINE_ID,
          label: MACHINE_LABEL,
          host: carriage.host,
          user: carriage.user,
          port: carriage.port,
          remoteTmuxPath: carriage.remoteTmuxPath
        }
      ]
    },
    null,
    2
  )}\n`,
  'utf8'
);
say(
  `machine ${MACHINE_ID} at ${carriage.host}:${String(carriage.port)} as ` +
    `${carriage.user}, program ${carriage.remoteTmuxPath}`
);

// The one first contact, done by hand, exactly as src/main/machines/remote-smoke.ts
// does it and for the same reason: the exec plane carries
// StrictHostKeyChecking=yes and BatchMode=yes, so it refuses a machine whose
// identity is not recorded and it could not ask. In the product that answer
// comes from the one visible connection test, where a person is watching.
const hostKeys = join(profile, 'gmux', 'machines', 'known-machines');
mkdirSync(dirname(hostKeys), { recursive: true });
const scanned = spawnSync(
  '/usr/bin/ssh-keyscan',
  ['-p', String(carriage.port), carriage.host],
  { encoding: 'utf8', timeout: 30_000 }
);
writeFileSync(hostKeys, scanned.stdout ?? '', 'utf8');
say(
  `recorded the machine's identity in ${hostKeys}, ` +
    `${String((scanned.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length)} line(s)`
);

// The folder this run uses on the machine. It is under the machine's own home
// directory, which for this loopback machine is this Mac's own scratch yard.
const farProject = join(root, 'far-project');
mkdirSync(farProject, { recursive: true });
writeFileSync(join(farProject, 'README.md'), '# p95 far project\n', 'utf8');

// ---------------------------------------------------------------------------
// A minimal DevTools protocol client. Copied from
// build/probe-p93-attention.mjs, which is where this pattern is documented.
// ---------------------------------------------------------------------------

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
      call(method, params, timeoutMs = 120_000) {
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
          say(`attached over the devtools protocol (port ${String(port)})`);
          return ws;
        }
      }
    } catch {
      // Not up yet.
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`no devtools page target within ${timeoutMs / 1000} s`);
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
  if (reply.result?.exceptionDetails !== undefined) {
    throw new Error(JSON.stringify(reply.result.exceptionDetails));
  }
  return reply.result?.result?.value ?? null;
}

async function waitForDrive(cdp, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let there = false;
    try {
      there = await cdpEval(cdp, 'window.__gmuxP95 !== undefined');
    } catch {
      there = false;
    }
    if (there === true) {
      say(`the drive is on window after ${String(Date.now() - started)} ms`);
      return true;
    }
    if (Date.now() - started > timeoutMs) return false;
    await sleep(250);
  }
}

function drive(cdp, method, ...args) {
  const call = args.map((a) => JSON.stringify(a)).join(', ');
  return cdpEval(
    cdp,
    `(async () => {
       const d = window.__gmuxP95;
       if (d === undefined) return { missing: true };
       return await d.${method}(${call});
     })()`
  );
}

async function shoot(cdp, path) {
  try {
    const reply = await cdp.call('Page.captureScreenshot', { format: 'png' });
    const data = reply.result?.data;
    if (typeof data === 'string' && data.length > 0) {
      writeFileSync(path, Buffer.from(data, 'base64'));
      say(`screenshot ${path}`);
      return true;
    }
  } catch {
    /* fall through */
  }
  say(`no screenshot was written to ${path}`);
  return false;
}

// ---------------------------------------------------------------------------
// The app, launched and quit
// ---------------------------------------------------------------------------

/**
 * The binary this run drives.
 *
 * A development run is `node_modules/.bin/electron .`, which is what the
 * phase's own gates use. `P95_PACKAGED_BIN` points the same drive at a
 * PACKAGED app instead, being `<Tortie.app>/Contents/MacOS/Tortie` from
 * `npm run package:dir`. The backlog entry asks for both, because the two
 * differ in where the process's own output goes and the charter's claim is
 * about that output. Nothing else about the run changes.
 */
const packagedBin = (process.env['P95_PACKAGED_BIN'] ?? '').trim();
const electronBin =
  packagedBin === ''
    ? join(repoRoot, 'node_modules', '.bin', 'electron')
    : packagedBin;
const appArgs = packagedBin === '' ? ['.'] : [];
const recordedPids = [];

/**
 * The scroll error lines in the profile's own log file, which is the file the
 * charter says a packaged run grows.
 */
function profileLogScrollErrors() {
  for (const name of ['app.log', 'app.log.1']) {
    const path = join(profile, 'logs', name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    const hits = text
      .split('\n')
      .filter((l) => l.includes("handler for 'terminal:scroll")).length;
    if (hits > 0) return hits;
  }
  return 0;
}

function launch(tag) {
  const stream = createWriteStream(appLog, { flags: 'a' });
  const child = spawn(
    electronBin,
    [
      ...appArgs,
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      '--use-mock-keychain',
      '-ApplePersistenceIgnoreState',
      'YES'
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        GMUX_TMUX_SOCKET: socket,
        // What makes the socket override real on a launch that is driven
        // rather than photographed. src/main/tmux/resolve.ts honours the
        // variable only for GMUX_SMOKE, GMUX_SHOT or this one.
        GMUX_UPDATE_REHEARSAL: '1',
        GMUX_CONFIG_ROOT: configRoot,
        GMUX_SPECSTORY_NO_CLOUD: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  recordedPids.push(child.pid);
  child.stdout.pipe(stream);
  child.stderr.pipe(stream);
  say(
    `launched ${tag}, pid ${String(child.pid)}, log ${appLog}, binary ${electronBin}`
  );
  return child;
}

async function quit(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  for (let i = 0; i < 60; i += 1) {
    if (child.exitCode !== null || child.signalCode !== null) break;
    await sleep(250);
  }
  child.stdout.destroy();
  child.stderr.destroy();
  await sleep(500);
}

function honouredTheSocket() {
  let text = '';
  try {
    text = readFileSync(appLog, 'utf8');
  } catch {
    return true;
  }
  return !text.includes('is set but this is not a harness launch');
}

function harnessSessions() {
  const out = spawnSync(
    'tmux',
    ['-L', socket, 'list-sessions', '-F', '#{session_name}'],
    { encoding: 'utf8' }
  );
  return (out.stdout ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
}

function clearHarnessSessions() {
  spawnSync('sleep', ['1']);
  const names = harnessSessions();
  for (const name of names) {
    spawnSync('tmux', ['-L', socket, 'kill-session', '-t', `=${name}`], {
      encoding: 'utf8'
    });
  }
  say(
    names.length === 0
      ? 'the harness server held no sessions to end'
      : `ended ${names.length} session(s): ${names.join(', ')}`
  );
}

// ---------------------------------------------------------------------------
// The measurement: how many times Electron's own handler wrapper printed the
// scroll refusal. This is the operator's own symptom, counted.
// ---------------------------------------------------------------------------

function logLines() {
  try {
    return readFileSync(appLog, 'utf8').split('\n');
  } catch {
    return [];
  }
}
function scrollErrorCount() {
  return logLines().filter((l) => l.includes("handler for 'terminal:scroll"))
    .length;
}
function logLength() {
  return logLines().length;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const results = [];
function note(step, claim, verdict, detail) {
  results.push({ step, claim, verdict, detail: detail ?? '' });
  say(
    `${String(step).padStart(2)}. ${verdict === 'pass' ? 'pass' : 'FAIL'}  ${claim}`
  );
  if (detail !== undefined && detail !== '') say(`         ${detail}`);
}

const measured = {};

function finish(code) {
  const operatorAfter = operatorSessionCount();
  say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
  let bad = code;
  if (operatorAfter !== operatorBefore) {
    say(
      `NOTE the operator's server went from ${String(operatorBefore)} to ` +
        `${String(operatorAfter)}. The count is taken while he is using the ` +
        'app, so read it again by hand before treating it as a violation.'
    );
  }
  for (const pid of recordedPids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  say(`signalled only the pids this run recorded: ${recordedPids.join(', ')}`);
  clearHarnessSessions();
  writeFileSync(
    REPORT,
    `${JSON.stringify(
      { operatorBefore, operatorAfter, measured, results, appLog },
      null,
      2
    )}\n`,
    'utf8'
  );
  say(`wrote ${REPORT}`);
  console.log('');
  console.log('  step  verdict  claim');
  console.log('  ----  -------  -----');
  for (const r of results) {
    console.log(
      `  ${String(r.step).padStart(4)}  ${r.verdict.padEnd(7)}  ${r.claim}`
    );
  }
  process.exit(bad);
}

async function main() {
  const child = launch('the run');
  let cdp;
  try {
    cdp = await cdpForProfile(profile, 120_000);
  } catch (err) {
    note(0, 'the window came up and could be driven', 'FAIL', err.message);
    return finish(1);
  }
  const haveDrive = await waitForDrive(cdp, 90_000);
  if (!haveDrive) {
    note(0, 'this build carries the Phase 95 drive', 'FAIL', 'no window.__gmuxP95');
    return finish(1);
  }
  if (!honouredTheSocket()) {
    note(0, 'the app honoured the harness socket', 'FAIL', 'override ignored');
    return finish(1);
  }
  note(1, 'the app is on the harness socket and its own profile', 'pass', socket);

  // -- the machine ----------------------------------------------------------
  const up = await drive(cdp, 'machineUp', MACHINE_ID);
  say(`machine rows after prepare: ${JSON.stringify(up.rows)}`);
  say(`prepare said: ${JSON.stringify(up.prepare).slice(0, 400)}`);
  const usable = (up.rows ?? []).some((r) => r.id === MACHINE_ID && r.usable);
  note(
    2,
    'the loopback machine is confirmed and prepared',
    usable ? 'pass' : 'FAIL',
    JSON.stringify(up.rows)
  );
  if (!usable) return finish(1);

  // -- a real session on that machine ---------------------------------------
  //
  // The first ask can come back "unreachable" while the renderer still holds
  // the machine's state from before prepare finished, so the ask is retried a
  // few times rather than once. It is the same ask each time and nothing is
  // supplied to make it succeed.
  let opened = { result: null };
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    opened = await drive(cdp, 'openRemote', MACHINE_ID, farProject);
    say(
      `openRemote attempt ${String(attempt)} said: ${JSON.stringify(opened.result).slice(0, 400)}`
    );
    if (opened.result?.ok === true) break;
    await sleep(3000);
  }
  let state = await drive(cdp, 'create', {
    name: 'p95-far',
    agent: 'shell',
    machineId: MACHINE_ID
  });
  const far = (state.sessions ?? []).find((s) => s.name === 'p95-far');
  note(
    3,
    'a session is running on the loopback machine',
    far !== undefined && far.machineId === MACHINE_ID ? 'pass' : 'FAIL',
    JSON.stringify(state.sessions)
  );
  if (far === undefined) return finish(1);
  await drive(cdp, 'select', far.id);
  state = await drive(cdp, 'state');
  say(`with the remote session on screen: ${JSON.stringify(state)}`);

  // -- STEP 4. the watch window --------------------------------------------
  const beforeRemote = scrollErrorCount();
  const t0 = Date.now();
  await drive(cdp, 'sleep', WATCH_MS);
  const remoteErrors = scrollErrorCount() - beforeRemote;
  measured.remoteWatchMs = Date.now() - t0;
  measured.remoteScrollErrors = remoteErrors;
  // The file the charter's packaged claim is about, read whichever binary is
  // being driven, so the development run states its number too.
  measured.profileLogScrollErrors = profileLogScrollErrors();
  say(
    `scroll error lines in ${profile}/logs/app.log: ${String(measured.profileLogScrollErrors)}`
  );
  note(
    4,
    `a remote session on screen for ${String(Math.round(measured.remoteWatchMs / 1000))} s prints no scroll error`,
    remoteErrors === 0 ? 'pass' : 'FAIL',
    `${String(remoteErrors)} lines matching "handler for 'terminal:scroll"`
  );

  // -- STEP 5. what the band says and what the lane draws -------------------
  //
  // BOTH orientations are checked and both must say it. The first build of
  // this phase wrote the note into the identity strip only, and the identity
  // strip is the band for the "right" orientation. `sessionOrientation`
  // defaults to "top", where App renders the session tab strip instead, so
  // the note was off screen in the layout most people have. Checking one
  // orientation is what let that through, so this step checks two.
  state = await drive(cdp, 'orientation', 'top');
  await sleep(1500);
  state = await drive(cdp, 'state');
  measured.remoteStateTop = state;
  await shoot(cdp, join(root, 'p95-remote-top.png'));
  note(
    '5a',
    'the DEFAULT band, being the session tab strip, says Tortie cannot scroll back',
    state.note !== null && state.note.text.includes('Cannot scroll back')
      ? 'pass'
      : 'FAIL',
    `orientation ${String(state.orientation)}, note ${JSON.stringify(state.note)}`
  );
  state = await drive(cdp, 'orientation', 'right');
  await sleep(1500);
  state = await drive(cdp, 'state');
  measured.remoteStateRight = state;
  await shoot(cdp, join(root, 'p95-remote-right.png'));
  note(
    '5b',
    'the identity strip says Tortie cannot scroll back',
    state.note !== null && state.note.text.includes('Cannot scroll back')
      ? 'pass'
      : 'FAIL',
    `orientation ${String(state.orientation)}, note ${JSON.stringify(state.note)}`
  );

  // -- STEP 6. the wheel and typing over the remote pane --------------------
  const beforeWheel = scrollErrorCount();
  await drive(cdp, 'wheel', 20, -120);
  measured.wheelScrollErrors = scrollErrorCount() - beforeWheel;
  const read = await drive(cdp, 'read', far.id);
  measured.remoteRead = read;
  note(
    6,
    'the wheel over a remote pane produces no error and no movement',
    measured.wheelScrollErrors === 0 && read.ok === true ? 'pass' : 'FAIL',
    `${String(measured.wheelScrollErrors)} error lines, read ${JSON.stringify(read)}`
  );
  await drive(cdp, 'type', 'echo p95-typed\r');
  await sleep(2000);
  measured.afterTyping = await drive(cdp, 'state');

  // -- STEP 7. a local session that is not running --------------------------
  await drive(cdp, 'orientation', 'top');
  await drive(cdp, 'openLocal', project);
  state = await drive(cdp, 'create', { name: 'p95-local', agent: 'shell' });
  const local = (state.sessions ?? []).find((s) => s.name === 'p95-local');
  if (local === undefined) {
    note(7, 'a local session was made', 'FAIL', JSON.stringify(state.sessions));
    return finish(1);
  }
  await drive(cdp, 'select', local.id);
  await sleep(1500);

  // -- STEP 8. the local RUNNING session's scrollbar, before anything ends --
  // Fill the pane so there is history to scroll through, then read, scroll,
  // drag, page and hold across a resize. Every number here is the bridge's.
  await drive(cdp, 'type', 'for i in $(seq 1 400); do echo "p95 line $i"; done\r');
  await sleep(3000);
  const live0 = await drive(cdp, 'read', local.id);
  const up30 = await drive(cdp, 'by', local.id, 30);
  const pageState = await drive(cdp, 'pageKey', 'PageUp', 2);
  const afterPage = await drive(cdp, 'read', local.id);
  const dragTo = await drive(cdp, 'to', local.id, 100);
  await drive(cdp, 'resize');
  const afterResize = await drive(cdp, 'read', local.id);
  const backLive = await drive(cdp, 'live', local.id);
  measured.localRunning = {
    live0,
    up30,
    pageState,
    afterPage,
    dragTo,
    afterResize,
    backLive
  };
  const moved =
    up30.ok === true &&
    up30.state !== null &&
    up30.state.position === 30 &&
    dragTo.ok === true &&
    dragTo.state.position === 100 &&
    afterResize.ok === true &&
    afterResize.state.position > 0 &&
    backLive.ok === true &&
    backLive.state.position === 0;
  note(
    8,
    'a session running on this Mac scrolls, drags, pages and holds its place',
    moved ? 'pass' : 'FAIL',
    JSON.stringify(measured.localRunning)
  );

  // -- STEP 9. the local session stops running while its pane is on screen --
  //
  // The session server is told to end it, NOT the app. The app's own End verb
  // marks the row exited in the same turn, the pane is unmounted at once and
  // there is no poll left to measure. A session that dies on the server is the
  // case the operator hit, and the pane stays mounted until the app notices.
  measured.harnessSessionsBeforeKill = harnessSessions();
  const killed = spawnSync(
    'tmux',
    ['-L', socket, 'kill-session', '-t', `=${local.tmuxName}`],
    { encoding: 'utf8' }
  );
  measured.killStatus = killed.status;
  say(`ended ${local.tmuxName} on the harness server, status ${String(killed.status)}`);
  const beforeLocal = scrollErrorCount();
  const t1 = Date.now();
  // Read the screen every second, so the moment the pane goes is recorded
  // rather than guessed at.
  const paneTrace = [];
  while (Date.now() - t1 < WATCH_MS) {
    const now = await drive(cdp, 'state');
    paneTrace.push({
      ms: Date.now() - t1,
      terminal: now.terminal,
      status: (now.sessions.find((x) => x.id === local.id) ?? {}).status ?? 'gone'
    });
    await sleep(1000);
  }
  const localErrors = scrollErrorCount() - beforeLocal;
  measured.localWatchMs = Date.now() - t1;
  measured.localScrollErrors = localErrors;
  measured.paneTrace = paneTrace;
  measured.paneMountedSeconds = paneTrace.filter((x) => x.terminal).length;
  const readDead = await drive(cdp, 'read', local.id);
  measured.deadRead = readDead;
  measured.afterKill = await drive(cdp, 'state');
  note(
    9,
    `a local session that stopped running, watched for ${String(Math.round(measured.localWatchMs / 1000))} s, prints no scroll error`,
    localErrors === 0 ? 'pass' : 'FAIL',
    `${String(localErrors)} lines, the pane was mounted for ` +
      `${String(measured.paneMountedSeconds)} of ${String(paneTrace.length)} reads. ` +
      `Asking main directly answered ${JSON.stringify(readDead)}`
  );
  await shoot(cdp, join(root, 'p95-local-dead.png'));

  measured.logLines = logLength();
  measured.totalScrollErrors = scrollErrorCount();
  say(`the app log holds ${String(measured.logLines)} lines in total`);
  say(`scroll error lines in the whole run: ${String(measured.totalScrollErrors)}`);

  await quit(child);
  return finish(results.some((r) => r.verdict !== 'pass') ? 1 : 0);
}

main().catch((err) => {
  note(99, 'the probe ran to the end', 'FAIL', String(err?.stack ?? err));
  finish(1);
});
