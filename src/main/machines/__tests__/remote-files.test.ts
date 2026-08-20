/**
 * Reading the file names in one folder on another machine (Phase 99).
 *
 * The two pure halves are tested for real. The read itself crosses to another
 * computer, and a mocked spawn would prove the mock, so the live read is driven
 * by `node build/probe-p99-quickopen.mjs` against a loopback scratch machine,
 * where the name set is compared against
 * `git ls-files --cached --others --exclude-standard` run directly in the same
 * repository.
 *
 * The parse is the part that matters. A wrong answer here is a palette that
 * offers a file nobody has, one that hides a file that is there, or one that
 * says a complete list when the far side threw half of it away.
 */

import { describe, expect, it } from 'vitest';
import { REMOTE_FILE_LIST_MAX } from '@shared/ipc';
import { parseFileListAnswer, relPathsFrom } from '../remote-files';

const encode = (text: string): string =>
  Buffer.from(text, 'utf8').toString('base64');

describe('reading what the machine answered', () => {
  it('reads all three mode words', () => {
    expect(parseFileListAnswer(`repo 0 ${encode('a.ts\n')}`)?.mode).toBe('repo');
    expect(parseFileListAnswer(`walk 0 ${encode('a.ts\n')}`)?.mode).toBe('walk');
    expect(parseFileListAnswer('missing 0 none')?.mode).toBe('missing');
  });

  it('refuses a word the script never prints', () => {
    expect(parseFileListAnswer('badpattern 0 none')).toBeNull();
    expect(parseFileListAnswer('ok 0 none')).toBeNull();
    expect(parseFileListAnswer('')).toBeNull();
  });

  it('reads the cut answer the far side sent, rather than guessing at it', () => {
    // `head -c` cuts at a byte offset and can land on a newline, so a body that
    // ends cleanly is no proof that nothing was thrown away over there.
    const whole = encode('a.ts\n');
    expect(parseFileListAnswer(`repo 0 ${whole}`)?.cut).toBe(false);
    expect(parseFileListAnswer(`repo 1 ${whole}`)?.cut).toBe(true);
  });

  it('refuses a middle word that is neither 0 nor 1', () => {
    expect(parseFileListAnswer(`repo 2 ${encode('a.ts\n')}`)).toBeNull();
    expect(parseFileListAnswer(`repo yes ${encode('a.ts\n')}`)).toBeNull();
    // The two word answer. A build that read it would decode the mode word and
    // then a body that is not there.
    expect(parseFileListAnswer(`repo ${encode('a.ts\n')}`)).toBeNull();
  });

  it('reads the empty word as an empty body rather than as a failure', () => {
    expect(parseFileListAnswer('repo 0 none')).toEqual({
      mode: 'repo',
      cut: false,
      body: ''
    });
  });

  it('refuses a body that is not base64 instead of decoding nonsense', () => {
    // `Buffer.from` DROPS a character it does not know and hands back plausible
    // nonsense, and a person reading a list of file names cannot tell nonsense
    // from a file.
    expect(parseFileListAnswer('repo 0 %%%%')).toBeNull();
    expect(parseFileListAnswer('repo 0 a.ts,b.ts')).toBeNull();
    expect(parseFileListAnswer(`repo 0 ${encode('a.ts\n')}!`)).toBeNull();
  });

  it('reads an answer with newlines and extra spacing between the words', () => {
    expect(parseFileListAnswer(`\n repo \t 0  ${encode('a.ts\n')} \n`)?.mode).toBe(
      'repo'
    );
  });
});

describe('the decoded body into relative paths', () => {
  const cap = 10_000;

  it('drops the text after the final newline', () => {
    // For a body that ended cleanly that text is the empty string. For a body
    // the byte ceiling cut it is a path cut in the middle, which is not a file
    // anybody has.
    expect(relPathsFrom('a.ts\nb.ts\n', cap).paths).toEqual(['a.ts', 'b.ts']);
    expect(relPathsFrom('a.ts\nb.t', cap).paths).toEqual(['a.ts']);
    expect(relPathsFrom('', cap).paths).toEqual([]);
  });

  it('strips the leading ./ the walk branch prints', () => {
    expect(relPathsFrom('./a.ts\n./src/b.ts\n', cap).paths).toEqual([
      'a.ts',
      'src/b.ts'
    ]);
  });

  it('keeps a path holding a space', () => {
    expect(relPathsFrom('src/a b.ts\n', cap).paths).toEqual(['src/a b.ts']);
  });

  it('drops a line git quoted, rather than guessing at the name', () => {
    // Git quotes a name holding a byte it cannot print plainly, e.g. a newline.
    // That is the rule `tree-list` already carries.
    expect(relPathsFrom('a.ts\n"we\\nird.ts"\nb.ts\n', cap).paths).toEqual([
      'a.ts',
      'b.ts'
    ]);
  });

  it('drops an empty line', () => {
    expect(relPathsFrom('a.ts\n\nb.ts\n', cap).paths).toEqual(['a.ts', 'b.ts']);
  });

  it('says the cap bit when the far side sent more than the cap', () => {
    // The far side is asked for the cap PLUS ONE, so a body with more lines
    // than the cap is proof the cap bit rather than a guess about it.
    const body = `${['a', 'b', 'c'].map((one) => `${one}.ts`).join('\n')}\n`;
    expect(relPathsFrom(body, 3)).toEqual({
      paths: ['a.ts', 'b.ts', 'c.ts'],
      capped: false
    });
    expect(relPathsFrom(body, 2)).toEqual({
      paths: ['a.ts', 'b.ts'],
      capped: true
    });
  });

  it('counts the cap before anything is dropped', () => {
    // Counting after the filters would turn one quoted name into a list that
    // reports itself complete when the far side had already cut it.
    const body = '"q.ts"\na.ts\nb.ts\n';
    expect(relPathsFrom(body, 2)).toEqual({ paths: ['a.ts'], capped: true });
  });
});

describe('the cap this end asks for', () => {
  it('is the number both ends read', () => {
    expect(REMOTE_FILE_LIST_MAX).toBe(50_000);
  });
});
