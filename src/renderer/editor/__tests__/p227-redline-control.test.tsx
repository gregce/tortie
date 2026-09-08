/**
 * PHASE 227, item 2. The control, keyboard only.
 *
 * Research 83 D.3 judged four placements and this is the one that ships:
 * nothing drawn on the resting face, `tabindex="-1"` on each change, a
 * next and previous chord, one key to rewind the change under focus and one
 * to undo it. What is pinned here without a DOM: the key decoder answers the
 * four keymap chords and nothing else, the keymap carries the four entries
 * with the display glyphs the ⌘/ overlay shows and the menu actions the Edit
 * rows send, the commands leaf hands a command to the mounted view and
 * refuses when none is mounted, and the resting markup of the SHIPPING view
 * adds nothing but `tabindex="-1"` to item 1's wrapper: no button, no chip,
 * no text. Focus movement itself is the app run's, which drives real keys.
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { keymapEntry } from '@shared/keymap';

vi.mock('../MonacoHost', () => ({
  OpeningSkeleton: () => createElement('div', { className: 'ed-skeleton' })
}));
vi.mock('../live-text', () => ({
  useLiveTabText: (_id: string, saved: string) => saved
}));

const { RedlineDocument, redlineCommandOf } = await import('../RedlineDocument');
const { installRedlineCommands, runRedlineCommand } = await import('../redline-commands');
const { NO_BASELINE, nextBaseline } = await import('../baseline');
type EditorTab = import('../tab-types').EditorTab;

const key = (
  k: string,
  mods: Partial<{ altKey: boolean; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }> = {}
) => ({ key: k, altKey: false, shiftKey: false, metaKey: false, ctrlKey: false, ...mods });

describe('the key decoder', () => {
  it('answers the four chords', () => {
    expect(redlineCommandOf(key('ArrowDown', { altKey: true }))).toBe('next');
    expect(redlineCommandOf(key('ArrowUp', { altKey: true }))).toBe('prev');
    expect(redlineCommandOf(key('Backspace', { altKey: true }))).toBe('rewind');
    expect(redlineCommandOf(key('Backspace', { altKey: true, shiftKey: true }))).toBe('undo');
  });

  it('answers nothing for a bare key, a shifted arrow, or anything with ⌘ or ⌃', () => {
    expect(redlineCommandOf(key('ArrowDown'))).toBeNull();
    expect(redlineCommandOf(key('Backspace'))).toBeNull();
    expect(redlineCommandOf(key('ArrowDown', { altKey: true, shiftKey: true }))).toBeNull();
    expect(redlineCommandOf(key('ArrowDown', { altKey: true, metaKey: true }))).toBeNull();
    expect(redlineCommandOf(key('Backspace', { altKey: true, ctrlKey: true }))).toBeNull();
    expect(redlineCommandOf(key('Backspace', { metaKey: true }))).toBeNull();
    expect(redlineCommandOf(key('z', { metaKey: true }))).toBeNull();
    expect(redlineCommandOf(key('n'))).toBeNull();
  });
});

describe('the keymap entries', () => {
  it.each([
    ['redline.next', '⌥↓', 'redline-next'],
    ['redline.prev', '⌥↑', 'redline-prev'],
    ['redline.rewind', '⌥⌫', 'redline-rewind'],
    ['redline.undo', '⌥⇧⌫', 'redline-undo']
  ] as const)('%s renders as %s and mirrors %s', (id, display, menuAction) => {
    const entry = keymapEntry(id);
    expect(entry.keys[0]?.display).toBe(display);
    expect(entry.scope).toBe('editor');
    expect(entry.group).toBe('editor');
    expect(entry.assignable).toBe(false);
    expect(entry.menuAction).toBe(menuAction);
  });

  it('decodes exactly the chords the keymap prints, and no chord carries ⌘', () => {
    for (const id of ['redline.next', 'redline.prev', 'redline.rewind', 'redline.undo'] as const) {
      const accel = keymapEntry(id).keys[0]?.accelerator ?? '';
      const parts = accel.split('+');
      const k = parts[parts.length - 1] ?? '';
      const mods = new Set(parts.slice(0, -1));
      expect(mods.has('Cmd')).toBe(false);
      expect(mods.has('Ctrl')).toBe(false);
      const event = key(
        k === 'Down' ? 'ArrowDown' : k === 'Up' ? 'ArrowUp' : k,
        { altKey: mods.has('Alt'), shiftKey: mods.has('Shift') }
      );
      expect(redlineCommandOf(event)).toBe(id.slice('redline.'.length));
    }
  });
});

describe('the commands leaf', () => {
  it('refuses when no view is mounted, hands the command to the mounted one, and forgets it on unmount', () => {
    expect(runRedlineCommand('next')).toBe(false);
    const seen: string[] = [];
    const uninstall = installRedlineCommands((c) => seen.push(c));
    expect(runRedlineCommand('next')).toBe(true);
    expect(runRedlineCommand('rewind')).toBe(true);
    expect(seen).toEqual(['next', 'rewind']);
    uninstall();
    expect(runRedlineCommand('undo')).toBe(false);
    expect(seen).toEqual(['next', 'rewind']);
  });

  it('an old uninstall does not remove a newer handler', () => {
    const a = installRedlineCommands(() => undefined);
    const seen: string[] = [];
    installRedlineCommands((c) => seen.push(c));
    a();
    expect(runRedlineCommand('prev')).toBe(true);
    expect(seen).toEqual(['prev']);
  });
});

describe('the resting face', () => {
  const OPENED = 'The quick brown fox.\n';
  const WRITTEN = 'The quick red fox.\n';
  const tab = {
    id: 't1',
    path: '/repo/notes.txt',
    relPath: 'notes.txt',
    origRelPath: null,
    repoPath: '/repo',
    name: 'notes.txt',
    mode: 'redline',
    canDiff: true,
    commit: null,
    dirty: false,
    loading: false,
    savedContents: WRITTEN,
    headContents: OPENED,
    baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: OPENED })
  } as Partial<EditorTab> as EditorTab;

  it('draws the wrapper with tabindex -1 and nothing else: no button, no chip, no control text', () => {
    const html = renderToStaticMarkup(createElement(RedlineDocument, { tab }));
    // PHASE 237 gave this element `contentEditable` and `spellCheck`, so it
    // is found by its class rather than by the whole of what it was.
    const start = html.indexOf('<div class="ed-redline ed-redline-doc"');
    const inner = html.slice(start).replace(/^<div[^>]*>/, '');
    const body = inner.slice(0, inner.indexOf('</div>'));
    expect(body).toBe(
      '<span>The quick </span>' +
        '<span class="ed-redline-change" tabindex="-1" role="group" aria-label="Change 1 of 1" data-change="0" data-change-off="10" data-change-del="brown" data-change-ins="red" data-change-gen="1">' +
        // PHASE 237: the deletion is an atomic island the caret steps over.
        '<del data-redline-del="" contentEditable="false">brown</del><ins data-redline-ins="">red</ins></span>' +
        '<span> fox.\n</span>'
    );
    expect(html).not.toContain('<button');
    expect(html).not.toContain('Rewind');
  });
});
