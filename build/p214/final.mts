/**
 * P214 measure TWO, final: the combined palette (headroom solve plus the
 * least change lane solve) re-walked, and the rows it genuinely buys.
 *
 * The walk carries ONE PIN THE SHIPPED PREDICATE DOES NOT: --accent-text on
 * --bg-sidebar. tokens.css itself records that reading as the tight one, at
 * 4.69 against a floor of 4.5, and presets.ts pins the token on the CANVAS
 * alone, where it reads 5.03. So the region the product offers today is
 * measured against the kinder of the two grounds the colour actually sits on,
 * and both readings are printed here.
 */
import { wcagContrast } from 'culori';
import { LIGHT_BASE, walkCell, slacksAt } from './region.mts';
import { candidate } from './solve.mts';

const LANES: Record<string, Record<string, string>> = {
  '0': { '--git-deleted': '#b62926', '--git-conflict': '#823c00', '--graph-lane-5': '#5b3274', '--git-added': '#2c6a3b' },
  '-1': { '--git-deleted': '#b62926', '--git-conflict': '#823c00', '--graph-lane-5': '#5b3274', '--git-added': '#2c6a3b' },
  '-2': { '--git-deleted': '#c01f20', '--git-conflict': '#743100', '--graph-lane-5': '#59377b', '--git-added': '#286b32' },
  '-3': { '--git-deleted': '#bc1827', '--graph-lane-3': '#02504e', '--git-conflict': '#823c00', '--graph-lane-5': '#5b3274', '--git-added': '#316938' }
};

const step = Number(process.env.P214_HUE_STEP ?? '1');
const schemeStep = Number(process.env.P214_SCHEME_STEP ?? '5');
const targets = (process.env.P214_TARGETS ?? '-1,-2,-3').split(',');

function withSidebarPin(valueOf: (t: string) => string | undefined) {
  const extra = slacksAt(valueOf);
  const fg = valueOf('--accent-text');
  const bg = valueOf('--bg-sidebar');
  if (fg !== undefined && bg !== undefined) {
    const got = wcagContrast(fg, bg);
    extra.push({ key: '--accent-text on --bg-sidebar (UNPINNED TODAY)', family: 'chromatic', slack: got - 4.5, got, need: 4.5 });
  }
  return extra;
}
void withSidebarPin;

for (const t of targets) {
  const target = Number(t);
  const { base, moves } = candidate(target, [-3, -2, -1, 0], 0.06);
  for (const [token, hex] of Object.entries(LANES[t] ?? {})) base[token] = hex;
  if (base['--git-deleted'] !== undefined) base['--graph-lane-2'] = base['--git-deleted'];
  if (base['--git-conflict'] !== undefined) base['--graph-lane-4'] = base['--git-conflict'];
  if (base['--git-added'] !== undefined) base['--graph-lane-6'] = base['--git-added'];
  if (base['--accent'] !== undefined) base['--graph-lane-1'] = base['--accent'];
  if (base['--git-deleted'] !== undefined) base['--error'] = base['--git-deleted'];
  if (base['--git-added'] !== undefined) base['--success'] = base['--git-added'];

  console.log(`\n\n########## COMBINED CANDIDATE, solved at shade ${target} ##########`);
  console.log(`headroom moves: ${moves.map((m) => `${m.token} ${m.from}->${m.to}`).join(', ')}`);
  console.log(`lane moves: ${Object.entries(LANES[t] ?? {}).map(([k, v]) => `${k}->${v}`).join(', ')}`);
  console.log('\nregion, shade down the side, depth -3..3 across; the number is the worst slack in the cell');
  for (const shade of [2, 1, 0, -1, -2, -3, -4]) {
    const cells: string[] = [];
    let rowBind = '';
    let rowBest = -Infinity;
    for (const depth of [-3, -2, -1, 0, 1, 2, 3]) {
      const cell = walkCell(shade, depth, base, step, schemeStep as never);
      cells.push(cell.worst.slack > 0 ? cell.worst.slack.toFixed(2).padStart(6) : '     .');
      if (cell.worst.slack > rowBest) {
        rowBest = cell.worst.slack;
        rowBind = `${cell.worst.key} at ${cell.worst.hue}/${cell.worst.contrast}/${cell.worst.scheme}`;
      }
    }
    console.log(`  shade ${String(shade).padStart(2)} ${cells.join('')}   best ${rowBest.toFixed(3)} bound by ${rowBind}`);
  }
}
