#!/usr/bin/env npx tsx
/**
 * THE SHIPPING table reshape, over every GFM table tracked in this repository.
 *
 * `table-roundtrip.mjs` beside this file is the MEASURE STEP's own copy of the
 * reshape, written before the phase built one. This file runs the code that
 * actually ships — `src/renderer/editor/reshape.ts`, imported directly — so
 * the two cannot drift and a later round can ask the real module the question
 * rather than a copy of it. Run it after any change to that module:
 *
 *   npx tsx build/p241/shipping-table-corpus.mts
 *
 * It asks four things of every table it finds from every one of its lines:
 *
 *   FOUND        the block scan and the parser agree that this is a table
 *   IDEMPOTENT   formatting the formatted table changes nothing
 *   CELLS KEPT   the cells and the alignments survive the round trip
 *   BLOCK CLEAN  the lines the press REWRITES hold the table and nothing else
 *
 * and it prints every refusal with the line it names, because the refusals are
 * a measurement too: 9 of this repository's tables have a body row wider than
 * their header, and refusing those is the phase's own rule.
 *
 * THE FOURTH QUESTION AND THE GLUED ARM ARE THE FIX ROUND'S, and the reason is
 * the lesson rather than the count. The first three can all pass while the
 * press destroys the person's file, because every one of them asks about the
 * TABLE and none asks what else is inside the lines being overwritten: the
 * block was the run of non-blank lines around the caret, a GFM table ends at a
 * blank line OR at the start of another block-level structure, and a heading,
 * a fenced block, a list, a blockquote, a rule or an HTML block glued under a
 * table was written over. Nothing in this repository is that shape — 0 of the
 * 1,770 tables here — so a corpus of real files could never have caught it,
 * which is why the glued arm carries its own shapes.
 *
 * It spawns one `git ls-files`, writes nothing, launches no Electron, starts
 * no tmux server and reads only files inside the worktree it is run from. The
 * output of the run this phase committed is banked beside it as
 * out-shipping-table-corpus.txt.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmTable } from 'micromark-extension-gfm-table';
import {
  formatMarkdownTable,
  reshapeTableAt,
  tableAt
} from '../../src/renderer/editor/reshape.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const files = (
  spawnSync('git', ['-C', REPO, 'ls-files', '*.md'], { encoding: 'utf8' }).stdout ?? ''
)
  .split('\n')
  .filter((line) => line.trim() !== '');

let found = 0;
let formatted = 0;
let notIdempotent = 0;
let cellsMoved = 0;
let blockDirty = 0;
const refusals: string[] = [];
const findings: string[] = [];

/**
 * Does this slice hold ONE table and nothing else, end to end?
 *
 * This is the question the four-line answer above cannot ask of itself. The
 * press replaces `startLine`..`endLine` whole, so anything in those lines that
 * is not the table is destroyed, and a slice that parses to a table PLUS a
 * heading is exactly that loss.
 */
function blockHoldsOnlyTheTable(slice: string): boolean {
  const tree = fromMarkdown(slice, {
    extensions: [gfmTable()],
    mdastExtensions: [gfmTableFromMarkdown()]
  });
  const only = tree.children[0];
  return (
    tree.children.length === 1 &&
    only !== undefined &&
    only.type === 'table' &&
    (only.position?.start.offset ?? -1) === 0 &&
    (only.position?.end.offset ?? -1) === slice.length
  );
}

/** The cells and alignments a formatted table parses back to, as one string. */
function shapeOf(src: string): string {
  const answer = formatMarkdownTable(src);
  return answer.ok ? answer.text : `REFUSED ${answer.why}`;
}

for (const rel of files) {
  let text: string;
  try {
    text = readFileSync(join(REPO, rel), 'utf8');
  } catch {
    continue;
  }
  const lines = text.split('\n');
  const seen = new Set<number>();
  for (let line = 1; line <= lines.length; line += 1) {
    const at = tableAt(lines, line);
    if (at === null || seen.has(at.block.startLine)) continue;
    seen.add(at.block.startLine);
    found += 1;
    const where = `${rel}:${at.block.startLine}`;
    const answer = reshapeTableAt(lines, line);
    if (!answer.ok) {
      refusals.push(`${where}: ${answer.why}`);
      continue;
    }
    formatted += 1;
    // Idempotence and cell preservation, both over the formatted block put
    // back into the document, which is what the editor really writes.
    const next = [
      ...lines.slice(0, answer.startLine - 1),
      ...answer.text.split('\n'),
      ...lines.slice(answer.endLine)
    ];
    const again = reshapeTableAt(next, answer.startLine);
    if (!again.ok || again.text !== answer.text) notIdempotent += 1;
    if (shapeOf(at.source) !== shapeOf(answer.text.split('\n').map((l) => l.trimStart()).join('\n'))) {
      cellsMoved += 1;
      findings.push(`${where}: the cells or alignments moved`);
    }
    if (!blockHoldsOnlyTheTable(at.source)) {
      blockDirty += 1;
      findings.push(`${where}: lines ${String(answer.startLine)}-${String(answer.endLine)} hold more than the table`);
    }
  }
}

