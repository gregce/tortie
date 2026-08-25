#!/usr/bin/env node
/**
 * probe-p150-ribbon.mjs. The Phase 150 measure and photograph lane.
 *
 * ## Why this exists
 *
 * The operator reported all three items himself, so every surface is measured
 * at the parent commit before anything is edited and again afterwards, and the
 * report prints the two numbers beside each other rather than an assurance.
 *
 * ## What it measures, in ONE app run
 *
 *  1. THE RIBBON, in BOTH orientations. Every icon on the activity bar is
 *     hovered with a REAL mouse move sent over the DevTools protocol, and the
 *     computed background of the button under the pointer is read back. The
 *     project tab across the top is hovered the same way, so the two greys are
 *     compared as measured colours rather than as token names. While the
 *     Source Control icon is hovered the phase's two refusals are read too,
 *     being the selected view's 2px indicator, read off the `::before` box,
 *     and the change count badge's own rectangle and fill.
 *  2. THE SESSION LIST. The header's four controls, being the collapse
 *     chevron, the position control, the add button and the options chevron,
 *     are read as rectangles at the list's default width and again after the
 *     resizer is DRAGGED with real pointer events to the narrowest width the
 *     list allows. The question the report answers is whether each control's
 *     box is inside the list's own box.
 *  3. THE INSTALL CONFIRM. `.ctxd-install-modal` measured at three window
 *     widths, with the rendered line length of its body text in pixels and in
 *     characters, and the preview card's own 72ch cap measured beside it.
 *
 * ## The one thing here that is a fixture, said plainly
 *
 * The install confirm is STAGED by this probe as its own DOM, built from the
 * class names and the node order in `InstallDialog.tsx` and the real sentences
 * in `install-copy.ts`. Reaching the real confirm needs a live skills registry
 * over the network and then a real install, and this probe measures a
 * stylesheet rather than an install. Every other reading in this file comes
 * from the running product's own nodes. The preview card is staged the same
 * way and for the same reason, and both are removed again before the run ends.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - The one Electron goes through build/electron-run.mjs, which ends the
 *    whole tree it started in a finally block whatever happened.
 *  - There is no pkill and no kill-server anywhere in this file.
 *  - Nothing under the person's home is opened, read or written.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   P150_LABEL=parent node build/harness-socket.mjs gmux-p150-ribbon \
 *     'node build/probe-p150-ribbon.mjs'
 *
 * ## Environment it reads
 *
 *   P150_LABEL    a word folded into every file name, e.g. parent or after.
 *   P150_OUT_DIR  where the pictures and the JSON go. Default out/p150.
 *
 * Exit 0 when every reading was taken. 1 when one was not. 2 when the probe
 * refuses to run at all.
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
const TAG = '[probe:p150]';
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
      "own: node build/harness-socket.mjs gmux-p150-ribbon 'node " +
      "build/probe-p150-ribbon.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const label = (process.env['P150_LABEL'] ?? '').trim() || 'run';
const outDir = resolve(
  repoRoot,
  (process.env['P150_OUT_DIR'] ?? '').trim() || 'out/p150'
);
mkdirSync(outDir, { recursive: true });

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}, label: ${label}`);

// ---------------------------------------------------------------------------
// One scratch project, a git repository with a change so the Source Control
// icon actually wears its count badge.
// ---------------------------------------------------------------------------

const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, `gmux-p150-ribbon-${String(process.pid)}`);
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p150-project', 'src'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p150-project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# Phase 150\n', 'utf8');
writeFileSync(join(project, 'src', 'one.ts'), 'export const one = 1;\n', 'utf8');
const git = (...args) =>
  spawnSync('git', ['-C', project, ...args], { encoding: 'utf8' });
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p150@example.invalid');
git('config', 'user.name', 'Phase 150 probe');
git('config', 'commit.gpgsign', 'false');
git('add', '-A');
git('commit', '-q', '-m', 'first');
writeFileSync(
  join(project, 'src', 'one.ts'),
  'export const one = 1;\nexport const two = 2;\n',
  'utf8'
);
writeFileSync(join(project, 'src', 'two.ts'), 'export const three = 3;\n', 'utf8');
writeFileSync(join(project, 'src', 'three.ts'), 'export const four = 4;\n', 'utf8');

// ---------------------------------------------------------------------------
// A minimal DevTools protocol client. The same shape build/p132-install-sheet.mjs
// uses, copied rather than shared because that copy is the one a reader of this
// directory already knows.
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

async function shot(cdp, name) {
  const path = join(outDir, `p150-${label}-${name}.png`);
  try {
    const reply = await cdp.call('Page.captureScreenshot', { format: 'png' });
    const data = reply.result?.data;
    if (typeof data === 'string' && data.length > 0) {
      writeFileSync(path, Buffer.from(data, 'base64'));
      say(`photograph ${path}`);
      return path;
    }
  } catch {
    // The readings are the evidence when no image comes back.
  }
  say(`no photograph for ${name}; the readings are the evidence`);
  return null;
}

/** A REAL mouse move to one point, which is what makes :hover true. */
async function movePointer(cdp, x, y) {
  await cdp.call('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: Math.round(x),
    y: Math.round(y),
    button: 'none',
    buttons: 0,
    clickCount: 0
  });
  await sleep(180);
}

