/**
 * Session focus (Phase 80.1). The STRUCTURAL invariants of the mode's
 * stylesheet, and the one line of App.tsx the stylesheet depends on.
 *
 * These are source-level assertions, for the same reason work-area.test.ts
 * gives: what they guard cannot be observed under jsdom, because it needs a
 * real layout engine and a real xterm, and it is expensive to get wrong.
 *
 *  - `.gmux-focus-measure` exists so focus-flight.ts can ask "where would the
 *    surface be if focus were on" inside ONE task, with no paint and no
 *    ResizeObserver notification. If it stops hiding exactly what
 *    `.session-focus` hides, the destination the flight measures is not the
 *    destination React renders, and the photograph lands in the wrong place.
 *  - a width or height transition anywhere the mode touches is a stream of
 *    ResizeObserver fits and therefore a stream of tmux resizes of live work.
 *  - the traffic lights live in the title band's 76px inset. If the band
 *    collapses or loses the inset, the lights move.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = join(__dirname, '..');
const css = readFileSync(join(APP_DIR, 'focus-mode.css'), 'utf8');
const tokens = readFileSync(
  join(APP_DIR, '..', 'styles', 'tokens.css'),
  'utf8'
);
const appSource = readFileSync(join(APP_DIR, 'App.tsx'), 'utf8');

interface Rule {
  selectors: string[];
  body: string;
}

/** Every rule in a flat stylesheet, comments removed. */
function parseRules(source: string): Rule[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stripped)) !== null) {
    const selectors = (match[1] ?? '')
      .split(',')
      .map((x) => x.trim().replace(/\s+/g, ' '))
      .filter((x) => x.length > 0);
    rules.push({ selectors, body: (match[2] ?? '').trim() });
  }
  return rules;
}

const rules = parseRules(css);

/** Declarations in a rule body, as `property` → `value`. */
function declarations(body: string): [string, string][] {
  return body
    .split(';')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .map((decl) => {
      const at = decl.indexOf(':');
      return [
        decl.slice(0, at).trim().toLowerCase(),
        decl.slice(at + 1).trim().toLowerCase()
      ] as [string, string];
    });
}

/**
 * The properties that move a box. A rule declaring one of these under
 * `.session-focus` has to declare it under `.gmux-focus-measure` too.
 */
const LAYOUT_PROPS = [
  'display',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'flex',
  'flex-basis',
  'padding',
  'padding-left',
  'padding-right',
  'padding-top',
  'padding-bottom',
  'margin',
  'inset',
  'position',
  'gap'
];

function movesABox(rule: Rule): boolean {
  return declarations(rule.body).some(([prop]) => LAYOUT_PROPS.includes(prop));
}

// ---------------------------------------------------------------------------
// The two classes that must never drift apart
// ---------------------------------------------------------------------------

