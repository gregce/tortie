/**
 * Search contract: streaming content search (⌘⇧F), the symbol index
 * (⌘⇧O), quick open (⌘P), and the Find-menu action ids. Moved verbatim
 * from src/shared/ipc.ts (Phase 42 stage 2).
 */

import type { Unsubscribe } from './base';

// ---------------------------------------------------------------------------
// APPENDED by Phase 14 — project-wide CONTENT search (⌘⇧F). Spec:
// docs/research/19-search.md §2.4. New channels and types only; nothing above
// was modified except the one `& SearchInvokeChannelMap` in
// GmuxInvokeChannelMap (interfaces hoist, so the forward reference is sound —
// the same shape GitBranchesInvokeChannelMap already uses).
//
// THE STREAM, and why it is shaped like this:
//
//   ripgrep's time-to-first-result is ~3 ms on every corpus measured (312
//   files to 107k), while TOTAL time varies 400x with the number of MATCHES.
//   So the only honest contract is a streaming one: `search:start` resolves
//   as soon as the child is spawned, and results arrive on a per-search emit
//   channel until a frame says `done`. The renderer never waits for
//   completion, and a big repo is not a frozen window.
//
//   searchResultsChannel(searchId) follows the termDataChannel(sessionId)
//   precedent already in this file.
//
// SUBSCRIBE FIRST. `ContentSearchInput.searchId` exists so the caller can mint
// the id, subscribe to the channel, and only then invoke — closing the window
// between "main starts emitting" and "the renderer is listening". Main mints
// one when it is omitted (and holds the first frame back a tick), but the
// race-free order is the supported one.
//
// ONE LIVE SEARCH PER WINDOW. Starting a search SIGKILLs any other search
// still running for the same window and closes its stream with
// `{done:true, cancelled:true}`. A superseded query therefore cannot paint
// over a newer one's results even if the renderer's debounce misbehaves — the
// guarantee is structural, not a matter of the caller remembering to cancel.
//
// TWO THINGS ARE NEVER SEARCHED, and the UI must say so rather than let the
// user infer a clean zero: files larger than `maxFilesizeBytes` (echoed on the
// final frame so the copy can name the number), and BINARY files — ripgrep
// quits at the first NUL byte. When the NUL comes late enough that matches
// were already reported, the file group carries `binary: true`; when it is in
// the first buffer the file never appears at all, which no engine flag can
// change. Both are policies to state, not counts we can report.
//
// MAIN: src/main/search/{resolve,args,parser,engine,context,ipc}.ts.
// ---------------------------------------------------------------------------

/**
 * The shared defaults. Both ends read these so "20,000" is written once —
 * main clamps to them, the UI states them ("Showing the first 20,000
 * results"), and neither can drift from the other.
 */
export const SEARCH_LIMITS = {
  /** Matches DELIVERED before the search stops and reports `capped`. */
  maxResults: 20_000,
  /** Matches kept per file before the group reports `clipped`. */
  maxPerFile: 1_000,
  /**
   * UTF-16 units of a single result line kept, windowed around the first
   * match. MANDATORY: ripgrep's --json printer ignores --max-columns, and a
   * minified bundle produces 7 MB lines (measured 6,952,086 bytes).
   */
  maxLineChars: 2_000,
  /** Files bigger than this are not searched at all (ripgrep --max-filesize). */
  maxFilesizeBytes: 10 * 1024 * 1024
} as const;

