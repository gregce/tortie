#!/usr/bin/env node
/**
 * assert-tab-floor.mjs. A project tab can never again be drawn as one letter
 * and an ellipsis (Phase 189).
 *
 * ## Why this file exists
 *
 * On 2026-08-31 the operator reported twelve projects on the top row reading
 * `g…`, `d..`, `h…`, `roo…`, `runs…`, `tortied…`, with only the active tab
 * identifiable. The measurement taken at the parent found the cause was not a
 * shortage of width. At his own 1512px window the row had 1267.41px and twelve
 * tabs at the measured floor need 1058.16px, so they fit with room to spare.
 * The cause was `min-width: 0` on `.ptab-wrap` and `.ptab`: proportional
 * flex-shrink takes the same PERCENTAGE from every tab, 13.2 percent at his
 * width, and because 50.00px of each tab is chrome that cannot shrink, the
 * whole percentage landed on the name. The tabs with the SHORTEST names lost
 * the largest share of their letters, so `extract-agentic-engineering` kept
 * 124px of name while `gmux` was left 23px and `dev` was left a bare ellipsis
 * with no letter at all.
 *
 * The fix is three declarations and one deletion, and every one of them is a
 * single line a later round can undo without noticing. That is what this gate
 * is for. It reads the stylesheets and the component as text, so it costs
 * about a tenth of a second, spawns nothing, launches no Electron and opens
 * nothing under the person's home.
 *
 * ## What it asserts
 *
 *  1. THE NAME'S FLOOR. `.ptab-name` in src/renderer/styles/app.css declares
 *     `min-width` and it is exactly FLOOR_PX below. The number is stated in
 *     two places, being that rule and this file, and this check is what keeps
 *     them one number. It is not a taste threshold: see the measurement under
 *     FLOOR_PX.
 *  2. THE TAB'S FLOOR IS A LENGTH. `.ptab-wrap` and `.ptab` each declare
 *     `min-width` of exactly TAB_FLOOR_PX, being the name's floor plus the
 *     50.00px of chrome that cannot shrink. `min-width: 0` is the parent's
 *     actual defect. `min-width: auto` is the OTHER way to get it wrong, and
 *     it was measured here on 2026-09-01: a flex item whose minimum comes from
 *     its content takes it from the label's longest WORD, so no tab shrank at
 *     all and the row reached the chevron at his own window width with 267px
 *     of shrink unused and two tabs off screen that did not need to be. A
 *     marked tab's floor is bigger by exactly what the mark occupies, and the
 *     two `:has()` rules that state that are checked too.
 *  3. THE ROW SCROLLS. `.ptab-list` exists and declares `overflow-x: auto`,
 *     `flex: 0 1 auto` and `-webkit-app-region: no-drag`. Without the first
 *     the floor becomes a clipped tail at a narrow window; without the second
 *     two open projects push the + to the far side of the window; without the
 *     third the band's drag region eats the wheel and the row cannot be
 *     scrolled by hand.
 *  4. THE BAND NO LONGER CLIPS. `.titlebar-tabs` declares no `overflow`. A
 *     second clip out there hides the overflow chevron and the + at exactly
 *     the width that needs them.
 *  5. THE MACHINE BADGE HAS A FLOOR AND A CEILING. `.ptab-machine` in
 *     src/renderer/app/machine-badge.css declares `min-width` of at least
 *     BADGE_MIN_PX and still declares a `max-width`. It inherited
 *     `min-width: 0` from `.machine-badge` and was measured at 21.65px in a
 *     960px window, which names no machine.
 *  6. THE ACTIVE TAB KEEPS ITS ADVANTAGE, AND GAINS NO WIDTH. `.ptab.selected`
 *     still declares its own fill and its own text colour, and it declares
 *     NEITHER `min-width` nor `max-width`. The first half is the advantage the
 *     phase forbids regressing. The second half is deliberate and it is the
 *     easier one to undo by accident: a wider selected tab would move every
 *     other tab on every switch, and a row that reflows when you select
 *     something is worse than a row that is even. What the active tab gains
 *     instead is that it is the one tab guaranteed to be on screen, which the
 *     selection effect in Titlebar.tsx does and `npm run probe:p189` measures.
 *  7. ONE TRUNCATION. src/renderer/app/Titlebar.tsx does not pre-truncate a
 *     tab's name in JavaScript. A cut at a character count cannot see the
 *     tab's width, and the CSS ellipsis then clips its result a second time:
 *     the active tab at the parent drew `extract-agen…en…`, two ellipses in
 *     one label.
 *  8. THE FIXTURES. Every rule above is run over stylesheets and a component
 *     this script writes itself, one clean set that must produce no finding
 *     and six broken ones that must each produce exactly one. A checker nobody
 *     has seen fail is a checker nobody has seen work.
 *
 * ## What it does not assert
 *
 * It does not measure text. Font metrics need a running renderer, and
 * `npm run probe:p189` is where the floor is re-derived off the DOM with
 * canvas measureText against the operator's own twelve project names. This
 * gate holds the number that measurement produced.
 *
 * Run it with `npm run gate:tab-floor`. Registered in
 * build/verification-checks.mjs as a pure contract test.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[tab-floor]';

/**
 * THE MEASURED FLOOR, IN PIXELS OF NAME BOX.
 *
 * Measured on 2026-09-01 with canvas measureText inside the running renderer,
 * using the tab label's own computed font read off the live element:
 * `normal normal 500 13px/normal -apple-system, "system-ui", "Helvetica Neue",
 * sans-serif`, where the ellipsis glyph measures 11.03px. The names are the
 * operator's own twelve, read from his manifest and from the screenshot he
 * reported.
 *
 * WHAT SET IT. The first four characters of every one of those names need a
 * 41.90px name box, and `deadreckon` is the name that needs the most. 46 is
 * that number with 4.1px of headroom for a font or a weight that moves. The
 * shortest prefix that tells each open name apart from all the others needs
 * 38.18px, set by `getspecstory` needing "gets", so four characters clears the
 * identification requirement as well as reading as a word.
 *
 * The tab around it is 50.00px wider, being 10px left padding, 8px dot, 6px
 * gap and 26px right padding reserving the close slot, confirmed at exactly
 * 50.00 for all twelve tabs at 1512px and at 960px. So the tab floor is 96px
 * and a badged tab's is 146px.
 *
 * A LATER ROUND MUST RE-MEASURE RATHER THAN NUDGE THIS, and re-measuring means
 * editing this number, the `.ptab-name` rule and the note in it together.
 */
