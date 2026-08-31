/**
 * The Architecture view's ONE state type and the shapes it is made of
 * (Phase 172 moved them here from store.ts, bytes unchanged).
 *
 * This module holds no store and no action: it is the vocabulary the three
 * action modules beside it share, so that `useArch` in ../store.ts stays the
 * one facade built over ONE `ArchViewState`. The five rules that govern the
 * store are at the head of ../store.ts, and every shape here answers to them.
 */

import type {
  ArchComponent,
  ArchCoverageCounts,
  ArchEdge,
  ArchFreshness,
  ArchProblem,
  ArchVerdict,
  ArchVerdictChanges
} from '@shared/arch';
// The channel ANSWER shapes, which are the ipc domain's own and not the
// repository's records.
import type { ArchCheckResult, ArchLoadResult, ArchPassScope } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import type {
  ArchAcceptDivergenceInput,
  ArchCameraState,
  ArchMapPartResult,
  ArchMapResult,
  ArchModuleFilesResult,
  ArchNodePosition,
  ArchPassStatusResult
} from '../bridge';

/**
 * `elsewhere` carries exactly one meaning, and it is the one Context's store
 * settled on: this build's preload cannot ask another computer anything, so
 * there is nothing to read and the view says so. Reading a contract on a
 * machine is not in this phase.
 */
export type ArchStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unavailable'
  | 'elsewhere';

/**
 * What the person has selected, as an ORDERED list of opaque strings.
 *
 * Each entry is the verdict's own `subjectId` vocabulary, being
 * `component:<id>`, `edge:<id>` and `gap:<componentId>:<n>`, so the prose
 * panel, the verdict table and the composed payload key on one thing rather
 * than on three that can disagree.
 *
 * PHASE 64 WIDENED IT FROM ONE STRING TO A LIST, and the reason is the verb
 * rather than the view. A scope a person hands to an agent is usually more
 * than one part: two components and the edge between them, or a component and
 * the gap they want closed. Composing that out of one selection at a time
 * would mean composing it out of three separate gestures.
 *
 * THE ORDER IS THE PERSON'S OWN and it is kept. The payload reads in the
 * order they picked, because the first thing they picked is the thing they
 * are thinking about, and a set sorted by id would bury it.
 *
 * IT IS PRESENTATION AND NOTHING ELSE. Nothing here writes to the sessions
 * slice and nothing here sets any session's status. Rule 2 at the head of
 * this file is unchanged by the widening.
 */
export type ArchSelection = readonly string[];

/** The empty selection, as ONE frozen array. See `NONE` below for why. */
export const NO_SELECTION: ArchSelection = Object.freeze([]);

/**
 * PHASE 160 — one repository's reading of the MAP model.
 *
 * The last good model stays through a reload, for the reason the contract's
 * own `lastValid` rows stay through a bad read: a picture that blinks blank on
 * every refresh is unusable in the exact minute agents are writing under it.
 * `error` beside a non-null `model` means the newest read failed and what is
 * on screen is the read before it.
 */
export interface ArchMapEntry {
  status: 'loading' | 'ready' | 'error';
  model: ArchMapResult | null;
  error: string | null;
}

/**
 * PHASE 161. Where a person is in one repository's map.
 *
 * THE LADDER, and it is the navigation: level 1 is the whole map, level 2 is
 * one part opened up into its modules, level 3 is one module opened up into
 * its files under Phase 64's caps. The labels travel with the ids so the
 * breadcrumb can name each level without waiting for any read to land.
 *
 * FROZEN IN THE PHASE SPEC: the map tab and the sidebar pane both read this
 * one record, which is what keeps the two surfaces agreeing about where the
 * person is. Never a second copy of this state anywhere.
 */
export type ArchDrill =
  | { level: 1 }
  | { level: 2; groupId: string; groupLabel: string }
  | {
      level: 3;
      groupId: string;
      groupLabel: string;
      moduleDir: string;
      moduleLabel: string;
    };

