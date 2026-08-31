#!/usr/bin/env node
/**
 * probe-p1811-strip-fit.mjs. WHICH SIDE YIELDS IN THE TOP STRIP?
 *
 * ## Why this exists
 *
 * The operator saw the full compact meter beside five sessions, said he likes
 * how that looks, and ruled that the SESSIONS should start scrolling earlier
 * rather than the meter shrinking. That is a claim about widths, so it is
 * measured rather than argued: this drives the real strip at a ladder of
 * window widths and reads the drawn rectangles back out of the live DOM.
 *
 * ## What it measures, in ONE app run
 *
 * Six tabs on the top strip, then a ladder of widths from wide to narrow. At
 * every width it reads:
 *
 *   - the density the strip chose and the reservation it made, in pixels,
 *   - the meter's rectangle and the tab list's rectangle, and whether they
 *     overlap by so much as a pixel,
 *   - whether any provider row overlaps another provider row,
 *   - HOW FAR THE PAINTED TEXT LIES OUTSIDE THE BOXES THAT SHOULD HOLD IT,
 *     which is the shape the operator photographed and the one reading below
 *     that is able to fail on the build that has his defect,
 *   - whether the meter sits centred in the 36px band and carries none of the
 *     collapsed rail's own placement,
 *   - how many tabs are drawn inside the list's viewport, and whether the
 *     overflow chevron is up.
 *
 * ## Why the text is measured with a Range, added in the fix round
 *
 * The first cut of this file asserted three things about overlap: box against
 * box, the meter's box against the list's box, and `scrollWidth` against
 * `clientWidth`. Run unchanged against the parent commit, the build that HAS
 * the operator's defect, all three read 0 at all seven widths while a separate
 * instrument measured 49.4px of that row's text lying outside its box at
 * 420px. His defect is VISIBLE overflow and not scroll overflow: a nowrap row
 * squeezed below its natural width paints its glyphs past its own edge, and
 * `scrollWidth` never grows because the box itself is what shrank, while two
 * boxes that never move never overlap. So the text is measured where it is
 * actually painted, with a Range over every text node, against every ancestor
 * up to the cell. An assertion that has never been shown able to fail is not a
 * gate, so `--parent` below is how it is shown.
 *
 * ## The second provider, live rather than cloned
 *
 * The case he photographed has TWO providers, and the first cut only ever
 * measured that on an offscreen clone which nothing asserted on. Turning the
 * Claude switch on would open the keychain, which this probe will not do, so
 * instead a copy of the row the strip really drew is appended into the LIVE
 * flex row, inside the real band under the real stylesheet, and every reading
 * above is taken again with it there. That is the layout he saw.
 *
 * The reading that answers his ruling is the pair of them: as the window
 * narrows the VISIBLE TAB COUNT falls and the chevron comes up while the
 * density stays `compact` and the reservation does not move.
 *
 * It also measures what a SECOND provider would reserve, by cloning the row
 * the strip drew into an offscreen copy of the real control and measuring
 * that. It is the same markup under the same stylesheet, so it says how the
 * reservation moves with the number of providers configured without inventing
 * a snapshot or reading a credential.
 *
 * ## What it deliberately never touches
 *
 * No credential and no network. `CODEX_HOME` points at an empty scratch
 * directory, so the Codex read answers `missing` and the row draws in its
 * signed out state, which reserves width exactly the same way. The CLAUDE
 * switch is never turned on, because the Claude read opens the keychain.
 *
 * ## Safety
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - The one Electron goes through build/electron-run.mjs, which ends the
 *    whole tree it started in a finally block whatever happened.
 *  - There is no pkill and no kill-server anywhere in this file.
 *  - Nothing under the person's home is opened, read or written.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p1811-fit \
 *     'node build/probe-p1811-strip-fit.mjs'
 *
 * ## Environment it reads
 *
 *   P1811_WIDTHS   the ladder, comma separated. Default the seven below.
 *   P1811_OUT_DIR  where the report and the photographs go. Default out/p1811.
 *   P1811_EXPECT   `fail` inverts the exit code, which is how this file is
 *                  run against a parent build to show that its assertions can
 *                  fail. Exit 0 then means it DID find the defect.
 *
 * Exit 0 when nothing spilled and his ordering held. 1 when it did not.
 * 2 when it refuses.
 */

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p1811]';
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
      "own: node build/harness-socket.mjs gmux-p1811-fit 'node " +
      "build/probe-p1811-strip-fit.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const widths = ((process.env['P1811_WIDTHS'] ?? '').trim() === ''
  ? [1440, 1100, 900, 760, 620, 520, 420]
  : process.env['P1811_WIDTHS'].split(',').map((n) => Number(n.trim()))
).filter((n) => Number.isFinite(n) && n > 200);
const outDir = resolve(repoRoot, (process.env['P1811_OUT_DIR'] ?? '').trim() || 'out/p1811');
mkdirSync(outDir, { recursive: true });

