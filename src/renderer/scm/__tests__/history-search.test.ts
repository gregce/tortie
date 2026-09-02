import { describe, expect, it } from 'vitest';
import {
  EMPTY_QUERY,
  SEARCH_DEBOUNCE_MS,
  bareCommitAsMessage,
  isEmptyQuery,
  parseHistoryQuery,
  sameQuery,
  toSearch,
  withoutChange
} from '../history-search';

describe('parseHistoryQuery', () => {
  it('reads bare text as one message phrase', () => {
    const q = parseHistoryQuery('  the  redline  ');
    expect(q).toEqual({ ...EMPTY_QUERY, message: 'the redline' });
  });

  it('reads every operator, whatever its case', () => {
    const q = parseHistoryQuery(
      'Author:greg MESSAGE:docs commit:abc1234 File:src/main/git change:runGit'
    );
    expect(q).toEqual({
      message: 'docs',
      author: 'greg',
      commit: 'abc1234',
      commitIsBare: false,
      file: 'src/main/git',
      change: 'runGit'
    });
  });

  it('holds spaces inside quotes, and an unclosed quote runs to the end', () => {
    expect(parseHistoryQuery('author:"Greg Ceccarelli" fix').author).toBe('Greg Ceccarelli');
    expect(parseHistoryQuery('author:"Greg Ceccarelli" fix').message).toBe('fix');
    expect(parseHistoryQuery('"a phrase with spaces"').message).toBe('a phrase with spaces');
    expect(parseHistoryQuery('message:"unclosed to the end').message).toBe('unclosed to the end');
  });

  it('keeps a quote character that is not a pair as text', () => {
    expect(parseHistoryQuery('say "').message).toBe('say');
    expect(parseHistoryQuery('it"s').message).toBe('it"s');
  });

  it('keeps a value beginning with a dash as a value', () => {
    const q = parseHistoryQuery('author:-x message:--all file:-p change:-S');
    expect(q.author).toBe('-x');
    expect(q.message).toBe('--all');
    expect(q.file).toBe('-p');
    expect(q.change).toBe('-S');
    expect(parseHistoryQuery('--all').message).toBe('--all');
  });

  it('folds a line break to a space and never carries one into a value', () => {
    const q = parseHistoryQuery('fix\nthe\r\nwalk author:greg\n');
    expect(q.message).toBe('fix the walk');
    expect(q.author).toBe('greg');
    for (const v of Object.values(q)) {
      if (typeof v === 'string') expect(v).not.toMatch(/[\r\n]/);
    }
    // A trailing newline alone is nothing, not an empty pattern.
    expect(isEmptyQuery(parseHistoryQuery('\n'))).toBe(true);
  });

  it('keeps a colon inside a value', () => {
    expect(parseHistoryQuery('message:"a: b"').message).toBe('a: b');
    expect(parseHistoryQuery('file:src/x:y').file).toBe('src/x:y');
    // A word that is not an operator keeps its colon as text.
    expect(parseHistoryQuery('foo:bar').message).toBe('foo:bar');
    expect(parseHistoryQuery('https://example.invalid').message).toBe('https://example.invalid');
  });

  it('takes a bare hex word alone as a commit, and knows it was bare', () => {
    const q = parseHistoryQuery('1120c5a');
    expect(q.commit).toBe('1120c5a');
    expect(q.commitIsBare).toBe(true);
    expect(q.message).toBe('');
    expect(parseHistoryQuery('CAFEBABE').commit).toBe('CAFEBABE');
    // Three hex characters are a word; forty one are a word.
    expect(parseHistoryQuery('abc').message).toBe('abc');
    expect(parseHistoryQuery('a'.repeat(41)).message).toBe('a'.repeat(41));
    // Beside anything else it is a word.
    expect(parseHistoryQuery('1120c5a fix').message).toBe('1120c5a fix');
    expect(parseHistoryQuery('author:greg 1120c5a').message).toBe('1120c5a');
    // An explicit commit: is never bare.
    expect(parseHistoryQuery('commit:1120c5a').commitIsBare).toBe(false);
  });

  it('searches a bare sha nothing answered to as a word', () => {
    const q = bareCommitAsMessage(parseHistoryQuery('cafe'));
    expect(q).toEqual({ ...EMPTY_QUERY, message: 'cafe' });
  });

  it('treats an operator with nothing after it as nothing', () => {
    expect(isEmptyQuery(parseHistoryQuery('author:'))).toBe(true);
    expect(isEmptyQuery(parseHistoryQuery('author: message: file:'))).toBe(true);
    expect(isEmptyQuery(parseHistoryQuery('author:""'))).toBe(true);
    expect(isEmptyQuery(parseHistoryQuery(''))).toBe(true);
    expect(isEmptyQuery(parseHistoryQuery('   '))).toBe(true);
    expect(toSearch(parseHistoryQuery('author:'))).toBeUndefined();
  });

  it('lets the last of a repeated operator win and joins repeated messages', () => {
    const q = parseHistoryQuery('author:a author:b message:x message:y z');
    expect(q.author).toBe('b');
    expect(q.message).toBe('x y z');
  });
});

describe('the wire shape', () => {
  it('sends each field as the one string typed for it', () => {
    const q = parseHistoryQuery('author:"Greg [" fix file:src/*');
    expect(toSearch(q)).toEqual({ message: 'fix', author: 'Greg [', path: 'src/*' });
    expect(toSearch(parseHistoryQuery('change:-x'))).toEqual({ change: '-x' });
    expect(toSearch(parseHistoryQuery('commit:HEAD'))).toEqual({ commit: 'HEAD' });
  });

  it('takes the change out for a keystroke and leaves the rest', () => {
    const q = parseHistoryQuery('author:greg change:runGit');
    expect(withoutChange(q)).toEqual({ ...q, change: '' });
    const plain = parseHistoryQuery('fix');
    expect(withoutChange(plain)).toBe(plain);
  });

  it('compares queries by every field', () => {
    expect(sameQuery(parseHistoryQuery('a'), parseHistoryQuery('a'))).toBe(true);
    expect(sameQuery(parseHistoryQuery('a'), parseHistoryQuery('b'))).toBe(false);
    expect(sameQuery(parseHistoryQuery('cafe'), parseHistoryQuery('commit:cafe'))).toBe(false);
  });

  it('waits a round figure chosen from a measured keystroke', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(150);
  });
});
