/**
 * PHASE 238, items 4 and 5. The controls, the chord and the sentence.
 *
 * Four things are pinned, each written so it CAN fail.
 *
 *   1. THE HEADER IS DRAWN ONLY WHILE THERE IS SOMETHING TO ACCEPT, so a
 *      clean file's redline is still the resting face Phase 194 shipped with
 *      no furniture over it. The ablation is the same view over a file with a
 *      change, which must draw it.
 *   2. IT IS OUTSIDE `.ed-redline-doc` AND CARRIES `data-redline-tag`, which
 *      are the two things that keep a control out of the projection and off a
 *      person's clipboard (research 83 D.2 measured an untagged control
 *      putting its glyph into a copy mid-sentence). Both are read off the
 *      SHIPPING view's markup, and the second is driven through the same copy
 *      rule `p236-redline-chip.test.tsx` uses, with the tag removed as the
 *      ablation.
 *   3. ⌥↩ IS THE ACCEPT AND ⌥⇧↩ IS NOT, driven through the shipping
 *      `redlineCommandOf`, with every chord Phase 227 owns still answering
 *      exactly what it answered.
 *   4. THERE IS NO CHORD FOR ACCEPT ALL. The keymap holds `redline.accept`
 *      and holds nothing for accept-all, and this is asserted rather than
 *      assumed because it is the phase's whole answer to "a person must never
 *      be one keystroke from accepting everything".
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { KEYMAP, keyDisplay } from '@shared/keymap';

vi.mock('../MonacoHost', () => ({
  OpeningSkeleton: () => createElement('div', { className: 'ed-skeleton' })
}));
vi.mock('../live-text', () => ({
  useLiveTabText: (_id: string, saved: string) => saved
}));

const { RedlineDocument, redlineCommandOf } = await import('../RedlineDocument');
const { NO_BASELINE, nextBaseline } = await import('../baseline');
type EditorTab = import('../tab-types').EditorTab;

const OPENED = 'The quick brown fox.\n';
const WRITTEN = 'The quick red fox.\n';

const tabWith = (head: string, saved: string): EditorTab =>
  ({
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
    savedContents: saved,
    headContents: head,
    baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: head })
  }) as Partial<EditorTab> as EditorTab;

const markup = (head: string, saved: string): string =>
  renderToStaticMarkup(createElement(RedlineDocument, { tab: tabWith(head, saved) }));

// ---------------------------------------------------------------------------
// 1. The header, and only when there is something to accept.
// ---------------------------------------------------------------------------

describe('the redline draws its own header for the document verb', () => {
  it('draws Accept all when there is a change', () => {
    const html = markup(OPENED, WRITTEN);
    expect(html).toContain('ed-redline-bar');
    expect(html).toContain('Accept all');
  });

  it('AND THE ABLATION: an unchanged file draws no header and no button at all', () => {
    const html = markup(OPENED, OPENED);
    expect(html).not.toContain('ed-redline-bar');
    expect(html).not.toContain('Accept all');
    expect(html).not.toContain('<button');
  });

  it('says what it does, and what it costs, and never claims to write anything', () => {
    const html = markup(OPENED, WRITTEN);
    // PHASE 238's FIX ROUND added the second clause. The verifier recorded
    // that accept-all has no confirmation and no undo and that the face said
    // neither; both halves are here, behind hover, and both are true.
    expect(html).toContain(
      'Stop marking every change. The file is not touched, and there is no undo — only the marking goes.'
    );
    // It is on the title and NOT on the resting face, which is the house rule
    // for explanation: the button itself is still two words.
    const label = html.match(/<button[^>]*ed-redline-bar-button[^>]*>([^<]*)<\/button>/);
    expect(label?.[1]).toBe('Accept all');
    expect(html).not.toContain('>Stop marking every change');
  });
});

// ---------------------------------------------------------------------------
// 2. Outside the document, and off the clipboard.
// ---------------------------------------------------------------------------

describe('the header is outside the document and cannot reach a copy', () => {
  it('the document element holds only the runs, and names no bar', () => {
    const html = markup(OPENED, WRITTEN);
    const start = html.indexOf('<div class="ed-redline ed-redline-doc"');
    const inner = html.slice(start).replace(/^<div[^>]*>/, '');
    const body = inner.slice(0, inner.indexOf('</div>'));
    expect(body).not.toContain('ed-redline-bar');
    expect(body).not.toContain('Accept');
    // And the bar really is in the view, so this is not a vacuous scan.
    expect(html).toContain('ed-redline-bar');
  });

  it('carries the attribute the copy handler removes, and the ablation reaches the clipboard', () => {
    const html = markup(OPENED, WRITTEN);
    const bar = /<div class="ed-redline-bar"[^>]*>[\s\S]*?<\/div><\/div>/.exec(html)?.[0] ?? '';
    expect(bar).toContain('data-redline-tag=""');
    // ./redline-copy's rule, as p236 drives it: a clone with every
    // [data-redline-tag] element removed, read as text.
    const strip = (s: string): string =>
      s
        .replace(/<(del|span|div)[^>]*\sdata-redline-(?:del|tag)=""[^>]*>[\s\S]*?<\/\1>/g, '')
        .replace(/<[^>]+>/g, '');
    expect(strip(bar)).not.toContain('Accept all');
    expect(strip(bar.replace(' data-redline-tag=""', ''))).toContain('Accept all');
  });
});

// ---------------------------------------------------------------------------
// 3 and 4. The chord, and the one that deliberately does not exist.
// ---------------------------------------------------------------------------

const key = (over: Partial<Parameters<typeof redlineCommandOf>[0]>) =>
  redlineCommandOf({
    key: 'x',
    altKey: true,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    ...over
  });

describe('the chords', () => {
  it('⌥↩ is the accept, and the four Phase 227 owns are untouched', () => {
    expect(key({ key: 'Enter' })).toBe('accept');
    expect(key({ key: 'ArrowDown' })).toBe('next');
    expect(key({ key: 'ArrowUp' })).toBe('prev');
    expect(key({ key: 'Backspace' })).toBe('rewind');
    expect(key({ key: 'Backspace', shiftKey: true })).toBe('undo');
  });

  it('⌥⇧↩ is NOT an accept, so no shifted spelling reaches the verb by accident', () => {
    expect(key({ key: 'Enter', shiftKey: true })).toBeNull();
  });

  it('a bare Enter is typing and never an accept, and ⌘↩ is not ours either', () => {
    expect(key({ key: 'Enter', altKey: false })).toBeNull();
    expect(key({ key: 'Enter', metaKey: true })).toBeNull();
    expect(key({ key: 'Enter', ctrlKey: true })).toBeNull();
  });

  it('the keymap spells ⌥↩ and this file typed nothing by hand', () => {
    expect(keyDisplay('redline.accept')).toBe('⌥↩');
  });

  it('THERE IS NO CHORD FOR ACCEPT ALL, which is the phase’s answer to the danger', () => {
    const ids = KEYMAP.map((entry) => entry.id);
    expect(ids).toContain('redline.accept');
    expect(ids.filter((id) => /acceptAll|accept-all/i.test(id))).toEqual([]);
    // And nothing in the view answers a chord with it.
    for (const k of ['Enter', 'ArrowDown', 'ArrowUp', 'Backspace', 'a', 'A']) {
      for (const shift of [true, false]) {
        expect(key({ key: k, shiftKey: shift })).not.toBe('acceptAll');
      }
    }
  });
});
