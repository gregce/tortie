/**
 * PHASE 227, item 1. One element per change, and the projection unchanged.
 *
 * Research 83 D.1 measured the flat DOM Phase 194 drew: one element per run
 * and NO element that means "this change". The view now wraps each change,
 * being B.2's unit, in one `span.ed-redline-change` carrying the change's
 * identity as data attributes. Two things are pinned here by a render of the
 * SHIPPING view, the way p225-redline-projection.test.tsx pins the compose
 * site: the wrappers are exactly the groups `changesOf` answers, attribute
 * for attribute, and the projection property read at the leaves is what it
 * was, non-INS text the baseline and non-DEL text the working text, byte for
 * byte. The copy handler is pinned by name: no wrapper carries an attribute
 * the clone removes.
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../MonacoHost', () => ({
  OpeningSkeleton: () => createElement('div', { className: 'ed-skeleton' })
}));
vi.mock('../live-text', () => ({
  useLiveTabText: (_id: string, saved: string) => saved
}));

const { RedlineDocument } = await import('../RedlineDocument');
const { NO_BASELINE, nextBaseline } = await import('../baseline');
const { changesOf } = await import('../rewind');
const { composeRedlineDocument } = await import('../redline-document');
type EditorTab = import('../tab-types').EditorTab;

// Research 83 B.1, the real paragraph, 477 and 464 bytes.
const BASELINE =
  'Tortie keeps every session alive in a private tmux server, so closing the window is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running, draws it, and gets out of the way. When you come back the agent still knows what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be reconstructed from memory.\n';
const CURRENT =
  'Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a throwaway viewer: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.\n';

function tab(over: Partial<EditorTab>): EditorTab {
  return {
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
    savedContents: CURRENT,
    headContents: BASELINE,
    baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: BASELINE }),
    ...over
  } as Partial<EditorTab> as EditorTab;
}

const render = (t: EditorTab): string =>
  renderToStaticMarkup(createElement(RedlineDocument, { tab: t }));

const unescape = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** The document's markup, from its opening tag to its own closing tag. */
function documentOf(html: string): string {
  // PHASE 237 gave this element `contentEditable` and `spellCheck`, so it is
  // found by its class rather than by the whole of what it was.
  const start = html.indexOf('<div class="ed-redline ed-redline-doc"');
  if (start < 0) throw new Error('no document drawn');
  const inner = html.slice(start).replace(/^<div[^>]*>/, '');
  return inner.slice(0, inner.indexOf('</div>'));
}

/** Every wrapper, with its attributes and the runs inside it. */
function wrappers(body: string): Array<{
  attrs: Record<string, string>;
  inner: Array<{ kind: 'del' | 'ins'; text: string }>;
}> {
  const out: Array<{ attrs: Record<string, string>; inner: Array<{ kind: 'del' | 'ins'; text: string }> }> = [];
  // A wrapper ends at the first `</span>` that follows a `</del>` or `</ins>`:
  // it holds no bare span, and a bare span holds no del or ins.
  const re = /<span class="ed-redline-change"([^>]*)>([\s\S]*?<\/(?:del|ins)>)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const attrs: Record<string, string> = {};
    const attrRe = /\s([a-z-]+)="([^"]*)"/g;
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(m[1] ?? '')) !== null) attrs[a[1] ?? ''] = unescape(a[2] ?? '');
    const inner: Array<{ kind: 'del' | 'ins'; text: string }> = [];
    const runRe = /<(del|ins)(?: [^>]*)?>([\s\S]*?)<\/\1>/g;
    let r: RegExpExecArray | null;
    while ((r = runRe.exec(m[2] ?? '')) !== null) {
      inner.push({ kind: r[1] as 'del' | 'ins', text: unescape(r[2] ?? '') });
    }
    out.push({ attrs, inner });
  }
  return out;
}

/** The leaves, wrappers walked into, as p225's parser reads them. */
function leaves(body: string): Array<{ kind: 'span' | 'del' | 'ins'; text: string }> {
  const flat = body
    .replace(/<span class="ed-redline-change"[^>]*>/g, '')
    .replace(/(<\/(?:del|ins)>)<\/span>/g, '$1');
  const out: Array<{ kind: 'span' | 'del' | 'ins'; text: string }> = [];
  const re = /<(span|del|ins)(?: [^>]*)?>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat)) !== null) {
    out.push({ kind: m[1] as 'span' | 'del' | 'ins', text: unescape(m[2] ?? '') });
  }
  return out;
}

