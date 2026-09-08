/**
 * PHASE 225, the fix round. The view's one changed argument, pinned by a
 * render rather than by a function.
 *
 * The phase's whole visible change is one line in ../RedlineDocument.tsx:
 * the composer's left side is the tab's shadow baseline and not the HEAD
 * version. p225-shadow-baseline.test.ts pins `redlineBaseSide` as a
 * function, and the verifier showed that is not enough: with the compose
 * site put back to `tab.headContents ?? ''`, the parent's call, every test
 * in the battery stayed green and only an app run saw it. So this file
 * renders the SHIPPING view with `renderToStaticMarkup`, the way
 * p161-arch-map-drill.test.tsx renders its tab body, and takes the
 * projection property off the markup it produced: every top level child of
 * the document that is not an INS, concatenated, is the baseline byte for
 * byte, and every child that is not a DEL is the working text. Research 83
 * section 1 proved that property under node and D.1 took it off the live
 * DOM; `build/probe-p225-baseline.mjs` takes it inside the real EditorPanel
 * tree; this is the cheap pin that runs on every `npm test`.
 *
 * The shape that separates the two sides is the untracked file after its
 * first watcher tick: a `read` baseline holding the bytes at open, and a
 * HEAD answer of `''` (src/main/git/ipc.ts freezes null to ''). Composed
 * against HEAD, that tab draws the whole file as inserted and the non-INS
 * projection is empty; composed against the baseline it draws the change.
 *
 * It also pins `redlineWithoutHead`, which the mode chip offers Redline on
 * and the panel falls back on, because no test reached it either.
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Monaco does not run here. The skeleton is a marker element, and the live
// working text is the saved contents, which is what useLiveTabText answers
// when no model exists for the tab.
vi.mock('../MonacoHost', () => ({
  OpeningSkeleton: () => createElement('div', { className: 'ed-skeleton' })
}));
vi.mock('../live-text', () => ({
  useLiveTabText: (_id: string, saved: string) => saved
}));

const { RedlineDocument } = await import('../RedlineDocument');
const { NO_BASELINE, nextBaseline, redlineWithoutHead } = await import('../baseline');
type EditorTab = import('../tab-types').EditorTab;
type BaselineState = import('../baseline').BaselineState;

// Bytes that React escapes on the way out, so the unescape below is exercised
// rather than assumed: an ampersand, a quote, an apostrophe and a bracket.
const OPENED =
  'The quick brown fox jumped over the lazy dog & the "second" one.\n\n' +
  "It's a paragraph <with> a bracket, kept for a while so the body has weight.\n";
const WRITTEN = OPENED.replace('brown fox jumped', 'red fox leapt').replace(
  'kept for a while',
  'rewritten by an agent'
);

function tab(over: Partial<EditorTab>): EditorTab {
  return {
    id: 't1',
    path: '/repo/notes.txt',
    relPath: 'notes.txt',
    origRelPath: null,
    repoPath: '/repo',
    name: 'notes.txt',
    mode: 'redline',
    canDiff: false,
    commit: null,
    dirty: false,
    loading: false,
    savedContents: WRITTEN,
    headContents: '',
    ...over
  } as Partial<EditorTab> as EditorTab;
}

const readBaseline = (text: string): BaselineState =>
  nextBaseline(NO_BASELINE, { kind: 'read', contents: text });
const commitBaseline = (text: string): BaselineState =>
  nextBaseline(NO_BASELINE, { kind: 'head', contents: text });

const render = (t: EditorTab): string =>
  renderToStaticMarkup(createElement(RedlineDocument, { tab: t }));

const unescape = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * The top level children of the drawn document, read off the static markup.
 * RedlineRuns draws one flat element per run, being a span, a del or an ins,
 * and nothing nested, which research 83 D.1 measured on the live DOM.
 */
function runs(html: string): Array<{ kind: 'span' | 'del' | 'ins'; text: string }> {
  const start = html.indexOf('<div class="ed-redline ed-redline-doc" data-redline="">');
  if (start < 0) throw new Error('no document drawn');
  // The document's children are flat, so its first closing div is its own;
  // the baseline sentence below it is a span too and must not be read as a run.
  const inner = html.slice(start).replace(/^<div[^>]*>/, '');
  const wrapped = inner.slice(0, inner.indexOf('</div>'));
  // PHASE 227. Each change is wrapped in one `span.ed-redline-change`, so the
  // leaves are read: the wrapper's opening tag goes, and its closing tag is
  // the `</span>` that directly follows a `</del>` or `</ins>`, which a bare
  // run span never contains. The property is unchanged and read at the leaves.
  const body = wrapped
    .replace(/<span class="ed-redline-change"[^>]*>/g, '')
    .replace(/(<\/(?:del|ins)>)<\/span>/g, '$1');
  const out: Array<{ kind: 'span' | 'del' | 'ins'; text: string }> = [];
  const re = /<(span|del|ins)(?: [^>]*)?>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out.push({ kind: m[1] as 'span' | 'del' | 'ins', text: unescape(m[2] ?? '') });
  }
  return out;
}
const nonIns = (html: string): string =>
  runs(html).filter((r) => r.kind !== 'ins').map((r) => r.text).join('');
