/**
 * PHASE 236. The chip is a control on the face, and it costs the document
 * nothing.
 *
 * The operator used the rewind for the first time on 2026-09-08 and could not
 * find the keys, because Phase 227 shipped four chords and nothing on the face
 * said them. This file pins the four things that make the answer safe, each
 * one written so it CAN fail: an assertion whose ablation is only imagined is
 * not a check, so every rule below is driven a second time against the shape
 * the phase refused, and that second reading must come out the other way.
 *
 *   1. THE CHIP DRAWS FOR THE FOCUSED CHANGE AND NOT OTHERWISE. Focus wins
 *      over the pointer, and with neither there is no chip: the resting face is
 *      byte for byte the markup Phase 227 shipped, which is the string
 *      p227-redline-control.test.tsx pins and this file pins again through the
 *      SHIPPING view.
 *   2. IT CARRIES `data-redline-tag`, which is the attribute ./redline-copy
 *      removes from its clone. Research 83 D.2 measured an untagged control
 *      putting its own glyph into a person's clipboard mid-sentence.
 *   3. THE PROJECTION AND THE COPY ANSWER ARE UNCHANGED WITH IT MOUNTED, which
 *      is what "the chip lives outside `.ed-redline-doc`" means in numbers. The
 *      ablation is the same chip spliced INSIDE the document, and it must break
 *      both readings.
 *   3a. AND IT IS SCANNED IN THE SOURCE TOO, because rules 2 and 3 are driven
 *      by splicing a string and neither can see a later round MOVING the chip
 *      into the document: nothing renders a chip under `renderToStaticMarkup`,
 *      since the resting face has no anchor. So the shipping view's own JSX is
 *      read and the document element's body must not name the chip.
 *   4. THE ANCHOR IS THE FIRST CLIENT RECT, never the bounding box, driven over
 *      the real rectangles research 96 §4.3 measured on the running app. The
 *      ablation is the union rect, and it lands 435.73px away.
 *
 * WHAT THIS FILE CANNOT DO, stated rather than hidden: this repository carries
 * no jsdom, so nothing here hovers, focuses or copies for real. The pointer and
 * focus wiring, the live `Range` copy and the drawn rectangle are the app run's,
 * and the parent readings they are compared against are in research 96 §4.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { keyDisplay } from '@shared/keymap';

vi.mock('../MonacoHost', () => ({
  OpeningSkeleton: () => createElement('div', { className: 'ed-skeleton' })
}));
vi.mock('../live-text', () => ({
  useLiveTabText: (_id: string, saved: string) => saved
}));

const { RedlineDocument, chipAnchorFor } = await import('../RedlineDocument');
const { RedlineChip, chipAnchorRect, chipPlace } = await import('../redline-chip');
const { NO_BASELINE, nextBaseline } = await import('../baseline');
type EditorTab = import('../tab-types').EditorTab;
type ChipRect = import('../redline-chip').ChipRect;

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

/** The document element's own markup, from its opening tag to its close. */
function documentOf(html: string): string {
  // PHASE 237 gave the document element two attributes of its own,
  // `contentEditable="plaintext-only"` and `spellCheck="false"`, so the open
  // tag is matched by its class and not by the whole of what it was.
  const start = html.indexOf('<div class="ed-redline ed-redline-doc"');
  if (start < 0) throw new Error('no document drawn');
  const inner = html.slice(start).replace(/^<div[^>]*>/, '');
  return inner.slice(0, inner.indexOf('</div>'));
}

const unescape = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * The document's leaves, exactly as `redline-shot-probe.ts`'s `leavesOf` reads
 * them on the live DOM: the change wrappers are walked INTO and every other
 * element is a leaf. Anything a later round put inside the document therefore
 * shows up here as a run, which is the whole point.
 */
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

/**
 * What a copy of the whole document yields, by ./redline-copy's own two rules:
 * a Range clipped to the ONE `data-redline` element, cloned, with every
 * `[data-redline-del]` and `[data-redline-tag]` element removed, then read as
 * text. Written here as a string operation because there is no DOM.
 */
