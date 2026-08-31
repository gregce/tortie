#!/usr/bin/env node
/**
 * probe-p1812-bar-and-card.mjs. Does the bar draw the number a person reads,
 * and does the card sit on top of the tabs?
 *
 * ## Why this exists
 *
 * Phase 181.2 fixed two things the operator reported, and its verification
 * found that NEITHER had an executable guard at the level it broke. Change
 * `.usage-card`'s `z-index` back to a bare 60 and typecheck, the build, every
 * unit test, smoke:t1 and every conformance gate stay green while his
 * photograph comes back. Let the drawn bar stop agreeing with the drawn line
 * and the same thing is true, because the store's unit test asserts the value
 * the component believes and nothing asserts the width the browser painted.
 *
 * The same class of defect had already caught Phases 175, 181, 174.1 and
 * 181.1. This is that reading made runnable.
 *
 * ## What it measures, in ONE app run
 *
 *  1. THE BAR AGAINST THE LINE, re-derived from pixels. For each of the three
 *     window choices, the filled width is divided by the track width and
 *     compared to the number read out of the TEXT beside it, never to the
 *     number the component believes. A two window provider and a one window
 *     provider, at the top orientation and the docked one.
 *  2. THE FALLBACK a one window provider gets. Its bar draws the only number
 *     its vendor named at all three choices, and never goes blank and never
 *     draws a zero nobody served.
 *  3. THE CARD AGAINST THE TAB STRIP. With sessions organized on top, the
 *     card's box and the titlebar's box must not overlap, and the card must
 *     stay inside both window edges.
 *  4. THE STACKING, made able to fail. In a window too short to place the card
 *     anywhere clear, the placement's last answer is the clamp, so the card
 *     DOES overlap the strip, and the only thing keeping it visible is that it
 *     paints above it. That case asserts the computed z-index, so a revert to
 *     a bare 60 turns this probe red.
 *  5. THE WHOLE JOURNEY. The choice is changed while the card is OPEN and the
 *     meter is drawn, through the same settings channel the Settings page
 *     uses, and the DRAWN width has to move without a reload and without the
 *     card closing.
 *
 * ## The measurement trap this probe is built around
 *
 * `.usage-bar-fill` carries `transition: width 160ms`. Chromium throttles the
 * animation clock of an occluded or unfocused window, so wall time buys no
 * animation frames and a reading taken after a generous sleep can be a
 * photograph of the OLD width while the inline style already holds the new
 * one. The verification of 2026-08-31 hit exactly that and reported a false
 * alarm before correcting it. So this run disables occlusion and renderer
 * backgrounding, and every reading is taken after two forced frames and
 * repeated until two agree.
 *
 * ## NO CREDENTIAL IS READ AND NO VENDOR IS ASKED ANYTHING
 *
 * Both usage switches stay OFF for the whole run, so main opens no keychain
 * item, opens no credentials file and makes no request. Every number on the
 * face is invented by this file and staged through the renderer drive. It is
 * the SHAPE of the operator's screenshot and none of its values, and the plan
 * word it draws is the word `probe`. Nothing about a real account is read,
 * drawn, printed or written to the report.
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
 *   npm run probe:p1812                  the whole run
 *   node build/probe-p1812-bar-and-card.mjs --self-test    the graders alone,
 *                                        which launches nothing at all
 *
 * ## Environment it reads
 *
 *   P1812_TOLERANCE  points of disagreement allowed. Default 1.5.
 *   P1812_DEADLINE_MS how long a flip may take to reach the paint. Default 8000.
 *   P1812_OUT_DIR    where the report goes. Default out/p1812.
 *
 * Exit 0 when every reading agrees. 1 when one does not. 2 when it refuses.
 */

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p1812]';
const t0 = Date.now();
const say = (line) => {
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${line}`);
};

// ---------------------------------------------------------------------------
// THE GRADERS. Pure, and proved on fixtures by --self-test below, because a
// check that cannot fail proves nothing. The parent commit's own readings are
// two of those fixtures and both of them must come back red.
// ---------------------------------------------------------------------------

/** The number in `7% 5h · 41% wk` for one window, or null when unnamed. */
export function percentFromLine(line, suffix) {
  const m = new RegExp(`(\\d+(?:\\.\\d+)?)%\\s*${suffix}(?![a-z])`).exec(line ?? '');
  return m === null ? null : Number(m[1]);
}

/**
 * What the bar SHOULD be filled to, read off the text a person reads.
 *
 * This is deliberately a second implementation of `barPercent`, written from
 * the drawn line rather than from the snapshot, so a change to one of them
 * shows up as a disagreement rather than as two files agreeing on a defect.
 */
export function expectedFill(line, choice) {
  const five = percentFromLine(line, '5h');
  const week = percentFromLine(line, 'wk');
  if (choice === 'five-hour') return five ?? week;
  if (choice === 'seven-day') return week ?? five;
  const both = [five, week].filter((v) => v !== null);
  return both.length === 0 ? null : Math.max(...both);
}

/** One row's verdict: does the paint agree with the words beside it? */
export function gradeBar(bar, choice, tolerance) {
  const expected = expectedFill(bar.line, choice);
  if (expected === null) {
    return { ok: true, why: 'the vendor named no window, so no bar is owed' };
  }
  if (bar.trackWidth === null || bar.fillWidth === null || bar.trackWidth <= 0) {
    return {
      ok: false,
      expected,
      drawn: null,
      why: `the line reads ${String(expected)}% and no bar was drawn at all`
    };
  }
  const drawn = (bar.fillWidth / bar.trackWidth) * 100;
  const delta = Math.abs(drawn - expected);
  return {
    ok: delta <= tolerance,
    expected,
    drawn: Math.round(drawn * 100) / 100,
    delta: Math.round(delta * 100) / 100,
    why:
      delta <= tolerance
        ? 'the paint agrees with the line'
        : `the line leads with ${String(expected)}% and the bar is filled to ` +
          `${String(Math.round(drawn * 100) / 100)}%`
  };
}

/** The area two boxes share, in square pixels. */
export function overlapArea(a, b) {
  if (a === null || b === null) return 0;
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w <= 0 || h <= 0 ? 0 : Math.round(w * h);
}

/**
 * The card's verdict. Two shapes, and the second is the one that can fail on a
 * z-index.
 *
 *   clear   the card must not touch the strip at all, and must stay inside
 *           both window edges.
 *   over    the window is too short to place it clear, so it DOES touch the
 *           strip, and the only thing keeping it readable is that it paints
 *           above it. That is where the computed z-index is asserted.
 */
export function gradeCard(reading, shape, margin = 8) {
  const fails = [];
  if (!reading.cardOpen || reading.card === null) {
    return { ok: false, overlap: null, fails: ['the card did not open'] };
  }
  const overlap = overlapArea(reading.card, reading.titlebar);
  if (reading.card.top < margin - 0.5) {
    fails.push(`the card's top is ${String(Math.round(reading.card.top))}, above the ${String(margin)}px margin`);
  }
  if (shape === 'clear') {
    if (overlap > 0) fails.push(`the card covers ${String(overlap)} px² of the tab strip`);
    if (reading.card.bottom > reading.viewportHeight - margin + 0.5) {
      fails.push(
        `the card's foot is ${String(Math.round(reading.card.bottom))} in a ` +
          `${String(reading.viewportHeight)}px window`
      );
    }
  } else {
    if (overlap <= 0) {
      fails.push('this case was meant to force the clamp and the card did not reach the strip');
    }
    const card = Number(reading.cardZ);
    const strip = Number(reading.titlebarZ);
    if (!Number.isFinite(card) || !Number.isFinite(strip)) {
      fails.push(`a stacking order that is not a number: card ${String(reading.cardZ)}, strip ${String(reading.titlebarZ)}`);
    } else if (card <= strip) {
      fails.push(`the card is at z ${String(card)} and the tab strip is at z ${String(strip)}, so the strip paints over it`);
    }
  }
  return { ok: fails.length === 0, overlap, cardZ: reading.cardZ, titlebarZ: reading.titlebarZ, fails };
}

