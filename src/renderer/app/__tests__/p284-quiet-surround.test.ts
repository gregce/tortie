/**
 * THE QUIET SURROUND, READ AS TEXT (Phase 284).
 *
 * The operator chose a look from a design study on 2026-09-17: the WORK gets
 * the window's one complete outline, and the chrome around it goes quiet. This
 * file holds the SURROUND's half of that, the five stylesheets that draw the
 * titlebar, the activity bar, the sidebar, the session list, the project rail
 * and the usage meter. The work's own frame is held by p284-work-frame.test.ts
 * and the width arithmetic by state/__tests__/chrome-geometry.test.ts.
 *
 * probe:p284 reads the same rulings as computed styles in the running app and
 * is not in the commit battery. This file is what the battery runs, and every
 * case in it is a thing a later tidy-up would undo in one line without any
 * other test noticing:
 *
 *  - a hairline DELETED instead of made transparent, which grows a 36px
 *    band's content box from 35px to 36px and moves every centred child half
 *    a pixel, so no rectangle read at the parent commit compares any more;
 *  - `background:` written on the activity item's hover rule, which resets
 *    `background-clip` and turns the chip into a full-bleed square on hover
 *    and on hover only;
 *  - an inset `box-shadow` on the selected row, which silently takes a
 *    focused row's ring because the global ring is a box-shadow at lower
 *    specificity;
 *  - a 2px accent bar coming back on ONE of the four places it stood;
 *  - a resize handle that Tab reaches and that shows nothing when it has the
 *    keyboard, which the session list's handle was until this phase.
 *
 * It reads the stylesheets as bytes because there is no CSSOM in this lane,
 * the way p1811-mini-clothes.test.ts next door holds its own repair.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = join(__dirname, '..');
const read = (...parts: string[]): string =>
  readFileSync(join(APP_DIR, ...parts), 'utf8');

const SHEETS = {
  app: read('..', 'styles', 'app.css'),
  activity: read('activity-bar.css'),
  projects: read('project-rail.css'),
  rail: read('session-rail.css'),
  usage: read('usage-meter.css')
} as const;

type SheetName = keyof typeof SHEETS;
const SHEET_NAMES = Object.keys(SHEETS) as SheetName[];

interface Rule {
  selector: string;
  body: string;
  /** Offset of the rule in the comment-stripped sheet, for source order. */
  at: number;
}

/**
 * Comments become spaces of the SAME LENGTH, so an offset in the stripped
 * text is an offset in the file and source order can be compared.
 */
const strip = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, (comment) => ' '.repeat(comment.length));

/** Every rule in a sheet, comments stripped, selector whitespace folded. */
function rulesOf(css: string): Rule[] {
  const bare = strip(css);
  const out: Rule[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(bare)) !== null) {
    out.push({
      selector: (match[1] ?? '').trim().replace(/\s+/g, ' '),
      body: (match[2] ?? '').trim(),
      at: match.index
    });
  }
  return out;
}

const RULES: Record<SheetName, Rule[]> = {
  app: rulesOf(SHEETS.app),
  activity: rulesOf(SHEETS.activity),
  projects: rulesOf(SHEETS.projects),
  rail: rulesOf(SHEETS.rail),
  usage: rulesOf(SHEETS.usage)
};

/** The one rule with exactly this selector list. More than one is a finding. */
function rule(sheet: SheetName, selector: string): Rule {
  const found = RULES[sheet].filter((one) => one.selector === selector);
  expect(found.map((one) => one.selector), `${selector} in ${sheet}`).toHaveLength(1);
  return found[0] as Rule;
}

