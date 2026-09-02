/**
 * Phase 190. Do the inline modes draw this diff the same, and what does the
 * control say about it.
 *
 * The rulings pinned here, each of which a later round could undo in a line:
 * the comparison replays Pierre's own fold and calls no diff function Pierre
 * does not call; the length limit is Pierre's own default and not a number
 * somebody typed; the cap stops the walk and the line says nothing past it;
 * and the copy is one short line, present only when true.
 *
 * The fixtures are read the way research 74 read them: the operator's own
 * pure deletion, where the three modes coincide, and a replacement in the
 * shape of his own prose commit, where they do not.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DiffHunksRenderer, parseDiffFromFile } from '@pierre/diffs';
import type { FileDiffMetadata } from '@pierre/diffs';
import { describe, expect, it } from 'vitest';
import {
  AGREEMENT_PAIR_CAP,
  PIERRE_MAX_LINE_DIFF_LENGTH,
  inlineDiffAgreement,
  inlineDiffAgreementLine,
  readLastInlineDiffAgreement
} from '../inline-diff-agreement';

function parse(oldText: string, newText: string): FileDiffMetadata {
  const meta = parseDiffFromFile(
    { name: 'fixture.txt', contents: oldText },
    { name: 'fixture.txt', contents: newText }
  );
  if (meta === null) throw new Error('the fixture is identical either side');
  return meta;
}

/** His test file, byte for byte the shape research 74 measured. */
const DELETION_OLD = 'The quick brown fox\nJumped over the fence\n';
const DELETION_NEW = 'The quick fox\nJumped over the fence\n';

/** Three lines of his prose commit, two of them replaced by phrases. */
const REPLACEMENT_OLD = [
  'In a small town where every hour seemed to linger,',
  'John Berryman kept a narrow shop between the bakery',
  'and a hardware store with a sun-faded red awning.',
  ''
].join('\n');
const REPLACEMENT_NEW = [
  'In a small town where every hour moved unhurriedly,',
  'John Berryman kept a narrow shop between the bakery',
  'and a hardware store beneath a weathered green awning.',
  ''
].join('\n');

const ALL_THREE = 'Words, Phrases and Characters draw this change the same.';
const EVERY = 'Every mode draws this change the same.';

describe('the pure deletion, which is what he saw', () => {
  const a = inlineDiffAgreement(parse(DELETION_OLD, DELETION_NEW));

  it('finds the three modes drawing the same spans', () => {
    expect(a.pairs).toBe(1);
    expect(a.compared).toBe(1);
    expect(a.capped).toBe(false);
    expect(a.wordPhrase).toBe(true);
    expect(a.wordChar).toBe(true);
    expect(a.phraseChar).toBe(true);
  });

  it('says so in one line for each of the three, and nothing for Off', () => {
    expect(inlineDiffAgreementLine(a, 'word')).toBe(ALL_THREE);
    expect(inlineDiffAgreementLine(a, 'word-alt')).toBe(ALL_THREE);
    expect(inlineDiffAgreementLine(a, 'char')).toBe(ALL_THREE);
    // Off draws no span where the other three draw one, so it is not the same.
    expect(inlineDiffAgreementLine(a, 'none')).toBeNull();
  });

  it('keeps the reading for the harness', () => {
    const again = inlineDiffAgreement(parse(DELETION_OLD, DELETION_NEW));
    expect(readLastInlineDiffAgreement()).toBe(again);
  });
});

describe('the replacement, where the modes genuinely differ', () => {
  const a = inlineDiffAgreement(parse(REPLACEMENT_OLD, REPLACEMENT_NEW));

  it('finds at least two of the three apart', () => {
    expect(a.pairs).toBeGreaterThan(0);
    expect(a.compared).toBe(a.pairs);
    expect([a.wordPhrase, a.wordChar, a.phraseChar]).toContain(false);
    // A replaced phrase, being two adjacent changed words, is exactly what
    // Phrases joins and Words does not.
    expect(a.wordPhrase).toBe(false);
    expect(a.wordChar).toBe(false);
  });

  it('draws nothing on the resting face for a mode that stands alone', () => {
    // Words agrees with neither of the other two here, so nothing.
    expect(inlineDiffAgreementLine(a, 'word')).toBeNull();
    expect(inlineDiffAgreementLine(a, 'none')).toBeNull();
  });
});

