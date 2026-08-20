/**
 * Searching one folder on another machine (Phase 98).
 *
 * The three pure halves are tested for real. The read itself crosses to another
 * computer, and a mocked spawn would prove the mock, so the live search is
 * driven by `node build/probe-p98-search.mjs` against a loopback scratch
 * machine, where the hit set is compared line for line against
 * `git ls-files ... | xargs grep -In` run directly and against the bundled
 * ripgrep on the same corpus.
 *
 * The parse is the part that matters. A wrong answer here is a row that names
 * the wrong file, a row that lands on the wrong line, or a highlight sitting off
 * the match.
 */

import { describe, expect, it } from 'vitest';
import { SEARCH_LIMITS } from '@shared/ipc';
import {
  REMOTE_SEARCH_TIMEOUT_MS,
  buildRemoteSearchFiles,
  parseGrepLine,
  parseSearchAnswer,
  searchFlagLetters
} from '../remote-search';

const encode = (text: string): string => Buffer.from(text, 'utf8').toString('base64');

const LITERAL = {
  query: 'needle',
  isRegex: false,
  isCaseSensitive: true,
  matchWholeWord: false
};

describe('reading what the machine answered', () => {
  it('reads all four mode words', () => {
    expect(parseSearchAnswer(`repo 0 ${encode('a.ts:1:x\n')}`)?.mode).toBe('repo');
    expect(parseSearchAnswer(`walk 0 ${encode('a.ts:1:x\n')}`)?.mode).toBe('walk');
    expect(parseSearchAnswer('missing 0 none')?.mode).toBe('missing');
    // The far side prints one lower case word per state, so it never has to
    // know how this end spells it.
    expect(parseSearchAnswer('badpattern 0 none')?.mode).toBe('badPattern');
  });

  it('reads the cut answer the far side sent, rather than guessing at it', () => {
    // `head -c` cuts at a byte offset and can land on a newline, so a body that
    // ends cleanly is no proof that nothing was thrown away over there.
    const whole = encode('a.ts:1:x\n');
    expect(parseSearchAnswer(`repo 0 ${whole}`)?.cut).toBe(false);
    expect(parseSearchAnswer(`repo 1 ${whole}`)?.cut).toBe(true);
  });

  it('refuses a middle word that is neither 0 nor 1', () => {
    expect(parseSearchAnswer(`repo 2 ${encode('a.ts:1:x\n')}`)).toBeNull();
    expect(parseSearchAnswer(`repo yes ${encode('a.ts:1:x\n')}`)).toBeNull();
    // The two word answer this phase started with. A build that read it would
    // decode the mode word and then a body that is not there.
    expect(parseSearchAnswer(`repo ${encode('a.ts:1:x\n')}`)).toBeNull();
  });

  it('reads the empty word as an empty body rather than as a failure', () => {
    expect(parseSearchAnswer('repo 0 none')).toEqual({
      mode: 'repo',
      cut: false,
      body: ''
    });
  });

  it('decodes the body the far side encoded', () => {
    const body = 'src/a.ts:12:const needle = 1;\n';
    expect(parseSearchAnswer(`repo 0 ${encode(body)}`)).toEqual({
      mode: 'repo',
      cut: false,
      body
    });
  });

  it('refuses a body holding a character base64 does not use', () => {
    // Buffer.from DROPS such a character and hands back plausible nonsense, and
    // a person reading search results cannot tell nonsense from a file.
    expect(parseSearchAnswer('repo 0 not-base64!!')).toBeNull();
  });

  it('refuses a word that is not one of the four', () => {
    expect(parseSearchAnswer(`ok 0 ${encode('a:1:b\n')}`)).toBeNull();
    expect(parseSearchAnswer('')).toBeNull();
  });

  it('refuses a payload with no third word at all', () => {
    expect(parseSearchAnswer('repo')).toBeNull();
    expect(parseSearchAnswer('repo 0')).toBeNull();
  });
});

