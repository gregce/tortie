import { candidate, BINDING, muddy, walkCell, LIGHT_BASE } from './solve.mts';
import { wcagContrast } from 'culori';

const MARGIN = Number(process.env.P214_MARGIN ?? '0.06');
const step = Number(process.env.P214_HUE_STEP ?? '3');
const depths = [-3, -2, -1, 0];

for (const target of [-1, -2, -3, -4]) {
  console.log(`\n\n=========== CANDIDATE: darkest offered shade ${target}, depths -3..0, margin ${MARGIN} ===========`);
  const { base, moves } = candidate(target, depths, MARGIN);
  console.log(`${moves.length} token(s) moved:`);
  console.log('token                          from     to       at the SHIPPED ground: before -> after   what moved');
  for (const m of moves) {
    const pin = BINDING.find((p) => p.token === m.token);
    const ground = pin?.ground ?? '--bg-active';
    const before = wcagContrast(m.from, LIGHT_BASE[ground] as string);
    const after = wcagContrast(m.to, LIGHT_BASE[ground] as string);
    console.log(
      `${m.token.padEnd(30)} ${m.from}  ${m.to}   ${before.toFixed(2)} -> ${after.toFixed(2)} on ${ground.padEnd(13)} ${muddy(m.from, m.to)}`
    );
  }
  console.log('\nre-walk of the region with that palette:');
  for (const shade of [2, 1, 0, -1, -2, -3, -4]) {
    const row: string[] = [];
    let bind = '';
    let bindSlack = Infinity;
    for (const depth of [-3, -2, -1, 0, 1, 2, 3]) {
      const cell = walkCell(shade, depth, base, step);
      row.push(cell.worst.slack > 0 ? 'Y' : '.');
      if (cell.worst.slack < bindSlack && depth <= 0) {
        bindSlack = cell.worst.slack;
        bind = `${cell.worst.key} ${cell.worst.slack.toFixed(3)}`;
      }
    }
    const best = [-3, -2, -1, 0].map((d) => walkCell(shade, d, base, step)).sort((a, b) => b.worst.slack - a.worst.slack)[0]!;
    console.log(`  shade ${String(shade).padStart(2)}  depth -3..3  ${row.join(' ')}   best cell depth ${best.depth} slack ${best.worst.slack.toFixed(3)} bound by ${best.worst.key}`);
  }
}
