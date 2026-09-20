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
 *
 * PHASE 298 added the TYPE AND SPACING half, mechanism 18. The sheet Phase 293
 * shipped drew its second line in a 10px step whose own token says "never body
 * text", gave it the only ratio line-height in any row in either tree, left
 * twenty declarations setting a size with no line height, and passed an icon a
 * size that appears nowhere else in the codebase. Every one of those is ONE
 * declaration a later round can write again with every other check green, so
 * each is a rule here and in `build/p293/conformance-manager.mjs` (T17 to T22),
 * where `npm run ablation:p293` proves it can go red:
 *  - no RATIO line-height: a line box is a `--lh-*` LENGTH, never a multiple;
 *  - every `font-size` is paired with a `line-height` in the same block;
 *  - `--text-2xs` nowhere but a chip and the footer;
 *  - every `padding`, `margin` and `gap` is a `--space-*` step, a `--sm-*`
 *    geometry property of `.modal.session-sheet`, `0` or `auto`;
 *  - `--track-caps` on every uppercase rule;
 *  - every `size=` on a `Codicon` or an `AgentIcon`, read from the TSX, is one
 *    of `sm`, `md`, `lg`, 16 or 24.
 *
 * And mechanism 14's own case: the narrow row can never be TALLER than the wide
 * one. The `@media (max-width: 1100px)` block used to set a vertical padding
 * that was shorter than the old wide row and taller than the new one, so the
 * breakpoint would have inverted.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
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
  /** The line the selector starts on, so a failure says where to look. */
  line: number;
  declarations: { property: string; value: string }[];
}

/**
 * Every innermost `selector { body }` of a stylesheet, comments out. A comment
 * is blanked CHARACTER BY CHARACTER with its newlines kept, so `line` is the
 * line a person opens the file at; replacing a multi-line comment with one space
 * moves every line after it.
 *
 * An `@media` wrapper is not a rule and carries no declaration of its own, so
 * this answers the rules INSIDE it and the wrapper belongs to no selector. The
 * one question that is about the media block itself is asked over the text.
 */
