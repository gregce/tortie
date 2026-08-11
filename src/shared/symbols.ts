/**
 * Phase 14 SYMBOL shapes — what ⌘⇧O (and `@` / `#` in the palette) exchange
 * with the tree-sitter index in main.
 *
 * A NEW FILE, following the `fs-ops.ts` / `image-types.ts` precedent, because
 * three streams are appending to src/shared/ipc.ts in this phase and the only
 * reconcilable append is a small one. `ipc.ts` gains the channel declarations
 * and the bridge extras; the payloads live here.
 *
 * Owner: src/main/symbols/** (index, worker pool, persistence) and
 * src/renderer/search/** (the palette).
 */

/**
 * Deliberately LSP-shaped (research 19 §5.4). LSP itself is out of scope for
 * this app permanently — a resident indexing daemon per language per project,
 * on a laptop, next to running agents, is the opposite of what gmux is for —
 * but a hit that already looks like a `DocumentSymbol` costs nothing today and
 * leaves the door open.
 */
export type SymbolKind =
  | 'function'
  | 'method'
  | 'class'
  | 'interface'
  | 'struct'
  | 'type'
  | 'enum'
  | 'enum-member'
  | 'constant'
  | 'variable'
  | 'field'
  | 'module'
  | 'macro'
  | 'property';

/** One definition, as the palette renders it. */
export interface SymbolHit {
  name: string;
  kind: SymbolKind;
  /** Enclosing class / struct / trait / impl, when the query captured one. */
  container: string | null;
  /** Relative to repoPath, forward slashes, no leading "./". */
  relPath: string;
  /** 1-based, matching OpenFileSelection.line and Monaco. */
  line: number;
  /** 0-based UTF-16 column of the NAME (not the definition). */
  column: number;
  /** 0-based UTF-16, EXCLUSIVE — so ↩ selects exactly the identifier. */
  endColumn: number;
  /** Matched character indices in `name`, for per-character highlighting. */
  positions?: number[];
}

export interface SymbolQueryInput {
  repoPath: string;
  /** Empty is legal and means "everything", which `@` mode wants. */
  query: string;
  /** Present ⇒ `@` mode: this one file, sorted by position, not by score. */
  relPath?: string;
  limit: number;
}

export interface SymbolQueryResult {
  hits: SymbolHit[];
  /**
   * A build is running right now. The palette shows a 2 px indeterminate line
   * and keeps answering from whatever is already in the table — partial
   * results beat a progress bar you cannot type through.
   */
  indexing: boolean;
  /** Files whose symbols are in the table. */
  indexed: number;
  /** Files the build intends to parse. 0 until enumeration finishes. */
  total: number;
  /**
   * No index exists for this project and this call did not start one (only
   * `symbols:ensure` does). The palette SAYS SO rather than showing an empty
   * list, which would read as "this project has no symbols".
   */
  cold: boolean;
  /** A showable failure (grammars missing in the packaged app, unreadable root). */
  error?: string;
}

/**
 * Main → renderer index progress, throttled to at most one message per 250 ms
 * per repo. The palette needs it because a build outlives the invoke that
 * started it: on a 50k-file repo the build is ~23 s and the user is typing
 * throughout.
 */
export interface SymbolIndexProgress {
  repoPath: string;
  indexing: boolean;
  indexed: number;
  total: number;
  /** Symbols in the in-memory table right now. */
  symbols: number;
  error?: string;
}

/** What `symbols:ensure` reports back immediately. */
export interface SymbolEnsureResult {
  /** True when this call started a build (as opposed to one already running). */
  started: boolean;
  indexing: boolean;
  indexed: number;
  total: number;
}
