/**
 * PHASE 241 — the three reshapes, as pure functions of strings.
 *
 * Issue 17 asked for a command to pretty-print markdown tables, and the
 * operator widened it to "a handful of other built-ins for fast re-editing …
 * like pretty print for json". These are the three that earned a row, and this
 * file is why each is safe to point at a person's file.
 *
 * THE TWO REFUSALS ARE THE POINT. A table whose body row is wider than its
 * header would GROW THE HEADER, so it is refused with the line named — nine
 * of this repository's 1,770 tables are that shape and the cause is almost
 * always an unescaped pipe inside a code span. And `JSON.parse` +
 * `JSON.stringify` is not a whitespace change: six measured losses are refused
 * here, one case each, with nothing written on any of them.
 *
 * The shipping module runs under node; no Monaco, no Electron, no DOM.
 */

import { describe, expect, it } from 'vitest';
import {
  formatMarkdownTable,
  isReshapableJson,
  minifyJson,
  prettyJson,
  reshapeTableAt,
  stripJsonWhitespace,
  tableAt,
  tableBlockAt
} from '../reshape';

const DOC = [
  'Some prose about the thing.', // 1
  '', // 2
  '| a | b |', // 3
  '| --- | --: |', // 4
  '| 1 | 2 |', // 5
  '| 3 | 4 |', // 6
  '', // 7
  'A closing paragraph', // 8
  '---', // 9  a setext heading, NOT a delimiter row
  '', // 10
  '- item', // 11
  '', // 12
  '    | c | d |', // 13
  '    | --- | --- |', // 14
  '    | 5 | 6 |' // 15
].join('\n');

describe('the table reshape', () => {
  it('formats the table under the caret and puts its indent back', () => {
    const answer = reshapeTableAt(DOC.split('\n'), 15);
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    expect(answer.startLine).toBe(13);
    expect(answer.endLine).toBe(15);
    for (const line of answer.text.split('\n')) expect(line.startsWith('    ')).toBe(true);
  });

  it('keeps the alignment markers', () => {
    const src = '| l | c | r |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |';
    const out = formatMarkdownTable(src);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.text.split('\n')[1]).toContain(':-');
    expect(out.text.split('\n')[1]).toContain('-:');
    expect(formatMarkdownTable(out.text)).toEqual(out);
  });

  it('keeps an escaped pipe, a code span and a joined emoji byte for byte', () => {
    const src =
      '| id | call |\n| --- | --- |\n| a \\| b | `x` |\n| 👩‍💻 | 日本語 |';
    const out = formatMarkdownTable(src);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    for (const cell of ['a \\| b', '`x`', '👩‍💻', '日本語']) {
      expect(out.text).toContain(cell);
    }
  });

  it('pads a SHORT row and REFUSES to grow the header', () => {
    const short = formatMarkdownTable('| a | b | c |\n| --- | --- | --- |\n| 1 |');
    expect(short.ok).toBe(true);
    const long = formatMarkdownTable('| a | b |\n| --- | --- |\n| 1 | 2 | 3 |');
    expect(long.ok).toBe(false);
    if (long.ok) return;
    expect(long.why).toContain('Line 3 has 3 cells and the header has 2');
  });

  it('refuses text that is not a table', () => {
    expect(tableBlockAt(['just a paragraph with | a pipe'], 1)).toBeNull();
    expect(tableAt(['just a paragraph with | a pipe'], 1)).toBeNull();
  });

  it('THE TWO STRUCTURAL CLAUSES, pinned on the predicate itself', () => {
    // The delimiter row's PIPE. `---` matches every hyphen rule a delimiter
    // row has, and without the pipe a setext heading under a line that
    // happens to hold one reads as a table.
    expect(tableBlockAt(['| a | b', '---'], 1)).toBeNull();
    // The delimiter row must BE one. Two prose lines carrying pipes are a
    // paragraph, and the line scan alone would call them a table.
    expect(tableBlockAt(['a | b in prose', 'and | more prose'], 1)).toBeNull();
    expect(tableAt(['a | b in prose', 'and | more prose'], 1)).toBeNull();
    // And the control: a real one is still found from any of its lines.
    expect(tableBlockAt(['| a | b |', '| - | - |', '| 1 | 2 |'], 3)?.startLine).toBe(1);
  });

  // -------------------------------------------------------------------------
  // THE GLUED CORPUS — the Phase 241 fix round's own defect, one case per
  // block-level structure GFM ends a table at.
  //
  // The block was the RUN OF NON-BLANK LINES around the caret, and a GFM table
  // ends at a blank line OR at the start of another block-level structure. So
  // a heading, a fenced block, a list, a blockquote, a rule or an HTML block
  // written directly under a table sat INSIDE the block the press rewrote, and
  // the formatted table was written over it: seven tails destroyed silently in
  // the person's own file, undoable in one press and visible in none. Nothing
  // in this repository is that shape, which is why the corpus walk over real
  // files could never have caught it and why these shapes are written down.
  // -------------------------------------------------------------------------

  const TABLE = ['| a | b |', '|---|---|', '| 1 | 2 |'];

  it.each([
    ['an ATX heading', ['### keep me']],
    ['a fenced code block', ['```js', 'const keep = "this line must survive";', '```']],
    ['a bullet list', ['- keep me']],
    ['an ordered list', ['1. keep me']],
    ['a blockquote', ['> keep me']],
    ['a thematic break', ['***']],
    ['an HTML block', ['<div>keep me</div>']]
  ])('leaves %s glued under the table exactly where it was', (_what, tail) => {
    const lines = [...TABLE, ...tail];
    const answer = reshapeTableAt(lines, 3);
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    expect(answer.startLine).toBe(1);
    // THE WHOLE FIX IN ONE NUMBER: the block ends at the table's last row and
    // not at the run's last line, so every tail line is outside the edit.
    expect(answer.endLine).toBe(3);
    const next = [
      ...lines.slice(0, answer.startLine - 1),
      ...answer.text.split('\n'),
      ...lines.slice(answer.endLine)
    ];
    expect(next.slice(3)).toEqual(tail);
  });

  it('ABSORBS a glued paragraph as a row, because that is what GFM does', () => {
    const answer = reshapeTableAt([...TABLE, 'keep me as prose'], 3);
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    expect(answer.endLine).toBe(4);
    expect(answer.text).toContain('keep me as prose');
  });

  it.each([
    ['an ATX heading', ['### a heading']],
    ['a paragraph', ['some prose']],
    ['a thematic break', ['***']]
  ])('finds a table with %s glued directly above it', (_what, head) => {
    const lines = [...head, ...TABLE];
    const answer = reshapeTableAt(lines, head.length + 2);
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    expect(answer.startLine).toBe(head.length + 1);
    expect(answer.endLine).toBe(head.length + 3);
  });

  it('draws NO row for a caret on the line glued above the table', () => {
    expect(tableAt(['### a heading', ...TABLE], 1)).toBeNull();
  });

  it('draws no row for pipe rows lazily continuing a list item', () => {
    // `- an item` opens a paragraph inside a list item and the pipe lines are
    // its lazy continuations, so GFM sees no table and neither does this.
    expect(tableAt(['- an item', ...TABLE], 3)).toBeNull();
  });
});

