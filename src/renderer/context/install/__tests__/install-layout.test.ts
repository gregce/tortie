/**
 * Phase 132. The install sheet's layout rules, read out of the stylesheet.
 *
 * WHY A TEST READS CSS AS TEXT. No unit test can see a layout, and the live
 * proof is `build/p132-install-sheet.mjs`, which drives the real app. What this
 * file guards is the one thing a later round can break without any measurement
 * noticing: the SCOPING. `install.css` is a global stylesheet once bundled, and
 * `PreviewCard` also renders in the editor panel through
 * `../../surface/ContextDetail.tsx`, which has its own scroller. An unscoped
 * `overflow-y: auto` on `.ctxd-preview-body` puts a second scrollbar inside the
 * Context detail tab, and that regression would still pass every check the live
 * probe makes, because the probe only ever opens the sheet.
 *
 * Four rules, and each one is a thing that was true when the phase landed:
 *  1. the sheet itself does not scroll,
 *  2. every scroll region this phase added is scoped to the sheet,
 *  3. the small-window guard is still inside the width's `min()`,
 *  4. Phase 132.1. This file states no `@import`, and it states no direction
 *     and no wrap on the control band.
 *
 * WHAT THIS FILE CANNOT SEE, and it is why Phase 132.1 exists. It reads the
 * SOURCE. Every rule it asserts was in the source for the four months the
 * install sheet drew from a second copy of surface.css that landed after this
 * file and won. `build/assert-css-order.mjs` reads the BUILT stylesheet and is
 * the only check that can see that. The two are not substitutes and both stay.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', 'install.css'), 'utf8');

/** Strip the comments, so a sentence in prose can never satisfy a rule. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every rule in the file as a selector list and a declaration block. A regex
 * is enough here because this stylesheet has exactly one level of nesting, the
 * `@container` block, and a nested rule's selector still reads correctly.
 */
