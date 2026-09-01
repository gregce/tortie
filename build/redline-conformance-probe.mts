/**
 * redline-conformance-probe.mts. The redline module, run under node, printed
 * as JSON for build/conformance-redline.mjs to judge (Phase 191).
 *
 * It imports the SHIPPING module rather than a copy, so the gate is testing
 * what the app draws. It launches no Electron, opens no window, spawns
 * nothing, reads nothing under the person's home, and makes no request.
 */

import { parseDiffFromFile, processFile } from '@pierre/diffs';
import type { FileDiffMetadata } from '@pierre/diffs';
import {
  isRedlinePath,
  newTextOf,
  normalizeBlockText,
  redlineBlocks,
  redlineRuns,
  redlineSkipNote,
  REDLINE_MAX_BLOCKS,
  REDLINE_MAX_BLOCK_CHARS,
  REDLINE_MAX_EDIT_LENGTH
} from '../src/renderer/editor/redline';
import {
  composeRedlineDocument,
  redlineDocumentNote,
  REDLINE_DOC_MAX_LINE_EDITS
} from '../src/renderer/editor/redline-document';

/** Deterministic filler, so the worst case is the same on every machine. */
function words(count: number, seed: number): string {
  const out: string[] = [];
  let x = seed;
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(`w${String(x % 500)}`);
  }
  return out.join(' ');
}

/**
 * `lcs` marks the pairs the gate's own hand written word LCS can be compared
 * against. Japanese is excluded on purpose and the exclusion is a finding
 * rather than a convenience: a whitespace tokenizer sees one enormous token in
 * a Japanese sentence, which is exactly why this module passes an
 * `Intl.Segmenter` and exactly what the gate's simpler re-derivation cannot
 * reproduce.
 */
const PAIRS: {
  name: string;
  old: string[];
  new: string[];
  lcs: boolean;
  /** Why `lcs` is false, printed by the gate so an exclusion is a finding. */
  why?: string;
}[] = [
  {
    name: 'replacement',
    lcs: true,
    old: ['The quick brown fox jumped over the lazy dog near the river bank.'],
    new: ['The quick red fox leapt over the sleepy dog beside the river bank.']
  },
  {
    name: 'three into one',
    lcs: true,
    old: ['Alpha beta gamma.', 'Delta epsilon zeta.', 'Eta theta iota.'],
    new: ['Alpha beta gamma delta epsilon zeta eta theta iota.']
  },
  {
    name: 'pure deletion',
    lcs: true,
    old: ['This whole sentence goes away.'],
    new: []
  },
  {
    name: 'pure insertion',
    lcs: true,
    old: [],
    new: ['This whole sentence is new.']
  },
  {
    /**
     * THE ORDER FIXTURE. jsdiff keeps "Red ", "lorry " and "waits here." and
     * moves everything else around them, so the insertion arrives BEFORE a
     * deletion it is not paired with and the two are not adjacent. Rule 14
     * pins that, because it is the shape a later round would be tempted to
     * tidy into pairs, and tidying it would be drawing a diff nobody computed.
     */
    name: 'insertion before its deletion',
    lcs: false,
    why:
      'the LCS has a tie: the old side holds three identical "lorry" tokens and the two ' +
      'implementations keep a different one, so the removed sequences are rotations of each ' +
      'other rather than a disagreement about what changed. Rule 14 compares them as multisets.',
    old: [
      'Red lorry stands still.',
      'Yellow lorry moves fast.',
      'Green lorry waits here.'
    ],
    new: ['Red yellow and green lorry waits here.']
  },
  {
    name: 'punctuation only',
    lcs: true,
    old: ['We ship on Tuesday, said the manager.'],
    new: ['We ship on Thursday; said the director!']
  },
  {
    name: 'emoji and combining marks',
    lcs: true,
    old: ['The team shipped 👩‍💻 café naïve résumé today.'],
    new: ['The team shipped 👨‍🚀 café naive résumé tomorrow.']
  },
  {
    name: 'right to left',
    lcs: true,
    old: ['The sign read مرحبا بالعالم before the change.'],
    new: ['The sign read مرحبا بالجميع after the change.']
  },
  {
    name: 'japanese',
    lcs: false,
    why:
      'a whitespace tokenizer sees one enormous token, which is exactly why the module passes an ' +
      'Intl.Segmenter and exactly what this file’s simpler re-derivation cannot reproduce',
    old: ['今日は良い天気ですね。'],
    new: ['明日は良い天気ですね。']
  },
  {
    name: 'one long line',
    lcs: true,
    old: [`prefix ${words(200, 11)} suffix`],
    new: [`prefix ${words(200, 11)} tail`]
  },
  {
    // A block nothing in common with its replacement, which is what
    // `maxEditLength` exists to give up on rather than hang over.
    name: 'rewritten past the guard',
    lcs: false,
    why: 'it is meant to defeat maxEditLength, so there are no runs to compare',
    old: [words(300, 77)],
    new: [words(300, 78)]
  }
];