describe('a pair of modes', () => {
  it('names exactly the two that coincide, in the order of the control', () => {
    const base = inlineDiffAgreement(parse(DELETION_OLD, DELETION_NEW));
    const two = { ...base, wordPhrase: true, wordChar: false, phraseChar: false };
    expect(inlineDiffAgreementLine(two, 'word')).toBe(
      'Words and Phrases draw this change the same.'
    );
    expect(inlineDiffAgreementLine(two, 'word-alt')).toBe(
      'Words and Phrases draw this change the same.'
    );
    expect(inlineDiffAgreementLine(two, 'char')).toBeNull();

    const pc = { ...base, wordPhrase: false, wordChar: false, phraseChar: true };
    expect(inlineDiffAgreementLine(pc, 'char')).toBe(
      'Phrases and Characters draw this change the same.'
    );
    expect(inlineDiffAgreementLine(pc, 'word')).toBeNull();

    const wc = { ...base, wordPhrase: false, wordChar: true, phraseChar: false };
    expect(inlineDiffAgreementLine(wc, 'word')).toBe(
      'Words and Characters draw this change the same.'
    );
    expect(inlineDiffAgreementLine(wc, 'word-alt')).toBeNull();
  });
});

describe('no paired line at all', () => {
  it('says every mode draws the same, Off included', () => {
    const a = inlineDiffAgreement(parse('one\ntwo\n', 'one\nnew a\nnew b\ntwo\n'));
    expect(a.pairs).toBe(0);
    for (const mode of ['none', 'word', 'word-alt', 'char'] as const) {
      expect(inlineDiffAgreementLine(a, mode)).toBe(EVERY);
    }
  });

  it('and a block of deletions with nothing added is the same case', () => {
    const a = inlineDiffAgreement(parse('one\ngone\nalso gone\ntwo\n', 'one\ntwo\n'));
    expect(a.pairs).toBe(0);
    expect(inlineDiffAgreementLine(a, 'word')).toBe(EVERY);
  });
});