const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, `gmux-p1811-fit-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p1811-project'), { recursive: true });
// An EMPTY codex home. There is no auth.json in it and this probe never writes
// one, so the credential read answers `missing` and no request is made.
mkdirSync(join(rawRoot, 'codex-home'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p1811-project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# Phase 181.1\n', 'utf8');

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

/**
 * FORCE A FRAME, DO NOT JUST SLEEP.
 *
 * This cost the fix round a whole run. Electron throttles rendering in a
 * window that is not in front, and this probe's window never is: measured on
 * 2026-08-31, the whole seven width ladder ran with the strip's own layout
 * frozen at the first reading, the density stayed `compact` at 420px where the
 * tab list had been squeezed to nothing, the overflow chevron never came up at
 * all, and every number in the report was a picture of a window that had
 * stopped rendering rather than of the product. A `ResizeObserver` needs a
 * rendering lifecycle update to deliver, and a throttled renderer runs none.
 *
 * A screenshot request makes the compositor produce a frame whatever the
 * window's state, which is why the ONE reading that came out right in that run
 * was the one taken straight after the photograph. So every reading here is
 * taken after forcing frames, and taken twice: a width is read only once two
 * consecutive readings agree, so a strip still catching up is waited for
 * rather than photographed mid-flight.
 *
 * This is not papering over the operator's case. A person resizing a window is
 * looking at it, so the product's real behaviour is the one measured with the
 * window rendering, and that is what this reproduces.
 */
async function forceFrame(cdp) {
  await cdp.call('Page.captureScreenshot', { format: 'png' }).catch(() => undefined);
}

async function settled(cdp, expression, tries = 10) {
  let previous = null;
  let seen = null;
  for (let i = 0; i < tries; i += 1) {
    await forceFrame(cdp);
    seen = await cdpEval(cdp, expression);
    const key = JSON.stringify(seen);
    if (previous === key) return seen;
    previous = key;
    await sleep(150);
  }
  return seen;
}

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

/**
 * The whole strip, in rectangles, read out of the live DOM.
 *
 * Nothing here asks the component what it believes. Every number is a
 * `getBoundingClientRect`, and the overlap tests are arithmetic over those
 * rectangles rather than a class name or an attribute.
 */
const READ = `(() => {
  const r = (el) => {
    if (el === null) return null;
    const b = el.getBoundingClientRect();
    return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) };
  };
  const header = document.querySelector('[data-slot="session-strip"]');
  if (header === null) return { strip: false };
  const list = header.querySelector('.stab-list');
  const cell = header.querySelector('[data-slot="strip-usage"]');
  const meter = header.querySelector('[data-slot="usage-meter"]');
  const press = header.querySelector('.usage-press');
  const rows = Array.from(header.querySelectorAll('.usage-row, .usage-mini-row'));
  const rects = rows.map((el) => el.getBoundingClientRect());
  let rowOverlap = 0;
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const over = Math.min(rects[i].right, rects[j].right) - Math.max(rects[i].left, rects[j].left);
      if (over > rowOverlap) rowOverlap = over;
    }
  }

  // THE READING THAT CAN FAIL ON HIS DEFECT. Where the glyphs are actually
  // painted, taken with a Range over every text node, against every ancestor
  // box up to and including the cell the strip gave the meter. A nowrap row
  // squeezed below its natural width paints outside its own box without ever
  // growing scrollWidth and without two boxes ever overlapping, which is why
  // neither of those reads it. The screen-reader copy is skipped: it is a 1px
  // clipped box on purpose and every glyph in it lies outside by design.
  const spillOf = (root, limit) => {
    if (root === null) return 0;
    let worst = 0;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n !== null; n = walk.nextNode()) {
      const parent = n.parentElement;
      if (parent === null) continue;
      if ((n.nodeValue || '').trim() === '') continue;
      if (parent.closest('.usage-hidden') !== null) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const t = range.getBoundingClientRect();
      if (t.width === 0) continue;
      for (let el = parent; el !== null; el = el.parentElement) {
        const b = el.getBoundingClientRect();
        const out = Math.max(0, b.left - t.left) + Math.max(0, t.right - b.right);
        if (out > worst) worst = out;
        if (el === limit || el === root) break;
      }
    }
    return Math.round(worst * 10) / 10;
  };

  const listRect = list === null ? null : list.getBoundingClientRect();
  const cellRect = cell === null ? null : cell.getBoundingClientRect();
  const cellOverlap =
    listRect === null || cellRect === null
      ? 0
      : Math.round(Math.min(listRect.right, cellRect.right) - Math.max(listRect.left, cellRect.left));

  // A build without this phase has no cell at all, so the meter's own element
  // stands in as the box everything is measured against. A probe that cannot
  // read the parent cannot show that it would have failed on it.
  const bandRect = header.getBoundingClientRect();
  const meterRect = meter === null ? null : meter.getBoundingClientRect();
  const style = meter === null ? null : getComputedStyle(meter);
  const centred =
    meterRect === null
      ? null
      : Math.round(
          Math.abs((meterRect.top + meterRect.bottom) / 2 - (bandRect.top + bandRect.bottom) / 2) * 10
        ) / 10;
  const bandSpill =
    meterRect === null
      ? 0
      : Math.round(
          (Math.max(0, bandRect.top - meterRect.top) + Math.max(0, meterRect.bottom - bandRect.bottom)) * 10
        ) / 10;

  const tabs = Array.from(list === null ? [] : list.querySelectorAll('[data-surface-id]'));
  const left = list === null ? 0 : list.scrollLeft;
  const right = left + (list === null ? 0 : list.clientWidth);
  const visible = tabs.filter((el) => el.offsetLeft + el.offsetWidth > left + 8 && el.offsetLeft < right - 8);
  return {
    strip: true,
    width: window.innerWidth,
    density: cell === null ? 'absent' : cell.getAttribute('data-usage-density'),
    reserve: cell === null ? null : Number(cell.getAttribute('data-usage-reserve')),
    cell: r(cell),
    meter: r(meter),
    list: r(list),
    rows: rows.length,
    rowOverlap: Math.round(rowOverlap),
    cellOverlap: cellOverlap > 0 ? cellOverlap : 0,
    textSpill: spillOf(meter, cell ?? meter),
    bandSpill,
    centred,
    borderTop: style === null ? null : style.borderTopWidth,
    marginTop: style === null ? null : style.marginTop,
    contentOverflow: press === null ? 0 : Math.max(0, press.scrollWidth - press.clientWidth),
    listOverflow: list === null ? 0 : Math.max(0, list.scrollWidth - list.clientWidth),
    tabs: tabs.length,
    visibleTabs: visible.length,
    chevron: header.querySelector('.strip-overflow') !== null,
    text: (meter === null ? '' : meter.textContent || '').replace(/\\s+/g, ' ').trim()
  };
})()`;

/**
 * What a SECOND provider would reserve. The control the strip drew is cloned
 * offscreen, its one row is duplicated, and the copy is measured under the
 * same stylesheet. No product state is touched and the copy is removed again.
 */
const READ_TWO = `(() => {
  const press = document.querySelector('[data-slot="strip-usage"] .usage-press');
  if (press === null) return null;
  const one = Math.round(press.getBoundingClientRect().width);
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-4000px;top:0;display:flex;align-items:center';
  host.className = 'usage-meter usage-compact';
  const copy = press.cloneNode(true);
  const row = copy.querySelector('.usage-row');
  if (row !== null) copy.appendChild(row.cloneNode(true));
  host.appendChild(copy);
  document.body.appendChild(host);
  const two = Math.round(copy.getBoundingClientRect().width);
  host.remove();
  return { oneRow: one, twoRows: two };
})()`;

/**
 * A SECOND PROVIDER IN THE LIVE ROW. The row the strip really drew is copied
 * and appended to the real flex press, inside the real band under the real
 * stylesheet, so the copy is squeezed exactly as a second configured provider
 * would be. Turning the Claude switch on would open the keychain, which this
 * probe will not do; this needs no credential, no request and no snapshot.
 */
const INJECT = `(() => {
  const press = document.querySelector('[data-slot="strip-usage"] .usage-press')
    || document.querySelector('[data-slot="usage-meter"] .usage-press');
  if (press === null) return false;
  const row = press.querySelector('.usage-row, .usage-mini-row');
  if (row === null) return false;
  const copy = row.cloneNode(true);
  copy.setAttribute('data-p1811-injected', '1');
  press.appendChild(copy);
  return true;
})()`;

const UNINJECT = `(() => {
  for (const el of Array.from(document.querySelectorAll('[data-p1811-injected]'))) el.remove();
  return true;
})()`;

/** Flip the switches through the channel the settings group itself uses. */
const setSwitches = (claude, codex) =>
  `window.gmux.settingsSet({ usage: { claude: ${claude}, codex: ${codex} } }).then((s) => s.usage)`;

const report = { widths: [], failures: [] };
const fail = (why) => {
  report.failures.push(why);
  say(`FAIL ${why}`);
};

const shot = async (cdp, name) => {
  try {
    const png = (await cdp.call('Page.captureScreenshot', { format: 'png' })).result?.data;
    if (typeof png === 'string' && png.length > 0) {
      const path = join(outDir, name);
      writeFileSync(path, Buffer.from(png, 'base64'));
      say(`photograph ${path}`);
    }
  } catch {
    // The readings are the evidence.
  }
};

const code = await withElectron(
  {
    label: 'p1811 strip fit',
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
    // The window is never in front during a probe run, and a page Chromium
    // believes is unfocused behaves differently from the one a person is
    // resizing. See forceFrame above for what that cost.
    await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
    for (let waited = 0; waited < 60_000; waited += 500) {
      const ready = await cdpEval(cdp, "typeof window.__gmuxShotDrive === 'function'");
      if (ready === true) break;
      await sleep(500);
    }
    await cdp.call('Emulation.setDeviceMetricsOverride', {
      width: widths[0],
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    // Sessions ON TOP, which is the surface this phase is about, with six
    // tabs: four from the resume spectrum and two agent tabs.
    await cdpEval(
      cdp,
      `window.__gmuxShotDrive(${JSON.stringify({
        projectPath: project,
        orientation: 'top',
        fakeResume: true,
        fakeTabs: true
      })}).then(() => true)`,
      true
    );
    await sleep(2500);

    await cdpEval(cdp, setSwitches(false, false), true);
    await sleep(800);
    report.meterOff = await settled(cdp, READ);
    say(
      `meter off: ${String(report.meterOff.tabs)} tabs, ` +
        `${String(report.meterOff.visibleTabs)} visible, reserve ` +
        `${String(report.meterOff.reserve)}px`
    );

    await cdpEval(cdp, setSwitches(false, true), true);
    await sleep(1500);
    await forceFrame(cdp);
    report.twoRowDerivation = await cdpEval(cdp, READ_TWO);
    say(`one row reserves ${JSON.stringify(report.twoRowDerivation)}`);

    for (const width of widths) {
      await cdp.call('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
      });
      await sleep(400);
      const seen = await settled(cdp, READ);
      report.widths.push(seen);
      say(
        `${String(width)}px: density=${String(seen.density)} reserve=${String(seen.reserve)} ` +
          `tabs=${String(seen.visibleTabs)}/${String(seen.tabs)} chevron=${String(seen.chevron)} ` +
          `rowOverlap=${String(seen.rowOverlap)} cellOverlap=${String(seen.cellOverlap)} ` +
          `contentOverflow=${String(seen.contentOverflow)}`
      );
      if (seen.strip !== true) fail(`${width}px: no session strip was drawn`);
      if (seen.rowOverlap > 0) fail(`${width}px: two provider rows overlap by ${seen.rowOverlap}px`);
      if (seen.cellOverlap > 0) fail(`${width}px: the meter overlaps the tab list by ${seen.cellOverlap}px`);
      if (seen.textSpill > 0) {
        fail(`${width}px: the meter's painted text lies ${seen.textSpill}px outside its box`);
      }
      if (seen.contentOverflow > 0) {
        fail(`${width}px: the meter's content overflows its box by ${seen.contentOverflow}px`);
      }
      // The collapsed rail's own placement must not travel with the class into
      // the 36px band: a hairline of its own and a margin that bottom-aligns it
      // are marks belonging to nothing, and a form taller than the band is a
      // form the band cannot hold.
      if (seen.meter !== null && seen.meter.width > 0) {
        if (seen.bandSpill > 0) {
          fail(`${width}px: the meter stands ${seen.bandSpill}px outside the 36px band`);
        }
        if (seen.centred !== null && seen.centred > 1) {
          fail(`${width}px: the meter sits ${seen.centred}px off the band's centre line`);
        }
        if (seen.borderTop !== null && seen.borderTop !== '0px') {
          fail(`${width}px: the meter draws a ${seen.borderTop} border of its own in the band`);
        }
        if (seen.marginTop !== null && seen.marginTop !== '0px' && seen.marginTop !== 'auto') {
          fail(`${width}px: the meter carries margin-top ${seen.marginTop} in the band`);
        }
        if (seen.marginTop === 'auto') fail(`${width}px: the meter carries the rail's margin-top:auto`);
      }
      if (width === widths[0]) await shot(cdp, 'p1811-wide.png');
    }

    // HIS ORDERING, read off GEOMETRY rather than off an attribute this build
    // happens to write. A build without this phase carries no density and no
    // reservation at all, so an ordering check that consumed those could never
    // run on the build that HAS his defect, and a check that cannot run there
    // proves nothing. The measured box the meter drew is present in both, and
    // the readings are taken within ONE density so the sanctioned step down at
    // the floor is not read as the meter giving room up.
    const first = report.widths.find((w) => (w.meter?.width ?? 0) > 0);
    const band =
      first === undefined
        ? []
        : report.widths.filter((w) => w.density === first.density && (w.meter?.width ?? 0) > 0);
    if (band.length < 2) {
      fail('the ladder never drew the meter twice at one density, so the ordering was not tested');
    } else {
      const wide = band[0];
      const tight = band[band.length - 1];
      report.ordering = {
        wide: { width: wide.width, visibleTabs: wide.visibleTabs, drew: wide.meter.width },
        tight: { width: tight.width, visibleTabs: tight.visibleTabs, drew: tight.meter.width }
      };
      if (tight.visibleTabs >= wide.visibleTabs) {
        fail(
          `the tabs did not yield: ${String(wide.visibleTabs)} visible at ` +
            `${String(wide.width)}px and ${String(tight.visibleTabs)} at ${String(tight.width)}px`
        );
      }
      if (tight.meter.width !== wide.meter.width) {
        fail(
          `the meter gave room up: it drew ${String(wide.meter.width)}px at ` +
            `${String(wide.width)}px and ${String(tight.meter.width)}px at ${String(tight.width)}px`
        );
      }
      if (!tight.chevron) fail('the narrow reading drew no overflow chevron');
      await shot(cdp, 'p1811-tight.png');
    }

    // THE CASE HE PHOTOGRAPHED: TWO PROVIDERS. Same ladder, same readings, with
    // a copy of the drawn row appended into the live flex press. Only the
    // widths where the strip held one density are used, because a step down
    // remounts the meter and takes the copy with it.
    report.twoProvider = [];
    let heldTwo = 0;
    for (const seen of band) {
      await cdp.call('Emulation.setDeviceMetricsOverride', {
        width: seen.width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
      });
      await sleep(400);
      const before = await settled(cdp, READ);
      const injected = await cdpEval(cdp, INJECT);
      await sleep(300);
      const after = await settled(cdp, READ);
      report.twoProvider.push({ width: seen.width, injected, before, after });
      say(
        `${String(seen.width)}px, two rows: rows=${String(after.rows)} ` +
          `drew=${String(after.meter?.width)} textSpill=${String(after.textSpill)} ` +
          `rowOverlap=${String(after.rowOverlap)} cellOverlap=${String(after.cellOverlap)} ` +
          `tabs=${String(after.visibleTabs)}/${String(after.tabs)}`
      );
      if (injected === true && after.rows >= 2) {
        heldTwo += 1;
        if (after.textSpill > 0) {
          fail(
            `${String(seen.width)}px with two providers: the painted text lies ` +
              `${String(after.textSpill)}px outside its box`
          );
        }
        if (after.rowOverlap > 0) {
          fail(
            `${String(seen.width)}px with two providers: one provider's row sits ` +
              `${String(after.rowOverlap)}px inside the other's, which is his photograph`
          );
        }
        if (after.cellOverlap > 0) {
          fail(
            `${String(seen.width)}px with two providers: the meter overlaps the tab ` +
              `list by ${String(after.cellOverlap)}px`
          );
        }
        if (after.bandSpill > 0) {
          fail(
            `${String(seen.width)}px with two providers: the meter stands ` +
              `${String(after.bandSpill)}px outside the 36px band`
          );
        }
        if (before.reserve !== null && after.reserve !== null && after.reserve <= before.reserve) {
          fail(
            `${String(seen.width)}px: the reservation did not move with the second ` +
              `provider, ${String(before.reserve)}px then ${String(after.reserve)}px`
          );
        }
      }
      await cdpEval(cdp, UNINJECT);
      await settled(cdp, READ);
    }
    if (heldTwo === 0) fail('the second provider row never stood, so the two provider case was not tested');
    else say(`the two provider case held at ${String(heldTwo)} of ${String(band.length)} widths`);

    await cdpEval(cdp, setSwitches(false, false), true);
    await sleep(600);
    const end = await cdpEval(cdp, 'window.gmux.settingsGet().then((s) => s.usage)', true);
    report.settingsAtEnd = end;
    if (end?.claude !== false) fail('the Claude switch is not off at the end');
    cdp.close();
    return report.failures.length === 0 ? 0 : 1;
  }
);

writeFileSync(join(outDir, 'p1811-strip-fit.json'), JSON.stringify(report, null, 2));
say(`report ${join(outDir, 'p1811-strip-fit.json')}`);
rmSync(rawRoot, { recursive: true, force: true });
const expectFail = (process.env['P1811_EXPECT'] ?? '').trim() === 'fail';
if (report.failures.length > 0) {
  say(`FAILED with ${report.failures.length} finding(s)`);
} else {
  say('every width held: no spill, no overlap, and the tabs are the side that yielded');
}
const green = code === 0 && report.failures.length === 0;
if (expectFail) {
  say(
    green
      ? 'P1811_EXPECT=fail and it passed. The assertions did not fire on this build.'
      : `P1811_EXPECT=fail and it failed, as asked, on ${report.failures.length} finding(s)`
  );
  process.exit(green ? 1 : 0);
}
process.exit(green ? 0 : 1);