/** A whole-file fixture the gate can also re-derive line numbers from. */
const OLD_FILE = [
  'Release notes for the quarter.',
  '',
  'The quick brown fox jumped over the lazy dog near the river bank.',
  '',
  'Alpha beta gamma.',
  'Delta epsilon zeta.',
  'Eta theta iota.',
  '',
  'This paragraph goes away entirely.',
  '',
  'The ending stays exactly as it is.',
  ''
].join('\n');

const NEW_FILE = [
  'Release notes for the quarter.',
  '',
  'The quick red fox leapt over the sleepy dog beside the river bank.',
  '',
  'Alpha beta gamma delta epsilon zeta eta theta iota.',
  '',
  'A brand new paragraph appears instead.',
  '',
  'The ending stays exactly as it is.',
  ''
].join('\n');

/**
 * How many change blocks the metadata holds, counted here rather than in the
 * gate, so the gate can prove the accounting: every change block either draws
 * a row or is counted in the skip note, and none is silently dropped.
 */
function changeBlocks(m: FileDiffMetadata): number {
  let count = 0;
  for (const hunk of m.hunks) {
    for (const content of hunk.hunkContent) {
      if (content.type === 'change') count += 1;
    }
  }
  return count;
}

function meta(oldText: string, newText: string): FileDiffMetadata {
  const parsed = parseDiffFromFile(
    { name: 'notes.txt', contents: oldText, cacheKey: 'old' },
    { name: 'notes.txt', contents: newText, cacheKey: 'new' }
  );
  if (parsed === null || parsed === undefined) throw new Error('no metadata');
  return parsed;
}

/**
 * The PARTIAL path, which is the coarse diff this surface falls back to on a
 * large file. Its `additionLines` array holds only the patch's own lines, so
 * an anchor computed as "array index plus one" is wrong here and right on the
 * whole-file path. That is the trap this fixture exists for.
 */
function partialMeta(): FileDiffMetadata {
  const patch = [
    '--- a/notes.txt',
    '+++ b/notes.txt',
    '@@ -40,5 +40,5 @@',
    ' context before',
    '-The quick brown fox jumped over the lazy dog.',
    '+The quick red fox leapt over the sleepy dog.',
    ' context after',
    ' second context',
    ''
  ].join('\n');
  const parsed = processFile(patch, { cacheKey: 'partial' });
  if (parsed === null || parsed === undefined) throw new Error('no patch metadata');
  return parsed;
}

