/**
 * THE RESHAPES — pure text in, text out, and nothing else (Phase 241).
 *
 * Issue 17 asked for "a command to pretty print markdown tables", and the
 * operator's ruling made it "a dynamic right click action under your cursor
 * (and also consider a handful of other built-ins for fast re-editing … like
 * pretty print for json)". This module is that half. ./editor-menu.ts decides
 * which rows a menu draws from the predicates here, ./use-editor-menu.ts is
 * the only caller that touches a Monaco model, and everything below is a
 * function of strings — so the round-trip property the phase must prove is
 * testable with no Electron, no editor and no DOM.
 *
 * THREE ROWS, AND THE REST ARE REFUSED, priced in docs/research/101 §3:
 *
 *  - Format Table. His ask.
 *  - Format JSON, with a guard. An agent writes a wall of one-line JSON
 *    constantly, and `JSON.parse` + `JSON.stringify` is NOT a whitespace
 *    change: integer-like keys reorder, duplicate keys collapse, an id past
 *    2^53 is rewritten, `-0` becomes `0` and `1e400` becomes `null`. Six
 *    measured losses. So the answer is compared with the source through one
 *    string-aware stripper and refused when anything the stripper can see
 *    moved. IT IS NOT BYTE-PRESERVING AND SAYING SO IS THE HONEST CLAIM: the
 *    stripper compares a string token by its VALUE, so `{"s":"\u00e9"}` really
 *    does come back as `{"s": "é"}` and the escape form is not the person's
 *    to keep. That is deliberate — refusing a re-encoded string would refuse
 *    the commonest shape an agent writes — and it is the ONE thing besides
 *    whitespace this row will change. Every number literal is compared as
 *    TEXT, which is what catches all six losses above.
 *  - Minify JSON. It is that stripper, so the second row pays for the first
 *    row's honesty, and its own use is real: a pretty body has to become one
 *    line to go on a `curl` command.
 *
 * Refused with a measurement rather than by taste, and named here so a later
 * round does not add them because they are cheap: YAML (js-yaml is already a
 * direct dependency and cannot emit a comment — 3 comments in, 0 out, and
 * `on:` requoted); json5 (a tolerant read is a lossy rewrite wearing a tidy's
 * clothes); sort lines, unique lines, trim trailing whitespace and change
 * case, which are the scope guardrail's own example list of IDE furniture and
 * are ALREADY free in the bundle, which is exactly why the refusal is written
 * down; and reflow, because it rewrites a whole paragraph the redline is
 * drawn against and turns "the agent changed one clause" into "one paragraph
 * is different" in the one view built to tell them apart.
 *
 * `markdown-table` is the serialiser remark and prettier both use, and the
 * parse half is the same `mdast-util-from-markdown` + `mdast-util-gfm-table`
 * pair the markdown preview already ships for `remark-gfm`. All four were
 * already installed as transitive dependencies and are promoted rather than
 * added; nothing was installed. Phase 23's refusals are untouched: they forbid
 * third-party code loaded at RUNTIME BY CONFIGURATION, not npm dependencies
 * compiled into the bundle, which is how React, Monaco, xterm, Pierre, remark
 * and shiki are already here.
 */

import { markdownTable } from 'markdown-table';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmTable } from 'micromark-extension-gfm-table';
import type { Nodes, Table, TableCell } from 'mdast';

/** Every reshape answers this: the new text, or one sentence saying why not. */
export type Reshaped = { ok: true; text: string } | { ok: false; why: string };

/** A reshape that also names the whole lines it replaces (1-based, inclusive). */
export type TableReshaped =
  | { ok: true; text: string; startLine: number; endLine: number }
  | { ok: false; why: string };

/** The lines a GFM table occupies, and the indent every one of them carries. */
export interface TableBlock {
  /** 1-based, inclusive. */
  startLine: number;
  /** 1-based, inclusive. */
  endLine: number;
  /** The whitespace every line of the block begins with, often ''. */
  indent: string;
}

// ---------------------------------------------------------------------------
// The markdown table
// ---------------------------------------------------------------------------

const MDAST_GFM_TABLE = {
  extensions: [gfmTable()],
  mdastExtensions: [gfmTableFromMarkdown()]
};

