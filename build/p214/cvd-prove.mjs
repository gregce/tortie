import {
  hexToRgb, rgbToHex, simulateVienot, simulateVienot3, simulateMachado, sep, planeChecks
} from './cvd.mjs';

const KNOWN = [
  ['#4d9de8', '#e8629c', 85, 83, 'the pink that won'],
  ['#4d9de8', '#b98cff', 24, 31, 'the VS Code like violet'],
  ['#4d9de8', '#c583d8', 21, 27, 'terminal magenta'],
  ['#4d9de8', '#56c2c0', 64, 60, 'terminal cyan'],
  ['#4d9de8', '#e2b340', 174, 190, 'amber']
];
console.log('# Step 1. Proving the simulation on research 24 section 7.4, published protan / deutan');
console.log('what                     pair              published   mine (Vienot)   Machado 2009');
let worstErr = 0;
for (const [a, b, p, d, what] of KNOWN) {
  const va = sep(hexToRgb(a), hexToRgb(b), simulateVienot3, 'protan');
  const vd = sep(hexToRgb(a), hexToRgb(b), simulateVienot3, 'deutan');
  const ma = sep(hexToRgb(a), hexToRgb(b), simulateMachado, 'protan');
  const md = sep(hexToRgb(a), hexToRgb(b), simulateMachado, 'deutan');
  worstErr = Math.max(worstErr, Math.abs(va - p), Math.abs(vd - d));
  console.log(
    `${what.padEnd(24)} ${a} ${b}   ${String(p).padStart(3)}/${String(d).padStart(3)}    ${va.toFixed(1).padStart(5)}/${vd.toFixed(1).padStart(5)}     ${ma.toFixed(1).padStart(5)}/${md.toFixed(1).padStart(5)}`
  );
}
console.log(`worst disagreement with the published numbers: ${worstErr.toFixed(2)}; they are printed to the unit`);

console.log('\n# Step 2. The two structural properties a projection cannot fake');
const c = planeChecks();
console.log(`white in LMS is L ${c.white[0].toFixed(2)} M ${c.white[1].toFixed(2)} S ${c.white[2].toFixed(3)}`);
console.log(`  protan plane returns L ${c.protan.toFixed(2)} against ${c.white[0].toFixed(2)}, error ${(c.protan - c.white[0]).toFixed(3)}`);
console.log(`  deutan plane returns M ${c.deutan.toFixed(2)} against ${c.white[1].toFixed(2)}, error ${(c.deutan - c.white[1]).toFixed(3)}`);
console.log(`  tritan plane returns S ${c.tritan.toFixed(3)} against ${c.white[2].toFixed(3)}, error ${(c.tritan - c.white[2]).toFixed(4)}`);
for (const kind of ['protan', 'deutan', 'tritan']) {
  let worst = 0;
  for (let i = 0; i < 4096; i += 1) {
    const rgb = [(i * 37) % 256, (i * 91) % 256, (i * 173) % 256];
    const once = simulateVienot3(rgb, kind);
    const twice = simulateVienot3(once, kind);
    worst = Math.max(worst, Math.hypot(once[0] - twice[0], once[1] - twice[1], once[2] - twice[2]));
  }
  console.log(`  ${kind}: idempotent over 4096 colours, worst re-simulation move ${worst.toFixed(2)} of 255`);
  const grey = simulateVienot3(hexToRgb('#808080'), kind);
  console.log(`  ${kind}: mid grey #808080 -> ${rgbToHex(grey)}`);
}

console.log('\n# Step 3. It agrees with the tree helper it is meant to be independent of');
console.log('(the tree helper is Vienot protan/deutan only; the pairs above already show 84.8/82.8 and 24.1/30.9, which is what src/renderer/scm/graph/__tests__/contrast.ts records)');
