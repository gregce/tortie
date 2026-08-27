/**
 * The arch contract: three reads and two pushes from Phase 63, and one more
 * read from Phase 64.
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
 * PHASE 64 ADDS TWO READS AND NEITHER OF THEM BREAKS THOSE THREE RULES.
 * `arch:composePayload` turns a selection into one block of plain text and
 * hands it back. It writes nothing, it starts nothing, and IT TAKES NO SESSION
 * ID, because `build/assert-import-boundaries.mjs` keeps `main/arch/` from
 * naming `main/manifest/`, so the composer cannot see a session and could not
 * use one. Which session may be handed a block is decided in the renderer, by
 * one exported guard, over data the renderer already holds. `arch:modules`
 * reads the import graph that is already persisted and answers with the
 * computed level 2 view. Neither composes a sixth git call.
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
import type {
  ArchModulesInput,
  ArchModulesResult
} from './arch-modules';
import type {
  ArchMapInput,
  ArchMapResult,
  ArchMapUpdatedEvent
} from './arch-map';
import type { Unsubscribe } from './base';

// Phase 160. The map shapes live in their own domain file, the arch-modules
// precedent, and ride out through this one so the facade carries them with the
// rest of the arch surface.
export * from './arch-map';

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

// ---------------------------------------------------------------------------
// The composed scope (Phase 64)
// ---------------------------------------------------------------------------

/**
 * What a person picked, by id and nothing else.
 *
 * A gap has no id of its own in the format, so it is named by the part it
 * belongs to and its position in that part's list, in the form
 * `component:<id>#gap:<index>`. `archGapId` in `src/shared/arch-ids.ts`
 * composes that string and `parseArchGapId` reads it, and the renderer's own
 * `gap:<id>:<index>` spelling is translated into it by `archViewGapIdToChannel`
 * in that same file, so no end of this channel writes the format out by hand
 * and the three cannot disagree about the shape.
 *
 * A verdict is named by the subject id the checkers stamped, exactly as it
 * arrived in `ArchLoadResult.verdicts`.
 *
 * Every list is sorted and de-duplicated by the composer before it is used, so
 * the same set of ids composes the same bytes whatever order they arrive in.
 */
export interface ArchComposePayloadInput extends ArchRepoInput {
  componentIds: string[];
  gapIds: string[];
  verdictIds: string[];
}

/**
 * One composed scope, and everything the caller needs in order to act on it.
 *
 * `text` is ONE block and it is delivered as ONE paste. The one paste per file
 * rule in `src/renderer/terminal/drop/insert.ts` governs REFERENCES, meaning
 * paths that become attachment chips, and this is a prose block that happens to
 * name paths and is meant to read as literal text.
 *
 * `brokenTarget` is the broken target gate. It is true when a selected part's
 * anchors resolve to zero tracked files at HEAD, which means the scope points
 * at something that is not there any more. The caller demands one extra
 * confirmation before delivery, and that is the one check typing a scope by
 * hand can never perform.
 *
 * `proseWithheld` is the second grade of the two grade rule, reported rather
 * than hidden. A part over the commits behind threshold contributes one line
 * to the block saying its prose predates N commits, and its row here so the
 * caller can say the same thing in its own words.
 */