/**
 * A GFM delimiter row: cells of hyphens with an optional colon at either end.
 *
 * A PIPE IS REQUIRED, and that is not decoration. Without it `---` under a
 * line of prose matches, and `---` under a line of prose is a setext heading,
 * not a table. Requiring a pipe on the delimiter row AND on the header row
 * above it is what keeps this predicate off every heading in the tree.
 */
function isDelimiterRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  let body = trimmed;
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|')) body = body.slice(0, -1);
  const cells = body.split('|');
  return cells.every((cell) => /^\s*:?-+:?\s*$/.test(cell));
}

/** The longest leading-whitespace prefix every line shares. */
function commonIndent(lines: readonly string[]): string {
  let indent: string | null = null;
  for (const line of lines) {
    const own = /^[ \t]*/.exec(line)?.[0] ?? '';
    if (indent === null) {
      indent = own;
      continue;
    }
    let i = 0;
    while (i < indent.length && i < own.length && indent[i] === own[i]) i += 1;
    indent = indent.slice(0, i);
  }
  return indent ?? '';
}

/**
 * The GFM table the caret is in, as the lines it really occupies — or null.
 *
 * It is `tableAt` with the source thrown away, so the block a menu row is
 * drawn from and the block a press REWRITES can never disagree. That is not
 * tidiness: it is the Phase 241 fix round's whole defect. This function used
 * to answer THE RUN OF NON-BLANK LINES around the caret and check only that
 * the run's second line was a delimiter row, and a GFM table does not end at
 * a blank line alone — it ends at a blank line OR at the start of another
 * block-level structure. So a table with a heading, a fenced block, a list, a
 * blockquote, a rule or an HTML block glued directly under it reported those
 * lines as part of itself, and `reshapeTableAt` wrote the formatted table
 * over the lot: seven measured tails destroyed, silently, in the person's own
 * file. The same wrong block made a table with any non-blank line directly
 * ABOVE it invisible, because the run then began on that line and the run's
 * first line carries no pipe — which is `### Heading` above a table, the
 * commonest markdown there is and 10 of the tables in this repository.
 *
 * `line` is 1-based, the way Monaco counts.
 */
export function tableBlockAt(
  lines: readonly string[],
  line: number
): TableBlock | null {
  return tableAt(lines, line)?.block ?? null;
}

/** Every line with the block's shared indent taken off the front. */
function dedent(lines: readonly string[], indent: string): string[] {
  return lines.map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l.trimStart()));
}

/** Every table node in a document. */
function tablesOf(text: string): Table[] {
  const out: Table[] = [];
  const walk = (node: Nodes): void => {
    if (node.type === 'table') {
      out.push(node);
      return;
    }
    if ('children' in node) {
      for (const child of node.children) walk(child as Nodes);
    }
  };
  walk(fromMarkdown(text, MDAST_GFM_TABLE));
  return out;
}

/**
 * One cell as its RAW SOURCE SLICE.
 *
 * Raw on purpose: inline markup, code spans and escaped pipes come back byte
 * for byte instead of being re-serialised out of the mdast, which is what a
 * person's file deserves. A `tableCell`'s position in mdast-util-gfm-table
 * starts at the LEADING pipe, and the last cell of a row ends at the trailing
 * one, so both are stripped — the trailing one only when it really is the row
 * terminator and not an escaped `\|` that ends the cell's text. Getting that
 * one rule wrong produced 1,758 findings out of 1,759 on the measure step's
 * first run, which is how the rule was found.
 *
 * THE SLICE IS TRIMMED BEFORE EITHER PIPE IS LOOKED FOR, and that clause is
 * the committer's round. mdast gives the LAST cell of a row a position that
 * runs past the terminating pipe to the end of the line, so a row carrying one
 * trailing space slices as `"| 2 | "`, `endsWith('|')` is false, the row
 * terminator survives as text and the cell becomes `2 |`. Formatting then
 * writes a table with an extra column in one row — and with the trailing space
 * on the HEADER row it writes something that is not a table at all: the block
 * goes from `table` to `paragraph` and the person's table is destroyed in
 * silence, in one press, in their own file. One space is enough, and so is a
 * tab or the two spaces that mean a hard break. It is real rather than
 * theoretical: of the 92 tables the shipping detector finds in the 774
 * markdown files under `node_modules` — real markdown by many authors — one
 * carries trailing whitespace, and a press destroyed it. Trimming first also
 * fixes the mirror case, a row indented past the block's shared indent, whose
 * LEADING pipe was invisible for the same reason.
 */
