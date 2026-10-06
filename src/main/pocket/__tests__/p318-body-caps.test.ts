/**
 * THE WRITE BODY CAPS, computed from the worst body the phone can send
 * (Phase 318, build/p318/SPEC.md §5.1.3, D3; §Revision R10, R18).
 *
 * The door process drops a write body over its route's cap WHOLE (404
 * `oversized`, "Your Mac did not take it"), before main reads a byte. So a cap
 * that is too small turns a body the Mac must answer IN WORDS into a silent
 * refusal: the phone decides nothing and sends whatever was typed, and a
 * message of control characters must reach main to be answered `refused
 * character` with its sentence. This file encodes the worst legal body of each
 * write its own way, with `JSON.stringify` and with a pass standing for
 * Swift's `JSONEncoder` (which escapes `/` as `\/`), and holds each under its
 * cap; and it holds that each worst body parses in main.
 *
 * Every text that needs a control character builds it from a code point at run
 * time, so no raw control byte is committed (build/p318/SPEC.md §0).
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
const { POCKET_ROUTES } = await import('../door/table');
const { parseChooseBody, parseEndBody, parseSayBody } = await import('../writes');
const { POCKET_WRITE_ROUTE_IDS } = await import('@shared/ipc/pocket');

/** The longest session id the write path takes: 128 of its alphabet. */
const SESSION = 'aZ09._:-'.repeat(16);
/** A write id: 32 lowercase hex. */
const WRITE = 'f'.repeat(32);
/** The longest question id: 16 hex, `-`, `Number.MAX_SAFE_INTEGER`'s 16 digits. */
const QUESTION = `${'e'.repeat(16)}-${String(Number.MAX_SAFE_INTEGER)}`;
/** The most bytes of UTF-8 a message may be (`REPLY_TEXT_MAX_BYTES`, §5.5). */
const TEXT_MAX_BYTES = 4_096;

/** JSON with sorted keys, as the phone writes it (`.sortedKeys`). */
function sortedJson(fields: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.keys(fields).sort().map((k) => [k, fields[k]])));
}

/** The same, with every `/` escaped `\/`, as Swift's `JSONEncoder` writes it. */
function swiftJson(fields: Record<string, unknown>): string {
  return sortedJson(fields).split('/').join('\\/');
}

/**
 * The same, with every character outside ASCII escaped as `\uXXXX` code units,
 * an astral character as its surrogate pair: the widest a JSON encoder may
 * legally write a string, and three times the UTF-8 of an astral character.
 */
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

describe('the write body caps (Phase 318, §5.1.3)', () => {
  // Phase 337 (build/p337/SPEC.md D17, §Attack A25) added `keys`, 16,384; its
  // worst bodies are held in `./p337-body-caps.test.ts`.
  it('are exactly end 512, choose 512, say 32,768 and keys 16,384, frozen, keyed by the closed write list', () => {
    expect(POCKET_WRITE_BODY_CAPS).toEqual({ end: 512, choose: 512, say: 32_768, keys: 16_384 });
    expect(Object.isFrozen(POCKET_WRITE_BODY_CAPS)).toBe(true);
    expect(Object.keys(POCKET_WRITE_BODY_CAPS).sort()).toEqual([...POCKET_WRITE_ROUTE_IDS].sort());
    // Every write row of the table has a cap, and no read row does.
    for (const route of POCKET_ROUTES) {
      expect(route.id in POCKET_WRITE_BODY_CAPS, route.id).toBe(!route.reads);
    }
  });

  it('holds the worst end body, 199 bytes, under 512, and it parses', () => {
    const worst = { batch: false, session: SESSION, write: WRITE };
    expect(bytes(sortedJson(worst))).toBe(199);
    expect(bytes(swiftJson(worst))).toBe(199);
    expect(bytes(swiftJson(worst))).toBeLessThanOrEqual(POCKET_WRITE_BODY_CAPS.end);
    expect(parseEndBody(Buffer.from(swiftJson(worst))).ok).toBe(true);
  });

  it('holds the worst choose body, 267 bytes, under 512, both ways, and it parses', () => {
    const worst = { mark: 'd'.repeat(12), marker: '9', question: QUESTION, session: SESSION, write: WRITE };
    expect(bytes(sortedJson(worst))).toBe(267);
    expect(bytes(swiftJson(worst))).toBe(267);
    expect(bytes(asciiJson(worst))).toBe(267);
    expect(bytes(asciiJson(worst))).toBeLessThanOrEqual(POCKET_WRITE_BODY_CAPS.choose);
    expect(parseChooseBody(Buffer.from(swiftJson(worst)))).toEqual({
      ok: true,
      verb: 'choose',
      write: WRITE,
      session: SESSION,
      question: QUESTION,
      mark: 'd'.repeat(12),
      marker: '9'
    });
  });

  // The Mac must answer each of these in words, so each must reach main.
  const sayCases: [string, string, number][] = [
    // C0 controls but TAB, LF, CR, backspace and form feed: six bytes each.
    ['4,096 bytes of U+0001, each escaped \\u0001', textOf(0x01, TEXT_MAX_BYTES), 24_771],
    ['4,096 bytes of U+001F', textOf(0x1f, TEXT_MAX_BYTES), 24_771],
    ['4,096 quotes', textOf(0x22, TEXT_MAX_BYTES), 8_387],
    ['4,096 backslashes', textOf(0x5c, TEXT_MAX_BYTES), 8_387],
    ['4,096 line feeds', textOf(0x0a, TEXT_MAX_BYTES), 8_387],
    ['4,096 slashes, which Swift escapes \\/', textOf(0x2f, TEXT_MAX_BYTES), 8_387],
    ['1,024 four-byte emoji', textOf(0x1f44d, TEXT_MAX_BYTES / 4), 4_291]
  ];
  for (const [name, text, expected] of sayCases) {
    it(`holds a say of ${name} under 32,768, both ways, and it parses with the text untouched`, () => {
      expect(bytes(text)).toBe(TEXT_MAX_BYTES);
      const fields = { session: SESSION, text, write: WRITE };
      const swift = swiftJson(fields);
      expect(bytes(swift), name).toBe(expected);
      expect(bytes(swift)).toBeLessThanOrEqual(POCKET_WRITE_BODY_CAPS.say);
      expect(bytes(sortedJson(fields))).toBeLessThanOrEqual(POCKET_WRITE_BODY_CAPS.say);
      const back = parseSayBody(Buffer.from(swift));
      expect(back.ok && back.text === text).toBe(true);
    });
  }

  it('holds the widest legal encoding of the worst astral text, every character a surrogate pair escaped, under the say cap', () => {
    const fields = { session: SESSION, text: textOf(0x1f44d, TEXT_MAX_BYTES / 4), write: WRITE };
    const widest = asciiJson(fields);
    expect(bytes(widest)).toBe(12_483);
    expect(bytes(widest)).toBeLessThanOrEqual(POCKET_WRITE_BODY_CAPS.say);
    const back = parseSayBody(Buffer.from(widest));
    expect(back.ok && back.text === fields.text).toBe(true);
  });

  it('would have dropped the worst control-character text at the 16,384 an earlier draft named (§Revision R10)', () => {
    const fields = { session: SESSION, text: textOf(0x01, TEXT_MAX_BYTES), write: WRITE };
    expect(bytes(swiftJson(fields))).toBeGreaterThan(16_384);
  });
});