describe('.session-focus and .gmux-focus-measure', () => {
  it('lay out identically, because every layout rule names both in one rule', () => {
    const layoutRules = rules.filter(movesABox);
    const touching = layoutRules.filter((r) =>
      r.selectors.some(
        (sel) =>
          sel.includes('.session-focus') || sel.includes('.gmux-focus-measure')
      )
    );
    expect(touching.length).toBeGreaterThan(0);
    for (const rule of touching) {
      for (const sel of rule.selectors) {
        if (sel.includes('.session-focus')) {
          const twin = sel.replace('.session-focus', '.gmux-focus-measure');
          expect(
            rule.selectors,
            `"${sel}" moves a box, so its measure twin must sit in the SAME rule`
          ).toContain(twin);
        }
        if (sel.includes('.gmux-focus-measure')) {
          const twin = sel.replace('.gmux-focus-measure', '.session-focus');
          expect(rule.selectors, `"${sel}" has no settled-mode twin`).toContain(
            twin
          );
        }
      }
    }
  });

  it('hides every region the mode says it hides, and hides it with display:none', () => {
    const hide = rules.find(
      (r) =>
        r.body.replace(/\s/g, '') === 'display:none;' &&
        r.selectors.some((s) => s.includes('.session-focus'))
    );
    expect(hide, 'one grouped display:none rule').toBeDefined();
    const list = (hide?.selectors ?? []).join(' | ');
    for (const region of [
      '.titlebar > *',
      // Phase 129: the project rail is a chrome region, so focus hides it and
      // the measure pass has to hide it too, or the destination the flight
      // reads is 200px narrower than the one React draws.
      "[data-slot='project-rail']",
      "[data-slot='activity-bar']",
      "[data-slot='sidebar']",
      "[data-slot='session-strip']",
      "[data-slot='session-dock']",
      '.center > .term-header',
      '.ed-panel'
    ]) {
      expect(list, `${region} must be hidden in focus mode`).toContain(
        `.shell.session-focus ${region}`
      );
      expect(list, `${region} must be hidden while measuring`).toContain(
        `.shell.gmux-focus-measure ${region}`
      );
    }
  });

  it('never hides a live terminal by shrinking it', () => {
    // @xterm/addon-fit floors columns at 2, so a terminal container at 0 CSS
    // width proposes TWO COLUMNS and fit() resizes the real session. Only
    // display:none is safe, and editor.css says the same thing about its own
    // zero-width rule.
    for (const rule of rules) {
      for (const [prop, value] of declarations(rule.body)) {
        if (prop === 'width' || prop === 'flex-basis') {
          expect(value, `${rule.selectors.join(', ')}`).not.toBe('0');
          expect(value, `${rule.selectors.join(', ')}`).not.toBe('0px');
        }
        if (prop === 'visibility') {
          expect.fail(
            `${rule.selectors.join(', ')} hides with visibility, which keeps ` +
              'the box and so never lets the surface grow'
          );
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Nothing the mode touches may animate a box
// ---------------------------------------------------------------------------

describe('the mode animates opacity and colour, and nothing else', () => {
  const BANNED = [
    'width',
    'height',
    'inset',
    'left',
    'top',
    'right',
    'bottom',
    'flex',
    'flex-basis',
    'margin',
    'padding',
    'all'
  ];

  it('declares no transition or animation on a layout property', () => {
    for (const rule of rules) {
      const named = rule.selectors.some(
        (s) =>
          s.includes('.session-focus') ||
          s.includes('.gmux-focusing') ||
          s.includes('[data-focus-arriving]') ||
          s.includes('.gmux-focus-copy') ||
          s.includes('.gmux-focus-measure') ||
          s.includes('.focus-wash')
      );
      if (!named) continue;
      for (const [prop, value] of declarations(rule.body)) {
        if (!prop.startsWith('transition') && !prop.startsWith('animation')) {
          continue;
        }
        for (const banned of BANNED) {
          expect(
            new RegExp(`(^|[\\s,])${banned}([\\s,]|$)`).test(value),
            `${rule.selectors.join(', ')} animates ${banned}`
          ).toBe(false);
        }
      }
    }
  });

  it('animates something, so the flight is not a claim about an empty file', () => {
    const transitions = rules.flatMap((r) =>
      declarations(r.body).filter(([p]) => p === 'transition')
    );
    expect(transitions.length).toBeGreaterThan(0);
    for (const [, value] of transitions) {
      expect(value).toMatch(/opacity|background-color|border-bottom-color/);
    }
  });
});

// ---------------------------------------------------------------------------
// The leave's fade in
// ---------------------------------------------------------------------------

describe('[data-focus-arriving]', () => {
  const REGIONS = [
    '.titlebar > *',
    "[data-slot='project-rail']",
    "[data-slot='activity-bar']",
    "[data-slot='sidebar']",
    "[data-slot='session-strip']",
    "[data-slot='session-dock']",
    '.center > .term-header',
    '.ed-panel'
  ];

  it('fades in exactly the regions the mode hid, and nothing else', () => {
    const arrive = rules.find((r) =>
      r.selectors.some((sel) => sel.includes('[data-focus-arriving]'))
    );
    expect(arrive, 'one rule for the arrival').toBeDefined();
    const list = arrive?.selectors ?? [];
    for (const region of REGIONS) {
      expect(list, `${region} must come back`).toContain(
        `.shell[data-focus-arriving] ${region}`
      );
    }
    // A region here that the mode never hid would be faded for no reason.
    expect(list).toHaveLength(REGIONS.length);
  });

  it('moves no box, because the chrome is drawn again before it runs', () => {
    const arrive = rules.find((r) =>
      r.selectors.some((sel) => sel.includes('[data-focus-arriving]'))
    );
    const decls = declarations(arrive?.body ?? '');
    expect(decls.map(([p]) => p)).toEqual(['animation']);
    expect(decls[0]?.[1]).toContain('gmux-focus-chrome-in');
  });

  it('animates opacity and only opacity', () => {
    const frames = /@keyframes gmux-focus-chrome-in\s*\{([\s\S]*?)\n\}/.exec(
      css.replace(/\/\*[\s\S]*?\*\//g, '')
    );
    expect(frames, 'the keyframes must exist').not.toBeNull();
    const body = frames?.[1] ?? '';
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    expect(new Set(props)).toEqual(new Set(['opacity']));
  });
});

// ---------------------------------------------------------------------------
// The traffic lights do not move
// ---------------------------------------------------------------------------

describe('the title band', () => {
  it('keeps its 38px height and its 76px traffic-light inset', () => {
    const band = rules.find(
      (r) =>
        r.selectors.includes('.shell.session-focus .titlebar') &&
        movesABox(r)
    );
    expect(band, 'a rule pinning the band under .session-focus').toBeDefined();
    const decls = new Map(declarations(band?.body ?? ''));
    expect(decls.get('height')).toBe('38px');
    expect(decls.get('flex')).toBe('0 0 38px');
    expect(decls.get('padding-left')).toBe('76px');
    // And the measure pass sees the same band, or the destination it reads is
    // 38px taller or shorter than the one React draws.
    expect(band?.selectors).toContain('.shell.gmux-focus-measure .titlebar');
  });

  it('hides the band CHILDREN, never the band', () => {
    for (const rule of rules) {
      const hidesTheBand = rule.selectors.some(
        (s) => s.endsWith('.titlebar') && s.includes('.session-focus')
      );
      if (!hidesTheBand) continue;
      expect(declarations(rule.body).map(([p]) => p)).not.toContain('display');
    }
  });
});

// ---------------------------------------------------------------------------
// The wash
// ---------------------------------------------------------------------------

describe('the wash tokens', () => {
  const NAMES = [
    '--focus-wash-attention',
    '--focus-wash-working',
    '--focus-wash-idle'
  ];

  it('are three literal rgba values, never aliases of one another', () => {
    const values = NAMES.map((name) => {
      const hit = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens);
      expect(hit, `${name} must exist in tokens.css`).not.toBeNull();
      return (hit?.[1] ?? '').trim();
    });
    for (const [i, value] of values.entries()) {
      // The research asked for a wash that can be turned off with one edit.
      // An alias makes taking one alpha to zero move a colour somewhere else.
      expect(value, `${NAMES[i]} must be a literal`).toMatch(/^rgba\(/);
      expect(value, `${NAMES[i]} must not alias another token`).not.toContain(
        'var('
      );
    }
    expect(new Set(values).size, 'three distinct washes').toBe(3);
  });

  it('is drawn by one element that never touches the terminal', () => {
    const wash = rules.find((r) => r.selectors.includes('.focus-wash'));
    expect(wash).toBeDefined();
    const decls = new Map(declarations(wash?.body ?? ''));
    expect(decls.get('pointer-events')).toBe('none');
    expect(decls.get('opacity')).toBe('0');
    // The band, and only the band. A full-window layer would have to paint
    // either over the live terminal or behind it, and behind it needs a
    // stacking context on .shell.
    expect(decls.get('height')).toBe('38px');
  });

  it('carries a state token for each of the three conditions', () => {
    expect(css).toContain("[data-wash='working']");
    expect(css).toContain("[data-wash='attention']");
    expect(css).toContain('var(--focus-wash-idle)');
  });
});

// ---------------------------------------------------------------------------
// The one line of App.tsx the stylesheet depends on
// ---------------------------------------------------------------------------

describe('App.tsx', () => {
  it('puts session-focus on the SAME element that carries shell', () => {
    expect(appSource).toContain(
      "className={`shell${sessionFocus ? ' session-focus' : ''}`}"
    );
  });

  it('imports the stylesheet, so the class has rules to obey', () => {
    expect(appSource).toContain("import './focus-mode.css';");
  });

  it('declares --z-focus-copy under the modal, so the tip stays readable', () => {
    const read = (name: string): number => {
      const hit = new RegExp(`${name}:\\s*(\\d+);`).exec(tokens);
      expect(hit, `${name} must exist`).not.toBeNull();
      return Number(hit?.[1]);
    };
    expect(read('--z-focus-copy')).toBeGreaterThan(read('--z-editor-overlay'));
    expect(read('--z-focus-copy')).toBeLessThan(read('--z-modal'));
    expect(read('--z-focus-copy')).toBeLessThan(read('--z-toast'));
  });
});
