#!/usr/bin/env node
/**
 * The Phase 241 MEASURE STEP's table census. It reads the markdown files
 * TRACKED in this repository, parses each with the same mdast utilities the
 * markdown preview already ships (mdast-util-from-markdown +
 * mdast-util-gfm-table), and reports how many GFM tables there are and which
 * of them carry the shapes a formatter can get wrong.
 *
 * It spawns exactly one `git ls-files`, which has exited before the call
 * returns, writes NOTHING anywhere, launches no Electron and reads only files
 * inside the worktree it is run from.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const files = (spawnSync('git', ['-C', REPO, 'ls-files', '*.md'], { encoding: 'utf8' }).stdout ?? '')
  .split('\n')
  .filter((l) => l.trim() !== '');

const CJK = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/;
const COMBINING = /\p{M}/u;
const RTL = /[֐-׿؀-ۿ܀-ݏހ-޿ࢠ-ࣿיִ-﷿ﹰ-﻿]/;
const EMOJI = /\p{Extended_Pictographic}/u;

const traits = {
  'pipe inside a code span': 0,
  'escaped pipe in a cell': 0,
  'CJK-width cell': 0,
  'combining mark': 0,
  'right-to-left run': 0,
  'emoji / astral': 0,
  'empty cell': 0,
  'ragged row (cell count != header)': 0,
  'inline markup in a cell': 0,
  'a cell over 80 chars': 0,
  'no alignment row markers (all null)': 0,
  'some column aligned': 0,
  'indented (inside a list item)': 0,
  'inside a blockquote': 0
};
const witnesses = {};
let tables = 0;
let widest = { cols: 0, file: null };
let tallest = { rows: 0, file: null };
const perFile = [];

for (const rel of files) {
  let text;
  try { text = readFileSync(join(REPO, rel), 'utf8'); } catch { continue; }
  let tree;
  try {
    tree = fromMarkdown(text, { extensions: [gfmTable()], mdastExtensions: [gfmTableFromMarkdown()] });
  } catch (e) { console.log(`  parse failed ${rel}: ${e.message}`); continue; }
  const srcLines = text.split('\n');
  let n = 0;
  const walk = (node, ctx = { quote: false }) => {
    if (node.type === 'table') {
      n += 1; tables += 1;
      const src = text.slice(node.position.start.offset, node.position.end.offset);
      const head = node.children[0]?.children.length ?? 0;
      if (head > widest.cols) widest = { cols: head, file: `${rel}:${node.position.start.line}` };
      if (node.children.length > tallest.rows) tallest = { rows: node.children.length, file: `${rel}:${node.position.start.line}` };
      const note = (k) => { traits[k] += 1; if (!witnesses[k]) witnesses[k] = `${rel}:${node.position.start.line}`; };
      // The table's own first line, read from the document, so an indent a
      // naive slice would carry into the reformatted block is counted.
      if (/^[ \t]+/.test(srcLines[node.position.start.line - 1] ?? '')) note('indented (inside a list item)');
      if (ctx.quote) note('inside a blockquote');
      if (/`[^`\n]*\|[^`\n]*`/.test(src)) note('pipe inside a code span');
      if (/\\\|/.test(src)) note('escaped pipe in a cell');
      if (node.align.some((a) => a !== null)) note('some column aligned');
      else note('no alignment row markers (all null)');
      if (node.children.some((r) => r.children.length !== head)) note('ragged row (cell count != header)');
      let anyEmpty = false, anyLong = false, anyInline = false;
      for (const row of node.children) for (const cell of row.children) {
        const raw = text.slice(cell.position.start.offset, cell.position.end.offset);
        if (raw.trim() === '' || cell.children.length === 0) anyEmpty = true;
        if (raw.length > 80) anyLong = true;
        if (cell.children.some((c) => c.type !== 'text')) anyInline = true;
        if (CJK.test(raw)) note('CJK-width cell');
        if (COMBINING.test(raw)) note('combining mark');
        if (RTL.test(raw)) note('right-to-left run');
        if (EMOJI.test(raw)) note('emoji / astral');
      }
      if (anyEmpty) note('empty cell');
      if (anyLong) note('a cell over 80 chars');
      if (anyInline) note('inline markup in a cell');
      return;
    }
    for (const c of node.children ?? []) walk(c, { quote: ctx.quote || node.type === 'blockquote' });
  };
  walk(tree);
  if (n > 0) perFile.push([rel, n]);
}

console.log(`markdown files tracked: ${files.length}`);
console.log(`files holding at least one GFM table: ${perFile.length}`);
console.log(`GFM TABLES: ${tables}`);
console.log(`widest: ${widest.cols} columns at ${widest.file}`);
console.log(`tallest: ${tallest.rows} rows (header included) at ${tallest.file}`);
console.log('\ntrait                                    tables  first witness');
for (const [k, v] of Object.entries(traits)) {
  console.log(`${k.padEnd(40)} ${String(v).padStart(6)}  ${witnesses[k] ?? '-'}`);
}
console.log('\ntop files by table count');
for (const [rel, n] of perFile.sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(n).padStart(4)}  ${rel}`);
