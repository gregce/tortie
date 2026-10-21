/**
 * THE PASTE'S OWN RULES (Phase 348, build/p348/SPEC.md D51, §4.6 step 11):
 * `pasteRefusal`, 318's loop with the TAB let in beside the line feed and the
 * paste's own bound, `POCKET_PASTE_MAX_TEXT_BYTES` (16,384) from the
 * contract. Refused whole for its own word, never stripped; `textRefusal` (the
 * message's) does not move. Every control character is built from its code
 * point at run time, so no raw control byte is committed.
 *
 * Why each refusal is there (§2.2, measured on tmux 3.7b and 3.6a through the
 * shipping exec plane): CR LF lands as TWO carriage returns; 3.6a passes ESC,
 * DEL and NUL raw where 3.7b sends `^[`, `^?` and `^@`, so a pasted `ESC[201~`
 * would end 3.6a's bracket early and the line after it would run at a shell;
 * a TAB, a line feed, BEL, BS, C1 and every valid UTF-8 character reach the
 * program the same on both. BEL and BS are C0, refused here all the same: the
 * rule is 318's, and a paste is text.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { POCKET_PASTE_MAX_TEXT_BYTES } from '@shared/ipc/pocket';
import { pasteRefusal, REPLY_TEXT_MAX_BYTES, textRefusal } from '../text-rules';

const ch = (cp: number): string => String.fromCodePoint(cp);
const unit = (u: number): string => String.fromCharCode(u);

describe('pasteRefusal', () => {
  it('the empty string is empty', () => {
    expect(pasteRefusal('')).toBe('empty');
  });

  it('lets a line feed and a TAB in, and refuses every other C0 control, CR and ESC among them', () => {
    for (let cp = 0; cp <= 0x1f; cp += 1) {
      expect(pasteRefusal(`a${ch(cp)}b`), cp.toString(16)).toBe(cp === 0x0a || cp === 0x09 ? null : 'character');
    }
    expect(pasteRefusal(`line one${ch(0x0a)}line two${ch(0x0a)}`)).toBeNull();
    expect(pasteRefusal(`a${ch(0x09)}b`)).toBeNull();
    // CR LF is two code units, and the CR refuses it (§2.2: two Returns).
    expect(pasteRefusal(`a${ch(0x0d)}${ch(0x0a)}b`)).toBe('character');
    expect(pasteRefusal(`a${ch(0x0d)}b`)).toBe('character');
    // The 3.6a bracket break, and NUL and DEL.
    expect(pasteRefusal(`x${ch(0x1b)}[201~echo y${ch(0x0a)}`)).toBe('character');
    expect(pasteRefusal(`a${ch(0)}b`)).toBe('character');
  });

  it('refuses DEL and every C1 control', () => {
    expect(pasteRefusal(`a${ch(0x7f)}b`)).toBe('character');
    for (let cp = 0x80; cp <= 0x9f; cp += 1) {
      expect(pasteRefusal(`a${ch(cp)}b`), cp.toString(16)).toBe('character');
    }
    expect(pasteRefusal(`a${ch(0x85)}b`)).toBe('character');
    // The first character past C1 passes.
    expect(pasteRefusal(`a${ch(0xa0)}b`)).toBeNull();
  });

  it('a lone surrogate is refused, in both orders and at both ends; a whole pair passes', () => {
    expect(pasteRefusal(`a${unit(0xd83d)}b`)).toBe('character');
    expect(pasteRefusal(`a${unit(0xdc4d)}b`)).toBe('character');
    expect(pasteRefusal(unit(0xd83d))).toBe('character');
    expect(pasteRefusal(`${unit(0xdc4d)}${unit(0xd83d)}`)).toBe('character');
    expect(pasteRefusal(`ok${unit(0xd83d)}`)).toBe('character');
    expect(pasteRefusal(`a${ch(0x1f600)}b`)).toBeNull();
  });

  it('passes every valid character the measurement delivered exact: é, an emoji, CJK, U+2028, a ZWJ family', () => {
    for (const text of ['é', ch(0x1f600), '中文', `a${ch(0x2028)}b`, `${ch(0x1f468)}${ch(0x200d)}${ch(0x1f469)}${ch(0x200d)}${ch(0x1f467)}`, 'é', '/exit', '!ls']) {
      expect(pasteRefusal(text), JSON.stringify(text)).toBeNull();
    }
  });

  it('holds 16,384 bytes of UTF-8 and refuses 16,385, a multibyte character on the boundary', () => {
    expect(POCKET_PASTE_MAX_TEXT_BYTES).toBe(16_384);
    expect(pasteRefusal('a'.repeat(16_384))).toBeNull();
    expect(pasteRefusal('a'.repeat(16_385))).toBe('long');
    expect(pasteRefusal('é'.repeat(8_192))).toBeNull();
    expect(pasteRefusal(`${'é'.repeat(8_191)}ab`)).toBeNull();
    expect(pasteRefusal(`${'é'.repeat(8_192)}a`)).toBe('long');
    // 80-character lines to the cap, each with its line feed, as a pasted log is.
    const lines = `${'x'.repeat(79)}${ch(0x0a)}`.repeat(204) + 'y'.repeat(64);
    expect(Buffer.byteLength(lines, 'utf8')).toBe(16_384);
    expect(pasteRefusal(lines)).toBeNull();
  });

  it('answers character before long: a text over the cap that also holds ESC says character', () => {
    expect(pasteRefusal(`${'a'.repeat(20_000)}${ch(0x1b)}`)).toBe('character');
  });

  it('changes nothing it is handed and names no stripping call (Y15)', () => {
    const text = `  spaced ${ch(0x09)}tab ${ch(0x0a)} trailing  `;
    const copy = String(text);
    expect(pasteRefusal(text)).toBeNull();
    expect(text).toBe(copy);
    const source = readFileSync(join(__dirname, '..', 'text-rules.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/\.replace\(|\.trim|\.normalize\(|\.slice\(/);
  });
});

describe('textRefusal, the message’s rule, does not move (D51)', () => {
  it('still refuses a TAB, and still holds 4,096 bytes', () => {
    expect(textRefusal(`a${ch(0x09)}b`)).toBe('character');
    expect(textRefusal(`a${ch(0x0a)}b`)).toBeNull();
    expect(REPLY_TEXT_MAX_BYTES).toBe(4_096);
    expect(textRefusal('a'.repeat(4_097))).toBe('long');
    expect(pasteRefusal('a'.repeat(4_097))).toBeNull();
  });
});
