#!/usr/bin/env node
/**
 * probe-p166-cache.mjs. What owns the bytes in the Chromium caches, and what
 * the ceiling does, measured on scratch profiles (Phase 166).
 *
 * ## What it proves, and how
 *
 * The audit of 2026-08-26 found 871 MB of HTTP cache and 270 MB of code cache
 * under the operator's profile against 69 MB of durable data, measured on an
 * unusually active day, so the growth rate was unknown and the first act was
 * attribution rather than deletion. This probe reproduces growth on profiles
 * it makes itself, through build/electron-run.mjs, and grades the audit's
 * five proofs plus the one absolute:
 *
 *   A. Twenty launches of one build on one profile. The two caches must
 *      plateau, and in this shape, where every app resource is a `file:` URL,
 *      they must hold zero entries, because Chromium's file loader bypasses
 *      the HTTP cache and V8 caches code for http(s) scripts only.
 *   B. Five simulated version changes. Each round copies the entry script and
 *      the entry stylesheet under a fresh hashed name inside out/renderer and
 *      points index.html at them, which is exactly what a rebuild does to the
 *      URLs the page loads. Every copy is removed and index.html is restored
 *      in a finally block. The cache must still hold zero entries.
 *   C. A markdown document carrying twenty 800x800 random pixel PNGs, about
 *      49 MB, opened in preview five times on the same profile. Every image
 *      must render, the per image reload through `gmux-asset:` is timed with
 *      a cache busting query so it is a real read through the handler, the
 *      renderer's heap and private memory are read before and after, and the
 *      cache must still hold zero entries.
 *   D. The other surfaces that load resources, with the network DISABLED
 *      over CDP through the shot harness's GMUX_SHOT_OFFLINE knob: the image
 *      viewer on one PNG with the recovery strip injected, and the editor on
 *      a TypeScript file, which loads Monaco's chunks. Both must draw while
 *      navigator.onLine reads false, no resource may come over http(s), and
 *      the cache must still hold zero entries. That is the audit's fourth
 *      proof, offline, rather than merely "nothing came over http".
 *   E. The dev shape, being the renderer served by a vite dev server over
 *      http, which the attribution found is the one shape that writes. The
 *      server runs through vite's Node API over a scratch copy of the
 *      renderer source, never `electron-vite dev`, which starts an Electron
 *      of its own. Three launches must plateau, every HTTP entry must carry
 *      the scratch server's origin, and a burst of hot edits to the scratch
 *      copy measures the bytes each edit costs.
 *   F. The ceiling reaches Chromium. A fresh dev profile launched with the
 *      policy's probe override set to 4 MiB must end far under the 21 MB a
 *      fresh dev page writes uncapped.
 *   G. The report line. The Phase 163 capture runs once in the file: shape
 *      and once in the dev shape, and the report must name the ceiling, the
 *      mode and what the cache holds, and Chromium's own `getCacheSize` must
 *      agree with this probe's walk of the entry files.
 *
 * THE ONE ABSOLUTE, watched rather than asserted from code: every file under
 * `<profile>/gmux` is hashed after every launch. The only path that may
 * disappear is a manifest backup the manifest's own rotation retired, which
 * keeps five, and every path that changes must be one Tortie's own durable
 * layer writes, being the manifest, its backups, its hooks port, its logs,
 * the arch and overview stores, and the config directory the agent registry
 * writes out fresh at every boot. Anything else fails the run and is named.
 *
 * ## Safety, absolute
 *
 *   - Refuses to run without a harness socket, and refuses `gmux` and
 *     `default` by name. Every profile is under GMUX_HARNESS_DIR and HOME is a
 *     scratch directory beside them, so nothing under the person's home is
 *     opened, sized or written.
 *   - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *     count taken before and after, which must match.
 *   - The dev server binds a port this probe chooses and refuses 5173, the
 *     operator's own.
 *   - Every Electron goes through withElectron and the probe exits through
 *     process.exit after the last one returns. It deletes only what it wrote:
 *     the version copies under out/renderer/assets and nothing else.
 *
 * Usage:
 *   node build/harness-socket.mjs --fresh gmux-p166-cache 'node build/probe-p166-cache.mjs'
 *
 * Knobs: P166_LAUNCHES (20), P166_VERSIONS (5), P166_OPENS (5),
 * P166_DEV_LAUNCHES (3), P166_EDITS (10), P166_OUT_DIR (out/p166),
 * P166_QUICK=1 for a short run with 3, 2, 2, 2 and 4.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p166]';
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
    "no GMUX_TMUX_SOCKET. Run me through the harness: node build/harness-socket.mjs --fresh gmux-p166-cache 'node build/probe-p166-cache.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const quick = process.env['P166_QUICK'] === '1';
const knob = (name, full, short) => {
  const raw = (process.env[name] ?? '').trim();
  if (raw !== '') {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) refuse(`${name} must be a positive integer`);
    return n;
  }
  return quick ? short : full;
};
const LAUNCHES = knob('P166_LAUNCHES', 20, 3);
const VERSIONS = knob('P166_VERSIONS', 5, 2);
const OPENS = knob('P166_OPENS', 5, 2);
const DEV_LAUNCHES = knob('P166_DEV_LAUNCHES', 3, 2);
const EDITS = knob('P166_EDITS', 10, 4);
const IMAGES = 20;
const CEILING_PROBE_BYTES = 4 * 1024 * 1024;

const outDir = resolve(repoRoot, (process.env['P166_OUT_DIR'] ?? '').trim() || 'out/p166');
mkdirSync(outDir, { recursive: true });

const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p166-cache');
mkdirSync(join(rawRoot, 'home'), { recursive: true });
const root = realpathSync(rawRoot);
const scratchHome = join(root, 'home');
const homeReal = realpathSync(process.env['HOME'] ?? '/nonexistent');
if (root === homeReal || root.startsWith(`${homeReal}/`)) {
  refuse(`the scratch root ${root} is under the person's home`);
}

// ---------------------------------------------------------------------------
// Reading the process table and the operator's server, read only
// ---------------------------------------------------------------------------

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  if (out.status !== 0) return 0;
  return out.stdout.split('\n').filter((l) => l.trim() !== '').length;
}

/** The CLAUDE.md count of what an Electron run leaves behind, keyed by pid. */
function electronsLeft() {
  const out = spawnSync(
    'sh',
    ['-c', 'ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct'],
    { encoding: 'utf8' }
  );
  const rows = new Map();
  for (const line of out.stdout.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.set(Number(m[1]), line.trim());
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Sizing. Every number here is this probe's own walk, never the app's.
// ---------------------------------------------------------------------------

function duKb(dir) {
  if (!existsSync(dir)) return 0;
  const r = spawnSync('/usr/bin/du', ['-sk', dir], { encoding: 'utf8' });
  const m = /^\s*(\d+)\s/.exec(r.stdout);
  return m ? Number(m[1]) : -1;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

const SIMPLE_MAGIC = 0xfcfb6d1ba7725c30n;

/**
 * The key inside one Chromium simple cache entry file. The header is a u64
 * magic, a u32 version, a u32 key length and a u32 key hash, padded to 24
 * bytes, and the key follows. The key is the resource URL, so this is how an
 * entry is attributed to what wrote it.
 */
function simpleEntryKey(file) {
  let fd;
  try {
    fd = openSync(file, 'r');
    const head = Buffer.alloc(24);
    if (readSync(fd, head, 0, 24, 0) < 24) return null;
    if (head.readBigUInt64LE(0) !== SIMPLE_MAGIC) return null;
    const keyLen = head.readUInt32LE(12);
    if (keyLen > 64 * 1024) return null;
    const key = Buffer.alloc(keyLen);
    readSync(fd, key, 0, keyLen, 24);
    return key.toString('utf8');
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** Every file under a simple cache directory, with its key when it has one. */
function simpleEntries(dir) {
  const rows = [];
  for (const f of walk(dir)) {
    const base = f.slice(f.lastIndexOf('/') + 1);
    const size = statSync(f).size;
    if (/^[0-9a-f]{16}_[0-9s]$/.test(base)) {
      rows.push({ base, size, key: simpleEntryKey(f), entry: true });
    } else {
      rows.push({ base, size, key: null, entry: false });
    }
  }
  return rows;
}

const outRenderer = join(repoRoot, 'out', 'renderer');

/**
 * Which class a cache key belongs to. An HTTP cache key is the resource URL,
 * sometimes behind a prefix. A code cache key is either `_key<url>\n<origin>`
 * for the stub that names the script, or a 64 character content hash for the
 * body holding the bytecode, which several stubs can share.
 */
function classify(key, devOrigin) {
  if (key === null) return 'index and bookkeeping';
  if (/^[0-9A-F]{64}$/.test(key)) return 'code cache: bytecode body (content hash key)';
  const m = /(?:https?|file|gmux-asset|gmux-preview):\/\/[^\s|]*/.exec(key);
  const url = m ? m[0] : key;
  if (url.startsWith('file://')) {
    return url.includes(outRenderer) ? 'file: app resources' : 'file: other';
  }
  if (url.startsWith('gmux-asset://')) return 'gmux-asset: project images';
  if (url.startsWith('gmux-preview://')) return 'gmux-preview: preview resources';
  if (devOrigin !== null && url.startsWith(devOrigin)) {
    if (url.includes('?t=')) return 'dev server: hot updates';
    // Pre bundled dependencies are served from the cache directory, which is
    // `/.vite/deps/` under the root by default and `/@fs/<dir>/deps/` when the
    // cache directory sits outside it, as this probe's does.
    if (/\/deps\/[^/]+\?v=/.test(url)) return 'dev server: pre bundled deps';
    return 'dev server: modules';
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) return 'http: another local server';
  if (url.startsWith('http')) return 'http(s): remote';
  return `other (${url.slice(0, 32)})`;
}

function attribute(entries, devOrigin) {
  const byClass = new Map();
  let bytes = 0;
  let count = 0;
  for (const e of entries) {
    if (!e.entry) continue;
    const c = classify(e.key, devOrigin);
    const row = byClass.get(c) ?? { cls: c, bytes: 0, files: 0 };
    row.bytes += e.size;
    row.files += 1;
    byClass.set(c, row);
    bytes += e.size;
    count += 1;
  }
  return { bytes, count, rows: [...byClass.values()].sort((a, b) => b.bytes - a.bytes) };
}

function measure(profile, devOrigin = null) {
  const cacheDir = join(profile, 'Cache');
  const codeDir = join(profile, 'Code Cache');
  const http = attribute(simpleEntries(cacheDir), devOrigin);
  const code = attribute(simpleEntries(codeDir), devOrigin);
  return {
    httpKb: duKb(cacheDir),
    httpEntryBytes: http.bytes,
    httpEntries: http.count,
    httpClasses: http.rows,
    codeKb: duKb(codeDir),
    codeEntryBytes: code.bytes,
    codeEntries: code.count,
    codeClasses: code.rows,
    gmuxKb: duKb(join(profile, 'gmux')),
    profileKb: duKb(profile)
  };
}

function row(tag, m) {
  return `${tag.padEnd(22)} http ${String(m.httpKb).padStart(7)} KB ${String(m.httpEntries).padStart(4)} entries  code ${String(m.codeKb).padStart(7)} KB ${String(m.codeEntries).padStart(4)} entries  gmux ${String(m.gmuxKb).padStart(6)} KB  profile ${String(m.profileKb).padStart(7)} KB`;
}

// ---------------------------------------------------------------------------
// The one absolute: the durable directory, hashed after every launch
// ---------------------------------------------------------------------------

/**
 * Paths Tortie's own durable layer writes on every launch. Nothing else may
 * change. The manifest, its rotating backups, the hooks port, the logs, the
 * arch and overview stores, and the config directory, whose README, schema
 * and examples the agent registry writes out fresh at every boot.
 */
const DURABLE_OWN_WRITES = [
  /^manifest\.db(-wal|-shm|-journal)?$/,
  /^backups\//,
  /^hooks\/port$/,
  /^logs\//,
  /^arch\.db(-wal|-shm|-journal)?$/,
  /^overview\//,
  /^config\//
];

/**
 * The one path shape that may DISAPPEAR: a manifest backup the manifest's
 * own rotation retired, which keeps five. Nothing else under gmux may ever
 * be removed, and this is the line that would catch a cache cleanup reaching
 * durable data.
 */
const DURABLE_OWN_REMOVALS = [/^backups\/manifest\.db\.\d+$/];

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function snapshotDurable(profile) {
  const dir = join(profile, 'gmux');
  const map = new Map();
  for (const f of walk(dir)) map.set(relative(dir, f), sha256(f));
  return map;
}

/** Compare two snapshots. Removed paths and unexplained changes are findings. */
function diffDurable(before, after) {
  const removed = [];
  const changed = [];
  const added = [];
  for (const [p, h] of before) {
    if (!after.has(p)) removed.push(p);
    else if (after.get(p) !== h) changed.push(p);
  }
  for (const p of after.keys()) if (!before.has(p)) added.push(p);
  const unexplained = [...changed, ...added].filter((p) => !DURABLE_OWN_WRITES.some((re) => re.test(p)));
  const removedOutsideRotation = removed.filter((p) => !DURABLE_OWN_REMOVALS.some((re) => re.test(p)));
  return { removed, changed, added, unexplained, removedOutsideRotation };
}

const durableFindings = [];
const durableLog = [];
function watchDurable(label, before, profile) {
  const after = snapshotDurable(profile);
  const d = diffDurable(before, after);
  durableLog.push({ label, removed: d.removed, changed: d.changed, added: d.added });
  if (d.removedOutsideRotation.length > 0) durableFindings.push(`${label}: removed under gmux outside the manifest's own backup rotation: ${d.removedOutsideRotation.join(', ')}`);
  if (d.unexplained.length > 0) durableFindings.push(`${label}: changed under gmux outside Tortie's own writers: ${d.unexplained.join(', ')}`);
  return after;
}

// ---------------------------------------------------------------------------
// The scratch project: twenty PNGs and a page that shows them all
// ---------------------------------------------------------------------------

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** A random pixel PNG, so it compresses to nothing and weighs what it says. */
function png(w, h, seed) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let s = seed >>> 0;
  for (let i = 0; i < raw.length; i += 1) {
    if (i % (w * 4 + 1) === 0) {
      raw[i] = 0;
      continue;
    }
    s = (s * 1664525 + 1013904223) >>> 0;
    raw[i] = s >>> 24;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 1 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

const project = join(root, 'proj');
function makeProject() {
  if (existsSync(join(project, '.git'))) return;
  mkdirSync(join(project, 'img'), { recursive: true });
  mkdirSync(join(project, 'src'), { recursive: true });
  let md = '# Big images\n\n';
  let total = 0;
  for (let i = 1; i <= IMAGES; i += 1) {
    const b = png(800, 800, i * 7919);
    writeFileSync(join(project, 'img', `shot-${String(i)}.png`), b);
    total += b.length;
    md += `## Image ${String(i)}\n\n![shot ${String(i)}](img/shot-${String(i)}.png)\n\n`;
  }
  writeFileSync(join(project, 'big.md'), md);
  writeFileSync(join(project, 'README.md'), '# scratch project for p166\n');
  writeFileSync(
    join(project, 'src', 'sample.ts'),
    'export function add(a: number, b: number): number {\n  return a + b;\n}\n'
  );
  const git = (...args) =>
    spawnSync('git', ['-c', 'user.name=p166', '-c', 'user.email=p166@example.invalid', ...args], { cwd: project, stdio: 'ignore' });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'images');
  say(`scratch project at ${project}: ${String(IMAGES)} images, ${(total / 1048576).toFixed(1)} MB`);
}

// ---------------------------------------------------------------------------
// One launch of the real app through the helper
// ---------------------------------------------------------------------------

const failures = [];
const check = (ok, why) => {
  if (!ok) failures.push(why);
};

/**
 * Launch once in GMUX_SHOT mode, being the real window and the real renderer,
 * optionally driven by the renderer's shot hook and read by one expression.
 */
async function launchShot({ label, profile, delayMs = 5_000, drive, js, rendererUrl, extraEnv = {}, ceilingMs = 120_000 }) {
  mkdirSync(profile, { recursive: true });
  const shot = join(outDir, `shot-${label.replace(/\W+/g, '_')}.png`);
  const started = Date.now();
  const res = await withElectron(
    {
      label: `p166 ${label}`,
      userDataDir: profile,
      cwd: repoRoot,
      tmuxSocket: null,
      graceMs: 15_000,
      env: {
        ...process.env,
        HOME: scratchHome,
        GMUX_TMUX_SOCKET: socket,
        GMUX_SHOT: shot,
        GMUX_SHOT_DELAY_MS: String(delayMs),
        ...(drive !== undefined ? { GMUX_SHOT_DRIVE: JSON.stringify(drive) } : {}),
        ...(js !== undefined ? { GMUX_SHOT_JS: js } : {}),
        ...(rendererUrl !== undefined ? { ELECTRON_RENDERER_URL: rendererUrl } : {}),
        ...extraEnv
      }
    },
    async (handle) => {
      const code = await new Promise((r) => {
        const ceiling = setTimeout(() => {
          console.error(`${TAG} ${label} passed its ${String(ceilingMs)} ms ceiling; the teardown ends the tree`);
          r(1);
        }, ceilingMs);
        void handle.exited.then((c) => {
          clearTimeout(ceiling);
          setTimeout(() => r(c), 300);
        });
      });
      return { code, text: handle.text() };
    }
  );
  const ms = Date.now() - started;
  const probeLine = res.text.split('\n').find((l) => l.includes('[gmux-shot] probe '));
  let probe = null;
  if (probeLine !== undefined) {
    try {
      probe = JSON.parse(probeLine.slice(probeLine.indexOf('[gmux-shot] probe ') + '[gmux-shot] probe '.length));
    } catch {
      probe = null;
    }
  }
  const wrote = res.text.includes('[gmux-shot] wrote ');
  const fails = res.text.split('\n').filter((l) => /\[gmux-shot\] FAIL|\[shot-drive\].*(fail|error)/i.test(l)).slice(-4);
  check(res.code === 0, `${label}: the app exited ${String(res.code)} rather than 0 ${fails.join(' | ')}`);
  check(wrote, `${label}: no photograph was written`);
  if (js !== undefined) check(probe !== null, `${label}: the probe expression printed nothing readable ${fails.join(' | ')}`);
  return { code: res.code, ms, probe, text: res.text };
}

/** The Phase 163 capture, which is the one path a person's report takes. */
async function captureReport({ label, profile, rendererUrl, extraEnv = {} }) {
  const file = join(outDir, `capture-${label.replace(/\W+/g, '_')}.json`);
  const res = await withElectron(
    {
      label: `p166 capture ${label}`,
      userDataDir: profile,
      cwd: repoRoot,
      tmuxSocket: null,
      env: {
        ...process.env,
        HOME: scratchHome,
        GMUX_TMUX_SOCKET: socket,
        GMUX_SMOKE: 'p163-capture',
        GMUX_P163_ROOT: root,
        GMUX_P163_OUT: file,
        GMUX_P163_SESSIONS: '0',
        GMUX_P163_RUN: 'warm',
        ...(rendererUrl !== undefined ? { ELECTRON_RENDERER_URL: rendererUrl } : {}),
        ...extraEnv
      }
    },
    async (handle) => {
      const code = await new Promise((r) => {
        const ceiling = setTimeout(() => r(1), 200_000);
        void handle.exited.then((c) => {
          clearTimeout(ceiling);
          setTimeout(() => r(c), 300);
        });
      });
      return { code, text: handle.text() };
    }
  );
  check(res.code === 0, `capture ${label}: the app exited ${String(res.code)}`);
  let capture = null;
  if (existsSync(file)) {
    try {
      capture = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      capture = null;
    }
  }
  check(capture !== null && capture.report !== null, `capture ${label}: no diagnostics report was written`);
  return capture?.report ?? null;
}

// ---------------------------------------------------------------------------
// The probe expressions, evaluated in the driven window
// ---------------------------------------------------------------------------

/** Wait for every image, then time a real reload of each through the handler. */
const IMAGE_PROBE = `(async () => {
  const t0 = performance.now();
  let imgs = [];
  for (let i = 0; i < 800; i += 1) {
    imgs = [...document.querySelectorAll('img[src^="gmux-asset:"]')];
    if (imgs.length >= ${String(IMAGES)} && imgs.every((im) => im.complete)) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  const waitedMs = Math.round(performance.now() - t0);
  const complete = imgs.filter((im) => im.complete && im.naturalWidth > 0).length;
  const mem = async () => (window.gmux && window.gmux.diagnostics && window.gmux.diagnostics.rendererMemory) ? await window.gmux.diagnostics.rendererMemory() : null;
  const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : null);
  const heapBefore = heap();
  const memBefore = await mem();
  const reloadMs = [];
  for (let i = 0; i < imgs.length; i += 1) {
    const fresh = new Image();
    fresh.src = imgs[i].src + '?p166=' + String(i) + '-' + String(Date.now());
    const t = performance.now();
    try { await fresh.decode(); } catch (err) { reloadMs.push(-1); continue; }
    reloadMs.push(Math.round(performance.now() - t));
  }
  const heapAfter = heap();
  const memAfter = await mem();
  const remote = performance.getEntriesByType('resource').filter((e) => /^https?:/.test(e.name)).length;
  const sorted = [...reloadMs].filter((x) => x >= 0).sort((a, b) => a - b);
  return { imgs: imgs.length, complete, waitedMs, reloadMs, reloadP50: sorted[Math.floor(sorted.length / 2)] ?? null, reloadMax: sorted[sorted.length - 1] ?? null, reloadFailed: reloadMs.filter((x) => x < 0).length, heapBefore, heapAfter, memBefore, memAfter, remote };
})()`;

/** The plain state of an undriven window: scripts loaded and from where. */
const STATE_PROBE = `({
  scripts: [...document.scripts].map((s) => s.src).filter((s) => s !== ''),
  styles: [...document.styleSheets].map((s) => s.href).filter((h) => h !== null),
  remote: performance.getEntriesByType('resource').filter((e) => /^https?:/.test(e.name)).length,
  resources: performance.getEntriesByType('resource').length,
  origin: location.origin
})`;

/** The image viewer with the recovery strip injected. */
const VIEWER_PROBE = `(async () => {
  let img = null;
  for (let i = 0; i < 400; i += 1) {
    img = document.querySelector('img[src^="gmux-asset:"]');
    if (img !== null && img.complete && img.naturalWidth > 0) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  return {
    viewerImage: img !== null && img.complete && img.naturalWidth > 0,
    naturalWidth: img === null ? 0 : img.naturalWidth,
    restoreStrip: document.querySelector('.restore-strip') !== null,
    restoreStripText: (document.querySelector('.restore-strip-text') || {}).textContent || '',
    online: navigator.onLine,
    remote: performance.getEntriesByType('resource').filter((e) => /^https?:/.test(e.name)).length
  };
})()`;

/** The editor on a TypeScript file: Monaco mounted and its chunks loaded. */
const EDITOR_PROBE = `(async () => {
  let ed = null;
  for (let i = 0; i < 400; i += 1) {
    ed = document.querySelector('.monaco-editor');
    if (ed !== null && ed.querySelector('.view-lines') !== null) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  return {
    monaco: ed !== null,
    lines: ed === null ? 0 : ed.querySelectorAll('.view-line').length,
    text: ed === null ? '' : ed.textContent.slice(0, 80),
    scripts: [...document.scripts].length,
    online: navigator.onLine,
    remote: performance.getEntriesByType('resource').filter((e) => /^https?:/.test(e.name)).length
  };
})()`;

// ---------------------------------------------------------------------------
// B. Simulated version changes, inside out/renderer, restored in finally
// ---------------------------------------------------------------------------

const indexHtml = join(outRenderer, 'index.html');
const assetsDir = join(outRenderer, 'assets');

function currentEntry() {
  const html = readFileSync(indexHtml, 'utf8');
  const js = /src="\.\/assets\/(index-[^"]+\.js)"/.exec(html);
  const css = /href="\.\/assets\/(index-[^"]+\.css)"/.exec(html);
  if (js === null || css === null) refuse('out/renderer/index.html does not name an index-*.js and an index-*.css');
  return { html, js: js[1], css: css[1] };
}

/** Point the page at a fresh copy of its entry script and stylesheet. */
function installVersion(base, v) {
  const stamp = `p166v${String(v)}`;
  const js = base.js.replace(/^index-/, `index-${stamp}-`);
  const css = base.css.replace(/^index-/, `index-${stamp}-`);
  copyFileSync(join(assetsDir, base.js), join(assetsDir, js));
  copyFileSync(join(assetsDir, base.css), join(assetsDir, css));
  writeFileSync(indexHtml, base.html.replace(`./assets/${base.js}`, `./assets/${js}`).replace(`./assets/${base.css}`, `./assets/${css}`));
  return { js, css };
}

function removeVersion(base, made) {
  writeFileSync(indexHtml, base.html);
  for (const name of [made.js, made.css]) {
    const p = join(assetsDir, name);
    if (p.startsWith(assetsDir) && /p166v\d+/.test(name) && existsSync(p)) rmSync(p);
  }
}

// ---------------------------------------------------------------------------
// E. The dev server, through vite's Node API over a scratch copy of the source
// ---------------------------------------------------------------------------

const devSrc = join(root, 'devsrc');

async function startDevServer() {
  const nm = join(repoRoot, 'node_modules');
  if (!existsSync(join(devSrc, 'src', 'renderer', 'index.html'))) {
    mkdirSync(join(devSrc, 'src'), { recursive: true });
    cpSync(join(repoRoot, 'src', 'renderer'), join(devSrc, 'src', 'renderer'), { recursive: true });
    cpSync(join(repoRoot, 'src', 'shared'), join(devSrc, 'src', 'shared'), { recursive: true });
    copyFileSync(join(repoRoot, 'package.json'), join(devSrc, 'package.json'));
    if (!existsSync(join(devSrc, 'node_modules'))) symlinkSync(nm, join(devSrc, 'node_modules'));
  }
  const { createServer } = await import(join(nm, 'vite', 'dist', 'node', 'index.js'));
  const react = (await import(join(nm, '@vitejs', 'plugin-react', 'dist', 'index.js'))).default;
  const server = await createServer({
    configFile: false,
    root: join(devSrc, 'src', 'renderer'),
    base: './',
    plugins: [react()],
    worker: { rollupOptions: { output: { inlineDynamicImports: true } } },
    resolve: {
      alias: {
        '@shared': join(devSrc, 'src', 'shared'),
        '@renderer': join(devSrc, 'src', 'renderer')
      }
    },
    server: { port: 5197, strictPort: false, host: 'localhost', fs: { allow: [devSrc, realpathSync(nm)] } },
    cacheDir: join(root, 'vite-cache'),
    logLevel: 'error'
  });
  await server.listen();
  const url = (server.resolvedUrls?.local ?? [])[0]?.replace(/\/$/, '') ?? null;
  if (url === null) refuse('the vite dev server printed no local url');
  if (/:5173$/.test(url)) refuse('the dev server landed on 5173, which is the operator\'s own port');
  say(`dev server on ${url} over ${devSrc}`);
  return { server, url };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const sessionsBefore = operatorSessionCount();
say(`operator sessions before: ${String(sessionsBefore)}`);
const electronsBefore = electronsLeft();
say(`electron pids before (the operator's own): ${String(electronsBefore.size)}`);
say(`launches ${String(LAUNCHES)}, versions ${String(VERSIONS)}, opens ${String(OPENS)}, dev launches ${String(DEV_LAUNCHES)}, edits ${String(EDITS)}`);
makeProject();

const profileA = join(root, 'a', 'profile');
const profileD = join(root, 'd', 'profile');
const profileC = join(root, 'dc', 'profile');
mkdirSync(profileA, { recursive: true });
const tables = { a: [], b: [], c: [], d: [], e: [], f: [], g: [] };
let durableA = snapshotDurable(profileA);

// A. Twenty launches of one build.
for (let i = 1; i <= LAUNCHES; i += 1) {
  const r = await launchShot({ label: `a${String(i)}`, profile: profileA, js: STATE_PROBE });
  const m = measure(profileA);
  durableA = watchDurable(`launch ${String(i)}`, durableA, profileA);
  tables.a.push({ i, ms: r.ms, ...m, scripts: r.probe?.scripts ?? [], remote: r.probe?.remote ?? null, origin: r.probe?.origin ?? null });
  say(row(`launch ${String(i)} (${String(r.ms)} ms)`, m));
  if (r.probe !== null) {
    check(r.probe.origin === 'file://', `launch ${String(i)}: the renderer origin is ${String(r.probe.origin)}, not file://`);
    check(r.probe.remote === 0, `launch ${String(i)}: ${String(r.probe.remote)} resources came over http(s)`);
    check((r.probe.scripts ?? []).some((s) => s.startsWith('file://')), `launch ${String(i)}: no file: script is loaded`);
  }
}
{
  const a = tables.a;
  check(a.every((x) => x.httpEntries === 0), `A: the http cache holds entries in the file: shape: ${a.map((x) => x.httpEntries).join(',')}`);
  check(a.every((x) => x.codeEntries === 0), `A: the code cache holds entries in the file: shape: ${a.map((x) => x.codeEntries).join(',')}`);
  const from = Math.min(3, a.length);
  const settled = a.slice(from - 1);
  check(settled.every((x) => x.httpKb === settled[0].httpKb && x.codeKb === settled[0].codeKb), `A: the caches did not plateau from launch ${String(from)}: http ${settled.map((x) => x.httpKb).join(',')} code ${settled.map((x) => x.codeKb).join(',')}`);
  say(`A: plateau from launch ${String(from)}: http ${String(settled[0].httpKb)} KB, code ${String(settled[0].codeKb)} KB, gmux ${a.map((x) => x.gmuxKb).join(' -> ')} KB`);
}

// B. Simulated version changes.
{
  const base = currentEntry();
  for (let v = 1; v <= VERSIONS; v += 1) {
    let made = null;
    try {
      made = installVersion(base, v);
      const r = await launchShot({ label: `b${String(v)}`, profile: profileA, js: STATE_PROBE });
      const m = measure(profileA);
      durableA = watchDurable(`version ${String(v)}`, durableA, profileA);
      const loadedNew = (r.probe?.scripts ?? []).some((s) => s.includes(made.js));
      tables.b.push({ v, ms: r.ms, entry: made.js, loadedNew, ...m });
      say(row(`version ${String(v)} (${String(r.ms)} ms)`, m));
      check(loadedNew, `version ${String(v)}: the page did not load ${made.js}: ${(r.probe?.scripts ?? []).join(' ')}`);
      check(m.httpEntries === 0 && m.codeEntries === 0, `version ${String(v)}: the caches hold ${String(m.httpEntries)} http and ${String(m.codeEntries)} code entries`);
    } finally {
      if (made !== null) removeVersion(base, made);
    }
  }
  check(readFileSync(indexHtml, 'utf8') === base.html, 'B: out/renderer/index.html was not restored');
  check(!readdirSync(assetsDir).some((n) => /p166v\d+/.test(n)), 'B: a version copy was left under out/renderer/assets');
}

// C. The image document, opened in preview.
for (let i = 1; i <= OPENS; i += 1) {
  const r = await launchShot({
    label: `c${String(i)}`,
    profile: profileA,
    delayMs: 4_000,
    drive: { projectPath: project, openRel: 'big.md', mode: 'file', editorMode: 'preview' },
    js: IMAGE_PROBE,
    ceilingMs: 180_000
  });
  const m = measure(profileA);
  durableA = watchDurable(`open ${String(i)}`, durableA, profileA);
  const p = r.probe ?? {};
  tables.c.push({ i, ms: r.ms, ...m, probe: p });
  say(row(`open ${String(i)} (${String(r.ms)} ms)`, m));
  say(`   images ${String(p.imgs)} complete ${String(p.complete)} waited ${String(p.waitedMs)} ms, reload p50 ${String(p.reloadP50)} ms max ${String(p.reloadMax)} ms failed ${String(p.reloadFailed)}, heap ${String(p.heapBefore)} -> ${String(p.heapAfter)}, private ${String(p.memBefore?.privateBytes)} -> ${String(p.memAfter?.privateBytes)}, remote ${String(p.remote)}`);
  check(p.imgs === IMAGES && p.complete === IMAGES, `open ${String(i)}: ${String(p.complete)} of ${String(p.imgs)} images drew, wanted ${String(IMAGES)}`);
  check(p.reloadFailed === 0, `open ${String(i)}: ${String(p.reloadFailed)} reloads through gmux-asset: failed`);
  check(p.remote === 0, `open ${String(i)}: ${String(p.remote)} resources came over http(s)`);
  check(m.httpEntries === 0, `open ${String(i)}: the http cache holds ${String(m.httpEntries)} entries after ${String(IMAGES)} images and ${String(IMAGES)} reloads`);
}

// D. The image viewer with the recovery strip, then the editor on a file,
// both with the network disabled over CDP. The verifier of this phase found
// the knob shipped in shot.ts and driven by nothing; this is where it is used.
{
  const offline = { GMUX_SHOT_OFFLINE: '1' };
  const r1 = await launchShot({
    label: 'd-viewer',
    profile: profileA,
    delayMs: 4_000,
    drive: { projectPath: project, openRel: 'img/shot-1.png', mode: 'file', editorMode: 'image', fakeRestore: true },
    js: VIEWER_PROBE,
    extraEnv: offline
  });
  const p1 = r1.probe ?? {};
  say(`viewer offline: image ${String(p1.viewerImage)} ${String(p1.naturalWidth)}px, recovery strip ${String(p1.restoreStrip)} "${String(p1.restoreStripText)}", navigator.onLine ${String(p1.online)}, remote ${String(p1.remote)}`);
  check(r1.text.includes('[gmux-shot] network offline over CDP'), 'viewer: the harness never went offline');
  check(p1.online === false, `viewer: navigator.onLine reads ${String(p1.online)} with the network disabled`);
  check(p1.viewerImage === true, 'viewer: the image did not draw offline');
  check(p1.restoreStrip === true, 'viewer: the recovery strip did not draw offline with restorable sessions injected');
  check(p1.remote === 0, `viewer: ${String(p1.remote)} resources came over http(s)`);
  const r2 = await launchShot({
    label: 'd-editor',
    profile: profileA,
    delayMs: 4_000,
    drive: { projectPath: project, openRel: 'src/sample.ts', mode: 'file', editorMode: 'file' },
    js: EDITOR_PROBE,
    extraEnv: offline
  });
  const p2 = r2.probe ?? {};
  say(`editor offline: monaco ${String(p2.monaco)}, ${String(p2.lines)} lines, ${String(p2.scripts)} scripts, navigator.onLine ${String(p2.online)}, remote ${String(p2.remote)}`);
  check(r2.text.includes('[gmux-shot] network offline over CDP'), 'editor: the harness never went offline');
  check(p2.online === false, `editor: navigator.onLine reads ${String(p2.online)} with the network disabled`);
  check(p2.monaco === true && p2.lines >= 3, `editor: monaco did not mount offline with the file (${String(p2.lines)} lines)`);
  check(p2.remote === 0, `editor: ${String(p2.remote)} resources came over http(s)`);
  const m = measure(profileA);
  durableA = watchDurable('viewer and editor', durableA, profileA);
  tables.d.push({ viewer: p1, editor: p2, ...m });
  say(row('after viewer, editor', m));
  check(m.httpEntries === 0 && m.codeEntries === 0, `D: the caches hold ${String(m.httpEntries)} http and ${String(m.codeEntries)} code entries`);
}

// G1. The report line in the file: shape, and Chromium's size against the walk.
{
  const rep = await captureReport({ label: 'file-shape', profile: profileA });
  const m = measure(profileA);
  durableA = watchDurable('capture file shape', durableA, profileA);
  if (rep !== null) {
    const d = rep.disk;
    say(`report (file shape): http ${String(d.httpCacheBytes)} B, ceiling ${String(d.httpCacheCeilingBytes)}, mode ${String(d.cachePolicy?.mode)}`);
    check(d.cachePolicy?.mode === 'chromium-default', `report (file shape): mode is ${String(d.cachePolicy?.mode)}`);
    check(d.httpCacheCeilingBytes === null, `report (file shape): a ceiling of ${String(d.httpCacheCeilingBytes)} is applied outside the dev shape`);
    check(typeof d.httpCacheBytes === 'number' && d.httpCacheBytes <= 64 * 1024, `report (file shape): getCacheSize reads ${String(d.httpCacheBytes)} B where the walk finds ${String(m.httpEntryBytes)} B in entries`);
    const lines = String(rep.text ?? '').split('\n');
    check(lines.some((l) => l.startsWith('http cache ceiling Chromium default, up to 1280.0 MB (chromium-default)')), 'report (file shape): the ceiling line is missing');
    check(lines.some((l) => l.startsWith('http cache holds nothing Tortie serves')), 'report (file shape): the holds line is missing');
    check(lines.some((l) => l.startsWith('cache policy chromium-default:')), 'report (file shape): the policy line is missing');
    tables.g.push({ shape: 'file', disk: d, lines: lines.filter((l) => /cache|durable/.test(l)) });
  }
}

// E. The dev shape.
let dev = null;
try {
  dev = await startDevServer();
  const origin = dev.url;
  mkdirSync(profileD, { recursive: true });
  let durableD = snapshotDurable(profileD);
  for (let i = 1; i <= DEV_LAUNCHES; i += 1) {
    const r = await launchShot({ label: `e${String(i)}`, profile: profileD, delayMs: 8_000, rendererUrl: origin, js: STATE_PROBE });
    const m = measure(profileD, origin);
    durableD = watchDurable(`dev launch ${String(i)}`, durableD, profileD);
    tables.e.push({ i, ms: r.ms, ...m, origin: r.probe?.origin ?? null });
    say(row(`dev launch ${String(i)} (${String(r.ms)} ms)`, m));
    for (const c of m.httpClasses.slice(0, 6)) say(`   http ${c.cls.padEnd(44)} ${String(Math.round(c.bytes / 1024)).padStart(7)} KB ${String(c.files).padStart(4)} files`);
    for (const c of m.codeClasses.slice(0, 6)) say(`   code ${c.cls.padEnd(44)} ${String(Math.round(c.bytes / 1024)).padStart(7)} KB ${String(c.files).padStart(4)} files`);
    check(r.probe?.origin === origin, `dev launch ${String(i)}: the renderer origin is ${String(r.probe?.origin)}`);
    const foreign = m.httpClasses.filter((c) => !c.cls.startsWith('dev server'));
    check(foreign.length === 0, `dev launch ${String(i)}: http entries outside the dev server: ${foreign.map((c) => `${c.cls} ${String(c.bytes)} B`).join(', ')}`);
    check(m.httpEntries > 0, `dev launch ${String(i)}: the dev shape wrote nothing, so the shape was not the dev shape`);
  }
  {
    const e = tables.e;
    const from = Math.min(2, e.length);
    const settled = e.slice(from - 1);
    check(settled.every((x) => x.httpEntryBytes === settled[0].httpEntryBytes), `E: the http cache did not plateau from dev launch ${String(from)}: ${settled.map((x) => x.httpEntryBytes).join(',')}`);
    check(settled.every((x) => x.codeEntryBytes === settled[0].codeEntryBytes), `E: the code cache did not plateau from dev launch ${String(from)}: ${settled.map((x) => x.codeEntryBytes).join(',')}`);
    say(`E: plateau from dev launch ${String(from)}: http ${String(settled[0].httpKb)} KB, code ${String(settled[0].codeKb)} KB`);
  }

  // E2. Hot edits to the scratch copy while a window is open.
  {
    const target = join(devSrc, 'src', 'renderer', 'app', 'HomeScreen.tsx');
    const original = readFileSync(target, 'utf8');
    const before = measure(profileD, origin);
    const editor = (async () => {
      await new Promise((r) => setTimeout(r, 12_000));
      for (let i = 1; i <= EDITS; i += 1) {
        writeFileSync(target, `${original}\n// p166 edit ${String(i)} ${String(Date.now())}\n`);
        await new Promise((r) => setTimeout(r, 2_500));
      }
    })();
    let r;
    try {
      r = await launchShot({ label: 'e-edits', profile: profileD, delayMs: 12_000 + EDITS * 2_500 + 5_000, rendererUrl: origin, js: STATE_PROBE, ceilingMs: 60_000 + EDITS * 2_500 });
      await editor;
    } finally {
      writeFileSync(target, original);
    }
    const after = measure(profileD, origin);
    durableD = watchDurable('dev edits', durableD, profileD);
    const perEdit = Math.round((after.httpEntryBytes - before.httpEntryBytes) / EDITS);
    const hot = after.httpClasses.find((c) => c.cls === 'dev server: hot updates');
    tables.e.push({ i: 'edits', edits: EDITS, ms: r.ms, before: before.httpEntryBytes, after: after.httpEntryBytes, perEditBytes: perEdit, hotUpdates: hot ?? null, ...after });
    say(row(`after ${String(EDITS)} edits`, after));
    say(`   http +${String(after.httpEntryBytes - before.httpEntryBytes)} B over ${String(EDITS)} edits, ${String(perEdit)} B per edit, hot update entries ${String(hot?.files ?? 0)} holding ${String(hot?.bytes ?? 0)} B`);
    check(after.httpEntryBytes > before.httpEntryBytes, 'E2: hot edits wrote nothing, so the edits never reached the page');
    check((hot?.files ?? 0) >= EDITS, `E2: ${String(hot?.files ?? 0)} hot update entries after ${String(EDITS)} edits`);
  }

  // F. The ceiling reaches Chromium.
  {
    mkdirSync(profileC, { recursive: true });
    let durableC = snapshotDurable(profileC);
    const uncapped = tables.e[0].httpEntryBytes;
    for (let i = 1; i <= 2; i += 1) {
      const r = await launchShot({
        label: `f${String(i)}`,
        profile: profileC,
        delayMs: 8_000,
        rendererUrl: origin,
        js: STATE_PROBE,
        extraEnv: { GMUX_HTTP_CACHE_CEILING_BYTES: String(CEILING_PROBE_BYTES) }
      });
      const m = measure(profileC, origin);
      durableC = watchDurable(`ceiling launch ${String(i)}`, durableC, profileC);
      tables.f.push({ i, ms: r.ms, ceiling: CEILING_PROBE_BYTES, uncapped, ...m });
      say(row(`ceiling 4 MiB launch ${String(i)} (${String(r.ms)} ms)`, m));
      check(r.probe?.origin === origin, `ceiling launch ${String(i)}: the renderer origin is ${String(r.probe?.origin)}`);
    }
    const last = tables.f[tables.f.length - 1];
    say(`F: uncapped first launch held ${String(uncapped)} B, capped at ${String(CEILING_PROBE_BYTES)} B it holds ${String(last.httpEntryBytes)} B (${(100 * last.httpEntryBytes / uncapped).toFixed(0)} percent of uncapped)`);
    check(last.httpEntryBytes < uncapped / 2, `F: the ceiling did not reach Chromium: ${String(last.httpEntryBytes)} B against ${String(uncapped)} B uncapped`);
    check(last.httpEntryBytes <= CEILING_PROBE_BYTES * 2, `F: the cache overshoots a ${String(CEILING_PROBE_BYTES)} B ceiling by more than double: ${String(last.httpEntryBytes)} B`);
  }

  // G2. The report line in the dev shape.
  {
    const rep = await captureReport({ label: 'dev-shape', profile: profileD, rendererUrl: origin });
    const m = measure(profileD, origin);
    durableD = watchDurable('capture dev shape', durableD, profileD);
    if (rep !== null) {
      const d = rep.disk;
      const ratio = m.httpEntryBytes > 0 ? d.httpCacheBytes / m.httpEntryBytes : null;
      say(`report (dev shape): http ${String(d.httpCacheBytes)} B against the walk's ${String(m.httpEntryBytes)} B in entries (ratio ${ratio === null ? '-' : ratio.toFixed(3)}), ceiling ${String(d.httpCacheCeilingBytes)}, mode ${String(d.cachePolicy?.mode)}`);
      check(d.cachePolicy?.mode === 'dev-ceiling', `report (dev shape): mode is ${String(d.cachePolicy?.mode)}`);
      check(d.httpCacheCeilingBytes === 128 * 1024 * 1024, `report (dev shape): the ceiling reads ${String(d.httpCacheCeilingBytes)}`);
      check(ratio !== null && ratio > 0.9 && ratio < 1.1, `report (dev shape): getCacheSize ${String(d.httpCacheBytes)} B disagrees with the walk ${String(m.httpEntryBytes)} B by more than ten percent`);
      const lines = String(rep.text ?? '').split('\n');
      check(lines.some((l) => l.startsWith('http cache ceiling 128.0 MB (dev-ceiling)')), 'report (dev shape): the ceiling line is missing');
      check(lines.some((l) => l.startsWith('http cache holds dev server modules and hot updates only')), 'report (dev shape): the holds line is missing');
      tables.g.push({ shape: 'dev', disk: d, walkEntryBytes: m.httpEntryBytes, lines: lines.filter((l) => /cache|durable/.test(l)) });
    }
  }
} finally {
  if (dev !== null) await dev.server.close().catch(() => undefined);
}

// ---------------------------------------------------------------------------
// The end: what was left, the absolute, the report
// ---------------------------------------------------------------------------

const sessionsAfter = operatorSessionCount();
say(`operator sessions after: ${String(sessionsAfter)}`);
check(sessionsAfter === sessionsBefore, `the operator's session count moved from ${String(sessionsBefore)} to ${String(sessionsAfter)}`);
// A second workflow may run its own Electrons beside this one, so a new pid
// is only this probe's leak when its command line names this worktree or this
// probe's scratch root. A bare `Tortie` row carries no arguments; it is
// counted as this probe's when its parent is gone, because the helper's
// teardown is the only way one of ours could have reparented.
const electronsNew = [...electronsLeft()].filter(([pid]) => !electronsBefore.has(pid));
const commandOf = (pid) => spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout.trim();
const electronsLeaked = [];
const electronsOthers = [];
for (const [pid, line] of electronsNew) {
  const cmd = commandOf(pid);
  const bare = /\sTortie$/.test(line) && cmd === 'Tortie';
  const ppid = Number(/^\s*\d+\s+(\d+)/.exec(line)?.[1] ?? '0');
  if (cmd.includes(repoRoot) || cmd.includes(root) || (bare && ppid === 1)) electronsLeaked.push(line);
  else electronsOthers.push(line);
}
check(electronsLeaked.length === 0, `Electrons left after the run: ${electronsLeaked.join(' | ')}`);
say(`electrons left by this probe: ${String(electronsLeaked.length)}; new electrons belonging to something else: ${String(electronsOthers.length)}${electronsOthers.length > 0 ? ` (${electronsOthers.map((l) => l.split(/\s+/).slice(0, 2).join(':')).join(', ')})` : ''}`);

for (const f of durableFindings) failures.push(f);
const durableTouched = durableLog.filter((d) => d.removed.length + d.changed.length + d.added.length > 0);
const rotated = [...new Set(durableLog.flatMap((d) => d.removed))].sort();
say(`durable watch: ${String(durableLog.length)} snapshots, ${String(durableTouched.length)} with movement, removed only by the manifest's own backup rotation: ${rotated.join(', ') || 'none'}, every change one of Tortie's own writers: ${String(durableFindings.length === 0)}`);
const movedPaths = [...new Set(durableLog.flatMap((d) => [...d.changed, ...d.added]))].sort();
say(`durable paths that moved across the run: ${movedPaths.join(', ') || 'none'}`);

const report = {
  at: new Date().toISOString(),
  commit: spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim() || null,
  root,
  knobs: { LAUNCHES, VERSIONS, OPENS, DEV_LAUNCHES, EDITS, IMAGES, CEILING_PROBE_BYTES },
  sessionsBefore,
  sessionsAfter,
  electronsLeft: electronsLeaked,
  tables,
  durable: { log: durableLog, findings: durableFindings, movedPaths, ownWriters: DURABLE_OWN_WRITES.map(String) },
  failures
};
const reportPath = join(outDir, 'p166-report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
say(`report: ${reportPath}`);

if (failures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const f of failures) console.error(`${TAG}   - ${f}`);
  process.exit(1);
}
say('PASS');
process.exit(0);
