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
console.log('      agree that pair is 36.4 or better.');

console.log('\n# Step 5. ONE OF THE NINE IS NOT MODELLING WHAT IT NAMES, and steps 1 and 2');
console.log('did not catch it, which is the point of this step.');
console.log('The single plane extended to tritanopia holds a fixed white point and it is');
console.log('idempotent. It is also degenerate. Its two matrices round trip to the identity,');
console.log('so this is not a transcription error, but on the tritan plane the reconstruction');
console.log('gives red and green the same coefficients:');
const F = [[17.8824, 43.5161, 4.11935], [3.45565, 27.1554, 3.86714], [0.0299566, 0.184309, 1.46709]];
const RM = [
  [0.0809444479, -0.130504409, 0.116721066],
  [-0.0102485335, 0.0540193266, -0.113614708],
  [-0.000365296938, -0.00412161469, 0.693511405]
];
const mm3 = (x, y) => x.map((r) => [0, 1, 2].map((j) => r[0] * y[0][j] + r[1] * y[1][j] + r[2] * y[2][j]));
const ident = mm3(RM, F);
console.log(`  the two matrices round trip: worst off diagonal ${Math.max(...ident.flatMap((r, i) => r.map((v, j) => (i === j ? Math.abs(v - 1) : Math.abs(v))))).toExponential(1)}`);
for (const [name, row] of [['red  ', RM[0]], ['green', RM[1]], ['blue ', RM[2]]]) {
  console.log(`  ${name} on the tritan plane: L ${(row[0] + row[2] * -0.395913).toFixed(6)}  M ${(row[1] + row[2] * 0.801109).toFixed(6)}`);
}
let sameRG = 0;
let totalRG = 0;
for (let r = 0; r < 256; r += 5) {
  for (let g = 0; g < 256; g += 5) {
    for (let b = 0; b < 256; b += 5) {
      totalRG += 1;
      const o = simulateVienot3([r, g, b], 'tritan');
      if (o[0] === o[1]) sameRG += 1;
    }
  }
}
console.log(`  so R equals G in ${String(sameRG)} of ${String(totalRG)} colours, which is a red green confusion`);
const plainGap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const BLUE_ONLY = ['#8080c0', '#808040'];
const RED_GREEN = ['#c08080', '#80c080'];
console.log(`  a blue only difference of ${plainGap(hexToRgb(BLUE_ONLY[0]), hexToRgb(BLUE_ONLY[1])).toFixed(1)} reads:`);
for (const [name, fn] of [['single plane', simulateVienot3], ['Machado', simulateMachado], ['Brettel', simulateBrettel]]) {
  console.log(`      ${name.padEnd(13)} ${plainGap(fn(hexToRgb(BLUE_ONLY[0]), 'tritan'), fn(hexToRgb(BLUE_ONLY[1]), 'tritan')).toFixed(1)}`);
}
console.log(`  a mid red against a mid green of ${plainGap(hexToRgb(RED_GREEN[0]), hexToRgb(RED_GREEN[1])).toFixed(1)} reads:`);
for (const [name, fn] of [['single plane', simulateVienot3], ['Machado', simulateMachado], ['Brettel', simulateBrettel]]) {
  console.log(`      ${name.padEnd(13)} ${plainGap(fn(hexToRgb(RED_GREEN[0]), 'tritan'), fn(hexToRgb(RED_GREEN[1]), 'tritan')).toFixed(1)}`);
}

console.log('\n# Step 6. The worst pair over the EIGHT arms that model what they name.');
const SOUND = MODELS.filter(([name]) => name !== 'Vienot tritan');
for (const [label, lanes] of [['the lanes that shipped', SHIPPED], ['the parent c49a57d', PARENT]]) {
  let all = { v: Infinity };
  const under = [];
  for (const [name, fn, kind] of SOUND) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = i + 1; j < 6; j += 1) {
        const v = sep(hexToRgb(lanes[i]), hexToRgb(lanes[j]), fn, kind);
        if (v < all.v) all = { v, pair: `${String(i + 1)}-${String(j + 1)}`, name };
        if (v < 32) under.push(`${String(i + 1)}-${String(j + 1)} ${name} ${v.toFixed(1)}`);
      }
    }
  }
  console.log(`  ${label}: worst pair ${all.pair} at ${all.v.toFixed(1)} under ${all.name}`);
  console.log(`    pairs under the floor of 32: ${under.length === 0 ? 'NONE' : under.join(', ')}`);
}
console.log('\n  36.1 is the number the palette publishes, and it survives. What does not is');
console.log('  the attribution: it is eight arms and not six, and one of the six was this.');