function rulesOf(file: string, text: string): Rule[] {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const rules: Rule[] = [];
  for (const m of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const raw = m[1] ?? '';
    const selector = raw.trim().replace(/\s+/g, ' ');
    const lead = raw.length - raw.replace(/^\s+/, '').length;
    const line = code.slice(0, (m.index ?? 0) + lead).split('\n').length;
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
    rules.push({ file, selector, line, declarations });
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

// ---------------------------------------------------------------------------
// Phase 298, mechanism 18: the type scale and the spacing scale
// ---------------------------------------------------------------------------

/** `file:line selector`, so a failure says where to open the file. */
const at = (rule: Rule): string => `${rule.file}:${String(rule.line)} ${rule.selector}`;

const SPACING_PROPERTY =
  /^(padding|margin)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$|^(row-|column-)?gap$/;

/** The two homes `--text-2xs` is for: a chip primitive and the footer. */
const TWO_XS_ALLOWED = /\.sm-foot\b|chip|\.sm-count\b/;

/**
 * T20's ONE named exception, by selector AND property AND value, so a real
 * padding written on the same rule is still a finding. `.sr-only`'s `-1px` is
 * the app's visually-hidden clip idiom and not spacing. An exception that
 * matches nothing is itself a failure: a list that rots into a blanket pass is
 * worse than no list.
 */
const SPACING_EXCEPTIONS = [
  { selector: '.session-sheet .sr-only', property: 'margin', value: '-1px' }
];

/** T21's ONE named exception: `::first-letter` raises one letter, which takes no tracking. */
const UPPERCASE_EXCEPTIONS = [/::first-letter/];

/** The `--sm-*` properties the sheet declares on its own selector. */
const SHEET_VARS = new Set(
  RULES.filter((rule) =>
    /(^|[\s,])\.modal\.session-sheet($|[\s,:])/.test(rule.selector)
  ).flatMap((rule) =>
    rule.declarations.filter((d) => d.property.startsWith('--sm-')).map((d) => d.property)
  )
);

describe('the type scale is the app’s (Phase 298, mechanism 18)', () => {
  it('holds no RATIO line-height: every line box is a --lh-* length', () => {
    // `line-height: 1.5` on `--text-2xs` drew 15px — the only ratio line-height
    // in any row in either tree, and one pixel off `--lh-2xs`.
    const bad = RULES.flatMap((rule) =>
      rule.declarations
        .filter(
          (d) =>
            d.property === 'line-height' &&
            !/^var\(--lh-[a-z0-9-]+\)$/.test(d.value) &&
            d.value !== 'normal'
        )
        .map((d) => `${at(rule)} { line-height: ${d.value} }`)
    );
    expect(bad).toEqual([]);
  });

  it('pairs every font-size with a line-height in the same block', () => {
    // `body { line-height: var(--lh-base) }` (styles/globals.css:55-61) is a
    // LENGTH, so it inherits as a computed 20px: a rule that sets only a
    // font-size draws a 20px line box whatever its size. The `font` SHORTHAND
    // always carries a line-height of its own, so it is never the unpaired case.
    const bad = RULES.filter(
      (rule) =>
        rule.declarations.some((d) => d.property === 'font-size') &&
        !rule.declarations.some((d) => d.property === 'line-height')
    ).map(at);
    expect(bad).toEqual([]);
  });

  it('draws --text-2xs nowhere but a chip and the footer', () => {
    // tokens.css:219-225, on the token itself: "Never body text".
    const bad = RULES.filter(
      (rule) =>
        !TWO_XS_ALLOWED.test(rule.selector) &&
        rule.declarations.some((d) => d.value.includes('var(--text-2xs)'))
    ).map(at);
    expect(bad).toEqual([]);
  });
});

describe('spacing, tracking and the icon scale (Phase 298, mechanism 18)', () => {
  it('reads the sheet’s own geometry properties, so a --sm-* is not a literal', () => {
    expect(SHEET_VARS.size).toBeGreaterThan(0);
  });

  it('takes every padding, margin and gap from a --space-* step or the sheet’s own geometry', () => {
    const bad: string[] = [];
    const hits = SPACING_EXCEPTIONS.map(() => 0);
    for (const rule of RULES) {
      for (const d of rule.declarations) {
        if (!SPACING_PROPERTY.test(d.property)) continue;
        const ex = SPACING_EXCEPTIONS.findIndex(
          (one) =>
            one.selector === rule.selector &&
            one.property === d.property &&
            one.value === d.value
        );
        if (ex !== -1) {
          hits[ex] = (hits[ex] ?? 0) + 1;
          continue;
        }
        const left = d.value
          .replace(/var\(--space-\d+\)/g, ' ')
          .replace(new RegExp(`var\\((?:${[...SHEET_VARS].join('|')})\\)`, 'g'), ' ')
          .replace(/\bcalc\b/g, ' ')
          .replace(/[()+*\/-]/g, ' ')
          .replace(/\bauto\b/g, ' ')
          .replace(/\b0\b/g, ' ')
          .trim();
        if (left !== '') bad.push(`${at(rule)} { ${d.property}: ${d.value} }`);
      }
    }
    expect(bad).toEqual([]);
    // The exception must still match something, or it is a blanket pass.
    expect(hits).toEqual(SPACING_EXCEPTIONS.map(() => 1));
  });

  it('sets --track-caps on every uppercase rule', () => {
    // The heading idiom is unanimous across the app's 26 uppercase rules.
    const upper = RULES.filter((rule) =>
      rule.declarations.some(
        (d) => d.property === 'text-transform' && d.value === 'uppercase'
      )
    );
    const excused = upper.filter((rule) =>
      UPPERCASE_EXCEPTIONS.some((one) => one.test(rule.selector))
    );
    const bad = upper
      .filter((rule) => !UPPERCASE_EXCEPTIONS.some((one) => one.test(rule.selector)))
      .filter(
        (rule) =>
          !rule.declarations.some(
            (d) => d.property === 'letter-spacing' && d.value === 'var(--track-caps)'
          )
      )
      .map(at);
    expect(bad).toEqual([]);
    expect(excused.length).toBe(UPPERCASE_EXCEPTIONS.length);
  });

  it('passes Codicon and AgentIcon only a size the app draws', () => {
    // 12/14/16 as sm/md/lg, with 24 the app's one larger exception. Phase 293
    // shipped `size={19}`, the only 19 in the codebase, and `size={28}`, larger
    // than anything the app draws. An element that passes NO size takes its
    // component's own default and is the shape this rule prefers, so absence is
    // not asked about.
    const WORDS = new Set(['sm', 'md', 'lg']);
    const NUMBERS = new Set([16, 24]);
    const bad: string[] = [];
    let sites = 0;
    for (const name of readdirSync(DIR).filter((one) => one.endsWith('.tsx'))) {
      const path = resolve(DIR, name);
      const sf = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );
      const walk = (node: ts.Node): void => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(sf);
          if (tag === 'Codicon' || tag === 'AgentIcon') {
            sites += 1;
            for (const a of node.attributes.properties) {
              if (!ts.isJsxAttribute(a) || a.name.getText(sf) !== 'size') continue;
              const init = a.initializer;
              const ok =
                init !== undefined && ts.isStringLiteral(init)
                  ? WORDS.has(init.text)
                  : init !== undefined &&
                      ts.isJsxExpression(init) &&
                      init.expression !== undefined &&
                      ts.isNumericLiteral(init.expression)
                    ? NUMBERS.has(Number(init.expression.text))
                    : false;
              if (!ok) {
                const line =
                  sf.getLineAndCharacterOfPosition(a.getStart(sf)).line + 1;
                bad.push(
                  `${name}:${String(line)} <${tag} size=${init === undefined ? '(no value)' : init.getText(sf)}>`
                );
              }
            }
          }
        }
        ts.forEachChild(node, walk);
      };
      walk(sf);
    }
    expect(bad).toEqual([]);
    expect(sites).toBeGreaterThan(10);
  });
});