/** The worst case the caps allow, timed. */
function worstCase(): { ms: number; blocks: number; skipped: unknown } {
  const perSide = Math.round(REDLINE_MAX_BLOCK_CHARS / 4.8);
  const oldLines: string[] = [];
  const newLines: string[] = [];
  for (let i = 0; i < REDLINE_MAX_BLOCKS; i++) {
    oldLines.push(words(perSide, i * 2 + 1), '');
    newLines.push(words(perSide, i * 2 + 2), '');
  }
  const m = meta(oldLines.join('\n'), newLines.join('\n'));
  const started = Date.now();
  const result = redlineBlocks(m);
  return {
    ms: Date.now() - started,
    blocks: result.blocks.length,
    skipped: result.skipped
  };
}

const wholeFile = redlineBlocks(meta(OLD_FILE, NEW_FILE));
const partial = redlineBlocks(partialMeta());

/**
 * THE WHITESPACE FIXTURE. Two blocks whose two sides carry the SAME WORDS and
 * differ only in spacing, and one real change between them so the file is not
 * uniform. `normalizeBlockText` is what makes the first two identical, which
 * is why the row cannot draw them and has to say so instead.
 */
const OLD_SPACING = [
  'Release notes for the quarter.',
  '',
  'Spaced   out     words   here.',
  '',
  '    indented by four spaces',
  '',
  'The team shipped the alpha build.',
  '',
  'The ending stays exactly as it is.',
  ''
].join('\n');
const NEW_SPACING = [
  'Release notes for the quarter.',
  '',
  'Spaced out words here.',
  '',
  '\tindented by four spaces',
  '',
  'The crew shipped the beta build.',
  '',
  'The ending stays exactly as it is.',
  ''
].join('\n');
const spacingMeta = meta(OLD_SPACING, NEW_SPACING);
const spacing = redlineBlocks(spacingMeta);

/** More change blocks than the cap allows, to prove the cap fires. */
const manyOld: string[] = [];
const manyNew: string[] = [];
for (let i = 0; i < REDLINE_MAX_BLOCKS + 5; i++) {
  manyOld.push(`line ${String(i)} says alpha`, '');
  manyNew.push(`line ${String(i)} says beta`, '');
}
const capped = redlineBlocks(meta(manyOld.join('\n'), manyNew.join('\n')));

/** One block far past the character budget, to prove that cap fires too. */
const bigOld = words(REDLINE_MAX_BLOCK_CHARS, 91);
const bigNew = `${bigOld} and one more word`;
const big = redlineBlocks(meta(bigOld, bigNew));

/**
 * THE DOCUMENT (Phase 194). Whole files, both sides, composed by the shipping
 * module and printed as runs so the gate can re-derive the two projections
 * without trusting anything here: the runs with the insertions dropped are
 * the old file, and with the deletions dropped the new file, byte for byte.
 */
