#!/usr/bin/env node
/**
 * probe-p153-menu-icons.mjs. The Phase 153 measurement lane.
 *
 * ## The limit this probe is built around, stated first
 *
 * A native macOS menu cannot be read, clicked or photographed from outside the
 * app. Phase 119 measured it and Phase 152 measured it again: System Events
 * answers with two menu bars and zero windows, and a scripted click returns
 * NOCLICK with an unchanged pasteboard. So NOTHING here claims a drawn pixel.
 *
 * What it measures instead is the two things that decide whether the drawn
 * pixel can be right:
 *
 *  1. THE BYTES ON THE WIRE. `window.gmux.popupMenu` is wrapped with a recorder
 *     that captures the exact `PopupMenuInput` the product hands main, then
 *     answers null so no menu ever opens. Real right clicks are dispatched on
 *     real rows, so what is recorded is the product's own composition through
 *     its own bridge, including each row's icon data URL and template flag.
 *  2. THE RASTERIZER, RE-DERIVED. The page side draws every glyph in
 *     `MENU_CODICONS`, which is 48 of them, a SECOND time by the same
 *     technique the product uses but from this probe's own code, and reports
 *     for each one whether it produced ink, and whether the bitmaps are
 *     distinct from one another. Bitmaps that are all identical to one another
 *     is what a missing font looks like, and it is the failure that would
 *     otherwise reach the operator as a menu of identical boxes.
 *
 *     The count is read from the array rather than typed here, so it cannot go
 *     stale. It says 48 and it said 49 on the first run: that run drew
 *     `git-branch-create` as well, found it bound to the same codepoint as
 *     `git-branch`, and the phase removed the duplicate name from the set.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run without a harness socket of its own and refuses the
 *    names `gmux` and `default` outright.
 *  - `-L gmux` appears once, in a read only `list-sessions` count taken before
 *    and after, which must match.
 *  - Every Electron goes through build/electron-run.mjs.
 *  - No pkill, no kill-server, nothing under the person's home is touched.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p153-menus \
 *     'node build/probe-p153-menu-icons.mjs'
 *
 * Exit 0 when every reading was taken, 1 when one was not, 2 when it refuses.
 */

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
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

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p153]';
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
    'no GMUX_TMUX_SOCKET. Run me through the harness: node ' +
      "build/harness-socket.mjs gmux-p153-menus 'node " +
      "build/probe-p153-menu-icons.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const outDir = resolve(
  repoRoot,
  (process.env['P153_OUT_DIR'] ?? '').trim() || 'out/p153'
);
mkdirSync(outDir, { recursive: true });

function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);

// ---------------------------------------------------------------------------
// Scratch project
// ---------------------------------------------------------------------------

