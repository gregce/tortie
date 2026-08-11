/**
 * The NDJSON parser — where every ripgrep quirk the research measured has to
 * be handled, because none of them is visible until a user hits one:
 *
 *  - byte offsets vs UTF-16 (a highlight one character to the left),
 *  - a 7 MB line from a minified bundle (a dead Search view),
 *  - `{bytes}` instead of `{text}` for invalid UTF-8,
 *  - a matching line with ZERO submatches (a row with no highlight),
 *  - a multi-byte character split across two pipe chunks.
 */

import { describe, expect, it } from 'vitest';
import {
  LineSplitter,
  bytesOrText,
  buildMatch,
  parseRgLine,
  relPathOf,
  shapeLine,
  toUtf16
} from '../parser';
import type { RgMatchData } from '../parser';

/** The byte offsets ripgrep would emit for `needle` inside `text`. */
function byteRange(text: string, needle: string): [number, number] {
  const start = Buffer.from(text, 'utf8').indexOf(Buffer.from(needle, 'utf8'));
  return [start, start + Buffer.byteLength(needle, 'utf8')];
}

function matchEvent(
  text: string,
  ranges: [number, number][],
  over: Partial<RgMatchData> = {}
): RgMatchData {
  return {
    path: { text: './src/x.ts' },
    lines: { text },
    line_number: 12,
    absolute_offset: 400,
    submatches: ranges.map(([start, end]) => ({
      match: { text: text.slice(start, end) },
      start,
      end
    })),
    ...over
  };
}

describe('toUtf16', () => {
  it('lands the highlight ON the match, not one character to the left', () => {
    const line = 'const café = "naïve"; // café';
    const first = byteRange(line, 'café');
    const [converted] = toUtf16(line, [first]);
    expect(line.slice(converted![0], converted![1])).toBe('café');
    // The naive byte slice is the bug this function exists to prevent.
    expect(line.slice(first[0], first[1])).not.toBe('café');
  });

  it('is exact for emoji (surrogate pairs) and CJK', () => {
    const line = '// 🎉 party 日本語 done';
    for (const needle of ['party', '日本語', 'done', '🎉']) {
      const [conv] = toUtf16(line, [byteRange(line, needle)]);
      expect(line.slice(conv![0], conv![1])).toBe(needle);
    }
  });

  it('short-circuits pure ASCII without changing anything', () => {
    const pairs: [number, number][] = [[3, 7]];
    expect(toUtf16('plain ascii line', pairs)).toBe(pairs);
  });

  it('agrees with the slow-but-obvious converter on every offset', () => {
    const line = 'αβγ café 日本 🎉 tail — dash';
    const naive = (b: number): number =>
      Buffer.from(line, 'utf8').subarray(0, b).toString('utf8').length;
    const pairs: [number, number][] = [];
    for (const needle of ['αβγ', 'café', '日本', '🎉', 'tail', 'dash']) {
      pairs.push(byteRange(line, needle));
    }
    const converted = toUtf16(line, pairs);
    converted.forEach(([s, e], i) => {
      expect([s, e]).toEqual([naive(pairs[i]![0]), naive(pairs[i]![1])]);
    });
  });
});

describe('shapeLine', () => {
  it('trims indentation and shifts the offsets by exactly as much', () => {
    const raw = '        const MAX_TABS = 10;\n';
    const start = raw.indexOf('MAX_TABS');
    const out = shapeLine(raw, [[start, start + 8]], 2000);
    expect(out.text).toBe('const MAX_TABS = 10;');
    expect(out.trimmed).toBe(8);
    expect(out.text.slice(out.ranges[0]![0], out.ranges[0]![1])).toBe(
      'MAX_TABS'
    );
    expect(out.truncated).toBe(false);
  });

  it('windows a 7 MB minified line around the match', () => {
    const needle = 'createClient';
    const raw = `${'x'.repeat(500_000)}${needle}${'y'.repeat(500_000)}`;
    const start = raw.indexOf(needle);
    const out = shapeLine(raw, [[start, start + needle.length]], 2000);
    expect(out.truncated).toBe(true);
    expect(out.text.length).toBeLessThanOrEqual(2002); // + both ellipses
    expect(out.text.slice(out.ranges[0]![0], out.ranges[0]![1])).toBe(needle);
    expect(out.text.startsWith('…')).toBe(true);
    expect(out.text.endsWith('…')).toBe(true);
  });

  it('keeps the window at the head when the match is at the head', () => {
    const raw = `needle${'z'.repeat(10_000)}`;
    const out = shapeLine(raw, [[0, 6]], 100);
    expect(out.text.startsWith('needle')).toBe(true);
    expect(out.ranges[0]).toEqual([0, 6]);
  });

  it('drops highlights that fall outside the window rather than mis-pointing', () => {
    const raw = `${'a'.repeat(50)}HIT${'b'.repeat(5_000)}HIT`;
    const first = raw.indexOf('HIT');
    const second = raw.lastIndexOf('HIT');
    const out = shapeLine(
      raw,
      [
        [first, first + 3],
        [second, second + 3]
      ],
      200
    );
    expect(out.ranges).toHaveLength(1);
    expect(out.text.slice(out.ranges[0]![0], out.ranges[0]![1])).toBe('HIT');
  });

  it('strips the trailing newline and a CRLF carriage return', () => {
    expect(shapeLine('value\r\n', [], 2000).text).toBe('value');
  });
});

