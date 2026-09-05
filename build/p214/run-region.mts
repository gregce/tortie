import { LIGHT_BASE, walkCell } from './region.mts';

const shades = [-4, -3, -2, -1, 0, 1, 2];
const depths = [-3, -2, -1, 0, 1, 2, 3];
const step = Number(process.env.P214_HUE_STEP ?? '1');

console.log(`# light base binding table, hue step ${step}, 3 contrast levels + 4 schemes every 15deg`);
console.log('shade depth  offered  binding key                              slack   got   need  hue/contrast/scheme');
const rowBest = new Map<number, { depth: number; slack: number; key: string }>();
for (const shade of shades) {
  for (const depth of depths) {
    const cell = walkCell(shade, depth, LIGHT_BASE, step);
    const w = cell.worst;
    const ok = w.slack > 0;
    console.log(
      `${String(shade).padStart(5)} ${String(depth).padStart(5)}  ${(ok ? 'yes' : 'no ').padEnd(7)}  ${w.key.padEnd(38)}${w.slack.toFixed(3).padStart(7)} ${w.got.toFixed(3).padStart(6)} ${w.need.toFixed(2).padStart(6)}  ${w.hue}/${w.contrast}/${w.scheme}`
    );
    const seen = rowBest.get(shade);
    if (seen === undefined || w.slack > seen.slack) rowBest.set(shade, { depth, slack: w.slack, key: w.key });
    // The three worst keys of the cell, so the order of re-solve is visible.
    const sorted = [...cell.perKey.values()].sort((a, b) => a.slack - b.slack).slice(0, 4);
    for (const s of sorted.slice(1)) {
      console.log(`                        ${s.key.padEnd(38)}${s.slack.toFixed(3).padStart(7)} ${s.got.toFixed(3).padStart(6)} ${s.need.toFixed(2).padStart(6)}  ${s.hue}/${s.contrast}/${s.scheme}`);
    }
  }
}
console.log('\n# best depth per shade row');
for (const [shade, best] of rowBest) {
  console.log(`shade ${String(shade).padStart(2)}: best depth ${String(best.depth).padStart(2)}, slack ${best.slack.toFixed(3)}, bound by ${best.key}`);
}
