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
 *    which is the only way to reach the text rule, because no hue can.
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

interface RootSpec {
  name: string;
  root: string;
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
}

async function readRoot(root: string): Promise<Answer> {
  const load = async (rel: string): Promise<Record<string, unknown>> =>
    (await import(pathToFileURL(resolve(root, rel)).href)) as Record<string, unknown>;
  const derive = await load('renderer/theme/derive.ts');
  const presets = await load('renderer/theme/presets.ts');
  const hue = await load('renderer/theme/hue.ts');
  const terminal = await load('renderer/terminal/theme.ts');

  const deriveOverrides = derive['deriveOverrides'] as (
    appearance: { highlightScheme: string; contrastLevel: string; chromeHue: number },
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
    threshold
  };
}

const answers: Record<string, unknown> = {};
for (const { name, root } of roots) {
  try {
    answers[name] = await readRoot(root);
  } catch (error) {
    answers[name] = { error: error instanceof Error ? error.message : String(error) };
  }
}
// One line, so a stray log line above cannot break the reader.
process.stdout.write(`${JSON.stringify(answers)}\n`);