/** One ⌘⇧F query. Everything the engine needs; no hidden state in main. */
export interface ContentSearchInput {
  /** Absolute project root. Searched with cwd = this path. */
  repoPath: string;
  /** The pattern. Empty is refused — it would match every line of every file. */
  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  matchWholeWord: boolean;
  /** Comma-separated globs, VS Code syntax ("src/**, *.ts"). Empty = all. */
  includes: string;
  /** Comma-separated globs to skip ("**\/dist/**, *.min.js"). Empty = none. */
  excludes: string;
  /** false → --no-ignore: .gitignore/.ignore stop being respected. */
  useIgnoreFiles: boolean;
  /**
   * Context lines either side — DOCUMENTED AS UNUSED, on purpose. The stream
   * never carries context: measured, `-A1 -B1` costs 214 ms → 394 ms and
   * 47 MB → 84 MB for lines nobody sees until a group is expanded. Expanding
   * reads them from disk through `search:context` instead. The field is kept
   * so this decision has somewhere to live, not so it can be set.
   */
  contextLines: number;
  /** Caller-minted stream id — see "SUBSCRIBE FIRST" above. */
  searchId?: string;
  /**
   * Set to stream a REPLACE PREVIEW alongside the results: ripgrep emits the
   * original and the replacement per submatch in the same pass, so the
   * preview costs nothing extra. Capture groups are whatever `rg -r` already
   * supports ($1, ${name}). This previews only — nothing is written.
   */
  replace?: string;
  /** Override SEARCH_LIMITS.maxResults (the "Show more" affordance). */
  maxResults?: number;
  /** Override SEARCH_LIMITS.maxPerFile. */
  maxPerFile?: number;
  /** Override SEARCH_LIMITS.maxLineChars. */
  maxLineChars?: number;
  /** Override SEARCH_LIMITS.maxFilesizeBytes. */
  maxFilesizeBytes?: number;
  /**
   * Force multiline matching. Omitted = auto (on when a regex can match a
   * newline), which is what a user typing `foo\nbar` expects.
   */
  multiline?: boolean;
  /**
   * Delay the spawn by this many ms; a newer search from the same window
   * cancels a still-pending one before any process exists. 0 = spawn now
   * (the renderer owns its own debounce).
   */
  debounceMs?: number;
}

/** One matching line, ready to render — no post-processing in the renderer. */
export interface SearchMatch {
  /** 1-based, matching OpenFileSelection.line and Monaco. */
  line: number;
  /**
   * The line, newline stripped, leading whitespace removed and ALREADY
   * clamped to maxLineChars. Never trust it to be the whole line.
   */
  text: string;
  /**
   * The TOTAL number of ORIGINAL-line UTF-16 units that precede `text[0]` —
   * the stripped indentation PLUS, when `truncated`, the window's own left
   * edge (less the one-character ellipsis head standing in for it).
   *
   * `ranges` index into `text`; `range + trimmed` is the column in the FILE.
   * That is the only sum an editor can navigate by, so nothing may be left
   * out of it: reporting the indentation alone once selected column ~1,875
   * for a match that lives at column 4,880 of a 5,006-character line.
   */
  trimmed: number;
  /**
   * Highlight spans as [start, end) UTF-16 offsets into `text` — ripgrep's
   * BYTE offsets are converted in main, once, before the row crosses IPC.
   */
  ranges: [number, number][];
  /** One per range, present only when `replace` preview was requested. */
  replacements?: string[];
  /** Byte offset of the line start in the file (the replace path needs it). */
  byteOffset: number;
  /** The line was longer than maxLineChars and `text` is a window of it. */
  truncated?: boolean;
}

/**
 * Matches for one file, in one frame.
 *
 * EVERYTHING HERE IS INCREMENTAL and frames may repeat a relPath (a file with
 * many hits spans several). The merge rule is uniform, which is why it is
 * safe: append `matches`, SUM `matchCount`, OR `clipped` and `binary`. A
 * group with an empty `matches` array is a flag-only update (a file that
 * turned out to be binary after its matches were already sent).
 */
export interface SearchFileResult {
  /** Relative to repoPath, forward slashes, no leading "./". */
  relPath: string;
  /** Matches FOUND in this frame — exceeds matches.length when clipped. */
  matchCount: number;
  matches: SearchMatch[];
  /** maxPerFile cut this group: matchCount is real, matches is not all of it. */
  clipped: boolean;
  /**
   * ripgrep stopped early because the file is binary (non-null binary_offset).
   * Anything after that offset was NOT searched — say so, never imply a clean
   * zero-result tail.
   */
  binary?: boolean;
}

