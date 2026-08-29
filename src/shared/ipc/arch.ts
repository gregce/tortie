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
  ArchVerdict,
  ArchVerdictChanges
} from '../arch';
import type {
  ArchModuleFilesInput,
  ArchModuleFilesResult,
  ArchModulesInput,
  ArchModulesResult
} from './arch-modules';
import type {
  ArchCanvasStateInput,
  ArchCanvasStateResult,
  ArchCanvasWriteResult,
  ArchClearLayoutInput,
  ArchMapInput,
  ArchMapPartInput,
  ArchMapPartResult,
  ArchMapResult,
  ArchMapUpdatedEvent,
  ArchSetCameraInput,
  ArchSetLayoutInput
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
  /**
   * PHASE 159. How much drifted, counted in main from these same verdicts
   * and freshness rows, so the ribbon's repair control shows on a number
   * the renderer never derives a second time.
   */
  drift: ArchDriftFace;
  /**
   * PHASE 159. The last burst of changes a check produced, or null before
   * any check moved anything. Persisted beside the verdicts and read back
   * here; the renderer computes none of it.
   */
  changes: ArchVerdictChanges | null;
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
  /** PHASE 159. The drift these verdicts hold, counted in main. */
  drift: ArchDriftFace;
  /** PHASE 159. What this check moved, or the last burst when it moved nothing. */
  changes: ArchVerdictChanges | null;
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

// ---------------------------------------------------------------------------
// The one path in (Phase 158)
// ---------------------------------------------------------------------------

/**
 * What the seed wrote. The skeleton is written DIRECTLY under `docs/arch/`
 * per the operator's amendment, so the change lands as an ordinary
 * uncommitted edit in Source Control rather than as unsaved buffers.
 * `baseline.json` is never among the written paths: its first writer is
 * always the person's own accept.
 */
export interface ArchSeedResult {
  cwd: string;
  /** True when files were written. False when a contract already exists. */
  ok: boolean;
  /** Why nothing was written, or null. */
  reason: string | null;
  /** The repository relative paths that were written, sorted. */
  wrote: string[];
}

/** One recorded enrichment pass, as the run's face draws it. */
export interface ArchPassRunFace {
  verdict: 'kept' | 'refused' | 'failed';
  /** The refusal or failure name. Null on kept. */
  reason: string | null;
  /**
   * One sentence a person can act on, naming the field and the reason, when
   * the validator refused the answer or the run threw. Null on kept, and
   * null on a row an older build recorded before the sentence travelled.
   */
  detail: string | null;
  agentId: string;
  model: string;
  startedAt: number;
  wallMs: number;
  /** How many enriched parts painted a box on the map, on a kept write. */
  painted: number | null;
  /** How many boxes the map holds beside the painted count. */
  groupsTotal: number | null;
  /** How many parts the answer enriched. */
  components: number | null;
  /**
   * The model's explicit regroup suggestions, plain sentences. They land on
   * the run's face and are NEVER written to `docs/arch/`.
   */
  suggestions: string[];
  /**
   * PHASE 159. What the pass was asked to touch: the whole contract, or
   * only what drifted. Null on a row an older build recorded.
   */
  scope: ArchPassScope | null;
  /**
   * PHASE 159. What started it: the Fill in button, the ribbon's repair
   * control, or a check that found drift. Null on an older row.
   */
  trigger: ArchPassTrigger | null;
}

/**
 * What one enrichment gesture came back with. `started` false carries the
 * refusal that stopped it before any spawn: `no-choice`, `not-confirmed`,
 * `no-recipe`, `in-flight` or `suspended`.
 */
export interface ArchEnrichResult {
  cwd: string;
  started: boolean;
  refusal: string | null;
  run: ArchPassRunFace | null;
  /** The paths the seed wrote first, when the repository had no contract. */
  seeded: string[];
}

/** The pass surface as the view reads it: what is happening and what last ran. */
export interface ArchPassStatusResult {
  cwd: string;
  /** True while a pass runs for this repository. */
  running: boolean;
  /** One sentence when the pass is suspended, null otherwise. */
  suspended: string | null;
  /** True when a person has picked an agent and a model for the pass. */
  chosen: boolean;
  /** The newest recorded pass, or null before any ran. */
  lastRun: ArchPassRunFace | null;
}

/**
 * The accept button's own write (Phase 158, the operator's second amendment).
 * The decision and the reason are the person's; the JSON typing is not. The
 * offending paths and the edge id come from the verdict's own record, never
 * typed, and `because` is the person's reason from the row's input.
 */
export interface ArchAcceptDivergenceInput extends ArchRepoInput {
  edgeId?: string;
  fromPath: string;
  toPath: string;
  because: string;
}

export interface ArchAcceptDivergenceResult {
  cwd: string;
  ok: boolean;
  /** One sentence a person can act on when the append was refused. */
  reason: string | null;
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
  /**
   * One level 1 part opened up (Phase 161): its modules as a map of the same
   * kind, the crossing edges to the rest of the repository kept at the frame,
   * and the verdict strip's counts scoped to the part. Composed in MAIN over
   * the SAME fact base as `arch:map`, through the same envelope: it reads the
   * arch database and the one fixed `git ls-files -z` argv, parses nothing,
   * judges nothing, writes nothing, and NEVER waits for a scan.
   */
  'arch:mapPart': { req: [input: ArchMapPartInput]; res: ArchMapPartResult };
  /**
   * The level 2 answer scoped to one computed directory (Phase 161). Main
   * synthesizes a component whose one anchor is the directory and hands it to
   * the SAME pure core as `arch:modules`, so the three caps fire scoped with
   * zero new cap logic. Same refusals as `arch:modules`, same one git call.
   */
  'arch:moduleFiles': {
    req: [input: ArchModuleFilesInput];
    res: ArchModuleFilesResult;
  };
  /**
   * The canvas state for one scope of one repository (Phase 162): the kept
   * camera and the kept layout, both halves in one round trip. Reads only
   * Tortie's own arch database, spawns nothing and never waits on a scan.
   */
  'arch:canvasState': {
    req: [input: ArchCanvasStateInput];
    res: ArchCanvasStateResult;
  };
  /**
   * Keep the scope's camera (Phase 162). Written at rest, never per frame;
   * the debounce is the renderer's. It writes ONLY `arch.db`, the disposable
   * database whose loss costs a re-layout, and an invalid value refuses the
   * whole write with the field named rather than persisting half a camera.
   */
  'arch:setCamera': {
    req: [input: ArchSetCameraInput];
    res: ArchCanvasWriteResult;
  };
  /**
   * Replace the scope's kept layout whole, in one transaction (Phase 162).
   * Existing nodes keep stored positions across re-reads; a node new to the
   * facts has no row and is laid out around the kept ones.
   */
  'arch:setLayout': {
    req: [input: ArchSetLayoutInput];
    res: ArchCanvasWriteResult;
  };
  /**
   * Drop the scope's kept layout (Phase 162): re-layout as an EXPLICIT act,
   * never a side effect of a resize or a re-read.
   */
  'arch:clearLayout': {
    req: [input: ArchClearLayoutInput];
    res: ArchCanvasWriteResult;
  };
  /**
   * Write the deterministic skeleton under `docs/arch/` (Phase 158). The one
   * write goes through the single writer module, every path a compiled name,
   * and `baseline.json` is skipped so its first writer is always the person's
   * own accept. Writes nothing when a contract already exists.
   */
  'arch:seed': { req: [input: ArchRepoInput]; res: ArchSeedResult };
  /**
   * Run the enrichment pass once for one repository (Phase 158). Seeds the
   * skeleton first when no contract exists, then spawns the ONE confirmed
   * agent through the fold's one shot spawn, validates the answer whole, and
   * writes `docs/arch/` directly on a kept answer. Refused before any spawn
   * when no agent is chosen, the agent is not confirmed RIGHT NOW, no recipe
   * is measured, a pass is already in flight, or the pass is suspended.
   */
  'arch:enrich': { req: [input: ArchEnrichInput]; res: ArchEnrichResult };
  /** What the pass is doing and what last ran. A read; it starts nothing. */
  'arch:passStatus': { req: [input: ArchRepoInput]; res: ArchPassStatusResult };
  /**
   * Append one accepted divergence to `docs/arch/baseline.json` (Phase 158).
   * The ONLY code path that writes that file, invoked only by the accept
   * button on a failing row. Every field is validated whole; a bad field
   * refuses the append and the file is untouched.
   */
  'arch:acceptDivergence': {
    req: [input: ArchAcceptDivergenceInput];
    res: ArchAcceptDivergenceResult;
  };
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

/** Main to renderer: the enrichment pass started or finished (Phase 158). */
export const EVT_ARCH_PASS = 'arch:pass' as const;

/** One pass phase change: `started` carries no run, `finished` carries it. */
export interface ArchPassEvent {
  cwd: string;
  phase: 'started' | 'finished';
  run: ArchPassRunFace | null;
}

export interface ArchEventPayloadMap {
  'arch:checked': [event: ArchCheckedEvent];
  'arch:progress': [progress: ArchProgressEvent];
  /** Phase 160: the fact base behind one repository's map moved. */
  'arch:mapUpdated': [event: ArchMapUpdatedEvent];
  /** Phase 158: the enrichment pass started or finished. */
  'arch:pass': [event: ArchPassEvent];
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
    mapPart(input: ArchMapPartInput): Promise<ArchMapPartResult>;
    moduleFiles(input: ArchModuleFilesInput): Promise<ArchModuleFilesResult>;
    canvasState(input: ArchCanvasStateInput): Promise<ArchCanvasStateResult>;
    setCamera(input: ArchSetCameraInput): Promise<ArchCanvasWriteResult>;
    setLayout(input: ArchSetLayoutInput): Promise<ArchCanvasWriteResult>;
    clearLayout(input: ArchClearLayoutInput): Promise<ArchCanvasWriteResult>;
    seed(input: ArchRepoInput): Promise<ArchSeedResult>;
    enrich(input: ArchEnrichInput): Promise<ArchEnrichResult>;
    passStatus(input: ArchRepoInput): Promise<ArchPassStatusResult>;
    acceptDivergence(
      input: ArchAcceptDivergenceInput
    ): Promise<ArchAcceptDivergenceResult>;
    onChecked(cb: (event: ArchCheckedEvent) => void): Unsubscribe;
    onProgress(cb: (progress: ArchProgressEvent) => void): Unsubscribe;
    onMapUpdated(cb: (event: ArchMapUpdatedEvent) => void): Unsubscribe;
    onPass(cb: (event: ArchPassEvent) => void): Unsubscribe;
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

// ---------------------------------------------------------------------------
// The freshness loop (Phase 159)
// ---------------------------------------------------------------------------

/**
 * What one pass is asked to touch. `whole` is the Phase 158 pass over the
 * whole contract. `drift` names only the promises that broke and the parts
 * that fell behind, and the validator refuses an answer that edits anything
 * outside that scope.
 */
export type ArchPassScope = 'whole' | 'drift';

/**
 * What started one pass. `gesture` is the Fill in button, `ribbon` is the
 * repair control beside the freshness sentence, and `drift` is a finished
 * check that found something broken and no settle hold in the way. The
 * trigger is decided in MAIN from where the call came, never sent by the
 * renderer, so a page cannot claim to be a check.
 */
export type ArchPassTrigger = 'gesture' | 'ribbon' | 'drift';

/**
 * The enrichment ask (Phase 159). `scope` absent means `whole`, so the
 * shipped Fill in button sends exactly the bytes it sent before. There is no
 * second channel: the ribbon's keypress is this same `arch:enrich` with
 * `scope: 'drift'`, through the same gate, the same one shot spawn, the
 * same validator and the same writer.
 */
export interface ArchEnrichInput extends ArchRepoInput {
  scope?: ArchPassScope;
}

/**
 * How much drifted, as the load and the check answer it. One number, used
 * by the renderer as a yes or no for the repair control and never drawn as
 * a count on the face. Zero means nothing is broken and nothing fell behind.
 */
export interface ArchDriftFace {
  count: number;
}
