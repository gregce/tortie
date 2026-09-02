#!/usr/bin/env node
/**
 * probe-p190-agreement.mjs. One app run that proves the inline control says
 * what it can tell apart (Phase 190).
 *
 * ## Why this probe exists, in one paragraph
 *
 * The operator changed the Inline control between Words, Phrases and
 * Characters on his own file and nothing happened, which read as broken.
 * Research 74 measured why: his edit was a pure word deletion, and on that
 * shape all three jsdiff functions return the same parts, so the three modes
 * draw byte identical markup. Phase 190 draws one short line beside the
 * control when the chosen mode draws what another mode would draw, and
 * nothing when the modes differ. A line that is computed from the parts and
 * never checked against the pixels is a promise, so this probe reads the
 * DRAWN markup in every mode over five diffs and reads the line off the DOM
 * beside it, and the same run measures what the comparison costs.
 *
 * ## WHAT IT PROVES, and every cell is read off the running app
 *
 *   #   what must be true                                          read from
 *   --  --------------------------------------------------------   ----------
 *    0  the drive answered with a reading                           the drive
 *    1  his deletion: Words, Phrases and Characters draw the SAME    shadow DOM
 *       BYTES, one span each, and Off draws none
 *    2  and the row says so under each of the three, and not         document
 *       under Off
 *    3  the replacement: the three modes draw three different         shadow DOM
 *       markups
 *    4  and the row says nothing in any mode                          document
 *    5  both shapes in one diff: the answer is per diff, so the       document
 *       modes differ and the row says nothing
 *    6  a pure addition: no mode draws a span and the row says         both
 *       every mode is the same, Off included
 *    7  every click was honoured on every fixture                     document
 *    8  the hostile hundred pair diff hits the cap, says nothing,      the drive
 *       and its cost is read in the running app
 *    9  a real code diff exits early and costs under a millisecond     the drive
 *   10  the row is still one control high with the line up, fits,     rectangles
 *       and the line is muted at the label's own size and colour
 *   11  the parts jsdiff returns in plain node predict what the app    node
 *       drew, on both shapes
 *   12  the operator's session count did not move                     tmux, read only
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ends afterwards, never `gmux` or `default`. The app gets its own user
 * data directory and its own scratch project under the harness directory. It
 * spawns no agent and spends no token. `-L gmux` appears in exactly one place,
 * a read only session count taken before and after, which must match. The
 * Electron goes through build/electron-run.mjs, which ends the tree it started
 * in a finally block.
 *
 * Usage, from the repository root:
 *
 *   npm run probe:p190
 *
 * Exit code 0 when every row passes, 1 otherwise with every failing row
 * named, 2 when the probe refuses to run.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffChars, diffWordsWithSpace } from 'diff';

import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p190agreement]';

function say(line) {
  console.log(`${TAG} ${line}`);
}
function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET, so this run wraps itself in the harness script');
  const wrapped = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      '--fresh',
      'gmux-p190-agree',
      'node build/probe-p190-agreement.mjs'
    ],
    { cwd: repoRoot, stdio: 'inherit' }
  );
  process.exit(wrapped.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/** The operator's live server, listed and never written. The ONLY place this file names it. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((line) => line.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p190-agreement');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');

// ---------------------------------------------------------------------------
// The fixtures. Each is a pair, HEAD then the working tree.
// ---------------------------------------------------------------------------

/** His test file, byte for byte the shape research 74 measured. */
const DELETION = {
  rel: 'deletion.txt',
  head: 'The quick brown fox\nJumped over the fence\n',
  work: 'The quick fox\nJumped over the fence\n'
};

/** Eight lines of his prose commit, five of them replaced by phrases. */
const REPLACEMENT = {
  rel: 'replacement.txt',
  head: [
    'In a small town where every hour seemed to linger,',
    'John Berryman kept a narrow shop between the bakery',
    'and a hardware store with a sun-faded red awning.',
    'His window held a regiment of old clocks,',
    'Each morning, John turned the sign from CLOSED to OPEN,',
    'tied on a gray apron,',
    'that would shape the day ahead.',
    'the nervous rattle of a loose wheel,',
    ''
  ].join('\n'),
  work: [
    'In a small town where every hour moved unhurriedly,',
    'John Berryman kept a narrow shop between the bakery',
    'and a hardware store beneath a weathered green awning.',
    'His window held a regiment of old clocks,',
    'Each morning, John flipped the sign from CLOSED to OPEN,',
    'tied on a gray apron,',
    'that would set the tempo of the day ahead.',
    'the nervous rattle of a slipping wheel,',
    ''
  ].join('\n')
};

const FILLER = Array.from({ length: 10 }, (_, i) => `unchanged line ${String(i + 1)}`);