/** One streamed frame. `files` is INCREMENTAL; the totals are cumulative. */
export interface SearchProgress {
  searchId: string;
  /** Monotonic per search, from 0. Drop any frame older than the last seen. */
  seq: number;
  /** New matches since the previous frame. Merge by relPath. */
  files: SearchFileResult[];
  /** Matches delivered so far (what maxResults counts). */
  totalMatches: number;
  /** Files with at least one match so far. */
  totalFiles: number;
  /** Last frame for this searchId. Nothing follows it. */
  done: boolean;
  /** maxResults stopped the search — results are the FIRST N, not all of them. */
  capped: boolean;
  /** The search was superseded or cancelled: do not paint, do not "finish". */
  cancelled?: boolean;
  /** Showable failure (bad regex, unreadable root). Only ever on the last frame. */
  error?: string;
  /** Wall time from spawn to the last frame, ms. Set on the final frame. */
  elapsedMs?: number;
  /**
   * DIAGNOSTIC: ms from spawn to the first match ripgrep produced, set on the
   * frame that carries it. This is the number the research promises stays at
   * ~3 ms on every corpus, and the reason it is on the wire is that a claim
   * nobody can measure in the shipped code is not a claim.
   */
  ttfrMs?: number;
  /**
   * The size ceiling that was in force, echoed so the UI can state the policy
   * ("files over 10 MB were not searched"). ripgrep cannot tell us WHICH files
   * it skipped, so the honest surface is the rule, not a count.
   */
  maxFilesizeBytes?: number;
}

/** Lazily fetched context around one match (the expand gesture). */
export interface SearchContextInput {
  repoPath: string;
  relPath: string;
  /** 1-based line the match is on. */
  line: number;
  /** Lines wanted before / after it. */
  before: number;
  after: number;
  /** Clamp each returned line. Defaults to SEARCH_LIMITS.maxLineChars. */
  maxLineChars?: number;
}

export interface SearchContextResult {
  /** 1-based line numbers, in order, excluding the match line itself. */
  lines: { line: number; text: string }[];
}

/** What `search:start` resolves with once the child is spawned (or queued). */
export interface SearchStarted {
  /** The stream id — the caller's when it supplied one. */
  searchId: string;
}

/** New invoke channels appended by Phase 14's content search. */
export interface SearchInvokeChannelMap {
  /** Begin streaming; results arrive on searchResultsChannel(searchId). */
  'search:start': { req: [input: ContentSearchInput]; res: SearchStarted };
  /** SIGKILL the child and close the stream with cancelled:true. */
  'search:cancel': { req: [searchId: string]; res: void };
  /** Context lines around one hit, read on expand (never streamed). */
  'search:context': {
    req: [input: SearchContextInput];
    res: SearchContextResult;
  };
}

/**
 * Per-search result stream (main → the window that started it), following the
 * termDataChannel(sessionId) precedent above. Payload: one SearchProgress.
 */
export const searchResultsChannel = (searchId: string): string =>
  `search:results:${searchId}`;

/**
 * `search` surface on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxSearchExtras {
  search: {
    /** Subscribe BEFORE calling start(), with an id you minted. */
    onResults(searchId: string, cb: (p: SearchProgress) => void): Unsubscribe;
    start(input: ContentSearchInput): Promise<SearchStarted>;
    cancel(searchId: string): Promise<void>;
    context(input: SearchContextInput): Promise<SearchContextResult>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 14 — SYMBOLS (⌘⇧O, and `@` / `#` in the palette). Spec:
