/**
 * Phase 316.1. The pairing code: the vendored encoder, the path drawn from it,
 * and its two colours.
 *
 * What these tests hold, each red if its clause is taken away:
 *
 * - THE VENDORED ENCODER IS UPSTREAM'S. Six symbols are pinned by the sha256 of
 *   their module bits, and one digest covers all 160 versions and levels, each
 *   computed from Project Nayuki's upstream file compiled as its own namespace
 *   script, never from the copy in the tree. An edit to a table, a mask rule
 *   or the Reed-Solomon arithmetic moves a digest.
 * - THE LICENCE HEADER IS KEPT, byte for byte, at the top of the copy.
 * - THE PATH IS EXACTLY THE DARK MODULES. The path is parsed back into cells
 *   here, by a reader that shares nothing with `qrShape`, and compared with the
 *   encoder's own `getModule` over every cell, the quiet zone included, which
 *   must be empty.
 * - A MODULE IS A WHOLE NUMBER OF PIXELS, at least two, for every version the
 *   largest payload main can write reaches.
 * - DARK INK ON A LIGHT GROUND IN BOTH THEMES. The drawn element pins its own
 *   colour scheme to light and paints its ground and ink from ./qr-colors.ts;
 *   neither colour is a theme token, because a token follows the theme.
 * - THE PAYLOAD IS NEVER TEXT. A made-up tailnet key inside the payload
 *   appears nowhere in the drawn markup.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Qr, QR_QUIET_ZONE, QR_TARGET_PX, qrModulePx, qrShape } from '../phone/Qr';
import { QR_COLOR_SCHEME, QR_GROUND, QR_INK } from '../phone/qr-colors';
import { QrCode, QrSegment } from '../phone/qrcodegen';

/** A key shaped like his, and made up. No real key exists anywhere here. */
const FAKE_KEY = `tskey-auth-kP316FAKE-${'Q'.repeat(40)}`;

/** A v:2 payload the size main writes, with the longest key main admits. */
function payload(key: string | null): string {
  return JSON.stringify({
    v: 2,
    host: '100.101.102.103',
    port: 8823,
    fp: 'A'.repeat(43),
    dk: 'B'.repeat(59),
    dx: 'C'.repeat(59),
    ps: 'D'.repeat(22),
    exp: 1_790_000_000_000,
    ...(key === null ? {} : { tk: key })
  });
}

function bits(code: QrCode): string {
  let out = '';
  for (let y = 0; y < code.size; y += 1) {
    for (let x = 0; x < code.size; x += 1) out += code.getModule(x, y) ? '1' : '0';
  }
  return out;
}

/** The dark cells a path draws, read back from `M x y h n v1 h-n z` runs. */
function cellsOf(d: string): Set<string> {
  const cells = new Set<string>();
  const run = /M(\d+) (\d+)h(\d+)v1h-(\d+)z/g;
  let consumed = 0;
  for (const m of d.matchAll(run)) {
    const [whole, x, y, n, back] = m;
    expect(back).toBe(n);
    consumed += whole.length;
    for (let i = 0; i < Number(n); i += 1) cells.add(`${String(Number(x) + i)},${y}`);
  }
  // Nothing in the path that is not a run.
  expect(consumed).toBe(d.length);
  return cells;
}

describe('the vendored encoder is upstream’s', () => {
  const LEVELS = {
    LOW: QrCode.Ecc.LOW,
    MEDIUM: QrCode.Ecc.MEDIUM,
    QUARTILE: QrCode.Ecc.QUARTILE,
    HIGH: QrCode.Ecc.HIGH
  };

  // Computed from nayuki/QR-Code-generator at 8329a710, typescript-javascript/
  // qrcodegen.ts compiled by tsc as a namespace script: [text, level, version,
  // mask, sha256 of the row-major module bits].
  const PINS: readonly [string, keyof typeof LEVELS, number, number, string][] = [
    ['Hello, world!', 'LOW', 1, 2, '9ec093e9c8e6ca1bb4c4a28edde04d1b1c96221e49a45ee3e26f278397d05d72'],
    ['0123456789', 'HIGH', 1, 6, '0af3374bd579b235e6213b6c84d75da0e615c089d0a3bc20e434eed1f87cd424'],
    ['HELLO WORLD 123', 'QUARTILE', 1, 0, '20afbe2ccab7b063f090429cbb013272c0962822b879a83cbc3fcc4fa2b0ceed'],
    ['{"v":2,"host":"100.64.0.1","port":8823,"exp":1790000000000}', 'MEDIUM', 4, 2, 'cc0291d71455b69214d18f28451a4c665a2161321646d32c1343117e93cb61e0'],
    ['héllo ✓ 日本', 'MEDIUM', 2, 3, '2a4cdb7e065a345d03219ad1037784e7c4f44c1652ab265305e60677d78f6ac1'],
    ['x'.repeat(600), 'MEDIUM', 19, 0, '784a1c88f3adb19475daa35bc6915f41cb1fb040d072d3713fc5810927056f34']
  ];

  for (const [text, level, version, mask, sha] of PINS) {
    it(`draws ${text.length > 24 ? `${text.slice(0, 12)}… (${String(text.length)})` : text} at ${level} exactly as upstream does`, () => {
      const code = QrCode.encodeText(text, LEVELS[level]);
      expect(code.version).toBe(version);
      expect(code.mask).toBe(mask);
      expect(createHash('sha256').update(bits(code)).digest('hex')).toBe(sha);
    });
  }

  // Every version at every level, forced one at a time with the same seven
  // bytes, so every row of every table the encoder carries (blocks, error
  // correction codewords, alignment positions) and the mask penalty are in
  // one digest. Computed the same way from the same upstream file.
  it('draws every version at every level exactly as upstream does', () => {
    const digest = createHash('sha256');
    let symbols = 0;
    for (const level of ['LOW', 'MEDIUM', 'QUARTILE', 'HIGH'] as const) {
      for (let v = 1; v <= 40; v += 1) {
        const data = Array.from({ length: 7 }, (_, i) => (i * 37 + v * 11) & 0xff);
        const code = QrCode.encodeSegments([QrSegment.makeBytes(data)], LEVELS[level], v, v, -1, false);
        digest.update(`${level}:${String(v)}:${String(code.mask)}:${bits(code)}\n`);
        symbols += 1;
      }
    }
    expect(symbols).toBe(160);
    expect(digest.digest('hex')).toBe(
      '418806af70dfe9ba45a26e5031e15aa43ed8747c6f13ce9abdab623c4dca86cc'
    );
  });

  it('keeps upstream’s licence header at the top of the copy', () => {
    const source = readFileSync(join(__dirname, '..', 'phone', 'qrcodegen.ts'), 'utf8');
    const head = source.split('\n').slice(0, 22).join('\n');
    expect(head).toContain(' * QR Code generator library (TypeScript)');
    expect(head).toContain(' * Copyright (c) Project Nayuki. (MIT License)');
    expect(head).toContain(
      ' * - The above copyright notice and this permission notice shall be included in'
    );
  });
});

