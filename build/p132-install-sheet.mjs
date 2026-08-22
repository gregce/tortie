#!/usr/bin/env node
/**
 * p132-install-sheet.mjs. The Phase 132 live probe for the skill install sheet.
 *
 * THE COMPLAINT IT MEASURES. The operator reported on 2026-08-21 that the skill
 * preview is unreadably tall and that he never reaches the install button. This
 * probe drives the real sheet in the real app and turns both halves of that
 * sentence into numbers.
 *
 * WHAT IT PROVES, in one launch:
 *  1. THE SHEET      whether the sheet itself is one scroller, read as
 *                    `scrollHeight` against `clientHeight` on
 *                    `.ctx-install-sheet`.
 *  2. THE BUTTON     the primary control's `getBoundingClientRect().bottom`
 *                    against `window.innerHeight`, with NO scrolling of the
 *                    sheet performed first. That number is the whole complaint.
 *  3. THE DISTANCE   how many pixels of scroll sit between the top of the sheet
 *                    and the button, so the report says "the button is 640 px
 *                    down" rather than "below the fold".
 *  4. THE REGION     whether `.ctxd-preview-body` scrolls inside itself, and
 *                    whether `.ctxd-remote-body` is a bounded box.
 *  5. THE WIDTH      the measured sheet width at a 1440 px viewport and at a
 *                    928 px viewport, and the preview's own `scrollHeight` at
 *                    each, which is the evidence for the widening.
 *  6. THE COLUMNS    the container query still resolving to two tracks, read
 *                    from `getComputedStyle(previewBody).gridTemplateColumns`.
 *  7. THE HEAD       `.ctx-sheet-head` keeping its `top` after the preview
 *                    region is scrolled to its bottom.
 *  8. ONE INSTALL    a real install, driven by clicking the real controls, into
 *                    a scratch project directory under project scope, asserted
 *                    on disk by this process rather than by asking the renderer.
 *  9. THE CLIPBOARD  the preview's "Copy the command" string and the confirm's
 *                    "Copy" string, both recorded byte for byte against the
 *                    text each surface renders.
 *
 * HOW THE HEIGHTS ARE PRODUCED, and this is a deviation worth naming. The
 * viewport is changed with the DevTools `Emulation.setDeviceMetricsOverride`
 * call rather than by resizing the real window. That is what makes nine
 * measurements possible in one launch. What it does not exercise is the window
 * manager's own resize, so a report that quotes these numbers says the viewport
 * was emulated.
 *
 * WHAT IT DOES NOT PROVE. It installs one skill from one source, so it is not a
 * matrix over the registry. It measures this Mac's font stack. It never reaches
 * the confirm for a skill whose scan finds executable content, because that
 * path is a hard refusal.
 *
 * SAFETY, and it outranks every result above:
 *  - It runs the DEV build from this tree, never the installed app. Every
 *    launch gets an isolated --user-data-dir under the scratch directory.
 *  - It refuses to start unless GMUX_TMUX_SOCKET names a harness socket, so it
 *    must be run under build/harness-socket.mjs.
 *  - `-L gmux` appears exactly once below, in a read-only `list-sessions` count
 *    taken before and after. A changed count fails the run.
 *  - The only process signalled is the one recorded pid, SIGTERM with a 15 s
 *    grace and then SIGKILL. There is no pkill and no kill-server here.
 *  - The driven install uses PROJECT scope into a scratch project directory, so
 *    the CLI's working directory is that directory. A listing of
 *    $HOME/.claude/skills is taken before and after and a difference fails.
 *  - `npm run shot` is never used. It attaches to the operator's real server.
 *
 * Usage:
 *   node build/harness-socket.mjs gmux-p132 \
 *     'node build/p132-install-sheet.mjs --phase before'
 *   Options: [--phase before|after] [--scratch <dir>] [--keep] [--query <text>]
 *            [--no-install]
 *
 * `--phase` names the PNGs and the printed table, and it decides the exit code.
 * `--phase after` exits 1 when any check fails, which is what makes this probe a
 * gate. Any other value exits 0 and prints the failed check as the defect being
 * recorded. It changes nothing about what is driven, so the before and after
 * runs are the same measurement. `npm run probe:p132` passes `--phase after`.
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { connect as netConnect } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const keep = argv.includes('--keep');
const skipInstall = argv.includes('--no-install');
const readOpt = (name, fallback) => {
  const at = argv.indexOf(name);
  return at !== -1 && argv[at + 1] ? argv[at + 1] : fallback;
};
const phase = readOpt('--phase', 'now');
const query = readOpt('--query', 'commit');
const scratch = readOpt('--scratch', join(tmpdir(), `p132-install-sheet-${process.pid}`));

const TAG = '[probe:p132]';
const profile = join(scratch, 'profile');
const projectDir = join(scratch, 'project');
const appLogPath = join(scratch, 'p132-app.log');
const outDir = join(repoRoot, 'out');

/**
 * The viewport heights, tallest first.
 *
 * 900 is the default window. 700 is an ordinary short window. 586 is the
 * viewport of the 960 by 600 minimum window, which is the smallest the app can
 * be made, and it is the same number build/probe-home-machines.mjs uses.
 */
const HEIGHTS = [900, 700, 586];
/** The wide viewport. The sheet reaches its full width here. */
const WIDE = 1440;
/** The narrow viewport. 928 minus the two 24 px gutters gives an 880 px sheet. */
const NARROW = 928;

