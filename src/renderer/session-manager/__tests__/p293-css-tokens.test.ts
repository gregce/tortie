/**
 * Phase 293. Every stylesheet in the session manager's domain names its
 * colours through tokens, and never draws muted text on a ground it fails on.
 *
 * What these tests hold, over EVERY `.css` file in the directory (the frame's
 * and the panels', whoever wrote them):
 *  - NO COLOUR LITERAL: no `#` hex value, no `rgb(`/`rgba(`, no `hsl(`/`hsla(`,
 *    and no CSS named colour. `transparent` and `currentColor` are not
 *    colours a theme could get wrong, and they are allowed;
 *  - `--text-muted` IS NEVER USED IN A RULE WHOSE GROUND IS `--bg-raised` OR
 *    `--bg-active`. tokens.css measures it at 4.91 on the surface ground and
 *    below the floor on the active one, so on those grounds secondary text is
 *    `--text-secondary`. The rule is read two ways: a block that sets one of
 *    those grounds, and a block whose selector names one of the sheet's raised
 *    or active places (the sticky headings, a checked row, a row with its
 *    panel open, a row under the pointer, a panel, the selection toolbar);
 *  - no token is DEFINED here: tokens.css is not edited by this phase and no
 *    stylesheet in the domain mints a colour of its own.
 *
 * Comments are removed before anything is read, so a sentence ABOUT a colour
 * is not a colour.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = resolve(import.meta.dirname, '..');

/** The CSS named colours, CSS Color Module Level 4, less the two allowed. */
const NAMED = [
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige',
  'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown',
  'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral',
  'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
  'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred',
  'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray',
  'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue',
  'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite',
  'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod',
  'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred',
  'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen',
  'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
  'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen',
  'linen', 'magenta', 'maroon', 'mediumaquamarine', 'mediumblue',
  'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue',
  'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace',
  'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
  'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff',
  'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red',
  'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen',
  'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray',
  'slategrey', 'snow', 'springgreen', 'steelblue', 'tan', 'teal', 'thistle',
  'tomato', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke', 'yellow',
  'yellowgreen'
];

interface Rule {
  file: string;
  selector: string;
  declarations: { property: string; value: string }[];
}

/** Every innermost `selector { body }` of a stylesheet, comments out. */
function rulesOf(file: string, text: string): Rule[] {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const rules: Rule[] = [];
  for (const m of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (m[1] ?? '').trim();
    const declarations = (m[2] ?? '')
      .split(';')
      .map((one) => one.trim())
      .filter((one) => one.includes(':'))
      .map((one) => {
        const at = one.indexOf(':');
        return {
          property: one.slice(0, at).trim(),
          value: one.slice(at + 1).trim()
        };
      });
    rules.push({ file, selector, declarations });
  }
  return rules;
}

/** A value with every `var(--x)` reference taken out, so a token's NAME is not read. */
function withoutVars(value: string): string {
  let out = value;
  for (;;) {
    const next = out.replace(/var\(--[a-z0-9-]+(?:,[^()]*)?\)/gi, ' ');
    if (next === out) return out;
    out = next;
  }
}

/** The colour literals in one declaration value, as found. */
function literalsIn(value: string): string[] {
  const found: string[] = [];
  const bare = withoutVars(value);
  for (const m of bare.matchAll(/#[0-9a-f]{3,8}\b/gi)) found.push(m[0]);
  for (const m of bare.matchAll(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi)) {
    found.push(m[0]);
  }
  for (const word of bare.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (NAMED.includes(word)) found.push(word);
  }
  return found;
}

const FILES = readdirSync(DIR).filter((name) => name.endsWith('.css'));
const RULES = FILES.flatMap((name) =>
  rulesOf(name, readFileSync(resolve(DIR, name), 'utf8'))
);

/** The sheet's raised and active places, by the selectors that draw them. */
const RAISED_OR_ACTIVE =
  /thead|\.checked|sm-row-open|:hover|\.sm-inline|\.sm-batch|sm-skeleton|sm-count|data-mode='selection'|data-mode="selection"/;

describe('the session manager names every colour through a token (Phase 293, SPEC 2.1)', () => {
  it('reads every stylesheet in the domain, the panels’ included', () => {
    expect(FILES).toContain('session-manager.css');
    expect(FILES.length).toBeGreaterThanOrEqual(2);
    expect(RULES.length).toBeGreaterThan(60);
  });

  it('holds no colour literal: no hex, no rgb or hsl, no named colour', () => {
    const found: string[] = [];
    for (const rule of RULES) {
      for (const { property, value } of rule.declarations) {
        for (const literal of literalsIn(value)) {
          found.push(`${rule.file}: ${rule.selector} { ${property}: ${value} } -> ${literal}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it('allows transparent and currentColor, which a theme cannot get wrong', () => {
    expect(literalsIn('1px solid transparent')).toEqual([]);
    expect(literalsIn('currentColor')).toEqual([]);
    // And the reader itself finds what it is for.
    expect(literalsIn('#fff')).toEqual(['#fff']);
    expect(literalsIn('rgba(0, 0, 0, 0.4)')).toEqual(['rgba(']);
    expect(literalsIn('1px solid white')).toEqual(['white']);
    expect(literalsIn('var(--text-secondary)')).toEqual([]);
    expect(literalsIn('inset 0 -1px 0 var(--border-strong)')).toEqual([]);
  });

  it('defines no colour token of its own', () => {
    const minted = RULES.flatMap((rule) =>
      rule.declarations
        .filter(
          (d) =>
            d.property.startsWith('--') &&
            /^--(bg|text|border|accent|status|error|warning|success|info)-?/.test(
              d.property
            )
        )
        .map((d) => `${rule.file}: ${d.property}`)
    );
    expect(minted).toEqual([]);
  });
});

describe('muted text only on the surface ground (Phase 293, SPEC 2.1)', () => {
  it('no rule that sets a raised or active ground uses --text-muted', () => {
    const bad = RULES.filter((rule) => {
      const ground = rule.declarations.some(
        (d) =>
          /^background(-color)?$/.test(d.property) &&
          /var\(--bg-(raised|active)\)/.test(d.value)
      );
      const muted = rule.declarations.some((d) => d.value.includes('var(--text-muted)'));
      return ground && muted;
    }).map((rule) => `${rule.file}: ${rule.selector}`);
    expect(bad).toEqual([]);
  });

  it('no rule for one of the sheet’s raised or active places uses --text-muted', () => {
    const bad = RULES.filter(
      (rule) =>
        RAISED_OR_ACTIVE.test(rule.selector) &&
        rule.declarations.some((d) => d.value.includes('var(--text-muted)'))
    ).map((rule) => `${rule.file}: ${rule.selector}`);
    expect(bad).toEqual([]);
  });

  it('a hairline drawn on the active ground is --border-active', () => {
    const bad = RULES.filter((rule) => {
      const active = rule.declarations.some(
        (d) =>
          /^background(-color)?$/.test(d.property) &&
          d.value.includes('var(--bg-active)')
      );
      const plainBorder = rule.declarations.some(
        (d) => /^border(-bottom|-top)?(-color)?$/.test(d.property) && /var\(--border\)/.test(d.value)
      );
      return active && plainBorder;
    }).map((rule) => `${rule.file}: ${rule.selector}`);
    expect(bad).toEqual([]);
  });
});