/** The whole map, the one drill state every repository starts at. */
export const DRILL_HOME: ArchDrill = Object.freeze({ level: 1 });

/**
 * One part's scoped reading, held like `ArchMapEntry` and for the same
 * reason: the last good picture stays through a failed re-read.
 */
export interface ArchPartMapEntry {
  status: 'loading' | 'ready' | 'error';
  model: ArchMapPartResult | null;
  error: string | null;
}

/** One module's level 3 answer, the Phase 64 result scoped to a folder. */
export interface ArchModuleViewEntry {
  status: 'loading' | 'ready' | 'error';
  result: ArchModuleFilesResult | null;
  error: string | null;
}

/**
 * The key one scoped entry lives under. NUL is the separator because it is
 * the one byte a path cannot contain, so two different pairs can never fold
 * into one key.
 */
export function partKey(repoPath: string, groupId: string): string {
  return `${repoPath}\u0000${groupId}`;
}

/** The level 3 twin of {@link partKey}. */
export function moduleKey(repoPath: string, moduleDir: string): string {
  return `${repoPath}\u0000${moduleDir}`;
}

/**
 * PHASE 162. One scope's canvas state as this window holds it: the kept
 * camera and the kept layout, read once from `arch.db` and written back at
 * rest.
 *
 * `camera: null` and `positions: null` both mean "nothing kept": the drawing
 * computes its fit and its layout fresh, which is exactly what a first run
 * and a lost database do. `status: 'error'` still answers with nulls rather
 * than blocking anything, because persistence here is a convenience and the
 * doctrine on `arch.db` is that losing it costs a re-layout and nothing
 * else.
 */
export interface ArchCanvasEntry {
  status: 'loading' | 'ready' | 'error';
  camera: ArchCameraState | null;
  positions: readonly ArchNodePosition[] | null;
}

/** The canvas twin of {@link partKey}: one repository, one drill scope. */
export function canvasKey(repoPath: string, scope: string): string {
  return `${repoPath}\u0000${scope}`;
}

/**
 * PHASE 158. One repository's pass surface as this window holds it: main's
 * status answer, plus the refusal token that stopped the last gesture
 * before any spawn, or null when the last gesture started or none was made.
 */
export interface ArchPassEntry {
  status: ArchPassStatusResult | null;
  refusal: string | null;
}

export interface ArchViewState {
  /** Which folder, on which computer, this reading belongs to. */
  target: WorkspaceTarget | null;
  status: ArchStatus;
  /** The whole `arch:load` answer, or null before one has landed. */
  load: ArchLoadResult | null;
  /** The last `arch:check` answer, which supersedes the loaded verdicts. */
  lastCheck: ArchCheckResult | null;
  /** A re-check in flight, and how far along main says it is. */
  checking: boolean;
  progress: { done: number; total: number } | null;
  /** A read that failed outright. One sentence, never a blank panel. */
  error: string | null;
  /** The selected subjects, in the order the person picked them. */
  selected: ArchSelection;
  /** Drafting in flight, so the control cannot be pressed twice. */
  drafting: boolean;
  /**
   * PHASE 158. The pass surfaces this window holds, keyed by repository
   * root. `status` is main's own answer, exactly as reported; `refusal` is
   * the token that stopped the LAST gesture before any spawn, kept beside
   * the status because a refused ask never becomes a run record and the
   * face still owes the person a sentence about it.
   */
  passes: Readonly<Record<string, ArchPassEntry>>;
  /** An enrich ask in flight, so the control cannot be pressed twice. */
  enriching: boolean;
  /**
   * PHASE 160 — the map models this window holds, keyed by repository root.
   *
   * Keyed by repository rather than living beside `load`, because a map tab
   * outlives the active project: a person can switch projects and the tab for
   * the first repository is still on screen and still has to draw. Nothing in
   * an entry writes to any session and nothing in it touches the contract.
   */
  maps: Readonly<Record<string, ArchMapEntry>>;
  /**
   * PHASE 161. Where each repository's map is drilled to. A repository with
   * no entry is at the whole map. The map tab and the sidebar pane both read
   * this one record; there is never a second copy of the drill anywhere.
   */
  drills: Readonly<Record<string, ArchDrill>>;
  /**
   * The scoped part models this window holds, keyed by {@link partKey}. Only
   * the parts the drill can still reach are kept, so the event fan-out never
   * re-reads a scope nobody is looking at.
   */
  partMaps: Readonly<Record<string, ArchPartMapEntry>>;
  /** The level 3 answers this window holds, keyed by {@link moduleKey}. */
  moduleViews: Readonly<Record<string, ArchModuleViewEntry>>;

