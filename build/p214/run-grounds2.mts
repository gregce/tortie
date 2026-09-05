import { darkestGrounds } from './grounds.mts';
const GROUNDS = ['--bg-active', '--bg-canvas', '--bg-sidebar', '--bg-raised', '--bg-surface'];
console.log('# the darkest ground each shade row reaches, DEPTHS -3..0 ONLY (the light region shape)');
console.log('shade  token          hex      Y       at hue/contrast/depth   cap Y for 3:1   cap Y for 4.5:1');
for (const shade of [0, -1, -2, -3, -4]) {
  const g = darkestGrounds(shade, [-3, -2, -1, 0]);
  for (const token of GROUNDS) {
    const r = g[token]!;
    console.log(
      `${String(shade).padStart(5)}  ${token.padEnd(13)} ${r.hex}  ${r.y.toFixed(4)}   ${String(r.hue).padStart(3)}/${r.contrast.padEnd(6)}/${String(r.depth).padStart(2)}   ${((r.y + 0.05) / 3 - 0.05).toFixed(4)}          ${((r.y + 0.05) / 4.5 - 0.05).toFixed(4)}`
    );
  }
  console.log('');
}