async function setViewport(cdp, width, height) {
  await cdp.call('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(600);
}

// ---------------------------------------------------------------------------
// The page-side kit. One expression, evaluated once, that puts every reader
// this probe needs on window.__p150. It is the probe's own code, injected from
// here. No product file gains a hook for it.
// ---------------------------------------------------------------------------

const PAGE_KIT = String.raw`
(() => {
  const kit = {};
  const r1 = (n) => Math.round(n * 10) / 10;
  kit.r1 = r1;
  const box = (el) => {
    if (el === null || el === undefined) return null;
    const b = el.getBoundingClientRect();
    return {
      top: r1(b.top), left: r1(b.left), right: r1(b.right),
      bottom: r1(b.bottom), width: r1(b.width), height: r1(b.height)
    };
  };
  kit.box = box;
  const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
  kit.flat = flat;

  /** Everything a hover treatment is made of, read from one element. */
  kit.look = (el) => {
    if (el === null || el === undefined) return null;
    const c = getComputedStyle(el);
    return {
      backgroundColor: c.backgroundColor,
      color: c.color,
      borderRadius: c.borderRadius,
      transition: c.transition,
      hovered: el.matches(':hover'),
      box: box(el)
    };
  };

  /** The activity bar's buttons, in the order they are drawn. */
  kit.ribbonItems = () =>
    Array.from(document.querySelectorAll('[data-slot="activity-bar"] .ab-item'));
  kit.ribbonNames = () =>
    kit.ribbonItems().map((b) => flat(b.getAttribute('aria-label')).split(' (')[0]);
  kit.ribbonOrientation = () => {
    const nav = document.querySelector('[data-slot="activity-bar"]');
    return nav === null ? null : (nav.classList.contains('activitybar-row') ? 'row' : 'column');
  };
  kit.ribbonBox = () => box(document.querySelector('[data-slot="activity-bar"]'));
  kit.ribbonItemBox = (i) => box(kit.ribbonItems()[i] ?? null);
  kit.ribbonLook = (i) => kit.look(kit.ribbonItems()[i] ?? null);

  /** The two things item one must not disturb. */
  kit.indicator = () => {
    const active = kit.ribbonItems().find((b) => b.classList.contains('active'));
    if (active === undefined) return null;
    const c = getComputedStyle(active, '::before');
    return {
      on: flat(active.getAttribute('aria-label')).split(' (')[0],
      content: c.content,
      background: c.backgroundColor,
      width: c.width,
      height: c.height,
      left: c.left,
      bottom: c.bottom,
      itemBackground: getComputedStyle(active).backgroundColor
    };
  };
  kit.badge = () => {
    const el = document.querySelector('[data-slot="activity-bar"] .ab-badge');
    if (el === null) return null;
    const c = getComputedStyle(el);
    return {
      text: flat(el.textContent),
      background: c.backgroundColor,
      color: c.color,
      zIndex: c.zIndex,
      box: box(el)
    };
  };

  /** The project tab across the top, which is the grey item one copies. */
  kit.tab = () => document.querySelector('.titlebar .ptab');
  kit.tabBox = () => box(kit.tab());
  kit.tabLook = () => kit.look(kit.tab());
  /* The one tab a scratch project opens is the SELECTED tab, and .ptab.selected
     states --bg-active, which is a different grey from the one item one copies.
     So the class is lifted for the reading and put straight back. It is the
     probe's own two lines and no product file gains a hook for it. */
  kit.tabDeselect = () => {
    const t = kit.tab();
    if (t === null) return false;
    t.classList.remove('selected');
    return true;
  };
  kit.tabReselect = () => {
    const t = kit.tab();
    if (t === null) return false;
    t.classList.add('selected');
    return true;
  };

  kit.positionButton = () => document.querySelector('.titlebar .projects-position');

  // -- the session list ------------------------------------------------------
  kit.dock = () => document.querySelector('.session-dock');
  kit.dockControls = () => {
    const bar = document.querySelector('.session-dock .dock-toolbar');
    if (bar === null) return [];
    return Array.from(bar.querySelectorAll('button'));
  };
  kit.measureDock = () => {
    const dock = kit.dock();
    if (dock === null) return { error: 'no .session-dock on screen' };
    const bar = dock.querySelector('.dock-toolbar');
    const title = dock.querySelector('.dock-title');
    const dockBox = box(dock);
    const controls = kit.dockControls().map((b) => {
      const bb = box(b);
      // Reachable means the browser hit-tests THIS button at its own centre.
      let hit = null;
      if (bb !== null && bb.width > 0 && bb.height > 0) {
        const el = document.elementFromPoint(bb.left + bb.width / 2, bb.top + bb.height / 2);
        hit = el !== null && (el === b || b.contains(el));
      }
      return {
        label: flat(b.getAttribute('aria-label')),
        box: bb,
        insideList:
          bb === null ? null : bb.left >= dockBox.left - 0.5 && bb.right <= dockBox.right + 0.5,
        hitTestsAsItself: hit
      };
    });
    return {
      innerWidth: window.innerWidth,
      dockBox,
      barBox: box(bar),
      barScrollWidth: bar === null ? null : bar.scrollWidth,
      barClientWidth: bar === null ? null : bar.clientWidth,
      titleBox: box(title),
      titleText: title === null ? null : flat(title.textContent),
      titleOverflow: title === null ? null : getComputedStyle(title).textOverflow,
      titleScrollWidth: title === null ? null : title.scrollWidth,
      titleClientWidth: title === null ? null : title.clientWidth,
      controls,
      controlsInside: controls.every((c) => c.insideList === true),
      controlsReachable: controls.every((c) => c.hitTestsAsItself === true)
    };
  };

  /** Drag the list's own resizer with real pointer events. */
  kit.dragDock = (toWidth) => {
    const dock = kit.dock();
    const grip = document.querySelector('.session-dock .dock-resizer');
    if (dock === null || grip === null) return { error: 'no dock or no resizer' };
    const rect = dock.getBoundingClientRect();
    const startX = rect.left + 2;
    const y = rect.top + 60;
    const targetX = rect.right - toWidth;
    const opts = (x) => ({
      bubbles: true, cancelable: true, composed: true,
      clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse',
      button: 0, buttons: 1, isPrimary: true
    });
    grip.dispatchEvent(new PointerEvent('pointerdown', opts(startX)));
    const steps = 12;
    for (let i = 1; i <= steps; i += 1) {
      const x = startX + ((targetX - startX) * i) / steps;
      window.dispatchEvent(new PointerEvent('pointermove', opts(x)));
    }
    window.dispatchEvent(
      new PointerEvent('pointerup', { ...opts(targetX), buttons: 0 })
    );
    return { startX: r1(startX), targetX: r1(targetX) };
  };

  // -- the install confirm, staged ------------------------------------------
  // Built from the class names and node order in InstallDialog.tsx and the
  // real sentences in install-copy.ts. It is this probe's own DOM and it is
  // removed again by kit.unstage().
  kit.staged = [];
  kit.stageConfirm = () => {
    kit.unstage();
    const scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.dataset.p150 = 'stage';
    scrim.innerHTML =
      '<div class="modal ctxd-install-modal" role="alertdialog">' +
      '<h2 class="modal-title">Install govuk-style from github.com/alphagov/skills?</h2>' +
      '<div class="ctxd-install-modal-body">' +
      '<p class="modal-body">Skills run inside your agents. This one ships 3 scripts that can run with your permissions, and Tortie shows you every one of them before anything starts.</p>' +
      '<p class="modal-body">Scanned 16 April: Socket found 0 alerts and Snyk rated it low.</p>' +
      '<table class="ctxd-runs"><tbody>' +
      '<tr><td class="ctxd-runs-when">After every edit</td>' +
      '<td class="ctxd-mono ctxd-runs-script">.claude/skills/govuk-style/scripts/format-on-write.sh</td></tr>' +
      '<tr><td class="ctxd-runs-when">When a session starts</td>' +
      '<td class="ctxd-mono ctxd-runs-script">.claude/skills/govuk-style/scripts/seed-house-style.sh</td></tr>' +
      '</tbody></table>' +
      '<div class="ctxd-provenance">' +
      '<p class="ctxd-muted ctxd-mono">marketplace: skills.sh</p>' +
      '<p class="ctxd-muted ctxd-mono">version: 2.4.1</p>' +
      '<p class="ctxd-muted ctxd-mono">repository: github.com/alphagov/skills</p>' +
      '<p class="ctxd-muted ctxd-mono">commit: 9f2c1ab4d7e30518be6c2a9f4417d0c8e5b31a62</p>' +
      '</div>' +
      '<div class="ctxd-command">' +
      '<div class="ctxd-command-head"><span class="ctxd-card-label">This runs</span>' +
      '<button type="button" class="btn-text">Copy</button></div>' +
      '<pre class="ctxd-mono ctxd-command-line">/opt/homebrew/bin/skills add govuk-style --source github.com/alphagov/skills --agent claude --agent codex --agent gemini --scope project --yes</pre>' +
      '<p class="ctxd-muted ctxd-command-short">skills add govuk-style</p>' +
      '<p class="ctxd-muted">Working directory: /Users/example/work/p150-project</p>' +
      '</div>' +
      '<p class="modal-body ctxd-blast">Claude Code, Codex CLI and Gemini CLI load this skill the next time each one starts, and nothing already running changes.</p>' +
      '</div>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn">Cancel</button>' +
      '<button type="button" class="btn btn-primary">Install</button>' +
      '</div></div>';
    document.body.appendChild(scrim);
    kit.staged.push(scrim);
    return true;
  };

  /** The preview card, staged inside a sheet, so its 72ch cap is measurable. */
  kit.stagePreview = () => {
    const sheet = document.createElement('div');
    sheet.className = 'modal-scrim';
    sheet.dataset.p150 = 'stage';
    sheet.innerHTML =
      '<div class="modal ctx-install-sheet">' +
      '<section class="ctxd-card ctxd-preview">' +
      '<header class="ctxd-card-head"><h2 class="ctxd-card-title">govuk-style</h2></header>' +
      '<p class="ctxd-card-line ctxd-remote-text">Write and edit in GOV.UK house style, being plain English, active voice, front loaded content and sentence case, and use it when writing or editing reports, research write ups, guidance, documentation, summaries, or any prose where clarity and accessibility matter to the person reading it once.</p>' +
      '<div class="ctxd-preview-body">' +
      '<div class="ctxd-preview-col" data-column="facts"></div>' +
      '<div class="ctxd-preview-col" data-column="plan"></div>' +
      '</div></section></div>';
    document.body.appendChild(sheet);
    kit.staged.push(sheet);
    return true;
  };

  kit.unstage = () => {
    for (const n of kit.staged) {
      if (n.parentNode !== null) n.parentNode.removeChild(n);
    }
    kit.staged = [];
    return document.querySelectorAll('[data-p150="stage"]').length;
  };

  /** One character's width in an element's own font, so ch is measured. */
  kit.chOf = (el) => {
    const probe = document.createElement('span');
    probe.textContent = '0';
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    const c = getComputedStyle(el);
    probe.style.font = c.font && c.font !== '' ? c.font :
      c.fontStyle + ' ' + c.fontWeight + ' ' + c.fontSize + '/' + c.lineHeight + ' ' + c.fontFamily;
    el.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  };

  kit.measureModal = () => {
    const modal = document.querySelector('.ctxd-install-modal');
    if (modal === null) return { error: 'no .ctxd-install-modal on screen' };
    const c = getComputedStyle(modal);
    const bodies = Array.from(modal.querySelectorAll('.modal-body'));
    const first = bodies[0] ?? null;
    const cmd = modal.querySelector('.ctxd-command-line');
    const chw = first === null ? null : kit.chOf(first);
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      declaredWidth: c.width,
      maxWidth: c.maxWidth,
      box: box(modal),
      contentWidth: r1(modal.clientWidth),
      scrollWidth: modal.scrollWidth,
      overflowX: modal.scrollWidth > modal.clientWidth,
      bodyBox: box(first),
      bodyMaxWidth: first === null ? null : getComputedStyle(first).maxWidth,
      bodyChWidth: chw === null ? null : r1(chw),
      bodyLineChars:
        first === null || chw === null || chw === 0
          ? null
          : r1(first.getBoundingClientRect().width / chw),
      gutterPx:
        first === null ? null : r1(modal.clientWidth - first.getBoundingClientRect().width),
      commandBox: box(cmd),
      commandLines:
        cmd === null ? null : r1(cmd.getBoundingClientRect().height /
          Number.parseFloat(getComputedStyle(cmd).lineHeight || '16'))
    };
  };

  kit.measurePreview = () => {
    const sheet = document.querySelector('.ctx-install-sheet');
    const card = document.querySelector('.ctx-install-sheet .ctxd-preview');
    const text = document.querySelector('.ctx-install-sheet .ctxd-remote-text');
    if (sheet === null || card === null || text === null) {
      return { error: 'no staged preview on screen' };
    }
    const chw = kit.chOf(text);
    return {
      innerWidth: window.innerWidth,
      sheetBox: box(sheet),
      cardBox: box(card),
      textBox: box(text),
      textMaxWidth: getComputedStyle(text).maxWidth,
      textChWidth: r1(chw),
      textLineChars: chw === 0 ? null : r1(text.getBoundingClientRect().width / chw),
      gutterPx: r1(card.clientWidth - text.getBoundingClientRect().width),
      columns: getComputedStyle(
        document.querySelector('.ctx-install-sheet .ctxd-preview-body')
      ).gridTemplateColumns
    };
  };

  window.__p150 = kit;
  return true;
})()
`;

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const report = { label, when: new Date().toISOString() };
const failures = [];
const note = (why) => {
  failures.push(why);
  say(`MISSING ${why}`);
};

async function main() {
  mkdirSync(profile, { recursive: true });
  return withElectron(
    {
      label: `p150 ${label}`,
      userDataDir: profile,
      cwd: repoRoot,
      args: ['--remote-debugging-port=0'],
      env: {
        ...process.env,
        // The same term the other CDP probes here use: it makes the launch a
        // harness launch so GMUX_TMUX_SOCKET is honoured, without handing the
        // process to runShot, which photographs once and exits.
        GMUX_UPDATE_REHEARSAL: '1'
      },
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
      await setViewport(cdp, 1440, 900);

      await cdpEval(
        cdp,
        `window.__gmuxShotDrive(${JSON.stringify({
          projectPath: project,
          orientation: 'right',
          fakeTabs: true,
          sidebarView: 'scm'
        })}).then(() => true)`,
        true
      );
      await sleep(2500);
      await cdpEval(cdp, PAGE_KIT);
      say('the page kit is installed');

      // -- item one, the project tab's own grey -------------------------------
      const tabBox = await cdpEval(cdp, 'window.__p150.tabBox()');
      if (tabBox === null) {
        note('no project tab in the titlebar, so the grey has no source');
      } else {
        const centre = [
          tabBox.left + tabBox.width / 2,
          tabBox.top + tabBox.height / 2
        ];
        await movePointer(cdp, 1400, 600);
        report.tabSelectedAtRest = await cdpEval(cdp, 'window.__p150.tabLook()');
        await movePointer(cdp, centre[0], centre[1]);
        report.tabSelectedHovered = await cdpEval(cdp, 'window.__p150.tabLook()');
        report.tabShot = await shot(cdp, 'tab-hover-selected');

        // The grey item one copies is the UNSELECTED tab's, so the reading is
        // taken with the selection lifted and put straight back.
        await cdpEval(cdp, 'window.__p150.tabDeselect()');
        await movePointer(cdp, 1400, 600);
        report.tabAtRest = await cdpEval(cdp, 'window.__p150.tabLook()');
        await movePointer(cdp, centre[0], centre[1]);
        report.tabHovered = await cdpEval(cdp, 'window.__p150.tabLook()');
        report.tabUnselectedShot = await shot(cdp, 'tab-hover');
        await cdpEval(cdp, 'window.__p150.tabReselect()');
        await movePointer(cdp, 1400, 600);
        say(
          `project tab, selected: rest ${report.tabSelectedAtRest.backgroundColor}, ` +
            `hover ${report.tabSelectedHovered.backgroundColor}`
        );
        say(
          `project tab, not selected: rest ${report.tabAtRest.backgroundColor}, ` +
            `hover ${report.tabHovered.backgroundColor} ` +
            `(hovered ${String(report.tabHovered.hovered)}, ` +
            `transition ${report.tabHovered.transition})`
        );
      }

      // -- item one, the ribbon in both orientations --------------------------
      report.ribbon = {};
      for (const pass of ['column', 'row']) {
        if (pass === 'row') {
          const moved = await cdpEval(
            cdp,
            `(() => { const b = window.__p150.positionButton();
               if (b === null) return 'no position control in the titlebar';
               b.click(); return 'ok'; })()`
          );
          if (moved !== 'ok') {
            note(`could not move the projects to the left: ${String(moved)}`);
            continue;
          }
          await sleep(1500);
        }
        const orientation = await cdpEval(cdp, 'window.__p150.ribbonOrientation()');
        const names = await cdpEval(cdp, 'window.__p150.ribbonNames()');
        say(`ribbon is a ${String(orientation)} holding ${names.join(', ')}`);
        if (orientation !== pass) {
          note(`expected the ribbon to be a ${pass} and it is a ${String(orientation)}`);
        }
        await movePointer(cdp, 1400, 700);
        const rows = [];
        for (let i = 0; i < names.length; i += 1) {
          const b = await cdpEval(cdp, `window.__p150.ribbonItemBox(${i})`);
          if (b === null || b.width === 0) continue;
          await movePointer(cdp, 1400, 700);
          const rest = await cdpEval(cdp, `window.__p150.ribbonLook(${i})`);
          await movePointer(cdp, b.left + b.width / 2, b.top + b.height / 2);
          const hover = await cdpEval(cdp, `window.__p150.ribbonLook(${i})`);
          rows.push({ name: names[i], rest, hover });
          say(
            `  ${String(names[i]).padEnd(16)} rest ${rest.backgroundColor}` +
              `  hover ${hover.backgroundColor}  (hovered ${String(hover.hovered)})`
          );
        }
        // The two refusals, read while the Source Control icon is under the
        // pointer, which is the moment a hover fill could hide either of them.
        const scmAt = names.findIndex((n) => /source/i.test(String(n)));
        if (scmAt !== -1) {
          const b = await cdpEval(cdp, `window.__p150.ribbonItemBox(${scmAt})`);
          if (b !== null) {
            await movePointer(cdp, b.left + b.width / 2, b.top + b.height / 2);
          }
        }
        const indicator = await cdpEval(cdp, 'window.__p150.indicator()');
        const badge = await cdpEval(cdp, 'window.__p150.badge()');
        say(`  indicator ${JSON.stringify(indicator)}`);
        say(`  badge     ${JSON.stringify(badge)}`);
        const png = await shot(cdp, `ribbon-${pass}`);
        report.ribbon[pass] = {
          orientation,
          names,
          items: rows,
          indicator,
          badge,
          ribbonBox: await cdpEval(cdp, 'window.__p150.ribbonBox()'),
          shot: png
        };
        await movePointer(cdp, 1400, 700);
      }

      // -- item two, the session list ----------------------------------------
      report.dock = {};
      const atDefault = await cdpEval(cdp, 'window.__p150.measureDock()');
      report.dock.default = atDefault;
      if (atDefault.error !== undefined) {
        note(`the session list: ${String(atDefault.error)}`);
      } else {
        say(
          `session list at ${atDefault.dockBox.width} px: controls inside ` +
            `${String(atDefault.controlsInside)}, reachable ` +
            `${String(atDefault.controlsReachable)}`
        );
        report.dock.defaultShot = await shot(cdp, 'dock-default');
        const dragged = await cdpEval(cdp, 'window.__p150.dragDock(120)');
        say(`dragged the list resizer: ${JSON.stringify(dragged)}`);
        await sleep(900);
        const atNarrow = await cdpEval(cdp, 'window.__p150.measureDock()');
        report.dock.narrow = atNarrow;
        say(
          `session list at ${atNarrow.dockBox.width} px: controls inside ` +
            `${String(atNarrow.controlsInside)}, reachable ` +
            `${String(atNarrow.controlsReachable)}`
        );
        for (const c of atNarrow.controls) {
          say(
            `  ${String(c.label).padEnd(24)} right ${String(c.box?.right)} ` +
              `against list right ${String(atNarrow.dockBox.right)} ` +
              `inside ${String(c.insideList)} reachable ${String(c.hitTestsAsItself)}`
          );
        }
        report.dock.narrowShot = await shot(cdp, 'dock-narrow');
      }

      // -- item three, the install confirm and the preview card ---------------
      report.modal = {};
      report.preview = {};
      for (const width of [1440, 1100, 700]) {
        await setViewport(cdp, width, 900);
        await cdpEval(cdp, 'window.__p150.stageConfirm()');
        await sleep(400);
        const m = await cdpEval(cdp, 'window.__p150.measureModal()');
        report.modal[width] = m;
        if (m.error !== undefined) {
          note(`the install confirm at ${width} px: ${String(m.error)}`);
        } else {
          say(
            `confirm at window ${width}: modal ${m.box.width} px, ` +
              `declared ${m.declaredWidth}, body line ${m.bodyBox.width} px ` +
              `(${m.bodyLineChars} characters), gutter ${m.gutterPx} px, ` +
              `command ${m.commandLines} lines`
          );
          report.modal[`${width}Shot`] = await shot(cdp, `confirm-${width}`);
        }
        await cdpEval(cdp, 'window.__p150.unstage()');

        await cdpEval(cdp, 'window.__p150.stagePreview()');
        await sleep(400);
        const p = await cdpEval(cdp, 'window.__p150.measurePreview()');
        report.preview[width] = p;
        if (p.error === undefined) {
          say(
            `preview at window ${width}: sheet ${p.sheetBox.width} px, ` +
              `description ${p.textBox.width} px (${p.textLineChars} characters), ` +
              `cap ${p.textMaxWidth}, gutter ${p.gutterPx} px`
          );
          if (width === 1440) {
            report.previewShot = await shot(cdp, 'preview-1440');
          }
        }
        await cdpEval(cdp, 'window.__p150.unstage()');
      }
      const left = await cdpEval(cdp, 'window.__p150.unstage()');
      if (left !== 0) note(`${String(left)} staged nodes were left behind`);

      cdp.close();
      return true;
    }
  );
}

let ok = false;
try {
  ok = await main();
} catch (err) {
  console.error(`${TAG} ${String(err?.stack ?? err)}`);
  failures.push(String(err?.message ?? err));
}

const jsonPath = join(outDir, `p150-${label}.json`);
writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
say(`readings: ${jsonPath}`);

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`
  );
}
rmSync(root, { recursive: true, force: true });

if (failures.length > 0 || ok !== true) {
  say(`INCOMPLETE, ${String(failures.length)} reading(s) missing:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS. One app run, every surface measured and photographed.');