  syncProject(target: WorkspaceTarget | null): void;
  /**
   * Make sure this project's contract is loaded, and answer when it is.
   *
   * `syncProject` is what the VIEW calls, and it fires the read without
   * waiting because a view has a loading state to draw. Phase 64's picker has
   * no view: it opens a native menu straight out of a session, so it has to be
   * able to wait for the rows it is about to draw. This is that wait, over the
   * same `refresh`, so there is still one read of a contract and not two.
   *
   * It starts no process and it opens no view.
   */
  ensureLoaded(target: WorkspaceTarget | null): Promise<void>;
  refresh(): Promise<void>;
  check(): Promise<void>;
  /** Replace the whole selection with one subject, or clear it with null. */
  select(id: string | null): void;
  /**
   * Add a subject to the selection, or take it out again.
   *
   * This is what a ⌘-click reaches. It appends rather than inserting in any
   * sorted position, so the list stays in the order the person built it.
   */
  toggleSelected(id: string): void;
  /**
   * Replace the whole selection with these subjects, in this order.
   *
   * The picker uses it so that what a person picked in the native menu and
   * what the view shows selected cannot disagree about what was aimed. It is
   * presentation and nothing else, like every other write in this file.
   */
  selectAll(ids: readonly string[]): void;
  /**
   * The subject the prose panel draws, being the LAST one picked.
   *
   * One panel and several selected subjects needs a rule, and the rule is
   * recency: the thing a person just clicked is the thing they are reading
   * about. The other selected rows keep their selected mark, so nothing about
   * the wider selection is hidden by the panel showing one of them.
   */
  focused(): string | null;
  /**
   * PHASE 160 — read one repository's map model from main, or read it again.
   *
   * Idempotent while a read is in flight, so the tab body, the cockpit and a
   * finished check can all ask without stacking calls. It starts no process:
   * `arch:map` composes over the fact base the checkers already build, and
   * the one scan behind it is main's own, shared with the checker path.
   */
  loadMap(repoPath: string): Promise<void>;
  /** The held entry for one repository, or null before the first read. */
  mapFor(repoPath: string): ArchMapEntry | null;

  // PHASE 161. The drill. Action names frozen in the phase spec because the
  // map tab and this store belong to different hands.
  /** Where this repository's map is drilled to. Never null. */
  drillFor(repoPath: string): ArchDrill;
  /** Open one part up: level 2, and the scoped read is fired. */
  drillInto(repoPath: string, groupId: string, groupLabel: string): void;
  /** Open one module of the drilled part up: level 3. */
  drillIntoModule(
    repoPath: string,
    moduleDir: string,
    moduleLabel: string
  ): void;
  /** One level up the ladder. */
  drillUp(repoPath: string): void;
  /** Back to the whole map. */
  drillHome(repoPath: string): void;
  /**
   * Read one part's scoped model, or read it again. Idempotent while a read
   * is in flight, in `loadMap`'s own shape: a burst folds to two reads.
   */
  loadPartMap(repoPath: string, groupId: string): Promise<void>;
  /** The held scoped entry, or null before the first read. */
  partMapFor(repoPath: string, groupId: string): ArchPartMapEntry | null;
  /** Read one module's level 3 answer through the same fold. */
  loadModuleView(repoPath: string, moduleDir: string): Promise<void>;
  /** The held level 3 entry, or null before the first read. */
  moduleViewFor(
    repoPath: string,
    moduleDir: string
  ): ArchModuleViewEntry | null;