/** The deletion, then ten unchanged lines, then the replacement: one diff. */
const BOTH = {
  rel: 'both.txt',
  head: `${DELETION.head}${FILLER.join('\n')}\n${REPLACEMENT.head}`,
  work: `${DELETION.work}${FILLER.join('\n')}\n${REPLACEMENT.work}`
};

/** Two lines added and nothing paired with them. */
const ADDED = {
  rel: 'added.txt',
  head: 'one\ntwo\n',
  work: 'one\nnew a\nnew b\ntwo\n'
};

/**
 * The hostile shape: 120 lines of unique letter runs, each just under
 * Pierre's thousand character limit, with the LAST token deleted under a
 * letter that appears nowhere else on the line. Every pair agrees in every
 * mode, so the early exit never fires and the cap is what ends the walk.
 */
function agreeingLines(count, width) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const oldLines = [];
  const newLines = [];
  for (let i = 0; i < count; i++) {
    const deleted = letters[i % 26];
    const tokens = [];
    let length = 0;
    let k = 0;
    while (length < width) {
      const letter = letters[(i + 1 + k) % 26];
      k += 1;
      if (letter === deleted) continue;
      const token = letter.repeat(2 + (k % 8));
      tokens.push(token);
      length += token.length + 1;
    }
    const base = tokens.join(' ');
    oldLines.push(`${base} ${deleted.repeat(6)}`);
    newLines.push(base);
  }
  return [`${oldLines.join('\n')}\n`, `${newLines.join('\n')}\n`];
}
const [largeHead, largeWork] = agreeingLines(120, 960);
const LARGE = { rel: 'large.txt', head: largeHead, work: largeWork };

/** A real code diff, this repository's PierreDiff.tsx either side of d3ee863. */
function gitShow(rev) {
  const out = spawnSync('git', ['show', `${rev}:src/renderer/editor/PierreDiff.tsx`], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024
  });
  if ((out.stdout ?? '') === '') refuse(`git show ${rev} produced nothing`);
  return out.stdout;
}
const CODE = {
  rel: 'PierreDiff.tsx',
  head: gitShow('d3ee86352450c4f874f06ccdfba34190ebfb89f5^'),
  work: gitShow('d3ee86352450c4f874f06ccdfba34190ebfb89f5')
};

const FIXTURES = [DELETION, REPLACEMENT, BOTH, ADDED];
const COSTS = [LARGE, CODE];

for (const f of [...FIXTURES, ...COSTS]) writeFileSync(join(project, f.rel), f.head);
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  ['-c', 'user.email=p190@example.invalid', '-c', 'user.name=p190 probe', 'commit', '-q', '-m', 'p190 fixtures']
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}
for (const f of [...FIXTURES, ...COSTS]) writeFileSync(join(project, f.rel), f.work);

// ---------------------------------------------------------------------------
// The independent method: the parts jsdiff returns in plain node, over the
// first paired line of the deletion and of the replacement. Words and
// Characters are predicted the same when the two functions agree part for
// part, and the app's markup hashes are held to that prediction below.
// ---------------------------------------------------------------------------
function firstPair(f) {
  const a = f.head.split('\n');
  const b = f.work.split('\n');
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return [a[i], b[i]];
  }
  return ['', ''];
}
function partsOf(f) {
  const [oldLine, newLine] = firstPair(f);
  const words = diffWordsWithSpace(oldLine, newLine).map((p) => [p.added ? '+' : p.removed ? '-' : ' ', p.value]);
  const chars = diffChars(oldLine, newLine).map((p) => [p.added ? '+' : p.removed ? '-' : ' ', p.value]);
  return { words, chars, same: JSON.stringify(words) === JSON.stringify(chars) };
}
const predicted = { deletion: partsOf(DELETION), replacement: partsOf(REPLACEMENT) };

// ---------------------------------------------------------------------------
// The one app run.
// ---------------------------------------------------------------------------
let reading = null;
let text = '';
await withElectron(
  {
    label: 'p190-agreement',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    env: {
      GMUX_SHOT: join(scratch, 'p190-agreement.png'),
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '1500',
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        editorWidth: 1200,
        inlineAgreement: {
          rels: FIXTURES.map((f) => f.rel),
          costRels: COSTS.map((f) => f.rel)
        }
      }),
      GMUX_SHOT_JS: 'window.__gmuxP190Agreement'
    }
  },
  async (handle) => {
    say(`launched the app, pid ${String(handle.pid)}`);
    const code = await new Promise((r) => {
      const ceiling = setTimeout(() => {
        console.error(`${TAG} the run passed its ceiling; the teardown ends it.`);
        r(1);
      }, 300_000);
      void handle.exited.then((c) => {
        clearTimeout(ceiling);
        r(c);
      });
    });
    text = handle.text();
    say(`the app exited with ${String(code)}`);
    const marker = '[gmux-shot] probe ';
    const at = text.lastIndexOf(marker);
    if (at !== -1) {
      const line = text.slice(at + marker.length).split('\n')[0] ?? '';
      try {
        reading = JSON.parse(line);
      } catch {
        reading = null;
      }
    }
  }
);