/**
 * `range + trimmed` is the column the editor reveals and SELECTS. Every test
 * above checks the highlight against `out.text`, which stays right even when
 * the number crossing IPC is wrong — so none of them saw a windowed line
 * report only its indentation and send the editor ~3,000 columns to the left,
 * onto filler text on the right line. These pin the sum itself.
 */
describe('shapeLine → original column arithmetic', () => {
  /** What the renderer computes: ranges[0] + trimmed must be the file column. */
  function columnsOf(out: {
    ranges: [number, number][];
    trimmed: number;
  }): [number, number] {
    const first = out.ranges[0]!;
    return [first[0] + out.trimmed, first[1] + out.trimmed];
  }

  it('reports the TRUE column when the match sits past the lead window', () => {
    // The measured case: 5,006 characters, NEEDLE at column 4,880 — far
    // beyond the 80-character lead, so the window starts at 3,006 and the
    // in-window offset (1,875) is nothing like the real column.
    const needle = 'NEEDLE';
    const raw = `${'a'.repeat(4880)}${needle}${'b'.repeat(120)}`;
    const trueColumn = raw.indexOf(needle);
    expect(trueColumn).toBe(4880);

    const out = shapeLine(raw, [[trueColumn, trueColumn + needle.length]], 2000);
    expect(out.truncated).toBe(true);
    // The window really did shift: the in-window offset is NOT the column.
    expect(out.ranges[0]![0]).not.toBe(trueColumn);
    expect(out.text.slice(out.ranges[0]![0], out.ranges[0]![1])).toBe(needle);
    expect(columnsOf(out)).toEqual([trueColumn, trueColumn + needle.length]);
  });

  it('composes the two shifts when a line is BOTH indented and windowed', () => {
    const needle = 'NEEDLE';
    const indent = '\t\t\t    ';
    const raw = `${indent}${'x'.repeat(3000)}${needle}${'y'.repeat(500)}`;
    const trueColumn = raw.indexOf(needle);

    const out = shapeLine(raw, [[trueColumn, trueColumn + needle.length]], 2000);
    expect(out.truncated).toBe(true);
    expect(out.trimmed).toBeGreaterThan(indent.length); // indentation is not the whole shift
    expect(out.text.slice(out.ranges[0]![0], out.ranges[0]![1])).toBe(needle);
    expect(columnsOf(out)).toEqual([trueColumn, trueColumn + needle.length]);
  });

  it('holds for every window position, ASCII and not', () => {
    const needle = 'café🎉';
    for (const at of [0, 79, 80, 81, 500, 2_000, 4_999, 9_994]) {
      const raw = `${'a'.repeat(at)}${needle}${'b'.repeat(10_000 - at)}`;
      const trueColumn = raw.indexOf(needle);
      const out = shapeLine(
        raw,
        [[trueColumn, trueColumn + needle.length]],
        2000
      );
      expect(out.text.slice(out.ranges[0]![0], out.ranges[0]![1])).toBe(needle);
      expect(columnsOf(out)).toEqual([
        trueColumn,
        trueColumn + needle.length
      ]);
    }
  });

  it('leaves a short line at its indentation — the shift is only the trim', () => {
    const raw = '        const MAX_TABS = 10;';
    const trueColumn = raw.indexOf('MAX_TABS');
    const out = shapeLine(raw, [[trueColumn, trueColumn + 8]], 2000);
    expect(out.truncated).toBe(false);
    expect(out.trimmed).toBe(8);
    expect(columnsOf(out)).toEqual([trueColumn, trueColumn + 8]);
  });

  it('carries the complete shift across into the SearchMatch row', () => {
    const needle = 'NEEDLE';
    const line = `  ${'a'.repeat(4880)}${needle}${'b'.repeat(120)}\n`;
    const trueColumn = line.indexOf(needle);
    const match = buildMatch(matchEvent(line, [byteRange(line, needle)]), 2000)!;
    expect(match.truncated).toBe(true);
    expect(match.ranges[0]![0] + match.trimmed).toBe(trueColumn);
    expect(match.ranges[0]![1] + match.trimmed).toBe(
      trueColumn + needle.length
    );
  });
});

