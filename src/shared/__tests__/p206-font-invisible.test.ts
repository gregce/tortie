/**
 * The font family sanitizer refuses the whole invisible category (Phase 206).
 *
 * ## WHAT THIS PINS, AND WHY THE COUNT IS HERE
 *
 * Phase 174.1 stripped a hand written list of invisible characters. Phase 197
 * item 10 added U+061C to it. The Phase 197 verifier then attacked the widened
 * class with characters the builder never tried, and 19 of 21 rode through,
 * because a list closes the gap it was written for and never the category the
 * gap came from. Phase 206 replaced the list with the PROPERTY, so this file
 * pins the property rather than a longer list: every code point in Unicode
 * with `Default_Ignorable_Code_Point` or `Cf`, plus the two separators that are
 * in neither, is refused, and the whole set is walked rather than sampled.
 *
 * THE SIZE IS PINNED TOO. A character Unicode adds to either property is
 * refused by the shipping rule without a change here, which is the point; the
 * count moving is how a reader learns that the table under them moved, and it
 * is a number to update on purpose rather than a rule that broke.
 */

import { describe, expect, it } from 'vitest';
import { MAX_WORK_AREA_FONT_CUSTOM, sanitizeWorkAreaFontCustom } from '../settings';

/** The rule, written here independently of the one being tested. */
const INVISIBLE = /[\p{Default_Ignorable_Code_Point}\p{Cf}\u2028\u2029]/u;

/** Every code point in the category, walked once. */
function wholeSet(): number[] {
  const out: number[] = [];
  for (let cp = 0; cp <= 0x10ffff; cp += 1) {
    // A lone surrogate is not a character and never reaches a family name.
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    if (INVISIBLE.test(String.fromCodePoint(cp))) out.push(cp);
  }
  return out;
}

const SET = wholeSet();

describe('sanitizeWorkAreaFontCustom, the invisible category', () => {
  it('holds the size the rule was measured at', () => {
    // 4,208 on Unicode 15.1 as Node 22 carries it, being 4,036 that are
    // Default_Ignorable and not Cf, 32 that are Cf and not Default_Ignorable,
    // 138 in both, and U+2028 and U+2029 which are in neither.
    expect(SET.length).toBe(4208);
  });

  it('refuses every member of it, all four thousand two hundred and eight', () => {
    const through: string[] = [];
    for (const cp of SET) {
      const out = sanitizeWorkAreaFontCustom(`Men${String.fromCodePoint(cp)}lo`);
      if (out !== 'Menlo') {
        through.push(`U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
      }
    }
    expect(through).toEqual([]);
  });

  it('refuses all twelve Bidi_Control characters, which Phase 197 asked for', () => {
    const bidi: number[] = [];
    for (let cp = 0; cp <= 0x10ffff; cp += 1) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      if (/\p{Bidi_Control}/u.test(String.fromCodePoint(cp))) bidi.push(cp);
    }
    expect(bidi.length).toBe(12);
    for (const cp of bidi) {
      expect(sanitizeWorkAreaFontCustom(`Men${String.fromCodePoint(cp)}lo`)).toBe(
        'Menlo'
      );
    }
  });

  it('refuses the named shapes the two properties exist for', () => {
    // One per family, so a reader can see what the category is made of and a
    // failure names something rather than a number.
    const named: [string, number][] = [
      ['soft hyphen', 0x00ad],
      ['combining grapheme joiner', 0x034f],
      ['Arabic number sign', 0x0600],
      ['Arabic end of ayah', 0x06dd],
      ['Syriac abbreviation mark', 0x070f],
      ['Arabic disputed end of ayah', 0x0890],
      ['Arabic half madda over madda', 0x08e2],
      ['Hangul choseong filler', 0x115f],
      ['Hangul jungseong filler', 0x1160],
      ['Khmer vowel inherent aq', 0x17b4],
      ['Mongolian free variation selector one', 0x180b],
      ['Mongolian vowel separator', 0x180e],
      ['Hangul filler', 0x3164],
      ['variation selector one', 0xfe00],
      ['variation selector sixteen', 0xfe0f],
      ['halfwidth Hangul filler', 0xffa0],
      ['interlinear annotation anchor', 0xfff9],
      ['Kaithi number sign', 0x110bd],
      ['Egyptian hieroglyph vertical joiner', 0x13430],
      ['Brahmi number joiner', 0x1bca0],
      ['musical symbol begin beam', 0x1d173],
      ['language tag', 0xe0001],
      ['tag space', 0xe0020],
      ['tag latin small letter z', 0xe007a],
      ['cancel tag', 0xe007f],
      ['variation selector seventeen', 0xe0100]
    ];
    for (const [what, cp] of named) {
      expect(
        sanitizeWorkAreaFontCustom(`Men${String.fromCodePoint(cp)}lo`),
        `${what} U+${cp.toString(16).toUpperCase()}`
      ).toBe('Menlo');
    }
  });

  it('refuses a name made only of them, and a name made of many of them', () => {
    const many = SET.slice(0, 200).map((cp) => String.fromCodePoint(cp)).join('');
    expect(sanitizeWorkAreaFontCustom(many)).toBe('');
    expect(sanitizeWorkAreaFontCustom(`${many}Berkeley Mono${many}`)).toBe(
      'Berkeley Mono'
    );
  });

  it('leaves an ordinary family name exactly as it is', () => {
    // THE OTHER DIRECTION, and it is what stops a widening becoming a bug. A
    // family name in any script, with the accents and the marks real names
    // carry, must be untouched.
    for (const name of [
      'Menlo',
      'Berkeley Mono',
      'JetBrains Mono NL',
      'IBM Plex Mono Light',
      'Source Han Sans JP',
      'Noto Sans Devanagari',
      'ヒラギノ角ゴ ProN',
      'Ubuntu Mono derivative Powerline',
      'Fira Code Retina',
      'DejaVu Sans Mono for Powerline',
      'Menlo Regular 1.2',
      'Andalé Mono',
      'Nimbus Mono PS'
    ]) {
      expect(sanitizeWorkAreaFontCustom(name)).toBe(name);
    }
    expect('Menlo'.length).toBeLessThan(MAX_WORK_AREA_FONT_CUSTOM);
  });
});
