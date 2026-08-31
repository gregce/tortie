#!/usr/bin/env node
/**
 * probe-p181-usage-switch.mjs. Does the meter follow its switch, in the app?
 *
 * ## Why this exists
 *
 * The Phase 181 verification measured the whole feature and found one blocking
 * defect, and it found it only by driving the running product: with both
 * switches flipped on through the shipped settings bridge the DOM held ZERO
 * meter elements at twelve marks across a minute, and with them flipped off the
 * numbers were still drawn at all twelve. Nothing in the unit suite could see
 * it, because the defect was that no renderer subscribed to `settings:changed`.
 * So the fix round wrote this, and it is the executable form of that reading.
 *
 * ## What it measures, in ONE app run
 *
 * Three off-on-off cycles on the Codex switch, driven through the same
 * `settings:set` channel the Settings page uses, with the meter counted out of
 * the live DOM after each flip and the time to the change recorded in
 * milliseconds. It asserts four things:
 *
 *   1. Both switches off draws NO meter at all, which is every fresh install.
 *   2. A switch turned on draws its row within the deadline, with no reload.
 *   3. A switch turned off takes the row AND its numbers off the face.
 *   4. It works every cycle, not once. The defect it replaces was a one-shot.
 *
 * ## What it deliberately never touches
 *
 * No credential and no network. `CODEX_HOME` is pointed at an empty scratch
 * directory, so the Codex read answers `missing`, which draws the row in its
 * signed out state: that is enough to prove the switch is answered, and it
 * needs no keychain, no credentials file and no request to any vendor. The
 * CLAUDE switch is never turned on by this probe for the same reason.
 *
 * ## Safety
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - The one Electron goes through build/electron-run.mjs, which ends the whole
 *    tree it started in a finally block whatever happened.
 *  - There is no pkill and no kill-server anywhere in this file.
 *  - Nothing under the person's home is opened, read or written.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p181-usage \
 *     'node build/probe-p181-usage-switch.mjs'
 *
 * ## Environment it reads
 *
 *   P181_CYCLES     how many off-on-off cycles. Default 3.
 *   P181_DEADLINE_MS how long a flip may take to show. Default 8000.
 *   P181_OUT_DIR    where the report and the photograph go. Default out/p181.
 *
 * Exit 0 when every flip was answered. 1 when one was not. 2 when it refuses.
 */

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p181]';
const t0 = Date.now();
const say = (line) => {
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
};
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of my ' +
      "own: node build/harness-socket.mjs gmux-p181-usage 'node " +
      "build/probe-p181-usage-switch.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const cycles = Number(process.env['P181_CYCLES'] ?? '3') || 3;
const deadlineMs = Number(process.env['P181_DEADLINE_MS'] ?? '8000') || 8000;
const outDir = resolve(repoRoot, (process.env['P181_OUT_DIR'] ?? '').trim() || 'out/p181');
mkdirSync(outDir, { recursive: true });

