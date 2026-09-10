#!/usr/bin/env node
/**
 * assert-wide-blocks.mjs — `npm run conformance:wideblocks`. PHASE 248.
 *
 * About 0.3 s. Launches no Electron, starts no tmux server, spawns nothing at
 * all, makes no request and reads nothing under the person's home.
 *
 * THE RULING IT KEEPS EXECUTABLE. A markdown preview caps its PROSE at a 68ch
 * measure and the two children that are not prose — a table's scroller and a
 * code fence — break out of that and take the pane, up to twice the measure.
 * Research 112 measured what the trap cost: `.md-table-scroll` drew 509 px at
 * a 620 px pane, at a 1,000 px pane and at a 1,381 px pane alike, so 557 of
 * this repository's 1,900 real tables lost a column and the operator lost two
 * of five with 443 px of empty canvas beside them.
 *
 * EVERY CLAUSE OF THAT IS ONE LINE A LATER ROUND CAN TIDY AWAY, which is why
 * this file exists rather than a comment. Ten rules, and each is ablated: a
 * copy of the stylesheet with exactly one clause removed must turn exactly the
 * rule that owns it red, and the run says which. A rule that cannot fail is
 * not a rule.
 *
 * RULE 8 IS THE INDEPENDENT HALF. It parses the width expression out of the
 * SHIPPED declaration, evaluates it in node at every pane width the app run
 * drove, and compares the answer to what the app run read off the live DOM.
 * The stylesheet and the browser have to agree, or one of them moved.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[wide-blocks]';
const CSS_REL = 'src/renderer/editor/markdown/markdown.css';
const TOKENS_REL = 'src/renderer/styles/tokens.css';
const READINGS_REL = 'build/p248/out-wide-readings.json';

const say = (l) => console.log(`${TAG} ${l}`);

// ---------------------------------------------------------------------------
// A very small CSS reader. Comments out, then `selector { body }` blocks and
// `@property <name> { body }` at-rules, read by matching braces rather than by
// searching the file for a word.
// ---------------------------------------------------------------------------

export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

export function rulesOf(css) {
  const src = stripComments(css);
  const out = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open === -1) break;
    let depth = 1;
    let j = open + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === '{') depth += 1;
      else if (src[j] === '}') depth -= 1;
      j += 1;
    }
    const selector = src.slice(i, open).trim();
    const body = src.slice(open + 1, j - 1);
    out.push({ selector, body: body.trim() });
    i = j;
  }
  return out;
}

/**
 * The declarations of every rule whose selector matches exactly, joined. A
 * selector may legitimately appear more than once — the Phase 248 block keeps
 * its own `.md-content` rule beside the measure's — so reading only the first
 * one would answer null for a declaration that is really there, and every
 * ablation of it would then pass for the wrong reason.
 */
export function ruleFor(css, selector) {
  const want = selector.replace(/\s+/g, ' ').trim();
  const bodies = rulesOf(css)
    .filter((r) => r.selector.replace(/\s+/g, ' ').trim() === want)
    .map((r) => r.body);
  return bodies.length === 0 ? null : bodies.join(';\n');
}

/** Every rule whose selector list contains the given simple selector. */
export function rulesNaming(css, needle) {
  return rulesOf(css).filter((r) =>
    r.selector
      .split(',')
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .includes(needle)
  );
}

export function declaration(body, prop) {
  if (body === null) return null;
  // Read by depth so a value carrying parentheses and its own colons survives.
  for (const chunk of splitDeclarations(body)) {
    const at = chunk.indexOf(':');
    if (at === -1) continue;
    if (chunk.slice(0, at).trim() !== prop) continue;
    return chunk.slice(at + 1).trim();
  }
  return null;
}

export function splitDeclarations(body) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim() !== '') out.push(cur);
  return out.map((c) => c.trim()).filter((c) => c !== '');
}

// ---------------------------------------------------------------------------
// The arithmetic, re-derived rather than pinned. `min(A, 100cqi - 2 * G)` and
// `max(100%, …)` are evaluated here from the SHIPPED text.
// ---------------------------------------------------------------------------