console.log(
  `[p241] ${String(files.length)} markdown files, ${String(found)} GFM tables found. ` +
    `${String(formatted)} formatted, ${String(refusals.length)} refused, ` +
    `${String(notIdempotent)} not idempotent, ${String(cellsMoved)} whose cells moved, ` +
    `${String(blockDirty)} whose block held more than the table.`
);
for (const one of refusals) console.log(`  REFUSED ${one}`);

// ---------------------------------------------------------------------------
// THE GLUED ARM. One case per block-level structure a GFM table ends at, none
// of which exists in this repository. Every tail must survive the press byte
// for byte, and a table with a non-blank line directly above it must be found
// at all — the same wrong block made those invisible, and 10 tables here are
// that shape. Strings only: nothing is written and no file is opened.
// ---------------------------------------------------------------------------

const TABLE = ['| a | b |', '|---|---|', '| 1 | 2 |'];
const TAILS: Array<[string, string[]]> = [
  ['ATX heading', ['### keep me']],
  ['fenced code', ['```js', 'const keep = "this line must survive";', '```']],
  ['bullet list', ['- keep me']],
  ['ordered list', ['1. keep me']],
  ['blockquote', ['> keep me']],
  ['thematic break', ['***']],
  ['HTML block', ['<div>keep me</div>']]
];
const HEADS: Array<[string, string[]]> = [
  ['ATX heading', ['### a heading']],
  ['paragraph', ['some prose']],
  ['thematic break', ['***']]
];

let glued = 0;
for (const [what, tail] of TAILS) {
  glued += 1;
  const lines = [...TABLE, ...tail];
  const answer = reshapeTableAt(lines, 3);
  if (!answer.ok) {
    findings.push(`glued ${what}: refused — ${answer.why}`);
    continue;
  }
  const next = [
    ...lines.slice(0, answer.startLine - 1),
    ...answer.text.split('\n'),
    ...lines.slice(answer.endLine)
  ];
  if (JSON.stringify(next.slice(3)) !== JSON.stringify(tail)) {
    findings.push(`glued ${what}: the tail was rewritten — ${JSON.stringify(next.slice(3))}`);
  }
}
for (const [what, head] of HEADS) {
  glued += 1;
  const answer = reshapeTableAt([...head, ...TABLE], head.length + 2);
  if (!answer.ok || answer.startLine !== head.length + 1) {
    findings.push(`glued ${what} above: the table was not found`);
  }
}
console.log(`[p241] ${String(glued)} glued shapes driven, ${String(findings.length)} findings.`);

// ---------------------------------------------------------------------------
// THE TRAILING-WHITESPACE ARM, and it is the committer's round. mdast runs the
// LAST cell of a row past the terminating pipe to the end of the line, so a
// row carrying one trailing space sliced as `"| 2 | "`, the row terminator
// survived as text and the cell became `2 |`. The formatted table grew a
// column — and with the space on the HEADER row the answer stopped being a
// table at all. One space is enough, and so is a tab or a hard break's two.
//
// Unlike the glued shapes, this one IS in real markdown: of the 92 tables the
// shipping detector finds in the 774 markdown files under `node_modules`, one
// carries trailing whitespace, and at the parent clause a press turned
// is-glob's six-row contributors table into a heading and a paragraph. This
// repository's own files are clean, so the shapes are written down here.
//
// The question is that trailing whitespace moves NO byte of the answer, and
// that the answer is still one table end to end.
// ---------------------------------------------------------------------------

const CLEAN_ROWS = ['| id | call |', '| --- | ---: |', '| 2 | b |', '| 1 | a |'];
const clean = formatMarkdownTable(CLEAN_ROWS.join('\n'));
const WS_SHAPES: Array<[string, string]> = [
  ['a space on the last body row', '| id | call |\n| --- | ---: |\n| 2 | b |\n| 1 | a | '],
  ['a space on the header row', '| id | call | \n| --- | ---: |\n| 2 | b |\n| 1 | a |'],
  ['a space on the delimiter row', '| id | call |\n| --- | ---: | \n| 2 | b |\n| 1 | a |'],
  ['a hard break, being two spaces', '| id | call |\n| --- | ---: |\n| 2 | b |  \n| 1 | a |'],
  ['a tab', '| id | call |\n| --- | ---: |\n| 2 | b |\t\n| 1 | a |'],
  ['a space on EVERY row, which is the shape real markdown carries', '| id | call | \n| --- | ---: | \n| 2 | b | \n| 1 | a | ']
];

let ws = 0;
for (const [what, src] of WS_SHAPES) {
  ws += 1;
  const answer = formatMarkdownTable(src);
  if (!answer.ok) {
    findings.push(`trailing ${what}: refused — ${answer.why}`);
    continue;
  }
  if (!clean.ok || answer.text !== clean.text) {
    findings.push(`trailing ${what}: the answer moved — ${JSON.stringify(answer.text)}`);
    continue;
  }
  if (!blockHoldsOnlyTheTable(answer.text)) {
    findings.push(`trailing ${what}: the answer is no longer one table`);
  }
}
console.log(`[p241] ${String(ws)} trailing-whitespace shapes driven.`);

console.log(`[p241] ${String(findings.length)} findings in all.`);
for (const one of findings) console.log(`  FINDING ${one}`);

if (findings.length > 0 || notIdempotent > 0 || cellsMoved > 0 || blockDirty > 0) {
  console.error('[p241] FAILED: the round trip is not clean.');
  process.exit(1);
}