function rules(): { selectors: string; body: string }[] {
  const out: { selectors: string; body: string }[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match = pattern.exec(code);
  while (match !== null) {
    // Everything after the last `;` in the run, because the first rule in the
    // file is preceded by the `@import` at the top and an at-rule is not a
    // selector.
    const selectors = (match[1]?.split(';').pop() ?? '').trim();
    if (selectors !== '' && !selectors.startsWith('@')) {
      out.push({ selectors, body: match[2] ?? '' });
    }
    match = pattern.exec(code);
  }
  return out;
}

/** The rules whose selector list names this exact selector. */
function rulesFor(selector: string): { selectors: string; body: string }[] {
  return rules().filter((rule) =>
    rule.selectors.split(',').some((one) => one.trim() === selector)
  );
}

/** The single rule for a selector. Fails the test when there is not exactly one. */
function oneRule(selector: string): string {
  const found = rulesFor(selector);
  expect(found.length, `rules declaring ${selector}`).toBe(1);
  return found[0]?.body ?? '';
}

describe('the install sheet stops being one scroller', () => {
  it('declares overflow: hidden on the sheet and never overflow-y: auto', () => {
    const sheet = oneRule('.ctx-install-sheet');
    expect(sheet).toMatch(/overflow:\s*hidden/);
    expect(sheet).not.toMatch(/overflow-y:\s*auto/);
  });

  it('makes the sheet a flex column, so its regions can own the height', () => {
    const sheet = oneRule('.ctx-install-sheet');
    expect(sheet).toMatch(/display:\s*flex/);
    expect(sheet).toMatch(/flex-direction:\s*column/);
  });
});

describe('every scroll region this phase added is scoped to the sheet', () => {
  const scoped = [
    '.ctxd-preview-body',
    '.ctxd-remote-body',
    '.ctxd-install-control',
    '.ctx-sheet-hits'
  ];

  for (const target of scoped) {
    it(`only scrolls ${target} inside .ctx-install-sheet`, () => {
      const offenders = rules()
        .filter((rule) => /overflow(-y)?:\s*(auto|scroll)/.test(rule.body))
        .flatMap((rule) => rule.selectors.split(','))
        .map((one) => one.trim())
        .filter((one) => one.includes(target))
        .filter((one) => !one.startsWith('.ctx-install-sheet'));
      expect(offenders).toEqual([]);
    });
  }

  it('scopes the three preview bands to the sheet', () => {
    for (const band of [
      '.ctx-install-sheet .ctxd-preview-body',
      '.ctx-install-sheet .ctxd-install-control',
      '.ctx-install-sheet .ctxd-remote-body'
    ]) {
      expect(rulesFor(band).length).toBe(1);
    }
  });

  it('keeps the control band a single column, so the button cannot wrap away', () => {
    // Phase 132 added this line because the container query stated
    // `flex-wrap: wrap` on this element while surface.css's
    // `flex-direction: column` landed after it, so inside a sheet whose height
    // is now bounded the band wrapped its rows into side by side columns and
    // pushed the button out of the sheet's box. The first verification of that
    // phase measured exactly this at a 586 px viewport with four children.
    // Phase 132.1 deleted the wrap, and this line stays as the floor.
    expect(oneRule('.ctx-install-sheet .ctxd-install-control')).toMatch(
      /flex-wrap:\s*nowrap/
    );
  });

  it('never states a direction or a wrap on the control band', () => {
    // Phase 132.1. surface.css draws this band as a column and it has drawn it
    // that way since Phase 26. The container query used to state
    // `flex-direction: row`, `flex-wrap: wrap` and `align-items: center` here,
    // and none of it drew, because surface.css was emitted twice and its second
    // copy won. Repairing the ordering would have started that row drawing for
    // the first time. It was photographed at six acknowledgement rows and it
    // put each refusal sentence in its own 130 px column of wrapped text, so
    // the three declarations were deleted instead. This test is what stops a
    // later round putting one back without measuring it.
    const offenders = rules()
      .filter((rule) =>
        rule.selectors
          .split(',')
          .some((one) => one.trim().endsWith('.ctxd-install-control'))
      )
      .filter((rule) => /flex-direction:|flex-wrap:\s*wrap/.test(rule.body))
      .map((rule) => rule.selectors.trim());
    expect(offenders).toEqual([]);
  });

  it('does not give the acknowledgement rows a full-width flex basis', () => {
    // `flex: 1 1 100%` on these rows is what caused the Phase 132 regression.
    // In a wrapping column a basis of 100 percent means each row asks for the
    // container's full height, so each row starts a new column and the button
    // leaves the sheet.
    const offenders = rules()
      .filter((rule) =>
        rule.selectors
          .split(',')
          .some((one) => one.trim().startsWith('.ctxd-install-control .ctxd-'))
      )
      .filter((rule) => /flex:\s*1\s+1\s+100%/.test(rule.body))
      .map((rule) => rule.selectors.trim());
    expect(offenders).toEqual([]);
  });

  it('takes surface.css from JavaScript and never from an @import', () => {
    // The whole of Phase 132.1. `@import '../surface/surface.css'` sat at the
    // top of this file from Phase 26 until Phase 132.1. `postcss-import`
    // inlines the text, and inlined text is not the module that
    // `../../surface/ContextDetail.tsx` imports, so the bundler emitted two
    // copies and the second one won every property the two files declare at the
    // same specificity. `build/assert-css-order.mjs` proves the artifact side
    // of this. This test guards the source line that recreates it.
    // `code` rather than `css`, because the rewritten comment at the top of
    // install.css names the `@import` it replaced.
    expect(code).not.toMatch(/@import/);
  });

  it('leaves the unscoped .ctxd-preview rules alone', () => {
    // Phase 26's container query is what makes the card two columns wherever it
    // renders. This phase must not have moved it inside the sheet's scope.
    expect(code).toMatch(/@container ctxd-preview \(min-width: 680px\)/);
    expect(rulesFor('.ctxd-preview').length).toBe(1);
  });
});

describe('the width keeps its small-window guard', () => {
  it('states the 1600px cap and the viewport guard inside one min()', () => {
    // Widened on 2026-08-23 at the operator's ask. The cap stops the two
    // column preview stretching past readable on a wide display, and the vw
    // term keeps a margin at every window size.
    const sheet = oneRule('.ctx-install-sheet');
    const width = /width:\s*min\(([^)]*\([^)]*\)[^)]*|[^;]*)\);/.exec(sheet);
    expect(width).not.toBeNull();
    expect(width?.[1]).toContain('1600px');
    expect(width?.[1]).toContain('92vw');
  });
});

describe('the facts and the plan lead the raw skill text', () => {
  it('floors the facts band at 144 px and caps the raw text band at 144 px', () => {
    // Phase 132.1. Phase 132 set the floor at 96 px and the cap at 240 px, so
    // at a 586 px viewport with two agents ticked the facts band drew 95 px and
    // was cut in the middle of an agent grid row, while the skill's own text
    // drew 175.5 px. The person was given more of the text they had not started
    // reading than of the two facts the decision needs. Both values stay
    // expressed as multiples of the 48 px spacing token, so neither puts a bare
    // number in this file. `build/p132-install-sheet.mjs` measures the drawn
    // result, and it is what rejected the 192 px floor this phase was specified
    // at. A 192 px floor put the Install button 28.5 px below the sheet's
    // bottom at a 586 px viewport with six acknowledgement rows in the control
    // band.
    expect(oneRule('.ctx-install-sheet .ctxd-preview-body')).toMatch(
      /min-height:\s*calc\(var\(--space-10\) \* 3\)/
    );
    expect(oneRule('.ctx-install-sheet .ctxd-remote-body')).toMatch(
      /max-height:\s*calc\(var\(--space-10\) \* 3\)/
    );
  });
});

describe('the confirm keeps its buttons out of its own scroller', () => {
  it('gives the confirm a body band that scrolls', () => {
    expect(oneRule('.ctxd-install-modal')).toMatch(/overflow:\s*hidden/);
    const band = oneRule('.ctxd-install-modal-body');
    expect(band).toMatch(/overflow-y:\s*auto/);
    expect(band).toMatch(/min-height:\s*0/);
  });
});
