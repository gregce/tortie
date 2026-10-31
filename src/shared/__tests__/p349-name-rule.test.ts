/**
 * Phase 349 (build/p349/SPEC.md §4.3 step 1, D5): THE ONE RULE FOR A NAME A
 * PERSON TYPES, `sessionNameRefusal` over `trimmedSessionName`, in
 * src/shared/session-names.ts.
 *
 * What is held, and what each test breaks on:
 *
 *  - the trim is ECMAScript's own, and its set is exactly the 25 code points
 *    the phone's copy names (a scan of every UTF-16 unit, never a list read
 *    off the code);
 *  - the order is empty, then over 120 UTF-16 units, then a refused unit, each
 *    with its own sentence, and the cap is the Mac sheet's own field;
 *  - the refused units are exactly D5's: C0 (TAB, LF and CR included), DEL,
 *    C1, U+202A to U+202E, U+2066 to U+2069, U+2028, U+2029 and half a
 *    surrogate pair, found by a scan of every unit inside a name;
 *  - anything else passes, the corpus's hard names and a duplicate included;
 *  - a SECOND READING written another way (by code point, over a set, with
 *    the platform's own well-formedness test) agrees over 5,000 seeded names
 *    drawn from a hostile alphabet;
 *  - the sentences and the cap are declared once, where the Mac says them,
 *    and the rule reads one unit at a time with no pattern.
 *
 * Every character a test needs that is not printable is made with
 * `String.fromCharCode` or `String.fromCodePoint`, so no invisible character
 * stands in this file. Nothing here reads anything but this repository's own
 * source.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  SESSION_NAME_CHARACTER,
  SESSION_NAME_EMPTY,
  SESSION_NAME_MAX_UNITS,
  SESSION_NAME_TOO_LONG,
  sessionNameRefusal,
  trimmedSessionName
} from '../session-names';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

const ch = (unit: number): string => String.fromCharCode(unit);

/** ECMAScript's WhiteSpace and LineTerminator set, the 25 code points NameRule.swift names (§4.4 step 4). */
const TRIM_SET: readonly number[] = [
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680,
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
  0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff
];

/** D5's refused units, spelled once here as ranges, to hold the scans to. */
function refusedByD5(unit: number): boolean {
  return (
    (unit >= 0x00 && unit <= 0x1f) ||
    unit === 0x7f ||
    (unit >= 0x80 && unit <= 0x9f) ||
    (unit >= 0x202a && unit <= 0x202e) ||
    (unit >= 0x2066 && unit <= 0x2069) ||
    unit === 0x2028 ||
    unit === 0x2029
  );
}

const isSurrogate = (unit: number): boolean => unit >= 0xd800 && unit <= 0xdfff;

const CHARACTER = { reason: 'character', sentence: SESSION_NAME_CHARACTER };
const EMPTY = { reason: 'empty', sentence: SESSION_NAME_EMPTY };
const LONG = { reason: 'long', sentence: SESSION_NAME_TOO_LONG };

describe('the words and the cap (D5, §5.1)', () => {
  it('says each of the three sentences in exactly the words §5.1 spells', () => {
    expect(SESSION_NAME_EMPTY).toBe('Session name cannot be empty.');
    expect(SESSION_NAME_TOO_LONG).toBe('That name is too long.');
    expect(SESSION_NAME_CHARACTER).toBe('That name holds a character Tortie does not use.');
    expect(SESSION_NAME_MAX_UNITS).toBe(120);
  });

  it('says the empty sentence the Mac\'s own rename throws, read from core.ts as text', () => {
    const core = read('src/main/sessions/core.ts');
    const at = core.indexOf('private async renameSessionAdmitted(');
    expect(at).toBeGreaterThan(-1);
    const body = core.slice(at, core.indexOf('\n  }\n', at));
    expect(body).toContain(`throw gmuxError('INVALID_INPUT', '${SESSION_NAME_EMPTY}');`);
  });

  it('caps a name at the Mac sheet\'s own field, read from InlinePanel.tsx as text', () => {
    const panel = read('src/renderer/session-manager/InlinePanel.tsx');
    expect(panel).toContain(`maxLength={${String(SESSION_NAME_MAX_UNITS)}}`);
  });

  it('says the long sentence the Explorer already says of a name, read from entry-name.ts as text', () => {
    expect(read('src/renderer/tree/entry-name.ts')).toContain(`'${SESSION_NAME_TOO_LONG}'`);
  });
});

