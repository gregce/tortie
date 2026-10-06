/**
 * input-row.ts READS THROUGH THE ONE STYLE READER AND ANSWERS WHAT IT ANSWERED
 * (Phase 337, build/p337/SPEC.md §5.3.4, D11, §7.2).
 *
 * The phone's message gate (Phase 318) decides whether an agent's own prompt
 * is empty from a styled capture. Phase 337 replaced its private SGR reader with
 * src/main/screen/sgr.ts, read through a projection. This test holds the
 * projection to the parent: the parent's reader is COPIED VERBATIM below, from
 * `src/main/reply/input-row.ts` at `aebb4ce9` (lines 46 to 318, its whole body
 * after the header), a deliberate copy that is the oracle, and the first test
 * proves the copy is byte for byte that body by its sha256. The integrator's
 * duplicate scan finds it here on purpose.
 *
 * Over every committed `.ansi` and 2,000 generated screens (the projection's
 * four attributes in every order, every grey index 230 to 255, unknown modes,
 * tabs, controls and escapes), the rows are equal cell for cell and
 * `promptIsEmpty` answers the same for both agents. The one deliberate
 * difference, an underline colour's arguments (`58;…`), which the parent read
 * as attributes, is named in its own test and kept out of the corpus.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { promptIsEmpty as promptIsEmptyNow, readInputRows } from '../../reply/input-row';
import { realCaptures, REPLY_FIXTURES, styledFixture } from '../../reply/__tests__/fixtures';

// ---- BEGIN THE PARENT: src/main/reply/input-row.ts at aebb4ce9, lines 46 to 318, verbatim ----
const ESC = String.fromCharCode(0x1b);
const BEL = String.fromCharCode(0x07);
/**
 * A no-break space. MEASURED, not assumed: Claude Code 2.1.287 draws its
 * composer row as `❯` and U+00A0, where its transcript's echoed prompts and
 * Codex's row use U+0020 (build/fixtures/reply/claude-prompt-*.ansi), so a
 * reader that knew only U+0020 read every empty Claude prompt as typed. Built
 * from its code point because no such character stands in a source file here.
 */
const NBSP = String.fromCharCode(0xa0);

/** One drawn cell, with the three attributes this reader asks about. */
interface Cell {
  readonly ch: string;
  readonly dim: boolean;
  readonly grey: boolean;
  readonly inverse: boolean;
}

/** One row of cells; `readable` is false when it held an escape this reader does not know. */
interface Row {
  readonly cells: Cell[];
  readable: boolean;
}

/** The SGR state, carried ACROSS rows: tmux does not reset it at a line's end. */
interface Pen {
  dim: boolean;
  grey: boolean;
  inverse: boolean;
}

/** The compiled rules, a frozen literal no configuration reaches. */
const RULES = Object.freeze({
  /** Claude's prompt glyph. */
  claudeGlyph: '❯',
  /** The rule rows above and below Claude's prompt: at least ten of these and nothing else. */
  claudeRule: /^─{10,}$/,
  /** Codex's prompt glyph and the space after it. */
  codexGlyph: '› ',
  /** A Codex option row, which starts with the same glyph. */
  codexOption: /^›\s+\d+[.)]/,
  /** The grey 256-colour band a placeholder may be drawn in. */
  greyLow: 240,
  greyHigh: 250,
  /** The bright-black foreground. */
  greyBasic: 90
});

/** Placeholder: dim or grey. */
function placeholder(cell: Cell): boolean {
  return cell.dim || cell.grey;
}

/** A space: U+0020, or the U+00A0 Claude Code draws after its glyph. */
function blank(cell: Cell): boolean {
  return cell.ch === ' ' || cell.ch === NBSP;
}

/** Whether a 256-colour index is the grey band. */
function greyIndex(n: number): boolean {
  return Number.isInteger(n) && n >= RULES.greyLow && n <= RULES.greyHigh;
}

/**
 * Apply one SGR sequence's parameters to the pen. Answers false for a
 * parameter list this reader cannot follow, which makes the row unreadable.
 */
