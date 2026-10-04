/**
 * WHETHER AN AGENT'S OWN PROMPT IS EMPTY, READ FROM ITS STYLED SCREEN (Phase
 * 318, build/p318/SPEC.md §5.4.4, D14; §Revision R17, R23, R24; research 135
 * §3.5).
 *
 * A message lands wherever the agent's input is, so it is sent only to an
 * agent sitting at its OWN EMPTY PROMPT. Anywhere else it does harm: over a
 * draft the two merge and are submitted as one, after a stray `1` it carries
 * it, and the agent's own status cannot see either (Claude's registry reads
 * idle with a draft in its row). So the prompt row is read here, over a capture
 * taken with `-e`, because a plain capture cannot tell a placeholder from typed
 * text: Codex's `› Ask Codex to do anything` is drawn dim and reads as typed
 * without its style.
 *
 * WHAT COUNTS. A cell is PLACEHOLDER when it is drawn dim (SGR 2) or in a grey
 * foreground (90, or 38;5;240 to 250), and the CURSOR when it is drawn inverse
 * and is a space, or is placeholder. A row is empty when everything after its
 * glyph is spaces, placeholder or cursor, and its caret is where an empty
 * prompt's caret is:
 *
 *  - CLAUDE CODE (2.1.287, R23): the one row whose text starts `❯` with a row of
 *    at least ten `─` directly above and directly below; the space after its
 *    glyph is a NO-BREAK SPACE on that row (measured, see `NBSP`). It draws no
 *    placeholder, draws its caret as an inverse space right after `❯ ` while
 *    focused, and draws NO caret after a focus-out (the Mac window not focused,
 *    which is the phone's usual case), so a caret is never required. When an
 *    inverse cell is there it must be the first cell after `❯` and its one
 *    space: an inverse cell anywhere later means something sits before the
 *    caret, whatever style that something is drawn in (R17).
 *  - CODEX (0.160.0, R24): the last row whose text starts `› ` and is not an
 *    option row. Its placeholder is dim, and it draws the terminal's own cursor,
 *    so tmux's cursor must be on that row at the first column after `› ` (R17);
 *    a cursor that could not be read is not empty. A multi-line draft draws its
 *    later lines under the row, so every row between it and the next blank row
 *    must be blank too.
 *
 * IT FAILS CLOSED. No row found, more than one candidate, a row holding an
 * escape this reader does not know, or anything else: not empty, and no
 * message is offered. What it cannot see is stated in the SPEC (§5.4.4): a
 * draft drawn dim or grey on a Claude row that shows no inverse cell reads as
 * placeholder. No real capture drew a draft so.
 *
 * PURE. It imports nothing and logs nothing.
 */

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
