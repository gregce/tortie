/**
 * PHASE 247 — the span grammar, and refusal 8.
 *
 * The grammar is research 107's detector B ported into the product. These
 * pins are the families research 107 section 3.2 named as the false positives
 * a shape-only detector cannot tell from a path, plus refusal 8 spelled the
 * way research 111 section 4.1 measured it.
 */

import { describe, expect, it } from 'vitest';
import {
  edgeRefusal,
  looksLikePath,
  pathSpansInRow,
  stripDecoration,
  tokensInRow
} from '../path-spans';

describe('what looks like a path', () => {
  it('accepts an absolute path and a relative one', () => {
    expect(looksLikePath('/Users/gdc/gmux/README.md')).toBe(true);
    expect(looksLikePath('src/main/fs/ipc.ts')).toBe(true);
  });

  it('refuses the families research 107 section 3.2 measured', () => {
    // A URL of some scheme — WebLinksAddon is registered first and owns those.
    expect(looksLikePath('https://example.com/a/b')).toBe(false);
    // A fraction out of a progress meter.
    expect(looksLikePath('171/383')).toBe(false);
    // Markup, which is not a path by the segment grammar.
    expect(looksLikePath('</p>')).toBe(false);
    // A token with no separator at all.
    expect(looksLikePath('README.md')).toBe(false);
  });

  it('accepts the shapes that ARE paths and that the door then judges', () => {
    // A slash command and a git ref look like paths to any shape detector.
    // The grammar says so; `lstat` is what refuses them, which is why the
    // offer condition is existence and not spelling.
    expect(looksLikePath('/login')).toBe(true);
    expect(looksLikePath('origin/main')).toBe(true);
    expect(looksLikePath('America/Chicago')).toBe(true);
  });
});

describe('the decoration a person’s eye strips', () => {
  it('strips a file:// prefix and a :line[:col] suffix, keeping the line', () => {
    expect(stripDecoration('/a/b.ts:42')).toEqual({ target: '/a/b.ts', line: 42 });
    expect(stripDecoration('/a/b.ts:42:7')).toEqual({
      target: '/a/b.ts',
      line: 42
    });
    expect(stripDecoration('file:///a/b.ts')).toEqual({ target: '/a/b.ts' });
  });

  it('leaves a leading ~ alone, because only main has a home directory', () => {
    expect(stripDecoration('~/.claude/CLAUDE.md')).toEqual({
      target: '~/.claude/CLAUDE.md'
    });
  });

  it('strips brackets and sentence punctuation, and moves the column with them', () => {
    const [, span] = tokensInRow('see (/a/b.md).');
    expect(span).toMatchObject({ text: '/a/b.md', start: 5, end: 12 });
  });
});

describe('refusal 8 — a span that touches either end of its row', () => {
  it('refuses a span that ends where the row’s drawn text ends', () => {
    const text = 'wrote /Users/gdc/gmux/src/renderer/terminal/Terminal';
    const [span] = pathSpansInRow(text, null);
    expect(span).toBeUndefined();
  });

  it('offers a span with anything after it', () => {
    const text = 'wrote /a/b.md for you';
    const spans = pathSpansInRow(text, null);
    expect(spans.map((s) => s.target)).toEqual(['/a/b.md']);
  });

  it('refuses a span at the row’s head when the row above ends in a path character', () => {
    const above = 'wrote /Users/gdc/gmux/src/renderer/terminal/Terminal';
    const text = 'Pane.tsx and /a/b.md';
    // The head span is the wrap tail; the one with text after it survives...
    // except that /a/b.md ends this row, so both are refused here.
    expect(pathSpansInRow(text, above)).toEqual([]);
  });

  it('offers a span at the row’s head when the row above does NOT continue', () => {
    const spans = pathSpansInRow('/a/b.md was written', 'all done!');
    expect(spans.map((s) => s.target)).toEqual(['/a/b.md']);
  });

  it('reads past a TUI gutter to find the row’s head', () => {
    const above = 'wrote /Users/gdc/gmux/src/rendere';
    expect(edgeRefusal({ text: '/a', start: 4, end: 6, target: '/a' }, '  │ /a b', above)).toBe(
      true
    );
    // ...and the same span with a row above that cannot have continued is fine.
    expect(edgeRefusal({ text: '/a', start: 4, end: 6, target: '/a' }, '  │ /a b', 'done!')).toBe(
      false
    );
  });
});

describe('a whole row', () => {
  it('offers every candidate and nothing else', () => {
    const text =
      'read /Users/gdc/gmux/README.md and src/main.ts and https://x.dev/a here';
    expect(pathSpansInRow(text, null).map((s) => s.target)).toEqual([
      '/Users/gdc/gmux/README.md',
      'src/main.ts'
    ]);
  });
});