const DOCUMENTS: { name: string; old: string; new: string }[] = [
  { name: 'unchanged', old: OLD_FILE, new: OLD_FILE },
  { name: 'both empty', old: '', new: '' },
  { name: 'whole file', old: OLD_FILE, new: NEW_FILE },
  { name: 'spacing', old: OLD_SPACING, new: NEW_SPACING },
  { name: 'pure deletion', old: 'First.\n\nGone entirely.\n\nLast.\n', new: 'First.\n\nLast.\n' },
  { name: 'pure insertion', old: 'First.\n\nLast.\n', new: 'First.\n\nArrives here.\n\nLast.\n' },
  { name: 'no final newline', old: 'first\nmiddle\nlast', new: 'FIRST\nmiddle\nLAST' },
  { name: 'final newline gained', old: 'a\nb', new: 'a\nb\n' },
  { name: 'final newline lost', old: 'a\nb\n', new: 'a\nb' },
  { name: 'from nothing', old: '', new: 'brand new\n' },
  { name: 'to nothing', old: 'gone\n', new: '' },
  {
    name: 'unicode',
    old: 'The team shipped 👩‍💻 café naïve résumé today.\nThe sign read مرحبا بالعالم before.\n今日は良い天気ですね。\n',
    new: 'The team shipped 👨‍🚀 café naive résumé tomorrow.\nThe sign read مرحبا بالجميع after.\n明日は良い天気ですね。\n'
  },
  { name: 'crlf', old: 'one\r\ntwo\r\nthree\r\n', new: 'one\r\n2\r\nthree\r\n' },
  { name: 'past the block cap', old: manyOld.join('\n'), new: manyNew.join('\n') },
  { name: 'past the character budget', old: `head\n${bigOld}\ntail\n`, new: `head\n${bigNew}\ntail\n` },
  { name: 'rewritten past the guard', old: `head\n\n${words(300, 77)}\n\ntail\n`, new: `head\n\n${words(300, 78)}\n\ntail\n` },
  {
    name: 'rewritten past the line guard',
    old: `same head\n${Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 200 }, (_, i) => `old ${String(i)}`).join('\n')}\nsame tail\n`,
    new: `same head\n${Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 200 }, (_, i) => `new ${String(i)}`).join('\n')}\nsame tail\n`
  },
  {
    // The verifier's coarse.txt: the OLD side begins with a newline and the
    // new side does not, so there is no shared head at all, and the snap
    // back to a line start must not invent one. One byte off at HEAD 4d271c4.
    name: 'rewritten past the line guard, old side starting on a newline',
    old: `\n${Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 300 }, (_, i) => `old ${String(i)}`).join('\n')}\n`,
    new: `${Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 300 }, (_, i) => `new ${String(i)}`).join('\n')}\n`
  },
  {
    // The mirror: the NEW side begins with a newline, with a shared tail.
    name: 'rewritten past the line guard, new side starting on a newline',
    old: `${Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 300 }, (_, i) => `old ${String(i)}`).join('\n')}\nsame tail\n`,
    new: `\n${Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 300 }, (_, i) => `new ${String(i)}`).join('\n')}\nsame tail\n`
  },
  {
    // Nothing shared at either end, and no newline at the end of either side.
    name: 'rewritten past the line guard, nothing shared',
    old: Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 300 }, (_, i) => `old ${String(i)}`).join('\n'),
    new: Array.from({ length: REDLINE_DOC_MAX_LINE_EDITS + 300 }, (_, i) => `new ${String(i)}`).join('\n')
  }
];

/**
 * THE FUZZ, seeded so it is the same on every machine. The projections are
 * checked HERE by plain joins rather than through the module's own helpers,
 * and the gate reads the counts. A refusal by the repair (`unaligned`) is
 * counted separately because it should never happen and the gate says so.
 */
function fuzz(): { pairs: number; oldWrong: number; newWrong: number; unaligned: number; whole: number; ms: number } {
  const alphabet = ['a', 'b', 'word', ' ', '  ', '\t', '\n', '\n\n', ',', '.', 'é', 'naïve', '👨‍👩‍👧', 'مرحبا', '天気', '\r\n'];
  let x = 20260901;
  const rnd = (): number => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x;
  };
  const text = (len: number): string => {
    let out = '';
    for (let i = 0; i < len; i++) out += alphabet[rnd() % alphabet.length] ?? '';
    return out;
  };
  let oldWrong = 0;
  let newWrong = 0;
  let unaligned = 0;
  let whole = 0;
  const started = Date.now();
  const pairs = 3000;
  for (let i = 0; i < pairs; i++) {
    const a = text(rnd() % 40);
    const b =
      rnd() % 2 === 0
        ? text(rnd() % 40)
        : a.slice(0, rnd() % (a.length + 1)) + text(rnd() % 8) + a.slice(rnd() % (a.length + 1));
    const doc = composeRedlineDocument(a, b);
    let o = '';
    let n = '';
    for (const run of doc.runs) {
      if (run.kind !== 'ins') o += run.text;
      if (run.kind !== 'del') n += run.text;
    }
    if (o !== a) oldWrong += 1;
    if (n !== b) newWrong += 1;
    unaligned += doc.whole.unaligned;
    whole += doc.whole.tooBig + doc.whole.tooDifferent + doc.whole.overCap;
  }
  return { pairs, oldWrong, newWrong, unaligned, whole, ms: Date.now() - started };
}

