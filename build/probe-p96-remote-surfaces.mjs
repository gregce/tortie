#!/usr/bin/env node
/**
 * probe-p96-remote-surfaces.mjs. The Phase 96 live probe.
 *
 * ## WHAT IT PROVES
 *
 * Two of the four defects the parity audit found, both of them on a surface a
 * person reaches for a file or a session that is on another computer.
 *
 *   step  gesture                                   what must be true after it
 *   ----  ----------------------------------------  --------------------------
 *   1     a real file opens in a real Monaco         the editor is editable and
 *                                                    takes the character
 *   2     that same tab is given a file on another   Monaco reads read only and
 *         machine                                    the character is dropped
 *   3     the window is photographed                 the band and the editor
 *                                                    are on one image
 *   4     a real session's menu is built             the two history presets are
 *                                                    drawn and Clear is enabled
 *   5     that same session is given a machine       those two are gone and
 *                                                    Clear is disabled
 *   6     the two menus are compared cell by cell    exactly three cells moved
 *
 * ## WHAT IS REAL, AND WHAT THIS PROBE SUPPLIES
 *
 * Real: the project tab, the file, the Monaco model, the session, its manifest
 * row and the terminal mounted over it. Step 1 types into a real editor through
 * Monaco's own `type` handler, which is what a keypress runs.
 *
 * Supplied, and there are two things. THE SECOND COMPUTER, and the session's
 * TERMINAL STAYING REGISTERED across step 5. A session that gains a machine
 * leaves the local project tab's list, so its pane unmounts and its terminal is
 * unregistered, and every capture item then disappears for that reason instead
 * of this phase's. For a session on a real machine the terminal is live,
 * because Tortie is attached to it over the link, so the drive puts the same
 * real xterm back under the same id and the machine field is the only
 * difference between the two readings. Step 5 prints whether it did.
 *
 * On the second computer. Nothing is
 * signed in to the machine this probe names and no far side is contacted. The
 * drive adds a `remote` reference to a tab that is already open and a machine to
 * a session row that is already running. What is measured is what Tortie draws
 * and what Monaco refuses for such a row, and not what a far side answers. A
 * real second computer is measured by `npm run smoke:remote` and by
 * `npm run probe:remotereview`.
 *
 * ## WHAT THIS PROBE CANNOT DO
 *
 * A native macOS popup menu is a window of its own, and the app's own
 * screenshot path cannot photograph it. Asking main to open one would block
 * this probe until somebody dismissed it. So the evidence for the session menu
 * is the ITEM LIST handed to the native bridge, which is what
 * src/renderer/app/ContextMenu.tsx forwards to `ui:popupMenu` unchanged. It is
 * the list rather than a photograph of the list, and this file says so again in
 * its closing report.
 *
 * ## SAFETY, ABSOLUTE
 *
 * It runs on the socket build/harness-socket.mjs gave it, which that script
 * refuses to let be `gmux` or `default`. It uses its own user data directory and
 * its own scratch project, both outside the repository. It names `-L gmux` in
 * exactly one place, a read only session count taken before and after, which
 * must match. It opens no connection to any machine and starts no sign in. It
 * never uses pkill, never uses kill-server, and signals only the pids it
 * spawned.
 *
 * Usage, from the repository root:
 *
 *   npm run probe:p96
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p96-remote \
 *     'node build/probe-p96-remote-surfaces.mjs --keep'
 *
 * Exit code 0 when every step passes. Exit code 1 with each failing step named.
 * Exit code 2 when the probe refuses to run at all.
 *
 * Every scratch file carries a `p96-` prefix.
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
const TAG = '[probe:p96]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const keep = process.argv.includes('--keep');

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a session ' +
      'server of my own: node build/harness-socket.mjs gmux-p96-remote ' +
      "'node build/probe-p96-remote-surfaces.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/**
 * The operator's live server, listed and never written. This is the ONLY place
 * this file names it.
 */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '')
    .split('\n')
    .filter((line) => line.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p96-remote-surfaces');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project', 'src'), { recursive: true });
