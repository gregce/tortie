#!/usr/bin/env node
/**
 * probe-finder-open.mjs. The Phase 61 live probe, reproducible from the repo.
 *
 * WHAT IT PROVES. Finder-shaped opens against a RUNNING dev instance. Each
 * open is delivered with an explicit app target, `open -a <the repo's own
 * Electron.app> <path>`, so LaunchServices routes by bundle path and not by
 * the shared dev bundle id. Seven legs, each proven from the profile's
 * manifest, the structured log at <profile>/logs/app.log, and a screenshot
 * taken over the DevTools protocol:
 *
 *  1. FOLDER      a git repository directory becomes a project row.
 *  2. GIT ROOT    a file two levels deep opens with the repository root as
 *                 its project, never its own directory, and the tab is the
 *                 markdown file, pinned rather than a preview.
 *  3. FALLBACK    a file with no repository above it opens with its parent
 *                 folder as the project.
 *  4. IMAGE       a png opens the image viewer.
 *  5. BINARY      a zip forced through still opens its project, and the tab
 *                 shows the existing no-viewer sentence.
 *  7. LAST FILE   (Phase 62.1) two files delivered back to back, a.md then
 *                 b.md, land focus on b.md, the LAST delivered file, with
 *                 the pane body as the second witness and a re-read two
 *                 seconds later so a transient sighting cannot pass. Ten
 *                 rounds, because the defect this pins showed once in three
 *                 runs. Round one delivers into a repository that is not a
 *                 project yet, which is the exact Phase 61 race shape. The
 *                 leg runs before the cap so the cap sweeps its opens too.
 * 7b. COALESCING (Phase 62.1 fix round) both files handed to ONE `open -a`
 *                 call, so both arrivals land in the same run loop turn.
 *                 That is the only shape that reaches the main-side slot's
 *                 replace path, and leg 7 above never does: its two calls
 *                 are hundreds of milliseconds apart and the renderer has
 *                 already pulled the first file. This leg asserts main wrote
 *                 "a newer shell open replaced a pending one" at least once
 *                 and that b.md alone is open and active.
 *  6. THE CAP     after all legs the manifest's session table holds zero
 *                 rows, and the probe's tmux socket shows nothing the opens
 *                 created.
 *
 * THE SECOND-INSTANCE GUARD. If LaunchServices does not recognize the
 * running instance, `open -a` starts a fresh Electron instead of delivering
 * the event. The probe counts processes running the repo's own Electron
 * binary before and after every open. A new pid is recorded, killed, and
 * fails the run, so a stray window never outlives the probe.
 *
 * SAFETY. The tmux socket is gmux-p61 and build/harness-socket.mjs refuses
 * the operator's socket by name. The profile lives under TMPDIR and is
 * deleted first. The operator's server is only ever LISTED, read-only, and
 * the count is printed before and after. The only processes killed are the
 * pids this script recorded.
 *
 * Usage:
 *   node build/probe-finder-open.mjs [--keep] [--skip-build]
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { createRequire } from 'node:module';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.includes('--keep');
const skipBuild = process.argv.includes('--skip-build');
const innerAt = process.argv.indexOf('--inner');

const SOCKET = 'gmux-p61';

/** Operator sessions on the REAL socket, read-only. Never anything else. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  if (out.status !== 0) return 0;
  return out.stdout.split('\n').filter((l) => l.trim().length > 0).length;
}

// ---------------------------------------------------------------------------
// Outer mode: build the fixtures, wrap the inner run in harness-socket
// ---------------------------------------------------------------------------

if (innerAt === -1) {
  const rawRoot = join(process.env['TMPDIR'] ?? tmpdir(), 'gmux-p61');
  rmSync(rawRoot, { recursive: true, force: true });
  mkdirSync(rawRoot, { recursive: true });
  mkdirSync(join(repoRoot, 'out'), { recursive: true });
  const root = realpathSync(rawRoot);

  // The fixture tree. A real git repository with a nested markdown file, a
  // real 1 by 1 png, and a zip whose bytes hold NULs; beside it a plain
  // folder with no repository anywhere above it (TMPDIR has none).
  const repo = join(root, 'repo');
  mkdirSync(join(repo, 'sub', 'dir'), { recursive: true });
  execFileSync('git', ['init', '--quiet', repo], { cwd: root });
  writeFileSync(
    join(repo, 'sub', 'dir', 'readme.md'),
    '# Phase 61 probe\n\nThis file arrived from Finder.\n'
  );
  writeFileSync(
    join(repo, 'pic.png'),
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQ' +
        'DwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
  );
  writeFileSync(
    join(repo, 'blob.zip'),
    Buffer.concat([Buffer.from('PK'), Buffer.alloc(64, 0)])
  );
  const plain = join(root, 'plain');
  mkdirSync(plain, { recursive: true });
  writeFileSync(join(plain, 'notes.txt'), 'Phase 61 probe notes.\n');
  // Leg 7's own repository. It stays untouched by legs 1 to 5, so round
  // one of the last-file leg opens a project that does not exist yet,
  // which is what made the first delivery slow in the Phase 61 race.
  const race = join(root, 'race');
  mkdirSync(race, { recursive: true });
  execFileSync('git', ['init', '--quiet', race], { cwd: root });
  writeFileSync(
    join(race, 'a.md'),
    '# a\n\nThe first delivered file. MARKER-A-FIRST.\n'
  );
  writeFileSync(
    join(race, 'b.md'),
    '# b\n\nThe last delivered file. MARKER-B-LAST.\n'
  );
  mkdirSync(join(root, 'profile'), { recursive: true });

  const before = operatorSessionCount();
  console.log(`[probe:finderopen] operator sessions before: ${before}`);

  if (!skipBuild) {
    execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit' });
  }

  const run = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      SOCKET,
      `node build/probe-finder-open.mjs --inner "${root}"`
    ],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        PATH: `${join(repoRoot, 'node_modules', '.bin')}:${process.env['PATH'] ?? ''}`
      }
    }
  );

  const after = operatorSessionCount();
  console.log(
    `[probe:finderopen] operator sessions after: ${after} (before: ${before})`
  );
  if (after !== before) {
    console.error(
      '[probe:finderopen] FAIL the operator session count changed during the run'
    );
    process.exit(1);
  }
  // A failing run keeps its evidence (the holder log lives under root).
  if (!keep && (run.status ?? 1) === 0) {
    rmSync(root, { recursive: true, force: true });
  }
  process.exit(run.status ?? 1);
}

// ---------------------------------------------------------------------------
// Inner mode: runs under harness-socket, GMUX_TMUX_SOCKET already set
// ---------------------------------------------------------------------------

const root = process.argv[innerAt + 1];
if (!root || !existsSync(root)) {
  console.error(`[probe:finderopen] inner: bad root ${root}`);
  process.exit(2);
}
if ((process.env['GMUX_TMUX_SOCKET'] ?? '') !== SOCKET) {
  console.error(
    '[probe:finderopen] inner: GMUX_TMUX_SOCKET is not set; run the outer mode'
  );
  process.exit(2);
}

const require2 = createRequire(join(repoRoot, 'package.json'));
const Database = require2('better-sqlite3');

const electronApp = join(
  repoRoot,
  'node_modules',
  'electron',
  'dist',
  'Electron.app'
);
const electronMainBinary = join(electronApp, 'Contents', 'MacOS', 'Electron');
const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');
const profile = join(root, 'profile');
const repo = join(root, 'repo');
const plain = join(root, 'plain');
const race = join(root, 'race');
const holderLogPath = join(root, 'holder.log');
const appLogPath = join(profile, 'logs', 'app.log');

const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Evidence readers
// ---------------------------------------------------------------------------

/** All project paths in the profile's manifest, [] until it exists. */
function manifestProjectPaths() {
  const dbPath = join(profile, 'gmux', 'manifest.db');
  if (!existsSync(dbPath)) return [];
  let db = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    return db
      .prepare('SELECT path FROM projects')
      .all()
      .map((row) => String(row.path));
  } catch {
    return [];
  } finally {
    db?.close();
  }
}