function copyAnswer(body: string): string {
  const stripped = body
    .replace(/<(del|span|div)[^>]*\sdata-redline-(?:del|tag)=""[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, '');
  return unescape(stripped);
}

/**
 * The chip's own markup, as the shipping component draws it.
 *
 * PHASE 239 TOOK THE `canUndo` PROP OFF IT, because undo of a rewind is the
 * TAB's verb and not the change's: research 99 section 7.1 drove the chip's
 * own Undo acting on a phrase eight paragraphs from the one it was drawn
 * beside. `p239-anchored-controls` pins where it went.
 */
function chipMarkup(): string {
  const anchor = { getClientRects: () => [] } as unknown as HTMLElement;
  return renderToStaticMarkup(
    createElement(RedlineChip, {
      anchor,
      page: null,
      scroll: null,
      onCommand: () => undefined,
      chipRef: { current: null },
      onDetached: () => undefined,
      // PHASE 239'S COMMITTER'S ROUND. The placement token; nothing here lays
      // anything out, so any value draws the same markup.
      placement: 0
    })
  );
}

// ---------------------------------------------------------------------------
// 1. Drawn for the focused change and not otherwise.
// ---------------------------------------------------------------------------

describe('the chip draws for the change you are on, and for nothing else', () => {
  it('draws nothing with nothing focused and nothing hovered', () => {
    expect(chipAnchorFor(null, null)).toBeNull();
    expect(
      renderToStaticMarkup(
        createElement(RedlineChip, {
          anchor: null,
          page: null,
          scroll: null,
          onCommand: () => undefined,
          chipRef: { current: null },
          onDetached: () => undefined,
          placement: 0
        })
      )
    ).toBe('');
  });

  it('draws for the anchor when there is one', () => {
    expect(chipMarkup()).toContain('class="ed-redline-chip"');
  });

  it('FOCUS WINS over the pointer, so the chip names the change the keys act on', () => {
    const focused = { id: 'focused' } as unknown as HTMLElement;
    const hovered = { id: 'hovered' } as unknown as HTMLElement;
    expect(chipAnchorFor(focused, hovered)).toBe(focused);
    // And the ablation: the other order would name the change ⌥⌫ does not act
    // on, which is the reading this rule exists to refuse.
    expect(chipAnchorFor(focused, hovered)).not.toBe(hovered);
    // With nothing focused the pointer is the whole affordance.
    expect(chipAnchorFor(null, hovered)).toBe(hovered);
  });

  it('the resting face of the SHIPPING view is what Phase 227 drew, plus the island', () => {
    const html = renderToStaticMarkup(createElement(RedlineDocument, { tab }));
    // PHASE 237. One attribute moved in this markup and it is the deletion's
    // `contenteditable="false"`, which is what makes a deletion an atomic
    // island the caret steps over in one press. Everything else, being the
    // wrapper, its identity, its generation and the runs at the leaves, is
    // byte for byte what Phase 227 drew.
    expect(documentOf(html)).toBe(
      '<span>The quick </span>' +
        '<span class="ed-redline-change" tabindex="-1" role="group" aria-label="Change 1 of 1" data-change="0" data-change-off="10" data-change-del="brown" data-change-ins="red" data-change-gen="1">' +
        '<del data-redline-del="" contentEditable="false">brown</del><ins data-redline-ins="">red</ins></span>' +
        '<span> fox.\n</span>'
    );
    expect(html).not.toContain('ed-redline-chip');
    // PHASE 238. The resting face draws no CHANGE control, which is what this
    // pin is for; the one button on it is the document verb in the redline's
    // own header, which is not drawn on a change and does not move with one.
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBe(1);
    expect(buttons[0]).toContain('ed-redline-bar-button');
  });

  it('and the document itself is the editable, in plain text only', () => {
    const html = renderToStaticMarkup(createElement(RedlineDocument, { tab }));
    expect(html).toContain(
      '<div class="ed-redline ed-redline-doc" data-redline="" contentEditable="plaintext-only" spellCheck="false">'
    );
  });

  it('never takes focus, or the press would do nothing and the arrows would jump to the top', () => {
    const html = chipMarkup();
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    // PHASE 239 left three, Undo having gone to the note row; PHASE 238's
    // Accept makes four: prev, next, Rewind, Accept.
    expect(buttons.length).toBe(4);
    for (const button of buttons) expect(button).toContain('tabindex="-1"');
  });

  it('PHASE 239: it does NOT offer Undo, whatever the journal holds', () => {
    // The chip is the CHANGE's toolbar and undo of a rewind is the TAB's.
    // Research 99 section 7.1 drove the old button: pressed beside
    // `changes`→`changed`, it restored `keeps`→`holds` eight paragraphs away.
    expect(chipMarkup()).not.toContain('Undo');
    expect(chipMarkup()).not.toContain(keyDisplay('redline.undo'));
  });

  it('PHASE 238: offers Accept beside Rewind, always, because every change has one', () => {
    // A drawn change is by definition a change there is something to accept,
    // so Accept is never conditional the way the note row's Undo is.
    expect(chipMarkup()).toContain('Accept');
    // And it is AFTER Rewind, so the verb a person already knows the place of
    // did not move.
    const html = chipMarkup();
    expect(html.indexOf('Rewind')).toBeLessThan(html.indexOf('Accept'));
  });

  it('carries the four chords the keymap owns and nothing typed by hand', () => {
    const html = chipMarkup();
    for (const id of [
      'redline.prev',
      'redline.next',
      'redline.rewind',
      'redline.accept'
    ] as const) {
      expect(html, id).toContain(`<span class="key">${keyDisplay(id)}</span>`);
    }
    expect(html).toContain('⌥↓');
    expect(html).toContain('⌥⌫');
    expect(html).toContain('⌥↩');
  });
});

// ---------------------------------------------------------------------------
// 2. The tag that keeps it off the clipboard.
// ---------------------------------------------------------------------------

describe('the chip carries the attribute the copy handler removes', () => {
  it('is a data-redline-tag element', () => {
    expect(chipMarkup()).toContain('data-redline-tag=""');
  });

  it('is NOT a data-redline element, which would be a second document', () => {
    const html = renderToStaticMarkup(createElement(RedlineDocument, { tab }));
    expect((html.match(/ data-redline=""/g) ?? []).length).toBe(1);
    expect((chipMarkup().match(/ data-redline=""/g) ?? []).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. The projection and the copy answer, with the chip mounted.
// ---------------------------------------------------------------------------

describe('the projection and the copy are unchanged with the chip mounted', () => {
  const html = renderToStaticMarkup(createElement(RedlineDocument, { tab }));
  const bare = documentOf(html);
  const chip = chipMarkup();
  /** The chip where the view really puts it: OUTSIDE the document. */
  const outside = bare;
  /** The ablation: the same chip INSIDE the document, which is refused. */
  const inside = bare + chip;

  it('the document is byte identical whether or not a chip is drawn beside it', () => {
    expect(outside).toBe(bare);
    expect(inside).not.toBe(bare);
  });

  it('non-INS leaves are the baseline and non-DEL leaves the working text', () => {
    const flat = leaves(outside);
    expect(flat.filter((r) => r.kind !== 'ins').map((r) => r.text).join('')).toBe(OPENED);
    expect(flat.filter((r) => r.kind !== 'del').map((r) => r.text).join('')).toBe(WRITTEN);
  });

  it('AND THE ABLATION: a chip inside the document breaks both projections', () => {
    const flat = leaves(inside);
    expect(flat.filter((r) => r.kind !== 'ins').map((r) => r.text).join('')).not.toBe(OPENED);
    expect(flat.filter((r) => r.kind !== 'del').map((r) => r.text).join('')).not.toBe(WRITTEN);
  });

  it('a copy of the document is the working file, chip or no chip', () => {
    expect(copyAnswer(bare)).toBe(WRITTEN);
    expect(copyAnswer(outside)).toBe(WRITTEN);
    // Inside the document the chip is still skipped, BECAUSE of its tag: that
    // is what data-redline-tag buys and it is the only thing that does.
    expect(copyAnswer(inside)).toBe(WRITTEN);
  });

  it('AND THE ABLATION: the same chip with its tag removed reaches the clipboard', () => {
    const untagged = bare + chip.replace(' data-redline-tag=""', '');
    expect(copyAnswer(untagged)).not.toBe(WRITTEN);
    expect(copyAnswer(untagged)).toContain('Rewind');
  });
});

// ---------------------------------------------------------------------------
// 4. The anchor is the FIRST client rect, over research 96 §4.3's own numbers.
// ---------------------------------------------------------------------------

describe('the anchor is the first client rect and never the bounding box', () => {
  const rect = (
    left: number,
    top: number,
    width: number,
    height: number
  ): ChipRect => ({ left, top, bottom: top + height, width, height });

  /** The view's box in the wide reading of research 96 §1.4.
   *
   * PHASE 251 GAVE `chipPlace` A PAGE AND A SCROLLER, and this fixture hands
   * it the same box for both on purpose: the free canvas beside the page is
   * then exactly 0.00px, so every reading below is the OVERLAY arm, which is
   * the arm research 96 measured and the arm these numbers are about. The
   * band arm is `p251-redline-controls.test.ts`'s. */
  const view = rect(569, 110, 871, 775);
  /** Change 12, wide: three rects over two line boxes (research 96 §4.3). */
  const first = rect(1185.82, 433.23, 44.7, 15);
  const union = rect(750.09, 433.23, 480.43, 36.45);
  const size = { width: 200, height: 28 };

  it('reads rects[0] off the element and never asks for its bounding box', () => {
    const calls: string[] = [];
    const el = {
      getClientRects: () => {
        calls.push('getClientRects');
        return [first, rect(0, 433.23, 10, 15), rect(750.09, 454.68, 20, 15)];
      },
      getBoundingClientRect: () => {
        calls.push('getBoundingClientRect');
        return union;
      }
    };
    expect(chipAnchorRect(el)).toBe(first);
    expect(calls).toEqual(['getClientRects']);
  });

  it('answers nothing for an element with no rects, which is a detached anchor', () => {
    expect(chipAnchorRect({ getClientRects: () => [] })).toBeUndefined();
  });

  it('places the chip where the change STARTS: 616.82px into the view', () => {
    expect(chipPlace(first, view, view, size).left).toBeCloseTo(616.82, 2);
  });

  it('AND THE ABLATION: the bounding box puts it 435.73px away, in empty margin', () => {
    const wrong = chipPlace(union, view, view, size).left;
    expect(wrong).toBeCloseTo(181.09, 2);
    expect(chipPlace(first, view, view, size).left - wrong).toBeCloseTo(435.73, 2);
  });

  it('is above the line when there is room and below it when there is not', () => {
    // 433.23 − 110 − 28 − 4 = 291.23, which is room.
    expect(chipPlace(first, view, view, size).top).toBeCloseTo(291.23, 2);
    // A change on the view's own first line has none, so the chip drops below
    // it rather than being clamped on top of the words.
    // 112 − 110 − 28 − 4 = −30, so it goes below: 127 − 110 + 4 = 21.
    const topLine = rect(700, 112, 40, 15);
    expect(chipPlace(topLine, view, view, size).top).toBeCloseTo(21, 2);
  });

  it('clamps itself to the view, because the scroller neither scrolls nor clips it', () => {
    const farRight = rect(1430, 433.23, 8, 15);
    expect(chipPlace(farRight, view, view, size).left).toBeCloseTo(671, 2);
    const farLeft = rect(500, 433.23, 8, 15);
    expect(chipPlace(farLeft, view, view, size).left).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3a. Where the chip is MOUNTED, read from the shipping source.
//
// Rules 2 and 3 above splice markup, and no render can catch a later round
// moving the chip inside the document, because SSR has no focus and no pointer
// so the resting face draws no chip at all. This reads the view's own JSX.
// ---------------------------------------------------------------------------

/**
 * The body of the `.ed-redline-doc` element in a JSX source, by indentation:
 * its closing tag is the first line that is exactly the opening line's indent
 * followed by `</div>`. Proved on fixtures below, so a scan that cannot fail is
 * never mistaken for a scan that passed.
 */
function documentElementBody(source: string): string {
  const lines = source.split('\n');
  const open = lines.findIndex((line) => line.includes('ed-redline ed-redline-doc'));
  if (open === -1) throw new Error('no document element in the source');
  const indent = /^\s*/.exec(lines[open] ?? '')?.[0] ?? '';
  const close = lines.findIndex(
    (line, at) => at > open && line === `${indent}</div>`
  );
  if (close === -1) throw new Error('the document element does not close');
  return lines.slice(open + 1, close).join('\n');
}

describe('the chip is mounted outside the document element', () => {
  const source = readFileSync(
    new URL('../RedlineDocument.tsx', import.meta.url),
    'utf8'
  );

  it('the document element holds the runs and names no chip', () => {
    const body = documentElementBody(source);
    expect(body).toContain('<DocumentRuns');
    expect(body).not.toContain('RedlineChip');
  });

  it('and the chip IS drawn, inside the view, so this is not a vacuous scan', () => {
    expect(source).toContain('<RedlineChip');
    expect(source).toContain('className="ed-redline-view"');
  });

  it('the scanner behaves on both fixtures, so it can fail', () => {
    const outside = [
      '    <div className="ed-redline-view">',
      '          <div className="ed-redline ed-redline-doc" data-redline="">',
      '            <DocumentRuns runs={r} />',
      '          </div>',
      '      <RedlineChip anchor={a} />',
      '    </div>'
    ].join('\n');
    const inside = [
      '    <div className="ed-redline-view">',
      '          <div className="ed-redline ed-redline-doc" data-redline="">',
      '            <DocumentRuns runs={r} />',
      '            <RedlineChip anchor={a} />',
      '          </div>',
      '    </div>'
    ].join('\n');
    expect(documentElementBody(outside)).not.toContain('RedlineChip');
    expect(documentElementBody(inside)).toContain('RedlineChip');
  });
});
