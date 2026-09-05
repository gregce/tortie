import {
  hexToRgb, rgbToHex, simulateVienot, simulateVienot3, simulateMachado, simulateBrettel,
  sep, planeChecks, brettelChecks, brettelDerivation
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

console.log('\n# Step 4. Brettel 1997, the two half plane model (Phase 214 fix round)');
console.log('The verifier of this phase wrote its own Brettel and read the shipped lanes 2 and 6');
console.log('at 27.0 under protanopia. This one reads 41.4. Only one of them can be right, so');
console.log('this model is asked three things before either number is published.');

console.log('\n  4a. Each half plane is a projection onto a plane, so its matrix is singular,');
console.log('      and white is a fixed point of both.');
const bc = brettelChecks();
for (const kind of ['protan', 'deutan', 'tritan']) {
  const c = bc[kind];
  console.log(`      ${kind.padEnd(7)} det ${c.detA.toExponential(1)} / ${c.detB.toExponential(1)}, white -> ${rgbToHex(c.white)}`);
}

console.log('\n  4b. THE CHECK A MIS-SCALED ANCHOR CANNOT PASS. The two halves of one');
console.log('      deficiency are hinged on a shared boundary, so on that boundary they must');
console.log('      give the same answer. An anchor taken from one LMS normalisation and used');
console.log('      in another yields two plausible planes that do not meet, which is the most');
console.log('      likely way to get a wrong separation out of this model.');
let worstSeam = 0;
for (const kind of ['protan', 'deutan', 'tritan']) {
  worstSeam = Math.max(worstSeam, bc[kind].seam);
  console.log(`      ${kind.padEnd(7)} the two halves disagree on their own boundary by ${bc[kind].seam.toFixed(3)} of 255`);
}
console.log(`      worst seam ${worstSeam.toFixed(3)} of 255`);

console.log('\n  4c. The published matrices are re-derived from the construction: CIE 1931 two');
console.log('      degree at 475, 575, 485 and 660 nm, Smith and Pokorny LMS, and the plane');
console.log('      through white and one anchor.');
const bd = brettelDerivation();
for (const kind of ['protan', 'deutan', 'tritan']) {
  console.log(`      ${kind.padEnd(7)} worst coefficient disagreement with the published matrix ${bd[kind].toFixed(4)}`);
}

console.log('\n  4d. What it reads on the lanes that shipped, against the two models above.');
const SHIPPED = ['#2175bd', '#b62926', '#004f4e', '#823c00', '#613374', '#2c6a3b'];
const PARENT = ['#2175bd', '#b23534', '#004f4e', '#833e00', '#613374', '#00530e'];
const MODELS = [
  ['Vienot protan', simulateVienot3, 'protan'], ['Vienot deutan', simulateVienot3, 'deutan'],
  ['Vienot tritan', simulateVienot3, 'tritan'], ['Machado protan', simulateMachado, 'protan'],
  ['Machado deutan', simulateMachado, 'deutan'], ['Machado tritan', simulateMachado, 'tritan'],
  ['Brettel protan', simulateBrettel, 'protan'], ['Brettel deutan', simulateBrettel, 'deutan'],
  ['Brettel tritan', simulateBrettel, 'tritan']
];
for (const [label, lanes] of [['the lanes that shipped', SHIPPED], ['the parent c49a57d', PARENT]]) {
  console.log(`\n      ## ${label}: ${lanes.join(' ')}`);
  let all = { v: Infinity };
  for (const [name, fn, kind] of MODELS) {
    let w = { v: Infinity };
    for (let i = 0; i < 6; i += 1) {
      for (let j = i + 1; j < 6; j += 1) {
        const v = sep(hexToRgb(lanes[i]), hexToRgb(lanes[j]), fn, kind);
        if (v < w.v) w = { v, pair: `${String(i + 1)}-${String(j + 1)}` };
        if (v < all.v) all = { v, pair: `${String(i + 1)}-${String(j + 1)}`, name };
      }
    }
    console.log(`      ${name.padEnd(15)} worst pair ${w.pair} at ${w.v.toFixed(1)}`);
  }
  console.log(`      WORST OVER ALL NINE: pair ${all.pair} at ${all.v.toFixed(1)} under ${all.name}`);
  console.log(`      lanes 2 and 6 under Brettel protanopia: ${sep(hexToRgb(lanes[1]), hexToRgb(lanes[5]), simulateBrettel, 'protan').toFixed(1)}`);
}
console.log('\n      So the verifier reading of 27.0 for lanes 2 and 6 is refuted: three models');
console.log('      agree that pair is 36.4 or better, and the worst pair anywhere on paper is');
console.log('      33.9, being lanes 4 and 5 under the single plane model extended to tritan.');
