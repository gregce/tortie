#!/usr/bin/env node
/**
 * probe-p191-redline.mjs. ONE app run that proves the redline (Phase 191).
 *
 * ## Why this probe exists
 *
 * Two of the three claims under this phase cannot be read from source.
 *
 * The first is @pierre/diffs' annotation seam. Research 74 §3.1 read
 * `renderDiffChildren.js`, `createAnnotationElement.js` and
 * `DiffHunksRenderer.js` and concluded the slot would hand back a light-DOM
 * row that tokens.css reaches. Its own §10 says plainly that nothing was ever
 * rendered through it. A prototype row injected straight into Pierre's shadow
 * content measured correctly and then VANISHED, because showing the window
 * fires Pierre's own observers and it rebuilds that subtree. So this probe
 * reads the row off the running app, after a full rebuild driven through the
 * real Side by side button.
 *
 * The second is the clipboard. A copy handler can only be proved by reading
 * what the clipboard ACTUALLY received: reading back the string the handler
 * computed proves the handler, not the clipboard. GMUX_SHOT_CLIPBOARD=1 makes
 * main run the window's own Copy command at the selection the drive leaves in
 * place and print what the system clipboard then holds, having saved what it
 * held before and put it back.
 *
 * ## WHAT IT PROVES, every cell read off the running app or re-derived here
 *
 *   #   what must be true                                       read from
 *   --  -----------------------------------------------------   ------------
 *    0  the drive answered with a reading                        the drive
 *    1  in TWO columns the control is present and disabled       the document
 *       and says why, and no redline row is drawn
 *    2  in one column it is enabled, unpressed, and still         the document
 *       draws nothing until it is clicked
 *    3  the click draws a row per change block, marks the        the document
 *       button pressed, and writes gmux.diffRedline
 *    4  every row is in the LIGHT DOM, inside diffs-container,   the document
 *       display block, white-space normal
 *    5  the demo row holds four deletions and four insertions    rectangles
 *       in ONE element, and in THAT block, which is four words
 *       replaced in place, each insertion is on the SAME line as
 *       its deletion and immediately after it
 *    6  the deletions are --error and struck through, the        getComputedStyle
 *       insertions are --success and not, both equal to the
 *       tokens read live off the document
 *    7  THE NAMED INDEPENDENT METHOD: jsdiff called HERE over    node + the DOM
 *       the fixture's own blocks equals the drawn runs
 *    8  A SECOND INDEPENDENT METHOD: git diff --word-diff        git + the DOM
 *       agrees on which words went and which arrived
 *    9  three deleted lines and one inserted line draw ONE row   the document
 *       over the joined text, not three
 *   10  the redline row carries NO line number and NO change     the shadow DOM
 *       mark, and no numbered row lost its number
 *   11  the block the guard gave up on says so in the note       the document
 *   12  the rows survive a scroll to the end and back            the document
 *   13  the row REFLOWS when the panel is squeezed to its floor  rectangles
 *   14  two columns with the mode on disables the control and    the document
 *       removes every row, and the preference is untouched
 *   15  one column brings them back                              the document
 *   16  a file that is not prose draws the bar and NO control    the document
 *   17  a second prose file draws rows with no click at all      the document
 *   18  with the redline off the clipboard gets the browser's    the system
 *       own answer, being every line of the diff                 clipboard
 *   19  turning the redline on takes NOTHING away from a copy    the system
 *       of the whole diff, because the handler stands aside      clipboard
 *       for a selection it cannot rebuild exactly
 *   20  THE CLIPBOARD: one selected row copies the NEW text,     the system
 *       byte for byte, carrying none of the deleted words        clipboard
 *   21  the control row this phase added a control to still      rectangles
 *       fits at the panel's 320px floor, with every control
 *       inside the row's own box
 *   22  a spacing only change draws a row that SAYS SO, with     the document
 *       no del and no ins, and neither a copy of that row nor      + the system
 *       a copy of the whole surface carries the tag                clipboard
 *   23  the person's own clipboard is put back exactly, its       pbpaste and
 *       flavour names included and not one added                  clipboard info
 *   24  the operator's session count did not move                tmux, read only
 *
 * ## SAFETY, ABSOLUTE
 *
 * Without GMUX_TMUX_SOCKET this script re-runs itself through
 * build/harness-socket.mjs, so the socket is always one that script composed
 * and ends afterwards, never `gmux` or `default`. The app gets its own user
 * data directory and its own scratch project under the harness directory. It
 * spawns no agent and spends no token. `-L gmux` appears in exactly one place,
 * a read only session count taken before and after, which must match. The
 * Electron goes through build/electron-run.mjs, whose kill is in a finally
 * block. The system clipboard is read before the run and compared after, and
 * main is what puts the prior contents back.
 *
 * Usage, from the repository root:
 *
 *   npm run probe:p191
 *
 * Exit 0 when every row passes, 1 otherwise with every failing row named,
 * 2 when the probe refuses to run.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { diffWords } from 'diff';
import { withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p191redline]';

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
      'gmux-p191-redline',
      'node build/probe-p191-redline.mjs'
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

/**
 * His clipboard, fingerprinted and never printed: the text as a length and a
 * digest, and the FLAVOUR NAMES `clipboard info` reports, which carry no
 * content. The flavours matter as much as the text, because a restore that
 * puts back only the text silently drops the rest, and a restore that writes
 * back a flavour the read INVENTED silently adds one. Both were measured on
 * 2026-09-01 and both are why this reads more than pbpaste.
 */