  // PHASE 162. The canvas: the kept camera and the kept layout, per
  // repository and per drill scope. Reads and writes go to `arch.db` through
  // the bridge; every write is refused whole in main when a value is invalid,
  // and a missing bridge makes every call a quiet no-op because persistence
  // is a convenience, never a load-bearing wall.
  /**
   * The canvas states this window holds, keyed by {@link canvasKey}. An
   * absent entry means the scope was never read; the drawing then computes
   * fresh exactly as a first run does.
   */
  canvas: Readonly<Record<string, ArchCanvasEntry>>;
  /** Read one scope's kept camera and layout, once per window per scope. */
  loadCanvas(repoPath: string, scope: string): Promise<void>;
  /** The held canvas entry, or null before the first read. */
  canvasFor(repoPath: string, scope: string): ArchCanvasEntry | null;
  /**
   * Keep the scope's camera: memory now, the database at rest. The write is
   * debounced so inertia and a long gesture cost one write, not one per
   * frame, which is spec open question 5 answered as "write at rest".
   */
  keepCamera(repoPath: string, scope: string, camera: ArchCameraState): void;
  /**
   * Keep the scope's layout WHOLE: memory now, the database immediately,
   * because a layout only changes at the end of an explicit gesture and the
   * end of a gesture is already rest.
   */
  keepLayout(
    repoPath: string,
    scope: string,
    positions: readonly ArchNodePosition[]
  ): void;
  /**
   * Drop the scope's kept layout, stored and held: re-layout as an EXPLICIT
   * act. The next draw computes fresh from the facts.
   */
  relayout(repoPath: string, scope: string): Promise<void>;
  /**
   * THE ONE PATH IN (Phase 158). Ask main to write the deterministic
   * skeleton under `docs/arch/`, then, when the pass half exists in this
   * build, ask main to run the enriching pass over what landed. Main holds
   * the Settings choice and the confirm gate, so with no agent picked the
   * second ask comes back idle and the skeleton is the whole story, said
   * plainly. The write lands as an ordinary uncommitted change: Source
   * Control shows it through the watcher with no help from here.
   */
  draft(): Promise<void>;
  /**
   * Ask main to run the enriching pass once, over this repository, under
   * the agent the person confirmed in Settings. One ask in flight; a second
   * gesture while one is out does nothing. Main refuses on its own
   * authority when no agent is configured or confirmed.
   */
  enrich(scope?: ArchPassScope): Promise<void>;
  /**
   * THE RIBBON'S KEYPRESS (Phase 159). The same ask as `enrich`, scoped to
   * what drifted: main composes a prompt naming only the promises that
   * broke and the parts that fell behind, and the same gate, the same
   * validator and the same write answer it. No second channel and no
   * second spawn path: this is `arch:enrich` with `scope: 'drift'`.
   */
  repairDrift(): Promise<void>;
  /** Read one repository's pass surface, once, so the run face can draw. */
  loadPass(repoPath: string): Promise<void>;
  /** Read it again, whatever is held: the pass event's own re-read. */
  reloadPass(repoPath: string): Promise<void>;
  /** The held pass surface, or null before any answer. */
  passFor(repoPath: string): ArchPassEntry | null;
  /**
   * THE ACCEPT VERB (Phase 158, the operator's amendment). Ask main to
   * append one accepted divergence to `docs/arch/baseline.json`, with the
   * person's own reason. The decision and the reason are theirs, the typing
   * is not, and main validates every field and refuses whole rather than
   * writing half a row. On a kept write the contract is read back so the
   * strip's accepted list moves at once.
   */
  acceptDivergence(
    input: Omit<ArchAcceptDivergenceInput, 'cwd'>
  ): Promise<{ ok: boolean; reason: string | null }>;
  /**
   * Subscribe to main's two pushes for as long as the view is mounted.
   *
   * A finished re-check re-reads rather than patching verdicts in place,
   * because `arch:checked` carries counts and not the rows: main is the one
   * place the verdicts live and a second assembly of them here would be a
   * second answer to the same question. NOTHING IS ANNOUNCED. No toast, no
   * badge, no dot on a session tab. A verdict that changed while a person was
   * reading a file is a number that moved, not an interruption.
   */
  subscribeEvents(): () => void;
  applyProgress(cwd: string, done: number, total: number): void;