describe('the JSON reshapes, and the guard in front of the first', () => {
  it('formats and minifies an ordinary agent wall', () => {
    const src = '{"name":"tortie","flags":[true,false,null],"n":42}';
    const pretty = prettyJson(src);
    expect(pretty.ok).toBe(true);
    if (!pretty.ok) return;
    expect(pretty.text.split('\n').length).toBeGreaterThan(1);
    const back = minifyJson(pretty.text);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.text).toBe(src);
  });

  it('REFUSES every one of the six losses, and writes nothing', () => {
    const losses: [string, string][] = [
      ['integer-like keys reorder', '{"10":"a","2":"b","k":"c"}'],
      ['a duplicate key collapses', '{"a":1,"a":2}'],
      ['an id past 2^53 is rewritten', '{"id":12345678901234567890}'],
      ['a decimal is rounded', '{"x":0.1234567890123456789}'],
      ['-0 becomes 0', '{"x":-0}'],
      ['1e400 becomes null', '{"x":1e400}']
    ];
    for (const [why, src] of losses) {
      const answer = prettyJson(src);
      expect(answer.ok, why).toBe(false);
      if (answer.ok) continue;
      expect(answer.why).toContain('more than whitespace at offset');
      // The minify row is byte-preserving, so every one of these still
      // minifies — that is the point of it being the guard's own lexer.
      expect(minifyJson(src).ok, why).toBe(true);
    }
  });

  it('passes a re-encoded string, AND REWRITES IT, which is the honest claim', () => {
    // Not byte-preserving, and the module header says so rather than claiming
    // "nothing but whitespace moved". A string token is compared by VALUE, so
    // the escape form is the one byte besides whitespace this row changes —
    // deliberately, because refusing a re-encoded string would refuse the
    // commonest shape an agent writes.
    const answer = prettyJson('{"s":"a\\u00e9"}');
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    expect(answer.text).toBe('{\n  "s": "aé"\n}');
    expect(answer.text).not.toContain('u00e9');
  });

  it('minify keeps the exact digits the person wrote', () => {
    const answer = minifyJson('{"id": 12345678901234567890,\n "a": 1}');
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    expect(answer.text).toBe('{"id":12345678901234567890,"a":1}');
  });

  it('leaves a pipe, a brace and a space inside a string alone', () => {
    expect(stripJsonWhitespace('{"a": "x | y  z"}')).toBe('{"a":"x | y  z"}');
  });

  it('offers nothing over a bare number or a broken fragment', () => {
    expect(isReshapableJson('42')).toBe(false);
    expect(isReshapableJson('"word"')).toBe(false);
    expect(isReshapableJson('{"a":1,}')).toBe(false);
    expect(isReshapableJson(' [1, 2] ')).toBe(true);
  });
});