function clipboardFingerprint() {
  const out = spawnSync('pbpaste', [], { encoding: 'utf8' });
  const text = out.stdout ?? '';
  const info = spawnSync('osascript', ['-e', 'clipboard info'], { encoding: 'utf8' });
  return {
    bytes: Buffer.byteLength(text),
    md5: createHash('md5').update(text).digest('hex'),
    flavours: (info.stdout ?? '').trim()
  };
}
const clipBefore = clipboardFingerprint();
say(`the clipboard held ${String(clipBefore.bytes)} bytes before this run (md5 ${clipBefore.md5.slice(0, 8)})`);

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p191-redline');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');

/** Deterministic filler, so the rewritten block is the same on every machine. */
function words(count, seed) {
  const out = [];
  let x = seed;
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(`w${String(x % 500)}`);
  }
  return out.join(' ');
}

/**
 * THE FIXTURE, and it REPLACES WORDS on purpose.
 *
 * Research 74 warns that on a pure DELETION a redline and a plain
 * strikethrough are the same picture in every implementation including Word's,
 * so a deletion fixture cannot show this feature works. The operator's own
 * edit was a pure deletion, which is why the shipped control looked broken to
 * him. So block 1 is four word REPLACEMENTS in one sentence, which is the
 * picture he drew.
 *
 * Every block is separated from its neighbour by a context line, so the diff
 * groups them the way this list does and the comparison below is meaningful
 * rather than lucky. The blocks, in order:
 *
 *   1  four word replacements in one line, the demonstration
 *   2  three lines deleted and one inserted, the multi line ruling
 *   3  a second replacement, one line, for the git word-diff comparison
 *   4  a spacing only change, which the row cannot draw and must say so
 *   5  a pure deletion, which draws all red and is the picture to avoid
 *   6  a pure insertion, which draws all green
 *   7  a fully rewritten paragraph, which defeats maxEditLength and must be
 *      named in the note rather than silently missing
 */
const BLOCKS = [
  {
    name: 'four replacements',
    old: ['The quick brown fox jumped over the lazy dog near the river bank.'],
    new: ['The quick red fox leapt over the sleepy dog beside the river bank.']
  },
  {
    name: 'three into one',
    old: ['Alpha beta gamma.', 'Delta epsilon zeta.', 'Eta theta iota.'],
    new: ['Alpha beta gamma delta epsilon zeta eta theta iota.']
  },
  {
    name: 'second replacement',
    old: ['We ship on Tuesday, said the manager.'],
    new: ['We ship on Thursday, said the director.']
  },
  {
    /**
     * THE SPACING ONLY BLOCK. `normalizeBlockText` collapses every run of
     * whitespace, which is what lets three lines read as one sentence, and it
     * is also what makes these two sides identical. Before the fix round this
     * drew one unmarked span under a pair of rows the diff had painted red and
     * green, which is a row saying nothing changed under a block that did.
     */
    name: 'spacing only',
    old: ['Spaced   out     words   here.'],
    new: ['Spaced out words here.']
  },
  {
    name: 'pure deletion',
    old: ['This whole paragraph goes away entirely.'],
    new: []
  },
  {
    name: 'pure insertion',
    old: [],
    new: ['An entirely new paragraph arrives here.']
  },
  {
    /**
     * THE REFLOW BLOCK, and its shape is deliberate. A redline row is a child
     * of Pierre's own content column, so its width follows the DIFF's content
     * width whenever that is wider than the panel, not the panel itself. To
     * see a row reflow you therefore need a block whose joined text is long
     * while every one of its source LINES is short. Ten lines of about forty
     * characters give a four hundred character redline over a column no wider
     * than the demonstration line above, so squeezing the panel really does
     * narrow the row and the row really does wrap further.
     */
    name: 'long paragraph',
    old: [
      'The report opened with a careful note',
      'about the timing of the release and',
      'the people who would be affected by',
      'it, and then said very little else',
      'that anyone could act on that week.',
      'A second reader asked for numbers and',
      'was given three paragraphs of prose',
      'instead, which is the usual answer',
      'when nobody has counted anything at',
      'all before the meeting was called.'
    ],
    new: [
      'The report opened with a careful memo',
      'about the timing of the launch and',
      'the people who would be helped by',
      'it, and then said very little more',
      'that anyone could act on that month.',
      'A second reader asked for figures and',
      'was given four paragraphs of prose',
      'instead, which is the common answer',
      'when nobody had counted anything at',
      'all before the meeting was arranged.'
    ]
  },
  {
    // Twenty short lines rather than one enormous one, so the widest line in
    // the fixture stays the demonstration sentence and the diff's content
    // column keeps a sane width for the block above.
    name: 'rewritten past the guard',
    old: Array.from({ length: 20 }, (_, i) => words(15, 77 + i * 3)),
    new: Array.from({ length: 20 }, (_, i) => words(15, 78 + i * 3))
  }
];

