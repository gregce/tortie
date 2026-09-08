#!/usr/bin/env node
/**
 * The Phase 241 MEASURE STEP's price for the markdown-table reshape.
 *
 * It runs the reshape the phase would build — parse the table under the caret
 * with the mdast utilities this product already ships, take each cell as its
 * RAW SOURCE SLICE so inline markup, escaped pipes and code spans survive
 * verbatim, and re-serialise with `markdown-table` keeping the alignment — over
 * every GFM table tracked in this repository, and it asks three properties:
 *
 *   IDEMPOTENT   format(format(t)) === format(t)
 *   CELLS KEPT   reparse(format(t)) has the same cells as reparse(t)
 *   ALIGN KEPT   reparse(format(t)).align === reparse(t).align
 *
 * It spawns one `git ls-files`, writes nothing, launches no Electron and reads
 * only files inside the worktree it is run from.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { markdownTable } from 'markdown-table';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXT = { extensions: [gfmTable()], mdastExtensions: [gfmTableFromMarkdown()] };

/** Every table node in a document, with the source it came from. */
export function tablesOf(text) {
  const out = [];
  const walk = (n) => {
    if (n.type === 'table') { out.push(n); return; }
    for (const c of n.children ?? []) walk(c);
  };
  walk(fromMarkdown(text, EXT));
  return out;
}

/**
 * The shape a reshape works on: rows of RAW cell source, plus the alignment.
 *
 * A tableCell's position in mdast-util-gfm-table spans the LEADING pipe, and
 * the last cell of a row spans the trailing pipe too, so both are stripped —
 * the trailing one only when it is the row terminator and not an escaped
 * `\\|` inside the cell. The slice is raw on purpose: inline markup, code
 * spans and escaped pipes come back byte for byte instead of being
 * re-serialised from the mdast, which is what a person's file deserves.
 */
export function cellSource(text, cell) {
  if (cell.position === undefined) return '';
  let raw = text.slice(cell.position.start.offset, cell.position.end.offset);
  if (raw.startsWith('|')) raw = raw.slice(1);
  if (raw.endsWith('|')) {
    let back = 0;
    for (let i = raw.length - 2; i >= 0 && raw[i] === '\\'; i -= 1) back += 1;
    if (back % 2 === 0) raw = raw.slice(0, -1);
  }
  return raw.trim();
}

export function shapeOf(text, node) {
  const rows = node.children.map((row) => row.children.map((cell) => cellSource(text, cell)));
  return { rows, align: node.align.slice() };
}

/** THE RESHAPE, as a pure function of the table's source text. */
export function formatTable(src) {
  const nodes = tablesOf(src);
  if (nodes.length !== 1) return null;
  const { rows, align } = shapeOf(src, nodes[0]);
  return markdownTable(rows, { align: align.map((a) => a ?? '') });
}

const files = (spawnSync('git', ['-C', REPO, 'ls-files', '*.md'], { encoding: 'utf8' }).stdout ?? '')
  .split('\n').filter((l) => l.trim() !== '');

let seen = 0, notSingle = 0;
const findings = { idempotent: [], cells: [], align: [] };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const rel of files) {
  let text; try { text = readFileSync(join(REPO, rel), 'utf8'); } catch { continue; }
  let nodes; try { nodes = tablesOf(text); } catch { continue; }
  for (const node of nodes) {
    seen += 1;
    const where = `${rel}:${node.position.start.line}`;
    const src = text.slice(node.position.start.offset, node.position.end.offset);
    const before = shapeOf(text, node);
    const once = formatTable(src);
    if (once === null) { notSingle += 1; findings.idempotent.push(`${where}: the slice did not reparse as exactly one table`); continue; }
    const twice = formatTable(once);
    if (twice !== once) findings.idempotent.push(`${where}: second format differs`);
    const re = tablesOf(once);
    if (re.length !== 1) { findings.cells.push(`${where}: formatted output reparsed as ${re.length} tables`); continue; }
    const after = shapeOf(once, re[0]);
    if (!eq(before.rows, after.rows)) {
      const bad = [];
      for (let r = 0; r < Math.max(before.rows.length, after.rows.length); r++) {
        if (!eq(before.rows[r], after.rows[r])) bad.push(`row ${r}: ${JSON.stringify(before.rows[r])} -> ${JSON.stringify(after.rows[r])}`);
      }
      findings.cells.push(`${where}: ${bad.slice(0, 2).join(' | ')}`);
    }
    if (!eq(before.align, after.align)) findings.align.push(`${where}: ${JSON.stringify(before.align)} -> ${JSON.stringify(after.align)}`);
  }
}

console.log(`tables tested: ${seen}`);
for (const [k, v] of Object.entries(findings)) {
  console.log(`\n${k.toUpperCase()}: ${v.length} finding(s)`);
  for (const f of v.slice(0, 12)) console.log(`  ${f}`);
  if (v.length > 12) console.log(`  … and ${v.length - 12} more`);
}

// ---------------------------------------------------------------------------
// THE HOSTILE SET. Twelve shapes a formatter can get wrong, written here so
// the price of the reshape is a reading rather than an assumption.
// ---------------------------------------------------------------------------
if (process.argv.includes('--hostile')) {
  const cases = [
    ['plain', '| a | b |\n| --- | --- |\n| 1 | 2 |'],
    ['every alignment', '| l | c | r |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |'],
    ['pipe inside a code span', '| id | call |\n| --- | --- |\n| pi | `ctx.on(\'a\'|\'b\')` |'],
    ['escaped pipe', '| a | b |\n| --- | --- |\n| x \\| y | z |'],
    ['CJK width', '| name | 名前 |\n| --- | --- |\n| ascii | 日本語のセル |'],
    ['combining marks', '| a | b |\n| --- | --- |\n| été | café |'],
    ['right-to-left run', '| a | b |\n| --- | --- |\n| שלום | مرحبا |'],
    ['emoji with a joiner', '| a | b |\n| --- | --- |\n| \u{1f469}‍\u{1f4bb} | \u{1f3f3}️‍\u{1f308} |'],
    ['empty cells', '| a | b | c |\n| --- | --- | --- |\n|  | x |  |'],
    ['a row SHORTER than the header', '| a | b | c |\n| --- | --- | --- |\n| 1 |'],
    ['a row LONGER than the header', '| a | b |\n| --- | --- |\n| 1 | 2 | 3 |'],
    ['not a table at all', 'just a paragraph with | a pipe in it\n'],
    ['indented inside a list item', '- item\n\n    | a | b |\n    |---|---|\n    | 1 | 2 |\n']
  ];
  console.log('\nTHE HOSTILE SET');
  for (const [label, src] of cases) {
    let once = null, err = null;
    try { once = formatTable(src); } catch (e) { err = e.message; }
    if (once === null) { console.log(`  ${label.padEnd(32)} REFUSED (${err ?? 'the slice is not exactly one table'})`); continue; }
    const twice = formatTable(once);
    const before = (() => { const n = tablesOf(src); return n.length === 1 ? shapeOf(src, n[0]) : null; })();
    const re = tablesOf(once);
    const after = re.length === 1 ? shapeOf(once, re[0]) : null;
    const same = after !== null && eq(before.rows, after.rows) && eq(before.align, after.align);
    console.log(`  ${label.padEnd(32)} idempotent=${String(twice === once).padEnd(5)} cellsKept=${String(same).padEnd(5)} cols ${before.rows.map((r) => r.length).join('/')} -> ${after ? after.rows.map((r) => r.length).join('/') : 'n/a'}`);
    if (!same || twice !== once) console.log(`      ${JSON.stringify(once).slice(0, 160)}`);
  }
}