const FLOOR_PX = 46;

/**
 * The tab around that name: 10px left padding, 8px dot, 6px gap and 26px right
 * padding reserving the close slot. Confirmed at exactly 50.00 for all twelve
 * of his tabs at 1512px and at 960px, so the tab's own floor is 96px.
 */
const CHROME_PX = 50;
const TAB_FLOOR_PX = FLOOR_PX + CHROME_PX;

/**
 * A tab carrying a mark needs its floor plus what the mark occupies, because
 * the mark has a floor of its own and the NAME is not the thing that gives
 * way. `6px gap + a 20px two digit amber pill` and
 * `6px gap + 4px margin + a 40px machine badge`.
 */
const MARK_FLOORS = [
  ['.badge-attention', 26],
  ['.ptab-machine', 50]
];

/**
 * The machine badge's own floor. 40px leaves 32px inside its 4px padding,
 * which at its 10px type is four characters and the ellipsis. Its 64px ceiling
 * is Phase 90.3's and is unchanged.
 */
const BADGE_MIN_PX = 40;

// ---------------------------------------------------------------------------
// Reading a stylesheet without a CSS parser
// ---------------------------------------------------------------------------

/** Comments out, so a rule quoted in prose is never mistaken for a rule. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * EVERY rule whose selector list contains `selector` as a whole selector, in
 * source order, joined. Returns null when there is no such rule.
 *
 * All of them rather than the last, because these selectors are single classes
 * of equal specificity and a class is often declared in two places: `.ptab-list`
 * has its own rule AND appears in the shared "hosts that position an indicator"
 * list at the bottom of app.css. Reading only one of the two would report a
 * property as absent while the stylesheet declares it.
 */
function ruleBody(css, selector) {
  const text = stripComments(css);
  const bodies = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const selectors = m[1].split(',').map((s) => s.trim());
    if (selectors.includes(selector)) bodies.push(m[2]);
  }
  return bodies.length === 0 ? null : bodies.join(';');
}

/** One declaration's value, or null. The LAST one wins, as the cascade does. */
function declaration(body, property) {
  if (body === null) return null;
  let value = null;
  for (const part of body.split(';')) {
    const at = part.indexOf(':');
    if (at === -1) continue;
    if (part.slice(0, at).trim() === property) value = part.slice(at + 1).trim();
  }
  return value;
}