// docs/research/19-search.md §2.1/§5.3 and 19-d3 §2.5-2.8. New channels and
// types only; the payload shapes live in src/shared/symbols.ts.
//
// WHY THIS IS A SECOND SURFACE AND NOT PART OF search:*  — they are different
// machines with different failure modes, and conflating them would hide both:
//
//   Content search is STATELESS and instant: spawn ripgrep, stream, done in
//   ~3 ms to first result on any corpus. There is nothing to warm up.
//
//   Symbols are an INDEX. The first `#` query on a project starts a
//   tree-sitter build that takes 300-800 ms on the repos here and ~23 s on a
//   50k-file monorepo. That build outlives the invoke that started it, so the
//   contract has to carry `indexing / indexed / total / cold` on every reply
//   AND push progress on its own channel — the user is typing throughout, and
//   an empty list during a build is a lie the palette must never tell.
//
// LIFECYCLE, and where the "no daemon that burns battery" constraint is kept:
//   1. NEVER on project open. Building an index nobody asked for is exactly
//      the burn the guardrail forbids — so `symbols:query` alone never starts
//      one, and reports `cold: true` instead.
//   2. `symbols:ensure` is the ONLY starter. The palette calls it when the
//      user actually asks for symbols.
//   3. Persisted per (repoPath, relPath, mtimeMs, size), so relaunching a
//      project re-parses only the files that drifted.
//   4. Incremental from the repo watcher bus, 300 ms debounce — 1.25 ms/file.
//   5. Evicted from memory after 30 idle minutes; the SQLite copy survives.
//
// MAIN: src/main/symbols/{ipc,service,pool,worker,store,persist,queries}.ts.
// ---------------------------------------------------------------------------

import type {
  SymbolEnsureResult,
  SymbolIndexProgress,
  SymbolQueryInput,
  SymbolQueryResult
} from '../symbols';

/** Main → renderer: how far this project's symbol index has got. */
export const EVT_SYMBOLS_PROGRESS = 'symbols:progress' as const;

/** New event channel appended by Phase 14's symbol index. */
export interface SymbolsEventPayloadMap {
  'symbols:progress': [progress: SymbolIndexProgress];
}

/** New invoke channels appended by Phase 14's symbol index. */
export interface SymbolsInvokeChannelMap {
  /** Answer from whatever is indexed NOW. Never starts a build (see above). */
  'symbols:query': { req: [input: SymbolQueryInput]; res: SymbolQueryResult };
  /** Build (or resume building) this project's index in the background. */
  'symbols:ensure': { req: [repoPath: string]; res: SymbolEnsureResult };
  /** Drop the in-memory table for a project whose tab just closed. */
  'symbols:release': { req: [repoPath: string]; res: void };
}

/**
 * `symbols` surface on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxSymbolsExtras {
  symbols: {
    query(input: SymbolQueryInput): Promise<SymbolQueryResult>;
    ensure(repoPath: string): Promise<SymbolEnsureResult>;
    release(repoPath: string): Promise<void>;
    onProgress(cb: (progress: SymbolIndexProgress) => void): Unsubscribe;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 14's QUICK OPEN stream (⌘P) — new channels and types
// only. Nothing above was modified except the one `& QuickOpenInvokeChannelMap`
// in GmuxInvokeChannelMap, which is how every stream since Phase 10 has joined
// the single typed bridge.
//
// SHAPE OF THE FEATURE (research 19 §2.1, §3.2 — all measured):
//   main owns ONE resident worker_threads Worker per window. The worker spawns
//   its own `rg --files` and keeps the path list, a `fuzzysort` snapshot and
//   the VS Code fuzzy reranker entirely inside itself, so 50k-270k path
//   strings never cross a thread boundary and a keystroke costs the UI
//   nothing. Renderer → main → worker → back is p50 4-13 ms at 50,000 files,
//   which is why quickopen:query is a plain request/response with a sequence
//   number rather than a stream: there is nothing to stream.
//
// THE RENDERER OWNS THE SCOPE. gmux is multi-project, and main has no opinion
// about which projects are open — so every query carries its own roots and
// its own recents. Closing a project simply stops sending its path; the
// worker evicts an index nobody has queried for a while on its own.
// ---------------------------------------------------------------------------

/**
 * How old a Quick Open name list may be before it is read again. 5,000 ms.
 *
 * ONE NUMBER AND TWO APPLIERS, and no root is subject to both. The ranking
 * worker in main applies it to a root it enumerates itself. The renderer
 * applies it to a root on another machine, which the worker cannot enumerate,
 * so nothing there could apply it. Research 57 section 6.5 ruled for the same
 * 5,000 ms on both, and this is the definition both of them read.
 */
