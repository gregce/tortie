/**
 * P214 measure THREE, part three: solve six light lane hues that keep their
 * identity and separate under all three deficiencies.
 *
 * The search space per lane is its own OKLCH neighbourhood: the shipped hue
 * plus or minus HUE_SPAN degrees, a lightness range, and a chroma from a
 * fraction of the shipped one up to the sRGB gamut edge. The constraints are
 * the ones the light base already carries: every lane clears 3:1 on the
 * DARKEST selected row the candidate region reaches, and stays inside dE2000
 * IDENTITY of the colour it replaces so a person who knows the graph still
 * recognises it. The objective is the minimum pairwise separation over the
 * fifteen pairs, in the Vienot metric research 24 used, under protanopia
 * first and with deuteranopia and tritanopia carried beside it.
 */
import { createRequire } from 'node:module';
import { hexToRgb, simulateVienot3, simulateMachado, sep } from './cvd.mjs';
const require = createRequire(import.meta.url);
const { converter, parse, formatHex, clampChroma, wcagContrast, differenceCiede2000 } = require('culori');
const toOklch = converter('oklch');
const toRgb = converter('rgb');
const dE = differenceCiede2000();

const hexOf = (ok) => {
  const rgb = toRgb(clampChroma(ok, 'oklch'));
  return formatHex({ mode: 'rgb', r: Math.min(1, Math.max(0, rgb.r)), g: Math.min(1, Math.max(0, rgb.g)), b: Math.min(1, Math.max(0, rgb.b)) });
};
const maxChroma = (l, h) => {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    const c = clampChroma({ mode: 'oklch', l, c: mid, h }, 'oklch');
    if (Math.abs(c.c - mid) < 1e-6) lo = mid;
    else hi = mid;
  }
  return lo;
};