export interface ArchComposePayloadResult {
  cwd: string;
  /** The block itself. One paste, never chunked. */
  text: string;
  /** Bytes of `text` in UTF-8, so no caller has to guess at a paste's size. */
  bytes: number;
  /** True when any selected part's anchors resolve to zero files at HEAD. */
  brokenTarget: boolean;
  /** The parts that resolve to nothing, sorted. */
  brokenTargetIds: string[];
  /** Anchors on selected parts that match no tracked file at HEAD. */
  deadAnchors: { componentId: string; anchor: string }[];
  /** Parts whose authored prose was withheld, with the count that withheld it. */
  proseWithheld: { componentId: string; commitsBehind: number }[];
  /** Selected ids that name nothing in this contract. */
  unknownIds: string[];
  /** True when any list in the block was cut at its bound. */
  truncated: boolean;
  /** How much the block carries. */
  counts: {
    parts: number;
    interiorPromises: number;
    crossingPromises: number;
    verdicts: number;
    broke: number;
    gaps: number;
  };
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
  /**
   * Turn a selection into one block of plain text (Phase 64). Pure over the
   * contract, the tracked file list and the stored verdicts, so the same
   * selection composes the same bytes on any machine. It writes nothing, it
   * starts nothing, and IT TAKES NO SESSION ID.
   */
  'arch:composePayload': {
    req: [input: ArchComposePayloadInput];
    res: ArchComposePayloadResult;
  };
  /**
   * What one part is made of, computed (Phase 64). Reads the arch database and
   * the one fixed `git ls-files -z` argv, judges nothing and writes nothing.
   * Its shapes and its three caps live in ./arch-modules.ts.
   */
  'arch:modules': { req: [input: ArchModulesInput]; res: ArchModulesResult };
  /**
   * The level 1 map of any repository, contract or none (Phase 160). Reads the
   * arch database and the one fixed `git ls-files -z` argv, parses nothing,
   * judges nothing and writes nothing. It NEVER waits for a scan: a repository
   * whose fact base is still being built answers with what exists plus
   * `building: true`, and the `arch:mapUpdated` push follows.
   */
  'arch:map': { req: [input: ArchMapInput]; res: ArchMapResult };
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
  /** Phase 160: the fact base behind one repository's map moved. */
  'arch:mapUpdated': [event: ArchMapUpdatedEvent];
}

/**
 * Extra on window.gmux: the arch view's five reads and its two subscriptions,
 * behind one object, feature detected together. A build without the reader has
 * no `arch` object at all, and the view says one sentence instead of breaking.
 */
export interface GmuxArchExtras {
  arch: {
    load(input: ArchRepoInput): Promise<ArchLoadResult>;
    check(input: ArchRepoInput): Promise<ArchCheckResult>;
    skeleton(input: ArchRepoInput): Promise<ArchSkeletonResult>;
    composePayload(input: ArchComposePayloadInput): Promise<ArchComposePayloadResult>;
    modules(input: ArchModulesInput): Promise<ArchModulesResult>;
    map(input: ArchMapInput): Promise<ArchMapResult>;
    onChecked(cb: (event: ArchCheckedEvent) => void): Unsubscribe;
    onProgress(cb: (progress: ArchProgressEvent) => void): Unsubscribe;
    onMapUpdated(cb: (event: ArchMapUpdatedEvent) => void): Unsubscribe;
  };
}

/**
 * View > Architecture, and View > Architecture Map (Phase 160). Both ride
 * EVT_MENU_ACTION like 'show-context' and 'show-overview', the same one
 * member shape, and older renderers ignore an id they do not know. The ids
 * stay `arch` because it is machinery; only what a person reads says
 * Architecture.
 *
 * `show-arch` opens the sidebar's cockpit view. `show-arch-map` opens the map
 * of the active project as a full size editor tab, or focuses the tab that is
 * already open, through the same door the cockpit's own control uses.
 */
export type ArchMenuActionId = 'show-arch' | 'show-arch-map';

/**
 * Session > Aim at a Promise… (Phase 64), the aiming verb's own menu action.
 *
 * It is a SECOND id rather than a second member on `ArchMenuActionId` because
 * the two rows are different kinds of thing. `show-arch` opens a view and
 * changes nothing. This one composes a block of text and puts it into the
 * prompt of the session the person is looking at, so it sits in the Session
 * menu beside Resume Conversation rather than in the View menu, and a reader
 * looking for "what can type into a session" finds it under its own name.
 *
 * Older renderers ignore an id they do not know, which is the same property
 * every other member of this union relies on.
 */
export type ArchAimMenuActionId = 'arch-aim';