function cellSource(text: string, cell: TableCell): string {
  if (cell.position === undefined) return '';
  const start = cell.position.start.offset ?? 0;
  const end = cell.position.end.offset ?? 0;
  let raw = text.slice(start, end).trim();
  if (raw.startsWith('|')) raw = raw.slice(1);
  if (raw.endsWith('|')) {
    let backslashes = 0;
    for (let i = raw.length - 2; i >= 0 && raw[i] === '\\'; i -= 1) backslashes += 1;
    if (backslashes % 2 === 0) raw = raw.slice(0, -1);
  }
  return raw.trim();
}

/**
 * FORMAT ONE GFM TABLE, given its source with no indent on it.
 *
 * TWO REFUSALS, both measured over the 1,770 GFM tables tracked in this
 * repository (docs/research/101 §4, re-run by the fix round: the measure step
 * read 1,759 and the shipping scan 1,760, and the parser owning the bounds
 * found the 10 that sit directly under a heading with no blank line between):
 *
 *  1. The slice must reparse as exactly one table. Three tables in this
 *     repository are indented inside a list item, and a slice that keeps the
 *     indent is not a table at all — which is why the caller dedents first.
 *  2. NO ROW MAY BE WIDER THAN THE HEADER. `markdown-table` pads every row to
 *     the longest one, so a body row with more cells GROWS THE HEADER and the
 *     table means something new. Nine tables here are that shape, and the
 *     cause is almost always an unescaped `|` inside a code span, which GFM
 *     splits on: 732 tables here carry one. Reflowing hides the person's bug
 *     instead of showing it, so the answer is a refusal naming the row.
 *
 * A row SHORTER than the header is padded, which is safe — GFM already renders
 * the missing cells as empty.
 */
export function formatMarkdownTable(src: string, lineOffset = 0): Reshaped {
  let nodes: Table[];
  try {
    nodes = tablesOf(src);
  } catch {
    return { ok: false, why: 'That is not a table this editor can read.' };
  }
  const node = nodes[0];
  if (nodes.length !== 1 || node === undefined) {
    return { ok: false, why: 'The cursor is not inside a markdown table.' };
  }
  const rows = node.children.map((row) =>
    row.children.map((cell) => cellSource(src, cell))
  );
  const header = rows[0];
  if (header === undefined) {
    return { ok: false, why: 'The cursor is not inside a markdown table.' };
  }
  for (let i = 1; i < rows.length; i += 1) {
    const width = rows[i]?.length ?? 0;
    if (width <= header.length) continue;
    // The row is named by the LINE it is on, offset into the document by the
    // caller, because a person fixes a line and mdast's row index counts
    // neither the delimiter row nor the block's place in the file.
    const at = (node.children[i]?.position?.start.line ?? i + 2) + lineOffset;
    return {
      ok: false,
      why:
        `Line ${at} has ${width} cells and the header has ${header.length}. ` +
        'Formatting it would add columns to the header — an unescaped | is the usual cause.'
    };
  }
  const padded = rows.map((row) => [
    ...row,
    ...Array<string>(header.length - row.length).fill('')
  ]);
  return {
    ok: true,
    text: markdownTable(padded, {
      align: (node.align ?? []).map((a) => a ?? '')
    })
  };
}