export function solveLanes(shipped, ground, opts = {}) {
  const hueSpan = opts.hueSpan ?? 10;
  const identity = opts.identity ?? 18;
  const floor = opts.floor ?? 3.05;
  // A lane may not go so dark that it stops being a colour: the ceiling is a
  // ratio on the SHIPPED selected row, because a lane at 10:1 on paper is ink
  // and two ink lanes are one lane whatever a simulation says.
  const ceiling = opts.ceiling ?? 8;
  const shippedActive = opts.shippedActive ?? '#d9dce3';
  const perLaneIdentity = opts.perLaneIdentity ?? null;
  const frozen = opts.frozen ?? [];
  const grounds = Array.isArray(ground) ? ground : [ground];
  const base = shipped.map((hex) => toOklch(parse(hex)));
  // Per lane, every candidate colour that keeps its identity and its floor.
  const options = shipped.map((hex, i) => {
    const b = base[i];
    const out = [];
    const cap = perLaneIdentity === null ? identity : (perLaneIdentity[i] ?? identity);
    if (frozen.includes(i)) return [hex];
    for (let dh = -hueSpan; dh <= hueSpan; dh += 2) {
      const h = ((b.h ?? 0) + dh + 360) % 360;
      for (let l = 0.24; l <= 0.70; l += 0.006) {
        const cmax = maxChroma(l, h);
        for (let f = 0.5; f <= 1.35; f += 0.06) {
          const c = Math.min(cmax, b.c * f);
          const cand = hexOf({ mode: 'oklch', l, c, h });
          if (Math.min(...grounds.map((g) => wcagContrast(cand, g))) < floor) continue;
          if (wcagContrast(cand, shippedActive) > ceiling) continue;
          if (dE(cand, hex) > cap) continue;
          out.push(cand);
        }
      }
    }
    return [...new Set(out)];
  });
  // Coordinate ascent from the shipped palette: one lane at a time, take the
  // colour that maximises the worst pair over all fifteen, until nothing moves.
  const metric = opts.metric ?? ((a, b) => Math.min(
    sep(hexToRgb(a), hexToRgb(b), simulateVienot3, 'protan'),
    sep(hexToRgb(a), hexToRgb(b), simulateVienot3, 'deutan'),
    sep(hexToRgb(a), hexToRgb(b), simulateVienot3, 'tritan')
  ));
  const worstOf = (set) => {
    let w = Infinity;
    let pair = '';
    for (let i = 0; i < set.length; i += 1) {
      for (let j = i + 1; j < set.length; j += 1) {
        const s = metric(set[i], set[j]);
        if (s < w) { w = s; pair = `${i + 1}-${j + 1}`; }
      }
    }
    return { worst: w, pair };
  };
  let current = [...shipped];
  let best = worstOf(current);
  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;
    for (let i = 0; i < current.length; i += 1) {
      let bestHex = current[i];
      let bestScore = best.worst;
      for (const cand of options[i]) {
        const trial = [...current];
        trial[i] = cand;
        const w = worstOf(trial);
        if (w.worst > bestScore + 1e-9) { bestScore = w.worst; bestHex = cand; }
      }
      if (bestHex !== current[i]) {
        current[i] = bestHex;
        best = worstOf(current);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { lanes: current, ...worstOf(current), options: options.map((o) => o.length) };
}

export function reportLanes(name, hexes, grounds) {
  console.log(`\n## ${name}`);
  const rows = [];
  for (let i = 0; i < hexes.length; i += 1) {
    for (let j = i + 1; j < hexes.length; j += 1) {
      const a = hexToRgb(hexes[i]);
      const b = hexToRgb(hexes[j]);
      rows.push({
        pair: `${i + 1}-${j + 1}`,
        p: sep(a, b, simulateVienot3, 'protan'),
        d: sep(a, b, simulateVienot3, 'deutan'),
        t: sep(a, b, simulateVienot3, 'tritan'),
        mp: sep(a, b, simulateMachado, 'protan'),
        md: sep(a, b, simulateMachado, 'deutan'),
        mt: sep(a, b, simulateMachado, 'tritan')
      });
    }
  }
  const worstAll = rows.slice().sort((x, y) => Math.min(x.p, x.d, x.t) - Math.min(y.p, y.d, y.t))[0];
  const worstP = rows.slice().sort((x, y) => x.p - y.p)[0];
  const worstPD = rows.slice().sort((x, y) => Math.min(x.p, x.d) - Math.min(y.p, y.d))[0];
  const worstM = rows.slice().sort((x, y) => Math.min(x.mp, x.md, x.mt) - Math.min(y.mp, y.md, y.mt))[0];
  console.log(`lanes ${hexes.join(' ')}`);
  const ratios = hexes.map((h) => Math.min(...grounds.map((g) => wcagContrast(h, g))).toFixed(2));
  console.log(`worst WCAG on the three row grounds per lane: ${ratios.join(' ')}`);
  console.log(`worst pair protanopia only:      ${worstP.pair} at ${worstP.p.toFixed(1)}`);
  console.log(`worst pair protan+deutan (tree): ${worstPD.pair} at ${Math.min(worstPD.p, worstPD.d).toFixed(1)}`);
  console.log(`worst pair over all three:       ${worstAll.pair} at ${Math.min(worstAll.p, worstAll.d, worstAll.t).toFixed(1)} (p ${worstAll.p.toFixed(1)} d ${worstAll.d.toFixed(1)} t ${worstAll.t.toFixed(1)})`);
  console.log(`worst pair, Machado cross check: ${worstM.pair} at ${Math.min(worstM.mp, worstM.md, worstM.mt).toFixed(1)}`);
  const weak = rows.filter((r) => Math.min(r.p, r.d) < 32).map((r) => `${r.pair}=${Math.min(r.p, r.d).toFixed(1)}`);
  console.log(`pairs under 32 in the tree metric: ${weak.length === 0 ? 'none' : weak.join(', ')}`);
  return rows;
}
