/**
 * The message's own rules (Phase 318, build/p318/SPEC.md §5.5, D15; his ruling
 * 3): refused whole for its own word, never stripped. Every control character
 * is built from its code point at run time.
 */

import { describe, expect, it } from 'vitest';
import { REPLY_TEXT_MAX_BYTES, textRefusal } from '../text-rules';

const ch = (cp: number): string => String.fromCodePoint(cp);
const unit = (u: number): string => String.fromCharCode(u);

describe('textRefusal', () => {
  it('the empty string is empty', () => {
    expect(textRefusal('')).toBe('empty');
  });

  it('every C0 control but LF, DEL and every C1 control is refused, ESC, TAB and CR included', () => {
    for (let cp = 0; cp <= 0x1f; cp += 1) {
      expect(textRefusal(`a${ch(cp)}b`), cp.toString(16)).toBe(cp === 0x0a ? null : 'character');
    }
    expect(textRefusal(`a${ch(0x7f)}b`)).toBe('character');
    for (let cp = 0x80; cp <= 0x9f; cp += 1) {
      expect(textRefusal(`a${ch(cp)}b`), cp.toString(16)).toBe('character');
    }
    // research 135 §3.3: on tmux 3.6a a pasted ESC[201~ ends the paste early.
    expect(textRefusal(`hello${ch(0x1b)}[201~ rm -rf ~`)).toBe('character');
  });

  it('a lone surrogate is refused, in both orders and at both ends', () => {
    expect(textRefusal(`a${unit(0xd83d)}b`)).toBe('character');
    expect(textRefusal(`a${unit(0xdc4d)}b`)).toBe('character');
    expect(textRefusal(unit(0xd83d))).toBe('character');
    expect(textRefusal(unit(0xdc4d))).toBe('character');
    expect(textRefusal(`${unit(0xdc4d)}${unit(0xd83d)}`)).toBe('character');
    expect(textRefusal(`ok${unit(0xd83d)}`)).toBe('character');
  });

  it('4,096 bytes with a multibyte character on the boundary pass, and 4,097 are long', () => {
    expect(REPLY_TEXT_MAX_BYTES).toBe(4096);
    const euro = ch(0x20ac); // three bytes
    const exact = 'a'.repeat(4093) + euro;
    expect(Buffer.byteLength(exact, 'utf8')).toBe(4096);
    expect(textRefusal(exact)).toBeNull();
    const over = 'a'.repeat(4094) + euro;
    expect(Buffer.byteLength(over, 'utf8')).toBe(4097);
    expect(textRefusal(over)).toBe('long');
    expect(textRefusal('a'.repeat(4096))).toBeNull();
    expect(textRefusal('a'.repeat(4097))).toBe('long');
    const emoji = ch(0x1f44d); // four bytes, two code units
    expect(textRefusal(emoji.repeat(1024))).toBeNull();
    expect(textRefusal(`${emoji.repeat(1024)}a`)).toBe('long');
  });

  it('a character rule wins over length: the rules are asked in order', () => {
    expect(textRefusal(`${'a'.repeat(5000)}${ch(0x09)}`)).toBe('character');
  });

  it('slash commands, shell escapes and the hard cases pass unchanged (his ruling 3; research 135 §3.7)', () => {
    const passes = [
      '/exit',
      '/clear',
      '!touch x',
      '!git log --oneline',
      '-R',
      'x;',
      'a\\;b\\\\c\\',
      'first line\nsecond line',
      `line${ch(0x2028)}separator`,
      `thumbs ${ch(0x1f44d)}${ch(0x1f3fd)}`,
      `family ${ch(0x1f468)}${ch(0x200d)}${ch(0x1f469)}${ch(0x200d)}${ch(0x1f467)}`,
      `flag ${ch(0x1f1fa)}${ch(0x1f1f8)}`,
      `decomposed e${ch(0x0301)}`,
      `nbsp${ch(0xa0)}here`
    ];
    for (const text of passes) expect(textRefusal(text), JSON.stringify(text)).toBeNull();
  });
});
