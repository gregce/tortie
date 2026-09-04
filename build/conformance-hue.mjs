#!/usr/bin/env node
/**
 * `npm run conformance:hue`, the cheap gate on the frame hue (Phase 207).
 *
 * About ten seconds. It launches no Electron, opens no window, starts no
 * tmux server, spawns nothing but one node running the pinned tsx, makes no
 * request and reads nothing under the person's home. Every number it prints
 * came from the SHIPPING modules, run under node by
 * build/hue-conformance-probe.mts over the shipped tokens.css.
 *
 * ## Why a gate rather than a unit test
 *
 * The phase's central claim is that EVERY pinned contrast ratio holds at
 * EVERY hue, not at the default and not at three sampled ones, and that the
 * text rule, which no hue can reach, still does the right thing on a ground
 * that is light. Both are one line away from being undone by a round that
 * means well: a rotation moved to HSL "because it is simpler", a threshold
 * tuned by eye, a token dropped from the list, a solve that stops keeping
 * the shipped ratio. None of that is visible in a screenshot, so the gate
 * walks all 360 degrees, the whole ramp from graphite to white and every one
 * of the 49 shade and depth pairs at every whole degree, and then
 * runs itself over nineteen copies of the code with one clause changed each,
 * and fails unless every copy turns a pin red. A pin that cannot fail is
 * documentation.
 *
 * ## The rules
 *
 *   1. THE DEFAULT DERIVES NOTHING. At 222, and at 582 which sanitizes to
 *      222, the override map is empty, byte identity for an untouched
 *      install.
 *   2. THE WRAP. 360 derives what 0 derives, -1 what 359 derives, 0.4 what
 *      0 derives, and 0 derives something.
 *   3. THE KEYS. At every hue but 222, at the normal contrast level, the map
 *      holds exactly the eight neutrals, the canvas among them, and no text
 *      token. The canvas is a rung of the ramp; a rotation that left it out
 *      would be the half rotated app; a rotation that wrote text would be
 *      moving what the ground did not move.
 *   4. PERCEIVED LIGHTNESS IS HELD. Every neutral stays within 0.005 of its
 *      shipped OKLCH lightness at every hue. This is the perceptual claim, and
 *      it is the pin the HSL ablation turns red: at a fixed HSL lightness the
 *      yellows read up to 0.034 lighter.
 *   5. THE ROTATION IS AN OFFSET. On the five neutrals with enough chroma to
 *      read a hue back, the turned hue is the shipped hue plus (hue - 222),
 *      within eight degrees, at every hue. An absolute rotation would make
 *      them all the same hue. Twelve degrees, because at a chroma of 0.012
 *      eight bit rounding alone moves a read hue by nine.
 *   6. THE RAMP ORDER. By WCAG luminance, sidebar below canvas below surface
 *      below raised below active, and border below border-active below
 *      border-strong, at every hue and every contrast level.
 *   7. EVERY PINNED RATIO HOLDS AT EVERY HUE, at every contrast level:
 *      --text-primary at least 4.5:1 on the canvas, the sidebar, the surface,
 *      the raised and the active fills; --text-secondary on the same five;
 *      --text-muted on the canvas, the sidebar and the surface, which is as
 *      far as DESIGN.md lets it go; the terminal
 *      foreground 4.5:1 on the canvas and every ANSI colour but black and
 *      brightBlack 3:1 on it; --accent-text 4.5:1 and --accent 3:1 on the
 *      canvas; the git decorations and the two literal graph lanes 3:1 on the
 *      active fill.
 *   8. THE HAIRLINES KEEP THEIR PINNED RATIOS within a band, at the normal
 *      level AND AT THE SHIPPED SHADE AND DEPTH: --border on --bg-sidebar
 *      1.297 plus or minus 0.03, and --border-active on --bg-active 1.105 and
 *      the hover step --bg-raised on --bg-surface 1.094 plus or minus 0.02.
 *      tokens.css pins all three. Phase 210 narrowed this rule to the shipped
 *      frame on purpose, because those three ratios are EXACTLY what its
 *      depth control moves: the first reads 1.130 at the narrowest stop and
 *      1.673 at the widest. Here it still checks the rotation, which must not
 *      move them. Across the two new axes rule 16's rendered step floor takes
 *      its place, and presets.ts says why that number is 2.
 *   9. THE THRESHOLD IS THE ONE DERIVED NUMBER. The module's constant equals
 *      sqrt(0.05 x 1.05) - 0.05 to a millionth, which this file computes for
 *      itself, and over the synthetic walk the polarity is light, then dark,
 *      with exactly one crossing, whose two sides straddle that number.
 *  10. BEFORE THE FLIP the text keeps its floors on the lifted ground, being
 *      lifted toward white only when a ground puts it under one, and the
 *      terminal colours keep 3:1 on the canvas, the two exempt ones aside.
 *      A floor may be missed ONLY where no colour on that side could meet it,
 *      being where pure white itself reads under the floor on that ground,
 *      and then the text is white, the end of its side. That is physics: the
 *      ramp spans about 0.075 in luminance from sidebar to active fill, so
 *      around the flip there is a band of grounds on which no single
 *      polarity clears 4.5:1 everywhere, and the gate measures that band
 *      and prints it rather than pretending it is not there.
 *  11. AFTER THE FLIP every text token and every terminal colour is darker
 *      than the ground it sits on, every one with a floor clears it or is
 *      black where black itself cannot, and once the shipped ratio is
 *      reachable it is kept: with the canvas at or above Y 0.55,
 *      --text-primary reads within 0.2 of its shipped 11.24:1. The flip
 *      itself lies inside the band rule 10 measures, which is the claim that
 *      it happens where it can never make the text worse.
 *  12. THE CONTRAST LIFT STILL MEANS MORE CONTRAST AFTER A FLIP. On the dark
 *      side High moves --text-primary further from the ground than Normal.
 *  13. ABLATION. The same probe over twelve copies of the code with one
 *      clause changed each, including one that rotates in HSL, must turn at
 *      least one pin red per copy, and the gate names the pin.
 *  14. The gate is named in package.json and in build/verification-checks.mjs.
 *
 * ## The Phase 210 rules, and how coarsely they sample
 *
 *  15. THE OFFERED REGION. Every one of the 49 shade and depth pairs is
 *      feasible exactly where the table in this file says, judged over all
 *      three contrast levels AND all four highlight schemes, because the five
 *      appearance settings compose in any order and a frame chosen at Normal
 *      that broke a floor at High would not compose. Each row and each column
 *      is contiguous, because a hole would make a slider that skips a stop.
 *      THE SAMPLING IS EXHAUSTIVE ON THE TWO NEW AXES, all 49 pairs, and
 *      EVERY WHOLE DEGREE on the hue, and that last is not caution: the
 *      failures sit in clusters a few degrees wide, so a fifteen degree step
 *      walks over all of them. The ablated copies walk every forty fifth
 *      degree plus the WITNESSES, being the hue at which each refused cell
 *      actually fails, because an ablation removes a clause and so fails at
 *      every hue rather than in a cluster, and without the witnesses a coarse
 *      walk would turn this rule red for a reason that is not the ablation.
 *  16. EVERY FLOOR HOLDS AT EVERY OFFERED FRAME: the text pins, the terminal
 *      palette, the chromatic family, the ramp strictly in order, and the
 *      RENDERED STEP, being at least two eight bit levels between adjacent
 *      rungs. Two is the smallest step ABOVE the rounding floor, one level
 *      being the least difference eight bits can express; the shipped ramp
 *      itself holds FIVE at its tightest over this rule's own pairs, so this
 *      is a floor on a rung still being a rung and not on the shipped
 *      spacing. presets.ts says why, and says what it used to say wrongly.
 *  17. THE ORDER NEVER INVERTS, at every cell and not only the offered ones.
 *      The transform is affine in OKLCH lightness with a positive slope, so
 *      this is arithmetic; what a refused stop loses is the eight bit
 *      distance between two rungs, never their order.
 *  18. THE CONTROL REFUSES WHAT THIS GATE REFUSES. The shipping floor
 *      predicate, which is what the sliders stop on, agrees with this walk at
 *      every point. It went red 6,937 times while the two read a slack of
 *      zero differently.
 *  19. THE FRAME MOVES NO CHROMATIC TOKEN. It moves the ground under the
 *      accent, the git decorations and the graph lanes and never them.
 *  20. THE FLIP IS OUT OF REACH, and this is the phase's correction to its
 *      own charter. Phase 210's entry said the text flip would become
 *      reachable and that this was the point; it does not, because the git
 *      decorations on --bg-active stop the ramp at canvas Y 0.0147, measured
 *      over every whole degree at hue 186, shade 2, depth -3, against a flip
 *      at Y 0.1791. At the shipped hue that lightest canvas reads 0.0138,
 *      which is the number this rule quoted before the Phase 210 verifier
 *      pointed out it was one hue's reading rather than the walk's maximum.
 *      So the rule is the honest one: no frame a person can choose reads
 *      dark, the flip being twelve times away, and rules 9 to 11 are where
 *      the flip stays proved.
 *  21. THE SHIPPED FRAME IS STILL THE DEFAULT and every other stop moves. The
 *      shipped pair writes nothing at all; every named point that is not it
 *      writes the ramp, at the shipped hue as much as at any other.
 *
 * ## The Phase 213 rules, and the axis they add
 *
 *  22. THE LIGHT BASE. Everything rules 1 to 8 and 15 to 21 claim for the dark
 *      base holds for the light one, walked by the same probe over the light
 *      block of tokens.css with the light order runs, the light hairline pins,
 *      the light chromatic family and the light region. THREE THINGS DIFFER,
 *      and each is a fact about paper rather than a weakening:
 *        - the ramp order is the dark order TURNED OVER, because on paper
 *          elevation is shadow: the sheet sits above the canvas, the frame one
 *          rung under it, and the selected row is the deepest fill;
 *        - the derived key set may also carry TEXT tokens. On the dark base a
 *          rotated ground leaves the light text exactly where it ships; on the
 *          light base the text is DARK, and the dark side of the text rule
 *          keeps the SHIPPED RATIO rather than a floor, so a ground that
 *          rotates by a fraction of a level re-solves the text by a level to
 *          hold 11.26:1. The eight neutrals are still all present and no
 *          chromatic token is ever written, which is what rule 3 was for;
 *        - rule 20 INVERTS. On the dark base no frame a person can choose
 *          reaches the flip. On paper every one of them is past it, so the
 *          text family reads dark at every point, and this is where the flip
 *          Phase 207 built and Phase 210 could only reach synthetically fires
 *          for real.
 *  23. THE STATUS DOTS ON PAPER, which is the note Phase 210 left open on the
 *      dark base and this phase does not leave open on the light one. The four
 *      dots clear 3:1 on `--bg-active`, the deepest fill a row takes, at every
 *      offered frame and every hue, and the attention badge's text clears
 *      4.5:1 on the amber the dot is drawn in. They are in the light base's
 *      chromatic family, so they also BIND its region, and rule 22 proves the
 *      table matches the walk.
 *  24. EVERY SURFACE THAT DOES NOT READ A TOKEN TAKES THE BASE. The six
 *      surfaces the phase's entry lists, read from the SHIPPING modules under
 *      node: the terminal theme object has a light constant beside its dark
 *      one and xterm's `minimumContrastRatio` is 4.5 on the light theme and 1
 *      on the dark; Monaco has a `vs` theme beside its `vs-dark` one; Pierre
 *      has a second custom theme whose `type` is light and the theme PAIR the
 *      bridge hands the components names both, which is the limit Phases 207
 *      and 210 both recorded and this phase lifts; the tree host carries no
 *      `colorScheme` of its own any more, so it inherits the root's; and the
 *      window fill main composes answers the paper on light and the graphite
 *      on dark, at the shipped hue and at a turned one.
 *  25. DARK IS BYTE IDENTICAL, and it is pinned by digest rather than by
 *      reading. The dark block of tokens.css, the dark terminal theme, the
 *      dark Monaco theme and the dark Pierre theme are sha256'd and compared
 *      against the digests MEASURED AT THE PARENT COMMIT 02fd5ed, before any
 *      of this phase's commits; the dark window fill and the dark contrast
 *      floor are compared against their parent values too. A phase whose whole
 *      claim is that a person who touches nothing sees what they saw yesterday
 *      needs that claim to be arithmetic, and the four modules were all
 *      rewritten to carry a second base, so "we did not mean to" is not proof.
 *  26. NO DARK LITERAL SURVIVES. A colour may be written in exactly six THEME
 *      CONSTANT files and nowhere else under src/. Everywhere else a hex or an
 *      rgb() is a surface that would keep its dark colour on paper. The scan
 *      strips comments, allows an alpha MASK gradient, whose `#000` is an
 *      alpha channel and not a colour, and carries four named exemptions with
 *      their reasons. It is proved on eight fixtures this file writes itself,
 *      five of which must make it fail, because a scan that cannot fail is the
 *      thing this gate exists to refuse.
 *
 * Contrast is re-derived HERE with culori's full entry rather than read from
 * the modules, so a module that lied about a ratio would still be caught;
 * the verifier is asked to re-derive it once more with arithmetic of its own.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:hue]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { differenceCiede2000, wcagContrast, wcagLuminance } = require('culori');
const deltaE = differenceCiede2000();

let failed = 0;
function say(line) {
  console.log(line);
}
function fail(line) {
  failed += 1;
  console.error(`${TAG} FAIL: ${line}`);
}

// ---------------------------------------------------------------------------
// The ablations, one clause each. An edit must find its text, or the copy is
// the shipping tree and the gate would be proving the wrong thing.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  {
    name: 'the space: rotate in HSL instead of OKLCH',
    file: 'shared/chrome-hue.ts',
    edits: [
      ["  modeOklch,\n  modeRgb,", "  modeOklch,\n  modeHsl,\n  modeRgb,"],
      ["useMode(modeOklch);\n", "useMode(modeOklch);\nuseMode(modeHsl);\n"],
      ["const toOklch = converter('oklch');", "const toOklch = converter('hsl');"],
      [
        "  const turned = clampChroma(\n    { ...ok, h: (((ok.h ?? 0) + offset) % 360 + 360) % 360 },\n    'oklch'\n  );",
        "  const turned = { ...ok, h: (((ok.h ?? 0) + offset) % 360 + 360) % 360 };"
      ]
    ]
  },
  {
    // Phase 213 rule 27. The Scheme control writes one field, so without this
    // the frame a person held on dark is applied whole on paper, where 31 of
    // the 35 pairs dark offers break a floor.
    name: 'the frame carried whole across a scheme change',
    file: 'renderer/theme/frame-stops.ts',
    edits: [
      [
        "  if (frameIsOffered(shade, depth, scheme)) {\n    return { chromeHue: choice.chromeHue, chromeShade: shade, chromeDepth: depth };\n  }",
        "  return { chromeHue: choice.chromeHue, chromeShade: shade, chromeDepth: depth };\n  if (false) {"
      ]
    ]
  },
  {
    name: 'the offset: an absolute hue instead of an offset from each token',
    file: 'shared/chrome-hue.ts',
    edits: [["h: (((ok.h ?? 0) + offset) % 360 + 360) % 360", "h: sanitizeChromeHue(hue)"]]
  },
  {
    name: 'the canvas left out of the ramp the hue turns',
    file: 'renderer/theme/presets.ts',
    edits: [["export const HUE_TOKENS: readonly string[] = [\n  CANVAS_TOKEN,\n", "export const HUE_TOKENS: readonly string[] = [\n"]]
  },
  {
    name: 'border-strong left out of the ramp the hue turns',
    file: 'renderer/theme/presets.ts',
    edits: [["  CANVAS_TOKEN,\n  ...CONTRAST_BG,\n  ...CONTRAST_BORDER\n];", "  CANVAS_TOKEN,\n  ...CONTRAST_BG,\n  '--border',\n  '--border-active'\n];"]]
  },
  {
    name: 'the text written by the rotation alone',
    file: 'renderer/theme/derive.ts',
    edits: [["    if (value !== shipped) out[pin.token] = value;", "    out[pin.token] = value;"]]
  },
  {
    name: 'the threshold tuned by hand',
    file: 'renderer/theme/hue.ts',
    edits: [["export const TEXT_FLIP_CANVAS_LUMINANCE = Math.sqrt(0.05 * 1.05) - 0.05;", "export const TEXT_FLIP_CANVAS_LUMINANCE = 0.3;"]]
  },
  {
    name: 'the flip removed',
    file: 'renderer/theme/hue.ts',
    edits: [["  return wcagLuminance(parsed) > TEXT_FLIP_CANVAS_LUMINANCE;", "  return false && wcagLuminance(parsed) > TEXT_FLIP_CANVAS_LUMINANCE;"]]
  },
  {
    name: 'the dark side solved to the floor rather than the shipped ratio',
    file: 'renderer/theme/hue.ts',
    edits: [["    const kept = solveForRatio(shipped, pinned, contrastOf(shipped, shippedGround), true);", "    const kept = solveForRatio(shipped, pinned, floor, true);"]]
  },
  {
    name: 'the contrast lift pushing dark text toward white',
    file: 'renderer/theme/derive.ts',
    edits: [["            ? clamp01(color.l - color.l * factors.t)", "            ? clamp01(color.l + (1 - color.l) * factors.t)"]]
  },
  {
    name: 'the terminal palette left constant',
    file: 'renderer/terminal/theme.ts',
    edits: [["  return followPalette(\n    light ? TERMINAL_TEXT_LIGHT : TERMINAL_TEXT,", "  return { ...(light ? TERMINAL_TEXT_LIGHT : TERMINAL_TEXT) };\n  return followPalette(\n    light ? TERMINAL_TEXT_LIGHT : TERMINAL_TEXT,"]]
  },
  {
    name: 'the light side floor removed',
    file: 'renderer/theme/hue.ts',
    edits: [["  const worst = worstGround(shipped, grounds);\n  if (contrastOf(shipped, worst) >= floor) return shipped;\n  return solveForRatio(shipped, worst, floor, false);", "  return shipped;"]]
  },
  {
    name: 'the spread anchored on the shipped canvas rather than the turned one',
    file: 'renderer/theme/derive.ts',
    edits: [["  const canvasCss = current(CANVAS_TOKEN);", "  const canvasCss = base[CANVAS_TOKEN];"]]
  },
  {
    name: 'the ramp folded about the canvas, so the order inverts',
    file: 'shared/chrome-ramp.ts',
    edits: [
      [
        "{ ...ok, l: clamp01(anchorLightness + (ok.l - canvasLightness) * factor) },",
        "{ ...ok, l: clamp01(anchorLightness + Math.abs(ok.l - canvasLightness) * factor) },"
      ]
    ]
  },
  {
    name: 'the ramp scaled about zero rather than about its canvas anchor',
    file: 'shared/chrome-ramp.ts',
    edits: [
      [
        "{ ...ok, l: clamp01(anchorLightness + (ok.l - canvasLightness) * factor) },",
        "{ ...ok, l: clamp01(ok.l * factor) },"
      ]
    ]
  },
  {
    name: 'the ramp stage skipped at the shipped hue',
    file: 'renderer/theme/derive.ts',
    edits: [
      [
        "    rampOverrides(HUE_TOKENS, current, current(CANVAS_TOKEN), shade, depth)\n  )) {",
        "    hueOn ? rampOverrides(HUE_TOKENS, current, current(CANVAS_TOKEN), shade, depth) : {}\n  )) {"
      ]
    ]
  },
  {
    name: 'the canvas left out of the ramp the shade moves',
    file: 'renderer/theme/derive.ts',
    edits: [
      [
        "    rampOverrides(HUE_TOKENS, current, current(CANVAS_TOKEN), shade, depth)",
        "    rampOverrides(HUE_TOKENS.filter((t) => t !== CANVAS_TOKEN), current, current(CANVAS_TOKEN), shade, depth)"
      ]
    ]
  },
  {
    name: 'the rendered step floor lowered to one eight bit level',
    file: 'renderer/theme/presets.ts',
    edits: [["export const RENDERED_STEP_MIN = 2;", "export const RENDERED_STEP_MIN = 1;"]]
  },
  {
    name: 'the rendered step dropped from the shipping floor predicate',
    file: 'renderer/theme/floors.ts',
    edits: [["  for (const [a, b] of RENDERED_STEP_PAIRS) {", "  for (const [a, b] of []) {"]]
  },
  {
    name: 'the region table offering one stop the walk refuses',
    file: 'renderer/theme/presets.ts',
    edits: [["  { shade: 0, minDepth: -3, maxDepth: 1 },", "  { shade: 0, minDepth: -3, maxDepth: 2 },"]]
  },
  {
    name: 'the depth factor read one stop along the table',
    file: 'shared/chrome-ramp.ts',
    edits: [
      [
        "return CHROME_DEPTH_FACTORS[stop - CHROME_DEPTH_MIN] ?? 1;",
        "return CHROME_DEPTH_FACTORS[stop - CHROME_DEPTH_MIN + 1] ?? 1;"
      ]
    ]
  },
  // ---- Phase 213, the scheme axis. One clause each, and every one of them
  // is a line a later round could write meaning well.
  {
    name: 'the light ramp order left as the dark one',
    file: 'renderer/theme/presets.ts',
    edits: [["  return scheme === 'light' ? RAMP_ORDER_LIGHT : RAMP_ORDER;", '  return RAMP_ORDER;']]
  },
  {
    name: 'the light hairline order left as the dark one',
    file: 'renderer/theme/presets.ts',
    edits: [["  return scheme === 'light' ? HAIRLINE_ORDER_LIGHT : HAIRLINE_ORDER;", '  return HAIRLINE_ORDER;']]
  },
  {
    name: 'the status dots dropped from the light chromatic family',
    file: 'renderer/theme/presets.ts',
    edits: [
      [
        "  return scheme === 'light' ? [...CHROMATIC_PINS, ...STATUS_PINS_LIGHT] : CHROMATIC_PINS;",
        '  return CHROMATIC_PINS;'
      ]
    ]
  },
  {
    name: 'the light region offering one depth stop the walk refuses',
    file: 'renderer/theme/presets.ts',
    edits: [['  { shade: 0, minDepth: -3, maxDepth: 0 },', '  { shade: 0, minDepth: -3, maxDepth: 1 },']]
  },
  {
    name: 'the light base given the dark terminal palette',
    file: 'renderer/terminal/theme.ts',
    edits: [
      [
        '    light ? TERMINAL_TEXT_LIGHT : TERMINAL_TEXT,\n    light ? TERMINAL_BACKGROUND_LIGHT : TERMINAL_BACKGROUND,',
        '    TERMINAL_TEXT,\n    TERMINAL_BACKGROUND,'
      ]
    ]
  },
  {
    name: "xterm's contrast floor left at the dark 1 on paper",
    file: 'renderer/terminal/theme.ts',
    edits: [
      [
        "  return scheme === 'light' ? TERMINAL_MIN_CONTRAST_LIGHT : TERMINAL_MIN_CONTRAST_DARK;",
        '  return TERMINAL_MIN_CONTRAST_DARK;'
      ]
    ]
  },
  {
    name: "Monaco's light theme registered on the dark base",
    file: 'renderer/editor/monaco-theme.ts',
    edits: [["    base: light ? 'vs' : 'vs-dark',", "    base: 'vs-dark',"]]
  },
  {
    name: "Pierre's second theme registered with type dark",
    file: 'renderer/pierre/theme-bridge.ts',
    edits: [["  'light',\n  PL,\n  SL\n);", "  'dark',\n  PL,\n  SL\n);"]]
  },
  {
    name: 'the tree host pinning its own colorScheme again',
    file: 'renderer/pierre/theme-bridge.ts',
    edits: [["  delete out['colorScheme'];", '']]
  },
  {
    name: 'the window fill ignoring the base',
    file: 'shared/chrome-hue.ts',
    edits: [["  const base = scheme === 'light' ? WINDOW_BACKGROUND_LIGHT : WINDOW_BACKGROUND;", '  const base = WINDOW_BACKGROUND;']]
  },
  {
    name: 'the shadow hosts left to their own color-scheme',
    file: 'renderer/styles/globals.css',
    edits: [['  color-scheme: inherit;\n}', '}']]
  },
  {
    name: 'the light sheet dropped onto the paper in tokens.css',
    file: 'renderer/styles/tokens.css',
    edits: [['  --bg-surface: #fcfcfe;', '  --bg-surface: #f5f7fa;']]
  }
];

/**
 * A copy of the four modules the probe loads, under `<root>`, with `edits`
 * applied to one file. The theme copies reach the shared rotation by a
 * relative path, and the rotation copy reaches the real settings and window
 * chrome modules by absolute path, so a copy is small and its every other
 * import is the real tree.
 */