const CONTEXT = [
  'Release notes for the quarter.',
  'The middle stays as it is.',
  'Nothing about this line changes.',
  'A settled line divides the blocks.',
  'Another untouched line sits here.',
  'And one more, so blocks never merge.',
  'The paragraph before is untouched.',
  'One more untouched line.',
  'The last line never moves.'
];

function buildSide(which) {
  const lines = [];
  for (const [index, block] of BLOCKS.entries()) {
    lines.push(CONTEXT[index] ?? 'context', '');
    for (const line of block[which]) lines.push(line);
    if (block[which].length > 0) lines.push('');
  }
  lines.push(CONTEXT[CONTEXT.length - 1] ?? 'context', '');
  return lines.join('\n');
}
const OLD_NOTES = buildSide('old');
const NEW_NOTES = buildSide('new');

/** A second prose file, markdown this time, opened with the mode already on. */
const OLD_GUIDE = '# Guide\n\nThe old sentence names the wrong person entirely.\n';
const NEW_GUIDE = '# Guide\n\nThe new sentence names the right person entirely.\n';

/** A file that is NOT prose: the control must not be drawn for it at all. */
const OLD_CODE = 'export const answer = 41;\nexport const other = 1;\n';
const NEW_CODE = 'export const answer = 42;\nexport const other = 1;\n';

writeFileSync(join(project, 'notes.txt'), OLD_NOTES);
writeFileSync(join(project, 'guide.md'), OLD_GUIDE);
writeFileSync(join(project, 'sample.ts'), OLD_CODE);
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  [
    '-c',
    'user.email=p191@example.invalid',
    '-c',
    'user.name=p191 probe',
    'commit',
    '-q',
    '-m',
    'p191 fixture'
  ]
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}
writeFileSync(join(project, 'notes.txt'), NEW_NOTES);
writeFileSync(join(project, 'guide.md'), NEW_GUIDE);
writeFileSync(join(project, 'sample.ts'), NEW_CODE);

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

let reading = null;
let clipboard = null;
let priorFormats = null;
let text = '';
await withElectron(
  {
    label: 'p191-redline',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    env: {
      GMUX_SHOT: join(scratch, 'p191-redline.png'),
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '3000',
      // One copy per selection, each set up in the driven window first. The
      // renderer cannot copy: `document.execCommand('copy')` is gated on user
      // activation an async drive no longer has, measured returning false with
      // no event fired at all.
      GMUX_SHOT_CLIPBOARD: JSON.stringify([
        "window.__gmuxRedlineSelect('off')",
        "window.__gmuxRedlineSelect('mixed')",
        "window.__gmuxRedlineSelect('row')"
      ]),
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        openRel: 'notes.txt',
        mode: 'diff',
        editorWidth: 1200,
        redline: { codeRel: 'sample.ts', secondRel: 'guide.md' }
      }),
      GMUX_SHOT_JS: 'window.__gmuxP191Redline'
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
    const readOne = (marker) => {
      const at = text.lastIndexOf(marker);
      if (at === -1) return null;
      const line = text.slice(at + marker.length).split('\n')[0] ?? '';
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    };
    reading = readOne('[gmux-shot] probe ');
    clipboard = readOne('[gmux-shot] clipboard ');
    // The MIME-ish names main saw on the pasteboard before the drive. The
    // restore decides which flavours to put back by matching them loosely, so
    // if these names ever change shape the restore quietly stops putting back
    // html, rtf and images. Reading them here is what makes that visible.
    priorFormats = readOne('[gmux-shot] clipboard-formats ');
  }
);

// ---------------------------------------------------------------------------
// The judgement.
// ---------------------------------------------------------------------------

const failures = [];
const results = [];
function check(step, claim, pass, detail) {
  results.push({ step, claim, verdict: pass ? 'pass' : 'FAIL', detail });
  if (!pass) failures.push(`${String(step)}. ${claim}. ${detail}`);
}

