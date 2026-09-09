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
 * It asks three things of every table it finds from every one of its lines:
 *
 *   FOUND        the block scan and the parser agree that this is a table
 *   IDEMPOTENT   formatting the formatted table changes nothing
 *   CELLS KEPT   the cells and the alignments survive the round trip
 *
 * and it prints every refusal with the line it names, because the refusals are
 * a measurement too: 8 of this repository's tables have a body row wider than
 * their header, and refusing those is the phase's own rule.
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
const refusals: string[] = [];

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
    }
  }
}

console.log(
  `[p241] ${String(files.length)} markdown files, ${String(found)} GFM tables found. ` +
    `${String(formatted)} formatted, ${String(refusals.length)} refused, ` +
    `${String(notIdempotent)} not idempotent, ${String(cellsMoved)} whose cells moved.`
);
for (const one of refusals) console.log(`  REFUSED ${one}`);

if (notIdempotent > 0 || cellsMoved > 0) {
  console.error('[p241] FAILED: the round trip is not clean.');
  process.exit(1);
}