function ablatedCopy(root, ablation) {
  mkdirSync(join(root, 'renderer', 'terminal'), { recursive: true });
  mkdirSync(join(root, 'shared'), { recursive: true });
  cpSync(join(repoRoot, 'src', 'renderer', 'theme'), join(root, 'renderer', 'theme'), {
    recursive: true,
    filter: (source) => !source.includes('__tests__')
  });
  cpSync(
    join(repoRoot, 'src', 'renderer', 'terminal', 'theme.ts'),
    join(root, 'renderer', 'terminal', 'theme.ts')
  );
  // PHASE 213. The four other places a base is written, so an ablation of one
  // of them reaches the COPY rather than the tree: the token file both bases
  // live in, Monaco's two themes, and Pierre's bridge, which the probe
  // evaluates with the two vendor imports stubbed.
  mkdirSync(join(root, 'renderer', 'editor'), { recursive: true });
  mkdirSync(join(root, 'renderer', 'pierre'), { recursive: true });
  mkdirSync(join(root, 'renderer', 'styles'), { recursive: true });
  for (const rel of [
    ['renderer', 'editor', 'monaco-theme.ts'],
    ['renderer', 'editor', 'monaco-theme-name.ts'],
    ['renderer', 'pierre', 'theme-bridge.ts'],
    ['renderer', 'styles', 'tokens.css'],
    ['renderer', 'styles', 'globals.css']
  ]) {
    cpSync(join(repoRoot, 'src', ...rel), join(root, ...rel));
  }
  const sharedSrc = join(repoRoot, 'src', 'shared');
  writeFileSync(
    join(root, 'shared', 'chrome-hue.ts'),
    readFileSync(join(sharedSrc, 'chrome-hue.ts'), 'utf8')
      .replace("from './settings'", `from '${join(sharedSrc, 'settings')}'`)
      .replace("from './window-chrome'", `from '${join(sharedSrc, 'window-chrome')}'`)
  );
  // Phase 210. The ramp transform is copied for the same reason the rotation
  // is: an ablation of it has to reach the COPY rather than the tree.
  writeFileSync(
    join(root, 'shared', 'chrome-ramp.ts'),
    readFileSync(join(sharedSrc, 'chrome-ramp.ts'), 'utf8').replace(
      "from './settings'",
      `from '${join(sharedSrc, 'settings')}'`
    )
  );
  for (const file of ['derive.ts']) {
    const path = join(root, 'renderer', 'theme', file);
    writeFileSync(
      path,
      readFileSync(path, 'utf8')
        .replace("from '@shared/chrome-hue'", "from '../../shared/chrome-hue'")
        .replace("from '@shared/chrome-ramp'", "from '../../shared/chrome-ramp'")
    );
  }
  const target = join(root, ablation.file);
  let text = readFileSync(target, 'utf8');
  for (const [from, to] of ablation.edits) {
    if (!text.includes(from)) {
      throw new Error(`ablation "${ablation.name}" found nothing to edit in ${ablation.file}: ${from.slice(0, 60)}`);
    }
    text = text.replace(from, to);
  }
  writeFileSync(target, text);
  return root;
}

