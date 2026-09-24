#!/usr/bin/env node
/**
 * `node build/p316/app-icon.mjs [--write]` — the iPhone app's icon, made from
 * the brand master (Phase 316.4, build/p316/SPEC.md §4 S4).
 *
 * WHY IT EXISTS. The master, docs/brand/tortie/master/tortie-master-1024.png,
 * is the freestanding mark on a transparent ground (`sips -g hasAlpha` reads
 * yes, SPEC §3.9), and App Store Connect refuses an app icon that has an alpha
 * channel. So the icon is the master laid over ONE opaque ground and written
 * with no alpha channel at all. That is the whole derivation, and it is here so
 * a new master makes a new icon with one command instead of by hand.
 *
 * THE GROUND IS `--bg-canvas` OF THE LIGHT BASE, #f5f7fa, which tokens.css
 * calls paper. It is the ground Tortie's own window draws on its light base, so
 * the colour is Tortie's already. Why paper and not the phone's own dark ground:
 * the mark is a near-black cat (its body is #212a2b) with blue seams inside it.
 * On every dark ground Tortie has, the body reads 1.17 to 1.30 to 1, so the cat
 * would vanish and only the seams would show. On paper it reads 13.68 to 1.
 * Paper is not white, and tokens.css says why: white beside a dark shape is
 * the "contrast well" DESIGN.md §0 names. The brand README asks for no generated
 * rounded square, badge or circle around the mark. iOS draws its own rounded
 * mask over every icon, so the ground is a plain square and nothing else.
 *
 * THE ARITHMETIC. The master's pixels are straight RGBA. Each channel of the
 * icon is round((m·a + g·(255 − a)) / 255) in the 8-bit sRGB values, where m
 * is the master's channel, a its alpha and g the ground's channel. That is how
 * a PNG is laid over a colour. The result has no alpha to keep. The sum can
 * never land on .5, because its numerator is a whole number and 255 is odd, so
 * the rounding has only one answer. `conformance:ios` rule (r) decodes the
 * committed icon and checks every pixel against this formula with its own code,
 * so the gate never trusts this file's encoder.
 *
 * WHAT IT WRITES. One 1024 × 1024 PNG: 8-bit RGB (colour type 2, no alpha), an
 * `sRGB` chunk, no `tRNS`, not interlaced. It goes to
 * ios/Tortie/Assets.xcassets/AppIcon.appiconset/AppIcon.png. Each row takes the
 * PNG filter whose bytes sum smallest, and zlib compresses at level 9. The gate
 * compares pixels, never bytes, so another zlib gives another file with the
 * same icon and the gate stays green.
 *
 *   node build/p316/app-icon.mjs            check: exit 1 when the committed icon is not the master on paper
 *   node build/p316/app-icon.mjs --write    write it
 *
 * It reads two files of the tree and writes at most one. It starts nothing and
 * opens no socket.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { decodePng } from '../png-read.mjs';

/** The brand master, relative to the repository. */
export const ICON_MASTER = 'docs/brand/tortie/master/tortie-master-1024.png';

/** The icon the app ships, relative to the repository. */
export const ICON_PATH = 'ios/Tortie/Assets.xcassets/AppIcon.appiconset/AppIcon.png';

/** The ground: a token Tortie already uses, named by its base and its name, never by a second copy of its value. */
export const ICON_GROUND = Object.freeze({ base: 'light', token: '--bg-canvas' });

/** The side of the one icon App Store Connect takes (the asset catalog's single size). */
export const ICON_SIDE = 1024;

/**
 * The tokens of one base of tokens.css: `dark` is the first `:root {` block,
 * `light` is `:root[data-scheme='light'] {`. Comments come out first, and each
 * `--name: value;` is kept as written, lower case.
 */