console.log(
  JSON.stringify({
    document: DOCUMENTS.map((d) => {
      const doc = composeRedlineDocument(d.old, d.new);
      return {
        name: d.name,
        old: d.old,
        new: d.new,
        runs: doc.runs,
        blocks: doc.blocks,
        whole: doc.whole,
        approximate: doc.approximate,
        note: redlineDocumentNote(doc)
      };
    }),
    fuzz: fuzz(),
    caps: {
      maxEditLength: REDLINE_MAX_EDIT_LENGTH,
      maxBlockChars: REDLINE_MAX_BLOCK_CHARS,
      maxBlocks: REDLINE_MAX_BLOCKS
    },
    paths: {
      yes: [
        'notes.txt',
        'NOTES.TXT',
        'README.md',
        'a.markdown',
        'b.mdown',
        'c.mkd',
        'd.mdx',
        'e.text'
      ].map((p) => ({ path: p, redline: isRedlinePath(p) })),
      no: [
        'PierreDiff.tsx',
        'store.ts',
        'main.rs',
        'a.rst',
        'b.adoc',
        'c.org',
        'Makefile',
        '.gitignore',
        'notes.txt.bak'
      ].map((p) => ({ path: p, redline: isRedlinePath(p) }))
    },
    pairs: PAIRS.map((pair) => {
      const oldText = normalizeBlockText(pair.old);
      const newText = normalizeBlockText(pair.new);
      const runs = redlineRuns(oldText, newText);
      return {
        name: pair.name,
        lcs: pair.lcs,
        why: pair.why ?? null,
        oldText,
        newText,
        runs,
        rebuiltNew: runs === null ? null : newTextOf(runs),
        rebuiltOld:
          runs === null
            ? null
            : runs
                .filter((r) => r.kind !== 'ins')
                .map((r) => r.text)
                .join('')
      };
    }),
    wholeFile: {
      blocks: wholeFile.blocks,
      skipped: wholeFile.skipped,
      note: redlineSkipNote(wholeFile),
      newLines: NEW_FILE.split('\n'),
      oldLines: OLD_FILE.split('\n')
    },
    partial: { blocks: partial.blocks, skipped: partial.skipped },
    spacing: {
      blocks: spacing.blocks,
      skipped: spacing.skipped,
      note: redlineSkipNote(spacing),
      changeBlocks: changeBlocks(spacingMeta)
    },
    accounting: [
      {
        name: 'whole file',
        changeBlocks: changeBlocks(meta(OLD_FILE, NEW_FILE)),
        drawn: wholeFile.blocks.length,
        skipped: wholeFile.skipped
      },
      {
        name: 'spacing',
        changeBlocks: changeBlocks(spacingMeta),
        drawn: spacing.blocks.length,
        skipped: spacing.skipped
      },
      {
        name: 'partial patch',
        changeBlocks: changeBlocks(partialMeta()),
        drawn: partial.blocks.length,
        skipped: partial.skipped
      },
      {
        name: 'past the block cap',
        changeBlocks: changeBlocks(meta(manyOld.join('\n'), manyNew.join('\n'))),
        drawn: capped.blocks.length,
        skipped: capped.skipped
      },
      {
        name: 'past the character budget',
        changeBlocks: changeBlocks(meta(bigOld, bigNew)),
        drawn: big.blocks.length,
        skipped: big.skipped
      }
    ],
    capped: {
      blocks: capped.blocks.length,
      skipped: capped.skipped,
      note: redlineSkipNote(capped)
    },
    big: { blocks: big.blocks.length, skipped: big.skipped, note: redlineSkipNote(big) },
    worst: worstCase(),
    emptyNote: redlineSkipNote({
      blocks: [],
      skipped: { tooBig: 0, tooDifferent: 0, overCap: 0 }
    })
  })
);
