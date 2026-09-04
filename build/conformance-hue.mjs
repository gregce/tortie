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
 * Contrast is re-derived HERE with culori's full entry rather than read from
 * the modules, so a module that lied about a ratio would still be caught;
 * the verifier is asked to re-derive it once more with arithmetic of its own.
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
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
const { wcagContrast, wcagLuminance } = require('culori');

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
 */
const WITNESS_HUES = [0, 3, 121, 198, 211];

const REGION = {
  '-4': [1, 3],
  '-3': [-2, 3],
  '-2': [-3, 3],
  '-1': [-3, 2],
  '0': [-3, 1],
  '1': [-3, 0],
  '2': [-3, 0]
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

function pin(a) {
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
    if (s.contrast === 'normal' && s.hue !== 222 && s.keys.join(',') !== wantKeys) {
      problem('r3', `rule 3: at ${tag} the map holds [${s.keys.join(', ')}] rather than the eight neutrals`);
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
    const order = [
      ['--bg-sidebar', '--bg-canvas'],
      ['--bg-canvas', '--bg-surface'],
      ['--bg-surface', '--bg-raised'],
      ['--bg-raised', '--bg-active'],
      ['--border', '--border-active'],
      ['--border-active', '--border-strong']
    ];
    for (const [lo, hi] of order) {
      if (!(yOf(v[lo]) < yOf(v[hi]))) problem(`r6 ${lo}`, `rule 6: at ${tag} ${lo} (${v[lo]}) is not below ${hi} (${v[hi]})`);
    }
    // Rule 7.
    for (const [fg, bg, floor] of [...TEXT_FLOORS, ...CHROMATIC_FLOORS]) {
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
      for (const [x, y, pinned, band] of HAIRLINES) {
        const ratio = wcagContrast(v[x], v[y]);
        if (Math.abs(ratio - pinned) > band) problem(`r8 ${x}`, `rule 8: at ${tag} ${x} on ${y} reads ${ratio.toFixed(3)}:1, outside ${String(pinned)} plus or minus ${String(band)}`);
      }
    }
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
    const want = REGION[String(shade)];
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
    const want = REGION[String(shade)];
    for (const depth of a.rampStops.depths) {
      const seen = region.get(`${String(shade)},${String(depth)}`);
      if (seen === undefined) {
        problem('r15m', `rule 15: no cell walked at shade ${String(shade)} depth ${String(depth)}`);
        continue;
      }
      const expected = depth >= want[0] && depth <= want[1];
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
    if (!(cell.worstOklch > 0)) problem('r17a', `rule 17: the ramp inverts in OKLCH lightness at ${where} (gap ${cell.worstOklch.toFixed(6)})`);
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
  for (const cell of a.ramp) dark += cell.darkHues;
  if (dark !== 0) problem('r20', `rule 20: the text family read dark at ${String(dark)} points, which no offered frame should reach`);

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
    for (const [fg, bg, floor] of [...TEXT_FLOORS, ...CHROMATIC_FLOORS]) {
      const r = wcagContrast(point.values[fg], point.values[bg]);
      if (r < floor) problem('r21r', `rule 21: at the ${point.name} frame ${fg} on ${bg} is ${r.toFixed(3)}:1, under ${String(floor)}`);
    }
  }

  return problems;
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

  // Rule 13. A copy that did not run is not a red pin, it is a gate that
  // proved nothing, so it fails by name.
  for (const [i, ablation] of ABLATIONS.entries()) {
    const answer = answers[`ablation-${String(i)}`];
    if (answer === undefined || 'error' in answer) {
      fail(`rule 13: with ${ablation.name} ablated, the copy did not run: ${answer?.error ?? 'no answer'}`);
      continue;
    }
    const red = pin(answer);
    if (red.length === 0) {
      fail(`rule 13: with ${ablation.name} ablated, every pin still passed, so the pins cannot fail`);
    } else {
      say(`${TAG} rule 13: with ${ablation.name} ablated, ${String(red.length)} pin(s) went red, the first being: ${red[0].slice(0, 150)}`);
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
say(`${TAG} OK: every pinned ratio at all 360 hues and three contrast levels, lightness held, the offset kept, the ramp in order, one threshold with one crossing over the synthetic ground, the offered region exact over 49 shade and depth pairs at every whole degree, the ramp never inverting at any of them, the control refusing what this gate refuses, ${String(ABLATIONS.length)} ablations each red, the gate named`);
