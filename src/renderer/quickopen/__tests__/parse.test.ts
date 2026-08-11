/**
 * The ⌘P grammar. Every case here is one a user hits by typing normally and
 * that manual testing walks straight past — a colon inside a path, a line
 * number half-typed, a trailing colon mid-keystroke.
 */

import { describe, expect, it } from 'vitest';
import { parseQuickOpen } from '../parse';

describe('parseQuickOpen', () => {
  it('treats plain text as a path query', () => {
    expect(parseQuickOpen('open-file')).toEqual({
      mode: 'files',
      term: 'open-file'
    });
  });

  it('splits a trailing :line off the path', () => {
    expect(parseQuickOpen('store.ts:412')).toEqual({
      mode: 'files',
      term: 'store.ts',
      line: 412
    });
  });

  it('splits :line:column and makes the column 0-based', () => {
    expect(parseQuickOpen('store.ts:412:9')).toEqual({
      mode: 'files',
      term: 'store.ts',
      line: 412,
      column: 8
    });
  });

  it('addresses the OPEN editor for a bare :line', () => {
    expect(parseQuickOpen(':412')).toEqual({
      mode: 'goto-line',
      term: '',
      line: 412
    });
  });

  it('accepts a lone colon as the start of a go-to-line', () => {
    expect(parseQuickOpen(':')).toEqual({ mode: 'goto-line', term: '' });
  });

  it('keeps ranking while a line number is half-typed', () => {
    // `store.ts:` is one keystroke into ":412". Blanking the list here would
    // make typing a line number feel like the palette broke.
    expect(parseQuickOpen('store.ts:')).toEqual({
      mode: 'files',
      term: 'store.ts'
    });
  });

  it('does not mistake a colon INSIDE a path for a line number', () => {
    expect(parseQuickOpen('src/weird:name/file.ts')).toEqual({
      mode: 'files',
      term: 'src/weird:name/file.ts'
    });
  });

  it('reserves > for a command palette instead of searching for it', () => {
    expect(parseQuickOpen('>git')).toEqual({
      mode: 'reserved',
      term: '',
      prefix: '>'
    });
  });

  it('treats @ and # as ordinary filename characters', () => {
    // Quick open does not own symbol search; swallowing these with no
    // provider behind them would be worse than ranking them as text.
    expect(parseQuickOpen('@types/node').mode).toBe('files');
    expect(parseQuickOpen('#hash.ts').mode).toBe('files');
  });

  it('ignores surrounding whitespace', () => {
    expect(parseQuickOpen('  store.ts:12  ')).toEqual({
      mode: 'files',
      term: 'store.ts',
      line: 12
    });
  });

  it('never produces line 0', () => {
    expect(parseQuickOpen('a.ts:0').line).toBe(1);
  });
});