/**
 * Evaluate the width expression for one pane. `chPx` and `gutterPx` are read
 * from the app run and from tokens.css; nothing here is a constant of its own.
 */
export function evaluateWidth(expr, { paneCqi, chPx, gutterPx, hundredPercent }) {
  const cap = /min\(\s*([0-9.]+)ch\s*,\s*100cqi\s*-\s*2\s*\*\s*var\(--space-8\)\s*\)/.exec(expr);
  if (cap === null) return null;
  const capPx = Number(cap[1]) * chPx;
  const mdWide = Math.min(capPx, paneCqi - 2 * gutterPx);
  return { mdWide, width: Math.max(hundredPercent, mdWide) };
}

// ---------------------------------------------------------------------------
// Colour arithmetic, so the affordance's claim is a number rather than a word.
// ---------------------------------------------------------------------------

export function contrast(aHex, bHex) {
  const lum = (hex) => {
    const h = hex.trim().replace('#', '');
    const parts = h.length === 3 ? h.split('').map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
    const [r, g, b] = parts.map((p) => {
      const v = parseInt(p, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const x = lum(aHex);
  const y = lum(bHex);
  return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 1000) / 1000;
}

/** `--token: #hex;` inside the base block that starts at `startAt`. */
export function tokenValue(tokensCss, token, base) {
  const src = stripComments(tokensCss);
  const blocks = base === 'light'
    ? src.split(/\[data-scheme=(?:'|")?light(?:'|")?\]/).slice(1)
    : [src.split(/\[data-scheme=(?:'|")?light(?:'|")?\]/)[0]];
  const re = new RegExp(`${token.replace('--', '--')}\\s*:\\s*(#[0-9a-fA-F]{3,8})`, 'g');
  let last = null;
  for (const b of blocks) {
    let m;
    while ((m = re.exec(b)) !== null) last = m[1];
  }
  return last;
}

// ---------------------------------------------------------------------------
// The rules.
// ---------------------------------------------------------------------------

const GUTTER_PX = 24; // var(--space-8); rule 8 re-reads it from tokens.css

export function runRules({ css, tokensCss, readings }) {
  const findings = [];
  const notes = [];
  const bad = (rule, why) => findings.push({ rule, why });

  // -- 1. THE PROSE MEASURE DOES NOT MOVE -----------------------------------
  const content = ruleFor(css, '.md-content');
  const measure = declaration(content, 'max-width');
  const centre = declaration(content, 'margin-inline');
  if (measure !== '68ch') bad(1, `.md-content's max-width is ${String(measure)}, not the 68ch measure`);
  if (centre !== 'auto') bad(1, `.md-content's margin-inline is ${String(centre)}, not auto`);
  const widened = rulesNaming(css, '.md-content').filter((r) => {
    const w = declaration(r.body, 'width');
    const mw = declaration(r.body, 'max-width');
    return (w !== null && w !== 'auto') || (mw !== null && mw !== '68ch');
  });
  if (widened.length > 0) bad(1, `a rule widens .md-content itself: ${widened.map((r) => r.selector).join(' / ')}`);

  // -- 2. EXACTLY THE TWO CHILDREN THAT ALREADY SCROLL ----------------------
  const wideRules = rulesOf(css).filter((r) => declaration(r.body, 'width') !== null && /var\(--md-wide\)/.test(r.body));
  if (wideRules.length !== 1) bad(2, `${String(wideRules.length)} rules size a block from --md-wide; there must be exactly one`);
  const wide = wideRules[0] ?? null;
  const named = wide === null ? [] : wide.selector.split(',').map((s) => s.replace(/\s+/g, ' ').trim()).sort();
  const WANT = ['.md-content .md-table-scroll', '.md-content pre'];
  if (named.join(' | ') !== WANT.join(' | ')) bad(2, `the wide-block rule names ${named.join(', ') || '(nothing)'} rather than ${WANT.join(' and ')}`);
  // Both must already be scrollers of their own, which is the whole reason
  // these two and nothing else break out: a block that cannot scroll would be
  // cut with no way to read the rest.
  const tableScroll = ruleFor(css, '.md-table-scroll');
  if (declaration(tableScroll, 'overflow-x') !== 'auto') bad(2, '.md-table-scroll no longer scrolls in its own box');
  if (declaration(ruleFor(css, '.md-content pre'), 'overflow-x') !== 'auto') bad(2, '.md-content pre no longer scrolls in its own box');

  // -- 3. PANE-RELATIVE, NEVER VIEWPORT-RELATIVE ----------------------------
  const bodyText = stripComments(css);
  if (!/100cqi/.test(bodyText)) bad(3, 'nothing in the stylesheet is sized from 100cqi, the pane');
  const viewportUnits = bodyText.match(/\b[0-9.]+(?:vw|vh|vmin|vmax|dvw|dvh|svw|svh|lvw|lvh)\b/g) ?? [];
  if (viewportUnits.length > 0) bad(3, `the stylesheet sizes something from the WINDOW: ${viewportUnits.join(', ')}`);

  // -- 4. container-type IS THE CLAUSE THAT MAKES cqi MEAN THE PANE ---------
  const scroll = ruleFor(css, '.md-scroll');
  if (declaration(scroll, 'container-type') !== 'inline-size') {
    bad(4, `.md-scroll declares container-type ${String(declaration(scroll, 'container-type'))}; without inline-size, 100cqi falls back to the window and the document scrolls sideways`);
  }
  const containers = rulesOf(css).filter((r) => declaration(r.body, 'container-type') !== null);
  if (containers.length !== 1) bad(4, `${String(containers.length)} rules declare a container-type; the pane is the only container this surface has`);

  // -- 5. THE CAP IS TWICE THE MEASURE, IN THE MEASURE'S OWN UNIT -----------
  const mdWideDecl = declaration(ruleFor(css, '.md-content'), '--md-wide');
  const capCh = mdWideDecl === null ? null : /min\(\s*([0-9.]+)ch\s*,/.exec(mdWideDecl);
  if (capCh === null) bad(5, `--md-wide is ${String(mdWideDecl)}; the cap must be spelled in ch so it tracks the measure under a font change`);
  else {
    const cap = Number(capCh[1]);
    const measureCh = measure === null ? null : Number(/^([0-9.]+)ch$/.exec(measure)?.[1] ?? 'NaN');
    if (measureCh === null || Number.isNaN(measureCh)) bad(5, 'the measure is not a ch value, so the cap cannot be checked against it');
    else if (cap !== measureCh * 2) bad(5, `the cap is ${String(cap)}ch against a measure of ${String(measureCh)}ch; the ruling is twice the measure`);
    else notes.push(`the cap is ${String(cap)}ch, twice the ${String(measureCh)}ch measure`);
  }
  if (mdWideDecl !== null && !/100cqi\s*-\s*2\s*\*\s*var\(--space-8\)/.test(mdWideDecl)) {
    bad(5, 'the pane term does not subtract the block\'s own two gutters, so a wide block can reach the pane edge');
  }

  // -- 6. THE CAP RESOLVES ONCE, IN THE PROSE FONT --------------------------
  const registered = rulesOf(css).find((r) => /^@property\s+--md-wide$/.test(r.selector.replace(/\s+/g, ' ').trim()));
  if (registered === undefined) {
    bad(6, '--md-wide is not registered with @property, so 136ch substitutes as TEXT and resolves against --font-editor inside pre (981 px against the table\'s 1,114 px)');
  } else {
    const syntax = declaration(registered.body, 'syntax');
    const inherits = declaration(registered.body, 'inherits');
    if (syntax === null || !/<length>/.test(syntax)) bad(6, `@property --md-wide has syntax ${String(syntax)}, which does not compute to a length`);
    if (inherits !== 'true') bad(6, `@property --md-wide has inherits: ${String(inherits)}; the children have to inherit the computed length`);
  }
  const declaredOn = rulesOf(css).filter((r) => declaration(r.body, '--md-wide') !== null).map((r) => r.selector.replace(/\s+/g, ' ').trim());
  if (declaredOn.join(' | ') !== '.md-content') {
    bad(6, `--md-wide is declared on ${declaredOn.join(', ') || '(nothing)'}; it must be declared on .md-content alone, where ch is the prose font`);
  }

  // -- 7. THE BLOCK STAYS CENTRED ON THE PROSE COLUMN ----------------------
  const widthExpr = wide === null ? null : declaration(wide.body, 'width');
  const marginExpr = wide === null ? null : declaration(wide.body, 'margin-inline');
  if (widthExpr === null || !/^max\(\s*100%\s*,\s*var\(--md-wide\)\s*\)$/.test(widthExpr.replace(/\s+/g, ' ').trim())) {
    bad(7, `the width is ${String(widthExpr)}; max(100%, …) is what stops a wide block being NARROWER than the measure`);
  }
  if (marginExpr === null) bad(7, 'the wide block has no margin-inline, so it grows to the right and off centre');
  else {
    const flat = marginExpr.replace(/\s+/g, ' ').trim();
    if (!/^calc\(\s*\(\s*100%\s*-\s*max\(\s*100%\s*,\s*var\(--md-wide\)\s*\)\s*\)\s*\/\s*2\s*\)$/.test(flat)) {
      bad(7, `the centring margin is ${flat}; it must be computed from the SAME expression as the width, or the two drift apart`);
    }
  }

  // -- 8. THE ARITHMETIC AGREES WITH THE BROWSER ---------------------------
  const gutter = Number(/--space-8:\s*([0-9.]+)px/.exec(stripComments(tokensCss))?.[1] ?? 'NaN');
  if (Number.isNaN(gutter)) bad(8, '--space-8 is not a px value in tokens.css');
  else if (gutter !== GUTTER_PX) notes.push(`--space-8 has moved to ${String(gutter)}px`);
  if (readings === null) bad(8, `no app-run readings at ${READINGS_REL}; rule 8 has nothing to agree with`);
  else if (mdWideDecl === null) bad(8, 'no width expression to evaluate');
  else {
    const chPx = readings.chPx;
    let compared = 0;
    for (const [name, r] of Object.entries(readings.widths ?? {})) {
      const f = r.face;
      if (f === null || f === undefined || f.wrap === null) continue;
      // `100cqi` IS THE SCROLLER'S BOX INCLUDING ITS OWN SCROLLBAR GUTTER,
      // measured rather than assumed: the app run reads the box at
      // clientWidth - 38 while a vertical bar is drawn (offsetWidth 1010
      // against clientWidth 1000 at his pane) and at clientWidth - 48 with the
      // heading ruler up, which takes the bar away. So the pane term is the
      // offsetWidth, and the visible gutter is (48 - the bar) / 2, being 19 px
      // at rest and 24 px with the ruler. Never negative, which is why the
      // document cannot scroll sideways at any pane.
      const got = evaluateWidth(mdWideDecl, {
        paneCqi: f.pane.offsetWidth,
        chPx,
        gutterPx: gutter,
        hundredPercent: f.content.inner
      });
      if (got === null) { bad(8, `the width expression could not be evaluated: ${mdWideDecl}`); break; }
      compared += 1;
      const visibleGutter = (f.pane.clientWidth - Math.min(got.width, f.pane.offsetWidth - 2 * gutter)) / 2;
      if (visibleGutter < 0) bad(8, `at the ${name} pane the block is wider than the pane by ${String(-2 * visibleGutter)} px`);
      if (Math.abs(got.width - f.wrap.clientWidth) > 1.5) {
        bad(8, `at the ${name} pane (${String(f.pane.clientWidth)} px) the stylesheet says ${got.width.toFixed(1)} px and the browser drew ${String(f.wrap.clientWidth)} px`);
      }
      if (f.pre !== null && Math.abs(got.width - f.pre.clientWidth) > 3) {
        bad(8, `at the ${name} pane the fence drew ${String(f.pre.clientWidth)} px against the same ${got.width.toFixed(1)} px expression`);
      }
      if (f.docScrollsSideways === true) bad(8, `at the ${name} pane the app run read the DOCUMENT scrolling sideways`);
      if (Math.abs(f.content.width - chPx * 68) > 1 && f.pane.clientWidth >= chPx * 68 + 8) {
        bad(8, `at the ${name} pane the prose column drew ${String(f.content.width)} px against a ${(chPx * 68).toFixed(1)} px measure`);
      }
    }
    if (compared < 3) bad(8, `only ${String(compared)} pane width(s) were compared; the app run drives four`);
    else notes.push(`${String(compared)} pane widths re-derived from the shipped expression and matched to the DOM`);
    const sweep = readings.sweep ?? [];
    const top = sweep.length === 0 ? 0 : Math.max(...sweep.map((s) => s.box));
    const capPx = capCh === null ? 0 : Number(capCh[1]) * chPx;
    if (sweep.length === 0) bad(8, 'the app run recorded no cap sweep');
    else if (Math.abs(top - capPx) > 2) bad(8, `the swept plateau is ${String(top)} px against a declared cap of ${capPx.toFixed(1)} px`);
    else notes.push(`the box stops at ${String(top)} px, first at a pane of ${String((sweep.filter((s) => s.box >= top).sort((a, b) => a.pane - b.pane)[0] ?? { pane: 0 }).pane)} px`);
  }

  // -- 9. THE AFFORDANCE IS A TOKEN AND IT CLEARS THE FLOOR ----------------
  const thumb = ruleFor(css, '.md-table-scroll::-webkit-scrollbar-thumb');
  const thumbHover = ruleFor(css, '.md-table-scroll::-webkit-scrollbar-thumb:hover');
  const thumbColour = declaration(thumb, 'background-color');
  const hoverColour = declaration(thumbHover, 'background-color');
  if (thumbColour === null) bad(9, 'the table box does not lift its own scrollbar thumb; the shared one is --border-strong at 1.594:1 on the canvas');
  if (hoverColour === null) bad(9, 'the table box does not override the shared hover, which drops the thumb to --text-disabled');
  const tokenOf = (v) => (v === null ? null : /^var\((--[a-z0-9-]+)\)$/.exec(v.trim())?.[1] ?? null);
  const restToken = tokenOf(thumbColour);
  const hoverToken = tokenOf(hoverColour);
  if (thumbColour !== null && restToken === null) bad(9, `the thumb is drawn in ${String(thumbColour)}, which is not a token`);
  if (hoverColour !== null && hoverToken === null) bad(9, `the thumb hover is drawn in ${String(hoverColour)}, which is not a token`);
  for (const base of ['dark', 'light']) {
    const canvas = tokenValue(tokensCss, '--bg-canvas', base);
    if (restToken !== null && canvas !== null) {
      const v = tokenValue(tokensCss, restToken, base);
      if (v === null) bad(9, `${restToken} has no value on the ${base} base`);
      else {
        const c = contrast(v, canvas);
        if (c < 3) bad(9, `the thumb reads ${String(c)}:1 on the ${base} canvas, under WCAG 1.4.11's 3:1`);
        else notes.push(`the thumb reads ${String(c)}:1 on the ${base} canvas (${v} on ${canvas})`);
      }
    }
    if (hoverToken !== null && restToken !== null && canvas !== null) {
      const h = tokenValue(tokensCss, hoverToken, base);
      const v = tokenValue(tokensCss, restToken, base);
      if (h !== null && v !== null && contrast(h, canvas) < contrast(v, canvas)) {
        bad(9, `hover DROPS the thumb on the ${base} base, ${String(contrast(h, canvas))}:1 against ${String(contrast(v, canvas))}:1`);
      }
    }
  }

  // -- 10. NO COLOUR LITERAL ANYWHERE IN THIS STYLESHEET -------------------
  const literals = bodyText.match(/(?:#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|lab|lch|color)\()/g) ?? [];
  if (literals.length > 0) bad(10, `colour literal(s) in the stylesheet: ${literals.join(', ')}`);

  return { findings, notes };
}

// ---------------------------------------------------------------------------
// The ablations. One clause each, over a COPY, removed in a `finally`.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  ['the container declaration', 4, (c) => c.replace(/\n\s*container-type: inline-size;/, '')],
  ['the pane unit, made the window', 3, (c) => c.replace(/100cqi/g, '100vw')],
  ['the cap, made a pixel constant', 5, (c) => c.replace(/min\(136ch,/, 'min(1114px,')],
  ['the cap, made a different multiple', 5, (c) => c.replace(/min\(136ch,/, 'min(102ch,')],
  ['the @property registration', 6, (c) => c.replace(/@property --md-wide \{[\s\S]*?\n\}\n\n/, '')],
  ['the property moved onto the children', 6, (c) => c.replace(/\.md-content \{\n  --md-wide:/, '.md-content .md-table-scroll,\n.md-content pre {\n  --md-wide:')],
  ['the centring margin', 7, (c) => c.replace(/\n\s*margin-inline: calc\(\(100% - max\(100%, var\(--md-wide\)\)\) \/ 2\);/, '')],
  ['the max\\(100%, …\\) floor', 7, (c) => c.replace(/width: max\(100%, var\(--md-wide\)\);/, 'width: var(--md-wide);')],
  ['the fence, taken off the rule', 2, (c) => c.replace(/\.md-content \.md-table-scroll,\n\.md-content pre \{\n  width: max/, '.md-content .md-table-scroll {\n  width: max')],
  ['the prose measure, widened with the block', 1, (c) => c.replace(/  max-width: 68ch;\n  margin-inline: auto;/, '  max-width: 136ch;\n  margin-inline: auto;')],
  ['the lifted thumb, put back to the shared one', 9, (c) => c.replace(/(\.md-table-scroll::-webkit-scrollbar-thumb \{\n  background-color: )var\(--text-muted\)/, '$1var(--border-strong)')],
  ['the hover override', 9, (c) => c.replace(/\.md-table-scroll::-webkit-scrollbar-thumb:hover \{[\s\S]*?\n\}\n/, '')]
];

// ---------------------------------------------------------------------------

const cssPath = join(REPO, CSS_REL);
const css = readFileSync(cssPath, 'utf8');
const tokensCss = readFileSync(join(REPO, TOKENS_REL), 'utf8');
let readings = null;
try { readings = JSON.parse(readFileSync(join(REPO, READINGS_REL), 'utf8')); } catch { readings = null; }

const live = runRules({ css, tokensCss, readings });
for (const n of live.notes) say(`note  ${n}`);
for (const f of live.findings) say(`FAIL  rule ${String(f.rule)}: ${f.why}`);

let ablationFailures = 0;
const scratch = mkdtempSync(join(tmpdir(), 'p248-wideblocks-'));
try {
  for (const [name, rule, edit] of ABLATIONS) {
    const copy = edit(css);
    if (copy === css) {
      say(`FAIL  ablation "${name}" found nothing to edit; the clause it removes has been renamed or is gone`);
      ablationFailures += 1;
      continue;
    }
    const file = join(scratch, 'markdown.css');
    writeFileSync(file, copy);
    const got = runRules({ css: readFileSync(file, 'utf8'), tokensCss, readings });
    const hit = got.findings.filter((f) => f.rule === rule);
    if (hit.length === 0) {
      say(`FAIL  ablation "${name}" left rule ${String(rule)} green; that rule cannot fail`);
      ablationFailures += 1;
    } else {
      say(`ok    ablation "${name}" turns rule ${String(rule)} red: ${hit[0].why}`);
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const bad = live.findings.length + ablationFailures;
say('');
if (bad === 0) {
  say(`OK: the 68ch prose measure is untouched, the two children that already scroll break out of it up to twice the measure, the width term is the PANE and never the window, the cap is registered so it resolves once in the prose font, the block stays centred, ${String(Object.keys(readings?.widths ?? {}).length)} pane widths re-derived from the shipped expression agree with the DOM, the table box's thumb clears 3:1 on both bases, and ${String(ABLATIONS.length)} ablations each turned their own rule red.`);
  process.exit(0);
}
say(`FAILED: ${String(live.findings.length)} live finding(s) and ${String(ablationFailures)} ablation(s) that proved nothing.`);
process.exit(1);