  // READONLY on purpose. Every one of these hands back a live reference into
  // the store, and `NONE` below is one frozen array shared by every empty
  // answer. A caller that could push into either would be writing to state
  // through a getter, which is the kind of thing that is found weeks later.
  /** The verdicts in force, being the last check's if there was one. */
  verdicts(): readonly ArchVerdict[];
  /** The contract's components, in the contract's own order. */
  components(): readonly ArchComponent[];
  /** The contract's edges, which are the promises. */
  edges(): readonly ArchEdge[];
  /** Every row that would not load, with its file, its field and its reason. */
  problems(): readonly ArchProblem[];
  /** The strip's counts, reported by coverage so a total cannot flatter. */
  counts(): ArchCoverageCounts | null;
  /** One freshness row per component. */
  freshness(): readonly ArchFreshness[];
  /**
   * PHASE 159. What the last check moved, as main persisted it beside the
   * verdicts: one burst per repository, replaced when a check moves
   * something and kept on screen when a check moves nothing. Null before
   * any check has moved anything. The renderer computes none of it.
   */
  changes(): ArchVerdictChanges | null;
  /**
   * PHASE 159. How many subjects main says drifted, being promises that
   * broke and parts that fell behind. Read from main's own answer on the
   * load or the check, never counted here, and it is used as a yes or no:
   * the number itself is never drawn.
   */
  driftCount(): number;
  /** A component's display name, or its id when it is not in the contract. */
  nameOf(componentId: string): string;
}

/**
 * The next drill state applied, with everything it can no longer reach let
 * go (Phase 161).
 *
 * PURE AND EXPORTED for the unit suite. Scoped entries are pruned to the ones
 * the new drill still points at, so the event fan-out never re-reads a scope
 * nobody can navigate back to without a fresh click, and the records cannot
 * grow without bound over a long session. Entries for OTHER repositories are
 * untouched: a background project's tab keeps its own drill and its own
 * scoped picture.
 */
export function drillPatch(
  s: Pick<ArchViewState, 'drills' | 'partMaps' | 'moduleViews'>,
  repoPath: string,
  next: ArchDrill
): Pick<ArchViewState, 'drills' | 'partMaps' | 'moduleViews'> {
  const drills = { ...s.drills };
  if (next.level === 1) delete drills[repoPath];
  else drills[repoPath] = next;

  const keepPart = next.level === 1 ? null : partKey(repoPath, next.groupId);
  const keepModule =
    next.level === 3 ? moduleKey(repoPath, next.moduleDir) : null;
  const prefix = `${repoPath}\u0000`;

  const partMaps: Record<string, ArchPartMapEntry> = {};
  for (const [key, entry] of Object.entries(s.partMaps)) {
    if (!key.startsWith(prefix) || key === keepPart) partMaps[key] = entry;
  }
  const moduleViews: Record<string, ArchModuleViewEntry> = {};
  for (const [key, entry] of Object.entries(s.moduleViews)) {
    if (!key.startsWith(prefix) || key === keepModule) {
      moduleViews[key] = entry;
    }
  }
  return { drills, partMaps, moduleViews };
}

/**
 * The one empty array every "nothing yet" answer returns.
 *
 * NOT COSMETIC. A selector that builds a fresh `[]` on every call returns a
 * different reference each time, and `useSyncExternalStore` compares snapshots
 * with `Object.is`. React then re-renders, calls the selector again, gets
 * another new array, and the component loops until React aborts it with "the
 * result of getSnapshot should be cached". Every empty answer in the document
 * actions hands back this one frozen array instead.
 */
export const NONE: readonly never[] = Object.freeze([]);

export function errorText(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) return err.message;
  return 'The contract could not be read.';
}