// ---------------------------------------------------------------------------
// --self-test. Twelve fixtures, six of which MUST come back red, two of them
// being the parent commit's own measured readings. It launches nothing.
// ---------------------------------------------------------------------------

if (process.argv.includes('--self-test')) {
  const box = (top, bottom) => ({ top, bottom, left: 1100, right: 1340 });
  const cases = [
    // The operator's own case, both sides of the fix. His numbers, as measured
    // on 2026-08-31: a line leading with 3% 5h beside a bar filled to 63.99%.
    ['HEAD, five hour', () => gradeBar({ line: '3% 5h · 64% wk', trackWidth: 34, fillWidth: 1.02 }, 'five-hour', 1.5).ok, true],
    ['PARENT, five hour, the defect', () => gradeBar({ line: '3% 5h · 64% wk', trackWidth: 34, fillWidth: 21.76 }, 'five-hour', 1.5).ok, false],
    ['seven day', () => gradeBar({ line: '3% 5h · 64% wk', trackWidth: 34, fillWidth: 21.76 }, 'seven-day', 1.5).ok, true],
    ['seven day, the throttled reading', () => gradeBar({ line: '3% 5h · 64% wk', trackWidth: 34, fillWidth: 1.02 }, 'seven-day', 1.5).ok, false],
    ['most used', () => gradeBar({ line: '3% 5h · 64% wk', trackWidth: 34, fillWidth: 21.76 }, 'most-used', 1.5).ok, true],
    ['one window vendor, the fallback', () => gradeBar({ line: '2% wk', trackWidth: 34, fillWidth: 0.68 }, 'five-hour', 1.5).ok, true],
    ['one window vendor, a zero nobody served', () => gradeBar({ line: '2% wk', trackWidth: 34, fillWidth: 0 }, 'five-hour', 1.5).ok, false],
    ['one window vendor, a bar that went blank', () => gradeBar({ line: '2% wk', trackWidth: null, fillWidth: null }, 'five-hour', 1.5).ok, false],
    // The card. The parent's numbers are its own: card 8..134 over a 0..38
    // strip at z 60, being 4889 px² of the operator's photograph.
    ['PARENT card, behind the tabs', () => gradeCard({ cardOpen: true, card: box(8, 134), titlebar: { top: 0, bottom: 38, left: 0, right: 1440 }, cardZ: '60', titlebarZ: '100', viewportHeight: 900 }, 'over').ok, false],
    ['HEAD card, clear of the tabs', () => gradeCard({ cardOpen: true, card: box(72, 230), titlebar: { top: 0, bottom: 38, left: 0, right: 1440 }, cardZ: '800', titlebarZ: '100', viewportHeight: 900 }, 'clear').ok, true],
    ['HEAD card, clamped and on top', () => gradeCard({ cardOpen: true, card: box(8, 166), titlebar: { top: 0, bottom: 38, left: 0, right: 1440 }, cardZ: '800', titlebarZ: '100', viewportHeight: 200 }, 'over').ok, true],
    ['a card hanging off the foot', () => gradeCard({ cardOpen: true, card: box(760, 898), titlebar: { top: 0, bottom: 38, left: 0, right: 1440 }, cardZ: '800', titlebarZ: '100', viewportHeight: 900 }, 'clear').ok, false]
  ];
  let bad = 0;
  for (const [name, run, want] of cases) {
    const got = run();
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`${TAG} ${ok ? 'PASS' : 'FAIL'} ${name}: graded ${got ? 'green' : 'red'}, wanted ${want ? 'green' : 'red'}`);
  }
  console.log(`${TAG} ${String(cases.length - bad)}/${String(cases.length)} fixtures graded as intended`);
  process.exit(bad === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of my ' +
      "own: node build/harness-socket.mjs gmux-p1812-usage 'node " +
      "build/probe-p1812-bar-and-card.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const tolerance = Number(process.env['P1812_TOLERANCE'] ?? '1.5') || 1.5;
const deadlineMs = Number(process.env['P1812_DEADLINE_MS'] ?? '8000') || 8000;
const outDir = resolve(repoRoot, (process.env['P1812_OUT_DIR'] ?? '').trim() || 'out/p1812');
mkdirSync(outDir, { recursive: true });

const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, `gmux-p1812-usage-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p1812-project'), { recursive: true });
// EMPTY on purpose, and never written to. Both switches stay off for the whole
// run, so nothing here is opened either way; it is the second guard.
mkdirSync(join(rawRoot, 'codex-home'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p1812-project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# Phase 181.2\n', 'utf8');

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
  const thrown = reply.result?.result?.subtype === 'error' ? reply.result.result : undefined;
  if (reply.result?.exceptionDetails !== undefined) {
    throw new Error(JSON.stringify(reply.result.exceptionDetails));
  }
  if (thrown !== undefined) throw new Error(JSON.stringify(thrown));
  return reply.result?.result?.value ?? null;
}

// ---------------------------------------------------------------------------
// What is staged. INVENTED numbers, the shape of the operator's screenshot and
// none of its values, and a plan word that is the word `probe`.
// ---------------------------------------------------------------------------

const staged = (now) => [
  {
    provider: 'claude',
    state: 'ok',
    fiveHour: { percent: 7, resetsAt: now + 3 * 3600_000 },
    sevenDay: { percent: 41, resetsAt: now + 4 * 86_400_000 },
    scoped: { label: 'Probe model', percent: 41, resetsAt: now + 4 * 86_400_000 },
    plan: 'probe',
    readAt: now,
    retryAfter: null
  },
  {
    // The one window vendor, which is the fallback case. It also names no
    // plan, so its card block must carry no plan line rather than an empty one.
    provider: 'codex',
    state: 'ok',
    fiveHour: null,
    sevenDay: { percent: 23, resetsAt: now + 5 * 86_400_000 },
    scoped: null,
    plan: null,
    readAt: now,
    retryAfter: null
  }
];

const CHOICES = ['five-hour', 'seven-day', 'most-used'];

/** The full usage object, because a settings write replaces it whole. */
const setBar = (choice) =>
  `window.gmux.settingsSet({ usage: { claude: false, codex: false, bar: ${JSON.stringify(choice)} } })` +
  '.then((s) => s.usage)';

const READ = 'window.__gmuxP1812.read()';

/** Read until two consecutive readings agree, so no transition is caught mid flight. */
async function settled(cdp, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    const now = await cdpEval(cdp, READ, true);
    const key = JSON.stringify(now.bars.map((b) => [b.line, b.fillWidth]));
    if (last !== null && last === key) return now;
    last = key;
    if (Date.now() - started > ms) return now;
    await sleep(120);
  }
}

const report = { tolerance, rows: [], cards: [], journey: null, failures: [] };
const fail = (why) => {
  report.failures.push(why);
  say(`FAIL ${why}`);
};

const code = await withElectron(
  {
    label: 'p1812 bar and card',
    userDataDir: profile,
    cwd: repoRoot,
    args: [
      '--remote-debugging-port=0',
      // THE MEASUREMENT TRAP. Without these three the fill's 160ms width
      // transition never gets an animation frame in a window that is not in
      // front, so a reading taken after any amount of wall time is a
      // photograph of the width before the change.
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'
    ],
    env: {
      ...process.env,
      GMUX_UPDATE_REHEARSAL: '1',
      GMUX_PROBES: '1',
      CODEX_HOME: join(root, 'codex-home')
    },
    graceMs: 15_000,
    tmuxSocket: socket
  },
  async (handle) => {
    say(`launched the dev app, pid ${String(handle.pid)}`);
    const cdp = await cdpForProfile(profile, 90_000);
    for (let waited = 0; waited < 60_000; waited += 500) {
      const ready = await cdpEval(
        cdp,
        "typeof window.__gmuxShotDrive === 'function' && typeof window.__gmuxP1812 === 'object'"
      );
      if (ready === true) break;
      await sleep(500);
    }
    if ((await cdpEval(cdp, "typeof window.__gmuxP1812")) !== 'object') {
      throw new Error('the Phase 181.2 drive never armed, so the probe chunk did not load');
    }

    for (const orientation of ['top', 'right']) {
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
          orientation,
          fakeTabs: true
        })}).then(() => true)`,
        true
      );
      await sleep(2000);
      await cdpEval(cdp, `window.__gmuxP1812.stage(${JSON.stringify(staged(Date.now()))})`, true);
      await sleep(400);

      // 1 and 2. The bar against the line, at every choice.
      for (const choice of CHOICES) {
        await cdpEval(cdp, setBar(choice), true);
        const seen = await settled(cdp, deadlineMs);
        if (seen.bars.length === 0) fail(`${orientation}/${choice}: no meter row was drawn at all`);
        for (const bar of seen.bars) {
          const verdict = gradeBar(bar, choice, tolerance);
          report.rows.push({ orientation, choice, provider: bar.provider, line: bar.line, ...verdict });
          say(
            `${orientation} ${choice} ${bar.provider}: "${bar.line}" -> ` +
              `${String(verdict.drawn)}% drawn, ${String(verdict.expected)}% owed`
          );
          if (!verdict.ok) fail(`${orientation}/${choice}/${bar.provider}: ${verdict.why}`);
          // The one window vendor must never go blank and never draw a zero
          // no vendor served.
          if (/^Codex/.test(bar.provider) && (bar.fillWidth === null || bar.fillWidth <= 0)) {
            fail(`${orientation}/${choice}: the one window vendor's bar drew nothing`);
          }
        }
      }

      // 3. The card, clear of the tab strip, at this orientation.
      await cdpEval(cdp, setBar('five-hour'), true);
      const opened = await cdpEval(cdp, 'window.__gmuxP1812.hover()', true);
      if (opened !== true) fail(`${orientation}: the hover card did not open`);
      const withCard = await settled(cdp, deadlineMs);
      const cardVerdict = gradeCard(withCard, 'clear');
      report.cards.push({ orientation, shape: 'clear', card: withCard.card, titlebar: withCard.titlebar, ...cardVerdict });
      say(
        `${orientation} card: ${JSON.stringify(withCard.card)} against strip ` +
          `${JSON.stringify(withCard.titlebar)}, overlap ${String(cardVerdict.overlap)} px², ` +
          `z ${String(withCard.cardZ)} over ${String(withCard.titlebarZ)}`
      );
      for (const why of cardVerdict.fails) fail(`${orientation}: ${why}`);

      // The account line, which is drawn from the staged plan word and never
      // from a login. The word is `probe`, so nothing about a real account can
      // reach this report.
      if (orientation === 'top') {
        report.cardText = withCard.cardText;
        if (!withCard.cardText.includes('Probe plan')) {
          fail(`the card drew no plan line for the vendor that named one: ${JSON.stringify(withCard.cardText)}`);
        }
        if (withCard.cardText.filter((l) => /plan$/i.test(l)).length !== 1) {
          fail('the vendor that named no plan was given a line anyway');
        }
      }

      // 5. THE WHOLE JOURNEY, with the card still open.
      if (orientation === 'top') {
        const before = withCard.bars.map((b) => b.fillWidth);
        const startedAt = Date.now();
        await cdpEval(cdp, setBar('seven-day'), true);
        let moved = null;
        for (;;) {
          const now = await cdpEval(cdp, READ, true);
          const after = now.bars.map((b) => b.fillWidth);
          if (now.bars.length > 0 && JSON.stringify(after) !== JSON.stringify(before)) {
            moved = { ms: Date.now() - startedAt, before, after, cardOpen: now.cardOpen };
            break;
          }
          if (Date.now() - startedAt > deadlineMs) {
            moved = { ms: Date.now() - startedAt, before, after, cardOpen: now.cardOpen, late: true };
            break;
          }
          await sleep(80);
        }
        report.journey = moved;
        say(
          `journey: the paint moved ${JSON.stringify(moved.before)} -> ` +
            `${JSON.stringify(moved.after)} in ${String(moved.ms)} ms, card open ${String(moved.cardOpen)}`
        );
        if (moved.late === true) fail(`the drawn bar did not move within ${String(deadlineMs)} ms of the choice changing`);
        if (moved.cardOpen !== true) fail('the card closed when the choice changed, so it was remounted rather than followed');
        const settledJourney = await settled(cdp, deadlineMs);
        for (const bar of settledJourney.bars) {
          const verdict = gradeBar(bar, 'seven-day', tolerance);
          if (!verdict.ok) fail(`journey/${bar.provider}: ${verdict.why}`);
        }

        // 4. THE STACKING, in a window too short to place the card clear. This
        // is the case that can fail on a z-index, and it is why a revert of
        // `.usage-card` to a bare 60 turns this probe red.
        await cdp.call('Emulation.setDeviceMetricsOverride', {
          width: 1440,
          height: 200,
          deviceScaleFactor: 1,
          mobile: false
        });
        await sleep(600);
        await cdpEval(cdp, 'window.__gmuxP1812.leave()', true);
        const reopened = await cdpEval(cdp, 'window.__gmuxP1812.hover()', true);
        if (reopened !== true) fail('short window: the hover card did not open');
        const shortSeen = await settled(cdp, deadlineMs);
        const shortVerdict = gradeCard(shortSeen, 'over');
        report.cards.push({
          orientation: 'top, 200px tall',
          shape: 'over',
          card: shortSeen.card,
          titlebar: shortSeen.titlebar,
          ...shortVerdict
        });
        say(
          `short window: card ${JSON.stringify(shortSeen.card)}, overlap ` +
            `${String(shortVerdict.overlap)} px², z ${String(shortSeen.cardZ)} over ` +
            `${String(shortSeen.titlebarZ)}`
        );
        for (const why of shortVerdict.fails) fail(`short window: ${why}`);
      }

      await cdpEval(cdp, 'window.__gmuxP1812.leave()', true);
    }

    await cdpEval(cdp, 'window.__gmuxP1812.unstage()', true);
    cdp.close();
    return report.failures.length === 0 ? 0 : 1;
  }
);

writeFileSync(join(outDir, 'p1812-bar-and-card.json'), JSON.stringify(report, null, 2));
rmSync(rawRoot, { recursive: true, force: true });
say(
  report.failures.length === 0
    ? `every drawn bar agreed with its line and the card cleared the tabs, over ${String(report.rows.length)} rows`
    : `${String(report.failures.length)} failure(s): ${report.failures.join('; ')}`
);
process.exit(code);