function applySgr(params: string, pen: Pen): boolean {
  const parts = params.length === 0 ? ['0'] : params.split(';');
  for (let k = 0; k < parts.length; k += 1) {
    const sub = (parts[k] ?? '').split(':');
    const code = sub[0] === '' ? 0 : Number(sub[0]);
    if (!Number.isInteger(code)) return false;
    if (code === 0) {
      pen.dim = false;
      pen.grey = false;
      pen.inverse = false;
    } else if (code === 2) {
      pen.dim = true;
    } else if (code === 22) {
      pen.dim = false;
    } else if (code === 7) {
      pen.inverse = true;
    } else if (code === 27) {
      pen.inverse = false;
    } else if ((code >= 30 && code <= 37) || code === 39 || (code >= 91 && code <= 97)) {
      pen.grey = false;
    } else if (code === RULES.greyBasic) {
      pen.grey = true;
    } else if (code === 38 || code === 48) {
      // An extended colour: `38:5:n` / `38:2:…` in one part, or `38;5;n` /
      // `38;2;r;g;b` across parts. The background's arguments are consumed and
      // change nothing.
      let mode: string | undefined;
      let index: number | undefined;
      if (sub.length > 1) {
        mode = sub[1];
        index = mode === '5' ? Number(sub[2]) : undefined;
      } else {
        mode = parts[k + 1];
        if (mode === '5') {
          index = Number(parts[k + 2]);
          k += 2;
        } else if (mode === '2') {
          k += 4;
        }
      }
      if (mode !== '5' && mode !== '2') return false;
      if (code === 38) pen.grey = mode === '5' && index !== undefined && greyIndex(index);
    }
    // Every other attribute (bold, italic, underline, a background) changes
    // nothing this reader asks about.
  }
  return true;
}

/** The styled capture, cut into rows of cells with the SGR state carried across rows. */
function rowsOf(styled: string): Row[] {
  const rows: Row[] = [];
  const pen: Pen = { dim: false, grey: false, inverse: false };
  let row: Row = { cells: [], readable: true };
  let i = 0;
  while (i < styled.length) {
    const c = styled.charAt(i);
    if (c === '\n') {
      rows.push(row);
      row = { cells: [], readable: true };
      i += 1;
      continue;
    }
    if (c === ESC) {
      const next = styled.charAt(i + 1);
      if (next === '[') {
        let j = i + 2;
        while (j < styled.length && /[0-?]/.test(styled.charAt(j))) j += 1;
        const params = styled.substring(i + 2, j);
        const paramsEnd = j;
        while (j < styled.length && /[ -/]/.test(styled.charAt(j))) j += 1;
        const final = styled.charAt(j);
        if (!(final === 'm' && j === paramsEnd && applySgr(params, pen))) row.readable = false;
        i = j + 1;
        continue;
      }
      if (next === ']') {
        // An OSC (a hyperlink, say) draws no cell: skipped to its terminator.
        let j = i + 2;
        while (
          j < styled.length &&
          styled.charAt(j) !== BEL &&
          styled.charAt(j) !== '\n' &&
          !(styled.charAt(j) === ESC && styled.charAt(j + 1) === '\\')
        ) {
          j += 1;
        }
        if (styled.charAt(j) === BEL) i = j + 1;
        else if (styled.charAt(j) === ESC) i = j + 2;
        else {
          row.readable = false;
          i = j;
        }
        continue;
      }
      row.readable = false;
      i += 2;
      continue;
    }
    const cp = styled.codePointAt(i) ?? 0;
    const ch = String.fromCodePoint(cp);
    if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) row.readable = false;
    else row.cells.push({ ch, dim: pen.dim, grey: pen.grey, inverse: pen.inverse });
    i += ch.length;
  }
  rows.push(row);
  return rows;
}

/** A row's drawn text. */
function textOf(row: Row): string {
  return row.cells.map((cell) => cell.ch).join('');
}

/** How many plain spaces open the row. */
function leadingSpaces(row: Row): number {
  let n = 0;
  while (n < row.cells.length && row.cells[n]?.ch === ' ') n += 1;
  return n;
}