describe('reading one line of grep output', () => {
  it('reads an ordinary line', () => {
    expect(parseGrepLine('src/a.ts:12:const needle = 1;')).toEqual({
      relPath: 'src/a.ts',
      line: 12,
      text: 'const needle = 1;'
    });
  });

  it('reads a path holding a colon', () => {
    // Measured on this Mac before the module was written: the walk branch
    // prints exactly this for a file called `we:ird.txt`.
    expect(parseGrepLine('./we:ird.txt:1:colon hit')).toEqual({
      relPath: 'we:ird.txt',
      line: 1,
      text: 'colon hit'
    });
  });

  it('strips the leading ./ the walk branch prints', () => {
    expect(parseGrepLine('./a.ts:3:x')?.relPath).toBe('a.ts');
  });

  it('keeps every colon in the matching text', () => {
    expect(parseGrepLine('a.ts:3:const map = { a: 1, b: 2 };')?.text).toBe(
      'const map = { a: 1, b: 2 };'
    );
  });

  it('drops a line with no line number in it', () => {
    // A file name holding a newline arrives as two lines, and the second one
    // does not parse. It is dropped rather than guessed at.
    expect(parseGrepLine('this is the tail of a file name')).toBeNull();
    expect(parseGrepLine('a.ts:not-a-number:x')).toBeNull();
    expect(parseGrepLine('')).toBeNull();
  });

  it('drops a line whose path is empty', () => {
    expect(parseGrepLine(':1:x')).toBeNull();
  });
});

describe('the flag letters', () => {
  it('is the empty string when no toggle is on', () => {
    expect(
      searchFlagLetters({
        isRegex: false,
        isCaseSensitive: true,
        matchWholeWord: false
      })
    ).toBe('');
  });

  it('names ignore case, whole word and regular expression in one word', () => {
    expect(
      searchFlagLetters({
        isRegex: true,
        isCaseSensitive: false,
        matchWholeWord: true
      })
    ).toBe('iwe');
  });
});