export function baseTokens(css, base) {
  const head = base === 'dark' ? /(^|\n):root\s*\{/ : /(^|\n):root\[data-scheme=['"]light['"]\]\s*\{/;
  const at = css.search(head);
  if (at === -1) return new Map();
  const open = css.indexOf('{', at);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = css.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map();
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim().toLowerCase());
  return out;
}

/** The ground's `[r, g, b]`, read from tokens.css. Throws when the token is not a six digit hex there. */
export function groundOf(css, ground = ICON_GROUND) {
  const value = baseTokens(css, ground.base).get(ground.token);
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(value ?? '');
  if (m === null) throw new Error(`tokens.css's ${ground.base} base holds ${ground.token} as ${JSON.stringify(value ?? null)}; the icon's ground is a six digit hex token`);
  return [1, 2, 3].map((i) => parseInt(m[i], 16));
}

/** The master laid over the ground: `width × height × 3` bytes of RGB. */
export function flatten(master, ground) {
  const { width, height, data } = master;
  const rgb = Buffer.alloc(width * height * 3);
  for (let p = 0; p < width * height; p += 1) {
    const a = data[p * 4 + 3];
    for (let c = 0; c < 3; c += 1) rgb[p * 3 + c] = Math.round((data[p * 4 + c] * a + ground[c] * (255 - a)) / 255);
  }
  return rgb;
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
  return Buffer.concat([head, body, crc]);
}

/** An 8-bit RGB PNG (colour type 2) of `rgb`, sRGB-tagged, each row with the filter whose bytes sum smallest. */
export function encodeRgbPng(width, height, rgb) {
  const stride = width * 3;
  const rows = [];
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const line = rgb.subarray(y * stride, (y + 1) * stride);
    let best = null;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f += 1) {
      const out = Buffer.alloc(stride + 1);
      out[0] = f;
      let sum = 0;
      for (let i = 0; i < stride; i += 1) {
        const a = i >= 3 ? line[i - 3] : 0;
        const b = prev[i];
        const c = i >= 3 ? prev[i - 3] : 0;
        let predictor = 0;
        if (f === 1) predictor = a;
        else if (f === 2) predictor = b;
        else if (f === 3) predictor = (a + b) >> 1;
        else if (f === 4) {
          const q = a + b - c;
          const pa = Math.abs(q - a);
          const pb = Math.abs(q - b);
          const pc = Math.abs(q - c);
          predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const v = (line[i] - predictor) & 255;
        out[i + 1] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) {
        best = out;
        bestSum = sum;
      }
    }
    rows.push(best);
    prev = line;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2: RGB, no alpha
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // not interlaced
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('sRGB', Buffer.from([0])), // perceptual: the master's colours are sRGB (docs/brand/tortie/README.md)
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/** The icon's PNG bytes, from the master's PNG bytes and tokens.css's text. */
export function makeIcon(masterPng, css, ground = ICON_GROUND) {
  const master = decodePng(masterPng);
  if (master.width !== ICON_SIDE || master.height !== ICON_SIDE) throw new Error(`the master is ${String(master.width)} × ${String(master.height)}; the icon is ${String(ICON_SIDE)} × ${String(ICON_SIDE)}`);
  return encodeRgbPng(master.width, master.height, flatten(master, groundOf(css, ground)));
}

// ---------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------

const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const TAG = '[p316-icon]';
  const masterPng = readFileSync(join(ROOT, ICON_MASTER));
  const css = readFileSync(join(ROOT, 'src', 'renderer', 'styles', 'tokens.css'), 'utf8');
  const made = makeIcon(masterPng, css);
  const hex = `#${groundOf(css).map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  if (process.argv.includes('--write')) {
    writeFileSync(join(ROOT, ICON_PATH), made);
    process.stdout.write(`${TAG} wrote ${ICON_PATH}: ${ICON_MASTER} on ${ICON_GROUND.token} of the ${ICON_GROUND.base} base (${hex}), ${String(made.length)} bytes, RGB with no alpha.\n`);
  } else {
    let committed;
    try {
      committed = decodePng(readFileSync(join(ROOT, ICON_PATH)));
    } catch (err) {
      process.stdout.write(`${TAG} FAIL. ${ICON_PATH} cannot be read (${String(err?.message ?? err)}); run node build/p316/app-icon.mjs --write.\n`);
      process.exit(1);
    }
    const want = decodePng(made);
    const same = committed.width === want.width && committed.height === want.height && Buffer.compare(committed.data, want.data) === 0;
    if (!same) {
      process.stdout.write(`${TAG} FAIL. ${ICON_PATH} is not ${ICON_MASTER} on ${hex}; run node build/p316/app-icon.mjs --write.\n`);
      process.exit(1);
    }
    process.stdout.write(`${TAG} PASS. ${ICON_PATH} is ${ICON_MASTER} on ${ICON_GROUND.token} of the ${ICON_GROUND.base} base (${hex}), pixel for pixel.\n`);
  }
}
