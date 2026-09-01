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

console.log(
  JSON.stringify({
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
