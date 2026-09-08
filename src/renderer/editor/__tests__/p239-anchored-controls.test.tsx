/**
 * PHASE 239 items 1 to 3. THE CONTROLS BELONG TO A CHANGE, NOT TO A POINTER.
 *
 * The operator, 2026-09-08, with a photograph of Cursor beside it: *"i also
 * want the controls to work more like cursor ide.. today the they sort of just
 * hover, did / does and sort of show near the line they are for the actual
 * actions you can take."*
 *
 * Research 83 E.9 measured what to take from Cursor and what to leave: take
 * the PLACE and the PERSISTENCE, leave the LINE grain and the ownership by a
 * TURN. Research 99 recommended shape 1 plus shape 4 at a layout number of
 * **0.00px** and refused shape 2 (the ending line's right-hand space) and
 * shape 3 (a block affordance) with its own tables. What is pinned here:
 *
 *   1. THE STEP COMPUTES FROM THE HELD POSITION and never from
 *      `document.activeElement`, which is the fix for research 99 section
 *      2.2's swallowed first ⌥↓ — the first press of a fresh view left the
 *      focus on the `contenteditable` host and drew nothing, in two runs.
 *      Six positions, and the ablation is the reading the old code gave.
 *   2. THE IDENTITY SURVIVES THE RECOMPOSE, which is research 99 section 2.3:
 *      an outside write took 9 changes to 10, destroyed the wrapper and took
 *      the person's place away, while the change was still drawn with the same
 *      identity, offset and generation.
 *   3. THE MARK COSTS NOTHING. It adds no node and no text, so both
 *      projections and the copy answer are byte for byte what they were, and
 *      its stylesheet rule holds only declarations research 99 section 5
 *      priced at 0 findings on BOTH rulers. The ablation is `border-left`,
 *      which is the one form a person reaches for first and the one that costs
 *      2.00px of real reflow.
 *   4. THE NARROW PANE ANSWER, over the four widths research 99 section 3.1
 *      measured on the real view: the chip is an overlay clamped to the view
 *      and its width no longer grows with the journal, so it fits at every one
 *      of them. The ablation is the four-button chip at 380px.
 *
 * WHAT THIS FILE CANNOT DO, stated rather than hidden: this repository carries
 * no jsdom, so nothing here focuses, hovers or lays anything out. The rectangle
 * readings are the app run's and the parent numbers they are compared against
 * are in research 99 sections 1.1, 3.1 and 5.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../MonacoHost', () => ({
  OpeningSkeleton: () => createElement('div', { className: 'ed-skeleton' })
}));
vi.mock('../live-text', () => ({
  useLiveTabText: (_id: string, saved: string) => saved
}));

const { RedlineDocument, chipAnchorFor } = await import('../RedlineDocument');
const { chipPlace } = await import('../redline-chip');
const {
  CURRENT_ATTRIBUTE,
  identityOf,
  indexOfChange,
  sameChange,
  stepIndex
} = await import('../redline-current');
const { NO_BASELINE, nextBaseline } = await import('../baseline');
const { forgetRewindJournal, recordRewind } = await import('../redline-journal');
const { keyDisplay } = await import('@shared/keymap');
type EditorTab = import('../tab-types').EditorTab;
type ChipRect = import('../redline-chip').ChipRect;
type ChangeIdentity = import('../redline-current').ChangeIdentity;

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
  baseline: nextBaseline(NO_BASELINE, { kind: 'head', contents: OPENED }, 1)
} as Partial<EditorTab> as EditorTab;

/** A drawn wrapper, as far as `identityOf` is concerned. */
const wrapper = (
  off: number,
  del: string,
  ins: string,
  generation = 2
): HTMLElement =>
  ({
    dataset: {
      changeOff: String(off),
      changeDel: del,
      changeIns: ins,
      changeGen: String(generation)
    }
  }) as unknown as HTMLElement;

/** Research 99 section 2.3's own nine changes, in the order they are drawn. */
const NINE: HTMLElement[] = [
  wrapper(10, 'keeps', 'holds'),
  wrapper(80, 'quick brown foxes leap over the lazy dog', 'swift crimson hounds vault the idle hound'),
  wrapper(190, 'calm', 'serene'),
  wrapper(260, 'Wholly replaced paragraph', 'A different paragraph entirely'),
  wrapper(330, 'Eager purple herons', 'Weary amber cranes'),
  wrapper(410, 'noisy yellow beetles', 'quiet green mantises'),
  wrapper(480, 'patient silver otters', 'restless copper voles'),
  wrapper(550, 'guards', 'shields'),
  wrapper(620, '', 'A paragraph the agent added.\n\n')
];

