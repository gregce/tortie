/**
 * The arch contract (Phase 63): three reads and two pushes.
 *
 * `arch:load` answers with the `docs/arch/` a person wrote, the problems the
 * validator found in it, and whatever verdicts Tortie already holds for that
 * repository. `arch:check` runs the five checkers and answers with what they
 * concluded. `arch:skeleton` drafts a contract from the fact base and hands
 * the bytes back for unsaved editor buffers.
 *
 * THREE THINGS NONE OF THESE CHANNELS DOES, and they are the design rather
 * than a habit of the current implementation.
 *
 * It never writes `docs/arch/`. The skeleton channel returns drafts and main
 * writes no file, so recording a contract, and recording a new baseline, is
 * always a person editing a file. That is the ArchUnit `allowStoreUpdate=false`
 * pattern and it is what stops an agent silently accepting its own violation.
 *
 * It never starts a process of its own beyond the two binaries Tortie already
 * spawns on every repository change, being git and ripgrep, and it spawns
 * neither with any field of a contract file on the argv. Anchors and globs are
 * matched in process against one fixed argv `git ls-files -z`, evidence blob
 * ids go to `git cat-file --batch` on stdin after a hex 40 check, and freshness
 * parses one fixed argv `git log --name-only` stream. `npm run conformance:arch`
 * plants a hostile anchor and a hostile blob id and fails if either string
 * appears in any composed argv.
 *
 * It never sets a session's status, never opens the manifest and never touches
 * tmux. A verdict is a fact about files, not about a session, and
 * `build/assert-import-boundaries.mjs` holds the wall that keeps `main/arch/`
 * from naming `main/manifest/`, `main/restore/` or `main/context/`.
 *
 * MAIN: src/main/arch/ipc.ts, the one `arch:*` registrar.
 */

import type {
  ArchBaseline,
  ArchComponent,
  ArchContract,
  ArchCoverageCounts,
  ArchEdge,
  ArchFreshness,
  ArchProblem,
  ArchVerdict
} from '../arch';
import type { Unsubscribe } from './base';

// ---------------------------------------------------------------------------
// The reads
// ---------------------------------------------------------------------------

/** Every arch channel is asked about ONE repository, named by its absolute path. */
export interface ArchRepoInput {
  /** Absolute path of the project root. The repository, never a file inside it. */
  cwd: string;
}

/**
 * What one repository's `docs/arch/` says right now, plus what Tortie already
 * concluded about it.
 *
 * `present` is false when the repository has no `docs/arch/` at all, which is
 * the teaching empty state rather than an error. `contract` is null when the
 * directory exists but nothing in it loaded, and `problems` then says why, one
 * row per dropped row, each naming the file, the field and the reason.
 *
 * `lastValid` is true when the bytes on disk failed to load and the rows here
 * are the previous good read kept in memory. The view draws them under a banner
 * naming the failure, because a half written file must never blank the view.
 *
 * The verdicts are whatever the last completed check wrote, so this read is
 * answerable with no check running and no process started. `checkedAtCommit` is
 * null when nothing has been checked yet, and every verdict then carries
 * `firstCheck`, which renders as not yet checked and never as changed.
 */
export interface ArchLoadResult {
  cwd: string;
  present: boolean;
  contract: ArchContract | null;
  components: ArchComponent[];
  edges: ArchEdge[];
  baseline: ArchBaseline;
  problems: ArchProblem[];
  lastValid: boolean;
  verdicts: ArchVerdict[];
  freshness: ArchFreshness[];
  counts: ArchCoverageCounts;
  /** The commit the stored verdicts were computed at, or null before any check. */
  checkedAtCommit: string | null;
  /**
   * The commit a person's own agent last narrated this contract at, read from
   * the contract's own files. Tortie never calls a model, so this is a fact
   * about what somebody else did and never a thing Tortie can cause.
   */
  narratedAtCommit: string | null;
}