/**
 * THE ONE ANSWER TO "IS THE CARET IN A TABLE", used by the menu's dynamic
 * half AND by the reshape itself, so the row that is drawn and the row that
 * runs cannot disagree.
 *
 * THE PARSER OWNS THE BOUNDS, AND THAT IS THE FIX ROUND'S ONE CLAUSE. A run
 * of non-blank lines is a CANDIDATE REGION and never the table: GFM ends a
 * table at a blank line OR at the start of another block-level structure, so
 * the region can hold a heading above the table and a fenced block, a list, a
 * rule, a blockquote or an HTML block glued under it. The region is parsed,
 * the table node whose own line range CONTAINS the caret is taken, and that
 * node's first and last lines are the block. A glued paragraph line really is
 * absorbed as a row, which is GFM and not a loss, and the parser says so
 * rather than a line scan guessing.
 *
 * Three things keep it cheap and keep it honest:
 *
 *  - A NECESSARY CONDITION BEFORE THE PARSE. A GFM table's second line is a
 *    delimiter row, so the region must hold one that is not its first line,
 *    and the caret must be at or below that row's header. Without it a right
 *    click in a large file holding no blank line at all — a pretty-printed
 *    JSON document is exactly that — would pay for a markdown parse of the
 *    whole file to learn there was no table in it. Measured over a 20,000-line
 *    JSON document with no blank line anywhere: 0.49 ms, against 0.29 ms for
 *    the line scan this replaced.
 *  - THE SLICE IS DEDENTED. Three tables in this repository sit inside a list
 *    item and a slice that keeps its indent is not a table at all.
 *  - THE SLICE IS RE-PARSED and must be exactly one table filling it end to
 *    end. This is belt and braces rather than the clause doing the work, and
 *    saying so is the honest claim: the REGION parse above already owns both
 *    bounds, and the committer's round measured that removing this second
 *    parse's end-offset check — with `alreadyProved` forced false so it really
 *    runs — leaves every test and every corpus arm green. It is kept because
 *    it is cheap on the only shape that reaches it, and it is not what stopped
 *    a glued tail riding along inside the block.
 *
 * The ONE thing it does not ask is whether the table will format, because a
 * row that is wider than the header is a bug in the person's table and the
 * refusal names the line it is on. Drawing nothing there would leave them with
 * no answer at all, which is why that one refusal happens on the press.
 */
export function tableAt(
  lines: readonly string[],
  line: number
): { block: TableBlock; source: string } | null {
  if (line < 1 || line > lines.length) return null;
  const blank = (i: number): boolean => (lines[i] ?? '').trim() === '';
  if (blank(line - 1)) return null;

  let top = line - 1;
  while (top > 0 && !blank(top - 1)) top -= 1;
  let bottom = line - 1;
  while (bottom < lines.length - 1 && !blank(bottom + 1)) bottom += 1;

  let firstDelimiter = -1;
  for (let i = top + 1; i <= bottom; i += 1) {
    if (isDelimiterRow(lines[i] ?? '')) {
      firstDelimiter = i;
      break;
    }
  }
  if (firstDelimiter === -1 || line - 1 < firstDelimiter - 1) return null;

  const region = lines.slice(top, bottom + 1);
  const regionIndent = commonIndent(region);
  const regionSource = dedent(region, regionIndent).join('\n');
  const relLine = line - top;
  let regionTables: Table[];
  try {
    regionTables = tablesOf(regionSource);
  } catch {
    return null;
  }
  const found = regionTables.find(
    (t) =>
      t.position !== undefined &&
      t.position.start.line <= relLine &&
      relLine <= t.position.end.line
  );
  if (found?.position === undefined) return null;

  const startLine = top + found.position.start.line;
  const endLine = top + found.position.end.line;
  const own = lines.slice(startLine - 1, endLine);
  const indent = commonIndent(own);
  const source = dedent(own, indent).join('\n');

  // When the table fills the whole region the parse above ALREADY answered
  // the slice question, so the second one is skipped. That is not a
  // micro-optimisation: a right click inside a 5,000-row table would otherwise
  // pay for the parse twice, measured at 837 ms with the skip against 1,662 ms
  // without it, where the parent commit's one parse cost 1,171 ms. A table
  // with a heading glued above it is the shape that still pays twice, and it
  // is the shape a person really has — 200 rows read 6 ms.
  const alreadyProved =
    regionTables.length === 1 &&
    indent === regionIndent &&
    (found.position.start.offset ?? -1) === 0 &&
    (found.position.end.offset ?? -1) === regionSource.length;
  if (!alreadyProved) {
    let nodes: Table[];
    try {
      nodes = tablesOf(source);
    } catch {
      return null;
    }
    const node = nodes[0];
    if (nodes.length !== 1 || node === undefined) return null;
    if ((node.position?.start.offset ?? -1) !== 0) return null;
    if ((node.position?.end.offset ?? -1) !== source.length) return null;
  }
  return { block: { startLine, endLine, indent }, source };
}

