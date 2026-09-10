#!/usr/bin/env node
/**
 * corpus.mjs — PHASE 248's OFFLINE half: what the real documents in this
 * repository actually contain.
 *
 * It walks every tracked `.md` file (git ls-files, so nothing under
 * node_modules, out/ or build/vendor is counted), pulls out every GFM table
 * and every fenced code block, and prints the two distributions the measure
 * step needs to choose a ceiling with a number rather than a taste:
 *
 *   TABLES — column count, and the widest cell per column, so the natural
 *   width of a table can be estimated before the app is opened and checked
 *   against it afterwards.
 *
 *   FENCES — the length of every line of code, so question 3 ("does a code
 *   block travel with the table") is answered on what is here rather than on
 *   symmetry.
 *
 * It launches nothing, spawns only `git ls-files`, writes only where --out
 * says, and reads nothing outside the repository it is run from.
 *
 * Usage: node build/p248/corpus.mjs [--json <path>]
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const say = (l) => console.log(`[p248-corpus] ${l}`);

const listed = spawnSync('git', ['-C', REPO, 'ls-files', '*.md'], { encoding: 'utf8' });
if (listed.status !== 0) { console.error(listed.stderr); process.exit(2); }
const files = listed.stdout.split('\n').filter((l) => l.trim() !== '');

/** A GFM table is a header row, a delimiter row of dashes, then body rows. */
const isDelim = (line) =>
  /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(line);
const isRow = (line) => line.includes('|') && line.trim() !== '';

function cellsOf(line) {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  // A `\|` inside a cell is an escaped pipe, not a separator.
  return t.split(/(?<!\\)\|/).map((c) => c.trim());
}

/** Markdown that does not survive to the drawn cell: emphasis, code ticks, link syntax. */
function drawnText(cell) {
  return cell
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/\\\|/g, '|')
    .trim();
}

const tables = [];
const fences = [];

for (const rel of files) {
  const text = readFileSync(join(REPO, rel), 'utf8');
  const lines = text.split('\n');
  let inFence = false;
  let fenceMark = '';
  let fenceLang = '';
  let fenceLines = [];
  let fenceStart = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const open = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (!inFence && open !== null) {
      inFence = true;
      fenceMark = open[1][0];
      fenceLang = open[2].trim();
      fenceLines = [];
      fenceStart = i + 1;
      continue;
    }
    if (inFence) {
      if (new RegExp(`^\\s*\\${fenceMark}{3,}\\s*$`).test(line)) {
        fences.push({ file: rel, line: fenceStart, lang: fenceLang, lines: fenceLines });
        inFence = false;
        continue;
      }
      fenceLines.push(line);
      continue;
    }
    // A table: this line is a row and the next is a delimiter.
    if (isRow(line) && i + 1 < lines.length && isDelim(lines[i + 1])) {
      const header = cellsOf(line);
      const body = [];
      let j = i + 2;
      while (j < lines.length && isRow(lines[j])) { body.push(cellsOf(lines[j])); j += 1; }
      const raw = lines.slice(i, j).join('\n');
      const cols = header.length;
      const widest = header.map((h) => drawnText(h).length);
      for (const row of body) {
        for (let c = 0; c < Math.min(cols, row.length); c += 1) {
          widest[c] = Math.max(widest[c], drawnText(row[c]).length);
        }
      }
      tables.push({
        file: rel,
        line: i + 1,
        cols,
        rows: body.length,
        widestPerCol: widest,
        headerChars: header.map((h) => drawnText(h).length),
        sumChars: widest.reduce((a, b) => a + b, 0),
        raw
      });
      i = j - 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const pct = (arr, p) => {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

say(`${files.length} tracked .md files`);
say(`${tables.length} GFM tables, ${fences.length} fenced code blocks`);
say('');
say('TABLES by column count:');
const byCols = new Map();
for (const t of tables) byCols.set(t.cols, (byCols.get(t.cols) ?? 0) + 1);
for (const c of [...byCols.keys()].sort((a, b) => a - b)) {
  say(`  ${String(c).padStart(2)} columns: ${String(byCols.get(c)).padStart(4)}`);
}
const sums = tables.map((t) => t.sumChars);
say('');
say('TABLES by summed widest-cell characters (a proxy for natural width):');
for (const p of [50, 75, 90, 95, 99, 100]) say(`  p${String(p).padStart(3)}: ${String(pct(sums, p))} chars`);
say('');
say('WIDEST TEN TABLES:');
for (const t of [...tables].sort((a, b) => b.sumChars - a.sumChars).slice(0, 10)) {
  say(`  ${String(t.sumChars).padStart(5)} chars  ${String(t.cols)}col x ${String(t.rows)}row  ${t.file}:${String(t.line)}`);
}

const codeLines = [];
for (const f of fences) for (const l of f.lines) codeLines.push(l.replace(/\t/g, '  ').length);
say('');
say(`FENCED CODE: ${codeLines.length} lines in ${fences.length} blocks`);
for (const p of [50, 75, 90, 95, 99, 100]) say(`  p${String(p).padStart(3)}: ${String(pct(codeLines, p))} chars`);
for (const n of [60, 68, 72, 80, 90, 100, 120]) {
  const over = codeLines.filter((l) => l > n).length;
  say(`  lines over ${String(n).padStart(3)} chars: ${String(over).padStart(5)} (${((over / Math.max(1, codeLines.length)) * 100).toFixed(2)}%)`);
}
const blocksOver = (n) => fences.filter((f) => f.lines.some((l) => l.replace(/\t/g, '  ').length > n)).length;
for (const n of [68, 80, 100]) {
  say(`  blocks with any line over ${String(n)} chars: ${String(blocksOver(n))} of ${String(fences.length)} (${((blocksOver(n) / Math.max(1, fences.length)) * 100).toFixed(1)}%)`);
}

/**
 * --emit <dir>: the same tables written back out as markdown documents the
 * preview can be pointed at, in chunks so no single document is absurd, plus
 * an index naming each table in DOM order. This is how the app run measures
 * the NATURAL width of every real table in this repository rather than of an
 * invented one.
 */
const emitAt = process.argv.indexOf('--emit');
if (emitAt !== -1 && process.argv[emitAt + 1]) {
  const dir = process.argv[emitAt + 1];
  const per = 400;
  const index = [];
  let chunk = 0;
  for (let i = 0; i < tables.length; i += per) {
    const slice = tables.slice(i, i + per);
    const parts = [`# corpus ${String(chunk)}`, ''];
    for (const t of slice) {
      index.push({ chunk, file: t.file, line: t.line, cols: t.cols, rows: t.rows, sumChars: t.sumChars });
      parts.push(t.raw, '');
    }
    writeFileSync(join(dir, `corpus-${String(chunk)}.md`), parts.join('\n'));
    chunk += 1;
  }
  writeFileSync(join(dir, 'corpus-index.json'), JSON.stringify({ chunks: chunk, tables: index }, null, 2));
  say(`emitted ${String(chunk)} corpus document(s) and an index into ${dir}`);
}

const jsonAt = process.argv.indexOf('--json');
if (jsonAt !== -1 && process.argv[jsonAt + 1]) {
  writeFileSync(process.argv[jsonAt + 1], JSON.stringify({ tables, fences: fences.map((f) => ({ file: f.file, line: f.line, lang: f.lang, widest: Math.max(0, ...f.lines.map((l) => l.replace(/\t/g, '  ').length)), count: f.lines.length })) }, null, 2));
  say(`json at ${process.argv[jsonAt + 1]}`);
}
