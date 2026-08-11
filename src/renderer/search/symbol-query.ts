/**
 * What the user typed into ⌘⇧O, decided once.
 *
 * Pure — no store, no IPC, no `window` — so the awkward cases are pinned by
 * tests rather than found in the palette. They matter more than they look:
 * the prefix chooses the SCOPE of the search, and getting it wrong makes the
 * answer silently missing rather than visibly wrong.
 *
 *   @foo      symbols in the file on screen, in document order
 *   #foo      symbols in the whole project, by score
 *   @ / #     everything in that scope
 *   foo       the scope the palette was opened in (the prefix was deleted)
 *   foo@bar   a NAME containing '@' — a prefix only counts at position 0
 */

/** `@` searches the open file; `#` searches the project. */
export type SymbolMode = '@' | '#';

export interface ParsedSymbolQuery {
  mode: SymbolMode;
  /** The text to rank, without the prefix and trimmed. */
  term: string;
}

export function parseSymbolQuery(
  raw: string,
  fallback: SymbolMode
): ParsedSymbolQuery {
  if (raw.startsWith('@')) return { mode: '@', term: raw.slice(1).trim() };
  if (raw.startsWith('#')) return { mode: '#', term: raw.slice(1).trim() };
  return { mode: fallback, term: raw.trim() };
}