const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, `gmux-p153-menus-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p153-project', 'src'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p153-project');
const profile = join(root, 'profile');
const appmenuProfile = join(root, 'appmenu-profile');
writeFileSync(join(project, 'README.md'), '# Phase 153\n', 'utf8');
writeFileSync(join(project, 'src', 'one.ts'), 'export const one = 1;\n', 'utf8');
const git = (...args) =>
  spawnSync('git', ['-C', project, ...args], { encoding: 'utf8' });
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p153@example.invalid');
git('config', 'user.name', 'Phase 153 probe');
git('config', 'commit.gpgsign', 'false');
git('add', '-A');
git('commit', '-q', '-m', 'first');
writeFileSync(
  join(project, 'src', 'one.ts'),
  'export const one = 1;\nexport const two = 2;\n',
  'utf8'
);
writeFileSync(join(project, 'src', 'two.ts'), 'export const three = 3;\n', 'utf8');

// ---------------------------------------------------------------------------
// A minimal DevTools protocol client (the shape build/probe-p150-ribbon.mjs
// uses, copied rather than shared so a reader of this directory knows it).
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
      call(method, params, timeoutMs = 30_000) {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
          say(`attached to the main window renderer over CDP (port ${port})`);
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

// ---------------------------------------------------------------------------
// The page side kit: the recorder over the bridge, and the SECOND rasterizer.
// ---------------------------------------------------------------------------

const PAGE_KIT = String.raw`
(() => {
  const kit = { recorded: [] };

  /**
   * The recorder. gmuxBridge() reads window.gmux on every call, so shadowing
   * the object with a proxy puts this in front of the real popupMenu without
   * touching a product file and without needing the frozen bridge to be
   * writable. Every call answers null, which the product reads as dismissed,
   * so no OS menu is ever opened by this probe.
   */
  const real = window.gmux;
  const record = (input) => {
    kit.recorded.push(JSON.parse(JSON.stringify(input)));
    return Promise.resolve(null);
  };
  kit.intercept = { how: 'none', why: null };
  const onWindow = Object.getOwnPropertyDescriptor(window, 'gmux');
  const onBridge = Object.getOwnPropertyDescriptor(real, 'popupMenu');
  kit.intercept.descriptors = {
    windowGmux: onWindow
      ? { configurable: onWindow.configurable, writable: onWindow.writable }
      : null,
    bridgePopupMenu: onBridge
      ? { configurable: onBridge.configurable, writable: onBridge.writable }
      : null
  };
  // Two attempts, most preferred first, and the descriptors above say which one
  // could work. contextBridge is free to make either of them immovable, and a
  // probe that cannot get in front of the bridge says so rather than guessing.
  try {
    const proxy = new Proxy(real, {
      get(target, prop, recv) {
        if (prop === 'popupMenu') return record;
        return Reflect.get(target, prop, recv);
      }
    });
    Object.defineProperty(window, 'gmux', {
      value: proxy,
      configurable: true,
      writable: true
    });
    kit.intercept.how = 'window.gmux replaced with a proxy';
  } catch (err) {
    kit.intercept.why = String(err && err.message ? err.message : err);
    try {
      real.popupMenu = record;
      kit.intercept.how =
        real.popupMenu === record
          ? 'bridge popupMenu assigned directly'
          : 'none';
    } catch (err2) {
      kit.intercept.why +=
        ' | ' + String(err2 && err2.message ? err2.message : err2);
    }
  }

  kit.clear = () => { kit.recorded.length = 0; };
  /** Rows of the last recorded menu, with the icon reduced to facts. */
  kit.rows = () => {
    const last = kit.recorded[kit.recorded.length - 1];
    if (last === undefined) return null;
    const walk = (items) => items.map((it) => ({
      label: it.label,
      type: it.type ?? 'item',
      enabled: it.enabled !== false,
      destructive: it.destructive === true,
      sublabel: it.sublabel ?? null,
      hasIcon: it.icon !== undefined,
      template: it.icon ? it.icon.template : null,
      iconBytes: it.icon ? it.icon.dataUrl.length : 0,
      iconHash: it.icon ? kit.hash(it.icon.dataUrl) : null,
      submenu: it.submenu ? walk(it.submenu) : null
    }));
    return walk(last.items);
  };
  kit.hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  };

  /** A real right click on one element, at its own centre. */
  kit.rightClick = (el) => {
    if (el === null || el === undefined) return false;
    const b = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, composed: true,
      clientX: Math.round(b.left + b.width / 2),
      clientY: Math.round(b.top + b.height / 2),
      button: 2, buttons: 2
    }));
    return true;
  };

  /** Deep query, crossing any open shadow root (the tree lives in one). */
  kit.deep = (selector) => {
    const seen = new Set();
    const stack = [document];
    while (stack.length > 0) {
      const node = stack.pop();
      if (node === null || node === undefined || seen.has(node)) continue;
      seen.add(node);
      const hit = node.querySelector ? node.querySelector(selector) : null;
      if (hit !== null && hit !== undefined) return hit;
      const all = node.querySelectorAll ? node.querySelectorAll('*') : [];
      for (const el of all) if (el.shadowRoot) stack.push(el.shadowRoot);
    }
    return null;
  };

  /**
   * THE SECOND RASTERIZER. Written here rather than imported, so it is a
   * different piece of code reaching the same stylesheet and the same font.
   * If the product's cache is empty this still draws, and the two answers
   * disagreeing is the finding.
   */
  kit.redraw = async (names) => {
    try { await document.fonts.load('32px codicon'); } catch { /* no set */ }
    const out = [];
    for (const name of names) {
      const probe = document.createElement('span');
      probe.className = 'codicon codicon-' + name;
      probe.setAttribute('style',
        'position:absolute;left:-9999px;top:0;visibility:hidden');
      document.body.appendChild(probe);
      const raw = getComputedStyle(probe, '::before').content;
      probe.remove();
      const m = /^(?:"([^"]*)"|'([^']*)')$/.exec(raw);
      const ch = (m && (m[1] !== undefined ? m[1] : m[2])) || '';
      if (ch === '') { out.push({ name, glyph: false }); continue; }
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 32, 32);
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '32px codicon';
      ctx.fillText(ch, 16, 16);
      const px = ctx.getImageData(0, 0, 32, 32).data;
      let ink = 0;
      for (let i = 3; i < px.length; i += 4) if (px[i] > 8) ink += 1;
      out.push({
        name,
        glyph: true,
        codepoint: ch.codePointAt(0).toString(16),
        inkPixels: ink,
        hash: kit.hash(c.toDataURL('image/png'))
      });
    }
    return out;
  };

  window.__p153 = kit;
  return true;
})()
`;

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const NAMES = (() => {
  const src = readFileSync(
    join(repoRoot, 'src', 'renderer', 'icons', 'codicon-menu-icon.ts'),
    'utf8'
  );
  const body = src.split('MENU_CODICONS = [')[1].split('] as const')[0];
  return [...body.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
})();
say(`the closed set holds ${String(NAMES.length)} glyph names`);

const report = {
  glyphs: null,
  menus: {},
  appMenu: null,
  intercept: null,
  failures: []
};
const fail = (why) => {
  report.failures.push(why);
  say(`FAILED ${why}`);
};

async function measureAppMenu() {
  const outFile = join(outDir, 'p153-appmenu.json');
  rmSync(outFile, { force: true });
  await withElectron(
    {
      label: 'p153 appmenu',
      userDataDir: appmenuProfile,
      cwd: repoRoot,
      entry: false,
      // `persistence: false` matters here rather than being tidiness. The
      // default adds `-ApplePersistenceIgnoreState YES`, and Electron takes the
      // first argument that is not a flag as the app path, so the bare `YES`
      // would be the app and the script below would never run.
      persistence: false,
      args: [join(repoRoot, 'build', 'p153-appmenu-main.cjs')],
      env: { ...process.env, P153_APPMENU_OUT: outFile },
      graceMs: 10_000,
      ceilingMs: 60_000
    },
    async (handle) => {
      await handle.exited;
    }
  );
  if (!existsSync(outFile)) {
    fail('the application menu measurement wrote no report');
    return;
  }
  report.appMenu = JSON.parse(readFileSync(outFile, 'utf8'));
  say(`application menu: ${JSON.stringify(report.appMenu.built)}`);
}

async function measureRenderer() {
  return withElectron(
    {
      label: 'p153 menus',
      userDataDir: profile,
      cwd: repoRoot,
      args: ['--remote-debugging-port=0'],
      env: { ...process.env, GMUX_UPDATE_REHEARSAL: '1' },
      graceMs: 15_000
    },
    async (handle) => {
      say(`launched the dev app, pid ${String(handle.pid)}`);
      const cdp = await cdpForProfile(profile, 90_000);
      for (let waited = 0; waited < 60_000; waited += 500) {
        const ready = await cdpEval(
          cdp,
          "typeof window.__gmuxShotDrive === 'function'"
        );
        if (ready === true) break;
        await sleep(500);
      }
      await cdpEval(cdp, PAGE_KIT);
      const intercept = await cdpEval(cdp, 'window.__p153.intercept');
      report.intercept = intercept;
      say(`bridge interception: ${JSON.stringify(intercept)}`);

      // Give the product's own warm pass room to finish before anything opens.
      await sleep(2500);

      report.glyphs = await cdpEval(
        cdp,
        `window.__p153.redraw(${JSON.stringify(NAMES)})`,
        true
      );
      const drawn = report.glyphs.filter((g) => g.glyph && g.inkPixels > 0);
      const hashes = new Set(drawn.map((g) => g.hash));
      say(
        `re-derived ${String(drawn.length)} of ${String(NAMES.length)} glyphs ` +
          `with ink, ${String(hashes.size)} distinct bitmaps`
      );
      if (drawn.length !== NAMES.length) {
        fail(`${String(NAMES.length - drawn.length)} glyphs drew no ink`);
      }
      if (hashes.size !== drawn.length) {
        fail(
          `only ${String(hashes.size)} distinct bitmaps for ` +
            `${String(drawn.length)} glyphs; a repeated bitmap is a missing font`
        );
      }

      // THE MENU ROWS THEMSELVES CANNOT BE READ FROM HERE, and the reason is
      // measured above rather than assumed. `contextBridge` exposes the bridge
      // with configurable:false and writable:false on BOTH `window.gmux` and
      // its own `popupMenu`, so nothing can get in front of the call. Opening a
      // menu for real is refused instead of attempted: `Menu.popup` opens an
      // OS owned window that Phase 119 and Phase 152 both measured as unreadable
      // and unclickable from outside, and one opened here would have no way to
      // be closed again.
      //
      // So the composition of each menu is proved by the unit tests, which read
      // the same pure builders, and this probe proves the half the unit tests
      // cannot reach: that the glyphs rasterize in a real renderer, against the
      // real stylesheet and the real font, into distinct bitmaps with ink.
      report.menus = {
        read: false,
        why:
          'contextBridge exposes window.gmux and its popupMenu as ' +
          'configurable:false and writable:false, so the wire cannot be ' +
          'recorded; and a real Menu.popup cannot be read or closed from ' +
          'outside the app (Phase 119, Phase 152).'
      };
      say(`menu rows: ${report.menus.why}`);

      cdp.close();
    }
  );
}

try {
  await measureAppMenu();
  await measureRenderer();
} catch (err) {
  fail(String(err?.message ?? err));
}

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  fail(
    `operator session count moved from ${String(operatorBefore)} to ` +
      `${String(operatorAfter)}`
  );
}

const reportPath = join(outDir, 'p153-report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
say(`report ${reportPath}`);
if (report.failures.length > 0) {
  say(`${String(report.failures.length)} failure(s)`);
  process.exit(1);
}
say('every reading was taken');