// ---------------------------------------------------------------------------
// 1. The step, over six positions, computed from the HELD place.
// ---------------------------------------------------------------------------

describe('the step computes from the held position, never from the focus', () => {
  it('from nowhere, next is the first change and previous the last', () => {
    expect(stepIndex(9, null, 1)).toBe(0);
    expect(stepIndex(9, null, -1)).toBe(8);
  });

  it('THE FIRST ⌥↓ OF A FRESH VIEW LANDS, which is the swallowed press', () => {
    // Research 99 section 2.2, reproduced in two runs: the first press left
    // `document.activeElement` on `ed-redline ed-redline-doc` with a caret at
    // offset 20 and drew NO chip, so the press a person makes when they first
    // try the chord they have just been told about did nothing visible.
    //
    // The old rule read the position off `activeElement` and computed
    // `indexOf(host) === -1`, which happens to answer 0 for a NEXT and 8 for a
    // PREVIOUS — the same numbers. What was lost was that nothing then held
    // the answer, because the focus never arrived. Here the answer is state,
    // so the ablation is not the arithmetic but the source of `at`.
    const held: ChangeIdentity | null = null;
    expect(stepIndex(NINE.length, indexOfChange(NINE, held), 1)).toBe(0);
    // And the SECOND press moves on, rather than repeating the first.
    const after = identityOf(NINE[0] as HTMLElement);
    expect(stepIndex(NINE.length, indexOfChange(NINE, after), 1)).toBe(1);
  });

  it.each([
    [0, 1, 1],
    [0, -1, 0],
    [4, 1, 5],
    [4, -1, 3],
    [8, 1, 8],
    [8, -1, 7]
  ])('from %i a step of %i lands on %i', (at, delta, want) => {
    expect(stepIndex(9, at, delta as 1 | -1)).toBe(want);
  });

  it('a document with no change steps nowhere', () => {
    expect(stepIndex(0, null, 1)).toBeNull();
    expect(stepIndex(0, 3, -1)).toBeNull();
  });

  it('at either end the position stays where it is, which is what Phase 227 shipped', () => {
    expect(stepIndex(9, 0, -1)).toBe(0);
    expect(stepIndex(9, 8, 1)).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// 2. The identity survives the recompose.
// ---------------------------------------------------------------------------

describe('the current change survives the recompose an outside write causes', () => {
  it('research 99 section 2.3: 9 changes become 10 and the place is still found', () => {
    const held = identityOf(NINE[6] as HTMLElement);
    expect(held).not.toBeNull();
    expect(indexOfChange(NINE, held)).toBe(6);
    // The write inserts a change ABOVE it and rebuilds every wrapper. The old
    // rule held the ELEMENT, which is gone; this one holds the identity.
    const after = [
      ...NINE.slice(0, 3),
      wrapper(230, 'the shell wrote this', 'and this'),
      ...NINE.slice(3)
    ].map((el) => {
      const id = identityOf(el) as ChangeIdentity;
      return wrapper(id.off, id.del, id.ins, id.generation);
    });
    expect(after).toHaveLength(10);
    // The ELEMENT is a different object, so an element-keyed rule loses it.
    expect(after.includes(NINE[6] as HTMLElement)).toBe(false);
    // The IDENTITY is still there, one row further down.
    expect(indexOfChange(after, held)).toBe(7);
  });

  it('a change the picture no longer holds answers null, which a rewind causes', () => {
    const rewound = identityOf(NINE[0] as HTMLElement);
    expect(indexOfChange(NINE.slice(1), rewound)).toBeNull();
  });

  it('the generation is NOT part of the identity, so a commit keeps your place', () => {
    const before = identityOf(wrapper(10, 'keeps', 'holds', 2)) as ChangeIdentity;
    const after = identityOf(wrapper(10, 'keeps', 'holds', 3)) as ChangeIdentity;
    expect(sameChange(before, after)).toBe(true);
    // And the press still reads its generation off the DRAWN wrapper, so a
    // moved baseline is refused by ./redline-write's guard exactly as before.
    expect(after.generation).toBe(3);
  });

  it('but a different phrase at the same offset is a different change', () => {
    const a = identityOf(wrapper(10, 'keeps', 'holds')) as ChangeIdentity;
    expect(sameChange(a, identityOf(wrapper(10, 'keeps', 'kept')) as ChangeIdentity)).toBe(false);
    expect(sameChange(a, identityOf(wrapper(11, 'keeps', 'holds')) as ChangeIdentity)).toBe(false);
  });

  it('a wrapper with no identity on it is never current', () => {
    expect(identityOf({ dataset: {} } as unknown as HTMLElement)).toBeNull();
    expect(indexOfChange([{ dataset: {} } as unknown as HTMLElement], identityOf(NINE[0] as HTMLElement))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2b. The anchor rule, and the resting face.
// ---------------------------------------------------------------------------

describe('the current change wins over the pointer, and nothing wins over neither', () => {
  it('the resting face draws no control at all, which Phase 236 ruled', () => {
    expect(chipAnchorFor(null, null)).toBeNull();
    const html = renderToStaticMarkup(createElement(RedlineDocument, { tab }));
    expect(html).not.toContain('ed-redline-chip');
    expect(html).not.toContain('<button');
    expect(html).not.toContain(CURRENT_ATTRIBUTE);
  });

  it('a current change beats a hovered one, so the chip names what the keys act on', () => {
    const current = { id: 'current' } as unknown as HTMLElement;
    const hovered = { id: 'hovered' } as unknown as HTMLElement;
    expect(chipAnchorFor(current, hovered)).toBe(current);
    expect(chipAnchorFor(current, hovered)).not.toBe(hovered);
    expect(chipAnchorFor(null, hovered)).toBe(hovered);
  });
});

// ---------------------------------------------------------------------------
// 3. The mark costs nothing: no node, no text, and no reflowing declaration.
// ---------------------------------------------------------------------------

/** The document element's own markup, from its opening tag to its close. */
function documentOf(html: string): string {
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

/** The leaves, exactly as `redline-shot-probe.ts`'s `leavesOf` reads them. */
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

/** ./redline-copy's two rules, as a string operation. */
function copyAnswer(body: string): string {
  return unescape(
    body
      .replace(/<(del|span|div)[^>]*\sdata-redline-(?:del|tag)=""[^>]*>[\s\S]*?<\/\1>/g, '')
      .replace(/<[^>]+>/g, '')
  );
}

describe('the mark adds no node and no text, so both projections stand', () => {
  const bare = documentOf(renderToStaticMarkup(createElement(RedlineDocument, { tab })));
  /** The same document with the change marked, which is what the render does. */
  const marked = bare.replace(
    'class="ed-redline-change"',
    `class="ed-redline-change" ${CURRENT_ATTRIBUTE}=""`
  );

  it('the mark really went on, so this is not a vacuous comparison', () => {
    expect(marked).not.toBe(bare);
    expect(marked).toContain(`${CURRENT_ATTRIBUTE}=""`);
  });

  it('the leaves are byte for byte the same, because an attribute is not a run', () => {
    expect(leaves(marked)).toEqual(leaves(bare));
  });

  it('non-INS leaves are the baseline and non-DEL leaves the working text, marked or not', () => {
    for (const body of [bare, marked]) {
      const flat = leaves(body);
      expect(flat.filter((r) => r.kind !== 'ins').map((r) => r.text).join('')).toBe(OPENED);
      expect(flat.filter((r) => r.kind !== 'del').map((r) => r.text).join('')).toBe(WRITTEN);
    }
  });

  it('a copy of the document is the working file, marked or not', () => {
    expect(copyAnswer(bare)).toBe(WRITTEN);
    expect(copyAnswer(marked)).toBe(WRITTEN);
  });
});

describe('the mark is drawn with declarations research 99 priced at 0 findings', () => {
  const css = readFileSync(new URL('../redline.css', import.meta.url), 'utf8');

  /** The declarations of the rule whose selector list holds `selector`. */
  function ruleFor(selector: string): string {
    const at = css.indexOf(selector);
    if (at === -1) throw new Error(`no rule for ${selector}`);
    const open = css.indexOf('{', at);
    return css.slice(open + 1, css.indexOf('}', open));
  }

  it('there is a rule for the current change at all', () => {
    expect(css).toContain(`.ed-redline-change[${CURRENT_ATTRIBUTE}]`);
  });

  it('it holds only the four free declarations, and no reflowing one', () => {
    const body = ruleFor(`.ed-redline-change[${CURRENT_ATTRIBUTE}]`);
    const properties = body
      .split(';')
      .map((line) => line.split(':')[0]?.trim() ?? '')
      .filter((name) => name !== '');
    expect(properties.sort()).toEqual(
      ['border-radius', 'box-shadow', 'outline', 'outline-offset'].sort()
    );
    // THE ABLATION, and it is the shape a person reaches for first: research
    // 99 section 5 measured a `border-left` rail at 2.00px of real reflow,
    // moving the change's own first rect from 72.98 to 74.98 and that line's
    // right edge from 1479.34 to 1481.34. It is inside the inline box, so it
    // widens the change and pushes the rest of the line.
    for (const forbidden of [
      'border-left',
      'border',
      'margin',
      'padding',
      'width',
      'display',
      'font-size',
      'letter-spacing'
    ]) {
      expect(properties, forbidden).not.toContain(forbidden);
    }
  });

  it('and no colour literal, per rule 8: the ring is the accent token', () => {
    const body = ruleFor(`.ed-redline-change[${CURRENT_ATTRIBUTE}]`);
    expect(body).toContain('var(--accent)');
    expect(body).toContain('var(--border-strong)');
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(/);
  });
});

// ---------------------------------------------------------------------------
// 4. The narrow pane answer, over research 99 section 3.1's four widths.
// ---------------------------------------------------------------------------

describe('the narrow pane answer: the chip fits at every width the pane offers', () => {
  const rect = (left: number, top: number, width: number, height: number): ChipRect => ({
    left,
    top,
    bottom: top + height,
    width,
    height
  });

  /**
   * The four pane widths research 99 section 3.1 landed on with a real divider
   * drag, and the text column inside each. The view is the whole pane, because
   * `.ed-redline-view` is `inset: 0` and is the only positioned box in it.
   */
  const PANES = [
    { pane: 900, column: 508.81, left: 190.09 },
    { pane: 700, column: 508.81, left: 90.09 },
    { pane: 520, column: 461.0, left: 24.0 },
    { pane: 380, column: 321.0, left: 24.0 }
  ] as const;

  /** The chip with its three buttons, measured in research 99 section 7.3. */
  const THREE = { width: 171.6, height: 30 };
  /** What it was before this phase took Undo off it, measured in the same place. */
  const FOUR = { width: 260.8, height: 30 };

  it.each(PANES)('at a $pane px pane the chip is inside the view', ({ pane, column, left }) => {
    const view = rect(0, 0, pane, 800);
    // A change at the far right of the text column, which is the worst case
    // for a chip anchored where the change STARTS.
    const change = rect(left + column - 8, 400, 8, 15);
    const place = chipPlace(change, view, THREE);
    expect(place.left).toBeGreaterThanOrEqual(0);
    expect(place.left + THREE.width).toBeLessThanOrEqual(pane);
    expect(place.top).toBeGreaterThanOrEqual(0);
    expect(place.top + THREE.height).toBeLessThanOrEqual(800);
  });

  it('a change at the left edge is not pushed off the other way either', () => {
    for (const { pane, left } of PANES) {
      const view = rect(0, 0, pane, 800);
      const place = chipPlace(rect(left, 400, 8, 15), view, THREE);
      expect(place.left).toBeGreaterThanOrEqual(0);
      expect(place.left + THREE.width).toBeLessThanOrEqual(pane);
    }
  });

  it('SHAPE 2 IS REFUSED AND THIS IS WHY: the ending line has no room to live in', () => {
    // Research 99 section 3.2, measured on the real view. The room between the
    // last glyph on a change's ending line and the column's right edge, for
    // five of the nine changes at a 900px pane. A 171.60px chip fits in none
    // of them, which is what makes an ending-line anchor an anchor at one pane
    // width and a right-edge clamp everywhere else.
    const ROOM_AT_900 = [0.56, 7.77, 8.99, 6.87, 10.1];
    for (const room of ROOM_AT_900) expect(room + 4).toBeLessThan(THREE.width);
    // And the room outside the document element at the narrow panes is 10.00px
    // (research 99 section 3.1), which is the scroller's gutter and nothing
    // more, so a margin gutter has nowhere to be either.
    expect(10 + 4).toBeLessThan(THREE.width);
  });

  it('AND THE ABLATION: the four-button chip is dragged 89.20px further off the change', () => {
    // Research 99 section 3.2 measured the 260.80px chip with room to the
    // view's edge on 1 of 9 ending lines at 380px against 3 of 9 for the
    // 171.60px one. Here is the same fact as a displacement: for a change at
    // the right edge of a 321px column in a 380px pane, the clamp drags the
    // chip away from where the change starts, and it drags the wider chip
    // 89.20px further.
    const view = rect(0, 0, 380, 800);
    const change = rect(24 + 321 - 8, 400, 8, 15);
    const near = chipPlace(change, view, THREE);
    const wide = chipPlace(change, view, FOUR);
    expect(change.left - near.left).toBeCloseTo(128.6, 2);
    expect(change.left - wide.left).toBeCloseTo(217.8, 2);
    expect(near.left - wide.left).toBeCloseTo(89.2, 2);
    // And it covers 68.6% of the pane against 45.2%.
    expect((FOUR.width / 380) * 100).toBeCloseTo(68.63, 1);
    expect((THREE.width / 380) * 100).toBeCloseTo(45.16, 1);
    // THE STATED LIMIT, said out loud rather than hidden: at 380px a change at
    // the very right of the column has its chip clamped whatever the chip's
    // width, because the pane is 380px and the chip is 171.60px. What this
    // phase buys there is 89.20px less of it, and the mark in the document,
    // which is what says which change the chip belongs to when the clamp has
    // moved it (research 99 section 5, shape 4).
    expect(near.left).toBe(380 - THREE.width);
  });
});

// ---------------------------------------------------------------------------
// 5. Phase 236's own recorded finding, closed: Undo is the TAB's verb.
// ---------------------------------------------------------------------------

describe('undo of a rewind left the change chip for the row that names it', () => {
  /** The face with a rewind in this tab's journal, so the note row is drawn. */
  function withRewind(): string {
    forgetRewindJournal('t1');
    recordRewind('t1', { off: 10, del: 'brown', ins: 'red', generation: 1 });
    try {
      return renderToStaticMarkup(createElement(RedlineDocument, { tab }));
    } finally {
      forgetRewindJournal('t1');
    }
  }

  it('the note row is drawn, with the sentence that already told the truth', () => {
    const html = withRewind();
    expect(html).toContain('ed-redline-undo');
    expect(html).toContain(
      `Undo the last rewind with ${keyDisplay('redline.undo')}. It lasts for this session.`
    );
  });

  it('THE VERB IS IN THAT ROW AND NOWHERE ELSE, which is research 99 section 7.3', () => {
    const html = withRewind();
    // Exactly one control for it on the whole face.
    expect((html.match(/ed-redline-note-button/g) ?? [])).toHaveLength(1);
    expect(html).toContain('aria-label="Undo the last rewind"');
    expect(html).toContain('title="Undo the last rewind"');
    // It says the chord, read from the keymap and never typed.
    expect(html).toContain(`<span class="key">${keyDisplay('redline.undo')}</span>`);
  });

  it('it carries data-redline-tag, so no control glyph can reach a clipboard', () => {
    const html = withRewind();
    const button = /<button[^>]*ed-redline-note-button[^>]*>/.exec(html)?.[0] ?? '';
    expect(button).toContain('data-redline-tag=""');
  });

  it('and the row is OUTSIDE the document, so the projections never see it', () => {
    const html = withRewind();
    expect(documentOf(html)).not.toContain('ed-redline-note-button');
    const flat = leaves(documentOf(html));
    expect(flat.filter((r) => r.kind !== 'ins').map((r) => r.text).join('')).toBe(OPENED);
    expect(flat.filter((r) => r.kind !== 'del').map((r) => r.text).join('')).toBe(WRITTEN);
    expect(copyAnswer(documentOf(html))).toBe(WRITTEN);
  });

  it('THE RESTING FACE DRAWS NEITHER, because there is no rewind to undo', () => {
    forgetRewindJournal('t1');
    const html = renderToStaticMarkup(createElement(RedlineDocument, { tab }));
    expect(html).not.toContain('ed-redline-note-button');
    expect(html).not.toContain('ed-redline-undo');
    expect(html).not.toContain('<button');
  });
});