/**
 * RULE 26'S SCANNER (Phase 213). Where a colour may be written, and nowhere
 * else, so no surface can quietly keep its dark value on paper.
 *
 * THE SIX THEME CONSTANT PLACES. tokens.css, which holds both bases; the
 * terminal theme object; the Monaco theme table; the Pierre bridge; the
 * shared window chrome main composes its fill from; and the pre-paint rule in
 * the two HTML entries, which is what paints before any script runs and which
 * this phase gave a second rule keyed on the same root attribute.
 */
const THEME_CONSTANT_FILES = new Set([
  'renderer/styles/tokens.css',
  'renderer/terminal/theme.ts',
  'renderer/editor/monaco-theme.ts',
  'renderer/pierre/theme-bridge.ts',
  'shared/window-chrome.ts',
  'renderer/index.html',
  'renderer/settings/index.html'
]);

/**
 * THE FOUR NAMED EXEMPTIONS, each with the reason it is not a colour.
 *
 *  - The two menu icon rasterizers paint a TEMPLATE image, where only the
 *    alpha channel is read: macOS draws the mark in the menu's own colour, so
 *    black is "opaque" rather than black.
 *  - The capture serializer's fallback pair is the flavour that pastes into
 *    somebody ELSE'S document, where the ground is theirs and not ours. The
 *    flavour that carries our ground reads the resolved theme beside it, on
 *    the same two lines, and follows the scheme.
 *  - The generated file icon map is VENDOR ARTWORK from material-icon-theme.
 *    A TypeScript icon's blue is that icon's identity, not this frame's, and
 *    the light base handles it the way research 80 measured, by lifting
 *    `--file-icon-dim` from 0.55 to 0.72 so the art keeps its own colour and
 *    sits under the text rather than beside it. The package's light map is
 *    31 extensions against 179 names and Tortie's generator reads neither,
 *    so there is nothing to switch.
 */
const LITERAL_EXEMPTIONS = new Set([
  'renderer/icons/agent-menu-icon.ts',
  'renderer/icons/codicon-menu-icon.ts',
  'renderer/terminal/capture/serialize.ts',
  'renderer/icons/file-icons.generated.ts'
]);

/** An alpha MASK gradient's stops are an alpha channel, never a colour. */
const MASK_PROPERTIES = new Set(['mask-image', 'mask', '-webkit-mask-image', '-webkit-mask']);