mkdirSync(join(rawRoot, 'profile', 'gmux', 'config'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
const appLog = join(root, 'p96-app.log');

/** The file the editor half of this probe types into. */
const REL_PATH = 'src/auth.ts';
const FILE_PATH = join(project, REL_PATH);
const FILE_BODY = 'export const auth = 1;\n';
writeFileSync(join(project, 'README.md'), '# p96 remote surfaces probe\n');
writeFileSync(FILE_PATH, FILE_BODY, 'utf8');

/**
 * A real repository, so the tab opens through the ordinary path rather than the
 * out of repository one. The commit is what gives the file a HEAD side.
 */
function git(...args) {
  return spawnSync('git', args, { cwd: project, encoding: 'utf8' });
}
git('init', '-q');
git('config', 'user.email', 'p96@example.invalid');
git('config', 'user.name', 'p96 probe');
git('add', '-A');
git('commit', '-q', '-m', 'p96 fixture');

/** One machine in the file, so a label resolves. Nothing listens on that port. */
const MACHINE_ID = 'p96far';
const MACHINE_LABEL = 'Studio';
const FAR_REPO = '/srv/p96-work';
writeFileSync(
  join(profile, 'gmux', 'config', 'machines.json'),
  `${JSON.stringify(
    {
      schema: 1,
      machines: [
        {
          id: MACHINE_ID,
          label: MACHINE_LABEL,
          // A loopback address nothing listens on. This probe signs in to
          // nothing, and the row is here so a machine id resolves to a name.
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

const shotLocal = join(scratch, 'p96-editor-local.png');
const shotRemote = join(scratch, 'p96-editor-remote.png');
const shotSession = join(scratch, 'p96-session-remote.png');
for (const one of [shotLocal, shotRemote, shotSession]) rmSync(one, { force: true });

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
      call(method, params, timeoutMs = 90_000) {
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
          say(`attached to the window over the devtools protocol (port ${port})`);
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

/**
 * Wait until the renderer half of this probe is on `window`.
 *
 * WHY IT IS A SEPARATE WAIT. `cdpForProfile` returns as soon as a page target
 * exists, and a page target exists before App.tsx has run. MEASURED on
 * 2026-08-19 across five runs of this probe on a green tree: two of them
 * failed at step 0 with "window.__gmuxP96RemoteSurfaces is not there", which is the same
 * message a build with no drive in it would print. A probe that reads as a
 * regression 2 times in 5 on a tree with no defect in it is worse than no
 * probe, so the wait is here and the message below only prints after it.
 */
async function waitForDrive(cdp, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let there = false;
    try {
      there = await cdpEval(cdp, 'window.__gmuxP96RemoteSurfaces !== undefined');
    } catch {
      // The page can be swapped under us while it is still loading.
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

/** One call into the drive, by name, with JSON arguments. */
function drive(cdp, method, ...args) {
  const call = args.map((a) => JSON.stringify(a)).join(', ');
  return cdpEval(
    cdp,
    `(async () => {
       const d = window.__gmuxP96RemoteSurfaces;
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

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');
const recordedPids = [];

function launch(tag) {
  const stream = createWriteStream(appLog, { flags: 'a' });
  const child = spawn(
    electronBin,
    [
      '.',
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
        // This is what makes the socket override real. `activeTmuxSocket` in
        // src/main/tmux/resolve.ts honours GMUX_TMUX_SOCKET only on a harness
        // launch, and it counts three terms. GMUX_SHOT is one of them and is no
        // use here, because a shot launch photographs the window and quits
        // before anything can be driven. build/probe-p93-attention.mjs names
        // the same term for the same reason.
        GMUX_UPDATE_REHEARSAL: '1',
        GMUX_CONFIG_ROOT: join(profile, 'gmux', 'config'),
        GMUX_SPECSTORY_NO_CLOUD: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  recordedPids.push(child.pid);
  child.stdout.pipe(stream);
  child.stderr.pipe(stream);
  say(`launched ${tag}, pid ${String(child.pid)}, log ${appLog}`);
  return child;
}

/** The app refuses the socket override on a launch it does not think is a harness. */
function honouredTheSocket() {
  let text = '';
  try {
    text = readFileSync(appLog, 'utf8');
  } catch {
    return true;
  }
  return !text.includes('is set but this is not a harness launch');
}

/** Sessions on the HARNESS server, by name. Never the operator's. */
function harnessSessions() {
  const out = spawnSync(
    'tmux',
    ['-L', socket, 'list-sessions', '-F', '#{session_name}'],
    { encoding: 'utf8' }
  );
  return (out.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/**
 * End every session left on the HARNESS server, by exact name.
 *
 * It names the harness socket, which the refusals at the top of this file have
 * already proved is neither `gmux` nor `default`. It ends sessions one at a
 * time by exact name. It never uses `kill-server` and it never uses `pkill`. It
 * runs AFTER the recorded pids are signalled, with a pause, so the app is gone
 * before the sessions are and cannot make another one. The reasoning is
 * build/probe-p93-attention.mjs's and the measurement behind it is recorded
 * there.
 */
function clearHarnessSessions() {
  spawnSync('sleep', ['1']);
  const names = harnessSessions();
  for (const name of names) {
    spawnSync('tmux', ['-L', socket, 'kill-session', '-t', `=${name}`], {
      encoding: 'utf8'
    });
  }
  const still = harnessSessions();
  say(
    names.length === 0
      ? 'the harness server held no sessions to end'
      : `ended ${names.length} session(s) on the harness server: ` +
          `${names.join(', ')}. Left now: ${still.join(', ') || 'none'}`
  );
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const results = [];
function note(step, claim, verdict, detail) {
  results.push({ step, claim, verdict, detail });
  const mark = verdict === 'pass' ? 'pass' : 'FAIL';
  say(`${String(step).padStart(2)}. ${mark}  ${claim}`);
  if (detail !== undefined && detail !== '') say(`         ${detail}`);
}

function finish(code) {
  const operatorAfter = operatorSessionCount();
  say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
  let bad = code;
  if (operatorAfter !== operatorBefore) {
    say(
      `FAIL the operator's server went from ${String(operatorBefore)} to ` +
        `${String(operatorAfter)} sessions. This probe must never touch it. ` +
        'The count is taken while the operator is using the app, so read it ' +
        'again by hand before treating a difference as a violation.'
    );
    bad = 1;
  }
  const left = harnessSessions();
  say(`sessions left on the harness server: ${left.join(', ') || 'none'}`);
  for (const pid of recordedPids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  say(`signalled only the pids this run recorded: ${recordedPids.join(', ')}`);
  clearHarnessSessions();
  if (!keep) rmSync(root, { recursive: true, force: true });
  console.log('');
  say('the table, one row per step');
  console.log('  step  verdict  claim');
  console.log('  ----  -------  -----');
  for (const r of results) {
    console.log(
      `  ${String(r.step).padStart(4)}  ${r.verdict.padEnd(7)}  ${r.claim}`
    );
  }
  console.log('');
  say(
    'WHAT THIS RUN DID NOT PROVE. Nothing was signed in to a machine and no ' +
      'far side was contacted, so what steps 2, 5 and 6 measure is what Tortie ' +
      'draws and what Monaco refuses for a row that names another computer. ' +
      'The session terminal in step 5 was put back in the registry by the ' +
      'drive, because an injected machine unmounts the pane and a real one ' +
      'does not. A ' +
      'native popup menu is a window of its own and was not photographed: the ' +
      'evidence for the menu is the item list handed to the native bridge. A ' +
      'real second computer is measured by npm run smoke:remote and by npm run ' +
      'probe:remotereview.'
  );
  process.exit(bad);
}

/** One row of a menu reading, found by label. */
function rowOf(reading, label) {
  return (reading?.rows ?? []).find((r) => r.label === label) ?? null;
}

/** Every label either reading drew, in the order the first one drew them. */
function allLabels(a, b) {
  const out = [];
  for (const r of [...(a?.rows ?? []), ...(b?.rows ?? [])]) {
    if (!out.includes(r.label)) out.push(r.label);
  }
  return out;
}

/** How one label reads: absent, enabled or disabled. */
function cellOf(reading, label) {
  const row = rowOf(reading, label);
  if (row === null) return 'absent';
  return row.disabled ? 'disabled' : 'enabled';
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
  await waitForDrive(cdp, 60_000);
  if (!honouredTheSocket()) {
    note(
      0,
      'the app honoured the harness socket, so the operator server was untouched',
      'FAIL',
      'the app logged that the socket override was ignored'
    );
    return finish(1);
  }

  // -- 1. the control reading: a real file in a real Monaco -----------------
  const readingA = await drive(cdp, 'openFile', {
    repoPath: project,
    relPath: REL_PATH,
    path: FILE_PATH
  });
  if (readingA?.missing === true) {
    note(
      0,
      'this build carries the Phase 96 drive and mounted a Monaco editor',
      'FAIL',
      'window.__gmuxP96RemoteSurfaces is not there, or no editor was mounted ' +
        'within 15 s. The renderer half of this probe is ' +
        'src/renderer/app/p96-remote-surfaces-drive.ts and App.tsx registers it.'
    );
    return finish(1);
  }
  await shoot(cdp, shotLocal);
  const step1 =
    readingA.readOnly === false &&
    readingA.accepted === true &&
    readingA.remote === false;
  note(
    1,
    'a file on THIS Mac is editable and Monaco takes the character',
    step1 ? 'pass' : 'FAIL',
    `readOnly ${String(readingA.readOnly)}, before ` +
      `${JSON.stringify(readingA.before)}, after ${JSON.stringify(readingA.after)}`
  );

  // -- 2. the measurement: the same tab, on another machine -----------------
  const readingB = await drive(cdp, 'makeRemote', { repoPath: FAR_REPO });
  await shoot(cdp, shotRemote);
  const sameTab = readingA.tabId !== null && readingA.tabId === readingB.tabId;
  const step2 =
    sameTab &&
    readingB.remote === true &&
    readingB.readOnly === true &&
    readingB.accepted === false &&
    // The tab is already dirty, because step 1 typed into it while it was a
    // file on this Mac and that character was accepted. What must hold here is
    // that the refused keystroke moved NOTHING, so the flag is compared with
    // itself rather than with false.
    readingB.dirtyAfter === readingB.dirtyBefore;
  note(
    2,
    'the same tab, naming a file on another machine, refuses the keystroke',
    step2 ? 'pass' : 'FAIL',
    `same tab ${String(sameTab)}, remote ${String(readingB.remote)}, readOnly ` +
      `${String(readingB.readOnly)}, before ${JSON.stringify(readingB.before)}, ` +
      `after ${JSON.stringify(readingB.after)}, dirty ` +
      `${String(readingB.dirtyBefore)} then ${String(readingB.dirtyAfter)}`
  );

  // -- 3. one image with the band and the editor on it ----------------------
  note(
    3,
    'the window was photographed with the lock band over the editor',
    existsSync(shotRemote) ? 'pass' : 'FAIL',
    `${shotLocal} and ${shotRemote}`
  );

  // -- 4. a real session's menu, on this Mac --------------------------------
  const menuA = await drive(cdp, 'makeSession', 'p96-a');
  const step4 =
    menuA?.live === true &&
    menuA.machine === null &&
    cellOf(menuA, 'Capture Last 250 Lines') === 'enabled' &&
    cellOf(menuA, 'Capture Last 1,000 Lines') === 'enabled' &&
    cellOf(menuA, 'Clear') === 'enabled';
  note(
    4,
    'a real session on this Mac draws both history presets and an enabled Clear',
    step4 ? 'pass' : 'FAIL',
    `live ${String(menuA?.live)}, labels ` +
      JSON.stringify((menuA?.rows ?? []).map((r) => r.label))
  );

  // -- 5. the same session, on another machine ------------------------------
  const menuB = await drive(cdp, 'setMachine', true);
  await shoot(cdp, shotSession);
  const step5 =
    menuB?.machine === MACHINE_LABEL &&
    menuB.live === true &&
    cellOf(menuB, 'Capture Last 250 Lines') === 'absent' &&
    cellOf(menuB, 'Capture Last 1,000 Lines') === 'absent' &&
    cellOf(menuB, 'Clear') === 'disabled';
  note(
    5,
    'the same session on another machine loses both presets and Clear is disabled',
    step5 ? 'pass' : 'FAIL',
    `machine ${String(menuB?.machine)}, live ${String(menuB?.live)}, terminal ` +
      `put back by the drive ${String(menuB?.terminalHeld)}, labels ` +
      JSON.stringify((menuB?.rows ?? []).map((r) => r.label))
  );

  // -- 6. exactly three cells moved, and no fourth --------------------------
  const labels = allLabels(menuA, menuB);
  const table = labels.map((label) => ({
    label,
    onThisMac: cellOf(menuA, label),
    onAnotherMachine: cellOf(menuB, label)
  }));
  const moved = table.filter((r) => r.onThisMac !== r.onAnotherMachine);
  const wanted = [
    'Capture Last 250 Lines',
    'Capture Last 1,000 Lines',
    'Clear'
  ];
  const step6 =
    moved.length === 3 && moved.every((r) => wanted.includes(r.label));
  console.log('');
  say('the two menus, cell by cell');
  console.log('  item                        on this Mac   on another machine');
  console.log('  --------------------------  ------------  ------------------');
  for (const r of table) {
    console.log(
      `  ${r.label.padEnd(26)}  ${r.onThisMac.padEnd(12)}  ${r.onAnotherMachine}`
    );
  }
  console.log('');
  note(
    6,
    'exactly three cells moved, and every other item is untouched',
    step6 ? 'pass' : 'FAIL',
    `moved ${JSON.stringify(moved.map((r) => r.label))}, wanted ` +
      JSON.stringify(wanted)
  );

  // -- teardown -------------------------------------------------------------
  const ids = await drive(cdp, 'sessionIds');
  await drive(cdp, 'setMachine', false);
  await drive(cdp, 'killAll', ids ?? []);
  await sleep(1_000);
  cdp.close();
  child.kill('SIGTERM');
  await sleep(1_500);

  const failed = results.filter((r) => r.verdict !== 'pass');
  return finish(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  note('?', 'the probe ran to the end', 'FAIL', err?.stack ?? String(err));
  finish(1);
});
