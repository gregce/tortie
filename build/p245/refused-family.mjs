#!/usr/bin/env node
/**
 * PHASE 245, MEASUREMENT 4. WHAT THE KIND TABLE CANNOT SEE, AND THE RATES PER
 * AGENT.
 *
 * Research 107 section 7 prints a kind table whose three rows — dir, file,
 * symlink — sum to exactly the offer count, which reads as a partition of
 * everything `lstat` can answer. IT IS NOT ONE. `checkedLstat` in
 * `corpus-scan.mjs` carries a REFUSAL LIST (`/dev/`, `/Volumes/`, `/net/`,
 * `/proc`, any `..`) and turns those spans away BEFORE `lstat` is called, so a
 * device node can never appear in that table. The list is a safety rule for a
 * measurement running over the operator's own machine. THE RECOMMENDED POLICY
 * CARRIES NO SUCH LIST, so a build round reading that table would be reading a
 * set the shipping rule does not produce.
 *
 * This script counts the family the list hides, and it counts it WITHOUT ANY
 * FILESYSTEM CALL AT ALL — a `/dev/` token is counted by its spelling and is
 * never `lstat`ed, never opened and never followed. It also prints the
 * per-agent offer rate, which research 107 section 3.6 publishes and which the
 * hand adjudication (drawn corpus-wide) could not give.
 *
 * SAFETY, the same contract the other three scripts keep. It LISTS and CAPTURES
 * the operator's sessions and does nothing else: never attaches, never sends a
 * key, never kills one, never starts an agent, spends no token. NO PATH READ OUT
 * OF A TRANSCRIPT IS EVER OPENED, EXECUTED OR WRITTEN TO. It prints counts and
 * rates and NEVER a path — the refused family is printed by its first two
 * segments only (`/dev/null`, `/dev/disk3s5`), which name a device node and
 * cannot carry anything private.
 *
 *   node build/p245/refused-family.mjs
 *   node build/p245/refused-family.mjs --self-test
 */

import { execFileSync } from 'node:child_process';
import { conservative, looksPathB, normalise, tokenizeB } from './corpus-scan.mjs';

const TAG = '[p245]';
const say = (l) => console.log(`${TAG} ${l}`);

/** Exactly the prefixes `checkedLstat`'s REFUSE list turns away, by spelling. */
export const REFUSED_PREFIX = /^\/(dev|Volumes|net|proc)(\/|$)/;

/** The first two segments of an absolute path, which is all this script prints. */
export function familyOf(path) {
  return path.split('/').slice(0, 3).join('/');
}

const FIXTURES = [
  ['refused', () => REFUSED_PREFIX.test('/dev/null'), true, 'a character device'],
  ['refused', () => REFUSED_PREFIX.test('/Volumes/Data/x'), true, 'a mounted volume'],
  ['refused', () => REFUSED_PREFIX.test('/developer/src'), false, 'a name that merely starts with dev'],
  ['refused', () => REFUSED_PREFIX.test('/Users/gdc/gmux'), false, 'an ordinary path'],
  ['family', () => familyOf('/dev/null'), '/dev/null', 'two segments is the whole family name'],
  ['family', () => familyOf('/dev/fd/3'), '/dev/fd', 'a third segment is dropped, so nothing private can print']
];

function selfTest() {
  let bad = 0;
  for (const [group, run, want, why] of FIXTURES) {
    let got;
    try { got = run(); } catch (err) { got = `threw: ${err.message}`; }
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${TAG} ${ok ? 'OK  ' : 'FAIL'} ${group}: ${String(got)} — ${why}`);
  }
  console.log(`${TAG} ${bad === 0 ? 'every fixture behaved' : `${String(bad)} fixtures did not`}`);
  return bad === 0 ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

const tmux = (...a) =>
  execFileSync('tmux', ['-L', 'gmux', ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let sessions;
try {
  sessions = tmux('list-sessions', '-F', '#{session_id}').trim().split('\n').filter(Boolean);
} catch {
  console.error(`${TAG} no sessions on -L gmux. Nothing to measure.`);
  process.exit(2);
}

const per = new Map();
const refused = new Map();

for (const sid of sessions) {
  let agent = '';
  try {
    agent = tmux('show-options', '-t', sid).split('\n')
      .find((l) => l.startsWith('@gmux-agent '))?.slice(12).trim() ?? '';
  } catch { agent = ''; }
  if (agent === '') continue;                        // not ours: never adopt it
  let text = '';
  try { text = tmux('capture-pane', '-p', '-S', '-', '-t', sid); } catch { continue; }
  const rows = text.split('\n').map((r) => r.replace(/\s+$/, ''));

  const p = per.get(agent) ?? { sessions: 0, rows: 0, shaped: 0, offered: 0, refused: 0 };
  p.sessions++; p.rows += rows.length; per.set(agent, p);

  for (const row of rows) {
    for (const t of tokenizeB(row)) {
      if (!looksPathB(t.text)) continue;
      p.shaped++;
      const { path } = normalise(t.text);
      if (REFUSED_PREFIX.test(path)) {
        // Counted by SPELLING. No lstat, no open, nothing followed.
        const fam = familyOf(path);
        refused.set(fam, (refused.get(fam) ?? 0) + 1);
        p.refused++;
        continue;
      }
      if (conservative(t.text) !== null) p.offered++;
    }
  }
}

const sum = (k) => [...per.values()].reduce((n, v) => n + v[k], 0);
console.log('');
say(`corpus: ${String(sum('sessions'))} sessions, ${String(sum('rows'))} physical rows`);
console.log('');
console.log(['agent', 'sessions', 'rows', 'path-shaped', 'offered', 'offer rate'].join('\t'));
for (const [agent, v] of [...per.entries()].sort()) {
  console.log([agent, v.sessions, v.rows, v.shaped, v.offered,
    `${((100 * v.offered) / v.shaped).toFixed(1)}%`].join('\t'));
}
console.log('');
say('THE FAMILY THE MEASUREMENT REFUSAL LIST HIDES FROM SECTION 7\'S KIND TABLE');
say('  (counted by spelling; not one of these was lstat-ed, opened or followed)');
for (const [fam, n] of [...refused.entries()].sort((a, b) => b[1] - a[1])) {
  say(`  ${fam}: ${String(n)}`);
}
say(`  total: ${String(sum('refused'))}`);
console.log('');
say('version one refuses every one of them TWICE: clause 3 (outside every project root)');
say('and clause 4 (prepare.ts answers `missing` for anything that is not a regular file).');