/** The value a rule gives one property, or null. Longhands are not folded. */
function valueOf(body: string, property: string): string | null {
  const escaped = property.replace(/[-]/g, '\\-');
  const match = new RegExp(`(?:^|;)\\s*${escaped}\\s*:\\s*([^;]+)`).exec(body);
  return match === null ? null : (match[1] ?? '').trim().replace(/\s+/g, ' ');
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const;
type Side = (typeof SIDES)[number];

interface QuietRow {
  sheet: SheetName;
  selector: string;
  side: Side;
}

/** build/p284/SPEC.md §9.3, one row per rule, in its order. */
const QUIET: QuietRow[] = [
  { sheet: 'app', selector: '.titlebar', side: 'bottom' },
  { sheet: 'app', selector: '.activitybar', side: 'right' },
  { sheet: 'activity', selector: '.activitybar.activitybar-row', side: 'bottom' },
  { sheet: 'app', selector: '.sidebar', side: 'right' },
  { sheet: 'app', selector: '.view-header', side: 'bottom' },
  { sheet: 'app', selector: '.session-dock', side: 'left' },
  { sheet: 'app', selector: '.dock-toolbar', side: 'bottom' },
  { sheet: 'projects', selector: '.prail-band', side: 'bottom' }
];

/**
 * The ninth, which the spec's census missed. `.branch-header` is Source
 * Control's view header: zoom/zoom.css lists it beside `.view-header` as a
 * band slice, and probe:p149 reads one OR the other as "the view's header".
 * Left at --border, four views would have lost their rule and one kept it.
 */
const NINTH: QuietRow = { sheet: 'app', selector: '.branch-header', side: 'bottom' };

const rowName = (row: QuietRow): string => `${row.sheet} ${row.selector} ${row.side}`;

describe('the five sheets were read', () => {
  it('finds rules in every one, so nothing below passes on an empty read', () => {
    for (const name of SHEET_NAMES) {
      expect(RULES[name].length, name).toBeGreaterThan(2);
    }
    expect(RULES.app.length).toBeGreaterThan(200);
  });
});

describe('the ground behind the gutters', () => {
  it('gives .shell-body the surround, and leaves .shell on the canvas', () => {
    expect(valueOf(rule('app', '.shell-body').body, 'background')).toBe(
      'var(--bg-sidebar)'
    );
    // The pre-paint agreement with the window's own fill, which focus mode and
    // the Catch Me Up layer rest on. canvas-color-single-source holds the value.
    expect(valueOf(rule('app', '.shell').body, 'background')).toBe('var(--bg-canvas)');
  });
});

describe('the titlebar', () => {
  it('stays 38px and loses its hairline by colour, never by pixel', () => {
    const body = rule('app', '.titlebar').body;
    expect(valueOf(body, 'height')).toBe('38px');
    expect(valueOf(body, 'flex')).toBe('0 0 38px');
    expect(valueOf(body, 'border-bottom')).toBe('1px solid transparent');
  });
});

describe('the hairlines that fall away', () => {
  for (const row of [...QUIET, NINTH]) {
    it(`${row.selector} keeps its 1px on the ${row.side} and draws it transparent`, () => {
      const body = rule(row.sheet, row.selector).body;
      expect(valueOf(body, `border-${row.side}`)).toBe('1px solid transparent');
      // No other side of the same box went quiet with it, and no shorthand
      // beside it puts a colour back.
      for (const other of SIDES.filter((side) => side !== row.side)) {
        expect(valueOf(body, `border-${other}`) ?? '').not.toContain('transparent');
      }
      expect(valueOf(body, 'border')).toBeNull();
      expect(valueOf(body, `border-${row.side}-color`)).toBeNull();
    });
  }

  it('is EXACTLY those nine: no other rule in the five sheets draws a transparent 1px border', () => {
    // At the parent commit 0f2f7f00 not one of the five sheets held the words
    // `solid transparent`, so this census is this phase's work and nothing
    // else. A tenth is a hairline somebody quieted that the operator did not
    // ask for; an eighth is one that came back.
    const census: string[] = [];
    for (const sheet of SHEET_NAMES) {
      for (const one of RULES[sheet]) {
        for (const side of SIDES) {
          if ((valueOf(one.body, `border-${side}`) ?? '').includes('transparent')) {
            census.push(rowName({ sheet, selector: one.selector, side }));
          }
        }
        expect(valueOf(one.body, 'border') ?? '', one.selector).not.toContain(
          'transparent'
        );
      }
    }
    expect(census.sort()).toEqual([...QUIET, NINTH].map(rowName).sort());
  });

  it('keeps the activity row without a right border at all', () => {
    expect(
      valueOf(rule('activity', '.activitybar.activitybar-row').body, 'border-right')
    ).toBe('none');
  });
});

describe('the seams that STAY', () => {
  it('keeps the project rail its edge: it never faces the work, and it parts two lists of names', () => {
    expect(valueOf(rule('projects', '.project-rail').body, 'border-right')).toBe(
      '1px solid var(--border)'
    );
  });

  it('keeps the usage seam, inset 6px with 4px of side padding', () => {
    const body = rule('usage', '.usage-full').body;
    expect(valueOf(body, 'border-top')).toBe('1px solid var(--border)');
    expect(valueOf(body, 'margin')).toBe('0 var(--space-3)');
    expect(valueOf(body, 'padding')).toBe('var(--space-3) var(--space-2)');
  });

  it('leaves the 48px rail its own full-width seams', () => {
    expect(
      valueOf(rule('usage', '.session-dock.collapsed > .usage-mini').body, 'border-top')
    ).toBe('1px solid var(--border)');
    expect(valueOf(rule('rail', '.rail-footer').body, 'border-top')).toBe(
      '1px solid var(--border)'
    );
  });
});

describe('the marker bars are gone from all four places', () => {
  it('leaves no selected::before or active::before rule in any of the five sheets', () => {
    const bars: string[] = [];
    for (const sheet of SHEET_NAMES) {
      for (const one of RULES[sheet]) {
        if (/(?:selected|active)::?(?:before|after)/.test(one.selector)) {
          bars.push(`${sheet} ${one.selector}`);
        }
      }
    }
    expect(bars).toEqual([]);
  });
});

describe('the selected session row', () => {
  const body = (): string => rule('app', '.srow.selected').body;

  it('is a soft fill with a restrained outline inside its own box', () => {
    expect(valueOf(body(), 'background')).toBe('var(--bg-active)');
    expect(valueOf(body(), 'outline')).toBe('1px solid var(--border-active)');
    expect(valueOf(body(), 'outline-offset')).toBe('-1px');
    // The outline follows the radius the row already carries. No 7px token.
    expect(valueOf(rule('app', '.srow').body, 'border-radius')).toBe('var(--r-md)');
  });

  it('is an OUTLINE and never a box-shadow, which would take a focused row its ring', () => {
    // `.srow.selected` is (0,2,0) and globals.css's `:focus-visible` ring is a
    // box-shadow at (0,1,0).
    expect(valueOf(body(), 'box-shadow')).toBeNull();
    expect(valueOf(body(), 'border')).toBeNull();
  });
});

describe('the two full-bleed rails keep the fill alone', () => {
  for (const [sheet, selector] of [
    ['projects', '.prail-row.selected'],
    ['rail', '.rail-item.selected']
  ] as const) {
    it(`${selector} is --bg-active with no outline: an outline on a full-bleed row is two rules across the rail`, () => {
      const body = rule(sheet, selector).body;
      expect(valueOf(body, 'background')).toBe('var(--bg-active)');
      expect(valueOf(body, 'outline')).toBeNull();
      expect(valueOf(body, 'box-shadow')).toBeNull();
      expect(valueOf(body, 'border-radius')).toBeNull();
    });
  }
});

describe('the activity item is a chip', () => {
  it('draws the chip by clipping the BUTTON’S OWN background to its content box', () => {
    const body = rule('app', '.ab-item').body;
    expect(valueOf(body, 'width')).toBe('48px');
    expect(valueOf(body, 'height')).toBe('48px');
    expect(valueOf(body, 'padding')).toBe('var(--space-3)');
    // A background clipped to the content box takes max(0, radius - padding),
    // so --r-md plus the padding on the BOX is --r-md on the chip.
    expect(valueOf(body, 'border-radius')).toBe('calc(var(--r-md) + var(--space-3))');
    expect(valueOf(body, 'background-clip')).toBe('content-box');
  });

  it('follows the cell down to the 36px row with the same arithmetic', () => {
    const body = rule('activity', '.activitybar-row .ab-item').body;
    expect(valueOf(body, 'width')).toBe('36px');
    expect(valueOf(body, 'height')).toBe('36px');
    expect(valueOf(body, 'padding')).toBe('var(--space-2)');
    expect(valueOf(body, 'border-radius')).toBe('calc(var(--r-md) + var(--space-2))');
  });

  it('answers the pointer in --bg-raised and marks the active view in --bg-active', () => {
    expect(valueOf(rule('app', '.ab-item:hover').body, 'background-color')).toBe(
      'var(--bg-raised)'
    );
    expect(valueOf(rule('app', '.ab-item.active').body, 'background-color')).toBe(
      'var(--bg-active)'
    );
  });

  it('never writes the `background` shorthand on an item, which would reset the clip', () => {
    // THE EASIEST MISTAKE IN THE PHASE. The shorthand resets every longhand it
    // does not name, `background-clip` among them, so the chip becomes a
    // full-bleed square in exactly the state that wrote it.
    const shorthand: string[] = [];
    for (const sheet of SHEET_NAMES) {
      for (const one of RULES[sheet]) {
        if (!one.selector.includes('.ab-item')) continue;
        if (valueOf(one.body, 'background') !== null) {
          shorthand.push(`${sheet} ${one.selector}`);
        }
      }
    }
    expect(shorthand).toEqual([]);
  });

  it('states active AFTER hover at equal specificity, so a hovered active item stays active', () => {
    expect(rule('app', '.ab-item.active').at).toBeGreaterThan(
      rule('app', '.ab-item:hover').at
    );
  });

  it('restates no colour in the row variant, so both orientations come from one pair of rules', () => {
    for (const one of RULES.activity) {
      expect(one.body, one.selector).not.toMatch(/background|(?:^|;|\s)color\s*:/);
    }
  });

  it('never reaches the update ring, which is its own button with a fixed 18px drawing', () => {
    // SPEC §9.2 asked for this to be read before the padding landed: a ring
    // sized from an `.ab-item` content box would have shrunk by 12px.
    const ring = read('UpdateRing.tsx');
    expect(ring).toContain('className={`update-ring update-ring-${state.ring}`}');
    expect(ring).not.toContain('ab-item');
    expect(ring).toMatch(/width=\{18\}\s+height=\{18\}/);
  });
});

describe('the resizers live in the gutter and can be found by keyboard', () => {
  /** The three numbers, from the file chrome-geometry.test.ts holds to the constants. */
  const frame = (name: string): number => {
    const match = new RegExp(`${name}\\s*:\\s*(\\d+)px`).exec(
      strip(read('frame-geometry.css'))
    );
    expect(match, `${name} in frame-geometry.css`).not.toBeNull();
    return Number((match as RegExpExecArray)[1]);
  };

  const HANDLES = [
    { selector: '.sidebar-resizer', edge: 'right', border: '.sidebar', side: 'right' },
    { selector: '.dock-resizer', edge: 'left', border: '.session-dock', side: 'left' }
  ] as const;

  /** The house formula. Both handles state it, so they cannot drift apart. */
  const OFFSET = 'calc((var(--frame-gap) + 5px - var(--frame-edge)) / -2 - 1px)';

  for (const handle of HANDLES) {
    it(`${handle.selector} is 5px, offset from the frame's own tokens`, () => {
      const body = rule('app', handle.selector).body;
      expect(valueOf(body, handle.edge)).toBe(OFFSET);
      expect(valueOf(body, 'width')).toBe('5px');
      expect(valueOf(body, 'z-index')).toBe('2');
      expect(valueOf(body, 'cursor')).toBe('col-resize');
      expect(valueOf(body, 'border-radius')).toBe('var(--r-xs)');
      expect(valueOf(body, 'position')).toBe('absolute');
    });

    it(`${handle.selector} sits centred in the pixels the outline leaves free`, () => {
      // An absolutely positioned child is placed against the PADDING box, and
      // its aside keeps a 1px transparent border on the side facing the work.
      // That border is the formula's trailing 1px, so this holds the two rules
      // together: delete the border and the handle is a pixel off centre.
      expect(valueOf(rule('app', handle.border).body, `border-${handle.side}`)).toBe(
        '1px solid transparent'
      );
      const gap = frame('--frame-gap');
      const edge = frame('--frame-edge');
      const offset = (gap + 5 - edge) / -2 - 1;
      const far = -offset - 1; // the handle's far edge, in gutter pixels
      const near = far - 5;
      const free = gap - edge; // the outline takes the pixel nearest the work
      expect(near).toBeGreaterThanOrEqual(1);
      expect(free - far).toBe(near);
      expect(far).toBeLessThan(free);
    });

    it(`${handle.selector} lights in --border-strong under the pointer and while it is dragged`, () => {
      const body = rule(
        'app',
        `${handle.selector}:hover, ${handle.selector}.dragging`
      ).body;
      expect(valueOf(body, 'background')).toBe('var(--border-strong)');
    });

    it(`${handle.selector} has a :focus-visible state, in accent`, () => {
      const body = rule('app', `${handle.selector}:focus-visible`).body;
      expect(valueOf(body, 'background')).toBe('var(--accent)');
      expect(valueOf(body, 'outline')).toBe('none');
    });
  }

  it('gives the session list’s handle the sidebar’s focus rule word for word', () => {
    // A defect fixed in passing: at the parent commit `.dock-resizer` was a
    // real separator tab stop with no focus rule at all.
    expect(rule('app', '.dock-resizer:focus-visible').body).toBe(
      rule('app', '.sidebar-resizer:focus-visible').body
    );
  });
});

describe('the session strip, inside the curve', () => {
  it('rounds the first tab to the frame’s inner radius, so its accent bar follows the curve', () => {
    const first = rule('app', '.stab-list > .stab:first-child');
    expect(valueOf(first.body, 'border-top-left-radius')).toBe(
      'calc(var(--r-frame) - var(--frame-edge))'
    );
    expect(first.at).toBeGreaterThan(rule('app', '.stab.active').at);
    // No lead-in: StripUsageMeter budgets the band from its children and its
    // measured width, and padding here is 14px the meter does not have.
    expect(valueOf(rule('app', '.term-header').body, 'padding')).toBeNull();
    expect(valueOf(rule('app', '.stab-list').body, 'padding')).toBeNull();
  });

  it('keeps BOTH focus signals exactly as they were', () => {
    // The band turns accent while a terminal owns the keyboard…
    const band = rule('app', '.term-header').body;
    expect(valueOf(band, '--bandline')).toBe('var(--border)');
    expect(valueOf(band, 'background')).toBe('var(--bg-sidebar)');
    expect(valueOf(rule('app', '.term-header.term-focused').body, '--bandline')).toBe(
      'var(--accent)'
    );
    expect(valueOf(rule('app', '.strip-tabs > *').body, 'border-bottom')).toBe(
      '1px solid var(--bandline)'
    );
    expect(valueOf(rule('app', '.stab-filler').body, 'border-bottom')).toBe(
      '1px solid var(--bandline)'
    );
    // …and the active tab melts into the terminal, the one sanctioned break.
    const active = rule('app', '.stab.active').body;
    expect(valueOf(active, 'background')).toBe('var(--bg-canvas)');
    expect(valueOf(active, 'border-bottom-color')).toBe('transparent');
    expect(valueOf(active, 'box-shadow')).toBe('inset 0 2px 0 var(--accent)');
  });
});

describe('every colour is a token', () => {
  // conformance:hue rule 26 is the gate, and it takes 13 minutes. These are
  // its two patterns (build/conformance-hue.mjs, COLOUR_IN_VALUE and
  // COLOUR_NAME_IN_VALUE) over the five sheets with comments stripped, which
  // is how the gate reads them. `transparent` matches neither, by design.
  const COLOUR_IN_VALUE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(\s*[\d.]/;
  const COLOUR_NAME_IN_VALUE = /(?:^|[\s,(])(?:white|black)(?=$|[\s,;)])/i;

  for (const sheet of SHEET_NAMES) {
    it(`${sheet} holds no colour literal in any declaration`, () => {
      const literal: string[] = [];
      for (const one of RULES[sheet]) {
        for (const declaration of one.body.split(';')) {
          const colon = declaration.indexOf(':');
          if (colon === -1) continue;
          const value = declaration.slice(colon + 1);
          if (COLOUR_IN_VALUE.test(value) || COLOUR_NAME_IN_VALUE.test(value)) {
            literal.push(`${one.selector} { ${declaration.trim()} }`);
          }
        }
      }
      expect(literal).toEqual([]);
    });
  }
});

describe('nothing was added below the S4A marker', () => {
  // split/__tests__/focus-affordance.test.ts reads app.css from this marker to
  // the END of the file, comments included, and allows one --accent-soft line
  // and no colour literal there. So every rule of this phase sits ABOVE it.
  const MARKER = '/* ---- S4A split surface';
  const at = SHEETS.app.indexOf(MARKER);
  const below = SHEETS.app.slice(at);

  it('finds the marker once', () => {
    expect(at).toBeGreaterThan(-1);
    expect(SHEETS.app.indexOf(MARKER, at + 1)).toBe(-1);
  });

  it('leaves the split block at 5611 bytes, its 7218 less the deleted .strip-readback rules', () => {
    // Read at 0f2f7f00 with `git show HEAD:src/renderer/styles/app.css`, from
    // the marker to the end. A later phase that edits the split block on
    // purpose moves this number and says so; this phase must not.
    //
    // MOVED BY PHASE 320.1, from 7218 to 5611: Phase 100 had appended the
    // `.strip-readback` rules (the band's Read last lines button) below the
    // marker, and Phase 320.1 deleted that button and its rules, 1607 bytes.
    // Nothing of the split block itself moved.
    expect(Buffer.byteLength(below, 'utf8')).toBe(5611);
  });

  it('names nothing of this phase down there, in a rule or in a comment', () => {
    expect(below).not.toMatch(/--frame-gap|--frame-edge|--r-frame|phase 284/i);
  });

  it('puts every rule this phase wrote above it', () => {
    // `strip` keeps every offset, so a rule's `at` is an offset in the file.
    for (const selector of [
      '.shell-body',
      '.ab-item.active',
      '.sidebar-resizer',
      '.dock-resizer',
      '.dock-resizer:focus-visible',
      '.stab-list > .stab:first-child',
      '.srow.selected'
    ]) {
      expect(rule('app', selector).at, selector).toBeLessThan(at);
    }
  });
});
