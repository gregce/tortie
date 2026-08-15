/**
 * Phase 40 item 2 — the split focus affordance, asserted against the CSS text.
 *
 * The rules under test paint pixels, so a screenshot read is what proves they
 * LOOK right, and the phase does that. This file guards the parts a picture
 * cannot: that the tokens exist, that the old hard ring is gone rather than
 * shadowed, that both new rules carry the group-of-1 guard, and that the two
 * contrast numbers written into the token comments are still true of the
 * values the tokens actually hold.
 *
 * Reading CSS as text is the same technique the graph palette test uses.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb } from '../../../scm/graph/__tests__/contrast';
import type { Rgb } from '../../../scm/graph/__tests__/contrast';

const STYLES = resolve(__dirname, '../../../styles');
const tokens = readFileSync(resolve(STYLES, 'tokens.css'), 'utf8');
const app = readFileSync(resolve(STYLES, 'app.css'), 'utf8');

/** The section of app.css this phase edits, from its own banner to the end. */
const SPLIT_BLOCK_MARKER = '/* ---- S4A split surface';
const splitBlock = app.slice(app.indexOf(SPLIT_BLOCK_MARKER));

/** Composite a translucent colour over an opaque one. */
function over(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return [
    alpha * fg[0] + (1 - alpha) * bg[0],
    alpha * fg[1] + (1 - alpha) * bg[1],
    alpha * fg[2] + (1 - alpha) * bg[2]
  ];
}

describe('the two Phase 40 tokens', () => {
  it('defines --accent-soft and --pane-unfocused-opacity', () => {
    expect(tokens).toContain('--accent-soft: rgba(77, 157, 232, 0.6);');
    expect(tokens).toContain('--pane-unfocused-opacity: 0.82;');
  });

  it('keeps the focus box above the 3:1 bar for a non-text boundary', () => {
    // WCAG 1.4.11. The box is the only mark on the focused pane, so if it
    // ever drops under 3:1 against the canvas it stops being an affordance.
    const canvas = hexToRgb('#131417');
    const soft = over(hexToRgb('#4d9de8'), canvas, 0.6);
    expect(contrastRatio(soft, canvas)).toBeGreaterThan(3);
    // The number in the token comment, to two decimals.
    expect(contrastRatio(soft, canvas).toFixed(2)).toBe('3.06');
  });

  it('keeps a dimmed pane well above the 4.5:1 body-text bar', () => {
    // The dim is a hint, not a curtain: the operator has to still be able to
    // read what the unfocused agents are printing. The one element that does
    // fall under the bar is `.split-state-note`, 11px --text-muted on an
    // ENDED leaf, which drops from 5.25:1 to 3.93:1. That number is recorded
    // in the token's own comment; it is not asserted here, because a passing
    // test is not the right place to enshrine a value that should improve.
    const canvas = hexToRgb('#131417');
    const dimmed = over(hexToRgb('#D8DBE2'), canvas, 0.82);
    expect(contrastRatio(dimmed, canvas)).toBeGreaterThan(4.5);
    // The number in the token comment, to two decimals.
    expect(contrastRatio(dimmed, canvas).toFixed(2)).toBe('9.19');
  });
});

describe('the split focus rules in app.css', () => {
  it('no longer draws the hard ring on the pane body', () => {
    expect(app).not.toContain('.split-pane.focused > .split-pane-body::after');
  });

  it('draws one soft box around the whole focused pane', () => {
    expect(splitBlock).toContain(
      ".surface-root:not([data-leaf-count='1']) .split-pane.focused::after"
    );
    expect(splitBlock).toContain('border: 1px solid var(--accent-soft);');
  });

  it('dims the body of every unfocused pane in the group', () => {
    expect(splitBlock).toContain('opacity: var(--pane-unfocused-opacity);');
    expect(splitBlock).toMatch(
      /\.surface-root:not\(\[data-leaf-count='1'\]\)\s+\.split-pane:not\(\.focused\)\s+\.split-pane-body/
    );
  });

  it('guards both new rules against a group of one', () => {
    // deriveSurfaces dissolves a one-leaf group back to a plain tab, so this
    // is a second defence on an attribute TerminalRegion already writes.
    const guarded = splitBlock
      .split('\n')
      .filter((line) => line.includes('--accent-soft')).length;
    expect(guarded).toBe(1);
    const rules = [
      ...splitBlock.matchAll(/--accent-soft|--pane-unfocused-opacity/g)
    ];
    expect(rules).toHaveLength(2);
    for (const use of ['--accent-soft', '--pane-unfocused-opacity']) {
      const at = splitBlock.indexOf(use);
      const selector = splitBlock.lastIndexOf('.surface-root', at);
      expect(selector).toBeGreaterThan(-1);
      expect(splitBlock.slice(selector, at)).toContain(
        ":not([data-leaf-count='1'])"
      );
    }
  });

  it('leaves the focused header with its brighter name and nothing else', () => {
    const at = splitBlock.indexOf('.split-header.focused {');
    expect(at).toBeGreaterThan(-1);
    const rule = splitBlock.slice(at, splitBlock.indexOf('}', at));
    expect(rule).toContain('color: var(--text-primary);');
    expect(rule).not.toContain('box-shadow');
  });

  it('states every colour in the split block as a token', () => {
    // The standing rule (UI rules in CLAUDE.md) made executable for the one
    // block this phase edits.
    expect(splitBlock).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(splitBlock).not.toMatch(/rgba?\(/);
  });
});