const t0 = Date.now();
function log(msg) {
  console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${msg}`);
}
function refuse(why) {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
}

// -- preconditions -----------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');
if (!existsSync(electronBin)) refuse(`${electronBin} does not exist`);
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js does not exist. Run npm run build first.');
}

const socket = process.env['GMUX_TMUX_SOCKET'] ?? '';
if (socket === '' || socket === 'gmux' || socket === 'default') {
  refuse(
    'GMUX_TMUX_SOCKET must be a harness socket. Run this probe as ' +
      "node build/harness-socket.mjs gmux-p132 'node build/p132-install-sheet.mjs'"
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
log(`operator sessions on -L gmux before: ${operatorBefore}`);

/**
 * A listing of the person's own global skills directory.
 *
 * The driven install is project scoped, so this must not change. It is read
 * before the run and again after it, and a difference fails the run.
 */
const homeSkills = join(homedir(), '.claude', 'skills');
function homeSkillListing() {
  try {
    return readdirSync(homeSkills).sort().join(',');
  } catch {
    return '<absent>';
  }
}
const homeSkillsBefore = homeSkillListing();
log(`$HOME/.claude/skills before: ${homeSkillsBefore === '' ? '<empty>' : homeSkillsBefore}`);

// -- the one recorded pid ----------------------------------------------------

let appPid = null;
let appExited = false;
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
  log(`operator sessions on -L gmux after: ${operatorAfter} (before: ${operatorBefore})`);
  if (operatorAfter !== operatorBefore) {
    console.error(`${TAG} FAIL the operator session count changed during the run`);
    code = 1;
  }
  const homeSkillsAfter = homeSkillListing();
  log(`$HOME/.claude/skills after: ${homeSkillsAfter === '' ? '<empty>' : homeSkillsAfter}`);
  if (homeSkillsAfter !== homeSkillsBefore) {
    console.error(`${TAG} FAIL $HOME/.claude/skills changed during the run`);
    code = 1;
  }
  if (code === 0 && !keep) {
    rmSync(scratch, { recursive: true, force: true });
    log('removed the scratch profile');
  } else {
    log(`evidence kept under ${scratch}`);
  }
  process.exit(code);
}

/**
 * Fail the run if the app ignored the harness socket.
 *
 * `activeTmuxSocket` prints one line when GMUX_TMUX_SOCKET is set on a launch
 * that is not a harness launch, and it then uses the operator's own server.
 * Reading that line back is what turns this probe's safety sentence into a
 * check.
 */
function assertHarnessLaunch() {
  let text = '';
  try {
    text = readFileSync(appLogPath, 'utf8');
  } catch {
    return null;
  }
  if (text.includes('is set but this is not a harness launch')) {
    return 'the app ignored GMUX_TMUX_SOCKET and used the operator server on -L gmux';
  }
  return null;
}

async function fail(why) {
  console.error(`${TAG} FAIL. ${why}`);
  await finish(1);
}
process.on('SIGINT', () => void finish(130));
process.on('SIGTERM', () => void finish(130));

// -- a minimal DevTools protocol client --------------------------------------
// The same shape build/probe-home-machines.mjs uses. It is copied rather than
// shared because that probe's copy is the one a reader of this directory
// already knows, and a shared module would be another thing to keep in step.
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
async function cdpForProfile(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const portFile = readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8');
      const port = Number(portFile.split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
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

async function screenshot(cdp, name) {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, name);
  try {
    const reply = await cdp.call('Page.captureScreenshot', { format: 'png' });
    const data = reply.result?.data;
    if (typeof data === 'string' && data.length > 0) {
      writeFileSync(path, Buffer.from(data, 'base64'));
      log(`screenshot saved to ${path} (window content over CDP)`);
      return path;
    }
  } catch {
    // The DOM reads below are the evidence when no image comes back.
  }
  log(`no screenshot for ${name}. The DOM reads are the evidence.`);
  return null;
}

// -- the page-side kit -------------------------------------------------------
// One expression, evaluated once, that puts every reader and every click this
// probe needs on `window.__p132`. It is the probe's own code, injected from
// here. No product file gains a hook for it.

const PAGE_KIT = `
(() => {
  const kit = {};
  kit.copied = [];
  kit.round = (n) => Math.round(n * 100) / 100;
  kit.sheet = () => document.querySelector('.ctx-install-sheet');
  kit.previewBody = () =>
    document.querySelector('.ctx-install-sheet .ctxd-preview-body');
  kit.remoteBody = () =>
    document.querySelector('.ctx-install-sheet .ctxd-remote-body');
  kit.control = () =>
    document.querySelector('.ctx-install-sheet .ctxd-install-control');
  kit.primary = () => {
    const c = kit.control();
    return c === null ? null : c.querySelector('button.btn-primary');
  };
  kit.commandLine = () => {
    const el = document.querySelector(
      '.ctx-install-sheet .ctxd-preview-section[data-section="command"] .ctxd-mono'
    );
    return el === null ? null : el.textContent;
  };
  kit.setInput = (el, value) => {
    const desc = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(el),
      'value'
    );
    desc.set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // The clipboard is SPIED rather than written. Recording the argument is the
  // whole point, and a probe that actually wrote would replace whatever the
  // person had on their clipboard.
  navigator.clipboard.writeText = (text) => {
    kit.copied.push(text);
    return Promise.resolve();
  };

  kit.measure = () => {
    const sheet = kit.sheet();
    if (sheet === null) return { error: 'no .ctx-install-sheet on screen' };
    const body = kit.previewBody();
    const remote = kit.remoteBody();
    const btn = kit.primary();
    const head = document.querySelector('.ctx-install-sheet .ctx-sheet-head');
    const rect = sheet.getBoundingClientRect();
    const headTopBefore =
      head === null ? null : kit.round(head.getBoundingClientRect().top);
    let headTopAfterScroll = headTopBefore;
    if (body !== null) {
      const was = body.scrollTop;
      body.scrollTop = body.scrollHeight;
      headTopAfterScroll =
        head === null ? null : kit.round(head.getBoundingClientRect().top);
      body.scrollTop = was;
    }
    const btnRect = btn === null ? null : btn.getBoundingClientRect();
    const hard = document.querySelector(
      '.ctx-install-sheet .ctxd-install-control .ctxd-error'
    );
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      sheetWidth: kit.round(rect.width),
      sheetHeight: kit.round(rect.height),
      sheetScrollTop: sheet.scrollTop,
      sheetScrollHeight: sheet.scrollHeight,
      sheetClientHeight: sheet.clientHeight,
      sheetOverflowY: getComputedStyle(sheet).overflowY,
      previewScrollHeight: body === null ? null : body.scrollHeight,
      previewClientHeight: body === null ? null : body.clientHeight,
      previewColumns:
        body === null ? null : getComputedStyle(body).gridTemplateColumns,
      previewOverflowY:
        body === null ? null : getComputedStyle(body).overflowY,
      remoteHeight:
        remote === null ? null : kit.round(remote.getBoundingClientRect().height),
      remoteScrollHeight: remote === null ? null : remote.scrollHeight,
      remoteClientHeight: remote === null ? null : remote.clientHeight,
      buttonText: btn === null ? null : btn.textContent,
      buttonDisabled: btn === null ? null : btn.disabled,
      buttonTop: btnRect === null ? null : kit.round(btnRect.top),
      buttonBottom: btnRect === null ? null : kit.round(btnRect.bottom),
      buttonFromSheetTop:
        btnRect === null
          ? null
          : kit.round(btnRect.top - rect.top + sheet.scrollTop),
      hardBlocker: hard === null ? null : hard.textContent,
      headTopBefore,
      headTopAfterScroll
    };
  };

  // The search step. The head, the field and the telemetry sentence have to
  // stay on screen while only the results list scrolls.
  kit.measureSearch = () => {
    const sheet = kit.sheet();
    if (sheet === null) return { error: 'no .ctx-install-sheet on screen' };
    const hits = sheet.querySelector('.ctx-sheet-hits');
    const note = sheet.querySelector('.ctx-sheet-note');
    const field = sheet.querySelector('.ctx-sheet-search');
    const noteRect = note === null ? null : note.getBoundingClientRect();
    let noteOnScreen = null;
    if (noteRect !== null) {
      const hit = document.elementFromPoint(
        noteRect.left + 4,
        noteRect.top + noteRect.height / 2
      );
      noteOnScreen = hit !== null && (hit === note || note.contains(hit));
    }
    return {
      innerHeight: window.innerHeight,
      sheetScrollHeight: sheet.scrollHeight,
      sheetClientHeight: sheet.clientHeight,
      hitRows: sheet.querySelectorAll('.ctx-sheet-hit').length,
      hitsScrollHeight: hits === null ? null : hits.scrollHeight,
      hitsClientHeight: hits === null ? null : hits.clientHeight,
      fieldTop: field === null ? null : kit.round(field.getBoundingClientRect().top),
      noteBottom: noteRect === null ? null : kit.round(noteRect.bottom),
      noteOnScreen
    };
  };

  kit.measureConfirm = () => {
    const modal = document.querySelector('.ctxd-install-modal');
    if (modal === null) return { error: 'no .ctxd-install-modal on screen' };
    const btn = modal.querySelector('.modal-actions .btn-primary');
    const rect = modal.getBoundingClientRect();
    const btnRect = btn === null ? null : btn.getBoundingClientRect();
    const line = modal.querySelector('.ctxd-command-line');
    // The confirm is its own scroller, so "inside the viewport" is not the
    // question on its own. A button can sit inside the window and still be
    // clipped by the modal's own overflow, so this reads the pixel: whether
    // the element the browser hit-tests at the button's centre IS the button.
    let onScreen = null;
    if (btnRect !== null) {
      const hit = document.elementFromPoint(
        btnRect.left + btnRect.width / 2,
        btnRect.top + btnRect.height / 2
      );
      onScreen = hit !== null && (hit === btn || btn.contains(hit));
    }
    return {
      innerHeight: window.innerHeight,
      modalWidth: kit.round(rect.width),
      modalHeight: kit.round(rect.height),
      modalTop: kit.round(rect.top),
      modalBottom: kit.round(rect.bottom),
      modalScrollTop: modal.scrollTop,
      modalScrollHeight: modal.scrollHeight,
      modalClientHeight: modal.clientHeight,
      buttonText: btn === null ? null : btn.textContent,
      buttonBottom: btnRect === null ? null : kit.round(btnRect.bottom),
      buttonInsideViewport:
        btnRect === null ? null : btnRect.bottom <= window.innerHeight,
      buttonOnScreen: onScreen,
      commandLine: line === null ? null : line.textContent
    };
  };

  // -- the stress on band 2 -------------------------------------------------
  // The control band is the one region this phase pins in place, and its height
  // is not fixed. It carries one row per acknowledgement and one per refusal
  // above the button. A person reaches four children with an unaudited skill
  // previewed before an agent is ticked while offline, and any skill whose scan
  // finds executable content adds another. These rows are the probe's own DOM
  // nodes, built here from the real message strings in install-gate.ts, and
  // removed again straight after the reading. No product file gains a hook.
  kit.stressed = [];
  kit.stressText = [
    'No scanner has looked at this skill.',
    'A scanner rated this skill elevated.',
    'This skill changed since you approved it. Its contents no longer match ' +
      'what you installed. It is disabled until you review it.',
    'Installing fetches the skill from its source, so it needs a connection.',
    'Tortie could not read this skill, so it cannot say what runs when it ' +
      'loads. It does not install what it has not read.',
    'This skill carries content that runs with your permissions, so Tortie ' +
      'will not install it.'
  ];
  kit.stress = (rows) => {
    kit.unstress();
    const control = kit.control();
    const btn = kit.primary();
    if (control === null || btn === null) return { error: 'no control on screen' };
    const existing = control.querySelectorAll('.ctxd-ack, .ctxd-error').length;
    for (let i = existing; i < rows; i += 1) {
      const label = document.createElement('label');
      label.className = 'ctxd-ack';
      label.dataset.p132 = 'stress';
      const box = document.createElement('input');
      box.type = 'checkbox';
      const span = document.createElement('span');
      span.textContent = kit.stressText[i % kit.stressText.length];
      label.appendChild(box);
      label.appendChild(span);
      control.insertBefore(label, btn);
      kit.stressed.push(label);
    }
    return { rows: control.querySelectorAll('.ctxd-ack, .ctxd-error').length };
  };
  kit.unstress = () => {
    for (const node of kit.stressed) {
      if (node.parentNode !== null) node.parentNode.removeChild(node);
    }
    kit.stressed = [];
    return true;
  };

  // What the control band is doing, read as pixels rather than as CSS. The
  // question is not whether the button is inside the window. It is whether the
  // browser hit-tests the button at the button's own centre, and whether the
  // button's box is inside the sheet's box, because the sheet clips.
  kit.measureControl = () => {
    const sheet = kit.sheet();
    const control = kit.control();
    if (sheet === null || control === null) {
      return { error: 'no sheet or no control on screen' };
    }
    const btn = kit.primary();
    const sheetRect = sheet.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();
    const btnRect = btn === null ? null : btn.getBoundingClientRect();
    const style = getComputedStyle(control);
    let onScreen = null;
    if (btnRect !== null && btnRect.width > 0 && btnRect.height > 0) {
      const hit = document.elementFromPoint(
        btnRect.left + btnRect.width / 2,
        btnRect.top + btnRect.height / 2
      );
      onScreen = hit !== null && (hit === btn || btn.contains(hit));
    }
    return {
      innerHeight: window.innerHeight,
      rows: control.querySelectorAll('.ctxd-ack, .ctxd-error').length,
      children: control.children.length,
      stressLeft: control.querySelectorAll('[data-p132="stress"]').length,
      flexDirection: style.flexDirection,
      flexWrap: style.flexWrap,
      controlWidth: kit.round(controlRect.width),
      controlHeight: kit.round(controlRect.height),
      controlRight: kit.round(controlRect.right),
      sheetRight: kit.round(sheetRect.right),
      sheetBottom: kit.round(sheetRect.bottom),
      sheetScrollWidth: sheet.scrollWidth,
      sheetClientWidth: sheet.clientWidth,
      sheetScrollHeight: sheet.scrollHeight,
      sheetClientHeight: sheet.clientHeight,
      buttonBottom: btnRect === null ? null : kit.round(btnRect.bottom),
      buttonRight: btnRect === null ? null : kit.round(btnRect.right),
      buttonInsideSheet:
        btnRect === null
          ? null
          : btnRect.right <= sheetRect.right + 0.5 &&
            btnRect.bottom <= sheetRect.bottom + 0.5,
      buttonOnScreen: onScreen
    };
  };

  // Phase 132.1. The fleet section, read as pixels. The entry's "show the
  // agent grid whole" is a picture, and this turns it into a number. The band
  // is scrolled to its top first, because the question is what a person sees
  // when the sheet opens rather than what they can reach by scrolling.
  kit.measureFleet = () => {
    const body = kit.previewBody();
    if (body === null) return { error: 'no .ctxd-preview-body on screen' };
    const section = document.querySelector(
      '.ctx-install-sheet .ctxd-preview-section[data-section="who-gets-it"]'
    );
    if (section === null) {
      return { error: 'no who-gets-it section on screen' };
    }
    const was = body.scrollTop;
    body.scrollTop = 0;
    const grid = section.querySelector('.ctxd-targets');
    const sectionRect = section.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const gridRect = grid === null ? null : grid.getBoundingClientRect();
    const reading = {
      bodyTop: kit.round(bodyRect.top),
      bodyBottom: kit.round(bodyRect.bottom),
      bodyClientHeight: body.clientHeight,
      bodyScrollHeight: body.scrollHeight,
      sectionTop: kit.round(sectionRect.top),
      sectionBottom: kit.round(sectionRect.bottom),
      sectionHeight: kit.round(sectionRect.height),
      gridBottom: gridRect === null ? null : kit.round(gridRect.bottom),
      gridHeight: gridRect === null ? null : kit.round(gridRect.height),
      targets: section.querySelectorAll('.ctxd-target').length,
      // THE GRID is what the entry asks to see whole. The SECTION also holds
      // the notes that name the agents the skills CLI has no name for, and
      // those are two sentences below the grid rather than part of it.
      gridWhole:
        gridRect === null ? null : gridRect.bottom <= bodyRect.bottom + 0.5,
      sectionWhole: sectionRect.bottom <= bodyRect.bottom + 0.5
    };
    body.scrollTop = was;
    return reading;
  };

  window.__p132 = kit;
  return true;
})()
`;

// -- the run -----------------------------------------------------------------

/** Every reading, keyed by what it measured. Printed as one table at the end. */
const readings = {};
/** Every check, with the number that decided it. */
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
}

function seedScratch() {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  mkdirSync(projectDir, { recursive: true });
  // A file, so the project reads as a real folder rather than an empty one.
  writeFileSync(join(projectDir, 'README.md'), '# p132 scratch project\n', 'utf8');
  log(`seeded ${scratch}`);
}

async function waitFor(cdp, expression, whatFor, timeoutMs = 60_000) {
  for (let waited = 0; waited < timeoutMs; waited += 400) {
    const ok = await cdpEval(cdp, expression);
    if (ok === true) return true;
    await sleep(400);
  }
  return fail(`${whatFor} never happened within ${timeoutMs / 1000} s`);
}

async function setViewport(cdp, width, height) {
  await cdp.call('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(700);
}

async function main() {
  seedScratch();

  const logStream = createWriteStream(appLogPath, { flags: 'w' });
  const child = spawn(
    electronBin,
    [
      '.',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      '-ApplePersistenceIgnoreState',
      'YES'
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        // `activeTmuxSocket` honours GMUX_TMUX_SOCKET only on a harness launch,
        // and a harness launch is GMUX_SMOKE, GMUX_SHOT or
        // GMUX_UPDATE_REHEARSAL. GMUX_SHOT would hand the process to `runShot`,
        // which photographs and exits before CDP could drive anything, so this
        // uses the same term the other CDP probes here use.
        GMUX_UPDATE_REHEARSAL: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  appPid = child.pid;
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  child.on('exit', () => {
    appExited = true;
  });
  log(`launched the dev app, pid ${appPid}, log ${appLogPath}`);

  let cdp;
  try {
    cdp = await cdpForProfile(profile, 60_000);
  } catch (err) {
    return fail(err.message);
  }

  await waitFor(
    cdp,
    "typeof window.__gmuxShotDrive === 'function'",
    'the drive hook'
  );
  const ignored = assertHarnessLaunch();
  if (ignored !== null) return fail(ignored);
  log('the app honoured the harness socket, so the operator server was untouched');

  await setViewport(cdp, WIDE, HEIGHTS[0]);

  // Open the scratch project with the Context view live. `context: { live: true }`
  // is the shipped drive spec, so the sidebar shows what the real reader found
  // rather than a fixture, which is what makes the agent list real.
  await cdpEval(
    cdp,
    `window.__gmuxShotDrive(${JSON.stringify({
      projectPath: projectDir,
      context: { live: true, width: 340 }
    })}).then(() => true)`,
    true
  );
  await waitFor(cdp, "document.querySelector('.ctx-sections') !== null", 'the Context view');
  log('the Context view is up on the scratch project');

  await cdpEval(cdp, PAGE_KIT);
  log('the page kit and the clipboard spy are installed');

  // --- open the sheet by the real control ----------------------------------
  const typed = await cdpEval(
    cdp,
    `(() => {
      const el = document.querySelector('input[aria-label="Search skills.sh for a new skill"]');
      if (el === null) return 'no search box in the Context view';
      window.__p132.setInput(el, ${JSON.stringify(query)});
      return 'ok';
    })()`
  );
  if (typed !== 'ok') return fail(String(typed));
  await sleep(300);
  const submitted = await cdpEval(
    cdp,
    `(() => {
      const el = document.querySelector('input[aria-label="Search skills.sh for a new skill"]');
      const form = el === null ? null : el.closest('form');
      if (form === null) return 'no form around the search box';
      form.requestSubmit();
      return 'ok';
    })()`
  );
  if (submitted !== 'ok') return fail(String(submitted));
  await waitFor(cdp, "document.querySelector('.ctx-install-sheet') !== null", 'the sheet');
  await waitFor(
    cdp,
    "document.querySelectorAll('.ctx-sheet-hit').length > 0 || " +
      "document.querySelector('.ctx-install-sheet .ctxd-error') !== null",
    'the search results'
  );
  const searchProblem = await cdpEval(
    cdp,
    "(() => { const e = document.querySelector('.ctx-install-sheet .ctxd-error');" +
      ' return e === null ? null : e.textContent; })()'
  );
  if (searchProblem !== null) {
    return fail(
      `the registry was not reachable, so nothing below is proven: ${String(searchProblem)}`
    );
  }
  // The search step, at the tightest window, before anything is chosen.
  readings.search = {};
  for (const height of HEIGHTS) {
    await setViewport(cdp, WIDE, height);
    const m = await cdpEval(cdp, 'window.__p132.measureSearch()');
    readings.search[height] = m;
    log(`search step at ${height} px: ${JSON.stringify(m)}`);
    await screenshot(cdp, `p132-${phase}-search-${height}.png`);
    check(
      `search at ${height} px: the sheet does not scroll`,
      m.sheetScrollHeight === m.sheetClientHeight,
      `scrollHeight ${m.sheetScrollHeight} against clientHeight ${m.sheetClientHeight}`
    );
    check(
      `search at ${height} px: the telemetry sentence is on screen`,
      m.noteOnScreen === true,
      `note bottom ${m.noteBottom}, viewport ${m.innerHeight}, ` +
        `${m.hitRows} rows, hits ${m.hitsScrollHeight}/${m.hitsClientHeight}`
    );
  }

  // One reading BELOW the app's own minimum window, and it is a diagnostic
  // rather than a photograph. The registry returned ten rows, which fit inside
  // the sheet at every real height, so nothing above exercises the results
  // scroller. This forces it: the sentence under the list must still be on
  // screen when the list itself has to scroll.
  await setViewport(cdp, WIDE, 420);
  const cramped = await cdpEval(cdp, 'window.__p132.measureSearch()');
  readings.search[420] = cramped;
  log(`search step at 420 px (below the app minimum): ${JSON.stringify(cramped)}`);
  check(
    'search at 420 px: the results list is the one thing that scrolls',
    cramped.sheetScrollHeight === cramped.sheetClientHeight &&
      cramped.hitsScrollHeight > cramped.hitsClientHeight &&
      cramped.noteOnScreen === true,
    `sheet ${cramped.sheetScrollHeight}/${cramped.sheetClientHeight}, ` +
      `hits ${cramped.hitsScrollHeight}/${cramped.hitsClientHeight}, ` +
      `note bottom ${cramped.noteBottom} against viewport ${cramped.innerHeight}`
  );
  await setViewport(cdp, WIDE, HEIGHTS[0]);

  const chosen = await cdpEval(
    cdp,
    `(() => {
      const row = document.querySelector('.ctx-sheet-hit');
      if (row === null) return null;
      const name = row.querySelector('.ctx-sheet-hit-name').textContent;
      const source = row.querySelector('.ctx-sheet-hit-source').textContent;
      row.click();
      return { name, source };
    })()`
  );
  if (chosen === null) return fail('the search returned no rows');
  readings.chosen = chosen;
  log(`chose the first result: ${chosen.name} from ${chosen.source}`);

  await waitFor(
    cdp,
    "document.querySelector('.ctx-install-sheet .ctxd-preview') !== null",
    'the preview card',
    90_000
  );
  await sleep(1200);

  // --- step 1 and 2. the three heights -------------------------------------
  readings.heights = {};
  for (const height of HEIGHTS) {
    await setViewport(cdp, WIDE, height);
    const m = await cdpEval(cdp, 'window.__p132.measure()');
    readings.heights[height] = m;
    log(`${height} px: ${JSON.stringify(m)}`);
    await screenshot(cdp, `p132-${phase}-${height}.png`);
  }

  // --- the width claim ------------------------------------------------------
  await setViewport(cdp, WIDE, HEIGHTS[0]);
  const wide = await cdpEval(cdp, 'window.__p132.measure()');
  await setViewport(cdp, NARROW, HEIGHTS[0]);
  const narrow = await cdpEval(cdp, 'window.__p132.measure()');
  await setViewport(cdp, WIDE, HEIGHTS[0]);
  readings.width = {
    wideViewport: WIDE,
    wideSheet: wide.sheetWidth,
    widePreviewScrollHeight: wide.previewScrollHeight,
    wideColumns: wide.previewColumns,
    narrowViewport: NARROW,
    narrowSheet: narrow.sheetWidth,
    narrowPreviewScrollHeight: narrow.previewScrollHeight,
    narrowColumns: narrow.previewColumns
  };
  log(`width: ${JSON.stringify(readings.width)}`);

  // --- step 3. the driven install ------------------------------------------
  if (!skipInstall) {
    const ticked = await cdpEval(
      cdp,
      `(() => {
        const boxes = [...document.querySelectorAll(
          '.ctx-install-sheet .ctxd-target input[type="checkbox"]'
        )].filter((b) => !b.disabled);
        if (boxes.length < 2) return { error: 'fewer than two agents are installable here' };
        const names = [];
        for (const box of boxes.slice(0, 2)) {
          box.click();
          names.push(box.closest('.ctxd-target').textContent);
        }
        return { names };
      })()`
    );
    if (ticked.error !== undefined) return fail(ticked.error);
    readings.agents = ticked.names;
    log(`ticked two agents: ${ticked.names.join(' and ')}`);

    const scoped = await cdpEval(
      cdp,
      `(() => {
        const label = [...document.querySelectorAll('.ctx-sheet-scope label')].find(
          (l) => l.textContent.trim() === 'This project only'
        );
        if (label === undefined) return 'no "This project only" control';
        const input = label.querySelector('input');
        if (input.disabled) return 'the project scope is disabled, so there is no project root';
        input.click();
        return 'ok';
      })()`
    );
    if (scoped !== 'ok') return fail(String(scoped));
    log('chose "This project only"');

    await waitFor(
      cdp,
      "(() => { const t = window.__p132.commandLine(); return t !== null && t.indexOf(' add ') !== -1; })()",
      'the plan'
    );

    // The SECOND set of photographs, and it is the one that matters most. With
    // two agents ticked the control carries the acknowledgements and the
    // command section carries a real command line, so the sheet is at its
    // tallest and the button sits at its lowest. This is the state a person is
    // in at the moment they want to press it.
    readings.plannedHeights = {};
    for (const height of HEIGHTS) {
      await setViewport(cdp, WIDE, height);
      const m = await cdpEval(cdp, 'window.__p132.measure()');
      readings.plannedHeights[height] = m;
      log(`planned, ${height} px: ${JSON.stringify(m)}`);
      await screenshot(cdp, `p132-${phase}-planned-${height}.png`);
    }

    // --- Phase 132.1. The balance between band 1 and band 3 ----------------
    // The tightest window is the one that decides this, because that is where
    // the two bands compete. Phase 132 gave the facts band a 96 px floor and
    // the raw text band a 240 px cap, and at 586 px the facts band drew 95 px
    // against the raw band's 175.5 px. The person was given more of the text
    // they had not started reading than of the two facts the decision needs,
    // being which agents get the skill and what will run. This check fails on
    // Phase 132's numbers, which is the point of writing it.
    const tightest = HEIGHTS[HEIGHTS.length - 1];
    const balance = readings.plannedHeights[tightest];
    check(
      `planned, ${tightest} px: the facts and the plan get more room than the raw skill text`,
      balance.previewClientHeight > balance.remoteClientHeight,
      `facts and plan ${balance.previewClientHeight} px against raw text ` +
        `${balance.remoteClientHeight} px`
    );

    // The fleet section is whole, at the tightest window, without scrolling.
    await setViewport(cdp, WIDE, tightest);
    const fleet = await cdpEval(cdp, 'window.__p132.measureFleet()');
    readings.fleet = fleet;
    log(`fleet at ${tightest} px: ${JSON.stringify(fleet)}`);
    check(
      `planned, ${tightest} px: the agent grid is whole without scrolling the band`,
      fleet.gridWhole === true,
      `grid bottom ${fleet.gridBottom} against band bottom ` +
        `${fleet.bodyBottom}, grid ${fleet.gridHeight} px tall with ` +
        `${fleet.targets} agent rows, band ${fleet.bodyClientHeight} px tall. ` +
        `The whole section, being the grid plus the notes that name the ` +
        `agents the skills CLI has no name for, is ${fleet.sectionHeight} px ` +
        `tall and its bottom is at ${fleet.sectionBottom}, so the notes are ` +
        `${String(fleet.sectionWhole ? 'also' : 'not')} inside the band.`
    );

    // The control band draws a column at both widths this probe drives. Phase
    // 132.1 deleted the `flex-direction: row` the container query used to
    // state, so this is the answer at every container width rather than only
    // below the query's 680 px threshold.
    readings.controlDirection = {};
    for (const width of [WIDE, NARROW]) {
      await setViewport(cdp, width, tightest);
      const m = await cdpEval(cdp, 'window.__p132.measureControl()');
      const columns = await cdpEval(
        cdp,
        `(() => { const b = window.__p132.previewBody(); return b === null ? null : getComputedStyle(b).gridTemplateColumns; })()`
      );
      readings.controlDirection[width] = { ...m, previewColumns: columns };
      log(`control at ${width} px wide: ${JSON.stringify(m)}, preview columns ${String(columns)}`);
      check(
        `the control band is a column at a ${width} px viewport`,
        m.flexDirection === 'column' && m.flexWrap === 'nowrap',
        `flex-direction ${m.flexDirection}, flex-wrap ${m.flexWrap}, ` +
          `preview columns ${String(columns)}, ` +
          `button bottom ${m.buttonBottom}, inside the sheet ${String(m.buttonInsideSheet)}`
      );
    }
    await setViewport(cdp, WIDE, tightest);

    // --- the stress on the control band, at the tightest window -------------
    // WHY THIS EXISTS. The first verification of this phase found a regression
    // the readings above were blind to. The container query in install.css put
    // `flex-wrap: wrap` on the control, and surface.css's `flex-direction:
    // column` landed after it in the bundled stylesheet, so the band was a
    // wrapping column. Phase 132.1 deleted that wrap and repaired the ordering,
    // and these two readings are what say so. A wrapping column only wraps when its height is
    // constrained, and this phase is what constrains it. At a 586 px viewport
    // with four children the rows wrapped into side by side columns and the
    // button left the sheet's box, with the sheet reading 536/536, so no
    // scrollbar appeared in either direction and nothing above noticed. These
    // two readings are what make the one-line fix checkable.
    readings.stress = {};
    await setViewport(cdp, WIDE, HEIGHTS[HEIGHTS.length - 1]);
    for (const rows of [4, 6]) {
      const injected = await cdpEval(cdp, `window.__p132.stress(${rows})`);
      if (injected.error !== undefined) return fail(String(injected.error));
      await sleep(300);
      const m = await cdpEval(cdp, 'window.__p132.measureControl()');
      readings.stress[rows] = m;
      log(`stress, ${rows} rows at ${m.innerHeight} px: ${JSON.stringify(m)}`);
      await screenshot(
        cdp,
        `p132-${phase}-stress-${HEIGHTS[HEIGHTS.length - 1]}-${rows}rows.png`
      );
      check(
        `stress, ${rows} rows at ${m.innerHeight} px: the control band is one column`,
        m.flexWrap === 'nowrap',
        `flex-direction ${m.flexDirection}, flex-wrap ${m.flexWrap}, ` +
          `${m.rows} rows, ${m.children} children`
      );
      check(
        `stress, ${rows} rows at ${m.innerHeight} px: the button is hit-tested at its own centre`,
        m.buttonOnScreen === true && m.buttonInsideSheet === true,
        `button bottom ${m.buttonBottom}, right ${m.buttonRight}, ` +
          `sheet bottom ${m.sheetBottom}, right ${m.sheetRight}, ` +
          `inside the sheet ${String(m.buttonInsideSheet)}`
      );
      check(
        `stress, ${rows} rows at ${m.innerHeight} px: nothing runs off the sheet sideways`,
        m.sheetScrollWidth === m.sheetClientWidth,
        `sheet scrollWidth ${m.sheetScrollWidth} against clientWidth ${m.sheetClientWidth}, ` +
          `control right ${m.controlRight} against sheet right ${m.sheetRight}`
      );
      await cdpEval(cdp, 'window.__p132.unstress()');
      await sleep(200);
    }
    const recovered = await cdpEval(cdp, 'window.__p132.measureControl()');
    readings.stressRecovered = recovered;
    check(
      'the probe left no injected rows behind, and the button is still reachable',
      recovered.stressLeft === 0 && recovered.buttonOnScreen === true,
      `${recovered.stressLeft} injected rows left, ${recovered.rows} real rows, ` +
        `button bottom ${recovered.buttonBottom}`
    );

    await setViewport(cdp, WIDE, HEIGHTS[0]);

    const previewCommand = await cdpEval(cdp, 'window.__p132.commandLine()');
    readings.previewCommand = previewCommand;

    // --- step 4a. the preview's copy control -------------------------------
    const copiedPreview = await cdpEval(
      cdp,
      `(() => {
        const btn = [...document.querySelectorAll('.ctx-install-sheet button')].find(
          (b) => b.textContent === 'Copy the command'
        );
        if (btn === undefined) return null;
        window.__p132.copied.length = 0;
        btn.click();
        return window.__p132.copied[0] ?? null;
      })()`
    );
    readings.copiedPreview = copiedPreview;
    check(
      'the preview copies the command it shows',
      copiedPreview !== null && copiedPreview === previewCommand,
      copiedPreview === previewCommand ? 'byte for byte equal' : 'they differ'
    );

    // --- open the confirm --------------------------------------------------
    const opened = await cdpEval(
      cdp,
      `(() => {
        const btn = window.__p132.primary();
        if (btn === null) return 'no primary control on the sheet';
        if (btn.disabled) {
          const hard = document.querySelector(
            '.ctx-install-sheet .ctxd-install-control .ctxd-error'
          );
          return 'the primary control is disabled: ' + (hard === null ? 'no reason shown' : hard.textContent);
        }
        btn.click();
        return 'ok';
      })()`
    );
    if (opened !== 'ok') return fail(String(opened));
    await waitFor(
      cdp,
      "document.querySelector('.ctxd-install-modal') !== null",
      'the confirm'
    );
    log('the confirm opened, and nothing has spawned yet');

    readings.confirm = {};
    for (const height of HEIGHTS) {
      await setViewport(cdp, WIDE, height);
      const c = await cdpEval(cdp, 'window.__p132.measureConfirm()');
      readings.confirm[height] = c;
      log(`confirm at ${height} px: ${JSON.stringify(c)}`);
      await screenshot(cdp, `p132-${phase}-confirm-${height}.png`);
    }
    await setViewport(cdp, WIDE, HEIGHTS[0]);

    for (const height of HEIGHTS) {
      const c = readings.confirm[height];
      check(
        `confirm at ${height} px: the primary control is on screen without scrolling it`,
        c.buttonOnScreen === true,
        `button bottom ${c.buttonBottom}, modal visible bottom ${c.modalBottom}, ` +
          `viewport ${c.innerHeight}, modal ${c.modalScrollHeight}/${c.modalClientHeight}`
      );
    }

    const confirmCommand = readings.confirm[HEIGHTS[0]].commandLine;
    readings.confirmCommand = confirmCommand;
    check(
      'the confirm shows the command the preview showed',
      confirmCommand === previewCommand,
      confirmCommand === previewCommand
        ? 'byte for byte equal'
        : `preview ${JSON.stringify(previewCommand)} against confirm ${JSON.stringify(confirmCommand)}`
    );

    // --- step 4b. the confirm's copy control -------------------------------
    const copiedConfirm = await cdpEval(
      cdp,
      `(() => {
        const btn = [...document.querySelectorAll('.ctxd-install-modal button')].find(
          (b) => b.textContent === 'Copy'
        );
        if (btn === undefined) return null;
        window.__p132.copied.length = 0;
        btn.click();
        return window.__p132.copied[0] ?? null;
      })()`
    );
    readings.copiedConfirm = copiedConfirm;
    check(
      'the confirm copies the command it shows',
      copiedConfirm !== null && copiedConfirm === confirmCommand,
      copiedConfirm === confirmCommand ? 'byte for byte equal' : 'they differ'
    );

    // --- the one call that spawns ------------------------------------------
    const skillsRoot = join(projectDir, '.claude', 'skills');
    const before = existsSync(skillsRoot);
    const ran = await cdpEval(
      cdp,
      `(() => {
        const btn = document.querySelector('.ctxd-install-modal .modal-actions .btn-primary');
        if (btn === null) return 'no primary control on the confirm';
        if (btn.disabled) return 'the confirm primary is disabled';
        const label = btn.textContent;
        btn.click();
        return 'ok:' + label;
      })()`
    );
    if (!String(ran).startsWith('ok')) return fail(String(ran));
    log(`clicked the confirm's ${String(ran).slice(3)} control`);

    let landed = null;
    for (let waited = 0; waited < 180_000; waited += 1000) {
      if (existsSync(skillsRoot)) {
        const names = readdirSync(skillsRoot);
        const withFile = names.find((n) =>
          existsSync(join(skillsRoot, n, 'SKILL.md'))
        );
        if (withFile !== undefined) {
          landed = join(skillsRoot, withFile, 'SKILL.md');
          break;
        }
      }
      await sleep(1000);
    }
    readings.installedPath = landed;
    check(
      'a real install landed in the scratch project',
      landed !== null,
      landed === null
        ? `nothing under ${skillsRoot} after 180 s (existed before: ${before})`
        : landed
    );
    const failureText = await cdpEval(
      cdp,
      "(() => { const e = document.querySelector('.ctxd-failure');" +
        ' return e === null ? null : e.textContent; })()'
    );
    if (failureText !== null) log(`the confirm reported a failure: ${String(failureText)}`);
    const appLog = readFileSync(appLogPath, 'utf8');
    const spawnLine = appLog
      .split('\n')
      .filter((l) => l.includes('cli.mjs') || l.includes('skills'))
      .slice(-4)
      .join('\n');
    readings.spawnLog = spawnLine;
    log(`the app log's last skills lines:\n${spawnLine}`);
  } else {
    log('--no-install: the driven install was skipped for this run');
  }

  // --- the checks the AFTER run must hold ----------------------------------
  const sets = [['opened', readings.heights]];
  if (readings.plannedHeights !== undefined) {
    sets.push(['planned', readings.plannedHeights]);
  }
  for (const [state, set] of sets) {
  for (const height of HEIGHTS) {
    const m = set[height];
    check(
      `${state}, ${height} px: the sheet does not scroll`,
      m.sheetScrollHeight === m.sheetClientHeight,
      `scrollHeight ${m.sheetScrollHeight} against clientHeight ${m.sheetClientHeight}`
    );
    // Phase 132.1 split this in two. Phase 132 asserted that the facts band
    // OVERFLOWS at every height and in every state, and that assertion started
    // failing at 900 px with no agents ticked, because this phase gave the
    // band 96 px more and its content now fits. An assertion that the band
    // must always overflow forbids the improvement. What Phase 132 was proving
    // is that the band is the region that scrolls and the sheet is not, so
    // that is what is asserted at every height, and the overflow itself is
    // asserted at the tightest window, which is where the claim has to hold.
    check(
      `${state}, ${height} px: the facts band is the region that scrolls, not the sheet`,
      m.previewOverflowY === 'auto' && m.sheetOverflowY === 'hidden',
      `preview overflow-y ${String(m.previewOverflowY)}, sheet overflow-y ` +
        `${String(m.sheetOverflowY)}, preview scrollHeight ` +
        `${m.previewScrollHeight} against clientHeight ${m.previewClientHeight}`
    );
    if (height === HEIGHTS[HEIGHTS.length - 1]) {
      check(
        `${state}, ${height} px: the preview scrolls inside itself`,
        m.previewScrollHeight > m.previewClientHeight,
        `preview scrollHeight ${m.previewScrollHeight} against clientHeight ${m.previewClientHeight}`
      );
    }
    check(
      `${state}, ${height} px: the button is inside the viewport with no sheet scroll`,
      m.sheetScrollTop === 0 && m.buttonBottom !== null && m.buttonBottom <= m.innerHeight && m.buttonTop >= 0,
      `button top ${m.buttonTop}, bottom ${m.buttonBottom}, viewport ${m.innerHeight}, sheet scrollTop ${m.sheetScrollTop}`
    );
    check(
      `${state}, ${height} px: the raw SKILL.md is a bounded box that scrolls`,
      m.remoteHeight !== null && m.remoteHeight <= 144 && m.remoteScrollHeight > m.remoteClientHeight,
      `remote box ${m.remoteHeight} px tall, scrollHeight ${m.remoteScrollHeight} against clientHeight ${m.remoteClientHeight}`
    );
    check(
      `${state}, ${height} px: the head stays put when the preview is scrolled`,
      m.headTopBefore === m.headTopAfterScroll,
      `head top ${m.headTopBefore} before and ${m.headTopAfterScroll} after`
    );
    check(
      `${state}, ${height} px: the preview still reads as two columns`,
      typeof m.previewColumns === 'string' && m.previewColumns.trim().split(/\s+/).length === 2,
      `gridTemplateColumns ${m.previewColumns}`
    );
  }
  }
  check(
    'the sheet is 1120 px wide at a 1440 px viewport',
    readings.width.wideSheet === 1120,
    `${readings.width.wideSheet} px`
  );
  check(
    'the guard still shrinks the sheet in a narrow window',
    readings.width.narrowSheet === NARROW - 48,
    `${readings.width.narrowSheet} px at a ${NARROW} px viewport`
  );
  check(
    'the columns survive at the narrow width',
    typeof readings.width.narrowColumns === 'string' &&
      readings.width.narrowColumns.trim().split(/\s+/).length === 2,
    `gridTemplateColumns ${readings.width.narrowColumns}`
  );

  // -- the report ------------------------------------------------------------
  console.log('');
  console.log(`${TAG} ==== ${phase} ====`);
  console.log(`${TAG} skill: ${readings.chosen.name} from ${readings.chosen.source}`);
  console.log(
    `${TAG} state | height | sheet scroll | button bottom | viewport | button from sheet top | preview scroll | remote box`
  );
  for (const [state, set] of sets) {
  for (const height of HEIGHTS) {
    const m = set[height];
    console.log(
      `${TAG} ${state.padEnd(7)} | ${String(height).padStart(6)} | ` +
        `${String(m.sheetScrollHeight)}/${String(m.sheetClientHeight)} | ` +
        `${String(m.buttonBottom)} | ${String(m.innerHeight)} | ` +
        `${String(m.buttonFromSheetTop)} | ` +
        `${String(m.previewScrollHeight)}/${String(m.previewClientHeight)} | ` +
        `${String(m.remoteHeight)}`
    );
  }
  }
  console.log(`${TAG} readings: ${JSON.stringify(readings, null, 2)}`);
  const failed = checks.filter((c) => !c.ok);
  console.log(`${TAG} ${checks.length - failed.length} checks passed, ${failed.length} failed`);

  if (phase === 'after' && failed.length > 0) {
    for (const c of failed) console.error(`${TAG} FAILED CHECK ${c.name} — ${c.detail}`);
    return finish(1);
  }
  if (phase !== 'after' && failed.length > 0) {
    console.log(
      `${TAG} this is the "${phase}" run, so a failed check above is the defect being recorded, not a regression`
    );
  }
  return finish(0);
}

main().catch(async (err) => {
  console.error(`${TAG} threw: ${err.stack ?? err.message}`);
  await finish(1);
});
