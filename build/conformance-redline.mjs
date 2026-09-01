#!/usr/bin/env node
/**
 * `npm run conformance:redline`, the cheap gate on the redline (Phase 191).
 *
 * About 3 seconds. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, makes no request and reads nothing under the
 * person's home. Every number it prints came from the SHIPPING module, run
 * under node by build/redline-conformance-probe.mts.
 *
 * ## Why a gate rather than a unit test
 *
 * Four of the things this phase decided are one line away from being undone by
 * a later round that means well, and none of them is visible in a screenshot:
 *
 *   - THE ANCHOR. @pierre/diffs keys its annotation maps by the FILE line
 *     number, and the index into `additionLines` is equal to it only when the
 *     diff was parsed from whole files. The coarse path parses a PATCH, where
 *     it is not. The rule 4 fixture is a patch whose hunk starts at line 40, so
 *     the two answers differ by 39 and a regression cannot hide.
 *   - THE CAPS. `renderDiffChildren.js` maps over `lineAnnotations`
 *     unconditionally, so every annotation's React subtree mounts whether or
 *     not it is on screen. Rule 5 drives the worst case the caps allow and
 *     fails if it costs more than the ceiling, which is what makes
 *     `REDLINE_MAX_EDIT_LENGTH` a measurement rather than a guess.
 *   - NO REDLINE IN THE DIFF, NO COLOUR LITERAL, NO WRITE PATH. Three
 *     refusals, each of which is a scan over the real source (rules 7, 8 and
 *     9), and each scanner is proved on fixtures this file writes itself so a
 *     scan that cannot fail is not mistaken for a scan that passed. The first
 *     was "no redline in two columns" while Phase 191's toggle lived in the
 *     diff bar; Phase 194 took the toggle out at the operator's word, so the
 *     rule now pins the removal rather than the guard the removal made moot.
 *
 * ## The rules
 *
 *   1. The prose allowlist answers yes to the markdown set plus txt and text,
 *      and no to everything else including .rst, .adoc and .org.
 *   2. Every pair round-trips: the runs with the deletions dropped rebuild the
 *      new text byte for byte, and with the insertions dropped they rebuild
 *      the old text. This is what makes the copy handler's answer correct, and
 *      it holds over emoji with a zero width joiner, combining marks, a right
 *      to left run and Japanese.
 *   3. INDEPENDENTLY RE-DERIVED. A hand written word level LCS in this file,
 *      deliberately not jsdiff, produces its own removed and added word
 *      sequences and they must equal the module's. The Japanese pair is
 *      excluded and the exclusion is printed, because a whitespace tokenizer
 *      cannot segment Japanese, which is the reason the module passes an
 *      Intl.Segmenter at all.
 *   4. THE ANCHORS, re-derived the same way: a line level LCS over the whole
 *      file fixture, grouped into blocks, and each block's LAST added line is
 *      the number the module must have anchored on. Plus the patch fixture,
 *      where an index and a line number differ by 39.
 *   5. The caps fire, all three, and the worst case they allow is under the
 *      ceiling.
 *   6. Nothing skipped means NO note, so a clean file grows no banner.
 *   7. The redline is never drawn in the diff. The diff surface and its
 *      control row name none of the redline modules, mount no annotation and
 *      read no redline preference, so the diff draws only what Pierre draws
 *      and the redline has exactly one home, which is its own view.
 *   8. No colour literal in the row's own component or stylesheet.
 *   9. No write path anywhere in the redline files. Accepting a change means
 *      writing a file and this phase refuses it by name.
 *  10. The gate is named in package.json and in build/verification-checks.mjs,
 *      because a gate nothing names is how a gate decays.
 *  11. A WHITESPACE ONLY CHANGE IS FLAGGED. Two sides that hold the same words
 *      and differ only in spacing are made identical by the normalisation, so
 *      the marked-up line cannot draw the change. The block carries
 *      `whitespaceOnly`, its runs are the one unchanged sentence, and no other
 *      block in the same file carries the flag.
 *  12. THE ACCOUNTING. Every change block in a file either draws a row or is
 *      counted in the skip note. Nothing is silently dropped, over five
 *      fixtures including the two caps and the patch path.
 *  13. THE PERSON'S PASTEBOARD IS PUT BACK IN A `finally`. The harness writes
 *      it with the window's own Copy command, and everything after that used
 *      to sit in one `try` whose `catch` only logs, so a throw in the probe
 *      expression, in `capturePage` or in the PNG write left the copied diff
 *      text on his pasteboard. Read by matching braces rather than by
 *      searching for the word, and the scanner is proved on four fixtures this
 *      file writes itself, one of which hides the word `finally` in a comment.
 *      `clipboard.clear()` is checked too: it may be reached only from inside
 *      the restore, because clearing empties every flavour and restoring "no
 *      text" is not the same as emptying the pasteboard.
 *  14. THE RUNS ARE NEVER REORDERED INTO PAIRS. jsdiff's shortest edit script
 *      puts the insertion BEFORE the deletion on the three-into-one pair and
 *      leaves them non-adjacent, which is honest output. A later round that
 *      "tidies" the runs into deletion-then-insertion would be drawing a diff
 *      nobody computed, so the order of that pair is pinned here.
 *  15. THE DOCUMENT (Phase 194). The redline view composes the WHOLE file
 *      from the two versions, and its one correctness claim is re-derived
 *      here by plain joins over the runs the shipping module printed: with
 *      every insertion dropped they are the old file byte for byte, with
 *      every deletion dropped the new file, over seventeen whole file
 *      fixtures including an unchanged file, two empty files, a final
 *      newline gained and lost, CRLF, unicode, and every cap firing, and the
 *      block a cap refuses draws WHOLE rather than leaving a hole. A seeded
 *      fuzz of 3,000 pairs reports the same two counts at zero, and the
 *      repair's own refusal count at zero, because the module's fallback
 *      would still satisfy the projections and only the count says whether
 *      the repair actually ran.
 *  16. A CHANGE TO THE LAST WORD OF A LINE STAYS ON ITS LINE. jsdiff attaches
 *      a word's trailing whitespace to its token, so "Monday" becoming
 *      "Friday" at the end of a line arrived as del "Monday\n" then ins
 *      "Friday\n", the deletion carried the line break, and the insertion
 *      landed on the NEXT line under it, which is the opposite of the charter
 *      sentence and which both projections were blind to. Over every document
 *      fixture and the fuzz, no adjacent deletion and insertion, in either
 *      order, shares a whitespace character at its start or its end, and the
 *      six last word fixtures pin the exact runs: the word struck, the word
 *      inserted, and the line break in the plain run after them.
 *
 * Exit 0 when every rule passes, 1 otherwise with each failure named.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:redline]';
const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => console.log(`${TAG} ${line}`);

/** Milliseconds the worst case the caps allow may cost. */
const WORST_CASE_CEILING_MS = 400;

