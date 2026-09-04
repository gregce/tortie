/**
 * A small PNG reader for what CDP hands back (Phase 213): 8 bit RGB or RGBA,
 * non interlaced, which is every screencast frame and every captureScreenshot.
 * Carried over from research 80's harness (docs/research/assets/80-light-mode/
 * lib/png.mjs). `dominant` is how a frame is read as ONE colour: the most
 * common pixel inside a rectangle and the share it holds, sampled on a grid.
 * No dependency.
 */

import { inflateSync } from 'node:zlib';

export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let off = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
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
      if (data[12] !== 0) throw new Error('interlaced');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`bit depth ${String(bitDepth)}`);
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const f = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride));
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let x = line[i];
      if (f === 1) x += a;
      else if (f === 2) x += b;
      else if (f === 3) x += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        x += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = x & 255;
    }
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      const s = x * bpp;
      if (bpp >= 3) {
        out[o] = line[s];
        out[o + 1] = line[s + 1];
        out[o + 2] = line[s + 2];
        out[o + 3] = bpp === 4 ? line[s + 3] : 255;
      } else {
        out[o] = line[s];
        out[o + 1] = line[s];
        out[o + 2] = line[s];
        out[o + 3] = bpp === 2 ? line[s + 1] : 255;
      }
    }
    prev = line;
  }
  return { width, height, data: out };
}

export function pixel(img, x, y) {
  const o = (Math.round(y) * img.width + Math.round(x)) * 4;
  const d = img.data;
  return `#${[d[o], d[o + 1], d[o + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** The most common colour inside a rectangle, and the share it holds. */
export function dominant(img, x, y, w, h, stepPx = 2) {
  const counts = new Map();
  let n = 0;
  const x1 = Math.min(img.width, x + w);
  const y1 = Math.min(img.height, y + h);
  for (let yy = Math.max(0, y); yy < y1; yy += stepPx) {
    for (let xx = Math.max(0, x); xx < x1; xx += stepPx) {
      const p = pixel(img, xx, yy);
      counts.set(p, (counts.get(p) ?? 0) + 1);
      n += 1;
    }
  }
  let best = null;
  let bestN = 0;
  for (const [k, v] of counts) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return { colour: best, share: n === 0 ? 0 : bestN / n, distinct: counts.size };
}

/**
 * The share of pixels inside a rectangle that sit within `levels` of one
 * colour per channel (Phase 213). `dominant` answers what a frame mostly is;
 * this answers whether a frame holds ANY of a colour it must not hold, which
 * is what a boot's first frame is really judged on: a light boot may draw its
 * whole chrome in the first frame it delivers and still be right, but no part
 * of it may be the other base's ground.
 */
export function shareNear(img, x, y, w, h, colour, levels = 1, stepPx = 4) {
  const want = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(colour).trim());
  if (want === null) return 0;
  const target = [1, 2, 3].map((i) => parseInt(want[i], 16));
  const x1 = Math.min(img.width, x + w);
  const y1 = Math.min(img.height, y + h);
  let n = 0;
  let hit = 0;
  for (let yy = Math.max(0, y); yy < y1; yy += stepPx) {
    for (let xx = Math.max(0, x); xx < x1; xx += stepPx) {
      const o = (yy * img.width + xx) * 4;
      const d = img.data;
      if (
        Math.abs(d[o] - target[0]) <= levels &&
        Math.abs(d[o + 1] - target[1]) <= levels &&
        Math.abs(d[o + 2] - target[2]) <= levels
      ) {
        hit += 1;
      }
      n += 1;
    }
  }
  return n === 0 ? 0 : hit / n;
}