/** Rows in the manifest's session table. Null until the manifest exists. */
function manifestSessionCount() {
  const dbPath = join(profile, 'gmux', 'manifest.db');
  if (!existsSync(dbPath)) return null;
  let db = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    return Number(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n);
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

/**
 * Every log line main wrote, as one string. A dev launch writes its lines
 * to the process console, which the holder log captures; a profile that
 * also grew logs/app.log contributes that too. Measured on the first run:
 * the arrival lines landed only in the holder log.
 */
function appLogText() {
  const holderText = existsSync(holderLogPath)
    ? readFileSync(holderLogPath, 'utf8')
    : '';
  const fileText = existsSync(appLogPath)
    ? readFileSync(appLogPath, 'utf8')
    : '';
  return holderText + fileText;
}

/** Session names on the probe's own scratch socket. Never the operator's. */
function probeSocketSessions() {
  const out = spawnSync('tmux', ['-L', SOCKET, 'list-sessions', '-F', '#S'], {
    encoding: 'utf8'
  });
  if (out.status !== 0) return [];
  return out.stdout.split('\n').filter((l) => l.trim().length > 0);
}

/** Pids currently running the repo's own Electron main binary. */
function devElectronPids() {
  const out = spawnSync('pgrep', ['-f', electronMainBinary], {
    encoding: 'utf8'
  });
  if (out.status !== 0) return [];
  return out.stdout
    .split('\n')
    .map((l) => Number(l.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

async function waitFor(label, timeoutMs, check) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const got = await check();
    if (got) return got;
    if (Date.now() > deadline) {
      failures.push(`${label}: not observed within ${timeoutMs} ms`);
      return null;
    }
    await sleep(500);
  }
}

// ---------------------------------------------------------------------------
// A minimal DevTools protocol client (the update-rehearsal shape)
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
  return new Promise((resolveWs, rejectWs) => {
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
    sock.on('error', (err) => rejectWs(err));
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!upgraded) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        const head = buf.subarray(0, idx).toString('utf8');
        buf = buf.subarray(idx + 4);
        if (!/ 101 /.test(head)) {
          rejectWs(new Error(`websocket upgrade refused:\n${head}`));
          sock.destroy();
          return;
        }
        upgraded = true;
        resolveWs(api);
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
      call(method, params, timeoutMs = 15_000) {
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

/** Attach to the app window over the DevTools port the launch wrote. */
async function cdpAttach(timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const portFile = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8');
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
          console.log(`[probe:finderopen] attached over DevTools (port ${port})`);
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

async function cdpEval(cdp, expression) {
  const reply = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true
  });
  if (reply.error !== undefined) throw new Error(JSON.stringify(reply.error));
  return reply.result?.result?.value ?? null;
}

async function screenshot(cdp, name) {
  const outPath = join(repoRoot, 'out', name);
  try {
    await cdp.call('Page.bringToFront', {});
    await sleep(500);
    const reply = await cdp.call('Page.captureScreenshot', { format: 'png' });
    const data = reply.result?.data;
    if (typeof data !== 'string' || data.length === 0) {
      failures.push(`screenshot ${name}: the protocol returned no image data`);
      return;
    }
    writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log(`[probe:finderopen] screenshot ${outPath}`);
  } catch (err) {
    failures.push(`screenshot ${name}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Delivery: one `open -a` per leg, with the second-instance guard
// ---------------------------------------------------------------------------

/** Pids this probe recorded. The ONLY pids it may ever kill. */
const recordedPids = new Set();

function deliverOpen(label, target, pidsBefore) {
  const out = spawnSync('/usr/bin/open', ['-a', electronApp, target], {
    encoding: 'utf8'
  });
  if (out.status !== 0) {
    failures.push(
      `${label}: open -a exited ${out.status}. stderr: ${(out.stderr ?? '').slice(0, 300)}`
    );
    return false;
  }
  return checkNoNewInstance(label, pidsBefore);
}

/**
 * Both files handed to macOS in ONE `open -a` call, so the app receives two
 * `open-file` events in the same run loop turn. That is the only way to make
 * the second arrival land while the first is still sitting in the main-side
 * pending slot, which is the coalescing path in src/main/shell/pending.ts.
 * Two sequential `open -a` calls never reach it: each one costs a few hundred
 * milliseconds and the renderer has already pulled by then.
 */
function deliverOpenTogether(label, targets, pidsBefore) {
  const out = spawnSync('/usr/bin/open', ['-a', electronApp, ...targets], {
    encoding: 'utf8'
  });
  if (out.status !== 0) {
    failures.push(
      `${label}: open -a exited ${out.status}. stderr: ${(out.stderr ?? '').slice(0, 300)}`
    );
    return false;
  }
  return checkNoNewInstance(label, pidsBefore);
}

function checkNoNewInstance(label, pidsBefore) {
  const now = devElectronPids();
  const strays = now.filter((pid) => !pidsBefore.includes(pid));
  if (strays.length === 0) return true;
  for (const pid of strays) {
    recordedPids.add(pid);
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already gone.
    }
  }
  failures.push(
    `${label}: open -a started a second Electron instance (pids ` +
      `${strays.join(', ')}) instead of delivering to the running one. ` +
      'The strays were recorded and killed.'
  );
  return false;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const readmePath = join(repo, 'sub', 'dir', 'readme.md');
const notesPath = join(plain, 'notes.txt');
const picPath = join(repo, 'pic.png');
const blobPath = join(repo, 'blob.zip');

for (const name of [
  'p61-finder-1-folder.png',
  'p61-finder-2-gitroot.png',
  'p61-finder-3-fallback.png',
  'p61-finder-4-image.png',
  'p61-finder-5-binary.png',
  'p62.1-last-file-wins.png'
]) {
  rmSync(join(repoRoot, 'out', name), { force: true });
}

const holderOut = openSync(holderLogPath, 'w');
const holder = spawn(
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
    env: { ...process.env, GMUX_UPDATE_REHEARSAL: '1' },
    stdio: ['ignore', holderOut, holderOut]
  }
);
console.log(`[probe:finderopen] holder pid ${holder.pid} (recorded)`);
recordedPids.add(holder.pid);

let holderExited = false;
holder.on('exit', () => {
  holderExited = true;
});

let cdp = null;
try {
  cdp = await cdpAttach(90_000);
  // Let boot settle: the renderer exists once CDP answers, and the manifest
  // appears when the core is up. The session baseline on the probe's own
  // socket is taken BEFORE any open, so leg 6 can prove the opens created
  // nothing.
  await waitFor('boot: manifest exists', 60_000, () =>
    existsSync(join(profile, 'gmux', 'manifest.db'))
  );
  const socketSessionsBefore = probeSocketSessions();
  const pidsBaseline = devElectronPids();

  // Leg 1, FOLDER: the repository directory becomes a project row.
  if (deliverOpen('leg 1 (folder)', repo, pidsBaseline)) {
    await waitFor('leg 1 (folder): manifest row for the repo', 30_000, () =>
      manifestProjectPaths().includes(repo)
    );
    await screenshot(cdp, 'p61-finder-1-folder.png');
  }

  // Leg 2, GIT ROOT: a file two levels deep. The project is the repository
  // root, never sub/dir, and the tab is the markdown file, pinned.
  if (deliverOpen('leg 2 (git root)', readmePath, pidsBaseline)) {
    await waitFor('leg 2 (git root): readme.md is the active tab', 30_000, () =>
      cdpEval(
        cdp,
        `(document.querySelector('.ed-tab.active .ed-tab-name')||{}).textContent === 'readme.md'`
      )
    );
    const rows = manifestProjectPaths();
    if (rows.includes(join(repo, 'sub', 'dir')) || rows.includes(join(repo, 'sub'))) {
      failures.push(
        'leg 2 (git root): the manifest gained a row for the directory of ' +
          'the file instead of the repository root'
      );
    }
    if (!appLogText().includes(`opening file from Finder: ${readmePath} (project ${repo})`)) {
      failures.push('leg 2 (git root): the arrival log line is missing');
    }
    const previewTab = await cdpEval(
      cdp,
      `!!document.querySelector('.ed-tab.active .ed-tab-name.preview')`
    );
    if (previewTab === true) {
      failures.push('leg 2 (git root): the tab opened as a preview, not pinned');
    }
    await screenshot(cdp, 'p61-finder-2-gitroot.png');
  }

  // Leg 3, FALLBACK: no repository above notes.txt, so its parent folder is
  // the project.
  if (deliverOpen('leg 3 (fallback)', notesPath, pidsBaseline)) {
    await waitFor('leg 3 (fallback): manifest row for the plain folder', 30_000, () =>
      manifestProjectPaths().includes(plain)
    );
    await waitFor('leg 3 (fallback): notes.txt is the active tab', 30_000, () =>
      cdpEval(
        cdp,
        `(document.querySelector('.ed-tab.active .ed-tab-name')||{}).textContent === 'notes.txt'`
      )
    );
    if (
      !appLogText().includes(
        `opening file from Finder: ${notesPath} (no git repository above it, ` +
          `so the project is its parent folder ${plain})`
      )
    ) {
      failures.push('leg 3 (fallback): the parent-folder log line is missing');
    }
    await screenshot(cdp, 'p61-finder-3-fallback.png');
  }

  // Leg 4, IMAGE: the png opens the image viewer.
  if (deliverOpen('leg 4 (image)', picPath, pidsBaseline)) {
    await waitFor('leg 4 (image): the image viewer is showing', 30_000, () =>
      cdpEval(
        cdp,
        `(document.querySelector('.ed-tab.active .ed-tab-name')||{}).textContent === 'pic.png'` +
          ` && !!document.querySelector('.ed-body img')`
      )
    );
    await screenshot(cdp, 'p61-finder-4-image.png');
  }

  // Leg 5, BINARY: forced through. The project is already open; the tab
  // shows the existing no-viewer sentence, and main logged the one arrival
  // line naming the reason.
  if (deliverOpen('leg 5 (binary)', blobPath, pidsBaseline)) {
    await waitFor('leg 5 (binary): the no-viewer sentence is showing', 30_000, () =>
      cdpEval(
        cdp,
        `((document.querySelector('.ed-state-body')||{}).textContent||'')` +
          `.includes('is a binary file')`
      )
    );
    if (
      !appLogText().includes(
        `opening file from Finder: ${blobPath} (Tortie has no viewer for ` +
          'this file type, so its tab will say so)'
      )
    ) {
      failures.push('leg 5 (binary): the no-viewer arrival log line is missing');
    }
    await screenshot(cdp, 'p61-finder-5-binary.png');
  }

  // Leg 7, LAST FILE WINS (Phase 62.1): a.md then b.md, back to back with
  // no sleep between them, ten rounds. The renderer's serial pull queue
  // must land focus on b.md, the LAST delivered file, every round. When
  // both arrivals land before the first pull, the main-side slot holds
  // only b.md and a.md never opens a tab; that is the pending-slot
  // semantics this phase does not change, so how many tabs opened is
  // REPORTED and the ACTIVE tab is the assertion.
  {
    const aPath = join(race, 'a.md');
    const bPath = join(race, 'b.md');
    const ROUNDS = 10;
    /** How long a round waits past the first sighting before re-reading. */
    const SETTLE_MS = 2000;
    const bothTabsExpr =
      `(() => { const names = [...document.querySelectorAll('.ed-tab .ed-tab-name')]` +
      `.map((e) => e.textContent); ` +
      `return names.includes('a.md') && names.includes('b.md'); })()`;
    const activeIsBExpr =
      `(document.querySelector('.ed-tab.active .ed-tab-name')||{}).textContent === 'b.md'`;
    const paneShowsBExpr =
      `(() => { const body = document.querySelector('.ed-body'); ` +
      `const text = body ? body.innerText : ''; ` +
      `return text.includes('MARKER-B-LAST') && !text.includes('MARKER-A-FIRST'); })()`;
    // One close click per poll until the strip is empty. Run before every
    // round, so round one also clears the tabs legs 2 to 5 left open.
    const closeOneExpr =
      `(() => { const btn = document.querySelector('.ed-tab-close'); ` +
      `if (btn) btn.click(); ` +
      `return document.querySelectorAll('.ed-tab').length === 0; })()`;
    let greenRounds = 0;
    for (let round = 1; round <= ROUNDS; round += 1) {
      const label = `leg 7 (last file wins) round ${round}`;
      const cleared = await waitFor(`${label}: the tab strip is empty`, 20_000, () =>
        cdpEval(cdp, closeOneExpr)
      );
      if (cleared === null) break;
      if (!deliverOpen(`${label} a.md`, aPath, pidsBaseline)) break;
      if (!deliverOpen(`${label} b.md`, bPath, pidsBaseline)) break;
      const active = await waitFor(`${label}: the active tab is b.md`, 30_000, () =>
        cdpEval(cdp, activeIsBExpr)
      );
      if (active === null) break;
      // Read the tab count AFTER the active assertion, once, with no wait.
      // The serial queue emits a's open strictly before b's, so by the time
      // b.md is active, a.md's tab already exists if a.md was ever taken.
      // A missing a.md tab therefore means the two arrivals coalesced in the
      // main-side slot, which is a legitimate outcome and not a failure.
      const bothTabs = (await cdpEval(cdp, bothTabsExpr)) === true;
      const witness = await waitFor(
        `${label}: the pane shows b.md's own sentence and not a.md's`,
        15_000,
        () => cdpEval(cdp, paneShowsBExpr)
      );
      if (witness === null) break;
      // The settle re-read, and it is the part that makes the leg honest.
      // A first sighting is not enough on its own. Under the defect this
      // leg pins, b.md's open emitted first and a.md's emitted a moment
      // later, so b.md WAS briefly the active tab before a.md stole it. A
      // poll that stopped at the first sighting would report that run as
      // green. So the leg waits past any late emission and reads the same
      // two facts once more, and a round is green only if they still hold.
      await sleep(SETTLE_MS);
      const stillActive = (await cdpEval(cdp, activeIsBExpr)) === true;
      const stillShowing = (await cdpEval(cdp, paneShowsBExpr)) === true;
      if (!stillActive || !stillShowing) {
        const name = await cdpEval(
          cdp,
          `((document.querySelector('.ed-tab.active .ed-tab-name')||{}).textContent||'none')`
        );
        failures.push(
          `${label}: b.md was the active tab, then lost it ${SETTLE_MS} ms ` +
            `later. The active tab is now ${name}. A later open emitted ` +
            'after the last delivered file, which is the ordering defect ' +
            'this leg exists to catch.'
        );
        break;
      }
      console.log(
        `[probe:finderopen] ${label}: active tab b.md, pane shows b.md, ` +
          `still true after ${SETTLE_MS} ms` +
          `${bothTabs ? ', both tabs present' : ', only b.md opened (both arrivals landed before the first pull)'}`
      );
      if (round === 1) {
        await screenshot(cdp, 'p62.1-last-file-wins.png');
      }
      greenRounds += 1;
    }
    console.log(
      `[probe:finderopen] leg 7 (last file wins): ${greenRounds} of ${ROUNDS} rounds green`
    );
    if (greenRounds < ROUNDS && failures.length === 0) {
      failures.push(
        `leg 7 (last file wins): only ${greenRounds} of ${ROUNDS} rounds ran green`
      );
    }

    // Leg 7b, THE COALESCING PATH. Leg 7 above never reaches it: its two
    // `open -a` calls are far enough apart that the renderer pulls the first
    // file before the second arrives, so the main-side slot is always empty
    // when the second lands and the drop line is never written. This leg
    // hands macOS both files in one call, so both arrivals land in the same
    // turn, the second replaces the first in the slot whole, and main writes
    // "a newer shell open replaced a pending one". Then b.md is the only tab
    // and it is active. That is the pending-slot semantics this phase does
    // not change, proven live instead of by unit test alone.
    if (failures.length === 0) {
      const label = 'leg 7b (both files in one open)';
      const cleared = await waitFor(
        `${label}: the tab strip is empty`,
        20_000,
        () => cdpEval(cdp, closeOneExpr)
      );
      if (cleared !== null) {
        const dropsBefore = (
          appLogText().match(/a newer shell open replaced a pending one/g) ?? []
        ).length;
        if (deliverOpenTogether(label, [aPath, bPath], pidsBaseline)) {
          const active = await waitFor(
            `${label}: the active tab is b.md`,
            30_000,
            () => cdpEval(cdp, activeIsBExpr)
          );
          if (active !== null) {
            await sleep(SETTLE_MS);
            const stillActive = (await cdpEval(cdp, activeIsBExpr)) === true;
            const dropsAfter = (
              appLogText().match(
                /a newer shell open replaced a pending one/g
              ) ?? []
            ).length;
            const drops = dropsAfter - dropsBefore;
            const tabNames = await cdpEval(
              cdp,
              `[...document.querySelectorAll('.ed-tab .ed-tab-name')].map((e) => e.textContent).join(',')`
            );
            console.log(
              `[probe:finderopen] ${label}: active tab b.md (still true after ${SETTLE_MS} ms: ${stillActive}), ` +
                `tabs [${tabNames}], drop lines this leg: ${drops}`
            );
            if (!stillActive) {
              failures.push(
                `${label}: b.md was the active tab and then lost it ${SETTLE_MS} ms later. Tabs: ${tabNames}`
              );
            }
            if (drops < 1) {
              failures.push(
                `${label}: main never wrote "a newer shell open replaced a pending one", ` +
                  'so the two arrivals did not coalesce and this leg proved nothing. ' +
                  'Both files were handed to one `open -a` call, so they should have landed in one turn.'
              );
            }
          }
        }
      }
    }
  }

  // Leg 6, THE CAP: no open started anything. Zero session rows, and the
  // probe's own tmux socket shows nothing the opens created.
  const sessionRows = manifestSessionCount();
  if (sessionRows !== 0) {
    failures.push(
      `leg 6 (the cap): the manifest session table holds ${sessionRows} rows, expected 0`
    );
  }
  const socketSessionsAfter = probeSocketSessions();
  // `gmux-control` is the app's own pinned control session
  // (src/main/tmux/control-client.ts, CONTROL_SESSION_NAME). The supervisor
  // creates it at boot to carry the tmux control stream, and it can appear at
  // any point after launch, so whether it is in the baseline depends only on
  // how fast the app booted. It is never something a file open created, so it
  // is excluded by name rather than left to make this leg flaky.
  const created = socketSessionsAfter.filter(
    (s) => !socketSessionsBefore.includes(s) && s.trim() !== 'gmux-control'
  );
  if (created.length > 0) {
    failures.push(
      `leg 6 (the cap): the opens created tmux sessions: ${created.join(', ')}`
    );
  }
  if (holderExited) {
    failures.push('the holder exited before the run finished');
  }
} catch (err) {
  failures.push(`the run stopped early: ${err.message}`);
} finally {
  cdp?.close();
  // Kill ONLY the recorded pid. SIGTERM first so the holder quits cleanly;
  // SIGKILL after 15 s only if it wedged. harness-socket ends the scratch
  // tmux server after this process exits.
  if (!holderExited && holder.pid !== undefined) {
    try {
      holder.kill('SIGTERM');
    } catch {
      // Already gone.
    }
    const deadline = Date.now() + 15_000;
    while (!holderExited && Date.now() < deadline) {
      await sleep(250);
    }
    if (!holderExited) {
      console.error('[probe:finderopen] holder did not quit in 15 s; SIGKILL');
      try {
        holder.kill('SIGKILL');
      } catch {
        // Already gone.
      }
    }
  }
}

if (failures.length > 0) {
  console.error('');
  for (const failure of failures) {
    console.error(`[probe:finderopen] FAIL ${failure}`);
  }
  console.error(`[probe:finderopen] holder log: ${holderLogPath}`);
  console.error(`[probe:finderopen] app log: ${appLogPath}`);
  process.exit(1);
}
console.log(
  '[probe:finderopen] PASS: folder, git root, fallback, image, binary, ' +
    'last-file and coalescing legs all delivered, and the cap held'
);
