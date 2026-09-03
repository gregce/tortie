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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

const tokensCss = readFileSync(
  resolve(repoRoot, 'src', 'renderer', 'styles', 'tokens.css'),
  'utf8'
).replace(/\/\*[\s\S]*?\*\//g, '');
const declarations = readDeclarations(tokensCss);

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
}

async function readRoot(
  root: string,
  hueStep: number,
  extraHues: readonly number[]
): Promise<Answer> {
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
  const terminalTextFor = terminal['terminalTextFor'] as (
    canvas: string,
    dark: boolean
  ) => Record<string, string>;

  const base: Record<string, string> = {};
  for (const token of allTokens) {
    const value = declarations.get(token);
    if (value !== undefined) base[token] = value;
  }
  for (const token of [...NEUTRALS, ...TEXTS, ...CHROMATIC]) {
    const value = declarations.get(token);
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
    for (const token of [...NEUTRALS, ...TEXTS, ...CHROMATIC]) {
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
  for (let i = 0; i <= 170; i += 1) {
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
  const CHROMATIC_PINS = presets['CHROMATIC_PINS'] as
    | { token: string; ground: string; floor: number }[]
    | undefined;
  const RAMP_ORDER = presets['RAMP_ORDER'] as string[] | undefined;
  const HAIRLINE_ORDER = presets['HAIRLINE_ORDER'] as string[] | undefined;
  const STEP_PAIRS = presets['RENDERED_STEP_PAIRS'] as [string, string][] | undefined;
  const STEP_MIN = presets['RENDERED_STEP_MIN'] as number | undefined;
  const TEXT_PINS = presets['TEXT_PINS'] as
    | { token: string; ground: string; grounds: string[]; floor: number | null }[]
    | undefined;
  const firstFloorFailure = floors['firstFloorFailure'] as
    | ((valueOf: (t: string) => string | undefined) => { family: string } | null)
    | undefined;

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
          chromaticMoved
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
    for (const token of [...NEUTRALS, ...TEXTS, ...CHROMATIC]) {
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
  for (const token of [...TEXTS, ...CHROMATIC]) shipped[token] = base[token] ?? '';
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
    regionTable: (presets['FRAME_REGION'] as
      | { shade: number; minDepth: number; maxDepth: number }[]
      | undefined) ?? []
  };
}

const answers: Record<string, unknown> = {};
for (const { name, root, hueStep, extraHues } of roots) {
  try {
    answers[name] = await readRoot(
      root,
      Math.max(1, Math.round(hueStep ?? 1)),
      extraHues ?? []
    );
  } catch (error) {
    answers[name] = { error: error instanceof Error ? error.message : String(error) };
  }
}
// One line, so a stray log line above cannot break the reader.
process.stdout.write(`${JSON.stringify(answers)}\n`);
