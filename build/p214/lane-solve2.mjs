/**
 * P214 measure THREE, part four: the lane solve done properly.
 *
 * Two changes on the first pass. The objective is now the minimum over BOTH
 * models and all THREE deficiencies, so a set that only separates in the
 * arithmetic it was solved with cannot win; and the search is multi start
 * coordinate ascent, because the first pass found a worse answer at shade -1
 * than at shade -2, which is a local optimum and not a fact about paper.
 * Each candidate colour is simulated once and cached, so the objective is
 * six vector differences rather than six simulations.
 */
import { createRequire } from 'node:module';
import { hexToRgb, simulateVienot3, simulateMachado } from './cvd.mjs';
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
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 20; i += 1) {
    const mid = (lo + hi) / 2;
    const c = clampChroma({ mode: 'oklch', l, c: mid, h }, 'oklch');
    if (Math.abs(c.c - mid) < 1e-6) lo = mid; else hi = mid;
  }
  return lo;
};
const SIM_CACHE = new Map();
export function sims(hex) {
  let v = SIM_CACHE.get(hex);
  if (v === undefined) {
    const rgb = hexToRgb(hex);
    v = [
      simulateVienot3(rgb, 'protan'), simulateVienot3(rgb, 'deutan'), simulateVienot3(rgb, 'tritan'),
      simulateMachado(rgb, 'protan'), simulateMachado(rgb, 'deutan'), simulateMachado(rgb, 'tritan')
    ];
    SIM_CACHE.set(hex, v);
  }
  return v;
}
/** The worst of six models, which is the number a set has to clear. */
export function pairSep(a, b) {
  const x = sims(a), y = sims(b);
  let w = Infinity;
  for (let k = 0; k < 6; k += 1) {
    const d = Math.hypot(x[k][0] - y[k][0], x[k][1] - y[k][1], x[k][2] - y[k][2]);
    if (d < w) w = d;
  }
  return w;
}
export function worstOf(set) {
  let w = Infinity, pair = '';
  for (let i = 0; i < set.length; i += 1) {
    for (let j = i + 1; j < set.length; j += 1) {
      const s = pairSep(set[i], set[j]);
      if (s < w) { w = s; pair = `${i + 1}-${j + 1}`; }
    }
  }
  return { worst: w, pair };
}

export function optionsFor(hex, opts) {
  const b = toOklch(parse(hex));
  const out = new Set();
  for (let dh = -opts.hueSpan; dh <= opts.hueSpan; dh += 3) {
    const h = ((b.h ?? 0) + dh + 360) % 360;
    for (let l = 0.26; l <= 0.68; l += 0.01) {
      const cmax = maxChroma(l, h);
      for (let f = 0.5; f <= 1.4; f += 0.1) {
        const c = Math.min(cmax, b.c * f);
        const cand = hexOf({ mode: 'oklch', l, c, h });
        if (Math.min(...opts.grounds.map((g) => wcagContrast(cand, g))) < opts.floor) continue;
        if (wcagContrast(cand, opts.shippedActive) > opts.ceiling) continue;
        if (dE(cand, hex) > opts.identity) continue;
        out.add(cand);
      }
    }
  }
  return [...out];
}

export function solve(start, optionSets, restarts = 24, seed = 7) {
  let rng = seed;
  const rand = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };
  let bestSet = [...start];
  let bestScore = worstOf(bestSet).worst;
  for (let r = 0; r < restarts; r += 1) {
    const cur = start.map((hex, i) => {
      const o = optionSets[i];
      if (r === 0 || o.length === 0) return hex;
      return o[Math.floor(rand() * o.length)];
    });
    let score = worstOf(cur).worst;
    for (let pass = 0; pass < 20; pass += 1) {
      let moved = false;
      for (let i = 0; i < cur.length; i += 1) {
        let bh = cur[i], bs = score;
        for (const cand of optionSets[i]) {
          const trial = [...cur];
          trial[i] = cand;
          const w = worstOf(trial).worst;
          if (w > bs + 1e-9) { bs = w; bh = cand; }
        }
        if (bh !== cur[i]) { cur[i] = bh; score = bs; moved = true; }
      }
      if (!moved) break;
    }
    if (score > bestScore) { bestScore = score; bestSet = [...cur]; }
  }
  return { lanes: bestSet, worst: bestScore, pair: worstOf(bestSet).pair };
}