/**
 * The whole row: find the table under the caret, format it, and put the
 * block's own indent back on every line.
 *
 * The caller replaces lines `startLine`..`endLine` whole with `text`, which is
 * why the indent is restored here rather than left to a model edit.
 */
export function reshapeTableAt(
  lines: readonly string[],
  line: number
): TableReshaped {
  const found = tableAt(lines, line);
  if (found === null) {
    return { ok: false, why: 'The cursor is not inside a markdown table.' };
  }
  const { block } = found;
  const formatted = formatMarkdownTable(found.source, block.startLine - 1);
  if (!formatted.ok) return formatted;
  const text = formatted.text
    .split('\n')
    .map((l) => (l === '' ? l : block.indent + l))
    .join('\n');
  return { ok: true, text, startLine: block.startLine, endLine: block.endLine };
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/**
 * Every byte outside a string that is not significant, dropped.
 *
 * This IS the Minify JSON row, and it is also the guard in front of Format
 * JSON. `normaliseStrings` re-encodes each string token to its canonical form,
 * so `é` and `é` compare equal — that is a re-encoding of the same string
 * VALUE, and refusing it would refuse the commonest shape an agent writes.
 * Number literals are always compared as TEXT, which is the whole point:
 * `12345678901234567890` and `12345678901234567000` are different bytes and
 * must never pass.
 */
export function stripJsonWhitespace(src: string, normaliseStrings = false): string {
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (c === '"') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') {
          j += 2;
          continue;
        }
        if (src[j] === '"') break;
        j += 1;
      }
      const token = src.slice(i, j + 1);
      if (normaliseStrings) {
        try {
          out += JSON.stringify(JSON.parse(token) as unknown);
        } catch {
          out += token;
        }
      } else {
        out += token;
      }
      i = j;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') continue;
    out += c;
  }
  return out;
}

/** `not JSON: …` with the parser's own position, which names the offset. */
function refuseNotJson(err: unknown): Reshaped {
  const message = err instanceof Error ? err.message : String(err);
  return { ok: false, why: `That is not JSON — ${message}` };
}

/**
 * PRETTY-PRINT, with the guard in front of the answer.
 *
 * The guard is the reason this row can be trusted with a person's file: the
 * source and the re-serialised answer are both stripped to their significant
 * bytes and must be identical. When they are not, nothing is written and the
 * sentence names the offset and what would have changed there.
 *
 * What it is NOT is byte-preserving, and the header says which byte moves: a
 * string token is compared by value, so a `\u00e9` in the source comes back as
 * the character it names. Whitespace and string escape form are the two things
 * this row rewrites, and nothing else survives the comparison.
 */
export function prettyJson(src: string, indent = 2): Reshaped {
  let value: unknown;
  try {
    value = JSON.parse(src);
  } catch (err) {
    return refuseNotJson(err);
  }
  const out = JSON.stringify(value, null, indent);
  if (out === undefined) return { ok: false, why: 'That value has no JSON form.' };
  const before = stripJsonWhitespace(src, true);
  const after = stripJsonWhitespace(out, true);
  if (before !== after) {
    let i = 0;
    while (i < before.length && i < after.length && before[i] === after[i]) i += 1;
    return {
      ok: false,
      why:
        `Formatting would change more than whitespace at offset ${i}: ` +
        `${JSON.stringify(before.slice(i, i + 24))} would become ` +
        `${JSON.stringify(after.slice(i, i + 24))}.`
    };
  }
  return { ok: true, text: out };
}

/**
 * MINIFY. Validated first, then stripped byte for byte, so every number keeps
 * the digits the person wrote — the losses `JSON.stringify` causes are not
 * reachable from this row at all.
 */
export function minifyJson(src: string): Reshaped {
  try {
    JSON.parse(src);
  } catch (err) {
    return refuseNotJson(err);
  }
  return { ok: true, text: stripJsonWhitespace(src) };
}

/**
 * Group A's dynamic half for the two JSON rows: is this text an object or an
 * array that parses?
 *
 * An object or an array, and not any JSON value, because a selected `42` or a
 * selected `"word"` is valid JSON that formatting cannot change, and a row
 * that appears over every selected number is noise rather than an offer.
 */
export function isReshapableJson(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