const failures = [];
const results = [];
function check(step, claim, pass, detail) {
  results.push({ step, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(step)}. ${claim}. ${detail}`);
}

const ALL_THREE = 'Words, Phrases and Characters draw this change the same.';
const EVERY = 'Every mode draws this change the same.';
const LABELS = ['Off', 'Words', 'Phrases', 'Characters'];

/** One row of the span table, for the report. */
function tableRows(rel, fx) {
  return LABELS.map((label) => {
    const m = fx?.modes?.[label] ?? {};
    return `${rel.padEnd(16)} ${label.padEnd(10)} spans ${String(m.spans).padStart(3)}  chars ${String(m.chars).padStart(4)}  markup ${String(m.markup?.hash)} ${String(m.markup?.bytes).padStart(6)}b  settled ${String(m.settled).padEnd(5)}  line ${m.note === null ? '(none)' : JSON.stringify(m.note)}`;
  });
}

if (reading === null || typeof reading !== 'object') {
  failures.push('0. the drive printed no reading, so nothing was measured.');
  console.error(text.split('\n').slice(-40).join('\n'));
} else {
  const fixtures = reading.fixtures ?? {};
  const costs = reading.costs ?? {};
  const del = fixtures[DELETION.rel] ?? {};
  const rep = fixtures[REPLACEMENT.rel] ?? {};
  const both = fixtures[BOTH.rel] ?? {};
  const add = fixtures[ADDED.rel] ?? {};
  const m = (fx, label) => fx?.modes?.[label] ?? {};
  const hashes = (fx) => LABELS.map((l) => m(fx, l).markup?.hash ?? null);

  say('the span table, every cell read off the running app:');
  for (const f of FIXTURES) for (const row of tableRows(f.rel, fixtures[f.rel])) say(`  ${row}`);
  say('the comparison, once per diff, read off the running app:');
  for (const [rel, fx] of [...Object.entries(fixtures), ...Object.entries(costs)]) {
    const a = fx?.agreement ?? {};
    say(
      `  ${rel.padEnd(16)} pairs ${String(a.pairs).padStart(3)}  compared ${String(a.compared).padStart(3)}  skipped ${String(a.skipped)}  capped ${String(a.capped).padEnd(5)}  words=phrases ${String(a.wordPhrase).padEnd(5)} words=chars ${String(a.wordChar).padEnd(5)} phrases=chars ${String(a.phraseChar).padEnd(5)}  cost ${typeof a.costMs === 'number' ? a.costMs.toFixed(3) : '?'} ms  open ${typeof fx?.openMs === 'number' ? fx.openMs.toFixed(0) : '?'} ms`
    );
  }
  say(`the whole drive took ${typeof reading.driveMs === 'number' ? (reading.driveMs / 1000).toFixed(1) : '?'} s of the 60 s the harness allows`);
  say(`photograph: ${join(scratch, 'p190-agreement.png')}`);

  check(0, 'the drive answered with a reading', Object.keys(fixtures).length === FIXTURES.length, `${String(Object.keys(fixtures).length)} fixtures read`);

  {
    const [off, w, p, c] = hashes(del);
    check(
      1,
      'his deletion: Words, Phrases and Characters draw the same bytes, one span each, Off none',
      m(del, 'Off').spans === 0 &&
        m(del, 'Words').spans === 1 &&
        m(del, 'Phrases').spans === 1 &&
        m(del, 'Characters').spans === 1 &&
        w === p &&
        p === c &&
        off !== w &&
        typeof w === 'string',
      `hashes Off ${String(off)} Words ${String(w)} Phrases ${String(p)} Characters ${String(c)}; spans ${LABELS.map((l) => String(m(del, l).spans)).join('/')}`
    );
    check(
      2,
      'and the row says so under each of the three, and not under Off',
      m(del, 'Off').note === null &&
        [m(del, 'Words').note, m(del, 'Phrases').note, m(del, 'Characters').note].every((n) => n === ALL_THREE),
      `Off ${JSON.stringify(m(del, 'Off').note)}, Words ${JSON.stringify(m(del, 'Words').note)}`
    );
  }
  {
    const [, w, p, c] = hashes(rep);
    const spans = [m(rep, 'Words').spans, m(rep, 'Phrases').spans, m(rep, 'Characters').spans];
    check(
      3,
      'the replacement: the three modes draw three different markups',
      new Set([w, p, c]).size === 3 && spans.every((n) => typeof n === 'number' && n > 0) && new Set(spans).size === 3,
      `hashes ${String(w)} ${String(p)} ${String(c)}; spans ${spans.join('/')}`
    );
    check(
      4,
      'and the row says nothing in any mode',
      LABELS.every((l) => m(rep, l).note === null),
      LABELS.map((l) => JSON.stringify(m(rep, l).note)).join(' ')
    );
  }
  {
    const [, w, , c] = hashes(both);
    check(
      5,
      'both shapes in one diff: per diff, the modes differ and the row says nothing',
      w !== c && LABELS.every((l) => m(both, l).note === null) && m(both, 'Characters').spans > m(both, 'Words').spans,
      `Words ${String(m(both, 'Words').spans)} spans, Characters ${String(m(both, 'Characters').spans)}; notes ${LABELS.map((l) => JSON.stringify(m(both, l).note)).join(' ')}`
    );
  }
  check(
    6,
    'a pure addition: no span in any mode, and the row says every mode is the same, Off included',
    LABELS.every((l) => m(add, l).spans === 0 && m(add, l).note === EVERY) && add.agreement?.pairs === 0,
    `spans ${LABELS.map((l) => String(m(add, l).spans)).join('/')}, notes ${LABELS.map((l) => JSON.stringify(m(add, l).note)).join(' ')}`
  );
  check(
    7,
    'every click was honoured on every fixture',
    FIXTURES.every((f) => f.rel in fixtures && fixtures[f.rel].opened === true && LABELS.every((l) => m(fixtures[f.rel], l).clicked === true && m(fixtures[f.rel], l).pressed === 'true')),
    FIXTURES.map((f) => `${f.rel}:${String(fixtures[f.rel]?.opened)}/${LABELS.map((l) => String(m(fixtures[f.rel], l).pressed)).join(',')}`).join(' ')
  );
  {
    const large = costs[LARGE.rel] ?? {};
    const a = large.agreement ?? {};
    check(
      8,
      'the hostile hundred pair diff hits the cap, says nothing, and its cost is read in the app',
      large.opened === true && a.capped === true && a.compared === 100 && large.note === null && typeof a.costMs === 'number',
      `compared ${String(a.compared)}, capped ${String(a.capped)}, skipped ${String(a.skipped)}, cost ${typeof a.costMs === 'number' ? a.costMs.toFixed(2) : 'none'} ms, line ${JSON.stringify(large.note)}`
    );
    const code = costs[CODE.rel] ?? {};
    const b = code.agreement ?? {};
    check(
      9,
      'a real code diff exits early and costs under a millisecond',
      code.opened === true && b.compared < 5 && b.capped === false && typeof b.costMs === 'number' && b.costMs < 1 && code.note === null,
      `compared ${String(b.compared)} of ${String(b.pairs)} pairs seen, cost ${typeof b.costMs === 'number' ? b.costMs.toFixed(3) : 'none'} ms, line ${JSON.stringify(code.note)}`
    );
  }
  {
    const box = del.noteBox ?? null;
    check(
      10,
      'the row is one control high with the line up, fits, and the line is muted at the label size and colour',
      del.barHeight === 30 && del.barFits === true && box !== null && box.truncated === false && box.color === del.labelColor && box.fontSize === '11px',
      `bar ${String(del.barHeight)}px fits ${String(del.barFits)}; line ${box === null ? 'absent' : `${String(box.width)}px truncated ${String(box.truncated)} ${String(box.color)} ${String(box.fontSize)}`} vs label ${String(del.labelColor)}`
    );
  }
  {
    const [, w, , c] = hashes(del);
    const [, rw, , rc] = hashes(rep);
    check(
      11,
      'the parts jsdiff returns in plain node predict what the app drew, on both shapes',
      predicted.deletion.same === true && w === c && predicted.replacement.same === false && rw !== rc,
      `deletion parts words ${JSON.stringify(predicted.deletion.words)} chars ${JSON.stringify(predicted.deletion.chars)} same ${String(predicted.deletion.same)}; replacement same ${String(predicted.replacement.same)} (${String(predicted.replacement.words.length)} word parts, ${String(predicted.replacement.chars.length)} char parts)`
    );
  }
}

const operatorAfter = operatorSessionCount();
check(12, 'the operator session count did not move', operatorAfter === operatorBefore, `${String(operatorBefore)} before, ${String(operatorAfter)} after`);

for (const row of results) say(`${String(row.step).padStart(2)}  ${row.verdict.padEnd(4)}  ${row.claim}  (${row.detail})`);
if (failures.length > 0) {
  console.error(`${TAG} ${String(failures.length)} row(s) failed:`);
  for (const f of failures) console.error(`${TAG}   ${f}`);
  process.exit(1);
}
say('every row passed.');
process.exit(0);