describe('buildMatch', () => {
  it('produces a row with UTF-16 ranges and the byte offset for replace', () => {
    const line = '  const café = 1;\n';
    const range = byteRange(line, 'café');
    const match = buildMatch(matchEvent(line, [range]), 2000)!;
    expect(match.line).toBe(12);
    expect(match.trimmed).toBe(2);
    expect(match.byteOffset).toBe(400);
    expect(match.text.slice(match.ranges[0]![0], match.ranges[0]![1])).toBe(
      'café'
    );
  });

  it('synthesises a highlight for a zero-submatch line (upstream quirk)', () => {
    const data = matchEvent('some line\n', []);
    const match = buildMatch(data, 2000)!;
    expect(match.ranges).toHaveLength(1);
    expect(match.ranges[0]).toEqual([0, 1]);
  });

  it('decodes a base64 `bytes` line the same as a `text` one', () => {
    const text = 'invalid ünicode here\n';
    const data = matchEvent(text, [byteRange(text, 'ünicode')]);
    data.lines = { bytes: Buffer.from(text, 'utf8').toString('base64') };
    const match = buildMatch(data, 2000)!;
    expect(match.text.slice(match.ranges[0]![0], match.ranges[0]![1])).toBe(
      'ünicode'
    );
  });

  it('carries the replacement preview only when ripgrep supplied one', () => {
    const line = 'const MAX_TABS = 10;\n';
    const range = byteRange(line, 'MAX_TABS');
    const plain = buildMatch(matchEvent(line, [range]), 2000)!;
    expect(plain.replacements).toBeUndefined();

    const data = matchEvent(line, [range]);
    data.submatches[0]!.replacement = { text: 'TAB_LIMIT' };
    expect(buildMatch(data, 2000)!.replacements).toEqual(['TAB_LIMIT']);
  });

  it('refuses a row with no line number rather than inventing line 0', () => {
    const data = matchEvent('x\n', [[0, 1]]);
    data.line_number = null;
    expect(buildMatch(data, 2000)).toBeNull();
  });
});

describe('parseRgLine / relPathOf', () => {
  it('ignores unparseable and unknown events instead of failing the search', () => {
    expect(parseRgLine('{not json')).toBeNull();
    expect(parseRgLine('')).toBeNull();
    expect(parseRgLine('{"type":"future","data":{}}')).toBeNull();
    expect(parseRgLine('{"type":"begin","data":{"path":{"text":"./a"}}}'))
      .not.toBeNull();
  });

  it('strips the "./" ripgrep prefixes every path with', () => {
    expect(relPathOf({ text: './src/a.ts' })).toBe('src/a.ts');
    expect(bytesOrText(undefined)).toBe('');
  });
});

describe('LineSplitter', () => {
  it('reassembles a multi-byte character split across two chunks', () => {
    const payload = Buffer.from('{"café":"naïve"}\n', 'utf8');
    const splitter = new LineSplitter();
    const lines: string[] = [];
    // Cut mid-character: byte 3 lands inside the 'é'.
    splitter.push(payload.subarray(0, 3), (l) => lines.push(l));
    splitter.push(payload.subarray(3), (l) => lines.push(l));
    expect(lines).toEqual(['{"café":"naïve"}']);
  });

  it('emits a trailing line with no newline on flush', () => {
    const splitter = new LineSplitter();
    const lines: string[] = [];
    splitter.push(Buffer.from('a\nb'), (l) => lines.push(l));
    expect(lines).toEqual(['a']);
    splitter.flush((l) => lines.push(l));
    expect(lines).toEqual(['a', 'b']);
  });

  it('handles a line spanning many chunks without losing bytes', () => {
    const long = 'z'.repeat(200_000);
    const splitter = new LineSplitter();
    const lines: string[] = [];
    const buf = Buffer.from(`${long}\n`, 'utf8');
    for (let i = 0; i < buf.length; i += 64 * 1024) {
      splitter.push(buf.subarray(i, i + 64 * 1024), (l) => lines.push(l));
    }
    expect(lines).toEqual([long]);
  });
});