/** Claude Code's prompt row, read as R23 and R17 say. */
function claudeEmpty(rows: readonly Row[]): boolean {
  const texts = rows.map(textOf);
  const candidates: number[] = [];
  for (let i = 1; i < rows.length - 1; i += 1) {
    if (
      (texts[i] ?? '').trimStart().startsWith(RULES.claudeGlyph) &&
      RULES.claudeRule.test((texts[i - 1] ?? '').trim()) &&
      RULES.claudeRule.test((texts[i + 1] ?? '').trim())
    ) {
      candidates.push(i);
    }
  }
  if (candidates.length !== 1) return false;
  const row = rows[candidates[0] ?? -1];
  if (row === undefined || !row.readable) return false;
  const glyph = leadingSpaces(row);
  if (row.cells[glyph]?.ch !== RULES.claudeGlyph) return false;
  for (let j = glyph + 1; j < row.cells.length; j += 1) {
    const cell = row.cells[j];
    if (cell === undefined) return false;
    if (cell.inverse) {
      // THE CARET: only right after `❯` and its one space, which is not inverse.
      const gap = row.cells[glyph + 1];
      if (j !== glyph + 2 || gap === undefined || !blank(gap) || gap.inverse) return false;
      if (blank(cell) || placeholder(cell)) continue;
      return false;
    }
    if (blank(cell) || placeholder(cell)) continue;
    return false;
  }
  return true;
}

/** Codex's prompt row, read as R24 and R17 say. */
function codexEmpty(rows: readonly Row[], cursor: { x: number; y: number } | null): boolean {
  if (cursor === null) return false;
  const texts = rows.map(textOf);
  let at = -1;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const text = (texts[i] ?? '').trimStart();
    if (text.startsWith(RULES.codexGlyph) && !RULES.codexOption.test(text)) {
      at = i;
      break;
    }
  }
  if (at === -1) return false;
  const row = rows[at];
  if (row === undefined || !row.readable) return false;
  const lead = leadingSpaces(row);
  const first = lead + RULES.codexGlyph.length;
  if (textOf({ cells: row.cells.slice(lead, first), readable: true }) !== RULES.codexGlyph) return false;
  // THE CARET: the terminal's own cursor, at the first column after `› `.
  if (cursor.y !== at || cursor.x !== first) return false;
  for (let j = first; j < row.cells.length; j += 1) {
    const cell = row.cells[j];
    if (cell === undefined) return false;
    if (blank(cell) || placeholder(cell)) continue;
    return false;
  }
  // A draft's later lines sit under the row until the blank row before the footer.
  for (let k = at + 1; k < rows.length; k += 1) {
    if ((texts[k] ?? '').trim().length === 0) break;
    return false;
  }
  return true;
}

/**
 * Whether the agent's own prompt is empty, over a capture taken with `-e`.
 * `cursor` is tmux's cursor for the pane, 0-based: null for Claude, and null
 * (which reads not empty) when Codex's could not be read.
 */
export function promptIsEmpty(
  agent: 'claude' | 'codex',
  styled: string,
  /** tmux's cursor for the pane, 0-based; null for Claude, and null (not empty) when Codex's could not be read. */
  cursor: { x: number; y: number } | null
): boolean {
  const rows = rowsOf(styled);
  if (agent === 'claude') return claudeEmpty(rows);
  if (agent === 'codex') return codexEmpty(rows, cursor);
  return false;
}
// ---- END THE PARENT ----

/** The sha256 of the parent's lines 46 to 318 at aebb4ce9 (`git show aebb4ce9:src/main/reply/input-row.ts`). */
const PARENT_BODY_SHA256 = '6d1338d3687441cfd071ad7c3842ff0ebfa68cdbdbf2e6e3b4afe3e605a88553';

const NBSP_NOW = String.fromCharCode(0xa0);
const TAB = String.fromCharCode(0x09);