/**
 * What the five checkers concluded.
 *
 * `overBudget` is null on a run that finished inside its budget, and otherwise
 * one sentence naming what was left unchecked. Past budget the remaining claims
 * get `unverifiable` with that reason, never a silent pass.
 *
 * `generation` stamps the run. A verdict from an older generation is never
 * mixed with a newer one, which is what keeps a torn tree from publishing half
 * of two runs.
 */
export interface ArchCheckResult {
  cwd: string;
  verdicts: ArchVerdict[];
  freshness: ArchFreshness[];
  counts: ArchCoverageCounts;
  checkedAtCommit: string;
  generation: number;
  overBudget: string | null;
  durationMs: number;
}

/** One drafted file. It opens as an unsaved buffer, and main writes nothing. */
export interface ArchDraftFile {
  /** Repository relative, always under `docs/arch/`. */
  path: string;
  content: string;
}

/**
 * The deterministic draft.
 *
 * `files` is the same bytes for the same fact base every time, which is what
 * `npm run conformance:arch` compares. `note` is the one sentence the view puts
 * above the buffers, being what was drafted and what a person still owes it.
 */
export interface ArchSkeletonResult {
  cwd: string;
  files: ArchDraftFile[];
  note: string;
}

export interface ArchInvokeChannelMap {
  /**
   * Read `docs/arch/` and the stored verdicts. Reads files and the arch
   * database. It starts no check, so opening the view on a large repository
   * costs one directory read.
   */
  'arch:load': { req: [input: ArchRepoInput]; res: ArchLoadResult };
  /**
   * Run the five checkers now. Spawns git with fixed argv only, coalesces to
   * one run in flight per repository, and writes its verdicts under one
   * generation stamp in one transaction.
   */
  'arch:check': { req: [input: ArchRepoInput]; res: ArchCheckResult };
  /**
   * Draft a contract from the fact base. Pure over that fact base, and main
   * writes no file: the bytes come back for unsaved editor buffers.
   */
  'arch:skeleton': { req: [input: ArchRepoInput]; res: ArchSkeletonResult };
}

// ---------------------------------------------------------------------------
// The two pushes
// ---------------------------------------------------------------------------

/** Main → renderer: a watcher triggered re-check finished. */
export const EVT_ARCH_CHECKED = 'arch:checked' as const;

/** Main → renderer: how far a check has got. Throttled, the symbols precedent. */
export const EVT_ARCH_PROGRESS = 'arch:progress' as const;

/**
 * What one finished re-check changed.
 *
 * `broke` counts the promises that went from holding to divergent in THIS run,
 * and `unchecked` counts the claims that could not be judged. The SCM view
 * listens for this as well as the arch view, because the sidebar is not on
 * screen when a break lands.
 */
export interface ArchCheckedEvent {
  cwd: string;
  checkedAtCommit: string;
  generation: number;
  broke: number;
  unchecked: number;
}

/** How far a check has got, one message per repository per 120 ms. */
export interface ArchProgressEvent {
  cwd: string;
  done: number;
  total: number;
}

export interface ArchEventPayloadMap {
  'arch:checked': [event: ArchCheckedEvent];
  'arch:progress': [progress: ArchProgressEvent];
}

/**
 * Extra on window.gmux: the arch view's three reads and its two subscriptions,
 * behind one object, feature detected together. A build without the reader has
 * no `arch` object at all, and the view says one sentence instead of breaking.
 */
export interface GmuxArchExtras {
  arch: {
    load(input: ArchRepoInput): Promise<ArchLoadResult>;
    check(input: ArchRepoInput): Promise<ArchCheckResult>;
    skeleton(input: ArchRepoInput): Promise<ArchSkeletonResult>;
    onChecked(cb: (event: ArchCheckedEvent) => void): Unsubscribe;
    onProgress(cb: (progress: ArchProgressEvent) => void): Unsubscribe;
  };
}

/**
 * View > Architecture. Rides EVT_MENU_ACTION like 'show-context' and
 * 'show-overview', the same one member shape, and older renderers ignore an id
 * they do not know. The id stays `arch` because it is machinery; only what a
 * person reads says Architecture.
 */
export type ArchMenuActionId = 'show-arch';