describe('the trim (D5)', () => {
  it('is ECMAScript\'s own trim, over the corpus and every whitespace on either end', () => {
    const samples = ['plain', '  spaced  ', `${ch(0x3000)}wide${ch(0xfeff)}`, `${ch(0x09)}tab${ch(0x0d)}${ch(0x0a)}`, ''];
    for (const unit of TRIM_SET) samples.push(`${ch(unit)}x${ch(unit)}`, `${ch(unit)}${ch(unit)}`);
    for (const s of samples) expect(trimmedSessionName(s), JSON.stringify(s)).toBe(s.trim());
  });

  it('removes exactly the 25 code points the phone names, found by a scan of every unit', () => {
    const trimmed: number[] = [];
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      if (trimmedSessionName(`${ch(unit)}a`) === 'a') trimmed.push(unit);
    }
    expect(trimmed).toEqual([...TRIM_SET].sort((a, b) => a - b));
  });
});

describe('the order: empty, then long, then a refused unit (D5)', () => {
  it('refuses a name with nothing left once trimmed as empty, whatever the whitespace', () => {
    expect(sessionNameRefusal('')).toEqual(EMPTY);
    expect(sessionNameRefusal('   ')).toEqual(EMPTY);
    for (const unit of TRIM_SET) expect(sessionNameRefusal(ch(unit).repeat(3)), unit.toString(16)).toEqual(EMPTY);
    // A TAB, an LF, a CR, U+2028 and U+2029 are refused INSIDE a name, but on
    // its ends they are trimmed, so a name of only those is empty, not refused.
    expect(sessionNameRefusal(`${ch(0x09)}${ch(0x2028)}${ch(0x0a)}`)).toEqual(EMPTY);
  });

  it('counts UTF-16 units after the trim: 120 pass and 121 are long, a whole pair being two', () => {
    expect(sessionNameRefusal('a'.repeat(120))).toBeNull();
    expect(sessionNameRefusal('b'.repeat(121))).toEqual(LONG);
    expect(sessionNameRefusal(`   ${'a'.repeat(120)}   `)).toBeNull();
    const astral = String.fromCodePoint(0x1f600);
    expect(astral.length).toBe(2);
    expect(sessionNameRefusal(astral.repeat(60))).toBeNull();
    expect(sessionNameRefusal(astral.repeat(60) + 'x')).toEqual(LONG);
    expect(sessionNameRefusal('x'.repeat(250))).toEqual(LONG);
  });

  it('answers long before a refused unit, and the first refused unit as character', () => {
    expect(sessionNameRefusal(`${'a'.repeat(120)}${ch(0x07)}`)).toEqual(LONG);
    expect(sessionNameRefusal(`a${ch(0x07)}b`)).toEqual(CHARACTER);
    expect(sessionNameRefusal(`a${ch(0x07)}${ch(0x202e)}b`)).toEqual(CHARACTER);
  });
});