/** A deterministic generator (mulberry32), so the corpus is the same every run. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The SGR parameters the corpus draws from: every code the projection reads, and the colour forms. */
function sgrParams(pick: <T>(items: readonly T[]) => T, int: (n: number) => number): string {
  const grey = 230 + int(26);
  const forms = [
    '',
    '0',
    '1',
    '2',
    '22',
    '7',
    '27',
    '90',
    `3${String(int(8))}`,
    '39',
    `9${String(1 + int(7))}`,
    '3',
    '4',
    '4:3',
    '9',
    '23',
    '24',
    '5',
    '8',
    '28',
    `4${String(int(8))}`,
    '49',
    '100',
    '10',
    '73',
    `38;5;${String(grey)}`,
    `38:5:${String(grey)}`,
    `38;5;${String(pick([8, 16, 196, 239, 251, 300]))}`,
    `38;2;${String(int(256))};${String(int(256))};${String(int(256))}`,
    `38:2::${String(int(256))}:${String(int(256))}:${String(int(256))}`,
    `48;5;${String(grey)}`,
    '48;2;1;2;3',
    '38;5',
    '38;2;1'
  ];
  const n = 1 + int(3);
  const parts: string[] = [];
  for (let i = 0; i < n; i += 1) parts.push(pick(forms));
  return parts.join(';');
}

/** One token of a row: text, a style, or something the readers must refuse. */
function token(pick: <T>(items: readonly T[]) => T, int: (n: number) => number): string {
  const kind = int(20);
  if (kind < 9) return pick(['❯', NBSP_NOW, ' ', ' ', 'a', 'typed', '›', '1.', 'x', String.fromCodePoint(0xe9), String.fromCodePoint(0x1f44d)]);
  if (kind < 17) return `${ESC}[${sgrParams(pick, int)}m`;
  // The unknown modes and the refused shapes.
  return pick([
    `${ESC}[38;7;1m`,
    `${ESC}[38:9m`,
    `${ESC}[38m`,
    `${ESC}[?25m`,
    `${ESC}[1 m`,
    `${ESC}[2K`,
    `${ESC}]8;;https://example.invalid${BEL}`,
    `${ESC}]8;;${ESC}\\`,
    `${ESC}]8;;open`,
    `${ESC}(B`,
    TAB,
    String.fromCharCode(0x07),
    String.fromCharCode(0x0d),
    String.fromCharCode(0x7f),
    String.fromCharCode(0x9b),
    `${ESC}`
  ]);
}

interface Case {
  readonly styled: string;
  readonly cursor: { x: number; y: number } | null;
}

