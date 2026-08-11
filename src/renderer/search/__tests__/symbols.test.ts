/**
 * The palette's pure parts: what the prefix means, and which glyph a kind gets.
 *
 * The prefix grammar looks trivial until someone types `#` and then deletes
 * it, or pastes a name that happens to start with `@`. Those are the cases
 * pinned here, because getting them wrong silently changes the SCOPE of the
 * search and the user's only clue is that the answer is missing.
 */

import { describe, expect, it } from 'vitest';
import { parseSymbolQuery } from '../symbol-query';
import { symbolIcon, symbolKindLabel } from '../symbol-kinds';
import type { SymbolKind } from '@shared/symbols';

describe('parseSymbolQuery', () => {
  it('reads the mode off the prefix', () => {
    expect(parseSymbolQuery('@render', '#')).toEqual({
      mode: '@',
      term: 'render'
    });
    expect(parseSymbolQuery('#render', '@')).toEqual({
      mode: '#',
      term: 'render'
    });
  });

  it('treats a bare prefix as "everything in that scope"', () => {
    expect(parseSymbolQuery('@', '#')).toEqual({ mode: '@', term: '' });
    expect(parseSymbolQuery('#', '@')).toEqual({ mode: '#', term: '' });
  });

  it('falls back when the prefix has been deleted', () => {
    // Someone selected all and typed. The scope should not silently flip to
    // the other one just because the character is gone.
    expect(parseSymbolQuery('render', '@')).toEqual({
      mode: '@',
      term: 'render'
    });
    expect(parseSymbolQuery('render', '#')).toEqual({
      mode: '#',
      term: 'render'
    });
    expect(parseSymbolQuery('', '#')).toEqual({ mode: '#', term: '' });
  });

  it('only reads a prefix at the START', () => {
    // `@` inside a name is a character, not a mode switch.
    expect(parseSymbolQuery('foo@bar', '#')).toEqual({
      mode: '#',
      term: 'foo@bar'
    });
    expect(parseSymbolQuery('rgb#fff', '@')).toEqual({
      mode: '@',
      term: 'rgb#fff'
    });
  });

  it('trims the term but keeps the mode', () => {
    expect(parseSymbolQuery('@  render  ', '#')).toEqual({
      mode: '@',
      term: 'render'
    });
  });
});

describe('symbol kind → codicon', () => {
  const ALL: SymbolKind[] = [
    'function',
    'method',
    'class',
    'interface',
    'struct',
    'type',
    'enum',
    'enum-member',
    'constant',
    'variable',
    'field',
    'module',
    'macro',
    'property'
  ];

  it('maps every kind to a glyph and a word', () => {
    for (const kind of ALL) {
      expect(symbolIcon(kind), kind).toMatch(/^symbol-/);
      expect(symbolKindLabel(kind), kind).not.toBe('');
    }
  });

  it('uses symbol-method for functions', () => {
    // `symbol-function` DOES NOT EXIST in the codicon font — this is the trap
    // the research called out, and it renders as an empty box if you use it.
    expect(symbolIcon('function')).toBe('symbol-method');
    expect(symbolIcon('method')).toBe('symbol-method');
  });

  it('falls back rather than rendering nothing for an unknown kind', () => {
    expect(symbolIcon('nonsense' as SymbolKind)).toBe('symbol-misc');
    expect(symbolKindLabel('nonsense' as SymbolKind)).toBe('symbol');
  });
});
