/**
 * hue-conformance-probe.mts. The frame hue, run under node, printed as JSON
 * for build/conformance-hue.mjs to judge (Phase 207).
 *
 * It imports the SHIPPING modules rather than a copy, so the gate is testing
 * what the app derives, and it imports them from a ROOT the gate names, so
 * the same probe runs over the ablated copies the gate writes. It launches
 * no Electron, opens no window, starts no tmux server, spawns nothing, reads
 * nothing under the person's home and makes no request. The one file it
 * reads is src/renderer/styles/tokens.css, for the shipped base, the same
 * way src/renderer/theme/__tests__/derive.test.ts builds it.
 *
 * What it walks, per root:
 *  - every whole degree of the circle at the normal contrast level, and
 *    every fifth degree at raised and high, deriving the override map and
 *    recording every neutral, every text token and the terminal palette;
 *  - the wrap and the fractional hue, 360, -1 and 0.4 against 0 and 359;
 *  - the default, 222 and 582, which must derive nothing;
 *  - the synthetic ground, the whole ramp lifted from 0 to 0.85 in OKLCH
 *    lightness in steps of 0.005 at the default hue, recording the canvas
 *    luminance, the polarity, the text tokens and the terminal palette,
 *    which is the only way to reach the text rule, because no hue can;
 *  - THE RAMP WALK (Phase 210): every whole degree against every one of the
 *    seven shade stops against every one of the seven depth stops, at all
 *    three contrast levels, plus every fifteenth degree over all four
 *    highlight schemes, which is 67,032 derivations per root.
 *
 * WHY THE RAMP WALK IS AGGREGATED IN HERE rather than shipped out as raw
 * values the way the circle is. 52,920 samples of thirty odd colours each is
 * about twelve megabytes of JSON per root and there are thirteen roots. So
 * this file reduces each (shade, depth, contrast, scheme) cell to the worst
 * reading over the hues it walked, and the gate judges the cells. The
 * arithmetic is culori's full entry over values the SHIPPING modules
 * produced, which is the same posture the gate uses for the circle: nothing
 * here asks a shipping module what a ratio is. The one thing it does ask is
 * whether the shipping FLOOR PREDICATE agrees, which is a rule of its own,
 * because that predicate is what the control refuses with and the two must
 * not drift apart.
 *
 * Argument: one JSON object, { roots: [{ name, root }] }, where `root` is a
 * directory holding renderer/theme, renderer/terminal and shared/chrome-hue
 * (the real src, or a copy with one clause changed). Output: one JSON line,
 * name to answer, an answer being either the readings or { error }.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { converter, parse, wcagLuminance } from 'culori';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const toOklch = converter('oklch');
const toRgbFull = converter('rgb');

interface RootSpec {
  name: string;
  root: string;
  /**
   * The whole degree step of the Phase 210 ramp walk. 1 on the shipping root,
   * because the chromatic family fails in clusters a coarse step steps over;
   * coarser on the ablated copies, because an ablation removes a clause and
   * so fails at every hue rather than in a cluster.
   */
  hueStep?: number;
  /**
   * Hues the walk always carries whatever its step is. The gate hands it the
   * WITNESSES: the hue at which each cell the region refuses actually fails,
   * measured on the shipping tree. Without them a coarse walk steps over the
   * clusters, calls a refused cell feasible and turns the region rule red for
   * a reason that has nothing to do with the ablation.
   */
  extraHues?: number[];
}

const spec = JSON.parse(process.argv[2] ?? '{}') as { roots?: RootSpec[] };
const roots = spec.roots ?? [{ name: 'shipping', root: resolve(repoRoot, 'src') }];

// ---------------------------------------------------------------------------
// The shipped base, from tokens.css, var() references resolved.
// ---------------------------------------------------------------------------