const nonDel = (html: string): string =>
  runs(html).filter((r) => r.kind !== 'del').map((r) => r.text).join('');
const since = (html: string): string | null => {
  const m = html.match(/ed-redline-since"><span class="banner-text">([^<]*)<\/span>/);
  return m === null ? null : unescape(m[1] ?? '');
};
const aria = (html: string): string | null => {
  const m = html.match(/aria-label="([^"]*)"/);
  return m === null ? null : unescape(m[1] ?? '');
};

describe('the projection property off the rendered view', () => {
  it('an untracked file after its first tick: the non-INS projection is the baseline, not HEAD', () => {
    const html = render(tab({ baseline: readBaseline(OPENED), headContents: '' }));
    expect(html).not.toContain('ed-skeleton');
    expect(runs(html).length).toBeGreaterThan(1);
    expect(nonIns(html)).toBe(OPENED);
    expect(nonDel(html)).toBe(WRITTEN);
    // The change is drawn as a change and not as the whole file inserted.
    const dels = runs(html).filter((r) => r.kind === 'del').map((r) => r.text);
    const inss = runs(html).filter((r) => r.kind === 'ins').map((r) => r.text);
    expect(dels.join('|')).toContain('brown');
    expect(inss.join('|')).toContain('rewritten by an agent');
    expect(inss.join('')).not.toBe(WRITTEN);
    expect(since(html)).toBe('Marked since you opened this file, for as long as this tab is open.');
    expect(aria(html)).toBe('Redline since you opened this file, notes.txt');
  });

  it('a committed file: the baseline is the HEAD version and the face names the commit', () => {
    const html = render(tab({ baseline: commitBaseline(OPENED), headContents: OPENED, canDiff: true }));
    expect(nonIns(html)).toBe(OPENED);
    expect(nonDel(html)).toBe(WRITTEN);
    expect(since(html)).toBe('Marked since the last commit, for as long as this tab is open.');
    expect(aria(html)).toBe('Redline since the last commit, notes.txt');
  });

  it('a dirty tab states the limit on its face and draws the buffer, not the disk', () => {
    const html = render(tab({ baseline: commitBaseline(OPENED), headContents: OPENED, dirty: true }));
    expect(nonIns(html)).toBe(OPENED);
    expect(nonDel(html)).toBe(WRITTEN);
    expect(since(html)).toBe(
      'Marked since the last commit, for as long as this tab is open. Not refreshed from disk while there are unsaved edits.'
    );
  });

  it('a clean file draws no change and no caps note, and the baseline line is not a live region', () => {
    const html = render(tab({ baseline: commitBaseline(WRITTEN), headContents: WRITTEN }));
    expect(runs(html).every((r) => r.kind === 'span')).toBe(true);
    expect(nonIns(html)).toBe(WRITTEN);
    expect(html).not.toContain('role="status"');
    expect(html).toContain('<div class="banner ed-note ed-redline-since"><span');
  });

  it('a tab with no baseline draws exactly what Phase 194 drew: against HEAD, with no baseline line', () => {
    const html = render(tab({ baseline: undefined, headContents: OPENED }));
    expect(nonIns(html)).toBe(OPENED);
    expect(nonDel(html)).toBe(WRITTEN);
    expect(since(html)).toBeNull();
    expect(aria(html)).toBe('Redline vs HEAD, notes.txt');
  });

  it('a history tab names its commit and holds no baseline line', () => {
    const html = render(
      tab({
        baseline: undefined,
        headContents: OPENED,
        commit: { sha: 'abcdef0123456789', shortSha: 'abcdef0' } as EditorTab['commit']
      })
    );
    expect(nonIns(html)).toBe(OPENED);
    expect(since(html)).toBeNull();
    expect(aria(html)).toBe('Redline vs commit abcdef0, notes.txt');
  });

  it('the skeleton waits for the first HEAD answer, baseline or not', () => {
    const html = render(tab({ baseline: readBaseline(OPENED), headContents: null }));
    expect(html).toContain('ed-skeleton');
    expect(html).not.toContain('ed-redline-doc');
  });
});

describe('redlineWithoutHead, which offers Redline and decides the fallback', () => {
  const seeded = readBaseline(OPENED);
  it('yes for a worktree tab inside its repository holding a baseline', () => {
    expect(redlineWithoutHead(tab({ baseline: seeded }))).toBe(true);
  });
  it('no for a tab that holds no baseline yet', () => {
    expect(redlineWithoutHead(tab({ baseline: undefined }))).toBe(false);
    expect(redlineWithoutHead(tab({ baseline: NO_BASELINE }))).toBe(false);
  });
  it('no for a history tab', () => {
    expect(
      redlineWithoutHead(
        tab({ baseline: seeded, commit: { sha: 'a', shortSha: 'a' } as EditorTab['commit'] })
      )
    ).toBe(false);
  });
  it('no for a review tab on a machine', () => {
    expect(
      redlineWithoutHead(
        tab({ baseline: seeded, remote: { machineId: 'm1' } as EditorTab['remote'] })
      )
    ).toBe(false);
  });
  it('no outside the repository', () => {
    expect(
      redlineWithoutHead(tab({ baseline: seeded, path: '/elsewhere/notes.txt' }))
    ).toBe(false);
  });
});
