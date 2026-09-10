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
 * PHASE 252 CHANGED WHAT THE WIDTH IS. Phase 248's rule gave both blocks
 * `max(100%, var(--md-wide))` UNCONDITIONALLY, so a fence whose widest line
 * needed ~75ch took the whole cap with the emptiness inside its own border —
 * the operator's three screenshots of 2026-09-10. The box is now sized by its
 * CONTENT between two bounds: `width: max-content`, floored at the prose
 * column (`min-width: 100%`) and capped at `max-width: var(--md-wide)`, and
 * it is centred by `left: 50%` + `translate: -50%` because the old negative
 * margin assumed the used width IS the cap expression and a content-measured
 * width cannot be read back into a calc(). Rule 14 holds the width classes
 * (under / between / over, tolerance ±2px) and rule 15 the centring
 * (tolerance ±1px), both over the probe:p252 readings.
 *
 * EVERY CLAUSE OF THAT IS ONE LINE A LATER ROUND CAN TIDY AWAY, which is why
 * this file exists rather than a comment. Fifteen rules, and each rule is
 * ablated: a copy of the stylesheet with exactly one clause removed must turn
 * exactly the rule that owns it red, and the run says which. A rule that
 * cannot fail is not a rule.
 *
 * RULE 8 IS THE INDEPENDENT HALF. It parses the width expression out of the
 * SHIPPED declaration, evaluates the clamp in node at every pane width the
 * app run drove — the cap re-derived from the expression, the content term
 * and the floor read off the DOM — and compares the answer to what the
 * browser drew. The stylesheet and the browser have to agree, or one moved.
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
const READINGS_252_REL = 'build/p252/out-content-readings.json';

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
export function evaluateWidth(expr, { paneCqi, chPx, gutterPx, hundredPercent, zoom }) {
  // `100cqi` is measured outside the zoomed subtree, so the shipped
  // expression divides THAT term and leaves the two computed inside it alone.
  const cap = /min\(\s*([0-9.]+)ch\s*,\s*100cqi\s*\/\s*var\(--zoom-editor,\s*1\)\s*-\s*2\s*\*\s*var\(--space-8\)\s*\)/.exec(expr);
  if (cap === null) return null;
  const z = zoom === undefined || zoom === null ? 1 : zoom;
  const capPx = Number(cap[1]) * chPx;
  const mdWide = Math.min(capPx, paneCqi / z - 2 * gutterPx);
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

export function runRules({ css, tokensCss, readings, readings252 }) {
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
  const WANT = ['.md-content > .md-table-scroll', '.md-content > pre'];
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
  if (mdWideDecl !== null && !/100cqi\s*(?:\/\s*var\(--zoom-editor[^)]*\)\s*)?-\s*2\s*\*\s*var\(--space-8\)/.test(mdWideDecl)) {
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

  // -- 7. THE CLAMP'S TWO BOUNDS (Phase 252) --------------------------------
  // The width itself is rule 14's (content-sized) and the centring rule 15's;
  // this rule is the floor and the cap, because either bound can be tidied
  // away on its own: without the floor a short fence stops filling the prose
  // column, and without the cap an ASCII page takes whatever it asks for and
  // the pane promise dies with it.
  const widthExpr = wide === null ? null : declaration(wide.body, 'width');
  const minWidthExpr = wide === null ? null : declaration(wide.body, 'min-width');
  const maxWidthExpr = wide === null ? null : declaration(wide.body, 'max-width');
  if (minWidthExpr !== '100%') {
    bad(7, `min-width is ${String(minWidthExpr)}; 100% is the floor that keeps a short fence filling the prose column exactly as before`);
  }
  if (maxWidthExpr !== 'var(--md-wide)') {
    bad(7, `max-width is ${String(maxWidthExpr)}; var(--md-wide) is the cap, and without it the box grows with its content without bound`);
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
      // at rest and 24 px with the ruler.
      //
      // THAT GUTTER IS NOT ON ITS OWN THE REASON THE DOCUMENT DOES NOT SCROLL
      // SIDEWAYS, and the first version of this comment said it was. It is
      // the arithmetic for a block whose containing block is `.md-content`
      // ITSELF and whose subtree is not zoomed. A block under a bullet has
      // the list item as its containing block, and ⌘+ multiplies this term a
      // second time; rules 11 and 12 are those two, and the readings they
      // judge are of nested blocks and of the real chord.
      const got = evaluateWidth(mdWideDecl, {
        paneCqi: f.pane.offsetWidth,
        chPx,
        gutterPx: gutter,
        hundredPercent: f.content.inner
      });
      if (got === null) { bad(8, `the width expression could not be evaluated: ${mdWideDecl}`); break; }
      compared += 1;
      // Phase 252: the used width is the CLAMP — the block's own max-content
      // (read off the DOM by the app run, with the bounds lifted for the
      // read), floored at the column, capped at the derived --md-wide.
      const clamp = (maxContent) => Math.max(Math.min(maxContent, got.mdWide), f.content.inner);
      if (f.wrap.maxContent === null || f.wrap.maxContent === undefined) {
        bad(8, `at the ${name} pane the reading carries no table-box max-content; re-run probe:p248`);
        continue;
      }
      const wantWrap = clamp(f.wrap.maxContent);
      const visibleGutter = (f.pane.clientWidth - Math.min(wantWrap, f.pane.offsetWidth - 2 * gutter)) / 2;
      if (visibleGutter < 0) bad(8, `at the ${name} pane the block is wider than the pane by ${String(-2 * visibleGutter)} px`);
      if (Math.abs(wantWrap - f.wrap.clientWidth) > 2) {
        bad(8, `at the ${name} pane (${String(f.pane.clientWidth)} px) the clamp says ${wantWrap.toFixed(1)} px (content ${String(f.wrap.maxContent)}, cap ${got.mdWide.toFixed(1)}, column ${String(f.content.inner)}) and the browser drew ${String(f.wrap.clientWidth)} px`);
      }
      // The fence carries 1px borders: its rect width (border-box) is what
      // the clamp resolves, where clientWidth sits a systematic 2px under.
      if (f.pre !== null && f.pre.maxContent !== null && f.pre.maxContent !== undefined && Math.abs(clamp(f.pre.maxContent) - f.pre.width) > 2) {
        bad(8, `at the ${name} pane the fence drew ${String(f.pre.width)} px against a clamp of ${clamp(f.pre.maxContent).toFixed(1)} px (content ${String(f.pre.maxContent)})`);
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

  // -- 11. THE BREAK-OUT IS A DIRECT CHILD, AND THE NESTED READINGS --------
  // Both halves of the wide rule resolve against the block's CONTAINING
  // BLOCK. Under a bullet that is the list item, inset by `--space-7` a
  // level, so the centre moves half of that per level while the whole gutter
  // is 19 px: at three levels the block is 11 px past the pane and the
  // document scrolls sideways. The `>` is the only spelling that says the
  // containing block IS the prose column.
  const wideSelectors = wide === null ? [] : wide.selector.split(',').map((x) => x.replace(/\s+/g, ' ').trim());
  for (const sel of wideSelectors) {
    if (!/^\.md-content > [^ >]+$/.test(sel)) {
      bad(11, `"${sel}" is not a DIRECT child of .md-content, so its containing block can be a list item and the bleed is centred on a box the prose column does not share`);
    }
  }
  const inset = Number(/--space-7:\s*([0-9.]+)px/.exec(stripComments(tokensCss))?.[1] ?? 'NaN');
  if (Number.isNaN(inset)) bad(11, '--space-7 is not a px value in tokens.css, so the per-level shift cannot be re-derived');
  else notes.push(`a list level insets by ${String(inset)}px, so a descendant-scoped bleed would move ${String(inset / 2)}px per level against a 19px gutter — 11px past the pane at three levels`);
  const nested = readings?.nested ?? {};
  let nestedRead = 0;
  let deepest = 0;
  for (const [name, r] of Object.entries(nested)) {
    if (r === null || r === undefined) continue;
    nestedRead += 1;
    deepest = Math.max(deepest, ...r.blocks.map((b) => b.depth));
    if (r.docScrollsSideways === true) bad(11, `at the ${name} pane the app run read the document scrolling sideways with nested blocks in it`);
    for (const b of r.blocks) {
      if (b.overRight > 0.5 || b.overLeft > 0.5) bad(11, `at the ${name} pane a ${b.kind} at depth ${String(b.depth)} is ${String(b.overLeft)}px past the left edge and ${String(b.overRight)}px past the right`);
    }
  }
  if (nestedRead < 3) bad(11, `only ${String(nestedRead)} pane(s) were read with nested blocks; the app run drives four`);
  if (deepest < 3) bad(11, `the deepest nested block the app run read is at depth ${String(deepest)}; the fixture nests three levels, so this arm read nothing that could fail`);
  const nestedAblated = readings?.nestedAblated ?? null;
  if (nestedAblated === null) bad(11, 'the app run recorded no descendant-scoped ablation, so nothing shows this arm can fail');
  else {
    const over = nestedAblated.blocks.filter((b) => b.overRight > 0.5 || b.overLeft > 0.5);
    if (over.length === 0 || nestedAblated.docScrollsSideways !== true) {
      bad(11, 'the descendant-scoped ablation the app run injected did NOT walk a block off the pane, so the nested readings prove nothing');
    } else {
      notes.push(`the descendant-scoped rule put back drew ${String(over.length)} block(s) up to ${String(Math.max(...over.map((b) => b.overRight)))}px past the pane and scrolled the document sideways`);
    }
  }

  // -- 12. THE PANE TERM IS CONVERTED INTO THE ZOOMED SUBTREE --------------
  // `zoom.css` scales `.md-content`, which multiplies every used length under
  // it. `100cqi` is the only term here measured OUTSIDE that subtree, so
  // without the division it is multiplied a second time and two presses of ⌘+
  // put the block past the pane.
  if (mdWideDecl !== null && !/100cqi\s*\/\s*var\(--zoom-editor\s*[,)]/.test(mdWideDecl)) {
    bad(12, `the pane term is ${mdWideDecl}; 100cqi is measured outside the zoomed subtree and must be divided by var(--zoom-editor, 1), or ⌘+ multiplies it twice`);
  }
  if (mdWideDecl !== null && !/var\(--zoom-editor,\s*1\)/.test(mdWideDecl)) {
    bad(12, 'var(--zoom-editor) carries no fallback; with the property unset the whole min() is invalid and --md-wide falls back to its 0px initial value');
  }
  const zoomReadings = readings?.zoom ?? {};
  const levels = Object.keys(zoomReadings);
  let zoomRead = 0;
  for (const [level, r] of Object.entries(zoomReadings)) {
    if (r === null || r === undefined) continue;
    zoomRead += 1;
    if (r.zoom !== '' && Math.abs(Number(r.zoom) - Number(level)) > 1e-6) bad(12, `the reading filed under ${level}x was taken at --zoom-editor ${r.zoom}`);
    if (r.docScrollsSideways === true) bad(12, `at ${level}x the app run read the document scrolling sideways`);
    for (const b of r.blocks) {
      if (b.overRight > 0.5 || b.overLeft > 0.5) bad(12, `at ${level}x a ${b.kind} at depth ${String(b.depth)} is ${String(b.overRight)}px past the right edge`);
    }
    if (r.candidate !== undefined && r.candidate !== '' && Number.parseFloat(r.candidate) === 0) {
      bad(12, `at ${level}x the browser could not compute the divided expression (the candidate property fell back to its 0px initial value)`);
    }
  }
  if (zoomRead < 4) bad(12, `only ${String(zoomRead)} zoom level(s) were read; the app run drives five (${levels.join(', ') || 'none'})`);
  else notes.push(`${String(zoomRead)} zoom levels read on the real chord, ${levels.join('x, ')}x`);
  const zoomAblated = readings?.zoomAblated ?? null;
  if (zoomAblated === null) bad(12, 'the app run recorded no undivided-pane-term ablation, so nothing shows the zoom readings can fail');
  else if (zoomAblated.docScrollsSideways !== true || zoomAblated.blocks.every((b) => b.overRight <= 0.5)) {
    bad(12, 'the undivided pane term put back did NOT walk the block off the pane, so the zoom readings prove nothing');
  } else {
    notes.push(`the undivided pane term put back drew ${String(Math.max(...zoomAblated.blocks.map((b) => b.width)))}px in a ${String(zoomAblated.pane.clientWidth)}px pane and scrolled the document sideways`);
  }

  // -- 13. A TABLE NARROWER THAN ITS BOX KEEPS THE PAGE'S AXIS -------------
  // The break-out is unconditional because CSS cannot ask how wide a table
  // wants to be. 226 of this repository's 1,900 tables already fitted the
  // measure, and in a pane-wide box with no centring they are drawn 302px
  // left of every paragraph around them.
  const axisRule = ruleFor(css, '.md-content > .md-table-scroll > table');
  if (declaration(axisRule, 'margin-inline') !== 'auto') {
    bad(13, `a table inside a broken-out box has margin-inline ${String(declaration(axisRule, 'margin-inline'))}; without auto a table narrower than its box sits in the corner of it`);
  }
  const axis = readings?.axis ?? null;
  if (axis === null) bad(13, 'the app run recorded no axis reading');
  else {
    const narrow = axis.blocks.filter((b) => b.kind === 'table' && b.depth === 0 && b.inner !== null && b.inner.width < b.width - 1);
    if (narrow.length === 0) bad(13, 'no table in the app run was narrower than the box it was given, so this arm read nothing');
    for (const b of narrow) {
      const off = Math.abs((b.left + b.right) / 2 - (b.inner.left + b.inner.right) / 2);
      if (off > 1) bad(13, `a ${String(b.inner.width)}px table in a ${String(b.width)}px box is ${off.toFixed(1)}px off its box's axis`);
      else notes.push(`a ${String(b.inner.width)}px table sits centred in the ${String(b.width)}px box the break-out gave it`);
    }
  }
  const axisAblated = readings?.axisAblated ?? null;
  if (axisAblated === null) bad(13, 'the app run recorded no corner ablation, so nothing shows the axis reading can fail');
  else {
    // Since Phase 252 the box fits its content, so the widest box a narrow
    // table gets is the prose column: the corner is the BOX's left edge.
    const cornered = axisAblated.blocks.filter((b) => b.kind === 'table' && b.depth === 0 && b.inner !== null && b.inner.width < b.width - 50 && Math.abs(b.inner.left - b.left) < 2 && (b.left + b.right) / 2 - (b.inner.left + b.inner.right) / 2 > 20);
    if (cornered.length === 0) bad(13, 'the centring taken off did NOT leave a narrow table in the corner of its box, so the axis reading proves nothing');
    else notes.push(`with the centring off, the narrow table sits ${String(Math.round((cornered[0].left + cornered[0].right) / 2 - (cornered[0].inner.left + cornered[0].inner.right) / 2))}px left of its box's axis`);
  }

  // -- 14. THE BOX FITS ITS CONTENT (Phase 252) -----------------------------
  // The operator's report, 2026-09-10: three fences and ASCII diagrams drawn
  // at the full cap with most of the box empty inside its own border. The
  // width is the content's own max-content between the bounds, and every
  // reading is judged in three classes: UNDER the column draws at exactly
  // the column, BETWEEN the column and the cap draws at ITS OWN width and
  // not at the cap, OVER the cap draws at the cap with the scroller live.
  // Tolerance ±2px — clientWidth is an integer and the intrinsic width is
  // fractional, so one CSS pixel each side of the rounding.
  if (widthExpr !== 'max-content') {
    bad(14, `the width is ${String(widthExpr)}; max-content is what sizes the box by its content, and anything else re-answers the operator's screenshots`);
  }
  if (readings252 === null) bad(14, `no app-run readings at ${READINGS_252_REL}; run probe:p252`);
  else {
    const classes = { under: 0, between: 0, over: 0 };
    const readingsList = [
      ...Object.entries(readings252.panes ?? {}),
      ...Object.entries(readings252.light ?? {}).map(([k, v]) => [`light-${k}`, v])
    ];
    for (const [name, rd] of readingsList) {
      if (rd === null || rd === undefined) continue;
      if (rd.docScrollsSideways === true) bad(14, `at the ${name} reading the document scrolls sideways`);
      for (const b of rd.blocks) {
        const want = Math.max(Math.min(b.maxContent, rd.mdWidePx), rd.inner);
        if (Math.abs(b.client - want) > 2) {
          bad(14, `at ${name} the ${b.id} box drew ${String(b.client)}px against a clamp of ${want.toFixed(1)}px (content ${String(b.maxContent)}, cap ${String(rd.mdWidePx)}, column ${String(rd.inner)})`);
          continue;
        }
        if (b.maxContent <= rd.inner + 2) classes.under += 1;
        else if (b.maxContent < rd.mdWidePx - 4) {
          classes.between += 1;
          if (b.client > rd.mdWidePx - 4) bad(14, `at ${name} the ${b.id} box is at the cap (${String(b.client)}px of ${String(rd.mdWidePx)}px) while its content asks ${String(b.maxContent)}px — the operator's screenshot`);
        } else {
          classes.over += 1;
          // A fence over the cap must scroll (its content cannot wrap); a
          // table whose min-content fits the cap compresses instead.
          if (b.kind === 'pre' && b.canScroll !== true && b.maxContent > rd.mdWidePx + 2) bad(14, `at ${name} the ${b.id} box is at the cap and its scroller is dead`);
        }
      }
    }
    for (const k of ['under', 'between', 'over']) {
      if (classes[k] === 0) bad(14, `no reading fell in the "${k}" width class, so that clause was asserted by nothing`);
    }
    notes.push(`width classes read: ${String(classes.under)} under the column, ${String(classes.between)} between, ${String(classes.over)} at the cap`);
    // THE PARENT'S RULE, injected by the app run: a between-class box must
    // read AT the cap there — the defect — or this rule could not fail; and
    // a box at or over the cap must be UNMOVED byte for byte, which is the
    // operator's two good tables.
    const parent = readings252.parent ?? null;
    if (parent === null) bad(14, 'the app run recorded no parent-rule arm, so nothing shows the between class can fail');
    else {
      let atCap = 0;
      let unmoved = 0;
      const moved = [];
      for (const [name, rd] of Object.entries(parent)) {
        const live = (readings252.panes ?? {})[name] ?? null;
        if (rd === null || live === null) continue;
        for (const b of rd.blocks) {
          const liveB = live.blocks.find((x) => x.id === b.id) ?? null;
          if (liveB === null) continue;
          if (b.maxContent > rd.inner + 2 && b.maxContent < rd.mdWidePx - 4 && Math.abs(b.client - Math.max(rd.mdWidePx, rd.inner)) <= 2) atCap += 1;
          if (b.maxContent >= rd.mdWidePx - 4) {
            if (b.client === liveB.client) unmoved += 1;
            else moved.push(`${name}/${b.id} ${String(b.client)} -> ${String(liveB.client)}`);
          }
        }
      }
      if (atCap === 0) bad(14, "the parent's rule put back did NOT draw a between-class box at the cap, so the defect reading proves nothing");
      if (moved.length > 0) bad(14, `a box at the cap MOVED between the parent's rule and the clamp: ${moved.join(', ')}`);
      else notes.push(`under the parent's rule ${String(atCap)} between-class box(es) read at the cap, and ${String(unmoved)} at-the-cap box(es) are unmoved byte for byte`);
    }
  }

  // -- 15. THE CENTRING HOLDS AT EVERY WIDTH (Phase 252) --------------------
  // The old negative margin was computed from the SAME expression as the
  // width; a content-measured width cannot be read back into a calc(), and
  // auto margins are treated as zero on a box wider than its containing
  // block. `left: 50%` walks the box right by half the column and
  // `translate: -50%` walks it back by half its OWN width, which centres any
  // used width on the column's axis. Tolerance ±1px — half of it subpixel
  // translate rounding.
  const posExpr = wide === null ? null : declaration(wide.body, 'position');
  const leftExpr = wide === null ? null : declaration(wide.body, 'left');
  const translateExpr = wide === null ? null : declaration(wide.body, 'translate');
  if (posExpr !== 'relative') bad(15, `position is ${String(posExpr)}; without relative the left offset resolves against nothing and a wide box sits off the column's axis`);
  if (leftExpr !== '50%') bad(15, `left is ${String(leftExpr)}; 50% of the containing block is half of the centring`);
  if (translateExpr !== '-50%') bad(15, `translate is ${String(translateExpr)}; -50% of the box's own used width is the other half`);
  if (readings252 === null) bad(15, `no app-run readings at ${READINGS_252_REL}; run probe:p252`);
  else {
    const centreReadings = [
      ...Object.entries(readings252.panes ?? {}),
      ...Object.entries(readings252.light ?? {}).map(([k, v]) => [`light-${k}`, v]),
      ...Object.entries(readings252.zoom ?? {}).map(([k, v]) => [`zoom-${k}`, v])
    ];
    let centred = 0;
    for (const [name, rd] of centreReadings) {
      if (rd === null || rd === undefined) continue;
      for (const b of rd.blocks) {
        centred += 1;
        if (Math.abs(b.centreOff) > 1) bad(15, `at ${name} the ${b.id} box is ${String(b.centreOff)}px off the prose column's axis`);
      }
      if (rd.docScrollsSideways === true) bad(15, `at ${name} the document scrolls sideways`);
    }
    if (centred === 0) bad(15, 'no centring reading at all; run probe:p252');
    else notes.push(`${String(centred)} boxes read on the column's axis across panes, bases and zoom stops`);
    const zooms = Object.keys(readings252.zoom ?? {}).map(Number);
    if (!zooms.some((z) => z > 1) || !zooms.some((z) => z < 1)) {
      bad(15, `the zoom readings cover ${zooms.join(', ') || 'nothing'}; the ladder must be read above AND below 1`);
    }
    const ab = readings252.centreAblated ?? null;
    if (ab === null) bad(15, 'the app run recorded no centring ablation, so nothing shows this rule can fail');
    else if (!(ab.blocks ?? []).some((b) => Math.abs(b.centreOff) > 8)) {
      bad(15, 'the centring taken off did NOT move a box off the axis, so the centring readings prove nothing');
    } else {
      notes.push(`with the translate off, a box sits ${String(Math.round(Math.max(...ab.blocks.map((b) => Math.abs(b.centreOff)))))}px off the column's axis`);
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
  ['the 100% floor, taken off the clamp', 7, (c) => c.replace(/\n\s*min-width: 100%;/, '')],
  ['the cap, taken off the clamp', 7, (c) => c.replace(/\n\s*max-width: var\(--md-wide\);/, '')],
  ['the content width, made the cap again', 14, (c) => c.replace(/width: max-content;/, 'width: max(100%, var(--md-wide));')],
  ['the translate half of the centring', 15, (c) => c.replace(/\n\s*translate: -50%;/, '')],
  ['the left half of the centring', 15, (c) => c.replace(/\n\s*left: 50%;/, '')],
  ['the relative position under the centring', 15, (c) => c.replace(/\n\s*position: relative;\n\s*left: 50%;/, '\n  left: 50%;')],
  ['the fence, taken off the rule', 2, (c) => c.replace(/\.md-content > \.md-table-scroll,\n\.md-content > pre \{\n  width: max/, '.md-content > .md-table-scroll {\n  width: max')],
  ['the prose measure, widened with the block', 1, (c) => c.replace(/  max-width: 68ch;\n  margin-inline: auto;/, '  max-width: 136ch;\n  margin-inline: auto;')],
  ['the lifted thumb, put back to the shared one', 9, (c) => c.replace(/(\.md-table-scroll::-webkit-scrollbar-thumb \{\n  background-color: )var\(--text-muted\)/, '$1var(--border-strong)')],
  ['the hover override', 9, (c) => c.replace(/\.md-table-scroll::-webkit-scrollbar-thumb:hover \{[\s\S]*?\n\}\n/, '')],
  ['the child combinator, made a descendant again', 11, (c) => c.replace(/\.md-content > \.md-table-scroll,\n\.md-content > pre \{/, '.md-content .md-table-scroll,\n.md-content pre {')],
  ['the zoom division', 12, (c) => c.replace(/100cqi \/ var\(--zoom-editor, 1\)/, '100cqi')],
  ['the zoom fallback', 12, (c) => c.replace(/var\(--zoom-editor, 1\)/, 'var(--zoom-editor)')],
  ['the narrow table centring', 13, (c) => c.replace(/\.md-content > \.md-table-scroll > table \{\n  margin-inline: auto;\n\}\n/, '')]
];

// ---------------------------------------------------------------------------

const cssPath = join(REPO, CSS_REL);
const css = readFileSync(cssPath, 'utf8');
const tokensCss = readFileSync(join(REPO, TOKENS_REL), 'utf8');
let readings = null;
try { readings = JSON.parse(readFileSync(join(REPO, READINGS_REL), 'utf8')); } catch { readings = null; }
let readings252 = null;
try { readings252 = JSON.parse(readFileSync(join(REPO, READINGS_252_REL), 'utf8')); } catch { readings252 = null; }

const live = runRules({ css, tokensCss, readings, readings252 });
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
    const got = runRules({ css: readFileSync(file, 'utf8'), tokensCss, readings, readings252 });
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
  say(`OK: the 68ch prose measure is untouched, the two children that already scroll take what their CONTENT needs — floored at the column, capped at twice the measure, centred on the column's axis at any used width (Phase 252) — the break-out reaches a DIRECT child alone so a block under a bullet cannot be centred on the bullet's box, the pane term is divided by the editor zoom so ⌘+ cannot multiply it twice, a table narrower than its box keeps the page's axis, the width term is the PANE and never the window, the cap is registered so it resolves once in the prose font, ${String(Object.keys(readings?.widths ?? {}).length)} pane widths re-derived from the shipped clamp agree with the DOM, ${String(Object.keys(readings?.zoom ?? {}).length)} zoom levels and ${String(Object.keys(readings?.nested ?? {}).length)} nested readings were driven on the real chord and at three nesting levels, the p252 width classes and centring hold over ${String(Object.keys(readings252?.panes ?? {}).length)} panes with the parent's rule shown to bring the defect back, the table box's thumb clears 3:1 on both bases, and ${String(ABLATIONS.length)} ablations each turned their own rule red.`);
  process.exit(0);
}
say(`FAILED: ${String(live.findings.length)} live finding(s) and ${String(ablationFailures)} ablation(s) that proved nothing.`);
process.exit(1);
