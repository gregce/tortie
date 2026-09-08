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
 *   9. THE ONE WRITE (Phase 227, narrowed from "no write anywhere"). The
 *      redline modules may name exactly ONE write channel, Phase 226's
 *      guarded write, at exactly ONE call site in exactly one file, and the
 *      declared function holding it must ask the baseline generation guard
 *      first and re-read the file second, read by matching braces through
 *      functionBodyOf and never by searching for a word. A forbidden write
 *      (writeFile, an accept, an `fs:` channel string) anywhere, a second
 *      call site, or the bridge reached from any other redline file is a
 *      failure, so the write still has exactly one reviewed door.
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
 *  17. TYPING (Phase 237). Two halves. 17a is a scan: no typing file may name
 *      a baseline advance, which is research 83 A2.3 made structural rather
 *      than promised, proved on four plants of which two must be caught. 17b
 *      drives the SHIPPING rules under node, one arm per trap research 97
 *      measured with real CDP key events — Enter arriving as `insertLineBreak`
 *      and not `insertParagraph`, the outside write HELD while a composition is
 *      open, `insertCompositionText` ignored because it is the one event no
 *      `preventDefault` can cancel, the caret coming back through a redraw with
 *      0 characters of error against a hand re-derivation, and a keystroke
 *      folding into the current side with both projections exact — and every
 *      arm goes red under an ablation of its own clause.
 *  18. THE CURRENT CHANGE (Phase 239). The controls stopped being a pointer's
 *      guest, and both halves of that can be undone in one line. 18a is a
 *      SCAN: neither `redline-current.ts` nor the view's own `step` may read
 *      `document.activeElement`, which is the single word behind both defects
 *      research 99 measured — reading the position off the focus swallowed the
 *      first ⌥↓ of a fresh view (§2.2, reproduced in two runs), and holding the
 *      ELEMENT rather than the identity let an outside write take the person's
 *      place away while the change was still drawn with the same identity,
 *      offset and generation (§2.3). `focusedChange` keeps its read, because it
 *      is the fallback for a hover nobody has stepped from, so the scan is
 *      aimed at the two places the decision now lives and is proved on three
 *      plants. 18b DRIVES the shipping module under node over the nine-change
 *      fixture and the recompose that makes it ten, with TEN arms — the step
 *      from nowhere, the two ends, six positions, the recompose, the identity
 *      rule with its generation clause, a wrapper carrying no identity, the
 *      swallowed press as the number 0, 1, 2 against 0, 0, 0, and the FIX
 *      ROUND'S THREE — and every one goes red under an ablation of its own
 *      clause. The ablated copies live in a scratch directory OUTSIDE `src/`,
 *      removed in a `finally`, because this module's only import is
 *      `import type` and resolves nothing at runtime.
 *
 *      THE FIX ROUND'S THREE ARMS ARE THE THREE THINGS THE VERIFIER MEASURED
 *      AND NOTHING PINNED. A change is the span of BASELINE it covers, being
 *      `off` and `del`, because Phase 237 ships typing in this document and
 *      typing rewrites `ins` on every keystroke: with `ins` in the identity,
 *      three characters typed into the change the controls were drawn on took
 *      the chip away and left 0 changes marked, 3 runs of 3, where the parent
 *      commit kept them 3 of 3. A caret the VIEW put back after a recompose is
 *      not a move, because the restore is by current-side offset and a write
 *      ABOVE the caret leaves that offset on different text: the mark, the
 *      chip and the ⌥⌫ target all walked to the change a `/bin/sh` had just
 *      made while the held change was still drawn two rows below with the same
 *      offset, the same deleted text and the same inserted text. And a press
 *      on the document's own prose LETS GO, because the controls could be
 *      summoned and never put away — clicking plain prose far from any change
 *      left the chip drawn on change 0 where the parent read it gone, over a
 *      171.60 x 30px overlay sitting on the marked-up sentence research 83 D.3
 *      says the view exists so a person can read.
 *
 * Exit 0 when every rule passes, 1 otherwise with each failure named.
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { functionBodyOf, stripComments } from './scan-source.mjs';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:redline]';
const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => console.log(`${TAG} ${line}`);

/** Milliseconds the worst case the caps allow may cost. */
const WORST_CASE_CEILING_MS = 400;

// THE SET IS DERIVED, AND THE LIST BELOW IS THE REASONS. The Phase 227
// verifier planted a guarded write in `redline-commands.ts`, a redline file
// this list did not name, and rule 9 stayed green: the charter's own sentence
// is that "the write does not go into a seventh file so the scanner misses
// it", and a hand list is exactly how a seventh file gets missed. So the files
// rule 9 scans are every file under src/renderer/editor whose name begins
// `redline`, `Redline`, `rewind` or `baseline` (the last two the bare module
// names, the first two a prefix), read from the directory, and
// the count is held to a floor the way `gate:electron` holds its helper
// population: adding a redline file can never turn this gate red, deleting or
// renaming one does, and a deliberate deletion lowers the floor in the same
// commit. A file named outside the prefix is the stated limit, and the hand
// list is asserted to be a SUBSET of the derived set so a file it names
// cannot drift off in silence.
const REDLINE_DIR = 'src/renderer/editor';
const REDLINE_NAME = /^(redline[.-]|Redline[A-Z]|rewind\.|baseline\.)/;
const REDLINE_FILES_FLOOR = 20;
const REDLINE_FILES = readdirSync(REDLINE_DIR)
  .filter((name) => REDLINE_NAME.test(name))
  .sort()
  .map((name) => `${REDLINE_DIR}/${name}`);