describe('the bounds', () => {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  /**
   * Lines of unique letter runs with the LAST token deleted, under a letter
   * that appears nowhere else on the line, so the word diff and the char diff
   * both remove exactly that run and its space. Every pair agrees, which is
   * the shape the early exit never ends and the cap has to.
   */
  function agreeingLines(count: number, width: number): [string, string] {
    const oldLines: string[] = [];
    const newLines: string[] = [];
    for (let i = 0; i < count; i++) {
      const deleted = letters[i % 26] ?? 'z';
      const tokens: string[] = [];
      let length = 0;
      let k = 0;
      while (length < width) {
        const letter = letters[(i + 1 + k) % 26] ?? 'a';
        k += 1;
        if (letter === deleted) continue;
        const token = letter.repeat(2 + (k % 8));
        tokens.push(token);
        length += token.length + 1;
      }
      const base = tokens.join(' ');
      oldLines.push(`${base} ${deleted.repeat(6)}`);
      newLines.push(base);
    }
    return [`${oldLines.join('\n')}\n`, `${newLines.join('\n')}\n`];
  }

  it('uses the length limit Pierre itself applies', () => {
    // The defaults are protected, so this reads them the way a subclass would.
    class Peek extends DiffHunksRenderer {
      defaults(): { maxLineDiffLength: number } {
        return this.getOptionsWithDefaults();
      }
    }
    expect(new Peek({}).defaults().maxLineDiffLength).toBe(
      PIERRE_MAX_LINE_DIFF_LENGTH
    );
  });

  it('skips a pair over the limit and says nothing when nothing was compared', () => {
    const long = 'x'.repeat(PIERRE_MAX_LINE_DIFF_LENGTH + 1);
    const a = inlineDiffAgreement(parse(`${long} gone\n`, `${long}\n`));
    expect(a.pairs).toBe(1);
    expect(a.skipped).toBe(1);
    expect(a.compared).toBe(0);
    expect(inlineDiffAgreementLine(a, 'word')).toBeNull();
    expect(inlineDiffAgreementLine(a, 'none')).toBeNull();
  });

  it('compares exactly up to the cap and says nothing past it', () => {
    const [oldAt, newAt] = agreeingLines(AGREEMENT_PAIR_CAP, 40);
    const at = inlineDiffAgreement(parse(oldAt, newAt));
    expect(at.compared).toBe(AGREEMENT_PAIR_CAP);
    expect(at.capped).toBe(false);
    expect(inlineDiffAgreementLine(at, 'word')).toBe(ALL_THREE);

    const [oldOver, newOver] = agreeingLines(AGREEMENT_PAIR_CAP + 1, 40);
    const over = inlineDiffAgreement(parse(oldOver, newOver));
    expect(over.compared).toBe(AGREEMENT_PAIR_CAP);
    expect(over.capped).toBe(true);
    expect(inlineDiffAgreementLine(over, 'word')).toBeNull();
    expect(inlineDiffAgreementLine(over, 'none')).toBeNull();
  });

  it('stops walking once every comparison has failed', () => {
    // Two hundred replaced lines whose modes all differ: the walk ends on
    // the first pair or two, well under the cap.
    const oldLines: string[] = [];
    const newLines: string[] = [];
    for (let i = 0; i < 200; i++) {
      oldLines.push(`line ${String(i)} the quick brown fox jumps`);
      newLines.push(`line ${String(i)} the slow red fox leaps`);
    }
    const a = inlineDiffAgreement(parse(`${oldLines.join('\n')}\n`, `${newLines.join('\n')}\n`));
    expect(a.wordPhrase).toBe(false);
    expect(a.wordChar).toBe(false);
    expect(a.phraseChar).toBe(false);
    expect(a.compared).toBeLessThan(5);
    expect(a.capped).toBe(false);
  });

  it('costs single digit milliseconds in the worst case the cap allows', () => {
    // The hostile shape: a hundred agreeing pairs each just under the length
    // limit, so every pair runs both diffs over nearly a thousand characters.
    const [oldText, newText] = agreeingLines(AGREEMENT_PAIR_CAP + 20, 960);
    const meta = parse(oldText, newText);
    // Warm once, then take the median of five, since a cold JIT is not the
    // number a person pays on the second diff they open.
    inlineDiffAgreement(meta);
    const samples: number[] = [];
    for (let i = 0; i < 5; i++) samples.push(inlineDiffAgreement(meta).costMs);
    samples.sort((x, y) => x - y);
    const median = samples[2] ?? 0;
    console.log(
      `[p190] worst case agreement over ${String(AGREEMENT_PAIR_CAP)} pairs of ~960 chars: median ${median.toFixed(2)} ms, samples ${samples.map((s) => s.toFixed(2)).join(' ')}`
    );
    expect(median).toBeLessThan(50);
  });
});

describe('the refusals, read from the source', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'inline-diff-agreement.ts'),
    'utf8'
  );

  it('calls only the two jsdiff functions Pierre calls, and only the helpers Pierre exports', () => {
    const calls = source.match(/\bdiff[A-Z][A-Za-z]*\(/g) ?? [];
    expect(new Set(calls)).toEqual(new Set(['diffWordsWithSpace(', 'diffChars(']));
    expect(source).not.toMatch(/\bdiffWords\(/);
    expect(source).not.toMatch(/\bdiffLines\(/);
    expect(source).toMatch(/from '@pierre\/diffs'/);
    expect(source).not.toMatch(/@pierre\/diffs\/dist/);
  });

  it('never sets the mode or touches the store', () => {
    expect(source).not.toMatch(/setDiffInlineMode|writeInlineDiffMode|useEditor/);
  });
});
