/**
 * P214 measure TWO: candidate solves for headroom at each candidate darkest
 * shade row, and what each one costs at the SHIPPED ground.
 *
 * The rule is the phase's own: solve each binding colour to hold its floor at
 * the DARKEST row the candidate intends to offer, rather than at the shipped
 * ground, then check what it reads at the shipped ground and whether it has
 * gone muddy there. The order is the entry's: --accent-text, then the status
 * dots on the active row, then the six git decorations, then the lanes.
 */
import { clampChroma, converter, differenceCiede2000, formatHex, parse, wcagContrast } from 'culori';
import { LIGHT_BASE, walkCell } from './region.mts';
import { darkestGrounds } from './grounds.mts';

const toOklch = converter('oklch');
const toRgb = converter('rgb');
const dE = differenceCiede2000();

function hexOf(ok: { l: number; c: number; h?: number; mode: 'oklch' }): string {
  const rgb = toRgb(clampChroma(ok, 'oklch')) as { r: number; g: number; b: number };
  return formatHex({
    mode: 'rgb',
    r: Math.min(1, Math.max(0, rgb.r)),
    g: Math.min(1, Math.max(0, rgb.g)),
    b: Math.min(1, Math.max(0, rgb.b))
  } as never) as string;
}

/** The darkest colour with this hue and chroma that clears `ratio` on `ground`. */
export function solveDarker(css: string, ground: string, ratio: number): string {
  const ok = toOklch(parse(css) as never) as { l: number; c: number; h?: number; mode: 'oklch' };
  let lo = 0;
  let hi = ok.l;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (wcagContrast(hexOf({ ...ok, l: mid }), ground) >= ratio) lo = mid;
    else hi = mid;
  }
  return hexOf({ ...ok, l: lo });
}

/** The tokens the light palette must hold, with their floor and their ground. */
export const BINDING: { token: string; ground: string; floor: number; why: string }[] = [
  { token: '--accent-text', ground: '--bg-sidebar', floor: 4.5, why: 'text on the frame, its worst ground' },
  { token: '--accent', ground: '--bg-canvas', floor: 3, why: 'a fill on the paper' },
  { token: '--status-working', ground: '--bg-active', floor: 3, why: 'a dot on the selected row' },
  { token: '--status-attention', ground: '--bg-active', floor: 3, why: 'a dot on the selected row' },
  { token: '--status-idle', ground: '--bg-active', floor: 3, why: 'a dot on the selected row' },
  { token: '--status-exited', ground: '--bg-active', floor: 3, why: 'a dot on the selected row' },
  { token: '--status-failed', ground: '--bg-active', floor: 3, why: 'a dot on the selected row' },
  { token: '--status-attention-badge-bg', ground: '--bg-active', floor: 3, why: 'the badge fill' },
  { token: '--git-modified', ground: '--bg-active', floor: 3, why: 'a decoration on the selected row' },
  { token: '--git-added', ground: '--bg-active', floor: 3, why: 'a decoration on the selected row' },
  { token: '--git-deleted', ground: '--bg-active', floor: 3, why: 'a decoration on the selected row' },
  { token: '--git-renamed', ground: '--bg-active', floor: 3, why: 'a decoration on the selected row' },
  { token: '--git-conflict', ground: '--bg-active', floor: 3, why: 'a decoration on the selected row' },
  { token: '--graph-lane-3', ground: '--bg-active', floor: 3, why: 'a lane on the selected row' },
  { token: '--graph-lane-5', ground: '--bg-active', floor: 3, why: 'a lane on the selected row' }
];

/** The mirrors that must move with a colour so the palette stays one thing. */
export const MIRROR: Record<string, string[]> = {
  '--accent': ['--status-working'],
  '--git-deleted': ['--error'],
  '--status-attention': ['--warning', '--status-attention-badge-bg', '--focus-wash-attention'],
  '--git-added': ['--success'],
  '--git-renamed': ['--info']
};

export function candidate(
  shade: number,
  depths: readonly number[],
  margin: number
): { base: Record<string, string>; moves: { token: string; from: string; to: string }[] } {
  const grounds = darkestGrounds(shade, depths);
  const base = { ...LIGHT_BASE };
  const moves: { token: string; from: string; to: string }[] = [];
  for (const pin of BINDING) {
    const ground = grounds[pin.ground];
    if (ground === undefined) continue;
    const from = base[pin.token] as string;
    if (wcagContrast(from, ground.hex) >= pin.floor + margin) continue;
    const to = solveDarker(from, ground.hex, pin.floor + margin);
    base[pin.token] = to;
    moves.push({ token: pin.token, from, to });
    for (const mirror of MIRROR[pin.token] ?? []) {
      const was = base[mirror];
      if (was === undefined) continue;
      const next = was.startsWith('#') ? to : was.replace(/#[0-9a-fA-F]{6}/, to).replace(/rgba?\(([^)]*)\)/, (whole) => whole);
      if (was.startsWith('#')) {
        base[mirror] = next;
        moves.push({ token: mirror, from: was, to: next });
      }
    }
  }
  return { base, moves };
}

export function shippedRatio(token: string, ground: string, base: Record<string, string>): number {
  return wcagContrast(base[token] as string, base[ground] as string);
}

export function muddy(from: string, to: string): string {
  const a = toOklch(parse(from) as never) as { l: number; c: number; h?: number };
  const b = toOklch(parse(to) as never) as { l: number; c: number; h?: number };
  return `L ${a.l.toFixed(3)}->${b.l.toFixed(3)} C ${a.c.toFixed(3)}->${b.c.toFixed(3)} H ${(a.h ?? 0).toFixed(0)}->${(b.h ?? 0).toFixed(0)} dE2000 ${dE(from, to).toFixed(1)}`;
}

export { walkCell, LIGHT_BASE };