const REDLINE_FILES = [
  'src/renderer/editor/redline.ts',
  'src/renderer/editor/redline-copy.ts',
  'src/renderer/editor/RedlineRow.tsx',
  'src/renderer/editor/redline.css',
  // Phase 194: the view and the document it draws. Same refusals.
  'src/renderer/editor/redline-document.ts',
  'src/renderer/editor/RedlineDocument.tsx'
];

// ---------------------------------------------------------------------------
// The independent implementations. Hand written on purpose: a re-derivation
// that calls the same library proves only that the library is deterministic.
// ---------------------------------------------------------------------------

/** Longest common subsequence of two arrays, as a list of [i, j] pairs. */
function lcsPairs(a, b) {
  const n = a.length;
  const m = b.length;
  const table = [];
  for (let i = 0; i <= n; i++) table.push(new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

/** What was removed and what was added, as two sequences. */
function removedAndAdded(a, b) {
  const pairs = lcsPairs(a, b);
  const keptA = new Set(pairs.map((p) => p[0]));
  const keptB = new Set(pairs.map((p) => p[1]));
  return {
    removed: a.filter((_, i) => !keptA.has(i)),
    added: b.filter((_, i) => !keptB.has(i))
  };
}

/**
 * Words for the comparison, being whitespace runs with ASCII sentence
 * punctuation trimmed off the ends. It keeps emoji, combining marks and
 * non-Latin script, which are exactly what rule 2 is about.
 */
const PUNCT = /^[.,;:!?"'`()[\]{}]+|[.,;:!?"'`()[\]{}]+$/g;
function compareWords(text) {
  return text
    .split(/\s+/)
    .map((w) => w.replace(PUNCT, ''))
    .filter((w) => w !== '');
}

// ---------------------------------------------------------------------------
// The scanners, each written so it CAN fail, and each proved below on
// fixtures this file writes.
// ---------------------------------------------------------------------------

/** Every colour literal a stylesheet or a component might carry. */
const COLOUR_LITERAL =
  /(#[0-9a-fA-F]{3,8}\b)|\b(rgba?|hsla?|color-mix|oklch|lab)\s*\(|:\s*(red|green|blue|black|white|orange|yellow|purple|pink|gray|grey)\s*[;}]/;

function findColourLiterals(source) {
  const found = [];
  for (const [index, line] of source.split('\n').entries()) {
    const bare = line.replace(/\/\*[\s\S]*?\*\//g, '');
    if (bare.trimStart().startsWith('*') || bare.trimStart().startsWith('//')) {
      continue;
    }
    const hit = COLOUR_LITERAL.exec(bare);
    if (hit !== null) found.push(`${String(index + 1)}: ${line.trim()}`);
  }
  return found;
}

/**
 * Anything that would put the redline back in the diff: an import of one of
 * its modules, Pierre's annotation slot, or the preference Phase 191 kept.
 * Comment lines are skipped, because the surface is allowed to SAY where the
 * redline went.
 */
const MOUNT_WORDS =
  /from\s+['"]\.\/(?:redline|RedlineRow|redline-copy)['"]|\b(?:lineAnnotations|renderAnnotation|diffRedline|setDiffRedline)\b/;

function findRedlineMounts(source) {
  const found = [];
  for (const [index, line] of source.split('\n').entries()) {
    const bare = line.replace(/\/\*[\s\S]*?\*\//g, '');
    if (bare.trimStart().startsWith('*') || bare.trimStart().startsWith('//')) {
      continue;
    }
    if (MOUNT_WORDS.test(bare)) found.push(`${String(index + 1)}: ${line.trim()}`);
  }
  return found;
}

/** Anything that could write a file, which this phase refuses outright. */
const WRITE_WORDS =
  /\b(gmuxBridge|writeFile|writeFileSync|acceptChange|rejectChange|applyChange)\b|['"`]fs:[a-zA-Z]/;

function findWritePaths(source) {
  const found = [];
  for (const [index, line] of source.split('\n').entries()) {
    const bare = line.replace(/\/\*[\s\S]*?\*\//g, '');
    if (bare.trimStart().startsWith('*') || bare.trimStart().startsWith('//')) {
      continue;
    }
    if (WRITE_WORDS.test(bare)) found.push(`${String(index + 1)}: ${line.trim()}`);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Run the probe.
// ---------------------------------------------------------------------------

const probe = spawnSync(
  process.execPath,
  [
    tsxCli(),
    '--tsconfig',
    'tsconfig.node.json',
    'build/redline-conformance-probe.mts'
  ],
  { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 32 * 1024 * 1024 }
);
if (probe.status !== 0) {
  process.stderr.write(
    `${TAG} the probe did not run:\n${probe.stderr || '(no output)'}\n`
  );
  process.exit(1);
}
let data;
try {
  data = JSON.parse(probe.stdout);
} catch {
  process.stderr.write(`${TAG} the probe did not print JSON:\n${probe.stdout}\n`);
  process.exit(1);
}

// -- rule 1: the prose allowlist --------------------------------------------
for (const row of data.paths.yes) {
  if (row.redline !== true) fail(`1. ${row.path} should get a redline and does not.`);
}
for (const row of data.paths.no) {
  if (row.redline !== false) fail(`1. ${row.path} should get no redline and does.`);
}
say(
  `1. the allowlist says yes to ${String(data.paths.yes.length)} prose names and ` +
    `no to ${String(data.paths.no.length)} others, including .rst, .adoc and .org`
);

// -- rules 2 and 3: round trip, and the independent re-derivation ------------
let compared = 0;
let excluded = 0;
for (const pair of data.pairs) {
  if (pair.runs === null) {
    // Only the pair that is meant to defeat the guard may come back null.
    if (pair.name !== 'rewritten past the guard') {
      fail(`2. "${pair.name}" gave up, and only the rewritten fixture may.`);
    }
    continue;
  }
  if (pair.rebuiltNew !== pair.newText) {
    fail(
      `2. "${pair.name}" does not rebuild its new text: ` +
        `${JSON.stringify(pair.rebuiltNew)} against ${JSON.stringify(pair.newText)}.`
    );
  }
  if (pair.rebuiltOld !== pair.oldText) {
    fail(
      `2. "${pair.name}" does not rebuild its old text: ` +
        `${JSON.stringify(pair.rebuiltOld)} against ${JSON.stringify(pair.oldText)}.`
    );
  }
  if (pair.lcs !== true) {
    excluded += 1;
    if (typeof pair.why !== 'string' || pair.why === '') {
      fail(`3. "${pair.name}" is excluded from the re-derivation and says no reason why.`);
    } else {
      say(`3. excluded from the re-derivation: "${pair.name}", because ${pair.why}`);
    }
    continue;
  }
  const mine = removedAndAdded(
    compareWords(pair.oldText),
    compareWords(pair.newText)
  );
  const theirs = {
    removed: pair.runs
      .filter((r) => r.kind === 'del')
      .flatMap((r) => compareWords(r.text)),
    added: pair.runs
      .filter((r) => r.kind === 'ins')
      .flatMap((r) => compareWords(r.text))
  };
  if (JSON.stringify(mine.removed) !== JSON.stringify(theirs.removed)) {
    fail(
      `3. "${pair.name}" removed words disagree: this file derived ` +
        `${JSON.stringify(mine.removed)}, the module drew ${JSON.stringify(theirs.removed)}.`
    );
  }
  if (JSON.stringify(mine.added) !== JSON.stringify(theirs.added)) {
    fail(
      `3. "${pair.name}" added words disagree: this file derived ` +
        `${JSON.stringify(mine.added)}, the module drew ${JSON.stringify(theirs.added)}.`
    );
  }
  compared += 1;
}
if (compared < 6) {
  fail(`3. only ${String(compared)} pair(s) were re-derived, which is too few to mean anything.`);
}
say(
  `2. ${String(data.pairs.length)} pairs round-trip both sides byte for byte, ` +
    'emoji with a zero width joiner, combining marks, a right to left run and Japanese included'
);
say(
  `3. ${String(compared)} of them re-derived by a hand written LCS in this file and agreed, ` +
    `${String(excluded)} excluded, each with its reason printed above`
);

// -- rule 4: the anchors, re-derived ----------------------------------------
{
  const oldLines = data.wholeFile.oldLines;
  const newLines = data.wholeFile.newLines;
  const pairs = lcsPairs(oldLines, newLines);
  const keptNew = new Set(pairs.map((p) => p[1]));
  const keptOld = new Set(pairs.map((p) => p[0]));
  // Walk the two files together, grouping each run of unmatched lines into one
  // block, and take the last added line of each block as the anchor.
  const expected = [];
  let i = 0;
  let j = 0;
  let p = 0;
  while (i < oldLines.length || j < newLines.length) {
    const nextPair = pairs[p];
    if (nextPair !== undefined && nextPair[0] === i && nextPair[1] === j) {
      i++;
      j++;
      p++;
      continue;
    }
    let lastAdded = -1;
    let sawDeletion = false;
    while (
      (i < oldLines.length && !keptOld.has(i)) ||
      (j < newLines.length && !keptNew.has(j))
    ) {
      if (i < oldLines.length && !keptOld.has(i)) {
        sawDeletion = true;
        i++;
      }
      if (j < newLines.length && !keptNew.has(j)) {
        lastAdded = j;
        j++;
      }
    }
    if (lastAdded >= 0) expected.push({ side: 'additions', lineNumber: lastAdded + 1 });
    else if (sawDeletion) expected.push({ side: 'deletions', lineNumber: i });
  }
  const drawn = data.wholeFile.blocks.map((b) => ({
    side: b.side,
    lineNumber: b.lineNumber
  }));
  if (JSON.stringify(drawn) !== JSON.stringify(expected)) {
    fail(
      `4. the anchors disagree: this file derived ${JSON.stringify(expected)}, ` +
        `the module produced ${JSON.stringify(drawn)}.`
    );
  }
  // The patch fixture: hunk header `+40,5` with one context line before the
  // change, so the file line number is 41 while the index into additionLines
  // is 1. An anchor built from the index would read 2.
  const partial = data.partial.blocks[0];
  if (partial === undefined || partial.lineNumber !== 41) {
    fail(
      '4. the patch fixture anchored at ' +
        `${JSON.stringify(partial?.lineNumber ?? null)} rather than 41, which is what an ` +
        'anchor built from the index into additionLines rather than from the hunk header does.'
    );
  }
  say(
    `4. ${String(drawn.length)} anchors re-derived by a line level LCS and agreed ` +
      `(${JSON.stringify(drawn)}), and the patch fixture anchored at ` +
      `${String(partial?.lineNumber ?? 0)} where an index would read 2`
  );
}

// -- rule 5: the caps -------------------------------------------------------
{
  const rewritten = data.pairs.find((p) => p.name === 'rewritten past the guard');
  if (rewritten === undefined || rewritten.runs !== null) {
    fail('5. a fully rewritten block did not defeat maxEditLength, so the guard is inert.');
  }
  if (data.capped.blocks !== data.caps.maxBlocks || data.capped.skipped.overCap !== 5) {
    fail(
      `5. the block cap did not fire: ${String(data.capped.blocks)} blocks drew and ` +
        `${String(data.capped.skipped.overCap)} were held back.`
    );
  }
  if (data.big.blocks !== 0 || data.big.skipped.tooBig !== 1) {
    fail(
      `5. the character budget did not fire: ${String(data.big.blocks)} blocks drew and ` +
        `${String(data.big.skipped.tooBig)} were held back.`
    );
  }
  if (data.worst.ms > WORST_CASE_CEILING_MS) {
    fail(
      `5. the worst case the caps allow cost ${String(data.worst.ms)}ms against a ceiling of ` +
        `${String(WORST_CASE_CEILING_MS)}ms. Lower REDLINE_MAX_EDIT_LENGTH or ` +
        'REDLINE_MAX_BLOCKS rather than raising the ceiling.'
    );
  }
  say(
    `5. all three caps fired, and the worst case they allow (${String(data.caps.maxBlocks)} blocks ` +
      `of ${String(data.caps.maxBlockChars)} rewritten characters) cost ${String(data.worst.ms)}ms ` +
      `against a ceiling of ${String(WORST_CASE_CEILING_MS)}ms`
  );
}

// -- rule 6: silence when nothing was skipped -------------------------------
if (data.emptyNote !== null || data.wholeFile.note !== null) {
  fail(
    `6. a clean file grew a note: ${JSON.stringify(data.wholeFile.note)} / ` +
      `${JSON.stringify(data.emptyNote)}.`
  );
}
if (typeof data.capped.note !== 'string' || !data.capped.note.includes('60')) {
  fail(`6. a file with skipped blocks said nothing: ${JSON.stringify(data.capped.note)}.`);
}
say('6. nothing skipped means no note, and something skipped says how many and why');

// -- rules 7 to 9: the refusals, scanned over the real source ---------------
const sources = new Map();
for (const file of REDLINE_FILES) {
  sources.set(file, readFileSync(file, 'utf8'));
}
for (const file of [
  'src/renderer/editor/PierreDiff.tsx',
  'src/renderer/editor/DiffControls.tsx'
]) {
  const hits = findRedlineMounts(readFileSync(file, 'utf8'));
  if (hits.length > 0) {
    fail(
      `7. ${file} puts the redline back in the diff, which the operator asked out on 2026-09-01: ${hits.join(' | ')}`
    );
  }
}
say('7. the diff surface and its control row name no redline module, slot or preference, so the diff draws only what Pierre draws');

for (const file of [
  'src/renderer/editor/RedlineRow.tsx',
  'src/renderer/editor/RedlineDocument.tsx',
  'src/renderer/editor/redline.css'
]) {
  const hits = findColourLiterals(sources.get(file) ?? '');
  if (hits.length > 0) {
    fail(`8. ${file} carries a colour literal: ${hits.join(' | ')}`);
  }
}
say('8. the row and the view draw from tokens only, with no colour literal in a component or the stylesheet');

for (const file of REDLINE_FILES) {
  const hits = findWritePaths(sources.get(file) ?? '');
  if (hits.length > 0) {
    fail(`9. ${file} names a write path: ${hits.join(' | ')}`);
  }
}
say('9. no redline file names a bridge, a write or an accept, so nothing here can change a file');

// -- rule 10: the gate is named ---------------------------------------------
{
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  if (pkg.scripts['conformance:redline'] === undefined) {
    fail('10. package.json does not name conformance:redline.');
  }
  const checks = readFileSync('build/verification-checks.mjs', 'utf8');
  if (!checks.includes("'conformance:redline'")) {
    fail('10. build/verification-checks.mjs does not classify conformance:redline.');
  }
  say('10. the gate is named in package.json and classified in build/verification-checks.mjs');
}

// -- rule 11: a whitespace only change is flagged ---------------------------
{
  const blocks = Array.isArray(data.spacing.blocks) ? data.spacing.blocks : [];
  const flagged = blocks.filter((b) => b.whitespaceOnly === true);
  const plain = blocks.filter((b) => b.whitespaceOnly !== true);
  const runsOf = (b) => (b.runs ?? []).map((r) => `${r.kind}:${r.text}`);
  if (flagged.length !== 2) {
    fail(
      `11. the spacing fixture flagged ${String(flagged.length)} block(s) rather than 2: ` +
        JSON.stringify(blocks.map((b) => ({ w: b.whitespaceOnly, runs: runsOf(b) })))
    );
  } else if (
    flagged.some(
      (b) =>
        (b.runs ?? []).length !== 1 ||
        b.runs[0].kind !== 'same' ||
        (b.runs ?? []).some((r) => r.kind !== 'same')
    )
  ) {
    fail(
      `11. a flagged block drew something other than one unchanged run: ` +
        JSON.stringify(flagged.map(runsOf))
    );
  } else if (plain.length !== 1 || !runsOf(plain[0]).some((r) => r.startsWith('del:'))) {
    fail(
      `11. the real change in the spacing fixture was mis-flagged: ` +
        JSON.stringify(plain.map((b) => ({ w: b.whitespaceOnly, runs: runsOf(b) })))
    );
  } else if (data.spacing.note !== null) {
    fail(`11. a flagged block was counted as skipped: ${JSON.stringify(data.spacing.note)}`);
  } else {
    say(
      `11. a whitespace only change is flagged and draws its sentence: ` +
        `${String(flagged.length)} flagged (${JSON.stringify(flagged.map(runsOf))}), ` +
        `${String(plain.length)} not`
    );
  }
}

// -- rule 12: the accounting -----------------------------------------------
{
  const rows = Array.isArray(data.accounting) ? data.accounting : [];
  const bad = rows.filter((row) => {
    const skipped = row.skipped ?? {};
    const total =
      row.drawn + (skipped.tooBig ?? 0) + (skipped.tooDifferent ?? 0) + (skipped.overCap ?? 0);
    return total !== row.changeBlocks;
  });
  if (rows.length < 5) {
    fail(`12. only ${String(rows.length)} fixture(s) reported their accounting.`);
  } else if (bad.length > 0) {
    fail(
      `12. a change block was neither drawn nor counted: ` +
        JSON.stringify(bad)
    );
  } else {
    say(
      `12. every change block is drawn or counted, over ${String(rows.length)} fixtures: ` +
        rows
          .map(
            (row) =>
              `${row.name} ${String(row.drawn)}+${String(
                (row.skipped.tooBig ?? 0) +
                  (row.skipped.tooDifferent ?? 0) +
                  (row.skipped.overCap ?? 0)
              )}=${String(row.changeBlocks)}`
          )
          .join(', ')
    );
  }
}

// -- rule 13: the person's pasteboard is put back in a `finally` ------------
//
// The same shape build/assert-electron-teardown.mjs uses on an Electron kill,
// and for the same reason: a restore on the happy path is a restore that
// worked because nothing threw.
{
  /**
   * The chain of blocks enclosing EVERY call site of `needle`, read by
   * MATCHING BRACES. Strings, template literals and comments are skipped, so
   * neither a brace nor the word `finally` inside one can fool it, and the
   * needle itself is only ever found in code. Every occurrence, not the first:
   * a second call somewhere else is exactly what this has to catch.
   */
  const enclosingBlocks = (source, needle) => {
    const opens = [];
    const sites = [];
    let i = 0;
    while (i < source.length) {
      if (source.startsWith(needle, i)) {
        sites.push(
          opens.map((at) =>
            source.slice(Math.max(0, at - 60), at).replace(/\s+/g, ' ').trim()
          )
        );
        i += needle.length;
        continue;
      }
      const c = source[i];
      if (c === '/' && source[i + 1] === '/') {
        const nl = source.indexOf('\n', i);
        i = nl === -1 ? source.length : nl;
        continue;
      }
      if (c === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2);
        i = end === -1 ? source.length : end + 2;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        i += 1;
        while (i < source.length) {
          if (source[i] === '\\') {
            i += 2;
            continue;
          }
          if (source[i] === c) {
            i += 1;
            break;
          }
          i += 1;
        }
        continue;
      }
      if (c === '{') opens.push(i);
      else if (c === '}') opens.pop();
      i += 1;
    }
    return sites;
  };
  const inFinally = (chain) => chain.some((head) => /\bfinally\s*$/.test(head));
  const inside = (chain, name) => chain.some((head) => head.includes(name));

  // The scanner, proved on fixtures, because a scan that cannot fail proves
  // nothing. The fourth hides the word in a comment on purpose.
  const dir = mkdtempSync(join(tmpdir(), 'redline-finally-'));
  try {
    const FIXTURES = [
      { name: 'in a finally', src: 'try { a(); } finally { restore(); }', want: true },
      { name: 'in the try only', src: 'try { a(); restore(); } catch (e) { log(e); }', want: false },
      {
        name: 'after the try',
        src: 'try { a(); } catch (e) { log(e); }\nrestore();',
        want: false
      },
      {
        name: 'the word in a comment',
        src: 'try {\n  // finally {\n  restore();\n} catch (e) { log(e); }',
        want: false
      }
    ];
    const wrong = [];
    for (const fixture of FIXTURES) {
      const file = join(dir, `${fixture.name.replace(/\s+/g, '-')}.ts`);
      writeFileSync(file, fixture.src);
      const sites = enclosingBlocks(readFileSync(file, 'utf8'), 'restore();');
      const got = sites.length === 1 && sites.every(inFinally);
      if (got !== fixture.want) {
        wrong.push(`${fixture.name}: read ${String(got)} over ${String(sites.length)} site(s)`);
      }
    }
    if (wrong.length > 0) {
      fail(`13. the brace scanner is wrong on its own fixtures: ${wrong.join(' | ')}`);
    } else {
      const shot = readFileSync('src/main/harness/shot.ts', 'utf8');
      const restores = enclosingBlocks(shot, 'restoreClipboard();');
      const clears = enclosingBlocks(shot, 'clipboard.clear();');
      const loose = restores.filter((chain) => !inFinally(chain));
      const strayClears = clears.filter((chain) => !inside(chain, 'restoreClipboard'));
      if (restores.length === 0) {
        fail('13. src/main/harness/shot.ts no longer calls restoreClipboard().');
      } else if (loose.length > 0) {
        fail(
          '13. the clipboard restore in src/main/harness/shot.ts is not inside a `finally`, so a ' +
            'throw after the copy leaves the copied text on the person’s own pasteboard. ' +
            `Enclosing blocks: ${JSON.stringify(loose)}`
        );
      } else if (strayClears.length > 0) {
        fail(
          '13. clipboard.clear() is reached from outside the restore in ' +
            `src/main/harness/shot.ts: ${JSON.stringify(strayClears)}`
        );
      } else {
        say(
          `13. the pasteboard is put back in a finally at ${String(restores.length)} call site(s) ` +
            `(${String(FIXTURES.length)} scanner fixtures behaved), and the ` +
            `${String(clears.length)} clipboard.clear() call site(s) are all inside the restore`
        );
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// -- rule 14: the runs are never reordered into pairs -----------------------
{
  const pair = (data.pairs ?? []).find(
    (one) => one.name === 'insertion before its deletion'
  );
  const kinds = ((pair ?? {}).runs ?? []).map((run) => run.kind).join(',');
  const WANT = 'same,ins,same,del,same';
  if (kinds !== WANT) {
    fail(
      `14. the order fixture came out ${JSON.stringify(kinds)} rather than ` +
        `${JSON.stringify(WANT)}. If jsdiff itself changed, re-measure and move the ` +
        'expectation; if this module now reorders the runs, it is drawing a diff nobody ' +
        'computed and the comment in redline.ts ruling 6 is false again.'
    );
  } else {
    // The pair is excluded from rule 3 because the LCS has a tie, so the
    // independent comparison happens here instead, as multisets rather than
    // sequences: the two implementations keep a different one of three
    // identical tokens and remove the same eight words.
    const mine = removedAndAdded(
      compareWords(pair.oldText),
      compareWords(pair.newText)
    );
    const theirs = {
      removed: pair.runs.filter((r) => r.kind === 'del').flatMap((r) => compareWords(r.text)),
      added: pair.runs.filter((r) => r.kind === 'ins').flatMap((r) => compareWords(r.text))
    };
    const bag = (list) => [...list].sort().join('|');
    if (bag(mine.removed) !== bag(theirs.removed) || bag(mine.added) !== bag(theirs.added)) {
      fail(
        `14. the order fixture's words disagree with this file's own derivation: removed ` +
          `${JSON.stringify(theirs.removed)} against ${JSON.stringify(mine.removed)}, added ` +
          `${JSON.stringify(theirs.added)} against ${JSON.stringify(mine.added)}.`
      );
    } else {
      say(
        `14. the runs keep jsdiff's own order: the order fixture is ${kinds}, with the ` +
          'insertion before a deletion it is not paired with and nothing tidying it, and its ' +
          `${String(theirs.removed.length)} removed and ${String(theirs.added.length)} added ` +
          'words match this file’s own derivation as multisets'
      );
    }
  }
}


// -- rule 15: the document, both projections re-derived by plain joins ------
{
  const docs = Array.isArray(data.document) ? data.document : [];
  const oldOf = (runs) => runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('');
  const newOf = (runs) => runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('');
  const at = (a, b) => {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return `offset ${String(i)}: ${JSON.stringify(a.slice(i, i + 20))} against ${JSON.stringify(b.slice(i, i + 20))}`;
  };
  if (docs.length < 20) fail(`15. only ${String(docs.length)} document fixture(s) were composed.`);
  let wholeSeen = 0;
  for (const d of docs) {
    if (!Array.isArray(d.runs)) {
      fail(`15. "${d.name}" printed no runs.`);
      continue;
    }
    const o = oldOf(d.runs);
    const n = newOf(d.runs);
    if (o !== d.old) fail(`15. "${d.name}" with the insertions dropped is not the old file, ${at(o, d.old)}.`);
    if (n !== d.new) fail(`15. "${d.name}" with the deletions dropped is not the new file, ${at(n, d.new)}.`);
    for (let i = 1; i < d.runs.length; i++) {
      if (d.runs[i].kind === d.runs[i - 1].kind) fail(`15. "${d.name}" has two adjacent ${d.runs[i].kind} runs.`);
    }
    if (d.runs.some((r) => r.text === '')) fail(`15. "${d.name}" holds an empty run.`);
    if (d.whole.unaligned !== 0) fail(`15. "${d.name}" had ${String(d.whole.unaligned)} block(s) the repair refused.`);
    const whole = d.whole.tooBig + d.whole.tooDifferent + d.whole.overCap;
    wholeSeen += whole;
    // A refused block draws WHOLE and the note says so; a clean document has none.
    if (whole > 0 && (typeof d.note !== 'string' || !d.note.includes('drawn whole'))) {
      fail(`15. "${d.name}" drew ${String(whole)} block(s) whole and its note does not say so: ${JSON.stringify(d.note)}.`);
    }
    if (whole === 0 && d.approximate !== true && d.note !== null) {
      fail(`15. "${d.name}" drew every block as words and still carries a note: ${JSON.stringify(d.note)}.`);
    }
  }
  const unchanged = docs.find((d) => d.name === 'unchanged');
  if (unchanged !== undefined && !(unchanged.runs.length === 1 && unchanged.runs[0].kind === 'same' && unchanged.blocks === 0)) {
    fail(`15. the unchanged file is not one plain run: ${JSON.stringify(unchanged.runs.map((r) => r.kind))}.`);
  }
  const cap = docs.find((d) => d.name === 'past the block cap');
  if (cap !== undefined && cap.whole.overCap !== 5) fail(`15. the block cap fired ${String(cap.whole.overCap)} times, wanting 5.`);
  const big = docs.find((d) => d.name === 'past the character budget');
  if (big !== undefined && big.whole.tooBig !== 1) fail(`15. the character budget fired ${String(big.whole.tooBig)} times, wanting 1.`);
  const rewritten = docs.find((d) => d.name === 'rewritten past the guard');
  if (rewritten !== undefined && !(rewritten.whole.tooDifferent === 1 && rewritten.runs.map((r) => r.kind).join(',') === 'same,del,ins,same')) {
    fail(`15. the rewritten paragraph did not draw whole between its context: ${JSON.stringify(rewritten.runs.map((r) => r.kind))}.`);
  }
  const coarse = docs.filter((d) => d.name.startsWith('rewritten past the line guard'));
  if (coarse.length < 4) fail(`15. only ${String(coarse.length)} fixture(s) reach the coarse fallback, wanting 4.`);
  for (const d of coarse) {
    if (d.approximate !== true) fail(`15. the line guard did not fire on "${d.name}".`);
  }
  // The coarse fallback's shared head is a LINE of the old side, so it must
  // be empty or end on a newline, and the new side must begin with it. A
  // head of "\n" over a new side that begins with "n" is the one byte defect
  // the verifier of Phase 194 caught.
  for (const d of coarse) {
    const head = d.runs[0]?.kind === 'same' ? d.runs[0].text : '';
    if (!(head === '' || head.endsWith('\n')) || !d.new.startsWith(head)) {
      fail(`15. "${d.name}" claims a shared head ${JSON.stringify(head.slice(0, 20))} that is not a line both sides begin with.`);
    }
  }
  if (wholeSeen < 7) fail(`15. only ${String(wholeSeen)} block(s) drew whole across the fixtures, so the caps were not all seen.`);
  const f = data.fuzz ?? {};
  if (!(f.pairs >= 3000 && f.oldWrong === 0 && f.newWrong === 0 && f.unaligned === 0)) {
    fail(`15. the fuzz disagreed: ${JSON.stringify(f)}.`);
  }
  say(
    `15. ${String(docs.length)} whole file fixtures re-derived by plain joins: with the insertions dropped they are the old file and with the deletions dropped the new file, byte for byte; ` +
      `${String(wholeSeen)} refused blocks drew whole and were named in the note; the fuzz held over ${String(f.pairs)} pairs in ${String(f.ms)} ms with ${String(f.unaligned)} repairs refused and ${String(f.whole)} blocks drawn whole`
  );
}

// -- rule 16: a change to the last word of a line stays on its line -----------
{
  const docs = Array.isArray(data.document) ? data.document : [];
  const isSpace = (ch) => /\s/.test(ch);
  let pairs = 0;
  for (const d of docs) {
    if (!Array.isArray(d.runs)) continue;
    for (let i = 1; i < d.runs.length; i++) {
      const p = d.runs[i - 1];
      const q = d.runs[i];
      if (p.kind === 'same' || q.kind === 'same') continue;
      pairs += 1;
      const end = p.text.slice(-1);
      const start = p.text.charAt(0);
      if (isSpace(end) && end === q.text.slice(-1)) {
        fail(`16. "${d.name}" has a ${p.kind} and an ${q.kind} that share the trailing ${JSON.stringify(end)}: ${JSON.stringify(p.text.slice(-24))} then ${JSON.stringify(q.text.slice(-24))}.`);
      }
      if (isSpace(start) && start === q.text.charAt(0)) {
        fail(`16. "${d.name}" has a ${p.kind} and an ${q.kind} that share the leading ${JSON.stringify(start)}: ${JSON.stringify(p.text.slice(0, 24))} then ${JSON.stringify(q.text.slice(0, 24))}.`);
      }
    }
  }
  if (pairs < 20) fail(`16. only ${String(pairs)} adjacent pair(s) were seen across the fixtures, too few to mean anything.`);
  // The exact runs, so the rule is seen to say what the words are, not only
  // what they are not.
  const want = {
    'last word of a line': ['same:We ship on ', 'del:Monday', 'ins:Friday', 'same:\nNext line.\n'],
    'last word of the file': ['same:- item one\n- item ', 'del:two', 'ins:three', 'same:\n'],
    'last word before a blank line': ['same:Ends ', 'del:here', 'ins:there', 'same:\n\nNext.\n'],
    'last word with crlf': ['same:one\r\n', 'del:two', 'ins:2', 'same:\r\nthree\r\n'],
    'first word after shared indentation': ['same:list:\n    ', 'del:old', 'ins:new', 'same: item\n'],
    'a whole line, drawn as a pair': ['same:a\n\tkept tab ', 'del:old', 'ins:new', 'same:\nz\n']
  };
  let pinned = 0;
  for (const [name, runs] of Object.entries(want)) {
    const d = docs.find((one) => one.name === name);
    if (d === undefined) {
      fail(`16. the fixture "${name}" was not composed.`);
      continue;
    }
    const got = d.runs.map((r) => `${r.kind}:${r.text}`);
    if (JSON.stringify(got) !== JSON.stringify(runs)) {
      fail(`16. "${name}" drew ${JSON.stringify(got)}, wanting ${JSON.stringify(runs)}.`);
    } else pinned += 1;
  }
  const f = data.fuzz ?? {};
  if (f.edgeShared !== 0) fail(`16. the fuzz found ${String(f.edgeShared)} adjacent pair(s) sharing whitespace at an end.`);
  say(`16. ${String(pairs)} adjacent deletion and insertion pairs across the fixtures share no whitespace at either end, ${String(pinned)} last word fixtures drew exactly the runs pinned, and the fuzz found ${String(f.edgeShared)} such pairs over ${String(f.pairs)}`);
}

// ---------------------------------------------------------------------------
// The scanners, proved on fixtures this file writes. A scan that cannot fail
// proves nothing, so every one of the three is shown failing and passing.
// ---------------------------------------------------------------------------
{
  const dir = mkdtempSync(join(tmpdir(), 'redline-gate-'));
  let behaved = 0;
  try {
    const cases = [
      {
        what: 'a stylesheet with a hex literal',
        file: 'bad.css',
        body: '.ed-redline del { color: #e5655e; }',
        run: (s) => findColourLiterals(s).length > 0,
        want: true
      },
      {
        what: 'a stylesheet with an rgba literal',
        file: 'bad2.css',
        body: '.ed-redline ins { background: rgba(1, 2, 3, 0.1); }',
        run: (s) => findColourLiterals(s).length > 0,
        want: true
      },
      {
        what: 'a stylesheet with a named colour',
        file: 'bad3.css',
        body: '.ed-redline del { color: red; }',
        run: (s) => findColourLiterals(s).length > 0,
        want: true
      },
      {
        what: 'a stylesheet drawing only from tokens',
        file: 'good.css',
        body: '.ed-redline del { color: var(--error); background: var(--error-wash); }',
        run: (s) => findColourLiterals(s).length > 0,
        want: false
      },
      {
        what: 'a comment naming a colour, which is not a declaration',
        file: 'good2.css',
        body: '/* measured at #e5655e in the running app */\n.x { color: var(--error); }',
        run: (s) => findColourLiterals(s).length > 0,
        want: false
      },
      {
        what: 'a diff surface mounting the redline in the annotation slot',
        file: 'bad-slot.tsx',
        body: '<FileDiff fileDiff={meta} lineAnnotations={annotations} renderAnnotation={draw} />',
        run: (s) => findRedlineMounts(s).length > 0,
        want: true
      },
      {
        what: 'a diff surface importing the row',
        file: 'bad-import.tsx',
        body: "import { RedlineRow } from './RedlineRow';",
        run: (s) => findRedlineMounts(s).length > 0,
        want: true
      },
      {
        what: 'a control row reading the preference Phase 191 kept',
        file: 'bad-pref.tsx',
        body: '  const redline = useEditor((s) => s.diffRedline);',
        run: (s) => findRedlineMounts(s).length > 0,
        want: true
      },
      {
        what: 'a diff surface that only says where the redline went',
        file: 'good-surface.tsx',
        body: "// Phase 191 used lineAnnotations and renderAnnotation; see ./redline\n<FileDiff fileDiff={meta} options={options} />",
        run: (s) => findRedlineMounts(s).length > 0,
        want: false
      },
      {
        what: 'a module reaching the bridge',
        file: 'bad-write.ts',
        body: "await gmuxBridge.invoke('fs:write', { path, text });",
        run: (s) => findWritePaths(s).length > 0,
        want: true
      },
      {
        what: 'a module accepting a change',
        file: 'bad-accept.ts',
        body: 'export function acceptChange(block) { return block; }',
        run: (s) => findWritePaths(s).length > 0,
        want: true
      },
      {
        what: 'a module that only reads',
        file: 'good-read.ts',
        body: 'export function newTextOf(runs) { return runs.join(""); }',
        run: (s) => findWritePaths(s).length > 0,
        want: false
      }
    ];
    for (const one of cases) {
      const path = join(dir, one.file);
      writeFileSync(path, one.body);
      const got = one.run(readFileSync(path, 'utf8'));
      if (got !== one.want) {
        fail(
          `fixture "${one.what}" was expected to ${one.want ? 'fail' : 'pass'} the scan and did not.`
        );
      } else behaved += 1;
    }
    say(`${String(behaved)} fixtures behaved, so the three scanners above can fail`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (failures.length > 0) {
  console.error(`${TAG} ${String(failures.length)} failure(s):`);
  for (const line of failures) console.error(`${TAG}   ${line}`);
  process.exit(1);
}
say('every rule passed.');
process.exit(0);