/** 2,000 generated screens: half shaped as Claude's composer, half as Codex's. */
function corpus(): Case[] {
  const random = generator(337);
  const int = (n: number): number => Math.floor(random() * n);
  const pick = <T,>(items: readonly T[]): T => items[int(items.length)] as T;
  const row = (lead: string): string => {
    let text = lead;
    const n = int(6);
    for (let i = 0; i < n; i += 1) text += token(pick, int);
    return text;
  };
  const rule = `${ESC}[38;5;244m${'─'.repeat(12)}`;
  const cases: Case[] = [];
  for (let i = 0; i < 2000; i += 1) {
    if (i % 2 === 0) {
      const prompt = row(`${ESC}[39m${pick(['', `${ESC}[${sgrParams(pick, int)}m`])}❯${pick([NBSP_NOW, ' '])}${pick(['', `${ESC}[7m `, `${ESC}[7m${ESC}[2mx`])}`);
      cases.push({ styled: ['', pick([rule, row('')]), prompt, pick([rule, rule, row('')]), row('  footer')].join('\n'), cursor: null });
    } else {
      const prompt = row(`${pick(['', `${ESC}[1m`])}›${pick(['', `${ESC}[0m`])} ${pick(['', `${ESC}[2mAsk Codex to do anything`, 'draft'])}`);
      const below = pick([[], [row('  ')], ['']]);
      cases.push({
        styled: ['  >_ OpenAI Codex', '', prompt, ...below, '', '  gpt-5.4 default · /work'].join('\n'),
        cursor: pick([{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: int(5), y: int(5) }])
      });
    }
  }
  return cases;
}

describe('input-row.ts reads through the one style reader and answers what its parent answered', () => {
  it('the parent copied above is byte for byte the body of input-row.ts at aebb4ce9', () => {
    const own = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    const begin = own.indexOf('\n', own.indexOf('// ---- BEGIN THE PARENT')) + 1;
    const end = own.indexOf('// ---- END THE PARENT');
    expect(begin).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(begin);
    expect(createHash('sha256').update(own.slice(begin, end)).digest('hex')).toBe(PARENT_BODY_SHA256);
  });

  it('every committed .ansi: the rows are equal cell for cell, and promptIsEmpty answers the same for both agents', () => {
    const files = readdirSync(REPLY_FIXTURES).filter((f) => f.endsWith('.ansi')).sort();
    expect(files).toHaveLength(16);
    const cursors = new Map(realCaptures().map((c) => [c.files[0] ?? '', { x: c.cursor.x, y: c.cursor.y }]));
    for (const file of files) {
      const styled = styledFixture(file);
      expect(readInputRows(styled), file).toEqual(rowsOf(styled));
      const cursor = cursors.get(file) ?? { x: 2, y: 25 };
      expect(promptIsEmptyNow('claude', styled, null), file).toBe(promptIsEmpty('claude', styled, null));
      expect(promptIsEmptyNow('codex', styled, cursor), file).toBe(promptIsEmpty('codex', styled, cursor));
    }
  });

  it('2,000 generated screens: the rows are equal cell for cell, and promptIsEmpty answers the same', () => {
    const cases = corpus();
    expect(cases).toHaveLength(2000);
    let empties = 0;
    let typed = 0;
    let unreadableRows = 0;
    let greyCells = 0;
    let dimCells = 0;
    let inverseCells = 0;
    for (const c of cases) {
      const parent = rowsOf(c.styled);
      expect(readInputRows(c.styled), JSON.stringify(c.styled)).toEqual(parent);
      for (const r of parent) {
        if (!r.readable) unreadableRows += 1;
        for (const cell of r.cells) {
          if (cell.grey) greyCells += 1;
          if (cell.dim) dimCells += 1;
          if (cell.inverse) inverseCells += 1;
        }
      }
      for (const agent of ['claude', 'codex'] as const) {
        const cursor = agent === 'codex' ? c.cursor : null;
        const was = promptIsEmpty(agent, c.styled, cursor);
        expect(promptIsEmptyNow(agent, c.styled, cursor), `${agent} ${JSON.stringify(c.styled)}`).toBe(was);
        if (was) empties += 1;
        else typed += 1;
      }
    }
    // The corpus is not vacuous: it reaches both answers and all four attributes.
    expect(empties).toBeGreaterThan(100);
    expect(typed).toBeGreaterThan(100);
    expect(unreadableRows).toBeGreaterThan(100);
    expect(greyCells).toBeGreaterThan(100);
    expect(dimCells).toBeGreaterThan(100);
    expect(inverseCells).toBeGreaterThan(100);
  });

  it('every grey index 230 to 255, in both spellings, and the basic slot, read as the parent read them', () => {
    for (let n = 230; n <= 255; n += 1) {
      for (const form of [`38;5;${String(n)}`, `38:5:${String(n)}`]) {
        const styled = `${ESC}[${form}mx`;
        expect(readInputRows(styled), form).toEqual(rowsOf(styled));
      }
    }
    for (const form of ['90', '38;5;8', '37', '97']) {
      const styled = `${ESC}[${form}mx`;
      expect(readInputRows(styled), form).toEqual(rowsOf(styled));
    }
  });

  it('THE ONE DELIBERATE DIFFERENCE: an underline colour’s arguments, which the parent read as attributes', () => {
    // `58;5;2` is an underline drawn in colour 2. The parent read the `2` as
    // dim, so a draft typed after it read as placeholder and the prompt as
    // empty; the shared reader reads the colour it is, and the gate fails closed.
    const rule = `${ESC}[38;5;244m${'─'.repeat(12)}`;
    const screen = ['', rule, `${ESC}[39m❯${NBSP_NOW}${ESC}[58;5;2mtyped`, rule, '  footer'].join('\n');
    expect(promptIsEmpty('claude', screen, null)).toBe(true);
    expect(promptIsEmptyNow('claude', screen, null)).toBe(false);
  });
});
