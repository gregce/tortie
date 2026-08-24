#!/usr/bin/env node
/**
 * probe-p93-attention.mjs. The Phase 93 live probe.
 *
 * ## WHAT IT PROVES
 *
 * That a session whose project tab is closed can still be reached, still says
 * where it is, and can still be cleared from the one list that shows it.
 *
 * The operator had three agents in exactly that state. Each row read as a bare
 * name with no folder beside it, Enter on the row did nothing a person could
 * see, and the only verb the row had was the one that did nothing. Every step
 * below is one half of that sentence turned into a gesture.
 *
 *   step  gesture                                   what must be true after it
 *   ----  ----------------------------------------  --------------------------
 *   1     ⌘J with the tab open                      the row is in the list
 *   2     the tab is closed, ⌘J again                the row is STILL there and
 *                                                    draws the folder
 *   3     Enter on that row                          the tab is back and the
 *                                                    session is selected
 *   4     the folder is renamed away, Enter          one sentence, the panel
 *                                                    stays open, no tab appears
 *   5     the folder is put back, Enter              the tab is back
 *   6     ⌘⌫ on the row, confirm accepted            the session is gone from
 *                                                    the session server
 *   7     a row on another machine                   the row draws the machine
 *                                                    label AND the folder
 *   8     Enter on that row                          the machine's own sentence,
 *                                                    the panel stays open
 *   9     quit, start again, ⌘J, Enter               the tab is back and the
 *                                                    session is selected
 *   10    read the row's record of the closed tab    it is there the moment the
 *                                                    tab closes, and after a quit
 *
 * ## WHAT IS REAL, AND WHAT THIS PROBE SUPPLIES
 *
 * Real: the project tab, both sessions, their manifest rows, the tab closing,
 * the folder opening again, the confirm, and the end. Step 6 reads the harness
 * session server itself rather than the app's own opinion.
 *
 * Supplied, and there are two things. Both are named in the report as well.
 *
 *  1. THE STATUS THAT PUTS A ROW IN THE LIST. The ⌘J list holds the sessions
 *     asking for input, and a shell can never ask for input. That is the
 *     product's own rule, in src/main/activity/oracles.ts, and not a limit of
 *     this harness. So the drive holds one REAL session's row at that status for
 *     the length of the run. Nothing else about the row is invented.
 *  2. THE SECOND COMPUTER. Steps 7 and 8 use one machine row and one session
 *     row that claims to run on it, with nothing signed in to it. They measure
 *     what the row DRAWS and which sentence the refusal writes. They do not
 *     measure a folder being opened on a real second computer, and they do not
 *     measure a session ending on one. A session on a real machine, whose tab
 *     has been closed, being ended by its id is measured by
 *     `npm run smoke:p93remote`, which this phase adds. A folder being opened
 *     on a real machine is measured by `npm run smoke:remote`.
 *
 * ONE MORE THING NOBODY SHOULD READ INTO A GREEN RUN. A row for a session on
 * another machine cannot appear in the ⌘J list in the product as it stands,
 * because that list holds the sessions asking for input and `needs input` is
 * never set for a remote session, by the decision of 2026-08-19. Steps 7 and 8
 * measure a row the drive placed there. They prove the row draws the machine
 * and that the refusal names it. They do not prove a person will see one.
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
 *   npm run probe:p93
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p93-attention \
 *     'node build/probe-p93-attention.mjs --keep'
 *
 * Exit code 0 when every step passes. Exit code 1 with each failing step named.
 * Exit code 2 when the probe refuses to run at all.
 *
 * Every scratch file carries a `p93-` prefix.
 */

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p93]';
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
      "server of my own: node build/harness-socket.mjs gmux-p93-attention " +
      "'node build/probe-p93-attention.mjs'"
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
const rawRoot = join(scratch, 'p93-attention');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
mkdirSync(join(rawRoot, 'profile', 'gmux', 'config'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const movedAway = join(root, 'project-moved-away');
const profile = join(root, 'profile');
const appLog = join(root, 'p93-app.log');
writeFileSync(join(project, 'README.md'), '# p93 attention probe\n', 'utf8');

/** One machine in the file, so a label resolves. Nothing listens on that port. */
const MACHINE_ID = 'p93far';
const MACHINE_LABEL = 'Studio';
const FAR_PATH = '/srv/p93-work';
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

const shotLocal = join(scratch, 'p93-overlay-local.png');
const shotRemote = join(scratch, 'p93-overlay-remote.png');
for (const one of [shotLocal, shotRemote]) rmSync(one, { force: true });

// ---------------------------------------------------------------------------
// A minimal DevTools protocol client. Copied from
// build/probe-remote-recents.mjs, which is where this pattern is documented.
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
 * failed at step 0 with "window.__gmuxP93 is not there", which is the same
 * message a build with no drive in it would print. A probe that reads as a
 * regression 2 times in 5 on a tree with no defect in it is worse than no
 * probe, so the wait is here and the message below only prints after it.
 */
async function waitForDrive(cdp, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let there = false;
    try {
      there = await cdpEval(cdp, 'window.__gmuxP93 !== undefined');
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
       const d = window.__gmuxP93;
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

const recordedPids = [];

/**
 * Hold the app open for exactly as long as `body` runs, and end its whole
 * process tree afterwards whatever happened (Phase 140). This used to be
 * `launch(tag)`, which handed a live child back to its caller, so an assertion
 * that threw between the launch and the quit left about 480 MB running.
 */
function runInApp(tag, body) {
  const stream = createWriteStream(appLog, { flags: 'a' });
  return withElectron(
    {
      label: `p93 ${tag}`,
      userDataDir: profile,
      cwd: repoRoot,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: {
        ...process.env,
        GMUX_TMUX_SOCKET: socket,
        // This is what makes the socket override real. `activeTmuxSocket` in
        // src/main/tmux/resolve.ts honours GMUX_TMUX_SOCKET only on a harness
        // launch, and GMUX_SHOT is no use here because it photographs the
        // window and quits before anything can be driven. The same reasoning
        // and the same term are in build/probe-remote-recents.mjs.
        GMUX_UPDATE_REHEARSAL: '1',
        GMUX_CONFIG_ROOT: join(profile, 'gmux', 'config'),
        GMUX_SPECSTORY_NO_CLOUD: '1'
      }
    },
    async (handle) => {
      const child = handle.child;
      recordedPids.push(child.pid);
      child.stdout.pipe(stream);
      child.stderr.pipe(stream);
      say(`launched ${tag}, pid ${String(child.pid)}, log ${appLog}`);
      return body(child);
    }
  );
}

/** Quit the app the way the operating system does, and wait for it to go. */
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
 * WHY IT IS NEEDED. `build/harness-socket.mjs` ends its server when the command
 * returns, and it says so. MEASURED on 2026-08-19: after two runs of this probe
 * that failed early, a `gmux-control` session was still alive on
 * `gmux-p93-attention` and on `gmux-p93-mut` afterwards, because the app
 * recreates its control session between this function and that teardown. One
 * leftover server per failed run adds up over a night of runs.
 *
 * WHY IT IS SAFE. It names the harness socket, which the refusals at the top of
 * this file have already proved is neither `gmux` nor `default`. It ends
 * sessions one at a time by exact name. It never uses `kill-server` and it
 * never uses `pkill`.
 *
 * It runs AFTER the recorded pids are signalled, with a pause, so the app is
 * gone before the sessions are and cannot make another one.
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
// The sentences, written here so the probe compares against fixed text rather
// than against whatever the build happened to say.
// ---------------------------------------------------------------------------

const folderGone = (path) =>
  `Tortie could not open ${path} again, because there is no folder there ` +
  'now. The session is still running and Tortie did not end it.';

/** The seven refusals a machine can answer, each with this phase's own tail. */
const machineSentences = (path, label) =>
  [
    `There is no folder at ${path} on ${label}.`,
    `${path} on ${label} is a file, not a folder.`,
    `Tortie cannot read ${path} on ${label}.`,
    `${label} did not answer, so Tortie could not check that folder.`,
    `Tortie is not connected to ${label}.`,
    'Type the whole path, starting with a slash.',
    'Tortie has no machine with that name any more.'
  ].map((one) => `${one} Tortie did not end the session.`);

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
    'WHAT THIS RUN DID NOT PROVE. Steps 7 and 8 use one machine row and one ' +
      'session row with nothing signed in, so they measure what the row draws ' +
      'and which sentence a refusal writes. A session ended on a real second ' +
      'computer after its tab is closed is measured by npm run smoke:p93remote. ' +
      'A folder opened on a real second computer is measured by npm run ' +
      'smoke:remote. A remote row cannot reach this list in the product as it ' +
      'stands, because needs input is never set for a remote session, so the ' +
      'drive put that row there. The status that puts any row in this list is ' +
      'held by the drive as well, because a shell can never ask for input. ' +
      'Every other fact above is a real session, a real tab and a real record.'
  );
  process.exit(bad);
}

async function main() {
  // The two runs nest, so each app is held by its own withElectron and
  // ended in that call's finally block. The first one is already quit by
  // the `quit` above before the second starts, so only one app is ever up.
  return runInApp('the first run', async (child) => {
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

    // -- setup ----------------------------------------------------------------
    let state = await drive(cdp, 'setup', { path: project, names: ['p93-a', 'p93-b'] });
    if (state?.missing === true) {
      note(
        0,
        'this build carries the Phase 93 drive',
        'FAIL',
        'window.__gmuxP93 is not there after 60 s of waiting for it. The ' +
          'renderer half of this probe is ' +
          'src/renderer/app/p93-attention-drive.ts and App.tsx registers it.'
      );
      return finish(1);
    }
    const rowOf = (s, name) => s.sessions.find((x) => x.name === name);
    const a = rowOf(state, 'p93-a');
    const b = rowOf(state, 'p93-b');
    if (a === undefined || b === undefined) {
      note(
        0,
        'two real sessions were made in the scratch project',
        'FAIL',
        `sessions: ${JSON.stringify(state.sessions.map((x) => x.name))}`
      );
      return finish(1);
    }
    say(`two real sessions: ${a.id} and ${b.id}`);
    await drive(cdp, 'hold', a.id, 'waiting for you');

    // -- 1. the row is in the list while the tab is open ----------------------
    state = await drive(cdp, 'openPanel');
    const row1 = state.rows.find((r) => r.name === 'p93-a');
    note(
      1,
      'the row is in the list while its tab is open',
      row1 !== undefined ? 'pass' : 'FAIL',
      `rows: ${JSON.stringify(state.rows.map((r) => r.name))}`
    );
    await drive(cdp, 'closePanel');

    // -- 2. the tab is closed and the row stays, with its folder --------------
    state = await drive(cdp, 'closeTab', project, null);
    const tabGone = !state.projects.some((p) => p.path === project);
    state = await drive(cdp, 'openPanel');
    const row2 = state.rows.find((r) => r.name === 'p93-a');
    await shoot(cdp, shotLocal);
    // The path SPAN is middle truncated so the panel's width does not move, and
    // the row's own accessible name carries the whole path. Both are read: the
    // span must be there and say something, and the name must be the full folder.
    const step2 =
      tabGone &&
      row2 !== undefined &&
      typeof row2.path === 'string' &&
      row2.path !== '' &&
      row2.label === `p93-a in ${project}` &&
      row2.machine === null;
    note(
      2,
      'with the tab closed the row is still listed and draws the folder',
      step2 ? 'pass' : 'FAIL',
      `tab closed ${String(tabGone)}, row ${JSON.stringify(row2 ?? null)}, ` +
        `expected the name "p93-a in ${project}", a non empty path span and no ` +
        'machine span'
    );

    // -- 3. Enter opens the folder again and lands in the session -------------
    await drive(cdp, 'select', 'p93-a');
    state = await drive(cdp, 'pressEnter');
    const backTab = state.projects.find((p) => p.path === project);
    const step3 =
      backTab !== undefined &&
      state.activeProjectId === backTab.id &&
      state.activeSessionId === a.id;
    note(
      3,
      'Enter opens the folder as a tab again and selects the session',
      step3 ? 'pass' : 'FAIL',
      `tab ${JSON.stringify(backTab ?? null)}, active project ` +
        `${String(state.activeProjectId)}, active session ` +
        `${String(state.activeSessionId)}, wanted ${a.id}. toasts ` +
        JSON.stringify(state.toasts)
    );

    // -- 4. the folder is gone, so Enter says so and opens nothing ------------
    await drive(cdp, 'closeTab', project, null);
    renameSync(project, movedAway);
    say(`renamed the scratch folder away, so ${project} is not there`);
    state = await drive(cdp, 'openPanel');
    await drive(cdp, 'select', 'p93-a');
    state = await drive(cdp, 'pressEnter');
    const wanted4 = folderGone(project);
    const step4 =
      state.toasts.includes(wanted4) &&
      state.panelOpen === true &&
      !state.projects.some((p) => p.path === project);
    note(
      4,
      'a folder that is not there draws one sentence and the panel stays open',
      step4 ? 'pass' : 'FAIL',
      `toasts ${JSON.stringify(state.toasts)}, wanted ${JSON.stringify(wanted4)}, ` +
        `panel open ${String(state.panelOpen)}, tabs ` +
        JSON.stringify(state.projects.map((p) => p.path))
    );

    // -- 4b. the whole sentence is on screen, measured ------------------------
    //
    // FIX ROUND. `.toast-text` is clamped and a cut is silent. MEASURED on
    // 2026-08-19 before the fix: a 197 character refusal wanted 100 px inside a
    // 40 px box, so 3 of its 5 lines were hidden and the clause saying the
    // session is still running was one of them.
    const fits = await drive(cdp, 'measureToasts');
    const cut = (fits ?? []).filter((one) => one.whole !== true);
    note(
      '4b',
      'every line of the refusal is on screen, so the half that says nothing ended is readable',
      cut.length === 0 ? 'pass' : 'FAIL',
      (fits ?? [])
        .map(
          (one) =>
            `${String(one.chars)} chars, wants ${String(one.scrollHeight)} px, ` +
            `has ${String(one.clientHeight)} px, clamp ${String(one.clamp)}`
        )
        .join(' | ')
    );

    // -- 5. the folder is back, so Enter works from the same open panel -------
    renameSync(movedAway, project);
    say('put the scratch folder back');
    state = await drive(cdp, 'openPanel');
    await drive(cdp, 'select', 'p93-a');
    state = await drive(cdp, 'pressEnter');
    const backTab5 = state.projects.find((p) => p.path === project);
    const step5 =
      backTab5 !== undefined && state.activeSessionId === a.id;
    note(
      5,
      'with the folder back, the same row opens the tab and lands in the session',
      step5 ? 'pass' : 'FAIL',
      `tabs ${JSON.stringify(state.projects.map((p) => p.path))}, active session ` +
        `${String(state.activeSessionId)}`
    );

    // -- 6. ⌘⌫ on the row ends the session, read off the session server -------
    const namesBefore = harnessSessions();
    state = await drive(cdp, 'openPanel');
    await drive(cdp, 'select', 'p93-a');
    state = await drive(cdp, 'pressEnd');
    const askedFirst = state.confirm !== null;
    if (askedFirst) state = await drive(cdp, 'acceptConfirm');
    await drive(cdp, 'release');
    await sleep(2_000);
    const namesAfter = harnessSessions();
    const wentAway = namesBefore.filter((one) => !namesAfter.includes(one));
    const step6 = askedFirst && wentAway.length === 1;
    note(
      6,
      'the row can be cleared from where it is seen, and the session really ends',
      step6 ? 'pass' : 'FAIL',
      `a confirm was asked for first: ${String(askedFirst)}. server before ` +
        `${JSON.stringify(namesBefore)}, after ${JSON.stringify(namesAfter)}`
    );

    // -- 7. a row on another machine names the machine and the folder ---------
    state = await drive(cdp, 'injectRemote', {
      machineId: MACHINE_ID,
      label: MACHINE_LABEL,
      path: FAR_PATH,
      name: 'p93-far'
    });
    state = await drive(cdp, 'openPanel');
    const row7 = state.rows.find((r) => r.name === 'p93-far');
    await shoot(cdp, shotRemote);
    const step7 =
      row7 !== undefined &&
      row7.machine === MACHINE_LABEL &&
      row7.label === `p93-far in ${FAR_PATH} on ${MACHINE_LABEL}` &&
      typeof row7.path === 'string' &&
      row7.path !== '';
    note(
      7,
      'a row for a session on another machine draws the machine and the folder',
      step7 ? 'pass' : 'FAIL',
      `row ${JSON.stringify(row7 ?? null)}, wanted the machine span ` +
        `${MACHINE_LABEL}, a non empty path span, and the name ` +
        `"p93-far in ${FAR_PATH} on ${MACHINE_LABEL}"`
    );

    // -- 8. Enter on that row draws the machine's own sentence ----------------
    await drive(cdp, 'select', 'p93-far');
    state = await drive(cdp, 'pressEnter');
    const allowed = machineSentences(FAR_PATH, MACHINE_LABEL);
    const said = state.toasts.filter((t) => allowed.includes(t));
    const step8 =
      said.length === 1 &&
      state.panelOpen === true &&
      !state.projects.some((p) => p.path === FAR_PATH);
    note(
      8,
      'a folder on a machine that cannot be reached draws that machine sentence',
      step8 ? 'pass' : 'FAIL',
      `said ${JSON.stringify(said)}, all toasts ${JSON.stringify(state.toasts)}, ` +
        `panel open ${String(state.panelOpen)}`
    );

    // -- 9. quit, start again, and the second session is still reachable ------
    await drive(cdp, 'closePanel');
    await drive(cdp, 'closeTab', project, null);
    const beforeQuit = await drive(cdp, 'state');
    const stampBefore = beforeQuit.sessions.find((x) => x.id === b.id)?.closedProject ?? null;
    cdp.close();
    await quit(child);
    say('the app was quit. Starting it again on the same profile.');

    return runInApp('the second run', async (child) => {
      try {
        cdp = await cdpForProfile(profile, 120_000);
      } catch (err) {
        note(9, 'the app comes back and the session is still reachable', 'FAIL', err.message);
        return finish(1);
      }
      if (!(await waitForDrive(cdp, 60_000))) {
        note(
          9,
          'the app comes back and the session is still reachable',
          'FAIL',
          'window.__gmuxP93 never arrived on the second run'
        );
        return finish(1);
      }
      await sleep(4_000);
      state = await drive(cdp, 'state');
      const stampAfter = state.sessions.find((x) => x.id === b.id)?.closedProject ?? null;
      const tabStillClosed = !state.projects.some((p) => p.path === project);
      await drive(cdp, 'hold', b.id, 'waiting for you');
      state = await drive(cdp, 'openPanel');
      await drive(cdp, 'select', 'p93-b');
      state = await drive(cdp, 'pressEnter');
      const backTab9 = state.projects.find((p) => p.path === project);
      const step9 =
        tabStillClosed && backTab9 !== undefined && state.activeSessionId === b.id;
      note(
        9,
        'after a quit and a start, the closed tab is still closed and the row still reaches its session',
        step9 ? 'pass' : 'FAIL',
        `tab still closed ${String(tabStillClosed)}, tab back ` +
          `${JSON.stringify(backTab9 ?? null)}, active session ` +
          `${String(state.activeSessionId)}, wanted ${b.id}`
      );
      // FIX ROUND. This used to be a note that reported a null on both sides
      // instead of failing on it, and on 2026-08-19 it read null before the quit
      // and a record after it. The record was in the manifest the whole time and
      // the window had not been told, because closing a tab pushed the project list
      // and not the session list. `jumpToSession` reads this field to decide
      // whether a tab coming back needs a sentence, so a person who closed a tab
      // themselves could be told the folder had never had one. `removeProject` now
      // pushes the session list when it stamps, and this step holds that.
      const step10 = stampBefore !== null && stampAfter !== null;
      note(
        10,
        'the record of the closed tab reaches the window at once and survives a quit',
        step10 ? 'pass' : 'FAIL',
        `before the quit ${JSON.stringify(stampBefore)}, after it ` +
          `${JSON.stringify(stampAfter)}`
      );

      // -- cleanup --------------------------------------------------------------
      await drive(cdp, 'release');
      await drive(cdp, 'killAll', [a.id, b.id]);
      cdp.close();
      await quit(child);

      const failed = results.filter((r) => r.verdict !== 'pass');
      if (failed.length > 0) {
        console.log('');
        for (const one of failed) {
          console.error(`${TAG} FAIL step ${String(one.step)}: ${one.claim}`);
        }
        return finish(1);
      }
      console.log('');
      say(
        'every step passed. A session whose project is closed says where it is, ' +
          'can be reached, and can be cleared from the list that shows it.'
      );
      return finish(0);
    });
  });
}

main().catch((err) => {
  console.error(`${TAG} the probe threw: ${err.stack ?? err.message}`);
  finish(1);
});