describe('the path is exactly the dark modules', () => {
  for (const [name, text] of [
    ['a payload with no key', payload(null)],
    ['a payload with the longest key main admits', payload(`tskey-auth-${'k'.repeat(245)}`)],
    ['a short text', 'Hello, world!']
  ] as const) {
    it(`for ${name}`, () => {
      const shape = qrShape(text);
      expect(shape).not.toBeNull();
      if (shape === null) return;
      const code = QrCode.encodeText(text, QrCode.Ecc.MEDIUM);
      expect(shape.size).toBe(code.size + QR_QUIET_ZONE * 2);
      const drawn = cellsOf(shape.d);
      let dark = 0;
      for (let y = 0; y < shape.size; y += 1) {
        for (let x = 0; x < shape.size; x += 1) {
          const inside =
            x >= QR_QUIET_ZONE &&
            y >= QR_QUIET_ZONE &&
            x < shape.size - QR_QUIET_ZONE &&
            y < shape.size - QR_QUIET_ZONE;
          const want = inside && code.getModule(x - QR_QUIET_ZONE, y - QR_QUIET_ZONE);
          if (want) dark += 1;
          expect(drawn.has(`${String(x)},${String(y)}`), `${String(x)},${String(y)}`).toBe(want);
        }
      }
      expect(drawn.size).toBe(dark);
    });
  }

  it('asks for four modules of quiet zone, as the standard does', () => {
    expect(QR_QUIET_ZONE).toBe(4);
  });
});

describe('a module is a whole number of pixels', () => {
  it('for every version from 1 to the one the longest payload reaches', () => {
    const longest = qrShape(payload(`tskey-auth-${'k'.repeat(245)}`));
    expect(longest).not.toBeNull();
    const top = longest?.size ?? 0;
    for (let size = 21 + QR_QUIET_ZONE * 2; size <= top; size += 4) {
      const px = qrModulePx(size);
      expect(Number.isInteger(px)).toBe(true);
      expect(px).toBeGreaterThanOrEqual(2);
      // Never wider than the target unless the floor of two forces it.
      if (px > 2) expect(size * px).toBeLessThanOrEqual(QR_TARGET_PX);
    }
  });

  it('draws the element at size times that many pixels', () => {
    const text = payload(FAKE_KEY);
    const shape = qrShape(text);
    const html = renderToStaticMarkup(<Qr payload={text} label="Pairing code" />);
    const width = shape === null ? 0 : shape.size * qrModulePx(shape.size);
    expect(html).toContain(`width:${String(width)}px`);
  });
});

describe('dark ink on a light ground, in both themes', () => {
  const html = renderToStaticMarkup(<Qr payload={payload(FAKE_KEY)} label="Pairing code" />);

  it('pins the code’s own colour scheme to light', () => {
    expect(QR_COLOR_SCHEME).toBe('light');
    expect(html).toMatch(/<svg[^>]*style="[^"]*color-scheme:light/);
  });

  it('paints the ground with the light paper and the modules with the light ink', () => {
    expect(QR_GROUND).toBe('Canvas');
    expect(QR_INK).toBe('CanvasText');
    expect(html).toMatch(/<rect[^>]*style="fill:Canvas"[^>]*data-qr-part="ground"/);
    expect(html).toMatch(/<path[^>]*style="fill:CanvasText"[^>]*data-qr-part="ink"/);
  });

  it('takes neither colour from a theme token, which would follow the theme', () => {
    for (const colour of [QR_GROUND, QR_INK]) expect(colour).not.toMatch(/var\(/);
  });

  it('keeps module edges on pixel boundaries', () => {
    expect(html).toContain('shape-rendering="crispEdges"');
  });
});

describe('the payload is never text', () => {
  it('draws no byte of the key, and names the code with the caller’s words', () => {
    const html = renderToStaticMarkup(<Qr payload={payload(FAKE_KEY)} label="Pairing code" />);
    expect(html).not.toContain('tskey-auth-');
    expect(html).not.toContain('P316FAKE');
    expect(html).not.toContain('"v":2');
    expect(html).toContain('aria-label="Pairing code"');
    expect(html).not.toContain('<title');
    expect(html).not.toContain('<text');
  });
});