describe('the narrow row is never taller than the wide one (Phase 298, mechanism 14)', () => {
  /** The `--space-*` steps, read from tokens.css so no number is written here. */
  const SPACE = new Map<string, number>();
  for (const m of readFileSync(
    resolve(DIR, '..', 'styles', 'tokens.css'),
    'utf8'
  ).matchAll(/(--space-\d+):\s*(\d+)px/g)) {
    SPACE.set(m[1] ?? '', Number(m[2]));
  }

  /** The first (top) term of a `padding` shorthand, in pixels, or null. */
  const topOf = (value: string): number | null => {
    const first = value.trim().split(/\s+/)[0] ?? '';
    const token = /^var\((--space-\d+)\)$/.exec(first);
    if (token !== null) return SPACE.get(token[1] ?? '') ?? null;
    if (first === '0') return 0;
    const px = /^(\d+)px$/.exec(first);
    return px === null ? null : Number(px[1]);
  };

  /** The text between the braces of the block an at-rule opens at `from`. */
  const blockAt = (text: string, from: number): string => {
    const open = text.indexOf('{', from);
    if (open === -1) return '';
    let depth = 0;
    for (let i = open; i < text.length; i += 1) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') {
        depth -= 1;
        if (depth === 0) return text.slice(open + 1, i);
      }
    }
    return '';
  };

  it('the 1100px breakpoint shortens the cell horizontally and never vertically', () => {
    // The 1100 is a literal because a custom property is not readable in a media
    // query. Before this phase the block set 12/8 against a wide 16/12, which is
    // shorter than the old row and TALLER than the new one: the breakpoint would
    // have inverted.
    const text = readFileSync(resolve(DIR, 'session-manager.css'), 'utf8');
    const mediaAt = text.indexOf('@media (max-width: 1100px)');
    expect(mediaAt).toBeGreaterThan(0);
    const wide = rulesOf('wide', text.slice(0, mediaAt)).filter(
      (rule) =>
        /tbody td$/.test(rule.selector) &&
        rule.declarations.some((d) => d.property === 'padding')
    );
    const narrow = rulesOf('narrow', blockAt(text, mediaAt)).filter((rule) =>
      rule.declarations.some((d) => d.property === 'padding')
    );
    // Both halves must be FOUND, so this case cannot pass on a missing rule.
    expect(wide.length).toBe(1);
    expect(narrow.length).toBeGreaterThan(0);
    const wideTop = topOf(
      wide[0]?.declarations.find((d) => d.property === 'padding')?.value ?? ''
    );
    expect(wideTop).not.toBeNull();
    for (const rule of narrow) {
      const value =
        rule.declarations.find((d) => d.property === 'padding')?.value ?? '';
      const top = topOf(value);
      expect(top, `${rule.selector} { padding: ${value} }`).not.toBeNull();
      expect(
        top ?? Infinity,
        `${rule.selector} { padding: ${value} } is taller than the wide row`
      ).toBeLessThanOrEqual(wideTop ?? 0);
    }
  });
});
