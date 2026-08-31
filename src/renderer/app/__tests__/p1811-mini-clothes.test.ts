/**
 * THE RAIL'S CLOTHES BELONG TO THE RAIL (Phase 181.1 fix round).
 *
 * Phase 181 mounted `mini` in exactly one place, the collapsed 48px rail, so
 * the rules that pin it above that rail's footer band were written on the
 * class itself. Phase 181.1 is the first phase to mount the same class in the
 * 36px tab strip, and there every one of them is wrong. Measured in the running
 * app at 620px before this fix: the meter's box stood at y 45-73 inside a band
 * running 38-74, bottom-aligned by `margin-top: auto` while every other control
 * in the band is centred, and its `border-top` drew a 1px hairline fragment
 * across its own 43px width, floating in the middle of the strip and belonging
 * to nothing.
 *
 * The Electron probe measures the drawn rectangles and is not in the commit
 * battery. This file is what the battery runs, and it holds the one thing a
 * later tidy-up would undo in a line: that these four declarations name the
 * rail in their selector. It reads the stylesheet as bytes because there is no
 * CSSOM in this lane, which is the way p1741-font-field.test.tsx next door
 * holds its own one-rule repair.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '..', 'usage-meter.css'), 'utf8');

/** Every rule in the sheet, comments stripped, as selector plus body. */
function rules(): { selector: string; body: string }[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out: { selector: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(bare)) !== null) {
    out.push({
      selector: (match[1] ?? '').trim(),
      body: (match[2] ?? '').trim()
    });
  }
  return out;
}

/** The rules that reach a mini meter or anything inside one. */
const miniRules = rules().filter((rule) =>
  rule.selector.split(',').some((one) => one.includes('.usage-mini'))
);

/** The last compound of a selector: what the rule actually targets. */
const target = (one: string): string =>
  one.trim().split(/\s*[>+~]\s*|\s+/).filter((part) => part !== '').pop() ?? '';

/** Rules that style the mini METER element rather than something inside it. */
const selfRules = miniRules.filter((rule) =>
  rule.selector.split(',').some((one) => target(one).includes('.usage-mini'))
);

/** The rail, by the class its aside carries in SessionDock.tsx. */
const namesTheRail = (selector: string): boolean =>
  selector
    .split(',')
    .every((one) => one.includes('.session-dock') && one.includes('.collapsed'));

const declares = (body: string, property: string): boolean =>
  new RegExp(`(^|;|\\s)${property}\\s*:`).test(body);

describe('the collapsed rail keeps its placement to itself', () => {
  it('has mini rules at all, so this file cannot pass on an empty read', () => {
    expect(miniRules.length).toBeGreaterThan(2);
    expect(selfRules.length).toBeGreaterThan(1);
  });

  // The three the fix round measured in the band: a margin that bottom-aligned
  // the meter, a width that made it fill a 48px column, and a hairline of its
  // own drawn across the middle of a 36px strip.
  for (const property of ['margin-top', 'width', 'border-top']) {
    it(`declares ${property} on the mini meter only where the selector names the rail`, () => {
      const unscoped = selfRules.filter(
        (rule) => declares(rule.body, property) && !namesTheRail(rule.selector)
      );
      expect(unscoped.map((rule) => rule.selector)).toEqual([]);
    });
  }

  // The fourth. Two bars stacked is what 48px needs and what a 36px band
  // cannot hold, so the column belongs to the rail as much as the hairline.
  it('stacks the rows into a column only where the selector names the rail', () => {
    const unscoped = miniRules.filter(
      (rule) =>
        /flex-direction\s*:\s*column/.test(rule.body) && !namesTheRail(rule.selector)
    );
    expect(unscoped.map((rule) => rule.selector)).toEqual([]);
  });

  it('still gives the rail every one of those four', () => {
    const rail = miniRules.filter((rule) => namesTheRail(rule.selector));
    const body = rail.map((rule) => rule.body).join(' ');
    expect(rail.length).toBeGreaterThan(0);
    expect(body).toContain('margin-top: auto');
    expect(body).toContain('width: 100%');
    expect(body).toContain('border-top:');
    expect(body).toContain('flex-direction: column');
  });

  it('leaves the class itself carrying only what mini means everywhere', () => {
    for (const rule of selfRules.filter((rule) => !namesTheRail(rule.selector))) {
      expect(declares(rule.body, 'margin')).toBe(false);
      expect(declares(rule.body, 'position')).toBe(false);
    }
  });
});