const REDLINE_FILES_NAMED = [
  'src/renderer/editor/redline.ts',
  'src/renderer/editor/redline-copy.ts',
  'src/renderer/editor/RedlineRow.tsx',
  'src/renderer/editor/redline.css',
  // Phase 194: the view and the document it draws. Same refusals.
  'src/renderer/editor/redline-document.ts',
  'src/renderer/editor/RedlineDocument.tsx',
  // Phase 225: the shadow baseline the view draws against. Same refusals,
  // because a module that decides the left side must not be able to write
  // the right one.
  'src/renderer/editor/baseline.ts',
  // Phase 227: the pure press and the one call site that writes. rewind.ts
  // decides and must never write; redline-write.ts holds the single permitted
  // write channel, which rule 9 was narrowed to allow at exactly one call site.
  'src/renderer/editor/rewind.ts',
  'src/renderer/editor/redline-write.ts',
  // Phase 227: the undo journal, per tab and in memory. It writes nothing.
  'src/renderer/editor/redline-journal.ts',
  // Phase 227: the refusal sentences. Text for a person, no write.
  'src/renderer/editor/redline-sentences.ts',
  // Phase 227: the road from the native menu to the mounted view. No write.
  'src/renderer/editor/redline-commands.ts',
  // Phase 227 fix round: the press, which owns the order between the chord
  // and the one call site and moves the journal. It names no bridge.
  'src/renderer/editor/redline-press.ts',
  // Phase 194: the harness probe that reads the view. It names no write.
  'src/renderer/editor/redline-shot-probe.ts',
  // Phase 236: the change chip, being the redline's controls on the face. It
  // draws buttons that call the SAME commands the chord and the Edit menu
  // call, so it names no bridge and reaches no write of its own.
  'src/renderer/editor/redline-chip.tsx',
  // Phase 236: the first-run line's per-session flag and its sentence. In
  // memory only, like the journal, and it writes nothing.
  'src/renderer/editor/redline-hint.ts',
  // Phase 237: typing. The rules are pure and hold no baseline; the caret is
  // the DOM half and decides nothing; the wiring joins them to the tab and
  // writes the tab's own monaco buffer, which is the same buffer ⌘S writes.
  // None of the three may reach a file: a typed character is saved through
  // the ordinary save path and never through a door of its own.
  'src/renderer/editor/redline-typing.ts',
  'src/renderer/editor/redline-caret.ts',
  'src/renderer/editor/redline-edits.ts',
  // Phase 239: the current change, held as an identity so it survives the
  // recompose an agent's write causes. It is pure, it reads drawn attributes
  // and answers elements, and it writes nothing.
  'src/renderer/editor/redline-current.ts'
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

// PHASE 227 NARROWED RULE 9. The redline may name exactly one write, being
// Phase 226's guarded write, at one call site, and the function holding it
// asks the generation guard before the re-read before the write.
//
// A forbidden write fails EVERYWHERE, the permitted file included: a plain
// writeFile, an accept, or an `fs:` channel string is never allowed here,
// because they follow a link or reach a second channel. The bridge itself may
// be named ONLY in the one permitted file, where the guarded write is reached.
const CALL_SITE_FILE = 'src/renderer/editor/redline-write.ts';
const CALL_SITE_FN = 'applyRewind';
const FORBIDDEN_WRITE =
  /\b(writeFile|writeFileSync|acceptChange|rejectChange|applyChange)\b|['"`]fs:[a-zA-Z]/;
const NAMES_BRIDGE = /\bgmuxBridge\b/;
// A MENTION and not a call. The verifier aliased the method in the permitted
// file, `const w = b.fs.writeGuarded; w.call(b.fs, ...)`, and a pattern that
// wanted `.writeGuarded(` counted it as nothing. Every appearance of the name
// outside a comment is counted, so an alias, a destructure or a bound copy is
// a second write and fails.
const WRITE_CALL = /\bwriteGuarded\b/g;

/**
 * Every finding rule 9 has over a set of redline sources (a Map of relative
 * path to source). Empty means the redline has exactly one reviewed write and
 * the guard in front of it. Written so it CAN fail, and proved on fixtures.
 */
function rule9Findings(files) {
  const out = [];
  let writeCalls = 0;
  let writeCallFile = null;
  for (const [file, source] of files) {
    const permitted = file === CALL_SITE_FILE;
    const calls = (stripComments(source).match(WRITE_CALL) ?? []).length;
    if (calls > 0) {
      writeCalls += calls;
      writeCallFile = file;
    }
    for (const [index, line] of source.split('\n').entries()) {
      const bare = line.replace(/\/\*[\s\S]*?\*\//g, '');
      if (bare.trimStart().startsWith('*') || bare.trimStart().startsWith('//')) continue;
      if (FORBIDDEN_WRITE.test(bare)) {
        out.push(`9. ${file} names a forbidden write: ${String(index + 1)}: ${line.trim()}`);
      }
      if (!permitted && NAMES_BRIDGE.test(bare)) {
        out.push(`9. ${file} reaches the bridge, which only ${CALL_SITE_FILE} may: ${String(index + 1)}: ${line.trim()}`);
      }
    }
  }
  if (writeCalls !== 1) {
    out.push(`9. the redline names the guarded write ${String(writeCalls)} time(s); it must name it exactly once`);
  } else if (writeCallFile !== CALL_SITE_FILE) {
    out.push(`9. the one guarded write is in ${writeCallFile}, and it must be ${CALL_SITE_FILE}`);
  } else {
    // The order, read from the call site's own braces.
    const body = functionBodyOf(stripComments(files.get(CALL_SITE_FILE) ?? ''), CALL_SITE_FN);
    if (body === null) {
      out.push(`9. ${CALL_SITE_FN} is not a declared function, so the guard order cannot be read by braces`);
    } else {
      const guard = body.search(/drawnGeneration[\s\S]{0,40}generation/);
      const read = body.indexOf('readFile(');
      const write = body.search(/\bwriteGuarded\b/);
      if (guard === -1) out.push(`9. ${CALL_SITE_FN} does not ask the baseline generation guard`);
      else if (read === -1) out.push(`9. ${CALL_SITE_FN} does not re-read the file`);
      else if (!(guard < read && read < write)) {
        out.push(`9. ${CALL_SITE_FN} does not ask the guard before the re-read before the write`);
      }
    }
  }
  return out;
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
if (REDLINE_FILES.length < REDLINE_FILES_FLOOR) {
  fail(`9. ${String(REDLINE_FILES.length)} redline files under ${REDLINE_DIR}, under the floor of ${String(REDLINE_FILES_FLOOR)}: a redline file was deleted or renamed, and a deliberate deletion lowers the floor in the same commit`);
}
for (const file of REDLINE_FILES_NAMED) {
  if (!REDLINE_FILES.includes(file)) {
    fail(`9. ${file} is named in the reasons list and not found by the derivation, so the list and the tree disagree`);
  }
}
say(`9. ${String(REDLINE_FILES.length)} redline files scanned, derived by name from ${REDLINE_DIR} (floor ${String(REDLINE_FILES_FLOOR)}), ${String(REDLINE_FILES_NAMED.length)} of them with a reason in the list`);
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
  'src/renderer/editor/redline.css',
  // Phase 236: the chip is a fourth drawn thing and is held to the same rule.
  'src/renderer/editor/redline-chip.tsx'
]) {
  const hits = findColourLiterals(sources.get(file) ?? '');
  if (hits.length > 0) {
    fail(`8. ${file} carries a colour literal: ${hits.join(' | ')}`);
  }
}
say('8. the row and the view draw from tokens only, with no colour literal in a component or the stylesheet');

for (const finding of rule9Findings(sources)) fail(finding);
say(
  `9. the redline names one guarded write at one call site (${CALL_SITE_FILE}), ` +
    `whose function asks the baseline generation guard before the re-read before the write, ` +
    `and no forbidden write and no accept anywhere`
);

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
        what: 'a diff surface that only says where the redline went (second copy)',
        file: 'good-surface2.tsx',
        body: "// see ./redline for lineAnnotations\n<FileDiff options={options} />",
        run: (s) => findRedlineMounts(s).length > 0,
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

// ---------------------------------------------------------------------------
// Rule 9's narrowed scanner, proved on planted redline sets. A scan that
// cannot fail proves nothing, so the shape that ships passes and four shapes
// a later round might write must each be caught: a second call site, a write
// in another redline file, the guard after the read, and no guard at all.
// ---------------------------------------------------------------------------
{
  const SHIPPING_CALL = `import { gmuxBridge } from '../bridge';
export async function applyRewind(ctx) {
  if (ctx.drawnGeneration !== ctx.generation) return { refused: 'baselineMoved' };
  const bridge = gmuxBridge();
  const read = await bridge.fs.readFile(ctx.path);
  const result = await bridge.fs.writeGuarded({ root: ctx.root, path: ctx.path, contents: 'x' });
  return result;
}`;
  const cleanReader = `export function changesOf(runs) { return runs; }`;
  const map = (entries) => new Map(entries);
  const CALL = 'src/renderer/editor/redline-write.ts';
  const PLANTS = [
    {
      what: 'the shipping shape: one guarded call, guard before read before write',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/rewind.ts', cleanReader]],
      wantFail: false
    },
    {
      what: 'a second call site in the permitted file',
      files: [[CALL, SHIPPING_CALL + `
export async function again(ctx) { const b = gmuxBridge(); return b.fs.writeGuarded({ root: ctx.root, path: ctx.path, contents: 'y' }); }`]],
      wantFail: true
    },
    {
      what: 'a write in another redline file',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/rewind.ts', `export async function sneak() { await gmux.fs.writeFile('/x', 'y'); }`]],
      wantFail: true
    },
    {
      what: 'the guard after the read',
      files: [[CALL, `import { gmuxBridge } from '../bridge';
export async function applyRewind(ctx) {
  const bridge = gmuxBridge();
  const read = await bridge.fs.readFile(ctx.path);
  if (ctx.drawnGeneration !== ctx.generation) return { refused: 'baselineMoved' };
  return bridge.fs.writeGuarded({ root: ctx.root, path: ctx.path, contents: 'x' });
}`]],
      wantFail: true
    },
    {
      what: 'no guard at all',
      files: [[CALL, `import { gmuxBridge } from '../bridge';
export async function applyRewind(ctx) {
  const bridge = gmuxBridge();
  const read = await bridge.fs.readFile(ctx.path);
  return bridge.fs.writeGuarded({ root: ctx.root, path: ctx.path, contents: 'x' });
}`]],
      wantFail: true
    },
    {
      what: 'the bridge named in another redline file',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/RedlineDocument.tsx', `import { gmuxBridge } from '../bridge';\nexport function View() { return null; }`]],
      wantFail: true
    },
    {
      what: 'an accept in a redline file',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/redline.ts', `export function acceptChange(b) { return b; }`]],
      wantFail: true
    },
    {
      what: "the verifier's alias: a bound copy of the method in the permitted file, called without its name",
      files: [[CALL, SHIPPING_CALL + `
export async function again(ctx) { const b = gmuxBridge(); const w = b.fs.writeGuarded; return w.call(b.fs, { root: ctx.root, path: ctx.path, contents: 'y' }); }`]],
      wantFail: true
    },
    {
      what: "the verifier's seventh file: a guarded write in redline-commands.ts",
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/redline-commands.ts', `import { gmuxBridge } from '../bridge';\nexport function run() { return gmuxBridge()?.fs.writeGuarded({ root: '/', path: '/x', contents: 'y' }); }`]],
      wantFail: true
    }
  ];
  let behaved9 = 0;
  for (const plant of PLANTS) {
    const findings = rule9Findings(map(plant.files));
    const failed = findings.length > 0;
    if (failed === plant.wantFail) behaved9 += 1;
    else fail(`9. the narrowed scanner misread "${plant.what}": ${JSON.stringify(findings)}`);
  }
  say(`9. the narrowed scanner behaved on ${String(behaved9)} of ${String(PLANTS.length)} planted redline sets`);
}

// ---------------------------------------------------------------------------
// PHASE 227, item 8: six arms on the SHIPPING rewind.ts, one per loss research 83 measured, and a seventh from the fix round on the SHIPPING press,
// 83 measured, each a pure computation over two strings through
// build/redline-rewind-probe.mts. Every arm goes red under an ablation of its
// clause: the gate copies the four value modules of the pure chain to a dotted
// subdir of the editor, edits one clause of the copy's rewind.ts, and fails
// unless that arm's reading moves. The copies are removed in a `finally`.
// ---------------------------------------------------------------------------
{
  const CHAIN = ['rewind.ts', 'redline-document.ts', 'redline.ts', 'paths.ts', 'redline-press.ts', 'redline-journal.ts'];
  const EDITOR = 'src/renderer/editor';
  const runRewindProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-rewind-probe.mts'],
      { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 32 * 1024 * 1024, env: { ...process.env, REWIND_DIR: dir } }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  // The seven arms, each with the reading the shipping module must print and the
  // one clause whose ablation must move it.
  const ARMS = [
    {
      name: 'the stale draw (B.4d): re-derive at press time keeps the arrival',
      key: 'staleDraw',
      expect: (a) => a.outcome === 'write' && a.rewound === true && a.keptArrival === true,
      from: 'composeRedlineDocument(input.baseline, input.fresh)',
      to: 'composeRedlineDocument(input.baseline, input.baseline)'
    },
    {
      name: 'the truncated read (E.7a), both shapes, refused before the compose',
      key: 'truncated',
      expect: (a) => a.exact === 'refused/fileTooLarge' && a.approx === 'refused/fileTooLarge',
      from: "if (input.truncated) return 'fileTooLarge';",
      to: "if (false) return 'fileTooLarge';"
    },
    {
      name: 'the moved baseline generation (B.8a), refused before any read',
      key: 'movedBaseline',
      expect: (a) => a.plain === 'refused/baselineMoved' && a.first === 'refused/baselineMoved',
      from: "if (input.drawnGeneration !== input.baselineGeneration) return 'baselineMoved';",
      to: "if (false) return 'baselineMoved';"
    },
    {
      name: 'the path outside every root (E.5), surfaced by the view',
      key: 'outsideRoot',
      expect: (a) => a.key === 'outsideRoot' && a.wroteKey === null,
      from: "    case 'outside':\n      return 'outsideRoot';",
      to: "    case 'outside':\n      return 'io';"
    },
    {
      name: "the person's own insertion (A8a): rewinds AND undoes byte for byte",
      key: 'ownInsertion',
      expect: (a) => a.rewindOutcome === 'write' && a.gone === true && a.undoOutcome === 'write' && a.restored === true,
      from: 'input.fresh.slice(0, loc) + pressed.ins + input.fresh.slice(loc + pressed.del.length)',
      to: "input.fresh.slice(0, loc) + '' + input.fresh.slice(loc + pressed.del.length)"
    },
    {
      name: 'the encoding round trip (E.7b), decodeLoss refused',
      key: 'encoding',
      expect: (a) => a.outcome === 'refused/decodeLoss' && a.clean === 'write',
      from: "if (input.fresh.includes('\uFFFD')) return 'decodeLoss';",
      to: "if (false) return 'decodeLoss';"
    },
    // THE SEVENTH ARM, the fix round's. The verifier moved the focus with ⌥↓
    // while the real press awaited main's read: E0 was rewound and the journal
    // held E1, so undo refused and E0 was recoverable from nothing; moved onto
    // the pure insertion E6, undo wrote "exactly " twice. The arm drives the
    // SHIPPING press with a call site that moves the focus inside its await,
    // and the ablation is the first shipped shape put back, being the focus
    // read again after the await to build the journal entry.
    {
      name: 'the focus moved while the press awaited: the journal holds what was pressed',
      key: 'focusMoved',
      file: 'redline-press.ts',
      expect: (a) =>
        a.toNext.rewound === true && a.toNext.journalHoldsPressed === true && a.toNext.restored === true &&
        a.toInsertion.rewound === true && a.toInsertion.journalHoldsPressed === true &&
        a.toInsertion.restored === true && a.toInsertion.duplicated === false,
      from: "if (kind === 'rewind') recordRewind(tab.id, pressed);",
      to: "if (kind === 'rewind') { const p = deps.focused(); if (p !== null) recordRewind(tab.id, p); }"
    }
  ];

  const shipping = runRewindProbe(EDITOR);
  if (shipping.error !== undefined) {
    fail(`8. the rewind probe did not run: ${shipping.error}`);
  } else {
    for (const arm of ARMS) {
      if (!arm.expect(shipping[arm.key])) {
        fail(`8. the shipping rewind read the wrong thing for "${arm.name}": ${JSON.stringify(shipping[arm.key])}`);
      }
    }
    // The ablations, one clause each, in a dotted subdir removed in a finally.
    const prefix = `.p227-ablation-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    try {
      for (const [i, arm] of ARMS.entries()) {
        const dir = join(EDITOR, `${prefix}${String(i)}`);
        mkdirSync(dir, { recursive: true });
        made.push(dir);
        for (const f of CHAIN) cpSync(join(EDITOR, f), join(dir, f));
        const armFile = arm.file ?? 'rewind.ts';
        const target = join(dir, armFile);
        const before = readFileSync(target, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`8. the ablation for "${arm.name}" found nothing to edit in ${armFile}`);
          continue;
        }
        writeFileSync(target, before.replace(arm.from, arm.to));
        const ablated = runRewindProbe(dir);
        if (ablated.error !== undefined) {
          fail(`8. the ablation for "${arm.name}" stopped the probe running (${ablated.error}), so it proves nothing`);
          continue;
        }
        const moved = JSON.stringify(ablated[arm.key]) !== JSON.stringify(shipping[arm.key]);
        if (moved) red += 1;
        else fail(`8. the ablation for "${arm.name}" changed nothing this arm reads, so it cannot fail: ${JSON.stringify(ablated[arm.key])}`);
      }
      say(`8. ${String(ARMS.length)} arms over the shipping rewind and press, and ${String(red)} of ${String(ARMS.length)} ablations moved their arm's reading`);
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      // A sweep, in case a name from an interrupted run is left.
      for (const name of readdirSync(EDITOR)) {
        if (name.startsWith(prefix) && existsSync(join(EDITOR, name))) {
          rmSync(join(EDITOR, name), { recursive: true, force: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 237, rule 17: TYPING. Two halves, because a later round can undo
// either without touching the other.
//
// 17a is a SCAN. Research 83 A2.3: typing never moves the baseline and never
// moves the generation, so a rewind drawn before a keystroke must not refuse
// because of one. The three typing files may not name a baseline advance at
// all, which is what makes that structural rather than promised, and the
// scanner is proved on fixtures this file writes so a scan that cannot fail is
// never mistaken for a scan that passed.
//
// 17b DRIVES the shipping rules under node, one arm per trap research 97
// measured with real CDP key events, and ablates the clause behind each one.
// ---------------------------------------------------------------------------
{
  const TYPING_FILES = [
    'src/renderer/editor/redline-typing.ts',
    'src/renderer/editor/redline-caret.ts',
    'src/renderer/editor/redline-edits.ts'
  ];
  // A baseline ADVANCE, never the word: ./redline-edits is allowed to say the
  // word in a comment and the scan strips comments anyway, but no typing file
  // may call the one function that moves it or patch the field it lives in.
  const BASELINE_ADVANCE = /\bnextBaseline\b|\bbaseline\s*:|\bgeneration\s*:|\bheadSeen\b/;
  const baselineFindings = (files) => {
    const out = [];
    for (const [file, source] of files) {
      for (const [index, line] of stripComments(source).split('\n').entries()) {
        if (BASELINE_ADVANCE.test(line)) {
          out.push(`17. ${file} moves the baseline: ${String(index + 1)}: ${line.trim()}`);
        }
      }
    }
    return out;
  };

  const shippingTyping = new Map(
    TYPING_FILES.map((file) => [file, readFileSync(file, 'utf8')])
  );
  for (const file of TYPING_FILES) {
    if (!existsSync(file)) fail(`17. ${file} is not there, so rule 17 proves nothing`);
  }
  const found = baselineFindings(shippingTyping);
  for (const line of found) fail(line);

  // The scanner, proved on four plants, two of which must be caught.
  const PLANTS = [
    { name: 'a call that advances it', source: 'const b = nextBaseline(s, e);', caught: true },
    { name: 'a patch of the field', source: 'patch(id, { baseline: next });', caught: true },
    { name: 'the word in a comment', source: '// the baseline: never moved here\nconst x = 1;', caught: false },
    { name: 'an ordinary line', source: "const at = edit.start + edit.text.length;", caught: false }
  ];
  let plantsOk = 0;
  for (const plant of PLANTS) {
    const hits = baselineFindings(new Map([['plant.ts', plant.source]]));
    if (hits.length > 0 === plant.caught) plantsOk += 1;
    else fail(`17. the baseline scanner behaved wrongly on "${plant.name}"`);
  }
  say(
    `17a. ${String(TYPING_FILES.length)} typing files name no baseline advance (${String(plantsOk)} of ${String(PLANTS.length)} scanner fixtures behaved)`
  );

  // 17b. The arms.
  const TYPING_CHAIN = [
    'redline-typing.ts',
    'text-edit.ts',
    'redline-document.ts',
    'redline.ts',
    'paths.ts',
    'rewind.ts'
  ];
  const EDITOR_DIR = 'src/renderer/editor';
  const runTypingProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-typing-probe.mts'],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, TYPING_DIR: dir }
      }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const TYPING_ARMS = [
    {
      // Research 97 §3 corrects research 83 D.2: under `plaintext-only` a real
      // Enter reports `insertLineBreak` and NOT `insertParagraph`, so a phase
      // handling only the latter refuses Enter in silence.
      name: 'Enter is bytes, and it arrives as insertLineBreak',
      key: 'enterIsBytes',
      expect: (a) =>
        a.lineBreak.answered === true &&
        a.paragraph.answered === true &&
        a.onlyANewline === true &&
        a.lineBreak.caret === a.paragraph.caret,
      file: 'redline-typing.ts',
      from: "const LINE_BREAKS = new Set(['insertLineBreak', 'insertParagraph']);",
      to: "const LINE_BREAKS = new Set(['insertParagraph']);"
    },
    {
      // Research 97 §3.1: a redraw landing inside an open composition breaks
      // the composition and puts the committed text in a plain span, which
      // counts on the baseline side too and took the projection out by two.
      name: 'an outside write is HELD while a composition is open',
      key: 'compositionHeld',
      expect: (a) =>
        a.heldDuring === true &&
        a.heldApplied === true &&
        a.currentExact === true &&
        a.baselineExact === true &&
        a.japaneseInsideAChange === true,
      file: 'redline-typing.ts',
      from:
        '  if (state.composing !== null) {\n' +
        '    return state.held === event.text ? state : { ...state, held: event.text };\n' +
        '  }\n',
      to: ''
    },
    {
      name: "the input events a composition owns are the composition's",
      key: 'compositionIgnored',
      expect: (a) =>
        a.insertCompositionTextIgnored === true &&
        a.insertTextIgnored === true &&
        a.deleteIgnored === true &&
        a.ignoredWithNoComposition === true,
      file: 'redline-typing.ts',
      from: '    if (state.composing !== null) return state;',
      to: '    if (false) return state;'
    },
    {
      // The one door no `preventDefault` closes, read three times out of three
      // off the event itself. THE ABLATION CARRIES TWO EDITS ON PURPOSE, the
      // way conformance:logins' do: this event is guarded twice, once by the
      // named refusal and once by the default that answers nothing for an
      // input type nobody measured, so removing either alone changes nothing a
      // person could see. It plants the shape the rule refuses, being a later
      // round deciding to insert the composition's own text.
      name: 'insertCompositionText is ignored even with no composition open',
      key: 'compositionIgnored',
      file: 'redline-typing.ts',
      expect: (a) => a.ignoredWithNoComposition === true,
      edits: [
        {
          from: "    if (event.inputType === 'insertCompositionText') return state;",
          to: '    if (false) return state;'
        },
        {
          from: "const INSERTS = new Set([\n  'insertText',",
          to: "const INSERTS = new Set([\n  'insertCompositionText',\n  'insertText',"
        }
      ]
    },
    {
      // Research 97 §2.2's eight readings, four shapes with a caret in each.
      // The expected answer is re-derived in the probe by a hand walk over the
      // two texts, so this is not the module checking itself.
      name: 'the caret comes back through a redraw with 0 characters of error',
      key: 'caretThroughRedraw',
      expect: (a) =>
        a.length === 4 &&
        a.every((one) => one.error === 0) &&
        // …and the naive answer is really different on three of the four, or
        // an arm that restores nothing would read as a pass.
        a.filter((one) => one.naive !== one.got).length === 3,
      file: 'text-edit.ts',
      from:
        '  if (clamped <= prefix) return clamped;\n' +
        '  if (clamped >= oldEnd) return newText.length - (oldText.length - clamped);\n' +
        '  return prefix;',
      to: '  return clamped;'
    },
    {
      // The whole point: a keystroke folds into the CURRENT side, the composer
      // is handed the SAME baseline, and both projections stay exact.
      name: 'typing folds into the current side and the baseline does not move',
      key: 'projection',
      expect: (a) =>
        a.baselineBefore === true &&
        a.baselineAfter === true &&
        a.currentAfter === true &&
        a.insideAChange === true &&
        a.caret === a.expectedCaret &&
        a.edits === 7 &&
        JSON.stringify(a.stateKeys) ===
          JSON.stringify(['caret', 'composing', 'edits', 'held', 'text']),
      file: 'redline-typing.ts',
      from: '  return text.slice(0, edit.start) + edit.text + text.slice(edit.end);',
      to: '  return text.slice(0, edit.start) + edit.text + text.slice(edit.end + 1);'
    }
  ];

  const shippingTypingRead = runTypingProbe(EDITOR_DIR);
  if (shippingTypingRead.error !== undefined) {
    fail(`17. the typing probe did not run: ${shippingTypingRead.error}`);
  } else {
    for (const arm of TYPING_ARMS) {
      if (!arm.expect(shippingTypingRead[arm.key])) {
        fail(
          `17. the shipping typing read the wrong thing for "${arm.name}": ${JSON.stringify(shippingTypingRead[arm.key])}`
        );
      }
    }
    // THE ABLATED COPIES ARE SIBLINGS OF THE FILES THEY ABLATE, and the depth
    // is exact, for the reason `build/conformance-credentials.mjs` states over
    // its own `.p204-ablation-` copies. The chain reaches `diff`,
    // `@pierre/diffs` and `@shared/fs-ops`, so a copy in the system temporary
    // directory cannot resolve any of the three: every ablation would fail to
    // IMPORT rather than fail the rule it removed, and a suite red for the
    // wrong reason proves as little as one green for the wrong reason. The
    // name begins with a dot so neither TypeScript's include globs nor the
    // test runner picks it up, and the `finally` below removes every one of
    // them and then sweeps the directory for anything a kill left behind.
    const prefix = `.p237-ablation-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    try {
      for (const [i, arm] of TYPING_ARMS.entries()) {
        const dir = join(EDITOR_DIR, `${prefix}${String(i)}`);
        mkdirSync(dir, { recursive: true });
        made.push(dir);
        for (const f of TYPING_CHAIN) cpSync(join(EDITOR_DIR, f), join(dir, f));
        const target = join(dir, arm.file);
        const before = readFileSync(target, 'utf8');
        const edits = arm.edits ?? [{ from: arm.from, to: arm.to }];
        let ablated_source = before;
        let missing = false;
        for (const edit of edits) {
          if (!ablated_source.includes(edit.from)) {
            fail(`17. the ablation for "${arm.name}" found nothing to edit in ${arm.file}`);
            missing = true;
            break;
          }
          ablated_source = ablated_source.replace(edit.from, edit.to);
        }
        if (missing) continue;
        writeFileSync(target, ablated_source);
        const ablated = runTypingProbe(dir);
        if (ablated.error !== undefined) {
          fail(`17. the ablation for "${arm.name}" stopped the probe running (${ablated.error}), so it proves nothing`);
          continue;
        }
        const moved =
          JSON.stringify(ablated[arm.key]) !== JSON.stringify(shippingTypingRead[arm.key]);
        if (moved) red += 1;
        else {
          fail(
            `17. the ablation for "${arm.name}" changed nothing this arm reads, so it cannot fail: ${JSON.stringify(ablated[arm.key])}`
          );
        }
      }
      say(
        `17b. ${String(TYPING_ARMS.length)} arms over the shipping typing rules, and ${String(red)} of ${String(TYPING_ARMS.length)} ablations moved their arm's reading`
      );
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      for (const name of readdirSync(EDITOR_DIR)) {
        if (name.startsWith(prefix) && existsSync(join(EDITOR_DIR, name))) {
          rmSync(join(EDITOR_DIR, name), { recursive: true, force: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 18. THE CURRENT CHANGE (Phase 239). Two halves, because a later round can
// undo either without touching the other.
//
// 18a is a SCAN: neither the module that decides which change is current nor
// the view's own step may read `document.activeElement`. That single word is
// the whole of both defects research 99 measured. Reading the position off the
// focus is what swallowed the first ⌥↓ of a view (section 2.2, two runs), and
// holding the ELEMENT rather than the identity is what let an outside write
// take the person's place away while the change was still drawn with the same
// identity, offset and generation (section 2.3). `focusedChange` KEEPS its
// read, because it is the fallback for a hover that has never been stepped
// from, so the scan is aimed at the two places the decision now lives and is
// proved on plants that must fail.
//
// 18b DRIVES the shipping module under node through
// build/redline-current-probe.mts and ablates the clause behind each arm. The
// ablation directories are in the SYSTEM TEMPORARY DIRECTORY and not inside
// `src/`: this module's only import is `import type`, which is erased, so a
// copy resolves nothing at runtime and runs exactly where it is put.
// ---------------------------------------------------------------------------
{
  const CURRENT_FILE = 'src/renderer/editor/redline-current.ts';
  const VIEW_FILE = 'src/renderer/editor/RedlineDocument.tsx';

  // 18a. The scan.
  const currentSource = readFileSync(CURRENT_FILE, 'utf8');
  if (stripComments(currentSource).includes('activeElement')) {
    fail(`18a. ${CURRENT_FILE} names activeElement, so the current change is a focus again and the recompose takes it away (research 99 §2.3)`);
  }
  const viewSource = readFileSync(VIEW_FILE, 'utf8');
  const stepBody = functionBodyOf(stripComments(viewSource), 'step');
  const arrowStep = /const\s+step\s*=\s*useCallback\(/.test(viewSource);
  if (stepBody === null && !arrowStep) {
    fail(`18a. ${VIEW_FILE} declares no step, so the chord walks from something this rule cannot read`);
  }
  // The step is an arrow inside useCallback, so its body is read from the
  // `const step` line to the line that closes the callback at the same indent.
  const stepText = (() => {
    const at = viewSource.indexOf('const step = useCallback(');
    if (at === -1) return null;
    const end = viewSource.indexOf('\n  );', at);
    return end === -1 ? null : stripComments(viewSource.slice(at, end));
  })();
  if (stepText === null) {
    fail(`18a. could not read the step's own body out of ${VIEW_FILE}`);
  } else if (stepText.includes('activeElement')) {
    fail(`18a. the step in ${VIEW_FILE} reads activeElement, which is the swallowed first press (research 99 §2.2)`);
  }
  // The scanner is proved on plants, so a scan that cannot fail is never
  // mistaken for a scan that passed.
  const PLANTS = [
    { name: 'a clean step', text: 'const step = useCallback((d) => { walk(held, d); }\n  );', caught: false },
    { name: 'the focus put back', text: 'const step = useCallback((d) => { const a = host.ownerDocument.activeElement; walk(a, d); }\n  );', caught: true },
    { name: 'the focus in a comment only', text: 'const step = useCallback((d) => { /* not activeElement */ walk(held, d); }\n  );', caught: false }
  ];
  let plantsOk = 0;
  for (const plant of PLANTS) {
    const at = plant.text.indexOf('const step = useCallback(');
    const end = plant.text.indexOf('\n  );', at);
    const body = stripComments(plant.text.slice(at, end));
    if (body.includes('activeElement') === plant.caught) plantsOk += 1;
    else fail(`18a. the scanner behaved wrongly on the plant "${plant.name}"`);
  }
  // And the fallback is still there, or the scan above is a scan of nothing.
  if (!viewSource.includes('focusedChange')) {
    fail('18a. the view no longer names focusedChange at all, so a hovered change with no step has no identity to press');
  }
  say(`18a. the current change and the step name no activeElement (${String(plantsOk)} of ${String(PLANTS.length)} scanner plants behaved), and the hover fallback is still named`);

  // 18b. The driven half.
  const runCurrentProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-current-probe.mts'],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, CURRENT_DIR: dir }
      }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const CURRENT_ARMS = [
    {
      name: 'from nowhere, next is the first change and previous the last',
      key: 'fromNowhere',
      expect: (a) => same(a, [0, 8]),
      from: '  if (at === null) return delta === 1 ? 0 : count - 1;',
      to: '  if (at === null) return null;'
    },
    {
      name: 'at either end the position stays, and an empty document steps nowhere',
      key: 'ends',
      expect: (a) => same(a, [0, 8, null]),
      from: '  return Math.min(count - 1, Math.max(0, at + delta));',
      to: '  return (at + delta + count) % count;'
    },
    {
      name: 'six positions, being the whole of the step',
      key: 'six',
      expect: (a) => same(a, [1, 0, 5, 3, 8, 7]),
      from: 'export function stepIndex(\n  count: number,\n  at: number | null,\n  delta: 1 | -1\n): number | null {\n  if (count <= 0) return null;',
      to: 'export function stepIndex(\n  count: number,\n  at: number | null,\n  delta: 1 | -1\n): number | null {\n  if (count <= 0) return null;\n  delta = (delta === 1 ? -1 : 1) as 1 | -1;'
    },
    {
      name: 'THE RECOMPOSE: 9 changes become 10 and the place is still found',
      key: 'recompose',
      expect: (a) => same(a, { before: 6, sameObject: false, after: 7, rewound: null }),
      from: '  return a.off === b.off && a.del === b.del;',
      to: '  return (a as unknown) === (b as unknown);'
    },
    {
      name: 'a change is the span of baseline it covers, so a commit keeps your place',
      key: 'identity',
      expect: (a) =>
        same(a, {
          acrossGenerations: true,
          typedInto: true,
          differentBaselineSpan: false,
          differentOffset: false,
          noIdentity: null
        }),
      from: '  return a.off === b.off && a.del === b.del;\n}',
      to: '  return a.off === b.off && a.del === b.del && a.generation === b.generation;\n}'
    },
    {
      // THE FIX ROUND'S FINDING 1, AS THE CLAUSE THAT CAUSED IT. Phase 237
      // ships typing in this document, and typing rewrites `ins` on every
      // keystroke: with `ins` in the identity the verifier typed three
      // characters into the change the controls were drawn on and read the
      // chip GONE with 0 changes marked, 3 runs of 3, where the parent commit
      // kept them 3 of 3. The ablation is exactly the clause that shipped.
      name: 'THE TYPED-INTO CHANGE: three characters do not move the controls',
      key: 'identity',
      expect: (a) => a !== undefined && a.typedInto === true,
      from: '  return a.off === b.off && a.del === b.del;\n}',
      to: '  return a.off === b.off && a.del === b.del && a.ins === b.ins;\n}'
    },
    {
      name: 'a wrapper with no identity on it is never the current change',
      key: 'identity',
      expect: (a) => a !== undefined && a.noIdentity === null,
      from: '  if (!Number.isInteger(off) || !Number.isInteger(generation)) return null;',
      to: '  if (false) return null;'
    },
    {
      // RESEARCH 99 §2.2 AS A NUMBER. Three presses from a fresh view read 0,
      // 1, 2. A rule that reads its position from a focus that never arrived
      // reads 0, 0, 0 — the chord repeating the first change for ever.
      name: 'THE SWALLOWED FIRST PRESS: three presses walk 0, 1, 2',
      key: 'walk',
      expect: (a) => same(a, [0, 1, 2]),
      from: '  const next = stepIndex(items.length, indexOfChange(items, id), delta);',
      to: '  const next = stepIndex(items.length, null, delta);'
    },
    {
      // THE FIX ROUND'S FINDING 2. The view restores the caret after every
      // recompose, by current-side offset; a write ABOVE it leaves those
      // offsets on different text, and reading the `selectionchange` that
      // follows as the person's own move put the mark, the chip and the ⌥⌫
      // target on the change a shell had just made while the held change was
      // still drawn two rows below. The ablation is the restore comparison
      // taken out, which is what shipped.
      name: 'THE RESTORED CARET IS NOT A MOVE, and a caret elsewhere is silence',
      key: 'caret',
      expect: (a) =>
        same(a, {
          person: 'moved, on calm',
          restore: 'no move',
          elsewhere: 'no move',
          onProse: 'moved, on no change',
          firstEver: 'moved, on quick brown foxes'
        }),
      from: '  if (restored !== null && restored.anchor === now.anchor && restored.focus === now.focus) {\n    return null;\n  }',
      to: '  if (false) {\n    return null;\n  }'
    },
    {
      // THE FIX ROUND'S FINDING 3. The controls could be summoned and never
      // put away: the verifier clicked plain prose far from any change and
      // read the chip still drawn on change 0, where the parent read it gone.
      // The ablation is the chrome clause, because a rule that only asked
      // "not a change" would put the controls away every time somebody
      // reached for the chip, which lives outside the document.
      name: 'A PRESS ON THE PROSE LETS GO, and a press on the chrome does not',
      key: 'letGo',
      expect: (a) => same(a, { prose: true, change: false, chip: false, nothing: false }),
      from: '  return target.closest(DOC_SELECTOR) !== null;',
      to: '  return true;'
    },
    {
      // THE COMMITTER'S ROUND, AND IT IS THIS PHASE'S OWN SUBJECT IN A SHAPE
      // NO ARM ABOVE COULD PRODUCE. Every outside write the arms above drive
      // ADDS a change, so the wrapper is replaced and the chip's anchor prop
      // moves with it. A write that MERGES into a change keeps the count,
      // React reuses the very same DOM node, the prop is `Object.is`-equal and
      // nothing re-measures: the chip's bottom stood at 622.24 while the change
      // it names moved to 647.69, a gap of 25.44px against the 4.00px it is
      // drawn with, a whole line above the phrase, over unrelated prose, and it
      // was still there four seconds later. The ablation is what shipped.
      name: 'THE MERGED WRITE: a wrapper that SURVIVED the recompose is measured again',
      key: 'measure',
      expect: (a) => a !== undefined && a.survived === true,
      from: '  return now !== null && now === before;\n}',
      to: '  return false;\n}'
    },
    {
      // And the other side of it, because a rule that answered "yes" to
      // everything would spend a whole extra render on every draw and would
      // ask the chip to measure an element React is in the middle of
      // replacing. A DIFFERENT element needs nothing, because its own prop
      // moved; nothing drawn needs nothing, because there is no chip.
      name: 'and a REPLACED wrapper is not, nor is a face with no controls on it',
      key: 'measure',
      expect: (a) =>
        same(a, { survived: true, replaced: false, goneNow: false, fresh: false, neither: false }),
      from: '  return now !== null && now === before;',
      to: '  return now === before;'
    }
  ];

  const shippingCurrent = runCurrentProbe('src/renderer/editor');
  if (shippingCurrent.error !== undefined) {
    fail(`18b. the current-change probe did not run: ${shippingCurrent.error}`);
  } else {
    for (const arm of CURRENT_ARMS) {
      if (!arm.expect(shippingCurrent[arm.key])) {
        fail(`18b. the shipping module read the wrong thing for "${arm.name}": ${JSON.stringify(shippingCurrent[arm.key])}`);
      }
    }
    // THE ABLATED COPIES LIVE IN A SCRATCH DIRECTORY OUTSIDE `src/`, removed in
    // a finally. `redline-current.ts`'s only import is `import type`, erased at
    // runtime, so a copy anywhere resolves everything it needs, which is
    // nothing.
    const scratch = mkdtempSync(join(tmpdir(), 'p239-ablation-'));
    let red = 0;
    try {
      for (const [i, arm] of CURRENT_ARMS.entries()) {
        const dir = join(scratch, String(i));
        mkdirSync(dir, { recursive: true });
        const before = readFileSync(CURRENT_FILE, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`18b. the ablation for "${arm.name}" found nothing to edit in ${CURRENT_FILE}`);
          continue;
        }
        writeFileSync(join(dir, 'redline-current.ts'), before.replace(arm.from, arm.to));
        const ablated = runCurrentProbe(dir);
        if (ablated.error !== undefined) {
          fail(`18b. the ablation for "${arm.name}" stopped the probe running (${ablated.error}), so it proves nothing`);
          continue;
        }
        if (!same(ablated[arm.key], shippingCurrent[arm.key])) red += 1;
        else {
          fail(`18b. the ablation for "${arm.name}" changed nothing this arm reads, so it cannot fail: ${JSON.stringify(ablated[arm.key])}`);
        }
      }
      say(`18b. ${String(CURRENT_ARMS.length)} arms over the shipping current change, and ${String(red)} of ${String(CURRENT_ARMS.length)} ablations moved their arm's reading`);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }

  // 18c. THE WIRING, WHICH 18b CANNOT SEE.
  //
  // `chipNeedsMeasure` is a pure function and this repository carries no jsdom,
  // so nothing in `npm test` and nothing in 18b can tell a rule that is CALLED
  // from a rule that merely compiles. The defect it exists for is exactly a
  // wiring one: the answer was always available and nobody asked for it, and
  // the chip stayed 25.44px from the change it names. So the two ends are read
  // out of the real source — the view must ask the question in the same layout
  // effect that finds the marked wrapper, and the chip's placement effect must
  // DEPEND on the token the answer moves, because a token nothing depends on
  // re-measures nothing. The scanner is proved on plants that must fail.
  const CHIP_FILE = 'src/renderer/editor/redline-chip.tsx';
  /** Every `useLayoutEffect` in a source, as its body text and its deps text. */
  const layoutEffects = (text) => {
    const out = [];
    let at = text.indexOf('useLayoutEffect(');
    while (at !== -1) {
      const close = text.indexOf('}, [', at);
      if (close === -1) break;
      const end = text.indexOf(']', close);
      out.push({
        body: text.slice(at, close),
        deps: end === -1 ? '' : text.slice(close + 4, end)
      });
      at = text.indexOf('useLayoutEffect(', close);
    }
    return out;
  };
  const chipSource = readFileSync(CHIP_FILE, 'utf8');
  const chipEffects = layoutEffects(stripComments(chipSource));
  const placing = chipEffects.find((e) => e.body.includes('chipAnchorRect('));
  if (placing === undefined) {
    fail(`18c. ${CHIP_FILE} has no layout effect that places the chip, so this rule reads nothing`);
  } else if (!/\bplacement\b/.test(placing.deps)) {
    fail(`18c. the chip's placement effect does not depend on the view's placement token (deps: ${placing.deps.trim()}), so a wrapper that SURVIVED a recompose is never measured again — the 25.44px the committer's round measured`);
  }
  const marking = layoutEffects(stripComments(viewSource)).find((e) =>
    e.body.includes('setCurrentEl(')
  );
  if (marking === undefined) {
    fail(`18c. ${VIEW_FILE} has no layout effect that finds the marked wrapper, so this rule reads nothing`);
  } else if (!marking.body.includes('chipNeedsMeasure(')) {
    fail(`18c. ${VIEW_FILE} finds the marked wrapper and never asks chipNeedsMeasure, so a reused wrapper leaves the controls at the pixel the old layout put them at`);
  }
  if (!/placement=\{/.test(viewSource)) {
    fail(`18c. ${VIEW_FILE} never hands the chip a placement token at all`);
  }
  // The scanner, proved on plants. Three of the five must fail, and each one
  // is a real way a later round takes this out: the dep dropped, the ask
  // dropped, and the name left in a comment where it means nothing.
  const WIRE_PLANTS = [
    {
      name: 'the shipping shape',
      chip: 'useLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef, placement]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el); if (chipNeedsMeasure(a, b)) remeasure();\n  }, [current, composed]);',
      ok: true
    },
    {
      name: 'the token dropped from the deps',
      chip: 'useLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el); if (chipNeedsMeasure(a, b)) remeasure();\n  }, [current, composed]);',
      ok: false
    },
    {
      name: 'the question never asked',
      chip: 'useLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef, placement]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el);\n  }, [current, composed]);',
      ok: false
    },
    {
      name: 'the token named only in a comment',
      chip: 'useLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef /* placement */]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el); if (chipNeedsMeasure(a, b)) remeasure();\n  }, [current, composed]);',
      ok: false
    },
    {
      name: 'a second effect beside the placing one, which must not answer for it',
      chip: 'useLayoutEffect(() => { measureNothing();\n  }, [placement]);\nuseLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef, placement]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el); if (chipNeedsMeasure(a, b)) remeasure();\n  }, [current, composed]);',
      ok: true
    }
  ];
  let wireOk = 0;
  for (const plant of WIRE_PLANTS) {
    const c = layoutEffects(stripComments(plant.chip)).find((e) =>
      e.body.includes('chipAnchorRect(')
    );
    const v = layoutEffects(stripComments(plant.view)).find((e) =>
      e.body.includes('setCurrentEl(')
    );
    const passes =
      c !== undefined &&
      v !== undefined &&
      /\bplacement\b/.test(c.deps) &&
      v.body.includes('chipNeedsMeasure(');
    if (passes === plant.ok) wireOk += 1;
    else fail(`18c. the scanner behaved wrongly on the plant "${plant.name}"`);
  }
  say(`18c. the view asks chipNeedsMeasure where it finds the mark and the chip's placement depends on the token (${String(wireOk)} of ${String(WIRE_PLANTS.length)} scanner plants behaved, ${String(WIRE_PLANTS.filter((p) => !p.ok).length)} of them must fail)`);
}


if (failures.length > 0) {
  console.error(`${TAG} ${String(failures.length)} failure(s):`);
  for (const line of failures) console.error(`${TAG}   ${line}`);
  process.exit(1);
}
say('every rule passed.');
process.exit(0);