describe('the refused units (D5)', () => {
  it('refuses exactly D5\'s units inside a name, found by a scan of every unit that is not a surrogate', () => {
    const wrong: string[] = [];
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      if (isSurrogate(unit)) continue;
      const got = sessionNameRefusal(`a${ch(unit)}b`);
      const want = refusedByD5(unit) ? CHARACTER : null;
      if (JSON.stringify(got) !== JSON.stringify(want)) wrong.push(unit.toString(16));
    }
    expect(wrong).toEqual([]);
  });

  it('refuses TAB, LF and CR inside a name, and each control at the start once the trim has left it there', () => {
    for (const unit of [0x09, 0x0a, 0x0d]) expect(sessionNameRefusal(`a${ch(unit)}b`), unit.toString(16)).toEqual(CHARACTER);
    for (let unit = 0; unit <= 0x1f; unit += 1) {
      if (TRIM_SET.includes(unit)) continue;
      expect(sessionNameRefusal(`${ch(unit)}a`), unit.toString(16)).toEqual(CHARACTER);
    }
    expect(sessionNameRefusal(ch(0x7f))).toEqual(CHARACTER);
    expect(sessionNameRefusal(ch(0x85))).toEqual(CHARACTER);
  });

  it('refuses half a surrogate pair wherever it stands, and passes a whole pair', () => {
    const high = ch(0xd83d);
    const low = ch(0xde00);
    expect(sessionNameRefusal(`a${high}${low}b`)).toBeNull();
    expect(sessionNameRefusal(`${high}${low}`)).toBeNull();
    expect(sessionNameRefusal(`a${high}b`)).toEqual(CHARACTER);
    expect(sessionNameRefusal(`a${low}b`)).toEqual(CHARACTER);
    expect(sessionNameRefusal(`a${high}`)).toEqual(CHARACTER);
    expect(sessionNameRefusal(`${low}a`)).toEqual(CHARACTER);
    expect(sessionNameRefusal(`a${low}${high}b`)).toEqual(CHARACTER);
    expect(sessionNameRefusal(`a${high}${high}${low}b`)).toEqual(CHARACTER);
    for (const unit of [0xd800, 0xdbff, 0xdc00, 0xdfff]) expect(sessionNameRefusal(`x${ch(unit)}`), unit.toString(16)).toEqual(CHARACTER);
  });

  it('passes the units beside each refused range, and the marks D5 does not name', () => {
    // 0x20 and 0x7e beside C0 and DEL, 0xa0 and 0xa1 past C1, 0x2027 below
    // the separators, 0x202f past the embeddings, 0x2065 and 0x206a around
    // the isolates; then the directional marks and zero-width characters D5's
    // list leaves out, which pass as they do on the Mac.
    for (const unit of [0x20, 0x7e, 0xa0, 0xa1, 0x2027, 0x202f, 0x2065, 0x206a, 0x200e, 0x200f, 0x061c, 0x200b, 0x200d]) {
      expect(sessionNameRefusal(`a${ch(unit)}b`), unit.toString(16)).toBeNull();
    }
  });
});

describe('anything else passes (D5)', () => {
  it('passes every hard name of the corpus, as the Mac would store it', () => {
    const family = String.fromCodePoint(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467, 0x200d, 0x1f466);
    for (const name of [
      'plain name', 'claude-3', 'fix--auth', "it's", 'it\'s "x" fix--auth', 'PR #12', '#x', '#[fg=red]ok', '50% done',
      '%Y', 'a;b', 'gmux-control', 'café ☕', 'مرحبا بالعالم', '日本語のセッション', `${family} fam`, '/review', '.env fix',
      '-x', '--', 'cost $HOME', 'fix #', 'C#', 'a\\b', '\\', '$0', 'x;', '#{session_id}', '#H', '##', 'a##b',
      '#{?pane_dead,dead,live}', 'a'.repeat(120)
    ]) {
      expect(sessionNameRefusal(name), JSON.stringify(name)).toBeNull();
    }
  });

  it('passes a duplicate: the rule reads one name and no list', () => {
    expect(sessionNameRefusal('claude-1')).toBeNull();
    expect(sessionNameRefusal.length).toBe(1);
  });
});