function readDeclarations(css: string): Map<string, string> {
  const decls = new Map<string, string>();
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) {
    const name = m[1];
    const value = m[2];
    if (name === undefined || value === undefined) continue;
    decls.set(name, value.replace(/\s+/g, ' ').trim());
  }
  for (let pass = 0; pass < 5; pass += 1) {
    let changed = false;
    for (const [name, value] of decls) {
      const next = value.replace(
        /var\((--[a-zA-Z0-9-]+)\)/g,
        (whole, ref: string) => decls.get(ref) ?? whole
      );
      if (next !== value) {
        decls.set(name, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return decls;
}

/**
 * tokens.css, from the ROOT when the root carries a copy (an ablation of the
 * light block lives there), else the tree's. Phase 213.
 */
function tokensCssFor(root: string): string {
  const own = resolve(root, 'renderer', 'styles', 'tokens.css');
  const path = existsSync(own) ? own : resolve(repoRoot, 'src', 'renderer', 'styles', 'tokens.css');
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}
const tokensCss = tokensCssFor(resolve(repoRoot, 'src'));
/**
 * The DARK base is the first `:root {` block and the LIGHT base (Phase 213)
 * the `:root[data-scheme='light'] {` block after it. A last match wins sweep
 * over the whole file would read paper for every colour token, so each base
 * is read from its own block, the light one merged over the dark one because
 * it redeclares the colour tokens only.
 */
function schemeBlock(css: string, scheme: 'dark' | 'light'): string {
  const head = scheme === 'light' ? ":root[data-scheme='light'] {" : ':root {';
  const start = css.indexOf(head);
  if (start === -1) return '';
  const close = css.indexOf('}', start + head.length);
  return close === -1 ? '' : css.slice(start + head.length, close);
}
const declarations = readDeclarations(schemeBlock(tokensCss, 'dark'));
const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');
function declarationsFor(root: string, scheme: 'dark' | 'light'): Map<string, string> {
  const css = tokensCssFor(root);
  if (scheme === 'dark') return readDeclarations(schemeBlock(css, 'dark'));
  return readDeclarations(`${schemeBlock(css, 'dark')}\n${schemeBlock(css, 'light')}`);
}

// ---------------------------------------------------------------------------
// The readings
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
const TEXTS = ['--text-primary', '--text-secondary', '--text-muted', '--text-disabled'];
const CHROMATIC = [
  '--accent',
  '--accent-text',
  '--git-modified',
  '--git-added',
  '--git-deleted',
  '--git-renamed',
  '--git-conflict',
  '--graph-lane-3',
  '--graph-lane-5'
];
/** The status family the light base pins on the active row (Phase 213). */
const STATUS = [
  '--status-working',
  '--status-attention',
  '--status-idle',
  '--status-failed',
  '--status-attention-badge-bg',
  '--status-attention-badge-fg'
];

interface Sample {
  hue: number;
  contrast: string;
  keys: string[];
  values: Record<string, string>;
  /** OKLCH L of every neutral in effect. */
  lightness: Record<string, number>;
  /** OKLCH hue of every neutral in effect, for the offset check. */
  hues: Record<string, number>;
  terminal: Record<string, string>;
}

interface LiftSample {
  lift: number;
  canvas: string;
  canvasY: number;
  textDark: boolean;
  values: Record<string, string>;
  terminal: Record<string, string>;
  /** The same lift at the high contrast level: the text tokens only. */
  high: Record<string, string>;
}

/**
 * One (shade, depth, contrast, scheme) cell, reduced over the hues walked.
 * Every `worst` is a SLACK: the reading minus what it needed, so positive
 * holds and zero or less does not. `worstOklch` is the arithmetic order claim
 * before the eight bit round trip; `worstOrder` is the same claim in WCAG
 * luminance after it, which is the space the design pins it in.
 */
interface RampCell {
  shade: number;
  depth: number;
  contrast: string;
  scheme: string;
  hues: number;
  feasible: boolean;
  binding: string;
  bindingHue: number;
  worstOklch: number;
  worstOrder: number;
  minStep: number;
  worstText: number;
  worstTerm: number;
  worstChroma: number;
  /** Hues where the text family read dark. The flip is out of reach. */
  darkHues: number;
  /** Hues where the SHIPPING floor predicate disagreed with this walk. */
  disagree: number;
  /** Hues where a chromatic token moved off the value the shipped frame has. */
  chromaticMoved: number;
  /**
   * The lightest canvas this cell reaches over the hues it walked, and the
   * hue that reached it (Phase 210 fix round). Rule 20 quotes the maximum
   * over every FEASIBLE cell, because the lightest frame a person can choose
   * is a reading of the whole walk rather than of one named point at the
   * shipped hue, which is the number that rule used to quote.
   */
  maxCanvasY: number;
  maxCanvas: string;
  maxCanvasHue: number;
}

/** A full reading at one named point, so the gate can re-derive from bytes. */
interface RampPoint {
  name: string;
  shade: number;
  depth: number;
  values: Record<string, string>;
  terminal: Record<string, string>;
  keys: string[];
}

interface Answer {
  shippedL: Record<string, number>;
  shippedHue: Record<string, number>;
  shipped: Record<string, string>;
  atDefault: Record<string, string>;
  at582: Record<string, string>;
  wrap: { at0: string; at360: string; at359: string; atMinus1: string; atFraction: string };
  circle: Sample[];
  lifts: LiftSample[];
  threshold: number;
  ramp: RampCell[];
  rampPoints: RampPoint[];
  rampStops: { shades: number[]; depths: number[]; stepMin: number };
  /** The region table the SHIPPING control offers from, read from presets. */
  regionTable: { shade: number; minDepth: number; maxDepth: number }[];
  facts: Facts;
}

async function readRoot(
  root: string,
  hueStep: number,
  extraHues: readonly number[],
  scheme: 'dark' | 'light' = 'dark'
): Promise<Answer> {
  // The light base (Phase 213) walks the same rules over the light block,
  // with the light order runs, the light chromatic pins, the light region
  // and the light terminal constants, all from the module under test.
  const light = scheme === 'light';
  const rootDeclarations = declarationsFor(root, scheme);
  const load = async (rel: string): Promise<Record<string, unknown>> =>
    (await import(pathToFileURL(resolve(root, rel)).href)) as Record<string, unknown>;
  const derive = await load('renderer/theme/derive.ts');
  const presets = await load('renderer/theme/presets.ts');
  const hue = await load('renderer/theme/hue.ts');
  const terminal = await load('renderer/terminal/theme.ts');
  const floors = await load('renderer/theme/floors.ts');

  const deriveOverrides = derive['deriveOverrides'] as (
    appearance: {
      highlightScheme: string;
      contrastLevel: string;
      chromeHue: number;
      chromeShade?: number;
      chromeDepth?: number;
    },
    base: Record<string, string>,
    lift?: number
  ) => Record<string, string>;
  const allTokens = presets['ALL_THEME_TOKENS'] as string[];
  const textIsDarkOn = hue['textIsDarkOn'] as (css: string) => boolean;
  const threshold = hue['TEXT_FLIP_CANVAS_LUMINANCE'] as number;
  const terminalTextForRaw = terminal['terminalTextFor'] as (
    canvas: string,
    dark: boolean,
    scheme?: 'dark' | 'light'
  ) => Record<string, string>;
  const terminalTextFor = (canvas: string, dark: boolean): Record<string, string> =>
    terminalTextForRaw(canvas, dark, scheme);

  const base: Record<string, string> = {};
  for (const token of allTokens) {
    const value = rootDeclarations.get(token);
    if (value !== undefined) base[token] = value;
  }
  for (const token of [...NEUTRALS, ...TEXTS, ...CHROMATIC, ...STATUS]) {
    const value = rootDeclarations.get(token);
    if (value !== undefined) base[token] = value;
  }

  const L = (css: string): number => toOklch(parse(css))?.l ?? -1;
  const H = (css: string): number => toOklch(parse(css))?.h ?? 0;
  const effective = (o: Record<string, string>, token: string): string =>
    o[token] ?? base[token] ?? '';

  const sample = (chromeHue: number, contrast: string): Sample => {
    const o = deriveOverrides(
      { highlightScheme: 'blue', contrastLevel: contrast, chromeHue },
      base
    );
    const values: Record<string, string> = {};
    const lightness: Record<string, number> = {};
    const hues: Record<string, number> = {};
    for (const token of [...NEUTRALS, ...TEXTS, ...CHROMATIC, ...STATUS]) {
      values[token] = effective(o, token);
    }
    for (const token of NEUTRALS) {
      lightness[token] = L(values[token] ?? '');
      hues[token] = H(values[token] ?? '');
    }
    const canvas = values['--bg-canvas'] ?? '';
    return {
      hue: chromeHue,
      contrast,
      keys: Object.keys(o).sort(),
      values,
      lightness,
      hues,
      terminal: terminalTextFor(canvas, textIsDarkOn(canvas))
    };
  };

  const circle: Sample[] = [];
  for (let h = 0; h < 360; h += 1) circle.push(sample(h, 'normal'));
  for (let h = 0; h < 360; h += 5) {
    circle.push(sample(h, 'raised'));
    circle.push(sample(h, 'high'));
  }

  const lifts: LiftSample[] = [];
  for (let i = 0; i <= (light ? -1 : 170); i += 1) {
    const lift = i / 200;
    const o = deriveOverrides(
      { highlightScheme: 'blue', contrastLevel: 'normal', chromeHue: 222 },
      base,
      lift
    );
    const high = deriveOverrides(
      { highlightScheme: 'blue', contrastLevel: 'high', chromeHue: 222 },
      base,
      lift
    );
    const values: Record<string, string> = {};
    for (const token of [...NEUTRALS, ...TEXTS]) values[token] = effective(o, token);
    const canvas = values['--bg-canvas'] ?? '';
    const dark = textIsDarkOn(canvas);
    const highText: Record<string, string> = {};
    for (const token of TEXTS) highText[token] = effective(high, token);
    lifts.push({
      lift,
      canvas,
      canvasY: wcagLuminance(canvas),
      textDark: dark,
      values,
      terminal: terminalTextFor(canvas, dark),
      high: highText
    });
  }


  // -------------------------------------------------------------------------
  // THE RAMP WALK (Phase 210)
  // -------------------------------------------------------------------------

  const shadeStops = presets['SHADE_STOP_LIST'] as number[] | undefined;
  const pinsFor = presets['chromaticPinsFor'] as
    | ((s: string) => { token: string; ground: string; floor: number }[])
    | undefined;
  const CHROMATIC_PINS = (pinsFor !== undefined ? pinsFor(scheme) : presets['CHROMATIC_PINS']) as
    | { token: string; ground: string; floor: number }[]
    | undefined;
  const orderFor = presets['rampOrderFor'] as ((s: string) => string[]) | undefined;
  const hairFor = presets['hairlineOrderFor'] as ((s: string) => string[]) | undefined;
  const RAMP_ORDER = (orderFor !== undefined ? orderFor(scheme) : presets['RAMP_ORDER']) as string[] | undefined;
  const HAIRLINE_ORDER = (hairFor !== undefined ? hairFor(scheme) : presets['HAIRLINE_ORDER']) as string[] | undefined;
  const regionFor = presets['frameRegionFor'] as
    | ((s: string) => { shade: number; minDepth: number; maxDepth: number }[])
    | undefined;
  const STEP_PAIRS = presets['RENDERED_STEP_PAIRS'] as [string, string][] | undefined;
  const STEP_MIN = presets['RENDERED_STEP_MIN'] as number | undefined;
  const TEXT_PINS = presets['TEXT_PINS'] as
    | { token: string; ground: string; grounds: string[]; floor: number | null }[]
    | undefined;
  const firstFloorFailureRaw = floors['firstFloorFailure'] as
    | ((valueOf: (t: string) => string | undefined, scheme?: string) => { family: string } | null)
    | undefined;
  const firstFloorFailure =
    firstFloorFailureRaw === undefined
      ? undefined
      : (valueOf: (t: string) => string | undefined): { family: string } | null =>
          firstFloorFailureRaw(valueOf, scheme);

  // Luminance and the eight bit reading are memoised by the colour's own text.
  // The text tokens do not move at all on a dark ground, so the same handful
  // of values comes back tens of thousands of times.
  const lumCache = new Map<string, number>();
  const lum = (css: string): number => {
    let v = lumCache.get(css);
    if (v === undefined) {
      v = wcagLuminance(parse(css) ?? { mode: 'rgb', r: 0, g: 0, b: 0 });
      lumCache.set(css, v);
    }
    return v;
  };
  const ratioOf = (fg: string, bg: string): number => {
    const a = lum(fg);
    const b = lum(bg);
    return a > b ? (a + 0.05) / (b + 0.05) : (b + 0.05) / (a + 0.05);
  };
  const byteCache = new Map<string, [number, number, number]>();
  const bytes = (css: string): [number, number, number] => {
    let v = byteCache.get(css);
    if (v === undefined) {
      const rgb = toRgbFull(parse(css) ?? { mode: 'rgb', r: 0, g: 0, b: 0 });
      v = [
        Math.round((rgb?.r ?? 0) * 255),
        Math.round((rgb?.g ?? 0) * 255),
        Math.round((rgb?.b ?? 0) * 255)
      ];
      byteCache.set(css, v);
    }
    return v;
  };
  const stepBetween = (a: string, b: string): number => {
    const x = bytes(a);
    const y = bytes(b);
    return Math.max(
      Math.abs(x[0] - y[0]),
      Math.abs(x[1] - y[1]),
      Math.abs(x[2] - y[2])
    );
  };

  const SHADES = [-4, -3, -2, -1, 0, 1, 2];
  const DEPTHS = [-3, -2, -1, 0, 1, 2, 3];
  const ramp: RampCell[] = [];
  const rampPoints: RampPoint[] = [];

  // The frame at the SHIPPED shade and depth, for the refusal that no
  // chromatic token moves. It depends on the scheme, the contrast and the
  // hue and on nothing this walk varies, so it is derived once per hue
  // rather than once per cell, which halves the whole walk.
  const shippedFrameCache = new Map<string, Record<string, string>>();
  const shippedFrameAt = (
    scheme: string,
    contrast: string,
    h: number
  ): Record<string, string> => {
    const key = `${scheme}|${contrast}|${String(h)}`;
    let hit = shippedFrameCache.get(key);
    if (hit === undefined) {
      hit = deriveOverrides(
        {
          highlightScheme: scheme,
          contrastLevel: contrast,
          chromeHue: h,
          chromeShade: 0,
          chromeDepth: 0
        },
        base
      );
      shippedFrameCache.set(key, hit);
    }
    return hit;
  };

  const rampArms: { contrast: string; scheme: string; step: number }[] = [
    { contrast: 'normal', scheme: 'blue', step: hueStep },
    { contrast: 'raised', scheme: 'blue', step: hueStep },
    { contrast: 'high', scheme: 'blue', step: hueStep },
    // The scheme arms. Coarser on purpose: the scheme moves no ground at all,
    // and the two accent pins it does move sit at about 10.7:1 against a floor
    // of 4.5, so it cannot bind. Coarse walking is what PROVES that rather
    // than what assumes it. They run on the EXHAUSTIVE root only, because the
    // claim they carry is about the scheme rather than about any clause an
    // ablation removes, and running them over nineteen copies would double
    // the gate for nothing.
    ...(hueStep === 1
      ? (['teal', 'purple', 'slate'] as const).flatMap((scheme) => [
          { contrast: 'normal', scheme, step: 15 },
          { contrast: 'high', scheme, step: 15 }
        ])
      : [])
  ];

  for (const arm of rampArms) {
    for (const shade of SHADES) {
      for (const depth of DEPTHS) {
        let hues = 0;
        let feasible = true;
        let binding = '';
        let bindingHue = -1;
        let worstAny = Number.POSITIVE_INFINITY;
        let worstOklch = Number.POSITIVE_INFINITY;
        let worstOrder = Number.POSITIVE_INFINITY;
        let minStep = Number.POSITIVE_INFINITY;
        let worstText = Number.POSITIVE_INFINITY;
        let worstTerm = Number.POSITIVE_INFINITY;
        let worstChroma = Number.POSITIVE_INFINITY;
        let darkHues = 0;
        let disagree = 0;
        let chromaticMoved = 0;
        let maxCanvasY = -1;
        let maxCanvas = '';
        let maxCanvasHue = -1;
        // The stepped set ALWAYS carries the witnesses and the shipped 222,
        // whatever the step, because the failures this walk is looking for sit
        // in clusters a few degrees wide and a coarse step walks over them.
        const hueSet: number[] = [];
        for (let h = 0; h < 360; h += arm.step) hueSet.push(h);
        for (const extra of [222, ...extraHues]) {
          if (!hueSet.includes(extra)) hueSet.push(extra);
        }
        for (const h of hueSet) {
          hues += 1;
          const o = deriveOverrides(
            {
              highlightScheme: arm.scheme,
              contrastLevel: arm.contrast,
              chromeHue: h,
              chromeShade: shade,
              chromeDepth: depth
            },
            base
          );
          const shippedFrame = shippedFrameAt(arm.scheme, arm.contrast, h);
          const v = (t: string): string => o[t] ?? base[t] ?? '';
          // A slack is what was read minus what was needed, for printing;
          // WHETHER IT HOLDS is asked separately, because the families do not
          // all use the same comparison. The order runs want a STRICT
          // inequality, the rendered step is an integer at or above its floor,
          // and a ratio holds at its floor exactly. Reading a slack of zero as
          // a failure would refuse the shipped ramp itself, whose tightest
          // rendered step IS the floor.
          let cellHolds = true;
          const note = (slack: number, holds: boolean, what: string): void => {
            if (!holds) cellHolds = false;
            if (slack < worstAny) {
              worstAny = slack;
              binding = what;
              bindingHue = h;
            }
          };
          for (const run of [RAMP_ORDER ?? [], HAIRLINE_ORDER ?? []]) {
            for (let i = 1; i < run.length; i += 1) {
              const lo = run[i - 1] ?? '';
              const hi = run[i] ?? '';
              const gap = lum(v(hi)) - lum(v(lo));
              if (gap < worstOrder) worstOrder = gap;
              note(gap, gap > 0, `order ${hi} over ${lo}`);
              const gapL = (toOklch(parse(v(hi)))?.l ?? 0) - (toOklch(parse(v(lo)))?.l ?? 0);
              if (gapL < worstOklch) worstOklch = gapL;
            }
          }
          for (const [a, b] of STEP_PAIRS ?? []) {
            const step = stepBetween(v(a), v(b));
            if (step < minStep) minStep = step;
            note(step - (STEP_MIN ?? 2), step >= (STEP_MIN ?? 2), `step ${a} against ${b}`);
          }
          for (const pin of TEXT_PINS ?? []) {
            if (pin.floor === null) continue;
            for (const ground of pin.grounds) {
              const slack = ratioOf(v(pin.token), v(ground)) - pin.floor;
              if (slack < worstText) worstText = slack;
              note(slack, slack >= 0, `text ${pin.token} on ${ground}`);
            }
          }
          const canvas = v('--bg-canvas');
          const dark = textIsDarkOn(canvas);
          if (dark) darkHues += 1;
          const canvasY = lum(canvas);
          if (canvasY > maxCanvasY) {
            maxCanvasY = canvasY;
            maxCanvas = canvas;
            maxCanvasHue = h;
          }
          for (const [key, hex] of Object.entries(terminalTextFor(canvas, dark))) {
            if (key === 'black' || key === 'brightBlack') continue;
            const need = key === 'foreground' ? 4.5 : 3;
            const slack = ratioOf(hex, canvas) - need;
            if (slack < worstTerm) worstTerm = slack;
            note(slack, slack >= 0, `terminal ${key}`);
          }
          for (const pin of CHROMATIC_PINS ?? []) {
            const slack = ratioOf(v(pin.token), v(pin.ground)) - pin.floor;
            if (slack < worstChroma) worstChroma = slack;
            note(slack, slack >= 0, `chromatic ${pin.token} on ${pin.ground}`);
            // The refusal: the frame moves no chromatic token, only the
            // ground under it. Read at the same scheme and contrast.
            const here = o[pin.token] ?? base[pin.token] ?? '';
            const there = shippedFrame[pin.token] ?? base[pin.token] ?? '';
            if (here !== there) chromaticMoved += 1;
          }
          if (!cellHolds) feasible = false;
          // THE CONTROL AND THE GATE MUST REFUSE THE SAME THINGS. The shipping
          // predicate is what the sliders stop on; this walk is what proves
          // the floors. A disagreement here is the two drifting apart.
          if (firstFloorFailure !== undefined) {
            const said = firstFloorFailure((t) => o[t] ?? base[t]) !== null;
            if (said === cellHolds) disagree += 1;
          }
        }
        ramp.push({
          shade,
          depth,
          contrast: arm.contrast,
          scheme: arm.scheme,
          hues,
          feasible,
          binding,
          bindingHue,
          worstOklch,
          worstOrder,
          minStep,
          worstText,
          worstTerm,
          worstChroma,
          darkHues,
          disagree,
          chromaticMoved,
          maxCanvasY,
          maxCanvas,
          maxCanvasHue
        });
      }
    }
  }

  // Full readings at the points the gate re-derives from bytes, and the ones
  // the app run drives: the shipped frame, the four corners of the region,
  // the darkest and the lightest frame a person can choose, and the two ends
  // of the depth axis at the shipped shade.
  for (const [name, shade, depth] of [
    ['shipped', 0, 0],
    ['darkest', -4, 2],
    ['lightest', 2, 0],
    ['narrowest', 0, -3],
    ['widest', 0, 1],
    ['dark and wide', -3, 3],
    ['light and narrow', 2, -3]
  ] as [string, number, number][]) {
    const o = deriveOverrides(
      {
        highlightScheme: 'blue',
        contrastLevel: 'normal',
        chromeHue: 222,
        chromeShade: shade,
        chromeDepth: depth
      },
      base
    );
    const values: Record<string, string> = {};
    for (const token of [...NEUTRALS, ...TEXTS, ...CHROMATIC, ...STATUS]) {
      values[token] = effective(o, token);
    }
    const canvas = values['--bg-canvas'] ?? '';
    rampPoints.push({
      name,
      shade,
      depth,
      values,
      terminal: terminalTextFor(canvas, textIsDarkOn(canvas)),
      keys: Object.keys(o).sort()
    });
  }

  const shippedL: Record<string, number> = {};
  const shippedHue: Record<string, number> = {};
  const shipped: Record<string, string> = {};
  for (const token of NEUTRALS) {
    shipped[token] = base[token] ?? '';
    shippedL[token] = L(shipped[token]);
    shippedHue[token] = H(shipped[token]);
  }
  for (const token of [...TEXTS, ...CHROMATIC, ...STATUS]) shipped[token] = base[token] ?? '';
  const flat = (chromeHue: number): string =>
    JSON.stringify(
      deriveOverrides({ highlightScheme: 'blue', contrastLevel: 'normal', chromeHue }, base)
    );
  return {
    shippedL,
    shippedHue,
    shipped,
    atDefault: deriveOverrides(
      { highlightScheme: 'blue', contrastLevel: 'normal', chromeHue: 222 },
      base
    ),
    at582: deriveOverrides(
      { highlightScheme: 'blue', contrastLevel: 'normal', chromeHue: 582 },
      base
    ),
    wrap: {
      at0: flat(0),
      at360: flat(360),
      at359: flat(359),
      atMinus1: flat(-1),
      atFraction: flat(0.4)
    },
    circle,
    lifts,
    threshold,
    ramp,
    rampPoints,
    rampStops: { shades: SHADES, depths: DEPTHS, stepMin: STEP_MIN ?? 0 },
    regionTable:
      (regionFor !== undefined ? regionFor(scheme) : (presets['FRAME_REGION'] as
        | { shade: number; minDepth: number; maxDepth: number }[]
        | undefined)) ?? [],
    facts: await readFacts(root, load)
  };
}

/**
 * THE MODULE FACTS (Phase 213): what the other readers of the base say,
 * read from the modules under test so an ablation of one of them reaches
 * the gate. The terminal's two constant themes and its two contrast
 * floors, Monaco's two themes at the shipped state, the window fill main
 * composes for both bases, and the Pierre theme pair, which is read as
 * TEXT because the bridge registers with a library the node loader will
 * not evaluate.
 */
interface Facts {
  /**
   * THE FRAME CARRIED ACROSS A SCHEME CHANGE (Phase 213). The Scheme control
   * writes one field, and the two bases offer different regions, so a frame a
   * person is holding on one base may be one the other cannot draw. This is
   * what `frameForBase` answers over every offered pair of each base, so rule
   * 27 can assert that nothing carried is ever left outside the new base's
   * region and that the dark base is never moved at all.
   */
  carryover: {
    darkOffered: number;
    lightOffered: number;
    movedToLight: number;
    outsideAfterMove: number;
    darkUnmoved: number;
    lightToDarkUnmoved: number;
  } | null;
  terminal: {
    dark: Record<string, string>;
    light: Record<string, string>;
    /** The palette IN EFFECT at each base's own shipped ground. */
    followedDark: Record<string, string>;
    followedLight: Record<string, string>;
    floorDark: number;
    floorLight: number;
  };
  monaco: {
    dark: { base: string; colors: Record<string, string>; rules: { token: string; foreground?: string }[] };
    light: { base: string; colors: Record<string, string>; rules: { token: string; foreground?: string }[] };
  } | null;
  windowFill: { dark: string; light: string; darkAt40: string; lightAt40: string };
  pierre: {
    darkType: string | null;
    lightType: string | null;
    darkSha: string;
    lightSha: string;
    lightBg: string | null;
    lightFg: string | null;
    pair: { dark: string; light: string };
    treeKeys: string[];
  } | null;
  /** sha256 of each base's own block of tokens.css, dark first. */
  tokensSha: { dark: string; light: string };
  /**
   * The two shadow hosts put back on the document's inheritance chain
   * (Phase 213). Both Pierre packages declare `color-scheme: light dark` on
   * their own `:host`, and a `light-dark()` inside a shadow root reads THAT
   * rather than the root's, so the diff painted paper on the dark base
   * whenever the Mac was set light. The value each host is given here, or
   * null when no rule in globals.css names it.
   */
  hosts: { diffs: string | null; tree: string | null };
  /**
   * THE GRAPH LANES ON BOTH BASES (Phase 213 fix round, finding 2). Lane
   * colour is identity, so two lanes a dichromat reads as one hue say two
   * branches are one. The six lanes are read PER BASE with their four var()
   * aliases resolved, beside the rotation's own soft-avoidance map, so rule
   * 28 can re-derive the confusable pairs of each base and fail when one of
   * them is not in the map. The light palette shipped with two such pairs
   * against the dark base's one and the map carried the dark pair alone.
   */
  lanes: {
    dark: string[];
    light: string[];
    /** The SHIPPING `CONFUSABLE_PAIRS`, as entries, or null if unreadable. */
    confusable: [number, number[]][] | null;
  };
  /**
   * THE CAPTURE FLOOR (Phase 213 fix round, finding 3). xterm applies
   * `minimumContrastRatio` at draw time and changes no cell, so the buffer
   * path has to apply the same rule itself or a light capture is a page of
   * invisible text. What the SHIPPING extract answers for the five cells
   * research 80 measured, on each ground, and whether the serializer really
   * calls it, read from the module text so an ablation reaches it.
   */
  capture: {
    onPaper: (string | null)[];
    onGraphite: (string | null)[];
    dim: string | null;
    glyphExempt: boolean;
    letterLifted: boolean;
    wired: boolean;
  } | null;
}

/**
 * What `color-scheme` globals.css gives one element name. Comments are
 * stripped first, so a rule that is only described in prose does not count as
 * a rule that exists.
 */
function hostColorScheme(root: string, tag: string): string | null {
  const own = resolve(root, 'renderer', 'styles', 'globals.css');
  const path = existsSync(own) ? own : resolve(repoRoot, 'src', 'renderer', 'styles', 'globals.css');
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  let answer: string | null = null;
  for (const match of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selectors = match[1].split(',').map((one) => one.trim());
    if (!selectors.includes(tag)) continue;
    const declared = /(?:^|;)\s*color-scheme\s*:\s*([^;]+)/.exec(match[2]);
    if (declared !== null) answer = declared[1].trim();
  }
  return answer;
}

async function readFacts(
  root: string,
  load: (rel: string) => Promise<Record<string, unknown>>
): Promise<Facts> {
  const terminal = await load('renderer/terminal/theme.ts');
  const hueMod = await load('shared/chrome-hue.ts');
  const floorFor = terminal['terminalContrastFloorFor'] as ((s: string) => number) | undefined;
  const textFor = terminal['terminalTextFor'] as (
    canvas: string,
    dark: boolean,
    scheme?: string
  ) => Record<string, string>;
  const followed = (canvas: string, dark: boolean, scheme: string): Record<string, string> => {
    try {
      return textFor(canvas, dark, scheme);
    } catch {
      return {};
    }
  };
  const fill = hueMod['windowBackgroundFor'] as (h: number, s?: number, d?: number, scheme?: string) => string;
  let monaco: Facts['monaco'] = null;
  try {
    const mod = await load('renderer/editor/monaco-theme.ts');
    const theme = mod['gmuxMonacoTheme'] as (state: {
      scheme: string;
      overrides: Record<string, string>;
      canvas: string;
      textDark: boolean;
    }) => { base: string; colors: Record<string, string>; rules: { token: string; foreground?: string }[] };
    monaco = {
      dark: theme({ scheme: 'dark', overrides: {}, canvas: '#131417', textDark: false }),
      light: theme({ scheme: 'light', overrides: {}, canvas: '#f5f7fa', textDark: true })
    };
  } catch {
    monaco = null;
  }
  const pierre = await readPierre(root);
  const carryover = await readCarryover(load);
  return {
    carryover,
    terminal: {
      dark: (terminal['terminalTheme'] as Record<string, string>) ?? {},
      light: (terminal['terminalThemeLight'] as Record<string, string>) ?? {},
      // What the pane really gets at each base's own shipped canvas. The
      // constants above are the table; this is the table AFTER the follow,
      // which is the thing a change to either could quietly replace.
      followedDark: followed('#131417', false, 'dark'),
      followedLight: followed('#f5f7fa', true, 'light'),
      floorDark: floorFor === undefined ? Number.NaN : floorFor('dark'),
      floorLight: floorFor === undefined ? Number.NaN : floorFor('light')
    },
    monaco,
    windowFill: {
      dark: fill(222, 0, 0, 'dark'),
      light: fill(222, 0, 0, 'light'),
      darkAt40: fill(40, 0, 0, 'dark'),
      lightAt40: fill(40, 0, 0, 'light')
    },
    pierre,
    tokensSha: {
      dark: sha256(schemeBlock(tokensCssFor(root), 'dark')),
      light: sha256(schemeBlock(tokensCssFor(root), 'light'))
    },
    hosts: {
      diffs: hostColorScheme(root, 'diffs-container'),
      tree: hostColorScheme(root, 'file-tree-container')
    },
    lanes: await readLanes(root, load),
    capture: await readCapture(root, load)
  };
}

/** The five cells research 80 section 1.3 measured, in its own order. */
const CAPTURE_CELLS = ['#ffd700', '#949494', '#afd7ff', '#ff87af', '#87d787'];

/**
 * THE CAPTURE FLOOR, read from the shipping extract and from the one file
 * that is supposed to call it (Phase 213 fix round). The module shipped with
 * no caller at all, so the wiring is half of what rule 29 asks.
 */
async function readCapture(
  root: string,
  load: (rel: string) => Promise<Record<string, unknown>>
): Promise<Facts['capture']> {
  try {
    const mod = await load('renderer/terminal/capture/contrast.ts');
    const ensure = mod['ensureContrastRatio'] as (
      background: string,
      foreground: string,
      ratio: number
    ) => string | null;
    const exempt = mod['treatGlyphAsBackgroundColor'] as (codepoint: number) => boolean;
    const floorFor = mod['floorForCell'] as (floor: number, dim: boolean) => number;
    const serializer = readFileSync(
      resolve(root, 'renderer/terminal/capture/serialize.ts'),
      'utf8'
    );
    return {
      onPaper: CAPTURE_CELLS.map((hex) => ensure('#f5f7fa', hex, 4.5)),
      onGraphite: CAPTURE_CELLS.map((hex) => ensure('#131417', hex, 4.5)),
      dim: ensure('#f5f7fa', '#ffffff', floorFor(4.5, true)),
      glyphExempt: exempt(0x2500) && exempt(0xe0b0) && !exempt(0x0041),
      letterLifted: ensure('#f5f7fa', '#ffffff', floorFor(4.5, false)) !== null,
      wired:
        /from '\.\/contrast'/.test(serializer) && /ensureContrastRatio\(/.test(serializer)
    };
  } catch {
    return null;
  }
}

/**
 * THE LANES, PER BASE (Phase 213 fix round). The token names come from the
 * shipping `LANE_COLOR_VARS` so a palette that grows a seventh lane is read
 * rather than missed, and the values from each base's own declarations with
 * the aliases already resolved. The map is the shipping one; an ablated copy
 * that carries only the dark pair is what makes rule 28 able to fail.
 */
async function readLanes(
  root: string,
  load: (rel: string) => Promise<Record<string, unknown>>
): Promise<Facts['lanes']> {
  const valuesFor = (scheme: 'dark' | 'light', names: readonly string[]): string[] => {
    const decls = declarationsFor(root, scheme);
    return names.map((name) => (decls.get(name) ?? '').toLowerCase());
  };
  try {
    const mod = await load('renderer/scm/graph/colors.ts');
    const names = (mod['LANE_COLOR_VARS'] as string[] | undefined) ?? [];
    const map = mod['CONFUSABLE_PAIRS'] as Map<number, readonly number[]> | undefined;
    return {
      dark: valuesFor('dark', names),
      light: valuesFor('light', names),
      confusable:
        map === undefined ? null : [...map.entries()].map(([key, slots]) => [key, [...slots]])
    };
  } catch {
    return { dark: [], light: [], confusable: null };
  }
}

/**
 * THE CARRYOVER, WALKED (Phase 213). Every pair each base offers, put
 * through the SHIPPING `frameForBase` for the other base, so rule 27 reads
 * counts this file measured rather than a claim the comment makes.
 *
 * An ablated copy whose `frameForBase` returns its argument untouched leaves
 * `movedToLight` at zero and `outsideAfterMove` at 31, which is what makes
 * the rule able to fail.
 */
async function readCarryover(
  load: (rel: string) => Promise<Record<string, unknown>>
): Promise<Facts['carryover']> {
  try {
    const stops = await load('renderer/theme/frame-stops.ts');
    const presets = await load('renderer/theme/presets.ts');
    const forBase = stops['frameForBase'] as
      | ((c: { chromeHue: number; chromeShade: number; chromeDepth: number }, s: string) => {
          chromeShade: number;
          chromeDepth: number;
        })
      | undefined;
    const offeredFn = stops['frameIsOffered'] as
      | ((shade: number, depth: number, scheme: string) => boolean)
      | undefined;
    const regionFor = presets['frameRegionFor'] as
      | ((s: string) => { shade: number; minDepth: number; maxDepth: number }[])
      | undefined;
    if (forBase === undefined || offeredFn === undefined || regionFor === undefined) return null;
    const pairs = (scheme: string): [number, number][] => {
      const out: [number, number][] = [];
      for (const row of regionFor(scheme)) {
        for (let d = row.minDepth; d <= row.maxDepth; d += 1) out.push([row.shade, d]);
      }
      return out;
    };
    const dark = pairs('dark');
    const light = pairs('light');
    let movedToLight = 0;
    let outsideAfterMove = 0;
    let darkUnmoved = 0;
    for (const [shade, depth] of dark) {
      const held = forBase({ chromeHue: 222, chromeShade: shade, chromeDepth: depth }, 'light');
      if (held.chromeShade !== shade || held.chromeDepth !== depth) movedToLight += 1;
      if (!offeredFn(held.chromeShade, held.chromeDepth, 'light')) outsideAfterMove += 1;
      const same = forBase({ chromeHue: 222, chromeShade: shade, chromeDepth: depth }, 'dark');
      if (same.chromeShade === shade && same.chromeDepth === depth) darkUnmoved += 1;
    }
    let lightToDarkUnmoved = 0;
    for (const [shade, depth] of light) {
      const held = forBase({ chromeHue: 222, chromeShade: shade, chromeDepth: depth }, 'dark');
      if (held.chromeShade === shade && held.chromeDepth === depth) lightToDarkUnmoved += 1;
    }
    return {
      darkOffered: dark.length,
      lightOffered: light.length,
      movedToLight,
      outsideAfterMove,
      darkUnmoved,
      lightToDarkUnmoved
    };
  } catch {
    return null;
  }
}

/**
 * THE PIERRE BRIDGE, EVALUATED (Phase 213) rather than read with a regular
 * expression, because what this gate pins is that the DARK diff theme is the
 * same object it was before the light one existed, and a pattern over source
 * text cannot say that about an object a factory now composes.
 *
 * The module imports two vendor packages whose `exports` maps node refuses,
 * so a copy is made with those two specifiers rewritten to stubs of this
 * file's own: `registerCustomTheme` does nothing, which is exactly what it
 * does here anyway since the registry is Shiki's, and `themeToTreeStyles`
 * answers the ONE key this gate reads back, the `colorScheme` the mapper
 * writes from the theme's type. Everything else in the module is its own
 * constants, so the two themes and the theme pair are the real objects. The
 * copy is removed in a finally block.
 */
async function readPierre(root: string): Promise<Facts['pierre']> {
  const own = resolve(root, 'renderer', 'pierre', 'theme-bridge.ts');
  const file = existsSync(own)
    ? own
    : resolve(repoRoot, 'src', 'renderer', 'pierre', 'theme-bridge.ts');
  if (!existsSync(file)) return null;
  const dir = mkdtempSync(join(tmpdir(), 'gmux-p213-pierre-'));
  try {
    writeFileSync(join(dir, 'diffs-stub.mjs'), 'export const registerCustomTheme = () => {};\n');
    writeFileSync(
      join(dir, 'trees-stub.mjs'),
      'export const themeToTreeStyles = (theme) => ({ colorScheme: theme.type });\n'
    );
    writeFileSync(
      join(dir, 'bridge.ts'),
      readFileSync(file, 'utf8')
        .replace(/from '@pierre\/diffs'/g, "from './diffs-stub.mjs'")
        .replace(/from '@pierre\/trees'/g, "from './trees-stub.mjs'")
    );
    const mod = (await import(pathToFileURL(join(dir, 'bridge.ts')).href)) as Record<string, unknown>;
    const dark = mod['gmuxDarkTheme'] as { type?: string } | undefined;
    const light = mod['gmuxLightTheme'] as { type?: string } | undefined;
    const pair = (mod['diffTheme'] ?? {}) as { dark?: string; light?: string };
    const tree = (mod['treeStyles'] ?? {}) as Record<string, string>;
    const colours = (name: string): string | null => {
      const theme = mod[name] as { colors?: Record<string, string> } | undefined;
      return theme?.colors?.['editor.background'] ?? null;
    };
    return {
      darkType: dark?.type ?? null,
      lightType: light?.type ?? null,
      darkSha: sha256(JSON.stringify(dark ?? null)),
      lightSha: sha256(JSON.stringify(light ?? null)),
      lightBg: colours('gmuxLightTheme'),
      lightFg: (light as { fg?: string } | undefined)?.fg ?? null,
      pair: { dark: pair.dark ?? '', light: pair.light ?? '' },
      treeKeys: Object.keys(tree).sort()
    };
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const answers: Record<string, unknown> = {};
for (const { name, root, hueStep, extraHues } of roots) {
  try {
    const step = Math.max(1, Math.round(hueStep ?? 1));
    const dark = await readRoot(root, step, extraHues ?? [], 'dark');
    // The light base (Phase 213), walked by the same probe over the light
    // block, and handed back beside the dark answer.
    const lightAnswer = await readRoot(root, step, extraHues ?? [], 'light');
    answers[name] = { ...dark, light: lightAnswer };
  } catch (error) {
    answers[name] = { error: error instanceof Error ? error.message : String(error) };
  }
}
// One line, so a stray log line above cannot break the reader.
process.stdout.write(`${JSON.stringify(answers)}\n`);