/**
 * A `<n>px` value as a number, or NaN. A bare `0` counts as 0px, because that
 * is how the defect this gate exists for was actually written.
 */
function px(value) {
  if (value === null) return Number.NaN;
  const text = value.trim();
  if (text === '0') return 0;
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(text);
  return m === null ? Number.NaN : Number(m[1]);
}

// ---------------------------------------------------------------------------
// The scanner. One function, so the fixtures below exercise the real thing.
// ---------------------------------------------------------------------------

/**
 * @param {{ app: string, badge: string, titlebar: string }} sources
 * @returns {string[]} one line per finding, empty when the tree is right
 */
export function scanTabFloor(sources) {
  const found = [];
  const { app, badge, titlebar } = sources;

  // 1. The name's floor.
  const nameBody = ruleBody(app, '.ptab-name');
  if (nameBody === null) {
    found.push('.ptab-name has no rule in app.css');
  } else {
    const value = declaration(nameBody, 'min-width');
    const n = px(value);
    if (Number.isNaN(n)) {
      found.push(
        `.ptab-name declares min-width ${value === null ? '(nothing)' : value} rather than a pixel floor; ` +
          `a tab whose name may shrink to nothing draws one letter and an ellipsis`
      );
    } else if (n !== FLOOR_PX) {
      found.push(
        `.ptab-name declares min-width: ${String(n)}px and the measured floor is ${String(FLOOR_PX)}px; ` +
          're-measure and move both, or move neither'
      );
    }
  }

  // 2. The tab's floor, and the bigger floor a marked tab gets.
  for (const selector of ['.ptab-wrap', '.ptab']) {
    const body = ruleBody(app, selector);
    if (body === null) {
      found.push(`${selector} has no rule in app.css`);
      continue;
    }
    const value = declaration(body, 'min-width');
    const n = px(value);
    if (n !== TAB_FLOOR_PX) {
      found.push(
        `${selector} declares min-width ${value ?? '(nothing)'} and the measured floor is ` +
          `${String(TAB_FLOOR_PX)}px (${String(FLOOR_PX)} of name plus ${String(CHROME_PX)} of chrome). ` +
          'Zero is the reported defect and `auto` is the other way to get it wrong, because a flex ' +
          "item whose minimum comes from its content takes it from the label's longest word and then " +
          'no tab shrinks at all.'
      );
    }
    for (const [mark, bump] of MARK_FLOORS) {
      const marked = ruleBody(app, `${selector}:has(${mark})`);
      const want = TAB_FLOOR_PX + bump;
      if (marked === null) {
        found.push(
          `${selector}:has(${mark}) has no rule, so a tab carrying that mark has the same floor as one ` +
            'without it and the mark is drawn over the close ×'
        );
        continue;
      }
      const got = px(declaration(marked, 'min-width'));
      if (got < want) {
        found.push(
          `${selector}:has(${mark}) declares min-width ${String(got)}px and the mark needs ${String(want)}px`
        );
      }
    }
  }

  // 3. The row scrolls.
  const listBody = ruleBody(app, '.ptab-list');
  if (listBody === null) {
    found.push('.ptab-list has no rule in app.css, so the row of tabs does not scroll');
  } else {
    const wants = [
      ['overflow-x', 'auto', 'the floor becomes a clipped tail at a narrow window'],
      ['flex', '0 1 auto', 'two open projects push the + to the far side of the window'],
      [
        '-webkit-app-region',
        'no-drag',
        "the band's drag region eats the wheel and the row cannot be scrolled by hand"
      ]
    ];
    for (const [property, want, why] of wants) {
      const value = declaration(listBody, property);
      if (value !== want) {
        found.push(
          `.ptab-list declares ${property}: ${value ?? '(nothing)'} and needs ${want}, or ${why}`
        );
      }
    }
  }

  // 4. The band no longer clips.
  const bandBody = ruleBody(app, '.titlebar-tabs');
  if (bandBody === null) {
    found.push('.titlebar-tabs has no rule in app.css');
  } else if (declaration(bandBody, 'overflow') !== null) {
    found.push(
      '.titlebar-tabs declares overflow again; a second clip around the scrolling list hides ' +
        'the overflow chevron and the + at exactly the width that needs them'
    );
  }

  // 5. The machine badge's floor and ceiling.
  const badgeBody = ruleBody(badge, '.ptab-machine');
  if (badgeBody === null) {
    found.push('.ptab-machine has no rule in machine-badge.css');
  } else {
    const min = px(declaration(badgeBody, 'min-width'));
    const max = px(declaration(badgeBody, 'max-width'));
    if (Number.isNaN(min) || min < BADGE_MIN_PX) {
      found.push(
        `.ptab-machine declares min-width ${declaration(badgeBody, 'min-width') ?? '(nothing)'} and needs at least ` +
          `${String(BADGE_MIN_PX)}px; without it the badge shrinks with everything else and names no machine`
      );
    } else if (Number.isNaN(max)) {
      found.push(
        '.ptab-machine lost its max-width; the mark would then take the whole tab from the name'
      );
    }
  }

  // 6. The active tab keeps its advantage and gains no width.
  const selectedBody = ruleBody(app, '.ptab.selected');
  if (selectedBody === null) {
    found.push('.ptab.selected has no rule in app.css, so the active tab has no advantage left');
  } else {
    for (const property of ['background', 'color']) {
      if (declaration(selectedBody, property) === null) {
        found.push(
          `.ptab.selected no longer declares ${property}; the active tab is the one a person needs to ` +
            'read most and it may not be regressed to win uniformity'
        );
      }
    }
    for (const property of ['min-width', 'max-width']) {
      if (declaration(selectedBody, property) !== null) {
        found.push(
          `.ptab.selected declares ${property}; a selected tab of its own width moves every other tab ` +
            'on every switch, and a row that reflows when you select something is worse than an even one'
        );
      }
    }
  }

  // 7. One truncation, and it is the one that can see the box.
  const code = titlebar.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  if (/truncateMiddle\(\s*project\.name/.test(code)) {
    found.push(
      'Titlebar.tsx pre-truncates a tab name in JavaScript again; a cut at a character count ' +
        'cannot see the tab and the CSS ellipsis clips its result a second time'
    );
  }

  return found;
}

// ---------------------------------------------------------------------------
// The tree
// ---------------------------------------------------------------------------

const read = (rel) => readFileSync(join(repoRoot, rel), 'utf8');
const sources = {
  app: read('src/renderer/styles/app.css'),
  badge: read('src/renderer/app/machine-badge.css'),
  titlebar: read('src/renderer/app/Titlebar.tsx')
};
const failures = scanTabFloor(sources).map((f) => `the tree: ${f}`);

// ---------------------------------------------------------------------------
// The fixtures, so the scanner is seen to fail
// ---------------------------------------------------------------------------

const GOOD_APP = `
.titlebar-tabs { display: flex; min-width: 0; }
.ptab-list { position: relative; flex: 0 1 auto; min-width: 0; overflow-x: auto; -webkit-app-region: no-drag; }
.ptab-wrap { position: relative; flex: 0 1 auto; min-width: ${String(TAB_FLOOR_PX)}px; }
.ptab { display: inline-flex; max-width: 200px; min-width: ${String(TAB_FLOOR_PX)}px; padding: 0 26px 0 10px; }
.ptab-wrap:has(.badge-attention), .ptab:has(.badge-attention) { min-width: ${String(TAB_FLOOR_PX + 26)}px; }
.ptab-wrap:has(.ptab-machine), .ptab:has(.ptab-machine) { min-width: ${String(TAB_FLOOR_PX + 50)}px; }
.ptab.selected { background: var(--bg-active); color: var(--text-primary); }
.ptab-name { overflow: hidden; text-overflow: ellipsis; min-width: ${String(FLOOR_PX)}px; }
`;
const GOOD_BADGE = `.ptab-machine { margin-left: 4px; min-width: ${String(BADGE_MIN_PX)}px; max-width: 64px; }`;
const GOOD_TITLEBAR = `
// truncateMiddle(project.name, 24) is named here in a comment on purpose.
const a = <span className="ptab-name">{project.name}</span>;
`;

function runFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'p189-gate-'));
  try {
    const cases = [
      ['clean', { app: GOOD_APP, badge: GOOD_BADGE, titlebar: GOOD_TITLEBAR }, 0],
      [
        'the name floor gone',
        { app: GOOD_APP.replace(`min-width: ${String(FLOOR_PX)}px`, 'min-width: 0'), badge: GOOD_BADGE, titlebar: GOOD_TITLEBAR },
        1
      ],
      [
        'min-width: 0 back on the tab',
        { app: GOOD_APP.replace(`.ptab { display: inline-flex; max-width: 200px; min-width: ${String(TAB_FLOOR_PX)}px;`, '.ptab { display: inline-flex; max-width: 200px; min-width: 0;'), badge: GOOD_BADGE, titlebar: GOOD_TITLEBAR },
        1
      ],
      [
        'the content-derived minimum back on the wrapper',
        { app: GOOD_APP.replace(`.ptab-wrap { position: relative; flex: 0 1 auto; min-width: ${String(TAB_FLOOR_PX)}px;`, '.ptab-wrap { position: relative; flex: 0 1 auto; min-width: auto;'), badge: GOOD_BADGE, titlebar: GOOD_TITLEBAR },
        1
      ],
      [
        'a marked tab loses its bigger floor',
        { app: GOOD_APP.replace(`.ptab-wrap:has(.ptab-machine), .ptab:has(.ptab-machine) { min-width: ${String(TAB_FLOOR_PX + 50)}px; }`, ''), badge: GOOD_BADGE, titlebar: GOOD_TITLEBAR },
        2
      ],
      [
        'the row stops scrolling',
        { app: GOOD_APP.replace('overflow-x: auto; ', ''), badge: GOOD_BADGE, titlebar: GOOD_TITLEBAR },
        1
      ],
      [
        'the band clips again',
        { app: GOOD_APP.replace('.titlebar-tabs { display: flex;', '.titlebar-tabs { overflow: hidden; display: flex;'), badge: GOOD_BADGE, titlebar: GOOD_TITLEBAR },
        1
      ],
      [
        'the badge loses its floor',
        { app: GOOD_APP, badge: `.ptab-machine { margin-left: 4px; max-width: 64px; }`, titlebar: GOOD_TITLEBAR },
        1
      ],
      [
        'the active tab loses its fill',
        { app: GOOD_APP.replace('.ptab.selected { background: var(--bg-active); color: var(--text-primary); }', '.ptab.selected { color: var(--text-primary); }'), badge: GOOD_BADGE, titlebar: GOOD_TITLEBAR },
        1
      ],
      [
        'the active tab is given its own width',
        { app: GOOD_APP.replace('.ptab.selected { background: var(--bg-active);', '.ptab.selected { min-width: 160px; background: var(--bg-active);'), badge: GOOD_BADGE, titlebar: GOOD_TITLEBAR },
        1
      ],
      [
        'the JS pre-truncation comes back',
        { app: GOOD_APP, badge: GOOD_BADGE, titlebar: `const a = <span>{truncateMiddle(project.name, 24)}</span>;` },
        1
      ]
    ];
    for (const [label, fixture, want] of cases) {
      // Written to disk and read back, so the fixtures are files this script
      // made rather than strings it held.
      writeFileSync(join(dir, 'app.css'), fixture.app);
      writeFileSync(join(dir, 'machine-badge.css'), fixture.badge);
      writeFileSync(join(dir, 'Titlebar.tsx'), fixture.titlebar);
      const got = scanTabFloor({
        app: readFileSync(join(dir, 'app.css'), 'utf8'),
        badge: readFileSync(join(dir, 'machine-badge.css'), 'utf8'),
        titlebar: readFileSync(join(dir, 'Titlebar.tsx'), 'utf8')
      });
      if (got.length !== want) {
        failures.push(
          `fixture "${label}" produced ${String(got.length)} finding(s) and ${String(want)} were expected: ${got.join(' | ') || 'none'}`
        );
      }
    }
    return cases.length;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const fixtureCount = runFixtures();

if (failures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const f of failures) console.error(`${TAG}   - ${f}`);
  process.exit(1);
}
console.log(
  `${TAG} OK: .ptab-name holds the measured ${String(FLOOR_PX)}px floor, .ptab-wrap and .ptab hold the ` +
    `${String(TAB_FLOOR_PX)}px tab floor with ${String(MARK_FLOORS.length)} bigger floors for the marks, ` +
    `.ptab-list scrolls and is out of the drag region, .titlebar-tabs clips nothing, ` +
    `.ptab-machine keeps a ${String(BADGE_MIN_PX)}px floor under its 64px ceiling, the active tab keeps ` +
    `its fill and takes no width of its own, no tab name is pre-truncated in JavaScript, and ` +
    `${String(fixtureCount)} fixtures behaved`
);
