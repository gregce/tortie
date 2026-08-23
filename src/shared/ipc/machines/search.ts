/**
 * Searching a machine's files (Phase 125, from Phase 98).
 *
 * Three members and one invoke channel. It searches one folder on one machine
 * with that machine's own grep. It writes nothing on either computer and it
 * sends no program.
 *
 * THE ROWS ARE THE LOCAL ROWS. The answer carries `SearchFileResult`, which is
 * what the local search already returns, so the Search view draws ONE kind of
 * row.
 *
 * ONE DOOR. Nothing outside src/shared/ipc/ imports this file. The barrel is
 * src/shared/ipc/machines.ts and src/shared/ipc/index.ts re-exports that. The
 * FACADE_ONLY rule in build/assert-import-boundaries.mjs fails a second door.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

// PHASE 98. A search on another machine returns the rows the search on this Mac
// already returns, so the Search view draws ONE kind of row. Two declarations of
// one shape is how the two ends of a channel drift apart.
import type { SearchFileResult } from '../search';

// ---------------------------------------------------------------------------
// Searching one folder on one machine (Phase 98, research 57 section 2)
// ---------------------------------------------------------------------------
//
// ONE READ, ONE ANSWER. Nothing is written on either computer. The command that
// crosses is `repo-search` from the frozen catalogue in
// src/main/machines/remote-scripts.ts, chosen by name, with the folder, the
// pattern, the flag letters and the two caps arriving there as positional
// parameters. NOTHING IS SENT TO THAT MACHINE except that constant text.
//
// THE ROWS ARE THE LOCAL ROWS. `files` carries `SearchFileResult`, which is what
// the ⌘⇧F stream carries, so the Search view draws one kind of row and
// `ResultsList`, `rows.ts` and `result-menu.ts` need no second shape.
//
// THE CAPS ARE THE LOCAL CAPS. `SEARCH_LIMITS.maxResults`,
// `SEARCH_LIMITS.maxPerFile` and `SEARCH_LIMITS.maxLineChars` from ./search.ts
// bound this answer too. No new number is invented for any of the three.
//
// NO PROSE CROSSES THIS CHANNEL. Every sentence a person reads about a remote
// search is drawn by the renderer from src/renderer/machines/presentation.ts, where
// the vocabulary audit reads it. This answer carries a status word and counts.
//
// THERE IS NO STREAM, because there is nothing to stream. The far side has
// finished scanning before the first byte comes back: research 57 section 2.4
// measured a whole 33,023,414 byte tracked corpus at 174 to 176 ms.

/** Which files the far side read, or why it read none. */
export type MachineSearchMode =
  /** The folder is a git repository. Its tracked and untracked files were read. */
  | 'repo'
  /** The folder is not a repository. Every file under it was read. */
  | 'walk'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** That machine's grep did not accept the pattern. */
  | 'badPattern'
  /** Tortie is not connected to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One ⌘⇧F query against one folder on one machine. */
export interface MachineSearchInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
  /** The pattern. An empty one is refused before anything is sent. */
  readonly query: string;
  readonly isRegex: boolean;
  readonly isCaseSensitive: boolean;
  readonly matchWholeWord: boolean;
  /** Clamped to SEARCH_LIMITS.maxResults. Omitted means that number. */
  readonly maxResults?: number;
}

/** What one machine answered about one folder. */
export interface MachineSearchResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was searched, on that machine. */
  readonly cwd: string;
  readonly mode: MachineSearchMode;
  /** The rows, in the shape the local search already produces. */
  readonly files: SearchFileResult[];
  /** Matching lines delivered. */
  readonly totalMatches: number;
  /** Files with at least one match. */
  readonly totalFiles: number;
  /** The match cap cut the answer. These are the first N, not all of them. */
  readonly capped: boolean;
  /** The size ceiling cut the answer on that machine. */
  readonly truncated: boolean;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}

// ---------------------------------------------------------------------------
// The channels this family declares
// ---------------------------------------------------------------------------

export interface MachinesSearchInvokeChannelMap {
  // PHASE 98. One READ of one folder on one machine, for the Search view of a
  // project that lives over there. It writes nothing on either computer, it
  // sends no program, and main refuses it while it is not connected to that
  // machine.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-search`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder, the pattern, the flag letters and the two caps
  // arriving there as positional parameters.
  //
  // A folder that is not there, a pattern that machine's grep refused and a
  // machine that did not answer all come back as a status word. No prose
  // crosses this channel: the renderer draws every sentence from
  // src/renderer/machines/presentation.ts, where the vocabulary audit reads it.
  'machines:searchContent': {
    req: [input: MachineSearchInput];
    res: MachineSearchResult;
  };
}

// ---------------------------------------------------------------------------
// The bridge methods this family declares
// ---------------------------------------------------------------------------

export interface MachinesSearchApi {
  // Phase 98. Searches one folder on one machine with that machine's own
  // grep. It reads and never writes.
  searchContent(input: MachineSearchInput): Promise<MachineSearchResult>;
}