export const QUICK_OPEN_WARM_STALE_MS = 5_000;

/** One ranked path from quick open. */
export interface QuickOpenHit {
  /** Which project root it came from (a query may span several). */
  repoPath: string;
  /**
   * PHASE 99. The machine `repoPath` is on, absent for this Mac. A path alone
   * cannot say whose computer it is on, and the same path on two computers is
   * two different files.
   */
  machineId?: string;
  /** Path relative to `repoPath`, POSIX separators, as ripgrep printed it. */
  relPath: string;
  /**
   * Matched character indices as offsets into `relPath` — REQUIRED, because
   * a picker that cannot show WHY a row matched makes the user re-read every
   * row. Ascending, no duplicates. Empty for the recents list (nothing was
   * typed, so nothing matched).
   */
  positions: number[];
  /** Reranker score. Comparable across roots; not meaningful in isolation. */
  score: number;
  /** This path is in the renderer's recently-opened list. */
  recent: boolean;
}

/**
 * One recently opened file, as two fields.
 *
 * PHASE 121. The pair used to travel as `${root} ${relPath}` and the ranking
 * worker took it apart at the FIRST space. A folder whose path holds a space,
 * e.g. `/Users/gdc/My Projects/app`, split into a root nothing matched, so an
 * empty Cmd+P listed nothing at all for that project. Two fields cannot split
 * wrong, and no separator has to be reserved.
 */
export interface QuickOpenRecent {
  /**
   * The ROOT KEY, from `rootKeyOf` in src/shared/workspace-target.ts. A folder
   * on this Mac is its own absolute path. A folder on another machine is
   * `machine:<machineId>:<path>`.
   */
  root: string;
  /** The file's path relative to that root. */
  relPath: string;
}

export interface QuickOpenQueryInput {
  /**
   * Every root to search, most important first (the active project first).
   * Roots the worker has not indexed yet are indexed on arrival; the answer
   * comes back immediately either way with `ready: false`.
   *
   * PHASE 99. Each one is a ROOT KEY from `rootKeyOf` in
   * src/shared/workspace-target.ts, which is the bare absolute path for a
   * folder on this Mac and `machine:<machineId>:<path>` for a folder on another
   * machine. The worker never enumerates the second kind and waits for its
   * names to be handed to it by `quickopen:warm`.
   */
  roots: string[];
  /** What the user typed, already stripped of any `:line` suffix. */
  query: string;
  /** Latest-wins ordering — the renderer drops any answer older than its own. */
  seq: number;
  /** How many hits to render. 50 is the VS Code number and this build's. */
  limit: number;
  /**
   * Recently opened files, most recent first. Used ONLY as a tiebreaker between
   * equally scored paths and to answer the empty query, never as a score bonus,
   * which would float a bad match over a good one just because it was opened
   * once.
   *
   * PHASE 99 PUT THE MACHINE INSIDE THE ROOT. The pair used to name a bare
   * `repoPath`, so `/Users/gdc/gmux/README.md` on this Mac and the same path on
   * another machine were one entry and tie broke each other. The root is a root
   * key from `rootKeyOf` in src/shared/workspace-target.ts, which is the bare
   * path for this Mac.
   *
   * PHASE 121. Each one is a {@link QuickOpenRecent} tuple. A plain string is
   * the shape a build before Phase 121 sent, being `${root} ${relPath}`. It is
   * still accepted and read by splitting at the first space, which is what that
   * build meant by it, so an older renderer's message still ranks instead of
   * being dropped. Nothing this build composes is a string.
   */
  recents?: readonly (QuickOpenRecent | string)[];
}

