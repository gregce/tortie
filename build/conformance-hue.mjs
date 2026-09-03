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
 * walks all 360 degrees and the whole ramp from graphite to white, and then
 * runs itself over twelve copies of the code with one clause changed each,
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
 *      level: --border on --bg-sidebar 1.297 plus or minus 0.03, and
 *      --border-active on --bg-active 1.105 and the hover step --bg-raised on
 *      --bg-surface 1.094 plus or minus 0.02. tokens.css pins all three.
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
    edits: [["  return followPalette(\n    TERMINAL_TEXT,\n    TERMINAL_BACKGROUND,\n    canvas,\n    textDark,\n    TERMINAL_TEXT_EXEMPT,", "  return { ...TERMINAL_TEXT };\n  return followPalette(\n    TERMINAL_TEXT,\n    TERMINAL_BACKGROUND,\n    canvas,\n    textDark,\n    TERMINAL_TEXT_EXEMPT,"]]
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
  for (const file of ['derive.ts']) {
    const path = join(root, 'renderer', 'theme', file);
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace("from '@shared/chrome-hue'", "from '../../shared/chrome-hue'")
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
  const roots = [{ name: 'shipping', root: join(repoRoot, 'src') }];
  for (const [i, ablation] of ABLATIONS.entries()) {
    roots.push({ name: `ablation-${String(i)}`, root: ablatedCopy(join(scratch, `ablation-${String(i)}`), ablation) });
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
say(`${TAG} OK: every pinned ratio at all 360 hues and three contrast levels, lightness held, the offset kept, the ramp in order, one threshold with one crossing over the synthetic ground, ${String(ABLATIONS.length)} ablations each red, the gate named`);