describe('building the rows', () => {
  it('groups by file in the order the machine printed them', () => {
    const built = buildRemoteSearchFiles(
      [
        'src/b.ts:1:needle one',
        'src/a.ts:4:needle two',
        'src/b.ts:9:needle three'
      ],
      LITERAL,
      SEARCH_LIMITS.maxLineChars
    );
    expect(built.files.map((file) => file.relPath)).toEqual([
      'src/b.ts',
      'src/a.ts'
    ]);
    expect(built.files[0]?.matchCount).toBe(2);
    expect(built.files[1]?.matchCount).toBe(1);
    expect(built.totalMatches).toBe(3);
  });

  it('drops a line nothing could read rather than inventing a row', () => {
    const built = buildRemoteSearchFiles(
      ['src/a.ts:1:needle', 'the tail of a name holding a newline'],
      LITERAL,
      SEARCH_LIMITS.maxLineChars
    );
    expect(built.files).toHaveLength(1);
    expect(built.totalMatches).toBe(1);
  });

  it('keeps at most maxPerFile matches and says it cut', () => {
    const lines = Array.from(
      { length: SEARCH_LIMITS.maxPerFile + 5 },
      (_, at) => `src/a.ts:${String(at + 1)}:needle`
    );
    const built = buildRemoteSearchFiles(lines, LITERAL, SEARCH_LIMITS.maxLineChars);
    const file = built.files[0];
    expect(file?.matches).toHaveLength(SEARCH_LIMITS.maxPerFile);
    expect(file?.matchCount).toBe(SEARCH_LIMITS.maxPerFile + 5);
    expect(file?.clipped).toBe(true);
  });

  it('places the span on a literal match', () => {
    const built = buildRemoteSearchFiles(
      ['a.ts:1:  a needle here'],
      LITERAL,
      SEARCH_LIMITS.maxLineChars
    );
    const match = built.files[0]?.matches[0];
    // shapeLine strips the two leading spaces and reports them as `trimmed`.
    expect(match?.text).toBe('a needle here');
    expect(match?.trimmed).toBe(2);
    expect(match?.ranges).toEqual([[2, 8]]);
    expect(match?.byteOffset).toBe(0);
  });

  it('ignores case when the search is not case sensitive', () => {
    const built = buildRemoteSearchFiles(
      ['a.ts:1:NEEDLE'],
      { ...LITERAL, isCaseSensitive: false },
      SEARCH_LIMITS.maxLineChars
    );
    expect(built.files[0]?.matches[0]?.ranges).toEqual([[0, 6]]);
  });

  it('places the span on a whole word match and not inside a longer word', () => {
    const built = buildRemoteSearchFiles(
      ['a.ts:1:needles needle'],
      { ...LITERAL, matchWholeWord: true },
      SEARCH_LIMITS.maxLineChars
    );
    expect(built.files[0]?.matches[0]?.ranges).toEqual([[8, 14]]);
  });

  it('places the span on a regular expression match', () => {
    const built = buildRemoteSearchFiles(
      ['a.ts:1:const value = 42;'],
      { query: '[0-9]+', isRegex: true, isCaseSensitive: true, matchWholeWord: false },
      SEARCH_LIMITS.maxLineChars
    );
    expect(built.files[0]?.matches[0]?.ranges).toEqual([[14, 16]]);
  });

  it('treats a literal query as text rather than as a pattern', () => {
    const built = buildRemoteSearchFiles(
      ['a.ts:1:a.b and axb'],
      { query: 'a.b', isRegex: false, isCaseSensitive: true, matchWholeWord: false },
      SEARCH_LIMITS.maxLineChars
    );
    expect(built.files[0]?.matches[0]?.ranges).toEqual([[0, 3]]);
  });

  it('falls back to one character when the two engines disagree', () => {
    // The machine's grep matched the line and this engine does not. The row is
    // real because the machine found it, and Tortie does not invent a highlight
    // it cannot place.
    const built = buildRemoteSearchFiles(
      ['a.ts:1:the machine found this line'],
      LITERAL,
      SEARCH_LIMITS.maxLineChars
    );
    expect(built.files[0]?.matches[0]?.ranges).toEqual([[0, 1]]);
  });

  it('falls back the same way for a pattern this engine will not read', () => {
    // BSD grep reads `\1` inside a bracket differently from JavaScript. Any
    // pattern JavaScript refuses lands here rather than taking the search down.
    const built = buildRemoteSearchFiles(
      ['a.ts:1:something'],
      { query: '(', isRegex: true, isCaseSensitive: true, matchWholeWord: false },
      SEARCH_LIMITS.maxLineChars
    );
    expect(built.files[0]?.matches[0]?.ranges).toEqual([[0, 1]]);
  });

  it('cannot spin on a pattern that matches nothing at all', () => {
    const built = buildRemoteSearchFiles(
      ['a.ts:1:aaa'],
      { query: 'x*', isRegex: true, isCaseSensitive: true, matchWholeWord: false },
      SEARCH_LIMITS.maxLineChars
    );
    // Every match is zero width, so no span is kept and the fallback answers.
    expect(built.files[0]?.matches[0]?.ranges).toEqual([[0, 1]]);
  });

  it('keeps at most one hundred spans on one line', () => {
    const built = buildRemoteSearchFiles(
      [`a.ts:1:${'needle '.repeat(200)}`],
      LITERAL,
      SEARCH_LIMITS.maxLineChars
    );
    expect(built.files[0]?.matches[0]?.ranges.length).toBeLessThanOrEqual(100);
  });

  it('windows a long line and reports the number the editor navigates by', () => {
    const lead = 'x'.repeat(4_800);
    const built = buildRemoteSearchFiles(
      [`a.ts:1:${lead}needle${'y'.repeat(200)}`],
      LITERAL,
      SEARCH_LIMITS.maxLineChars
    );
    const match = built.files[0]?.matches[0];
    expect(match?.truncated).toBe(true);
    expect(match?.text.length).toBeLessThanOrEqual(SEARCH_LIMITS.maxLineChars + 2);
    const range = match?.ranges[0] ?? [0, 0];
    // range + trimmed is the column in the file, which is where the needle is.
    expect(range[0] + (match?.trimmed ?? 0)).toBe(4_800);
  });
});

describe('the deadline', () => {
  it('is thirty seconds, which is a deadline and not an expectation', () => {
    // Research 57 section 2.4 measured a whole 33,023,414 byte tracked corpus
    // scanned in 174 to 176 ms.
    expect(REMOTE_SEARCH_TIMEOUT_MS).toBe(30_000);
  });
});
