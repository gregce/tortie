/**
 * Phase 153. The menu glyph set, and what it does where there is no browser.
 *
 * The set's correctness against the font is `build/assert-menu-glyphs.mjs`,
 * which reads the shipped stylesheet and is what caught three names bound to
 * one codepoint. What is checked here is the other half: that a builder asking
 * for a mark in a place with no document and no canvas gets nothing back and
 * composes exactly the row it composed before, because that is the promise
 * every menu builder in the app is now relying on.
 */

import { describe, expect, it } from 'vitest';
import { MENU_CODICONS, menuGlyph, warmMenuIcons } from '../codicon-menu-icon';
import { buildTreeMenu } from '../../tree/tree-menu';

describe('the menu glyph set', () => {
  it('is a closed set, in alphabetical order, with no name twice', () => {
    const names = [...MENU_CODICONS];
    expect(names).toEqual([...names].sort());
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThan(0);
  });

  it('every name is a codicon id and never a class name', () => {
    for (const name of MENU_CODICONS) {
      expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(name.startsWith('codicon-')).toBe(false);
    }
  });
});

describe('with no document and no canvas', () => {
  it('warming resolves rather than throwing', async () => {
    await expect(warmMenuIcons()).resolves.toBeUndefined();
  });

  it('asks for a mark and gets no key at all, never an empty one', () => {
    const props = menuGlyph('copy');
    expect(props).toEqual({});
    expect('icon' in props).toBe(false);
  });

  it('leaves a real menu exactly the shape it had before', () => {
    const rows = buildTreeMenu(
      {
        canonical: 'src/one.ts',
        selection: ['src/one.ts'],
        destDir: 'src',
        openable: true
      },
      { mutate: true, duplicate: true, reveal: true },
      {
        open: () => {},
        history: () => {},
        newEntry: () => {},
        rename: () => {},
        duplicate: () => {},
        reveal: () => {},
        copyPaths: () => {},
        trash: () => {}
      }
    );
    const items = rows.filter(
      (one): one is Exclude<typeof one, 'sep'> => one !== 'sep'
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.icon).toBeUndefined();
    expect(items.map((one) => one.label)).toContain('Move to Trash');
  });
});