const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, `gmux-p181-usage-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p181-project'), { recursive: true });
// An EMPTY codex home. There is no auth.json in it and this probe never writes
// one, so the credential read answers `missing` and no request is made.
mkdirSync(join(rawRoot, 'codex-home'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p181-project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# Phase 181\n', 'utf8');

// ---------------------------------------------------------------------------
// A minimal DevTools protocol client, the same shape the other CDP probes in
// this directory carry, copied rather than shared for the reason p150 states.
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
          for (let i = 0; i < payload.length; i += 1) masked[i] = payload[i] ^ mask[i & 3];
          sock.write(Buffer.concat([Buffer.from([0x8a, 0x80 | payload.length]), mask, masked]));
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
        sock.write(wsClientFrame(JSON.stringify({ id, method, params: params ?? {} })));
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpForProfile(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const port = Number(
        readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()
      );
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find((t) => t.type === 'page' && /index\.html/.test(t.url ?? ''));
        if (page !== undefined && page.webSocketDebuggerUrl) {
          const ws = await wsConnect(page.webSocketDebuggerUrl);
          say(`attached to the main window renderer over CDP (port ${port})`);
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

/** What the sessions pane is drawing right now, read out of the live DOM. */
const READ = `(() => {
  const meters = Array.from(document.querySelectorAll('[data-slot="usage-meter"]'));
  const rows = Array.from(document.querySelectorAll('.usage-row, .usage-mini-row'));
  const text = meters.map((el) => (el.textContent || '').replace(/\\s+/g, ' ').trim()).join(' | ');
  return {
    meters: meters.length,
    rows: rows.length,
    bars: document.querySelectorAll('.usage-bar').length,
    text,
    hasPercent: /\\d+%/.test(text)
  };
})()`;

/** Flip the switches through the channel the Settings page itself uses. */
const setSwitches = (claude, codex) =>
  `window.gmux.settingsSet({ usage: { claude: ${claude}, codex: ${codex} } }).then((s) => s.usage)`;

async function waitFor(cdp, predicate, ms) {
  const started = Date.now();
  for (;;) {
    const seen = await cdpEval(cdp, READ);
    if (predicate(seen)) return { ok: true, ms: Date.now() - started, seen };
    if (Date.now() - started > ms) return { ok: false, ms: Date.now() - started, seen };
    await sleep(200);
  }
}

const report = { cycles: [], failures: [] };
const fail = (why) => {
  report.failures.push(why);
  say(`FAIL ${why}`);
};

const code = await withElectron(
  {
    label: 'p181 usage switch',
    userDataDir: profile,
    cwd: repoRoot,
    args: ['--remote-debugging-port=0'],
    env: {
      ...process.env,
      GMUX_UPDATE_REHEARSAL: '1',
      // Empty on purpose. See the header: no credential is read by this run.
      CODEX_HOME: join(root, 'codex-home')
    },
    graceMs: 15_000,
    tmuxSocket: socket
  },
  async (handle) => {
    say(`launched the dev app, pid ${String(handle.pid)}`);
    const cdp = await cdpForProfile(profile, 90_000);
    for (let waited = 0; waited < 60_000; waited += 500) {
      const ready = await cdpEval(cdp, "typeof window.__gmuxShotDrive === 'function'");
      if (ready === true) break;
      await sleep(500);
    }
    await cdp.call('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await cdpEval(
      cdp,
      `window.__gmuxShotDrive(${JSON.stringify({
        projectPath: project,
        orientation: 'right',
        fakeTabs: true
      })}).then(() => true)`,
      true
    );
    await sleep(2500);

    // The shipped default, restated so the run starts from a known face.
    await cdpEval(cdp, setSwitches(false, false), true);
    await sleep(1000);
    report.atRest = await cdpEval(cdp, READ);
    say(`both off: ${report.atRest.meters} meters, ${report.atRest.rows} rows`);
    if (report.atRest.meters !== 0 || report.atRest.rows !== 0) {
      fail('a meter was drawn while both switches were off');
    }

    for (let i = 1; i <= cycles; i += 1) {
      const cycle = { n: i };
      await cdpEval(cdp, setSwitches(false, true), true);
      const on = await waitFor(cdp, (s) => s.rows > 0, deadlineMs);
      cycle.onMs = on.ms;
      cycle.onText = on.seen.text;
      cycle.onRows = on.seen.rows;
      if (!on.ok) fail(`cycle ${i}: the meter did not appear within ${deadlineMs} ms`);
      say(`cycle ${i} ON after ${on.ms} ms: ${on.seen.rows} rows, "${on.seen.text}"`);

      if (i === 1) {
        try {
          const png = (await cdp.call('Page.captureScreenshot', { format: 'png' })).result?.data;
          if (typeof png === 'string' && png.length > 0) {
            const path = join(outDir, 'p181-switch-on.png');
            writeFileSync(path, Buffer.from(png, 'base64'));
            say(`photograph ${path}`);
          }
        } catch {
          // The readings are the evidence.
        }
      }

      await cdpEval(cdp, setSwitches(false, false), true);
      const off = await waitFor(cdp, (s) => s.rows === 0 && s.meters === 0, deadlineMs);
      cycle.offMs = off.ms;
      cycle.offText = off.seen.text;
      if (!off.ok) fail(`cycle ${i}: the meter was still drawn ${off.ms} ms after the switch went off`);
      if (off.seen.hasPercent) fail(`cycle ${i}: a percentage survived the switch going off`);
      say(`cycle ${i} OFF after ${off.ms} ms: ${off.seen.rows} rows`);
      report.cycles.push(cycle);
    }

    const finalState = await cdpEval(cdp, 'window.gmux.settingsGet().then((s) => s.usage)', true);
    report.settingsAtEnd = finalState;
    if (finalState?.claude !== false) fail('the Claude switch is not off at the end');
    cdp.close();
    return report.failures.length === 0 ? 0 : 1;
  }
);

writeFileSync(join(outDir, 'p181-usage-switch.json'), JSON.stringify(report, null, 2));
rmSync(rawRoot, { recursive: true, force: true });
say(
  report.failures.length === 0
    ? `every flip was answered, over ${cycles} cycles`
    : `${report.failures.length} failure(s): ${report.failures.join('; ')}`
);
process.exit(code);
