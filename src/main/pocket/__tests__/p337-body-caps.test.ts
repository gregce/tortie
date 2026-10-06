/**
 * THE KEYS BODY CAP, computed from the worst body the phone can send (Phase
 * 337, build/p337/SPEC.md D17, §14 M15).
 *
 * The door process drops a write body over its route's cap WHOLE (404
 * `oversized`) before main reads a byte, so a cap that is too small turns a
 * keys write the Mac must answer IN WORDS (`refused character`, a C0 control
 * in a text item) into a silent refusal. This file encodes the worst legal
 * keys bodies of §14 M15 its own way, with `JSON.stringify` over sorted keys
 * and with a pass standing for Swift's `JSONEncoder` (which escapes `/` as
 * `\/`) and one escaping every non-ASCII character as `\uXXXX`, holds each
 * under 16,384, and holds that each parses in main with its items untouched.
 *
 * The worst shape is legal: a text item and `BSpace` items in any order
 * (D17), at most 64 items and 1,024 UTF-8 bytes of text. A named key other
 * than `BSpace` is a write's only item, so it is never the worst.
 *
 * Every text that needs a control character builds it from a code point at run
 * time, so no raw control byte is committed (build/p337/SPEC.md §0).
 *
 * Nothing here opens a socket, reads a file or touches Electron.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const quiet = (): void => undefined;
  return { ...real, getLog: () => ({ error: quiet, warn: quiet, info: quiet, debug: quiet }) };
});

const { POCKET_WRITE_BODY_CAPS } = await import('../door/limits');
const { parseKeysBody } = await import('../writes');
const { POCKET_KEYS_MAX_ITEMS, POCKET_KEYS_MAX_TEXT_BYTES } = await import('@shared/ipc/pocket');

/** The longest session id the write path takes: 128 of its alphabet. */
const SESSION = 'aZ09._:-'.repeat(16);
/** A write id: 32 lowercase hex. */
const WRITE = 'f'.repeat(32);
/** The longest question id: 16 hex, `-`, `Number.MAX_SAFE_INTEGER`'s 16 digits. */
const TURN = `${'e'.repeat(16)}-${String(Number.MAX_SAFE_INTEGER)}`;
/** A window's mark: 12 lowercase hex (not null, which is four bytes shorter). */
const DIALOG = 'd'.repeat(12);

/** JSON with sorted keys, as the phone writes it (`.sortedKeys`). */
function sortedJson(fields: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.keys(fields).sort().map((k) => [k, fields[k]])));
}

/** The same, with every `/` escaped `\/`, as Swift's `JSONEncoder` writes it. */
function swiftJson(fields: Record<string, unknown>): string {
  return sortedJson(fields).split('/').join('\\/');
}

/** The same, every character outside ASCII escaped as `\uXXXX` code units (an astral one as its pair). */
function asciiJson(fields: Record<string, unknown>): string {
  let out = '';
  for (const unit of swiftJson(fields)) {
    for (let i = 0; i < unit.length; i += 1) {
      const code = unit.charCodeAt(i);
      out += code < 0x80 ? unit.charAt(i) : `\\u${code.toString(16).padStart(4, '0')}`;
    }
  }
  return out;
}

const bytes = (text: string): number => Buffer.byteLength(text, 'utf8');

/** A text of `n` copies of one code point. */
const textOf = (codePoint: number, n: number): string => String.fromCodePoint(codePoint).repeat(n);

/** The rest of a 64-item write: 63 `BSpace` items, the one named key that may join text (D17). */
const BACKSPACES = Array.from({ length: POCKET_KEYS_MAX_ITEMS - 1 }, () => ({ k: 'BSpace' }));

/** One keys body. */
const bodyOf = (keys: unknown[]): Record<string, unknown> => ({
  dialog: DIALOG,
  keys,
  session: SESSION,
  turn: TURN,
  write: WRITE
});

describe('the keys body cap (Phase 337, D17, §14 M15)', () => {
  it('is 16,384, frozen beside the other three', () => {
    expect(POCKET_WRITE_BODY_CAPS.keys).toBe(16_384);
    expect(Object.isFrozen(POCKET_WRITE_BODY_CAPS)).toBe(true);
    expect(POCKET_KEYS_MAX_ITEMS).toBe(64);
    expect(POCKET_KEYS_MAX_TEXT_BYTES).toBe(1_024);
  });

  // §14 M15's numbers, re-derived here, each the worst of its kind.
  const cases: [string, unknown[], (fields: Record<string, unknown>) => string, number][] = [
    [
      '1,024 bytes of U+0001 in one item and 63 BSpace items, each control escaped \\u0001',
      [{ t: textOf(0x01, POCKET_KEYS_MAX_TEXT_BYTES) }, ...BACKSPACES],
      swiftJson,
      7_359
    ],
    [
      '1,024 bytes of U+0001 in 64 items of 16',
      Array.from({ length: POCKET_KEYS_MAX_ITEMS }, () => ({ t: textOf(0x01, 16) })),
      swiftJson,
      6_981
    ],
    [
      '256 four-byte emoji escaped as surrogate pairs, and 63 BSpace items',
      [{ t: textOf(0x1f44d, POCKET_KEYS_MAX_TEXT_BYTES / 4) }, ...BACKSPACES],
      asciiJson,
      4_287
    ],
    ['64 BSpace items', Array.from({ length: POCKET_KEYS_MAX_ITEMS }, () => ({ k: 'BSpace' })), swiftJson, 1_221],
    [
      '1,024 slashes, which Swift escapes \\/, and 63 BSpace items',
      [{ t: textOf(0x2f, POCKET_KEYS_MAX_TEXT_BYTES) }, ...BACKSPACES],
      swiftJson,
      3_263
    ]
  ];

  for (const [name, keys, encode, expected] of cases) {
    it(`holds ${name} at ${String(expected)} bytes, under the cap, and it parses with its items untouched`, () => {
      const fields = bodyOf(keys);
      const wire = encode(fields);
      expect(bytes(wire), name).toBe(expected);
      expect(bytes(wire)).toBeLessThanOrEqual(POCKET_WRITE_BODY_CAPS.keys);
      const back = parseKeysBody(Buffer.from(wire, 'utf8'));
      expect(back.ok).toBe(true);
      if (back.ok) expect(back.keys).toEqual(keys);
    });
  }

  it('holds the worst body with room for an encoder twice as wide as the worst one measured', () => {
    const worst = swiftJson(bodyOf([{ t: textOf(0x01, POCKET_KEYS_MAX_TEXT_BYTES) }, ...BACKSPACES]));
    expect(2 * bytes(worst)).toBeLessThanOrEqual(POCKET_WRITE_BODY_CAPS.keys);
  });

  it('would drop the worst control-character keys body at a cap of 4,096, which is why the cap is not smaller', () => {
    const worst = swiftJson(bodyOf([{ t: textOf(0x01, POCKET_KEYS_MAX_TEXT_BYTES) }, ...BACKSPACES]));
    expect(bytes(worst)).toBeGreaterThan(4_096);
  });
});
