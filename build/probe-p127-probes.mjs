#!/usr/bin/env node
/**
 * probe-p127-probes.mjs. The Phase 127 live probe.
 *
 * ## WHAT IT PROVES
 *
 * That the gate on src/renderer/app/probe-loader.ts is real in a running app,
 * and not only in the built bytes that build/assert-probe-containment.mjs
 * reads. It launches the app twice on the same isolated profile and asks the
 * live window one question each time.
 *
 *   leg       environment      typeof window.__gmuxP93 must be
 *   --------  ---------------  -------------------------------
 *   armed     GMUX_PROBES=1    'object'
 *   unarmed   GMUX_PROBES=0    'undefined'
 *
 * It also reads back the window's own URL on each leg, because the query
 * string is the whole gate and a reader should be able to see it rather than
 * infer it from the answer.
 *
 * ## SAFETY, ABSOLUTE
 *
 * Both legs run on the socket build/harness-socket.mjs handed this process,
 * which that script refuses to let be `gmux` or `default`. Both use one
 * throwaway --user-data-dir under the harness directory.
 *
 * THE UNARMED LEG STILL SETS A HARNESS TERM, and this is the one thing about
 * this file that must never be relaxed. `activeTmuxSocket` in
 * src/main/tmux/resolve.ts honours GMUX_TMUX_SOCKET only on a harness launch.
 * A launch carrying no harness variable at all would ignore the override and
 * attach to socket `gmux`, which is the operator's live server. `GMUX_PROBES=0`
 * is a harness term for the socket, and the loader tests for the exact string
 * '1', so the probes stay out while the socket override stays honoured. The run
 * counts the operator's sessions before and after and fails if the number moved.
 *
 * Every launch is ended in a finally block, one at a time, and the pids this
 * process spawned are the only ones it ever signals.
 *
 * Usage, from the worktree root:
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p127-probes 'node build/probe-p127-probes.mjs'
 *
 * Exit code 0 when both legs answered correctly. 1 when one did not. 2 when the
 * probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p127]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p127-probes 'node " +
      "build/probe-p127-probes.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const root = join(scratch, 'gmux-p127-probes');
rmSync(root, { recursive: true, force: true });
const profile = join(root, 'profile');
mkdirSync(profile, { recursive: true });
const appLog = join(root, 'app.log');

// ---------------------------------------------------------------------------
// A minimal DevTools protocol client. Copied from
// build/probe-p93-attention.mjs, which copied it from
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
    const events = [];
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
        if (msg.id === undefined) {
          // Phase 127 added this branch to the copied client. A message with
          // no id is an event, and the two events below are the only way this
          // probe can say WHY an armed leg came back empty. Without them a
          // failed chunk load and a deleted probe read the same.
          if (
            msg.method === 'Runtime.consoleAPICalled' ||
            msg.method === 'Runtime.exceptionThrown'
          ) {
            events.push(msg);
          }
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
      /** Every console line and thrown exception seen since attach. */
      events() {
        return events;
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

// ---------------------------------------------------------------------------
// One leg
// ---------------------------------------------------------------------------


/**
 * Launch once, read the window, quit.
 *
 * The reading is taken after `window.__gmuxShotReady` would have mattered and
 * after the shell has had time to mount, because the armed leg must be given
 * every chance to answer 'object'. A false 'undefined' would read as a pass on
 * the unarmed leg and a fail on the armed one, so the wait below is generous
 * on purpose and the armed leg polls rather than sampling once.
 */
async function runLeg(probesValue) {
  const tag = probesValue === '1' ? 'armed' : 'unarmed';
  rmSync(join(profile, 'DevToolsActivePort'), { force: true });
  const stream = createWriteStream(appLog, { flags: 'a' });
  return withElectron(
    {
      label: `p127 ${tag}`,
      userDataDir: profile,
      cwd: repoRoot,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: {
        ...process.env,
        GMUX_TMUX_SOCKET: socket,
        // The harness term. On the unarmed leg it is '0', which is still a
        // harness launch for the socket and is NOT the string the loader
        // tests for. Read the safety paragraph at the top of this file before
        // changing either value.
        GMUX_PROBES: probesValue,
        GMUX_CONFIG_ROOT: join(profile, 'gmux', 'config'),
        GMUX_SPECSTORY_NO_CLOUD: '1'
      }
    },
    async (handle) => {
    const child = handle.child;
    child.stdout.pipe(stream);
    child.stderr.pipe(stream);
    say(`launched ${tag}, pid ${String(child.pid)}, log ${appLog}`);

    let reading = null;
    let noise = [];
    let cdp = null;
    try {
      cdp = await cdpForProfile(profile, 60_000);
      // Turn the console on before anything is read, so a loader that failed
      // says so in this probe's own output instead of only in a devtools window
      // nobody has open.
      await cdp.call('Runtime.enable', {});
      // The armed leg installs its drives before the first render, so a poll of
      // a few seconds is more than it can need. The unarmed leg is polled for
      // exactly as long, so the two legs get the same chance and the difference
      // in the answers cannot be a difference in patience.
      const deadline = Date.now() + 20_000;
      for (;;) {
        reading = await cdpEval(
          cdp,
          `({
           p93: typeof window.__gmuxP93,
           p95: typeof window.__gmuxP95,
           p96: typeof window.__gmuxP96RemoteSurfaces,
           shellPath: typeof window.__gmuxShellPathProbe,
           load: String(window.__gmuxProbeLoad),
           rendered: (document.getElementById('root')?.children.length ?? 0) > 0,
           url: String(window.location.href).replace(/^.*renderer/, 'renderer'),
           search: String(window.location.search)
         })`
        );
        if (reading?.p93 === 'object' || Date.now() > deadline) break;
        await sleep(500);
      }
      noise = cdp
        .events()
        .filter(
          (e) =>
            e.method === 'Runtime.exceptionThrown' ||
            ['error', 'warning'].includes(e.params?.type)
        )
        .map((e) =>
          e.method === 'Runtime.exceptionThrown'
            ? `throw: ${String(e.params?.exceptionDetails?.text ?? '')} ${String(
              e.params?.exceptionDetails?.exception?.description ?? ''
            )}`
            : `${String(e.params?.type)}: ${(e.params?.args ?? [])
              .map((a) => String(a.value ?? a.description ?? a.type))
              .join(' ')}`
        )
        .slice(0, 12);
    } finally {
      if (cdp !== null) cdp.close();
      if (child.exitCode === null) child.kill('SIGTERM');
      for (let i = 0; i < 80; i += 1) {
        if (child.exitCode !== null || child.signalCode !== null) break;
        await sleep(250);
      }
      if (child.exitCode === null && child.signalCode === null) {
        say(`${tag} did not go on SIGTERM, sending SIGKILL to pid ${String(child.pid)}`);
        child.kill('SIGKILL');
        await sleep(1000);
      }
      child.stdout.destroy();
      child.stderr.destroy();
      stream.end();
      await sleep(750);
    }
    return { tag, reading, noise };
  });
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const failures = [];
const results = [];

try {
  // ONE Electron at a time. The armed leg is fully ended before the unarmed
  // leg starts, and the finally block above is what guarantees that.
  results.push(await runLeg('1'));
  results.push(await runLeg('0'));
} catch (err) {
  failures.push(`a leg threw: ${String(err?.message ?? err)}`);
}

console.log('');
say('reading');
console.log(
  '  leg       p93        p95        p96        shellPath  search      rendered  load'
);
for (const { tag, reading } of results) {
  const r = reading ?? {};
  console.log(
    `  ${tag.padEnd(9)} ${String(r.p93).padEnd(10)} ${String(r.p95).padEnd(10)}` +
      ` ${String(r.p96).padEnd(10)} ${String(r.shellPath).padEnd(10)} ` +
      `${String(r.search).padEnd(11)} ${String(r.rendered).padEnd(9)} ${String(r.load)}`
  );
}
for (const { tag, noise } of results) {
  if (noise.length === 0) continue;
  say(`console on the ${tag} leg`);
  for (const line of noise) console.log(`  ${line}`);
  console.log('');
}

const armed = results.find((x) => x.tag === 'armed')?.reading ?? null;
const unarmed = results.find((x) => x.tag === 'unarmed')?.reading ?? null;

if (armed === null) failures.push('the armed leg produced no reading at all');
else {
  if (armed.p93 !== 'object') {
    failures.push(`armed: window.__gmuxP93 is '${String(armed.p93)}', not 'object'`);
  }
  if (armed.search !== '?harness=1') {
    failures.push(
      `armed: the window's search is '${String(armed.search)}', not '?harness=1'`
    );
  }
}
if (unarmed === null) failures.push('the unarmed leg produced no reading at all');
else {
  for (const [name, value] of Object.entries({
    __gmuxP93: unarmed.p93,
    __gmuxP95: unarmed.p95,
    __gmuxP96RemoteSurfaces: unarmed.p96,
    __gmuxShellPathProbe: unarmed.shellPath
  })) {
    if (value !== 'undefined') {
      failures.push(
        `unarmed: window.${name} is '${String(value)}', not 'undefined'. The ` +
          'probe chunk loaded on a launch that was not told to load it.'
      );
    }
  }
  if (unarmed.search !== '') {
    failures.push(
      `unarmed: the window's search is '${String(unarmed.search)}', not empty`
    );
  }
}

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`
  );
}

if (failures.length === 0) rmSync(root, { recursive: true, force: true });
else say(`the scratch root is kept for reading: ${root}`);

if (failures.length > 0) {
  console.log('');
  say(`FAIL, ${String(failures.length)} reading(s):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say("PASS. Armed answers 'object', unarmed answers 'undefined'.");
