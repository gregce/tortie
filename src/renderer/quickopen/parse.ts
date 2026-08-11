/**
 * What the user typed into ⌘P, decided once. Pure — no store, no IPC — so
 * the awkward cases (a colon inside a filename, a bare `:412`, a trailing
 * colon mid-type) are pinned down by tests rather than found in the palette.
 *
 * The grammar is VS Code's, minus the parts gmux does not have:
 *
 *   foo/bar          fuzzy file path
 *   foo.ts:412       that file, at line 412
 *   foo.ts:412:9     …and column 9
 *   :412             line 412 of the file already on screen
 *   >…               reserved for a command palette. Say so; do not silently
 *                    search for a file called ">git".
 *
 * `@` and `#` (VS Code's symbol prefixes) are deliberately NOT special here:
 * quick open does not own symbol search, and a palette that swallowed `@`
 * with no symbol provider behind it would be a worse answer than treating it
 * as what it also legitimately is — a character in a filename. When the
 * symbol surface lands, this is the one function it extends.
 */

export type QuickOpenMode =
  /** Rank files, optionally landing on a line. */
  | 'files'
  /** Jump within the editor tab that is already open. */
  | 'goto-line'
  /** A prefix gmux has reserved but does not implement yet. */
  | 'reserved';

export interface ParsedQuickOpen {
  mode: QuickOpenMode;
  /** The path text to rank. Empty in `goto-line` and `reserved`. */
  term: string;
  /** 1-based, when the user typed `:N`. */
  line?: number;
  /** 0-based UTF-16 column, when the user typed `:N:C`. */
  column?: number;
  /** The reserved prefix, so the palette can name it in the message. */
  prefix?: string;
}

/**
 * `:412` and `:412:9` at the END of the string, and nothing else there.
 *
 * Anchored deliberately: `src/main:old/foo.ts` is a real (if unusual) path,
 * and only a trailing all-digits group means "line". A bare trailing colon
 * (`foo.ts:`) is someone mid-type — it parses as the path `foo.ts` with no
 * line, which is what makes typing a line number feel continuous instead of
 * blanking the list for one keystroke.
 */
const LINE_SUFFIX = /:(\d+)(?::(\d+))?:?$/;

export function parseQuickOpen(raw: string): ParsedQuickOpen {
  const input = raw.trim();

  if (input.startsWith('>')) {
    return { mode: 'reserved', term: '', prefix: '>' };
  }

  // A bare `:` or `:412` — no path at all — addresses the open editor.
  if (input.startsWith(':')) {
    const m = LINE_SUFFIX.exec(input);
    if (m === null) return { mode: 'goto-line', term: '' };
    return {
      mode: 'goto-line',
      term: '',
      line: Math.max(1, Number(m[1])),
      ...(m[2] === undefined ? {} : { column: Math.max(0, Number(m[2]) - 1) })
    };
  }

  const m = LINE_SUFFIX.exec(input);
  if (m === null) return { mode: 'files', term: stripTrailingColon(input) };

  return {
    mode: 'files',
    term: input.slice(0, m.index),
    line: Math.max(1, Number(m[1])),
    ...(m[2] === undefined ? {} : { column: Math.max(0, Number(m[2]) - 1) })
  };
}

/** `foo.ts:` mid-type ranks as `foo.ts`, not as a file whose name ends in ':'. */
function stripTrailingColon(input: string): string {
  return input.endsWith(':') ? input.slice(0, -1) : input;
}