describe('one wrapper per change, carrying the identity', () => {
  const html = render(tab({}));
  const body = documentOf(html);
  const drawn = wrappers(body);
  const doc = composeRedlineDocument(BASELINE, CURRENT);
  const changes = changesOf(doc.runs);

  it('draws exactly the eight changes research 83 B.2 counted, in order', () => {
    expect(changes.length).toBe(8);
    expect(drawn.length).toBe(8);
    expect(changes.map((c) => c.off)).toEqual([7, 27, 62, 74, 183, 244, 322, 450]);
  });

  it('every wrapper carries the offset, the deleted text, the inserted text and the generation', () => {
    drawn.forEach((w, n) => {
      const c = changes[n];
      if (c === undefined) throw new Error('missing change');
      expect(w.attrs['data-change']).toBe(String(n));
      expect(w.attrs['data-change-off']).toBe(String(c.off));
      expect(w.attrs['data-change-del']).toBe(c.del);
      expect(w.attrs['data-change-ins']).toBe(c.ins);
      expect(w.attrs['data-change-gen']).toBe('1');
      expect(w.attrs['role']).toBe('group');
      expect(w.attrs['aria-label']).toBe(`Change ${String(n + 1)} of 8`);
    });
  });

  it('holds exactly its own runs and nothing else', () => {
    drawn.forEach((w, n) => {
      const c = changes[n];
      if (c === undefined) throw new Error('missing change');
      const want = c.runs.map((k) => doc.runs[k]).map((r) => ({ kind: r?.kind, text: r?.text }));
      expect(w.inner).toEqual(want);
    });
  });

  it('carries no attribute the copy handler removes and is not a data-redline element', () => {
    for (const w of drawn) {
      for (const name of Object.keys(w.attrs)) {
        expect(name.startsWith('data-redline')).toBe(false);
      }
      expect(w.attrs['data-redline']).toBeUndefined();
    }
    // One data-redline element for the whole document, as Phase 197's
    // containment rule requires.
    expect((html.match(/ data-redline=""/g) ?? []).length).toBe(1);
  });

  it('is drawn with nothing else added: no button, no chip, no control text', () => {
    expect(body).not.toContain('<button');
    expect(body).not.toContain('data-redline-tag');
    // A wrapper is the only element kind added; every other element is a run.
    const tags = [...body.matchAll(/<([a-z]+)[\s>]/g)].map((m) => m[1]);
    expect(new Set(tags)).toEqual(new Set(['span', 'del', 'ins']));
  });
});

describe('the projection property, read at the leaves', () => {
  it('non-INS leaves are the baseline and non-DEL leaves the working text, byte for byte', () => {
    const body = documentOf(render(tab({})));
    const flat = leaves(body);
    expect(flat.filter((r) => r.kind !== 'ins').map((r) => r.text).join('')).toBe(BASELINE);
    expect(flat.filter((r) => r.kind !== 'del').map((r) => r.text).join('')).toBe(CURRENT);
    // And the leaves are the composed runs one for one.
    const doc = composeRedlineDocument(BASELINE, CURRENT);
    expect(flat.map((r) => (r.kind === 'span' ? 'same' : r.kind))).toEqual(doc.runs.map((r) => r.kind));
  });

  it('a clean file draws no wrapper at all', () => {
    const body = documentOf(render(tab({ savedContents: BASELINE })));
    expect(wrappers(body).length).toBe(0);
    expect(body).not.toContain('ed-redline-change');
  });

  it('a lone insertion and a lone deletion each get their own wrapper (ruling 6)', () => {
    const doc = composeRedlineDocument(BASELINE, CURRENT);
    const changes = changesOf(doc.runs);
    const lone = changes.filter((c) => c.del === '' || c.ins === '');
    expect(lone.map((c) => [c.del, c.ins])).toEqual([[', draws it,', ''], ['', 'exactly ']]);
  });
});

describe('changesOf, the grouping', () => {
  it('groups adjacent non-same runs and advances the offset by same and del text only', () => {
    const runs = [
      { kind: 'same' as const, text: 'ab' },
      { kind: 'del' as const, text: 'c' },
      { kind: 'ins' as const, text: 'XY' },
      { kind: 'same' as const, text: 'd' },
      { kind: 'ins' as const, text: 'Z' },
      { kind: 'same' as const, text: 'e' },
      { kind: 'del' as const, text: 'f' }
    ];
    expect(changesOf(runs)).toEqual([
      { off: 2, del: 'c', ins: 'XY', runs: [1, 2] },
      { off: 4, del: '', ins: 'Z', runs: [4] },
      { off: 5, del: 'f', ins: '', runs: [6] }
    ]);
  });

  it('answers nothing for no runs and for one plain run', () => {
    expect(changesOf([])).toEqual([]);
    expect(changesOf([{ kind: 'same', text: 'x' }])).toEqual([]);
  });

  it('offsets are strictly increasing across a draw', () => {
    const doc = composeRedlineDocument(BASELINE, CURRENT);
    const offs = changesOf(doc.runs).map((c) => c.off);
    for (let i = 1; i < offs.length; i++) expect(offs[i]).toBeGreaterThan(offs[i - 1] ?? -1);
  });
});