/** A small seeded generator, so a failure names the name it failed on. */
function seeded(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** The alphabet the seeded names are drawn from: every class D5 names, its neighbours, and plain text. */
const ALPHABET: readonly string[] = [
  'a', 'Z', '7', ' ', '-', '#', '$', ';', '\\', '"', "'", '/', '.', ':', '{', '}', '(',
  ch(0x00), ch(0x07), ch(0x09), ch(0x0a), ch(0x0d), ch(0x1b), ch(0x1f), ch(0x7f), ch(0x80), ch(0x85), ch(0x9f), ch(0xa0),
  ch(0x200b), ch(0x200d), ch(0x200e), ch(0x2027), ch(0x2028), ch(0x2029), ch(0x202a), ch(0x202e), ch(0x202f),
  ch(0x2065), ch(0x2066), ch(0x2069), ch(0x206a), ch(0x3000), ch(0xfeff),
  ch(0xd83d), ch(0xde00), String.fromCodePoint(0x1f600), String.fromCodePoint(0x1f468), 'é', 'م', '日'
];

/**
 * THE SECOND READING, written another way: by CODE POINT rather than by unit,
 * over a set rather than over ranges, with the platform's own well-formedness
 * test for half a pair (`encodeURIComponent` throws a URIError on a lone
 * surrogate), and the length taken from the string itself.
 */
const REFUSED_POINTS = new Set<number>([
  ...Array.from({ length: 0x20 }, (_, i) => i),
  0x7f,
  ...Array.from({ length: 0x20 }, (_, i) => 0x80 + i),
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
  0x2066, 0x2067, 0x2068, 0x2069,
  0x2028, 0x2029
]);
function secondReading(name: string): string | null {
  const kept = name.trim();
  if (kept === '') return 'empty';
  if (kept.length > 120) return 'long';
  try {
    encodeURIComponent(kept);
  } catch {
    return 'character';
  }
  for (const point of Array.from(kept, (c) => c.codePointAt(0) ?? 0)) {
    if (REFUSED_POINTS.has(point)) return 'character';
  }
  return null;
}

describe('a second reading, written another way, over 5,000 seeded names', () => {
  it('agrees with the rule on every name, and the names reach every verdict', () => {
    const rnd = seeded(349);
    const seen = new Map<string, number>();
    const wrong: string[] = [];
    for (let n = 0; n < 5_000; n += 1) {
      const count = Math.floor(rnd() * 12) + (n % 50 === 0 ? 118 : 0);
      let name = '';
      for (let i = 0; i < count; i += 1) name += ALPHABET[Math.floor(rnd() * ALPHABET.length)] ?? 'a';
      const got = sessionNameRefusal(name)?.reason ?? null;
      const want = secondReading(name);
      seen.set(String(want), (seen.get(String(want)) ?? 0) + 1);
      if (got !== want) wrong.push(`${JSON.stringify(name)}: ${String(got)} against ${String(want)}`);
      // The rule reads the trimmed name, so a name and its trim answer alike.
      if (JSON.stringify(sessionNameRefusal(trimmedSessionName(name))) !== JSON.stringify(sessionNameRefusal(name))) {
        wrong.push(`${JSON.stringify(name)}: its trim answers otherwise`);
      }
    }
    expect(wrong.slice(0, 10)).toEqual([]);
    for (const verdict of ['null', 'empty', 'long', 'character']) expect(seen.get(verdict) ?? 0, verdict).toBeGreaterThan(20);
  });
});

describe('one rule, one spelling, no pattern (RN9)', () => {
  const source = read('src/shared/session-names.ts');
  const phase349 = source.slice(source.indexOf('// PHASE 349'));

  it('declares the cap, the trim, the rule and each sentence once, in this file', () => {
    for (const name of ['SESSION_NAME_MAX_UNITS', 'SESSION_NAME_EMPTY', 'SESSION_NAME_TOO_LONG', 'SESSION_NAME_CHARACTER']) {
      expect(source.split(`export const ${name} =`)).toHaveLength(2);
    }
    expect(source.split('export function trimmedSessionName(')).toHaveLength(2);
    expect(source.split('export function sessionNameRefusal(')).toHaveLength(2);
  });

  it('is pure: the module imports the type of ./types and nothing else, and names no clock or I/O', () => {
    expect([...source.matchAll(/^import[^\n]*from\s+'([^']+)';$/gm)].map((m) => m[0])).toEqual([
      "import type { Session } from './types';"
    ]);
    expect(phase349).not.toMatch(/Date\.|performance\.|process\.|require\(|import\(/);
  });

  it('reads one unit at a time: no regular expression, no RegExp and no match in the rule', () => {
    const code = phase349.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/RegExp|\.test\(|\.match\(|\.replace\(|\.search\(|\.split\(/);
    expect(code).not.toMatch(/=\s*\/[^/*]/);
    expect(code).toContain('charCodeAt(');
  });
});
