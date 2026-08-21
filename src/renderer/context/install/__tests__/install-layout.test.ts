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
 * Three rules, and each one is a thing that was true when the phase landed:
 *  1. the sheet itself does not scroll,
 *  2. every scroll region this phase added is scoped to the sheet,
 *  3. the small-window guard is still inside the width's `min()`.
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
    // The container query sets `flex-wrap: wrap` on this element and
    // surface.css sets `flex-direction: column` after it, so inside a sheet
    // whose height is now bounded the band would wrap its rows into side by
    // side columns and push the button out of the sheet's box. The first
    // verification of this phase measured exactly that at a 586 px viewport
    // with four children. This line is the fix, so this test is its guard.
    expect(oneRule('.ctx-install-sheet .ctxd-install-control')).toMatch(
      /flex-wrap:\s*nowrap/
    );
  });

  it('leaves the unscoped .ctxd-preview rules alone', () => {
    // Phase 26's container query is what makes the card two columns wherever it
    // renders. This phase must not have moved it inside the sheet's scope.
    expect(code).toMatch(/@container ctxd-preview \(min-width: 680px\)/);
    expect(rulesFor('.ctxd-preview').length).toBe(1);
  });
});

describe('the width keeps its small-window guard', () => {
  it('states 1120px and the guard inside one min()', () => {
    const sheet = oneRule('.ctx-install-sheet');
    const width = /width:\s*min\(([^)]*\([^)]*\)[^)]*|[^;]*)\);/.exec(sheet);
    expect(width).not.toBeNull();
    expect(width?.[1]).toContain('1120px');
    expect(width?.[1]).toContain('calc(100vw - var(--space-8) * 2');
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
