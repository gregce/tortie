/**
 * PHASE 227, item 5. The undo journal, and the face sentence.
 *
 * The journal is per tab, in memory, a stack of (off, del, ins, generation).
 * Pinned here: push, peek, pop and depth; that popping to empty forgets the
 * tab; that two tabs are independent; and that the view draws the undo
 * sentence in the ed-note slot only while the focused tab has a rewind to
 * undo, with the chord the keymap prints. Undo's write itself is the app
 * run's (item 9); this is the state and the face.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { keyDisplay } from '@shared/keymap';

vi.mock('../MonacoHost', () => ({
  OpeningSkeleton: () => createElement('div', { className: 'ed-skeleton' })
}));
vi.mock('../live-text', () => ({
  useLiveTabText: (_id: string, saved: string) => saved
}));

const {
  recordRewind,
  lastRewind,
  popRewind,
  rewindJournalDepth,
  forgetRewindJournal
} = await import('../redline-journal');
const { RedlineDocument } = await import('../RedlineDocument');
const { NO_BASELINE, nextBaseline } = await import('../baseline');
type EditorTab = import('../tab-types').EditorTab;

afterEach(() => {
  forgetRewindJournal('t1');
  forgetRewindJournal('t2');
});

describe('the journal', () => {
  it('pushes, peeks the last, pops, and forgets a tab at empty', () => {
    expect(rewindJournalDepth('t1')).toBe(0);
    expect(lastRewind('t1')).toBeUndefined();
    recordRewind('t1', { off: 10, del: 'a', ins: 'b', generation: 2 });
    recordRewind('t1', { off: 30, del: 'c', ins: 'd', generation: 2 });
    expect(rewindJournalDepth('t1')).toBe(2);
    expect(lastRewind('t1')).toEqual({ off: 30, del: 'c', ins: 'd', generation: 2 });
    popRewind('t1');
    expect(rewindJournalDepth('t1')).toBe(1);
    expect(lastRewind('t1')).toEqual({ off: 10, del: 'a', ins: 'b', generation: 2 });
    popRewind('t1');
    expect(rewindJournalDepth('t1')).toBe(0);
    expect(lastRewind('t1')).toBeUndefined();
    popRewind('t1'); // popping empty is a no-op
    expect(rewindJournalDepth('t1')).toBe(0);
  });

  it('keeps two tabs independent', () => {
    recordRewind('t1', { off: 1, del: 'x', ins: 'y', generation: 1 });
    expect(rewindJournalDepth('t2')).toBe(0);
    recordRewind('t2', { off: 2, del: 'p', ins: 'q', generation: 1 });
    expect(rewindJournalDepth('t1')).toBe(1);
    expect(rewindJournalDepth('t2')).toBe(1);
  });
});

const OPENED = 'The quick brown fox.\n';
const WRITTEN = 'The quick red fox.\n';
const tab = (over: Partial<EditorTab> = {}): EditorTab =>
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
    savedContents: WRITTEN,
    headContents: OPENED,
    baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: OPENED }),
    ...over
  }) as Partial<EditorTab> as EditorTab;

const render = (t: EditorTab): string =>
  renderToStaticMarkup(createElement(RedlineDocument, { tab: t }));

describe('the face sentence', () => {
  it('is absent with nothing to undo', () => {
    const html = render(tab());
    expect(html).not.toContain('ed-redline-undo');
  });

  it('appears with the chord the keymap prints when the tab has a rewind to undo', () => {
    recordRewind('t1', { off: 10, del: 'brown', ins: 'red', generation: 1 });
    const html = render(tab());
    expect(html).toContain('ed-redline-undo');
    const chord = keyDisplay('redline.undo');
    expect(chord).toBe('⌥⇧⌫');
    expect(html).toContain(`Undo the last rewind with ${chord}. It lasts for this session.`);
  });

  it('is one short sentence and not a live region', () => {
    recordRewind('t1', { off: 10, del: 'brown', ins: 'red', generation: 1 });
    const html = render(tab());
    const m = html.match(/ed-redline-undo"><span class="banner-text">([^<]*)<\/span>/);
    expect(m).not.toBeNull();
    expect((m?.[1] ?? '').length).toBeLessThan(70);
    // The undo note carries no role, exactly like the since line.
    expect(html).not.toMatch(/ed-redline-undo" role=/);
  });
});