/** The gate's own normalisation, written here rather than imported. */
function normalize(lines) {
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

/** Words for the git comparison: whitespace runs with sentence punctuation trimmed. */
const PUNCT = /^[.,;:!?"'`()[\]{}]+|[.,;:!?"'`()[\]{}]+$/g;
const compareWords = (s) =>
  s
    .split(/\s+/)
    .map((w) => w.replace(PUNCT, ''))
    .filter((w) => w !== '');

if (reading === null || typeof reading !== 'object') {
  failures.push('0. the drive printed no reading, so nothing was measured.');
  console.error(text.split('\n').slice(-60).join('\n'));
} else {
  const r = reading;
  const rows = Array.isArray(r.rows) ? r.rows : [];
  const runs = Array.isArray(r.runs) ? r.runs : [];
  const drawnBlocks = BLOCKS.filter((b) => b.name !== 'rewritten past the guard');

  check(0, 'the drive answered with a reading', true, `${String(rows.length)} row(s) read`);

  const split = r.inSplit ?? {};
  check(
    1,
    'in two columns the control is present, disabled, says why, and draws nothing',
    split.present === true &&
      split.disabled === true &&
      typeof split.title === 'string' &&
      split.title.includes('one column') &&
      split.rows === 0,
    `present ${String(split.present)}, disabled ${String(split.disabled)}, ` +
      `title ${JSON.stringify(split.title)}, rows ${String(split.rows)}`
  );

  const one = r.inOneColumn ?? {};
  check(
    2,
    'in one column it is enabled and unpressed and still draws nothing',
    one.present === true &&
      one.disabled === false &&
      one.pressed === 'false' &&
      one.label === 'Redline' &&
      one.rows === 0,
    `label ${JSON.stringify(one.label)}, disabled ${String(one.disabled)}, ` +
      `pressed ${String(one.pressed)}, rows ${String(one.rows)}`
  );

  const clicked = r.afterClick ?? {};
  check(
    3,
    'the click draws a row per change block and writes the preference',
    clicked.pressed === 'true' && rows.length === drawnBlocks.length && r.stored === '1',
    `pressed ${String(clicked.pressed)}, ${String(rows.length)} row(s) for ` +
      `${String(drawnBlocks.length)} block(s), stored ${JSON.stringify(r.stored)}`
  );

  check(
    4,
    'every row is Tortie’s own subtree in the light DOM inside Pierre’s container',
    rows.length > 0 &&
      rows.every(
        (row) =>
          row.lightDom === true &&
          row.insideContainer === true &&
          row.display === 'block' &&
          row.whiteSpace === 'normal' &&
          typeof row.slot === 'string' &&
          row.slot.startsWith('annotation-')
      ),
    rows
      .map(
        (row) =>
          `${String(row.lightDom)}/${String(row.insideContainer)}/${String(row.display)}/${String(row.whiteSpace)}/${String(row.slot)}`
      )
      .join(' ')
  );

  const demo = rows[0] ?? {};
  check(
    5,
    'the demonstration block, being four words replaced in place, holds four deletions and four insertions in one element, each insertion on the same line and immediately after its deletion',
    Array.isArray(demo.dels) &&
      demo.dels.length === 4 &&
      Array.isArray(demo.inses) &&
      demo.inses.length === 4 &&
      Array.isArray(demo.order) &&
      demo.order.join(',') === 'span,del,ins,span,del,ins,span,del,ins,span,del,ins,span' &&
      demo.firstPairSameTop === true &&
      demo.firstPairInsAfterDel === true,
    `dels ${JSON.stringify(demo.dels)}, inses ${JSON.stringify(demo.inses)}, ` +
      `order ${JSON.stringify(demo.order)}, del at ${JSON.stringify(demo.delRect)}, ` +
      `ins at ${JSON.stringify(demo.insRect)}`
  );

  const tokens = r.tokens ?? {};
  const rgb = (hex) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
    return m === null
      ? null
      : `rgb(${String(parseInt(m[1], 16))}, ${String(parseInt(m[2], 16))}, ${String(parseInt(m[3], 16))})`;
  };
  const wantError = rgb(String(tokens.error ?? ''));
  const wantSuccess = rgb(String(tokens.success ?? ''));
  check(
    6,
    'deletions are --error and struck through, insertions are --success and not',
    wantError !== null &&
      wantSuccess !== null &&
      rows.every(
        (row) =>
          (row.dels.length === 0 ||
            (row.delColor === wantError && row.delDecoration === 'line-through')) &&
          (row.inses.length === 0 ||
            (row.insColor === wantSuccess && row.insDecoration === 'none'))
      ),
    `--error ${String(tokens.error)} wants ${String(wantError)}, drew ${String(demo.delColor)} ` +
      `${String(demo.delDecoration)}; --success ${String(tokens.success)} wants ` +
      `${String(wantSuccess)}, drew ${String(demo.insColor)} ${String(demo.insDecoration)}`
  );

  // -- 7. THE NAMED INDEPENDENT METHOD --------------------------------------
  // jsdiff, called HERE, over the fixture blocks this file authored, compared
  // against the del and ins runs read off the DOM.
  {
    const mismatches = [];
    for (const [index, block] of drawnBlocks.entries()) {
      const mine = diffWords(normalize(block.old), normalize(block.new), {
        maxEditLength: 200,
        intlSegmenter: new Intl.Segmenter(undefined, { granularity: 'word' })
      });
      if (mine === undefined) {
        mismatches.push(`${block.name}: this file's own jsdiff call gave up`);
        continue;
      }
      const expected = mine
        .filter((part) => part.value !== '')
        .map((part) => ({
          kind: part.added ? 'ins' : part.removed ? 'del' : 'span',
          text: part.value
        }));
      const drawn = runs[index] ?? [];
      if (JSON.stringify(drawn) !== JSON.stringify(expected)) {
        mismatches.push(
          `${block.name}: drew ${JSON.stringify(drawn)} against ${JSON.stringify(expected)}`
        );
      }
    }
    check(
      7,
      'jsdiff re-derived here equals the del and ins runs read off the DOM',
      mismatches.length === 0,
      mismatches.length === 0
        ? `${String(drawnBlocks.length)} block(s) agreed run for run`
        : mismatches.join(' | ')
    );
  }

  // -- 8. A SECOND INDEPENDENT METHOD, and it is a different implementation --
  // `git diff --word-diff=porcelain` over the same working tree. Roughly
  // 12 ms a spawn, which makes it an excellent check and a bad shipping path.
  {
    const out = spawnSync(
      'git',
      ['diff', '--word-diff=porcelain', '--unified=0', '--', 'notes.txt'],
      { cwd: project, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }
    );
    const removed = [];
    const added = [];
    for (const line of (out.stdout ?? '').split('\n')) {
      if (line.startsWith('-') && !line.startsWith('---')) removed.push(...compareWords(line.slice(1)));
      else if (line.startsWith('+') && !line.startsWith('+++')) added.push(...compareWords(line.slice(1)));
    }
    // The single line blocks are the ones the two implementations can be held
    // to word for word: git's word diff has no notion of a block joined across
    // a line break, which is exactly the thing this phase added.
    const singles = ['four replacements', 'second replacement'];
    const mismatches = [];
    for (const name of singles) {
      const index = drawnBlocks.findIndex((b) => b.name === name);
      const drawn = runs[index] ?? [];
      const mineRemoved = drawn.filter((p) => p.kind === 'del').flatMap((p) => compareWords(p.text));
      const mineAdded = drawn.filter((p) => p.kind === 'ins').flatMap((p) => compareWords(p.text));
      for (const word of mineRemoved) {
        if (!removed.includes(word)) mismatches.push(`${name}: git did not remove ${word}`);
      }
      for (const word of mineAdded) {
        if (!added.includes(word)) mismatches.push(`${name}: git did not add ${word}`);
      }
    }
    check(
      8,
      'git diff --word-diff agrees on which words went and which arrived',
      out.status === 0 && mismatches.length === 0 && removed.length > 0,
      mismatches.length === 0
        ? `git removed ${String(removed.length)} and added ${String(added.length)} words; every drawn run is in them`
        : mismatches.join(' | ')
    );
  }

  {
    const index = drawnBlocks.findIndex((b) => b.name === 'three into one');
    const row = rows[index] ?? {};
    const block = drawnBlocks[index] ?? { old: [], new: [] };
    const collapsed = String(row.text ?? '').replace(/\s+/g, ' ').trim();
    // The normalisation ruling, checked rather than asserted: no run may carry
    // a newline, or a strikethrough would be drawn over an invisible
    // character (research 74 §6.5).
    const noNewlines = [...(row.dels ?? []), ...(row.inses ?? [])].every(
      (t) => !/[\n\r]/.test(t)
    );
    // The ORDER here is deliberately printed rather than asserted to be a
    // pair. jsdiff's shortest edit script puts the insertion BEFORE the
    // deletion on this block and they are not adjacent, which is honest
    // output and is written down in ./redline ruling 6.
    check(
      9,
      'three deleted lines and one inserted line draw ONE row over the joined text',
      rows.length === drawnBlocks.length &&
        collapsed.startsWith('Alpha beta gamma') &&
        collapsed.includes('theta iota.') &&
        noNewlines,
      `the three source lines were ${JSON.stringify(block.old)} and row ${String(index)} ` +
        `reads ${JSON.stringify(collapsed)}; no run carries a newline: ${String(noNewlines)}; ` +
        `its runs came out ${JSON.stringify((runs[index] ?? []).map((r) => r.kind))}, which is ` +
        'jsdiff’s own order and is not always deletion then insertion'
    );
  }

  const gutter = r.gutter ?? {};
  check(
    10,
    'the redline row carries no line number and no change mark, and no numbered row lost one',
    gutter.annotationCells === rows.length &&
      Array.isArray(gutter.annotationCellText) &&
      gutter.annotationCellText.every((t) => t.trim() === '') &&
      Array.isArray(gutter.annotationCellLineType) &&
      Array.isArray(gutter.numbers) &&
      gutter.numbers.length > 0,
    `${String(gutter.annotationCells)} annotation cell(s) for ${String(rows.length)} row(s), ` +
      `text ${JSON.stringify(gutter.annotationCellText)}, ` +
      `numbers ${JSON.stringify((gutter.numbers ?? []).slice(0, 16))}`
  );

  check(
    11,
    'the block the guard gave up on is named in the note rather than silently missing',
    typeof r.note === 'string' && r.note.includes('rewritten') && r.note.includes('1 change'),
    `note ${JSON.stringify(r.note)}`
  );

  const scrolled = r.afterScroll ?? {};
  check(
    12,
    'the rows survive a scroll to the end and back',
    scrolled.rows === rows.length && scrolled.scrollTop > 0,
    `${String(scrolled.rows)} row(s) at scrollTop ${String(scrolled.scrollTop)}`
  );

  const reflow = r.reflow ?? {};
  {
    // The long paragraph, whose lines are short: a redline row is a child of
    // Pierre's content column, so its width follows the DIFF's content width
    // whenever that is wider than the panel. Squeezing the panel only narrows
    // a row whose block has no long line in it.
    const index = drawnBlocks.findIndex((b) => b.name === 'long paragraph');
    const wide = (reflow.wide ?? [])[index] ?? {};
    const narrow = (reflow.narrow ?? [])[index] ?? {};
    check(
      13,
      'the row reflows when the panel is squeezed to its floor',
      reflow.narrowWidth < reflow.wideWidth &&
        narrow.width < wide.width &&
        narrow.height > wide.height,
      `panel ${String(reflow.wideWidth)}px to ${String(reflow.narrowWidth)}px and back to ` +
        `${String(reflow.backWidth)}px; the long paragraph's row went ${String(wide.width)}px ` +
        `wide and ${String(wide.height)}px tall to ${String(narrow.width)}px wide and ` +
        `${String(narrow.height)}px tall`
    );
  }

  const inSplitOn = r.splitWithRedlineOn ?? {};
  check(
    14,
    'two columns with the mode on disables the control, removes every row, and keeps the preference',
    inSplitOn.disabled === true &&
      inSplitOn.rows === 0 &&
      inSplitOn.pressed === 'false' &&
      inSplitOn.stored === '1',
    `disabled ${String(inSplitOn.disabled)}, rows ${String(inSplitOn.rows)}, ` +
      `pressed ${String(inSplitOn.pressed)}, stored ${JSON.stringify(inSplitOn.stored)}`
  );

  const back = r.backInOneColumn ?? {};
  check(
    15,
    'one column brings every row back',
    back.rows === rows.length && back.pressed === 'true' && back.disabled === false,
    `${String(back.rows)} row(s), pressed ${String(back.pressed)}`
  );

  const onCode = r.onCode ?? {};
  check(
    16,
    'a file that is not prose draws the control row and NO redline control',
    onCode.bar === true && onCode.present === false && onCode.rows === 0,
    `bar ${String(onCode.bar)}, control ${String(onCode.present)}, rows ${String(onCode.rows)}, ` +
      `preference still ${JSON.stringify(onCode.stored)}`
  );

  const onSecond = r.onSecond ?? {};
  check(
    17,
    'a second prose file draws a redline with no click at all',
    onSecond.present === true && onSecond.pressed === 'true' && onSecond.rows > 0,
    `${String(onSecond.rows)} row(s) on ${String(onSecond.rel)}, pressed ${String(onSecond.pressed)}`
  );

  // -- 18 to 20: the copies, each one a real Copy command and a real read ---
  //
  // Every one goes through the window's own Copy command in main and is read
  // back off the SYSTEM clipboard, because reading back the string the handler
  // computed proves the handler and not the clipboard.
  const steps = Array.isArray(clipboard) ? clipboard : [];
  const stepOf = (which) =>
    steps.find((one) => ((one ?? {}).setup ?? {}).which === which) ?? null;
  /** Lines of the fixture that only Pierre draws, being neither side's redline. */
  const PIERRE_ONLY = [
    'The quick brown fox jumped over the lazy dog near the river bank.',
    'The quick red fox leapt over the sleepy dog beside the river bank.',
    'Delta epsilon zeta.',
    'We ship on Tuesday, said the manager.'
  ];

  {
    const off = stepOf('off');
    const got = (off ?? {}).text;
    const setup = (off ?? {}).setup ?? {};
    const missing = PIERRE_ONLY.filter(
      (line) => typeof got !== 'string' || !got.includes(line)
    );
    check(
      18,
      'with the redline off the clipboard gets the browser’s own answer, every line of the diff',
      setup.rows === 0 && typeof got === 'string' && missing.length === 0,
      `rows ${String(setup.rows)}, ${String((got ?? '').length)} characters on the clipboard, ` +
        `missing ${JSON.stringify(missing)}. Selection.toString() over the same selection read ` +
        `${JSON.stringify(setup.drawn)}, which is the measurement that changed what shipped: a ` +
        'Range cannot see Pierre’s shadow rows and the clipboard serializer can.'
    );
  }

  {
    const off = stepOf('off');
    const mixed = stepOf('mixed');
    const got = (mixed ?? {}).text;
    const setup = (mixed ?? {}).setup ?? {};
    const perRow = Array.isArray(setup.perRow) ? setup.perRow : [];
    const missing = PIERRE_ONLY.filter(
      (line) => typeof got !== 'string' || !got.includes(line)
    );
    const rowsPresent = perRow.filter(
      (row) => typeof got === 'string' && got.includes(row.interleaved)
    );
    check(
      19,
      'turning the redline on takes nothing away from a copy of the whole diff',
      typeof got === 'string' &&
        missing.length === 0 &&
        perRow.length > 0 &&
        rowsPresent.length === perRow.length &&
        got.length > String((off ?? {}).text ?? '').length,
      `${String((got ?? '').length)} characters against ${String(String((off ?? {}).text ?? '').length)} ` +
        `with the redline off; missing ${JSON.stringify(missing)}; ` +
        `${String(rowsPresent.length)} of ${String(perRow.length)} redline rows are also there, ` +
        'so the handler stood aside for a selection it cannot rebuild exactly'
    );
  }

  {
    const row = stepOf('row');
    const setup = (row ?? {}).setup ?? {};
    const wanted = String(setup.expected ?? '');
    const got = (row ?? {}).text;
    const deleted = Array.isArray(setup.deleted) ? setup.deleted : [];
    const carriesDeleted = deleted.filter(
      (word) => typeof got === 'string' && word.trim() !== '' && got.includes(word)
    );
    check(
      20,
      'one selected row puts the NEW text on the system clipboard, byte for byte, carrying none of the deleted words',
      typeof got === 'string' && got === wanted && wanted !== '' && carriesDeleted.length === 0,
      `the row drew ${JSON.stringify(setup.drawn)}; the clipboard received ` +
        `${JSON.stringify(got)}; wanted ${JSON.stringify(wanted)}; deleted words still present ` +
        `${JSON.stringify(carriesDeleted)}`
    );
  }

  // -- 21. THE ROW THIS PHASE ADDED A CONTROL TO ---------------------------
  //
  // Phase 185's comment in editor.css said the control row needed 294px at the
  // panel's 320px floor and got 319px, "so this never shows in practice; it is
  // the floor under a future round that adds a fifth control". This phase is
  // that round. Before the wrap it needed 356px there and 29px of the 57px
  // Redline control sat past the right edge of a row that scrolls with
  // `scrollbar-width: none`, so the control this phase exists for was more
  // than half off screen and nothing said so. The measurement is here rather
  // than in the stylesheet's comment, because a comment cannot fail.
  {
    const wideBar = (r.reflow ?? {}).wideBar ?? {};
    const narrowBar = (r.reflow ?? {}).narrowBar ?? {};
    const backBar = (r.reflow ?? {}).backBar ?? {};
    const cut = (bar) =>
      (Array.isArray(bar.children) ? bar.children : [])
        .filter((kid) => kid.cutOffPx > 0 || kid.inside === false)
        .map((kid) => `${String(kid.cls)} ${String(kid.cutOffPx)}px out`);
    check(
      21,
      'the control row fits at the panel floor, with every control inside it',
      wideBar.present === true &&
        narrowBar.present === true &&
        wideBar.allInside === true &&
        narrowBar.allInside === true &&
        backBar.allInside === true &&
        wideBar.fits === true &&
        narrowBar.fits === true &&
        // At a normal width nothing moved: one line, still exactly 30px.
        wideBar.lines === 1 &&
        wideBar.height === 30 &&
        backBar.height === 30 &&
        // At the floor it is allowed to grow, and that growth is the fix.
        narrowBar.lines > 1 &&
        narrowBar.height > 30,
      `wide: panel ${String(wideBar.panel)}, ${String(wideBar.clientWidth)} client against ` +
        `${String(wideBar.scrollWidth)} scroll, ${String(wideBar.lines)} line(s), ` +
        `${String(wideBar.height)}px tall, all inside ${String(wideBar.allInside)}. ` +
        `floor: panel ${String(narrowBar.panel)}, ${String(narrowBar.clientWidth)} client against ` +
        `${String(narrowBar.scrollWidth)} scroll, ${String(narrowBar.lines)} line(s), ` +
        `${String(narrowBar.height)}px tall, all inside ${String(narrowBar.allInside)}. ` +
        `back: ${String(backBar.lines)} line(s), ${String(backBar.height)}px tall. ` +
        `out of the box: ${JSON.stringify([...cut(wideBar), ...cut(narrowBar)])}`
    );
  }

  // -- 22. THE SPACING ONLY ROW --------------------------------------------
  //
  // The normalisation that lets three lines read as one sentence is the same
  // normalisation that makes these two sides identical, so this is the one
  // change the marked-up line cannot draw. Before the fix round it drew one
  // unmarked span, which reads as "nothing changed" under a block the diff
  // paints red and green. Now it carries a tag, and a copy of the row must
  // carry the sentence and NOT the tag, because the tag is Tortie talking
  // about the change rather than any part of it.
  {
    const index = drawnBlocks.findIndex((b) => b.name === 'spacing only');
    const row = rows[index] ?? {};
    const drawn = runs[index] ?? [];
    // What the drive computed a copy of THIS row should yield, taken from the
    // whole-surface copy step, which reads every row before selecting.
    const mixedStep = stepOf('mixed') ?? {};
    const mixedText = mixedStep.text;
    const mixedSetup = mixedStep.setup ?? {};
    const perRow = (Array.isArray(mixedSetup.perRow) ? mixedSetup.perRow : [])[index] ?? {};
    check(
      22,
      'a spacing only change draws a row that says so, with no del and no ins, and a copy of it carries the sentence and not the tag',
      index >= 0 &&
        row.tag === 'Spacing only' &&
        (row.dels ?? []).length === 0 &&
        (row.inses ?? []).length === 0 &&
        drawn.length === 1 &&
        drawn[0]?.kind === 'span' &&
        drawn[0]?.text === 'Spaced out words here.' &&
        rows.every((one, at) => (at === index) === (one.tag !== null)) &&
        perRow.clean === 'Spaced out words here.' &&
        !String(perRow.clean ?? '').includes('Spacing only') &&
        // And the tag never reaches the clipboard, not even on the wide
        // selection the handler deliberately leaves to the browser: it is
        // `user-select: none` and the handler strips it as well.
        typeof mixedText === 'string' &&
        !mixedText.includes('Spacing only'),
      `row ${String(index)} tag ${JSON.stringify(row.tag)}, ` +
        `dels ${JSON.stringify(row.dels)}, inses ${JSON.stringify(row.inses)}, ` +
        `runs ${JSON.stringify(drawn)}, whole row text ${JSON.stringify(row.text)}, ` +
        `what a copy of it yields ${JSON.stringify(perRow.clean)}; ` +
        `tags on the other rows ${JSON.stringify(rows.map((one) => one.tag))}; ` +
        'the whole-surface copy carries the tag: ' +
        `${String(typeof mixedText === 'string' && mixedText.includes('Spacing only'))}`
    );
  }
}

const clipAfter = clipboardFingerprint();
check(
  23,
  'the person’s own clipboard was put back exactly, its flavours included',
  clipAfter.md5 === clipBefore.md5 &&
    clipAfter.bytes === clipBefore.bytes &&
    clipAfter.flavours === clipBefore.flavours &&
    Array.isArray(priorFormats) &&
    (clipBefore.bytes === 0 ||
      priorFormats.some((one) => String(one).toLowerCase().includes('text'))),
  `${String(clipBefore.bytes)} bytes md5 ${clipBefore.md5.slice(0, 8)} before, ` +
    `${String(clipAfter.bytes)} bytes md5 ${clipAfter.md5.slice(0, 8)} after; ` +
    `flavours before ${JSON.stringify(clipBefore.flavours)}, ` +
    `after ${JSON.stringify(clipAfter.flavours)}; the names the restore matched on were ` +
    `${JSON.stringify(priorFormats)}`
);

const operatorAfter = operatorSessionCount();
check(
  24,
  'the operator session count did not move',
  operatorAfter === operatorBefore,
  `${String(operatorBefore)} before, ${String(operatorAfter)} after`
);

if (reading !== null && Array.isArray(reading.journey)) {
  say('the journey the drive walked:');
  for (const one of reading.journey) say(`   ${one}`);
}
for (const row of results) {
  say(`${String(row.step).padStart(2)}  ${row.verdict.padEnd(4)}  ${row.claim}  (${row.detail})`);
}
if (failures.length > 0) {
  console.error(`${TAG} ${String(failures.length)} row(s) failed:`);
  for (const f of failures) console.error(`${TAG}   ${f}`);
  process.exit(1);
}
say('every row passed.');
process.exit(0);
