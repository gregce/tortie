#!/usr/bin/env node
/**
 * probe-p195-dot.mjs. The Explorer's dirty descendant dot, read off pixels.
 *
 * ## What it proves
 *
 * Research 75 C3: the Explorer painted the dirty descendant dot in
 * --git-modified at full strength, dE2000 4.45 from --status-attention, the
 * one colour reserved for "an agent needs you". Phase 195 repaints it
 * --text-muted. No probe under build/ photographed a tree with a dirty
 * descendant folder before this one, so this is the reading: one launch on a
 * scratch repository with a modified file inside a subfolder, the Explorer
 * open, one picture, and the dot's pixel read back from the PNG and compared
 * to the tokens with CIEDE2000 and WCAG contrast computed here by hand.
 *
 * Run it at the parent and at HEAD and the two readings are the proof.
 *
 * ## What it changes
 *
 * Nothing that belongs to the person. It writes one picture and one JSON
 * reading into its output directory, in a scratch project it makes and
 * removes. No session is created and the operator's tmux server is only ever
 * listed.
 *
 * ## Environment it reads
 *
 *   P195_OUT_DIR   where the picture and the JSON go. Default out/p195.
 *   P195_LABEL     a word folded into the file names, e.g. parent or head.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - The Electron launch uses a scratch `--user-data-dir` under the harness
 *    directory and goes through build/electron-run.mjs, which ends the whole
 *    tree it started in a finally block whatever happened.
 *  - There is no pkill and no kill-server anywhere in this file.
 *
 * ## Usage, from the worktree root
 *
 *   npm run build
 *   P195_LABEL=head node build/harness-socket.mjs gmux-p195-dot \
 *     'node build/probe-p195-dot.mjs'
 *
 * Exit 0 when the dot was found, photographed and read. 1 when it was not.
 * 2 when the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p195]';

const say = (line) => { console.log(`${TAG} ${line}`); };
const refuse = (why) => { console.error(`${TAG} ${why}`); process.exit(2); };

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p195-dot 'node " +
      "build/probe-p195-dot.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const label = (process.env['P195_LABEL'] ?? '').trim() || 'run';
const outDir = resolve(repoRoot, (process.env['P195_OUT_DIR'] ?? '').trim() || 'out/p195');
mkdirSync(outDir, { recursive: true });

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);
say(`label: ${label}`);

// ---------------------------------------------------------------------------
// One scratch project: a git repository with a modified file inside a folder,
// so the folder carries the dirty descendant dot.
// ---------------------------------------------------------------------------

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'gmux-p195-dot');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p195-project', 'src', 'deep'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p195-project');
writeFileSync(join(project, 'README.md'), '# Phase 195\n\nScratch project.\n', 'utf8');
writeFileSync(join(project, 'src', 'index.ts'), 'export const one = 1;\n', 'utf8');
writeFileSync(join(project, 'src', 'deep', 'inner.ts'), 'export const two = 2;\n', 'utf8');

const git = (...args) =>
  spawnSync('git', ['-C', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p195@example.invalid');
git('config', 'user.name', 'Phase 195 probe');
git('config', 'commit.gpgsign', 'false');
git('add', '-A');
git('commit', '-q', '-m', 'first');
writeFileSync(join(project, 'src', 'deep', 'inner.ts'), 'export const two = 2;\nexport const three = 3;\n', 'utf8');

// ---------------------------------------------------------------------------
// The one expression the driven window evaluates
// ---------------------------------------------------------------------------

const PROBE_JS = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(1))));
  const q = (s, r) => (r || document).querySelector(s);
  const r1 = (n) => Math.round(n * 10) / 10;
  const box = (el) => {
    const b = el.getBoundingClientRect();
    return { top: r1(b.top), left: r1(b.left), width: r1(b.width), height: r1(b.height) };
  };
  /** Every dirty descendant dot under a root, following shadow roots. */
  const dots = () => {
    const out = [];
    const walk = (node, depth) => {
      if (node === null || node === undefined || depth > 12) return;
      for (const el of Array.from(node.querySelectorAll('[data-item-contains-git-change="true"] > [data-item-section="git"]'))) {
        out.push(el);
      }
      for (const el of Array.from(node.querySelectorAll('*'))) {
        if (el.shadowRoot) walk(el.shadowRoot, depth + 1);
      }
    };
    walk(document, 0);
    return out;
  };
  const tokens = getComputedStyle(document.documentElement);
  const token = (n) => tokens.getPropertyValue(n).trim();
  try {
    const railButton = Array.from(document.querySelectorAll('[data-slot="activity-bar"] .ab-item')).find(
      (b) => (b.getAttribute('aria-label') || '').toLowerCase().startsWith('explorer')
    );
    if (railButton && railButton.getAttribute('aria-pressed') !== 'true') railButton.click();
    const deadline = Date.now() + 30000;
    let found = [];
    while (Date.now() < deadline) {
      found = dots().filter((el) => el.getBoundingClientRect().width > 0);
      if (found.length > 0) break;
      await wait(500);
    }
    await wait(800);
    await frame();
    if (found.length === 0) return { error: 'no dirty descendant dot appeared in the Explorer within 30 s' };
    const rows = found.map((el) => {
      const c = getComputedStyle(el);
      const row = el.parentElement;
      const name = row ? (row.querySelector('[data-item-section="content"]') || row).textContent : '';
      const inner = el.querySelector('svg, span, *');
      return {
        row: String(name || '').trim().slice(0, 40),
        color: c.color,
        opacity: c.opacity,
        fill: c.fill,
        box: box(el),
        glyphBox: inner ? box(inner) : null
      };
    });
    const sidebar = q('.sidebar');
    return {
      devicePixelRatio: window.devicePixelRatio,
      sidebarBackground: sidebar ? getComputedStyle(sidebar).backgroundColor : null,
      tokens: {
        textMuted: token('--text-muted'),
        gitModified: token('--git-modified'),
        statusAttention: token('--status-attention'),
        bgSidebar: token('--bg-sidebar')
      },
      dots: rows
    };
  } catch (err) {
    return { error: String((err && err.stack) || err) };
  }
})()`;

// ---------------------------------------------------------------------------
// A PNG reader. Node core zlib only, no package: the five filters, 8 bit
// RGB and RGBA, which is what capturePage writes.
// ---------------------------------------------------------------------------

function readPng(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`not a png: ${path}`);
  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`bit depth ${String(bitDepth)} unsupported`);
  if (interlace !== 0) throw new Error('interlaced png unsupported');
  const channels = { 2: 3, 6: 4 }[colorType];
  if (channels === undefined) throw new Error(`colour type ${String(colorType)} unsupported`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let x = line[i];
      switch (filter) {
        case 0: break;
        case 1: x += a; break;
        case 2: x += b; break;
        case 3: x += (a + b) >> 1; break;
        case 4: {
          const pp = a + b - c;
          const pa = Math.abs(pp - a);
          const pb = Math.abs(pp - b);
          const pc = Math.abs(pp - c);
          x += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`bad filter ${String(filter)}`);
      }
      cur[i] = x & 255;
    }
    prev = cur;
  }
  return { width, height, channels, data: out };
}

function pixelAt(png, x, y) {
  const i = (y * png.width + x) * png.channels;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
}

const toHex = (rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');

// ---------------------------------------------------------------------------
// Colour arithmetic by hand: sRGB to Lab, CIEDE2000, WCAG contrast.
// ---------------------------------------------------------------------------

function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function contrast(a, b) {
  const l1 = lum(hexToRgb(a));
  const l2 = lum(hexToRgb(b));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
function lab(rgb) {
  const [r, g, b] = rgb.map(lin);
  const xyz = [
    (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047,
    (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1.0,
    (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883
  ];
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [x, y, z] = xyz.map(f);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const d2r = (d) => (d * Math.PI) / 180;
const r2d = (r) => (r * 180) / Math.PI;
function de2000(h1, h2) {
  const [L1, a1, b1] = lab(hexToRgb(h1));
  const [L2, a2, b2] = lab(hexToRgb(h2));
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hp = (a, b) => {
    if (a === 0 && b === 0) return 0;
    const h = r2d(Math.atan2(b, a));
    return h < 0 ? h + 360 : h;
  };
  const h1p = hp(a1p, b1);
  const h2p = hp(a2p, b2);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else dhp = h2p - h1p > 180 ? h2p - h1p - 360 : h2p - h1p + 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(d2r(dhp) / 2);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp;
  if (C1p * C2p === 0) hbp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
  else hbp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  const T =
    1 -
    0.17 * Math.cos(d2r(hbp - 30)) +
    0.24 * Math.cos(d2r(2 * hbp)) +
    0.32 * Math.cos(d2r(3 * hbp + 6)) -
    0.2 * Math.cos(d2r(4 * hbp - 63));
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(d2r(2 * dTheta)) * RC;
  return Math.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH));
}

// ---------------------------------------------------------------------------
// One launch, one picture, one reading.
// ---------------------------------------------------------------------------

async function main() {
  const png = join(outDir, `p195-${label}-dot.png`);
  rmSync(png, { force: true });
  const drive = { projectPath: project, sidebarView: 'explorer' };
  say('launch');
  const { code, text } = await runElectron({
    label: `p195 ${label}`,
    userDataDir: join(root, 'profile'),
    cwd: repoRoot,
    env: {
      ...process.env,
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '9000',
      GMUX_SHOT_SIZE: '1600x1000',
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      GMUX_SHOT_JS: PROBE_JS
    },
    ceilingMs: 300_000,
    settleMs: 500
  });
  const marker = '[gmux-shot] probe ';
  const at = text.lastIndexOf(marker);
  let report = null;
  if (at !== -1) {
    try { report = JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? ''); } catch { report = null; }
  }

  const failures = [];
  if (!existsSync(png)) failures.push('no picture was written');
  if (report === null) failures.push(`the driven window printed no reading (electron exited ${String(code)})`);
  else if (report.error !== undefined) failures.push(`the driver reported ${String(report.error)}`);

  let reading = null;
  if (failures.length === 0) {
    const image = readPng(png);
    const dpr = Number(report.devicePixelRatio) || 1;
    const dot = report.dots[0];
    const b = dot.glyphBox && dot.glyphBox.width > 0 ? dot.glyphBox : dot.box;
    // The centre of the dot in device pixels, and the eight around it, so an
    // antialiased edge cannot pass for the fill.
    const cx = Math.round((b.left + b.width / 2) * dpr);
    const cy = Math.round((b.top + b.height / 2) * dpr);
    const samples = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) samples.push(toHex(pixelAt(image, cx + dx, cy + dy)));
    }
    const centre = samples[4];
    const t = report.tokens;
    reading = {
      picture: png,
      pictureSize: `${String(image.width)}x${String(image.height)}`,
      devicePixelRatio: dpr,
      dotRow: dot.row,
      dotBox: b,
      dotComputedColor: dot.color,
      dotComputedOpacity: dot.opacity,
      centreDevicePixel: [cx, cy],
      centrePixel: centre,
      neighbours: samples,
      tokens: t,
      de2000: {
        toStatusAttention: Number(de2000(centre, t.statusAttention).toFixed(2)),
        toGitModified: Number(de2000(centre, t.gitModified).toFixed(2)),
        toTextMuted: Number(de2000(centre, t.textMuted).toFixed(2))
      },
      contrastOnSidebar: Number(contrast(centre, t.bgSidebar).toFixed(2))
    };
    say('');
    say(`dot on row "${dot.row}" at ${JSON.stringify(b)} css px, dpr ${String(dpr)}`);
    say(`computed colour ${dot.color} at opacity ${dot.opacity}`);
    say(`centre pixel ${centre}, neighbours ${samples.join(' ')}`);
    say(`dE2000 to --status-attention ${t.statusAttention}: ${String(reading.de2000.toStatusAttention)}`);
    say(`dE2000 to --git-modified ${t.gitModified}: ${String(reading.de2000.toGitModified)}`);
    say(`dE2000 to --text-muted ${t.textMuted}: ${String(reading.de2000.toTextMuted)}`);
    say(`contrast on --bg-sidebar ${t.bgSidebar}: ${String(reading.contrastOnSidebar)}:1`);
    writeFileSync(join(outDir, `p195-${label}-dot.json`), JSON.stringify(reading, null, 2) + '\n', 'utf8');
  }

  const operatorAfter = operatorSessionCount();
  say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
  if (operatorAfter !== operatorBefore) {
    failures.push(`the operator session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`);
  }
  rmSync(rawRoot, { recursive: true, force: true });
  if (failures.length > 0) {
    for (const f of failures) say(`FAIL ${f}`);
    return 1;
  }
  say(`OK picture ${png}`);
  return 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (err) => {
    console.error(`${TAG} ${String((err && err.stack) || err)}`);
    process.exitCode = 1;
  }
);
