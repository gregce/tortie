/**
 * Phase 138 gate measurement 2, the objective half.
 *
 * For every folded summary it does two things that need no invented scale.
 *  1. Ungrounded token check. Every distinctive token in the summary, being a
 *     number, an identifier or a rare word, is looked for in the turns the
 *     fold has actually seen. A token found nowhere is a candidate the model
 *     made up, and it is printed for a person to read.
 *  2. Where the summary's words come from. It reports how much of the summary
 *     overlaps the three newest turns and how much overlaps the three oldest,
 *     which is what anchoring to abandoned work would look like.
 */
import { readFileSync } from 'node:fs';

const dump = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const state = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const from = Number(process.argv[4] ?? '0');

const STOP = new Set(
  ('the a an and or but of to in on for with by from as at is are was were be been being you your the agent it its ' +
   'this that these those has have had will would can could should now then so if not no yes one two three four five ' +
   'six seven eight nine ten first next after before while when which who what where why how each every all any some ' +
   'more most less least than into out up down over under about only just still also both either neither ' +
   'asked answer answered agent session sessions work working shipped ship phase phases')
    .split(/\s+/)
);

function toks(s) {
  return String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9_.\-\/]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function bag(turns) {
  const b = new Set();
  for (const t of turns) {
    for (const w of toks(t.ask)) b.add(w);
    for (const w of toks(t.answer)) b.add(w);
  }
  return b;
}

const all = dump.turns.slice(from);
const rows = [];
for (const f of state.folded) {
  const n = f.n;
  const seen = bag(all.slice(0, n));
  const recent = bag(all.slice(Math.max(0, n - 3), n));
  const oldest = bag(all.slice(0, 3));
  const sw = [...new Set(toks(f.summary))];
  const ungrounded = sw.filter((w) => !seen.has(w));
  const inRecent = sw.filter((w) => recent.has(w)).length;
  const inOldest = sw.filter((w) => oldest.has(w) && !recent.has(w)).length;
  rows.push({ n, words: sw.length, ungrounded, nUngrounded: ungrounded.length, inRecent, inOldestOnly: inOldest });
}
console.log(JSON.stringify(rows));