export interface QuickOpenResult {
  /** Echo of the request's `seq`. */
  seq: number;
  hits: QuickOpenHit[];
  /** Candidates that matched before the render limit was applied. */
  total: number;
  /** Every queried root has a complete, authoritative path list. */
  ready: boolean;
  /** Paths currently indexed across the queried roots (honest progress). */
  indexed: number;
  /** An enumeration is in flight — `indexed` is still climbing. */
  refreshing: boolean;
  /** A root hit the 200,000-path cap; its list is incomplete by design. */
  capped: boolean;
  /**
   * Quick open cannot run at all — the vendored ripgrep is missing from this
   * build, or the ranking worker refused to start. Present ONLY for failures
   * the user should be told about, never for "still indexing": a palette that
   * says "indexing 0 files" forever is the worst of both answers.
   */
  error?: string;
}

/** New invoke channels appended by the quick-open stream. */
export interface QuickOpenInvokeChannelMap {
  /** Rank paths across one or more roots. Cheap enough to call per keystroke. */
  'quickopen:query': {
    req: [input: QuickOpenQueryInput];
    res: QuickOpenResult;
  };
  /**
   * Index a project now, before anything is typed. Called when a project
   * opens and again when the palette opens: fuzzysort's per-target cost is
   * lazy and lands on the FIRST `go()` (322-384 ms at 272k paths), so without
   * a prewarm the user pays for the whole index on their first keystroke.
   * Resolves as soon as the work is queued — never blocks the palette.
   */
  'quickopen:warm': { req: [input: QuickOpenWarmInput]; res: void };
}

/**
 * What one `quickopen:warm` carries.
 *
 * PHASE 99 turned one string into this object. The channel name did not change
 * and no channel was added, so the contract inventory gains no line from it.
 */
export interface QuickOpenWarmInput {
  /**
   * The ROOT KEY, from `rootKeyOf` in src/shared/workspace-target.ts. A folder
   * on this Mac is its own absolute path, so every caller before Phase 99 sent
   * this same string.
   */
  root: string;
  /**
   * PHASE 99. The whole name list for a root Tortie cannot enumerate itself.
   * Present only for a folder on another machine, where the names arrive
   * through `machines:listFiles` rather than through ripgrep. When it is
   * present the worker ADOPTS it and never spawns anything for that root.
   *
   * An EMPTY array is a real answer and not a missing one. It says Tortie holds
   * no names for that root, which is what a refusal from that machine means.
   */
  paths?: string[];
}

/**
 * Top-level extra on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxQuickOpenExtras {
  quickOpen: {
    query(input: QuickOpenQueryInput): Promise<QuickOpenResult>;
    warm(input: QuickOpenWarmInput): Promise<void>;
  };
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 14 — the FIND MENU's action ids.
//
// gmux's native menu is the discoverability surface for every chord (the
// pattern src/main/menu.ts already follows for ⌘⇧E and ⌃⇧G), so ⌘⇧F and ⌘⇧O
// need menu items, and menu items need ids to forward. They are a NEW union
// rather than edits to LayoutMenuActionId, exactly as ProjectMenuActionId was.
//
// The one existing line changed is the AnyMenuActionWithProjects alias below,
// which is what the renderer's dispatcher is typed against — the same kind of
// one-line fold GmuxInvokeChannelMap already documents for its intersections.
// ---------------------------------------------------------------------------

/** Find-menu actions added by Phase 14. */
export type FindMenuActionId = 'quick-open' | 'show-search' | 'go-to-symbol';