const COLOUR_IN_VALUE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(\s*[\d.]/;
const COLOUR_IN_STRING = /(['"`])(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\(\s*[\d.])/;

/** Block comments everywhere, line comments where the `//` is not inside a string. */
function stripComments(text, kind) {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (kind === 'html') out = out.replace(/<!--[\s\S]*?-->/g, ' ');
  if (kind !== 'ts') return out;
  return out
    .split('\n')
    .map((line) => {
      let quotes = 0;
      for (let i = 0; i < line.length - 1; i += 1) {
        const c = line[i];
        if (c === '\\') {
          i += 1;
          continue;
        }
        if (c === "'" || c === '"' || c === '`') quotes += 1;
        if (c === '/' && line[i + 1] === '/' && quotes % 2 === 0) return line.slice(0, i);
      }
      return line;
    })
    .join('\n');
}

function scanFile(rel, text) {
  const hits = [];
  const css = rel.endsWith('.css') || rel.endsWith('.html');
  const body = stripComments(text, rel.endsWith('.html') ? 'html' : css ? 'css' : 'ts');
  if (css) {
    // Only DECLARATION VALUES, so an id selector and a media query cannot
    // read as a colour and a colour cannot hide in either.
    for (const m of body.matchAll(/(^|[;{])\s*(-{0,2}[A-Za-z-][\w-]*)\s*:\s*([^;{}]*)/g)) {
      const property = m[2];
      const value = m[3];
      if (MASK_PROPERTIES.has(property)) continue;
      if (COLOUR_IN_VALUE.test(value)) hits.push(`${rel}: ${property}: ${value.trim().slice(0, 60)}`);
    }
    return hits;
  }
  for (const line of body.split('\n')) {
    if (COLOUR_IN_STRING.test(line)) hits.push(`${rel}: ${line.trim().slice(0, 80)}`);
  }
  return hits;
}

function walkSources(root) {
  const out = [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      const full = join(dir, entry);
      const rel = prefix === '' ? entry : `${prefix}/${entry}`;
      if (statSync(full).isDirectory()) walk(full, rel);
      else if (/\.(css|html|ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) out.push({ rel, full });
    }
  };
  walk(root, '');
  return out;
}

function countScanned(root) {
  return walkSources(root).filter(
    ({ rel }) => !THEME_CONSTANT_FILES.has(rel) && !LITERAL_EXEMPTIONS.has(rel)
  ).length;
}

function scanLiterals(root) {
  const hits = [];
  for (const { rel, full } of walkSources(root)) {
    if (THEME_CONSTANT_FILES.has(rel) || LITERAL_EXEMPTIONS.has(rel)) continue;
    hits.push(...scanFile(rel, readFileSync(full, 'utf8')));
  }
  return hits;
}

/**
 * Eight fixtures, five of which must make the scan fail. A scan that cannot
 * fail is the thing this gate exists to refuse, and each of these five is a
 * shape a round meaning well would actually write.
 */
function literalFixtures(base) {
  const files = [
    ['a plain hex in a stylesheet', true, 'renderer/a/a.css', '.x { background: #131417; }\n'],
    ['an rgba in a stylesheet', true, 'renderer/a/b.css', '.x { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); }\n'],
    ['a hex in a stylesheet comment', false, 'renderer/a/c.css', '/* --warning is the same #F5B84A as the dot */\n.x { color: var(--warning); }\n'],
    ['a hex in an alpha mask gradient', false, 'renderer/a/d.css', '.x { mask-image: linear-gradient(to right, transparent 0, #000 20px); }\n'],
    ['a quoted colour in a module', true, 'renderer/a/e.ts', "export const fill = '#131417';\n"],
    ['a colour in a line comment', false, 'renderer/a/f.ts', "// the shipped ground is '#131417'\nexport const fill = 'var(--bg-canvas)';\n"],
    ['a URL that carries two slashes before a colour', true, 'renderer/a/g.ts', "export const u = 'https://x/y'; export const fill = '#131417';\n"],
    ['an rgb() built in a template string', true, 'renderer/a/h.ts', 'export const fill = `rgb(19, 20, 23)`;\n']
  ];
  const out = [];
  for (const [name, shouldFail, rel, text] of files) {
    const root = join(base, name.replace(/\s+/g, '-'));
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
    out.push({ name, shouldFail, root });
  }
  return out;
}

/**
 * RULES 24 AND 25 over one answer (Phase 213): what the surfaces that do not
 * read a token at draw time say, and whether the dark half of each is still
 * the bytes the parent commit had. A list of problems, so rule 13 can run it
 * over an ablated copy and see the clause it removed go red rather than see
 * a coarse walk twitch somewhere else.
 */
function pinFacts(a) {
  const problems = [];
  const facts = a.facts;
  if (facts === undefined) return ['rule 24: the module facts were not read'];
  // Rule 27's clauses live here so an ablated copy reaches them (Phase 213).
  const carry = facts.carryover;
  if (carry === null || carry === undefined) problems.push('rule 27: the probe read no carryover, so the scheme change is unproved');
  else {
    if (carry.outsideAfterMove !== 0) problems.push(`rule 27: ${String(carry.outsideAfterMove)} carried frame(s) are still outside the light region after the move`);
    if (carry.darkUnmoved !== carry.darkOffered) problems.push(`rule 27: choosing Dark moved ${String(carry.darkOffered - carry.darkUnmoved)} of the ${String(carry.darkOffered)} frames the dark base offers; it must move none`);
    if (carry.lightToDarkUnmoved !== carry.lightOffered) problems.push(`rule 27: going back to Dark moved ${String(carry.lightOffered - carry.lightToDarkUnmoved)} of the ${String(carry.lightOffered)} frames the light base offers; every one of them is inside the dark region`);
    if (carry.movedToLight === 0) problems.push('rule 27: not one frame moved on the way to paper, so frameForBase is doing nothing and the rule cannot fail');
  }
  const t = facts.terminal;
  if (Object.keys(t.light).length !== Object.keys(t.dark).length) {
    problems.push(`rule 24: the light terminal theme has ${String(Object.keys(t.light).length)} keys against the dark theme's ${String(Object.keys(t.dark).length)}`);
  }
  for (const [key, hex] of Object.entries(t.light)) {
    if (t.dark[key] !== undefined && String(hex).toLowerCase() === String(t.dark[key]).toLowerCase()) {
      problems.push(`rule 24: the light terminal ${key} is the dark one, ${String(hex)}`);
    }
  }
  // THE PALETTE IN EFFECT IS THE BASE'S OWN, and it stands apart from itself.
  // A round that handed the light base the DARK sixteen would still clear the
  // floors, because the follow re-solves every one of them dark on paper; what
  // it would lose is the design, being the eight normal slots at about 6.5:1
  // in the dark palette's own hues and the eight bright ones lighter and half
  // again as saturated at exactly 4.5, so bold text, which xterm draws in the
  // bright slot, is still text. Research 80 measured the vendors at dE2000 0
  // to 6.4 between a bright and its normal, and this palette at 9.24 or more.
  for (const [base, want, ground] of [
    ['followedDark', 'dark', '#131417'],
    ['followedLight', 'light', '#f5f7fa']
  ]) {
    const followed = t[base];
    const constant = t[want];
    if (Object.keys(followed).length === 0) {
      problems.push(`rule 24: the ${want} terminal palette in effect could not be read`);
      continue;
    }
    for (const [key, hex] of Object.entries(followed)) {
      if (constant[key] !== undefined && String(hex).toLowerCase() !== String(constant[key]).toLowerCase()) {
        problems.push(`rule 24: at the shipped ${want} ground the terminal ${key} is ${String(hex)} where the ${want} constant says ${String(constant[key])}`);
      }
    }
    let worstDelta = Infinity;
    let worstPair = '';
    for (const name of ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']) {
      const bright = `bright${name[0].toUpperCase()}${name.slice(1)}`;
      if (followed[name] === undefined || followed[bright] === undefined) continue;
      const d = deltaE(followed[name], followed[bright]);
      if (d < worstDelta) {
        worstDelta = d;
        worstPair = `${name} and ${bright}`;
      }
    }
    // THE SEPARATION IS THE LIGHT PALETTE'S CLAIM AND NOT THE DARK ONE'S. The
    // dark sixteen ship as they shipped and read 5.11 at their tightest, being
    // green against brightGreen; this phase does not move them and may not
    // hold them to a number they were never solved to. The light sixteen were
    // solved to 9.24 or more on purpose, because on paper the lift that makes
    // a bright slot bright is a lift toward the GROUND rather than away from
    // it, and a smaller step would put bold text and plain text at one colour.
    if (want === 'light' && worstDelta < 9) {
      problems.push(`rule 24: on the ${want} base ${worstPair} are dE2000 ${worstDelta.toFixed(2)} apart, under 9, so bold text and plain text are one colour`);
    }
    if (want === 'light') {
      for (const name of ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan']) {
        const bright = `bright${name[0].toUpperCase()}${name.slice(1)}`;
        const normal = wcagContrast(followed[name], ground);
        const lifted = wcagContrast(followed[bright], ground);
        if (normal < 6) problems.push(`rule 24: on paper the terminal ${name} reads ${normal.toFixed(2)}:1, under the 6.5 the palette was solved to`);
        if (lifted < 4.4) problems.push(`rule 24: on paper the terminal ${bright} reads ${lifted.toFixed(2)}:1, under 4.5`);
        if (!(lifted < normal)) problems.push(`rule 24: on paper the terminal ${bright} is not lighter than ${name}`);
      }
    }
  }
  if (t.floorLight !== 4.5) problems.push(`rule 24: xterm's contrast floor on the light theme is ${String(t.floorLight)}, not 4.5`);
  if (t.floorDark !== DARK_AT_THE_PARENT.contrastFloor) problems.push(`rule 24: xterm's contrast floor on the dark theme is ${String(t.floorDark)}, not ${String(DARK_AT_THE_PARENT.contrastFloor)}`);
  if (facts.monaco === null) problems.push('rule 24: Monaco has no theme table this gate could read');
  else {
    if (facts.monaco.dark.base !== 'vs-dark') problems.push(`rule 24: Monaco's dark theme sits on ${String(facts.monaco.dark.base)}`);
    if (facts.monaco.light.base !== 'vs') problems.push(`rule 24: Monaco's light theme sits on ${String(facts.monaco.light.base)}, not vs`);
    const bg = facts.monaco.light.colors['editor.background'];
    if (!(wcagLuminance(bg) > 0.5)) problems.push(`rule 24: Monaco's light ground is ${String(bg)}, which is not light`);
  }
  if (facts.pierre === null) problems.push('rule 24: the Pierre bridge could not be evaluated');
  else {
    if (facts.pierre.darkType !== 'dark') problems.push(`rule 24: Pierre's dark theme has type ${String(facts.pierre.darkType)}`);
    if (facts.pierre.lightType !== 'light') problems.push(`rule 24: Pierre's second theme has type ${String(facts.pierre.lightType)}, not light`);
    if (facts.pierre.pair.dark === facts.pierre.pair.light) {
      problems.push(`rule 24: the theme pair names ${String(facts.pierre.pair.dark)} in both slots, which is the limit Phases 207 and 210 recorded`);
    }
    if (facts.pierre.treeKeys.includes('colorScheme')) {
      problems.push('rule 24: the tree host still pins a colorScheme of its own, so it cannot inherit the root');
    }
  }
  // THE TWO SHADOW HOSTS, and the p213 app run is what found this. Deleting
  // the key the bridge writes is only half: both Pierre packages declare
  // `color-scheme: light dark` on their own `:host`, and every `light-dark()`
  // inside those shadow roots then resolves from the MAC rather than from the
  // base the person chose. An outer document rule matching the host element
  // outranks a `:host` rule in its own shadow tree, so globals.css is where
  // the chain is restored, and this is what keeps it there.
  for (const [tag, value] of [
    ['diffs-container', facts.hosts.diffs],
    ['file-tree-container', facts.hosts.tree]
  ]) {
    if (value === null) {
      problems.push(`rule 24: no rule in globals.css gives ${tag} a color-scheme, so its shadow root reads the Mac and not the base`);
    } else if (value !== 'inherit') {
      problems.push(`rule 24: globals.css gives ${tag} color-scheme ${value} rather than inherit`);
    }
  }
  if (!/^#f5f7fa$/i.test(facts.windowFill.light)) problems.push(`rule 24: the window fill on light is ${String(facts.windowFill.light)}`);
  if (facts.windowFill.lightAt40 === facts.windowFill.light) problems.push('rule 24: the light window fill does not turn with the hue');
  if (facts.windowFill.light === facts.windowFill.dark) problems.push('rule 24: the window fill is the same colour on both bases');

  // Rule 25. Dark is byte identical, against the parent commit's own numbers.
  const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const got = {
    tokens: facts.tokensSha.dark,
    terminal: sha(facts.terminal.dark),
    monaco: facts.monaco === null ? 'unread' : sha(facts.monaco.dark),
    pierre: facts.pierre === null ? 'unread' : facts.pierre.darkSha,
    fill: facts.windowFill.dark,
    fillAt40: facts.windowFill.darkAt40,
    contrastFloor: facts.terminal.floorDark
  };
  for (const [what, want] of Object.entries(DARK_AT_THE_PARENT)) {
    if (got[what] !== want) {
      problems.push(`rule 25: the dark ${what} is ${String(got[what])} where the parent commit 02fd5ed had ${String(want)}`);
    }
  }
  return problems;
}


function runProbe(roots) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/hue-conformance-probe.mts', JSON.stringify({ roots })],
    { encoding: 'utf8', cwd: repoRoot, maxBuffer: 256 * 1024 * 1024 }
  );
  if (probe.status !== 0) {
    throw new Error(`the probe did not run: ${probe.stderr || '(no output)'}`);
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  return JSON.parse(line);
}

// ---------------------------------------------------------------------------
// The pins, rules 1 to 12 over one answer, as a list of problems.
// ---------------------------------------------------------------------------

const NEUTRALS = [
  '--bg-canvas',
  '--bg-sidebar',
  '--bg-surface',
  '--bg-raised',
  '--bg-active',
  '--border',
  '--border-active',
  '--border-strong'
];
const OFFSET_TOKENS = ['--bg-raised', '--bg-active', '--border', '--border-active', '--border-strong'];
const TEXT_FLOORS = [
  ['--text-primary', '--bg-canvas', 4.5],
  ['--text-primary', '--bg-sidebar', 4.5],
  ['--text-primary', '--bg-surface', 4.5],
  ['--text-primary', '--bg-raised', 4.5],
  ['--text-primary', '--bg-active', 4.5],
  ['--text-secondary', '--bg-canvas', 4.5],
  ['--text-secondary', '--bg-sidebar', 4.5],
  ['--text-secondary', '--bg-surface', 4.5],
  ['--text-secondary', '--bg-raised', 4.5],
  ['--text-secondary', '--bg-active', 4.5],
  ['--text-muted', '--bg-canvas', 4.5],
  ['--text-muted', '--bg-sidebar', 4.5],
  ['--text-muted', '--bg-surface', 4.5]
];
const CHROMATIC_FLOORS = [
  ['--accent-text', '--bg-canvas', 4.5],
  ['--accent', '--bg-canvas', 3],
  ['--git-modified', '--bg-active', 3],
  ['--git-added', '--bg-active', 3],
  ['--git-deleted', '--bg-active', 3],
  ['--git-renamed', '--bg-active', 3],
  ['--git-conflict', '--bg-active', 3],
  ['--graph-lane-3', '--bg-active', 3],
  ['--graph-lane-5', '--bg-active', 3]
];
const TEXT_TOKENS = ['--text-primary', '--text-secondary', '--text-muted', '--text-disabled'];
const TERMINAL_EXEMPT = new Set(['black', 'brightBlack']);
const HAIRLINES = [
  ['--border', '--bg-sidebar', 1.297, 0.03],
  ['--border-active', '--bg-active', 1.105, 0.02],
  ['--bg-raised', '--bg-surface', 1.094, 0.02]
];
/**
 * THE OFFERED REGION (Phase 210), one line per shade stop, the first and last
 * depth stop that keeps every floor at all three contrast levels and all four
 * highlight schemes. Measured rather than chosen, and pinned here so a change
 * to either axis is a diff in this file rather than a person meeting a floor.
 *
 * The dark end is bound by the RENDERED STEP: near black, eight bits run out
 * before the ramp does, and shade -4 needs the depth widened to keep its rungs
 * apart at all. The light end is bound by the GIT DECORATIONS on --bg-active,
 * which this phase refuses to move.
 */
/**
 * THE WITNESSES. The hue at which each of the fourteen refused cells actually
 * fails, measured on the shipping tree at every whole degree. The walk carries
 * them whatever its step, because the failures sit in clusters a few degrees
 * wide: the dark end fails around 0 and 3 and again at 198, and the light end
 * around 121 and 211. Without them a coarse walk over an ablated copy would
 * step past every one and turn the region rule red for a reason that has
 * nothing to do with the ablation, which is a gate proving nothing.
 *
 * PHASE 213 ADDED ONE, being 30, and it is the light base's. The light region
 * is four cells, so 45 of the 49 pairs are refused there and a coarse walk has
 * far more chances to step past a refusal than it had on the dark base. Run
 * over every whole degree, the six cells `-4,-3`, `-4,-2`, `-3,-3`, `-2,-3`,
 * `-1,-3` and `-1,-2` fail at 30 and at 248 and nowhere in the eight coarse
 * degrees or the five dark witnesses; 30 covers all six, so it is the only one
 * added. Every other refused light cell already fails at a hue the coarse walk
 * visits.
 */
const WITNESS_HUES = [0, 3, 30, 121, 198, 211];

const REGION = {
  '-4': [1, 3],
  '-3': [-2, 3],
  '-2': [-3, 3],
  '-1': [-3, 2],
  '0': [-3, 1],
  '1': [-3, 0],
  '2': [-3, 0]
};

/**
 * THE LIGHT BASE'S OWN TABLES (Phase 213). Everything the dark base pins, on
 * its own palette, with the three differences rule 22 names.
 */
const ORDER_RUNS = {
  // Darkest first, in WCAG luminance, one pair per rung.
  dark: [
    ['--bg-sidebar', '--bg-canvas'],
    ['--bg-canvas', '--bg-surface'],
    ['--bg-surface', '--bg-raised'],
    ['--bg-raised', '--bg-active'],
    ['--border', '--border-active'],
    ['--border-active', '--border-strong']
  ],
  // On paper elevation is shadow, so the run turns over: the selected row is
  // the deepest fill, the frame sits under the paper and the sheet above it.
  light: [
    ['--bg-active', '--bg-raised'],
    ['--bg-raised', '--bg-sidebar'],
    ['--bg-sidebar', '--bg-canvas'],
    ['--bg-canvas', '--bg-surface'],
    ['--border-strong', '--border-active'],
    ['--border-active', '--border']
  ]
};

/**
 * The status dots (Phase 213). Phase 210 recorded this floor as OPEN on the
 * dark base, where the idle grey reads 3.15 on the shipped active fill and a
 * lighter shade takes it under, so adding it there would refuse frames people
 * already chose. The light palette was designed TO it: 3.52, 3.53, 3.41 and
 * 3.40 at the shipped frame, and the badge's paper text 4.51 on its amber.
 */
const STATUS_FLOORS_LIGHT = [
  ['--status-working', '--bg-active', 3],
  ['--status-attention', '--bg-active', 3],
  ['--status-idle', '--bg-active', 3],
  ['--status-failed', '--bg-active', 3],
  ['--status-attention-badge-fg', '--status-attention-badge-bg', 4.5]
];

const CHROMATIC_BY_SCHEME = {
  dark: CHROMATIC_FLOORS,
  light: [...CHROMATIC_FLOORS, ...STATUS_FLOORS_LIGHT]
};

/** The shipped hairline ratios of each base, and the band the rotation keeps. */
const HAIRLINES_BY_SCHEME = {
  dark: HAIRLINES,
  light: [
    ['--border', '--bg-sidebar', 1.299, 0.03],
    ['--border-active', '--bg-active', 1.271, 0.02],
    ['--bg-raised', '--bg-surface', 1.207, 0.02]
  ]
};

/**
 * THE OFFERED REGION ON PAPER, four cells, and both edges are the palette's
 * own design. The light end is the ramp's room: the sheet sits at OKLCH L
 * 0.992 and one stop lighter puts it on white beside a canvas under it. The
 * dark end is the chromatic family, which the frame never moves and which
 * research 80 solved AT its floors so the accent could be text on paper and
 * the dots could clear the active row. An empty row means no depth is
 * offered at that shade.
 */
const REGION_LIGHT = {
  '-4': [0, -1],
  '-3': [0, -1],
  '-2': [0, -1],
  '-1': [0, -1],
  '0': [-3, 0],
  '1': [0, -1],
  '2': [0, -1]
};
const REGION_BY_SCHEME = { dark: REGION, light: REGION_LIGHT };

/**
 * THE TWO CELLS ONLY A HIGHLIGHT SCHEME REFUSES, measured over every whole
 * degree, and they are the light base's own arithmetic rather than a hole in
 * the walk. `--accent-text` ships AT its floor on paper, 5.03:1 on the canvas
 * against 4.5, because research 80 solved it there so the accent could be text
 * on paper at all. The highlight scheme is the one control that moves the
 * accent rather than the ground under it, and Teal at hue 30 with the shade
 * one stop darker takes it to 4.49. So shade -1 at depths -3 and -2 read
 * feasible on all three BLUE arms and are refused by the two Teal ones, which
 * is why the region has no shade -1 row at all.
 *
 * The exhaustive root walks the scheme arms and therefore pins these two like
 * every other cell. The ablated copies do NOT walk them, by the probe's own
 * rampArms rule, so asking them about these two would turn rule 22 red for
 * every ablation for a reason that has nothing to do with the clause removed.
 * They are named here rather than left to a coarse walk's luck.
 */
const SCHEME_BOUND_LIGHT = new Set(['-1,-3', '-1,-2']);

/**
 * WHAT THE DARK BASE WAS, MEASURED AT THE PARENT COMMIT 02fd5ed, before the
 * first commit of this phase. Every one of these was read by running the
 * PARENT'S OWN modules under node, not by reading this tree and hoping. The
 * digests are over JSON.stringify of the object each shipping module builds,
 * and over the dark `:root` block of tokens.css with comments stripped.
 */
const DARK_AT_THE_PARENT = {
  tokens: 'dc5f1cd86e72b1027576de211756d338dae7e657f1fe1c2bc1d66bd208dba547',
  terminal: '673310f70b7817313d0eff2fa975bad322dbb307b24eac5fd4a49be0e9371040',
  monaco: '6f76352eb330dc48c9f620aa4b278d421dd22284cb518bc348ad751c24f1c82a',
  pierre: '60f7d3ddf2df37dc7621419de1e0f7fb0c028ffe180ab7552dffac8a3d5bf04f',
  fill: '#131417',
  fillAt40: '#151411',
  contrastFloor: 1
};

const THRESHOLD = Math.sqrt(0.05 * 1.05) - 0.05;
const LIGHTNESS_BAND = 0.005;
const OFFSET_BAND = 12;

const hueDiff = (a, b) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(d, 360 - d);
};
const yOf = (css) => wcagLuminance(css);
const L = (() => {
  const { converter, parse } = require('culori');
  const toOklch = converter('oklch');
  return (css) => toOklch(parse(css))?.l ?? -1;
})();

function pin(a, scheme = 'dark') {
  const light = scheme === 'light';
  const CHROMA = CHROMATIC_BY_SCHEME[scheme];
  const HAIRS = HAIRLINES_BY_SCHEME[scheme];
  const RUNS = ORDER_RUNS[scheme];
  const REG = REGION_BY_SCHEME[scheme];
  const problems = [];
  const once = new Map();
  const problem = (key, text) => {
    if (once.has(key)) {
      once.set(key, once.get(key) + 1);
      return;
    }
    once.set(key, 1);
    problems.push(text);
  };

  // Rule 1.
  if (Object.keys(a.atDefault).length !== 0) problem('r1', `rule 1: 222 derives ${String(Object.keys(a.atDefault).length)} override(s)`);
  if (Object.keys(a.at582).length !== 0) problem('r1b', 'rule 1: 582 derives overrides');
  // Rule 2.
  if (a.wrap.at360 !== a.wrap.at0) problem('r2', 'rule 2: 360 does not derive what 0 derives');
  if (a.wrap.atMinus1 !== a.wrap.at359) problem('r2b', 'rule 2: -1 does not derive what 359 derives');
  if (a.wrap.atFraction !== a.wrap.at0) problem('r2c', 'rule 2: 0.4 does not derive what 0 derives');
  if (a.wrap.at0 === '{}') problem('r2d', 'rule 2: 0 derives nothing at all');

  const wantKeys = [...NEUTRALS].sort().join(',');
  for (const s of a.circle) {
    const tag = `hue ${String(s.hue)} ${s.contrast}`;
    // Rule 3.
    if (s.contrast === 'normal' && s.hue !== 222) {
      if (!light && s.keys.join(',') !== wantKeys) {
        problem('r3', `rule 3: at ${tag} the map holds [${s.keys.join(', ')}] rather than the eight neutrals`);
      }
      // On paper the text is dark and the dark side of the text rule keeps
      // the SHIPPED RATIO, so a ground that rotates re-solves the text by a
      // level. The eight neutrals must still all be there, and a chromatic
      // token must never be, which is what this rule was always for.
      if (light) {
        const missing = NEUTRALS.filter((token) => !s.keys.includes(token));
        if (missing.length !== 0) problem('r3', `rule 3: at ${tag} the map is missing ${missing.join(', ')}`);
        const stray = s.keys.filter((k) => !NEUTRALS.includes(k) && !TEXT_TOKENS.includes(k));
        if (stray.length !== 0) problem('r3b', `rule 3: at ${tag} the map holds ${stray.join(', ')}, which is neither a neutral nor a text token`);
      }
    }
    // Rule 4.
    if (s.contrast === 'normal') {
      for (const token of NEUTRALS) {
        const drift = Math.abs(s.lightness[token] - a.shippedL[token]);
        if (drift > LIGHTNESS_BAND) {
          problem(`r4 ${token}`, `rule 4: ${token} at ${tag} reads OKLCH L ${s.lightness[token].toFixed(4)} against shipped ${a.shippedL[token].toFixed(4)}, drift ${drift.toFixed(4)} past ${String(LIGHTNESS_BAND)}`);
        }
      }
    }
    // Rule 5.
    if (s.contrast === 'normal' && s.hue !== 222) {
      for (const token of OFFSET_TOKENS) {
        const want = a.shippedHue[token] + (s.hue - 222);
        const d = hueDiff(s.hues[token], want);
        if (d > OFFSET_BAND) {
          problem(`r5 ${token}`, `rule 5: ${token} at ${tag} reads hue ${s.hues[token].toFixed(1)} where the offset says ${((want % 360) + 360) % 360 | 0}, off by ${d.toFixed(1)}`);
        }
      }
    }
    // Rule 6.
    const v = s.values;
    for (const [lo, hi] of RUNS) {
      if (!(yOf(v[lo]) < yOf(v[hi]))) problem(`r6 ${lo}`, `rule 6: at ${tag} ${lo} (${v[lo]}) is not below ${hi} (${v[hi]})`);
    }
    // Rule 7.
    for (const [fg, bg, floor] of [...TEXT_FLOORS, ...CHROMA]) {
      const ratio = wcagContrast(v[fg], v[bg]);
      if (ratio < floor) problem(`r7 ${fg} ${bg}`, `rule 7: at ${tag} ${fg} on ${bg} reads ${ratio.toFixed(3)}:1 under ${String(floor)}`);
    }
    const canvas = v['--bg-canvas'];
    for (const [key, hex] of Object.entries(s.terminal)) {
      const floor = key === 'foreground' ? 4.5 : TERMINAL_EXEMPT.has(key) ? 0 : 3;
      const ratio = wcagContrast(hex, canvas);
      if (ratio < floor) problem(`r7 terminal ${key}`, `rule 7: at ${tag} the terminal ${key} reads ${ratio.toFixed(3)}:1 on the canvas under ${String(floor)}`);
    }
    // Rule 8.
    if (s.contrast === 'normal') {
      for (const [x, y, pinned, band] of HAIRS) {
        const ratio = wcagContrast(v[x], v[y]);
        if (Math.abs(ratio - pinned) > band) problem(`r8 ${x}`, `rule 8: at ${tag} ${x} on ${y} reads ${ratio.toFixed(3)}:1, outside ${String(pinned)} plus or minus ${String(band)}`);
      }
    }
  }

  // Rules 9 to 12 are the SYNTHETIC GROUND, and only the dark base walks it:
  // the flip is what a ground lifted from graphite toward white does, and the
  // light base is already past it, which rule 22 pins as rule 20 inverted.
  if (light) {
    pinRegion(a, scheme, REG, CHROMA, problem);
    return problems;
  }

  // Rule 9.
  if (Math.abs(a.threshold - THRESHOLD) > 1e-6) problem('r9', `rule 9: the threshold is ${String(a.threshold)}, not sqrt(0.05 x 1.05) - 0.05 = ${THRESHOLD.toFixed(6)}`);
  let crossings = 0;
  let firstDark = null;
  let lastLight = null;
  for (let i = 0; i < a.lifts.length; i += 1) {
    const s = a.lifts[i];
    if (s.textDark && firstDark === null) firstDark = s;
    if (!s.textDark) lastLight = s;
    if (i > 0 && s.textDark !== a.lifts[i - 1].textDark) crossings += 1;
  }
  if (crossings !== 1) problem('r9b', `rule 9: the polarity crosses ${String(crossings)} time(s) over the walk, not once`);
  if (firstDark === null) problem('r9c', 'rule 9: the text never goes dark over the walk to white');
  if (firstDark !== null && firstDark.canvasY <= THRESHOLD) problem('r9d', `rule 9: the first dark ground has Y ${firstDark.canvasY.toFixed(4)}, at or under the threshold`);
  if (lastLight !== null && firstDark !== null && lastLight.lift < firstDark.lift && lastLight.canvasY > THRESHOLD) problem('r9e', `rule 9: a light ground has Y ${lastLight.canvasY.toFixed(4)}, over the threshold`);

  // Rules 10 and 11.
  let bandStart = null;
  let bandEnd = null;
  for (const s of a.lifts) {
    const v = s.values;
    const tag = `lift ${s.lift.toFixed(3)} (canvas ${s.canvas}, Y ${s.canvasY.toFixed(4)})`;
    const end = s.textDark ? '#000000' : '#ffffff';
    for (const [fg, bg, floor] of TEXT_FLOORS) {
      const ratio = wcagContrast(v[fg], v[bg]);
      if (ratio >= floor) continue;
      const best = wcagContrast(end, v[bg]);
      if (best < floor) {
        // No colour on this side can meet the floor here. The band.
        if (bandStart === null) bandStart = s;
        bandEnd = s;
        if (v[fg].toLowerCase() !== end) problem(`r10 end ${fg} ${bg}`, `rule ${s.textDark ? '11' : '10'}: at ${tag} ${fg} on ${bg} reads ${ratio.toFixed(3)}:1 under ${String(floor)} and is ${v[fg]} rather than ${end}, the end of its side`);
        continue;
      }
      problem(`r10 ${fg} ${bg} ${String(s.textDark)}`, `rule ${s.textDark ? '11' : '10'}: at ${tag} ${fg} on ${bg} reads ${ratio.toFixed(3)}:1 under ${String(floor)} where ${end} would read ${best.toFixed(3)}:1`);
    }
    for (const [key, hex] of Object.entries(s.terminal)) {
      const floor = key === 'foreground' ? 4.5 : TERMINAL_EXEMPT.has(key) ? 0 : 3;
      const ratio = wcagContrast(hex, s.canvas);
      if (ratio < floor) problem(`r10 terminal ${key} ${String(s.textDark)}`, `rule ${s.textDark ? '11' : '10'}: at ${tag} the terminal ${key} reads ${ratio.toFixed(3)}:1 under ${String(floor)}`);
    }
    if (s.textDark) {
      for (const token of ['--text-primary', '--text-secondary', '--text-muted', '--text-disabled']) {
        const ground = token === '--text-muted' ? v['--bg-surface'] : v['--bg-canvas'];
        if (!(L(v[token]) < L(ground))) problem(`r11 ${token}`, `rule 11: at ${tag} ${token} (${v[token]}) is not darker than its ground (${ground})`);
      }
      for (const [key, hex] of Object.entries(s.terminal)) {
        if (!(L(hex) < L(s.canvas))) problem(`r11 terminal ${key}`, `rule 11: at ${tag} the terminal ${key} (${hex}) is not darker than the canvas`);
      }
      if (s.canvasY >= 0.55) {
        const ratio = wcagContrast(v['--text-primary'], v['--bg-canvas']);
        const shipped = wcagContrast(a.shipped['--text-primary'], a.shipped['--bg-canvas']);
        if (Math.abs(ratio - shipped) > 0.2) problem('r11 kept', `rule 11: at ${tag} --text-primary reads ${ratio.toFixed(3)}:1 where the shipped ${shipped.toFixed(3)}:1 is reachable`);
      }
    }
  }

  if (firstDark !== null && bandStart !== null && bandEnd !== null) {
    if (!(bandStart.lift <= firstDark.lift && firstDark.lift <= bandEnd.lift + 0.0001)) {
      problem('r11 band', `rule 11: the flip at lift ${firstDark.lift.toFixed(3)} lies outside the band ${bandStart.lift.toFixed(3)} to ${bandEnd.lift.toFixed(3)} where no single polarity clears every floor`);
    }
  }

  // Rule 12.
  const far = a.lifts.filter((s) => s.textDark && s.canvasY >= 0.6);
  for (const s of far) {
    const normal = L(s.values['--text-primary']);
    const high = L(s.high['--text-primary']);
    if (!(high < normal)) {
      problem('r12', `rule 12: at lift ${s.lift.toFixed(3)} High leaves --text-primary at L ${high.toFixed(4)} against Normal ${normal.toFixed(4)}, no darker`);
      break;
    }
  }


  pinRegion(a, scheme, REG, CHROMA, problem);
  return problems;
}

/**
 * Rules 15 to 21 over one base. Extracted from `pin` in Phase 213 so the
 * light base walks exactly the same code with its own region, its own
 * chromatic family and rule 20 the other way up. `problem` is the caller's
 * own de-duplicating collector, so a family that fails at four hundred hues
 * is one line rather than four hundred.
 */
function pinRegion(a, scheme, REG, CHROMA, problem) {
  const light = scheme === 'light';
  const walksSchemes = a.ramp.some((c) => c.scheme !== 'blue');
  // Rule 15, THE OFFERED REGION. Every (shade, depth) pair, judged over all
  // three contrast levels and all four highlight schemes, is feasible exactly
  // where the table below says. The table is what the two sliders offer, so a
  // change to either axis that moved the region shows up here as a diff
  // rather than as a person meeting a floor.
  const region = new Map();
  for (const cell of a.ramp) {
    const key = `${String(cell.shade)},${String(cell.depth)}`;
    const seen = region.get(key) ?? { ok: true, binding: '', hue: -1, arm: '' };
    if (!cell.feasible && seen.ok) {
      seen.ok = false;
      seen.binding = cell.binding;
      seen.hue = cell.bindingHue;
      seen.arm = `${cell.contrast} ${cell.scheme}`;
    }
    if (!cell.feasible) seen.ok = false;
    region.set(key, seen);
  }
  // The SHIPPING table the control offers from must be this region too. The
  // walk proves the region; this proves the sliders offer it. Without this the
  // two could drift and rule 15 would still be green.
  for (const shade of a.rampStops.shades) {
    const want = REG[String(shade)];
    const row = a.regionTable.find((r) => r.shade === shade);
    if (row === undefined) problem(`r15t-${String(shade)}`, `rule 15: the shipping region table has no row for shade ${String(shade)}`);
    else if (row.minDepth !== want[0] || row.maxDepth !== want[1]) {
      problem(`r15t-${String(shade)}`, `rule 15: the shipping region table offers depth ${String(row.minDepth)}..${String(row.maxDepth)} at shade ${String(shade)}, and the walk measures ${String(want[0])}..${String(want[1])}`);
    }
  }
  if (a.regionTable.length !== a.rampStops.shades.length) {
    problem('r15tn', `rule 15: the shipping region table has ${String(a.regionTable.length)} row(s) for ${String(a.rampStops.shades.length)} shade stop(s)`);
  }
  for (const shade of a.rampStops.shades) {
    const want = REG[String(shade)];
    for (const depth of a.rampStops.depths) {
      const seen = region.get(`${String(shade)},${String(depth)}`);
      if (seen === undefined) {
        problem('r15m', `rule 15: no cell walked at shade ${String(shade)} depth ${String(depth)}`);
        continue;
      }
      const expected = depth >= want[0] && depth <= want[1];
      // A root that walks only the blue arms cannot see the two cells the
      // Teal arm alone refuses, so it is not asked about them.
      if (light && !walksSchemes && SCHEME_BOUND_LIGHT.has(`${String(shade)},${String(depth)}`)) continue;
      if (seen.ok !== expected) {
        problem(
          `r15-${String(shade)}-${String(depth)}`,
          `rule 15: shade ${String(shade)} depth ${String(depth)} is ${seen.ok ? 'feasible' : 'refused'} and the region says ${expected ? 'feasible' : 'refused'}${seen.ok ? '' : ` (${seen.binding} at hue ${String(seen.hue)}, ${seen.arm})`}`
        );
      }
    }
    // Contiguity. A hole would make a slider that skips a stop.
    const run = a.rampStops.depths.filter((d) => region.get(`${String(shade)},${String(d)}`)?.ok === true);
    for (let i = 1; i < run.length; i += 1) {
      if (run[i] !== run[i - 1] + 1) problem('r15c', `rule 15: the depth stops at shade ${String(shade)} are not contiguous: ${run.join(' ')}`);
    }
  }
  for (const depth of a.rampStops.depths) {
    const run = a.rampStops.shades.filter((sh) => region.get(`${String(sh)},${String(depth)}`)?.ok === true);
    for (let i = 1; i < run.length; i += 1) {
      if (run[i] !== run[i - 1] + 1) problem('r15c2', `rule 15: the shade stops at depth ${String(depth)} are not contiguous: ${run.join(' ')}`);
    }
  }

  // Rule 16, EVERY FLOOR HOLDS AT EVERY OFFERED FRAME. The families the walk
  // measured, at every cell the region offers, over every hue it walked.
  for (const cell of a.ramp) {
    if (!cell.feasible) continue;
    const where = `shade ${String(cell.shade)} depth ${String(cell.depth)} ${cell.contrast} ${cell.scheme}`;
    if (cell.worstText < 0) problem('r16t', `rule 16: text under its floor by ${cell.worstText.toFixed(3)} at ${where}`);
    if (cell.worstTerm < 0) problem('r16m', `rule 16: a terminal colour under its floor by ${cell.worstTerm.toFixed(3)} at ${where}`);
    if (cell.worstChroma < 0) problem('r16c', `rule 16: a chromatic token under its floor by ${cell.worstChroma.toFixed(3)} at ${where}`);
    if (cell.minStep < a.rampStops.stepMin) problem('r16s', `rule 16: two rungs ${String(cell.minStep)}/255 apart at ${where}`);
    if (cell.worstOrder <= 0) problem('r16o', `rule 16: the ramp is not strictly in order at ${where}`);
  }

  // Rule 17, THE ORDER NEVER INVERTS, at EVERY cell and not only the offered
  // ones. The transform is affine in OKLCH lightness with a positive slope,
  // so this is arithmetic rather than luck, and it must hold where the region
  // refuses too: what a refused stop loses is the eight bit distance between
  // two rungs, never their order.
  for (const cell of a.ramp) {
    const where = `shade ${String(cell.shade)} depth ${String(cell.depth)} ${cell.contrast} ${cell.scheme}`;
    // ON PAPER THE TOP OF THE RAMP HAS A CEILING (Phase 213). The dark base's
    // claim is arithmetic: an affine transform with a positive slope cannot
    // reorder anything, and no rung is near black at any offered cell. The
    // light base's sheet ships at OKLCH L 0.992, so a shade stop above the
    // shipped one puts it and the canvas both AT WHITE, where they stop being
    // two colours. That is exactly why the light region is one shade row, and
    // it is a clamp rather than an inversion: the rule holds strictly at every
    // OFFERED cell and holds as "never reordered" past them.
    const offered = REG[String(cell.shade)] !== undefined && cell.depth >= REG[String(cell.shade)][0] && cell.depth <= REG[String(cell.shade)][1];
    if (offered || !light) {
      if (!(cell.worstOklch > 0)) problem('r17a', `rule 17: the ramp inverts in OKLCH lightness at ${where} (gap ${cell.worstOklch.toFixed(6)})`);
    } else if (cell.worstOklch < 0) {
      problem('r17a', `rule 17: the ramp REORDERS in OKLCH lightness at the refused ${where} (gap ${cell.worstOklch.toFixed(6)})`);
    }
    if (cell.worstOrder < 0) problem('r17b', `rule 17: the ramp inverts in WCAG luminance at ${where}`);
  }

  // Rule 18, THE CONTROL AND THE GATE REFUSE THE SAME THINGS. The shipping
  // floor predicate is what the sliders stop on; the walk above is what
  // proves the floors. Any disagreement is those two drifting apart, which
  // would let a person choose a frame this gate has ruled out.
  let disagreements = 0;
  for (const cell of a.ramp) disagreements += cell.disagree;
  if (disagreements !== 0) problem('r18', `rule 18: the shipping floor predicate disagreed with the walk at ${String(disagreements)} points`);

  // Rule 19, THE FRAME MOVES NO CHROMATIC TOKEN. The accent, the git
  // decorations and the graph lanes are meaning, and this phase moves the
  // ground under them and never them. Read against the SAME scheme and
  // contrast at the shipped frame, so the scheme's own work does not count.
  let moved = 0;
  for (const cell of a.ramp) moved += cell.chromaticMoved;
  if (moved !== 0) problem('r19', `rule 19: the frame moved a chromatic token at ${String(moved)} points`);

  // Rule 20, THE FLIP IS OUT OF REACH, and the phase says so rather than
  // claiming otherwise. Phase 210's own entry said the text flip would become
  // reachable; it does not, because the git decorations on --bg-active stop
  // the ramp four tenths of the way there. So the rule is the honest one: no
  // frame a person can choose reads dark, and the flip stays proved on the
  // synthetic ground by rules 9 to 11.
  let dark = 0;
  let points = 0;
  for (const cell of a.ramp) {
    dark += cell.darkHues;
    points += cell.hues;
  }
  if (scheme === 'light') {
    // INVERTED on paper, and this is where the flip fires for real: every
    // ground a person can choose on the light base is past the threshold, so
    // the text family reads DARK at every one of them.
    if (dark !== points) problem('r20', `rule 20: on paper the text family read light at ${String(points - dark)} of ${String(points)} points, where every one is past the flip`);
  } else if (dark !== 0) {
    problem('r20', `rule 20: the text family read dark at ${String(dark)} points, which no offered frame should reach`);
  }

  // Rule 21, THE SHIPPED FRAME IS STILL THE DEFAULT. Shade 0 and depth 0
  // write nothing at all, which is the zero override guarantee this phase
  // inherits and must not spend.
  const shippedPoint = a.rampPoints.find((p) => p.name === 'shipped');
  if (shippedPoint === undefined) problem('r21a', 'rule 21: the shipped point was not walked');
  else if (shippedPoint.keys.length !== 0) problem('r21', `rule 21: the shipped frame derives ${String(shippedPoint.keys.length)} override(s)`);
  // And the named points re-derive from their own bytes, which is the gate
  // checking the probe's aggregate arithmetic rather than trusting it. They
  // are all at the shipped hue 222, which is also what makes them the pin on
  // the other half of rule 21: every stop that is NOT the shipped one has to
  // move the ramp, at the default hue as much as at any other.
  if (shippedPoint !== undefined) {
    for (const point of a.rampPoints) {
      if (point.shade === 0 && point.depth === 0) continue;
      if (point.keys.length === 0) problem(`r21e-${point.name}`, `rule 21: the ${point.name} frame derives nothing at all`);
      if (point.shade !== 0 && point.values['--bg-canvas'] === shippedPoint.values['--bg-canvas']) {
        problem(`r21c-${point.name}`, `rule 21: the ${point.name} frame leaves the canvas at ${point.values['--bg-canvas']}, where the shipped frame has it`);
      }
      if (point.depth !== 0 && point.values['--bg-sidebar'] === shippedPoint.values['--bg-sidebar']) {
        problem(`r21d-${point.name}`, `rule 21: the ${point.name} frame leaves the sidebar at ${point.values['--bg-sidebar']}, where the shipped frame has it`);
      }
    }
  }
  for (const point of a.rampPoints) {
    // Only at a frame the region OFFERS. On the dark base every named point
    // is inside it; on paper the region is four cells and the named points
    // walk past it on purpose, so a refused point's ratios are the refusal
    // rather than a failure.
    const row = REG[String(point.shade)];
    if (row === undefined || point.depth < row[0] || point.depth > row[1]) continue;
    for (const [fg, bg, floor] of [...TEXT_FLOORS, ...CHROMA]) {
      const r = wcagContrast(point.values[fg], point.values[bg]);
      if (r < floor) problem('r21r', `rule 21: at the ${point.name} frame ${fg} on ${bg} is ${r.toFixed(3)}:1, under ${String(floor)}`);
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'gmux-p207-conformance-'));
try {
  // The copies import culori and zustand, which node resolves by walking up
  // from the importing file, so the repository's node_modules is linked
  // beside them. Nothing is installed and nothing is written into it.
  symlinkSync(join(repoRoot, 'node_modules'), join(scratch, 'node_modules'), 'dir');
  // THE SAMPLING, and rule 15 says why it is what it is. The shipping tree
  // walks EVERY WHOLE DEGREE against all 49 stop pairs; the ablated copies
  // walk every forty fifth, because an ablation removes a clause and so fails
  // at every hue, while the real thing fails in clusters a coarse step steps
  // over. That is 67,032 derivations for the shipping tree and 1,764 each for
  // the copies.
  const roots = [{ name: 'shipping', root: join(repoRoot, 'src'), hueStep: 1, extraHues: WITNESS_HUES }];
  for (const [i, ablation] of ABLATIONS.entries()) {
    roots.push({ name: `ablation-${String(i)}`, root: ablatedCopy(join(scratch, `ablation-${String(i)}`), ablation), hueStep: 45, extraHues: WITNESS_HUES });
  }
  const started = Date.now();
  const answers = runProbe(roots);
  say(`${TAG} walked ${String(roots.length)} module trees in ${String(Date.now() - started)} ms`);

  const shipping = answers.shipping;
  if (shipping === undefined || 'error' in shipping) {
    fail(`the shipping tree did not run: ${shipping?.error ?? 'no answer'}`);
  } else {
    const problems = pin(shipping);
    for (const p of problems) fail(p);
    if (problems.length === 0) {
      // The matrix: what the walk measured, one line per claim.
      const normal = shipping.circle.filter((s) => s.contrast === 'normal');
      say(`${TAG} rules 1 and 2: 222 and 582 derive {}, 360 is 0, -1 is 359, 0.4 is 0`);
      say(`${TAG} rule 3: ${String(normal.length - 1)} hues each write exactly the eight neutrals and no text`);
      for (const token of NEUTRALS) {
        let drift = 0;
        let at = 0;
        let distinct = new Set();
        for (const s of normal) {
          const d = Math.abs(s.lightness[token] - shipping.shippedL[token]);
          if (d > drift) {
            drift = d;
            at = s.hue;
          }
          distinct.add(s.values[token]);
        }
        say(`${TAG} rule 4: ${token.padEnd(16)} shipped L ${shipping.shippedL[token].toFixed(3)}, max drift ${drift.toFixed(4)} at ${String(at)}, ${String(distinct.size)} distinct bytes over the circle`);
      }
      const worst = new Map();
      for (const s of shipping.circle) {
        for (const [fg, bg, floor] of [...TEXT_FLOORS, ...CHROMATIC_FLOORS]) {
          const ratio = wcagContrast(s.values[fg], s.values[bg]);
          const key = `${fg} on ${bg}`;
          const cur = worst.get(key);
          if (cur === undefined || ratio < cur.ratio) worst.set(key, { ratio, hue: s.hue, contrast: s.contrast, floor });
        }
      }
      for (const [key, w] of worst) {
        say(`${TAG} rule 7: ${key.padEnd(34)} worst ${w.ratio.toFixed(3)}:1 at ${String(w.hue)} ${w.contrast}, floor ${String(w.floor)}`);
      }
      let termWorst = null;
      for (const s of shipping.circle) {
        for (const [key, hex] of Object.entries(s.terminal)) {
          if (TERMINAL_EXEMPT.has(key)) continue;
          const ratio = wcagContrast(hex, s.values['--bg-canvas']);
          if (termWorst === null || ratio < termWorst.ratio) termWorst = { ratio, key, hue: s.hue };
        }
      }
      say(`${TAG} rule 7: the terminal palette, worst ${termWorst.ratio.toFixed(3)}:1 for ${termWorst.key} at ${String(termWorst.hue)}, floor 3, and it is the shipped constant at every hue`);
      for (const [x, y, pinned] of HAIRLINES) {
        let lo = Infinity;
        let hi = 0;
        for (const s of normal) {
          const r = wcagContrast(s.values[x], s.values[y]);
          lo = Math.min(lo, r);
          hi = Math.max(hi, r);
        }
        say(`${TAG} rule 8: ${x} on ${y} ${lo.toFixed(3)} to ${hi.toFixed(3)} over the circle, pinned ${String(pinned)}`);
      }
      const firstDark = shipping.lifts.find((s) => s.textDark);
      const lastLight = [...shipping.lifts].reverse().find((s) => !s.textDark);
      say(`${TAG} rule 9: the threshold is Y ${THRESHOLD.toFixed(6)}; light up to lift ${lastLight.lift.toFixed(3)} (${lastLight.canvas}, Y ${lastLight.canvasY.toFixed(4)}), dark from lift ${firstDark.lift.toFixed(3)} (${firstDark.canvas}, Y ${firstDark.canvasY.toFixed(4)}), one crossing`);
      const rotationMaxY = Math.max(...normal.map((s) => yOf(s.values['--bg-canvas'])));
      say(`${TAG} rule 9: the rotation alone tops out at canvas Y ${rotationMaxY.toFixed(4)}, so no hue reaches the flip; the walk above is the synthetic ground`);
      let bandStart = null;
      let bandEnd = null;
      for (const s of shipping.lifts) {
        const end = s.textDark ? '#000000' : '#ffffff';
        const unreachable = TEXT_FLOORS.some(([, bg, floor]) => wcagContrast(end, s.values[bg]) < floor);
        if (!unreachable) continue;
        if (bandStart === null) bandStart = s;
        bandEnd = s;
      }
      say(`${TAG} rule 10: no single polarity clears every floor from canvas Y ${bandStart.canvasY.toFixed(4)} (lift ${bandStart.lift.toFixed(3)}) to Y ${bandEnd.canvasY.toFixed(4)} (lift ${bandEnd.lift.toFixed(3)}); there the text is white below the flip and black above it, and the flip at Y ${firstDark.canvasY.toFixed(4)} lies inside`);
      const lifted = shipping.lifts.find((s) => !s.textDark && s.values['--text-muted'] !== shipping.shipped['--text-muted']);
      say(`${TAG} rule 10: the first text token to move before the flip is --text-muted at lift ${lifted.lift.toFixed(3)} (surface ${lifted.values['--bg-surface']}), lifted to ${lifted.values['--text-muted']}`);
      const kept = shipping.lifts.find((s) => s.textDark && s.canvasY >= 0.55);
      say(`${TAG} rule 11: at canvas ${kept.canvas} --text-primary is ${kept.values['--text-primary']}, ${wcagContrast(kept.values['--text-primary'], kept.values['--bg-canvas']).toFixed(2)}:1, and the terminal foreground is ${kept.terminal.foreground}`);

      // The Phase 210 matrix: the region, drawn, and what binds each edge.
      const blue = shipping.ramp.filter((c) => c.scheme === 'blue');
      const walked = Math.max(...shipping.ramp.map((c) => c.hues));
      say(`${TAG} rule 15: the ramp walk is ${String(shipping.ramp.length)} cells, ${String(walked)} hues each on the exhaustive arms, ${String(shipping.ramp.reduce((n, c) => n + c.hues, 0))} derivations`);
      const cellOk = new Map();
      for (const c of shipping.ramp) {
        const key = `${String(c.shade)},${String(c.depth)}`;
        if (!c.feasible || cellOk.get(key) === false) cellOk.set(key, false);
        else if (!cellOk.has(key)) cellOk.set(key, true);
      }
      say(`${TAG} rule 15: the offered region, shade down the side and depth across, over 3 contrast levels and 4 schemes`);
      say(`${TAG} rule 15:          ${shipping.rampStops.depths.map((d) => String(d).padStart(5)).join('')}`);
      for (const shadeStop of shipping.rampStops.shades) {
        const row = shipping.rampStops.depths
          .map((d) => (cellOk.get(`${String(shadeStop)},${String(d)}`) === true ? '   on' : '    .'))
          .join('');
        const point = shipping.rampPoints.find((p) => p.shade === shadeStop && p.depth === 0);
        say(`${TAG} rule 15: shade ${String(shadeStop).padStart(2)}${row}   ${point === undefined ? '' : `canvas ${point.values['--bg-canvas']}`}`);
      }
      const edges = new Map();
      for (const c of blue) {
        if (c.feasible) continue;
        const key = c.binding.split(' ').slice(0, 3).join(' ');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
      for (const [what, n] of [...edges.entries()].sort((x, y) => y[1] - x[1])) {
        say(`${TAG} rule 15: ${String(n).padStart(3)} refused cell(s) bind on ${what}`);
      }
      let worstT = Infinity;
      let worstC = Infinity;
      let worstS = Infinity;
      let worstO = Infinity;
      let worstL = Infinity;
      for (const c of shipping.ramp) {
        if (c.feasible) {
          worstT = Math.min(worstT, c.worstText);
          worstC = Math.min(worstC, c.worstChroma);
          worstS = Math.min(worstS, c.minStep);
          worstO = Math.min(worstO, c.worstOrder);
        }
        worstL = Math.min(worstL, c.worstOklch);
      }
      say(`${TAG} rule 16: over every offered frame, text clears its floor by ${worstT.toFixed(3)}, the chromatic family by ${worstC.toFixed(3)}, the tightest rendered step is ${String(worstS)}/255 against a floor of ${String(shipping.rampStops.stepMin)}, and the tightest order gap is ${worstO.toFixed(6)} in luminance`);
      say(`${TAG} rule 17: over EVERY cell, offered or refused, the tightest OKLCH lightness gap is ${worstL.toFixed(6)}, so the ramp never inverts`);
      say(`${TAG} rule 18: the shipping floor predicate agreed with the walk at every one of ${String(shipping.ramp.reduce((n, c) => n + c.hues, 0))} points, so the control refuses what this gate refuses`);
      say(`${TAG} rule 19: no chromatic token moved with the frame at any point`);
      const lightest = shipping.rampPoints.find((p) => p.name === 'lightest');
      // The maximum over the WALK rather than over one named point at the
      // shipped hue. Both are printed, because the named point is what the
      // app run drives and the walk is what this rule claims.
      let lit = { maxCanvasY: -1, maxCanvas: '', maxCanvasHue: -1, shade: 0, depth: 0 };
      for (const c of shipping.ramp) {
        if (c.feasible && c.maxCanvasY > lit.maxCanvasY) lit = c;
      }
      say(`${TAG} rule 20: the text family read light at every point. The lightest frame a person can choose over the whole walk is canvas ${lit.maxCanvas}, Y ${lit.maxCanvasY.toFixed(4)}, at hue ${String(lit.maxCanvasHue)} shade ${String(lit.shade)} depth ${String(lit.depth)}; at the shipped hue the lightest named point is ${lightest.values['--bg-canvas']}, Y ${yOf(lightest.values['--bg-canvas']).toFixed(4)}. Against the flip at Y ${THRESHOLD.toFixed(4)} THE FLIP IS OUT OF REACH, and rules 9 to 11 are where it stays proved`);
      for (const point of shipping.rampPoints) {
        say(`${TAG} rule 21: the ${point.name.padEnd(16)} frame (shade ${String(point.shade).padStart(2)}, depth ${String(point.depth).padStart(2)}) writes ${String(point.keys.length).padStart(2)} token(s): canvas ${point.values['--bg-canvas']} sidebar ${point.values['--bg-sidebar']} active ${point.values['--bg-active']} border ${point.values['--border']}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Rules 22 to 26, the scheme axis (Phase 213).
  // -------------------------------------------------------------------------

  const lightAnswer = shipping === undefined || 'error' in shipping ? undefined : shipping.light;
  if (lightAnswer === undefined) {
    fail('rule 22: the light base was not walked');
  } else {
    const lightProblems = pin(lightAnswer, 'light');
    for (const problem of lightProblems) fail(problem);
    if (lightProblems.length === 0) {
      const normal = lightAnswer.circle.filter((s) => s.contrast === 'normal');
      say(`${TAG} rule 22: the light base, walked by the same probe over the light block of tokens.css`);
      say(`${TAG} rule 22: ${String(normal.length - 1)} hues each write the eight neutrals; the text follows the ground rather than staying put, because on paper it is dark and the dark side keeps the shipped ratio`);
      const drifts = [];
      for (const token of TEXT_TOKENS) {
        let worst = 0;
        for (const s of normal) worst = Math.max(worst, Math.abs(L(s.values[token]) - L(lightAnswer.shipped[token])));
        drifts.push(`${token} ${worst.toFixed(4)}`);
      }
      say(`${TAG} rule 22: the largest OKLCH lightness the text moves over the whole circle is ${drifts.join(', ')}, which is under an eight bit level`);
      const worst = new Map();
      for (const s of lightAnswer.circle) {
        for (const [fg, bg, floor] of [...TEXT_FLOORS, ...CHROMATIC_BY_SCHEME.light]) {
          const ratio = wcagContrast(s.values[fg], s.values[bg]);
          const key = `${fg} on ${bg}`;
          const cur = worst.get(key);
          if (cur === undefined || ratio < cur.ratio) worst.set(key, { ratio, hue: s.hue, contrast: s.contrast, floor });
        }
      }
      for (const [key, w] of worst) {
        const rule = key.startsWith('--status') ? 'rule 23' : 'rule 22';
        say(`${TAG} ${rule}: ${key.padEnd(46)} worst ${w.ratio.toFixed(3)}:1 at ${String(w.hue)} ${w.contrast}, floor ${String(w.floor)}`);
      }
      let termWorst = null;
      for (const s of lightAnswer.circle) {
        for (const [key, hex] of Object.entries(s.terminal)) {
          if (TERMINAL_EXEMPT.has(key)) continue;
          const ratio = wcagContrast(hex, s.values['--bg-canvas']);
          if (termWorst === null || ratio < termWorst.ratio) termWorst = { ratio, key, hue: s.hue };
        }
      }
      say(`${TAG} rule 22: the light terminal palette, worst ${termWorst.ratio.toFixed(3)}:1 for ${termWorst.key} at ${String(termWorst.hue)}, floor 3`);
      for (const [x, y, pinned] of HAIRLINES_BY_SCHEME.light) {
        let lo = Infinity;
        let hi = 0;
        for (const s of normal) {
          const r = wcagContrast(s.values[x], s.values[y]);
          lo = Math.min(lo, r);
          hi = Math.max(hi, r);
        }
        say(`${TAG} rule 22: ${x} on ${y} ${lo.toFixed(3)} to ${hi.toFixed(3)} over the circle, pinned ${String(pinned)}`);
      }
      const cellOk = new Map();
      for (const c of lightAnswer.ramp) {
        const key = `${String(c.shade)},${String(c.depth)}`;
        if (!c.feasible || cellOk.get(key) === false) cellOk.set(key, false);
        else if (!cellOk.has(key)) cellOk.set(key, true);
      }
      say(`${TAG} rule 22: the offered region on paper, shade down the side and depth across`);
      say(`${TAG} rule 22:          ${lightAnswer.rampStops.depths.map((d) => String(d).padStart(5)).join('')}`);
      for (const shadeStop of lightAnswer.rampStops.shades) {
        const row = lightAnswer.rampStops.depths
          .map((d) => (cellOk.get(`${String(shadeStop)},${String(d)}`) === true ? '   on' : '    .'))
          .join('');
        say(`${TAG} rule 22: shade ${String(shadeStop).padStart(2)}${row}`);
      }
      const edges = new Map();
      for (const c of lightAnswer.ramp) {
        if (c.feasible) continue;
        const key = c.binding.split(' ').slice(0, 3).join(' ');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
      for (const [what, n] of [...edges.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4)) {
        say(`${TAG} rule 22: ${String(n).padStart(4)} refused cell(s) bind on ${what}`);
      }
      say(`${TAG} rule 22: shade -1 at depths -3 and -2 is refused by the TEAL arm alone, at hue 30, on --accent-text, which ships at 5.03:1 against a floor of 4.5 on paper; the three blue arms offer them, so the region has no shade -1 row and the two cells are named in this gate rather than left to a coarse walk`);
      let points = 0;
      let darkPoints = 0;
      for (const c of lightAnswer.ramp) {
        points += c.hues;
        darkPoints += c.darkHues;
      }
      say(`${TAG} rule 22: rule 20 INVERTED. The text family reads dark at all ${String(darkPoints)} of ${String(points)} points on paper, so the flip Phase 210 could only reach on a synthetic ground is where this base lives`);
    }
  }

  // Rules 24 and 25, over the shipping tree.
  const facts = shipping === undefined || 'error' in shipping ? undefined : shipping.facts;
  {
    const problems = shipping === undefined || 'error' in shipping ? ['rule 24: the shipping tree did not run'] : pinFacts(shipping);
    for (const problem of problems) fail(problem);
    if (problems.length === 0) {
      const t = facts.terminal;
      const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
      let worstDelta = Infinity;
      let darkDelta = Infinity;
      let worstNormal = Infinity;
      let worstBright = Infinity;
      for (const name of ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan']) {
        const bright = `bright${name[0].toUpperCase()}${name.slice(1)}`;
        worstDelta = Math.min(worstDelta, deltaE(t.followedLight[name], t.followedLight[bright]));
        darkDelta = Math.min(darkDelta, deltaE(t.followedDark[name], t.followedDark[bright]));
        worstNormal = Math.min(worstNormal, wcagContrast(t.followedLight[name], '#f5f7fa'));
        worstBright = Math.min(worstBright, wcagContrast(t.followedLight[bright], '#f5f7fa'));
      }
      say(`${TAG} rule 24: the terminal ground ${String(t.dark.background)} to ${String(t.light.background)}, all ${String(Object.keys(t.light).length)} slots moved, xterm's floor ${String(t.floorDark)} to ${String(t.floorLight)}`);
      say(`${TAG} rule 24: on paper the six chromatic slots read ${worstNormal.toFixed(2)}:1 at worst and their bright twins ${worstBright.toFixed(2)}:1, dE2000 ${worstDelta.toFixed(2)} apart at the tightest, where research 80 read the vendors at 0 to 6.4 and the shipped dark sixteen read ${darkDelta.toFixed(2)}`);
      say(`${TAG} rule 24: Monaco ${String(facts.monaco.dark.base)} to ${String(facts.monaco.light.base)}, ground ${String(facts.monaco.dark.colors['editor.background'])} to ${String(facts.monaco.light.colors['editor.background'])}`);
      say(`${TAG} rule 24: Pierre ${String(facts.pierre.pair.dark)} (${String(facts.pierre.darkType)}) and ${String(facts.pierre.pair.light)} (${String(facts.pierre.lightType)}) are both named in the theme pair, so the diff follows the root; the tree host carries ${String(facts.pierre.treeKeys.length)} keys and no colorScheme`);
      say(`${TAG} rule 24: the window fill ${String(facts.windowFill.dark)} to ${String(facts.windowFill.light)} at hue 222, ${String(facts.windowFill.darkAt40)} to ${String(facts.windowFill.lightAt40)} at hue 40`);
      say(`${TAG} rule 25: DARK IS BYTE IDENTICAL to the parent 02fd5ed. tokens ${facts.tokensSha.dark.slice(0, 12)}, terminal ${sha(facts.terminal.dark).slice(0, 12)}, Monaco ${sha(facts.monaco.dark).slice(0, 12)}, Pierre ${facts.pierre.darkSha.slice(0, 12)}, fill ${String(facts.windowFill.dark)} and ${String(facts.windowFill.darkAt40)}, xterm floor ${String(facts.terminal.floorDark)}`);
      say(`${TAG} rule 25: and the light base is a different set of bytes throughout: tokens ${facts.tokensSha.light.slice(0, 12)}, terminal ${sha(facts.terminal.light).slice(0, 12)}, Monaco ${sha(facts.monaco.light).slice(0, 12)}, Pierre ${facts.pierre.lightSha.slice(0, 12)}`);
    }
  }

  // Rule 26. No dark literal survives.
  {
    const found = scanLiterals(join(repoRoot, 'src'));
    for (const hit of found) fail(`rule 26: ${hit}`);
    const fixtures = literalFixtures(join(scratch, 'literal-fixtures'));
    let behaved = 0;
    for (const f of fixtures) {
      const hits = scanLiterals(f.root);
      const ok = f.shouldFail ? hits.length > 0 : hits.length === 0;
      if (ok) behaved += 1;
      else fail(`rule 26: the fixture "${f.name}" ${f.shouldFail ? 'walked past the scan' : `turned it red: ${hits[0]}`}`);
    }
    if (found.length === 0 && behaved === fixtures.length) {
      say(`${TAG} rule 26: no colour literal outside the six theme constant places and the four named exemptions, over ${String(countScanned(join(repoRoot, 'src')))} files; ${String(behaved)} fixtures behaved, ${String(fixtures.filter((f) => f.shouldFail).length)} of which must make the scan fail`);
    }
  }

  // Rule 27. THE FRAME CARRIED ACROSS A SCHEME CHANGE (Phase 213).
  //
  // The Scheme control writes one field. The dark base offers 35 of the 49
  // shade and depth pairs and the light base offers 4, so 31 of the frames a
  // person may legitimately be holding on dark are ones paper cannot draw:
  // 20 of them put --accent-text under 4.5:1 and 8 invert the ramp ORDER so
  // the sheet stops sitting above the paper. `frameForBase` brings a carried
  // frame to the nearest stop the new base offers and persists nothing. This
  // rule asserts both halves over the walk the probe ran: nothing carried is
  // left outside the new base's region, and the dark base is never moved,
  // so choosing Dark from Light gives back exactly the frame that was there.
  {
    const carry = facts === undefined ? null : facts.carryover;
    // The clauses are in pinFacts, which rule 24 above already ran and rule
    // 13 runs over every ablated copy. This says what it measured.
    if (carry !== null && carry !== undefined && carry.outsideAfterMove === 0 && carry.movedToLight > 0) {
      say(`${TAG} rule 27: dark offers ${String(carry.darkOffered)} frames and paper offers ${String(carry.lightOffered)}; choosing Light moves ${String(carry.movedToLight)} of them and leaves 0 outside the region, choosing Dark moves none of either base's, so a frame comes back exactly`);
    }
  }

  // Rule 13. A copy that did not run is not a red pin, it is a gate that
  // proved nothing, so it fails by name.
  for (const [i, ablation] of ABLATIONS.entries()) {
    const answer = answers[`ablation-${String(i)}`];
    if (answer === undefined || 'error' in answer) {
      fail(`rule 13: with ${ablation.name} ablated, the copy did not run: ${answer?.error ?? 'no answer'}`);
      continue;
    }
    // BOTH BASES (Phase 213). An ablation of a light clause turns nothing red
    // on the dark base and would read as a gate that cannot fail; an ablation
    // of a shared clause turns both red, which is the honest reading.
    const red = pin(answer);
    const redLight = answer.light === undefined ? ['the light base was not walked'] : pin(answer.light, 'light');
    const redFacts = pinFacts(answer);
    const all = [...redFacts, ...red.map((r) => `dark: ${r}`), ...redLight.map((r) => `light: ${r}`)];
    if (all.length === 0) {
      fail(`rule 13: with ${ablation.name} ablated, every pin still passed on BOTH bases and in the surfaces, so the pins cannot fail`);
    } else {
      say(`${TAG} rule 13: with ${ablation.name} ablated, ${String(red.length)} dark, ${String(redLight.length)} light and ${String(redFacts.length)} surface pin(s) went red, the first being: ${all[0].slice(0, 150)}`);
    }
  }

  // Rule 14.
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  if (pkg.scripts['conformance:hue'] !== 'node build/conformance-hue.mjs') fail('rule 14: package.json does not name this gate as conformance:hue');
  const checks = readFileSync(join(repoRoot, 'build', 'verification-checks.mjs'), 'utf8');
  if (!checks.includes("pure('conformance:hue')")) fail('rule 14: build/verification-checks.mjs does not classify conformance:hue');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`${TAG} ${String(failed)} failure(s)`);
  process.exit(1);
}
say(`${TAG} OK: every pinned ratio at all 360 hues and three contrast levels ON BOTH BASES, lightness held, the offset kept, each base's ramp in its own order, one threshold with one crossing over the synthetic ground, each base's offered region exact over 49 shade and depth pairs at every whole degree, the status dots clearing the active row on paper, every non token surface carrying a second theme, DARK BYTE IDENTICAL to the parent by four digests, no colour literal outside the six theme constant places, the control refusing what this gate refuses, ${String(ABLATIONS.length)} ablations each red, the gate named`);
